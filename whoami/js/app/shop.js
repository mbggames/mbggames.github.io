/*!
 * Who Am I? MBG - the screens of the paid edition: the plan card on the home screen, "today's free
 * game is played" with the passes and subscriptions, the credits shop and the power-ups of a game.
 * The free edition shows none of them (MBG.Plan says 'unlimited').
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Pl = MBG.Plans, R = Pl.RULES;
  var el = Shell.el, t = Shell.t;

  function plan() { return MBG.Plan; }
  function paid() { return plan().status().mode !== 'unlimited'; }
  function when(ms) {
    var d = new Date(ms), now = new Date();
    var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    if (ms === tomorrow) return t('shop.tomorrow');
    return Shell.dateText(d.getTime(), { long: true });
  }
  function statusLine(s) {
    if (s.mode === 'gift') return '🎁 ' + t('shop.gift') + (s.until ? ' · ' + t('shop.giftUntil', { date: Shell.dateText(s.until, { year: true }) }) : '');
    if (s.mode === 'subscribed') return '⭐ ' + t('shop.subscribed', { plan: t('shop.plan.' + (s.plan || 'monthly')) });
    if (s.mode === 'pass') return '🎟️ ' + t('shop.passUntil', { time: new Date(s.until).toLocaleTimeString(Shell.getLang(), { hour: '2-digit', minute: '2-digit' }) });
    if (s.free > 0) return '🎮 ' + t('shop.freeLeft', { today: s.leftToday, week: s.leftWeek, max: R.free.perWeek });
    if (s.extra > 0) return '🎮 ' + t('shop.extraLeft', { n: s.extra });
    return '⏳ ' + t(s.why === 'week' ? 'shop.weekUsed' : 'shop.dayUsed', { when: when(s.nextAt) });
  }

  /** The plan card on the home screen (paid edition). */
  function card(box) {
    box.textContent = '';
    if (!paid()) { box.hidden = true; return; }
    box.hidden = false;
    var s = plan().status();
    var head = el('div', 'pc-head');
    head.appendChild(el('strong', null, statusLine(s)));
    if (s.mode !== 'gift') head.appendChild(el('span', 'pc-credits', '🪙 ' + plan().credits()));
    box.appendChild(head);
    // free access from MBG Games: no limits and power-ups free, nothing to buy
    if (s.mode === 'gift') { box.appendChild(el('p', 'muted small', t('shop.giftText'))); return; }
    var row = el('div', 'pc-btns');
    if (s.mode === 'free') {
      var up = el('button', 'btn submit small', '⭐ ' + t('shop.unlimited')); up.type = 'button';
      up.addEventListener('click', function () { openPlans(); });
      row.appendChild(up);
    }
    var cr = el('button', 'btn ghost small', '🪙 ' + t('shop.credits')); cr.type = 'button';
    cr.addEventListener('click', function () { openCredits(); });
    row.appendChild(cr);
    box.appendChild(row);
    if (MBG.Billing.preview) box.appendChild(el('p', 'muted small', '🧪 ' + t('shop.previewOn')));
  }

  /** Before a game: true when it may start; otherwise the plans sheet, then true if a plan was bought. */
  function gate() {
    if (plan().canPlay()) return Promise.resolve(true);
    return openPlans('limit').then(function () { return plan().canPlay(); });
  }

  /** "Today's free game is played" / MBG Unlimited: the day pass, the three plans, a game for credits. */
  function openPlans(reason) {
    var s = plan().status();
    var sh = Shell.sheet({ id: 'dlgPlans', title: reason === 'limit' ? '⏳ ' + t(s.why === 'week' ? 'shop.weekTitle' : 'shop.dayTitle') : '⭐ ' + t('shop.unlimited'), cls: 'plansheet' });
    var b = sh.body;
    if (reason === 'limit') b.appendChild(el('p', null, t(s.why === 'week' ? 'shop.weekText' : 'shop.dayText', { when: when(s.nextAt), max: R.free.perWeek })));
    else b.appendChild(el('p', null, statusLine(s)));
    var grid = el('div', 'plangrid');
    b.appendChild(grid);
    MBG.Billing.prices().then(function (pr) {
      function tile(id, price, title, text, badge, buy) {
        var c = el('button', 'plantile pt-' + id + (badge ? ' hot' : ''));
        c.type = 'button';
        if (badge) c.appendChild(el('span', 'pt-badge', badge));
        c.appendChild(el('strong', null, title));
        c.appendChild(el('span', 'pt-price', price));
        c.appendChild(el('span', 'muted small', text));
        c.addEventListener('click', function () {
          c.disabled = true;
          buy().then(function (r) {
            c.disabled = false;
            if (r.ok) { sh.close(); Shell.toast('🎉 ' + t('shop.thanks')); }
            else if (r.reason === 'web') Shell.toast(t('shop.inApp'), 3500);
            else if (r.reason === 'pending') Shell.toast(t('shop.pending'), 3500);
            else if (r.reason !== 'cancelled') Shell.toast(t('shop.error'), 3500);
          });
        });
        grid.appendChild(c);
      }
      tile('daypass', pr.daypass, '🎟️ ' + t('shop.dayPass'), t('shop.dayPassText'), null, function () { return MBG.Billing.buyItem(R.pass.id); });
      R.plans.forEach(function (p) {
        var save = Pl.saving(p.id);
        tile(p.id, pr[p.id], '⭐ ' + t('shop.plan.' + p.id), t('shop.planText.' + p.id, { bonus: p.bonus }) + (save > 0 ? ' · ' + t('shop.save', { n: save }) : ''),
          p.id === 'yearly' ? t('shop.best') : p.popular ? t('shop.popular') : null, function () { return MBG.Billing.subscribe(p.id); });
      });
    });
    if (reason === 'limit') {
      var cost = plan().cost('game');
      var g = el('button', 'btn ghost', '🪙 ' + t('shop.gameForCredits', { n: cost, have: plan().credits() })); g.type = 'button';
      g.disabled = plan().credits() < cost;
      g.addEventListener('click', function () { if (plan().buyGame().ok) { sh.close(); Shell.toast('🎮 ' + t('shop.gameBought')); } });
      b.appendChild(g);
      var w = el('button', 'btn ghost', '👀 ' + t('shop.watchFree')); w.type = 'button';
      w.addEventListener('click', function () { sh.close(); if (MBG.WhoSetup) Shell.writeJson('MBG.Who.next', { setup: MBG.WhoSetup.last(), at: Date.now() }); Shell.go('play.html?games=1'); });
      b.appendChild(w);
    }
    var foot = el('div', 'dlg-actions');
    var rs = el('button', 'linkbtn', t('shop.restore')); rs.type = 'button';
    rs.addEventListener('click', function () { MBG.Billing.restore().then(function (r) { Shell.toast(r.active ? '⭐ ' + t('shop.restored') : t('shop.noneFound')); }); });
    foot.appendChild(rs);
    if (plan().subscribed()) {
      var mg = el('button', 'linkbtn', t('shop.manage')); mg.type = 'button';
      mg.addEventListener('click', function () { MBG.Billing.manage(); });
      foot.appendChild(mg);
    }
    b.appendChild(foot);
    b.appendChild(el('p', 'muted small', t('shop.fine')));
    if (MBG.Billing.preview) b.appendChild(el('p', 'muted small', '🧪 ' + t('shop.previewNote')));
    return Shell.closed(sh.dlg);
  }

  /** The credits: balance, packs, what they buy and how to earn them. */
  function openCredits() {
    var sh = Shell.sheet({ id: 'dlgCredits', title: '🪙 ' + t('shop.credits'), cls: 'plansheet' });
    var b = sh.body;
    var bal = el('p', 'pc-balance', t('shop.balance', { n: plan().credits() }));
    b.appendChild(bal);
    var grid = el('div', 'plangrid');
    b.appendChild(grid);
    MBG.Billing.prices().then(function (pr) {
      R.packs.forEach(function (p, i) {
        var c = el('button', 'plantile' + (i === 2 ? ' hot' : ''));
        c.type = 'button';
        if (p.extra) c.appendChild(el('span', 'pt-badge', '+' + p.extra));
        c.appendChild(el('strong', null, '🪙 ' + p.credits));
        c.appendChild(el('span', 'pt-price', pr.packs[p.id]));
        c.addEventListener('click', function () {
          MBG.Billing.buyItem(p.id).then(function (r) {
            if (r.ok) { bal.textContent = t('shop.balance', { n: plan().credits() }); Shell.toast('🪙 +' + p.credits); }
            else if (r.reason === 'web') Shell.toast(t('shop.inApp'), 3500);
          });
        });
        grid.appendChild(c);
      });
    });
    var C = R.costs, E = plan().earnRules ? plan().earnRules() : R.earn;
    var bon = R.plans.map(function (p) { return p.bonus; });
    b.appendChild(el('h3', null, '⚡ ' + t('shop.spendTitle')));
    var ul = el('ul', 'shoplist');
    [['💡', t('shop.spend.hint'), C.hint], ['⏱️', t('shop.spend.time'), C.time], ['❓', t('shop.spend.questions'), C.questions],
      ['✏️', t('shop.spend.spell'), C.spell], ['🎮', t('shop.spend.game'), C.game]].forEach(function (x) {
      var li = el('li'); li.appendChild(el('span', null, x[0] + ' ' + x[1])); li.appendChild(el('b', 'num', '🪙 ' + x[2])); ul.appendChild(li);
    });
    b.appendChild(ul);
    b.appendChild(el('p', 'muted small', t('shop.spendNote')));
    b.appendChild(el('h3', null, '🎁 ' + t('shop.earnTitle')));
    var ul2 = el('ul', 'shoplist');
    [['🏆', t('shop.earn.firstWin'), E.firstWin], ['🏅', t('shop.earn.best'), E.best], ['🔥', t('shop.earn.streak'), E.streak],
      ['⚖️', t('shop.earn.judge', { n: E.judgePerDay }), E.judge], ['⭐', t('shop.earn.member'), Math.min.apply(null, bon) + '–' + Math.max.apply(null, bon)]].forEach(function (x) {
      var li = el('li'); li.appendChild(el('span', null, x[0] + ' ' + x[1])); li.appendChild(el('b', 'num', '+' + x[2])); ul2.appendChild(li);
    });
    b.appendChild(ul2);
    // free credits are a taste, not a way around paying: a weekly limit (higher for top players)
    if (plan().earnLeft) b.appendChild(el('p', 'muted small', t(plan().isTop() ? 'shop.earnCapTop' : 'shop.earnCap', { max: E.perWeek, left: plan().earnLeft(), top: R.topRating.toLocaleString(Shell.getLang()) })));
    var log = plan().wallet().log.slice(0, 6);
    if (log.length) {
      b.appendChild(el('h3', null, t('shop.history')));
      var ul3 = el('ul', 'shoplist small');
      log.forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'muted', Shell.ago(x.at) + ' · ' + t('shop.why.' + (['welcome', 'pack', 'firstWin', 'best', 'streak', 'judge', 'member', 'hint', 'time', 'questions', 'spell', 'game'].indexOf(x.why) !== -1 ? x.why : 'pack')))); li.appendChild(el('b', 'num', (x.n > 0 ? '+' : '') + x.n)); ul3.appendChild(li); });
      b.appendChild(ul3);
    }
    if (MBG.Billing.preview) b.appendChild(el('p', 'muted small', '🧪 ' + t('shop.previewNote')));
    return Shell.closed(sh.dlg);
  }

  /** In a practice game: the power-ups (o.act(kind) does it; returns false if not possible now). */
  function boosts(o) {
    var sh = Shell.sheet({ id: 'dlgBoost', title: '⚡ ' + o.L('boost.title') });
    var b = sh.body;
    var free = !paid();
    b.appendChild(el('p', 'muted', free ? o.L('boost.free') : o.L('boost.text', { n: plan().credits() })));
    var col = el('div', 'btncol');
    [['time', '⏱️', o.L('boost.time')], ['questions', '❓', o.L('boost.questions')], ['spell', '✏️', o.L('boost.spell')]].forEach(function (x) {
      var cost = plan().cost(x[0]);
      var btn = el('button', 'btn ghost boostbtn', x[1] + ' ' + x[2] + (cost ? '  ·  🪙 ' + cost : '')); btn.type = 'button';
      btn.disabled = cost > plan().credits();
      btn.addEventListener('click', function () {
        if (o.can && !o.can(x[0])) { Shell.toast(o.L('boost.notNow')); return; }
        var r = plan().spend(x[0]);
        if (!r.ok) { sh.close(); openCredits(); return; }
        sh.close();
        o.act(x[0]);
      });
      col.appendChild(btn);
    });
    b.appendChild(col);
    if (!free) {
      var more = el('button', 'linkbtn', '🪙 ' + t('shop.getCredits')); more.type = 'button';
      more.addEventListener('click', function () { sh.close(); openCredits(); });
      b.appendChild(more);
    }
    b.appendChild(el('p', 'muted small', o.L('boost.note')));
  }

  MBG.Shop = { card: card, gate: gate, openPlans: openPlans, openCredits: openCredits, boosts: boosts, paid: paid, statusLine: statusLine };
})(typeof self !== 'undefined' ? self : globalThis);
