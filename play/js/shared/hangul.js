/*!
 * MBG Puzzles - Korean letters (version 1.11). No screen code in this file.
 *
 * The Word Puzzle plays Korean the way the popular Korean word games (꼬들, 꼬들·E) do: a word is
 * written out in its letters (풀어쓰기), and a letter is one key of the standard Korean keyboard
 * (두벌식), so the tiles are exactly the keys a Korean types:
 *   - 19 consonants: ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ (ㄲ ㄸ ㅃ ㅆ ㅉ are one
 *     key with Shift, so one tile each)
 *   - 14 vowels: ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ
 *   - the other vowels are typed with two keys and take two tiles: ㅘ = ㅗㅏ, ㅙ = ㅗㅐ, ㅚ = ㅗㅣ,
 *     ㅝ = ㅜㅓ, ㅞ = ㅜㅔ, ㅟ = ㅜㅣ, ㅢ = ㅡㅣ
 *   - double final consonants too: ㄳ = ㄱㅅ, ㄵ = ㄴㅈ, ㄶ = ㄴㅎ, ㄺ = ㄹㄱ, ㄻ = ㄹㅁ, ㄼ = ㄹㅂ,
 *     ㄽ = ㄹㅅ, ㄾ = ㄹㅌ, ㄿ = ㄹㅍ, ㅀ = ㄹㅎ, ㅄ = ㅂㅅ
 * Examples: 사과 → ㅅㅏㄱㅗㅏ (5), 꿀벌 → ㄲㅜㄹㅂㅓㄹ (6), 닭 → ㄷㅏㄹㄱ (4), 의사 → ㅇㅡㅣㅅㅏ (5).
 *
 * The word lists (www/words/ko-*.txt, tools/build_ko_words.py) are written in these letters
 * (Hangul Compatibility Jamo, one UTF-16 unit each). compose() puts letters back together into
 * syllables exactly as a Korean keyboard does while typing (ㅅㅏㄱㅗㅏ → 사과), so every word can be
 * shown as Koreans read it. Must match tools/build_ko_words.py.
 *
 * Runs in the browser (window.MBG.Hangul), in Node.js (require) and in the server (import).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Hangul = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var BASE = 0xAC00, LAST = 0xD7A3;
  // The parts of a syllable block, in Unicode order.
  var INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var VOWELS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  var FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  // Two-key letters and the keys they are typed with.
  var SPLIT = {
    'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
    'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ',
    'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ'
  };
  // The letters of the game: one key each (Shift letters included).
  var CONSONANTS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  var SIMPLE_VOWELS = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ';
  var LETTERS = CONSONANTS + SIMPLE_VOWELS;
  // Old-style conjoining letters (U+1100 …) as the keys above, for text that comes in that form.
  var CONJOIN = {};
  (function () {
    var i;
    for (i = 0; i < INITIALS.length; i++) CONJOIN[String.fromCharCode(0x1100 + i)] = INITIALS[i];
    for (i = 0; i < VOWELS.length; i++) CONJOIN[String.fromCharCode(0x1161 + i)] = VOWELS[i];
    for (i = 1; i < FINALS.length; i++) CONJOIN[String.fromCharCode(0x11A7 + i)] = FINALS[i];
  })();
  // Half-width letters (U+FFA1 …), as some old keyboards type them.
  var HALF = 'ㄱㄲㄳㄴㄵㄶㄷㄸㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅃㅄㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

  function isSyllable(c) { var k = c.charCodeAt(0); return k >= BASE && k <= LAST; }
  function isConsonant(c) { return CONSONANTS.indexOf(c) !== -1 && c.length === 1; }
  function isVowel(c) { return SIMPLE_VOWELS.indexOf(c) !== -1 && c.length === 1; }
  function isLetter(c) { return LETTERS.indexOf(c) !== -1 && c.length === 1; }
  /** True when the text holds any Korean letter or syllable. */
  function hasHangul(s) { return /[ᄀ-ᇿㄱ-ㆎ가-힣ﾠ-ￜ]/.test(String(s)); }

  /** One character as keys: 과 → ㄱㅗㅏ, ㅘ → ㅗㅏ, anything else unchanged. */
  function keysOf(c) {
    if (isSyllable(c)) {
      var k = c.charCodeAt(0) - BASE;
      var f = k % 28, v = ((k - f) / 28) % 21, i = Math.floor(k / 588);
      return INITIALS[i] + (SPLIT[VOWELS[v]] || VOWELS[v]) + (SPLIT[FINALS[f]] || FINALS[f]);
    }
    if (CONJOIN[c]) c = CONJOIN[c];
    var h = c.charCodeAt(0);
    if (h >= 0xFFA1 && h <= 0xFFBE) c = HALF.charAt(h - 0xFFA1) || c;
    return SPLIT[c] || c;
  }

  /** A text written out in keys (풀어쓰기): '사과' → 'ㅅㅏㄱㅗㅏ'. Other characters stay as they are. */
  function decompose(s) {
    var out = '';
    var str = String(s == null ? '' : s);
    for (var i = 0; i < str.length; i++) out += keysOf(str.charAt(i));
    return out;
  }

  // Two keys that make one vowel or one double final consonant.
  var JOIN_V = {}, JOIN_F = {};
  Object.keys(SPLIT).forEach(function (k) {
    if (VOWELS.indexOf(k) !== -1) JOIN_V[SPLIT[k]] = k; else JOIN_F[SPLIT[k]] = k;
  });
  function syl(i, v, f) {
    return String.fromCharCode(BASE + (INITIALS.indexOf(i) * 21 + VOWELS.indexOf(v)) * 28 + (f ? FINALS.indexOf(f) : 0));
  }

  /**
   * Puts keys back together into syllables, exactly as a Korean keyboard does while typing:
   * 'ㅅㅏㄱㅗㅏ' → '사과', 'ㅂㅜㄹㄱㅗㄱㅣ' → '불고기', 'ㄷㅏㄹㄱ' → '닭'. Keys that cannot be part of a
   * syllable stay single letters ('ㅏㅏ' → 'ㅏㅏ'); other characters pass through.
   */
  function compose(s) {
    var keys = Array.from(decompose(s));
    var out = '';
    var I = null, V = null, F = null;          // the syllable being built
    function flush() {
      if (I && V) out += syl(I, V, F);
      else { if (I) out += I; if (V) out += V; }
      I = V = F = null;
    }
    for (var n = 0; n < keys.length; n++) {
      var c = keys[n];
      if (isConsonant(c)) {
        if (I && V) {
          if (!F) {
            if (FINALS.indexOf(c) > 0) { F = c; continue; }      // ㄸ ㅃ ㅉ never end a syllable
          } else if (JOIN_F[F + c]) { F = JOIN_F[F + c]; continue; }
        }
        flush();
        I = c;
      } else if (isVowel(c)) {
        if (I && V && F) {
          // The last consonant moves on to start the next syllable: 삭 + ㅗ → 사고.
          var parts = Array.from(SPLIT[F] || F);
          var move = parts.pop();
          F = parts.length ? parts[0] : null;
          flush();
          I = move; V = c;
        } else if (I && V) {
          if (JOIN_V[V + c]) V = JOIN_V[V + c];
          else { flush(); out += c; }
        } else if (I) {
          V = c;
        } else {
          flush();
          // a vowel without a consonant before it is a letter on its own (ㅗ + ㅏ still makes ㅘ)
          if (n + 1 < keys.length && JOIN_V[c + keys[n + 1]]) { out += JOIN_V[c + keys[n + 1]]; n++; } else out += c;
        }
      } else {
        flush();
        out += c;
      }
    }
    flush();
    return out;
  }

  /**
   * True when keys make whole Korean syllables, the way a word can be written: every syllable
   * starts with a consonant and has a vowel (사과 yes; ㅏㅏ, ㅅㅅ or 사ㅏ no).
   */
  function wellFormed(keys) {
    var s = compose(keys);
    if (!s) return false;
    for (var i = 0; i < s.length; i++) if (!isSyllable(s.charAt(i))) return false;
    return decompose(s) === decompose(keys);
  }

  /** Number of letters (keys) in a text: 사과 → 5. */
  function keyCount(s) { return Array.from(decompose(s)).length; }

  /** For each syllable of a word, how many letters it has: 사과 → [2, 3]. */
  function syllableSizes(keys) {
    return Array.from(compose(keys)).map(function (c) { return Array.from(decompose(c)).length; });
  }

  return {
    LETTERS: LETTERS,
    CONSONANTS: CONSONANTS,
    VOWELS: SIMPLE_VOWELS,
    SPLIT: SPLIT,
    isSyllable: isSyllable,
    isLetter: isLetter,
    isConsonant: isConsonant,
    isVowel: isVowel,
    hasHangul: hasHangul,
    decompose: decompose,
    compose: compose,
    wellFormed: wellFormed,
    keyCount: keyCount,
    syllableSizes: syllableSizes
  };
});
