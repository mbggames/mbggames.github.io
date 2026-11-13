/*!
 * MBG Who Am I? - the game screen (sections 7, 8, 9).
 * The Guesser sees the concealed card, the category, the clock, the questions left, the history,
 * a question field and the final guess (FR section 7). The Answerer sees the hidden answer, the
 * question and the four answers Yes / No / Both / Unknown (FR-018) - plus "not a yes/no question"
 * (FR-020). Every question and answer stays in the history (FR-019). Chat is separate (FR-022).
 * Behaviour taken over from MBG Puzzles: the rules open at the start until "Don't show this at the
 * start" is ticked ("▶ Play now" first), Back leads home, the same settings, sounds and win cards.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, C = MBG.WhoCats, Q = MBG.WhoQuestions, X = MBG.WhoText, E = MBG.WhoEngine;
  var $ = function (id) { return document.getElementById(id); };
  var el = Shell.el, t = Shell.t;
  var params = new URLSearchParams(root.location.search);
  var next = Shell.readJson('MBG.Who.next', null);
  var setup = (next && next.setup) || MBG.WhoSetup.last();
  var L = function (key, p) { return Shell.tIn(setup.lang, key, p); };      // texts of the match: the playing language (FR-008)
  var LIx = Math.max(0, Shell.LANGS.indexOf(setup.lang));
  var prefs = Shell.getPrefs();
  var tr = null, view = null, shownEnd = -1, shownStart = -1, shownResult = false, chatOpen = false, chatSeen = 0, lastEvT = 0;
  var audio = MBG.Audio ? new MBG.Audio.AudioService({ tick: 'sounds/ticktock.wav', hit0: 'sounds/hit0.wav', hit1: 'sounds/hit1.wav',
    warn: 'sounds/warn.wav', correct: 'sounds/correct.wav', close: 'sounds/close.wav', slap: 'sounds/slap.wav', start: 'sounds/start.wav',
    win1: 'sounds/win1.wav', win2: 'sounds/win2.wav', win3: 'sounds/win3.wav', win4: 'sounds/win4.wav', win5: 'sounds/win5.wav', win6: 'sounds/win6.wav', win7: 'sounds/win7.wav' },
    { enabled: prefs.sound, keys: 'off' }).init() : null;
  document.addEventListener('pointerdown', function () { if (audio) audio.unlock(); }, { once: true });
  var paintSound = Shell.soundButton($('btnSound'), function (on) { prefs.sound = on; if (audio) { audio.setEnabled(on); if (on) audio.unlock(); } });
  function soundOn() { return prefs.sound && !(MBG.Shell.phoneSilent && MBG.Shell.phoneSilent()); }
  function play(k) { if (audio && soundOn()) audio._play(k); }
  /** When the clock starts to tick: 45 s of a 3-minute round, a quarter of other rounds (15 s - 60 s). */
  function warnAt(total) { return Math.max(15, Math.min(60, Math.round(total / 4 / 5) * 5)); }
  var warned = -1;

  Shell.applyLook();
  document.documentElement.lang = setup.lang;
  var app = $('app');
  app.setAttribute('data-mode', setup.mode);
  if (matchMedia('(pointer: coarse)').matches) app.classList.add('touch-ui');
  // the corner: "Puzzle of the day" (this game - or a way to it)
  function paintDaily() { if (MBG.DailyUI) MBG.DailyUI.pill($('dailyPill'), { setup: setup, L: L, busy: function () { return !!(view && view.round && !view.result && !view.watching); } }); }
  paintDaily();

  /* -------------------------------------------------------------- helpers --- */
  function me() { return view && view.me; }
  function round() { return view && view.round; }
  /** guesser, answerer, watching (a player whose turn it is not), observer (watching the match), outside (waiting to be let in) */
  function role() {
    var r = round();
    if (!r) return null;
    if (view.outside) return 'outside';
    if (view.watching) return 'observer';
    return r.guesser === me() ? 'guesser' : r.answerer === me() ? 'answerer' : 'watching';
  }
  function player(id) { return (view.players || []).filter(function (p) { return p.id === id; })[0] || (view.watchers || []).filter(function (p) { return p.id === id; })[0] || {}; }
  /** The other side of my round: the Answerer for the Guesser, the Guesser for everyone else. */
  function other() {
    var r = round();
    if (r) return player(r.guesser === me() ? r.answerer : r.guesser);
    return (view.players || []).filter(function (p) { return p.id !== me(); })[0] || {};
  }
  function many() { return (view.players || []).length > 2; }
  function catLabel() {
    var cat = view && view.cat ? C.CATS[view.cat] : null;
    if (!cat) return C.MODES[setup.mode].title[LIx];
    var s = (view.subs || []).filter(function (x) { return cat.subs[x]; }).map(function (x) { return C.name(cat.subs[x], setup.lang); });
    return cat.icon + ' ' + C.name(cat, setup.lang) + (s.length ? ' · ' + s.slice(0, 2).join(', ') : '');
  }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function respBadge(code) { return el('span', 'resp r-' + String(code).toLowerCase(), L('resp.' + code)); }

  /* --------------------------------------------------------------- render --- */
  function render(v, ev) {
    view = v;
    var r = round();
    if (!r) return;
    var rl = role();
    app.setAttribute('data-role', rl);
    $('roundChip').textContent = L('round.chip', { n: r.index + 1, of: view.totalRounds || view.cfg.rounds }) + ' · ' +
      L({ guesser: 'round.youGuess', answerer: 'round.youAnswer', watching: 'round.watching', observer: 'round.observer', outside: 'round.observer' }[rl]);
    // the players and their scores: with two, always the same sides; with more, the Guesser and the Answerer
    var pa = many() ? player(r.guesser) : view.players[0], pb = many() ? player(r.answerer) : view.players[1];
    [['plA', pa], ['plB', pb]].forEach(function (x) {
      var box = $(x[0]), p = x[1];
      box.textContent = '';
      box.classList.toggle('turn', r.guesser === p.id && r.status === 'playing');
      box.classList.toggle('mine', p.id === me());
      var av = p.kind === 'bot' ? el('span', 'av av-sm av-emoji bot', '🤖') : MBG.Account.picture(p.id === me() ? MBG.Account.avatar() : '', 'av-sm');
      box.appendChild(av);
      var tx = el('span', 'pl-t');
      tx.appendChild(el('span', 'pl-name', p.id === me() ? L('you') : p.name));
      tx.appendChild(el('b', 'num pl-score', String(view.totals[p.id] || 0)));
      box.appendChild(tx);
    });
    renderMore(r);
    renderRequests();
    // the clock: the Guesser's time
    var rem = r.remaining, frac = rem / (view.cfg.roundSeconds + (r.bonusSec || 0));
    $('clock').textContent = mmss(rem);
    var ring = $('ring'), len = 2 * Math.PI * 19;
    ring.style.strokeDasharray = len.toFixed(1);
    ring.style.strokeDashoffset = (len * (1 - frac)).toFixed(1);
    // the last seconds (45 of 3 minutes): a soft wooden tick-tock, a little faster in the last 10 seconds
    var warn = warnAt(view.cfg.roundSeconds), ticking = rem <= warn && rem > 0 && r.status === 'playing' && !r.pending && rl === 'guesser';
    $('clockBox').classList.toggle('low', rem <= warn && r.status === 'playing');
    $('clockBox').classList.toggle('final', rem <= 10 && r.status === 'playing');
    $('clockBox').classList.toggle('paused', !!r.pending && r.status === 'playing');
    if (ticking && warned !== r.index) {
      warned = r.index;
      if (rem > warn - 3) { play('warn'); Shell.toast('⏳ ' + L('clock.warn', { s: warn }), 2600); }
    }
    if (audio) {
      if (ticking && soundOn() && prefs.tick !== false) audio.startTick(); else audio.stopTick();
      try { if (audio.els.tick) audio.els.tick.playbackRate = rem <= 10 ? 1.35 : 1; } catch (e) { /* older browsers */ }
    }
    // the card
    var card = $('card');
    card.className = 'fcard big mode-' + view.mode;
    // everyone but the Guesser sees the card (the Answerer, the other players, the observers)
    var open = !!r.answer && (rl !== 'guesser' || r.status !== 'playing');
    card.classList.toggle('open', open);
    $('cardIcon').textContent = C.MODES[view.mode].icon;
    $('cardCat').textContent = catLabel();
    $('cardCat2').textContent = rl === 'answerer' && r.status === 'playing' ? L('card.yours') : catLabel();
    if (r.answer) {
      $('cardName').textContent = X.labelIn(r.answer, setup.lang);
      $('cardFacts').textContent = MBG.WhoFacts.line(r.answer, setup.lang);
    }
    // questions left and guesses
    var pips = $('pips');
    pips.textContent = '';
    for (var i = 0; i < view.cfg.maxQuestions + (r.bonusQ || 0); i++) pips.appendChild(el('span', 'pip' + (i < r.used ? ' used' : '') + (i >= view.cfg.maxQuestions ? ' bonus' : '')));
    $('meterText').textContent = L('meter', { q: r.questionsLeft, g: view.cfg.maxWrong - r.wrong }) + ' · ' + C.LEVELS[view.level].names[LIx] + ' ×' + C.LEVELS[view.level].mult.toFixed(2);
    var hl = $('hintLine');
    hl.hidden = !r.hints.length && !r.spell;
    hl.textContent = (r.hints.length ? '💡 ' + r.hints.map(clueText).join(' · ') : '') + (r.spell ? (r.hints.length ? '   ' : '') + '✏️ ' + r.spell : '');
    countGame(r, rl);
    renderLog(r);
    renderControls(r, rl);
    renderChatBadge();
    if (ev) react(ev, r, rl);
    if (r.status === 'playing' && shownStart !== r.index) { shownStart = r.index; forehead(r, rl); }
    if (r.status !== 'playing' && shownEnd !== r.index) { shownEnd = r.index; setTimeout(function () { roundEnd(r); }, 700); }
  }
  function clueText(c) {
    if (c.k === 'letter') return L('clue.letter', { v: c.v });
    if (c.k === 'century') return L('clue.century', { v: c.v < 0 ? Q.yearText(c.v * 100, setup.lang).replace(/^\d+/, String(-c.v)) : c.v });
    if (c.k === 'country') return L('clue.country', { v: MBG.WhoLex.countryName(c.v, setup.lang) });
    if (c.k === 'continent') return L('clue.country', { v: MBG.WhoLex.continentName(c.v, setup.lang) });
    if (c.k === 'tag') return L('clue.tag', { v: L('tag.' + c.v) });
    if (c.k === 'words') return L('clue.words', { v: c.v });
    return '';
  }
  var logKey = '';
  function renderLog(r) {
    var log = $('log'), rl = role();
    // rebuilt only when something changed (the clock renders every half second)
    var key = r.index + '|' + r.status + '|' + JSON.stringify(r.turns.map(function (x) { return [x.id, x.code]; })) + '|' + r.guesses.length + '|' + (view.flags || []).length;
    if (key === logKey) return;
    logKey = key;
    log.textContent = '';
    r.turns.forEach(function (tu, i) {
      var li = el('li', 'qa' + (tu.code === 'INVALID' ? ' invalid' : ''));
      var by = r.guesser === me() ? 'mine' : 'theirs';
      li.classList.add(by);
      li.appendChild(el('span', 'qa-n num', String(i + 1)));
      var body = el('div', 'qa-body');
      body.appendChild(el('p', 'qa-q', tu.q));
      var foot = el('div', 'qa-foot');
      if (tu.code) foot.appendChild(respBadge(tu.code));
      else foot.appendChild(el('span', 'resp r-wait', '…'));
      if (tu.code === 'INVALID') foot.appendChild(el('span', 'qa-note', L(tu.note === 'guess' ? 'inv.guess' : tu.note === 'timeout' ? 'inv.timeout' : 'inv.unknown')));
      // after the round, the Guesser can challenge an answer of the other player (FR-026)
      if (tu.code && tu.code !== 'INVALID' && r.guesser === me()) {
        var fl = el('button', 'flagbtn', '⚑');
        fl.type = 'button';
        fl.title = L('disp.flag');
        fl.setAttribute('aria-label', L('disp.flag'));
        var flagged = (view.flags || []).some(function (f) { return f.turn === tu.id && f.round === r.index; });
        if (flagged) fl.classList.add('on');
        fl.addEventListener('click', function () {
          if (r.status === 'playing') { tr.act('flag', { round: r.index, turn: tu.id, reason: '' }); Shell.toast(L('disp.marked')); }
          else MBG.Judge.dispute({ view: view, round: r, turn: tu, me: me() });
        });
        foot.appendChild(fl);
      }
      body.appendChild(foot);
      li.appendChild(body);
      log.appendChild(li);
    });
    r.guesses.forEach(function (g) {
      var li = el('li', 'qa guessrow ' + (g.correct ? 'right' : g.near ? 'near' : 'wrong'));
      li.appendChild(el('span', 'qa-n', '🎯'));
      li.appendChild(el('p', 'qa-q', (g.correct ? '✅ ' : g.near ? '✏️ ' : '❌ ') + g.text + (g.near ? ' – ' + L('guess.nearShort') : '')));
      log.appendChild(li);
    });
    var empty = $('qempty');
    empty.hidden = r.turns.length > 0 || r.guesses.length > 0;
    empty.textContent = L(rl === 'guesser' ? 'log.emptyGuesser' : rl === 'answerer' ? 'log.emptyAnswerer' : 'log.emptyWatching', { name: player(r.guesser).name });
    var h = $('history');
    h.scrollTop = h.scrollHeight;
  }
  function renderControls(r, rl) {
    var playing = r.status === 'playing', pend = r.pending;
    var pendTurn = pend ? r.turns.filter(function (x) { return x.id === pend; })[0] : null;
    var guesser = rl === 'guesser';
    $('askForm').hidden = !guesser || !playing;
    $('chips').hidden = !guesser || !playing || !prefs.chips;
    $('btnGuess').hidden = !guesser || !playing;
    $('btnHint').hidden = !guesser || !playing || !view.cfg.hints;
    $('btnBoost').hidden = !guesser || !playing || !view.vsComputer || !!setup.daily;   // the puzzle of the day: no power-ups
    $('q').disabled = !!pend || r.questionsLeft <= 0;
    $('btnAsk').disabled = !!pend || r.questionsLeft <= 0;
    $('q').placeholder = r.questionsLeft <= 0 ? L('ask.noMore') : pend ? L('ask.waiting') : L('ask.ph');
    if (MBG.Voice && MBG.Voice.listening() && !$('q').disabled && guesser && playing) $('q').placeholder = L('voice.listening');
    else if (MBG.Voice && MBG.Voice.listening() && $('btnMic').classList.contains('on')) MBG.Voice.stop();   // the turn moved on
    $('btnMic').disabled = $('q').disabled;
    $('btnHint').disabled = !!pend || r.questionsLeft < view.cfg.hintCost;
    $('btnGuess').disabled = !!pend;
    // the Answerer's pad
    var pad = $('respondPad');
    var canAnswer = !guesser && playing && pendTurn && r.answerer === me();
    pad.hidden = !canAnswer;
    if (canAnswer) {
      $('rpQ').textContent = '“' + pendTurn.q + '”';
      var hint = $('rpHint');
      if (prefs.dataHint && r.answer) {
        var a = Q.answer(pendTurn.q, r.answer, setup.lang);
        hint.hidden = a.code === 'INVALID';
        hint.textContent = '';
        if (!hint.hidden) { hint.appendChild(document.createTextNode(L('rp.data') + ' ')); hint.appendChild(respBadge(a.code)); }
      } else hint.hidden = true;
    }
    var wait = $('waitLine');
    wait.hidden = true;
    var looker = rl === 'watching' || rl === 'observer' || rl === 'outside';
    if (playing && guesser && pend) { wait.hidden = false; wait.textContent = L('wait.answer', { name: other().kind === 'bot' ? L('cpu.short') : other().name }); }
    else if (playing && looker) { wait.hidden = false; wait.textContent = L(rl === 'outside' ? 'wait.outside' : 'wait.watching', { g: player(r.guesser).name, a: player(r.answerer).name }); }
    else if (playing && !guesser && !pend) { wait.hidden = false; wait.textContent = L(other().kind === 'bot' ? 'wait.cpuThinks' : 'wait.question', { name: other().name }); }
    $('watchBar').hidden = rl !== 'observer';
    if (rl === 'observer') renderWatchBar();
    $('btnChat').hidden = rl === 'outside';
    renderChips(r);
  }
  /* ----------------------------------------- more players, observers, invites --- */
  function renderMore(r) {
    var box = $('plMore'), shown = many() || (view.watchers || []).length || canInvite();
    box.hidden = !shown;
    if (!shown) return;
    box.textContent = '';
    if (many()) view.players.forEach(function (p) {
      if (p.id === r.guesser || p.id === r.answerer) return;
      var c = el('span', 'pmchip' + (p.left ? ' left' : '') + (p.id === me() ? ' mine' : ''));
      c.appendChild(el('span', null, (p.id === me() ? L('you') : p.name)));
      c.appendChild(el('b', 'num', String(view.totals[p.id] || 0)));
      box.appendChild(c);
    });
    if ((view.watchers || []).length) box.appendChild(el('span', 'pmchip watch', '👀 ' + L('obs.count', { n: view.watchers.length })));
    if (canInvite()) {
      var inv = el('button', 'pmchip invite', '➕ ' + L('inv.btn'));
      inv.type = 'button';
      inv.addEventListener('click', openInvite);
      box.appendChild(inv);
    }
  }
  function canInvite() { return view && !view.vsComputer && view.access !== 'closed' && view.state !== 'done' && !view.watching && !view.outside && tr && tr.inviteCode && tr.inviteCode(); }
  /** "Clara wants to play – accept?" (when the players decide; with "everyone welcome" nobody is asked). */
  var decided = {};
  function renderRequests() {
    var bar = $('reqBar'), list = (view.requests || []).filter(function (q) { return !decided[q.id] && q.ok.indexOf(me()) === -1; });
    bar.hidden = !list.length;
    bar.textContent = '';
    list.slice(0, 2).forEach(function (q) {
      var row = el('div', 'reqrow');
      row.appendChild(el('span', null, (q.as === 'play' ? '🎮 ' : '👀 ') + L(q.as === 'play' ? 'req.play' : 'req.watch', { name: q.name })));
      var yes = el('button', 'btn submit small', '✓ ' + L('req.yes')), no = el('button', 'btn ghost small', L('req.no'));
      yes.type = no.type = 'button';
      yes.addEventListener('click', function () { decided[q.id] = 1; tr.act('decide', { req: q.id, yes: true }); renderRequests(); });
      no.addEventListener('click', function () { decided[q.id] = 1; tr.act('decide', { req: q.id, yes: false }); renderRequests(); });
      row.appendChild(yes); row.appendChild(no);
      bar.appendChild(row);
    });
  }
  /** Observers: cheer with emojis (everyone sees them) and talk among themselves (players do not see that). */
  function renderWatchBar() {
    var bar = $('watchBar');
    if (bar.childNodes.length) return;
    var em = el('div', 'emojis');
    E.REACTIONS.forEach(function (x) {
      var b = el('button', 'emo', x); b.type = 'button';
      b.setAttribute('aria-label', x);
      b.addEventListener('click', function () { tr.act('react', { emoji: x }); b.classList.add('sent'); setTimeout(function () { b.classList.remove('sent'); }, 600); });
      em.appendChild(b);
    });
    bar.appendChild(el('p', 'muted small', L('obs.bar')));
    bar.appendChild(em);
  }
  var reactSeen = 0;
  function showReactions() {
    var list = view.reactions || [], layer = $('reactLayer');
    list.forEach(function (x) {
      if (x.id <= reactSeen) return;
      reactSeen = x.id;
      if (Date.now() - x.at > 8000) return;
      var f = el('span', 'floatemo', x.emoji);
      f.style.left = (10 + Math.random() * 75) + '%';
      f.title = x.name;
      layer.appendChild(f);
      setTimeout(function () { f.remove(); }, 2600);
    });
  }
  function openInvite() {
    var code = tr.inviteCode(), online = tr instanceof MBG.WhoTransport.Online;
    var sh = Shell.sheet({ id: 'dlgInvite', title: '➕ ' + L('inv.title') });
    var b = sh.body;
    b.appendChild(el('p', null, L(online ? 'inv.textOnline' : 'inv.textTabs')));
    b.appendChild(el('p', 'spellpattern', code));
    var link = online && MBG.WEB_URL ? MBG.WEB_URL.replace(/\/$/, '') + '/play.html?room=' + encodeURIComponent(code) : '';
    var msg = L('inv.message', { name: Shell.playerName(), code: code }) + (link ? ' ' + link : '');
    var row = el('div', 'dlg-actions');
    var share = el('button', 'btn submit', '📤 ' + L('inv.share')); share.type = 'button';
    share.addEventListener('click', function () {
      if (navigator.share) navigator.share({ title: L('app.name'), text: msg }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { Shell.toast('📋 ' + L('inv.copied')); });
    });
    var copy = el('button', 'btn ghost', '📋 ' + L('inv.copy')); copy.type = 'button';
    copy.addEventListener('click', function () { if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { Shell.toast('📋 ' + L('inv.copied')); }); });
    row.appendChild(copy); row.appendChild(share);
    b.appendChild(row);
    if (!online) {
      var open = el('a', 'btn ghost', '🗂️ ' + L('tabs.open')); open.href = 'play.html?tabs=join'; open.target = '_blank';
      b.appendChild(open);
    }
    if (online && !MBG.Net.demo) {
      var f = el('form', 'wlc-row');
      var inp = el('input', 'textfield'); inp.placeholder = L('inv.namePh'); inp.maxLength = 40;
      var go = el('button', 'btn submit', L('inv.send')); go.type = 'submit';
      f.appendChild(inp); f.appendChild(go);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        MBG.Net.invite(inp.value.trim(), code).then(function () { Shell.toast('✉️ ' + L('inv.sent', { name: inp.value.trim() })); inp.value = ''; },
          function () { Shell.toast(L('inv.noName')); });
      });
      b.appendChild(el('h3', null, L('inv.member')));
      b.appendChild(f);
    }
    b.appendChild(el('p', 'muted small', L(view.access === 'auto' ? 'inv.auto' : 'inv.ask')));
  }

  /** Suggested questions: tap = into the field, to change a year or a letter first. */
  var chipKey = '';
  function renderChips(r) {
    var key = view.mode + r.index + r.turns.length;
    if (chipKey === key) return;
    chipKey = key;
    var box = $('chips');
    box.textContent = '';
    var asked = r.turns.map(function (x) { return X.norm(x.q); });
    suggestions().filter(function (s) { return asked.indexOf(X.norm(s)) === -1; }).slice(0, 8).forEach(function (s) {
      var b = el('button', 'qchip', s);
      b.type = 'button';
      b.addEventListener('click', function () { $('q').value = s; $('q').focus(); var m = /\d+/.exec(s); if (m) { var at = s.indexOf(m[0]); try { $('q').setSelectionRange(at, at + m[0].length); } catch (e) { /* ignore */ } } });
      box.appendChild(b);
    });
  }
  function suggestions() {
    var g = { who: 'person', what: 'work', where: 'place', when: 'event' }[view.mode];
    var P = [];
    if (view.mode === 'who') P = [{ t: 'gender', v: 'f' }, { t: 'alive', v: true }, { t: 'date', subj: 'born', op: 'before', a: 1950 }, { t: 'continent', code: 'EU' },
      { t: 'tag', tag: 'actor' }, { t: 'tag', tag: 'musician' }, { t: 'tag', tag: 'scientist' }, { t: 'tag', tag: 'athlete' }, { t: 'tag', tag: 'writer' }, { t: 'country', iso: 'US' }, { t: 'name', op: 'range', a: 'A', b: 'M' }];
    else if (view.mode === 'what') P = [{ t: 'tag', tag: 'film' }, { t: 'tag', tag: 'book' }, { t: 'date', subj: 'primary', op: 'before', a: 1990 }, { t: 'country', iso: 'US' },
      { t: 'tag', tag: 'game' }, { t: 'tag', tag: 'invention' }, { t: 'tag', tag: 'comedy' }, { t: 'tag', tag: 'sport' }, { t: 'tag', tag: 'series_part' }, { t: 'name', op: 'range', a: 'A', b: 'M' }];
    else if (view.mode === 'where') P = [{ t: 'continent', code: 'EU' }, { t: 'tag', tag: 'city' }, { t: 'tag', tag: 'country' }, { t: 'tag', tag: 'capital' }, { t: 'balkans' },
      { t: 'num', dim: 'population', op: 'more', v: 1000000 }, { t: 'tag', tag: 'river' }, { t: 'tag', tag: 'mountain' }, { t: 'tag', tag: 'landmark' }, { t: 'name', op: 'range', a: 'A', b: 'M' }];
    else P = [{ t: 'date', subj: 'primary', op: 'before', a: 1900 }, { t: 'date', subj: 'primary', op: 'after', a: 1945 }, { t: 'tag', tag: 'war' }, { t: 'continent', code: 'EU' },
      { t: 'tag', tag: 'battle' }, { t: 'tag', tag: 'empire' }, { t: 'tag', tag: 'treaty' }, { t: 'tag', tag: 'revolution' }, { t: 'balkans' }];
    if (view.cat && view.mode === 'what') {
      var cat = view.cat;
      if (cat === 'movies' || cat === 'tv') P = [{ t: 'date', subj: 'primary', op: 'before', a: 2000 }, { t: 'country', iso: 'US' }, { t: 'tag', tag: 'comedy' }, { t: 'tag', tag: 'drama' },
        { t: 'tag', tag: 'animation' }, { t: 'tag', tag: 'scifi' }, { t: 'tag', tag: 'series_part' }, { t: 'tag', tag: 'oscar' }, { t: 'num', dim: 'duration', op: 'more', v: 120 }, { t: 'name', op: 'range', a: 'A', b: 'M' }];
    }
    return P.map(function (p) { return Q.render(p, setup.lang, g); });
  }
  function renderChatBadge() {
    var n = (view.chat || []).filter(function (m) { return m.by !== me(); }).length;
    var b = $('chatN');
    b.hidden = chatOpen || n <= chatSeen;
    b.textContent = String(n - chatSeen);
  }
  /** Sounds and messages for what just happened. */
  function react(ev, r, rl) {
    showReactions();
    if (ev.type === 'joined' && ev.by !== me()) Shell.toast((ev.as === 'play' ? '🎮 ' : '👀 ') + L(ev.as === 'play' ? 'req.joinedPlay' : 'req.joinedWatch', { name: ev.name }), 2800);
    if (ev.type === 'joined' && ev.by === me()) { Shell.toast('✅ ' + L(ev.as === 'play' ? 'req.inPlay' : 'req.inWatch'), 3000); $('loading').hidden = true; }
    if (ev.type === 'declined' && ev.by === me()) loading(L('req.declinedTitle'), L('req.declinedText'));
    if (ev.type === 'request' && ev.by !== me() && view.requests && view.requests.length) play('hit1');
    if (ev.type === 'waitAnswer') Shell.toast('⏳ ' + L('ld.step2'), 2500);
    if (ev.type === 'boost') { play('correct'); Shell.toast(ev.kind === 'time' ? '⏱️ ' + L('boost.timeDone') : ev.kind === 'questions' ? '❓ ' + L('boost.questionsDone') : '✏️ ' + (ev.pattern || ''), 3000); }
    if (ev.type === 'answered' && ev.code) {
      if (ev.code === 'YES') play('hit1'); else if (ev.code === 'NO') play('hit0');
      if (ev.code === 'INVALID' && rl === 'guesser') Shell.toast(L(ev.reason === 'guess' ? 'inv.guessToast' : 'inv.toast'), 3400);
    }
    if (ev.type === 'guessed' && ev.by === me()) {
      if (ev.correct) play('correct');
      else if (ev.near) { play('close'); openGuess({ near: true, text: ev.text, pattern: ev.pattern }); }
      else { Shell.toast(L('guess.wrong', { n: view.cfg.maxWrong - r.wrong }), 2600); play('hit0'); }
    }
    if (ev.type === 'guessed' && ev.by !== me()) {
      Shell.toast(L(ev.correct ? 'guess.cpuRight' : ev.near ? 'guess.otherNear' : 'guess.cpuWrong', { name: other().name, text: ev.text || '' }), 2600);
      if (ev.correct) play('hit1');
    }
    if (ev.type === 'hint') Shell.toast('💡 ' + clueText(ev.clue), 3000);
    if (ev.type === 'error' && ev.error === 'short') Shell.toast(L('ask.short'));
    if (ev.type === 'chat' && ev.by !== me() && !chatOpen) play('hit1');
    if (ev.type === 'left' && ev.by !== me()) Shell.toast(L('left'), 3000);
  }

  /* --------------------------------------------------------------- actions --- */
  $('askForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('q').value.trim();
    if (v.length < 3) { Shell.toast(L('ask.short')); return; }
    if (MBG.Voice) MBG.Voice.stop();
    tr.act('ask', { text: v });
    $('q').value = '';
  });
  /* ---------------------------------------------------------- voice input --- */
  // 🎤 next to the question and the final guess: the words appear in the field while you speak;
  // nothing is sent before you press Ask / Guess (js/app/voice.js).
  function micOk() { return !!(MBG.Voice && MBG.Voice.supported() && prefs.voice !== false); }
  function mic(btn, input, kind, note) {
    // note: a line under the field for messages (inside a dialog, where toasts would be hidden)
    function say(msg, ms) { if (note) { note.textContent = msg; note.hidden = false; } else Shell.toast(msg, ms); }
    var label = L(kind === 'question' ? 'voice.ask' : 'voice.guess');
    btn.setAttribute('aria-label', label); btn.title = label;
    btn.hidden = !micOk();
    input.classList.toggle('withmic', !btn.hidden);
    btn.addEventListener('click', function () {
      if (btn.classList.contains('on')) { MBG.Voice.stop(); return; }
      var ph = input.placeholder, before = input.value;
      btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true');
      if (note) note.hidden = true;
      input.placeholder = L('voice.listening'); input.value = '';
      MBG.Voice.listen({ lang: setup.lang, kind: kind, onText: function (s) { input.value = s; } }).then(function (s) {
        if (s) { input.value = s; if (!app.classList.contains('touch-ui')) { input.focus(); input.setSelectionRange(s.length, s.length); } }
        else { input.value = before; say('🎤 ' + L('voice.nothing'), 3000); }
      }, function (e) {
        input.value = before;
        var w = e && e.why;
        if (w !== 'aborted') say('🎤 ' + L(w === 'denied' ? 'voice.denied' : w === 'lang' ? 'voice.lang' : w === 'nothing' ? 'voice.nothing' : 'voice.error'), 5000);
      }).then(function () { btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); input.placeholder = ph; });
    });
  }
  mic($('btnMic'), $('q'), 'question');

  Array.prototype.forEach.call(document.querySelectorAll('.rbtn'), function (b) {
    b.textContent = L('resp.' + b.getAttribute('data-code'));
    b.addEventListener('click', function () { var r = round(); if (r && r.pending) tr.act('respond', { turn: r.pending, code: b.getAttribute('data-code') }); });
  });
  $('btnInvalid').textContent = L('rp.invalid');
  $('btnInvalid').addEventListener('click', function () { var r = round(); if (r && r.pending) tr.act('respond', { turn: r.pending, code: 'INVALID' }); });
  $('btnAsk').textContent = L('ask.btn');
  $('btnGuess').textContent = '🎯 ' + L('guess.btn');
  $('btnHint').textContent = '💡 ' + L('hint.btn');
  $('lblChat').textContent = '💬 ' + L('chat.btn');
  $('btnHint').addEventListener('click', function () {
    var cost = MBG.Plan ? MBG.Plan.cost('hint') : 0;
    if (!cost) {
      Shell.confirm({ title: '💡 ' + L('hint.title'), text: L('hint.text', { n: view.cfg.hintCost }), ok: L('hint.ok'), cancel: L('dlg.cancel') }).then(function (ok) { if (ok) tr.act('hint'); });
      return;
    }
    // paid edition: pay with 2 questions (as always) or with credits and keep the questions
    var sh = Shell.sheet({ id: 'dlgHint', title: '💡 ' + L('hint.title') });
    sh.body.appendChild(el('p', null, L('hint.choose')));
    var col = el('div', 'btncol'), r = round();
    var q = el('button', 'btn ghost', '❓ ' + L('hint.payQuestions', { n: view.cfg.hintCost })); q.type = 'button';
    q.disabled = r.questionsLeft < view.cfg.hintCost;
    q.addEventListener('click', function () { sh.close(); tr.act('hint'); });
    var c = el('button', 'btn submit', '🪙 ' + L('hint.payCredits', { n: cost, have: MBG.Plan.credits() })); c.type = 'button';
    c.disabled = MBG.Plan.credits() < cost;
    c.addEventListener('click', function () { if (MBG.Plan.spend('hint').ok) { sh.close(); tr.act('hint', { credits: true }); } });
    col.appendChild(c); col.appendChild(q);
    sh.body.appendChild(col);
    var more = el('button', 'linkbtn', '🪙 ' + t('shop.getCredits')); more.type = 'button';
    more.addEventListener('click', function () { sh.close(); MBG.Shop.openCredits(); });
    sh.body.appendChild(more);
  });
  // power-ups: practice against the computer only
  $('btnBoost').addEventListener('click', function () {
    MBG.Shop.boosts({ L: L, can: function () { var r = round(); return r && r.status === 'playing' && !r.pending; }, act: function (kind) { tr.act('boost', { kind: kind }); } });
  });
  /** A game counts (paid edition: today's free game) when it really starts - once per match, for players. */
  var counted = null;
  function countGame(r, rl) {
    if (!MBG.Plan || setup.daily || counted === view.id || rl === 'observer' || rl === 'outside' || r.status !== 'playing') return;   // the puzzles of the day are free
    counted = view.id;
    MBG.Plan.useGame();
  }
  $('btnGuess').addEventListener('click', function () { openGuess(); });
  /** The final guess. o.near: the last guess was the right name, misspelled - show its shape and try again. */
  function openGuess(o) {
    o = o && o.near ? o : {};
    var r = round();
    var sh = Shell.sheet({ id: 'dlgGuess', title: o.near ? '✏️ ' + L('guess.nearTitle') : '🎯 ' + L('guess.title') });
    var f = el('form', 'guessform');
    if (o.near) {
      f.appendChild(el('p', null, L('guess.nearText')));
      if (o.pattern) f.appendChild(el('p', 'spellpattern', o.pattern));
      var left = view.cfg.nearFree - (r.near || r.guesses.filter(function (g) { return g.near; }).length);
      f.appendChild(el('p', 'muted small', L(left > 0 ? 'guess.nearFree' : 'guess.nearLast', { n: view.cfg.maxWrong - r.wrong })));
    } else f.appendChild(el('p', 'muted', L('guess.text', { n: view.cfg.maxWrong - r.wrong })));
    var inp = el('input', 'textfield big');
    inp.maxLength = 120; inp.placeholder = L('guess.ph'); inp.autocomplete = 'off'; inp.spellcheck = false;
    if (o.text) inp.value = o.text;
    var fld = el('div', 'field micfield');
    fld.appendChild(inp);
    var gm = el('button', 'micbtn'); gm.type = 'button'; gm.textContent = '🎤'; gm.setAttribute('aria-pressed', 'false');
    fld.appendChild(gm);
    f.appendChild(fld);
    var gnote = el('p', 'muted small micnote'); gnote.hidden = true;
    f.appendChild(gnote);
    mic(gm, inp, 'guess', gnote);
    var row = el('div', 'dlg-actions');
    var gu = el('button', 'btn ghost', L('guess.giveup')); gu.type = 'button';
    gu.addEventListener('click', function () { sh.close(); Shell.confirm({ title: L('giveup.title'), text: L('giveup.text'), ok: L('giveup.ok'), cancel: L('dlg.cancel') }).then(function (ok) { if (ok) tr.act('giveup'); }); });
    var go = el('button', 'btn submit', '🎯 ' + L('guess.send')); go.type = 'submit';
    row.appendChild(gu); row.appendChild(go);
    f.appendChild(row);
    f.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v) return; if (MBG.Voice) MBG.Voice.stop(); sh.close(); tr.act('guess', { text: v }); });
    sh.body.appendChild(f);
    setTimeout(function () { inp.focus(); }, 60);
  }
  $('btnChat').addEventListener('click', openChat);
  function openChat() {
    chatOpen = true;
    var sh = Shell.sheet({ id: 'dlgChat', title: '💬 ' + L(view.watching ? 'obs.chatTitle' : 'chat.title'), cls: 'chatsheet', onClose: function () { chatOpen = false; chatSeen = (view.chat || []).filter(function (m) { return m.by !== me(); }).length; renderChatBadge(); } });
    var list = el('div', 'chatlist');
    sh.body.appendChild(el('p', 'muted small', L(view.watching ? 'obs.chatNote' : 'chat.note')));
    sh.body.appendChild(list);
    function msgs(arr, cls) {
      arr.forEach(function (m) {
        var b = el('div', 'cmsg' + (m.by === me() ? ' mine' : '') + (cls ? ' ' + cls : ''));
        b.appendChild(el('small', 'muted', (m.by === me() ? L('you') : m.name || player(m.by).name) + ' · ' + Shell.ago(m.at)));
        b.appendChild(el('p', null, m.text));
        list.appendChild(b);
      });
    }
    function draw() {
      list.textContent = '';
      if (view.watching) {
        // observers read the players' chat and talk among themselves - the players never see that part
        if ((view.chat || []).length) { list.appendChild(el('p', 'chathead', '🎮 ' + L('obs.playersChat'))); msgs(view.chat, 'ro'); }
        list.appendChild(el('p', 'chathead', '👀 ' + L('obs.watchChat')));
        msgs(view.watchChat || [], 'obs');
      } else msgs(view.chat || []);
      list.scrollTop = list.scrollHeight;
    }
    draw();
    var f = el('form', 'wlc-row');
    var inp = el('input', 'textfield'); inp.maxLength = 300; inp.placeholder = L('chat.ph');
    var go = el('button', 'btn submit', L('board.send')); go.type = 'submit';
    f.appendChild(inp); f.appendChild(go);
    var quick = el('div', 'chipset');
    ['chat.q1', 'chat.q2', 'chat.q3', 'chat.q4'].forEach(function (k) {
      var c = el('button', 'pickchip', L(k)); c.type = 'button';
      c.addEventListener('click', function () { tr.act('say', { text: L(k) }); });
      quick.appendChild(c);
    });
    f.addEventListener('submit', function (e) { e.preventDefault(); if (inp.value.trim()) { tr.act('say', { text: inp.value.trim() }); inp.value = ''; } });
    if (!view.watching) sh.body.appendChild(quick);
    sh.body.appendChild(f);
    chatDraw = draw;
  }
  var chatDraw = null;

  /* ------------------------------------------------ the picture of the answer --- */
  // When the answer is revealed, a free picture of it pops up under the card (Wikidata / Wikipedia,
  // files of Wikimedia Commons only - js/whoami/picture.js), with its author and licence.
  // A tap shows it big. No internet or no free picture: nothing is shown.
  function photo(A, after) {
    if (prefs.pics === false || !MBG.WhoPicture || (A.source !== 'wikidata' && !A.qid && !A.label)) return;
    var fig = el('figure', 'reveal-photo');
    fig.hidden = true;
    after.parentNode.insertBefore(fig, after.nextSibling);
    MBG.WhoPicture.find(A, setup.lang).then(function (pic) {
      if (!pic || !fig.isConnected) return;
      var img = new Image();
      img.alt = X.labelIn(A, setup.lang); img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
      var tried = false;
      img.onerror = function () { if (!tried && pic.full && pic.full !== img.src) { tried = true; img.src = pic.full; } };   // the thumbnail failed: the file itself
      img.onload = function () {
        if (!fig.isConnected) return;
        var btn = el('button', 'rp-img'); btn.type = 'button'; btn.setAttribute('aria-label', L('pic.open'));
        btn.appendChild(img);
        btn.addEventListener('click', function () { bigPhoto(pic, img.alt); });
        fig.appendChild(btn);
        fig.appendChild(credit(pic, 'figcaption'));
        fig.hidden = false;
        fig.classList.add('pop');
      };
      img.src = pic.src;
    });
  }
  function credit(pic, tag) {
    var c = el(tag, 'rp-credit');
    var a = el('a', null, '📷 ' + MBG.WhoPicture.creditLine(pic, L('pic.by') + ' '));
    a.href = pic.page; a.target = '_blank'; a.rel = 'noopener';
    c.appendChild(a);
    return c;
  }
  function bigPhoto(pic, alt) {
    // a modal dialog of its own: above the round card, and Android's back button closes it
    var d = el('dialog', 'photobox');
    d.setAttribute('aria-label', alt);
    var img = new Image(); img.alt = alt; img.referrerPolicy = 'no-referrer';
    img.onerror = function () { if (img.src !== pic.src) img.src = pic.src; };     // the big size failed: the card's size
    img.src = pic.big || pic.src;
    d.appendChild(img);
    d.appendChild(el('strong', 'pb-name', alt));
    d.appendChild(credit(pic, 'p'));
    d.appendChild(el('p', 'pb-close', L('fh.skip')));
    d.addEventListener('click', function (e) { if (!(e.target && e.target.closest && e.target.closest('a'))) d.close(); });
    d.addEventListener('close', function () { d.remove(); });
    document.body.appendChild(d);
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  }

  /* ------------------------------------------------------- end of a round --- */
  function roundEnd(r) {
    var guesser = r.guesser === me(), s = r.score || {};
    var A = r.answer;
    if (s.won && guesser) { confetti(); setTimeout(function () { play('win' + winKey(s.total)); }, 900); }
    var last = r.index >= (view.totalRounds || view.cfg.rounds) - 1 || view.state === 'done';
    var sh = Shell.sheet({ id: 'dlgRound', title: L(s.won ? (guesser ? 'end.youGot' : 'end.theyGot') : (guesser ? 'end.youMissed' : 'end.theyMissed'), { name: player(r.guesser).name }), cls: 'roundsheet',
      actions: [{ label: last ? L('end.result') + ' ▶' : L('end.next') + ' ▶', onClick: function () { sh.close('next'); } }], modal: true,
      onClose: function () { if (last) result(); else if (!view.watching && !view.outside) tr.act('next'); } });
    var b = sh.body;
    // the card turns over
    var cardBox = el('div', 'reveal-card fcard mode-' + view.mode + ' open flip-in');
    cardBox.appendChild(el('span', 'fc-cat', catLabel()));
    cardBox.appendChild(el('strong', 'fc-name', X.labelIn(A, setup.lang)));
    cardBox.appendChild(el('span', 'fc-facts', MBG.WhoFacts.line(A, setup.lang)));
    b.appendChild(cardBox);
    var name = X.labelIn(A, setup.lang);
    var wiki = el('a', 'linkbtn', '📖 ' + L('card.wiki'));
    wiki.href = A.wiki && A.wiki[setup.lang] ? 'https://' + setup.lang + '.wikipedia.org/wiki/' + encodeURIComponent(A.wiki[setup.lang]) : 'https://' + setup.lang + '.wikipedia.org/w/index.php?search=' + encodeURIComponent(name);
    wiki.target = '_blank'; wiki.rel = 'noopener';
    b.appendChild(wiki);
    if (A.desc && A.desc[setup.lang]) b.appendChild(el('p', 'muted small', A.desc[setup.lang]));
    photo(A, cardBox);
    // the score (section 13.1), line by line as on the win cards of MBG Puzzles
    var sc = el('div', 'kv scorekv');
    function row(k, v, cls) { var x = el('div', 'kv-row ' + (cls || '')); x.appendChild(el('span', null, k)); x.appendChild(el('b', 'num', v)); sc.appendChild(x); }
    if (s.won) {
      row(L('sc.base'), '100');
      row(L('sc.unused', { n: s.unused }), '+' + s.unusedPts);
      row(L('sc.time', { s: s.secs }), '+' + s.timePts);
      if (s.wrong) row(L('sc.wrong', { n: s.wrong }), String(s.wrongPts));
      row(L('sc.level', { level: C.LEVELS[view.level].names[LIx] }), '× ' + s.mult.toFixed(2));
      row(L('sc.total'), String(s.total), 'total');
    } else {
      row(L(r.reason === 'time' ? 'end.time' : r.reason === 'wrong' ? 'end.wrong2' : r.reason === 'gave_up' ? 'end.gaveUp' : 'end.left'), '0', 'total');
    }
    b.appendChild(sc);
    // the Answerer's answers checked against the data (a fair-play aid, FR-006)
    var checks = r.turns.filter(function (x) { return x.code && x.code !== 'INVALID'; }).map(function (x) { return { tu: x, data: Q.answer(x.q, A, setup.lang).code }; })
      .filter(function (x) { return x.data !== 'INVALID'; });
    var off = checks.filter(function (x) { return x.data !== x.tu.code && !(x.data === 'BOTH' || x.tu.code === 'BOTH') && x.data !== 'UNKNOWN'; });
    if (checks.length) {
      var box = el('div', 'checkbox ' + (off.length ? 'warn' : 'good'));
      box.appendChild(el('p', null, off.length ? '⚠️ ' + L('check.off', { n: off.length }) : '✅ ' + L('check.ok', { n: checks.length })));
      off.forEach(function (x) {
        var li = el('p', 'small');
        li.appendChild(document.createTextNode('“' + x.tu.q + '” '));
        li.appendChild(respBadge(x.tu.code));
        li.appendChild(document.createTextNode(' → ' + L('check.data') + ' '));
        li.appendChild(respBadge(x.data));
        if (guesser) {
          var d = el('button', 'linkbtn', '⚑ ' + L('disp.flag'));
          d.type = 'button';
          d.addEventListener('click', function () { MBG.Judge.dispute({ view: view, round: r, turn: x.tu, me: me() }); });
          li.appendChild(d);
        }
        box.appendChild(li);
      });
      if (guesser) box.appendChild(el('p', 'muted small', L('check.hint')));
      b.appendChild(box);
    }
    if (!last) b.appendChild(el('p', 'next-role', '🔄 ' + L(guesser ? 'end.nowAnswer' : 'end.nowGuess')));
  }
  function winKey(s) { return s < 110 ? 1 : s < 130 ? 2 : s < 150 ? 3 : s < 170 ? 4 : s < 190 ? 5 : s < 220 ? 6 : 7; }

  /* ------------------------------------------------------- end of a match --- */
  /** Records go to the bell (and, if the player wants it, by e-mail - off by default). */
  function achievements(st) {
    var items = [];
    if (st.newBest) items.push(['note.bestTitle', 'note.bestText', { n: st.best }]);
    if (st.hof === 1) items.push(['note.hofTitle', 'note.hofText', { n: st.hof }]);
    if (st.practiceRecord) items.push(['note.prTitle', 'note.prText', { n: st.practice.after }]);
    items.forEach(function (x) { if (MBG.Net.notes.local) MBG.Net.notes.local('achievement', t(x[0], x[2]), t(x[1], x[2])); });
    if (!MBG.Net.demo && MBG.Net.signedIn() && view.vsComputer) MBG.Net.submitResult({ kind: 'practice', best: st.newBest ? st.best : null, practice: st.practice ? st.practice.after : null }).catch(function () {});
  }
  /**
   * The puzzle of the day: the score of my guessing round. The first try counts - on this device and,
   * signed in with the server, on the world leaderboard of the day; a replay is only shown.
   */
  function dailyResult(b) {
    var D = MBG.WhoDaily, d = setup.daily;
    var r = view.rounds.filter(function (x) { return x.guesser === me(); })[0];
    if (!D || !r) return;
    var sc = r.score || {}, entry = { name: Shell.playerName(), score: sc.won ? sc.total : 0, won: !!sc.won, used: r.used || 0, wrong: r.wrong || 0, secs: sc.secs || 0 };
    var rec = D.record(d.id, entry);
    var box = el('div', 'dailyres');
    box.setAttribute('data-mode', d.mode);
    box.appendChild(el('strong', null, '🗓️ ' + L('daily.kicker') + ' · ' + C.MODES[d.mode].title[LIx]));
    box.appendChild(el('p', null, (entry.won ? L('daily.yourScore', { n: entry.score }) : L('daily.notSolved')) + ' · ' + (rec.first ? L('daily.resCounts') : L('daily.resReplay', { n: rec.entry.score }))));
    var pl = el('p', 'dr-place');
    if (rec.place) pl.textContent = '🏆 ' + L('daily.place', { n: rec.place, of: rec.of });
    box.appendChild(pl);
    var lb = el('button', 'btn ghost small', '🏆 ' + L('daily.board')); lb.type = 'button';
    lb.addEventListener('click', function () { Shell.go('index.html#daily=' + d.mode); });
    box.appendChild(lb);
    b.appendChild(box);
    if (MBG.Net && !MBG.Net.demo && MBG.Net.signedIn()) {
      var send = rec.first ? MBG.Net.daily.submit({ puzzle: d.id, score: rec.entry.score, won: rec.entry.won, used: rec.entry.used, wrong: rec.entry.wrong, secs: rec.entry.secs }) : MBG.Net.daily.top(d.id).then(function (x) { return x.mine; });
      send.then(function (x) { if (x && x.place) pl.textContent = '🏆 ' + L('daily.place', { n: x.place, of: x.total || x.of || x.place }); }).catch(function () { /* offline: kept on this device */ });
    }
  }
  function result() {
    if (shownResult || !view.result) { if (!view.result) setTimeout(result, 400); return; }
    shownResult = true;
    var res = view.result, mine = res.winner === me();
    var looker = view.watching || view.outside;
    var stats = looker ? MBG.WhoStats.mine() : MBG.WhoStats.record(view, me(), setup.botLevel);
    if (!looker) achievements(stats);
    // the best rating known (practice now; the official one with the server): top players earn more credits
    var known = (stats.practice && stats.practice.after) || ((MBG.WhoStats.practiceOf && MBG.WhoStats.practiceOf()) || {}).rating || 0;
    var earned = !looker && MBG.Plan ? MBG.Plan.reward({ won: res.winner === me(), newBest: !!stats.newBest, rating: known }) : [];
    if (mine) { confetti(); play('win7'); }
    var sh = Shell.sheet({ id: 'dlgResult', title: res.draw ? '🤝 ' + L('res.draw') : mine ? '🏆 ' + L('res.won') : looker ? '🏆 ' + L('res.winnerIs', { name: player(res.winner).name }) : '👏 ' + L('res.lost', { name: player(res.winner).name }), cls: 'resultsheet', modal: true,
      actions: [{ label: '🔁 ' + L(setup.daily ? 'daily.again' : 'res.again'), onClick: function () { sh.close('again'); MBG.WhoSetup.start(setup); } }] });
    var b = sh.body;
    if (setup.daily && !looker) dailyResult(b);
    var tbl = el('div', 'restable');
    (res.ranking || view.players.map(function (p) { return p.id; })).map(player).forEach(function (p) {
      var row = el('div', 'res-row' + (res.winner === p.id ? ' win' : ''));
      row.appendChild(p.kind === 'bot' ? el('span', 'av av-md av-emoji bot', '🤖') : MBG.Account.picture(p.id === me() ? MBG.Account.avatar() : '', 'av-md'));
      row.appendChild(el('strong', null, p.id === me() ? L('you') : p.name));
      var rs = view.rounds.filter(function (r) { return r.guesser === p.id; });
      var solved = rs.filter(function (r) { return r.score && r.score.won; });
      row.appendChild(el('span', 'muted', rs.length > 1 ? L('res.solvedOf', { n: solved.length, of: rs.length }) : solved.length ? L('res.solved', { n: solved[0].used }) : L('res.notSolved')));
      row.appendChild(el('b', 'num big', String(res.totals[p.id] || 0)));
      tbl.appendChild(row);
    });
    b.appendChild(tbl);
    b.appendChild(el('p', 'muted small', view.vsComputer ? L('res.practice') : view.ranked ? L('res.ranked') : L('res.casual')));
    if (stats.practice) {
      var pr = stats.practice, pl = el('p', 'statline prline ' + (pr.delta > 0 ? 'up' : pr.delta < 0 ? 'down' : ''));
      pl.appendChild(document.createTextNode('♟️ ' + L('res.practiceRating') + ' '));
      pl.appendChild(el('b', 'num', pr.before + ' → ' + pr.after));
      pl.appendChild(el('span', 'num prdelta', ' (' + (pr.delta > 0 ? '+' : '') + pr.delta + ')'));
      b.appendChild(pl);
      b.appendChild(el('p', 'muted small', L(pr.provisional ? 'res.practiceNew' : 'res.practiceNote')));
    }
    if (stats.newBest) b.appendChild(el('p', 'statline good', '🏅 ' + L('res.newBest', { n: stats.best })));
    earned.forEach(function (x) { b.appendChild(el('p', 'statline good', '🪙 +' + x[1] + ' · ' + t('shop.why.' + x[0]))); });
    if (MBG.Shop && MBG.Shop.paid() && !looker) b.appendChild(el('p', 'muted small', MBG.Shop.statusLine(MBG.Plan.status())));
    if (stats.hof > 0) b.appendChild(el('p', 'statline good', '🏛️ ' + L('res.hof', { n: stats.hof })));
    b.appendChild(el('p', 'statline', '📊 ' + L('res.stats', { played: stats.played, won: stats.won, best: stats.best })));
    if (view.source === 'deck' && navigator.onLine === false) b.appendChild(el('p', 'muted small', L('res.offline')));
    var row2 = el('div', 'dlg-actions');
    var home = el('button', 'btn ghost', L('res.home')); home.type = 'button';
    home.addEventListener('click', function () { sh.close(); Shell.goHome(); });
    var ns = el('button', 'btn ghost', '⚙ ' + L('res.setup')); ns.type = 'button';
    ns.addEventListener('click', function () { sh.close(); MBG.WhoSetup.open({}); });
    var again = el('button', 'btn submit', '🔁 ' + L('res.again')); again.type = 'button';
    again.addEventListener('click', function () { sh.close(); MBG.WhoSetup.start(setup); });
    row2.appendChild(home); row2.appendChild(ns); row2.appendChild(again);
    b.appendChild(row2);
    var rate = el('button', 'linkbtn', '★ ' + L('rate.game'));
    rate.type = 'button';
    rate.addEventListener('click', function () { MBG.Ratings.open(MBG.GAME_ID); });
    b.appendChild(rate);
    MBG.Ratings.maybeAsk(stats.played);
  }

  /* -------------------------------------------------------------- confetti --- */
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = $('confetti'), ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight; cv.style.display = 'block';
    var cols = ['#1E7B4E', '#D69512', '#B4172F', '#0E5D66', '#2F6FB2', '#8C1D3B'];
    var ps = [];
    for (var i = 0; i < 140; i++) ps.push({ x: cv.width / 2, y: cv.height * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 3, r: 4 + Math.random() * 5, c: cols[i % cols.length], a: Math.random() * 6 });
    var t0 = performance.now();
    (function step(tm) {
      var dt = Math.min(40, tm - (step.l || tm)); step.l = tm;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(function (p) { p.vy += 0.35 * dt / 16; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.a += 0.2; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (tm - t0 < 2600) requestAnimationFrame(step); else { ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
    })(t0);
  }

  /* ----------------------------------------------------------- rules, settings --- */
  /* ------------------------------------------------------ the forehead --- */
  // At the start of every round, a short comic moment (3.3 - 3.8 seconds, a tap skips it): the card
  // flies in and lands - "paf!" - on a forehead. When you guess: on yours, and you only see "?".
  // When you answer: on your opponent's (a robot for the computer), and you see the name.
  function forehead(r, rl) {
    play('start');   // a bright little bell: a new round begins (with or without the animation)
    if (Shell.getPrefs().anim === false || (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var mine = rl === 'guesser', cpu = !mine && other().kind === 'bot';
    var name = !mine && r.answer ? X.labelIn(r.answer, setup.lang) : '?';
    var fs = name === '?' ? 34 : name.length > 22 ? 9 : name.length > 15 ? 11 : name.length > 10 ? 13 : 16;
    var mw = C.MODES[view.mode] || C.MODES.who;
    var face = cpu
      ? '<rect x="62" y="92" width="116" height="104" rx="22" fill="#b9c6cf" stroke="#33414c" stroke-width="4"/>' +
        '<line x1="120" y1="92" x2="120" y2="70" stroke="#33414c" stroke-width="4"/><circle cx="120" cy="66" r="7" fill="#e2a01a" stroke="#33414c" stroke-width="3"/>' +
        '<rect class="fh-eye" x="84" y="140" width="22" height="16" rx="4" fill="#15202b"/><rect class="fh-eye" x="134" y="140" width="22" height="16" rx="4" fill="#15202b"/>' +
        '<rect x="94" y="170" width="52" height="10" rx="5" fill="#33414c"/>'
      : '<ellipse cx="120" cy="150" rx="62" ry="66" fill="' + (mine ? '#f1c7a1' : '#d9a57c') + '" stroke="#5a3a26" stroke-width="4"/>' +
        '<path d="M64 128 C70 84 110 74 132 84 C150 76 178 92 176 130 C168 108 150 100 126 104 C104 98 80 108 64 128Z" fill="' + (mine ? '#4a3020' : '#1f1b18') + '"/>' +
        '<circle class="fh-eye" cx="98" cy="150" r="7" fill="#15202b"/><circle class="fh-eye" cx="142" cy="150" r="7" fill="#15202b"/>' +
        '<path class="fh-mouth" d="M100 182 Q120 196 140 182" fill="none" stroke="#5a3a26" stroke-width="4" stroke-linecap="round"/>' +
        '<ellipse cx="58" cy="154" rx="8" ry="13" fill="' + (mine ? '#f1c7a1' : '#d9a57c') + '" stroke="#5a3a26" stroke-width="3"/>' +
        '<ellipse cx="182" cy="154" rx="8" ry="13" fill="' + (mine ? '#f1c7a1' : '#d9a57c') + '" stroke="#5a3a26" stroke-width="3"/>';
    var esc = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var svg = '<svg viewBox="0 0 240 240" class="fh-svg" aria-hidden="true">' + face +
      '<g class="fh-burst"><path d="M120 60 l9 -20 l4 21 l18 -13 l-6 21 l22 -2 l-17 14 l19 10 l-22 3 l10 19 l-20 -9 l-3 22 l-11 -19 l-12 18 l-2 -22 l-20 8 l11 -19 l-22 -4 l19 -9 l-16 -15 l22 3 l-5 -21 l17 13z" fill="#ffd23f" stroke="#15202b" stroke-width="3"/>' +
      '<text x="120" y="72" text-anchor="middle" class="fh-paf">' + esc(L('fh.paf')) + '</text></g>' +
      '<g class="fh-card"><rect x="76" y="76" width="88" height="56" rx="9" fill="#fffaf0" stroke="var(--mode)" stroke-width="5"/>' +
      '<text x="120" y="' + (name === '?' ? 117 : 109) + '" text-anchor="middle" font-size="' + fs + '" class="fh-name">' + esc(name) + '</text></g>' +
      '</svg>';
    // the first round, when you guess: the intro film of friends at a table (js/app/intro.js);
    // otherwise the drawn face - it shows the name on the card to the one who answers
    var withFilm = mine && r.index === 0 && !!MBG.Intro;
    var box = el('div', 'forehead mode-' + view.mode + (mine ? ' fh-me' : ' fh-other') + (withFilm ? ' fh-withfilm' : ''));
    box.setAttribute('role', 'status');
    if (withFilm) { var fr = el('div', 'fh-film'); fr.appendChild(MBG.Intro.film({ cls: 'fh-video', lang: setup.lang })); box.appendChild(fr); }
    else box.innerHTML = svg;
    var bub = el('div', 'fh-bubble', mine ? mw.title[LIx] : L(cpu ? 'fh.cpuWears' : 'fh.otherWears', { name: other().name }));
    box.appendChild(bub);
    box.appendChild(el('p', 'fh-caption', L(mine ? 'fh.youGuess' : 'fh.youAnswer')));
    box.appendChild(el('p', 'fh-skip', L('fh.skip')));
    document.body.appendChild(box);
    if (!withFilm) setTimeout(function () { play('slap'); }, 560);   // the "paf" after the bell
    var gone = false;
    function close() { if (gone) return; gone = true; box.classList.add('out'); setTimeout(function () { box.remove(); var q = $('q'); if (q && mine) q.focus(); }, 260); }
    box.addEventListener('click', close);
    setTimeout(close, withFilm ? 3800 : 3300);   // time to read the line; the round clock waits for it (engine: leadSeconds 4)
  }

  function rules(atStart) {
    return new Promise(function (resolve) {
      var sh = Shell.sheet({ id: 'dlgHelp', title: '📖 ' + L('rules.title'), cls: 'helpsheet', onClose: function () { resolve(); } });
      var b = sh.body;
      if (atStart) {
        var hs = el('div', 'helpstart');
        hs.appendChild(el('p', null, L('rules.start')));
        var btns = el('div', 'helpstart-btns');
        var go = el('button', 'btn submit', '▶ ' + L('rules.play')); go.type = 'button';
        go.addEventListener('click', function () { sh.close(); });
        var rd = el('button', 'btn ghost', '📖 ' + L('rules.read')); rd.type = 'button';
        rd.addEventListener('click', function () { hs.hidden = true; b.scrollTop = 0; });
        btns.appendChild(go); btns.appendChild(rd);
        hs.appendChild(btns);
        b.appendChild(hs);
        setTimeout(function () { go.focus(); }, 60);
      }
      ['goal', 'modes', 'ask', 'answers', 'limits', 'score', 'hints', 'judges', 'lang'].forEach(function (k) {
        b.appendChild(el('h3', null, L('rules.' + k + 'T')));
        if (k === 'answers') {
          var ul = el('ul', 'legend');
          ['YES', 'NO', 'BOTH', 'UNKNOWN'].forEach(function (c) { var li = el('li'); li.appendChild(respBadge(c)); li.appendChild(el('span', null, L('rules.a.' + c))); ul.appendChild(li); });
          b.appendChild(ul);
        }
        var lim = view ? view.cfg : E.limits(setup, setup.opponent === 'online' && setup.ranked);
        b.appendChild(el('p', null, L('rules.' + k, { m: lim.roundSeconds / 60, q: lim.maxQuestions, g: lim.maxWrong, r: lim.rounds, each: lim.rounds / 2 })));
      });
      var foot = el('label', 'sheet-foot intro-opt');
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!Shell.getPrefs().introOff;
      cb.addEventListener('change', function () { Shell.setPrefs({ introOff: cb.checked }); });
      foot.appendChild(cb);
      foot.appendChild(el('span', null, L('rules.dontShow')));
      sh.dlg.appendChild(foot);
    });
  }
  $('btnHelp').addEventListener('click', function () { rules(false); });
  $('btnSettings').addEventListener('click', settings);
  function settings() {
    var sh = Shell.sheet({ id: 'dlgSettings', title: '⚙ ' + t('set.title') });
    var b = sh.body;
    b.classList.add('settings');
    function sw(label, key, after) {
      var r = el('div', 'srow');
      r.appendChild(el('span', 'srow-label', label));
      var s = el('button', 'switch'); s.type = 'button'; s.setAttribute('role', 'switch');
      s.setAttribute('aria-checked', prefs[key] ? 'true' : 'false'); s.appendChild(el('span', 'knob'));
      s.addEventListener('click', function () { prefs[key] = !prefs[key]; Shell.setPrefs({ [key]: prefs[key] }); s.setAttribute('aria-checked', prefs[key] ? 'true' : 'false'); if (after) after(); });
      r.appendChild(s);
      b.appendChild(r);
    }
    var th = el('div', 'srow srow-pool');
    th.appendChild(el('span', 'srow-label', t('set.theme')));
    var seg = el('div', 'seg wrap');
    Shell.THEMES.forEach(function (k) {
      var x = el('button', 'seg-btn' + (Shell.themeOf(Shell.getPrefs()) === k ? ' on' : ''), t('theme.' + k)); x.type = 'button';
      x.addEventListener('click', function () { Shell.setPrefs({ theme: k, hue: k === 'random' ? Shell.newHue(Shell.getPrefs().hue) : Shell.getPrefs().hue }); Shell.applyLook(); sh.close(); settings(); });
      seg.appendChild(x);
    });
    th.appendChild(seg);
    b.appendChild(th);
    var fs = el('div', 'srow');
    fs.appendChild(el('span', 'srow-label', t('set.size')));
    var st = el('div', 'stepper');
    var minus = el('button', 'ib font', 'A−'), val = el('span', 'stepper-val', String(Shell.getPrefs().fontSize)), plus = el('button', 'ib font', 'A+');
    [minus, plus].forEach(function (x, i) { x.type = 'button'; x.addEventListener('click', function () { var v = Math.min(24, Math.max(14, Number(Shell.getPrefs().fontSize) + (i ? 1 : -1))); Shell.setPrefs({ fontSize: v }); Shell.applyLook(); val.textContent = String(v); }); });
    st.appendChild(minus); st.appendChild(val); st.appendChild(plus);
    fs.appendChild(st);
    b.appendChild(fs);
    sw(t('set.sound'), 'sound', function () { if (audio) audio.setEnabled(prefs.sound); paintSound(); });
    if (Shell.phoneSilent()) b.appendChild(el('p', 'muted small', '📵 ' + t('set.phoneSilentText')));
    sw(t('set.tick'), 'tick');
    sw(t('set.anim'), 'anim');
    sw('🎬 ' + t('set.splash'), 'splash');
    sw(t('set.chips'), 'chips', function () { chipKey = ''; render(view); });
    if (MBG.Voice && MBG.Voice.supported()) sw('🎤 ' + t('set.voice'), 'voice', function () { $('btnMic').hidden = !micOk(); $('q').classList.toggle('withmic', micOk()); if (!micOk()) MBG.Voice.stop(); });
    sw('🖼️ ' + t('set.pics'), 'pics');
    sw(t('set.dataHint'), 'dataHint', function () { render(view); });
    var stb = el('button', 'srow srow-btn', '📖 ' + t('set.rules')); stb.type = 'button';
    stb.addEventListener('click', function () { sh.close(); rules(false); });
    b.appendChild(stb);
    var acc = el('button', 'srow srow-btn', '👤 ' + t('acc.title')); acc.type = 'button';
    acc.addEventListener('click', function () { sh.close(); MBG.Account.open(); });
    b.appendChild(acc);
  }

  /* -------------------------------------------------------------- leaving --- */
  function requestQuit() {
    if (view && view.state !== 'done') {
      Shell.confirm({ title: L('quit.title'), text: L('quit.text'), ok: L('quit.ok'), cancel: L('dlg.cancel') }).then(function (ok) {
        if (ok) { if (tr) tr.act('leave'); setTimeout(Shell.goHome, 150); }
      });
    } else Shell.goHome();
  }
  $('btnHome').addEventListener('click', requestQuit);
  $('btnHome').setAttribute('aria-label', t('nav.home'));
  Shell.setBackHandler(requestQuit);
  MBG.Notify.attach($('btnBell'), $('bellN'));
  MBG.Net.on(function () { MBG.Notify.paint(); });

  /* -------------------------------------------------------------- starting --- */
  function loading(title, text) {
    $('loading').hidden = false;
    $('ldTitle').textContent = title;
    $('ldText').textContent = text || '';
    $('ldBack').textContent = L('res.home');
  }
  $('ldBack').addEventListener('click', function () { if (tr && tr.stop) tr.stop(); Shell.goHome(); });
  function begin() {
    var mode = params.get('tabs');
    if (mode && !MBG.WhoTransport.Tabs.supported()) { loading(L('tabs.unsupported'), ''); return; }
    if (mode === 'join') return joinTabs();
    loading(L('ld.title'), L('ld.text'));
    if (mode === 'host') {
      tr = new MBG.WhoTransport.Tabs(setup, 'host');
      tr.onView(onView);
      tr.host(function (code) {
        $('ldTitle').textContent = L('tabs.waiting');
        $('ldText').textContent = L('tabs.how', { code: code });
        var ex = $('ldExtra'); ex.textContent = '';
        var open = el('a', 'btn submit', '➕ ' + L('tabs.open')); open.href = 'play.html?tabs=join'; open.target = '_blank';
        ex.appendChild(open);
      }).then(started);
      return;
    }
    if (params.get('room')) return joinGame({ server: true, id: params.get('room'), lang: setup.lang, mode: setup.mode }, params.get('as') === 'play' ? 'play' : 'watch');
    if (params.get('online')) return onlineSearch();
    if (params.get('games')) { loading(L('join.title'), L('join.pick')); var hb = $('ldExtra'); hb.textContent = ''; if (MBG.WhoTransport.Online.supported()) gamesSheet(); else joinTabs(); return; }
    tr = new MBG.WhoTransport.Local(setup);
    tr.onView(onView);
    if (setup.daily) loading('🗓️ ' + L('daily.kicker'), C.MODES[setup.mode].title[LIx]);
    var none = function () { waiting(false); loading(L('ld.none'), L('ld.noneText')); };
    waiting(true, function () { tr.start(true).then(started, none); });
    tr.start().then(started, none);
  }
  /* The wait while the answers are found: a clear "Please wait", a moving bar, what is happening,
     the seconds - and after a few seconds a button to play at once with the built-in cards. */
  var waitTimer = null;
  function waiting(on, skip, kind) {
    clearInterval(waitTimer);
    $('ldWait').hidden = !on;
    if (!on) return;
    var t0 = Date.now(), skipShown = false;
    $('ldWord').textContent = L('ld.wait');
    function step() {
      var sec = (Date.now() - t0) / 1000;
      // fills quickly, then slower: about 90 % after 14 s (the longest the search may take)
      $('ldBar').style.width = Math.min(96, 100 * (1 - Math.exp(-sec / 6))) + '%';
      var stepI = sec < 3 ? 0 : sec < 8 ? 1 : 2;
      $('ldTip').textContent = L(kind === 'lobby' ? ['online.tip1', 'online.tip2', 'online.tip3'][stepI] : ['ld.step1', 'ld.step2', 'ld.step3'][stepI]);
      $('ldSecs').textContent = L('ld.secs', { s: Math.floor(sec) });
      if (skip && !skipShown && sec >= 5) {
        skipShown = true;
        var b = el('button', 'btn ghost', '⚡ ' + L('ld.skip'));
        b.type = 'button';
        b.addEventListener('click', function () { b.disabled = true; $('ldTip').textContent = L('ld.step3'); skip(); });
        $('ldExtra').appendChild(b);
      }
    }
    step();
    waitTimer = setInterval(step, 250);
  }
  /* ------------------------------------------- joining and watching games --- */
  function adopt(s2) {
    if (!s2) return;
    setup = s2;
    L = function (key, p) { return Shell.tIn(setup.lang, key, p); };
    LIx = Math.max(0, Shell.LANGS.indexOf(setup.lang));
    app.setAttribute('data-mode', setup.mode);
    document.documentElement.lang = setup.lang;
    paintDaily();
  }
  function resetView() { view = null; shownStart = -1; shownEnd = -1; shownResult = false; reactSeen = 0; warned = -1; decided = {}; }
  /** One running game in a list: who plays, how many watch; "Play" and/or "Watch". */
  function gameRow(o, onPick) {
    var row = el('div', 'gamerow');
    var md = C.MODES[o.mode] || C.MODES.who;
    var tx = el('div', 'gr-t');
    tx.appendChild(el('strong', null, md.icon + ' ' + (o.players || []).join(' · ')));
    tx.appendChild(el('span', 'muted small', Shell.langName(o.lang) + (o.waiting ? ' · ' + L('join.waitingFor') : ' · ' + L('join.round', { n: o.round || 1 })) + (o.watchers ? ' · 👀 ' + o.watchers : '') + (o.ranked ? ' · ♟️' : '')));
    row.appendChild(tx);
    var btns = el('div', 'gr-b');
    if (!o.ranked && (o.waiting || o.access !== 'closed')) {
      var p1 = el('button', 'btn submit small', '🎮 ' + L('join.play')); p1.type = 'button';
      p1.addEventListener('click', function () { onPick(o, 'play'); });
      btns.appendChild(p1);
    }
    if (!o.waiting && o.access !== 'closed') {
      var w1 = el('button', 'btn ghost small', '👀 ' + L('join.watch')); w1.type = 'button';
      w1.addEventListener('click', function () { onPick(o, 'watch'); });
      btns.appendChild(w1);
    }
    row.appendChild(btns);
    return row;
  }
  function tabsGames(offers) {
    return Object.keys(offers).map(function (code) {
      var o = offers[code];
      return { tabs: true, code: code, setup: o.setup, lang: o.setup.lang, mode: o.setup.mode, players: o.players || [o.name], watchers: o.watchers || 0,
        access: o.access, waiting: o.state === 'waiting', round: 1 };
    });
  }
  /** Join a game: a tab of this browser (o.tabs) or a match room on the server (o.server). */
  function joinGame(o, as) {
    if (as === 'play' && MBG.Shop && !MBG.Plan.canPlay()) { MBG.Shop.gate().then(function (ok) { if (ok) joinGame(o, as); }); return; }
    if (tr && tr.stop) tr.stop();
    if (search && search !== tr) { search.cancelFind && search.cancelFind(); }
    if (peek) { peek.stop(); peek = null; }
    $('searchBanner').hidden = true;
    resetView();
    loading(L(as === 'play' ? 'join.askingPlay' : 'join.askingWatch'), L('join.wait'));
    if (o.tabs) {
      adopt(o.setup);
      tr = new MBG.WhoTransport.Tabs(o.setup, 'guest');
      tr.onView(onView);
      tr.join(o.code, as);
    } else {
      tr = new MBG.WhoTransport.Online(setup);
      tr.onView(function (v, ev) { if (v && v.lang && v.lang !== setup.lang) adopt({ lang: v.lang, mode: v.mode, level: v.level }); onView(v, ev); });
      tr.joinRoom(o.id, null, as);
    }
  }
  function joinTabs() {
    loading(L('tabs.joinTitle'), L('tabs.looking'));
    var g = new MBG.WhoTransport.Tabs(setup, 'guest');
    tr = g;
    g.listen(function (offers) {
      var ex = $('ldExtra'); ex.textContent = '';
      tabsGames(offers).forEach(function (o) { ex.appendChild(gameRow(o, function (o2, as) { g.stop(); joinGame(o2, as); })); });
    });
  }
  /** "Join or watch a game": the games on the server, or (demo) in the other tabs of this browser. */
  function gamesSheet() {
    var sh = Shell.sheet({ id: 'dlgGames', title: '👀 ' + L('join.title') });
    var b = sh.body, list = el('div', 'gamelist');
    b.appendChild(el('p', 'muted small', L(MBG.WhoTransport.Online.supported() ? 'join.textOnline' : 'join.textTabs')));
    b.appendChild(list);
    list.appendChild(el('p', 'muted', '⏳ ' + L('ld.wait') + '…'));
    function paint(games) {
      list.textContent = '';
      if (!games.length) list.appendChild(el('p', 'muted', L('join.none')));
      games.forEach(function (o) { list.appendChild(gameRow(o, function (o2, as) { sh.close(); joinGame(o2, as); })); });
    }
    if (MBG.WhoTransport.Online.supported()) {
      var o = search || new MBG.WhoTransport.Online(setup);
      o.rooms(function (rooms) { paint(rooms.filter(function (x) { return x.id !== (tr && tr.room); }).map(function (x) {
        return { server: true, id: x.id, lang: x.lang, mode: x.mode, players: x.players, watchers: x.watchers, access: x.access, ranked: x.ranked, round: x.round };
      })); });
    } else {
      var t2 = peek || new MBG.WhoTransport.Tabs(setup, 'guest');
      if (!peek) t2.listen(function (offers) { paint(tabsGames(offers)); }); else paint(tabsGames(t2.offers));
      setTimeout(function () { if (list.textContent.indexOf('⏳') === 0) paint([]); }, 1800);
    }
  }

  /* --------------------------- an opponent online - and the computer meanwhile --- */
  // Finds an opponent in the lobby. After 15 seconds without one: "Play the computer while we keep
  // looking?" - in the first weeks there are few players. When an opponent is found during the
  // practice game, the player decides whether to switch.
  var search = null, peek = null, practicing = false;
  function onlineSearch() {
    var demo = !MBG.WhoTransport.Online.supported(), done = false, t0 = Date.now();
    loading(L('online.looking'), L(demo ? 'online.lookingDemo' : 'online.lookingText'));
    waiting(true, null, 'lobby');
    var ex = $('ldExtra'); ex.textContent = '';
    var bj = el('button', 'btn ghost', '👀 ' + L('join.title')); bj.type = 'button';
    bj.addEventListener('click', gamesSheet);
    var bc = el('button', 'btn ghost', '🤖 ' + L('online.cpu')); bc.type = 'button';
    bc.addEventListener('click', function () { practiceWhileLooking(); });
    ex.appendChild(bj); ex.appendChild(bc);
    if (!demo) {
      search = tr = new MBG.WhoTransport.Online(setup);
      tr.onView(onView);
      search.find(function (st, info) {
        if (st === 'proposal') {
          if (practicing) { foundWhilePracticing(info); return false; }
          $('ldTitle').textContent = L('online.found'); $('ldText').textContent = L('online.foundText', { name: info.with, rating: info.rating });
        }
        return true;
      }).then(function (res) { done = true; if (practicing) { practicing = false; $('searchBanner').hidden = true; } started(res); },
        function () { if (!practicing) { waiting(false); loading(L('opp.online'), L('online.error')); } });
    } else {
      // demo: no server yet - the open games of the other tabs of this browser are the "online" players
      peek = new MBG.WhoTransport.Tabs(setup, 'guest');
      peek.listen(function (offers) {
        var games = tabsGames(offers);
        if (practicing && games.length) banner(L('online.tabsFound'), function () { gamesSheet(); });
      });
    }
    var timer = setInterval(function () {
      if (done || practicing || !$('ldWait') || $('loading').hidden) { if (done || practicing) clearInterval(timer); return; }
      if (Date.now() - t0 >= 15000) { clearInterval(timer); noMatch(demo); }
    }, 500);
  }
  function noMatch(demo) {
    var sh = Shell.sheet({ id: 'dlgNoMatch', title: '🔎 ' + L('online.noneTitle'), modal: true });
    var b = sh.body;
    b.appendChild(el('p', null, L(demo ? 'online.noneDemo' : 'online.noneText')));
    var col = el('div', 'btncol');
    [['🤖 ' + L('online.cpuWhile'), 'submit', function () { practiceWhileLooking(); }],
      ['👀 ' + L('join.title'), 'ghost', gamesSheet],
      ['⏳ ' + L('online.keepWaiting'), 'ghost', function () {}],
      [L('res.home'), 'ghost', function () { if (search) search.stop(); Shell.goHome(); }]].forEach(function (x) {
      var btn = el('button', 'btn ' + x[1], x[0]); btn.type = 'button';
      btn.addEventListener('click', function () { sh.close(); x[2](); });
      col.appendChild(btn);
    });
    b.appendChild(col);
  }
  function banner(text, onClick, stopLabel) {
    var bn = $('searchBanner');
    bn.hidden = false;
    bn.textContent = '';
    var tx = el('button', 'sb-t', text); tx.type = 'button';
    if (onClick) tx.addEventListener('click', onClick);
    bn.appendChild(tx);
    var x = el('button', 'linkbtn', stopLabel || L('online.stop')); x.type = 'button';
    x.addEventListener('click', function () { bn.hidden = true; if (search) search.cancelFind(); if (peek) { peek.stop(); peek = null; } });
    bn.appendChild(x);
  }
  function practiceWhileLooking() {
    practicing = true;
    waiting(false);
    var cpuSetup = {}; for (var k in setup) cpuSetup[k] = setup[k];
    cpuSetup.opponent = 'computer'; cpuSetup.ranked = false; cpuSetup.botLevel = cpuSetup.botLevel || 'intermediate';
    var lt = new MBG.WhoTransport.Local(cpuSetup);
    tr = lt;
    lt.onView(onView);
    loading(L('ld.title'), L('ld.text'));
    waiting(true, function () { lt.start(true).then(started); });
    lt.start().then(started, function () { loading(L('ld.none'), L('ld.noneText')); });
    banner('🔎 ' + L(search ? 'online.stillLooking' : 'online.stillLookingDemo'), null);
  }
  function foundWhilePracticing(info) {
    Shell.confirm({ title: '🎉 ' + L('online.found'), text: L('online.switch', { name: info.with, rating: info.rating }), ok: L('online.switchOk'), cancel: L('online.switchNo') }).then(function (yes) {
      if (yes) {
        if (tr && tr.stop && tr !== search) tr.stop();
        resetView();
        tr = search;
        practicing = false;
        $('searchBanner').hidden = true;
        loading(L('online.found'), L('online.foundText', { name: info.with, rating: info.rating }));
        waiting(true);
        search.acceptProposal();
      } else { search.cancelFind(); $('searchBanner').hidden = true; }
    });
  }
  function started(res) {
    waiting(false);
    $('ldExtra').textContent = '';
    $('loading').hidden = true;
    if (res && res.source === 'deck' && res.failed) Shell.toast(L('ld.offline'), 3800);
    else if (res && res.widened) Shell.toast(L('ld.widened'), 3000);
    $('q').focus();
  }
  function onView(v, ev) {
    if (v && v.outside) {
      // asked to join and waiting - or declined
      var q = v.myRequest;
      if (q && q.done === 'declined') loading(L('req.declinedTitle'), L('req.declinedText'));
      else if ($('loading').hidden) loading(L('join.waitTitle'), L(q && q.as === 'play' ? 'join.waitPlay' : 'join.waitWatch'));
      view = v;
      return;
    }
    if ($('loading').hidden === false && v && v.round) started();
    render(v, ev);
    if (chatDraw && chatOpen) chatDraw();
  }

  root.addEventListener('beforeunload', function () { if (tr && tr.stop) tr.stop(); });
  if (!Shell.getPrefs().introOff) rules(true).then(begin); else begin();
  MBG.play = { get view() { return view; }, get transport() { return tr; } };
})(typeof self !== 'undefined' ? self : globalThis);
