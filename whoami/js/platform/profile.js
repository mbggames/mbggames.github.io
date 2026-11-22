/*!
 * MBG Who Am I? - a player's profile (1.1.4).
 * Open to everyone, also guests: the rating with its title, the place among all rated players, the matches
 * against people (won, lost) and since when. Tap a name - in the Top 20, among friends, in a game, after a
 * match - or your own picture. A rating is "provisional" until it settles (5 ranked matches), shown anyway.
 * For a signed-in viewer: add as a friend, accept, or invite a friend to a game.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;

  function stat(box, icon, label, value) {
    var d = el('div', 'pf-stat');
    d.appendChild(el('span', 'pf-ic', icon));
    var tx = el('span', 'pf-t');
    tx.appendChild(el('span', 'muted small', label));
    tx.appendChild(el('strong', null, value));
    d.appendChild(tx);
    box.appendChild(d);
  }
  function monthYear(ms) {
    try { return new Date(ms).toLocaleDateString(Shell.getLang(), { month: 'long', year: 'numeric' }); } catch (e) { return new Date(ms).getFullYear() + ''; }
  }

  /** o: { id } or { name } - a player with an MBG account. */
  function open(o) {
    o = o || {};
    var sh = Shell.sheet({ id: 'dlgProfile', title: '👤 ' + (o.name || t('pf.title')), cls: 'pfsheet' });
    var b = sh.body;
    if (Net.demo) { b.appendChild(el('p', 'muted', t('pf.needServer'))); return Shell.closed(sh.dlg); }
    var wait = el('p', 'muted', '⏳ ' + t('ld.wait') + '…');
    b.appendChild(wait);
    Net.player(o).then(function (j) { paint(j.player); }, function () { wait.textContent = t('pf.none'); });

    function paint(p) {
      b.textContent = '';
      var who = el('div', 'ac-who pf-who');
      who.appendChild(MBG.Account.picture(p.avatar || '', 'av-lg'));
      var wt = el('div', 'ac-who-text');
      wt.appendChild(el('strong', null, p.name));
      wt.appendChild(el('span', 'pf-rating', '🏆 ' + Shell.num(p.rating) + ' · ' + t('title.' + p.title)));
      who.appendChild(wt);
      b.appendChild(who);
      if (p.provisional) b.appendChild(el('p', 'muted small', t(p.ranked ? 'pf.provisional' : 'pf.unrated', { n: p.ranked })));
      var grid = el('div', 'pf-grid');
      stat(grid, '🌍', t('pf.place'), p.place ? t('pf.placeOf', { n: Shell.num(p.place), all: Shell.num(p.players) }) : '–');
      stat(grid, '🎮', t('pf.matches'), Shell.num(p.matches));
      stat(grid, '✅', t('pf.won'), Shell.num(p.wins));
      stat(grid, '❌', t('pf.lost'), Shell.num(p.losses));
      b.appendChild(grid);
      // the accounts come from MBG Puzzles: seconds or milliseconds - and nothing before MBG existed
      var since = p.since && p.since < 1e11 ? p.since * 1000 : p.since;
      if (since && since > Date.UTC(2024, 0, 1)) b.appendChild(el('p', 'muted small', '📅 ' + t('pf.since', { d: monthYear(since) })));
      if (p.me) { b.appendChild(el('p', 'muted small', t('pf.meNote'))); return; }
      // friends (MBG accounts)
      if (!MBG.Friends || !MBG.Friends.ready() || !p.friend) return;
      var col = el('div', 'btncol');
      function btn(label, cls, fn) { var x = el('button', 'btn ' + cls, label); x.type = 'button'; x.addEventListener('click', function () { x.disabled = true; fn(x); }); col.appendChild(x); }
      if (p.friend === 'friends') {
        btn('▶ ' + t('fr.playWith', { name: p.name }), 'submit', function () { sh.close(); MBG.Friends.play({ id: p.id, name: p.name }); });
        btn('💬 ' + t('fr.message'), 'ghost', function (x) { x.disabled = false; MBG.Friends.message({ id: p.id, name: p.name }); });
      } else if (p.friend === 'wantsYou') {
        btn('✅ ' + t('pf.acceptFriend'), 'submit', function () { Net.friends.answer(p.id, true).then(function () { p.friend = 'friends'; paint(p); }, function () { Shell.toast(t('online.error'), 3000); }); });
      } else if (p.friend === 'asked') {
        b.appendChild(el('p', 'muted small', '⏳ ' + t('pf.asked')));
      } else {
        btn('👫 ' + t('fr.addThis'), 'ghost', function () { MBG.Friends.request(p).then(function () { p.friend = 'asked'; paint(p); }); });
      }
      b.appendChild(col);
    }
    return Shell.closed(sh.dlg);
  }

  /** Makes a name tappable: opens the profile (only players with an MBG account - guests have none). */
  function link(node, o) {
    if (!node || !o || (!o.id && !o.name) || (o.id && String(o.id).indexOf('g_') === 0) || Net.demo) return node;
    node.classList.add('pf-link');
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    var go = function (e) { e.preventDefault(); e.stopPropagation(); open(o); };
    node.addEventListener('click', go);
    node.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(e); });
    return node;
  }

  MBG.Profile = { open: open, link: link };
})(typeof self !== 'undefined' ? self : globalThis);
