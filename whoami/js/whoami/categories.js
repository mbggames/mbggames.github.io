/*!
 * MBG Who Am I? - the four question words, the categories, the difficulty levels and the filters.
 *
 *   WHO am I?    people            WHAT am I?   works, things, ideas
 *   WHERE am I?  places            WHEN am I?   moments of history
 *
 * The categories are those of the requirements (section 5), each under the question word it fits.
 * For each subcategory `wd` tells the live search (discovery.js) what to ask Wikidata for:
 *   cls   the item is an instance of one of these classes (P31)
 *   occ   people: one of these professions (P106)
 *   genre works: one of these genres (P136)
 *   extra one more SPARQL line
 *   prof  which facts to read: person / work / place / event
 * Subcategories without `wd` use the built-in cards only (deck.js).
 *
 * Difficulty (FR-014): how well known an answer is - the number of Wikipedia language editions
 * that have an article about it (Wikidata "sitelinks"), or the level of a built-in card.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.WhoCats = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var MODES = {
    who:   { icon: '👤', color: 'who',   word: ['WHO', 'KUSH', 'WER', 'KO'],      title: ['Who am I?', 'Kush jam unë?', 'Wer bin ich?', 'Ko sam ja?'],
      text: ['A famous person, a band or a team', 'Një person i njohur ose një grup', 'Eine berühmte Person oder eine Band', 'Poznata osoba ili grupa'] },
    what:  { icon: '🎬', color: 'what',  word: ['WHAT', 'ÇFARË', 'WAS', 'ŠTA'],   title: ['What am I?', 'Çfarë jam unë?', 'Was bin ich?', 'Šta sam ja?'],
      text: ['A film, book, artwork, game, invention or sport', 'Një film, libër, vepër arti, lojë, shpikje ose sport', 'Ein Film, Buch, Kunstwerk, Spiel, eine Erfindung oder ein Sport', 'Film, knjiga, umjetničko djelo, igra, izum ili sport'] },
    where: { icon: '📍', color: 'where', word: ['WHERE', 'KU', 'WO', 'GDJE'],     title: ['Where am I?', 'Ku jam unë?', 'Wo bin ich?', 'Gdje sam ja?'],
      text: ['A country, city, river, mountain or famous place', 'Një shtet, qytet, lumë, mal ose vend i njohur', 'Ein Land, eine Stadt, ein Fluss, Berg oder berühmter Ort', 'Država, grad, rijeka, planina ili poznato mjesto'] },
    when:  { icon: '⏳', color: 'when',  word: ['WHEN', 'KUR', 'WANN', 'KADA'],   title: ['When am I?', 'Kur jam unë?', 'Wann bin ich?', 'Kada sam ja?'],
      text: ['An event, battle, treaty, empire or era', 'Një ngjarje, betejë, traktat, perandori ose epokë', 'Ein Ereignis, eine Schlacht, ein Vertrag, Reich oder eine Epoche', 'Događaj, bitka, ugovor, carstvo ili epoha'] }
  };
  var MODE_ORDER = ['who', 'what', 'where', 'when'];

  function S(names, wd) { return { names: names, wd: wd || null }; }
  var P = 'person', W = 'work', PL = 'place', EV = 'event';

  var CATS = {
    people: { mode: 'who', icon: '🌟', names: ['Famous people', 'Njerëz të njohur', 'Berühmte Menschen', 'Poznate ličnosti'], subs: {
      scientists: S(['Scientists', 'Shkencëtarë', 'Wissenschaftler', 'Naučnici'], { prof: P, occ: ['Q901', 'Q169470', 'Q593644', 'Q170790', 'Q864503', 'Q11063'] }),
      historical: S(['Historical figures', 'Figura historike', 'Historische Personen', 'Historijske ličnosti'], { prof: P, occ: ['Q82955', 'Q116', 'Q11900058'], extra: '?item wdt:P569 ?born0 . FILTER(YEAR(?born0) < 1930)' }),
      writers: S(['Writers', 'Shkrimtarë', 'Schriftsteller', 'Pisci'], { prof: P, occ: ['Q36180', 'Q6625963', 'Q49757', 'Q214917'] }),
      artists: S(['Artists', 'Artistë', 'Künstler', 'Umjetnici'], { prof: P, occ: ['Q1028181', 'Q1281618'] }),
      philosophers: S(['Philosophers', 'Filozofë', 'Philosophen', 'Filozofi'], { prof: P, occ: ['Q4964182'] }),
      athletes: S(['Athletes', 'Sportistë', 'Sportler', 'Sportisti'], { prof: P, occ: ['Q937857', 'Q3665646', 'Q10833314', 'Q11513337'] })
    } },
    filmpeople: { mode: 'who', icon: '🎭', names: ['Actors and film people', 'Aktorë dhe njerëz të filmit', 'Schauspieler und Filmschaffende', 'Glumci i filmski stvaraoci'], subs: {
      actors: S(['Actors', 'Aktorë', 'Schauspieler', 'Glumci'], { prof: P, occ: ['Q33999', 'Q10800557', 'Q10798782'] }),
      directors: S(['Directors', 'Regjisorë', 'Regisseure', 'Režiseri'], { prof: P, occ: ['Q2526255'] }),
      screenwriters: S(['Screenwriters', 'Skenaristë', 'Drehbuchautoren', 'Scenaristi'], { prof: P, occ: ['Q28389'] }),
      comedians: S(['Comedians', 'Komedianë', 'Komiker', 'Komičari'], { prof: P, occ: ['Q245068'] }),
      awardwinners: S(['Oscar winners', 'Fitues të Oskarit', 'Oscar-Preisträger', 'Dobitnici Oscara'], { prof: P, occ: ['Q33999', 'Q2526255'], extra: '?item wdt:P166 ?aw0 . ?aw0 wdt:P279 wd:Q19020 .' })
    } },
    musicpeople: { mode: 'who', icon: '🎤', names: ['Music artists', 'Artistë të muzikës', 'Musiker', 'Muzičari'], subs: {
      singers: S(['Singers', 'Këngëtarë', 'Sänger', 'Pjevači'], { prof: P, occ: ['Q177220', 'Q488205'] }),
      bands: S(['Bands', 'Grupe muzikore', 'Bands', 'Bendovi'], { prof: 'band', cls: ['Q215380', 'Q5741069'] }),
      composers: S(['Classical composers', 'Kompozitorë klasikë', 'Klassische Komponisten', 'Klasični kompozitori'], { prof: P, occ: ['Q36834'], extra: '?item wdt:P569 ?born0 . FILTER(YEAR(?born0) < 1900)' })
    } },
    movies: { mode: 'what', icon: '🎬', names: ['Movies', 'Filma', 'Filme', 'Filmovi'], subs: {
      drama: S(['Drama', 'Dramë', 'Drama', 'Drama'], { prof: W, cls: ['Q11424'], genre: ['Q130232'] }),
      comedy: S(['Comedy', 'Komedi', 'Komödie', 'Komedija'], { prof: W, cls: ['Q11424'], genre: ['Q157443'] }),
      horror: S(['Horror', 'Horror', 'Horror', 'Horor'], { prof: W, cls: ['Q11424'], genre: ['Q200092'] }),
      action: S(['Action', 'Aksion', 'Action', 'Akcija'], { prof: W, cls: ['Q11424'], genre: ['Q188473'] }),
      thriller: S(['Thriller', 'Thriller', 'Thriller', 'Triler'], { prof: W, cls: ['Q11424'], genre: ['Q2484376'] }),
      scifi: S(['Science fiction', 'Fantastiko-shkencor', 'Science-Fiction', 'Naučna fantastika'], { prof: W, cls: ['Q11424'], genre: ['Q471839'] }),
      romance: S(['Romance', 'Romancë', 'Liebesfilm', 'Ljubavni'], { prof: W, cls: ['Q11424'], genre: ['Q1054574'] }),
      fantasy: S(['Fantasy', 'Fantazi', 'Fantasy', 'Fantastika'], { prof: W, cls: ['Q11424'], genre: ['Q157394'] }),
      historical: S(['Historical', 'Historik', 'Historienfilm', 'Historijski'], { prof: W, cls: ['Q11424'], genre: ['Q17013749'] }),
      animation: S(['Animation', 'Animacion', 'Animation', 'Animirani'], { prof: W, cls: ['Q11424', 'Q202866'], genre: ['Q202866', 'Q581714'] }),
      documentary: S(['Documentary', 'Dokumentar', 'Dokumentarfilm', 'Dokumentarni'], { prof: W, cls: ['Q11424', 'Q93204'], genre: ['Q93204'] })
    } },
    tv: { mode: 'what', icon: '📺', names: ['Television', 'Televizion', 'Fernsehen', 'Televizija'], subs: {
      sitcoms: S(['Sitcoms', 'Sitcom', 'Sitcoms', 'Sitkomi'], { prof: W, cls: ['Q5398426'], genre: ['Q170238'] }),
      series: S(['Series', 'Seriale', 'Serien', 'Serije'], { prof: W, cls: ['Q5398426'] }),
      miniseries: S(['Miniseries', 'Miniseriale', 'Miniserien', 'Mini-serije'], { prof: W, cls: ['Q1259759'] }),
      docseries: S(['Documentary series', 'Seriale dokumentare', 'Dokuserien', 'Dokumentarne serije'], { prof: W, cls: ['Q5398426'], genre: ['Q93204'] })
    } },
    books: { mode: 'what', icon: '📚', names: ['Books', 'Libra', 'Bücher', 'Knjige'], subs: {
      novels: S(['Novels', 'Romane', 'Romane', 'Romani'], { prof: W, cls: ['Q7725634', 'Q8261'], extra: '?item wdt:P7937|wdt:P31 wd:Q8261 .' }),
      classics: S(['Classics', 'Klasikë', 'Klassiker', 'Klasici'], { prof: W, cls: ['Q7725634', 'Q8261', 'Q571'], extra: '?item wdt:P577 ?pub0 . FILTER(YEAR(?pub0) < 1930)' }),
      poetry: S(['Poetry', 'Poezi', 'Lyrik', 'Poezija'], { prof: W, cls: ['Q7725634', 'Q5185279'], extra: '?item wdt:P7937|wdt:P31|wdt:P136 ?form0 . VALUES ?form0 { wd:Q5185279 wd:Q482 }' }),
      philosophy: S(['Philosophy', 'Filozofi', 'Philosophie', 'Filozofija'], null),
      history: S(['History', 'Histori', 'Geschichte', 'Historija'], { prof: W, cls: ['Q7725634', 'Q8261'], genre: ['Q1196408'] }),
      fantasy: S(['Fantasy', 'Fantazi', 'Fantasy', 'Fantastika'], { prof: W, cls: ['Q7725634', 'Q8261'], genre: ['Q132311', 'Q1814102'] }),
      crime: S(['Crime', 'Krim', 'Krimi', 'Krimi'], { prof: W, cls: ['Q7725634', 'Q8261'], genre: ['Q484154', 'Q208505'] }),
      scifi: S(['Science fiction', 'Fantastiko-shkencor', 'Science-Fiction', 'Naučna fantastika'], { prof: W, cls: ['Q7725634', 'Q8261'], genre: ['Q24925', 'Q3238422'] })
    } },
    arts: { mode: 'what', icon: '🎨', names: ['Arts', 'Arte', 'Kunst', 'Umjetnost'], subs: {
      paintings: S(['Paintings', 'Piktura', 'Gemälde', 'Slike'], { prof: W, cls: ['Q3305213'] }),
      sculptures: S(['Sculptures', 'Skulptura', 'Skulpturen', 'Skulpture'], { prof: W, cls: ['Q860861', 'Q179700'] })
    } },
    games: { mode: 'what', icon: '🎮', names: ['Games', 'Lojëra', 'Spiele', 'Igre'], subs: {
      video: S(['Video games', 'Lojëra video', 'Videospiele', 'Video igre'], { prof: W, cls: ['Q7889'] }),
      board: S(['Board games', 'Lojëra tavoline', 'Brettspiele', 'Društvene igre'], { prof: W, cls: ['Q131436'] }),
      strategy: S(['Strategy', 'Strategji', 'Strategie', 'Strategija'], null),
      adventure: S(['Adventure', 'Aventurë', 'Abenteuer', 'Avantura'], { prof: W, cls: ['Q7889'], genre: ['Q23916', 'Q2995278'] }),
      simulation: S(['Simulation', 'Simulim', 'Simulation', 'Simulacija'], { prof: W, cls: ['Q7889'], genre: ['Q1610017'] }),
      rpg: S(['Role-playing', 'Lojëra me role', 'Rollenspiele', 'Igre uloga'], { prof: W, cls: ['Q7889'], genre: ['Q744038'] })
    } },
    music: { mode: 'what', icon: '🎵', names: ['Music', 'Muzikë', 'Musik', 'Muzika'], subs: {
      songs: S(['Songs', 'Këngë', 'Lieder', 'Pjesme'], { prof: W, cls: ['Q7366', 'Q134556'] }),
      albums: S(['Albums', 'Albume', 'Alben', 'Albumi'], { prof: W, cls: ['Q482994'] }),
      classical: S(['Classical music', 'Muzikë klasike', 'Klassische Musik', 'Klasična muzika'], { prof: W, cls: ['Q2188189', 'Q105543609'], genre: ['Q9730'] })
    } },
    science: { mode: 'what', icon: '🔬', names: ['Science', 'Shkencë', 'Wissenschaft', 'Nauka'], subs: {
      discoveries: S(['Discoveries', 'Zbulime', 'Entdeckungen', 'Otkrića'], null),
      inventions: S(['Inventions', 'Shpikje', 'Erfindungen', 'Izumi'], null),
      theories: S(['Theories', 'Teori', 'Theorien', 'Teorije'], null),
      technologies: S(['Technologies', 'Teknologji', 'Technologien', 'Tehnologije'], null)
    } },
    sports: { mode: 'what', icon: '⚽', names: ['Sports', 'Sport', 'Sport', 'Sport'], subs: {
      sports: S(['Sports', 'Sporte', 'Sportarten', 'Sportovi'], { prof: W, cls: ['Q349', 'Q31629'] }),
      competitions: S(['Competitions', 'Gara dhe kampionate', 'Wettbewerbe', 'Takmičenja'], { prof: EV, cls: ['Q18608583', 'Q500834'] }),
      terms: S(['Sporting terms and rules', 'Terma dhe rregulla sportive', 'Sportbegriffe und Regeln', 'Sportski pojmovi i pravila'], null)
    } },
    geography: { mode: 'where', icon: '🗺️', names: ['Geography', 'Gjeografi', 'Geografie', 'Geografija'], subs: {
      countries: S(['Countries', 'Shtete', 'Länder', 'Države'], { prof: PL, cls: ['Q6256', 'Q3624078'] }),
      cities: S(['Cities', 'Qytete', 'Städte', 'Gradovi'], { prof: PL, cls: ['Q515', 'Q1549591', 'Q5119'] }),
      rivers: S(['Rivers', 'Lumenj', 'Flüsse', 'Rijeke'], { prof: PL, cls: ['Q4022'] }),
      lakes: S(['Lakes', 'Liqene', 'Seen', 'Jezera'], { prof: PL, cls: ['Q23397'] }),
      islands: S(['Islands', 'Ishuj', 'Inseln', 'Ostrva'], { prof: PL, cls: ['Q23442'] }),
      mountains: S(['Mountains and peaks', 'Male dhe maja', 'Berge und Gipfel', 'Planine i vrhovi'], { prof: PL, cls: ['Q8502', 'Q207326'] }),
      parks: S(['National parks', 'Parqe kombëtare', 'Nationalparks', 'Nacionalni parkovi'], { prof: PL, cls: ['Q46169'] }),
      landmarks: S(['Landmarks', 'Monumente të njohura', 'Wahrzeichen', 'Znamenitosti'], { prof: PL, cls: ['Q12518', 'Q4989906', 'Q12280'] })
    } },
    universities: { mode: 'where', icon: '🎓', names: ['Universities', 'Universitete', 'Universitäten', 'Univerziteti'], subs: {
      universities: S(['Universities', 'Universitete', 'Universitäten', 'Univerziteti'], { prof: PL, cls: ['Q3918', 'Q902104'] }),
      research: S(['Research institutions', 'Institucione kërkimore', 'Forschungseinrichtungen', 'Istraživačke ustanove'], { prof: PL, cls: ['Q31855'] })
    } },
    museums: { mode: 'where', icon: '🏛️', names: ['Museums', 'Muze', 'Museen', 'Muzeji'], subs: {
      museums: S(['Museums', 'Muze', 'Museen', 'Muzeji'], { prof: PL, cls: ['Q33506', 'Q207694'] })
    } },
    history: { mode: 'when', icon: '📜', names: ['History', 'Histori', 'Geschichte', 'Historija'], subs: {
      events: S(['Events', 'Ngjarje', 'Ereignisse', 'Događaji'], null),
      battles: S(['Battles and wars', 'Beteja dhe luftëra', 'Schlachten und Kriege', 'Bitke i ratovi'], { prof: EV, cls: ['Q178561', 'Q198'] }),
      treaties: S(['Treaties', 'Traktate', 'Verträge', 'Ugovori'], { prof: EV, cls: ['Q131569', 'Q625298'] }),
      empires: S(['Empires', 'Perandori', 'Reiche', 'Carstva'], { prof: EV, cls: ['Q48349'] }),
      civilizations: S(['Civilizations', 'Qytetërime', 'Zivilisationen', 'Civilizacije'], { prof: EV, cls: ['Q8432', 'Q28171280'] }),
      revolutions: S(['Revolutions', 'Revolucione', 'Revolutionen', 'Revolucije'], { prof: EV, cls: ['Q10931'] })
    } }
  };

  // Difficulty levels (FR-014, section 13.1): multiplier of the round score, and how well known
  // an answer must be (Wikipedia editions, × the category's factor below).
  var LEVELS = {
    easy:     { n: 1, mult: 1.00, min: 100, max: 100000, names: ['Easy', 'E lehtë', 'Leicht', 'Lako'] },
    standard: { n: 2, mult: 1.15, min: 50,  max: 99,     names: ['Standard', 'Standard', 'Standard', 'Standardno'] },
    advanced: { n: 3, mult: 1.30, min: 25,  max: 49,     names: ['Advanced', 'I avancuar', 'Fortgeschritten', 'Napredno'] },
    expert:   { n: 4, mult: 1.50, min: 12,  max: 24,     names: ['Expert', 'Ekspert', 'Experte', 'Ekspert'] }
  };
  var LEVEL_ORDER = ['easy', 'standard', 'advanced', 'expert'];
  // Works and things have fewer Wikipedia editions than famous people or places.
  var FAME_FACTOR = { person: 1, band: 0.7, work: 0.6, place: 1, event: 0.8 };

  // Filters (section 5). A period means, for people, the time they were active: aged 20 to 60 then
  // (the requirements ask for this meaning to be explicit).
  var PERIODS = [
    { id: 'any' }, { id: 'ancient', a: -5000, b: 499 }, { id: 'medieval', a: 500, b: 1499 }, { id: 'early', a: 1500, b: 1799 },
    { id: '1800s', a: 1800, b: 1899 }, { id: '1900s', a: 1900, b: 1949 }, { id: '1950s', a: 1950, b: 1979 }, { id: '1980s', a: 1980, b: 1999 }, { id: '2000s', a: 2000, b: 2100 }
  ];
  var REGIONS = [
    { id: 'any' }, { id: 'europe', cont: 'EU', qid: 'Q46' }, { id: 'balkans', codes: ['AL', 'XK', 'BA', 'ME', 'MK', 'HR', 'BG', 'GR', 'SI'] },
    { id: 'AL', codes: ['AL'], qid: 'Q222' }, { id: 'XK', codes: ['XK'], qid: 'Q1246' }, { id: 'BA', codes: ['BA'], qid: 'Q225' },
    { id: 'DE', codes: ['DE'], qid: 'Q183' }, { id: 'US', codes: ['US'], qid: 'Q30' }, { id: 'GB', codes: ['GB'], qid: 'Q145' },
    { id: 'FR', codes: ['FR'], qid: 'Q142' }, { id: 'IT', codes: ['IT'], qid: 'Q38' }
  ];

  // Never hidden answers (as in MBG Puzzles: nothing violent, hateful or rude is a secret word):
  // these people, adult content, and - as in the word game - Serbia.
  var EXCLUDE = {
    qids: ['Q352', 'Q855', 'Q23559', 'Q39464', 'Q1317', 'Q57290', 'Q41157', 'Q2412', 'Q33866', 'Q58096'],
    words: /hitler|stalin|mussolini|pol pot|bin laden|himmler|goebbels|terror|porn|massacre|genocide|holocaust|nazi/i,
    occ: ['Q488111'], genre: ['Q185529'], countries: ['RS']
  };

  function modeOf(cat) { return CATS[cat] ? CATS[cat].mode : null; }
  function catsOf(mode) { return Object.keys(CATS).filter(function (k) { return CATS[k].mode === mode; }); }
  function name(obj, lang) { var i = ['en', 'sq', 'de', 'bs'].indexOf(lang); return obj.names[i < 0 ? 0 : i]; }
  function sub(cat, s) { return CATS[cat] && CATS[cat].subs[s] ? CATS[cat].subs[s] : null; }

  return { MODES: MODES, MODE_ORDER: MODE_ORDER, CATS: CATS, LEVELS: LEVELS, LEVEL_ORDER: LEVEL_ORDER, FAME_FACTOR: FAME_FACTOR,
    PERIODS: PERIODS, REGIONS: REGIONS, EXCLUDE: EXCLUDE, modeOf: modeOf, catsOf: catsOf, name: name, sub: sub };
});
