/*!
 * Who Am I? MBG - buying: Google Play Billing in the Android app (paid edition), and a clearly marked
 * test shop in the browser preview. The rules are in js/app/plans.js.
 *
 * Products in Play Console (the same IDs here):
 *   subscription  whoami_unlimited, base plans  weekly · monthly · quarterly · yearly
 *                                               ($4.99 · $15.99 · $34.99 every 3 months · $79.99)
 *   one-time      whoami_daypass (consumable: 24 hours without limits)       ($1.99)
 *   one-time      whoami_credits_60 / _350 / _800 / _1800 (consumable)        ($0.99 · $4.99 · $9.99 · $19.99)
 * Prices are read from Google Play at runtime, in the buyer's currency. Purchases are acknowledged
 * (subscriptions) or consumed (passes, credits) on the phone - Google refunds purchases that are not
 * acknowledged within 3 days - and those that were paid while the app was closed are found at the
 * next start. Each purchase token counts once (MBG.Plan).
 * As in MBG Puzzles, the plugin (@capgo/native-purchases) and the BILLING permission are only in the
 * paid edition; in Kosovo, where Google Play does not sell, the paid edition plays without limits.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell, Pl = MBG.Plans, R = Pl.RULES;

  // the edition in use: the build's, or (browser only, for trying it) the preview of the paid edition
  function edition() { return MBG.EDITION === 'paid' || (!Shell.native && Shell.getPrefs().previewPaid) ? 'paid' : 'free'; }
  function who() { var u = Shell.getUser(); return u.name ? 'n:' + String(u.name).normalize('NFC').trim().toLowerCase() : 'anon'; }
  MBG.Plan = new Pl.PlanStore(Shell.store, { edition: edition(), who: who });
  var preview = !Shell.native && edition() === 'paid' && MBG.EDITION !== 'paid';   // the test shop

  var NP = Shell.native && MBG.EDITION === 'paid' && root.capacitorNativePurchases ? root.capacitorNativePurchases.NativePurchases : null;
  var listeners = [];
  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); }
  function errText(e) { return String((e && (e.code || '')) + ' ' + (e && (e.message || e.errorMessage || '')) || e); }
  function usd(v) { try { return new Intl.NumberFormat(Shell.getLang(), { style: 'currency', currency: 'USD' }).format(v); } catch (e) { return '$' + v; } }

  /** Is this Google account subscribed? (Google Play; the last answer counts 7 days offline.) */
  function refresh() {
    if (!NP) return Promise.resolve(MBG.Plan.subscribed());
    return NP.getPurchases({ productType: 'subs' }).then(function (res) {
      var active = ((res && res.purchases) || []).filter(function (p) { return p && p.productIdentifier === R.subscription && String(p.purchaseState) === '1'; });
      active.forEach(function (p) { if (p.isAcknowledged === false && p.purchaseToken) NP.acknowledgePurchase({ purchaseToken: p.purchaseToken }).catch(function () {}); });
      var plan = active[0] && (active[0].planIdentifier || active[0].basePlanId) || null;
      if (MBG.Plan.setSubscription(active.length > 0, plan)) notify();
      return active.length > 0;
    }, function () { return MBG.Plan.subscribed(); });
  }
  /** The country of the Google Play account (Kosovo: no limits). */
  function region() {
    if (!NP || typeof NP.getStorefront !== 'function') return;
    NP.getStorefront().then(function (r) { if (r && r.countryCode) { MBG.Plan.setRegion(r.countryCode); notify(); } }, function () {});
  }

  /** Prices: { daypass, weekly, monthly, quarterly, yearly, packs: { id: price } } as text. */
  function prices() {
    var out = { daypass: usd(R.pass.preview), packs: {} };
    R.plans.forEach(function (p) { out[p.id] = usd(p.preview); });
    R.packs.forEach(function (p) { out.packs[p.id] = usd(p.preview); });
    if (!NP) return Promise.resolve(out);
    return Promise.all([
      NP.getProducts({ productIdentifiers: [R.subscription], productType: 'subs' }).catch(function () { return {}; }),
      NP.getProducts({ productIdentifiers: [R.pass.id].concat(R.packs.map(function (p) { return p.id; })), productType: 'inapp' }).catch(function () { return {}; })
    ]).then(function (res) {
      ((res[0] && res[0].products) || []).forEach(function (p) { if (p && !p.offerId && out[p.identifier] !== undefined && p.priceString) out[p.identifier] = p.priceString; });
      ((res[1] && res[1].products) || []).forEach(function (p) {
        if (!p || !p.priceString) return;
        if (p.identifier === R.pass.id) out.daypass = p.priceString; else out.packs[p.identifier] = p.priceString;
      });
      return out;
    });
  }

  /** The test shop of the browser preview: nothing is paid, the screen says so. */
  function testBuy(apply) {
    return Shell.confirm({ title: '🧪 ' + Shell.t('shop.testTitle'), text: Shell.t('shop.testText'), ok: Shell.t('shop.testOk'), cancel: Shell.t('dlg.cancel') })
      .then(function (ok) { if (!ok) return { ok: false, reason: 'cancelled' }; apply('test:' + Date.now()); notify(); return { ok: true, test: true }; });
  }
  function failed(e) {
    var s = errText(e);
    if (/CANCEL/i.test(s)) return { ok: false, reason: 'cancelled' };
    if (/pending/i.test(s)) return { ok: false, reason: 'pending' };
    return { ok: false, reason: 'error', detail: s };
  }
  /** Subscribe: 'weekly' | 'monthly' | 'quarterly' | 'yearly'. */
  function subscribe(plan) {
    if (preview) return testBuy(function () { MBG.Plan.setSubscription(true, plan); });
    if (!NP) return Promise.resolve({ ok: false, reason: 'web' });
    return NP.purchaseProduct({ productIdentifier: R.subscription, planIdentifier: plan, productType: 'subs' })
      .then(function () { return refresh().then(function (a) { if (!a) MBG.Plan.setSubscription(true, plan); notify(); return { ok: true }; }); }, failed);
  }
  /** A consumable: the day pass or a credit pack. Credited once per purchase token, then consumed. */
  function settle(p, id) {
    var token = p && p.purchaseToken, done = false;
    if (id === R.pass.id) done = MBG.Plan.addPass(token);
    R.packs.forEach(function (k) { if (k.id === id) done = MBG.Plan.add(k.credits, 'pack', token); });
    if (token && NP) NP.consumePurchase({ purchaseToken: token }).catch(function () { /* at the next start */ });
    return done;
  }
  function buyItem(id) {
    if (preview) return testBuy(function (tok) { settle({ purchaseToken: tok }, id); });
    if (!NP) return Promise.resolve({ ok: false, reason: 'web' });
    return NP.purchaseProduct({ productIdentifier: id, productType: 'inapp', isConsumable: false, autoAcknowledgePurchases: false })
      .then(function (tx) {
        if (tx && tx.purchaseState != null && String(tx.purchaseState) !== '1') return { ok: false, reason: 'pending' };
        settle(tx, id); notify();
        return { ok: true };
      }, failed);
  }
  function recover() {
    if (!NP) return Promise.resolve(0);
    var ids = [R.pass.id].concat(R.packs.map(function (p) { return p.id; }));
    return NP.getPurchases({ productType: 'inapp' }).then(function (res) {
      var n = 0;
      ((res && res.purchases) || []).forEach(function (p) { if (p && ids.indexOf(p.productIdentifier) !== -1 && String(p.purchaseState) === '1' && settle(p, p.productIdentifier)) n++; });
      if (n) notify();
      return n;
    }, function () { return 0; });
  }
  function restore() {
    if (!NP) return Promise.resolve({ active: MBG.Plan.subscribed(), web: true });
    var step = typeof NP.restorePurchases === 'function' ? NP.restorePurchases().catch(function () {}) : Promise.resolve();
    return step.then(function () { return Promise.all([refresh(), recover()]); }).then(function (r) { notify(); return { active: r[0] }; });
  }
  function manage() {
    if (NP && typeof NP.manageSubscriptions === 'function') return NP.manageSubscriptions().catch(function () { root.open('https://play.google.com/store/account/subscriptions', '_blank'); });
    root.open('https://play.google.com/store/account/subscriptions', '_blank');
    return Promise.resolve();
  }

  MBG.Billing = { edition: edition, preview: preview, native: !!NP, refresh: refresh, prices: prices, subscribe: subscribe, buyItem: buyItem,
    restore: restore, manage: manage, onChange: function (fn) { listeners.push(fn); }, _notify: notify };
  if (NP) {
    setTimeout(function () { refresh(); recover(); region(); }, 0);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { refresh(); recover(); } });
  }
})(typeof self !== 'undefined' ? self : globalThis);
