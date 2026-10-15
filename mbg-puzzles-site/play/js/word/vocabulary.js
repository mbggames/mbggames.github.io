/*!
 * MBG Puzzles · Word Puzzle - vocabulary service.
 *
 * Two kinds of word lists per language (built by tools/build_vocab.py):
 *  - everyday words (words-embedded.js, always available): the secret words of a normal game
 *  - the dictionary (www/words/<lang>-dict.txt and <lang>-extra.txt, loaded in the background):
 *    secret words in "All words" mode and every accepted guess. Tens of thousands of words per
 *    language, kept as one sorted string per word length and searched by halving, so they
 *    need little memory and no start-up time.
 * Without the dictionary (for example a page opened from disk) everything still works with
 * the everyday words.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Vocabulary = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  function engine() {
    return (root.MBG && root.MBG.Engine) || (typeof require === 'function' ? require('./engine.js') : null);
  }

  /**
   * Parses vocabulary text (FR-LANG-006..009). Blank lines are ignored, case is
   * normalised, rows that are not purely alphabetic or not 4-8 letters long are
   * skipped (and counted) instead of causing errors. Command words are excluded
   * so a secret word can never collide with a text command.
   */
  function parse(text, lang) {
    var E = engine();
    var byLength = {};
    E.LENGTHS.forEach(function (n) { byLength[n] = []; });
    var all = new Set();
    var invalid = 0;
    String(text || '').replace(/^﻿/, '').split(/\r\n|\n|\r/).forEach(function (line) {
      var w = E.normalize(line, lang);
      if (!w) return;
      var n = E.letterCount(w);
      if (!E.isAlphabetic(w) || n < E.MIN_LEN || n > E.MAX_LEN || E.isCommandWord(w, lang)) { invalid++; return; }
      if (all.has(w)) return;
      all.add(w);
      byLength[n].push(w);
    });
    return { byLength: byLength, all: all, invalid: invalid, total: all.size };
  }

  /**
   * A large sorted word list: for each length one string of all its words back to back.
   * Every letter used (a-z, ë, ç, č, ć, đ, š, ž, ä, ö, ü, ß, ñ, ğ, ı, ş) is a single UTF-16 unit, so word i of
   * length n starts at i * n.
   */
  function PackedList(text) {
    var groups = {};
    var lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var w = lines[i].trim();
      if (!w) continue;
      var n = w.length;
      if (n < 4 || n > 8 || Array.from(w).length !== n) continue;
      (groups[n] = groups[n] || []).push(w);
    }
    this.packed = {};
    this.size = {};
    this.total = 0;
    for (var k in groups) {
      var list = groups[k];
      for (var j = 1; j < list.length; j++) {
        if (list[j - 1] > list[j]) { list.sort(); break; }       // the files are sorted; this is a safety net
      }
      this.packed[k] = list.join('');
      this.size[k] = list.length;
      this.total += list.length;
    }
  }
  PackedList.prototype.at = function (n, i) { return this.packed[n].substr(i * n, n); };
  PackedList.prototype.has = function (w) {
    var n = w.length, s = this.packed[n];
    if (!s) return false;
    var lo = 0, hi = this.size[n] - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var cur = s.substr(mid * n, n);
      if (cur === w) return true;
      if (cur < w) lo = mid + 1; else hi = mid - 1;
    }
    return false;
  };

  function VocabularyService(options) {
    options = options || {};
    // dictFiles: { en: ['words/en-dict.txt', 'words/en-extra.txt'], ... } - [secret-capable, guesses only]
    this.dictFiles = options.dictFiles || null;
    this.dicts = {};
    this.dictLoads = {};                  // language -> promise (each dictionary loads once)
    this.countsFile = options.countsFile || null;   // words/counts.json: sizes before loading
    this.counts = null;
    this.files = options.files || { en: 'WordsEng.txt', sq: 'WordsAlb.txt', bs: 'WordsBos.txt', de: 'WordsDeu.txt',
      es: 'WordsSpa.txt', fr: 'WordsFra.txt', tr: 'WordsTur.txt', pl: 'WordsPol.txt', pt: 'WordsPor.txt', ar: 'WordsAra.txt' };
    this.embedded = options.embedded || (root.MBG && root.MBG.EMBEDDED_WORDS) || null;
    this.fetchFn = options.fetchFn || (typeof fetch === 'function' ? fetch.bind(root) : null);
    this.allowFetch = options.allowFetch !== false;
    this.data = {};
    this.sources = {};
    this.ready = null;
  }

  VocabularyService.prototype.load = function () {
    var self = this;
    if (this.ready) return this.ready;
    var langs = Object.keys(this.files);
    this.ready = Promise.all(langs.map(function (lang) {
      return self._loadOne(lang).then(function (res) {
        self.data[lang] = res.parsed;
        self.sources[lang] = res.source;
      });
    })).then(function () { return self; });
    return this.ready;
  };

  VocabularyService.prototype._loadOne = function (lang) {
    var self = this;
    var fallback = function () {
      var text = self.embedded && self.embedded[lang];
      var parsed = parse(text || '', lang);
      return { parsed: parsed, source: parsed.total ? 'embedded' : 'none' };
    };
    var canFetch = this.allowFetch && this.fetchFn &&
      !(root.location && root.location.protocol === 'file:');
    if (!canFetch) return Promise.resolve(fallback());
    return this.fetchFn(this.files[lang], { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        var parsed = parse(text, lang);
        if (!parsed.total) return fallback();
        return { parsed: parsed, source: 'file' };
      })
      .catch(function () { return fallback(); });
  };

  /** Loads vocabulary directly from text (used by tests and by the standalone build). */
  VocabularyService.prototype.setText = function (lang, text, source) {
    this.data[lang] = parse(text, lang);
    this.sources[lang] = source || 'text';
  };

  VocabularyService.prototype.count = function (lang, length) {
    var d = this.data[lang];
    if (!d) return 0;
    return length ? d.byLength[length].length : d.total;
  };

  /**
   * Loads big dictionaries in the background: those of the given languages (an array), or all.
   * Each loads only once; a phone that plays in one language keeps only that one in memory.
   * Resolves when done (or when they cannot load).
   */
  VocabularyService.prototype.loadDictionaries = function (langs) {
    var self = this;
    var canFetch = this.dictFiles && this.fetchFn && !(root.location && root.location.protocol === 'file:');
    if (!canFetch) return Promise.resolve(this);
    var get = function (url) {
      return self.fetchFn(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
    };
    if (this.countsFile && !this.countsLoad) {
      this.countsLoad = get(this.countsFile).then(function (t) { self.counts = JSON.parse(t); }).catch(function () { /* optional */ });
    }
    langs = (langs || Object.keys(this.dictFiles)).filter(function (l) { return self.dictFiles[l]; });
    return Promise.all(langs.map(function (lang) {
      if (!self.dictLoads[lang]) {
        var files = self.dictFiles[lang];
        self.dictLoads[lang] = Promise.all([get(files[0]), files[1] ? get(files[1]) : Promise.resolve('')]).then(function (texts) {
          self.dicts[lang] = { secret: new PackedList(texts[0]), extra: new PackedList(texts[1]) };
        }).catch(function () { /* that language keeps its everyday words */ });
      }
      return self.dictLoads[lang];
    })).then(function () { return self; });
  };

  /** Loads dictionaries from text (tests). */
  VocabularyService.prototype.setDictionary = function (lang, secretText, extraText) {
    this.dicts[lang] = { secret: new PackedList(secretText), extra: new PackedList(extraText || '') };
  };

  VocabularyService.prototype.hasDictionary = function (lang) { return !!this.dicts[lang]; };

  /**
   * Number of words. pool: 'everyday' (default) | 'all' (secret words of "All words")
   * | 'guesses' (everything accepted as a guess).
   */
  VocabularyService.prototype.poolCount = function (lang, pool, length) {
    var D = this.dicts[lang];
    if (pool === 'all' && D) return length ? (D.secret.size[length] || 0) : D.secret.total;
    if (pool === 'guesses' && D) return length ? (D.secret.size[length] || 0) + (D.extra.size[length] || 0) : D.secret.total + D.extra.total;
    // not loaded yet: the sizes written by tools/build_vocab.py ([everyday, dictionary, extra])
    var c = !length && this.counts && this.counts[lang];
    if (c && pool === 'all') return c[1];
    if (c && pool === 'guesses') return c[1] + c[2];
    return this.count(lang, length);
  };

  VocabularyService.prototype.random = function (lang, length, rnd, pool) {
    var D = this.dicts[lang];
    if (pool === 'all' && D && D.secret.size[length]) {
      var E = engine();
      var r0 = typeof rnd === 'function' ? rnd : Math.random;
      for (var tries = 0; tries < 8; tries++) {
        var w = D.secret.at(length, Math.min(D.secret.size[length] - 1, Math.floor(r0() * D.secret.size[length])));
        if (!E.isCommandWord(w, lang)) return w;
      }
    }
    var d = this.data[lang];
    if (!d || !d.byLength[length] || !d.byLength[length].length) return null;
    var list = d.byLength[length];
    var r = typeof rnd === 'function' ? rnd() : Math.random();
    return list[Math.min(list.length - 1, Math.floor(r * list.length))];
  };

  VocabularyService.prototype.has = function (lang, word) {
    var w = engine().normalize(word, lang);
    var d = this.data[lang];
    if (d && d.all.has(w)) return true;
    var D = this.dicts[lang];
    return !!(D && (D.secret.has(w) || D.extra.has(w)));
  };

  VocabularyService.prototype.source = function (lang) { return this.sources[lang] || 'none'; };

  return { parse: parse, PackedList: PackedList, VocabularyService: VocabularyService };
});

