/*!
 * MBG Who Am I? - text helpers shared by the app and the server (no screen code).
 *  - norm():   lower case, without accents (ë → e, č → c, ß → ss, đ → dj), only letters, digits and
 *              single spaces - so "Kush jam unë?" and "kush jam une" are the same to the game.
 *  - matches(): does a final guess name the hidden answer? (FR-010, FR-021) The official name in the
 *              playing language, the original name and every established alias count; spelling,
 *              capitals, punctuation and accents do not (one wrong letter in 5+, two in 9+).
 * Runs in the browser (MBG.WhoText), in Node.js (require) and in the Cloudflare worker (import).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoText = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var SPECIAL = { 'ß': 'ss', 'ẞ': 'ss', 'đ': 'dj', 'Đ': 'dj', 'ð': 'd', 'ł': 'l', 'Ł': 'l', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ı': 'i', 'þ': 'th' };

  /** Lower case, no accents, only [a-z0-9] and single spaces. */
  function norm(s) {
    var t = String(s == null ? '' : s).replace(/[ßẞđĐðłŁæœøıþ]/g, function (c) { return SPECIAL[c]; });
    t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return t.replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function tokens(s) { var n = norm(s); return n ? n.split(' ') : []; }

  /** Edit distance, stopping early once it is above max. */
  function distance(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var pp = [], prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var best = i;
      for (j = 1; j <= b.length; j++) {
        var c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      pp = prev;
      prev = cur;
    }
    return prev[b.length];
  }

  // Leading articles that may be left out of a title ("Godfather" = "The Godfather").
  var ARTICLES = ['the', 'a', 'an', 'der', 'die', 'das', 'le', 'la', 'il', 'el', 'los', 'las'];
  function stripArticle(n) {
    var p = n.split(' ');
    return p.length > 1 && ARTICLES.indexOf(p[0]) !== -1 ? p.slice(1).join(' ') : n;
  }
  function compact(n) { return n.replace(/ /g, ''); }

  /** Every accepted spelling of an entity: labels in all languages + aliases, normalized, no duplicates. */
  function namesOf(entity) {
    var out = [], seen = {};
    function add(s) {
      var n = norm(s);
      if (!n || seen[n]) return;
      seen[n] = 1;
      out.push(n);
      var a = stripArticle(n);
      if (a !== n && !seen[a]) { seen[a] = 1; out.push(a); }
    }
    var L = (entity && entity.label) || {};
    Object.keys(L).forEach(function (k) { add(L[k]); });
    ((entity && entity.aliases) || []).forEach(add);
    return out;
  }

  /** True when the guess names the entity (FR-010). */
  // Numbers in a name must be right, never "close": World War I is not World War II, Louis XIV not XVI.
  var ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18 };
  function nums(n) {
    return String(n).split(' ').filter(function (w) { return /^\d+$/.test(w) || ROMAN[w]; }).map(function (w) { return ROMAN[w] || Number(w); }).join(',');
  }
  function matches(guess, entity) {
    var g = norm(guess);
    if (!g || g.length < 2) return false;
    var gs = stripArticle(g), gc = compact(gs), gn = nums(gs);
    var names = namesOf(entity);
    for (var i = 0; i < names.length; i++) {
      var n = names[i], nc = compact(n);
      if (nums(n) !== gn) continue;
      if (n === g || n === gs || nc === gc) return true;
      var max = nc.length >= 9 ? 2 : nc.length >= 5 ? 1 : 0;
      if (max && distance(gc, nc, max) <= max) return true;
    }
    // People: the family name alone, when it is long enough to be clear ("Einstein").
    if (entity && entity.kind === 'person' && gc.length >= 5) {
      var main = norm((entity.label && (entity.label.en || entity.label[Object.keys(entity.label)[0]])) || '').split(' ');
      var last = main[main.length - 1] || '';
      if (last.length >= 5 && (last === gc || distance(gc, last, 1) <= 1)) return true;
    }
    return false;
  }

  /**
   * How a name sounds, roughly, in the four languages: so "Merilin Monro" and "Marilyn Monroe", or
   * "Shekspir" and "Shakespeare", come close. Not a dictionary - a few letter groups folded together.
   */
  function sound(s) {
    var x = compact(stripArticle(norm(s)));
    x = x.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/sch/g, 's').replace(/sh|zh|xh/g, 's').replace(/tsch|tch|ch|gj|dj|dzh/g, 'c')
      .replace(/th/g, 't').replace(/dh/g, 'd').replace(/c(?=[eiy])/g, 's').replace(/[ckq]/g, 'k').replace(/x/g, 'ks')
      .replace(/w/g, 'v').replace(/z/g, 's').replace(/y/g, 'i').replace(/j/g, 'i')
      .replace(/ee|ie|ea/g, 'i').replace(/oo|ou/g, 'u').replace(/ei|ey/g, 'ai')
      .replace(/(?!^)h/g, '').replace(/(.)\1+/g, '$1').replace(/e$/, '');
    return x;
  }
  /**
   * A final guess against the answer: 'right' (also a name that sounds the same), 'near' (the right
   * name, misspelled - a quarter of the letters wrong at most, and sounding close) or 'far'. This is not a spelling game.
   */
  function closeness(guess, entity) {
    if (matches(guess, entity)) return 'right';
    var g = norm(guess);
    if (!g || g.length < 3) return 'far';
    var gc = compact(stripArticle(g)), gs = sound(g);
    var names = namesOf(entity), near = false;
    var people = entity && entity.kind === 'person';
    var main = people ? norm((entity.label && (entity.label.en || entity.label[Object.keys(entity.label)[0]])) || '').split(' ') : [];
    var lastName = main[main.length - 1] || '';
    var gn = nums(stripArticle(g));
    for (var i = 0; i < names.length; i++) {
      var nc = compact(names[i]), ns = sound(names[i]);
      if (nc.length < 4 || nums(names[i]) !== gn) continue;
      if (gs.length >= 4 && gs === ns) return 'right';
      if (nc.length < 6 || gc.charAt(0) !== nc.charAt(0)) continue;
      // near: a quarter of the letters at most, and it must sound close too (not just another name)
      var allow = Math.floor(nc.length * 0.25), allowS = Math.max(1, Math.floor(ns.length * 0.3));
      if (distance(gc, nc, allow) <= allow && distance(gs, ns, allowS) <= allowS) near = true;
    }
    if (!near && people && lastName.length >= 5 && gc.length >= 4 && sound(gc) === sound(lastName)) return 'right';
    return near ? 'near' : 'far';
  }
  /** The shape of a name for a spelling hint: "M _ _ _ _ _ _   M _ _ _ _ _" (first letters, length of each word). */
  function pattern(name) {
    return String(name || '').trim().split(/\s+/).map(function (w) {
      var ch = Array.from(w);
      // no-break spaces inside a word: a long name wraps only between its words
      return ch.map(function (c, i) { return i === 0 || /[^\p{L}\p{N}]/u.test(c) ? c : '_'; }).join('\u00a0');
    }).join('   ');
  }

  /** The name shown in a language: that label, else English, else any label (FR-009). */
  function labelIn(entity, lang) {
    var L = (entity && entity.label) || {};
    return L[lang] || L.orig || L.en || L[Object.keys(L)[0]] || '';
  }
  function descIn(entity, lang) {
    var D = (entity && entity.desc) || {};
    return D[lang] || D.en || '';
  }
  /** The letters of a name (for "Does my name start with ...?"), first letter in upper case. */
  function firstLetter(name) {
    var m = /[\p{L}\p{N}]/u.exec(String(name || ''));
    return m ? m[0].toUpperCase() : '';
  }

  /** A small seeded random generator (mulberry32) - the same seed gives the same game. */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(list, r) { return list[Math.floor((r || Math.random)() * list.length)]; }
  function shuffle(list, r) {
    var a = list.slice(), f = r || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  return { norm: norm, tokens: tokens, distance: distance, namesOf: namesOf, matches: matches, closeness: closeness, sound: sound, pattern: pattern, labelIn: labelIn,
    descIn: descIn, firstLetter: firstLetter, rng: rng, pick: pick, shuffle: shuffle, stripArticle: stripArticle };
});
