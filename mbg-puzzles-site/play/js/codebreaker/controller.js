/*!
 * MBG Puzzles · Codebreaker - game controller (state machine, no DOM access).
 *
 *   boot -> playing -> roundEnd -> playing ... -> goodbye
 *                 \-> locked (today's free game is played) -> playing when allowed again
 *
 * Free week, daily free game and subscription (MBG.Access, passed in as deps.access):
 * a new game starts only when access.canStart(gameId) says so; otherwise the state is
 * 'locked'. The free game is counted at the first try of a game.
 *
 * The game starts at once as the shared Anonymous user. Logging in, creating a user,
 * playing without saving and logging out are separate actions (login(), register(),
 * playWithoutSaving(), logout()) that never interrupt the current round.
 *
 * The controller turns player input into events ({type, ...}). The user interface
 * listens to those events and renders them; it never changes game state directly.
 * Only the current round is kept in the history (guesses, win, reveal), so each new
 * round starts on a clean board. Short messages are sent as 'notice' events.
 *
 * The secret is a random number of 4-8 digits (digits may repeat). It does not depend
 * on the language, so switching the language keeps the current game.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Controller = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  function lib(name, file) {
    return (root.MBG && root.MBG[name]) || (typeof require === 'function' ? require(file) : null);
  }

  var STATES = ['boot', 'playing', 'roundEnd', 'locked', 'goodbye'];
  /** Typed as a name, these mean "play as Anonymous" (English, Albanian, Bosnian, German, Spanish, French, Turkish). */
  var ANON_WORDS = ['a', 'anonymous', 'anonim', 'anonimno', 'anonym', 'anónimo', 'anonimo', 'anonyme'];
  var LANGS = ['en', 'sq', 'bs', 'de', 'es', 'fr', 'tr', 'pl', 'pt', 'ar'];

  function GameController(deps) {
    deps = deps || {};
    this.E = deps.engine || lib('Engine', './engine.js');
    this.S = deps.storageLib || lib('Storage', '../shared/storage.js');
    this.users = deps.users;
    this.now = deps.now || function () { return Date.now(); };
    this.random = deps.random || Math.random;
    this.storagePersistent = deps.storagePersistent !== false;
    this.lang = LANGS.indexOf(deps.lang) !== -1 ? deps.lang : 'en';
    this.length = deps.length || 4;
    this.state = 'boot';
    this.user = null;            // { mode: 'anonymous'|'registered'|'nodata', name }
    this.round = null;
    this.rounds = 0;
    this.history = [];           // events of the current round only
    this.listeners = [];
    this.seq = 0;
    this.access = deps.access || null;           // MBG.Access store (free week, daily game, subscription)
    this.gameId = deps.gameId || 'game';
    this.initialUser = deps.initialUser || null; // function returning the user shared by both games
    this.askBeforeReveal = deps.askBeforeReveal || null;   // true: the screen asks first (paid reveal)
    this.daily = null;                           // { n, secret, length } while playing the daily puzzle
  }

  var P = GameController.prototype;

  /* --------------------------------------------------------- events --- */
  P.on = function (fn) { this.listeners.push(fn); return this; };

  P.emit = function (evt) {
    evt.id = ++this.seq;
    if (evt.log !== false) this.history.push(evt);
    for (var i = 0; i < this.listeners.length; i++) this.listeners[i](evt);
    return evt;
  };

  /** Short message for the player: level 'info' (toast) or 'warn' (shown next to the input). */
  P._notice = function (level, key, params) {
    return this.emit({ type: 'notice', level: level, key: key, params: params || {}, log: false });
  };
  P._info = function (key, params) { return this._notice('info', key, params); };
  P._warn = function (key, params) { return this._notice('warn', key, params); };
  P._state = function () { return this.emit({ type: 'state', state: this.state, log: false }); };
  P._ui = function (action) { return this.emit({ type: 'ui', action: action, log: false }); };

  P._anonymous = function () { return { mode: 'anonymous', name: this.S.ANONYMOUS }; };

  /** The current game is over: reported once, for the statistics ('result', not shown). */
  P._result = function (won) {
    var r = this.round;
    if (!r || r.reported) return;
    r.reported = true;
    this.emit({ type: 'result', won: !!won, tries: r.guesses.length, hints: r.hints ? r.hints.length : 0,
      seconds: this.E.elapsedSeconds(r, r.endedAt != null ? r.endedAt : this.now()), length: r.length, lang: r.lang,
      daily: r.daily || null, user: this.user, log: false });
  };
  /** Ends an unfinished game (new game, other length or language): lost, once a try was made. */
  P._abandon = function () {
    var r = this.round;
    if (!r) return;
    var started = r.status === 'active' && (r.guesses.length > 0 || (r.hints || []).length > 0);
    this.E.abandonRound(r, this.now());
    if (started) this._result(false);
  };

  /** The user chosen in the other game (or last time) carries over without a message. */
  P._startUser = function () {
    var u = this.initialUser ? this.initialUser() : null;
    if (u && u.mode === 'registered' && u.name) {
      var f = this.users.find(u.name) || this.users.create(u.name);
      return { mode: 'registered', name: f ? f.name : u.name };
    }
    if (u && u.mode === 'nodata') return { mode: 'nodata', name: null };
    return this._anonymous();
  };

  /* ------------------------------------------------------ lifecycle --- */
  P.start = function () { return this.restart(); };

  /** Fresh start (also after the goodbye screen): Anonymous user, new round at once. */
  P.restart = function () {
    this._abandon();
    this.history = [];
    this.round = null;
    this.user = this._startUser();
    if (!this.storagePersistent) this._info('storageUnavailable');
    this._newRound();
  };

  /* ---------------------------------------------------------- input --- */
  P.input = function (raw) {
    if (this.state !== 'playing' && this.state !== 'roundEnd' && this.state !== 'locked') return;
    var trimmed = String(raw == null ? '' : raw).normalize('NFC').trim();
    var cmd = this.E.parseCommand(trimmed, this.lang);

    // help and quit work in every state (FR-CMD-002/003)
    if (cmd === 'help') { this._ui('help'); return; }
    if (cmd === 'quit') { this._ui('quit'); return; }
    if (this.state === 'locked') { this._ui('paywall'); return; }

    if (this.state === 'playing') return this._inputPlaying(trimmed);
    return this._inputRoundEnd(trimmed);
  };

  P._inputPlaying = function (trimmed) {
    var round = this.round;
    var c = this.E.classifyGuess(trimmed, { length: round.length, lang: this.lang });
    if (c.kind === 'empty') { this._warn('empty', { length: round.length }); return; }
    if (c.kind === 'command') {
      if (this.askBeforeReveal && this.askBeforeReveal()) { this._ui('reveal'); return; }
      this.reveal();
      return;
    }
    if (c.kind === 'invalid') {
      if (c.reason === 'digits') this._warn('digits');
      else this._warn('length', { length: round.length, got: c.got });
      return;
    }
    // The first try of a game uses today's free game (free plan only).
    if (round.guesses.length === 0 && this.access && !this.daily) {   // the daily puzzle is always free
      if (!this.access.canStart(this.gameId)) { this.E.abandonRound(round, this.now()); this._lock(); return; }
      this.access.recordFirstGuess(this.gameId);
    }
    var res = this.E.applyGuess(round, c.word, this.now());
    this.emit({ type: 'guess', attempt: res.attempt, word: c.word, feedback: res.feedback, won: res.won, length: round.length });
    if (res.won) this._win();
  };

  P._inputRoundEnd = function (trimmed) {
    var yn = this.E.parseYesNo(trimmed);
    if (yn === 'yes') { if (this.daily) this._ui('leaveDaily'); else this._newRound(); return; }
    if (yn === 'no') { this._ui('quit'); return; }
    this._warn('roundOver');
  };

  /* --------------------------------------------------------- rounds --- */
  P._newRound = function () {
    if (this.daily) return this._dailyRound();
    if (this.access && !this.access.canStart(this.gameId)) return this._lock();
    var secret = this.E.randomSecret(this.length, this.random);
    this.round = this.E.createRound(secret, this.length, this.lang, this.now());
    this.rounds += 1;
    this.state = 'playing';
    this.history = [];
    this.emit({ type: 'round', length: this.length, lang: this.lang, number: this.rounds });
    this._state();
    return true;
  };

  /** Today's free game is played: no new game until the free game is back or a plan is active. */
  P._lock = function () {
    this.round = null;
    this.history = [];
    this.state = 'locked';
    this.emit({ type: 'locked', log: false });
    this._state();
    return false;
  };

  /** Called by the screen when access may have changed (time passed, subscription bought). */
  P.recheckAccess = function () {
    if (this.state !== 'locked') return false;
    if (this.access && !this.access.canStart(this.gameId)) return false;
    return this._newRound();
  };

  P._win = function () {
    var r = this.round;
    var u = this.user || this._anonymous();
    var stored = u.mode !== 'nodata';
    var previous = this.users.allTimeBest();
    var best = null;
    var newBest = false;
    if (stored) {
      newBest = this.users.updateBest(u.name, r.score.total);
      var f = this.users.find(u.name);
      best = f ? f.best : r.score.total;
    }
    this._result(true);
    this.emit({
      type: 'win',
      daily: r.daily || null,
      userName: u.mode === 'registered' ? u.name : null,
      player: u.name || null,
      mode: u.mode,
      word: r.secret,
      length: r.length,
      attempts: r.guesses.length,
      hints: r.hints ? r.hints.length : 0,
      seconds: this.E.elapsedSeconds(r, r.endedAt),
      score: r.score,
      firstTry: r.guesses.length === 1,
      stored: stored,
      best: best,
      newBest: newBest,
      allTime: this.users.allTimeBest(),
      newAllTime: stored && r.score.total > (previous ? previous.best : 0)
    });
    this.state = 'roundEnd';
    this._state();
  };

  /* ---------------------------------------------------------- hints --- */
  /** What a hint would be now: { ok, used, left, next, tries, paidHints } (ok false when no game is running). */
  P.hintInfo = function () {
    var r = this.round;
    if (this.state !== 'playing' || !r || r.status !== 'active') return { ok: false, used: 0, left: 0, next: 0, tries: 0, paidHints: 0 };
    var used = r.hints ? r.hints.length : 0;
    return { ok: true, used: used, left: this.E.hintsLeft(r), next: used + 1, tries: r.guesses.length, paidHints: r.paidHints || 0 };
  };

  /**
   * Shows one more digit of the secret, at a random place the player has not found yet. Paying
   * for it (credits) is settled by the screen before this is called; opts: { paid: true when
   * it was paid with bought or earned credits (the next such hint of this game costs more),
   * cost }. Returns { ok: true, index, ch, number } or { ok: false, reason }.
   */
  P.hint = function (opts) {
    opts = opts || {};
    var info = this.hintInfo();
    if (!info.ok) return { ok: false, reason: 'state' };
    if (info.left < 1) { this._warn('noHint'); return { ok: false, reason: 'none' }; }
    var h = this.E.applyHint(this.round, this.random);
    if (opts.paid) this.round.paidHints = (this.round.paidHints || 0) + 1;
    this.emit({ type: 'hint', index: h.index, ch: h.ch, number: h.number, length: this.round.length,
      pattern: this.E.hintPattern(this.round), cost: opts.cost || 0 });
    this._state();
    return { ok: true, index: h.index, ch: h.ch, number: h.number };
  };

  /** Gives up without seeing the answer: this game ends with no score and a new one starts. */
  P.giveUp = function () {
    if (this.state !== 'playing' || !this.round) return false;
    if (this.daily) return this.reveal();            // the daily puzzle simply ends
    this._abandon();
    return this._newRound();
  };

  /** Reveal ends the round with a score of zero (FR-GAME-014, FR-SCORE-005). */
  P.reveal = function () {
    if (this.state !== 'playing' || !this.round) return false;
    this.E.revealRound(this.round, this.now());
    this._result(false);
    this.emit({ type: 'reveal', word: this.round.secret, length: this.round.length, daily: this.round.daily || null });
    this.state = 'roundEnd';
    this._state();
    return true;
  };

  /** The Reveal Number / New Game button (FR-FLOW-007). */
  P.revealOrNewGame = function () {
    if (this.state === 'locked') { this._ui('paywall'); return false; }
    if (this.state === 'playing') return this.reveal();
    if (this.state === 'roundEnd') {
      if (this.daily) { this._ui('leaveDaily'); return false; }   // after the daily puzzle: a normal game
      return this._newRound();
    }
    return false;
  };

  /* ---------------------------------------------------------- users --- */
  P._setUser = function (u) {
    this.user = u;
    this.emit({ type: 'user', user: u, log: false });
    this._state();
  };

  /**
   * Logs in an existing user (case-insensitive). The current round carries on.
   * Returns { ok: true, user } or { ok: false, reason: 'empty'|'invalid'|'reserved'|'unknown', name }.
   */
  P.login = function (name) {
    var n = String(name == null ? '' : name).normalize('NFC').trim();
    if (!n) return { ok: false, reason: 'empty' };
    var low = n.toLowerCase();
    if (ANON_WORDS.indexOf(low) !== -1) { this.logout(); return { ok: true, user: this.user }; }
    var found = this.users.find(n);
    if (found) {
      this._setUser({ mode: 'registered', name: found.name });
      this._info('loggedIn', { name: found.name, best: found.best });
      return { ok: true, user: this.user };
    }
    var problem = this.S.validateUsername(n);
    if (problem) return { ok: false, reason: problem, name: n };
    return { ok: false, reason: 'unknown', name: n };
  };

  /** Creates a new user and logs it in. Returns { ok } or { ok: false, reason, name }. */
  P.register = function (name) {
    var n = String(name == null ? '' : name).normalize('NFC').trim();
    if (!n) return { ok: false, reason: 'empty' };
    var problem = this.S.validateUsername(n);
    if (problem) return { ok: false, reason: problem, name: n };
    var existing = this.users.find(n);
    if (existing) return { ok: false, reason: 'exists', name: existing.name };
    var u = this.users.create(n);
    this._setUser({ mode: 'registered', name: u.name });
    this._info('registered', { name: u.name });
    return { ok: true, user: this.user };
  };

  /** No-data mode: neither a name nor a score is saved (FR-USER-004). */
  P.playWithoutSaving = function () {
    this._setUser({ mode: 'nodata', name: null });
    this._info('noData');
  };

  /** Back to the shared Anonymous profile. */
  P.logout = function () {
    this._setUser(this._anonymous());
    this._info('anonymous');
  };

  /* ---------------------------------------------------- mode changes --- */
  P._roundInProgress = function () {
    return this.state === 'playing' && this.round && (this.round.guesses.length > 0 || (this.round.hints || []).length > 0);
  };

  /**
   * Returns 'noop' | 'confirm' | 'ok'. 'confirm' means: ask the player, then call
   * again with {confirmed:true}.
   */
  P.setLength = function (length, opts) {
    if (this.daily) return 'daily';                  // the daily puzzle has its own length
    if (this.E.LENGTHS.indexOf(length) === -1 || length === this.length) return 'noop';
    if (this._roundInProgress() && !(opts && opts.confirmed)) return 'confirm';
    this.length = length;
    // No game in progress (or the player confirmed): start one with the new length at once.
    this._abandon();
    this._newRound();
    return 'ok';
  };

  /** Next length in the 4 -> 5 -> 6 -> 7 -> 8 -> 4 cycle. */
  P.nextLength = function () {
    var L = this.E.LENGTHS;
    return L[(L.indexOf(this.length) + 1) % L.length];
  };

  /**
   * Switches the language of all texts. Numbers are the same in every language, so the
   * current game simply carries on (nothing to confirm). Returns 'noop' | 'ok'.
   */
  P.setLanguage = function (lang) {
    if (LANGS.indexOf(lang) === -1) return 'noop';
    if (lang === this.lang) return 'noop';
    this.lang = lang;
    if (this.round) this.round.lang = lang;
    this._state();
    return 'ok';
  };

  /* ----------------------------------------------------------- quit --- */
  P.quit = function () {
    this._abandon();
    this.state = 'goodbye';
    this.emit({ type: 'goodbye', log: false });
    this._state();
  };

  P.cancelQuit = function () { /* nothing to undo: the game simply carries on */ };

  /* --------------------------------------------------------- status --- */
  P.inputMode = function () {
    if (this.state === 'playing') return 'play';
    if (this.state === 'roundEnd') return 'yesno';
    if (this.state === 'locked') return 'locked';
    return 'none';
  };

  P.getStatus = function () {
    var r = this.round;
    return {
      state: this.state,
      lang: this.lang,
      length: this.length,
      roundLength: r ? r.length : this.length,
      user: this.user,
      attempts: r ? r.guesses.length : 0,
      elapsed: r ? this.E.elapsedSeconds(r, this.now()) : 0,
      clockRunning: !!(r && r.status === 'active' && this.state === 'playing'),
      canReveal: this.state === 'playing',
      canNewGame: this.state === 'roundEnd',
      locked: this.state === 'locked',
      daily: this.daily ? this.daily.n : null,
      inputMode: this.inputMode()
    };
  };

  /* ------------------------------------------------- daily puzzle --- */
  /** A round of the daily puzzle: no access check (always free, on top of the free game). */
  P._dailyRound = function () {
    var d = this.daily;
    this.round = this.E.createRound(d.secret, d.length, this.lang, this.now());
    this.round.daily = d.n;
    this.rounds += 1;
    this.state = 'playing';
    this.history = [];
    this.emit({ type: 'round', length: d.length, lang: this.lang, number: this.rounds, daily: d.n });
    this._state();
    return true;
  };

  /**
   * Plays the daily puzzle d = { n, secret, length } instead of random games. saved: what the
   * phone kept of today's puzzle ({ round, history }), so a started puzzle carries on and a
   * finished one shows its result again - there is no second try.
   */
  P.startDaily = function (d, saved) {
    this.daily = { n: d.n, secret: d.secret, length: d.length };
    if (!this.user) this.user = this._startUser();
    if (saved && saved.round && saved.round.daily === d.n && Array.isArray(saved.history)) {
      this.round = saved.round;
      this.history = saved.history.slice(-200);
      var seq = this.seq;
      this.history.forEach(function (e) { seq = Math.max(seq, e.id || 0); });
      this.seq = seq;
      this.state = saved.round.status === 'active' ? 'playing' : 'roundEnd';
      this._state();
      return true;
    }
    return this._dailyRound();
  };

  /** What the phone keeps of the daily puzzle (null outside it). */
  P.dailyState = function () {
    if (!this.daily || !this.round || this.round.daily !== this.daily.n) return null;
    return { n: this.daily.n, lang: this.lang, length: this.round.length, round: this.round, history: this.history,
      done: this.round.status !== 'active', won: this.round.status === 'won' };
  };

  /* -------------------------------------------- resumable session --- */
  P.snapshot = function () {
    return {
      v: 2,
      savedAt: this.now(),
      state: this.state,
      lang: this.lang,
      length: this.length,
      user: this.user,
      round: this.round,
      rounds: this.rounds,
      history: this.history
    };
  };

  /** Restores a snapshot taken before the page was backgrounded/reloaded (NFR-010). */
  P.restore = function (snap, maxAgeMs) {
    if (!snap || snap.v !== 2 || STATES.indexOf(snap.state) === -1) return false;
    if (snap.state === 'goodbye' || snap.state === 'boot' || snap.state === 'locked') return false;
    if (maxAgeMs && this.now() - (snap.savedAt || 0) > maxAgeMs) return false;
    if (snap.state === 'playing' && (!snap.round || snap.round.status !== 'active')) return false;
    var u = snap.user;
    this.state = snap.state;
    this.lang = LANGS.indexOf(snap.lang) !== -1 ? snap.lang : 'en';
    this.length = this.E.LENGTHS.indexOf(snap.length) !== -1 ? snap.length : 4;
    this.user = (u && (u.mode === 'registered' || u.mode === 'nodata' || u.mode === 'anonymous')) ? u : this._anonymous();
    if (this.initialUser) this.user = this._startUser();     // a user chosen in the other game wins
    this.round = snap.round || null;
    this.rounds = snap.rounds || 0;
    this.history = Array.isArray(snap.history) ? snap.history.slice(-200) : [];
    this.seq = this.history.reduce(function (m, e) { return Math.max(m, e.id || 0); }, 0);
    this._info('restored');
    this._state();
    return true;
  };

  return { GameController: GameController, STATES: STATES };
});

