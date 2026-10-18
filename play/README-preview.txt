MBG Puzzles - web preview (published at https://mbggames.github.io/play/)

The same game as the app (free edition), with these limits:
- the puzzles of the day (number and word, every language): free, as in the app
- one free normal game of Codebreaker and one of Word Puzzle every 24 hours
- no world list, nothing to buy; a "Web preview" strip on every screen

Switches: js/app/edition.js, MBG.PREVIEW
  playStatus: 'soon' -> "Join the test" (WhatsApp / e-mail, asking for the player's Gmail address)
              'live' -> "Get it on Google Play" (playUrl)
  testUrl:    paste Google Play's test opt-in link here once you have one
Texts of the preview in all ten languages: js/app/preview.js
Turn the whole preview off: site.json -> "webPreview": false
