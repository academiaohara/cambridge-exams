// js/fast-exercises-vocab-session.js
// SunePlay-style practice shell for course vocabulary exercises (PV, idioms, word formation)

(function() {
  'use strict';

  var practiceUI = window.SunePlayPracticeUI;
  var heartsMod = window.SunePlayHearts;
  var queueMod = window.SunePlayQueue;
  var runnerMod = window.SunePlayPracticeSessionRunner;
  var adapter = window.SunePlayVocabExerciseAdapter;
  var screenUtils = window.SunePlayPracticeScreenUtils;

  function mi(name) {
    return '<span class="material-symbols-outlined">' + name + '</span>';
  }

  function getMount() {
    return document.getElementById('feVocabSpMount');
  }

  function getScreenMount() {
    var root = getMount();
    return root ? root.querySelector('#sp-screen-mount') : null;
  }

  function getSessionRoot() {
    return getMount() ? getMount().querySelector('.sp-practice-session') : null;
  }

  function bindEvents(fe) {
    var root = getMount();
    if (!root || root._feVocabBound) return;
    root._feVocabBound = true;

    var exitBtn = root.querySelector('[data-action="exit-session"]');
    if (exitBtn) {
      exitBtn.addEventListener('click', function() {
        var s = window._feVocabSession;
        if (!s) return;
        if (typeof DashboardNav !== 'undefined' && DashboardNav._showLearningExitConfirm) {
          DashboardNav._showLearningExitConfirm(function() {
            fe.openCategory(s.categoryId);
          });
        } else {
          fe.openCategory(s.categoryId);
        }
      });
    }
  }

  function buildShellHtml(opts) {
    opts = opts || {};
    var node = { nodeId: 'vocab-' + (opts.categoryId || 'practice'), title: opts.lessonTitle || '' };
    if (!practiceUI) return '<div id="sp-screen-mount"></div>';
    return '<div class="sp-lesson fe-vocab-sp-lesson"><div class="sp-lesson-mount fe-vocab-sp-mount" id="feVocabSpMount">' +
      practiceUI.PracticeSession(node, {
        completed: opts.completed || 0,
        total: opts.total || 1,
        lives: opts.lives || 5,
        maxLives: opts.maxLives || 5
      }) +
    '</div></div>';
  }

  function ensureSession(fe, container, opts) {
    opts = opts || {};
    if (!practiceUI || !heartsMod) return null;

    var total = opts.sessionTotal || 1;
    var completed = opts.sessionCorrect || 0;

    container.innerHTML = buildShellHtml({
      categoryId: opts.categoryId,
      lessonTitle: opts.lessonTitle,
      completed: completed,
      total: total,
      lives: 5,
      maxLives: 5
    });

    var hearts = heartsMod.usePracticeHearts({
      maxLives: 5,
      onGameOver: function() {
        var s = window._feVocabSession;
        if (!s) return;
        var screenMount = getScreenMount();
        if (screenMount) {
          screenMount.innerHTML =
            '<div class="sp-result-screen sp-result-screen--failed">' +
              '<div class="sp-result-icon sp-result-icon--failed">' + mi('heart_broken') + '</div>' +
              '<h2 class="sp-result-title">Out of lives</h2>' +
              '<p class="sp-result-subtitle">You ran out of hearts. Try again or go back to the map.</p>' +
              '<button type="button" class="sp-btn sp-btn--primary sp-btn--labeled" id="fe-vocab-retry-btn">' +
                '<span class="material-symbols-outlined">refresh</span><span class="sp-btn-label">Try again</span>' +
              '</button>' +
              '<button type="button" class="sp-btn sp-btn--ghost sp-btn--labeled" id="fe-vocab-back-btn" style="margin-top:8px">' +
                '<span class="material-symbols-outlined">arrow_back</span><span class="sp-btn-label">Back to map</span>' +
              '</button>' +
            '</div>';
          var retryBtn = document.getElementById('fe-vocab-retry-btn');
          var backBtn = document.getElementById('fe-vocab-back-btn');
          if (retryBtn) retryBtn.addEventListener('click', function() {
            if (s.onRetry) s.onRetry();
          });
          if (backBtn) backBtn.addEventListener('click', function() {
            fe.openCategory(s.categoryId);
          });
        }
        if (s.runner) s.runner.setActionBtn('check', false);
        var actionBtn = getMount() && getMount().querySelector('#sp-action-btn');
        if (actionBtn) actionBtn.hidden = true;
      }
    });

    window._feVocabSession = {
      categoryId: opts.categoryId,
      catMeta: opts.catMeta,
      levelId: opts.levelId,
      lessonId: opts.lessonId,
      pointIndex: opts.pointIndex,
      lessonPoints: opts.lessonPoints,
      lessonTitle: opts.lessonTitle,
      pointLabel: opts.pointLabel,
      passive: !!opts.passive,
      sessionCorrect: completed,
      sessionTotal: total,
      hearts: hearts,
      queue: null,
      currentScreen: null,
      awaitingContinue: false,
      sessionLivesLost: 0,
      runner: null,
      onRetry: null
    };

    bindEvents(fe);

    if (opts.passive) {
      var skipBtn = getMount() && getMount().querySelector('#sp-skip-btn');
      if (skipBtn) skipBtn.hidden = true;
      var actionBtn = getMount() && getMount().querySelector('#sp-action-btn');
      if (actionBtn) {
        actionBtn.dataset.mode = 'continue';
        actionBtn.disabled = false;
        actionBtn.hidden = false;
        var icon = actionBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'arrow_forward';
        actionBtn.classList.add('sp-btn--continue-mode');
        actionBtn.setAttribute('aria-label', 'Continue');
      }
    }

    return getScreenMount();
  }

  function startQuizSession(fe, exercises, opts) {
    if (!adapter || !runnerMod || !queueMod || !exercises || !exercises.length) return false;

    var s = window._feVocabSession;
    if (!s) return false;

    var sessionId = opts.categoryId + '-' + opts.levelId + '-' + opts.lessonId + '-p' + opts.pointIndex;
    var adapterContext = {
      sessionId: sessionId,
      categoryId: opts.categoryId,
      levelId: opts.levelId,
      lessonId: opts.lessonId,
      pointIndex: opts.pointIndex,
      instruction: opts.instruction || ''
    };
    var screens = adapter.exercisesToScreens(exercises, adapterContext);
    if (!screens.length) return false;

    var practiceConfig = adapter.buildPracticeConfig();
    s.exercises = exercises;
    s.queue = queueMod.createPracticeQueue(screens, {
      maxFailuresBeforeFallback: practiceConfig.globalRules.maxRepeatedFailuresBeforeFallback || 2
    });
    s.sessionCorrect = 0;
    s.sessionTotal = screens.length;

    function finishQuiz() {
      fe._markPointComplete(opts.categoryId, opts.levelId, opts.lessonId, opts.pointIndex);
      var screenMount = getScreenMount();
      if (screenMount) {
        screenMount.innerHTML =
          '<div class="sp-result-screen sp-result-screen--complete">' +
            '<div class="sp-result-icon sp-result-icon--success"><span class="material-symbols-outlined">celebration</span></div>' +
            '<h2 class="sp-result-title">Point complete!</h2>' +
            '<p class="sp-result-subtitle">' + (s.sessionCorrect || 0) + '/' + exercises.length + ' correct</p>' +
          '</div>';
      }
      if (s.runner) {
        s.runner.setActionBtn('continue', true);
        var actionBtn = getMount() && getMount().querySelector('#sp-action-btn');
        if (actionBtn) {
          actionBtn.onclick = function() {
            fe._nextPoint(opts.categoryId, opts.levelId, opts.lessonId, opts.pointIndex);
          };
        }
      }
      if (typeof StreakManager !== 'undefined') StreakManager.recordActivity();
    }

    s.runner = runnerMod.create({
      getMount: getMount,
      state: s,
      globalRules: practiceConfig.globalRules,
      feedbackTone: 'practice',
      allowSkip: true,
      getScreenInstruction: screenUtils && screenUtils.getScreenInstruction,
      getScreenContext: screenUtils && screenUtils.getScreenContext,
      getScreenCorrectAnswer: screenUtils && screenUtils.getScreenCorrectAnswer,
      onQueueEmpty: function() {
        finishQuiz();
      },
      onGameOver: function() {
        if (s.hearts && s.hearts.onGameOver) s.hearts.onGameOver();
      },
      onSkip: function(ctx) {
        var state = ctx.state;
        var screen = state.currentScreen;
        if (screen) state.queue.removeCompletedItem(screen);
        ctx.renderCurrentScreen();
      }
    });

    s.onRetry = function() {
      if (s.hearts) s.hearts.resetLives(5);
      s.queue = queueMod.createPracticeQueue(screens, {
        maxFailuresBeforeFallback: practiceConfig.globalRules.maxRepeatedFailuresBeforeFallback || 2
      });
      s.sessionCorrect = 0;
      s.runner.start(screens, {
        maxLives: 5,
        sessionTotal: screens.length,
        sessionCorrect: 0
      });
      var actionBtn = getMount() && getMount().querySelector('#sp-action-btn');
      if (actionBtn) actionBtn.hidden = false;
    };

    s.runner.start(screens, {
      maxLives: 5,
      sessionTotal: screens.length,
      sessionCorrect: 0
    });

    return true;
  }

  function destroy() {
    var s = window._feVocabSession;
    if (s && s.runner) s.runner.destroy();
    window._feVocabSession = null;
    var mount = getMount();
    if (mount) mount._feVocabBound = false;
  }

  window.FastExercisesVocabSession = {
    ensureSession: ensureSession,
    startQuizSession: startQuizSession,
    destroy: destroy,
    getScreenMount: getScreenMount,
    getSessionRoot: getSessionRoot,
    setPassiveContinue: function(onContinue) {
      var s = window._feVocabSession;
      if (!s || !s.runner) return;
      s.passive = true;
      s.runner.setActionBtn('continue', true);
      var skipBtn = getMount() && getMount().querySelector('#sp-skip-btn');
      if (skipBtn) skipBtn.hidden = true;
      s._passiveContinue = onContinue;
      var actionBtn = getMount() && getMount().querySelector('#sp-action-btn');
      if (actionBtn) {
        actionBtn.onclick = function() {
          if (onContinue) onContinue();
        };
      }
    }
  };
})();
