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
    if (!data || data.type !== 'grammar') return false;
    var schema = String(data.schemaVersion || '');
    var style = String(data.lessonStyle || '');
    if (schema.indexOf('sune-english-unit-v2') === 0) return true;
    if (style.indexOf('sune-play') === 0) return true;
    if (data.theory && data.practiceNodes && data.practiceNodes.length) return true;
    return false;
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
    Object.assign(lessonState, lessonState._savedSession);
    lessonState._returnPhase = null;
    lessonState._savedSession = null;
    lessonState.phase = 'session';
    renderPhase();
    return true;
  }

  function closeTheory() {
    if (returnToSessionFromTheory()) return;
    exitLesson();
  }

  function showSessionExitConfirm(onLeave) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._showLearningExitConfirm) {
      BentoGrid._showLearningExitConfirm(onLeave, {
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
      lessonState.phase = 'theory';
      renderPhase();
      return;
    }
    startPracticeSession(targetNodeId);
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
      s.mount.innerHTML = '<div class="sp-lesson sp-lesson--theory">' + theory.TheoryFlow(s.unitData, {
        cardIdx: s.theoryCardIdx,
        exitToStage: exitToStage
      }) + '</div>';
      bindTheoryEvents();
      var theoryBody = s.mount.querySelector('.sp-theory-card-body');
      if (theoryBody) theoryBody.scrollTop = 0;
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
      startPracticeSession(pendingNode);
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
    var labels = { check: 'Check', continue: 'Continue', retry: 'Retry' };
    actionBtn.setAttribute('aria-label', labels[mode] || 'Action');
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
    var practiceMain = lessonState.mount.querySelector('.sp-practice-main');
    var isFeedback = mode === 'continue' || mode === 'retry';
    var isCorrect = lessonState._lastResultCorrect === true;
    var isIncorrect = lessonState._lastResultCorrect === false;
    if (footer) {
      footer.classList.toggle('sp-practice-footer--feedback', isFeedback);
      footer.classList.toggle('sp-practice-footer--correct', mode === 'continue' && isCorrect);
      footer.classList.toggle('sp-practice-footer--incorrect', isFeedback && isIncorrect);
      footer.classList.toggle('sp-practice-footer--retry', mode === 'retry');
    }
    if (practiceMain) {
      practiceMain.classList.toggle('sp-practice-main--correct', mode === 'continue' && isCorrect);
      practiceMain.classList.toggle('sp-practice-main--incorrect', isFeedback && isIncorrect);
    }
  }

  function applyGapResultStyles(correct) {
    var mount = lessonState.mount;
    if (!mount) return;
    mount.querySelectorAll('.sp-gap-slot, .sp-inline-gap').forEach(function(slot) {
      slot.classList.toggle('sp-gap-slot--correct', correct === true);
      slot.classList.toggle('sp-gap-slot--incorrect', correct === false);
    });
  }

  function clearResultStyles() {
    var mount = lessonState.mount;
    if (!mount) return;
    var practiceMain = mount.querySelector('.sp-practice-main');
    if (practiceMain) {
      practiceMain.classList.remove('sp-practice-main--correct', 'sp-practice-main--incorrect');
    }
    mount.querySelectorAll('.sp-gap-slot, .sp-inline-gap').forEach(function(slot) {
      slot.classList.remove('sp-gap-slot--correct', 'sp-gap-slot--incorrect');
    });
  }

  function renderCurrentScreen() {
    if (window.AudioUtils) AudioUtils.stopPhrasePlayback();
    var mount = lessonState.mount;
    var screenMount = mount.querySelector('#sp-screen-mount');
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    if (!screenMount) return;

    feedbackMount.innerHTML = '';
    lessonState.awaitingContinue = false;
    lessonState._lastFeedbackResult = null;
    lessonState._lastResultCorrect = null;
    clearResultStyles();

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
      title: 'Explanation',
      explanation: result.explanation,
      correctAnswer: result.correct ? '' : (result.correctAnswer || ''),
      continueLabel: 'Close',
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
      clearResultStyles();
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
    if (window.AudioUtils) {
      if (result.correct) AudioUtils.playSuccessSound();
      else AudioUtils.playFailureSound();
    }
    var mount = lessonState.mount;
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    var tone = lessonState.unitData.feedbackTone;
    feedbackMount.innerHTML = renderer.FeedbackSheet(result, tone);
    lessonState.awaitingContinue = true;
    lessonState._lastFeedbackResult = result;
    lessonState._lastResultCorrect = result.correct;
    lessonState._isRetryContinue = !!isRetry;

    applyGapResultStyles(result.correct);
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

  function returnToStage() {
    lessonState.activeNode = null;
    exitLesson();
  }

  function bindResultEvents() {
    var mount = lessonState.mount;
    var retry = mount.querySelector('[data-action="retry-node"]');
    if (retry) {
      retry.addEventListener('click', function() {
        startPracticeSession(lessonState.activeNode.nodeId);
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
      pendingNodeId: opts.startNodeId || null
    };

    if (opts.startSection === 'theory') {
      lessonState.phase = 'theory';
      lessonState.theoryCardIdx = opts.theoryCardIdx || 0;
      renderPhase();
      return;
    }

    if (opts.startSection === 'session' && opts.startNodeId) {
      enterPractice(opts.startNodeId, { skipTheoryGate: true });
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
