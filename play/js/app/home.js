/*!
 * MBG Puzzles - home screen: the list of both games, the language flags, the plan
 * (or, in the free edition, the "free · no ads · no limits" card) and closing the app.
 *
 * Closing: a game never closes the app - Quit, Back and N after a game all lead here.
 * Only this screen closes the app: the power button or Back asks "Close MBG Puzzles?",
 * then a short goodbye, then the Android app closes itself.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell;
  var $ = function (id) { return document.getElementById(id); };
  var GAMES = ['codebreaker', 'word'];
  var WORD_TILES = { en: 'WORD', sq: 'FJALË', bs: 'RIJEČ', de: 'WORT', es: 'PALABRA', fr: 'MOTS', tr: 'KELİME',
    pl: 'SŁOWO', pt: 'PALAVRA', ar: 'كلمة' };
  var WORD_MARKS = ['o', 'x', 'q', 'o', 'q'];

  function t(k, p) { return Shell.t(k, p); }
  function cap(id) { return id.charAt(0).toUpperCase() + id.slice(1); }

  function chipFor(game) {
    var s = Shell.access.status(game);
    if (s.mode === 'unlimited') return { cls: 'sub', text: t('chip.unlimited') };
    if (s.mode === 'subscribed') return { cls: 'sub', text: t('chip.sub') };
    if (s.mode === 'trial') return { cls: 'trial', text: t('chip.trial') };
    if (s.available) return { cls: 'ready', text: t('chip.ready') };
    return { cls: 'wait', text: t('chip.next', { time: Shell.duration(s.msLeft) }) };
  }

  function renderPlan() {
    var card = $('planCard');
    if (Shell.preview && MBG.Preview) { MBG.Preview.planCard(card); return; }
    if (Shell.free) {
      card.classList.add('is-free');
      $('planK').textContent = t('home.tagline');
      $('planTitle').textContent = t('free.title');
      $('planSub').textContent = t('free.text');
      $('btnPlans').hidden = true;
      $('promo').hidden = true;
      return;
    }
    var s = Shell.access.status('codebreaker');
    card.classList.toggle('is-sub', s.mode === 'subscribed');
    $('planK').textContent = t('plan.label');
    if (s.mode === 'subscribed') {
      $('planTitle').textContent = t('plan.sub');
      $('planSub').textContent = t('plan.subText');
    } else if (s.mode === 'trial') {
      $('planTitle').textContent = t('plan.trial', { daysLeft: s.daysLeft });
      $('planSub').textContent = t('plan.trialText');
    } else {
      $('planTitle').textContent = t('plan.free');
      $('planSub').textContent = t('plan.freeText');
    }
    $('btnPlans').textContent = s.mode === 'subscribed' ? t('btn.manage') : t('btn.plans');
    $('btnPlans').hidden = s.mode === 'subscribed' && !MBG.Billing.available;
    $('promo').hidden = s.mode === 'subscribed';
    $('promoTitle').textContent = t('promo.title');
    $('promoText').textContent = t('promo.text');
  }

  function render() {
    var lang = Shell.getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = MBG.AppText.RTL.indexOf(lang) !== -1 ? 'rtl' : 'ltr';
    $('appBy').textContent = t('app.by');
    if ($('btnLang').getAttribute('data-lang') !== lang) MBG.LangMenu.paint($('btnLang'), lang);
    $('btnExit').setAttribute('aria-label', t('home.exit'));
    $('btnExit').title = t('home.exit');
    $('home').querySelector('.games').setAttribute('aria-label', t('home.games'));

    renderPlan();

    GAMES.forEach(function (g) {
      var C = cap(g);
      $('name' + C).textContent = Shell.gameName(g);
      $('text' + C).textContent = t('game.' + g + '.text');
      var chip = chipFor(g);
      var el = $('chip' + C);
      el.className = 'chip ' + chip.cls;
      el.textContent = chip.text;
      var link = $('card' + C);
      link.querySelector('.play-lbl').textContent = t('home.play');
      link.setAttribute('aria-label', Shell.gameName(g) + '. ' + t('game.' + g + '.text') + ' ' + chip.text);
    });

    var expert = (Shell.getPrefs() || {}).wordPool === 'all';
    $('lvlWord').hidden = !expert;
    $('lvlWord').textContent = t('home.expert');

    var word = WORD_TILES[lang] || WORD_TILES.en;
    var tiles = $('tilesWord');
    if (tiles.getAttribute('data-word') !== word) {
      tiles.setAttribute('data-word', word);
      tiles.textContent = '';
      Array.from(word).forEach(function (ch, i) {
        var sp = document.createElement('span');
        sp.className = 'mt ' + WORD_MARKS[i % WORD_MARKS.length];
        sp.textContent = ch;
        tiles.appendChild(sp);
      });
    }

    renderDaily(lang);

    var world = MBG.World && MBG.World.enabled();
    $('cardWorld').hidden = !world;
    if (world) {
      $('worldTitle').textContent = t('world.title');
      $('worldText').textContent = t('world.cardText');
    }

    var C = Shell.CONTACT;
    $('contactTitle').textContent = t('contact.title');
    $('contactText').textContent = t('contact.text');
    $('lnkWhatsApp').href = 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(t('contact.waMessage'));
    $('lblWhatsApp').textContent = C.phone;
    $('lnkWhatsApp').setAttribute('aria-label', t('contact.waLabel', { phone: C.phone }));
    // opens the phone's own e-mail app (Gmail, Outlook …) with the message already written
    $('lnkEmail').href = 'mailto:' + C.email + '?subject=' + encodeURIComponent(t('contact.subject')) +
      '&body=' + encodeURIComponent(t('contact.waMessage') + '\n\n');
    $('lblEmail').textContent = C.email;
    $('lnkEmail').setAttribute('aria-label', t('contact.emailLabel', { email: C.email }));
    $('lnkPrivacy').textContent = t('home.privacy');
    $('version').textContent = t('home.version', { v: Shell.VERSION });
  }

  /* -------------------------------------------------- daily puzzles --- */
  // Today's number and word (MBG.Daily): free for everyone, once a day, on top of the free game.
  var dailyStore = new MBG.Daily.DailyStore(Shell.store);
  function renderDaily(lang) {
    var D = MBG.Daily;
    dailyStore.load();
    var n = D.dayNumber();
    $('dailyTitle').textContent = '📅 ' + t('daily.title');
    $('dailyNo').textContent = '#' + n;
    var both = true;
    [['codebreaker', 'Code', ''], ['word', 'Word', lang]].forEach(function (x) {
      var game = x[0], C = x[1];
      var e = dailyStore.get(game, x[2]);
      var st = dailyStore.streak(game);
      $('daily' + C + 'Name').textContent = game === 'word' ? t('daily.word') + ' · ' + Shell.langName(lang) : t('daily.code');
      var state, go;
      if (e && e.done) {
        state = e.won ? t('daily.stateSolved', { n: e.round ? e.round.guesses.length : 0 }) : t('daily.stateLost');
        go = t('daily.see');
      } else if (e && e.round && e.round.guesses && e.round.guesses.length) {
        state = t('daily.stateGoing', { n: e.round.guesses.length });
        go = t('daily.continue');
        both = false;
      } else {
        state = t('daily.stateNew');
        go = t('home.play');
        both = false;
      }
      if (st.cur > 0) state += ' · 🔥 ' + st.cur;
      $('daily' + C + 'State').textContent = state;
      $('daily' + C + 'Go').textContent = go;
      $('daily' + C).classList.toggle('done', !!(e && e.done));
      $('daily' + C).setAttribute('aria-label', $('daily' + C + 'Name').textContent + '. ' + state);
    });
    var first = MBG.Daily && (WORD_TILES[lang] || 'A');
    $('dailyWordIc').textContent = Array.from(String(first))[0];
    $('dailyFoot').textContent = both ? t('daily.nextBoth', { time: Shell.duration(D.msUntilNext()) }) : t('daily.free');
    $('dailyReward').textContent = '🎁 ' + t('daily.rewardLine', { n: D.REWARD, list: MBG.Credits ? MBG.Credits.bonusList() : '' });
  }
  ['codebreaker', 'word'].forEach(function (g) {
    $(g === 'word' ? 'dailyWord' : 'dailyCode').addEventListener('click', function (e) {
      e.preventDefault();
      Shell.openGame(g, { daily: true });
    });
  });

  /* ------------------------------------------------------ language --- */
  $('btnLang').addEventListener('click', function () {
    MBG.LangMenu.open(Shell.getLang()).then(function (l) {
      if (l) { Shell.setLang(l); render(); }
      $('btnLang').focus();
    });
  });

  /* ------------------------------------------------- plans and games --- */
  $('btnPlans').addEventListener('click', function () {
    if (Shell.access.isSubscribed() && MBG.Billing.available) { MBG.Billing.manage(); return; }
    MBG.Paywall.open({}).then(render);
  });
  GAMES.forEach(function (g) {
    $('card' + cap(g)).addEventListener('click', function (e) {
      e.preventDefault();
      Shell.openGame(g);
    });
  });

  /* ---------------------------------------------------- world top 20 --- */
  $('cardWorld').addEventListener('click', function () {
    MBG.World.openBoard({}).then(function () { $('cardWorld').focus(); });
  });

  /* ------------------------------------------------- closing the app --- */
  var closeTimer = null;
  function goodbyeShown() { return !$('goodbye').hidden; }

  function confirmExit() {
    var d = $('dlgConfirm');
    if (d.open || goodbyeShown()) return;
    $('cfTitle').textContent = t('exit.title');
    $('cfText').textContent = t('exit.text');
    $('cfCancel').textContent = t('dlg.cancel');
    $('cfOk').textContent = t('exit.ok');
    d.returnValue = '';
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    $('cfCancel').focus();
  }
  $('dlgConfirm').addEventListener('close', function () {
    if ($('dlgConfirm').returnValue === 'ok') showGoodbye();
    else $('btnExit').focus();
  });

  function showGoodbye() {
    $('gbTitle').textContent = t('goodbye.title');
    $('gbText').textContent = t('goodbye.text');
    $('gbSign').textContent = t('goodbye.sign');
    $('gbClose').textContent = Shell.native ? t('goodbye.closing') : t('goodbye.close');
    $('gbAgain').textContent = t('goodbye.again');
    $('home').setAttribute('inert', '');
    $('home').setAttribute('aria-hidden', 'true');
    $('goodbye').hidden = false;
    $('gbAgain').focus();
    // The Android app closes itself after the goodbye; a browser tab stays open.
    if (Shell.native) closeTimer = setTimeout(function () { Shell.exitApp(); }, 2600);
  }
  $('gbAgain').addEventListener('click', function () {
    clearTimeout(closeTimer);
    $('goodbye').hidden = true;
    $('home').removeAttribute('inert');
    $('home').removeAttribute('aria-hidden');
    render();
  });
  $('btnExit').addEventListener('click', confirmExit);

  // Android Back on the home screen: an open sheet closes first (MBG.Shell), then
  // "Close MBG Puzzles?"; Back again on the goodbye closes at once.
  Shell.setBackHandler(function () {
    if (goodbyeShown()) { clearTimeout(closeTimer); Shell.exitApp(); return; }
    confirmExit();
  });

  if (MBG.Billing) MBG.Billing.onChange(render);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { Shell.applyLook(); render(); } });
  setInterval(render, 20000);

  Shell.applyLook();
  render();
  MBG.home = { render: render, confirmExit: confirmExit };
})(typeof self !== 'undefined' ? self : globalThis);
