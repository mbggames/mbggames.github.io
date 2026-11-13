/*!
 * MBG Who Am I? - the puzzles of the day (0.9.9).
 *
 * Every day there are four puzzles: Who am I? · What am I? · Where am I? · When am I? of the day.
 * A puzzle of the day is the same for everyone in the world who plays in the same language: the
 * same hidden answer, the same level, the same time, questions and wrong guesses, and the same
 * computer. It is a normal match against the computer (two rounds: you guess the answer of the
 * day, then the computer guesses one), without hints or power-ups, free in every edition. The
 * first score of the day - your guessing round - goes on the leaderboard of the day (Top 20);
 * playing it again is allowed, but you know the answer then, so a replay does not count.
 *
 *  - The day changes at 00:00 UTC (01:00 in Central Europe in winter, 02:00 in summer).
 *  - The answers come from the built-in cards (deck.js): verified facts, the same on every phone
 *    and offline too. Each language has its own order; within a question word no answer comes back
 *    before all the others have been the answer of the day.
 *  - The level is the level of the day's answer (how famous it is: Easy … Expert); the time, the
 *    questions, the wrong guesses and the computer's level are drawn for the day.
 *  - The front page shows one of the four, drawn for the day ("featured").
 *
 * The same file runs in the app and on the server (which checks what is sent to the leaderboard).
 */
