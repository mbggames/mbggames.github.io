/*!
 * MBG Puzzles - hint credits (both games), kept on the phone for each player name.
 *
 * After the 3rd try (Word Puzzle at the Expert level: the 4th) a hint can open one letter or
 * digit; it is paid with credits:
 *   free credits    every day, for every player name:
 *                     free edition  10 a day, at most 50 a week
 *                     paid edition   5 a day, at most 15 a week
 *                   used first, 1 credit per hint; what is not used is not kept
 *   own credits     earned with high scores (both editions) or bought (paid edition, packs of
 *                   50 / 100 / 200 credits for €5 / €10 / €20 - one credit is worth €0.10);
 *                   within one game, hints paid with own credits cost 1, 1, 2, 2, 3, 3 (then 4)
 *                   credits; the next game starts again at 1
 *   the answer      free edition free; paid edition 9 credits (free credits first); giving up
 *                   with a new game is always free
 *   rewards         a win of a player logged in with a name earns credits by score: 5,000
 *                   points 1 credit … 100,000 points 12 … 200,000 or more 25 (RULES.rewards);
 *                   a solved puzzle of the day earns credits for everyone (js/shared/daily.js)
 *
 * Anonymous play shares one wallet on the phone and earns no rewards. Credits stay on this
 * phone for now (online accounts come later), so uninstalling the app loses them.
 * Google Play prices are read at runtime; the € amounts here are only for the browser preview.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;

  var RULES = {
    showAfterTries: 3,                                    // the hint button appears after the 3rd try,
    showAfterTriesExpert: 4,                              // Word Puzzle at the Expert level: after the 4th
    freeCredits: { free: { day: 10, week: 50 }, paid: { day: 5, week: 15 } },
    steps: [1, 1, 2, 2, 3, 3, 4],                         // own credits per hint, in one game
    revealCost: 9,                                        // paid edition: see the answer
    creditValue: '€0.10',
    packs: [
      { id: 'mbg_credits_50', credits: 50, preview: '€5' },
      { id: 'mbg_credits_100', credits: 100, preview: '€10' },
      { id: 'mbg_credits_200', credits: 200, preview: '€20' }
    ],
    // [score, credits]: in between the credits grow in a straight line; 200,000 or more: 25
    rewards: [[5000, 1], [10000, 2], [25000, 3], [50000, 6], [100000, 12], [200000, 25]]
  };
  var PRODUCTS = RULES.packs.map(function (p) { return p.id; });
  var KEY = 'MBG.App.credits';
  var DAY = 86400000;

  function t(k, p) { return Shell.t(k, p); }
  function now() { return Date.now(); }

  /* ------------------------------------------------------------ storage --- */
  function load() {
    var d = null;
    try { d = JSON.parse(Shell.store.getItem(KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (!d.players || typeof d.players !== 'object') d.players = {};
    if (!Array.isArray(d.granted)) d.granted = [];
    return d;
  }
  var state = load();
  function save() { try { Shell.store.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  var listeners = [];
  function changed() { save(); listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); }

  /** Days and Monday-to-Sunday weeks in the phone's own time zone. */
  function calendar(ms) {
    var d = new Date(ms);
    var day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
    return { day: day, week: Math.floor((day + 3) / 7) };        // 1 Jan 1970 was a Thursday
  }
  function currentUser() { return Shell.getUser ? Shell.getUser() : null; }
  function isRegistered(u) { return !!(u && u.mode === 'registered' && u.name); }
  function keyOf(u) { return isRegistered(u) ? 'u:' + String(u.name).normalize('NFC').trim().toLowerCase() : 'anon'; }

  function wallet(u) {
    u = u || currentUser();
    var k = keyOf(u);
    var w = state.players[k];
    if (!w || typeof w !== 'object') w = state.players[k] = { balance: 0, earned: 0, bought: 0, day: -1, usedDay: 0, week: -1, usedWeek: 0 };
    var c = calendar(now());
    if (w.day !== c.day) { w.day = c.day; w.usedDay = 0; }
    if (w.week !== c.week) { w.week = c.week; w.usedWeek = 0; }
    return w;
  }
  function limits() { return RULES.freeCredits[Shell.free ? 'free' : 'paid']; }

  /**
   * Credits of a player (default: the one logged in):
   * { freeLeft, balance, total, earned, bought, registered, name, nextFreeAt (0 while free ones are left) }
   */
  function status(u) {
    u = u || currentUser();
    var w = wallet(u), L = limits();
    var dayLeft = Math.max(0, L.day - w.usedDay), weekLeft = Math.max(0, L.week - w.usedWeek);
    var freeLeft = Math.min(dayLeft, weekLeft);
    var next = 0;
    if (!freeLeft) {
      var d = new Date(now());
      if (weekLeft === 0) {                                          // next Monday
        var back = (d.getDay() + 6) % 7;
        next = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back + 7).getTime();
      } else {
        next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      }
    }
    return {
      freeLeft: freeLeft, balance: w.balance, total: freeLeft + w.balance, earned: w.earned, bought: w.bought,
      registered: isRegistered(u), name: isRegistered(u) ? u.name : null, nextFreeAt: next, limits: L
    };
  }

  /** What the next hint costs. paidHints: hints of this game already paid with own credits. */
  function quoteHint(paidHints, u) {
    var s = status(u);
    if (s.freeLeft > 0) return { source: 'free', cost: 1, ok: true, status: s };
    var cost = RULES.steps[Math.min(paidHints || 0, RULES.steps.length - 1)];
    return { source: 'own', cost: cost, ok: s.balance >= cost, status: s };
  }
  function spendHint(q, u) {
    var w = wallet(u);
    if (q.source === 'free') {
      if (status(u).freeLeft < 1) return false;
      w.usedDay += 1; w.usedWeek += 1;
    } else {
      if (w.balance < q.cost) return false;
      w.balance -= q.cost;
    }
    changed();
    return true;
  }

  /** Seeing the whole answer: free in the free edition, RULES.revealCost credits otherwise. */
  function quoteReveal(u) {
    if (Shell.free) return { free: true, ok: true, cost: 0 };
    var s = status(u);
    var fromFree = Math.min(s.freeLeft, RULES.revealCost);
    var fromOwn = RULES.revealCost - fromFree;
    return { free: false, cost: RULES.revealCost, fromFree: fromFree, fromOwn: fromOwn, ok: s.balance >= fromOwn, status: s };
  }
  function spendReveal(q, u) {
    if (q.free) return true;
    var w = wallet(u);
    if (w.balance < q.fromOwn || status(u).freeLeft < q.fromFree) return false;
    w.usedDay += q.fromFree; w.usedWeek += q.fromFree;
    w.balance -= q.fromOwn;
    changed();
    return true;
  }

  /** Credits earned by a score (0 below 5,000). */
  function rewardFor(score) {
    var R = RULES.rewards;
    score = Number(score) || 0;
    if (score < R[0][0]) return 0;
    if (score >= R[R.length - 1][0]) return R[R.length - 1][1];
    for (var i = 0; i < R.length - 1; i++) {
      var a = R[i], b = R[i + 1];
      if (score < b[0]) return Math.floor(a[1] + (b[1] - a[1]) * (score - a[0]) / (b[0] - a[0]));
    }
    return 0;
  }
  /** A win: players logged in with a name earn credits by score. Returns the credits added. */
  function grantReward(score, u) {
    u = u || currentUser();
    if (!isRegistered(u)) return 0;
    var n = rewardFor(score);
    if (!n) return 0;
    var w = wallet(u);
    w.balance += n; w.earned += n;
    changed();
    return n;
  }

  /** A reward that is not about the score (the puzzle of the day): for every player, also
   *  Anonymous. Returns the credits added. */
  function grantBonus(n, u) {
    n = Math.max(0, Math.round(Number(n) || 0));
    if (!n) return 0;
    var w = wallet(u);
    w.balance += n; w.earned += n;
    changed();
    return n;
  }

  /** A pack was bought (token: Google Play's purchase token, so each purchase counts once). */
  function addBought(credits, token, u) {
    if (token && state.granted.indexOf(token) !== -1) return false;
    var w = wallet(u);
    w.balance += credits; w.bought += credits;
    if (token) state.granted = state.granted.concat([token]).slice(-200);
    changed();
    return true;
  }
  function packOf(productId) { return RULES.packs.filter(function (p) { return p.id === productId; })[0] || null; }

  /** "3 days: +3, 7 days: +7, …" - the streak bonuses of the puzzles of the day. */
  function bonusList() {
    return MBG.Daily ? MBG.Daily.BONUS.map(function (b) { return t('daily.bonusItem', { days: b[0], n: b[1] }); })
      .join(Shell.getLang() === 'ar' ? '، ' : ', ') : '';
  }

  /* ------------------------------------------------------------ dialogs --- */
  function fmt(n) {
    if (MBG.AppText) return MBG.AppText.num(Shell.getLang(), n);
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function dialog(id, cls) {
    var d = document.getElementById(id);
    if (d) return d;
    d = el('dialog', 'dlg ' + cls);
    d.id = id;
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    return d;
  }
  function show(d) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
  function closed(d) {
    return new Promise(function (resolve) {
      d.addEventListener('close', function once() { d.removeEventListener('close', once); resolve(); });
    });
  }

  /**
   * A short question with up to three buttons. opts: { title, text, note, buttons: [{ id, label,
   * main }] } - resolves the id of the button pressed, or null.
   */
  function ask(opts) {
    var d = dialog('dlgCreditAsk', 'creditask');
    d.setAttribute('aria-labelledby', 'caTitle');
    d.innerHTML = '<div class="dlg-body"><h2 id="caTitle"></h2><p id="caText"></p><p class="muted" id="caNote" hidden></p>' +
      '<div class="dlg-actions" id="caActions"></div></div>';
    d.querySelector('#caTitle').textContent = opts.title;
    d.querySelector('#caText').textContent = opts.text;
    if (opts.note) { d.querySelector('#caNote').textContent = opts.note; d.querySelector('#caNote').hidden = false; }
    var result = null;
    opts.buttons.forEach(function (b) {
      var btn = el('button', 'btn ' + (b.main ? 'submit' : 'ghost'), b.label);
      btn.type = 'button';
      btn.id = 'ca-' + b.id;
      btn.addEventListener('click', function () { result = b.id; d.close(); });
      d.querySelector('#caActions').appendChild(btn);
    });
    show(d);
    return closed(d).then(function () { return result; });
  }

  /**
   * The credits sheet: what the player has, how hints cost, rewards and (paid edition) buying.
   * opts: { need: credits needed now (shown at the top) }. Resolves { bought: credits added }.
   */
  function openSheet(opts) {
    opts = opts || {};
    var d = dialog('dlgCredits', 'sheet creditsheet');
    d.setAttribute('aria-labelledby', 'crTitle');
    d.innerHTML =
      '<div class="sheet-head"><h2 id="crTitle"></h2><button type="button" class="btn ghost small" id="crClose"></button></div>' +
      '<div class="sheet-scroll cr">' +
      '  <p class="pw-msg" id="crNeed" hidden></p>' +
      '  <div class="cr-total"><span class="cr-bulb" aria-hidden="true">💡</span><span><strong id="crTotal"></strong><span id="crWho"></span></span></div>' +
      '  <ul class="cr-lines"><li id="crFree"></li><li id="crOwn"></li></ul>' +
      '  <div id="crBuyBox" hidden><h3 id="crBuyTitle"></h3><div class="cr-packs" id="crPacks"></div><p class="muted" id="crPhone"></p></div>' +
      '  <p class="pw-msg" id="crMsg" role="status" aria-live="polite" hidden></p>' +
      '  <h3 id="crHowTitle"></h3><p id="crHow"></p>' +
      '  <h3 id="crRewTitle"></h3><p id="crRew"></p>' +
      '</div>';
    var $ = function (id) { return d.querySelector('#' + id); };
    var added = 0, busy = false, prices = null;
    var msg = function (text) { $('crMsg').textContent = text || ''; $('crMsg').hidden = !text; };
    var paint = function () {
      var s = status();
      $('crTitle').textContent = t('credits.title');
      $('crClose').textContent = t('btn.close');
      if (opts.need) { $('crNeed').textContent = t('credits.need', { n: opts.need, have: s.total }); $('crNeed').hidden = false; }
      $('crTotal').textContent = t('credits.total', { n: s.total });
      $('crWho').textContent = ' · ' + (s.registered ? s.name : t('credits.anon'));
      $('crFree').textContent = t('credits.free', { n: s.freeLeft, day: s.limits.day, week: s.limits.week }) +
        (s.freeLeft ? '' : ' ' + t('credits.freeNext', { time: Shell.duration(Math.max(0, s.nextFreeAt - now())) }));
      $('crOwn').textContent = t(Shell.free ? 'credits.ownFree' : 'credits.own', { n: s.balance });
      $('crHowTitle').textContent = t('credits.howTitle');
      $('crHow').textContent = t(Shell.free ? 'credits.howFree' : 'credits.how', { steps: RULES.steps.slice(0, 6).join(', ') });
      $('crRewTitle').textContent = t('credits.rewardsTitle');
      $('crRew').textContent = t('credits.rewards', {
        list: RULES.rewards.map(function (r) { return fmt(r[0]) + (r === RULES.rewards[RULES.rewards.length - 1] ? '+' : '') + ' → ' + r[1]; }).join(' · ')
      }) + (MBG.Daily ? ' ' + t('credits.dailyRewards', { n: MBG.Daily.REWARD, list: bonusList() }) : '');
      if (!Shell.free) {
        $('crBuyBox').hidden = false;
        $('crBuyTitle').textContent = t('credits.buyTitle', { value: (prices && prices.value) || RULES.creditValue });
        $('crPhone').textContent = t('credits.phoneNote', { name: s.registered ? s.name : t('credits.anon') });
        var box = $('crPacks');
        box.textContent = '';
        RULES.packs.forEach(function (p) {
          var price = prices ? prices[p.id] : null;
          var b = el('button', 'btn ghost cr-pack', t('credits.pack', { n: p.credits, price: price || '…' }));
          b.type = 'button';
          b.disabled = busy || !price;
          b.addEventListener('click', function () { buy(p); });
          box.appendChild(b);
        });
      }
    };
    var buy = function (p) {
      if (busy) return;
      busy = true; msg(''); paint();
      MBG.Billing.buyCredits(p.id).then(function (res) {
        busy = false;
        if (res.ok) { added += p.credits; msg(t('credits.bought', { n: p.credits })); }
        else if (res.reason === 'web') msg(t('credits.web'));
        else if (res.reason === 'pending') msg(t('credits.pending'));
        else if (res.reason !== 'cancelled') msg(t('credits.error'));
        paint();
      });
    };
    $('crClose').addEventListener('click', function () { d.close(); });
    paint();
    show(d);
    if (!Shell.free) {
      MBG.Billing.packPrices().then(function (pr) {
        prices = pr || {};
        if (!Object.keys(prices).length) msg(t('credits.noStore'));
        paint();
      }, function () { prices = {}; msg(t('credits.noStore')); paint(); });
    }
    return closed(d).then(function () { return { bought: added }; });
  }

  MBG.Credits = {
    RULES: RULES,
    PRODUCTS: PRODUCTS,
    status: status,
    quoteHint: quoteHint,
    spendHint: spendHint,
    quoteReveal: quoteReveal,
    spendReveal: spendReveal,
    rewardFor: rewardFor,
    grantReward: grantReward, grantBonus: grantBonus, bonusList: bonusList,
    addBought: addBought,
    packOf: packOf,
    ask: ask,
    openSheet: openSheet,
    onChange: function (fn) { listeners.push(fn); },
    fmt: fmt,
    _state: function () { return state; },
    _setNow: function (fn) { now = fn; }                // tests only
  };
})(typeof self !== 'undefined' ? self : globalThis);
