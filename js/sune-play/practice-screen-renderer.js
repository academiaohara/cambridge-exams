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

  function countGaps(sentence) {
    return (String(sentence || '').match(GAP_RE) || []).length;
  }

  function renderSentenceWithGap(sentence, gapHtml) {
    var parts = (sentence || '').split(GAP_RE);
    var gapCount = countGaps(sentence);
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      html += bold(parts[i]);
      if (i < gapCount) html += gapHtml;
    }
    return html;
  }

  function fillGapsInSentence(sentence, answers) {
    var idx = 0;
    return String(sentence || '').replace(GAP_RE, function() {
      var ans = answers[idx++];
      return ans != null && String(ans).trim() ? ans : ' ';
    }).replace(/\s+/g, ' ').trim();
  }

  function buildInlineGapInput(gapIdx) {
    var idAttr = gapIdx === 0 ? ' id="sp-gap-input"' : '';
    return '<span class="sp-inline-gap-group sp-inline-gap sp-inline-gap-group--solo" role="group" aria-label="Gap ' + (gapIdx + 1) + '">' +
      '<input type="text" class="sp-gap-inline-input" data-gap-idx="' + gapIdx + '"' + idAttr +
      ' autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer">' +
    '</span>';
  }

  function renderInlineGapSentence(sentence, verbRef) {
    var parts = (sentence || '').split(GAP_RE);
    var gapCount = countGaps(sentence);
    if (gapCount <= 1) {
      return renderSentenceWithGap(sentence, buildInlineGapField(verbRef));
    }
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      html += bold(parts[i]);
      if (i < gapCount) html += buildInlineGapInput(i);
    }
    if (verbRef) {
      html += '<span class="sp-gap-verb-ref sp-gap-verb-ref--trailing">' + esc(verbRef) + '</span>';
    }
    return html;
  }

  function getGapInputValues(root) {
    var values = [];
    root.querySelectorAll('.sp-gap-inline-input').forEach(function(inp) {
      values.push(inp.value.trim());
    });
    return values;
  }

  function allGapInputsFilled(root) {
    var inputs = root.querySelectorAll('.sp-gap-inline-input');
    if (!inputs.length) return false;
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].value.trim()) return false;
    }
    return true;
  }

  function bindGapInputs(root, onChange) {
    var inputs = root.querySelectorAll('.sp-gap-inline-input');
    inputs.forEach(function(inp) {
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !root.classList.contains('sp-screen--locked')) {
          e.preventDefault();
          var actionBtn = document.getElementById('sp-action-btn');
          if (actionBtn && !actionBtn.disabled) actionBtn.click();
        }
      });
    });
    if (inputs.length) {
      setTimeout(function() { inputs[0].focus(); }, 0);
    }
  }

  function splitSentenceAtHighlight(sentence, highlightedText) {
    var plain = String(sentence || '').replace(/\*\*([^*]+)\*\*/g, '$1');
    var highlight = String(highlightedText || '').trim();
    if (!highlight) return { before: '', after: plain.trim() };
    var idx = plain.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return { before: '', after: plain.trim() };
    return {
      before: plain.slice(0, idx).trim(),
      after: plain.slice(idx + highlight.length).trim()
    };
  }

  function renderErrorMarkedSentence(sentence, highlightedText) {
    if (!highlightedText) return bold(sentence);
    var wrapped = '**' + highlightedText + '**';
    if (sentence.indexOf(wrapped) !== -1) {
      var parts = sentence.split(wrapped);
      return bold(parts[0]) +
        '<mark class="sp-error-mark"><strong>' + esc(highlightedText) + '</strong></mark>' +
        bold(parts.slice(1).join(wrapped));
    }
    var plain = sentence.replace(/\*\*/g, '');
    var idx = plain.toLowerCase().indexOf(highlightedText.toLowerCase());
    if (idx === -1) return bold(sentence);
    return esc(plain.slice(0, idx)) +
      '<mark class="sp-error-mark"><strong>' + esc(highlightedText) + '</strong></mark>' +
      esc(plain.slice(idx + highlightedText.length));
  }

  function buildInlineGapField(verbRef) {
    var inputHtml = '<input type="text" class="sp-gap-inline-input" id="sp-gap-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer">';
    if (!verbRef) {
      return '<span class="sp-inline-gap-group sp-inline-gap sp-inline-gap-group--solo" role="group" aria-label="Gap fill">' + inputHtml + '</span>';
    }
    return '<span class="sp-inline-gap-group sp-inline-gap" role="group" aria-label="Gap fill">' +
      inputHtml +
      '<span class="sp-gap-verb-ref">' + esc(verbRef) + '</span>' +
    '</span>';
  }

  function buildErrorCorrectionGapField(highlightedText) {
    var minWidth = Math.max(String(highlightedText || '').length + 2, 10);
    var inputHtml = '<input type="text" class="sp-gap-inline-input" id="sp-error-input" ' +
      'style="min-width:' + minWidth + 'ch" autocomplete="off" autocapitalize="off" spellcheck="false" ' +
      'aria-label="Type the corrected form">';
    return '<span class="sp-inline-gap-group sp-inline-gap-group--solo" role="group" aria-label="Error correction">' +
      inputHtml +
    '</span>';
  }

  function renderErrorCorrectionGapLine(sentence, highlightedText, gapField) {
    var parts = splitSentenceAtHighlight(sentence, highlightedText);
    var html = '';
    if (parts.before) html += bold(parts.before) + ' ';
    html += gapField;
    if (parts.after) html += ' ' + bold(parts.after);
    return html.trim();
  }

  function randomFeedback(tone, kind) {
    var list = (tone && tone[kind]) || [];
    if (!list.length) return kind === 'correct' ? 'Nice!' : 'Not quite.';
    return list[Math.floor(Math.random() * list.length)];
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

  function getSelectedChoiceText(root) {
    var sel = root.querySelector('.sp-option-btn--selected');
    if (sel) return sel.getAttribute('data-value') || '';
    var slot = root.querySelector('#sp-choice-slot');
    return slot ? slot.textContent.trim() : '';
  }

  function bindSentenceSpeak(root, getText) {
    var el = root.querySelector('[data-action="practice-speak-sentence"]');
    if (!el || el._spSpeakBound) return;
    el._spSpeakBound = true;
    function play() {
      var text = getText();
      if (!text) return;
      el.classList.add('sp-speakable-sentence--speaking');
      speakText(text, function() {
        el.classList.remove('sp-speakable-sentence--speaking');
      });
    }
    el.addEventListener('click', function(e) {
      var target = e.target;
      if (target && (target.classList.contains('sp-gap-inline-input') ||
          target.closest('.sp-gap-inline-input') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)) {
        return;
      }
      e.stopPropagation();
      play();
    });
    el.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      play();
    });
  }

  // ─── PracticeScreenRenderer ──────────────────────────────────────────

  function PracticeScreenRenderer(screen) {
    if (!screen) return '<p class="sp-empty">No screen loaded.</p>';
    switch (screen.formatType) {
      case 'two_option_choice': return renderTwoOption(screen);
      case 'free_text_gap_fill':
      case 'conjugation_gap_fill': return renderGapFill(screen);
      case 'full_sentence_write': return renderFullSentence(screen);
      case 'word_order_tiles': return renderWordOrder(screen);
      case 'error_correction': return renderErrorCorrection(screen);
      case 'verb_bank_two_step': return renderVerbBankTwoStep(screen);
      case 'passage_error_hunt_single': return renderPassageHunt(screen);
      case 'passage_error_hunt_counter': return renderPassageHuntCounter(screen);
      case 'stative_sorting': return renderStativeSorting(screen);
      case 'meaning_contrast': return renderMeaningContrast(screen);
      case 'preselected_verb_gap_fill': return renderGapFill(screen);
      default:
        return '<p class="sp-unknown">Unsupported format: ' + esc(screen.formatType) + '</p>';
    }
  }

  function renderOptionBtn(opt, index) {
    return '<button type="button" class="sp-option-btn" data-value="' + esc(opt) + '">' +
      '<span class="sp-option-num">' + (index + 1) + '</span>' +
      '<span class="sp-option-label">' + esc(opt) + '</span>' +
    '</button>';
  }

  function getChoiceGapWidthCh(options) {
    var max = 0;
    (options || []).forEach(function(opt) {
      max = Math.max(max, String(opt).length);
    });
    return Math.max(max + 1, 8);
  }

  function renderTwoOption(screen) {
    var p = screen.payload || {};
    var gapWidth = getChoiceGapWidthCh(p.options);
    var html = '<div class="sp-screen sp-screen--choice" data-format="two_option_choice">';
    html += '<div class="sp-prompt-row sp-prompt-row--choice">';
    html += '<p class="sp-prompt-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' +
      esc(p.sentenceBefore) +
      ' <span class="sp-gap-anchor" style="--sp-gap-width:' + gapWidth + 'ch">' +
        '<span class="sp-gap-slot" id="sp-choice-slot"></span>' +
      '</span> ' +
      esc(p.sentenceAfter) + '</p>';
    html += '</div>';
    html += '<div class="sp-option-grid">';
    (p.options || []).forEach(function(opt, i) {
      html += renderOptionBtn(opt, i);
    });
    html += '</div></div>';
    return html;
  }

  function renderGapFill(screen) {
    var p = screen.payload || {};
    var verbRef = p.verbPrompt || p.preselectedVerb || '';
    var gapCount = countGaps(p.sentence);
    var multiCls = gapCount > 1 ? ' sp-prompt-sentence--multi-gap' : '';
    var html = '<div class="sp-screen sp-screen--gap" data-format="free_text_gap_fill">';
    html += '<div class="sp-prompt-row sp-prompt-row--gap">';
    html += '<p class="sp-prompt-sentence sp-prompt-sentence--inline-gap' + multiCls + ' sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + renderInlineGapSentence(p.sentence, verbRef) + '</p>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderFullSentence(screen) {
    var p = screen.payload || {};
    return '<div class="sp-screen sp-screen--write" data-format="full_sentence_write">' +
      '<p class="sp-display-prompt sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + esc(p.displayPrompt || '') + '</p>' +
      '<textarea class="sp-text-input sp-text-input--large" id="sp-sentence-input" rows="3" placeholder="Write the full sentence" autocomplete="off"></textarea>' +
    '</div>';
  }

  function renderWordOrder(screen) {
    var p = screen.payload || {};
    var html = '<div class="sp-screen sp-screen--tiles" data-format="word_order_tiles">';
    if (p.imageUrl || p.contextQuestion) {
      html += '<div class="sp-visual-prompt">';
      if (p.imageUrl) {
        html += '<div class="sp-visual-prompt__image-wrap">' +
          '<img class="sp-visual-prompt__image" src="' + esc(p.imageUrl) + '" alt="' + esc(p.imageAlt || '') + '">' +
        '</div>';
      }
      if (p.contextQuestion) {
        html += '<p class="sp-visual-prompt__question">' + esc(p.contextQuestion) + '</p>';
      }
      html += '</div>';
    }
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
    var highlightedText = p.highlightedText || '';
    var markedSentence = renderErrorMarkedSentence(sentence, highlightedText);
    var gapField = buildErrorCorrectionGapField(highlightedText);
    var gapLine = renderErrorCorrectionGapLine(sentence, highlightedText, gapField);
    return '<div class="sp-screen sp-screen--error sp-screen--error-inline" data-format="error_correction">' +
      '<div class="sp-prompt-row sp-prompt-row--error">' +
      '<p class="sp-prompt-sentence sp-prompt-sentence--error-original sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + markedSentence + '</p>' +
      '<p class="sp-prompt-sentence sp-prompt-sentence--inline-gap sp-prompt-sentence--error-gap">' + gapLine + '</p>' +
      '</div>' +
    '</div>';
  }

  function renderVerbBankTwoStep(screen) {
    var p = screen.payload || {};
    var step = p.step || 'choose_verb';
    var isTypeForm = step === 'type_form';
    var screenCls = 'sp-screen sp-screen--verb-bank' + (isTypeForm ? ' sp-screen--gap' : '');
    var html = '<div class="' + screenCls + '" data-format="verb_bank_two_step" data-step="' + step + '">';
    html += '<div class="sp-prompt-row' + (isTypeForm ? ' sp-prompt-row--gap' : '') + '">';
    if (isTypeForm) {
      var verbRef = p.selectedVerb || p.baseVerb || '';
      var gapCount = countGaps(p.sentence);
      var multiCls = gapCount > 1 ? ' sp-prompt-sentence--multi-gap' : '';
      html += '<p class="sp-prompt-sentence sp-prompt-sentence--inline-gap' + multiCls + ' sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + renderInlineGapSentence(p.sentence, verbRef) + '</p>';
    } else {
      html += '<p class="sp-prompt-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + bold((p.sentence || '').replace(GAP_RE, '<span class="sp-inline-gap"></span>')) + '</p>';
    }
    html += '</div>';

    if (step === 'choose_verb') {
      html += '<p class="sp-step-label">Step 1: Choose the base verb</p>';
      html += '<div class="sp-verb-bank" id="sp-verb-bank">';
      var bank = p.remainingVerbs || p.wordBank || [];
      bank.forEach(function(v) {
        if (p.usedVerbs && p.usedVerbs.indexOf(v) !== -1) return;
        html += '<button type="button" class="sp-verb-chip" data-verb="' + esc(v) + '">' + esc(v) + '</button>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeHuntText(str) {
    return String(str || '').trim().replace(/\s+/g, ' ');
  }

  function rangesOverlap(a, b) {
    return a.start < b.end && b.start < a.end;
  }

  function findAllErrorPositions(passage, wrong) {
    var positions = [];
    var phrase = normalizeHuntText(wrong);
    if (!phrase) return positions;
    var isSingleWord = !/\s/.test(phrase);
    if (isSingleWord) {
      var re = new RegExp('\\b' + escapeRegExp(phrase) + '\\b', 'gi');
      var match;
      while ((match = re.exec(passage)) !== null) {
        positions.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
      }
    } else {
      var phraseRe = new RegExp(escapeRegExp(phrase).replace(/\s+/g, '\\s+'), 'gi');
      var phraseMatch;
      while ((phraseMatch = phraseRe.exec(passage)) !== null) {
        positions.push({
          start: phraseMatch.index,
          end: phraseMatch.index + phraseMatch[0].length,
          text: phraseMatch[0]
        });
      }
    }
    return positions;
  }

  function findHuntMarkers(passage, items) {
    var markers = [];
    var used = [];
    (items || []).forEach(function(it, idx) {
      var wrong = typeof it === 'string' ? it : (it.wrong || it.targetPhrase || '');
      var positions = findAllErrorPositions(passage, wrong);
      for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];
        var overlaps = used.some(function(u) { return rangesOverlap(u, pos); });
        if (!overlaps) {
          markers.push({ idx: idx, start: pos.start, end: pos.end, wrong: pos.text, item: it });
          used.push(pos);
          break;
        }
      }
    });
    markers.sort(function(a, b) { return a.start - b.start; });
    return markers;
  }

  function buildMarkedPassageHtml(passage, markers) {
    var html = '';
    var cursor = 0;
    (markers || []).forEach(function(m) {
      html += esc(passage.slice(cursor, m.start));
      html += '<mark class="sp-hunt-mark" data-item-idx="' + m.idx + '" role="button" tabindex="0">' +
        esc(passage.slice(m.start, m.end)) + '</mark>';
      cursor = m.end;
    });
    html += esc(passage.slice(cursor));
    return html;
  }

  function getPassageSelection(passageEl) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var range = sel.getRangeAt(0);
    if (!passageEl.contains(range.commonAncestorContainer)) return null;
    var text = sel.toString();
    if (!text || !normalizeHuntText(text)) return null;
    return { text: text };
  }

  function matchSelectionToItem(text, items, alreadySelected) {
    var normalized = normalizeHuntText(text);
    if (!normalized) return -1;
    var matchIdx = -1;
    (items || []).forEach(function(it, idx) {
      if (alreadySelected[idx]) return;
      var wrong = normalizeHuntText(it.wrong || it.targetPhrase || '');
      if (wrong && normalized.toLowerCase() === wrong.toLowerCase()) {
        matchIdx = idx;
      }
    });
    return matchIdx;
  }

  function tokenizePassageWords(passage) {
    var tokens = [];
    var parts = String(passage || '').split(/(\s+)/);
    var pos = 0;
    var wordIdx = 0;
    parts.forEach(function(part) {
      if (!part) return;
      var isSpace = /^\s+$/.test(part);
      tokens.push({
        text: part,
        start: pos,
        end: pos + part.length,
        isSpace: isSpace,
        wordIdx: isSpace ? -1 : wordIdx++
      });
      pos += part.length;
    });
    return tokens;
  }

  function getSelectionTextFromIndices(passage, tokens, wordIndices) {
    if (!wordIndices || !wordIndices.length) return '';
    var sorted = wordIndices.slice().sort(function(a, b) { return a - b; });
    var first = null;
    var last = null;
    (tokens || []).forEach(function(t) {
      if (t.isSpace) return;
      if (t.wordIdx === sorted[0]) first = t;
      if (t.wordIdx === sorted[sorted.length - 1]) last = t;
    });
    if (!first || !last) return '';
    return passage.slice(first.start, last.end);
  }

  function getItemCorrection(item) {
    if (!item) return '';
    if (item.answer) return item.answer;
    if (item.acceptedAnswers && item.acceptedAnswers.length) return item.acceptedAnswers[0];
    return '';
  }

  function getCounterHuntItemRange(passage, item) {
    var wrong = item.wrong || item.targetPhrase || '';
    var positions = findAllErrorPositions(passage, wrong);
    return positions.length ? positions[0] : null;
  }

  function buildCounterHuntPassageHtml(passage, items, state) {
    var fixed = (state && state.fixed) || {};
    var revealIdx = state && state.revealIdx;
    var pending = (state && state.pendingWordIndices) || [];
    var tokens = tokenizePassageWords(passage);
    var overlays = [];

    (items || []).forEach(function(it, idx) {
      var range = getCounterHuntItemRange(passage, it);
      if (!range) return;
      if (fixed[idx]) {
        overlays.push({
          start: range.start,
          end: range.end,
          type: 'fixed',
          html: '<span class="sp-hunt-corrected">' + esc(fixed[idx].correction) + '</span>'
        });
      } else if (revealIdx === idx) {
        overlays.push({
          start: range.start,
          end: range.end,
          type: 'reveal',
          html: '<span class="sp-hunt-reveal">' +
            '<s class="sp-hunt-reveal-wrong">' + esc(it.wrong || it.targetPhrase || '') + '</s> ' +
            '<span class="sp-hunt-reveal-correct">' + esc(getItemCorrection(it)) + '</span></span>'
        });
      }
    });

    overlays.sort(function(a, b) { return a.start - b.start; });

    var html = '';
    var cursor = 0;
    overlays.forEach(function(overlay) {
      html += renderCounterHuntTokenRange(tokens, cursor, overlay.start, pending);
      html += overlay.html;
      cursor = overlay.end;
    });
    html += renderCounterHuntTokenRange(tokens, cursor, passage.length, pending);
    return html;
  }

  function renderCounterHuntTokenRange(tokens, start, end, pending) {
    var html = '';
    (tokens || []).forEach(function(t) {
      if (t.end <= start || t.start >= end) return;
      if (t.isSpace) {
        html += esc(t.text);
        return;
      }
      var isPending = pending.indexOf(t.wordIdx) !== -1;
      var cls = 'sp-hunt-word' + (isPending ? ' sp-hunt-word--selected' : '');
      html += '<button type="button" class="' + cls + '" data-word-idx="' + t.wordIdx + '">' +
        esc(t.text) + '</button>';
    });
    return html;
  }

  function renderClickableWords(text) {
    if (!text) return '';
    var html = '';
    var parts = text.split(/(\s+)/);
    parts.forEach(function(part) {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        html += esc(part);
      } else {
        html += '<button type="button" class="sp-hunt-word" data-is-error="0">' + esc(part) + '</button>';
      }
    });
    return html;
  }

  function buildHuntPassageHtml(passage, items) {
    var markers = findHuntMarkers(passage, items);
    var html = '';
    var cursor = 0;
    markers.forEach(function(m) {
      html += renderClickableWords(passage.slice(cursor, m.start));
      html += '<button type="button" class="sp-hunt-phrase" data-hunt-idx="' + m.idx + '" ' +
        'data-wrong="' + esc(m.wrong) + '" data-is-error="1">' + esc(m.wrong) + '</button>';
      cursor = m.end;
    });
    html += renderClickableWords(passage.slice(cursor));
    return html;
  }

  function renderHuntSelectedPanel() {
    return '<div class="sp-hunt-selected-panel" id="sp-hunt-selected-panel">' +
      '<p class="sp-hunt-selected-label">Selected errors:</p>' +
      '<ol class="sp-hunt-selected-list sp-hunt-selected-list--grid" id="sp-hunt-selected-list"></ol>' +
    '</div>';
  }

  function renderHuntSelectedPanelSlots(target) {
    return '<div class="sp-hunt-selected-panel" id="sp-hunt-selected-panel">' +
      '<p class="sp-hunt-selected-label">Selected errors:</p>' +
      '<ol class="sp-hunt-selected-list sp-hunt-selected-list--grid" id="sp-hunt-selected-list"></ol></div>';
  }

  function renderPassageHunt(screen) {
    var p = screen.payload || {};
    var targetWrong = p.wrong || '';
    var passageText = p.passage || '';
    var passageHtml = buildHuntPassageHtml(passageText, [{ wrong: targetWrong }]);

    return '<div class="sp-screen sp-screen--hunt" data-format="passage_error_hunt_single">' +
      '<div class="sp-passage-card" id="sp-passage-text">' + passageHtml + '</div>' +
      renderHuntSelectedPanel() +
      '<div class="sp-hunt-correction" id="sp-hunt-correction" hidden></div>' +
    '</div>';
  }

  function renderPassageHuntCounter(screen) {
    var p = screen.payload || {};
    var items = p.items || [];
    var target = (p.counter && p.counter.target) || p.errorCount || items.length;
    var passage = p.passage || '';
    var passageHtml = buildCounterHuntPassageHtml(passage, items, {
      fixed: {},
      revealIdx: null,
      pendingWordIndices: []
    });

    return '<div class="sp-screen sp-screen--hunt sp-screen--hunt-counter" data-format="passage_error_hunt_counter">' +
      '<div class="sp-hunt-counter"><span id="sp-hunt-found">0</span>/' + target + ' errors found</div>' +
      '<div class="sp-passage-card" id="sp-passage-text">' + passageHtml + '</div>' +
      renderHuntSelectedPanelSlots(target) +
    '</div>';
  }

  function renderStativeSorting(screen) {
    var p = screen.payload || {};
    var groups = p.groups || [];
    var verbs = p.verbs || [];
    var alreadyCorrect = screen._stativeCorrect || [];
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
    if (alreadyCorrect.length) {
      verbs = verbs.filter(function(v) {
        return alreadyCorrect.indexOf(v.verb) === -1;
      });
    }

    var html = '<div class="sp-screen sp-screen--sort" data-format="stative_sorting">';
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
    html += '<div class="sp-prompt-row">';
    html += '<p class="sp-meaning-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + bold(p.sentence || '') + '</p>';
    html += '</div>';
    html += '<div class="sp-option-grid">';
    (p.options || []).forEach(function(opt, i) {
      html += renderOptionBtn(opt, i);
    });
    html += '</div></div>';
    return html;
  }

  // ─── Bind interactions ───────────────────────────────────────────────

  function bindScreen(root, screen, onChange) {
    if (!root || !screen) return;
    onChange = onChange || function() {};

    var format = screen.formatType;

    if (format === 'two_option_choice') {
      var payload = screen.payload || {};
      bindSentenceSpeak(root, function() {
        return buildGapSentence(payload.sentenceBefore, getSelectedChoiceText(root), payload.sentenceAfter);
      });
      root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (root.classList.contains('sp-screen--locked')) return;
          root.querySelectorAll('.sp-option-btn').forEach(function(b) { b.classList.remove('sp-option-btn--selected'); });
          btn.classList.add('sp-option-btn--selected');
          var optText = btn.getAttribute('data-value') || '';
          var slot = root.querySelector('#sp-choice-slot');
          if (slot) slot.textContent = optText;
          onChange();
          if (!optText) return;
          speakText(optText);
        });
      });
    }

    if (format === 'meaning_contrast') {
      var meaningPayload = screen.payload || {};
      bindSentenceSpeak(root, function() {
        return String(meaningPayload.sentence || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
      });
      root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (root.classList.contains('sp-screen--locked')) return;
          root.querySelectorAll('.sp-option-btn').forEach(function(b) { b.classList.remove('sp-option-btn--selected'); });
          btn.classList.add('sp-option-btn--selected');
          onChange();
          var optText = btn.getAttribute('data-value') || '';
          if (optText) speakText(optText);
        });
      });
    }

    if (format === 'verb_bank_two_step') {
      var verbPayload = screen.payload || {};
      var verbStep = verbPayload.step || 'choose_verb';
      bindSentenceSpeak(root, function() {
        var p = screen.payload || {};
        if (verbStep === 'type_form') {
          var values = getGapInputValues(root);
          if (values.some(function(v) { return !!v; })) {
            return fillGapsInSentence(p.sentence, values);
          }
        }
        return String(p.sentence || '').replace(GAP_RE, ' ').replace(/\s+/g, ' ').trim();
      });
      root.querySelectorAll('.sp-verb-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          if (root.classList.contains('sp-screen--locked')) return;
          root.querySelectorAll('.sp-verb-chip').forEach(function(c) { c.classList.remove('sp-verb-chip--selected'); });
          chip.classList.add('sp-verb-chip--selected');
          onChange();
        });
      });
      if (verbStep === 'type_form') {
        bindGapInputs(root, onChange);
      }
    }

    if (format === 'word_order_tiles') {
      bindWordOrderTiles(root, onChange);
    }

    if (format === 'passage_error_hunt_single') {
      bindPassageHunt(root, screen, onChange);
    }

    if (format === 'passage_error_hunt_counter') {
      bindPassageHuntCounter(root, screen, onChange);
    }

    if (format === 'stative_sorting') {
      bindStativeSorting(root, onChange);
    }

    if (format === 'error_correction') {
      var errPayload = screen.payload || {};
      bindSentenceSpeak(root, function() {
        var parts = splitSentenceAtHighlight(errPayload.sentence, errPayload.highlightedText);
        var errInput = root.querySelector('#sp-error-input');
        var userAnswer = errInput ? errInput.value.trim() : '';
        if (userAnswer) {
          return buildGapSentence(parts.before, userAnswer, parts.after);
        }
        return String(errPayload.sentence || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
      });
      var errInput = root.querySelector('#sp-error-input');
      if (errInput) {
        errInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !root.classList.contains('sp-screen--locked')) {
            e.preventDefault();
            var actionBtn = document.getElementById('sp-action-btn');
            if (actionBtn && !actionBtn.disabled) actionBtn.click();
          }
        });
        setTimeout(function() { errInput.focus(); }, 0);
      }
    }

    if (format === 'full_sentence_write') {
      bindSentenceSpeak(root, function() {
        return String((screen.payload && screen.payload.displayPrompt) || '').trim();
      });
    }

    if (format === 'free_text_gap_fill' || format === 'conjugation_gap_fill' || format === 'preselected_verb_gap_fill') {
      bindSentenceSpeak(root, function() {
        var p = screen.payload || {};
        var values = getGapInputValues(root);
        if (values.some(function(v) { return !!v; })) {
          return fillGapsInSentence(p.sentence, values);
        }
        return String(p.completedSentence || '').replace(/\s+/g, ' ').trim();
      });
    }

    root.querySelectorAll('input, textarea').forEach(function(el) {
      el.addEventListener('input', onChange);
    });

    if (format === 'free_text_gap_fill' || format === 'conjugation_gap_fill' || format === 'preselected_verb_gap_fill') {
      bindGapInputs(root, onChange);
    }
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

  function bindHuntWrongWordTaps(root) {
    root.querySelectorAll('.sp-hunt-word').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        btn.classList.add('sp-hunt-word--wrong');
        setTimeout(function() { btn.classList.remove('sp-hunt-word--wrong'); }, 450);
        root.dispatchEvent(new CustomEvent('sp-hunt-wrong-tap', { bubbles: true }));
      });
    });
  }

  function bindPassageHunt(root, screen, onChange) {
    var p = screen.payload || {};
    var targetWrong = p.wrong || '';
    var selectedList = root.querySelector('#sp-hunt-selected-list');
    var correctionEl = root.querySelector('#sp-hunt-correction');
    root._huntSelectedWrong = null;

    function renderSelectedList() {
      if (!selectedList) return;
      if (!root._huntSelectedWrong) {
        selectedList.innerHTML = '';
        return;
      }
      selectedList.innerHTML = '<li class="sp-hunt-selected-item">' + esc(root._huntSelectedWrong) + '</li>';
    }

    function showCorrection(wrong) {
      if (!correctionEl) return;
      correctionEl.hidden = false;
      correctionEl.innerHTML =
        '<p class="sp-hunt-fix-label">Fix: <em>' + esc(wrong) + '</em></p>' +
        '<input type="text" class="sp-text-input" id="sp-hunt-fix-input" placeholder="Type the correction" autocomplete="off">';
      root._huntTappedWrong = wrong;
      root._huntTappedCorrect = wrong === targetWrong;
      var fixInput = correctionEl.querySelector('#sp-hunt-fix-input');
      if (fixInput) {
        fixInput.addEventListener('input', onChange);
        setTimeout(function() { fixInput.focus(); }, 0);
      }
    }

    root.querySelectorAll('.sp-hunt-phrase[data-is-error="1"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var wrong = btn.getAttribute('data-wrong');
        if (root._huntSelectedWrong === wrong) {
          root._huntSelectedWrong = null;
          btn.classList.remove('sp-hunt-phrase--selected');
          correctionEl.hidden = true;
          correctionEl.innerHTML = '';
          root._huntTappedWrong = null;
          root._huntTappedCorrect = false;
        } else if (wrong !== targetWrong) {
          btn.classList.add('sp-hunt-word--wrong');
          setTimeout(function() { btn.classList.remove('sp-hunt-word--wrong'); }, 450);
          root.dispatchEvent(new CustomEvent('sp-hunt-wrong-tap', { bubbles: true }));
          return;
        } else {
          root.querySelectorAll('.sp-hunt-phrase--selected').forEach(function(b) {
            b.classList.remove('sp-hunt-phrase--selected');
          });
          root._huntSelectedWrong = wrong;
          btn.classList.add('sp-hunt-phrase--selected');
          showCorrection(wrong);
        }
        renderSelectedList();
        onChange();
      });
    });

    bindHuntWrongWordTaps(root);
    renderSelectedList();
  }

  function bindPassageHuntCounter(root, screen, onChange) {
    var p = screen.payload || {};
    var items = p.items || [];
    var passage = p.passage || '';
    var target = (p.counter && p.counter.target) || p.errorCount || items.length;
    var counterEl = root.querySelector('#sp-hunt-found');
    var passageEl = root.querySelector('#sp-passage-text');
    var selectedList = root.querySelector('#sp-hunt-selected-list');
    var tokens = tokenizePassageWords(passage);
    var fixed = {};
    var foundEntries = [];
    var pendingWordIndices = [];

    root._huntFixed = fixed;
    root._huntFoundEntries = foundEntries;
    root._huntPendingIndices = pendingWordIndices;
    root._huntRevealIdx = null;
    root._huntPhase = 'select';
    root._huntTokens = tokens;

    function fixedCount() {
      return Object.keys(fixed).length;
    }

    function getPendingText() {
      return getSelectionTextFromIndices(passage, tokens, pendingWordIndices);
    }

    function renderPassage() {
      if (!passageEl) return;
      passageEl.innerHTML = buildCounterHuntPassageHtml(passage, items, {
        fixed: fixed,
        revealIdx: root._huntRevealIdx,
        pendingWordIndices: pendingWordIndices
      });
      bindWordClicks();
    }

    function slotDisplayText(entry) {
      if (fixed[entry.itemIdx] && fixed[entry.itemIdx].correction) {
        return fixed[entry.itemIdx].correction;
      }
      if (root._huntRevealIdx === entry.itemIdx) {
        var revealItem = items[entry.itemIdx];
        if (revealItem) return getItemCorrection(revealItem);
      }
      return entry.text;
    }

    function renderSlots() {
      if (!selectedList) return;
      var html = '';
      foundEntries.forEach(function(entry, i) {
        html += '<li class="sp-hunt-selected-slot sp-hunt-selected-slot--correct">' +
          '<span class="sp-hunt-selected-num">' + (i + 1) + '.</span> ' +
          '<span class="sp-hunt-selected-text">' + esc(slotDisplayText(entry)) + '</span></li>';
      });
      if (fixedCount() < target && root._huntPhase !== 'reveal') {
        var slotNum = fixedCount() + 1;
        var pendingText = getPendingText();
        var slotCls = 'sp-hunt-selected-slot';
        if (!pendingText) slotCls += ' sp-hunt-selected-slot--empty';
        else slotCls += ' sp-hunt-selected-slot--pending';
        html += '<li class="' + slotCls + '">' +
          '<span class="sp-hunt-selected-num">' + slotNum + '.</span> ' +
          '<span class="sp-hunt-selected-text' + (!pendingText ? ' sp-hunt-selected-placeholder' : '') + '">' +
          esc(pendingText || '—') + '</span></li>';
      }
      selectedList.innerHTML = html;
    }

    function updateCounter() {
      if (counterEl) counterEl.textContent = String(fixedCount());
    }

    function refresh() {
      renderPassage();
      renderSlots();
      updateCounter();
      onChange();
    }

    function clearPending() {
      pendingWordIndices = [];
      root._huntPendingIndices = pendingWordIndices;
    }

    function handleWordClick(wordIdx) {
      if (root._huntPhase !== 'select' || root.classList.contains('sp-screen--locked')) return;

      var pos = pendingWordIndices.indexOf(wordIdx);
      if (pos !== -1) {
        pendingWordIndices = pendingWordIndices.slice(0, pos);
      } else if (!pendingWordIndices.length) {
        pendingWordIndices = [wordIdx];
      } else {
        var min = pendingWordIndices[0];
        var max = pendingWordIndices[pendingWordIndices.length - 1];
        if (wordIdx === max + 1) {
          pendingWordIndices = pendingWordIndices.concat([wordIdx]);
        } else if (wordIdx === min - 1) {
          pendingWordIndices = [wordIdx].concat(pendingWordIndices);
        } else {
          pendingWordIndices = [wordIdx];
        }
      }
      root._huntPendingIndices = pendingWordIndices;
      renderSlots();
      renderPassage();
      onChange();
    }

    function bindWordClicks() {
      if (!passageEl) return;
      passageEl.querySelectorAll('.sp-hunt-word').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-word-idx'), 10);
          if (!isNaN(idx)) handleWordClick(idx);
        });
      });
    }

    function shakePendingSelection() {
      if (!passageEl) return;
      passageEl.querySelectorAll('.sp-hunt-word--selected').forEach(function(btn) {
        btn.classList.add('sp-hunt-word--wrong');
        setTimeout(function() { btn.classList.remove('sp-hunt-word--wrong'); }, 450);
      });
    }

    root._huntValidateSelection = function() {
      if (root._huntPhase !== 'select') return { handled: false };
      var selectionText = getPendingText();
      if (!selectionText) return { handled: true, noop: true };

      var matchedIdx = matchSelectionToItem(selectionText, items, fixed);
      if (matchedIdx === -1) {
        shakePendingSelection();
        clearPending();
        refresh();
        return {
          handled: true,
          correct: false,
          lifeLoss: 1,
          explanation: 'That phrase is not one of the errors. Keep looking.'
        };
      }

      var item = items[matchedIdx];
      var wrong = item.wrong || item.targetPhrase || '';
      foundEntries.push({ itemIdx: matchedIdx, text: selectionText });
      root._huntRevealIdx = matchedIdx;
      root._huntPhase = 'reveal';
      clearPending();
      refresh();

      return {
        handled: true,
        correct: true,
        partial: true,
        reveal: true,
        itemIdx: matchedIdx,
        userAnswer: selectionText,
        correctAnswer: wrong,
        explanation: item.explanation || ''
      };
    };

    root._huntCommitReveal = function() {
      if (root._huntPhase !== 'reveal' || root._huntRevealIdx == null) {
        return { handled: false };
      }

      var idx = root._huntRevealIdx;
      var item = items[idx];
      fixed[idx] = {
        correction: getItemCorrection(item),
        wrong: item.wrong || item.targetPhrase || ''
      };
      root._huntRevealIdx = null;
      root._huntPhase = 'select';

      var allDone = fixedCount() >= target;
      if (allDone) root._huntPhase = 'done';

      refresh();

      return {
        handled: true,
        allDone: allDone,
        correct: allDone,
        explanation: allDone
          ? (p.explanation || 'You found and corrected all the tense mistakes in the passage.')
          : '',
        userAnswer: String(fixedCount()) + '/' + target + ' errors found'
      };
    };

    refresh();
  }

  function processPassageHuntCounterCheck(root, screen, callback) {
    callback = callback || function() {};
    if (!root || root._huntPhase === 'reveal') {
      callback({ handled: false });
      return;
    }
    if (typeof root._huntValidateSelection !== 'function') {
      callback({ handled: false });
      return;
    }
    var result = root._huntValidateSelection();
    callback(result);
  }

  function commitHuntCounterReveal(root, screen, callback) {
    callback = callback || function() {};
    if (!root || typeof root._huntCommitReveal !== 'function') {
      callback({ handled: false });
      return;
    }
    var result = root._huntCommitReveal();
    callback(result);
  }

  function lockSortPoolHeight(pool) {
    if (!pool) return;
    pool.style.minHeight = '';
    var naturalHeight = pool.scrollHeight;
    pool.style.minHeight = Math.max(56, naturalHeight) + 'px';
  }

  function lockSortContainerSizes(root, screen) {
    var pool = root.querySelector('#sp-sort-pool');
    if (pool && !pool.dataset.sizeLocked) {
      lockSortPoolHeight(pool);
      pool.dataset.sizeLocked = '1';
    }

    var groups = (screen.payload && screen.payload.groups) || [];
    var maxPerGroup = 0;
    groups.forEach(function(g) {
      var count = (g.answers || []).length;
      if (count > maxPerGroup) maxPerGroup = count;
    });
    var dropzoneMinHeight = Math.max(120, Math.ceil(maxPerGroup / 2) * 48 + 20);
    root.querySelectorAll('.sp-sort-dropzone').forEach(function(zone) {
      if (zone.dataset.sizeLocked) return;
      zone.style.minHeight = dropzoneMinHeight + 'px';
      zone.dataset.sizeLocked = '1';
    });
  }

  function bindStativeSorting(root, onChange) {
    var pool = root.querySelector('#sp-sort-pool');
    var screen = root._spScreen;
    var draggedEl = null;

    if (screen) {
      requestAnimationFrame(function() {
        lockSortContainerSizes(root, screen);
      });
    }

    function isLocked() {
      return root.classList.contains('sp-screen--locked');
    }

    function clearDragOver() {
      root.querySelectorAll('.sp-sort-dropzone--over, .sp-sort-verb-pool--over').forEach(function(el) {
        el.classList.remove('sp-sort-dropzone--over', 'sp-sort-verb-pool--over');
      });
    }

    function clearSelection() {
      root.querySelectorAll('.sp-sort-verb--selected').forEach(function(btn) {
        btn.classList.remove('sp-sort-verb--selected');
      });
    }

    function moveVerb(btn, target) {
      if (!btn || !target || isLocked()) return;
      target.appendChild(btn);
      if (pool) lockSortPoolHeight(pool);
      onChange();
    }

    function bindDropTarget(el, overClass) {
      el.addEventListener('dragover', function(e) {
        if (isLocked()) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        clearDragOver();
        el.classList.add(overClass);
      });
      el.addEventListener('dragleave', function(e) {
        if (el.contains(e.relatedTarget)) return;
        el.classList.remove(overClass);
      });
      el.addEventListener('drop', function(e) {
        e.preventDefault();
        el.classList.remove(overClass);
        if (isLocked() || !draggedEl) return;
        moveVerb(draggedEl, el);
        clearSelection();
      });
    }

    root.querySelectorAll('.sp-sort-verb').forEach(function(btn) {
      btn.addEventListener('dragstart', function(e) {
        if (isLocked()) {
          e.preventDefault();
          return;
        }
        draggedEl = btn;
        e.dataTransfer.setData('text/plain', btn.getAttribute('data-verb') || '');
        e.dataTransfer.effectAllowed = 'move';
        btn.classList.add('sp-sort-verb--dragging');
      });

      btn.addEventListener('dragend', function() {
        btn.classList.remove('sp-sort-verb--dragging');
        clearDragOver();
        draggedEl = null;
      });

      btn.addEventListener('click', function() {
        if (isLocked()) return;
        if (btn.parentElement !== pool) {
          moveVerb(btn, pool);
          clearSelection();
          return;
        }
        var wasSelected = btn.classList.contains('sp-sort-verb--selected');
        clearSelection();
        if (!wasSelected) btn.classList.add('sp-sort-verb--selected');
      });
    });

    if (pool) bindDropTarget(pool, 'sp-sort-verb-pool--over');

    root.querySelectorAll('.sp-sort-dropzone').forEach(function(zone) {
      bindDropTarget(zone, 'sp-sort-dropzone--over');
      zone.addEventListener('click', function() {
        if (isLocked()) return;
        var selected = root.querySelector('.sp-sort-verb--selected');
        if (selected) {
          moveVerb(selected, zone);
          clearSelection();
        }
      });
    });
  }

  function processStativeSortingCheck(root, screen, done) {
    var p = screen.payload || {};
    var groups = p.groups || [];
    var pool = root.querySelector('#sp-sort-pool');
    var totalExpected = 0;
    var alreadyCorrect = (screen._stativeCorrect || []).slice();
    var wrongCount = 0;
    var roundCorrect = 0;
    var toProcess = [];

    groups.forEach(function(g) {
      totalExpected += (g.answers || []).length;
      var zone = root.querySelector('.sp-sort-dropzone[data-group="' + g.groupId + '"]');
      if (!zone) return;
      var expected = g.answers || [];
      zone.querySelectorAll('.sp-sort-verb').forEach(function(btn) {
        var verb = btn.getAttribute('data-verb');
        var isCorrect = expected.indexOf(verb) !== -1;
        toProcess.push({ btn: btn, verb: verb, isCorrect: isCorrect });
        btn.classList.remove('sp-sort-verb--correct', 'sp-sort-verb--incorrect');
        btn.classList.add(isCorrect ? 'sp-sort-verb--correct' : 'sp-sort-verb--incorrect');
        btn.setAttribute('draggable', 'false');
        if (isCorrect) roundCorrect++;
        else wrongCount++;
      });
    });

    root.classList.add('sp-screen--locked');

    setTimeout(function() {
      toProcess.forEach(function(item) {
        item.btn.classList.remove('sp-sort-verb--correct', 'sp-sort-verb--incorrect');
        item.btn.setAttribute('draggable', 'true');
        if (item.isCorrect) {
          item.btn.remove();
          if (alreadyCorrect.indexOf(item.verb) === -1) alreadyCorrect.push(item.verb);
        } else if (pool) {
          pool.appendChild(item.btn);
        }
      });

      screen._stativeCorrect = alreadyCorrect;
      root.classList.remove('sp-screen--locked');

      var allDone = alreadyCorrect.length >= totalExpected;
      done({
        correct: allDone,
        explanation: p.explanation || '',
        correctAnswer: '',
        userAnswer: 'sorted',
        lifeLoss: allDone ? 0 : Math.min(wrongCount, 2),
        wrongCount: wrongCount,
        roundCorrect: roundCorrect,
        shouldRequeue: false,
        partial: !allDone
      });
    }, 700);
  }

  // ─── Check answers ───────────────────────────────────────────────────

  function isScreenReady(root, screen) {
    if (!root || !screen) return false;
    var f = screen.formatType;
    if (f === 'two_option_choice' || f === 'meaning_contrast') {
      return !!root.querySelector('.sp-option-btn--selected');
    }
    if (f === 'free_text_gap_fill' || f === 'conjugation_gap_fill' || f === 'preselected_verb_gap_fill') {
      return allGapInputsFilled(root);
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
      return allGapInputsFilled(root);
    }
    if (f === 'passage_error_hunt_single') {
      if (!root._huntSelectedWrong || root._huntSelectedWrong !== (screen.payload && screen.payload.wrong)) return false;
      var fix = root.querySelector('#sp-hunt-fix-input');
      return fix && !!fix.value.trim();
    }
    if (f === 'passage_error_hunt_counter') {
      if (root._huntPhase === 'done') return false;
      if (root._huntPhase === 'reveal') return true;
      return root._huntPendingIndices && root._huntPendingIndices.length > 0;
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
      case 'conjugation_gap_fill':
      case 'preselected_verb_gap_fill': {
        var gapValues = getGapInputValues(root);
        if (gapValues.length > 1) {
          result.userAnswer = gapValues.join(' / ');
          result.correctAnswer = Array.isArray(p.answer) ? p.answer.join(' / ') : p.answer;
          result.correct = norm.matchesBlanks(gapValues, p);
        } else {
          var given = gapValues[0] || '';
          result.userAnswer = given;
          result.correctAnswer = p.answer;
          result.correct = norm.matchesAnyAccepted(given, p);
        }
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
        if (p.answerTiles && p.answerTiles.length) {
          var expected = p.answerTiles.join(' ');
          var ignoreCase = p.tileValidation && p.tileValidation.ignoreCapitalization;
          var ignorePeriod = p.tileValidation && p.tileValidation.ignoreMissingFinalPeriod;
          var normBuilt = built;
          var normExpected = expected;
          if (ignoreCase) {
            normBuilt = normBuilt.toLowerCase();
            normExpected = normExpected.toLowerCase();
          }
          if (ignorePeriod) {
            normBuilt = normBuilt.replace(/\.\s*$/, '');
            normExpected = normExpected.replace(/\.\s*$/, '');
          }
          result.correct = normBuilt === normExpected;
          if (!result.correct && p.acceptedAnswers && p.acceptedAnswers.length) {
            result.correct = norm.matchesAnyAccepted(built, p);
          }
        } else {
          result.correct = norm.matchesAnyAccepted(built, p);
        }
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
          var formValues = getGapInputValues(root);
          if (formValues.length > 1) {
            result.userAnswer = formValues.join(' / ');
            var expectedParts = Array.isArray(p.answer) ? p.answer : [p.answer];
            result.correctAnswer = expectedParts.join(' / ');
            result.correct = norm.matchesBlanks(formValues, p);
          } else {
            var form = formValues[0] || '';
            result.userAnswer = form;
            var expected = Array.isArray(p.answer) ? p.answer : [p.answer];
            result.correctAnswer = expected.join(' / ');
            result.correct = norm.matchesAnyAccepted(form, { acceptedAnswers: expected, answer: expected[0] });
          }
          result.lifeLoss = result.correct ? 0 : 1;
          result.shouldRequeue = !result.correct;
        }
        break;
      }
      case 'passage_error_hunt_single': {
        var tappedSingle = root._huntSelectedWrong;
        var targetSingle = p.wrong;
        if (tappedSingle !== targetSingle) {
          result.correct = false;
          result.lifeLoss = 1;
          result.explanation = 'That phrase is not the error. Look for an unnatural verb form.';
          result.userAnswer = tappedSingle || '';
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
      case 'passage_error_hunt_counter': {
        var fixedCount = root._huntFixed ? Object.keys(root._huntFixed).length : 0;
        var huntTarget = (p.counter && p.counter.target) || p.errorCount || (p.items || []).length;
        result.correct = fixedCount >= huntTarget;
        result.userAnswer = fixedCount + '/' + huntTarget + ' errors found';
        result.correctAnswer = huntTarget + ' errors';
        result.lifeLoss = 0;
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

  function feedbackIconSvg(correct) {
    if (correct) {
      return '<svg class="sp-feedback-svg sp-feedback-svg--check" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="4 12 10 18 20 6"></polyline></svg>';
    }
    return '<svg class="sp-feedback-svg sp-feedback-svg--cross" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="6" y1="6" x2="18" y2="18"></line>' +
      '<line x1="18" y1="6" x2="6" y2="18"></line></svg>';
  }

  function FeedbackSheet(result, feedbackTone) {
    var cls = result.correct ? 'sp-feedback--correct' : 'sp-feedback--incorrect';
    var title = result.correct
      ? randomFeedback(feedbackTone, 'correct')
      : randomFeedback(feedbackTone, 'incorrect');
    var html = '<div class="sp-feedback-sheet ' + cls + '" data-component="FeedbackSheet">';
    html += '<div class="sp-feedback-icon" aria-hidden="true">' + feedbackIconSvg(result.correct) + '</div>';
    html += '<div class="sp-feedback-body">';
    html += '<p class="sp-feedback-title">' + esc(title) + '</p>';
    if (!result.correct && result.correctAnswer) {
      html += '<p class="sp-feedback-answer"><span>Correct:</span> ' + esc(result.correctAnswer) + '</p>';
    }
    html += '</div></div>';
    return html;
  }

  window.SunePlayScreenRenderer = {
    PracticeScreenRenderer: PracticeScreenRenderer,
    FeedbackSheet: FeedbackSheet,
    bindScreen: bindScreen,
    isScreenReady: isScreenReady,
    checkScreen: checkScreen,
    processStativeSortingCheck: processStativeSortingCheck,
    processPassageHuntCounterCheck: processPassageHuntCounterCheck,
    commitHuntCounterReveal: commitHuntCounterReveal
  };
})();
