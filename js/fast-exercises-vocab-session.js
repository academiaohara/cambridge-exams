// js/fast-exercises-vocab-session.js
// SunePlay-style practice shell for course vocabulary (no lives)

(function() {
  'use strict';

  var screenRenderer = window.SunePlayScreenRenderer;

  function esc(str) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._escapeHTML) return DashboardNav._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    return esc(str).replace(/'/g, '&#39;');
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

  function progressBarHtml(completed, total) {
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return '<div class="sp-session-progress" data-component="SessionProgressBar">' +
      '<div class="sp-session-progress-track">' +
        '<div class="sp-session-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
    '</div>';
  }

  function buildShellHtml(opts) {
    opts = opts || {};
    var completed = opts.completed || 0;
    var total = opts.total || 1;
    return '<div class="fe-vocab-sp-lesson">' +
      '<div class="fe-vocab-sp-mount" id="feVocabSpMount">' +
        '<div class="sp-practice-session fe-vocab-sp-session" data-component="PracticeSession">' +
          '<header class="sp-practice-header fe-vocab-sp-header">' +
            '<button type="button" class="sp-header-btn sp-header-exit" data-action="exit-session" aria-label="Exit">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
            progressBarHtml(completed, total) +
          '</header>' +
          '<div class="sp-practice-main">' +
            '<div class="sp-practice-body">' +
              '<div class="sp-exercise-card" id="sp-screen-mount"></div>' +
            '</div>' +
            '<footer class="sp-practice-footer" id="sp-practice-footer">' +
              '<div class="sp-practice-footer-inner">' +
                '<div id="sp-feedback-mount" class="sp-feedback-mount"></div>' +
                '<div class="sp-practice-footer-actions">' +
                  '<button type="button" class="sp-btn sp-btn--skip" id="sp-skip-btn" aria-label="Skip">Skip</button>' +
                  '<div class="sp-footer-actions-right">' +
                    '<button type="button" class="sp-btn sp-btn--primary sp-btn--action" id="sp-action-btn" data-mode="check" disabled aria-label="Check">' +
                      '<span class="material-symbols-outlined">check</span>' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</footer>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function setActionBtn(mode, enabled) {
    var root = getMount();
    if (!root) return;
    var actionBtn = root.querySelector('#sp-action-btn');
    var skipBtn = root.querySelector('#sp-skip-btn');
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
    }

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
    if (progressEl) {
      progressEl.outerHTML = progressBarHtml(s.sessionCorrect || 0, s.sessionTotal || 1);
    }
  }

  function showFeedback(correct, correctAnswer) {
    var root = getMount();
    if (!root) return;
    var feedbackMount = root.querySelector('#sp-feedback-mount');
    if (!feedbackMount) return;
    var result = { correct: !!correct, correctAnswer: correctAnswer || '' };

    if (screenRenderer && screenRenderer.FeedbackSheet) {
      feedbackMount.innerHTML = screenRenderer.FeedbackSheet(result, {});
    } else {
      feedbackMount.innerHTML =
        '<div class="sp-feedback-sheet ' + (correct ? 'sp-feedback--correct' : 'sp-feedback--incorrect') + '">' +
          '<div class="sp-feedback-icon" aria-hidden="true">' + mi(correct ? 'check_circle' : 'cancel') + '</div>' +
          '<div class="sp-feedback-body">' +
            '<p class="sp-feedback-title">' + (correct ? 'Correct!' : 'Not quite.') + '</p>' +
            (!correct && correctAnswer ? '<p class="sp-feedback-answer"><span>Correct:</span> ' + esc(correctAnswer) + '</p>' : '') +
          '</div>' +
        '</div>';
    }

    if (window._feVocabSession) window._feVocabSession._lastCorrect = correct;
    setActionBtn('continue', true);
  }

  function bindEvents(fe) {
    var root = getMount();
    if (!root) return;

    var actionBtn = root.querySelector('#sp-action-btn');
    if (actionBtn && !actionBtn._feVocabBound) {
      actionBtn._feVocabBound = true;
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
    if (skipBtn && !skipBtn._feVocabBound) {
      skipBtn._feVocabBound = true;
      skipBtn.addEventListener('click', function() {
        var s = window._feVocabSession;
        if (!s || !s.onSkip) return;
        s.onSkip();
      });
    }

    var exitBtn = root.querySelector('[data-action="exit-session"]');
    if (exitBtn && !exitBtn._feVocabBound) {
      exitBtn._feVocabBound = true;
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

  function ensureSession(fe, container, opts) {
    if (!container) return null;
    opts = opts || {};

    var total = opts.sessionTotal || 1;
    var completed = opts.sessionCorrect || 0;

    container.innerHTML = buildShellHtml({
      completed: completed,
      total: total
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
    } else {
      setActionBtn('check', false);
    }

    return getScreenMount();
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

  function renderMcqScreen(exercise) {
    var options = exercise.options || [];
    var letters = 'ABCDEFGHIJ';
    var optHtml = '';
    options.forEach(function(opt, i) {
      var letter = letters.charAt(i);
      var raw = String(opt);
      var label = raw.replace(/^[A-D]\)\s*/i, '').trim() || raw;
      optHtml += '<button type="button" class="sp-option-btn" data-value="' + escAttr(raw) + '" data-letter="' + letter + '">' +
        '<span class="sp-option-num">' + letter + '</span>' +
        '<span class="sp-option-label">' + esc(label) + '</span>' +
      '</button>';
    });

    return '<div class="sp-screen sp-screen--choice" data-format="vocab_mcq">' +
      '<div class="sp-prompt-row sp-prompt-row--choice">' +
        '<p class="sp-prompt-sentence sp-speakable-sentence">' + esc(exercise.sentence || '') + '</p>' +
      '</div>' +
      '<div class="sp-option-grid sp-option-grid--quad" id="fe-vocab-mcq-options">' +
        optHtml +
      '</div>' +
    '</div>';
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

  function bindMcqSelection() {
    var root = getScreenMount();
    if (!root) return;
    var screen = root.querySelector('.sp-screen');
    root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
      if (btn._feVocabBound) return;
      btn._feVocabBound = true;
      btn.addEventListener('click', function() {
        if (screen && screen.classList.contains('sp-screen--locked')) return;
        root.querySelectorAll('.sp-option-btn').forEach(function(b) {
          b.classList.remove('sp-option-btn--selected');
        });
        btn.classList.add('sp-option-btn--selected');
        setActionBtn('check', true);
      });
    });
  }

  function bindWriteInput() {
    var input = document.getElementById('fe-vocab-write-input');
    if (!input || input._feVocabBound) return;
    input._feVocabBound = true;
    input.addEventListener('input', function() {
      setActionBtn('check', input.value.trim().length > 0);
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && input.value.trim()) {
        var s = window._feVocabSession;
        if (s && s.onCheck) s.onCheck();
      }
    });
    input.focus();
  }

  function lockScreen() {
    var root = getScreenMount();
    if (!root) return;
    var screen = root.querySelector('.sp-screen');
    if (screen) screen.classList.add('sp-screen--locked');
    root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
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
  }

  window.FastExercisesVocabSession = {
    ensureSession: ensureSession,
    destroy: destroy,
    getScreenMount: getScreenMount,
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
