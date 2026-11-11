MBG Puzzles - web preview (published at https://mbggames.com/puzzles/play/)

The same game as the app (version 1.11.0, free edition), with these limits:
- the puzzles of the day (number and word, every language): free, as in the app
- one free normal game of Codebreaker and one of Word Puzzle every 24 hours
- the world top 20 and the MBG account work as in the app (api.mbggames.com) - the privacy
  policy promises that an account can also be deleted in the web version
- nothing to buy; a "Web preview" strip on every screen

Switches: js/app/edition.js, MBG.PREVIEW
  playStatus: 'soon' -> "Join the test": the player sends their Gmail address (WhatsApp / e-mail),
                        then registers as a tester at optInUrl
              'live' -> "Get it on Google Play" (playUrl)
  testUrl:    a test link that works for everyone (an open test) - then "Join the test" opens it directly
  optInUrl:   Google Play's opt-in page of the closed test (only works for testers you have added)
Texts of the preview in all eleven languages: js/app/preview.js
Turn the whole preview off: site.json -> "webPreview": false

Updating to a new app version: replace everything here with the app's www folder, then put back
css/preview.css, js/app/preview.js, the MBG.PREVIEW block in js/app/edition.js and the three small
hooks (search the old files for "PREVIEW": js/app/app.js, js/app/access.js, js/app/home.js), plus
the two lines in index.html, word.html and codebreaker.html (preview.css, preview.js).
