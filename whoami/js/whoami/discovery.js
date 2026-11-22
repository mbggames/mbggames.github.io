/*!
 * MBG Who Am I? - finding the hidden answers live on the internet (FR-011 - FR-016).
 *
 * 1. Search: once the playing language and the categories are agreed, Wikidata (free, open data
 *    from the Wikimedia Foundation, CC0) is asked for items of those categories, filters and fame.
 * 2. Verify (FR-012): the facts of the candidates are read - class, dates, countries, professions,
 *    genres, people - and candidates without the facts the category needs are dropped.
 * 3. Names (FR-009, FR-015): the name in the playing language as Wikidata has it, plus the names in
 *    the other languages and the known aliases (all accepted as final guesses, FR-010). Without a
 *    name in the playing language the original / English name is used - nothing is translated.
 * 4. Random choice (FR-013): the two answers of a match are drawn at random from the verified
 *    candidates of the same difficulty, never the first result, and not one played recently.
 * Nothing is stored for good (FR-016): a short-lived cache keeps the candidates of a search for a
 * day, so a second match in the same category starts at once.
 * If the search fails, the built-in cards (deck.js) are used instead, and the game says so.
 *
 * Works in the browser (MBG.WhoDiscovery) and in the server (fetch with a User-Agent).
 */
