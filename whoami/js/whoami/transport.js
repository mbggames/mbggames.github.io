/*!
 * MBG Who Am I? - how a match is run, behind one interface for the game screen:
 *
 *   act(type, data)   ask · respond · guess · hint · giveup · say · flag · next · leave
 *   onView(fn)        fn(view, event) after every change - the view of MY player only
 *   me                my player id
 *
 *  Local  - against the computer, on this device (no internet needed with the built-in cards).
 *  Tabs   - two players on one computer: two tabs or windows of the same browser talk through a
 *           BroadcastChannel; the first tab is the referee. For trying a human match without a server.
 *  Online - (with the MBG Games server) the same messages over a WebSocket to the match room; the
 *           server is the referee and never sends a hidden answer to the player guessing it.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, E = MBG.WhoEngine, B = MBG.WhoBot, Dsc = MBG.WhoDiscovery, X = MBG.WhoText;

  function find(setup, offline) {
    // the puzzle of the day: its two cards, the same for everyone (daily.js)
    var day = setup.daily && MBG.WhoDaily ? MBG.WhoDaily.matchFor(setup) : null;
    if (day) return Promise.resolve(day);
    return Dsc.find({ lang: setup.lang, mode: setup.mode, cat: setup.cat, subs: setup.subs, level: setup.level, period: setup.period,
      region: setup.region, count: E.limits(setup, setup.opponent === 'online' && setup.ranked).rounds, recent: MBG.WhoStats.recent(), store: Shell.store, online: !offline && navigator.onLine !== false });
  }

  /** The chosen limits; fewer rounds if the search found fewer different answers (never a repeat). */
  function limitsFor(setup, found) {
    var c = E.limits(setup);
    c.rounds = Math.max(2, Math.min(c.rounds, found - found % 2));
    if (setup.daily) { c.rounds = 2; c.hints = false; }   // the puzzle of the day: the same for all, no hints
    return c;
  }

  /* --------------------------------------------------------- the referee --- */
  // Runs a MatchCore with an optional computer player. Used by Local and by the host tab.
  function Referee(core, setup, emit) {
    this.core = core; this.setup = setup; this.emit = emit;
    this.bot = null; this.botTimer = null;
    var self = this;
    this.timer = setInterval(function () { var r = core.tick(Date.now()); if (r && r.refresh) { self.refreshAnswer().then(function () { self.changed({ type: 'category', kept: true }); }); return; } if (r) self.changed(r.picked ? { type: 'category', kept: true } : r.chose ? { type: 'chosen', own: false } : r.timeout ? { type: 'timeout' } : { type: 'answered', code: 'INVALID' }); else self.changed(null, true); }, 500);
  }
  Referee.prototype.changed = function (ev, quiet) { this.emit(ev, quiet); this.drive(); };
  /** 1.1.9 - the computer's card of the round must fit the round's category (a built-in card at once). */
  Referee.prototype.refreshAnswer = function () {
    var c = this.core, cr = c.current();
    if (!cr) return Promise.resolve();
    var tp = c.topic(cr), ri = cr.index, used = c.answers.map(function (a) { return a && a.id; });
    return Dsc.find({ lang: c.lang, mode: tp.mode, cat: tp.cat, subs: tp.subs, level: c.level, count: 1, online: false, recent: used }).then(function (f) {
      var a = (f.answers || []).concat(f.pool || []).filter(function (x) { return x && used.indexOf(x.id) === -1; })[0] || (f.answers || [])[0];
      if (a) c.setAnswer(ri, a);
    }, function () { /* the card of before stays */ });
  };
  Referee.prototype.cpu = function () { for (var i = 0; i < this.core.players.length; i++) if (this.core.players[i].kind === 'bot') return this.core.players[i]; return null; };
  Referee.prototype.apply = function (pid, type, d) {
    var c = this.core, now = Date.now(), r, ev = null;
    switch (type) {
      case 'ask': r = c.ask(pid, d.text, now); ev = r.error ? { type: 'error', error: r.error } : { type: 'asked' }; break;
      case 'respond': r = c.respond(pid, d.turn, d.code, now); ev = r.error ? { type: 'error', error: r.error } : { type: 'answered', code: d.code }; break;
      case 'guess': r = c.guess(pid, d.text, now); ev = r.error ? { type: 'error', error: r.error } : { type: 'guessed', correct: r.correct, near: !!r.near, pattern: r.pattern || null, text: d.text, by: pid }; break;
      case 'hint': r = c.hint(pid, now, !!d.credits); ev = r.error ? { type: 'error', error: r.error } : { type: 'hint', clue: r.clue }; break;
      case 'giveup': c.giveUp(pid, now); ev = { type: 'gaveup' }; break;
      // 1.1.0: the Answerer's own card - checked like every card (Wikidata facts or a built-in card)
      case 'choose': {
        var self2 = this, cr = c.current();
        if (!cr || cr.status !== 'choosing' || cr.answerer !== pid) { ev = { type: 'error', error: 'over' }; break; }
        // {} = the computer's card · { mine: true } = the computer's card taken from its ideas (counts as her own)
        if (!d.qid && !d.deck) { r = c.chooseCard(pid, null, now, !!d.mine); ev = { type: 'chosen', own: !!d.mine }; break; }
        // 1.1.6: a card the Answerer's screen has read already (d.card) is used, checked - no second trip to Wikidata
        var md = c.topic(cr).mode;     // 1.1.9: the question word of this round
        var ready = d.qid && d.card ? MBG.WhoDiscovery.cleanCard(d.card, md) : null;
        (ready ? Promise.resolve(ready) : MBG.WhoDiscovery.lookup({ qid: d.qid, deck: d.deck, mode: md })).then(function (card) {
          var r2 = c.chooseCard(pid, card, Date.now());
          self2.changed(r2.error ? { type: 'error', error: r2.error } : { type: 'chosen', own: true });
        }, function (e) { self2.changed({ type: 'error', error: 'card', net: String(e && e.message) === 'net', to: pid }); });
        return;
      }
      // 1.1.9 - the round's category: one player chooses, the other is told; the computer's card of the round must
      // fit it (a built-in card at once)
      case 'category': {
        r = c.pickCategory(pid, d.keep ? null : { mode: d.mode, cat: d.cat, subs: d.subs, own: d.own }, now);
        if (r.error) { ev = { type: 'error', error: 'category', why: r.error, to: pid }; break; }
        ev = { type: 'category', by: pid, mode: r.mode, cat: r.cat, subs: r.subs, kept: !r.changed };
        // the views go out once the computer's card fits the category (a built-in card: at once)
        if (r.changed || r.refresh) { var self3 = this, ev3 = ev; this.refreshAnswer().then(function () { self3.changed(ev3); }); return; }
        break;
      }
      case 'say': r = c.say(pid, d.text, now); ev = { type: 'chat', msg: r.msg, by: pid }; break;
      case 'flag': r = c.flag(pid, d, now); ev = { type: 'flagged' }; break;
      case 'next': if (c.state === 'between') { this.next(); return; } break;
      case 'leave': { var nm = (c.player(pid) || c.watcher(pid) || {}).name; c.abandon(pid, now); ev = c.voided ? { type: 'cancelled', why: c.voided, by: pid, name: nm } : { type: 'left', by: pid, name: nm }; break; }
      case 'offerEnd': r = c.offerEnd(pid, now);
        ev = r.error ? { type: 'error', error: 'end', why: r.error, to: pid } : r.agreed ? { type: 'cancelled', why: 'agreed', by: c.voidBy } : { type: 'endOffer', by: pid }; break;
      case 'answerEnd': r = c.answerEnd(pid, !!d.yes, now);
        ev = r.error ? { type: 'error', error: 'end', why: r.error, to: pid } : r.agreed ? { type: 'cancelled', why: 'agreed', by: c.voidBy } : { type: 'endDeclined', by: pid, to: r.by }; break;
      case 'join': r = c.request({ id: pid, name: d.name, avatar: d.avatar, as: d.as }, now);
        ev = r.error ? { type: 'error', error: r.error, to: pid } : r.admitted ? { type: 'joined', as: r.as, name: d.name, by: pid } : { type: 'request', name: d.name, as: d.as, by: pid }; break;
      case 'decide': r = c.decide(pid, d.req, !!d.yes, now);
        ev = r.error ? { type: 'error', error: r.error } : r.admitted ? { type: 'joined', as: r.as, name: r.request.name, by: r.request.pid } : r.declined ? { type: 'declined', name: r.request.name, by: r.request.pid } : { type: 'decided' }; break;
      case 'react': r = c.react(pid, d.emoji, now); if (r.error) return; ev = { type: 'reaction', reaction: r.reaction }; break;
      case 'boost': r = c.boost(pid, d.kind, now); ev = r.error ? { type: 'error', error: r.error } : { type: 'boost', kind: r.kind, pattern: r.pattern }; break;
    }
    this.changed(ev);
  };
  /** The next round - first more hidden answers if a new player needs one (fetchMore, from the host). */
  Referee.prototype.next = function () {
    var c = this.core, self = this, r = c.startRound(Date.now());
    if (r && r.need && this.fetchMore) {
      this.changed({ type: 'waitAnswer' });
      this.fetchMore(c.answersNeeded()).then(function (list) { c.addAnswers(list); self.next(); }, function () { c.state = 'done'; self.changed({ type: 'done' }); });
      return;
    }
    this.changed({ type: 'round' });
  };
  /** The computer: answers my questions, asks its own, guesses. */
  Referee.prototype.drive = function () {
    var c = this.core, cpu = this.cpu(), self = this;
    if (!cpu || this.botTimer || c.state !== 'playing') return;
    var r = c.current(), lvl = this.setup.botLevel || 'intermediate';
    var p = c.pending(r);
    if (r.answerer === cpu.id && p) {
      this.botTimer = setTimeout(function () {
        self.botTimer = null;
        var a = B.answer(p.q, r.answer, c.lang);
        c.respond(cpu.id, p.id, a.code, Date.now(), { note: a.code === 'INVALID' ? a.reason : null });
        self.changed({ type: 'answered', code: a.code, reason: a.reason });
      }, Math.round(B.thinkTime(lvl) * 0.45));
    } else if (r.guesser === cpu.id && !p) {
      if (!this.bot || this.bot.round !== r.index) {
        this.bot = new B.Guesser({ pool: this.pool || [], lang: c.lang, level: lvl });
        this.bot.round = r.index;
        this.bot.lastTurn = null;
      }
      var g = this.bot;
      // learn from the last answer first
      var last = r.turns[r.turns.length - 1];
      if (last && last.code && g.lastTurn === last.id && g.lastPred) { g.hear(g.lastPred, last.code); g.lastPred = null; }
      this.botTimer = setTimeout(function () {
        self.botTimer = null;
        if (c.state !== 'playing' || c.current() !== r) return;
        var d = g.next(c.questionsLeft(r), c.remaining(Date.now(), r));
        if (d.type === 'ask') {
          var res = c.ask(cpu.id, d.text, Date.now());
          if (res.turn) { g.lastTurn = res.turn.id; g.lastPred = d.pred; }
          self.changed({ type: 'asked', by: cpu.id });
        } else {
          var text = d.text || X.labelIn(MBG.WhoDeck.CARDS[0], c.lang);
          var out = c.guess(cpu.id, text, Date.now());
          if (!out.correct && d.entity) g.wrong(d.entity);
          self.changed({ type: 'guessed', correct: out.correct, by: cpu.id, text: text });
        }
      }, B.thinkTime(lvl));
    }
  };
  Referee.prototype.stop = function () { clearInterval(this.timer); clearTimeout(this.botTimer); };

  /* ---------------------------------------------------------------- local --- */
  function Local(setup) {
    this.setup = setup; this.me = 'me'; this.fns = []; this.ref = null;
  }
  Local.prototype.onView = function (fn) { this.fns.push(fn); };
  /** offline = do not wait for Wikidata: the built-in cards at once ("Don't wait" on the loading screen). */
  Local.prototype.start = function (offline) {
    var self = this, s = this.setup, token = this.token = (this.token || 0) + 1;
    return find(s, offline).then(function (res) {
      if (token !== self.token) return new Promise(function () {});   // replaced by a newer start
      if (res.answers.length < 2) throw new Error('none');
      var lvlNames = MBG.WhoBotNames[s.botLevel || 'intermediate'];
      var core = new E.MatchCore({ lang: s.lang, mode: s.mode, cat: res.cat, subs: s.subs, level: s.level, vsComputer: true, source: res.source, config: limitsFor(s, res.answers.length),
        access: s.access === 'closed' ? 'closed' : 'open', daily: !!s.daily,
        players: [{ id: 'me', name: Shell.playerName(), avatar: MBG.Account.avatar() },
          { id: 'cpu', name: Shell.tIn(s.lang, 'cpu.name') + ' · ' + lvlNames[Math.max(0, Shell.LANGS.indexOf(s.lang))], kind: 'bot' }],
        answers: res.answers, now: Date.now() });
      core.startRound(Date.now());
      self.core = core;
      self.found = res;
      self.ref = new Referee(core, s, function (ev, quiet) {
        self.fns.forEach(function (f) { f(core.viewFor('me', Date.now()), ev, quiet); });
        if (self.show) self.show.views(ev, quiet);
      });
      self.ref.pool = res.pool;
      MBG.WhoStats.used(res.answers.map(function (a) { return a.id; }));
      // 1.1.3: 🌍 Public - others may watch (the puzzles of the day: never)
      if (core.access === 'open') self.show = new Show(self);
      self.ref.changed({ type: 'start' });
      return res;
    });
  };
  Local.prototype.act = function (type, d) { if (this.ref) this.ref.apply('me', type, d || {}); };
  Local.prototype.stop = function () { if (this.ref) this.ref.stop(); if (this.show) { this.show.stop(); this.show = null; } };

  /* ------------------------------------- watching a game against the computer (1.1.3) --- */
  // A public game against the computer runs on the player's device, as always. Show offers it to watchers:
  // with the MBG server through a show room (anyone, from "Watch or join"), else to the other tabs of this
  // browser (the same messages as Tabs). Watchers see the game like a match between people (the card too),
  // cheer with emojis and talk among themselves; nobody joins as a player.
  var WATCH_ACTS = { join: 1, react: 1, say: 1, leave: 1 };
  function Show(local) {
    this.local = local; this.members = []; this.code = null; this.ws = null; this.last = 0;
    var self = this, s = local.setup;
    this.code = 'c' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
    if (Online.supported()) this.connect();
    else if (Tabs.supported()) {
      // the other tabs of this browser: the Tabs messages (offer / join / act / view)
      this.ch = new BroadcastChannel(CH);
      this.ch.onmessage = function (e) { self.recv(e.data || {}); };
      this.offerTimer = setInterval(function () { self.offer(); }, 1500);
      this.offer();
    }
    this.syncTimer = setInterval(function () { self.views(null, true, true); }, 4000);
    this.s = s;
  }
  Show.prototype.core = function () { return this.local.core; };
  Show.prototype.meta = function () {
    var c = this.core();
    return { lang: c.lang, mode: c.mode, cat: c.cat, level: c.level, state: c.state, players: c.active().map(function (p) { return p.name; }),
      watchers: c.watchers.length, round: c.rounds.length, rounds: c.totalRounds(), cpu: true };
  };
  Show.prototype.offer = function () {
    var c = this.core();
    if (!this.ch || !c || c.state === 'done') return;
    var st = {}; for (var k in this.s) st[k] = this.s[k];
    st.opponent = 'computer';
    this.ch.postMessage({ t: 'offer', code: this.code, name: Shell.playerName(), setup: st, at: Date.now(), state: c.state, access: 'open', cpu: true,
      players: c.active().map(function (p) { return p.name; }), watchers: c.watchers.length });
  };
  /** A watcher's message (a tab, or the server): join to watch, an emoji, the watchers' chat, leaving. */
  Show.prototype.apply = function (pid, type, d) {
    if (!WATCH_ACTS[type] || !this.local.ref) return;
    var c = this.core();
    if (type !== 'join' && !c.watcher(pid)) return;
    if (type === 'join') d = { name: d.name, avatar: d.avatar, as: 'watch' };
    if (this.members.indexOf(pid) === -1 && type === 'join') this.members.push(pid);
    if (type === 'leave') this.members = this.members.filter(function (x) { return x !== pid; });
    this.local.ref.apply(pid, type, d || {});
  };
  Show.prototype.recv = function (m) {
    if (m.t === 'who') this.offer();
    if (m.code !== this.code) return;
    if (m.t === 'join') this.apply(m.gid, 'join', { name: m.name, avatar: m.avatar });
    if (m.t === 'act') this.apply(m.gid, m.type, m.data || {});
  };
  /** The watchers' views after a change (and every few seconds, for their clocks). */
  Show.prototype.views = function (ev, quiet, sync) {
    var c = this.core(), n = Date.now(), self = this;
    if (!c) return;
    if (quiet && !sync) return;
    var ids = c.watchers.map(function (w) { return w.id; });
    if (this.ch) ids.forEach(function (gid) { self.ch.postMessage({ t: 'view', code: self.code, to: gid, view: c.viewFor(gid, n), ev: ev && ev.to && ev.to !== gid ? null : ev, quiet: !!quiet }); });
    if (this.ws && this.ws.readyState === 1) {
      var vs = {};
      ids.forEach(function (id) { vs[id] = c.viewFor(id, n); });
      try {
        if (!quiet || n - this.last > 15000) { this.ws.send(JSON.stringify({ t: 'meta', meta: this.meta() })); this.last = n; }
        if (ids.length) this.ws.send(JSON.stringify({ t: 'views', views: vs, ev: ev && !ev.to ? ev : null }));
      } catch (e) { /* closed */ }
    }
    if (c.state === 'done') this.stop(true);
  };
  /** The show room on the server: it lists the game and passes the messages between the player and the watchers. */
  Show.prototype.connect = function () {
    var self = this;
    try { this.ws = new WebSocket(Online.prototype.url.call({}, '/api/p/live/show/' + this.code)); } catch (e) { this.ws = null; return; }
    this.ws.onopen = function () { try { self.ws.send(JSON.stringify({ t: 'meta', meta: self.meta() })); } catch (e) { /* closed */ } };
    this.ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.t === 'join') self.apply(m.id, 'join', { name: m.name, avatar: m.avatar });
      else if (m.t === 'act') self.apply(m.pid, m.type, m.data || {});
      else if (m.t === 'gone') self.apply(m.pid, 'leave', {});
    };
    this.ws.onclose = function () { self.ws = null; };
  };
  Show.prototype.stop = function (soon) {
    var self = this;
    clearInterval(this.offerTimer); clearInterval(this.syncTimer);
    // the last views went out with the end of the game: close a moment later
    setTimeout(function () {
      try { if (self.ws) { self.ws.send(JSON.stringify({ t: 'end' })); self.ws.close(1000); } } catch (e) { /* closed */ }
      try { if (self.ch) self.ch.close(); } catch (e2) { /* closed */ }
      self.ws = null; self.ch = null;
    }, soon ? 1500 : 0);
  };

  /* ----------------------------------------------------------------- tabs --- */
  // Players in other tabs or windows of this browser (BroadcastChannel). The host tab is the referee;
  // the second tab to join starts the match; more tabs can then ask to play or to watch, as the
  // host chose ("Others may join"). Every tab has its own id; the host sends each its own view.
  var CH = 'mbg-who-tabs';
  function Tabs(setup, role) {
    this.setup = setup; this.role = role; this.fns = []; this.code = null;
    this.me = role === 'host' ? 'h' : 'g' + Math.random().toString(36).slice(2, 8);
    this.ch = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CH) : null;
    this.offers = {}; this.members = [];
    var self = this;
    if (this.ch) this.ch.onmessage = function (e) { self.recv(e.data || {}); };
  }
  Tabs.supported = function () { return typeof BroadcastChannel === 'function'; };
  Tabs.prototype.onView = function (fn) { this.fns.push(fn); };
  Tabs.prototype.emitView = function (view, ev, quiet) { this.fns.forEach(function (f) { f(view, ev, quiet); }); };
  Tabs.prototype.post = function (m) { if (this.ch) this.ch.postMessage(m); };
  Tabs.prototype.offer = function () {
    var c = this.core;
    this.post({ t: 'offer', code: this.code, name: Shell.playerName(), setup: this.setup, at: Date.now(),
      state: c ? c.state : 'waiting', access: c ? c.access : 'open', players: c ? c.active().map(function (p) { return p.name; }) : [Shell.playerName()],
      watchers: c ? c.watchers.length : 0 });
  };
  /** Host: offers the match (also while it runs, if others may join). Resolves when the match starts. */
  Tabs.prototype.host = function (onWaiting) {
    var self = this;
    this.code = Math.random().toString(36).slice(2, 6).toUpperCase();
    return new Promise(function (resolve) {
      self.started = resolve;
      self.offerTimer = setInterval(function () { if (!self.core || (self.core.access !== 'closed' && self.core.state !== 'done')) self.offer(); }, 1500);
      self.offer();
      if (onWaiting) onWaiting(self.code);
    });
  };
  /** Guest: the open games of other tabs (offers older than 5 seconds are gone). */
  Tabs.prototype.listen = function (onOffers) {
    var self = this;
    this.onOffers = onOffers;
    this.post({ t: 'who' });
    this.listenTimer = setInterval(function () {
      var n = Date.now(), changed = false;
      Object.keys(self.offers).forEach(function (k) { if (n - self.offers[k].at > 5000) { delete self.offers[k]; changed = true; } });
      if (changed && self.onOffers) self.onOffers(self.offers);
    }, 1500);
  };
  /** Guest: join a game - as: 'play' (the second player starts the match; later ones ask) or 'watch'. */
  Tabs.prototype.join = function (code, as) {
    this.code = code; this.as = as || 'play';
    clearInterval(this.listenTimer);
    this.post({ t: 'join', code: code, gid: this.me, name: Shell.playerName(), avatar: MBG.Account ? MBG.Account.avatar() : '', as: this.as });
  };
  Tabs.prototype.sendViews = function (ev, quiet) {
    var c = this.core, self = this, n = Date.now();
    this.members.forEach(function (gid) {
      var e2 = ev && ev.to && ev.to !== gid ? null : ev;
      self.post({ t: 'view', code: self.code, to: gid, view: c.viewFor(gid, n), ev: e2, quiet: quiet });
    });
    this.emitView(c.viewFor('h', n), ev && ev.to && ev.to !== 'h' ? null : ev, quiet);
  };
  Tabs.prototype.startMatch = function (m) {
    var self = this, s = this.setup;
    this.starting = true;
    find(s).then(function (res) {
      var core = new E.MatchCore({ lang: s.lang, mode: s.mode, cat: res.cat, subs: s.subs, level: s.level, source: res.source, choose: true, config: limitsFor(s, res.answers.length),
        access: s.access || 'ask', players: [{ id: 'h', name: Shell.playerName(), avatar: MBG.Account ? MBG.Account.avatar() : '' }, { id: m.gid, name: m.name || 'Player 2', avatar: m.avatar || '' }],
        answers: res.answers, now: Date.now() });
      core.startRound(Date.now());
      self.core = core;
      self.found = res;
      if (self.members.indexOf(m.gid) === -1) self.members.push(m.gid);
      self.ref = new Referee(core, s, function (ev, quiet) { self.sendViews(ev, quiet); });
      // a player who joins later needs a hidden answer of their own
      self.ref.fetchMore = function (n) {
        return Dsc.find({ lang: s.lang, mode: s.mode, cat: core.cat, subs: s.subs, level: s.level, count: n + 2, recent: core.answers.map(function (a) { return a.id; }).concat(MBG.WhoStats.recent()),
          store: Shell.store, online: navigator.onLine !== false }).then(function (r2) {
          return r2.answers.concat(r2.pool || []).filter(function (a) { return core.answers.indexOf(a) === -1 && !core.answers.some(function (b) { return b.id === a.id; }); }).slice(0, n);
        });
      };
      self.ref.changed({ type: 'start' });
      (self.early || []).forEach(function (x) { self.recv(x); });
      self.early = null;
      if (self.started) self.started(res);
    });
  };
  Tabs.prototype.recv = function (m) {
    if (this.role === 'host') {
      if (m.t === 'who') this.offer();
      if (m.code !== this.code) return;
      if (m.t === 'join') {
        if (this.members.indexOf(m.gid) === -1 && this.core) this.members.push(m.gid);
        if (!this.core && !this.starting && m.as !== 'watch') { this.members.push(m.gid); clearInterval(this.offerTimer); this.startMatch(m); }
        else if (!this.core) { (this.early = this.early || []).push(m); }
        else this.ref.apply(m.gid, 'join', { name: m.name, avatar: m.avatar, as: m.as });
      }
      if (m.t === 'act' && this.ref) this.ref.apply(m.gid, m.type, m.data || {});
    } else {
      if (m.t === 'offer' && (!this.code || this.code === m.code) && !this.view) { this.offers[m.code] = m; if (this.onOffers) this.onOffers(this.offers); }
      if (m.t === 'view' && m.code === this.code && m.to === this.me) { this.view = m.view; this.emitView(m.view, m.ev, m.quiet); }
    }
  };
  Tabs.prototype.act = function (type, d) {
    if (this.role === 'host') { if (this.ref) this.ref.apply('h', type, d || {}); }
    else this.post({ t: 'act', code: this.code, gid: this.me, type: type, data: d || {} });
  };
  Tabs.prototype.inviteCode = function () { return this.code; };
  Tabs.prototype.stop = function () { if (this.ref) this.ref.stop(); clearInterval(this.offerTimer); clearInterval(this.listenTimer); };

  /* ---------------------------------------------------------- online --- */
  // Matches against people anywhere, through the MBG Games server (server/platform.js): the lobby pairs
  // the players, then the match room is the referee. The views come from the server; between them the
  // clock is counted down here so it runs smoothly.
  function Online(setup) { this.setup = setup; this.fns = []; this.view = null; this.ws = null; this.lobby = null; }
  Online.supported = function () { return typeof WebSocket === 'function' && !!(MBG.Net && !MBG.Net.demo); };
  /** 1.1.0 - without an MBG account the player is a guest online: unrated, nothing saved, no chat. */
  Online.guest = function () { return !!(MBG.Net && !MBG.Net.demo && !MBG.Net.signedIn()); };
  // 1.1.3: a guest is one per tab (kept while the tab is open, also after a reload): the tabs of one browser
  // share the storage, and two tabs must be two players - else the lobby never pairs them (not with yourself).
  function guestId() {
    var ss = null, id = null;
    try { ss = root.sessionStorage; id = ss.getItem('MBG.Who.guestTab'); } catch (e) { ss = null; }
    if (!id || !/^[a-z0-9]{12,32}$/.test(id)) {
      id = ''; while (id.length < 16) id += Math.random().toString(36).slice(2);
      id = id.slice(0, 16);
      try { if (ss) ss.setItem('MBG.Who.guestTab', id); } catch (e) { /* private mode */ }
    }
    return id;
  }
  Online.prototype.onView = function (fn) { this.fns.push(fn); };
  Online.prototype.emitView = function (v, ev, quiet) { this.fns.forEach(function (f) { f(v, ev, quiet); }); };
  Online.prototype.url = function (path) {
    var a = Shell.readJson('MBG.Platform.account', null);
    var u = Shell.getUser();
    return MBG.Net.base.replace(/^http/, 'ws').replace(/\/$/, '') + path + (a && a.session ? '?session=' + encodeURIComponent(a.session)
      : '?guest=' + guestId() + '&name=' + encodeURIComponent(u.mode === 'local' && u.name ? u.name : ''));
  };
  /** Finds an opponent: onStatus('waiting' | 'proposal', info); resolves when the match starts. */
  Online.prototype.find = function (onStatus) {
    var self = this, s = this.setup, tries = 0;
    return new Promise(function (resolve, reject) {
      // 1.1.5: the search keeps itself alive - a ping every 20 seconds (the server drops silent phones), and
      // when the connection breaks (the network changed, the server restarted) it connects and searches again.
      function connect() {
        var ws = self.lobby = new WebSocket(self.url('/api/p/live/lobby')), heard = Date.now(), pongs = false;
        clearInterval(self.beat);
        self.beat = setInterval(function () {
          if (self.lobby !== ws) return;
          if (ws.readyState === 1) { try { ws.send(JSON.stringify({ t: 'ping' })); } catch (e) { /* closing */ } }
          // (only a server that answers pings is expected to keep answering - an older one never does)
          if (pongs && Date.now() - heard > 50000) { try { ws.close(4000, 'silent'); } catch (e2) { /* closed */ } }
        }, 20000);
        ws.onopen = function () {
          ws.send(JSON.stringify({ t: 'find', v: Shell.VERSION, lang: s.lang, mode: s.mode, cat: s.cat || null, subs: s.subs || [], level: s.level, ranked: !!s.ranked && !Online.guest(), guests: !!s.guests, margin: s.margin || 150, limits: E.limits(s, !!s.ranked && !Online.guest()), access: s.access === 'closed' ? 'closed' : 'open', friend: s.friend || null, rematch: s.rematch || null }));
          onStatus(tries ? 'again' : 'waiting');
        };
        ws.onmessage = function (e) {
          var m; try { m = JSON.parse(e.data); } catch (x) { return; }
          heard = Date.now(); tries = 0;
          if (m.t === 'pong') pongs = true;
          // onStatus returns false to decide later (while a practice game runs): then acceptProposal()
          if (m.t === 'proposal') { self.proposal = m; if (onStatus('proposal', m) !== false) self.acceptProposal(); }
          if (m.t === 'expired' || m.t === 'declined') { self.proposal = null; onStatus(m.t, m); }
          if (m.t === 'accepted') onStatus('accepted', m);
          if ((m.t === 'lobby' || m.t === 'pong') && m.online != null) onStatus('online', m);   // how many people are online now
          if (m.t === 'friend' && self.onFriend) self.onFriend(m.state);   // 1.1.3: asked · busy · away · declined · notFriends
          if (m.t === 'rooms' && self.onRooms) self.onRooms(m.rooms || []);
          if (m.t === 'matched') { clearInterval(self.beat); self.lobby = null; ws.onclose = null; ws.close(1000); self.joinRoom(m.room, resolve); }
        };
        ws.onerror = function () { /* onclose follows */ };
        ws.onclose = function (e) {
          if (self.lobby !== ws || self.room) return;          // cancelled, or already in the match
          if (e.code === 1000) return;
          if (self.proposal) { self.proposal = null; onStatus('expired', { with: '' }); }
          if (++tries > 8) { clearInterval(self.beat); reject(new Error('lobby')); return; }
          onStatus('reconnect');
          setTimeout(function () { if (self.lobby === ws) connect(); }, Math.min(8000, 1000 * tries));
        };
      }
      connect();
    });
  };
  Online.prototype.acceptProposal = function () { if (this.lobby && this.lobby.readyState === 1) this.lobby.send(JSON.stringify({ t: 'accept' })); };
  /** "Not this one" - before the match starts nothing is lost; the search goes on. */
  Online.prototype.declineProposal = function () { this.proposal = null; if (this.lobby && this.lobby.readyState === 1) this.lobby.send(JSON.stringify({ t: 'decline' })); };
  Online.prototype.cancelFind = function () { var w = this.lobby; this.lobby = null; clearInterval(this.beat); try { if (w) { w.send(JSON.stringify({ t: 'cancel' })); w.close(1000); } } catch (e) { /* closed */ } };
  /** The running games others may join or watch (in the playing language). */
  Online.prototype.rooms = function (cb) {
    var self = this;
    this.onRooms = cb;
    var ask = function (ws) { ws.send(JSON.stringify({ t: 'rooms', lang: self.setup.lang })); };
    if (this.lobby && this.lobby.readyState === 1) { ask(this.lobby); return; }
    var ws = this.peek = new WebSocket(this.url('/api/p/live/lobby'));
    ws.onopen = function () { ask(ws); };
    ws.onmessage = function (e) { try { var m = JSON.parse(e.data); if (m.t === 'rooms' && self.onRooms) self.onRooms(m.rooms || []); } catch (x) { /* ignore */ } };
  };
  /**
   * A match room: as = 'play' or 'watch' to ask to join a running game (null: my own match).
   * 1.1.6 - the connection looks after itself. A "ping" every 8 seconds tells the room this phone is there
   * (and tells the phone the room is there); when the connection breaks or goes silent - the phone slept, the
   * network changed, a tunnel - it connects again and gets the match as it is now: nothing is missed, nothing
   * gets stuck. Until then the game screen says so (onLink: 'down' | 'up' | 'gone'), and what the player did
   * meanwhile is sent when the connection is back.
   */
  var PING_EVERY = 8000, SILENT = 17000;
  Online.prototype.joinRoom = function (id, resolve, as) {
    var self = this;
    this.room = id; this.queue = []; this.fails = 0; this.down = 0; this.closed = false; this.pongs = false; this.heard = Date.now();
    var first = true, asked = false;
    function link(st) { if (self.onLink) { try { self.onLink(st, self.down ? Date.now() - self.down : 0); } catch (e) { /* the screen */ } } }
    function over() { return self.closed || self.ended || !!(self.view && self.view.state === 'done'); }
    function lost(ws) {
      if (self.ws !== ws) return;
      ws.onclose = ws.onmessage = ws.onopen = null;
      try { ws.close(4000, 'silent'); } catch (e) { /* closed */ }
      self.ws = null;
      if (over()) return;
      if (!self.down) self.down = Date.now();
      self.fails++;
      // never got into the room at all (the match is gone, or it never started): say so after a few tries
      if (!self.view && self.fails > 6) { link('gone'); return; }
      link('down');
      clearTimeout(self.retry);
      self.retry = setTimeout(connect, Math.min(4000, 300 * self.fails * self.fails));
    }
    function connect() {
      clearTimeout(self.retry); self.retry = null;
      if (over() || (self.ws && self.ws.readyState <= 1)) return;
      var ws;
      try { ws = self.ws = new WebSocket(self.url('/api/p/live/room/' + id)); } catch (e) { self.ws = null; self.fails++; self.retry = setTimeout(connect, 2000); return; }
      self.heard = Date.now();
      ws.onopen = function () {
        if (self.ws !== ws) return;
        self.heard = Date.now();
        try {
          ws.send('ping');
          if (as && !asked) { asked = true; ws.send(JSON.stringify({ t: 'act', type: 'join', data: { as: as, name: Shell.playerName(), avatar: MBG.Account ? MBG.Account.avatar() : '' } })); }
          // what the player did while the connection was away (not older than 20 seconds)
          var q = self.queue; self.queue = [];
          q.forEach(function (x) { if (Date.now() - x.at < 20000) ws.send(JSON.stringify({ t: 'act', type: x.type, data: x.data })); });
        } catch (e) { /* onclose follows */ }
      };
      ws.onmessage = function (e) {
        if (self.ws !== ws) return;
        self.heard = Date.now();
        if (e.data === 'pong') { self.pongs = true; return; }
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        // 1.1.3: a watched game against the computer ended (or the player closed it)
        if (m.t === 'ended') { self.ended = true; Shell.toast(Shell.t('watch.ended'), 4000); return; }
        if (m.t !== 'view') return;
        self.fails = 0;
        var was = self.down; self.down = 0;
        self.view = m.view; self.at = Date.now();
        if (was) link('up');
        self.emitView(m.view, m.ev || null, !m.ev);
        if (first) { first = false; if (resolve) resolve({ source: m.view.source }); }
      };
      ws.onerror = function () { /* onclose follows */ };
      ws.onclose = function () { lost(ws); };
    }
    /** Is the room still there? Asked when the phone wakes up or the network comes back: an answer within 4 seconds, or a new connection. */
    this.check = function () {
      if (over()) return;
      var ws = self.ws;
      if (!ws) { connect(); return; }
      if (ws.readyState > 1) { lost(ws); return; }
      if (ws.readyState !== 1) return;
      var before = self.heard;
      try { ws.send('ping'); } catch (e) { lost(ws); return; }
      if (self.pongs) setTimeout(function () { if (self.ws === ws && self.heard === before) lost(ws); }, 4000);
    };
    this.pulse = setInterval(function () {
      if (over()) return;
      var ws = self.ws;
      if (!ws) { if (!self.retry) connect(); return; }
      if (ws.readyState === 1) {
        try { ws.send('ping'); } catch (e) { lost(ws); return; }
        // the room answers every ping (an older server never does): silent for 17 seconds (two pings unanswered) = the connection is dead
        if (self.pongs && Date.now() - self.heard > SILENT) lost(ws);
      } else if (ws.readyState > 1 || Date.now() - self.heard > 10000) lost(ws);        // closed without a word, or hangs while connecting
      if (self.down) link('down');
    }, PING_EVERY);
    this.wake = function () { if (typeof document === 'undefined' || !document.hidden) self.check(); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.wake);
    root.addEventListener('online', this.wake);
    root.addEventListener('pageshow', this.wake);
    connect();
    this.timer = setInterval(function () {
      var v = self.view, r = v && v.round;
      if (r && (r.status === 'choosing' || r.status === 'category')) {
        var cc = JSON.parse(JSON.stringify(v));
        cc.round.catLeft = Math.max(0, Math.ceil((r.catLeft || 0) - (Date.now() - self.at) / 1000));     // 1.1.9
        cc.round.chooseLeft = Math.max(0, Math.ceil(r.chooseLeft - (Date.now() - self.at) / 1000));
        cc.round.ideaIn = Math.max(0, Math.ceil((r.ideaIn || 0) - (Date.now() - self.at) / 1000));
        cc.rounds[cc.rounds.length - 1] = cc.round;
        self.emitView(cc, null, true);
        return;
      }
      if (!r || r.status !== 'playing' || r.pending) return;
      var c = JSON.parse(JSON.stringify(v));
      c.round.remaining = Math.max(0, r.remaining - Math.max(0, (Date.now() - self.at) / 1000 - (r.lead || 0)));   // the clock waits for the "get ready" lead
      c.rounds[c.rounds.length - 1] = c.round;
      self.emitView(c, null, true);
    }, 500);
  };
  /** Is the connection to the match there right now? (false while it is being made again) */
  Online.prototype.linked = function () { return !!(this.ws && this.ws.readyState === 1 && !this.down); };
  /** How long the players in view.away have been away, in seconds, counted on since the view came (1.1.6). */
  Online.prototype.awaySecs = function (pid) {
    var a = this.view && this.view.away;
    return a && a[pid] != null ? a[pid] + Math.max(0, Math.round((Date.now() - this.at) / 1000)) : null;
  };
  Online.prototype.act = function (type, d) {
    if (this.ws && this.ws.readyState === 1) { try { this.ws.send(JSON.stringify({ t: 'act', type: type, data: d || {} })); return; } catch (e) { /* kept below */ } }
    // not connected just now: kept for the moment the connection is back - but never "leave" (a player who
    // goes while the connection is down has not given up; the room sees them away, and nothing counts)
    if (!this.room || type === 'leave' || type === 'react') return;
    this.queue = (this.queue || []).filter(function (x) { return x.type !== type; });
    this.queue.push({ type: type, data: d || {}, at: Date.now() });
    if (this.check) this.check();
  };
  Online.prototype.inviteCode = function () { return this.room; };
  /** pageGone (1.1.8): the game screen is closed - the room is told so (4001), it is not a lost connection. */
  Online.prototype.stop = function (pageGone) {
    var running = !!(this.view && this.view.state !== 'done' && !this.ended);
    this.closed = true;
    clearInterval(this.timer); clearInterval(this.beat); clearInterval(this.pulse); clearTimeout(this.retry);
    if (this.wake) { try { document.removeEventListener('visibilitychange', this.wake); root.removeEventListener('online', this.wake); root.removeEventListener('pageshow', this.wake); } catch (e) { /* no document */ } }
    var lb = this.lobby; this.lobby = null;
    try { if (lb) lb.close(1000); if (this.ws) { this.ws.onclose = null; this.ws.close(pageGone === true && running ? 4001 : 1000, pageGone === true && running ? 'screen' : 'bye'); } if (this.peek) this.peek.close(1000); } catch (e) { /* closed */ }
  };

  MBG.WhoTransport = { Local: Local, Tabs: Tabs, Online: Online, Referee: Referee, Show: Show };
})(typeof self !== 'undefined' ? self : globalThis);
