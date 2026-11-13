/*!
 * MBG Who Am I? - the words the game understands, in English, Albanian, German and Bosnian.
 *
 * Questions are typed freely ("Am I a woman?", "A kam lindur para vitit 1950?", "Komme ich aus
 * Europa?", "Jesam li glumac?"). The question engine (questions.js) looks for the words below in
 * the question - in the playing language and in English - and turns them into facts it can check.
 *
 * How a word is written here (after MBG.WhoText.norm: lower case, no accents, ë = e, č = c, ß = ss,
 * đ = dj, ä = a, ö = o, ü = u):
 *   word      the whole word only          ("man" is not "manager")
 *   stem*     any word that starts so      ("gjerman*" = gjermane, Gjermania, gjermanisë ...)
 *   a b*      words next to each other     ("north america*")
 *   terms are separated by "|".
 *
 * TAGS: kinds of things, professions, genres, sports and prizes. Each has
 *   dim  - what it describes: 'kind' (what something is), 'occ' (a person's profession),
 *          'genre' (of a work), 'topic' (sport, prize ...) - decides between No and Unknown
 *   lex  - the words per language
 *   q    - how the computer asks about it, per language [en, sq, de, bs]
 * COUNTRIES: ISO code, continents, Wikidata id, names [en, sq, de, bs] and extra words.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoLex = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var LANGS = ['en', 'sq', 'de', 'bs'];

  function T(dim, en, sq, de, bs, q) { return { dim: dim, lex: { en: en, sq: sq, de: de, bs: bs }, q: q }; }

  var TAGS = {
    /* ------------------------------------------------------------ kinds --- */
    person: T('kind', 'person*|human*|someone|real person', 'person*|njeri|njeriu|qenie njerezore', 'mensch|person*', 'osoba|osobu|osobom|covjek*|ljudsk* bic*|licnost*',
      ['Am I a person?', 'A jam njeri?', 'Bin ich ein Mensch?', 'Jesam li osoba?']),
    film: T('kind', 'film|films|movie*|motion picture', 'film|filmi|filmin|filmat', 'film|films|filme|kinofilm*|spielfilm*', 'film|filma|filmu|filmom|filmovi*',
      ['Am I a film?', 'A jam film?', 'Bin ich ein Film?', 'Jesam li film?']),
    tv: T('kind', 'tv|television|series|serial*|tv show|show', 'serial*|seri|seria|seriali|televiziv*|emision*', 'serie|serien|fernseh*|tv serie*|show', 'serija|seriju|serije|tv|televizijsk*',
      ['Am I a TV series?', 'A jam serial televiziv?', 'Bin ich eine Fernsehserie?', 'Jesam li TV serija?']),
    book: T('kind', 'book*|novel*', 'liber*|liber|roman|romani|romanin|veper letrare', 'buch|bucher|roman|romane', 'knjig*|roman|romana|romanu',
      ['Am I a book?', 'A jam libër?', 'Bin ich ein Buch?', 'Jesam li knjiga?']),
    poem: T('kind', 'poem*|poetry', 'poezi*|poeme', 'gedicht*|poesie', 'poema|poemu|poezij*',
      ['Am I a poem?', 'A jam poezi?', 'Bin ich ein Gedicht?', 'Jesam li poema?']),
    art: T('kind', 'art|artwork*|work of art|works of art', 'art|veper arti|vepra arti', 'kunstwerk*|kunst', 'umjetnick* djel*|umjetnost*',
      ['Am I a work of art?', 'A jam vepër arti?', 'Bin ich ein Kunstwerk?', 'Jesam li umjetničko djelo?']),
    painting: T('kind', 'painting*|picture', 'piktur*|tablo*', 'gemalde|bild', 'slik*',
      ['Am I a painting?', 'A jam pikturë?', 'Bin ich ein Gemälde?', 'Jesam li slika?']),
    sculpture: T('kind', 'sculpture*|statue*', 'skulptur*|statuj*', 'skulptur*|statue*|plastik', 'skulptur*|kip|kipa|statu*',
      ['Am I a sculpture?', 'A jam skulpturë?', 'Bin ich eine Skulptur?', 'Jesam li skulptura?']),
    game: T('kind', 'game|games', 'loje|loja|lojen|lojra*|lojerat', 'spiel|spiele|spielen', 'igra|igru|igre|igrom',
      ['Am I a game?', 'A jam lojë?', 'Bin ich ein Spiel?', 'Jesam li igra?']),
    videogame: T('kind', 'video game*|videogame*|computer game*', 'loje video|videoloj*|loje kompjuterike', 'videospiel*|computerspiel*', 'video igr*|videoigr*|kompjutersk* igr*',
      ['Am I a video game?', 'A jam lojë video?', 'Bin ich ein Videospiel?', 'Jesam li video igra?']),
    boardgame: T('kind', 'board game*|boardgame*|table game*', 'loje tavoline*|loje me tabel*', 'brettspiel*|gesellschaftsspiel*', 'drustven* igr*|igr* na tabli',
      ['Am I a board game?', 'A jam lojë tavoline?', 'Bin ich ein Brettspiel?', 'Jesam li društvena igra?']),
    song: T('kind', 'song*|track|single', 'kenge|kenga|kengen|kenget|kengeve', 'lied|lieder|song*|titel', 'pjesm*|singl*',
      ['Am I a song?', 'A jam këngë?', 'Bin ich ein Lied?', 'Jesam li pjesma?']),
    album: T('kind', 'album*|record', 'album*', 'album*', 'album*',
      ['Am I an album?', 'A jam album?', 'Bin ich ein Album?', 'Jesam li album?']),
    band: T('kind', 'band|bands|group|music group|duo', 'grup*|grup muzikor*|bend*|banda', 'band|bands|gruppe|musikgruppe|duo', 'bend*|grupa|grupu|grupe|sastav*',
      ['Am I a band or group?', 'A jam grup muzikor?', 'Bin ich eine Band?', 'Jesam li bend?']),
    sport: T('kind', 'sport|sports', 'sport|sporti|sportin|sporte*', 'sport|sportart*', 'sport|sporta|sportu',
      ['Am I a sport?', 'A jam sport?', 'Bin ich eine Sportart?', 'Jesam li sport?']),
    competition: T('kind', 'competition*|tournament*|championship*|cup|league|olympic*', 'kampionat*|turne*|gar*|kupa|kupe|kup|lig*|olimpi*', 'wettbewerb*|turnier*|meisterschaft*|pokal*|liga|olympisch*|olympia*', 'takmicen*|turnir*|prvenstv*|kup|kupa|lig*|olimpij*',
      ['Am I a competition?', 'A jam garë apo kampionat?', 'Bin ich ein Wettbewerb?', 'Jesam li takmičenje?']),
    invention: T('kind', 'invention*|invented|device*|machine*|tool*', 'shpikj*|pajisj*|makin*|vegel*', 'erfindung*|gerat*|maschine*|werkzeug*', 'izum*|uredjaj*|masin*|alat*',
      ['Am I an invention?', 'A jam shpikje?', 'Bin ich eine Erfindung?', 'Jesam li izum?']),
    theory: T('kind', 'theory|theories|law of', 'teori*|ligj*', 'theorie*|gesetz*', 'teorij*|zakon*',
      ['Am I a theory?', 'A jam teori?', 'Bin ich eine Theorie?', 'Jesam li teorija?']),
    discovery: T('kind', 'discover*', 'zbulim*|zbuluar', 'entdeck*', 'otkric*|otkriven*',
      ['Am I a discovery?', 'A jam zbulim?', 'Bin ich eine Entdeckung?', 'Jesam li otkriće?']),
    technology: T('kind', 'technolog*|electronic*|computer*|digital', 'teknologj*|elektronik*|kompjuter*|digjital*', 'technolog*|technik|elektronik*|computer*|digital*', 'tehnolog*|elektronik*|kompjuter*|racunar*|digital*',
      ['Am I a technology?', 'A jam teknologji?', 'Bin ich eine Technologie?', 'Jesam li tehnologija?']),
    place: T('kind', 'place|location|geograph*', 'vend|vendi|vendndodhj*|gjeografi*', 'ort|orte|geograf*', 'mjesto|mjesta|lokacij*|geograf*',
      ['Am I a place?', 'A jam vend gjeografik?', 'Bin ich ein Ort?', 'Jesam li mjesto?']),
    country: T('kind', 'country|countries|state|nation*|kingdom|republic', 'shtet*|komb|kombi|kombit|mbreteri*|republik*', 'land|lander|staat*|nation*|konigreich*|republik*', 'drzav*|zemlj*|nacij*|kraljevin*|republik*',
      ['Am I a country?', 'A jam shtet?', 'Bin ich ein Land?', 'Jesam li država?']),
    city: T('kind', 'city|cities|town*', 'qytet*', 'stadt|stadte|grossstadt', 'grad|grada|gradu|gradom|gradovi*',
      ['Am I a city?', 'A jam qytet?', 'Bin ich eine Stadt?', 'Jesam li grad?']),
    capital: T('kind', 'capital*', 'kryeqytet*', 'hauptstadt*', 'glavn* grad*|prijestolnic*',
      ['Am I a capital city?', 'A jam kryeqytet?', 'Bin ich eine Hauptstadt?', 'Jesam li glavni grad?']),
    river: T('kind', 'river*|stream', 'lum*', 'fluss|flusse|strom|ström', 'rijek*|rijec*',
      ['Am I a river?', 'A jam lumë?', 'Bin ich ein Fluss?', 'Jesam li rijeka?']),
    lake: T('kind', 'lake*', 'liqen*', 'see|seen|binnensee', 'jezer*',
      ['Am I a lake?', 'A jam liqen?', 'Bin ich ein See?', 'Jesam li jezero?']),
    island: T('kind', 'island*|isle*', 'ishull*', 'insel*', 'ostrv*|otok*',
      ['Am I an island?', 'A jam ishull?', 'Bin ich eine Insel?', 'Jesam li ostrvo?']),
    mountain: T('kind', 'mountain*|peak*|mount|summit|volcano*', 'mal|mali|malin|male|malet|maj*|vullkan*', 'berg|berge|gipfel|vulkan*|gebirge', 'planin*|vrh|vrha|brdo|vulkan*',
      ['Am I a mountain?', 'A jam mal?', 'Bin ich ein Berg?', 'Jesam li planina?']),
    park: T('kind', 'park|parks|national park*|nature reserve', 'park*|park kombetar*|parku kombetar*', 'park|parks|nationalpark*|naturpark*', 'park|parka|parku|nacionaln* park*',
      ['Am I a national park?', 'A jam park kombëtar?', 'Bin ich ein Nationalpark?', 'Jesam li nacionalni park?']),
    landmark: T('kind', 'building*|tower*|monument*|landmark*|bridge*|structure', 'ndertes*|kull*|monument*|ure|ura|uren', 'gebaude*|turm|turme|denkmal*|bauwerk*|brucke*|wahrzeichen', 'zgrad*|toranj|tornj*|spomenik*|most|mosta|gradjevin*',
      ['Am I a building or monument?', 'A jam ndërtesë apo monument?', 'Bin ich ein Bauwerk?', 'Jesam li građevina ili spomenik?']),
    university: T('kind', 'universit*|college*|school*|academ*|institut*', 'universitet*|kolegj*|shkoll*|akademi*|institut*', 'universitat*|hochschul*|college|schule|akademie*|institut*', 'univerzitet*|sveucilist*|fakultet*|skol*|akademij*|institut*',
      ['Am I a university?', 'A jam universitet?', 'Bin ich eine Universität?', 'Jesam li univerzitet?']),
    museum: T('kind', 'museum*|gallery', 'muze*|galeri*', 'museum*|museen|galerie*', 'muzej*|galerij*',
      ['Am I a museum?', 'A jam muze?', 'Bin ich ein Museum?', 'Jesam li muzej?']),
    event: T('kind', 'event*|happening|happened', 'ngjarj*|ndodhi', 'ereignis*|geschehen|geschah', 'dogadj*|desilo|dogodilo',
      ['Am I an event?', 'A jam ngjarje?', 'Bin ich ein Ereignis?', 'Jesam li događaj?']),
    battle: T('kind', 'battle*|siege*', 'betej*|rrethim*', 'schlacht*|belagerung*', 'bitk*|bitci|opsad*',
      ['Am I a battle?', 'A jam betejë?', 'Bin ich eine Schlacht?', 'Jesam li bitka?']),
    war: T('any', 'war|wars|war film', 'lufte|lufta|luften|luftera*', 'krieg*|kriegsfilm*', 'rat|rata|ratu|ratom|ratovi*|ratni*',
      ['Am I connected with a war?', 'A jam i lidhur me një luftë?', 'Habe ich mit einem Krieg zu tun?', 'Jesam li povezan s ratom?']),
    treaty: T('kind', 'treat*|agreement*|peace|accord*|pact', 'traktat*|marreveshj*|paqe*|pakt*', 'vertrag*|abkommen*|frieden*|pakt*', 'ugovor*|sporazum*|mir|mira|miru|pakt*',
      ['Am I a treaty or agreement?', 'A jam traktat apo marrëveshje?', 'Bin ich ein Vertrag?', 'Jesam li ugovor ili sporazum?']),
    empire: T('kind', 'empire*|kingdom*|dynasty', 'perandori*|mbreteri*|dinasti*', 'reich|reiches|imperium|kaiserreich|konigreich*|dynastie*', 'carstv*|imperij*|kraljevstv*|kraljevin*|dinastij*',
      ['Am I an empire?', 'A jam perandori?', 'Bin ich ein Reich?', 'Jesam li carstvo?']),
    civilization: T('kind', 'civili*|ancient culture', 'qyteterim*|civilizim*', 'zivilisation*|hochkultur*', 'civilizacij*',
      ['Am I a civilization?', 'A jam qytetërim?', 'Bin ich eine Zivilisation?', 'Jesam li civilizacija?']),
    revolution: T('kind', 'revolution*|uprising*|independence', 'revolucion*|kryengritj*|pavaresi*', 'revolution*|aufstand*|unabhangigkeit*', 'revolucij*|ustan*|nezavisnost*',
      ['Am I a revolution or a declaration of independence?', 'A jam revolucion apo shpallje pavarësie?', 'Bin ich eine Revolution oder Unabhängigkeit?', 'Jesam li revolucija ili proglašenje nezavisnosti?']),

    /* ------------------------------------------------------- professions --- */
    actor: T('occ', 'actor*|actress*|film star|movie star', 'aktor*|aktore*|aktrim', 'schauspiel*|darsteller*|filmstar*', 'glum*',
      ['Am I an actor or actress?', 'A jam aktor ose aktore?', 'Bin ich Schauspieler(in)?', 'Jesam li glumac ili glumica?']),
    director: T('occ', 'director*|film director*|filmmaker*', 'regjisor*', 'regisseur*|filmemacher*', 'reziser*|redatelj*|filmsk* reziser*',
      ['Am I a film director?', 'A jam regjisor?', 'Bin ich Regisseur(in)?', 'Jesam li režiser?']),
    screenwriter: T('occ', 'screenwriter*|scriptwriter*', 'skenarist*', 'drehbuch*', 'scenarist*',
      ['Am I a screenwriter?', 'A jam skenarist?', 'Bin ich Drehbuchautor(in)?', 'Jesam li scenarista?']),
    comedian: T('occ', 'comedian*|comic', 'komedian*|humorist*', 'komiker*|comedian*', 'komicar*|komedijas*',
      ['Am I a comedian?', 'A jam komedian?', 'Bin ich Komiker(in)?', 'Jesam li komičar?']),
    singer: T('occ', 'singer*|vocalist*|pop star|rapper*', 'kengetar*|kengetare|reper*', 'sanger*|rapper*', 'pjevac*|pjevacic*|reper*',
      ['Am I a singer?', 'A jam këngëtar ose këngëtare?', 'Bin ich Sänger(in)?', 'Jesam li pjevač ili pjevačica?']),
    musician: T('occ', 'musician*|music|pianist*|guitarist*|rock|rockstar|pop|classical music', 'muzik*|muzikant*|pianist*|kitarist*', 'musik*|pianist*|gitarrist*', 'muzi*|pijanist*|gitarist*',
      ['Am I connected with music?', 'A jam i lidhur me muzikën?', 'Habe ich mit Musik zu tun?', 'Jesam li povezan s muzikom?']),
    composer: T('occ', 'composer*', 'kompozitor*', 'komponist*', 'kompozitor*',
      ['Am I a composer?', 'A jam kompozitor?', 'Bin ich Komponist(in)?', 'Jesam li kompozitor?']),
    writer: T('occ', 'writer*|novelist*|playwright*|author*|literature|literary', 'shkrimtar*|romancier*|dramaturg*|autor*|letersi*', 'schriftsteller*|dramatiker*|autor*|literatur*', 'pisac|pisca|piscem|knjizevnik*|knjizevnost*|dramaturg*|autor*',
      ['Am I a writer?', 'A jam shkrimtar?', 'Bin ich Schriftsteller(in)?', 'Jesam li pisac?']),
    poet: T('occ', 'poet*', 'poet*|poete*', 'dichter*|lyriker*|poet*', 'pjesnik*|pjesnikinj*',
      ['Am I a poet?', 'A jam poet?', 'Bin ich Dichter(in)?', 'Jesam li pjesnik?']),
    painter: T('occ', 'painter*', 'piktor*', 'maler*', 'slikar*',
      ['Am I a painter?', 'A jam piktor?', 'Bin ich Maler(in)?', 'Jesam li slikar?']),
    artist: T('occ', 'artist*', 'artist*|art|arti|artin|artit', 'kunstler*', 'umjetni*',
      ['Am I an artist?', 'A jam artist?', 'Bin ich Künstler(in)?', 'Jesam li umjetnik?']),
    sculptor: T('occ', 'sculptor*', 'skulptor*', 'bildhauer*', 'kipar*|skulptor*',
      ['Am I a sculptor?', 'A jam skulptor?', 'Bin ich Bildhauer(in)?', 'Jesam li kipar?']),
    scientist: T('occ', 'scien*|researcher*', 'shkencetar*|shkenc*|studiues*', 'wissenschaft*|forscher*', 'naucni*|naucnic*|nauci|znanstven*|znanost*|nauk*',
      ['Am I a scientist?', 'A jam shkencëtar?', 'Bin ich Wissenschaftler(in)?', 'Jesam li naučnik?']),
    physicist: T('occ', 'physic*', 'fizik*|fizikan*', 'physik*', 'fizicar*|fizik*',
      ['Am I a physicist?', 'A jam fizikant?', 'Bin ich Physiker(in)?', 'Jesam li fizičar?']),
    chemist: T('occ', 'chemist*', 'kimist*|kimi*', 'chemiker*|chemie', 'hemicar*|kemicar*|hemij*|kemij*',
      ['Am I a chemist?', 'A jam kimist?', 'Bin ich Chemiker(in)?', 'Jesam li hemičar?']),
    mathematician: T('occ', 'mathemat*|math', 'matematik*', 'mathemat*', 'matematic*|matematik*',
      ['Am I a mathematician?', 'A jam matematikan?', 'Bin ich Mathematiker(in)?', 'Jesam li matematičar?']),
    biologist: T('occ', 'biolog*|naturalist*', 'biolog*|natyralist*', 'biolog*|naturforscher*', 'biolog*|prirodnjak*',
      ['Am I a biologist?', 'A jam biolog?', 'Bin ich Biologe/Biologin?', 'Jesam li biolog?']),
    astronomer: T('occ', 'astronom*', 'astronom*', 'astronom*', 'astronom*',
      ['Am I an astronomer?', 'A jam astronom?', 'Bin ich Astronom(in)?', 'Jesam li astronom?']),
    inventor: T('occ', 'inventor*', 'shpikes*', 'erfinder*', 'izumitelj*|pronalazac*',
      ['Am I an inventor?', 'A jam shpikës?', 'Bin ich Erfinder(in)?', 'Jesam li izumitelj?']),
    philosopher: T('occ', 'philosoph*', 'filozof*', 'philosoph*', 'filozof*',
      ['Am I a philosopher?', 'A jam filozof?', 'Bin ich Philosoph(in)?', 'Jesam li filozof?']),
    politician: T('occ', 'politic*|president*|prime minister|statesm*', 'politik*|president*|kryeminist*|burr shteti', 'politik*|prasident*|kanzler*|staatsmann', 'politicar*|predsjednik*|premijer*|drzavnik*',
      ['Am I a politician?', 'A jam politikan?', 'Bin ich Politiker(in)?', 'Jesam li političar?']),
    ruler: T('occ', 'king*|queen*|emperor*|empress*|ruler*|pharaoh*|monarch*|sultan*|prince*|princess*', 'mbret*|perandor*|sundimtar*|faraon*|monark*|sulltan*|princ*|princesh*', 'konig*|kaiser*|herrscher*|pharao*|monarch*|sultan*|prinz*|prinzessin*', 'kralj*|car|cara|carica|vladar*|faraon*|monarh*|sultan*|princ*',
      ['Am I a ruler, king or queen?', 'A jam sundimtar, mbret apo mbretëreshë?', 'Bin ich Herrscher(in), König(in)?', 'Jesam li vladar, kralj ili kraljica?']),
    athlete: T('occ', 'athlet*|sportsm*|sportswom*|player*|runner*|sprinter*|footballer*|olympian*', 'atlet*|sportist*|lojtar*|vrapues*|futbollist*', 'sportler*|athlet*|spieler*|laufer*|sprinter*|fussballer*', 'sportist*|sportas*|atletica*|igrac*|trkac*|sprinter*|fudbaler*|nogometas*',
      ['Am I an athlete?', 'A jam sportist?', 'Bin ich Sportler(in)?', 'Jesam li sportista?']),
    explorer: T('occ', 'explorer*|navigator*|sailor*|astronaut*', 'eksplorues*|lundertar*|astronaut*', 'entdecker*|seefahrer*|astronaut*', 'istrazivac*|moreplovac*|astronaut*',
      ['Am I an explorer?', 'A jam eksplorues?', 'Bin ich Entdecker(in)?', 'Jesam li istraživač?']),

    /* ------------------------------------------------------------ genres --- */
    comedy: T('genre', 'comed*|funny|humor*', 'komedi*|humor*', 'komodie*|comedy|humor*|lustig', 'komedij*|humor*|smijesn*',
      ['Am I a comedy?', 'A jam komedi?', 'Bin ich eine Komödie?', 'Jesam li komedija?']),
    drama: T('genre', 'drama*|dramatic', 'drama|drame|dramen|dramat|dramatik*|dramave', 'drama*|dramatisch*', 'drama*|dramsk*',
      ['Am I a drama?', 'A jam dramë?', 'Bin ich ein Drama?', 'Jesam li drama?']),
    horror: T('genre', 'horror*|scary', 'horror*|tmerr*', 'horror*|grusel*', 'horor*|strav*',
      ['Am I a horror story?', 'A jam horror?', 'Bin ich ein Horrorfilm?', 'Jesam li horor?']),
    action: T('genre', 'action', 'aksion*', 'action*', 'akcij*|akcion*',
      ['Am I an action film?', 'A jam film aksion?', 'Bin ich ein Actionfilm?', 'Jesam li akcioni film?']),
    thriller: T('genre', 'thriller*|suspense', 'thriller*|triler*', 'thriller*|spannung*', 'triler*|thriller*',
      ['Am I a thriller?', 'A jam thriller?', 'Bin ich ein Thriller?', 'Jesam li triler?']),
    scifi: T('genre', 'science fiction|sci fi|scifi|space', 'fantastiko shkencor*|shkencor fantastik*|sci fi|hapesir*', 'science fiction|sci fi|scifi|weltraum*', 'naucn* fantastik*|znanstven* fantastik*|sci fi|svemir*',
      ['Am I science fiction?', 'A jam fantastiko-shkencor?', 'Bin ich Science-Fiction?', 'Jesam li naučna fantastika?']),
    romance: T('genre', 'romanc*|romantic*|love story|love', 'romantik*|dashuri*', 'romantik*|romanze*|liebe*', 'romanticn*|romans*|ljubav*|ljubavn*',
      ['Am I a love story?', 'A jam histori dashurie?', 'Bin ich eine Liebesgeschichte?', 'Jesam li ljubavna priča?']),
    fantasy: T('genre', 'fantasy|magic*|wizard*|dragon*', 'fantazi*|magji*|magjistar*|dragua*', 'fantasy|magie|magisch*|zauber*|drache*', 'fantazij*|fantastik*|magij*|carobnj*|zmaj*',
      ['Am I fantasy?', 'A jam fantazi?', 'Bin ich Fantasy?', 'Jesam li fantastika?']),
    animation: T('genre', 'animat*|cartoon*|animated', 'animuar|animacion*|vizatimor*|film vizatimor', 'animation*|animiert*|zeichentrick*|trickfilm*', 'animira*|animacij*|crtan*|crtic*',
      ['Am I animated?', 'A jam i animuar?', 'Bin ich animiert?', 'Jesam li animiran?']),
    documentary: T('genre', 'documentar*', 'dokumentar*', 'dokumentar*|dokumentation*|doku', 'dokumentar*',
      ['Am I a documentary?', 'A jam dokumentar?', 'Bin ich eine Dokumentation?', 'Jesam li dokumentarac?']),
    crime: T('genre', 'crime|criminal|detective*|mafia|gangster*|murder mystery', 'krim*|kriminal*|detektiv*|mafi*|gangster*', 'krimi*|kriminal*|detektiv*|mafia|gangster*', 'krimi*|kriminal*|detektiv*|mafij*|gangster*',
      ['Am I about crime?', 'A jam për krime?', 'Bin ich ein Krimi?', 'Jesam li kriminalistički?']),
    musical: T('genre', 'musical*', 'miuzikal*|muzikal*', 'musical*', 'mjuzikl*|muzikl*',
      ['Am I a musical?', 'A jam miuzikal?', 'Bin ich ein Musical?', 'Jesam li mjuzikl?']),
    historical: T('genre', 'historical|history|period drama', 'historik*', 'historisch*|geschicht*', 'historijsk*|povijesn*|istorijsk*',
      ['Am I historical?', 'A jam historik?', 'Bin ich historisch?', 'Jesam li historijski?']),
    adventure: T('genre', 'adventur*', 'aventur*', 'abenteuer*', 'avantur*',
      ['Am I an adventure?', 'A jam aventurë?', 'Bin ich ein Abenteuer?', 'Jesam li avantura?']),
    sitcom: T('genre', 'sitcom*', 'sitcom*|komedi situat*', 'sitcom*', 'sitcom*|serijsk* komedij*',
      ['Am I a sitcom?', 'A jam sitcom?', 'Bin ich eine Sitcom?', 'Jesam li sitcom?']),
    series_part: T('topic', 'sequel*|franchise|saga|trilogy|part of a series|series of', 'vazhdim*|seri filmash|sage*|trilogji*|pjese e nje serie', 'fortsetzung*|reihe|saga|trilogie*|filmreihe*', 'nastav*|franšiz*|franciz*|sag*|trilogij*|dio serijala',
      ['Am I part of a series?', 'A jam pjesë e një serie?', 'Bin ich Teil einer Reihe?', 'Jesam li dio serijala?']),
    based_on_book: T('topic', 'based on a book|based on a novel|book adaptation|adaptation', 'bazuar ne liber|bazuar ne roman|bazuar ne nje liber|bazuar ne nje roman|adaptim*', 'nach einem buch|nach einem roman|auf einem buch|auf einem roman|verfilmung*|romanvorlage', 'prema knjizi|prema romanu|adaptacij*|ekranizacij*',
      ['Am I based on a book?', 'A jam bazuar në një libër?', 'Basiere ich auf einem Buch?', 'Jesam li snimljen prema knjizi?']),

    /* ------------------------------------------------------ sports, prizes --- */
    football: T('topic', 'football*|soccer', 'futboll*', 'fussball*', 'fudbal*|nogomet*',
      ['Am I connected with football?', 'A jam i lidhur me futbollin?', 'Habe ich mit Fußball zu tun?', 'Jesam li povezan s nogometom?']),
    basketball: T('topic', 'basketball*|nba', 'basketboll*|nba', 'basketball*|nba', 'kosark*|nba',
      ['Am I connected with basketball?', 'A jam i lidhur me basketbollin?', 'Habe ich mit Basketball zu tun?', 'Jesam li povezan s košarkom?']),
    tennis: T('topic', 'tennis', 'tenis*', 'tennis*', 'tenis*',
      ['Am I connected with tennis?', 'A jam i lidhur me tenisin?', 'Habe ich mit Tennis zu tun?', 'Jesam li povezan s tenisom?']),
    athletics: T('topic', 'athletics|track and field|running|sprint*|olympic', 'atletik*|vrap*|olimpi*', 'leichtathletik*|lauf*|sprint*|olympi*', 'atletik*|trcan*|sprint*|olimpij*',
      ['Am I connected with athletics?', 'A jam i lidhur me atletikën?', 'Habe ich mit Leichtathletik zu tun?', 'Jesam li povezan s atletikom?']),
    chess: T('topic', 'chess', 'shah*', 'schach*', 'sah|saha|sahu|sahom|sahist*',
      ['Am I connected with chess?', 'A jam i lidhur me shahun?', 'Habe ich mit Schach zu tun?', 'Jesam li povezan sa šahom?']),
    nobel: T('topic', 'nobel*', 'nobel*', 'nobel*', 'nobel*',
      ['Did I win a Nobel Prize?', 'A kam fituar Çmimin Nobel?', 'Habe ich einen Nobelpreis gewonnen?', 'Jesam li dobio Nobelovu nagradu?']),
    oscar: T('topic', 'oscar*|academy award*', 'oskar*|oscar*', 'oscar*', 'oskar*|oscar*',
      ['Did I win an Oscar?', 'A kam fituar një Oskar?', 'Habe ich einen Oscar gewonnen?', 'Jesam li osvojio Oscara?']),
    grammy: T('topic', 'grammy*', 'grammy*|gremi*', 'grammy*', 'grammy*|gremi*',
      ['Did I win a Grammy?', 'A kam fituar një Grammy?', 'Habe ich einen Grammy gewonnen?', 'Jesam li osvojio Grammy?'])
  };

  /* ----------------------------------------------------------- countries --- */
  // [ISO, continents, Wikidata id, [en, sq, de, bs], { lang: extra words }]
  function C(iso, cont, qid, names, extra) { return { iso: iso, cont: cont, qid: qid, names: names, extra: extra || {} }; }
  var COUNTRIES = [
    C('AL', 'EU', 'Q222', ['Albania', 'Shqipëria', 'Albanien', 'Albanija'], { en: 'albania*|albanian*', sq: 'shqiper*|shqipt*|shqip', de: 'albani*', bs: 'albanij*|albansk*|albanac*' }),
    C('XK', 'EU', 'Q1246', ['Kosovo', 'Kosova', 'Kosovo', 'Kosovo'], { en: 'kosov*', sq: 'kosov*|kosove', de: 'kosov*', bs: 'kosov*' }),
    C('BA', 'EU', 'Q225', ['Bosnia and Herzegovina', 'Bosnja dhe Hercegovina', 'Bosnien und Herzegowina', 'Bosna i Hercegovina'], { en: 'bosnia*|herzegovin*', sq: 'bosnj*|boshnjak*|hercegovin*', de: 'bosni*|herzegowin*', bs: 'bosn*|bih|hercegovin*|bosanac*' }),
    C('HR', 'EU', 'Q224', ['Croatia', 'Kroacia', 'Kroatien', 'Hrvatska'], { en: 'croat*', sq: 'kroa*', de: 'kroat*', bs: 'hrvat*' }),
    C('ME', 'EU', 'Q236', ['Montenegro', 'Mali i Zi', 'Montenegro', 'Crna Gora'], { en: 'montenegr*', sq: 'mali i zi|malit te zi|malazez*', de: 'montenegr*', bs: 'crn* gor*|crnogor*' }),
    C('MK', 'EU', 'Q221', ['North Macedonia', 'Maqedonia e Veriut', 'Nordmazedonien', 'Sjeverna Makedonija'], { en: 'macedonia*', sq: 'maqedon*', de: 'mazedon*|nordmazedon*', bs: 'makedon*' }),
    C('RS', 'EU', 'Q403', ['Serbia', 'Serbia', 'Serbien', 'Srbija'], { en: 'serbia*|serb', sq: 'serbi*|serb|serbe', de: 'serbi*', bs: 'srbij*|srpsk*|srbin' }),
    C('SI', 'EU', 'Q215', ['Slovenia', 'Sllovenia', 'Slowenien', 'Slovenija'], { en: 'sloven*', sq: 'slloven*', de: 'slowen*', bs: 'sloven*' }),
    C('GR', 'EU', 'Q41', ['Greece', 'Greqia', 'Griechenland', 'Grčka'], { en: 'greece|greek*', sq: 'greq*|grek*', de: 'griech*', bs: 'grck*|grk|grci*' }),
    C('BG', 'EU', 'Q219', ['Bulgaria', 'Bullgaria', 'Bulgarien', 'Bugarska'], { en: 'bulgar*', sq: 'bullgar*', de: 'bulgar*', bs: 'bugar*' }),
    C('RO', 'EU', 'Q218', ['Romania', 'Rumania', 'Rumänien', 'Rumunija'], { en: 'romania*', sq: 'rumun*|rumani*', de: 'rumani*', bs: 'rumun*' }),
    C('HU', 'EU', 'Q28', ['Hungary', 'Hungaria', 'Ungarn', 'Mađarska'], { en: 'hungar*', sq: 'hungar*', de: 'ungar*', bs: 'madjar*' }),
    C('AT', 'EU', 'Q40', ['Austria', 'Austria', 'Österreich', 'Austrija'], { en: 'austria*', sq: 'austri*', de: 'osterreich*', bs: 'austrij*' }),
    C('CH', 'EU', 'Q39', ['Switzerland', 'Zvicra', 'Schweiz', 'Švicarska'], { en: 'switzerland|swiss', sq: 'zvic*', de: 'schweiz*', bs: 'svicar*|svajcar*' }),
    C('DE', 'EU', 'Q183', ['Germany', 'Gjermania', 'Deutschland', 'Njemačka'], { en: 'german*', sq: 'gjerman*', de: 'deutsch*', bs: 'njemac*|njemack*' }),
    C('FR', 'EU', 'Q142', ['France', 'Franca', 'Frankreich', 'Francuska'], { en: 'france|french*', sq: 'franc*|frances*', de: 'frankreich*|franzos*', bs: 'francus*|francuz*' }),
    C('IT', 'EU', 'Q38', ['Italy', 'Italia', 'Italien', 'Italija'], { en: 'ital*', sq: 'itali*', de: 'itali*', bs: 'italij*|talijan*' }),
    C('ES', 'EU', 'Q29', ['Spain', 'Spanja', 'Spanien', 'Španija'], { en: 'spain|spanish|spaniard*', sq: 'spanj*', de: 'spani*', bs: 'spanij*|spansk*|spanjol*' }),
    C('PT', 'EU', 'Q45', ['Portugal', 'Portugalia', 'Portugal', 'Portugal'], { en: 'portug*', sq: 'portug*', de: 'portug*', bs: 'portug*' }),
    C('GB', 'EU', 'Q145', ['United Kingdom', 'Mbretëria e Bashkuar', 'Vereinigtes Königreich', 'Ujedinjeno Kraljevstvo'],
      { en: 'united kingdom|uk|britain|british|great britain|england|english|scotland|scottish|wales|welsh', sq: 'mbreteri* e bashkuar|britani*|angli*|anglez*|skoci*|skocez*', de: 'vereinigt* konigreich*|grossbritannien|britisch*|england|englisch*|schottland|schottisch*', bs: 'ujedinjen* kraljevstv*|britanij*|britansk*|englesk*|engleze*|skotsk*' }),
    C('IE', 'EU', 'Q27', ['Ireland', 'Irlanda', 'Irland', 'Irska'], { en: 'ireland|irish', sq: 'irland*', de: 'irland*|irisch*', bs: 'irsk*' }),
    C('NL', 'EU', 'Q55', ['Netherlands', 'Holanda', 'Niederlande', 'Nizozemska'], { en: 'netherlands|dutch|holland', sq: 'holand*', de: 'niederland*|holland*', bs: 'nizozem*|holandij*|holandsk*' }),
    C('BE', 'EU', 'Q31', ['Belgium', 'Belgjika', 'Belgien', 'Belgija'], { en: 'belgi*', sq: 'belgj*', de: 'belgi*', bs: 'belgij*' }),
    C('SE', 'EU', 'Q34', ['Sweden', 'Suedia', 'Schweden', 'Švedska'], { en: 'swed*', sq: 'sued*', de: 'schwed*', bs: 'sved*' }),
    C('NO', 'EU', 'Q20', ['Norway', 'Norvegjia', 'Norwegen', 'Norveška'], { en: 'norw*', sq: 'norvegj*', de: 'norweg*', bs: 'norve*' }),
    C('DK', 'EU', 'Q35', ['Denmark', 'Danimarka', 'Dänemark', 'Danska'], { en: 'denmark|danish|dane', sq: 'danimark*|danez*', de: 'danemark*|danisch*', bs: 'dansk*|danac*' }),
    C('FI', 'EU', 'Q33', ['Finland', 'Finlanda', 'Finnland', 'Finska'], { en: 'finland*|finnish', sq: 'finland*', de: 'finnland*|finnisch*', bs: 'finsk*' }),
    C('IS', 'EU', 'Q189', ['Iceland', 'Islanda', 'Island', 'Island'], { en: 'iceland*|icelandic', sq: 'island*', de: 'island*|islandisch*', bs: 'island*' }),
    C('PL', 'EU', 'Q36', ['Poland', 'Polonia', 'Polen', 'Poljska'], { en: 'poland|polish', sq: 'polon*|polak*', de: 'polen|polnisch*', bs: 'poljsk*|poljak*' }),
    C('CZ', 'EU', 'Q213', ['Czechia', 'Çekia', 'Tschechien', 'Češka'], { en: 'czech*', sq: 'ceki*|cek', de: 'tschech*', bs: 'cesk*' }),
    C('UA', 'EU', 'Q212', ['Ukraine', 'Ukraina', 'Ukraine', 'Ukrajina'], { en: 'ukrain*', sq: 'ukrain*', de: 'ukrain*', bs: 'ukrajin*' }),
    C('RU', 'EU AS', 'Q159', ['Russia', 'Rusia', 'Russland', 'Rusija'], { en: 'russia*', sq: 'rusi*|rus|ruse', de: 'russ*', bs: 'rusij*|rusk*|rus' }),
    C('TR', 'EU AS', 'Q43', ['Türkiye', 'Turqia', 'Türkei', 'Turska'], { en: 'turkey|turkish|turk|turkiye', sq: 'turqi*|turk*', de: 'turkei|turkisch*|turke', bs: 'tursk*|turcin' }),
    C('VA', 'EU', 'Q237', ['Vatican City', 'Vatikani', 'Vatikanstadt', 'Vatikan'], { en: 'vatican*', sq: 'vatikan*', de: 'vatikan*', bs: 'vatikan*' }),
    C('SU', 'EU AS', 'Q15180', ['Soviet Union', 'Bashkimi Sovjetik', 'Sowjetunion', 'Sovjetski Savez'], { en: 'soviet*|ussr', sq: 'sovjeti*|bashkimi sovjetik|brss', de: 'sowjet*|udssr', bs: 'sovjetsk*|sssr' }),
    C('YU', 'EU', 'Q36704', ['Yugoslavia', 'Jugosllavia', 'Jugoslawien', 'Jugoslavija'], { en: 'yugoslav*', sq: 'jugosllav*', de: 'jugoslaw*', bs: 'jugoslav*' }),
    C('OT', 'EU AS AF', 'Q12560', ['Ottoman Empire', 'Perandoria Osmane', 'Osmanisches Reich', 'Osmansko Carstvo'], { en: 'ottoman*', sq: 'osman*', de: 'osman*', bs: 'osmansk*|otomansk*' }),
    C('US', 'NA', 'Q30', ['United States', 'SHBA', 'USA', 'SAD'], { en: 'united states*|usa|u s a|american*', sq: 'shba|shtet* e bashkuar*|amerikan*', de: 'usa|vereinigt* staaten|amerikan*', bs: 'sjedinjen* americk* drzav*|sjedinjen* drzav*|americk*|amerikan*|usa' }),
    C('CA', 'NA', 'Q16', ['Canada', 'Kanadaja', 'Kanada', 'Kanada'], { en: 'canad*', sq: 'kanad*', de: 'kanad*', bs: 'kanad*' }),
    C('MX', 'NA', 'Q96', ['Mexico', 'Meksika', 'Mexiko', 'Meksiko'], { en: 'mexic*', sq: 'meksik*', de: 'mexik*', bs: 'meksik*|meksick*' }),
    C('CU', 'NA', 'Q241', ['Cuba', 'Kuba', 'Kuba', 'Kuba'], { en: 'cuba*', sq: 'kuba*|kuban*', de: 'kuba*|kuban*', bs: 'kuba*|kubansk*' }),
    C('BR', 'SA', 'Q155', ['Brazil', 'Brazili', 'Brasilien', 'Brazil'], { en: 'brazil*', sq: 'brazil*', de: 'brasil*', bs: 'brazil*' }),
    C('AR', 'SA', 'Q414', ['Argentina', 'Argjentina', 'Argentinien', 'Argentina'], { en: 'argentin*', sq: 'argjentin*', de: 'argentin*', bs: 'argentin*' }),
    C('CO', 'SA', 'Q739', ['Colombia', 'Kolumbia', 'Kolumbien', 'Kolumbija'], { en: 'colombia*', sq: 'kolumbi*', de: 'kolumbi*', bs: 'kolumbij*' }),
    C('CL', 'SA', 'Q298', ['Chile', 'Kili', 'Chile', 'Čile'], { en: 'chile*', sq: 'kili|kilian*', de: 'chile*', bs: 'cile|cilea*|cilans*' }),
    C('PE', 'SA', 'Q419', ['Peru', 'Peru', 'Peru', 'Peru'], { en: 'peru*', sq: 'peru*', de: 'peru*', bs: 'peru*' }),
    C('CN', 'AS', 'Q148', ['China', 'Kina', 'China', 'Kina'], { en: 'china|chinese', sq: 'kina|kine|kines*|kinez*', de: 'china|chines*', bs: 'kina|kine|kini|kinesk*|kinez*' }),
    C('JP', 'AS', 'Q17', ['Japan', 'Japonia', 'Japan', 'Japan'], { en: 'japan*', sq: 'japon*', de: 'japan*', bs: 'japan*' }),
    C('KR', 'AS', 'Q884', ['South Korea', 'Koreja e Jugut', 'Südkorea', 'Južna Koreja'], { en: 'korea*', sq: 'kore*', de: 'sudkorea*|korea*', bs: 'korej*' }),
    C('IN', 'AS', 'Q668', ['India', 'India', 'Indien', 'Indija'], { en: 'india|indian', sq: 'india|indi|indian*', de: 'indien|indisch*|inder', bs: 'indij*' }),
    C('ID', 'AS', 'Q252', ['Indonesia', 'Indonezia', 'Indonesien', 'Indonezija'], { en: 'indonesia*', sq: 'indonez*', de: 'indones*', bs: 'indonezij*' }),
    C('VN', 'AS', 'Q881', ['Vietnam', 'Vietnami', 'Vietnam', 'Vijetnam'], { en: 'vietnam*', sq: 'vietnam*', de: 'vietnam*', bs: 'vijetnam*' }),
    C('TH', 'AS', 'Q869', ['Thailand', 'Tajlanda', 'Thailand', 'Tajland'], { en: 'thailand*|thai', sq: 'tajland*', de: 'thailand*', bs: 'tajland*' }),
    C('NP', 'AS', 'Q837', ['Nepal', 'Nepali', 'Nepal', 'Nepal'], { en: 'nepal*', sq: 'nepal*', de: 'nepal*', bs: 'nepal*' }),
    C('IR', 'AS', 'Q794', ['Iran', 'Irani', 'Iran', 'Iran'], { en: 'iran*|persia*', sq: 'iran*|persi*', de: 'iran*|persi*', bs: 'iran*|perzij*' }),
    C('IQ', 'AS', 'Q796', ['Iraq', 'Iraku', 'Irak', 'Irak'], { en: 'iraq*', sq: 'irak*', de: 'irak*', bs: 'irak*|irack*' }),
    C('IL', 'AS', 'Q801', ['Israel', 'Izraeli', 'Israel', 'Izrael'], { en: 'israel*', sq: 'izrael*', de: 'israel*', bs: 'izrael*' }),
    C('SA', 'AS', 'Q851', ['Saudi Arabia', 'Arabia Saudite', 'Saudi-Arabien', 'Saudijska Arabija'], { en: 'saudi*', sq: 'saudit*|saudi*', de: 'saudi*', bs: 'saudij*' }),
    C('EG', 'AF', 'Q79', ['Egypt', 'Egjipti', 'Ägypten', 'Egipat'], { en: 'egypt*', sq: 'egjipt*', de: 'agypt*', bs: 'egip*' }),
    C('MA', 'AF', 'Q1028', ['Morocco', 'Maroku', 'Marokko', 'Maroko'], { en: 'morocc*', sq: 'marok*', de: 'marokk*', bs: 'marok*' }),
    C('NG', 'AF', 'Q1033', ['Nigeria', 'Nigeria', 'Nigeria', 'Nigerija'], { en: 'nigeria*', sq: 'nigeri*', de: 'nigeria*', bs: 'nigerij*' }),
    C('KE', 'AF', 'Q114', ['Kenya', 'Kenia', 'Kenia', 'Kenija'], { en: 'kenya*', sq: 'keni*', de: 'kenia*', bs: 'kenij*' }),
    C('TZ', 'AF', 'Q924', ['Tanzania', 'Tanzania', 'Tansania', 'Tanzanija'], { en: 'tanzania*', sq: 'tanzan*', de: 'tansani*', bs: 'tanzanij*' }),
    C('ZA', 'AF', 'Q258', ['South Africa', 'Afrika e Jugut', 'Südafrika', 'Južna Afrika'], { en: 'south africa*', sq: 'afrik* e jugut', de: 'sudafrika*', bs: 'juzn* afri*|juznoafri*' }),
    C('AU', 'OC', 'Q408', ['Australia', 'Australia', 'Australien', 'Australija'], { en: 'australia*', sq: 'australi*', de: 'australi*', bs: 'australij*|australsk*' }),
    C('NZ', 'OC', 'Q664', ['New Zealand', 'Zelanda e Re', 'Neuseeland', 'Novi Zeland'], { en: 'new zealand*', sq: 'zeland* e re', de: 'neuseeland*', bs: 'nov* zeland*|novozeland*' }),
    C('JM', 'NA', 'Q766', ['Jamaica', 'Xhamajka', 'Jamaika', 'Jamajka'], { en: 'jamaica*', sq: 'xhamajk*|jamajk*', de: 'jamaika*', bs: 'jamajk*' }),
    C('UY', 'SA', 'Q77', ['Uruguay', 'Uruguai', 'Uruguay', 'Urugvaj'], { en: 'uruguay*', sq: 'urugua*', de: 'uruguay*', bs: 'urugvaj*' }),
    C('SK', 'EU', 'Q214', ['Slovakia', 'Sllovakia', 'Slowakei', 'Slovačka'], { en: 'slovak*', sq: 'sllovak*', de: 'slowak*', bs: 'slovac*|slovak*' }),
    C('MD', 'EU', 'Q217', ['Moldova', 'Moldavia', 'Moldau', 'Moldavija'], { en: 'moldov*', sq: 'moldavi*', de: 'moldau|moldawi*', bs: 'moldavij*' }),
    C('LI', 'EU', 'Q347', ['Liechtenstein', 'Lihtenshtajni', 'Liechtenstein', 'Lihtenštajn'], { en: 'liechtenstein*', sq: 'lihtenshtajn*', de: 'liechtenstein*', bs: 'lihtenstajn*' }),
    C('MG', 'AF', 'Q1019', ['Madagascar', 'Madagaskari', 'Madagaskar', 'Madagaskar'], { en: 'madagasc*', sq: 'madagaskar*', de: 'madagaskar*', bs: 'madagaskar*' }),
    C('UG', 'AF', 'Q1036', ['Uganda', 'Uganda', 'Uganda', 'Uganda'], { en: 'uganda*', sq: 'ugand*', de: 'uganda*', bs: 'ugand*' }),
    C('ET', 'AF', 'Q115', ['Ethiopia', 'Etiopia', 'Äthiopien', 'Etiopija'], { en: 'ethiopia*', sq: 'etiopi*', de: 'athiopi*', bs: 'etiopij*' }),
    C('SD', 'AF', 'Q1049', ['Sudan', 'Sudani', 'Sudan', 'Sudan'], { en: 'sudan*', sq: 'sudan*', de: 'sudan*', bs: 'sudan*' })
  ];
  // Former states in Wikidata that count as a modern country for questions.
  var QID_ALIAS = { Q713750: 'DE', Q16957: 'DE', Q43287: 'DE', Q7318: 'DE', Q41304: 'DE', Q131964: 'AT', Q28513: 'AT', Q174193: 'GB', Q161885: 'GB',
    Q179876: 'GB', Q230791: 'GB', Q172579: 'IT', Q38: 'IT', Q70972: 'FR', Q71084: 'FR', Q34266: 'RU', Q139319: 'RU', Q2305208: 'XK' };

  var CONTINENTS = {
    EU: { qid: 'Q46', names: ['Europe', 'Evropa', 'Europa', 'Evropa'], lex: { en: 'europ*', sq: 'evrop*|europ*', de: 'europ*', bs: 'evrop*|europ*' } },
    AS: { qid: 'Q48', names: ['Asia', 'Azia', 'Asien', 'Azija'], lex: { en: 'asia*', sq: 'azi*|aziat*', de: 'asien|asiat*', bs: 'azij*|azijat*' } },
    AF: { qid: 'Q15', names: ['Africa', 'Afrika', 'Afrika', 'Afrika'], lex: { en: 'africa*', sq: 'afrik*', de: 'afrika*', bs: 'afri*' } },
    NA: { qid: 'Q49', names: ['North America', 'Amerika e Veriut', 'Nordamerika', 'Sjeverna Amerika'], lex: { en: 'north america*', sq: 'amerik* e veriut', de: 'nordamerika*', bs: 'sjevern* amer*' } },
    SA: { qid: 'Q18', names: ['South America', 'Amerika e Jugut', 'Südamerika', 'Južna Amerika'], lex: { en: 'south america*|latin america*', sq: 'amerik* e jugut|amerik* latin*', de: 'sudamerika*|lateinamerika*', bs: 'juzn* amer*|latinsk* amer*' } },
    OC: { qid: 'Q55643', names: ['Oceania', 'Oqeania', 'Ozeanien', 'Okeanija'], lex: { en: 'oceania*', sq: 'oqeani*', de: 'ozeanien*', bs: 'okeanij*' } },
    AN: { qid: 'Q51', names: ['Antarctica', 'Antarktida', 'Antarktis', 'Antarktika'], lex: { en: 'antarctic*', sq: 'antarktid*', de: 'antarktis*', bs: 'antarktik*|antarktid*' } }
  };
  // "America" alone: North or South America.
  var AMERICA = { en: 'america|americas', sq: 'amerik*', de: 'amerika', bs: 'amerik*|americi' };
  var BALKANS = { codes: ['AL', 'XK', 'BA', 'ME', 'MK', 'RS', 'HR', 'BG', 'GR', 'SI', 'YU', 'OT'],
    lex: { en: 'balkan*', sq: 'ballkan*|balkan*', de: 'balkan*', bs: 'balkan*' }, names: ['the Balkans', 'Ballkani', 'der Balkan', 'Balkan'] };

  /* ---------------------------------------------------- question words --- */
  // Everything else the questions need, per language.
  var W = {
    female: { en: 'woman|women|female|girl|lady', sq: 'grua|gra|femer*|vajz*|zonj*', de: 'frau|frauen|weiblich*|madchen|dame', bs: 'zena|zenu|zensk*|djevojk*|dama' },
    male: { en: 'man|men|male|boy|guy|gentleman', sq: 'burre|burr|meshkuj|mashkull|djale|djal|zoteri', de: 'mann|manner|mannlich*|junge|herr', bs: 'muskar*|musk*|momak|djecak|gospodin' },
    alive: { en: 'alive|living|still live|still living|still alive|live today', sq: 'gjall*|jeton|jetoj|ende jeton', de: 'leb*|lebendig|noch am leben', bs: 'ziv|ziva|zivi|zivim|jos ziv*' },
    dead: { en: 'dead|died|deceased|passed away|no longer alive', sq: 'vdekur|vdiq|vdekj*|nuk jeton', de: 'tot|gestorben|verstorben|starb', bs: 'mrtav|mrtv*|umro|umrla|umrli|preminu*' },
    fictional: { en: 'fictional|fictitious|invented|imaginary|made up|fantasy character', sq: 'fiktiv*|imagjinar*|i trilluar|e trilluar', de: 'fiktiv*|erfunden*|ausgedacht', bs: 'izmisljen*|fiktiv*|imaginarn*' },
    real: { en: 'real|really existed|existed', sq: 'real*|ekzistoj*|ka ekzistuar', de: 'real|echt|existiert*|wirklich', bs: 'stvarn*|postoja*|realn*' },
    born: { en: 'born|birth', sq: 'lind*|lindj*', de: 'geboren|geburt*', bs: 'rodjen*|rodila|rodio|rodj*' },
    ended: { en: 'end|ended|ends|fall|fell|collapse*|dissolved', sq: 'mbaroi|perfundoi|perfundim*|ra|u shperbe|rene|renia', de: 'endete|ende|zerfiel|zerfall|untergang|aufgelost', bs: 'zavrsi*|zavrsen*|propa*|raspa*|kraj|pad' },
    began: { en: 'start|started|began|begin|beginning', sq: 'filloi|nisi|fillim*', de: 'begann|begonnen|anfang|beginn', bs: 'poce*|pocet*|zapoce*' },
    died: { en: 'die|died|death', sq: 'vdiq|vdekur|vdekj*', de: 'starb|gestorben|tod|todes*', bs: 'umro|umrla|umrl*|smrt*|preminu*' },
    founded: { en: 'founded|established|built|opened|created', sq: 'themel*|ndertuar|ndertu*|hapur|krijuar', de: 'gegrundet|grundung|gebaut|erbaut|eroffnet|errichtet', bs: 'osnovan*|izgradjen*|sagradjen*|otvoren*|nastao|nastala' },
    before: { en: 'before|earlier than|prior to|older than', sq: 'para|perpara|me heret se|me heret|me i vjeter', de: 'vor|vorher|fruher als|bevor|alter als', bs: 'prije|ranije|pre|starij*' },
    after: { en: 'after|later than|since|newer than', sq: 'pas|mbas|me vone se|me vone|me i ri', de: 'nach|spater als|spater|seit|neuer als', bs: 'poslije|posle|nakon|kasnije|novij*' },
    between: { en: 'between', sq: 'midis|ndermjet|mes', de: 'zwischen', bs: 'izmedju' },
    century: { en: 'century|centuries', sq: 'shekull*|shek', de: 'jahrhundert*|jh', bs: 'stoljec*|vijek*|st' },
    bc: { en: 'bc|b c|bce|before christ', sq: 'p k|pk|para krishtit|p e s|pes|para eres sone', de: 'v chr|v u z|vor christus|vor christi', bs: 'p n e|pne|prije nove ere|prije krista|prije hrista' },
    more: { en: 'more than|more|over|above|higher|longer|taller|bigger|larger|greater|at least|exceed*|more people', sq: 'me shume|mbi|me i larte|me e larte|me i gjate|me e gjate|me i madh|me e madhe|te pakten|se paku|me teper', de: 'mehr als|mehr|uber|hoher|langer|grosser|mindestens', bs: 'vise od|vise|preko|visi|visa|duzi|duza|duze|veci|veca|najmanje|iznad' },
    less: { en: 'less than|less|fewer|under|below|lower|shorter|smaller|at most', sq: 'me pak|nen|me i ulet|me e ulet|me i shkurter|me e shkurter|me i vogel|me e vogel|me se shumti', de: 'weniger als|weniger|unter|niedriger|kurzer|kleiner|hochstens', bs: 'manje od|manje|ispod|nizi|niza|kraci|kraca|manji|manja|najvise' },
    people: { en: 'people|inhabitants|population|residents|live in|citizens', sq: 'banor*|njerez|popullsi*|jetojne|qytetar*', de: 'einwohner*|menschen|bevolkerung*|leben in|bewohner*', bs: 'stanovni*|ljudi|zivi u|zive u|gradjan*' },
    height: { en: 'high|height|tall|altitude|elevation|metres|meters|metre|meter|m', sq: 'lart*|lartesi*|metra|metro|m', de: 'hoch|hoch*|hohe|meter|m|hoher', bs: 'visok*|visin*|visi|metara|metra|metar|m' },
    length: { en: 'long|length|km|kilomet*|miles', sq: 'gjat*|gjatesi*|km|kilomet*', de: 'lang|lange|langer|km|kilomet*', bs: 'dug|duga|dugo|duzi|duzin*|km|kilomet*' },
    hours: { en: 'hour|hours|h', sq: 'ore|oresh|or', de: 'stunde|stunden|std', bs: 'sat|sata|sati|h' },
    minutes: { en: 'minute*|min', sq: 'minut*|min', de: 'minute*|min', bs: 'minut*|min' },
    million: { en: 'million*|mio|m', sq: 'milion*|mln', de: 'million*|mio', bs: 'milion*|mil' },
    thousand: { en: 'thousand*|k', sq: 'mije', de: 'tausend*', bs: 'hiljad*|tisuc*' },
    starts: { en: 'start* with|begin* with|first letter|initial', sq: 'fillon me|nis me|fillon nga|fillon emri|emri fillon|emri im fillon|shkronja e pare|shkronjen e pare', de: 'beginnt mit|fangt mit|beginnt mein name|beginnt der name|name beginnt|fangt mein name|anfangsbuchstabe*|erste* buchstabe*|startet mit', bs: 'pocinje sa|pocinje s|pocinje na|pocinje slovom|pocinje li|ime pocinje|prvo slovo' },
    contains: { en: 'contain*|letter|has the letter|have the letter', sq: 'permban|shkronj*|ka shkronj*', de: 'enthalt*|buchstabe*', bs: 'sadrzi|slovo|ima slovo' },
    word: { en: 'word|words', sq: 'fjale|fjalesh', de: 'wort|worter|worten', bs: 'rijec|rijeci|rijeci' },
    letters: { en: 'letters|characters', sq: 'shkronja|germa', de: 'buchstaben|zeichen', bs: 'slova|slov*' },
    name: { en: 'name|title|called', sq: 'emri|emrin|titulli|titullin|quhem|quhet', de: 'name|namen|titel|heisse|heisst', bs: 'ime|imena|naziv*|naslov*|zovem|zove' },
    not: { en: 'not|never|isn t|aren t|wasn t|weren t|don t|doesn t|didn t|n t', sq: 'nuk|s|kurre|jo', de: 'nicht|kein|keine|keinen|keiner|nie|niemals', bs: 'nisam|nije|nisi|ne|nikad|nikada|nismo' },
    or: { en: 'or', sq: 'apo|ose', de: 'oder', bs: 'ili' },
    relation: { en: 'directed|direct|director|by|made by|written|wrote|author|painted|starring|star|stars|play|plays|played|acted|act|sang|sings|sung|composed|created|developed|invented|discovered|founded by|perform*', sq: 'regjisor*|regjisuar|shkruar|shkroi|autor*|pikturuar|pikturoi|luan|luajti|luajtur|kendoi|kendon|kompozuar|krijuar|krijoi|zhvilluar|shpikur|shpiku|zbuloi|interpret*', de: 'regie|regisseur|gedreht|geschrieben|schrieb|autor|gemalt|malte|spielt|spielte|gespielt|singt|sang|gesungen|komponiert|erschaffen|entwickelt|erfunden|entdeckt|darsteller*', bs: 'rezir*|reziser*|napisa*|autor*|naslika*|glumi|glumio|glumila|pjeva|pjevao|otpjeva*|komponova*|stvori*|razvi*|izumi*|otkri*|izvodi*' },
    guess: { en: 'are you|am i|is it|is that|is this', sq: 'a je|a jam|a eshte|je ti|jam une', de: 'bist du|bin ich|ist es|ist das', bs: 'jesi li|jesam li|da li si|da li sam|je li to|jel to' }
  };
  var NUMBER_WORDS = {
    en: { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, a: 1, single: 1 },
    sq: { nje: 1, dy: 2, tre: 3, tri: 3, kater: 4, pese: 5, dhjete: 10 },
    de: { ein: 1, eine: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, funf: 5, zehn: 10 },
    bs: { jedna: 1, jedne: 1, jedan: 1, dvije: 2, dva: 2, tri: 3, cetiri: 4, pet: 5, deset: 10 }
  };

  /* ------------------------------------------------------------ helpers --- */
  // Turns "a b*|c" into matchers [[{w:'a'},{w:'b',p:1}],[{w:'c'}]].
  var cache = {};
  function compile(spec) {
    if (cache[spec]) return cache[spec];
    var list = String(spec || '').split('|').map(function (term) {
      return term.trim().split(/\s+/).filter(Boolean).map(function (w) {
        return w.charAt(w.length - 1) === '*' ? { w: w.slice(0, -1), p: 1 } : { w: w };
      });
    }).filter(function (t) { return t.length; });
    cache[spec] = list;
    return list;
  }
  /** Where does any term of spec occur in the word list? [{at, len}] */
  function find(words, spec) {
    var out = [];
    compile(spec).forEach(function (term, ti) {
      for (var i = 0; i + term.length <= words.length; i++) {
        var ok = true;
        for (var j = 0; j < term.length && ok; j++) {
          var w = words[i + j], t = term[j];
          ok = t.p ? w.indexOf(t.w) === 0 : w === t.w;
        }
        if (ok) out.push({ at: i, len: term.length, term: ti });
      }
    });
    return out;
  }
  function has(words, spec) { return find(words, spec).length > 0; }
  /** The terms of one entry for a language - plus English, which is always understood. */
  function specFor(entry, lang) {
    if (!entry) return '';
    var own = entry[lang] || '';
    return lang === 'en' || !entry.en ? own : own + '|' + entry.en;
  }

  var BY_ISO = {}, BY_QID = {};
  COUNTRIES.forEach(function (c) { BY_ISO[c.iso] = c; BY_QID[c.qid] = c.iso; c.cont = c.cont.split(' '); });
  Object.keys(QID_ALIAS).forEach(function (q) { if (!BY_QID[q]) BY_QID[q] = QID_ALIAS[q]; });
  /** The country words of a language: the name (and its start, for Albanian and Bosnian endings) + extra words. */
  function countrySpec(c, lang) {
    var i = LANGS.indexOf(lang);
    var n = c.names[i] ? c.names[i] : c.names[0];
    var nn = n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/đ/g, 'dj').replace(/[^a-z0-9 ]+/g, ' ').trim();
    var terms = [nn];
    if (nn.indexOf(' ') === -1 && nn.length >= 6) terms.push(nn.slice(0, nn.length - (nn.length >= 9 ? 2 : 1)) + '*');
    var ex = c.extra[lang];
    return terms.join('|') + (ex ? '|' + ex : '') + (lang !== 'en' && c.extra.en ? '|' + c.extra.en : '');
  }
  function countryName(iso, lang) { var c = BY_ISO[iso]; return c ? c.names[Math.max(0, LANGS.indexOf(lang))] : iso; }
  function continentName(code, lang) { var c = CONTINENTS[code]; return c ? c.names[Math.max(0, LANGS.indexOf(lang))] : code; }
  function continentsOf(isos) {
    var out = [];
    (isos || []).forEach(function (i) { var c = BY_ISO[i]; if (c) c.cont.forEach(function (k) { if (out.indexOf(k) === -1) out.push(k); }); });
    return out;
  }

  return { LANGS: LANGS, TAGS: TAGS, COUNTRIES: COUNTRIES, BY_ISO: BY_ISO, BY_QID: BY_QID, CONTINENTS: CONTINENTS, AMERICA: AMERICA,
    BALKANS: BALKANS, W: W, NUMBER_WORDS: NUMBER_WORDS, compile: compile, find: find, has: has, specFor: specFor,
    countrySpec: countrySpec, countryName: countryName, continentName: continentName, continentsOf: continentsOf };
});
