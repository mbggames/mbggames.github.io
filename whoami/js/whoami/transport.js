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
    this.timer = setInterval(function () { var r = core.tick(Date.now()); if (r) self.changed(r.timeout ? { type: 'timeout' } : { type: 'answered', code: 'INVALID' }); else self.changed(null, true); }, 500);
  }
  Referee.prototype.changed = function (ev, quiet) { this.emit(ev, quiet); this.drive(); };
  Referee.prototype.cpu = function () { for (var i = 0; i < this.core.players.length; i++) if (this.core.players[i].kind === 'bot') return this.core.players[i]; return null; };
  Referee.prototype.apply = function (pid, type, d) {
    var c = this.core, now = Date.now(), r, ev = null;
    switch (type) {
      case 'ask': r = c.ask(pid, d.text, now); ev = r.error ? { type: 'error', error: r.error } : { type: 'asked' }; break;
      case 'respond': r = c.respond(pid, d.turn, d.code, now); ev = r.error ? { type: 'error', error: r.error } : { type: 'answered', code: d.code }; break;
      case 'guess': r = c.guess(pid, d.text, now); ev = r.error ? { type: 'error', error: r.error } : { type: 'guessed', correct: r.correct, near: !!r.near, pattern: r.pattern || null, text: d.text, by: pid }; break;
      case 'hint': r = c.hint(pid, now, !!d.credits); ev = r.error ? { type: 'error', error: r.error } : { type: 'hint', clue: r.clue }; break;
      case 'giveup': c.giveUp(pid, now); ev = { type: 'gaveup' }; break;
      case 'say': r = c.say(pid, d.text, now); ev = { type: 'chat', msg: r.msg, by: pid }; break;
      case 'flag': r = c.flag(pid, d, now); ev = { type: 'flagged' }; break;
      case 'next': if (c.state === 'between') { this.next(); return; } break;
      case 'leave': c.abandon(pid, now); ev = { type: 'left', by: pid, name: (c.player(pid) || c.watcher(pid) || {}).name }; break;
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
        players: [{ id: 'me', name: Shell.playerName(), avatar: MBG.Account.avatar() },
          { id: 'cpu', name: Shell.tIn(s.lang, 'cpu.name') + ' · ' + lvlNames[Math.max(0, Shell.LANGS.indexOf(s.lang))], kind: 'bot' }],
        answers: res.answers, now: Date.now() });
      core.startRound(Date.now());
      self.core = core;
      self.found = res;
      self.ref = new Referee(core, s, function (ev, quiet) { self.fns.forEach(function (f) { f(core.viewFor('me', Date.now()), ev, quiet); }); });
      self.ref.pool = res.pool;
      MBG.WhoStats.used(res.answers.map(function (a) { return a.id; }));
      self.ref.changed({ type: 'start' });
      return res;
    });
  };
  Local.prototype.act = function (type, d) { if (this.ref) this.ref.apply('me', type, d || {}); };
  Local.prototype.stop = function () { if (this.ref) this.ref.stop(); };

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
      var core = new E.MatchCore({ lang: s.lang, mode: s.mode, cat: res.cat, subs: s.subs, level: s.level, source: res.source, config: limitsFor(s, res.answers.length),
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
  Online.supported = function () { return typeof WebSocket === 'function' && !!(MBG.Net && !MBG.Net.demo && MBG.Net.signedIn()); };
  Online.prototype.onView = function (fn) { this.fns.push(fn); };
  Online.prototype.emitView = function (v, ev, quiet) { this.fns.forEach(function (f) { f(v, ev, quiet); }); };
  Online.prototype.url = function (path) {
    var a = Shell.readJson('MBG.Platform.account', null);
    return MBG.Net.base.replace(/^http/, 'ws').replace(/\/$/, '') + path + '?session=' + encodeURIComponent(a && a.session || '');
  };
  /** Finds an opponent: onStatus('waiting' | 'proposal', info); resolves when the match starts. */
  Online.prototype.find = function (onStatus) {
    var self = this, s = this.setup;
    return new Promise(function (resolve, reject) {
      var ws = self.lobby = new WebSocket(self.url('/api/p/live/lobby'));
      ws.onopen = function () {
        ws.send(JSON.stringify({ t: 'find', lang: s.lang, mode: s.mode, cat: s.cat || null, subs: s.subs || [], level: s.level, ranked: !!s.ranked, margin: s.margin || 150, limits: E.limits(s, !!s.ranked), access: s.access || 'ask' }));
        onStatus('waiting');
      };
      ws.onmessage = function (e) {
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        // onStatus returns false to decide later (while a practice game runs): then acceptProposal()
        if (m.t === 'proposal') { self.proposal = m; if (onStatus('proposal', m) !== false) self.acceptProposal(); }
        if (m.t === 'expired') { self.proposal = null; onStatus('waiting'); }
        if (m.t === 'rooms' && self.onRooms) self.onRooms(m.rooms || []);
        if (m.t === 'matched') { ws.close(1000); self.joinRoom(m.room, resolve); }
      };
      ws.onerror = function () { reject(new Error('lobby')); };
      ws.onclose = function (e) { if (!self.room && e.code !== 1000) reject(new Error('lobby')); };
    });
  };
  Online.prototype.acceptProposal = function () { if (this.lobby && this.lobby.readyState === 1) this.lobby.send(JSON.stringify({ t: 'accept' })); };
  Online.prototype.cancelFind = function () { try { if (this.lobby) { this.lobby.send(JSON.stringify({ t: 'cancel' })); this.lobby.close(1000); } } catch (e) { /* closed */ } this.lobby = null; };
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
  /** A match room: as = 'play' or 'watch' to ask to join a running game (null: my own match). */
  Online.prototype.joinRoom = function (id, resolve, as) {
    var self = this;
    this.room = id;
    var ws = this.ws = new WebSocket(this.url('/api/p/live/room/' + id));
    var first = true;
    if (as) ws.onopen = function () { ws.send(JSON.stringify({ t: 'act', type: 'join', data: { as: as, name: Shell.playerName(), avatar: MBG.Account ? MBG.Account.avatar() : '' } })); };
    ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.t !== 'view') return;
      self.view = m.view; self.at = Date.now();
      self.emitView(m.view, m.ev, false);
      if (first) { first = false; if (resolve) resolve({ source: m.view.source }); }
    };
    ws.onclose = function () { if (self.view && self.view.state !== 'done') Shell.toast(Shell.t('online.lost'), 4000); };
    this.timer = setInterval(function () {
      var v = self.view, r = v && v.round;
      if (!r || r.status !== 'playing' || r.pending) return;
      var c = JSON.parse(JSON.stringify(v));
      c.round.remaining = Math.max(0, r.remaining - Math.max(0, (Date.now() - self.at) / 1000 - (r.lead || 0)));   // the clock waits for the "get ready" lead
      c.rounds[c.rounds.length - 1] = c.round;
      self.emitView(c, null, true);
    }, 500);
  };
  Online.prototype.act = function (type, d) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'act', type: type, data: d || {} })); };
  Online.prototype.inviteCode = function () { return this.room; };
  Online.prototype.stop = function () {
    clearInterval(this.timer);
    try { if (this.lobby) this.lobby.close(1000); if (this.ws) this.ws.close(1000); if (this.peek) this.peek.close(1000); } catch (e) { /* closed */ }
  };

  MBG.WhoTransport = { Local: Local, Tabs: Tabs, Online: Online, Referee: Referee };
})(typeof self !== 'undefined' ? self : globalThis);
