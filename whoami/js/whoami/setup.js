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
      opponent: 'computer', botLevel: 'intermediate', ranked: false, margin: 150,
      time: 180, questions: 12, guesses: 2, rounds: 2, access: 'ask' };
  }
  function last() {
    var s = Shell.readJson(KEY, null), d = defaults();
    if (!s) return d;
    for (var k in d) if (s[k] == null) s[k] = d[k];
    if (Shell.LANGS.indexOf(s.lang) === -1) s.lang = d.lang;
    // one language everywhere: after the app's language was changed, the game is played in it too
    // (a different playing language stays only when it was chosen in the setup after that)
    if (Shell.langAt() > (s.langAt || 0)) s.lang = Shell.getLang();
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
    parts.push(s.opponent === 'computer' ? '🤖 ' + MBG.WhoBotNames[s.botLevel][i] : s.opponent === 'tabs' ? '👥' : '🌍');
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
    for (var k in (o || {})) s[k] = o[k];
    if (o && o.mode && s.cat && C.modeOf(s.cat) !== o.mode) { s.cat = null; s.subs = []; }
    var sh = Shell.sheet({ id: 'dlgSetup', title: t('setup.title'), cls: 'setupsheet', actions: [{ label: '▶ ' + t('setup.start'), onClick: function () { go(); } }] });
    function go() { sh.close('start'); start(s); }
    function paint() {
      var b = sh.body, lang = Shell.getLang(), i = LI();
      b.textContent = '';
      // 1. question word
      var sec = section(b, t('setup.mode'));
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
      // the puzzle of the day of this question word, in the corner of the setup (daily-ui.js)
      if (MBG.DailyUI) sec.appendChild(MBG.DailyUI.banner(s.mode, function () { sh.close('daily'); }));
      // 2. category and subcategories
      sec = section(b, t('setup.cat'));
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
      sec = section(b, t('setup.lang'), t('setup.langNote'));
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
      sec = section(b, t('setup.level'), t('setup.levelNote'));
      sec.appendChild(seg(C.LEVEL_ORDER.map(function (k3) { var L = C.LEVELS[k3]; return { id: k3, label: L.names[i], title: '× ' + L.mult.toFixed(2) }; }), s.level, function (id) { s.level = id; paint(); }, 'wide'));
      var mult = el('p', 'muted small', t('setup.mult', { m: C.LEVELS[s.level].mult.toFixed(2) }));
      sec.appendChild(mult);
      // 4b. the limits of a round (casual and practice; ranked matches use the standard)
      var lockd = s.opponent === 'online' && s.ranked;
      sec = section(b, '⏱ ' + t('setup.rules'), lockd ? t('setup.rulesRanked') : t('setup.rulesNote'));
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
      if (!lockd && !MBG.WhoEngine.isStandard(MBG.WhoEngine.limits(s))) {
        var std = el('button', 'btn ghost small', '↺ ' + t('setup.standard'));
        std.type = 'button';
        std.addEventListener('click', function () { var d0 = defaults(); s.time = d0.time; s.questions = d0.questions; s.guesses = d0.guesses; s.rounds = d0.rounds; paint(); });
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
      b.appendChild(det);
      // 6. opponent
      sec = section(b, t('setup.opponent'));
      sec.appendChild(seg([{ id: 'computer', label: '🤖 ' + t('opp.computer') }, { id: 'tabs', label: '👥 ' + t('opp.tabs') }, { id: 'online', label: '🌍 ' + t('opp.online') }],
        s.opponent, function (id) {
          s.opponent = id; paint();
        }, 'wide'));
      if (s.opponent === 'computer') {
        sec.appendChild(el('p', 'muted small', t('opp.computerNote')));
        sec.appendChild(seg(['beginner', 'intermediate', 'advanced', 'expert'].map(function (k4) { return { id: k4, label: MBG.WhoBotNames[k4][i] }; }), s.botLevel, function (id) { s.botLevel = id; paint(); }, 'wide'));
      }
      if (s.opponent === 'tabs' || s.opponent === 'online') {
        // others may join this match: nobody / when the players agree / everyone welcome
        var acc = el('div', 'su-limit');
        acc.appendChild(el('span', 'su-limit-label', '👥 ' + t('setup.access')));
        acc.appendChild(seg([{ id: 'closed', label: t('access.closed') }, { id: 'ask', label: t('access.ask') }, { id: 'auto', label: t('access.auto') }], s.access || 'ask', function (id) { s.access = id; paint(); }, 'wide'));
        acc.appendChild(el('p', 'muted small', t('access.' + (s.access || 'ask') + 'Text')));
        sec.appendChild(acc);
      }
      if (s.opponent === 'computer') {
        // (the computer's level is above)
      } else if (s.opponent === 'tabs') {
        sec.appendChild(el('p', 'muted small', t('opp.tabsNote')));
        var join = el('button', 'btn ghost', '🔗 ' + t('opp.join'));
        join.type = 'button';
        join.addEventListener('click', function () { sh.close('join'); Shell.go('play.html?tabs=join'); });
        sec.appendChild(join);
      } else if (s.opponent === 'online') {
        sec.appendChild(seg([{ id: false, label: t('opp.casual') }, { id: true, label: t('opp.ranked') }], s.ranked, function (id) { s.ranked = id; paint(); }, 'wide'));
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
      b.appendChild(startBtn);
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

  MBG.WhoSetup = { open: open, start: start, last: last, describe: describe, defaults: defaults, onlineInfo: onlineInfo, limitsText: limitsText };
})(typeof self !== 'undefined' ? self : globalThis);
