/*!
 * MBG Games - Glicko-2 rating (section 13.2), shared by the server and the app.
 * Mark Glickman's Glicko-2 (glicko.net/glicko/glicko2.pdf), on MBG's scale: new players start
 * at 1,000 with a rating deviation (RD) of 350; a rating is provisional while its RD is above 110.
 * Each game keeps its own rating (FR-004) - ratings of different games are never combined.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Glicko2 = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var BASE = 1000, SCALE = 173.7178, TAU = 0.5, EPS = 0.000001;
  // 1.1.7 - MBG's gentle scale on top of Glicko-2:
  //  - a new rating starts steadier (RD 200, was 350: the first lost match cost about 160 points);
  //  - no match moves a rating by more than MAX_STEP points, up or down;
  //  - under SOFT (400) a loss shrinks with the rating itself (at 200 half of it, at 100 a quarter ...), so a
  //    rating comes ever closer to zero and never gets there: a weak player settles around 200-300, a very
  //    weak one around 50-100. Winning is never made smaller - the way up stays open;
  //  - never under MIN, whatever happened before (also for ratings saved by older versions).
  var START = { rating: BASE, rd: 200, vol: 0.06 };
  var PROVISIONAL_RD = 110, MIN_RD = 45, MAX_STEP = 40, SOFT = 400, MIN = 1;
  function gentle(before, after) {
    var from = Math.max(MIN, Number(before.rating) || MIN);
    var step = Math.max(-MAX_STEP, Math.min(MAX_STEP, after.rating - before.rating));
    if (step < 0 && from < SOFT) step *= from / SOFT;
    return { rating: Math.max(MIN, Math.round((from + step) * 10) / 10), rd: after.rd, vol: after.vol };
  }

  function g(phi) { return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI)); }
  function E(mu, muj, phij) { return 1 / (1 + Math.exp(-g(phij) * (mu - muj))); }

  /**
   * One rating period for a player. games: [{ rating, rd, score }] with score 1 win, 0.5 draw, 0 loss.
   * Returns { rating, rd, vol }.
   */
  function update(p, games) { return games && games.length ? gentle(p, glicko(p, games)) : glicko(p, games); }
  /** Glicko-2 itself, as in the paper (before MBG's gentle scale). */
  function glicko(p, games) {
    var mu = (p.rating - BASE) / SCALE, phi = p.rd / SCALE, sigma = p.vol;
    if (!games || !games.length) {
      var ph = Math.sqrt(phi * phi + sigma * sigma);
      return { rating: p.rating, rd: Math.min(350, ph * SCALE), vol: sigma };
    }
    var v = 0, d = 0;
    games.forEach(function (o) {
      var muj = (o.rating - BASE) / SCALE, phij = o.rd / SCALE, e = E(mu, muj, phij), gj = g(phij);
      v += gj * gj * e * (1 - e);
      d += gj * (o.score - e);
    });
    v = 1 / v;
    var delta = v * d;
    // the new volatility (Illinois algorithm, step 5 of the paper)
    var a = Math.log(sigma * sigma);
    var f = function (x) {
      var ex = Math.exp(x);
      return ex * (delta * delta - phi * phi - v - ex) / (2 * Math.pow(phi * phi + v + ex, 2)) - (x - a) / (TAU * TAU);
    };
    var A = a, B, k;
    if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
    else { k = 1; while (f(a - k * TAU) < 0) k++; B = a - k * TAU; }
    var fA = f(A), fB = f(B), n = 0;
    while (Math.abs(B - A) > EPS && n++ < 100) {
      var C = A + (A - B) * fA / (fB - fA), fC = f(C);
      if (fC * fB <= 0) { A = B; fA = fB; } else fA = fA / 2;
      B = C; fB = fC;
    }
    var sigma2 = Math.exp(A / 2);
    var phiStar = Math.sqrt(phi * phi + sigma2 * sigma2);
    var phi2 = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
    var mu2 = mu + phi2 * phi2 * d;
    return { rating: Math.round((mu2 * SCALE + BASE) * 10) / 10, rd: Math.max(MIN_RD, Math.round(phi2 * SCALE * 10) / 10), vol: sigma2 };
  }

  /** Both players of one match at once: { a, b } new ratings. score: 1 = a won, 0.5 draw, 0 = b won. */
  function match(a, b, score) {
    return { a: update(a, [{ rating: b.rating, rd: b.rd, score: score }]), b: update(b, [{ rating: a.rating, rd: a.rd, score: 1 - score }]) };
  }
  function provisional(p) { return !p || p.rd > PROVISIONAL_RD; }

  return { START: START, update: update, glicko: glicko, gentle: gentle, match: match, provisional: provisional, PROVISIONAL_RD: PROVISIONAL_RD, MAX_STEP: MAX_STEP, SOFT: SOFT, MIN: MIN };
});
