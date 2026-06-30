// js/video-exercises.js
// Video + post-video test: watch (9:16) → single continuous quiz flow

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

  var session = null;

  window.VideoExercises = {
    _indexCache: null,
    _dataCache: {},

    _getProgress: function() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
      catch (e) { return {}; }
    },

    _saveProgress: function(progress) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
    },

    _getExerciseProgress: function(exerciseId) {
      var all = this._getProgress();
      return all[exerciseId] || { videoWatched: false, passed: false, bestScore: 0, quizProgressPct: 0 };
    },

    _saveExerciseProgress: function(exerciseId, patch) {
      var all = this._getProgress();
      var current = all[exerciseId] || { videoWatched: false, passed: false, bestScore: 0, quizProgressPct: 0 };
      all[exerciseId] = Object.assign({}, current, patch);
      this._saveProgress(all);
    },

    _loadIndex: async function() {
      if (this._indexCache) return this._indexCache;
      var res = await fetch(DATA_BASE + 'index.json');
      if (!res.ok) throw new Error('Failed to load video exercises index');
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

    _applyLessonFocus: function(active) {
      var layout = document.querySelector('.dashboard-layout');
      var center = document.querySelector('.dashboard-center');
      if (layout) layout.classList.toggle('dashboard-layout--lesson-focus', !!active);
      if (center) center.classList.toggle('course-center--lesson-focus', !!active);
      var rightSidebar = document.getElementById('dashboardRightSidebar');
      var rightShell = document.getElementById('dashboardRightSidebarShell');
      if (rightSidebar) rightSidebar.style.display = active ? 'none' : '';
      if (rightShell) rightShell.style.display = active ? 'none' : '';
    },

    _renderHubLayout: function(centerHtml) {
      var content = document.getElementById('main-content');
      if (!content) return;
      this._applyLessonFocus(false);
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

    _renderLessonLayout: function(innerHtml) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var sidebars = this._buildSidebars();
      content.innerHTML =
        '<div class="dashboard-layout dashboard-layout--lesson-focus">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', sidebars.left)
            : '<div class="dashboard-left-sidebar dashboard-sidebar-shell">' + sidebars.left + '</div>') +
          '<div class="dashboard-center course-center--lesson-focus">' +
            '<div id="sp-lesson-mount" class="sp-lesson-mount ve-lesson-mount course-unit-content">' +
              '<div class="ve-lesson sp-lesson">' + innerHtml + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      this._applyLessonFocus(true);
      this._setView('videoExercise');
    },

    _buildQuestionQueue: function(data) {
      var queue = [];
      var globalIdx = 0;
      (data.sections || []).forEach(function(sec, sectionIdx) {
        (sec.questions || []).forEach(function(q, qIdx) {
          queue.push({
            section: sec,
            sectionIdx: sectionIdx,
            question: q,
            questionIdxInSection: qIdx,
            globalIdx: globalIdx,
            isFirstInSection: qIdx === 0
          });
          globalIdx++;
        });
      });
      return queue;
    },

    _totalQuestions: function(data) {
      if (data.totalQuestions) return data.totalQuestions;
      var n = 0;
      (data.sections || []).forEach(function(sec) {
        n += (sec.questions || []).length;
      });
      return n;
    },

    // ─── Hub ──────────────────────────────────────────────────────────────

    _buildEpisodeCardHtml: function(item, prog) {
      var isAvailable = item.status === 'available';
      var isComingSoon = item.status === 'coming_soon';

      var statusCls = isComingSoon ? 've-story-card--coming-soon' :
                      (prog.passed ? 've-story-card--passed' :
                      (prog.videoWatched ? 've-story-card--started' : ''));

      // gradient
      var g = item.thumbnailGradient || {};
      var gradFrom = g.from || '#1e1f42';
      var gradVia  = g.via  || '#2D2E5F';
      var gradTo   = g.to   || '#1899d6';
      var gradStyle = 'background:linear-gradient(160deg,' + gradFrom + ' 0%,' + gradVia + ' 55%,' + gradTo + ' 100%)';

      // progress bar inside thumbnail
      var progressPct = 0;
      if (prog.passed) {
        progressPct = 100;
      } else if (prog.videoWatched) {
        progressPct = Math.max(18, prog.quizProgressPct || 0);
      }

      // thumbnail inner content
      var thumbInner = '';
      if (isComingSoon) {
        thumbInner =
          '<div class="ve-coming-soon-overlay">' +
            '<div class="ve-coming-soon-lock">' + _mi('lock') + '</div>' +
            '<span class="ve-coming-soon-label">Coming soon</span>' +
          '</div>';
      } else {
        var playIcon = prog.passed ? 'replay' : 'play_arrow';
        thumbInner = '<div class="ve-story-preview-play">' + _mi(playIcon) + '</div>';
        if (progressPct > 0) {
          thumbInner +=
            '<div class="ve-story-progress-bar">' +
              '<div class="ve-story-progress-fill" style="width:' + progressPct + '%"></div>' +
            '</div>';
        }
      }

      // badges
      var epNum = item.episode || 1;
      var levelBadge = item.level
        ? '<span class="ve-level-badge ve-level-badge--' + esc(item.level) + '">' + esc(item.level) + '</span>'
        : '';

      // tags
      var tagsHtml = (item.tags || []).slice(0, 2).map(function(t) {
        return '<span class="ve-tag">' + esc(t) + '</span>';
      }).join('');

      // vocab preview (available episodes only)
      var vocabHtml = '';
      if (isAvailable && item.vocabPreview && item.vocabPreview.length) {
        var chips = item.vocabPreview.slice(0, 4).map(function(w) {
          return '<span class="ve-vocab-chip">' + esc(w) + '</span>';
        }).join('');
        vocabHtml = '<div class="ve-vocab-row">' + chips + '</div>';
      }

      // CTA
      var ctaHtml = '';
      if (!isComingSoon) {
        var ctaCls, ctaIcon, ctaText;
        if (prog.passed) {
          ctaCls  = 've-story-cta--passed';
          ctaIcon = 'replay';
          ctaText = 'Watch again';
        } else if (prog.videoWatched) {
          ctaCls  = 've-story-cta--started';
          ctaIcon = 'play_circle';
          ctaText = 'Continue';
        } else {
          ctaCls  = '';
          ctaIcon = 'play_arrow';
          ctaText = 'Watch';
        }
        ctaHtml = '<div class="ve-story-footer">' +
          '<span class="ve-story-cta ' + ctaCls + '">' + _mi(ctaIcon) + ' ' + ctaText + '</span>' +
        '</div>';
      }

      var clickAttr    = isComingSoon ? '' : ' onclick="VideoExercises.openExercise(\'' + jsStr(item.id) + '\')"';
      var disabledAttr = isComingSoon ? ' disabled aria-label="Coming soon"' : '';

      return '<button type="button" class="ve-story-card ' + statusCls + '"' + clickAttr + disabledAttr + '>' +
        '<div class="ve-story-preview" style="' + gradStyle + '">' +
          '<div class="ve-episode-badge">Ep. ' + epNum + '</div>' +
          levelBadge +
          thumbInner +
        '</div>' +
        '<div class="ve-story-body">' +
          '<h3 class="ve-story-title">' + esc(item.title) + '</h3>' +
          (tagsHtml ? '<div class="ve-tags-row">' + tagsHtml + '</div>' : '') +
          vocabHtml +
          ctaHtml +
        '</div>' +
      '</button>';
    },

    openHub: async function(opts) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      content.innerHTML = '<div class="ve-loading">' + _mi('hourglass_top') + ' Loading…</div>';

      try {
        var index = await this._loadIndex();
        var items = (index.items || []).filter(function(i) { return i.status !== 'hidden'; });

        var availableCount = items.filter(function(i) { return i.status === 'available'; }).length;
        var totalCount = items.length;
        var passedCount = 0;
        items.forEach(function(item) {
          if (item.status === 'available') {
            var p = self._getExerciseProgress(item.id);
            if (p.passed) passedCount++;
          }
        });

        // Collect unique levels
        var levels = [];
        items.forEach(function(i) { if (i.level && levels.indexOf(i.level) < 0) levels.push(i.level); });
        var levelStr = levels.length ? levels.join(' · ') : '';

        var cardsHtml = items.map(function(item) {
          var prog = item.status === 'available' ? self._getExerciseProgress(item.id) : {};
          return self._buildEpisodeCardHtml(item, prog);
        }).join('');

        if (!cardsHtml) cardsHtml = '<div class="ve-empty">No episodes available yet.</div>';

        var overallProgress = availableCount > 0
          ? '<div class="ve-series-overall-progress">' +
              '<div class="ve-series-overall-fill" style="width:' + Math.round((passedCount / availableCount) * 100) + '%"></div>' +
            '</div>' +
            '<span class="ve-series-overall-label">' + passedCount + ' / ' + availableCount + ' completed</span>'
          : '';

        self._renderHubLayout(
          '<div class="ve-hub">' +
            '<header class="ve-series-header">' +
              '<div class="ve-series-header-top">' +
                '<div class="ve-series-brand-icon">' + _mi('movie') + '</div>' +
                '<div class="ve-series-header-text">' +
                  '<h1 class="ve-series-title">Sune\'s Stories</h1>' +
                  '<p class="ve-series-tagline">Watch animated episodes &amp; master English vocabulary</p>' +
                '</div>' +
              '</div>' +
              '<div class="ve-series-meta-row">' +
                '<span class="ve-series-pill">' + _mi('tv') + ' Season 1</span>' +
                '<span class="ve-series-pill">' + _mi('play_circle') + ' ' + totalCount + ' Episodes</span>' +
                (levelStr ? '<span class="ve-series-pill">' + levelStr + '</span>' : '') +
              '</div>' +
              (overallProgress
                ? '<div class="ve-series-progress-row">' + overallProgress + '</div>'
                : '') +
            '</header>' +
            '<div class="ve-story-grid">' + cardsHtml + '</div>' +
          '</div>'
        );

        if (!opts || !opts.fromRoute) {
          self._pushState({ view: 'videoExercises' });
        }
      } catch (e) {
        content.innerHTML = '<div class="ve-error">Could not load video exercises.</div>';
        console.error(e);
      }
    },

    openExercise: async function(exerciseId, opts) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      try {
        var data = await this._loadExercise(exerciseId);
        var prog = this._getExerciseProgress(exerciseId);
        var queue = this._buildQuestionQueue(data);

        session = {
          exerciseId: exerciseId,
          data: data,
          queue: queue,
          phase: prog.videoWatched ? 'video_end' : 'video',
          queueIdx: 0,
          lives: data.lives || 3,
          maxLives: data.lives || 3,
          correct: 0,
          orderSelection: [],
          awaitingContinue: false
        };

        this._renderSession();

        if (!opts || !opts.fromRoute) {
          self._pushState({ view: 'videoExercise', exerciseId: exerciseId });
        }
      } catch (e) {
        content.innerHTML = '<div class="ve-error">Episode not found.</div>';
        console.error(e);
      }
    },

    _renderSession: function() {
      if (!session) return;
      switch (session.phase) {
        case 'video':
        case 'video_end':
          this._renderVideoPhase();
          break;
        case 'chapter':
          this._renderChapterBreak();
          break;
        case 'quiz':
          this._renderQuizQuestion();
          break;
        case 'result_pass':
        case 'result_fail':
          this._renderResult();
          break;
      }
    },

    // ─── Lesson header ────────────────────────────────────────────────────

    _renderLessonHeader: function(opts) {
      opts = opts || {};
      var heartsHtml = '';
      for (var h = 0; h < session.maxLives; h++) {
        heartsHtml += '<span class="ve-heart' + (h < session.lives ? ' ve-heart--full' : ' ve-heart--empty') + '">' +
          _mi(h < session.lives ? 'favorite' : 'heart_broken') + '</span>';
      }

      var centerHtml = '';
      if (opts.showProgress) {
        var total = session.queue.length;
        var done  = session.queueIdx;
        var pct   = total > 0 ? Math.round((done / total) * 100) : 0;
        centerHtml = '<div class="ve-session-progress"><div class="ve-session-progress-fill" style="width:' + pct + '%"></div></div>';
      } else if (opts.episodeLabel) {
        centerHtml = '<span class="ve-header-episode-label">' + esc(opts.episodeLabel) + '</span>';
      }

      return '<header class="ve-practice-header">' +
        '<button type="button" class="ve-header-btn" onclick="VideoExercises.' + (opts.exitAction || 'openHub') + '()" aria-label="Exit">' +
          _mi('close') + '</button>' +
        centerHtml +
        (opts.showHearts ? '<div class="ve-hearts">' + heartsHtml + '</div>' : '<span></span>') +
      '</header>';
    },

    // ─── Video phase ──────────────────────────────────────────────────────

    _renderVideoPhase: function() {
      var self = this;
      var data = session.data;
      var showEndOverlay = session.phase === 'video_end';

      // find episode info from index cache
      var episodeMeta = null;
      if (this._indexCache) {
        var items = this._indexCache.items || [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].id === session.exerciseId) { episodeMeta = items[i]; break; }
        }
      }

      var epLabel = episodeMeta
        ? 'S' + (episodeMeta.season || 1) + ' · Ep. ' + (episodeMeta.episode || 1)
        : '';

      var overlayHtml = showEndOverlay
        ? '<div class="ve-video-overlay">' +
            '<div class="ve-video-overlay-actions">' +
              '<button type="button" class="ve-btn ve-btn--ghost" onclick="VideoExercises._replayVideo()">' +
                _mi('replay') + ' Watch again' +
              '</button>' +
              '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises._startQuiz()">' +
                _mi('quiz') + ' Start test' +
              '</button>' +
            '</div>' +
          '</div>'
        : '';

      this._renderLessonLayout(
        this._renderLessonHeader({ exitAction: 'openHub', episodeLabel: epLabel }) +
        '<div class="ve-video-stage">' +
          '<div class="ve-video-frame' + (showEndOverlay ? ' ve-video-frame--ended' : '') + '">' +
            '<video class="ve-video" id="ve-video-player" src="' + esc(data.videoUrl) + '" playsinline controls></video>' +
            overlayHtml +
          '</div>' +
          '<div class="ve-video-meta">' +
            '<h1 class="ve-video-title">' + esc(data.title) + '</h1>' +
            '<p class="ve-video-desc">' + esc(data.description || '') + '</p>' +
          '</div>' +
        '</div>'
      );

      var video = document.getElementById('ve-video-player');
      if (video) {
        video.onended = function() { self._onVideoEnded(); };
        if (showEndOverlay) video.pause();
      }
    },

    _onVideoEnded: function() {
      if (!session) return;
      session.phase = 'video_end';
      this._saveExerciseProgress(session.exerciseId, { videoWatched: true });
      this._renderSession();
    },

    _replayVideo: function() {
      if (!session) return;
      session.phase = 'video';
      this._renderSession();
      var video = document.getElementById('ve-video-player');
      if (video) {
        video.currentTime = 0;
        video.play().catch(function() { /* ignore */ });
      }
    },

    _startQuiz: function() {
      if (!session) return;
      session.phase = session.queue[0] && session.queue[0].isFirstInSection ? 'chapter' : 'quiz';
      session.queueIdx = 0;
      session.lives = session.data.lives || 3;
      session.correct = 0;
      session._pendingChapter = session.queue[0] || null;
      this._saveExerciseProgress(session.exerciseId, { videoWatched: true });
      this._renderSession();
      this._pushState({ view: 'videoExercise', exerciseId: session.exerciseId, phase: 'quiz' });
    },

    // ─── Chapter break ────────────────────────────────────────────────────

    _sectionIcon: function(title) {
      var t = (title || '').toLowerCase();
      if (t.indexOf('vocab') >= 0)                                            return 'menu_book';
      if (t.indexOf('comprehension') >= 0 || t.indexOf('understanding') >= 0) return 'smart_display';
      if (t.indexOf('fill') >= 0 || t.indexOf('gap') >= 0 || t.indexOf('complete') >= 0) return 'edit_note';
      if (t.indexOf('order') >= 0 || t.indexOf('put') >= 0 || t.indexOf('sequence') >= 0) return 'format_list_numbered';
      if (t.indexOf('word') >= 0 || t.indexOf('spell') >= 0)                 return 'spellcheck';
      return 'quiz';
    },

    _sectionIconColor: function(sectionIdx) {
      var palette = ['#1899d6', '#58cc02', '#ffc800', '#ef4444', '#8b5cf6'];
      return palette[sectionIdx % palette.length];
    },

    _renderChapterBreak: function() {
      var entry = session._pendingChapter || session.queue[session.queueIdx];
      if (!entry) {
        session.phase = 'quiz';
        this._renderSession();
        return;
      }
      var sec = entry.section;
      var sectionNum = entry.sectionIdx + 1;
      var totalSections = (session.data.sections || []).length;

      var icon = this._sectionIcon(sec.title);
      var iconColor = this._sectionIconColor(entry.sectionIdx);
      var qCount = (sec.questions || []).length;

      this._renderLessonLayout(
        this._renderLessonHeader({ showProgress: true, showHearts: true, exitAction: '_exitQuiz' }) +
        '<div class="ve-chapter-break">' +
          '<div class="ve-chapter-icon-wrap" style="--ve-chapter-color:' + iconColor + '">' +
            _mi(icon) +
          '</div>' +
          '<div class="ve-chapter-badge">Part ' + sectionNum + ' of ' + totalSections + '</div>' +
          '<h2 class="ve-chapter-title">' + esc(sec.title) + '</h2>' +
          '<p class="ve-chapter-instructions">' + esc(sec.instructions || '') + '</p>' +
          '<p class="ve-chapter-count">' +
            _mi('help') + ' ' +
            qCount + ' question' + (qCount !== 1 ? 's' : '') +
          '</p>' +
          '<div class="ve-chapter-actions">' +
            '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises._continueFromChapter()">' +
              _mi('arrow_forward') + ' Continue' +
            '</button>' +
            '<button type="button" class="ve-btn ve-btn--ghost ve-chapter-rewatch" onclick="VideoExercises._goToVideo()">' +
              _mi('replay') + ' Watch video again' +
            '</button>' +
          '</div>' +
        '</div>'
      );
    },

    _continueFromChapter: function() {
      if (!session) return;
      session.phase = 'quiz';
      session._pendingChapter = null;
      this._renderSession();
    },

    _goToVideo: function() {
      if (!session) return;
      session.phase = 'video_end';
      this._renderSession();
    },

    _exitQuiz: function() {
      if (!session) return;
      this.openHub();
    },

    // ─── Quiz ─────────────────────────────────────────────────────────────

    _getCurrentEntry: function() {
      return session.queue[session.queueIdx] || null;
    },

    _renderQuizQuestion: function() {
      var entry = this._getCurrentEntry();
      if (!entry) {
        this._finishQuiz();
        return;
      }

      var sec = entry.section;
      var q = entry.question;
      var globalNum = entry.globalIdx + 1;
      var total = session.queue.length;
      var questionBody = this._renderQuestionBody(q);

      this._renderLessonLayout(
        this._renderLessonHeader({ showProgress: true, showHearts: true, exitAction: '_exitQuiz' }) +
        '<div class="ve-quiz-stage">' +
          '<div class="ve-quiz-chapter-label">' + esc(sec.title) + '</div>' +
          '<div class="ve-quiz-counter">' + globalNum + ' / ' + total + '</div>' +
          '<div class="ve-question-card" id="ve-question-card">' +
            '<p class="ve-question-instructions">' + esc(sec.instructions || '') + '</p>' +
            '<p class="ve-question-text">' + esc(q.question) + '</p>' +
            questionBody +
            '<div class="ve-feedback" id="ve-feedback" style="display:none;"></div>' +
          '</div>' +
          (q.type === 'order_sentences' ?
            '<button type="button" class="ve-btn ve-btn--primary ve-check-btn" id="ve-check-btn" onclick="VideoExercises._checkOrderAnswer()">' +
              _mi('check') + ' Check order' +
            '</button>' : '') +
        '</div>'
      );

      if (q.type === 'order_sentences') {
        session.orderSelection = [];
        this._initOrderTiles(q);
      }
    },

    _renderQuestionBody: function(q) {
      var self = this;
      if (q.type === 'multiple_choice' || q.type === 'fill_gap_choice') {
        var optsHtml = (q.options || []).map(function(opt) {
          return '<button type="button" class="ve-option" data-answer="' + esc(opt) + '" onclick="VideoExercises._answerMC(\'' + jsStr(opt) + '\')">' +
            esc(opt) + '</button>';
        }).join('');
        return '<div class="ve-options">' + optsHtml + '</div>';
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

    _initOrderTiles: function(q) {
      var self = this;
      var bank   = document.getElementById('ve-tile-bank');
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
      };

      answer.onclick = function(e) {
        var rm = e.target.closest('.ve-tile-answer-item');
        if (!rm || session.awaitingContinue) return;
        var idx  = parseInt(rm.getAttribute('data-idx'), 10);
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

    _answerMC: function(selected) {
      if (!session || session.awaitingContinue) return;
      var entry = this._getCurrentEntry();
      if (!entry) return;
      var q    = entry.question;
      var self = this;

      var isCorrect = this._normalize(selected) === this._normalize(q.answer);
      this._showFeedback(isCorrect, q);
      this._lockOptions(selected, isCorrect, q.answer);

      if (isCorrect) session.correct++;

      if (!isCorrect) {
        session.lives--;
        if (session.lives <= 0) {
          setTimeout(function() { self._failQuiz(); }, 1800);
          return;
        }
      }

      session.awaitingContinue = true;
      setTimeout(function() { self._advanceQuiz(); }, isCorrect ? 1000 : 2000);
    },

    _checkOrderAnswer: function() {
      if (!session || session.awaitingContinue) return;
      var entry = this._getCurrentEntry();
      if (!entry || entry.question.type !== 'order_sentences') return;
      var q    = entry.question;
      var self = this;

      var expected  = q.answer || [];
      var isCorrect = session.orderSelection.length === expected.length &&
        session.orderSelection.every(function(item, i) {
          return self._normalize(item) === self._normalize(expected[i]);
        });

      this._showFeedback(isCorrect, q);
      var checkBtn = document.getElementById('ve-check-btn');
      if (checkBtn) checkBtn.disabled = true;

      if (isCorrect) session.correct++;

      if (!isCorrect) {
        session.lives--;
        if (session.lives <= 0) {
          setTimeout(function() { self._failQuiz(); }, 1800);
          return;
        }
      }

      session.awaitingContinue = true;
      setTimeout(function() { self._advanceQuiz(); }, isCorrect ? 1000 : 2000);
    },

    _normalize: function(str) {
      return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    },

    _lockOptions: function(selected, isCorrect, correctAnswer) {
      var self = this;
      document.querySelectorAll('.ve-option').forEach(function(btn) {
        btn.disabled = true;
        var val = btn.getAttribute('data-answer');
        if (self._normalize(val) === self._normalize(correctAnswer)) {
          btn.classList.add('ve-option--correct');
        } else if (self._normalize(val) === self._normalize(selected) && !isCorrect) {
          btn.classList.add('ve-option--wrong');
        }
      });
    },

    _showFeedback: function(isCorrect, q) {
      var fb = document.getElementById('ve-feedback');
      if (!fb) return;
      fb.style.display = 'block';
      fb.className = 've-feedback ' + (isCorrect ? 've-feedback--correct' : 've-feedback--wrong');
      fb.innerHTML =
        '<div class="ve-feedback-icon">' + _mi(isCorrect ? 'check_circle' : 'cancel') + '</div>' +
        '<div class="ve-feedback-text">' +
          (isCorrect ? 'Correct!' : 'Not quite.') +
          (q.explanation ? '<p class="ve-feedback-explanation">' + esc(q.explanation) + '</p>' : '') +
        '</div>';
    },

    _advanceQuiz: function() {
      if (!session) return;
      session.awaitingContinue = false;
      session.queueIdx++;

      // save incremental quiz progress
      var progressPct = session.queue.length > 0
        ? Math.round((session.queueIdx / session.queue.length) * 100)
        : 0;
      this._saveExerciseProgress(session.exerciseId, { quizProgressPct: progressPct });

      if (session.queueIdx >= session.queue.length) {
        this._finishQuiz();
        return;
      }

      var next = session.queue[session.queueIdx];
      if (next.isFirstInSection) {
        session.phase = 'chapter';
        session._pendingChapter = next;
        this._renderSession();
        return;
      }

      session.orderSelection = [];
      this._renderSession();
    },

    _finishQuiz: function() {
      if (!session) return;
      var total  = session.queue.length;
      var score  = total > 0 ? Math.round((session.correct / total) * 100) : 0;
      var passed = score >= (session.data.passingScore || 70);
      var prog   = this._getExerciseProgress(session.exerciseId);

      this._saveExerciseProgress(session.exerciseId, {
        passed: passed,
        bestScore: Math.max(prog.bestScore || 0, score),
        lastScore: score,
        quizProgressPct: 100
      });

      session.finalScore = score;
      session.phase = passed ? 'result_pass' : 'result_fail';
      this._renderSession();
    },

    _failQuiz: function() {
      if (!session) return;
      var total    = session.queue.length;
      var score    = total > 0 ? Math.round((session.correct / total) * 100) : 0;
      session.finalScore = score;
      session.phase = 'result_fail';
      this._renderSession();
    },

    // ─── Results ──────────────────────────────────────────────────────────

    _scoreToStars: function(score) {
      if (score >= 85) return 3;
      if (score >= 70) return 2;
      if (score >= 50) return 1;
      return 0;
    },

    _nextAvailableEpisode: function(currentId) {
      if (!this._indexCache) return null;
      var items = (this._indexCache.items || []).filter(function(i) { return i.status !== 'hidden'; });
      var currentIdx = -1;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === currentId) { currentIdx = i; break; }
      }
      if (currentIdx < 0) return null;
      for (var j = currentIdx + 1; j < items.length; j++) {
        if (items[j].status === 'available') return items[j].id;
      }
      return null;
    },

    _renderResult: function() {
      var data   = session.data;
      var passed = session.phase === 'result_pass';
      var score  = session.finalScore || 0;
      var stars  = this._scoreToStars(score);

      // star HTML with staggered animation
      var starsHtml = '';
      for (var s = 1; s <= 3; s++) {
        var filled = s <= stars;
        starsHtml += '<span class="ve-star' + (filled ? ' ve-star--filled' : ' ve-star--empty') + '" style="animation-delay:' + ((s - 1) * 180) + 'ms">' +
          _mi('star') +
        '</span>';
      }

      // next episode
      var nextId = this._nextAvailableEpisode(session.exerciseId);
      var nextEpHtml = '';
      if (passed && nextId) {
        nextEpHtml =
          '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises.openExercise(\'' + jsStr(nextId) + '\')">' +
            _mi('arrow_forward') + ' Next episode' +
          '</button>';
      }

      var retryBtnCls = (nextEpHtml || !passed) ? 've-btn--ghost' : 've-btn--primary';

      // motivational message
      var msg = passed
        ? (score >= 85 ? 'Excellent! Perfect score territory!' : 'Great job! Keep it up!')
        : (score >= 50 ? 'Almost there — try once more!' : 'Watch the video again and give it another shot!');

      this._renderLessonLayout(
        '<div class="ve-result-stage">' +
          '<div class="ve-result-card ' + (passed ? 've-result-card--passed' : 've-result-card--failed') + '">' +
            '<div class="ve-result-stars">' + starsHtml + '</div>' +
            '<div class="ve-result-icon">' + _mi(passed ? 'celebration' : 'sentiment_dissatisfied') + '</div>' +
            '<h2>' + (passed ? 'Well done!' : 'Keep practising!') + '</h2>' +
            '<p class="ve-result-msg-main">' + esc(msg) + '</p>' +
            '<div class="ve-result-score-row">' +
              '<span class="ve-result-score">' + score + '%</span>' +
              '<span class="ve-result-score-sub">' + session.correct + ' / ' + session.queue.length + ' correct</span>' +
            '</div>' +
            '<p class="ve-result-pass-note">Need ' + (data.passingScore || 70) + '% to pass</p>' +
            '<div class="ve-result-actions">' +
              nextEpHtml +
              '<button type="button" class="ve-btn ' + retryBtnCls + '" onclick="VideoExercises._retryQuiz()">' +
                _mi('refresh') + ' Try again' +
              '</button>' +
              '<button type="button" class="ve-btn ve-btn--ghost" onclick="VideoExercises.openHub()">' +
                _mi('home') + ' All episodes' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    },

    _retryQuiz: function() {
      if (!session) return;
      var exerciseId = session.exerciseId;
      this._saveExerciseProgress(exerciseId, { passed: false, quizProgressPct: 0 });
      this.openExercise(exerciseId);
    }
  };
})();
