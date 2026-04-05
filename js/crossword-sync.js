// js/crossword-sync.js
// Offline-first sync for crossword progress.
// Follows the same pattern as SyncManager (js/sync-manager.js).
// localStorage key: cambridge_crossword_progress
// Supabase table:   crossword_progress

(function () {
  'use strict';

  var LS_KEY       = 'cambridge_crossword_progress';
  var DEBOUNCE_MS  = 1500;
  var _debounceTimer = null;
  var _memCache      = null;

  window.CrosswordSync = {

    // ── Read ──────────────────────────────────────────────────────────────────

    getAll: function () {
      if (_memCache) return _memCache;
      try { _memCache = JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
      catch(e) { _memCache = {}; }
      return _memCache;
    },

    get: function (crosswordId) {
      return this.getAll()[crosswordId] || null;
    },

    // ── Write ─────────────────────────────────────────────────────────────────

    save: function (crosswordId, data) {
      var all  = this.getAll();
      var prev = all[crosswordId] || {};

      var wordsCorrect = data.wordsCorrect !== undefined ? data.wordsCorrect : (prev.wordsCorrect || 0);
      var wordsTotal   = data.wordsTotal   !== undefined ? data.wordsTotal   : (prev.wordsTotal   || 0);

      all[crosswordId] = {
        crosswordId:      crosswordId,
        level:            data.level            || prev.level            || '',
        cwIndex:          data.cwIndex          !== undefined ? data.cwIndex : (prev.cwIndex || 0),
        completed:        data.completed        !== undefined ? data.completed : (prev.completed || false),
        wordsCorrect:     wordsCorrect,
        wordsTotal:       wordsTotal,
        progressPct:      wordsTotal > 0 ? Math.round((wordsCorrect / wordsTotal) * 100) : (prev.progressPct || 0),
        hintsUsed:        data.hintsUsed        !== undefined ? data.hintsUsed : (prev.hintsUsed || 0),
        timeSpentSeconds: data.timeSpentSeconds !== undefined ? data.timeSpentSeconds : (prev.timeSpentSeconds || 0),
        cellState:        data.cellState        || prev.cellState || {},
        lastPlayed:       new Date().toISOString(),
        synced:           false
      };

      _memCache = all;
      this._persist(all);
      this._schedulePush();
    },

    // ── Restore from cloud ────────────────────────────────────────────────────

    restoreFromCloud: async function () {
      var client = (typeof Auth !== 'undefined') && Auth._client;
      var user   = (typeof Auth !== 'undefined') && Auth.getUser();
      if (!client || !user) return;

      try {
        var res = await client
          .from('crossword_progress')
          .select('*')
          .eq('user_id', user.id);

        if (res.error || !res.data) return;

        var all = this.getAll();

        res.data.forEach(function (row) {
          var id    = row.crossword_id;
          var local = all[id];

          if (local && local.lastPlayed && row.last_played) {
            if (new Date(local.lastPlayed) >= new Date(row.last_played)) return;
          }

          all[id] = {
            crosswordId:      id,
            level:            row.level,
            cwIndex:          row.cw_index,
            completed:        row.completed,
            wordsCorrect:     row.words_correct,
            wordsTotal:       row.words_total,
            progressPct:      row.progress_pct,
            hintsUsed:        row.hints_used,
            timeSpentSeconds: row.time_spent_seconds,
            cellState:        row.cell_state || {},
            lastPlayed:       row.last_played,
            synced:           true
          };
        });

        _memCache = all;
        this._persist(all);
      } catch(e) {
        console.warn('[CrosswordSync] restoreFromCloud error:', e);
      }
    },

    // ── One-time migration from legacy localStorage format ────────────────────

    migrateFromLegacy: function () {
      var DONE_KEY = 'cw_migration_done';
      try { if (localStorage.getItem(DONE_KEY)) return; } catch(e) { return; }

      try {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) { localStorage.setItem(DONE_KEY, '1'); return; }

        var legacy = JSON.parse(raw);

        // Detect legacy format: has wordsComplete but not wordsCorrect
        var isLegacy = Object.values(legacy).some(function(v) {
          return v && typeof v.wordsComplete !== 'undefined' && typeof v.wordsCorrect === 'undefined';
        });
        if (!isLegacy) { localStorage.setItem(DONE_KEY, '1'); return; }

        var migrated = {};
        Object.keys(legacy).forEach(function(id) {
          var v = legacy[id];
          var m = id.match(/^([A-C][12])_cw(\d+)$/);
          var wordsCorrect = v.wordsComplete || 0;
          var wordsTotal   = v.wordsTotal    || 0;
          migrated[id] = {
            crosswordId:      id,
            level:            m ? m[1] : '',
            cwIndex:          m ? parseInt(m[2], 10) : 0,
            completed:        v.completed  || false,
            wordsCorrect:     wordsCorrect,
            wordsTotal:       wordsTotal,
            progressPct:      wordsTotal > 0 ? Math.round((wordsCorrect / wordsTotal) * 100) : 0,
            hintsUsed:        0,
            timeSpentSeconds: 0,
            cellState:        {},
            lastPlayed:       v.lastPlayed || null,
            synced:           false
          };
        });

        _memCache = migrated;
        this._persist(migrated);
        localStorage.setItem(DONE_KEY, '1');
        console.log('[CrosswordSync] Migrated', Object.keys(migrated).length, 'legacy entries');
        this._push();
      } catch(e) {
        console.warn('[CrosswordSync] migrateFromLegacy error:', e);
      }
    },

    // ── Internal ──────────────────────────────────────────────────────────────

    _persist: function (data) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
      catch(e) { console.warn('[CrosswordSync] localStorage quota exceeded'); }
    },

    _schedulePush: function () {
      if (_debounceTimer) clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(function() { CrosswordSync._push(); }, DEBOUNCE_MS);
    },

    _push: async function () {
      var client = (typeof Auth !== 'undefined') && Auth._client;
      var user   = (typeof Auth !== 'undefined') && Auth.getUser();
      if (!client || !user) return;

      var all      = this.getAll();
      var unsynced = Object.values(all).filter(function(v) { return v && !v.synced; });
      if (!unsynced.length) return;

      this._setStatus('syncing');

      var rows = unsynced.map(function(v) {
        return {
          user_id:            user.id,
          crossword_id:       v.crosswordId,
          level:              v.level,
          cw_index:           v.cwIndex,
          completed:          v.completed,
          words_correct:      v.wordsCorrect,
          words_total:        v.wordsTotal,
          progress_pct:       v.progressPct,
          hints_used:         v.hintsUsed,
          time_spent_seconds: v.timeSpentSeconds,
          cell_state:         v.cellState,
          last_played:        v.lastPlayed
        };
      });

      try {
        var res = await client
          .from('crossword_progress')
          .upsert(rows, { onConflict: 'user_id,crossword_id' })
          .select();

        if (res.error) throw res.error;

        unsynced.forEach(function(v) { v.synced = true; });
        _memCache = all;
        CrosswordSync._persist(all);
        CrosswordSync._setStatus('synced');
        setTimeout(function() { CrosswordSync._setStatus(''); }, 3000);
      } catch(e) {
        console.warn('[CrosswordSync] push error:', e);
        CrosswordSync._setStatus('error');
      }
    },

    _setStatus: function (state) {
      var el = document.getElementById('sync-status-indicator');
      if (!el) return;
      if (state === 'syncing') {
        el.innerHTML = 'Saving…';
        el.className = 'sync-status syncing';
        el.setAttribute('aria-label', 'Saving progress');
        el.style.display = 'inline-flex';
      } else if (state === 'synced') {
        el.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Saved';
        el.className = 'sync-status synced';
        el.setAttribute('aria-label', 'Progress saved');
        el.style.display = 'inline-flex';
      } else if (state === 'error') {
        el.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">warning</span> Save failed';
        el.className = 'sync-status error';
        el.setAttribute('aria-label', 'Save failed');
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
        el.className = 'sync-status';
      }
    }
  };
})();
