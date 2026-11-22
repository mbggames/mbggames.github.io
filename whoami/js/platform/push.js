/*!
 * MBG Who Am I? - notifications on the phone (1.1.0).
 * In the Android app from Google Play (built with Firebase - MBG.PUSH), for players signed in with
 * an MBG account: an invitation to a game, a message for you, a judging case, a reminder, a new
 * title - also when the app is closed. Android asks once for permission; "Phone notifications" in
 * Notifications switches it off, and "Pause" silences it for a while. A tap opens the inbox.
 */
(function (root) {
  'use strict';
  var MBG = root.MBG, Shell = MBG.Shell, Net = MBG.Net;
  var plugin = null, wired = false;

  function supported() { return !!(MBG.PUSH && Shell.native && Net && !Net.demo && root.capacitorExports && typeof root.capacitorExports.registerPlugin === 'function'); }
  function get() {
    if (plugin || !supported()) return plugin;
    try { plugin = root.capacitorExports.registerPlugin('PushNotifications'); } catch (e) { plugin = null; }
    return plugin;
  }
  function wire(p) {
    if (wired) return;
    wired = true;
    p.addListener('registration', function (tk) { if (tk && tk.value && Net.signedIn()) Net.push.register(tk.value).catch(function () { /* later */ }); });
    p.addListener('registrationError', function () { /* no Google services on this phone: the bell and e-mail stay */ });
    // a tap on the notification: the inbox (the bell), where the notice leads on
    p.addListener('pushNotificationActionPerformed', function () {
      if (MBG.Notify && document.getElementById('home')) MBG.Notify.open().then(MBG.Notify.paint);
      else Shell.go('index.html#inbox');
    });
    // while the app is open: the bell shows it
    p.addListener('pushNotificationReceived', function () { if (MBG.Notify) MBG.Notify.paint(); });
  }
  /** Asks Android for permission (once) and registers this phone. Resolves true when notifications are on. */
  function enable(ask) {
    var p = get();
    if (!p || !Net.signedIn()) return Promise.resolve(false);
    wire(p);
    return p.checkPermissions().then(function (st) {
      if (st.receive === 'granted') return st;
      if (!ask || st.receive === 'denied') return st;
      return p.requestPermissions();
    }).then(function (st) {
      if (st.receive !== 'granted') return false;
      return p.register().then(function () { return true; });
    }).catch(function () { return false; });
  }
  function disable() {
    var p = get();
    if (!p) return Promise.resolve();
    return Net.push.off().catch(function () {}).then(function () { return p.unregister ? p.unregister().catch(function () {}) : null; });
  }
  /** At the start, on the home screen: ask once after signing in; later only refresh the registration. */
  function init() {
    if (!supported() || !Net.signedIn()) return;
    var asked = Shell.getPrefs().pushAsked;
    if (!asked) Shell.setPrefs({ pushAsked: true });
    Net.notes.prefs().then(function (p) { if (p.push !== false) enable(!asked); }).catch(function () {});
  }
  MBG.Push = { supported: supported, enable: enable, disable: disable, init: init };
})(typeof self !== 'undefined' ? self : globalThis);
