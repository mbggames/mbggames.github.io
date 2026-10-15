/*!
 * MBG Puzzles - "Move to a new phone": everything a player has built up, as one code.
 *
 * The old phone shows a code (copy it, or send it to yourself by WhatsApp or e-mail); the new
 * phone takes it in. No account and no server: the code goes from one phone to the other only
 * the way the player sends it.
 *
 * In the code: player names and best scores of both games, statistics, daily puzzle results,
 * settings (colours, text size, sound, lengths, level, rules at start), the language, the
 * player last used and - for names on the world list - the key that keeps those names yours.
 * Not in the code: hint credits (they could be copied to many phones) and the plan; a
 * subscription comes back by itself from Google Play on the new phone.
 *
 * Taking a code in adds to what the new phone has: names and best scores are merged (the higher
 * score wins), statistics keep the record with more games, daily results are joined.
 *
 * Format: MBG2-<data>-<check> (data: the JSON, compressed, base64url) or MBG1-... uncompressed
 * where the phone cannot compress. <check>: 8 hex digits (FNV-1a) that catch a code cut short.
 * Runs in the browser (window.MBG.Transfer) and in Node.js (require) for the tests.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Transfer = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  var KEYS = {
    codebreakerUsers: 'MBG.Codebreaker.Users',
    wordUsers: 'MBG.Word.Users',
    stats: 'MBG.App.stats',
    daily: 'MBG.App.daily',
    prefs: 'MBG.App.prefs',
    lang: 'MBG.App.lang',
    user: 'MBG.App.user',
    world: 'MBG.App.world'
  };
  var PREF_KEYS = ['theme', 'hue', 'fontSize', 'sound', 'keySound', 'lengths', 'wordPool', 'validateGuesses', 'intro'];
  var LANGS = ['en', 'sq', 'bs', 'de', 'es', 'fr', 'tr', 'pl', 'pt', 'ar'];

  function lib(name) { return root.MBG && root.MBG[name]; }
  function get(storage, key) { try { return storage.getItem(key); } catch (e) { return null; } }
  function set(storage, key, v) { try { storage.setItem(key, v); } catch (e) { /* ignore */ } }
  function json(storage, key) { try { return JSON.parse(get(storage, key) || 'null'); } catch (e) { return null; } }

  /* ----------------------------------------------------------- encoding --- */
  function fnv(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function toB64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function canZip() { return typeof CompressionStream === 'function' && typeof Response === 'function'; }
  function pipe(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  /* ------------------------------------------------------------ export --- */
  /** Everything that moves, read from the phone's storage. */
  function collect(storage) {
    var prefs = json(storage, KEYS.prefs) || {};
    var p = {};
    PREF_KEYS.concat(['recent']).forEach(function (k) { if (prefs[k] !== undefined) p[k] = prefs[k]; });
    var world = json(storage, KEYS.world) || {};
    var w = null;
    if (world.player && world.secret) w = { player: world.player, secret: world.secret, names: world.names || {}, blocked: world.blocked || [] };
    return {
      v: 1,
      cu: get(storage, KEYS.codebreakerUsers) || '',
      wu: get(storage, KEYS.wordUsers) || '',
      st: json(storage, KEYS.stats),
      dy: json(storage, KEYS.daily),
      pr: p,
      lg: get(storage, KEYS.lang),
      us: json(storage, KEYS.user),
      wo: w
    };
  }

  /** Resolves the code of this phone. */
  function makeCode(storage) {
    var text = JSON.stringify(collect(storage));
    var bytes = new TextEncoder().encode(text);
    var zipped = canZip() ? pipe(bytes, new CompressionStream('deflate-raw')).then(function (z) { return { v: 2, b: z }; }, function () { return { v: 1, b: bytes }; })
      : Promise.resolve({ v: 1, b: bytes });
    return zipped.then(function (r) {
      var data = toB64(r.b);
      return 'MBG' + r.v + '-' + data + '-' + fnv(data);
    });
  }

  /* ------------------------------------------------------------ import --- */
  /** Reads a code (spaces, line breaks and words around it do not matter). Resolves the data or
   *  { error: 'format' | 'check' | 'zip' }. */
  function readCode(text) {
    var clean = String(text || '').replace(/\s+/g, '');
    var m = clean.match(/MBG([12])-([A-Za-z0-9_-]+)-([0-9a-f]{8})/);
    if (!m) return Promise.resolve({ error: 'format' });
    if (fnv(m[2]) !== m[3]) return Promise.resolve({ error: 'check' });
    var bytes;
    try { bytes = fromB64(m[2]); } catch (e) { return Promise.resolve({ error: 'format' }); }
    var raw = m[1] === '2'
      ? (typeof DecompressionStream === 'function' ? pipe(bytes, new DecompressionStream('deflate-raw')) : Promise.reject(new Error('zip')))
      : Promise.resolve(bytes);
    return raw.then(function (b) {
      var d = JSON.parse(new TextDecoder().decode(b));
      return d && d.v === 1 ? d : { error: 'format' };
    }, function () { return { error: 'zip' }; }).catch(function () { return { error: 'format' }; });
  }

  /** Adds the data of a code to this phone. Returns { names, games, world } (what came in). */
  function apply(storage, d) {
    var S = lib('Storage'), Stats = lib('Stats'), Daily = lib('Daily');
    var names = {};
    [['cu', KEYS.codebreakerUsers], ['wu', KEYS.wordUsers]].forEach(function (x) {
      if (typeof d[x[0]] !== 'string' || !S) return;
      var store = new S.UserStore(storage, x[1]);
      store.mergeText(d[x[0]]);
      S.parseUsers(d[x[0]]).forEach(function (u) { if (u.name.toLowerCase() !== S.ANONYMOUS.toLowerCase()) names[u.name.toLowerCase()] = 1; });
    });
    var games = 0;
    if (d.st && Stats) {
      new Stats.StatsStore(storage).mergeData(d.st);
      Object.keys(d.st.p || {}).forEach(function (k) {
        var g = (d.st.p[k] || {}).g || {};
        Object.keys(g).forEach(function (game) { Object.keys((g[game] || {}).b || {}).forEach(function (bk) { games += g[game].b[bk].p || 0; }); });
      });
    }
    if (d.dy && Daily) new Daily.DailyStore(storage).mergeData(d.dy);
    if (d.pr && typeof d.pr === 'object') {
      var prefs = json(storage, KEYS.prefs) || {};
      PREF_KEYS.forEach(function (k) { if (d.pr[k] !== undefined) prefs[k] = d.pr[k]; });
      if (Array.isArray(d.pr.recent)) {
        var seen = {};
        prefs.recent = d.pr.recent.concat(prefs.recent || []).filter(function (n) {
          var k = String(n).toLowerCase();
          if (typeof n !== 'string' || !n || seen[k]) return false;
          seen[k] = 1; return true;
        }).slice(0, 20);
      }
      set(storage, KEYS.prefs, JSON.stringify(prefs));
    }
    if (LANGS.indexOf(d.lg) !== -1) set(storage, KEYS.lang, d.lg);
    if (d.us && (d.us.mode === 'registered' || d.us.mode === 'anonymous' || d.us.mode === 'nodata')) set(storage, KEYS.user, JSON.stringify(d.us));
    var world = false;
    if (d.wo && d.wo.player && d.wo.secret) {
      var mine = json(storage, KEYS.world) || {};
      var joined = mine.names && Object.keys(mine.names).some(function (k) { return mine.names[k] && mine.names[k].joined; });
      if (!mine.player || !joined) {
        mine.player = d.wo.player;
        mine.secret = d.wo.secret;
        mine.names = d.wo.names || {};
        world = true;
      }
      mine.blocked = (mine.blocked || []).concat((d.wo.blocked || []).filter(function (p) { return (mine.blocked || []).indexOf(p) === -1; })).slice(-200);
      set(storage, KEYS.world, JSON.stringify(mine));
    }
    return { names: Object.keys(names).length, games: games, world: world };
  }

  return { KEYS: KEYS, makeCode: makeCode, readCode: readCode, apply: apply, collect: collect, _fnv: fnv };
});
