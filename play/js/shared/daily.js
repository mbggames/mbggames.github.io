/*!
 * MBG Puzzles - the daily puzzles (no screen code in this file).
 *
 * Every day there is one number of the day (Codebreaker, 4 digits) and one word of the day per
 * language (Word Puzzle, 5 letters; Arabic 4). Everybody gets the same puzzle on the same day:
 * the phone works it out from the date, without asking a server.
 *  - A new day starts at midnight on the player's phone (local time). Puzzle no. 1 was
 *    1 October 2026; the number of today's puzzle is shown with it (#12 ...).
 *  - The number of a day comes from a fixed formula, the word of a day from the fixed list in
 *    js/app/daily-words.js. Neither may ever change for a past day.
 *  - Each daily puzzle can be played once. It is free for everyone, also in the paid edition,
 *    and does not use the free game of the day.
 *  - What a player did with today's puzzles (the board, solved or not) is kept on the phone, so
 *    closing the app does not give a second try.
 *  - Reward: a solved puzzle of the day gives REWARD hint credits, once per game and day (also
 *    playing as Anonymous); days in a row give a bonus at 3, 7, 14 and 30 days, then every 30.
 *
 * Runs in the browser (window.MBG.Daily) and in Node.js (require) for the tests.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Daily = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  var START = '2026-10-01';
  var EPOCH = Date.UTC(2026, 9, 1);          // puzzle no. 1
  var CODE_LENGTH = 4;
  var KEY = 'MBG.App.daily';
  var KEEP_DAYS = 800;                       // results kept for the daily streaks
  var REWARD = 2;                            // hint credits for a solved puzzle of the day
  var BONUS = [[3, 3], [7, 7], [14, 14], [30, 30]];   // [days in a row, bonus credits]; then +30 every 30 days

  /** Bonus credits for reaching a streak of `days` (0 when that day is no milestone). */
  function streakBonus(days) {
    for (var i = 0; i < BONUS.length; i++) if (BONUS[i][0] === days) return BONUS[i][1];
    return days > 30 && days % 30 === 0 ? 30 : 0;
  }
  /** The next milestone after a streak of `days`: { days, credits }. */
  function nextBonus(days) {
    for (var i = 0; i < BONUS.length; i++) if (BONUS[i][0] > days) return { days: BONUS[i][0], credits: BONUS[i][1] };
    return { days: (Math.floor(days / 30) + 1) * 30, credits: 30 };
  }

  /** The number of the day's puzzle on the phone's own calendar (local midnight to midnight). */
  function dayNumber(date) {
    var d = date instanceof Date ? date : new Date(date == null ? Date.now() : date);
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / DAY) + 1;
  }
  /** Milliseconds until the next puzzle (the phone's next midnight). */
  function msUntilNext(now) {
    var d = new Date(now == null ? Date.now() : now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime();
  }
  /** The server's idea of the puzzle number (UTC); a phone may be a day ahead or behind. */
  function utcDayNumber(ms) { return Math.floor(((ms == null ? Date.now() : ms) - EPOCH) / DAY) + 1; }

  function wordLength(lang) { return lang === 'ar' ? 4 : 5; }

  /** Small seeded generator (mulberry32). */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /** The number of the day n: 4 digits (they may repeat), the same on every phone, forever. */
  function codeFor(n) {
    var r = rng(Math.imul(n | 0, 2654435761) ^ 0x4D424750);
    r(); r();                                  // the first values of a fresh seed are less mixed
    var s = '';
    for (var i = 0; i < CODE_LENGTH; i++) s += String(Math.floor(r() * 10));
    return s;
  }

  var lists = {};
  function wordList(lang, table) {
    table = table || (root.MBG && root.MBG.DailyWords) || {};
    if (!lists[lang] || lists[lang].src !== table[lang]) {
      lists[lang] = { src: table[lang], words: String(table[lang] || '').split(/\s+/).filter(Boolean) };
    }
    return lists[lang].words;
  }
  /** The word of the day n in a language (null when the list is missing). After the list's last
   *  day it starts again from the top. */
  function wordFor(lang, n, table) {
    var w = wordList(lang, table);
    if (!w.length) return null;
    var i = ((n - 1) % w.length + w.length) % w.length;
    return w[i];
  }

  /** "game:lang" key of a daily puzzle: 'codebreaker' or 'word:en'. */
  function slot(game, lang) { return game === 'word' ? 'word:' + lang : game; }

  /* ------------------------------------------------------------ the store --- */
  // { v: 1, cur: { slot: { n, lang, length, round, history, done, won } },
  //   hist: { codebreaker: { n: 1 (solved) | 0 (not solved) }, word: { n: 1 | 0 } } }
  function DailyStore(storage, key, now) {
    this.storage = storage;
    this.key = key || KEY;
    this.now = now || function () { return Date.now(); };
    this.load();
  }
  var P = DailyStore.prototype;
  P.load = function () {
    var d = null;
    try { d = JSON.parse(this.storage.getItem(this.key) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (!d.cur || typeof d.cur !== 'object') d.cur = {};
    if (!d.hist || typeof d.hist !== 'object') d.hist = {};
    d.v = 1;
    this.data = d;
    return this;
  };
  P.save = function () {
    try { this.storage.setItem(this.key, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  };
  P.today = function () { return dayNumber(this.now()); };
  /** What is saved for today's puzzle of a slot (null: not started today). */
  P.get = function (game, lang) {
    var e = this.data.cur[slot(game, lang)];
    return e && e.n === this.today() ? e : null;
  };
  P.put = function (game, lang, entry) {
    this.data.cur[slot(game, lang)] = entry;
    this.save();
  };
  /** Today's puzzle of that slot is over (solved or not). */
  P.isDone = function (game, lang) { var e = this.get(game, lang); return !!(e && e.done); };
  /** Records the result of puzzle n for the daily streak of a game. */
  P.finish = function (game, n, won) {
    var h = this.data.hist[game] = this.data.hist[game] || {};
    h[n] = Math.max(h[n] || 0, won ? 1 : 0);
    var keys = Object.keys(h);
    if (keys.length > KEEP_DAYS) keys.map(Number).sort(function (a, b) { return a - b; })
      .slice(0, keys.length - KEEP_DAYS).forEach(function (k) { delete h[k]; });
    this.save();
  };
  /**
   * Daily streak of a game: days in a row with the puzzle solved, up to today (or up to
   * yesterday while today's puzzle is still open). { cur, best, solved, played }
   */
  P.streak = function (game) {
    var h = this.data.hist[game] || {};
    var today = this.today();
    var cur = 0, d = h[today] === 1 ? today : today - 1;
    while (h[d] === 1) { cur++; d--; }
    var best = 0, run = 0, prev = null, solved = 0, played = 0;
    Object.keys(h).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      played++;
      if (h[n] === 1) { solved++; run = prev === n - 1 && run > 0 ? run + 1 : 1; best = Math.max(best, run); }
      else run = 0;
      prev = n;
    });
    return { cur: cur, best: Math.max(best, cur), solved: solved, played: played };
  };

  /** True once per game and puzzle: the reward of puzzle n of that game is collected now. */
  P.claim = function (game, n) {
    var rw = this.data.rw = this.data.rw && typeof this.data.rw === 'object' ? this.data.rw : {};
    var list = rw[game] = Array.isArray(rw[game]) ? rw[game] : [];
    if (list.indexOf(n) !== -1) return false;
    list.push(n);
    rw[game] = list.slice(-60);
    this.save();
    return true;
  };

  /** Adds the results of another phone ("Move to a new phone"); a solved day wins. */
  P.mergeData = function (other) {
    if (!other || typeof other !== 'object') return 0;
    var self = this, n = 0;
    var oh = other.hist && typeof other.hist === 'object' ? other.hist : {};
    Object.keys(oh).forEach(function (game) {
      var h = self.data.hist[game] = self.data.hist[game] || {};
      Object.keys(oh[game] || {}).forEach(function (k) {
        var v = oh[game][k] ? 1 : 0;
        if (h[k] == null || v > h[k]) { h[k] = v; n++; }
      });
    });
    var orw = other.rw && typeof other.rw === 'object' ? other.rw : {};
    Object.keys(orw).forEach(function (game) {
      if (!Array.isArray(orw[game])) return;
      var mine = self.data.rw = self.data.rw || {};
      var list = Array.isArray(mine[game]) ? mine[game] : [];
      orw[game].forEach(function (n) { if (typeof n === 'number' && list.indexOf(n) === -1) { list.push(n); } });
      mine[game] = list.sort(function (a, b) { return a - b; }).slice(-60);
    });
    var oc = other.cur && typeof other.cur === 'object' ? other.cur : {};
    Object.keys(oc).forEach(function (s) {
      var e = oc[s], mine = self.data.cur[s];
      if (!e || typeof e.n !== 'number') return;
      if (!mine || e.n > mine.n || (e.n === mine.n && e.done && !mine.done)) { self.data.cur[s] = e; n++; }
    });
    if (n) this.save();
    return n;
  };

  /* -------------------------------------------------------- sharing --- */
  var EMOJI = { O: '🟩', '?': '🟨', X: '⬛' };    // 🟩 🟨 ⬛
  function clock(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  /**
   * The tries of a result as coloured squares, one line per try (no letters or digits, so a
   * friend can still play the same puzzle). rows: [['O','?','X', ...], ...]. The message
   * around them (in the player's language) is made by MBG.Sheets.dailyMessage.
   */
  function grid(rows) {
    return (rows || []).map(function (r) { return r.map(function (f) { return EMOJI[f] || EMOJI.X; }).join(''); });
  }

  return {
    DAY: DAY, START: START, EPOCH: EPOCH, CODE_LENGTH: CODE_LENGTH, KEY: KEY,
    dayNumber: dayNumber, msUntilNext: msUntilNext, utcDayNumber: utcDayNumber,
    wordLength: wordLength, codeFor: codeFor, wordFor: wordFor, wordList: wordList, slot: slot,
    DailyStore: DailyStore, grid: grid, clock: clock,
    REWARD: REWARD, BONUS: BONUS, streakBonus: streakBonus, nextBonus: nextBonus
  };
});
