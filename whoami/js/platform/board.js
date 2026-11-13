/*!
 * MBG Games - the MBG Board: messages from players to players, shared by every MBG game.
 * Channels: all MBG games, each game, and "looking for a game". Posting needs a player name (an
 * MBG account once the server is connected); reading is open. Replies, reactions, report and mute
 * (FR-025); posts are short and plain text. Three reports from different players hide a post on
 * the server until a moderator looks at it.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;
  var CHANNELS = ['all', 'whoami', 'puzzles', 'lfg'];
  var REACT = ['👍', '❤️', '😂', '🎉'];
  var MUTE = 'MBG.Platform.muted';

  function muted() { return Shell.readJson(MUTE, []); }
  function initial(name) { var m = /\p{L}/u.exec(String(name || '?')); return m ? m[0].toUpperCase() : '?'; }

  function open(channel) {
    var ch = channel || 'all', replyTo = null;
    var sh = Shell.sheet({ id: 'dlgBoard', title: '💬 ' + t('board.title'), cls: 'boardsheet' });
    var b = sh.body;
    function draw() {
      b.textContent = '';
      if (Net.demo) b.appendChild(el('p', 'demoline small', '🧪 ' + t('demo.board')));
      var seg = el('div', 'chipset');
      CHANNELS.forEach(function (c) {
        var x = el('button', 'pickchip' + (ch === c ? ' on' : ''), t('board.ch.' + c));
        x.type = 'button';
        x.addEventListener('click', function () { ch = c; replyTo = null; draw(); });
        seg.appendChild(x);
      });
      b.appendChild(seg);
      // composer
      var me = Shell.getUser();
      var f = el('form', 'composer');
      if (me.mode === 'anonymous') {
        f.appendChild(el('p', 'muted small', t('board.needName')));
        var nm = el('button', 'btn ghost small', t('board.chooseName'));
        nm.type = 'button';
        nm.addEventListener('click', function () { MBG.Account.open().then(draw); });
        f.appendChild(nm);
      } else {
        if (replyTo) {
          var rp = el('p', 'small reply-to', '↩ ' + t('board.replyTo', { name: replyTo.author.name }) + ' ');
          var cx = el('button', 'linkbtn', t('dlg.cancel')); cx.type = 'button';
          cx.addEventListener('click', function () { replyTo = null; draw(); });
          rp.appendChild(cx); f.appendChild(rp);
        }
        var ta = el('textarea', 'textfield');
        ta.maxLength = 800; ta.rows = 2; ta.placeholder = t(ch === 'lfg' ? 'board.phLfg' : 'board.ph');
        f.appendChild(ta);
        var row = el('div', 'composer-row');
        row.appendChild(el('span', 'muted small', t('board.as', { name: me.name })));
        var send = el('button', 'btn submit small', t('board.send')); send.type = 'submit';
        row.appendChild(send);
        f.appendChild(row);
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var v = ta.value.trim();
          if (v.length < 2) return;
          send.disabled = true;
          Net.board.post(replyTo ? replyTo.channel : (ch === 'all' ? 'all' : ch), v, replyTo && replyTo.id).then(function () { replyTo = null; draw(); },
            function (er) { send.disabled = false; Shell.toast(t(er && er.message === 'signin' ? 'board.needName' : 'board.failed')); });
        });
      }
      b.appendChild(f);
      var list = el('div', 'posts');
      b.appendChild(list);
      Net.board.list(ch).then(function (posts) {
        var mu = muted();
        posts = posts.filter(function (p) { return mu.indexOf(p.author.id) === -1; });
        if (!posts.length) list.appendChild(el('p', 'empty muted', t('board.empty')));
        posts.forEach(function (p) { list.appendChild(post(p, false)); });
      }, function () { list.appendChild(el('p', 'empty muted', t('board.offline'))); });
    }
    function post(p, reply) {
      var me = Shell.getUser(), mine = me.name && p.author.name === me.name;
      var box = el('article', 'post' + (reply ? ' reply' : '') + (p.author.staff ? ' staff' : ''));
      var head = el('div', 'post-head');
      head.appendChild(el('span', 'post-av', p.author.staff ? 'M' : initial(p.author.name)));
      var who = el('span', 'post-who');
      who.appendChild(el('strong', null, p.author.name + (p.author.staff ? ' ✓' : '')));
      who.appendChild(el('small', 'muted', Shell.ago(p.at) + (p.channel && p.channel !== 'all' && ch === 'all' ? ' · ' + t('board.ch.' + p.channel) : '')));
      head.appendChild(who);
      box.appendChild(head);
      box.appendChild(el('p', 'post-text', p.text));
      var bar = el('div', 'post-bar');
      REACT.forEach(function (r) {
        var n = (p.reactions && p.reactions[r] || []).length;
        var rb = el('button', 'react' + (n ? ' has' : ''), r + (n ? ' ' + n : ''));
        rb.type = 'button';
        rb.setAttribute('aria-label', r);
        rb.addEventListener('click', function () { if (me.mode === 'anonymous') { Shell.toast(t('board.needName')); return; } Net.board.react(p.id, r).then(draw); });
        bar.appendChild(rb);
      });
      if (!reply && me.mode !== 'anonymous') {
        var re = el('button', 'linkbtn', t('board.reply')); re.type = 'button';
        re.addEventListener('click', function () { replyTo = p; draw(); var ta = b.querySelector('textarea'); if (ta) ta.focus(); });
        bar.appendChild(re);
      }
      var more = el('button', 'linkbtn muted', '⋯'); more.type = 'button';
      more.setAttribute('aria-label', t('board.more'));
      more.addEventListener('click', function () { menu(p, mine); });
      bar.appendChild(more);
      box.appendChild(bar);
      (p.replies || []).forEach(function (r) { box.appendChild(post(r, true)); });
      return box;
    }
    function menu(p, mine) {
      var m = Shell.sheet({ id: 'dlgPostMenu', title: p.author.name });
      function act(label, fn) { var x = el('button', 'btn ghost', label); x.type = 'button'; x.addEventListener('click', function () { m.close(); fn(); }); m.body.appendChild(x); }
      if (mine) act('🗑 ' + t('board.delete'), function () { Net.board.remove(p.id).then(draw); });
      else {
        act('🔇 ' + t('board.mute', { name: p.author.name }), function () { var mu = muted(); mu.push(p.author.id); Shell.writeJson(MUTE, mu); draw(); Shell.toast(t('board.muted')); });
        act('🚩 ' + t('board.report'), function () { Net.board.report(p.id, 'user').then(function () { Shell.toast(t('board.reported')); }); });
      }
      m.body.classList.add('menu-list');
    }
    draw();
    return Shell.closed(sh.dlg);
  }

  MBG.Board = { open: open, CHANNELS: CHANNELS };
})(typeof self !== 'undefined' ? self : globalThis);
