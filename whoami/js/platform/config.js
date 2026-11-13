/*!
 * MBG Games - where the shared platform server is (filled in by the build, or by hand).
 *
 *   PLATFORM_URL  the MBG Games platform worker (server/ in this project): board, messages,
 *                 notifications, judging, ratings, online matches. Empty = demo mode: everything
 *                 works on this device only, and the screens say so.
 *   WORLD_URL     the MBG Puzzles server, where MBG accounts sign in (the same accounts for every
 *                 MBG game). Usually the same address (https://api.mbggames.com).
 *   GOOGLE_CLIENT_ID, EMAIL_LOGIN  as in MBG Puzzles.
 */
(function (root) {
  var MBG = root.MBG = root.MBG || {};
  MBG.PLATFORM_URL = MBG.PLATFORM_URL || "https://mbg-platform.merkur-bc4.workers.dev.";
  MBG.WORLD_URL = MBG.WORLD_URL || "https://api.mbggames.com";
  MBG.GOOGLE_CLIENT_ID = MBG.GOOGLE_CLIENT_ID || '';
  MBG.EMAIL_LOGIN = MBG.EMAIL_LOGIN || true;
  // the web version of the game (mbggames.com/whoami), for invitation links; empty = only the code
  MBG.WEB_URL = MBG.WEB_URL || 'https://mbggames.com/whoami';
  // the edition: 'free' (no limits, nothing for sale) or 'paid' (the Google Play version) - js/app/plans.js
  MBG.EDITION = MBG.EDITION || 'free';
  MBG.GAME_ID = 'whoami';
  // The other MBG games, for the links on the home screen. MBG Puzzles: the Play Store page once
  // it is published; its web version until then.
  MBG.GAMES = [
    { id: 'whoami', icon: '❓', url: 'index.html' },
    { id: 'puzzles', icon: '🧩', url: 'https://play.google.com/store/apps/details?id=com.mbggames.puzzles' }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
