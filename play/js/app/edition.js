/*!
 * MBG Puzzles - which edition this build is. Written by tools/apply-edition.js
 * (npm run sync); change it with MBG_EDITION=free|paid, not by hand.
 *   free - no limits, no subscription, no Google Play Billing (can be published from Kosovo)
 *   paid - free week, then one free game of each game per day, subscription unlocks both
 * WORLD_URL: the world top 20 server ('' = no world list), from MBG_WORLD_URL.
 */
(function (root) {
  root.MBG = root.MBG || {};
  root.MBG.EDITION = 'free';
  root.MBG.WORLD_URL = '';
  // Web preview on mbggames.github.io/play/ (see play/README-preview.txt):
  // puzzles of the day + one free game of each game per day, no world list, nothing sold.
  root.MBG.PREVIEW = {
    playStatus: 'soon',   // 'soon' = "Join the test" · 'live' = "Get it on Google Play"
    playUrl: 'https://play.google.com/store/apps/details?id=com.mbggames.puzzles',
    testUrl: ''           // Google Play test opt-in link, once you have one ('' = ask by WhatsApp / e-mail)
  };
})(typeof self !== 'undefined' ? self : globalThis);
