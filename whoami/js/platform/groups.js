/*!
 * MBG Who Am I? - groups (1.1.0).
 * A group is a circle of players (friends, a class, a club): a name, an invitation code, at most 50
 * members, the ranking of the members and one chat. MBG accounts only (with the MBG server).
 * The chat is closed while you play a match - on the server too - so nobody can pass the hidden
 * answer; players in a match see only the emojis of the people watching. Messages can be reported
 * (three reports hide one); the owner removes messages and members.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;

  function errText(e) {
    var k = { name: 'grp.errName', code: 'grp.errCode', full: 'grp.errFull', limit: 'grp.errLimit', removed: 'grp.errRemoved', rude: 'grp.errRude', slow: 'grp.errSlow', playing: 'grp.locked' }[e && e.message];
    return t(k || 'online.error');
  }
  function note(box, text) { box.textContent = text; box.hidden = !text; }
  function form(label, ph, btn, max, onSubmit) {
    var f = el('form', 'grp-form');
    f.appendChild(el('label', 'fieldlabel', label));
    var r = el('div', 'wlc-row'), inp = el('input', 'textfield'), go = el('button', 'btn submit', btn);
    inp.maxLength = max; inp.placeholder = ph; inp.autocomplete = 'off'; inp.spellcheck = false;
    go.type = 'submit';
    r.appendChild(inp); r.appendChild(go); f.appendChild(r);
    var msg = el('p', 'pw-msg'); msg.hidden = true; msg.setAttribute('role', 'status'); f.appendChild(msg);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      go.disabled = true; note(msg, '');
      onSubmit(v).then(function () { go.disabled = false; inp.value = ''; }, function (err) { go.disabled = false; note(msg, errText(err)); inp.focus(); });
    });
    return f;
  }

  /** The list: my groups, a new group, join with a code. */
  function open() {
    var sh = Shell.sheet({ id: 'dlgGroups', title: '👥 ' + t('grp.title'), cls: 'grpsheet' });
    var b = sh.body;
    b.appendChild(el('p', 'muted', t('grp.intro')));
    if (Net.demo || !Net.signedIn()) {
      b.appendChild(el('p', null, t(Net.demo ? 'grp.needServer' : 'grp.needAccount')));
      if (!Net.demo) {
        var si = el('button', 'btn submit', '👤 ' + t('online.quickSignin')); si.type = 'button';
        si.addEventListener('click', function () { sh.close(); MBG.Account.open().then(function () { if (Net.signedIn()) open(); }); });
        b.appendChild(si);
      }
      return Shell.closed(sh.dlg);
    }
    var list = el('div', 'grp-list');
    list.appendChild(el('p', 'muted', '⏳ ' + t('ld.wait') + '…'));
    b.appendChild(list);
    function load() {
      Net.groups.list().then(function (gs) {
        list.textContent = '';
        if (!gs.length) list.appendChild(el('p', 'grp-empty', t('grp.none')));
        gs.forEach(function (g) {
          var r = el('button', 'homerow'); r.type = 'button';
          r.appendChild(el('span', 'hr-ic', '👥'));
          var tx = el('span', 'hr-t');
          tx.appendChild(el('strong', null, g.name));
          tx.appendChild(el('span', null, t('grp.members', { n: g.members }) + (g.role === 'owner' ? ' · ' + t('grp.owner') : '')));
          r.appendChild(tx);
          r.appendChild(el('span', 'hr-go', '›'));
          r.addEventListener('click', function () { sh.close(); view(g.id); });
          list.appendChild(r);
        });
      }, function () { list.textContent = ''; list.appendChild(el('p', 'muted', t('online.error'))); });
    }
    load();
    b.appendChild(form(t('grp.joinLabel'), 'ABC234', t('grp.join'), 8, function (code) {
      return Net.groups.join(code).then(function (j) { sh.close(); view(j.group.id); });
    }));
    b.appendChild(form(t('grp.newLabel'), t('grp.newPh'), t('grp.create'), 30, function (name) {
      return Net.groups.create(name).then(function (j) { sh.close(); view(j.group.id); });
    }));
    return Shell.closed(sh.dlg);
  }

  /** One group: the ranking of its members and the chat. */
  function view(id, tab) {
    var sh = Shell.sheet({ id: 'dlgGroup', title: '👥 …', cls: 'grpsheet' });
    var b = sh.body, timer = null, alive = true;
    sh.dlg.addEventListener('close', function () { alive = false; clearInterval(timer); });
    Net.groups.view(id).then(function (j) { if (alive) paint(j, tab || 'rank'); }, function () { b.appendChild(el('p', 'muted', t('online.error'))); });

    function paint(j, which) {
      var g = j.group;
      clearInterval(timer);
      sh.dlg.querySelector('h2').textContent = '👥 ' + g.name;
      b.textContent = '';
      // the invitation
      var inv = el('div', 'grp-inv');
      var it = el('span', 'hr-t');
      it.appendChild(el('span', null, t('grp.codeLabel')));
      it.appendChild(el('strong', 'grp-code', g.code));
      inv.appendChild(it);
      var share = el('button', 'btn ghost small', '📨 ' + t('grp.invite')); share.type = 'button';
      share.addEventListener('click', function () {
        var text = t('grp.inviteText', { name: g.name, code: g.code, url: (MBG.WEB_URL || 'https://mbggames.com/whoami') });
        if (navigator.share) navigator.share({ text: text }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { Shell.toast('📋 ' + t('inv.copied')); });
      });
      inv.appendChild(share);
      b.appendChild(inv);
      var seg = el('div', 'seg wide');
      [['rank', '🏆 ' + t('grp.rank')], ['chat', '💬 ' + t('grp.chat')]].forEach(function (x) {
        var sb = el('button', 'seg-btn' + (which === x[0] ? ' on' : ''), x[1]); sb.type = 'button';
        sb.addEventListener('click', function () { if (which !== x[0]) paint(j, x[0]); });
        seg.appendChild(sb);
      });
      b.appendChild(seg);
      if (which === 'rank') rank(j); else chat(j);
    }

    function rank(j) {
      var g = j.group, ol = el('ol', 'hoflist');
      j.members.forEach(function (m, i) {
        var li = el('li', 'hofrow' + (i < 3 ? ' top' + (i + 1) : '') + (m.me ? ' me' : ''));
        li.appendChild(el('span', 'hof-place', i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)));
        var mid = el('span', 'hof-mid');
        mid.appendChild(el('strong', null, m.name + (m.role === 'owner' ? ' ★' : '')));
        mid.appendChild(el('span', 'muted small', m.games ? t('title.' + m.title) + ' · ' + t('hof.games', { n: m.games }) : t('grp.noGames')));
        li.appendChild(mid);
        li.appendChild(el('b', 'num hof-val', m.games ? String(m.rating) : '–'));
        if (g.role === 'owner' && !m.me) {
          var x = el('button', 'grp-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', t('grp.remove', { name: m.name }));
          x.addEventListener('click', function () {
            Shell.confirm({ title: t('grp.remove', { name: m.name }), text: t('grp.removeText'), ok: t('grp.removeOk') }).then(function (ok) {
              if (ok) Net.groups.remove(g.id, m.name).then(function (j2) { if (alive) paint(j2, 'rank'); });
            });
          });
          li.appendChild(x);
        }
        ol.appendChild(li);
      });
      b.appendChild(ol);
      b.appendChild(el('p', 'muted small', t('grp.rankNote', { n: j.members.length, max: g.max })));
      var lv = el('button', 'btn ghost small', '🚪 ' + t('grp.leave')); lv.type = 'button';
      lv.addEventListener('click', function () {
        Shell.confirm({ title: t('grp.leave'), text: t(j.members.length === 1 ? 'grp.leaveLast' : 'grp.leaveText', { name: g.name }), ok: t('grp.leave') }).then(function (ok) {
          if (ok) Net.groups.leave(g.id).then(function () { sh.close(); open(); });
        });
      });
      b.appendChild(lv);
    }

    function chat(j) {
      var g = j.group, box = el('div', 'grp-chat'), lock = el('p', 'grp-lock'), last = '';
      lock.hidden = true;
      b.appendChild(box); b.appendChild(lock);
      var f = el('form', 'wlc-row'), inp = el('input', 'textfield'), go = el('button', 'btn submit', t('board.send'));
      inp.maxLength = 300; inp.placeholder = t('chat.ph'); go.type = 'submit';
      f.appendChild(inp); f.appendChild(go); b.appendChild(f);
      var msg = el('p', 'pw-msg'); msg.hidden = true; b.appendChild(msg);
      b.appendChild(el('p', 'muted small', t('grp.chatRule')));
      function draw(res) {
        if (!alive) return;
        f.hidden = !!res.locked;
        note(lock, res.locked ? '🔒 ' + t('grp.locked') : '');
        var key = res.messages.map(function (m) { return m.id; }).join();
        if (key === last && !res.locked) return;
        last = key;
        var bottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
        box.textContent = '';
        if (!res.messages.length && !res.locked) box.appendChild(el('p', 'grp-empty', t('grp.chatEmpty')));
        res.messages.forEach(function (m) {
          var r = el('div', 'grp-msg' + (m.mine ? ' mine' : ''));
          var h = el('div', 'grp-msg-h');
          h.appendChild(el('strong', null, m.mine ? t('you') : m.name));
          h.appendChild(el('span', 'muted', Shell.dateText(m.at, {}) + ' ' + new Date(m.at).toTimeString().slice(0, 5)));
          var act = el('button', 'grp-x', m.mine || g.role === 'owner' ? '🗑' : '⚑'); act.type = 'button';
          act.setAttribute('aria-label', t(m.mine || g.role === 'owner' ? 'grp.delMsg' : 'grp.report'));
          act.addEventListener('click', function () {
            var del = m.mine || g.role === 'owner';
            Shell.confirm({ title: t(del ? 'grp.delMsg' : 'grp.report'), text: '“' + m.text.slice(0, 120) + '”', ok: t(del ? 'grp.delMsg' : 'grp.report') }).then(function (ok) {
              if (!ok) return;
              (del ? Net.groups.hide(g.id, m.id) : Net.groups.report(g.id, m.id)).then(function (r2) { draw(r2); if (!del) Shell.toast('⚑ ' + t('grp.reported')); });
            });
          });
          h.appendChild(act);
          r.appendChild(h);
          r.appendChild(el('p', null, m.text));
          box.appendChild(r);
        });
        if (bottom) box.scrollTop = box.scrollHeight;
      }
      function load() { Net.groups.chat(g.id).then(draw, function () { /* offline: keep what is shown */ }); }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = inp.value.trim();
        if (!v) return;
        go.disabled = true; note(msg, '');
        Net.groups.say(g.id, v).then(function (r2) { go.disabled = false; inp.value = ''; draw(r2); box.scrollTop = box.scrollHeight; },
          function (err) { go.disabled = false; note(msg, errText(err)); });
      });
      load();
      timer = setInterval(function () { if (!document.hidden) load(); }, 6000);
    }
    return Shell.closed(sh.dlg);
  }

  MBG.Groups = { open: open, view: view };
})(typeof self !== 'undefined' ? self : globalThis);
