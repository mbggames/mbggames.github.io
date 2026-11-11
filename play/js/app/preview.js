/*!
 * MBG Puzzles - web preview (mbggames.com/puzzles/play/).
 *
 * What it changes on top of the free edition:
 *   - one free game of Codebreaker and one of Word Puzzle every 24 hours (access.js with
 *     no free week); the puzzles of the day stay free and unlimited as in the app
 *   - a "Web preview" strip on every screen and a preview card on the home screen
 *   - instead of the subscription screen: a sheet that points to Google Play
 *     ("Join the test" while the app is not out yet, "Get it on Google Play" afterwards)
 * The switches (playStatus, playUrl, testUrl) are in js/app/edition.js.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG;
  var CFG = MBG.PREVIEW || {};
  var Shell = MBG.Shell;

  // A language picked on the website (play/?lang=sq) is used when the player has not chosen one.
  try {
    var m = /[?&]lang=([a-z]{2})\b/.exec(root.location.search);
    if (m && MBG.AppText.LANGS.indexOf(m[1]) !== -1 && !root.localStorage.getItem(Shell.KEYS.lang)) Shell.setLang(m[1]);
  } catch (e) { /* storage blocked: the phone's language is used */ }

  var T = {
    en: { review: "MBG Puzzles has passed its test and is in review by Google – coming soon to Google Play, free for about the first month. This web preview is available for a limited time.",
      title: 'Web preview', strip: 'Web preview · the full app is coming to Google Play',
      plan: 'Puzzles of the day + one free game of each game a day.',
      lock: function (p) { return 'Today’s free web game of ' + p.game + ' is played. The next one starts in ' + p.time + '. The puzzles of the day are still open on the home screen.'; },
      soon: 'The full app is coming to Google Play: both games without limits, in eleven languages, also offline.',
      live: 'The full app is on Google Play: both games without limits, in eleven languages, also offline.',
      join: 'Join the test', joinNote: 'Send us the Gmail address you use on Google Play – we add you to the test group.',
      wa: 'Hello, I would like to join the MBG Puzzles test. My Gmail address: ',
      app: 'Get the app', play: 'Get it on Google Play', email: 'E-mail', close: 'Close', reg: 'Already added? Register as a tester on Google Play' },
    sq: { review: "MBG Puzzles e kaloi testin dhe është në shqyrtim nga Google – së shpejti në Google Play, falas për rreth muajin e parë. Ky version në web është vetëm për një kohë të kufizuar.",
      title: 'Version prove në web', strip: 'Version prove në web · aplikacioni i plotë vjen së shpejti në Google Play',
      plan: 'Lojërat e ditës + një lojë falas e secilës lojë në ditë.',
      lock: function (p) { return 'Loja falas e sotme në web e ' + p.game + ' u luajt. E radhës fillon pas ' + p.time + '. Lojërat e ditës janë ende të hapura në faqen kryesore.'; },
      soon: 'Aplikacioni i plotë vjen në Google Play: të dyja lojërat pa kufi, në njëmbëdhjetë gjuhë, edhe pa internet.',
      live: 'Aplikacioni i plotë është në Google Play: të dyja lojërat pa kufi, në njëmbëdhjetë gjuhë, edhe pa internet.',
      join: 'Bashkohu me testin', joinNote: 'Na dërgo adresën Gmail që përdor në Google Play – të shtojmë në grupin e testit.',
      wa: 'Përshëndetje, dua të bashkohem me testin e MBG Puzzles. Adresa ime Gmail: ',
      app: 'Merr aplikacionin', play: 'Shkarko nga Google Play', email: 'E-mail', close: 'Mbyll', reg: 'Të kemi shtuar? Regjistrohu si testues në Google Play' },
    bs: { review: "MBG Puzzles je prošao test i na pregledu je kod Googlea – uskoro na Google Playu, besplatno otprilike prvi mjesec. Ova web verzija je dostupna samo ograničeno vrijeme.",
      title: 'Web verzija za probu', strip: 'Web verzija za probu · puna aplikacija uskoro na Google Playu',
      plan: 'Zagonetke dana + jedna besplatna partija svake igre dnevno.',
      lock: function (p) { return 'Današnja besplatna web partija igre ' + p.game + ' je odigrana. Sljedeća počinje za ' + p.time + '. Zagonetke dana su i dalje otvorene na početnom ekranu.'; },
      soon: 'Puna aplikacija uskoro stiže na Google Play: obje igre bez ograničenja, na jedanaest jezika, i bez interneta.',
      live: 'Puna aplikacija je na Google Playu: obje igre bez ograničenja, na jedanaest jezika, i bez interneta.',
      join: 'Pridruži se testu', joinNote: 'Pošalji nam Gmail adresu koju koristiš na Google Playu – dodat ćemo te u grupu za testiranje.',
      wa: 'Zdravo, želim se pridružiti testu MBG Puzzles. Moja Gmail adresa: ',
      app: 'Preuzmi aplikaciju', play: 'Preuzmi na Google Playu', email: 'E-mail', close: 'Zatvori', reg: 'Već si dodan? Prijavi se kao tester na Google Playu' },
    de: { review: "MBG Puzzles hat den Test bestanden und wird von Google geprüft – bald bei Google Play, etwa den ersten Monat kostenlos. Diese Web-Vorschau gibt es nur für begrenzte Zeit.",
      title: 'Web-Vorschau', strip: 'Web-Vorschau · die volle App kommt bald auf Google Play',
      plan: 'Rätsel des Tages + ein Gratisspiel pro Spiel am Tag.',
      lock: function (p) { return 'Das heutige Gratisspiel ' + p.game + ' im Web ist gespielt. Das nächste beginnt in ' + p.time + '. Die Rätsel des Tages sind auf dem Startbildschirm weiter offen.'; },
      soon: 'Die volle App kommt auf Google Play: beide Spiele ohne Grenzen, in elf Sprachen, auch offline.',
      live: 'Die volle App ist auf Google Play: beide Spiele ohne Grenzen, in elf Sprachen, auch offline.',
      join: 'Beim Test mitmachen', joinNote: 'Schick uns die Gmail-Adresse, die du bei Google Play nutzt – wir nehmen dich in die Testgruppe auf.',
      wa: 'Hallo, ich möchte beim Test von MBG Puzzles mitmachen. Meine Gmail-Adresse: ',
      app: 'App holen', play: 'Bei Google Play holen', email: 'E-Mail', close: 'Schließen', reg: 'Schon hinzugefügt? Als Tester bei Google Play anmelden' },
    es: { review: "MBG Puzzles ha superado la prueba y está en revisión por Google: muy pronto en Google Play, gratis durante aproximadamente el primer mes. Esta versión web es solo por tiempo limitado.",
      title: 'Vista previa web', strip: 'Vista previa web · la app completa llega pronto a Google Play',
      plan: 'Retos del día + una partida gratis de cada juego al día.',
      lock: function (p) { return 'La partida web gratis de hoy de ' + p.game + ' ya está jugada. La siguiente empieza en ' + p.time + '. Los retos del día siguen abiertos en la pantalla de inicio.'; },
      soon: 'La app completa llega a Google Play: los dos juegos sin límites, en once idiomas, también sin conexión.',
      live: 'La app completa está en Google Play: los dos juegos sin límites, en once idiomas, también sin conexión.',
      join: 'Únete a la prueba', joinNote: 'Envíanos la dirección de Gmail que usas en Google Play y te añadimos al grupo de prueba.',
      wa: 'Hola, quiero unirme a la prueba de MBG Puzzles. Mi dirección de Gmail: ',
      app: 'Consigue la app', play: 'Disponible en Google Play', email: 'Correo', close: 'Cerrar', reg: '¿Ya te añadimos? Regístrate como tester en Google Play' },
    fr: { review: "MBG Puzzles a réussi son test et est en cours d’examen par Google – bientôt sur Google Play, gratuit pendant environ le premier mois. Cette version web n’est disponible que pour une durée limitée.",
      title: 'Aperçu web', strip: 'Aperçu web · l’appli complète arrive bientôt sur Google Play',
      plan: 'Défis du jour + une partie gratuite de chaque jeu par jour.',
      lock: function (p) { return 'La partie web gratuite d’aujourd’hui de ' + p.game + ' est jouée. La suivante commence dans ' + p.time + '. Les défis du jour restent ouverts sur l’écran d’accueil.'; },
      soon: 'L’appli complète arrive sur Google Play : les deux jeux sans limite, en onze langues, même hors ligne.',
      live: 'L’appli complète est sur Google Play : les deux jeux sans limite, en onze langues, même hors ligne.',
      join: 'Rejoindre le test', joinNote: 'Envoie-nous l’adresse Gmail que tu utilises sur Google Play – nous t’ajoutons au groupe de test.',
      wa: 'Bonjour, je voudrais rejoindre le test de MBG Puzzles. Mon adresse Gmail : ',
      app: 'Obtenir l’appli', play: 'Disponible sur Google Play', email: 'E-mail', close: 'Fermer', reg: 'Déjà ajouté ? Inscris-toi comme testeur sur Google Play' },
    tr: { review: "MBG Puzzles testi geçti ve Google tarafından inceleniyor – çok yakında Google Play’de, yaklaşık ilk ay ücretsiz. Bu web sürümü yalnızca sınırlı bir süre için var.",
      title: 'Web önizlemesi', strip: 'Web önizlemesi · uygulamanın tamamı yakında Google Play’de',
      plan: 'Günün bulmacaları + her oyundan günde bir ücretsiz oyun.',
      lock: function (p) { return p.game + ' için bugünkü ücretsiz web oyunu oynandı. Sonraki ' + p.time + ' sonra başlıyor. Günün bulmacaları ana ekranda hâlâ açık.'; },
      soon: 'Uygulamanın tamamı Google Play’e geliyor: iki oyun da sınırsız, on bir dilde, internetsiz de.',
      live: 'Uygulamanın tamamı Google Play’de: iki oyun da sınırsız, on bir dilde, internetsiz de.',
      join: 'Teste katıl', joinNote: 'Google Play’de kullandığın Gmail adresini bize gönder, seni test grubuna ekleyelim.',
      wa: 'Merhaba, MBG Puzzles testine katılmak istiyorum. Gmail adresim: ',
      app: 'Uygulamayı al', play: 'Google Play’den indir', email: 'E-posta', close: 'Kapat', reg: 'Eklendin mi? Google Play’de test kullanıcısı olarak kaydol' },
    pl: { review: "MBG Puzzles zaliczyło test i jest sprawdzane przez Google – wkrótce w Google Play, darmowe przez mniej więcej pierwszy miesiąc. Ta wersja internetowa jest dostępna tylko przez ograniczony czas.",
      title: 'Wersja próbna w przeglądarce', strip: 'Wersja próbna w przeglądarce · pełna aplikacja wkrótce w Google Play',
      plan: 'Zagadki dnia + jedna darmowa rozgrywka w każdą grę dziennie.',
      lock: function (p) { return 'Dzisiejsza darmowa rozgrywka w ' + p.game + ' w przeglądarce została rozegrana. Następna zaczyna się za ' + p.time + '. Zagadki dnia są nadal otwarte na ekranie głównym.'; },
      soon: 'Pełna aplikacja trafi do Google Play: obie gry bez ograniczeń, w jedenastu językach, także offline.',
      live: 'Pełna aplikacja jest w Google Play: obie gry bez ograniczeń, w jedenastu językach, także offline.',
      join: 'Dołącz do testu', joinNote: 'Wyślij nam adres Gmail, którego używasz w Google Play – dodamy cię do grupy testowej.',
      wa: 'Dzień dobry, chcę dołączyć do testu MBG Puzzles. Mój adres Gmail: ',
      app: 'Pobierz aplikację', play: 'Pobierz z Google Play', email: 'E-mail', close: 'Zamknij', reg: 'Już dodany? Zapisz się jako tester w Google Play' },
    pt: { review: "O MBG Puzzles passou no teste e está em análise pelo Google – em breve no Google Play, grátis por cerca do primeiro mês. Esta versão web fica disponível só por tempo limitado.",
      title: 'Prévia na web', strip: 'Prévia na web · o app completo chega em breve ao Google Play',
      plan: 'Desafios do dia + uma partida grátis de cada jogo por dia.',
      lock: function (p) { return 'A partida grátis de hoje de ' + p.game + ' na web já foi jogada. A próxima começa em ' + p.time + '. Os desafios do dia continuam abertos na tela inicial.'; },
      soon: 'O app completo chega ao Google Play: os dois jogos sem limites, em onze idiomas, também offline.',
      live: 'O app completo está no Google Play: os dois jogos sem limites, em onze idiomas, também offline.',
      join: 'Participe do teste', joinNote: 'Envie o endereço do Gmail que você usa no Google Play – adicionamos você ao grupo de teste.',
      wa: 'Olá, quero participar do teste do MBG Puzzles. Meu endereço do Gmail: ',
      app: 'Baixe o app', play: 'Disponível no Google Play', email: 'E-mail', close: 'Fechar', reg: 'Já foi adicionado? Inscreva-se como testador no Google Play' },
    ar: { review: "اجتاز MBG Puzzles الاختبار وهو قيد المراجعة لدى Google – قريبًا على Google Play، مجانًا لنحو الشهر الأول. هذه النسخة على الويب متاحة لفترة محدودة فقط.",
      title: 'نسخة تجريبية على الويب', strip: 'نسخة تجريبية على الويب · التطبيق الكامل قريبًا على Google Play',
      plan: 'ألغاز اليوم + لعبة مجانية واحدة من كل لعبة يوميًا.',
      lock: function (p) { return 'لُعبت لعبة ' + p.game + ' المجانية لهذا اليوم على الويب. تبدأ اللعبة التالية بعد ' + p.time + '. ألغاز اليوم ما زالت متاحة في الشاشة الرئيسية.'; },
      soon: 'التطبيق الكامل قادم إلى Google Play: اللعبتان بلا حدود، بإحدى عشرة لغة، وحتى دون إنترنت.',
      live: 'التطبيق الكامل متوفر على Google Play: اللعبتان بلا حدود، بإحدى عشرة لغة، وحتى دون إنترنت.',
      join: 'انضم إلى الاختبار', joinNote: 'أرسل لنا عنوان Gmail الذي تستخدمه في Google Play وسنضيفك إلى مجموعة الاختبار.',
      wa: 'مرحبًا، أود الانضمام إلى اختبار MBG Puzzles. عنوان Gmail الخاص بي: ',
      app: 'احصل على التطبيق', play: 'احصل عليه من Google Play', email: 'البريد الإلكتروني', close: 'إغلاق', reg: 'هل أضفناك؟ سجّل كمختبِر على Google Play' },
    ko: { review: "MBG Puzzles는 테스트를 통과했고 Google 검토 중이에요 – 곧 Google Play에 나오고 약 한 달 동안 무료예요. 이 웹 미리보기는 한정된 기간에만 제공돼요.",
      title: '웹 미리보기', strip: '웹 미리보기 · 전체 앱은 곧 Google Play에 나와요',
      plan: '오늘의 퍼즐 + 게임마다 하루 한 판 무료.',
      lock: function (p) { return '오늘의 ' + p.game + ' 무료 웹 게임을 이미 했어요. 다음 게임은 ' + p.time + ' 뒤에 시작해요. 오늘의 퍼즐은 홈 화면에서 아직 플레이할 수 있어요.'; },
      soon: '전체 앱이 곧 Google Play에 나와요: 두 게임을 제한 없이, 11개 언어로, 오프라인으로도.',
      live: '전체 앱은 Google Play에 있어요: 두 게임을 제한 없이, 11개 언어로, 오프라인으로도.',
      join: '테스트 참여하기', joinNote: 'Google Play에서 쓰는 Gmail 주소를 보내 주세요. 테스트 그룹에 추가해 드릴게요.',
      wa: '안녕하세요, MBG Puzzles 테스트에 참여하고 싶어요. 제 Gmail 주소: ',
      app: '앱 받기', play: 'Google Play에서 받기', email: '이메일', close: '닫기', reg: '추가되셨나요? Google Play에서 테스터로 가입하세요' }
  };
  function p(key) { var l = T[Shell.getLang()] || T.en; return l[key] !== undefined ? l[key] : T.en[key]; }
  var live = CFG.playStatus === 'live';
  var review = CFG.playStatus === 'review';   // in review by Google: no test sign-up any more
  function note() { return live ? p('live') : review ? p('review') : p('soon'); }

  // The game screens use these app texts: point them to Google Play instead of plans.
  Object.keys(T).forEach(function (l) {
    var s = MBG.AppText.STRINGS[l];
    if (!s) return;
    s['btn.plans'] = T[l].app;
    s['lock.text'] = T[l].lock;
  });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ------------------------------------------------- the sheet --- */
  var dlg = null, resolveOpen = null;
  function close() { if (dlg && dlg.open) dlg.close(); }
  function open(opts) {
    opts = opts || {};
    if (dlg) dlg.remove();
    dlg = el('dialog', 'dlg pv-sheet');
    dlg.setAttribute('aria-labelledby', 'pvTitle');
    var body = el('div', 'dlg-body');
    var h = el('h2', null, p('title')); h.id = 'pvTitle';
    body.appendChild(h);
    if (opts.game && Shell.access.status(opts.game).mode === 'free' && !Shell.access.canStart(opts.game)) {
      var s = Shell.access.status(opts.game);
      body.appendChild(el('p', 'pv-lock', p('lock')({ game: Shell.gameName(opts.game), time: Shell.duration(s.msLeft || 0) })));
    }
    body.appendChild(el('p', null, note()));
    var acts = el('div', 'pv-actions');
    function link(cls, text, href) {
      var a = el('a', 'btn ' + cls, text); a.href = href; a.target = '_blank'; a.rel = 'noopener'; acts.appendChild(a); return a;
    }
    if (live) {
      link('submit', p('play'), CFG.playUrl);
    } else if (review) {
      // nothing to sign up for: the sheet only tells what is coming
    } else if (CFG.testUrl) {
      link('submit', p('join'), CFG.testUrl);
    } else {
      body.appendChild(el('p', 'muted pv-note', p('joinNote')));
      var c = Shell.CONTACT || {};
      // the message names both games: one test covers Codebreaker and Word Puzzle
      var msg = p('wa').replace('MBG Puzzles', 'MBG Puzzles (' + Shell.gameName('codebreaker') + ' + ' + Shell.gameName('word') + ')');
      link('submit', p('join') + ' · WhatsApp', 'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent(msg));
      link('ghost', p('email'), 'mailto:' + c.email + '?subject=' + encodeURIComponent('MBG Puzzles – test') + '&body=' + encodeURIComponent(msg));
      if (CFG.optInUrl) link('ghost', p('reg'), CFG.optInUrl);
    }
    body.appendChild(acts);
    var x = el('button', 'btn ghost pv-close', p('close')); x.type = 'button';
    x.addEventListener('click', close);
    body.appendChild(x);
    dlg.appendChild(body);
    document.body.appendChild(dlg);
    return new Promise(function (res) {
      resolveOpen = res;
      dlg.addEventListener('close', function () { var r = resolveOpen; resolveOpen = null; if (r) r(); });
      dlg.showModal();
    });
  }

  var original = MBG.Paywall || {};
  MBG.Paywall = {
    open: open, close: close,
    isOpen: function () { return !!(dlg && dlg.open); },
    toast: original.toast || function () {}
  };

  /* ------------------------------------------ strip and home card --- */
  function addStrip() {
    var host = document.getElementById('boardcard') || document.getElementById('home');
    if (!host || document.getElementById('pvStrip')) return;
    var b = el('button', 'pv-strip', p('strip')); b.type = 'button'; b.id = 'pvStrip';
    b.addEventListener('click', function () { open({}); });
    host.insertBefore(b, host.firstChild);
  }
  function planCard(card) {
    card.classList.add('is-free', 'pv-card');
    document.getElementById('planK').textContent = p('title');
    document.getElementById('planTitle').textContent = p('plan');
    document.getElementById('planSub').textContent = note();
    var btn = document.getElementById('btnPlans');
    btn.hidden = false;
    btn.textContent = live ? p('play') : review ? p('app') : p('join');
    var promo = document.getElementById('promo'); if (promo) promo.hidden = true;
    var s = document.getElementById('pvStrip'); if (s) s.textContent = p('strip');
  }
  // ⏻ on the home screen leads back to the website instead of closing.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#btnExit');
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    root.location.href = '../' + (Shell.getLang() === 'en' ? '' : Shell.getLang() + '/');
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addStrip); else addStrip();

  MBG.Preview = { open: open, planCard: planCard, text: p };
})(typeof self !== 'undefined' ? self : globalThis);
