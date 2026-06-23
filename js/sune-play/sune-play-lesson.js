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
    var theoryRequired = unit.unitStructure && unit.unitStructure.theoryRequiredBeforePractice;
    if (theoryRequired && !lessonState.progress.theoryCompleted) {
      lessonState.phase = 'theory';
      lessonState.pendingNodeId = nodeId;
      renderPhase();
      return;
    }

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

  function renderCurrentScreen() {
    var mount = lessonState.mount;
    var screenMount = mount.querySelector('#sp-screen-mount');
    var checkBtn = mount.querySelector('#sp-check-btn');
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    if (!screenMount) return;

    feedbackMount.innerHTML = '';
    lessonState.awaitingContinue = false;

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
        if (checkBtn) checkBtn.disabled = !renderer.isScreenReady(screenRoot, screen);
      });
    }
    if (checkBtn) {
      checkBtn.disabled = true;
      checkBtn.textContent = 'Check';
      checkBtn.hidden = false;
    }
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
    var checkBtn = mount.querySelector('#sp-check-btn');
    if (checkBtn) {
      checkBtn.addEventListener('click', handleCheck);
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

  function handleCheck() {
    if (lessonState.awaitingContinue) return;
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
      var checkBtn = mount.querySelector('#sp-check-btn');
      if (checkBtn) checkBtn.disabled = !renderer.isScreenReady(screenRoot, screen);
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
    var checkBtn = mount.querySelector('#sp-check-btn');
    if (checkBtn) checkBtn.hidden = true;

    var tone = lessonState.unitData.feedbackTone;
    feedbackMount.innerHTML = renderer.FeedbackSheet(result, tone);
    lessonState.awaitingContinue = true;

    var continueBtn = feedbackMount.querySelector('[data-action="feedback-continue"]');
    if (continueBtn) {
      continueBtn.textContent = isRetry ? 'Try again' : 'Continue';
      continueBtn.addEventListener('click', function() {
        if (isRetry) {
          feedbackMount.innerHTML = '';
          lessonState.awaitingContinue = false;
          if (checkBtn) { checkBtn.hidden = false; checkBtn.disabled = true; }
          var screenRoot = mount.querySelector('.sp-screen');
          if (screenRoot) screenRoot.classList.remove('sp-screen--locked');
          return;
        }
        if (lessonState.hearts.isGameOver) return;
        renderCurrentScreen();
      });
    }
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

    var theoryRequired = unitData.unitStructure && unitData.unitStructure.theoryRequiredBeforePractice;
    var startPhase = 'theory';
    if (progress.theoryCompleted || !theoryRequired) {
      if (opts.startSection === 'session' && opts.startNodeId) {
        startPhase = 'session';
      } else if (opts.startSection === 'nodes' || progress.theoryCompleted) {
        startPhase = 'nodes';
      }
    }
    if (opts.startSection === 'theory') startPhase = 'theory';

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
