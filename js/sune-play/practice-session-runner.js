// js/sune-play/practice-session-runner.js
// Shared check → feedback → continue loop for Sune Play practice sessions

(function() {
  'use strict';

  var queueMod = window.SunePlayQueue;
  var heartsMod = window.SunePlayHearts;
  var renderer = window.SunePlayScreenRenderer;
  var practiceUI = window.SunePlayPracticeUI;
  var screenUtils = window.SunePlayPracticeScreenUtils;

  function create(config) {
    config = config || {};
    var state = config.state;
    if (!state) throw new Error('SunePlayPracticeSessionRunner requires state');

    var globalRules = config.globalRules || {};
    var feedbackTone = config.feedbackTone || 'practice';
    var getScreenInstruction = config.getScreenInstruction || (screenUtils && screenUtils.getScreenInstruction);
    var getScreenContext = config.getScreenContext || (screenUtils && screenUtils.getScreenContext);
    var getScreenCorrectAnswer = config.getScreenCorrectAnswer || (screenUtils && screenUtils.getScreenCorrectAnswer);
    var resolveInstruction = (screenUtils && screenUtils.resolveInstruction) || function(t) { return t; };
    function getMount() {
      return config.getMount ? config.getMount() : null;
    }

    function setActionBtn(mode, enabled) {
      var mount = getMount();
      if (!mount) return;
      var actionBtn = mount.querySelector('#sp-action-btn');
      var skipBtn = mount.querySelector('#sp-skip-btn');
      var explainBtn = mount.querySelector('#sp-explain-btn');
      var footer = mount.querySelector('#sp-practice-footer');
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
      actionBtn.classList.toggle('sp-btn--correct', mode === 'continue' && state._lastResultCorrect);
      actionBtn.classList.toggle('sp-btn--incorrect', mode === 'continue' && state._lastResultCorrect === false);
      actionBtn.classList.remove('sp-btn--retry-mode');

      if (skipBtn) {
        var showSkip = config.allowSkip && mode === 'check';
        skipBtn.hidden = !showSkip;
        skipBtn.disabled = state.hearts && state.hearts.isGameOver;
      }
      if (explainBtn) {
        var hasFeedbackExplanation = state._lastFeedbackResult && state._lastFeedbackResult.explanation;
        var hasColumnMatchExplanation = !!state._cmExplainContext;
        explainBtn.hidden = (mode === 'check' && !hasColumnMatchExplanation) ||
          (mode === 'continue' && !hasFeedbackExplanation);
      }
      if (footer) {
        footer.classList.toggle(
          'sp-practice-footer--explain-available',
          mode === 'check' && !!state._cmExplainContext
        );
      }
      var practiceMain = mount.querySelector('.sp-practice-main');
      var isFeedback = mode === 'continue';
      var isCorrect = state._lastResultCorrect === true;
      var isIncorrect = state._lastResultCorrect === false;
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
      var mount = getMount();
      if (!mount) return;
      mount.querySelectorAll('.sp-screen input, .sp-screen textarea').forEach(function(el) {
        el.readOnly = locked;
      });
    }

    function applyGapResultStyles(correct) {
      var mount = getMount();
      if (!mount) return;
      if (state.currentScreen && state.currentScreen.formatType === 'passage_gap_fill') {
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
      var mount = getMount();
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

    function applyLifeLoss(amount, screen) {
      if (!state.hearts || amount <= 0) return 0;
      var lostAmount = state.hearts.loseLife(amount, {
        screenId: screen && screen.screenId,
        itemId: screen && screen.itemId,
        maxLifeLossPerScreen: screen && screen.maxLifeLossPerScreen
      });
      if (lostAmount) state.sessionLivesLost = (state.sessionLivesLost || 0) + lostAmount;
      return lostAmount;
    }

    function updateSessionHeader() {
      var mount = getMount();
      if (!mount) return;
      var header = mount.querySelector('.sp-practice-header');
      if (!header) return;
      var progressEl = header.querySelector('.sp-session-progress');
      if (progressEl && practiceUI) {
        progressEl.outerHTML = practiceUI.SessionProgressBar(state.sessionCorrect || 0, state.sessionTotal || 1);
      }
      var heartsEl = header.querySelector('.sp-hearts-bar');
      if (heartsEl && state.hearts) {
        heartsEl.outerHTML = practiceUI.HeartsBar(state.hearts.currentLives, state.hearts.maxLives);
      }
    }

    function showFeedback(result) {
      if (window.AudioUtils) {
        if (result.correct) AudioUtils.playSuccessSound();
        else AudioUtils.playFailureSound();
      }
      var mount = getMount();
      var feedbackMount = mount && mount.querySelector('#sp-feedback-mount');
      if (feedbackMount && renderer) {
        feedbackMount.innerHTML = renderer.FeedbackSheet(result, feedbackTone);
      }
      state.awaitingContinue = true;
      state._lastFeedbackResult = result;
      state._lastResultCorrect = result.correct;
      applyGapResultStyles(result.correct);
      setScreenInputsLocked(true);
      setActionBtn('continue', true);
    }

    function restoreFeedback(result) {
      var mount = getMount();
      if (!mount || !result) return;
      var feedbackMount = mount.querySelector('#sp-feedback-mount');
      if (feedbackMount && renderer) {
        feedbackMount.innerHTML = renderer.FeedbackSheet(result, feedbackTone);
      }
      state.awaitingContinue = true;
      state._lastFeedbackResult = result;
      state._lastResultCorrect = result.correct;
      applyGapResultStyles(result.correct);
      setScreenInputsLocked(true);
      setActionBtn('continue', true);
      var screenRoot = mount.querySelector('.sp-screen');
      if (screenRoot) screenRoot.classList.add('sp-screen--locked');
    }

    function handleCheck() {
      var mount = getMount();
      var screenRoot = mount && mount.querySelector('.sp-screen');
      var screen = state.currentScreen;
      if (!screenRoot || !screen || !renderer) return;

      if (config.checkHandler) {
        var custom = config.checkHandler({
          screenRoot: screenRoot,
          screen: screen,
          state: state,
          runner: runner,
          defaultCheck: defaultCheck
        });
        if (custom && custom.handled) return;
      }

      defaultCheck(screenRoot, screen);
    }

    function defaultCheck(screenRoot, screen) {
      if (!renderer) return;
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
        state.queue.removeCompletedItem(screen);
        state.sessionCorrect++;
        showFeedback(result);
      } else {
        screenRoot.classList.add('sp-screen--locked');
        var failCount = state.queue.incrementFailure(screen);
        if (result.shouldRequeue || globalRules.failedItemsReturnToQueue !== false) {
          state.queue.returnFailedItemToQueue(screen);
        } else {
          state.queue.removeCompletedItem(screen);
        }
        if (failCount >= (globalRules.maxRepeatedFailuresBeforeFallback || 2)) {
          screen = state.queue.applyFallbackIfNeeded(screen);
          if (screen._isFallback) state.queue.returnFailedItemToQueue(screen, 'front');
        }
        showFeedback(result);
      }

      updateSessionHeader();
    }

    function handleContinue() {
      var mount = getMount();
      if (state.hearts && state.hearts.isGameOver) return;

      var screen = state.currentScreen;
      var screenRoot = mount && mount.querySelector('.sp-screen');
      var feedbackMount = mount && mount.querySelector('#sp-feedback-mount');
      var footer = mount && mount.querySelector('#sp-practice-footer');
      var lastResult = state._lastHuntResult;

      if (config.continueHandler) {
        var handled = config.continueHandler({
          screen: screen,
          screenRoot: screenRoot,
          lastResult: lastResult,
          state: state,
          runner: runner,
          clearFeedbackUi: clearFeedbackUi,
          renderCurrentScreen: renderCurrentScreen,
          setActionBtn: setActionBtn,
          setScreenInputsLocked: setScreenInputsLocked,
          updateSessionHeader: updateSessionHeader
        });
        if (handled) return;
      }

      clearFeedbackUi(feedbackMount, footer);
      renderCurrentScreen();
    }

    function clearFeedbackUi(feedbackMount, footer) {
      state.awaitingContinue = false;
      state._lastFeedbackResult = null;
      state._lastResultCorrect = null;
      state._lastHuntResult = null;
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
    }

    function renderCurrentScreen() {
      if (window.AudioUtils) AudioUtils.stopPhrasePlayback();
      var mount = getMount();
      var screenMount = mount && mount.querySelector('#sp-screen-mount');
      var feedbackMount = mount && mount.querySelector('#sp-feedback-mount');
      var footer = mount && mount.querySelector('#sp-practice-footer');
      if (!screenMount || !renderer) return;

      clearFeedbackUi(feedbackMount, footer);
      state._cmExplainContext = null;

      var screen = state.queue && state.queue.currentScreen;
      if (!screen) {
        if (config.onQueueEmpty) {
          config.onQueueEmpty({
            sessionCorrect: state.sessionCorrect,
            sessionTotal: state.sessionTotal,
            sessionLivesLost: state.sessionLivesLost || 0,
            hearts: state.hearts
          });
        }
        return;
      }

      screen = state.queue.applyFallbackIfNeeded(screen);
      state.currentScreen = screen;

      screenMount.innerHTML = renderer.PracticeScreenRenderer(screen);
      var screenRoot = screenMount.querySelector('.sp-screen');
      var instructionSource = getScreenInstruction ? getScreenInstruction(screen) : '';
      var instructionText = resolveInstruction(instructionSource);
      if (instructionText && screenRoot) {
        var existingInstruction = screenRoot.querySelector('.sp-session-instruction');
        if (existingInstruction) existingInstruction.remove();
        var instructionEl = document.createElement('p');
        instructionEl.className = 'sp-session-instruction';
        instructionEl.setAttribute('data-instruction-source', instructionSource);
        instructionEl.textContent = instructionText;
        screenRoot.insertBefore(instructionEl, screenRoot.firstChild);
      }
      if (screenRoot) {
        screenRoot._spScreen = screen;
        renderer.bindScreen(screenRoot, screen, function() {
          if (!state.awaitingContinue) {
            if (config.onScreenReady) {
              config.onScreenReady(screenRoot, screen);
            } else if (screen.formatType === 'column_matching' && config.updateColumnMatchExplainBtn) {
              config.updateColumnMatchExplainBtn(screenRoot, screen);
            } else {
              setActionBtn('check', renderer.isScreenReady(screenRoot, screen));
            }
          }
        });
        if (config.onScreenRendered) {
          config.onScreenRendered(screenRoot, screen);
        }
      }
      setScreenInputsLocked(false);
      setActionBtn('check', false);
      updateSessionHeader();
    }

    function handleActionClick() {
      var mount = getMount();
      var actionBtn = mount && mount.querySelector('#sp-action-btn');
      if (!actionBtn || actionBtn.disabled) return;

      var screenRoot = mount.querySelector('.sp-screen');
      var screen = state.currentScreen;

      if (config.onActionClick) {
        var handled = config.onActionClick({
          screenRoot: screenRoot,
          screen: screen,
          state: state,
          awaitingContinue: state.awaitingContinue,
          handleCheck: handleCheck,
          handleContinue: handleContinue,
          runner: runner
        });
        if (handled) return;
      }

      if (state.awaitingContinue) {
        handleContinue();
        return;
      }
      handleCheck();
    }

    function handleSkip() {
      if (!config.allowSkip) return;
      if (state.awaitingContinue) return;
      if (state.hearts && state.hearts.isGameOver) return;

      if (config.onSkip) {
        config.onSkip({
          state: state,
          runner: runner,
          renderCurrentScreen: renderCurrentScreen
        });
        return;
      }

      var mount = getMount();
      var screen = state.currentScreen;
      var screenRoot = mount && mount.querySelector('.sp-screen');
      if (!screen || !screenRoot) return;

      var p = screen.payload || {};
      var result = {
        correct: false,
        explanation: p.explanation || '',
        correctAnswer: getScreenCorrectAnswer ? getScreenCorrectAnswer(screen) : '',
        userAnswer: '',
        lifeLoss: 1
      };

      screen._attemptsUsed = (screen.attemptsPerScreen || 1);
      screenRoot.classList.add('sp-screen--locked');
      setScreenInputsLocked(true);
      applyLifeLoss(1, screen);
      state.queue.incrementFailure(screen);
      if (globalRules.failedItemsReturnToQueue !== false) {
        state.queue.returnFailedItemToQueue(screen);
      } else {
        state.queue.removeCompletedItem(screen);
      }
      showFeedback(result);
      updateSessionHeader();
    }

    function handleExplainClick() {
      var mount = getMount();
      var cmContext = state._cmExplainContext;
      if (cmContext && typeof LessonExplanation !== 'undefined') {
        var sessionEl = mount && mount.querySelector('.sp-practice-session');
        var explainOpts = Object.assign({ title: 'Explanation', continueLabel: 'Close' }, cmContext);
        if (sessionEl) {
          LessonExplanation.open(Object.assign({ inlineMount: sessionEl }, explainOpts));
          return;
        }
        if (mount) {
          LessonExplanation.open(Object.assign({ inlineMount: mount }, explainOpts));
          return;
        }
        LessonExplanation.open(explainOpts);
        return;
      }

      var result = state._lastFeedbackResult;
      var screen = state.currentScreen;
      if (!result || !result.explanation || typeof LessonExplanation === 'undefined') return;
      var explainOpts2 = {
        title: 'Explanation',
        context: getScreenContext ? getScreenContext(screen) : '',
        explanation: result.explanation,
        correctAnswer: result.correctAnswer || (getScreenCorrectAnswer ? getScreenCorrectAnswer(screen) : ''),
        continueLabel: 'Continue'
      };
      var sessionEl2 = mount && mount.querySelector('.sp-practice-session');
      if (sessionEl2) {
        LessonExplanation.open(Object.assign({ inlineMount: sessionEl2 }, explainOpts2));
        return;
      }
      if (mount) {
        LessonExplanation.open(Object.assign({ inlineMount: mount }, explainOpts2));
        return;
      }
      LessonExplanation.open(explainOpts2);
    }

    function bindSessionEvents() {
      var mount = getMount();
      if (!mount) return;

      function rebind(btn, handler) {
        if (!btn || !btn.parentNode) return btn;
        var clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
        clone.addEventListener('click', handler);
        return clone;
      }

      var actionBtn = mount.querySelector('#sp-action-btn');
      if (actionBtn) rebind(actionBtn, handleActionClick);

      var skipBtn = mount.querySelector('#sp-skip-btn');
      if (skipBtn && config.allowSkip) rebind(skipBtn, handleSkip);

      var explainBtn = mount.querySelector('#sp-explain-btn');
      if (explainBtn) rebind(explainBtn, handleExplainClick);

      if (config.onBindSessionEvents) {
        config.onBindSessionEvents(mount);
      }
    }

    function start(screenList, startOpts) {
      startOpts = startOpts || {};
      if (!queueMod || !heartsMod) return;

      if (!state.queue) {
        state.queue = queueMod.createPracticeQueue(screenList, {
          maxFailuresBeforeFallback: globalRules.maxRepeatedFailuresBeforeFallback || 2
        });
      }
      if (!state.hearts) {
        state.hearts = heartsMod.usePracticeHearts({
          maxLives: startOpts.maxLives || 5,
          onGameOver: config.onGameOver || function() {}
        });
      }

      state.sessionCorrect = startOpts.sessionCorrect || 0;
      state.sessionTotal = startOpts.sessionTotal != null ? startOpts.sessionTotal : (screenList ? screenList.length : 0);
      state.sessionLivesLost = 0;
      state.currentScreen = null;
      state.awaitingContinue = false;
      state._lastFeedbackResult = null;
      state._lastResultCorrect = null;
      state._lastHuntResult = null;
      state._cmExplainContext = null;

      bindSessionEvents();
      renderCurrentScreen();
    }

    function destroy() {}

    var runner = {
      start: start,
      renderCurrentScreen: renderCurrentScreen,
      handleCheck: handleCheck,
      handleContinue: handleContinue,
      handleActionClick: handleActionClick,
      handleSkip: handleSkip,
      handleExplainClick: handleExplainClick,
      showFeedback: showFeedback,
      restoreFeedback: restoreFeedback,
      applyLifeLoss: applyLifeLoss,
      updateSessionHeader: updateSessionHeader,
      setActionBtn: setActionBtn,
      setScreenInputsLocked: setScreenInputsLocked,
      clearResultStyles: clearResultStyles,
      bindSessionEvents: bindSessionEvents,
      destroy: destroy,
      defaultCheck: defaultCheck
    };

    return runner;
  }

  window.SunePlayPracticeSessionRunner = {
    create: create
  };
})();
