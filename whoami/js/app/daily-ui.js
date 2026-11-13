/*!
 * MBG Who Am I? - the puzzles of the day on screen (0.9.9).
 *  - homeCard(box)   the card on the front page: one of the four puzzles, drawn for the day, with
 *                    its rules, the time to the next puzzles, the other three of today and the
 *                    leaderboard of the day
 *  - openBoard(mode) the leaderboard of the day (Top 20) of each question word, with "Play"
 *  - banner(mode)    the corner of the setup ("New game") for the chosen question word
 *  - pill(box, …)    the corner of the game screen
 *  - start(mode)     starts a puzzle of the day (free in every edition; daily.js has the rules)
 * The puzzle is played in the language of the app; each language has its own puzzles.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, C = MBG.WhoCats, Dl = MBG.WhoDaily;
  var el = Shell.el, t = Shell.t;
  var LI = function (l) { return Math.max(0, Shell.LANGS.indexOf(l || Shell.getLang())); };

  function puzzle(mode, lang) { return Dl.puzzle(mode, lang || Shell.getLang()); }
  function me() { return Shell.playerName(); }
  function mine(p) { return Dl.mine(p.id, me()); }
  function tiles(word, extra) {
    var box = el('span', 'mtiles' + (extra ? ' ' + extra : ''));
    var marks = ['o', 'q', 'x', 'o', 'q', 'x'];
    Array.from(word).forEach(function (ch, i) { box.appendChild(el('span', 'mt ' + marks[i % marks.length], ch)); });
    return box;
  }
  /** "Mon 9 Nov" (the day in UTC - the day of the puzzles). */
  function dateText(p, lang) {
    return Shell.dateText(p.day * Dl.DAY + 12 * 36e5, { weekday: true, utc: true }, lang);
  }
  /** "New in 10 h 37 min". */
  function nextText(lang) {
    var ms = Math.max(0, Dl.nextAt() - Date.now()), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return Shell.tIn(lang || Shell.getLang(), 'daily.next', { h: h, m: m });
  }
  /** "Easy · ⏱ 2 min · Questions: 8 · Wrong guesses: 2 · 🤖 Intermediate" */
  function rulesText(p, lang) {
    var l = lang || Shell.getLang(), i = LI(l), T = function (k, o) { return Shell.tIn(l, k, o); };
    return [C.LEVELS[p.level].names[i], '⏱ ' + p.time / 60 + ' min', T('daily.questions', { n: p.questions }), T('daily.guesses', { n: p.guesses }),
      '🤖 ' + MBG.WhoBotNames[p.botLevel][i]].join(' · ');
  }
  function start(mode) { MBG.WhoSetup.start(Dl.setupFor(puzzle(mode))); }
  /** The player's place today: from the server (signed in) or this device. */
  function place(p) {
    var Net = MBG.Net;
    if (!Net || Net.demo || !Net.signedIn()) return Promise.resolve(Dl.board(p.id).filter(function (r) { return r.name === me(); })[0] || null)
      .then(function (r) { return r ? { place: r.place, of: Dl.board(p.id).length } : null; });
    return Net.daily.top(p.id).then(function (res) { return res.mine ? { place: res.mine.place, of: res.total } : null; }, function () { return null; });
  }
  function statusLine(p, box) {
    var m = mine(p);
    if (!m) return false;
    var line = el('p', 'dc-done');
    line.appendChild(el('span', 'dc-tick', '✓'));
    line.appendChild(el('span', null, m.entry.won ? t('daily.yourScore', { n: m.entry.score }) : t('daily.notSolved')));
    var pl = el('span', 'dc-place');
    line.appendChild(pl);
    box.appendChild(line);
    place(p).then(function (x) { if (x && x.place) pl.textContent = ' · ' + t('daily.place', { n: x.place, of: x.of }); });
    return true;
  }

  /* ------------------------------------------------------ the home card --- */
  var timer = null;
  function homeCard(box) {
    if (!box || !Dl) return;
    var lang = Shell.getLang(), i = LI(), feat = Dl.featured(lang), p = puzzle(feat), md = C.MODES[feat];
    box.textContent = '';
    box.hidden = false;
    box.setAttribute('data-mode', feat);
    box.className = 'dailycard';
    var top = el('div', 'dc-top');
    top.appendChild(el('span', 'dc-kicker', '🗓️ ' + t('daily.kicker') + ' · ' + dateText(p)));
    var left = el('span', 'dc-left', '⏳ ' + nextText());
    top.appendChild(left);
    box.appendChild(top);
    clearInterval(timer);
    timer = setInterval(function () { if (!document.body.contains(left)) { clearInterval(timer); return; } left.textContent = '⏳ ' + nextText(); if (Dl.dayOf() !== p.day) homeCard(box); }, 30000);

    var main = el('div', 'dc-main');
    main.appendChild(tiles(md.word[i] + '?', 'dc-tiles'));
    var tx = el('div', 'dc-t');
    tx.appendChild(el('h2', null, md.title[i]));
    tx.appendChild(el('p', 'dc-rules', rulesText(p)));
    main.appendChild(tx);
    box.appendChild(main);
    var played = statusLine(p, box);
    var go = el('button', 'btn ' + (played ? 'ghost' : 'submit') + ' dc-play', played ? '🔁 ' + t('daily.again') : '▶ ' + t('daily.play'));
    go.type = 'button';
    go.addEventListener('click', function () { start(feat); });
    box.appendChild(go);

    var more = el('div', 'dc-more');
    more.appendChild(el('span', 'dc-also', t('daily.also') + ':'));
    C.MODE_ORDER.filter(function (k) { return k !== feat; }).forEach(function (k) {
      var q = puzzle(k), done = !!mine(q);
      var c = el('button', 'dc-chip mode-' + k + (done ? ' done' : ''));
      c.type = 'button';
      c.appendChild(el('span', null, C.MODES[k].icon + ' ' + C.MODES[k].word[i] + '?'));
      if (done) c.appendChild(el('span', 'dc-tick', '✓'));
      c.setAttribute('aria-label', C.MODES[k].title[i] + ' · ' + t('daily.kicker') + (done ? ' ✓' : ''));
      c.addEventListener('click', function () { openBoard(k); });
      more.appendChild(c);
    });
    box.appendChild(more);
    var lb = el('button', 'btn ghost small dc-board', '🏆 ' + t('daily.board'));
    lb.type = 'button';
    lb.addEventListener('click', function () { openBoard(feat); });
    box.appendChild(lb);
  }

  /* ------------------------------------------- the leaderboard of the day --- */
  function openBoard(mode) {
    mode = C.MODE_ORDER.indexOf(mode) === -1 ? Dl.featured(Shell.getLang()) : mode;
    var i = LI(), p = puzzle(mode), Net = MBG.Net;
    var sh = Shell.sheet({ id: 'dlgDaily', title: '🏆 ' + t('daily.board'), cls: 'dailysheet' });
    var b = sh.body;
    var seg = el('div', 'seg wide dl-seg');
    C.MODE_ORDER.forEach(function (k) {
      var done = !!mine(puzzle(k));
      var btn = el('button', 'seg-btn' + (k === mode ? ' on' : ''));
      btn.type = 'button';
      btn.appendChild(el('span', 'dl-ic', C.MODES[k].icon + (done ? '✓' : '')));
      btn.appendChild(el('span', 'dl-w', C.MODES[k].word[i] + '?'));
      btn.setAttribute('aria-label', C.MODES[k].title[i] + (done ? ' ✓' : ''));
      btn.addEventListener('click', function () { if (k !== mode) { sh.close(); openBoard(k); } });
      seg.appendChild(btn);
    });
    b.appendChild(seg);

    var card = el('div', 'dailycard in-sheet');
    card.setAttribute('data-mode', mode);
    var top = el('div', 'dc-top');
    top.appendChild(el('span', 'dc-kicker', '🗓️ ' + t('daily.kicker') + ' · ' + dateText(p)));
    top.appendChild(el('span', 'dc-left', '⏳ ' + nextText()));
    card.appendChild(top);
    var main = el('div', 'dc-main');
    main.appendChild(tiles(C.MODES[mode].word[i] + '?', 'dc-tiles'));
    var tx = el('div', 'dc-t');
    tx.appendChild(el('h2', null, C.MODES[mode].title[i]));
    tx.appendChild(el('p', 'dc-rules', rulesText(p)));
    main.appendChild(tx);
    card.appendChild(main);
    var played = statusLine(p, card);
    var go = el('button', 'btn ' + (played ? 'ghost' : 'submit') + ' dc-play', played ? '🔁 ' + t('daily.again') : '▶ ' + t('daily.play'));
    go.type = 'button';
    go.addEventListener('click', function () { sh.close(); start(mode); });
    card.appendChild(go);
    b.appendChild(card);

    var list = el('ol', 'hoflist dl-list');
    list.appendChild(el('li', 'muted small', '…'));
    b.appendChild(list);
    var note = el('p', 'muted small dl-note');
    b.appendChild(note);
    var foot = el('p', 'muted small dl-note', t('daily.same', { lang: Shell.langName(Shell.getLang()) }) + (MBG.Shop && MBG.Shop.paid && MBG.Shop.paid() ? ' · ' + t('daily.free') : ''));
    b.appendChild(foot);

    function draw(rows, world) {
      list.textContent = '';
      if (!rows.length) { list.appendChild(el('li', 'tc-empty dl-empty', t('daily.empty'))); return; }
      rows.forEach(function (r, k) {
        var li = el('li', 'hofrow' + (k < 3 ? ' top' + (k + 1) : '') + (r.name === me() ? ' me' : ''));
        li.appendChild(el('span', 'hof-place', k < 3 ? ['🥇', '🥈', '🥉'][k] : String(r.place || k + 1)));
        var mid = el('span', 'hof-mid');
        mid.appendChild(el('strong', null, r.name));
        mid.appendChild(el('span', 'muted small', r.won ? t('hof.questions', { n: r.used }) + ' · ⏱ ' + Math.floor(r.secs / 60) + ':' + String(r.secs % 60).padStart(2, '0') : t('daily.notSolved')));
        li.appendChild(mid);
        li.appendChild(el('b', 'num hof-val', String(r.score)));
        list.appendChild(li);
      });
      if (world === false) return;
    }
    if (!Net || Net.demo) {
      draw(Dl.board(p.id), false);
      note.textContent = '🧪 ' + t('daily.demoNote', { lang: Shell.langName(Shell.getLang()) });
    } else {
      if (!Net.signedIn()) note.textContent = '👤 ' + t('daily.signIn');
      Net.daily.top(p.id).then(function (res) { draw(res.rows || [], true); }, function () {
        draw(Dl.board(p.id), false);
        note.textContent = '📱 ' + t('hof.device');
      });
    }
    return Shell.closed(sh.dlg);
  }

  /* --------------------------------------------- the corner of the setup --- */
  function banner(mode, onPlay) {
    var i = LI(), p = puzzle(mode), m = mine(p);
    var box = el('div', 'dailybanner');
    box.setAttribute('data-mode', mode);
    var tx = el('button', 'db-t');
    tx.type = 'button';
    tx.appendChild(el('strong', null, '🗓️ ' + t('daily.kicker') + ' · ' + C.MODES[mode].title[i] + (m ? ' ✓' : '')));
    tx.appendChild(el('span', null, m ? (m.entry.won ? t('daily.yourScore', { n: m.entry.score }) : t('daily.notSolved')) + ' · 🏆 ' + t('daily.board') : rulesText(p)));
    tx.addEventListener('click', function () { if (onPlay) onPlay(); openBoard(mode); });
    box.appendChild(tx);
    var go = el('button', 'btn ' + (m ? 'ghost' : 'submit') + ' small', m ? '🔁' : '▶ ' + t('daily.playShort'));
    go.type = 'button';
    go.setAttribute('aria-label', m ? t('daily.again') : t('daily.play'));
    go.addEventListener('click', function () { if (onPlay) onPlay(); start(mode); });
    box.appendChild(go);
    return box;
  }

  /* ---------------------------------------- the corner of the game screen --- */
  /**
   * In a puzzle of the day: "🗓️ Puzzle of the day · Mon 9 Nov" (it says what this game is).
   * In any other game: a small button to the puzzle of the day of the same question word.
   * o: { setup, L (texts of the match), busy() → true while a match is running }
   */
  function pill(box, o) {
    if (!box || !Dl) return;
    var s = o.setup, lang = s.lang || Shell.getLang();
    box.textContent = '';
    box.hidden = false;
    if (s.daily) {
      var p = Dl.puzzle(s.daily.mode, s.daily.lang, { day: s.daily.day });
      box.className = 'dailypill on';
      box.disabled = true;
      box.textContent = '🗓️ ' + o.L('daily.kicker') + ' · ' + dateText(p, lang);
      box.title = rulesText(p, lang);
      return;
    }
    box.className = 'dailypill';
    box.disabled = false;
    box.textContent = '🗓️ ' + o.L('daily.kicker');
    box.onclick = function () {
      var mode = s.mode || 'who', q = puzzle(mode), title = C.MODES[mode].title[LI()];
      var go = function () { MBG.WhoSetup.start(Dl.setupFor(q)); };
      if (!o.busy()) { go(); return; }
      Shell.confirm({ title: '🗓️ ' + t('daily.leaveTitle'), text: t('daily.leaveText', { q: title }), ok: '▶ ' + t('daily.playShort'), cancel: t('dlg.cancel') })
        .then(function (ok) { if (ok) go(); });
    };
  }

  MBG.DailyUI = { homeCard: homeCard, openBoard: openBoard, banner: banner, pill: pill, start: start, rulesText: rulesText, dateText: dateText, nextText: nextText };
})(typeof self !== 'undefined' ? self : globalThis);
