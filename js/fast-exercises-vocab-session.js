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

  function countGaps(sentence) {
    var normalized = normalizeGapSentence(sentence);
    var matches = normalized.match(/_{2,}|\.{3,}/g);
    return matches ? matches.length : 0;
  }

  function shuffleArray(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
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

  function splitMcGapPrompt(sentence, gapCount) {
    var normalized = normalizeGapSentence(sentence);
    if (gapCount <= 1) {
      var parts = splitGapSentence(sentence);
      return {
        gapCount: 1,
        sentenceBefore: parts.sentenceBefore,
        sentenceAfter: parts.sentenceAfter,
        segments: null
      };
    }
    var segments = normalized.split(/_{2,}|\.{3,}/).map(function(part) {
      return part.trim();
    });
    return {
      gapCount: gapCount,
      sentenceBefore: '',
      sentenceAfter: '',
      segments: segments
    };
  }

  function resolveGapDisplayParts(answer, gapCount) {
    var resolved = String(answer || '').trim();
    if (gapCount <= 1) return [resolved];
    return resolved.split(/\s+/).filter(Boolean);
  }

  function buildOptionGapDisplayMap(options, correct, gapCount) {
    var correctStr = String(correct || '').trim().toLowerCase();
    var map = {};
    (options || []).forEach(function(opt) {
      var text = String(opt).replace(/^[A-D]\)\s*/i, '').trim();
      map[text] = text.toLowerCase() === correctStr
        ? resolveGapDisplayParts(correct, gapCount)
        : resolveGapDisplayParts(text, gapCount);
    });
    return map;
  }

  function parseVerbPromptHint(hint) {
    var trimmed = String(hint || '').trim();
    if (!/^_/.test(trimmed)) return { particle: '', display: trimmed };
    var particle = trimmed.replace(/^_+\s*/, '').trim();
    return { particle: particle, display: particle };
  }

  function stripHintParticleFromSentence(sentence, particle) {
    if (!particle) return sentence;
    var normalized = normalizeGapSentence(sentence);
    var chunks = normalized.split(/(_{2,}|\.{3,})/);
    if (chunks.length < 3) return sentence;
    var afterGap = chunks[2] || '';
    var particleEsc = particle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var stripped = afterGap.replace(new RegExp('^\\s*' + particleEsc + '(?=\\s|$|[,.!?;:])', 'i'), '');
    if (stripped === afterGap) return sentence;
    chunks[2] = stripped;
    return chunks.join('').replace(/\s+/g, ' ').trim();
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

  function parseConvBracket(inner) {
    var sepIdx = inner.indexOf('|');
    if (sepIdx === -1) sepIdx = inner.indexOf('/');
    return {
      displayForm: (sepIdx !== -1 ? inner.slice(0, sepIdx) : inner).trim(),
      answer: (sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner).trim()
    };
  }

  function convLineFilledText(text) {
    return String(text || '').replace(/\[([^\]]+)\]/g, function(match, inner) {
      return parseConvBracket(inner).displayForm;
    });
  }

  function buildConvGapWriteExercises(conversations) {
    var exercises = [];
    (conversations || []).forEach(function(conv, convIdx) {
      (conv.lines || []).forEach(function(line, lineIdx) {
        if (!/\[([^\]]+)\]/.test(line.text || '')) return;
        var bracket = (line.text.match(/\[([^\]]+)\]/) || [])[1];
        if (!bracket) return;
        var parsed = parseConvBracket(bracket);
        var accepted = [];
        [parsed.answer, parsed.displayForm].forEach(function(val) {
          var trimmed = String(val || '').trim();
          if (trimmed && accepted.indexOf(trimmed) === -1) accepted.push(trimmed);
        });
        exercises.push({
          type: 'conversation-gap',
          conversationTitle: conv.title || '',
          conversationIndex: convIdx,
          activeLineIndex: lineIdx,
          lines: (conv.lines || []).map(function(entry) {
            return { speaker: entry.speaker || '', text: entry.text || '' };
          }),
          correct: parsed.answer,
          acceptedAnswers: accepted,
          hint: line.speaker || '',
          explanation: ''
        });
      });
    });
    return exercises;
  }

  function isConversationGapExercise(ex) {
    return !!(ex && ex.type === 'conversation-gap' && ex.lines && ex.lines.length);
  }

  function buildConversationGapLinesPayload(lines, activeLineIndex) {
    var speakers = {};
    var speakerIdx = 0;
    return (lines || []).map(function(line, li) {
      if (!(line.speaker in speakers)) speakers[line.speaker] = speakerIdx++;
      var side = speakers[line.speaker] % 2 === 0 ? 'left' : 'right';
      var rawText = line.text || '';
      var isActive = li === activeLineIndex;
      var match = rawText.match(/\[([^\]]+)\]/);
      if (!match) {
        return {
          speaker: line.speaker || '',
          side: side,
          mode: 'plain',
          text: convLineFilledText(rawText),
          isActive: isActive
        };
      }
      var parsed = parseConvBracket(match[1]);
      if (isActive) {
        return {
          speaker: line.speaker || '',
          side: side,
          mode: 'gap',
          before: rawText.slice(0, match.index),
          after: rawText.slice(match.index + match[0].length),
          isActive: true
        };
      }
      return {
        speaker: line.speaker || '',
        side: side,
        mode: 'plain',
        text: convLineFilledText(rawText),
        isActive: false
      };
    });
  }

  function exerciseToScreen(exercise, index) {
    var id = 'vocab-screen-' + index;

    if (isConversationGapExercise(exercise)) {
      return {
        screenId: id,
        formatType: 'conversation_gap_fill',
        payload: {
          conversationTitle: exercise.conversationTitle || '',
          lines: buildConversationGapLinesPayload(exercise.lines, exercise.activeLineIndex),
          activeLineIndex: exercise.activeLineIndex,
          answer: exercise.correct,
          acceptedAnswers: exercise.acceptedAnswers || [exercise.correct],
          instruction: '',
          explanation: exercise.explanation || ''
        }
      };
    }

    if (isWriteExercise(exercise)) {
      var writeSentence = normalizeGapSentence(exercise.sentence || '');
      if (!GAP_RE.test(writeSentence)) writeSentence = (writeSentence + ' ___').trim();
      var hint = exercise.hint || exercise.root || '';
      var useVerbPrompt = hint && /^_/.test(hint);
      var verbPrompt = hint;
      if (useVerbPrompt) {
        var parsedHint = parseVerbPromptHint(hint);
        writeSentence = stripHintParticleFromSentence(writeSentence, parsedHint.particle);
        verbPrompt = parsedHint.display;
      }
      var writeInstruction = '';
      if (exercise.type === 'transform' && hint) {
        writeInstruction = 'Complete the gap.';
      } else if (hint && !useVerbPrompt) {
        writeInstruction = 'Complete the gap. Hint: ' + hint;
      }
      return {
        screenId: id,
        formatType: useVerbPrompt ? 'preselected_verb_gap_fill' : 'free_text_gap_fill',
        payload: {
          sentence: writeSentence,
          answer: exercise.correct,
          acceptedAnswers: [exercise.correct],
          preselectedVerb: useVerbPrompt ? verbPrompt : '',
          verbPrompt: (exercise.type === 'transform' && hint) ? String(hint).toUpperCase() : (useVerbPrompt ? verbPrompt : ''),
          instruction: writeInstruction,
          explanation: exercise.explanation || ''
        }
      };
    }

    var shuffledOptions = shuffleArray(exercise.options || []);
    var normalizedSentence = normalizeGapSentence(exercise.sentence || '');
    var gapCount = countGaps(normalizedSentence);
    var hasGap = gapCount > 0;

    if (!hasGap) {
      return {
        screenId: id,
        formatType: 'meaning_contrast',
        payload: {
          sentence: exercise.sentence || '',
          options: shuffledOptions,
          answer: exercise.correct,
          explanation: exercise.explanation || ''
        }
      };
    }

    var mcOptions = buildMcOptions(shuffledOptions);
    var promptParts = splitMcGapPrompt(exercise.sentence || '', gapCount);
    return {
      screenId: id,
      formatType: 'mc_4_option',
      payload: {
        sentenceBefore: promptParts.sentenceBefore,
        sentenceAfter: promptParts.sentenceAfter,
        segments: promptParts.segments,
        gapCount: promptParts.gapCount,
        rootWord: exercise.root || '',
        optionGapDisplayValues: buildOptionGapDisplayMap(shuffledOptions, exercise.correct, promptParts.gapCount),
        options: mcOptions,
        answer: findMcAnswerLetter(mcOptions, exercise.correct),
        answerText: exercise.correct,
        instruction: 'Choose the option that best fits.',
        explanation: exercise.explanation || ''
      }
    };
  }

  function buildLessonShellHtml(innerHtml) {
    return '<div class="course-unit-content">' +
      '<div id="sp-lesson-mount" class="sp-lesson-mount course-unit-content">' +
        '<div class="sp-lesson">' + (innerHtml || '') + '</div>' +
      '</div>' +
    '</div>';
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

    return buildLessonShellHtml(sessionHtml);
  }

  function buildCompleteHtml(opts) {
    var node = { nodeId: 'vocab-point', title: opts.pointLabel || opts.lessonTitle || 'Vocabulary' };
    if (practiceUI && practiceUI.PracticeCompleteScreen) {
      return buildLessonShellHtml(
        practiceUI.PracticeCompleteScreen(node, {
          correct: opts.correctCount || 0,
          required: opts.total || 1,
          livesLeft: opts.livesLeft || 0,
          xp: opts.xp || 0,
          passed: true
        })
      );
    }
    return buildLessonShellHtml('<div class="sp-result-screen sp-result-screen--complete"><h2 class="sp-result-title">Point complete!</h2></div>');
  }

  function buildFailedHtml(opts) {
    var node = { nodeId: 'vocab-point', title: opts.pointLabel || opts.lessonTitle || 'Vocabulary', shortTitle: opts.pointLabel || 'this point' };
    if (practiceUI && practiceUI.PracticeFailedScreen) {
      return buildLessonShellHtml(practiceUI.PracticeFailedScreen(node));
    }
    return buildLessonShellHtml('<div class="sp-result-screen sp-result-screen--failed"><h2 class="sp-result-title">Out of lives</h2></div>');
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

  function applyGapResultStyles(correct, screen) {
    var root = getMount();
    if (!root) return;
    root.querySelectorAll('.sp-option-btn--selected').forEach(function(btn) {
      btn.classList.toggle('sp-option-btn--correct', correct === true);
      btn.classList.toggle('sp-option-btn--incorrect', correct === false);
    });
    if (correct === false && screen && screen.formatType === 'mc_4_option') {
      var answerLetter = ((screen.payload || {}).answer || '').toUpperCase();
      root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
        if ((btn.getAttribute('data-letter') || '').toUpperCase() === answerLetter) {
          btn.classList.add('sp-option-btn--correct');
        }
      });
      var mcPayload = screen.payload || {};
      if (mcPayload.gapCount > 1 && mcPayload.optionGapDisplayValues && mcPayload.answerText) {
        var correctValues = mcPayload.optionGapDisplayValues[mcPayload.answerText];
        if (Array.isArray(correctValues)) {
          correctValues.forEach(function(text, idx) {
            var slot = root.querySelector('#sp-choice-slot-' + idx);
            if (!slot) return;
            slot.textContent = text || '';
            var anchor = slot.closest('.sp-gap-anchor');
            if (anchor) anchor.classList.add('sp-gap-anchor--filled');
          });
        }
      }
    }
    if (correct === false && screen && screen.formatType === 'meaning_contrast') {
      var correctAnswer = String((screen.payload || {}).answer || '').trim().toLowerCase();
      root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
        var val = (btn.getAttribute('data-value') || '').trim().toLowerCase();
        if (val === correctAnswer) btn.classList.add('sp-option-btn--correct');
      });
    }
    root.querySelectorAll('.sp-gap-inline-input').forEach(function(input) {
      input.classList.toggle('sp-gap-underline-input--correct', correct === true);
      input.classList.toggle('sp-gap-underline-input--incorrect', correct === false);
    });
    root.querySelectorAll('.sp-gap-slot, .sp-inline-gap-group').forEach(function(slot) {
      slot.classList.toggle('sp-gap-slot--correct', correct === true);
      slot.classList.toggle('sp-gap-slot--incorrect', correct === false);
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
    return s.hearts.loseLife(amount, { screenId: screen && screen.screenId });
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
    applyGapResultStyles(result.correct, s.currentScreen);
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
        return p.instruction || 'Choose the option that best fits.';
      case 'conversation_gap_fill':
        return p.instruction || '';
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
    var instruction = (screen.payload && screen.payload.instruction) || getScreenInstruction(screen);
    if (!instruction && s.instruction && s.questionIndex === 0) instruction = s.instruction;
    if (instruction && screenRoot && screen.formatType !== 'conversation_gap_fill') {
      mountInstruction(screenRoot, instruction);
    }

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

  function getExplainContext(screen) {
    if (!screen || !screen.payload) return '';
    var p = screen.payload;
    if (screen.formatType === 'conversation_gap_fill' && p.lines) {
      var active = null;
      for (var i = 0; i < p.lines.length; i++) {
        if (p.lines[i].isActive) { active = p.lines[i]; break; }
      }
      if (active && active.mode === 'gap') {
        return ((active.before || '') + ' ___ ' + (active.after || '')).replace(/\s+/g, ' ').trim();
      }
    }
    if (p.sentence) return p.sentence;
    if (screen.formatType === 'mc_4_option') {
      return ((p.sentenceBefore || '') + ' ___ ' + (p.sentenceAfter || '')).replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  function handleExplainClick() {
    var s = getSession();
    var result = s && s._lastFeedbackResult;
    var screen = s && s.currentScreen;
    if (!result || !result.explanation || typeof LessonExplanation === 'undefined') return;

    var explainOpts = {
      title: 'Explanation',
      context: getExplainContext(screen),
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
      return isConversationGapExercise(ex) || isWriteExercise(ex) || isMcqExercise(ex);
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
    buildConvGapWriteExercises: buildConvGapWriteExercises,
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
