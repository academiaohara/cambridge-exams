// js/sune-play/practice-screen-renderer.js
// Renders and evaluates individual practice screen formats

(function() {
  'use strict';

  var norm = window.SunePlayNormalize;
  var GAP_RE = /(?:\.{3,}|…{2,}|_{3,})/g;

  function esc(str) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._escapeHTML) return BentoGrid._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function bold(str) {
    return esc(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function randomFeedback(tone, kind) {
    var list = (tone && tone[kind]) || [];
    if (!list.length) return kind === 'correct' ? 'Nice!' : 'Not quite.';
    return list[Math.floor(Math.random() * list.length)];
  }

  // ─── PracticeScreenRenderer ──────────────────────────────────────────

  function PracticeScreenRenderer(screen) {
    if (!screen) return '<p class="sp-empty">No screen loaded.</p>';
    switch (screen.formatType) {
      case 'two_option_choice': return renderTwoOption(screen);
      case 'free_text_gap_fill': return renderGapFill(screen);
      case 'full_sentence_write': return renderFullSentence(screen);
      case 'word_order_tiles': return renderWordOrder(screen);
      case 'error_correction': return renderErrorCorrection(screen);
      case 'verb_bank_two_step': return renderVerbBankTwoStep(screen);
      case 'passage_error_hunt_single': return renderPassageHunt(screen);
      case 'stative_sorting': return renderStativeSorting(screen);
      case 'meaning_contrast': return renderMeaningContrast(screen);
      case 'preselected_verb_gap_fill': return renderGapFill(screen);
      default:
        return '<p class="sp-unknown">Unsupported format: ' + esc(screen.formatType) + '</p>';
    }
  }

  function renderTwoOption(screen) {
    var p = screen.payload || {};
    var html = '<div class="sp-screen sp-screen--choice" data-format="two_option_choice">';
    html += '<p class="sp-prompt-sentence">' +
      esc(p.sentenceBefore) +
      ' <span class="sp-gap-slot" id="sp-choice-slot">______</span> ' +
      esc(p.sentenceAfter) + '</p>';
    html += '<div class="sp-option-grid">';
    (p.options || []).forEach(function(opt) {
      html += '<button type="button" class="sp-option-btn" data-value="' + esc(opt) + '">' + esc(opt) + '</button>';
    });
    html += '</div></div>';
    return html;
  }

  function renderGapFill(screen) {
    var p = screen.payload || {};
    var sentence = bold((p.sentence || '').replace(GAP_RE, '<span class="sp-inline-gap">______</span>'));
    var html = '<div class="sp-screen sp-screen--gap" data-format="free_text_gap_fill">';
    html += '<p class="sp-prompt-sentence">' + sentence + '</p>';
    if (p.verbPrompt) html += '<p class="sp-verb-prompt">' + esc(p.verbPrompt) + '</p>';
    if (p.preselectedVerb) html += '<p class="sp-preselected-verb">Verb: <strong>' + esc(p.preselectedVerb) + '</strong></p>';
    html += '<input type="text" class="sp-text-input" id="sp-gap-input" placeholder="Type your answer" autocomplete="off" autocapitalize="off">';
    html += '</div>';
    return html;
  }

  function renderFullSentence(screen) {
    var p = screen.payload || {};
    return '<div class="sp-screen sp-screen--write" data-format="full_sentence_write">' +
      '<p class="sp-display-prompt">' + esc(p.displayPrompt || '') + '</p>' +
      '<textarea class="sp-text-input sp-text-input--large" id="sp-sentence-input" rows="3" placeholder="Write the full sentence" autocomplete="off"></textarea>' +
    '</div>';
  }

  function renderWordOrder(screen) {
    var p = screen.payload || {};
    var html = '<div class="sp-screen sp-screen--tiles" data-format="word_order_tiles">';
    html += '<p class="sp-display-prompt">' + esc(p.prompt || 'Build the sentence.') + '</p>';
    html += '<div class="sp-tile-answer" id="sp-tile-answer"></div>';
    html += '<div class="sp-tile-bank" id="sp-tile-bank">';
    (p.tiles || []).forEach(function(word, i) {
      html += '<button type="button" class="sp-tile" data-word="' + esc(word) + '" data-idx="' + i + '">' + esc(word) + '</button>';
    });
    html += '</div></div>';
    return html;
  }

  function renderErrorCorrection(screen) {
    var p = screen.payload || {};
    var sentence = p.sentence || '';
    if (p.highlightedText) {
      sentence = sentence.replace(
        new RegExp(esc(p.highlightedText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        '<mark class="sp-error-mark">' + bold(p.highlightedText) + '</mark>'
      );
    }
    return '<div class="sp-screen sp-screen--error" data-format="error_correction">' +
      '<p class="sp-prompt-sentence">' + sentence + '</p>' +
      '<input type="text" class="sp-text-input sp-text-input--large" id="sp-error-input" placeholder="Write the corrected sentence" autocomplete="off">' +
    '</div>';
  }

  function renderVerbBankTwoStep(screen) {
    var p = screen.payload || {};
    var step = p.step || 'choose_verb';
    var html = '<div class="sp-screen sp-screen--verb-bank" data-format="verb_bank_two_step" data-step="' + step + '">';
    html += '<p class="sp-prompt-sentence">' + bold((p.sentence || '').replace(GAP_RE, '<span class="sp-inline-gap">______</span>')) + '</p>';

    if (step === 'choose_verb') {
      html += '<p class="sp-step-label">Step 1: Choose the base verb</p>';
      html += '<div class="sp-verb-bank" id="sp-verb-bank">';
      var bank = p.remainingVerbs || p.wordBank || [];
      bank.forEach(function(v) {
        if (p.usedVerbs && p.usedVerbs.indexOf(v) !== -1) return;
        html += '<button type="button" class="sp-verb-chip" data-verb="' + esc(v) + '">' + esc(v) + '</button>';
      });
      html += '</div>';
    } else {
      html += '<p class="sp-step-label">Step 2: Write the correct form</p>';
      html += '<p class="sp-preselected-verb">Verb: <strong>' + esc(p.selectedVerb || p.baseVerb) + '</strong></p>';
      html += '<input type="text" class="sp-text-input" id="sp-verb-form-input" placeholder="Type the conjugated form" autocomplete="off">';
    }
    html += '</div>';
    return html;
  }

  function renderPassageHunt(screen) {
    var p = screen.payload || {};
    var targetWrong = p.wrong || '';
    var passageText = p.passage || '';
    var passageHtml = esc(passageText);

    if (targetWrong && passageText.indexOf(targetWrong) !== -1) {
      var parts = passageText.split(targetWrong);
      passageHtml = esc(parts[0]) +
        '<button type="button" class="sp-hunt-phrase" data-wrong="' + esc(targetWrong) + '">' + esc(targetWrong) + '</button>' +
        esc(parts.slice(1).join(targetWrong));
    }

    return '<div class="sp-screen sp-screen--hunt" data-format="passage_error_hunt_single">' +
      '<p class="sp-hunt-instruction">Find one wrong verb phrase.</p>' +
      '<div class="sp-passage-card" id="sp-passage-text">' + passageHtml + '</div>' +
      '<div class="sp-hunt-correction" id="sp-hunt-correction" hidden></div>' +
    '</div>';
  }

  function renderStativeSorting(screen) {
    var p = screen.payload || {};
    var groups = p.groups || [];
    var verbs = p.verbs || [];
    if (!verbs.length && groups.length) {
      groups.forEach(function(g) {
        (g.answers || []).forEach(function(v) {
          verbs.push({ verb: v, groupId: g.groupId });
        });
      });
      verbs.sort(function() { return Math.random() - 0.5; });
    } else {
      verbs = verbs.map(function(v) {
        return typeof v === 'string' ? { verb: v } : v;
      });
    }

    var html = '<div class="sp-screen sp-screen--sort" data-format="stative_sorting">';
    html += '<p class="sp-display-prompt">' + esc(p.prompt || 'Sort the verbs.') + '</p>';
    html += '<div class="sp-sort-verb-pool" id="sp-sort-pool">';
    verbs.forEach(function(v) {
      html += '<button type="button" class="sp-sort-verb" data-verb="' + esc(v.verb) + '" draggable="true">' + esc(v.verb) + '</button>';
    });
    html += '</div><div class="sp-sort-groups">';
    groups.forEach(function(g) {
      html += '<div class="sp-sort-group" data-group="' + esc(g.groupId) + '">' +
        '<h4 class="sp-sort-group-label">' + esc(g.label) + '</h4>' +
        '<div class="sp-sort-dropzone" data-group="' + esc(g.groupId) + '"></div></div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderMeaningContrast(screen) {
    var p = screen.payload || {};
    var html = '<div class="sp-screen sp-screen--meaning" data-format="meaning_contrast">';
    html += '<p class="sp-meaning-sentence">' + bold(p.sentence || '') + '</p>';
    html += '<p class="sp-meaning-question">' + esc(p.prompt || '') + '</p>';
    html += '<div class="sp-option-grid">';
    (p.options || []).forEach(function(opt) {
      html += '<button type="button" class="sp-option-btn" data-value="' + esc(opt) + '">' + esc(opt) + '</button>';
    });
    html += '</div></div>';
    return html;
  }

  // ─── Bind interactions ───────────────────────────────────────────────

  function bindScreen(root, screen, onChange) {
    if (!root || !screen) return;
    onChange = onChange || function() {};

    var format = screen.formatType;

    if (format === 'two_option_choice' || format === 'meaning_contrast') {
      root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (root.classList.contains('sp-screen--locked')) return;
          root.querySelectorAll('.sp-option-btn').forEach(function(b) { b.classList.remove('sp-option-btn--selected'); });
          btn.classList.add('sp-option-btn--selected');
          var slot = root.querySelector('#sp-choice-slot');
          if (slot) slot.textContent = btn.getAttribute('data-value');
          onChange();
        });
      });
    }

    if (format === 'verb_bank_two_step') {
      root.querySelectorAll('.sp-verb-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          if (root.classList.contains('sp-screen--locked')) return;
          root.querySelectorAll('.sp-verb-chip').forEach(function(c) { c.classList.remove('sp-verb-chip--selected'); });
          chip.classList.add('sp-verb-chip--selected');
          onChange();
        });
      });
    }

    if (format === 'word_order_tiles') {
      bindWordOrderTiles(root, onChange);
    }

    if (format === 'passage_error_hunt_single') {
      bindPassageHunt(root, screen, onChange);
    }

    if (format === 'stative_sorting') {
      bindStativeSorting(root, onChange);
    }

    root.querySelectorAll('input, textarea').forEach(function(el) {
      el.addEventListener('input', onChange);
    });
  }

  function bindWordOrderTiles(root, onChange) {
    var answerEl = root.querySelector('#sp-tile-answer');
    var bankEl = root.querySelector('#sp-tile-bank');

    function moveTile(btn, toAnswer) {
      if (toAnswer) {
        answerEl.appendChild(btn);
      } else {
        bankEl.appendChild(btn);
      }
      onChange();
    }

    root.querySelectorAll('.sp-tile').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var inAnswer = btn.parentElement === answerEl;
        moveTile(btn, !inAnswer);
      });
    });
  }

  function bindPassageHunt(root, screen, onChange) {
    var correctionEl = root.querySelector('#sp-hunt-correction');
    root.querySelectorAll('.sp-hunt-phrase').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        correctionEl.hidden = false;
        correctionEl.innerHTML =
          '<p class="sp-hunt-fix-label">Fix: <em>' + esc(btn.getAttribute('data-wrong')) + '</em></p>' +
          '<input type="text" class="sp-text-input" id="sp-hunt-fix-input" placeholder="Type the correction" autocomplete="off">';
        root._huntTappedWrong = btn.getAttribute('data-wrong');
        root._huntTappedCorrect = true;
        onChange();
      });
    });
  }

  function bindStativeSorting(root, onChange) {
    var pool = root.querySelector('#sp-sort-pool');
    root.querySelectorAll('.sp-sort-verb').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var groups = root.querySelectorAll('.sp-sort-dropzone');
        var placed = false;
        groups.forEach(function(zone) {
          if (placed) return;
          if (!zone.querySelector('.sp-sort-verb')) {
            zone.appendChild(btn);
            placed = true;
          }
        });
        if (!placed && btn.parentElement !== pool) pool.appendChild(btn);
        onChange();
      });
    });

    root.querySelectorAll('.sp-sort-dropzone').forEach(function(zone) {
      zone.addEventListener('click', function() {
        var verb = zone.querySelector('.sp-sort-verb');
        if (verb && !root.classList.contains('sp-screen--locked')) {
          pool.appendChild(verb);
          onChange();
        }
      });
    });
  }

  // ─── Check answers ───────────────────────────────────────────────────

  function isScreenReady(root, screen) {
    if (!root || !screen) return false;
    var f = screen.formatType;
    if (f === 'two_option_choice' || f === 'meaning_contrast') {
      return !!root.querySelector('.sp-option-btn--selected');
    }
    if (f === 'free_text_gap_fill' || f === 'preselected_verb_gap_fill') {
      var inp = root.querySelector('#sp-gap-input');
      return inp && !!inp.value.trim();
    }
    if (f === 'full_sentence_write') {
      var ta = root.querySelector('#sp-sentence-input');
      return ta && !!ta.value.trim();
    }
    if (f === 'error_correction') {
      var err = root.querySelector('#sp-error-input');
      return err && !!err.value.trim();
    }
    if (f === 'word_order_tiles') {
      return root.querySelectorAll('#sp-tile-answer .sp-tile').length > 0;
    }
    if (f === 'verb_bank_two_step') {
      var step = (screen.payload && screen.payload.step) || 'choose_verb';
      if (step === 'choose_verb') return !!root.querySelector('.sp-verb-chip--selected');
      var vf = root.querySelector('#sp-verb-form-input');
      return vf && !!vf.value.trim();
    }
    if (f === 'passage_error_hunt_single') {
      if (!root._huntTappedCorrect) return false;
      var fix = root.querySelector('#sp-hunt-fix-input');
      return fix && !!fix.value.trim();
    }
    if (f === 'stative_sorting') {
      return root.querySelectorAll('.sp-sort-dropzone .sp-sort-verb').length > 0;
    }
    return false;
  }

  function checkScreen(root, screen) {
    var p = screen.payload || {};
    var result = { correct: false, explanation: p.explanation || '', correctAnswer: '', userAnswer: '', lifeLoss: 0, shouldRequeue: false, partial: false };

    switch (screen.formatType) {
      case 'two_option_choice':
      case 'meaning_contrast': {
        var sel = root.querySelector('.sp-option-btn--selected');
        var val = sel ? sel.getAttribute('data-value') : '';
        result.userAnswer = val;
        result.correctAnswer = p.answer;
        result.correct = norm.answersMatch(val, p.answer);
        result.lifeLoss = result.correct ? 0 : 1;
        break;
      }
      case 'free_text_gap_fill':
      case 'preselected_verb_gap_fill': {
        var gap = root.querySelector('#sp-gap-input');
        var given = gap ? gap.value.trim() : '';
        result.userAnswer = given;
        result.correctAnswer = p.answer;
        result.correct = norm.matchesAnyAccepted(given, p);
        result.lifeLoss = result.correct ? 0 : 1;
        break;
      }
      case 'full_sentence_write': {
        var sent = root.querySelector('#sp-sentence-input');
        var text = sent ? sent.value.trim() : '';
        result.userAnswer = text;
        result.correctAnswer = (p.acceptedAnswers && p.acceptedAnswers[0]) || p.answer;
        result.correct = norm.matchesAnyAccepted(text, p);
        result.lifeLoss = result.correct ? 0 : 1;
        break;
      }
      case 'word_order_tiles': {
        var words = [];
        root.querySelectorAll('#sp-tile-answer .sp-tile').forEach(function(t) { words.push(t.getAttribute('data-word')); });
        var built = words.join(' ');
        result.userAnswer = built;
        result.correctAnswer = p.answer;
        result.correct = norm.matchesAnyAccepted(built, p);
        result.lifeLoss = result.correct ? 0 : 1;
        break;
      }
      case 'error_correction': {
        var errInp = root.querySelector('#sp-error-input');
        var corrected = errInp ? errInp.value.trim() : '';
        result.userAnswer = corrected;
        result.correctAnswer = p.answer;
        result.correct = norm.matchesAnyAccepted(corrected, p);
        result.lifeLoss = result.correct ? 0 : 1;
        break;
      }
      case 'verb_bank_two_step': {
        var step = p.step || 'choose_verb';
        if (step === 'choose_verb') {
          var chip = root.querySelector('.sp-verb-chip--selected');
          var verb = chip ? chip.getAttribute('data-verb') : '';
          result.userAnswer = verb;
          result.correctAnswer = p.baseVerb;
          var verbOk = norm.answersMatch(verb, p.baseVerb);
          if (!verbOk) {
            result.correct = false;
            result.lifeLoss = 1;
            result.shouldRequeue = true;
            result.partial = true;
            result.explanation = 'That verb does not fit this sentence.';
          } else {
            result.correct = false;
            result.partial = true;
            result._advanceStep = 'type_form';
            result._selectedVerb = verb;
          }
        } else {
          var formInp = root.querySelector('#sp-verb-form-input');
          var form = formInp ? formInp.value.trim() : '';
          result.userAnswer = form;
          var expected = Array.isArray(p.answer) ? p.answer : [p.answer];
          result.correctAnswer = expected.join(' / ');
          result.correct = norm.matchesAnyAccepted(form, { acceptedAnswers: expected, answer: expected[0] });
          result.lifeLoss = result.correct ? 0 : 1;
          result.shouldRequeue = !result.correct;
        }
        break;
      }
      case 'passage_error_hunt_single': {
        var tapped = root._huntTappedWrong;
        var target = p.wrong;
        if (tapped !== target) {
          result.correct = false;
          result.lifeLoss = 1;
          result.explanation = 'That phrase is not the error. Look for an unnatural verb form.';
          result.userAnswer = tapped || '';
          break;
        }
        var fixInp = root.querySelector('#sp-hunt-fix-input');
        var fixVal = fixInp ? fixInp.value.trim() : '';
        result.userAnswer = fixVal;
        result.correctAnswer = p.answer;
        result.correct = norm.matchesAnyAccepted(fixVal, p);
        result.lifeLoss = result.correct ? 0 : 1;
        break;
      }
      case 'stative_sorting': {
        var groups = p.groups || [];
        var totalExpected = 0;
        var totalPlaced = 0;
        var wrongCount = 0;
        groups.forEach(function(g) {
          totalExpected += (g.answers || []).length;
          var zone = root.querySelector('.sp-sort-dropzone[data-group="' + g.groupId + '"]');
          if (!zone) return;
          zone.querySelectorAll('.sp-sort-verb').forEach(function(btn) {
            totalPlaced++;
            var v = btn.getAttribute('data-verb');
            var expected = g.answers || [];
            if (expected.indexOf(v) === -1) wrongCount++;
          });
        });
        var poolLeft = root.querySelectorAll('#sp-sort-pool .sp-sort-verb').length;
        result.correct = wrongCount === 0 && totalPlaced === totalExpected && poolLeft === 0;
        result.lifeLoss = Math.min(wrongCount + (poolLeft > 0 ? 1 : 0), 2);
        result.userAnswer = 'sorted';
        break;
      }
      default:
        result.explanation = 'Unknown format.';
    }

    return result;
  }

  // ─── FeedbackSheet ───────────────────────────────────────────────────

  function FeedbackSheet(result, feedbackTone) {
    var cls = result.correct ? 'sp-feedback--correct' : 'sp-feedback--incorrect';
    var title = result.correct
      ? randomFeedback(feedbackTone, 'correct')
      : randomFeedback(feedbackTone, 'incorrect');
    var html = '<div class="sp-feedback-sheet ' + cls + '" data-component="FeedbackSheet">';
    html += '<p class="sp-feedback-title">' + esc(title) + '</p>';
    if (!result.correct && result.correctAnswer) {
      html += '<p class="sp-feedback-answer"><span>Correcto:</span> ' + esc(result.correctAnswer) + '</p>';
    }
    if (!result.correct && result.explanation) {
      html += '<button type="button" class="sp-btn sp-btn--ghost sp-btn--explain" data-action="show-explanation" aria-label="Ver explicación">' +
        '<span class="material-symbols-outlined">help</span></button>';
    }
    html += '</div>';
    return html;
  }

  window.SunePlayScreenRenderer = {
    PracticeScreenRenderer: PracticeScreenRenderer,
    FeedbackSheet: FeedbackSheet,
    bindScreen: bindScreen,
    isScreenReady: isScreenReady,
    checkScreen: checkScreen
  };
})();
