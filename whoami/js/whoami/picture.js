/*!
 * Who Am I? MBG - a picture of the answer when it is revealed (free pictures only).
 *
 * Where the picture comes from, in this order:
 *   1. Wikidata: the "image" of the answer (property P18) - a picture chosen by Wikidata's editors,
 *      always a file on Wikimedia Commons.
 *   2. Wikipedia: the article's lead picture, asked with pilicense=free, so only free files
 *      (Wikimedia Commons) - never the "fair use" pictures some Wikipedias keep (film posters,
 *      book covers, logos).
 * Then Wikimedia Commons gives the picture in a small size, its author and its licence
 * (public domain, CC0, CC BY, CC BY-SA, ...). The game always shows author and licence with a
 * link to the file's page on Commons, as these licences ask.
 *
 * Nothing is sent but the name or Wikidata id of the answer. No internet, or Wikimedia slow:
 * no picture, the game goes on as before. Found pictures are remembered on the device for 7 days.
 * Runs in the browser (MBG.WhoPicture) and in Node.js for the tests (fetch is passed in).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoPicture = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var WD = 'https://www.wikidata.org/w/api.php';
  var COMMONS = 'https://commons.wikimedia.org/w/api.php';
  // Wikimedia serves thumbnails in fixed steps (… 330, 500, 960, 1280 …): 500 for the card, 960 big
  var WIDTH = 500, BIG = 960;
  // .v2: 0.9.5 wrongly remembered "no picture" (Wikimedia moved its thumbnails to thumb.wikimedia.org)
  var KEY = 'MBG.Who.pics.v2', DAYS = 7, NONE_DAYS = 1, MAX = 150;
  var HOST = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;
  var memo = {};

  function q(o) { return Object.keys(o).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); }
  /** Plain text from Commons' HTML (the author is often a link) - never inserted as HTML. */
  function text(html) {
    return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  }
  /** "Unknown author Unknown author" -> "" ; "A A" -> "A". */
  function person(s) {
    var m = /^(.+?)\s+\1$/.exec(s);
    if (m) s = m[1];
    return /^(unknown|unbekannt|i panjohur|nepoznat)( author| autor)?$/i.test(s) ? '' : s;
  }
  function cut(s, n) { return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; }

  /** The file name of P18 in a wbgetclaims answer (a "preferred" picture first). */
  function fileFromClaims(json) {
    var list = (json && json.claims && json.claims.P18) || [];
    list = list.filter(function (c) { return c && c.rank !== 'deprecated' && c.mainsnak && c.mainsnak.datavalue && typeof c.mainsnak.datavalue.value === 'string'; });
    list.sort(function (a, b) { return (b.rank === 'preferred') - (a.rank === 'preferred'); });
    return list.length ? list[0].mainsnak.datavalue.value : null;
  }
  /** The free lead picture in a Wikipedia pageimages answer (formatversion=2). */
  function fileFromPageImages(json) {
    var pages = (json && json.query && json.query.pages) || [];
    for (var i = 0; i < pages.length; i++) if (pages[i] && pages[i].pageimage && !pages[i].missing) return pages[i].pageimage;
    return null;
  }
  /** Not a picture to show: sounds, videos, documents, and the "no image" placeholders. */
  function usable(file) {
    var f = String(file || '');
    return !!f && /\.(jpe?g|png|gif|svg|tiff?|webp)$/i.test(f) && !/placeholder|no[ _-]?image|replace[ _]this[ _]image/i.test(f);
  }
  /** Picture, author and licence from a Commons imageinfo answer (formatversion=2). */
  function creditFrom(json) {
    var pages = (json && json.query && json.query.pages) || [];
    var p = pages[0], ii = p && p.imageinfo && p.imageinfo[0];
    if (!ii) return null;
    var src = ii.thumburl || ii.url, full = HOST.test(String(ii.url || '')) ? ii.url : null;
    if (!HOST.test(String(src || ''))) return null;
    // the big view: the 960 step if the file is that wide, else the file itself
    var big = (ii.width || 0) > BIG && /\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, '/' + BIG + 'px-') : full || src;
    var m = ii.extmetadata || {}, val = function (k) { return m[k] && m[k].value; };
    var page = /^https:\/\/commons\.wikimedia\.org\//.test(String(ii.descriptionurl || '')) ? ii.descriptionurl : 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(String(p.title || '').replace(/ /g, '_'));
    var lic = text(val('LicenseShortName')) || (val('Copyrighted') === 'False' ? 'Public domain' : '');
    // Commons hosts only free files; a file without any licence text is left out to be safe
    if (!lic) return null;
    return {
      src: src, big: big, full: full, width: ii.thumbwidth || ii.width || 0, height: ii.thumbheight || ii.height || 0, page: page,
      author: cut(person(text(val('Artist')) || text(val('Credit'))), 70), license: cut(lic, 40),
      licenseUrl: /^https?:\/\//.test(String(val('LicenseUrl') || '')) ? val('LicenseUrl') : null
    };
  }
  /** "Photo: Orren Jack Turner · Public domain · Wikimedia Commons" (the words come from the caller). */
  function creditLine(pic, word) {
    return [pic.author ? (word || '') + pic.author : null, pic.license, 'Wikimedia Commons'].filter(Boolean).join(' · ');
  }

  function getJson(fetchFn, url, ms) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 7000);
    return fetchFn(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { clearTimeout(timer); return j; }, function (e) { clearTimeout(timer); throw e; });
  }
  /** The Wikipedia article: its title from Wikidata, else the name in that language (redirects are followed). */
  function titleIn(A, l) { return (A.wiki && A.wiki[l]) || (A.label && typeof A.label === 'object' && A.label[l]) || null; }
  function keyOf(A, lang) { return A.qid ? A.qid : 'w:' + lang + ':' + (titleIn(A, lang) || titleIn(A, 'en') || A.id); }
  function cacheGet(store, key) {
    if (memo[key] !== undefined) return memo[key];
    try {
      var all = JSON.parse(store.getItem(KEY) || '{}'), e = all[key];
      if (e && Date.now() - e.at < (e.pic ? DAYS : NONE_DAYS) * 864e5) return (memo[key] = e.pic);
    } catch (x) { /* none */ }
    return undefined;
  }
  function cachePut(store, key, pic) {
    memo[key] = pic;
    if (!store) return;
    try {
      var all = JSON.parse(store.getItem(KEY) || '{}');
      all[key] = { pic: pic, at: Date.now() };
      var keys = Object.keys(all);
      if (keys.length > MAX) keys.sort(function (a, b) { return all[a].at - all[b].at; }).slice(0, keys.length - MAX).forEach(function (k) { delete all[k]; });
      store.setItem(KEY, JSON.stringify(all));
    } catch (x) { /* full or blocked */ }
  }

  /**
   * The picture of an answer: { src, width, height, page, author, license, licenseUrl } or null.
   * o: { fetch, store } (both optional in the browser).
   */
  function find(A, lang, o) {
    o = o || {};
    var fetchFn = o.fetch || (typeof fetch === 'function' ? fetch.bind(root0()) : null);
    var store = o.store === undefined ? (typeof localStorage !== 'undefined' ? localStorage : null) : o.store;
    if (!A || !fetchFn) return Promise.resolve(null);
    var key = keyOf(A, lang), hit = store ? cacheGet(store, key) : memo[key];
    if (hit !== undefined) return Promise.resolve(hit);
    var base = { format: 'json', formatversion: 2, origin: '*' }, failed = false;
    function miss() { failed = true; return null; }
    function wikidata() {
      if (!A.qid) return Promise.resolve(null);
      return getJson(fetchFn, WD + '?' + q(Object.assign({ action: 'wbgetclaims', entity: A.qid, property: 'P18' }, base))).then(fileFromClaims, miss);
    }
    // exact Wikipedia titles: from the answer (Wikidata answers have them), else asked from Wikidata -
    // so a film "Titanic" finds the film's article, not the ship's
    var titles = null;
    function sitelinks() {
      if (titles) return Promise.resolve(titles);
      if ((A.wiki && Object.keys(A.wiki).length) || !A.qid) return Promise.resolve(titles = A.wiki || {});
      return getJson(fetchFn, WD + '?' + q(Object.assign({ action: 'wbgetentities', ids: A.qid, props: 'sitelinks', sitefilter: 'enwiki|sqwiki|dewiki|bswiki' }, base)))
        .then(function (j) {
          var e = j && j.entities && j.entities[A.qid], sl = (e && e.sitelinks) || {}, t = {};
          ['en', 'sq', 'de', 'bs'].forEach(function (l) { if (sl[l + 'wiki'] && sl[l + 'wiki'].title) t[l] = sl[l + 'wiki'].title; });
          return (titles = t);
        }, function () { failed = true; return (titles = {}); });
    }
    function wikipedia(l) {
      return sitelinks().then(function (t) {
        // with a Wikidata id only its own articles; without one, the name in that language
        var title = t[l] || (!A.qid ? titleIn(A, l) : null);
        if (!title) return null;
        return getJson(fetchFn, 'https://' + l + '.wikipedia.org/w/api.php?' + q(Object.assign({ action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: 1, titles: title }, base)))
          .then(fileFromPageImages, miss);
      });
    }
    /** A file name -> the picture with author and licence, if the file is on Wikimedia Commons. */
    function commons(file) {
      if (!usable(file)) return Promise.resolve(null);
      return getJson(fetchFn, COMMONS + '?' + q(Object.assign({ action: 'query', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: WIDTH,
        iiextmetadatafilter: 'Artist|Credit|LicenseShortName|LicenseUrl|Copyrighted', titles: 'File:' + String(file).replace(/^File:/i, '') }, base))).then(creditFrom, miss);
    }
    var steps = [wikidata, function () { return wikipedia(lang); }];
    if (lang !== 'en') steps.push(function () { return wikipedia('en'); });
    // one source after the other, until one gives a file that is on Commons (a picture kept only
    // on one Wikipedia is skipped: it may not be free)
    return steps.reduce(function (p, step) {
      return p.then(function (pic) { return pic || step().then(commons); });
    }, Promise.resolve(null)).then(function (pic) {
      if (pic || !failed) cachePut(store, key, pic || null);     // "no picture" is remembered for a day, a failed connection not at all
      if (!pic && typeof console !== 'undefined' && console.info) console.info('[MBG picture] none for', key, failed ? '(connection failed)' : '(no free picture)');
      return pic || null;
    }, function (e) { if (typeof console !== 'undefined' && console.info) console.info('[MBG picture] failed for', key, e && e.message); return null; });
  }
  function root0() { return typeof self !== 'undefined' ? self : globalThis; }

  return { find: find, fileFromClaims: fileFromClaims, fileFromPageImages: fileFromPageImages, creditFrom: creditFrom, creditLine: creditLine, usable: usable, text: text,
    _reset: function () { memo = {}; } };
});
