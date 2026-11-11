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
    pl: 'SŁOWO', pt: 'PALAVRA', ar: 'كلمة', ko: 'ㄷㅏㄴㅇㅓ' };   // ko: 단어, in its letters
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
    $('lvlCodebreaker').hidden = !(Shell.getPrefs() || {}).cbExpert;      // version 1.7: Codebreaker's Expert level
    $('lvlCodebreaker').textContent = t('home.expert');

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
    renderWelcome();

    var world = MBG.World && MBG.World.enabled();
    $('cardWorld').hidden = !world;
    if (world) {
      $('worldTitle').textContent = t('world.title');
      $('worldText').textContent = t('world.cardText');
    }

    var A = MBG.Account;
    var acc = !!(A && A.enabled());
    $('cardAccount').hidden = !acc;
    if (acc) {
      $('accountTitle').textContent = A.signedIn() ? A.username() : t('account.title');
      var ic = $('cardAccount').querySelector('.wc-icon');
      ic.textContent = '';
      ic.appendChild(A.picture('av-card'));
      $('accountText').textContent = A.signedIn() ? t('account.cardOn') : t(A.ways().google ? 'account.cardText' : 'account.cardTextEmail');
    }
    // Version 1.7.2: the MBG account also at the top right, so signing in or creating an account is
    // always one tap away (the card further down stays).
    var top = $('btnAccTop');
    top.hidden = true;            // version 1.10: the account is the first row of the menu
    if (acc) {
      top.textContent = '';
      top.appendChild(A.picture('av-top'));
      var lbl = A.signedIn() ? t('account.title') + ': ' + A.username() : t('account.title');
      top.setAttribute('aria-label', lbl);
      top.title = lbl;
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
    renderMenu(lang);
    $('version').textContent = t('home.version', { v: Shell.VERSION });
    $('powered').textContent = t('app.powered');
  }

  /* ----------------------------------------------------------- menu --- */
  // Version 1.10: what used to fill the home screen below the games - MBG account, world top 20,
  // language, contact, privacy policy, closing the app, version - now sits in one menu that
  // slides up from the bottom (the way GitHub's phone app keeps its screens calm). The home
  // screen keeps only what players come for: the puzzles of the day and the two games.
  function renderTopRow() {
    var on = !!(MBG.World && MBG.World.enabled());
    $('topRow').hidden = !on;
    $('cardWorld').hidden = true;          // the world list is on the page, not in the menu
    if (!on) return;
    $('topWorldTitle').textContent = t('world.title');
    $('topWorldText').textContent = t('top.worldText');
    $('topTodayTitle').textContent = t('top.today');
    $('topTodayText').textContent = t('top.todayText');
    $('topBestTitle').textContent = t('dtop.title');
  }
  function renderMenu(lang) {
    renderTopRow();
    var open = t('menu.open');
    $('btnMenu').setAttribute('aria-label', open);
    $('btnMenu').title = open;
    $('menuTitle').textContent = t('menu.title');
    $('menuClose').textContent = t('btn.close');
    $('menuLangTitle').textContent = t('lang.label');
    $('menuLangText').textContent = Shell.langName(lang);
    var flag = $('menuLangFlag');
    if (flag.getAttribute('data-lang') !== lang) {
      flag.setAttribute('data-lang', lang);
      flag.innerHTML = MBG.LangMenu.flagSvg(lang, true);
    }
    $('menuPrivacyTitle').textContent = t('home.privacy');
    $('menuExitTitle').textContent = t('home.exit');
  }
  function menuOpen() { return $('dlgMenu').open; }
  function openMenu() {
    var d = $('dlgMenu');
    if (d.open) return;
    render();
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  }
  /** Closes the menu, then runs `next` (a sheet of its own opens on a clean screen). */
  function fromMenu(next) {
    return function (e) {
      if (e) e.preventDefault();
      var d = $('dlgMenu');
      if (d.open) d.close();
      setTimeout(next, 0);
    };
  }
  function backToMenuButton() { try { $('btnMenu').focus(); } catch (e) { /* ignore */ } }
  $('btnMenu').addEventListener('click', openMenu);
  $('menuClose').addEventListener('click', function () { $('dlgMenu').close(); });
  $('dlgMenu').addEventListener('click', function (e) { if (e.target === $('dlgMenu')) $('dlgMenu').close(); });
  $('dlgMenu').addEventListener('close', function () { if (!document.querySelector('dialog[open]')) backToMenuButton(); });
  $('btnTopWorld').addEventListener('click', function () {
    MBG.World.openBoard({ period: 'week' }).then(function () { $('btnTopWorld').focus(); });
  });
  $('btnTopToday').addEventListener('click', function () {
    MBG.World.openBoard({ period: 'day' }).then(function () { $('btnTopToday').focus(); });
  });
  $('btnTopBest').addEventListener('click', function () {
    MBG.World.openDailyTop({ lang: Shell.getLang() }).then(function () { $('btnTopBest').focus(); });
  });
  $('menuLang').addEventListener('click', fromMenu(function () {
    MBG.LangMenu.open(Shell.getLang()).then(function (l) {
      if (l) { Shell.setLang(l); render(); }
      backToMenuButton();
    });
  }));
  $('menuExit').addEventListener('click', fromMenu(function () { confirmExit(); }));

  /* -------------------------------------------------- daily puzzles --- */
  // Today's number and word (MBG.Daily): free for everyone, once a day, on top of the free game.
  // Each player has their own puzzles of the day: the card shows those of the player chosen now.
  var dailyStore = null;
  function renderDaily(lang) {
    var D = MBG.Daily;
    var key = D.keyFor(Shell.getUser());
    if (!dailyStore || dailyStore.key !== key) dailyStore = new D.DailyStore(Shell.store, key); else dailyStore.load();
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
      // Version 1.8: every day has its own lengths - say today's first ("6 letters · New today ...").
      state = (game === 'word' ? t('world.letters', { n: D.wordLength(lang, n) }) : t('world.digits', { n: D.codeLength(n) })) + ' · ' + state;
      $('daily' + C + 'State').textContent = state;
      $('daily' + C + 'Go').textContent = go;
      $('daily' + C).classList.toggle('done', !!(e && e.done));
      $('daily' + C).setAttribute('aria-label', $('daily' + C + 'Name').textContent + '. ' + state);
    });
    // The folded line tells how many of today's puzzles are still open.
    var open = ['dailyCode', 'dailyWord'].filter(function (id) { return !$(id).classList.contains('done'); }).length;
    $('dailySum').textContent = open ? (open === 1 ? t('daily.sumOne') : t('daily.sumOpen', { n: open })) : t('daily.sumDone');
    $('dailySum').classList.toggle('done', !open);
    setDailyOpen(dailyOpen(), true);
    var first = MBG.Daily && (WORD_TILES[lang] || 'A');
    $('dailyWordIc').textContent = Array.from(String(first))[0];
    var who = Shell.getUser();
    $('dailyFoot').textContent = (both ? t('daily.nextBoth', { time: Shell.duration(D.msUntilNext()) }) : t('daily.free')) + ' ' +
      t('daily.playerLine', { name: who.mode === 'registered' ? who.name : t('welcome.anonName') });
    $('dailyReward').textContent = '🎁 ' + t('daily.rewardLine', { n: D.REWARD, list: MBG.Credits ? MBG.Credits.bonusList() : '' });
  }
  /* ------------------------------------------------- first start: how to play --- */
  // Once, at the first start: a small card with three ways to play - anonymously, with a name on
  // this phone, or with an MBG account (Google or e-mail; scores on every phone and, if wanted,
  // on the world top 20). The same choices stay available in the games and on the account card.
  function welcomeWanted() {
    var p = Shell.getPrefs();
    if (p.welcomeDone) return false;
    if (MBG.Account && MBG.Account.enabled() && MBG.Account.signedIn()) return false;
    return Shell.getUser().mode === 'anonymous';
  }
  function welcomeDone() {
    var prefs = Shell.getPrefs();
    prefs.welcomeDone = true;
    try { Shell.store.setItem(Shell.KEYS.prefs, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
    $('welcomeCard').hidden = true;
  }
  /** A name on this phone: a player of both games, chosen now (the games' own rules for names). */
  function useLocalName(name) {
    var S = MBG.Storage;
    var n = String(name || '').normalize('NFC').trim();
    var problem = S.validateUsername(n);
    if (problem) return problem;
    var found = null;
    ['MBG.Codebreaker.Users', 'MBG.Word.Users'].forEach(function (k) {
      var st = new S.UserStore(Shell.store, k);
      var u = st.find(n) || st.create(n);
      found = found || u.name;
    });
    Shell.setUser({ mode: 'registered', name: found });
    var prefs = Shell.getPrefs();
    var recent = Array.isArray(prefs.recent) ? prefs.recent : [];
    prefs.recent = [found].concat(recent.filter(function (r) { return String(r).toLowerCase() !== found.toLowerCase(); })).slice(0, 20);
    try { Shell.store.setItem(Shell.KEYS.prefs, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
    return null;
  }
  function promoFigure(alt) {
    // Version 1.9: the MBG Games promo (animated; a still picture for players who reduce motion).
    var f = document.createElement('figure');
    f.className = 'mbgpromo';
    var pic = document.createElement('picture');
    var still = document.createElement('source');
    still.media = '(prefers-reduced-motion: reduce)';
    still.srcset = 'img/mbg-promo-still.webp';
    var img = document.createElement('img');
    img.src = 'img/mbg-promo.webp';
    img.width = 508; img.height = 337;
    img.alt = alt;
    img.decoding = 'async';
    img.addEventListener('error', function () { f.hidden = true; });   // a missing picture never blocks the page
    pic.appendChild(still); pic.appendChild(img); f.appendChild(pic);
    return f;
  }

  function renderWelcome() {
    var card = $('welcomeCard');
    if (!welcomeWanted()) { card.hidden = true; return; }
    var acc = !!(MBG.Account && MBG.Account.enabled());
    card.hidden = false;
    card.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'wlc-head';
    var h = document.createElement('h2');
    h.id = 'wlcTitle';
    h.textContent = t('welcome.title');
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'wlc-x';
    x.setAttribute('aria-label', t('welcome.close'));
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function () { Shell.setUser({ mode: 'anonymous' }); welcomeDone(); render(); });
    head.appendChild(h);
    head.appendChild(x);
    card.appendChild(head);
    card.appendChild(promoFigure(t('promo.alt')));
    function option(icon, title, text, onPick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wlc-opt';
      b.innerHTML = '<span class="wlc-ic" aria-hidden="true"></span><span class="wlc-t"><strong></strong><span></span></span>' +
        '<svg class="wlc-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      b.querySelector('.wlc-ic').textContent = icon;
      b.querySelector('strong').textContent = title;
      b.querySelector('.wlc-t span').textContent = text;
      b.addEventListener('click', onPick);
      card.appendChild(b);
      return b;
    }
    option('🎮', t('welcome.anon'), t('welcome.anonText'), function () {
      Shell.setUser({ mode: 'anonymous' });
      welcomeDone();
      render();
      if (MBG.Paywall && MBG.Paywall.toast) MBG.Paywall.toast(t('welcome.anonOk'));
    });
    var local = option('📱', t('welcome.local'), t('welcome.localText'), function () {
      local.hidden = true;
      form.hidden = false;
      input.focus();
    });
    // The name form opens in place of the second choice.
    var form = document.createElement('form');
    form.className = 'wlc-form';
    form.hidden = true;
    form.innerHTML = '<label class="fieldlabel" for="wlcName"></label><div class="wlc-row"><input class="textfield" id="wlcName" maxlength="20" autocomplete="nickname" spellcheck="false">' +
      '<button type="submit" class="btn submit"></button></div><p class="pw-msg" role="status" aria-live="polite" hidden></p>';
    var input = form.querySelector('input');
    form.querySelector('label').textContent = t('welcome.nameLabel');
    input.placeholder = t('welcome.namePh');
    form.querySelector('button').textContent = t('welcome.nameOk');
    var msg = form.querySelector('.pw-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var problem = useLocalName(input.value);
      if (problem) {
        msg.textContent = t(problem === 'reserved' ? 'welcome.nameReserved' : 'welcome.nameInvalid');
        msg.hidden = false;
        input.focus();
        return;
      }
      var name = Shell.getUser().name;
      welcomeDone();
      render();
      if (MBG.Paywall && MBG.Paywall.toast) MBG.Paywall.toast(t('welcome.nameHello', { name: name }));
    });
    card.appendChild(form);
    if (acc) option('🌍', t('welcome.world'), t(MBG.Account.ways().google ? 'welcome.worldText' : 'welcome.worldTextEmail'), function () {
      MBG.Account.open().then(function () {
        if (MBG.Account.signedIn()) welcomeDone();
        render();
      });
    });
    var fine = document.createElement('p');
    fine.className = 'wlc-fine';
    fine.textContent = t('welcome.later');
    card.appendChild(fine);
  }

  /** Folded by default; once the player opens (or folds) it, the next start shows it the same way. */
  function dailyOpen() { return Shell.getPrefs().dailyOpen === true; }
  function setDailyOpen(open, quiet) {
    $('dailyBody').hidden = !open;
    $('dailyCard').classList.toggle('folded', !open);
    $('dailyToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    $('dailyToggle').setAttribute('aria-label', t('daily.title') + ' · ' + $('dailySum').textContent + ' · ' + t(open ? 'daily.hide' : 'daily.show'));
    if (quiet) return;
    var prefs = Shell.getPrefs();
    prefs.dailyOpen = open;
    try { Shell.store.setItem(Shell.KEYS.prefs, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }
  $('dailyToggle').addEventListener('click', function () { setDailyOpen(!dailyOpen()); });
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
  $('cardWorld').addEventListener('click', fromMenu(function () {
    MBG.World.openBoard({}).then(backToMenuButton);
  }));

  /* ------------------------------------------------------ MBG account --- */
  $('btnAccTop').addEventListener('click', function () {
    MBG.Account.open().then(function () { render(); $('btnAccTop').focus(); });
  });
  $('cardAccount').addEventListener('click', fromMenu(function () {
    MBG.Account.open().then(function () { render(); backToMenuButton(); });
  }));
  if (MBG.Account) MBG.Account.onChange(function (type) { if (type !== 'status') render(); });

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
    else backToMenuButton();
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
  // Version 1.7.2 - the very first start: a greeting and the languages (eleven since 1.11), so every player starts
  // in their own language (the phone's language is marked). Shown once: the choice is kept, and
  // players who already used the app (they made the "how to play" choice) are not asked.
  if (!Shell.langChosen() && !Shell.getPrefs().welcomeDone) {
    MBG.LangMenu.open(Shell.getLang(), { welcome: true }).then(function (l) { Shell.setLang(l); render(); });
  }
  MBG.home = { render: render, confirmExit: confirmExit, openMenu: openMenu, menuOpen: menuOpen };
})(typeof self !== 'undefined' ? self : globalThis);
