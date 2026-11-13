/*!
 * MBG Games - the shared platform, as seen by a game (section 17).
 *
 * One API for every MBG game: the board (messages to all players, across games), direct messages,
 * the notification bell (FR-035 - FR-040), ratings of the games and of MBG Games, the community
 * judges (section 10) and the Top 20.
 *
 * Two backends with the same calls:
 *  - Server: the MBG Games platform worker (MBG.PLATFORM_URL), signed in with the MBG account.
 *  - Demo: when no server is set (a first try on a laptop or phone). Everything is kept on this
 *    device; a judge and the administrator are simulated so the whole judging path can be tried.
 *    Every screen in demo mode says so.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;
  var BASE = String(MBG.PLATFORM_URL || '').replace(/\/+$/, '');
  var KEY = 'MBG.Platform.demo';
  var listeners = [];
  function emit(type) { listeners.forEach(function (f) { try { f(type); } catch (e) { /* ignore */ } }); }
  function now() { return Date.now(); }
  function uid(p) { return (p || 'x') + now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ======================================================== demo backend */
  function load() {
    var d = Shell.readJson(KEY, null);
    if (!d || !d.v) d = { v: 1, posts: [], notes: [], ratings: {}, judge: { inPool: false, langs: [], cats: [], completed: 0, onTime: 0, overturned: 0, stars: [] },
      cases: [], dms: {}, reports: [] };
    if (!d.seeded) {
      d.seeded = true;
      d.posts.push({ id: 'p0', channel: 'all', author: { id: 'mbg', name: 'MBG Games', staff: true }, text: Shell.t('demo.welcomePost'), at: now() - 3600e3, reactions: {}, replies: [] });
      d.notes.push({ id: 'n0', type: 'system', at: now() - 3500e3, read: false, title: Shell.t('note.welcomeTitle'), text: Shell.t('note.welcomeText'), link: { kind: 'board' } });
    }
    return d;
  }
  function save(d) { Shell.writeJson(KEY, d); emit('change'); }
  function meLocal() {
    var u = Shell.getUser();
    return { id: 'u:' + (u.name || 'anon').toLowerCase(), name: u.name || Shell.t('welcome.anonName'), anonymous: u.mode === 'anonymous', demo: true };
  }
  function note(d, type, title, text, link) {
    d.notes.unshift({ id: uid('n'), type: type, at: now(), read: false, title: title, text: text, link: link || null });
    if (d.notes.length > 200) d.notes.length = 200;
  }
  var Demo = {
    mode: 'demo',
    me: function () { return Promise.resolve(meLocal()); },
    board: {
      list: function (channel) {
        var d = load();
        return Promise.resolve(d.posts.filter(function (p) { return !channel || channel === 'all' || p.channel === channel || p.channel === 'all'; })
          .filter(function (p) { return !p.hidden; }).sort(function (a, b) { return b.at - a.at; }));
      },
      post: function (channel, text, replyTo) {
        var d = load(), me = meLocal();
        if (me.anonymous) return Promise.reject(new Error('signin'));
        var p = { id: uid('p'), channel: channel || 'all', author: { id: me.id, name: me.name }, text: String(text).slice(0, 800), at: now(), reactions: {}, replies: [] };
        if (replyTo) {
          var parent = d.posts.filter(function (x) { return x.id === replyTo; })[0];
          if (parent) parent.replies.push(p);
        } else d.posts.push(p);
        save(d);
        return Promise.resolve(p);
      },
      react: function (id, emoji) {
        var d = load(), me = meLocal();
        d.posts.forEach(function (p) {
          [p].concat(p.replies || []).forEach(function (q) {
            if (q.id !== id) return;
            var r = q.reactions[emoji] = q.reactions[emoji] || [];
            var i = r.indexOf(me.id);
            if (i === -1) r.push(me.id); else r.splice(i, 1);
          });
        });
        save(d);
        return Promise.resolve(true);
      },
      report: function (id, reason) { var d = load(); d.reports.push({ id: id, reason: reason, at: now() }); save(d); return Promise.resolve(true); },
      remove: function (id) {
        var d = load(), me = meLocal();
        d.posts = d.posts.filter(function (p) { return !(p.id === id && p.author.id === me.id); });
        d.posts.forEach(function (p) { p.replies = (p.replies || []).filter(function (q) { return !(q.id === id && q.author.id === me.id); }); });
        save(d);
        return Promise.resolve(true);
      }
    },
    notes: {
      list: function () { return Promise.resolve(load().notes.slice()); },
      unread: function () { return Promise.resolve(load().notes.filter(function (n) { return !n.read; }).length); },
      read: function (id) { var d = load(); d.notes.forEach(function (n) { if (id === 'all' || n.id === id) n.read = true; }); save(d); return Promise.resolve(true); },
      remove: function (id) { var d = load(); d.notes = d.notes.filter(function (n) { return n.id !== id; }); save(d); return Promise.resolve(true); },
      /** A notice made on this device (records of practice matches). */
      local: function (type, title, text) { var d = load(); note(d, type, title, text); save(d); emit('change'); return Promise.resolve(true); },
      prefs: function () { return Promise.resolve(Shell.readJson('MBG.Platform.notePrefs', { email: { message: true, judge: true, decision: true, match: true, achievement: false }, reminders: true, push: false })); },
      setPrefs: function (p) { Shell.writeJson('MBG.Platform.notePrefs', p); return Promise.resolve(p); }
    },
    ratings: {
      get: function (target) {
        var d = load(), mine = d.ratings[target] || null;
        return Promise.resolve({ target: target, mine: mine, avg: null, count: 0, demo: true });
      },
      set: function (target, stars, comment) {
        var d = load();
        d.ratings[target] = { stars: stars, comment: String(comment || '').slice(0, 500), at: now() };
        save(d);
        return Promise.resolve(d.ratings[target]);
      }
    },
    judge: {
      status: function () {
        var d = load(), j = d.judge;
        var matches = (MBG.WhoStats && MBG.WhoStats.totalMatches()) || 0;
        var stars = j.stars.length ? j.stars.reduce(function (a, b) { return a + b; }, 0) / j.stars.length : null;
        return Promise.resolve({ inPool: j.inPool, langs: j.langs, cats: j.cats, matches: matches, needed: 30, eligible: true, demo: true,
          completed: j.completed, reliability: reliability(j), stars: stars, starCount: j.stars.length });
      },
      setPool: function (on, langs, cats) {
        var d = load();
        d.judge.inPool = !!on;
        d.judge.langs = langs || d.judge.langs;
        d.judge.cats = cats || d.judge.cats;
        if (on && !d.cases.some(function (c) { return c.demoInvite; })) {
          // a practice case, so a new judge can see how judging works
          var c = demoCase();
          d.cases.push(c);
          note(d, 'judge', Shell.t('note.judgeTitle'), Shell.t('note.judgeText', { cat: c.catName, lang: Shell.langName(c.lang) }), { kind: 'case', id: c.id });
        }
        save(d);
        return Promise.resolve(true);
      },
      cases: function () { return Promise.resolve(load().cases.slice().sort(function (a, b) { return b.created - a.created; })); },
      get: function (id) { return Promise.resolve(load().cases.filter(function (c) { return c.id === id; })[0] || null); },
      accept: function (id) { return change(id, function (c) { c.status = 'assigned'; c.judge = { name: meLocal().name, me: true }; c.acceptedAt = now(); hist(c, 'assigned'); }); },
      decline: function (id) { return change(id, function (c) { c.status = 'declined'; hist(c, 'declined'); }); },
      decide: function (id, decision, text) {
        return change(id, function (c, d) {
          c.decision = { code: decision, text: String(text || '').slice(0, 1000), by: c.judge ? c.judge.name : meLocal().name, at: now() };
          c.status = 'decided';
          hist(c, 'decided');
          if (c.demoInvite || (c.judge && c.judge.me)) {
            d.judge.completed += 1;
            if (c.acceptedAt && now() - c.acceptedAt < 24 * 3600e3) d.judge.onTime += 1;
            c.status = 'final';
            hist(c, 'final');
          }
        });
      },
      ai: function (id) {
        return load().cases.filter(function (c) { return c.id === id; }).map(function (c) { return Promise.resolve(aiCheck(c)); })[0] || Promise.resolve(null);
      },
      rate: function (id, stars) { return change(id, function (c) { c.rating = stars; }); }
    },
    disputes: {
      /** o: { lang, cat, catName, answer (entity), question, response, type, reason, context, match } */
      create: function (o) {
        var d = load(), me = meLocal();
        var c = { id: uid('c'), ref: 'MBG-' + String(now()).slice(-6), status: 'submitted', created: now(), demo: true, mine: true, reporter: me.name,
          game: MBG.GAME_ID, lang: o.lang, cat: o.cat, catName: o.catName, answer: slim(o.answer), question: o.question, response: o.response,
          type: o.type || 'response', reason: String(o.reason || '').slice(0, 800), context: (o.context || []).slice(-6), against: o.against || '',
          deadline: now() + 36 * 3600e3, history: [{ status: 'submitted', at: now() }] };
        c.evidence = aiCheck(c);
        d.cases.push(c);
        note(d, 'judgment', Shell.t('note.caseTitle', { ref: c.ref }), Shell.t('note.caseText'), { kind: 'case', id: c.id });
        save(d);
        simulate(c.id);
        return Promise.resolve(c);
      },
      appeal: function (id, reason) {
        return change(id, function (c, d) {
          c.appeal = { reason: String(reason || '').slice(0, 800), at: now() };
          c.status = 'appealed';
          hist(c, 'appealed');
          setTimeout(function () {
            change(id, function (c2, d2) {
              c2.status = 'escalated';
              hist(c2, 'escalated');
              note(d2, 'appeal', Shell.t('note.appealTitle', { ref: c2.ref }), Shell.t('note.appealText'), { kind: 'case', id: c2.id });
            });
          }, 2500);
        });
      }
    },
    admin: {
      queue: function () { return Promise.resolve(load().cases.filter(function (c) { return c.status === 'escalated' || c.status === 'awaiting'; })); },
      decide: function (id, decision, text) {
        return change(id, function (c, d) {
          c.final = { code: decision, text: String(text || '').slice(0, 1000), by: 'admin', at: now() };
          c.status = 'final';
          hist(c, 'final');
          note(d, 'judgment', Shell.t('note.finalTitle', { ref: c.ref }), Shell.t('dec.' + decision), { kind: 'case', id: c.id });
        });
      }
    },
    invite: function () { return Promise.reject(new Error('demo')); },
    top: function () { return Promise.resolve({ demo: true, rows: [] }); },   // the world list needs the server
    // free access by e-mail needs the server (MBG accounts have the e-mail addresses)
    access: function () { return Promise.resolve({ demo: true, free: false, admin: false }); },
    freeAccess: {
      list: function () { return Promise.reject(new Error('demo')); },
      add: function () { return Promise.reject(new Error('demo')); },
      remove: function () { return Promise.reject(new Error('demo')); }
    },
    // the leaderboard of the day: in demo mode the first tries of the players of this device
    daily: {
      submit: function () { return Promise.resolve({ demo: true }); },
      top: function (id) { return Promise.resolve({ demo: true, rows: MBG.WhoDaily ? MBG.WhoDaily.board(id) : [], total: MBG.WhoDaily ? MBG.WhoDaily.board(id).length : 0 }); }
    },
    submitResult: function () { return Promise.resolve({ demo: true }); }
  };
  function slim(e) {
    if (!e) return null;
    return { id: e.id, qid: e.qid || null, label: e.label, kind: e.kind, facts: e.facts, desc: e.desc || null, source: e.source };
  }
  function hist(c, s, n) { (c.history = c.history || []).push({ status: s, at: now(), note: n || '' }); }
  function change(id, fn) {
    var d = load(), c = d.cases.filter(function (x) { return x.id === id; })[0];
    if (!c) return Promise.resolve(null);
    fn(c, d);
    save(d);
    return Promise.resolve(c);
  }
  function reliability(j) {
    if (!j.completed) return null;
    var timely = j.onTime / j.completed, held = 1 - (j.overturned / j.completed);
    return Math.round(100 * (0.5 * held + 0.3 * timely + 0.2 * Math.min(1, j.completed / 20)));
  }
  /** The facts check that prepares the evidence (FR-030): what the data says about the question. */
  function aiCheck(c) {
    var Q = MBG.WhoQuestions;
    if (!Q || !c.answer || !c.question) return null;
    var r = Q.answer(c.question, c.answer, c.lang);
    return { data: r.code, understood: r.code !== 'INVALID', preds: r.preds || [], note: 'facts' };
  }
  /** A practice case for a new judge: a real card, a real question, a doubtful answer. */
  function demoCase() {
    var D = MBG.WhoDeck, lang = Shell.getLang();
    var e = D.get('d:teresa');
    var q = { en: 'Am I from Albania?', sq: 'A jam nga Shqipëria?', de: 'Komme ich aus Albanien?', bs: 'Jesam li iz Albanije?' }[lang];
    var c = { id: uid('c'), ref: 'MBG-' + String(now()).slice(-6), status: 'invited', created: now(), demo: true, demoInvite: true, mine: false,
      game: 'whoami', lang: lang, cat: 'people', catName: MBG.WhoCats.name(MBG.WhoCats.CATS.people, lang), answer: slim(e), question: q, response: 'NO',
      type: 'response', reason: Shell.t('demo.caseReason'), context: [], deadline: now() + 12 * 3600e3, history: [{ status: 'invited', at: now() }] };
    c.evidence = aiCheck(c);
    return c;
  }
  /** Demo: what the platform does with a new dispute - screening, a judge, a decision (simulated). */
  function simulate(id) {
    var steps = [
      [1500, function (c) { c.status = 'screening'; hist(c, 'screening'); }],
      [3000, function (c) { c.status = 'awaiting'; hist(c, 'awaiting'); }],
      [5500, function (c) { c.status = 'assigned'; c.judge = { name: Shell.t('demo.judgeName'), simulated: true }; hist(c, 'assigned'); }],
      [9000, function (c, d) {
        var data = c.evidence && c.evidence.data;
        var code = !data || data === 'INVALID' ? 'insufficient' : data === c.response ? 'correct' : data === 'BOTH' ? 'both' : data === 'UNKNOWN' ? 'unknown' : 'incorrect';
        c.decision = { code: code, text: Shell.t('demo.judgeText.' + (code === 'correct' ? 'ok' : code === 'insufficient' ? 'none' : 'fix')), by: c.judge.name, at: now() };
        c.status = 'decided';
        hist(c, 'decided');
        note(d, 'judgment', Shell.t('note.decidedTitle', { ref: c.ref }), Shell.t('dec.' + code), { kind: 'case', id: c.id });
      }]
    ];
    steps.forEach(function (s) { setTimeout(function () { change(id, s[1]); }, s[0]); });
  }

  /* ====================================================== server backend */
  function session() { var a = Shell.readJson('MBG.Platform.account', null); return a && a.session ? a.session : null; }
  function call(path, body, method) {
    var h = { 'Content-Type': 'application/json' }, s = session();
    if (s) h.Authorization = 'Bearer ' + s;
    return fetch(BASE + path, { method: method || (body ? 'POST' : 'GET'), headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'http' }; }).then(function (j) { if (!r.ok || j.ok === false) { var e = new Error(j.error || 'http'); e.status = r.status; throw e; } return j; }); });
  }
  var Server = {
    mode: 'server',
    me: function () { return call('/api/p/me').then(function (j) { return j.me; }); },
    board: {
      list: function (channel, before) { return call('/api/p/board?channel=' + encodeURIComponent(channel || 'all') + (before ? '&before=' + before : '')).then(function (j) { return j.posts; }); },
      post: function (channel, text, replyTo) { return call('/api/p/board/post', { channel: channel, text: text, replyTo: replyTo || null }).then(function (j) { emit('change'); return j.post; }); },
      react: function (id, emoji) { return call('/api/p/board/react', { id: id, emoji: emoji }); },
      report: function (id, reason) { return call('/api/p/report', { kind: 'post', id: id, reason: reason }); },
      remove: function (id) { return call('/api/p/board/delete', { id: id }); }
    },
    notes: {
      list: function () { return call('/api/p/notifications').then(function (j) { return j.notifications; }); },
      unread: function () { return call('/api/p/notifications/unread').then(function (j) { return j.unread; }); },
      read: function (id) { return call('/api/p/notifications/read', { id: id }).then(function (j) { emit('change'); return j; }); },
      remove: function (id) { return call('/api/p/notifications/delete', { id: id }).then(function (j) { emit('change'); return j; }); },
      prefs: function () { return call('/api/p/notifications/prefs').then(function (j) { return j.prefs; }); },
      setPrefs: function (p) { return call('/api/p/notifications/prefs', p).then(function (j) { return j.prefs; }); }
    },
    ratings: {
      get: function (target) { return call('/api/p/ratings?target=' + encodeURIComponent(target)); },
      set: function (target, stars, comment) { return call('/api/p/ratings', { target: target, stars: stars, comment: comment || '' }); }
    },
    judge: {
      status: function () { return call('/api/p/judge'); },
      setPool: function (on, langs, cats) { return call('/api/p/judge/pool', { on: !!on, langs: langs || [], cats: cats || [] }); },
      cases: function () { return call('/api/p/judge/cases').then(function (j) { return j.cases; }); },
      get: function (id) { return call('/api/p/cases/' + encodeURIComponent(id)).then(function (j) { return j.case; }); },
      accept: function (id) { return call('/api/p/cases/' + encodeURIComponent(id) + '/accept', {}).then(function (j) { return j.case; }); },
      decline: function (id) { return call('/api/p/cases/' + encodeURIComponent(id) + '/decline', {}).then(function (j) { return j.case; }); },
      decide: function (id, decision, text) { return call('/api/p/cases/' + encodeURIComponent(id) + '/decide', { decision: decision, text: text }).then(function (j) { return j.case; }); },
      ai: function (id) { return call('/api/p/cases/' + encodeURIComponent(id) + '/ai', {}).then(function (j) { return j.assessment; }); },
      rate: function (id, stars) { return call('/api/p/cases/' + encodeURIComponent(id) + '/rate', { stars: stars }).then(function (j) { return j.case; }); }
    },
    disputes: {
      create: function (o) { return call('/api/p/disputes', { matchId: o.matchId || null, round: o.round, turn: o.turn, type: o.type, reason: o.reason, lang: o.lang,
        cat: o.cat, question: o.question, response: o.response, answer: o.matchId ? null : slim(o.answer), context: o.context }).then(function (j) { emit('change'); return j.case; }); },
      appeal: function (id, reason) { return call('/api/p/cases/' + encodeURIComponent(id) + '/appeal', { reason: reason }).then(function (j) { return j.case; }); }
    },
    admin: {
      queue: function () { return call('/api/p/admin/queue').then(function (j) { return j.cases; }); },
      decide: function (id, decision, text) { return call('/api/p/cases/' + encodeURIComponent(id) + '/decide', { decision: decision, text: text, admin: true }).then(function (j) { return j.case; }); }
    },
    top: function (kind) { return call('/api/p/top?game=' + MBG.GAME_ID + '&kind=' + encodeURIComponent(kind || 'rating')); },
    submitResult: function (r) { return call('/api/p/results', r); },
    // the leaderboard of the day (first try of each player counts; Top 20 and the player's own place)
    daily: {
      submit: function (o) { return call('/api/p/daily', o); },
      top: function (id) { return call('/api/p/daily?puzzle=' + encodeURIComponent(id)); }
    },
    invite: function (name, room) { return call('/api/p/invite', { name: name, room: room }); },
    // free access given by the administrator (paid edition): mine, and the administrator's list
    access: function () { return call('/api/p/access'); },
    freeAccess: {
      list: function () { return call('/api/p/admin/free').then(function (j) { return j.list; }); },
      add: function (o) { return call('/api/p/admin/free', o); },
      remove: function (email) { return call('/api/p/admin/free/remove', { email: email }).then(function (j) { return j.list; }); }
    }
  };

  var api = BASE ? Server : Demo;
  api.on = function (f) { listeners.push(f); };
  api.emit = emit;
  api.base = BASE;
  api.demo = !BASE;
  api.signedIn = function () { return !BASE || !!session(); };
  MBG.Net = api;
})(typeof self !== 'undefined' ? self : globalThis);
