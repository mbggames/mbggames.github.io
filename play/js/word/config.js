/*!
 * MBG Puzzles · Word Puzzle - configuration.
 * File names, sound assets and display limits live here so they can change
 * without touching the game logic or the screens.
 */
(function (root) {
  'use strict';
  root.MBG = root.MBG || {};
  var base = {
    gameId: 'word',
    version: '1.0.0',
    standalone: true,                      // word lists are built in (js/word/words-embedded.js)
    lengths: [4, 5, 6, 7, 8],
    defaultLength: 4,
    vocabFiles: { en: 'WordsEng.txt', sq: 'WordsAlb.txt', bs: 'WordsBos.txt', de: 'WordsDeu.txt',
      es: 'WordsSpa.txt', fr: 'WordsFra.txt', tr: 'WordsTur.txt', pl: 'WordsPol.txt', pt: 'WordsPor.txt',
      ar: 'WordsAra.txt' },
    // The dictionaries (tools/build_vocab.py): [words that can be secret in "All words", more accepted guesses]
    dictFiles: {
      en: ['words/en-dict.txt', 'words/en-extra.txt'],
      sq: ['words/sq-dict.txt', 'words/sq-extra.txt'],
      bs: ['words/bs-dict.txt', 'words/bs-extra.txt'],
      de: ['words/de-dict.txt', 'words/de-extra.txt'],
      es: ['words/es-dict.txt', 'words/es-extra.txt'],
      fr: ['words/fr-dict.txt', 'words/fr-extra.txt'],
      tr: ['words/tr-dict.txt', 'words/tr-extra.txt'],
      pl: ['words/pl-dict.txt', 'words/pl-extra.txt'],
      pt: ['words/pt-dict.txt', 'words/pt-extra.txt'],
      ar: ['words/ar-dict.txt', 'words/ar-extra.txt']
    },
    countsFile: 'words/counts.json',       // sizes of the dictionaries, shown before they load
    wordPoolDefault: 'everyday',           // secret words: 'everyday' (common words) or 'all' (whole dictionary)
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
    storageKeys: { users: 'MBG.Word.Users', prefs: 'MBG.App.prefs', session: 'MBG.App.session.word' },
    backupDoc: 'word',
    sessionMaxAgeMs: 12 * 60 * 60 * 1000,  // a backgrounded game can be resumed for 12 hours
    validateGuessesDefault: false,         // FR-LANG-011: accept any alphabetic word by default
    serviceWorker: null
  };
  var pre = root.MBG.Config || {};
  for (var k in pre) if (Object.prototype.hasOwnProperty.call(pre, k)) base[k] = pre[k];
  root.MBG.Config = base;
})(typeof self !== 'undefined' ? self : globalThis);
