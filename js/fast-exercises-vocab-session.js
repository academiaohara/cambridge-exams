// js/fast-exercises-vocab-session.js
// SunePlay-style practice shell for course vocabulary exercises (PV, idioms, word formation)

(function() {
  'use strict';

  var practiceUI = window.SunePlayPracticeUI;
  var heartsMod = window.SunePlayHearts;
  var screenRenderer = window.SunePlayScreenRenderer;

  function esc(str) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._escapeHTML) return DashboardNav._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

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

  function setActionBtn(mode, enabled) {
    var root = getMount();
    if (!root) return;
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
    actionBtn.classList.toggle('sp-btn--correct', mode === 'continue' && window._feVocabSession && window._feVocabSession._lastCorrect === true);
    actionBtn.classList.toggle('sp-btn--incorrect', mode === 'continue' && window._feVocabSession && window._feVocabSession._lastCorrect === false);

    if (skipBtn) {
      skipBtn.hidden = mode !== 'check' || (window._feVocabSession && window._feVocabSession.passive);
      skipBtn.disabled = window._feVocabSession && window._feVocabSession.hearts && window._feVocabSession.hearts.isGameOver;
    }
    if (explainBtn) explainBtn.hidden = true;

    var isFeedback = mode === 'continue';
    var isCorrect = window._feVocabSession && window._feVocabSession._lastCorrect === true;
    var isIncorrect = window._feVocabSession && window._feVocabSession._lastCorrect === false;
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

  function updateHeader() {
    var s = window._feVocabSession;
    var root = getMount();
    if (!s || !root) return;
    var header = root.querySelector('.sp-practice-header');
    if (!header) return;
    var progressEl = header.querySelector('.sp-session-progress');
    if (progressEl && practiceUI) {
      progressEl.outerHTML = practiceUI.SessionProgressBar(s.sessionCorrect || 0, s.sessionTotal || 1);
    }
    var heartsEl = header.querySelector('.sp-hearts-bar');
    if (heartsEl && s.hearts && practiceUI) {
      heartsEl.outerHTML = practiceUI.HeartsBar(s.hearts.currentLives, s.hearts.maxLives);
    }
  }

  function showFeedback(correct, correctAnswer) {
    var root = getMount();
    if (!root || !screenRenderer) return;
    var feedbackMount = root.querySelector('#sp-feedback-mount');
    if (!feedbackMount) return;
    var result = { correct: !!correct, correctAnswer: correctAnswer || '' };
    feedbackMount.innerHTML = screenRenderer.FeedbackSheet(result, 'practice');
    window._feVocabSession._lastCorrect = correct;
    setActionBtn('continue', true);
  }

  function bindEvents(fe) {
    var root = getMount();
    if (!root || root._feVocabBound) return;
    root._feVocabBound = true;

    var actionBtn = root.querySelector('#sp-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', function() {
        var s = window._feVocabSession;
        if (!s) return;
        if (actionBtn.dataset.mode === 'check') {
          if (s.onCheck) s.onCheck();
        } else if (actionBtn.dataset.mode === 'continue') {
          if (s.onContinue) s.onContinue();
        }
      });
    }

    var skipBtn = root.querySelector('#sp-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        var s = window._feVocabSession;
        if (!s || !s.onSkip) return;
        s.onSkip();
      });
    }

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
        setActionBtn('check', false);
        hideActionBtn();
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
      questionIndex: 0,
      _lastCorrect: null,
      onCheck: null,
      onContinue: null,
      onSkip: null,
      onRetry: null
    };

    bindEvents(fe);

    if (opts.passive) {
      setActionBtn('continue', true);
      var skipBtn = getMount() && getMount().querySelector('#sp-skip-btn');
      if (skipBtn) skipBtn.hidden = true;
      var actionBtn = getMount() && getMount().querySelector('#sp-action-btn');
      if (actionBtn) {
        actionBtn.dataset.mode = 'continue';
        var icon = actionBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'arrow_forward';
        actionBtn.classList.add('sp-btn--continue-mode');
        actionBtn.setAttribute('aria-label', 'Continue');
      }
    } else {
      setActionBtn('check', false);
    }

    return getScreenMount();
  }

  function actionBtnHidden() {
    var root = getMount();
    var btn = root && root.querySelector('#sp-action-btn');
    return btn && btn.hidden;
  }

  function hideActionBtn() {
    var btn = getMount() && getMount().querySelector('#sp-action-btn');
    if (btn) btn.hidden = true;
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

  function renderMcqScreen(exercise, questionNum, total) {
    var options = exercise.options || [];
    var letters = 'ABCDEFGHIJ';
    var optHtml = '';
    options.forEach(function(opt, i) {
      var letter = letters.charAt(i);
      var label = String(opt).replace(/^[A-D]\)\s*/i, '').trim() || opt;
      optHtml += '<button type="button" class="sp-option-btn" data-value="' + esc(opt) + '" data-letter="' + letter + '">' +
        '<span class="sp-option-num">' + letter + '</span>' +
        '<span class="sp-option-label">' + esc(label) + '</span>' +
      '</button>';
    });

    var sentence = exercise.sentence || '';
    var html = '<div class="sp-screen sp-screen--choice" data-format="vocab_mcq">' +
      '<div class="sp-prompt-row sp-prompt-row--choice">' +
        '<p class="sp-prompt-sentence sp-speakable-sentence">' + esc(sentence) + '</p>' +
      '</div>' +
      '<div class="sp-option-grid sp-option-grid--quad" id="fe-vocab-mcq-options">' +
        optHtml +
      '</div>' +
    '</div>';
    return html;
  }

  function renderWriteScreen(exercise) {
    var hintHtml = exercise.hint
      ? '<span class="sp-gap-verb-ref"><span class="sp-hint-word">' + esc(exercise.hint) + '</span></span>'
      : '';
    return '<div class="sp-screen sp-screen--gap sp-screen--write" data-format="vocab_write">' +
      '<div class="sp-prompt-row">' +
        '<p class="sp-prompt-sentence">' + esc(exercise.sentence || '') + '</p>' +
      '</div>' +
      (hintHtml ? '<div class="sp-write-hint-row">' + hintHtml + '</div>' : '') +
      '<div class="sp-write-input-row">' +
        '<input type="text" class="sp-gap-input fe-vocab-write-input" id="fe-vocab-write-input" ' +
          'placeholder="Type your answer…" autocomplete="off" autocapitalize="off" spellcheck="false" />' +
      '</div>' +
    '</div>';
  }

  function bindMcqSelection(onReady) {
    var root = getScreenMount();
    if (!root) return;
    var screen = root.querySelector('.sp-screen');
    root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (screen && screen.classList.contains('sp-screen--locked')) return;
        root.querySelectorAll('.sp-option-btn').forEach(function(b) {
          b.classList.remove('sp-option-btn--selected');
        });
        btn.classList.add('sp-option-btn--selected');
        if (onReady) onReady(true);
        setActionBtn('check', true);
      });
    });
  }

  function bindWriteInput(onReady) {
    var input = document.getElementById('fe-vocab-write-input');
    if (!input) return;
    function sync() {
      var ready = input.value.trim().length > 0;
      if (onReady) onReady(ready);
      setActionBtn('check', ready);
    }
    input.addEventListener('input', sync);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && input.value.trim()) {
        var s = window._feVocabSession;
        if (s && s.onCheck) s.onCheck();
      }
    });
    input.focus();
  }

  function lockScreen() {
    var screen = getScreenMount() && getScreenMount().querySelector('.sp-screen');
    if (screen) screen.classList.add('sp-screen--locked');
    getScreenMount().querySelectorAll('.sp-option-btn').forEach(function(btn) {
      btn.disabled = true;
    });
    var input = document.getElementById('fe-vocab-write-input');
    if (input) input.readOnly = true;
  }

  function markMcqResult(selectedBtn, correctValue) {
    var root = getScreenMount();
    if (!root) return;
    root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
      var val = btn.getAttribute('data-value') || '';
      var isSelected = btn === selectedBtn;
      var isCorrect = val.trim().toLowerCase() === String(correctValue).trim().toLowerCase();
      btn.classList.toggle('sp-option-btn--correct', isCorrect);
      btn.classList.toggle('sp-option-btn--incorrect', isSelected && !isCorrect);
    });
  }

  function destroy() {
    window._feVocabSession = null;
    var mount = getMount();
    if (mount) mount._feVocabBound = false;
  }

  window.FastExercisesVocabSession = {
    ensureSession: ensureSession,
    destroy: destroy,
    getScreenMount: getScreenMount,
    getSessionRoot: getSessionRoot,
    mountInstruction: mountInstruction,
    renderMcqScreen: renderMcqScreen,
    renderWriteScreen: renderWriteScreen,
    bindMcqSelection: bindMcqSelection,
    bindWriteInput: bindWriteInput,
    lockScreen: lockScreen,
    markMcqResult: markMcqResult,
    showFeedback: showFeedback,
    clearResultStyles: clearResultStyles,
    setActionBtn: setActionBtn,
    updateHeader: updateHeader,
    setPassiveContinue: function(onContinue) {
      var s = window._feVocabSession;
      if (!s) return;
      s.passive = true;
      s.onContinue = onContinue;
      setActionBtn('continue', true);
      var skipBtn = getMount() && getMount().querySelector('#sp-skip-btn');
      if (skipBtn) skipBtn.hidden = true;
    },
    incrementProgress: function() {
      var s = window._feVocabSession;
      if (!s) return;
      s.sessionCorrect = (s.sessionCorrect || 0) + 1;
      updateHeader();
    },
    setSessionTotal: function(total) {
      var s = window._feVocabSession;
      if (!s) return;
      s.sessionTotal = total;
      updateHeader();
    }
  };
})();
