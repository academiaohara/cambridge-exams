// js/sync-manager.js
// Offline-first sync — exam parts (practice / exam / mixed), section timers,
// and fast-learning map progress → Supabase user_progress. Local wins on newer updatedAt.
(function () {
  'use strict';

  var EXAM_MODES = { practice: 1, exam: 1, mixed: 1 };
  var EXAM_SECTIONS = { reading: 1, listening: 1, writing: 1, speaking: 1 };

  /** cambridge_<mode>_<level>_<examId>_<section>_<part> — examId has no underscores */
  var RE_EXAM_PART = /^cambridge_(practice|exam|mixed)_([^_]+)_([^_]+)_(reading|listening|writing|speaking)_(\d+)$/;

  /** cambridge_<mode>_<level>_<examId>_<section>_sectimer — value is plain seconds string */
  var RE_SECTIMER = /^cambridge_(practice|exam|mixed)_([^_]+)_([^_]+)_(reading|listening|writing|speaking)_sectimer$/;

  var FAST_LS_KEY = 'cambridge_fast_exercises';
  var FAST_DIRTY_KEY = 'cambridge_fast_exercises_needs_cloud_sync';

  /** Old SyncManager.saveProgress payload (camelCase metadata + flat answers). */
  function _legacySyncShape(entry) {
    return !!(
      entry &&
      typeof entry === 'object' &&
      typeof entry.examId === 'string' &&
      typeof entry.mode === 'string' &&
      typeof entry.level === 'string' &&
      typeof entry.updatedAt === 'string'
    );
  }

  function _isExercisePartBlob(entry) {
    if (!entry || typeof entry !== 'object' || _legacySyncShape(entry)) return false;
    return (
      Object.prototype.hasOwnProperty.call(entry, 'answers') ||
      Object.prototype.hasOwnProperty.call(entry, 'answersChecked') ||
      Object.prototype.hasOwnProperty.call(entry, 'partScore')
    );
  }

  function _parseExamPartKey(key) {
    var m = RE_EXAM_PART.exec(key);
    if (!m) return null;
    return { mode: m[1], level: m[2], examId: m[3], section: m[4], part: parseInt(m[5], 10) };
  }

  function _parseSectimerKey(key) {
    var m = RE_SECTIMER.exec(key);
    if (!m) return null;
    return { mode: m[1], level: m[2], examId: m[3], section: m[4] };
  }

  function _localIsNewer(local, cloudIso) {
    try {
      var lu = local && local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      var cu = cloudIso ? new Date(cloudIso).getTime() : 0;
      return lu >= cu;
    } catch (e) {
      return true;
    }
  }

  function _applyCourseProgressRow(row) {
    if (row.mode !== 'course' || !row.level || !row.exam_id) { return; }
    var section = row.section;
    var answers = row.answers || {};

    if (section === 'unit') {
      if (answers.completed || answers.passed) {
        try {
          var prog = JSON.parse(localStorage.getItem('cambridge_course_progress_' + row.level) || '{}');
          prog[row.exam_id] = true;
          localStorage.setItem('cambridge_course_progress_' + row.level, JSON.stringify(prog));
        } catch (e) { /* ignore */ }
      }
      return;
    }

    if (typeof section === 'string' && section.indexOf('exercise:') === 0) {
      var exerciseId = section.slice(9);
      try {
        var spKey = 'sune_play_progress_' + row.exam_id;
        var spProg = JSON.parse(localStorage.getItem(spKey) || '{}');
        if (!spProg.completedExercises) { spProg.completedExercises = {}; }
        spProg.completedExercises[exerciseId] = true;
        localStorage.setItem(spKey, JSON.stringify(spProg));
      } catch (e) { /* ignore */ }
      return;
    }

    if (typeof section === 'string' && section.indexOf('node:') === 0) {
      var nodeId = section.slice(5);
      try {
        var spKeyNode = 'sune_play_progress_' + row.exam_id;
        var spProgNode = JSON.parse(localStorage.getItem(spKeyNode) || '{}');
        if (!spProgNode.completedNodes) { spProgNode.completedNodes = {}; }
        spProgNode.completedNodes[nodeId] = true;
        localStorage.setItem(spKeyNode, JSON.stringify(spProgNode));
      } catch (e) { /* ignore */ }
      return;
    }

    if (typeof section !== 'string' || section.indexOf('ex_') !== 0) { return; }

    var secPart = section.slice(3);
    var secIdx = /^\d+$/.test(secPart) ? parseInt(secPart, 10) : secPart;
    var score = row.score != null ? row.score : (answers.score != null ? answers.score : 0);
    var total = answers.total != null ? answers.total : (score || 1);

    if (/^Review\d+/.test(row.exam_id)) {
      try {
        var raKey = 'cambridge_review_answers_' + row.level;
        var ra = JSON.parse(localStorage.getItem(raKey) || '{}');
        var rsKey = 'cambridge_review_section_state_' + row.level;
        var rs = JSON.parse(localStorage.getItem(rsKey) || '{}');
        var reviewSkey = row.exam_id + '_' + secIdx;
        ra[reviewSkey] = score;
        rs[reviewSkey] = { score: score, total: total, answers: {} };
        localStorage.setItem(raKey, JSON.stringify(ra));
        localStorage.setItem(rsKey, JSON.stringify(rs));
      } catch (e) { /* ignore */ }
      return;
    }

    try {
      var exKey = 'course_ex_state_' + row.level;
      var exState = JSON.parse(localStorage.getItem(exKey) || '{}');
      var exSkey = row.exam_id + '_' + secIdx;
      if (!(exState[exSkey] && exState[exSkey].checked)) {
        exState[exSkey] = { checked: true, score: score, total: total };
        localStorage.setItem(exKey, JSON.stringify(exState));
      }
    } catch (e) { /* ignore */ }
  }

  /** Build Exercise.loadPartState payload from user_progress row. */
  function _rowToExerciseLocal(row) {
    var raw = row.answers;
    if (raw && typeof raw === 'object' && !_legacySyncShape(raw) && _isExercisePartBlob(raw)) {
      var o = JSON.parse(JSON.stringify(raw));
      delete o.synced;
      o.synced = true;
      if (!o.updatedAt && row.completed_at) o.updatedAt = row.completed_at;
      return o;
    }
    return {
      answers: (raw && typeof raw === 'object' && !raw.examId) ? raw : {},
      answersChecked: row.score !== null && row.score !== undefined,
      partScore: row.score != null ? row.score : 0,
      elapsedSeconds: 0,
      updatedAt: row.completed_at || new Date().toISOString(),
      synced: true
    };
  }

  window.SyncManager = {
    _intervalId: null,
    _syncIntervalMs: 10000,
    _pending: false,
    _running: false,
    _requestSyncTimer: null,
    _flushListenersBound: false,
    /** sectimer key → last value pushed to cloud (plain string) */
    _sectimerSyncedVal: {},

    start: function () {
      if (this._running) { return; }
      this._running = true;
      this._intervalId = setInterval(this._sync.bind(this), this._syncIntervalMs);
      this._bindFlushListeners();
      this._sync();
    },

    stop: function () {
      this._running = false;
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      this._sectimerSyncedVal = {};
      this._setStatus('');
    },

    requestSyncSoon: function () {
      if (!(Auth && Auth.getUser())) { return; }
      var self = this;
      if (this._requestSyncTimer) { clearTimeout(this._requestSyncTimer); }
      this._requestSyncTimer = setTimeout(function () {
        self._requestSyncTimer = null;
        self._sync();
      }, 2500);
    },

    flush: function () {
      if (this._requestSyncTimer) {
        clearTimeout(this._requestSyncTimer);
        this._requestSyncTimer = null;
      }
      return this._sync();
    },

    _bindFlushListeners: function () {
      if (this._flushListenersBound) { return; }
      this._flushListenersBound = true;
      var self = this;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') { self.flush(); }
      });
    },

    saveProgress: function (options) {
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

    notifyFastLearningDirty: function () {
      try { localStorage.setItem(FAST_DIRTY_KEY, '1'); } catch (e) { /* ignore */ }
      this.requestSyncSoon();
    },

    restoreFromCloud: async function () {
      var client = Auth && Auth._client;
      var user = Auth && Auth.getUser();
      if (!client || !user) { return; }

      try {
        var result = await client
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id);
        if (result.error || !result.data) { return; }

        result.data.forEach(function (row) {
          if (row.mode === 'course') {
            _applyCourseProgressRow(row);
            return;
          }

          if (row.mode === 'fast' && row.section === 'state' && row.exam_id === 'fast_learning') {
            try {
              if (!row.answers || typeof row.answers !== 'object') { return; }
              var existing = localStorage.getItem(FAST_LS_KEY);
              var localObj = null;
              if (existing) {
                try { localObj = JSON.parse(existing); } catch (e) { localObj = null; }
              }
              var cloudIso = row.completed_at;
              var localIso = localObj && localObj._fastProgressUpdatedAt;
              if (localIso && cloudIso && new Date(localIso) >= new Date(cloudIso)) { return; }
              var merged = JSON.parse(JSON.stringify(row.answers));
              merged._fastProgressUpdatedAt = cloudIso || new Date().toISOString();
              localStorage.setItem(FAST_LS_KEY, JSON.stringify(merged));
              try { localStorage.removeItem(FAST_DIRTY_KEY); } catch (e2) { /* ignore */ }
            } catch (e) { /* ignore */ }
            return;
          }

          if (!EXAM_MODES[row.mode] || !row.level || !row.exam_id) { return; }

          var sect = row.section;
          if (typeof sect === 'string' && sect.indexOf('_sectimer') !== -1) {
            var baseSec = sect.replace('_sectimer', '');
            if (!EXAM_SECTIONS[baseSec]) { return; }
            var tKey = 'cambridge_' + row.mode + '_' + row.level + '_' + row.exam_id + '_' + baseSec + '_sectimer';
            var seconds = 0;
            if (row.answers && typeof row.answers === 'object') {
              seconds = parseInt(row.answers._sectimerSeconds != null ? row.answers._sectimerSeconds : row.answers.seconds, 10) || 0;
            }
            try {
              var existingRaw = localStorage.getItem(tKey);
              var existingSec = parseInt(existingRaw, 10) || 0;
              var mergedSec = Math.max(existingSec, seconds);
              localStorage.setItem(tKey, String(mergedSec));
              if (window.SyncManager && SyncManager._sectimerSyncedVal) {
                SyncManager._sectimerSyncedVal[tKey] = String(mergedSec);
              }
            } catch (e3) { /* ignore */ }
            return;
          }

          if (!EXAM_SECTIONS[sect] || row.part == null) { return; }

          var key = 'cambridge_' + row.mode + '_' + row.level + '_' + row.exam_id + '_' + sect + '_' + row.part;
          var cloudPayload = _rowToExerciseLocal(row);

          try {
            var existing = localStorage.getItem(key);
            if (existing) {
              var local = JSON.parse(existing);
              if (_localIsNewer(local, row.completed_at)) { return; }
            }
          } catch (e) { /* overwrite corrupt */ }

          try {
            localStorage.setItem(key, JSON.stringify(cloudPayload));
          } catch (e) { /* quota */ }
        });
      } catch (e) {
        console.warn('[SyncManager] restoreFromCloud error:', e);
      }
    },

    _sync: async function () {
      var client = Auth && Auth._client;
      var user = Auth && Auth.getUser();
      if (!client || !user) { return; }

      var keys = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith('cambridge_')) { keys.push(k); }
        }
      } catch (e) { return; }

      var tasks = [];
      var self = this;

      keys.forEach(function (k) {
        var raw = null;
        try { raw = localStorage.getItem(k); } catch (e) { return; }
        if (raw == null) { return; }

        var parsedPart = _parseExamPartKey(k);
        if (parsedPart) {
          try {
            var entry = JSON.parse(raw);
            if (_legacySyncShape(entry)) {
              if (!entry.synced) { tasks.push({ kind: 'legacy', key: k, entry: entry }); }
              return;
            }
            if (_isExercisePartBlob(entry) && !entry.synced) {
              tasks.push({ kind: 'examPart', key: k, parsed: parsedPart, entry: entry });
            }
          } catch (e) { /* skip */ }
          return;
        }

        var parsedTimer = _parseSectimerKey(k);
        if (parsedTimer && raw.indexOf('{') === -1) {
          if (self._sectimerSyncedVal[k] !== raw) {
            tasks.push({ kind: 'sectimer', key: k, parsed: parsedTimer, seconds: parseInt(raw, 10) || 0, rawVal: raw });
          }
        }
      });

      try {
        if (localStorage.getItem(FAST_DIRTY_KEY) === '1') {
          var fRaw = localStorage.getItem(FAST_LS_KEY);
          if (fRaw) {
            try {
              JSON.parse(fRaw);
              tasks.push({ kind: 'fast', raw: fRaw });
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }

      if (tasks.length === 0) { this._setStatus(''); return; }

      this._setStatus('syncing');
      var success = 0;

      for (var t = 0; t < tasks.length; t++) {
        var item = tasks[t];
        try {
          if (item.kind === 'examPart') {
            var e = item.entry;
            var p = item.parsed;
            var answersBlob = JSON.parse(JSON.stringify(e));
            delete answersBlob.synced;
            var row = {
              user_id: user.id,
              level: p.level,
              exam_id: p.examId,
              section: p.section,
              part: p.part,
              answers: answersBlob,
              score: e.answersChecked ? (e.partScore != null ? e.partScore : 0) : null,
              mode: p.mode,
              completed_at: e.updatedAt || new Date().toISOString()
            };
            var res = await client.from('user_progress').upsert(row, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (!res.error) {
              success++;
              try {
                var cur = JSON.parse(localStorage.getItem(item.key) || '{}');
                cur.synced = true;
                localStorage.setItem(item.key, JSON.stringify(cur));
              } catch (e2) { /* ignore */ }
            }
          } else if (item.kind === 'sectimer') {
            var p2 = item.parsed;
            var row2 = {
              user_id: user.id,
              level: p2.level,
              exam_id: p2.examId,
              section: p2.section + '_sectimer',
              part: 1,
              answers: { _sectimerSeconds: item.seconds, updatedAt: new Date().toISOString() },
              score: null,
              mode: p2.mode,
              completed_at: new Date().toISOString()
            };
            var res2 = await client.from('user_progress').upsert(row2, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (!res2.error) {
              success++;
              self._sectimerSyncedVal[item.key] = item.rawVal;
            }
          } else if (item.kind === 'legacy') {
            var e3 = item.entry;
            var row3 = {
              user_id: user.id,
              level: e3.level,
              exam_id: e3.examId,
              section: e3.section,
              part: e3.part,
              answers: e3.answers,
              score: e3.score,
              mode: e3.mode,
              completed_at: e3.updatedAt
            };
            var res3 = await client.from('user_progress').upsert(row3, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (!res3.error) {
              success++;
              try {
                var cur3 = JSON.parse(localStorage.getItem(item.key) || '{}');
                cur3.synced = true;
                localStorage.setItem(item.key, JSON.stringify(cur3));
              } catch (e4) { /* ignore */ }
            }
          } else if (item.kind === 'fast') {
            var fObj = JSON.parse(item.raw);
            delete fObj._fastProgressUpdatedAt;
            var lvl = (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1';
            var rowF = {
              user_id: user.id,
              level: lvl,
              exam_id: 'fast_learning',
              section: 'state',
              part: 1,
              answers: fObj,
              score: null,
              mode: 'fast',
              completed_at: new Date().toISOString()
            };
            var resF = await client.from('user_progress').upsert(rowF, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (!resF.error) {
              success++;
              try {
                localStorage.removeItem(FAST_DIRTY_KEY);
                var curF = JSON.parse(localStorage.getItem(FAST_LS_KEY) || '{}');
                curF._fastProgressUpdatedAt = rowF.completed_at;
                localStorage.setItem(FAST_LS_KEY, JSON.stringify(curF));
              } catch (e5) { /* ignore */ }
            }
          }
        } catch (err) {
          console.warn('[SyncManager] sync error', item, err);
        }
      }

      if (success === tasks.length) {
        this._setStatus('synced');
        this._pending = false;
        setTimeout(this._clearStatus.bind(this), 3000);
      } else if (success > 0) {
        this._setStatus('synced');
        setTimeout(this._clearStatus.bind(this), 3000);
      } else {
        this._setStatus('error');
      }
    },

    _setStatus: function (state) {
      var el = document.getElementById('sync-status-indicator');
      if (!el) { return; }
      el.innerHTML = '';
      if (state === 'syncing') {
        el.textContent = 'Syncing…';
        el.className = 'sync-status syncing';
        el.style.display = 'inline-flex';
      } else if (state === 'synced') {
        var syncIcon = document.createElement('span');
        syncIcon.className = 'material-symbols-outlined';
        syncIcon.textContent = 'check_circle';
        el.appendChild(syncIcon);
        el.appendChild(document.createTextNode(' Synced'));
        el.className = 'sync-status synced';
        el.style.display = 'inline-flex';
      } else if (state === 'error') {
        el.textContent = '';
        var errIcon = document.createElement('span');
        errIcon.className = 'material-symbols-outlined';
        errIcon.textContent = 'warning';
        el.appendChild(errIcon);
        el.appendChild(document.createTextNode(' Sync failed'));
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
