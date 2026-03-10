// js/sync-manager.js
// Offline-first sync manager — saves exercise progress locally and syncs to
// Supabase every 10 seconds.  Local state always wins on conflict.
(function () {
  'use strict';

  window.SyncManager = {
    _intervalId: null,
    _syncIntervalMs: 10000,
    _pending: false,    // true when unsynced changes exist
    _running: false,    // interval is active

    // ── public API ───────────────────────────────────────────────────
    start: function () {
      if (this._running) { return; }
      this._running = true;
      this._intervalId = setInterval(this._sync.bind(this), this._syncIntervalMs);
      // Attempt immediate sync on start
      this._sync();
    },

    stop: function () {
      this._running = false;
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      this._setStatus('');
    },

    /**
     * Save a single exercise progress entry to localStorage (offline-first).
     * Key format matches app.js: cambridge_<mode>_<level>_<examId>_<section>_<part>
     */
    saveProgress: function (options) {
      // options: { mode, level, examId, section, part, answers, score, answersChecked }
      var key = 'cambridge_' + options.mode + '_' + options.level + '_' + options.examId + '_' + options.section + '_' + options.part;
      var entry = {
        mode: options.mode,
        level: options.level,
        examId: options.examId,
        section: options.section,
        part: options.part,
        answers: options.answers || {},
        score: options.score != null ? options.score : null,
        answersChecked: !!options.answersChecked,
        updatedAt: new Date().toISOString(),
        synced: false
      };
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (e) {
        console.warn('[SyncManager] localStorage quota exceeded');
      }
      this._pending = true;
    },

    // ── internal sync ────────────────────────────────────────────────
    _sync: async function () {
      const client = Auth && Auth._client;
      const user = Auth && Auth.getUser();
      if (!client || !user) { return; }

      // Collect all unsynced entries
      var keys = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith('cambridge_')) { keys.push(k); }
        }
      } catch (e) { return; }

      var unsynced = [];
      keys.forEach(function (k) {
        try {
          var raw = localStorage.getItem(k);
          if (!raw) { return; }
          var entry = JSON.parse(raw);
          if (!entry.synced) { unsynced.push({ key: k, entry: entry }); }
        } catch (e) { /* skip corrupt entry */ }
      });

      if (unsynced.length === 0) { this._setStatus(''); return; }

      this._setStatus('syncing');

      var successKeys = [];

      await Promise.all(unsynced.map(async function (item) {
        try {
          var e = item.entry;
          var row = {
            user_id: user.id,
            level: e.level,
            exam_id: e.examId,
            section: e.section,
            part: e.part,
            answers: e.answers,
            score: e.score,
            mode: e.mode,
            completed_at: e.updatedAt
          };
          var result = await client
            .from('user_progress')
            .upsert(row, { onConflict: 'user_id,exam_id,section,part,mode', ignoreDuplicates: false });
          if (!result.error) {
            successKeys.push(item.key);
          }
        } catch (err) {
          console.warn('[SyncManager] sync error for', item.key, err);
        }
      }));

      // Mark synced entries
      successKeys.forEach(function (k) {
        try {
          var raw = localStorage.getItem(k);
          if (!raw) { return; }
          var entry = JSON.parse(raw);
          entry.synced = true;
          localStorage.setItem(k, JSON.stringify(entry));
        } catch (e) { /* ignore */ }
      });

      if (successKeys.length === unsynced.length) {
        this._setStatus('synced');
        this._pending = false;
        setTimeout(this._clearStatus.bind(this), 3000);
      } else {
        this._setStatus('error');
      }
    },

    // ── status indicator ─────────────────────────────────────────────
    _setStatus: function (state) {
      var el = document.getElementById('sync-status-indicator');
      if (!el) { return; }
      if (state === 'syncing') {
        el.textContent = 'Syncing…';
        el.className = 'sync-status syncing';
        el.style.display = 'inline-flex';
      } else if (state === 'synced') {
        el.textContent = '✓ Synced';
        el.className = 'sync-status synced';
        el.style.display = 'inline-flex';
      } else if (state === 'error') {
        el.textContent = '⚠ Sync failed';
        el.className = 'sync-status error';
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
        el.textContent = '';
        el.className = 'sync-status';
      }
    },

    _clearStatus: function () {
      this._setStatus('');
    }
  };
})();