(function (root, factory) {
  // literal require() calls, so a bundler (esbuild, for the server) finds the files
  var M = root.MBG || {}, R = typeof require === 'function';
  var api = factory(M.WhoText || (R ? require('./text.js') : null), M.WhoCats || (R ? require('./categories.js') : null),
    M.WhoDeck || (R ? require('./deck.js') : null), M.WhoDiscovery || (R ? require('./discovery.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoDaily = api;
})(typeof self !== 'undefined' ? self : globalThis, function (X, C, D, Dsc) {
  'use strict';
  var DAY = 864e5;
  var LANGS = ['en', 'sq', 'de', 'bs'];
  var SALT = 'mbg-daily-1';
  // what a day may draw (from the match rules a player can choose; never the 10-minute round or 5 wrong guesses)
  var DRAW = {
    time: [60, 120, 180, 180, 300],
    questions: [8, 12, 12, 16, 20],
    guesses: [1, 2, 2, 3],
    botLevel: ['beginner', 'intermediate', 'advanced', 'expert']
  };

  /** FNV-1a: a short text → a 32-bit seed. */
  function hash(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function dayOf(now) { return Math.floor((now == null ? Date.now() : now) / DAY); }
  /** "2026-11-09" for a day number (UTC). */
  function dateOf(day) { return new Date(day * DAY).toISOString().slice(0, 10); }
  function dayOfDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY) : NaN; }
  /** When the next puzzles come (ms). */
  function nextAt(now) { return (dayOf(now) + 1) * DAY; }

  // the cards of a question word, in a fixed order (by id), so every phone starts from the same list
  var cards = {};
  function cardsOf(mode) {
    if (!cards[mode]) {
      cards[mode] = Dsc.deckPool({ mode: mode, period: 'any', region: 'any' }).slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    }
    return cards[mode];
  }
  // The puzzles count from this day (1 November 2026).
  var EPOCH = Math.floor(Date.UTC(2026, 10, 1) / DAY);
  /**
   * The order of the cards in one pass through them. Each pass is shuffled again, but the cards of
   * the first half of the last pass stay in the first half (and the second in the second), so an
   * answer never comes back within half a pass - however the passes meet.
   */
  var orders = {};
  function orderOf(mode, lang, pass) {
    var key = mode + '|' + lang;
    var memo = orders[key] = orders[key] || [];
    if (memo[pass]) return memo[pass];
    var list = cardsOf(mode), n = list.length, h = Math.floor(n / 2), start = memo.length;
    if (!start) { memo[0] = X.shuffle(list, X.rng(hash(SALT + '|order|' + key + '|0'))); start = 1; }
    for (var p = start; p <= pass; p++) {
      var prev = memo[p - 1], r = X.rng(hash(SALT + '|order|' + key + '|' + p));
      memo[p] = X.shuffle(prev.slice(0, h), r).concat(X.shuffle(prev.slice(h), r));
    }
    return memo[pass];
  }
  /** The answer of the day number `day` of a question word in a language. */
  function nth(mode, lang, day) {
    var list = cardsOf(mode), n = list.length;
    if (!n) return null;
    var k = Math.max(0, day - EPOCH);
    return orderOf(mode, lang, Math.floor(k / n))[k % n];
  }
  function draw(list, r) { return list[Math.floor(r() * list.length)]; }

  /**
   * The puzzle of the day of a question word in a language.
   * → { id: '2026-11-09.who.en', day, date, mode, lang, level, time, questions, guesses, rounds: 2,
   *     botLevel, answer (the card you guess), other (the card the computer guesses), cat }
   */
  function puzzle(mode, lang, now) {
    if (C.MODE_ORDER.indexOf(mode) === -1) mode = 'who';
    if (LANGS.indexOf(lang) === -1) lang = 'en';
    var day = typeof now === 'object' && now && now.day != null ? now.day : dayOf(now);
    var answer = nth(mode, lang, day);
    if (!answer) return null;
    // the computer's card: another one from the same question word, also the same for everyone
    var list = cardsOf(mode), other = null;
    var r2 = X.rng(hash(SALT + '|other|' + mode + '|' + lang + '|' + day));
    for (var i = 0; i < 6 && (!other || other.id === answer.id); i++) other = draw(list, r2);
    if (!other || other.id === answer.id) other = list[(list.indexOf(answer) + 1) % list.length];
    var r = X.rng(hash(SALT + '|rules|' + mode + '|' + lang + '|' + day));
    var date = dateOf(day);
    return {
      id: date + '.' + mode + '.' + lang, day: day, date: date, mode: mode, lang: lang,
      level: C.LEVEL_ORDER[Math.max(0, Math.min(3, (answer.level || 1) - 1))],
      time: draw(DRAW.time, r), questions: draw(DRAW.questions, r), guesses: draw(DRAW.guesses, r), rounds: 2,
      botLevel: draw(DRAW.botLevel, r),
      answer: answer, other: other, cat: answer.cat
    };
  }
  /** All four puzzles of the day in a language. */
  function today(lang, now) { return C.MODE_ORDER.map(function (m) { return puzzle(m, lang, now); }); }
  /** The question word shown on the front page today (drawn for the day, the same for everyone). */
  function featured(lang, now) {
    var day = dayOf(now);
    var r = X.rng(hash(SALT + '|featured|' + (LANGS.indexOf(lang) === -1 ? 'en' : lang) + '|' + day));
    var m = draw(C.MODE_ORDER, r);
    // not the same question word two days in a row
    var r0 = X.rng(hash(SALT + '|featured|' + (LANGS.indexOf(lang) === -1 ? 'en' : lang) + '|' + (day - 1)));
    var y = draw(C.MODE_ORDER, r0);
    if (m === y) m = C.MODE_ORDER[(C.MODE_ORDER.indexOf(m) + 1 + Math.floor(r() * 3)) % 4];
    return m;
  }
  /** A setup for the match (setup.js / transport.js): a normal match against the computer, marked as the puzzle of the day. */
  function setupFor(p) {
    return { mode: p.mode, cat: null, subs: [], lang: p.lang, level: p.level, period: 'any', region: 'any',
      opponent: 'computer', botLevel: p.botLevel, ranked: false, margin: 150, access: 'closed',
      time: p.time, questions: p.questions, guesses: p.guesses, rounds: 2, langAt: Date.now(),
      daily: { id: p.id, day: p.day, mode: p.mode, lang: p.lang } };
  }
  /** The match of a daily setup (transport.js): the two cards of the day and the cards of its question word for the computer. */
  function matchFor(setup) {
    var d = setup && setup.daily;
    if (!d) return null;
    var p = puzzle(d.mode, d.lang, { day: d.day });
    if (!p || p.id !== d.id) return null;
    return { answers: [p.answer, p.other], pool: cardsOf(p.mode).slice(), cat: p.cat, source: 'deck', widened: false, failed: false, enough: true, daily: p };
  }
  /** Checks a puzzle id ('2026-11-09.who.en'); late finishers may send it until the end of the next day. */
  function validId(id, now) {
    var m = /^(\d{4}-\d{2}-\d{2})\.(who|what|where|when)\.(en|sq|de|bs)$/.exec(String(id || ''));
    if (!m) return false;
    var d = dayOfDate(m[1]), t = dayOf(now);
    return d === t || d === t - 1;
  }
  function parseId(id) {
    var m = /^(\d{4}-\d{2}-\d{2})\.(who|what|where|when)\.(en|sq|de|bs)$/.exec(String(id || ''));
    return m ? { date: m[1], day: dayOfDate(m[1]), mode: m[2], lang: m[3] } : null;
  }

  /* ---------------------------------------------------- on this device --- */
  // The scores of the puzzles of the day on this phone or computer (browser storage): the first
  // try of each player, and the best one. Kept 40 days. On the server the leaderboard is shared.
  var LOG = 'MBG.Who.dailyLog';
  function store() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }
  function readLog() { var s = store(); if (!s) return {}; try { return JSON.parse(s.getItem(LOG) || '{}') || {}; } catch (e) { return {}; } }
  function writeLog(log) {
    var s = store(); if (!s) return;
    var keep = dayOf() - 40;
    Object.keys(log).forEach(function (id) { var p = parseId(id); if (!p || p.day < keep) delete log[id]; });
    try { s.setItem(LOG, JSON.stringify(log)); } catch (e) { /* full */ }
  }
  function playerKey(name) { return String(name || '').trim().toLowerCase(); }
  /**
   * Records a finished puzzle of the day for a player (by name on this device).
   * e: { name, score, won, used, wrong, secs }
   * → { first: true when this is the try that counts, entry: the counted try, best, plays, place, of }
   */
  function record(id, e) {
    var log = readLog(), L = log[id] = log[id] || { players: {} };
    var k = playerKey(e.name), p = L.players[k];
    var entry = { name: String(e.name || '').slice(0, 40), score: Math.max(0, Math.round(e.score) || 0), won: !!e.won, used: e.used || 0, wrong: e.wrong || 0, secs: e.secs || 0, at: e.at || Date.now() };
    var first = !p;
    if (first) p = L.players[k] = { first: entry, best: entry.score, plays: 0 };
    p.plays++;
    p.best = Math.max(p.best || 0, entry.score);
    writeLog(log);
    var b = board(id), mine = b.filter(function (x) { return playerKey(x.name) === k; })[0];
    return { first: first, entry: p.first, best: p.best, plays: p.plays, place: mine ? mine.place : null, of: b.length };
  }
  /** The first try of a player (by name) - null if not played yet. */
  function mine(id, name) {
    var L = readLog()[id], p = L && L.players[playerKey(name)];
    return p ? { entry: p.first, best: p.best, plays: p.plays } : null;
  }
  /** The leaderboard of the day on this device: the first try of each player, best first (Top 20). */
  function board(id) {
    var L = readLog()[id];
    if (!L) return [];
    return Object.keys(L.players).map(function (k) { return L.players[k].first; })
      .sort(function (a, b) { return b.score - a.score || a.at - b.at; })
      .slice(0, 20).map(function (x, i) { return { place: i + 1, name: x.name, score: x.score, won: x.won, used: x.used, secs: x.secs, at: x.at }; });
  }

  return { DAY: DAY, DRAW: DRAW, hash: hash, dayOf: dayOf, dateOf: dateOf, nextAt: nextAt, puzzle: puzzle, today: today, featured: featured,
    setupFor: setupFor, matchFor: matchFor, validId: validId, parseId: parseId, cardsOf: cardsOf, record: record, mine: mine, board: board };
});
