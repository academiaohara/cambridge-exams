// js/video-exercises.js
// Stories: hub with chapter rows → video / quiz in a shared modal

(function() {
  'use strict';

  var STORAGE_KEY = 'cambridge_video_exercises';
  var DATA_BASE = 'data/video-exercises/';

  function _mi(name) {
    return '<span class="material-symbols-outlined">' + name + '</span>';
  }

  function esc(str) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._escapeHTML) return BentoGrid._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function jsStr(str) {
    return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function formatVideoTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var session = null;

  window.VideoExercises = {
    _indexCache: null,
    _dataCache: {},

    _defaultProgress: function() {
      return { videoWatched: false, sectionsCompleted: {}, passed: false };
    },

    _getProgress: function() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
      catch (e) { return {}; }
    },

    _saveProgress: function(progress) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
    },

    _getExerciseProgress: function(exerciseId) {
      var all = this._getProgress();
      var current = all[exerciseId] || this._defaultProgress();
      if (!current.sectionsCompleted) current.sectionsCompleted = {};
      return current;
    },

    _saveExerciseProgress: function(exerciseId, patch) {
      var all = this._getProgress();
      var current = all[exerciseId] || this._defaultProgress();
      if (!current.sectionsCompleted) current.sectionsCompleted = {};
      all[exerciseId] = Object.assign({}, current, patch);
      if (patch.sectionsCompleted) {
        all[exerciseId].sectionsCompleted = Object.assign({}, current.sectionsCompleted, patch.sectionsCompleted);
      }
      this._saveProgress(all);
    },

    _isSectionComplete: function(prog, sectionIdx) {
      return !!(prog.sectionsCompleted && prog.sectionsCompleted[String(sectionIdx)]);
    },

    _countCompletedSections: function(prog, totalSections) {
      var n = 0;
      for (var i = 0; i < totalSections; i++) {
        if (this._isSectionComplete(prog, i)) n++;
      }
      return n;
    },

    _isEpisodeComplete: function(prog, totalSections) {
      return !!prog.videoWatched && this._countCompletedSections(prog, totalSections) >= totalSections;
    },

    _syncEpisodePassed: function(exerciseId, totalSections) {
      var prog = this._getExerciseProgress(exerciseId);
      var passed = this._isEpisodeComplete(prog, totalSections);
      if (passed !== prog.passed) {
        this._saveExerciseProgress(exerciseId, { passed: passed });
      }
      return passed;
    },

    _loadIndex: async function() {
      if (this._indexCache) return this._indexCache;
      var res = await fetch(DATA_BASE + 'index.json');
      if (!res.ok) throw new Error('Failed to load stories index');
      this._indexCache = await res.json();
      return this._indexCache;
    },

    _loadExercise: async function(exerciseId) {
      if (this._dataCache[exerciseId]) return this._dataCache[exerciseId];
      var index = await this._loadIndex();
      var item = (index.items || []).find(function(i) { return i.id === exerciseId; });
      if (!item) throw new Error('Exercise not found');
      var res = await fetch(DATA_BASE + item.file);
      if (!res.ok) throw new Error('Failed to load exercise data');
      var data = await res.json();
      this._dataCache[exerciseId] = data;
      return data;
    },

    _pushState: function(state) {
      if (typeof Router !== 'undefined') {
        history.pushState(state, '', Router.stateToPath(state));
      }
    },

    _setView: function(view) {
      if (typeof AppState !== 'undefined') AppState.currentView = view;
      if (typeof MainNav !== 'undefined') MainNav.setActive('video-exercises');
    },

    _buildSidebars: function() {
      var sidebars = { left: '', right: '' };
      if (typeof BentoGrid !== 'undefined') {
        var exams = window.EXAMS_DATA[AppState.currentLevel || 'C1'] || [];
        sidebars = BentoGrid._buildDashboardSidebars(exams, { includeGradeTracker: true });
      }
      return sidebars;
    },

    _renderHubLayout: function(centerHtml) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var sidebars = this._buildSidebars();
      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', sidebars.left)
            : '<div class="dashboard-left-sidebar dashboard-sidebar-shell">' + sidebars.left + '</div>') +
          '<div class="dashboard-center">' + centerHtml + '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', sidebars.right)
            : '<div class="dashboard-right-sidebar dashboard-sidebar-shell" id="dashboardRightSidebar">' + sidebars.right + '</div>') +
        '</div>';
      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof BentoGrid !== 'undefined') BentoGrid._startGradeCarousel();
      this._setView('videoExercises');
    },

    _buildStepCirclesHtml: function(item, prog, sectionCount, disabled) {
      var self = this;
      var circles = '';

      var playCls = 've-step-circle ve-step-circle--play ve-step-circle--active';
      if (prog.videoWatched) playCls += ' ve-step-circle--done';
      circles +=
        '<button type="button" class="' + playCls + '"' +
          (disabled ? ' disabled' : '') +
          ' onclick="event.stopPropagation(); VideoExercises.openVideoModal(\'' + jsStr(item.id) + '\')"' +
          ' aria-label="Watch video">' +
          _mi('play_arrow') +
        '</button>';

      var maxSections = sectionCount;
      for (var s = 0; s < maxSections; s++) {
        var num = s + 1;
        var done = self._isSectionComplete(prog, s);
        var available = prog.videoWatched;
        var cls = 've-step-circle ve-step-circle--num';
        if (done) cls += ' ve-step-circle--done';
        else if (available && !disabled) cls += ' ve-step-circle--active';
        else cls += ' ve-step-circle--locked';

        circles +=
          '<button type="button" class="' + cls + '"' +
            ((!available || disabled) ? ' disabled' : '') +
            ' onclick="event.stopPropagation(); VideoExercises.openSectionModal(\'' + jsStr(item.id) + '\', ' + s + ')"' +
            ' aria-label="Section ' + num + '">' +
            (done ? _mi('check') : String(num)) +
          '</button>';
      }

      return '<div class="ve-chapter-steps">' + circles + '</div>';
    },

    _buildChapterRowHtml: function(item, prog, sectionCount) {
      var isComingSoon = item.status === 'coming_soon';
      var isComplete = !isComingSoon && this._isEpisodeComplete(prog, sectionCount);
      var rowCls = 've-chapter-row';
      if (isComingSoon) rowCls += ' ve-chapter-row--coming-soon';
      if (isComplete) rowCls += ' ve-chapter-row--complete';

      var epNum = item.episode || 1;

      var statusLabel = isComingSoon
        ? '<span class="ve-chapter-status ve-chapter-status--soon">Coming soon</span>'
        : (isComplete
          ? '<span class="ve-chapter-status ve-chapter-status--done">' + _mi('check_circle') + ' Completed</span>'
          : (prog.videoWatched
            ? '<span class="ve-chapter-status ve-chapter-status--started">In progress</span>'
            : ''));

      var tagsHtml = (item.tags || []).length
        ? '<div class="ve-chapter-tags">' + (item.tags || []).map(function(tag) {
            return '<span class="ve-chapter-tag">' + esc(tag) + '</span>';
          }).join('') + '</div>'
        : '';

      return '<div class="' + rowCls + '" data-exercise-id="' + esc(item.id) + '">' +
        '<div class="ve-chapter-row-info">' +
          '<div class="ve-chapter-row-top">' +
            '<span class="ve-chapter-ep">Ep. ' + epNum + '</span>' +
            statusLabel +
          '</div>' +
          '<h3 class="ve-chapter-title">' + esc(item.title) + '</h3>' +
          (item.description ? '<p class="ve-chapter-desc">' + esc(item.description) + '</p>' : '') +
          tagsHtml +
        '</div>' +
        this._buildStepCirclesHtml(item, prog, sectionCount, isComingSoon) +
      '</div>';
    },

    openHub: async function(opts) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      content.innerHTML = '<div class="ve-loading">' + _mi('hourglass_top') + ' Loading…</div>';

      try {
        var index = await this._loadIndex();
        var items = (index.items || []).filter(function(i) { return i.status !== 'hidden'; });

        var availableItems = items.filter(function(i) { return i.status === 'available'; });
        await Promise.all(availableItems.map(function(item) {
          return self._loadExercise(item.id).catch(function() { return null; });
        }));

        var passedCount = 0;
        availableItems.forEach(function(item) {
          var data = self._dataCache[item.id];
          var sections = (data && data.sections) ? data.sections.length : 3;
          var prog = self._getExerciseProgress(item.id);
          if (self._isEpisodeComplete(prog, sections)) passedCount++;
        });

        var rowsHtml = items.map(function(item) {
          var prog = item.status === 'available' ? self._getExerciseProgress(item.id) : self._defaultProgress();
          var data = self._dataCache[item.id];
          var sectionCount = (data && data.sections) ? data.sections.length : 3;
          return self._buildChapterRowHtml(item, prog, sectionCount);
        }).join('');

        if (!rowsHtml) rowsHtml = '<div class="ve-empty">No episodes available yet.</div>';

        var overallProgress = availableItems.length > 0
          ? '<div class="ve-series-progress-row">' +
              '<div class="ve-series-overall-progress">' +
                '<div class="ve-series-overall-fill" style="width:' + Math.round((passedCount / availableItems.length) * 100) + '%"></div>' +
              '</div>' +
              '<span class="ve-series-overall-label">' + passedCount + ' / ' + availableItems.length + ' completed</span>' +
            '</div>'
          : '';

        var availableCount = availableItems.length;
        var totalCount = items.length;

        self._renderHubLayout(
          '<div class="ve-hub">' +
            '<header class="ve-series-header">' +
              '<div class="ve-series-header-top">' +
                '<div class="ve-series-brand-icon">' + _mi('auto_stories') + '</div>' +
                '<div class="ve-series-header-text">' +
                  '<h1 class="ve-series-title">Sune\'s Stories</h1>' +
                  '<p class="ve-series-tagline">Watch animated episodes &amp; master English vocabulary</p>' +
                '</div>' +
              '</div>' +
              '<div class="ve-series-meta-row">' +
                '<span class="ve-series-pill">' + _mi('tv') + ' Season 1</span>' +
                (availableCount > 0
                  ? '<span class="ve-series-pill ve-series-pill--available">' + _mi('play_circle') + ' ' + availableCount + ' Available</span>'
                  : '') +
                (totalCount > availableCount
                  ? '<span class="ve-series-pill">' + _mi('schedule') + ' ' + (totalCount - availableCount) + ' Coming soon</span>'
                  : '') +
              '</div>' +
              overallProgress +
            '</header>' +
            '<div class="ve-chapter-list">' + rowsHtml + '</div>' +
          '</div>'
        );

        if (!opts || !opts.fromRoute) {
          self._pushState({ view: 'videoExercises' });
        }
      } catch (e) {
        content.innerHTML = '<div class="ve-error">Could not load stories.</div>';
        console.error(e);
      }
    },

    openExercise: async function(exerciseId, opts) {
      var self = this;
      await this.openHub({ fromRoute: true });
      if (!opts || !opts.fromRoute) {
        self._pushState({ view: 'videoExercise', exerciseId: exerciseId });
      }
      var prog = this._getExerciseProgress(exerciseId);
      try {
        var data = await this._loadExercise(exerciseId);
        var sections = (data.sections || []).length;
        if (!prog.videoWatched) {
          this.openVideoModal(exerciseId, { fromRoute: true });
        } else {
          var firstIncomplete = 0;
          for (var i = 0; i < sections; i++) {
            if (!this._isSectionComplete(prog, i)) { firstIncomplete = i; break; }
          }
          this.openSectionModal(exerciseId, firstIncomplete, { fromRoute: true });
        }
      } catch (e) {
        this.openVideoModal(exerciseId, { fromRoute: true });
      }
    },

    // ─── Modal shell ──────────────────────────────────────────────────────

    _ensureModal: function() {
      var existing = document.getElementById('ve-modal-overlay');
      if (existing) return existing;
      var overlay = document.createElement('div');
      overlay.id = 've-modal-overlay';
      overlay.className = 've-modal-overlay';
      overlay.innerHTML =
        '<div class="ve-modal-panel" role="dialog" aria-modal="true">' +
          '<div class="ve-modal-inner" id="ve-modal-inner"></div>' +
        '</div>';
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) VideoExercises.closeModal();
      });
      document.body.appendChild(overlay);
      return overlay;
    },

    _renderModal: function(innerHtml, opts) {
      opts = opts || {};
      this._ensureModal();
      var inner = document.getElementById('ve-modal-inner');
      if (inner) inner.innerHTML = innerHtml;
      var panel = document.querySelector('#ve-modal-overlay .ve-modal-panel');
      if (panel) {
        panel.classList.toggle('ve-modal-panel--video', opts.mode === 'video');
      }
      var overlay = document.getElementById('ve-modal-overlay');
      if (overlay) overlay.classList.add('ve-modal-overlay--open');
      document.body.classList.add('ve-modal-open');
      this._setView('videoExercise');
    },

    closeModal: function() {
      var exerciseId = session && session.exerciseId;
      var data = session && session.data;
      var overlay = document.getElementById('ve-modal-overlay');
      if (overlay) overlay.classList.remove('ve-modal-overlay--open');
      document.body.classList.remove('ve-modal-open');
      var video = document.getElementById('ve-video-player');
      if (video) { try { video.pause(); } catch (e) { /* ignore */ } }
      session = null;
      if (exerciseId) this._refreshHubRow(exerciseId, data);
      this._setView('videoExercises');
      this._pushState({ view: 'videoExercises' });
    },

    _refreshHubRow: function(exerciseId, data) {
      if (!exerciseId) return;
      var row = document.querySelector('.ve-chapter-row[data-exercise-id="' + exerciseId + '"]');
      if (!row) return;
      var item = null;
      if (this._indexCache) {
        item = (this._indexCache.items || []).find(function(i) { return i.id === exerciseId; });
      }
      if (!item) return;
      var prog = this._getExerciseProgress(exerciseId);
      var sectionCount = (data && data.sections) ? data.sections.length : 3;
      var tmp = document.createElement('div');
      tmp.innerHTML = this._buildChapterRowHtml(item, prog, sectionCount);
      var newRow = tmp.firstElementChild;
      if (newRow) row.replaceWith(newRow);
    },

    _modalHeader: function(opts) {
      opts = opts || {};
      if (opts.videoHeader && opts.title) {
        return '<header class="sp-practice-header ve-modal-header ve-modal-header--video">' +
          '<h1 class="ve-modal-header-title">' + esc(opts.title) + '</h1>' +
          '<button type="button" class="sp-header-btn sp-header-exit" onclick="VideoExercises.closeModal()" aria-label="Close">' +
            _mi('close') +
          '</button>' +
        '</header>';
      }

      var centerHtml = '';
      if (opts.showProgress && session) {
        var total = session.initialTotal || session.questionQueue.length;
        var done = session.completedCount || 0;
        var pct = total > 0 ? Math.round((done / total) * 100) : 0;
        centerHtml = '<div class="sp-session-progress"><div class="sp-session-progress-track">' +
          '<div class="sp-session-progress-fill" style="width:' + pct + '%"></div></div></div>';
      } else if (opts.title) {
        centerHtml = '<span class="ve-modal-header-title">' + esc(opts.title) + '</span>';
      }
      return '<header class="sp-practice-header ve-modal-header">' +
        '<button type="button" class="sp-header-btn sp-header-exit" onclick="VideoExercises.closeModal()" aria-label="Close">' +
          _mi('close') +
        '</button>' +
        centerHtml +
        '<span class="ve-modal-header-spacer"></span>' +
      '</header>';
    },

    _prepareQuestionQueue: function(questions) {
      return (questions || []).map(function(q, i) {
        return Object.assign({}, q, { _veKey: i });
      });
    },

    _currentQuestion: function() {
      return session && session.questionQueue.length ? session.questionQueue[0] : null;
    },

    _requeueCurrentQuestion: function() {
      if (!session || !session.questionQueue.length) return;
      var current = session.questionQueue.shift();
      session.questionQueue.push(current);
    },

    _removeCurrentQuestion: function() {
      if (!session || !session.questionQueue.length) return null;
      return session.questionQueue.shift();
    },

    // ─── Video modal ──────────────────────────────────────────────────────

    openVideoModal: async function(exerciseId, opts) {
      var self = this;
      try {
        var data = await this._loadExercise(exerciseId);
        session = {
          exerciseId: exerciseId,
          data: data,
          mode: 'video',
          phase: 'playing'
        };

        self._renderModal(
          self._modalHeader({ title: data.title, videoHeader: true }) +
          '<div class="ve-modal-video-stage">' +
            '<div class="ve-modal-video-frame">' +
              '<video class="ve-video" id="ve-video-player" src="' + esc(data.videoUrl) + '" playsinline preload="metadata" controlsList="nofullscreen nodownload noremoteplayback" disablePictureInPicture></video>' +
              '<button type="button" class="ve-video-play-btn" id="ve-video-play-btn" aria-label="Play video">' +
                _mi('play_arrow') +
              '</button>' +
            '</div>' +
            '<div class="ve-video-bottom" id="ve-video-bottom">' +
              '<div class="ve-video-controls" id="ve-video-controls">' +
                '<div class="ve-video-progress-row">' +
                  '<input type="range" class="ve-video-seek" id="ve-video-seek" min="0" max="100" value="0" step="0.1" aria-label="Video progress">' +
                '</div>' +
                '<div class="ve-video-controls-bar">' +
                  '<span class="ve-video-time" id="ve-video-time">0:00 / 0:00</span>' +
                  '<div class="ve-video-volume-wrap">' +
                    '<button type="button" class="ve-video-mute-btn" id="ve-video-mute" aria-label="Mute">' +
                      _mi('volume_up') +
                    '</button>' +
                    '<input type="range" class="ve-video-volume" id="ve-video-volume" min="0" max="1" value="1" step="0.05" aria-label="Volume">' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="ve-video-ended" id="ve-video-ended" hidden>' +
                '<div class="ve-video-ended-actions">' +
                  '<button type="button" class="ve-video-restart-btn" id="ve-video-restart" aria-label="Watch again">' +
                    _mi('replay') +
                    '<span>Watch again</span>' +
                  '</button>' +
                  '<button type="button" class="sp-btn sp-btn--primary sp-btn--action sp-btn--continue-mode sp-btn--correct ve-video-continue-btn" id="ve-video-continue" onclick="VideoExercises._finishVideo()">' +
                    '<span class="material-symbols-outlined">arrow_forward</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>',
          { mode: 'video' }
        );

        self._initVideoPlayer();

        if (!opts || !opts.fromRoute) {
          self._pushState({ view: 'videoExercise', exerciseId: exerciseId });
        }
      } catch (e) {
        console.error(e);
      }
    },

    _initVideoPlayer: function() {
      var self = this;
      var video = document.getElementById('ve-video-player');
      var playBtn = document.getElementById('ve-video-play-btn');
      var seek = document.getElementById('ve-video-seek');
      var timeEl = document.getElementById('ve-video-time');
      var muteBtn = document.getElementById('ve-video-mute');
      var volume = document.getElementById('ve-video-volume');
      var restartBtn = document.getElementById('ve-video-restart');
      if (!video) return;

      var isSeeking = false;

      function updateTimeDisplay() {
        if (!timeEl) return;
        var current = video.currentTime;
        if (isSeeking && seek && isFinite(video.duration)) {
          current = (parseFloat(seek.value) / 100) * video.duration;
        }
        var total = isFinite(video.duration) ? video.duration : 0;
        timeEl.textContent = formatVideoTime(current) + ' / ' + formatVideoTime(total);
      }

      function updateSeekBar() {
        if (!seek || isSeeking || !isFinite(video.duration) || video.duration <= 0) return;
        seek.value = String((video.currentTime / video.duration) * 100);
        updateTimeDisplay();
      }

      function updateMuteIcon() {
        if (!muteBtn) return;
        var icon = muteBtn.querySelector('.material-symbols-outlined');
        if (!icon) return;
        var vol = video.muted || video.volume === 0 ? 0 : video.volume;
        icon.textContent = vol === 0 ? 'volume_off' : (vol < 0.5 ? 'volume_down' : 'volume_up');
        muteBtn.setAttribute('aria-label', vol === 0 ? 'Unmute' : 'Mute');
      }

      video.onended = function() { self._onVideoEnded(); };
      video.onplay = function() {
        if (playBtn) playBtn.hidden = true;
      };
      video.onpause = function() {
        if (playBtn && session && session.phase !== 'ended' && video.currentTime < video.duration) {
          playBtn.hidden = false;
        }
      };
      video.ontimeupdate = updateSeekBar;
      video.onloadedmetadata = function() {
        updateSeekBar();
        updateTimeDisplay();
      };
      video.addEventListener('webkitbeginfullscreen', function(e) {
        e.preventDefault();
      });

      if (playBtn) {
        playBtn.onclick = function() {
          video.play();
          playBtn.hidden = true;
        };
      }

      video.onclick = function() {
        if (session && session.phase === 'ended') return;
        if (video.paused) {
          video.play();
          if (playBtn) playBtn.hidden = true;
        } else {
          video.pause();
        }
      };

      if (seek) {
        seek.addEventListener('input', function() {
          isSeeking = true;
          var pct = parseFloat(seek.value) / 100;
          if (isFinite(video.duration)) {
            updateTimeDisplay();
          }
        });
        seek.addEventListener('change', function() {
          if (isFinite(video.duration)) {
            video.currentTime = (parseFloat(seek.value) / 100) * video.duration;
          }
          isSeeking = false;
          updateSeekBar();
        });
      }

      if (muteBtn) {
        muteBtn.onclick = function() {
          video.muted = !video.muted;
          if (!video.muted && video.volume === 0 && volume) {
            video.volume = 0.5;
            volume.value = '0.5';
          }
          updateMuteIcon();
        };
      }

      if (volume) {
        volume.addEventListener('input', function() {
          video.volume = parseFloat(volume.value);
          video.muted = video.volume === 0;
          updateMuteIcon();
        });
      }

      if (restartBtn) {
        restartBtn.onclick = function() {
          self._restartVideo();
        };
      }

      updateMuteIcon();
      updateTimeDisplay();
    },

    _restartVideo: function() {
      if (!session) return;
      session.phase = 'playing';
      var video = document.getElementById('ve-video-player');
      var playBtn = document.getElementById('ve-video-play-btn');
      var ended = document.getElementById('ve-video-ended');
      var controls = document.getElementById('ve-video-controls');
      if (ended) ended.hidden = true;
      if (controls) controls.hidden = false;
      if (!video) return;
      video.currentTime = 0;
      var seek = document.getElementById('ve-video-seek');
      if (seek) seek.value = '0';
      var timeEl = document.getElementById('ve-video-time');
      if (timeEl) timeEl.textContent = '0:00 / ' + formatVideoTime(video.duration);
      video.play();
      if (playBtn) playBtn.hidden = true;
    },

    _onVideoEnded: function() {
      if (!session) return;
      session.phase = 'ended';
      this._saveExerciseProgress(session.exerciseId, { videoWatched: true });
      var playBtn = document.getElementById('ve-video-play-btn');
      if (playBtn) playBtn.hidden = true;
      var controls = document.getElementById('ve-video-controls');
      if (controls) controls.hidden = true;
      var ended = document.getElementById('ve-video-ended');
      if (ended) ended.hidden = false;
    },

    _finishVideo: function() {
      if (!session) return;
      this._saveExerciseProgress(session.exerciseId, { videoWatched: true });
      var exerciseId = session.exerciseId;
      var data = session.data;
      this.closeModal();
      this._syncEpisodePassed(exerciseId, (data.sections || []).length);
    },

    // ─── Section quiz modal ───────────────────────────────────────────────

    openSectionModal: async function(exerciseId, sectionIdx, opts) {
      var self = this;
      try {
        var data = await this._loadExercise(exerciseId);
        var section = (data.sections || [])[sectionIdx];
        if (!section) return;

        var questions = self._prepareQuestionQueue(section.questions || []);
        session = {
          exerciseId: exerciseId,
          data: data,
          mode: 'quiz',
          sectionIdx: sectionIdx,
          section: section,
          questionQueue: questions.slice(),
          initialTotal: questions.length,
          completedCount: 0,
          firstTryCorrect: 0,
          attemptCounts: {},
          orderSelection: [],
          awaitingContinue: false,
          _lastResultCorrect: null,
          phase: questions.length ? 'quiz' : 'complete'
        };

        if (session.phase === 'complete') {
          self._markSectionComplete();
          self._renderSectionComplete();
          return;
        }

        self._renderQuizQuestion();

        if (!opts || !opts.fromRoute) {
          self._pushState({ view: 'videoExercise', exerciseId: exerciseId, sectionIdx: sectionIdx });
        }
      } catch (e) {
        console.error(e);
      }
    },

    _renderQuizQuestion: function() {
      if (!session || session.mode !== 'quiz') return;
      var q = this._currentQuestion();
      if (!q) {
        this._finishSection();
        return;
      }

      var sec = session.section;
      var questionBody = this._renderQuestionBody(q);

      this._renderModal(
        this._modalHeader({ showProgress: true }) +
        '<div class="sp-practice-session ve-modal-quiz">' +
          '<div class="sp-practice-main" id="ve-practice-main">' +
            '<div class="sp-practice-body">' +
              '<div class="sp-exercise-card" id="ve-question-card">' +
                '<p class="sp-session-instruction ve-quiz-instruction">' + esc(sec.instructions || sec.title) + '</p>' +
                '<p class="ve-question-text">' + esc(q.question) + '</p>' +
                questionBody +
              '</div>' +
            '</div>' +
            '<footer class="sp-practice-footer" id="ve-practice-footer">' +
              '<div class="sp-practice-footer-inner">' +
                '<div id="ve-feedback-mount" class="sp-feedback-mount"></div>' +
                '<div class="sp-practice-footer-actions">' +
                  '<div class="sp-footer-actions-right">' +
                    '<button type="button" class="sp-btn sp-btn--primary sp-btn--action" id="ve-action-btn" data-mode="check" disabled onclick="VideoExercises._handleActionClick()">' +
                      '<span class="material-symbols-outlined">check</span>' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</footer>' +
          '</div>' +
        '</div>'
      );

      if (q.type === 'order_sentences') {
        session.orderSelection = [];
        session._selectedMC = null;
        this._initOrderTiles(q);
        this._setActionBtn('check', false);
      } else {
        session._selectedMC = null;
        this._setActionBtn('check', false);
      }
    },

    _renderQuestionBody: function(q) {
      var self = this;
      if (q.type === 'multiple_choice' || q.type === 'fill_gap_choice') {
        var optsHtml = (q.options || []).map(function(opt, i) {
          return '<button type="button" class="sp-option-btn" data-answer="' + esc(opt) + '" onclick="VideoExercises._selectMC(\'' + jsStr(opt) + '\', this)">' +
            '<span class="sp-option-num">' + (i + 1) + '</span>' +
            '<span class="sp-option-label">' + esc(opt) + '</span>' +
          '</button>';
        }).join('');
        return '<div class="sp-option-grid">' + optsHtml + '</div>';
      }

      if (q.type === 'order_sentences') {
        var shuffled = self._shuffleArray((q.items || []).slice());
        var bankHtml = shuffled.map(function(item, i) {
          return '<button type="button" class="ve-tile" data-item="' + esc(item) + '" data-idx="' + i + '">' + esc(item) + '</button>';
        }).join('');
        return '<div class="ve-order-wrap">' +
          '<div class="ve-tile-answer" id="ve-tile-answer"></div>' +
          '<div class="ve-tile-bank" id="ve-tile-bank">' + bankHtml + '</div>' +
        '</div>';
      }

      return '';
    },

    _shuffleArray: function(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    },

    _selectMC: function(selected, btn) {
      if (!session || session.awaitingContinue) return;
      document.querySelectorAll('#ve-question-card .sp-option-btn').forEach(function(b) {
        b.classList.remove('sp-option-btn--selected');
      });
      btn.classList.add('sp-option-btn--selected');
      session._selectedMC = selected;
      this._setActionBtn('check', true);
    },

    _initOrderTiles: function(q) {
      var self = this;
      var bank = document.getElementById('ve-tile-bank');
      var answer = document.getElementById('ve-tile-answer');
      if (!bank || !answer) return;

      bank.onclick = function(e) {
        var btn = e.target.closest('.ve-tile');
        if (!btn || btn.disabled || session.awaitingContinue) return;
        var item = btn.getAttribute('data-item');
        btn.disabled = true;
        btn.classList.add('ve-tile--used');
        session.orderSelection.push(item);
        self._renderOrderAnswer();
        self._setActionBtn('check', session.orderSelection.length > 0);
      };

      answer.onclick = function(e) {
        var rm = e.target.closest('.ve-tile-answer-item');
        if (!rm || session.awaitingContinue) return;
        var idx = parseInt(rm.getAttribute('data-idx'), 10);
        var item = session.orderSelection[idx];
        session.orderSelection.splice(idx, 1);
        self._renderOrderAnswer();
        var bankBtns = bank.querySelectorAll('.ve-tile');
        for (var i = 0; i < bankBtns.length; i++) {
          if (bankBtns[i].getAttribute('data-item') === item) {
            bankBtns[i].disabled = false;
            bankBtns[i].classList.remove('ve-tile--used');
            break;
          }
        }
        self._setActionBtn('check', session.orderSelection.length > 0);
      };
    },

    _renderOrderAnswer: function() {
      var answer = document.getElementById('ve-tile-answer');
      if (!answer) return;
      answer.innerHTML = session.orderSelection.map(function(item, i) {
        return '<button type="button" class="ve-tile-answer-item" data-idx="' + i + '">' +
          '<span class="ve-tile-num">' + (i + 1) + '</span>' + esc(item) + '</button>';
      }).join('');
    },

    _setActionBtn: function(mode, enabled) {
      var actionBtn = document.getElementById('ve-action-btn');
      var footer = document.getElementById('ve-practice-footer');
      var practiceMain = document.getElementById('ve-practice-main');
      if (!actionBtn) return;

      actionBtn.dataset.mode = mode;
      actionBtn.disabled = !enabled;
      var icon = actionBtn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = mode === 'check' ? 'check' : 'arrow_forward';

      actionBtn.classList.toggle('sp-btn--continue-mode', mode === 'continue');
      actionBtn.classList.toggle('sp-btn--correct', mode === 'continue' && session._lastResultCorrect === true);
      actionBtn.classList.toggle('sp-btn--incorrect', mode === 'continue' && session._lastResultCorrect === false);

      var isFeedback = mode === 'continue';
      if (footer) {
        footer.classList.toggle('sp-practice-footer--feedback', isFeedback);
        footer.classList.toggle('sp-practice-footer--correct', mode === 'continue' && session._lastResultCorrect === true);
        footer.classList.toggle('sp-practice-footer--incorrect', isFeedback && session._lastResultCorrect === false);
      }
      if (practiceMain) {
        practiceMain.classList.toggle('sp-practice-main--correct', mode === 'continue' && session._lastResultCorrect === true);
        practiceMain.classList.toggle('sp-practice-main--incorrect', isFeedback && session._lastResultCorrect === false);
      }
    },

    _handleActionClick: function() {
      if (!session || session.awaitingContinue) {
        this._handleContinue();
        return;
      }
      var q = this._currentQuestion();
      if (!q) return;
      if (q.type === 'order_sentences') {
        this._checkOrderAnswer();
      } else {
        this._checkMCAnswer();
      }
    },

    _recordAttempt: function(q) {
      var key = q._veKey;
      var count = (session.attemptCounts[key] || 0) + 1;
      session.attemptCounts[key] = count;
      return count;
    },

    _applyQueueResult: function(q, isCorrect) {
      var attemptNum = this._recordAttempt(q);
      if (isCorrect) {
        if (attemptNum === 1) session.firstTryCorrect++;
        session.completedCount++;
        this._removeCurrentQuestion();
      } else {
        this._requeueCurrentQuestion();
      }
    },

    _checkMCAnswer: function() {
      if (!session || session.awaitingContinue || !session._selectedMC) return;
      var q = this._currentQuestion();
      if (!q) return;
      var isCorrect = this._normalize(session._selectedMC) === this._normalize(q.answer);
      this._applyQueueResult(q, isCorrect);
      this._showFeedback(isCorrect, q);
      this._lockMCOptions(session._selectedMC, isCorrect, q.answer);
    },

    _checkOrderAnswer: function() {
      if (!session || session.awaitingContinue) return;
      var q = this._currentQuestion();
      if (!q) return;
      var expected = q.answer || [];
      var isCorrect = session.orderSelection.length === expected.length &&
        session.orderSelection.every(function(item, i) {
          return VideoExercises._normalize(item) === VideoExercises._normalize(expected[i]);
        });
      this._applyQueueResult(q, isCorrect);
      this._showFeedback(isCorrect, q);
    },

    _normalize: function(str) {
      return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    },

    _lockMCOptions: function(selected, isCorrect, correctAnswer) {
      var self = this;
      document.querySelectorAll('#ve-question-card .sp-option-btn').forEach(function(btn) {
        btn.disabled = true;
        btn.classList.remove('sp-option-btn--selected');
        var val = btn.getAttribute('data-answer');
        var isCorrectOption = self._normalize(val) === self._normalize(correctAnswer);
        var isSelectedWrong = self._normalize(val) === self._normalize(selected) && !isCorrect;
        if (isCorrectOption) {
          btn.classList.add('sp-option-btn--correct', 've-option-btn--revealed-correct');
        }
        if (isSelectedWrong) {
          btn.classList.add('sp-option-btn--incorrect');
        }
      });
    },

    _showFeedback: function(isCorrect, q) {
      if (window.AudioUtils) {
        if (isCorrect) AudioUtils.playSuccessSound();
        else AudioUtils.playFailureSound();
      }

      var feedbackMount = document.getElementById('ve-feedback-mount');
      var result = {
        correct: isCorrect,
        explanation: q.explanation || '',
        correctAnswer: q.answer || ''
      };

      if (feedbackMount && typeof SunePlayScreenRenderer !== 'undefined') {
        feedbackMount.innerHTML = SunePlayScreenRenderer.FeedbackSheet(result, null);
      } else if (feedbackMount) {
        feedbackMount.innerHTML =
          '<div class="sp-feedback-sheet ' + (isCorrect ? 'sp-feedback--correct' : 'sp-feedback--incorrect') + '">' +
            '<p class="sp-feedback-title">' + (isCorrect ? 'Correct!' : 'Not quite.') + '</p>' +
            (!isCorrect && q.answer ? '<p class="sp-feedback-answer"><span>Correct:</span> ' + esc(q.answer) + '</p>' : '') +
          '</div>';
      }

      session.awaitingContinue = true;
      session._lastResultCorrect = isCorrect;
      this._setActionBtn('continue', true);
    },

    _handleContinue: function() {
      if (!session || !session.awaitingContinue) return;

      session.awaitingContinue = false;
      session._lastResultCorrect = null;
      var feedbackMount = document.getElementById('ve-feedback-mount');
      if (feedbackMount) feedbackMount.innerHTML = '';

      var footer = document.getElementById('ve-practice-footer');
      var practiceMain = document.getElementById('ve-practice-main');
      if (footer) {
        footer.classList.remove('sp-practice-footer--feedback', 'sp-practice-footer--correct', 'sp-practice-footer--incorrect');
      }
      if (practiceMain) {
        practiceMain.classList.remove('sp-practice-main--correct', 'sp-practice-main--incorrect');
      }

      if (!session.questionQueue.length) {
        this._finishSection();
        return;
      }

      session.orderSelection = [];
      session._selectedMC = null;
      this._renderQuizQuestion();
    },

    _markSectionComplete: function() {
      if (!session) return;
      var patch = {};
      patch['sectionsCompleted'] = {};
      patch.sectionsCompleted[String(session.sectionIdx)] = true;
      this._saveExerciseProgress(session.exerciseId, patch);
      this._syncEpisodePassed(session.exerciseId, (session.data.sections || []).length);
    },

    _finishSection: function() {
      this._markSectionComplete();
      this._renderSectionComplete();
    },

    _renderSectionComplete: function() {
      if (!session) return;
      var sec = session.section;
      var total = session.initialTotal || 0;
      var correct = session.firstTryCorrect || 0;

      this._renderModal(
        this._modalHeader({}) +
        '<div class="sp-practice-session ve-modal-quiz ve-modal-complete">' +
          '<div class="sp-practice-main">' +
            '<div class="sp-practice-body ve-section-complete-body">' +
              '<div class="sp-result-screen sp-result-screen--complete ve-section-complete">' +
                '<div class="sp-result-celebration" aria-hidden="true">' +
                  '<span class="sp-result-confetti sp-result-confetti--1"></span>' +
                  '<span class="sp-result-confetti sp-result-confetti--2"></span>' +
                  '<span class="sp-result-confetti sp-result-confetti--3"></span>' +
                  '<span class="sp-result-confetti sp-result-confetti--4"></span>' +
                '</div>' +
                '<div class="sp-result-icon sp-result-icon--success">' + _mi('celebration') + '</div>' +
                '<h2 class="sp-result-title">Section complete!</h2>' +
                '<p class="sp-result-subtitle ve-section-complete-sub">' + esc(sec.title) + '</p>' +
                (total > 0
                  ? '<div class="ve-section-complete-score">' +
                      '<span class="ve-section-complete-score-val">' + correct + ' / ' + total + '</span>' +
                      '<span class="ve-section-complete-score-lbl">correct on first try</span>' +
                    '</div>'
                  : '') +
              '</div>' +
            '</div>' +
            '<footer class="sp-practice-footer ve-complete-footer">' +
              '<div class="sp-practice-footer-inner">' +
                '<div class="sp-practice-footer-actions">' +
                  '<div class="sp-footer-actions-right">' +
                    '<button type="button" class="sp-btn sp-btn--primary sp-btn--action sp-btn--continue-mode sp-btn--correct" onclick="VideoExercises.closeModal()">' +
                      '<span class="material-symbols-outlined">arrow_forward</span>' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</footer>' +
          '</div>' +
        '</div>'
      );
    }
  };
})();
