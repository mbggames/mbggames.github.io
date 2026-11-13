/*!
 * MBG Who Am I? - the texts of the party game (forehead mode), [en, sq, de, bs].
 */
(function (root) {
  var R = root.MBG.Text.ROWS;
  var add = {
    'pt.title': ['Party: on the forehead', 'Festë: në ballë', 'Party: auf der Stirn', 'Žurka: na čelu'],
    'pt.intro': ['The classic from the films: one phone, two or more players. The player whose turn it is holds the phone to the forehead, screen facing the others. The others describe, mime or answer yes/no questions – the player guesses as many names as possible before the time runs out.', 'Klasikja nga filmat: një telefon, dy ose më shumë lojtarë. Lojtari në radhë e mban telefonin në ballë, me ekranin nga të tjerët. Të tjerët përshkruajnë, bëjnë gjeste ose u përgjigjen pyetjeve po/jo – lojtari gjen sa më shumë emra para se të mbarojë koha.', 'Der Klassiker aus den Filmen: ein Handy, zwei oder mehr Spieler. Wer dran ist, hält das Handy an die Stirn, der Bildschirm zeigt zu den anderen. Die anderen beschreiben, zeigen pantomimisch oder beantworten Ja/Nein-Fragen – der Spieler errät so viele Namen wie möglich, bevor die Zeit abläuft.', 'Klasik iz filmova: jedan telefon, dva ili više igrača. Igrač na redu drži telefon na čelu, ekranom prema ostalima. Ostali opisuju, pokazuju ili odgovaraju na da/ne pitanja – igrač pogađa što više imena prije isteka vremena.'],
    'pt.players': ['Players', 'Lojtarët', 'Spieler', 'Igrači'],
    'pt.player': ['Player {n}', 'Lojtari {n}', 'Spieler {n}', 'Igrač {n}'],
    'pt.add': ['Add a player', 'Shto një lojtar', 'Spieler hinzufügen', 'Dodaj igrača'],
    'pt.seconds': ['Time per turn', 'Koha për radhë', 'Zeit pro Zug', 'Vrijeme po potezu'],
    'pt.rounds': ['Turns per player', 'Radhë për lojtar', 'Züge pro Spieler', 'Potezi po igraču'],
    'pt.start': ['Start the party', 'Fillo festën', 'Party starten', 'Počni žurku'],
    'pt.pass': ['Pass the phone to {name}', 'Jepja telefonin {name}', 'Gib das Handy an {name}', 'Dodaj telefon igraču: {name}'],
    'pt.passText': ['Hold it to your forehead, screen to the others. Tap “Ready” – the clock starts.', 'Mbaje në ballë, me ekranin nga të tjerët. Prek “Gati” – ora fillon.', 'Halte es an die Stirn, Bildschirm zu den anderen. Tippe „Bereit“ – die Uhr läuft.', 'Drži ga na čelu, ekranom prema ostalima. Dodirni „Spreman“ – sat počinje.'],
    'pt.ready': ['Ready', 'Gati', 'Bereit', 'Spreman'],
    'pt.yes': ['✓ Got it', '✓ E gjeta', '✓ Erraten', '✓ Pogođeno'],
    'pt.skip': ['Skip ↷', 'Kalo ↷', 'Weiter ↷', 'Preskoči ↷'],
    'pt.tilt': ['Tip: tilt the phone down for “got it”, up to skip.', 'Këshillë: anoje telefonin poshtë për “e gjeta”, lart për ta kaluar.', 'Tipp: Handy nach unten kippen für „erraten“, nach oben zum Überspringen.', 'Savjet: nagni telefon dolje za „pogođeno“, gore za preskakanje.'],
    'pt.points': ['{n} points', '{n} pikë', '{n} Punkte', '{n} bodova'],
    'pt.over': ['Time!', 'Koha!', 'Zeit!', 'Vrijeme!'],
    'pt.results': ['Results', 'Rezultatet', 'Ergebnis', 'Rezultati'],
    'pt.again': ['Play again', 'Luaj përsëri', 'Nochmal', 'Ponovo'],
    'pt.winner': ['{name} wins! 🏆', '{name} fiton! 🏆', '{name} gewinnt! 🏆', '{name} pobjeđuje! 🏆'],
    'pt.names': ['Names this turn: {list}', 'Emrat e kësaj radhe: {list}', 'Namen in diesem Zug: {list}', 'Imena u ovom potezu: {list}'],
    'pt.loading': ['Shuffling the cards…', 'Po përzihen kartat…', 'Die Karten werden gemischt…', 'Miješaju se kartice…']
  };
  for (var k in add) R[k] = add[k];
})(typeof self !== 'undefined' ? self : globalThis);
