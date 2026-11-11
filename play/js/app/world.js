/*!
 * MBG Puzzles - the world top 20 (shared by the home screen and both games).
 *
 * Players who join see their best scores in a worldwide list with their player name and the
 * country they play from. The server is server/worker.js (Cloudflare); its address comes from
 * MBG.WORLD_URL (edition.js). Without an address the world list does not appear at all.
 *
 *  - Joining is a choice made per player name (a family can share one phone): a short sheet
 *    with the rules, a neutral "year of birth" question (the world list is for players aged
 *    16 and over; younger players can still look at it) and "I agree to the rules". The year
 *    of birth stays on the phone. A name answered as under 16 cannot try again.
 *  - The username of a signed-in MBG account (MBG.Account) is on the list through the account
 *    instead: no install id, no age question here (accounts are 16+), its own on/off switch on
 *    the server, and marked as an account on the list.
 *  - Only logged-in player names take part (not Anonymous, not "play without saving").
 *  - Sent, only for joined names: a random install id and secret (made on the phone at the
 *    first join), the player name, game, length, language, tries and seconds. The server works
 *    out the score and the country itself. Nothing is sent for anyone else; looking at the
 *    list sends no id unless a name on this phone has joined.
 *  - Wins made offline wait on the phone and are sent later; each win line shows its own result.
 *  - The main list shows the last two weeks (this week and last week, server version 1.6), filled
 *    up with older scores while fewer than 20 names played in that time.
 *  - Built for many players: a win is sent only when it beats that name's best of the week
 *    (same game, length and language - the server's week, Monday UTC); a daily puzzle is sent
 *    once and goes only to that day's board. Places are exact for the first 1,000 of a board,
 *    then shown as "top X %".
 *  - Names can be hidden on this phone by anyone, and reported by players on the list.
 *  - Settings › World list › Off removes that name's scores from the server.
 *  - Version 1.8: "Best puzzles of the day" (openDailyTop) - the best puzzles of the day of the last
 *    two weeks and of all time, with the number or word of each day (once that day is over
 *    everywhere), the score, who solved it and when. And a puzzle of the day solved by the signed-in
 *    MBG account is sent to the server (noteSolved) for its congratulation e-mail - also when the
 *    account is not on the world list, and only while its game e-mails are on.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG = root.MBG || {};
  var Shell = MBG.Shell;
  var BASE = String(MBG.WORLD_URL || '').replace(/\/+$/, '');
  var KEY = 'MBG.App.world';
  var MIN_AGE = 16;
  var WEEK_MS = 7 * 24 * 3600 * 1000;
  var GAMES = ['codebreaker', 'word'];
  var LENGTHS = [4, 5, 6, 7, 8];
  var WORD_LANGS = ['en', 'sq', 'bs', 'de', 'es', 'fr', 'tr', 'pl', 'pt', 'ar', 'ko'];
  var XK = '<path fill="#244AA5" d="M0 0h640v480H0z"/><path fill="#D0A650" d="M253 224.8s1.2-.8 1.6-.9l2-.6s1-.5 1.5-.5 1.6.6 2 1.1 2 1.4 2 1.4 1.2.4 1.5 0q.4-.6 1.3-.7.7-.2.6-.9c-.1-.7.2-.9.6-1.4.5-.5 1.3-.8 1.3-.8s1.2-.5 1.3-1.2 1.3-1.2 2-1.3c.7 0 0-.4 1.8-.2 1.7.2 2-.4 2-.9.1-.5 0-1 1.1-1q1.6.4 1.6-.4c0-.6 1-1-.7-1.4-1.8-.5-1.6-.1-1.8-1 0-.7 0-.6-1.1-.7s-.6-.7-.7-1.3q-.2-.9-.6-1.3c-.3-.4-.9-.4-.9-1s-.1-1-.7-1q-1 .1-1-.5 0-1 .8-1 1-.2 1-1.2c-.2-.6-.2-1.9-.2-1.9l.9-1s2.6-2.1 2.8-2.5 1.1-.7 1.5.1.6 1 1 1.4c.3.4 1.3.1 1.5-.3s.3-1.9.9-2.7q1-.9 1.1-1.8.2-1.3 1.2-1.2c.6 0 1-.9 1-1.4q0-.8 1.2-1.2c.8-.1 1.3-.6 1.6.2s.6.7 1.1 1q1 .6 1.8.3c.5-.4.7-1 1.3-.7q.9.5 1.2-.7l.3-1.9s.1-.5 1.1-.5.3-.6.8-1 .6-.8 1.3-.6 1.8-.3 1.3-1-1.8-1.6-1.1-2.4 1-2 .3-2.2c-.7-.1-1.8.1-1.9-.6-.1-.8-.4-1.4.5-1.5s2.2-.1 2.7-.5 1.8-.7 1.8-1.8.4-1.3.6-2 .1-2-.5-2.6-1.4-1.6-1.5-2q-.3-.7-1.6-1.3c-.8-.2-1.6-.4-1.6-1s.6.1.6-1.6-1.1-2-1.1-2l-1.7-1s-3-.8-3.8-.8-1.8-.8-.9-1.4 1.2-1.5.9-2.2c-.4-.7-.6-1.3-1.9-1.6q-2-.3-1-1.4c.5-.7.7-1.3 1.4-.7.6.5 1.8.7 2.7.3s1.3-.8 1.8-.3 1 .8 1.7.2 2-.8 2.6-.5c.5.4 2 .3 2.4 0s1.4-1 1.4-1.3.6-1.2 1.1-1.5 1.3-1.4 1.9-1.4.8-.7.8-1c0-.5.5-1.4.6-1.7s1.2-.8 2 0c.9.5 2 .8 2 .8s1 .2 1.7 0a2 2 0 0 1 2.1 0c.9.6 2 .6 2 .6l.3-1.3c0-.4.2-1.2-.3-1.5s-1-.7-.1-1.4 1-.5 1.9-.5l2.2.1c.7 0 1.8.7 1.8 1.3q.1.8 1 1.4c.6.3 1.3.6 1 1.2q-.3 1 .6.8 1 0 .9.9-.1.7 1 1 1 .4 1 1.2c0 .8-.2.9 0 1.4l1 1.4s1.3 1.5-.4.7c-1.6-.7-2-1-2.5-1l-1 .5-1.3.2c-.6 0-1.2 1.2-.2 1.4q1.3.2 1.2 1.2c-.1 1-.3.5-.8 1s-.8.2-1.6.2-1 .7-1 1.3.3.6.6 1q.6 1 1.6.2c.5-.5 1-.9 1.3.1s.9 1 1.5 1q.9.1 1.6-.4 1-.5 1.3.9.4 1 1.3 1.3t1 1q.3 1 1.1.5 1.1-.7 1.9-.1l.9 1.2v1.1l2.3.8.2 1q0 .6 1 .4h1.6s.8-.3.8-1q0-.9 1-.8c.5 0 1.8.5 2.1-.2s1.4-.8 2.2-.5l3 1.2s-.3 0 .4 1.1 2 1.1 2 1.1 0 1 .3 1.4 1.3.6 1.8.2q1-.8 2.1-1c1.1-.2 1.2 0 1.2-.4s-.7-.7-.7-1.4.7-.6.8-1.3c.1-.6.8 0 1.3.4s1 .8 1 1.2c0 .5 1 2 1.5 2.2s2.1.3 2.6-.2 1.6-.8 1.5.5-.4 1.4.4 1.8 1 2 .3 2.4-1 .5-1 1.2-.2 1.6.4 2q1 .7 1 1.2c0 .5.6 2.4.6 2.4s.4 1.9.2 2.3c0 .5-.3 1.2.7 1.1q1.4-.3 1.3.7c-.1 1 .4 1.2-.2 1.5s-1 1.4-.4 1.6q.9.3 1.2 1c.1.4 1 1.2 1.6.7s.7-.6 1.2-.7.8-.4.3-1q-.7-.8-.1-1.4c.5-.3.7-1.3.7-1.3s.7-1 1.5 0 1 .6 1.5.6.8.5.8 1 1.2.5 1.2 1.3l.2 3s0 1.1.7 1.5q1 .6.2 1-.3 1-.2 2c.1 1 .2.5-.3 1q-1 .7-.5 1.6c.3.6.2 1 1.1 1.8 1 .7.9 1 .9 1.6 0 .5.9 1.3.9 1.8s.7 1.2 1.3 1.3 1.2 1 1.2 1.6l.1 1.9s0 .3.6.3 1.2.8 1.4 0c.2-1 1-1 1.4-1.3s1.4-.6 1.9-.3 1 .3 1.5.3l2.6.1s.6 0 1 .8c.3.8 1.3 1.8.8 2.2s-.6 1.3 0 1.3 1.5 0 1.5.5q-.2 1 .7.7.8-.5 1.1 0t1.3.7q.8.4 1.2-.3c.3-.4 1.7-.8 1.7-.8s1.8-.5 2.5-.3l1.7.7s.4 1 .2 1.7-.5.5-.2 1.5-.3 1-.7 1q-.9-.5-1 .7c0 .8-.4 1-.4 1.8s0 .6-.5 1q-.8.6.1 1c.7 0 .5.8.5 1.2l-.1 1.4s0 .5-.7.5-1.5 0-1.6.5-1 1.3-.3 1.9q1 .7.1 1c-.4.3-.8 1.3.2 1.6q1.2.5.2 1.1c-.6.4-1.7.8-1.7 1.4s-.3.6-1 .7q-1.2.3-.2 2c.8 1.1 1 1 1.6 1s.6-1 .6-1l2.5.2q1 0 1.9-.3c.5-.4 1.7-.9 1.7 0s.3 1 .8 1.3c.6.5.7.1 1.2.8.5.6.6 0 1-.7.3-.7 1-1.4 1.6-.6.5.9.5.6 1.2.6s1 .4 1 .9.6.5 1.5.4.9.5 1.2 1 .5.4 1 .4q.7.1 1.2-.4c.4-.4.8-1 1.3-.3s1.4.5 1.6-.2c.3-.8 1.3-1.4 1.9-.6.6.9 1 .9 1.6 1q1-.2 1.7.6c.4.6 1.5 1.4.7 2s-1.7 1.5-1 1.8a3 3 0 0 1 1.6 1c.5.4 2 .7 2.7.8.7 0 1.2.2 2-.5s1.7-.6 1.6.3.3 1.8.3 1.8.6 1.4.6 1.9-.1.6 1 1.3c1 .6.8 1 1.7.4q1.1-.8 1-1.5v-1.7s1.2-.2 1.6-.5c.5-.4 2.3-1.3 2.8-.9s1 .3 1.5.1l1.9-.2c.4 0 1.2.1 2.2-.6.9-.8.9-.6 1.5 0q.7.8.2 1.6c-.4.4 0 1.3.8 1.3s1 .5 1 1l.3 1.7c0 .4 0 .7 1.4 1 1.2.3 1 1 1.2 1.6q.6.9-.4 1c-1 .1-1 .3-1 .8-.2.5-1.2.7-1.2.7l-1-.2s-.8 0-1.1.4-1 1.3-.6 2q.7 1.1 0 1.6c-.4.3-.7 1.9-1.1 1.6-.5-.4-1 0-1.5.3s-.4 1.7.5 2.2q1.4 1.1 1.2 1.3l1 1.6s-.3.3-.5.9c-.3.5-1 1.6-.3 1.8s.4 1.4-.3 1.4-1.5-.4-1.6.5-.5.6-1.2.5-2.4-.5-2.9.3-.6 1.2-1.4 1.1-.5 1.3-.2 1.8l1 1.3s.7.5.7 1.6q-.1 1.4-1 .2c-.4-.7-1.3-.6-1.4.2s-.3 2.2-1 2.2q-1.2 0-1.6.6c-.3.4-.9 1.2-.9 1.6s-.1.9-.7 1-.7 1.2-.7 1.2-1.4.3-1.5.8.1 1.4-1 1.5a3 3 0 0 0-2.2 1.4q-.7.7 0 1.5c.7.8.8 2.2 1.4 2.5q.9.3.9 1.3c-.1.9-.8 1.5.1 1.5q1.6-.1 1.2 1c-.4.7-.4.8-1 1.1-.8.4-1.1.4-1.1 1.2s.2.9-.4 1.2-.6.7-.6 1.4-.2.4-.9 1.1q-1.2 1-2.2.6c-1-.4-.7-.2-.8-.9s-1.1-.6-1.7-.5-1.4.7-1.4.7-1 .7-.6 1.2.2 1.4-.6 1.3-2.6.8-3.2-.1-2.2-1.6-2.5-.3c-.2 1.2.7 1.1.6 2.4s-.3 1.3-.8 1.7q-.5.6-.6 1.3c0 .5-.2 1.7.6 2.1s1.2 1.6 1.2 2.3q-.2 1.1.8 1.3 1.5.2 1.6-.9c.1-.7 1.7-1.2 1.9.3q-.2 2.1.7 2.9c.5.6 1 1.5 1.5 1.8s1.2 3 1.2 3c-1.1.3-1.4 1.8-2.1 2-.4.2-.9 0-1.3.3q-.1.6-.6.8c-.9.4-.7-.9-1.8-.4-.9.4-1 1.5-2.3 1-.7-.2-1.1-3-1.3-3.6l-1.1-1.8c-.8-1.2-2.3 0-2.8-.4-.8-.5-.5-1.4-1.7-1.5-2.4-.2-.7 1.5-1.7 1.8-2 .7-2-1.8-3.4-.6-.5.4 1 .7.6 1.4-.3.6-1.7 1.6-1.7 2.3.2 1 1.2 1.3 1.5 2 1 2.3-.5 3.8-2.7 2-1.2-.9-1.5-2.7-3.3-2.5l-1 .5c-.5 0-.8-.4-1.3-.3-.7.3 0 .8-.2 1.2 0 0-1 .7-1 1-.6.6-.4 1.2-1.2 1.8-.6.5-1.1.2-1.8 1-.7.7-.8 1.9-1.7 2.6-.5.4-.8-1.1-1.4-.1l-.2.4q-.3.4 0 .7c1.2 2.4-1.4 3.2-2.2 4.9-.3.7.6 1.3.3 1.9l-1.5 1.7c0 .2-.2.8-.4 1s-1 0-1 .4.8.7 1 .9-.2.7 0 .8c1.2 1.3.5.9 1.1 2 .1.2.5-.1.7.3s-.4.4-.2.8c0 .2 1 1.4 1 1.4 0 .4-1.8 1.2-2.2 1.2-1.1 0 1-2.2-.8-2.2-.8 0-.9 1.7-1 2h-1c-1.2 0-2 1.4-2.4 1.5s-1-.2-1.5 0c-.4 0-1 .5-1.4.5q-.4 0-.7-.4c-.5-.3-1.5-.4-2-.6-.4 0-1 .4-1.2.3-.3-.2.3-1-.6-1.4l-.7-1.7q.6-1.5.5-3.1c-.2-1.1-2-2-2.4-3-.3-.6-.6-2.4-1.3-2.8a6 6 0 0 1-1.8-2.2c0-.2.3-.6 0-1q-.6-.4-1-1c-.1-.4 0-1.8-.5-2.1s-4-.8-5-.9q-.6 0-1-.3l-.6-.7-1 .2h-1c-1.1.7-1.4 1.7-2.5 2.6-1.1.8-2.3.8-3.4 1.7-.7.6-1.2 2.1-1.9 2.8-.3.3-.7 0-.8.1l-2 1.8q0 .3-.2.5l-1.3.4h-1.2c-.5.2-.5.8-2.5 1.2l-.5.3-.6.5h-.9c-.5 0-.8.5-1.2.5-1 .2-2.8-.5-3.6-.1-.5.1-1.8 1.7-2.3 1.8q-.4.1-1-.1l-.6 2.2-2.4 2.1-.8 1q-.5.5-1 .5l-1.6-.4c-.8-.2-3.3-.3-4-.1-.9.1-.6 2.4-2.6 2.6l-3.3.4c-.1 0-.8-.4-1.5-.3-.3.1-1.1 1-1.1 1.2v.5l.2.4c-.4.5-1.4 1.3-1.7 2l-.4.4c-.2.2-1.6.7-1.7.9-.3.8 1 1.6.8 1.9-.3 1-1.7 2-2.2 3-.1.4.5 1.7.5 2.1q-.5 2.1-.5 4.1l.2 1.7.7.5 1.8 3.6c.3 2.2-3 1.4-1 3.6q.2.6.8 1l2.8 2.3c0 .4-2 .7-2.3 1-1 1-1.7 2.6-2.6 3.6-.6.5-1-.1-1.8 1.3-.2.5 0 1.6-.3 2-.5.4-.8-.2-1.3 0-.2 0-.3.7-.5.8-.5.5-5.2 3-5.6 2.7-.2-.1-.5-.9-.5-1.1q-.1-.6-.6-1c-1.2-1-3-1.3-4.2 0l-.7 1-2 1.6-.5.5c-.5 0-1.6-1.3-2-1.7-.4-.6-2-2-2.1-2.7 0-2.4-1.9-4.9-2.6-7.2h1.1c1.3-.9 1-3 3.3-2.2.3-.4.3-.8.8-1l.7-.5c.8-1.2 1.7-5.8.9-7-.7-1-1.5-1-2-2.7q-.1-.7 0-1.6l-1-3.1-.7-.7-.2-3.1c-.7-2.2-3.4-3.5-3.5-3.8l-1-1.7-.6-1.6c-.1-.3-.6-.6-.6-.9 0-.6 1.6-1.7 1.5-2.7 0-.3-1-1.3-.8-1.8s1.2-1.8 1.2-2.5c0-.8-1.6-2.6-1.8-3.4-.1-.5.6-.8.4-1.1s-1.8-1.9-2-2.3c-.3-.3.5-.7 0-1.3-.6-.5-.1-.4-.3-.8l-1-1.5c-.2-.5-1.6-5.5-1.5-5.8q-.5-.4-.9-1l-.4-1.2s-1.6-.5-1.9-1c-.2-.3-.3-1.6-.7-2.2l-.7-.4-.3-.7c-.5-.6-1.4 0-2-2.4q-1.4-.8-2.4-1.8l-.4-.4q-1-.2-2-.7c-.3 0-1.8 0-2-.2l-.4-.8c-.8-.1-2.2 0-2.9-.6-.5-.5-.6-2.8-1.6-2.5h-.4c-.7-1-2.9-1-3.8-1.6-.2-.1-1 0-1-.2l.1-1.3-1.1-1.4c-.9-.2-.6-.3-1-.6-1.5 0-1.7.2-2.6 1q-.4.3-1 .4c-.5.3-.6 1.2-1.3.8l-.6-.5c-.4-.4-.6-.2-.8-.8-1.2-.7-4.5 1.5-5.2 0-.6-.3-1 0-1.5-.4-.2-.2.7-3-1.7-4l1.6-1.1q.2-.6 0-1c0-.5.3-1.4.2-1.7l-.5-1-.2-1.2-.8-.4q-1-.6-1.7-1.4l-.4-.5c-.4-.3-1.8-.8-1.8-1.4l.4-.5q0-.5.3-.8c.6-1 2.1-.5 1.9-2.2-.1-.8-.7-1.4-.8-2.2l-.5-.7c-1.5-.1-1.3-1.6-1.8-2-1.5-1-2.7-.4-1-2.4.2-.7-1.5-1.8-1.8-2.1-.6-.6-.3-1.9-.6-2.5 0-.3-1.1-.9-1.4-1.3l-.5-1v-.1q.4-.6 0-1c-.1-.3-.6-.2-.7-.4q-2-1.6-4.9-2.5c-.5-.2-.3-.6-.8-.8l-3-1.2c-.2 0-.4-1.1-.6-1.5l-.9-1c0-1-.6-1-1.4-1.6v-.6l.6-2.1c.1-.4.6-.8.5-1.2l-.4-2.3c-.8-2-1.7-1.8-1.2-4.5q-.2-.8.3-1.4l.2-.3 1.2-.9c.4-.6.7-1.9 1.2-2.3l1.8-1.2c.2-.2.4-.9.3-1.2l-1.2-.2-1.1-.4-.3-.5-.2-.2q-.8-.1-1.4-.5l-1.7-.5c-1-.5-2-2-2.9-2.2-1.2-.3-2 .1-3.2.2-.7 0-.7-.4-1.3-.6-.8-.3-.2.4-2-.2-.3-.2 0-.8 0-1h-1c-1.4-.4-.9-1.8-1.3-2.7-.1-.2-.8-.2-1-.2l-.2-.2.2-.1c.2-.4-.7-1.4-.7-1.6.1-.3 2-.6 2.2-.6q0-.4-.2-.7.1-.8.5-1.7v-.2c-.6-.3-.7-.7-1.2-1q.1-.4.4-.7c.9-2.5 2.3-.5 3.5-2.8l.6-1.1h.2q.4.1.8 0l.8-.3h.5c2.2-.4 1.7-1.2 3-2.1.4-.3 1.4-.4 1.8-.6q.7.6 2.1 1.4c.7.2 3 .7 3.4 1 .5.2.6.8 1 1 1.3.8.5-.4 1.8-.2s2.3 1.4 3.5 1.9l1-.1c.3-.1 2.3-.5 2.5-.4l.8.3c.3.1.5-.5.8-.5.8.2.8.5 2 .4 0 0 .6-3.3 1.2-3.4.3-.1 1.2.7 1.4.8.4.1 0-.7 0-.7-.2-.3-.8-2.3-.7-2.5l.8.1q1-.2 2-.9l1-1.5c.1-.2-.2-.8 0-1l.9-.6c.4-.4.4-1 1-1.3 2-.2 2.7-1.8 4.6-2h.6l.4.6c0 .1 1.3.9 1.5.8q.3-.1.5-.4c.3.1 1.4-.5 1.5-.9l-.1-.6 1.6-1.2h1.4q.2.4.5.6h1.2c.2 0 .3-.5.7-.5"/><path fill="#FFF" d="M351.9 73.4 368 123l-42.2-30.7H378L335.8 123zm62.8 11.1 16 49.6-42.1-30.7h52.1l-42.2 30.7zm59.9 21.8 16 49.6-42.1-30.7h52.1L458.4 156l16.2-49.6zM288.1 73.4 272 123l42.2-30.7H262l42.2 30.7zm-62.8 11.1-16 49.6 42.1-30.7h-52.1l42.2 30.7zm-59.6 21.8 16.2 49.6-42.2-30.7h52.1l-42.2 30.7z"/>';

  function t(k, p) { return Shell.t(k, p); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(n) { return MBG.AppText.num(Shell.getLang(), n); }
  function keyOf(name) { return String(name || '').normalize('NFC').trim().toLowerCase(); }

  /* --------------------------------------------------------- local state --- */
  // { player, secret, names: { key: { name, joined, birthYear, young } }, queue: [item],
  //   pending: [item], results: { ref: result }, blocked: [pid],
  //   best: { 'name|game|length|lang': { w: week, s: score } }  (this week's best sent) }
  function load() {
    var s = null;
    try { s = JSON.parse(Shell.store.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    if (!s.names || typeof s.names !== 'object') s.names = {};
    ['queue', 'pending', 'blocked', 'solved'].forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    if (!s.results || typeof s.results !== 'object') s.results = {};
    if (!s.best || typeof s.best !== 'object') s.best = {};
    return s;
  }
  var state = load();
  function save() { try { Shell.store.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function randomId() {
    var b = new Uint8Array(18);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(b);
    else for (var i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  /** The install id and secret: created only when the first name joins. */
  function identity() {
    if (!state.player || !state.secret) { state.player = randomId(); state.secret = randomId(); save(); }
    return { player: state.player, secret: state.secret };
  }

  function enabled() { return !!BASE; }

  /* ------------------------------------------- this week's best (sent) --- */
  /** The server's week: weeks since 1970, starting on Monday, UTC. */
  function weekNow() { return Math.floor((Math.floor(Date.now() / 86400000) + 3) / 7); }
  function bestKey(i) { return [keyOf(i.name), i.game, i.length, i.lang || ''].join('|'); }
  function weekBest(i) { var b = state.best[bestKey(i)]; return b && b.w === weekNow() ? b.s : 0; }
  function noteBest(i, score) {
    var w = weekNow(), k = bestKey(i), b = state.best[k];
    if (!b || b.w !== w || score > b.s) state.best[k] = { w: w, s: score };
    Object.keys(state.best).forEach(function (x) { if (!state.best[x] || state.best[x].w < w) delete state.best[x]; });
  }
  function entry(name) { return name ? state.names[keyOf(name)] || null : null; }
  function ageOf(e) { return e && e.birthYear ? new Date().getFullYear() - e.birthYear - 1 : null; }   // birthday may still come
  /** The account (MBG.Account) when signed in, else null. */
  function account() { var A = MBG.Account; return A && A.signedIn() ? A : null; }
  function isAccountName(name) { var A = account(); return !!(A && A.isMine(name)); }
  function isYoung(name) {
    if (isAccountName(name)) return false;
    var e = entry(name); return !!(e && (e.young || (ageOf(e) !== null && ageOf(e) < MIN_AGE)));
  }
  function isJoined(name) {
    if (isAccountName(name)) return enabled() && account().world();
    var e = entry(name); return enabled() && !!(e && e.joined) && !isYoung(name);
  }
  /** True when any name on this phone is on the world list. */
  function anyJoined() {
    if (!enabled()) return false;
    if (account() && account().world()) return true;
    for (var k in state.names) if (state.names[k].joined && !isYoung(state.names[k].name)) return true;
    return false;
  }
  function currentName() {
    var u = Shell.getUser();
    return u && u.mode === 'registered' ? u.name : null;
  }

  /* ---------------------------------------------------------- server calls --- */
  function api(path, body, session) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
    var opts = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { headers: {} };
    if (session) opts.headers.Authorization = 'Bearer ' + session;
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(BASE + path, opts).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'server' }; }).then(function (j) { j.status = r.status; return j; });
    }).then(function (j) { clearTimeout(timer); return j; }, function () { clearTimeout(timer); return { ok: false, error: 'offline' }; });
  }

  var listeners = [];
  function notify(evt) { listeners.forEach(function (fn) { try { fn(evt); } catch (e) { /* ignore */ } }); }

  function resultOf(res, item) {
    if (res.ok) return { status: 'sent', ranks: res.ranks, score: res.score, daily: item && item.daily ? item.daily : undefined };
    if (res.error === 'name') return { status: 'name' };
    if (res.error === 'taken') return { status: 'taken' };
    return { status: 'refused', error: res.error };
  }

  /** Sends the wins waiting on the phone, oldest first, and records each one's result. */
  var flushing = null;
  function flush() {
    sendSolved();
    if (!enabled() || !state.queue.length) return Promise.resolve();
    if (flushing) return flushing;
    var step = function () {
      if (!state.queue.length) return Promise.resolve();
      var item = state.queue[0];
      // A win of the account's username goes with the account's session; others with the install's key.
      var session = null;
      if (item.acct) {
        var A = account();
        if (!A || !A.isMine(item.name) || !A.world()) { state.queue.shift(); save(); return step(); }   // signed out or left
        session = A.session();
      } else if (!state.player) { state.queue.shift(); save(); return step(); }
      var body = { name: item.name, game: item.game, length: item.length, lang: item.lang, attempts: item.attempts,
        hints: item.hints || 0, seconds: item.seconds, daily: item.daily || undefined, mode: item.mode || 0 };
      return api('/api/score', session ? body : Object.assign(body, identity()), session).then(function (res) {
        if (res.error === 'offline' || res.error === 'server' || res.error === 'rate') return;     // try later
        state.queue.shift();
        state.results[item.ref] = resultOf(res, item);
        if (res.ok && !item.daily && typeof res.score === 'number') noteBest(item, res.score);
        var refs = Object.keys(state.results);
        if (refs.length > 60) refs.slice(0, refs.length - 60).forEach(function (r) { delete state.results[r]; });
        save();
        notify({ type: 'sent', item: item, result: state.results[item.ref] });
        if (res.error === 'secret' || (res.error === 'banned' && !item.acct)) { state.queue = state.queue.filter(function (i) { return i.acct; }); save(); return; }
        if (res.error === 'banned' || res.error === 'session') { state.queue = state.queue.filter(function (i) { return !i.acct; }); save(); }
        return step();
      });
    };
    flushing = step().then(function () { flushing = null; }, function () { flushing = null; });
    return flushing;
  }

  /** What became of one win (by its ref) after a flush. */
  function settle(ref) {
    return flush().then(function () {
      if (state.results[ref]) return state.results[ref];
      var waiting = state.queue.some(function (i) { return i.ref === ref; });
      return { status: waiting ? 'queued' : 'refused' };
    });
  }

  /**
   * A game was won. info: { ref, game, user: {mode, name}, length, lang, attempts, hints, seconds, score, daily,
 *   gameMode (1.7: the difficulty bits of the game, see MODE in the engines) }
   * (daily: the number of the daily puzzle, for a daily puzzle).
   * Resolves { status: 'disabled'|'young'|'anonymous'|'first-try'|'not-joined'|'kept'|'sent'|'queued'|'name'|'refused',
   *   ranks, best }  - 'kept': not sent, it does not beat this week's best (best).
   */
  function submit(info) {
    if (!enabled()) return Promise.resolve({ status: 'disabled' });
    noteSolved(info);
    var u = info.user || {};
    if (u.mode !== 'registered' || !u.name) return Promise.resolve({ status: 'anonymous' });
    if (isYoung(u.name)) return Promise.resolve({ status: 'young' });
    if (info.attempts < 2) return Promise.resolve({ status: 'first-try' });
    var item = {
      ref: String(info.ref || randomId()), at: Date.now(), name: u.name, game: info.game, length: info.length,
      lang: info.game === 'word' ? info.lang : '', attempts: info.attempts, hints: Math.max(0, info.hints || 0),
      seconds: Math.max(0, Math.round(info.seconds)), daily: info.daily ? Number(info.daily) || 0 : 0,
      mode: info.daily ? 0 : Math.max(0, Math.min(3, Number(info.gameMode) || 0)),
      acct: isAccountName(u.name)
    };
    if (!isJoined(u.name)) {
      // Kept for a week, so "Put this score on the world list" can still send it after joining.
      state.pending = state.pending.filter(function (p) { return Date.now() - p.at < WEEK_MS; }).concat([item]).slice(-10);
      save();
      return Promise.resolve({ status: 'not-joined' });
    }
    // Only a score better than this week's best of the name (same game, length, language) is sent.
    var best = item.daily ? 0 : weekBest(item);
    if (best && info.score > 0 && info.score <= best) return Promise.resolve({ status: 'kept', best: best });
    state.queue.push(item);
    state.queue = state.queue.slice(-30);
    save();
    return settle(item.ref);
  }

  /**
   * Version 1.8: a puzzle of the day won by the signed-in MBG account goes to the server for the
   * congratulation e-mail (game, language, day, tries, hints, seconds - nothing else). Kept on the
   * phone while offline (2 days at most), sent once.
   */
  function noteSolved(info) {
    var A = account(), u = info.user || {};
    if (!info.daily || !A || !A.isMine(u.name) || (A.remind && !A.remind())) return;
    state.solved = state.solved.filter(function (x) { return Date.now() - x.at < 2 * 86400000; }).concat([{
      at: Date.now(), user: A.username(), game: info.game, lang: info.game === 'word' ? info.lang : '', n: Number(info.daily) || 0,
      attempts: info.attempts, hints: Math.max(0, info.hints || 0), seconds: Math.max(0, Math.round(info.seconds))
    }]).slice(-6);
    save();
    sendSolved();
  }
  var sendingSolved = null;
  function sendSolved() {
    if (!enabled() || !state.solved || !state.solved.length) return Promise.resolve();
    if (sendingSolved) return sendingSolved;
    var step = function () {
      var x = state.solved[0];
      if (!x) return Promise.resolve();
      var A = account();
      if (!A || !A.isMine(x.user) || Date.now() - x.at > 2 * 86400000) { state.solved.shift(); save(); return step(); }
      return api('/api/account/daily', { game: x.game, lang: x.lang, n: x.n, attempts: x.attempts, hints: x.hints, seconds: x.seconds }, A.session())
        .then(function (res) {
          if (res.error === 'offline' || res.error === 'server' || res.error === 'rate') return;     // try later
          state.solved.shift();
          save();
          return step();
        });
    };
    sendingSolved = step().then(function () { sendingSolved = null; }, function () { sendingSolved = null; });
    return sendingSolved;
  }

  /** After joining from a win line: send that name's waiting wins and report on one of them. */
  function sendPending(name, ref) {
    var key = keyOf(name);
    var mine = state.pending.filter(function (p) { return keyOf(p.name) === key && Date.now() - p.at < WEEK_MS; });
    mine.forEach(function (p) { p.acct = isAccountName(p.name); });
    state.pending = state.pending.filter(function (p) { return keyOf(p.name) !== key; });
    state.queue = state.queue.concat(mine).slice(-30);
    save();
    return ref ? settle(String(ref)) : flush();
  }

  /** The language of the word of the day on a board: the one chosen, else the app's. */
  function dayLang(q) { return q.lang || Shell.getLang(); }
  function top(q) {
    var p = ['game=' + q.game, 'length=' + (q.length || 0), 'lang=' + (q.lang || ''), 'period=' + (q.period || 'week')];
    if (q.period === 'day') {
      p = ['game=' + q.game, 'lang=' + (q.game === 'word' ? dayLang(q) : ''), 'period=day',
        'n=' + (MBG.Daily ? MBG.Daily.dayNumber() : 1)];
    }
    if (anyJoined() && state.player) p.push('player=' + encodeURIComponent(state.player));
    var A = account();
    return api('/api/top?' + p.join('&'), null, A ? A.session() : null);
  }

  /** Takes one name off the world list (its scores are deleted on the server). */
  function forgetLocal(key) {
    Object.keys(state.best).forEach(function (k) { if (k.split('|')[0] === key) delete state.best[k]; });
    state.queue = state.queue.filter(function (i) { return keyOf(i.name) !== key; });
    state.pending = state.pending.filter(function (i) { return keyOf(i.name) !== key; });
  }
  function leave(name) {
    var key = keyOf(name);
    if (isAccountName(name)) {
      return account().setWorld(false).then(function (res) {
        if (res.ok) { forgetLocal(key); save(); notify({ type: 'left', name: name }); }
        return res;
      });
    }
    if (!state.player) {
      if (state.names[key]) state.names[key].joined = false;
      save();
      return Promise.resolve({ ok: true });
    }
    return api('/api/forget', Object.assign({ name: name }, identity())).then(function (res) {
      if (res.ok) {
        if (state.names[key]) state.names[key].joined = false;
        forgetLocal(key);
        save();
        notify({ type: 'left', name: name });
      }
      return res;
    });
  }

  /**
   * A player name of this phone became an MBG account's username: if it was on the list through
   * this phone's install key, that entry is removed (the account's own entry replaces it).
   */
  function adopt(name) {
    var key = keyOf(name), e = state.names[key];
    forgetLocal(key);
    save();
    if (!e || !e.joined || !state.player) return Promise.resolve({ ok: true });
    return api('/api/forget', Object.assign({ name: name }, identity())).then(function (res) {
      if (res.ok) { e.joined = false; save(); }
      return res;
    });
  }
  function report(pid) {
    var A = account();
    if (A && A.world()) return api('/api/report', { pid: pid }, A.session());
    return api('/api/report', Object.assign({ pid: pid }, identity()));
  }
  function block(pid) {
    if (state.blocked.indexOf(pid) === -1) state.blocked.push(pid);
    state.blocked = state.blocked.slice(-200);
    save();
  }

  /* ---------------------------------------------------------- flags, names --- */
  function flag(code) {
    var span = el('span', 'wl-flag');
    if (!code) { span.textContent = '🌐'; return span; }
    if (code === 'XK') {
      span.innerHTML = '<svg viewBox="0 0 640 480" aria-hidden="true">' + XK + '</svg>';
      span.classList.add('svg');
      return span;
    }
    span.textContent = String.fromCodePoint.apply(null, code.split('').map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; }));
    return span;
  }
  var countryTables = {};
  /** Country name in the app's language: the app's own table first (Android's web view has no
   *  Albanian or Bosnian country names), then the browser's. */
  function countryName(code) {
    if (!code) return t('world.countryUnknown');
    var lang = Shell.getLang(), src = MBG.Countries && MBG.Countries[lang];
    if (src && !countryTables[lang]) {
      var map = {};
      src.split('|').forEach(function (pair) { var i = pair.indexOf(':'); map[pair.slice(0, i)] = pair.slice(i + 1); });
      countryTables[lang] = map;
    }
    if (countryTables[lang] && countryTables[lang][code]) return countryTables[lang][code];
    try {
      var dn = new Intl.DisplayNames([Shell.getLang(), 'en'], { type: 'region' });
      return dn.of(code) || code;
    } catch (e) { return code; }
  }
  function clock(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  /** A place as text: "#12" (exact, first 1,000) or "top 5%". tf: the text function to use. */
  function rankText(r, tf) {
    tf = tf || t;
    if (r && r.rank) return tf('world.rankNo', { n: fmt(r.rank) });
    if (r && r.top) return tf('world.rankTop', { p: r.top });
    return '–';
  }

  /* ------------------------------------------------------- dialogs (shared) --- */
  function sheet(id, cls) {
    var d = document.getElementById(id);
    if (d) return d;
    d = el('dialog', 'dlg sheet ' + cls);
    d.id = id;
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    return d;
  }
  function show(d) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
  function whenClosed(d) {
    return new Promise(function (resolve) {
      d.addEventListener('close', function once() { d.removeEventListener('close', once); resolve(d.returnValue); });
    });
  }
  function toast(msg) { if (MBG.Paywall && MBG.Paywall.toast) MBG.Paywall.toast(msg); }

  /* ------------------------------------------------------------ join sheet --- */
  /** Joins one player name (default: the logged-in name). Resolves true when it joined. */
  function openJoin(name) {
    name = name || currentName();
    if (!enabled() || !name) return Promise.resolve(false);
    if (isAccountName(name)) return account().joinWorld();
    if (isYoung(name)) { toast(t('world.young')); return Promise.resolve(false); }
    var d = sheet('dlgWorldJoin', 'worldjoin');
    var year = new Date().getFullYear();
    var opts = ['<option value="">' + t('world.choose') + '</option>'];
    for (var y = year; y >= year - 100; y--) opts.push('<option value="' + y + '">' + y + '</option>');
    d.innerHTML =
      '<div class="sheet-head"><h2 id="wjTitle"></h2><span class="head-actions"><button type="button" class="btn submit small" id="wjYesTop" disabled></button>' +
      '<button type="button" class="btn ghost small" id="wjClose"></button></span></div>' +
      '<div class="sheet-scroll wj">' +
      '  <p class="wj-name" id="wjName"></p>' +
      '  <p id="wjText"></p>' +
      '  <h3 id="wjRulesTitle"></h3><ul class="wj-rules" id="wjRules"></ul>' +
      '  <label class="fieldlabel" for="wjYear" id="wjYearLabel"></label>' +
      '  <select id="wjYear" class="textfield">' + opts.join('') + '</select>' +
      '  <label class="wj-agree"><input type="checkbox" id="wjAgree"> <span id="wjAgreeText"></span></label>' +
      '  <p class="pw-msg" id="wjMsg" role="status" aria-live="polite" hidden></p>' +
      '  <div class="dlg-actions"><button type="button" class="btn ghost" id="wjNo"></button>' +
      '  <button type="button" class="btn submit" id="wjYes" disabled></button></div>' +
      '</div>';
    d.setAttribute('aria-labelledby', 'wjTitle');
    var $ = function (id) { return d.querySelector('#' + id); };
    $('wjTitle').textContent = t('world.joinTitle');
    $('wjClose').textContent = t('btn.close');
    $('wjName').textContent = t('world.joinAs', { name: name });
    $('wjText').textContent = t('world.joinText');
    $('wjRulesTitle').textContent = t('world.rulesTitle');
    t('world.rules').forEach(function (r) { $('wjRules').appendChild(el('li', null, r)); });
    $('wjYearLabel').textContent = t('world.birthYear');
    $('wjAgreeText').textContent = t('world.agree');
    $('wjNo').textContent = t('world.notNow');
    $('wjYes').textContent = t('world.joinOk');
    $('wjYesTop').textContent = t('world.joinOk');
    $('wjYesTop').addEventListener('click', function () { $('wjYes').click(); });
    var refresh = function () { $('wjYes').disabled = $('wjYesTop').disabled = !($('wjYear').value && $('wjAgree').checked); };
    $('wjYear').addEventListener('change', refresh);
    $('wjAgree').addEventListener('change', refresh);
    var result = false;
    $('wjClose').addEventListener('click', function () { d.close(); });
    $('wjNo').addEventListener('click', function () { d.close(); });
    $('wjYes').addEventListener('click', function () {
      var key = keyOf(name);
      var e = state.names[key] = state.names[key] || { name: name };
      e.birthYear = Number($('wjYear').value);
      if (ageOf(e) < MIN_AGE) {
        e.young = true;                 // this name cannot try again
        e.joined = false;
        save();
        $('wjMsg').textContent = t('world.young');
        $('wjMsg').hidden = false;
        $('wjYes').hidden = true; $('wjYesTop').hidden = true;
        $('wjAgree').disabled = true;
        $('wjYear').disabled = true;
        $('wjNo').textContent = t('btn.close');
        return;
      }
      e.joined = true;
      e.name = name;
      identity();
      save();
      result = true;
      notify({ type: 'joined', name: name });
      d.close();
    });
    show(d);
    setTimeout(function () { try { $('wjYear').focus(); } catch (e) { /* ignore */ } }, 30);
    return whenClosed(d).then(function () { return result; });
  }

  /* --------------------------------------------------------- board sheet --- */
  var view = { game: 'codebreaker', period: 'week', length: 0, lang: '' };
  function segment(items, current, onPick, cls) {
    var wrap = el('div', 'seg wl-seg ' + (cls || ''));
    wrap.setAttribute('role', 'radiogroup');
    items.forEach(function (it) {
      var b = el('button', 'seg-btn' + (it.value === current ? ' on' : ''));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', it.value === current ? 'true' : 'false');
      if (it.html) b.innerHTML = it.html; else b.textContent = it.label;
      if (it.aria) b.setAttribute('aria-label', it.aria);
      b.addEventListener('click', function () { onPick(it.value); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function openBoard(opts) {
    if (!enabled()) return Promise.resolve();
    opts = opts || {};
    if (opts.game) view.game = opts.game;
    if (opts.length != null) view.length = opts.length;
    if (opts.lang != null) view.lang = opts.lang;
    if (opts.period) view.period = opts.period;
    if (view.period === 'day' && view.game === 'word' && !view.lang) view.lang = Shell.getLang();
    var d = sheet('dlgWorld', 'worldsheet');
    d.setAttribute('aria-labelledby', 'wlTitle');
    d.innerHTML =
      '<div class="sheet-head"><h2 id="wlTitle"></h2><button type="button" class="btn ghost small" id="wlClose"></button></div>' +
      '<div class="wl-filters" id="wlFilters"></div>' +
      '<div class="sheet-scroll"><ol class="wl-list" id="wlList" aria-live="polite"></ol></div>' +
      '<div class="wl-foot" id="wlFoot"></div>';
    var $ = function (id) { return d.querySelector('#' + id); };
    $('wlTitle').textContent = '🏆 ' + t('world.title');
    $('wlClose').textContent = t('btn.close');
    $('wlClose').addEventListener('click', function () { d.close(); });
    renderFilters(d);
    fill(d);
    show(d);
    flush();
    return whenClosed(d);
  }

  function renderFilters(d) {
    var f = d.querySelector('#wlFilters');
    f.textContent = '';
    var re = function () { renderFilters(d); fill(d); };
    f.appendChild(segment(GAMES.map(function (g) { return { value: g, label: Shell.gameName(g) }; }), view.game,
      function (v) { view.game = v; view.lang = v === 'word' && view.period === 'day' ? Shell.getLang() : ''; re(); }, 'wl-games'));
    var periods = [{ value: 'week', label: t('world.week') }, { value: 'all', label: t('world.all') }];
    if (MBG.Daily) periods.push({ value: 'day', label: t('world.today'), aria: t('daily.title') });
    f.appendChild(segment(periods, view.period, function (v) {
      view.period = v;
      if (v === 'day' && view.game === 'word' && !view.lang) view.lang = Shell.getLang();
      re();
    }, 'wl-period'));
    var day = view.period === 'day';
    if (!day) {
      // (the puzzle of the day has one length that day, chosen by MBG.Daily - 1.8: 4 to 8)
      var unit = view.game === 'word' ? 'world.letters' : 'world.digits';
      f.appendChild(segment([{ value: 0, label: t('world.allLengths') }].concat(LENGTHS.map(function (n) {
        return { value: n, label: String(n), aria: t(unit, { n: n }) };
      })), view.length, function (v) { view.length = v; re(); }, 'wl-len'));
    }
    if (view.game === 'word') {
      if (day && !view.lang) view.lang = Shell.getLang();
      // Each language has its own word of the day, so a daily board is always one language.
      f.appendChild(segment((day ? [] : [{ value: '', label: t('world.allLangs') }]).concat(WORD_LANGS.map(function (l) {
        return { value: l, html: '<span class="wl-coin">' + MBG.LangMenu.flagSvg(l, true) + '</span>', aria: Shell.langName(l) };
      })), view.lang, function (v) { view.lang = v; re(); }, 'wl-lang'));
    }
  }

  var loadSeq = 0;
  function fill(d) {
    var list = d.querySelector('#wlList');
    var seq = ++loadSeq;
    list.textContent = '';
    list.appendChild(el('li', 'wl-note', t('world.loading')));
    d.querySelector('#wlFoot').textContent = '';
    top(view).then(function (res) {
      if (seq !== loadSeq) return;
      list.textContent = '';
      if (!res.ok) {
        var li = el('li', 'wl-note', t('world.offline'));
        var again = el('button', 'linkbtn', t('world.retry'));
        again.type = 'button';
        again.addEventListener('click', function () { fill(d); });
        li.appendChild(el('br'));
        li.appendChild(again);
        list.appendChild(li);
        renderFoot(d, null);
        return;
      }
      var rows = res.entries.filter(function (e) { return state.blocked.indexOf(e.pid) === -1; });
      if (!rows.length) list.appendChild(el('li', 'wl-note', t('world.empty')));
      // "Last two weeks": older scores (all time) fill the list while fewer than 20 names played;
      // a small heading marks where they start.
      var olderShown = false;
      rows.forEach(function (e) {
        if (e.old && !olderShown) { olderShown = true; list.appendChild(el('li', 'wl-older', t('world.older'))); }
        list.appendChild(row(d, e));
      });
      // What the marks mean (only when the list shows some).
      if (rows.some(function (e) { return e.mode; })) list.appendChild(el('li', 'wl-legend', t(view.game === 'word' ? 'world.legendWord' : 'world.legendCode')));
      renderFoot(d, res);
    });
  }

  function row(d, e) {
    var medal = e.rank <= 3 && !e.old;           // medals only for the last two weeks (or all time / today)
    var li = el('li', 'wl-row' + (e.me ? ' me' : '') + (medal ? ' top' + e.rank : '') + (e.old ? ' old' : ''));
    li.appendChild(el('span', 'wl-rank', medal ? ['🥇', '🥈', '🥉'][e.rank - 1] : String(e.rank)));
    var who = el('span', 'wl-who');
    var line = el('span', 'wl-name');
    if (e.a && MBG.Account) line.appendChild(MBG.Account.avatarNode(e.av, 'av-sm'));
    line.appendChild(flag(e.country));
    line.appendChild(el('span', 'wl-n', e.name));
    if (e.a) {
      var mark = el('span', 'wl-acct', '✓');
      mark.title = t('world.accountMark');
      mark.setAttribute('aria-label', t('world.accountMark'));
      line.appendChild(mark);
    }
    modeMarks(view.game, e.mode).forEach(function (m) { line.appendChild(m); });
    who.appendChild(line);
    who.appendChild(el('span', 'wl-country', countryName(e.country)));
    var unit = view.game === 'word' ? 'world.letters' : 'world.digits';
    var bits = [t(unit, { n: e.length }), t('world.tries', { n: e.attempts })];
    if (e.hints > 0) bits.push(t('world.hints', { n: e.hints }));
    bits.push(clock(e.seconds));
    if (view.game === 'word' && !view.lang) bits.unshift(Shell.langName(e.lang));
    who.appendChild(el('span', 'wl-detail', bits.join(' · ')));
    li.appendChild(who);
    li.appendChild(el('span', 'wl-score', fmt(e.score)));
    if (!e.me) {
      var more = el('button', 'ib wl-more');
      more.type = 'button';
      more.setAttribute('aria-label', t('world.reportTitle', { name: e.name }));
      more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" class="fill"/><circle cx="12" cy="12" r="1.6" class="fill"/><circle cx="19" cy="12" r="1.6" class="fill"/></svg>';
      more.addEventListener('click', function () { askReport(d, e); });
      li.appendChild(more);
    }
    return li;
  }

  /**
   * Version 1.7: one list for all modes (scores weighted by difficulty); a small mark shows the
   * difficulty of an entry: ⭐ expert level, 📖 only real words accepted (Word Puzzle).
   */
  var MARKS = { word: [[1, '⭐', 'world.markExpert'], [2, '📖', 'world.markReal']], codebreaker: [[1, '⭐', 'world.markExpertCode']] };
  function modeMarks(game, mode) {
    mode = Number(mode) || 0;
    return (MARKS[game] || []).filter(function (m) { return mode & m[0]; }).map(function (m) {
      var s = el('span', 'wl-mode', m[1]);
      s.title = t(m[2]);
      s.setAttribute('aria-label', t(m[2]));
      return s;
    });
  }
  function renderFoot(d, res) {
    var foot = d.querySelector('#wlFoot');
    foot.textContent = '';
    if (res && res.players) foot.appendChild(el('span', 'wl-count', t('world.players', { n: res.players })));
    var name = currentName();
    if (res && res.me) { foot.appendChild(el('span', 'wl-me', t('world.you', { rank: rankText(res.me), score: fmt(res.me.score), name: res.me.name }))); return; }
    if (!name) { foot.appendChild(el('span', 'wl-me', t('world.loginFirst'))); return; }
    if (isYoung(name)) { foot.appendChild(el('span', 'wl-me', t('world.youngShort'))); return; }
    if (!isJoined(name)) {
      var j = el('button', 'btn submit small', t('world.join'));
      j.type = 'button';
      j.addEventListener('click', function () {
        openJoin(name).then(function (ok) { if (ok) sendPending(name).then(function () { fill(d); }); });
      });
      foot.appendChild(j);
      return;
    }
    foot.appendChild(el('span', 'wl-me', t('world.noScoreYet')));
  }

  /** The ⋯ of a name: everyone can hide it on this phone; players on the list can also report it. */
  function askReport(d, e, refresh) {
    var again = refresh || function () { fill(d); };
    var canReport = anyJoined() && (!!state.player || !!(account() && account().world()));
    var r = sheet('dlgWorldReport', 'worldreport');
    r.classList.remove('sheet');
    r.innerHTML = '<div class="dlg-body"><h2 id="wrTitle"></h2><p id="wrText"></p>' +
      '<div class="dlg-actions"><button type="button" class="btn ghost" id="wrCancel"></button>' +
      '<button type="button" class="btn ghost" id="wrHide"></button>' +
      (canReport ? '<button type="button" class="btn submit" id="wrReport"></button>' : '') + '</div></div>';
    var $ = function (id) { return r.querySelector('#' + id); };
    $('wrTitle').textContent = t('world.reportTitle', { name: e.name });
    $('wrText').textContent = canReport ? t('world.reportText') : t('world.hideText');
    $('wrCancel').textContent = t('dlg.cancel');
    $('wrHide').textContent = t('world.hide');
    $('wrCancel').addEventListener('click', function () { r.close(); });
    $('wrHide').addEventListener('click', function () { block(e.pid); r.close(); toast(t('world.hidden')); again(); });
    if (canReport) {
      $('wrReport').textContent = t('world.report');
      $('wrReport').addEventListener('click', function () {
        block(e.pid);
        r.close();
        report(e.pid).then(function (res) { toast(res.ok ? t('world.reported') : t('world.offline')); });
        again();
      });
    }
    show(r);
  }

  /* -------------------------------------------------------------- leaving --- */
  function confirmLeave(name) {
    var r = sheet('dlgWorldLeave', 'worldleave');
    r.classList.remove('sheet');
    r.innerHTML = '<div class="dlg-body"><h2 id="wqTitle"></h2><p id="wqText"></p>' +
      '<div class="dlg-actions"><button type="button" class="btn ghost" id="wqCancel"></button>' +
      '<button type="button" class="btn submit" id="wqOk"></button></div></div>';
    var $ = function (id) { return r.querySelector('#' + id); };
    $('wqTitle').textContent = t('world.leaveTitle');
    $('wqText').textContent = t('world.leaveText', { name: name });
    $('wqCancel').textContent = t('dlg.cancel');
    $('wqOk').textContent = t('world.leaveOk');
    var go = false;
    $('wqCancel').addEventListener('click', function () { r.close(); });
    $('wqOk').addEventListener('click', function () { go = true; r.close(); });
    show(r);
    return whenClosed(r).then(function () {
      if (!go) return false;
      return leave(name).then(function (res) { toast(res.ok ? t('world.left') : t('world.offline')); return !!res.ok; });
    });
  }

  /* ------------------------------------- best puzzles of the day (1.8) --- */
  var dview = { game: 'word', period: 'recent', lang: null };
  var LOCALES = { en: 'en-GB', sq: 'sq', bs: 'bs-Latn-BA', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', tr: 'tr-TR', pl: 'pl-PL', pt: 'pt-BR', ar: 'ar-u-nu-latn', ko: 'ko-KR' };
  function dateText(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    try { return new Intl.DateTimeFormat(LOCALES[Shell.getLang()] || 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d); }
    catch (e) { return iso; }
  }
  /** The answer as the tiles show it: capitals of its language (German ß as ẞ, Turkish i as İ). */
  function upper(word, lang) {
    if (lang === 'ar') return String(word);
    if (lang === 'ko') return MBG.Hangul ? MBG.Hangul.compose(word) : String(word);   // in syllables: 사과
    var w = lang === 'de' ? String(word).replace(/ß/g, 'ẞ') : String(word);
    try { return w.toLocaleUpperCase(lang || 'en'); } catch (e) { return w.toUpperCase(); }
  }
  function dailyTopQuery(q) {
    var p = ['game=' + q.game, 'lang=' + (q.game === 'word' ? q.lang || '' : ''), 'period=' + q.period];
    if (anyJoined() && state.player) p.push('player=' + encodeURIComponent(state.player));
    var A = account();
    return api('/api/daily-top?' + p.join('&'), null, A ? A.session() : null);
  }
  /**
   * The best puzzles of the day. opts: { game, lang } - the game (and for Word Puzzle the language,
   * '' = all) it opens on; the last two weeks first.
   */
  function openDailyTop(opts) {
    if (!enabled()) return Promise.resolve();
    opts = opts || {};
    if (opts.game) dview.game = opts.game;
    if (opts.lang != null) dview.lang = opts.lang;
    if (dview.lang == null) dview.lang = Shell.getLang();
    var d = sheet('dlgDailyTop', 'worldsheet dailytop');
    d.setAttribute('aria-labelledby', 'dtTitle');
    d.innerHTML =
      '<div class="sheet-head"><h2 id="dtTitle"></h2><button type="button" class="btn ghost small" id="dtClose"></button></div>' +
      '<div class="wl-filters" id="dtFilters"></div>' +
      '<div class="sheet-scroll"><ol class="wl-list" id="dtList" aria-live="polite"></ol><p class="dt-note" id="dtNote"></p></div>' +
      '<div class="wl-foot" id="dtFoot"></div>';
    var $ = function (id) { return d.querySelector('#' + id); };
    $('dtTitle').textContent = '🏆 ' + t('dtop.title');
    $('dtClose').textContent = t('btn.close');
    $('dtClose').addEventListener('click', function () { d.close(); });
    $('dtNote').textContent = t('dtop.note');
    dailyFilters(d);
    dailyFill(d);
    show(d);
    flush();
    return whenClosed(d);
  }
  function dailyFilters(d) {
    var f = d.querySelector('#dtFilters');
    f.textContent = '';
    var re = function () { dailyFilters(d); dailyFill(d); };
    f.appendChild(segment(GAMES.map(function (g) { return { value: g, label: Shell.gameName(g) }; }), dview.game,
      function (v) { dview.game = v; re(); }, 'wl-games'));
    f.appendChild(segment([{ value: 'recent', label: t('world.week') }, { value: 'all', label: t('world.all') }], dview.period,
      function (v) { dview.period = v; re(); }, 'wl-period'));
    if (dview.game === 'word') {
      f.appendChild(segment([{ value: '', label: t('world.allLangs') }].concat(WORD_LANGS.map(function (l) {
        return { value: l, html: '<span class="wl-coin">' + MBG.LangMenu.flagSvg(l, true) + '</span>', aria: Shell.langName(l) };
      })), dview.lang || '', function (v) { dview.lang = v; re(); }, 'wl-lang'));
    }
  }
  var dailySeq = 0;
  function dailyFill(d) {
    var list = d.querySelector('#dtList'), foot = d.querySelector('#dtFoot');
    var seq = ++dailySeq;
    list.textContent = '';
    foot.textContent = '';
    list.appendChild(el('li', 'wl-note', t('world.loading')));
    var q = { game: dview.game, lang: dview.game === 'word' ? dview.lang || '' : '', period: dview.period };
    dailyTopQuery(q).then(function (res) {
      if (seq !== dailySeq) return;
      list.textContent = '';
      if (!res.ok) {
        var li = el('li', 'wl-note', t('world.offline'));
        var again = el('button', 'linkbtn', t('world.retry'));
        again.type = 'button';
        again.addEventListener('click', function () { dailyFill(d); });
        li.appendChild(el('br'));
        li.appendChild(again);
        list.appendChild(li);
        return;
      }
      var rows = res.entries.filter(function (e) { return state.blocked.indexOf(e.pid) === -1; });
      if (!rows.length) list.appendChild(el('li', 'wl-note', t('dtop.empty')));
      rows.forEach(function (e) { list.appendChild(dailyRow(d, e, q)); });
      if (res.total) foot.appendChild(el('span', 'wl-count', t('dtop.count', { n: res.total })));
      if (res.me) foot.appendChild(el('span', 'wl-me', t('world.you', { rank: res.me.over ? fmt(res.me.over) + '+' : rankText(res.me), score: fmt(res.me.score), name: res.me.name })));
    });
  }
  function dailyRow(d, e, q) {
    var medal = e.rank <= 3;
    var li = el('li', 'wl-row dt-row' + (e.me ? ' me' : '') + (medal ? ' top' + e.rank : ''));
    li.appendChild(el('span', 'wl-rank', medal ? ['🥇', '🥈', '🥉'][e.rank - 1] : String(e.rank)));
    var who = el('span', 'wl-who');
    // The number or word of that day - hidden (●) while the day is not over everywhere.
    var ans = el('span', 'dt-ans' + (e.answer ? '' : ' hidden'), e.answer ? upper(e.answer, e.lang) : new Array(e.length + 1).join('●'));
    ans.setAttribute('dir', 'auto');
    if (e.lang) ans.setAttribute('lang', e.lang);
    if (!e.answer) { ans.title = t('dtop.hidden'); ans.setAttribute('aria-label', t('dtop.hidden')); }
    who.appendChild(ans);
    var line = el('span', 'wl-name');
    if (e.a && MBG.Account) line.appendChild(MBG.Account.avatarNode(e.av, 'av-sm'));
    line.appendChild(flag(e.country));
    line.appendChild(el('span', 'wl-n', e.name));
    if (e.a) {
      var mark = el('span', 'wl-acct', '✓');
      mark.title = t('world.accountMark');
      mark.setAttribute('aria-label', t('world.accountMark'));
      line.appendChild(mark);
    }
    who.appendChild(line);
    var unit = e.game === 'word' ? 'world.letters' : 'world.digits';
    var bits = [dateText(e.date) + ' · #' + e.day, t(unit, { n: e.length }), t('world.tries', { n: e.attempts })];
    if (e.hints > 0) bits.push(t('world.hints', { n: e.hints }));
    bits.push(clock(e.seconds));
    if (e.game === 'word' && !q.lang) bits.unshift(Shell.langName(e.lang));
    who.appendChild(el('span', 'wl-detail', bits.join(' · ')));
    li.appendChild(who);
    li.appendChild(el('span', 'wl-score', fmt(e.score)));
    if (!e.me) {
      var more = el('button', 'ib wl-more');
      more.type = 'button';
      more.setAttribute('aria-label', t('world.reportTitle', { name: e.name }));
      more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" class="fill"/><circle cx="12" cy="12" r="1.6" class="fill"/><circle cx="19" cy="12" r="1.6" class="fill"/></svg>';
      more.addEventListener('click', function () { askReport(d, e, function () { dailyFill(d); }); });
      li.appendChild(more);
    }
    return li;
  }

  /** The text for the settings row, for the logged-in name: On / Off / From 13 / Log in. */
  function statusText() {
    var name = currentName();
    if (!name) return t('world.needName');
    if (isYoung(name)) return t('world.ageOnly');
    return isJoined(name) ? t('world.on') : t('world.off');
  }

  /** The settings row: join or leave for the logged-in name. */
  function toggle() {
    var name = currentName();
    if (!name) { toast(t('world.loginFirst')); return Promise.resolve(false); }
    if (isYoung(name)) { toast(t('world.young')); return Promise.resolve(false); }
    if (isJoined(name)) return confirmLeave(name);
    return openJoin(name).then(function (ok) { if (ok) sendPending(name); return ok; });
  }

  if (enabled()) {
    root.addEventListener('online', function () { flush(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });
    setTimeout(flush, 1500);
  }

  MBG.World = {
    enabled: enabled, joined: isJoined, young: isYoung, anyJoined: anyJoined, MIN_AGE: MIN_AGE,
    submit: submit, sendPending: sendPending, flush: flush, top: top, leave: leave, report: report, block: block,
    rankText: rankText, weekBest: weekBest, adopt: adopt,
    openBoard: openBoard, openDailyTop: openDailyTop, openJoin: openJoin, confirmLeave: confirmLeave, toggle: toggle, statusText: statusText,
    onChange: function (fn) { listeners.push(fn); },
    flag: flag, countryName: countryName,
    _state: function () { return state; }
  };
})(typeof self !== 'undefined' ? self : globalThis);
