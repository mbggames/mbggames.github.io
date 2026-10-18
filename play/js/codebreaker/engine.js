/*!
 * MBG Puzzles · Codebreaker - core rules (no user interface code in this file).
 * (c) 2026 MBG - Merkur Beqiri Games
 *
 * Pure functions for: input normalisation, command parsing, guess validation,
 * secret numbers, O/?/X evaluation with occurrence-aware handling of repeated digits,
 * rounds and scoring.
 * Runs in the browser (window.MBG.Engine) and in Node.js (require) for unit tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Engine = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var LENGTHS = [4, 5, 6, 7, 8];
  var MIN_LEN = 4;
  var MAX_LEN = 8;
  var DIGITS = '0123456789';

  /** Text commands (FR-CMD-001..004). Case-insensitive, valid in every language. */
  var COMMANDS = {
    help: ['help', 'rules', 'rregullat', 'pomoć', 'pomoc', 'pravila'],
    reveal: ['reveal', 'zbulo', 'otkrij'],
    quit: ['exit', 'quit', 'fund', 'izlaz']
  };
  /** More commands that work only while their language is in use. */
  var LOCAL_COMMANDS = {
    de: { help: ['hilfe', 'regeln'], reveal: ['lösung'], quit: ['beenden'] },
    es: { help: ['ayuda', 'reglas'], reveal: ['revelar'], quit: ['salir'] },
    fr: { help: ['aide', 'règles', 'regles'], reveal: ['révéler', 'reveler'], quit: ['quitter'] },
    tr: { help: ['yardım', 'yardim', 'kurallar'], reveal: ['göster', 'goster'], quit: ['çık', 'cik', 'çıkış', 'cikis'] },
    pl: { help: ['zasady'], reveal: ['pokaż', 'pokaz'], quit: ['wyjdź', 'wyjdz', 'koniec'] },
    pt: { help: ['ajuda', 'regras'], reveal: ['revelar'], quit: ['sair'] },
    ar: { help: ['مساعدة', 'قواعد'], reveal: ['اكشف', 'كشف'], quit: ['خروج'] }
  };
  var COMMAND_WORDS = [];
  Object.keys(COMMANDS).forEach(function (k) { COMMAND_WORDS = COMMAND_WORDS.concat(COMMANDS[k]); });

  /** Scoring anchors (the same as Word Puzzle). */
  var SCORE_ANCHORS = {
    4: { high: { attempt: 2, score: 40000 },  low: { attempt: 10, score: 100 } },
    5: { high: { attempt: 3, score: 100000 }, low: { attempt: 12, score: 100 } },
    6: { high: { attempt: 3, score: 200000 }, low: { attempt: 13, score: 100 } },
    7: { high: { attempt: 4, score: 300000 }, low: { attempt: 14, score: 100 } },
    8: { high: { attempt: 4, score: 400000 }, low: { attempt: 15, score: 100 } }
  };

  /** Modest speed bonus: up to +20 %, falling to 0 at 30 seconds per digit. */
  var SCORING = {
    timeBonusMax: 0.2,
    timeBonusSecondsPerDigit: 30,
    capAtHighAnchor: false, // true = attempts before the high anchor score the anchor value
    minimumWinScore: 1,
    hintTries: 2            // a hint counts like this many extra tries in the score
  };

  /**
   * NFKC-normalise, trim and lower-case. NFKC also turns full-width digits
   * (as typed by some phone keyboards) into ordinary 0-9. Turkish keeps its dotted and
   * dotless i apart (I -> ı, İ -> i).
   */
  function normalize(s, lang) {
    // Arabic-Indic and Persian digits (٤٢٧١, ۴۲۷۱) count as 4271
    var t = String(s == null ? '' : s).normalize('NFKC').trim()
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
    if (lang === 'tr') {
      try { return t.toLocaleLowerCase('tr'); } catch (e) { return t.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); }
    }
    return t.toLowerCase();
  }

  /** The command lists in use in a language: the shared ones plus that language's own. */
  function commandLists(lang) {
    var out = {};
    Object.keys(COMMANDS).forEach(function (k) {
      out[k] = COMMANDS[k].concat(lang && LOCAL_COMMANDS[lang] ? LOCAL_COMMANDS[lang][k] : []);
    });
    return out;
  }

  /** Split into single characters (code points). */
  function letters(s) { return Array.from(String(s)); }

  function letterCount(s) { return letters(s).length; }

  function isDigits(s) { return /^[0-9]+$/.test(s); }

  /** Returns 'help' | 'reveal' | 'quit' | null. lang: the language in use (its own commands count too). */
  function parseCommand(raw, lang) {
    var s = normalize(raw, lang);
    var lists = commandLists(lang);
    for (var k in lists) {
      for (var i = 0; i < lists[k].length; i++) if (normalize(lists[k][i], lang) === s) return k;
    }
    return null;
  }

  function isCommandWord(word, lang) { return parseCommand(word, lang) !== null; }

  /**
   * Y/N answers for confirmation prompts (FR-CMD-005), in every language: Albanian po/jo,
   * Bosnian da/ne, German ja/nein, Spanish sí/no, French oui/non, Turkish evet/hayır.
   */
  var YES = ['y', 'yes', 'po', 'd', 'da', 'j', 'ja', 's', 'si', 'sí', 'o', 'oui', 'e', 'evet', 't', 'tak', 'sim', 'نعم', 'ن'];
  var NO = ['n', 'no', 'jo', 'ne', 'nein', 'non', 'h', 'hayır', 'hayir', 'nie', 'não', 'nao', 'لا', 'ل'];
  function parseYesNo(raw) {
    var s = normalize(raw);
    if (YES.indexOf(s) !== -1) return 'yes';
    if (NO.indexOf(s) !== -1) return 'no';
    return null;
  }

  /**
   * Classifies one line of input typed during an active round.
   * opts.length: number of digits in the secret number; opts.lang: the language in use.
   * Spaces inside the number are ignored ("12 34" counts as 1234).
   * Returns { kind: 'empty' } | { kind: 'command', command } |
   *         { kind: 'invalid', reason: 'digits'|'length', got, word } | { kind: 'guess', word }
   */
  function classifyGuess(raw, opts) {
    var text = normalize(raw, opts.lang);
    if (text === '') return { kind: 'empty' };
    var cmd = parseCommand(text, opts.lang);
    if (cmd) return { kind: 'command', command: cmd };
    var word = text.replace(/\s+/g, '');
    if (!isDigits(word)) return { kind: 'invalid', reason: 'digits', word: word, got: letterCount(word) };
    var n = word.length;
    if (n !== opts.length) return { kind: 'invalid', reason: 'length', word: word, got: n };
    return { kind: 'guess', word: word };
  }

  /**
   * A random secret number of `length` digits. Digits may repeat and the number may
   * start with 0, so there are 10^length possible numbers (10,000 for 4 digits).
   */
  function randomSecret(length, rnd) {
    var r = typeof rnd === 'function' ? rnd : Math.random;
    var out = '';
    for (var i = 0; i < length; i++) out += DIGITS.charAt(Math.min(9, Math.floor(r() * 10)));
    return out;
  }

  /** Number of possible secret numbers of that length. */
  function possibleCount(length) { return Math.pow(10, length); }

  /**
   * O/?/X feedback in guess order (FR-GAME-007..011).
   * Exact matches are allocated first, then misplaced digits, each secret digit only once.
   */
  function evaluateGuess(secret, guess) {
    var s = letters(normalize(secret));
    var g = letters(normalize(guess));
    if (s.length !== g.length) throw new Error('Guess length ' + g.length + ' does not match secret length ' + s.length);
    var feedback = new Array(g.length);
    var remaining = Object.create(null);
    var i;
    for (i = 0; i < s.length; i++) {
      if (g[i] === s[i]) {
        feedback[i] = 'O';
      } else {
        feedback[i] = 'X';
        remaining[s[i]] = (remaining[s[i]] || 0) + 1;
      }
    }
    for (i = 0; i < g.length; i++) {
      if (feedback[i] === 'O') continue;
      if (remaining[g[i]] > 0) {
        feedback[i] = '?';
        remaining[g[i]] -= 1;
      }
    }
    return feedback;
  }

  function isWin(feedback) {
    return feedback.length > 0 && feedback.every(function (f) { return f === 'O'; });
  }

  /** Attempt-based exponential decay through the two anchors of the number length. */
  function baseScore(length, attempts) {
    var a = SCORE_ANCHORS[length];
    if (!a || attempts < 1) return 0;
    var r = Math.pow(a.low.score / a.high.score, 1 / (a.low.attempt - a.high.attempt));
    var n = attempts;
    if (SCORING.capAtHighAnchor && n < a.high.attempt) n = a.high.attempt;
    var value = Math.round(a.high.score * Math.pow(r, n - a.high.attempt));
    return Math.max(SCORING.minimumWinScore, value);
  }

  function timeBonus(length, base, seconds) {
    var limit = length * SCORING.timeBonusSecondsPerDigit;
    var factor = SCORING.timeBonusMax * Math.max(0, 1 - Math.max(0, seconds) / limit);
    return Math.round(base * factor);
  }

  function computeScore(length, attempts, seconds) {
    var base = baseScore(length, attempts);
    var bonus = timeBonus(length, base, seconds);
    return { base: base, bonus: bonus, total: base + bonus };
  }

  /** Thousands separators, e.g. 40,000 (FR-SCORE-001). */
  function formatNumber(n) {
    var s = String(Math.round(Number(n) || 0));
    var neg = s.charAt(0) === '-';
    if (neg) s = s.slice(1);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + s;
  }

  /* ----------------------------------------------------------- rounds --- */
  function createRound(secret, length, lang, now) {
    return {
      secret: normalize(secret),
      length: length,
      lang: lang,
      guesses: [],
      startedAt: now,
      endedAt: null,
      status: 'active', // 'active' | 'won' | 'revealed' | 'abandoned'
      score: null,
      hints: []         // [{ index, ch, atTry }]: digits shown by hints, in order
    };
  }

  function elapsedSeconds(round, now) {
    if (!round) return 0;
    var end = round.endedAt != null ? round.endedAt : now;
    return Math.max(0, Math.floor((end - round.startedAt) / 1000));
  }

  function applyGuess(round, word, now) {
    if (round.status !== 'active') throw new Error('Round is not active');
    var feedback = evaluateGuess(round.secret, word);
    round.guesses.push({ word: normalize(word), feedback: feedback });
    var won = isWin(feedback);
    if (won) {
      round.status = 'won';
      round.endedAt = now;
      round.score = computeScore(round.length, scoreTries(round), elapsedSeconds(round, now));
    }
    return { attempt: round.guesses.length, feedback: feedback, won: won };
  }

  /* ------------------------------------------------------------ hints --- */
  /** Tries counted for the score: the real tries plus SCORING.hintTries for every hint. */
  function scoreTries(round) {
    return round.guesses.length + SCORING.hintTries * (round.hints ? round.hints.length : 0);
  }

  /** For each position: true when the player knows it (green in a try, or shown by a hint). */
  function knownPositions(round) {
    var n = letters(round.secret).length;
    var known = [];
    for (var i = 0; i < n; i++) known.push(false);
    round.guesses.forEach(function (g) { g.feedback.forEach(function (f, j) { if (f === 'O') known[j] = true; }); });
    (round.hints || []).forEach(function (h) { known[h.index] = true; });
    return known;
  }

  /** How many more hints this round allows: one digit always stays for the player to find. */
  function hintsLeft(round) {
    if (!round || round.status !== 'active') return 0;
    var unknown = knownPositions(round).filter(function (k) { return !k; }).length;
    return Math.max(0, unknown - 1);
  }

  /**
   * Shows one more digit: a random position among those the player does not know yet (not
   * green in any try and not shown by an earlier hint). rnd: random number source (0..1).
   */
  function applyHint(round, rnd) {
    if (hintsLeft(round) < 1) return null;
    var r = typeof rnd === 'function' ? rnd : Math.random;
    var open = [];
    knownPositions(round).forEach(function (k, i) { if (!k) open.push(i); });
    var index = open[Math.min(open.length - 1, Math.floor(r() * open.length))];
    var ch = letters(round.secret)[index];
    if (!round.hints) round.hints = [];
    round.hints.push({ index: index, ch: ch, atTry: round.guesses.length });
    return { index: index, ch: ch, number: round.hints.length };
  }

  /** The digits shown by hints so far, by position (null where nothing was shown). */
  function hintPattern(round) {
    var out = letters(round.secret).map(function () { return null; });
    (round.hints || []).forEach(function (h) { out[h.index] = h.ch; });
    return out;
  }

  function revealRound(round, now) {
    if (round.status === 'active') {
      round.status = 'revealed';
      round.endedAt = now;
      round.score = { base: 0, bonus: 0, total: 0 };
    }
    return round;
  }

  function abandonRound(round, now) {
    if (round && round.status === 'active') {
      round.status = 'abandoned';
      round.endedAt = now;
      round.score = { base: 0, bonus: 0, total: 0 };
    }
    return round;
  }

  return {
    LENGTHS: LENGTHS,
    MIN_LEN: MIN_LEN,
    MAX_LEN: MAX_LEN,
    COMMANDS: COMMANDS,
    LOCAL_COMMANDS: LOCAL_COMMANDS,
    COMMAND_WORDS: COMMAND_WORDS,
    commandLists: commandLists,
    SCORE_ANCHORS: SCORE_ANCHORS,
    SCORING: SCORING,
    normalize: normalize,
    letters: letters,
    letterCount: letterCount,
    isDigits: isDigits,
    parseCommand: parseCommand,
    isCommandWord: isCommandWord,
    parseYesNo: parseYesNo,
    classifyGuess: classifyGuess,
    randomSecret: randomSecret,
    possibleCount: possibleCount,
    evaluateGuess: evaluateGuess,
    isWin: isWin,
    baseScore: baseScore,
    timeBonus: timeBonus,
    computeScore: computeScore,
    formatNumber: formatNumber,
    createRound: createRound,
    elapsedSeconds: elapsedSeconds,
    applyGuess: applyGuess,
    revealRound: revealRound,
    scoreTries: scoreTries,
    knownPositions: knownPositions,
    hintsLeft: hintsLeft,
    applyHint: applyHint,
    hintPattern: hintPattern,
    abandonRound: abandonRound
  };
});
