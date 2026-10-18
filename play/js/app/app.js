/*!
 * MBG Puzzles - app shell shared by the home screen and both games.
 *  - knows whether it runs inside the Android app (Capacitor) or in a web browser,
 *    and which edition it is (MBG.EDITION: 'free' or 'paid', see edition.js)
 *  - keeps what both games share: language, the logged-in user, the free week and
 *    subscription state (MBG.Access), theme / text size / sound
 *  - moves between the home screen and the games
 *  - routes the Android Back button to the current screen
 *  - colours the Android status bar icons to match the theme
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};

  var VERSION = '1.0.0';
  // Contact shown on the home screen (and in the privacy policy). WhatsApp: number in
  // international form without + or spaces.
  var CONTACT = { email: 'merkur@gmail.com', whatsapp: '38349311911', phone: '+383 49 311 911' };
  var FREE = MBG.EDITION !== 'paid';      // the free edition has no limits and no purchases
  var KEYS = { lang: 'MBG.App.lang', user: 'MBG.App.user', prefs: 'MBG.App.prefs', access: 'MBG.App.access' };

  var cap = root.capacitorExports && root.capacitorExports.Capacitor;
  var native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  var AppPlugin = native && root.capacitorApp ? root.capacitorApp.App : null;
  var SystemBars = native && root.capacitorExports ? root.capacitorExports.SystemBars : null;

  /* ------------------------------------------------------- storage --- */
  function MemoryStorage() { this._d = {}; }
  MemoryStorage.prototype.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; };
  MemoryStorage.prototype.setItem = function (k, v) { this._d[k] = String(v); };
  MemoryStorage.prototype.removeItem = function (k) { delete this._d[k]; };

  var store = (function () {
    try {
      var s = root.localStorage;
      s.setItem('__mbg_probe__', '1');
      s.removeItem('__mbg_probe__');
      return s;
    } catch (e) { return new MemoryStorage(); }
  })();

  function readJson(key) { try { return JSON.parse(store.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJson(key, v) { try { store.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  /* ------------------------------------------- language and user --- */
  var LANGS = MBG.AppText.LANGS;           // ['en', 'sq', 'bs', 'de', 'es', 'fr', 'tr', 'pl', 'pt', 'ar']
  /**
   * First start: the phone's language decides - Albanian; Bosnian (also for Croatian and
   * Montenegrin phones); German (also Swiss German, Luxembourgish); Spanish; French; Turkish;
   * otherwise English.
   */
  function deviceLang() {
    var list = [];
    try { list = (root.navigator && (root.navigator.languages || [root.navigator.language])) || []; } catch (e) { list = []; }
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i] || '').toLowerCase().split(/[-_]/)[0];
      if (code === 'sq') return 'sq';
      if (code === 'bs' || code === 'hr' || code === 'cnr' || code === 'sh' || code === 'sr') return 'bs';
      if (code === 'de' || code === 'gsw' || code === 'lb') return 'de';
      if (code === 'es') return 'es';
      if (code === 'fr') return 'fr';
      if (code === 'tr') return 'tr';
      if (code === 'pl') return 'pl';
      if (code === 'pt') return 'pt';
      if (code === 'ar') return 'ar';
      if (code === 'en') return 'en';
    }
    return 'en';
  }
  function getLang() {
    var l = null;
    try { l = store.getItem(KEYS.lang); } catch (e) { l = null; }
    return LANGS.indexOf(l) !== -1 ? l : deviceLang();
  }
  function setLang(l) { if (LANGS.indexOf(l) === -1) return; try { store.setItem(KEYS.lang, l); } catch (e) { /* ignore */ } }

  /** The user chosen in either game: { mode: 'anonymous'|'registered'|'nodata', name }. */
  function getUser() {
    var u = readJson(KEYS.user);
    if (u && (u.mode === 'registered' && typeof u.name === 'string' && u.name)) return { mode: 'registered', name: u.name };
    if (u && u.mode === 'nodata') return { mode: 'nodata', name: null };
    return { mode: 'anonymous', name: null };
  }
  function setUser(u) {
    if (!u) return;
    writeJson(KEYS.user, { mode: u.mode, name: u.mode === 'registered' ? u.name : null });
  }

  /* ------------------------------------------------------ access --- */
  var access = new MBG.Access.AccessStore(store, KEYS.access, null, { unlimited: FREE && !MBG.PREVIEW });
  access.ensureStarted();

  /* -------------------------------------------------- navigation --- */
  var leaving = false;
  function go(page) {
    leaving = true;
    try { root.sessionStorage.setItem('MBG.App.nav', '1'); } catch (e) { /* ignore */ }
    try { root.dispatchEvent(new CustomEvent('mbg:leave')); } catch (e) { /* ignore */ }
    root.location.href = page;
  }
  function goHome() { go('index.html'); }
  /** opts.daily: today's daily puzzle instead of a normal game. */
  function openGame(id, opts) { go((id === 'word' ? 'word.html' : 'codebreaker.html') + (opts && opts.daily ? '?daily=1' : '')); }
  function isLeaving() { return leaving; }
  /** True once on the screen reached through the app's own navigation (Home / Play). */
  var arrivedByNav = (function () {
    try {
      var v = root.sessionStorage.getItem('MBG.App.nav') === '1';
      root.sessionStorage.removeItem('MBG.App.nav');
      return v;
    } catch (e) { return false; }
  })();

  /** Closes the app (Android) - only from the home screen, after "Close MBG Puzzles?". */
  function exitApp() {
    if (AppPlugin && typeof AppPlugin.exitApp === 'function') { AppPlugin.exitApp(); return true; }
    return false;
  }

  /* ------------------------------------------------- Back button --- */
  var backHandler = null;
  function setBackHandler(fn) { backHandler = fn; }
  if (AppPlugin && typeof AppPlugin.addListener === 'function') {
    AppPlugin.addListener('backButton', function () {
      // An open dialog closes first, on every screen.
      var open = document.querySelector('dialog[open]');
      if (open) {
        try { open.close('cancel'); } catch (e) { open.removeAttribute('open'); }
        return;
      }
      if (backHandler) backHandler(); else exitApp();
    });
  }

  /* ------------------------------------------ Android status bar --- */
  function setBarsDark(dark) {
    if (!SystemBars || typeof SystemBars.setStyle !== 'function') return;
    // 'DARK' = light icons for a dark background, 'LIGHT' = dark icons for a light one.
    try { SystemBars.setStyle({ style: dark ? 'DARK' : 'LIGHT' }); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------- theme, text size, sound --- */
  var THEMES = ['light', 'dark', 'adriatic', 'meadow', 'rose', 'random'];
  var DARK_THEMES = ['dark', 'adriatic'];

  /*
   * "Random colours": a soft, light background in a colour picked at random (a new one with every
   * game). Only the hue changes; saturation and lightness stay in a calm, easy-to-read range, and
   * the clue colours (green, yellow, grey) never change, so they always mean the same.
   */
  var SKIN_KEYS = ['--bg', '--surface', '--card', '--ink', '--muted', '--line', '--accent', '--on-accent',
    '--accent-soft', '--brand', '--hit', '--on-hit', '--near', '--on-near', '--miss', '--on-miss', '--warn-bg',
    '--warn-ink', '--warn-line', '--focus', '--scrim', '--shadow'];
  function skinVars(h) {
    var c = function (s, l) { return 'hsl(' + Math.round(h) + ' ' + s + '% ' + l + '%)'; };
    return {
      '--bg': c(38, 87), '--surface': c(42, 92), '--card': c(45, 98), '--ink': c(32, 12), '--muted': c(16, 32),
      '--line': c(24, 77), '--accent': c(52, 27), '--on-accent': '#FFFFFF', '--accent-soft': c(46, 85),
      '--brand': '#B4172F', '--hit': '#1E7B4E', '--on-hit': '#FFFFFF', '--near': '#CC8C0C', '--on-near': '#1B1406',
      '--miss': c(9, 44), '--on-miss': '#FFFFFF', '--warn-bg': '#FFF1C9', '--warn-ink': '#5A3E00', '--warn-line': '#E0C164',
      '--focus': '#1565C0', '--scrim': 'rgba(10, 16, 22, .55)', '--shadow': '0 10px 30px rgba(15, 25, 35, .18)'
    };
  }
  /** A new random hue, clearly different from the last one. */
  function newHue(old) {
    var h;
    do { h = Math.floor(Math.random() * 360); } while (typeof old === 'number' && Math.min(Math.abs(h - old), 360 - Math.abs(h - old)) < 50);
    return h;
  }
  /** Sets a skin on the page; for 'random' the colours come from the hue. */
  function applySkin(theme, hue) {
    var de = document.documentElement;
    de.setAttribute('data-skin', theme);
    if (theme === 'random') {
      var v = skinVars(typeof hue === 'number' ? hue : 200);
      for (var k in v) de.style.setProperty(k, v[k]);
      de.style.setProperty('color-scheme', 'light');
    } else {
      SKIN_KEYS.forEach(function (k) { de.style.removeProperty(k); });
      de.style.removeProperty('color-scheme');
    }
    setBarsDark(DARK_THEMES.indexOf(theme) !== -1);
  }
  function getPrefs() {
    var p = readJson(KEYS.prefs);
    return p && typeof p === 'object' ? p : {};
  }
  function themeOf(prefs) {
    var t = prefs.theme;
    if (THEMES.indexOf(t) !== -1) return t;
    var dark = root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches;
    return dark ? 'dark' : 'light';
  }
  /** Applies the shared theme and text size to a page that has no game screen (home, privacy). */
  function applyLook() {
    var p = getPrefs();
    var theme = themeOf(p);
    applySkin(theme, p.hue);
    if (typeof p.fontSize === 'number') document.documentElement.style.setProperty('--fs', Math.min(26, Math.max(13, p.fontSize)) + 'px');
    return theme;
  }

  /* --------------------------------------------------- helpers --- */
  function t(key, params) { return MBG.AppText.t(getLang(), key, params); }
  function duration(ms) { return t('dur', MBG.Access.splitDuration(ms)); }

  MBG.Shell = {
    VERSION: VERSION,
    CONTACT: CONTACT,
    KEYS: KEYS,
    native: native,
    free: FREE,
    preview: !!MBG.PREVIEW,
    LANGS: LANGS,
    store: store,
    access: access,
    getLang: getLang,
    setLang: setLang,
    getUser: getUser,
    setUser: setUser,
    getPrefs: getPrefs,
    themeOf: themeOf,
    isDarkTheme: function (name) { return DARK_THEMES.indexOf(name) !== -1; },
    applyLook: applyLook,
    applySkin: applySkin,
    newHue: newHue,
    setBarsDark: setBarsDark,
    goHome: goHome,
    openGame: openGame,
    isLeaving: isLeaving,
    arrivedByNav: arrivedByNav,
    exitApp: exitApp,
    setBackHandler: setBackHandler,
    t: t,
    tIn: function (lang, key, params) { return MBG.AppText.t(lang, key, params); },
    langName: function (l) { return MBG.AppText.NAMES[l] || l; },
    duration: duration,
    gameName: function (id) { return t(id === 'word' ? 'game.word' : 'game.codebreaker'); }
  };
})(typeof self !== 'undefined' ? self : globalThis);
