/*!
 * MBG Who Am I? - setting up a match: question word, category, playing language, difficulty,
 * filters and opponent (sections 4, 5, 14, 15).
 * The playing language (FR-008) is chosen here and governs the whole match - the hidden name, the
 * questions, the answers, the rules and the judging. It starts as the language of the app.
 * The last setup is kept: "Play" on the home screen starts it again at once.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, C = MBG.WhoCats;
  var el = Shell.el, t = Shell.t;
  var KEY = 'MBG.Who.setup';
  var LI = function (l) { return Math.max(0, Shell.LANGS.indexOf(l || Shell.getLang())); };

  function defaults() {
    return { mode: 'who', cat: null, subs: [], lang: Shell.getLang(), level: 'easy', period: 'any', region: 'any',
      opponent: 'online', botLevel: 'intermediate', ranked: false, margin: 150,
      time: 180, questions: 12, guesses: 2, rounds: 2, choose: 0, access: 'open' };
  }
  function last() {
    var s = Shell.readJson(KEY, null), d = defaults();
    if (!s) return d;
    for (var k in d) if (s[k] == null) s[k] = d[k];
    if (Shell.LANGS.indexOf(s.lang) === -1) s.lang = d.lang;
    // one language everywhere: after the app's language was changed, the game is played in it too
    // (a different playing language stays only when it was chosen in the setup after that)
    if (Shell.langAt() > (s.langAt || 0)) s.lang = Shell.getLang();
    if (s.access !== 'closed') s.access = 'open';     // 1.1.3: 🌍 Public or 🔒 Private (before: ask / auto)
    return s;
  }
  function describe(s) {
    var i = LI();
    var m = C.MODES[s.mode] || C.MODES.who;
    var parts = [m.title[i]];
    if (s.cat && C.CATS[s.cat]) parts.push(C.name(C.CATS[s.cat], Shell.getLang()));
    parts.push(C.LEVELS[s.level].names[i]);
    parts.push(Shell.langName(s.lang));
    var lim = limitsText(s);
    if (lim) parts.push(lim);
    parts.push(s.opponent === 'computer' ? '🤖 ' + MBG.WhoBotNames[s.botLevel][i] : s.opponent === 'tabs' ? '👥'
      : '🌍 ' + t('opp.online') + (onlineReady() && !signedIn() ? ' · ' + t('opp.guest') : s.ranked ? ' · ' + t('opp.ranked') : ''));
    return parts.join(' · ');
  }
  /** "⏱ 5 min · 3 🎯" when a setup has other limits than the standard ('' for the standard). */
  function limitsText(s) {
    var E = MBG.WhoEngine, d = E ? E.DEFAULTS : { roundSeconds: 180, maxQuestions: 12, maxWrong: 2, rounds: 2 };
    if (s.opponent === 'online' && s.ranked) return '';
    var out = [];
    if (s.time && s.time !== d.roundSeconds) out.push('⏱ ' + s.time / 60 + ' min');
    if (s.questions && s.questions !== d.maxQuestions) out.push(s.questions + ' ?');
    if (s.guesses && s.guesses !== d.maxWrong) out.push(s.guesses + ' 🎯');
    if (s.rounds && s.rounds !== d.rounds) out.push(s.rounds + ' ⟳');
    return out.join(' ');
  }
  /** Online play is possible: the MBG server is on and the player is signed in with an MBG account. */
  function onlineReady() { return !!(MBG.Net && !MBG.Net.demo); }
  /** Signed in with an MBG account (with the server): ranked matches, a rating, groups. Without: a guest online. */
  function signedIn() { return onlineReady() && MBG.Net.signedIn(); }
  /** "Play" on the home screen (1.0.1): the player's own setup, as "Who am I?" - and, when online play
   *  is possible, against a person online first, ranked (the computer is offered after 15 seconds
   *  without an opponent). Without online play the computer is the opponent. */
  function quick(s, online) {
    s = s || last();
    var q = {};
    for (var k in s) q[k] = s[k];
    if (q.mode !== 'who') { q.mode = 'who'; q.cat = null; q.subs = []; }
    if (online) { q.opponent = 'online'; q.ranked = signedIn(); }
    else if (q.opponent === 'online') q.opponent = 'computer';
    return q;
  }
  // the computer's level names (bot.js is not loaded on the home screen)
  MBG.WhoBotNames = { beginner: ['Beginner', 'Fillestar', 'Anfänger', 'Početnik'], intermediate: ['Intermediate', 'Mesatar', 'Mittel', 'Srednji'],
    advanced: ['Advanced', 'I avancuar', 'Fortgeschritten', 'Napredni'], expert: ['Expert', 'Ekspert', 'Experte', 'Ekspert'] };

  /** Starts a game - in the paid edition only when a game is left (else the plans first). */
  function start(s) {
    // the puzzles of the day are free in every edition
    if (s && s.daily) { go(s); return; }
    if (MBG.Shop && MBG.Plan && !MBG.Plan.canPlay()) { MBG.Shop.gate().then(function (ok) { if (ok) go(s); }); return; }
    go(s);
  }
  function go(s) {
    // 1.1.8: a rematch or a friend belongs to that one game - never to the player's own setup
    var c = {}; for (var k in s) if (k !== 'rematch' && k !== 'friend' && k !== 'room') c[k] = s[k];
    s = c;
    if (!s.daily) Shell.writeJson(KEY, s);   // "Play" on the home screen keeps the player's own setup
    Shell.writeJson('MBG.Who.next', { setup: s, at: Date.now() });
    if (s.opponent === 'tabs') Shell.go('play.html?tabs=host');
    else if (s.opponent === 'online') Shell.go('play.html?online=1');
    else Shell.go('play.html');
  }

  function seg(items, value, onPick, cls) {
    var box = el('div', 'seg ' + (cls || ''));
    box.setAttribute('role', 'radiogroup');
    items.forEach(function (it) {
      var b = el('button', 'seg-btn' + (it.id === value ? ' on' : ''), it.label);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', it.id === value ? 'true' : 'false');
      if (it.title) b.title = it.title;
      b.addEventListener('click', function () { onPick(it.id); });
      box.appendChild(b);
    });
    return box;
  }
  function chips(items, selected, onToggle) {
    var box = el('div', 'chipset');
    items.forEach(function (it) {
      var on = selected.indexOf(it.id) !== -1;
      var b = el('button', 'pickchip' + (on ? ' on' : ''), it.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', function () { onToggle(it.id); });
      box.appendChild(b);
    });
    return box;
  }
  function section(body, title, note) {
    var s = el('section', 'su-sec');
    s.appendChild(el('h3', null, title));
    if (note) s.appendChild(el('p', 'muted small', note));
    body.appendChild(s);
    return s;
  }

  /** The setup sheet. o: overrides ({ mode, opponent }). */
  function open(o) {
    var s = last();
    // 1.1.3: a new game starts with a person as the opponent (the computer is the second choice)
    if (!o || !o.opponent) s.opponent = 'online';
    for (var k in (o || {})) s[k] = o[k];
    if (o && o.mode && s.cat && C.modeOf(s.cat) !== o.mode) { s.cat = null; s.subs = []; }
    var sh = Shell.sheet({ id: 'dlgSetup', title: t('setup.title'), cls: 'setupsheet', actions: [{ label: '▶ ' + t('setup.start'), onClick: function () { go(); } }] });
    var moreOpen = !!(o && o.more);
    function go() { sh.close('start'); start(s); }
    function paint() {
      var b = sh.body, lang = Shell.getLang(), i = LI();
      b.textContent = '';
      // 1.1.0 - three choices on top (who you play, the question word, the difficulty), then Start;
      // everything else waits under "More options"
      var top = el('div', 'su-top'), more = el('details', 'su-more su-all'), mb = el('div', 'su-morebody');
      more.open = moreOpen;
      more.appendChild(el('summary', null, '⚙ ' + t('setup.more')));
      more.appendChild(mb);
      more.addEventListener('toggle', function () { moreOpen = more.open; });
      // 2. question word
      var sec = section(top, t('setup.mode'));
      var mg = el('div', 'su-modes');
      C.MODE_ORDER.forEach(function (k) {
        var m = C.MODES[k];
        var btn = el('button', 'su-mode mode-' + k + (s.mode === k ? ' on' : ''));
        btn.type = 'button';
        btn.setAttribute('aria-pressed', s.mode === k ? 'true' : 'false');
        btn.appendChild(el('span', 'su-ic', m.icon));
        btn.appendChild(el('strong', null, m.title[i]));
        btn.addEventListener('click', function () { if (s.mode !== k) { s.mode = k; s.cat = null; s.subs = []; } paint(); });
        mg.appendChild(btn);
      });
      sec.appendChild(mg);
      // 2. category and subcategories
      sec = section(mb, t('setup.cat'));
      var cats = C.catsOf(s.mode);
      var cl = [{ id: '*', label: '🎲 ' + t('setup.anyCat') }].concat(cats.map(function (c) { return { id: c, label: C.CATS[c].icon + ' ' + C.name(C.CATS[c], lang) }; }));
      sec.appendChild(chips(cl, [s.cat || '*'], function (id) { s.cat = id === '*' ? null : id; s.subs = []; paint(); }));
      if (s.cat) {
        var subs = C.CATS[s.cat].subs;
        var sl = Object.keys(subs).map(function (k2) { return { id: k2, label: C.name(subs[k2], lang) }; });
        var sub = el('div', 'su-subs');
        sub.appendChild(el('p', 'muted small', t('setup.subs')));
        sub.appendChild(chips(sl, s.subs, function (id) {
          var j = s.subs.indexOf(id);
          if (j === -1) s.subs.push(id); else s.subs.splice(j, 1);
          paint();
        }));
        sec.appendChild(sub);
      }
      // 3. playing language
      sec = section(mb, t('setup.lang'), t('setup.langNote'));
      var lg = el('div', 'su-langs');
      Shell.LANGS.forEach(function (l) {
        var btn = el('button', 'su-lang' + (s.lang === l ? ' on' : ''));
        btn.type = 'button';
        btn.setAttribute('aria-pressed', s.lang === l ? 'true' : 'false');
        btn.innerHTML = '<span class="lm-flag">' + MBG.LangMenu.flagSvg(l, true) + '</span>';
        btn.appendChild(el('span', null, Shell.langName(l)));
        btn.addEventListener('click', function () { s.lang = l; s.langAt = Date.now(); paint(); });
        lg.appendChild(btn);
      });
      sec.appendChild(lg);
      // 4. difficulty
      sec = section(top, t('setup.level'));
      sec.appendChild(seg(C.LEVEL_ORDER.map(function (k3) { var L = C.LEVELS[k3]; return { id: k3, label: L.names[i], title: '× ' + L.mult.toFixed(2) }; }), s.level, function (id) { s.level = id; paint(); }, 'wide'));
      // 4b. the limits of a round (casual and practice; ranked matches use the standard)
      var lockd = s.opponent === 'online' && s.ranked;
      sec = section(mb, '⏱ ' + t('setup.rules'), lockd ? t('setup.rulesRanked') : t('setup.rulesNote'));
      var O = MBG.WhoEngine.OPTIONS;
      function limitRow(label, key, list, show) {
        var row = el('div', 'su-limit');
        row.appendChild(el('span', 'su-limit-label', label));
        row.appendChild(seg(list.map(function (v) { return { id: v, label: show(v) }; }), lockd ? MBG.WhoEngine.DEFAULTS[{ time: 'roundSeconds', questions: 'maxQuestions', guesses: 'maxWrong', rounds: 'rounds' }[key]] : s[key],
          function (v) { if (!lockd) { s[key] = v; paint(); } }, 'wide' + (lockd ? ' locked' : '')));
        sec.appendChild(row);
      }
      limitRow(t('setup.time'), 'time', O.roundSeconds, function (v) { return v / 60 + ' min'; });
      limitRow(t('setup.questions'), 'questions', O.maxQuestions, String);
      limitRow(t('setup.guesses'), 'guesses', O.maxWrong, String);
      limitRow(t('setup.rounds'), 'rounds', O.rounds, function (v) { return t('setup.roundsN', { n: v, each: v / 2 }); });
      // 1.1.2: the time to choose the card between people (0 = by level: Easy 5 · Standard 3 · Advanced 2½ · Expert 2 min)
      if (s.opponent !== 'computer') {
        var EN = MBG.WhoEngine, autoMin = EN.chooseLimit(s.level, 0) / 60;
        var crow = el('div', 'su-limit');
        crow.appendChild(el('span', 'su-limit-label', t('setup.chooseTime') + ' (min)'));
        crow.appendChild(seg(EN.CHOOSE_OPTIONS.map(function (v) { return { id: v, label: v ? String(v / 60) : t('setup.chooseAuto', { m: String(autoMin).replace('.5', '½') }) }; }),
          lockd ? 0 : Number(s.choose) || 0, function (v) { if (!lockd) { s.choose = v; paint(); } }, 'wide su-choose' + (lockd ? ' locked' : '')));
        sec.appendChild(crow);
        sec.appendChild(el('p', 'muted small', t('setup.chooseNote')));
      }
      if (!lockd && (!MBG.WhoEngine.isStandard(MBG.WhoEngine.limits(s)) || Number(s.choose))) {
        var std = el('button', 'btn ghost small', '↺ ' + t('setup.standard'));
        std.type = 'button';
        std.addEventListener('click', function () { var d0 = defaults(); s.time = d0.time; s.questions = d0.questions; s.guesses = d0.guesses; s.rounds = d0.rounds; s.choose = 0; paint(); });
        sec.appendChild(std);
      }
      // 5. filters
      var det = el('details', 'su-more');
      if (s.period !== 'any' || s.region !== 'any') det.open = true;
      det.appendChild(el('summary', null, t('setup.filters')));
      var fl = el('div', 'su-filters');
      var per = el('label', 'su-sel');
      per.appendChild(el('span', null, t('setup.period')));
      var ps = el('select', 'textfield');
      C.PERIODS.forEach(function (p) { var op = el('option', null, t('period.' + p.id)); op.value = p.id; if (p.id === s.period) op.selected = true; ps.appendChild(op); });
      ps.addEventListener('change', function () { s.period = ps.value; });
      per.appendChild(ps);
      fl.appendChild(per);
      var reg = el('label', 'su-sel');
      reg.appendChild(el('span', null, t('setup.region')));
      var rs = el('select', 'textfield');
      C.REGIONS.forEach(function (r) {
        var name = r.id === 'any' ? t('region.any') : r.id === 'europe' ? t('region.europe') : r.id === 'balkans' ? t('region.balkans') : MBG.WhoLex.countryName(r.id, lang);
        var op = el('option', null, name); op.value = r.id; if (r.id === s.region) op.selected = true; rs.appendChild(op);
      });
      rs.addEventListener('change', function () { s.region = rs.value; });
      reg.appendChild(rs);
      fl.appendChild(reg);
      fl.appendChild(el('p', 'muted small', t('setup.periodNote')));
      det.appendChild(fl);
      mb.appendChild(det);
      // 6. opponent
      var guest = onlineReady() && !signedIn();
      sec = section(top, t('setup.opponent'));
      top.insertBefore(sec, top.firstChild);
      var og = el('div', 'su-opps');
      [['online', '🌍', t('opp.person')], ['computer', '🤖', t('opp.computer')], ['tabs', '👥', t('opp.friend')]].forEach(function (x) {
        var ob = el('button', 'su-opp' + (s.opponent === x[0] ? ' on' : ''));
        ob.type = 'button';
        ob.setAttribute('aria-pressed', s.opponent === x[0] ? 'true' : 'false');
        ob.appendChild(el('span', 'su-ic', x[1]));
        ob.appendChild(el('strong', null, x[2]));
        ob.addEventListener('click', function () { s.opponent = x[0]; if (x[0] === 'online' && guest) s.ranked = false; paint(); });
        og.appendChild(ob);
      });
      sec.appendChild(og);
      sec.appendChild(el('p', 'muted small', t(s.opponent === 'online' ? (guest ? 'opp.guestLine' : 'opp.personLine') : s.opponent === 'computer' ? 'opp.computerNote' : 'opp.tabsNote')));
      // 1.1.3: 🌍 Public (others may watch - also a game against the computer) or 🔒 Private (nobody joins)
      var priv = s.access === 'closed' ? 'closed' : 'open', pv = el('div', 'su-limit su-privacy');
      pv.appendChild(el('span', 'su-limit-label', t('privacy.label')));
      pv.appendChild(seg([{ id: 'open', label: '🌍 ' + t('privacy.public') }, { id: 'closed', label: '🔒 ' + t('privacy.private') }], priv, function (id) { s.access = id; paint(); }, 'wide'));
      pv.appendChild(el('p', 'muted small', t(priv === 'closed' ? 'privacy.privateText' : s.opponent === 'computer' ? 'privacy.publicCpu' : 'privacy.publicText')));
      sec.appendChild(pv);
      sec = section(mb, s.opponent === 'online' ? '🌍 ' + t('opp.person') : s.opponent === 'computer' ? '🤖 ' + t('opp.computer') : '👥 ' + t('opp.friend'));
      if (s.opponent === 'computer') {
        sec.appendChild(seg(['beginner', 'intermediate', 'advanced', 'expert'].map(function (k4) { return { id: k4, label: MBG.WhoBotNames[k4][i] }; }), s.botLevel, function (id) { s.botLevel = id; paint(); }, 'wide'));
      }
      if (s.opponent === 'computer') {
        // (the computer's level is above)
      } else if (s.opponent === 'tabs') {
        var join = el('button', 'btn ghost', '🔗 ' + t('opp.join'));
        join.type = 'button';
        join.addEventListener('click', function () { sh.close('join'); Shell.go('play.html?tabs=join'); });
        sec.appendChild(join);
      } else if (s.opponent === 'online' && guest) {
        sec.appendChild(el('p', 'muted small', t('opp.guestMore')));
      } else if (s.opponent === 'online') {
        // 1.1.3: a friend - invited by name from the friends list
        if (MBG.Friends && MBG.Friends.ready()) {
          var fb = el('button', 'btn ghost', '👫 ' + t('fr.playFriend')); fb.type = 'button';
          fb.addEventListener('click', function () { sh.close('friends'); MBG.Friends.open(); });
          sec.appendChild(fb);
        }
        sec.appendChild(seg([{ id: true, label: '🏆 ' + t('opp.ranked') }, { id: false, label: t('opp.casual') }], !!s.ranked, function (id) { s.ranked = id; paint(); }, 'wide'));
        if (!s.ranked) {
          var gr = el('div', 'su-limit');
          gr.appendChild(el('span', 'su-limit-label', t('opp.guests')));
          gr.appendChild(seg([{ id: false, label: t('btn.no') }, { id: true, label: t('btn.yes') }], !!s.guests, function (id) { s.guests = id; paint(); }, 'wide'));
          sec.appendChild(gr);
        }
        var mg2 = el('label', 'su-sel');
        mg2.appendChild(el('span', null, t('opp.margin', { n: s.margin })));
        var rg = el('input');
        rg.type = 'range'; rg.min = 25; rg.max = 500; rg.step = 25; rg.value = s.margin;
        rg.addEventListener('input', function () { s.margin = Number(rg.value); mg2.firstChild.textContent = t('opp.margin', { n: s.margin }); });
        mg2.appendChild(rg);
        sec.appendChild(mg2);
      }
      var startBtn = el('button', 'btn submit big', '▶ ' + t('setup.start'));
      startBtn.type = 'button';
      startBtn.addEventListener('click', go);
      b.appendChild(top);
      b.appendChild(startBtn);
      b.appendChild(more);
    }
    paint();
    return MBG.Shell.closed(sh.dlg);
  }

  function onlineInfo() {
    var sh = Shell.sheet({ id: 'dlgOnline', title: '🌍 ' + t('opp.online') });
    sh.body.appendChild(el('p', null, t('online.demo1')));
    sh.body.appendChild(el('p', null, t('online.demo2')));
    var b = el('button', 'btn submit', '👥 ' + t('opp.tabs'));
    b.type = 'button';
    b.addEventListener('click', function () { sh.close(); open({ opponent: 'tabs' }); });
    sh.body.appendChild(b);
    return Shell.closed(sh.dlg);
  }

  MBG.WhoSetup = { open: open, start: start, last: last, describe: describe, defaults: defaults, onlineInfo: onlineInfo, limitsText: limitsText,
    quick: quick, onlineReady: onlineReady, signedIn: signedIn };
})(typeof self !== 'undefined' ? self : globalThis);
