/*!
 * MBG Puzzles · Codebreaker - all user-facing text (English, Albanian, Bosnian, German, Spanish,
 * French, Turkish, Polish, Portuguese (Brazil) and Arabic). All languages address the player
 * informally (ti, du, tú, tu, sen, ty, você, أنت), as
 * FR-LANG-004 asks for Albanian and Bosnian. Bosnian is ijekavian and written in the Latin
 * script only.
 * To change a caption or message, edit it here; no screen code needs to change.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.I18n = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function pl(n, one, many) { return Number(n) === 1 ? one : many; }
  /** French: 0 and 1 take the singular (0 essai, 1 essai, 2 essais). */
  function plFr(n, one, many) { return Math.abs(Number(n)) < 2 ? one : many; }
  /** Polish: 1 one · 2–4, 22–24 … (not 12–14) few · everything else many (21 prób). */
  function plPl(n, one, few, many) {
    n = Math.abs(Number(n)) || 0;
    if (n === 1) return one;
    var d = n % 10, h = n % 100;
    return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
  }
  /**
   * Arabic: the count with its noun. 1 and 2 are said with the noun alone (one: محاولة واحدة,
   * two: محاولتان); 3–10 take the plural (few: 3 محاولات); 11 and more the singular (other: 11 محاولة).
   */
  function arN(n, one, two, few, other) {
    n = Math.abs(Number(n)) || 0;
    if (n === 1) return one;
    if (n === 2) return two;
    var h = n % 100;
    return n + ' ' + (h >= 3 && h <= 10 ? few : other);
  }
  /** Bosnian: 1, 21, 31 … one · 2–4, 22–24 … few · everything else many. */
  function plBs(n, one, few, many) {
    n = Math.abs(Number(n)) || 0;
    var d = n % 10, h = n % 100;
    if (d === 1 && h !== 11) return one;
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
    return many;
  }
  function cif(n) { return plBs(n, 'cifru', 'cifre', 'cifara'); }

  var STRINGS = {
    en: {
      'app.title': 'Codebreaker',
      'app.by': 'MBG Puzzles · by MBG',

      /* control captions (section 7 of the specification) */
      'btn.submit': 'Submit',
      'btn.help': 'Help',
      'btn.quit': 'Quit',
      'btn.user': 'User',
      'btn.login': 'Log in',
      'btn.logout': 'Log out',
      'btn.settings': 'Settings',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Toggle Background',
      'btn.reveal': 'Reveal Number',
      'btn.newGame': 'New Game',
      'btn.length': function (p) { return 'Switch to ' + p.n + '-digit'; },
      'btn.close': 'Close',
      'aria.fontUp': 'Larger text',
      'aria.fontDown': 'Smaller text',
      'aria.length': function (p) { return 'Number length: ' + p.n + ' digits. Change'; },
      'aria.history': 'Game board',
      'aria.user': function (p) { return 'User: ' + p.name; },

      /* status line */
      'status.anonymous': 'Anonymous',
      'status.noData': 'Not saving',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'second', 'seconds'); },
      'len.chip': function (p) { return p.n + ' digits'; },

      /* input */
      'label.play': function (p) { return 'Enter a ' + p.n + '-digit number or a command'; },
      'label.yesno': 'Do you want to play another game? Y/N',
      'ph.play': function (p) { return 'Type ' + (p.n === 8 ? 'an ' : 'a ') + p.n + '-digit number'; },
      'ph.yesno': 'Play again? Y / N',

      /* short messages */
      'notice.storageUnavailable': 'This browser does not let the game save scores.',
      'notice.loggedIn': function (p) { return 'Welcome back, ' + p.name + '! Your best: ' + p.best; },
      'notice.registered': function (p) { return 'Welcome, ' + p.name + '!'; },
      'notice.noData': 'Playing without saving',
      'notice.anonymous': 'Playing as Anonymous',
      'notice.restored': 'Your game was restored',
      'warn.empty': function (p) { return 'Type ' + (p.length === 8 ? 'an ' : 'a ') + p.length + '-digit number.'; },
      'reveal.what': 'the whole number',
      'hint.btn': 'Hint',
      'hint.what': 'one more digit',
      'hint.shown': function (p) { return 'Hint ' + p.number + ': digit ' + p.pos + ' is ' + p.ch; },
      'warn.noHint': 'No more hints – the rest is up to you.',
      'win.hints': function (p) { return 'With ' + p.n + ' ' + pl(p.n, 'hint', 'hints') + ' – each counts as ' + p.k + ' tries in the score.'; },
      'warn.digits': 'Digits only (0–9), please. This try was not counted.',
      'warn.length': function (p) { return 'Your number has ' + p.got + ' ' + pl(p.got, 'digit', 'digits') + '; this game needs ' + p.length + '. Not counted.'; },
      'warn.roundOver': 'Game over. Type Y to play again or N to go back to the games.',

      /* round end */
      'win.title': 'CONGRATULATIONS!',
      'win.titleName': function (p) { return 'CONGRATULATIONS, ' + p.name + '!'; },
      'win.found': function (p) { return 'You found ' + p.word + ' in ' + p.attempts + ' ' + pl(p.attempts, 'try', 'tries') + ' and ' + p.seconds + ' ' + pl(p.seconds, 'second', 'seconds') + '.'; },
      'win.luck': 'What luck! First try!',
      'score.label': 'Score',
      'score.yourBest': 'Your best',
      'score.allTime': 'All-time best',
      'score.newBest': 'New record!',
      'score.newAllTime': 'All-time record!',
      'score.notSaved': 'Not saved',
      'reveal.text': 'Better luck next time!',
      'reveal.word': function (p) { return 'The secret number was ' + p.word + '.'; },

      /* dialogs */
      'dlg.cancel': 'Cancel',
      'restart.title': 'Start a new game?',
      'restart.length': function (p) { return 'Switching to ' + p.n + '-digit numbers ends this game. It will not be scored.'; },
      'restart.ok': 'New game',
      'login.title': 'Log in',
      'login.lede': 'Log in to keep your own high score.',
      'login.label': 'Username',
      'login.saved': 'Your saved names',
      'login.other': 'Or type a name',
      'login.pick': function (p) { return 'Log in as ' + p.name + ', best score ' + p.best; },
      'login.submit': 'Log in',
      'login.create': function (p) { return 'Create “' + p.name + '”'; },
      'login.unknown': function (p) { return 'There is no user “' + p.name + '” yet. Create it?'; },
      'login.empty': 'Type a username.',
      'login.invalid': 'Use 2–20 letters or digits (spaces, dots, hyphens allowed).',
      'login.reserved': function (p) { return '“' + p.name + '” is reserved. Choose another name.'; },
      'login.noData': 'Play without saving',
      'login.anonymous': 'Save scores as Anonymous',
      'account.best': function (p) { return 'Your highest score: ' + p.best; },
      'settings.title': 'Settings',
      'settings.sound': 'Sound',
      'settings.background': 'Background',
      'settings.textSize': 'Text size',
      'goodbye.title': 'Thank you for playing!',
      'goodbye.text': 'We hope you enjoyed the game. Come back soon for another round!',
      'goodbye.sign': 'With best wishes from MBG · Merkur Beqiri Games',
      'goodbye.again': 'Play again',
      'goodbye.close': 'You can now close this window.',
      'wheel.title': 'Number length',
      'wheel.done': 'Done',
      'wheel.item': function (p) { return p.n + ' digits'; },
      'help.title': 'How to play',

      /* toasts */
      'toast.font': function (p) { return 'Text size: ' + p.px + ' px'; },
      'toast.fontMax': 'This is the largest text size.',
      'toast.fontMin': 'This is the smallest text size.',
      'theme.light': 'Light',
      'theme.dark': 'Dark',
      'theme.adriatic': 'Adriatic',
      'theme.meadow': 'Meadow',
      'theme.rose': 'Rose',
      'theme.random': 'Random colours',

      'last.try': function (p) { return 'Try ' + p.n; },
      'sr.guess': function (p) { return 'Try ' + p.attempt + ': ' + p.word + '. Clues: ' + p.clues; },
      'legend.O': 'right digit, right place',
      'legend.Q': 'in the number, wrong place',
      'legend.X': 'not in the number',

      'help.html': function (c) {
        return '' +
          '<h3>The goal</h3><p>The computer picks a secret number at random: 4 digits to start with, or 5, 6, 7 or 8 if you choose. Digits can repeat and the number can start with 0, so there are 10,000 possible 4-digit numbers. Find it in as few tries as possible.</p>' +
          '<h3>Reading the clues</h3><p>After each try, every digit of your number gets a clue, in the same order:</p>' + c.legend +
          '<p class="example">Example: the secret number is 1234 and you type 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Repeated digits are counted carefully. Secret number 7703, guess 1777 → <code>X O ? X</code>. Your second 7 is in the right place. Your third 7 is in the number, but somewhere else (the secret’s other 7). There is no 7 left for your last digit, so it gets X.</p>' +
          '<h3>Making a guess</h3><p>Type a number with exactly the right number of digits and press <b>Submit</b> or Enter. On a phone, the number keypad opens; tap <b>Submit</b> to send your try. Digits may repeat. Numbers with too few or too many digits, or with letters or symbols, are not counted.</p>' +
          '<p class="example">Tip: start with 0123 and then 4567. Together they show which digits are in the number.</p>' +
          '<h3>Number length</h3><p>Play with 4, 5, 6, 7 or 8-digit numbers. Tap the length button (for example <b>4 digits</b>) next to the clock and pick a length. On a phone, swipe the wheel.</p>' +
          '<h3>Winning</h3><p>When every clue is O you have found the number. The O’s turn into hearts ❤️ and, with sound on, you hear the winning tune.</p>' +
          '<h3>Hints 💡</h3><p>Stuck? After your 3rd try, a light-bulb button appears next to the input. Each hint opens one more digit of the secret number, at a random place you have not found yet, and costs a hint credit (see ⚙ › Hint credits: free credits every day, more with high scores). A game never gives the whole number away: at least one digit is always left for you. Each hint counts like 2 extra tries in the score. The more tries fail, the more often the button wiggles to remind you it is there.</p>' +
          '<h3>Reveal Number</h3><p>Press <b>Reveal Number</b>, or type <code>reveal</code> or <code>zbulo</code>, to see the secret number. The game ends with a score of 0.</p>' +
          '<h3>Scoring</h3><p>The fewer tries you need, the higher your score: points drop exponentially with every extra try. A small speed bonus (up to 20%) rewards quick games.</p>' + c.scoreTable +
          '<p>Only your highest score and the all-time highest score are kept; there is no running total.</p>' +
          '<h3>Commands</h3>' + c.commandTable + '<p>Commands work in every language and ignore capital letters. On a phone the number keypad has no letters, so use the buttons instead.</p>' +
          '<h3>Users</h3><p>You start playing at once as <b>Anonymous</b>. Its high score is shared by everyone who plays on this device. To keep your own high score, tap <b>Log in</b> and type your username, or create a new one. Names you have used before are listed there, so logging in again is one tap. In the same window you can also choose to play without saving anything. Scores are kept on this device.</p>' +
          '<h3>Settings</h3><p>The ⚙ button holds the sound switch (tick-tock clock, a tone for each O and ?, and the winning tune, grander the higher the score), the background colours and the text size (A+ / A−).</p>' +
          '<h3>New game</h3><p>After a game, press <b>New Game</b> or type <code>Y</code>. Changing the number length during a game starts a new game after you confirm. Switching the language keeps your game.</p>' +
          '<h3>Back to the games</h3><p>Press <b>Quit</b>, the Back button or the MBG mark at the top left to return to the list of games. An unfinished game is kept and continues when you come back. To close the app, use the ⏻ button on the home screen.</p>';
      },
      'help.scoreHead': ['Length', 'Top score', 'Low score'],
      'help.scoreRow': function (p) { return [p.length + ' digits', p.hiScore + ' with ' + p.hiAttempt + ' tries', p.loScore + ' with ' + p.loAttempt + ' tries']; },
      'help.cmdHead': ['Type', 'What it does'],
      'help.cmdRows': [
        ['help · rules · rregullat · pomoć', 'Open these instructions'],
        ['reveal · zbulo · otkrij', 'Show the secret number (score 0)'],
        ['quit · exit · fund · izlaz', 'Back to the game list'],
        ['Y / N', 'After a game: play again or back to the game list']
      ],
      'help.about': 'About',
      'about.version': 'MBG Puzzles 1.0 · Codebreaker. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Secret numbers are picked at random on this device: ' + p.min + ' possible numbers with 4 digits, up to ' + p.max + ' with 8.'; },
      'about.privacy': 'Plays offline. No account is needed: names and scores stay on this phone. Subscriptions are paid and managed through Google Play.',
      'about.privacyFree': 'Plays offline. Free, with no ads and no in-app purchases. Names and scores stay on this phone.'
    },

    sq: {
      'app.title': 'Thyej kodin',
      'app.by': 'MBG Puzzles · nga MBG',

      'btn.submit': 'Ok-Provo',
      'btn.help': 'Udhëzimet',
      'btn.quit': 'Dil',
      'btn.user': 'Përdoruesi',
      'btn.login': 'Hyr',
      'btn.logout': 'Dil nga llogaria',
      'btn.settings': 'Cilësimet',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Sfondi',
      'btn.reveal': 'Zbulo Numrin',
      'btn.newGame': 'Lojë e Re',
      'btn.length': function (p) { return 'Kalo në ' + p.n + ' shifra'; },
      'btn.close': 'Mbyll',
      'aria.fontUp': 'Tekst më i madh',
      'aria.fontDown': 'Tekst më i vogël',
      'aria.length': function (p) { return 'Gjatësia e numrit: ' + p.n + ' shifra. Ndrysho'; },
      'aria.history': 'Fusha e lojës',
      'aria.user': function (p) { return 'Përdoruesi: ' + p.name; },

      'status.anonymous': 'Anonim',
      'status.noData': 'Pa ruajtje',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'sekondë', 'sekonda'); },
      'len.chip': function (p) { return p.n + ' shifra'; },

      'label.play': function (p) { return 'Shkruaj një numër me ' + p.n + ' shifra ose një komandë'; },
      'label.yesno': 'Dëshiron të luash edhe një lojë? Y/N',
      'ph.play': function (p) { return 'Numër me ' + p.n + ' shifra'; },
      'ph.yesno': 'Edhe një lojë? Y / N',

      'notice.storageUnavailable': 'Ky shfletues nuk e lejon lojën të ruajë rezultatet.',
      'notice.loggedIn': function (p) { return 'Mirë se u ktheve, ' + p.name + '! Më i miri yt: ' + p.best; },
      'notice.registered': function (p) { return 'Mirë se erdhe, ' + p.name + '!'; },
      'notice.noData': 'Po luan pa ruajtur',
      'notice.anonymous': 'Po luan si Anonim',
      'notice.restored': 'Loja jote u rikthye',
      'warn.empty': function (p) { return 'Shkruaj një numër me ' + p.length + ' shifra.'; },
      'reveal.what': 'të gjithë numrin',
      'hint.btn': 'Sugjerim',
      'hint.what': 'edhe një shifër',
      'hint.shown': function (p) { return 'Sugjerimi ' + p.number + ': shifra ' + p.pos + ' është ' + p.ch; },
      'warn.noHint': 'S’ka më sugjerime – pjesën tjetër e gjen ti.',
      'win.hints': function (p) { return 'Me ' + p.n + ' ' + pl(p.n, 'sugjerim', 'sugjerime') + ' – secili llogaritet si ' + p.k + ' prova në pikë.'; },
      'warn.digits': 'Vetëm shifra (0–9), të lutem. Kjo provë nuk u numërua.',
      'warn.length': function (p) { return 'Numri yt ka ' + p.got + ' ' + pl(p.got, 'shifër', 'shifra') + '; kjo lojë kërkon ' + p.length + '. Nuk u numërua.'; },
      'warn.roundOver': 'Loja mbaroi. Shkruaj Y për të luajtur përsëri ose N për t’u kthyer te lojërat.',

      'win.title': 'URIME!',
      'win.titleName': function (p) { return 'URIME, ' + p.name + '!'; },
      'win.found': function (p) { return 'E gjete ' + p.word + ' me ' + p.attempts + ' ' + pl(p.attempts, 'provë', 'prova') + ' për ' + p.seconds + ' ' + pl(p.seconds, 'sekondë', 'sekonda') + '.'; },
      'win.luck': 'Çfarë fati! Që në provën e parë!',
      'score.label': 'Pikët',
      'score.yourBest': 'Më i miri yt',
      'score.allTime': 'Më i miri ndonjëherë',
      'score.newBest': 'Rekord i ri!',
      'score.newAllTime': 'Rekord i të gjitha kohërave!',
      'score.notSaved': 'Nuk ruhet',
      'reveal.text': 'Më shumë fat herën tjetër!',
      'reveal.word': function (p) { return 'Numri i fshehtë ishte ' + p.word + '.'; },

      'dlg.cancel': 'Anulo',
      'restart.title': 'Të nisë një lojë e re?',
      'restart.length': function (p) { return 'Kalimi në numra me ' + p.n + ' shifra e mbyll këtë lojë. Ajo nuk do të vlerësohet.'; },
      'restart.ok': 'Lojë e re',
      'login.title': 'Hyr',
      'login.lede': 'Hyr për të ruajtur rezultatin tënd më të lartë.',
      'login.label': 'Emri i përdoruesit',
      'login.saved': 'Emrat e ruajtur',
      'login.other': 'Ose shkruaj një emër',
      'login.pick': function (p) { return 'Hyr si ' + p.name + ', rezultati më i lartë ' + p.best; },
      'login.submit': 'Hyr',
      'login.create': function (p) { return 'Krijo “' + p.name + '”'; },
      'login.unknown': function (p) { return 'Ende nuk ka përdorues “' + p.name + '”. Ta krijosh?'; },
      'login.empty': 'Shkruaj emrin e përdoruesit.',
      'login.invalid': 'Përdor 2–20 shkronja ose shifra (lejohen hapësira, pika, viza).',
      'login.reserved': function (p) { return '“' + p.name + '” është i rezervuar. Zgjidh një emër tjetër.'; },
      'login.noData': 'Luaj pa ruajtur',
      'login.anonymous': 'Ruaj rezultatet si Anonim',
      'account.best': function (p) { return 'Rezultati yt më i lartë: ' + p.best; },
      'settings.title': 'Cilësimet',
      'settings.sound': 'Zëri',
      'settings.background': 'Sfondi',
      'settings.textSize': 'Madhësia e tekstit',
      'goodbye.title': 'Faleminderit që luajte!',
      'goodbye.text': 'Shpresojmë që të pëlqeu loja. Eja përsëri së shpejti për një lojë tjetër!',
      'goodbye.sign': 'Me përshëndetje të përzemërta nga MBG · Merkur Beqiri Games',
      'goodbye.again': 'Luaj përsëri',
      'goodbye.close': 'Tani mund ta mbyllësh këtë dritare.',
      'wheel.title': 'Gjatësia e numrit',
      'wheel.done': 'Gati',
      'wheel.item': function (p) { return p.n + ' shifra'; },
      'help.title': 'Si të luash',

      'toast.font': function (p) { return 'Madhësia e tekstit: ' + p.px + ' px'; },
      'toast.fontMax': 'Kjo është madhësia më e madhe e tekstit.',
      'toast.fontMin': 'Kjo është madhësia më e vogël e tekstit.',
      'theme.light': 'E çelët',
      'theme.dark': 'E errët',
      'theme.adriatic': 'Adriatik',
      'theme.meadow': 'Livadh',
      'theme.rose': 'Trëndafil',
      'theme.random': 'Ngjyra të rastit',

      'last.try': function (p) { return 'Prova ' + p.n; },
      'sr.guess': function (p) { return 'Prova ' + p.attempt + ': ' + p.word + '. Ndihmat: ' + p.clues; },
      'legend.O': 'shifra e duhur, në vendin e duhur',
      'legend.Q': 'është në numër, por në vend tjetër',
      'legend.X': 'nuk është në numër',

      'help.html': function (c) {
        return '' +
          '<h3>Qëllimi</h3><p>Kompjuteri zgjedh rastësisht një numër të fshehtë: me 4 shifra në fillim, ose me 5, 6, 7 a 8 shifra po ta zgjedhësh. Shifrat mund të përsëriten dhe numri mund të fillojë me 0, prandaj ka 10 000 numra të mundshëm me 4 shifra. Gjeje me sa më pak prova.</p>' +
          '<h3>Si t’i lexosh ndihmat</h3><p>Pas çdo prove, secila shifër e numrit tënd merr një ndihmë, në të njëjtin rend:</p>' + c.legend +
          '<p class="example">Shembull: numri i fshehtë është 1234 dhe ti shkruan 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Shifrat e përsëritura numërohen me kujdes. Numri i fshehtë 7703, prova 1777 → <code>X O ? X</code>. 7-a jote e dytë është në vendin e duhur. 7-a e tretë është në numër, por në vend tjetër (7-a tjetër e numrit të fshehtë). Për shifrën e fundit nuk mbetet më asnjë 7, prandaj merr X.</p>' +
          '<h3>Si të provosh</h3><p>Shkruaj një numër me saktësisht aq shifra dhe shtyp <b>Ok-Provo</b> ose Enter. Në telefon hapet tastiera e numrave; prek <b>Ok-Provo</b> për ta dërguar provën. Shifrat mund të përsëriten. Numrat me më pak ose më shumë shifra, ose me shkronja e simbole, nuk numërohen.</p>' +
          '<p class="example">Këshillë: fillo me 0123 dhe pastaj 4567. Bashkë të tregojnë cilat shifra janë në numër.</p>' +
          '<h3>Gjatësia e numrit</h3><p>Mund të luash me numra me 4, 5, 6, 7 ose 8 shifra. Prek butonin e gjatësisë (p.sh. <b>4 shifra</b>) pranë orës dhe zgjidh gjatësinë. Në telefon, rrotullo rrotën.</p>' +
          '<h3>Fitorja</h3><p>Kur të gjitha ndihmat janë O, e ke gjetur numrin. O-të kthehen në zemra ❤️ dhe, nëse zëri është i ndezur, dëgjon melodinë e fitores.</p>' +
          '<h3>Sugjerimet 💡</h3><p>Ke ngecur? Pas provës së 3-të, pranë fushës shfaqet një buton me llambë. Çdo sugjerim hap edhe një shifër të numrit të fshehtë, në një vend të rastësishëm që nuk e ke gjetur ende, dhe kushton një kredit (shih ⚙ › Kreditet për sugjerime: kredite falas çdo ditë, edhe më shumë me pikë të larta). Loja nuk e jep kurrë të gjithë numrin: të paktën një shifër mbetet gjithmonë për ty. Çdo sugjerim llogaritet si 2 prova shtesë në pikë. Sa më shumë prova të gabuara, aq më shpesh butoni lëviz që të të kujtojë se është aty.</p>' +
          '<h3>Zbulo Numrin</h3><p>Shtyp <b>Zbulo Numrin</b>, ose shkruaj <code>zbulo</code> ose <code>reveal</code>, për të parë numrin e fshehtë. Loja mbaron me 0 pikë.</p>' +
          '<h3>Pikët</h3><p>Sa më pak prova të duhen, aq më shumë pikë merr: pikët bien në mënyrë eksponenciale me çdo provë shtesë. Një bonus i vogël shpejtësie (deri në 20%) shpërblen lojën e shpejtë.</p>' + c.scoreTable +
          '<p>Ruhen vetëm rezultati yt më i lartë dhe rezultati më i lartë i të gjitha kohërave; nuk mbahet shuma e përgjithshme.</p>' +
          '<h3>Komandat</h3>' + c.commandTable + '<p>Komandat funksionojnë në të gjitha gjuhët dhe nuk dallojnë shkronjat e mëdha nga të voglat. Në telefon tastiera e numrave nuk ka shkronja, prandaj përdor butonat.</p>' +
          '<h3>Përdoruesit</h3><p>Fillon të luash menjëherë si <b>Anonim</b>. Rezultati i tij më i lartë ndahet me këdo që luan në këtë pajisje. Për të ruajtur rezultatin tënd, prek <b>Hyr</b> dhe shkruaj emrin tënd të përdoruesit, ose krijo një të ri. Emrat që ke përdorur më parë shfaqen aty, kështu që hyrja e radhës bëhet me një prekje. Në të njëjtën dritare mund të zgjedhësh edhe të luash pa ruajtur asgjë. Rezultatet ruhen në këtë pajisje.</p>' +
          '<h3>Cilësimet</h3><p>Butoni ⚙ ka çelësin e zërit (tik-taku i orës, një tingull për çdo O dhe ?, dhe melodia e fitores, aq më madhështore sa më i lartë rezultati), ngjyrat e sfondit dhe madhësinë e tekstit (A+ / A−).</p>' +
          '<h3>Lojë e re</h3><p>Pas çdo loje shtyp <b>Lojë e Re</b> ose shkruaj <code>Y</code>. Nëse e ndërron gjatësinë e numrit gjatë lojës, nis një lojë e re pasi ta konfirmosh. Ndërrimi i gjuhës nuk e ndërpret lojën.</p>' +
          '<h3>Kthimi te lojërat</h3><p>Shtyp <b>Dil</b>, butonin Prapa ose shenjën MBG lart majtas për t’u kthyer te lista e lojërave. Një lojë e pambaruar ruhet dhe vazhdon kur të kthehesh. Aplikacioni mbyllet me butonin ⏻ në faqen kryesore.</p>';
      },
      'help.scoreHead': ['Gjatësia', 'Pikët më të larta', 'Pikët më të ulëta'],
      'help.scoreRow': function (p) { return [p.length + ' shifra', p.hiScore + ' me ' + p.hiAttempt + ' prova', p.loScore + ' me ' + p.loAttempt + ' prova']; },
      'help.cmdHead': ['Shkruaj', 'Çfarë bën'],
      'help.cmdRows': [
        ['rregullat · help · pomoć', 'Hap këto udhëzime'],
        ['zbulo · reveal · otkrij', 'Trego numrin e fshehtë (0 pikë)'],
        ['fund · exit · izlaz', 'Kthehu te lista e lojërave'],
        ['Y / N', 'Pas lojës: luaj përsëri ose kthehu te lojërat']
      ],
      'help.about': 'Rreth lojës',
      'about.version': 'MBG Puzzles 1.0 · Thyej kodin. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Numrat e fshehtë zgjidhen rastësisht në këtë pajisje: ' + p.min + ' numra të mundshëm me 4 shifra, deri në ' + p.max + ' me 8.'; },
      'about.privacy': 'Luhet edhe pa internet. Nuk nevojitet llogari: emrat dhe pikët mbeten në këtë telefon. Abonimet paguhen dhe menaxhohen përmes Google Play.',
      'about.privacyFree': 'Luhet edhe pa internet. Falas, pa reklama dhe pa blerje brenda aplikacionit. Emrat dhe pikët mbeten në këtë telefon.'
    },

    bs: {
      'app.title': 'Razbij šifru',
      'app.by': 'MBG Puzzles · od MBG',

      'btn.submit': 'Provjeri',
      'btn.help': 'Pomoć',
      'btn.quit': 'Izađi',
      'btn.user': 'Korisnik',
      'btn.login': 'Prijava',
      'btn.logout': 'Odjava',
      'btn.settings': 'Postavke',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Pozadina',
      'btn.reveal': 'Otkrij broj',
      'btn.newGame': 'Nova igra',
      'btn.length': function (p) { return 'Prebaci na ' + p.n + ' ' + cif(p.n); },
      'btn.close': 'Zatvori',
      'aria.fontUp': 'Veći tekst',
      'aria.fontDown': 'Manji tekst',
      'aria.length': function (p) { return 'Dužina broja: ' + p.n + ' ' + cif(p.n) + '. Promijeni'; },
      'aria.history': 'Tabla igre',
      'aria.user': function (p) { return 'Korisnik: ' + p.name; },

      'status.anonymous': 'Anonimno',
      'status.noData': 'Bez čuvanja',
      'status.time': function (p) { return p.n + ' ' + plBs(p.n, 'sekunda', 'sekunde', 'sekundi'); },
      'len.chip': function (p) { return p.n + ' ' + cif(p.n); },

      'label.play': function (p) { return 'Upiši broj od ' + p.n + ' ' + cif(p.n) + ' ili komandu'; },
      'label.yesno': 'Želiš li igrati još jednu igru? D/N',
      'ph.play': function (p) { return 'Broj od ' + p.n + ' ' + cif(p.n); },
      'ph.yesno': 'Još jednu igru? D / N',

      'notice.storageUnavailable': 'Ovaj preglednik ne dozvoljava igri da čuva rezultate.',
      'notice.loggedIn': function (p) { return 'Opet si tu, ' + p.name + '! Tvoj rekord: ' + p.best; },
      'notice.registered': function (p) { return 'Zdravo, ' + p.name + '! Sretno u igri!'; },
      'notice.noData': 'Igraš bez čuvanja',
      'notice.anonymous': 'Igraš anonimno',
      'notice.restored': 'Tvoja igra je vraćena',
      'warn.empty': function (p) { return 'Upiši broj od ' + p.length + ' ' + cif(p.length) + '.'; },
      'reveal.what': 'cijeli broj',
      'hint.btn': 'Nagovještaj',
      'hint.what': 'još jednu cifru',
      'hint.shown': function (p) { return 'Nagovještaj ' + p.number + ': ' + p.pos + '. cifra je ' + p.ch; },
      'warn.noHint': 'Nema više nagovještaja – ostalo je na tebi.',
      'win.hints': function (p) { return 'Uz ' + p.n + ' ' + plBs(p.n, 'nagovještaj', 'nagovještaja', 'nagovještaja') + ' – svaki se u bodovima računa kao ' + p.k + ' pokušaja.'; },
      'warn.digits': 'Upiši samo cifre (0–9). Ovaj pokušaj se ne računa.',
      'warn.length': function (p) { return 'Tvoj broj ima ' + p.got + ' ' + cif(p.got) + ', a ova igra traži ' + p.length + '. Ne računa se.'; },
      'warn.roundOver': 'Igra je završena. Upiši D za novu igru ili N za povratak na listu igara.',

      'win.title': 'ČESTITAMO!',
      'win.titleName': function (p) { return 'ČESTITAMO, ' + p.name + '!'; },
      'win.found': function (p) { return 'Broj ' + p.word + ' je pogođen iz ' + p.attempts + '. pokušaja, za ' + p.seconds + ' ' + plBs(p.seconds, 'sekundu', 'sekunde', 'sekundi') + '.'; },
      'win.luck': 'Kakva sreća! Iz prvog pokušaja!',
      'score.label': 'Bodovi',
      'score.yourBest': 'Tvoj rekord',
      'score.allTime': 'Najbolji ikad',
      'score.newBest': 'Novi rekord!',
      'score.newAllTime': 'Rekord svih vremena!',
      'score.notSaved': 'Nije sačuvano',
      'reveal.text': 'Više sreće sljedeći put!',
      'reveal.word': function (p) { return 'Tajni broj je bio ' + p.word + '.'; },

      'dlg.cancel': 'Odustani',
      'restart.title': 'Započeti novu igru?',
      'restart.length': function (p) { return 'Prelazak na brojeve od ' + p.n + ' ' + cif(p.n) + ' završava ovu igru. Ona se neće bodovati.'; },
      'restart.ok': 'Nova igra',
      'login.title': 'Prijava',
      'login.lede': 'Prijavi se da sačuvaš svoj najbolji rezultat.',
      'login.label': 'Korisničko ime',
      'login.saved': 'Tvoja sačuvana imena',
      'login.other': 'Ili upiši ime',
      'login.pick': function (p) { return 'Prijavi se kao ' + p.name + ', najbolji rezultat ' + p.best; },
      'login.submit': 'Prijavi se',
      'login.create': function (p) { return 'Napravi „' + p.name + '“'; },
      'login.unknown': function (p) { return 'Korisnik „' + p.name + '“ još ne postoji. Napraviti ga?'; },
      'login.empty': 'Upiši korisničko ime.',
      'login.invalid': 'Koristi 2–20 slova ili cifara (dozvoljeni su razmaci, tačke i crtice).',
      'login.reserved': function (p) { return '„' + p.name + '“ je rezervisano. Izaberi drugo ime.'; },
      'login.noData': 'Igraj bez čuvanja',
      'login.anonymous': 'Čuvaj rezultate anonimno',
      'account.best': function (p) { return 'Tvoj najbolji rezultat: ' + p.best; },
      'settings.title': 'Postavke',
      'settings.sound': 'Zvuk',
      'settings.background': 'Pozadina',
      'settings.textSize': 'Veličina teksta',
      'goodbye.title': 'Hvala na igri!',
      'goodbye.text': 'Nadamo se da ti se igra svidjela. Vrati se uskoro na novu rundu!',
      'goodbye.sign': 'Srdačan pozdrav od MBG · Merkur Beqiri Games',
      'goodbye.again': 'Igraj ponovo',
      'goodbye.close': 'Sada možeš zatvoriti ovaj prozor.',
      'wheel.title': 'Dužina broja',
      'wheel.done': 'Gotovo',
      'wheel.item': function (p) { return p.n + ' ' + cif(p.n); },
      'help.title': 'Kako se igra',

      'toast.font': function (p) { return 'Veličina teksta: ' + p.px + ' px'; },
      'toast.fontMax': 'Ovo je najveća veličina teksta.',
      'toast.fontMin': 'Ovo je najmanja veličina teksta.',
      'theme.light': 'Svijetla',
      'theme.dark': 'Tamna',
      'theme.adriatic': 'Jadran',
      'theme.meadow': 'Livada',
      'theme.rose': 'Ruža',
      'theme.random': 'Nasumične boje',

      'last.try': function (p) { return 'Pokušaj ' + p.n; },
      'sr.guess': function (p) { return 'Pokušaj ' + p.attempt + ': ' + p.word + '. Tragovi: ' + p.clues; },
      'legend.O': 'prava cifra na pravom mjestu',
      'legend.Q': 'ima je u broju, ali na drugom mjestu',
      'legend.X': 'nema je u broju',

      'help.html': function (c) {
        return '' +
          '<h3>Cilj</h3><p>Računar nasumično bira tajni broj: za početak od 4 cifre, a po želji od 5, 6, 7 ili 8 cifara. Cifre se mogu ponavljati i broj može početi nulom, pa postoji 10.000 mogućih brojeva od 4 cifre. Pronađi ga iz što manje pokušaja.</p>' +
          '<h3>Kako čitati tragove</h3><p>Nakon svakog pokušaja svaka cifra tvog broja dobija trag, istim redom:</p>' + c.legend +
          '<p class="example">Primjer: tajni broj je 1234, a ti upišeš 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Ponovljene cifre broje se pažljivo. Tajni broj 7703, pokušaj 1777 → <code>X O ? X</code>. Tvoja druga sedmica je na pravom mjestu. Treća sedmica jeste u broju, ali na drugom mjestu (druga sedmica tajnog broja). Za posljednju cifru nije ostala nijedna sedmica, pa dobija X.</p>' +
          '<h3>Kako pogađati</h3><p>Upiši broj s tačno toliko cifara i pritisni <b>Provjeri</b> ili Enter. Na telefonu se otvara tastatura s brojevima; dodirni <b>Provjeri</b> da pošalješ pokušaj. Cifre se mogu ponavljati. Brojevi s manje ili više cifara, ili sa slovima i znakovima, ne računaju se.</p>' +
          '<p class="example">Savjet: počni s 0123, a zatim 4567. Zajedno pokazuju koje su cifre u broju.</p>' +
          '<h3>Dužina broja</h3><p>Igraj s brojevima od 4, 5, 6, 7 ili 8 cifara. Dodirni dugme dužine (npr. <b>4 cifre</b>) pored sata i izaberi dužinu. Na telefonu okreni točkić.</p>' +
          '<h3>Pobjeda</h3><p>Kad su svi tragovi O, broj je pogođen. Znakovi O pretvaraju se u srca ❤️, a uz uključen zvuk čuje se pobjednička melodija.</p>' +
          '<h3>Nagovještaji 💡</h3><p>Zapelo je? Nakon 3. pokušaja pored polja za unos pojavljuje se dugme sa sijalicom. Svaki nagovještaj otkriva još jednu cifru tajnog broja, na nasumičnom mjestu koje još nije pronađeno, i košta jedan kredit (vidi ⚙ › Krediti za nagovještaje: besplatni krediti svaki dan, više uz visoke rezultate). Igra nikad ne otkriva cijeli broj: barem jedna cifra uvijek ostaje za tebe. Svaki nagovještaj se u bodovima računa kao 2 dodatna pokušaja. Što više pokušaja promaši, to se dugme češće zatrese da te podsjeti da je tu.</p>' +
          '<h3>Otkrij broj</h3><p>Pritisni <b>Otkrij broj</b> ili upiši <code>otkrij</code> da vidiš tajni broj. Igra se tada završava s 0 bodova.</p>' +
          '<h3>Bodovi</h3><p>Što manje pokušaja trebaš, to više bodova dobijaš: bodovi naglo padaju sa svakim dodatnim pokušajem. Mali bonus za brzinu (do 20%) nagrađuje brze igre.</p>' + c.scoreTable +
          '<p>Čuvaju se samo tvoj najbolji rezultat i najbolji rezultat svih vremena; ukupni zbir se ne vodi.</p>' +
          '<h3>Komande</h3>' + c.commandTable + '<p>Komande rade na svim jezicima i ne razlikuju velika i mala slova. Tastatura s brojevima na telefonu nema slova, pa tada koristi dugmad.</p>' +
          '<h3>Korisnici</h3><p>Odmah počinješ igrati anonimno. Anonimni rekord dijele svi koji igraju na ovom uređaju. Da čuvaš svoj rekord, dodirni <b>Prijava</b> i upiši svoje korisničko ime ili napravi novo. Imena korištena ranije prikazana su tu, pa je ponovna prijava samo jedan dodir. U istom prozoru možeš izabrati i igru bez čuvanja. Rezultati se čuvaju na ovom uređaju.</p>' +
          '<h3>Postavke</h3><p>Dugme ⚙ sadrži prekidač za zvuk (tik-tak sata, ton za svako O i ?, i pobjedničku melodiju, to svečaniju što je rezultat veći), boje pozadine i veličinu teksta (A+ / A−).</p>' +
          '<h3>Nova igra</h3><p>Nakon igre pritisni <b>Nova igra</b> ili upiši <code>D</code>. Promjena dužine broja tokom igre pokreće novu igru nakon potvrde. Promjena jezika ne prekida igru.</p>' +
          '<h3>Povratak na igre</h3><p>Pritisni <b>Izađi</b>, dugme Nazad ili znak MBG gore lijevo da se vratiš na listu igara. Nezavršena igra se čuva i nastavlja kad se vratiš. Aplikaciju zatvaraš dugmetom ⏻ na početnom ekranu.</p>';
      },
      'help.scoreHead': ['Dužina', 'Najviše bodova', 'Najmanje bodova'],
      'help.scoreRow': function (p) { return [p.length + ' ' + cif(p.length), p.hiScore + ' iz ' + p.hiAttempt + '. pokušaja', p.loScore + ' iz ' + p.loAttempt + '. pokušaja']; },
      'help.cmdHead': ['Upiši', 'Šta radi'],
      'help.cmdRows': [
        ['pomoć · pravila · help', 'Otvara ova uputstva'],
        ['otkrij · reveal', 'Pokazuje tajni broj (0 bodova)'],
        ['izlaz · exit · quit', 'Povratak na listu igara'],
        ['D / N', 'Nakon igre: nova igra ili povratak na listu igara']
      ],
      'help.about': 'O igri',
      'about.version': 'MBG Puzzles 1.0 · Razbij šifru. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Tajni brojevi biraju se nasumično na ovom uređaju: ' + p.min + ' mogućih brojeva od 4 cifre, do ' + p.max + ' od 8 cifara.'; },
      'about.privacy': 'Radi i bez interneta. Račun nije potreban: imena i rezultati ostaju na ovom telefonu. Pretplate se plaćaju preko Google Playa i tamo se njima upravlja.',
      'about.privacyFree': 'Radi i bez interneta. Besplatno, bez reklama i bez kupovine u aplikaciji. Imena i rezultati ostaju na ovom telefonu.'
    },

    de: {
      'app.title': 'Knack den Code',
      'app.by': 'MBG Puzzles · von MBG',

      'btn.submit': 'Prüfen',
      'btn.help': 'Hilfe',
      'btn.quit': 'Beenden',
      'btn.user': 'Spieler',
      'btn.login': 'Anmelden',
      'btn.logout': 'Abmelden',
      'btn.settings': 'Einstellungen',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Hintergrund',
      'btn.reveal': 'Zahl zeigen',
      'btn.newGame': 'Neues Spiel',
      'btn.length': function (p) { return 'Wechsle zu ' + p.n + ' Ziffern'; },
      'btn.close': 'Schließen',
      'aria.fontUp': 'Größere Schrift',
      'aria.fontDown': 'Kleinere Schrift',
      'aria.length': function (p) { return 'Länge der Zahl: ' + p.n + ' Ziffern. Ändern'; },
      'aria.history': 'Spielfeld',
      'aria.user': function (p) { return 'Spieler: ' + p.name; },

      'status.anonymous': 'Anonym',
      'status.noData': 'Ohne Speichern',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'Sekunde', 'Sekunden'); },
      'len.chip': function (p) { return p.n + ' Ziffern'; },

      'label.play': function (p) { return 'Gib eine Zahl mit ' + p.n + ' Ziffern oder einen Befehl ein'; },
      'label.yesno': 'Willst du noch ein Spiel spielen? J/N',
      'ph.play': function (p) { return 'Zahl mit ' + p.n + ' Ziffern'; },
      'ph.yesno': 'Noch ein Spiel? J / N',

      'notice.storageUnavailable': 'Dieser Browser lässt das Spiel keine Ergebnisse speichern.',
      'notice.loggedIn': function (p) { return 'Willkommen zurück, ' + p.name + '! Dein Rekord: ' + p.best; },
      'notice.registered': function (p) { return 'Willkommen, ' + p.name + '!'; },
      'notice.noData': 'Du spielst ohne Speichern',
      'notice.anonymous': 'Du spielst anonym',
      'notice.restored': 'Dein Spiel wurde wiederhergestellt',
      'warn.empty': function (p) { return 'Gib eine Zahl mit ' + p.length + ' Ziffern ein.'; },
      'reveal.what': 'die ganze Zahl',
      'hint.btn': 'Tipp',
      'hint.what': 'noch eine Ziffer',
      'hint.shown': function (p) { return 'Tipp ' + p.number + ': Ziffer ' + p.pos + ' ist ' + p.ch; },
      'warn.noHint': 'Keine Tipps mehr – den Rest schaffst du selbst.',
      'win.hints': function (p) { return 'Mit ' + p.n + ' ' + pl(p.n, 'Tipp', 'Tipps') + ' – jeder zählt wie ' + p.k + ' Versuche in der Punktzahl.'; },
      'warn.digits': 'Bitte nur Ziffern (0–9). Dieser Versuch zählt nicht.',
      'warn.length': function (p) { return 'Deine Zahl hat ' + p.got + ' ' + pl(p.got, 'Ziffer', 'Ziffern') + ', dieses Spiel braucht ' + p.length + '. Zählt nicht.'; },
      'warn.roundOver': 'Spiel vorbei. Gib J ein für ein neues Spiel oder N für zurück zu den Spielen.',

      'win.title': 'GLÜCKWUNSCH!',
      'win.titleName': function (p) { return 'GLÜCKWUNSCH, ' + p.name + '!'; },
      'win.found': function (p) { return 'Du hast ' + p.word + ' mit ' + p.attempts + ' ' + pl(p.attempts, 'Versuch', 'Versuchen') + ' in ' + p.seconds + ' ' + pl(p.seconds, 'Sekunde', 'Sekunden') + ' gefunden.'; },
      'win.luck': 'Was für ein Glück! Beim ersten Versuch!',
      'score.label': 'Punkte',
      'score.yourBest': 'Dein Rekord',
      'score.allTime': 'Bester aller Zeiten',
      'score.newBest': 'Neuer Rekord!',
      'score.newAllTime': 'Rekord aller Zeiten!',
      'score.notSaved': 'Nicht gespeichert',
      'reveal.text': 'Mehr Glück beim nächsten Mal!',
      'reveal.word': function (p) { return 'Die geheime Zahl war ' + p.word + '.'; },

      'dlg.cancel': 'Abbrechen',
      'restart.title': 'Neues Spiel beginnen?',
      'restart.length': function (p) { return 'Der Wechsel zu Zahlen mit ' + p.n + ' Ziffern beendet dieses Spiel. Es wird nicht gewertet.'; },
      'restart.ok': 'Neues Spiel',
      'login.title': 'Anmelden',
      'login.lede': 'Melde dich an, um deinen eigenen Rekord zu behalten.',
      'login.label': 'Spielername',
      'login.saved': 'Deine gespeicherten Namen',
      'login.other': 'Oder gib einen Namen ein',
      'login.pick': function (p) { return 'Als ' + p.name + ' anmelden, Rekord ' + p.best; },
      'login.submit': 'Anmelden',
      'login.create': function (p) { return '„' + p.name + '“ anlegen'; },
      'login.unknown': function (p) { return 'Es gibt noch keinen Spieler „' + p.name + '“. Anlegen?'; },
      'login.empty': 'Gib einen Spielernamen ein.',
      'login.invalid': 'Nimm 2–20 Buchstaben oder Ziffern (Leerzeichen, Punkte, Bindestriche erlaubt).',
      'login.reserved': function (p) { return '„' + p.name + '“ ist reserviert. Wähle einen anderen Namen.'; },
      'login.noData': 'Ohne Speichern spielen',
      'login.anonymous': 'Ergebnisse als Anonym speichern',
      'account.best': function (p) { return 'Deine höchste Punktzahl: ' + p.best; },
      'settings.title': 'Einstellungen',
      'settings.sound': 'Ton',
      'settings.background': 'Hintergrund',
      'settings.textSize': 'Schriftgröße',
      'goodbye.title': 'Danke fürs Spielen!',
      'goodbye.text': 'Wir hoffen, das Spiel hat dir gefallen. Komm bald wieder für eine neue Runde!',
      'goodbye.sign': 'Herzliche Grüße von MBG · Merkur Beqiri Games',
      'goodbye.again': 'Nochmal spielen',
      'goodbye.close': 'Du kannst dieses Fenster jetzt schließen.',
      'wheel.title': 'Länge der Zahl',
      'wheel.done': 'Fertig',
      'wheel.item': function (p) { return p.n + ' Ziffern'; },
      'help.title': 'So wird gespielt',

      'toast.font': function (p) { return 'Schriftgröße: ' + p.px + ' px'; },
      'toast.fontMax': 'Das ist die größte Schrift.',
      'toast.fontMin': 'Das ist die kleinste Schrift.',
      'theme.light': 'Hell',
      'theme.dark': 'Dunkel',
      'theme.adriatic': 'Adria',
      'theme.meadow': 'Wiese',
      'theme.rose': 'Rose',
      'theme.random': 'Zufallsfarben',

      'last.try': function (p) { return 'Versuch ' + p.n; },
      'sr.guess': function (p) { return 'Versuch ' + p.attempt + ': ' + p.word + '. Hinweise: ' + p.clues; },
      'legend.O': 'richtige Ziffer an der richtigen Stelle',
      'legend.Q': 'kommt in der Zahl vor, aber an einer anderen Stelle',
      'legend.X': 'kommt in der Zahl nicht vor',

      'help.html': function (c) {
        return '' +
          '<h3>Das Ziel</h3><p>Der Computer wählt zufällig eine geheime Zahl: zu Beginn mit 4 Ziffern, auf Wunsch mit 5, 6, 7 oder 8. Ziffern dürfen sich wiederholen und die Zahl darf mit 0 beginnen, es gibt also 10.000 mögliche Zahlen mit 4 Ziffern. Finde sie mit so wenigen Versuchen wie möglich.</p>' +
          '<h3>Die Hinweise lesen</h3><p>Nach jedem Versuch bekommt jede Ziffer deiner Zahl einen Hinweis, in derselben Reihenfolge:</p>' + c.legend +
          '<p class="example">Beispiel: Die geheime Zahl ist 1234 und du schreibst 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Doppelte Ziffern werden genau gezählt. Geheime Zahl 7703, Versuch 1777 → <code>X O ? X</code>. Deine zweite 7 steht an der richtigen Stelle. Deine dritte 7 kommt in der Zahl vor, aber an anderer Stelle (die andere 7 der geheimen Zahl). Für deine letzte Ziffer bleibt keine 7 mehr übrig, also X.</p>' +
          '<h3>Raten</h3><p>Schreib eine Zahl mit genau der richtigen Anzahl Ziffern und drück <b>Prüfen</b> oder Enter. Auf dem Handy öffnet sich die Zifferntastatur; tipp auf <b>Prüfen</b>, um deinen Versuch abzuschicken. Ziffern dürfen sich wiederholen. Zahlen mit zu wenigen oder zu vielen Ziffern, oder mit Buchstaben und Zeichen, zählen nicht.</p>' +
          '<p class="example">Tipp: Fang mit 0123 und dann 4567 an. Zusammen zeigen sie, welche Ziffern in der Zahl vorkommen.</p>' +
          '<h3>Länge der Zahl</h3><p>Spiel mit Zahlen aus 4, 5, 6, 7 oder 8 Ziffern. Tipp auf den Längen-Knopf (zum Beispiel <b>4 Ziffern</b>) neben der Uhr und wähle eine Länge. Auf dem Handy drehst du das Rad.</p>' +
          '<h3>Gewinnen</h3><p>Wenn alle Hinweise O sind, hast du die Zahl gefunden. Die O werden zu Herzen ❤️ und mit Ton hörst du die Siegesmelodie.</p>' +
          '<h3>Tipps 💡</h3><p>Du kommst nicht weiter? Nach deinem 3. Versuch erscheint neben dem Eingabefeld ein Knopf mit einer Glühbirne. Jeder Tipp deckt eine weitere Ziffer der geheimen Zahl auf, an einer zufälligen Stelle, die du noch nicht gefunden hast, und kostet ein Tipp-Credit (siehe ⚙ › Tipp-Guthaben: jeden Tag Gratis-Credits, mehr für hohe Punktzahlen). Die ganze Zahl verrät das Spiel nie: Mindestens eine Ziffer bleibt immer für dich. Jeder Tipp zählt wie 2 zusätzliche Versuche in der Punktzahl. Je mehr Versuche danebengehen, desto öfter wackelt der Knopf, um dich an ihn zu erinnern.</p>' +
          '<h3>Zahl zeigen</h3><p>Drück <b>Zahl zeigen</b> oder schreib <code>lösung</code> oder <code>reveal</code>, um die geheime Zahl zu sehen. Das Spiel endet dann mit 0 Punkten.</p>' +
          '<h3>Punkte</h3><p>Je weniger Versuche du brauchst, desto mehr Punkte bekommst du: Mit jedem weiteren Versuch sinken die Punkte stark. Ein kleiner Zeitbonus (bis zu 20 %) belohnt schnelle Spiele.</p>' + c.scoreTable +
          '<p>Gespeichert werden nur deine höchste Punktzahl und die höchste Punktzahl aller Zeiten; eine Gesamtsumme gibt es nicht.</p>' +
          '<h3>Befehle</h3>' + c.commandTable + '<p>Die deutschen Befehle gelten, solange Deutsch eingestellt ist; help, reveal und exit gelten in jeder Sprache. Groß- und Kleinschreibung spielt keine Rolle. Auf dem Handy hat die Zifferntastatur keine Buchstaben, nimm dann die Knöpfe.</p>' +
          '<h3>Spieler</h3><p>Du spielst sofort als <b>Anonym</b>. Diesen Rekord teilen sich alle, die auf diesem Gerät spielen. Um deinen eigenen Rekord zu behalten, tipp auf <b>Anmelden</b> und gib deinen Spielernamen ein oder leg einen neuen an. Namen, die du schon benutzt hast, stehen dort, sodass die nächste Anmeldung ein Tipp ist. Im selben Fenster kannst du auch ohne Speichern spielen. Die Ergebnisse bleiben auf diesem Gerät.</p>' +
          '<h3>Einstellungen</h3><p>Der Knopf ⚙ enthält den Ton (Ticken der Uhr, ein Ton für jedes O und ?, und die Siegesmelodie – je höher die Punktzahl, desto prächtiger), die Hintergrundfarben und die Schriftgröße (A+ / A−).</p>' +
          '<h3>Neues Spiel</h3><p>Nach einem Spiel drückst du <b>Neues Spiel</b> oder schreibst <code>J</code>. Wenn du während eines Spiels die Länge der Zahl wechselst, beginnt nach deiner Bestätigung ein neues Spiel. Ein Sprachwechsel behält dein Spiel.</p>' +
          '<h3>Zurück zu den Spielen</h3><p>Drück <b>Beenden</b>, die Zurück-Taste oder das MBG-Zeichen oben links, um zur Liste der Spiele zurückzukehren. Ein angefangenes Spiel bleibt erhalten und geht weiter, wenn du zurückkommst. Die App schließt du mit dem Knopf ⏻ auf dem Startbildschirm.</p>';
      },
      'help.scoreHead': ['Länge', 'Höchste Punkte', 'Wenigste Punkte'],
      'help.scoreRow': function (p) { return [p.length + ' Ziffern', p.hiScore + ' mit ' + p.hiAttempt + ' Versuchen', p.loScore + ' mit ' + p.loAttempt + ' Versuchen']; },
      'help.cmdHead': ['Schreib', 'Was passiert'],
      'help.cmdRows': [
        ['hilfe · regeln · help', 'Öffnet diese Anleitung'],
        ['lösung · reveal', 'Zeigt die geheime Zahl (0 Punkte)'],
        ['beenden · exit · quit', 'Zurück zur Liste der Spiele'],
        ['J / N', 'Nach einem Spiel: neues Spiel oder zurück zur Liste der Spiele']
      ],
      'help.about': 'Über das Spiel',
      'about.version': 'MBG Puzzles 1.0 · Knack den Code. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Die geheimen Zahlen werden zufällig auf diesem Gerät gewählt: ' + p.min + ' mögliche Zahlen mit 4 Ziffern, bis zu ' + p.max + ' mit 8.'; },
      'about.privacy': 'Läuft auch offline. Kein Konto nötig: Namen und Ergebnisse bleiben auf diesem Handy. Abos werden über Google Play bezahlt und verwaltet.',
      'about.privacyFree': 'Läuft auch offline. Gratis, ohne Werbung und ohne In-App-Käufe. Namen und Ergebnisse bleiben auf diesem Handy.'
    },
    es: {
      'app.title': 'Descifra el código',
      'app.by': 'MBG Puzzles · de MBG',

      'btn.submit': 'Comprobar',
      'btn.help': 'Ayuda',
      'btn.quit': 'Salir',
      'btn.user': 'Jugador',
      'btn.login': 'Entrar',
      'btn.logout': 'Cerrar sesión',
      'btn.settings': 'Ajustes',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Fondo',
      'btn.reveal': 'Ver número',
      'btn.newGame': 'Partida nueva',
      'btn.length': function (p) { return 'Cambiar a ' + p.n + ' cifras'; },
      'btn.close': 'Cerrar',
      'aria.fontUp': 'Texto más grande',
      'aria.fontDown': 'Texto más pequeño',
      'aria.length': function (p) { return 'Longitud del número: ' + p.n + ' cifras. Cambiar'; },
      'aria.history': 'Tablero',
      'aria.user': function (p) { return 'Jugador: ' + p.name; },

      'status.anonymous': 'Anónimo',
      'status.noData': 'Sin guardar',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'segundo', 'segundos'); },
      'len.chip': function (p) { return p.n + ' cifras'; },

      'label.play': function (p) { return 'Escribe un número de ' + p.n + ' cifras o un comando'; },
      'label.yesno': '¿Quieres jugar otra partida? S/N',
      'ph.play': function (p) { return 'Número de ' + p.n + ' cifras'; },
      'ph.yesno': '¿Otra partida? S / N',

      'notice.storageUnavailable': 'Este navegador no deja que el juego guarde las puntuaciones.',
      'notice.loggedIn': function (p) { return '¡Hola de nuevo, ' + p.name + '! Tu récord: ' + p.best; },
      'notice.registered': function (p) { return '¡Hola, ' + p.name + '!'; },
      'notice.noData': 'Juegas sin guardar',
      'notice.anonymous': 'Juegas como Anónimo',
      'notice.restored': 'Tu partida se ha recuperado',
      'warn.empty': function (p) { return 'Escribe un número de ' + p.length + ' cifras.'; },
      'reveal.what': 'el número entero',
      'hint.btn': 'Pista',
      'hint.what': 'una cifra más',
      'hint.shown': function (p) { return 'Pista ' + p.number + ': la cifra ' + p.pos + ' es ' + p.ch; },
      'warn.noHint': 'No quedan más pistas: el resto depende de ti.',
      'win.hints': function (p) { return 'Con ' + p.n + ' ' + pl(p.n, 'pista', 'pistas') + ': cada una cuenta como ' + p.k + ' intentos en la puntuación.'; },
      'warn.digits': 'Solo cifras (0–9), por favor. Este intento no cuenta.',
      'warn.length': function (p) { return 'Tu número tiene ' + p.got + ' ' + pl(p.got, 'cifra', 'cifras') + ' y esta partida necesita ' + p.length + '. No cuenta.'; },
      'warn.roundOver': 'Fin de la partida. Escribe S para jugar otra o N para volver a los juegos.',

      'win.title': '¡ENHORABUENA!',
      'win.titleName': function (p) { return '¡ENHORABUENA, ' + p.name + '!'; },
      'win.found': function (p) { return 'Encontraste el ' + p.word + ' en ' + p.attempts + ' ' + pl(p.attempts, 'intento', 'intentos') + ' y ' + p.seconds + ' ' + pl(p.seconds, 'segundo', 'segundos') + '.'; },
      'win.luck': '¡Qué suerte! ¡A la primera!',
      'score.label': 'Puntos',
      'score.yourBest': 'Tu récord',
      'score.allTime': 'Mejor de siempre',
      'score.newBest': '¡Nuevo récord!',
      'score.newAllTime': '¡Récord absoluto!',
      'score.notSaved': 'No guardado',
      'reveal.text': '¡Más suerte la próxima vez!',
      'reveal.word': function (p) { return 'El número secreto era ' + p.word + '.'; },

      'dlg.cancel': 'Cancelar',
      'restart.title': '¿Empezar una partida nueva?',
      'restart.length': function (p) { return 'Cambiar a números de ' + p.n + ' cifras termina esta partida. No se puntuará.'; },
      'restart.ok': 'Partida nueva',
      'login.title': 'Entrar',
      'login.lede': 'Entra para guardar tu propio récord.',
      'login.label': 'Nombre de jugador',
      'login.saved': 'Tus nombres guardados',
      'login.other': 'O escribe un nombre',
      'login.pick': function (p) { return 'Entrar como ' + p.name + ', récord ' + p.best; },
      'login.submit': 'Entrar',
      'login.create': function (p) { return 'Crear «' + p.name + '»'; },
      'login.unknown': function (p) { return 'Todavía no existe el jugador «' + p.name + '». ¿Lo creamos?'; },
      'login.empty': 'Escribe un nombre de jugador.',
      'login.invalid': 'Usa de 2 a 20 letras o cifras (se permiten espacios, puntos y guiones).',
      'login.reserved': function (p) { return '«' + p.name + '» está reservado. Elige otro nombre.'; },
      'login.noData': 'Jugar sin guardar',
      'login.anonymous': 'Guardar como Anónimo',
      'account.best': function (p) { return 'Tu puntuación más alta: ' + p.best; },
      'settings.title': 'Ajustes',
      'settings.sound': 'Sonido',
      'settings.background': 'Fondo',
      'settings.textSize': 'Tamaño del texto',
      'goodbye.title': '¡Gracias por jugar!',
      'goodbye.text': 'Esperamos que te haya gustado el juego. ¡Vuelve pronto para otra ronda!',
      'goodbye.sign': 'Un cordial saludo de MBG · Merkur Beqiri Games',
      'goodbye.again': 'Jugar otra vez',
      'goodbye.close': 'Ya puedes cerrar esta ventana.',
      'wheel.title': 'Longitud del número',
      'wheel.done': 'Listo',
      'wheel.item': function (p) { return p.n + ' cifras'; },
      'help.title': 'Cómo se juega',

      'toast.font': function (p) { return 'Tamaño del texto: ' + p.px + ' px'; },
      'toast.fontMax': 'Este es el texto más grande.',
      'toast.fontMin': 'Este es el texto más pequeño.',
      'theme.light': 'Claro',
      'theme.dark': 'Oscuro',
      'theme.adriatic': 'Adriático',
      'theme.meadow': 'Pradera',
      'theme.rose': 'Rosa',
      'theme.random': 'Colores al azar',

      'last.try': function (p) { return 'Intento ' + p.n; },
      'sr.guess': function (p) { return 'Intento ' + p.attempt + ': ' + p.word + '. Pistas: ' + p.clues; },
      'legend.O': 'cifra correcta en su sitio',
      'legend.Q': 'está en el número, pero en otro sitio',
      'legend.X': 'no está en el número',

      'help.html': function (c) {
        return '' +
          '<h3>El objetivo</h3><p>El ordenador elige al azar un número secreto: de 4 cifras para empezar, o de 5, 6, 7 u 8 si quieres. Las cifras se pueden repetir y el número puede empezar por 0, así que hay 10.000 números posibles de 4 cifras. Encuéntralo con los menos intentos posibles.</p>' +
          '<h3>Cómo leer las pistas</h3><p>Después de cada intento, cada cifra de tu número recibe una pista, en el mismo orden:</p>' + c.legend +
          '<p class="example">Ejemplo: el número secreto es 1234 y escribes 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Las cifras repetidas se cuentan con cuidado. Número secreto 7703, intento 1777 → <code>X O ? X</code>. Tu segundo 7 está en su sitio. Tu tercer 7 está en el número, pero en otro sitio (el otro 7 del número secreto). Para tu última cifra ya no queda ningún 7, así que recibe X.</p>' +
          '<h3>Cómo jugar</h3><p>Escribe un número con el número exacto de cifras y pulsa <b>Comprobar</b> o Intro. En el teléfono se abre el teclado numérico; toca <b>Comprobar</b> para enviar tu intento. Las cifras se pueden repetir. Los números con más o menos cifras, o con letras o símbolos, no cuentan.</p>' +
          '<p class="example">Consejo: empieza con 0123 y luego 4567. Juntos te dicen qué cifras están en el número.</p>' +
          '<h3>Longitud del número</h3><p>Juega con números de 4, 5, 6, 7 u 8 cifras. Toca el botón de longitud (por ejemplo <b>4 cifras</b>) junto al reloj y elige una longitud. En el teléfono, gira la rueda.</p>' +
          '<h3>Ganar</h3><p>Cuando todas las pistas son O, has encontrado el número. Las O se convierten en corazones ❤️ y, con el sonido activado, suena la melodía de la victoria.</p>' +
          '<h3>Pistas 💡</h3><p>¿Atascado? Después de tu 3.er intento aparece junto al campo de texto un botón con una bombilla. Cada pista descubre una cifra más del número secreto, en un sitio al azar que todavía no has encontrado, y cuesta un crédito de pistas (mira ⚙ › Créditos de pistas: créditos gratis cada día y más con puntuaciones altas). El juego nunca regala el número entero: siempre queda al menos una cifra para ti. Cada pista cuenta como 2 intentos más en la puntuación. Cuantos más intentos fallas, más a menudo se mueve el botón para recordarte que está ahí.</p>' +
          '<h3>Ver número</h3><p>Pulsa <b>Ver número</b>, o escribe <code>revelar</code> o <code>reveal</code>, para ver el número secreto. La partida termina con 0 puntos.</p>' +
          '<h3>Puntuación</h3><p>Cuantos menos intentos necesitas, más puntos consigues: los puntos bajan mucho con cada intento de más. Un pequeño bonus de rapidez (hasta un 20 %) premia las partidas rápidas.</p>' + c.scoreTable +
          '<p>Solo se guardan tu puntuación más alta y la más alta de siempre; no se lleva un total.</p>' +
          '<h3>Comandos</h3>' + c.commandTable + '<p>Los comandos en español funcionan mientras juegas en español; help, reveal y exit funcionan en todos los idiomas. Las mayúsculas dan igual. En el teléfono, el teclado numérico no tiene letras: usa entonces los botones.</p>' +
          '<h3>Jugadores</h3><p>Empiezas a jugar enseguida como <b>Anónimo</b>. Ese récord lo comparten todos los que juegan en este dispositivo. Para guardar tu propio récord, toca <b>Entrar</b> y escribe tu nombre de jugador o crea uno nuevo. Los nombres que ya has usado aparecen ahí, así que volver a entrar es un solo toque. En la misma ventana también puedes jugar sin guardar nada. Las puntuaciones se guardan en este dispositivo.</p>' +
          '<h3>Ajustes</h3><p>El botón ⚙ tiene el sonido (el tictac del reloj, un tono por cada O y ? y la melodía de la victoria, más vistosa cuanto más alta es la puntuación), los colores de fondo y el tamaño del texto (A+ / A−).</p>' +
          '<h3>Partida nueva</h3><p>Al terminar, pulsa <b>Partida nueva</b> o escribe <code>S</code>. Si cambias la longitud del número durante una partida, empieza una nueva después de confirmarlo. Cambiar de idioma no interrumpe la partida.</p>' +
          '<h3>Volver a los juegos</h3><p>Pulsa <b>Salir</b>, el botón Atrás o la marca MBG arriba a la izquierda para volver a la lista de juegos. Una partida sin terminar se guarda y sigue cuando vuelves. Para cerrar la app, usa el botón ⏻ de la pantalla de inicio.</p>';
      },
      'help.scoreHead': ['Longitud', 'Máximo', 'Mínimo'],
      'help.scoreRow': function (p) { return [p.length + ' cifras', p.hiScore + ' con ' + p.hiAttempt + ' intentos', p.loScore + ' con ' + p.loAttempt + ' intentos']; },
      'help.cmdHead': ['Escribe', 'Qué hace'],
      'help.cmdRows': [
        ['ayuda · reglas · help', 'Abre estas instrucciones'],
        ['revelar · reveal', 'Muestra el número secreto (0 puntos)'],
        ['salir · exit · quit', 'Vuelve a la lista de juegos'],
        ['S / N', 'Después de una partida: jugar otra o volver a la lista de juegos']
      ],
      'help.about': 'Acerca del juego',
      'about.version': 'MBG Puzzles 1.0 · Descifra el código. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Los números secretos se eligen al azar en este dispositivo: ' + p.min + ' números posibles de 4 cifras, hasta ' + p.max + ' de 8.'; },
      'about.privacy': 'Funciona sin conexión. No hace falta cuenta: los nombres y las puntuaciones se quedan en este teléfono. Las suscripciones se pagan y se gestionan a través de Google Play.',
      'about.privacyFree': 'Funciona sin conexión. Gratis, sin anuncios y sin compras en la app. Los nombres y las puntuaciones se quedan en este teléfono.'
    },
    fr: {
      'app.title': 'Casse le code',
      'app.by': 'MBG Puzzles · par MBG',

      'btn.submit': 'Valider',
      'btn.help': 'Aide',
      'btn.quit': 'Quitter',
      'btn.user': 'Joueur',
      'btn.login': 'Connexion',
      'btn.logout': 'Déconnexion',
      'btn.settings': 'Réglages',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Fond',
      'btn.reveal': 'Voir le nombre',
      'btn.newGame': 'Nouvelle partie',
      'btn.length': function (p) { return 'Passer à ' + p.n + ' chiffres'; },
      'btn.close': 'Fermer',
      'aria.fontUp': 'Texte plus grand',
      'aria.fontDown': 'Texte plus petit',
      'aria.length': function (p) { return 'Longueur du nombre : ' + p.n + ' chiffres. Changer'; },
      'aria.history': 'Plateau de jeu',
      'aria.user': function (p) { return 'Joueur : ' + p.name; },

      'status.anonymous': 'Anonyme',
      'status.noData': 'Sans sauvegarde',
      'status.time': function (p) { return p.n + ' ' + plFr(p.n, 'seconde', 'secondes'); },
      'len.chip': function (p) { return p.n + ' chiffres'; },

      'label.play': function (p) { return 'Tape un nombre de ' + p.n + ' chiffres ou une commande'; },
      'label.yesno': 'Tu veux jouer une autre partie ? O/N',
      'ph.play': function (p) { return 'Nombre de ' + p.n + ' chiffres'; },
      'ph.yesno': 'Encore une partie ? O / N',

      'notice.storageUnavailable': 'Ce navigateur ne permet pas au jeu d’enregistrer les scores.',
      'notice.loggedIn': function (p) { return 'Bon retour, ' + p.name + ' ! Ton record : ' + p.best; },
      'notice.registered': function (p) { return 'Bienvenue, ' + p.name + ' !'; },
      'notice.noData': 'Tu joues sans sauvegarde',
      'notice.anonymous': 'Tu joues en Anonyme',
      'notice.restored': 'Ta partie a été restaurée',
      'warn.empty': function (p) { return 'Tape un nombre de ' + p.length + ' chiffres.'; },
      'reveal.what': 'le nombre entier',
      'hint.btn': 'Indice',
      'hint.what': 'un chiffre de plus',
      'hint.shown': function (p) { return 'Indice ' + p.number + ' : le chiffre ' + p.pos + ' est ' + p.ch; },
      'warn.noHint': 'Plus d’indices – la suite, c’est à toi.',
      'win.hints': function (p) { return 'Avec ' + p.n + ' ' + plFr(p.n, 'indice', 'indices') + ' – chacun compte comme ' + p.k + ' essais dans le score.'; },
      'warn.digits': 'Seulement des chiffres (0–9), s’il te plaît. Cet essai ne compte pas.',
      'warn.length': function (p) { return 'Ton nombre a ' + p.got + ' ' + plFr(p.got, 'chiffre', 'chiffres') + ' ; cette partie en demande ' + p.length + '. Ça ne compte pas.'; },
      'warn.roundOver': 'Partie terminée. Tape O pour rejouer ou N pour revenir aux jeux.',

      'win.title': 'BRAVO !',
      'win.titleName': function (p) { return 'BRAVO, ' + p.name + ' !'; },
      'win.found': function (p) { return 'Tu as trouvé ' + p.word + ' en ' + p.attempts + ' ' + plFr(p.attempts, 'essai', 'essais') + ' et ' + p.seconds + ' ' + plFr(p.seconds, 'seconde', 'secondes') + '.'; },
      'win.luck': 'Quelle chance ! Du premier coup !',
      'score.label': 'Score',
      'score.yourBest': 'Ton record',
      'score.allTime': 'Meilleur de tous les temps',
      'score.newBest': 'Nouveau record !',
      'score.newAllTime': 'Record absolu !',
      'score.notSaved': 'Non enregistré',
      'reveal.text': 'Plus de chance la prochaine fois !',
      'reveal.word': function (p) { return 'Le nombre secret était ' + p.word + '.'; },

      'dlg.cancel': 'Annuler',
      'restart.title': 'Commencer une nouvelle partie ?',
      'restart.length': function (p) { return 'Passer aux nombres de ' + p.n + ' chiffres termine cette partie. Elle ne sera pas comptée.'; },
      'restart.ok': 'Nouvelle partie',
      'login.title': 'Connexion',
      'login.lede': 'Connecte-toi pour garder ton propre record.',
      'login.label': 'Nom de joueur',
      'login.saved': 'Tes noms enregistrés',
      'login.other': 'Ou tape un nom',
      'login.pick': function (p) { return 'Se connecter en tant que ' + p.name + ', record ' + p.best; },
      'login.submit': 'Se connecter',
      'login.create': function (p) { return 'Créer « ' + p.name + ' »'; },
      'login.unknown': function (p) { return 'Il n’y a pas encore de joueur « ' + p.name + ' ». Le créer ?'; },
      'login.empty': 'Tape un nom de joueur.',
      'login.invalid': 'Utilise 2 à 20 lettres ou chiffres (espaces, points et tirets autorisés).',
      'login.reserved': function (p) { return '« ' + p.name + ' » est réservé. Choisis un autre nom.'; },
      'login.noData': 'Jouer sans sauvegarde',
      'login.anonymous': 'Enregistrer en Anonyme',
      'account.best': function (p) { return 'Ton meilleur score : ' + p.best; },
      'settings.title': 'Réglages',
      'settings.sound': 'Son',
      'settings.background': 'Fond',
      'settings.textSize': 'Taille du texte',
      'goodbye.title': 'Merci d’avoir joué !',
      'goodbye.text': 'Nous espérons que le jeu t’a plu. Reviens vite pour une nouvelle partie !',
      'goodbye.sign': 'Avec nos amitiés, MBG · Merkur Beqiri Games',
      'goodbye.again': 'Rejouer',
      'goodbye.close': 'Tu peux maintenant fermer cette fenêtre.',
      'wheel.title': 'Longueur du nombre',
      'wheel.done': 'OK',
      'wheel.item': function (p) { return p.n + ' chiffres'; },
      'help.title': 'Comment jouer',

      'toast.font': function (p) { return 'Taille du texte : ' + p.px + ' px'; },
      'toast.fontMax': 'C’est la plus grande taille de texte.',
      'toast.fontMin': 'C’est la plus petite taille de texte.',
      'theme.light': 'Clair',
      'theme.dark': 'Sombre',
      'theme.adriatic': 'Adriatique',
      'theme.meadow': 'Prairie',
      'theme.rose': 'Rose',
      'theme.random': 'Couleurs au hasard',

      'last.try': function (p) { return 'Essai ' + p.n; },
      'sr.guess': function (p) { return 'Essai ' + p.attempt + ' : ' + p.word + '. Indices : ' + p.clues; },
      'legend.O': 'bon chiffre, bonne place',
      'legend.Q': 'dans le nombre, mais à une autre place',
      'legend.X': 'pas dans le nombre',

      'help.html': function (c) {
        return '' +
          '<h3>Le but</h3><p>L’ordinateur choisit au hasard un nombre secret : de 4 chiffres pour commencer, ou de 5, 6, 7 ou 8 si tu veux. Les chiffres peuvent se répéter et le nombre peut commencer par 0, il y a donc 10 000 nombres possibles de 4 chiffres. Trouve-le en aussi peu d’essais que possible.</p>' +
          '<h3>Lire les indices</h3><p>Après chaque essai, chaque chiffre de ton nombre reçoit un indice, dans le même ordre :</p>' + c.legend +
          '<p class="example">Exemple : le nombre secret est 1234 et tu tapes 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Les chiffres répétés sont comptés avec soin. Nombre secret 7703, essai 1777 → <code>X O ? X</code>. Ton deuxième 7 est à la bonne place. Ton troisième 7 est dans le nombre, mais ailleurs (l’autre 7 du nombre secret). Il ne reste plus de 7 pour ton dernier chiffre, donc il reçoit X.</p>' +
          '<h3>Faire un essai</h3><p>Tape un nombre avec exactement le bon nombre de chiffres et appuie sur <b>Valider</b> ou Entrée. Sur le téléphone, le pavé numérique s’ouvre ; touche <b>Valider</b> pour envoyer ton essai. Les chiffres peuvent se répéter. Les nombres avec trop peu ou trop de chiffres, ou avec des lettres ou des symboles, ne comptent pas.</p>' +
          '<p class="example">Astuce : commence par 0123 puis 4567. Ensemble, ils montrent quels chiffres sont dans le nombre.</p>' +
          '<h3>Longueur du nombre</h3><p>Joue avec des nombres de 4, 5, 6, 7 ou 8 chiffres. Touche le bouton de longueur (par exemple <b>4 chiffres</b>) à côté de l’horloge et choisis une longueur. Sur le téléphone, fais tourner la roue.</p>' +
          '<h3>Gagner</h3><p>Quand tous les indices sont O, tu as trouvé le nombre. Les O se transforment en cœurs ❤️ et, avec le son, tu entends la musique de la victoire.</p>' +
          '<h3>Indices 💡</h3><p>Tu bloques ? Après ton 3<sup>e</sup> essai, un bouton avec une ampoule apparaît à côté du champ. Chaque indice dévoile un chiffre de plus du nombre secret, à une place au hasard que tu n’as pas encore trouvée, et coûte un crédit d’indices (voir ⚙ › Crédits d’indices : des crédits gratuits chaque jour, plus avec de bons scores). Le jeu ne donne jamais tout le nombre : il reste toujours au moins un chiffre pour toi. Chaque indice compte comme 2 essais de plus dans le score. Plus tes essais échouent, plus le bouton bouge souvent pour te rappeler qu’il est là.</p>' +
          '<h3>Voir le nombre</h3><p>Appuie sur <b>Voir le nombre</b>, ou tape <code>révéler</code> ou <code>reveal</code>, pour voir le nombre secret. La partie se termine avec 0 point.</p>' +
          '<h3>Score</h3><p>Moins il te faut d’essais, plus ton score est élevé : les points baissent fortement à chaque essai de plus. Un petit bonus de vitesse (jusqu’à 20 %) récompense les parties rapides.</p>' + c.scoreTable +
          '<p>Seuls ton meilleur score et le meilleur score de tous les temps sont gardés ; il n’y a pas de total.</p>' +
          '<h3>Commandes</h3>' + c.commandTable + '<p>Les commandes en français marchent tant que tu joues en français ; help, reveal et exit marchent dans toutes les langues. Les majuscules ne comptent pas. Sur le téléphone, le pavé numérique n’a pas de lettres : utilise alors les boutons.</p>' +
          '<h3>Joueurs</h3><p>Tu commences tout de suite en <b>Anonyme</b>. Ce record est partagé par tous ceux qui jouent sur cet appareil. Pour garder ton propre record, touche <b>Connexion</b> et tape ton nom de joueur, ou crées-en un nouveau. Les noms déjà utilisés y sont listés, alors se reconnecter se fait d’un seul geste. Dans la même fenêtre, tu peux aussi jouer sans rien enregistrer. Les scores restent sur cet appareil.</p>' +
          '<h3>Réglages</h3><p>Le bouton ⚙ contient le son (le tic-tac de l’horloge, un son pour chaque O et ?, et la musique de la victoire, plus éclatante quand le score est plus élevé), les couleurs de fond et la taille du texte (A+ / A−).</p>' +
          '<h3>Nouvelle partie</h3><p>Après une partie, appuie sur <b>Nouvelle partie</b> ou tape <code>O</code>. Si tu changes la longueur du nombre pendant une partie, une nouvelle partie commence après confirmation. Changer de langue garde ta partie.</p>' +
          '<h3>Revenir aux jeux</h3><p>Appuie sur <b>Quitter</b>, sur le bouton Retour ou sur le logo MBG en haut à gauche pour revenir à la liste des jeux. Une partie non terminée est gardée et continue à ton retour. Pour fermer l’app, utilise le bouton ⏻ de l’écran d’accueil.</p>';
      },
      'help.scoreHead': ['Longueur', 'Score maximal', 'Score minimal'],
      'help.scoreRow': function (p) { return [p.length + ' chiffres', p.hiScore + ' en ' + p.hiAttempt + ' essais', p.loScore + ' en ' + p.loAttempt + ' essais']; },
      'help.cmdHead': ['Tape', 'Ce que ça fait'],
      'help.cmdRows': [
        ['aide · règles · help', 'Ouvre ces instructions'],
        ['révéler · reveal', 'Montre le nombre secret (0 point)'],
        ['quitter · exit · quit', 'Revient à la liste des jeux'],
        ['O / N', 'Après une partie : rejouer ou revenir à la liste des jeux']
      ],
      'help.about': 'À propos',
      'about.version': 'MBG Puzzles 1.0 · Casse le code. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Les nombres secrets sont choisis au hasard sur cet appareil : ' + p.min + ' nombres possibles de 4 chiffres, jusqu’à ' + p.max + ' de 8.'; },
      'about.privacy': 'Fonctionne hors ligne. Pas besoin de compte : les noms et les scores restent sur ce téléphone. Les abonnements sont payés et gérés via Google Play.',
      'about.privacyFree': 'Fonctionne hors ligne. Gratuit, sans pub et sans achats intégrés. Les noms et les scores restent sur ce téléphone.'
    },
    tr: {
      'app.title': 'Şifreyi Kır',
      'app.by': 'MBG Puzzles · MBG',

      'btn.submit': 'Dene',
      'btn.help': 'Yardım',
      'btn.quit': 'Çık',
      'btn.user': 'Oyuncu',
      'btn.login': 'Giriş',
      'btn.logout': 'Çıkış yap',
      'btn.settings': 'Ayarlar',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Arka plan',
      'btn.reveal': 'Sayıyı göster',
      'btn.newGame': 'Yeni oyun',
      'btn.length': function (p) { return p.n + ' rakama geç'; },
      'btn.close': 'Kapat',
      'aria.fontUp': 'Daha büyük yazı',
      'aria.fontDown': 'Daha küçük yazı',
      'aria.length': function (p) { return 'Sayı uzunluğu: ' + p.n + ' rakam. Değiştir'; },
      'aria.history': 'Oyun tahtası',
      'aria.user': function (p) { return 'Oyuncu: ' + p.name; },

      'status.anonymous': 'Anonim',
      'status.noData': 'Kaydetmeden',
      'status.time': function (p) { return p.n + ' saniye'; },
      'len.chip': function (p) { return p.n + ' rakam'; },

      'label.play': function (p) { return p.n + ' rakamlı bir sayı ya da bir komut yaz'; },
      'label.yesno': 'Bir oyun daha oynamak ister misin? E/H',
      'ph.play': function (p) { return p.n + ' rakamlı sayı'; },
      'ph.yesno': 'Bir oyun daha? E / H',

      'notice.storageUnavailable': 'Bu tarayıcı oyunun skor kaydetmesine izin vermiyor.',
      'notice.loggedIn': function (p) { return 'Tekrar hoş geldin, ' + p.name + '! Rekorun: ' + p.best; },
      'notice.registered': function (p) { return 'Hoş geldin, ' + p.name + '!'; },
      'notice.noData': 'Kaydetmeden oynuyorsun',
      'notice.anonymous': 'Anonim olarak oynuyorsun',
      'notice.restored': 'Oyunun geri yüklendi',
      'warn.empty': function (p) { return p.length + ' rakamlı bir sayı yaz.'; },
      'reveal.what': 'sayının tamamını',
      'hint.btn': 'İpucu',
      'hint.what': 'bir rakam daha',
      'hint.shown': function (p) { return 'İpucu ' + p.number + ': ' + p.pos + '. rakam ' + p.ch; },
      'warn.noHint': 'Başka ipucu yok – gerisi sana kalmış.',
      'win.hints': function (p) { return p.n + ' ipucuyla – her biri puanda ' + p.k + ' deneme sayılır.'; },
      'warn.digits': 'Lütfen yalnızca rakam (0–9) yaz. Bu deneme sayılmadı.',
      'warn.length': function (p) { return 'Sayında ' + p.got + ' rakam var; bu oyun ' + p.length + ' rakam istiyor. Sayılmadı.'; },
      'warn.roundOver': 'Oyun bitti. Yeniden oynamak için E, oyunlara dönmek için H yaz.',

      'win.title': 'TEBRİKLER!',
      'win.titleName': function (p) { return 'TEBRİKLER, ' + p.name + '!'; },
      'win.found': function (p) { return p.word + ' sayısını ' + p.attempts + ' denemede ve ' + p.seconds + ' saniyede buldun.'; },
      'win.luck': 'Ne şans! İlk denemede!',
      'score.label': 'Puan',
      'score.yourBest': 'Rekorun',
      'score.allTime': 'Tüm zamanların en iyisi',
      'score.newBest': 'Yeni rekor!',
      'score.newAllTime': 'Tüm zamanların rekoru!',
      'score.notSaved': 'Kaydedilmedi',
      'reveal.text': 'Bir dahaki sefere bol şans!',
      'reveal.word': function (p) { return 'Gizli sayı: ' + p.word + '.'; },

      'dlg.cancel': 'İptal',
      'restart.title': 'Yeni oyun başlasın mı?',
      'restart.length': function (p) { return p.n + ' rakamlı sayılara geçmek bu oyunu bitirir. Oyun puanlanmaz.'; },
      'restart.ok': 'Yeni oyun',
      'login.title': 'Giriş',
      'login.lede': 'Kendi rekorunu saklamak için giriş yap.',
      'login.label': 'Oyuncu adı',
      'login.saved': 'Kayıtlı adların',
      'login.other': 'Ya da bir ad yaz',
      'login.pick': function (p) { return p.name + ' olarak giriş yap, rekor ' + p.best; },
      'login.submit': 'Giriş yap',
      'login.create': function (p) { return '“' + p.name + '” oluştur'; },
      'login.unknown': function (p) { return 'Henüz “' + p.name + '” adında bir oyuncu yok. Oluşturulsun mu?'; },
      'login.empty': 'Bir oyuncu adı yaz.',
      'login.invalid': '2–20 harf ya da rakam kullan (boşluk, nokta ve tire olabilir).',
      'login.reserved': function (p) { return '“' + p.name + '” ayrılmış bir ad. Başka bir ad seç.'; },
      'login.noData': 'Kaydetmeden oyna',
      'login.anonymous': 'Skorları Anonim olarak kaydet',
      'account.best': function (p) { return 'En yüksek puanın: ' + p.best; },
      'settings.title': 'Ayarlar',
      'settings.sound': 'Ses',
      'settings.background': 'Arka plan',
      'settings.textSize': 'Yazı boyutu',
      'goodbye.title': 'Oynadığın için teşekkürler!',
      'goodbye.text': 'Oyunu beğendiğini umuyoruz. Yeni bir tur için yakında yine gel!',
      'goodbye.sign': 'Sevgilerle, MBG · Merkur Beqiri Games',
      'goodbye.again': 'Yeniden oyna',
      'goodbye.close': 'Artık bu pencereyi kapatabilirsin.',
      'wheel.title': 'Sayı uzunluğu',
      'wheel.done': 'Tamam',
      'wheel.item': function (p) { return p.n + ' rakam'; },
      'help.title': 'Nasıl oynanır',

      'toast.font': function (p) { return 'Yazı boyutu: ' + p.px + ' px'; },
      'toast.fontMax': 'Bu en büyük yazı boyutu.',
      'toast.fontMin': 'Bu en küçük yazı boyutu.',
      'theme.light': 'Açık',
      'theme.dark': 'Koyu',
      'theme.adriatic': 'Adriyatik',
      'theme.meadow': 'Çayır',
      'theme.rose': 'Gül',
      'theme.random': 'Rastgele renkler',

      'last.try': function (p) { return 'Deneme ' + p.n; },
      'sr.guess': function (p) { return 'Deneme ' + p.attempt + ': ' + p.word + '. İpuçları: ' + p.clues; },
      'legend.O': 'doğru rakam, doğru yerde',
      'legend.Q': 'sayıda var, ama başka yerde',
      'legend.X': 'sayıda yok',

      'help.html': function (c) {
        return '' +
          '<h3>Amaç</h3><p>Bilgisayar rastgele gizli bir sayı seçer: başlangıçta 4 rakamlı, istersen 5, 6, 7 ya da 8 rakamlı. Rakamlar tekrar edebilir ve sayı 0 ile başlayabilir; yani 4 rakamlı 10.000 olası sayı vardır. Onu olabildiğince az denemede bul.</p>' +
          '<h3>İpuçlarını okumak</h3><p>Her denemeden sonra sayındaki her rakam, aynı sırayla bir ipucu alır:</p>' + c.legend +
          '<p class="example">Örnek: gizli sayı 1234, sen 2135 yazıyorsun → <code>? ? O X</code></p>' +
          '<p class="example">Tekrar eden rakamlar dikkatle sayılır. Gizli sayı 7703, deneme 1777 → <code>X O ? X</code>. İkinci 7’n doğru yerde. Üçüncü 7’n sayıda var, ama başka yerde (gizli sayının öteki 7’si). Son rakamın için artık 7 kalmadı, bu yüzden X alır.</p>' +
          '<h3>Tahmin etmek</h3><p>Tam doğru sayıda rakamı olan bir sayı yaz ve <b>Dene</b>’ye ya da Enter’a bas. Telefonda rakam klavyesi açılır; denemeni göndermek için <b>Dene</b>’ye dokun. Rakamlar tekrar edebilir. Rakamı eksik ya da fazla olan, harf veya işaret içeren sayılar sayılmaz.</p>' +
          '<p class="example">İpucu: önce 0123, sonra 4567 dene. İkisi birlikte hangi rakamların sayıda olduğunu gösterir.</p>' +
          '<h3>Sayı uzunluğu</h3><p>4, 5, 6, 7 ya da 8 rakamlı sayılarla oyna. Saatin yanındaki uzunluk düğmesine (örneğin <b>4 rakam</b>) dokun ve bir uzunluk seç. Telefonda çarkı çevir.</p>' +
          '<h3>Kazanmak</h3><p>Bütün ipuçları O olduğunda sayıyı bulmuşsun demektir. O’lar kalplere ❤️ dönüşür ve ses açıksa zafer melodisini duyarsın.</p>' +
          '<h3>İpuçları 💡</h3><p>Takıldın mı? 3. denemenden sonra yazı alanının yanında ampullü bir düğme çıkar. Her ipucu, gizli sayının henüz bulmadığın rastgele bir yerindeki bir rakamı daha açar ve bir ipucu kredisi tutar (bak: ⚙ › İpucu kredileri: her gün ücretsiz krediler, yüksek puanlarla daha fazlası). Oyun sayının tamamını asla vermez: en az bir rakam her zaman sana kalır. Her ipucu puanda 2 ek deneme sayılır. Ne kadar çok deneme boşa giderse, düğme sana orada olduğunu hatırlatmak için o kadar sık sallanır.</p>' +
          '<h3>Sayıyı göster</h3><p>Gizli sayıyı görmek için <b>Sayıyı göster</b>’e bas ya da <code>göster</code> veya <code>reveal</code> yaz. Oyun 0 puanla biter.</p>' +
          '<h3>Puanlama</h3><p>Ne kadar az deneme gerekirse puanın o kadar yüksek olur: her ek denemeyle puan hızla düşer. Küçük bir hız bonusu (%20’ye kadar) hızlı oyunları ödüllendirir.</p>' + c.scoreTable +
          '<p>Yalnızca senin en yüksek puanın ve tüm zamanların en yüksek puanı saklanır; toplam puan tutulmaz.</p>' +
          '<h3>Komutlar</h3>' + c.commandTable + '<p>Türkçe komutlar, Türkçe oynadığın sürece çalışır; help, reveal ve exit her dilde çalışır. Büyük ve küçük harf fark etmez. Telefonda rakam klavyesinde harf yoktur; o zaman düğmeleri kullan.</p>' +
          '<h3>Oyuncular</h3><p>Hemen <b>Anonim</b> olarak oynamaya başlarsın. Bu rekoru bu cihazda oynayan herkes paylaşır. Kendi rekorunu saklamak için <b>Giriş</b>’e dokun ve oyuncu adını yaz ya da yeni bir ad oluştur. Daha önce kullandığın adlar orada listelenir, böylece yeniden giriş tek dokunuştur. Aynı pencerede hiçbir şey kaydetmeden oynamayı da seçebilirsin. Skorlar bu cihazda saklanır.</p>' +
          '<h3>Ayarlar</h3><p>⚙ düğmesinde ses (saatin tik takı, her O ve ? için bir ses ve puan yükseldikçe daha görkemli olan zafer melodisi), arka plan renkleri ve yazı boyutu (A+ / A−) bulunur.</p>' +
          '<h3>Yeni oyun</h3><p>Bir oyundan sonra <b>Yeni oyun</b>’a bas ya da <code>E</code> yaz. Oyun sırasında sayı uzunluğunu değiştirirsen, onayladıktan sonra yeni bir oyun başlar. Dili değiştirmek oyununu bozmaz.</p>' +
          '<h3>Oyunlara dönmek</h3><p>Oyun listesine dönmek için <b>Çık</b>’a, Geri tuşuna ya da sol üstteki MBG işaretine bas. Bitmemiş bir oyun saklanır ve döndüğünde devam eder. Uygulamayı kapatmak için ana ekrandaki ⏻ düğmesini kullan.</p>';
      },
      'help.scoreHead': ['Uzunluk', 'En yüksek puan', 'En düşük puan'],
      'help.scoreRow': function (p) { return [p.length + ' rakam', p.hiAttempt + ' denemede ' + p.hiScore, p.loAttempt + ' denemede ' + p.loScore]; },
      'help.cmdHead': ['Yaz', 'Ne yapar'],
      'help.cmdRows': [
        ['yardım · kurallar · help', 'Bu açıklamaları açar'],
        ['göster · reveal', 'Gizli sayıyı gösterir (0 puan)'],
        ['çık · çıkış · exit', 'Oyun listesine döner'],
        ['E / H', 'Oyundan sonra: yeniden oyna ya da oyun listesine dön']
      ],
      'help.about': 'Oyun hakkında',
      'about.version': 'MBG Puzzles 1.0 · Şifreyi Kır. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Gizli sayılar bu cihazda rastgele seçilir: 4 rakamlı ' + p.min + ' olası sayı, 8 rakamlıda ' + p.max + ' sayıya kadar.'; },
      'about.privacy': 'İnternetsiz de çalışır. Hesap gerekmez: adlar ve skorlar bu telefonda kalır. Abonelikler Google Play üzerinden ödenir ve yönetilir.',
      'about.privacyFree': 'İnternetsiz de çalışır. Ücretsiz, reklamsız ve uygulama içi satın alma yok. Adlar ve skorlar bu telefonda kalır.'
    },
    pl: {
      'app.title': 'Złam szyfr',
      'app.by': 'MBG Puzzles · od MBG',

      'btn.submit': 'Sprawdź',
      'btn.help': 'Pomoc',
      'btn.quit': 'Wyjdź',
      'btn.user': 'Gracz',
      'btn.login': 'Zaloguj',
      'btn.logout': 'Wyloguj',
      'btn.settings': 'Ustawienia',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Tło',
      'btn.reveal': 'Pokaż liczbę',
      'btn.newGame': 'Nowa gra',
      'btn.length': function (p) { return 'Przełącz na ' + p.n + ' ' + plPl(p.n, 'cyfrę', 'cyfry', 'cyfr'); },
      'btn.close': 'Zamknij',
      'aria.fontUp': 'Większy tekst',
      'aria.fontDown': 'Mniejszy tekst',
      'aria.length': function (p) { return 'Długość liczby: ' + p.n + ' ' + plPl(p.n, 'cyfra', 'cyfry', 'cyfr') + '. Zmień'; },
      'aria.history': 'Plansza',
      'aria.user': function (p) { return 'Gracz: ' + p.name; },

      'status.anonymous': 'Anonim',
      'status.noData': 'Bez zapisu',
      'status.time': function (p) { return p.n + ' ' + plPl(p.n, 'sekunda', 'sekundy', 'sekund'); },
      'len.chip': function (p) { return p.n + ' ' + plPl(p.n, 'cyfra', 'cyfry', 'cyfr'); },

      'label.play': function (p) { return 'Wpisz liczbę ' + p.n + '-cyfrową albo polecenie'; },
      'label.yesno': 'Chcesz zagrać jeszcze raz? T/N',
      'ph.play': function (p) { return 'Wpisz liczbę ' + p.n + '-cyfrową'; },
      'ph.yesno': 'Jeszcze raz? T / N',

      'notice.storageUnavailable': 'Ta przeglądarka nie pozwala grze zapisywać wyników.',
      'notice.loggedIn': function (p) { return 'Witaj ponownie, ' + p.name + '! Twój rekord: ' + p.best; },
      'notice.registered': function (p) { return 'Witaj, ' + p.name + '!'; },
      'notice.noData': 'Gra bez zapisu',
      'notice.anonymous': 'Grasz jako Anonim',
      'notice.restored': 'Twoja gra została przywrócona',
      'warn.empty': function (p) { return 'Wpisz liczbę ' + p.length + '-cyfrową.'; },
      'reveal.what': 'całą liczbę',
      'hint.btn': 'Podpowiedź',
      'hint.what': 'jeszcze jedną cyfrę',
      'hint.shown': function (p) { return 'Podpowiedź ' + p.number + ': cyfra nr ' + p.pos + ' to ' + p.ch; },
      'warn.noHint': 'Koniec podpowiedzi – reszta należy do ciebie.',
      'win.hints': function (p) { return 'Z ' + p.n + ' ' + plPl(p.n, 'podpowiedzią', 'podpowiedziami', 'podpowiedziami') + ' – każda liczy się w wyniku jak ' + p.k + ' próby.'; },
      'warn.digits': 'Tylko cyfry (0–9). Ta próba się nie liczy.',
      'warn.length': function (p) { return 'Twoja liczba ma ' + p.got + ' ' + plPl(p.got, 'cyfrę', 'cyfry', 'cyfr') + ', a ta gra wymaga ' + p.length + '. Nie liczy się.'; },
      'warn.roundOver': 'Koniec gry. Wpisz T, aby zagrać jeszcze raz, albo N, aby wrócić do listy gier.',

      'win.title': 'GRATULACJE!',
      'win.titleName': function (p) { return 'GRATULACJE, ' + p.name + '!'; },
      'win.found': function (p) { return 'Znaleziono ' + p.word + ' w ' + p.attempts + ' ' + plPl(p.attempts, 'próbie', 'próbach', 'próbach') + ', w ' + p.seconds + ' ' + plPl(p.seconds, 'sekundę', 'sekundy', 'sekund') + '.'; },
      'win.luck': 'Co za szczęście! Za pierwszym razem!',
      'score.label': 'Wynik',
      'score.yourBest': 'Twój rekord',
      'score.allTime': 'Rekord wszech czasów',
      'score.newBest': 'Nowy rekord!',
      'score.newAllTime': 'Rekord wszech czasów!',
      'score.notSaved': 'Niezapisany',
      'reveal.text': 'Następnym razem się uda!',
      'reveal.word': function (p) { return 'Tajna liczba to ' + p.word + '.'; },

      'dlg.cancel': 'Anuluj',
      'restart.title': 'Zacząć nową grę?',
      'restart.length': function (p) { return 'Zmiana na liczby ' + p.n + '-cyfrowe kończy tę grę. Nie zostanie oceniona.'; },
      'restart.ok': 'Nowa gra',
      'login.title': 'Zaloguj się',
      'login.lede': 'Zaloguj się, aby mieć własny rekord.',
      'login.label': 'Nazwa gracza',
      'login.saved': 'Twoje zapisane nazwy',
      'login.other': 'Albo wpisz nazwę',
      'login.pick': function (p) { return 'Zaloguj jako ' + p.name + ', rekord ' + p.best; },
      'login.submit': 'Zaloguj',
      'login.create': function (p) { return 'Utwórz „' + p.name + '”'; },
      'login.unknown': function (p) { return 'Nie ma jeszcze gracza „' + p.name + '”. Utworzyć?'; },
      'login.empty': 'Wpisz nazwę gracza.',
      'login.invalid': 'Użyj 2–20 liter lub cyfr (dozwolone spacje, kropki, myślniki).',
      'login.reserved': function (p) { return 'Nazwa „' + p.name + '” jest zastrzeżona. Wybierz inną.'; },
      'login.noData': 'Graj bez zapisu',
      'login.anonymous': 'Zapisuj wyniki jako Anonim',
      'account.best': function (p) { return 'Twój najlepszy wynik: ' + p.best; },
      'settings.title': 'Ustawienia',
      'settings.sound': 'Dźwięk',
      'settings.background': 'Tło',
      'settings.textSize': 'Rozmiar tekstu',
      'goodbye.title': 'Dziękujemy za grę!',
      'goodbye.text': 'Mamy nadzieję, że gra ci się podobała. Wróć wkrótce na kolejną rundę!',
      'goodbye.sign': 'Serdeczne pozdrowienia od MBG · Merkur Beqiri Games',
      'goodbye.again': 'Zagraj jeszcze raz',
      'goodbye.close': 'Możesz teraz zamknąć to okno.',
      'wheel.title': 'Długość liczby',
      'wheel.done': 'Gotowe',
      'wheel.item': function (p) { return p.n + ' ' + plPl(p.n, 'cyfra', 'cyfry', 'cyfr'); },
      'help.title': 'Jak grać',

      'toast.font': function (p) { return 'Rozmiar tekstu: ' + p.px + ' px'; },
      'toast.fontMax': 'To największy rozmiar tekstu.',
      'toast.fontMin': 'To najmniejszy rozmiar tekstu.',
      'theme.light': 'Jasne',
      'theme.dark': 'Ciemne',
      'theme.adriatic': 'Adriatyk',
      'theme.meadow': 'Łąka',
      'theme.rose': 'Róża',
      'theme.random': 'Losowe kolory',

      'last.try': function (p) { return 'Próba ' + p.n; },
      'sr.guess': function (p) { return 'Próba ' + p.attempt + ': ' + p.word + '. Wskazówki: ' + p.clues; },
      'legend.O': 'dobra cyfra na dobrym miejscu',
      'legend.Q': 'jest w liczbie, ale na innym miejscu',
      'legend.X': 'nie ma jej w liczbie',

      'help.html': function (c) {
        return '' +
          '<h3>Cel gry</h3><p>Komputer losuje tajną liczbę: na początek 4-cyfrową, a jeśli chcesz, 5-, 6-, 7- lub 8-cyfrową. Cyfry mogą się powtarzać, a liczba może zaczynać się od 0, więc jest 10 000 możliwych liczb 4-cyfrowych. Znajdź ją w jak najmniejszej liczbie prób.</p>' +
          '<h3>Jak czytać wskazówki</h3><p>Po każdej próbie każda cyfra twojej liczby dostaje wskazówkę, w tej samej kolejności:</p>' + c.legend +
          '<p class="example">Przykład: tajna liczba to 1234, a ty wpisujesz 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Powtarzające się cyfry są liczone uważnie. Tajna liczba 7703, próba 1777 → <code>X O ? X</code>. Twoja druga 7 jest na dobrym miejscu. Trzecia 7 jest w liczbie, ale gdzie indziej (to druga 7 tajnej liczby). Dla ostatniej cyfry nie zostaje już żadna 7, więc dostaje X.</p>' +
          '<h3>Jak zgadywać</h3><p>Wpisz liczbę o dokładnie właściwej liczbie cyfr i naciśnij <b>Sprawdź</b> lub Enter. Na telefonie otwiera się klawiatura numeryczna; dotknij <b>Sprawdź</b>, aby wysłać próbę. Cyfry mogą się powtarzać. Liczby ze zbyt małą lub zbyt dużą liczbą cyfr albo z literami czy znakami się nie liczą.</p>' +
          '<p class="example">Rada: zacznij od 0123, a potem 4567. Razem pokażą, które cyfry są w liczbie.</p>' +
          '<h3>Długość liczby</h3><p>Graj liczbami 4-, 5-, 6-, 7- lub 8-cyfrowymi. Dotknij przycisku długości (na przykład <b>4 cyfry</b>) obok zegara i wybierz długość. Na telefonie przesuń kółko.</p>' +
          '<h3>Wygrana</h3><p>Gdy każda wskazówka to O, liczba jest odgadnięta. Znaki O zmieniają się w serca ❤️, a przy włączonym dźwięku słychać zwycięską melodię.</p>' +
          '<h3>Podpowiedzi 💡</h3><p>Nie wiesz, co dalej? Po 3. próbie obok pola wpisywania pojawia się przycisk z żarówką. Każda podpowiedź odkrywa jeszcze jedną cyfrę tajnej liczby, w losowym miejscu, które jest jeszcze nieodgadnięte, i kosztuje kredyt na podpowiedzi (zobacz ⚙ › Kredyty na podpowiedzi: darmowe kredyty codziennie, więcej za wysokie wyniki). Gra nigdy nie zdradza całej liczby: zawsze zostaje ci co najmniej jedna cyfra. Każda podpowiedź liczy się w wyniku jak 2 dodatkowe próby. Im więcej nieudanych prób, tym częściej przycisk się porusza, żeby przypomnieć, że jest.</p>' +
          '<h3>Pokaż liczbę</h3><p>Naciśnij <b>Pokaż liczbę</b> albo wpisz <code>pokaż</code> lub <code>reveal</code>, aby zobaczyć tajną liczbę. Gra kończy się z wynikiem 0.</p>' +
          '<h3>Punktacja</h3><p>Im mniej prób potrzebujesz, tym wyższy wynik: punkty spadają wykładniczo z każdą dodatkową próbą. Mały bonus za szybkość (do 20%) nagradza szybkie gry.</p>' + c.scoreTable +
          '<p>Zapisywany jest tylko twój najlepszy wynik i najlepszy wynik wszech czasów; punkty się nie sumują.</p>' +
          '<h3>Polecenia</h3>' + c.commandTable + '<p>Polecenia nie zważają na wielkość liter, a angielskie działają w każdym języku. Na telefonie klawiatura numeryczna nie ma liter, więc używaj wtedy przycisków.</p>' +
          '<h3>Gracze</h3><p>Od razu grasz jako <b>Anonim</b>. Jego rekord jest wspólny dla wszystkich, którzy grają na tym urządzeniu. Aby mieć własny rekord, dotknij <b>Zaloguj</b> i wpisz swoją nazwę albo utwórz nową. Nazwy użyte wcześniej na tym urządzeniu są tam wymienione, więc ponowne logowanie to jedno dotknięcie. W tym samym oknie możesz też wybrać grę bez zapisywania. Wyniki są przechowywane na tym urządzeniu.</p>' +
          '<h3>Ustawienia</h3><p>Przycisk ⚙ zawiera włącznik dźwięku (tykanie zegara, ton dla każdego O i ? oraz zwycięska melodia – tym okazalsza, im wyższy wynik), kolory tła i rozmiar tekstu (A+ / A−).</p>' +
          '<h3>Nowa gra</h3><p>Po grze naciśnij <b>Nowa gra</b> albo wpisz <code>T</code>. Zmiana długości liczby w trakcie gry zaczyna nową grę po potwierdzeniu. Zmiana języka nie przerywa gry.</p>' +
          '<h3>Powrót do gier</h3><p>Naciśnij <b>Wyjdź</b>, przycisk Wstecz albo znak MBG w lewym górnym rogu, aby wrócić do listy gier. Niedokończona gra zostaje zachowana i trwa dalej, gdy wrócisz. Aby zamknąć aplikację, użyj przycisku ⏻ na ekranie startowym.</p>';
      },
      'help.scoreHead': ['Długość', 'Najwyższy wynik', 'Najniższy wynik'],
      'help.scoreRow': function (p) { return [p.length + ' ' + plPl(p.length, 'cyfra', 'cyfry', 'cyfr'), p.hiScore + ' przy ' + p.hiAttempt + ' ' + plPl(p.hiAttempt, 'próbie', 'próbach', 'próbach'), p.loScore + ' przy ' + p.loAttempt + ' ' + plPl(p.loAttempt, 'próbie', 'próbach', 'próbach')]; },
      'help.cmdHead': ['Wpisz', 'Co się dzieje'],
      'help.cmdRows': [
        ['pomoc · zasady · help', 'Otwiera tę instrukcję'],
        ['pokaż · reveal', 'Pokazuje tajną liczbę (wynik 0)'],
        ['wyjdź · koniec · exit', 'Powrót do listy gier'],
        ['T / N', 'Po grze: zagraj jeszcze raz albo wróć do listy gier']
      ],
      'help.about': 'O grze',
      'about.version': 'MBG Puzzles 1.0 · Złam szyfr. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Tajne liczby są losowane na tym urządzeniu: ' + p.min + ' możliwych liczb 4-cyfrowych, aż do ' + p.max + ' liczb 8-cyfrowych.'; },
      'about.privacy': 'Działa bez internetu. Nie potrzeba konta: nazwy i wyniki zostają na tym telefonie. Subskrypcje są opłacane i zarządzane przez Google Play.',
      'about.privacyFree': 'Działa bez internetu. Za darmo, bez reklam i bez zakupów w aplikacji. Nazwy i wyniki zostają na tym telefonie.'
    },
    pt: {
      'app.title': 'Quebre o código',
      'app.by': 'MBG Puzzles · da MBG',

      'btn.submit': 'Enviar',
      'btn.help': 'Ajuda',
      'btn.quit': 'Sair',
      'btn.user': 'Jogador',
      'btn.login': 'Entrar',
      'btn.logout': 'Sair da conta',
      'btn.settings': 'Configurações',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'Fundo',
      'btn.reveal': 'Ver número',
      'btn.newGame': 'Nova partida',
      'btn.length': function (p) { return 'Mudar para ' + p.n + ' dígitos'; },
      'btn.close': 'Fechar',
      'aria.fontUp': 'Texto maior',
      'aria.fontDown': 'Texto menor',
      'aria.length': function (p) { return 'Tamanho do número: ' + p.n + ' dígitos. Alterar'; },
      'aria.history': 'Tabuleiro',
      'aria.user': function (p) { return 'Jogador: ' + p.name; },

      'status.anonymous': 'Anônimo',
      'status.noData': 'Sem salvar',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'segundo', 'segundos'); },
      'len.chip': function (p) { return p.n + ' dígitos'; },

      'label.play': function (p) { return 'Digite um número de ' + p.n + ' dígitos ou um comando'; },
      'label.yesno': 'Quer jogar outra partida? S/N',
      'ph.play': function (p) { return 'Digite um número de ' + p.n + ' dígitos'; },
      'ph.yesno': 'Jogar de novo? S / N',

      'notice.storageUnavailable': 'Este navegador não deixa o jogo salvar pontuações.',
      'notice.loggedIn': function (p) { return 'Bem-vindo de volta, ' + p.name + '! Seu recorde: ' + p.best; },
      'notice.registered': function (p) { return 'Bem-vindo, ' + p.name + '!'; },
      'notice.noData': 'Jogando sem salvar',
      'notice.anonymous': 'Jogando como Anônimo',
      'notice.restored': 'Sua partida foi restaurada',
      'warn.empty': function (p) { return 'Digite um número de ' + p.length + ' dígitos.'; },
      'reveal.what': 'o número inteiro',
      'hint.btn': 'Dica',
      'hint.what': 'mais um dígito',
      'hint.shown': function (p) { return 'Dica ' + p.number + ': o dígito ' + p.pos + ' é ' + p.ch; },
      'warn.noHint': 'Acabaram as dicas – o resto é com você.',
      'win.hints': function (p) { return 'Com ' + p.n + ' ' + pl(p.n, 'dica', 'dicas') + ' – cada uma conta como ' + p.k + ' tentativas na pontuação.'; },
      'warn.digits': 'Só dígitos (0–9), por favor. Esta tentativa não contou.',
      'warn.length': function (p) { return 'Seu número tem ' + p.got + ' ' + pl(p.got, 'dígito', 'dígitos') + '; esta partida pede ' + p.length + '. Não contou.'; },
      'warn.roundOver': 'Fim de jogo. Digite S para jogar de novo ou N para voltar aos jogos.',

      'win.title': 'PARABÉNS!',
      'win.titleName': function (p) { return 'PARABÉNS, ' + p.name + '!'; },
      'win.found': function (p) { return 'Você descobriu ' + p.word + ' em ' + p.attempts + ' ' + pl(p.attempts, 'tentativa', 'tentativas') + ' e ' + p.seconds + ' ' + pl(p.seconds, 'segundo', 'segundos') + '.'; },
      'win.luck': 'Que sorte! De primeira!',
      'score.label': 'Pontos',
      'score.yourBest': 'Seu recorde',
      'score.allTime': 'Recorde geral',
      'score.newBest': 'Novo recorde!',
      'score.newAllTime': 'Recorde de todos os tempos!',
      'score.notSaved': 'Não salvo',
      'reveal.text': 'Mais sorte na próxima!',
      'reveal.word': function (p) { return 'O número secreto era ' + p.word + '.'; },

      'dlg.cancel': 'Cancelar',
      'restart.title': 'Começar uma partida nova?',
      'restart.length': function (p) { return 'Mudar para números de ' + p.n + ' dígitos encerra esta partida. Ela não será pontuada.'; },
      'restart.ok': 'Nova partida',
      'login.title': 'Entrar',
      'login.lede': 'Entre para guardar o seu próprio recorde.',
      'login.label': 'Nome de jogador',
      'login.saved': 'Seus nomes salvos',
      'login.other': 'Ou digite um nome',
      'login.pick': function (p) { return 'Entrar como ' + p.name + ', recorde ' + p.best; },
      'login.submit': 'Entrar',
      'login.create': function (p) { return 'Criar “' + p.name + '”'; },
      'login.unknown': function (p) { return 'Ainda não existe o jogador “' + p.name + '”. Criar?'; },
      'login.empty': 'Digite um nome de jogador.',
      'login.invalid': 'Use de 2 a 20 letras ou dígitos (espaços, pontos e hifens são permitidos).',
      'login.reserved': function (p) { return '“' + p.name + '” é reservado. Escolha outro nome.'; },
      'login.noData': 'Jogar sem salvar',
      'login.anonymous': 'Salvar pontuações como Anônimo',
      'account.best': function (p) { return 'Sua maior pontuação: ' + p.best; },
      'settings.title': 'Configurações',
      'settings.sound': 'Som',
      'settings.background': 'Fundo',
      'settings.textSize': 'Tamanho do texto',
      'goodbye.title': 'Obrigado por jogar!',
      'goodbye.text': 'Esperamos que você tenha gostado do jogo. Volte logo para mais uma rodada!',
      'goodbye.sign': 'Um abraço da MBG · Merkur Beqiri Games',
      'goodbye.again': 'Jogar de novo',
      'goodbye.close': 'Agora você pode fechar esta janela.',
      'wheel.title': 'Tamanho do número',
      'wheel.done': 'Pronto',
      'wheel.item': function (p) { return p.n + ' dígitos'; },
      'help.title': 'Como jogar',

      'toast.font': function (p) { return 'Tamanho do texto: ' + p.px + ' px'; },
      'toast.fontMax': 'Este é o maior tamanho de texto.',
      'toast.fontMin': 'Este é o menor tamanho de texto.',
      'theme.light': 'Claro',
      'theme.dark': 'Escuro',
      'theme.adriatic': 'Adriático',
      'theme.meadow': 'Campo',
      'theme.rose': 'Rosa',
      'theme.random': 'Cores aleatórias',

      'last.try': function (p) { return 'Tentativa ' + p.n; },
      'sr.guess': function (p) { return 'Tentativa ' + p.attempt + ': ' + p.word + '. Pistas: ' + p.clues; },
      'legend.O': 'dígito certo no lugar certo',
      'legend.Q': 'está no número, mas em outro lugar',
      'legend.X': 'não está no número',

      'help.html': function (c) {
        return '' +
          '<h3>O objetivo</h3><p>O computador sorteia um número secreto: de 4 dígitos para começar, ou de 5, 6, 7 ou 8 se você quiser. Os dígitos podem se repetir e o número pode começar com 0, então há 10.000 números possíveis de 4 dígitos. Descubra o número com o menor número de tentativas.</p>' +
          '<h3>Como ler as pistas</h3><p>Depois de cada tentativa, cada dígito do seu número recebe uma pista, na mesma ordem:</p>' + c.legend +
          '<p class="example">Exemplo: o número secreto é 1234 e você digita 2135 → <code>? ? O X</code></p>' +
          '<p class="example">Os dígitos repetidos são contados com cuidado. Número secreto 7703, tentativa 1777 → <code>X O ? X</code>. O seu segundo 7 está no lugar certo. O terceiro 7 está no número, mas em outro lugar (é o outro 7 do segredo). Não sobra nenhum 7 para o último dígito, então ele recebe X.</p>' +
          '<h3>Como tentar</h3><p>Digite um número com a quantidade exata de dígitos e toque em <b>Enviar</b> ou Enter. No celular, abre o teclado numérico; toque em <b>Enviar</b> para mandar a tentativa. Os dígitos podem se repetir. Números com dígitos de menos ou de mais, ou com letras ou símbolos, não contam.</p>' +
          '<p class="example">Dica: comece com 0123 e depois 4567. Juntos, eles mostram quais dígitos estão no número.</p>' +
          '<h3>Tamanho do número</h3><p>Jogue com números de 4, 5, 6, 7 ou 8 dígitos. Toque no botão de tamanho (por exemplo <b>4 dígitos</b>) ao lado do relógio e escolha. No celular, gire a roda.</p>' +
          '<h3>Vencer</h3><p>Quando todas as pistas forem O, você descobriu o número. Os O viram corações ❤️ e, com o som ligado, toca a música da vitória.</p>' +
          '<h3>Dicas 💡</h3><p>Travou? Depois da 3ª tentativa, aparece um botão de lâmpada ao lado do campo. Cada dica revela mais um dígito do número secreto, num lugar sorteado que você ainda não descobriu, e custa um crédito de dica (veja ⚙ › Créditos de dicas: créditos grátis todo dia, mais com pontuações altas). O jogo nunca entrega o número inteiro: sempre sobra pelo menos um dígito para você. Cada dica conta como 2 tentativas a mais na pontuação. Quanto mais tentativas erradas, mais vezes o botão balança para lembrar que está ali.</p>' +
          '<h3>Ver número</h3><p>Toque em <b>Ver número</b> ou digite <code>revelar</code> ou <code>reveal</code> para ver o número secreto. A partida termina com 0 pontos.</p>' +
          '<h3>Pontuação</h3><p>Quanto menos tentativas, maior a pontuação: os pontos caem exponencialmente a cada tentativa a mais. Um pequeno bônus de velocidade (até 20%) premia partidas rápidas.</p>' + c.scoreTable +
          '<p>Só a sua maior pontuação e o recorde geral ficam guardados; os pontos não se somam.</p>' +
          '<h3>Comandos</h3>' + c.commandTable + '<p>Os comandos não diferenciam maiúsculas, e os em inglês funcionam em todos os idiomas. No celular, o teclado numérico não tem letras; use os botões.</p>' +
          '<h3>Jogadores</h3><p>Você começa a jogar na hora como <b>Anônimo</b>. O recorde dele é compartilhado por todos que jogam neste aparelho. Para ter o seu próprio recorde, toque em <b>Entrar</b> e digite o seu nome de jogador, ou crie um novo. Os nomes que você já usou aparecem ali, então entrar de novo é um toque. Na mesma janela você também pode jogar sem salvar nada. As pontuações ficam neste aparelho.</p>' +
          '<h3>Configurações</h3><p>O botão ⚙ tem o interruptor de som (o tique-taque do relógio, um tom para cada O e ? e a música da vitória, mais grandiosa quanto maior a pontuação), as cores de fundo e o tamanho do texto (A+ / A−).</p>' +
          '<h3>Nova partida</h3><p>Depois de uma partida, toque em <b>Nova partida</b> ou digite <code>S</code>. Mudar o tamanho do número durante uma partida começa uma nova depois que você confirmar. Mudar o idioma mantém a partida.</p>' +
          '<h3>Voltar aos jogos</h3><p>Toque em <b>Sair</b>, no botão Voltar ou na marca MBG no canto superior esquerdo para voltar à lista de jogos. Uma partida não terminada fica guardada e continua quando você voltar. Para fechar o app, use o botão ⏻ na tela inicial.</p>';
      },
      'help.scoreHead': ['Tamanho', 'Maior pontuação', 'Menor pontuação'],
      'help.scoreRow': function (p) { return [p.length + ' dígitos', p.hiScore + ' com ' + p.hiAttempt + ' tentativas', p.loScore + ' com ' + p.loAttempt + ' tentativas']; },
      'help.cmdHead': ['Digite', 'O que faz'],
      'help.cmdRows': [
        ['ajuda · regras · help', 'Abre estas instruções'],
        ['revelar · reveal', 'Mostra o número secreto (0 pontos)'],
        ['sair · exit', 'Volta para a lista de jogos'],
        ['S / N', 'Depois de uma partida: jogar de novo ou voltar à lista de jogos']
      ],
      'help.about': 'Sobre',
      'about.version': 'MBG Puzzles 1.0 · Quebre o código. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'Os números secretos são sorteados neste aparelho: ' + p.min + ' números possíveis com 4 dígitos, até ' + p.max + ' com 8.'; },
      'about.privacy': 'Funciona sem internet. Não precisa de conta: nomes e pontuações ficam neste celular. As assinaturas são pagas e gerenciadas pelo Google Play.',
      'about.privacyFree': 'Funciona sem internet. Grátis, sem anúncios e sem compras no app. Nomes e pontuações ficam neste celular.'
    },
    ar: {
      'app.title': 'اكسر الرمز',
      'app.by': 'MBG Puzzles · من MBG',

      'btn.submit': 'تحقّق',
      'btn.help': 'مساعدة',
      'btn.quit': 'خروج',
      'btn.user': 'اللاعب',
      'btn.login': 'دخول',
      'btn.logout': 'خروج من الحساب',
      'btn.settings': 'الإعدادات',
      'btn.fontUp': 'A+',
      'btn.fontDown': 'A−',
      'btn.theme': 'الخلفية',
      'btn.reveal': 'اكشف الرقم',
      'btn.newGame': 'لعبة جديدة',
      'btn.length': function (p) { return 'التبديل إلى ' + p.n + ' أرقام'; },
      'btn.close': 'إغلاق',
      'aria.fontUp': 'نص أكبر',
      'aria.fontDown': 'نص أصغر',
      'aria.length': function (p) { return 'طول الرقم: ' + p.n + ' أرقام. تغيير'; },
      'aria.history': 'لوحة اللعب',
      'aria.user': function (p) { return 'اللاعب: ' + p.name; },

      'status.anonymous': 'مجهول',
      'status.noData': 'دون حفظ',
      'status.time': function (p) { return arN(p.n, 'ثانية واحدة', 'ثانيتان', 'ثوانٍ', 'ثانية'); },
      'len.chip': function (p) { return p.n + ' أرقام'; },

      'label.play': function (p) { return 'أدخل رقمًا من ' + p.n + ' خانات أو أمرًا'; },
      'label.yesno': 'هل تريد لعبة أخرى؟ ن/ل',
      'ph.play': function (p) { return 'اكتب رقمًا من ' + p.n + ' خانات'; },
      'ph.yesno': 'مرة أخرى؟ ن / ل',

      'notice.storageUnavailable': 'هذا المتصفح لا يسمح للعبة بحفظ النتائج.',
      'notice.loggedIn': function (p) { return 'أهلًا بعودتك يا ' + p.name + '! أفضل نتيجة لك: ' + p.best; },
      'notice.registered': function (p) { return 'أهلًا بك يا ' + p.name + '!'; },
      'notice.noData': 'اللعب دون حفظ',
      'notice.anonymous': 'تلعب باسم مجهول',
      'notice.restored': 'استُعيدت لعبتك',
      'warn.empty': function (p) { return 'اكتب رقمًا من ' + p.length + ' خانات.'; },
      'reveal.what': 'الرقم كاملًا',
      'hint.btn': 'تلميح',
      'hint.what': 'خانة أخرى',
      'hint.shown': function (p) { return 'التلميح ' + p.number + ': الخانة ' + p.pos + ' هي ' + p.ch; },
      'warn.noHint': 'لا مزيد من التلميحات – الباقي عليك.',
      'win.hints': function (p) { return 'مع ' + arN(p.n, 'تلميح واحد', 'تلميحين', 'تلميحات', 'تلميحًا') + ' – كل تلميح يُحسب في النتيجة كـ ' + arN(p.k, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة') + '.'; },
      'warn.digits': 'الأرقام فقط (0–9) من فضلك. لم تُحتسب هذه المحاولة.',
      'warn.length': function (p) { return 'رقمك فيه ' + arN(p.got, 'خانة واحدة', 'خانتان', 'خانات', 'خانة') + '، وهذه اللعبة تحتاج ' + p.length + '. لم تُحتسب.'; },
      'warn.roundOver': 'انتهت اللعبة. اكتب ن لتلعب مرة أخرى أو ل لتعود إلى الألعاب.',

      'win.title': 'تهانينا!',
      'win.titleName': function (p) { return 'تهانينا يا ' + p.name + '!'; },
      'win.found': function (p) { return 'وجدت ' + p.word + ' في ' + arN(p.attempts, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة') + ' و' + arN(p.seconds, 'ثانية واحدة', 'ثانيتين', 'ثوانٍ', 'ثانية') + '.'; },
      'win.luck': 'يا للحظ! من المحاولة الأولى!',
      'score.label': 'النتيجة',
      'score.yourBest': 'أفضل نتيجة لك',
      'score.allTime': 'أفضل نتيجة على الإطلاق',
      'score.newBest': 'رقم قياسي جديد!',
      'score.newAllTime': 'رقم قياسي مطلق!',
      'score.notSaved': 'غير محفوظة',
      'reveal.text': 'حظًا أوفر في المرة القادمة!',
      'reveal.word': function (p) { return 'كان الرقم السري ' + p.word + '.'; },

      'dlg.cancel': 'إلغاء',
      'restart.title': 'بدء لعبة جديدة؟',
      'restart.length': function (p) { return 'التبديل إلى أرقام من ' + p.n + ' خانات ينهي هذه اللعبة، ولن تُحتسب لها نتيجة.'; },
      'restart.ok': 'لعبة جديدة',
      'login.title': 'تسجيل الدخول',
      'login.lede': 'سجّل الدخول لتحتفظ بأفضل نتيجة خاصة بك.',
      'login.label': 'اسم اللاعب',
      'login.saved': 'أسماؤك المحفوظة',
      'login.other': 'أو اكتب اسمًا',
      'login.pick': function (p) { return 'الدخول باسم ' + p.name + '، أفضل نتيجة ' + p.best; },
      'login.submit': 'دخول',
      'login.create': function (p) { return 'إنشاء «' + p.name + '»'; },
      'login.unknown': function (p) { return 'لا يوجد لاعب باسم «' + p.name + '» بعد. هل تريد إنشاءه؟'; },
      'login.empty': 'اكتب اسم لاعب.',
      'login.invalid': 'استخدم من 2 إلى 20 حرفًا أو رقمًا (يُسمح بالمسافات والنقاط والشرطات).',
      'login.reserved': function (p) { return 'الاسم «' + p.name + '» محجوز. اختر اسمًا آخر.'; },
      'login.noData': 'العب دون حفظ',
      'login.anonymous': 'احفظ النتائج باسم مجهول',
      'account.best': function (p) { return 'أعلى نتيجة لك: ' + p.best; },
      'settings.title': 'الإعدادات',
      'settings.sound': 'الصوت',
      'settings.background': 'الخلفية',
      'settings.textSize': 'حجم النص',
      'goodbye.title': 'شكرًا لأنك لعبت!',
      'goodbye.text': 'نتمنى أن تكون اللعبة قد أعجبتك. عُد قريبًا لجولة أخرى!',
      'goodbye.sign': 'مع أطيب التمنيات من MBG · Merkur Beqiri Games',
      'goodbye.again': 'العب مرة أخرى',
      'goodbye.close': 'يمكنك الآن إغلاق هذه النافذة.',
      'wheel.title': 'طول الرقم',
      'wheel.done': 'تم',
      'wheel.item': function (p) { return p.n + ' أرقام'; },
      'help.title': 'طريقة اللعب',

      'toast.font': function (p) { return 'حجم النص: ' + p.px + ' بكسل'; },
      'toast.fontMax': 'هذا أكبر حجم للنص.',
      'toast.fontMin': 'هذا أصغر حجم للنص.',
      'theme.light': 'فاتح',
      'theme.dark': 'داكن',
      'theme.adriatic': 'الأدرياتيكي',
      'theme.meadow': 'المرج',
      'theme.rose': 'الوردي',
      'theme.random': 'ألوان عشوائية',

      'last.try': function (p) { return 'المحاولة ' + p.n; },
      'sr.guess': function (p) { return 'المحاولة ' + p.attempt + ': ' + p.word + '. الدلائل: ' + p.clues; },
      'legend.O': 'رقم صحيح في المكان الصحيح',
      'legend.Q': 'موجود في الرقم لكن في مكان آخر',
      'legend.X': 'غير موجود في الرقم',

      'help.html': function (c) {
        return '' +
          '<h3>الهدف</h3><p>يختار الحاسوب رقمًا سريًا عشوائيًا: من 4 خانات في البداية، أو من 5 أو 6 أو 7 أو 8 خانات إذا أردت. يمكن أن تتكرر الأرقام وأن يبدأ الرقم بـ 0، لذلك هناك 10,000 رقم ممكن من 4 خانات. اعثر عليه بأقل عدد ممكن من المحاولات.</p>' +
          '<h3>قراءة الدلائل</h3><p>بعد كل محاولة، تحصل كل خانة من رقمك على دليل، بالترتيب نفسه:</p>' + c.legend +
          '<p class="example">مثال: الرقم السري 1234 وكتبت 2135 ← <code>? ? O X</code></p>' +
          '<p class="example">الأرقام المكررة تُحسب بدقة. الرقم السري 7703 والمحاولة 1777 ← <code>X O ? X</code>. الـ 7 الثانية عندك في مكانها الصحيح. والـ 7 الثالثة موجودة في الرقم لكن في مكان آخر (إنها الـ 7 الأخرى في الرقم السري). ولا يبقى 7 لخانتك الأخيرة، فتحصل على X.</p>' +
          '<h3>كيف تخمّن</h3><p>اكتب رقمًا بعدد الخانات المطلوب تمامًا واضغط <b>تحقّق</b> أو Enter. على الهاتف تُفتح لوحة الأرقام؛ اضغط <b>تحقّق</b> لإرسال محاولتك. يمكن أن تتكرر الأرقام. لا تُحتسب الأرقام التي فيها خانات أقل أو أكثر، أو فيها حروف أو رموز. يمكنك أيضًا كتابة الأرقام العربية الهندية (٤٢٧١).</p>' +
          '<p class="example">نصيحة: ابدأ بـ 0123 ثم 4567. معًا يكشفان أي الأرقام موجودة في الرقم السري.</p>' +
          '<h3>طول الرقم</h3><p>العب بأرقام من 4 أو 5 أو 6 أو 7 أو 8 خانات. اضغط زر الطول (مثلًا <b>4 أرقام</b>) بجانب الساعة واختر الطول. على الهاتف، اسحب العجلة.</p>' +
          '<h3>الفوز</h3><p>عندما تكون كل الدلائل O تكون قد وجدت الرقم. تتحول علامات O إلى قلوب ❤️، ومع تشغيل الصوت تسمع لحن الفوز.</p>' +
          '<h3>التلميحات 💡</h3><p>توقفت؟ بعد محاولتك الثالثة يظهر زر المصباح بجانب خانة الإدخال. كل تلميح يكشف خانة أخرى من الرقم السري، في مكان عشوائي لم تجده بعد، ويكلّف وحدة من رصيد التلميحات (انظر ⚙ › رصيد التلميحات: وحدات مجانية كل يوم، والمزيد مع النتائج العالية). لا تكشف اللعبة الرقم كاملًا أبدًا: تبقى لك خانة واحدة على الأقل. كل تلميح يُحسب في النتيجة كمحاولتين إضافيتين. وكلما فشلت محاولات أكثر، اهتز الزر أكثر ليذكّرك بوجوده.</p>' +
          '<h3>اكشف الرقم</h3><p>اضغط <b>اكشف الرقم</b>، أو اكتب <code>اكشف</code> أو <code>reveal</code>، لترى الرقم السري. تنتهي اللعبة بنتيجة 0.</p>' +
          '<h3>النتيجة</h3><p>كلما قلّت محاولاتك ارتفعت نتيجتك: تنخفض النقاط بشكل أُسّي مع كل محاولة إضافية. ومكافأة سرعة صغيرة (حتى 20%) تكافئ الألعاب السريعة.</p>' + c.scoreTable +
          '<p>تُحفظ فقط أعلى نتيجة لك وأعلى نتيجة على الإطلاق؛ لا يوجد مجموع تراكمي.</p>' +
          '<h3>الأوامر</h3>' + c.commandTable + '<p>الأوامر الإنجليزية تعمل بكل اللغات. على الهاتف لا توجد حروف في لوحة الأرقام، فاستخدم الأزرار بدلًا منها.</p>' +
          '<h3>اللاعبون</h3><p>تبدأ اللعب فورًا باسم <b>مجهول</b>. وأفضل نتيجة له مشتركة بين كل من يلعب على هذا الجهاز. لتحتفظ بأفضل نتيجة خاصة بك، اضغط <b>دخول</b> واكتب اسم لاعبك أو أنشئ اسمًا جديدًا. الأسماء التي استُخدمت من قبل تظهر هناك، فالدخول مرة أخرى بلمسة واحدة. ومن النافذة نفسها يمكنك أيضًا اللعب دون حفظ أي شيء. تُحفظ النتائج على هذا الجهاز.</p>' +
          '<h3>الإعدادات</h3><p>زر ⚙ فيه مفتاح الصوت (تكتكة الساعة، ونغمة لكل O و?، ولحن الفوز الذي يزداد فخامة كلما ارتفعت النتيجة)، وألوان الخلفية، وحجم النص (A+ / A−).</p>' +
          '<h3>لعبة جديدة</h3><p>بعد اللعبة اضغط <b>لعبة جديدة</b> أو اكتب <code>ن</code>. تغيير طول الرقم أثناء اللعبة يبدأ لعبة جديدة بعد التأكيد. وتغيير اللغة يُبقي لعبتك.</p>' +
          '<h3>العودة إلى الألعاب</h3><p>اضغط <b>خروج</b> أو زر الرجوع أو شعار MBG في الأعلى للعودة إلى قائمة الألعاب. اللعبة غير المكتملة تبقى محفوظة وتتابع عند عودتك. لإغلاق التطبيق استخدم زر ⏻ في الشاشة الرئيسية.</p>';
      },
      'help.scoreHead': ['الطول', 'أعلى نتيجة', 'أدنى نتيجة'],
      'help.scoreRow': function (p) { return [p.length + ' أرقام', p.hiScore + ' مع ' + arN(p.hiAttempt, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة'), p.loScore + ' مع ' + arN(p.loAttempt, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة')]; },
      'help.cmdHead': ['اكتب', 'ماذا يحدث'],
      'help.cmdRows': [
        ['مساعدة · قواعد · help', 'يفتح هذه التعليمات'],
        ['اكشف · reveal', 'يعرض الرقم السري (النتيجة 0)'],
        ['خروج · exit', 'العودة إلى قائمة الألعاب'],
        ['ن / ل', 'بعد اللعبة: العب مرة أخرى أو عُد إلى قائمة الألعاب']
      ],
      'help.about': 'حول اللعبة',
      'about.version': 'MBG Puzzles 1.0 · اكسر الرمز. © 2026 MBG · Merkur Beqiri Games.',
      'about.numbers': function (p) { return 'تُختار الأرقام السرية عشوائيًا على هذا الجهاز: ' + p.min + ' رقم ممكن من 4 خانات، حتى ' + p.max + ' من 8 خانات.'; },
      'about.privacy': 'تعمل دون إنترنت. لا حاجة إلى حساب: الأسماء والنتائج تبقى على هذا الهاتف. تُدفع الاشتراكات وتُدار عبر Google Play.',
      'about.privacyFree': 'تعمل دون إنترنت. مجانية، بلا إعلانات وبلا مشتريات داخل التطبيق. الأسماء والنتائج تبقى على هذا الهاتف.'
    }
  };

  function t(lang, key, params) {
    var table = STRINGS[lang] || STRINGS.en;
    var v = table[key];
    if (v === undefined) v = STRINGS.en[key];
    if (v === undefined) return key;
    return typeof v === 'function' ? v(params || {}) : v;
  }

  return { STRINGS: STRINGS, t: t, LANGS: ['en', 'sq', 'bs', 'de', 'es', 'fr', 'tr', 'pl', 'pt', 'ar'] };
});
