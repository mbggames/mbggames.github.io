/*!
 * Who Am I? MBG - the free and the paid edition: free games, passes, subscriptions and credits.
 *
 * Two editions of the same code (MBG.EDITION, written by the build - tools/apply-config.js):
 *   free  no limits, nothing for sale (the first versions; can be published from Kosovo)
 *   paid  the Google Play version:
 *           FREE GAMES   1 game a day, at most 5 a week (Monday to Sunday, the phone's own time)
 *           DAY PASS     24 hours without limits - $1.99 (a one-time purchase) - the reference
 *           MBG UNLIMITED subscription, cancel any time in Google Play. Against day passes the
 *                        saving grows in even steps of about 8 points:
 *                          week $4.99 (64 %) · month $15.99 (73 %) · 3 months $34.99 (81 %) ·
 *                          year $79.99 (89 %). Subscribers get a few bonus credits too.
 *           CREDITS      bought in packs or earned; spent on power-ups and extra games.
 *                        Earned sparingly - a taste that keeps players coming back, not a way
 *                        around paying: at most 25 free credits a week (half an extra game).
 *                        Top players (Master and above, rating 2,200+) earn more: up to 100 a
 *                        week, and the old, higher rewards for judging.
 *         Watching games, the board, the Hall of Fame and judging are always free.
 *         Kosovo: Google Play does not sell to buyers in Kosovo, so there the paid edition plays
 *         like the free one (the country of the Google Play account, as in MBG Puzzles).
 *         FREE ACCESS (1.0.0): the administrator can give the game for free to chosen people by
 *         e-mail address (server: /api/p/admin/free). Signed in with an MBG account of that
 *         address, the player plays like in the free edition - no limits, power-ups free - until
 *         the date given, if any (js/platform/access.js checks it; known for 7 days offline).
 * A "game" is a match the player plays (against the computer, people, two tabs or the party).
 * It counts when it really starts - a search that finds nothing costs nothing.
 *
 * Prices: in the app they come from Google Play, in the buyer's currency; the dollars here are
 * the prices set in Play Console and are shown only in the browser preview.
 * Runs in the browser (MBG.Plans) and in Node.js (require) for the tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Plans = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var DAY = 864e5;
  var RULES = {
    free: { perDay: 1, perWeek: 5 },
    pass: { id: 'whoami_daypass', hours: 24, preview: 1.99, days: 1 },
    subscription: 'whoami_unlimited',
    plans: [
      { id: 'weekly', preview: 4.99, days: 7, bonus: 10 },          // 10 credits every week
      { id: 'monthly', preview: 15.99, days: 30, bonus: 40, popular: true },
      { id: 'quarterly', preview: 34.99, days: 91, bonus: 50 },     // 3 months - 50 credits every month
      { id: 'yearly', preview: 79.99, days: 365, bonus: 60 }        // 60 credits every month
    ],
    packs: [
      { id: 'whoami_credits_60', credits: 60, preview: 0.99 },
      { id: 'whoami_credits_350', credits: 350, preview: 4.99, extra: 50 },
      { id: 'whoami_credits_800', credits: 800, preview: 9.99, extra: 200 },
      { id: 'whoami_credits_1800', credits: 1800, preview: 19.99, extra: 600 }
    ],
    // what credits buy (practice against the computer and the party - never against people)
    costs: { hint: 10, time: 15, questions: 15, spell: 20, game: 50 },
    // what earns credits - sparingly; top players (rating 2,200+, "Master" and above) earn more
    earn: { welcome: 20, firstWin: 3, best: 5, streak: 10, judge: 5, judgePerDay: 2, perWeek: 25 },
    earnTop: { welcome: 20, firstWin: 5, best: 10, streak: 25, judge: 10, judgePerDay: 3, perWeek: 100 },
    topRating: 2200,
    offlineGraceMs: 7 * DAY,         // a known subscription counts this long without Google Play
    freeRegions: ['XK']              // Google Play's code for Kosovo
  };

  /** Days and Monday-to-Sunday weeks in the phone's own time zone. */
  function calendar(ms) {
    var d = new Date(ms);
    var day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
    return { day: day, week: Math.floor((day + 3) / 7) };       // 1 January 1970 was a Thursday
  }
  /** The start of the next day and of the next Monday, in local time (for "next free game"). */
  function nextDay(ms) { var d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); }
  function nextMonday(ms) { var d = new Date(ms), add = (8 - d.getDay()) % 7 || 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() + add).getTime(); }

  /**
   * The plan of this device. storage: localStorage-like; edition: 'free' | 'paid';
   * now(): the time; who(): the key of the player playing ('anon' or 'n:<name>').
   */
  function PlanStore(storage, o) {
    o = o || {};
    this.storage = storage;
    this.key = o.key || 'MBG.Who.plan';
    this.edition = o.edition === 'paid' ? 'paid' : 'free';
    this.now = o.now || function () { return Date.now(); };
    this.who = o.who || function () { return 'anon'; };
    this.load();
  }
  var P = PlanStore.prototype;
  P.load = function () {
    var d = null;
    try { d = JSON.parse(this.storage.getItem(this.key) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    d.games = d.games && typeof d.games === 'object' ? d.games : {};
    d.pass = d.pass && typeof d.pass === 'object' ? d.pass : { until: 0 };
    d.sub = d.sub && typeof d.sub === 'object' ? d.sub : { active: false, checkedAt: 0, plan: null };
    d.wallets = d.wallets && typeof d.wallets === 'object' ? d.wallets : {};
    d.granted = Array.isArray(d.granted) ? d.granted : [];
    d.region = d.region || null;
    d.gifts = d.gifts && typeof d.gifts === 'object' ? d.gifts : {};
    this.data = d;
    return this;
  };
  P.save = function () { try { this.storage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* full */ } };

  /** True when there are no limits at all: the free edition, or the paid one in Kosovo. */
  P.unlimitedEdition = function () { return this.edition !== 'paid' || !!(this.data.region && RULES.freeRegions.indexOf(this.data.region.code) !== -1); };
  P.setRegion = function (code) {
    var c = String(code || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(c)) { this.data.region = { code: c, at: this.now() }; this.save(); }
  };
  /** Free access given by the administrator to the player playing now (by the e-mail of the MBG account). */
  P.gift = function () {
    var g = this.data.gifts[this.who()];
    if (!g || this.now() - (g.checkedAt || 0) > RULES.offlineGraceMs) return null;
    if (g.until && g.until <= this.now()) return null;
    return { until: g.until || 0 };
  };
  P.gifted = function () { return !!this.gift(); };
  /** From the server: free access for the player playing now (true / false), until (ms, 0 = no end). Returns true when it changed. */
  P.setGift = function (active, until) {
    var k = this.who(), was = this.gifted();
    if (active) this.data.gifts[k] = { until: Number(until) || 0, checkedAt: this.now() };
    else delete this.data.gifts[k];
    this.save();
    return was !== this.gifted();
  };
  P.subscribed = function () {
    var s = this.data.sub;
    return !!(s && s.active && this.now() - (s.checkedAt || 0) <= RULES.offlineGraceMs);
  };
  P.setSubscription = function (active, plan) {
    var was = this.subscribed();
    this.data.sub = { active: !!active, checkedAt: this.now(), plan: plan || (active ? this.data.sub.plan : null), since: active ? this.data.sub.since || this.now() : null };
    this.save();
    if (active) this.memberBonus();
    return was !== this.subscribed();
  };
  P.passUntil = function () { return this.data.pass.until > this.now() ? this.data.pass.until : 0; };
  /** A bought day pass: 24 hours from now (or from the end of a pass still running). */
  P.addPass = function (token) {
    if (token && this.data.granted.indexOf(token) !== -1) return false;
    var from = Math.max(this.now(), this.data.pass.until || 0);
    this.data.pass = { until: from + RULES.pass.hours * 36e5 };
    if (token) this.data.granted.push(token);
    this.save();
    return true;
  };

  /* --------------------------------------------------------- free games --- */
  P.counts = function () {
    var c = calendar(this.now()), g = this.data.games;
    return { today: g.day === c.day ? g.today || 0 : 0, week: g.week === c.week ? g.weekCount || 0 : 0, extra: g.extraDay === c.day ? g.extra || 0 : 0 };
  };
  /**
   * The situation now:
   *   { mode: 'unlimited' }                                      free edition (or Kosovo)
   *   { mode: 'gift', until }                                    free access from the administrator
   *   { mode: 'subscribed', plan }  |  { mode: 'pass', until }
   *   { mode: 'free', canPlay, leftToday, leftWeek, extra, nextAt, why: 'day' | 'week' }
   */
  P.status = function () {
    if (this.unlimitedEdition()) return { mode: 'unlimited', canPlay: true };
    var g = this.gift();
    if (g) return { mode: 'gift', until: g.until, canPlay: true };
    if (this.subscribed()) return { mode: 'subscribed', plan: this.data.sub.plan, canPlay: true };
    var until = this.passUntil();
    if (until) return { mode: 'pass', until: until, canPlay: true };
    var c = this.counts(), F = RULES.free;
    var leftToday = Math.max(0, F.perDay - c.today), leftWeek = Math.max(0, F.perWeek - c.week);
    var free = Math.min(leftToday, leftWeek);
    var why = free > 0 ? null : leftWeek <= 0 ? 'week' : 'day';
    return { mode: 'free', canPlay: free > 0 || c.extra > 0, leftToday: leftToday, leftWeek: leftWeek, free: free, extra: c.extra,
      why: why, nextAt: why === 'week' ? nextMonday(this.now()) : why === 'day' ? nextDay(this.now()) : null };
  };
  P.canPlay = function () { return this.status().canPlay; };
  /** A game really starts: it uses a free game (or an extra game bought with credits). */
  P.useGame = function () {
    var s = this.status();
    if (s.mode !== 'free') return { ok: true, mode: s.mode };
    if (!s.canPlay) return { ok: false, why: s.why };
    var c = calendar(this.now()), g = this.data.games;
    if (s.free > 0) {
      if (g.day !== c.day) { g.day = c.day; g.today = 0; }
      if (g.week !== c.week) { g.week = c.week; g.weekCount = 0; }
      g.today += 1; g.weekCount += 1;
    } else { g.extra -= 1; }
    this.save();
    return { ok: true, mode: 'free', used: s.free > 0 ? 'free' : 'extra' };
  };

  /* ------------------------------------------------------------ credits --- */
  P.wallet = function () {
    var k = this.who(), w = this.data.wallets[k];
    if (!w) {
      w = this.data.wallets[k] = { credits: 0, log: [] };
      // the welcome gift: once per device (a new name does not bring new credits)
      if (this.edition === 'paid' && !this.data.welcomed) { this.data.welcomed = true; w.credits = RULES.earn.welcome; w.log.push({ at: this.now(), n: RULES.earn.welcome, why: 'welcome' }); }
      this.save();
    }
    return w;
  };
  P.credits = function () { return this.wallet().credits; };
  P.add = function (n, why, token) {
    if (token && this.data.granted.indexOf(token) !== -1) return false;
    var w = this.wallet();
    w.credits += n;
    w.log.unshift({ at: this.now(), n: n, why: why });
    w.log = w.log.slice(0, 40);
    if (token) { this.data.granted.push(token); this.data.granted = this.data.granted.slice(-200); }
    this.save();
    return true;
  };
  /** What a thing costs now: nothing without limits (free edition, Kosovo, free access). */
  P.cost = function (what) { return this.unlimitedEdition() || this.gifted() ? 0 : RULES.costs[what] || 0; };
  P.spend = function (what) {
    var c = this.cost(what), w = this.wallet();
    if (!c) return { ok: true, cost: 0 };
    if (w.credits < c) return { ok: false, need: c, have: w.credits };
    w.credits -= c;
    w.log.unshift({ at: this.now(), n: -c, why: what });
    w.log = w.log.slice(0, 40);
    this.save();
    return { ok: true, cost: c };
  };
  /** One more game today, bought with credits. */
  P.buyGame = function () {
    var r = this.spend('game');
    if (!r.ok) return r;
    var c = calendar(this.now()), g = this.data.games;
    if (g.extraDay !== c.day) { g.extraDay = c.day; g.extra = 0; }
    g.extra += 1;
    this.save();
    return r;
  };
  /** The best rating known for this player (official with the server, else the practice rating). */
  P.setRating = function (r) {
    var w = this.wallet(), n = Math.round(Number(r) || 0);
    if (n > 0 && n !== w.rating) { w.rating = n; this.save(); }
  };
  P.isTop = function () { return (this.wallet().rating || 0) >= RULES.topRating; };
  P.earnRules = function () { return this.isTop() ? RULES.earnTop : RULES.earn; };
  /** Free credits left this week (Monday to Sunday): earning stops at the weekly limit. */
  P.earnLeft = function () {
    var w = this.wallet(), c = calendar(this.now());
    return Math.max(0, this.earnRules().perWeek - (w.earnWeek === c.week ? w.earnN || 0 : 0));
  };
  /** Credits earned (not bought): within the weekly limit. Returns what was really added. */
  P.earn = function (n, why, token) {
    var w = this.wallet(), c = calendar(this.now()), give = Math.min(n, this.earnLeft());
    if (give <= 0) return 0;
    if (!this.add(give, why, token)) return 0;
    if (w.earnWeek !== c.week) { w.earnWeek = c.week; w.earnN = 0; }
    w.earnN += give;
    this.save();
    return give;
  };
  /** After a match: credits earned (paid edition) - first win of the day, a new best, 5 days in a row. */
  P.reward = function (o) {
    if (this.unlimitedEdition() || this.gifted()) return [];
    if (o && o.rating) this.setRating(o.rating);
    var E = this.earnRules(), c = calendar(this.now()), w = this.wallet(), out = [];
    w.days = (w.days || []).filter(function (d) { return d > c.day - 10; });
    if (w.days.indexOf(c.day) === -1) w.days.push(c.day);
    if (o.won && w.firstWinDay !== c.day) { w.firstWinDay = c.day; out.push(['firstWin', E.firstWin]); }
    if (o.newBest) out.push(['best', E.best]);
    var streak = 0;
    for (var d = c.day; w.days.indexOf(d) !== -1; d--) streak++;
    if (streak >= 5 && w.streakDay !== c.day && (!w.streakDay || c.day - w.streakDay >= 5)) { w.streakDay = c.day; out.push(['streak', E.streak]); }
    var self = this;
    out = out.map(function (x) { return [x[0], self.earn(x[1], x[0])]; }).filter(function (x) { return x[1] > 0; });
    this.save();
    return out;
  };
  /** A judged case (community judges are rewarded for their time - 3 a day at most). */
  P.rewardJudge = function (caseId) {
    if (this.unlimitedEdition() || this.gifted()) return 0;
    var c = calendar(this.now()), w = this.wallet(), E = this.earnRules();
    if (w.judgeDay !== c.day) { w.judgeDay = c.day; w.judgeN = 0; }
    if (w.judgeN >= E.judgePerDay) return 0;
    var got = this.earn(E.judge, 'judge', 'judge:' + caseId);
    if (!got) return 0;
    w.judgeN += 1;
    this.save();
    return got;
  };
  /** Subscribers' bonus credits, once a period (weekly: every week; the others: every month). */
  P.memberBonus = function () {
    if (!this.subscribed()) return 0;
    var plan = null, id = this.data.sub.plan;
    RULES.plans.forEach(function (p) { if (p.id === id) plan = p; });
    if (!plan) return 0;
    var period = plan.id === 'weekly' ? 7 : 30, c = calendar(this.now());
    var tok = 'bonus:' + plan.id + ':' + Math.floor(c.day / period);
    return this.add(plan.bonus, 'member', tok) ? plan.bonus : 0;
  };
  /**
   * Saving of a plan against day passes for the same days ("save 73%"): the day pass is the
   * reference, the week saves least, the year most - in even steps.
   */
  function saving(planId) {
    var p = null;
    RULES.plans.forEach(function (x) { if (x.id === planId) p = x; });
    if (!p) return 0;
    return Math.round(100 * (1 - p.preview / (RULES.pass.preview * p.days)));
  }

  return { RULES: RULES, PlanStore: PlanStore, calendar: calendar, nextDay: nextDay, nextMonday: nextMonday, saving: saving, DAY: DAY };
});
