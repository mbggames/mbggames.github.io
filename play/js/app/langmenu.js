/*!
 * MBG Puzzles - the language picker shared by the home screen and both games.
 *
 * The button is a little stack of round flags ("coins"): the language in use in front,
 * the next two of the list peeking out behind it. Tapping it opens a sheet with one large
 * row per language - flag, the language's own name and a greeting in that language - so a
 * player who does not read the current language still finds theirs at a glance.
 *   English  - United Kingdom
 *   Shqip    - Albania and Kosovo
 *   Bosanski - Bosnia and Herzegovina and Croatia (Latin script only)
 *   Deutsch  - Germany, Austria and Switzerland
 *   Español  - Spain
 *   Français - France
 *   Türkçe   - Türkiye
 * Flags: flag-icons by Panayiotis Lipiridis (MIT licence), drawn inline so no file is loaded.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;

  // The round flags (www/js/app/flags.js, made by tools/make_flags.mjs). Albanian shows Albania
  // and Kosovo, Bosnian Bosnia and Herzegovina and Croatia, German Germany, Austria and
  // Switzerland, Portuguese Brazil, Arabic the flag of the Arab League.
  var FLAGS = MBG.FLAGS || {};
  var GREETING = { en: 'Welcome!', sq: 'Mirë se erdhe!', bs: 'Dobro došli!', de: 'Willkommen!',
    es: '¡Bienvenidos!', fr: 'Bienvenue\u00a0!', tr: 'Hoş geldin!', pl: 'Witaj!', pt: 'Bem-vindo!',
    ar: 'أهلًا وسهلًا!' };
  var RTL = (MBG.AppText && MBG.AppText.RTL) || ['ar'];
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  var uid = 0;
  function flagSvg(lang, round) {
    // ids (clip paths of the split flags) are made unique for every copy on the page
    var n = ++uid;
    var body = String(FLAGS[lang] || FLAGS.en || '').replace(/mbg-/g, 'mbg' + n + '-');
    return '<svg class="flag-svg" viewBox="0 0 640 480" aria-hidden="true" focusable="false"' +
      (round ? ' preserveAspectRatio="xMidYMid slice"' : '') + '>' + body + '</svg>';
  }

  /** The other languages in menu order, starting after the current one. */
  function others(lang) {
    var L = Shell.LANGS, i = L.indexOf(lang);
    return [L[(i + 1) % L.length], L[(i + 2) % L.length]];
  }

  /** Draws the coin stack into a button and labels it in the current language. */
  function paint(btn, lang) {
    if (!btn) return;
    var o = others(lang);
    var prev = btn.getAttribute('data-lang');
    btn.classList.add('langbtn');
    btn.setAttribute('data-lang', lang);
    btn.innerHTML = '<span class="coins" aria-hidden="true">' +
      '<span class="coin c2">' + flagSvg(o[1], true) + '</span>' +
      '<span class="coin c1">' + flagSvg(o[0], true) + '</span>' +
      '<span class="coin c0">' + flagSvg(lang, true) + '</span></span>';
    var label = Shell.tIn(lang, 'lang.current', { name: Shell.langName(lang) });
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.setAttribute('aria-haspopup', 'dialog');
    if (prev && prev !== lang) {           // the new flag flips to the front
      btn.classList.remove('flip');
      void btn.offsetWidth;
      btn.classList.add('flip');
    }
  }

  var dlg = null, state = { resolve: null, pick: null };

  function build() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'dlg sheet langmenu';
    dlg.id = 'dlgLang';
    dlg.setAttribute('aria-labelledby', 'lmTitle');
    var rows = Shell.LANGS.map(function (l) {
      return '<button type="button" class="lm-opt" role="radio" data-lang="' + l + '" lang="' + l + '">' +
        '<span class="lm-flag">' + flagSvg(l, true) + '</span>' +
        '<span class="lm-text" dir="' + (RTL.indexOf(l) !== -1 ? 'rtl' : 'ltr') + '"><strong>' + Shell.langName(l) +
        '</strong><small>' + GREETING[l] + '</small></span>' +
        '<span class="lm-check">' + CHECK + '</span></button>';
    }).join('');
    dlg.innerHTML =
      '<div class="sheet-head"><h2 id="lmTitle"></h2>' +
      '<button type="button" class="btn ghost small" id="lmClose"></button></div>' +
      '<div class="sheet-scroll"><div class="lm-list" role="radiogroup" aria-labelledby="lmTitle">' + rows + '</div></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('#lmClose').addEventListener('click', function () { dlg.close(); });
    Array.prototype.forEach.call(dlg.querySelectorAll('.lm-opt'), function (b) {
      b.addEventListener('click', function () {
        state.pick = b.getAttribute('data-lang');
        dlg.close();
      });
    });
    // A tap on the dimmed background closes the sheet.
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      var r = state.resolve, pick = state.pick;
      state.resolve = null;
      state.pick = null;
      if (r) r(pick);
    });
    return dlg;
  }

  /**
   * Opens the picker. Resolves with the chosen language, or null when it was closed
   * without a change. The caller applies the language (a game may first ask to confirm).
   */
  function open(current) {
    var d = build();
    if (d.open) return Promise.resolve(null);
    // The title names "Language" in three languages, the current one first.
    var order = [current].concat(others(current));
    d.querySelector('#lmTitle').textContent = order.map(function (l) { return Shell.tIn(l, 'lang.label'); }).join('\u00a0· ');   // a line break never starts with the dot
    d.querySelector('#lmClose').textContent = Shell.tIn(current, 'btn.close');
    Array.prototype.forEach.call(d.querySelectorAll('.lm-opt'), function (b) {
      var on = b.getAttribute('data-lang') === current;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.classList.toggle('on', on);
    });
    return new Promise(function (resolve) {
      state.resolve = function (pick) { resolve(pick && pick !== current ? pick : null); };
      state.pick = null;
      try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
      var cur = d.querySelector('.lm-opt.on');
      if (cur) setTimeout(function () { try { cur.focus(); } catch (e) { /* ignore */ } }, 30);
    });
  }

  function isOpen() { return !!(dlg && dlg.open); }

  MBG.LangMenu = { paint: paint, open: open, isOpen: isOpen, flagSvg: flagSvg, GREETING: GREETING };
})(typeof self !== 'undefined' ? self : globalThis);