(function (root, factory) {
  // literal require() calls, so a bundler (esbuild, for the server) finds the files
  var M = root.MBG || {}, R = typeof require === 'function';
  var api = factory(M.WhoText || (R ? require('./text.js') : null), M.WhoLex || (R ? require('./lexicon.js') : null),
    M.WhoCats || (R ? require('./categories.js') : null), M.WhoDeck || (R ? require('./deck.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoDiscovery = api;
})(typeof self !== 'undefined' ? self : globalThis, function (X, L, C, D) {
  'use strict';
  var SPARQL = 'https://query.wikidata.org/sparql';
  var API = 'https://www.wikidata.org/w/api.php';
  var LANGS = ['en', 'sq', 'de', 'bs'];
  var TIMEOUT = 14000;

  /* -------------------------------------------- Wikidata ids → tags --- */
  var OCC = { Q33999: 'actor', Q10800557: 'actor', Q10798782: 'actor', Q2405480: 'actor', Q2526255: 'director', Q3455803: 'director', Q28389: 'screenwriter',
    Q245068: 'comedian', Q177220: 'singer', Q488205: 'singer musician', Q639669: 'musician', Q36834: 'composer musician', Q486748: 'musician', Q855091: 'musician',
    Q36180: 'writer', Q6625963: 'writer', Q49757: 'poet writer', Q214917: 'writer', Q4853732: 'writer', Q1028181: 'painter artist', Q1281618: 'sculptor artist',
    Q483501: 'artist', Q901: 'scientist', Q169470: 'physicist scientist', Q593644: 'chemist scientist', Q170790: 'mathematician scientist',
    Q864503: 'biologist scientist', Q11063: 'astronomer scientist', Q205375: 'inventor', Q4964182: 'philosopher', Q82955: 'politician', Q372436: 'politician',
    Q116: 'ruler', Q12097: 'ruler', Q2304859: 'ruler', Q11900058: 'explorer', Q11631: 'explorer', Q937857: 'athlete football', Q3665646: 'athlete basketball',
    Q10833314: 'athlete tennis', Q11513337: 'athlete athletics', Q2066131: 'athlete', Q10873124: 'athlete chess' };
  var GENRE = { Q130232: 'drama', Q157443: 'comedy', Q200092: 'horror', Q188473: 'action', Q2484376: 'thriller', Q471839: 'scifi', Q1054574: 'romance',
    Q157394: 'fantasy', Q17013749: 'historical', Q202866: 'animation', Q581714: 'animation', Q93204: 'documentary', Q959790: 'crime', Q842256: 'musical',
    Q319221: 'adventure', Q369747: 'war', Q170238: 'sitcom comedy', Q132311: 'fantasy', Q24925: 'scifi', Q484154: 'crime', Q208505: 'crime',
    Q1196408: 'historical', Q23916: 'adventure', Q2995278: 'adventure', Q1814102: 'fantasy', Q3238422: 'scifi' };
  var CLS = { Q5: 'person', Q215380: 'band', Q5741069: 'band', Q11424: 'film', Q202866: 'film animation', Q93204: 'film documentary', Q5398426: 'tv',
    Q1259759: 'tv', Q7725634: 'book', Q8261: 'book', Q571: 'book', Q5185279: 'book poem', Q3305213: 'art painting', Q860861: 'art sculpture',
    Q179700: 'art sculpture', Q7889: 'game videogame', Q131436: 'game boardgame', Q7366: 'song', Q134556: 'song', Q482994: 'album', Q2188189: 'song',
    Q105543609: 'song', Q349: 'sport', Q31629: 'sport', Q18608583: 'competition', Q500834: 'competition', Q6256: 'place country', Q3624078: 'place country',
    Q515: 'place city', Q1549591: 'place city', Q5119: 'place city capital', Q4022: 'place river', Q23397: 'place lake', Q23442: 'place island',
    Q8502: 'place mountain', Q207326: 'place mountain', Q46169: 'place park', Q12518: 'place landmark', Q4989906: 'place landmark', Q12280: 'place landmark',
    Q3918: 'place university', Q902104: 'place university', Q31855: 'place university', Q33506: 'place museum', Q207694: 'place museum',
    Q178561: 'event battle war', Q198: 'event war', Q131569: 'event treaty', Q625298: 'event treaty', Q48349: 'empire', Q8432: 'civilization',
    Q28171280: 'civilization', Q10931: 'event revolution' };
  var PRIZE = { Q7191: 'nobel', Q19020: 'oscar', Q41254: 'grammy' };
  var CONT = { Q46: 'EU', Q48: 'AS', Q15: 'AF', Q49: 'NA', Q18: 'SA', Q55643: 'OC', Q3960: 'OC', Q538: 'OC', Q51: 'AN' };
  var GENDER = { Q6581097: 'm', Q6581072: 'f', Q2449503: 'm', Q1052281: 'f' };
  var PROPS = 'P31 P21 P569 P570 P27 P106 P166 P577 P571 P580 P582 P585 P495 P17 P30 P136 P57 P50 P170 P86 P175 P527 P178 P2047 P1082 P2044 P2043 P1376 P179 P144 P1476';

  function qidOf(uri) { var m = /Q\d+$/.exec(String(uri || '')); return m ? m[0] : null; }
  function yearOf(v) { var m = /^([+-]?)(\d{1,6})-/.exec(String(v || '')); return m ? (m[1] === '-' ? -Number(m[2]) : Number(m[2])) : null; }

  /* ------------------------------------------------------------ query --- */
  function values(name, ids) { return 'VALUES ?' + name + ' { ' + ids.map(function (q) { return 'wd:' + q; }).join(' ') + ' }'; }
  /** The SPARQL of one subcategory with the filters - candidates with their fame (sitelinks). */
  function buildQuery(wd, o) {
    var prof = wd.prof, lines = [];
    if (prof === 'person') {
      lines.push('?item wdt:P31 wd:Q5 .');
      if (wd.occ) lines.push(values('occ', wd.occ), '?item wdt:P106 ?occ .');
    } else if (wd.cls) lines.push(values('cls', wd.cls), '?item wdt:P31 ?cls .');
    if (wd.genre) lines.push(values('genre', wd.genre), '?item wdt:P136 ?genre .');
    if (wd.extra) lines.push(wd.extra);
    var min = Math.max(6, Math.round(C.LEVELS.expert.min * (C.FAME_FACTOR[prof] || 1)));
    lines.push('?item wikibase:sitelinks ?sl . FILTER(?sl >= ' + min + ')');
    var p = o.period && o.period !== 'any' ? C.PERIODS.filter(function (x) { return x.id === o.period; })[0] : null;
    if (p) {
      if (prof === 'person') lines.push('?item wdt:P569 ?bd . FILTER(YEAR(?bd) >= ' + (p.a - 60) + ' && YEAR(?bd) <= ' + (p.b - 20) + ')');
      else if (prof === 'event') lines.push('?item wdt:P585|wdt:P580|wdt:P571 ?ed . FILTER(YEAR(?ed) >= ' + p.a + ' && YEAR(?ed) <= ' + p.b + ')');
      else if (prof !== 'place') lines.push('?item wdt:P577|wdt:P571 ?wdt0 . FILTER(YEAR(?wdt0) >= ' + p.a + ' && YEAR(?wdt0) <= ' + p.b + ')');
    }
    var r = o.region && o.region !== 'any' ? C.REGIONS.filter(function (x) { return x.id === o.region; })[0] : null;
    if (r) {
      var cp = prof === 'person' ? 'wdt:P27' : prof === 'work' || prof === 'band' ? 'wdt:P495' : 'wdt:P17';
      if (r.cont) lines.push('?item ' + cp + ' ?ctry . ?ctry wdt:P30 wd:' + r.qid + ' .');
      else {
        var qs = (r.codes || []).map(function (c) { return L.BY_ISO[c] && L.BY_ISO[c].qid; }).filter(Boolean);
        lines.push(values('ctry', qs), '?item ' + cp + ' ?ctry .');
      }
    }
    lines.push('FILTER NOT EXISTS { ?item wdt:P106 wd:Q488111 }', 'FILTER NOT EXISTS { ?item wdt:P136 wd:Q185529 }');
    return 'SELECT DISTINCT ?item ?sl WHERE {\n  ' + lines.join('\n  ') + '\n} ORDER BY DESC(?sl) LIMIT 300';
  }
  function factsQuery(ids) {
    return 'SELECT ?item ?p ?v ?iso ?cont ?sup WHERE {\n  ' + values('item', ids) + '\n  VALUES ?p { ' + PROPS.split(' ').map(function (p) { return 'wdt:' + p; }).join(' ') + ' }\n' +
      '  ?item ?p ?v .\n  OPTIONAL { ?v wdt:P297 ?iso }\n  OPTIONAL { ?v wdt:P30 ?cont }\n  OPTIONAL { ?v wdt:P279 ?sup }\n}';
  }

  /* ----------------------------------------------------------- network --- */
  function withTimeout(fetchFn, url, init, ms) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, ms || TIMEOUT) : null;
    if (ctl) init.signal = ctl.signal;
    return fetchFn(url, init).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }, function (e) { if (t) clearTimeout(t); throw e; });
  }
  function sparql(fetchFn, query, ua, ms) {
    var h = { Accept: 'application/sparql-results+json' };
    if (ua) h['User-Agent'] = ua;
    return withTimeout(fetchFn, SPARQL + '?format=json&query=' + encodeURIComponent(query), { headers: h }, ms).then(function (j) { return j.results.bindings; });
  }
  function terms(fetchFn, ids, ua, ms) {
    var url = API + '?action=wbgetentities&format=json&origin=*&props=labels|aliases|descriptions|sitelinks&languages=' + LANGS.join('|') +
      '&sitefilter=enwiki|sqwiki|dewiki|bswiki&ids=' + ids.join('|');
    var h = {};
    if (ua) h['Api-User-Agent'] = ua;
    return withTimeout(fetchFn, url, { headers: h }, ms).then(function (j) { return j.entities || {}; });
  }

  /* ------------------------------------------------------- facts → card --- */
  function toEntity(qid, rows, t, cat, sub, prof, sl) {
    var f = { tags: [], gender: null, born: null, died: null, alive: null, start: null, end: null, countries: [], both: [], continents: [],
      population: null, elevation: null, length: null, duration: null, people: { creators: [], cast: [], members: [], related: [] },
      peopleComplete: false, bothTags: [], fictional: false, occKnown: false, genreKnown: false };
    var tags = {}, starts = [], ends = [];
    function tag(s) { String(s).split(' ').forEach(function (x) { if (x) tags[x] = 1; }); }
    var people = {};          // QIDs of people → role; their names come from the item labels below
    rows.forEach(function (r) {
      var p = qidOf(r.p.value) ? null : r.p.value.split('/').pop();
      var v = r.v, vq = v.type === 'uri' ? qidOf(v.value) : null;
      switch (p) {
        case 'P31': if (vq && CLS[vq]) tag(CLS[vq]); break;
        case 'P21': if (vq && GENDER[vq]) f.gender = GENDER[vq]; break;
        case 'P569': f.born = yearOf(v.value); break;
        case 'P570': f.died = yearOf(v.value); break;
        case 'P106': if (vq) { f.occKnown = true; if (OCC[vq]) tag(OCC[vq]); } break;
        case 'P136': if (vq) { f.genreKnown = true; if (GENRE[vq]) tag(GENRE[vq]); } break;
        case 'P166': { var sup = r.sup && qidOf(r.sup.value); if (sup && PRIZE[sup]) tag(PRIZE[sup]); if (vq && PRIZE[vq]) tag(PRIZE[vq]); break; }
        case 'P27': case 'P17': case 'P495': {
          var iso = r.iso ? r.iso.value : (vq && L.BY_QID[vq]);
          if (iso && f.countries.indexOf(iso) === -1) f.countries.push(iso);
          if (r.cont) { var c0 = CONT[qidOf(r.cont.value)]; if (c0 && f.continents.indexOf(c0) === -1) f.continents.push(c0); }
          break;
        }
        case 'P30': { var c1 = CONT[vq]; if (c1 && f.continents.indexOf(c1) === -1) f.continents.push(c1); break; }
        case 'P577': case 'P571': case 'P580': case 'P585': { var y = yearOf(v.value); if (y != null) starts.push(y); break; }
        case 'P582': { var y2 = yearOf(v.value); if (y2 != null) ends.push(y2); break; }
        case 'P57': case 'P50': case 'P170': case 'P86': case 'P175': case 'P178': if (vq) people[vq] = 'creators'; break;
        case 'P527': if (vq) people[vq] = 'members'; break;
        case 'P2047': f.duration = Math.round(Number(v.value)); break;
        case 'P1082': f.population = Math.max(f.population || 0, Number(v.value)); break;
        case 'P2044': f.elevation = Math.max(f.elevation || 0, Math.round(Number(v.value))); break;
        case 'P2043': f.length = Math.max(f.length || 0, Math.round(Number(v.value))); break;
        case 'P1376': tag('capital'); break;
        case 'P179': tag('series_part'); break;
        case 'P144': tag('based_on_book'); break;
      }
    });
    if (prof === 'person') { tag('person'); f.alive = f.died == null && f.born != null && f.born > 1910; }
    if (prof === 'place') tag('place');
    if (prof === 'band') tag('band');
    if (starts.length) { f.start = Math.min.apply(null, starts); f.end = ends.length ? Math.max.apply(null, ends) : f.start; }
    f.tags = Object.keys(tags);
    var label = {};
    var tt = t || {};
    LANGS.forEach(function (l) { if (tt.labels && tt.labels[l]) label[l] = tt.labels[l].value; });
    var orig = rows.filter(function (r) { return r.p.value.split('/').pop() === 'P1476'; })[0];
    if (orig) label.orig = orig.v.value;
    var aliases = [];
    LANGS.forEach(function (l) { ((tt.aliases || {})[l] || []).forEach(function (a) { aliases.push(a.value); }); });
    var desc = {};
    LANGS.forEach(function (l) { if (tt.descriptions && tt.descriptions[l]) desc[l] = tt.descriptions[l].value; });
    var wiki = {};
    ['en', 'sq', 'de', 'bs'].forEach(function (l) { var s = tt.sitelinks && tt.sitelinks[l + 'wiki']; if (s) wiki[l] = s.title; });
    var kind = prof === 'person' ? 'person' : prof === 'band' ? 'band' : prof === 'place' ? 'place' : prof === 'event' ? 'event' : 'work';
    return { id: 'wd:' + qid, qid: qid, cat: cat, subs: [sub], level: levelOf(sl, prof), sl: sl, kind: kind, label: label, aliases: aliases,
      desc: desc, wiki: wiki, facts: f, source: 'wikidata', _people: people };
  }
  function levelOf(sl, prof) {
    var k = C.FAME_FACTOR[prof] || 1;
    for (var i = 0; i < C.LEVEL_ORDER.length; i++) { var L1 = C.LEVELS[C.LEVEL_ORDER[i]]; if (sl >= L1.min * k) return L1.n; }
    return 4;
  }
  /** FR-012: does a candidate have the facts its category needs? */
  function verified(e, prof) {
    var f = e.facts;
    if (!e.label.en && !e.label.sq && !e.label.de && !e.label.bs) return false;
    if (prof === 'person') return f.born != null && f.tags.indexOf('person') !== -1;
    if (prof === 'place') return f.countries.length > 0 || f.continents.length > 0;
    if (prof === 'event') return f.start != null;
    return f.start != null;
  }

  /* -------------------------------------------------------- exclusions --- */
  function excluded(e) {
    var X0 = C.EXCLUDE;
    if (e.qid && X0.qids.indexOf(e.qid) !== -1) return true;
    var names = Object.keys(e.label).map(function (k) { return e.label[k]; }).join(' ');
    if (X0.words.test(names)) return true;
    var cs = e.facts.countries || [];
    // Serbia, as in the word game: not when it is only one of several countries (the Danube, the Drina)
    if (cs.length && cs.length <= 2 && cs.some(function (c) { return X0.countries.indexOf(c) !== -1; })) return true;
    return false;
  }

  /* ------------------------------------------------------- the cards --- */
  function periodOk(e, p) {
    if (!p || p.id === 'any') return true;
    var f = e.facts;
    if (e.kind === 'person') {
      if (f.born == null) return false;
      var from = f.born + 20, to = f.died != null ? Math.min(f.died, f.born + 60) : f.born + 60;
      return from <= p.b && to >= p.a;
    }
    if (f.start == null) return e.kind === 'place';
    return f.start <= p.b && (f.end != null ? f.end : f.start) >= p.a;
  }
  function regionOk(e, r) {
    if (!r || r.id === 'any') return true;
    var cs = (e.facts.countries || []).concat(e.facts.both || []);
    if (r.cont) return L.continentsOf(e.facts.countries).concat(e.facts.continents || []).indexOf(r.cont) !== -1;
    return cs.some(function (c) { return r.codes.indexOf(c) !== -1; });
  }
  /** Built-in cards for a category, subcategories and filters. */
  function deckPool(o) {
    var p = C.PERIODS.filter(function (x) { return x.id === o.period; })[0];
    var r = C.REGIONS.filter(function (x) { return x.id === o.region; })[0];
    var subs = o.subs && o.subs.length ? o.subs : null;
    return D.CARDS.filter(function (e) {
      if (o.cat ? e.cat !== o.cat : C.modeOf(e.cat) !== o.mode) return false;
      if (subs && !e.subs.some(function (s) { return subs.indexOf(s) !== -1; })) return false;
      return periodOk(e, p) && regionOk(e, r) && !excluded(e);
    });
  }

  /* ------------------------------------------------------------ cache --- */
  var memo = {};
  function cacheGet(store, key) {
    if (memo[key] && memo[key].t > Date.now() - 864e5) return memo[key].v;
    if (!store) return null;
    try { var o = JSON.parse(store.getItem('MBG.Who.cache.' + key) || 'null'); if (o && o.t > Date.now() - 864e5) return o.v; } catch (e) { /* ignore */ }
    return null;
  }
  function cachePut(store, key, v) {
    memo[key] = { t: Date.now(), v: v };
    if (!store) return;
    try { store.setItem('MBG.Who.cache.' + key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {
      try { Object.keys(store).forEach(function (k) { if (k.indexOf('MBG.Who.cache.') === 0) store.removeItem(k); }); } catch (e2) { /* ignore */ }
    }
  }

  /** Live search of one subcategory: verified cards (cached for a day). */
  function online(o, sub) {
    var spec = C.sub(o.cat, sub);
    if (!spec || !spec.wd) return Promise.resolve([]);
    var wd = spec.wd, prof = wd.prof;
    var key = [o.cat, sub, o.period || 'any', o.region || 'any'].join('.');
    var hit = cacheGet(o.store, key);
    if (hit) return Promise.resolve(hit);
    var F = o.fetch || (typeof fetch === 'function' ? fetch.bind(typeof self !== 'undefined' ? self : globalThis) : null);
    if (!F) return Promise.reject(new Error('no fetch'));
    return sparql(F, buildQuery(wd, o), o.ua).then(function (rows) {
      var seen = {}, cands = [];
      rows.forEach(function (r) { var id = qidOf(r.item.value); if (id && !seen[id]) { seen[id] = 1; cands.push({ id: id, sl: Number(r.sl.value) }); } });
      // a good spread: the best known first, then a random sample of the rest - up to 80
      var top = cands.slice(0, 30), rest = X.shuffle(cands.slice(30)).slice(0, 50);
      var pick = top.concat(rest);
      if (!pick.length) return [];
      var ids = pick.map(function (c) { return c.id; });
      var chunks = [];
      for (var i = 0; i < ids.length; i += 40) chunks.push(ids.slice(i, i + 40));
      return Promise.all(chunks.map(function (ch) {
        return Promise.all([sparql(F, factsQuery(ch), o.ua), terms(F, ch, o.ua)]);
      })).then(function (parts) {
        var byItem = {}, T = {};
        parts.forEach(function (pt) {
          pt[0].forEach(function (r) { var id = qidOf(r.item.value); (byItem[id] = byItem[id] || []).push(r); });
          Object.keys(pt[1]).forEach(function (k) { T[k] = pt[1][k]; });
        });
        var all = pick.map(function (c) { return toEntity(c.id, byItem[c.id] || [], T[c.id], o.cat, sub, prof, c.sl); });
        // names of the people (directors, authors, members) - they are items too
        var pq = {};
        all.forEach(function (e) { Object.keys(e._people).forEach(function (q) { pq[q] = 1; }); });
        var pids = Object.keys(pq).slice(0, 150);
        var pchunks = [];
        for (var j = 0; j < pids.length; j += 50) pchunks.push(pids.slice(j, j + 50));
        return Promise.all(pchunks.map(function (ch) { return terms(F, ch, o.ua).catch(function () { return {}; }); })).then(function (pp) {
          var names = {};
          pp.forEach(function (m) { Object.keys(m).forEach(function (q) { var lb = m[q].labels || {}; names[q] = (lb.en || lb.de || lb.sq || lb.bs || {}).value; }); });
          all.forEach(function (e) {
            Object.keys(e._people).forEach(function (q) { if (names[q]) e.facts.people[e._people[q]].push(names[q]); });
            e.facts.peopleComplete = e.facts.people.creators.length > 0 || e.facts.people.members.length > 0;
            delete e._people;
          });
          var good = all.filter(function (e) { return verified(e, prof) && !excluded(e); });
          cachePut(o.store, key, good);
          return good;
        });
      });
    });
  }

  /**
   * Finds the answers of a match.
   * o: { lang, mode, cat, subs[], level, period, region, count (2), recent[] (ids), online (true), fetch, ua, store }
   * → Promise { answers, pool, source: 'wikidata' | 'deck' | 'mixed', widened, failed }
   */
  function find(o) {
    o = o || {};
    var count = o.count || 2;
    var levelN = (C.LEVELS[o.level] || C.LEVELS.standard).n;
    var cats = o.cat ? [o.cat] : C.catsOf(o.mode || 'who');
    var cat = o.cat || X.pick(cats);
    var subs = (o.subs && o.subs.length ? o.subs : Object.keys(C.CATS[cat].subs));
    var oo = {}; for (var k in o) oo[k] = o[k];
    oo.cat = cat;
    var live = o.online !== false ? Promise.all(subs.map(function (s) { return online(oo, s).catch(function () { return null; }); })) : Promise.resolve([]);
    return live.then(function (lists) {
      var failed = lists.some(function (x) { return x === null; });
      var web = [].concat.apply([], (lists || []).filter(Boolean));
      var deck = deckPool({ mode: o.mode, cat: cat, subs: subs, period: o.period, region: o.region });
      // one pool without doubles (a built-in card is left out when the same name came from the web)
      var names = {};
      web.forEach(function (e) { names[X.norm(X.labelIn(e, 'en'))] = 1; });
      var pool = web.concat(deck.filter(function (e) { return !names[X.norm(X.labelIn(e, 'en'))]; }));
      var recent = o.recent || [];
      function band(n, list) { return list.filter(function (e) { return e.level === n && recent.indexOf(e.id) === -1; }); }
      var chosen = band(levelN, pool), widened = false;
      for (var d = 1; chosen.length < count && d <= 3; d++) {
        widened = true;
        chosen = chosen.concat(band(levelN - d, pool), band(levelN + d, pool));
      }
      if (chosen.length < count) { widened = true; chosen = pool.filter(function (e) { return recent.indexOf(e.id) === -1; }); }
      if (chosen.length < count) chosen = pool.slice();
      var answers = X.shuffle(chosen).slice(0, count);
      var source = web.length && deck.length ? 'mixed' : web.length ? 'wikidata' : 'deck';
      if (answers.length && answers.every(function (e) { return e.source === 'deck'; }) && web.length === 0) source = 'deck';
      return { answers: answers, pool: pool, cat: cat, source: source, widened: widened, failed: failed && !web.length, enough: pool.length >= count };
    });
  }

  /* --------------------------------------------- the Answerer's own card (1.1.0) --- */
  // Between people the Answerer may choose the card: a name typed in (with suggestions). The computer
  // has to be able to check the answers, so the name must become a Wikidata item with its facts (or a
  // built-in card) that fits the question word and one of its categories.
  function fetchOf(o) { return o.fetch || (typeof fetch === 'function' ? fetch.bind(typeof self !== 'undefined' ? self : globalThis) : null); }
  /** Suggestions while typing: the built-in cards first, then Wikidata's own search. → [{ qid | deck, label, desc }] */
  function suggest(o) {
    var text = String(o.text || '').trim(), lang = LANGS.indexOf(o.lang) !== -1 ? o.lang : 'en';
    if (text.length < 2) return Promise.resolve([]);
    var n = X.norm(text);
    var local = D.CARDS.filter(function (e) { return C.modeOf(e.cat) === o.mode && !excluded(e) && LANGS.some(function (l) { var w = e.label[l] ? X.norm(e.label[l]) : ''; return w && (w.indexOf(n) === 0 || w.indexOf(' ' + n) !== -1); }); })
      .slice(0, 4).map(function (e) { return { deck: e.id, label: X.labelIn(e, lang), desc: C.CATS[e.cat] ? C.name(C.CATS[e.cat], lang) : '' }; });
    var F = fetchOf(o);
    if (!F || o.online === false) return Promise.resolve(local);
    var url = API + '?action=wbsearchentities&format=json&origin=*&type=item&limit=' + (o.limit || 7) + '&language=' + lang + '&uselang=' + lang + '&search=' + encodeURIComponent(text);
    var h = {};
    if (o.ua) h['Api-User-Agent'] = o.ua;
    return withTimeout(F, url, { headers: h }).then(function (j) {
      var seen = {};
      local.forEach(function (x) { seen[X.norm(x.label)] = 1; });
      return local.concat((j.search || []).filter(function (x) { return !seen[X.norm(x.label || '')]; }).map(function (x) {
        return { qid: x.id, label: x.label || x.id, desc: x.description || '' };
      }));
    }, function () { return local; });
  }
  /** The category of an item: the first subcategory of the question word whose occupations or classes it has. */
  function placeOf(mode, occ, cls) {
    var cats = C.catsOf(mode);
    for (var i = 0; i < cats.length; i++) {
      var subs = C.CATS[cats[i]].subs;
      for (var k in subs) {
        var wd = subs[k].wd;
        if (!wd) continue;
        if (wd.prof === 'person' && wd.occ && wd.occ.some(function (q) { return occ.indexOf(q) !== -1; }) && cls.indexOf('Q5') !== -1) return { cat: cats[i], sub: k, prof: 'person' };
        if (wd.prof !== 'person' && wd.cls && wd.cls.some(function (q) { return cls.indexOf(q) !== -1; })) return { cat: cats[i], sub: k, prof: wd.prof };
      }
    }
    // any person for "Who am I?" (a person the categories do not list: the first category, the facts decide)
    if (mode === 'who' && cls.indexOf('Q5') !== -1) {
      for (var j = 0; j < cats.length; j++) for (var k2 in C.CATS[cats[j]].subs) { var w2 = C.CATS[cats[j]].subs[k2].wd; if (w2 && w2.prof === 'person') return { cat: cats[j], sub: k2, prof: 'person' }; }
    }
    return null;
  }
  /**
   * One card for the Answerer's choice: { qid } (Wikidata) or { deck } (built-in), checked like every
   * card of the game. → Promise of the card; rejects with 'card' when the computer cannot check it.
   */
  function lookup(o) {
    if (o.deck) {
      var c = D.CARDS.filter(function (e) { return e.id === o.deck && C.modeOf(e.cat) === o.mode && !excluded(e); })[0];
      return c ? Promise.resolve(c) : Promise.reject(new Error('card'));
    }
    var qid = /^Q\d{1,12}$/.test(String(o.qid || '')) ? o.qid : null, F = fetchOf(o), ms = o.timeout || 0;
    if (!qid) return Promise.reject(new Error('card'));
    if (!F) return Promise.reject(new Error('net'));
    // 1.1.6: Wikidata not reached (no network, too slow, refused) is 'net' - not the same as 'card' (the
    // computer read the facts and cannot use this card). The caller may then try again, or trust the other side.
    return Promise.all([sparql(F, factsQuery([qid]), o.ua, ms), terms(F, [qid], o.ua, ms),
      sparql(F, 'SELECT ?sl WHERE { wd:' + qid + ' wikibase:sitelinks ?sl }', o.ua, ms).catch(function () { return null; })]).then(function (pt) { return pt; }, function () { throw new Error('net'); }).then(function (pt) {
      var rows = pt[0], t = pt[1][qid], sl = pt[2] && pt[2][0] ? Number(pt[2][0].sl.value) : t && t.sitelinks ? Object.keys(t.sitelinks).length * 10 : 0;
      var occ = [], cls = [];
      rows.forEach(function (r) {
        var p = r.p.value.split('/').pop(), v = r.v.type === 'uri' ? qidOf(r.v.value) : null;
        if (v && p === 'P106') occ.push(v);
        if (v && p === 'P31') cls.push(v);
      });
      var at = placeOf(o.mode, occ, cls);
      if (!at) throw new Error('card');
      var e = toEntity(qid, rows, t, at.cat, at.sub, at.prof, sl);
      var pids = Object.keys(e._people).slice(0, 50);
      return (pids.length ? terms(F, pids, o.ua, ms).catch(function () { return {}; }) : Promise.resolve({})).then(function (m) {
        Object.keys(e._people).forEach(function (q) { var lb = (m[q] && m[q].labels) || {}, nm = (lb.en || lb.de || lb.sq || lb.bs || {}).value; if (nm) e.facts.people[e._people[q]].push(nm); });
        e.facts.peopleComplete = e.facts.people.creators.length > 0 || e.facts.people.members.length > 0;
        delete e._people;
        if (!verified(e, at.prof) || excluded(e)) throw new Error('card');
        e.chosen = true;
        return e;
      });
    });
  }

  /**
   * 1.1.6 - a card that another device looked up (the Answerer's phone), for a referee that cannot reach
   * Wikidata itself right now: only the known fields are taken, with their types and sizes, and the card must
   * pass the same checks as every card (the facts its kind needs, the exclusions). → the card, or null.
   */
  function cleanCard(c, mode) {
    try {
      if (!c || typeof c !== 'object' || !/^Q\d{1,12}$/.test(String(c.qid || ''))) return null;
      if (JSON.stringify(c).length > 24000) return null;
      var str = function (v, n) { return typeof v === 'string' ? v.slice(0, n) : null; };
      var num = function (v) { return typeof v === 'number' && isFinite(v) ? v : null; };
      var list = function (v, n, len) { return (Array.isArray(v) ? v : []).filter(function (x) { return typeof x === 'string'; }).slice(0, n).map(function (x) { return x.slice(0, len); }); };
      var map = function (v, keys, n) { var out = {}; keys.forEach(function (k) { var x = v && str(v[k], n); if (x) out[k] = x; }); return out; };
      var cat = String(c.cat || ''), sub = String((c.subs || [])[0] || '');
      if (!C.CATS[cat] || C.modeOf(cat) !== mode || !C.sub(cat, sub)) return null;
      var prof = (C.sub(cat, sub).wd || {}).prof;
      if (!prof) return null;
      var f0 = c.facts || {}, p0 = f0.people || {};
      var f = { tags: list(f0.tags, 40, 24), gender: f0.gender === 'm' || f0.gender === 'f' ? f0.gender : null, born: num(f0.born), died: num(f0.died), alive: f0.alive === true ? true : f0.alive === false ? false : null,
        start: num(f0.start), end: num(f0.end), countries: list(f0.countries, 12, 3), both: list(f0.both, 12, 3), continents: list(f0.continents, 7, 2),
        population: num(f0.population), elevation: num(f0.elevation), length: num(f0.length), duration: num(f0.duration),
        people: { creators: list(p0.creators, 20, 80), cast: list(p0.cast, 20, 80), members: list(p0.members, 20, 80), related: list(p0.related, 20, 80) },
        peopleComplete: !!f0.peopleComplete, bothTags: list(f0.bothTags, 20, 24), fictional: !!f0.fictional, occKnown: !!f0.occKnown, genreKnown: !!f0.genreKnown };
      var kind = prof === 'person' ? 'person' : prof === 'band' ? 'band' : prof === 'place' ? 'place' : prof === 'event' ? 'event' : 'work';
      var sl = Math.max(0, Math.min(400, num(c.sl) || 0));
      var e = { id: 'wd:' + c.qid, qid: c.qid, cat: cat, subs: [sub], level: levelOf(sl, prof), sl: sl, kind: kind, label: map(c.label, LANGS.concat(['orig']), 120),
        aliases: list(c.aliases, 40, 120), desc: map(c.desc, LANGS, 240), wiki: map(c.wiki, LANGS, 200), facts: f, source: 'wikidata', chosen: true, byPhone: true };
      if (!verified(e, prof) || excluded(e)) return null;
      return e;
    } catch (x) { return null; }
  }
  /** Can Wikidata be reached from here? (the server's health page) → { sparql: 'ok 320 ms' | 'failed: …', api: … } */
  function probe(o) {
    var F = fetchOf(o || {}), ms = (o && o.timeout) || 6000;
    function one(p) { var t0 = Date.now(); return p.then(function () { return 'ok ' + (Date.now() - t0) + ' ms'; }, function (e) { return 'failed: ' + String(e && e.message || e).slice(0, 60); }); }
    if (!F) return Promise.resolve({ sparql: 'failed: no fetch', api: 'failed: no fetch' });
    return Promise.all([one(sparql(F, 'SELECT ?sl WHERE { wd:Q937 wikibase:sitelinks ?sl }', o && o.ua, ms)), one(terms(F, ['Q937'], o && o.ua, ms))]).then(function (r) { return { sparql: r[0], api: r[1] }; });
  }

  /* ------------------------------------- the computer's ideas for the Answerer (1.1.2) --- */
  // Between people the Answerer may ask the computer for an idea: shown one at a time and only to her
  // (Use this · Next · Previous · I'll choose myself). The ideas: near the difficulty of the match, the
  // match's category before the rest of the question word, and leaning to the playing language - every
  // other idea from the countries of that language (Albanian: Albania and Kosovo, then North Macedonia and
  // Montenegro; Bosnian: Bosnia and Herzegovina, then the neighbours; German: Germany, Austria, Switzerland),
  // the others the world's. English: the world as it comes.
  var HOME = { sq: ['AL', 'XK'], bs: ['BA'], de: ['DE', 'AT', 'CH'] };
  var NEAR = { sq: ['MK', 'ME'], bs: ['HR', 'ME', 'SI', 'MK'], de: ['LI', 'LU'] };
  var HOME_REGIONS = { sq: ['AL', 'XK'], bs: ['BA'], de: ['DE'] };   // C.REGIONS ids for the live search
  /** 2 = from the countries of the language, 1 = a neighbour, 0 = elsewhere. */
  function homeOf(e, lang) {
    var f = (e && e.facts) || {}, cs = (f.countries || []).concat(f.both || []), h = HOME[lang] || [], n = NEAR[lang] || [];
    if (cs.some(function (c) { return h.indexOf(c) !== -1; })) return 2;
    return cs.some(function (c) { return n.indexOf(c) !== -1; }) ? 1 : 0;
  }
  /** The ideas in the order they are shown (no doubles, nothing excluded, nothing in o.exclude). */
  function arrangeIdeas(list, o) {
    var lang = o.lang, levelN = (C.LEVELS[o.level] || C.LEVELS.standard).n, skip = {}, seen = {}, cands = [];
    (o.exclude || []).forEach(function (id) { if (id) skip[id] = 1; });
    list.forEach(function (e) {
      if (!e || skip[e.id] || (e.qid && skip['wd:' + e.qid]) || seen[e.id] || excluded(e)) return;
      if (C.modeOf(e.cat) !== o.mode) return;
      var nm = 'n:' + X.norm(X.labelIn(e, 'en'));
      if (seen[nm] || (e.qid && seen['q:' + e.qid])) return;
      seen[e.id] = seen[nm] = 1;
      if (e.qid) seen['q:' + e.qid] = 1;
      cands.push(e);
    });
    // the nearest difficulty first (random within a level), the match's category before the others
    var keyed = X.shuffle(cands).map(function (e) { return { e: e, k: (o.cat && e.cat !== o.cat ? 10 : 0) + Math.abs((e.level || levelN) - levelN) }; });
    keyed.sort(function (a, b) { return a.k - b.k; });
    var ordered = keyed.map(function (x) { return x.e; });
    if (!HOME[lang]) return ordered;
    // every other idea from home (the countries of the language first, then the neighbours)
    var home = ordered.filter(function (e) { return homeOf(e, lang) > 0; }).sort(function (a, b) { return homeOf(b, lang) - homeOf(a, lang); });
    var world = ordered.filter(function (e) { return homeOf(e, lang) === 0; }), out = [];
    while (home.length || world.length) {
      if (home.length) out.push(home.shift());
      if (world.length) out.push(world.shift());
    }
    return out;
  }
  /**
   * The computer's ideas for the Answerer.
   * o: { lang, mode, cat, subs[], level, exclude[] (ids), online, fetch, ua, store }
   * → { now: [cards] (the built-in cards, at once), later: Promise of [cards] (with Wikidata, when it answers) }
   */
  function ideas(o) {
    o = o || {};
    var deck = (o.cat ? deckPool({ mode: o.mode, cat: o.cat, subs: o.subs }) : []).concat(deckPool({ mode: o.mode }));
    var first = arrangeIdeas(deck, o);
    if (o.online === false || !o.cat) return { now: first, later: Promise.resolve(first) };
    var base = { lang: o.lang, mode: o.mode, cat: o.cat, subs: o.subs, level: o.level, count: 2, online: true, fetch: o.fetch, ua: o.ua, store: o.store, recent: [] };
    var asks = [find(base)].concat((HOME_REGIONS[o.lang] || []).map(function (rg) {
      var b = {}; for (var k in base) b[k] = base[k];
      b.region = rg;
      return find(b);
    }));
    var later = Promise.all(asks.map(function (p) { return p.catch(function () { return null; }); })).then(function (res) {
      var web = [];
      res.forEach(function (x) { if (x && x.pool) web = web.concat(x.pool.filter(function (e) { return e.source !== 'deck'; })); });
      return web.length ? arrangeIdeas(web.concat(deck), o) : first;
    });
    return { now: first, later: later };
  }

  return { find: find, deckPool: deckPool, buildQuery: buildQuery, factsQuery: factsQuery, toEntity: toEntity, verified: verified, excluded: excluded,
    suggest: suggest, lookup: lookup, cleanCard: cleanCard, probe: probe, placeOf: placeOf, ideas: ideas, arrangeIdeas: arrangeIdeas, homeOf: homeOf,
    periodOk: periodOk, regionOk: regionOk, OCC: OCC, GENRE: GENRE, CLS: CLS };
});
