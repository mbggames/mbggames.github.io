/*!
 * MBG Puzzles - statistics, kept on the phone (no screen code in this file).
 *
 * For every player name (Anonymous included; "play without saving" keeps nothing) and both games:
 * games played and won, the winning streak now and the best one, the tries of every win (for
 * the average and the chart), the fastest win. A game counts once it is over: won, or lost by
 * seeing the answer, giving up, or leaving an unfinished game for a new one after a first try.
 *
 * The numbers are kept per length (Codebreaker) or per language and length (Word Puzzle), so
 * the sheet can show "all", one length, one language or both. Streaks are counted for each of
 * those views on their own.
 *
 * Stored under MBG.App.stats:
 *   { v: 1, p: { nameKey: { name, g: { codebreaker: { b: { "4": rec }, s: { "": streak, "n:4": streak } },
 *                                     word: { b: { "en|5": rec }, s: { "", "l:en", "n:5", "en|5" } } } } } }
 *   rec = { p: played, w: won, t: tries of all wins, f: fastest win (seconds), d: { tries: wins } }
 *   streak = { c: current, b: best }
 * Runs in the browser (window.MBG.Stats) and in Node.js (require) for the tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Stats = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var KEY = 'MBG.App.stats';
  var GAMES = ['codebreaker', 'word'];

  function nameKey(name) { return String(name || '').normalize('NFC').trim().toLowerCase(); }
  function bucketKey(game, lang, length) { return game === 'word' ? lang + '|' + length : String(length); }
  /** The streak views a game result belongs to. */
  function streakKeys(game, lang, length) {
    return game === 'word' ? ['', 'l:' + lang, 'n:' + length, lang + '|' + length] : ['', 'n:' + length];
  }
  function newRec() { return { p: 0, w: 0, t: 0, f: null, d: {} }; }

  function StatsStore(storage, key) {
    this.storage = storage;
    this.key = key || KEY;
    this.load();
  }
  var P = StatsStore.prototype;

  P.load = function () {
    var d = null;
    try { d = JSON.parse(this.storage.getItem(this.key) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || !d.p || typeof d.p !== 'object') d = { v: 1, p: {} };
    this.data = d;
    return this;
  };
  P.save = function () {
    try { this.storage.setItem(this.key, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  };

  P._game = function (name, game, create) {
    var k = nameKey(name);
    var pl = this.data.p[k];
    if (!pl) {
      if (!create) return null;
      pl = this.data.p[k] = { name: String(name).normalize('NFC').trim(), g: {} };
    }
    var g = pl.g[game];
    if (!g) {
      if (!create) return null;
      g = pl.g[game] = { b: {}, s: {} };
    }
    return g;
  };

  /**
   * One game is over. r: { lang, length, won, tries, seconds }. Returns the summary of all
   * games of that kind afterwards (for the line under a win).
   */
  P.record = function (name, game, r) {
    if (!name || GAMES.indexOf(game) === -1 || !r || !r.length) return null;
    var g = this._game(name, game, true);
    var bk = bucketKey(game, r.lang, r.length);
    var rec = g.b[bk] = g.b[bk] || newRec();
    rec.p++;
    if (r.won) {
      var tries = Math.max(1, Math.round(r.tries || 1));
      rec.w++;
      rec.t += tries;
      rec.d[tries] = (rec.d[tries] || 0) + 1;
      var sec = Math.max(0, Math.round(r.seconds || 0));
      if (rec.f == null || sec < rec.f) rec.f = sec;
    }
    streakKeys(game, r.lang, r.length).forEach(function (sk) {
      var s = g.s[sk] = g.s[sk] || { c: 0, b: 0 };
      if (r.won) { s.c++; if (s.c > s.b) s.b = s.c; } else s.c = 0;
    });
    this.save();
    return this.summary(name, game, {});
  };

  /**
   * The numbers for one view. filter: { lang, length } (each optional; lang only for Word Puzzle).
   * { played, won, winPct, cur, best, avg, fastest, dist: { tries: wins } }
   */
  P.summary = function (name, game, filter) {
    filter = filter || {};
    var out = { played: 0, won: 0, winPct: 0, cur: 0, best: 0, avg: null, fastest: null, dist: {} };
    var g = this._game(name, game, false);
    if (!g) return out;
    var tries = 0;
    Object.keys(g.b).forEach(function (bk) {
      var lang = game === 'word' ? bk.split('|')[0] : '';
      var length = Number(game === 'word' ? bk.split('|')[1] : bk);
      if (filter.lang && lang !== filter.lang) return;
      if (filter.length && length !== filter.length) return;
      var rec = g.b[bk];
      out.played += rec.p;
      out.won += rec.w;
      tries += rec.t;
      if (rec.f != null && (out.fastest == null || rec.f < out.fastest)) out.fastest = rec.f;
      Object.keys(rec.d).forEach(function (n) { out.dist[n] = (out.dist[n] || 0) + rec.d[n]; });
    });
    out.winPct = out.played ? Math.round(100 * out.won / out.played) : 0;
    out.avg = out.won ? Math.round(10 * tries / out.won) / 10 : null;
    var sk = game === 'word'
      ? (filter.lang && filter.length ? filter.lang + '|' + filter.length : filter.lang ? 'l:' + filter.lang : filter.length ? 'n:' + filter.length : '')
      : (filter.length ? 'n:' + filter.length : '');
    var s = g.s[sk];
    if (s) { out.cur = s.c; out.best = s.b; }
    return out;
  };

  /** The languages and lengths a player has played (for the filters). */
  P.seen = function (name, game) {
    var g = this._game(name, game, false), langs = {}, lengths = {};
    if (g) Object.keys(g.b).forEach(function (bk) {
      if (game === 'word') { langs[bk.split('|')[0]] = 1; lengths[bk.split('|')[1]] = 1; } else lengths[bk] = 1;
    });
    return { langs: Object.keys(langs), lengths: Object.keys(lengths).map(Number).sort() };
  };

  /**
   * Rows for the tries chart: one row per number of tries from the fewest to the most; when that
   * is more than 10 rows, the last row holds "N or more". [{ label, n, plus }]
   */
  function chartRows(dist) {
    var keys = Object.keys(dist).map(Number).filter(function (n) { return dist[n] > 0; }).sort(function (a, b) { return a - b; });
    if (!keys.length) return [];
    var hi = keys[keys.length - 1];
    var lo = keys[0] <= 3 ? 1 : keys[0];             // short games start the chart at 1 try
    var rows = [];
    var last = Math.min(hi, lo + 9);
    for (var n = lo; n <= last; n++) {
      var plus = n === last && hi > last;
      var count = 0;
      if (plus) keys.forEach(function (k) { if (k >= n) count += dist[k]; }); else count = dist[n] || 0;
      rows.push({ label: n, n: count, plus: plus });
    }
    return rows;
  }

  /** All players and games: for moving to a new phone (the bigger record of each game wins). */
  P.exportData = function () { return JSON.parse(JSON.stringify(this.data)); };
  P.mergeData = function (other) {
    if (!other || typeof other !== 'object' || !other.p || typeof other.p !== 'object') return 0;
    var self = this, changed = 0;
    Object.keys(other.p).forEach(function (k) {
      var op = other.p[k];
      if (!op || typeof op !== 'object' || !op.g) return;
      var mine = self.data.p[k] = self.data.p[k] || { name: op.name || k, g: {} };
      GAMES.forEach(function (game) {
        var og = op.g[game];
        if (!og || !og.b) return;
        var count = function (g) { var n = 0; if (g && g.b) Object.keys(g.b).forEach(function (bk) { n += g.b[bk].p || 0; }); return n; };
        if (count(og) > count(mine.g[game])) { mine.g[game] = JSON.parse(JSON.stringify(og)); changed++; }
      });
    });
    if (changed) this.save();
    return changed;
  };

  return { KEY: KEY, StatsStore: StatsStore, chartRows: chartRows, nameKey: nameKey };
});
