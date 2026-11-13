/*!
 * MBG Who Am I? - the party game on one phone: the card on the forehead, as in the films.
 * Players take turns; in a turn the phone shows one name after another in huge letters to the
 * others; ✓ (or tilting the phone down) counts it, ↷ (or tilting up) skips. The names come from
 * the same search as the matches (Wikidata, or the built-in cards without internet).
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, C = MBG.WhoCats, X = MBG.WhoText;
  var $ = function (id) { return document.getElementById(id); };
  var el = Shell.el, t = Shell.t;
  var KEY = 'MBG.Who.party';
  var cfg = Shell.readJson(KEY, null) || { players: ['', ''], mode: 'who', lang: Shell.getLang(), level: 'easy', seconds: 60, turns: 1 };
  var deck = [], used = 0, state = null, tick = null;
  var audio = MBG.Audio ? new MBG.Audio.AudioService({ hit0: 'sounds/hit0.wav', hit1: 'sounds/hit1.wav', win5: 'sounds/win5.wav', tick: 'sounds/ticktock.wav' }, { enabled: Shell.getPrefs().sound, keys: 'off' }).init() : null;
  document.addEventListener('pointerdown', function () { if (audio) audio.unlock(); }, { once: true });

  Shell.applyLook();
  $('ptTitle').textContent = '🎉 ' + t('pt.title');
  $('btnHome').addEventListener('click', function () { stop(); Shell.goHome(); });
  Shell.setBackHandler(function () { if (!$('ptStage').hidden) { endTurn(); return; } Shell.goHome(); });

  function names() { return cfg.players.map(function (n, i) { return n.trim() || t('pt.player', { n: i + 1 }); }); }

  function setup() {
    var b = $('ptBody'), i = Math.max(0, Shell.LANGS.indexOf(Shell.getLang()));
    b.textContent = '';
    b.appendChild(el('p', null, t('pt.intro')));
    var sec = el('section', 'su-sec');
    sec.appendChild(el('h3', null, t('setup.mode')));
    var mg = el('div', 'su-modes');
    C.MODE_ORDER.forEach(function (k) {
      var m = C.MODES[k], btn = el('button', 'su-mode mode-' + k + (cfg.mode === k ? ' on' : ''));
      btn.type = 'button';
      btn.appendChild(el('span', 'su-ic', m.icon));
      btn.appendChild(el('strong', null, m.title[i]));
      btn.addEventListener('click', function () { cfg.mode = k; setup(); });
      mg.appendChild(btn);
    });
    sec.appendChild(mg);
    b.appendChild(sec);
    var ps = el('section', 'su-sec');
    ps.appendChild(el('h3', null, t('pt.players')));
    var list = el('div', 'pt-players');
    cfg.players.forEach(function (n, j) {
      var row = el('div', 'pt-player');
      var inp = el('input', 'textfield'); inp.value = n; inp.maxLength = 20; inp.placeholder = t('pt.player', { n: j + 1 });
      inp.addEventListener('input', function () { cfg.players[j] = inp.value; });
      row.appendChild(inp);
      if (cfg.players.length > 2) {
        var x = el('button', 'btn ghost small', '×'); x.type = 'button';
        x.addEventListener('click', function () { cfg.players.splice(j, 1); setup(); });
        row.appendChild(x);
      }
      list.appendChild(row);
    });
    ps.appendChild(list);
    if (cfg.players.length < 10) {
      var add = el('button', 'btn ghost small', '+ ' + t('pt.add')); add.type = 'button';
      add.addEventListener('click', function () { cfg.players.push(''); setup(); });
      ps.appendChild(add);
    }
    b.appendChild(ps);
    function segRow(title, items, val, on) {
      var s2 = el('section', 'su-sec');
      s2.appendChild(el('h3', null, title));
      var sg = el('div', 'seg wide');
      items.forEach(function (it) {
        var x = el('button', 'seg-btn' + (it[0] === val ? ' on' : ''), it[1]); x.type = 'button';
        x.addEventListener('click', function () { on(it[0]); setup(); });
        sg.appendChild(x);
      });
      s2.appendChild(sg);
      b.appendChild(s2);
    }
    segRow(t('setup.lang'), Shell.LANGS.map(function (l) { return [l, Shell.langName(l)]; }), cfg.lang, function (v) { cfg.lang = v; });
    segRow(t('setup.level'), C.LEVEL_ORDER.map(function (k) { return [k, C.LEVELS[k].names[i]]; }), cfg.level, function (v) { cfg.level = v; });
    segRow(t('pt.seconds'), [[45, '45 s'], [60, '60 s'], [90, '90 s'], [120, '2 min']], cfg.seconds, function (v) { cfg.seconds = v; });
    segRow(t('pt.rounds'), [[1, '1'], [2, '2'], [3, '3']], cfg.turns, function (v) { cfg.turns = v; });
    var go = el('button', 'btn submit big', '🎉 ' + t('pt.start')); go.type = 'button';
    go.addEventListener('click', start);
    b.appendChild(go);
  }

  /** A party is one game too (paid edition: today's free game, or a plan). */
  function start() {
    if (MBG.Shop && MBG.Plan && !MBG.Plan.canPlay()) { MBG.Shop.gate().then(function (ok) { if (ok) start(); }); return; }
    if (MBG.Plan) MBG.Plan.useGame();
    startParty();
  }
  function startParty() {
    Shell.writeJson(KEY, cfg);
    var b = $('ptBody');
    b.textContent = '';
    b.appendChild(el('p', 'empty', t('pt.loading')));
    MBG.WhoDiscovery.find({ lang: cfg.lang, mode: cfg.mode, level: cfg.level, count: 1, online: navigator.onLine !== false, store: Shell.store }).then(function (r) {
      var lvl = C.LEVELS[cfg.level].n;
      var pool = r.pool.filter(function (e) { return Math.abs(e.level - lvl) <= 1; });
      if (pool.length < 20) pool = r.pool;
      // more cards: the other categories of the same question word, built in
      var extra = MBG.WhoDiscovery.deckPool({ mode: cfg.mode }).filter(function (e) { return Math.abs(e.level - lvl) <= 1 && pool.indexOf(e) === -1; });
      deck = X.shuffle(pool.concat(extra));
      used = 0;
      state = { player: 0, turn: 0, scores: names().map(function () { return 0; }), log: [] };
      pass();
    });
  }
  function pass() {
    var b = $('ptBody'), nm = names()[state.player];
    b.textContent = '';
    var box = el('div', 'ld-inner');
    box.style.margin = '30px auto';
    box.appendChild(el('div', 'fcard spin mode-' + cfg.mode)).appendChild(el('span', null, '?'));
    box.appendChild(el('h2', null, t('pt.pass', { name: nm })));
    box.appendChild(el('p', null, t('pt.passText')));
    box.appendChild(el('p', 'muted small', t('pt.tilt')));
    var go = el('button', 'btn submit big', t('pt.ready')); go.type = 'button';
    go.addEventListener('click', turn);
    box.appendChild(go);
    b.appendChild(box);
  }
  function card() {
    if (used >= deck.length) { deck = X.shuffle(deck); used = 0; }
    var e = deck[used++];
    var nm = X.labelIn(e, cfg.lang);
    $('ptName').textContent = nm;
    // big, but the longest word always fits on one line
    var lw = Math.max.apply(null, nm.split(/\s+/).map(function (w) { return Array.from(w).length; }));
    $('ptName').style.fontSize = 'min(' + Math.min(16, 135 / Math.max(4, lw)).toFixed(1) + 'vw, ' + Math.min(22, 150 / Math.max(4, lw)).toFixed(1) + 'vh)';
    var cat = C.CATS[e.cat];
    $('ptSub').textContent = (cat ? cat.icon + ' ' + C.name(cat, cfg.lang) : '');
    state.current = e;
  }
  function turn() {
    var stage = $('ptStage');
    stage.setAttribute('data-mode', cfg.mode);
    stage.className = 'pt-stage mode-' + cfg.mode;
    stage.hidden = false;
    $('ptYes').textContent = Shell.tIn(cfg.lang, 'pt.yes');
    $('ptSkip').textContent = Shell.tIn(cfg.lang, 'pt.skip');
    $('ptWho').textContent = names()[state.player];
    state.got = [];
    state.left = cfg.seconds;
    state.pts = 0;
    paint();
    card();
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () { /* not allowed */ }); } catch (e) { /* ignore */ }
    tick = setInterval(function () {
      state.left -= 1;
      if (state.left === 5 && audio && Shell.getPrefs().sound) audio.startTick();
      paint();
      if (state.left <= 0) endTurn();
    }, 1000);
  }
  function paint() {
    $('ptClock').textContent = Math.floor(state.left / 60) + ':' + ('0' + (state.left % 60)).slice(-2);
    $('ptPts').textContent = Shell.tIn(cfg.lang, 'pt.points', { n: state.pts });
  }
  function flash(txt, color) {
    var f = el('div', 'pt-flash', txt);
    f.style.background = color;
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 520);
  }
  var lock = false;
  function yes() {
    if (lock || $('ptStage').hidden) return;
    lock = true; setTimeout(function () { lock = false; }, 700);
    state.pts += 1;
    state.got.push(X.labelIn(state.current, cfg.lang));
    if (audio && Shell.getPrefs().sound) audio._play('hit1');
    flash('✓', 'rgba(30, 123, 78, .85)');
    paint(); card();
  }
  function skip() {
    if (lock || $('ptStage').hidden) return;
    lock = true; setTimeout(function () { lock = false; }, 700);
    if (audio && Shell.getPrefs().sound) audio._play('hit0');
    flash('↷', 'rgba(0, 0, 0, .55)');
    card();
  }
  $('ptYes').addEventListener('click', yes);
  $('ptSkip').addEventListener('click', skip);
  // tilting: the phone on the forehead in landscape; down = got it, up = skip
  // armed only while the phone stands upright on the forehead (|gamma| > 60), so a phone lying on a
  // table never counts anything; a clear tilt (< 30) counts once, then it must stand up again
  var armed = false;
  root.addEventListener('deviceorientation', function (e) {
    if ($('ptStage').hidden || e.gamma == null) return;
    var g = e.gamma;
    if (Math.abs(g) > 60) { armed = true; return; }
    if (armed && Math.abs(g) < 30) { armed = false; if (g > 0) yes(); else skip(); }
  });
  function stop() { clearInterval(tick); tick = null; if (audio) audio.stopTick(); }
  function endTurn() {
    stop();
    $('ptStage').hidden = true;
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* ignore */ }
    state.scores[state.player] += state.pts;
    state.log.push({ p: state.player, got: state.got });
    Shell.toast(t('pt.over') + ' ' + t('pt.points', { n: state.pts }), 2500);
    state.player += 1;
    if (state.player >= cfg.players.length) { state.player = 0; state.turn += 1; }
    if (state.turn >= cfg.turns) results(); else pass();
  }
  function results() {
    var b = $('ptBody'), ns = names();
    b.textContent = '';
    b.appendChild(el('h2', null, '🏆 ' + t('pt.results')));
    var best = Math.max.apply(null, state.scores);
    var winners = ns.filter(function (n, i) { return state.scores[i] === best; });
    b.appendChild(el('p', 'statline', t('pt.winner', { name: winners.join(' & ') })));
    var kv = el('div', 'kv pt-score');
    ns.map(function (n, i) { return [n, state.scores[i]]; }).sort(function (a, c) { return c[1] - a[1]; }).forEach(function (x) {
      var r = el('div', 'kv-row'); r.appendChild(el('span', null, x[0])); r.appendChild(el('b', 'num', String(x[1]))); kv.appendChild(r);
    });
    b.appendChild(kv);
    state.log.forEach(function (l) { if (l.got.length) b.appendChild(el('p', 'muted small', ns[l.p] + ': ' + l.got.join(', '))); });
    if (audio && Shell.getPrefs().sound) audio._play('win5');
    var again = el('button', 'btn submit big', '🔁 ' + t('pt.again')); again.type = 'button';
    again.addEventListener('click', setup);
    b.appendChild(again);
  }
  setup();
})(typeof self !== 'undefined' ? self : globalThis);
