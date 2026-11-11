/*!
 * MBG Puzzles - MBG accounts: sign in with Google, keep the games on every phone.
 *
 *  - Optional. Without an account everything works as before, with player names kept on the
 *    phone. Accounts are for players aged 16 and over (a neutral year-of-birth question; the
 *    year stays on the phone, and an answer under 16 locks accounts on this phone).
 *  - Two ways to sign in: Google, or an e-mail address and a password (MBG.EMAIL_LOGIN; a new
 *    account and a forgotten password are confirmed with a 6-digit code e-mailed by the server).
 *  - Google: Android asks Google for an ID token (plugin @capgo/capacitor-social-login, Google's
 *    Credential Manager); in a browser, Google's own "Continue with Google" button gives it. The
 *    token goes once to our server (server/worker.js), which checks it with Google's keys and
 *    returns a session key. A new account chooses a username (unique, public on the world list)
 *    and whether its best scores appear on the world top 20.
 *  - The account's username is a player name on the phone. Its best scores, statistics and
 *    results of the puzzles of the day are saved on the server and merged in on every phone
 *    where the account signs in (the same merging as "Move to a new phone": the higher score
 *    wins, statistics keep the record with more games, daily results are joined). Settings,
 *    hint credits and the plan are not saved on the account.
 *  - Sign out keeps everything on the phone; "Delete account" deletes the account on the server.
 *  - Reminder e-mails (version 1.7): an account that has not played for about 3 days gets one
 *    friendly e-mail from the server, in the app's language (sent with every sync). On by default;
 *    "Don't send me game reminders" when the account is made, the switch in the account screen,
 *    or the link in every e-mail turn them off.
 *
 * Switched on when the build has MBG.WORLD_URL (the server) and MBG.GOOGLE_CLIENT_ID (the Web
 * client ID from Google Cloud) and/or MBG.EMAIL_LOGIN - see README, "MBG accounts".
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;
  var KEY = 'MBG.App.account';
  var BASE = String(MBG.WORLD_URL || '').replace(/\/+$/, '');
  var CLIENT_ID = String(MBG.GOOGLE_CLIENT_ID || '').trim();
  var EMAIL = !!MBG.EMAIL_LOGIN;
  var MIN_AGE = 16;
  var MIN_PASSWORD = 6;            // characters; the server checks the same (server/worker.js)
  var USERS = { cu: 'MBG.Codebreaker.Users', wu: 'MBG.Word.Users' };
  var GSI = 'https://accounts.google.com/gsi/client';
  var SYNC_EVERY = 60 * 1000;      // a page opened again within a minute does not sync again

  function t(k, p) { return Shell.t(k, p); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function keyOf(name) { return String(name || '').normalize('NFC').trim().toLowerCase(); }

  /* --------------------------------------------------------------- pictures --- */
  // A fixed, child-safe avatar set ('e:0' .. 'e:23', the same count as the server's AVATARS): an
  // emoji on its own colour. Other players see the avatar on the world list; an uploaded photo is
  // shown only to the account itself. No avatar and no photo = the default picture (a silhouette).
  var AVATARS = [['🦊', '#F7C9A8'], ['🐼', '#DDE3E8'], ['🐨', '#D3DCE6'], ['🦁', '#F6D9A0'], ['🐯', '#F9CFA0'], ['🐸', '#C9EBC2'],
    ['🐵', '#EBD3B8'], ['🐧', '#CFE0F2'], ['🦉', '#E3D5C3'], ['🐙', '#F5C6D6'], ['🦄', '#E6D3F5'], ['🐢', '#CDEBD0'],
    ['🐬', '#C5E3F6'], ['🦋', '#D7DAF7'], ['🐝', '#FBE7A1'], ['🐞', '#F8C9C4'], ['🌻', '#FCEBB0'], ['🌵', '#D3EDCB'],
    ['⭐', '#FFF0B3'], ['🌙', '#D9DDF2'], ['🚀', '#D2E4F7'], ['⚽', '#E2E8EC'], ['🎸', '#F6D2C2'], ['🎨', '#F3D9EE']];
  var SILHOUETTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5"/></svg>';
  function avatarIndex(code) { var m = /^e:(\d{1,2})$/.exec(code || ''); return m && Number(m[1]) < AVATARS.length ? Number(m[1]) : -1; }
  /** A round picture: the photo (own account only), else the avatar, else the default silhouette. */
  function pictureNode(code, photo, cls) {
    var n = el('span', 'av ' + (cls || ''));
    n.setAttribute('aria-hidden', 'true');
    var i = avatarIndex(code);
    if (photo) {
      var img = el('img');
      img.src = photo;
      img.alt = '';
      n.appendChild(img);
      n.classList.add('av-photo');
    } else if (i !== -1) {
      n.textContent = AVATARS[i][0];
      n.style.background = AVATARS[i][1];
      n.classList.add('av-emoji');
    } else {
      n.innerHTML = SILHOUETTE;
      n.classList.add('av-none');
    }
    return n;
  }
  /** A picked photo, cropped to a square and shrunk to 256 px JPEG (about 15-30 KB). */
  function shrinkPhoto(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || 'image/')) { reject(new Error('type')); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var side = Math.min(img.naturalWidth, img.naturalHeight);
          if (!side) throw new Error('size');
          var c = document.createElement('canvas');
          c.width = c.height = 256;
          var g = c.getContext('2d');
          g.fillStyle = '#FFFFFF';
          g.fillRect(0, 0, 256, 256);
          g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
          var data = c.toDataURL('image/jpeg', 0.85);
          if (data.length > 90000) data = c.toDataURL('image/jpeg', 0.6);
          URL.revokeObjectURL(url);
          resolve(data);
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  /* ------------------------------------------------------------ the plugin --- */
  var cap = root.capacitorExports && root.capacitorExports.Capacitor;
  var social = null;
  function plugin() {
    if (social || !Shell.native || !root.capacitorExports || typeof root.capacitorExports.registerPlugin !== 'function') return social;
    if (cap && typeof cap.isPluginAvailable === 'function' && !cap.isPluginAvailable('SocialLogin')) return null;
    social = root.capacitorExports.registerPlugin('SocialLogin');
    return social;
  }
  function googleOn() { return !!CLIENT_ID && (!Shell.native || !!plugin()); }
  function enabled() { return !!BASE && (googleOn() || EMAIL); }

  /* ------------------------------------------------------------- the state --- */
  // { session, username, email, world, ver, last, syncedAt, young, birthYear }
  function load() {
    var s = null;
    try { s = JSON.parse(Shell.store.getItem(KEY) || 'null'); } catch (e) { s = null; }
    return s && typeof s === 'object' ? s : {};
  }
  var state = load();
  function save() { try { Shell.store.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function signedIn() { return enabled() && !!(state.session && state.username); }

  // Other accounts used on this phone (not the active one): { key: { username, email, method,
  // avatar, world, session } }. "Stay signed in" ticked: the session is kept, so choosing the name
  // signs in again at once; not ticked (or signed out): session null - the password is asked again.
  var KEY_SAVED = 'MBG.App.accounts';
  var saved = (function () {
    var s = null;
    try { s = JSON.parse(Shell.store.getItem(KEY_SAVED) || 'null'); } catch (e) { s = null; }
    return s && typeof s === 'object' ? s : {};
  })();
  function saveSaved() { try { Shell.store.setItem(KEY_SAVED, JSON.stringify(saved)); } catch (e) { /* ignore */ } }
  /** Ends a session on the server without waiting (the phone forgets it anyway). */
  function endSession(session) {
    if (!session || !BASE) return;
    try {
      fetch(BASE + '/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session }, body: '{}' })
        .catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }
  /** The active account goes to the saved list (with its session only when "Stay signed in" was ticked). */
  function stash() {
    if (!state.session || !state.username) return;
    var keep = state.remember !== false;
    if (!keep) endSession(state.session);
    saved[keyOf(state.username)] = { username: state.username, email: state.email || '', method: state.method || 'google',
      avatar: state.avatar || '', world: !!state.world, session: keep ? state.session : null };
    saveSaved();
  }
  // "Stay signed in" not ticked: a new start of the app asks for the password again.
  (function () {
    var running = true;
    try { running = root.sessionStorage.getItem('MBG.App.running') === '1'; root.sessionStorage.setItem('MBG.App.running', '1'); } catch (e) { running = true; }
    if (!running && state.session && state.username && state.remember === false) {
      stash();
      state.session = null;
      state.username = null;
      save();
    }
  })();

  var listeners = [];
  function emit(type, name) {
    listeners.forEach(function (fn) { try { fn(type); } catch (e) { /* ignore */ } });
    try { root.dispatchEvent(new CustomEvent('mbg:account', { detail: { type: type, username: name || state.username || null } })); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------- server calls --- */
  function api(path, body) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    var headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (state.session) headers.Authorization = 'Bearer ' + state.session;
    var opts = { method: body ? 'POST' : 'GET', headers: headers };
    if (body) opts.body = JSON.stringify(body);
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(BASE + path, opts).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'server' }; }).then(function (j) { j.status = r.status; return j; });
    }).then(function (j) {
      clearTimeout(timer);
      // The session ended on the server (deleted elsewhere, or unused for a year): signed out here too.
      if (j.status === 401 && j.error === 'session' && state.session) forget(true);
      return j;
    }, function () { clearTimeout(timer); return { ok: false, error: 'offline' }; });
  }

  /* -------------------------------------------------------- Google's token --- */
  var nativeReady = null;
  function nativeToken() {
    var SL = plugin();
    if (!SL) return Promise.reject(new Error('plugin'));
    if (!nativeReady) {
      nativeReady = SL.initialize({ google: { webClientId: CLIENT_ID, mode: 'online' } });
      nativeReady.catch(function () { nativeReady = null; });
    }
    return nativeReady.then(function () {
      // filterByAuthorizedAccounts: false - every Google account on the phone may be chosen.
      return SL.login({ provider: 'google', options: { style: 'bottom', filterByAuthorizedAccounts: false } });
    }).then(function (res) {
      var token = res && res.result && res.result.idToken;
      // The plugin keeps nothing for us: the session key is all the app needs.
      try { SL.logout({ provider: 'google' }).catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
      if (!token) throw new Error('no-token');
      return token;
    });
  }

  var gsi = null, gsiReady = false, gsiCallback = null;
  function loadGsi() {
    if (gsi) return gsi;
    gsi = new Promise(function (resolve, reject) {
      var ok = function () { return root.google && root.google.accounts && root.google.accounts.id; };
      if (ok()) { resolve(ok()); return; }
      var s = document.createElement('script');
      s.src = GSI;
      s.async = true;
      s.onload = function () { if (ok()) resolve(ok()); else { gsi = null; reject(new Error('gsi')); } };
      s.onerror = function () { gsi = null; reject(new Error('gsi')); };
      document.head.appendChild(s);
    });
    return gsi;
  }
  var GSI_LOCALES = { en: 'en', sq: 'sq', bs: 'bs', de: 'de', es: 'es', fr: 'fr', tr: 'tr', pl: 'pl', pt: 'pt-BR', ar: 'ar', ko: 'ko' };
  /** Google's own button, drawn into box (browsers only). onToken(idToken) after the user chose an account. */
  function webButton(box, onToken, onFail) {
    loadGsi().then(function (id) {
      gsiCallback = onToken;
      if (!gsiReady) {
        id.initialize({ client_id: CLIENT_ID, ux_mode: 'popup', auto_select: false, itp_support: true,
          callback: function (r) { if (gsiCallback && r && r.credential) gsiCallback(r.credential); } });
        gsiReady = true;
      }
      box.textContent = '';
      id.renderButton(box, {
        type: 'standard', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'left',
        theme: Shell.isDarkTheme(document.documentElement.getAttribute('data-skin')) ? 'filled_black' : 'outline',
        locale: GSI_LOCALES[Shell.getLang()] || 'en', width: Math.max(220, Math.min(340, box.clientWidth || 300))
      });
    }, function () { if (onFail) onFail(); });
  }

  /* ---------------------------------------------- this phone's saved games --- */
  function libs() { return { S: MBG.Storage, St: MBG.Stats, D: MBG.Daily }; }
  /** The account's games as saved on the server: only the account's username, plus the daily results. */
  function collect() {
    var L = libs(), key = keyOf(state.username), d = { v: 1 };
    if (L.S) Object.keys(USERS).forEach(function (k) {
      var u = new L.S.UserStore(Shell.store, USERS[k]).find(state.username);
      var m = new Map();
      if (u) m.set(key, u);
      d[k] = L.S.serializeUsers(m);
    });
    if (L.St) {
      var sd = new L.St.StatsStore(Shell.store).data;
      if (sd.p[key]) { d.st = { v: 1, p: {} }; d.st.p[key] = sd.p[key]; }
    }
    if (L.D) {
      var dd = new L.D.DailyStore(Shell.store, L.D.keyFor(state.username)).data;
      d.dy = { v: 1, hist: dd.hist || {}, rw: dd.rw || {}, cur: dd.cur || {} };
    }
    return d;
  }
  /** Adds the server's copy to this phone (never removes anything). True when something changed. */
  function absorb(d) {
    if (!d || typeof d !== 'object' || !state.username) return false;
    var L = libs(), key = keyOf(state.username), changed = false;
    if (L.S) Object.keys(USERS).forEach(function (k) {
      if (typeof d[k] !== 'string') return;
      var u = L.S.parseUsers(d[k]).get(key);
      if (!u) return;
      var m = new Map();
      m.set(key, u);
      if (new L.S.UserStore(Shell.store, USERS[k]).mergeText(L.S.serializeUsers(m))) changed = true;
    });
    if (L.St && d.st && d.st.p && d.st.p[key]) {
      var only = { v: 1, p: {} };
      only.p[key] = d.st.p[key];
      if (new L.St.StatsStore(Shell.store).mergeData(only) > 0) changed = true;
    }
    if (L.D && d.dy && typeof d.dy === 'object') { if (new L.D.DailyStore(Shell.store, L.D.keyFor(state.username)).mergeData(d.dy) > 0) changed = true; }
    if (changed) emit('data');
    return changed;
  }
  /** The username becomes a player name on this phone and the current player. */
  function adoptLocal() {
    var L = libs();
    if (L.S) Object.keys(USERS).forEach(function (k) { new L.S.UserStore(Shell.store, USERS[k]).ensure(state.username); });
    Shell.setUser({ mode: 'registered', name: state.username });
    var prefs = Shell.getPrefs();
    var recent = Array.isArray(prefs.recent) ? prefs.recent : [];
    prefs.recent = [state.username].concat(recent.filter(function (n) { return keyOf(n) !== keyOf(state.username); })).slice(0, 20);
    try { Shell.store.setItem(Shell.KEYS.prefs, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ sync --- */
  var status = { busy: false, error: null };
  var syncing = null, again = false, timer = null;
  function push(ver, tries) {
    var d = collect(), text = JSON.stringify(d);
    if (text === state.last && ver === state.ver) return Promise.resolve(true);       // nothing new
    return api('/api/account/data', { data: d, ver: ver }).then(function (r) {
      if (r.ok) { state.ver = r.ver; state.last = text; save(); return true; }
      if (r.status === 409 && tries < 3) { absorb(r.data); return push(r.ver, tries + 1); }   // another phone was faster
      throw r;
    });
  }
  /** Brings the photo of this account to this phone when it changed elsewhere. */
  function syncPhoto(hash) {
    hash = hash || '';
    if (hash === (state.photoHash || '')) return Promise.resolve();
    if (!hash) { state.photo = ''; state.photoHash = ''; save(); emit('picture'); return Promise.resolve(); }
    return api('/api/account/photo').then(function (r) {
      if (!r.ok) return;
      state.photo = r.data || '';
      state.photoHash = r.photo || '';
      save();
      emit('picture');
    });
  }
  function applyAccount(a) {
    if (!a) return;
    var worldBefore = !!state.world;
    if (typeof a.avatar === 'string' && a.avatar !== (state.avatar || '')) { state.avatar = a.avatar; emit('picture'); }
    syncPhoto(a.photo);
    state.username = a.username;
    state.email = a.email || '';
    state.world = !!a.world;
    if (typeof a.remind === 'boolean') state.remind = a.remind;
    if (a.method) state.method = a.method;
    save();
    if (worldBefore !== state.world) emit('world');
  }
  /** Fetches the account's games, merges them in and saves the merged copy. Resolves true when done. */
  function sync() {
    if (!signedIn()) return Promise.resolve(false);
    if (syncing) { again = true; return syncing; }
    clearTimeout(timer);
    status.busy = true;
    emit('status');
    syncing = api('/api/account?lang=' + encodeURIComponent(Shell.getLang())).then(function (g) {   // the language: for the e-mails
      if (!g.ok) throw g;
      applyAccount(g.account);
      absorb(g.data);
      return push(g.ver, 0);
    }).then(function () {
      state.syncedAt = Date.now();
      save();
      status.error = null;
      return true;
    }, function (e) {
      status.error = (e && e.error) || 'offline';
      return false;
    }).then(function (r) {
      syncing = null;
      status.busy = false;
      emit('status');
      if (again) { again = false; schedule(1000); }
      return r;
    });
    return syncing;
  }
  function schedule(ms) {
    if (!signedIn()) return;
    clearTimeout(timer);
    timer = setTimeout(sync, ms == null ? 2500 : ms);
  }
  /** Something worth saving happened (a game is over, a score changed). */
  function changed() { if (signedIn()) schedule(2500); }

  /* ----------------------------------------------------- sign in and out --- */
  function onSignedIn(res) {
    var before = keyOf(state.username);
    if (state.session && before && before !== keyOf(res.account.username)) stash();   // another account was active
    delete saved[keyOf(res.account.username)];
    saveSaved();
    state.remember = state.rememberNext !== false;
    state.session = res.session;
    state.username = res.account.username;
    state.email = res.account.email || '';
    state.world = !!res.account.world;
    state.remind = res.account.remind !== false;
    state.method = res.account.method || 'google';
    state.avatar = res.account.avatar || '';
    state.photo = '';
    state.photoHash = '';
    state.ver = 0;
    state.last = '';
    state.syncedAt = 0;
    save();
    adoptLocal();
    // A player name of this phone that was on the world list without an account is now the
    // account's: its old entry is removed, the account's takes its place.
    if (MBG.World && MBG.World.adopt) MBG.World.adopt(state.username);
    emit(before === keyOf(state.username) ? 'status' : 'signedin');
    return sync();
  }
  /** Forgets the session on this phone (games and names stay). keep: the name stays in the list
   *  of accounts on this phone, marked - choosing it asks for the password again. */
  function forget(keep) {
    if (keep && state.username) {
      saved[keyOf(state.username)] = { username: state.username, email: state.email || '', method: state.method || 'google',
        avatar: state.avatar || '', world: !!state.world, session: null };
      saveSaved();
    }
    state.session = null;
    state.username = null;
    state.email = null;
    state.world = false;
    state.avatar = '';
    state.photo = '';
    state.photoHash = '';
    state.ver = 0;
    state.last = '';
    save();
    emit('signedout');
  }
  function signOut() {
    var done = state.session ? api('/api/auth/logout', {}) : Promise.resolve();
    return done.then(function () { forget(true); return true; });
  }
  /** A deleted account leaves this phone too: its player name, high scores, statistics and
   *  puzzles of the day; whoever played under it plays as Anonymous now. */
  function removeLocal(name) {
    var L = libs(), k = keyOf(name);
    if (L.S) Object.keys(USERS).forEach(function (u) { new L.S.UserStore(Shell.store, USERS[u]).remove(name); });
    if (L.St) { var st = new L.St.StatsStore(Shell.store); if (st.data.p && st.data.p[k]) { delete st.data.p[k]; st.save(); } }
    if (L.D && L.D.keyFor) { try { Shell.store.removeItem(L.D.keyFor(name)); } catch (e) { /* ignore */ } }
    var prefs = Shell.getPrefs();
    if (Array.isArray(prefs.recent)) {
      prefs.recent = prefs.recent.filter(function (n) { return keyOf(n) !== k; });
      try { Shell.store.setItem(Shell.KEYS.prefs, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
    }
    var u = Shell.getUser();
    if (u.mode === 'registered' && keyOf(u.name) === k) Shell.setUser({ mode: 'anonymous' });
    delete saved[k];
    saveSaved();
  }
  function deleteAccount() {
    var name = state.username;
    return api('/api/account/delete', {}).then(function (r) {
      if (r.ok) { forget(); removeLocal(name); emit('deleted', name); }
      return r;
    });
  }

  /* ------------------------------------------- several accounts on one phone --- */
  /** What this phone knows about a player name: 'active' (signed in), 'saved' (signs in at once),
   *  'locked' (an account that needs its password again) or null (a name on this phone only). */
  function knows(name) {
    var k = keyOf(name);
    if (!k || !enabled()) return null;
    if (signedIn() && keyOf(state.username) === k) return 'active';
    var e = saved[k];
    return e ? (e.session ? 'saved' : 'locked') : null;
  }
  /** Makes a saved account the active one. Resolves 'ok', 'password' (sign in again) or 'unknown'. */
  function activate(name) {
    var k = keyOf(name), how = knows(name);
    if (how === 'active') return Promise.resolve('ok');
    if (how !== 'saved') return Promise.resolve(how === 'locked' ? 'password' : 'unknown');
    var e = saved[k];
    stash();
    delete saved[k];
    saveSaved();
    state.session = e.session;
    state.username = e.username;
    state.email = e.email;
    state.method = e.method;
    state.avatar = e.avatar;
    state.world = e.world;
    state.remember = true;
    state.photo = '';
    state.photoHash = '';
    state.ver = 0;
    state.last = '';
    state.syncedAt = 0;
    save();
    adoptLocal();
    emit('signedin');
    return sync().then(function () { return signedIn() ? 'ok' : 'password'; });
  }
  /** The player changed in a game: an account without "Stay signed in" signs out when left. */
  function playerChanged(before, after) {
    if (!signedIn() || !before || before.mode !== 'registered' || keyOf(before.name) !== keyOf(state.username)) return;
    if (after && after.mode === 'registered' && keyOf(after.name) === keyOf(state.username)) return;
    if (state.remember === false) signOut();
  }
  /** Sign-in sheet for a locked account: e-mail and password, the address filled in. */
  function signInFor(name) {
    var e = saved[keyOf(name)];
    if (!enabled()) return Promise.resolve();
    var d = sheet('dlgMbgAccount', 'acsheet');
    d.setAttribute('aria-labelledby', 'acTitle');
    if (e && e.method === 'email' && EMAIL && state.birthYear) { emailMemo = e.email; paintEmail(d, 'login', t('account.again', { name: e.username })); }
    else paintIntro(d, e ? t('account.again', { name: e.username }) : null);
    show(d);
    return whenClosed(d);
  }
  function setAvatar(code) {
    return api('/api/account/avatar', { avatar: code }).then(function (r) {
      if (r.ok) { state.avatar = code; save(); emit('picture'); }
      return r;
    });
  }
  function setPhoto(data) {
    return api('/api/account/photo', { data: data }).then(function (r) {
      if (r.ok) { state.photo = data || ''; state.photoHash = r.photo || ''; save(); emit('picture'); }
      return r;
    });
  }
  /** Applies a picture chosen before the account existed (while creating it). */
  function applyPending(pic) {
    if (!pic) return Promise.resolve();
    var steps = [];
    if (pic.avatar) steps.push(setAvatar(pic.avatar));
    if (pic.photo) steps.push(setPhoto(pic.photo));
    return Promise.all(steps);
  }
  /** Reminder e-mails on or off (version 1.7). Resolves the server's answer. */
  function setRemind(on) {
    return api('/api/account/remind', { remind: !!on }).then(function (r) {
      if (r.ok) { state.remind = !!r.remind; save(); }
      return r;
    });
  }
  function setWorld(on) {
    return api('/api/account/world', { world: !!on }).then(function (r) {
      if (r.ok) { state.world = !!on; save(); emit('world'); }
      return r;
    });
  }

  /* -------------------------------------------------------------- dialogs --- */
  function sheet(id, cls) {
    var d = document.getElementById(id);
    if (d) return d;
    d = el('dialog', 'dlg sheet ' + cls);
    d.id = id;
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    return d;
  }
  function small(id) {
    var d = sheet(id, 'acsmall');
    d.classList.remove('sheet');
    return d;
  }
  function show(d) { if (d.open) return; try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
  function whenClosed(d) {
    return new Promise(function (resolve) {
      d.addEventListener('close', function once() { d.removeEventListener('close', once); resolve(d.returnValue); });
    });
  }
  function toast(msg) { if (MBG.Paywall && MBG.Paywall.toast) MBG.Paywall.toast(msg); }
  function errorText(e) {
    var k = { offline: 'account.failed', server: 'account.failed', rate: 'account.rate', banned: 'account.banned',
      disabled: 'account.disabled', expired: 'account.expired', token: 'account.failed', taken: 'account.taken',
      name: 'account.rude', invalid: 'account.invalid', email: 'account.badEmail', password: 'account.badPassword',
      exists: 'account.exists', google: 'account.useGoogle', wrong: 'account.wrong', code: 'account.badCode',
      mail: 'account.mailFailed' }[e] || 'account.failed';
    return k;
  }
  var MAIL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4.5 7l7.5 6 7.5-6"/></svg>';
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5"/></svg>';

  /** The account sheet: sign in (signed out) or the account (signed in). Resolves when closed. */
  function open() {
    if (!enabled()) return Promise.resolve();
    var d = sheet('dlgMbgAccount', 'acsheet');
    d.setAttribute('aria-labelledby', 'acTitle');
    if (signedIn()) paintMe(d); else paintIntro(d);
    show(d);
    if (signedIn()) sync();
    return whenClosed(d);
  }
  function head(d, title) {
    d.innerHTML = '<div class="sheet-head"><h2 id="acTitle"></h2><button type="button" class="btn ghost small" id="acX"></button></div>' +
      '<div class="sheet-scroll ac" id="acBody"></div>';
    d.querySelector('#acTitle').textContent = title;
    d.querySelector('#acX').textContent = t('btn.close');
    d.querySelector('#acX').addEventListener('click', function () { d.close(); });
    return d.querySelector('#acBody');
  }
  /**
   * Version 1.7.2: the main button of a screen (Send code, Sign in, Create account, Confirm) also
   * sits at the top right, next to Close - always visible, also before scrolling down.
   */
  function headAction(d, label, fn) {
    var x = d.querySelector('#acX');
    var box = el('span', 'head-actions');
    x.parentNode.insertBefore(box, x);
    var b = el('button', 'btn submit small', label);
    b.type = 'button';
    b.id = 'acGoTop';
    b.addEventListener('click', fn);
    box.appendChild(b);
    box.appendChild(x);
    return b;
  }
  function message(body) {
    var m = el('p', 'pw-msg');
    m.setAttribute('role', 'status');
    m.setAttribute('aria-live', 'polite');
    m.hidden = true;
    body.appendChild(m);
    return function (text, good) { m.textContent = text || ''; m.hidden = !text; m.classList.toggle('ok', !!good); };
  }
  function privacyLine(body) {
    var p = el('p', 'ac-fine', (googleOn() ? t('account.how') + ' ' : '') + (EMAIL ? t('account.howEmail') + ' ' : ''));
    var a = el('a', null, t('home.privacy'));
    a.href = 'privacy.html';
    p.appendChild(a);
    body.appendChild(p);
  }

  /* signed out: what an account gives, the age question, Google's button */
  function paintIntro(d, note) {
    var body = head(d, t('account.title'));
    body.appendChild(el('p', 'ac-lede', t('account.lede')));
    if (state.young) {
      body.appendChild(el('p', 'pw-msg', t('account.young')));
      return;
    }
    var say = message(body);
    var label = el('label', 'fieldlabel', t('world.birthYear'));
    label.htmlFor = 'acYear';
    var select = el('select', 'textfield');
    select.id = 'acYear';
    var year = new Date().getFullYear();
    select.appendChild(new Option(t('world.choose'), ''));
    for (var y = year; y >= year - 100; y--) select.appendChild(new Option(String(y), String(y)));
    if (state.birthYear) select.value = String(state.birthYear);
    body.appendChild(label);
    body.appendChild(select);
    var box = el('div', 'ac-google-box');
    body.appendChild(box);
    if (googleOn()) rememberBox(body);
    var mailBox = el('div', 'ac-mail-box');
    body.appendChild(mailBox);
    privacyLine(body);
    if (note) say(note);

    var busy = false;
    var gotToken = function (token) {
      if (busy) return;
      busy = true;
      say(t('account.wait'), true);
      api('/api/auth/google', { idToken: token }).then(function (r) {
        busy = false;
        if (r.ok) {
          onSignedIn(r).then(function () { paintMe(d); toast(t('account.welcome', { name: state.username })); });
          paintMe(d);
          return;
        }
        if (r.error === 'new') { paintChoose(d, token, r.email); return; }
        say(t(errorText(r.error)));
      });
    };
    var fail = function () { busy = false; say(t('account.failed')); };
    var paintButton = function () {
      box.textContent = '';
      mailBox.textContent = '';
      if (!select.value) { box.appendChild(el('p', 'ac-fine', t('account.yearFirst'))); return; }
      var by = Number(select.value);
      if (year - by - 1 < MIN_AGE) {                 // the birthday may still come this year
        state.young = true;
        delete state.birthYear;
        save();
        paintIntro(d);
        return;
      }
      state.birthYear = by;
      save();
      if (EMAIL) {
        // Two plain choices: a new account, or signing in to an existing one.
        mailBox.textContent = '';
        if (googleOn()) mailBox.appendChild(el('p', 'ac-or', t('account.or')));
        [['signup', 'account.emailNew'], ['login', 'account.emailHave']].forEach(function (x) {
          var eb = el('button', 'btn ac-google ac-email' + (x[0] === 'login' ? ' ac-quiet' : ''));
          eb.type = 'button';
          eb.innerHTML = MAIL_ICON;
          eb.appendChild(el('span', null, t(x[1])));
          eb.addEventListener('click', function () { paintEmail(d, x[0]); });
          mailBox.appendChild(eb);
        });
      }
      if (!googleOn()) return;
      if (Shell.native) {
        var b = el('button', 'btn ac-google');
        b.type = 'button';
        b.innerHTML = ICON;
        b.appendChild(el('span', null, t('account.google')));
        b.addEventListener('click', function () {
          if (busy) return;
          say('');
          nativeToken().then(gotToken, function (e) {
            // Closing Google's account picker is not an error worth a message.
            if (!/cancel/i.test(String(e && (e.message || e.code)))) fail();
          });
        });
        box.appendChild(b);
      } else {
        webButton(box, gotToken, fail);
      }
    };
    select.addEventListener('change', paintButton);
    paintButton();
  }

  /* pictures: the picker (an avatar, a photo, or none) */
  var pendingPic = null;          // a picture chosen while an account is being created
  /**
   * Opens the picture picker. pic = { avatar, photo } now; onChange(pic) with the new choice.
   * Picking an avatar (or none) removes a photo, so what is picked is what is shown.
   */
  function openPicker(pic, onChange) {
    var r = sheet('dlgMbgPicture', 'acsheet acpicker');
    r.innerHTML = '<div class="sheet-head"><h2 id="pcTitle"></h2><button type="button" class="btn ghost small" data-v="x"></button></div>' +
      '<div class="sheet-scroll ac" id="pcBody"></div>';
    r.setAttribute('aria-labelledby', 'pcTitle');
    r.querySelector('#pcTitle').textContent = t('account.picTitle');
    r.querySelector('[data-v="x"]').textContent = t('btn.close');
    r.querySelector('[data-v="x"]').addEventListener('click', function () { r.close(); });
    var body = r.querySelector('#pcBody');
    body.appendChild(el('p', 'ac-fine', t('account.picText')));
    var say = message(body);
    var file = el('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    body.appendChild(file);
    var up = el('button', 'btn ghost ac-upload');
    up.type = 'button';
    up.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><circle cx="12" cy="12" r="3.2"/><path d="M8.5 5.5l1.2-2h4.6l1.2 2"/></svg>';
    up.appendChild(el('span', null, t('account.picUpload')));
    up.addEventListener('click', function () { file.click(); });
    body.appendChild(up);
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      say(t('account.wait'), true);
      shrinkPhoto(f).then(function (data) {
        return Promise.resolve(onChange({ avatar: pic.avatar || '', photo: data })).then(function (res) {
          if (res && res.ok === false) throw new Error(res.error);
          toast(t('account.picSaved'));
          r.close();
        });
      }).catch(function () { say(t('account.picFailed')); });
    });
    var grid = el('div', 'av-grid');
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', t('account.picTitle'));
    var choose = function (code) {
      Promise.resolve(onChange({ avatar: code, photo: '' })).then(function (res) {
        if (res && res.ok === false) { say(t(errorText(res.error))); return; }
        toast(t('account.picSaved'));
        r.close();
      });
    };
    var cell = function (code, label) {
      var b = el('button', 'av-pick');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      var on = !pic.photo && (pic.avatar || '') === code;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      if (on) b.classList.add('on');
      b.setAttribute('aria-label', label);
      b.appendChild(pictureNode(code, '', 'av-md'));
      b.addEventListener('click', function () { choose(code); });
      grid.appendChild(b);
    };
    cell('', t('account.picDefault'));
    AVATARS.forEach(function (a, i) { cell('e:' + i, a[0]); });
    body.appendChild(grid);
    show(r);
    return whenClosed(r);
  }
  /** The picture row of a form that creates an account (the choice is applied once it exists). */
  function pendingRow(body) {
    pendingPic = { avatar: '', photo: '' };
    var row = el('div', 'ac-picrow');
    var holder = el('span');
    var paint = function () { holder.textContent = ''; holder.appendChild(pictureNode(pendingPic.avatar, pendingPic.photo, 'av-md')); };
    paint();
    row.appendChild(holder);
    var b = el('button', 'linkbtn', t('account.picChange'));
    b.type = 'button';
    b.addEventListener('click', function () {
      openPicker(pendingPic, function (pic) { pendingPic = pic; paint(); });
    });
    row.appendChild(b);
    body.appendChild(el('span', 'fieldlabel', t('account.pic')));
    body.appendChild(row);
  }
  function afterCreate() {
    var pic = pendingPic;
    pendingPic = null;
    return applyPending(pic);
  }

  /** Version 1.7: "Don't send me game reminders" - not ticked, so reminders are on by default. */
  function remindBox(body) {
    var opt = el('label', 'wj-agree ac-remind');
    var box = el('input');
    box.type = 'checkbox';
    box.id = 'acNoRemind';
    opt.appendChild(box);
    opt.appendChild(el('span', null, ' ' + t('account.remindOpt')));
    body.appendChild(opt);
    body.appendChild(el('p', 'ac-fine', t('account.remindText')));
    return box;
  }

  /* a new account: the username and the world-list choice */
  function paintChoose(d, token, email) {
    var body = head(d, t('account.chooseTitle'));
    if (email) body.appendChild(el('p', 'ac-fine', t('account.email', { email: email })));
    body.appendChild(el('p', null, t('account.chooseText')));
    var label = el('label', 'fieldlabel', t('account.usernameLabel'));
    label.htmlFor = 'acName';
    var input = el('input', 'textfield');
    input.id = 'acName';
    input.type = 'text';
    input.maxLength = 20;
    input.autocomplete = 'username';
    input.setAttribute('autocapitalize', 'words');
    input.spellcheck = false;
    var u = Shell.getUser();
    if (u.mode === 'registered' && u.name && (!MBG.Storage || !MBG.Storage.validateUsername(u.name))) input.value = u.name;
    body.appendChild(label);
    body.appendChild(input);
    pendingRow(body);
    var opt = el('label', 'wj-agree');
    var box = el('input');
    box.type = 'checkbox';
    box.id = 'acWorld';
    opt.appendChild(box);
    opt.appendChild(el('span', null, ' ' + t('account.worldOpt')));
    body.appendChild(opt);
    body.appendChild(el('p', 'ac-fine', t('account.worldText')));
    body.appendChild(el('h3', null, t('world.rulesTitle')));
    var rules = el('ul', 'wj-rules');
    t('world.rules').forEach(function (r) { rules.appendChild(el('li', null, r)); });
    body.appendChild(rules);
    var noRemind = remindBox(body);
    var say = message(body);
    var actions = el('div', 'dlg-actions');
    var no = el('button', 'btn ghost', t('dlg.cancel'));
    no.type = 'button';
    var yes = el('button', 'btn submit', t('account.create'));
    yes.type = 'button';
    actions.appendChild(no);
    actions.appendChild(yes);
    body.appendChild(actions);
    no.addEventListener('click', function () { paintIntro(d); });
    var busy = false;
    var go = function () {
      if (busy) return;
      var name = input.value.normalize('NFC').trim();
      var bad = MBG.Storage ? MBG.Storage.validateUsername(name) : (name.length < 2 ? 'invalid' : null);
      if (bad) { say(t(bad === 'reserved' ? 'account.rude' : 'account.invalid')); input.focus(); return; }
      busy = true;
      say(t('account.wait'), true);
      api('/api/auth/google', { idToken: token, username: name, world: box.checked, remind: !noRemind.checked, lang: Shell.getLang() }).then(function (r) {
        busy = false;
        if (r.ok) {
          onSignedIn(r).then(afterCreate).then(function () { if (d.open) paintMe(d); });
          paintMe(d);
          toast(t('account.welcome', { name: state.username }));
          return;
        }
        if (r.error === 'expired' || r.error === 'token') { paintIntro(d, t('account.expired')); return; }
        say(r.error === 'taken' ? t('account.taken', { name: name }) : t(errorText(r.error)));
        input.focus();
      });
    };
    yes.addEventListener('click', go);
    headAction(d, t('account.create'), go);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); go(); } });
    setTimeout(function () { try { input.focus(); } catch (e) { /* ignore */ } }, 30);
  }

  /* e-mail and password: sign in, new account, forgotten password, the e-mailed code */
  function field(body, id, label, type, opts) {
    opts = opts || {};
    var l = el('label', 'fieldlabel', label);
    l.htmlFor = id;
    var i = el('input', 'textfield');
    i.id = id;
    i.type = type;
    if (opts.auto) i.autocomplete = opts.auto;
    if (opts.max) i.maxLength = opts.max;
    if (opts.mode) i.inputMode = opts.mode;
    if (opts.value) i.value = opts.value;
    i.spellcheck = false;
    i.setAttribute('autocapitalize', opts.cap || 'none');
    body.appendChild(l);
    if (type === 'password') {
      // An eye button shows the password while typing (and hides it again).
      var wrap = el('div', 'pwfield');
      var eye = el('button', 'pw-eye');
      eye.type = 'button';
      eye.setAttribute('aria-controls', id);
      var show = function (on) {
        i.type = on ? 'text' : 'password';
        eye.setAttribute('aria-pressed', on ? 'true' : 'false');
        eye.setAttribute('aria-label', t(on ? 'account.hidePassword' : 'account.showPassword'));
        eye.innerHTML = on ? EYE_OFF : EYE;
      };
      eye.addEventListener('click', function () { show(i.type === 'password'); i.focus(); });
      show(false);
      wrap.appendChild(i);
      wrap.appendChild(eye);
      body.appendChild(wrap);
    } else body.appendChild(i);
    if (opts.hint) body.appendChild(el('p', 'ac-fine', opts.hint));
    return i;
  }
  var EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  /** "Stay signed in on this phone" - ticked by default; the choice is kept for the next sign-in. */
  function rememberBox(body) {
    var l = el('label', 'wj-agree ac-remember');
    var c = el('input');
    c.type = 'checkbox';
    c.id = 'acRemember';
    c.checked = state.rememberNext !== false;
    c.addEventListener('change', function () { state.rememberNext = c.checked; save(); });
    l.appendChild(c);
    l.appendChild(el('span', null, ' ' + t('account.remember')));
    body.appendChild(l);
    return c;
  }
  function actions(body, backText, goText, onBack, onGo) {
    var row = el('div', 'dlg-actions');
    var no = el('button', 'btn ghost', backText);
    no.type = 'button';
    var yes = el('button', 'btn submit', goText);
    yes.type = 'button';
    row.appendChild(no);
    row.appendChild(yes);
    body.appendChild(row);
    no.addEventListener('click', onBack);
    yes.addEventListener('click', onGo);
    return yes;
  }
  function onEnter(inputs, fn) {
    inputs.forEach(function (i) {
      i.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); fn(); } });
    });
  }
  var emailMemo = '';
  function paintEmail(d, mode, note) {
    var body = head(d, mode === 'reset' ? t('account.resetTitle') : t('account.title'));
    if (mode !== 'reset') {
      var tabs = el('div', 'seg ac-tabs');
      tabs.setAttribute('role', 'tablist');
      [['login', t('account.tabLogin')], ['signup', t('account.tabNew')]].forEach(function (x) {
        var b = el('button', 'seg-btn' + (x[0] === mode ? ' on' : ''), x[1]);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', x[0] === mode ? 'true' : 'false');
        b.addEventListener('click', function () { if (x[0] !== mode) paintEmail(d, x[0]); });
        tabs.appendChild(b);
      });
      body.appendChild(tabs);
    } else {
      body.appendChild(el('p', null, t('account.resetText')));
    }
    var mail = field(body, 'acMail', t('account.emailLabel'), 'email', { auto: 'email', max: 254, mode: 'email', value: emailMemo });
    var pass = null, name = null, world = null, noRemind = null;
    if (mode !== 'reset') {
      pass = field(body, 'acPass', t('account.passwordLabel'), 'password',
        { auto: mode === 'login' ? 'current-password' : 'new-password', max: 200, hint: mode === 'signup' ? t('account.passwordHint') : null });
    }
    if (mode === 'signup') {
      var u = Shell.getUser();
      name = field(body, 'acName', t('account.usernameLabel'), 'text',
        { auto: 'username', max: 20, cap: 'words', value: u.mode === 'registered' && u.name && (!MBG.Storage || !MBG.Storage.validateUsername(u.name)) ? u.name : '' });
      body.appendChild(el('p', 'ac-fine', t('account.chooseText')));
      pendingRow(body);
      var opt = el('label', 'wj-agree');
      world = el('input');
      world.type = 'checkbox';
      world.id = 'acWorld';
      opt.appendChild(world);
      opt.appendChild(el('span', null, ' ' + t('account.worldOpt')));
      body.appendChild(opt);
      body.appendChild(el('p', 'ac-fine', t('account.worldText')));
      body.appendChild(el('h3', null, t('world.rulesTitle')));
      var rules = el('ul', 'wj-rules');
      t('world.rules').forEach(function (r) { rules.appendChild(el('li', null, r)); });
      body.appendChild(rules);
      noRemind = remindBox(body);
    }
    if (mode !== 'reset') rememberBox(body);
    var say = message(body);
    if (note) say(note, true);
    var busy = false;
    var go = function () {
      if (busy) return;
      var email = mail.value.trim();
      emailMemo = email;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say(t('account.badEmail')); mail.focus(); return; }
      if (pass && mode === 'signup' && Array.from(pass.value).length < MIN_PASSWORD) { say(t('account.badPassword')); pass.focus(); return; }
      if (pass && mode === 'login' && !pass.value) { pass.focus(); return; }
      var uname = name ? name.value.normalize('NFC').trim() : '';
      if (name) {
        var bad = MBG.Storage ? MBG.Storage.validateUsername(uname) : (uname.length < 2 ? 'invalid' : null);
        if (bad) { say(t(bad === 'reserved' ? 'account.rude' : 'account.invalid')); name.focus(); return; }
      }
      busy = true;
      say(t('account.wait'), true);
      var lang = Shell.getLang();
      var req = mode === 'login' ? api('/api/auth/email/login', { email: email, password: pass.value })
        : mode === 'signup' ? api('/api/auth/email/start', { email: email, password: pass.value, username: uname, world: world.checked, remind: !noRemind.checked, lang: lang })
        : api('/api/auth/email/reset', { email: email, lang: lang });
      req.then(function (r) {
        busy = false;
        if (r.ok && mode === 'login') { signedInFromEmail(d, r); return; }
        if (r.ok) { paintCode(d, mode, email); return; }
        say(r.error === 'taken' ? t('account.taken', { name: uname }) : t(errorText(r.error)));
      });
    };
    var back = function () { if (mode === 'reset') paintEmail(d, 'login'); else paintIntro(d); };
    actions(body, t('account.back'), mode === 'login' ? t('account.signInEmail') : t('account.sendCode'), back, go);
    headAction(d, mode === 'login' ? t('account.signInEmail') : t('account.sendCode'), go);
    if (mode === 'login') {
      var forgot = el('button', 'linkbtn', t('account.forgot'));
      forgot.type = 'button';
      forgot.addEventListener('click', function () { emailMemo = mail.value.trim(); paintEmail(d, 'reset'); });
      body.appendChild(forgot);
    }
    onEnter([mail, pass, name].filter(Boolean), go);
    setTimeout(function () { try { (mail.value ? (pass || mail) : mail).focus(); } catch (e) { /* ignore */ } }, 30);
  }
  function signedInFromEmail(d, r, note) {
    onSignedIn(r).then(r.created ? afterCreate : null).then(function () { if (d.open) paintMe(d); });
    paintMe(d);
    toast(note || t('account.welcome', { name: state.username }));
  }
  /* the 6-digit code from the e-mail (a new account, or a new password) */
  function paintCode(d, mode, email) {
    var body = head(d, t('account.codeTitle'));
    body.appendChild(el('p', null, t('account.codeText', { email: email })));
    var code = field(body, 'acCode', t('account.codeLabel'), 'text', { auto: 'one-time-code', max: 6, mode: 'numeric' });
    code.classList.add('ac-code');
    var pass = mode === 'reset' ? field(body, 'acPass', t('account.newPasswordLabel'), 'password', { auto: 'new-password', max: 200, hint: t('account.passwordHint') }) : null;
    var say = message(body);
    var busy = false;
    var go = function () {
      if (busy) return;
      var c = code.value.replace(/\D/g, '');
      if (c.length !== 6) { say(t('account.badCode')); code.focus(); return; }
      if (pass && Array.from(pass.value).length < MIN_PASSWORD) { say(t('account.badPassword')); pass.focus(); return; }
      busy = true;
      say(t('account.wait'), true);
      var req = mode === 'reset' ? api('/api/auth/email/reset-confirm', { email: email, code: c, password: pass.value })
        : api('/api/auth/email/verify', { email: email, code: c });
      req.then(function (r) {
        busy = false;
        if (r.ok) { signedInFromEmail(d, r, mode === 'reset' ? t('account.passwordSet') : null); return; }
        say(t(r.error === 'expired' ? 'account.codeExpired' : errorText(r.error)));
      });
    };
    actions(body, t('account.back'), t('account.confirm'), function () { paintEmail(d, mode === 'reset' ? 'reset' : 'signup'); }, go);
    headAction(d, t('account.confirm'), go);
    var again = el('button', 'linkbtn', t('account.resend'));
    again.type = 'button';
    again.addEventListener('click', function () {
      // A new account needs its details again (the password is never kept on the phone): back to the form.
      if (mode !== 'reset') { paintEmail(d, 'signup'); return; }
      api('/api/auth/email/reset', { email: email, lang: Shell.getLang() }).then(function (r) { say(r.ok ? t('account.resent') : t(errorText(r.error)), r.ok); });
    });
    body.appendChild(again);
    onEnter([code, pass].filter(Boolean), go);
    setTimeout(function () { try { code.focus(); } catch (e) { /* ignore */ } }, 30);
  }

  /* signed in: who, saved when, world list, statistics, sign out, delete */
  function syncLine() {
    if (status.busy) return t('account.syncing');
    if (status.error && status.error !== 'session') return t('account.notSaved');
    if (state.syncedAt) return t('account.saved', { time: new Date(state.syncedAt).toLocaleTimeString(Shell.getLang(), { hour: '2-digit', minute: '2-digit' }) });
    return t('account.syncing');
  }
  function paintMe(d) {
    if (!signedIn()) { paintIntro(d); return; }
    var body = head(d, t('account.title'));
    var who = el('div', 'ac-who');
    var picBtn = el('button', 'ac-picbtn');
    picBtn.type = 'button';
    picBtn.setAttribute('aria-label', t('account.picChange'));
    picBtn.appendChild(pictureNode(state.avatar, state.photo, 'av-lg'));
    picBtn.addEventListener('click', function () { changePicture().then(function () { if (d.open) paintMe(d); }); });
    who.appendChild(picBtn);
    var txt = el('span', 'ac-who-text');
    txt.appendChild(el('strong', null, state.username));
    if (state.email) txt.appendChild(el('span', null, t(state.method === 'email' ? 'account.emailAddr' : 'account.email', { email: state.email })));
    var chg = el('button', 'linkbtn', t('account.picChange'));
    chg.type = 'button';
    chg.addEventListener('click', function () { changePicture().then(function () { if (d.open) paintMe(d); }); });
    txt.appendChild(chg);
    who.appendChild(txt);
    body.appendChild(who);
    var line = el('p', 'ac-sync', syncLine());
    line.setAttribute('aria-live', 'polite');
    body.appendChild(line);
    body.appendChild(el('p', 'ac-fine', t('account.what')));

    var rowW = el('div', 'ac-row');
    rowW.appendChild(el('span', null, '🏆 ' + t('world.title')));
    var wb = el('button', 'btn ghost small', state.world ? t('world.on') : t('world.off'));
    wb.type = 'button';
    wb.setAttribute('aria-label', t('world.title') + ': ' + (state.world ? t('world.on') : t('world.off')));
    wb.addEventListener('click', function () {
      (state.world ? confirmWorldOff() : joinWorld()).then(function () { if (d.open) paintMe(d); });
    });
    rowW.appendChild(wb);
    body.appendChild(rowW);

    // Version 1.7: one friendly e-mail after about 3 days without playing (on by default).
    if (state.email) {
      var rowR = el('div', 'ac-row');
      rowR.appendChild(el('span', null, '✉️ ' + t('account.remind')));
      var on = state.remind !== false;
      var rb = el('button', 'btn ghost small', on ? t('world.on') : t('world.off'));
      rb.type = 'button';
      rb.setAttribute('aria-label', t('account.remind') + ': ' + (on ? t('world.on') : t('world.off')));
      rb.addEventListener('click', function () {
        rb.disabled = true;
        setRemind(!on).then(function (r) {
          toast(r.ok ? t(r.remind ? 'account.remindOnDone' : 'account.remindOffDone') : t('world.offline'));
          if (d.open) paintMe(d);
        });
      });
      rowR.appendChild(rb);
      body.appendChild(rowR);
      body.appendChild(el('p', 'ac-fine', t('account.remindText')));
    }

    var actions = el('div', 'ac-actions');
    if (MBG.Sheets && MBG.Sheets.openStats) {
      var st = el('button', 'btn ghost', '📊 ' + t('stats.title'));
      st.type = 'button';
      st.addEventListener('click', function () { d.close(); setTimeout(function () { MBG.Sheets.openStats({}); }, 0); });
      actions.appendChild(st);
    }
    var out = el('button', 'btn ghost', t('account.signOut'));
    out.type = 'button';
    out.addEventListener('click', function () {
      signOut().then(function () { toast(t('account.signedOut')); if (d.open) paintIntro(d); });
    });
    actions.appendChild(out);
    body.appendChild(actions);
    var del = el('button', 'linkbtn ac-delete', t('account.delete'));
    del.type = 'button';
    del.addEventListener('click', function () {
      confirmDelete().then(function (gone) { if (gone && d.open) paintIntro(d); });
    });
    body.appendChild(del);

    var onStatus = function (type) {
      if (!d.open) { listeners.splice(listeners.indexOf(onStatus), 1); return; }
      if (type === 'status') line.textContent = syncLine();
    };
    listeners.push(onStatus);
  }

  /** The signed-in account changes its picture. */
  function changePicture() {
    return openPicker({ avatar: state.avatar || '', photo: state.photo || '' }, function (pic) {
      if (pic.photo && pic.photo !== state.photo) return setPhoto(pic.photo);
      var steps = [setAvatar(pic.avatar)];
      if (state.photo) steps.push(setPhoto(null));
      return Promise.all(steps).then(function (rs) { return rs.filter(function (x) { return !x.ok; })[0] || { ok: true }; });
    });
  }

  function confirmBox(id, title, text, okText, danger) {
    var r = small(id);
    r.innerHTML = '<div class="dlg-body"><h2></h2><p></p><div class="dlg-actions">' +
      '<button type="button" class="btn ghost" data-v="no"></button><button type="button" class="btn submit" data-v="ok"></button></div></div>';
    r.querySelector('h2').textContent = title;
    r.querySelector('p').textContent = text;
    r.querySelector('[data-v="no"]').textContent = t('dlg.cancel');
    var ok = r.querySelector('[data-v="ok"]');
    ok.textContent = okText;
    if (danger) ok.classList.add('danger');
    var answer = false;
    r.querySelector('[data-v="no"]').addEventListener('click', function () { r.close(); });
    ok.addEventListener('click', function () { answer = true; r.close(); });
    show(r);
    return whenClosed(r).then(function () { return answer; });
  }
  function confirmDelete() {
    return confirmBox('dlgMbgDelete', t('account.deleteTitle'), t('account.deleteText', { name: state.username }), t('account.deleteOk'), true)
      .then(function (yes) {
        if (!yes) return false;
        return deleteAccount().then(function (r) {
          toast(r.ok ? t('account.deleted') : t('account.failed'));
          return !!r.ok;
        });
      });
  }
  function confirmWorldOff() {
    return confirmBox('dlgMbgWorldOff', t('world.leaveTitle'), t('world.leaveText', { name: state.username }), t('world.leaveOk'))
      .then(function (yes) {
        if (!yes) return false;
        return setWorld(false).then(function (r) { toast(r.ok ? t('world.left') : t('world.offline')); return !!r.ok; });
      });
  }
  /** The account's username joins the world list: the rules, "I agree", done. Resolves true when on. */
  function joinWorld() {
    if (!signedIn()) return Promise.resolve(false);
    if (state.world) return Promise.resolve(true);
    var r = sheet('dlgMbgWorld', 'worldjoin');
    r.innerHTML = '<div class="sheet-head"><h2></h2><span class="head-actions"><button type="button" class="btn submit small" data-v="top" disabled></button>' +
      '<button type="button" class="btn ghost small" data-v="x"></button></span></div>' +
      '<div class="sheet-scroll wj"><p class="wj-name"></p><p class="wj-text"></p><h3></h3><ul class="wj-rules"></ul>' +
      '<label class="wj-agree"><input type="checkbox"> <span></span></label><p class="pw-msg" hidden></p>' +
      '<div class="dlg-actions"><button type="button" class="btn ghost" data-v="no"></button>' +
      '<button type="button" class="btn submit" data-v="ok" disabled></button></div></div>';
    var q = function (s) { return r.querySelector(s); };
    q('h2').textContent = t('world.joinTitle');
    q('[data-v="x"]').textContent = t('btn.close');
    q('.wj-name').textContent = t('world.joinAs', { name: state.username });
    q('.wj-text').textContent = t('account.worldText');
    q('h3').textContent = t('world.rulesTitle');
    t('world.rules').forEach(function (x) { q('.wj-rules').appendChild(el('li', null, x)); });
    q('.wj-agree span').textContent = t('world.agree');
    q('[data-v="no"]').textContent = t('world.notNow');
    q('[data-v="ok"]').textContent = t('world.joinOk');
    q('[data-v="top"]').textContent = t('world.joinOk');
    var box = q('.wj-agree input'), result = false;
    box.addEventListener('change', function () { q('[data-v="ok"]').disabled = q('[data-v="top"]').disabled = !box.checked; });
    q('[data-v="top"]').addEventListener('click', function () { q('[data-v="ok"]').click(); });
    q('[data-v="x"]').addEventListener('click', function () { r.close(); });
    q('[data-v="no"]').addEventListener('click', function () { r.close(); });
    q('[data-v="ok"]').addEventListener('click', function () {
      q('[data-v="ok"]').disabled = true;
      setWorld(true).then(function (res) {
        if (res.ok) { result = true; r.close(); return; }
        q('.pw-msg').textContent = t(res.error === 'offline' ? 'world.offline' : errorText(res.error));
        q('.pw-msg').hidden = false;
        q('[data-v="ok"]').disabled = false;
      });
    });
    show(r);
    return whenClosed(r).then(function () { return result; });
  }

  /* ------------------------------------------------------------- start up --- */
  if (enabled() && signedIn()) {
    // Opening a page syncs (at most once a minute); leaving the app saves what is waiting.
    if (!state.syncedAt || Date.now() - state.syncedAt > SYNC_EVERY) setTimeout(sync, 1200);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && timer) { clearTimeout(timer); sync(); }
      else if (!document.hidden && Date.now() - (state.syncedAt || 0) > SYNC_EVERY) schedule(800);
    });
    root.addEventListener('online', function () { schedule(800); });
    root.addEventListener('mbg:leave', function () { if (timer) { clearTimeout(timer); sync(); } });
  }

  MBG.Account = {
    MIN_AGE: MIN_AGE,
    enabled: enabled,
    knows: knows,
    activate: activate,
    playerChanged: playerChanged,
    signInFor: signInFor,
    /** Which ways to sign in this build offers: { google, email }. */
    ways: function () { return { google: googleOn(), email: EMAIL }; },
    signedIn: signedIn,
    username: function () { return signedIn() ? state.username : null; },
    email: function () { return signedIn() ? state.email : null; },
    world: function () { return signedIn() && !!state.world; },
    /** Version 1.7: reminder e-mails on (default) or off for the signed-in account. */
    remind: function () { return signedIn() && state.remind !== false; },
    setRemind: setRemind,
    session: function () { return signedIn() ? state.session : null; },
    method: function () { return signedIn() ? state.method || 'google' : null; },
    AVATARS: AVATARS,
    /** The own picture (photo, avatar or default) as an element. */
    picture: function (cls) { return pictureNode(signedIn() ? state.avatar : '', signedIn() ? state.photo : '', cls); },
    /** Another player's avatar (never a photo) as an element. */
    avatarNode: function (code, cls) { return pictureNode(code, '', cls); },
    changePicture: changePicture,
    isMine: function (name) { return signedIn() && !!name && keyOf(name) === keyOf(state.username); },
    young: function () { return !!state.young; },
    open: open,
    joinWorld: joinWorld,
    setWorld: setWorld,
    sync: sync,
    changed: changed,
    signOut: signOut,
    onChange: function (fn) { listeners.push(fn); },
    // for the tests
    _collect: collect, _absorb: absorb, _state: function () { return state; },
    _onSignedIn: onSignedIn, _deleteAccount: deleteAccount
  };
})(typeof self !== 'undefined' ? self : globalThis);
