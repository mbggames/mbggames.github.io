/*!
 * MBG Puzzles - which edition this build is. Written by tools/apply-edition.js
 * (npm run sync); change it with MBG_EDITION=free|paid, not by hand.
 *   free - no limits, no subscription, no Google Play Billing (can be published from Kosovo)
 *   paid - free week, then one free game of each game per day, subscription unlocks both
 * WORLD_URL: the world top 20 server ('' = no world list), from MBG_WORLD_URL.
 * GOOGLE_CLIENT_ID: Google's Web client ID for MBG accounts ('' = no accounts), from
 * MBG_GOOGLE_CLIENT_ID. Accounts need the world server too.
 * EMAIL_LOGIN: MBG accounts with e-mail and password too, from MBG_EMAIL_LOGIN.
 */
(function (root) {
  root.MBG = root.MBG || {};
  root.MBG.EDITION = 'free';
  root.MBG.WORLD_URL = 'https://api.mbggames.com';
  root.MBG.GOOGLE_CLIENT_ID = '';
  root.MBG.EMAIL_LOGIN = true;
  // Web preview on mbggames.com/puzzles/play/ (see README-preview.txt): puzzles of the day + one
  // free game of each game per day; world top 20 and MBG account as in the app; nothing sold.
  root.MBG.PREVIEW = {
    playStatus: 'live', // 'review' = in review by Google (no test sign-up) · 'soon' = "Join the test" · 'live' = "Get it on Google Play"
    playUrl: 'https://play.google.com/store/apps/details?id=com.mbggames.puzzles',
    testUrl: '',          // '' = testers send their Gmail address first (WhatsApp / e-mail)
    optInUrl: ''   // where added testers register
  };
})(typeof self !== 'undefined' ? self : globalThis);
