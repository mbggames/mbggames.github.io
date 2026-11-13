/*!
 * MBG Games - community judging (section 10).
 *  - Judge center: join the judging pool (opt-in, FR-027), the languages you judge in, your
 *    record (completed cases, reliability FR-033, the stars players gave your judgments),
 *    invitations (accept / decline, FR-028), your cases, your own disputes, and - for the
 *    administrator - the queue of cases nobody took (FR-031).
 *  - Case page (FR 10.6): case id, category, language, the hidden answer, the exact question,
 *    the original response, the reason of the dispute, what was asked before, the evidence, the
 *    deadline - and only that: no names or accounts of the players.
 *  - Decisions (FR-029): correct · incorrect · Both justified · Unknown justified · the question
 *    was ambiguous or invalid · not enough evidence; with a short explanation.
 *  - AI assistance (FR-030): a check of the facts on request; the judge decides.
 *  - Appeal (FR-032): within 48 hours, to a different judge or the administrator.
 *  - Rating a judgment: both players can give the judgment 1-5 stars.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;
  var DECISIONS = ['correct', 'incorrect', 'both', 'unknown', 'invalid', 'insufficient'];
  var STEPS = ['submitted', 'screening', 'awaiting', 'assigned', 'decided', 'appealed', 'escalated', 'final'];

  function badge(code) { return el('span', 'resp r-' + String(code || '').toLowerCase(), t('resp.' + String(code || 'UNKNOWN').toUpperCase())); }

  /* -------------------------------------------------------- judge center --- */
  function open() {
    var sh = Shell.sheet({ id: 'dlgJudge', title: '⚖️ ' + t('judge.title'), cls: 'judgesheet' });
    var b = sh.body;
    function draw() {
      Promise.all([Net.judge.status(), Net.judge.cases()]).then(function (r) {
        var s = r[0], cases = r[1] || [];
        b.textContent = '';
        if (Net.demo) b.appendChild(el('p', 'demoline small', '🧪 ' + t('demo.judge')));
        b.appendChild(el('p', null, t('judge.intro')));
        // the pool
        var pool = el('div', 'srow');
        var pl = el('span', 'srow-label');
        pl.appendChild(document.createTextNode(t('judge.pool')));
        pl.appendChild(el('small', null, t('judge.poolNote', { n: s.needed || 30 })));
        pool.appendChild(pl);
        var sw = el('button', 'switch'); sw.type = 'button'; sw.setAttribute('role', 'switch');
        sw.setAttribute('aria-checked', s.inPool ? 'true' : 'false'); sw.appendChild(el('span', 'knob'));
        sw.addEventListener('click', function () {
          if (!s.inPool && Shell.getUser().mode === 'anonymous') { Shell.toast(t('judge.needName')); MBG.Account.open().then(draw); return; }
          var langs = s.langs && s.langs.length ? s.langs : [Shell.getLang()];
          Net.judge.setPool(!s.inPool, langs, s.cats).then(function () { draw(); MBG.Notify.paint(); });
        });
        pool.appendChild(sw);
        b.appendChild(pool);
        if (!Net.demo && !s.eligible) b.appendChild(el('p', 'muted small', t('judge.notYet', { n: s.matches || 0, need: s.needed || 30 })));
        if (s.inPool) {
          var lg = el('div', 'chipset');
          Shell.LANGS.forEach(function (l) {
            var on = (s.langs || []).indexOf(l) !== -1;
            var c = el('button', 'pickchip' + (on ? ' on' : ''), Shell.langName(l));
            c.type = 'button';
            c.addEventListener('click', function () {
              var ls = (s.langs || []).slice(), i = ls.indexOf(l);
              if (i === -1) ls.push(l); else if (ls.length > 1) ls.splice(i, 1);
              Net.judge.setPool(true, ls, s.cats).then(draw);
            });
            lg.appendChild(c);
          });
          b.appendChild(el('p', 'muted small', t('judge.langs')));
          b.appendChild(lg);
        }
        // the record
        var rec = el('div', 'sc-grid');
        [[s.completed || 0, t('judge.completed')], [s.reliability != null ? s.reliability + '%' : '–', t('judge.reliability')],
          [s.stars != null ? s.stars.toFixed(1) + ' ★' : '–', t('judge.stars', { n: s.starCount || 0 })]].forEach(function (x) {
          var c = el('div', 'sc-tile'); c.appendChild(el('b', 'num', String(x[0]))); c.appendChild(el('span', null, x[1])); rec.appendChild(c);
        });
        b.appendChild(rec);
        // cases
        var groups = [['invited', t('judge.invites')], ['mine', t('judge.myDisputes')], ['judging', t('judge.myCases')], ['admin', t('judge.adminQueue')]];
        groups.forEach(function (g) {
          var list = cases.filter(function (c) {
            if (g[0] === 'invited') return c.status === 'invited';
            if (g[0] === 'mine') return c.mine;
            if (g[0] === 'judging') return !c.mine && c.status !== 'invited' && c.status !== 'declined' && !(c.status === 'escalated');
            return (Net.demo || s.admin) && c.status === 'escalated';
          });
          if (!list.length) return;
          b.appendChild(el('h3', null, g[1]));
          if (g[0] === 'admin' && Net.demo) b.appendChild(el('p', 'muted small', t('demo.admin')));
          list.forEach(function (c) { b.appendChild(caseRow(c, function () { sh.close(); openCase(c.id).then(open); })); });
        });
        if (!cases.length) b.appendChild(el('p', 'empty muted', t(s.inPool ? 'judge.noCases' : 'judge.joinHint')));
      });
    }
    draw();
    return Shell.closed(sh.dlg);
  }
  function caseRow(c, onOpen) {
    var r = el('button', 'caserow');
    r.type = 'button';
    r.appendChild(el('span', 'cr-ref', c.ref));
    var tx = el('span', 'cr-t');
    tx.appendChild(el('strong', null, '“' + c.question + '”'));
    tx.appendChild(el('span', 'muted small', (c.catName || '') + ' · ' + Shell.langName(c.lang) + ' · ' + Shell.ago(c.created)));
    r.appendChild(tx);
    r.appendChild(el('span', 'cstatus s-' + c.status, t('cs.' + c.status)));
    r.addEventListener('click', onOpen);
    return r;
  }

  /* ----------------------------------------------------------- case page --- */
  function openCase(id) {
    return Net.judge.get(id).then(function (c) {
      if (!c) { Shell.toast(t('case.gone')); return null; }
      var sh = Shell.sheet({ id: 'dlgCase', title: '⚖️ ' + t('case.title', { ref: c.ref }), cls: 'casesheet' });
      var b = sh.body;
      var timer = setInterval(function () { Net.judge.get(id).then(function (n) { if (n && (n.status !== c.status)) { c = n; draw(); } }); }, 1500);
      sh.dlg.addEventListener('close', function () { clearInterval(timer); });
      function draw() {
        b.textContent = '';
        if (c.demo) b.appendChild(el('p', 'demoline small', '🧪 ' + t(c.demoInvite ? 'demo.practiceCase' : 'demo.case')));
        // status timeline
        var tl = el('ol', 'timeline');
        var reached = (c.history || []).map(function (h) { return h.status; });
        STEPS.forEach(function (s) {
          if ((s === 'appealed' || s === 'escalated') && reached.indexOf(s) === -1) return;
          var li = el('li', reached.indexOf(s) !== -1 ? 'done' : '', t('cs.' + s));
          if (c.status === s) li.classList.add('now');
          tl.appendChild(li);
        });
        if (c.status === 'invited') tl.insertBefore(el('li', 'now', t('cs.invited')), tl.firstChild);
        b.appendChild(tl);
        // the facts of the case (FR 10.6)
        var A = c.answer, lang = c.lang;
        var kv = el('div', 'kv case-kv');
        function row(k, v) { var r = el('div', 'kv-row'); r.appendChild(el('span', null, k)); if (typeof v === 'string') r.appendChild(el('b', null, v)); else r.appendChild(v); kv.appendChild(r); }
        row(t('case.id'), c.ref);
        row(t('case.cat'), c.catName || c.cat || '–');
        row(t('case.lang'), Shell.langName(lang));
        row(t('case.answer'), A ? MBG.WhoText.labelIn(A, lang) : '–');
        row(t('case.question'), '“' + c.question + '”');
        row(t('case.response'), badge(c.response));
        row(t('case.reason'), c.reason || '–');
        row(t('case.deadline'), c.deadline ? new Date(c.deadline).toLocaleString(Shell.getLang()) : '–');
        b.appendChild(kv);
        if (A) b.appendChild(factsBox(A, lang));
        if (c.context && c.context.length) {
          b.appendChild(el('h3', null, t('case.context')));
          var ul = el('ul', 'ctx');
          c.context.forEach(function (x) { var li = el('li'); li.appendChild(el('span', null, x.q + ' ')); li.appendChild(badge(x.code)); ul.appendChild(li); });
          b.appendChild(ul);
        }
        // evidence: the facts check, on request (FR-030)
        var ev = el('div', 'evidence');
        var ask = el('button', 'btn ghost small', '🤖 ' + t('case.ai'));
        ask.type = 'button';
        ask.addEventListener('click', function () {
          Net.judge.ai(c.id).then(function (a) {
            ev.textContent = '';
            ev.appendChild(el('h3', null, '🤖 ' + t('case.aiTitle')));
            if (!a || !a.understood) { ev.appendChild(el('p', null, t('case.aiNone'))); return; }
            var p = el('p'); p.appendChild(document.createTextNode(t('case.aiData') + ' ')); p.appendChild(badge(a.data)); ev.appendChild(p);
            (a.preds || []).forEach(function (pr) { ev.appendChild(el('p', 'muted small', '· ' + MBG.WhoQuestions.render(pr, lang, MBG.WhoQuestions.kindGroup(A)) + ' → ' + t('resp.' + MBG.WhoQuestions.evaluate(pr, A, lang)))); });
            if (a.text) ev.appendChild(el('p', null, a.text));
            ev.appendChild(el('p', 'muted small', t('case.aiNote')));
          });
        });
        ev.appendChild(ask);
        b.appendChild(ev);
        // decisions
        if (c.decision) {
          var d = el('div', 'decision');
          d.appendChild(el('h3', null, '📜 ' + t('case.decision')));
          d.appendChild(el('p', null, t('dec.' + c.decision.code)));
          if (c.decision.text) d.appendChild(el('p', 'muted', '“' + c.decision.text + '” – ' + c.decision.by));
          b.appendChild(d);
        }
        if (c.final) {
          var f = el('div', 'decision final');
          f.appendChild(el('h3', null, '🛡️ ' + t('case.final')));
          f.appendChild(el('p', null, t('dec.' + c.final.code)));
          if (c.final.text) f.appendChild(el('p', 'muted', '“' + c.final.text + '”'));
          b.appendChild(f);
        }
        if (c.decision || c.final) b.appendChild(el('p', 'muted small', t('case.effects')));
        // what this player can do now
        if (c.status === 'invited') {
          var acts = el('div', 'dlg-actions');
          var no = el('button', 'btn ghost', t('case.decline')); no.type = 'button';
          no.addEventListener('click', function () { Net.judge.decline(c.id).then(function () { sh.close(); }); });
          var yes = el('button', 'btn submit', t('case.accept')); yes.type = 'button';
          yes.addEventListener('click', function () { Net.judge.accept(c.id).then(function (n) { c = n; draw(); }); });
          acts.appendChild(no); acts.appendChild(yes); b.appendChild(acts);
        } else if (c.status === 'assigned' && c.judge && c.judge.me) decideForm(b, c, false, function (n) { c = n; draw(); MBG.Notify.paint(); });
        else if (c.status === 'escalated' && (Net.demo || c.canAdmin)) decideForm(b, c, true, function (n) { c = n; draw(); MBG.Notify.paint(); });
        if (c.mine && c.status === 'decided' && !c.appeal) {
          b.appendChild(el('h3', null, '🔁 ' + t('case.appeal')));
          b.appendChild(el('p', 'muted small', t('case.appealNote')));
          var ta = el('textarea', 'textfield'); ta.rows = 2; ta.placeholder = t('case.appealPh'); b.appendChild(ta);
          var ap = el('button', 'btn ghost', t('case.appealSend')); ap.type = 'button';
          ap.addEventListener('click', function () { if (ta.value.trim().length < 5) { Shell.toast(t('case.needReason')); return; } Net.disputes.appeal(c.id, ta.value.trim()).then(function (n) { c = n; draw(); }); });
          b.appendChild(ap);
        }
        if (c.mine && (c.decision || c.final)) {
          b.appendChild(el('h3', null, '★ ' + t('case.rate')));
          var row2 = el('div', 'starrow');
          for (var i = 1; i <= 5; i++) (function (n) {
            var s = el('button', 'star' + (c.rating >= n ? ' on' : ''), '★'); s.type = 'button';
            s.setAttribute('aria-label', t('rate.stars', { n: n }));
            s.addEventListener('click', function () { Net.judge.rate(c.id, n).then(function (x) { c = x; draw(); Shell.toast(t('rate.thanks')); }); });
            row2.appendChild(s);
          })(i);
          b.appendChild(row2);
        }
      }
      draw();
      return Shell.closed(sh.dlg);
    });
  }
  function factsBox(A, lang) {
    var box = el('details', 'factsbox');
    box.appendChild(el('summary', null, t('case.facts')));
    box.appendChild(el('p', 'small', MBG.WhoFacts ? MBG.WhoFacts.line(A, lang) : ''));
    var name = MBG.WhoText.labelIn(A, lang);
    var a = el('a', 'linkbtn', '📖 ' + t('card.wiki'));
    a.href = A.wiki && A.wiki[lang] ? 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(A.wiki[lang]) : 'https://' + lang + '.wikipedia.org/w/index.php?search=' + encodeURIComponent(name);
    a.target = '_blank'; a.rel = 'noopener';
    box.appendChild(a);
    return box;
  }
  function decideForm(b, c, admin, done) {
    b.appendChild(el('h3', null, admin ? '🛡️ ' + t('case.adminDecide') : '✍️ ' + t('case.decide')));
    var pick = null;
    var list = el('div', 'decide-list');
    DECISIONS.forEach(function (d) {
      var r = el('label', 'decide-opt');
      var inp = el('input'); inp.type = 'radio'; inp.name = 'dec'; inp.value = d;
      inp.addEventListener('change', function () { pick = d; });
      r.appendChild(inp); r.appendChild(el('span', null, t('dec.' + d)));
      list.appendChild(r);
    });
    b.appendChild(list);
    var ta = el('textarea', 'textfield'); ta.rows = 3; ta.maxLength = 1000; ta.placeholder = t('case.explain');
    b.appendChild(ta);
    var go = el('button', 'btn submit', t('case.send')); go.type = 'button';
    go.addEventListener('click', function () {
      if (!pick) { Shell.toast(t('case.pick')); return; }
      if (ta.value.trim().length < 5) { Shell.toast(t('case.needReason')); return; }
      (admin ? Net.admin.decide(c.id, pick, ta.value.trim()) : Net.judge.decide(c.id, pick, ta.value.trim())).then(function (x) {
        // community judges earn credits for their time (paid edition, 3 cases a day)
        var n = !admin && MBG.Plan ? MBG.Plan.rewardJudge(c.id) : 0;
        if (n) Shell.toast('🪙 +' + n + ' · ' + Shell.t('shop.why.judge'));
        return done(x);
      });
    });
    b.appendChild(go);
  }

  /* ---------------------------------------------------- starting a dispute --- */
  /** From the game: o = { view, round, turn, me } → the dispute form. */
  function dispute(o) {
    var r = o.round, turn = o.turn;
    var sh = Shell.sheet({ id: 'dlgDispute', title: '⚑ ' + t('disp.title') });
    var b = sh.body;
    b.appendChild(el('p', null, t('disp.intro')));
    var q = el('div', 'kv');
    var row = el('div', 'kv-row'); row.appendChild(el('span', null, '“' + turn.q + '”')); row.appendChild(badge(turn.code)); q.appendChild(row);
    b.appendChild(q);
    var types = ['wrong', 'both', 'unknown', 'ambiguous', 'guess', 'answer'];
    var pick = 'wrong';
    var list = el('div', 'decide-list');
    types.forEach(function (ty, i) {
      var lab = el('label', 'decide-opt');
      var inp = el('input'); inp.type = 'radio'; inp.name = 'dt'; inp.value = ty; if (!i) inp.checked = true;
      inp.addEventListener('change', function () { pick = ty; });
      lab.appendChild(inp); lab.appendChild(el('span', null, t('disp.t.' + ty)));
      list.appendChild(lab);
    });
    b.appendChild(list);
    var ta = el('textarea', 'textfield'); ta.rows = 3; ta.maxLength = 800; ta.placeholder = t('disp.ph');
    b.appendChild(ta);
    b.appendChild(el('p', 'muted small', t('disp.note')));
    var go = el('button', 'btn submit', t('disp.send')); go.type = 'button';
    go.addEventListener('click', function () {
      if (ta.value.trim().length < 5) { Shell.toast(t('case.needReason')); return; }
      go.disabled = true;
      var ctx = r.turns.filter(function (x) { return x.id < turn.id && x.code; }).map(function (x) { return { q: x.q, code: x.code }; });
      Net.disputes.create({ matchId: o.view.vsComputer ? null : o.view.id, round: r.index, turn: turn.id, type: pick, reason: ta.value.trim(), lang: o.view.lang,
        cat: o.view.cat, catName: MBG.WhoCats.CATS[o.view.cat] ? MBG.WhoCats.name(MBG.WhoCats.CATS[o.view.cat], o.view.lang) : '', question: turn.q, response: turn.code,
        answer: r.answer, context: ctx }).then(function (c) {
        sh.close();
        Shell.toast(t('disp.sent', { ref: c.ref }));
        if (o.onDone) o.onDone(c);
      }, function () { go.disabled = false; Shell.toast(t('board.failed')); });
    });
    b.appendChild(go);
    return Shell.closed(sh.dlg);
  }

  MBG.Judge = { open: open, openCase: openCase, dispute: dispute, DECISIONS: DECISIONS };
})(typeof self !== 'undefined' ? self : globalThis);
