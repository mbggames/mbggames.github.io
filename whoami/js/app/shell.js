/*!
 * MBG Who Am I? - the app shell shared by every screen (taken over from MBG Puzzles' app.js):
 *  - knows whether it runs inside the Android app (Capacitor) or in a browser (also a file
 *    opened from a folder on a laptop - no server needed)
 *  - the interface language (first start: the phone's language, then the player's choice), the
 *    player (anonymous, a name on this phone, or an MBG account), theme, text size and sound
 *  - moving between screens, the Android Back button, the status bar colours
 *  - small helpers for the screens: el(), toast(), sheets and a confirm dialog
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};

  var VERSION = '1.0.0';
  var CONTACT = { email: 'merkur@gmail.com', whatsapp: '38349311911', phone: '+383 49 311 911' };
  var KEYS = { lang: 'MBG.App.lang', user: 'MBG.Who.user', prefs: 'MBG.Who.prefs' };

  var cap = root.capacitorExports && root.capacitorExports.Capacitor;
  var native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  var AppPlugin = native && root.capacitorApp ? root.capacitorApp.App : null;
  var SystemBars = native && root.capacitorExports ? root.capacitorExports.SystemBars : null;

  /* ------------------------------------------- the phone's silent mode --- */
  // In the Android app: when the phone is on silent or vibrate, the game is silent too (the small
  // native part SoundModePlugin.java tells us). Checked at the start, on return and every few seconds.
  // In a browser this cannot be known; there the media volume of the phone applies, and the 🔊 button.
  var phoneQuiet = false, SoundMode = null;
  if (native && root.capacitorExports && typeof root.capacitorExports.registerPlugin === 'function') {
    try { SoundMode = root.capacitorExports.registerPlugin('SoundMode'); } catch (e) { SoundMode = null; }
  }
  function checkSilent() {
    if (!SoundMode || (root.document && root.document.hidden)) return;
    try { SoundMode.get().then(function (r) { phoneQuiet = !!(r && r.silent); }, function () { /* an older app without it */ }); } catch (e) { /* ignore */ }
  }
  if (SoundMode) {
    checkSilent();
    setInterval(checkSilent, 4000);
    if (root.document) root.document.addEventListener('visibilitychange', checkSilent);
  }
  function phoneSilent() { return phoneQuiet; }

  /* ------------------------------------------------------- storage --- */
  function MemoryStorage() { this._d = {}; }
  MemoryStorage.prototype.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; };
  MemoryStorage.prototype.setItem = function (k, v) { this._d[k] = String(v); };
  MemoryStorage.prototype.removeItem = function (k) { delete this._d[k]; };
  var store = (function () {
    try { var s = root.localStorage; s.setItem('__mbg_probe__', '1'); s.removeItem('__mbg_probe__'); return s; } catch (e) { return new MemoryStorage(); }
  })();
  function readJson(key, def) { try { var v = JSON.parse(store.getItem(key) || 'null'); return v == null ? def : v; } catch (e) { return def; } }
  function writeJson(key, v) { try { store.setItem(key, JSON.stringify(v)); } catch (e) { /* full or blocked */ } }

  /* ------------------------------------------------------ language --- */
  var LANGS = MBG.Text.LANGS;          // ['en', 'sq', 'de', 'bs']
  function deviceLang() {
    var list = [];
    try { list = (root.navigator && (root.navigator.languages || [root.navigator.language])) || []; } catch (e) { list = []; }
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i] || '').toLowerCase().split(/[-_]/)[0];
      if (c === 'sq') return 'sq';
      if (c === 'bs' || c === 'hr' || c === 'cnr' || c === 'sh' || c === 'sr') return 'bs';
      if (c === 'de' || c === 'gsw' || c === 'lb') return 'de';
      if (c === 'en') return 'en';
    }
    return 'en';
  }
  function stored() { var l = null; try { l = store.getItem(KEYS.lang); } catch (e) { l = null; } return LANGS.indexOf(l) !== -1 ? l : null; }
  function getLang() { return stored() || deviceLang(); }
  // the time of the last change: the playing language follows the app's language from then on
  function setLang(l) { if (LANGS.indexOf(l) !== -1) try { store.setItem(KEYS.lang, l); store.setItem(KEYS.lang + 'At', String(Date.now())); } catch (e) { /* ignore */ } }
  function langAt() { try { return Number(store.getItem(KEYS.lang + 'At')) || 0; } catch (e) { return 0; } }
  function langChosen() { return !!stored(); }
  // a link with ?lang=sq (from mbggames.com, in each language) opens the game in that language
  (function () {
    try {
      var q = new URLSearchParams(root.location && root.location.search || '').get('lang');
      var c = String(q || '').toLowerCase().split(/[-_]/)[0];
      if (c === 'hr' || c === 'sr' || c === 'cnr' || c === 'sh') c = 'bs';
      if (LANGS.indexOf(c) !== -1) setLang(c);
    } catch (e) { /* no address */ }
  })();

  /* -------------------------------------------------------- player --- */
  /** { mode: 'anonymous' | 'local' | 'account', name } */
  function getUser() {
    var u = readJson(KEYS.user, null);
    if (u && u.mode === 'local' && u.name) return { mode: 'local', name: u.name };
    if (u && u.mode === 'account' && u.name) return { mode: 'account', name: u.name };
    return { mode: 'anonymous', name: null };
  }
  function setUser(u) { writeJson(KEYS.user, u && u.mode !== 'anonymous' ? { mode: u.mode, name: u.name } : { mode: 'anonymous' }); }
  function playerName() { var u = getUser(); return u.name || t('welcome.anonName'); }
  /* "Keep me signed in on this device" off: the name (or MBG account) is for this visit only - when
     the app or browser is opened again, the welcome card asks who is playing. */
  (function () {
    var ss = null;
    try { ss = root.sessionStorage; } catch (e) { ss = null; }
    var p = readJson(KEYS.prefs, {}) || {};
    var fresh = !ss || !ss.getItem('MBG.Who.visit');
    if (ss) try { ss.setItem('MBG.Who.visit', '1'); } catch (e) { /* ignore */ }
    if (fresh && p.keepIn === false && (readJson(KEYS.user, {}) || {}).mode !== 'anonymous') {
      writeJson(KEYS.user, { mode: 'anonymous' });
      writeJson('MBG.Platform.account', {});
      p.welcomeDone = false;
      writeJson(KEYS.prefs, p);
    }
  })();
  /** The same rules for names as MBG Puzzles and its server. */
  var NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,18}[\p{L}\p{N}._-]$/u;
  var RESERVED = ['anonymous', 'anonim', 'anonimno', 'anonym', 'computer', 'kompjuteri', 'kompjuter', 'admin', 'mbg', 'moderator'];
  function checkName(n) {
    n = String(n || '').normalize('NFC').trim();
    if (RESERVED.indexOf(n.toLowerCase()) !== -1) return 'reserved';
    if (!NAME_RE.test(n) || Array.from(n).length > 20) return 'invalid';
    return null;
  }

  /* ---------------------------------------------------- preferences --- */
  var PREF_DEFAULTS = { theme: null, fontSize: 17, sound: true, tick: true, anim: true, keepIn: true, chips: true, dataHint: true, voice: true, pics: true, splash: true, intro: false, welcomeDone: false, hue: null };
  function getPrefs() {
    var p = readJson(KEYS.prefs, {}), out = {};
    for (var k in PREF_DEFAULTS) out[k] = p[k] != null ? p[k] : PREF_DEFAULTS[k];
    for (var j in p) if (!(j in out)) out[j] = p[j];
    return out;
  }
  function setPrefs(patch) { var p = getPrefs(); for (var k in patch) p[k] = patch[k]; writeJson(KEYS.prefs, p); return p; }

  /* --------------------------------------------- theme and text size --- */
  var THEMES = ['light', 'dark', 'adriatic', 'meadow', 'rose', 'random'];
  var DARK = ['dark', 'adriatic'];
  var SKIN_KEYS = ['--bg', '--surface', '--card', '--ink', '--muted', '--line', '--accent', '--on-accent', '--accent-soft', '--brand', '--focus', '--scrim', '--shadow'];
  function skinVars(h) {
    var c = function (s, l) { return 'hsl(' + Math.round(h) + ' ' + s + '% ' + l + '%)'; };
    return { '--bg': c(38, 87), '--surface': c(42, 92), '--card': c(45, 98), '--ink': c(32, 12), '--muted': c(16, 32), '--line': c(24, 77),
      '--accent': c(52, 27), '--on-accent': '#FFFFFF', '--accent-soft': c(46, 85), '--brand': '#B4172F', '--focus': '#1565C0',
      '--scrim': 'rgba(10, 16, 22, .55)', '--shadow': '0 10px 30px rgba(15, 25, 35, .18)' };
  }
  function themeOf(p) {
    if (THEMES.indexOf(p.theme) !== -1) return p.theme;
    return root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function setBarsDark(dark) {
    if (!SystemBars || typeof SystemBars.setStyle !== 'function') return;
    try { SystemBars.setStyle({ style: dark ? 'DARK' : 'LIGHT' }); } catch (e) { /* ignore */ }
  }
  function applyLook() {
    var p = getPrefs(), th = themeOf(p), de = document.documentElement;
    de.setAttribute('data-skin', th);
    if (th === 'random') {
      var hue = typeof p.hue === 'number' ? p.hue : 200, v = skinVars(hue);
      for (var k in v) de.style.setProperty(k, v[k]);
      de.style.setProperty('color-scheme', 'light');
    } else { SKIN_KEYS.forEach(function (k) { de.style.removeProperty(k); }); de.style.removeProperty('color-scheme'); }
    de.style.setProperty('--fs', Math.min(24, Math.max(14, Number(p.fontSize) || 17)) + 'px');
    de.lang = getLang();
    setBarsDark(DARK.indexOf(th) !== -1);
    return th;
  }
  function newHue(old) {
    var h;
    do { h = Math.floor(Math.random() * 360); } while (typeof old === 'number' && Math.min(Math.abs(h - old), 360 - Math.abs(h - old)) < 50);
    return h;
  }

  /* ---------------------------------------------------- navigation --- */
  function go(page) {
    try { root.sessionStorage.setItem('MBG.Who.nav', '1'); } catch (e) { /* ignore */ }
    try { root.dispatchEvent(new CustomEvent('mbg:leave')); } catch (e) { /* ignore */ }
    root.location.href = page;
  }
  function exitApp() { if (AppPlugin && typeof AppPlugin.exitApp === 'function') { AppPlugin.exitApp(); return true; } return false; }
  var backHandler = null;
  function setBackHandler(fn) { backHandler = fn; }
  if (AppPlugin && typeof AppPlugin.addListener === 'function') {
    AppPlugin.addListener('backButton', function () {
      var open = document.querySelectorAll('dialog[open]');
      if (open.length) { var d = open[open.length - 1]; try { d.close('cancel'); } catch (e) { d.removeAttribute('open'); } return; }
      if (backHandler) backHandler(); else exitApp();
    });
  }

  /* ------------------------------------------------------- helpers --- */
  function t(key, params) { return MBG.Text.t(getLang(), key, params); }
  function tIn(lang, key, params) { return MBG.Text.t(lang, key, params); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var toastTimer = null;
  function toast(msg, ms) {
    var n = document.getElementById('toast');
    if (!n) { n = el('div', 'toast'); n.id = 'toast'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); document.body.appendChild(n); }
    n.textContent = msg;
    n.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { n.hidden = true; }, ms || 2600);
  }
  function show(d) { if (d.open) return; try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
  function closed(d) { return new Promise(function (r) { d.addEventListener('close', function f() { d.removeEventListener('close', f); r(d.returnValue); }); }); }
  /**
   * A sheet: { id, title, cls, actions: [{ label, cls, onClick }] } → { dlg, body, head, close() }.
   * The main button sits at the top next to Close (MBG Puzzles 1.7.2: the way on is always at the top).
   */
  function sheet(o) {
    var d = o.id ? document.getElementById(o.id) : null;
    if (d) d.remove();
    d = el('dialog', 'dlg sheet ' + (o.cls || ''));
    if (o.id) d.id = o.id;
    var head = el('div', 'sheet-head');
    var h = el('h2', null, o.title || '');
    head.appendChild(h);
    var acts = el('div', 'head-actions');
    (o.actions || []).forEach(function (a) {
      var b = el('button', 'btn small ' + (a.cls || 'submit'), a.label);
      b.type = 'button';
      b.addEventListener('click', a.onClick);
      acts.appendChild(b);
    });
    var x = el('button', 'btn ghost small', t('btn.close'));
    x.type = 'button';
    x.addEventListener('click', function () { d.close('close'); });
    acts.appendChild(x);
    head.appendChild(acts);
    var body = el('div', 'sheet-scroll');
    d.appendChild(head);
    d.appendChild(body);
    d.addEventListener('click', function (e) { if (e.target === d && !o.modal) d.close('cancel'); });
    d.addEventListener('close', function () { setTimeout(function () { if (!d.open) d.remove(); }, 400); if (o.onClose) o.onClose(d.returnValue); });
    document.body.appendChild(d);
    show(d);
    return { dlg: d, body: body, head: head, title: h, actions: acts, close: function (v) { d.close(v || 'done'); } };
  }
  /** Yes/no dialog → Promise<boolean>. */
  function confirmBox(o) {
    var d = el('dialog', 'dlg');
    d.innerHTML = '<form method="dialog" class="dlg-body"><h2></h2><p></p><div class="dlg-actions"><button value="cancel" class="btn ghost"></button><button value="ok" class="btn submit"></button></div></form>';
    d.querySelector('h2').textContent = o.title || '';
    d.querySelector('p').textContent = o.text || '';
    d.querySelector('[value=cancel]').textContent = o.cancel || t('dlg.cancel');
    var okb = d.querySelector('[value=ok]');
    okb.textContent = o.ok || 'OK';
    if (o.danger) okb.classList.add('danger');
    document.body.appendChild(d);
    show(d);
    d.querySelector('[value=cancel]').focus();
    return closed(d).then(function (v) { d.remove(); return v === 'ok'; });
  }
  function fmtNum(n, lang) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, (lang || getLang()) === 'en' ? ',' : (lang || getLang()) === 'sq' ? ' ' : '.'); }
  /**
   * A date in the language of the app, with our own names (not every phone or browser knows the
   * Albanian and Bosnian ones). o: { weekday, long (weekday in full), year, utc }
   *   en Fri, Nov 13 · sq Pre, 13 nën · de Fr., 13. Nov. · bs pet, 13. nov.
   */
  var DATES = {
    en: { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], D: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      m: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    sq: { d: ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'], D: ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'],
      m: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'tet', 'nën', 'dhj'] },
    de: { d: ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'], D: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      m: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'] },
    bs: { d: ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'], D: ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'],
      m: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun', 'jul', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'] }
  };
  function dateText(ms, o, lang) {
    o = o || {};
    var L = DATES[lang || getLang()] || DATES.en, d = new Date(ms);
    var wd = o.utc ? d.getUTCDay() : d.getDay(), day = o.utc ? d.getUTCDate() : d.getDate(), mo = o.utc ? d.getUTCMonth() : d.getMonth(), y = o.utc ? d.getUTCFullYear() : d.getFullYear();
    if (o.long && !o.day) return L.D[wd];
    var l = lang || getLang(), core;
    if (l === 'en') core = L.m[mo] + ' ' + day + (o.year ? ', ' + y : '');
    else if (l === 'sq') core = day + ' ' + L.m[mo] + (o.year ? ' ' + y : '');
    else core = day + '. ' + L.m[mo] + (o.year ? ' ' + y : '');
    return o.weekday ? L.d[wd] + ', ' + core : core;
  }
  function ago(ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return t('time.now');
    if (s < 3600) return t('time.min', { n: Math.round(s / 60) });
    if (s < 86400) return t('time.h', { n: Math.round(s / 3600) });
    return t('time.d', { n: Math.round(s / 86400) });
  }

  /** A 🔊 / 🔇 button for the one Sound On/Off switch (on by default). */
  function soundButton(btn, onChange) {
    function paint() {
      var on = getPrefs().sound !== false;
      btn.textContent = on ? '🔊' : '🔇';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var label = t(on ? 'set.soundOn' : 'set.soundOff') + (on && phoneQuiet ? ' · ' + t('set.phoneSilent') : '');
      btn.title = label; btn.setAttribute('aria-label', label);
    }
    btn.addEventListener('click', function () {
      var on = getPrefs().sound === false;
      setPrefs({ sound: on });
      paint();
      toast(on ? '🔊 ' + t('set.soundOn') + (phoneQuiet ? ' · ' + t('set.phoneSilent') : '') : '🔇 ' + t('set.soundOff'));
      if (onChange) onChange(on);
    });
    paint();
    return paint;
  }

  MBG.Shell = {
    VERSION: VERSION, CONTACT: CONTACT, KEYS: KEYS, native: native, langAt: langAt, store: store, readJson: readJson, writeJson: writeJson, phoneSilent: phoneSilent, soundButton: soundButton,
    LANGS: LANGS, dateText: dateText, getLang: getLang, setLang: setLang, langChosen: langChosen, deviceLang: deviceLang,
    langName: function (l) { return MBG.Text.NAMES[l] || l; },
    getUser: getUser, setUser: setUser, playerName: playerName, checkName: checkName,
    getPrefs: getPrefs, setPrefs: setPrefs, THEMES: THEMES, themeOf: themeOf, applyLook: applyLook, newHue: newHue,
    go: go, goHome: function () { go('index.html'); }, exitApp: exitApp, setBackHandler: setBackHandler,
    t: t, tIn: tIn, el: el, toast: toast, show: show, closed: closed, sheet: sheet, confirm: confirmBox, fmtNum: fmtNum, ago: ago
  };
})(typeof self !== 'undefined' ? self : globalThis);
