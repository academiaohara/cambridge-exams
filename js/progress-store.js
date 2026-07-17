// js/progress-store.js
// Unified progress storage — local cache + immediate cloud upsert when authenticated.
(function () {
  'use strict';

  var FAST_DEBOUNCE_MS = 120;
  var APP_DEBOUNCE_MS = 120;

  var FAST_DIRTY_KEY = 'cambridge_fast_exercises_needs_cloud_sync';
  var APP_DIRTY_KEY = 'cambridge_app_progress_needs_cloud_sync';

  function _markDirty(key) {
    try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ }
  }

  var _fastTimer = null;
  var _appTimer = null;
  var _pushingFast = false;
  var _pushingApp = false;

  function _log(msg, detail) {
    if (detail) {
      console.warn('[ProgressStore] ' + msg, detail);
    } else {
      console.warn('[ProgressStore] ' + msg);
    }
  }

  function _isAuthenticated() {
    return !!(typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser());
  }

  async function _prepareCloud() {
    if (!_isAuthenticated()) return null;
    if (typeof Auth.ensureSessionOnClient === 'function') {
      var ok = await Auth.ensureSessionOnClient();
      if (!ok) return null;
    }
    var client = Auth.getClient ? Auth.getClient() : Auth._client;
    var user = Auth.getUser();
    if (!client || !user) return null;
    return { client: client, user: user };
  }

  function _setSyncStatus(state) {
    if (typeof SyncManager !== 'undefined' && SyncManager._setStatus) {
      SyncManager._setStatus(state);
    }
  }

  function _refreshUI() {
    if (typeof App !== 'undefined' && App.restoreExamStatuses) {
      App.restoreExamStatuses();
    }
    if (typeof App !== 'undefined' && App.refreshProgressUI) {
      App.refreshProgressUI();
    }
  }

  window.ProgressStore = {
    isCloudEnabled: function () {
      return _isAuthenticated();
    },

    /** Pull all progress domains from Supabase into localStorage. */
    restoreAll: async function () {
      if (!_isAuthenticated()) return false;

      _setSyncStatus('syncing');

      try {
        if (typeof SyncManager !== 'undefined' && SyncManager.restoreFromCloud) {
          await SyncManager.restoreFromCloud();
        }
        if (typeof StreakManager !== 'undefined' && StreakManager.restoreFromCloud) {
          await StreakManager.restoreFromCloud();
        }
        if (typeof CrosswordSync !== 'undefined') {
          if (CrosswordSync.migrateFromLegacy) CrosswordSync.migrateFromLegacy();
          if (CrosswordSync.restoreFromCloud) await CrosswordSync.restoreFromCloud();
        }
        _refreshUI();
        _setSyncStatus('synced');
        setTimeout(function () { _setSyncStatus(''); }, 2500);
        return true;
      } catch (e) {
        _log('restoreAll failed', e);
        _setSyncStatus('error');
        return false;
      }
    },

    /** Re-restore when local cache was wiped but user is still signed in. */
    restoreIfLocalEmpty: async function () {
      if (!_isAuthenticated()) return false;
      if (typeof SyncManager !== 'undefined' && SyncManager.restoreIfLocalEmpty) {
        return SyncManager.restoreIfLocalEmpty();
      }
      return false;
    },

    /** Wordle / fast exercises / vocab — save to cloud immediately. */
    onFastLearningChanged: function () {
      // Always mark dirty, so guest progress is pushed after a later sign-in
      // and failed pushes are retried by the periodic sync.
      _markDirty(FAST_DIRTY_KEY);
      if (!_isAuthenticated()) return;
      if (_fastTimer) clearTimeout(_fastTimer);
      var self = this;
      _fastTimer = setTimeout(function () {
        _fastTimer = null;
        self.pushFastLearningNow();
      }, FAST_DEBOUNCE_MS);
    },

    /** Course / Sune Play / mixed / video — save to cloud immediately. */
    onAppProgressChanged: function () {
      // Always mark dirty, so guest progress is pushed after a later sign-in
      // and failed pushes are retried by the periodic sync.
      _markDirty(APP_DIRTY_KEY);
      if (!_isAuthenticated()) return;
      if (_appTimer) clearTimeout(_appTimer);
      var self = this;
      _appTimer = setTimeout(function () {
        _appTimer = null;
        self.pushAppProgressNow();
      }, APP_DEBOUNCE_MS);
    },

    /** Exam parts still use SyncManager batching (many small keys). */
    onExamPartChanged: function () {
      if (!_isAuthenticated()) return;
      if (typeof SyncManager !== 'undefined' && SyncManager.requestSyncSoon) {
        SyncManager.requestSyncSoon();
      }
    },

    pushFastLearningNow: async function () {
      if (_pushingFast) return { ok: false, reason: 'busy' };
      if (typeof SyncManager !== 'undefined' && SyncManager.pushFastLearningNow) {
        _pushingFast = true;
        _setSyncStatus('syncing');
        try {
          var result = await SyncManager.pushFastLearningNow();
          if (result && result.ok) {
            _setSyncStatus('synced');
            setTimeout(function () { _setSyncStatus(''); }, 2000);
          } else if (result && result.error) {
            _setSyncStatus('error');
          }
          return result || { ok: false };
        } finally {
          _pushingFast = false;
        }
      }
      return { ok: false, reason: 'unavailable' };
    },

    pushAppProgressNow: async function () {
      if (_pushingApp) return { ok: false, reason: 'busy' };
      if (typeof SyncManager !== 'undefined' && SyncManager.pushAppProgressNow) {
        _pushingApp = true;
        _setSyncStatus('syncing');
        try {
          var result = await SyncManager.pushAppProgressNow();
          if (result && result.ok) {
            _setSyncStatus('synced');
            setTimeout(function () { _setSyncStatus(''); }, 2000);
          } else if (result && result.error) {
            _setSyncStatus('error');
          }
          return result || { ok: false };
        } finally {
          _pushingApp = false;
        }
      }
      return { ok: false, reason: 'unavailable' };
    },

    /** Flush everything before tab close. */
    flushAll: async function () {
      if (!_isAuthenticated()) return;
      await this.pushFastLearningNow();
      await this.pushAppProgressNow();
      if (typeof SyncManager !== 'undefined' && SyncManager.flush) {
        await SyncManager.flush();
      }
      if (typeof CrosswordSync !== 'undefined' && CrosswordSync._push) {
        await CrosswordSync._push();
      }
      if (typeof StreakManager !== 'undefined' && StreakManager._syncToCloud) {
        await StreakManager._syncToCloud();
      }
    }
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      ProgressStore.flushAll();
    } else if (document.visibilityState === 'visible') {
      ProgressStore.restoreIfLocalEmpty();
    }
  });
})();
