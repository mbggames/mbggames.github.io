/*!
 * MBG Who Am I? - friends (1.1.3).
 * MBG accounts. A friend request is accepted by the other player; then both see each other's status
 * (🟢 available · 🎮 playing · away) and invite each other to a game. The invitation reaches the friend at
 * once when the app is open (Play / Not now), and always by the 🔔 bell and the phone - also when the
 * friend is busy in another game: they can come back to you, or answer with a short message.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;

  function errText(e) {
    var k = { name: 'fr.errName', self: 'fr.errSelf', limit: 'fr.errLimit', rude: 'grp.errRude', slow: 'grp.errSlow', friend: 'fr.errFriend' }[e && e.message];
    return t(k || 'online.error');
  }
  function ready() { return !Net.demo && Net.signedIn(); }
  /** For players without an MBG account (or without the server): why, and the way to sign in. */
  function needAccount(b, sh, again) {
    b.appendChild(el('p', null, t(Net.demo ? 'fr.needServer' : 'fr.needAccount')));
    if (Net.demo) return;
    var si = el('button', 'btn submit', '👤 ' + t('online.quickSignin')); si.type = 'button';
    si.addEventListener('click', function () { sh.close(); MBG.Account.open().then(function () { if (Net.signedIn()) again(); }); });
    b.appendChild(si);
  }
  var DOT = { available: '🟢', playing: '🎮', away: '⚪' };

  /** The list: friends with their status, requests to answer, requests sent, and "add a friend". */
  function open() {
    var sh = Shell.sheet({ id: 'dlgFriends', title: '👫 ' + t('fr.title'), cls: 'grpsheet frsheet' });
    var b = sh.body;
    b.appendChild(el('p', 'muted', t('fr.intro')));
    if (!ready()) { needAccount(b, sh, open); return Shell.closed(sh.dlg); }
    var list = el('div', 'grp-list fr-list');
    list.appendChild(el('p', 'muted', '⏳ ' + t('ld.wait') + '…'));
    b.appendChild(list);
    // add a friend by the user name
    var f = el('form', 'grp-form');
    f.appendChild(el('label', 'fieldlabel', t('fr.add')));
    var r = el('div', 'wlc-row'), inp = el('input', 'textfield'), go = el('button', 'btn submit', t('fr.send'));
    inp.maxLength = 40; inp.placeholder = t('fr.addPh'); inp.autocomplete = 'off'; inp.spellcheck = false;
    go.type = 'submit';
    r.appendChild(inp); r.appendChild(go); f.appendChild(r);
    var msg = el('p', 'pw-msg'); msg.hidden = true; msg.setAttribute('role', 'status'); f.appendChild(msg);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      go.disabled = true; msg.hidden = true;
      Net.friends.request({ name: v }).then(function (j) {
        go.disabled = false; inp.value = '';
        msg.hidden = false; msg.textContent = '✓ ' + t('fr.sent', { name: v });
        paint(j);
      }, function (err) { go.disabled = false; msg.hidden = false; msg.textContent = errText(err); inp.focus(); });
    });
    b.appendChild(f);

    function row(p, ic, line, btns) {
      var rw = el('div', 'homerow fr-row');
      rw.appendChild(MBG.Account.picture(p.avatar || '', 'av-md'));
      var tx = el('span', 'hr-tx');
      tx.appendChild(el('strong', null, (ic ? ic + ' ' : '') + p.name));
      tx.appendChild(el('span', 'muted small', line));
      rw.appendChild(tx);
      if (MBG.Profile) MBG.Profile.link(tx, { id: p.id, name: p.name });   // 1.1.4: tap - the profile
      var bx = el('span', 'fr-btns');
      btns.forEach(function (x) {
        var bt = el('button', 'btn ' + (x[2] || 'ghost') + ' small', x[0]); bt.type = 'button';
        if (x[3]) bt.setAttribute('aria-label', x[3]);
        bt.addEventListener('click', function () { bt.disabled = true; x[1](); });
        bx.appendChild(bt);
      });
      rw.appendChild(bx);
      return rw;
    }
    function paint(j) {
      list.textContent = '';
      if (j.incoming.length) {
        list.appendChild(el('h3', 'fr-h', t('fr.incoming')));
        j.incoming.forEach(function (p) {
          list.appendChild(row(p, '', t('fr.wantsYou'), [
            ['✅ ' + t('fr.accept'), function () { Net.friends.answer(p.id, true).then(paint, fail); }, 'submit'],
            ['✖', function () { Net.friends.answer(p.id, false).then(paint, fail); }, 'ghost', t('fr.decline')]]));
        });
      }
      list.appendChild(el('h3', 'fr-h', t('fr.yours', { n: j.friends.length })));
      if (!j.friends.length) list.appendChild(el('p', 'grp-empty', t('fr.none')));
      // available first, then playing, then away
      var order = { available: 0, playing: 1, away: 2 };
      j.friends.slice().sort(function (x, y) { return order[x.status] - order[y.status] || x.name.localeCompare(y.name); }).forEach(function (p) {
        var line = t('fr.st.' + p.status) + (p.rating ? ' · 🏆 ' + Shell.num(p.rating) : '');
        list.appendChild(row(p, DOT[p.status] || '⚪', line, [
          ['▶ ' + t('fr.invite'), function () { sh.close(); play(p); }, 'submit'],
          ['💬', function () { message(p); load(); }, 'ghost', t('fr.message')],
          ['✖', function () {
            Shell.confirm({ title: t('fr.removeQ', { name: p.name }), ok: t('fr.remove'), cancel: t('btn.no') }).then(function (yes) {
              if (yes) Net.friends.remove(p.id).then(paint, fail); else load();
            });
          }, 'ghost', t('fr.remove')]]));
      });
      if (j.outgoing.length) {
        list.appendChild(el('h3', 'fr-h', t('fr.outgoing')));
        j.outgoing.forEach(function (p) {
          list.appendChild(row(p, '⏳', t('fr.waitAccept'), [['✖', function () { Net.friends.remove(p.id).then(paint, fail); }, 'ghost', t('fr.cancelReq')]]));
        });
      }
    }
    function fail(e) { Shell.toast(errText(e), 3200); load(); }
    function load() { Net.friends.list().then(paint, function (e) { list.textContent = ''; list.appendChild(el('p', 'muted', errText(e))); }); }
    load();
    // the status changes: look again every 15 seconds while the list is open
    var timer = setInterval(function () { if (!sh.dlg.open) { clearInterval(timer); return; } load(); }, 15000);
    return Shell.closed(sh.dlg);
  }

  /**
   * A game with a friend: the friend is invited (at once if the app is open; always by the bell and the
   * phone) and this player waits for them. want: the inviter's match (when answering an invitation).
   */
  function play(f, want) {
    var s = {}, last = MBG.WhoSetup ? MBG.WhoSetup.last() : {};
    for (var k in last) s[k] = last[k];
    s.opponent = 'online'; s.ranked = false; s.daily = false;
    if (want) {
      s.lang = want.lang || s.lang; s.mode = want.mode || s.mode; s.cat = want.cat || null; s.subs = want.subs || []; s.level = want.level || s.level;
      if (want.limits) { s.time = want.limits.roundSeconds; s.questions = want.limits.maxQuestions; s.guesses = want.limits.maxWrong; s.rounds = want.limits.rounds; }
    }
    var go = function () {
      Shell.writeJson('MBG.Who.next', { setup: s, at: Date.now() });
      Shell.go('play.html?online=1&friend=' + encodeURIComponent(f.id) + '&fname=' + encodeURIComponent(f.name || ''));
    };
    // the paid edition: a game counts - check first
    if (MBG.Shop && MBG.Plan && !MBG.Plan.canPlay()) MBG.Shop.gate().then(function (ok) { if (ok) go(); });
    else go();
  }

  /**
   * 1.1.8 - a rematch (like chess.com): the same opponent again, after a match - an account or a guest, no
   * friendship needed. The other player is asked at once (Play / Not now) if the app is open; this player waits
   * and sees the answer. want: the match to repeat (its question word, language, rules; rated if it was).
   */
  function rematch(p, want, ranked) {
    var s = {}, last = MBG.WhoSetup ? MBG.WhoSetup.last() : {};
    for (var k in last) s[k] = last[k];
    s.opponent = 'online'; s.ranked = !!ranked; s.daily = false; s.friend = null;
    if (want) {
      s.lang = want.lang || s.lang; s.mode = want.mode || s.mode; s.cat = want.cat || null; s.subs = want.subs || []; s.level = want.level || s.level;
      if (want.limits) { s.time = want.limits.roundSeconds; s.questions = want.limits.maxQuestions; s.guesses = want.limits.maxWrong; s.rounds = want.limits.rounds; }
    }
    var go = function () {
      Shell.writeJson('MBG.Who.next', { setup: s, at: Date.now() });
      Shell.go('play.html?online=1&rematch=' + encodeURIComponent(p.id) + '&rname=' + encodeURIComponent(p.name || ''));
    };
    if (MBG.Shop && MBG.Plan && !MBG.Plan.canPlay()) MBG.Shop.gate().then(function (ok) { if (ok) go(); });
    else go();
  }

  /** A short message to a friend: quick answers ("In 5 minutes" …) or a line of one's own. */
  function message(f) {
    var sh = Shell.sheet({ id: 'dlgFriendMsg', title: '💬 ' + t('fr.msgTo', { name: f.name }) });
    var b = sh.body, col = el('div', 'btncol fr-quick');
    function send(text, btn) {
      if (btn) btn.disabled = true;
      Net.friends.note(f.id, text).then(function () { sh.close(); Shell.toast('✓ ' + t('fr.msgSent', { name: f.name }), 2600); },
        function (e) { if (btn) btn.disabled = false; Shell.toast(errText(e), 3200); });
    }
    ['fr.q.ready', 'fr.q.five', 'fr.q.later', 'fr.q.notToday'].forEach(function (k) {
      var bt = el('button', 'btn ghost', t(k)); bt.type = 'button';
      bt.addEventListener('click', function () { send(t(k), bt); });
      col.appendChild(bt);
    });
    b.appendChild(col);
    var fm = el('form', 'grp-form'), r = el('div', 'wlc-row'), inp = el('input', 'textfield'), go = el('button', 'btn submit', t('fr.send'));
    inp.maxLength = 140; inp.placeholder = t('fr.msgPh'); go.type = 'submit';
    r.appendChild(inp); r.appendChild(go); fm.appendChild(r);
    fm.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value.trim(); if (v) send(v, go); else inp.focus(); });
    b.appendChild(fm);
    return Shell.closed(sh.dlg);
  }

  /** From the 🔔: a friend invited you (play) - or wrote to you. Play with them, or answer. */
  function answer(link) {
    var f = { id: link.id, name: link.name || '' };
    var sh = Shell.sheet({ id: 'dlgFriendAns', title: '👫 ' + f.name });
    var b = sh.body, col = el('div', 'btncol');
    if (link.play) b.appendChild(el('p', null, t('fr.invitedYou', { name: f.name })));
    var p1 = el('button', 'btn submit', '▶ ' + t('fr.playWith', { name: f.name })); p1.type = 'button';
    p1.addEventListener('click', function () { sh.close(); play(f); });
    var p2 = el('button', 'btn ghost', '💬 ' + t('fr.reply')); p2.type = 'button';
    p2.addEventListener('click', function () { sh.close(); message(f); });
    col.appendChild(p1); col.appendChild(p2);
    b.appendChild(col);
    b.appendChild(el('p', 'muted small', t(link.play ? 'fr.invitedNote' : 'fr.msgNote', { name: f.name })));
    return Shell.closed(sh.dlg);
  }

  /** "👫 Add as a friend" (after a match): sends the request. */
  function request(p) {
    return Net.friends.request({ id: p.id }).then(function () { Shell.toast('✓ ' + t('fr.sent', { name: p.name }), 2600); }, function (e) { Shell.toast(errText(e), 3200); });
  }

  MBG.Friends = { open: open, play: play, rematch: rematch, message: message, answer: answer, request: request, ready: ready };
})(typeof self !== 'undefined' ? self : globalThis);
