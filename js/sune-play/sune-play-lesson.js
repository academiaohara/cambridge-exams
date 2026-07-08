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
    if (!data || (data.type !== 'grammar' && data.type !== 'vocabulary')) return false;
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
      return raw ? JSON.parse(raw) : { completedNodes: {}, completedExercises: {}, theoryCompleted: false };
    } catch (e) { return { completedNodes: {}, completedExercises: {}, theoryCompleted: false }; }
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
    var mount = lessonState.mount;
    if (!mount) return;
    var feedbackMount = mount.querySelector('#sp-feedback-mount');
    var result = lessonState._lastFeedbackResult;
    if (!feedbackMount || !result) return;
    var tone = lessonState.unitData.feedbackTone;
    feedbackMount.innerHTML = renderer.FeedbackSheet(result, tone);
    applyGapResultStyles(result.correct);
    setScreenInputsLocked(true);
    setActionBtn('continue', true);
    var screenRoot = mount.querySelector('.sp-screen');
    if (screenRoot) screenRoot.classList.add('sp-screen--locked');
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

  // ─── Session ─────────────────────────────────────────────────────────

  function startPracticeSession(nodeId, opts) {
    opts = opts || {};
    var unit = lessonState.unitData;

    var node = (unit.practiceNodes || []).find(function(n) { return n.nodeId === nodeId; });
    if (!node) return;

    var screenList = screens.generatePracticeScreens(unit, nodeId);
    if (opts.exerciseId) {
      screenList = screenList.filter(function(s) { return s.sourceExerciseId === opts.exerciseId; });
      lessonState.singleExerciseId = opts.exerciseId;
    } else {
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
    lessonState.phase = 'session';
    renderPhase();
    syncLessonUrl(true);
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
    var labels = { check: 'Check', continue: 'Continue' };
    actionBtn.setAttribute('aria-label', labels[mode] || 'Action');
    if (icon) {
      icon.textContent = mode === 'check' ? 'check' : 'arrow_forward';
    }
    actionBtn.classList.toggle('sp-btn--continue-mode', mode === 'continue');
    actionBtn.classList.toggle('sp-btn--correct', mode === 'continue' && lessonState._lastResultCorrect);
    actionBtn.classList.toggle('sp-btn--incorrect', mode === 'continue' && lessonState._lastResultCorrect === false);
    actionBtn.classList.remove('sp-btn--retry-mode');

    if (skipBtn) {
      skipBtn.hidden = mode !== 'check';
      skipBtn.disabled = lessonState.hearts && lessonState.hearts.isGameOver;
    }
    if (explainBtn) {
      var hasExplanation = lessonState._lastFeedbackResult && lessonState._lastFeedbackResult.explanation;
      explainBtn.hidden = mode === 'check' || !hasExplanation;
    }
    var practiceMain = lessonState.mount.querySelector('.sp-practice-main');
    var isFeedback = mode === 'continue';
    var isCorrect = lessonState._lastResultCorrect === true;
    var isIncorrect = lessonState._lastResultCorrect === false;
    if (footer) {
      footer.classList.toggle('sp-practice-footer--feedback', isFeedback);
      footer.classList.toggle('sp-practice-footer--correct', mode === 'continue' && isCorrect);
      footer.classList.toggle('sp-practice-footer--incorrect', isFeedback && isIncorrect);
      footer.classList.remove('sp-practice-footer--retry');
    }
    if (practiceMain) {
      practiceMain.classList.toggle('sp-practice-main--correct', mode === 'continue' && isCorrect);
      practiceMain.classList.toggle('sp-practice-main--incorrect', isFeedback && isIncorrect);
    }
  }

  function setScreenInputsLocked(locked) {
    var mount = lessonState.mount;
    if (!mount) return;
    mount.querySelectorAll('.sp-screen input, .sp-screen textarea').forEach(function(el) {
      el.readOnly = locked;
    });
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

  function clearResultStyles() {
    var mount = lessonState.mount;
    if (!mount) return;
    var practiceMain = mount.querySelector('.sp-practice-main');
    if (practiceMain) {
      practiceMain.classList.remove('sp-practice-main--correct', 'sp-practice-main--incorrect');
    }
    mount.querySelectorAll('.sp-gap-slot, .sp-inline-gap-group').forEach(function(slot) {
      slot.classList.remove('sp-gap-slot--correct', 'sp-gap-slot--incorrect');
    });
    mount.querySelectorAll('.sp-passage-gap-wrap').forEach(function(slot) {
      slot.classList.remove('sp-passage-gap--correct', 'sp-passage-gap--incorrect');
    });
    mount.querySelectorAll('.sp-option-btn').forEach(function(btn) {
      btn.classList.remove('sp-option-btn--correct', 'sp-option-btn--incorrect');
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
    var instructionText = getScreenInstruction(screen);
    if (instructionText && screenRoot) {
      var existingInstruction = screenRoot.querySelector('.sp-session-instruction');
      if (existingInstruction) existingInstruction.remove();
      var instructionEl = document.createElement('p');
      instructionEl.className = 'sp-session-instruction';
      instructionEl.textContent = instructionText;
      screenRoot.insertBefore(instructionEl, screenRoot.firstChild);
    }
    if (screenRoot) {
      screenRoot._spScreen = screen;
      renderer.bindScreen(screenRoot, screen, function() {
        if (!lessonState.awaitingContinue) {
          setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
        }
      });
      screenRoot.addEventListener('sp-hunt-wrong-tap', handleHuntWrongTap);
    }
    setScreenInputsLocked(false);
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
          currentScreen: lessonState.currentScreen,
          awaitingContinue: lessonState.awaitingContinue,
          _lastFeedbackResult: lessonState._lastFeedbackResult,
          _lastResultCorrect: lessonState._lastResultCorrect
        };
        lessonState.theoryCardIdx = 0;
        lessonState.phase = 'theory';
        renderPhase();
      });
    }
  }

  function getScreenInstruction(screen) {
    if (!screen) return '';
    var p = screen.payload || {};
    switch (screen.formatType) {
      case 'two_option_choice':
        return p.instruction || 'Choose the correct option to complete the sentence.';
      case 'free_text_gap_fill':
      case 'conjugation_gap_fill':
      case 'word_bank_gap_fill':
      case 'preselected_verb_gap_fill':
        return p.instruction || (p.verbPrompt || p.preselectedVerb
          ? 'Use the correct form of the highlighted word.'
          : (p.wordBank && p.wordBank.length
            ? 'Complete the sentence using a word from the box.'
            : 'Complete the sentence with the correct word.'));
      case 'full_sentence_write':
        return p.instruction || 'Write the full sentence.';
      case 'word_order_tiles':
        return p.instruction || 'Look at the picture and answer the question by building the sentence.';
      case 'error_correction':
        return p.instruction || 'Correct the mistake in the sentence.';
      case 'verb_bank_two_step':
        return p.instruction || 'Write the verb in the correct form.';
      case 'passage_error_hunt_single':
        return p.instruction || 'Find one wrong verb phrase.';
      case 'passage_error_hunt_counter': {
        var huntPhase = screen._huntState && screen._huntState.phase;
        if (huntPhase === 'correct') return 'Write the correction for the error you marked.';
        var fixedCount = screen._huntState && screen._huntState.fixed
          ? Object.keys(screen._huntState.fixed).length
          : 0;
        if (fixedCount > 0) return 'Find and mark the next error in the passage.';
        return p.instruction || p.studentInstruction || 'Find and mark an error in the passage.';
      }
      case 'passage_gap_fill':
        if (p.sequentialGaps) {
          return p.instruction || 'Select a verb from the box, write its correct form, and confirm each gap one by one.';
        }
        return p.instruction || 'Complete the passage using the verbs in the box.';
      case 'guided_error_choice':
        return p.instruction || 'Choose the correct form for each error.';
      case 'stative_sorting':
        return p.instruction || p.prompt || 'Sort the verbs into groups.';
      case 'meaning_contrast':
        return p.instruction || p.prompt || 'Choose the option that best fits the meaning.';
      case 'mc_4_option':
        if (p.displayMode === 'passage') {
          return p.instruction || 'Tap each numbered gap and choose A, B, C or D.';
        }
        return p.instruction || 'Choose the correct answer: A, B, C or D.';
      case 'find_extra_word':
        return p.instruction || 'If the line is correct, tap OK. If there is an extra word, tap it.';
      case 'keyword_transformation':
        return p.instruction || 'Complete the second sentence using the keyword. Write between two and five words.';
      case 'column_matching':
        return p.instruction || 'Tap a numbered beginning, then tap the matching ending letter.';
      case 'crossword_clues':
        return p.instruction || 'Type one letter in each box to complete the answer.';
      case 'synced_gap_fill':
        return p.instruction || 'Write one word that fits all three sentences.';
      case 'comma_placement':
        if (p.interactionMode === 'rewrite_sentence') {
          return p.instruction || 'Add commas where needed. If no commas are needed, write "No commas".';
        }
        return p.instruction || 'Tap the comma slots where commas are needed.';
      case 'word_bank_tick':
        return p.instruction || 'Select the correct words by tapping them.';
      default:
        return p.instruction || '';
    }
  }

  function getScreenContext(screen) {
    if (!screen) return '';
    var p = screen.payload || {};
    switch (screen.formatType) {
      case 'two_option_choice':
      case 'meaning_contrast':
        return ((p.sentenceBefore || '') + ' ___ ' + (p.sentenceAfter || '')).replace(/\s+/g, ' ').trim();
      case 'free_text_gap_fill':
      case 'conjugation_gap_fill':
      case 'preselected_verb_gap_fill':
        return p.sentence || p.instruction || '';
      case 'full_sentence_write':
        return p.displayPrompt || p.prompt || '';
      case 'error_correction':
        return p.sentence || '';
      case 'word_order_tiles':
        return p.contextQuestion || p.instruction || p.prompt || '';
      case 'verb_bank_two_step':
        return p.sentence || '';
      case 'passage_error_hunt_single':
        return 'Find the error in the passage.';
      case 'passage_error_hunt_counter':
        return p.passage || 'Find the errors in the passage.';
      case 'passage_gap_fill':
        return p.passage || p.instruction || '';
      case 'stative_sorting':
        return p.instruction || 'Sort the verbs into groups.';
      case 'mc_4_option':
        if (p.displayMode === 'passage') return p.passage || p.instruction || '';
        return ((p.sentenceBefore || '') + ' ___ ' + (p.sentenceAfter || '')).replace(/\s+/g, ' ').trim();
      case 'find_extra_word':
        return p.sentence || p.instruction || '';
      case 'keyword_transformation':
        return p.promptSentence || p.instruction || '';
      case 'column_matching':
        return p.instruction || 'Match beginnings with endings.';
      case 'crossword_clues':
        return ((p.direction === 'down' ? 'Down ' : 'Across ') + (p.clueNumber != null ? p.clueNumber : '') + ': ' + (p.clue || '')).trim();
      case 'synced_gap_fill':
        return (p.sentences && p.sentences[0]) || p.instruction || '';
      case 'comma_placement':
        return p.sentence || p.instruction || '';
      case 'word_bank_tick':
        return p.instruction || 'Select the correct words.';
      default:
        return p.instruction || p.sentence || '';
    }
  }

  function getScreenCorrectAnswer(screen) {
    var p = (screen && screen.payload) || {};
    if (screen && screen.formatType === 'mc_4_option' && p.displayMode === 'passage' && p.gaps && p.gaps.length) {
      return p.gaps.map(function(gap) { return gap.answer; }).join(' / ');
    }
    if (screen && screen.formatType === 'comma_placement') {
      if (p.interactionMode === 'rewrite_sentence') {
        return p.reconstructedSentence || ((p.acceptedAnswers && p.acceptedAnswers[0]) || '');
      }
      if (p.noCommaNeeded) return 'No commas';
      return (p.commaAfterTokenIndexes || []).join(', ');
    }
    if (screen && screen.formatType === 'word_bank_tick') {
      return (p.answerWords || []).join(', ');
    }
    if (p.answer) return p.answer;
    if (p.acceptedAnswers && p.acceptedAnswers.length) return p.acceptedAnswers[0];
    return '';
  }

  function applyLifeLoss(amount, screen) {
    if (!lessonState || !lessonState.hearts || amount <= 0) return 0;
    var lostAmount = lessonState.hearts.loseLife(amount, {
      screenId: screen && screen.screenId,
      itemId: screen && screen.itemId,
      maxLifeLossPerScreen: screen && screen.maxLifeLossPerScreen
    });
    if (lostAmount) lessonState.sessionLivesLost += lostAmount;
    return lostAmount;
  }

  function handleHuntWrongTap() {
    if (!lessonState || lessonState.awaitingContinue || !lessonState.hearts) return;
    if (lessonState.hearts.isGameOver) return;
    var screen = lessonState.currentScreen;
    var lostAmount = applyLifeLoss(1, screen);
    if (lostAmount && window.AudioUtils) AudioUtils.playFailureSound();
    updateSessionHeader();
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
    setScreenInputsLocked(true);

    applyLifeLoss(1, screen);

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
    var screen = lessonState.currentScreen;
    if (!result || !result.explanation || typeof LessonExplanation === 'undefined') return;
    var explainOpts = {
      title: 'Explanation',
      context: getScreenContext(screen),
      explanation: result.explanation,
      correctAnswer: result.correctAnswer || getScreenCorrectAnswer(screen),
      continueLabel: 'Continue'
    };
    var sessionEl = lessonState.mount && lessonState.mount.querySelector('.sp-practice-session');
    if (sessionEl) {
      LessonExplanation.open(Object.assign({ inlineMount: sessionEl }, explainOpts));
      return;
    }
    if (lessonState.mount) {
      LessonExplanation.open(Object.assign({ inlineMount: lessonState.mount }, explainOpts));
      return;
    }
    LessonExplanation.open(explainOpts);
  }

  function handleActionClick() {
    var actionBtn = lessonState.mount.querySelector('#sp-action-btn');
    if (!actionBtn || actionBtn.disabled) return;

    var screenRoot = lessonState.mount.querySelector('.sp-screen');
    var screen = lessonState.currentScreen;

    if (screen && screen.formatType === 'passage_error_hunt_counter' && screenRoot) {
      if (!lessonState.awaitingContinue) {
        handleHuntCounterCheck(screenRoot, screen);
        return;
      }
    }

    if (screen && screen.formatType === 'passage_gap_fill' &&
        screen.payload && screen.payload.sequentialGaps && screenRoot) {
      if (!lessonState.awaitingContinue) {
        handlePassageGapSequentialCheck(screenRoot, screen);
        return;
      }
    }

    if (screen && screen.formatType === 'guided_error_choice' && screenRoot && !lessonState.awaitingContinue) {
      handleGuidedErrorCheck(screenRoot, screen);
      return;
    }

    if (lessonState.awaitingContinue) {
      handleContinue();
      return;
    }
    handleCheck();
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

  function handleContinue() {
    var mount = lessonState.mount;
    if (lessonState.hearts.isGameOver) return;

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
        'sp-practice-footer--retry'
      );
    }

    if (lastResult && lastResult._switchToFallback) {
      renderCurrentScreen();
      return;
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
        return;
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
          return;
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
      return;
    }

    if (lastResult && lastResult.allDone) {
      renderCurrentScreen();
      return;
    }

    if (screen && screen.formatType === 'guided_error_choice' && screenRoot && lastResult && lastResult.correct && lastResult.partial) {
      screen._guidedIdx = (screen._guidedIdx || 0) + 1;
      renderCurrentScreen();
      return;
    }

    if (screen && screen.formatType === 'guided_error_choice' && screenRoot) {
      screenRoot.classList.remove('sp-screen--locked');
      setScreenInputsLocked(false);
      setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
      return;
    }

    renderCurrentScreen();
  }

  function handleCheck() {
    var mount = lessonState.mount;
    var screenRoot = mount.querySelector('.sp-screen');
    var screen = lessonState.currentScreen;
    if (!screenRoot || !screen) return;

    if (screen.formatType === 'stative_sorting') {
      handleStativeSortingCheck(screenRoot, screen);
      return;
    }

    var result = renderer.checkScreen(screenRoot, screen);
    screen._attemptsUsed = (screen._attemptsUsed || 0) + 1;

    if (result.partial && result._advanceStep === 'type_form') {
      screen.payload.step = 'type_form';
      screen.payload.selectedVerb = result._selectedVerb;
      renderCurrentScreen();
      return;
    }

    if (!result.correct && result.lifeLoss > 0) {
      applyLifeLoss(result.lifeLoss, screen);
    }

    if (result.correct) {
      screenRoot.classList.add('sp-screen--locked');
      lessonState.queue.removeCompletedItem(screen);
      lessonState.sessionCorrect++;
      showFeedback(result, true);
    } else {
      screenRoot.classList.add('sp-screen--locked');
      var failCount = lessonState.queue.incrementFailure(screen);
      var globalRules = (lessonState.unitData.practiceConfig && lessonState.unitData.practiceConfig.globalRules) || {};
      if (result.shouldRequeue || globalRules.failedItemsReturnToQueue !== false) {
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

  function showFeedback(result, advanceOnContinue) {
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

    applyGapResultStyles(result.correct);
    setScreenInputsLocked(true);
    setActionBtn('continue', true);
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
    } else if (passed) {
      if (lessonState.singleExerciseId) {
        if (!lessonState.progress.completedExercises) lessonState.progress.completedExercises = {};
        lessonState.progress.completedExercises[lessonState.singleExerciseId] = true;
      } else {
        lessonState.progress.completedNodes[node.nodeId] = true;
      }
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
    if (!lessonState || typeof Router === 'undefined' || typeof BentoGrid === 'undefined') return;
    if (!BentoGrid._syncCourseUnitUrl || !BentoGrid._currentUnitId || !BentoGrid._currentBlockKey) return;

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

    BentoGrid._syncCourseUnitUrl(sectionIdx, replace !== false);
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
      pendingExerciseId: opts.startExerciseId || null
    };

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
