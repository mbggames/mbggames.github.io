/*!
 * Who Am I? MBG - the intro film: friends at a table, the card goes on a forehead, he thinks,
 * guesses - thumbs up. Two films of 3.6 s, made from MBG's GIFs (store/graphics/):
 *   media/intro.*     the general one (who-am-i-intro.gif)
 *   media/intro-sq.*  with the Albanian and Kosovo flags - when the game is in Albanian (who-am-i-intro-sq.gif)
 *
 * Used in three places:
 *   - the intro when the game opens (once per start of the app; "Intro when the game opens" in ⚙)
 *   - the forehead moment of the first round, when you are the one who guesses (js/whoami/play.js)
 *   - the "About the game" card on the home screen
 * With "reduce motion" switched on in the system, or when a video cannot play, a still picture is
 * shown instead. The film has no sound; the start bell may ring with it.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;
  // two films: the general one, and one with the Albanian and Kosovo flags for Albanian (sq)
  var FILMS = {
    general: { base: 'media/intro', gif: 'store/graphics/who-am-i-intro.gif' },
    sq: { base: 'media/intro-sq', gif: 'store/graphics/who-am-i-intro-sq.gif' }
  };
  /** The film for a language (the app's language when none is given). */
  function pick(lang) { var f = FILMS[lang || Shell.getLang()] || FILMS.general; return f.base; }
  var SEEN = 'MBG.Who.introSeen';

  function reduced() { return !!(root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function still(cls, lang) {
    var img = new Image();
    img.src = pick(lang) + '-still.jpg'; img.alt = ''; img.className = 'introfilm ' + (cls || '');
    img.setAttribute('aria-hidden', 'true');
    return img;
  }
  /**
   * The film as an element: o.lang (which film; default: the app's language), o.loop (play again
   * and again), o.autoplay (default true), o.cls, o.onEnd (called once, when it ends - or soon
   * for the still picture).
   */
  function film(o) {
    o = o || {};
    var base = pick(o.lang);
    if (reduced()) { var s = still(o.cls, o.lang); if (o.onEnd) setTimeout(o.onEnd, 2200); return s; }
    var v = document.createElement('video');
    v.className = 'introfilm ' + (o.cls || '');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = !!o.loop; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.disablePictureInPicture = true; v.poster = base + '-poster.jpg';
    var ended = false;
    function end() { if (!ended && o.onEnd) { ended = true; o.onEnd(); } }
    v.addEventListener('ended', end);
    function fallback() {                                         // no video here: the still picture
      var s = still(o.cls, o.lang);
      if (v.parentNode) v.parentNode.replaceChild(s, v);
      setTimeout(end, 1500);
    }
    // WebM first (Chrome, Edge, Firefox, Android), MP4 for the others; if neither plays: the still
    var list = [[base + '.webm', 'video/webm'], [base + '.mp4', 'video/mp4']].filter(function (x) { return v.canPlayType && v.canPlayType(x[1]); });
    if (!list.length) { setTimeout(fallback, 0); return v; }
    list.forEach(function (x, i) {
      var so = document.createElement('source'); so.src = x[0]; so.type = x[1];
      if (i === list.length - 1) so.addEventListener('error', fallback);
      v.appendChild(so);
    });
    if (o.autoplay !== false) { var p = v.play(); if (p && p.catch) p.catch(function () { /* will play when visible / tapped */ }); }
    return v;
  }
  function restart(v) { if (v && v.tagName === 'VIDEO') { try { v.currentTime = 0; } catch (e) { /* not loaded */ } var p = v.play(); if (p && p.catch) p.catch(function () {}); } }

  /** The bell of a new round (the sound switch and the phone's silent mode decide). */
  function bell() {
    var pr = Shell.getPrefs();
    if (!pr.sound || (Shell.phoneSilent && Shell.phoneSilent())) return;
    try { var a = new Audio('sounds/start.wav'); a.volume = 0.8; var p = a.play(); if (p && p.catch) p.catch(function () { /* the browser waits for a first tap */ }); } catch (e) { /* no sound */ }
  }

  /** Should the intro play now? Once per start of the app, not when coming back from a game. */
  function wanted() {
    if (Shell.getPrefs().splash === false) return false;
    try { if (sessionStorage.getItem(SEEN)) return false; } catch (e) { /* private mode: show it */ }
    return true;
  }
  /** The intro on the home screen - a promise, resolved when it is over (or skipped). */
  function splash(force) {
    if (!force && !wanted()) return Promise.resolve(false);
    try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* ignore */ }
    return new Promise(function (resolve) {
      var box = Shell.el('div', 'introsplash');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Who Am I? MBG');
      var frame = Shell.el('div', 'is-frame');
      var done = false, timer = null;
      function close() {
        if (done) return; done = true; clearTimeout(timer);
        box.classList.add('out');
        setTimeout(function () { box.remove(); resolve(true); }, 380);
      }
      frame.appendChild(film({ cls: 'is-film', onEnd: function () { timer = setTimeout(close, 700); } }));
      box.appendChild(frame);
      box.appendChild(Shell.el('h1', 'is-title', 'Who Am I?'));
      box.appendChild(Shell.el('p', 'is-tag', Shell.t('intro.tag')));
      box.appendChild(Shell.el('p', 'is-by', 'MBG · Merkur Beqiri Games'));
      box.appendChild(Shell.el('p', 'is-skip', Shell.t('fh.skip')));
      box.addEventListener('click', close);
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { document.removeEventListener('keydown', k); close(); } });
      document.body.appendChild(box);
      bell();
      setTimeout(close, 7000);                                      // never longer than this
    });
  }

  /** The "About the game" card of the home screen: the film plays (muted) while it is on screen. */
  function aboutCard(container) {
    container.innerHTML = '';
    var v = film({ loop: true, autoplay: false, cls: 'about-film' });
    var media = Shell.el('button', 'about-media'); media.type = 'button';
    media.setAttribute('aria-label', Shell.t('about.replay'));
    media.appendChild(v);
    media.appendChild(Shell.el('span', 'about-play', '▶ ' + Shell.t('about.replay')));
    media.addEventListener('click', function () { splash(true); });
    container.appendChild(media);
    var tx = Shell.el('div', 'about-text');
    tx.appendChild(Shell.el('h2', 'sec-title', Shell.t('about.title')));
    tx.appendChild(Shell.el('p', null, Shell.t('about.text')));
    container.appendChild(tx);
    if (v.tagName === 'VIDEO' && 'IntersectionObserver' in root) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) restart(v); else v.pause(); }); }, { threshold: 0.4 }).observe(v);
    }
  }

  MBG.Intro = { film: film, pick: pick, restart: restart, splash: splash, aboutCard: aboutCard, bell: bell, wanted: wanted };
})(typeof self !== 'undefined' ? self : globalThis);
