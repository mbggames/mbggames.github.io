/*!
 * MBG Puzzles · Codebreaker - user interface.
 * Renders controller events and wires up the board, the status line, the login,
 * settings, help and number-length dialogs, themes, text size, sound, focus handling
 * and leaving for the game list. All game decisions are made by the controller.
 *
 * Screen: top bar (language flags, Help, Settings) · status line (Log in / user, clock,
 * number length) · board (current round; the number being typed is pinned to its bottom
 * edge) · input · Reveal / Quit / Submit.
 * Inside MBG Puzzles: the MBG mark is the Home button, the free week / daily free game /
 * subscription come from MBG.Shell.access and MBG.Billing, and the subscription sheet is
 * MBG.Paywall. Quit, the quit command, N after a game and the Back button all lead
 * back to the game list (an unfinished game is kept); only the home screen closes the app.
 * Instructions appear only when Help is opened; short messages appear as toasts
 * or as one line under the input, never as a growing list.
 */
(function () {
  'use strict';

  var MBG = window.MBG;
  var C = MBG.Config, E = MBG.Engine, I = MBG.I18n, S = MBG.Storage;
  var Shell = MBG.Shell, GAME_ID = C.gameId;
  var Daily = MBG.Daily, Sheets = MBG.Sheets;
  // The daily puzzle opens with ?daily=1 (from the home screen); everything else is a normal game.
  var DAILY = /[?&]daily=1(&|$)/.test(window.location.search);
  function T(key, params) { return MBG.AppText.t(game.lang, key, params); }   // app-level texts
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var embedded = (function () { try { return window.top !== window; } catch (e) { return true; } })();
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------- services --- */
  var localS = S.safeStorage('localStorage');
  var sessionS = S.safeStorage('sessionStorage');
  var users = new S.UserStore(localS.storage, C.storageKeys.users);
  var prefsStore = new S.JsonStore(localS.storage, C.storageKeys.prefs);
  var sessionStore = new S.JsonStore(sessionS.storage, C.storageKeys.session);

  var prefs = {
    theme: null,
    fontSize: C.font.def,
    sound: true,
    keySound: 'phone',                            // key sounds: 'phone' (each key its own tone), 'same', 'off'
    length: C.defaultLength,
    recent: [],                                   // names logged in on this device, newest first
    intro: {}                                     // { game: true }: the rules do not open at the start
  };
  var saved = prefsStore.get();
  if (saved && typeof saved === 'object') {
    if (C.themes.indexOf(saved.theme) !== -1) prefs.theme = saved.theme;
    if (typeof saved.hue === 'number') prefs.hue = saved.hue;
    if (typeof saved.fontSize === 'number') prefs.fontSize = Math.min(C.font.max, Math.max(C.font.min, Math.round(saved.fontSize)));
    if (typeof saved.sound === 'boolean') prefs.sound = saved.sound;
    if (['phone', 'same', 'off'].indexOf(saved.keySound) !== -1) prefs.keySound = saved.keySound;
    var savedLen = saved.lengths && typeof saved.lengths === 'object' ? saved.lengths[GAME_ID] : null;
    if (C.lengths.indexOf(savedLen) !== -1) prefs.length = savedLen;
    if (Array.isArray(saved.recent)) prefs.recent = saved.recent.filter(function (n) { return typeof n === 'string' && n; }).slice(0, 20);
    if (saved.intro && typeof saved.intro === 'object') prefs.intro = saved.intro;
  }
  function rememberUser(name) {
    var k = String(name).toLowerCase();
    prefs.recent = [name].concat(prefs.recent.filter(function (n) { return n.toLowerCase() !== k; })).slice(0, 20);
    savePrefs();
  }
  // Theme, text size, sound and saved names are shared by both games; the length is kept per game.
  function savePrefs() {
    var cur = prefsStore.get();
    var out = cur && typeof cur === 'object' ? cur : {};
    var lengths = out.lengths && typeof out.lengths === 'object' ? out.lengths : {};
    for (var k in prefs) if (k !== 'length') out[k] = prefs[k];
    lengths[GAME_ID] = prefs.length;
    out.lengths = lengths;
    delete out.length;
    prefsStore.set(out);
  }

  var audio = new MBG.Audio.AudioService(C.sounds, { enabled: prefs.sound, spacing: C.hitSpacingMs, keys: prefs.keySound }).init();
  var lastWinScore = 0;                  // the win sound grows with the score
  var game = new MBG.Controller.GameController({
    users: users,
    lang: Shell.getLang(),                        // the language chosen on the home screen or in the other game
    length: prefs.length,
    access: Shell.access,                         // free week, daily free game, subscription
    gameId: GAME_ID,
    initialUser: Shell.getUser,
    askBeforeReveal: function () { return !!(MBG.Credits && !MBG.Credits.quoteReveal().free); },   // paid edition
    storagePersistent: localS.persistent
  });

  /* ----------------------------------------------------------- refs --- */
  var app = $('app'), log = $('log'), historyEl = $('history'), preview = $('preview');
  var lastTry = $('lastTry');
  var input = $('guess'), form = $('entryForm'), counter = $('counter'), hint = $('hint');
  var btn = {
    lang: $('btnLang'), help: $('btnHelp'), settings: $('btnSettings'),
    user: $('btnUser'), length: $('btnLength'),
    reveal: $('btnReveal'), quit: $('btnQuit'), submit: $('btnSubmit'), home: $('btnHome')
  };

  /* -------------------------------------------------------- helpers --- */
  function t(key, params) { return I.t(game.lang, key, params); }
  // 40,000 in English, Albanian and Arabic; 40.000 in Bosnian, German, Spanish, Turkish and Portuguese;
  // 40 000 in French and Polish.
  function fmt(n) { return MBG.AppText.num(game.lang, n); }
  // Capitals in the language's own way: Turkish i -> İ; German ß stays one letter (ẞ, not SS).
  function up(s) {
    s = String(s).replace(/ß/g, 'ẞ');
    try { return s.toLocaleUpperCase(game.lang); } catch (e) { return s.toUpperCase(); }
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function isTouchUI() {
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return coarse || window.innerWidth < 600;
  }
  function displayName(name) { return name === S.ANONYMOUS ? t('status.anonymous') : name; }

  /* ------------------------------------------------- board rendering --- */
  function tileRow(word, feedback, opts) {
    opts = opts || {};
    var row = el('div', 'guess' + (opts.won ? ' won' : ''));
    var letters = E.letters(word);
    row.style.setProperty('--len', letters.length);
    var num = el('span', 'attempt', opts.attempt != null ? String(opts.attempt) : '');
    var tiles = el('div', 'tiles');
    letters.forEach(function (ch, i) {
      var f = feedback ? feedback[i] : null;
      var cls = f === 'O' ? 'o' : f === '?' ? 'q' : f === 'X' ? 'x' : 'plain';
      var tile = el('span', 'tile ' + cls + (opts.animate && !reducedMotion ? ' anim' : ''));
      tile.style.setProperty('--i', i);
      tile.appendChild(el('span', 'ch', up(ch)));
      tile.appendChild(el('span', 'mk', f ? (opts.won ? '♥' : f) : ''));
      tiles.appendChild(tile);
    });
    num.setAttribute('aria-hidden', 'true');
    tiles.setAttribute('aria-hidden', 'true');
    row.appendChild(num);
    row.appendChild(tiles);
    if (feedback && opts.attempt != null) row.appendChild(el('span', 'sr-only', t('sr.guess', { attempt: opts.attempt, word: up(word), clues: feedback.join(' ') })));
    return row;
  }

  function legendList() {
    var ul = el('ul', 'legend');
    [['O', 'o', 'legend.O'], ['?', 'q', 'legend.Q'], ['X', 'x', 'legend.X']].forEach(function (r) {
      var li = el('li');
      var tile = el('span', 'tile sm ' + r[1]);
      tile.appendChild(el('span', 'mk', r[0]));
      tile.setAttribute('aria-hidden', 'true');
      li.appendChild(tile);
      li.appendChild(el('span', null, r[0] + ' = ' + t(r[2])));
      ul.appendChild(li);
    });
    return ul;
  }

  var pendingDailyReward = null;
  function renderWin(evt) {
    if (evt.daily && evt.dailyReward === undefined && pendingDailyReward && pendingDailyReward.n === evt.daily) {
      evt.dailyReward = pendingDailyReward;          // kept with the win, so it shows again after a restart
      pendingDailyReward = null;
    }
    var card = el('section', 'card win');
    var title = evt.userName ? t('win.titleName', { name: up(evt.userName) }) : t('win.title');
    card.appendChild(el('h2', 'win-title', title));
    var hearts = el('div', 'hearts');
    hearts.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < evt.length; i++) {
      var h = el('span', null, '❤️');
      h.style.setProperty('--i', i);
      hearts.appendChild(h);
    }
    card.appendChild(hearts);
    card.appendChild(el('p', null, t('win.found', { word: up(evt.word), attempts: evt.attempts, seconds: evt.seconds })));
    if (evt.firstTry) card.appendChild(el('p', 'luck', t('win.luck')));
    if (evt.hints > 0) card.appendChild(el('p', 'hintnote', t('win.hints', { n: evt.hints, k: E.SCORING.hintTries })));

    var line = el('p', 'scoreline');
    line.appendChild(el('span', 'score-label', t('score.label')));
    line.appendChild(el('span', 'num big', fmt(evt.score.total)));
    if (evt.newAllTime) line.appendChild(el('span', 'badge', t('score.newAllTime')));
    else if (evt.newBest) line.appendChild(el('span', 'badge', t('score.newBest')));
    card.appendChild(line);

    // "Your best" always; "All-time best" only when someone else holds it (no repeated numbers).
    var parts = [];
    parts.push(t('score.yourBest') + ' ' + (evt.stored ? fmt(evt.best) : t('score.notSaved')));
    var mine = evt.stored && evt.allTime && evt.allTime.name.toLowerCase() === String(evt.player || '').toLowerCase();
    if (evt.allTime && !mine) parts.push(t('score.allTime') + ' ' + fmt(evt.allTime.best) + ' (' + displayName(evt.allTime.name) + ')');
    card.appendChild(el('p', 'bests', parts.join(' · ')));
    var sl = Sheets.line(GAME_ID, { mode: evt.mode, name: evt.userName });
    if (sl) {
      var sp = el('p', 'statline');
      sp.appendChild(el('span', null, '📊 ' + sl + ' '));
      var sb = el('button', 'linkbtn', T('stats.open'));
      sb.type = 'button';
      sb.addEventListener('click', function () { openStats(); });
      sp.appendChild(sb);
      card.appendChild(sp);
    }
    if (evt.daily) card.appendChild(dailyBox(evt, true));
    var reward = rewardLine(evt);
    if (reward) card.appendChild(reward);
    card.appendChild(worldLine(evt));
    return card;
  }
  /** Hint credits earned by this win (or, playing anonymously, what a name would have earned). */
  function rewardLine(evt) {
    if (evt.reward > 0) return el('p', 'reward', T('credits.reward', { n: evt.reward, score: fmt(evt.score.total), total: evt.rewardTotal }));
    var could = MBG.Credits ? MBG.Credits.rewardFor(evt.score.total) : 0;
    if (could > 0 && evt.mode !== 'registered' && !evt.dailyReward) return el('p', 'reward muted', T('credits.rewardLogin', { n: could }));
    return null;
  }
  function rewardWin(evt) {
    var n = Credits.grantReward(evt.score.total, { mode: evt.mode, name: evt.userName });
    if (!n) return;
    evt.reward = n;
    evt.rewardTotal = Credits.status().total;
    var cards = log.querySelectorAll('.card.win');
    var card = cards[cards.length - 1];
    if (card) { var old = card.querySelector('.reward'); var line = rewardLine(evt); if (old) old.parentNode.replaceChild(line, old); else card.insertBefore(line, card.querySelector('.world-line')); }
    scheduleSave();
  }

  function renderReveal(evt) {
    var card = el('section', 'card reveal');
    card.appendChild(tileRow(evt.word, null, {}));
    var p = el('p', null, t('reveal.text') + ' · ' + t('score.label') + ' 0');
    card.appendChild(p);
    card.appendChild(el('span', 'sr-only', t('reveal.word', { word: up(evt.word) })));
    if (evt.daily) card.appendChild(dailyBox(evt, false));
    return card;
  }

  /* ----------------------------------------------------------- daily puzzle --- */
  // One puzzle a day, the same for everybody (MBG.Daily): free, once, on top of the free game.
  function dailyTitle() { return T(GAME_ID === 'word' ? 'daily.word' : 'daily.code'); }
  /** The result as coloured squares to share (no letters or digits). */
  function dailyShare(won) {
    var r = game.round;
    if (!r) return '';
    return Sheets.dailyMessage({ game: GAME_ID, title: dailyTitle(), n: r.daily, extra: GAME_ID === 'word' ? Shell.langName(r.lang) : '',
      won: won, tries: r.guesses.length, seconds: E.elapsedSeconds(r, r.endedAt), hints: (r.hints || []).length,
      streak: won ? Sheets.daily().streak(GAME_ID).cur : 0, rows: r.guesses.map(function (g) { return g.feedback; }) });
  }
  function dailyBox(evt, won) {
    var box = el('div', 'daily-box');
    box.appendChild(el('p', 'daily-head', '📅 ' + T(won ? 'daily.solved' : 'daily.over', { title: dailyTitle(), n: evt.daily })));
    // The reward: hint credits for solving it, a bonus at 3, 7, 14, 30 … days in a row.
    var rw = evt.dailyReward;
    if (rw) {
      box.appendChild(el('p', 'daily-reward', '🎁 ' + T('daily.reward', { n: rw.credits })));
      if (rw.bonus) box.appendChild(el('p', 'daily-reward bonus', '🔥 ' + T('daily.bonus', { days: rw.streak, n: rw.bonus })));
    } else if (!won) {
      box.appendChild(el('p', 'daily-reward', '🎁 ' + T('daily.rewardTomorrow', { n: Daily.REWARD })));
    }
    var st = Sheets.daily().streak(GAME_ID);
    if (st.cur > 1 && !(rw && rw.bonus)) box.appendChild(el('p', 'daily-streak', '🔥 ' + T('daily.streak', { n: st.cur })));
    if (rw && rw.next) box.appendChild(el('p', 'daily-nextbonus', T('daily.nextBonus', { days: rw.next.days, n: rw.next.credits, left: rw.next.days - rw.streak })));
    box.appendChild(el('p', 'daily-next', T('daily.next', { time: Shell.duration(Daily.msUntilNext()) })));
    if (game.round && game.round.daily === evt.daily) box.appendChild(Sheets.shareButtons(dailyShare(won)));
    return box;
  }
  function saveDaily() { var s = game.dailyState(); if (s) Sheets.daily().put(GAME_ID, s.lang, s); }
  /** Starts (or shows again) today's puzzle; Word Puzzle: the one of that language. */
  function startDailyFor(lang) {
    var n = Daily.dayNumber();
    var length = GAME_ID === 'word' ? Daily.wordLength(lang) : Daily.CODE_LENGTH;
    var secret = GAME_ID === 'word' ? Daily.wordFor(lang, n) : Daily.codeFor(n);
    return game.startDaily({ n: n, secret: secret, length: length }, Sheets.daily().get(GAME_ID, lang));
  }
  /** After the daily puzzle: a normal game, on the normal screen (an unfinished one carries on). */
  function leaveDaily() { saveDaily(); Shell.openGame(GAME_ID); }
  function askDailyGiveUp() {
    if (game.state !== 'playing') return;
    confirmDialog({ title: T('daily.giveUpTitle'), text: T('daily.giveUpText'), ok: T('daily.giveUpOk') })
      .then(function (ok) { if (ok && game.state === 'playing') game.reveal(); });
  }
  if (DAILY) setInterval(function () {
    Array.prototype.forEach.call(log.querySelectorAll('.daily-next'), function (p) {
      p.textContent = T('daily.next', { time: Shell.duration(Daily.msUntilNext()) });
    });
  }, 30000);
  function openStats() { Sheets.openStats({ game: GAME_ID }).then(function () { afterDialog(); }); }

  /** The rules open by themselves at the start, until the player ticks "Don't show at start". */
  function showIntro() {
    if (prefs.intro && prefs.intro[GAME_ID]) return;
    setTimeout(function () { if (!document.querySelector('dialog[open]') && game.state !== 'goodbye') openHelp(); }, 350);
  }

  /** Today's free game is played: when the next one starts, and the way to unlimited play. */
  function lockedText() {
    var s = Shell.access.status(GAME_ID);
    return T('lock.text', { game: Shell.gameName(GAME_ID), time: Shell.duration(s.msLeft || 0) });
  }
  function renderLocked() {
    var card = el('section', 'card locked');
    card.appendChild(el('h2', 'locked-title', T('lock.title')));
    card.appendChild(el('p', 'lock-text', lockedText()));
    var b = el('button', 'btn submit', T('btn.plans'));
    b.type = 'button';
    b.addEventListener('click', function () { openPaywall(); });
    card.appendChild(b);
    return card;
  }

  /** A hint on the board: every letter or digit shown by hints so far, in its place. */
  function hintRow(evt, compact) {
    var pattern = evt.pattern || [];
    var row = el('div', 'guess hintrow');
    row.style.setProperty('--len', pattern.length);
    var num = el('span', 'attempt', '💡');
    var tiles = el('div', 'tiles');
    pattern.forEach(function (ch, i) {
      var shown = ch != null;
      var tile = el('span', 'tile ' + (shown ? 'h' + (i === evt.index && !compact ? ' new' : '') : 'blank'));
      tile.appendChild(el('span', 'ch', shown ? up(ch) : ''));
      tile.appendChild(el('span', 'mk', ''));
      tiles.appendChild(tile);
    });
    num.setAttribute('aria-hidden', 'true');
    tiles.setAttribute('aria-hidden', 'true');
    row.appendChild(num);
    row.appendChild(tiles);
    if (!compact && evt.number) row.appendChild(el('span', 'sr-only', t('hint.shown', { number: evt.number, pos: evt.index + 1, ch: up(evt.ch) })));
    return row;
  }

  function renderEvent(evt, live) {
    switch (evt.type) {
      case 'guess': return tileRow(evt.word, evt.feedback, { attempt: evt.attempt, won: evt.won, animate: live });
      case 'win': return renderWin(evt);
      case 'reveal': return renderReveal(evt);
      case 'hint': return hintRow(evt);
      default: return null;
    }
  }

  function scrollToEnd() {
    requestAnimationFrame(function () { historyEl.scrollTop = historyEl.scrollHeight; });
  }

  function rerenderHistory() {
    var frag = document.createDocumentFragment();
    game.history.forEach(function (evt) {
      var node = renderEvent(evt, false);
      if (node) frag.appendChild(node);
    });
    log.textContent = '';
    log.appendChild(frag);
    if (game.state === 'locked') log.appendChild(renderLocked());
    updatePreview();
    scrollToEnd();
  }

  /* ------------------------------------------------ messages (short) --- */
  var toastTimer = null;
  function toast(msg, ms) {
    var tEl = $('toast');
    tEl.textContent = msg;
    tEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { tEl.hidden = true; }, ms || 1900);
  }

  function showHint(msg) {
    hint.textContent = msg;
    hint.hidden = false;
    if (!reducedMotion) {
      preview.classList.remove('shake');
      void preview.offsetWidth;                  // restart the animation
      preview.classList.add('shake');
    }
  }
  function clearHint() { if (!hint.hidden) { hint.hidden = true; hint.textContent = ''; } }

  function noticeText(evt) {
    var p = {};
    var src = evt.params || {};
    for (var k in src) p[k] = src[k];
    if (p.best != null) p.best = fmt(p.best);
    return t((evt.level === 'warn' ? 'warn.' : 'notice.') + evt.key, p);
  }

  /* -------------------------------------------- controller listener --- */
  game.on(function (evt) {
    switch (evt.type) {
      case 'round':
        log.textContent = '';
        clearHint();
        if (currentTheme === 'random') rollColour();
        updateLastTry(false);
        break;
      case 'result':
        Sheets.record(GAME_ID, evt);           // statistics (and the daily streak)
        if (evt.daily && evt.won) pendingDailyReward = Sheets.dailyReward(GAME_ID, evt);   // shown on the win card
        if (evt.daily) saveDaily();
        break;
      case 'guess':
      case 'win':
      case 'reveal':
        var node = renderEvent(evt, true);
        if (node) log.appendChild(node);
        if (evt.type === 'guess') { updateLastTry(true); setTimeout(keepLastTryInView, 60); armNudge(); }
        clearHint();
        scrollToEnd();
        if (evt.type === 'win') { lastWinScore = evt.score && evt.score.total; scheduleBackup(); sendToWorld(evt); rewardWin(evt); }
        if (evt.type === 'guess') {
          audio.playKeyFeedback(evt.feedback, evt.word).then(function (stillOn) {
            if (evt.won && stillOn) audio.playWin(lastWinScore);   // FR-AUD-007: text first, then the win sound for the score
          });
        }
        break;
      case 'hint':
        var hnode = renderEvent(evt, true);
        if (hnode) log.appendChild(hnode);
        clearHint();
        toast(t('hint.shown', { number: evt.number, pos: evt.index + 1, ch: up(evt.ch) }) +
          (evt.cost ? ' · ' + T('credits.spent', { n: evt.cost, left: Credits.status().total }) : ''), 3000);
        updatePreview();
        scrollToEnd();
        scheduleSave();
        break;
      case 'notice':
        if (evt.key === 'restored' && Shell.arrivedByNav) break;   // back from the home screen: no message needed
        if (evt.level === 'warn') showHint(noticeText(evt));
        else toast(noticeText(evt), evt.key === 'storageUnavailable' ? 4000 : 1900);
        break;
      case 'state':
        refreshAll();
        break;
      case 'user':
        if (evt.user && evt.user.mode === 'registered') { rememberUser(evt.user.name); scheduleBackup(); }
        Shell.setUser(evt.user);                   // the other game starts with the same user
        refreshAll();
        break;
      case 'locked':
        log.textContent = '';
        log.appendChild(renderLocked());
        clearHint();
        updateLastTry(false);
        scrollToEnd();
        break;
      case 'ui':
        // Open dialogs after the key press that typed the command has finished
        // (opening a modal during that Enter key confuses Chromium's text input).
        setTimeout(function () {
          if (evt.action === 'help') openHelp();
          if (evt.action === 'quit') requestQuit();
          if (evt.action === 'paywall') openPaywall();
          if (evt.action === 'reveal') askReveal();
          if (evt.action === 'leaveDaily') leaveDaily();
        }, 0);
        break;
      case 'goodbye': showGoodbye(); break;
    }
    scheduleSave();
  });

  /* ------------------------------------------------------- controls --- */
  function refreshControls() {
    var st = game.getStatus();
    root.lang = game.lang;
    root.dir = MBG.AppText.RTL.indexOf(game.lang) !== -1 ? 'rtl' : 'ltr';   // Arabic: right to left, the numbers stay left to right
    $('appName').textContent = t('app.title');
    $('appBy').textContent = t('app.by');
    $('wmName').textContent = t('app.title');
    $('wmBy').textContent = t('app.by');
    historyEl.setAttribute('aria-label', t('aria.history'));

    // Language: the round flags (the language in use in front); tap for the language sheet.
    if (btn.lang.getAttribute('data-lang') !== game.lang) MBG.LangMenu.paint(btn.lang, game.lang);
    btn.help.setAttribute('aria-label', t('btn.help'));
    btn.help.title = t('btn.help');
    btn.settings.setAttribute('aria-label', t('btn.settings'));
    btn.settings.title = t('btn.settings');

    // user button: "Log in" for Anonymous, otherwise the user's name
    var u = st.user || { mode: 'anonymous' };
    var label, who;
    if (u.mode === 'registered') { label = u.name; who = u.name; }
    else if (u.mode === 'nodata') { label = t('status.noData'); who = t('status.noData'); }
    else { label = t('btn.login'); who = t('status.anonymous'); }
    $('stUser').textContent = label;
    btn.user.classList.toggle('is-login', u.mode === 'anonymous');
    btn.user.setAttribute('aria-label', t('aria.user', { name: who }) + (u.mode === 'registered' ? '' : ' · ' + t('btn.login')));
    btn.user.title = t('btn.user') + ': ' + who;

    $('lenLabel').textContent = t('len.chip', { n: game.length });
    btn.length.setAttribute('aria-label', t('aria.length', { n: game.length }));
    if (DAILY && game.round) {
      $('lenLabel').textContent = '📅 #' + game.round.daily + ' · ' + t('len.chip', { n: game.round.length });
      btn.length.setAttribute('aria-label', dailyTitle() + ' #' + game.round.daily);
    }

    var newGame = st.state === 'roundEnd';
    btn.reveal.textContent = st.locked ? T('btn.plans') : newGame ? t('btn.newGame') : t('btn.reveal');
    if (DAILY) btn.reveal.textContent = newGame ? T('daily.normalGame') : T('daily.giveUp');
    btn.reveal.classList.toggle('is-new', newGame);
    btn.reveal.classList.toggle('is-plans', !!st.locked);
    btn.reveal.disabled = !(st.canReveal || st.canNewGame || st.locked);
    btn.home.setAttribute('aria-label', T('home.home'));
    btn.home.title = T('home.home');
    btn.quit.textContent = t('btn.quit');
    btn.submit.textContent = t('btn.submit');
    refreshHintButton();

    app.classList.toggle('touch-ui', isTouchUI());
  }

  function refreshPrompt() {
    var st = game.getStatus();
    var mode = st.inputMode;
    var label = $('promptLabel');
    app.classList.toggle('mode-play', mode === 'play');
    setKeypad(mode === 'play' ? 'numeric' : 'text');
    if (mode === 'play') {
      label.textContent = t('label.play', { n: st.roundLength });
      input.placeholder = t('ph.play', { n: st.roundLength });
    } else if (mode === 'yesno') {
      label.textContent = t('label.yesno');
      input.placeholder = t('ph.yesno');
      if (DAILY) { label.textContent = T('daily.yesno'); input.placeholder = T('daily.yesnoPh'); }
    } else if (mode === 'locked') {
      label.textContent = T('lock.title');
      input.placeholder = T('lock.placeholder', { time: Shell.duration(Shell.access.status(GAME_ID).msLeft || 0) });
    } else {
      label.textContent = '';
      input.placeholder = '';
    }
    input.readOnly = mode === 'locked';
    updatePreview();
  }

  var lastStatus = '';
  function refreshStatus() {
    var st = game.getStatus();
    var time = t('status.time', { n: st.elapsed });
    if (time === lastStatus) return;
    lastStatus = time;
    $('stTime').textContent = time;
  }

  function refreshTick() {
    var st = game.getStatus();
    if (st.clockRunning) audio.startTick(); else audio.stopTick();
  }

  function refreshAll() {
    lastStatus = '';
    refreshControls();
    refreshPrompt();
    refreshStatus();
    refreshTick();
  }

  /* ---------------------------------------------- input & preview --- */
  // Phones show the number keypad while guessing and the letter keyboard for Y / N after
  // a game. A keyboard only changes when the field is focused again, so an open keyboard
  // is closed and reopened at once (this happens inside the tap or key press that ended
  // or started the game, so phones allow it).
  function setKeypad(kind) {
    if (input.getAttribute('inputmode') === kind) return;
    input.setAttribute('inputmode', kind);
    if (kind === 'numeric') input.setAttribute('pattern', '[0-9]*'); else input.removeAttribute('pattern');
    if (document.activeElement === input && isTouchUI()) {
      input.blur();
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }
  }

  /* The latest try with its colours, right above the input: it stays in view while a phone
     keyboard is open, so the player never has to close the keyboard to see the result.
     Every earlier try is still on the board above. */
  var lastShown = '';
  function updateLastTry(animate) {
    var r = game.round;
    var gs = r && r.guesses && game.state !== 'locked' ? r.guesses : [];
    var hs = r && r.hints && game.state !== 'locked' && r.status === 'active' ? r.hints : [];
    var g = gs.length ? gs[gs.length - 1] : null;
    if (!g && !hs.length) {
      if (!lastTry.hidden) { lastTry.hidden = true; lastTry.textContent = ''; }
      lastShown = '';
      return;
    }
    var won = r.status === 'won';
    var key = gs.length + '|' + (g ? g.word : '') + '|' + won + '|' + hs.length + '|' + Shell.getLang();
    if (key === lastShown && !lastTry.hidden) return;
    lastShown = key;
    lastTry.textContent = '';
    if (g) {
      lastTry.appendChild(el('span', 'lt-label', t('last.try', { n: gs.length })));
      lastTry.appendChild(tileRow(g.word, g.feedback, { won: won, animate: animate }));
    }
    if (hs.length) {
      lastTry.appendChild(el('span', 'lt-label', '💡'));
      lastTry.appendChild(hintRow({ pattern: E.hintPattern(r) }, true));
    }
    lastTry.hidden = false;
  }
  /** While typing on a phone: make sure the latest try and the input right below it can be
   *  seen - also where the page is shown inside another app that only scrolls to the input. */
  function keepLastTryInView() {
    if (lastTry.hidden || document.activeElement !== input || !isTouchUI()) return;
    try { form.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* old browsers */ }
  }

  function updatePreview() {
    updateLastTry(false);
    refreshHintButton();
    var st = game.getStatus();
    var playing = st.inputMode === 'play' && game.round;
    var empty = !game.history.some(function (e) { return e.type === 'guess' || e.type === 'reveal'; });
    historyEl.classList.toggle('empty', !!(playing && empty));
    if (!playing) {
      counter.textContent = '';
      preview.hidden = true;
      return;
    }
    var raw = E.normalize(input.value, game.lang);
    var isCmd = !!E.parseCommand(raw, game.lang);
    var letters = isCmd ? [] : E.letters(raw);
    var n = letters.length;
    var len = game.round.length;
    counter.textContent = n + '/' + len;
    counter.className = 'counter' + (n === len ? ' ok' : n > len ? ' over' : '');
    preview.hidden = false;
    preview.textContent = '';
    preview.style.setProperty('--len', Math.max(len, n));
    var num = el('span', 'attempt', String(game.round.guesses.length + 1));
    var tiles = el('div', 'tiles');
    var shownByHint = E.hintPattern(game.round);
    for (var i = 0; i < Math.max(len, n); i++) {
      var ch = letters[i];
      var ghost = !ch && shownByHint[i] != null;
      var tile = el('span', 'tile' + (ch ? ' filled' : '') + (ghost ? ' ghost' : '') + (i >= len ? ' extra' : ''));
      tile.appendChild(el('span', 'ch', ch ? up(ch) : ghost ? up(shownByHint[i]) : ''));
      tile.appendChild(el('span', 'mk', '·'));
      tiles.appendChild(tile);
    }
    preview.appendChild(num);
    preview.appendChild(tiles);
    scrollToEnd();
  }

  /* ------------------------------------------------------------ hints --- */
  // After the 3rd try (Word Puzzle Expert: the 4th) a light-bulb button appears next to the input. A hint opens one
  // letter or digit at a random place the player has not found yet and is paid with hint
  // credits (MBG.Credits, js/app/credits.js): free ones first, then the player's own.
  var Credits = MBG.Credits;
  var hintBtn = $('btnHint'), hintBadge = $('hintBadge');
  function hintFrom() { return Credits.RULES.showAfterTries; }
  function hintVisible(info) { return info.ok && info.tries >= hintFrom(); }
  function refreshHintButton() {
    var info = game.hintInfo();
    var show = hintVisible(info);
    hintBtn.hidden = !show;
    app.classList.toggle('has-hint', show);
    if (!show) return;
    var s = Credits.status();
    hintBadge.textContent = s.total > 99 ? '99+' : String(s.total);
    hintBadge.className = 'hb-badge' + (s.total ? '' : ' empty');
    hintBadge.hidden = false;
    hintBtn.classList.toggle('used-up', info.left < 1);
    var label = t('hint.btn') + ' – ' + t('hint.what') + '. ' + T('credits.total', { n: s.total });
    hintBtn.setAttribute('aria-label', label);
    hintBtn.title = label;
  }
  Credits.onChange(function () { refreshHintButton(); });

  function useHint() {
    var info = game.hintInfo();
    if (!hintVisible(info)) return;
    if (info.left < 1) { game.hint(); return; }               // "no more hints" message
    var wasFocused = document.activeElement === input;
    var q = Credits.quoteHint(info.paidHints);
    var give = function (quote) {
      if (!Credits.spendHint(quote)) return;
      var r = game.hint({ paid: quote.source === 'own', cost: quote.cost });
      if (!r.ok) return;
      lastNudge = Date.now();
      hintBtn.classList.remove('wiggle');
      if (wasFocused) focusInput(true);
    };
    var steps = Credits.RULES.steps.slice(0, 6).join(', ');
    if (q.ok && (q.source === 'free' || q.cost === 1)) { give(q); return; }
    if (q.ok) {                                                // own credits, a dearer hint: ask first
      Credits.ask({
        title: t('hint.btn') + ' 💡', text: T('credits.hintCost', { n: q.cost, have: q.status.balance }),
        note: T('credits.hintCostNote', { steps: steps }),
        buttons: [{ id: 'no', label: T('hint.notNow') }, { id: 'yes', label: T('credits.use', { n: q.cost }), main: true }]
      }).then(function (a) { afterDialog(); if (a === 'yes') give(Credits.quoteHint(game.hintInfo().paidHints)); });
      return;
    }
    // Not enough credits.
    if (Shell.free) {
      showHint(T('credits.none', { time: Shell.duration(Math.max(0, q.status.nextFreeAt - Date.now())) }));
      return;
    }
    Credits.openSheet({ need: q.cost }).then(function () {
      afterDialog();
      var again = Credits.quoteHint(game.hintInfo().paidHints);
      if (again.ok && again.cost === q.cost) give(again);
    });
  }
  // Keep the phone keyboard open: the button does not take the focus away from the input.
  hintBtn.addEventListener('mousedown', function (e) { if (document.activeElement === input) e.preventDefault(); });
  hintBtn.addEventListener('click', useHint);

  // The button wiggles now and then to be noticed - the more tries fail, the more often.
  // Only while the player has credits for the next hint: it never leads to the shop.
  var NUDGE_MS = { 3: 16000, 4: 14000, 5: 10000, 6: 8000 };   // 7 or more wrong tries: every 6 seconds
  var lastNudge = 0;
  function nudgeDelay() {
    var info = game.hintInfo();
    if (!hintVisible(info) || info.left < 1 || !Credits.quoteHint(info.paidHints).ok) return 0;
    if (document.hidden || document.querySelector('dialog[open]')) return 0;
    var r = game.round;
    var since = r.hints && r.hints.length ? r.hints[r.hints.length - 1].atTry || 0 : 0;
    var wrong = r.guesses.length - since;
    return wrong < hintFrom() ? 0 : (NUDGE_MS[wrong] || 6000);
  }
  /** After a wrong try: the next wiggle comes 1.6 seconds later (when the tiles have turned). */
  function armNudge() {
    var d = nudgeDelay();
    if (d) lastNudge = Date.now() - d + 1600;
  }
  function tickNudge() {
    var d = nudgeDelay();
    hintBtn.classList.toggle('nudge', d > 0);
    if (!d || reducedMotion || Date.now() - lastNudge < d) return;
    lastNudge = Date.now();
    hintBtn.classList.remove('wiggle');
    void hintBtn.offsetWidth;                               // restart the animation
    hintBtn.classList.add('wiggle');
  }
  hintBtn.addEventListener('animationend', function () { hintBtn.classList.remove('wiggle'); });
  setInterval(tickNudge, 500);

  function focusInput(force) {
    if (game.state === 'goodbye') return;
    if (isTouchUI() && !force) return;     // FR-UI-006: do not pop the phone keyboard needlessly
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }

  function submitText(value) {
    audio.unlock();
    armBackTrap();
    var wasFocused = document.activeElement === input;
    game.input(value);
    input.value = '';
    updatePreview();
    if (wasFocused || !isTouchUI()) focusInput(true);
  }

  // Enter and the Submit button are handled directly, so the game also works where a
  // page is not allowed to submit forms (some embedded or sandboxed views).
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      submitText(input.value);
    }
  });
  btn.submit.addEventListener('click', function (e) {
    e.preventDefault();
    submitText(input.value);
  });
  form.addEventListener('submit', function (e) {   // fallback (e.g. "Go" on some phone keyboards)
    e.preventDefault();
    submitText(input.value);
  });
  // Every digit typed beeps like a key of a push-button phone (its own tone per digit).
  var typedBefore = '';
  input.addEventListener('input', function (e) {
    var now = E.normalize(input.value, game.lang);
    var typed = e && typeof e.inputType === 'string' ? /^insert/.test(e.inputType) : now.length > typedBefore.length;
    if (typed && game.state === 'playing') {
      var pos = Math.min(now.length, Math.max(1, input.selectionStart || now.length)) - 1;   // the digit just typed
      var d = /[0-9]/.test(now.charAt(pos)) ? now.charAt(pos) : now.slice(-1);
      if (/[0-9]/.test(d)) { audio.unlock(); audio.keyTone(d); }
    }
    typedBefore = now;
    clearHint();
    updatePreview();
  });
  // Keep the phone keyboard open when Submit is tapped while typing.
  btn.submit.addEventListener('pointerdown', function (e) {
    if (document.activeElement === input) e.preventDefault();
  });

  /* -------------------------------------------------------- dialogs --- */
  // Dialog buttons close their dialog directly (instead of relying on form submission).
  Array.prototype.forEach.call(document.querySelectorAll('dialog form[method="dialog"] button'), function (b) {
    b.addEventListener('click', function (e) {
      var d = b.closest('dialog');
      if (!d) return;
      e.preventDefault();
      closeDialog(d, b.value || '');
    });
  });

  function closeDialog(d, value) {
    try { d.close(value || ''); } catch (err) { d.removeAttribute('open'); }
  }

  function openDialog(d) {
    if (typeof d.showModal === 'function') {
      try { d.showModal(); return; } catch (e) { /* fall through */ }
    }
    d.setAttribute('open', '');
  }

  function onClose(d, fn) {
    d.addEventListener('close', function handler() {
      d.removeEventListener('close', handler);
      fn(d.returnValue);
    });
  }

  function afterDialog() {
    refreshAll();
    // The browser hands focus back to the input when a dialog closes. Re-focusing it
    // fresh on the next tick keeps typing reliable on computers (Chromium can otherwise
    // drop key presses after a mouse-closed dialog) and, on phones, the blur keeps the
    // on-screen keyboard from popping up again after every dialog (FR-UI-006).
    setTimeout(function () {
      if (document.activeElement === input) input.blur();
      focusInput(false);
    }, 0);
  }

  var confirmBusy = false;
  function confirmDialog(o) {
    var d = $('dlgConfirm');
    $('cfTitle').textContent = o.title;
    $('cfText').textContent = o.text;
    $('cfOk').textContent = o.ok;
    $('cfCancel').textContent = t('dlg.cancel');
    d.returnValue = '';
    confirmBusy = true;
    return new Promise(function (resolve) {
      onClose(d, function (value) {
        confirmBusy = false;
        resolve(value === 'ok');
        afterDialog();
      });
      openDialog(d);
      $('cfCancel').focus();
    });
  }

  /**
   * Quit, the quit command, N after a game and the Back button: back to the game list.
   * An unfinished game is saved and continues when the player comes back; a finished
   * one is not kept, so the next visit starts a new game.
   */
  var discardSession = false;
  function requestQuit() {
    if (Shell.isLeaving()) return;
    if (game.state !== 'playing') discardSession = true;
    saveNow();
    Shell.goHome();
  }

  /* ---------------------------------------------------- login / user --- */
  var loginPending = null;   // name waiting for "Create"
  function setLoginMessage(msg) {
    var m = $('lgMsg');
    m.textContent = msg || '';
    m.hidden = !msg;
  }
  function setLoginSubmit() {
    $('lgSubmit').textContent = loginPending ? t('login.create', { name: loginPending }) : t('login.submit');
  }

  function openLogin() {
    var u = game.user || { mode: 'anonymous' };
    if (u.mode === 'registered') return openAccount();
    var d = $('dlgLogin');
    $('lgTitle').textContent = t('login.title');
    $('lgLede').textContent = t('login.lede');
    var count = renderSaved();
    $('lgLabel').textContent = count ? t('login.other') : t('login.label');
    $('lgCancel').textContent = t('dlg.cancel');
    $('lgAlt').textContent = u.mode === 'nodata' ? t('login.anonymous') : t('login.noData');
    $('lgName').value = '';
    loginPending = null;
    setLoginSubmit();
    setLoginMessage('');
    onClose(d, function () { afterDialog(); });
    openDialog(d);
    // With saved names, the list comes first (no keyboard needed); otherwise type a name.
    setTimeout(function () {
      try { if (count) $('lgSaved').firstChild.focus(); else $('lgName').focus(); } catch (e) { /* ignore */ }
    }, 30);
  }

  /** The names already saved on this device, most recently used first. Tap = log in. */
  function savedUsers() {
    var anon = S.ANONYMOUS.toLowerCase();
    var list = users.list().filter(function (u) { return u.name.toLowerCase() !== anon; });
    var rank = function (u) {
      var i = prefs.recent.map(function (n) { return n.toLowerCase(); }).indexOf(u.name.toLowerCase());
      return i === -1 ? 1e6 : i;
    };
    return list.sort(function (a, b) { return rank(a) - rank(b) || a.name.localeCompare(b.name); });
  }

  function renderSaved() {
    var list = savedUsers();
    var box = $('lgSaved');
    box.textContent = '';
    $('lgSavedLabel').textContent = t('login.saved');
    list.forEach(function (u) {
      var b = el('button', 'saved-user');
      b.type = 'button';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5"/></svg>';
      b.appendChild(el('span', 'nm', u.name));
      b.appendChild(el('span', 'sc', fmt(u.best)));
      b.setAttribute('aria-label', t('login.pick', { name: u.name, best: fmt(u.best) }));
      b.addEventListener('click', function () {
        var res = game.login(u.name);
        if (res.ok) closeDialog($('dlgLogin'));
      });
      box.appendChild(b);
    });
    $('lgSavedWrap').hidden = list.length === 0;
    return list.length;
  }

  function submitLogin() {
    var name = $('lgName').value;
    var res;
    if (loginPending && E.normalize(name) === E.normalize(loginPending)) res = game.register(name);
    else res = game.login(name);
    if (res.ok) { closeDialog($('dlgLogin')); return; }
    loginPending = null;
    if (res.reason === 'unknown') { loginPending = res.name; setLoginMessage(t('login.unknown', { name: res.name })); }
    else if (res.reason === 'empty') setLoginMessage(t('login.empty'));
    else if (res.reason === 'reserved') setLoginMessage(t('login.reserved', { name: res.name }));
    else if (res.reason === 'exists') { res = game.login(res.name); if (res.ok) { closeDialog($('dlgLogin')); return; } }
    else setLoginMessage(t('login.invalid'));
    setLoginSubmit();
    try { $('lgName').focus(); } catch (e) { /* ignore */ }
  }

  $('lgSubmit').addEventListener('click', function (e) { e.preventDefault(); submitLogin(); });
  $('lgName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submitLogin(); }
  });
  $('lgName').addEventListener('input', function () {
    if (loginPending && E.normalize($('lgName').value) !== E.normalize(loginPending)) { loginPending = null; setLoginSubmit(); setLoginMessage(''); }
  });
  $('lgCancel').addEventListener('click', function () { closeDialog($('dlgLogin')); });
  $('lgAlt').addEventListener('click', function () {
    if ((game.user || {}).mode === 'nodata') game.logout(); else game.playWithoutSaving();
    closeDialog($('dlgLogin'));
  });

  function openAccount() {
    var d = $('dlgAccount');
    var f = users.find(game.user.name);
    $('acName').textContent = game.user.name;
    $('acBest').textContent = t('account.best', { best: fmt(f ? f.best : 0) }) + ' · 💡 ' + T('credits.total', { n: Credits.status().total });
    $('acClose').textContent = t('btn.close');
    $('acLogout').textContent = t('btn.logout');
    onClose(d, function () { afterDialog(); });
    openDialog(d);
    $('acClose').focus();
  }
  $('acClose').addEventListener('click', function () { closeDialog($('dlgAccount')); });
  $('acLogout').addEventListener('click', function () { game.logout(); closeDialog($('dlgAccount')); });

  /* ------------------------- backup of saved names (live link only) --- */
  // On the published claude.ai page, names and best scores are also kept in the viewer's
  // own private storage there (db capability), so they survive cleared browser storage.
  // Anywhere else (GitHub Pages, the downloaded file) window.claude does not exist and
  // only this browser's storage is used.
  var backup = { ref: null, busy: false, again: false, last: null, timer: null };
  function backupBody() { return { users: users.exportText(), recent: prefs.recent.slice(0, 20), v: 1 }; }
  function pushBackup() {
    if (!backup.ref) return;
    var body = backupBody();
    var key = JSON.stringify(body);
    if (key === backup.last) return;                 // nothing changed
    if (backup.busy) { backup.again = true; return; }  // one write at a time
    backup.busy = true;
    backup.ref.set(body).then(function () { backup.last = key; }, function () { backup.ref = null; })
      .then(function () {
        backup.busy = false;
        if (backup.again) { backup.again = false; pushBackup(); }
      });
  }
  function scheduleBackup() {
    if (!backup.ref) return;
    clearTimeout(backup.timer);
    backup.timer = setTimeout(pushBackup, 800);
  }
  function startBackup() {
    var c = window.claude;
    if (!c || typeof c.use !== 'function') return;
    Promise.all([c.use('db'), c.use('user')]).then(function (r) {
      var db = r[0], who = r[1];
      if (!db || !who || typeof who.id !== 'function') return null;
      return who.id().then(function (id) {
        if (!id) return null;
        var ref = db.doc('data/users/' + id + '/' + (C.backupDoc || 'mastermind'));
        return ref.get().then(function (snap) {
          var d = snap && snap.exists ? snap.data() : null;
          if (d && typeof d.users === 'string') users.mergeText(d.users);
          if (d && Array.isArray(d.recent)) {
            var have = prefs.recent.map(function (n) { return n.toLowerCase(); });
            d.recent.forEach(function (n) {
              if (typeof n === 'string' && n && have.indexOf(n.toLowerCase()) === -1) { prefs.recent.push(n); have.push(n.toLowerCase()); }
            });
            prefs.recent = prefs.recent.slice(0, 20);
            savePrefs();
          }
          if (d) backup.last = JSON.stringify({ users: d.users, recent: d.recent, v: d.v });
          backup.ref = ref;
          if ($('dlgLogin').open) renderSaved();
          // Names this browser knows that the backup lacks are written once.
          if (users.list().some(function (u) { return u.best > 0 || u.name.toLowerCase() !== S.ANONYMOUS.toLowerCase(); })) scheduleBackup();
        });
      });
    }).catch(function () { /* the backup is optional */ });
  }

  /* -------------------------------------------------------- settings --- */
  function refreshSettings() {
    $('setTitle').textContent = t('settings.title');
    $('btnPlan').hidden = Shell.free;          // the free edition has no plans
    $('btnCredits').querySelector('.lbl').textContent = T('credits.title').replace('💡 ', '');
    $('creditsVal').textContent = T('credits.total', { n: Credits.status().total });
    $('btnWorld').hidden = !(World && World.enabled());
    $('btnWorld').querySelector('.lbl').textContent = T('world.settings');
    $('worldVal').textContent = World && World.enabled() ? World.statusText() : '';
    $('btnStats').querySelector('.lbl').textContent = T('stats.title');
    $('btnMove').querySelector('.lbl').textContent = T('move.title');
    $('btnPlan').querySelector('.lbl').textContent = T('plan.label');
    $('planVal').textContent = planSummary();
    $('setClose').textContent = t('btn.close');
    $('lblSound').textContent = t('settings.sound');
    $('swSound').setAttribute('aria-checked', prefs.sound ? 'true' : 'false');
    $('lblKeys').textContent = T('settings.keys');
    $('hintKeys').textContent = T('settings.keysHint');
    [['keysPhone', 'phone'], ['keysSame', 'same'], ['keysOff', 'off']].forEach(function (k) {
      var b = $(k[0]);
      b.textContent = T('settings.keys' + k[1].charAt(0).toUpperCase() + k[1].slice(1));
      b.setAttribute('aria-checked', prefs.keySound === k[1] ? 'true' : 'false');
      b.classList.toggle('on', prefs.keySound === k[1]);
    });
    $('btnTheme').querySelector('.lbl').textContent = t('btn.theme');
    $('themeName').textContent = t('theme.' + currentTheme);
    $('lblFont').textContent = t('settings.textSize');
    $('fontVal').textContent = prefs.fontSize + ' px';
    $('btnFontDown').setAttribute('aria-label', t('aria.fontDown'));
    $('btnFontUp').setAttribute('aria-label', t('aria.fontUp'));
    $('btnFontDown').disabled = prefs.fontSize <= C.font.min;
    $('btnFontUp').disabled = prefs.fontSize >= C.font.max;
  }

  function openSettings() {
    var d = $('dlgSettings');
    refreshSettings();
    onClose(d, function () { afterDialog(); });
    openDialog(d);
    $('setClose').focus();
  }

  [['keysPhone', 'phone'], ['keysSame', 'same'], ['keysOff', 'off']].forEach(function (k) {
    $(k[0]).addEventListener('click', function () {
      prefs.keySound = k[1];
      audio.unlock();
      audio.setKeys(k[1]);
      audio.keySample();                 // let the player hear the choice
      savePrefs();
      refreshSettings();
    });
  });
  $('swSound').addEventListener('click', function () {
    prefs.sound = !prefs.sound;
    audio.unlock();
    audio.setEnabled(prefs.sound);       // off: stops tick-tock and queued sounds at once
    savePrefs();
    refreshSettings();
    refreshTick();
  });

  /* ----------------------------------------------------------- help --- */
  function table(head, rows) {
    var wrap = el('div', 'tablewrap');
    var tb = el('table');
    var thead = el('thead'), tr = el('tr');
    head.forEach(function (h) { tr.appendChild(el('th', null, h)); });
    thead.appendChild(tr);
    tb.appendChild(thead);
    var body = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr');
      r.forEach(function (c) { row.appendChild(el('td', null, c)); });
      body.appendChild(row);
    });
    tb.appendChild(body);
    wrap.appendChild(tb);
    return wrap.outerHTML;
  }

  function openHelp() {
    var d = $('dlgHelp');
    if (d.open) return;
    $('helpTitle').textContent = t('help.title');
    $('helpClose').textContent = t('btn.close');
    var rows = C.lengths.map(function (n) {
      var a = E.SCORE_ANCHORS[n];
      return I.t(game.lang, 'help.scoreRow', {
        length: n, hiScore: fmt(a.high.score), hiAttempt: a.high.attempt, loScore: fmt(a.low.score), loAttempt: a.low.attempt
      });
    });
    var body = $('helpBody');
    body.innerHTML = t('help.html', {
      legend: legendList().outerHTML,
      scoreTable: table(t('help.scoreHead'), rows),
      commandTable: table(t('help.cmdHead'), t('help.cmdRows'))
    });
    if (!Shell.free) {
      body.appendChild(el('h3', null, T('help.planTitle')));
      body.appendChild(el('p', null, T('help.plan')));
      body.appendChild(el('p', null, T('help.hintsPaid')));
    }
    body.appendChild(el('h3', null, '📅 ' + T('help.dailyTitle')));
    body.appendChild(el('p', null, T(GAME_ID === 'word' ? 'help.dailyWord' : 'help.dailyCode')));
    body.appendChild(el('p', null, '🎁 ' + T('help.dailyReward', { n: Daily.REWARD, list: Credits.bonusList() })));
    body.appendChild(el('h3', null, '📊 ' + T('stats.title')));
    body.appendChild(el('p', null, T('help.stats')));
    body.appendChild(el('h3', null, t('help.about')));
    var about = el('div', 'about');
    about.appendChild(el('p', null, t('about.version')));
    about.appendChild(el('p', null, t('about.numbers', {
      min: fmt(E.possibleCount(E.MIN_LEN)), max: fmt(E.possibleCount(E.MAX_LEN))
    })));
    about.appendChild(el('p', null, t(Shell.free ? 'about.privacyFree' : 'about.privacy')));
    var priv = el('a', 'linkbtn', T('home.privacy'));
    priv.href = 'privacy.html';
    priv.addEventListener('click', function (e) { e.preventDefault(); saveNow(); closeDialog(d); window.location.href = 'privacy.html'; });
    about.appendChild(priv);
    body.appendChild(about);
    onClose(d, function () { afterDialog(); });
    openDialog(d);
    body.scrollTop = 0;
    $('lblIntro').textContent = T('intro.dontShow');
    $('optIntro').checked = !!prefs.intro[GAME_ID];
    $('helpClose').focus();
  }

  /* -------------------------------------------- number-length wheel --- */
  var wheel = $('wheel');
  var ROW = 48;
  var wheelValue = null;
  var wheelRaf = 0;

  function buildWheel() {
    wheel.textContent = '';
    wheel.appendChild(el('div', 'wheel-pad'));
    C.lengths.forEach(function (n) {
      var item = el('div', 'wheel-item', t('wheel.item', { n: n }));
      item.setAttribute('role', 'option');
      item.id = 'wheel-' + n;
      item.dataset.value = String(n);
      if (n !== game.length) item.setAttribute('aria-label', t('btn.length', { n: n }));
      item.addEventListener('click', function () {
        // A tap or click on a length picks it straight away.
        wheelValue = n;
        scrollWheelTo(n, false);
        closeDialog($('dlgWheel'), 'ok');
      });
      wheel.appendChild(item);
    });
    wheel.appendChild(el('div', 'wheel-pad'));
  }

  function wheelIndex() { return Math.max(0, Math.min(C.lengths.length - 1, Math.round(wheel.scrollTop / ROW))); }

  function paintWheel() {
    wheelRaf = 0;
    var center = wheel.scrollTop / ROW;
    var idx = wheelIndex();
    wheelValue = C.lengths[idx];
    Array.prototype.forEach.call(wheel.querySelectorAll('.wheel-item'), function (item, i) {
      var d = i - center;
      var ad = Math.min(Math.abs(d), 3);
      item.style.transform = 'rotateX(' + (-d * 20) + 'deg) scale(' + (1 - ad * 0.08) + ')';
      item.style.opacity = String(Math.max(0.2, 1 - ad * 0.3));
      item.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
    wheel.setAttribute('aria-activedescendant', 'wheel-' + wheelValue);
  }

  function scrollWheelTo(n, smooth) {
    var i = C.lengths.indexOf(n);
    if (i < 0) return;
    if (smooth && !reducedMotion && wheel.scrollTo) wheel.scrollTo({ top: i * ROW, behavior: 'smooth' });
    else wheel.scrollTop = i * ROW;
    paintWheel();
  }

  wheel.addEventListener('scroll', function () { if (!wheelRaf) wheelRaf = requestAnimationFrame(paintWheel); }, { passive: true });
  wheel.addEventListener('keydown', function (e) {
    var i = wheelIndex();
    if (e.key === 'ArrowDown') { e.preventDefault(); scrollWheelTo(C.lengths[Math.min(C.lengths.length - 1, i + 1)], true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); scrollWheelTo(C.lengths[Math.max(0, i - 1)], true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeDialog($('dlgWheel'), 'ok'); }
  });

  function openWheel() {
    var d = $('dlgWheel');
    $('wheelTitle').textContent = t('wheel.title');
    $('wheelDone').textContent = t('wheel.done');
    $('wheelCancel').textContent = t('dlg.cancel');
    buildWheel();
    d.returnValue = '';
    onClose(d, function (value) {
      var chosen = wheelValue;
      if (value === 'ok' && chosen && chosen !== game.length) applyLength(chosen);
      else afterDialog();
    });
    openDialog(d);
    requestAnimationFrame(function () { scrollWheelTo(game.length, false); wheel.focus({ preventScroll: true }); });
  }

  /* --------------------------------------------------- mode changes --- */
  function applyLength(n) {
    var r = game.setLength(n);
    var done = function () {
      prefs.length = game.length;
      savePrefs();
      refreshAll();
      focusInput(false);
    };
    if (r === 'confirm') {
      confirmDialog({ title: t('restart.title'), text: t('restart.length', { n: n }) + freeWarning(), ok: t('restart.ok') })
        .then(function (ok) { if (ok) game.setLength(n, { confirmed: true }); done(); });
    } else done();
  }

  // Numbers are the same in both languages: switching keeps the current game and
  // redraws the board and its result card in the new language.
  function applyLanguage(target) {
    if (target === game.lang) return;
    game.setLanguage(target);
    Shell.setLang(game.lang);
    rerenderHistory();
    refreshAll();
    focusInput(false);
  }

  /* ------------------------------------------- theme, font & sound --- */
  function initialTheme() {
    if (prefs.theme) return prefs.theme;
    var dark = root.getAttribute('data-theme') === 'dark' ||
      (root.getAttribute('data-theme') !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return dark ? 'dark' : 'light';
  }
  var currentTheme = initialTheme();
  function applyTheme(name) {
    currentTheme = name;
    Shell.applySkin(name, prefs.hue);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#16202B');
  }
  /** "Random colours": a new soft colour (also at the start of every new game). */
  function rollColour() {
    prefs.hue = Shell.newHue(prefs.hue);
    savePrefs();
    applyTheme('random');
  }
  function applyFont() { root.style.setProperty('--fs', prefs.fontSize + 'px'); }

  $('btnTheme').addEventListener('click', function () {
    var i = C.themes.indexOf(currentTheme);
    var next = C.themes[(i + 1) % C.themes.length];
    prefs.theme = next;
    if (next === 'random') rollColour(); else applyTheme(next);
    savePrefs();
    refreshSettings();
  });

  function changeFont(delta) {
    var v = prefs.fontSize + delta;
    if (v > C.font.max) { toast(t('toast.fontMax')); return; }
    if (v < C.font.min) { toast(t('toast.fontMin')); return; }
    prefs.fontSize = v;
    applyFont();
    savePrefs();
    refreshSettings();
    scrollToEnd();
  }
  $('btnFontUp').addEventListener('click', function () { changeFont(1); });
  $('btnFontDown').addEventListener('click', function () { changeFont(-1); });

  btn.lang.addEventListener('click', function () {
    audio.unlock();
    MBG.LangMenu.open(game.lang).then(function (l) {
      // Apply after the sheet has closed (the word game may ask to confirm first).
      setTimeout(function () { if (l) applyLanguage(l); else afterDialog(); }, 0);
    });
  });
  btn.help.addEventListener('click', function () { openHelp(); });
  btn.settings.addEventListener('click', function () { audio.unlock(); openSettings(); });
  btn.user.addEventListener('click', function () { openLogin(); });
  btn.length.addEventListener('click', function () {
    if (DAILY) { toast(T('daily.lengthNote', { n: game.round ? game.round.length : '' }), 2600); return; }
    openWheel();
  });
  btn.reveal.addEventListener('click', function () {
    audio.unlock();
    if (DAILY && game.state === 'playing') { askDailyGiveUp(); return; }
    if (game.state === 'playing' && !Credits.quoteReveal().free) { askReveal(); return; }
    var wasNew = game.state === 'roundEnd';
    game.revealOrNewGame();
    focusInput(wasNew && game.state === 'playing');
  });
  /** Paid edition: seeing the answer is bought (or a new game is started without it, for free). */
  function askReveal() {
    if (game.state !== 'playing') return;
    if (DAILY) { askDailyGiveUp(); return; }
    var q = Credits.quoteReveal();
    if (q.free) { game.reveal(); return; }
    var buttons = [{ id: 'no', label: T('hint.notNow') }, { id: 'new', label: T('reveal.newGame') },
      q.ok ? { id: 'use', label: T('reveal.use', { n: q.cost }), main: true } : { id: 'buy', label: T('reveal.buy'), main: true }];
    Credits.ask({ title: T('reveal.buyTitle'), text: T('reveal.buyText', { what: t('reveal.what'), n: q.cost, have: q.status.total }), buttons: buttons })
      .then(function (a) {
        afterDialog();
        if (game.state !== 'playing') return;
        if (a === 'use' && Credits.spendReveal(Credits.quoteReveal())) game.reveal();
        else if (a === 'new') game.giveUp();
        else if (a === 'buy') Credits.openSheet({ need: q.cost }).then(function () { afterDialog(); });
      });
  }
  btn.quit.addEventListener('click', function () { requestQuit(); });

  /* ---------------------------------------------------- world top 20 --- */
  // Wins of logged-in players go to the world list (MBG.World) once they have joined it.
  // The result is kept on the win event, so the line survives a language change or a restart.
  var World = MBG.World;
  function worldLine(evt) {
    var box = el('div', 'world-line');
    box.setAttribute('data-world', String(evt.id || ''));
    var w = evt.world;
    if (!World || !World.enabled() || !w) return box;
    var link = function (label, fn) {
      var b = el('button', 'linkbtn', label);
      b.type = 'button';
      b.addEventListener('click', fn);
      return b;
    };
    var place = function (r) { return World.rankText(r, T); };
    if (w.status === 'sent' && w.ranks && w.ranks.day) {
      box.appendChild(el('span', null, '🏆 ' + T('world.winDay', { day: place(w.ranks.day) })));
      box.appendChild(link(T('world.winOpen'), function () { openWorld('day'); }));
    } else if (w.status === 'sent' && w.ranks && w.ranks.week && w.ranks.all) {
      box.appendChild(el('span', null, '🏆 ' + T('world.winRank', { week: place(w.ranks.week), all: place(w.ranks.all) })));
      box.appendChild(link(T('world.winOpen'), function () { openWorld(); }));
    } else if (w.status === 'kept') {
      box.appendChild(el('span', 'muted', T('world.winKept', { best: MBG.AppText.num(game.lang, w.best) })));
      box.appendChild(link(T('world.winOpen'), function () { openWorld(); }));
    } else if (w.status === 'not-joined') {
      box.appendChild(link('🏆 ' + T('world.winJoin'), function () { joinWorld(evt); }));
    } else if (w.status === 'anonymous') {
      box.appendChild(link('🏆 ' + T('world.winLogin'), function () { openLogin(); }));
    } else if (w.status === 'queued') {
      box.appendChild(el('span', 'muted', T('world.winQueued')));
    } else if (w.status === 'name') {
      box.appendChild(el('span', 'muted', T('world.winName')));
    } else {
      box.appendChild(link('🏆 ' + T('world.winOpen'), function () { openWorld(evt.daily ? 'day' : null); }));
    }
    return box;
  }
  function updateWorldLine(evt) {
    var old = log.querySelector('.world-line[data-world="' + String(evt.id || '') + '"]');
    if (old) old.parentNode.replaceChild(worldLine(evt), old);
    scheduleSave();
  }
  function sendToWorld(evt) {
    if (!World || !World.enabled()) return;
    evt.worldRef = evt.worldRef || (GAME_ID + '-' + Date.now() + '-' + (evt.id || 0));
    World.submit({
      ref: evt.worldRef, game: GAME_ID, user: { mode: evt.mode, name: evt.userName }, length: evt.length,
      lang: game.lang, attempts: evt.attempts, hints: evt.hints || 0, seconds: evt.seconds,
      score: evt.score ? evt.score.total : 0, daily: evt.daily || null
    }).then(function (res) { evt.world = res; updateWorldLine(evt); });
  }
  function joinWorld(evt) {
    World.openJoin(evt.userName).then(function (ok) {
      afterDialog();
      if (!ok) return;
      evt.world = { status: 'queued' };
      updateWorldLine(evt);
      World.sendPending(evt.userName, evt.worldRef).then(function (res) { evt.world = res; updateWorldLine(evt); });
    });
  }
  function openWorld(period) {
    var o = { game: GAME_ID, period: period || (DAILY ? 'day' : 'week') };
    if (GAME_ID === 'word') o.lang = o.period === 'day' ? game.lang : '';
    World.openBoard(o).then(function () { afterDialog(); });
  }
  $('btnCredits').addEventListener('click', function () {
    closeDialog($('dlgSettings'));
    Credits.openSheet({}).then(function () { afterDialog(); });
  });
  $('btnStats').addEventListener('click', function () { closeDialog($('dlgSettings')); setTimeout(openStats, 0); });
  $('btnMove').addEventListener('click', function () {
    closeDialog($('dlgSettings'));
    setTimeout(function () { saveNow(); Sheets.openTransfer().then(function () { afterDialog(); }); }, 0);
  });
  $('optIntro').addEventListener('change', function () { prefs.intro[GAME_ID] = $('optIntro').checked; savePrefs(); });
  $('btnWorld').addEventListener('click', function () {
    closeDialog($('dlgSettings'));
    setTimeout(function () { World.toggle().then(function () { afterDialog(); }); }, 0);
  });

  /* ------------------------------------- home, plans and the free game --- */
  btn.home.addEventListener('click', function () { requestQuit(); });

  function openPaywall() {
    if (MBG.Paywall.isOpen()) return;
    Array.prototype.forEach.call(document.querySelectorAll('dialog[open]'), function (d) { closeDialog(d); });
    MBG.Paywall.open({ game: GAME_ID }).then(function () {
      game.recheckAccess();
      afterDialog();
    });
  }

  function planSummary() {
    var s = Shell.access.status(GAME_ID);
    if (s.mode === 'subscribed') return T('plan.sub');
    if (s.mode === 'trial') return T('plan.trial', { daysLeft: s.daysLeft });
    return T('plan.free');
  }

  $('btnPlan').addEventListener('click', function () {
    closeDialog($('dlgSettings'));
    setTimeout(openPaywall, 0);
  });

  /** Once a second: the countdown on the "free game played" card, and unlocking when allowed. */
  function accessTick() {
    if (game.state !== 'locked') return;
    if (Shell.access.canStart(GAME_ID)) {
      if (game.recheckAccess()) { toast(Shell.access.isSubscribed() ? T('plan.sub') : T('lock.ready')); focusInput(false); }
      return;
    }
    var p = log.querySelector('.lock-text');
    if (p) p.textContent = lockedText();
    input.placeholder = T('lock.placeholder', { time: Shell.duration(Shell.access.status(GAME_ID).msLeft || 0) });
  }
  setInterval(accessTick, 1000);
  MBG.Billing.onChange(function () {
    if (game.recheckAccess()) focusInput(false);
    refreshAll();
  });

  /** Changing the length (or the word language) ends a game; on the free plan that game was today's. */
  function freeWarning() {
    var s = Shell.access.status(GAME_ID);
    return s.mode === 'free' && game.round && game.round.guesses.length > 0 ? T('lock.warnFree') : '';
  }

  /* -------------------------------------------------------- goodbye --- */
  var closeTimer = null;
  function showGoodbye() {
    audio.stopTick();
    audio.cancelPending();
    sessionStore.clear();
    Array.prototype.forEach.call(document.querySelectorAll('dialog[open]'), function (d) { closeDialog(d); });
    $('gbTitle').textContent = t('goodbye.title');
    $('gbText').textContent = t('goodbye.text');
    $('gbSign').textContent = t('goodbye.sign');
    $('gbClose').textContent = Shell.native ? T('goodbye.home') : t('goodbye.close');
    $('gbAgain').textContent = t('goodbye.again');
    app.setAttribute('inert', '');
    app.setAttribute('aria-hidden', 'true');
    $('goodbye').hidden = false;
    $('gbAgain').focus();
    // An installed app (or a window opened by a script) can close itself after the goodbye.
    // In the Android app the goodbye leads back to the home screen; elsewhere the window may close.
    if (Shell.native) closeTimer = setTimeout(function () { Shell.goHome(); }, 2600);
    else if (!embedded) closeTimer = setTimeout(function () { try { window.close(); } catch (e) { /* ignore */ } }, 2600);
  }

  $('gbAgain').addEventListener('click', function () {
    clearTimeout(closeTimer);
    $('goodbye').hidden = true;
    app.removeAttribute('inert');
    app.removeAttribute('aria-hidden');
    if (DAILY) startDailyFor(game.lang); else game.restart();
    rerenderHistory();
    refreshAll();
    focusInput(false);
  });

  /* ----------------- window close / back button (FR-FLOW-008, AC-012) --- */
  var trapArmed = false;
  function armBackTrap() {
    if (trapArmed || embedded || Shell.native) return;   // the app uses the Back button handler below
    try { history.pushState({ mbg: 'trap' }, ''); trapArmed = true; } catch (e) { /* ignore */ }
  }
  window.addEventListener('popstate', function () {
    if (!trapArmed) return;
    if (game.state === 'goodbye') { trapArmed = false; try { history.back(); } catch (e) { /* ignore */ } return; }
    try { history.pushState({ mbg: 'trap' }, ''); } catch (e) { /* ignore */ }
    var open = document.querySelector('dialog[open]');
    if (open) { closeDialog(open, 'cancel'); return; }
    requestQuit();
  });
  if (!embedded && !Shell.native) {
    window.addEventListener('beforeunload', function (e) {
      saveNow();
      if (Shell.isLeaving()) return;   // going to the home screen: the game is saved and resumes later
      if (game.state !== 'goodbye' && game.state !== 'boot') {
        e.preventDefault();
        e.returnValue = '';            // the browser shows its own "Leave site?" confirmation
      }
    });
  }
  // Android Back button: an open dialog closes first (MBG.Shell), otherwise back to the game list.
  Shell.setBackHandler(function () { requestQuit(); });
  window.addEventListener('mbg:leave', function () { saveNow(); });

  ['pointerdown', 'keydown'].forEach(function (type) {
    window.addEventListener(type, function once() {
      window.removeEventListener(type, once, true);
      audio.unlock();
      armBackTrap();
    }, true);
  });

  /* ------------------------------------ backgrounding (NFR-009/010) --- */
  var saveTimer = null;
  function saveNow() {
    if (DAILY) { saveDaily(); return; }      // the normal game in progress stays as it was
    if (discardSession || game.state === 'goodbye' || game.state === 'boot') sessionStore.clear();
    else sessionStore.set(game.snapshot());
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 120);
  }
  document.addEventListener('visibilitychange', function () {
    audio.setHidden(document.hidden);
    if (document.hidden) saveNow();
    else refreshStatus();
  });
  window.addEventListener('pagehide', saveNow);

  /* ------------------------------ viewport & on-screen keyboard fit --- */
  // Phones show the keyboard in one of two ways: the whole page shrinks (Android with
  // resizes-content) or only the visible area shrinks (iPhone). Either way the app is
  // fitted to what is visible, the top bar steps aside while typing (kb-open), and the
  // number being typed - pinned right above the input - stays in view.
  var vv = window.visualViewport;
  var lastTouch = null;
  var fullH = 0, lastW = 0;
  function fitViewport() {
    var h = vv ? vv.height : window.innerHeight;
    var w = window.innerWidth;
    var typing = document.activeElement === input;
    if (w !== lastW) { lastW = w; fullH = 0; }                 // rotated: learn the height again
    if (!typing || !fullH) fullH = Math.max(fullH, window.innerHeight, h);
    var visualShrink = vv ? (window.innerHeight - vv.height > 80) : false;   // iPhone style
    var pageShrink = fullH > 0 && h < fullH * 0.75;                           // Android style
    var kbOpen = typing && isTouchUI() && (visualShrink || pageShrink);
    if (visualShrink) {
      app.style.top = vv.offsetTop + 'px';
      app.style.bottom = 'auto';
      app.style.height = vv.height + 'px';
    } else {
      app.style.top = '';
      app.style.bottom = '';
      app.style.height = '';
    }
    app.classList.toggle('kb-open', kbOpen);
    app.classList.toggle('compact', h < 560);
    var touch = isTouchUI();
    if (touch !== lastTouch) { lastTouch = touch; refreshControls(); }
    scrollToEnd();
  }
  if (vv) { vv.addEventListener('resize', fitViewport); vv.addEventListener('scroll', fitViewport); }
  window.addEventListener('resize', fitViewport);
  window.addEventListener('orientationchange', function () { setTimeout(fitViewport, 200); });
  // The keyboard slides in and out over a few hundred milliseconds.
  input.addEventListener('focus', function () { setTimeout(fitViewport, 60); setTimeout(fitViewport, 400); setTimeout(keepLastTryInView, 480); });
  input.addEventListener('blur', function () { setTimeout(fitViewport, 60); setTimeout(fitViewport, 400); });

  // Shown inside another app's frame (the online preview in the Claude app or a phone browser),
  // the page is often neither shrunk nor scrolled for the keyboard, which then covers the input.
  // There, while typing on a phone, the latest try and the input move to the top of the screen
  // (kb-top). The Android app itself shrinks with the keyboard and keeps its normal layout.
  var framed = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  var kbTopTimer = null;
  input.addEventListener('focus', function () {
    clearTimeout(kbTopTimer);
    if (!framed || !isTouchUI()) return;
    // after the tap that focused the field has finished, so it cannot land on something else
    setTimeout(function () {
      if (document.activeElement !== input || app.classList.contains('kb-top')) return;
      app.classList.add('kb-top');
      scrollToEnd();
    }, 0);
  });
  input.addEventListener('blur', function () {
    clearTimeout(kbTopTimer);
    // the field is closed and reopened when the keyboard type changes: wait before moving back
    kbTopTimer = setTimeout(function () {
      if (document.activeElement !== input) { app.classList.remove('kb-top'); scrollToEnd(); }
    }, 300);
  });

  /* ------------------------------------------------------------ boot --- */
  applyTheme(currentTheme);
  applyFont();
  fitViewport();
  refreshControls();
  setInterval(refreshStatus, 250);

  startBackup();

  // Resume a game that was open before a reload or backgrounding, otherwise start one.
  (function boot() {
    var restored = false;
    if (DAILY) { log.textContent = ''; startDailyFor(game.lang); rerenderHistory(); }
    else {
      try { restored = game.restore(sessionStore.get(), C.sessionMaxAgeMs); } catch (e) { restored = false; }
      if (restored) rerenderHistory();
      else { log.textContent = ''; game.start(); }
    }
    refreshAll();
    focusInput(false);
    showIntro();
  })();

  if (!C.standalone && !embedded && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && C.serviceWorker) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(C.serviceWorker).catch(function () { /* offline support is optional */ });
    });
  }

  // Exposed for automated tests and debugging.
  MBG.app = { daily: DAILY, game: game, users: users, audio: audio, prefs: prefs, access: Shell.access, billing: MBG.Billing };
})();

