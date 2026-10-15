/*!
 * MBG Puzzles - audio service (shared by both games).
 * One Sound On/Off switch controls everything (FR-AUD-001). Hit sounds for a guess
 * play one after another in feedback order (FR-AUD-006); turning sound off cancels
 * anything still queued (FR-AUD-009). A missing or broken sound file only disables
 * that one sound; the game carries on (NFR-003).
 *
 * The win sound grows with the score: seven sounds (win1 ... win7, tools/make_sounds.py),
 * each one higher, longer and richer, at the same scores that earn hint credits.
 *
 * Key sounds (Settings › Key sounds, shared by both games):
 *   'phone'  every digit and letter beeps like the key of a push-button phone of the 80s and 90s:
 *            its own two-tone beep (DTMF); letters sound like the key they had on the phone
 *            (ABC = 2, DEF = 3 … WXYZ = 9; accents like their letter; Arabic as on Arabic keypads)
 *   'same'   one and the same phone beep for every digit and letter
 *   'off'    no beeps while typing; the clues use the original two sounds (hit0, hit1)
 * With beeps, a key beeps when it is typed and again when its clue appears (right place: one
 * long beep, wrong place: two short beeps, not there: silent). Made on the spot with the Web
 * Audio API - no sound files.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Audio = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  // Score from which each win sound plays: win1 below 5,000 ... win7 from 200,000.
  var WIN_STEPS = [0, 5000, 10000, 25000, 50000, 100000, 200000];
  function winKey(score) {
    var s = Number(score) || 0, k = 1;
    for (var i = 1; i < WIN_STEPS.length; i++) if (s >= WIN_STEPS[i]) k = i + 1;
    return 'win' + k;
  }

  // Push-button phone tones (DTMF): every key is two tones at once, [low Hz, high Hz].
  var DTMF = {
    1: [697, 1209], 2: [697, 1336], 3: [697, 1477],
    4: [770, 1209], 5: [770, 1336], 6: [770, 1477],
    7: [852, 1209], 8: [852, 1336], 9: [852, 1477],
    '*': [941, 1209], 0: [941, 1336], '#': [941, 1477]
  };

  var SAME_KEY = '5';               // 'same': every key sounds like the 5 in the middle of the keypad
  var KEY_MODES = ['phone', 'same', 'off'];
  // Letters on the keys of a phone keypad (ITU E.161), and Arabic as on Arabic phone keypads.
  var LETTER_KEYS = { abc: 2, def: 3, ghi: 4, jkl: 5, mno: 6, pqrs: 7, tuv: 8, wxyz: 9,
    'بتثة': 2, 'اأإآءؤئ': 3, 'سشصض': 4, 'دذرز': 5, 'نهويى': 6, 'فقكلم': 7, 'جحخ': 8, 'طظعغ': 9 };
  var KEY_OF = {};
  Object.keys(LETTER_KEYS).forEach(function (g) { Array.from(g).forEach(function (c) { KEY_OF[c] = String(LETTER_KEYS[g]); }); });
  var SPECIAL = { 'ı': 'i', 'ł': 'l', 'đ': 'd', 'ß': 's', 'ẞ': 's', 'æ': 'a', 'ø': 'o', 'œ': 'o' };
  /** The phone key of a digit or letter ('0'-'9'), or null. */
  function keyFor(ch) {
    var c = String(ch == null ? '' : ch).charAt(0);
    if (/[0-9]/.test(c)) return c;
    var a = c.replace(/[\u0660-\u0669]/, function (d) { return String(d.charCodeAt(0) - 0x0660); });
    if (/[0-9]/.test(a)) return a;
    if (KEY_OF[c]) return KEY_OF[c];
    var l = c.toLowerCase();
    l = SPECIAL[l] || l.normalize('NFD').charAt(0);
    return KEY_OF[l] || null;
  }

  function AudioService(urls, options) {
    options = options || {};
    this.urls = urls || {};
    this.enabled = options.enabled !== false;
    this.spacing = options.spacing || 210;
    this.poolSize = 3;
    this.els = {};
    this.pools = {};
    this.poolIndex = {};
    this.broken = {};
    this.tickWanted = false;
    this.generation = 0;
    this.unlocked = false;
    this.hidden = false;
    this.available = typeof root.Audio === 'function';
    this.ctx = undefined;          // Web Audio, made at the first touch (phones allow it only then)
    this.keys = KEY_MODES.indexOf(options.keys) !== -1 ? options.keys : 'phone';
  }

  var P = AudioService.prototype;

  P.init = function () {
    if (!this.available) return this;
    var self = this;
    // Respect the phone's silent switch where the browser supports it (FR-AUD-011).
    try { if (root.navigator && root.navigator.audioSession) root.navigator.audioSession.type = 'ambient'; } catch (e) { /* ignore */ }
    Object.keys(this.urls).forEach(function (key) {
      var count = key === 'tick' || /^win/.test(key) ? 1 : self.poolSize;
      self.pools[key] = [];
      self.poolIndex[key] = 0;
      for (var i = 0; i < count; i++) {
        var el = new root.Audio();
        el.preload = 'auto';
        if (key === 'tick') el.loop = true;
        el.addEventListener('error', function () { self.broken[key] = true; });
        el.src = self.urls[key];
        self.pools[key].push(el);
      }
      self.els[key] = self.pools[key][0];
    });
    return this;
  };

  /** Mobile browsers only allow audio after a user gesture: prime every element once. */
  P.unlock = function () {
    this._ctx();
    if (this.unlocked || !this.available) return;
    this.unlocked = true;
    var self = this;
    Object.keys(this.pools).forEach(function (key) {
      self.pools[key].forEach(function (el) {
        if (key === 'tick' && self.tickWanted && self.enabled) return;
        try {
          el.muted = true;
          var p = el.play();
          var reset = function () { el.pause(); el.currentTime = 0; el.muted = false; };
          if (p && p.then) p.then(reset, function () { el.muted = false; }); else reset();
        } catch (e) { el.muted = false; }
      });
    });
  };

  P._play = function (key) {
    if (!this.enabled || this.broken[key] || !this.pools[key]) return;
    var pool = this.pools[key];
    var el = pool[this.poolIndex[key] % pool.length];
    this.poolIndex[key] += 1;
    try {
      el.muted = false;
      el.currentTime = 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () { /* blocked or missing: ignore */ });
    } catch (e) { /* ignore */ }
  };

  P.setEnabled = function (on) {
    this.enabled = !!on;
    if (!this.enabled) {
      this.generation += 1;          // cancels queued hit/win sounds
      this._stopAll();
    } else if (this.tickWanted) {
      this._startTickElement();      // FR-AUD-010
    }
  };

  P._stopAll = function () {
    var self = this;
    Object.keys(this.pools).forEach(function (key) {
      self.pools[key].forEach(function (el) { try { el.pause(); } catch (e) { /* ignore */ } });
    });
  };

  P._startTickElement = function () {
    var el = this.els.tick;
    if (!el || this.broken.tick || !this.enabled || this.hidden) return;
    try {
      el.currentTime = 0;
      el.muted = false;
      var p = el.play();
      if (p && p.catch) p.catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  };

  P.startTick = function () {
    if (this.tickWanted) return;
    this.tickWanted = true;
    this._startTickElement();
  };

  P.stopTick = function () {
    this.tickWanted = false;
    var el = this.els.tick;
    if (el) { try { el.pause(); } catch (e) { /* ignore */ } }
  };

  /** Pause the clock sound while the app is in the background. */
  P.setHidden = function (hidden) {
    this.hidden = !!hidden;
    var el = this.els.tick;
    if (!el) return;
    if (hidden) { try { el.pause(); } catch (e) { /* ignore */ } }
    else if (this.tickWanted && this.enabled) {
      try { var p = el.play(); if (p && p.catch) p.catch(function () {}); } catch (e) { /* ignore */ }
    }
  };

  /**
   * Plays hit0 (O) / hit1 (?) one after another, X stays silent but keeps the rhythm.
   * Resolves when the sequence has finished (or immediately if sound is off).
   */
  P.playFeedback = function (feedback) {
    var self = this;
    var gen = this.generation;
    if (!this.enabled) return Promise.resolve(false);
    return new Promise(function (resolve) {
      feedback.forEach(function (f, i) {
        setTimeout(function () {
          if (gen !== self.generation || !self.enabled) return;
          if (f === 'O') self._play('hit0');
          else if (f === '?') self._play('hit1');
        }, i * self.spacing);
      });
      setTimeout(function () { resolve(gen === self.generation && self.enabled); },
        feedback.length * self.spacing + 60);
    });
  };

  /** The win sound for this score (the better the score, the grander the sound). */
  P.playWin = function (score) {
    if (!this.enabled) return;
    var key = winKey(score);
    if (!this.pools[key] || this.broken[key]) key = this.pools.win1 && !this.broken.win1 ? 'win1' : 'win';
    this._play(key);
  };

  /* ------------------------------------------------ phone keypad tones --- */
  P._ctx = function () {
    if (this.ctx === undefined) {
      var AC = root.AudioContext || root.webkitAudioContext;
      try { this.ctx = AC ? new AC() : null; } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* ignore */ } }
    return this.ctx;
  };
  /** One key tone: at (seconds from now), dur (seconds), vol (0..1). */
  P._dtmf = function (key, at, dur, vol) {
    var f = DTMF[key], ctx = f && this._ctx();
    if (!ctx) return;
    try {
      var t0 = ctx.currentTime + 0.01 + (at || 0);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.006);
      g.gain.setValueAtTime(vol, t0 + Math.max(0.01, dur - 0.015));
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      g.connect(ctx.destination);
      f.forEach(function (hz) {
        var o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = hz;
        o.connect(g);
        o.start(t0);
        o.stop(t0 + dur + 0.03);
      });
    } catch (e) { /* no Web Audio: silent */ }
  };
  /** 'phone' | 'same' | 'off' (Settings › Key sounds). */
  P.setKeys = function (mode) { if (KEY_MODES.indexOf(mode) !== -1) this.keys = mode; };
  P._keyOf = function (ch) {
    if (this.keys === 'off') return null;
    var k = keyFor(ch);
    return this.keys === 'same' ? (k ? SAME_KEY : null) : k;
  };
  /** A digit or letter typed: its key tone (or the one tone for all, or nothing). */
  P.keyTone = function (ch) {
    if (!this.enabled || this.hidden) return;
    var k = this._keyOf(ch);
    if (k) this._dtmf(k, 0, 0.12, 0.17);
  };
  /** A short sample of a key sound setting: 1, 5, 9 (or the same beep three times). */
  P.keySample = function () {
    if (!this.enabled || this.keys === 'off') return;
    var self = this;
    ['1', '5', '9'].forEach(function (d, i) { var k = self._keyOf(d); if (k) self._dtmf(k, i * 0.17, 0.12, 0.17); });
  };
  /**
   * The clues of a guess, one after another, with the key tones of its digits or letters
   * (chars: the guess, one character per place): O one long beep, ? two short beeps, X silent
   * (keeping the rhythm). Key sounds off: the original O / ? sounds. Resolves like playFeedback.
   */
  P.playKeyFeedback = function (feedback, chars) {
    if (this.keys === 'off') return this.playFeedback(feedback);
    var self = this;
    var gen = this.generation;
    var list = Array.isArray(chars) ? chars : Array.from(String(chars || ''));
    if (!this.enabled) return Promise.resolve(false);
    return new Promise(function (resolve) {
      feedback.forEach(function (f, i) {
        setTimeout(function () {
          if (gen !== self.generation || !self.enabled) return;
          var k = self._keyOf(list[i]) || SAME_KEY;
          if (f === 'O') self._dtmf(k, 0, 0.17, 0.2);
          else if (f === '?') { self._dtmf(k, 0, 0.055, 0.15); self._dtmf(k, 0.085, 0.055, 0.15); }
        }, i * self.spacing);
      });
      setTimeout(function () { resolve(gen === self.generation && self.enabled); },
        feedback.length * self.spacing + 60);
    });
  };
  P.playDigitFeedback = P.playKeyFeedback;

  /** Cancels queued sounds without changing the on/off setting (e.g. when a round is abandoned). */
  P.cancelPending = function () { this.generation += 1; };

  return { AudioService: AudioService, winKey: winKey, WIN_STEPS: WIN_STEPS, DTMF: DTMF, keyFor: keyFor, KEY_MODES: KEY_MODES };
});

