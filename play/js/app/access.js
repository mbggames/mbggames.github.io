/*!
 * MBG Puzzles - who may start a game right now (no screen code in this file).
 *
 * Rules:
 *   1. Free week: for 7 days from the first start of the app, both games are unlimited.
 *   2. After that: one free game of Codebreaker and one free game of Word Puzzle every
 *      24 hours. A game counts as played once the first try is made, so opening a game,
 *      changing the length or the language does not use it up.
 *   3. An active subscription (weekly, monthly or yearly, bought in Google Play)
 *      unlocks both games without limits.
 *
 * The free edition (MBG.EDITION = 'free', published while selling is not possible) has
 * no limits at all: new AccessStore(storage, key, now, { unlimited: true }). It does not
 * start the free week either, so when a later update switches to the paid edition,
 * every player still gets a full free week from that day.
 *
 * Kosovo (paid edition): Google Play does not sell to buyers in Kosovo, so there the paid
 * edition works like the free one. The country of the Google Play account (getStorefront of
 * the purchases plugin, Google Play Billing's getBillingConfig) is asked when a screen opens and
 * again every 6 hours; regionFree() decides with the last answer, nextRegion() keeps it.
 *
 * The state is kept on the phone (local storage). Runs in the browser (window.MBG.Access)
 * and in Node.js (require) for the automated tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Access = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  var RULES = {
    freeDays: (typeof self !== 'undefined' ? self : globalThis).MBG && (typeof self !== 'undefined' ? self : globalThis).MBG.PREVIEW ? 0 : 7,   // the free week (none in the web preview)
    freeEveryMs: DAY,            // one free game per game every 24 hours afterwards
    games: ['codebreaker', 'word'],
    // A subscription seen within this time still counts when Google Play cannot be
    // reached (no internet). After that the phone must check again.
    offlineGraceMs: 7 * DAY
  };

  function AccessStore(storage, key, now, opts) {
    this.storage = storage;
    this.key = key || 'MBG.App.access';
    this.now = now || function () { return Date.now(); };
    this.unlimited = !!(opts && opts.unlimited);
    this.data = null;
    this.load();
  }
  var P = AccessStore.prototype;

  P.load = function () {
    var d = null;
    try { d = JSON.parse(this.storage.getItem(this.key) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (typeof d.firstOpen !== 'number' || !isFinite(d.firstOpen)) d.firstOpen = null;
    if (!d.lastFree || typeof d.lastFree !== 'object') d.lastFree = {};
    if (!d.sub || typeof d.sub !== 'object') d.sub = { active: false, checkedAt: 0 };
    this.data = d;
    return this;
  };

  P.save = function () {
    try { this.storage.setItem(this.key, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  };

  /** Remembers the first start of the app; the free week counts from here. */
  P.ensureStarted = function () {
    if (this.unlimited) return this.data.firstOpen;   // free edition: the free week has not started
    if (this.data.firstOpen == null) {
      this.data.firstOpen = this.now();
      this.save();
    }
    return this.data.firstOpen;
  };

  P.trialEndsAt = function () { return this.ensureStarted() + RULES.freeDays * DAY; };

  P.isSubscribed = function () {
    if (this.unlimited) return false;
    var s = this.data.sub;
    if (!s || !s.active) return false;
    return this.now() - (s.checkedAt || 0) <= RULES.offlineGraceMs;
  };

  /** Called with the answer from Google Play (true / false). */
  P.setSubscription = function (active, info) {
    var was = this.isSubscribed();
    this.data.sub = { active: !!active, checkedAt: this.now() };
    if (info && info.plan) this.data.sub.plan = String(info.plan);
    this.save();
    return was !== this.isSubscribed();
  };

  /**
   * The situation for one game:
   *   { mode: 'unlimited' }            (free edition)
   *   { mode: 'subscribed' }
   *   { mode: 'trial', endsAt, daysLeft }
   *   { mode: 'free', available: true }
   *   { mode: 'free', available: false, nextFreeAt, msLeft }
   */
  P.status = function (game) {
    if (this.unlimited) return { mode: 'unlimited' };
    var now = this.now();
    if (this.isSubscribed()) return { mode: 'subscribed', plan: this.data.sub.plan || null };
    var end = this.trialEndsAt();
    if (now < end) return { mode: 'trial', endsAt: end, daysLeft: Math.max(1, Math.ceil((end - now) / DAY)) };
    var last = this.data.lastFree[game];
    if (typeof last !== 'number' || now >= last + RULES.freeEveryMs || last > now + DAY) {
      return { mode: 'free', available: true };
    }
    var next = last + RULES.freeEveryMs;
    return { mode: 'free', available: false, nextFreeAt: next, msLeft: next - now };
  };

  /** True when a new game of this kind may start now. */
  P.canStart = function (game) {
    var s = this.status(game);
    return s.mode !== 'free' || s.available;
  };

  /** The first try of a game was made: on the free plan this uses today's free game. */
  P.recordFirstGuess = function (game) {
    var s = this.status(game);
    if (s.mode !== 'free') return false;
    this.data.lastFree[game] = this.now();
    this.save();
    return true;
  };

  /* ---------------------------------------------------------------- Kosovo --- */
  var FREE_REGIONS = ['XK'];                 // Google Play's code for Kosovo
  var REGION_CHECK_MS = 6 * 60 * 60 * 1000;
  /** True when this edition plays without limits: the free edition, or the paid one in Kosovo. */
  function regionFree(edition, region) {
    if (edition !== 'paid') return true;
    return !!(region && FREE_REGIONS.indexOf(region.code) !== -1);
  }
  /**
   * The region to keep after Google Play answered with countryCode at time now: { code, at }.
   * An empty answer (Play not reachable) keeps the last known country; the time is noted
   * either way, so the next question waits for REGION_CHECK_MS.
   */
  function nextRegion(prev, countryCode, now) {
    var code = String(countryCode || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) code = prev && prev.code ? prev.code : '';
    return { code: code, at: now };
  }
  function regionDue(region, now) { return !region || typeof region.at !== 'number' || now - region.at >= REGION_CHECK_MS || region.at > now; }

  /** "13 h 20 min" style countdown parts. */
  function splitDuration(ms) {
    var totalMin = Math.max(0, Math.ceil(ms / 60000));
    return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
  }

  return { RULES: RULES, DAY: DAY, AccessStore: AccessStore, splitDuration: splitDuration,
    FREE_REGIONS: FREE_REGIONS, REGION_CHECK_MS: REGION_CHECK_MS, regionFree: regionFree, nextRegion: nextRegion, regionDue: regionDue };
});
