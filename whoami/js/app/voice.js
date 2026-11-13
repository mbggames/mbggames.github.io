/*!
 * Who Am I? MBG - voice input: speak a question or a final guess instead of typing it.
 *
 *   Android app   the phone's own speech recognition (Google's on most phones), through the
 *                 plugin @capgo/capacitor-speech-recognition; Android asks once for the microphone.
 *   Browser       the Web Speech API: Chrome and Edge on Windows, Chrome on Android, Safari.
 *                 (Not in Firefox: there the 🎤 button is simply not shown.)
 * Languages: English (en-US) and German (de-DE) work everywhere; Albanian (sq-AL) and Bosnian
 * (bs-BA) where the phone or browser knows them - if not, the game says so.
 * The words appear in the field while you speak; nothing is sent until you press Ask / Guess, so a
 * misheard word can be corrected first. The game itself never records or keeps the sound.
 * Everywhere, the keyboard's own microphone (Gboard 🎤, Windows: Win + H) works as well.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var LOCALE = { en: 'en-US', de: 'de-DE', sq: 'sq-AL', bs: 'bs-BA' };
  var capx = root.capacitorExports && root.capacitorExports.Capacitor || root.Capacitor;
  var native = MBG.Shell ? !!MBG.Shell.native : !!(capx && typeof capx.isNativePlatform === 'function' && capx.isNativePlatform());
  var plugin = null;
  function nativePlugin() {
    if (plugin || !native || !root.capacitorExports || typeof root.capacitorExports.registerPlugin !== 'function') return plugin;
    var cap = capx;
    if (cap && typeof cap.isPluginAvailable === 'function' && !cap.isPluginAvailable('SpeechRecognition')) return null;
    try { plugin = root.capacitorExports.registerPlugin('SpeechRecognition'); } catch (e) { plugin = null; }
    return plugin;
  }
  // in the Android app the web view has no working speech API - only the plugin counts there
  function WebSR() { return native ? null : root.SpeechRecognition || root.webkitSpeechRecognition || null; }
  function supported() { return native ? !!nativePlugin() : !!WebSR(); }

  /** What went wrong, in one word: denied · nothing · lang · error. */
  function why(code) {
    var c = String(code || '');
    if (/not-allowed|service-not-allowed|permission|denied|INSUFFICIENT/i.test(c)) return 'denied';
    if (/no-speech|no.?match|speech.?timeout|nothing/i.test(c)) return 'nothing';
    if (/language|LANGUAGE/i.test(c)) return 'lang';
    if (/aborted/i.test(c)) return 'aborted';
    return 'error';
  }
  /** Tidy what was heard: a capital letter first; a question gets its "?". */
  function tidy(s, kind) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (!s) return s;
    s = s.charAt(0).toLocaleUpperCase() + s.slice(1);
    if (kind === 'question') { if (!/[?!.…]$/.test(s)) s += '?'; else s = s.replace(/[.…]$/, '?'); }
    else s = s.replace(/[?!.…]+$/, '');
    return s;
  }

  var active = null;
  /**
   * Listen once. o: { lang, kind: 'question' | 'guess', onText(text) } -> a promise of the text
   * heard ('' for nothing), rejected with { why } when it cannot listen.
   */
  function listen(o) {
    stop();
    var lang = LOCALE[o.lang] || o.lang || 'en-US';
    var onText = typeof o.onText === 'function' ? o.onText : function () {};
    return native ? listenNative(lang, o.kind, onText) : listenWeb(lang, o.kind, onText);
  }
  function listenWeb(lang, kind, onText) {
    var SR = WebSR();
    if (!SR) return Promise.reject({ why: 'error' });
    return new Promise(function (resolve, reject) {
      var rec = new SR(), heard = '', err = null;
      rec.lang = lang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        var s = '';
        for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
        heard = s; onText(tidy(s, kind));
      };
      rec.onerror = function (e) { err = e && e.error; };
      rec.onend = function () {
        active = null;
        if (err && why(err) !== 'aborted' && !(why(err) === 'nothing' && heard)) reject({ why: why(err) }); else resolve(tidy(heard, kind));
      };
      active = { stop: function () { try { rec.stop(); } catch (e) { /* done */ } } };
      try { rec.start(); } catch (e) { active = null; reject({ why: 'error' }); }
    });
  }
  function listenNative(lang, kind, onText) {
    var P = nativePlugin();
    if (!P) return Promise.reject({ why: 'error' });
    var hs = [], heard = '', err = null, done = false, timer = null;
    function off() { hs.forEach(function (h) { h.then(function (x) { if (x && x.remove) x.remove(); }).catch(function () {}); }); hs = []; clearTimeout(timer); active = null; }
    return P.available().then(function (a) {
      if (!a || !a.available) throw { why: 'error' };
      return P.checkPermissions();
    }).then(function (p) {
      return p && p.speechRecognition === 'granted' ? p : P.requestPermissions();
    }).then(function (p) {
      if (!p || p.speechRecognition !== 'granted') throw { why: 'denied' };
      return new Promise(function (resolve, reject) {
        function finish() {
          if (done) return; done = true; off();
          if (err && !heard) reject({ why: why(err) }); else resolve(tidy(heard, kind));
        }
        hs.push(P.addListener('partialResults', function (ev) {
          var s = (ev && (ev.matches && ev.matches[0] || ev.accumulatedText)) || '';
          if (s) { heard = s; onText(tidy(s, kind)); }
        }));
        hs.push(P.addListener('listeningState', function (ev) { if (ev && (ev.state === 'stopped' || ev.status === 'stopped')) finish(); }));
        hs.push(P.addListener('error', function (ev) { err = ev && (ev.code || ev.message) || 'error'; }));
        active = { stop: function () { P.stop().catch(function () {}); setTimeout(finish, 1500); } };
        timer = setTimeout(function () { if (active) active.stop(); }, 20000);      // never listens for ever
        P.start({ language: lang, partialResults: true, maxResults: 1, popup: false, addPunctuation: true }).then(function (r) {
          // some phones give the result here instead of through the listener
          var s = r && r.matches && r.matches[0];
          if (s) { heard = s; onText(tidy(s, kind)); }
        }, function (e) { err = e && (e.code || e.message) || 'error'; finish(); });
      });
    }).catch(function (e) { off(); throw e && e.why ? e : { why: why(e && (e.code || e.message)) }; });
  }
  function stop() { if (active) { var a = active; active = null; a.stop(); } }
  function listening() { return !!active; }

  MBG.Voice = { supported: supported, listen: listen, stop: stop, listening: listening, tidy: tidy, why: why, native: native };
})(typeof self !== 'undefined' ? self : globalThis);
