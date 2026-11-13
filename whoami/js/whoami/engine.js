/*!
 * MBG Who Am I? - the match: rounds, roles, limits, timer and scores (no screen code).
 *
 * One match = two guessing rounds; the players swap roles (section 7):
 *   round 1: player A guesses, player B answers - round 2: B guesses, A answers.
 * Limits per round (configurable, see OPTIONS): by default 3 minutes, 12 questions, 2 wrong final
 * guesses, 2 rounds. Ranked matches always use the defaults, so ratings stay comparable.
 * The clock of the Guesser stops while a question waits for its answer.
 *
 * Round score (section 13.1), for a solved round:
 *   max(0, 100 + 5 × unused questions + floor(remaining seconds / 10) − 15 × wrong final guesses)
 *   × difficulty multiplier (Easy 1.00 · Standard 1.15 · Advanced 1.30 · Expert 1.50)
 * An unsolved round scores 0. A hint (practice only) uses 2 questions - like the hints of
 * MBG Puzzles, which count as 2 extra tries.
 *
 * MatchCore is the referee. The same code runs on the phone (games against the computer, two
 * tabs on one computer) and in the server's live match room (online games), where it is the
 * authority: views for each player never contain an answer that player may not see (FR-026).
 */
(function (root, factory) {
  var api = factory(root.MBG && root.MBG.WhoText || (typeof require === 'function' ? require('./text.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoEngine = api;
})(typeof self !== 'undefined' ? self : globalThis, function (X) {
  'use strict';

  var DEFAULTS = { roundSeconds: 180, maxQuestions: 12, maxWrong: 2, hintCost: 2, hints: true, answerSeconds: 45, rounds: 2, nearFree: 2, leadSeconds: 4 };
  // leadSeconds: "get ready" - the clock of a round starts this long after the round (while the card
  // lands on the forehead and the players read what is going on), or at the Guesser's first move,
  // whichever comes first. So the animation never costs anyone time.
  var MULT = { easy: 1.00, standard: 1.15, advanced: 1.30, expert: 1.50 };
  var CODES = ['YES', 'NO', 'BOTH', 'UNKNOWN', 'INVALID'];

  /** The score of one round (FR section 13.1). */
  /**
   * The points of a round. With the standard limits (12 questions, 3 minutes): 5 per question not
   * needed and 1 per 10 seconds left. With other limits the same shares: up to 60 points for the
   * questions and up to 18 for the time, so a longer clock or more questions never give more points.
   */
  function scoreRound(o) {
    var mult = MULT[o.level] || 1;
    if (!o.won) return { won: false, base: 0, unused: 0, unusedPts: 0, secs: 0, timePts: 0, wrong: o.wrong || 0, wrongPts: 0, mult: mult, raw: 0, total: 0 };
    var maxQ = o.maxQuestions || DEFAULTS.maxQuestions, total = o.roundSeconds || DEFAULTS.roundSeconds;
    var unused = Math.max(0, maxQ - o.used);
    var secs = Math.max(0, Math.floor(o.remainingSec));
    var unusedPts = Math.round(60 * unused / maxQ), timePts = Math.floor(18 * Math.min(secs, total) / total + 1e-9);
    var raw = Math.max(0, 100 + unusedPts + timePts - 15 * (o.wrong || 0));
    return { won: true, base: 100, unused: unused, unusedPts: unusedPts, secs: secs, timePts: timePts,
      wrong: o.wrong || 0, wrongPts: -15 * (o.wrong || 0), mult: mult, raw: raw, total: Math.round(raw * mult) };
  }
  /** The best possible round (for the score bar): no question, no time used, Expert - 267 with any limits. */
  function maxScore() { return Math.round((100 + 60 + 18) * 1.5); }

  /* ----------------------------------------------------------- limits --- */
  // What a player may choose for a casual or practice match; DEFAULTS above is the standard.
  var OPTIONS = {
    roundSeconds: [60, 120, 180, 300, 600],   // 1, 2, 3, 5, 10 minutes
    maxQuestions: [8, 12, 16, 20],
    maxWrong: [1, 2, 3, 5],                   // final guesses that may be wrong
    rounds: [2, 4, 6]                         // always even: both players guess equally often
  };
  /** The limits of a match from a setup ({ time, questions, guesses, rounds }); ranked = the standard. */
  function limits(setup, ranked) {
    var out = {};
    var want = { roundSeconds: setup && setup.time, maxQuestions: setup && setup.questions, maxWrong: setup && setup.guesses, rounds: setup && setup.rounds };
    for (var k in OPTIONS) {
      var v = Number(want[k]);
      out[k] = !ranked && OPTIONS[k].indexOf(v) !== -1 ? v : DEFAULTS[k];
    }
    return out;
  }
  function isStandard(cfg) { for (var k in OPTIONS) if (cfg[k] !== DEFAULTS[k]) return false; return true; }

  /* ------------------------------------------------------------- hints --- */
  // What a hint tells, one after the other: the first letter, the time, the country, a tag.
  function clues(e) {
    var f = (e && e.facts) || {}, out = [];
    out.push({ k: 'letter', v: X.firstLetter(X.labelIn(e, 'en')) });
    var y = e.kind === 'person' ? f.born : f.start;
    if (y != null) out.push({ k: 'century', v: y < 0 ? -Math.ceil(-y / 100) : Math.floor((y - 1) / 100) + 1 });
    if ((f.countries || []).length) out.push({ k: 'country', v: f.countries[0] });
    else if ((f.continents || []).length) out.push({ k: 'continent', v: f.continents[0] });
    var good = (f.tags || []).filter(function (t) { return ['person', 'place', 'event', 'art', 'game'].indexOf(t) === -1; });
    if (good.length) out.push({ k: 'tag', v: good[0] });
    out.push({ k: 'words', v: X.norm(X.labelIn(e, 'en')).split(' ').length });
    return out;
  }

  /* ------------------------------------------------------------- match --- */
  function MatchCore(o) {
    o = o || {};
    this.id = o.id || ('m' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36));
    this.lang = o.lang || 'en';
    this.mode = o.mode || 'who';
    this.cat = o.cat || null;
    this.subs = o.subs || [];
    this.level = o.level || 'standard';
    this.ranked = !!o.ranked;
    this.vsComputer = !!o.vsComputer;
    this.cfg = {};
    for (var k in DEFAULTS) this.cfg[k] = o.config && o.config[k] != null ? o.config[k] : DEFAULTS[k];
    if (this.ranked) { this.cfg.hints = false; for (var k2 in OPTIONS) this.cfg[k2] = DEFAULTS[k2]; }
    this.players = (o.players || []).map(function (p) { return { id: p.id, name: p.name, kind: p.kind || 'human', rating: p.rating || null, avatar: p.avatar || '' }; });
    this.answers = o.answers || [];
    this.source = o.source || 'deck';
    this.state = 'ready';
    this.rounds = [];
    this.chat = [];
    this.flags = [];
    this.seq = 0;
    this.created = o.now || Date.now();
    // others joining (as a player or to watch): 'closed' nobody, 'ask' the players decide, 'auto' everyone welcome
    this.access = ACCESS.indexOf(o.access) !== -1 && !this.vsComputer ? o.access : 'closed';
    this.watchers = [];
    this.requests = [];
    this.watchChat = [];      // the observers among themselves - the players never see it
    this.reactions = [];      // the observers' emojis - everyone sees them
  }
  var ACCESS = ['closed', 'ask', 'auto'];
  var MAX_PLAYERS = 6, MAX_WATCHERS = 30;
  // What observers can send to the players: cheering, not hints (no "hot", no "cold", no thumbs up/down).
  var REACTIONS = ['👏', '😂', '😮', '❤️', '🎉', '😅', '🙈', '🍿'];
  var M = MatchCore.prototype;

  M.player = function (id) { for (var i = 0; i < this.players.length; i++) if (this.players[i].id === id) return this.players[i]; return null; };
  M.current = function () { return this.rounds[this.rounds.length - 1] || null; };
  M.roleOf = function (pid, r) {
    r = r || this.current();
    if (!r) return null;
    return r.guesser === pid ? 'guesser' : r.answerer === pid ? 'answerer' : null;
  };

  M.active = function () { return this.players.filter(function (p) { return !p.left; }); };
  M.watcher = function (id) { for (var i = 0; i < this.watchers.length; i++) if (this.watchers[i].id === id) return this.watchers[i]; return null; };
  /** Rounds each player guesses: 1, 2 or 3 (the setup's 2, 4 or 6 rounds with two players). */
  M.perPlayer = function () { return Math.max(1, Math.round(this.cfg.rounds / 2)); };
  M.totalRounds = function () {
    var per = this.perPlayer(), n = this.rounds.length;
    // rounds still to come for every player who is still in, plus the rounds already played
    this.active().forEach(function (p) { n += Math.max(0, per - this.guessesOf(p.id)); }, this);
    return n;
  };
  M.guessesOf = function (pid) { return this.rounds.filter(function (r) { return r.guesser === pid; }).length; };
  /**
   * Who wears the card next: the active player who has guessed least (in the order of joining), so
   * the card goes from forehead to forehead - with two players A, B, A, B; with four A, B, C, D, A, …
   * A player who joins during the match comes in at the next round where it is their turn.
   */
  M.nextGuesser = function () {
    var per = this.perPlayer(), best = null, self = this;
    this.active().forEach(function (p) {
      var n = self.guessesOf(p.id);
      if (n < per && (!best || n < best.n)) best = { p: p, n: n };
    });
    return best ? best.p : null;
  };
  /** The Answerer of a round: the next active player after the Guesser (the one who "puts the card on"). */
  M.answererFor = function (gid) {
    var list = this.active(), i = 0;
    for (; i < list.length; i++) if (list[i].id === gid) break;
    return list[(i + 1) % list.length];
  };
  /** How many hidden answers are still missing for the rounds to come (a new player needs one). */
  M.answersNeeded = function () { return Math.max(0, this.totalRounds() - this.answers.length); };
  M.addAnswers = function (list) { var self = this; (list || []).forEach(function (a) { if (a && self.answers.indexOf(a) === -1) self.answers.push(a); }); };

  /** Starts the next round (the first one too). */
  M.startRound = function (now) {
    var i = this.rounds.length;
    if (this.state === 'done') return null;
    var g = this.nextGuesser();
    if (!g || this.active().length < 2) { this.state = 'done'; return null; }
    if (!this.answers[i]) return { need: true };
    var a = this.answererFor(g.id);
    var lead = Math.max(0, Number(this.cfg.leadSeconds) || 0) * 1000;
    var r = { index: i, guesser: g.id, answerer: a.id, answer: this.answers[i], startedAt: now + lead, beganAt: now, pausedMs: 0, pendingSince: null,
      turns: [], guesses: [], hints: [], used: 0, wrong: 0, status: 'playing', endedAt: null, score: null, reason: null };
    this.rounds.push(r);
    this.state = 'playing';
    return r;
  };
  /** Seconds left for the Guesser (the clock waits while a question is unanswered). */
  M.remaining = function (now, r) {
    r = r || this.current();
    if (!r) return 0;
    var end = r.endedAt || now;
    var paused = r.pausedMs + (r.pendingSince != null && !r.endedAt ? end - r.pendingSince : 0);
    var total = this.cfg.roundSeconds + (r.bonusSec || 0);
    return Math.max(0, Math.min(total, total - (end - r.startedAt - paused) / 1000));
  };
  /** The Guesser moves before the "get ready" lead is over: the clock starts now. */
  function go(r, now) { if (r && now < r.startedAt) r.startedAt = now; }
  M.questionsLeft = function (r) { r = r || this.current(); return r ? Math.max(0, this.cfg.maxQuestions + (r.bonusQ || 0) - r.used) : 0; };
  /**
   * Power-ups (practice against the computer only - never against people): one more minute, three
   * more questions, or the shape of the name. The app pays them with credits (js/app/plans.js).
   */
  M.boost = function (pid, kind, now) {
    var r = this.current();
    if (!this.vsComputer) return err('people');
    if (!r || r.status !== 'playing') return err('over');
    if (r.guesser !== pid) return err('not_guesser');
    r.boosts = r.boosts || [];
    if (kind === 'time') r.bonusSec = (r.bonusSec || 0) + 60;
    else if (kind === 'questions') r.bonusQ = (r.bonusQ || 0) + 3;
    else if (kind === 'spell') r.spell = X.pattern(X.labelIn(r.answer, this.lang));
    else return err('kind');
    r.boosts.push({ kind: kind, at: now });
    return { kind: kind, pattern: r.spell || null };
  };
  M.pending = function (r) {
    r = r || this.current();
    if (!r) return null;
    for (var i = r.turns.length - 1; i >= 0; i--) if (!r.turns[i].code) return r.turns[i];
    return null;
  };

  function err(code) { return { error: code }; }

  /** The Guesser asks one question (FR-017). */
  M.ask = function (pid, text, now) {
    var r = this.current();
    if (!r || r.status !== 'playing') return err('over');
    if (r.guesser !== pid) return err('not_guesser');
    if (this.pending(r)) return err('pending');
    if (this.questionsLeft(r) <= 0) return err('no_questions');
    go(r, now);
    var q = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (q.length < 3) return err('short');
    var t = { id: ++this.seq, q: q, at: now, code: null, by: pid, respondedAt: null };
    r.turns.push(t);
    r.pendingSince = now;
    return { turn: t };
  };

  /** The Answerer answers (FR-018). INVALID: the question does not count (FR-020). */
  M.respond = function (pid, turnId, code, now, meta) {
    var r = this.current();
    if (!r || r.status !== 'playing') return err('over');
    if (r.answerer !== pid) return err('not_answerer');
    if (CODES.indexOf(code) === -1) return err('code');
    var t = null;
    for (var i = 0; i < r.turns.length; i++) if (r.turns[i].id === turnId) t = r.turns[i];
    if (!t || t.code) return err('turn');
    t.code = code;
    t.respondedAt = now;
    if (meta && meta.note) t.note = meta.note;
    if (r.pendingSince != null) { r.pausedMs += now - r.pendingSince; r.pendingSince = null; }
    if (code !== 'INVALID') r.used += 1;
    return { turn: t };
  };

  /** A final guess (FR-021): right ends the round; the second wrong guess too. */
  M.guess = function (pid, text, now) {
    var r = this.current();
    if (!r || r.status !== 'playing') return err('over');
    if (r.guesser !== pid) return err('not_guesser');
    if (this.pending(r)) return err('pending');
    var g = String(text || '').trim().slice(0, 120);
    if (!g) return err('short');
    go(r, now);
    var c = X.closeness(g, r.answer), ok = c === 'right';
    r.near = r.near || 0;
    // The right name, misspelled: "close - just the spelling". Not a wrong guess (this is not a
    // spelling game); the player sees the shape of the name and tries again. Twice per round.
    if (c === 'near' && r.near < this.cfg.nearFree) {
      r.near += 1;
      r.guesses.push({ text: g, correct: false, near: true, at: now });
      return { correct: false, near: true, pattern: X.pattern(X.labelIn(r.answer, this.lang)), wrong: r.wrong, nearLeft: this.cfg.nearFree - r.near };
    }
    r.guesses.push({ text: g, correct: ok, at: now });
    if (ok) this.endRound('won', now, 'guessed');
    else {
      r.wrong += 1;
      if (r.wrong >= this.cfg.maxWrong) this.endRound('lost', now, 'wrong');
    }
    return { correct: ok, wrong: r.wrong };
  };

  /** A hint (practice only): the next clue, for 2 questions - or, paid with credits, for none. */
  M.hint = function (pid, now, withCredits) {
    var r = this.current();
    if (!r || r.status !== 'playing') return err('over');
    if (!this.cfg.hints) return err('no_hints');
    if (r.guesser !== pid) return err('not_guesser');
    if (!withCredits && this.questionsLeft(r) < this.cfg.hintCost) return err('no_questions');
    var all = clues(r.answer);
    if (r.hints.length >= all.length) return err('no_more');
    var c = all[r.hints.length];
    go(r, now);
    r.hints.push(c);
    if (!withCredits) r.used += this.cfg.hintCost;
    return { clue: c };
  };

  M.giveUp = function (pid, now) {
    var r = this.current();
    if (!r || r.status !== 'playing') return err('over');
    if (r.guesser !== pid) return err('not_guesser');
    go(r, now);
    this.endRound('lost', now, 'gave_up');
    return { ok: true };
  };

  /** Time: ends the round when the clock runs out; answers an answer that took too long. */
  M.tick = function (now) {
    var r = this.current();
    if (!r || r.status !== 'playing') return null;
    var p = this.pending(r);
    if (p && now - p.at > this.cfg.answerSeconds * 1000) {
      this.respond(r.answerer, p.id, 'INVALID', now, { note: 'timeout' });
      return { timeoutAnswer: p.id };
    }
    if (!p && this.remaining(now, r) <= 0) { this.endRound('lost', now, 'time'); return { timeout: true }; }
    return null;
  };

  M.endRound = function (status, now, reason) {
    var r = this.current();
    if (!r || r.status !== 'playing') return;
    if (r.pendingSince != null) { r.pausedMs += now - r.pendingSince; r.pendingSince = null; }
    r.status = status;
    r.reason = reason;
    r.endedAt = now;
    r.score = scoreRound({ won: status === 'won', used: r.used, maxQuestions: this.cfg.maxQuestions, roundSeconds: this.cfg.roundSeconds, remainingSec: this.remaining(now, r),
      wrong: r.wrong, level: this.level });
    this.state = this.nextGuesser() && this.active().length >= 2 ? 'between' : 'done';
  };

  /**
   * Someone leaves. An observer simply goes. A player: the open round is lost for a Guesser who leaves
   * (void if its Answerer leaves). With two players the match ends; with more, it goes on without them.
   */
  M.abandon = function (pid, now) {
    if (this.watcher(pid)) { this.watchers = this.watchers.filter(function (w) { return w.id !== pid; }); return; }
    var p = this.player(pid);
    if (!p || p.left) return;
    var r = this.current();
    if (r && r.status === 'playing' && (r.guesser === pid || r.answerer === pid)) this.endRound(r.guesser === pid ? 'lost' : 'void', now, 'left');
    if (this.players.length <= 2) { this.state = 'done'; this.leftBy = pid; return; }
    p.left = true;
    if (this.active().length < 2) { this.state = 'done'; this.leftBy = pid; }
    else if (this.state === 'between' && !this.nextGuesser()) this.state = 'done';
  };

  /* ------------------------------------------------- joining and watching --- */
  /** Someone asks to join: o = { id, name, avatar, as: 'play' | 'watch' }. */
  M.request = function (o, now) {
    if (this.access === 'closed') return err('closed');
    if (this.state === 'done') return err('over');
    if (this.player(o.id) && !this.player(o.id).left || this.watcher(o.id)) return { already: true };
    var as = o.as === 'play' ? 'play' : 'watch';
    if (as === 'play' && this.ranked) return err('ranked');   // ranked matches stay one against one (others may watch)
    if (as === 'play' && this.active().length >= MAX_PLAYERS) return err('full');
    if (as === 'watch' && this.watchers.length >= MAX_WATCHERS) return err('full');
    var q = null;
    for (var i = 0; i < this.requests.length; i++) if (this.requests[i].pid === o.id && !this.requests[i].done) q = this.requests[i];
    if (!q) {
      q = { id: ++this.seq, pid: o.id, name: String(o.name || '').slice(0, 40), avatar: o.avatar || '', as: as, at: now, ok: [], done: null };
      this.requests.push(q);
    }
    if (this.access === 'auto') return this.admit(q, now);
    return { pending: true, request: q };
  };
  /** A player says yes or no to a request; it is accepted when every active player said yes. */
  M.decide = function (pid, reqId, yes, now) {
    var p = this.player(pid);
    if (!p || p.left) return err('player');
    var q = null;
    for (var i = 0; i < this.requests.length; i++) if (this.requests[i].id === reqId) q = this.requests[i];
    if (!q || q.done) return err('request');
    if (!yes) { q.done = 'declined'; return { declined: true, request: q }; }
    if (q.ok.indexOf(pid) === -1) q.ok.push(pid);
    var all = this.active().every(function (x) { return x.kind === 'bot' || q.ok.indexOf(x.id) !== -1; });
    return all ? this.admit(q, now) : { pending: true, request: q };
  };
  M.admit = function (q, now) {
    if (q.as === 'play' && this.active().length >= MAX_PLAYERS) { q.done = 'full'; return err('full'); }
    q.done = 'accepted';
    var info = { id: q.pid, name: q.name, avatar: q.avatar, kind: 'human', rating: null, joinedAt: now };
    if (q.as === 'play') {
      var old = this.player(q.pid);
      if (old) old.left = false; else this.players.push(info);
      this.watchers = this.watchers.filter(function (w) { return w.id !== q.pid; });
    } else this.watchers.push(info);
    return { admitted: true, as: q.as, request: q };
  };
  /** An observer's emoji, seen by everyone (one every 2 seconds). */
  M.react = function (pid, emoji, now) {
    var w = this.watcher(pid);
    if (!w) return err('watcher');
    if (REACTIONS.indexOf(emoji) === -1) return err('emoji');
    if (w.lastReact && now - w.lastReact < 2000) return err('slow');
    w.lastReact = now;
    var m = { id: ++this.seq, by: pid, name: w.name, emoji: emoji, at: now };
    this.reactions.push(m);
    if (this.reactions.length > 60) this.reactions.shift();
    return { reaction: m };
  };

  /** Chat: players write in the match chat (observers read it); observers write only among themselves. */
  M.say = function (pid, text, now) {
    var t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!t) return err('short');
    var w = this.watcher(pid);
    if (!this.player(pid) && !w) return err('short');
    var m = { id: ++this.seq, by: pid, name: (this.player(pid) || w).name, text: t, at: now };
    var list = w ? this.watchChat : this.chat;
    list.push(m);
    if (list.length > 200) list.shift();
    return { msg: m, watchers: !!w };
  };

  /** A player challenges a response or a guess (FR-026). Kept with the match; judged after the round. */
  M.flag = function (pid, o, now) {
    if (!this.player(pid)) return err('player');
    var f = { id: ++this.seq, by: pid, round: o.round, turn: o.turn || null, guess: o.guess != null ? o.guess : null,
      type: o.type || 'response', reason: String(o.reason || '').slice(0, 500), at: now };
    this.flags.push(f);
    return { flag: f };
  };

  M.totals = function () {
    var t = {};
    this.players.forEach(function (p) { t[p.id] = 0; });
    this.rounds.forEach(function (r) { if (r.score) t[r.guesser] += r.score.total; });
    return t;
  };
  M.result = function () {
    if (this.state !== 'done') return null;
    var t = this.totals(), a = this.players[0], b = this.players[1];
    var winner;
    if (this.players.length === 2) winner = this.leftBy ? (this.leftBy === a.id ? b.id : a.id) : t[a.id] > t[b.id] ? a.id : t[b.id] > t[a.id] ? b.id : null;
    else {
      // more players: the best total of those still in; a tie at the top is a draw
      var list = this.active().slice().sort(function (x, y) { return t[y.id] - t[x.id]; });
      winner = list.length && (list.length === 1 || t[list[0].id] > t[list[1].id]) ? list[0].id : null;
    }
    var ranking = this.players.slice().sort(function (x, y) { return (x.left ? 1 : 0) - (y.left ? 1 : 0) || t[y.id] - t[x.id]; }).map(function (p) { return p.id; });
    return { totals: t, winner: winner, draw: !winner, left: this.leftBy || null, ranking: ranking };
  };

  /**
   * What one person may see (pid null = a judge or the archive: everything). The Guesser never sees
   * the answer while playing; everyone else in the match does (the other players and the observers),
   * as around a table. The observers' own chat is only for observers. Someone who has asked to join
   * and is waiting sees the scores and the round, nothing hidden.
   */
  M.viewFor = function (pid, now) {
    var self = this;
    var isWatcher = !!this.watcher(pid), isPlayer = !!this.player(pid) && !this.player(pid).left;
    var inside = pid == null || isWatcher || isPlayer;
    var rounds = this.rounds.map(function (r) {
      var mine = pid == null || r.status !== 'playing' ? inside : r.guesser !== pid && inside;
      return {
        index: r.index, guesser: r.guesser, answerer: r.answerer, status: r.status, reason: r.reason,
        answer: mine ? r.answer : null, turns: r.turns.map(function (t) { return { id: t.id, q: t.q, code: t.code, at: t.at, note: t.note || null }; }),
        guesses: r.guesses.slice(), hints: r.hints.slice(), used: r.used, wrong: r.wrong,
        remaining: self.remaining(now, r), lead: r.status === 'playing' ? Math.max(0, (r.startedAt - now) / 1000) : 0,
        questionsLeft: self.questionsLeft(r), score: r.score, startedAt: r.startedAt, endedAt: r.endedAt,
        pending: (self.pending(r) || {}).id || null, spell: r.guesser === pid || pid == null ? r.spell || null : null, bonusSec: r.bonusSec || 0, bonusQ: r.bonusQ || 0
      };
    });
    return { id: this.id, lang: this.lang, mode: this.mode, cat: this.cat, subs: this.subs, level: this.level, ranked: this.ranked,
      vsComputer: this.vsComputer, source: this.source, cfg: this.cfg, state: this.state, me: pid, players: this.players, rounds: rounds,
      round: rounds[rounds.length - 1] || null, chat: inside ? this.chat.slice(-60) : [], totals: this.totals(), result: this.result(),
      flags: this.flags.filter(function (f) { return pid == null || f.by === pid; }),
      watchers: this.watchers.map(function (w) { return { id: w.id, name: w.name }; }), access: this.access,
      watchChat: pid == null || isWatcher ? this.watchChat.slice(-60) : [], reactions: inside ? this.reactions.slice(-20) : [],
      requests: isPlayer || pid == null ? this.requests.filter(function (q) { return !q.done; }) : [],
      myRequest: inside ? null : (this.requests.filter(function (q) { return q.pid === pid; }).slice(-1)[0] || null),
      watching: isWatcher, outside: !inside, totalRounds: this.totalRounds(), perPlayer: this.perPlayer() };
  };

  M.toJSON = function () {
    var o = {};
    for (var k in this) if (Object.prototype.hasOwnProperty.call(this, k)) o[k] = this[k];
    return o;
  };
  MatchCore.from = function (o) {
    var m = new MatchCore({});
    for (var k in o) m[k] = o[k];
    return m;
  };

  /* ------------------------------------------------------------ titles --- */
  // MBG game-specific rating titles (section 13.2).
  var TITLES = [[2800, 'gm'], [2600, 'elite'], [2400, 'im'], [2200, 'master'], [1800, 'expert'], [1400, 'strong'], [0, 'player']];
  function titleOf(r) { for (var i = 0; i < TITLES.length; i++) if (r >= TITLES[i][0]) return TITLES[i][1]; return 'player'; }

  return { DEFAULTS: DEFAULTS, OPTIONS: OPTIONS, ACCESS: ACCESS, REACTIONS: REACTIONS, MAX_PLAYERS: MAX_PLAYERS, limits: limits, isStandard: isStandard, MULT: MULT, CODES: CODES, scoreRound: scoreRound, maxScore: maxScore, clues: clues,
    MatchCore: MatchCore, TITLES: TITLES, titleOf: titleOf };
});
