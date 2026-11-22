/*!
 * MBG Games - the notification bell and the notification center (section 12).
 * The bell with the unread count sits at the top of every screen (FR-035). The center lists the
 * notices, newest first; a tap opens the message, the case or the board and marks it read; there
 * are filters by type, "Mark all as read", removing a notice (FR-036), and the settings for
 * e-mail, push and reminders (FR-037 - FR-039).
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;
  var bells = [];
  var ICON = { message: '✉️', friend: '🤝', match: '🎮', challenge: '⚔️', judge: '⚖️', judgment: '📜', appeal: '🔁', rating: '♟️',
    achievement: '🏅', reminder: '⏰', admin: '🛡️', system: '📣', board: '💬' };
  var FILTERS = ['all', 'message', 'match', 'achievement', 'judge', 'judgment', 'system'];

  function attach(btn, badge) {
    bells.push({ btn: btn, badge: badge });
    btn.addEventListener('click', function () { open().then(paint); });
    paint();
  }
  function paint() {
    Net.notes.unread().then(function (n) {
      bells.forEach(function (b) {
        b.badge.hidden = !n;
        b.badge.textContent = n > 99 ? '99+' : String(n);
        b.btn.classList.toggle('has', n > 0);
        b.btn.setAttribute('aria-label', t('note.title') + (n ? ' · ' + t('note.unread', { n: n }) : ''));
      });
    }).catch(function () { /* offline */ });
  }

  function go(link) {
    if (!link) return;
    var home = /index\.html$|\/$/.test(root.location.pathname) || root.location.pathname === '';
    if (link.kind === 'board') { if (home && MBG.Board) MBG.Board.open(); else Shell.go('index.html#board'); }
    else if (link.kind === 'case') { if (home && MBG.Judge) MBG.Judge.openCase(link.id); else Shell.go('index.html#case=' + encodeURIComponent(link.id)); }
    else if (link.kind === 'judge') { if (home && MBG.Judge) MBG.Judge.open(); else Shell.go('index.html#judge'); }
    else if (link.kind === 'room') Shell.go('play.html?room=' + encodeURIComponent(link.id) + '&as=play');
    else if (link.kind === 'daily') {
      var dm = MBG.WhoDaily && MBG.WhoDaily.parseId(link.id);
      if (home && MBG.DailyUI) MBG.DailyUI.openBoard(dm ? dm.mode : null); else Shell.go('index.html#daily=' + (dm ? dm.mode : ''));
    }
    // 1.1.3 - friends: the list (a request, a yes) - or one friend (an invitation, a message): play or answer
    else if (link.kind === 'friends') { if (MBG.Friends) MBG.Friends.open(); else Shell.go('index.html#friends'); }
    else if (link.kind === 'friend') { if (MBG.Friends) MBG.Friends.answer(link); else Shell.go('index.html#friend=' + encodeURIComponent(link.id) + '&' + encodeURIComponent(link.name || '') + (link.play ? '&play' : '')); }
    else if (link.kind === 'hof') { if (home) { var b = root.document.querySelector('.hofbtn'); if (b) b.click(); } else Shell.go('index.html'); }
  }

  function open() {
    var filter = 'all';
    var sh = Shell.sheet({ id: 'dlgNotes', title: '🔔 ' + t('note.title'), cls: 'notesheet',
      actions: [{ label: t('note.readAll'), cls: 'ghost', onClick: function () { Net.notes.read('all').then(draw); } }] });
    var b = sh.body;
    function draw() {
      Net.notes.list().then(function (list) {
        b.textContent = '';
        if (Net.demo) b.appendChild(el('p', 'demoline small', '🧪 ' + t('demo.notes')));
        var fs = el('div', 'chipset');
        FILTERS.forEach(function (f) {
          var c = el('button', 'pickchip' + (filter === f ? ' on' : ''), t('note.f.' + f));
          c.type = 'button';
          c.addEventListener('click', function () { filter = f; draw(); });
          fs.appendChild(c);
        });
        b.appendChild(fs);
        var shown = list.filter(function (n) {
          return filter === 'all' || n.type === filter || (filter === 'judge' && n.type === 'appeal') || (filter === 'match' && n.type === 'challenge');
        });
        if (!shown.length) b.appendChild(el('p', 'empty muted', t('note.empty')));
        var ul = el('ul', 'notes');
        shown.forEach(function (n) {
          var li = el('li', 'note' + (n.read ? '' : ' unread'));
          var main = el('button', 'note-main');
          main.type = 'button';
          main.appendChild(el('span', 'note-ic', ICON[n.type] || '🔔'));
          var tx = el('span', 'note-t');
          tx.appendChild(el('strong', null, n.title));
          if (n.text) tx.appendChild(el('span', null, n.text));
          tx.appendChild(el('small', 'muted', Shell.ago(n.at)));
          main.appendChild(tx);
          main.addEventListener('click', function () { Net.notes.read(n.id).then(function () { paint(); if (n.link) { sh.close(); go(n.link); } else draw(); }); });
          li.appendChild(main);
          if (n.type !== 'admin') {
            var x = el('button', 'note-x');
            x.type = 'button';
            x.setAttribute('aria-label', t('note.remove'));
            x.textContent = '×';
            x.addEventListener('click', function () { Net.notes.remove(n.id).then(function () { paint(); draw(); }); });
            li.appendChild(x);
          }
          ul.appendChild(li);
        });
        b.appendChild(ul);
        var set = el('button', 'btn ghost small', '⚙ ' + t('note.settings'));
        set.type = 'button';
        set.addEventListener('click', prefs);
        b.appendChild(set);
      });
    }
    draw();
    return Shell.closed(sh.dlg);
  }

  function prefs() {
    Net.notes.prefs().then(function (p) {
      var sh = Shell.sheet({ id: 'dlgNotePrefs', title: t('note.settings') });
      var b = sh.body;
      function row(label, on, onChange) {
        var r = el('div', 'srow');
        r.appendChild(el('span', 'srow-label', label));
        var sw = el('button', 'switch');
        sw.type = 'button';
        sw.setAttribute('role', 'switch');
        sw.setAttribute('aria-checked', on ? 'true' : 'false');
        sw.appendChild(el('span', 'knob'));
        sw.addEventListener('click', function () { on = !on; sw.setAttribute('aria-checked', on ? 'true' : 'false'); onChange(on); Net.notes.setPrefs(p); });
        r.appendChild(sw);
        b.appendChild(r);
      }
      b.appendChild(el('h3', null, '✉️ ' + t('note.email')));
      ['message', 'judge', 'decision', 'match', 'achievement'].forEach(function (k) { row(t('note.email.' + k), p.email[k] !== false, function (v) { p.email[k] = v; }); });
      b.appendChild(el('h3', null, '⏰ ' + t('note.reminders')));
      row(t('note.remindersText'), p.reminders, function (v) { p.reminders = v; });
      b.appendChild(el('h3', null, '📱 ' + t('note.push')));
      if (MBG.Push && MBG.Push.supported()) {
        row(t('note.pushText'), p.push !== false, function (v) { p.push = v; if (v) MBG.Push.enable(true); else MBG.Push.disable(); });
      } else b.appendChild(el('p', 'muted small', t('note.pushLater')));
      // pause: no e-mail and no phone notification for a while (the bell stays)
      b.appendChild(el('h3', null, '⏸ ' + t('mute.title')));
      var mt = el('p', 'muted small'), seg = el('div', 'seg wide mute-seg');
      var MK = { 0: 'mute.off', 8: 'mute.h8', 24: 'mute.h24', 168: 'mute.h168', 720: 'mute.h720' };
      function paintMute() {
        var on = Number(p.muteUntil) > Date.now();
        mt.textContent = on ? t('mute.until', { time: Shell.dateText(p.muteUntil, {}) + ' ' + new Date(p.muteUntil).toTimeString().slice(0, 5) }) : t('mute.text');
        seg.textContent = '';
        [0, 8, 24, 168, 720].forEach(function (h) {
          var sb = el('button', 'seg-btn' + (h === 0 && !on ? ' on' : ''), t(MK[h])); sb.type = 'button';
          sb.addEventListener('click', function () {
            var q = JSON.parse(JSON.stringify(p)); q.muteHours = h;
            Net.notes.setPrefs(q).then(function (r) { p.muteUntil = (r && r.muteUntil) || 0; paintMute(); if (h) Shell.toast('⏸ ' + t(MK[h])); });
          });
          seg.appendChild(sb);
        });
      }
      paintMute();
      b.appendChild(seg); b.appendChild(mt);
      b.appendChild(el('p', 'muted small', t('mute.never')));
      b.appendChild(el('p', 'muted small', t('note.security')));
    });
  }

  MBG.Notify = { attach: attach, paint: paint, open: open, go: go, ICON: ICON };
})(typeof self !== 'undefined' ? self : globalThis);
