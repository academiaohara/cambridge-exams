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
      return all[exerciseId] || { videoWatched: false, passed: false, bestScore: 0 };
    },

    _saveExerciseProgress: function(exerciseId, patch) {
      var all = this._getProgress();
      var current = all[exerciseId] || { videoWatched: false, passed: false, bestScore: 0 };
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

    openHub: async function(opts) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      content.innerHTML = '<div class="ve-loading">' + _mi('hourglass_top') + ' Loading…</div>';

      try {
        var index = await this._loadIndex();
        var items = (index.items || []).filter(function(i) { return i.status !== 'hidden'; });

        var cardsHtml = items.map(function(item) {
          var prog = self._getExerciseProgress(item.id);
          var statusCls = prog.passed ? 've-story-card--passed' : (prog.videoWatched ? 've-story-card--started' : '');
          var statusLabel = prog.passed
            ? _mi('check_circle') + ' Passed'
            : (prog.videoWatched ? _mi('play_circle') + ' Continue' : _mi('play_arrow') + ' Watch');
          return '<button type="button" class="ve-story-card ' + statusCls + '" onclick="VideoExercises.openExercise(\'' + jsStr(item.id) + '\')">' +
            '<div class="ve-story-preview">' +
              '<div class="ve-story-preview-inner">' + _mi('smart_display') + '</div>' +
            '</div>' +
            '<div class="ve-story-body">' +
              '<h3 class="ve-story-title">' + esc(item.title) + '</h3>' +
              '<p class="ve-story-desc">' + esc(item.description || '') + '</p>' +
              '<span class="ve-story-status">' + statusLabel + '</span>' +
            '</div>' +
          '</button>';
        }).join('');

        if (!cardsHtml) cardsHtml = '<div class="ve-empty">No video exercises available yet.</div>';

        self._renderHubLayout(
          '<div class="ve-hub">' +
            '<header class="ve-hub-header">' +
              '<h1 class="ve-hub-title">' + _mi('smart_display') + ' Video Exercises</h1>' +
              '<p class="ve-hub-sub">Watch a story, then answer questions in one go</p>' +
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
        content.innerHTML = '<div class="ve-error">Exercise not found.</div>';
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

    _renderLessonHeader: function(opts) {
      opts = opts || {};
      var heartsHtml = '';
      for (var h = 0; h < session.maxLives; h++) {
        heartsHtml += '<span class="ve-heart' + (h < session.lives ? ' ve-heart--full' : ' ve-heart--empty') + '">' +
          _mi(h < session.lives ? 'favorite' : 'heart_broken') + '</span>';
      }

      var progressHtml = '';
      if (opts.showProgress) {
        var total = session.queue.length;
        var done = session.queueIdx;
        var pct = total > 0 ? Math.round((done / total) * 100) : 0;
        progressHtml = '<div class="ve-session-progress"><div class="ve-session-progress-fill" style="width:' + pct + '%"></div></div>';
      }

      return '<header class="ve-practice-header">' +
        '<button type="button" class="ve-header-btn" onclick="VideoExercises.' + (opts.exitAction || 'openHub') + '()" aria-label="Exit">' +
          _mi('close') + '</button>' +
        progressHtml +
        (opts.showHearts ? '<div class="ve-hearts">' + heartsHtml + '</div>' : '<span></span>') +
      '</header>';
    },

    _renderVideoPhase: function() {
      var self = this;
      var data = session.data;
      var showEndOverlay = session.phase === 'video_end';

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
        this._renderLessonHeader({ exitAction: 'openHub' }) +
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

      this._renderLessonLayout(
        this._renderLessonHeader({ showProgress: true, showHearts: true, exitAction: '_exitQuiz' }) +
        '<div class="ve-chapter-break">' +
          '<div class="ve-chapter-badge">Part ' + sectionNum + ' / ' + totalSections + '</div>' +
          '<h2 class="ve-chapter-title">' + esc(sec.title) + '</h2>' +
          '<p class="ve-chapter-instructions">' + esc(sec.instructions || '') + '</p>' +
          '<p class="ve-chapter-count">' + (sec.questions || []).length + ' question' + ((sec.questions || []).length !== 1 ? 's' : '') + '</p>' +
          '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises._continueFromChapter()">' +
            _mi('arrow_forward') + ' Continue' +
          '</button>' +
          '<button type="button" class="ve-btn ve-btn--ghost ve-chapter-rewatch" onclick="VideoExercises._goToVideo()">' +
            _mi('replay') + ' Watch video again' +
          '</button>' +
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
      var q = entry.question;
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
      var q = entry.question;
      var self = this;

      var expected = q.answer || [];
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
      var total = session.queue.length;
      var score = total > 0 ? Math.round((session.correct / total) * 100) : 0;
      var passed = score >= (session.data.passingScore || 70);
      var prog = this._getExerciseProgress(session.exerciseId);

      this._saveExerciseProgress(session.exerciseId, {
        passed: passed,
        bestScore: Math.max(prog.bestScore || 0, score),
        lastScore: score
      });

      session.finalScore = score;
      session.phase = passed ? 'result_pass' : 'result_fail';
      this._renderSession();
    },

    _failQuiz: function() {
      if (!session) return;
      var total = session.queue.length;
      var answered = session.queueIdx + (session.awaitingContinue ? 1 : 0);
      var score = total > 0 ? Math.round((session.correct / total) * 100) : 0;
      session.finalScore = score;
      session.phase = 'result_fail';
      this._renderSession();
    },

    _renderResult: function() {
      var data = session.data;
      var passed = session.phase === 'result_pass';
      var score = session.finalScore || 0;

      this._renderLessonLayout(
        '<div class="ve-result-stage">' +
          '<div class="ve-result-card ' + (passed ? 've-result-card--passed' : 've-result-card--failed') + '">' +
            '<div class="ve-result-icon">' + _mi(passed ? 'celebration' : 'sentiment_dissatisfied') + '</div>' +
            '<h2>' + (passed ? 'Well done!' : 'Keep practising!') + '</h2>' +
            '<div class="ve-result-score">' + score + '%</div>' +
            '<p class="ve-result-msg">' + session.correct + ' / ' + session.queue.length + ' correct · need ' + (data.passingScore || 70) + '% to pass</p>' +
            '<div class="ve-result-actions">' +
              '<button type="button" class="ve-btn ve-btn--ghost" onclick="VideoExercises._retryQuiz()">' +
                _mi('refresh') + ' Try again' +
              '</button>' +
              '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises.openHub()">' +
                _mi('home') + ' All videos' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    },

    _retryQuiz: function() {
      if (!session) return;
      var exerciseId = session.exerciseId;
      this._saveExerciseProgress(exerciseId, { passed: false });
      this.openExercise(exerciseId);
    }
  };
})();
