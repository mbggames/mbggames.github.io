/*!
 * MBG Puzzles - persistence services (shared by both games).
 * UserStore keeps usernames and high scores in the same simple line format as the
 * prototype's GuessGameUsers.txt ("Name;HighScore" per line), stored in the
 * browser's local storage under the game's own key. Every write replaces the whole
 * value in one call, so a save can never be left half-written (NFR / FR-USER-009).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MBG = root.MBG || {};
  root.MBG.Storage = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  var ANONYMOUS = 'Anonymous';
  var USERNAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,18}[\p{L}\p{N}._-]$/u;
  var RESERVED_NAMES = ['a', 'reg', 'register', 'anonymous', 'anonim', 'y', 'n', 'yes', 'no', 'po', 'jo',
    'd', 'da', 'ne', 'anonimno', 'help', 'rules', 'rregullat', 'pomoć', 'pomoc', 'pravila', 'reveal', 'zbulo', 'otkrij',
    'exit', 'quit', 'fund', 'izlaz',
    // German, Spanish, French and Turkish: answers, "anonymous" and the commands of the games
    'ja', 'nein', 'si', 'sí', 'oui', 'non', 'evet', 'hayır', 'hayir', 'anonym', 'anónimo', 'anonimo', 'anonyme',
    'hilfe', 'regeln', 'lösung', 'beenden', 'ayuda', 'reglas', 'revelar', 'salir', 'aide', 'règles', 'regles',
    'révéler', 'reveler', 'quitter', 'yardım', 'yardim', 'kurallar', 'göster', 'goster', 'çık', 'cik', 'çıkış', 'cikis',
    // Polish, Portuguese and Arabic: the same
    'tak', 'nie', 'zasady', 'pokaż', 'pokaz', 'wyjdź', 'wyjdz', 'koniec', 'sim', 'não', 'nao', 'anônimo', 'ajuda',
    'regras', 'sair', 'نعم', 'لا', 'مجهول', 'مساعدة', 'قواعد', 'اكشف', 'كشف', 'خروج'];

  /** In-memory stand-in used when the browser blocks storage (private mode etc.). */
  function MemoryStorage() { this._d = {}; }
  MemoryStorage.prototype.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; };
  MemoryStorage.prototype.setItem = function (k, v) { this._d[k] = String(v); };
  MemoryStorage.prototype.removeItem = function (k) { delete this._d[k]; };

  function safeStorage(kind) {
    try {
      var s = root[kind];
      var probe = '__mbg_probe__';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return { storage: s, persistent: true };
    } catch (e) {
      return { storage: new MemoryStorage(), persistent: false };
    }
  }

  function normName(name) { return String(name || '').normalize('NFC').trim(); }
  function key(name) { return normName(name).toLowerCase(); }

  function validateUsername(name) {
    var n = normName(name);
    if (RESERVED_NAMES.indexOf(n.toLowerCase()) !== -1) return 'reserved';
    if (!USERNAME_RE.test(n) || Array.from(n).length > 20) return 'invalid';
    return null;
  }

  /**
   * Tolerant parser (FR-USER-008): accepts ";", ",", tab or "|" as separators,
   * ignores malformed rows and merges case-variant duplicates (keeping the best score).
   */
  function parseUsers(text) {
    var map = new Map();
    String(text || '').replace(/^﻿/, '').split(/\r\n|\n|\r/).forEach(function (line) {
      if (!line.trim() || /^\s*#/.test(line)) return;
      var parts = line.split(/[;,\t|]/);
      var name = normName(parts[0]);
      if (!name || Array.from(name).length > 40) return;
      var score = parseInt(String(parts[1] || '0').replace(/[^\d]/g, ''), 10);
      if (!isFinite(score) || score < 0) score = 0;
      var k = name.toLowerCase();
      var prev = map.get(k);
      if (prev) prev.best = Math.max(prev.best, score);
      else map.set(k, { name: name, best: score });
    });
    return map;
  }

  function serializeUsers(map) {
    var lines = [];
    map.forEach(function (u) { lines.push(u.name.replace(/[;\r\n]/g, ' ') + ';' + u.best); });
    return lines.join('\n') + (lines.length ? '\n' : '');
  }

  function UserStore(storage, storageKey) {
    this.storage = storage;
    this.key = storageKey || 'MBG.Users';
    this.users = new Map();
    this.load();
  }

  UserStore.prototype.load = function () {
    var text = null;
    try { text = this.storage.getItem(this.key); } catch (e) { text = null; }
    this.users = parseUsers(text);
    return this;
  };

  UserStore.prototype.save = function () {
    try { this.storage.setItem(this.key, serializeUsers(this.users)); return true; } catch (e) { return false; }
  };

  UserStore.prototype.find = function (name) {
    var u = this.users.get(key(name));
    return u ? { name: u.name, best: u.best } : null;
  };

  UserStore.prototype.create = function (name) {
    var k = key(name);
    if (!this.users.has(k)) {
      this.users.set(k, { name: normName(name), best: 0 });
      this.save();
    }
    return this.find(name);
  };

  UserStore.prototype.ensure = function (name) { return this.find(name) || this.create(name); };

  /** Updates only when the new score beats the stored high score (FR-SCORE-006). */
  UserStore.prototype.updateBest = function (name, score) {
    var u = this.users.get(key(name));
    if (!u) { this.create(name); u = this.users.get(key(name)); }
    if (score > u.best) {
      u.best = score;
      this.save();
      return true;
    }
    return false;
  };

  UserStore.prototype.allTimeBest = function () {
    var best = null;
    this.users.forEach(function (u) {
      if (u.best > 0 && (!best || u.best > best.best)) best = { name: u.name, best: u.best };
    });
    return best;
  };

  UserStore.prototype.list = function () {
    var out = [];
    this.users.forEach(function (u) { out.push({ name: u.name, best: u.best }); });
    return out;
  };

  UserStore.prototype.exportText = function () { return serializeUsers(this.users); };

  /**
   * Merges users from another copy (e.g. a backup) into this one: unknown names are
   * added, known names keep the higher score. Returns true when anything changed.
   */
  UserStore.prototype.mergeText = function (text) {
    var self = this;
    var changed = false;
    parseUsers(text).forEach(function (u, k) {
      var mine = self.users.get(k);
      if (!mine) { self.users.set(k, { name: u.name, best: u.best }); changed = true; }
      else if (u.best > mine.best) { mine.best = u.best; changed = true; }
    });
    if (changed) this.save();
    return changed;
  };

  /** Small JSON key/value store for preferences and the resumable session. */
  function JsonStore(storage, storageKey) { this.storage = storage; this.key = storageKey; }
  JsonStore.prototype.get = function () {
    try { var v = this.storage.getItem(this.key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  };
  JsonStore.prototype.set = function (value) {
    try { this.storage.setItem(this.key, JSON.stringify(value)); return true; } catch (e) { return false; }
  };
  JsonStore.prototype.clear = function () { try { this.storage.removeItem(this.key); } catch (e) { /* ignore */ } };

  return {
    ANONYMOUS: ANONYMOUS,
    RESERVED_NAMES: RESERVED_NAMES,
    MemoryStorage: MemoryStorage,
    safeStorage: safeStorage,
    validateUsername: validateUsername,
    parseUsers: parseUsers,
    serializeUsers: serializeUsers,
    UserStore: UserStore,
    JsonStore: JsonStore
  };
});

