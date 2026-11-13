/*!
 * MBG Who Am I? - a short line of facts about a hidden answer, in the playing language:
 * "1879–1955 · Germany, Switzerland, United States · physicist, scientist, Nobel Prize".
 * Shown on the revealed card, to the Answerer (to help answer truthfully) and to judges.
 * Made from the facts themselves, so it exists in every language without translating texts.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  function yr(y, lang) { return MBG.WhoQuestions.yearText(y, lang); }
  function line(e, lang) {
    if (!e || !e.facts) return '';
    var f = e.facts, L = MBG.WhoLex, T = MBG.Text, out = [];
    var now = new Date().getFullYear();
    if (e.kind === 'person' && f.born != null) out.push(yr(f.born, lang) + (f.died != null ? '–' + yr(f.died, lang) : ' – ' + T.t(lang, 'facts.alive')));
    else if (f.start != null) out.push(f.end != null && f.end !== f.start ? yr(f.start, lang) + '–' + (f.end >= now ? T.t(lang, 'facts.today') : yr(f.end, lang)) : yr(f.start, lang));
    var cs = (f.countries || []).filter(function (c) { return L.BY_ISO[c]; }).slice(0, 3).map(function (c) { return L.countryName(c, lang); });
    if (cs.length) out.push(cs.join(', '));
    else if ((f.continents || []).length) out.push(f.continents.slice(0, 3).map(function (c) { return L.continentName(c, lang); }).join(', '));
    var skip = ['person', 'place', 'art', 'game', 'series_part', 'based_on_book'];
    var tags = (f.tags || []).filter(function (tg) { return skip.indexOf(tg) === -1; }).slice(0, 4).map(function (tg) { return T.t(lang, 'tag.' + tg); });
    if (tags.length) out.push(tags.join(', '));
    var fmt = function (n) { return MBG.WhoQuestions.fmtNum(n, lang); };
    if (f.population) out.push(T.t(lang, 'facts.pop', { n: f.population >= 1e6 ? (Math.round(f.population / 1e5) / 10).toString().replace('.', lang === 'en' ? '.' : ',') + ' ' + T.t(lang, 'facts.mio') : fmt(f.population) }));
    if (f.elevation) out.push(fmt(f.elevation) + ' m');
    if (f.length) out.push(fmt(f.length) + ' km');
    if (f.duration) out.push(f.duration + ' min');
    var ppl = f.people || {};
    var who = (ppl.creators || []).concat(ppl.members || []).slice(0, 2);
    if (who.length) out.push(who.join(', '));
    return out.join(' · ');
  }
  MBG.WhoFacts = { line: line };
})(typeof self !== 'undefined' ? self : globalThis);
