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

  function speakText(text, onEnd) {
    if (window.SunePlayTheory && window.SunePlayTheory.speakText) {
      window.SunePlayTheory.speakText(text, onEnd);
      return;
    }
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-GB';
    utter.rate = 0.85;
    utter.pitch = 1;
    if (typeof onEnd === 'function') {
      utter.onend = onEnd;
      utter.onerror = onEnd;
    }
    window.speechSynthesis.speak(utter);
  }

  function buildGapSentence(before, selected, after) {
    if (!selected) return '';
    return [before, selected, after]
      .filter(function(part) { return part != null && String(part).trim(); })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
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

  function splitVerbPhrase(verbPhrase) {
    var parts = (verbPhrase || '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return { baseVerb: '', rest: '' };
    return { baseVerb: parts[0], rest: parts.slice(1).join(' ') };
  }

  function addFixedWords(fixed, phrase) {
    normCompare(phrase).split(/\s+/).forEach(function(w) {
      w = w.replace(/[.,!?;:]/g, '');
      if (w) fixed[w] = true;
    });
  }

  function getFixedWordsNorm(item) {
    var p = (item && item.prompt) || {};
    var fixed = {};
    if (p.subject) addFixedWords(fixed, p.subject);
    (p.timeExpression || '').split(/\s*\/\s*/).forEach(function(part) {
      addFixedWords(fixed, part);
    });
    var vp = splitVerbPhrase(p.verbPhrase || '');
    if (vp.rest) addFixedWords(fixed, vp.rest);
    return fixed;
  }

  function getConjugatedVerbAnswers(item) {
    var fixed = getFixedWordsNorm(item);
    var verbs = [];
    var seen = {};
    acceptedStrings(item).forEach(function(ans) {
      normCompare(ans).split(/\s+/).forEach(function(w) {
        w = w.replace(/[.,!?;:]/g, '');
        if (!w || fixed[w] || seen[w]) return;
        seen[w] = true;
        verbs.push(w);
      });
    });
    return verbs;
  }

  var HEARTS_MAX = 5;

  function getStepMeta(step) {
    if (!step || step.kind !== 'exercise') return { explanation: '', correctAnswer: '' };
    var item = step.item;
    if (step.exerciseType === 'passage_error_hunt') {
      return {
        explanation: 'Keep tapping the incorrect verb phrases.',
        correctAnswer: ''
      };
    }
    if (!item) return { explanation: '', correctAnswer: '' };
    var answer = primaryAnswer(item);
    if (step.exerciseType === 'gap_fill') {
      answer = (item.sentence || '').replace(GAP_RE, answer);
    } else if (step.exerciseType === 'tap_choice') {
      answer = item.completedSentence || item.answer || answer;
    } else if (step.exerciseType === 'verb_bank_gap_fill') {
      answer = item.completedSentence || answer;
    }
    return {
      explanation: item.explanation || step.section.instructions || '',
      correctAnswer: answer
    };
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

    html += '</div>';
    return html;
  }

  // ─── BuildTheSentenceExercise (prompt_to_sentence) ────────────────────

  function renderBuildTheSentence(step) {
    var item = step.item;
    var p = item.prompt || {};
    var vp = splitVerbPhrase(p.verbPhrase || '');
    var timeParts = (p.timeExpression || '').split(/\s*\/\s*/).map(function(s) { return s.trim(); }).filter(Boolean);
    var expectedVerbs = getConjugatedVerbAnswers(item);

    var html = '<div class="bgl-exercise bgl-exercise--build" data-component="BuildTheSentenceExercise">' +
      '<p class="bgl-prompt-display">' + esc(item.displayPrompt || '') + '</p>' +
      '<div class="bgl-sentence-builder" role="group" aria-label="Conjugate the verb">';

    if (p.subject) {
      html += '<span class="bgl-fixed-chip">' + esc(p.subject) + '</span>';
    }

    html += '<span class="bgl-verb-slot">' +
      '<input type="text" id="bgl-sentence-input" class="bgl-gap-input bgl-gap-input--verb bgl-gap-input--build" ' +
        'autocomplete="off" spellcheck="false" aria-label="Conjugated verb" ' +
        'data-explanation="' + esc(item.explanation || '') + '" ' +
        'data-answer="' + esc(primaryAnswer(item)) + '" ' +
        'data-expected-verbs="' + esc(JSON.stringify(expectedVerbs)) + '" ' +
        'placeholder="' + esc(vp.baseVerb) + '">' +
      '</span>';

    if (vp.rest) {
      html += '<span class="bgl-fixed-chip">' + esc(vp.rest) + '</span>';
    }

    timeParts.forEach(function(part) {
      html += '<span class="bgl-fixed-chip">' + esc(part) + '</span>';
    });

    html += '</div></div>';
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
      '<div class="bgl-tap-sentence-row">' +
      '<div class="bgl-tap-sentence">' +
        '<span class="bgl-tap-before">' + esc(item.sentenceBefore || '') + '</span> ' +
        '<span class="bgl-tap-blank" id="bgl-tap-slot" aria-live="polite"></span> ' +
        '<span class="bgl-tap-after">' + esc(item.sentenceAfter || '') + '</span>' +
      '</div>' +
      '<button type="button" class="bgl-sentence-speak" data-action="bgl-speak-sentence"' +
        ' aria-label="Listen to full sentence" title="Listen to full sentence">' +
        '<span class="material-symbols-outlined" aria-hidden="true">volume_up</span>' +
      '</button>' +
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
    var expectedVerbs = [];
    try {
      expectedVerbs = JSON.parse(input.getAttribute('data-expected-verbs') || '[]');
    } catch (e) { /* ignore */ }
    if (!expectedVerbs.length) expectedVerbs = getConjugatedVerbAnswers(item);
    var correct = expectedVerbs.some(function(v) {
      return normCompare(given, false) === normCompare(v, false);
    });
    var expected = primaryAnswer(item);
    return {
      correct: correct,
      explanation: input.getAttribute('data-explanation') || '',
      correctAnswer: expected,
      userAnswer: given,
      highlight: esc(expected)
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
      var item = step.item || {};
      var speakBtn = ex.querySelector('[data-action="bgl-speak-sentence"]');
      if (speakBtn) {
        speakBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var selected = '';
          var sel = ex.querySelector('.bgl-tap-option--selected');
          if (sel) selected = sel.getAttribute('data-value') || '';
          var full = buildGapSentence(item.sentenceBefore, selected, item.sentenceAfter);
          if (!full) return;
          speakBtn.classList.add('bgl-sentence-speak--speaking');
          speakText(full, function() {
            speakBtn.classList.remove('bgl-sentence-speak--speaking');
          });
        });
      }
      ex.querySelectorAll('.bgl-tap-option').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (ex.classList.contains('bgl-exercise--checked')) return;
          ex.querySelectorAll('.bgl-tap-option').forEach(function(b) { b.classList.remove('bgl-tap-option--selected'); });
          btn.classList.add('bgl-tap-option--selected');
          var optText = btn.getAttribute('data-value') || '';
          var slot = ex.querySelector('#bgl-tap-slot');
          if (slot) slot.textContent = optText;
          root.dispatchEvent(new CustomEvent('bgl-answer-change', { bubbles: true }));
          if (!optText) return;
          speakText(optText);
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

  function updateHearts() {
    var container = document.getElementById('bgl-hearts');
    if (!container || !state) return;
    container.querySelectorAll('.bgl-heart').forEach(function(heart, idx) {
      heart.classList.toggle('bgl-heart--empty', idx >= state.hearts);
    });
  }

  function loseHeart() {
    if (!state || state.hearts <= 0) return;
    state.hearts--;
    updateHearts();
    if (state.hearts <= 0) {
      showOutOfHeartsModal();
    }
  }

  function resetSession() {
    if (!state) return;
    state.hearts = HEARTS_MAX;
    state.retryQueue = [];
    state.inRetryMode = false;
    state.retryPos = 0;
    state.correctCount = 0;
    state.totalChecked = 0;
    state.stepIdx = 0;
    updateHearts();
  }

  function queueRetry(stepIdx) {
    if (!state || state.retryQueue.indexOf(stepIdx) !== -1) return;
    state.retryQueue.push(stepIdx);
  }

  function isExerciseStep(step) {
    return step && step.kind === 'exercise';
  }

  function lastMainStepIdx() {
    if (!state) return 0;
    for (var i = state.steps.length - 1; i >= 0; i--) {
      if (isExerciseStep(state.steps[i])) return i;
    }
    return state.steps.length - 1;
  }

  function firstTheoryStepIdxForSection(secIdx) {
    if (!state) return 0;
    for (var i = 0; i < state.steps.length; i++) {
      var s = state.steps[i];
      if (s.kind === 'theory' && s.secIdx === secIdx) return i;
    }
    return 0;
  }

  function getTheoryStepIndices(secIdx) {
    if (!state) return [];
    var out = [];
    state.steps.forEach(function(s, i) {
      if (s.kind === 'theory' && s.secIdx === secIdx) out.push(i);
    });
    return out;
  }

  function renderTheoryDots() {
    var dotsEl = document.getElementById('bgl-theory-dots');
    if (!dotsEl || !state) return;
    var step = state.steps[state.stepIdx];
    if (!step || step.kind !== 'theory') {
      dotsEl.innerHTML = '';
      dotsEl.hidden = true;
      return;
    }
    var indices = getTheoryStepIndices(step.secIdx);
    if (indices.length <= 1) {
      dotsEl.innerHTML = '';
      dotsEl.hidden = true;
      return;
    }
    dotsEl.hidden = false;
    dotsEl.innerHTML = indices.map(function(idx) {
      var s = state.steps[idx];
      var active = idx === state.stepIdx;
      return '<button type="button" class="bgl-card-dot' + (active ? ' bgl-card-dot--active' : '') + '" ' +
        'data-step-idx="' + idx + '" aria-label="Card ' + (s.cardIdx + 1) + ' of ' + s.cardTotal + '"></button>';
    }).join('');
    dotsEl.querySelectorAll('.bgl-card-dot').forEach(function(dot) {
      dot.addEventListener('click', function() {
        var target = parseInt(dot.getAttribute('data-step-idx'), 10);
        if (isNaN(target) || target === state.stepIdx) return;
        state.stepIdx = target;
        renderCurrentStep();
      });
    });
  }

  function showOutOfHeartsModal() {
    var existing = document.getElementById('bgl-hearts-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'bgl-hearts-modal';
    modal.className = 'bgl-complete-overlay bgl-hearts-overlay';
    modal.innerHTML =
      '<div class="bgl-complete-box" role="dialog" aria-labelledby="bgl-hearts-title" aria-modal="true">' +
        '<div class="bgl-complete-icon bgl-complete-icon--hearts" aria-hidden="true">' +
          '<span class="material-symbols-outlined">favorite</span>' +
        '</div>' +
        '<h2 class="bgl-complete-title bgl-complete-title--hearts" id="bgl-hearts-title">Out of hearts</h2>' +
        '<p class="bgl-complete-text">You ran out of hearts. Try again or go back to the unit.</p>' +
        '<div class="bgl-hearts-actions">' +
          '<button type="button" class="bgl-complete-btn bgl-complete-btn--secondary" id="bgl-hearts-exit">Exit</button>' +
          '<button type="button" class="bgl-complete-btn" id="bgl-hearts-retry">Try again</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelector('#bgl-hearts-retry').addEventListener('click', function() {
      modal.remove();
      clearProgress(state.unitId, state.sectionIdx);
      resetSession();
      renderCurrentStep();
    });
    modal.querySelector('#bgl-hearts-exit').addEventListener('click', function() {
      modal.remove();
      if (state.backFn) {
        try { new Function(state.backFn)(); } catch (e) { console.error(e); }
      }
    });
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
        if (state.backFn) {
          try { new Function(state.backFn)(); } catch (err) { console.error(err); }
        }
      }
    });
  }

  function applyTapChoiceResultStyles(ex, result) {
    if (!ex || !result) return;
    var slot = ex.querySelector('#bgl-tap-slot');
    if (slot) {
      slot.classList.toggle('bgl-tap-blank--correct', result.correct === true);
      slot.classList.toggle('bgl-tap-blank--incorrect', result.correct === false);
    }
    var selected = ex.querySelector('.bgl-tap-option--selected');
    if (selected) {
      selected.classList.toggle('bgl-tap-option--correct', result.correct === true);
      selected.classList.toggle('bgl-tap-option--incorrect', result.correct === false);
    }
  }

  function syncStepUrl() {
    if (!state || typeof BentoGrid === 'undefined' || !BentoGrid._syncCourseUnitUrl) return;
    var step = state.steps[state.stepIdx];
    if (!step) return;
    BentoGrid._syncCourseUnitUrl(step.secIdx, true);
  }

  function showFeedback(result, onContinue) {
    if (window.AudioUtils) {
      if (result.correct) AudioUtils.playSuccessSound();
      else AudioUtils.playFailureSound();
    }
    var existing = document.getElementById('bgl-feedback');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'bgl-feedback';
    var useExplainSheet = typeof LessonExplanation !== 'undefined' &&
      LessonExplanation.isMobile() && !!result.explanation;
    panel.className = 'bgl-feedback ' +
      (result.correct ? 'bgl-feedback--correct' : 'bgl-feedback--wrong') +
      (useExplainSheet ? ' bgl-feedback--mobile-explain' : '');
    panel.setAttribute('role', 'alert');

    var title = result.correct ? 'Nice!' : 'Not quite';
    var answerHtml = '';
    if (result.correctAnswer) {
      answerHtml = '<div class="bgl-feedback-answer">' +
        (result.highlight || esc(result.correctAnswer)) + '</div>';
    }
    if (result.explanation && !useExplainSheet) {
      answerHtml += '<p class="bgl-feedback-exp">' + esc(result.explanation) + '</p>';
    }

    var explainBtnHtml = useExplainSheet
      ? '<button type="button" class="bgl-feedback-explain">Explain my answer</button>'
      : '';

    panel.innerHTML =
      '<div class="bgl-feedback-inner">' +
        '<div class="bgl-feedback-top">' +
          '<div class="bgl-feedback-icon" aria-hidden="true">' +
            '<span class="material-symbols-outlined">' + (result.correct ? 'check_circle' : 'lightbulb') + '</span>' +
          '</div>' +
          '<div class="bgl-feedback-body">' +
            '<div class="bgl-feedback-title">' + title + '</div>' +
            answerHtml +
          '</div>' +
        '</div>' +
        '<div class="bgl-feedback-actions">' +
          explainBtnHtml +
          '<button type="button" class="bgl-feedback-continue">Continue</button>' +
        '</div>' +
      '</div>';

    panel.querySelector('.bgl-feedback-continue').addEventListener('click', function() {
      if (typeof LessonExplanation !== 'undefined') LessonExplanation.close();
      panel.remove();
      var footer = document.querySelector('.bgl-footer');
      if (footer) footer.classList.remove('bgl-footer--hidden');
      onContinue();
    });

    var explainBtn = panel.querySelector('.bgl-feedback-explain');
    if (explainBtn && typeof LessonExplanation !== 'undefined') {
      explainBtn.addEventListener('click', function() {
        var instruction = document.getElementById('bgl-instruction');
        var stepContent = document.getElementById('bgl-step-content');
        LessonExplanation.open({
          title: 'Explain my answer',
          context: instruction ? instruction.textContent.trim() : '',
          explanation: result.explanation,
          correctAnswer: result.correct ? '' : result.correctAnswer,
          continueLabel: 'Back',
          inlineMount: stepContent || null
        });
      });
    }

    var footer = document.querySelector('.bgl-footer');
    if (footer) footer.classList.add('bgl-footer--hidden');

    var lessonRoot = document.getElementById('bgl-lesson-root');
    if (lessonRoot) lessonRoot.appendChild(panel);
    else document.body.appendChild(panel);
  }

  function updateProgress() {
    if (!state) return;
    var step = state.steps[state.stepIdx];
    var isTheory = step && step.kind === 'theory';
    var track = document.querySelector('.bgl-progress-track');
    var heartsEl = document.getElementById('bgl-hearts');
    if (track) track.style.display = isTheory ? 'none' : '';
    if (heartsEl) heartsEl.style.display = isTheory ? 'none' : '';
    var fill = document.getElementById('bgl-progress-fill');
    if (!fill || isTheory) return;
    var exIndices = [];
    state.steps.forEach(function(s, i) {
      if (s.kind === 'exercise') exIndices.push(i);
    });
    if (!exIndices.length) return;
    var pos = exIndices.indexOf(state.stepIdx);
    if (pos < 0) pos = exIndices.length - 1;
    var pct = Math.round(((pos + 1) / exIndices.length) * 100);
    fill.style.width = pct + '%';
  }

  function updateTheoryFooter() {
    if (!state) return;
    var step = state.steps[state.stepIdx];
    var isTheory = step && step.kind === 'theory';
    var lessonRoot = document.getElementById('bgl-lesson-root');
    var theoryNav = document.getElementById('bgl-footer-theory');
    var exerciseNav = document.getElementById('bgl-footer-exercise');
    var actionBtn = document.getElementById('bgl-action-btn');
    var backBtn = document.getElementById('bgl-back-btn');
    var nextBtn = document.getElementById('bgl-next-btn');
    var skipBtn = document.getElementById('bgl-skip-btn');

    if (lessonRoot) {
      lessonRoot.classList.toggle('bgl-lesson--theory', isTheory);
      lessonRoot.classList.toggle('bgl-lesson--exercise', !isTheory);
    }
    if (theoryNav) theoryNav.style.display = isTheory ? '' : 'none';
    if (exerciseNav) exerciseNav.style.display = isTheory ? 'none' : '';
    if (actionBtn) actionBtn.style.display = isTheory ? 'none' : '';
    if (skipBtn) skipBtn.style.display = isTheory ? 'none' : '';
    if (backBtn) {
      var firstTheoryIdx = step && step.kind === 'theory'
        ? firstTheoryStepIdxForSection(step.secIdx)
        : 0;
      backBtn.disabled = state.stepIdx <= firstTheoryIdx;
    }
    if (nextBtn) {
      nextBtn.textContent = state.stepIdx >= state.steps.length - 1 ? 'Finish' : 'Next';
    }
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
      footerBtn.textContent = 'Check';
      footerBtn.disabled = !isAnswered(state.root, step);
      footerBtn.setAttribute('data-mode', 'check');
    }

    var skipBtn = document.getElementById('bgl-skip-btn');
    if (skipBtn) skipBtn.disabled = step.kind !== 'exercise';

    updateProgress();
    updateTheoryFooter();
    renderTheoryDots();
    syncStepUrl();

    var existingFb = document.getElementById('bgl-feedback');
    if (existingFb) existingFb.remove();
    var footer = document.querySelector('.bgl-footer');
    if (footer) footer.classList.remove('bgl-footer--hidden');
  }

  function goBackStep() {
    if (!state || state.stepIdx <= 0) return;
    var step = state.steps[state.stepIdx];
    if (step && step.kind === 'theory') {
      var firstIdx = firstTheoryStepIdxForSection(step.secIdx);
      if (state.stepIdx <= firstIdx) return;
    }
    state.stepIdx--;
    renderCurrentStep();
  }

  function goNextTheoryStep() {
    if (!state) return;
    var step = state.steps[state.stepIdx];
    if (step && step.kind === 'theory' && typeof BentoGrid !== 'undefined') {
      BentoGrid._markCourseSectionVisited(state.level, state.unitId, step.secIdx);
      BentoGrid._checkCourseUnitAllDone(state.level, state.unitId);
    }
    if (state.stepIdx < state.steps.length - 1) {
      state.stepIdx++;
      renderCurrentStep();
    } else {
      finishLesson();
    }
  }

  function advanceStep() {
    if (!state) return;
    if (state.hearts <= 0) return;
    if (window.AudioUtils) AudioUtils.stopPhrasePlayback();

    if (state.inRetryMode) {
      state.retryPos++;
      if (state.retryPos < state.retryQueue.length) {
        state.stepIdx = state.retryQueue[state.retryPos];
        renderCurrentStep();
        return;
      }
      finishLesson();
      return;
    }

    var lastMain = lastMainStepIdx();
    if (state.stepIdx < lastMain) {
      state.stepIdx++;
      renderCurrentStep();
      return;
    }

    if (state.retryQueue.length > 0) {
      state.inRetryMode = true;
      state.retryPos = 0;
      state.stepIdx = state.retryQueue[0];
      renderCurrentStep();
      return;
    }

    finishLesson();
  }

  function afterExerciseResult(result, stepIdx) {
    if (!result.correct) {
      if (!state.inRetryMode) queueRetry(stepIdx);
      loseHeart();
      if (state.hearts <= 0) return;
    }
    var btn = document.getElementById('bgl-action-btn');
    var skipBtn = document.getElementById('bgl-skip-btn');
    if (btn) {
      btn.textContent = 'Continue';
      btn.setAttribute('data-mode', 'continue');
      btn.disabled = false;
    }
    if (skipBtn) skipBtn.disabled = true;
    showFeedback(result, function() {
      advanceStep();
    });
  }

  function handleAction() {
    if (!state || state.hearts <= 0) return;
    var step = state.steps[state.stepIdx];
    var btn = document.getElementById('bgl-action-btn');
    if (!step || !btn) return;

    if (btn.getAttribute('data-mode') === 'continue') {
      advanceStep();
      return;
    }

    if (!isAnswered(state.root, step)) return;

    var result = checkStep(state.root, step);
    if (result.correct) state.correctCount++;
    state.totalChecked++;
    if (step.exerciseType === 'tap_choice') {
      var tapEx = state.root.querySelector('.bgl-exercise--tap');
      if (tapEx) applyTapChoiceResultStyles(tapEx, result);
    }
    afterExerciseResult(result, state.stepIdx);
  }

  function handleSkip() {
    if (!state || state.hearts <= 0) return;
    var step = state.steps[state.stepIdx];
    var btn = document.getElementById('bgl-action-btn');
    if (!step || step.kind !== 'exercise' || !btn || btn.getAttribute('data-mode') === 'continue') return;

    var meta = getStepMeta(step);
    var result = {
      correct: false,
      explanation: meta.explanation,
      correctAnswer: meta.correctAnswer,
      highlight: esc(meta.correctAnswer)
    };

    checkStep(state.root, step);
    state.totalChecked++;
    if (step.exerciseType === 'tap_choice') {
      var tapEx = state.root.querySelector('.bgl-exercise--tap');
      if (tapEx) applyTapChoiceResultStyles(tapEx, result);
    }
    afterExerciseResult(result, state.stepIdx);
  }

  function isExerciseInProgress() {
    if (!state) return false;
    if (document.getElementById('bgl-complete-modal')) return false;
    var step = state.steps[state.stepIdx];
    return !!(step && step.kind === 'exercise' && state.hearts > 0);
  }

  function requestLessonExit() {
    var goBack = function() {
      if (state && state.backFn) {
        try { new Function(state.backFn)(); } catch (e) { console.error(e); }
      }
    };
    if (isExerciseInProgress() && typeof BentoGrid !== 'undefined' && BentoGrid._showLearningExitConfirm) {
      BentoGrid._showLearningExitConfirm(goBack);
      return;
    }
    goBack();
  }

  function finishLesson() {
    if (!state) return;
    var level = state.level;
    var unitId = state.unitId;

    if (typeof BentoGrid !== 'undefined' && state.sectionIdx != null && state.totalChecked > 0) {
      var passed = (state.correctCount / state.totalChecked) >= 0.7;
      if (passed) {
        BentoGrid._saveCuExSectionChecked(unitId, state.sectionIdx, null, state.correctCount, state.totalChecked);
        BentoGrid._markCourseSectionVisited(level, unitId, state.sectionIdx);
        BentoGrid._checkCourseUnitAllDone(level, unitId);
      }
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
    var lessonRoot = document.getElementById('bgl-lesson-root');
    if (lessonRoot) lessonRoot.appendChild(modal);
    else document.body.appendChild(modal);

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

  function clearProgress(unitId, sectionIdx) {
    try {
      localStorage.removeItem(progressKey(unitId, sectionIdx));
    } catch (e) { /* ignore */ }
  }

  function buildChrome(unitData, backFn) {
    var heartsHtml = '';
    for (var h = 0; h < HEARTS_MAX; h++) {
      heartsHtml += '<span class="bgl-heart"><i class="fa-solid fa-heart" aria-hidden="true"></i></span>';
    }
    return '<div class="bgl-lesson" id="bgl-lesson-root">' +
      '<div class="bgl-chrome">' +
        '<button type="button" class="bgl-close" id="bgl-close-btn" aria-label="Close lesson">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="bgl-progress-track">' +
          '<div class="bgl-progress-fill" id="bgl-progress-fill" style="width:0%"></div>' +
        '</div>' +
        '<div class="bgl-hearts" id="bgl-hearts" aria-label="Lives remaining">' + heartsHtml + '</div>' +
      '</div>' +
      '<div class="bgl-unit-header">' +
        '<h1 class="bgl-unit-title">' + esc(unitData.unitTitle || '') + '</h1>' +
        (unitData.unitSubtitle ? '<p class="bgl-unit-subtitle">' + esc(unitData.unitSubtitle) + '</p>' : '') +
      '</div>' +
      '<p class="bgl-instruction" id="bgl-instruction"></p>' +
      '<div class="bgl-theory-dots" id="bgl-theory-dots" hidden></div>' +
      '<div class="bgl-card-shell">' +
        '<div class="bgl-card" id="bgl-step-content"></div>' +
      '</div>' +
      '<div class="bgl-footer" id="bgl-footer">' +
        '<div class="bgl-footer-theory" id="bgl-footer-theory" style="display:none">' +
          '<button type="button" class="bgl-nav-btn" id="bgl-back-btn">' +
            '<span class="material-symbols-outlined">arrow_back</span> Back' +
          '</button>' +
          '<button type="button" class="bgl-nav-btn bgl-nav-btn--primary" id="bgl-next-btn">Next</button>' +
        '</div>' +
        '<div class="bgl-footer-exercise" id="bgl-footer-exercise">' +
          '<button type="button" class="bgl-skip-btn" id="bgl-skip-btn">Skip</button>' +
          '<button type="button" class="bgl-action-btn" id="bgl-action-btn" disabled>Check</button>' +
        '</div>' +
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

    clearProgress(opts.unitId, sectionIdx);

    var startStep = 0;
    if (targetSection && targetSection.type === 'theory') {
      for (var ti = 0; ti < steps.length; ti++) {
        if (steps[ti].kind === 'theory' && steps[ti].secIdx === sectionIdx) {
          startStep = ti;
          break;
        }
      }
    } else if (skipTheory) {
      for (var si = 0; si < steps.length; si++) {
        if (steps[si].kind === 'exercise') { startStep = si; break; }
      }
    }

    state = {
      unitId: opts.unitId,
      unitData: opts.unitData,
      level: opts.level || 'B1',
      sectionIdx: sectionIdx,
      steps: steps,
      stepIdx: startStep,
      hearts: HEARTS_MAX,
      retryQueue: [],
      inRetryMode: false,
      retryPos: 0,
      correctCount: 0,
      totalChecked: 0,
      backFn: opts.backFn,
      root: root
    };

    document.getElementById('bgl-action-btn').addEventListener('click', handleAction);
    document.getElementById('bgl-skip-btn').addEventListener('click', handleSkip);
    document.getElementById('bgl-back-btn').addEventListener('click', goBackStep);
    document.getElementById('bgl-next-btn').addEventListener('click', goNextTheoryStep);
    document.getElementById('bgl-close-btn').addEventListener('click', requestLessonExit);
    root.addEventListener('bgl-answer-change', function() {
      var step = state.steps[state.stepIdx];
      var btn = document.getElementById('bgl-action-btn');
      if (btn && step && step.kind === 'exercise' && btn.getAttribute('data-mode') === 'check') {
        btn.disabled = !isAnswered(root, step);
      }
    });

    updateHearts();
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
