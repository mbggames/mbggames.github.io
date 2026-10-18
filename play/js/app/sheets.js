/*!
 * MBG Puzzles - sheets shared by both games: statistics, "move to a new phone", and sharing a
 * daily result. The numbers come from MBG.Stats and MBG.Daily (js/shared), the code from
 * MBG.Transfer (js/app/transfer.js); this file only draws them.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;
  var GAMES = ['codebreaker', 'word'];
  // Where a friend gets the app (in a shared result).
  var STORE_URL = 'https://play.google.com/store/apps/details?id=com.mbggames.puzzles';
  var LENGTHS = [4, 5, 6, 7, 8];

  function t(k, p) { return Shell.t(k, p); }
  function fmt(n) { return MBG.AppText.num(Shell.getLang(), n); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function sheet(id, cls) {
    var d = document.getElementById(id);
    if (d) return d;
    d = el('dialog', 'dlg sheet ' + cls);
    d.id = id;
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    return d;
  }
  function show(d) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
  function whenClosed(d) {
    return new Promise(function (resolve) {
      d.addEventListener('close', function once() { d.removeEventListener('close', once); resolve(d.returnValue); });
    });
  }
  function toast(msg) { if (MBG.Paywall && MBG.Paywall.toast) MBG.Paywall.toast(msg); }
  function clock(sec) { return MBG.Daily ? MBG.Daily.clock(sec) : String(sec); }

  var statsStore = null;
  function stats() { if (!statsStore) statsStore = new MBG.Stats.StatsStore(Shell.store); else statsStore.load(); return statsStore; }
  var dailyStore = null;
  function daily() { if (!dailyStore) dailyStore = new MBG.Daily.DailyStore(Shell.store); else dailyStore.load(); return dailyStore; }

  /** The name the numbers are kept under: the player's name, or Anonymous (null: nothing kept). */
  function statsName(user) {
    user = user || Shell.getUser();
    if (!user || user.mode === 'nodata') return null;
    return user.mode === 'registered' && user.name ? user.name : MBG.Storage.ANONYMOUS;
  }

  /** A game is over: count it (also the daily puzzle's result). Returns the new summary. */
  function record(game, evt) {
    if (evt.daily) daily().finish(game, evt.daily, evt.won);
    var name = statsName(evt.user && evt.user.mode ? evt.user : null);
    if (!name) return null;
    return stats().record(name, game, { lang: evt.lang, length: evt.length, won: evt.won, tries: evt.tries, seconds: evt.seconds });
  }

  /**
   * The reward of a solved puzzle of the day (once per game and day, for every player):
   * Daily.REWARD hint credits, plus a bonus when the daily streak reaches 3, 7, 14, 30 … days.
   * Returns { n, credits, bonus, streak, next: { days, credits } } or null (nothing new).
   */
  function dailyReward(game, evt) {
    if (!evt.daily || !evt.won || !MBG.Credits || !MBG.Daily) return null;
    var d = daily();
    if (!d.claim(game, evt.daily)) return null;
    var st = d.streak(game);
    var bonus = MBG.Daily.streakBonus(st.cur);
    var user = evt.user && evt.user.mode ? evt.user : null;
    MBG.Credits.grantBonus(MBG.Daily.REWARD + bonus, user);
    return { n: evt.daily, credits: MBG.Daily.REWARD, bonus: bonus, streak: st.cur, next: MBG.Daily.nextBonus(st.cur) };
  }

  /** "Played 23 · 87 % won · streak 5" for the card after a win. */
  function line(game, user) {
    var name = statsName(user);
    if (!name) return null;
    var s = stats().summary(name, game, {});
    if (!s.played) return null;
    return t('stats.line', { played: s.played, pct: s.winPct, cur: s.cur });
  }

  /* ------------------------------------------------------------ statistics --- */
  function segment(items, current, onPick, cls) {
    var wrap = el('div', 'seg wl-seg ' + (cls || ''));
    wrap.setAttribute('role', 'radiogroup');
    items.forEach(function (it) {
      var b = el('button', 'seg-btn' + (it.value === current ? ' on' : ''));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', it.value === current ? 'true' : 'false');
      if (it.html) b.innerHTML = it.html; else b.textContent = it.label;
      if (it.aria) b.setAttribute('aria-label', it.aria);
      b.addEventListener('click', function () { onPick(it.value); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  var view = { game: 'codebreaker', length: 0, lang: '' };
  /** The statistics sheet. opts: { game } - the game it opens on. */
  function openStats(opts) {
    opts = opts || {};
    if (opts.game) { if (opts.game !== view.game) { view.length = 0; view.lang = ''; } view.game = opts.game; }
    var d = sheet('dlgStats', 'statsheet');
    d.setAttribute('aria-labelledby', 'stTitle');
    d.innerHTML =
      '<div class="sheet-head"><h2 id="stTitle"></h2><button type="button" class="btn ghost small" id="stClose"></button></div>' +
      '<div class="wl-filters" id="stFilters"></div>' +
      '<div class="sheet-scroll st-body" id="stBody" aria-live="polite"></div>';
    d.querySelector('#stClose').textContent = t('btn.close');
    d.querySelector('#stClose').addEventListener('click', function () { d.close(); });
    paint(d);
    show(d);
    return whenClosed(d);
  }

  function paint(d) {
    var name = statsName();
    var who = name === MBG.Storage.ANONYMOUS ? t('credits.anon') : name;
    d.querySelector('#stTitle').textContent = '📊 ' + t('stats.title') + (who ? ' · ' + who : '');
    var f = d.querySelector('#stFilters');
    f.textContent = '';
    var re = function () { paint(d); };
    f.appendChild(segment(GAMES.map(function (g) { return { value: g, label: Shell.gameName(g) }; }), view.game,
      function (v) { view.game = v; view.lang = ''; view.length = 0; re(); }, 'wl-games'));
    var unit = view.game === 'word' ? 'world.letters' : 'world.digits';
    f.appendChild(segment([{ value: 0, label: t('world.allLengths') }].concat(LENGTHS.map(function (n) {
      return { value: n, label: String(n), aria: t(unit, { n: n }) };
    })), view.length, function (v) { view.length = v; re(); }, 'wl-len'));
    if (view.game === 'word') {
      f.appendChild(segment([{ value: '', label: t('world.allLangs') }].concat(Shell.LANGS.map(function (l) {
        return { value: l, html: '<span class="wl-coin">' + MBG.LangMenu.flagSvg(l, true) + '</span>', aria: Shell.langName(l) };
      })), view.lang, function (v) { view.lang = v; re(); }, 'wl-lang'));
    }
    var body = d.querySelector('#stBody');
    body.textContent = '';
    if (!name) { body.appendChild(el('p', 'st-empty', t('stats.noData'))); return; }
    var s = stats().summary(name, view.game, { lang: view.lang, length: view.length });
    var grid = el('div', 'st-grid');
    var tile = function (value, label) {
      var b = el('div', 'st-tile');
      b.appendChild(el('strong', 'st-num', value));
      b.appendChild(el('span', 'st-lbl', label));
      grid.appendChild(b);
    };
    tile(fmt(s.played), t('stats.played'));
    tile(s.played ? s.winPct + '%' : '–', t('stats.won'));
    tile(fmt(s.cur), t('stats.streak'));
    tile(fmt(s.best), t('stats.bestStreak'));
    tile(s.avg != null ? MBG.AppText.dec(Shell.getLang(), s.avg) : '–', t('stats.avg'));
    tile(s.fastest != null ? clock(s.fastest) : '–', t('stats.fastest'));
    body.appendChild(grid);
    var best = new MBG.Storage.UserStore(Shell.store, view.game === 'word' ? 'MBG.Word.Users' : 'MBG.Codebreaker.Users').find(name);
    if (best && best.best > 0) body.appendChild(el('p', 'st-best', t('stats.bestScore', { score: fmt(best.best) })));
    if (!s.played) {
      body.appendChild(el('p', 'st-empty', t('stats.empty')));
    } else {
      body.appendChild(el('h3', null, t('stats.chart')));
      var rows = MBG.Stats.chartRows(s.dist);
      if (!rows.length) body.appendChild(el('p', 'st-empty', t('stats.noWins')));
      var max = rows.reduce(function (m, r) { return Math.max(m, r.n); }, 1);
      var chart = el('div', 'st-chart');
      rows.forEach(function (r) {
        var row = el('div', 'st-row');
        row.appendChild(el('span', 'st-k', r.plus ? r.label + '+' : String(r.label)));
        var bar = el('span', 'st-bar' + (r.n ? '' : ' zero'));
        bar.style.setProperty('--w', Math.max(r.n ? 8 : 0, Math.round(100 * r.n / max)) + '%');
        bar.appendChild(el('span', 'st-n', fmt(r.n)));
        row.appendChild(bar);
        row.setAttribute('aria-label', t('stats.rowAria', { tries: r.plus ? r.label + '+' : r.label, n: r.n }));
        chart.appendChild(row);
      });
      body.appendChild(chart);
    }
    // the daily puzzle of this game
    var ds = daily().streak(view.game);
    if (ds.played) {
      var p = el('p', 'st-daily');
      p.textContent = '📅 ' + t('stats.daily', { solved: ds.solved, played: ds.played, cur: ds.cur, best: ds.best });
      body.appendChild(p);
    }
  }

  /* ------------------------------------------------------------- sharing --- */
  function copyText(text) {
    var done = function () { return true; };
    var fallback = function () {
      var ta = el('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    };
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(done, fallback);
    }
    return Promise.resolve(fallback());
  }
  /** Android's own share sheet in the app (Capacitor's Share plugin); null in a browser. */
  var sharePlugin;
  function nativeShare() {
    if (sharePlugin !== undefined) return sharePlugin;
    var cx = root.capacitorExports, cap = cx && cx.Capacitor;
    sharePlugin = cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform() && typeof cx.registerPlugin === 'function'
      ? cx.registerPlugin('Share') : null;
    return sharePlugin;
  }
  /** The browser's own share sheet, where the page may use it (not inside another site's frame). */
  function webShareAllowed() {
    if (!root.navigator || typeof navigator.share !== 'function') return false;
    var pol = document.permissionsPolicy || document.featurePolicy;
    try { return !pol || typeof pol.allowsFeature !== 'function' || pol.allowsFeature('web-share'); } catch (e) { return true; }
  }
  function enc(s) { return encodeURIComponent(s); }
  var GLYPH = {
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    plane: '<path d="M3 11l18-7-7 17-3-7z"/><path d="M11 14l10-10"/>',
    phone: '<path d="M6 3h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
    sms: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
  };
  /**
   * Where the phone has no share sheet for the page (a browser, or the test page inside another
   * site): the game's own list of the usual messaging apps, each opening with the text filled in.
   */
  function openShareSheet(text, title) {
    var d = sheet('dlgShare', 'sharesheet');
    d.setAttribute('aria-labelledby', 'shTitle');
    d.innerHTML =
      '<div class="sheet-head"><h2 id="shTitle"></h2><button type="button" class="btn ghost small" id="shClose"></button></div>' +
      '<div class="sheet-scroll sh"><div class="sh-apps" id="shApps"></div><pre class="sh-text" id="shText" dir="auto"></pre></div>';
    var $ = function (id) { return d.querySelector('#' + id); };
    $('shTitle').textContent = t('share.title');
    $('shClose').textContent = t('btn.close');
    $('shClose').addEventListener('click', function () { d.close(); });
    $('shText').textContent = text;
    var noLink = text.replace('\n' + STORE_URL, '');
    var apps = [
      { name: 'WhatsApp', icon: 'chat', color: '#1FA855', href: 'https://wa.me/?text=' + enc(text) },
      { name: 'Viber', icon: 'phone', color: '#7360F2', href: 'viber://forward?text=' + enc(text) },
      { name: 'Telegram', icon: 'plane', color: '#229ED9', href: 'https://t.me/share/url?url=' + enc(STORE_URL) + '&text=' + enc(noLink) },
      { name: t('share.sms'), icon: 'sms', color: '#0E7C66', href: 'sms:?body=' + enc(text) },
      { name: t('share.email'), icon: 'mail', color: '#C2410C', href: 'mailto:?subject=' + enc(title || 'MBG Puzzles') + '&body=' + enc(text) },
      { name: t('share.copy'), icon: 'copy', color: '#4E5B68', copy: true }
    ];
    if (webShareAllowed()) apps.push({ name: t('share.more'), icon: 'more', color: '#4E5B68', web: true });
    apps.forEach(function (a) {
      var web = a.href && /^https:/.test(a.href);
      var b = el(web ? 'a' : 'button', 'sh-app');
      if (web) { b.href = a.href; b.target = '_blank'; b.rel = 'noopener'; } else b.type = 'button';
      var ic = el('span', 'sh-ic');
      ic.style.background = a.color;
      ic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + GLYPH[a.icon] + '</svg>';
      b.appendChild(ic);
      b.appendChild(el('span', 'sh-name', a.name));
      b.addEventListener('click', function () {
        if (a.copy) copyText(text).then(function (ok) { toast(ok ? t('share.copiedPaste') : t('share.copyFail')); });
        else if (a.web) navigator.share({ text: text }).catch(function () { /* cancelled */ });
        else if (a.href) openApp(a.href, text);
        setTimeout(function () { d.close(); }, 150);
      });
      $('shApps').appendChild(b);
    });
    show(d);
    return whenClosed(d);
  }
  /**
   * Opens an app by its own kind of link (sms:, mailto:, viber:) in this page, with the tap - a
   * new tab cannot open them (that is why they failed before). The message is copied first: if
   * the phone switched to the app, nothing more happens; if it did not (no such app, or a page
   * that may not open apps), the player is told to paste it.
   */
  function openApp(href, text) {
    var left = false;
    var gone = function () { left = true; };
    document.addEventListener('visibilitychange', gone, { once: true });
    root.addEventListener('blur', gone, { once: true });
    copyText(text);
    try { root.location.href = href; } catch (e) { /* not allowed here */ }
    setTimeout(function () {
      document.removeEventListener('visibilitychange', gone);
      root.removeEventListener('blur', gone);
      if (!left && !document.hidden) toast(t('share.notOpened'));
    }, 1800);
  }

  /**
   * Shares a text: in the app Android's own share sheet (every messaging app on the phone); in a
   * browser its share sheet where the page may use it; otherwise the game's own list of apps.
   */
  function share(text, title) {
    var plugin = nativeShare();
    if (plugin) {
      return plugin.share({ title: title || 'MBG Puzzles', text: text, dialogTitle: t('share.title') })
        .catch(function (e) { if (/cancel/i.test(String((e && e.message) || e))) return; return openShareSheet(text, title); });
    }
    if (webShareAllowed()) {
      return navigator.share({ text: text }).catch(function (e) { if (e && e.name === 'AbortError') return; return openShareSheet(text, title); });
    }
    return openShareSheet(text, title);
  }

  /**
   * A puzzle of the day as a message a friend understands, in the player's language: what it is,
   * the result in words, the tries as coloured squares (letters or digits stay hidden - the
   * friend can still play the same puzzle today), what the colours mean, and where to play.
   * o: { game, title, n, extra, won, tries, seconds, hints, streak, rows }
   */
  function dailyMessage(o) {
    var rtl = MBG.AppText.RTL.indexOf(Shell.getLang()) !== -1;
    var mark = rtl ? '\u200F' : '';                 // Arabic: the squares run right to left, like the board
    var word = o.game === 'word';
    var lines = [t('share.dailyHead', { title: o.title, n: o.n, extra: o.extra || '' })];
    lines.push(o.won ? t('share.dailyWon', { tries: o.tries, time: MBG.Daily.clock(o.seconds), hints: o.hints || 0 })
      : t('share.dailyLost', { tries: o.tries }));
    if (o.streak > 1) lines.push(t('share.dailyStreak', { n: o.streak }));
    lines.push('');
    MBG.Daily.grid(o.rows).forEach(function (r) { lines.push(mark + r); });
    lines.push('');
    lines.push(t(word ? 'share.legendWord' : 'share.legendCode'));
    lines.push(t(word ? 'share.hiddenWord' : 'share.hiddenCode'));
    lines.push('');
    lines.push(t('share.challenge'));
    lines.push(STORE_URL);
    return lines.join('\n');
  }

  /** The Share button for a text (it opens the phone's share sheet, or the game's own list). */
  function shareButtons(text, opts) {
    opts = opts || {};
    var box = el('div', 'share-row');
    var s = el('button', 'btn submit small share-btn', '');
    s.type = 'button';
    s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/>' +
      '<circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.9l7.6-4.4M8.2 13.1l7.6 4.4"/></svg>';
    s.appendChild(document.createTextNode(' ' + t('share.share')));
    s.addEventListener('click', function () { share(text, opts.subject); });
    box.appendChild(s);
    return box;
  }

  /* ---------------------------------------------------- move to a new phone --- */
  function openTransfer() {
    var d = sheet('dlgTransfer', 'transfersheet');
    d.setAttribute('aria-labelledby', 'tfTitle');
    d.innerHTML =
      '<div class="sheet-head"><h2 id="tfTitle"></h2><button type="button" class="btn ghost small" id="tfClose"></button></div>' +
      '<div class="sheet-scroll tf">' +
      '  <p id="tfIntro"></p>' +
      '  <h3 id="tfOldTitle"></h3>' +
      '  <textarea class="textfield tf-code" id="tfCode" rows="4" readonly dir="ltr" spellcheck="false"></textarea>' +
      '  <div id="tfShare"></div>' +
      '  <p class="muted" id="tfKeep"></p>' +
      '  <h3 id="tfNewTitle"></h3>' +
      '  <textarea class="textfield tf-code" id="tfIn" rows="4" dir="ltr" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>' +
      '  <div class="dlg-actions"><button type="button" class="btn ghost small" id="tfPaste"></button>' +
      '  <button type="button" class="btn submit small" id="tfGo"></button></div>' +
      '  <p class="pw-msg" id="tfMsg" role="status" aria-live="polite" hidden></p>' +
      '  <p class="muted" id="tfNote"></p>' +
      '  <p class="muted" id="tfBackup"></p>' +
      '</div>';
    var $ = function (id) { return d.querySelector('#' + id); };
    $('tfTitle').textContent = '📲 ' + t('move.title');
    $('tfClose').textContent = t('btn.close');
    $('tfIntro').textContent = t('move.intro');
    $('tfOldTitle').textContent = t('move.oldTitle');
    $('tfNewTitle').textContent = t('move.newTitle');
    $('tfIn').placeholder = t('move.placeholder');
    $('tfPaste').textContent = t('move.paste');
    $('tfGo').textContent = t('move.go');
    $('tfNote').textContent = t('move.note');
    $('tfBackup').textContent = t('move.backup');
    $('tfCode').value = '…';
    var msg = function (text, ok) { $('tfMsg').textContent = text || ''; $('tfMsg').hidden = !text; $('tfMsg').classList.toggle('ok', !!ok); };
    MBG.Transfer.makeCode(Shell.store).then(function (code) {
      $('tfCode').value = code;
      $('tfShare').appendChild(shareButtons(t('move.message') + '\n\n' + code, { email: true, subject: t('move.subject') }));
      var w = MBG.Transfer.collect(Shell.store).wo;
      $('tfKeep').textContent = t(w ? 'move.keepWorld' : 'move.keep');
    });
    $('tfCode').addEventListener('focus', function () { try { $('tfCode').select(); } catch (e) { /* ignore */ } });
    $('tfClose').addEventListener('click', function () { d.close(); });
    $('tfPaste').addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (txt) { $('tfIn').value = txt; }, function () { $('tfIn').focus(); msg(t('move.pasteHand')); });
      } else { $('tfIn').focus(); msg(t('move.pasteHand')); }
    });
    var busy = false;
    $('tfGo').addEventListener('click', function () {
      if (busy) return;
      busy = true;
      msg('');
      MBG.Transfer.readCode($('tfIn').value).then(function (data) {
        busy = false;
        if (data.error) { msg(t(data.error === 'check' ? 'move.badCheck' : data.error === 'zip' ? 'move.badZip' : 'move.badCode')); return; }
        var r = MBG.Transfer.apply(Shell.store, data);
        msg(t('move.done', { names: r.names, games: r.games }) + (r.world ? ' ' + t('move.doneWorld') : ''), true);
        $('tfGo').textContent = t('move.restart');
        $('tfGo').onclick = function () { root.location.reload(); };
        busy = true;
      });
    });
    show(d);
    return whenClosed(d);
  }

  MBG.Sheets = {
    openStats: openStats, openTransfer: openTransfer, shareButtons: shareButtons, copyText: copyText,
    record: record, line: line, statsName: statsName, daily: daily, stats: stats,
    dailyReward: dailyReward, dailyMessage: dailyMessage, share: share, STORE_URL: STORE_URL
  };
})(typeof self !== 'undefined' ? self : globalThis);
