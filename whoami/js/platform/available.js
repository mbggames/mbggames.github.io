/*!
 * MBG Who Am I? - available while the app is open (1.1.0).
 * Like chess.com: a player who has the app open on the home screen (and is not in a game) is
 * available. When someone searches for an opponent and nobody else is searching, the lobby invites a
 * player with the app open whose rating fits. The invitation shows who it is; both decide - "Play" or
 * "Not now" (25 seconds). Before both say yes nothing starts and nothing is lost; once the match has
 * started, leaving counts as giving up (and as a lost match when it is ranked).
 * Needs the MBG server. Guests (no MBG account) are available for other guests and for players who
 * allow guests; ranked invitations are only for MBG accounts.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell;
  var el = Shell.el, t = Shell.t;
  // (1.1.8: stopped until start() - the game screen loads this file too, and must not be "available" during a match)
  var ws = null, retry = null, sheet = null, timer = null, stopped = true, beat = null, heard = 0, pongs = false;

  function online() { return !!(MBG.WhoTransport && MBG.WhoTransport.Online.supported() && typeof WebSocket === 'function'); }

  function open() {
    if (ws || stopped || !online() || document.hidden) return;
    var url = MBG.WhoTransport.Online.prototype.url.call({}, '/api/p/live/lobby');
    try { ws = new WebSocket(url); } catch (e) { ws = null; return; }
    var mine = ws;
    heard = Date.now();
    ws.onopen = function () { mine.send(JSON.stringify({ t: 'idle', v: Shell.VERSION, lang: Shell.getLang(), guests: true })); };
    // 1.1.5: a ping every 20 seconds - the server knows this phone is really there; no answer for 50 seconds
    // (the network changed, the phone slept): connect again
    clearInterval(beat);
    beat = setInterval(function () {
      if (ws !== mine) return;
      if (mine.readyState === 1) { try { mine.send(JSON.stringify({ t: 'ping' })); } catch (e) { /* closing */ } }
      if (pongs && Date.now() - heard > 50000) { try { mine.close(4000, 'silent'); } catch (e2) { /* closed */ } if (ws === mine) { ws = null; closeSheet(''); open(); } }
    }, 20000);
    ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      heard = Date.now();
      if (m.t === 'pong') pongs = true;
      if (m.t === 'invite') invite(m);
      else if (m.t === 'friendInvite') friendInvite(m);
      else if (m.t === 'rematchInvite') rematchInvite(m);
      else if (m.t === 'inMatch') inMatch(m);
      else if (m.t === 'matchEnded') matchEnded(m);
      else if (m.t === 'accepted') note(t('online.theyAccepted', { name: m.by }));
      else if (m.t === 'declined' || m.t === 'expired') closeSheet(m.t === 'declined' ? t('online.declined', { name: m.with }) : '');
      else if (m.t === 'matched') matched(m);
    };
    ws.onclose = function () {
      if (ws !== mine) return;
      ws = null;
      closeSheet('');
      clearTimeout(retry);
      if (!stopped) retry = setTimeout(open, 3000);
    };
  }
  function close() {
    clearTimeout(retry); clearInterval(beat);
    if (ws) { try { ws.onclose = null; ws.close(1000); } catch (e) { /* closed */ } ws = null; }
    closeSheet('');
  }

  /** The invitation: who, what kind of match - Play or Not now. */
  function invite(m) {
    closeSheet('');
    var w = m.want || {}, left = m.secs || 25;
    var C = MBG.WhoCats, li = Math.max(0, Shell.LANGS.indexOf(Shell.getLang()));
    var modeName = C && C.MODES[w.mode] ? C.MODES[w.mode].title[li] : '';
    sheet = Shell.sheet({ id: 'dlgInvite', title: '🎮 ' + t('avail.title'), modal: true });
    var b = sheet.body;
    var who = el('div', 'inv-who');
    who.appendChild(el('strong', null, m.with));
    who.appendChild(el('span', 'muted', m.guest ? t('opp.guest') : '🏆 ' + Shell.num(m.rating)));
    b.appendChild(who);
    b.appendChild(el('p', null, t('avail.text', { name: m.with, mode: modeName }) + ' ' + t(w.ranked ? 'avail.ranked' : 'avail.casual')));
    // 1.1.5: few people online - a player of another language: say so and ask
    if ((m.differs || []).indexOf('lang') !== -1 && w.lang) b.appendChild(el('p', 'warn', '🌐 ' + t('online.langAsk', { name: m.with, lang: Shell.langName(w.lang) })));
    var col = el('div', 'btncol');
    var go = el('button', 'btn submit', '▶ ' + t('online.play')), no = el('button', 'btn ghost', t('avail.notNow'));
    go.type = no.type = 'button';
    var info = el('p', 'muted small inv-info');
    go.addEventListener('click', function () {
      // the paid edition: a game counts - check before saying yes
      if (MBG.Shop && MBG.Plan && !MBG.Plan.canPlay()) {
        MBG.Shop.gate().then(function (ok) { if (ok) yes(); else decline(); });
        return;
      }
      yes();
    });
    function yes() {
      go.disabled = no.disabled = true;
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'accept' }));
      note(t('online.waitOther', { name: m.with }));
    }
    function decline() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'decline' })); closeSheet(''); }
    no.addEventListener('click', decline);
    col.appendChild(go); col.appendChild(no);
    b.appendChild(col);
    b.appendChild(info);
    function tick() { if (!info.getAttribute('data-fixed')) info.textContent = t('online.decide', { s: left }); if (left-- <= 0) clearInterval(timer); }
    tick(); clearInterval(timer); timer = setInterval(tick, 1000);
    sheet.dlg.addEventListener('close', function () { if (sheet && sheet.dlg && !sheet.done) decline(); });
    try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) { /* no vibration */ }
  }
  /** 1.1.3 - a friend invites you (the app is open): Play (into their game) · Not now · a short answer. */
  function friendInvite(m) {
    closeSheet('');
    var w = m.want || {}, C = MBG.WhoCats, li = Math.max(0, Shell.LANGS.indexOf(Shell.getLang()));
    var modeName = C && C.MODES[w.mode] ? C.MODES[w.mode].title[li] : '';
    sheet = Shell.sheet({ id: 'dlgFriendInvite', title: '👫 ' + t('fr.invTitle', { name: m.from }), modal: true });
    var b = sheet.body;
    var who = el('div', 'inv-who');
    who.appendChild(MBG.Account.picture(m.avatar || '', 'av-md'));
    who.appendChild(el('strong', null, m.from));
    b.appendChild(who);
    b.appendChild(el('p', null, t('fr.invText', { name: m.from, mode: modeName })));
    var col = el('div', 'btncol'), f = { id: m.id, name: m.from };
    var go = el('button', 'btn submit', '▶ ' + t('online.play')), msg = el('button', 'btn ghost', '💬 ' + t('fr.reply')), no = el('button', 'btn ghost', t('avail.notNow'));
    go.type = msg.type = no.type = 'button';
    go.addEventListener('click', function () { sheet.done = true; closeSheet(''); stopped = true; close(); MBG.Friends.play(f, w); });
    msg.addEventListener('click', function () { sheet.done = true; closeSheet(''); MBG.Friends.message(f); });
    function decline() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'friendNo', id: m.id })); closeSheet(''); }
    no.addEventListener('click', decline);
    col.appendChild(go); col.appendChild(msg); col.appendChild(no);
    b.appendChild(col);
    sheet.dlg.addEventListener('close', function () { if (sheet && sheet.dlg && !sheet.done) decline(); });
    try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) { /* no vibration */ }
  }
  /** 1.1.8 - the opponent of the match just played asks for a rematch: Play · Not now. */
  function rematchInvite(m) {
    closeSheet('');
    sheet = Shell.sheet({ id: 'dlgRematch', title: '🔁 ' + t('rm.invTitle', { name: m.from }), modal: true });
    var b = sheet.body;
    var who = el('div', 'inv-who');
    who.appendChild(MBG.Account.picture(m.avatar || '', 'av-md'));
    who.appendChild(el('strong', null, m.from));
    b.appendChild(who);
    b.appendChild(el('p', null, t('rm.invText', { name: m.from })));
    var col = el('div', 'btncol'), w = m.want || {};
    var go = el('button', 'btn submit', '▶ ' + t('online.play')), no = el('button', 'btn ghost', t('avail.notNow'));
    go.type = no.type = 'button';
    go.addEventListener('click', function () { sheet.done = true; closeSheet(''); stopped = true; close(); MBG.Friends.rematch({ id: m.id, name: m.from }, w, !!w.ranked); });
    function decline() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'friendNo', id: m.id })); closeSheet(''); }
    no.addEventListener('click', decline);
    col.appendChild(go); col.appendChild(no);
    b.appendChild(col);
    sheet.dlg.addEventListener('close', function () { if (sheet && sheet.dlg && !sheet.done) decline(); });
    try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) { /* no vibration */ }
  }
  /**
   * 1.1.8 - this player is still in a match (they closed it without leaving: the app was closed, the back
   * button ...): back to it, or leave it - leaving counts as leaving (nothing counts before the first question).
   */
  var inMatchShown = '';
  function inMatch(m) {
    if (sheet || inMatchShown === m.room) return;
    inMatchShown = m.room;
    sheet = Shell.sheet({ id: 'dlgInMatch', title: '⏸️ ' + t('im.title'), modal: true });
    var b = sheet.body;
    b.appendChild(el('p', null, t('im.text', { name: m.with || '?' })));
    var col = el('div', 'btncol');
    var back = el('button', 'btn submit', '▶ ' + t('im.back')), leave = el('button', 'btn ghost', t('im.leave'));
    back.type = leave.type = 'button';
    back.addEventListener('click', function () {
      sheet.done = true; closeSheet(''); stopped = true; close();
      var s = MBG.WhoSetup ? MBG.WhoSetup.last() : {};
      s.opponent = 'online'; s.room = m.room; s.daily = false;
      Shell.writeJson('MBG.Who.next', { setup: s, at: Date.now() });
      Shell.go('play.html?matched=' + encodeURIComponent(m.room));
    });
    leave.addEventListener('click', function () {
      sheet.done = true;
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'quitMatch', room: m.room }));
      closeSheet('🚪 ' + t('im.left'));
    });
    col.appendChild(back); col.appendChild(leave);
    b.appendChild(col);
    b.appendChild(el('p', 'muted small', t('im.note')));
    var mine = sheet;
    sheet.dlg.addEventListener('close', function () { if (sheet === mine) sheet = null; });
  }
  /**
   * 1.1.8 - a match ended while this player was not there: why (closed the match screen and did not come back /
   * the connection was lost) and how it counts. Told once, when the app is open again.
   */
  function matchEnded(m) {
    closeSheet('');
    sheet = Shell.sheet({ id: 'dlgEnded', title: (m.why === 'screen' ? '🚪 ' : '📡 ') + t('end.title', { name: m.with || '?' }), modal: true });
    var b = sheet.body;
    b.appendChild(el('p', null, MBG.WhoEndNote ? MBG.WhoEndNote.why(m) : ''));
    b.appendChild(el('p', 'statline' + (m.outcome === 'lost' ? '' : ' good'), MBG.WhoEndNote ? MBG.WhoEndNote.outcome(m) : ''));
    var col = el('div', 'btncol'), ok = el('button', 'btn submit', t('end.ok'));
    ok.type = 'button';
    ok.addEventListener('click', function () { closeSheet(''); });
    col.appendChild(ok);
    b.appendChild(col);
    var mine = sheet;
    sheet.dlg.addEventListener('close', function () { if (sheet === mine) sheet = null; });
  }
  /** The texts of an end notice (also used by the game screen). */
  MBG.WhoEndNote = {
    why: function (m) {
      if (m.why === 'screen') return t('end.screen');
      if (m.voided === 'away') return t('end.netEnded', { name: m.by || m.with || '?' });
      return t('end.net');
    },
    outcome: function (m) {
      if (m.outcome === 'void') return '✅ ' + t('end.void');
      if (m.outcome === 'won') return '🏆 ' + t('end.won');
      if (m.outcome === 'draw') return '🤝 ' + t('end.draw');
      return '👎 ' + t(m.ranked ? 'end.lostRanked' : 'end.lost');
    }
  };
  function note(text) {
    var i = sheet && sheet.body.querySelector('.inv-info');
    if (i) { i.setAttribute('data-fixed', '1'); i.textContent = text; }
  }
  function closeSheet(toast) {
    clearInterval(timer);
    if (sheet) { var s = sheet; sheet = null; s.done = true; try { s.close(); } catch (e) { /* closed */ } }
    if (toast) Shell.toast(toast, 3200);
  }
  /** Both said yes: into the match room. */
  function matched(m) {
    if (sheet) sheet.done = true;
    closeSheet('');
    stopped = true;
    var w = m.want || {}, s = {};
    var last = MBG.WhoSetup ? MBG.WhoSetup.last() : {};
    for (var k in last) s[k] = last[k];
    s.opponent = 'online'; s.lang = w.lang || s.lang; s.mode = w.mode || 'who'; s.cat = w.cat || null; s.subs = w.subs || [];
    s.level = w.level || s.level; s.ranked = !!w.ranked; s.daily = false; s.room = m.room;
    if (w.limits) { s.time = w.limits.roundSeconds; s.questions = w.limits.maxQuestions; s.guesses = w.limits.maxWrong; s.rounds = w.limits.rounds; }
    Shell.writeJson('MBG.Who.next', { setup: s, at: Date.now() });
    if (ws) { try { ws.onclose = null; ws.close(1000); } catch (e) { /* closed */ } ws = null; }
    Shell.go('play.html?matched=' + encodeURIComponent(m.room));
  }

  // available while the home screen is open and visible; not when the app is in the background
  document.addEventListener('visibilitychange', function () { if (document.hidden) close(); else open(); });
  root.addEventListener('pagehide', function () { stopped = true; close(); });

  MBG.Available = { start: function () { stopped = false; open(); }, stop: function () { stopped = true; close(); }, isOn: function () { return !!ws; } };
})(typeof self !== 'undefined' ? self : globalThis);
