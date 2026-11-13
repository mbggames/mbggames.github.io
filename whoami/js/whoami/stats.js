/*!
 * MBG Who Am I? - statistics on this device, per player (Anonymous counts as one), as in MBG
 * Puzzles: matches played, won, drawn, rounds solved, average questions of a solved round,
 * best round score, streak of won matches - for all four question words and per category.
 * Practice against the computer never changes the official rating (section 15). It has its own
 * PRACTICE RATING here, with the same Glicko-2 (start 1,000): a win raises it, a loss lowers it -
 * more against a stronger computer, less against a weaker one. The computer levels count as fixed
 * players of 800, 1,100, 1,400 and 1,700.
 * The device's Hall of Fame: the 20 best rounds played on this device (every player of it).
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var KEY = 'MBG.Who.stats';
  var RECENT = 'MBG.Who.recent';
  var HOF = 'MBG.Who.hof';
  var BOT_RATING = { beginner: 800, intermediate: 1100, advanced: 1400, expert: 1700 };

  function who() { var u = MBG.Shell.getUser(); return u.name ? u.name.toLowerCase() : '~anon'; }
  function all() { return MBG.Shell.readJson(KEY, {}); }
  function blank() { return { played: 0, won: 0, drawn: 0, rounds: 0, solved: 0, questions: 0, best: 0, total: 0, streak: 0, bestStreak: 0, byMode: {}, byCat: {}, last: 0 }; }
  function mine() { var a = all(); return a[who()] || blank(); }

  /** After a match: me = my player id in the view; botLevel for a match against the computer.
   *  Returns the statistics, plus { practice: { before, after, delta }, newBest, hof } for the result sheet. */
  function record(view, me, botLevel) {
    var a = all(), k = who(), s = a[k] || blank();
    var bestBefore = s.best || 0, out = {};
    var res = view.result || {};
    s.played += 1;
    if (res.winner === me) { s.won += 1; s.streak += 1; s.bestStreak = Math.max(s.bestStreak, s.streak); }
    else { if (res.draw) s.drawn += 1; s.streak = 0; }
    view.rounds.forEach(function (r) {
      if (r.guesser !== me) return;
      s.rounds += 1;
      if (r.score && r.score.won) { s.solved += 1; s.questions += r.used; s.best = Math.max(s.best, r.score.total); s.total += r.score.total; }
    });
    var m = s.byMode[view.mode] = s.byMode[view.mode] || { played: 0, won: 0 };
    m.played += 1; if (res.winner === me) m.won += 1;
    var c = s.byCat[view.cat] = s.byCat[view.cat] || { played: 0, won: 0 };
    c.played += 1; if (res.winner === me) c.won += 1;
    // the practice rating (only against the computer)
    if (view.vsComputer && MBG.Glicko2) {
      var pr = s.practice || { rating: 1000, rd: 200, vol: 0.06, games: 0, best: 1000 };   // RD 200: steadier first games than 350
      var score = res.draw ? 0.5 : res.winner === me ? 1 : 0;
      var bot = { rating: BOT_RATING[botLevel] || 1100, rd: 60 };
      var nr = MBG.Glicko2.update(pr, [{ rating: bot.rating, rd: bot.rd, score: score }]);
      out.practice = { before: Math.round(pr.rating), after: Math.round(nr.rating), delta: Math.round(nr.rating) - Math.round(pr.rating), provisional: nr.rd > 110 };
      s.practice = { rating: nr.rating, rd: nr.rd, vol: nr.vol, games: (pr.games || 0) + 1, best: Math.max(pr.best || 1000, nr.rating) };
      out.practiceRecord = nr.rating > (pr.best || 1000) && pr.games >= 3;
    }
    out.newBest = s.best > bestBefore && bestBefore > 0;
    // the device's Hall of Fame (best rounds)
    var list = MBG.Shell.readJson(HOF, []), name = MBG.Shell.playerName();
    view.rounds.forEach(function (r) {
      if (r.guesser !== me || !r.score || !r.score.won || !r.answer) return;
      list.push({ name: name, score: r.score.total, answer: MBG.WhoText.labelIn(r.answer, view.lang), mode: view.mode, level: view.level, used: r.used, at: Date.now() });
    });
    list.sort(function (x, y) { return y.score - x.score || x.at - y.at; });
    list = list.slice(0, 20);
    var place = -1;
    list.forEach(function (e, i) { if (place === -1 && e.name === name && Date.now() - e.at < 5000) place = i + 1; });
    out.hof = place;
    MBG.Shell.writeJson(HOF, list);
    s.last = Date.now();
    s.name = MBG.Shell.playerName();
    a[k] = s;
    MBG.Shell.writeJson(KEY, a);
    var ret = {};
    for (var x in s) ret[x] = s[x];
    for (var y in out) ret[y] = out[y];        // the change of this match wins over the stored rating
    return ret;
  }
  function hallOfFame() { return MBG.Shell.readJson(HOF, []); }
  function practiceOf() { return mine().practice || null; }
  /** The practice ratings of every player of this device, best first. */
  function practiceAll() {
    var a = all(), out = [];
    Object.keys(a).forEach(function (k) {
      var p = a[k].practice;
      if (p && p.games) out.push({ name: k === '~anon' ? MBG.Shell.t('welcome.anonName') : a[k].name || k, rating: p.rating, games: p.games });
    });
    return out.sort(function (x, y) { return y.rating - x.rating; }).slice(0, 20);
  }
  function totalMatches() { var a = all(), n = 0; Object.keys(a).forEach(function (k) { n += a[k].played || 0; }); return n; }

  /** The answers of the last matches are not used again soon (FR section 6.1). */
  function recent() { return MBG.Shell.readJson(RECENT, []); }
  function used(ids) { var r = ids.concat(recent()).filter(function (x, i, l) { return l.indexOf(x) === i; }).slice(0, 150); MBG.Shell.writeJson(RECENT, r); }

  MBG.WhoStats = { mine: mine, record: record, hallOfFame: hallOfFame, practiceOf: practiceOf, practiceAll: practiceAll, BOT_RATING: BOT_RATING, totalMatches: totalMatches, recent: recent, used: used };
})(typeof self !== 'undefined' ? self : globalThis);
