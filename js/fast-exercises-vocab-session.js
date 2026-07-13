// js/fast-exercises-vocab-session.js
// SunePlay-style practice shell for course vocabulary (aligned with learning UI)

(function() {
  'use strict';

  var practiceUI = window.SunePlayPracticeUI;
  var renderer = window.SunePlayScreenRenderer;
  var heartsMod = window.SunePlayHearts;

  var GAP_RE = /_{2,}|\.{3,}|\[\.\.\.\]|\{\.\.\.\}/;

  function esc(str) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._escapeHTML) return DashboardNav._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getSession() {
    return window._feVocabSession;
  }

  function getMount() {
    return document.getElementById('sp-lesson-mount');
  }

  function getScreenMount() {
    var root = getMount();
    return root ? root.querySelector('#sp-screen-mount') : null;
  }

  function isWriteExercise(ex) {
    if (!ex) return false;
    return ex.type === 'write-verb' || ex.type === 'transform' || ex.type === 'write';
  }

  function isMcqExercise(ex) {
    if (!ex) return false;
    if (isWriteExercise(ex)) return false;
    return !!(ex.options && ex.options.length) ||
      ex.type === 'multiple-choice' ||
      ex.type === 'mcq' ||
      ex.type === 'match-meaning' ||
      ex.type === 'complete-sentence' ||
      ex.type === 'select-situation';
  }

  function normalizeGapSentence(sentence) {
    return String(sentence || '')
      .replace(/_____/g, '___')
      .replace(/\[\.\.\.\]/g, '___')
      .replace(/\{\.\.\.\}/g, '___');
  }

  function splitGapSentence(sentence) {
    var normalized = normalizeGapSentence(sentence);
    var match = normalized.match(/^(.+?)(_{2,}|\.{3,})(.*)$/);
    if (!match) {
      return { sentenceBefore: normalized.trim(), sentenceAfter: '' };
    }
    return {
      sentenceBefore: match[1].trim(),
      sentenceAfter: (match[3] || '').trim()
    };
  }

  function buildMcOptions(options) {
    return (options || []).map(function(opt, i) {
      var text = String(opt).replace(/^[A-D]\)\s*/i, '').trim() || String(opt);
      return { letter: String.fromCharCode(65 + i), text: text };
    });
  }

  function findMcAnswerLetter(mcOptions, correct) {
    var target = String(correct || '').trim().toLowerCase();
    var letter = 'A';
    (mcOptions || []).forEach(function(opt) {
      if (opt.text.trim().toLowerCase() === target) letter = opt.letter;
    });
    return letter;
  }

  function exerciseToScreen(exercise, index) {
    var id = 'vocab-screen-' + index;

    if (isWriteExercise(exercise)) {
      var writeSentence = normalizeGapSentence(exercise.sentence || '');
      if (!GAP_RE.test(writeSentence)) writeSentence = (writeSentence + ' ___').trim();
      return {
        screenId: id,
        formatType: exercise.hint ? 'preselected_verb_gap_fill' : 'free_text_gap_fill',
        payload: {
          sentence: writeSentence,
          answer: exercise.correct,
          acceptedAnswers: [exercise.correct],
          preselectedVerb: exercise.hint || '',
          verbPrompt: exercise.hint || '',
          explanation: exercise.explanation || ''
        }
      };
    }

    var options = buildMcOptions(exercise.options || []);
    var parts = splitGapSentence(exercise.sentence || '');
    var hasGap = GAP_RE.test(normalizeGapSentence(exercise.sentence || ''));

    if (!hasGap) {
      return {
        screenId: id,
        formatType: 'meaning_contrast',
        payload: {
          sentence: exercise.sentence || '',
          options: (exercise.options || []).slice(),
          answer: exercise.correct,
          explanation: exercise.explanation || ''
        }
      };
    }

    return {
      screenId: id,
      formatType: 'mc_4_option',
      payload: {
        sentenceBefore: parts.sentenceBefore,
        sentenceAfter: parts.sentenceAfter,
        options: options,
        answer: findMcAnswerLetter(options, exercise.correct),
        answerText: exercise.correct,
        explanation: exercise.explanation || ''
      }
    };
  }

  function buildShellHtml(opts) {
    opts = opts || {};
    var node = { nodeId: 'vocab-point', title: opts.pointLabel || opts.lessonTitle || 'Vocabulary' };
    var sessionHtml = practiceUI && practiceUI.PracticeSession
      ? practiceUI.PracticeSession(node, {
        lives: opts.lives || 0,
        maxLives: opts.maxLives || 5,
        completed: opts.completed || 0,
        total: opts.total || 1,
        showReviewTheory: false
      })
      : '<div class="sp-practice-session"><div id="sp-screen-mount"></div></div>';

    return '<div class="fe-vocab-sp-lesson">' +
      '<div id="sp-lesson-mount" class="sp-lesson-mount">' +
        '<div class="sp-lesson">' + sessionHtml + '</div>' +
      '</div>' +
    '</div>';
  }

  function buildCompleteHtml(opts) {
    var node = { nodeId: 'vocab-point', title: opts.pointLabel || opts.lessonTitle || 'Vocabulary' };
    if (practiceUI && practiceUI.PracticeCompleteScreen) {
      return '<div class="fe-vocab-sp-lesson">' +
        '<div id="sp-lesson-mount" class="sp-lesson-mount">' +
          '<div class="sp-lesson">' +
            practiceUI.PracticeCompleteScreen(node, {
              correct: opts.correctCount || 0,
              required: opts.total || 1,
              livesLeft: opts.livesLeft || 0,
              xp: opts.xp || 0,
              passed: true
            }) +
          '</div>' +
        '</div>' +
      '</div>';
    }
    return '<div class="sp-result-screen sp-result-screen--complete">' +
      '<h2 class="sp-result-title">Point complete!</h2>' +
    '</div>';
  }

  function buildFailedHtml(opts) {
    var node = { nodeId: 'vocab-point', title: opts.pointLabel || opts.lessonTitle || 'Vocabulary', shortTitle: opts.pointLabel || 'this point' };
    if (practiceUI && practiceUI.PracticeFailedScreen) {
      return '<div class="fe-vocab-sp-lesson">' +
        '<div id="sp-lesson-mount" class="sp-lesson-mount">' +
          '<div class="sp-lesson">' + practiceUI.PracticeFailedScreen(node) + '</div>' +
        '</div>' +
      '</div>';
    }
    return '<div class="sp-result-screen sp-result-screen--failed"><h2 class="sp-result-title">Out of lives</h2></div>';
  }

  function setActionBtn(mode, enabled) {
    var root = getMount();
    if (!root) return;
    var s = getSession();
    var actionBtn = root.querySelector('#sp-action-btn');
    var skipBtn = root.querySelector('#sp-skip-btn');
    var explainBtn = root.querySelector('#sp-explain-btn');
    var footer = root.querySelector('#sp-practice-footer');
    var practiceMain = root.querySelector('.sp-practice-main');
    if (!actionBtn) return;

    actionBtn.dataset.mode = mode;
    actionBtn.disabled = !enabled;
    actionBtn.hidden = false;
    var icon = actionBtn.querySelector('.material-symbols-outlined');
    var labels = { check: 'Check', continue: 'Continue' };
    actionBtn.setAttribute('aria-label', labels[mode] || 'Action');
    if (icon) icon.textContent = mode === 'check' ? 'check' : 'arrow_forward';
    actionBtn.classList.toggle('sp-btn--continue-mode', mode === 'continue');
    actionBtn.classList.toggle('sp-btn--correct', mode === 'continue' && s && s._lastResultCorrect === true);
    actionBtn.classList.toggle('sp-btn--incorrect', mode === 'continue' && s && s._lastResultCorrect === false);

    if (skipBtn) {
      skipBtn.hidden = mode !== 'check' || (s && s.passive);
      if (s && s.hearts && s.hearts.isGameOver) skipBtn.disabled = true;
    }

    if (explainBtn) {
      var hasExplanation = s && s._lastFeedbackResult && s._lastFeedbackResult.explanation;
      explainBtn.hidden = mode !== 'continue' || !hasExplanation;
    }

    var isFeedback = mode === 'continue';
    var isCorrect = s && s._lastResultCorrect === true;
    var isIncorrect = s && s._lastResultCorrect === false;
    if (footer) {
      footer.classList.toggle('sp-practice-footer--feedback', isFeedback);
      footer.classList.toggle('sp-practice-footer--correct', mode === 'continue' && isCorrect);
      footer.classList.toggle('sp-practice-footer--incorrect', isFeedback && isIncorrect);
    }
    if (practiceMain) {
      practiceMain.classList.toggle('sp-practice-main--correct', mode === 'continue' && isCorrect);
      practiceMain.classList.toggle('sp-practice-main--incorrect', isFeedback && isIncorrect);
    }
  }

  function clearResultStyles() {
    var root = getMount();
    if (!root) return;
    var practiceMain = root.querySelector('.sp-practice-main');
    if (practiceMain) practiceMain.classList.remove('sp-practice-main--correct', 'sp-practice-main--incorrect');
    root.querySelectorAll('.sp-gap-slot, .sp-inline-gap-group').forEach(function(slot) {
      slot.classList.remove('sp-gap-slot--correct', 'sp-gap-slot--incorrect');
    });
    root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
      btn.classList.remove('sp-option-btn--selected', 'sp-option-btn--correct', 'sp-option-btn--incorrect');
    });
    var footer = root.querySelector('#sp-practice-footer');
    if (footer) {
      footer.classList.remove('sp-practice-footer--feedback', 'sp-practice-footer--correct', 'sp-practice-footer--incorrect');
    }
    var feedbackMount = root.querySelector('#sp-feedback-mount');
    if (feedbackMount) feedbackMount.innerHTML = '';
  }

  function setScreenInputsLocked(locked) {
    var root = getMount();
    if (!root) return;
    root.querySelectorAll('.sp-screen input, .sp-screen textarea').forEach(function(el) {
      el.readOnly = locked;
    });
    root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
      if (locked) btn.disabled = true;
    });
    var screen = root.querySelector('.sp-screen');
    if (screen && locked) screen.classList.add('sp-screen--locked');
  }

  function applyGapResultStyles(correct) {
    var root = getMount();
    if (!root) return;
    root.querySelectorAll('.sp-option-btn--selected').forEach(function(btn) {
      btn.classList.toggle('sp-option-btn--correct', correct === true);
      btn.classList.toggle('sp-option-btn--incorrect', correct === false);
    });
  }

  function updateHeader() {
    var s = getSession();
    var root = getMount();
    if (!s || !root || !practiceUI) return;
    var header = root.querySelector('.sp-practice-header');
    if (!header) return;
    var progressEl = header.querySelector('.sp-session-progress');
    if (progressEl) {
      progressEl.outerHTML = practiceUI.SessionProgressBar(s.sessionCorrect || 0, s.sessionTotal || 1);
    }
    var heartsEl = header.querySelector('.sp-hearts-bar');
    if (heartsEl && s.hearts) {
      heartsEl.outerHTML = practiceUI.HeartsBar(s.hearts.currentLives, s.hearts.maxLives);
    }
  }

  function getScreenCorrectAnswer(screen) {
    var p = (screen && screen.payload) || {};
    if (screen && screen.formatType === 'mc_4_option') {
      if (window.SunePlayNormalize && window.SunePlayNormalize.getMcCorrectAnswerDisplay) {
        return window.SunePlayNormalize.getMcCorrectAnswerDisplay(p);
      }
      return p.answerText || p.answer || '';
    }
    if (p.answer) return p.answer;
    if (p.acceptedAnswers && p.acceptedAnswers.length) return p.acceptedAnswers[0];
    return '';
  }

  function applyLifeLoss(amount, screen) {
    var s = getSession();
    if (!s || !s.hearts || amount <= 0) return 0;
    var lost = s.hearts.loseLife(amount, { screenId: screen && screen.screenId });
    if (lost && window.AudioUtils) window.AudioUtils.playFailureSound();
    return lost;
  }

  function showFeedback(result) {
    var root = getMount();
    var s = getSession();
    if (!root || !s) return;
    var feedbackMount = root.querySelector('#sp-feedback-mount');
    if (!feedbackMount) return;

    if (window.AudioUtils) {
      if (result.correct) window.AudioUtils.playSuccessSound();
      else window.AudioUtils.playFailureSound();
    }

    if (renderer && renderer.FeedbackSheet) {
      feedbackMount.innerHTML = renderer.FeedbackSheet(result, {});
    }

    s.awaitingContinue = true;
    s._lastFeedbackResult = result;
    s._lastResultCorrect = result.correct;
    applyGapResultStyles(result.correct);
    setScreenInputsLocked(true);
    setActionBtn('continue', true);
  }

  function getScreenInstruction(screen) {
    if (!screen) return '';
    var p = screen.payload || {};
    switch (screen.formatType) {
      case 'meaning_contrast':
        return p.instruction || 'Choose the option that best fits.';
      case 'mc_4_option':
        return p.instruction || 'Choose the correct answer: A, B, C or D.';
      case 'free_text_gap_fill':
      case 'preselected_verb_gap_fill':
        return p.instruction || (p.verbPrompt || p.preselectedVerb
          ? 'Use the correct form of the highlighted word.'
          : 'Complete the sentence with the correct word.');
      default:
        return p.instruction || '';
    }
  }

  function renderCurrentScreen() {
    var s = getSession();
    var screenMount = getScreenMount();
    if (!s || !screenMount || !renderer) return;

    var screen = s.screens[s.questionIndex];
    if (!screen) {
      finishQuizSession();
      return;
    }

    s.currentScreen = screen;
    s.awaitingContinue = false;
    s._lastFeedbackResult = null;
    s._lastResultCorrect = null;
    clearResultStyles();

    screenMount.innerHTML = renderer.PracticeScreenRenderer(screen);
    var screenRoot = screenMount.querySelector('.sp-screen');
    var instruction = s.instruction || getScreenInstruction(screen);
    if (instruction && screenRoot) mountInstruction(screenRoot, instruction);

    if (screenRoot) {
      renderer.bindScreen(screenRoot, screen, function() {
        if (!s.awaitingContinue) {
          setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
        }
      });
    }

    setScreenInputsLocked(false);
    if (screenRoot) screenRoot.classList.remove('sp-screen--locked');
    setActionBtn('check', false);
    updateHeader();
  }

  function handleCheck() {
    var s = getSession();
    var root = getMount();
    if (!s || !root || !renderer) return;
    var screenRoot = root.querySelector('.sp-screen');
    var screen = s.currentScreen;
    if (!screenRoot || !screen || s.awaitingContinue) return;

    var result = renderer.checkScreen(screenRoot, screen);
    if (!result.correct && result.lifeLoss > 0) {
      applyLifeLoss(result.lifeLoss, screen);
      if (s.hearts && s.hearts.isGameOver) {
        screenRoot.classList.add('sp-screen--locked');
        showFailedScreen();
        return;
      }
    }
    if (result.correct) {
      s.correctCount = (s.correctCount || 0) + 1;
      s.sessionCorrect = (s.sessionCorrect || 0) + 1;
    }

    screenRoot.classList.add('sp-screen--locked');
    showFeedback(result);
    updateHeader();
  }

  function handleContinue() {
    var s = getSession();
    if (!s || !s.awaitingContinue) {
      if (s && s.passive && s.onContinueToNext) {
        s.onContinueToNext();
      }
      return;
    }
    if (s.hearts && s.hearts.isGameOver) {
      showFailedScreen();
      return;
    }

    s.awaitingContinue = false;
    s._lastFeedbackResult = null;
    s._lastResultCorrect = null;
    clearResultStyles();

    s.questionIndex++;
    if (s.questionIndex >= s.screens.length) {
      finishQuizSession();
      return;
    }
    renderCurrentScreen();
  }

  function handleSkip() {
    var s = getSession();
    var root = getMount();
    if (!s || s.awaitingContinue || !root || !renderer) return;
    if (s.hearts && s.hearts.isGameOver) return;

    var screen = s.currentScreen;
    var screenRoot = root.querySelector('.sp-screen');
    if (!screen || !screenRoot) return;

    var p = screen.payload || {};
    var result = {
      correct: false,
      explanation: p.explanation || '',
      correctAnswer: getScreenCorrectAnswer(screen),
      userAnswer: '',
      lifeLoss: 1
    };

    applyLifeLoss(1, screen);
    if (s.hearts && s.hearts.isGameOver) {
      screenRoot.classList.add('sp-screen--locked');
      showFailedScreen();
      return;
    }
    screenRoot.classList.add('sp-screen--locked');
    showFeedback(result);
    updateHeader();
  }

  function handleExplainClick() {
    var s = getSession();
    var result = s && s._lastFeedbackResult;
    var screen = s && s.currentScreen;
    if (!result || !result.explanation || typeof LessonExplanation === 'undefined') return;

    var explainOpts = {
      title: 'Explanation',
      context: (screen && screen.payload && screen.payload.sentence) || '',
      explanation: result.explanation,
      correctAnswer: result.correctAnswer || getScreenCorrectAnswer(screen),
      continueLabel: 'Continue'
    };
    var sessionEl = getMount() && getMount().querySelector('.sp-practice-session');
    if (sessionEl) {
      LessonExplanation.open(Object.assign({ inlineMount: sessionEl }, explainOpts));
      return;
    }
    LessonExplanation.open(explainOpts);
  }

  function bindSessionEvents(fe) {
    var root = getMount();
    if (!root) return;

    var actionBtn = root.querySelector('#sp-action-btn');
    if (actionBtn && !actionBtn._feVocabBound) {
      actionBtn._feVocabBound = true;
      actionBtn.addEventListener('click', function() {
        var s = getSession();
        if (!s) return;
        if (actionBtn.dataset.mode === 'check') handleCheck();
        else if (actionBtn.dataset.mode === 'continue') handleContinue();
      });
    }

    var skipBtn = root.querySelector('#sp-skip-btn');
    if (skipBtn && !skipBtn._feVocabBound) {
      skipBtn._feVocabBound = true;
      skipBtn.addEventListener('click', handleSkip);
    }

    var explainBtn = root.querySelector('#sp-explain-btn');
    if (explainBtn && !explainBtn._feVocabBound) {
      explainBtn._feVocabBound = true;
      explainBtn.addEventListener('click', handleExplainClick);
    }

    var exitBtn = root.querySelector('[data-action="exit-session"]');
    if (exitBtn && !exitBtn._feVocabBound) {
      exitBtn._feVocabBound = true;
      exitBtn.addEventListener('click', function() {
        var s = getSession();
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

  function bindResultEvents(fe, phase) {
    var root = getMount();
    if (!root) return;

    var retryBtn = root.querySelector('[data-action="retry-node"]');
    if (retryBtn && !retryBtn._feVocabBound) {
      retryBtn._feVocabBound = true;
      retryBtn.addEventListener('click', function() {
        var s = getSession();
        if (!s || !s._restartQuiz) return;
        s._restartQuiz();
      });
    }

    var backBtn = root.querySelector('[data-action="back-to-nodes"]');
    if (backBtn && !backBtn._feVocabBound) {
      backBtn._feVocabBound = true;
      backBtn.addEventListener('click', function() {
        var s = getSession();
        if (!s) return;
        fe.openCategory(s.categoryId);
      });
    }

    if (phase === 'complete') {
      var continueBtn = root.querySelector('[data-action="back-to-stage"]');
      if (continueBtn && !continueBtn._feVocabResultBound) {
        continueBtn._feVocabResultBound = true;
        continueBtn.addEventListener('click', function() {
          var s = getSession();
          if (!s || !s.onContinueToNext) return;
          s.onContinueToNext();
        });
      }
    }
  }

  function finishQuizSession() {
    var s = getSession();
    if (!s || !s.container) return;

    if (s.onPointComplete) s.onPointComplete(s.correctCount || 0, s.screens.length);

    s.container.innerHTML = buildCompleteHtml({
      pointLabel: s.pointLabel,
      lessonTitle: s.lessonTitle,
      correctCount: s.correctCount || 0,
      total: s.screens.length,
      livesLeft: s.hearts ? s.hearts.currentLives : 0,
      xp: (s.correctCount || 0) * 10
    });

    bindResultEvents(s.fe, 'complete');

    var continueBtn = s.container.querySelector('[data-action="back-to-stage"]');
    if (continueBtn) {
      var label = continueBtn.querySelector('.sp-btn-label');
      if (label) label.textContent = 'Continue';
      continueBtn.setAttribute('aria-label', 'Continue');
    }
  }

  function showFailedScreen() {
    var s = getSession();
    if (!s || !s.container) return;

    s.container.innerHTML = buildFailedHtml({
      pointLabel: s.pointLabel,
      lessonTitle: s.lessonTitle
    });

    bindResultEvents(s.fe, 'failed');
  }

  function startQuizSession(fe, container, opts) {
    opts = opts || {};
    var exercises = (opts.exercises || []).filter(function(ex) {
      return isWriteExercise(ex) || isMcqExercise(ex);
    });
    if (!exercises.length || !container) return false;

    if (getSession()) destroy();

    var screens = exercises.map(function(ex, i) { return exerciseToScreen(ex, i); });
    var maxLives = opts.maxLives != null ? opts.maxLives : 5;

    container.innerHTML = buildShellHtml({
      pointLabel: opts.pointLabel,
      lessonTitle: opts.lessonTitle,
      completed: 0,
      total: screens.length,
      lives: maxLives,
      maxLives: maxLives
    });

    var hearts = heartsMod && heartsMod.usePracticeHearts
      ? heartsMod.usePracticeHearts({
        maxLives: maxLives,
        onGameOver: function() {
          var active = getSession();
          if (!active || active.passive) return;
        }
      })
      : null;

    var session = {
      fe: fe,
      container: container,
      categoryId: opts.categoryId,
      catMeta: opts.catMeta,
      levelId: opts.levelId,
      lessonId: opts.lessonId,
      pointIndex: opts.pointIndex,
      lessonPoints: opts.lessonPoints,
      lessonTitle: opts.lessonTitle,
      pointLabel: opts.pointLabel,
      instruction: opts.instruction || '',
      passive: false,
      screens: screens,
      hearts: hearts,
      questionIndex: 0,
      correctCount: 0,
      sessionCorrect: 0,
      sessionTotal: screens.length,
      currentScreen: null,
      awaitingContinue: false,
      onPointComplete: opts.onPointComplete || null,
      onContinueToNext: opts.onContinueToNext || null,
      _restartQuiz: function() {
        startQuizSession(fe, container, opts);
      }
    };

    window._feVocabSession = session;
    bindSessionEvents(fe);
    renderCurrentScreen();
    return true;
  }

  function startPassiveSession(fe, container, opts) {
    opts = opts || {};
    if (!container) return false;
    if (getSession()) destroy();

    var total = opts.sessionTotal || 1;
    var completed = opts.sessionCorrect || 0;

    container.innerHTML = buildShellHtml({
      pointLabel: opts.pointLabel,
      lessonTitle: opts.lessonTitle,
      completed: completed,
      total: total,
      lives: 0,
      maxLives: 0
    });

    var session = {
      fe: fe,
      container: container,
      categoryId: opts.categoryId,
      catMeta: opts.catMeta,
      levelId: opts.levelId,
      lessonId: opts.lessonId,
      pointIndex: opts.pointIndex,
      lessonPoints: opts.lessonPoints,
      lessonTitle: opts.lessonTitle,
      pointLabel: opts.pointLabel,
      passive: true,
      sessionCorrect: completed,
      sessionTotal: total,
      onContinueToNext: opts.onContinue || null
    };

    window._feVocabSession = session;
    bindSessionEvents(fe);

    var screenMount = getScreenMount();
    if (!screenMount) return false;

    var header = getMount() && getMount().querySelector('.sp-practice-header');
    if (header) {
      var heartsEl = header.querySelector('.sp-hearts-bar');
      if (heartsEl) heartsEl.remove();
    }

    screenMount.innerHTML = '<div class="sp-screen sp-screen--vocab-passive">' + (opts.contentHtml || '') + '</div>';
    var screenRoot = screenMount.querySelector('.sp-screen');
    if (opts.instruction && screenRoot) mountInstruction(screenRoot, opts.instruction);

    setActionBtn('continue', true);
    var skipBtn = getMount() && getMount().querySelector('#sp-skip-btn');
    if (skipBtn) skipBtn.hidden = true;

    return true;
  }

  function mountInstruction(screenRoot, text) {
    if (!screenRoot || !text) return;
    var existing = screenRoot.querySelector('.sp-session-instruction');
    if (existing) existing.remove();
    var el = document.createElement('p');
    el.className = 'sp-session-instruction';
    el.textContent = text;
    screenRoot.insertBefore(el, screenRoot.firstChild);
  }

  function destroy() {
    window._feVocabSession = null;
  }

  window.FastExercisesVocabSession = {
    ensureSession: function(fe, container, opts) {
      if (opts && opts.passive) {
        return startPassiveSession(fe, container, {
          categoryId: opts.categoryId,
          catMeta: opts.catMeta,
          levelId: opts.levelId,
          lessonId: opts.lessonId,
          pointIndex: opts.pointIndex,
          lessonPoints: opts.lessonPoints,
          lessonTitle: opts.lessonTitle,
          pointLabel: opts.pointLabel,
          sessionCorrect: opts.sessionCorrect,
          sessionTotal: opts.sessionTotal,
          contentHtml: opts.contentHtml,
          instruction: opts.instruction,
          onContinue: opts.onContinue
        }) ? getScreenMount() : null;
      }
      return null;
    },
    startQuizSession: startQuizSession,
    startPassiveSession: startPassiveSession,
    destroy: destroy,
    getScreenMount: getScreenMount,
    mountInstruction: mountInstruction,
    setActionBtn: setActionBtn,
    updateHeader: updateHeader,
    setPassiveContinue: function(onContinue) {
      var s = getSession();
      if (!s) return;
      s.onContinueToNext = onContinue;
      setActionBtn('continue', true);
    },
    incrementProgress: function() {
      var s = getSession();
      if (!s) return;
      s.sessionCorrect = (s.sessionCorrect || 0) + 1;
      updateHeader();
    },
    setSessionTotal: function(total) {
      var s = getSession();
      if (!s) return;
      s.sessionTotal = total;
      updateHeader();
    }
  };
})();
