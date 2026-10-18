/*!
 * MBG Puzzles - the subscription screen ("Play without limits").
 * Opens as a sheet on every screen. What Google Play requires, and how it is met here:
 *  - price and billing period of every plan are visible before buying (prices from Google Play)
 *  - automatic renewal and how to cancel are stated next to the plans
 *  - a clear way out ("Not now") that says when the next free game is ready
 *  - no plan is pre-selected or highlighted; each plan opens Google Play's own purchase sheet
 *  - restore and manage-subscription links, and the privacy policy
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell, Billing = MBG.Billing;

  var dlg = null;
  var state = { game: null, resolve: null, busy: false, timer: null };

  function t(k, p) { return Shell.t(k, p); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function toast(msg) {
    var tEl = document.getElementById('toast');
    if (!tEl) {
      tEl = el('div', 'toast');
      tEl.id = 'toast';
      tEl.setAttribute('role', 'status');
      tEl.setAttribute('aria-live', 'polite');
      tEl.hidden = true;
      document.body.appendChild(tEl);
    }
    tEl.textContent = msg;
    tEl.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { tEl.hidden = true; }, 2600);
  }

  function build() {
    if (dlg) return dlg;
    dlg = el('dialog', 'dlg sheet paywall');
    dlg.id = 'dlgPaywall';
    dlg.setAttribute('aria-labelledby', 'pwTitle');
    dlg.innerHTML =
      '<div class="sheet-head"><h2 id="pwTitle"></h2>' +
      '<button type="button" class="btn ghost small" id="pwClose"></button></div>' +
      '<div class="sheet-scroll">' +
      '  <div class="promo"><div class="promo-mark" aria-hidden="true"><span class="mt o">7</span><span class="mt q">A</span></div>' +
      '    <div class="promo-text"><strong id="pwPromo"></strong><span id="pwPromoText"></span></div></div>' +
      '  <p class="pw-reason" id="pwReason"></p>' +
      '  <h3 class="pw-pick" id="pwPick"></h3>' +
      '  <div class="pw-plans" id="pwPlans"></div>' +
      '  <p class="pw-msg" id="pwMsg" role="status" aria-live="polite" hidden></p>' +
      '  <div class="pw-links"><button type="button" class="linkbtn" id="pwRestore"></button>' +
      '    <button type="button" class="linkbtn" id="pwManage" hidden></button>' +
      '    <a class="linkbtn" id="pwPrivacy" href="privacy.html"></a></div>' +
      '</div>' +
      // The renewal terms sit in the fixed footer, so they are always visible next to the plans.
      '<div class="pw-foot"><p class="pw-terms" id="pwTerms"></p>' +
      '<button type="button" class="btn ghost wide" id="pwNotNow"></button></div>';
    document.body.appendChild(dlg);

    dlg.querySelector('#pwClose').addEventListener('click', function () { close(); });
    dlg.querySelector('#pwNotNow').addEventListener('click', function () { close(); });
    dlg.querySelector('#pwRestore').addEventListener('click', restore);
    dlg.querySelector('#pwManage').addEventListener('click', function () { Billing.manage(); });
    dlg.querySelector('#pwPrivacy').addEventListener('click', function (e) {
      e.preventDefault();
      close();
      try { root.dispatchEvent(new CustomEvent('mbg:leave')); } catch (err) { /* ignore */ }
      root.location.href = 'privacy.html';
    });
    dlg.addEventListener('close', function () {
      clearInterval(state.timer);
      var r = state.resolve;
      state.resolve = null;
      if (r) r({ subscribed: Shell.access.isSubscribed() });
    });
    return dlg;
  }

  function setMsg(text, ok) {
    var m = dlg.querySelector('#pwMsg');
    m.textContent = text || '';
    m.hidden = !text;
    m.classList.toggle('ok', !!ok);
  }

  /** Texts that depend on the plan status and the clock. */
  function refreshTexts() {
    var game = state.game || 'codebreaker';
    var s = Shell.access.status(game);
    var reason, notNow;
    if (s.mode === 'subscribed') {
      reason = t('pay.reasonSub');
      notNow = t('btn.close');
    } else if (s.mode === 'trial') {
      reason = t('pay.reasonTrial', { daysLeft: s.daysLeft });
      notNow = t('pay.notNowTrial');
    } else if (!s.available) {
      var time = Shell.duration(s.msLeft);
      reason = t('pay.reasonLocked', { game: Shell.gameName(game), time: time });
      notNow = t('pay.notNowLocked', { time: time });
    } else {
      reason = t('pay.reasonFree');
      notNow = t('pay.notNow');
    }
    dlg.querySelector('#pwReason').textContent = reason;
    dlg.querySelector('#pwNotNow').textContent = notNow;
    var sub = s.mode === 'subscribed';
    dlg.querySelector('#pwPick').hidden = sub;
    dlg.querySelector('#pwPlans').hidden = sub;
    dlg.querySelector('#pwTerms').hidden = sub;
    dlg.querySelector('#pwManage').hidden = !sub || !Billing.available;
    dlg.querySelector('.promo').hidden = sub;
  }

  function renderPlans() {
    var box = dlg.querySelector('#pwPlans');
    box.textContent = '';
    box.appendChild(el('p', 'pw-terms', t('pay.loading')));
    setMsg('');
    Billing.getPlans().then(function (plans) {
      box.textContent = '';
      plans.forEach(function (p) {
        var b = el('button', 'plan');
        b.type = 'button';
        b.dataset.plan = p.id;
        b.appendChild(el('span', 'plan-name', t('plan.' + p.id)));
        b.appendChild(el('span', 'plan-price', p.priceString));
        b.appendChild(el('span', 'plan-per', t('per.' + p.id)));
        b.setAttribute('aria-label', t('plan.' + p.id) + ': ' + p.priceString + ' ' + t('per.' + p.id));
        b.addEventListener('click', function () { buy(p.id); });
        box.appendChild(b);
      });
      if (plans.length && plans[0].preview) setMsg(t('pay.preview'), true);
    }, function () {
      box.textContent = '';
      var retry = el('button', 'btn ghost small', t('pay.retry'));
      retry.type = 'button';
      retry.addEventListener('click', renderPlans);
      setMsg(t('pay.unavailable'));
      box.appendChild(retry);
    });
  }

  function setBusy(on) {
    state.busy = on;
    Array.prototype.forEach.call(dlg.querySelectorAll('.plan, #pwRestore'), function (b) { b.disabled = on; });
  }

  function buy(planId) {
    if (state.busy) return;
    setBusy(true);
    if (Billing.available) setMsg(t('pay.busy'), true);
    Billing.buy(planId).then(function (r) {
      setBusy(false);
      if (r.ok) {
        toast(t('pay.thanks'));
        close();
        return;
      }
      if (r.reason === 'cancelled') { setMsg(''); return; }
      if (r.reason === 'pending') { setMsg(t('pay.pending')); return; }
      if (r.reason === 'web') { setMsg(t('pay.webOnly')); return; }
      setMsg(t('pay.error'));
    });
  }

  function restore() {
    if (state.busy) return;
    setBusy(true);
    Billing.restore().then(function (r) {
      setBusy(false);
      if (r.web) { setMsg(t('pay.webOnly')); return; }
      if (r.active) { toast(t('pay.restored')); close(); return; }
      setMsg(t('pay.noneFound'));
    });
  }

  function close() {
    if (!dlg || !dlg.open) return;
    try { dlg.close('done'); } catch (e) { dlg.removeAttribute('open'); }
  }

  /**
   * Opens the sheet. opts.game: 'codebreaker' | 'word' (the game the player is in, for
   * the "free again in ..." text). Resolves { subscribed } when the sheet closes.
   */
  function open(opts) {
    build();
    if (dlg.open) return Promise.resolve({ subscribed: Shell.access.isSubscribed() });
    state.game = (opts && opts.game) || null;
    dlg.querySelector('#pwTitle').textContent = t('pay.title');
    dlg.querySelector('#pwClose').textContent = t('btn.close');
    dlg.querySelector('#pwPromo').textContent = t('promo.title');
    dlg.querySelector('#pwPromoText').textContent = t('promo.text');
    dlg.querySelector('#pwPick').textContent = t('pay.pick');
    dlg.querySelector('#pwTerms').textContent = t('pay.terms');
    dlg.querySelector('#pwRestore').textContent = t('pay.restore');
    dlg.querySelector('#pwManage').textContent = t('btn.manage');
    dlg.querySelector('#pwPrivacy').textContent = t('home.privacy');
    refreshTexts();
    if (!Shell.access.isSubscribed()) renderPlans(); else setMsg('');
    setBusy(false);
    clearInterval(state.timer);
    state.timer = setInterval(refreshTexts, 15000);
    return new Promise(function (resolve) {
      state.resolve = resolve;
      try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
      var first = dlg.querySelector('#pwNotNow');
      try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    });
  }

  Billing.onChange(function () { if (dlg && dlg.open) refreshTexts(); });

  MBG.Paywall = { open: open, close: close, isOpen: function () { return !!(dlg && dlg.open); }, toast: toast };
})(typeof self !== 'undefined' ? self : globalThis);
