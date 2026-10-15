/*!
 * MBG Puzzles · Word Puzzle - all user-facing text (English, Albanian, Bosnian, German, Spanish,
 * French, Turkish, Polish, Brazilian Portuguese and Arabic). All languages address the player
 * informally (ti, du, tú, tu, sen, ty, você, أنت), as FR-LANG-004 asks for Albanian and Bosnian.
 * Bosnian is ijekavian and written in the Latin script only. Arabic is shown right to left
 * (see MBG.AppText.RTL) with Western digits.
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

  var STRINGS = {
    en: {
      'app.title': 'Word Puzzle',
      'app.by': 'MBG Puzzles · by MBG',
      'lang.listName.en': 'English',
      'lang.listName.sq': 'Albanian',
      'lang.listName.bs': 'Bosnian',
      'lang.listName.de': 'German',
      'lang.listName.es': 'Spanish',
      'lang.listName.fr': 'French',
      'lang.listName.tr': 'Turkish',
      'lang.listName.pl': 'Polish',
      'lang.listName.pt': 'Portuguese',
      'lang.listName.ar': 'Arabic',

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
      'btn.reveal': 'Reveal Word',
      'btn.newGame': 'New Game',
      'btn.length': function (p) { return 'Switch to ' + p.n + '-letter'; },
      'btn.close': 'Close',
      'aria.fontUp': 'Larger text',
      'aria.fontDown': 'Smaller text',
      'aria.length': function (p) { return 'Word length: ' + p.n + ' letters. Change'; },
      'aria.history': 'Game board',
      'aria.user': function (p) { return 'User: ' + p.name; },

      /* status line */
      'status.anonymous': 'Anonymous',
      'status.noData': 'Not saving',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'second', 'seconds'); },
      'len.chip': function (p) { return p.n + ' letters'; },

      /* input */
      'label.play': function (p) { return 'Enter a ' + p.n + '-letter word or a command'; },
      'label.yesno': 'Do you want to play another game? Y/N',
      'ph.play': function (p) { return 'Type ' + (p.n === 8 ? 'an ' : 'a ') + p.n + '-letter word'; },
      'ph.yesno': 'Play again? Y / N',

      /* short messages */
      'notice.storageUnavailable': 'This browser does not let the game save scores.',
      'notice.loggedIn': function (p) { return 'Welcome back, ' + p.name + '! Your best: ' + p.best; },
      'notice.registered': function (p) { return 'Welcome, ' + p.name + '!'; },
      'notice.noData': 'Playing without saving',
      'notice.anonymous': 'Playing as Anonymous',
      'notice.restored': 'Your game was restored',
      'warn.empty': function (p) { return 'Type ' + (p.length === 8 ? 'an ' : 'a ') + p.length + '-letter word.'; },
      'reveal.what': 'the whole word',
      'hint.btn': 'Hint',
      'hint.what': 'one more letter',
      'hint.shown': function (p) { return 'Hint ' + p.number + ': letter ' + p.pos + ' is ' + p.ch; },
      'warn.noHint': 'No more hints – the rest is up to you.',
      'win.hints': function (p) { return 'With ' + p.n + ' ' + pl(p.n, 'hint', 'hints') + ' – each counts as ' + p.k + ' tries in the score.'; },
      'warn.alpha': 'Letters only, please. This try was not counted.',
      'warn.length': function (p) { return 'Your word has ' + p.got + ' ' + pl(p.got, 'letter', 'letters') + '; this game needs ' + p.length + '. Not counted.'; },
      'warn.vocab': function (p) { return '“' + p.word + '” is not in the word list. Not counted.'; },
      'warn.roundOver': 'Game over. Type Y to play again or N to go back to the games.',
      'warn.noWords': function (p) { return 'There are no ' + p.length + '-letter words in the ' + p.listName + ' word list.'; },

      /* round end */
      'win.title': 'CONGRATULATIONS!',
      'win.titleName': function (p) { return 'CONGRATULATIONS, ' + p.name + '!'; },
      'win.found': function (p) { return 'You found “' + p.word + '” in ' + p.attempts + ' ' + pl(p.attempts, 'try', 'tries') + ' and ' + p.seconds + ' ' + pl(p.seconds, 'second', 'seconds') + '.'; },
      'win.luck': 'What luck! First try!',
      'score.label': 'Score',
      'score.yourBest': 'Your best',
      'score.allTime': 'All-time best',
      'score.newBest': 'New record!',
      'score.newAllTime': 'All-time record!',
      'score.notSaved': 'Not saved',
      'reveal.text': 'Better luck next time!',
      'reveal.word': function (p) { return 'The secret word was ' + p.word + '.'; },

      /* dialogs */
      'dlg.cancel': 'Cancel',
      'restart.title': 'Start a new game?',
      'restart.length': function (p) { return 'Switching to ' + p.n + '-letter words ends this game. It will not be scored.'; },
      'restart.language': 'Switching the language ends this game. It will not be scored.',
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
      'opt.validate': 'Accept only real words',
      'opt.validateHint': function (p) { return 'Every try must be in the dictionary (' + p.n + ' words in this language). Other words do not count as a try.'; },
      'goodbye.title': 'Thank you for playing!',
      'goodbye.text': 'We hope you enjoyed the game. Come back soon for another round!',
      'goodbye.sign': 'With best wishes from MBG · Merkur Beqiri Games',
      'goodbye.again': 'Play again',
      'goodbye.close': 'You can now close this window.',
      'wheel.title': 'Word length',
      'wheel.done': 'Done',
      'wheel.item': function (p) { return p.n + ' letters'; },
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
      'legend.O': 'right letter, right place',
      'legend.Q': 'in the word, wrong place',
      'legend.X': 'not in the word',

      'help.html': function (c) {
        return '' +
          '<h3>The goal</h3><p>The computer picks a secret word at random from the word list of the current language (English, Albanian, Bosnian, German, Spanish, French, Turkish, Polish, Portuguese or Arabic). Find it in as few tries as possible.</p>' +
          '<h3>Reading the clues</h3><p>After each try, every letter of your word gets a clue, in the same order:</p>' + c.legend +
          '<p class="example">Example: the secret word is APPLE and you type PAPER → <code>? ? O ? X</code></p>' +
          '<p class="example">Repeated letters are counted carefully. Secret word HOUSE, guess GOOSE → <code>X O X O O</code>. HOUSE has only one O, and the second letter already matches it.</p>' +
          '<h3>Making a guess</h3><p>Type a word with exactly the right number of letters and press <b>Submit</b> or Enter. Capital and small letters are the same, and letters may repeat. Words of the wrong length, or with digits or symbols, are not counted.</p>' +
          '<h3>Word length</h3><p>Play with 4, 5, 6, 7 or 8-letter words. Tap the length button (for example <b>4 letters</b>) next to the clock and pick a length. On a phone, swipe the wheel.</p>' +
          '<h3>Winning</h3><p>When every clue is O you have found the word. The O’s turn into hearts ❤️ and, with sound on, you hear the winning tune.</p>' +
          '<h3>Hints 💡</h3><p>Stuck? After your 3rd try (at the Expert ⭐ level after your 4th), a light-bulb button appears next to the input. Each hint opens one more letter of the secret word, at a random place you have not found yet, and costs a hint credit (see ⚙ › Hint credits: free credits every day, more with high scores). A game never gives the whole word away: at least one letter is always left for you. Each hint counts like 2 extra tries in the score. The more tries fail, the more often the button wiggles to remind you it is there.</p>' +
          '<h3>Reveal Word</h3><p>Press <b>Reveal Word</b>, or type <code>reveal</code> or <code>zbulo</code>, to see the secret word. The game ends with a score of 0.</p>' +
          '<h3>Scoring</h3><p>The fewer tries you need, the higher your score: points drop exponentially with every extra try. A small speed bonus (up to 20%) rewards quick games.</p>' + c.scoreTable +
          '<p>Only your highest score and the all-time highest score are kept; there is no running total.</p>' +
          '<h3>Commands</h3>' + c.commandTable + '<p>Commands work in every language and ignore capital letters.</p>' +
          '<h3>Users</h3><p>You start playing at once as <b>Anonymous</b>. Its high score is shared by everyone who plays on this device. To keep your own high score, tap <b>Log in</b> and type your username, or create a new one. Names you have used before are listed there, so logging in again is one tap. In the same window you can also choose to play without saving anything. Scores are kept on this device.</p>' +
          '<h3>Settings</h3><p>The ⚙ button holds the sound switch (tick-tock clock, a tone for each O and ?, and the winning tune, grander the higher the score), the background colours, the text size (A+ / A−) and an option to accept only words from the word list.</p>' +
          '<h3>New game</h3><p>After a game, press <b>New Game</b> or type <code>Y</code>. Changing the language or the word length during a game starts a new game after you confirm.</p>' +
          '<h3>Back to the games</h3><p>Press <b>Quit</b>, the Back button or the MBG mark at the top left to return to the list of games. An unfinished game is kept and continues when you come back. To close the app, use the ⏻ button on the home screen.</p>';
      },
      'help.scoreHead': ['Length', 'Top score', 'Low score'],
      'help.scoreRow': function (p) { return [p.length + ' letters', p.hiScore + ' with ' + p.hiAttempt + ' tries', p.loScore + ' with ' + p.loAttempt + ' tries']; },
      'help.cmdHead': ['Type', 'What it does'],
      'help.cmdRows': [
        ['help · rules · rregullat · pomoć', 'Open these instructions'],
        ['reveal · zbulo · otkrij', 'Show the secret word (score 0)'],
        ['quit · exit · fund · izlaz', 'Back to the game list'],
        ['Y / N', 'After a game: play again or back to the game list']
      ],
      'help.about': 'About',
      'opt.pool': 'Level',
      'level.title': 'Level',
      'level.normal': 'Normal',
      'level.expert': 'Expert ⭐',
      'level.expertOn': 'Expert level: secret words from the whole dictionary.',
      'level.normalOn': 'Normal level: everyday words.',
      'win.tryExpert': 'Too easy? Try the Expert level ⭐ – secret words from the whole dictionary.',
      'win.expertBtn': 'Play as an expert',
      'opt.poolHint': function (p) { return 'Normal: ' + p.everyday + ' everyday words · Expert: ' + p.all + ' dictionary words.'; },
      'opt.poolEveryday': 'Normal',
      'opt.poolAll': 'Expert ⭐',
      'toast.poolNext': 'From the next game.',
      'about.sources': 'Dictionaries: ENABLE and english-words (public domain); the LibreOffice dictionaries for Albanian, Bosnian, German, Spanish, French, Turkish, Polish, Brazilian Portuguese and Arabic, and Latin-script entries checked for ijekavian (open licences); Zemberek for the Turkish and Arramooz for the Arabic base forms; FrequencyWords for the everyday words. Details: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Word Puzzle. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Plays offline. No account is needed: names and scores stay on this phone. Subscriptions are paid and managed through Google Play.',
      'about.privacyFree': 'Plays offline. Free, with no ads and no in-app purchases. Names and scores stay on this phone.',
      'about.words': function (p) { return 'Words (everyday / accepted): ' + p.list + '.'; },
    },

    sq: {
      'app.title': 'Gjeje fjalën',
      'app.by': 'MBG Puzzles · nga MBG',
      'lang.listName.en': 'angleze',
      'lang.listName.sq': 'shqipe',
      'lang.listName.bs': 'boshnjake',
      'lang.listName.de': 'gjermane',
      'lang.listName.es': 'spanjolle',
      'lang.listName.fr': 'frënge',
      'lang.listName.tr': 'turke',
      'lang.listName.pl': 'polake',
      'lang.listName.pt': 'portugeze',
      'lang.listName.ar': 'arabe',

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
      'btn.reveal': 'Zbulo Fjalën',
      'btn.newGame': 'Lojë e Re',
      'btn.length': function (p) { return 'Kalo në ' + p.n + ' shkronja'; },
      'btn.close': 'Mbyll',
      'aria.fontUp': 'Tekst më i madh',
      'aria.fontDown': 'Tekst më i vogël',
      'aria.length': function (p) { return 'Gjatësia e fjalës: ' + p.n + ' shkronja. Ndrysho'; },
      'aria.history': 'Fusha e lojës',
      'aria.user': function (p) { return 'Përdoruesi: ' + p.name; },

      'status.anonymous': 'Anonim',
      'status.noData': 'Pa ruajtje',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'sekondë', 'sekonda'); },
      'len.chip': function (p) { return p.n + ' shkronja'; },

      'label.play': function (p) { return 'Shkruaj një fjalë me ' + p.n + ' shkronja ose një komandë'; },
      'label.yesno': 'Dëshiron të luash edhe një lojë? Y/N',
      'ph.play': function (p) { return 'Fjalë me ' + p.n + ' shkronja'; },
      'ph.yesno': 'Edhe një lojë? Y / N',

      'notice.storageUnavailable': 'Ky shfletues nuk e lejon lojën të ruajë rezultatet.',
      'notice.loggedIn': function (p) { return 'Mirë se u ktheve, ' + p.name + '! Më i miri yt: ' + p.best; },
      'notice.registered': function (p) { return 'Mirë se erdhe, ' + p.name + '!'; },
      'notice.noData': 'Po luan pa ruajtur',
      'notice.anonymous': 'Po luan si Anonim',
      'notice.restored': 'Loja jote u rikthye',
      'warn.empty': function (p) { return 'Shkruaj një fjalë me ' + p.length + ' shkronja.'; },
      'reveal.what': 'të gjithë fjalën',
      'hint.btn': 'Sugjerim',
      'hint.what': 'edhe një shkronjë',
      'hint.shown': function (p) { return 'Sugjerimi ' + p.number + ': shkronja ' + p.pos + ' është ' + p.ch; },
      'warn.noHint': 'S’ka më sugjerime – pjesën tjetër e gjen ti.',
      'win.hints': function (p) { return 'Me ' + p.n + ' ' + pl(p.n, 'sugjerim', 'sugjerime') + ' – secili llogaritet si ' + p.k + ' prova në pikë.'; },
      'warn.alpha': 'Vetëm shkronja, të lutem. Kjo provë nuk u numërua.',
      'warn.length': function (p) { return 'Fjala jote ka ' + p.got + ' ' + pl(p.got, 'shkronjë', 'shkronja') + '; kjo lojë kërkon ' + p.length + '. Nuk u numërua.'; },
      'warn.vocab': function (p) { return '“' + p.word + '” nuk është në listën e fjalëve. Nuk u numërua.'; },
      'warn.roundOver': 'Loja mbaroi. Shkruaj Y për të luajtur përsëri ose N për t’u kthyer te lojërat.',
      'warn.noWords': function (p) { return 'Nuk ka fjalë me ' + p.length + ' shkronja në listën ' + p.listName + ' të fjalëve.'; },

      'win.title': 'URIME!',
      'win.titleName': function (p) { return 'URIME, ' + p.name + '!'; },
      'win.found': function (p) { return 'E gjete “' + p.word + '” me ' + p.attempts + ' ' + pl(p.attempts, 'provë', 'prova') + ' për ' + p.seconds + ' ' + pl(p.seconds, 'sekondë', 'sekonda') + '.'; },
      'win.luck': 'Çfarë fati! Që në provën e parë!',
      'score.label': 'Pikët',
      'score.yourBest': 'Më i miri yt',
      'score.allTime': 'Më i miri ndonjëherë',
      'score.newBest': 'Rekord i ri!',
      'score.newAllTime': 'Rekord i të gjitha kohërave!',
      'score.notSaved': 'Nuk ruhet',
      'reveal.text': 'Më shumë fat herën tjetër!',
      'reveal.word': function (p) { return 'Fjala e fshehtë ishte ' + p.word + '.'; },

      'dlg.cancel': 'Anulo',
      'restart.title': 'Të nisë një lojë e re?',
      'restart.length': function (p) { return 'Kalimi në fjalë me ' + p.n + ' shkronja e mbyll këtë lojë. Ajo nuk do të vlerësohet.'; },
      'restart.language': 'Ndërrimi i gjuhës e mbyll këtë lojë. Ajo nuk do të vlerësohet.',
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
      'opt.validate': 'Prano vetëm fjalë të vërteta',
      'opt.validateHint': function (p) { return 'Çdo provë duhet të jetë në fjalor (' + p.n + ' fjalë në këtë gjuhë). Fjalët e tjera nuk numërohen si provë.'; },
      'goodbye.title': 'Faleminderit që luajte!',
      'goodbye.text': 'Shpresojmë që të pëlqeu loja. Eja përsëri së shpejti për një lojë tjetër!',
      'goodbye.sign': 'Me përshëndetje të përzemërta nga MBG · Merkur Beqiri Games',
      'goodbye.again': 'Luaj përsëri',
      'goodbye.close': 'Tani mund ta mbyllësh këtë dritare.',
      'wheel.title': 'Gjatësia e fjalës',
      'wheel.done': 'Gati',
      'wheel.item': function (p) { return p.n + ' shkronja'; },
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
      'legend.O': 'shkronja e duhur, në vendin e duhur',
      'legend.Q': 'është në fjalë, por në vend tjetër',
      'legend.X': 'nuk është në fjalë',

      'help.html': function (c) {
        return '' +
          '<h3>Qëllimi</h3><p>Kompjuteri zgjedh rastësisht një fjalë të fshehtë nga lista e fjalëve të gjuhës aktuale (shqip, anglisht, boshnjakisht, gjermanisht, spanjisht, frëngjisht, turqisht, polonisht, portugalisht ose arabisht). Gjeje me sa më pak prova.</p>' +
          '<h3>Si t’i lexosh ndihmat</h3><p>Pas çdo prove, secila shkronjë e fjalës sate merr një ndihmë, në të njëjtin rend:</p>' + c.legend +
          '<p class="example">Shembull: fjala e fshehtë është MALI dhe ti shkruan ILAÇ → <code>? ? ? X</code></p>' +
          '<p class="example">Shkronjat e përsëritura numërohen me kujdes. Fjala e fshehtë DITA, prova DATA → <code>O X O O</code>. DITA ka vetëm një A dhe ajo përputhet me shkronjën e fundit.</p>' +
          '<h3>Si të provosh</h3><p>Shkruaj një fjalë me saktësisht aq shkronja dhe shtyp <b>Ok-Provo</b> ose Enter. Shkronjat e mëdha dhe të vogla janë njësoj, dhe shkronjat mund të përsëriten. Fjalët me gjatësi të gabuar, ose me shifra e simbole, nuk numërohen.</p>' +
          '<h3>Gjatësia e fjalës</h3><p>Mund të luash me fjalë me 4, 5, 6, 7 ose 8 shkronja. Prek butonin e gjatësisë (p.sh. <b>4 shkronja</b>) pranë orës dhe zgjidh gjatësinë. Në telefon, rrotullo rrotën.</p>' +
          '<h3>Fitorja</h3><p>Kur të gjitha ndihmat janë O, e ke gjetur fjalën. O-të kthehen në zemra ❤️ dhe, nëse zëri është i ndezur, dëgjon melodinë e fitores.</p>' +
          '<h3>Sugjerimet 💡</h3><p>Ke ngecur? Pas provës së 3-të (në nivelin Ekspert ⭐ pas së 4-t), pranë fushës shfaqet një buton me llambë. Çdo sugjerim hap edhe një shkronjë të fjalës së fshehtë, në një vend të rastësishëm që nuk e ke gjetur ende, dhe kushton një kredit (shih ⚙ › Kreditet për sugjerime: kredite falas çdo ditë, edhe më shumë me pikë të larta). Loja nuk e jep kurrë të gjithë fjalën: të paktën një shkronjë mbetet gjithmonë për ty. Çdo sugjerim llogaritet si 2 prova shtesë në pikë. Sa më shumë prova të gabuara, aq më shpesh butoni lëviz që të të kujtojë se është aty.</p>' +
          '<h3>Zbulo Fjalën</h3><p>Shtyp <b>Zbulo Fjalën</b>, ose shkruaj <code>zbulo</code> ose <code>reveal</code>, për të parë fjalën e fshehtë. Loja mbaron me 0 pikë.</p>' +
          '<h3>Pikët</h3><p>Sa më pak prova të duhen, aq më shumë pikë merr: pikët bien në mënyrë eksponenciale me çdo provë shtesë. Një bonus i vogël shpejtësie (deri në 20%) shpërblen lojën e shpejtë.</p>' + c.scoreTable +
          '<p>Ruhen vetëm rezultati yt më i lartë dhe rezultati më i lartë i të gjitha kohërave; nuk mbahet shuma e përgjithshme.</p>' +
          '<h3>Komandat</h3>' + c.commandTable + '<p>Komandat funksionojnë në të gjitha gjuhët dhe nuk dallojnë shkronjat e mëdha nga të voglat.</p>' +
          '<h3>Përdoruesit</h3><p>Fillon të luash menjëherë si <b>Anonim</b>. Rezultati i tij më i lartë ndahet me këdo që luan në këtë pajisje. Për të ruajtur rezultatin tënd, prek <b>Hyr</b> dhe shkruaj emrin tënd të përdoruesit, ose krijo një të ri. Emrat që ke përdorur më parë shfaqen aty, kështu që hyrja e radhës bëhet me një prekje. Në të njëjtën dritare mund të zgjedhësh edhe të luash pa ruajtur asgjë. Rezultatet ruhen në këtë pajisje.</p>' +
          '<h3>Cilësimet</h3><p>Butoni ⚙ ka çelësin e zërit (tik-taku i orës, një tingull për çdo O dhe ?, dhe melodia e fitores, aq më madhështore sa më i lartë rezultati), ngjyrat e sfondit, madhësinë e tekstit (A+ / A−) dhe mundësinë për të pranuar vetëm fjalë nga lista e fjalëve.</p>' +
          '<h3>Lojë e re</h3><p>Pas çdo loje shtyp <b>Lojë e Re</b> ose shkruaj <code>Y</code>. Nëse e ndërron gjuhën ose gjatësinë e fjalës gjatë lojës, nis një lojë e re pasi ta konfirmosh.</p>' +
          '<h3>Kthimi te lojërat</h3><p>Shtyp <b>Dil</b>, butonin Prapa ose shenjën MBG lart majtas për t’u kthyer te lista e lojërave. Një lojë e pambaruar ruhet dhe vazhdon kur të kthehesh. Aplikacioni mbyllet me butonin ⏻ në faqen kryesore.</p>';
      },
      'help.scoreHead': ['Gjatësia', 'Pikët më të larta', 'Pikët më të ulëta'],
      'help.scoreRow': function (p) { return [p.length + ' shkronja', p.hiScore + ' me ' + p.hiAttempt + ' prova', p.loScore + ' me ' + p.loAttempt + ' prova']; },
      'help.cmdHead': ['Shkruaj', 'Çfarë bën'],
      'help.cmdRows': [
        ['rregullat · help · pomoć', 'Hap këto udhëzime'],
        ['zbulo · reveal · otkrij', 'Trego fjalën e fshehtë (0 pikë)'],
        ['fund · exit · izlaz', 'Kthehu te lista e lojërave'],
        ['Y / N', 'Pas lojës: luaj përsëri ose kthehu te lojërat']
      ],
      'help.about': 'Rreth lojës',
      'opt.pool': 'Niveli',
      'level.title': 'Niveli',
      'level.normal': 'Normal',
      'level.expert': 'Ekspert ⭐',
      'level.expertOn': 'Niveli ekspert: fjalë të fshehta nga i gjithë fjalori.',
      'level.normalOn': 'Niveli normal: fjalë të përditshme.',
      'win.tryExpert': 'Shumë e lehtë? Provo nivelin Ekspert ⭐ – fjalë të fshehta nga i gjithë fjalori.',
      'win.expertBtn': 'Luaj si ekspert',
      'opt.poolHint': function (p) { return 'Normal: ' + p.everyday + ' fjalë të përditshme · Ekspert: ' + p.all + ' fjalë fjalori.'; },
      'opt.poolEveryday': 'Normal',
      'opt.poolAll': 'Ekspert ⭐',
      'toast.poolNext': 'Nga loja e ardhshme.',
      'about.sources': 'Fjalorët: ENABLE dhe english-words (domen publik); fjalorët e LibreOffice për shqipen, boshnjakishten, gjermanishten, spanjishten, frëngjishten, turqishten, polonishten, portugalishten e Brazilit dhe arabishten, si dhe fjalë me alfabet latin të kontrolluara për ijekavicë (licenca të hapura); Zemberek për format bazë të turqishtes dhe Arramooz për ato të arabishtes; FrequencyWords për fjalët e përditshme. Hollësi: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Gjeje fjalën. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Luhet edhe pa internet. Nuk nevojitet llogari: emrat dhe pikët mbeten në këtë telefon. Abonimet paguhen dhe menaxhohen përmes Google Play.',
      'about.privacyFree': 'Luhet edhe pa internet. Falas, pa reklama dhe pa blerje brenda aplikacionit. Emrat dhe pikët mbeten në këtë telefon.',
      'about.words': function (p) { return 'Fjalët (të përditshme / të pranuara): ' + p.list + '.'; },
    },

    bs: {
      'app.title': 'Pogodi riječ',
      'app.by': 'MBG Puzzles · od MBG',
      'lang.listName.en': 'engleskoj',
      'lang.listName.sq': 'albanskoj',
      'lang.listName.bs': 'bosanskoj',
      'lang.listName.de': 'njemačkoj',
      'lang.listName.es': 'španskoj',
      'lang.listName.fr': 'francuskoj',
      'lang.listName.tr': 'turskoj',
      'lang.listName.pl': 'poljskoj',
      'lang.listName.pt': 'portugalskoj',
      'lang.listName.ar': 'arapskoj',

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
      'btn.reveal': 'Otkrij riječ',
      'btn.newGame': 'Nova igra',
      'btn.length': function (p) { return 'Prebaci na riječi od ' + p.n + ' slova'; },
      'btn.close': 'Zatvori',
      'aria.fontUp': 'Veći tekst',
      'aria.fontDown': 'Manji tekst',
      'aria.length': function (p) { return 'Dužina riječi: ' + p.n + ' slova. Promijeni'; },
      'aria.history': 'Tabla igre',
      'aria.user': function (p) { return 'Korisnik: ' + p.name; },

      'status.anonymous': 'Anonimno',
      'status.noData': 'Bez čuvanja',
      'status.time': function (p) { return p.n + ' ' + plBs(p.n, 'sekunda', 'sekunde', 'sekundi'); },
      'len.chip': function (p) { return p.n + ' slova'; },

      'label.play': function (p) { return 'Upiši riječ od ' + p.n + ' slova ili komandu'; },
      'label.yesno': 'Želiš li igrati još jednu igru? D/N',
      'ph.play': function (p) { return 'Riječ od ' + p.n + ' slova'; },
      'ph.yesno': 'Još jednu igru? D / N',

      'notice.storageUnavailable': 'Ovaj preglednik ne dozvoljava igri da čuva rezultate.',
      'notice.loggedIn': function (p) { return 'Opet si tu, ' + p.name + '! Tvoj rekord: ' + p.best; },
      'notice.registered': function (p) { return 'Zdravo, ' + p.name + '! Sretno u igri!'; },
      'notice.noData': 'Igraš bez čuvanja',
      'notice.anonymous': 'Igraš anonimno',
      'notice.restored': 'Tvoja igra je vraćena',
      'warn.empty': function (p) { return 'Upiši riječ od ' + p.length + ' slova.'; },
      'reveal.what': 'cijelu riječ',
      'hint.btn': 'Nagovještaj',
      'hint.what': 'još jedno slovo',
      'hint.shown': function (p) { return 'Nagovještaj ' + p.number + ': ' + p.pos + '. slovo je ' + p.ch; },
      'warn.noHint': 'Nema više nagovještaja – ostalo je na tebi.',
      'win.hints': function (p) { return 'Uz ' + p.n + ' ' + plBs(p.n, 'nagovještaj', 'nagovještaja', 'nagovještaja') + ' – svaki se u bodovima računa kao ' + p.k + ' pokušaja.'; },
      'warn.alpha': 'Upiši samo slova. Ovaj pokušaj se ne računa.',
      'warn.length': function (p) { return 'Tvoja riječ ima ' + p.got + ' ' + plBs(p.got, 'slovo', 'slova', 'slova') + ', a ova igra traži ' + p.length + '. Ne računa se.'; },
      'warn.vocab': function (p) { return '„' + p.word + '“ nije na listi riječi. Ne računa se.'; },
      'warn.roundOver': 'Igra je završena. Upiši D za novu igru ili N za povratak na listu igara.',
      'warn.noWords': function (p) { return 'Na ' + p.listName + ' listi nema riječi od ' + p.length + ' slova.'; },

      'win.title': 'ČESTITAMO!',
      'win.titleName': function (p) { return 'ČESTITAMO, ' + p.name + '!'; },
      'win.found': function (p) { return 'Riječ „' + p.word + '“ je pogođena iz ' + p.attempts + '. pokušaja, za ' + p.seconds + ' ' + plBs(p.seconds, 'sekundu', 'sekunde', 'sekundi') + '.'; },
      'win.luck': 'Kakva sreća! Iz prvog pokušaja!',
      'score.label': 'Bodovi',
      'score.yourBest': 'Tvoj rekord',
      'score.allTime': 'Najbolji ikad',
      'score.newBest': 'Novi rekord!',
      'score.newAllTime': 'Rekord svih vremena!',
      'score.notSaved': 'Nije sačuvano',
      'reveal.text': 'Više sreće sljedeći put!',
      'reveal.word': function (p) { return 'Tajna riječ je bila ' + p.word + '.'; },

      'dlg.cancel': 'Odustani',
      'restart.title': 'Započeti novu igru?',
      'restart.length': function (p) { return 'Prelazak na riječi od ' + p.n + ' slova završava ovu igru. Ona se neće bodovati.'; },
      'restart.language': 'Promjena jezika završava ovu igru. Ona se neće bodovati.',
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
      'opt.validate': 'Prihvataj samo prave riječi',
      'opt.validateHint': function (p) { return 'Svaki pokušaj mora biti u rječniku (broj riječi na ovom jeziku: ' + p.n + '). Ostale riječi se ne računaju kao pokušaj.'; },
      'goodbye.title': 'Hvala na igri!',
      'goodbye.text': 'Nadamo se da ti se igra svidjela. Vrati se uskoro na novu rundu!',
      'goodbye.sign': 'Srdačan pozdrav od MBG · Merkur Beqiri Games',
      'goodbye.again': 'Igraj ponovo',
      'goodbye.close': 'Sada možeš zatvoriti ovaj prozor.',
      'wheel.title': 'Dužina riječi',
      'wheel.done': 'Gotovo',
      'wheel.item': function (p) { return p.n + ' slova'; },
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
      'legend.O': 'pravo slovo na pravom mjestu',
      'legend.Q': 'ima ga u riječi, ali na drugom mjestu',
      'legend.X': 'nema ga u riječi',

      'help.html': function (c) {
        return '' +
          '<h3>Cilj</h3><p>Računar nasumično bira tajnu riječ s liste riječi trenutnog jezika (bosanski, engleski, albanski, njemački, španski, francuski, turski, poljski, portugalski ili arapski). Pronađi je iz što manje pokušaja.</p>' +
          '<h3>Kako čitati tragove</h3><p>Nakon svakog pokušaja svako slovo tvoje riječi dobija trag, istim redom:</p>' + c.legend +
          '<p class="example">Primjer: tajna riječ je MAČKA, a ti upišeš KAMEN → <code>? O ? X X</code></p>' +
          '<p class="example">Ponovljena slova broje se pažljivo. Tajna riječ TORBA, pokušaj OLOVO → <code>? X X X X</code>. TORBA ima samo jedno O, pa trag dobija samo prvo O iz tvoje riječi; ostala dva O dobijaju X.</p>' +
          '<h3>Kako pogađati</h3><p>Upiši riječ s tačno toliko slova i pritisni <b>Provjeri</b> ili Enter. Velika i mala slova su isto, a slova se mogu ponavljati. Riječi pogrešne dužine, ili s ciframa i znakovima, ne računaju se.</p>' +
          '<p class="example">Slova č, ć, đ, š i ž su posebna slova: MAČKA nije isto što i MACKA. Na telefonu ih obično dobiješ dužim pritiskom na c, d, s ili z. Lj, nj i dž pišu se kao dva slova, pa LJUBAV ima 6 slova.</p>' +
          '<h3>Dužina riječi</h3><p>Igraj s riječima od 4, 5, 6, 7 ili 8 slova. Dodirni dugme dužine (npr. <b>4 slova</b>) pored sata i izaberi dužinu. Na telefonu okreni točkić.</p>' +
          '<h3>Pobjeda</h3><p>Kad su svi tragovi O, riječ je pogođena. Znakovi O pretvaraju se u srca ❤️, a uz uključen zvuk čuje se pobjednička melodija.</p>' +
          '<h3>Nagovještaji 💡</h3><p>Zapelo je? Nakon 3. pokušaja (na nivou Ekspert ⭐ nakon 4.) pored polja za unos pojavljuje se dugme sa sijalicom. Svaki nagovještaj otkriva još jedno slovo tajne riječi, na nasumičnom mjestu koje još nije pronađeno, i košta jedan kredit (vidi ⚙ › Krediti za nagovještaje: besplatni krediti svaki dan, više uz visoke rezultate). Igra nikad ne otkriva cijelu riječ: barem jedno slovo uvijek ostaje za tebe. Svaki nagovještaj se u bodovima računa kao 2 dodatna pokušaja. Što više pokušaja promaši, to se dugme češće zatrese da te podsjeti da je tu.</p>' +
          '<h3>Otkrij riječ</h3><p>Pritisni <b>Otkrij riječ</b> ili upiši <code>otkrij</code> da vidiš tajnu riječ. Igra se tada završava s 0 bodova.</p>' +
          '<h3>Bodovi</h3><p>Što manje pokušaja trebaš, to više bodova dobijaš: bodovi naglo padaju sa svakim dodatnim pokušajem. Mali bonus za brzinu (do 20%) nagrađuje brze igre.</p>' + c.scoreTable +
          '<p>Čuvaju se samo tvoj najbolji rezultat i najbolji rezultat svih vremena; ukupni zbir se ne vodi.</p>' +
          '<h3>Komande</h3>' + c.commandTable + '<p>Komande rade na svim jezicima i ne razlikuju velika i mala slova.</p>' +
          '<h3>Korisnici</h3><p>Odmah počinješ igrati anonimno. Anonimni rekord dijele svi koji igraju na ovom uređaju. Da čuvaš svoj rekord, dodirni <b>Prijava</b> i upiši svoje korisničko ime ili napravi novo. Imena korištena ranije prikazana su tu, pa je ponovna prijava samo jedan dodir. U istom prozoru možeš izabrati i igru bez čuvanja. Rezultati se čuvaju na ovom uređaju.</p>' +
          '<h3>Postavke</h3><p>Dugme ⚙ sadrži prekidač za zvuk (tik-tak sata, ton za svako O i ?, i pobjedničku melodiju, to svečaniju što je rezultat veći), boje pozadine, veličinu teksta (A+ / A−) i izbor da se prihvataju samo riječi s liste riječi.</p>' +
          '<h3>Nova igra</h3><p>Nakon igre pritisni <b>Nova igra</b> ili upiši <code>D</code>. Promjena jezika ili dužine riječi tokom igre pokreće novu igru nakon potvrde.</p>' +
          '<h3>Povratak na igre</h3><p>Pritisni <b>Izađi</b>, dugme Nazad ili znak MBG gore lijevo da se vratiš na listu igara. Nezavršena igra se čuva i nastavlja kad se vratiš. Aplikaciju zatvaraš dugmetom ⏻ na početnom ekranu.</p>';
      },
      'help.scoreHead': ['Dužina', 'Najviše bodova', 'Najmanje bodova'],
      'help.scoreRow': function (p) { return [p.length + ' slova', p.hiScore + ' iz ' + p.hiAttempt + '. pokušaja', p.loScore + ' iz ' + p.loAttempt + '. pokušaja']; },
      'help.cmdHead': ['Upiši', 'Šta radi'],
      'help.cmdRows': [
        ['pomoć · pravila · help', 'Otvara ova uputstva'],
        ['otkrij · reveal', 'Pokazuje tajnu riječ (0 bodova)'],
        ['izlaz · exit · quit', 'Povratak na listu igara'],
        ['D / N', 'Nakon igre: nova igra ili povratak na listu igara']
      ],
      'help.about': 'O igri',
      'opt.pool': 'Nivo',
      'level.title': 'Nivo',
      'level.normal': 'Normalno',
      'level.expert': 'Ekspert ⭐',
      'level.expertOn': 'Nivo ekspert: tajne riječi iz cijelog rječnika.',
      'level.normalOn': 'Normalni nivo: svakodnevne riječi.',
      'win.tryExpert': 'Prelagano? Probaj nivo Ekspert ⭐ – tajne riječi iz cijelog rječnika.',
      'win.expertBtn': 'Igraj kao ekspert',
      'opt.poolHint': function (p) { return 'Normalno: ' + p.everyday + ' svakodnevnih riječi · Ekspert: ' + p.all + ' riječi iz rječnika.'; },
      'opt.poolEveryday': 'Normalno',
      'opt.poolAll': 'Ekspert ⭐',
      'toast.poolNext': 'Od sljedeće igre.',
      'about.sources': 'Rječnici: ENABLE i english-words (javno dobro); LibreOffice rječnici za albanski, bosanski, njemački, španski, francuski, turski, poljski, brazilski portugalski i arapski i riječi latinicom provjerene na ijekavicu (otvorene licence); Zemberek za osnovne oblike turskih i Arramooz za osnovne oblike arapskih riječi; FrequencyWords za svakodnevne riječi. Detalji: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Pogodi riječ. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Radi i bez interneta. Račun nije potreban: imena i rezultati ostaju na ovom telefonu. Pretplate se plaćaju preko Google Playa i tamo se njima upravlja.',
      'about.privacyFree': 'Radi i bez interneta. Besplatno, bez reklama i bez kupovine u aplikaciji. Imena i rezultati ostaju na ovom telefonu.',
      'about.words': function (p) { return 'Riječi (svakodnevne / prihvaćene): ' + p.list + '.'; },
    },

    de: {
      'app.title': 'Errate das Wort',
      'app.by': 'MBG Puzzles · von MBG',
      'lang.listName.en': 'englischen',
      'lang.listName.sq': 'albanischen',
      'lang.listName.bs': 'bosnischen',
      'lang.listName.de': 'deutschen',
      'lang.listName.es': 'spanischen',
      'lang.listName.fr': 'französischen',
      'lang.listName.tr': 'türkischen',
      'lang.listName.pl': 'polnischen',
      'lang.listName.pt': 'portugiesischen',
      'lang.listName.ar': 'arabischen',

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
      'btn.reveal': 'Wort zeigen',
      'btn.newGame': 'Neues Spiel',
      'btn.length': function (p) { return 'Wechsle zu ' + p.n + ' Buchstaben'; },
      'btn.close': 'Schließen',
      'aria.fontUp': 'Größere Schrift',
      'aria.fontDown': 'Kleinere Schrift',
      'aria.length': function (p) { return 'Wortlänge: ' + p.n + ' Buchstaben. Ändern'; },
      'aria.history': 'Spielfeld',
      'aria.user': function (p) { return 'Spieler: ' + p.name; },

      'status.anonymous': 'Anonym',
      'status.noData': 'Ohne Speichern',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'Sekunde', 'Sekunden'); },
      'len.chip': function (p) { return p.n + ' Buchstaben'; },

      'label.play': function (p) { return 'Gib ein Wort mit ' + p.n + ' Buchstaben oder einen Befehl ein'; },
      'label.yesno': 'Willst du noch ein Spiel spielen? J/N',
      'ph.play': function (p) { return 'Wort mit ' + p.n + ' Buchstaben'; },
      'ph.yesno': 'Noch ein Spiel? J / N',

      'notice.storageUnavailable': 'Dieser Browser lässt das Spiel keine Ergebnisse speichern.',
      'notice.loggedIn': function (p) { return 'Willkommen zurück, ' + p.name + '! Dein Rekord: ' + p.best; },
      'notice.registered': function (p) { return 'Willkommen, ' + p.name + '!'; },
      'notice.noData': 'Du spielst ohne Speichern',
      'notice.anonymous': 'Du spielst anonym',
      'notice.restored': 'Dein Spiel wurde wiederhergestellt',
      'warn.empty': function (p) { return 'Gib ein Wort mit ' + p.length + ' Buchstaben ein.'; },
      'reveal.what': 'das ganze Wort',
      'hint.btn': 'Tipp',
      'hint.what': 'noch einen Buchstaben',
      'hint.shown': function (p) { return 'Tipp ' + p.number + ': Buchstabe ' + p.pos + ' ist ' + p.ch; },
      'warn.noHint': 'Keine Tipps mehr – den Rest schaffst du selbst.',
      'win.hints': function (p) { return 'Mit ' + p.n + ' ' + pl(p.n, 'Tipp', 'Tipps') + ' – jeder zählt wie ' + p.k + ' Versuche in der Punktzahl.'; },
      'warn.alpha': 'Bitte nur Buchstaben. Dieser Versuch zählt nicht.',
      'warn.length': function (p) { return 'Dein Wort hat ' + p.got + ' ' + pl(p.got, 'Buchstaben', 'Buchstaben') + ', dieses Spiel braucht ' + p.length + '. Zählt nicht.'; },
      'warn.vocab': function (p) { return '„' + p.word + '“ steht nicht in der Wortliste. Zählt nicht.'; },
      'warn.roundOver': 'Spiel vorbei. Gib J ein für ein neues Spiel oder N für zurück zu den Spielen.',
      'warn.noWords': function (p) { return 'In der ' + p.listName + ' Wortliste gibt es keine Wörter mit ' + p.length + ' Buchstaben.'; },

      'win.title': 'GLÜCKWUNSCH!',
      'win.titleName': function (p) { return 'GLÜCKWUNSCH, ' + p.name + '!'; },
      'win.found': function (p) { return 'Du hast „' + p.word + '“ mit ' + p.attempts + ' ' + pl(p.attempts, 'Versuch', 'Versuchen') + ' in ' + p.seconds + ' ' + pl(p.seconds, 'Sekunde', 'Sekunden') + ' gefunden.'; },
      'win.luck': 'Was für ein Glück! Beim ersten Versuch!',
      'score.label': 'Punkte',
      'score.yourBest': 'Dein Rekord',
      'score.allTime': 'Bester aller Zeiten',
      'score.newBest': 'Neuer Rekord!',
      'score.newAllTime': 'Rekord aller Zeiten!',
      'score.notSaved': 'Nicht gespeichert',
      'reveal.text': 'Mehr Glück beim nächsten Mal!',
      'reveal.word': function (p) { return 'Das geheime Wort war ' + p.word + '.'; },

      'dlg.cancel': 'Abbrechen',
      'restart.title': 'Neues Spiel beginnen?',
      'restart.length': function (p) { return 'Der Wechsel zu Wörtern mit ' + p.n + ' Buchstaben beendet dieses Spiel. Es wird nicht gewertet.'; },
      'restart.language': 'Der Sprachwechsel beendet dieses Spiel. Es wird nicht gewertet.',
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
      'opt.validate': 'Nur echte Wörter annehmen',
      'opt.validateHint': function (p) { return 'Jeder Versuch muss im Wörterbuch stehen (' + p.n + ' Wörter in dieser Sprache). Andere Wörter zählen nicht als Versuch.'; },
      'goodbye.title': 'Danke fürs Spielen!',
      'goodbye.text': 'Wir hoffen, das Spiel hat dir gefallen. Komm bald wieder für eine neue Runde!',
      'goodbye.sign': 'Herzliche Grüße von MBG · Merkur Beqiri Games',
      'goodbye.again': 'Nochmal spielen',
      'goodbye.close': 'Du kannst dieses Fenster jetzt schließen.',
      'wheel.title': 'Wortlänge',
      'wheel.done': 'Fertig',
      'wheel.item': function (p) { return p.n + ' Buchstaben'; },
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
      'legend.O': 'richtiger Buchstabe an der richtigen Stelle',
      'legend.Q': 'kommt im Wort vor, aber an einer anderen Stelle',
      'legend.X': 'kommt im Wort nicht vor',

      'help.html': function (c) {
        return '' +
          '<h3>Das Ziel</h3><p>Der Computer wählt zufällig ein geheimes Wort aus der Wortliste der eingestellten Sprache (Deutsch, Englisch, Albanisch, Bosnisch, Spanisch, Französisch, Türkisch, Polnisch, Portugiesisch oder Arabisch). Finde es mit so wenigen Versuchen wie möglich.</p>' +
          '<h3>Die Hinweise lesen</h3><p>Nach jedem Versuch bekommt jeder Buchstabe deines Wortes einen Hinweis, in derselben Reihenfolge:</p>' + c.legend +
          '<p class="example">Beispiel: Das geheime Wort ist APFEL und du schreibst PFERD → <code>? ? ? X X</code></p>' +
          '<p class="example">Doppelte Buchstaben werden genau gezählt. Geheimes Wort BLATT, Versuch BALLT → <code>O ? ? X O</code>. BLATT hat nur ein L: Das erste L deines Wortes bekommt ?, für das zweite bleibt keines übrig, also X.</p>' +
          '<h3>Raten</h3><p>Schreib ein Wort mit genau der richtigen Anzahl Buchstaben und drück <b>Prüfen</b> oder Enter. Groß- und Kleinschreibung spielt keine Rolle, Buchstaben dürfen sich wiederholen. Wörter mit falscher Länge oder mit Ziffern und Zeichen zählen nicht.</p>' +
          '<p class="example">Ä, Ö, Ü und ß sind eigene Buchstaben: SCHÖN ist nicht SCHON, und ß zählt als ein Buchstabe – STRAẞE hat 6 Buchstaben. Auf dem Handy bekommst du sie meist durch langes Drücken auf a, o, u oder s.</p>' +
          '<h3>Wortlänge</h3><p>Spiel mit Wörtern aus 4, 5, 6, 7 oder 8 Buchstaben. Tipp auf den Längen-Knopf (zum Beispiel <b>4 Buchstaben</b>) neben der Uhr und wähle eine Länge. Auf dem Handy drehst du das Rad.</p>' +
          '<h3>Gewinnen</h3><p>Wenn alle Hinweise O sind, hast du das Wort gefunden. Die O werden zu Herzen ❤️ und mit Ton hörst du die Siegesmelodie.</p>' +
          '<h3>Tipps 💡</h3><p>Du kommst nicht weiter? Nach deinem 3. Versuch (auf der Stufe Experte ⭐ nach dem 4.) erscheint neben dem Eingabefeld ein Knopf mit einer Glühbirne. Jeder Tipp deckt einen weiteren Buchstaben des geheimen Wortes auf, an einer zufälligen Stelle, die du noch nicht gefunden hast, und kostet ein Tipp-Credit (siehe ⚙ › Tipp-Guthaben: jeden Tag Gratis-Credits, mehr für hohe Punktzahlen). Das ganze Wort verrät das Spiel nie: Mindestens ein Buchstabe bleibt immer für dich. Jeder Tipp zählt wie 2 zusätzliche Versuche in der Punktzahl. Je mehr Versuche danebengehen, desto öfter wackelt der Knopf, um dich an ihn zu erinnern.</p>' +
          '<h3>Wort zeigen</h3><p>Drück <b>Wort zeigen</b> oder schreib <code>lösung</code> oder <code>reveal</code>, um das geheime Wort zu sehen. Das Spiel endet dann mit 0 Punkten.</p>' +
          '<h3>Punkte</h3><p>Je weniger Versuche du brauchst, desto mehr Punkte bekommst du: Mit jedem weiteren Versuch sinken die Punkte stark. Ein kleiner Zeitbonus (bis zu 20 %) belohnt schnelle Spiele.</p>' + c.scoreTable +
          '<p>Gespeichert werden nur deine höchste Punktzahl und die höchste Punktzahl aller Zeiten; eine Gesamtsumme gibt es nicht.</p>' +
          '<h3>Befehle</h3>' + c.commandTable + '<p>Die deutschen Befehle gelten, solange Deutsch eingestellt ist; help, reveal und exit gelten in jeder Sprache. Groß- und Kleinschreibung spielt keine Rolle.</p>' +
          '<h3>Spieler</h3><p>Du spielst sofort als <b>Anonym</b>. Diesen Rekord teilen sich alle, die auf diesem Gerät spielen. Um deinen eigenen Rekord zu behalten, tipp auf <b>Anmelden</b> und gib deinen Spielernamen ein oder leg einen neuen an. Namen, die du schon benutzt hast, stehen dort, sodass die nächste Anmeldung ein Tipp ist. Im selben Fenster kannst du auch ohne Speichern spielen. Die Ergebnisse bleiben auf diesem Gerät.</p>' +
          '<h3>Einstellungen</h3><p>Der Knopf ⚙ enthält den Ton (Ticken der Uhr, ein Ton für jedes O und ?, und die Siegesmelodie – je höher die Punktzahl, desto prächtiger), die Hintergrundfarben, die Schriftgröße (A+ / A−) und die Option, nur Wörter aus der Wortliste anzunehmen.</p>' +
          '<h3>Neues Spiel</h3><p>Nach einem Spiel drückst du <b>Neues Spiel</b> oder schreibst <code>J</code>. Wenn du während eines Spiels die Sprache oder die Wortlänge wechselst, beginnt nach deiner Bestätigung ein neues Spiel.</p>' +
          '<h3>Zurück zu den Spielen</h3><p>Drück <b>Beenden</b>, die Zurück-Taste oder das MBG-Zeichen oben links, um zur Liste der Spiele zurückzukehren. Ein angefangenes Spiel bleibt erhalten und geht weiter, wenn du zurückkommst. Die App schließt du mit dem Knopf ⏻ auf dem Startbildschirm.</p>';
      },
      'help.scoreHead': ['Länge', 'Höchste Punkte', 'Wenigste Punkte'],
      'help.scoreRow': function (p) { return [p.length + ' Buchstaben', p.hiScore + ' mit ' + p.hiAttempt + ' Versuchen', p.loScore + ' mit ' + p.loAttempt + ' Versuchen']; },
      'help.cmdHead': ['Schreib', 'Was passiert'],
      'help.cmdRows': [
        ['hilfe · regeln · help', 'Öffnet diese Anleitung'],
        ['lösung · reveal', 'Zeigt das geheime Wort (0 Punkte)'],
        ['beenden · exit · quit', 'Zurück zur Liste der Spiele'],
        ['J / N', 'Nach einem Spiel: neues Spiel oder zurück zur Liste der Spiele']
      ],
      'help.about': 'Über das Spiel',
      'opt.pool': 'Stufe',
      'level.title': 'Stufe',
      'level.normal': 'Normal',
      'level.expert': 'Experte ⭐',
      'level.expertOn': 'Expertenstufe: geheime Wörter aus dem ganzen Wörterbuch.',
      'level.normalOn': 'Normale Stufe: Wörter aus dem Alltag.',
      'win.tryExpert': 'Zu leicht? Probier die Expertenstufe ⭐ – geheime Wörter aus dem ganzen Wörterbuch.',
      'win.expertBtn': 'Als Experte spielen',
      'opt.poolHint': function (p) { return 'Normal: ' + p.everyday + ' Wörter aus dem Alltag · Experte: ' + p.all + ' Wörter aus dem Wörterbuch.'; },
      'opt.poolEveryday': 'Normal',
      'opt.poolAll': 'Experte ⭐',
      'toast.poolNext': 'Ab dem nächsten Spiel.',
      'about.sources': 'Wörterbücher: ENABLE und english-words (gemeinfrei); die LibreOffice-Wörterbücher für Albanisch, Bosnisch, Deutsch, Spanisch, Französisch, Türkisch, Polnisch, brasilianisches Portugiesisch und Arabisch sowie auf Ijekavisch geprüfte Wörter in lateinischer Schrift (offene Lizenzen); Zemberek für die türkischen und Arramooz für die arabischen Grundformen; FrequencyWords für die Alltagswörter. Einzelheiten: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Errate das Wort. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Läuft auch offline. Kein Konto nötig: Namen und Ergebnisse bleiben auf diesem Handy. Abos werden über Google Play bezahlt und verwaltet.',
      'about.privacyFree': 'Läuft auch offline. Gratis, ohne Werbung und ohne In-App-Käufe. Namen und Ergebnisse bleiben auf diesem Handy.',
      'about.words': function (p) { return 'Wörter (Alltag / angenommen): ' + p.list + '.'; },
    },
    es: {
      'app.title': 'Adivina la palabra',
      'app.by': 'MBG Puzzles · de MBG',
      'lang.listName.en': 'inglesa',
      'lang.listName.sq': 'albanesa',
      'lang.listName.bs': 'bosnia',
      'lang.listName.de': 'alemana',
      'lang.listName.es': 'española',
      'lang.listName.fr': 'francesa',
      'lang.listName.tr': 'turca',
      'lang.listName.pl': 'polaca',
      'lang.listName.pt': 'portuguesa',
      'lang.listName.ar': 'árabe',

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
      'btn.reveal': 'Ver palabra',
      'btn.newGame': 'Partida nueva',
      'btn.length': function (p) { return 'Cambiar a ' + p.n + ' letras'; },
      'btn.close': 'Cerrar',
      'aria.fontUp': 'Texto más grande',
      'aria.fontDown': 'Texto más pequeño',
      'aria.length': function (p) { return 'Longitud de la palabra: ' + p.n + ' letras. Cambiar'; },
      'aria.history': 'Tablero',
      'aria.user': function (p) { return 'Jugador: ' + p.name; },

      'status.anonymous': 'Anónimo',
      'status.noData': 'Sin guardar',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'segundo', 'segundos'); },
      'len.chip': function (p) { return p.n + ' letras'; },

      'label.play': function (p) { return 'Escribe una palabra de ' + p.n + ' letras o un comando'; },
      'label.yesno': '¿Quieres jugar otra partida? S/N',
      'ph.play': function (p) { return 'Palabra de ' + p.n + ' letras'; },
      'ph.yesno': '¿Otra partida? S / N',

      'notice.storageUnavailable': 'Este navegador no deja que el juego guarde las puntuaciones.',
      'notice.loggedIn': function (p) { return '¡Hola de nuevo, ' + p.name + '! Tu récord: ' + p.best; },
      'notice.registered': function (p) { return '¡Hola, ' + p.name + '!'; },
      'notice.noData': 'Juegas sin guardar',
      'notice.anonymous': 'Juegas como Anónimo',
      'notice.restored': 'Tu partida se ha recuperado',
      'warn.empty': function (p) { return 'Escribe una palabra de ' + p.length + ' letras.'; },
      'reveal.what': 'la palabra entera',
      'hint.btn': 'Pista',
      'hint.what': 'una letra más',
      'hint.shown': function (p) { return 'Pista ' + p.number + ': la letra ' + p.pos + ' es ' + p.ch; },
      'warn.noHint': 'No quedan más pistas: el resto depende de ti.',
      'win.hints': function (p) { return 'Con ' + p.n + ' ' + pl(p.n, 'pista', 'pistas') + ': cada una cuenta como ' + p.k + ' intentos en la puntuación.'; },
      'warn.alpha': 'Solo letras, por favor. Este intento no cuenta.',
      'warn.length': function (p) { return 'Tu palabra tiene ' + p.got + ' ' + pl(p.got, 'letra', 'letras') + ' y esta partida necesita ' + p.length + '. No cuenta.'; },
      'warn.vocab': function (p) { return '«' + p.word + '» no está en la lista de palabras. No cuenta.'; },
      'warn.roundOver': 'Fin de la partida. Escribe S para jugar otra o N para volver a los juegos.',
      'warn.noWords': function (p) { return 'En la lista ' + p.listName + ' no hay palabras de ' + p.length + ' letras.'; },

      'win.title': '¡ENHORABUENA!',
      'win.titleName': function (p) { return '¡ENHORABUENA, ' + p.name + '!'; },
      'win.found': function (p) { return 'Encontraste «' + p.word + '» en ' + p.attempts + ' ' + pl(p.attempts, 'intento', 'intentos') + ' y ' + p.seconds + ' ' + pl(p.seconds, 'segundo', 'segundos') + '.'; },
      'win.luck': '¡Qué suerte! ¡A la primera!',
      'score.label': 'Puntos',
      'score.yourBest': 'Tu récord',
      'score.allTime': 'Mejor de siempre',
      'score.newBest': '¡Nuevo récord!',
      'score.newAllTime': '¡Récord absoluto!',
      'score.notSaved': 'No guardado',
      'reveal.text': '¡Más suerte la próxima vez!',
      'reveal.word': function (p) { return 'La palabra secreta era ' + p.word + '.'; },

      'dlg.cancel': 'Cancelar',
      'restart.title': '¿Empezar una partida nueva?',
      'restart.length': function (p) { return 'Cambiar a palabras de ' + p.n + ' letras termina esta partida. No se puntuará.'; },
      'restart.language': 'Cambiar de idioma termina esta partida. No se puntuará.',
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
      'opt.validate': 'Aceptar solo palabras reales',
      'opt.validateHint': function (p) { return 'Cada intento debe estar en el diccionario (' + p.n + ' palabras en este idioma). Las demás palabras no cuentan como intento.'; },
      'goodbye.title': '¡Gracias por jugar!',
      'goodbye.text': 'Esperamos que te haya gustado el juego. ¡Vuelve pronto para otra ronda!',
      'goodbye.sign': 'Un cordial saludo de MBG · Merkur Beqiri Games',
      'goodbye.again': 'Jugar otra vez',
      'goodbye.close': 'Ya puedes cerrar esta ventana.',
      'wheel.title': 'Longitud de la palabra',
      'wheel.done': 'Listo',
      'wheel.item': function (p) { return p.n + ' letras'; },
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
      'legend.O': 'letra correcta en su sitio',
      'legend.Q': 'está en la palabra, pero en otro sitio',
      'legend.X': 'no está en la palabra',

      'help.html': function (c) {
        return '' +
          '<h3>El objetivo</h3><p>El ordenador elige al azar una palabra secreta de la lista del idioma elegido (español, inglés, albanés, bosnio, alemán, francés, turco, polaco, portugués o árabe). Encuéntrala con los menos intentos posibles.</p>' +
          '<h3>Cómo leer las pistas</h3><p>Después de cada intento, cada letra de tu palabra recibe una pista, en el mismo orden:</p>' + c.legend +
          '<p class="example">Ejemplo: la palabra secreta es PLAYA y escribes PALMA → <code>O ? ? X O</code></p>' +
          '<p class="example">Las letras repetidas se cuentan con cuidado. Palabra secreta LIBRO, intento LLAVE → <code>O X X X X</code>. LIBRO tiene una sola L: la primera L de LLAVE ya es O, así que la segunda recibe X.</p>' +
          '<h3>Cómo jugar</h3><p>Escribe una palabra con el número exacto de letras y pulsa <b>Comprobar</b> o Intro. Las mayúsculas y minúsculas dan igual y las letras se pueden repetir. Las palabras de otra longitud, o con cifras o símbolos, no cuentan.</p>' +
          '<p class="example">Las tildes no cuentan: ÁRBOL se juega como ARBOL, y puedes escribir con o sin tilde. La Ñ sí es una letra propia: SUEÑO no es SUENO.</p>' +
          '<h3>Longitud de la palabra</h3><p>Juega con palabras de 4, 5, 6, 7 u 8 letras. Toca el botón de longitud (por ejemplo <b>4 letras</b>) junto al reloj y elige una longitud. En el teléfono, gira la rueda.</p>' +
          '<h3>Ganar</h3><p>Cuando todas las pistas son O, has encontrado la palabra. Las O se convierten en corazones ❤️ y, con el sonido activado, suena la melodía de la victoria.</p>' +
          '<h3>Pistas 💡</h3><p>¿Atascado? Después de tu 3.er intento (en el nivel Experto ⭐, después del 4.º) aparece junto al campo de texto un botón con una bombilla. Cada pista descubre una letra más de la palabra secreta, en un sitio al azar que todavía no has encontrado, y cuesta un crédito de pistas (mira ⚙ › Créditos de pistas: créditos gratis cada día y más con puntuaciones altas). El juego nunca regala la palabra entera: siempre queda al menos una letra para ti. Cada pista cuenta como 2 intentos más en la puntuación. Cuantos más intentos fallas, más a menudo se mueve el botón para recordarte que está ahí.</p>' +
          '<h3>Ver palabra</h3><p>Pulsa <b>Ver palabra</b>, o escribe <code>revelar</code> o <code>reveal</code>, para ver la palabra secreta. La partida termina con 0 puntos.</p>' +
          '<h3>Puntuación</h3><p>Cuantos menos intentos necesitas, más puntos consigues: los puntos bajan mucho con cada intento de más. Un pequeño bonus de rapidez (hasta un 20 %) premia las partidas rápidas.</p>' + c.scoreTable +
          '<p>Solo se guardan tu puntuación más alta y la más alta de siempre; no se lleva un total.</p>' +
          '<h3>Comandos</h3>' + c.commandTable + '<p>Los comandos en español funcionan mientras juegas en español; help, reveal y exit funcionan en todos los idiomas. Las mayúsculas dan igual.</p>' +
          '<h3>Jugadores</h3><p>Empiezas a jugar enseguida como <b>Anónimo</b>. Ese récord lo comparten todos los que juegan en este dispositivo. Para guardar tu propio récord, toca <b>Entrar</b> y escribe tu nombre de jugador o crea uno nuevo. Los nombres que ya has usado aparecen ahí, así que volver a entrar es un solo toque. En la misma ventana también puedes jugar sin guardar nada. Las puntuaciones se guardan en este dispositivo.</p>' +
          '<h3>Ajustes</h3><p>El botón ⚙ tiene el sonido (el tictac del reloj, un tono por cada O y ? y la melodía de la victoria, más vistosa cuanto más alta es la puntuación), los colores de fondo, el tamaño del texto (A+ / A−) y la opción de aceptar solo palabras de la lista.</p>' +
          '<h3>Partida nueva</h3><p>Al terminar, pulsa <b>Partida nueva</b> o escribe <code>S</code>. Si cambias el idioma o la longitud durante una partida, empieza una nueva después de confirmarlo.</p>' +
          '<h3>Volver a los juegos</h3><p>Pulsa <b>Salir</b>, el botón Atrás o la marca MBG arriba a la izquierda para volver a la lista de juegos. Una partida sin terminar se guarda y sigue cuando vuelves. Para cerrar la app, usa el botón ⏻ de la pantalla de inicio.</p>';
      },
      'help.scoreHead': ['Longitud', 'Máximo', 'Mínimo'],
      'help.scoreRow': function (p) { return [p.length + ' letras', p.hiScore + ' con ' + p.hiAttempt + ' intentos', p.loScore + ' con ' + p.loAttempt + ' intentos']; },
      'help.cmdHead': ['Escribe', 'Qué hace'],
      'help.cmdRows': [
        ['ayuda · reglas · help', 'Abre estas instrucciones'],
        ['revelar · reveal', 'Muestra la palabra secreta (0 puntos)'],
        ['salir · exit · quit', 'Vuelve a la lista de juegos'],
        ['S / N', 'Después de una partida: jugar otra o volver a la lista de juegos']
      ],
      'help.about': 'Acerca del juego',
      'opt.pool': 'Nivel',
      'level.title': 'Nivel',
      'level.normal': 'Normal',
      'level.expert': 'Experto ⭐',
      'level.expertOn': 'Nivel experto: palabras secretas de todo el diccionario.',
      'level.normalOn': 'Nivel normal: palabras de todos los días.',
      'win.tryExpert': '¿Demasiado fácil? Prueba el nivel Experto ⭐: palabras secretas de todo el diccionario.',
      'win.expertBtn': 'Jugar como experto',
      'opt.poolHint': function (p) { return 'Normal: ' + p.everyday + ' palabras de todos los días · Experto: ' + p.all + ' palabras del diccionario.'; },
      'opt.poolEveryday': 'Normal',
      'opt.poolAll': 'Experto ⭐',
      'toast.poolNext': 'A partir de la próxima partida.',
      'about.sources': 'Diccionarios: ENABLE y english-words (dominio público); los diccionarios de LibreOffice de albanés, bosnio, alemán, español, francés, turco, polaco, portugués de Brasil y árabe, y palabras en alfabeto latino revisadas para el ijekavo (licencias abiertas); Zemberek para las formas base del turco y Arramooz para las del árabe; FrequencyWords para las palabras de todos los días. Detalles: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Adivina la palabra. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Funciona sin conexión. No hace falta cuenta: los nombres y las puntuaciones se quedan en este teléfono. Las suscripciones se pagan y se gestionan a través de Google Play.',
      'about.privacyFree': 'Funciona sin conexión. Gratis, sin anuncios y sin compras en la app. Los nombres y las puntuaciones se quedan en este teléfono.',
      'about.words': function (p) { return 'Palabras (de todos los días / aceptadas): ' + p.list + '.'; },
    },
    fr: {
      'app.title': 'Devine le mot',
      'app.by': 'MBG Puzzles · par MBG',
      'lang.listName.en': 'anglaise',
      'lang.listName.sq': 'albanaise',
      'lang.listName.bs': 'bosnienne',
      'lang.listName.de': 'allemande',
      'lang.listName.es': 'espagnole',
      'lang.listName.fr': 'française',
      'lang.listName.tr': 'turque',
      'lang.listName.pl': 'polonaise',
      'lang.listName.pt': 'portugaise',
      'lang.listName.ar': 'arabe',

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
      'btn.reveal': 'Voir le mot',
      'btn.newGame': 'Nouvelle partie',
      'btn.length': function (p) { return 'Passer à ' + p.n + ' lettres'; },
      'btn.close': 'Fermer',
      'aria.fontUp': 'Texte plus grand',
      'aria.fontDown': 'Texte plus petit',
      'aria.length': function (p) { return 'Longueur du mot : ' + p.n + ' lettres. Changer'; },
      'aria.history': 'Plateau de jeu',
      'aria.user': function (p) { return 'Joueur : ' + p.name; },

      'status.anonymous': 'Anonyme',
      'status.noData': 'Sans sauvegarde',
      'status.time': function (p) { return p.n + ' ' + plFr(p.n, 'seconde', 'secondes'); },
      'len.chip': function (p) { return p.n + ' lettres'; },

      'label.play': function (p) { return 'Tape un mot de ' + p.n + ' lettres ou une commande'; },
      'label.yesno': 'Tu veux jouer une autre partie ? O/N',
      'ph.play': function (p) { return 'Mot de ' + p.n + ' lettres'; },
      'ph.yesno': 'Encore une partie ? O / N',

      'notice.storageUnavailable': 'Ce navigateur ne permet pas au jeu d’enregistrer les scores.',
      'notice.loggedIn': function (p) { return 'Bon retour, ' + p.name + ' ! Ton record : ' + p.best; },
      'notice.registered': function (p) { return 'Bienvenue, ' + p.name + ' !'; },
      'notice.noData': 'Tu joues sans sauvegarde',
      'notice.anonymous': 'Tu joues en Anonyme',
      'notice.restored': 'Ta partie a été restaurée',
      'warn.empty': function (p) { return 'Tape un mot de ' + p.length + ' lettres.'; },
      'reveal.what': 'le mot entier',
      'hint.btn': 'Indice',
      'hint.what': 'une lettre de plus',
      'hint.shown': function (p) { return 'Indice ' + p.number + ' : la lettre ' + p.pos + ' est ' + p.ch; },
      'warn.noHint': 'Plus d’indices – la suite, c’est à toi.',
      'win.hints': function (p) { return 'Avec ' + p.n + ' ' + plFr(p.n, 'indice', 'indices') + ' – chacun compte comme ' + p.k + ' essais dans le score.'; },
      'warn.alpha': 'Seulement des lettres, s’il te plaît. Cet essai ne compte pas.',
      'warn.length': function (p) { return 'Ton mot a ' + p.got + ' ' + plFr(p.got, 'lettre', 'lettres') + ' ; cette partie en demande ' + p.length + '. Ça ne compte pas.'; },
      'warn.vocab': function (p) { return '« ' + p.word + ' » n’est pas dans la liste de mots. Ça ne compte pas.'; },
      'warn.roundOver': 'Partie terminée. Tape O pour rejouer ou N pour revenir aux jeux.',
      'warn.noWords': function (p) { return 'La liste ' + p.listName + ' n’a pas de mots de ' + p.length + ' lettres.'; },

      'win.title': 'BRAVO !',
      'win.titleName': function (p) { return 'BRAVO, ' + p.name + ' !'; },
      'win.found': function (p) { return 'Tu as trouvé « ' + p.word + ' » en ' + p.attempts + ' ' + plFr(p.attempts, 'essai', 'essais') + ' et ' + p.seconds + ' ' + plFr(p.seconds, 'seconde', 'secondes') + '.'; },
      'win.luck': 'Quelle chance ! Du premier coup !',
      'score.label': 'Score',
      'score.yourBest': 'Ton record',
      'score.allTime': 'Meilleur de tous les temps',
      'score.newBest': 'Nouveau record !',
      'score.newAllTime': 'Record absolu !',
      'score.notSaved': 'Non enregistré',
      'reveal.text': 'Plus de chance la prochaine fois !',
      'reveal.word': function (p) { return 'Le mot secret était ' + p.word + '.'; },

      'dlg.cancel': 'Annuler',
      'restart.title': 'Commencer une nouvelle partie ?',
      'restart.length': function (p) { return 'Passer aux mots de ' + p.n + ' lettres termine cette partie. Elle ne sera pas comptée.'; },
      'restart.language': 'Changer de langue termine cette partie. Elle ne sera pas comptée.',
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
      'opt.validate': 'Accepter seulement les vrais mots',
      'opt.validateHint': function (p) { return 'Chaque essai doit être dans le dictionnaire (' + p.n + ' mots dans cette langue). Les autres mots ne comptent pas comme essai.'; },
      'goodbye.title': 'Merci d’avoir joué !',
      'goodbye.text': 'Nous espérons que le jeu t’a plu. Reviens vite pour une nouvelle partie !',
      'goodbye.sign': 'Avec nos amitiés, MBG · Merkur Beqiri Games',
      'goodbye.again': 'Rejouer',
      'goodbye.close': 'Tu peux maintenant fermer cette fenêtre.',
      'wheel.title': 'Longueur du mot',
      'wheel.done': 'OK',
      'wheel.item': function (p) { return p.n + ' lettres'; },
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
      'legend.O': 'bonne lettre, bonne place',
      'legend.Q': 'dans le mot, mais à une autre place',
      'legend.X': 'pas dans le mot',

      'help.html': function (c) {
        return '' +
          '<h3>Le but</h3><p>L’ordinateur choisit au hasard un mot secret dans la liste de la langue choisie (français, anglais, albanais, bosnien, allemand, espagnol, turc, polonais, portugais ou arabe). Trouve-le en aussi peu d’essais que possible.</p>' +
          '<h3>Lire les indices</h3><p>Après chaque essai, chaque lettre de ton mot reçoit un indice, dans le même ordre :</p>' + c.legend +
          '<p class="example">Exemple : le mot secret est POMME et tu tapes PLUME → <code>O X X O O</code></p>' +
          '<p class="example">Les lettres répétées sont comptées avec soin. Mot secret LIVRE, essai LILAS → <code>O O X X X</code>. LIVRE n’a qu’un L : il est déjà trouvé au début, donc le deuxième L de LILAS reçoit X.</p>' +
          '<h3>Faire un essai</h3><p>Tape un mot avec exactement le bon nombre de lettres et appuie sur <b>Valider</b> ou Entrée. Majuscules et minuscules sont pareilles, et les lettres peuvent se répéter. Les mots de mauvaise longueur, ou avec des chiffres ou des symboles, ne comptent pas.</p>' +
          '<p class="example">Les accents ne comptent pas : FORÊT se joue FORET et CŒUR se joue COEUR (5 lettres). Tu peux taper avec ou sans accents.</p>' +
          '<h3>Longueur du mot</h3><p>Joue avec des mots de 4, 5, 6, 7 ou 8 lettres. Touche le bouton de longueur (par exemple <b>4 lettres</b>) à côté de l’horloge et choisis une longueur. Sur le téléphone, fais tourner la roue.</p>' +
          '<h3>Gagner</h3><p>Quand tous les indices sont O, tu as trouvé le mot. Les O se transforment en cœurs ❤️ et, avec le son, tu entends la musique de la victoire.</p>' +
          '<h3>Indices 💡</h3><p>Tu bloques ? Après ton 3<sup>e</sup> essai (au niveau Expert ⭐, après le 4<sup>e</sup>), un bouton avec une ampoule apparaît à côté du champ. Chaque indice dévoile une lettre de plus du mot secret, à une place au hasard que tu n’as pas encore trouvée, et coûte un crédit d’indices (voir ⚙ › Crédits d’indices : des crédits gratuits chaque jour, plus avec de bons scores). Le jeu ne donne jamais tout le mot : il reste toujours au moins une lettre pour toi. Chaque indice compte comme 2 essais de plus dans le score. Plus tes essais échouent, plus le bouton bouge souvent pour te rappeler qu’il est là.</p>' +
          '<h3>Voir le mot</h3><p>Appuie sur <b>Voir le mot</b>, ou tape <code>révéler</code> ou <code>reveal</code>, pour voir le mot secret. La partie se termine avec 0 point.</p>' +
          '<h3>Score</h3><p>Moins il te faut d’essais, plus ton score est élevé : les points baissent fortement à chaque essai de plus. Un petit bonus de vitesse (jusqu’à 20 %) récompense les parties rapides.</p>' + c.scoreTable +
          '<p>Seuls ton meilleur score et le meilleur score de tous les temps sont gardés ; il n’y a pas de total.</p>' +
          '<h3>Commandes</h3>' + c.commandTable + '<p>Les commandes en français marchent tant que tu joues en français ; help, reveal et exit marchent dans toutes les langues. Les majuscules ne comptent pas.</p>' +
          '<h3>Joueurs</h3><p>Tu commences tout de suite en <b>Anonyme</b>. Ce record est partagé par tous ceux qui jouent sur cet appareil. Pour garder ton propre record, touche <b>Connexion</b> et tape ton nom de joueur, ou crées-en un nouveau. Les noms déjà utilisés y sont listés, alors se reconnecter se fait d’un seul geste. Dans la même fenêtre, tu peux aussi jouer sans rien enregistrer. Les scores restent sur cet appareil.</p>' +
          '<h3>Réglages</h3><p>Le bouton ⚙ contient le son (le tic-tac de l’horloge, un son pour chaque O et ?, et la musique de la victoire, plus éclatante quand le score est plus élevé), les couleurs de fond, la taille du texte (A+ / A−) et l’option d’accepter seulement les mots de la liste.</p>' +
          '<h3>Nouvelle partie</h3><p>Après une partie, appuie sur <b>Nouvelle partie</b> ou tape <code>O</code>. Si tu changes de langue ou de longueur pendant une partie, une nouvelle partie commence après confirmation.</p>' +
          '<h3>Revenir aux jeux</h3><p>Appuie sur <b>Quitter</b>, sur le bouton Retour ou sur le logo MBG en haut à gauche pour revenir à la liste des jeux. Une partie non terminée est gardée et continue à ton retour. Pour fermer l’app, utilise le bouton ⏻ de l’écran d’accueil.</p>';
      },
      'help.scoreHead': ['Longueur', 'Score maximal', 'Score minimal'],
      'help.scoreRow': function (p) { return [p.length + ' lettres', p.hiScore + ' en ' + p.hiAttempt + ' essais', p.loScore + ' en ' + p.loAttempt + ' essais']; },
      'help.cmdHead': ['Tape', 'Ce que ça fait'],
      'help.cmdRows': [
        ['aide · règles · help', 'Ouvre ces instructions'],
        ['révéler · reveal', 'Montre le mot secret (0 point)'],
        ['quitter · exit · quit', 'Revient à la liste des jeux'],
        ['O / N', 'Après une partie : rejouer ou revenir à la liste des jeux']
      ],
      'help.about': 'À propos',
      'opt.pool': 'Niveau',
      'level.title': 'Niveau',
      'level.normal': 'Normal',
      'level.expert': 'Expert ⭐',
      'level.expertOn': 'Niveau expert : mots secrets de tout le dictionnaire.',
      'level.normalOn': 'Niveau normal : mots de tous les jours.',
      'win.tryExpert': 'Trop facile ? Essaie le niveau Expert ⭐ – des mots secrets de tout le dictionnaire.',
      'win.expertBtn': 'Jouer en expert',
      'opt.poolHint': function (p) { return 'Normal : ' + p.everyday + ' mots de tous les jours · Expert : ' + p.all + ' mots du dictionnaire.'; },
      'opt.poolEveryday': 'Normal',
      'opt.poolAll': 'Expert ⭐',
      'toast.poolNext': 'À partir de la prochaine partie.',
      'about.sources': 'Dictionnaires : ENABLE et english-words (domaine public) ; les dictionnaires LibreOffice d’albanais, de bosnien, d’allemand, d’espagnol, de français, de turc, de polonais, de portugais du Brésil et d’arabe, et des mots en alphabet latin vérifiés pour l’ijékavien (licences libres) ; Zemberek pour les formes de base du turc et Arramooz pour celles de l’arabe ; FrequencyWords pour les mots de tous les jours. Détails : words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Devine le mot. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Fonctionne hors ligne. Pas besoin de compte : les noms et les scores restent sur ce téléphone. Les abonnements sont payés et gérés via Google Play.',
      'about.privacyFree': 'Fonctionne hors ligne. Gratuit, sans pub et sans achats intégrés. Les noms et les scores restent sur ce téléphone.',
      'about.words': function (p) { return 'Mots (de tous les jours / acceptés) : ' + p.list + '.'; },
    },
    tr: {
      'app.title': 'Kelimeyi Bul',
      'app.by': 'MBG Puzzles · MBG',
      'lang.listName.en': 'İngilizce',
      'lang.listName.sq': 'Arnavutça',
      'lang.listName.bs': 'Boşnakça',
      'lang.listName.de': 'Almanca',
      'lang.listName.es': 'İspanyolca',
      'lang.listName.fr': 'Fransızca',
      'lang.listName.tr': 'Türkçe',
      'lang.listName.pl': 'Lehçe',
      'lang.listName.pt': 'Portekizce',
      'lang.listName.ar': 'Arapça',

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
      'btn.reveal': 'Kelimeyi göster',
      'btn.newGame': 'Yeni oyun',
      'btn.length': function (p) { return p.n + ' harfe geç'; },
      'btn.close': 'Kapat',
      'aria.fontUp': 'Daha büyük yazı',
      'aria.fontDown': 'Daha küçük yazı',
      'aria.length': function (p) { return 'Kelime uzunluğu: ' + p.n + ' harf. Değiştir'; },
      'aria.history': 'Oyun tahtası',
      'aria.user': function (p) { return 'Oyuncu: ' + p.name; },

      'status.anonymous': 'Anonim',
      'status.noData': 'Kaydetmeden',
      'status.time': function (p) { return p.n + ' saniye'; },
      'len.chip': function (p) { return p.n + ' harf'; },

      'label.play': function (p) { return p.n + ' harfli bir kelime ya da bir komut yaz'; },
      'label.yesno': 'Bir oyun daha oynamak ister misin? E/H',
      'ph.play': function (p) { return p.n + ' harfli kelime'; },
      'ph.yesno': 'Bir oyun daha? E / H',

      'notice.storageUnavailable': 'Bu tarayıcı oyunun skor kaydetmesine izin vermiyor.',
      'notice.loggedIn': function (p) { return 'Tekrar hoş geldin, ' + p.name + '! Rekorun: ' + p.best; },
      'notice.registered': function (p) { return 'Hoş geldin, ' + p.name + '!'; },
      'notice.noData': 'Kaydetmeden oynuyorsun',
      'notice.anonymous': 'Anonim olarak oynuyorsun',
      'notice.restored': 'Oyunun geri yüklendi',
      'warn.empty': function (p) { return p.length + ' harfli bir kelime yaz.'; },
      'reveal.what': 'kelimenin tamamını',
      'hint.btn': 'İpucu',
      'hint.what': 'bir harf daha',
      'hint.shown': function (p) { return 'İpucu ' + p.number + ': ' + p.pos + '. harf ' + p.ch; },
      'warn.noHint': 'Başka ipucu yok – gerisi sana kalmış.',
      'win.hints': function (p) { return p.n + ' ipucuyla – her biri puanda ' + p.k + ' deneme sayılır.'; },
      'warn.alpha': 'Lütfen yalnızca harf yaz. Bu deneme sayılmadı.',
      'warn.length': function (p) { return 'Kelimende ' + p.got + ' harf var; bu oyun ' + p.length + ' harf istiyor. Sayılmadı.'; },
      'warn.vocab': function (p) { return '“' + p.word + '” kelime listesinde yok. Sayılmadı.'; },
      'warn.roundOver': 'Oyun bitti. Yeniden oynamak için E, oyunlara dönmek için H yaz.',
      'warn.noWords': function (p) { return p.listName + ' kelime listesinde ' + p.length + ' harfli kelime yok.'; },

      'win.title': 'TEBRİKLER!',
      'win.titleName': function (p) { return 'TEBRİKLER, ' + p.name + '!'; },
      'win.found': function (p) { return '“' + p.word + '” kelimesini ' + p.attempts + ' denemede ve ' + p.seconds + ' saniyede buldun.'; },
      'win.luck': 'Ne şans! İlk denemede!',
      'score.label': 'Puan',
      'score.yourBest': 'Rekorun',
      'score.allTime': 'Tüm zamanların en iyisi',
      'score.newBest': 'Yeni rekor!',
      'score.newAllTime': 'Tüm zamanların rekoru!',
      'score.notSaved': 'Kaydedilmedi',
      'reveal.text': 'Bir dahaki sefere bol şans!',
      'reveal.word': function (p) { return 'Gizli kelime: ' + p.word + '.'; },

      'dlg.cancel': 'İptal',
      'restart.title': 'Yeni oyun başlasın mı?',
      'restart.length': function (p) { return p.n + ' harfli kelimelere geçmek bu oyunu bitirir. Oyun puanlanmaz.'; },
      'restart.language': 'Dili değiştirmek bu oyunu bitirir. Oyun puanlanmaz.',
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
      'opt.validate': 'Yalnızca gerçek kelimeleri kabul et',
      'opt.validateHint': function (p) { return 'Her deneme sözlükte olmalı (bu dilde ' + p.n + ' kelime). Diğer kelimeler deneme sayılmaz.'; },
      'goodbye.title': 'Oynadığın için teşekkürler!',
      'goodbye.text': 'Oyunu beğendiğini umuyoruz. Yeni bir tur için yakında yine gel!',
      'goodbye.sign': 'Sevgilerle, MBG · Merkur Beqiri Games',
      'goodbye.again': 'Yeniden oyna',
      'goodbye.close': 'Artık bu pencereyi kapatabilirsin.',
      'wheel.title': 'Kelime uzunluğu',
      'wheel.done': 'Tamam',
      'wheel.item': function (p) { return p.n + ' harf'; },
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
      'legend.O': 'doğru harf, doğru yerde',
      'legend.Q': 'kelimede var, ama başka yerde',
      'legend.X': 'kelimede yok',

      'help.html': function (c) {
        return '' +
          '<h3>Amaç</h3><p>Bilgisayar, seçili dilin kelime listesinden (Türkçe, İngilizce, Arnavutça, Boşnakça, Almanca, İspanyolca, Fransızca, Lehçe, Portekizce ya da Arapça) rastgele gizli bir kelime seçer. Onu olabildiğince az denemede bul.</p>' +
          '<h3>İpuçlarını okumak</h3><p>Her denemeden sonra kelimendeki her harf, aynı sırayla bir ipucu alır:</p>' + c.legend +
          '<p class="example">Örnek: gizli kelime TAVUK, sen KAVUN yazıyorsun → <code>? O O O X</code></p>' +
          '<p class="example">Tekrar eden harfler dikkatle sayılır. Gizli kelime KİTAP, deneme KAPAK → <code>O X ? O X</code>. KİTAP’ta tek bir A var ve o, KAPAK’ın ikinci A’sıyla aynı yerde; bu yüzden ilk A X alır. Son K da X alır, çünkü KİTAP’taki tek K zaten bulundu.</p>' +
          '<h3>Tahmin etmek</h3><p>Tam doğru sayıda harfi olan bir kelime yaz ve <b>Dene</b>’ye ya da Enter’a bas. Büyük ve küçük harf fark etmez, harfler tekrar edebilir. Uzunluğu yanlış olan ya da rakam veya işaret içeren kelimeler sayılmaz.</p>' +
          '<p class="example">Ç, Ğ, I, İ, Ö, Ş ve Ü ayrı harflerdir: KIZ ile KİZ aynı değildir. Şapkalı harfler şapkasız yazılır: KÂĞIT, KAĞIT olarak oynanır.</p>' +
          '<h3>Kelime uzunluğu</h3><p>4, 5, 6, 7 ya da 8 harfli kelimelerle oyna. Saatin yanındaki uzunluk düğmesine (örneğin <b>4 harf</b>) dokun ve bir uzunluk seç. Telefonda çarkı çevir.</p>' +
          '<h3>Kazanmak</h3><p>Bütün ipuçları O olduğunda kelimeyi bulmuşsun demektir. O’lar kalplere ❤️ dönüşür ve ses açıksa zafer melodisini duyarsın.</p>' +
          '<h3>İpuçları 💡</h3><p>Takıldın mı? 3. denemenden sonra (Uzman ⭐ seviyesinde 4. denemeden sonra) yazı alanının yanında ampullü bir düğme çıkar. Her ipucu, gizli kelimenin henüz bulmadığın rastgele bir yerindeki bir harfi daha açar ve bir ipucu kredisi tutar (bak: ⚙ › İpucu kredileri: her gün ücretsiz krediler, yüksek puanlarla daha fazlası). Oyun kelimenin tamamını asla vermez: en az bir harf her zaman sana kalır. Her ipucu puanda 2 ek deneme sayılır. Ne kadar çok deneme boşa giderse, düğme sana orada olduğunu hatırlatmak için o kadar sık sallanır.</p>' +
          '<h3>Kelimeyi göster</h3><p>Gizli kelimeyi görmek için <b>Kelimeyi göster</b>’e bas ya da <code>göster</code> veya <code>reveal</code> yaz. Oyun 0 puanla biter.</p>' +
          '<h3>Puanlama</h3><p>Ne kadar az deneme gerekirse puanın o kadar yüksek olur: her ek denemeyle puan hızla düşer. Küçük bir hız bonusu (%20’ye kadar) hızlı oyunları ödüllendirir.</p>' + c.scoreTable +
          '<p>Yalnızca senin en yüksek puanın ve tüm zamanların en yüksek puanı saklanır; toplam puan tutulmaz.</p>' +
          '<h3>Komutlar</h3>' + c.commandTable + '<p>Türkçe komutlar, Türkçe oynadığın sürece çalışır; help, reveal ve exit her dilde çalışır. Büyük ve küçük harf fark etmez.</p>' +
          '<h3>Oyuncular</h3><p>Hemen <b>Anonim</b> olarak oynamaya başlarsın. Bu rekoru bu cihazda oynayan herkes paylaşır. Kendi rekorunu saklamak için <b>Giriş</b>’e dokun ve oyuncu adını yaz ya da yeni bir ad oluştur. Daha önce kullandığın adlar orada listelenir, böylece yeniden giriş tek dokunuştur. Aynı pencerede hiçbir şey kaydetmeden oynamayı da seçebilirsin. Skorlar bu cihazda saklanır.</p>' +
          '<h3>Ayarlar</h3><p>⚙ düğmesinde ses (saatin tik takı, her O ve ? için bir ses ve puan yükseldikçe daha görkemli olan zafer melodisi), arka plan renkleri, yazı boyutu (A+ / A−) ve yalnızca kelime listesindeki kelimeleri kabul etme seçeneği bulunur.</p>' +
          '<h3>Yeni oyun</h3><p>Bir oyundan sonra <b>Yeni oyun</b>’a bas ya da <code>E</code> yaz. Oyun sırasında dili ya da kelime uzunluğunu değiştirirsen, onayladıktan sonra yeni bir oyun başlar.</p>' +
          '<h3>Oyunlara dönmek</h3><p>Oyun listesine dönmek için <b>Çık</b>’a, Geri tuşuna ya da sol üstteki MBG işaretine bas. Bitmemiş bir oyun saklanır ve döndüğünde devam eder. Uygulamayı kapatmak için ana ekrandaki ⏻ düğmesini kullan.</p>';
      },
      'help.scoreHead': ['Uzunluk', 'En yüksek puan', 'En düşük puan'],
      'help.scoreRow': function (p) { return [p.length + ' harf', p.hiAttempt + ' denemede ' + p.hiScore, p.loAttempt + ' denemede ' + p.loScore]; },
      'help.cmdHead': ['Yaz', 'Ne yapar'],
      'help.cmdRows': [
        ['yardım · kurallar · help', 'Bu açıklamaları açar'],
        ['göster · reveal', 'Gizli kelimeyi gösterir (0 puan)'],
        ['çık · çıkış · exit', 'Oyun listesine döner'],
        ['E / H', 'Oyundan sonra: yeniden oyna ya da oyun listesine dön']
      ],
      'help.about': 'Oyun hakkında',
      'opt.pool': 'Seviye',
      'level.title': 'Seviye',
      'level.normal': 'Normal',
      'level.expert': 'Uzman ⭐',
      'level.expertOn': 'Uzman seviyesi: bütün sözlükten gizli kelimeler.',
      'level.normalOn': 'Normal seviye: gündelik kelimeler.',
      'win.tryExpert': 'Çok mu kolay? Uzman seviyesini ⭐ dene – bütün sözlükten gizli kelimeler.',
      'win.expertBtn': 'Uzman olarak oyna',
      'opt.poolHint': function (p) { return 'Normal: ' + p.everyday + ' gündelik kelime · Uzman: ' + p.all + ' sözlük kelimesi.'; },
      'opt.poolEveryday': 'Normal',
      'opt.poolAll': 'Uzman ⭐',
      'toast.poolNext': 'Bir sonraki oyundan itibaren.',
      'about.sources': 'Sözlükler: ENABLE ve english-words (kamu malı); Arnavutça, Boşnakça, Almanca, İspanyolca, Fransızca, Türkçe, Lehçe, Brezilya Portekizcesi ve Arapça LibreOffice sözlükleri ve ijekavca için denetlenmiş Latin alfabeli kelimeler (açık lisanslar); Türkçe kök biçimleri için Zemberek, Arapça kök biçimleri için Arramooz; gündelik kelimeler için FrequencyWords. Ayrıntılar: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Kelimeyi Bul. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'İnternetsiz de çalışır. Hesap gerekmez: adlar ve skorlar bu telefonda kalır. Abonelikler Google Play üzerinden ödenir ve yönetilir.',
      'about.privacyFree': 'İnternetsiz de çalışır. Ücretsiz, reklamsız ve uygulama içi satın alma yok. Adlar ve skorlar bu telefonda kalır.',
      'about.words': function (p) { return 'Kelimeler (gündelik / kabul edilen): ' + p.list + '.'; },
    },
    pl: {
      'app.title': 'Odgadnij słowo',
      'app.by': 'MBG Puzzles · od MBG',
      'lang.listName.en': 'angielskiej',
      'lang.listName.sq': 'albańskiej',
      'lang.listName.bs': 'bośniackiej',
      'lang.listName.de': 'niemieckiej',
      'lang.listName.es': 'hiszpańskiej',
      'lang.listName.fr': 'francuskiej',
      'lang.listName.tr': 'tureckiej',
      'lang.listName.pl': 'polskiej',
      'lang.listName.pt': 'portugalskiej',
      'lang.listName.ar': 'arabskiej',

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
      'btn.reveal': 'Pokaż słowo',
      'btn.newGame': 'Nowa gra',
      'btn.length': function (p) { return 'Przełącz na słowa ' + p.n + '-literowe'; },
      'btn.close': 'Zamknij',
      'aria.fontUp': 'Większy tekst',
      'aria.fontDown': 'Mniejszy tekst',
      'aria.length': function (p) { return 'Długość słowa: ' + p.n + ' ' + plPl(p.n, 'litera', 'litery', 'liter') + '. Zmień'; },
      'aria.history': 'Plansza',
      'aria.user': function (p) { return 'Gracz: ' + p.name; },

      'status.anonymous': 'Anonim',
      'status.noData': 'Bez zapisu',
      'status.time': function (p) { return p.n + ' ' + plPl(p.n, 'sekunda', 'sekundy', 'sekund'); },
      'len.chip': function (p) { return p.n + ' ' + plPl(p.n, 'litera', 'litery', 'liter'); },

      'label.play': function (p) { return 'Wpisz słowo ' + p.n + '-literowe albo polecenie'; },
      'label.yesno': 'Chcesz zagrać jeszcze raz? T/N',
      'ph.play': function (p) { return 'Wpisz słowo ' + p.n + '-literowe'; },
      'ph.yesno': 'Jeszcze raz? T / N',

      'notice.storageUnavailable': 'Ta przeglądarka nie pozwala grze zapisywać wyników.',
      'notice.loggedIn': function (p) { return 'Witaj ponownie, ' + p.name + '! Twój rekord: ' + p.best; },
      'notice.registered': function (p) { return 'Witaj, ' + p.name + '!'; },
      'notice.noData': 'Gra bez zapisu',
      'notice.anonymous': 'Grasz jako Anonim',
      'notice.restored': 'Twoja gra została przywrócona',
      'warn.empty': function (p) { return 'Wpisz słowo ' + p.length + '-literowe.'; },
      'reveal.what': 'całe słowo',
      'hint.btn': 'Podpowiedź',
      'hint.what': 'jeszcze jedną literę',
      'hint.shown': function (p) { return 'Podpowiedź ' + p.number + ': litera nr ' + p.pos + ' to ' + p.ch; },
      'warn.noHint': 'Koniec podpowiedzi – reszta należy do ciebie.',
      'win.hints': function (p) { return 'Z ' + p.n + ' ' + plPl(p.n, 'podpowiedzią', 'podpowiedziami', 'podpowiedziami') + ' – każda liczy się w wyniku jak ' + p.k + ' próby.'; },
      'warn.alpha': 'Tylko litery, proszę. Ta próba się nie liczy.',
      'warn.length': function (p) { return 'Twoje słowo ma ' + p.got + ' ' + plPl(p.got, 'literę', 'litery', 'liter') + ', a ta gra wymaga ' + p.length + '. Nie liczy się.'; },
      'warn.vocab': function (p) { return 'Słowa „' + p.word + '” nie ma na liście słów. Nie liczy się.'; },
      'warn.roundOver': 'Koniec gry. Wpisz T, aby zagrać jeszcze raz, albo N, aby wrócić do listy gier.',
      'warn.noWords': function (p) { return 'Na ' + p.listName + ' liście nie ma słów ' + p.length + '-literowych.'; },

      'win.title': 'GRATULACJE!',
      'win.titleName': function (p) { return 'GRATULACJE, ' + p.name + '!'; },
      'win.found': function (p) { return 'Znaleziono „' + p.word + '” w ' + p.attempts + ' ' + plPl(p.attempts, 'próbie', 'próbach', 'próbach') + ', w ' + p.seconds + ' ' + plPl(p.seconds, 'sekundę', 'sekundy', 'sekund') + '.'; },
      'win.luck': 'Co za szczęście! Za pierwszym razem!',
      'score.label': 'Wynik',
      'score.yourBest': 'Twój rekord',
      'score.allTime': 'Rekord wszech czasów',
      'score.newBest': 'Nowy rekord!',
      'score.newAllTime': 'Rekord wszech czasów!',
      'score.notSaved': 'Niezapisany',
      'reveal.text': 'Następnym razem się uda!',
      'reveal.word': function (p) { return 'Tajne słowo to ' + p.word + '.'; },

      'dlg.cancel': 'Anuluj',
      'restart.title': 'Zacząć nową grę?',
      'restart.length': function (p) { return 'Zmiana na słowa ' + p.n + '-literowe kończy tę grę. Nie zostanie oceniona.'; },
      'restart.language': 'Zmiana języka kończy tę grę. Nie zostanie oceniona.',
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
      'opt.validate': 'Przyjmuj tylko prawdziwe słowa',
      'opt.validateHint': function (p) { return 'Każda próba musi być w słowniku tego języka (liczba słów: ' + p.n + '). Inne słowa nie liczą się jako próba.'; },
      'goodbye.title': 'Dziękujemy za grę!',
      'goodbye.text': 'Mamy nadzieję, że gra ci się podobała. Wróć wkrótce na kolejną rundę!',
      'goodbye.sign': 'Serdeczne pozdrowienia od MBG · Merkur Beqiri Games',
      'goodbye.again': 'Zagraj jeszcze raz',
      'goodbye.close': 'Możesz teraz zamknąć to okno.',
      'wheel.title': 'Długość słowa',
      'wheel.done': 'Gotowe',
      'wheel.item': function (p) { return p.n + ' ' + plPl(p.n, 'litera', 'litery', 'liter'); },
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
      'legend.O': 'dobra litera na dobrym miejscu',
      'legend.Q': 'jest w słowie, ale na innym miejscu',
      'legend.X': 'nie ma jej w słowie',

      'help.html': function (c) {
        return '' +
          '<h3>Cel gry</h3><p>Komputer losuje tajne słowo z listy słów wybranego języka (polski, angielski, albański, bośniacki, niemiecki, hiszpański, francuski, turecki, portugalski lub arabski). Znajdź je w jak najmniejszej liczbie prób.</p>' +
          '<h3>Jak czytać wskazówki</h3><p>Po każdej próbie każda litera twojego słowa dostaje wskazówkę, w tej samej kolejności:</p>' + c.legend +
          '<p class="example">Przykład: tajne słowo to LAMPA, a ty wpisujesz PALMA → <code>? O ? ? O</code></p>' +
          '<p class="example">Powtarzające się litery są liczone uważnie. Tajne słowo MLEKO, próba MEBLE → <code>O ? X ? X</code>. MLEKO ma tylko jedno E: pierwsze E w MEBLE dostaje ?, a dla drugiego nie zostaje już żadne, więc dostaje X.</p>' +
          '<h3>Jak zgadywać</h3><p>Wpisz słowo o dokładnie właściwej liczbie liter i naciśnij <b>Sprawdź</b> lub Enter. Wielkość liter nie ma znaczenia, a litery mogą się powtarzać. Słowa o złej długości albo z cyframi czy znakami się nie liczą.</p>' +
          '<p class="example">Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź i Ż to osobne litery: SĄD to nie SAD. Na telefonie zwykle wpiszesz je, przytrzymując a, c, e, l, n, o, s lub z.</p>' +
          '<h3>Długość słowa</h3><p>Graj słowami 4-, 5-, 6-, 7- lub 8-literowymi. Dotknij przycisku długości (na przykład <b>4 litery</b>) obok zegara i wybierz długość. Na telefonie przesuń kółko.</p>' +
          '<h3>Wygrana</h3><p>Gdy każda wskazówka to O, słowo jest odgadnięte. Znaki O zmieniają się w serca ❤️, a przy włączonym dźwięku słychać zwycięską melodię.</p>' +
          '<h3>Podpowiedzi 💡</h3><p>Nie wiesz, co dalej? Po 3. próbie (na poziomie Ekspert ⭐ po 4.) obok pola wpisywania pojawia się przycisk z żarówką. Każda podpowiedź odkrywa jeszcze jedną literę tajnego słowa, w losowym miejscu, które jest jeszcze nieodgadnięte, i kosztuje kredyt na podpowiedzi (zobacz ⚙ › Kredyty na podpowiedzi: darmowe kredyty codziennie, więcej za wysokie wyniki). Gra nigdy nie zdradza całego słowa: zawsze zostaje ci co najmniej jedna litera. Każda podpowiedź liczy się w wyniku jak 2 dodatkowe próby. Im więcej nieudanych prób, tym częściej przycisk się porusza, żeby przypomnieć, że jest.</p>' +
          '<h3>Pokaż słowo</h3><p>Naciśnij <b>Pokaż słowo</b> albo wpisz <code>pokaż</code> lub <code>reveal</code>, aby zobaczyć tajne słowo. Gra kończy się z wynikiem 0.</p>' +
          '<h3>Punktacja</h3><p>Im mniej prób potrzebujesz, tym wyższy wynik: punkty spadają wykładniczo z każdą dodatkową próbą. Mały bonus za szybkość (do 20%) nagradza szybkie gry.</p>' + c.scoreTable +
          '<p>Zapisywany jest tylko twój najlepszy wynik i najlepszy wynik wszech czasów; punkty się nie sumują.</p>' +
          '<h3>Polecenia</h3>' + c.commandTable + '<p>Polskie polecenia działają, gdy grasz po polsku; help, reveal i exit działają w każdym języku. Wielkość liter nie ma znaczenia.</p>' +
          '<h3>Gracze</h3><p>Od razu grasz jako <b>Anonim</b>. Jego rekord jest wspólny dla wszystkich, którzy grają na tym urządzeniu. Aby mieć własny rekord, dotknij <b>Zaloguj</b> i wpisz swoją nazwę albo utwórz nową. Nazwy użyte wcześniej są tam wymienione, więc ponowne logowanie to jedno dotknięcie. W tym samym oknie możesz też wybrać grę bez zapisywania. Wyniki są przechowywane na tym urządzeniu.</p>' +
          '<h3>Ustawienia</h3><p>Przycisk ⚙ zawiera włącznik dźwięku (tykanie zegara, ton dla każdego O i ? oraz zwycięska melodia – tym okazalsza, im wyższy wynik), kolory tła, rozmiar tekstu (A+ / A−) i opcję, by przyjmować tylko słowa z listy słów.</p>' +
          '<h3>Nowa gra</h3><p>Po grze naciśnij <b>Nowa gra</b> albo wpisz <code>T</code>. Zmiana języka lub długości słowa w trakcie gry zaczyna nową grę po potwierdzeniu.</p>' +
          '<h3>Powrót do gier</h3><p>Naciśnij <b>Wyjdź</b>, przycisk Wstecz albo znak MBG w lewym górnym rogu, aby wrócić do listy gier. Niedokończona gra zostaje zachowana i trwa dalej, gdy wrócisz. Aby zamknąć aplikację, użyj przycisku ⏻ na ekranie startowym.</p>';
      },
      'help.scoreHead': ['Długość', 'Najwyższy wynik', 'Najniższy wynik'],
      'help.scoreRow': function (p) { return [p.length + ' ' + plPl(p.length, 'litera', 'litery', 'liter'), p.hiScore + ' przy ' + p.hiAttempt + ' ' + plPl(p.hiAttempt, 'próbie', 'próbach', 'próbach'), p.loScore + ' przy ' + p.loAttempt + ' ' + plPl(p.loAttempt, 'próbie', 'próbach', 'próbach')]; },
      'help.cmdHead': ['Wpisz', 'Co się dzieje'],
      'help.cmdRows': [
        ['pomoc · zasady · help', 'Otwiera tę instrukcję'],
        ['pokaż · reveal', 'Pokazuje tajne słowo (wynik 0)'],
        ['wyjdź · koniec · exit', 'Powrót do listy gier'],
        ['T / N', 'Po grze: zagraj jeszcze raz albo wróć do listy gier']
      ],
      'help.about': 'O grze',
      'opt.pool': 'Poziom',
      'level.title': 'Poziom',
      'level.normal': 'Normalny',
      'level.expert': 'Ekspert ⭐',
      'level.expertOn': 'Poziom ekspert: tajne słowa z całego słownika.',
      'level.normalOn': 'Poziom normalny: słowa codzienne.',
      'win.tryExpert': 'Za łatwo? Spróbuj poziomu Ekspert ⭐ – tajne słowa z całego słownika.',
      'win.expertBtn': 'Graj jako ekspert',
      'opt.poolHint': function (p) { return 'Normalny: słowa codzienne (' + p.everyday + ') · Ekspert: cały słownik (' + p.all + ').'; },
      'opt.poolEveryday': 'Normalny',
      'opt.poolAll': 'Ekspert ⭐',
      'toast.poolNext': 'Od następnej gry.',
      'about.sources': 'Słowniki: ENABLE i english-words (domena publiczna); słowniki LibreOffice dla języka albańskiego, bośniackiego, niemieckiego, hiszpańskiego, francuskiego, tureckiego, polskiego, portugalskiego (Brazylia) i arabskiego oraz słowa w alfabecie łacińskim sprawdzone pod kątem ijekawicy (otwarte licencje); Zemberek dla form podstawowych tureckich i Arramooz dla arabskich; FrequencyWords dla słów codziennych. Szczegóły: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Odgadnij słowo. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Działa bez internetu. Nie potrzeba konta: nazwy i wyniki zostają na tym telefonie. Subskrypcje są opłacane i zarządzane przez Google Play.',
      'about.privacyFree': 'Działa bez internetu. Za darmo, bez reklam i bez zakupów w aplikacji. Nazwy i wyniki zostają na tym telefonie.',
      'about.words': function (p) { return 'Słowa (codzienne / akceptowane): ' + p.list + '.'; },
    },
    pt: {
      'app.title': 'Adivinhe a palavra',
      'app.by': 'MBG Puzzles · da MBG',
      'lang.listName.en': 'inglesa',
      'lang.listName.sq': 'albanesa',
      'lang.listName.bs': 'bósnia',
      'lang.listName.de': 'alemã',
      'lang.listName.es': 'espanhola',
      'lang.listName.fr': 'francesa',
      'lang.listName.tr': 'turca',
      'lang.listName.pl': 'polonesa',
      'lang.listName.pt': 'portuguesa',
      'lang.listName.ar': 'árabe',

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
      'btn.reveal': 'Ver palavra',
      'btn.newGame': 'Nova partida',
      'btn.length': function (p) { return 'Mudar para ' + p.n + ' letras'; },
      'btn.close': 'Fechar',
      'aria.fontUp': 'Texto maior',
      'aria.fontDown': 'Texto menor',
      'aria.length': function (p) { return 'Tamanho da palavra: ' + p.n + ' letras. Alterar'; },
      'aria.history': 'Tabuleiro',
      'aria.user': function (p) { return 'Jogador: ' + p.name; },

      'status.anonymous': 'Anônimo',
      'status.noData': 'Sem salvar',
      'status.time': function (p) { return p.n + ' ' + pl(p.n, 'segundo', 'segundos'); },
      'len.chip': function (p) { return p.n + ' letras'; },

      'label.play': function (p) { return 'Digite uma palavra de ' + p.n + ' letras ou um comando'; },
      'label.yesno': 'Quer jogar outra partida? S/N',
      'ph.play': function (p) { return 'Palavra de ' + p.n + ' letras'; },
      'ph.yesno': 'Jogar de novo? S / N',

      'notice.storageUnavailable': 'Este navegador não deixa o jogo salvar pontuações.',
      'notice.loggedIn': function (p) { return 'Bem-vindo de volta, ' + p.name + '! Seu recorde: ' + p.best; },
      'notice.registered': function (p) { return 'Bem-vindo, ' + p.name + '!'; },
      'notice.noData': 'Jogando sem salvar',
      'notice.anonymous': 'Jogando como Anônimo',
      'notice.restored': 'Sua partida foi restaurada',
      'warn.empty': function (p) { return 'Digite uma palavra de ' + p.length + ' letras.'; },
      'reveal.what': 'a palavra inteira',
      'hint.btn': 'Dica',
      'hint.what': 'mais uma letra',
      'hint.shown': function (p) { return 'Dica ' + p.number + ': a letra ' + p.pos + ' é ' + p.ch; },
      'warn.noHint': 'Acabaram as dicas – o resto é com você.',
      'win.hints': function (p) { return 'Com ' + p.n + ' ' + pl(p.n, 'dica', 'dicas') + ' – cada uma conta como ' + p.k + ' tentativas na pontuação.'; },
      'warn.alpha': 'Só letras, por favor. Esta tentativa não contou.',
      'warn.length': function (p) { return 'Sua palavra tem ' + p.got + ' ' + pl(p.got, 'letra', 'letras') + '; esta partida pede ' + p.length + '. Não contou.'; },
      'warn.vocab': function (p) { return '“' + p.word + '” não está na lista de palavras. Não contou.'; },
      'warn.roundOver': 'Fim de jogo. Digite S para jogar de novo ou N para voltar aos jogos.',
      'warn.noWords': function (p) { return 'Não há palavras de ' + p.length + ' letras na lista ' + p.listName + '.'; },

      'win.title': 'PARABÉNS!',
      'win.titleName': function (p) { return 'PARABÉNS, ' + p.name + '!'; },
      'win.found': function (p) { return 'Você descobriu “' + p.word + '” em ' + p.attempts + ' ' + pl(p.attempts, 'tentativa', 'tentativas') + ' e ' + p.seconds + ' ' + pl(p.seconds, 'segundo', 'segundos') + '.'; },
      'win.luck': 'Que sorte! De primeira!',
      'score.label': 'Pontos',
      'score.yourBest': 'Seu recorde',
      'score.allTime': 'Recorde geral',
      'score.newBest': 'Novo recorde!',
      'score.newAllTime': 'Recorde de todos os tempos!',
      'score.notSaved': 'Não salvo',
      'reveal.text': 'Mais sorte na próxima!',
      'reveal.word': function (p) { return 'A palavra secreta era ' + p.word + '.'; },

      'dlg.cancel': 'Cancelar',
      'restart.title': 'Começar uma partida nova?',
      'restart.length': function (p) { return 'Mudar para palavras de ' + p.n + ' letras encerra esta partida. Ela não será pontuada.'; },
      'restart.language': 'Mudar o idioma encerra esta partida. Ela não será pontuada.',
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
      'opt.validate': 'Aceitar só palavras de verdade',
      'opt.validateHint': function (p) { return 'Cada tentativa precisa estar no dicionário (' + p.n + ' palavras neste idioma). Outras palavras não contam como tentativa.'; },
      'goodbye.title': 'Obrigado por jogar!',
      'goodbye.text': 'Esperamos que você tenha gostado do jogo. Volte logo para mais uma rodada!',
      'goodbye.sign': 'Um abraço da MBG · Merkur Beqiri Games',
      'goodbye.again': 'Jogar de novo',
      'goodbye.close': 'Agora você pode fechar esta janela.',
      'wheel.title': 'Tamanho da palavra',
      'wheel.done': 'Pronto',
      'wheel.item': function (p) { return p.n + ' letras'; },
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
      'legend.O': 'letra certa no lugar certo',
      'legend.Q': 'está na palavra, mas em outro lugar',
      'legend.X': 'não está na palavra',

      'help.html': function (c) {
        return '' +
          '<h3>O objetivo</h3><p>O computador sorteia uma palavra secreta da lista de palavras do idioma escolhido (português, inglês, albanês, bósnio, alemão, espanhol, francês, turco, polonês ou árabe). Descubra a palavra com o menor número de tentativas.</p>' +
          '<h3>Como ler as pistas</h3><p>Depois de cada tentativa, cada letra da sua palavra recebe uma pista, na mesma ordem:</p>' + c.legend +
          '<p class="example">Exemplo: a palavra secreta é PRAIA e você digita PAUSA → <code>O ? X X O</code></p>' +
          '<p class="example">As letras repetidas são contadas com cuidado. Palavra secreta PRAIA, tentativa PARAR → <code>O ? ? ? X</code>. PRAIA tem um R só: o primeiro R de PARAR recebe ?, e para o segundo não sobra nenhum, então ele recebe X.</p>' +
          '<h3>Como tentar</h3><p>Digite uma palavra com a quantidade exata de letras e toque em <b>Enviar</b> ou Enter. Maiúsculas e minúsculas tanto faz, e as letras podem se repetir. Palavras com o tamanho errado, ou com dígitos ou símbolos, não contam.</p>' +
          '<p class="example">Acentos e cedilha não contam: AÇÃO se joga como ACAO e CAFÉ como CAFE. Você pode digitar com ou sem acento.</p>' +
          '<h3>Tamanho da palavra</h3><p>Jogue com palavras de 4, 5, 6, 7 ou 8 letras. Toque no botão de tamanho (por exemplo <b>4 letras</b>) ao lado do relógio e escolha. No celular, gire a roda.</p>' +
          '<h3>Vencer</h3><p>Quando todas as pistas forem O, você descobriu a palavra. Os O viram corações ❤️ e, com o som ligado, toca a música da vitória.</p>' +
          '<h3>Dicas 💡</h3><p>Travou? Depois da 3ª tentativa (no nível Especialista ⭐, depois da 4ª), aparece um botão de lâmpada ao lado do campo. Cada dica revela mais uma letra da palavra secreta, num lugar sorteado que você ainda não descobriu, e custa um crédito de dica (veja ⚙ › Créditos de dicas: créditos grátis todo dia, mais com pontuações altas). O jogo nunca entrega a palavra inteira: sempre sobra pelo menos uma letra para você. Cada dica conta como 2 tentativas a mais na pontuação. Quanto mais tentativas erradas, mais vezes o botão balança para lembrar que está ali.</p>' +
          '<h3>Ver palavra</h3><p>Toque em <b>Ver palavra</b> ou digite <code>revelar</code> ou <code>reveal</code> para ver a palavra secreta. A partida termina com 0 pontos.</p>' +
          '<h3>Pontuação</h3><p>Quanto menos tentativas, maior a pontuação: os pontos caem exponencialmente a cada tentativa a mais. Um pequeno bônus de velocidade (até 20%) premia partidas rápidas.</p>' + c.scoreTable +
          '<p>Só a sua maior pontuação e o recorde geral ficam guardados; os pontos não se somam.</p>' +
          '<h3>Comandos</h3>' + c.commandTable + '<p>Os comandos em português funcionam enquanto você joga em português; help, reveal e exit funcionam em todos os idiomas. Maiúsculas e minúsculas tanto faz.</p>' +
          '<h3>Jogadores</h3><p>Você começa a jogar na hora como <b>Anônimo</b>. O recorde dele é compartilhado por todos que jogam neste aparelho. Para ter o seu próprio recorde, toque em <b>Entrar</b> e digite o seu nome de jogador, ou crie um novo. Os nomes que você já usou aparecem ali, então entrar de novo é um toque. Na mesma janela você também pode jogar sem salvar nada. As pontuações ficam neste aparelho.</p>' +
          '<h3>Configurações</h3><p>O botão ⚙ tem o interruptor de som (o tique-taque do relógio, um tom para cada O e ? e a música da vitória, mais grandiosa quanto maior a pontuação), as cores de fundo, o tamanho do texto (A+ / A−) e a opção de aceitar só palavras da lista.</p>' +
          '<h3>Nova partida</h3><p>Depois de uma partida, toque em <b>Nova partida</b> ou digite <code>S</code>. Mudar o idioma ou o tamanho da palavra durante uma partida começa uma nova depois que você confirmar.</p>' +
          '<h3>Voltar aos jogos</h3><p>Toque em <b>Sair</b>, no botão Voltar ou na marca MBG no canto superior esquerdo para voltar à lista de jogos. Uma partida não terminada fica guardada e continua quando você voltar. Para fechar o app, use o botão ⏻ na tela inicial.</p>';
      },
      'help.scoreHead': ['Tamanho', 'Maior pontuação', 'Menor pontuação'],
      'help.scoreRow': function (p) { return [p.length + ' letras', p.hiScore + ' com ' + p.hiAttempt + ' tentativas', p.loScore + ' com ' + p.loAttempt + ' tentativas']; },
      'help.cmdHead': ['Digite', 'O que faz'],
      'help.cmdRows': [
        ['ajuda · regras · help', 'Abre estas instruções'],
        ['revelar · reveal', 'Mostra a palavra secreta (0 pontos)'],
        ['sair · exit', 'Volta para a lista de jogos'],
        ['S / N', 'Depois de uma partida: jogar de novo ou voltar à lista de jogos']
      ],
      'help.about': 'Sobre',
      'opt.pool': 'Nível',
      'level.title': 'Nível',
      'level.normal': 'Normal',
      'level.expert': 'Especialista ⭐',
      'level.expertOn': 'Nível especialista: palavras secretas do dicionário inteiro.',
      'level.normalOn': 'Nível normal: palavras do dia a dia.',
      'win.tryExpert': 'Fácil demais? Experimente o nível Especialista ⭐ – palavras secretas do dicionário inteiro.',
      'win.expertBtn': 'Jogar como especialista',
      'opt.poolHint': function (p) { return 'Normal: ' + p.everyday + ' palavras do dia a dia · Especialista: ' + p.all + ' palavras do dicionário.'; },
      'opt.poolEveryday': 'Normal',
      'opt.poolAll': 'Especialista ⭐',
      'toast.poolNext': 'A partir da próxima partida.',
      'about.sources': 'Dicionários: ENABLE e english-words (domínio público); os dicionários do LibreOffice de albanês, bósnio, alemão, espanhol, francês, turco, polonês, português do Brasil e árabe, e palavras em alfabeto latino verificadas para o ijekaviano (licenças abertas); Zemberek para as formas básicas do turco e Arramooz para as do árabe; FrequencyWords para as palavras do dia a dia. Detalhes: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · Adivinhe a palavra. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'Funciona sem internet. Não precisa de conta: nomes e pontuações ficam neste celular. As assinaturas são pagas e gerenciadas pelo Google Play.',
      'about.privacyFree': 'Funciona sem internet. Grátis, sem anúncios e sem compras no app. Nomes e pontuações ficam neste celular.',
      'about.words': function (p) { return 'Palavras (do dia a dia / aceitas): ' + p.list + '.'; },
    },
    ar: {
      'app.title': 'خمّن الكلمة',
      'app.by': 'MBG Puzzles · من MBG',
      'lang.listName.en': 'الإنجليزية',
      'lang.listName.sq': 'الألبانية',
      'lang.listName.bs': 'البوسنية',
      'lang.listName.de': 'الألمانية',
      'lang.listName.es': 'الإسبانية',
      'lang.listName.fr': 'الفرنسية',
      'lang.listName.tr': 'التركية',
      'lang.listName.pl': 'البولندية',
      'lang.listName.pt': 'البرتغالية',
      'lang.listName.ar': 'العربية',

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
      'btn.reveal': 'اكشف الكلمة',
      'btn.newGame': 'لعبة جديدة',
      'btn.length': function (p) { return 'التبديل إلى كلمات من ' + p.n + ' حروف'; },
      'btn.close': 'إغلاق',
      'aria.fontUp': 'نص أكبر',
      'aria.fontDown': 'نص أصغر',
      'aria.length': function (p) { return 'طول الكلمة: ' + p.n + ' حروف. تغيير'; },
      'aria.history': 'لوحة اللعب',
      'aria.user': function (p) { return 'اللاعب: ' + p.name; },

      'status.anonymous': 'مجهول',
      'status.noData': 'دون حفظ',
      'status.time': function (p) { return arN(p.n, 'ثانية واحدة', 'ثانيتان', 'ثوانٍ', 'ثانية'); },
      'len.chip': function (p) { return p.n + ' حروف'; },

      'label.play': function (p) { return 'أدخل كلمة من ' + p.n + ' حروف أو أمرًا'; },
      'label.yesno': 'هل تريد لعبة أخرى؟ ن/ل',
      'ph.play': function (p) { return 'كلمة من ' + p.n + ' حروف'; },
      'ph.yesno': 'مرة أخرى؟ ن / ل',

      'notice.storageUnavailable': 'هذا المتصفح لا يسمح للعبة بحفظ النتائج.',
      'notice.loggedIn': function (p) { return 'أهلًا بعودتك يا ' + p.name + '! أفضل نتيجة لك: ' + p.best; },
      'notice.registered': function (p) { return 'أهلًا بك يا ' + p.name + '!'; },
      'notice.noData': 'اللعب دون حفظ',
      'notice.anonymous': 'تلعب باسم مجهول',
      'notice.restored': 'استُعيدت لعبتك',
      'warn.empty': function (p) { return 'اكتب كلمة من ' + p.length + ' حروف.'; },
      'reveal.what': 'الكلمة كاملة',
      'hint.btn': 'تلميح',
      'hint.what': 'حرفًا آخر',
      'hint.shown': function (p) { return 'التلميح ' + p.number + ': الحرف ' + p.pos + ' هو ' + p.ch; },
      'warn.noHint': 'لا مزيد من التلميحات – الباقي عليك.',
      'win.hints': function (p) { return 'مع ' + arN(p.n, 'تلميح واحد', 'تلميحين', 'تلميحات', 'تلميحًا') + ' – كل تلميح يُحسب في النتيجة كـ ' + arN(p.k, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة') + '.'; },
      'warn.alpha': 'الحروف فقط من فضلك. لم تُحتسب هذه المحاولة.',
      'warn.length': function (p) { return 'كلمتك فيها ' + arN(p.got, 'حرف واحد', 'حرفان', 'حروف', 'حرفًا') + '، وهذه اللعبة تحتاج ' + p.length + '. لم تُحتسب.'; },
      'warn.vocab': function (p) { return 'الكلمة «' + p.word + '» ليست في قائمة الكلمات. لم تُحتسب.'; },
      'warn.roundOver': 'انتهت اللعبة. اكتب ن لتلعب مرة أخرى أو ل لتعود إلى الألعاب.',
      'warn.noWords': function (p) { return 'لا توجد كلمات من ' + p.length + ' حروف في قائمة الكلمات ' + p.listName + '.'; },

      'win.title': 'تهانينا!',
      'win.titleName': function (p) { return 'تهانينا يا ' + p.name + '!'; },
      'win.found': function (p) { return 'وجدت «' + p.word + '» في ' + arN(p.attempts, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة') + ' و' + arN(p.seconds, 'ثانية واحدة', 'ثانيتين', 'ثوانٍ', 'ثانية') + '.'; },
      'win.luck': 'يا للحظ! من المحاولة الأولى!',
      'score.label': 'النتيجة',
      'score.yourBest': 'أفضل نتيجة لك',
      'score.allTime': 'أفضل نتيجة على الإطلاق',
      'score.newBest': 'رقم قياسي جديد!',
      'score.newAllTime': 'رقم قياسي مطلق!',
      'score.notSaved': 'غير محفوظة',
      'reveal.text': 'حظًا أوفر في المرة القادمة!',
      'reveal.word': function (p) { return 'كانت الكلمة السرية ' + p.word + '.'; },

      'dlg.cancel': 'إلغاء',
      'restart.title': 'بدء لعبة جديدة؟',
      'restart.length': function (p) { return 'التبديل إلى كلمات من ' + p.n + ' حروف ينهي هذه اللعبة، ولن تُحتسب لها نتيجة.'; },
      'restart.language': 'تغيير اللغة ينهي هذه اللعبة، ولن تُحتسب لها نتيجة.',
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
      'opt.validate': 'اقبل الكلمات الحقيقية فقط',
      'opt.validateHint': function (p) { return 'يجب أن تكون كل محاولة في القاموس (عدد الكلمات في هذه اللغة: ' + p.n + '). الكلمات الأخرى لا تُحسب محاولة.'; },
      'goodbye.title': 'شكرًا لأنك لعبت!',
      'goodbye.text': 'نتمنى أن تكون اللعبة قد أعجبتك. عُد قريبًا لجولة أخرى!',
      'goodbye.sign': 'مع أطيب التمنيات من MBG · Merkur Beqiri Games',
      'goodbye.again': 'العب مرة أخرى',
      'goodbye.close': 'يمكنك الآن إغلاق هذه النافذة.',
      'wheel.title': 'طول الكلمة',
      'wheel.done': 'تم',
      'wheel.item': function (p) { return p.n + ' حروف'; },
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
      'legend.O': 'حرف صحيح في المكان الصحيح',
      'legend.Q': 'موجود في الكلمة لكن في مكان آخر',
      'legend.X': 'غير موجود في الكلمة',

      'help.html': function (c) {
        return '' +
          '<h3>الهدف</h3><p>يختار الحاسوب كلمة سرية عشوائيًا من قائمة كلمات اللغة المختارة (العربية أو الإنجليزية أو الألبانية أو البوسنية أو الألمانية أو الإسبانية أو الفرنسية أو التركية أو البولندية أو البرتغالية). اعثر عليها بأقل عدد ممكن من المحاولات.</p>' +
          '<h3>قراءة الدلائل</h3><p>بعد كل محاولة، يحصل كل حرف من كلمتك على دليل، بالترتيب نفسه من اليمين إلى اليسار:</p>' + c.legend +
          '<p class="example">مثال: الكلمة السرية كتاب، وأنت تكتب كاتب ← <code>ك O · ا ? · ت ? · ب O</code></p>' +
          '<p class="example">الحروف المكررة تُعدّ بعناية. الكلمة السرية مدرسة، والمحاولة مسرور ← <code>م O · س ? · ر O · و X · ر X</code>. في مدرسة راء واحدة فقط، وقد وجدتها الراء الثالثة في مكانها، فلا يبقى شيء للراء الأخيرة وتأخذ X.</p>' +
          '<h3>كيف تخمّن</h3><p>اكتب كلمة بعدد الحروف المطلوب تمامًا واضغط <b>تحقّق</b> أو Enter. يمكن أن تتكرر الحروف. لا تُحتسب الكلمات ذات الطول الخطأ، أو التي فيها أرقام أو رموز.</p>' +
          '<p class="example">تظهر الحروف منفصلة، كل حرف في مربع. الهمزة على الألف أو تحتها والمدّة لا تُحسب: أ وإ وآ كلها ا، والتشكيل (الفتحة والضمة والكسرة والسكون والشدة) لا يُحسب أيضًا. أما ء وؤ وئ وة وى فهي حروف قائمة بذاتها: ة ليست ه، وى ليست ي.</p>' +
          '<h3>طول الكلمة</h3><p>العب بكلمات من 4 أو 5 أو 6 أو 7 أو 8 حروف. اضغط زر الطول (مثلًا <b>4 حروف</b>) بجانب الساعة واختر الطول. على الهاتف، اسحب العجلة.</p>' +
          '<h3>الفوز</h3><p>عندما تكون كل الدلائل O تكون قد وجدت الكلمة. تتحول علامات O إلى قلوب ❤️، ومع تشغيل الصوت تسمع لحن الفوز.</p>' +
          '<h3>التلميحات 💡</h3><p>توقفت؟ بعد محاولتك الثالثة (وفي مستوى خبير ⭐ بعد الرابعة) يظهر زر المصباح بجانب خانة الإدخال. كل تلميح يكشف حرفًا آخر من الكلمة السرية، في مكان عشوائي لم تجده بعد، ويكلّف وحدة من رصيد التلميحات (انظر ⚙ › رصيد التلميحات: وحدات مجانية كل يوم، والمزيد مع النتائج العالية). لا تكشف اللعبة الكلمة كاملة أبدًا: يبقى لك حرف واحد على الأقل. كل تلميح يُحسب في النتيجة كمحاولتين إضافيتين. وكلما فشلت محاولات أكثر، اهتز الزر أكثر ليذكّرك بوجوده.</p>' +
          '<h3>اكشف الكلمة</h3><p>اضغط <b>اكشف الكلمة</b>، أو اكتب <code>اكشف</code> أو <code>reveal</code>، لترى الكلمة السرية. تنتهي اللعبة بنتيجة 0.</p>' +
          '<h3>النتيجة</h3><p>كلما قلّت محاولاتك ارتفعت نتيجتك: تنخفض النقاط بشكل أُسّي مع كل محاولة إضافية. ومكافأة سرعة صغيرة (حتى 20%) تكافئ الألعاب السريعة.</p>' + c.scoreTable +
          '<p>لا يُحفظ إلا أفضل نتيجة لك وأفضل نتيجة على الإطلاق؛ النقاط لا تُجمع.</p>' +
          '<h3>الأوامر</h3>' + c.commandTable + '<p>الأوامر العربية تعمل ما دمت تلعب بالعربية؛ أما help وreveal وexit فتعمل بكل اللغات.</p>' +
          '<h3>اللاعبون</h3><p>تبدأ اللعب فورًا باسم <b>مجهول</b>. وأفضل نتيجة له مشتركة بين كل من يلعب على هذا الجهاز. لتحتفظ بأفضل نتيجة خاصة بك، اضغط <b>دخول</b> واكتب اسم لاعبك أو أنشئ اسمًا جديدًا. الأسماء التي استُخدمت من قبل تظهر هناك، فالدخول مرة أخرى بلمسة واحدة. ومن النافذة نفسها يمكنك أيضًا اللعب دون حفظ أي شيء. تُحفظ النتائج على هذا الجهاز.</p>' +
          '<h3>الإعدادات</h3><p>زر ⚙ فيه مفتاح الصوت (تكتكة الساعة، ونغمة لكل O و?، ولحن الفوز الذي يزداد فخامة كلما ارتفعت النتيجة)، وألوان الخلفية، وحجم النص (A+ / A−)، وخيار قبول كلمات القائمة فقط.</p>' +
          '<h3>لعبة جديدة</h3><p>بعد اللعبة اضغط <b>لعبة جديدة</b> أو اكتب <code>ن</code>. تغيير اللغة أو طول الكلمة أثناء اللعبة يبدأ لعبة جديدة بعد التأكيد.</p>' +
          '<h3>العودة إلى الألعاب</h3><p>اضغط <b>خروج</b> أو زر الرجوع أو شعار MBG في الأعلى للعودة إلى قائمة الألعاب. اللعبة غير المكتملة تبقى محفوظة وتتابع عند عودتك. لإغلاق التطبيق استخدم زر ⏻ في الشاشة الرئيسية.</p>';
      },
      'help.scoreHead': ['الطول', 'أعلى نتيجة', 'أدنى نتيجة'],
      'help.scoreRow': function (p) { return [p.length + ' حروف', p.hiScore + ' مع ' + arN(p.hiAttempt, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة'), p.loScore + ' مع ' + arN(p.loAttempt, 'محاولة واحدة', 'محاولتين', 'محاولات', 'محاولة')]; },
      'help.cmdHead': ['اكتب', 'ماذا يحدث'],
      'help.cmdRows': [
        ['مساعدة · قواعد · help', 'يفتح هذه التعليمات'],
        ['اكشف · reveal', 'يعرض الكلمة السرية (النتيجة 0)'],
        ['خروج · exit', 'العودة إلى قائمة الألعاب'],
        ['ن / ل', 'بعد اللعبة: العب مرة أخرى أو عُد إلى قائمة الألعاب']
      ],
      'help.about': 'حول اللعبة',
      'opt.pool': 'المستوى',
      'level.title': 'المستوى',
      'level.normal': 'عادي',
      'level.expert': 'خبير ⭐',
      'level.expertOn': 'مستوى الخبير: كلمات سرية من القاموس كله.',
      'level.normalOn': 'المستوى العادي: كلمات يومية.',
      'win.tryExpert': 'سهلة جدًا؟ جرّب مستوى الخبير ⭐ – كلمات سرية من القاموس كله.',
      'win.expertBtn': 'العب كخبير',
      'opt.poolHint': function (p) { return 'عادي: الكلمات اليومية (' + p.everyday + ') · خبير: القاموس كله (' + p.all + ').'; },
      'opt.poolEveryday': 'عادي',
      'opt.poolAll': 'خبير ⭐',
      'toast.poolNext': 'ابتداءً من اللعبة القادمة.',
      'about.sources': 'القواميس: ENABLE وenglish-words (ملكية عامة)؛ قواميس LibreOffice للألبانية والبوسنية والألمانية والإسبانية والفرنسية والتركية والبولندية والبرتغالية البرازيلية والعربية (آية سبل)، وكلمات بالحروف اللاتينية رُوجعت للنطق الإيكافي (رخص مفتوحة)؛ Zemberek للصيغ الأساسية في التركية وعرموز (Arramooz) للعربية؛ FrequencyWords للكلمات اليومية. التفاصيل: words/LICENSES.txt.',
      'about.version': 'MBG Puzzles 1.0 · خمّن الكلمة. © 2026 MBG · Merkur Beqiri Games.',
      'about.privacy': 'تعمل دون إنترنت. لا حاجة إلى حساب: الأسماء والنتائج تبقى على هذا الهاتف. تُدفع الاشتراكات وتُدار عبر Google Play.',
      'about.privacyFree': 'تعمل دون إنترنت. مجانية، بلا إعلانات وبلا مشتريات داخل التطبيق. الأسماء والنتائج تبقى على هذا الهاتف.',
      'about.words': function (p) { return 'الكلمات (اليومية / المقبولة): ' + p.list + '.'; },
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

