/*!
 * MBG Games - ratings: players rate each MBG game and MBG Games as a whole, 1 to 5 stars with an
 * optional comment. One rating per player and target, which can be changed. Averages are shown
 * only from real ratings on the server - never invented; in demo mode only your own rating.
 * Judgments are rated in the case page (judge.js), which feeds the judge's average stars.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var el = Shell.el, t = Shell.t;
  var ASKED = 'MBG.Who.rateAsked';

  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= Math.round(n) ? '★' : '☆'; return s; }
  function summary(target) {
    return Net.ratings.get(target).then(function (r) {
      if (r.count) return stars(r.avg) + ' ' + r.avg.toFixed(1) + ' (' + r.count + ')';
      if (r.mine) return t('rate.yours') + ' ' + stars(r.mine.stars);
      return '';
    }).catch(function () { return ''; });
  }
  /** Target: a game id ('whoami', 'puzzles') or 'platform'. */
  function open(target) {
    return Net.ratings.get(target).then(function (r) {
      var val = r.mine ? r.mine.stars : 0;
      var title = target === 'platform' ? t('rate.platform') : t('rate.gameNamed', { game: t('game.' + target) });
      var sh = Shell.sheet({ id: 'dlgRate', title: '★ ' + title });
      var b = sh.body;
      b.appendChild(el('p', null, t(target === 'platform' ? 'rate.platformText' : 'rate.gameText')));
      var row = el('div', 'starrow');
      row.setAttribute('role', 'radiogroup');
      var btns = [];
      for (var i = 1; i <= 5; i++) (function (n) {
        var s = el('button', 'star', '★');
        s.type = 'button';
        s.setAttribute('role', 'radio');
        s.setAttribute('aria-label', t('rate.stars', { n: n }));
        s.addEventListener('click', function () { val = n; paint(); });
        btns.push(s); row.appendChild(s);
      })(i);
      function paint() { btns.forEach(function (s, i) { s.classList.toggle('on', i < val); s.setAttribute('aria-checked', i + 1 === val ? 'true' : 'false'); }); }
      paint();
      b.appendChild(row);
      var ta = el('textarea', 'textfield');
      ta.rows = 3; ta.maxLength = 500; ta.placeholder = t('rate.comment');
      if (r.mine && r.mine.comment) ta.value = r.mine.comment;
      b.appendChild(ta);
      if (r.count) b.appendChild(el('p', 'muted small', t('rate.avg', { avg: r.avg.toFixed(1), n: r.count })));
      else if (Net.demo) b.appendChild(el('p', 'muted small', '🧪 ' + t('demo.ratings')));
      var ok = el('button', 'btn submit', t('rate.send'));
      ok.type = 'button';
      ok.addEventListener('click', function () {
        if (!val) { Shell.toast(t('rate.pick')); return; }
        Net.ratings.set(target, val, ta.value.trim()).then(function () { sh.close(); Shell.toast(t('rate.thanks')); });
      });
      b.appendChild(ok);
      return Shell.closed(sh.dlg);
    });
  }
  /** After the 3rd finished match, once: "Enjoying Who Am I?" */
  function maybeAsk(matches) {
    if (matches < 3 || Shell.readJson(ASKED, false)) return;
    Shell.writeJson(ASKED, true);
    setTimeout(function () { open(MBG.GAME_ID); }, 600);
  }
  MBG.Ratings = { open: open, summary: summary, stars: stars, maybeAsk: maybeAsk };
})(typeof self !== 'undefined' ? self : globalThis);
