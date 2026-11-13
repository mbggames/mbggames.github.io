/*!
 * MBG Who Am I? - free access by e-mail (1.0.0).
 *
 * In the paid edition the administrator can give the game for free to chosen people: their e-mail
 * address goes on a list on the MBG Games server (here in the app, ☰ Menu → "Free access", for MBG
 * user names in ADMIN_USERS - or on the administrator page tools/platform-admin.html). When the
 * person signs in with an MBG account of that address, the app plays like the free edition: no
 * limits, power-ups free (js/app/plans.js, mode 'gift'). An end date is optional.
 *
 *  - check()      asks the server (at most every 10 minutes; at once after signing in or out)
 *  - state()      { free, until, admin } - the last answer
 *  - openAdmin()  the administrator's list: add an address (how long, a note, the language of the
 *                 e-mail to the person), remove one
 * Demo mode (no server): nothing to check - MBG accounts and their e-mail addresses are on the server.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;
  var state = { free: false, until: 0, admin: false }, last = 0, lastWho = null, busy = null, listeners = [];

  function who() { var u = Shell.getUser(); return u.mode + ':' + (u.name || ''); }
  function changed() { listeners.forEach(function (f) { try { f(state); } catch (e) { /* ignore */ } }); }

  /** Asks the server about this player's free access (and whether the player is an administrator). */
  function check(force) {
    var u = Shell.getUser(), w = who();
    if (w !== lastWho) { force = true; lastWho = w; }
    if (!MBG.Plan) return Promise.resolve(state);
    // only an MBG account has an e-mail address the administrator can give access to
    if (Net.demo || u.mode !== 'account' || !Net.signedIn()) {
      var was = state.admin || state.free;
      state = { free: false, until: 0, admin: false };
      var g = MBG.Plan.setGift(false);
      if (g || was) changed();
      return Promise.resolve(state);
    }
    if (busy) return busy;
    if (!force && Date.now() - last < 10 * 6e4) return Promise.resolve(state);
    last = Date.now();
    busy = Net.access().then(function (j) {
      var before = JSON.stringify(state);
      state = { free: !!j.free, until: Number(j.until) || 0, admin: !!j.admin };
      var g = MBG.Plan.setGift(state.free, state.until);
      if (g || before !== JSON.stringify(state)) changed();
      return state;
    }, function () { return state; /* offline: the free access known stays for 7 days */ })
      .then(function (s) { busy = null; return s; });
    return busy;
  }

  function day(ms) { return Shell.dateText(ms, { year: true }); }

  /** The administrator's list of free access. */
  function openAdmin() {
    var sh = Shell.sheet({ id: 'dlgFree', title: '🎁 ' + t('adm.freeTitle'), cls: 'freesheet' });
    var b = sh.body;
    b.appendChild(el('p', 'muted small', t('adm.freeText')));
    if (Net.demo) { b.appendChild(el('p', 'muted small', '🧪 ' + t('adm.needServer'))); return Shell.closed(sh.dlg); }

    var form = el('form', 'fa-form');
    var lab = el('label', 'fa-l', t('adm.email'));
    var email = el('input', 'fa-in');
    email.type = 'email'; email.required = true; email.autocomplete = 'off'; email.placeholder = 'name@gmail.com';
    lab.appendChild(email);
    form.appendChild(lab);

    function seg(label, opts, val) {
      form.appendChild(el('span', 'fa-l', label));
      var box = el('div', 'seg wide fa-seg'), cur = { v: val };
      opts.forEach(function (o) {
        var x = el('button', 'seg-btn' + (o[0] === val ? ' on' : ''), o[1]);
        x.type = 'button';
        x.addEventListener('click', function () { cur.v = o[0]; Array.prototype.forEach.call(box.children, function (c) { c.classList.toggle('on', c === x); }); });
        box.appendChild(x);
      });
      form.appendChild(box);
      return cur;
    }
    var days = seg(t('adm.howLong'), [[30, t('adm.days', { n: 30 })], [90, t('adm.days', { n: 90 })], [365, t('adm.year')], [0, t('adm.noEnd')]], 0);
    var lang = seg(t('adm.mailLang'), Shell.LANGS.map(function (l) { return [l, l.toUpperCase()]; }), Shell.getLang());
    var nl = el('label', 'fa-l', t('adm.note'));
    var note = el('input', 'fa-in');
    note.maxLength = 200; note.placeholder = t('adm.notePh');
    nl.appendChild(note);
    form.appendChild(nl);
    var go = el('button', 'btn submit', '🎁 ' + t('adm.give'));
    go.type = 'submit';
    form.appendChild(go);
    var msg = el('p', 'muted small fa-msg');
    form.appendChild(msg);
    b.appendChild(form);

    b.appendChild(el('h3', 'fa-h', t('adm.list')));
    var list = el('ul', 'fa-list');
    b.appendChild(list);

    function draw(rows) {
      list.textContent = '';
      if (!rows || !rows.length) { list.appendChild(el('li', 'muted small', t('adm.empty'))); return; }
      rows.forEach(function (r) {
        var li = el('li', 'fa-row' + (r.active ? '' : ' off'));
        var tx = el('div', 'fa-t');
        tx.appendChild(el('strong', null, r.email));
        tx.appendChild(el('span', 'muted small', [r.account ? '✓ ' + r.account : t('adm.noAccount'),
          r.until ? (r.active ? t('adm.until', { date: day(r.until) }) : t('adm.ended', { date: day(r.until) })) : t('adm.noEnd'),
          r.note].filter(Boolean).join(' · ')));
        li.appendChild(tx);
        var rm = el('button', 'btn ghost small', t('adm.remove'));
        rm.type = 'button';
        rm.addEventListener('click', function () {
          Shell.confirm({ title: t('adm.removeTitle'), text: r.email, ok: t('adm.remove'), cancel: t('dlg.cancel') }).then(function (ok) {
            if (!ok) return;
            Net.freeAccess.remove(r.email).then(function (rows2) { draw(rows2); Shell.toast(t('adm.removed')); check(true); }, fail);
          });
        });
        li.appendChild(rm);
        list.appendChild(li);
      });
    }
    function fail(e) { msg.textContent = '⚠️ ' + t('adm.error') + (e && e.message ? ' (' + e.message + ')' : ''); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = '⚠️ ' + t('adm.badEmail'); email.focus(); return; }
      go.disabled = true; msg.textContent = '…';
      Net.freeAccess.add({ email: v, days: days.v, note: note.value.trim(), lang: lang.v }).then(function (j) {
        go.disabled = false;
        msg.textContent = '✓ ' + t('adm.added', { email: v }) + ' ' + (j.told === 'sent' ? t('adm.mailSent') : j.told === 'no' ? '' : t('adm.mailNot'));
        email.value = ''; note.value = '';
        draw(j.list);
        check(true);
      }, function (er) { go.disabled = false; fail(er); });
    });

    list.appendChild(el('li', 'muted small', '…'));
    Net.freeAccess.list().then(draw, fail);
    setTimeout(function () { email.focus(); }, 50);
    return Shell.closed(sh.dlg);
  }

  MBG.Access = { check: check, state: function () { return state; }, onChange: function (f) { listeners.push(f); }, openAdmin: openAdmin };
  if (Net.on) Net.on(function () { /* a sign-in or sign-out changes the session */ check(); });
  check(true);
})(typeof self !== 'undefined' ? self : globalThis);
