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

  var lessonState = null;

  function esc(str) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._escapeHTML) return BentoGrid._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isSunePlayUnit(data) {
    return data && data.type === 'grammar' && (
      data.schemaVersion === 'sune-english-unit-v2' ||
      data.lessonStyle === 'sune-play'
    );
  }

  function getProgressKey(unitId) {
    return 'sune_play_progress_' + unitId;
  }

  function loadProgress(unitId) {
    try {
      var raw = localStorage.getItem(getProgressKey(unitId));
      return raw ? JSON.parse(raw) : { completedNodes: {}, theoryCompleted: false };
    } catch (e) { return { completedNodes: {}, theoryCompleted: false }; }
  }

  function saveProgress(unitId, progress) {
    try { localStorage.setItem(getProgressKey(unitId), JSON.stringify(progress)); } catch (e) { /* ignore */ }
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

  // ─── Phase rendering ─────────────────────────────────────────────────

  function renderPhase() {
    if (!lessonState || !lessonState.mount) return;
    var s = lessonState;

    if (s.phase === 'theory') {
      s.mount.innerHTML = '<div class="sp-lesson">' + theory.TheoryFlow(s.unitData, { cardIdx: s.theoryCardIdx }) + '</div>';
      bindTheoryEvents();
      return;
    }

    if (s.phase === 'nodes') {
      s.mount.innerHTML = '<div class="sp-lesson">' + practiceUI.PracticeNodeList(s.unitData, {
        theoryCompleted: s.progress.theoryCompleted,
        completedNodes: s.progress.completedNodes,
        showReviewTheory: s.unitData.unitStructure && s.unitData.unitStructure.allowTheoryReviewFromPractice
      }) + '</div>';
      bindNodeListEvents();
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

  function bindTheoryEvents() {
    var btn = lessonState.mount.querySelector('[data-action="theory-next"]');
    if (!btn) return;
    btn.addEventListener('click', function() {
      var cards = (lessonState.unitData.theory && lessonState.unitData.theory.cards) || [];
      if (lessonState.theoryCardIdx < cards.length - 1) {
        lessonState.theoryCardIdx++;
        renderPhase();
      } else {
        lessonState.progress.theoryCompleted = true;
        theory.markTheoryCompleted(lessonState.unitId);
        saveProgress(lessonState.unitId, lessonState.progress);
        if (lessonState._returnPhase === 'session' && lessonState._savedSession) {
          Object.assign(lessonState, lessonState._savedSession);
          lessonState._returnPhase = null;
          lessonState._savedSession = null;
          lessonState.phase = 'session';
        } else if (lessonState.pendingNodeId) {
          var pendingNode = lessonState.pendingNodeId;
          lessonState.pendingNodeId = null;
          lessonState.phase = 'nodes';
          renderPhase();
          startPracticeSession(pendingNode);
          return;
        } else {
          lessonState.phase = lessonState._returnPhase || 'nodes';
          lessonState._returnPhase = null;
        }
        renderPhase();
      }
    });
  }

  // ─── Node list events ────────────────────────────────────────────────

  function bindNodeListEvents() {
    var mount = lessonState.mount;
    mount.querySelectorAll('[data-node-id]').forEach(function(btn) {
      if (btn.disabled) return;
      btn.addEventListener('click', function() {
        var nodeId = btn.getAttribute('data-node-id');
        startPracticeSession(nodeId);
      });
    });
    var reviewBtn = mount.querySelector('[data-action="review-theory"]');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', function() {
        lessonState.theoryCardIdx = 0;
        lessonState.phase = 'theory';
        lessonState._returnPhase = 'nodes';
        renderPhase();
      });
    }
  }

  // ─── Session ─────────────────────────────────────────────────────────

  function startPracticeSession(nodeId) {
    var unit = lessonState.unitData;

    var node = (unit.practiceNodes || []).find(function(n) { return n.nodeId === nodeId; });
    if (!node) return;

    var screenList = screens.generatePracticeScreens(unit, nodeId);
    var globalRules = (unit.practiceConfig && unit.practiceConfig.globalRules) || {};

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
    lessonState.sessionTotal = screenList.length;
    lessonState.sessionLivesLost = 0;
    lessonState.currentScreen = null;
    lessonState.awaitingContinue = false;
    lessonState.phase = 'session';
    renderPhase();
  }

  function setActionBtn(mode, enabled) {
    var actionBtn = lessonState.mount.querySelector('#sp-action-btn');
    var skipBtn = lessonState.mount.querySelector('#sp-skip-btn');
    var explainBtn = lessonState.mount.querySelector('#sp-explain-btn');
    var footer = lessonState.mount.querySelector('#sp-practice-footer');
    if (!actionBtn) return;
    actionBtn.dataset.mode = mode;
    actionBtn.disabled = !enabled;
    actionBtn.hidden = false;
    var icon = actionBtn.querySelector('.material-symbols-outlined');
    var labels = { check: 'Comprobar', continue: 'Continuar', retry: 'Reintentar' };
    actionBtn.setAttribute('aria-label', labels[mode] || 'Acción');
    if (icon) {
      icon.textContent = mode === 'check' ? 'check' : mode === 'retry' ? 'refresh' : 'arrow_forward';
    }
    actionBtn.classList.toggle('sp-btn--continue-mode', mode === 'continue');
    actionBtn.classList.toggle('sp-btn--correct', mode === 'continue' && lessonState._lastResultCorrect);
    actionBtn.classList.toggle('sp-btn--incorrect', mode === 'continue' && lessonState._lastResultCorrect === false);
    actionBtn.classList.toggle('sp-btn--retry-mode', mode === 'retry');

    if (skipBtn) {
      skipBtn.hidden = mode !== 'check';
      skipBtn.disabled = lessonState.hearts && lessonState.hearts.isGameOver;
    }
    if (explainBtn) {
      var hasExplanation = lessonState._lastFeedbackResult && lessonState._lastFeedbackResult.explanation;
      explainBtn.hidden = mode === 'check' || !hasExplanation;
    }
    if (footer) {
      footer.classList.toggle('sp-practice-footer--feedback', mode === 'continue' || mode === 'retry');
      footer.classList.toggle('sp-practice-footer--correct', mode === 'continue' && lessonState._lastResultCorrect);
      footer.classList.toggle('sp-practice-footer--incorrect', mode === 'continue' && lessonState._lastResultCorrect === false);
      footer.classList.toggle('sp-practice-footer--retry', mode === 'retry');
    }
  }

  function renderCurrentScreen() {
    var mount = lessonState.mount;
    var screenMount = mount.querySelector('#sp-screen-mount');
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    if (!screenMount) return;

    feedbackMount.innerHTML = '';
    lessonState.awaitingContinue = false;
    lessonState._lastFeedbackResult = null;
    lessonState._lastResultCorrect = null;

    var footer = mount.querySelector('#sp-practice-footer');
    if (footer) {
      footer.classList.remove(
        'sp-practice-footer--feedback',
        'sp-practice-footer--correct',
        'sp-practice-footer--incorrect',
        'sp-practice-footer--retry'
      );
    }

    var screen = lessonState.queue.currentScreen;
    if (!screen) {
      finishSession();
      return;
    }

    screen = lessonState.queue.applyFallbackIfNeeded(screen);
    lessonState.currentScreen = screen;

    screenMount.innerHTML = renderer.PracticeScreenRenderer(screen);
    var screenRoot = screenMount.querySelector('.sp-screen');
    if (screenRoot) {
      screenRoot._spScreen = screen;
      renderer.bindScreen(screenRoot, screen, function() {
        if (!lessonState.awaitingContinue) {
          setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
        }
      });
    }
    setActionBtn('check', false);
    updateSessionHeader();
  }

  function updateSessionHeader() {
    var mount = lessonState.mount;
    if (!mount) return;
    var header = mount.querySelector('.sp-practice-header');
    if (!header) return;
    var progressEl = header.querySelector('.sp-session-progress');
    if (progressEl) {
      progressEl.outerHTML = practiceUI.SessionProgressBar(lessonState.sessionCorrect, lessonState.sessionTotal);
    }
    var heartsEl = header.querySelector('.sp-hearts-bar');
    if (heartsEl && lessonState.hearts) {
      heartsEl.outerHTML = practiceUI.HeartsBar(lessonState.hearts.currentLives, lessonState.hearts.maxLives);
    }
  }

  function bindSessionEvents() {
    var mount = lessonState.mount;
    var actionBtn = mount.querySelector('#sp-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', handleActionClick);
    }
    var skipBtn = mount.querySelector('#sp-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', handleSkip);
    }
    var explainBtn = mount.querySelector('#sp-explain-btn');
    if (explainBtn) {
      explainBtn.addEventListener('click', handleExplainClick);
    }
    mount.querySelector('[data-action="exit-session"]') && mount.querySelector('[data-action="exit-session"]').addEventListener('click', function() {
      lessonState.phase = 'nodes';
      lessonState.activeNode = null;
      renderPhase();
    });
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
          currentScreen: lessonState.currentScreen
        };
        lessonState.theoryCardIdx = 0;
        lessonState.phase = 'theory';
        renderPhase();
      });
    }
  }

  function getScreenCorrectAnswer(screen) {
    var p = (screen && screen.payload) || {};
    if (p.answer) return p.answer;
    if (p.acceptedAnswers && p.acceptedAnswers.length) return p.acceptedAnswers[0];
    return '';
  }

  function handleSkip() {
    if (!lessonState || lessonState.awaitingContinue) return;
    if (lessonState.hearts.isGameOver) return;
    var screen = lessonState.currentScreen;
    var screenRoot = lessonState.mount.querySelector('.sp-screen');
    if (!screen || !screenRoot) return;

    var p = screen.payload || {};
    var result = {
      correct: false,
      explanation: p.explanation || '',
      correctAnswer: getScreenCorrectAnswer(screen),
      userAnswer: '',
      lifeLoss: 1
    };

    screen._attemptsUsed = (screen.attemptsPerScreen || 1);
    screenRoot.classList.add('sp-screen--locked');

    var lost = lessonState.hearts.loseLife(1, {
      screenId: screen.screenId,
      itemId: screen.itemId,
      maxLifeLossPerScreen: screen.maxLifeLossPerScreen
    });
    if (lost) lessonState.sessionLivesLost += 1;

    lessonState.queue.incrementFailure(screen);
    var globalRules = (lessonState.unitData.practiceConfig && lessonState.unitData.practiceConfig.globalRules) || {};
    if (globalRules.failedItemsReturnToQueue !== false) {
      lessonState.queue.returnFailedItemToQueue(screen);
    } else {
      lessonState.queue.removeCompletedItem(screen);
    }

    showFeedback(result, false);
    updateSessionHeader();
  }

  function handleExplainClick() {
    var result = lessonState._lastFeedbackResult;
    if (!result || !result.explanation || typeof LessonExplanation === 'undefined') return;
    LessonExplanation.open({
      title: 'Explicación',
      explanation: result.explanation,
      correctAnswer: result.correct ? '' : (result.correctAnswer || ''),
      continueLabel: 'Cerrar',
      compact: true
    });
  }

  function handleActionClick() {
    var actionBtn = lessonState.mount.querySelector('#sp-action-btn');
    if (!actionBtn || actionBtn.disabled) return;
    if (lessonState.awaitingContinue) {
      handleContinue();
      return;
    }
    handleCheck();
  }

  function handleContinue() {
    var mount = lessonState.mount;
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    if (lessonState._isRetryContinue) {
      feedbackMount.innerHTML = '';
      lessonState.awaitingContinue = false;
      lessonState._isRetryContinue = false;
      var screenRoot = mount.querySelector('.sp-screen');
      if (screenRoot) screenRoot.classList.remove('sp-screen--locked');
      setActionBtn('check', false);
      return;
    }
    if (lessonState.hearts.isGameOver) return;
    renderCurrentScreen();
  }

  function handleCheck() {
    var mount = lessonState.mount;
    var screenRoot = mount.querySelector('.sp-screen');
    var screen = lessonState.currentScreen;
    if (!screenRoot || !screen) return;

    var result = renderer.checkScreen(screenRoot, screen);
    screen._attemptsUsed = (screen._attemptsUsed || 0) + 1;

    if (result.partial && result._advanceStep === 'type_form') {
      screen.payload.step = 'type_form';
      screen.payload.selectedVerb = result._selectedVerb;
      renderCurrentScreen();
      return;
    }

    var maxAttempts = screen.attemptsPerScreen || 1;
    var canRetry = !result.correct && screen._attemptsUsed < maxAttempts;

    if (!result.correct && result.lifeLoss > 0) {
      var lost = lessonState.hearts.loseLife(result.lifeLoss, {
        screenId: screen.screenId,
        itemId: screen.itemId,
        maxLifeLossPerScreen: screen.maxLifeLossPerScreen
      });
      if (lost) lessonState.sessionLivesLost += result.lifeLoss;
    }

    if (result.correct) {
      screenRoot.classList.add('sp-screen--locked');
      lessonState.queue.removeCompletedItem(screen);
      lessonState.sessionCorrect++;
      showFeedback(result, true);
    } else if (canRetry) {
      showFeedback(result, false, true);
    } else {
      screenRoot.classList.add('sp-screen--locked');
      var failCount = lessonState.queue.incrementFailure(screen);
      var globalRules = (lessonState.unitData.practiceConfig && lessonState.unitData.practiceConfig.globalRules) || {};
      if (result.shouldRequeue || globalRules.failedItemsReturnToQueue) {
        lessonState.queue.returnFailedItemToQueue(screen);
      } else {
        lessonState.queue.removeCompletedItem(screen);
      }
      if (failCount >= (globalRules.maxRepeatedFailuresBeforeFallback || 2)) {
        screen = lessonState.queue.applyFallbackIfNeeded(screen);
        if (screen._isFallback) lessonState.queue.returnFailedItemToQueue(screen, 'front');
      }
      showFeedback(result, false);
    }

    updateSessionHeader();
  }

  function showFeedback(result, advanceOnContinue, isRetry) {
    var mount = lessonState.mount;
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    var tone = lessonState.unitData.feedbackTone;
    feedbackMount.innerHTML = renderer.FeedbackSheet(result, tone);
    lessonState.awaitingContinue = true;
    lessonState._lastFeedbackResult = result;
    lessonState._lastResultCorrect = result.correct;
    lessonState._isRetryContinue = !!isRetry;

    setActionBtn(isRetry ? 'retry' : 'continue', true);
  }

  function finishSession() {
    var node = lessonState.activeNode;
    var pass = node.passCondition || {};
    var minCorrect = pass.minimumCorrectScreens || 0;
    var correct = lessonState.sessionCorrect;
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
    } else if (passed) {
      lessonState.progress.completedNodes[node.nodeId] = true;
      saveProgress(lessonState.unitId, lessonState.progress);
      lessonState.phase = 'complete';
    } else {
      lessonState.phase = 'retry';
    }
    renderPhase();
  }

  function bindResultEvents() {
    var mount = lessonState.mount;
    var retry = mount.querySelector('[data-action="retry-node"]');
    if (retry) {
      retry.addEventListener('click', function() {
        startPracticeSession(lessonState.activeNode.nodeId);
      });
    }
    var back = mount.querySelector('[data-action="back-to-nodes"]');
    if (back) {
      back.addEventListener('click', function() {
        lessonState.phase = 'nodes';
        lessonState.activeNode = null;
        renderPhase();
      });
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────

  function init(opts) {
    opts = opts || {};
    var unitData = opts.unitData;
    var unitId = opts.unitId;
    var mount = opts.mount;
    if (!unitData || !mount) return;

    applyLessonFocus();

    var progress = loadProgress(unitId);
    if (theory.isTheoryCompleted(unitId)) progress.theoryCompleted = true;

    var startPhase = 'nodes';
    if (opts.startSection === 'session' && opts.startNodeId) {
      startPhase = 'session';
    } else if (opts.startSection === 'theory') {
      startPhase = 'theory';
    }

    lessonState = {
      unitId: unitId,
      unitData: unitData,
      mount: mount,
      backFn: opts.backFn,
      level: opts.level,
      progress: progress,
      phase: startPhase,
      theoryCardIdx: 0,
      pendingNodeId: opts.startNodeId || null
    };

    if (startPhase === 'session' && opts.startNodeId) {
      startPracticeSession(opts.startNodeId);
      return;
    }

    renderPhase();
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
