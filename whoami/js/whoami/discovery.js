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
  function withTimeout(fetchFn, url, init) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT) : null;
    if (ctl) init.signal = ctl.signal;
    return fetchFn(url, init).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }, function (e) { if (t) clearTimeout(t); throw e; });
  }
  function sparql(fetchFn, query, ua) {
    var h = { Accept: 'application/sparql-results+json' };
    if (ua) h['User-Agent'] = ua;
    return withTimeout(fetchFn, SPARQL + '?format=json&query=' + encodeURIComponent(query), { headers: h }).then(function (j) { return j.results.bindings; });
  }
  function terms(fetchFn, ids, ua) {
    var url = API + '?action=wbgetentities&format=json&origin=*&props=labels|aliases|descriptions|sitelinks&languages=' + LANGS.join('|') +
      '&sitefilter=enwiki|sqwiki|dewiki|bswiki&ids=' + ids.join('|');
    var h = {};
    if (ua) h['Api-User-Agent'] = ua;
    return withTimeout(fetchFn, url, { headers: h }).then(function (j) { return j.entities || {}; });
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

  return { find: find, deckPool: deckPool, buildQuery: buildQuery, factsQuery: factsQuery, toEntity: toEntity, verified: verified, excluded: excluded,
    periodOk: periodOk, regionOk: regionOk, OCC: OCC, GENRE: GENRE, CLS: CLS };
});
