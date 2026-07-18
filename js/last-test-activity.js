// js/last-test-activity.js
// Tracks the last test-practice/simulation exercise opened (level + part).
// Persisted locally and synced to Supabase user_progress (mode: meta).
(function () {
  'use strict';

  var STORAGE_KEY = 'cambridge_last_test_activity';
  var DIRTY_KEY = 'cambridge_last_test_activity_needs_cloud_sync';
  var SYNC_TS_KEY = 'cambridge_last_test_activity_sync';
  var VALID_LEVELS = { B1: 1, B2: 1, C1: 1, C2: 1 };
  var EXAM_PART_RE = /^cambridge_(practice|exam)_([^_]+)_(Test\d+)_(reading|listening|writing|speaking)_(\d+)$/;

  function _safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  function _parseTime(iso) {
    if (!iso) return 0;
    var t = Date.parse(iso);
    return isNaN(t) ? 0 : t;
  }

  function _normalizeActivity(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var level = String(raw.level || '').toUpperCase();
    if (!VALID_LEVELS[level]) return null;
    var examId = String(raw.examId || '');
    if (!/^Test\d+$/i.test(examId)) return null;
    var section = String(raw.section || '').toLowerCase();
    if (['reading', 'listening', 'writing', 'speaking'].indexOf(section) === -1) return null;
    var part = parseInt(raw.part, 10);
    if (isNaN(part) || part < 1) return null;
    var mode = raw.mode === 'exam' ? 'exam' : 'practice';
    return {
      level: level,
      examId: examId.replace(/^test/i, 'Test'),
      section: section,
      part: part,
      mode: mode,
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  function _readLocal() {
    return _normalizeActivity(_safeParse(localStorage.getItem(STORAGE_KEY)));
  }

  function _writeLocal(activity) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activity));
      localStorage.setItem(DIRTY_KEY, '1');
      localStorage.removeItem(SYNC_TS_KEY);
    } catch (e) { /* ignore */ }
  }

  function _scanExamPartsForLatest() {
    var best = null;
    var bestTime = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        var match = EXAM_PART_RE.exec(key);
        if (!match) continue;
        var level = match[2].toUpperCase();
        if (!VALID_LEVELS[level]) continue;
        var data = _safeParse(localStorage.getItem(key));
        if (!data) continue;
        var t = _parseTime(data.updatedAt);
        if (t > bestTime) {
          bestTime = t;
          best = _normalizeActivity({
            level: level,
            examId: match[3],
            section: match[4],
            part: parseInt(match[5], 10),
            mode: match[1] === 'exam' ? 'exam' : 'practice',
            updatedAt: data.updatedAt
          });
        }
      }
    } catch (e) { /* ignore */ }
    return best;
  }

  function _markSynced(iso) {
    try {
      localStorage.removeItem(DIRTY_KEY);
      if (iso) localStorage.setItem(SYNC_TS_KEY, iso);
    } catch (e) { /* ignore */ }
  }

  function _queueCloudSync() {
    if (typeof ProgressStore !== 'undefined' && ProgressStore.onAppProgressChanged) {
      ProgressStore.onAppProgressChanged();
    } else if (typeof SyncManager !== 'undefined' && SyncManager.requestSyncSoon) {
      SyncManager.requestSyncSoon();
    }
  }

  window.LastTestActivity = {
    STORAGE_KEY: STORAGE_KEY,
    DIRTY_KEY: DIRTY_KEY,

    get: function () {
      return _readLocal() || _scanExamPartsForLatest();
    },

    getLevel: function () {
      var activity = this.get();
      return activity ? activity.level : 'C1';
    },

    applyToAppState: function () {
      if (typeof AppState === 'undefined' || AppState.currentView === 'exercise') return;
      AppState.currentLevel = this.getLevel();
    },

    record: function (level, examId, section, part, mode) {
      if (typeof level === 'object' && level) {
        mode = level.mode;
        part = level.part;
        section = level.section;
        examId = level.examId;
        level = level.level;
      }
      var activity = _normalizeActivity({
        level: level,
        examId: examId,
        section: section,
        part: part,
        mode: mode,
        updatedAt: new Date().toISOString()
      });
      if (!activity) return;
      _writeLocal(activity);
      _queueCloudSync();
    },

    hasLocalData: function () {
      try { return localStorage.getItem(DIRTY_KEY) === '1'; }
      catch (e) { return false; }
    },

    buildCloudRow: function (userId) {
      var activity = _readLocal();
      if (!activity) return null;
      return {
        user_id: userId,
        level: activity.level,
        exam_id: 'last_test',
        section: 'activity',
        part: 1,
        answers: activity,
        score: null,
        mode: 'meta',
        completed_at: activity.updatedAt
      };
    },

    restoreFromCloudRow: function (row) {
      if (!row || row.mode !== 'meta' || row.exam_id !== 'last_test' || row.section !== 'activity') {
        return;
      }
      var cloudActivity = _normalizeActivity(row.answers || {});
      if (!cloudActivity) return;
      if (row.completed_at) cloudActivity.updatedAt = row.completed_at;

      var local = _readLocal();
      var localTime = local ? _parseTime(local.updatedAt) : 0;
      var cloudTime = _parseTime(cloudActivity.updatedAt);
      if (!local || cloudTime >= localTime) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudActivity));
          _markSynced(cloudActivity.updatedAt);
        } catch (e) { /* ignore */ }
        if (typeof AppState !== 'undefined' && AppState.currentView !== 'exercise') {
          AppState.currentLevel = cloudActivity.level;
        }
      }
    },

    pushToCloud: async function (client, user) {
      if (!client || !user) return { ok: false, reason: 'not_authenticated' };
      if (!this.hasLocalData()) return { ok: false, reason: 'clean' };
      var row = this.buildCloudRow(user.id);
      if (!row) return { ok: false, reason: 'empty' };
      var res = await client.from('user_progress').upsert(row, { onConflict: 'user_id,exam_id,section,part,mode' });
      if (res.error) return { ok: false, error: res.error };
      _markSynced(row.completed_at);
      return { ok: true };
    }
  };
})();
