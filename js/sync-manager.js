// js/sync-manager.js
// Offline-first sync — exam parts, section timers, fast learning, course path,
// Sune Play state, mixed test sessions, video stories → Supabase user_progress.
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
  var VOCAB_STREAKS_KEY = 'cambridge_vocab_streaks';
  var WORDLE_KEY = 'cambridge_wordle_progress';
  var MIXED_PLAN_KEY = 'cambridge_mixed_plan';
  var MIXED_COMPLETED_KEY = 'cambridge_mixed_completed';
  var VIDEO_KEY = 'cambridge_video_exercises';
  var APP_DIRTY_KEY = 'cambridge_app_progress_needs_cloud_sync';
  var COURSE_LEVELS = ['B1', 'B2', 'C1'];

  /** cambridge_mixed_{level}_{section}_sectimer — mixed mode has no examId in key */
  var RE_MIXED_SECTIMER = /^cambridge_mixed_([^_]+)_(reading|listening|writing|speaking)_sectimer$/;

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

  function _parseMixedSectimerKey(key) {
    var m = RE_MIXED_SECTIMER.exec(key);
    if (!m) return null;
    return { mode: 'mixed', level: m[1], examId: 'session', section: m[2] };
  }

  function _safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : (fallback || {}); }
    catch (e) { return fallback || {}; }
  }

  function _cloudIsNewer(cloudIso, localIso) {
    try {
      if (!cloudIso) return false;
      if (!localIso) return true;
      return new Date(cloudIso).getTime() > new Date(localIso).getTime();
    } catch (e) { return false; }
  }

  function _objectHasKeys(obj) {
    return !!(obj && typeof obj === 'object' && Object.keys(obj).length > 0);
  }

  function _shouldApplyCloudRow(cloudIso, localSyncIso, hasLocalData, fallbackLocalIso) {
    if (!hasLocalData) return true;
    if (localSyncIso) return _cloudIsNewer(cloudIso, localSyncIso);
    if (fallbackLocalIso) return _cloudIsNewer(cloudIso, fallbackLocalIso);
    return true;
  }

  function _hasLocalCoursePathData(level) {
    try {
      var keys = [
        'cambridge_course_progress_' + level,
        'cambridge_course_section_progress_' + level,
        'cambridge_course_section_opened_' + level,
        'course_ex_state_' + level,
        'cambridge_review_answers_' + level,
        'cambridge_review_section_state_' + level
      ];
      for (var i = 0; i < keys.length; i++) {
        var raw = localStorage.getItem(keys[i]);
        if (!raw || raw === '{}' || raw === '[]') continue;
        var parsed = JSON.parse(raw);
        if (_objectHasKeys(parsed)) return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function _coursePathSnapshotHasData(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    return (
      _objectHasKeys(snapshot.courseProgress) ||
      _objectHasKeys(snapshot.sectionProgress) ||
      _objectHasKeys(snapshot.sectionOpened) ||
      _objectHasKeys(snapshot.exState) ||
      _objectHasKeys(snapshot.reviewAnswers) ||
      _objectHasKeys(snapshot.reviewSectionState)
    );
  }

  function _hasLocalSuneData(unitId) {
    try {
      var raw = localStorage.getItem('sune_play_progress_' + unitId);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (parsed.theoryCompleted) return true;
      if (_objectHasKeys(parsed.completedNodes)) return true;
      if (_objectHasKeys(parsed.completedExercises)) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function _hasLocalMixedSessionData() {
    try {
      if (localStorage.getItem(MIXED_PLAN_KEY)) return true;
      var completed = _safeParse(localStorage.getItem(MIXED_COMPLETED_KEY), []);
      return Array.isArray(completed) && completed.length > 0;
    } catch (e) { return false; }
  }

  function _hasLocalVideoData() {
    try {
      var raw = localStorage.getItem(VIDEO_KEY);
      if (!raw || raw === '{}') return false;
      return _objectHasKeys(JSON.parse(raw));
    } catch (e) { return false; }
  }

  function _hasLocalFastData() {
    try {
      var raw = localStorage.getItem(FAST_LS_KEY);
      if (!raw || raw === '{}') return false;
      var parsed = JSON.parse(raw);
      return Object.keys(parsed).some(function (key) {
        return key.charAt(0) !== '_' && parsed[key] != null;
      });
    } catch (e) { return false; }
  }

  function _logSyncError(context, error, extra) {
    if (!error) return;
    var msg = '[SyncManager] ' + context + ': ' + (error.message || String(error));
    if (error.code) msg += ' (' + error.code + ')';
    console.warn(msg, extra || '');
  }

  function _hasAnyLocalProgressData() {
    return _hasLocalFastData() || _hasLocalAppProgressData();
  }

  function _hasLocalAppProgressData() {
    for (var i = 0; i < COURSE_LEVELS.length; i++) {
      if (_hasLocalCoursePathData(COURSE_LEVELS[i])) return true;
    }
    var suneIds = _collectSuneUnitIds();
    for (var j = 0; j < suneIds.length; j++) {
      if (_hasLocalSuneData(suneIds[j])) return true;
    }
    return _hasLocalMixedSessionData() || _hasLocalVideoData();
  }

  function _hasUnsyncedExamParts() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || !k.startsWith('cambridge_')) continue;
        var parsedPart = _parseExamPartKey(k);
        if (!parsedPart) continue;
        var raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          var entry = JSON.parse(raw);
          if (_isExercisePartBlob(entry) && !entry.synced) return true;
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function _collectCoursePathSnapshot(level) {
    var snapshot = {
      courseProgress: _safeParse(localStorage.getItem('cambridge_course_progress_' + level)),
      sectionProgress: _safeParse(localStorage.getItem('cambridge_course_section_progress_' + level)),
      sectionOpened: _safeParse(localStorage.getItem('cambridge_course_section_opened_' + level)),
      exState: _safeParse(localStorage.getItem('course_ex_state_' + level)),
      reviewAnswers: _safeParse(localStorage.getItem('cambridge_review_answers_' + level)),
      reviewSectionState: _safeParse(localStorage.getItem('cambridge_review_section_state_' + level)),
      updatedAt: new Date().toISOString()
    };
    try {
      var idx = localStorage.getItem('cambridge_course_path_advance_index');
      var pending = localStorage.getItem('cambridge_course_path_advance_pending');
      if (idx != null) snapshot.pathAdvanceIndex = idx;
      if (pending != null) snapshot.pathAdvancePending = pending;
    } catch (e) { /* ignore */ }
    return snapshot;
  }

  function _restoreCoursePathSnapshot(row) {
    if (!row || !row.section || !row.answers) return;
    var level = row.section;
    var data = row.answers;
    var localUpdated = null;
    try {
      var metaKey = 'cambridge_course_path_sync_' + level;
      localUpdated = localStorage.getItem(metaKey);
    } catch (e) { /* ignore */ }
    if (!_shouldApplyCloudRow(row.completed_at, localUpdated, _hasLocalCoursePathData(level), data.updatedAt)) return;

    try {
      if (data.courseProgress) localStorage.setItem('cambridge_course_progress_' + level, JSON.stringify(data.courseProgress));
      if (data.sectionProgress) localStorage.setItem('cambridge_course_section_progress_' + level, JSON.stringify(data.sectionProgress));
      if (data.sectionOpened) localStorage.setItem('cambridge_course_section_opened_' + level, JSON.stringify(data.sectionOpened));
      if (data.exState) localStorage.setItem('course_ex_state_' + level, JSON.stringify(data.exState));
      if (data.reviewAnswers) localStorage.setItem('cambridge_review_answers_' + level, JSON.stringify(data.reviewAnswers));
      if (data.reviewSectionState) localStorage.setItem('cambridge_review_section_state_' + level, JSON.stringify(data.reviewSectionState));
      if (data.pathAdvanceIndex != null) localStorage.setItem('cambridge_course_path_advance_index', String(data.pathAdvanceIndex));
      if (data.pathAdvancePending != null) localStorage.setItem('cambridge_course_path_advance_pending', String(data.pathAdvancePending));
      localStorage.setItem('cambridge_course_path_sync_' + level, row.completed_at || data.updatedAt || new Date().toISOString());
    } catch (e) { /* ignore */ }
  }

  function _restoreSuneStateRow(row) {
    if (!row || !row.exam_id || !row.answers) return;
    var unitId = row.exam_id;
    var key = 'sune_play_progress_' + unitId;
    var data = row.answers;
    var localUpdated = null;
    try { localUpdated = localStorage.getItem('sune_play_sync_' + unitId); } catch (e) { /* ignore */ }
    if (!_shouldApplyCloudRow(row.completed_at, localUpdated, _hasLocalSuneData(unitId), data.updatedAt)) return;

    try {
      var merged = _safeParse(localStorage.getItem(key), { completedNodes: {}, completedExercises: {}, theoryCompleted: false });
      if (data.completedNodes) merged.completedNodes = Object.assign({}, merged.completedNodes, data.completedNodes);
      if (data.completedExercises) merged.completedExercises = Object.assign({}, merged.completedExercises, data.completedExercises);
      if (data.theoryCompleted) merged.theoryCompleted = true;
      if (data.testScores) merged.testScores = data.testScores;
      if (data.testScore) merged.testScore = data.testScore;
      localStorage.setItem(key, JSON.stringify(merged));
      if (data.theoryCompleted || localStorage.getItem('sune_play_theory_' + unitId) === 'complete') {
        localStorage.setItem('sune_play_theory_' + unitId, 'complete');
      }
      localStorage.setItem('sune_play_sync_' + unitId, row.completed_at || data.updatedAt || new Date().toISOString());
    } catch (e) { /* ignore */ }
  }

  function _restoreMixedSessionRow(row) {
    if (!row || !row.answers) return;
    var data = row.answers;
    var localUpdated = null;
    try { localUpdated = localStorage.getItem('cambridge_mixed_session_sync'); } catch (e) { /* ignore */ }
    if (!_shouldApplyCloudRow(row.completed_at, localUpdated, _hasLocalMixedSessionData(), data.updatedAt)) return;
    try {
      if (data.plan) localStorage.setItem(MIXED_PLAN_KEY, JSON.stringify(data.plan));
      if (data.completed) localStorage.setItem(MIXED_COMPLETED_KEY, JSON.stringify(data.completed));
      localStorage.setItem('cambridge_mixed_session_sync', row.completed_at || data.updatedAt || new Date().toISOString());
    } catch (e) { /* ignore */ }
  }

  function _restoreVideoProgressRow(row) {
    if (!row || !row.answers) return;
    var data = row.answers.progress || row.answers;
    var localUpdated = null;
    try { localUpdated = localStorage.getItem('cambridge_video_exercises_sync'); } catch (e) { /* ignore */ }
    if (!_shouldApplyCloudRow(row.completed_at, localUpdated, _hasLocalVideoData(), row.answers.updatedAt)) return;
    try {
      localStorage.setItem(VIDEO_KEY, JSON.stringify(data));
      localStorage.setItem('cambridge_video_exercises_sync', row.completed_at || row.answers.updatedAt || new Date().toISOString());
    } catch (e) { /* ignore */ }
  }

  function _restoreFastExtrasFromBlob(merged) {
    if (!merged || typeof merged !== 'object') return;
    try {
      if (merged._vocabStreaks) localStorage.setItem(VOCAB_STREAKS_KEY, JSON.stringify(merged._vocabStreaks));
      if (merged._wordleProgress) localStorage.setItem(WORDLE_KEY, JSON.stringify(merged._wordleProgress));
    } catch (e) { /* ignore */ }
  }

  function _collectSuneUnitIds() {
    var ids = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('sune_play_progress_') === 0) {
          ids.push(k.slice('sune_play_progress_'.length));
        }
      }
    } catch (e) { /* ignore */ }
    return ids;
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

    if (section === 'theory') {
      if (answers.completed) {
        try {
          var spTheoryKey = 'sune_play_progress_' + row.exam_id;
          var spTheoryProg = JSON.parse(localStorage.getItem(spTheoryKey) || '{}');
          spTheoryProg.theoryCompleted = true;
          localStorage.setItem(spTheoryKey, JSON.stringify(spTheoryProg));
          localStorage.setItem('sune_play_theory_' + row.exam_id, 'complete');
        } catch (e) { /* ignore */ }
      }
      return;
    }

    if (section === 'sune_state') {
      _restoreSuneStateRow(row);
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
        rs[reviewSkey] = {
          score: score,
          total: total,
          answers: answers.answers && typeof answers.answers === 'object' ? answers.answers : (answers.answerPayload || {})
        };
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
      var self = this;
      this.restoreIfLocalEmpty().finally(function () {
        self._sync();
      });
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
      }, 400);
    },

    restoreIfLocalEmpty: async function () {
      if (typeof Auth !== 'undefined' && Auth.ensureSessionOnClient) {
        await Auth.ensureSessionOnClient();
      }
      var client = Auth && Auth.getClient ? Auth.getClient() : (Auth && Auth._client);
      var user = Auth && Auth.getUser();
      if (!client || !user) return false;
      if (_hasAnyLocalProgressData() || _hasUnsyncedExamParts()) return false;
      await this.restoreFromCloud();
      if (typeof App !== 'undefined' && App.restoreExamStatuses) {
        App.restoreExamStatuses();
      }
      if (typeof App !== 'undefined' && App.refreshProgressUI) {
        App.refreshProgressUI();
      }
      return true;
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
        if (document.visibilityState === 'hidden') {
          self.flush();
        } else if (document.visibilityState === 'visible') {
          self.restoreIfLocalEmpty();
        }
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
      if (Auth && Auth.getUser()) {
        this.flush();
      }
    },

    notifyAppProgressDirty: function () {
      try { localStorage.setItem(APP_DIRTY_KEY, '1'); } catch (e) { /* ignore */ }
      if (Auth && Auth.getUser()) {
        this.flush();
      }
    },

    pushAllLocalToCloud: async function () {
      if (!_hasLocalFastData() && !_hasLocalAppProgressData() && !_hasUnsyncedExamParts()) {
        return;
      }
      if (_hasLocalFastData()) {
        try { localStorage.setItem(FAST_DIRTY_KEY, '1'); } catch (e) { /* ignore */ }
      }
      if (_hasLocalAppProgressData()) {
        try { localStorage.setItem(APP_DIRTY_KEY, '1'); } catch (e) { /* ignore */ }
      }
      if (typeof CrosswordSync !== 'undefined') {
        var cwAll = CrosswordSync.getAll();
        Object.keys(cwAll).forEach(function (id) {
          if (cwAll[id]) cwAll[id].synced = false;
        });
        CrosswordSync._persist(cwAll);
        await CrosswordSync._push();
      }
      await this._sync();
    },

    restoreFromCloud: async function () {
      if (typeof Auth !== 'undefined' && Auth.ensureSessionOnClient) {
        await Auth.ensureSessionOnClient();
      }
      var client = Auth && Auth.getClient ? Auth.getClient() : (Auth && Auth._client);
      var user = Auth && Auth.getUser();
      if (!client || !user) { return; }

      try {
        var result = await client
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id);
        if (result.error || !result.data) {
          if (result.error) {
            console.warn('[SyncManager] restoreFromCloud query failed:', result.error.message || result.error);
          }
          return;
        }

        result.data.forEach(function (row) {
          if (row.mode === 'course') {
            if (row.exam_id === 'path') {
              _restoreCoursePathSnapshot(row);
              return;
            }
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
              if (localIso && cloudIso && new Date(localIso) >= new Date(cloudIso)) {
                _restoreFastExtrasFromBlob(row.answers);
                return;
              }
              var merged = JSON.parse(JSON.stringify(row.answers));
              _restoreFastExtrasFromBlob(merged);
              merged._fastProgressUpdatedAt = cloudIso || new Date().toISOString();
              delete merged._vocabStreaks;
              delete merged._wordleProgress;
              localStorage.setItem(FAST_LS_KEY, JSON.stringify(merged));
              try { localStorage.removeItem(FAST_DIRTY_KEY); } catch (e2) { /* ignore */ }
            } catch (e) { /* ignore */ }
            return;
          }

          if (row.mode === 'mixed' && row.exam_id === 'session' && row.section === 'state') {
            _restoreMixedSessionRow(row);
            return;
          }

          if (row.mode === 'video' && row.exam_id === 'all' && row.section === 'state') {
            _restoreVideoProgressRow(row);
            return;
          }

          if (!EXAM_MODES[row.mode] || !row.level || !row.exam_id) { return; }

          var sect = row.section;
          if (typeof sect === 'string' && sect.indexOf('_sectimer') !== -1) {
            var baseSec = sect.replace('_sectimer', '');
            if (!EXAM_SECTIONS[baseSec]) { return; }
            var tKey = (row.mode === 'mixed' && row.exam_id === 'session')
              ? ('cambridge_mixed_' + row.level + '_' + baseSec + '_sectimer')
              : ('cambridge_' + row.mode + '_' + row.level + '_' + row.exam_id + '_' + baseSec + '_sectimer');
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
      if (typeof Auth !== 'undefined' && Auth.ensureSessionOnClient) {
        await Auth.ensureSessionOnClient();
      }
      var client = Auth && Auth.getClient ? Auth.getClient() : (Auth && Auth._client);
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
          return;
        }

        var parsedMixedTimer = _parseMixedSectimerKey(k);
        if (parsedMixedTimer && raw.indexOf('{') === -1) {
          if (self._sectimerSyncedVal[k] !== raw) {
            tasks.push({ kind: 'sectimer', key: k, parsed: parsedMixedTimer, seconds: parseInt(raw, 10) || 0, rawVal: raw });
          }
        }
      });

      try {
        if (localStorage.getItem(FAST_DIRTY_KEY) === '1') {
          tasks.push({ kind: 'fast', raw: localStorage.getItem(FAST_LS_KEY) || '{}' });
        }
      } catch (e) { /* ignore */ }

      try {
        if (localStorage.getItem(APP_DIRTY_KEY) === '1') {
          COURSE_LEVELS.forEach(function (level) {
            tasks.push({ kind: 'coursePath', level: level });
          });
          _collectSuneUnitIds().forEach(function (unitId) {
            tasks.push({ kind: 'suneState', unitId: unitId });
          });
          tasks.push({ kind: 'mixedSession' });
          tasks.push({ kind: 'videoProgress' });
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
            if (res.error) {
              _logSyncError('examPart upsert failed', res.error, row);
            } else {
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
            if (res2.error) {
              _logSyncError('sectimer upsert failed', res2.error, row2);
            } else {
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
            if (res3.error) {
              _logSyncError('legacy upsert failed', res3.error, row3);
            } else {
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
            delete fObj._vocabStreaks;
            delete fObj._wordleProgress;
            fObj._vocabStreaks = _safeParse(localStorage.getItem(VOCAB_STREAKS_KEY));
            fObj._wordleProgress = _safeParse(localStorage.getItem(WORDLE_KEY));
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
            if (resF.error) {
              _logSyncError('fast learning upsert failed', resF.error, rowF);
            } else {
              success++;
              try {
                localStorage.removeItem(FAST_DIRTY_KEY);
                var curF = JSON.parse(localStorage.getItem(FAST_LS_KEY) || '{}');
                curF._fastProgressUpdatedAt = rowF.completed_at;
                localStorage.setItem(FAST_LS_KEY, JSON.stringify(curF));
              } catch (e5) { /* ignore */ }
            }
          } else if (item.kind === 'coursePath') {
            var snapshot = _collectCoursePathSnapshot(item.level);
            if (!_coursePathSnapshotHasData(snapshot)) continue;
            var rowCp = {
              user_id: user.id,
              level: item.level,
              exam_id: 'path',
              section: item.level,
              part: 1,
              answers: snapshot,
              score: null,
              mode: 'course',
              completed_at: snapshot.updatedAt
            };
            var resCp = await client.from('user_progress').upsert(rowCp, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (resCp.error) {
              _logSyncError('course path upsert failed', resCp.error, rowCp);
            } else {
              success++;
              try { localStorage.setItem('cambridge_course_path_sync_' + item.level, snapshot.updatedAt); } catch (e6) { /* ignore */ }
            }
          } else if (item.kind === 'suneState') {
            var spKey = 'sune_play_progress_' + item.unitId;
            var spRaw = localStorage.getItem(spKey);
            if (!spRaw) continue;
            var spObj = _safeParse(spRaw, { completedNodes: {}, completedExercises: {}, theoryCompleted: false });
            var spUpdated = new Date().toISOString();
            spObj.updatedAt = spUpdated;
            var spLevel = spObj._level;
            if (!spLevel) {
              for (var li = 0; li < COURSE_LEVELS.length; li++) {
                var lvlGuess = COURSE_LEVELS[li];
                var cp = _safeParse(localStorage.getItem('cambridge_course_progress_' + lvlGuess));
                var sp = _safeParse(localStorage.getItem('cambridge_course_section_progress_' + lvlGuess));
                if (cp[item.unitId] || sp[item.unitId]) { spLevel = lvlGuess; break; }
              }
            }
            if (!spLevel) spLevel = (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'B1';
            var rowSp = {
              user_id: user.id,
              level: spLevel,
              exam_id: item.unitId,
              section: 'sune_state',
              part: 1,
              answers: spObj,
              score: null,
              mode: 'course',
              completed_at: spUpdated
            };
            var resSp = await client.from('user_progress').upsert(rowSp, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (resSp.error) {
              _logSyncError('sune state upsert failed', resSp.error, rowSp);
            } else {
              success++;
              try { localStorage.setItem('sune_play_sync_' + item.unitId, spUpdated); } catch (e7) { /* ignore */ }
            }
          } else if (item.kind === 'mixedSession') {
            var mixedPlan = null;
            var mixedCompleted = [];
            try {
              var planRaw = localStorage.getItem(MIXED_PLAN_KEY);
              if (planRaw) mixedPlan = JSON.parse(planRaw);
              mixedCompleted = _safeParse(localStorage.getItem(MIXED_COMPLETED_KEY), []);
            } catch (e8) { /* ignore */ }
            if (!mixedPlan && !mixedCompleted.length) continue;
            var mixedUpdated = new Date().toISOString();
            var rowMx = {
              user_id: user.id,
              level: (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1',
              exam_id: 'session',
              section: 'state',
              part: 1,
              answers: { plan: mixedPlan, completed: mixedCompleted, updatedAt: mixedUpdated },
              score: null,
              mode: 'mixed',
              completed_at: mixedUpdated
            };
            var resMx = await client.from('user_progress').upsert(rowMx, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (resMx.error) {
              _logSyncError('mixed session upsert failed', resMx.error, rowMx);
            } else {
              success++;
              try { localStorage.setItem('cambridge_mixed_session_sync', mixedUpdated); } catch (e9) { /* ignore */ }
            }
          } else if (item.kind === 'videoProgress') {
            var videoRaw = localStorage.getItem(VIDEO_KEY);
            if (!videoRaw) continue;
            var videoObj = _safeParse(videoRaw);
            if (!Object.keys(videoObj).length) continue;
            var videoUpdated = new Date().toISOString();
            var rowVid = {
              user_id: user.id,
              level: (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1',
              exam_id: 'all',
              section: 'state',
              part: 1,
              answers: { progress: videoObj, updatedAt: videoUpdated },
              score: null,
              mode: 'video',
              completed_at: videoUpdated
            };
            var resVid = await client.from('user_progress').upsert(rowVid, { onConflict: 'user_id,exam_id,section,part,mode' });
            if (resVid.error) {
              _logSyncError('video progress upsert failed', resVid.error, rowVid);
            } else {
              success++;
              try { localStorage.setItem('cambridge_video_exercises_sync', videoUpdated); } catch (e10) { /* ignore */ }
            }
          }
        } catch (err) {
          console.warn('[SyncManager] sync error', item, err);
        }
      }

      if (success === tasks.length) {
        this._setStatus('synced');
        this._pending = false;
        try { localStorage.removeItem(APP_DIRTY_KEY); } catch (eRm) { /* ignore */ }
        setTimeout(this._clearStatus.bind(this), 3000);
      } else if (success > 0) {
        this._setStatus('synced');
        if (success >= tasks.length - 1) {
          try { localStorage.removeItem(APP_DIRTY_KEY); } catch (eRm2) { /* ignore */ }
        }
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
