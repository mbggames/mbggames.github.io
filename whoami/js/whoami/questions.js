/*!
 * MBG Who Am I? - the question engine (no screen code).
 *
 * parse(text, lang)        a typed question → a list of checks ("predicates"), e.g.
 *                          "Was I born before 1950?" → [{t:'date', subj:'born', op:'before', a:1950}]
 * evaluate(pred, entity)   one check against the facts of the hidden answer → YES / NO / BOTH / UNKNOWN
 * answer(text, entity, lang)  both together - how the computer answers (FR-018):
 *                          YES, NO, BOTH (both readings are defensible), UNKNOWN (no reliable data),
 *                          or INVALID (not a yes/no question the game understands - FR-020, no penalty)
 * render(pred, lang, kind) the computer asks a question (the computer as Guesser, suggested questions)
 *
 * Several checks in one question: of the same kind they are joined with OR ("from Germany or
 * Austria?"), of different kinds with AND ("a German actress?"); "not" turns Yes and No around.
 * Runs in the browser (MBG.WhoQuestions), Node.js and the Cloudflare worker.
 */
(function (root, factory) {
  var api = factory(root.MBG && root.MBG.WhoText || (typeof require === 'function' ? require('./text.js') : null),
    root.MBG && root.MBG.WhoLex || (typeof require === 'function' ? require('./lexicon.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoQuestions = api;
})(typeof self !== 'undefined' ? self : globalThis, function (X, L) {
  'use strict';
  var CODES = ['YES', 'NO', 'BOTH', 'UNKNOWN'];
  var LI = function (lang) { return Math.max(0, L.LANGS.indexOf(lang)); };
  var PERSON_KINDS = ['person'];
  var WORK_TAGS = ['film', 'tv', 'book', 'poem', 'art', 'painting', 'sculpture', 'game', 'videogame', 'boardgame', 'song', 'album'];

  /* --------------------------------------------------------- tokenizing --- */
  /** Words of the question: raw (with capitals) and normalized, aligned. */
  function words(text) {
    var raw = String(text || '').split(/[^\p{L}\p{N}]+/u).filter(Boolean), out = { raw: [], n: [] };
    raw.forEach(function (r) {
      X.norm(r).split(' ').filter(Boolean).forEach(function (n) { out.raw.push(r); out.n.push(n); });
    });
    return out;
  }

  /* ---------------------------------------------------------- numbers --- */
  function numbersIn(text) {
    var out = [], re = /(\d{1,3}(?:[.,  ]\d{3})+|\d+(?:[.,]\d+)?)/g, m;
    while ((m = re.exec(text))) {
      var s = m[1], v;
      if (/^\d{1,3}([.,  ]\d{3})+$/.test(s)) v = Number(s.replace(/[.,  ]/g, ''));
      else v = Number(s.replace(',', '.'));
      out.push({ v: v, raw: s, end: m.index + s.length, start: m.index });
    }
    return out;
  }
  function wordAfter(text, end) { var m = /^[\s.]*([\p{L}]+)/u.exec(text.slice(end)); return m ? X.norm(m[1]) : ''; }

  /* ------------------------------------------------------------ parse --- */
  /**
   * Returns { kind: 'ok' | 'empty' | 'guess' | 'unknown', preds: [...], neg, or }.
   * Every match of a word list is remembered with where it is; a longer match wins over a shorter
   * one inside it ("part of a series" is not "series", "science fiction" is not "science").
   */
  function parse(text, lang) {
    lang = L.LANGS.indexOf(lang) !== -1 ? lang : 'en';
    var src = String(text || '').trim();
    var w = words(src), N = w.n;
    if (!N.length) return { kind: 'empty', preds: [] };
    var cands = [];       // { at, len, pred | flag }
    function add(spec, make) {
      L.find(N, spec).forEach(function (m) {
        // how specific the match is: more words, a whole word, a longer word start
        var term = (L.compile(spec)[m.term] || []);
        var stem = term.reduce(function (s0, t) { return s0 + t.w.length + (t.p ? 0 : 3); }, 0);
        cands.push({ at: m.at, len: m.len, make: make, rank: m.len * 100 + stem });
      });
    }
    var spec = function (entry) { return L.specFor(entry, lang); };

    // kinds, professions, genres, sports and prizes
    Object.keys(L.TAGS).forEach(function (tag) { add(spec(L.TAGS[tag].lex), { t: 'tag', tag: tag }); });
    // places
    L.COUNTRIES.forEach(function (c) { add(L.countrySpec(c, lang), { t: 'country', iso: c.iso }); });
    Object.keys(L.CONTINENTS).forEach(function (k) { add(spec(L.CONTINENTS[k].lex), { t: 'continent', code: k }); });
    add(spec(L.AMERICA), { t: 'america' });
    add(spec(L.BALKANS.lex), { t: 'balkans' });
    // people
    add(spec(L.W.female), { t: 'gender', v: 'f' });
    add(spec(L.W.male), { t: 'gender', v: 'm' });
    add(spec(L.W.alive), { t: 'alive', v: true });
    add(spec(L.W.dead), { t: 'alive', v: false });
    add(spec(L.W.fictional), { t: 'fictional', v: true });
    add(spec(L.W.real), { t: 'fictional', v: false });

    // keep the most specific matches ("part of a series" over "series", "atletikën" = athletics, not
    // athlete); equal ones may both stay; a country over a word for a thing ("Island" = Iceland in German)
    var isPlace = function (c) { return c.make.t === 'country' || c.make.t === 'continent' || c.make.t === 'america' || c.make.t === 'balkans'; };
    cands.sort(function (a, b) { return b.rank - a.rank; });
    var used = [], accepted = [];
    cands.forEach(function (c) {
      var clash = accepted.some(function (a) {
        if (!(c.at < a.at + a.len && a.at < c.at + c.len)) return false;
        if (isPlace(a) && !isPlace(c)) return true;
        return a.rank > c.rank;
      });
      if (!clash) { accepted.push(c); for (var i = c.at; i < c.at + c.len; i++) used[i] = true; }
    });
    accepted = accepted.filter(function (c) {
      return !(!isPlace(c) && accepted.some(function (a) { return isPlace(a) && c.at < a.at + a.len && a.at < c.at + c.len; }));
    });
    // words that only shape a question (more, before, born, km, name ...) are never names
    ['more', 'less', 'before', 'after', 'between', 'born', 'died', 'ended', 'began', 'founded', 'century', 'bc', 'people', 'height', 'length', 'hours',
      'minutes', 'million', 'thousand', 'starts', 'contains', 'word', 'letters', 'name', 'not', 'or', 'relation', 'guess'].forEach(function (k) {
      L.find(N, spec(L.W[k])).forEach(function (m) { for (var i = m.at; i < m.at + m.len; i++) used[i] = true; });
    });
    N.forEach(function (t, i) { if (/^\d/.test(t) || /^(vit|year|jahr|godin|decade|dekad|jahrzehnt)/.test(t)) used[i] = true; });
    var preds = [];
    function push(p) { if (!preds.some(function (q) { return JSON.stringify(q) === JSON.stringify(p); })) preds.push(p); }
    accepted.forEach(function (c) { push(c.make); });
    // A country or continent named in the question: words like "country" only say what is asked
    if (preds.some(function (p) { return p.t === 'country' || p.t === 'continent' || p.t === 'america' || p.t === 'balkans'; })) {
      preds = preds.filter(function (p) { return !(p.t === 'tag' && (p.tag === 'country' || p.tag === 'place')); });
    }
    // "dead" + a year is about the year of death; "alive"/"died" words then are not a check of their own
    var has = function (e) { return L.has(N, spec(e)); };
    var nums = numbersIn(src);

    /* the name: first letter, letters, words */
    var nameQ = has(L.W.starts) || (has(L.W.contains) && has(L.W.name)) || (has(L.W.contains) && !nums.length && single(w).length);
    if (nameQ) {
      var letters = single(w);
      if (has(L.W.starts) && letters.length >= 2 && /\b(to|until|deri|bis|do)\b/.test(X.norm(src))) {
        preds = [{ t: 'name', op: 'range', a: letters[letters.length - 2], b: letters[letters.length - 1] }];
      } else if (letters.length) {
        preds = [{ t: 'name', op: has(L.W.starts) ? 'starts' : 'contains', v: letters[letters.length - 1] }];
      }
      if (preds.length && preds[0].t === 'name') return finish(preds, N, lang, src);
    }
    if (has(L.W.word) && (has(L.W.name) || /\b(word|words|fjale|wort|worter|rijec|rijeci)\b/.test(X.norm(src)))) {
      var n = countWord(N, lang, nums);
      if (n) {
        var more = has(L.W.more), less = has(L.W.less);
        return finish([{ t: 'name', op: more ? 'words>' : less ? 'words<' : 'words=', v: n }], N, lang, src);
      }
    }
    if (has(L.W.letters) && nums.length && (has(L.W.name) || has(L.W.more) || has(L.W.less))) {
      return finish([{ t: 'name', op: has(L.W.less) ? 'letters<' : 'letters>', v: nums[0].v }], N, lang, src);
    }

    /* numbers: amounts (people, height, length, minutes) or years */
    var dim = has(L.W.people) ? 'population' : has(L.W.hours) || has(L.W.minutes) ? 'duration'
      : (has(L.W.length) && !has(L.W.height)) ? 'length' : has(L.W.height) && !has(L.W.century) ? 'elevation' : null;
    var amountWord = has(L.W.more) || has(L.W.less);
    var decade = decadeIn(src, lang), century = centuryIn(src, lang);
    if (nums.length || decade || century) {
      var big = nums.filter(function (x) { return x.v >= 10000 || /^(million|milion|mio|mln|mil|tausend|mije|hiljad|tisuc|thousand)/.test(wordAfter(src, x.end)); });
      var useAmount = dim || (big.length && amountWord && !has(L.W.before) && !has(L.W.after));
      if (useAmount && nums.length) {
        var x = nums[0], v = x.v, after = wordAfter(src, x.end);
        if (/^(million|milion|mio|mln|mil)/.test(after)) v *= 1e6;
        else if (/^(thousand|tausend|mije|hiljad|tisuc)$|^k$/.test(after)) v *= 1e3;
        if (dim === 'duration' && L.has(N, spec(L.W.hours)) && !L.has(N, spec(L.W.minutes))) v *= 60;
        preds = preds.filter(function (p) { return p.t !== 'tag' || (L.TAGS[p.tag].dim !== 'occ' && p.tag !== 'person'); });
        push({ t: 'num', dim: dim || 'auto', op: has(L.W.less) ? 'less' : 'more', v: v });
      } else {
        var subj = has(L.W.born) ? 'born' : has(L.W.died) ? 'died' : has(L.W.ended) ? 'ended' : has(L.W.began) ? 'began' : has(L.W.founded) ? 'founded' : 'primary';
        if (subj === 'born' || subj === 'died') preds = preds.filter(function (p) { return p.t !== 'alive'; });
        var bc = has(L.W.bc);
        var years = nums.filter(function (q) { return q.v >= 0 && q.v <= 2100 && Math.floor(q.v) === q.v && !(century && q.v <= 21); })
          .map(function (q) { return bc ? -q.v : q.v; });
        var range = null;
        if (decade) range = decade;
        else if (century) range = century;
        if (range) push({ t: 'date', subj: subj, op: has(L.W.before) ? 'before' : has(L.W.after) ? 'after' : 'in', a: has(L.W.after) ? range[1] : range[0], b: range[1] });
        else if (years.length >= 2 && has(L.W.between)) push({ t: 'date', subj: subj, op: 'in', a: Math.min(years[0], years[1]), b: Math.max(years[0], years[1]) });
        else if (years.length) push({ t: 'date', subj: subj, op: has(L.W.before) ? 'before' : has(L.W.after) ? 'after' : 'in', a: years[0], b: years[0] });
      }
    }

    /* people connected with the answer: "Did Spielberg direct me?", "Is Tom Hanks in it?" */
    var relWord = has(L.W.relation);
    var nameWords = [];
    for (var i = 0; i < N.length; i++) {
      if (used[i]) continue;
      var r = w.raw[i];
      var cap = i > 0 && /^\p{Lu}/u.test(r) && N[i].length >= 3;
      if (cap || (relWord && N[i].length >= 4 && !isFunctionWord(N[i], lang))) nameWords.push(N[i]);
    }
    if (nameWords.length && (relWord || preds.length === 0)) {
      var guessy = L.find(N, spec(L.W.guess)).some(function (m) { return m.at === 0; });
      if (!relWord && guessy && !preds.length) return { kind: 'guess', preds: [] };
      if (relWord || nameWords.length) push({ t: 'rel', names: nameWords, strict: relWord });
    }
    if (!preds.length) {
      var g = L.find(N, spec(L.W.guess)).some(function (m) { return m.at === 0; });
      return { kind: g && N.length >= 3 ? 'guess' : 'unknown', preds: [] };
    }
    return finish(preds, N, lang, src);
  }
  function finish(preds, N, lang, src) {
    var neg = L.has(N, L.specFor(L.W.not, lang)) && !/^(a|an)$/.test(N[0]);
    // Albanian "s" also appears in "s'" only - a lone "s" elsewhere is not a "not"
    if (lang === 'sq' && neg && !/(nuk|kurre|\bs')/i.test(src.toLowerCase().replace(/[’`]/g, "'")) && !/\bjo\b/.test(X.norm(src))) neg = false;
    return { kind: 'ok', preds: preds, neg: neg, or: L.has(N, L.specFor(L.W.or, lang)) };
  }
  function single(w) {
    var out = [];
    w.raw.forEach(function (r, i) { if (Array.from(r).length === 1 && /\p{L}/u.test(r)) out.push(r.toUpperCase()); });
    // "A jam..." - an Albanian question starts with the word "A", which is not a letter asked about
    if (out.length > 1 && w.raw[0] && w.raw[0].length === 1) out.shift();
    return out;
  }
  function countWord(N, lang, nums) {
    var NW = L.NUMBER_WORDS[lang] || {}, EN = L.NUMBER_WORDS.en;
    for (var i = 0; i < N.length; i++) {
      if (/^(word|words|fjale|fjalesh|wort|worter|worten|rijec|rijeci)$/.test(N[i])) {
        for (var j = i - 1; j >= Math.max(0, i - 3); j--) {
          if (/^\d+$/.test(N[j])) return Number(N[j]);
          if (NW[N[j]] || EN[N[j]]) return NW[N[j]] || EN[N[j]];
        }
      }
    }
    return nums.length ? nums[0].v : 0;
  }
  var FUNCTION_WORDS = 'the and for with from that this have has had was were been being does did done into about your you are my me am who what where when which film movie book song made also still ever'
    + ' une jam eshte ishte kam ka nje per nga dhe ose apo qe kjo ky ime im te se me ne mua une ti'
    + ' ich bin du bist ist war wurde habe hat einen eine einem einer der die das den dem des von mit und oder nicht mein meine mich mir'
    + ' jesam jesi sam li da ili moj moja moje mene meni sta koji koja koje film knjiga pjesma';
  var FW = {}; FUNCTION_WORDS.split(' ').forEach(function (x) { FW[x] = 1; });
  function isFunctionWord(n) { return !!FW[n]; }

  function decadeIn(src, lang) {
    var s = src.toLowerCase(), m;
    if ((m = /\b(1\d|20)(\d)0\s*(?:'?s|ern?|-?ih|-?tih|-?e|ies)\b/.exec(s))) return [Number(m[1] + m[2] + '0'), Number(m[1] + m[2] + '9')];
    if ((m = /(?:^|[\s(])'?(\d)0\s*(?:'?s|ern?|-?ih|-?tih)\b/.exec(s))) return [1900 + Number(m[1]) * 10, 1909 + Number(m[1]) * 10];
    if ((m = /vitet?e?\s+'?(\d{2,4})/.exec(X.norm(src).replace(/ /g, ' ')))) {
      var v = Number(m[1]); if (v < 100) v += 1900; if (v % 10 === 0) return [v, v + 9];
    }
    if ((m = /\b(1\d|20)00s\b/.exec(s))) return [Number(m[1] + '00'), Number(m[1] + '99')];
    return null;
  }
  var ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20, xxi: 21 };
  function centuryIn(src, lang) {
    var w = words(src);
    if (!L.has(w.n, L.specFor(L.W.century, lang))) return null;
    var bc = L.has(w.n, L.specFor(L.W.bc, lang));
    for (var i = 0; i < w.n.length; i++) {
      var t = w.n[i], raw = w.raw[i], c = 0, m = /^(\d{1,2})(st|nd|rd|th|te|ti|t)?$/.exec(t);
      if (m) c = Number(m[1]); else if (ROMAN[t] && raw.length >= 2 && raw === raw.toUpperCase()) c = ROMAN[t];
      if (c >= 1 && c <= 21) return bc ? [-(c * 100), -((c - 1) * 100 + 1)] : [(c - 1) * 100 + 1, c * 100];
    }
    return null;
  }

  /* --------------------------------------------------------- evaluate --- */
  function isPerson(e) { return e && (e.kind === 'person' || (e.facts && (e.facts.tags || []).indexOf('person') !== -1)); }
  function isWork(e) { return (e.facts.tags || []).some(function (t) { return WORK_TAGS.indexOf(t) !== -1; }); }
  function range(e, subj) {
    var f = e.facts;
    if (subj === 'born') return isPerson(e) && f.born != null ? [f.born, f.born] : null;
    if (subj === 'died') return isPerson(e) && f.died != null ? [f.died, f.died] : null;
    if (isPerson(e)) return f.born != null ? [f.born, f.born] : null;
    if (f.start == null) return null;
    if (subj === 'ended') return f.end != null ? [f.end, f.end] : null;
    if (subj === 'began') return [f.start, f.start];
    return [f.start, f.end != null ? f.end : f.start];
  }
  function dateCheck(r, op, a, b) {
    var s = r[0], e = r[1];
    if (op === 'before') return e < a ? 'YES' : s >= a ? 'NO' : 'BOTH';
    if (op === 'after') return s > a ? 'YES' : e <= a ? 'NO' : 'BOTH';
    if (s >= a && e <= b) return 'YES';
    if (e < a || s > b) return 'NO';
    return 'BOTH';
  }
  function continents(f) { return f.continents && f.continents.length ? f.continents : L.continentsOf(f.countries); }
  function nameOf(e, lang) { return X.labelIn(e, lang); }

  /** One check against the facts of an entity. */
  function evaluate(p, e, lang) {
    var f = (e && e.facts) || {};
    var tags = f.tags || [];
    switch (p.t) {
      case 'tag': {
        if (tags.indexOf(p.tag) !== -1) return 'YES';
        if ((f.bothTags || []).indexOf(p.tag) !== -1) return 'BOTH';
        var dim = L.TAGS[p.tag] ? L.TAGS[p.tag].dim : 'any';
        if (dim === 'occ') {
          if (!isPerson(e)) return 'NO';
          return (f.occKnown === false) ? 'UNKNOWN' : 'NO';
        }
        if (dim === 'genre') {
          if (!isWork(e)) return 'NO';
          return f.genreKnown === false ? 'UNKNOWN' : 'NO';
        }
        if (p.tag === 'person' && f.fictional) return 'NO';
        return 'NO';
      }
      case 'gender':
        if (!isPerson(e)) return 'NO';
        if (!f.gender) return 'UNKNOWN';
        return f.gender === p.v ? 'YES' : 'NO';
      case 'alive': {
        if (!isPerson(e)) return p.v ? 'NO' : 'UNKNOWN';
        var alive = f.died != null ? false : f.alive != null ? f.alive : (f.born != null && f.born < 1910 ? false : null);
        if (alive == null) return 'UNKNOWN';
        return alive === p.v ? 'YES' : 'NO';
      }
      case 'fictional':
        return !!f.fictional === p.v ? 'YES' : 'NO';
      case 'country': {
        var cs = f.countries || [];
        if (cs.indexOf(p.iso) !== -1) return 'YES';
        if ((f.both || []).indexOf(p.iso) !== -1) return 'BOTH';
        if (p.iso === 'YU' || p.iso === 'SU' || p.iso === 'OT') {
          // former states: a match through the modern countries they covered is "both"
          var parts = { YU: ['BA', 'HR', 'ME', 'MK', 'RS', 'SI', 'XK'], SU: ['RU', 'UA'], OT: ['TR', 'AL', 'XK', 'BA', 'MK', 'GR', 'BG', 'EG', 'IQ', 'SA'] }[p.iso];
          if (cs.some(function (c) { return parts.indexOf(c) !== -1; }) && (f.start || f.born || 0) < (p.iso === 'YU' ? 1992 : p.iso === 'SU' ? 1991 : 1923)) return 'BOTH';
        }
        return cs.length ? 'NO' : 'UNKNOWN';
      }
      case 'continent': {
        var co = continents(f);
        if (!co.length) return 'UNKNOWN';
        if (co.indexOf(p.code) === -1) return 'NO';
        return co.length > 1 && p.code !== co[0] && (f.countries || []).length === 1 ? 'BOTH' : 'YES';
      }
      case 'america': {
        var ca = continents(f);
        if (!ca.length) return 'UNKNOWN';
        return ca.indexOf('NA') !== -1 || ca.indexOf('SA') !== -1 ? 'YES' : 'NO';
      }
      case 'balkans': {
        var cb = f.countries || [];
        if (!cb.length) return 'UNKNOWN';
        return cb.some(function (c) { return L.BALKANS.codes.indexOf(c) !== -1; }) ? 'YES' : (f.both || []).some(function (c) { return L.BALKANS.codes.indexOf(c) !== -1; }) ? 'BOTH' : 'NO';
      }
      case 'date': {
        if (p.subj === 'died' && isPerson(e) && f.died == null) {
          if (f.alive === true || (f.born != null && f.born > 1925)) return 'NO';
        }
        var r = range(e, p.subj);
        if (!r) return (p.subj === 'born' || p.subj === 'died') && !isPerson(e) ? 'NO' : 'UNKNOWN';
        return dateCheck(r, p.op, p.a, p.b);
      }
      case 'num': {
        var d = p.dim;
        if (d === 'auto') d = f.population != null ? 'population' : f.length != null ? 'length' : f.elevation != null ? 'elevation' : f.duration != null ? 'duration' : null;
        var v = d ? f[d] : null;
        if (v == null) return 'UNKNOWN';
        var near = Math.abs(v - p.v) <= Math.max(1, p.v * 0.005);      // within 0.5 %: sources differ
        if (near) return 'BOTH';
        return (p.op === 'less' ? v < p.v : v > p.v) ? 'YES' : 'NO';
      }
      case 'name': {
        var nm = nameOf(e, lang || 'en');
        var nn = X.norm(nm).replace(/ /g, '');
        if (p.op === 'starts') return X.norm(X.firstLetter(nm)) === X.norm(p.v) ? 'YES' : 'NO';
        if (p.op === 'range') {
          var c0 = X.norm(X.firstLetter(nm));
          return c0 >= X.norm(p.a) && c0 <= X.norm(p.b) ? 'YES' : 'NO';
        }
        if (p.op === 'contains') return nn.indexOf(X.norm(p.v)) !== -1 ? 'YES' : 'NO';
        var wc = X.norm(nm).split(' ').filter(Boolean).length;
        if (p.op === 'words>') return wc > p.v ? 'YES' : 'NO';
        if (p.op === 'words<') return wc < p.v ? 'YES' : 'NO';
        if (p.op === 'words=') return wc === p.v ? 'YES' : 'NO';
        if (p.op === 'letters>') return nn.length > p.v ? 'YES' : 'NO';
        if (p.op === 'letters<') return nn.length < p.v ? 'YES' : 'NO';
        return 'UNKNOWN';
      }
      case 'rel': {
        var ppl = f.people || {};
        var all = [].concat(ppl.creators || [], ppl.cast || [], ppl.members || [], ppl.related || []);
        var toks = {};
        all.forEach(function (n) { X.norm(n).split(' ').forEach(function (t) { if (t.length >= 3) toks[t] = 1; }); });
        var hit = p.names.some(function (n) { return n.length >= 3 && toks[n]; });
        if (hit) return 'YES';
        if (!p.strict) return 'UNKNOWN';
        if (!all.length) return 'UNKNOWN';
        return f.peopleComplete ? 'NO' : 'UNKNOWN';
      }
    }
    return 'UNKNOWN';
  }

  function family(p) {
    if (p.t === 'country' || p.t === 'continent' || p.t === 'america' || p.t === 'balkans') return 'place';
    if (p.t === 'tag') return 'tag:' + (L.TAGS[p.tag] ? L.TAGS[p.tag].dim : 'any');
    return p.t;
  }
  function anyOf(codes) {
    if (codes.indexOf('YES') !== -1) return 'YES';
    if (codes.indexOf('BOTH') !== -1) return 'BOTH';
    if (codes.indexOf('UNKNOWN') !== -1) return 'UNKNOWN';
    return 'NO';
  }
  function allOf(codes) {
    if (codes.indexOf('NO') !== -1) return 'NO';
    if (codes.indexOf('UNKNOWN') !== -1) return 'UNKNOWN';
    if (codes.indexOf('BOTH') !== -1) return 'BOTH';
    return 'YES';
  }
  function combine(preds, e, lang, or) {
    var groups = {};
    preds.forEach(function (p) { (groups[family(p)] = groups[family(p)] || []).push(evaluate(p, e, lang)); });
    var per = Object.keys(groups).map(function (k) { return or ? anyOf(groups[k]) : allOf(groups[k]); });
    return allOf(per);
  }
  function flip(c) { return c === 'YES' ? 'NO' : c === 'NO' ? 'YES' : c; }

  /** How the computer answers a typed question about the entity. */
  function answer(text, e, lang) {
    var q = parse(text, lang);
    if (q.kind === 'empty') return { code: 'INVALID', reason: 'empty', preds: [] };
    if (q.kind === 'guess') return { code: 'INVALID', reason: 'guess', preds: [] };
    if (q.kind !== 'ok') return { code: 'INVALID', reason: 'unknown', preds: [] };
    var code = combine(q.preds, e, lang, q.or);
    if (q.neg) code = flip(code);
    return { code: code, preds: q.preds, neg: !!q.neg };
  }

  /* ----------------------------------------------------------- render --- */
  function fmtNum(v, lang) {
    var s = String(Math.round(v));
    var sep = lang === 'en' ? ',' : lang === 'sq' ? ' ' : '.';
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function year(y, lang) {
    if (y >= 0) return String(y);
    return { en: -y + ' BC', sq: -y + ' p.e.s.', de: -y + ' v. Chr.', bs: -y + '. p.n.e.' }[lang] || String(y);
  }
  var R = {
    female: ['Am I a woman?', 'A jam grua?', 'Bin ich eine Frau?', 'Jesam li žena?'],
    male: ['Am I a man?', 'A jam burrë?', 'Bin ich ein Mann?', 'Jesam li muškarac?'],
    alive: ['Am I still alive?', 'A jam ende gjallë?', 'Lebe ich noch?', 'Jesam li još živ?'],
    fictional: ['Am I fictional?', 'A jam fiktiv?', 'Bin ich fiktiv?', 'Jesam li izmišljen?'],
    country: ['Is my country {c}?', 'A është vendi im {c}?', 'Ist mein Land {c}?', 'Je li moja zemlja {c}?'],
    continent: ['Is my continent {c}?', 'A është kontinenti im {c}?', 'Ist mein Kontinent {c}?', 'Je li moj kontinent {c}?'],
    america: ['Am I from America?', 'A jam nga Amerika?', 'Komme ich aus Amerika?', 'Jesam li iz Amerike?'],
    balkans: ['Am I from the Balkans?', 'A jam nga Ballkani?', 'Komme ich vom Balkan?', 'Jesam li s Balkana?'],
    'born.before': ['Was I born before {y}?', 'A kam lindur para vitit {y}?', 'Bin ich vor {y} geboren?', 'Jesam li rođen prije {y}. godine?'],
    'born.after': ['Was I born after {y}?', 'A kam lindur pas vitit {y}?', 'Bin ich nach {y} geboren?', 'Jesam li rođen poslije {y}. godine?'],
    'died.before': ['Did I die before {y}?', 'A kam vdekur para vitit {y}?', 'Bin ich vor {y} gestorben?', 'Jesam li umro prije {y}. godine?'],
    'work.before': ['Was I created before {y}?', 'A jam krijuar para vitit {y}?', 'Bin ich vor {y} entstanden?', 'Jesam li nastao prije {y}. godine?'],
    'work.after': ['Was I created after {y}?', 'A jam krijuar pas vitit {y}?', 'Bin ich nach {y} entstanden?', 'Jesam li nastao poslije {y}. godine?'],
    'event.before': ['Did I happen before {y}?', 'A kam ndodhur para vitit {y}?', 'Fand ich vor {y} statt?', 'Jesam li se dogodio prije {y}. godine?'],
    'event.after': ['Did I happen after {y}?', 'A kam ndodhur pas vitit {y}?', 'Fand ich nach {y} statt?', 'Jesam li se dogodio poslije {y}. godine?'],
    'place.before': ['Was I founded before {y}?', 'A jam themeluar para vitit {y}?', 'Wurde ich vor {y} gegründet?', 'Jesam li osnovan prije {y}. godine?'],
    'place.after': ['Was I founded after {y}?', 'A jam themeluar pas vitit {y}?', 'Wurde ich nach {y} gegründet?', 'Jesam li osnovan poslije {y}. godine?'],
    population: ['Do more than {n} people live in me?', 'A jetojnë në mua më shumë se {n} banorë?', 'Habe ich mehr als {n} Einwohner?', 'Imam li više od {n} stanovnika?'],
    elevation: ['Am I higher than {n} m?', 'A jam më i lartë se {n} m?', 'Bin ich höher als {n} m?', 'Jesam li viši od {n} m?'],
    length: ['Am I longer than {n} km?', 'A jam më i gjatë se {n} km?', 'Bin ich länger als {n} km?', 'Jesam li duži od {n} km?'],
    duration: ['Am I longer than {n} minutes?', 'A zgjas më shumë se {n} minuta?', 'Dauere ich länger als {n} Minuten?', 'Trajem li duže od {n} minuta?'],
    starts: ['Does my name start with {l}?', 'A më fillon emri me {l}?', 'Beginnt mein Name mit {l}?', 'Počinje li moje ime slovom {l}?'],
    range: ['Does my name start with a letter from {a} to {b}?', 'A më fillon emri me një shkronjë nga {a} deri në {b}?', 'Beginnt mein Name mit einem Buchstaben von {a} bis {b}?', 'Počinje li moje ime slovom od {a} do {b}?'],
    words: ['Does my name have more than one word?', 'A ka emri im më shumë se një fjalë?', 'Hat mein Name mehr als ein Wort?', 'Ima li moje ime više od jedne riječi?']
  };
  function fill(s, o) { return s.replace(/\{(\w)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  /** kindGroup: 'person' | 'work' | 'event' | 'place' - how dates are asked. */
  function render(p, lang, kindGroup) {
    var i = LI(lang);
    switch (p.t) {
      case 'tag': return L.TAGS[p.tag] ? L.TAGS[p.tag].q[i] : p.tag;
      case 'gender': return R[p.v === 'f' ? 'female' : 'male'][i];
      case 'alive': return R.alive[i];
      case 'fictional': return R.fictional[i];
      case 'country': return fill(R.country[i], { c: L.countryName(p.iso, lang) });
      case 'continent': return fill(R.continent[i], { c: L.continentName(p.code, lang) });
      case 'america': return R.america[i];
      case 'balkans': return R.balkans[i];
      case 'date': {
        var g = p.subj === 'born' || p.subj === 'died' ? p.subj : kindGroup === 'event' ? 'event' : kindGroup === 'place' ? 'place' : 'work';
        var key = g + '.' + (p.op === 'after' ? 'after' : 'before');
        return fill((R[key] || R['work.before'])[i], { y: year(p.a, lang) });
      }
      case 'num': return fill((R[p.dim] || R.population)[i], { n: fmtNum(p.v, lang) });
      case 'name':
        if (p.op === 'range') return fill(R.range[i], { a: p.a, b: p.b });
        if (p.op === 'starts') return fill(R.starts[i], { l: p.v });
        return R.words[i];
    }
    return '';
  }
  function kindGroup(e) {
    if (!e) return 'work';
    if (isPerson(e)) return 'person';
    var t = e.facts.tags || [];
    if (t.indexOf('band') !== -1) return 'place';
    if (['event', 'battle', 'war', 'treaty', 'revolution', 'empire', 'civilization'].some(function (k) { return t.indexOf(k) !== -1; })) return 'event';
    if (['city', 'country', 'university', 'museum', 'landmark', 'park'].some(function (k) { return t.indexOf(k) !== -1; })) return 'place';
    return 'work';
  }

  return { CODES: CODES, parse: parse, evaluate: evaluate, combine: combine, answer: answer, render: render, kindGroup: kindGroup,
    isPerson: isPerson, fmtNum: fmtNum, yearText: year };
});
