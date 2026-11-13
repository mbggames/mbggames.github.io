/*!
 * MBG Who Am I? - the home screen (0.9.8: the simpler home).
 * As in MBG Puzzles: the first start asks for the language (a greeting in the phone's language),
 * then a small card offers three ways to play (anonymously, a name on this phone, an MBG account).
 * The front shows only what a player needs: Play, Choose the game, "Explore more" (What · Where ·
 * When), the Top 20 with the player's own numbers, and the intro film. Everything else - who is
 * playing, the ways to play, statistics, the MBG Board, the judges, language, sound, the other MBG
 * games, ratings, contact, privacy and Close - is in the ☰ Menu of the tab bar at the bottom
 * (Home · Top 20 · Inbox · Menu). Back or "Close app" asks "Close?", then a short goodbye.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, C = MBG.WhoCats, Net = MBG.Net;
  var $ = function (id) { return document.getElementById(id); };
  var el = Shell.el, t = Shell.t;
  var LI = function () { return Math.max(0, Shell.LANGS.indexOf(Shell.getLang())); };
  var heroI = 0;

  function tiles(word, extra) {
    var box = el('span', 'mtiles' + (extra ? ' ' + extra : ''));
    var marks = ['o', 'q', 'x', 'o', 'q', 'x'];
    Array.from(word).forEach(function (ch, i) { box.appendChild(el('span', 'mt ' + marks[i % marks.length], ch)); });
    return box;
  }

  function render() {
    var lang = Shell.getLang(), i = LI();
    document.documentElement.lang = lang;
    $('appName').textContent = t('app.name');
    $('appBy').textContent = t('app.by');
    if ($('btnLang').getAttribute('data-lang') !== lang) MBG.LangMenu.paint($('btnLang'), lang);
    // "About the game" with the intro film (built again only when the language changes)
    var ab = $('aboutCard');
    if (ab && MBG.Intro && ab.getAttribute('data-lang') !== lang) { MBG.Intro.aboutCard(ab); ab.setAttribute('data-lang', lang); }
    MBG.Account.paintButton($('btnAcc'));
    // the tab bar: Home · Top 20 · Inbox · Menu
    $('lblTabHome').textContent = t('home.tabHome');
    $('lblTabTop').textContent = t('home.tabTop');
    $('lblTabInbox').textContent = t('home.tabInbox');
    $('lblTabMenu').textContent = t('home.tabMenu');
    $('tabBar').setAttribute('aria-label', t('home.tabMenu'));
    $('tabMenu').setAttribute('aria-label', t('home.menuTitle'));

    var demo = $('demoLine');
    demo.hidden = !Net.demo || Shell.getPrefs().demoSeen;
    demo.textContent = '';
    if (!demo.hidden) {
      demo.appendChild(el('span', null, '🧪 ' + t('demo.line')));
      var ok = el('button', 'linkbtn', t('demo.ok'));
      ok.type = 'button';
      ok.addEventListener('click', function () { Shell.setPrefs({ demoSeen: true }); render(); });
      demo.appendChild(ok);
    }

    // hero: the card on the forehead, one big Play, and "Choose the game" (opponent, category, level...)
    var m = C.MODES.who;
    document.querySelector('.hero').setAttribute('data-mode', 'who');
    $('heroMode').textContent = m.icon;
    $('heroWord').textContent = m.word[i];
    $('heroTitle').textContent = t('hero.title');
    $('heroText').textContent = t('hero.text');
    $('lblQuick').textContent = t('hero.quickWho');
    $('btnSetup').textContent = '⚙ ' + t('hero.setup');
    var last = MBG.WhoSetup.last();
    if (last.mode !== 'who') { last.mode = 'who'; last.cat = null; last.subs = []; }
    $('heroLast').textContent = MBG.WhoSetup.describe(last);

    // "Who am I?" is the game; What, Where and When wait under "Explore more" for those who want more
    var modes = $('modes');
    modes.textContent = '';
    var ex = $('explore');
    ex.open = !!Shell.getPrefs().exploreOpen;
    $('exploreTitle').textContent = '🔭 ' + t('explore.title');
    $('exploreText').textContent = t('explore.text');
    C.MODE_ORDER.filter(function (k) { return k !== 'who'; }).forEach(function (k) {
      var md = C.MODES[k];
      var b = el('button', 'modecard mode-' + k);
      b.type = 'button';
      b.appendChild(tiles(md.word[i] + '?'));
      b.appendChild(el('strong', null, md.title[i]));
      b.appendChild(el('span', null, md.text[i]));
      // the puzzle of the day of this question word (a corner tag; ✓ when played today)
      if (MBG.WhoDaily) {
        var dp = MBG.WhoDaily.puzzle(k, lang), dm = MBG.WhoDaily.mine(dp.id, Shell.playerName());
        b.insertBefore(el('span', 'mc-daily' + (dm ? ' done' : ''), '🗓️' + (dm ? ' ✓' : '')), b.firstChild);
        b.setAttribute('aria-label', md.title[i] + ' · ' + t('daily.kicker') + (dm ? ' ✓' : ''));
      }
      b.addEventListener('click', function () { MBG.WhoSetup.open({ mode: k }); });
      modes.appendChild(b);
    });

    if (MBG.DailyUI) MBG.DailyUI.homeCard($('dailyCard'));
    if (MBG.Access) MBG.Access.check();   // free access given by e-mail (paid edition)
    if (MBG.Shop) MBG.Shop.card($('planCard'));
    renderTop();

    $('lnkPrivacy').textContent = t('home.privacy');
    $('version').textContent = t('home.version', { v: Shell.VERSION });
    $('powered').textContent = t('app.powered');
    renderWelcome();
    if (menu && menu.open) fillMenu();
  }

  /* ------------------------------------------------ the Top 20 on the front --- */
  // The competition, to catch the eye: the first five of the world Top 20 (with the server), or -
  // in demo mode or while the world list is still empty - the best rounds of this device. Under it
  // the player's own numbers (tap: the statistics) and "See all 20" (the whole Hall of Fame).
  var topSeq = 0;
  function renderTop() {
    var seq = ++topSeq, me = (MBG.Account.name && MBG.Account.name()) || Shell.playerName();
    $('topTitle').textContent = '🏆 ' + t('home.topTitle');
    $('btnHof').textContent = '🏛️ ' + t('home.seeAll');
    var s = MBG.WhoStats.mine(), row = $('meRow');
    row.textContent = '';
    row.setAttribute('aria-label', t('stats.titleFull'));
    var who = el('span', 'me-who');
    who.appendChild(MBG.Account.picture(MBG.Account.avatar(), 'av-sm'));
    who.appendChild(el('strong', null, t('you')));
    row.appendChild(who);
    [[s.played, t('stats.played')], [s.played ? Math.round(100 * s.won / s.played) + '%' : '–', t('stats.won')],
      [s.best || '–', t('stats.best')], [s.practice ? Math.round(s.practice.rating) : '–', t('home.practice')]].forEach(function (x) {
      var c = el('span', 'me-n');
      c.appendChild(el('b', 'num', String(x[0])));
      c.appendChild(el('span', null, x[1]));
      row.appendChild(c);
    });
    row.appendChild(chevron());

    function paint(rows, sub, badge) {
      if (seq !== topSeq) return;
      var ts = $('topSub');
      ts.textContent = '';
      ts.appendChild(el('span', 'tc-badge', badge));
      ts.appendChild(document.createTextNode(' ' + sub));
      var ol = $('topList');
      ol.textContent = '';
      if (!rows.length) {
        var li = el('li', 'tc-empty');
        li.appendChild(el('span', null, t('hof.emptyDevice')));
        ol.appendChild(li);
        return;
      }
      rows.slice(0, 5).forEach(function (r, k) {
        var li = el('li', 'tc-row' + (k < 3 ? ' top' + (k + 1) : '') + (r.name === me ? ' me' : ''));
        li.appendChild(el('span', 'tc-place', k < 3 ? ['🥇', '🥈', '🥉'][k] : String(k + 1)));
        var mid = el('span', 'tc-mid');
        mid.appendChild(el('strong', null, r.name));
        if (r.sub) mid.appendChild(el('span', null, r.sub));
        li.appendChild(mid);
        li.appendChild(el('b', 'num tc-val', String(r.value)));
        ol.appendChild(li);
      });
    }
    function device() {
      paint(MBG.WhoStats.hallOfFame().map(function (e) {
        var md = C.MODES[e.mode] || C.MODES.who;
        return { name: e.name, value: e.score, sub: md.icon + ' ' + e.answer };
      }), t('home.topSubDevice'), '📱 ' + t('hof.device'));
    }
    if (Net.demo) { device(); return; }
    Net.top('rating').then(function (res) {
      var rt = (res && res.rows) || [];
      if (!rt.length) { device(); return; }
      paint(rt.map(function (r) { return { name: r.name, value: r.rating, sub: t('title.' + r.title) }; }), t('home.topSub'), '🌍 ' + t('hof.world'));
    }, device);
  }
  function chevron() {
    var n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('viewBox', '0 0 24 24'); n.setAttribute('aria-hidden', 'true'); n.setAttribute('class', 'chev');
    n.innerHTML = '<path d="M9 5l7 7-7 7"/>';
    return n;
  }

  /* ------------------------------------------------------------ the menu --- */
  // Everything that is not on the front, in one list as in the phone apps (GitHub, banking ...):
  // who is playing; ways to play; the community; settings; MBG Games; help; Close.
  var menu = null;
  function openMenu() {
    if (menu && menu.open) return;
    menu = el('dialog', 'dlg drawer');
    menu.id = 'dlgMenu';
    menu.addEventListener('click', function (e) { if (e.target === menu) menu.close('cancel'); });
    menu.addEventListener('close', function () {
      var d = menu;
      $('tabMenu').classList.remove('on');
      setTimeout(function () { if (d && !d.open) d.remove(); }, 300);
    });
    document.body.appendChild(menu);
    fillMenu();
    $('tabMenu').classList.add('on');
    Shell.show(menu);
  }
  function closeMenu() { if (menu && menu.open) menu.close('done'); }
  /** Close the menu, then do something (a sheet must not open under the menu). */
  function then(fn) { return function () { closeMenu(); setTimeout(fn, 60); }; }

  function fillMenu() {
    var d = menu, i = LI(), u = Shell.getUser();
    var keepTop = d.querySelector('.drw-scroll') ? d.querySelector('.drw-scroll').scrollTop : 0;
    d.textContent = '';
    var head = el('div', 'drw-head');
    var hh = el('h2', null, t('home.menuTitle'));
    hh.tabIndex = -1; hh.autofocus = true;
    head.appendChild(hh);
    var x = el('button', 'btn ghost small', t('btn.close')); x.type = 'button';
    x.addEventListener('click', closeMenu);
    head.appendChild(x);
    d.appendChild(head);
    var sc = el('div', 'drw-scroll');
    d.appendChild(sc);

    // who is playing (was the bar under the header)
    var prof = el('div', 'drw-profile');
    var pb = el('button', 'drw-who'); pb.type = 'button';
    pb.appendChild(MBG.Account.picture(MBG.Account.avatar(), 'av-md'));
    var pt = el('span', 'drw-who-t');
    pt.appendChild(el('span', 'muted small', t(u.mode === 'anonymous' ? 'who.anon' : 'who.as')));
    pt.appendChild(el('strong', null, (u.mode === 'account' ? '🌍 ' : '') + (u.name || t('welcome.anonName'))));
    pb.appendChild(pt);
    pb.appendChild(chevron());
    pb.addEventListener('click', then(function () { MBG.Account.open().then(render); }));
    prof.appendChild(pb);
    var pbt = el('div', 'drw-who-btns');
    if (u.mode === 'anonymous') {
      var si = el('button', 'btn submit small', '👤 ' + t('who.signIn')); si.type = 'button';
      si.addEventListener('click', then(signIn));
      pbt.appendChild(si);
    } else {
      var sw = el('button', 'btn ghost small', '🔁 ' + t('who.switch')); sw.type = 'button';
      sw.addEventListener('click', then(function () { MBG.Account.open().then(render); }));
      var lo = el('button', 'btn ghost small', '🚪 ' + t('who.logout')); lo.type = 'button';
      lo.addEventListener('click', then(logout));
      pbt.appendChild(sw); pbt.appendChild(lo);
    }
    prof.appendChild(pbt);
    sc.appendChild(prof);

    function group(title) {
      sc.appendChild(el('h3', 'drw-sec', title));
      var g = el('div', 'drw-group');
      sc.appendChild(g);
      return g;
    }
    function row(g, icon, title, sub, onClick, o) {
      o = o || {};
      var r = el(o.href ? 'a' : 'button', 'drw-row' + (o.cls ? ' ' + o.cls : ''));
      if (o.href) { r.href = o.href; if (o.blank) { r.target = '_blank'; r.rel = 'noopener'; } } else r.type = 'button';
      var ic = el('span', 'drw-ic', icon);
      if (o.tone) ic.setAttribute('data-tone', o.tone);
      r.appendChild(ic);
      var tx = el('span', 'drw-t');
      tx.appendChild(el('strong', null, title));
      var sp = el('span', null, sub || '');
      if (!sub) sp.hidden = true;
      tx.appendChild(sp);
      r.appendChild(tx);
      if (o.end) r.appendChild(o.end);
      if (!o.noChev) r.appendChild(chevron());
      if (onClick) r.addEventListener('click', onClick);
      g.appendChild(r);
      return { row: r, sub: sp };
    }

    // ways to play (the same entries as before: the setup with the opponent chosen, party, watch)
    var g = group(t('ways.title'));
    if (MBG.DailyUI) row(g, '🗓️', t('daily.menu'), t('daily.menuText'), then(function () { MBG.DailyUI.openBoard().then(render); }), { tone: 'when' });
    row(g, '⚙', t('hero.setup'), MBG.WhoSetup.describe(MBG.WhoSetup.last()), then(function () { MBG.WhoSetup.open({}); }), { tone: 'who' });
    [['computer', '🤖', 'who'], ['online', '🌍', 'where'], ['tabs', '👥', 'what'], ['watch', '👀', 'when'], ['party', '🎉', 'what']].forEach(function (w) {
      row(g, w[1], t('ways.' + w[0]), t('ways.' + w[0] + 'Text'), then(function () {
        if (w[0] === 'party') { Shell.go('party.html'); return; }
        if (w[0] === 'watch') { Shell.writeJson('MBG.Who.next', { setup: MBG.WhoSetup.last(), at: Date.now() }); Shell.go('play.html?games=1'); return; }
        MBG.WhoSetup.open({ opponent: w[0] === 'tabs' ? 'tabs' : w[0] === 'online' ? 'online' : 'computer' });
      }), { tone: w[2] });
    });

    // the community
    g = group(t('home.secCommunity'));
    row(g, '🏛️', t('hof.title'), t('hof.top20'), then(openHof), { tone: 'when' });
    var s = MBG.WhoStats.mine(), pr = s.practice;
    row(g, '📊', t('stats.titleFull'), t('stats.title', { name: Shell.playerName() }) + ' · ' + s.played + ' ' + t('stats.played').toLowerCase() +
      (pr ? ' · ♟️ ' + Math.round(pr.rating) : ''), then(openStats), { tone: 'who' });
    var rb = row(g, '💬', t('board.title'), t('board.cardText'), then(function () { MBG.Board.open().then(render); }), { tone: 'where' });
    Net.board.list('all').then(function (posts) {
      var p = posts && posts[0];
      if (p) rb.sub.textContent = '“' + p.text.slice(0, 60) + (p.text.length > 60 ? '…' : '') + '” – ' + p.author.name;
    }).catch(function () { /* offline */ });
    var rj = row(g, '⚖️', t('judge.cardTitle'), t('judge.cardText'), then(function () { MBG.Judge.open().then(render); }), { tone: 'what' });
    Net.judge.status().then(function (st) { rj.sub.textContent = st.inPool ? t('judge.cardOn', { n: st.completed || 0 }) : t('judge.cardText'); }).catch(function () { /* keep */ });
    row(g, '🔔', t('note.title'), '', then(function () { MBG.Notify.open().then(MBG.Notify.paint); }), { tone: 'when' });

    // settings: language, sound, the paid-edition preview (browser only)
    g = group(t('set.title'));
    row(g, '🌐', t('lang.label'), Shell.langName(Shell.getLang()), function () {
      MBG.LangMenu.open(Shell.getLang()).then(function (l) { if (l) { Shell.setLang(l); render(); MBG.Notify.paint(); } });
    }, { tone: 'where' });
    var sb = el('button', 'ib ib-sound'); sb.type = 'button';
    var sr = row(g, '🔈', t('set.sound'), '', null, { noChev: true, end: sb, tone: 'who' });
    Shell.soundButton(sb, function (on) { sr.sub.hidden = false; sr.sub.textContent = t(on ? 'set.soundOn' : 'set.soundOff'); });
    sr.sub.hidden = false; sr.sub.textContent = t(Shell.getPrefs().sound !== false ? 'set.soundOn' : 'set.soundOff');
    sr.row.addEventListener('click', function (e) { if (!sb.contains(e.target)) sb.click(); });
    // the administrator: free access by e-mail (MBG user names in ADMIN_USERS on the server)
    if (MBG.Access && MBG.Access.state().admin) row(g, '🎁', t('adm.freeTitle'), t('adm.freeMenu'), then(function () { MBG.Access.openAdmin().then(render); }), { tone: 'what' });
    if (!(Shell.native || MBG.EDITION === 'paid')) {
      row(g, '🧪', t(Shell.getPrefs().previewPaid ? 'shop.previewOff' : 'shop.previewTry'), '', function () {
        Shell.setPrefs({ previewPaid: !Shell.getPrefs().previewPaid }); root.location.reload();
      }, { tone: 'what' });
    }

    // MBG Games and the ratings
    g = group(t('games.title'));
    MBG.GAMES.forEach(function (gm) {
      var here = gm.id === MBG.GAME_ID;
      var stars = el('span', 'gl-stars');
      MBG.Ratings.summary(gm.id).then(function (r) { stars.textContent = r; });
      var end = el('span', 'drw-end');
      end.appendChild(stars);
      if (here) end.appendChild(el('span', 'chip sub', t('games.here')));
      row(g, gm.icon, t('game.' + gm.id), t('game.' + gm.id + '.text'), null,
        here ? { end: end, noChev: true, cls: 'here' } : { end: end, href: gm.url, blank: true });
    });
    row(g, '★', t('rate.game'), '', then(function () { MBG.Ratings.open(MBG.GAME_ID).then(render); }), { tone: 'what' });
    row(g, '★', t('rate.platform'), '', then(function () { MBG.Ratings.open('platform').then(render); }), { tone: 'what' });

    // help and contact
    var Cn = Shell.CONTACT;
    g = group(t('home.secHelp'));
    var hint = el('p', 'drw-hint', t('contact.title') + ' ' + t('contact.text'));
    g.parentNode.insertBefore(hint, g);
    row(g, '🎬', t('about.title'), t('about.replay'), then(function () { MBG.Intro.splash(true); }), { tone: 'when' });
    row(g, '💬', 'WhatsApp', Cn.phone, null,
      { href: 'https://wa.me/' + Cn.whatsapp + '?text=' + encodeURIComponent(t('contact.waMessage')), blank: true, tone: 'who' });
    row(g, '✉️', t('home.email'), Cn.email, null,
      { href: 'mailto:' + Cn.email + '?subject=' + encodeURIComponent(t('app.name')) + '&body=' + encodeURIComponent(t('contact.waMessage') + '\n\n'), blank: true, tone: 'where' });
    row(g, '🔒', t('home.privacy'), '', null, { href: 'privacy.html', tone: 'who' });

    // close the app
    g = group('');
    row(g, '⏻', t('home.exit'), '', then(confirmExit), { cls: 'danger', noChev: true });

    var foot = el('p', 'drw-foot', t('home.version', { v: Shell.VERSION }) + ' · © 2026 MBG · Merkur Beqiri Games');
    sc.appendChild(foot);
    sc.scrollTop = keepTop;
  }
  function signIn() {
    Shell.setPrefs({ welcomeDone: false });
    render();
    var c = $('welcomeCard');
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* --------------------------------------------------- Hall of Fame --- */
  // World: the Top 20 by rating (ranked matches against people) and the best rounds - from the
  // MBG Games server. This device: its best rounds and the practice ratings of its players.
  function openHof(tab) {
    tab = tab === 'device' || (tab !== 'world' && Net.demo) ? 'device' : 'world';
    var sh = Shell.sheet({ id: 'dlgHof', title: '🏛️ ' + t('hof.title'), cls: 'hofsheet' });
    var b = sh.body;
    var seg = el('div', 'seg wide');
    [['world', '🌍 ' + t('hof.world')], ['device', '📱 ' + t('hof.device')]].forEach(function (x) {
      var btn = el('button', 'seg-btn' + (tab === x[0] ? ' on' : ''), x[1]); btn.type = 'button';
      btn.addEventListener('click', function () { sh.close(); openHof(x[0]); });
      seg.appendChild(btn);
    });
    b.appendChild(seg);
    function table(rows, cols) {
      var ol = el('ol', 'hoflist');
      rows.forEach(function (row, i) {
        var li = el('li', 'hofrow' + (i < 3 ? ' top' + (i + 1) : '') + (row.me ? ' me' : ''));
        li.appendChild(el('span', 'hof-place', i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)));
        var mid = el('span', 'hof-mid');
        mid.appendChild(el('strong', null, row.name));
        if (row.sub) mid.appendChild(el('span', 'muted small', row.sub));
        li.appendChild(mid);
        li.appendChild(el('b', 'num hof-val', String(row.value)));
        ol.appendChild(li);
      });
      return ol;
    }
    if (tab === 'device') {
      var best = MBG.WhoStats.hallOfFame(), me = Shell.playerName();
      b.appendChild(el('h3', null, '🏅 ' + t('hof.bestRounds')));
      if (!best.length) b.appendChild(el('p', 'muted', t('hof.emptyDevice')));
      else b.appendChild(table(best.map(function (e) {
        var m = C.MODES[e.mode] || C.MODES.who;
        return { name: e.name, value: e.score, me: e.name === me, sub: m.icon + ' ' + e.answer + ' · ' + C.LEVELS[e.level].names[LI()] + ' · ' + t('hof.questions', { n: e.used }) + ' · ' + Shell.dateText(e.at, { year: true }) };
      })));
      var pr = MBG.WhoStats.practiceAll();
      if (pr.length) {
        b.appendChild(el('h3', null, '♟️ ' + t('hof.practice')));
        b.appendChild(table(pr.map(function (p) { return { name: p.name, value: Math.round(p.rating), me: p.name === me, sub: t('hof.games', { n: p.games }) }; })));
      }
      b.appendChild(el('p', 'muted small', t(Net.demo ? 'hof.worldDemo' : 'hof.deviceNote')));
      return Shell.closed(sh.dlg);
    }
    var load = el('p', 'muted', '⏳ ' + t('ld.wait') + '…');
    b.appendChild(load);
    Promise.all([Net.top('rating'), Net.top('rounds')]).then(function (res) {
      load.remove();
      var rt = res[0].rows || [], rd = res[1].rows || [], my = (MBG.Account.name && MBG.Account.name()) || Shell.playerName();
      b.appendChild(el('h3', null, '🏆 ' + t('hof.top20')));
      if (!rt.length) b.appendChild(el('p', 'muted', t('hof.emptyWorld')));
      else b.appendChild(table(rt.map(function (r) { return { name: r.name, value: r.rating, me: r.name === my, sub: t('title.' + r.title) + ' · ' + t('hof.games', { n: r.games }) }; })));
      b.appendChild(el('h3', null, '🏅 ' + t('hof.bestRounds')));
      if (!rd.length) b.appendChild(el('p', 'muted', t('hof.emptyWorld')));
      else b.appendChild(table(rd.map(function (r) { return { name: r.name, value: r.score, me: r.name === my, sub: r.answer + ' · ' + Shell.dateText(r.at, { year: true }) }; })));
      b.appendChild(el('p', 'muted small', t('hof.worldNote')));
    }, function () { load.textContent = t('online.error'); });
    return Shell.closed(sh.dlg);
  }
  function openStats() {
    var s = MBG.WhoStats.mine(), i = LI();
    var sh = Shell.sheet({ id: 'dlgStats', title: t('stats.titleFull'), cls: 'statsheet' });
    var b = sh.body;
    var rows = [[t('stats.played'), s.played], [t('stats.wonN'), s.won], [t('stats.drawn'), s.drawn], [t('stats.rounds'), s.solved + ' / ' + s.rounds],
      [t('stats.avgQ'), s.solved ? (s.questions / s.solved).toFixed(1) : '–'], [t('stats.best'), s.best || '–'], [t('stats.streak'), s.streak + ' · ' + t('stats.bestStreak') + ' ' + s.bestStreak]];
    var tbl = el('div', 'kv');
    rows.forEach(function (r) { var row = el('div', 'kv-row'); row.appendChild(el('span', null, r[0])); row.appendChild(el('b', 'num', String(r[1]))); tbl.appendChild(row); });
    b.appendChild(tbl);
    b.appendChild(el('h3', null, t('stats.byMode')));
    var bm = el('div', 'kv');
    C.MODE_ORDER.forEach(function (k) {
      var x = s.byMode[k] || { played: 0, won: 0 };
      var row = el('div', 'kv-row');
      row.appendChild(el('span', null, C.MODES[k].icon + ' ' + C.MODES[k].title[i]));
      row.appendChild(el('b', 'num', x.played ? x.won + ' / ' + x.played : '–'));
      bm.appendChild(row);
    });
    b.appendChild(bm);
    b.appendChild(el('p', 'muted small', t('stats.note')));
  }

  /* --------------------------------------------- first start: how to play --- */
  /** Log out: back to "who is playing?" - anonymous, a name, or an MBG account (Google, e-mail). */
  function logout() {
    var u = Shell.getUser();
    if (u.mode === 'account') MBG.Account.signOut(); else Shell.setUser({ mode: 'anonymous' });
    Shell.setPrefs({ welcomeDone: false });
    render();
    Shell.toast('🚪 ' + t('who.loggedOut', { name: u.name || '' }));
  }
  MBG.HomeLogout = logout;
  function welcomeWanted() { return !Shell.getPrefs().welcomeDone && Shell.getUser().mode === 'anonymous'; }
  function welcomeDone() { Shell.setPrefs({ welcomeDone: true }); $('welcomeCard').hidden = true; }
  function renderWelcome() {
    var card = $('welcomeCard');
    if (!welcomeWanted()) { card.hidden = true; return; }
    card.hidden = false;
    card.textContent = '';
    var head = el('div', 'wlc-head');
    var h = el('h2', null, t('welcome.title'));
    h.id = 'wlcTitle';
    var x = el('button', 'wlc-x');
    x.type = 'button';
    x.setAttribute('aria-label', t('welcome.close'));
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function () { Shell.setUser({ mode: 'anonymous' }); welcomeDone(); render(); });
    head.appendChild(h); head.appendChild(x); card.appendChild(head);
    function option(icon, title, text, onPick) {
      var b = el('button', 'wlc-opt');
      b.type = 'button';
      b.innerHTML = '<span class="wlc-ic" aria-hidden="true"></span><span class="wlc-t"><strong></strong><span></span></span><svg class="wlc-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      b.querySelector('.wlc-ic').textContent = icon;
      b.querySelector('strong').textContent = title;
      b.querySelector('.wlc-t span').textContent = text;
      b.addEventListener('click', onPick);
      card.appendChild(b);
      return b;
    }
    option('🎮', t('welcome.anon'), t('welcome.anonText'), function () { Shell.setUser({ mode: 'anonymous' }); welcomeDone(); render(); Shell.toast(t('welcome.anonOk')); });
    var local = option('📱', t('welcome.local'), t('welcome.localText'), function () { local.hidden = true; form.hidden = false; input.focus(); });
    var form = el('form', 'wlc-form');
    form.hidden = true;
    form.innerHTML = '<label class="fieldlabel" for="wlcName"></label><div class="wlc-row"><input class="textfield" id="wlcName" maxlength="20" autocomplete="nickname" spellcheck="false"><button type="submit" class="btn submit"></button></div>' +
      '<label class="keepin"><input type="checkbox" checked> <span></span></label><p class="pw-msg" role="status" aria-live="polite" hidden></p>';
    var input = form.querySelector('input'), msg = form.querySelector('.pw-msg');
    form.querySelector('label').textContent = t('welcome.nameLabel');
    input.placeholder = t('welcome.namePh');
    form.querySelector('button').textContent = t('welcome.nameOk');
    form.querySelector('.keepin span').textContent = t('acc.keepIn');
    form.querySelector('.keepin input').checked = Shell.getPrefs().keepIn !== false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = input.value.normalize('NFC').trim(), bad = Shell.checkName(n);
      if (bad) { msg.textContent = t(bad === 'reserved' ? 'welcome.nameReserved' : 'welcome.nameInvalid'); msg.hidden = false; input.focus(); return; }
      Shell.setUser({ mode: 'local', name: n });
      Shell.setPrefs({ keepIn: form.querySelector('.keepin input').checked });
      if (MBG.Account.remember) MBG.Account.remember(n);
      welcomeDone(); render();
      Shell.toast(t('welcome.nameHello', { name: n }));
    });
    card.appendChild(form);
    option('🌍', t('welcome.world'), t('welcome.worldText'), function () { MBG.Account.open().then(function () { if (Shell.getUser().mode === 'account') welcomeDone(); render(); }); });
    card.appendChild(el('p', 'wlc-fine', t('welcome.later')));
  }

  /* ------------------------------------------------------------ actions --- */
  $('btnLang').addEventListener('click', function () {
    MBG.LangMenu.open(Shell.getLang()).then(function (l) { if (l) { Shell.setLang(l); render(); MBG.Notify.paint(); } $('btnLang').focus(); });
  });
  // "Play": always "Who am I?" (the other question words start from "Explore more")
  $('btnQuick').addEventListener('click', function () {
    var s = MBG.WhoSetup.last();
    if (s.mode !== 'who') { s.mode = 'who'; s.cat = null; s.subs = []; }
    MBG.WhoSetup.start(s);
  });
  if (MBG.Billing) MBG.Billing.onChange(render);
  if (MBG.Access) MBG.Access.onChange(function () { render(); });
  $('explore').addEventListener('toggle', function () { Shell.setPrefs({ exploreOpen: $('explore').open }); });
  $('btnSetup').addEventListener('click', function () { MBG.WhoSetup.open({}); });
  $('btnHof').addEventListener('click', function () { openHof(); });
  $('meRow').addEventListener('click', openStats);
  $('btnAcc').addEventListener('click', function () { MBG.Account.open().then(render); });
  // the tab bar
  function toTop() { root.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  $('btnTop').addEventListener('click', toTop);
  $('tabHome').addEventListener('click', toTop);
  $('tabTop').addEventListener('click', function () { openHof(); });
  $('tabMenu').addEventListener('click', openMenu);
  MBG.Notify.attach($('btnBell'), $('bellN'));
  Net.on(function () { MBG.Notify.paint(); });

  /* ------------------------------------------------------ closing the app --- */
  var closeTimer = null;
  function goodbyeShown() { return !$('goodbye').hidden; }
  function confirmExit() {
    if (goodbyeShown() || document.querySelector('dialog[open]')) return;
    Shell.confirm({ title: t('exit.title'), text: t('exit.text'), ok: t('exit.ok') }).then(function (ok) { if (ok) showGoodbye(); else $('tabMenu').focus(); });
  }
  function showGoodbye() {
    $('gbTitle').textContent = t('goodbye.title');
    $('gbText').textContent = t('goodbye.text');
    $('gbSign').textContent = t('goodbye.sign');
    $('gbClose').textContent = Shell.native ? t('goodbye.closing') : t('goodbye.close');
    $('gbAgain').textContent = t('goodbye.again');
    $('home').setAttribute('inert', '');
    $('goodbye').hidden = false;
    $('gbAgain').focus();
    if (Shell.native) closeTimer = setTimeout(function () { Shell.exitApp(); }, 2600);
  }
  $('gbAgain').addEventListener('click', function () { clearTimeout(closeTimer); $('goodbye').hidden = true; $('home').removeAttribute('inert'); render(); });
  Shell.setBackHandler(function () { if (goodbyeShown()) { clearTimeout(closeTimer); Shell.exitApp(); return; } confirmExit(); });

  document.addEventListener('visibilitychange', function () { if (!document.hidden) { Shell.applyLook(); render(); } });
  // the hero card shows "Who am I?" - the main game; it flips now and then to catch the eye
  setInterval(function () {
    var card = document.querySelector('.hero-card');
    if (card && !matchMedia('(prefers-reduced-motion: reduce)').matches) { card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip'); }
  }, 6000);

  Shell.applyLook();
  render();
  MBG.Notify.paint();
  // When the app opens: the intro film (once per start, not when coming back from a game, not when
  // a notification link opened this page); then, the very first time, the greeting and the four
  // languages (MBG Puzzles 1.7.3).
  var opening = MBG.Intro && !root.location.hash ? MBG.Intro.splash() : Promise.resolve(false);
  opening.then(function () {
    if (!Shell.langChosen() && !Shell.getPrefs().welcomeDone) {
      MBG.LangMenu.open(Shell.getLang(), { welcome: true }).then(function (l) { Shell.setLang(l); render(); MBG.Notify.paint(); });
    }
  });
  // links from notifications on other screens: index.html#board, #judge, #case=..., #daily=where
  var hash = root.location.hash;
  if (hash === '#board') MBG.Board.open().then(render);
  else if (/^#daily/.test(hash) && MBG.DailyUI) MBG.DailyUI.openBoard(hash.split('=')[1]).then(render);
  else if (hash === '#judge') MBG.Judge.open().then(render);
  else if (/^#case=/.test(hash)) MBG.Judge.openCase(decodeURIComponent(hash.slice(6))).then(render);
  MBG.home = { render: render, menu: openMenu };
})(typeof self !== 'undefined' ? self : globalThis);
