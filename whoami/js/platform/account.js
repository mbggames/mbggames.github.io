/*!
 * MBG Games - the player and the MBG account (FR-003, section 3).
 *
 * One MBG account for every MBG game: it signs in on the MBG Puzzles server (MBG.WORLD_URL) with
 * Google or e-mail and password - the same accounts, the same endpoints, the same session keys -
 * and the platform server (MBG.PLATFORM_URL) accepts that session. Each game keeps its own
 * ratings and statistics (FR-004).
 * Without a server (demo) the player is a name on this device with an avatar; the screens say
 * that accounts come with the server. E-mail addresses never appear to other players.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell;
  var el = Shell.el, t = Shell.t;
  var KEY = 'MBG.Platform.account';
  var WORLD = String(MBG.WORLD_URL || '').replace(/\/+$/, '');
  var CLIENT_ID = String(MBG.GOOGLE_CLIENT_ID || '');
  // the child-safe avatars of MBG Puzzles ('e:0' … 'e:23')
  var AVATARS = [['🦊', '#F7C9A8'], ['🐼', '#DDE3E8'], ['🐨', '#D3DCE6'], ['🦁', '#F6D9A0'], ['🐯', '#F9CFA0'], ['🐸', '#C9EBC2'],
    ['🐵', '#EBD3B8'], ['🐧', '#CFE0F2'], ['🦉', '#E3D5C3'], ['🐙', '#F5C6D6'], ['🦄', '#E6D3F5'], ['🐢', '#CDEBD0'],
    ['🐬', '#C5E3F6'], ['🦋', '#D7DAF7'], ['🐝', '#FBE7A1'], ['🐞', '#F8C9C4'], ['🌻', '#FCEBB0'], ['🌵', '#D3EDCB'],
    ['⭐', '#FFF0B3'], ['🌙', '#D9DDF2'], ['🚀', '#D2E4F7'], ['⚽', '#E2E8EC'], ['🎸', '#F6D2C2'], ['🎨', '#F3D9EE']];
  var SILHOUETTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5"/></svg>';

  function state() { return Shell.readJson(KEY, {}) || {}; }
  function setState(s) { Shell.writeJson(KEY, s); }
  function avatar() { var p = Shell.getPrefs().avatar; return typeof p === 'string' ? p : ''; }
  function picture(code, cls) {
    var n = el('span', 'av ' + (cls || ''));
    n.setAttribute('aria-hidden', 'true');
    var m = /^e:(\d+)$/.exec(code || ''), i = m ? Number(m[1]) : -1;
    if (i >= 0 && i < AVATARS.length) { n.textContent = AVATARS[i][0]; n.style.background = AVATARS[i][1]; n.classList.add('av-emoji'); }
    else { n.innerHTML = SILHOUETTE; n.classList.add('av-none'); }
    return n;
  }
  function paintButton(btn) {
    if (!btn) return;
    btn.textContent = '';
    btn.appendChild(picture(avatar(), 'av-top'));
    var u = Shell.getUser();
    var lbl = u.name ? t('acc.title') + ': ' + u.name : t('acc.title');
    btn.setAttribute('aria-label', lbl);
    btn.title = lbl;
  }

  function api(path, body) {
    var h = { 'Content-Type': 'application/json' }, s = state().session;
    if (s) h.Authorization = 'Bearer ' + s;
    return fetch(WORLD + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (j) { return j; }, function () { return { ok: false, error: 'http' }; }); });
  }
  function signedIn(res) {
    if (!res || !res.ok || !res.session) return false;
    setState({ session: res.session, username: res.account.username, avatar: res.account.avatar || '' });
    if (res.account.avatar) Shell.setPrefs({ avatar: res.account.avatar });
    Shell.setUser({ mode: 'account', name: res.account.username });
    if (MBG.Net) MBG.Net.emit('account');
    return true;
  }
  // the accounts this device knows (switch between them without the password): { key: { username, session, avatar } }
  var SAVED = 'MBG.Platform.saved', PLAYERS = 'MBG.Platform.players', MIN_AGE = 16;
  function saved() { return Shell.readJson(SAVED, {}) || {}; }
  function keyOf(n) { return String(n || '').normalize('NFC').trim().toLowerCase(); }
  function remember(name) {
    if (!name) return;
    var list = (Shell.readJson(PLAYERS, []) || []).filter(function (x) { return keyOf(x) !== keyOf(name); });
    list.unshift(name);
    Shell.writeJson(PLAYERS, list.slice(0, 8));
  }
  function forgetName(name) { Shell.writeJson(PLAYERS, (Shell.readJson(PLAYERS, []) || []).filter(function (x) { return keyOf(x) !== keyOf(name); })); }
  var signedInBase = signedIn;
  signedIn = function (res) {
    if (!signedInBase(res)) return false;
    var sv = saved();
    sv[keyOf(res.account.username)] = { username: res.account.username, session: res.session, avatar: res.account.avatar || '' };
    Shell.writeJson(SAVED, sv);
    remember(res.account.username);
    return true;
  };
  /** Sign out: the session ends on the server; the games stay on this device. */
  function signOut() {
    var st = state();
    if (st.session && WORLD) api('/api/auth/logout', {}).catch(function () { /* offline */ });
    var sv = saved();
    if (st.username) delete sv[keyOf(st.username)];
    Shell.writeJson(SAVED, sv);
    setState({});
    Shell.setUser({ mode: 'anonymous' });
    if (MBG.Net) MBG.Net.emit('account');
  }
  /** Another player of this device: an account it knows (at once), a name, or Anonymous. */
  function switchTo(name) {
    var sv = saved()[keyOf(name)];
    if (sv) {
      setState({ session: sv.session, username: sv.username, avatar: sv.avatar });
      if (sv.avatar) Shell.setPrefs({ avatar: sv.avatar });
      Shell.setUser({ mode: 'account', name: sv.username });
    } else {
      setState({});
      if (name) Shell.setUser({ mode: 'local', name: name }); else Shell.setUser({ mode: 'anonymous' });
    }
    if (name) remember(name);
    Shell.setPrefs({ welcomeDone: true });
    if (MBG.Net) MBG.Net.emit('account');
  }
  function deleteAccount() {
    return api('/api/account/delete', {}).then(function (r) {
      if (r.ok) { var n = state().username; signOut(); forgetName(n); }
      return r;
    });
  }
  function errText(e) { return t('acc.err.' + (['email', 'password', 'name', 'invalid', 'taken', 'exists', 'google', 'code', 'rate', 'mail', 'login', 'banned'].indexOf(e) !== -1 ? e : 'other')); }

  /* --------------------------------------------- Google on the phone and on the web --- */
  // As in MBG Puzzles: in the Android app Google's account chooser (plugin @capgo/capacitor-social-login),
  // in a browser Google's own "Continue with Google" button. The ID token goes once to the MBG server.
  var social = null, nativeReady = null;
  function plugin() {
    if (social || !Shell.native || !root.capacitorExports || typeof root.capacitorExports.registerPlugin !== 'function') return social;
    var cap = root.capacitorExports.Capacitor;
    if (cap && typeof cap.isPluginAvailable === 'function' && !cap.isPluginAvailable('SocialLogin')) return null;
    social = root.capacitorExports.registerPlugin('SocialLogin');
    return social;
  }
  function googleOn() { return !!CLIENT_ID && (!Shell.native || !!plugin()); }
  function nativeToken() {
    var SL = plugin();
    if (!SL) return Promise.reject(new Error('plugin'));
    if (!nativeReady) { nativeReady = SL.initialize({ google: { webClientId: CLIENT_ID, mode: 'online' } }); nativeReady.catch(function () { nativeReady = null; }); }
    return nativeReady.then(function () { return SL.login({ provider: 'google', options: { style: 'bottom', filterByAuthorizedAccounts: false } }); })
      .then(function (res) {
        var token = res && res.result && res.result.idToken;
        try { SL.logout({ provider: 'google' }).catch(function () {}); } catch (e) { /* ignore */ }
        if (!token) throw new Error('no-token');
        return token;
      });
  }
  var gsi = null;
  function loadGsi() {
    if (root.google && root.google.accounts && root.google.accounts.id) return Promise.resolve(root.google.accounts.id);
    if (gsi) return gsi;
    gsi = new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = function () { if (root.google && root.google.accounts) res(root.google.accounts.id); else { gsi = null; rej(new Error('gsi')); } };
      sc.onerror = function () { gsi = null; rej(new Error('gsi')); };
      document.head.appendChild(sc);
    });
    return gsi;
  }

  /* ----------------------------------------------------------- the sheet --- */
  function open() {
    var sh = Shell.sheet({ id: 'dlgAccount', title: '👤 ' + t('acc.title'), cls: 'acsheet' });
    var b = sh.body;
    function paint(note) {
      b.textContent = '';
      var u = Shell.getUser();
      var who = el('div', 'ac-who');
      who.appendChild(picture(avatar(), 'av-lg'));
      var wt = el('div', 'ac-who-text');
      wt.appendChild(el('strong', null, u.name || t('welcome.anonName')));
      wt.appendChild(el('span', 'muted', u.mode === 'account' ? '✓ ' + t('acc.isAccount') : u.mode === 'local' ? t('acc.isLocal') : t('acc.isAnon')));
      who.appendChild(wt);
      b.appendChild(who);
      if (note) b.appendChild(el('p', 'pw-msg ok', note));
      // log out (then choose again how to play) and "keep me signed in"
      if (u.mode !== 'anonymous') {
        var top = el('div', 'dlg-actions ac-top');
        var lo = el('button', 'btn ghost', '🚪 ' + t('who.logout')); lo.type = 'button';
        lo.addEventListener('click', function () {
          if (u.mode === 'account') signOut(); else switchTo(null);
          Shell.setPrefs({ welcomeDone: false });
          paint(t('who.loggedOut', { name: u.name || '' }));
        });
        top.appendChild(lo);
        b.appendChild(top);
      }
      var keep = el('label', 'keepin');
      var kc = el('input'); kc.type = 'checkbox'; kc.checked = Shell.getPrefs().keepIn !== false;
      kc.addEventListener('change', function () { Shell.setPrefs({ keepIn: kc.checked }); });
      keep.appendChild(kc); keep.appendChild(el('span', null, ' ' + t('acc.keepIn')));
      b.appendChild(keep);

      // 1. the MBG account: sign in with Google or e-mail - or sign out
      b.appendChild(el('h3', null, '🌍 ' + t('acc.mbg')));
      if (u.mode === 'account') {
        b.appendChild(el('p', 'muted', t('acc.shared')));
        var row = el('div', 'dlg-actions');
        var out = el('button', 'btn ghost', '🚪 ' + t('acc.signOut')); out.type = 'button';
        out.addEventListener('click', function () { signOut(); paint(t('acc.signedOut')); });
        var del = el('button', 'btn ghost danger', t('acc.delete')); del.type = 'button';
        del.addEventListener('click', function () {
          Shell.confirm({ title: t('acc.delete'), text: t('acc.deleteText'), ok: t('acc.deleteOk'), cancel: t('dlg.cancel') }).then(function (ok) {
            if (ok) deleteAccount().then(function (r) { paint(r.ok ? t('acc.deleted') : errText(r.error)); });
          });
        });
        row.appendChild(del); row.appendChild(out);
        b.appendChild(row);
      } else if (!WORLD || (!googleOn() && !MBG.EMAIL_LOGIN)) {
        // the options are shown as they will be - in this test version they explain why they wait
        b.appendChild(el('p', 'muted', t('acc.later')));
        var gb = el('button', 'btn google', 'G  ' + t('acc.google')); gb.type = 'button';
        var eb = el('button', 'btn ghost', '✉️ ' + t('acc.withEmail')); eb.type = 'button';
        var why = el('p', 'pw-msg'); why.hidden = true; why.textContent = t('acc.laterHow');
        [gb, eb].forEach(function (x) { x.addEventListener('click', function () { why.hidden = false; }); });
        var col = el('div', 'btncol'); col.appendChild(gb); col.appendChild(eb);
        b.appendChild(col); b.appendChild(why);
      } else signInForm(b, function (msg) { paint(msg); });

      // 2. who plays on this device: switch, a new name, anonymous (also "log out" of a name)
      b.appendChild(el('h3', null, '🔁 ' + t('acc.switch')));
      var names = (Shell.readJson(PLAYERS, []) || []).filter(function (n) { return keyOf(n) !== keyOf(u.name); });
      if (names.length) {
        var pl = el('div', 'chipset');
        names.forEach(function (n) {
          var acc = !!saved()[keyOf(n)];
          var c = el('button', 'pickchip', (acc ? '🌍 ' : '📱 ') + n); c.type = 'button';
          c.addEventListener('click', function () { switchTo(n); paint(t('welcome.nameHello', { name: n })); });
          pl.appendChild(c);
        });
        b.appendChild(pl);
      }
      var f = el('form', 'wlc-row');
      var inp = el('input', 'textfield');
      inp.maxLength = 20; inp.placeholder = t('acc.newName'); inp.autocomplete = 'nickname';
      if (u.mode === 'local') inp.value = u.name || '';
      var ok = el('button', 'btn submit', u.mode === 'local' ? t('acc.save') : t('acc.use')); ok.type = 'submit';
      f.appendChild(inp); f.appendChild(ok);
      var msg = el('p', 'pw-msg'); msg.hidden = true;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var n = inp.value.normalize('NFC').trim();
        if (!n) return;
        var bad = Shell.checkName(n);
        if (bad) { msg.textContent = t(bad === 'reserved' ? 'welcome.nameReserved' : 'welcome.nameInvalid'); msg.hidden = false; return; }
        if (u.mode === 'account') signOutKeep();
        switchTo(n);
        paint(t('welcome.nameHello', { name: n }));
      });
      b.appendChild(f); b.appendChild(msg);
      b.appendChild(el('p', 'muted small', t('acc.statsPer')));

      // 3. the picture
      b.appendChild(el('h3', null, t('acc.avatar')));
      var grid = el('div', 'av-grid');
      AVATARS.forEach(function (a, i) {
        var code = 'e:' + i, btn = el('button', 'av-pick' + (avatar() === code ? ' on' : ''));
        btn.type = 'button';
        btn.appendChild(picture(code, 'av-md'));
        btn.addEventListener('click', function () {
          Shell.setPrefs({ avatar: code });
          if (state().session && WORLD) api('/api/account/avatar', { avatar: code });
          paint();
        });
        grid.appendChild(btn);
      });
      b.appendChild(grid);
    }
    /** Leaves the account but keeps it known on this device (switch back at once). */
    function signOutKeep() { setState({}); }
    paint();
    return Shell.closed(sh.dlg);
  }

  /** Sign in or make an account: the year of birth once (16+, as in MBG Puzzles), then Google or e-mail. */
  function signInForm(b, done) {
    var mode = 'login';
    var box = el('div', 'ac-form');
    b.appendChild(box);
    function ageStep() {
      box.textContent = '';
      var p = Shell.getPrefs();
      if (p.young) { box.appendChild(el('p', 'pw-msg', t('acc.young'))); return false; }
      if (p.birthYear) return true;
      box.appendChild(el('p', null, t('acc.birthQ')));
      var row = el('div', 'wlc-row');
      var sel = el('select', 'textfield'), y = new Date().getFullYear();
      sel.appendChild(el('option', null, '–'));
      for (var i = y - 5; i >= y - 100; i--) { var o = el('option', null, String(i)); o.value = String(i); sel.appendChild(o); }
      var go = el('button', 'btn submit', t('acc.next')); go.type = 'button';
      go.addEventListener('click', function () {
        var by = Number(sel.value);
        if (!by) return;
        if (y - by - 1 < MIN_AGE) { Shell.setPrefs({ young: true }); ageStep(); return; }
        Shell.setPrefs({ birthYear: by });
        draw();
      });
      row.appendChild(sel); row.appendChild(go);
      box.appendChild(row);
      box.appendChild(el('p', 'muted small', t('acc.birthNote')));
      return false;
    }
    function draw(note) {
      if (!ageStep()) return;
      box.textContent = '';
      box.appendChild(el('p', 'muted', t('acc.shared')));
      if (note) box.appendChild(el('p', 'pw-msg', note));
      if (googleOn()) {
        if (Shell.native) {
          var gb = el('button', 'btn google', 'G  ' + t('acc.google')); gb.type = 'button';
          gb.addEventListener('click', function () { gb.disabled = true; nativeToken().then(function (tok) { gb.disabled = false; google(tok); }, function () { gb.disabled = false; draw(t('acc.err.google')); }); });
          box.appendChild(gb);
        } else {
          var g = el('div', 'ac-google-box');
          box.appendChild(g);
          loadGsi().then(function (id) {
            id.initialize({ client_id: CLIENT_ID, ux_mode: 'popup', auto_select: false, callback: function (r) { if (r && r.credential) google(r.credential); } });
            id.renderButton(g, { type: 'standard', size: 'large', text: 'continue_with', shape: 'pill', locale: Shell.getLang(), width: 280 });
          }, function () { g.remove(); });
        }
      }
      if (!MBG.EMAIL_LOGIN) return;
      if (googleOn()) box.appendChild(el('p', 'ac-or', t('acc.or')));
      var tabs = el('div', 'seg wide');
      [['login', t('acc.login')], ['signup', t('acc.signup')], ['reset', t('acc.forgot')]].forEach(function (x) {
        var tb = el('button', 'seg-btn' + (mode === x[0] ? ' on' : ''), x[1]);
        tb.type = 'button';
        tb.addEventListener('click', function () { mode = x[0]; draw(); });
        tabs.appendChild(tb);
      });
      box.appendChild(tabs);
      var f = el('form', 'ac-fields');
      var em = el('input', 'textfield'); em.type = 'email'; em.placeholder = t('acc.email'); em.autocomplete = 'email';
      f.appendChild(em);
      var pw = null, un = null;
      if (mode !== 'reset') { pw = el('input', 'textfield'); pw.type = 'password'; pw.placeholder = t('acc.password'); pw.autocomplete = mode === 'login' ? 'current-password' : 'new-password'; f.appendChild(pw); }
      if (mode === 'signup') { un = el('input', 'textfield'); un.placeholder = t('acc.username'); un.maxLength = 20; f.appendChild(un); }
      var go = el('button', 'btn submit', mode === 'login' ? t('acc.login') : t('acc.sendCode'));
      go.type = 'submit';
      f.appendChild(go);
      var msg = el('p', 'pw-msg'); msg.hidden = true;
      f.appendChild(msg);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        go.disabled = true;
        var lang = Shell.getLang(), email = em.value.trim();
        var p = mode === 'login' ? api('/api/auth/email/login', { email: email, password: pw.value })
          : mode === 'signup' ? api('/api/auth/email/start', { email: email, password: pw.value, username: un.value.trim(), lang: lang, remind: true })
          : api('/api/auth/email/reset', { email: email, lang: lang });
        p.then(function (r) {
          go.disabled = false;
          if (mode === 'login') { if (signedIn(r)) done(t('welcome.nameHello', { name: r.account.username })); else { msg.textContent = errText(r.error); msg.hidden = false; } return; }
          if (!r.ok) { msg.textContent = errText(r.error); msg.hidden = false; return; }
          codeStep(email, mode);
        }, function () { go.disabled = false; msg.textContent = t('acc.err.offline'); msg.hidden = false; });
      });
      box.appendChild(f);
    }
    function codeStep(email, kind) {
      box.textContent = '';
      box.appendChild(el('p', null, t('acc.codeSent', { email: email })));
      var f = el('form', 'ac-fields');
      var c = el('input', 'textfield tf-code'); c.inputMode = 'numeric'; c.maxLength = 6; c.autocomplete = 'one-time-code'; c.placeholder = '000000';
      f.appendChild(c);
      var pw = null;
      if (kind === 'reset') { pw = el('input', 'textfield'); pw.type = 'password'; pw.placeholder = t('acc.newPassword'); pw.autocomplete = 'new-password'; f.appendChild(pw); }
      var ok = el('button', 'btn submit', t('acc.confirm')); ok.type = 'submit';
      f.appendChild(ok);
      var msg = el('p', 'pw-msg'); msg.hidden = true;
      f.appendChild(msg);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var req = kind === 'reset' ? api('/api/auth/email/reset-confirm', { email: email, code: c.value.trim(), password: pw.value })
          : api('/api/auth/email/verify', { email: email, code: c.value.trim() });
        req.then(function (r) {
          if (signedIn(r)) done(t('welcome.nameHello', { name: r.account.username }));
          else if (r.ok && kind === 'reset') { mode = 'login'; draw(t('acc.resetDone')); }
          else { msg.textContent = errText(r.error); msg.hidden = false; }
        });
      });
      box.appendChild(f);
    }
    /** Google's token → the MBG server; a new account first chooses its public user name. */
    function google(token, username) {
      api('/api/auth/google', { idToken: token, username: username, lang: Shell.getLang(), remind: true }).then(function (r) {
        if (signedIn(r)) { done(t('welcome.nameHello', { name: r.account.username })); return; }
        if (r.error === 'new') {
          box.textContent = '';
          box.appendChild(el('p', null, t('acc.chooseName')));
          var f = el('form', 'wlc-row');
          var inp = el('input', 'textfield'); inp.maxLength = 20; inp.placeholder = t('acc.username');
          var go = el('button', 'btn submit', t('acc.confirm')); go.type = 'submit';
          f.appendChild(inp); f.appendChild(go);
          f.addEventListener('submit', function (e) { e.preventDefault(); if (inp.value.trim()) google(token, inp.value.trim()); });
          box.appendChild(f);
          setTimeout(function () { inp.focus(); }, 50);
          return;
        }
        draw(errText(r.error));
      }, function () { draw(t('acc.err.offline')); });
    }
    draw();
  }

  MBG.Account = { open: open, picture: picture, paintButton: paintButton, avatar: avatar, signOut: signOut, switchTo: switchTo, remember: remember, session: function () { return state().session || null; }, AVATARS: AVATARS };
})(typeof self !== 'undefined' ? self : globalThis);
