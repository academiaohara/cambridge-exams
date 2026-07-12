// js/sune-play/sune-play-lesson.js
// Main Sune Play lesson flow: theory → practice nodes → sessions

(function() {
  'use strict';

  var theory = window.SunePlayTheory;
  var screens = window.SunePlayScreens;
  var queueMod = window.SunePlayQueue;
  var heartsMod = window.SunePlayHearts;
  var renderer = window.SunePlayScreenRenderer;
  var practiceUI = window.SunePlayPracticeUI;
  var screenUtils = window.SunePlayPracticeScreenUtils;
  var runnerMod = window.SunePlayPracticeSessionRunner;

  var lessonState = null;

  function esc(str) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._escapeHTML) return DashboardNav._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function resolveInstruction(text) {
    if (screenUtils && screenUtils.resolveInstruction) {
      return screenUtils.resolveInstruction(text);
    }
    if (typeof InstructionI18n !== 'undefined') {
      return InstructionI18n.resolveSync(text);
    }
    return text;
  }

  function isSunePlayUnit(data) {
    if (!data) return false;
    var unitType = data.type;
    var isLessonType = unitType === 'grammar' || unitType === 'vocabulary' ||
      unitType === 'review' || unitType === 'progress_test';
    if (!isLessonType) return false;
    var schema = String(data.schemaVersion || '');
    var style = String(data.lessonStyle || '');
    if (schema.indexOf('sune-english-unit-v2') === 0) return true;
    if (style.indexOf('sune-play') === 0) return true;
    if (data.practiceNodes && data.practiceNodes.length &&
        (data.theory || unitType === 'review' || unitType === 'progress_test')) return true;
    return false;
  }

  function isPracticeOnlyUnit(data) {
    return !!(data && data.unitStructure && data.unitStructure.mode === 'practice_only');
  }

  function getProgressKey(unitId) {
    return 'sune_play_progress_' + unitId;
  }

  function loadProgress(unitId) {
    try {
      var raw = localStorage.getItem(getProgressKey(unitId));
      return raw ? JSON.parse(raw) : { completedNodes: {}, completedExercises: {}, theoryCompleted: false };
    } catch (e) { return { completedNodes: {}, completedExercises: {}, theoryCompleted: false }; }
  }

  function saveProgress(unitId, progress) {
    try { localStorage.setItem(getProgressKey(unitId), JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }

  function syncExerciseProgressToSupabase(sectionIdx, score, total) {
    if (!lessonState || typeof DashboardNav === 'undefined' || !DashboardNav._saveSunePlayExerciseToSupabase) return;
    DashboardNav._saveSunePlayExerciseToSupabase(
      lessonState.level,
      lessonState.unitId,
      sectionIdx,
      score,
      total
    );
  }

  function areAllRequiredExercisesComplete(unitData, progress) {
    if (!unitData || !progress) return false;
    var required = (unitData.contentBanks && unitData.contentBanks.requiredExerciseIds) || [];
    if (!required.length) return false;
    var completed = progress.completedExercises || {};
    return required.every(function(exerciseId) { return !!completed[exerciseId]; });
  }

  function maybeMarkReviewUnitComplete(level, unitId, unitData, progress) {
    if (!unitData || (unitData.type !== 'review' && unitData.type !== 'progress_test')) return;
    if (!areAllRequiredExercisesComplete(unitData, progress)) return;
    if (typeof DashboardNav !== 'undefined' && DashboardNav._markCourseUnitOpened) {
      DashboardNav._markCourseUnitOpened(level, unitId);
    }
  }

  function resolveReviewStartExerciseId(unitData, progress) {
    if (!unitData || (unitData.type !== 'review' && unitData.type !== 'progress_test')) return null;
    var required = (unitData.contentBanks && unitData.contentBanks.requiredExerciseIds) || [];
    if (!required.length) {
      var exercises = (unitData.contentBanks && unitData.contentBanks.exercises) || [];
      required = exercises.map(function(ex) { return ex.id; }).filter(Boolean);
    }
    if (!required.length) return null;
    var completed = (progress && progress.completedExercises) || {};
    for (var i = 0; i < required.length; i++) {
      if (!completed[required[i]]) return required[i];
    }
    return null;
  }

  function updateProgressTestScore(progress, key, correct, total) {
    if (!progress) return;
    if (!progress.testScores) progress.testScores = {};
    progress.testScores[key] = { correct: correct, total: total };
    var agg = { correct: 0, total: 0 };
    Object.keys(progress.testScores).forEach(function(scoreKey) {
      var entry = progress.testScores[scoreKey];
      if (!entry) return;
      agg.correct += entry.correct || 0;
      agg.total += entry.total || 0;
    });
    progress.testScore = agg;
  }

  function notifyPlacementScoreUpdate(progress) {
    if (!lessonState || lessonState.unitData.type !== 'progress_test') return;
    if (typeof lessonState.onTestScoreUpdate === 'function' && progress && progress.testScore) {
      lessonState.onTestScoreUpdate(progress.testScore);
    }
    if (typeof window.Onboarding !== 'undefined' && window.Onboarding._onPlacementScoreUpdate) {
      window.Onboarding._onPlacementScoreUpdate(progress.testScore);
    }
  }

  function calcXp(unit, correct, livesLost, perfect) {
    var rules = unit.xpRules || {};
    var xp = correct * (rules.baseXpPerCorrectScreen || 10);
    xp -= livesLost * (rules.xpPenaltyPerLifeLost || 2);
    if (perfect) xp += rules.bonusXpForPerfectNode || 20;
    return Math.max(0, xp);
  }

  function applyLessonFocus() {
    var layout = document.querySelector('.dashboard-layout');
    var center = document.querySelector('.dashboard-center');
    if (layout) layout.classList.add('dashboard-layout--lesson-focus');
    if (center) center.classList.add('course-center--lesson-focus');
    var header = document.querySelector('.subpage-header--course-unit');
    if (header) header.style.display = 'none';
    var rightSidebar = document.getElementById('dashboardRightSidebar');
    if (rightSidebar) rightSidebar.style.display = 'none';
  }

  function clearLessonFocus() {
    var layout = document.querySelector('.dashboard-layout');
    var center = document.querySelector('.dashboard-center');
    if (layout) layout.classList.remove('dashboard-layout--lesson-focus');
    if (center) center.classList.remove('course-center--lesson-focus');
    var header = document.querySelector('.subpage-header--course-unit');
    if (header) header.style.display = '';
    var rightSidebar = document.getElementById('dashboardRightSidebar');
    if (rightSidebar) rightSidebar.style.display = '';
  }

  function getPracticeNodes() {
    return (lessonState.unitData.practiceNodes || []);
  }

  function getFirstIncompleteNodeId() {
    var nodes = getPracticeNodes();
    var completed = lessonState.progress.completedNodes || {};
    for (var i = 0; i < nodes.length; i++) {
      if (!completed[nodes[i].nodeId]) return nodes[i].nodeId;
    }
    return nodes.length ? nodes[0].nodeId : null;
  }

  function getNextNodeId(currentNodeId) {
    var nodes = getPracticeNodes();
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeId === currentNodeId && i < nodes.length - 1) {
        return nodes[i + 1].nodeId;
      }
    }
    return null;
  }

  function theoryRequiredAndIncomplete() {
    var structure = lessonState.unitData.unitStructure || {};
    return !!structure.theoryRequiredBeforePractice && !lessonState.progress.theoryCompleted;
  }

  function exitLesson() {
    if (!lessonState) return;
    var backFn = lessonState.backFn;
    destroy();
    if (backFn) {
      try { new Function(backFn)(); } catch (e) { console.error('Exit navigation failed:', e); }
    }
  }

  function returnToSessionFromTheory() {
    if (!lessonState || lessonState._returnPhase !== 'session' || !lessonState._savedSession) {
      return false;
    }
    var saved = lessonState._savedSession;
    lessonState._returnPhase = null;
    lessonState._savedSession = null;
    lessonState.phase = 'session';
    lessonState.queue = saved.queue;
    lessonState.hearts = saved.hearts;
    lessonState.sessionCorrect = saved.sessionCorrect;
    lessonState.sessionTotal = saved.sessionTotal;
    lessonState.activeNode = saved.activeNode;
    lessonState.currentScreen = saved.currentScreen;
    lessonState.awaitingContinue = !!saved.awaitingContinue;
    lessonState._lastFeedbackResult = saved._lastFeedbackResult || null;
    lessonState._lastResultCorrect = saved._lastResultCorrect;
    lessonState.runner = saved.runner || createLessonRunner();
    renderPhase();
    if (saved.awaitingContinue && saved._lastFeedbackResult) {
      lessonState.awaitingContinue = saved.awaitingContinue;
      lessonState._lastFeedbackResult = saved._lastFeedbackResult;
      lessonState._lastResultCorrect = saved._lastResultCorrect;
      restoreSessionFeedback();
    }
    syncLessonUrl(true);
    return true;
  }

  function restoreSessionFeedback() {
    if (!lessonState || !lessonState.runner) return;
    lessonState.runner.restoreFeedback(lessonState._lastFeedbackResult);
  }

  function closeTheory() {
    if (returnToSessionFromTheory()) return;
    exitLesson();
  }

  function showSessionExitConfirm(onLeave) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._showLearningExitConfirm) {
      DashboardNav._showLearningExitConfirm(onLeave, {
        message: 'Are you sure you want to leave? You will have to start the exercise from scratch.',
        stayLabel: 'Keep learning',
        leaveLabel: 'Leave'
      });
      return;
    }
    onLeave();
  }

  function requestSessionExit() {
    showSessionExitConfirm(function() {
      lessonState.activeNode = null;
      exitLesson();
    });
  }

  function enterPractice(nodeId, opts) {
    opts = opts || {};
    var targetNodeId = nodeId || getFirstIncompleteNodeId();
    if (!targetNodeId) {
      exitLesson();
      return;
    }
    if (!opts.skipTheoryGate && theoryRequiredAndIncomplete()) {
      lessonState.pendingNodeId = targetNodeId;
      lessonState.pendingExerciseId = opts.exerciseId || null;
      lessonState.phase = 'theory';
      renderPhase();
      return;
    }
    startPracticeSession(targetNodeId, { exerciseId: opts.exerciseId || null });
  }

  function advanceAfterNode() {
    var currentId = lessonState.activeNode && lessonState.activeNode.nodeId;
    lessonState.activeNode = null;
    var nextId = getNextNodeId(currentId);
    if (nextId) {
      enterPractice(nextId);
      return;
    }
    exitLesson();
  }

  // ─── Phase rendering ─────────────────────────────────────────────────

  function renderPhase() {
    if (!lessonState || !lessonState.mount) return;
    var s = lessonState;

    if (s.phase === 'theory') {
      var exitToStage = !!(s.theoryOnly && !s.pendingNodeId && !s._returnPhase);
      var returnToSession = s._returnPhase === 'session';
      s.mount.innerHTML = '<div class="sp-lesson sp-lesson--theory">' + theory.TheoryFlow(s.unitData, {
        cardIdx: s.theoryCardIdx,
        exitToStage: exitToStage,
        returnToSession: returnToSession
      }) + '</div>';
      bindTheoryEvents();
      var theoryBody = s.mount.querySelector('.sp-theory-card-body');
      if (theoryBody) theoryBody.scrollTop = 0;
      syncLessonUrl(true);
      return;
    }

    if (s.phase === 'session' && s.activeNode) {
      s.mount.innerHTML = '<div class="sp-lesson">' + practiceUI.PracticeSession(s.activeNode, {
        lives: s.hearts.currentLives,
        maxLives: s.hearts.maxLives,
        completed: s.sessionCorrect,
        total: s.sessionTotal,
        showReviewTheory: s.unitData.unitStructure && s.unitData.unitStructure.allowTheoryReviewFromPractice
      }) + '</div>';
      bindSessionEvents();
      renderCurrentScreen();
      return;
    }

    if (s.phase === 'complete' && s.activeNode) {
      s.mount.innerHTML = '<div class="sp-lesson">' + practiceUI.PracticeCompleteScreen(s.activeNode, s.sessionStats) + '</div>';
      bindResultEvents();
      return;
    }

    if (s.phase === 'failed' && s.activeNode) {
      s.mount.innerHTML = '<div class="sp-lesson">' + practiceUI.PracticeFailedScreen(s.activeNode) + '</div>';
      bindResultEvents();
      return;
    }

    if (s.phase === 'retry' && s.activeNode) {
      s.mount.innerHTML = '<div class="sp-lesson">' + practiceUI.RetryScreen(s.activeNode, s.sessionStats) + '</div>';
      bindResultEvents();
    }
  }

  // ─── Theory events ───────────────────────────────────────────────────

  function getTheoryCards() {
    return (lessonState.unitData.theory && lessonState.unitData.theory.cards) || [];
  }

  function completeTheoryAndContinue() {
    if (lessonState._returnPhase === 'session') {
      closeTheory();
      return;
    }
    lessonState.progress.theoryCompleted = true;
    theory.markTheoryCompleted(lessonState.unitId);
    saveProgress(lessonState.unitId, lessonState.progress);
    if (lessonState.pendingNodeId) {
      var pendingNode = lessonState.pendingNodeId;
      var pendingExercise = lessonState.pendingExerciseId || null;
      lessonState.pendingNodeId = null;
      lessonState.pendingExerciseId = null;
      startPracticeSession(pendingNode, { exerciseId: pendingExercise });
      return;
    } else if (lessonState._returnPhase) {
      lessonState.phase = lessonState._returnPhase;
      lessonState._returnPhase = null;
      renderPhase();
    } else if (lessonState.theoryOnly) {
      exitLesson();
    } else {
      enterPractice();
    }
  }

  function advanceTheoryCard() {
    var cards = getTheoryCards();
    if (lessonState.theoryCardIdx < cards.length - 1) {
      lessonState.theoryCardIdx++;
      renderPhase();
    } else if (lessonState._returnPhase === 'session') {
      closeTheory();
    } else {
      completeTheoryAndContinue();
    }
  }

  function retreatTheoryCard() {
    if (lessonState.theoryCardIdx > 0) {
      lessonState.theoryCardIdx--;
      renderPhase();
    }
  }

  function goToTheoryCard(idx) {
    var cards = getTheoryCards();
    var target = Math.max(0, Math.min(idx, cards.length - 1));
    if (target === lessonState.theoryCardIdx) return;
    lessonState.theoryCardIdx = target;
    renderPhase();
  }

  function bindTheorySwipe(el) {
    if (!el || el._spTheorySwipeBound) return;
    el._spTheorySwipeBound = true;
    var startX = 0;
    var startY = 0;
    var tracking = false;

    el.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    el.addEventListener('touchend', function(e) {
      if (!tracking) return;
      tracking = false;
      var touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) advanceTheoryCard();
      else retreatTheoryCard();
    }, { passive: true });

    el.addEventListener('touchcancel', function() {
      tracking = false;
    }, { passive: true });
  }

  function bindTheoryEvents() {
    var mount = lessonState.mount;
    if (!mount) return;

    var nextBtn = mount.querySelector('[data-action="theory-next"]');
    if (nextBtn) {
      nextBtn.addEventListener('click', advanceTheoryCard);
    }

    var prevBtn = mount.querySelector('[data-action="theory-prev"]');
    if (prevBtn) {
      prevBtn.addEventListener('click', retreatTheoryCard);
    }

    mount.querySelectorAll('[data-action="theory-goto"]').forEach(function(dot) {
      dot.addEventListener('click', function() {
        var idx = parseInt(dot.getAttribute('data-card-idx'), 10);
        if (!isNaN(idx)) goToTheoryCard(idx);
      });
    });

    var exitBtn = mount.querySelector('[data-action="theory-exit"]');
    if (exitBtn) {
      exitBtn.addEventListener('click', closeTheory);
    }

    var swipeRoot = mount.querySelector('.sp-theory-shell') || mount.querySelector('.sp-theory-flow');
    bindTheorySwipe(swipeRoot);

    mount.querySelectorAll('[data-action="theory-speak"]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var text = btn.getAttribute('data-speak-text');
        if (!text) return;
        mount.querySelectorAll('.sp-speakable--speaking').forEach(function(el) {
          el.classList.remove('sp-speakable--speaking');
        });
        btn.classList.add('sp-speakable--speaking');
        theory.speakText(text, function() {
          btn.classList.remove('sp-speakable--speaking');
        });
      });
    });
  }

  function getScreenInstruction(screen) {
    return screenUtils ? screenUtils.getScreenInstruction(screen) : '';
  }

  function getScreenContext(screen) {
    return screenUtils ? screenUtils.getScreenContext(screen) : '';
  }

  function getScreenCorrectAnswer(screen) {
    return screenUtils ? screenUtils.getScreenCorrectAnswer(screen) : '';
  }

  // ─── Session ─────────────────────────────────────────────────────────

  function createLessonRunner() {
    if (!runnerMod) return null;
    return runnerMod.create({
      getMount: function() { return lessonState.mount; },
      state: lessonState,
      globalRules: (lessonState.unitData.practiceConfig && lessonState.unitData.practiceConfig.globalRules) || {},
      feedbackTone: lessonState.unitData.feedbackTone,
      getScreenInstruction: getScreenInstruction,
      getScreenContext: getScreenContext,
      getScreenCorrectAnswer: getScreenCorrectAnswer,
      onQueueEmpty: finishSession,
      onGameOver: function() {
        lessonState.phase = 'failed';
        renderPhase();
      },
      onActionClick: function(ctx) {
        var screenRoot = ctx.screenRoot;
        var screen = ctx.screen;
        if (screen && screen.formatType === 'passage_error_hunt_counter' && screenRoot) {
          if (!ctx.awaitingContinue) {
            handleHuntCounterCheck(screenRoot, screen);
            return true;
          }
        }
        if (screen && screen.formatType === 'passage_gap_fill' &&
            screen.payload && screen.payload.sequentialGaps && screenRoot) {
          if (!ctx.awaitingContinue) {
            handlePassageGapSequentialCheck(screenRoot, screen);
            return true;
          }
        }
        if (screen && screen.formatType === 'word_bank_gap_fill' &&
            screen.payload && screen.payload.sequentialSentences && screenRoot) {
          if (!ctx.awaitingContinue) {
            handleWordBankSequentialCheck(screenRoot, screen);
            return true;
          }
        }
        if (screen && screen.formatType === 'guided_error_choice' && screenRoot && !ctx.awaitingContinue) {
          handleGuidedErrorCheck(screenRoot, screen);
          return true;
        }
        if (screen && screen.formatType === 'column_matching' &&
            screen.payload && screen.payload.sequentialMode !== false && screenRoot) {
          if (!ctx.awaitingContinue) {
            handleColumnMatchSequentialCheck(screenRoot, screen);
            return true;
          }
        }
        return false;
      },
      checkHandler: function(ctx) {
        if (ctx.screen.formatType === 'stative_sorting') {
          handleStativeSortingCheck(ctx.screenRoot, ctx.screen);
          return { handled: true };
        }
        return { handled: false };
      },
      continueHandler: function(ctx) {
        return lessonContinueHandler(ctx);
      },
      onScreenReady: function(screenRoot, screen) {
        if (screen.formatType === 'column_matching') {
          updateColumnMatchExplainBtn(screenRoot, screen);
        } else if (lessonState.runner) {
          lessonState.runner.setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
        }
      },
      onScreenRendered: function(screenRoot) {
        screenRoot.addEventListener('sp-hunt-wrong-tap', handleHuntWrongTap);
      },
      onBindSessionEvents: function(mount) {
        mount.querySelector('[data-action="exit-session"]') && mount.querySelector('[data-action="exit-session"]').addEventListener('click', requestSessionExit);
        var theoryBtn = mount.querySelector('[data-action="review-theory"]');
        if (theoryBtn) {
          theoryBtn.addEventListener('click', function() {
            lessonState._returnPhase = 'session';
            lessonState._savedSession = {
              queue: lessonState.queue,
              hearts: lessonState.hearts,
              sessionCorrect: lessonState.sessionCorrect,
              sessionTotal: lessonState.sessionTotal,
              activeNode: lessonState.activeNode,
              currentScreen: lessonState.currentScreen,
              awaitingContinue: lessonState.awaitingContinue,
              _lastFeedbackResult: lessonState._lastFeedbackResult,
              _lastResultCorrect: lessonState._lastResultCorrect,
              runner: lessonState.runner
            };
            lessonState.theoryCardIdx = 0;
            lessonState.phase = 'theory';
            renderPhase();
          });
        }
      }
    });
  }

  function startPracticeSession(nodeId, opts) {
    opts = opts || {};
    var unit = lessonState.unitData;

    var node = (unit.practiceNodes || []).find(function(n) { return n.nodeId === nodeId; });
    if (!node) return;

    var screenList;
    if (opts.exerciseId && screens.collectScreensForExercise) {
      screenList = screens.collectScreensForExercise(unit, opts.exerciseId);
      lessonState.singleExerciseId = opts.exerciseId;
    } else {
      screenList = screens.generatePracticeScreens(unit, nodeId);
      lessonState.singleExerciseId = null;
    }
    if (!screenList.length) return;
    var globalRules = (unit.practiceConfig && unit.practiceConfig.globalRules) || {};
    var sessionTotal = screenList.length;
    screenList.forEach(function(s) {
      if (s.formatType === 'passage_error_hunt_counter') {
        var hp = s.payload || {};
        sessionTotal = (hp.counter && hp.counter.target) || hp.errorCount || (hp.items && hp.items.length) || 1;
      }
      if (s.formatType === 'guided_error_choice') {
        var gp = s.payload || {};
        sessionTotal = (gp.items && gp.items.length) || 1;
      }
    });

    lessonState.activeNode = node;
    lessonState.queue = queueMod.createPracticeQueue(screenList, {
      maxFailuresBeforeFallback: globalRules.maxRepeatedFailuresBeforeFallback || 2
    });
    lessonState.hearts = heartsMod.usePracticeHearts({
      maxLives: node.lives || 5,
      onGameOver: function() {
        lessonState.phase = 'failed';
        renderPhase();
      }
    });
    lessonState.sessionCorrect = 0;
    lessonState.sessionTotal = sessionTotal;
    lessonState.sessionLivesLost = 0;
    lessonState.currentScreen = null;
    lessonState.awaitingContinue = false;
    lessonState.runner = createLessonRunner();
    lessonState.phase = 'session';
    renderPhase();
    syncLessonUrl(true);
  }

  function setActionBtn(mode, enabled) {
    if (lessonState.runner) lessonState.runner.setActionBtn(mode, enabled);
  }

  function setScreenInputsLocked(locked) {
    if (lessonState.runner) lessonState.runner.setScreenInputsLocked(locked);
  }

  function clearResultStyles() {
    if (lessonState.runner) lessonState.runner.clearResultStyles();
  }

  function renderCurrentScreen() {
    if (lessonState.runner) lessonState.runner.renderCurrentScreen();
  }

  function updateSessionHeader() {
    if (lessonState.runner) lessonState.runner.updateSessionHeader();
  }

  function bindSessionEvents() {
    if (lessonState.runner) lessonState.runner.bindSessionEvents();
  }

  function applyLifeLoss(amount, screen) {
    if (lessonState.runner) return lessonState.runner.applyLifeLoss(amount, screen);
    return 0;
  }

  function showFeedback(result) {
    if (lessonState.runner) lessonState.runner.showFeedback(result);
  }

  function handleCheck() {
    if (lessonState.runner) lessonState.runner.handleCheck();
  }

  function handleContinue() {
    if (lessonState.runner) lessonState.runner.handleContinue();
  }

  function handleActionClick() {
    if (lessonState.runner) lessonState.runner.handleActionClick();
  }

  function handleSkip() {
    if (lessonState.runner) lessonState.runner.handleSkip();
  }

  function handleExplainClick() {
    if (lessonState.runner) lessonState.runner.handleExplainClick();
  }

  function lessonContinueHandler(ctx) {
    var mount = lessonState.mount;
    if (lessonState.hearts.isGameOver) return true;

    var screen = lessonState.currentScreen;
    var screenRoot = mount.querySelector('.sp-screen');
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    var footer = mount.querySelector('#sp-practice-footer');
    var lastResult = lessonState._lastHuntResult;

    lessonState.awaitingContinue = false;
    lessonState._lastFeedbackResult = null;
    lessonState._lastResultCorrect = null;
    lessonState._lastHuntResult = null;
    if (feedbackMount) feedbackMount.innerHTML = '';
    clearResultStyles();
    if (footer) {
      footer.classList.remove(
        'sp-practice-footer--feedback',
        'sp-practice-footer--correct',
        'sp-practice-footer--incorrect',
        'sp-practice-footer--retry',
        'sp-practice-footer--explain-available'
      );
    }

    if (lastResult && lastResult._switchToFallback) {
      renderCurrentScreen();
      return true;
    }

    if (screen && screen.formatType === 'passage_gap_fill' &&
        screen.payload && screen.payload.sequentialGaps && screenRoot && lastResult &&
        lastResult._passageGapResult) {
      if (!(lastResult.correct && lastResult.allDone)) {
        renderer.advancePassageGapAfterFeedback(screenRoot, screen);
        screenRoot.classList.remove('sp-screen--locked');
        setScreenInputsLocked(false);
        setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
        updateSessionHeader();
        return true;
      }
    }

    if (screen && screen.formatType === 'word_bank_gap_fill' &&
        screen.payload && screen.payload.sequentialSentences && screenRoot && lastResult &&
        lastResult._wordBankSeqResult) {
      if (lastResult.correct && !lastResult.allDone) {
        renderer.advanceWordBankSeqAfterFeedback(screenRoot, screen);
        screenRoot.classList.remove('sp-screen--locked');
        setScreenInputsLocked(false);
        setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
        updateSessionHeader();
        return true;
      }
      if (!lastResult.correct) {
        renderer.retryWordBankSeqAfterFeedback(screenRoot, screen);
        screenRoot.classList.remove('sp-screen--locked');
        setScreenInputsLocked(false);
        setActionBtn('check', false);
        updateSessionHeader();
        return true;
      }
    }

    if (screen && screen.formatType === 'passage_error_hunt_counter' && screenRoot && lastResult) {
      if (lastResult.correct && lastResult._huntMarkResult) {
        renderer.commitHuntMarkAfterFeedback(screenRoot, screen);
        lessonState.sessionCorrect++;
        var markInstructionEl = lessonState.mount.querySelector('.sp-session-instruction');
        if (markInstructionEl) markInstructionEl.textContent = getScreenInstruction(screen);
      } else if (lastResult.correct && lastResult._huntFixResult) {
        renderer.commitHuntFixAfterFeedback(screenRoot, screen);
        if (lastResult.allDone) {
          renderCurrentScreen();
          return true;
        }
        var fixInstructionEl = lessonState.mount.querySelector('.sp-session-instruction');
        if (fixInstructionEl) fixInstructionEl.textContent = getScreenInstruction(screen);
      } else {
        renderer.resumeHuntCounterAfterFeedback(screenRoot, screen);
      }
      screenRoot.classList.remove('sp-screen--locked');
      setScreenInputsLocked(false);
      setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
      updateSessionHeader();
      return true;
    }

    if (lastResult && lastResult.allDone) {
      renderCurrentScreen();
      return true;
    }

    if (screen && screen.formatType === 'guided_error_choice' && screenRoot && lastResult && lastResult.correct && lastResult.partial) {
      screen._guidedIdx = (screen._guidedIdx || 0) + 1;
      renderCurrentScreen();
      return true;
    }

    if (screen && screen.formatType === 'guided_error_choice' && screenRoot) {
      screenRoot.classList.remove('sp-screen--locked');
      setScreenInputsLocked(false);
      setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
      return true;
    }

    renderCurrentScreen();
    return true;
  }

  function applyGapResultStyles(correct) {
    var mount = lessonState.mount;
    if (!mount) return;
    if (lessonState.currentScreen && lessonState.currentScreen.formatType === 'passage_gap_fill') {
      return;
    }
    mount.querySelectorAll('.sp-gap-slot, .sp-inline-gap-group').forEach(function(slot) {
      slot.classList.toggle('sp-gap-slot--correct', correct === true);
      slot.classList.toggle('sp-gap-slot--incorrect', correct === false);
    });
    mount.querySelectorAll('.sp-option-btn--selected').forEach(function(btn) {
      btn.classList.toggle('sp-option-btn--correct', correct === true);
      btn.classList.toggle('sp-option-btn--incorrect', correct === false);
    });
  }

  function handleHuntWrongTap() {
    if (!lessonState || lessonState.awaitingContinue || !lessonState.hearts) return;
    if (lessonState.hearts.isGameOver) return;
    var screen = lessonState.currentScreen;
    var lostAmount = applyLifeLoss(1, screen);
    if (lostAmount && window.AudioUtils) AudioUtils.playFailureSound();
    updateSessionHeader();
  }

  function updateColumnMatchExplainBtn(screenRoot, screen) {
    if (!lessonState || !lessonState.mount) return;
    lessonState._cmExplainContext = null;
    if (screen && screen.formatType === 'column_matching' && screenRoot) {
      lessonState._cmExplainContext = renderer.getColumnMatchExplainContext(screenRoot, screen);
    }
    if (!lessonState.awaitingContinue) {
      setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
    }
  }

  function handleColumnMatchSequentialCheck(screenRoot, screen) {
    var result = renderer.processColumnMatchSequentialCheck(screenRoot, screen);
    if (!result.handled) {
      handleCheck();
      return;
    }
    if (result.noop) return;

    screen._attemptsUsed = (screen._attemptsUsed || 0) + 1;

    if (result._inlineFeedback && !result.correct) {
      if (result.lifeLoss > 0) {
        applyLifeLoss(result.lifeLoss, screen);
      }
      if (window.AudioUtils) AudioUtils.playFailureSound();
      updateColumnMatchExplainBtn(screenRoot, screen);
      updateSessionHeader();
      return;
    }

    if (result.correct && result._autoAdvance) {
      if (window.AudioUtils) AudioUtils.playSuccessSound();
      updateColumnMatchExplainBtn(screenRoot, screen);
      updateSessionHeader();
      return;
    }

    if (result.correct && result.allDone) {
      screenRoot.classList.add('sp-screen--locked');
      lessonState.queue.removeCompletedItem(screen);
      lessonState.sessionCorrect++;
      showFeedback(result, true);
      updateSessionHeader();
    }
  }

  function handlePassageGapSequentialCheck(screenRoot, screen) {
    var result = renderer.processPassageGapSequentialCheck(screenRoot, screen);
    if (!result.handled) {
      handleCheck();
      return;
    }
    if (result.noop) return;

    screen._attemptsUsed = (screen._attemptsUsed || 0) + 1;

    if (result.correct && result.allDone) {
      lessonState.queue.removeCompletedItem(screen);
      lessonState.sessionCorrect++;
    } else if (!result.correct && result.lifeLoss > 0) {
      applyLifeLoss(result.lifeLoss, screen);
    }

    lessonState._lastHuntResult = result;
    screenRoot.classList.add('sp-screen--locked');
    showFeedback(result, result.correct);
    updateSessionHeader();
  }

  function handleWordBankSequentialCheck(screenRoot, screen) {
    var result = renderer.processWordBankSequentialCheck(screenRoot, screen);
    if (!result.handled) {
      handleCheck();
      return;
    }
    if (result.noop) return;

    screen._attemptsUsed = (screen._attemptsUsed || 0) + 1;

    if (result.correct && result.allDone) {
      lessonState.queue.removeCompletedItem(screen);
      lessonState.sessionCorrect++;
    } else if (!result.correct && result.lifeLoss > 0) {
      applyLifeLoss(result.lifeLoss, screen);
    }

    lessonState._lastHuntResult = result;
    screenRoot.classList.add('sp-screen--locked');
    showFeedback(result, result.correct);
    updateSessionHeader();
  }

  function handleHuntCounterCheck(screenRoot, screen) {
    renderer.processPassageHuntCounterCheck(screenRoot, screen, function(result) {
      if (!result.handled) {
        handleCheck();
        return;
      }
      if (result.noop) return;

      if (!result.correct) {
        if (result.lifeLoss > 0) {
          applyLifeLoss(result.lifeLoss, screen);
        }
        var failCount = lessonState.queue.incrementFailure(screen);
        var globalRules = (lessonState.unitData.practiceConfig && lessonState.unitData.practiceConfig.globalRules) || {};
        if (failCount >= (globalRules.maxRepeatedFailuresBeforeFallback || 2)) {
          var converted = lessonState.queue.applyFallbackIfNeeded(screen);
          if (converted._isFallback) {
            screen = converted;
            lessonState.currentScreen = converted;
            var gp = converted.payload || {};
            lessonState.sessionTotal = (gp.items && gp.items.length) || lessonState.sessionTotal;
            result._switchToFallback = true;
          }
        }
        lessonState._lastHuntResult = result;
        screenRoot.classList.add('sp-screen--locked');
        showFeedback(result, false);
        updateSessionHeader();
        return;
      }

      if (result._huntMarkResult || result._huntFixResult) {
        lessonState._lastHuntResult = result;
        screenRoot.classList.add('sp-screen--locked');
        if (result.allDone) {
          lessonState.queue.removeCompletedItem(screen);
        }
        showFeedback(result, true);
        updateSessionHeader();
        return;
      }
    });
  }

  function handleGuidedErrorCheck(screenRoot, screen) {
    var result = renderer.checkScreen(screenRoot, screen);
    screen._attemptsUsed = (screen._attemptsUsed || 0) + 1;

    if (!result.correct && result.lifeLoss > 0) {
      applyLifeLoss(result.lifeLoss, screen);
    }

    if (result.correct) {
      lessonState.sessionCorrect++;
      lessonState._lastHuntResult = result;
      screenRoot.classList.add('sp-screen--locked');
      if (result.allDone) {
        lessonState.queue.removeCompletedItem(screen);
      }
      showFeedback(result, true);
    } else {
      lessonState._lastHuntResult = result;
      var failCount = lessonState.queue.incrementFailure(screen);
      var globalRules = (lessonState.unitData.practiceConfig && lessonState.unitData.practiceConfig.globalRules) || {};
      if (globalRules.failedItemsReturnToQueue !== false) {
        lessonState.queue.returnFailedItemToQueue(screen);
      }
      if (failCount >= (globalRules.maxRepeatedFailuresBeforeFallback || 2)) {
        var converted = lessonState.queue.applyFallbackIfNeeded(screen);
        if (converted._isFallback) {
          lessonState.queue.returnFailedItemToQueue(converted, 'front');
          screen = converted;
          lessonState.currentScreen = converted;
          var guidedPayload = converted.payload || {};
          lessonState.sessionTotal = (guidedPayload.items && guidedPayload.items.length) || lessonState.sessionTotal;
          result._switchToFallback = true;
        }
      }
      screenRoot.classList.add('sp-screen--locked');
      showFeedback(result, false);
    }

    updateSessionHeader();
  }

  function handleStativeSortingCheck(screenRoot, screen) {
    renderer.processStativeSortingCheck(screenRoot, screen, function(result) {
      screen._attemptsUsed = (screen._attemptsUsed || 0) + 1;

      if (!result.correct && result.lifeLoss > 0) {
        applyLifeLoss(result.lifeLoss, screen);
      }

      if (result.correct) {
        screenRoot.classList.add('sp-screen--locked');
        lessonState.queue.removeCompletedItem(screen);
        lessonState.sessionCorrect++;
        showFeedback(result, true);
      } else {
        if (window.AudioUtils) {
          if (result.wrongCount > 0) AudioUtils.playFailureSound();
          else if (result.roundCorrect > 0) AudioUtils.playSuccessSound();
        }
        setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
      }

      updateSessionHeader();
    });
  }

  function finishSession() {
    var node = lessonState.activeNode;
    var pass = node.passCondition || {};
    var minCorrect = pass.minimumCorrectScreens || 0;
    var correct = lessonState.sessionCorrect;
    if (lessonState.singleExerciseId) {
      minCorrect = Math.max(1, Math.ceil(lessonState.sessionTotal * 0.7));
    }
    var passed = correct >= minCorrect && (!lessonState.hearts.isGameOver || pass.allowFinishWithZeroLives);

    var perfect = lessonState.hearts.mistakesCount === 0;
    var xp = calcXp(lessonState.unitData, correct, lessonState.sessionLivesLost, perfect);

    lessonState.sessionStats = {
      correct: correct,
      required: minCorrect,
      livesLeft: lessonState.hearts.currentLives,
      xp: xp,
      passed: passed
    };

    if (lessonState.hearts.isGameOver) {
      lessonState.phase = 'failed';
    } else     if (passed) {
      if (lessonState.singleExerciseId) {
        if (!lessonState.progress.completedExercises) lessonState.progress.completedExercises = {};
        lessonState.progress.completedExercises[lessonState.singleExerciseId] = true;
        if (lessonState.unitData.type === 'progress_test') {
          updateProgressTestScore(
            lessonState.progress,
            lessonState.singleExerciseId,
            correct,
            lessonState.sessionTotal
          );
        }
        saveProgress(lessonState.unitId, lessonState.progress);
        notifyPlacementScoreUpdate(lessonState.progress);
        syncExerciseProgressToSupabase(
          'exercise:' + lessonState.singleExerciseId,
          correct,
          lessonState.sessionTotal
        );
      } else {
        lessonState.progress.completedNodes[node.nodeId] = true;
        if (lessonState.unitData.type === 'progress_test') {
          updateProgressTestScore(
            lessonState.progress,
            node.nodeId,
            correct,
            lessonState.sessionTotal
          );
        }
        saveProgress(lessonState.unitId, lessonState.progress);
        notifyPlacementScoreUpdate(lessonState.progress);
        syncExerciseProgressToSupabase(
          'node:' + node.nodeId,
          correct,
          lessonState.sessionTotal
        );
      }
      maybeMarkReviewUnitComplete(lessonState.level, lessonState.unitId, lessonState.unitData, lessonState.progress);
      lessonState.phase = 'complete';
    } else {
      lessonState.phase = 'retry';
    }
    renderPhase();
  }

  function returnToStage() {
    lessonState.activeNode = null;
    exitLesson();
  }

  function bindResultEvents() {
    var mount = lessonState.mount;
    var retry = mount.querySelector('[data-action="retry-node"]');
    if (retry) {
      retry.addEventListener('click', function() {
        startPracticeSession(lessonState.activeNode.nodeId, {
          exerciseId: lessonState.singleExerciseId || null
        });
      });
    }
    var backStage = mount.querySelector('[data-action="back-to-stage"]');
    if (backStage) {
      backStage.addEventListener('click', returnToStage);
    }
    var back = mount.querySelector('[data-action="back-to-nodes"]');
    if (back) {
      back.addEventListener('click', returnToStage);
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────

  function syncLessonUrl(replace) {
    if (!lessonState || typeof Router === 'undefined' || typeof DashboardNav === 'undefined') return;
    if (!DashboardNav._syncCourseUnitUrl || !DashboardNav._currentUnitId || !DashboardNav._currentBlockKey) return;

    var sectionIdx;
    if (lessonState.phase === 'theory') {
      sectionIdx = 'theory:' + (lessonState.theoryCardIdx || 0);
    } else if (lessonState.phase === 'session' && lessonState.singleExerciseId) {
      sectionIdx = 'exercise:' + lessonState.singleExerciseId;
    } else if (lessonState.phase === 'session' && lessonState.activeNode) {
      sectionIdx = 'node:' + lessonState.activeNode.nodeId;
    } else if (lessonState.activeNode) {
      sectionIdx = lessonState.singleExerciseId
        ? ('exercise:' + lessonState.singleExerciseId)
        : ('node:' + lessonState.activeNode.nodeId);
    } else {
      sectionIdx = lessonState.theoryCardIdx || 0;
    }

    DashboardNav._syncCourseUnitUrl(sectionIdx, replace !== false);
  }

  function init(opts) {
    opts = opts || {};
    var unitData = opts.unitData;
    var unitId = opts.unitId;
    var mount = opts.mount;
    if (!unitData || !mount) return;

    applyLessonFocus();

    var progress = loadProgress(unitId);
    if (theory.isTheoryCompleted(unitId)) progress.theoryCompleted = true;

    lessonState = {
      unitId: unitId,
      unitData: unitData,
      mount: mount,
      backFn: opts.backFn,
      level: opts.level,
      progress: progress,
      phase: 'theory',
      theoryCardIdx: 0,
      theoryOnly: opts.startSection === 'theory',
      pendingNodeId: opts.startNodeId || null,
      pendingExerciseId: opts.startExerciseId || null,
      onTestScoreUpdate: opts.onTestScoreUpdate || null
    };

    if (!opts.startExerciseId && (unitData.type === 'review' || unitData.type === 'progress_test')) {
      var resolvedExerciseId = resolveReviewStartExerciseId(unitData, progress);
      if (resolvedExerciseId) {
        opts.startExerciseId = resolvedExerciseId;
        lessonState.pendingExerciseId = resolvedExerciseId;
        if (!opts.startNodeId && typeof DashboardNav !== 'undefined' && DashboardNav._resolveSunePlayNodeForExercise) {
          opts.startNodeId = DashboardNav._resolveSunePlayNodeForExercise(unitData, resolvedExerciseId);
        }
      }
    }

    if (opts.startSection === 'theory') {
      lessonState.phase = 'theory';
      lessonState.theoryCardIdx = opts.theoryCardIdx || 0;
      renderPhase();
      syncLessonUrl(true);
      return;
    }

    if (opts.startSection === 'session' && opts.startNodeId) {
      enterPractice(opts.startNodeId, {
        skipTheoryGate: true,
        exerciseId: opts.startExerciseId || null
      });
      return;
    }

    if (isPracticeOnlyUnit(unitData) || opts.startSection === 'exercises') {
      enterPractice(opts.startNodeId || null, {
        skipTheoryGate: true,
        exerciseId: opts.startExerciseId || null
      });
      return;
    }

    enterPractice();
  }

  function destroy() {
    clearLessonFocus();
    lessonState = null;
  }

  window.SunePlayLesson = {
    init: init,
    destroy: destroy,
    isSunePlayUnit: isSunePlayUnit,
    generatePracticeScreens: screens.generatePracticeScreens
  };

  window.generatePracticeScreens = screens.generatePracticeScreens;
  window.normalizeAnswer = window.SunePlayNormalize.normalizeAnswer;
  window.usePracticeHearts = heartsMod.usePracticeHearts;
})();
