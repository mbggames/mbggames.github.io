/*!
 * MBG Puzzles - subscriptions through Google Play Billing.
 *
 * One subscription product in Play Console unlocks both games:
 *   product ID  mbg_unlimited
 *   base plans  weekly (1 week) · monthly (1 month) · yearly (1 year)
 * Prices are set in Play Console and read from Google Play at runtime, so they are
 * never written in this code. Purchases are acknowledged on the phone by the
 * @capgo/native-purchases plugin (Google refunds purchases that are not acknowledged
 * within 3 days).
 *
 * In a web browser (preview, tests) there is no Google Play: the plans are shown with
 * sample prices and buying explains that subscriptions are sold in the Android app.
 *
 * Hint credits (paid edition): consumable one-time products mbg_credits_50 / _100 / _200
 * (see js/app/credits.js), added to the player logged in. A bought pack is
 * credited on the phone, then the purchase is consumed so it can be bought again; purchases
 * that were not consumed (the app closed in between) are found and credited at the next start.
 *
 * The free edition (MBG.EDITION = 'free') sells nothing: Google Play Billing is never
 * called, and the build leaves the purchases plugin (and its BILLING permission) out.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;

  var PRODUCT_ID = 'mbg_unlimited';
  var PLANS = ['weekly', 'monthly', 'yearly'];
  // Browser preview only (in the app the prices come from Google Play, in the buyer's currency):
  // euros written the way the language in use writes them (€0.99, 0,99 €, €0,99).
  var PREVIEW_EUROS = { weekly: 0.99, monthly: 2.99, yearly: 19.99 };
  var LOCALES = { en: 'en-IE', sq: 'sq-AL', bs: 'bs-BA', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', tr: 'tr-TR', pl: 'pl-PL',
    pt: 'pt-BR', ar: 'ar-u-nu-latn' };   // Arabic with Western digits, as everywhere in the app
  function previewPrice(id) {
    var v = PREVIEW_EUROS[id];
    try {
      return new Intl.NumberFormat(LOCALES[Shell.getLang()] || 'en-IE', { style: 'currency', currency: 'EUR' }).format(v);
    } catch (e) { return '€' + v.toFixed(2); }
  }

  if (Shell.free) {
    var none = function () { return Promise.resolve(false); };
    MBG.Billing = {
      PRODUCT_ID: PRODUCT_ID, PLANS: PLANS, available: false, free: true,
      refresh: none,
      getPlans: function () { return Promise.resolve([]); },
      buy: function () { return Promise.resolve({ ok: false, reason: 'free' }); },
      restore: function () { return Promise.resolve({ active: false, free: true }); },
      manage: function () { return Promise.resolve(); },
      onChange: function () { /* nothing ever changes */ },
      previewSubscribe: function () { return false; },
      packPrices: function () { return Promise.resolve({}); },
      buyCredits: function () { return Promise.resolve({ ok: false, reason: 'free' }); },
      recoverCredits: function () { return Promise.resolve(0); }
    };
    return;
  }

  var NP = Shell.native && root.capacitorNativePurchases ? root.capacitorNativePurchases.NativePurchases : null;
  var listeners = [];
  var plansCache = null;
  var refreshing = null;

  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); }
  function errText(e) { return String((e && (e.code || '')) + ' ' + (e && (e.message || e.errorMessage || '')) || e); }

  /** Asks Google Play whether this Google account has an active subscription. */
  function refresh() {
    if (!NP) return Promise.resolve(Shell.access.isSubscribed());
    if (refreshing) return refreshing;
    refreshing = NP.getPurchases({ productType: 'subs' }).then(function (res) {
      var list = (res && res.purchases) || [];
      var active = list.filter(function (p) {
        return p && p.productIdentifier === PRODUCT_ID && String(p.purchaseState) === '1';
      });
      // A purchase that completed while the app was closed (for example a delayed
      // payment) is acknowledged here, so Google Play does not refund it.
      active.forEach(function (p) {
        if (p.isAcknowledged === false && p.purchaseToken) {
          NP.acknowledgePurchase({ purchaseToken: p.purchaseToken }).catch(function () { /* retried next start */ });
        }
      });
      var changed = Shell.access.setSubscription(active.length > 0);
      if (changed) notify();
      return active.length > 0;
    }, function () {
      // No connection to Google Play: keep the last known answer (MBG.Access allows
      // up to 7 days offline for a known subscription).
      return Shell.access.isSubscribed();
    }).then(function (v) { refreshing = null; return v; }, function () { refreshing = null; return Shell.access.isSubscribed(); });
    return refreshing;
  }

  /**
   * The three plans with their Google Play prices:
   *   [{ id: 'weekly', priceString: '€0.99', preview: false }, ...]
   */
  function getPlans() {
    if (!NP) {
      return Promise.resolve(PLANS.map(function (id) { return { id: id, priceString: previewPrice(id), preview: true }; }));
    }
    if (plansCache) return Promise.resolve(plansCache);
    return NP.getProducts({ productIdentifiers: [PRODUCT_ID], productType: 'subs' }).then(function (res) {
      var products = (res && res.products) || [];
      var byPlan = {};
      products.forEach(function (p) {
        // One entry per base plan (identifier = base plan ID); skip promotional offers.
        if (!p || p.planIdentifier !== PRODUCT_ID || p.offerId) return;
        if (PLANS.indexOf(p.identifier) === -1 || byPlan[p.identifier]) return;
        byPlan[p.identifier] = { id: p.identifier, priceString: p.priceString, price: p.price, currency: p.currencyCode, preview: false };
      });
      var plans = PLANS.filter(function (id) { return byPlan[id]; }).map(function (id) { return byPlan[id]; });
      if (!plans.length) throw new Error('No plans');
      plansCache = plans;
      return plans;
    });
  }

  /**
   * Starts the Google Play purchase sheet for one plan.
   * Resolves { ok: true } | { ok: false, reason: 'cancelled'|'pending'|'web'|'error' }.
   */
  function buy(planId) {
    if (!NP) return Promise.resolve({ ok: false, reason: 'web' });
    return NP.purchaseProduct({ productIdentifier: PRODUCT_ID, planIdentifier: planId, productType: 'subs' })
      .then(function () {
        return refresh().then(function (active) {
          if (!active) Shell.access.setSubscription(true);   // Play may need a moment to list it
          notify();
          return { ok: true };
        });
      }, function (e) {
        var s = errText(e);
        if (/CANCEL/i.test(s)) return { ok: false, reason: 'cancelled' };
        if (/ALREADY_OWNED/i.test(s)) return refresh().then(function () { notify(); return { ok: true }; });
        if (/pending/i.test(s)) return { ok: false, reason: 'pending' };
        return { ok: false, reason: 'error', detail: s };
      });
  }

  /** "Restore purchase": asks Google Play again for this account's subscriptions. */
  function restore() {
    if (!NP) return Promise.resolve({ active: Shell.access.isSubscribed(), web: true });
    var step = typeof NP.restorePurchases === 'function' ? NP.restorePurchases().catch(function () {}) : Promise.resolve();
    return step.then(refresh).then(function (active) { notify(); return { active: active }; });
  }

  /** Opens the Google Play page where the subscription is changed or cancelled. */
  function manage() {
    if (NP && typeof NP.manageSubscriptions === 'function') return NP.manageSubscriptions().catch(function () {
      root.open('https://play.google.com/store/account/subscriptions', '_blank');
    });
    root.open('https://play.google.com/store/account/subscriptions', '_blank');
    return Promise.resolve();
  }

  /* ----------------------------------------------------------- credits --- */
  function packIds() { return MBG.Credits ? MBG.Credits.PRODUCTS : []; }
  var packCache = null;

  /** Google Play prices of the credit packs: { productId: '€5.00', ..., value: price of 1 credit } */
  function packPrices() {
    if (!NP) {
      var preview = { value: MBG.Credits.RULES.creditValue };
      MBG.Credits.RULES.packs.forEach(function (p) { preview[p.id] = p.preview; });
      return Promise.resolve(preview);
    }
    if (packCache) return Promise.resolve(packCache);
    return NP.getProducts({ productIdentifiers: packIds(), productType: 'inapp' }).then(function (res) {
      var out = {};
      ((res && res.products) || []).forEach(function (p) { if (p && p.identifier && p.priceString) out[p.identifier] = p.priceString; });
      if (Object.keys(out).length) packCache = out;
      return out;
    });
  }

  /** Credits one pack purchase (once per purchase token), then consumes it so it can be bought again. */
  function settlePack(p, productId) {
    var pack = MBG.Credits.packOf(productId || (p && p.productIdentifier));
    if (!pack) return false;
    var added = MBG.Credits.addBought(pack.credits, p && p.purchaseToken);
    if (p && p.purchaseToken) NP.consumePurchase({ purchaseToken: p.purchaseToken }).catch(function () { /* next start */ });
    return added;
  }

  /**
   * Buys one credit pack for the player logged in. Resolves { ok: true } or
   * { ok: false, reason: 'cancelled'|'pending'|'web'|'error' }.
   */
  function buyCredits(productId) {
    if (!NP) return Promise.resolve({ ok: false, reason: 'web' });
    return NP.purchaseProduct({ productIdentifier: productId, productType: 'inapp', isConsumable: false, autoAcknowledgePurchases: false })
      .then(function (tx) {
        if (tx && tx.purchaseState != null && String(tx.purchaseState) !== '1') return { ok: false, reason: 'pending' };
        settlePack(tx, productId);
        return { ok: true };
      }, function (e) {
        var s = errText(e);
        if (/CANCEL/i.test(s)) return { ok: false, reason: 'cancelled' };
        if (/pending/i.test(s)) return { ok: false, reason: 'pending' };
        if (/ALREADY_OWNED/i.test(s)) return recoverCredits().then(function (n) { return n > 0 ? { ok: true } : { ok: false, reason: 'error' }; });
        return { ok: false, reason: 'error', detail: s };
      });
  }

  /** Packs that were paid but not yet consumed (app closed, delayed payment): credit them now. */
  function recoverCredits() {
    if (!NP || !MBG.Credits) return Promise.resolve(0);
    return NP.getPurchases({ productType: 'inapp' }).then(function (res) {
      var n = 0;
      ((res && res.purchases) || []).forEach(function (p) {
        if (!p || packIds().indexOf(p.productIdentifier) === -1 || String(p.purchaseState) !== '1') return;
        if (settlePack(p, p.productIdentifier)) n++;
      });
      return n;
    }, function () { return 0; });
  }

  /** For automated tests and the browser preview only: pretend a subscription was bought. */
  function previewSubscribe(active) {
    if (NP) return false;
    Shell.access.setSubscription(active !== false);
    notify();
    return true;
  }

  MBG.Billing = {
    PRODUCT_ID: PRODUCT_ID,
    PLANS: PLANS,
    available: !!NP,
    refresh: refresh,
    getPlans: getPlans,
    buy: buy,
    restore: restore,
    manage: manage,
    onChange: function (fn) { listeners.push(fn); },
    previewSubscribe: previewSubscribe,
    packPrices: packPrices,
    buyCredits: buyCredits,
    recoverCredits: recoverCredits
  };

  // Check the subscription when a screen opens and when the app comes back to the front.
  refresh();
  setTimeout(recoverCredits, 0);         // after js/app/credits.js has loaded
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { refresh(); recoverCredits(); } });
})(typeof self !== 'undefined' ? self : globalThis);
