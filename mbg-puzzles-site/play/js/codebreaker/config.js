/*!
 * MBG Puzzles · Codebreaker - configuration.
 * File names, sound assets and display limits live here so they can change
 * without touching the game logic or the screens.
 */
(function (root) {
  'use strict';
  root.MBG = root.MBG || {};
  var base = {
    gameId: 'codebreaker',
    version: '1.0.0',
    standalone: true,                      // everything ships inside the app
    lengths: [4, 5, 6, 7, 8],              // number of digits in the secret number
    defaultLength: 4,
    sounds: {
      tick: 'sounds/ticktock.wav',
      hit0: 'sounds/hit0.wav',
      hit1: 'sounds/hit1.wav',
      win1: 'sounds/win1.wav',
      win2: 'sounds/win2.wav',
      win3: 'sounds/win3.wav',
      win4: 'sounds/win4.wav',
      win5: 'sounds/win5.wav',
      win6: 'sounds/win6.wav',
      win7: 'sounds/win7.wav'   // by score, see js/shared/audio.js
    },
    hitSpacingMs: 210,                     // gap between sequential O / ? sounds
    font: { min: 13, max: 26, def: 17 },   // text size in CSS pixels (A- / A+)
    themes: ['light', 'dark', 'adriatic', 'meadow', 'rose', 'random'],
    // Users and scores are kept per game; theme, text size, sound and saved names are shared.
    storageKeys: { users: 'MBG.Codebreaker.Users', prefs: 'MBG.App.prefs', session: 'MBG.App.session.codebreaker' },
    backupDoc: 'codebreaker',
    sessionMaxAgeMs: 12 * 60 * 60 * 1000,  // a backgrounded game can be resumed for 12 hours
    serviceWorker: null
  };
  var pre = root.MBG.Config || {};
  for (var k in pre) if (Object.prototype.hasOwnProperty.call(pre, k)) base[k] = pre[k];
  root.MBG.Config = base;
})(typeof self !== 'undefined' ? self : globalThis);
