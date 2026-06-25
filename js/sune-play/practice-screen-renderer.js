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

  function renderSentenceWithGap(sentence, gapHtml) {
    var parts = (sentence || '').split(GAP_RE);
    var gapCount = (sentence.match(GAP_RE) || []).length;
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      html += bold(parts[i]);
      if (i < gapCount) html += gapHtml;
    }
    return html;
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
      e.stopPropagation();
      play();
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        play();
      }
    });
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
    var gapField = buildInlineGapField(verbRef);
    var html = '<div class="sp-screen sp-screen--gap" data-format="free_text_gap_fill">';
    html += '<div class="sp-prompt-row">';
    html += '<p class="sp-prompt-sentence sp-prompt-sentence--inline-gap sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + renderSentenceWithGap(p.sentence, gapField) + '</p>';
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
    if (p.highlightedText) {
      sentence = sentence.replace(
        new RegExp(esc(p.highlightedText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        '<mark class="sp-error-mark">' + bold(p.highlightedText) + '</mark>'
      );
    }
    var placeholder = p.replacementOnly
      ? 'Type the corrected form'
      : 'Write the corrected sentence';
    return '<div class="sp-screen sp-screen--error" data-format="error_correction">' +
      '<div class="sp-prompt-row">' +
      '<p class="sp-prompt-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + sentence + '</p>' +
      '</div>' +
      '<input type="text" class="sp-text-input sp-text-input--large" id="sp-error-input" placeholder="' + esc(placeholder) + '" autocomplete="off">' +
    '</div>';
  }

  function renderVerbBankTwoStep(screen) {
    var p = screen.payload || {};
    var step = p.step || 'choose_verb';
    var html = '<div class="sp-screen sp-screen--verb-bank" data-format="verb_bank_two_step" data-step="' + step + '">';
    html += '<div class="sp-prompt-row">';
    html += '<p class="sp-prompt-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + bold((p.sentence || '').replace(GAP_RE, '<span class="sp-inline-gap"></span>')) + '</p>';
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
      '<div class="sp-passage-card" id="sp-passage-text">' + passageHtml + '</div>' +
      '<div class="sp-hunt-correction" id="sp-hunt-correction" hidden></div>' +
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
    html += '<p class="sp-meaning-question">' + esc(p.prompt || '') + '</p>';
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
      bindSentenceSpeak(root, function() {
        return String((screen.payload && screen.payload.sentence) || '').replace(GAP_RE, ' ').replace(/\s+/g, ' ').trim();
      });
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

    if (format === 'error_correction') {
      bindSentenceSpeak(root, function() {
        return String((screen.payload && screen.payload.sentence) || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
      });
    }

    if (format === 'full_sentence_write') {
      bindSentenceSpeak(root, function() {
        return String((screen.payload && screen.payload.displayPrompt) || '').trim();
      });
    }

    if (format === 'free_text_gap_fill' || format === 'preselected_verb_gap_fill') {
      bindSentenceSpeak(root, function() {
        var p = screen.payload || {};
        var gapInput = root.querySelector('#sp-gap-input');
        var userAnswer = gapInput ? gapInput.value.trim() : '';
        if (userAnswer) {
          return String(p.sentence || '').replace(GAP_RE, userAnswer).replace(/\s+/g, ' ').trim();
        }
        return String(p.completedSentence || '').replace(/\s+/g, ' ').trim();
      });
    }

    root.querySelectorAll('input, textarea').forEach(function(el) {
      el.addEventListener('input', onChange);
    });

    if (format === 'free_text_gap_fill' || format === 'preselected_verb_gap_fill') {
      var gapInput = root.querySelector('#sp-gap-input');
      if (gapInput) {
        gapInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !root.classList.contains('sp-screen--locked')) {
            e.preventDefault();
            var actionBtn = document.getElementById('sp-action-btn');
            if (actionBtn && !actionBtn.disabled) actionBtn.click();
          }
        });
        setTimeout(function() { gapInput.focus(); }, 0);
      }
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

  function lockSortContainerSizes(root, screen) {
    var pool = root.querySelector('#sp-sort-pool');
    if (pool && !pool.dataset.sizeLocked) {
      var groups = (screen.payload && screen.payload.groups) || [];
      var totalVerbs = groups.reduce(function(sum, g) {
        return sum + (g.answers || []).length;
      }, 0);
      var poolRows = Math.ceil(Math.max(totalVerbs, 1) / 4);
      pool.style.minHeight = Math.max(56, poolRows * 48 + 24) + 'px';
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
    processStativeSortingCheck: processStativeSortingCheck
  };
})();
