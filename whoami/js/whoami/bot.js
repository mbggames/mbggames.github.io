/*!
 * MBG Who Am I? - the computer player (section 15).
 *
 * As Answerer it answers typed questions from the facts of its hidden answer (questions.js).
 * As Guesser it never sees the hidden answer: it knows the category and a list of possible
 * answers (as a well-read player would), asks the question that splits what is still possible
 * best, keeps track of the answers and guesses when one candidate clearly leads.
 * Levels: Beginner knows less and asks worse questions; Expert knows everything and asks the best.
 */
(function (root, factory) {
  var q = function (n) { return typeof require === 'function' ? require(n) : null; };
  var M = root.MBG || {};
  var api = factory(M.WhoText || q('./text.js'), M.WhoQuestions || q('./questions.js'), M.WhoLex || q('./lexicon.js'));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoBot = api;
})(typeof self !== 'undefined' ? self : globalThis, function (X, Q, L) {
  'use strict';

  var LEVELS = {
    beginner:     { know: 0.55, top: 8, miss: 0.25, sure: 0.75, think: [2600, 4200], names: ['Beginner', 'Fillestar', 'Anfänger', 'Početnik'] },
    intermediate: { know: 0.75, top: 4, miss: 0.15, sure: 0.62, think: [2000, 3400], names: ['Intermediate', 'Mesatar', 'Mittel', 'Srednji'] },
    advanced:     { know: 0.9,  top: 2, miss: 0.08, sure: 0.55, think: [1500, 2800], names: ['Advanced', 'I avancuar', 'Fortgeschritten', 'Napredni'] },
    expert:       { know: 1,    top: 1, miss: 0.04, sure: 0.5,  think: [1200, 2200], names: ['Expert', 'Ekspert', 'Experte', 'Ekspert'] }
  };
  var LEVEL_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];

  /* ----------------------------------------------- possible questions --- */
  function nice(y) {
    var a = Math.abs(y), step = a > 1900 ? 10 : a > 1500 ? 50 : 100;
    return Math.round(y / step) * step;
  }
  function niceNum(v) {
    if (v <= 0) return 0;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var m = v / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function quantiles(vals, qs) {
    var s = vals.slice().sort(function (a, b) { return a - b; });
    return qs.map(function (q) { return s[Math.min(s.length - 1, Math.floor(q * s.length))]; });
  }
  /** Every question worth asking about this list of candidates. */
  function questionsFor(cands) {
    var es = cands.map(function (c) { return c.e; });
    var out = [], seen = {};
    function add(p) { var k = JSON.stringify(p); if (!seen[k]) { seen[k] = 1; out.push(p); } }
    var count = {};
    es.forEach(function (e) { (e.facts.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
    Object.keys(count).forEach(function (t) { if (L.TAGS[t] && count[t] < es.length) add({ t: 'tag', tag: t }); });
    var persons = es.filter(Q.isPerson);
    if (persons.length >= 2) {
      add({ t: 'gender', v: 'f' });
      add({ t: 'alive', v: true });
      var born = persons.map(function (e) { return e.facts.born; }).filter(function (y) { return y != null; });
      if (born.length >= 2) quantiles(born, [0.25, 0.5, 0.75]).forEach(function (y) { add({ t: 'date', subj: 'born', op: 'before', a: nice(y), b: nice(y) }); });
    }
    var others = es.filter(function (e) { return !Q.isPerson(e) && e.facts.start != null; });
    if (others.length >= 2) {
      quantiles(others.map(function (e) { return e.facts.start; }), [0.25, 0.5, 0.75]).forEach(function (y) { add({ t: 'date', subj: 'primary', op: 'before', a: nice(y), b: nice(y) }); });
    }
    var cc = {}, co = {};
    es.forEach(function (e) {
      (e.facts.countries || []).forEach(function (c) { if (L.BY_ISO[c]) cc[c] = (cc[c] || 0) + 1; });
      L.continentsOf(e.facts.countries).concat(e.facts.continents || []).forEach(function (c) { co[c] = (co[c] || 0) + 1; });
    });
    Object.keys(co).forEach(function (c) { if (L.CONTINENTS[c]) add({ t: 'continent', code: c }); });
    Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a]; }).slice(0, 10).forEach(function (c) { add({ t: 'country', iso: c }); });
    ['population', 'elevation', 'length', 'duration'].forEach(function (d) {
      var v = es.map(function (e) { return e.facts[d]; }).filter(function (x) { return x != null; });
      if (v.length >= 3) quantiles(v, [0.5]).forEach(function (m) { add({ t: 'num', dim: d, op: 'more', v: niceNum(m) }); });
    });
    // the first letter: "from A to M" - the cut that halves what is left
    var letters = es.map(function (e) { return X.norm(X.firstLetter(X.labelIn(e, 'en'))); }).filter(Boolean).sort();
    if (letters.length >= 3) {
      var mid = letters[Math.floor(letters.length / 2)];
      if (mid && mid !== 'a') add({ t: 'name', op: 'range', a: 'A', b: String.fromCharCode(mid.charCodeAt(0) - 1).toUpperCase() });
    }
    add({ t: 'name', op: 'words>', v: 1 });
    return out;
  }

  function entropy(p) { return p.reduce(function (s, x) { return x > 0 ? s - x * Math.log2(x) : s; }, 0); }

  /* ----------------------------------------------------------- guesser --- */
  /**
   * opts: pool (possible answers), lang, level, rng, mode.
   * next() → { type: 'ask', pred, text } | { type: 'guess', entity, text }
   * hear(pred, code) after each answer; wrong(entity) after a wrong guess.
   */
  function Guesser(opts) {
    var lv = LEVELS[opts.level] || LEVELS.intermediate;
    this.lv = lv;
    this.lang = opts.lang || 'en';
    this.rng = opts.rng || Math.random;
    var pool = X.shuffle(opts.pool || [], this.rng);
    var keep = Math.max(3, Math.round(pool.length * lv.know));
    this.cands = pool.slice(0, keep).map(function (e) { return { e: e, w: 1 }; });
    this.asked = [];
    this.wrongs = [];
  }
  var G = Guesser.prototype;
  G.alive = function () { return this.cands.filter(function (c) { return c.w > 0.001; }); };
  G.ranked = function () { return this.alive().sort(function (a, b) { return b.w - a.w; }); };
  G.share = function () {
    var a = this.ranked(), tot = a.reduce(function (s, c) { return s + c.w; }, 0);
    return a.length ? a[0].w / (tot || 1) : 0;
  };
  /** Decide: ask or guess. questionsLeft, secondsLeft from the match. */
  G.next = function (questionsLeft, secondsLeft) {
    var a = this.ranked();
    if (!a.length) return { type: 'guess', entity: null, text: '' };
    var share = this.share();
    var second = a[1] ? a[1].w : 0;
    var sure = share >= this.lv.sure && a[0].w >= 2 * second;
    if (a.length === 1 || sure || questionsLeft <= 0 || secondsLeft < 25) {
      return { type: 'guess', entity: a[0].e, text: X.labelIn(a[0].e, this.lang) };
    }
    var tot = a.reduce(function (s, c) { return s + c.w; }, 0);
    var self = this;
    var scored = questionsFor(a).filter(function (p) { return self.asked.indexOf(JSON.stringify(p)) === -1; }).map(function (p) {
      var w = { YES: 0, NO: 0, other: 0 };
      a.forEach(function (c) {
        var r = Q.evaluate(p, c.e, self.lang);
        if (r === 'YES') w.YES += c.w; else if (r === 'NO') w.NO += c.w; else w.other += c.w;
      });
      var h = entropy([w.YES / tot, w.NO / tot, w.other / tot]) - 0.6 * (w.other / tot);
      return { p: p, h: h };
    }).filter(function (s) { return s.h > 0.05; }).sort(function (x, y) { return y.h - x.h; });
    if (!scored.length) return { type: 'guess', entity: a[0].e, text: X.labelIn(a[0].e, this.lang) };
    var pick = scored[Math.floor(this.rng() * Math.min(this.lv.top, scored.length))];
    this.asked.push(JSON.stringify(pick.p));
    var group = Q.kindGroup(a[0].e);
    return { type: 'ask', pred: pick.p, text: Q.render(pick.p, this.lang, group) };
  };
  /** Learns from an answer. */
  G.hear = function (p, code) {
    if (code === 'BOTH' || code === 'UNKNOWN' || code === 'INVALID') return;
    var miss = this.lv.miss, self = this;
    this.cands.forEach(function (c) {
      var r = Q.evaluate(p, c.e, self.lang);
      if (r === code) return;
      c.w *= (r === 'BOTH' || r === 'UNKNOWN') ? 0.7 : miss;
    });
  };
  G.wrong = function (e) {
    this.cands.forEach(function (c) { if (e && c.e.id === e.id) c.w = 0; });
    this.wrongs.push(e);
  };

  /* ---------------------------------------------------------- answerer --- */
  /** The computer answers a typed question about its hidden answer. */
  function answer(text, entity, lang) { return Q.answer(text, entity, lang); }

  /** How long the computer "thinks" before it answers or asks (ms). */
  function thinkTime(level, rng) {
    var t = (LEVELS[level] || LEVELS.intermediate).think;
    return Math.round(t[0] + ((rng || Math.random)() * (t[1] - t[0])));
  }

  return { LEVELS: LEVELS, LEVEL_ORDER: LEVEL_ORDER, Guesser: Guesser, answer: answer, thinkTime: thinkTime, questionsFor: questionsFor };
});
