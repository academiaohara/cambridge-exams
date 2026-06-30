// js/video-exercises.js
// Video + post-video test exercises (watch → quiz flow)

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
      return all[exerciseId] || { videoWatched: false, sections: {}, passed: false, bestScore: 0 };
    },

    _saveExerciseProgress: function(exerciseId, patch) {
      var all = this._getProgress();
      var current = all[exerciseId] || { videoWatched: false, sections: {}, passed: false, bestScore: 0 };
      all[exerciseId] = Object.assign({}, current, patch);
      if (patch.sections) {
        all[exerciseId].sections = Object.assign({}, current.sections, patch.sections);
      }
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

    _buildSidebars: function() {
      var sidebars = { left: '', right: '' };
      if (typeof BentoGrid !== 'undefined') {
        var exams = window.EXAMS_DATA[AppState.currentLevel || 'C1'] || [];
        sidebars = BentoGrid._buildDashboardSidebars(exams, { includeGradeTracker: true });
      }
      return sidebars;
    },

    _renderLayout: function(centerHtml) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var sidebars = this._buildSidebars();
      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', sidebars.left)
            : '<div class="dashboard-left-sidebar">' + sidebars.left + '</div>') +
          '<div class="dashboard-center">' + centerHtml + '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', sidebars.right)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + sidebars.right + '</div>') +
        '</div>';
      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof BentoGrid !== 'undefined') BentoGrid._startGradeCarousel();
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
          var badge = prog.passed
            ? '<span class="ve-card-badge ve-card-badge--passed">' + _mi('check_circle') + ' Passed</span>'
            : (prog.videoWatched ? '<span class="ve-card-badge ve-card-badge--started">' + _mi('play_circle') + ' In progress</span>' : '');
          return '<button type="button" class="ve-card" onclick="VideoExercises.openExercise(\'' + esc(item.id) + '\')">' +
            '<div class="ve-card-icon">' + _mi('smart_display') + '</div>' +
            '<div class="ve-card-body">' +
              '<div class="ve-card-level">' + esc(item.level || '') + '</div>' +
              '<div class="ve-card-title">' + esc(item.title) + '</div>' +
              '<div class="ve-card-desc">' + esc(item.description || '') + '</div>' +
              badge +
            '</div>' +
            '<div class="ve-card-arrow">' + _mi('chevron_right') + '</div>' +
          '</button>';
        }).join('');

        if (!cardsHtml) {
          cardsHtml = '<div class="ve-empty">No video exercises available yet.</div>';
        }

        self._renderLayout(
          '<div class="ve-section">' +
            '<div class="subpage-header">' +
              '<div>' +
                '<div class="subpage-title">' + _mi('smart_display') + ' Video Exercises</div>' +
                '<div class="subpage-subtitle">Watch a story, then test what you learned</div>' +
              '</div>' +
            '</div>' +
            '<div class="ve-cards-list">' + cardsHtml + '</div>' +
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

        session = {
          exerciseId: exerciseId,
          data: data,
          phase: prog.videoWatched ? 'test_hub' : 'video',
          lives: data.lives || 3,
          maxLives: data.lives || 3,
          correct: 0,
          answered: 0,
          currentSectionIdx: null,
          currentQuestionIdx: 0,
          sectionResults: {},
          orderSelection: []
        };

        this._renderSession();

        var routeOpts = { view: 'videoExercise', exerciseId: exerciseId };
        if (opts && opts.phase) routeOpts.phase = opts.phase;
        if (!opts || !opts.fromRoute) {
          self._pushState(routeOpts);
        }
      } catch (e) {
        content.innerHTML = '<div class="ve-error">Exercise not found.</div>';
        console.error(e);
      }
    },

    _renderSession: function() {
      if (!session) return;
      var phase = session.phase;
      if (phase === 'video' || phase === 'video_end') {
        this._renderVideoPhase();
      } else if (phase === 'test_hub') {
        this._renderTestHub();
      } else if (phase === 'section') {
        this._renderSectionQuestion();
      } else if (phase === 'section_done') {
        this._renderSectionDone();
      } else if (phase === 'test_done' || phase === 'test_failed') {
        this._renderTestResult();
      }
    },

    _renderVideoPhase: function() {
      var self = this;
      var data = session.data;
      var showEndOverlay = session.phase === 'video_end';

      var overlayHtml = showEndOverlay
        ? '<div class="ve-video-overlay">' +
            '<div class="ve-video-overlay-card">' +
              '<div class="ve-video-overlay-icon">' + _mi('celebration') + '</div>' +
              '<h3>Video finished!</h3>' +
              '<p>Ready to test what you learned?</p>' +
              '<div class="ve-video-overlay-actions">' +
                '<button type="button" class="ve-btn ve-btn--secondary" onclick="VideoExercises._replayVideo()">' +
                  _mi('replay') + ' Watch again' +
                '</button>' +
                '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises._startTest()">' +
                  _mi('quiz') + ' Start test' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>'
        : '';

      this._renderLayout(
        '<div class="ve-lesson">' +
          '<div class="ve-lesson-header">' +
            '<button type="button" class="ve-back-btn" onclick="VideoExercises.openHub()">' +
              _mi('arrow_back') + '<span>Back</span>' +
            '</button>' +
            '<div class="ve-lesson-titles">' +
              '<div class="ve-lesson-level">' + esc(data.level || '') + '</div>' +
              '<h1 class="ve-lesson-title">' + esc(data.title) + '</h1>' +
            '</div>' +
          '</div>' +
          '<div class="ve-video-wrap' + (showEndOverlay ? ' ve-video-wrap--ended' : '') + '" id="ve-video-wrap">' +
            '<video class="ve-video" id="ve-video-player" src="' + esc(data.videoUrl) + '" playsinline controls></video>' +
            overlayHtml +
          '</div>' +
          '<p class="ve-video-desc">' + esc(data.description || '') + '</p>' +
        '</div>'
      );

      var video = document.getElementById('ve-video-player');
      if (video) {
        video.onended = function() {
          self._onVideoEnded();
        };
        if (showEndOverlay) {
          video.pause();
        }
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
        video.play().catch(function() { /* autoplay blocked */ });
      }
    },

    _startTest: function() {
      if (!session) return;
      session.phase = 'test_hub';
      session.lives = session.data.lives || 3;
      session.correct = 0;
      session.answered = 0;
      session.sectionResults = {};
      this._saveExerciseProgress(session.exerciseId, { videoWatched: true });
      this._renderSession();
      this._pushState({ view: 'videoExercise', exerciseId: session.exerciseId, phase: 'test' });
    },

    _buildProgressDots: function() {
      var data = session.data;
      var prog = this._getExerciseProgress(session.exerciseId);
      var dots = '';

      dots += '<span class="ve-dot ve-dot--video' + (prog.videoWatched ? ' ve-dot--done' : ' ve-dot--current') + '" title="Video">' +
        _mi('smart_display') + '</span>';

      (data.sections || []).forEach(function(sec, si) {
        var secProg = (prog.sections || {})[sec.id];
        var cls = 've-dot';
        if (secProg && secProg.completed) cls += ' ve-dot--done';
        else if (session.currentSectionIdx === si) cls += ' ve-dot--current';
        dots += '<span class="' + cls + '" title="' + esc(sec.title) + '">' + (si + 1) + '</span>';
      });

      return '<div class="ve-progress-dots" aria-label="Progress">' + dots + '</div>';
    },

    _renderTestHub: function() {
      var self = this;
      var data = session.data;
      var prog = this._getExerciseProgress(session.exerciseId);

      var sectionsHtml = (data.sections || []).map(function(sec, si) {
        var secProg = (prog.sections || {})[sec.id];
        var qCount = (sec.questions || []).length;
        var miniDots = '';
        for (var qi = 0; qi < qCount; qi++) {
          var dotCls = 've-mini-dot';
          if (secProg && secProg.answers && secProg.answers[qi] === true) dotCls += ' ve-mini-dot--correct';
          else if (secProg && secProg.answers && secProg.answers[qi] === false) dotCls += ' ve-mini-dot--wrong';
          miniDots += '<span class="' + dotCls + '"></span>';
        }

        var statusIcon = secProg && secProg.completed
          ? '<span class="ve-section-status ve-section-status--done">' + _mi('check_circle') + '</span>'
          : '<span class="ve-section-status">' + _mi('chevron_right') + '</span>';

        return '<button type="button" class="ve-section-card" onclick="VideoExercises._openSection(' + si + ')">' +
          '<div class="ve-section-card-main">' +
            '<div class="ve-section-card-title">' + esc(sec.title) + '</div>' +
            '<div class="ve-section-card-meta">' + qCount + ' question' + (qCount !== 1 ? 's' : '') + '</div>' +
          '</div>' +
          '<div class="ve-section-card-dots">' + miniDots + '</div>' +
          statusIcon +
        '</button>';
      }).join('');

      var heartsHtml = '';
      for (var h = 0; h < session.maxLives; h++) {
        heartsHtml += '<span class="ve-heart' + (h < session.lives ? ' ve-heart--full' : ' ve-heart--empty') + '">' +
          _mi(h < session.lives ? 'favorite' : 'heart_broken') + '</span>';
      }

      this._renderLayout(
        '<div class="ve-lesson">' +
          '<div class="ve-lesson-header">' +
            '<button type="button" class="ve-back-btn" onclick="VideoExercises.openHub()">' +
              _mi('arrow_back') + '<span>Back</span>' +
            '</button>' +
            '<div class="ve-lesson-titles">' +
              '<h1 class="ve-lesson-title">' + esc(data.title) + '</h1>' +
              '<div class="ve-lesson-sub">Test sections</div>' +
            '</div>' +
            '<div class="ve-hearts">' + heartsHtml + '</div>' +
          '</div>' +
          this._buildProgressDots() +
          '<div class="ve-test-hub">' +
            '<button type="button" class="ve-rewatch-btn" onclick="VideoExercises._goToVideo()">' +
              _mi('replay') + ' Watch video again' +
            '</button>' +
            '<div class="ve-sections-list">' + sectionsHtml + '</div>' +
            (self._allSectionsComplete() ?
              '<button type="button" class="ve-btn ve-btn--primary ve-finish-btn" onclick="VideoExercises._finishTest()">' +
                _mi('flag') + ' See results' +
              '</button>' : '') +
          '</div>' +
        '</div>'
      );
    },

    _goToVideo: function() {
      if (!session) return;
      session.phase = 'video_end';
      this._renderSession();
    },

    _allSectionsComplete: function() {
      if (!session) return false;
      var data = session.data;
      var prog = this._getExerciseProgress(session.exerciseId);
      return (data.sections || []).every(function(sec) {
        var sp = (prog.sections || {})[sec.id];
        return sp && sp.completed;
      });
    },

    _openSection: function(sectionIdx) {
      if (!session) return;
      if (session.lives <= 0) {
        session.phase = 'test_failed';
        this._renderSession();
        return;
      }
      session.currentSectionIdx = sectionIdx;
      session.currentQuestionIdx = 0;
      session.phase = 'section';
      session.orderSelection = [];
      session.awaitingContinue = false;
      this._renderSession();
    },

    _getCurrentSection: function() {
      if (!session || session.currentSectionIdx == null) return null;
      return (session.data.sections || [])[session.currentSectionIdx] || null;
    },

    _getCurrentQuestion: function() {
      var sec = this._getCurrentSection();
      if (!sec) return null;
      return (sec.questions || [])[session.currentQuestionIdx] || null;
    },

    _renderSectionQuestion: function() {
      var self = this;
      var data = session.data;
      var sec = this._getCurrentSection();
      var q = this._getCurrentQuestion();
      if (!sec || !q) {
        session.phase = 'test_hub';
        this._renderSession();
        return;
      }

      var totalInSection = sec.questions.length;
      var qNum = session.currentQuestionIdx + 1;
      var questionBody = this._renderQuestionBody(q);

      var heartsHtml = '';
      for (var h = 0; h < session.maxLives; h++) {
        heartsHtml += '<span class="ve-heart' + (h < session.lives ? ' ve-heart--full' : ' ve-heart--empty') + '">' +
          _mi(h < session.lives ? 'favorite' : 'heart_broken') + '</span>';
      }

      var progressPct = Math.round((session.currentQuestionIdx / totalInSection) * 100);

      this._renderLayout(
        '<div class="ve-lesson ve-lesson--quiz">' +
          '<div class="ve-lesson-header">' +
            '<button type="button" class="ve-back-btn" onclick="VideoExercises._backToHub()">' +
              _mi('arrow_back') + '<span>Sections</span>' +
            '</button>' +
            '<div class="ve-lesson-titles">' +
              '<div class="ve-lesson-sub">' + esc(sec.title) + '</div>' +
              '<div class="ve-question-counter">Question ' + qNum + ' / ' + totalInSection + '</div>' +
            '</div>' +
            '<div class="ve-hearts">' + heartsHtml + '</div>' +
          '</div>' +
          '<div class="ve-quiz-progress"><div class="ve-quiz-progress-fill" style="width:' + progressPct + '%"></div></div>' +
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
      session.orderSelection = [];
      var bank = document.getElementById('ve-tile-bank');
      var answer = document.getElementById('ve-tile-answer');
      if (!bank || !answer) return;

      bank.addEventListener('click', function(e) {
        var btn = e.target.closest('.ve-tile');
        if (!btn || btn.disabled || session.awaitingContinue) return;
        var item = btn.getAttribute('data-item');
        btn.disabled = true;
        btn.classList.add('ve-tile--used');
        session.orderSelection.push(item);
        self._renderOrderAnswer();
      });

      answer.addEventListener('click', function(e) {
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
      });
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
      var q = this._getCurrentQuestion();
      if (!q) return;

      var isCorrect = this._normalize(selected) === this._normalize(q.answer);
      this._showFeedback(isCorrect, q);
      this._lockOptions(selected, isCorrect, q.answer);

      session.answered++;
      if (isCorrect) session.correct++;

      if (!isCorrect) {
        session.lives--;
        if (session.lives <= 0) {
          var self = this;
          setTimeout(function() {
            session.phase = 'test_failed';
            self._renderSession();
          }, 1800);
          return;
        }
      }

      this._saveQuestionResult(isCorrect);
      session.awaitingContinue = true;

      var self = this;
      setTimeout(function() {
        self._advanceQuestion();
      }, isCorrect ? 1200 : 2200);
    },

    _checkOrderAnswer: function() {
      if (!session || session.awaitingContinue) return;
      var q = this._getCurrentQuestion();
      if (!q || q.type !== 'order_sentences') return;
      var self = this;

      var expected = q.answer || [];
      var isCorrect = session.orderSelection.length === expected.length &&
        session.orderSelection.every(function(item, i) {
          return self._normalize(item) === self._normalize(expected[i]);
        });

      this._showFeedback(isCorrect, q);
      var checkBtn = document.getElementById('ve-check-btn');
      if (checkBtn) checkBtn.disabled = true;

      session.answered++;
      if (isCorrect) session.correct++;

      if (!isCorrect) {
        session.lives--;
        if (session.lives <= 0) {
          setTimeout(function() {
            session.phase = 'test_failed';
            self._renderSession();
          }, 1800);
          return;
        }
      }

      this._saveQuestionResult(isCorrect);
      session.awaitingContinue = true;

      setTimeout(function() {
        self._advanceQuestion();
      }, isCorrect ? 1200 : 2200);
    },

    _normalize: function(str) {
      return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    },

    _lockOptions: function(selected, isCorrect, correctAnswer) {
      var self = this;
      var opts = document.querySelectorAll('.ve-option');
      opts.forEach(function(btn) {
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

    _saveQuestionResult: function(isCorrect) {
      var sec = this._getCurrentSection();
      if (!sec || !session) return;
      var prog = this._getExerciseProgress(session.exerciseId);
      var secProg = (prog.sections || {})[sec.id] || { answers: {}, completed: false };
      secProg.answers = secProg.answers || {};
      secProg.answers[session.currentQuestionIdx] = isCorrect;

      var patch = { sections: {} };
      patch.sections[sec.id] = secProg;
      this._saveExerciseProgress(session.exerciseId, patch);
    },

    _advanceQuestion: function() {
      if (!session) return;
      var sec = this._getCurrentSection();
      if (!sec) return;

      session.awaitingContinue = false;
      session.currentQuestionIdx++;

      if (session.currentQuestionIdx >= sec.questions.length) {
        var correctInSection = 0;
        var prog = this._getExerciseProgress(session.exerciseId);
        var secProg = (prog.sections || {})[sec.id] || { answers: {} };
        Object.keys(secProg.answers || {}).forEach(function(k) {
          if (secProg.answers[k]) correctInSection++;
        });
        secProg.completed = true;
        secProg.score = Math.round((correctInSection / sec.questions.length) * 100);

        var patch = { sections: {} };
        patch.sections[sec.id] = secProg;
        this._saveExerciseProgress(session.exerciseId, patch);

        session.sectionResults[sec.id] = secProg;
        session.phase = 'section_done';
        this._renderSession();
        return;
      }

      session.orderSelection = [];
      this._renderSession();
    },

    _renderSectionDone: function() {
      var sec = this._getCurrentSection();
      if (!sec) {
        session.phase = 'test_hub';
        this._renderSession();
        return;
      }
      var prog = this._getExerciseProgress(session.exerciseId);
      var secProg = (prog.sections || {})[sec.id] || {};

      this._renderLayout(
        '<div class="ve-lesson ve-lesson--result">' +
          '<div class="ve-section-done-card">' +
            '<div class="ve-section-done-icon">' + _mi('emoji_events') + '</div>' +
            '<h2>Section complete!</h2>' +
            '<p class="ve-section-done-title">' + esc(sec.title) + '</p>' +
            '<div class="ve-section-done-score">' + (secProg.score || 0) + '%</div>' +
            '<div class="ve-section-done-actions">' +
              '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises._backToHub()">' +
                _mi('dashboard') + ' Back to sections' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    },

    _backToHub: function() {
      if (!session) return;
      session.phase = 'test_hub';
      session.currentSectionIdx = null;
      session.currentQuestionIdx = 0;
      this._renderSession();
    },

    _finishTest: function() {
      if (!session) return;
      var data = session.data;
      var totalQ = data.totalQuestions || 0;
      var correct = 0;

      var prog = this._getExerciseProgress(session.exerciseId);
      (data.sections || []).forEach(function(sec) {
        var sp = (prog.sections || {})[sec.id];
        if (sp && sp.answers) {
          Object.keys(sp.answers).forEach(function(k) {
            if (sp.answers[k]) correct++;
          });
        }
      });

      var score = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
      var passed = score >= (data.passingScore || 70);

      this._saveExerciseProgress(session.exerciseId, {
        passed: passed,
        bestScore: Math.max(prog.bestScore || 0, score),
        finalScore: score
      });

      session.finalScore = score;
      session.finalPassed = passed;
      session.phase = passed ? 'test_done' : 'test_failed';
      this._renderSession();
    },

    _renderTestResult: function() {
      var data = session.data;
      var passed = session.phase === 'test_done';
      var score = session.finalScore || 0;

      this._renderLayout(
        '<div class="ve-lesson ve-lesson--result">' +
          '<div class="ve-result-card ' + (passed ? 've-result-card--passed' : 've-result-card--failed') + '">' +
            '<div class="ve-result-icon">' + _mi(passed ? 'celebration' : 'sentiment_dissatisfied') + '</div>' +
            '<h2>' + (passed ? 'Well done!' : 'Keep practising!') + '</h2>' +
            '<div class="ve-result-score">' + score + '%</div>' +
            '<p class="ve-result-msg">' +
              (passed
                ? 'You passed! You need ' + (data.passingScore || 70) + '% to pass.'
                : 'You need ' + (data.passingScore || 70) + '% to pass. Try again!') +
            '</p>' +
            '<div class="ve-result-actions">' +
              '<button type="button" class="ve-btn ve-btn--secondary" onclick="VideoExercises._retryTest()">' +
                _mi('refresh') + ' Try again' +
              '</button>' +
              '<button type="button" class="ve-btn ve-btn--primary" onclick="VideoExercises.openHub()">' +
                _mi('home') + ' All exercises' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    },

    _retryTest: function() {
      if (!session) return;
      var exerciseId = session.exerciseId;
      var all = this._getProgress();
      if (all[exerciseId]) {
        all[exerciseId].sections = {};
        all[exerciseId].passed = false;
        this._saveProgress(all);
      }
      this.openExercise(exerciseId);
      this._startTest();
    },

    _popstate: function(state) {
      if (!state) return;
      if (state.view === 'videoExercises') {
        this.openHub({ fromRoute: true });
      } else if (state.view === 'videoExercise' && state.exerciseId) {
        this.openExercise(state.exerciseId, { fromRoute: true, phase: state.phase });
      }
    }
  };
})();
