// js/b1-grammar-lesson.js
// Duolingo-inspired B1 grammar lesson flow (sune-english-unit-v1 schema)

(function() {
  'use strict';

  var GAP_RE = /(?:\.{3,}|…{2,}|_{3,})/g;
  var GAP_SPLIT = /(?:\.{3,}|…{2,}|_{3,})/;

  function esc(str) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._escapeHTML) return BentoGrid._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function normQuotes(s) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._normalizeText) return BentoGrid._normalizeText(s);
    return (s || '').replace(/[\u2018\u2019\u201a\u201b]/g, "'").replace(/[\u201c\u201d\u201e\u201f]/g, '"');
  }

  function normCompare(s, caseSensitive) {
    var t = normQuotes(s || '').replace(/\s+/g, ' ').replace(/\s*\.\s*$/, '').trim();
    return caseSensitive ? t : t.toLowerCase();
  }

  function acceptedStrings(item) {
    var list = item.acceptedAnswers;
    if (list && list.length && typeof list[0] === 'string') return list.slice();
    if (item.answer != null && typeof item.answer === 'string') return [item.answer];
    if (item.answer != null && !Array.isArray(item.answer)) return [String(item.answer)];
    return [];
  }

  function primaryAnswer(item) {
    var acc = acceptedStrings(item);
    if (acc.length) return acc[0];
    if (Array.isArray(item.answer)) return item.completedSentence || item.answer.join(' ');
    return item.answer || item.completedSentence || '';
  }

  function matchesText(given, item, opts) {
    opts = opts || {};
    var g = normCompare(given, !!opts.caseSensitive);
    if (!g) return false;
    var alts = acceptedStrings(item);
    if (!alts.length && item.answer) alts = [typeof item.answer === 'string' ? item.answer : ''];
    return alts.some(function(a) { return normCompare(a, !!opts.caseSensitive) === g; });
  }

  function matchesBlanks(givens, item) {
    var expectedRows = [];
    if (item.acceptedAnswers && item.acceptedAnswers.length && Array.isArray(item.acceptedAnswers[0])) {
      expectedRows = item.acceptedAnswers;
    } else if (Array.isArray(item.answer)) {
      expectedRows = [item.answer];
    }
    if (!expectedRows.length) return false;
    return expectedRows.some(function(row) {
      if (!Array.isArray(row) || row.length !== givens.length) return false;
      return row.every(function(exp, i) {
        var g = normCompare(givens[i], false);
        var variants = String(exp).split(/\s*\/\s*/);
        return variants.some(function(v) { return normCompare(v, false) === g; });
      });
    });
  }

  function renderMarkdownBold(str) {
    return esc(str).replace(/\*\*([^*]+)\*\*/g, '<strong class="bgl-highlight">$1</strong>');
  }

  function highlightDiff(correct, user) {
    var cWords = normCompare(correct, true).split(/\s+/);
    var uWords = normCompare(user, true).split(/\s+/);
    var rawWords = correct.split(/\s+/);
    var html = [];
    for (var i = 0; i < rawWords.length; i++) {
      var changed = i >= uWords.length || normCompare(rawWords[i], false) !== normCompare(uWords[i] || '', false);
      html.push(changed
        ? '<mark class="bgl-diff-mark">' + esc(rawWords[i]) + '</mark>'
        : esc(rawWords[i]));
    }
    return html.join(' ');
  }

  function buildSteps(unitData, skipTheory, limitSectionIdx) {
    var steps = [];
    (unitData.sections || []).forEach(function(section, secIdx) {
      if (limitSectionIdx != null && secIdx !== limitSectionIdx) return;
      if (section.type === 'theory' && section.theoryType === 'rule_cards') {
        if (skipTheory) return;
        (section.content || []).forEach(function(card, cardIdx) {
          steps.push({
            kind: 'theory',
            secIdx: secIdx,
            section: section,
            card: card,
            cardIdx: cardIdx,
            cardTotal: (section.content || []).length
          });
        });
      } else if (section.type === 'exercise') {
        if (section.exerciseType === 'passage_error_hunt') {
          steps.push({ kind: 'exercise', secIdx: secIdx, section: section, exerciseType: 'passage_error_hunt', item: null });
        } else {
          (section.items || []).forEach(function(item) {
            steps.push({
              kind: 'exercise',
              secIdx: secIdx,
              section: section,
              exerciseType: section.exerciseType,
              item: item
            });
          });
        }
      }
    });
    return steps;
  }

  function firstExerciseSectionIndex(unitData) {
    var sections = unitData.sections || [];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].type === 'exercise') return i;
    }
    return 0;
  }

  function firstExerciseStepIndex(unitData) {
    var steps = buildSteps(unitData, false);
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].kind === 'exercise') return i;
    }
    return 0;
  }

  function sectionIndexToStep(unitData, sectionIdx) {
    var steps = buildSteps(unitData, false);
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].secIdx >= sectionIdx) return i;
    }
    return 0;
  }

  // ─── Theory: rule_cards ───────────────────────────────────────────────

  function renderRuleCard(step) {
    var card = step.card;
    var section = step.section;
    var html = '<div class="bgl-theory">' +
      '<div class="bgl-theory-kicker">' + esc(section.shortTitle || section.title || '') + '</div>' +
      '<h2 class="bgl-theory-title">' + esc(card.cardTitle || '') + '</h2>';

    if (card.description) {
      html += '<p class="bgl-theory-desc">' + esc(card.description) + '</p>';
    }

    if (card.rows && card.rows.length) {
      html += '<div class="bgl-theory-rows">';
      card.rows.forEach(function(row) {
        html += '<div class="bgl-theory-row">' +
          '<span class="bgl-theory-row-label">' + esc(row.label || '') + '</span>' +
          '<div class="bgl-theory-row-cols">' +
            '<span class="bgl-theory-row-cell">' + esc(row.left || '') + '</span>' +
            '<span class="bgl-theory-row-cell">' + esc(row.right || '') + '</span>' +
          '</div></div>';
      });
      html += '</div>';
    }

    if (card.items && card.items.length) {
      if (card.chipStyle) {
        html += '<div class="bgl-chips">';
        card.items.forEach(function(it) {
          html += '<span class="bgl-chip">' + esc(it) + '</span>';
        });
        html += '</div>';
      } else {
        html += '<ul class="bgl-theory-list">';
        card.items.forEach(function(it) {
          html += '<li>' + esc(it) + '</li>';
        });
        html += '</ul>';
      }
    }

    if (card.examples && card.examples.length) {
      html += '<div class="bgl-example-box">';
      card.examples.forEach(function(ex) {
        var isBad = (card.incorrectExamples || []).indexOf(ex) !== -1;
        html += '<div class="bgl-example-line' + (isBad ? ' bgl-example-line--incorrect' : '') + '">' +
          (isBad ? '<span class="bgl-example-x" aria-hidden="true">✗</span>' : '') +
          esc(ex) + '</div>';
      });
      html += '</div>';
    }

    if (card.incorrectExamples && card.incorrectExamples.length && !(card.examples && card.examples.length)) {
      html += '<div class="bgl-example-box bgl-example-box--incorrect">';
      card.incorrectExamples.forEach(function(ex) {
        html += '<div class="bgl-example-line bgl-example-line--incorrect"><span class="bgl-example-x" aria-hidden="true">✗</span><s>' + esc(ex) + '</s></div>';
      });
      html += '</div>';
    }

    if (step.cardTotal > 1) {
      html += '<div class="bgl-card-dots" aria-hidden="true">';
      for (var d = 0; d < step.cardTotal; d++) {
        html += '<span class="bgl-card-dot' + (d === step.cardIdx ? ' bgl-card-dot--active' : '') + '"></span>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // ─── BuildTheSentenceExercise (prompt_to_sentence) ────────────────────

  function renderBuildTheSentence(step) {
    var item = step.item;
    var p = item.prompt || {};
    var html = '<div class="bgl-exercise bgl-exercise--build" data-component="BuildTheSentenceExercise">' +
      '<p class="bgl-prompt-display">' + esc(item.displayPrompt || '') + '</p>' +
      '<div class="bgl-prompt-chips">';
    if (p.subject) html += '<span class="bgl-chip bgl-chip--prompt">' + esc(p.subject) + '</span>';
    if (p.timeExpression) html += '<span class="bgl-chip bgl-chip--prompt">' + esc(p.timeExpression) + '</span>';
    if (p.verbPhrase) html += '<span class="bgl-chip bgl-chip--prompt">' + esc(p.verbPhrase) + '</span>';
    html += '</div>' +
      '<label class="bgl-input-label" for="bgl-sentence-input">Write the full sentence</label>' +
      '<textarea id="bgl-sentence-input" class="bgl-text-input bgl-text-input--sentence" rows="3" ' +
        'data-explanation="' + esc(item.explanation || '') + '" ' +
        'data-answer="' + esc(primaryAnswer(item)) + '" ' +
        'placeholder="Type your sentence here…"></textarea>' +
      '</div>';
    return html;
  }

  // ─── GapFillExercise ──────────────────────────────────────────────────

  function renderGapFill(step) {
    var item = step.item;
    var parts = (item.sentence || '').split(GAP_SPLIT);
    var gapCount = (item.sentence.match(GAP_RE) || []).length;
    var html = '<div class="bgl-exercise bgl-exercise--gap" data-component="GapFillExercise">' +
      '<div class="bgl-sentence-line">';
    for (var i = 0; i < parts.length; i++) {
      html += '<span>' + esc(parts[i]) + '</span>';
      if (i < gapCount) {
        html += '<input type="text" class="bgl-gap-input" autocomplete="off" spellcheck="false" ' +
          'aria-label="Gap ' + (i + 1) + '">';
      }
    }
    html += '</div>';
    if (item.verbPrompt) {
      html += '<span class="bgl-chip bgl-chip--verb">' + esc(item.verbPrompt) + '</span>';
    }
    html += '<input type="hidden" class="bgl-meta" ' +
      'data-explanation="' + esc(item.explanation || '') + '" ' +
      'data-answer="' + esc(primaryAnswer(item)) + '" ' +
      'data-completed="' + esc((item.sentence || '').replace(GAP_RE, primaryAnswer(item))) + '">' +
      '</div>';
    return html;
  }

  // ─── ErrorCorrectionExercise ──────────────────────────────────────────

  function renderErrorCorrection(step) {
    var item = step.item;
    var highlight = item.highlightedText || '';
    var sent = item.sentence || '';
    var display = sent;
    if (highlight && sent.indexOf('**') === -1) {
      display = sent.replace(highlight, '**' + highlight + '**');
    }
    var html = '<div class="bgl-exercise bgl-exercise--error" data-component="ErrorCorrectionExercise">' +
      '<p class="bgl-error-sentence">' + renderMarkdownBold(display) + '</p>' +
      '<label class="bgl-input-label" for="bgl-error-input">Write the corrected sentence</label>' +
      '<textarea id="bgl-error-input" class="bgl-text-input bgl-text-input--sentence" rows="3" ' +
        'data-explanation="' + esc(item.explanation || '') + '" ' +
        'data-answer="' + esc(primaryAnswer(item)) + '" ' +
        'data-highlight="' + esc(highlight) + '"></textarea>' +
      '</div>';
    return html;
  }

  // ─── TapChoiceExercise ────────────────────────────────────────────────

  function renderTapChoice(step) {
    var item = step.item;
    var html = '<div class="bgl-exercise bgl-exercise--tap" data-component="TapChoiceExercise" ' +
      'data-answer="' + esc(item.answer || '') + '" ' +
      'data-completed="' + esc(item.completedSentence || '') + '" ' +
      'data-explanation="' + esc(item.explanation || '') + '">' +
      '<div class="bgl-tap-sentence">' +
        '<span class="bgl-tap-before">' + esc(item.sentenceBefore || '') + '</span> ' +
        '<span class="bgl-tap-blank" id="bgl-tap-slot" aria-live="polite"></span> ' +
        '<span class="bgl-tap-after">' + esc(item.sentenceAfter || '') + '</span>' +
      '</div>' +
      '<div class="bgl-tap-options">';
    (item.options || []).forEach(function(opt, idx) {
      html += '<button type="button" class="bgl-tap-option" data-value="' + esc(opt) + '">' + esc(opt) + '</button>';
    });
    html += '</div></div>';
    return html;
  }

  // ─── VerbBankGapFillExercise ──────────────────────────────────────────

  function renderVerbBankGapFill(step) {
    var section = step.section;
    var item = step.item;
    var bank = section.wordBank || [];
    var parts = (item.sentence || '').split(GAP_SPLIT);
    var gapCount = (item.sentence.match(GAP_RE) || []).length;
    var answers = Array.isArray(item.answer) ? item.answer : [item.answer];

    var html = '<div class="bgl-exercise bgl-exercise--verb-bank" data-component="VerbBankGapFillExercise" ' +
      'data-base-verb="' + esc(item.baseVerb || '') + '" ' +
      'data-explanation="' + esc(item.explanation || '') + '" ' +
      'data-completed="' + esc(item.completedSentence || '') + '" ' +
      'data-answers="' + esc(JSON.stringify(answers)) + '">';

    html += '<div class="bgl-verb-bank" id="bgl-verb-bank">';
    bank.forEach(function(v) {
      html += '<button type="button" class="bgl-chip bgl-chip--bank" data-verb="' + esc(v) + '">' + esc(v) + '</button>';
    });
    html += '</div>';

    html += '<div class="bgl-sentence-line bgl-sentence-line--verb">';
    for (var i = 0; i < parts.length; i++) {
      html += '<span>' + esc(parts[i]) + '</span>';
      if (i < gapCount) {
        html += '<input type="text" class="bgl-gap-input bgl-gap-input--verb" data-gap-idx="' + i + '" autocomplete="off" spellcheck="false">';
      }
    }
    html += '</div></div>';
    return html;
  }

  // ─── PassageErrorHuntExercise ─────────────────────────────────────────

  function renderPassageErrorHunt(step) {
    var section = step.section;
    var items = section.items || [];
    var passage = section.passage || '';
    var html = '<div class="bgl-exercise bgl-exercise--hunt" data-component="PassageErrorHuntExercise" ' +
      'data-total="' + items.length + '">' +
      '<div class="bgl-hunt-counter"><span id="bgl-hunt-found">0</span>/' + items.length + ' mistakes found</div>' +
      '<div class="bgl-passage-card" id="bgl-passage-text"></div>' +
      '<div class="bgl-hunt-correction" id="bgl-hunt-correction" hidden></div>' +
      '<div class="bgl-hunt-summary" id="bgl-hunt-summary" hidden></div>' +
      '</div>';
    return html;
  }

  function mountPassageHunt(root) {
    var step = root._bglItem;
    if (!step || !step.section) return;
    var data = { passage: step.section.passage || '', items: step.section.items || [] };
    var passageEl = root.querySelector('#bgl-passage-text');
    var correctionEl = root.querySelector('#bgl-hunt-correction');
    var summaryEl = root.querySelector('#bgl-hunt-summary');
    var counterEl = root.querySelector('#bgl-hunt-found');
    var total = data.items.length;
    var fixed = {};
    var activeIdx = null;

    function rebuildPassage() {
      var text = data.passage;
      var markers = [];
      data.items.forEach(function(it, idx) {
        var pos = text.indexOf(it.wrong);
        if (pos === -1) return;
        markers.push({ idx: idx, start: pos, end: pos + it.wrong.length, wrong: it.wrong, item: it });
      });
      markers.sort(function(a, b) { return a.start - b.start; });

      var html = '';
      var cursor = 0;
      markers.forEach(function(m) {
        html += esc(text.slice(cursor, m.start));
        var isFixed = !!fixed[m.idx];
        var phrase = isFixed ? fixed[m.idx].correction : m.wrong;
        var cls = 'bgl-hunt-phrase' + (isFixed ? ' bgl-hunt-phrase--fixed' : '');
        html += '<button type="button" class="' + cls + '" data-hunt-idx="' + m.idx + '">' + esc(phrase) + '</button>';
        cursor = m.end;
      });
      html += esc(text.slice(cursor));
      passageEl.innerHTML = html;

      passageEl.querySelectorAll('.bgl-hunt-phrase:not(.bgl-hunt-phrase--fixed)').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (root.classList.contains('bgl-exercise--checked')) return;
          var idx = parseInt(btn.getAttribute('data-hunt-idx'), 10);
          showCorrection(idx, btn);
        });
      });
    }

    function showCorrection(idx, btn) {
      activeIdx = idx;
      var it = data.items[idx];
      correctionEl.hidden = false;
      correctionEl.innerHTML =
        '<p class="bgl-hunt-fix-label">Fix: <em>' + esc(it.wrong) + '</em></p>' +
        '<input type="text" class="bgl-text-input" id="bgl-hunt-fix-input" placeholder="Type the correction" autocomplete="off">' +
        '<button type="button" class="bgl-hunt-fix-btn" id="bgl-hunt-fix-submit">Submit correction</button>';
      var input = correctionEl.querySelector('#bgl-hunt-fix-input');
      var submit = correctionEl.querySelector('#bgl-hunt-fix-submit');
      input.focus();
      submit.addEventListener('click', function() {
        var val = input.value.trim();
        if (!val) return;
        if (matchesText(val, it)) {
          fixed[idx] = { correction: val, item: it };
          counterEl.textContent = String(Object.keys(fixed).length);
          correctionEl.hidden = true;
          rebuildPassage();
          if (Object.keys(fixed).length >= total) {
            showSummary();
          }
          root.dispatchEvent(new CustomEvent('bgl-answer-change', { bubbles: true }));
        } else {
          input.classList.add('bgl-input-shake');
          setTimeout(function() { input.classList.remove('bgl-input-shake'); }, 400);
        }
      });
    }

    function showSummary() {
      summaryEl.hidden = false;
      var html = '<h3 class="bgl-hunt-summary-title">All mistakes corrected</h3><ul class="bgl-hunt-summary-list">';
      data.items.forEach(function(it, idx) {
        var corr = fixed[idx] ? fixed[idx].correction : it.answer;
        html += '<li class="bgl-hunt-summary-item">' +
          '<span class="bgl-hunt-summary-wrong">' + esc(it.wrong) + '</span> → ' +
          '<span class="bgl-hunt-summary-right">' + esc(corr) + '</span>' +
          '<p class="bgl-hunt-summary-exp">' + esc(it.explanation || '') + '</p></li>';
      });
      html += '</ul>';
      summaryEl.innerHTML = html;
      root.setAttribute('data-hunt-complete', 'true');
      root.dispatchEvent(new CustomEvent('bgl-answer-change', { bubbles: true }));
    }

    rebuildPassage();
  }

  // ─── Check handlers ───────────────────────────────────────────────────

  function checkBuildSentence(ex) {
    var input = ex.querySelector('#bgl-sentence-input');
    var given = input.value.trim();
    var item = (ex._bglItem && ex._bglItem.item) || { answer: input.getAttribute('data-answer') };
    var correct = matchesText(given, item);
    var expected = primaryAnswer(item);
    return {
      correct: correct,
      explanation: input.getAttribute('data-explanation') || '',
      correctAnswer: expected,
      userAnswer: given,
      highlight: !correct ? highlightDiff(expected, given) : esc(expected)
    };
  }

  function checkGapFill(ex) {
    var input = ex.querySelector('.bgl-gap-input');
    var meta = ex.querySelector('.bgl-meta');
    var given = input ? input.value.trim() : '';
    var item = (ex._bglItem && ex._bglItem.item) || { answer: meta.getAttribute('data-answer') };
    var correct = matchesText(given, item);
    return {
      correct: correct,
      explanation: meta.getAttribute('data-explanation') || '',
      correctAnswer: meta.getAttribute('data-completed') || primaryAnswer(item),
      userAnswer: given
    };
  }

  function checkErrorCorrection(ex) {
    var input = ex.querySelector('#bgl-error-input');
    var given = input.value.trim();
    var item = (ex._bglItem && ex._bglItem.item) || { answer: input.getAttribute('data-answer') };
    var correct = matchesText(given, item);
    return {
      correct: correct,
      explanation: input.getAttribute('data-explanation') || '',
      correctAnswer: primaryAnswer(item),
      userAnswer: given
    };
  }

  function checkTapChoice(ex) {
    var selected = ex.querySelector('.bgl-tap-option--selected');
    var val = selected ? selected.getAttribute('data-value') : '';
    var expected = ex.getAttribute('data-answer') || '';
    var correct = normCompare(val, false) === normCompare(expected, false);
    return {
      correct: correct,
      explanation: ex.getAttribute('data-explanation') || '',
      correctAnswer: ex.getAttribute('data-completed') || expected,
      userAnswer: val
    };
  }

  function checkVerbBank(ex) {
    var inputs = ex.querySelectorAll('.bgl-gap-input--verb');
    var givens = [];
    inputs.forEach(function(inp) { givens.push(inp.value.trim()); });
    var item = (ex._bglItem && ex._bglItem.item) || {};
    if (!item.answer) {
      try { item.answer = JSON.parse(ex.getAttribute('data-answers') || '[]'); } catch (e) { /* ignore */ }
    }
    var correct = matchesBlanks(givens, item);
    if (correct) {
      var base = ex.getAttribute('data-base-verb');
      var chip = ex.querySelector('.bgl-chip--bank[data-verb="' + base + '"]');
      if (chip) chip.classList.add('bgl-chip--completed');
    }
    return {
      correct: correct,
      explanation: ex.getAttribute('data-explanation') || '',
      correctAnswer: ex.getAttribute('data-completed') || '',
      userAnswer: givens.join(' / ')
    };
  }

  function checkPassageHunt(ex) {
    var complete = ex.getAttribute('data-hunt-complete') === 'true';
    return {
      correct: complete,
      explanation: complete ? 'You found and corrected all the tense mistakes in the passage.' : 'Keep tapping the incorrect verb phrases.',
      correctAnswer: '',
      userAnswer: ex.querySelector('#bgl-hunt-found').textContent + ' found'
    };
  }

  function isAnswered(root, step) {
    if (step.kind === 'theory') return true;
    var ex = root.querySelector('.bgl-exercise');
    if (!ex) return false;
    var type = step.exerciseType;
    if (type === 'prompt_to_sentence') {
      return !!ex.querySelector('#bgl-sentence-input').value.trim();
    }
    if (type === 'gap_fill') {
      return !!ex.querySelector('.bgl-gap-input').value.trim();
    }
    if (type === 'error_correction') {
      return !!ex.querySelector('#bgl-error-input').value.trim();
    }
    if (type === 'tap_choice') {
      return !!ex.querySelector('.bgl-tap-option--selected');
    }
    if (type === 'verb_bank_gap_fill') {
      var inputs = ex.querySelectorAll('.bgl-gap-input--verb');
      for (var i = 0; i < inputs.length; i++) {
        if (!inputs[i].value.trim()) return false;
      }
      var base = ex.getAttribute('data-base-verb');
      var selected = ex.querySelector('.bgl-chip--bank-selected');
      if (base && (!selected || selected.getAttribute('data-verb') !== base)) return false;
      return inputs.length > 0;
    }
    if (type === 'passage_error_hunt') {
      return ex.getAttribute('data-hunt-complete') === 'true';
    }
    return false;
  }

  function bindExercise(root, step) {
    var ex = root.querySelector('.bgl-exercise');
    if (!ex) return;
    ex._bglItem = step;

    if (step.exerciseType === 'tap_choice') {
      ex.querySelectorAll('.bgl-tap-option').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (ex.classList.contains('bgl-exercise--checked')) return;
          ex.querySelectorAll('.bgl-tap-option').forEach(function(b) { b.classList.remove('bgl-tap-option--selected'); });
          btn.classList.add('bgl-tap-option--selected');
          var slot = ex.querySelector('#bgl-tap-slot');
          if (slot) slot.textContent = btn.getAttribute('data-value');
          root.dispatchEvent(new CustomEvent('bgl-answer-change', { bubbles: true }));
        });
      });
    }

    if (step.exerciseType === 'verb_bank_gap_fill') {
      var baseVerb = step.item.baseVerb;
      ex.querySelectorAll('.bgl-chip--bank').forEach(function(chip) {
        chip.addEventListener('click', function() {
          if (chip.classList.contains('bgl-chip--completed') || ex.classList.contains('bgl-exercise--checked')) return;
          ex.querySelectorAll('.bgl-chip--bank').forEach(function(c) { c.classList.remove('bgl-chip--bank-selected'); });
          chip.classList.add('bgl-chip--bank-selected');
          root.dispatchEvent(new CustomEvent('bgl-answer-change', { bubbles: true }));
        });
      });
      if (baseVerb) {
        var match = ex.querySelector('.bgl-chip--bank[data-verb="' + baseVerb + '"]');
        if (match && !match.classList.contains('bgl-chip--completed')) {
          match.classList.add('bgl-chip--bank-selected');
        }
      }
    }

    if (step.exerciseType === 'passage_error_hunt') {
      mountPassageHunt(ex);
    }

    ex.querySelectorAll('input, textarea').forEach(function(el) {
      el.addEventListener('input', function() { root.dispatchEvent(new CustomEvent('bgl-answer-change')); });
    });
  }

  function renderStep(step) {
    if (step.kind === 'theory') return renderRuleCard(step);
    switch (step.exerciseType) {
      case 'prompt_to_sentence': return renderBuildTheSentence(step);
      case 'gap_fill': return renderGapFill(step);
      case 'error_correction': return renderErrorCorrection(step);
      case 'tap_choice': return renderTapChoice(step);
      case 'verb_bank_gap_fill': return renderVerbBankGapFill(step);
      case 'passage_error_hunt': return renderPassageErrorHunt(step);
      default: return '<p class="bgl-unknown">Unsupported exercise type.</p>';
    }
  }

  function checkStep(root, step) {
    var ex = root.querySelector('.bgl-exercise');
    if (!ex || step.kind === 'theory') return { correct: true, explanation: '', correctAnswer: '' };
    ex.classList.add('bgl-exercise--checked');
    ex.querySelectorAll('input, textarea, button').forEach(function(el) {
      if (!el.classList.contains('bgl-tap-option')) el.disabled = true;
    });
    switch (step.exerciseType) {
      case 'prompt_to_sentence': return checkBuildSentence(ex);
      case 'gap_fill': return checkGapFill(ex);
      case 'error_correction': return checkErrorCorrection(ex);
      case 'tap_choice': return checkTapChoice(ex);
      case 'verb_bank_gap_fill': return checkVerbBank(ex);
      case 'passage_error_hunt': return checkPassageHunt(ex);
      default: return { correct: false, explanation: '', correctAnswer: '' };
    }
  }

  // ─── Lesson controller ──────────────────────────────────────────────────

  var state = null;

  function showFeedback(result, onContinue) {
    var existing = document.getElementById('bgl-feedback');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'bgl-feedback';
    panel.className = 'bgl-feedback ' + (result.correct ? 'bgl-feedback--correct' : 'bgl-feedback--wrong');
    panel.setAttribute('role', 'alert');

    var title = result.correct ? 'Nice!' : 'Not quite';
    var answerHtml = '';
    if (result.correctAnswer) {
      answerHtml = '<div class="bgl-feedback-answer">' +
        (result.highlight || esc(result.correctAnswer)) + '</div>';
    }
    if (result.explanation) {
      answerHtml += '<p class="bgl-feedback-exp">' + esc(result.explanation) + '</p>';
    }

    panel.innerHTML =
      '<div class="bgl-feedback-inner">' +
        '<div class="bgl-feedback-icon" aria-hidden="true">' +
          '<span class="material-symbols-outlined">' + (result.correct ? 'check_circle' : 'lightbulb') + '</span>' +
        '</div>' +
        '<div class="bgl-feedback-body">' +
          '<div class="bgl-feedback-title">' + title + '</div>' +
          answerHtml +
        '</div>' +
        '<button type="button" class="bgl-feedback-continue">Continue</button>' +
      '</div>';

    panel.querySelector('.bgl-feedback-continue').addEventListener('click', function() {
      panel.remove();
      var footer = document.querySelector('.bgl-footer');
      if (footer) footer.classList.remove('bgl-footer--hidden');
      onContinue();
    });

    var footer = document.querySelector('.bgl-footer');
    if (footer) footer.classList.add('bgl-footer--hidden');

    document.body.appendChild(panel);
  }

  function updateProgress() {
    if (!state) return;
    var fill = document.getElementById('bgl-progress-fill');
    if (!fill) return;
    var pct = state.steps.length ? Math.round(((state.stepIdx + 1) / state.steps.length) * 100) : 0;
    fill.style.width = pct + '%';
  }

  function renderCurrentStep() {
    if (!state) return;
    var step = state.steps[state.stepIdx];
    var container = document.getElementById('bgl-step-content');
    var footerBtn = document.getElementById('bgl-action-btn');
    var instruction = document.getElementById('bgl-instruction');

    if (!container || !step) return;

    container.innerHTML = renderStep(step);
    bindExercise(state.root, step);

    var isTheory = step.kind === 'theory';
    if (instruction) {
      if (isTheory) {
        instruction.textContent = step.section.title || '';
      } else {
        instruction.textContent = step.section.studentInstruction || step.section.instructions || '';
      }
    }

    if (footerBtn) {
      footerBtn.textContent = isTheory ? 'Continue' : 'Check';
      footerBtn.disabled = !isTheory && !isAnswered(state.root, step);
      footerBtn.setAttribute('data-mode', isTheory ? 'continue' : 'check');
    }

    updateProgress();

    var existingFb = document.getElementById('bgl-feedback');
    if (existingFb) existingFb.remove();
    var footer = document.querySelector('.bgl-footer');
    if (footer) footer.classList.remove('bgl-footer--hidden');
  }

  function advanceStep() {
    if (!state) return;
    if (state.stepIdx < state.steps.length - 1) {
      state.stepIdx++;
      renderCurrentStep();
      saveProgress();
    } else {
      finishLesson();
    }
  }

  function handleAction() {
    if (!state) return;
    var step = state.steps[state.stepIdx];
    var btn = document.getElementById('bgl-action-btn');
    if (!step || !btn) return;

    if (btn.getAttribute('data-mode') === 'continue' && step.kind === 'theory') {
      advanceStep();
      return;
    }

    if (btn.getAttribute('data-mode') === 'continue') {
      advanceStep();
      return;
    }

    if (!isAnswered(state.root, step)) return;

    var result = checkStep(state.root, step);
    if (result.correct) state.correctCount++;
    state.totalChecked++;

    btn.textContent = 'Continue';
    btn.setAttribute('data-mode', 'continue');
    btn.disabled = false;

    showFeedback(result, function() {
      advanceStep();
    });
  }

  function finishLesson() {
    if (!state) return;
    var level = state.level;
    var unitId = state.unitId;
    var unitData = state.unitData;

    if (typeof BentoGrid !== 'undefined') {
      var visitedSections = {};
      state.steps.forEach(function(step) { visitedSections[step.secIdx] = true; });
      Object.keys(visitedSections).forEach(function(idx) {
        BentoGrid._markCourseSectionVisited(level, unitId, parseInt(idx, 10));
      });
      BentoGrid._checkCourseUnitAllDone(level, unitId);
    }

    var existing = document.getElementById('bgl-complete-modal');
    if (existing) existing.remove();

    var score = state.totalChecked > 0
      ? state.correctCount + '/' + state.totalChecked + ' correct'
      : 'Exercise completed';

    var modal = document.createElement('div');
    modal.id = 'bgl-complete-modal';
    modal.className = 'bgl-complete-overlay';
    modal.innerHTML =
      '<div class="bgl-complete-box" role="dialog" aria-labelledby="bgl-complete-title" aria-modal="true">' +
        '<div class="bgl-complete-icon" aria-hidden="true">' +
          '<span class="material-symbols-outlined">celebration</span>' +
        '</div>' +
        '<h2 class="bgl-complete-title" id="bgl-complete-title">Congratulations!</h2>' +
        '<p class="bgl-complete-text">You completed this exercise.</p>' +
        '<p class="bgl-complete-score">' + esc(score) + '</p>' +
        '<button type="button" class="bgl-complete-btn" id="bgl-complete-back">Back to unit</button>' +
      '</div>';
    document.body.appendChild(modal);

    function goBack() {
      modal.remove();
      if (state.backFn) {
        try { new Function(state.backFn)(); } catch (e) { console.error(e); }
      }
    }

    modal.querySelector('#bgl-complete-back').addEventListener('click', goBack);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) goBack();
    });
  }

  function progressKey(unitId, sectionIdx) {
    return 'bgl-progress-' + unitId + (sectionIdx != null ? '-' + sectionIdx : '');
  }

  function saveProgress() {
    if (!state) return;
    try {
      localStorage.setItem(progressKey(state.unitId, state.sectionIdx), JSON.stringify({ stepIdx: state.stepIdx }));
    } catch (e) { /* ignore */ }
  }

  function loadProgress(unitId, sectionIdx) {
    try {
      var raw = localStorage.getItem(progressKey(unitId, sectionIdx));
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function buildChrome(unitData, backFn) {
    return '<div class="bgl-lesson" id="bgl-lesson-root">' +
      '<div class="bgl-chrome">' +
        '<button type="button" class="bgl-close" id="bgl-close-btn" aria-label="Close lesson">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="bgl-progress-track">' +
          '<div class="bgl-progress-fill" id="bgl-progress-fill" style="width:0%"></div>' +
        '</div>' +
      '</div>' +
      '<div class="bgl-unit-header">' +
        '<h1 class="bgl-unit-title">' + esc(unitData.unitTitle || '') + '</h1>' +
        (unitData.unitSubtitle ? '<p class="bgl-unit-subtitle">' + esc(unitData.unitSubtitle) + '</p>' : '') +
      '</div>' +
      '<p class="bgl-instruction" id="bgl-instruction"></p>' +
      '<div class="bgl-card-shell">' +
        '<div class="bgl-card" id="bgl-step-content"></div>' +
      '</div>' +
      '<div class="bgl-footer">' +
        '<button type="button" class="bgl-action-btn" id="bgl-action-btn" disabled>Continue</button>' +
      '</div>' +
    '</div>';
  }

  function init(opts) {
    opts = opts || {};
    var mount = opts.mount || document.getElementById('bgl-lesson-mount');
    if (!mount || !opts.unitData) return;

    var sectionIdx = typeof opts.sectionIdx === 'number' ? opts.sectionIdx : null;
    var targetSection = sectionIdx != null ? (opts.unitData.sections || [])[sectionIdx] : null;
    var skipTheory = !!opts.skipTheory || (targetSection && targetSection.type === 'exercise');
    var steps = buildSteps(opts.unitData, skipTheory, sectionIdx);
    if (!steps.length) {
      mount.innerHTML = '<p class="bgl-empty">No lesson content found.</p>';
      return;
    }

    mount.innerHTML = buildChrome(opts.unitData, opts.backFn);
    var root = mount.querySelector('#bgl-lesson-root');

    var startStep = 0;
    var saved = loadProgress(opts.unitId, sectionIdx);
    if (saved && typeof saved.stepIdx === 'number') {
      startStep = Math.min(saved.stepIdx, steps.length - 1);
    }

    state = {
      unitId: opts.unitId,
      unitData: opts.unitData,
      level: opts.level || 'B1',
      sectionIdx: sectionIdx,
      steps: steps,
      stepIdx: Math.max(0, Math.min(startStep, steps.length - 1)),
      correctCount: 0,
      totalChecked: 0,
      backFn: opts.backFn,
      root: root
    };

    document.getElementById('bgl-action-btn').addEventListener('click', handleAction);
    document.getElementById('bgl-close-btn').addEventListener('click', function() {
      if (opts.backFn) {
        try { new Function(opts.backFn)(); } catch (e) { console.error(e); }
      }
    });
    root.addEventListener('bgl-answer-change', function() {
      var step = state.steps[state.stepIdx];
      var btn = document.getElementById('bgl-action-btn');
      if (btn && step && step.kind === 'exercise' && btn.getAttribute('data-mode') === 'check') {
        btn.disabled = !isAnswered(root, step);
      }
    });

    renderCurrentStep();

    var layout = document.querySelector('.dashboard-layout');
    var center = document.getElementById('courseCenterSection');
    if (layout) layout.classList.add('dashboard-layout--lesson-focus');
    if (center) center.classList.add('course-center--lesson-focus');
    var header = document.querySelector('.subpage-header--course-unit');
    if (header) header.style.display = 'none';
    var rightSidebar = document.getElementById('dashboardRightSidebar');
    if (rightSidebar) rightSidebar.style.display = 'none';
  }

  window.B1GrammarLesson = {
    init: init,
    buildSteps: buildSteps,
    firstExerciseStepIndex: firstExerciseStepIndex,
    firstExerciseSectionIndex: firstExerciseSectionIndex,
    sectionIndexToStep: sectionIndexToStep,
    isDuolingoUnit: function(data) {
      return data && data.type === 'grammar' && (
        data.schemaVersion === 'sune-english-unit-v1' ||
        data.lessonStyle === 'duolingo-inspired'
      );
    }
  };
})();
