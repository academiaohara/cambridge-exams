// js/sune-play/practice-screen-renderer.js
// Renders and evaluates individual practice screen formats

(function() {
  'use strict';

  var norm = window.SunePlayNormalize;
  var gapWords = window.SunePlayCountGapWords;
  var GAP_RE = /(?:\.{3,}|…{2,}|_{3,})/g;
  var PASSAGE_GAP_MARK_RE = /\((\d+)\)\s*(?:\.{3,}|…{2,}|_{3,})/g;

  function esc(str) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._escapeHTML) return BentoGrid._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function bold(str) {
    return esc(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  /** Slash-separated hint segments (e.g. "not / watch", "up / off / out"). */
  function renderSlashHintMarkup(hint) {
    if (hint == null || hint === '') return '';
    var parts = String(hint).trim().split(/\s*\/\s*/).map(function(s) { return s.trim(); }).filter(Boolean);
    if (parts.length <= 1) {
      return '<span class="sp-hint-word">' + esc(parts[0] || hint) + '</span>';
    }
    return parts.map(function(part, i) {
      var bit = '<span class="sp-hint-word">' + esc(part) + '</span>';
      return i === 0 ? bit : '<span class="sp-hint-slash-sep">/</span>' + bit;
    }).join('');
  }

  /** Bold markers and parenthetical hints — including (word / word) slash hints. */
  function formatSentenceText(str) {
    var raw = String(str || '');
    var result = '';
    var tokenRe = /\*\*([^*]+)\*\*|\(([^)]+)\)/g;
    var lastIdx = 0;
    var m;
    while ((m = tokenRe.exec(raw)) !== null) {
      result += esc(raw.slice(lastIdx, m.index));
      if (m[1] !== undefined) {
        result += '<strong>' + esc(m[1]) + '</strong>';
      } else {
        var inner = m[2].trim();
        if (/^\d+$/.test(inner)) {
          result += esc(m[0]);
        } else if (inner.indexOf('/') !== -1) {
          result += renderSlashHintMarkup(inner);
        } else {
          result += '<span class="sp-hint-word">' + esc(inner) + '</span>';
        }
      }
      lastIdx = m.index + m[0].length;
    }
    result += esc(raw.slice(lastIdx));
    return result;
  }

  function renderVerbRef(verbRef) {
    if (!verbRef) return '';
    var trimmed = String(verbRef).trim();
    if (trimmed.indexOf('/') !== -1) {
      return '<span class="sp-gap-verb-ref">' + renderSlashHintMarkup(trimmed) + '</span>';
    }
    return '<span class="sp-gap-verb-ref"><span class="sp-hint-word">' + esc(trimmed) + '</span></span>';
  }

  function countGaps(sentence) {
    return (String(sentence || '').match(GAP_RE) || []).length;
  }

  function renderSentenceWithGap(sentence, gapHtml) {
    var parts = (sentence || '').split(GAP_RE);
    var gapCount = countGaps(sentence);
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      html += formatSentenceText(parts[i]);
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

  function extractBracketVerbs(sourceSentence) {
    var verbs = [];
    var re = /(?:\.{3,}|…{2,}|_{3,})\s*\(([^)]+)\)/g;
    var match;
    while ((match = re.exec(sourceSentence || '')) !== null) {
      verbs.push(match[1].trim());
    }
    return verbs;
  }

  function splitVerbPromptList(verbRef) {
    if (!verbRef) return [];
    return verbRef.split(',').map(function(part) { return part.trim(); }).filter(Boolean);
  }

  function resolvePerGapVerbPrompts(verbRef, gapCount, gaps, sourceSentence) {
    var prompts = new Array(gapCount);
    var i;

    if (gaps && gaps.length) {
      var hasAllGapPrompts = true;
      for (i = 0; i < gapCount; i++) {
        if (gaps[i] && gaps[i].verbPrompt) {
          prompts[i] = gaps[i].verbPrompt;
        } else {
          hasAllGapPrompts = false;
        }
      }
      if (hasAllGapPrompts) return prompts;
    }

    var bracketVerbs = extractBracketVerbs(sourceSentence);
    if (bracketVerbs.length === gapCount) return bracketVerbs;
    if (bracketVerbs.length === 1 && gapCount > 1) {
      prompts[gapCount - 1] = bracketVerbs[0];
      return prompts;
    }

    var parts = splitVerbPromptList(verbRef);
    if (parts.length === gapCount) return parts;

    if (verbRef && gapCount > 1) {
      prompts[gapCount - 1] = verbRef;
      return prompts;
    }

    if (gapCount === 1) return [verbRef || ''];
    return prompts;
  }

  function renderInlineGapSentence(sentence, verbRef, options) {
    options = options || {};
    var parts = (sentence || '').split(GAP_RE);
    var gapCount = countGaps(sentence);
    if (gapCount <= 1) {
      return renderSentenceWithGap(sentence, buildInlineGapField(verbRef, 0));
    }
    var perGapVerbs = resolvePerGapVerbPrompts(
      verbRef,
      gapCount,
      options.gaps,
      options.sourceSentence
    );
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      html += formatSentenceText(parts[i]);
      if (i < gapCount) html += buildInlineGapField(perGapVerbs[i] || '', i);
    }
    return html;
  }

  function getPassageGapInputValues(root) {
    var values = [];
    root.querySelectorAll('.sp-passage-gap-input').forEach(function(inp) {
      values.push(inp.value.trim());
    });
    return values;
  }

  function markPassageGapResults(root, gaps, givenValues) {
    root.querySelectorAll('.sp-passage-gap-wrap').forEach(function(wrap) {
      var num = parseInt(wrap.getAttribute('data-passage-gap'), 10);
      var idx = -1;
      for (var i = 0; i < gaps.length; i++) {
        if (gaps[i].gapNumber === num) {
          idx = i;
          break;
        }
      }
      if (idx === -1) return;
      var ok = norm.answersMatch(givenValues[idx] || '', gaps[idx].expectedAnswer);
      wrap.classList.toggle('sp-passage-gap--correct', ok);
      wrap.classList.toggle('sp-passage-gap--incorrect', !ok);
    });
  }

  function buildPassageGapField(gapNum, options) {
    options = options || {};
    var inputCls = 'sp-gap-inline-input sp-passage-gap-input';
    if (options.gapInputStyle === 'underline_expand') {
      inputCls += ' sp-gap-underline-input';
    }
    var verbHtml = options.showVerbSlot
      ? '<span class="sp-passage-gap-verb" data-passage-gap-verb="' + gapNum + '" hidden aria-hidden="true"></span>'
      : '';
    return '<span class="sp-passage-gap-wrap sp-inline-gap-group" data-passage-gap="' + gapNum + '">' +
      '<span class="sp-passage-gap-num">' + gapNum + '</span>' +
      '<input type="text" class="' + inputCls + '" data-passage-gap="' + gapNum + '" ' +
      'autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Gap ' + gapNum + '">' +
      verbHtml +
    '</span>';
  }

  function renderPassageGapHtml(passage, options) {
    options = options || {};
    var paragraphs = String(passage || '').split(/\n+/).filter(function(p) { return p.trim(); });
    return paragraphs.map(function(para) {
      var inner = formatSentenceText(para.trim())
        .replace(PASSAGE_GAP_MARK_RE, function(_, num) {
          return buildPassageGapField(num, options);
        });
      return '<p class="sp-passage-para">' + inner + '</p>';
    }).join('');
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

  function bindWordBankGapFill(root, onChange) {
    var chips = root.querySelectorAll('.sp-gap-wordbank-chip');
    if (!chips.length) return;

    function firstEmptyGapInput() {
      var inputs = root.querySelectorAll('.sp-gap-inline-input');
      for (var i = 0; i < inputs.length; i++) {
        if (!inputs[i].value.trim()) return inputs[i];
      }
      return inputs[0] || null;
    }

    chips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        if (chip.classList.contains('sp-gap-wordbank-chip--used')) return;
        var word = chip.getAttribute('data-word') || '';
        var input = firstEmptyGapInput();
        if (!input || !word) return;
        input.value = word;
        chip.classList.add('sp-gap-wordbank-chip--used');
        chip.setAttribute('aria-pressed', 'true');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        onChange();
        input.focus();
      });
    });
  }

  function bindGapInputs(root, onChange) {
    var inputs = root.querySelectorAll('.sp-gap-inline-input');
    inputs.forEach(function(inp) {
      resizeUnderlineGapInput(inp);
      inp.addEventListener('input', function() {
        resizeUnderlineGapInput(inp);
      });
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

  function resizeUnderlineGapInput(input) {
    if (!input) return;
    var minCh = 2;
    var val = input.value || '';
    var len = Math.max(minCh, val.length + 1);
    input.style.width = len + 'ch';
  }

  function buildPassageGapVerbCounts(gaps) {
    var counts = {};
    (gaps || []).forEach(function(gap) {
      var verb = gap.baseVerb;
      if (!verb) return;
      counts[verb] = (counts[verb] || 0) + 1;
    });
    return counts;
  }

  function syncPassageGapStateToScreen(screen, root) {
    if (!screen || !root || !root._passageGapState) return;
    screen._passageGapState = JSON.parse(JSON.stringify(root._passageGapState));
  }

  function getPassageGapWrap(root, gapNumber) {
    return root.querySelector('.sp-passage-gap-wrap[data-passage-gap="' + gapNumber + '"]');
  }

  function initPassageGapSequentialState(root, screen) {
    var p = screen.payload || {};
    var gaps = p.gaps || [];
    var saved = screen._passageGapState || {};
    var completed = saved.completed || {};
    var failed = saved.failed || {};
    var assignments = saved.assignments || {};
    var activeGap = saved.activeGap;
    var inRetryPhase = !!saved.inRetryPhase;

    if (activeGap == null) {
      if (inRetryPhase && saved.retryQueue && saved.retryQueue.length) {
        activeGap = saved.retryQueue[0];
      } else {
        for (var i = 0; i < gaps.length; i++) {
          var gNum = gaps[i].gapNumber;
          if (!completed[gNum]) {
            activeGap = gNum;
            break;
          }
        }
      }
      if (activeGap == null && gaps.length) activeGap = gaps[0].gapNumber;
    }

    root._passageGapState = {
      activeGap: activeGap,
      completed: completed,
      failed: failed,
      assignments: assignments,
      inRetryPhase: inRetryPhase,
      retryQueue: saved.retryQueue || [],
      verbCounts: buildPassageGapVerbCounts(gaps),
      confirmedVerbs: saved.confirmedVerbs || {}
    };
    gaps.forEach(function(gap) {
      var done = completed[gap.gapNumber];
      if (done && done.verb) {
        root._passageGapState.confirmedVerbs[done.verb] =
          (root._passageGapState.confirmedVerbs[done.verb] || 0) + 1;
      }
    });
    syncPassageGapStateToScreen(screen, root);
  }

  function updatePassageGapWordBank(root) {
    var state = root._passageGapState;
    if (!state) return;
    root.querySelectorAll('.sp-passage-wordbank [data-word]').forEach(function(chip) {
      var word = chip.getAttribute('data-word');
      var maxUses = state.verbCounts[word] || 0;
      var confirmed = state.confirmedVerbs[word] || 0;
      var depleted = maxUses > 0 && confirmed >= maxUses;
      chip.classList.toggle('sp-passage-wordbank-chip--used', depleted);
      if (chip.classList.contains('sp-passage-wordbank-chip--selectable')) {
        chip.disabled = depleted;
        chip.setAttribute('aria-disabled', depleted ? 'true' : 'false');
      }
    });
  }

  function setPassageGapVerbLabel(wrap, verb) {
    var label = wrap && wrap.querySelector('.sp-passage-gap-verb');
    if (!label) return;
    if (verb) {
      label.textContent = verb;
      label.hidden = false;
      label.removeAttribute('aria-hidden');
    } else {
      label.textContent = '';
      label.hidden = true;
      label.setAttribute('aria-hidden', 'true');
    }
  }

  function updatePassageGapUI(root, screen) {
    var p = screen.payload || {};
    var gaps = p.gaps || [];
    var state = root._passageGapState;
    if (!state) return;

    gaps.forEach(function(gap) {
      var wrap = getPassageGapWrap(root, gap.gapNumber);
      if (!wrap) return;
      var input = wrap.querySelector('.sp-passage-gap-input');
      var gapNum = gap.gapNumber;
      var isCompleted = !!state.completed[gapNum];
      var isFailed = !!state.failed[gapNum];
      var isActive = gapNum === state.activeGap && !isCompleted;

      wrap.classList.remove(
        'sp-passage-gap-wrap--active',
        'sp-passage-gap-wrap--future',
        'sp-passage-gap-wrap--done',
        'sp-passage-gap-wrap--failed',
        'sp-passage-gap--correct',
        'sp-passage-gap--incorrect'
      );

      if (isCompleted) {
        wrap.classList.add('sp-passage-gap-wrap--done', 'sp-passage-gap--correct');
        var done = state.completed[gapNum];
        if (input) {
          input.value = done.answer || '';
          input.disabled = true;
          input.readOnly = true;
          resizeUnderlineGapInput(input);
        }
        setPassageGapVerbLabel(wrap, done.verb || state.assignments[gapNum] || gap.baseVerb);
      } else if (isActive) {
        wrap.classList.add('sp-passage-gap-wrap--active');
        if (input) {
          input.disabled = false;
          input.readOnly = false;
          if (state.inRetryPhase && isFailed) {
            input.value = '';
          }
          if (state.assignments[gapNum]) {
            setPassageGapVerbLabel(wrap, state.assignments[gapNum]);
          } else {
            setPassageGapVerbLabel(wrap, '');
          }
          resizeUnderlineGapInput(input);
        }
      } else if (isFailed) {
        wrap.classList.add('sp-passage-gap-wrap--failed', 'sp-passage-gap--incorrect');
        var fail = state.failed[gapNum];
        if (input) {
          input.value = fail.answer || '';
          input.disabled = true;
          input.readOnly = true;
          resizeUnderlineGapInput(input);
        }
        setPassageGapVerbLabel(wrap, fail.verb || state.assignments[gapNum] || '');
      } else {
        wrap.classList.add('sp-passage-gap-wrap--future');
        if (input) {
          input.value = '';
          input.disabled = true;
          input.readOnly = true;
          resizeUnderlineGapInput(input);
        }
        setPassageGapVerbLabel(wrap, '');
      }
    });

    updatePassageGapWordBank(root);
  }

  function assignVerbToPassageGap(root, screen, gapNumber, verb, onChange) {
    var state = root._passageGapState;
    if (!state || gapNumber !== state.activeGap) return false;
    if (state.completed[gapNumber]) return false;

    var maxUses = state.verbCounts[verb] || 0;
    var confirmed = state.confirmedVerbs[verb] || 0;
    if (maxUses > 0 && confirmed >= maxUses) return false;

    state.assignments[gapNumber] = verb;

    var wrap = getPassageGapWrap(root, gapNumber);
    setPassageGapVerbLabel(wrap, verb);
    syncPassageGapStateToScreen(screen, root);

    var input = wrap && wrap.querySelector('.sp-passage-gap-input');
    if (input && !root.classList.contains('sp-screen--locked')) {
      setTimeout(function() { input.focus(); }, 0);
    }
    if (onChange) onChange();
    return true;
  }

  function isPassageGapSequentialReady(root, screen) {
    var p = screen.payload || {};
    if (!p.sequentialGaps) return allGapInputsFilled(root);

    var state = root._passageGapState;
    if (!state || state.activeGap == null) return false;
    if (state.completed[state.activeGap]) return false;

    var wrap = getPassageGapWrap(root, state.activeGap);
    if (!wrap) return false;
    var input = wrap.querySelector('.sp-passage-gap-input');
    var hasInput = input && !!input.value.trim();
    if (p.requireWordBankAssignment !== false) {
      return hasInput && !!state.assignments[state.activeGap];
    }
    return hasInput;
  }

  function bindPassageGapFill(root, screen, onChange) {
    var p = screen.payload || {};
    if (!p.sequentialGaps) {
      bindGapInputs(root, onChange);
      return;
    }

    initPassageGapSequentialState(root, screen);
    updatePassageGapUI(root, screen);

    function tryAssignWord(word) {
      if (root.classList.contains('sp-screen--locked')) return;
      var state = root._passageGapState;
      if (!state || state.activeGap == null) return;
      assignVerbToPassageGap(root, screen, state.activeGap, word, onChange);
    }

    root.querySelectorAll('.sp-passage-wordbank-chip--selectable').forEach(function(chip) {
      chip.addEventListener('click', function() {
        if (chip.disabled) return;
        tryAssignWord(chip.getAttribute('data-word'));
      });
    });

    bindPassageGapActiveInput(root, screen, onChange);

    var activeWrap = getPassageGapWrap(root, root._passageGapState.activeGap);
    var activeInput = activeWrap && activeWrap.querySelector('.sp-passage-gap-input');
    if (activeInput && !activeInput.disabled) {
      setTimeout(function() { activeInput.focus(); }, 0);
    }
  }

  function processPassageGapSequentialCheck(root, screen) {
    var p = screen.payload || {};
    var gaps = p.gaps || [];
    var state = root._passageGapState;
    if (!state || state.activeGap == null) {
      return { handled: true, noop: true };
    }

    var gapNumber = state.activeGap;
    var gap = null;
    for (var i = 0; i < gaps.length; i++) {
      if (gaps[i].gapNumber === gapNumber) {
        gap = gaps[i];
        break;
      }
    }
    if (!gap) return { handled: true, noop: true };

    var wrap = getPassageGapWrap(root, gapNumber);
    var input = wrap && wrap.querySelector('.sp-passage-gap-input');
    var given = input ? input.value.trim() : '';
    if (!given || (p.requireWordBankAssignment !== false && !state.assignments[gapNumber])) {
      return { handled: true, noop: true };
    }

    var ok = norm.answersMatch(given, gap.expectedAnswer);
    var verb = state.assignments[gapNumber] || gap.baseVerb || '';

    wrap.classList.toggle('sp-passage-gap--correct', ok);
    wrap.classList.toggle('sp-passage-gap--incorrect', !ok);

    if (ok) {
      state.completed[gapNumber] = {
        answer: given,
        verb: verb
      };
      delete state.failed[gapNumber];
      if (verb) {
        state.confirmedVerbs[verb] = (state.confirmedVerbs[verb] || 0) + 1;
      }
      syncPassageGapStateToScreen(screen, root);
      updatePassageGapWordBank(root);
    } else {
      state.failed[gapNumber] = {
        answer: given,
        verb: verb
      };
      syncPassageGapStateToScreen(screen, root);
    }

    var allComplete = gaps.every(function(g) { return !!state.completed[g.gapNumber]; });

    return {
      handled: true,
      correct: ok,
      partial: !allComplete,
      allDone: ok && allComplete,
      lifeLoss: ok ? 0 : 1,
      userAnswer: given,
      correctAnswer: gap.expectedAnswer,
      explanation: p.explanation || '',
      _passageGapResult: true
    };
  }

  function getNextPassageGapNumber(state, gaps) {
    if (!state || !gaps.length) return null;
    var currentIdx = -1;
    for (var i = 0; i < gaps.length; i++) {
      if (gaps[i].gapNumber === state.activeGap) {
        currentIdx = i;
        break;
      }
    }
    if (state.inRetryPhase && state.retryQueue && state.retryQueue.length) {
      var retryIdx = state.retryQueue.indexOf(state.activeGap);
      if (retryIdx >= 0 && retryIdx < state.retryQueue.length - 1) {
        return state.retryQueue[retryIdx + 1];
      }
      return null;
    }
    for (var j = currentIdx + 1; j < gaps.length; j++) {
      return gaps[j].gapNumber;
    }
    return null;
  }

  function startPassageGapRetryRound(state, gaps) {
    var failedNums = gaps
      .map(function(g) { return g.gapNumber; })
      .filter(function(n) { return !state.completed[n]; });
    if (!failedNums.length) return false;
    state.inRetryPhase = true;
    state.retryQueue = failedNums;
    state.activeGap = failedNums[0];
    return true;
  }

  function advancePassageGapAfterFeedback(root, screen) {
    var gaps = (screen.payload || {}).gaps || [];
    var state = root._passageGapState;
    if (!state) return;

    var nextGap = getNextPassageGapNumber(state, gaps);
    if (nextGap != null) {
      state.activeGap = nextGap;
    } else if (!startPassageGapRetryRound(state, gaps)) {
      syncPassageGapStateToScreen(screen, root);
      return;
    }

    syncPassageGapStateToScreen(screen, root);
    updatePassageGapUI(root, screen);

    var activeWrap = getPassageGapWrap(root, state.activeGap);
    var activeInput = activeWrap && activeWrap.querySelector('.sp-passage-gap-input');
    if (activeInput && !activeInput.disabled) {
      setTimeout(function() { activeInput.focus(); }, 0);
    }
  }

  function bindPassageGapActiveInput(root, screen, onChange) {
    var state = root._passageGapState;
    if (!state) return;

    if (!root._passageGapInputDelegation) {
      root._passageGapInputDelegation = true;
      root.addEventListener('input', function(e) {
        if (!e.target.classList.contains('sp-passage-gap-input')) return;
        var wrap = e.target.closest('.sp-passage-gap-wrap');
        if (!wrap || !wrap.classList.contains('sp-passage-gap-wrap--active')) return;
        resizeUnderlineGapInput(e.target);
        if (onChange) onChange();
      });
      root.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' || root.classList.contains('sp-screen--locked')) return;
        if (!e.target.classList.contains('sp-passage-gap-input')) return;
        var wrap = e.target.closest('.sp-passage-gap-wrap');
        if (!wrap || !wrap.classList.contains('sp-passage-gap-wrap--active')) return;
        e.preventDefault();
        var actionBtn = document.getElementById('sp-action-btn');
        if (actionBtn && !actionBtn.disabled) actionBtn.click();
      });
    }

    var activeWrap = getPassageGapWrap(root, state.activeGap);
    if (!activeWrap) return;

    var inp = activeWrap.querySelector('.sp-passage-gap-input');
    if (inp) resizeUnderlineGapInput(inp);
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

  function buildInlineGapField(verbRef, gapIdx) {
    gapIdx = gapIdx || 0;
    var idAttr = gapIdx === 0 ? ' id="sp-gap-input"' : '';
    var idxAttr = gapIdx > 0 ? ' data-gap-idx="' + gapIdx + '"' : '';
    var inputHtml = '<input type="text" class="sp-gap-inline-input sp-gap-underline-input"' + idAttr + idxAttr +
      ' autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer for gap ' + (gapIdx + 1) + '">';
    if (!verbRef) {
      return '<span class="sp-inline-gap-group sp-inline-gap sp-inline-gap-group--solo" role="group" aria-label="Gap ' + (gapIdx + 1) + '">' + inputHtml + '</span>';
    }
    return '<span class="sp-inline-gap-group sp-inline-gap" role="group" aria-label="Gap fill">' +
      inputHtml +
      renderVerbRef(verbRef) +
    '</span>';
  }

  function buildErrorCorrectionGapField(highlightedText) {
    var inputHtml = '<input type="text" class="sp-gap-inline-input sp-gap-underline-input" id="sp-error-input" ' +
      'autocomplete="off" autocapitalize="off" spellcheck="false" ' +
      'aria-label="Type the corrected form">';
    return '<span class="sp-inline-gap-group sp-inline-gap-group--solo" role="group" aria-label="Error correction">' +
      inputHtml +
    '</span>';
  }

  function renderErrorCorrectionGapLine(sentence, highlightedText, gapField) {
    var parts = splitSentenceAtHighlight(sentence, highlightedText);
    var html = '';
    if (parts.before) html += formatSentenceText(parts.before) + ' ';
    html += gapField;
    if (parts.after) html += ' ' + formatSentenceText(parts.after);
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
      case 'conjugation_gap_fill':
      case 'word_bank_gap_fill':
      case 'preselected_verb_gap_fill': return renderGapFill(screen);
      case 'full_sentence_write': return renderFullSentence(screen);
      case 'word_order_tiles': return renderWordOrder(screen);
      case 'error_correction': return renderErrorCorrection(screen);
      case 'verb_bank_two_step': return renderVerbBankTwoStep(screen);
      case 'passage_error_hunt_single': return renderPassageHunt(screen);
      case 'passage_error_hunt_counter': return renderPassageHuntCounter(screen);
      case 'passage_gap_fill': return renderPassageGapFill(screen);
      case 'guided_error_choice': return renderGuidedErrorChoice(screen);
      case 'stative_sorting': return renderStativeSorting(screen);
      case 'meaning_contrast': return renderMeaningContrast(screen);
      case 'preselected_verb_gap_fill': return renderGapFill(screen);
      case 'mc_4_option': return renderMc4Option(screen);
      case 'find_extra_word': return renderFindExtraWord(screen);
      case 'keyword_transformation': return renderKeywordTransformation(screen);
      case 'column_matching': return renderColumnMatching(screen);
      case 'crossword_clues': return renderCrosswordClues(screen);
      case 'synced_gap_fill': return renderSyncedGapFill(screen);
      case 'comma_placement': return renderCommaPlacement(screen);
      case 'word_bank_tick': return renderWordBankTick(screen);
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

  function renderMcOptionBtn(opt, index) {
    var letter = opt.letter || String.fromCharCode(65 + index);
    var label = opt.text || '';
    return '<button type="button" class="sp-option-btn" data-letter="' + esc(letter) + '" data-value="' + esc(letter) + '">' +
      '<span class="sp-option-num">' + esc(letter) + '</span>' +
      '<span class="sp-option-label">' + esc(label) + '</span>' +
    '</button>';
  }

  function buildMcGapPill(gapNum) {
    return '<button type="button" class="sp-mc-gap-pill sp-passage-gap-wrap" data-gap-number="' + gapNum + '" ' +
      'aria-label="Gap ' + gapNum + '">' +
      '<span class="sp-passage-gap-num">' + gapNum + '</span>' +
      '<span class="sp-mc-gap-slot" id="sp-mc-gap-slot-' + gapNum + '"></span>' +
    '</button>';
  }

  function renderMcPassageGapHtml(passage) {
    var paragraphs = String(passage || '').split(/\n+/).filter(function(p) { return p.trim(); });
    return paragraphs.map(function(para) {
      var inner = esc(para.trim())
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(PASSAGE_GAP_MARK_RE, function(_, num) {
          return buildMcGapPill(num);
        });
      return '<p class="sp-passage-para">' + inner + '</p>';
    }).join('');
  }

  function renderMc4OptionStandalone(screen) {
    var p = screen.payload || {};
    var gapWidth = 4;
    var html = '<div class="sp-screen sp-screen--choice sp-screen--mc-standalone" data-format="mc_4_option">';
    html += '<div class="sp-prompt-row sp-prompt-row--choice">';
    html += '<p class="sp-prompt-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' +
      esc(p.sentenceBefore || '') +
      ' <span class="sp-gap-anchor" style="--sp-gap-width:' + gapWidth + 'ch">' +
        '<span class="sp-gap-slot" id="sp-choice-slot"></span>' +
      '</span> ' +
      esc(p.sentenceAfter || '') + '</p>';
    html += '</div>';
    html += '<div class="sp-option-grid sp-option-grid--quad" id="sp-mc-option-grid">';
    (p.options || []).forEach(function(opt, i) {
      html += renderMcOptionBtn(opt, i);
    });
    html += '</div></div>';
    return html;
  }

  function renderMc4OptionPassage(screen) {
    var p = screen.payload || {};
    var passageHtml = renderMcPassageGapHtml(p.passage || '');
    var html = '<div class="sp-screen sp-screen--passage-gap sp-screen--mc-passage" data-format="mc_4_option">';
    html += '<div class="sp-passage-gap-scroll" tabindex="0" aria-label="Story text">';
    html += '<div class="sp-passage-card sp-passage-card--gap-fill sp-passage-card--justified" id="sp-passage-text">' + passageHtml + '</div>';
    html += '</div>';
    html += '<div class="sp-mc-sheet" id="sp-mc-sheet" hidden aria-hidden="true">';
    html += '<button type="button" class="sp-mc-sheet-backdrop" data-action="mc-sheet-close" aria-label="Close"></button>';
    html += '<div class="sp-mc-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sp-mc-sheet-title">';
    html += '<p class="sp-mc-sheet-title" id="sp-mc-sheet-title">Choose an option</p>';
    html += '<div class="sp-option-grid sp-option-grid--quad" id="sp-mc-sheet-options"></div>';
    html += '</div></div>';
    html += '</div>';
    return html;
  }

  function renderMc4Option(screen) {
    var p = screen.payload || {};
    if (p.displayMode === 'passage') return renderMc4OptionPassage(screen);
    return renderMc4OptionStandalone(screen);
  }

  function getMcGapSelections(root) {
    return root._mcSelections || {};
  }

  function allMcPassageGapsFilled(root, screen) {
    var gaps = (screen.payload && screen.payload.gaps) || [];
    if (!gaps.length) return false;
    var selections = getMcGapSelections(root);
    return gaps.every(function(gap) {
      return !!selections[gap.gapNumber];
    });
  }

  function markMcGapResults(root, gaps, selections) {
    (gaps || []).forEach(function(gap) {
      var pill = root.querySelector('.sp-mc-gap-pill[data-gap-number="' + gap.gapNumber + '"]');
      if (!pill) return;
      var selected = (selections || {})[gap.gapNumber] || '';
      var ok = selected.toUpperCase() === String(gap.answer || '').toUpperCase();
      pill.classList.toggle('sp-mc-gap-pill--correct', ok);
      pill.classList.toggle('sp-mc-gap-pill--incorrect', !ok);
      pill.disabled = true;
    });
  }

  function bindMc4OptionStandalone(root, screen, onChange) {
    var payload = screen.payload || {};
    bindSentenceSpeak(root, function() {
      var slot = root.querySelector('#sp-choice-slot');
      var letter = slot ? slot.textContent.trim() : '';
      var opt = (payload.options || []).find(function(o) {
        return o.letter === letter;
      });
      var chosen = opt ? opt.text : letter;
      return buildGapSentence(payload.sentenceBefore, chosen, payload.sentenceAfter);
    });
    root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        root.querySelectorAll('.sp-option-btn').forEach(function(b) {
          b.classList.remove('sp-option-btn--selected');
        });
        btn.classList.add('sp-option-btn--selected');
        var letter = btn.getAttribute('data-letter') || '';
        var slot = root.querySelector('#sp-choice-slot');
        if (slot) slot.textContent = letter;
        onChange();
        var opt = (payload.options || []).find(function(o) { return o.letter === letter; });
        if (opt && opt.text) speakText(opt.text);
      });
    });
  }

  function bindMc4OptionPassage(root, screen, onChange) {
    var payload = screen.payload || {};
    var gapsByNumber = {};
    (payload.gaps || []).forEach(function(gap) {
      gapsByNumber[gap.gapNumber] = gap;
    });
    root._mcGapOptions = gapsByNumber;
    root._mcSelections = root._mcSelections || {};

    var sheet = root.querySelector('#sp-mc-sheet');
    var sheetTitle = root.querySelector('#sp-mc-sheet-title');
    var sheetOptions = root.querySelector('#sp-mc-sheet-options');

    function closeSheet() {
      if (!sheet) return;
      sheet.hidden = true;
      sheet.setAttribute('aria-hidden', 'true');
      root._mcActiveGap = null;
    }

    function openSheet(gapNumber) {
      var gap = gapsByNumber[gapNumber];
      if (!gap || !sheet || !sheetOptions) return;
      root._mcActiveGap = gapNumber;
      if (sheetTitle) {
        sheetTitle.textContent = 'Choose an option for gap ' + gapNumber;
      }
      sheetOptions.innerHTML = '';
      (gap.options || []).forEach(function(opt, i) {
        sheetOptions.insertAdjacentHTML('beforeend', renderMcOptionBtn(opt, i));
      });
      sheetOptions.querySelectorAll('.sp-option-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (root.classList.contains('sp-screen--locked')) return;
          var letter = btn.getAttribute('data-letter') || '';
          root._mcSelections[gapNumber] = letter;
          var slot = root.querySelector('#sp-mc-gap-slot-' + gapNumber);
          if (slot) slot.textContent = letter;
          var pill = root.querySelector('.sp-mc-gap-pill[data-gap-number="' + gapNumber + '"]');
          if (pill) pill.classList.add('sp-mc-gap-pill--filled');
          closeSheet();
          onChange();
        });
      });
      sheet.hidden = false;
      sheet.setAttribute('aria-hidden', 'false');
    }

    root.querySelectorAll('.sp-mc-gap-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var gapNumber = parseInt(pill.getAttribute('data-gap-number'), 10);
        if (!isNaN(gapNumber)) openSheet(gapNumber);
      });
    });

    var backdrop = root.querySelector('[data-action="mc-sheet-close"]');
    if (backdrop) backdrop.addEventListener('click', closeSheet);
  }

  function bindMc4Option(root, screen, onChange) {
    var p = screen.payload || {};
    if (p.displayMode === 'passage') {
      bindMc4OptionPassage(root, screen, onChange);
    } else {
      bindMc4OptionStandalone(root, screen, onChange);
    }
  }

  function renderFindExtraWord(screen) {
    var p = screen.payload || {};
    var html = '<div class="sp-screen sp-screen--few" data-format="find_extra_word">';
    html += '<div class="sp-few-row">';
    html += '<div class="sp-few-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">';
    (p.tokens || []).forEach(function(token) {
      var idx = token.index != null ? token.index : 0;
      var isAnswer = token.isAnswer ? '1' : '0';
      if (token.clickable !== false) {
        html += '<button type="button" class="sp-few-token sp-few-token--clickable" ' +
          'data-token-index="' + idx + '" data-is-answer="' + isAnswer + '" ' +
          'aria-pressed="false">' + esc(token.text) + '</button> ';
      } else {
        html += '<span class="sp-few-token sp-few-token--static">' + esc(token.text) + '</span> ';
      }
    });
    html += '</div>';
    html += '<button type="button" class="sp-few-ok-btn" aria-pressed="false">OK</button>';
    html += '</div></div>';
    return html;
  }

  function getFewSelection(root) {
    var selectedWord = root.querySelector('.sp-few-token--selected');
    var okBtn = root.querySelector('.sp-few-ok-btn');
    return {
      selectedWord: selectedWord,
      okSelected: !!(okBtn && okBtn.classList.contains('sp-few-ok-btn--selected')),
      okBtn: okBtn
    };
  }

  function markFewResults(root, payload, selection) {
    var okBtn = selection.okBtn;
    var selectedWord = selection.selectedWord;
    var words = root.querySelectorAll('.sp-few-token--clickable');
    var isOkItem = !!payload.isCorrectSentence;

    words.forEach(function(w) { w.disabled = true; });
    if (okBtn) okBtn.disabled = true;

    if (isOkItem) {
      if (selection.okSelected && !selectedWord) {
        if (okBtn) okBtn.classList.add('sp-few-ok-btn--correct');
      } else {
        if (okBtn) okBtn.classList.add('sp-few-ok-btn--incorrect');
        if (selectedWord) selectedWord.classList.add('sp-few-token--incorrect');
      }
      return;
    }

    if (selectedWord) {
      var isAnswer = selectedWord.getAttribute('data-is-answer') === '1';
      selectedWord.classList.add(isAnswer ? 'sp-few-token--correct' : 'sp-few-token--incorrect');
      if (!isAnswer) {
        words.forEach(function(w) {
          if (w.getAttribute('data-is-answer') === '1') w.classList.add('sp-few-token--reveal');
        });
      }
    } else if (selection.okSelected) {
      if (okBtn) okBtn.classList.add('sp-few-ok-btn--incorrect');
      words.forEach(function(w) {
        if (w.getAttribute('data-is-answer') === '1') w.classList.add('sp-few-token--reveal');
      });
    } else {
      words.forEach(function(w) {
        if (w.getAttribute('data-is-answer') === '1') w.classList.add('sp-few-token--reveal');
      });
    }
  }

  function bindFindExtraWord(root, screen, onChange) {
    var payload = screen.payload || {};
    bindSentenceSpeak(root, function() {
      return payload.sentence || '';
    });

    var okBtn = root.querySelector('.sp-few-ok-btn');

    function clearWordSelection() {
      root.querySelectorAll('.sp-few-token--selected').forEach(function(w) {
        w.classList.remove('sp-few-token--selected');
        w.setAttribute('aria-pressed', 'false');
      });
    }

    function clearOkSelection() {
      if (!okBtn) return;
      okBtn.classList.remove('sp-few-ok-btn--selected');
      okBtn.setAttribute('aria-pressed', 'false');
    }

    root.querySelectorAll('.sp-few-token--clickable').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var wasSelected = btn.classList.contains('sp-few-token--selected');
        clearWordSelection();
        if (!wasSelected) {
          btn.classList.add('sp-few-token--selected');
          btn.setAttribute('aria-pressed', 'true');
          clearOkSelection();
        }
        onChange();
      });
    });

    if (okBtn) {
      okBtn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var wasSelected = okBtn.classList.contains('sp-few-ok-btn--selected');
        clearOkSelection();
        if (!wasSelected) {
          okBtn.classList.add('sp-few-ok-btn--selected');
          okBtn.setAttribute('aria-pressed', 'true');
          clearWordSelection();
        }
        onChange();
      });
    }
  }

  function buildKwtGapField() {
    return '<span class="sp-inline-gap-group sp-inline-gap-group--solo sp-kwt-gap-wrap" role="group" aria-label="Transformation gap">' +
      '<input type="text" class="sp-gap-inline-input sp-gap-underline-input sp-kwt-gap-input" id="sp-kwt-input" ' +
      'autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="sp-kwt-word-count" ' +
      'aria-label="Write between two and five words">' +
    '</span>';
  }

  function renderKeywordTransformation(screen) {
    var p = screen.payload || {};
    var minWords = p.minWords != null ? p.minWords : 2;
    var maxWords = p.maxWords != null ? p.maxWords : 5;
    var targetHtml = renderSentenceWithGap(p.targetSentence || '', buildKwtGapField());
    var html = '<div class="sp-screen sp-screen--kwt" data-format="keyword_transformation">';
    html += '<div class="sp-kwt-prompt sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' +
      esc(p.promptSentence || '') + '</div>';
    if (p.keyword) {
      html += '<div class="sp-kwt-keyword-row"><span class="sp-kwt-keyword">' + esc(p.keyword) + '</span></div>';
    }
    html += '<div class="sp-kwt-target"><p class="sp-kwt-target-sentence">' + targetHtml + '</p></div>';
    html += '<p class="sp-kwt-word-count sp-kwt-word-count--empty" id="sp-kwt-word-count" aria-live="polite">' +
      '0 / ' + minWords + '–' + maxWords + ' words</p>';
    html += '</div>';
    return html;
  }

  function getKwtInput(root) {
    return root ? root.querySelector('#sp-kwt-input') : null;
  }

  function getKwtWordLimits(screen) {
    var p = (screen && screen.payload) || {};
    return {
      min: p.minWords != null ? p.minWords : 2,
      max: p.maxWords != null ? p.maxWords : 5
    };
  }

  function countKwtGapWords(text) {
    if (gapWords && gapWords.countKeywordTransformationWords) {
      return gapWords.countKeywordTransformationWords(text);
    }
    var trimmed = String(text || '').trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }

  function isKwtWordCountValid(text, screen) {
    var limits = getKwtWordLimits(screen);
    if (gapWords && gapWords.isKeywordTransformationWordCountValid) {
      return gapWords.isKeywordTransformationWordCountValid(text, limits.min, limits.max);
    }
    var count = countKwtGapWords(text);
    return count >= limits.min && count <= limits.max;
  }

  function updateKwtWordCountDisplay(root, screen) {
    var counter = root.querySelector('#sp-kwt-word-count');
    var input = getKwtInput(root);
    if (!counter) return;
    var limits = getKwtWordLimits(screen);
    var count = countKwtGapWords(input ? input.value : '');
    counter.textContent = count + ' / ' + limits.min + '–' + limits.max + ' words';
    counter.classList.remove('sp-kwt-word-count--empty', 'sp-kwt-word-count--valid', 'sp-kwt-word-count--invalid');
    if (!count) {
      counter.classList.add('sp-kwt-word-count--empty');
    } else if (isKwtWordCountValid(input ? input.value : '', screen)) {
      counter.classList.add('sp-kwt-word-count--valid');
    } else {
      counter.classList.add('sp-kwt-word-count--invalid');
    }
  }

  function bindKeywordTransformation(root, screen, onChange) {
    var payload = screen.payload || {};
    var input = getKwtInput(root);
    bindSentenceSpeak(root, function() {
      return payload.promptSentence || '';
    });
    if (!input) return;
    input.addEventListener('input', function() {
      updateKwtWordCountDisplay(root, screen);
      onChange();
    });
    updateKwtWordCountDisplay(root, screen);
  }

  function getCmPairs(root) {
    return root._cmPairs || {};
  }

  function setCmPairs(root, pairs) {
    root._cmPairs = pairs || {};
  }

  function renderColumnMatching(screen) {
    var p = screen.payload || {};
    var html = '<div class="sp-screen sp-screen--column-match" data-format="column_matching">';
    html += '<div class="sp-cm-board">';
    html += '<div class="sp-cm-column sp-cm-column--left" aria-label="Sentence beginnings">';
    html += '<p class="sp-cm-column-title">Match the beginnings</p>';
    (p.pairs || []).forEach(function(pair) {
      html += '<button type="button" class="sp-cm-left-item" data-pair-id="' + pair.pairId + '" aria-pressed="false">' +
        '<span class="sp-cm-num">' + pair.pairId + '</span>' +
        '<span class="sp-cm-left-text">' + esc(pair.leftText) + '</span>' +
        '<span class="sp-cm-pair-badge" data-pair-badge="' + pair.pairId + '" hidden aria-hidden="true"></span>' +
      '</button>';
    });
    html += '</div>';
    html += '<div class="sp-cm-column sp-cm-column--right" aria-label="Sentence endings">';
    html += '<p class="sp-cm-column-title">Tap to pair</p>';
    (p.rightOptions || []).forEach(function(opt) {
      html += '<button type="button" class="sp-cm-right-item" data-letter="' + esc(opt.letter) + '" aria-pressed="false">' +
        '<span class="sp-cm-letter">' + esc(opt.letter) + '</span>' +
        '<span class="sp-cm-right-text">' + esc(opt.endingText) + '</span>' +
      '</button>';
    });
    html += '</div>';
    html += '</div></div>';
    return html;
  }

  function syncColumnMatchUi(root) {
    var pairs = getCmPairs(root);
    var selectedLeft = root._cmSelectedLeft || null;

    root.querySelectorAll('.sp-cm-left-item').forEach(function(btn) {
      var pairId = btn.getAttribute('data-pair-id');
      var letter = pairs[pairId] || '';
      var badge = btn.querySelector('[data-pair-badge="' + pairId + '"]');
      var isSelected = selectedLeft === pairId;
      btn.classList.toggle('sp-cm-left-item--selected', isSelected);
      btn.classList.toggle('sp-cm-left-item--paired', !!letter);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      if (badge) {
        if (letter) {
          badge.hidden = false;
          badge.setAttribute('aria-hidden', 'false');
          badge.textContent = '→ ' + letter;
        } else {
          badge.hidden = true;
          badge.setAttribute('aria-hidden', 'true');
          badge.textContent = '';
        }
      }
    });

    root.querySelectorAll('.sp-cm-right-item').forEach(function(btn) {
      var letter = btn.getAttribute('data-letter') || '';
      var isPaired = Object.keys(pairs).some(function(pid) { return pairs[pid] === letter; });
      btn.classList.toggle('sp-cm-right-item--paired', isPaired);
      btn.setAttribute('aria-pressed', isPaired ? 'true' : 'false');
    });
  }

  function clearCmPairForPairId(pairs, pairId) {
    var next = Object.assign({}, pairs);
    delete next[String(pairId)];
    return next;
  }

  function clearCmPairForLetter(pairs, letter) {
    var next = Object.assign({}, pairs);
    Object.keys(next).forEach(function(pid) {
      if (next[pid] === letter) delete next[pid];
    });
    return next;
  }

  function bindColumnMatching(root, screen, onChange) {
    root._cmPairs = root._cmPairs || {};
    root._cmSelectedLeft = null;

    function update(onChanged) {
      syncColumnMatchUi(root);
      if (onChanged) onChange();
    }

    root.querySelectorAll('.sp-cm-left-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var pairId = btn.getAttribute('data-pair-id');
        var pairs = getCmPairs(root);
        var isSelected = root._cmSelectedLeft === pairId;
        var isPaired = !!pairs[pairId];

        if (isSelected) {
          root._cmSelectedLeft = null;
          update(true);
          return;
        }

        if (isPaired) {
          setCmPairs(root, clearCmPairForPairId(pairs, pairId));
          root._cmSelectedLeft = null;
          update(true);
          return;
        }

        root._cmSelectedLeft = pairId;
        update(true);
      });
    });

    root.querySelectorAll('.sp-cm-right-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var letter = btn.getAttribute('data-letter') || '';
        var pairs = getCmPairs(root);
        var pairedTo = Object.keys(pairs).find(function(pid) { return pairs[pid] === letter; });

        if (pairedTo && !root._cmSelectedLeft) {
          setCmPairs(root, clearCmPairForLetter(pairs, letter));
          root._cmSelectedLeft = null;
          update(true);
          return;
        }

        if (!root._cmSelectedLeft) return;

        var next = clearCmPairForLetter(pairs, letter);
        next[String(root._cmSelectedLeft)] = letter;
        setCmPairs(root, next);
        root._cmSelectedLeft = null;
        update(true);
      });
    });

    syncColumnMatchUi(root);
  }

  function markColumnMatchResults(root, pairs, payloadPairs) {
    (payloadPairs || []).forEach(function(pair) {
      var leftBtn = root.querySelector('.sp-cm-left-item[data-pair-id="' + pair.pairId + '"]');
      var selected = pairs[String(pair.pairId)] || '';
      var ok = selected === pair.correctLetter;
      if (leftBtn) {
        leftBtn.classList.toggle('sp-cm-left-item--correct', ok);
        leftBtn.classList.toggle('sp-cm-left-item--incorrect', !ok);
        leftBtn.disabled = true;
      }
      var rightBtn = root.querySelector('.sp-cm-right-item[data-letter="' + pair.correctLetter + '"]');
      if (rightBtn && !ok) rightBtn.classList.add('sp-cm-right-item--reveal');
    });
    root.querySelectorAll('.sp-cm-right-item').forEach(function(btn) {
      btn.disabled = true;
    });
  }

  function renderCrosswordClues(screen) {
    var p = screen.payload || {};
    var count = p.letterCount || String(p.answer || '').replace(/\s+/g, '').length || 1;
    var dirLabel = p.direction === 'down' ? 'Down' : 'Across';
    var html = '<div class="sp-screen sp-screen--crossword" data-format="crossword_clues">';
    html += '<div class="sp-cw-clue-header">';
    html += '<span class="sp-cw-direction">' + esc(dirLabel) + '</span>';
    html += '<span class="sp-cw-clue-num">' + esc(String(p.clueNumber != null ? p.clueNumber : '')) + '</span>';
    html += '</div>';
    html += '<p class="sp-cw-clue-text">' + esc(p.clue) + '</p>';
    html += '<div class="sp-cw-letter-row" id="sp-cw-letter-row" role="group" aria-label="Answer letters">';
    for (var i = 0; i < count; i++) {
      html += '<input type="text" class="sp-cw-letter" maxlength="1" data-cw-idx="' + i + '" ' +
        'inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" ' +
        'aria-label="Letter ' + (i + 1) + ' of ' + count + '">';
    }
    html += '</div></div>';
    return html;
  }

  function getCrosswordLetterInputs(root) {
    var row = root.querySelector('#sp-cw-letter-row');
    if (!row) return [];
    var inputs = Array.prototype.slice.call(row.querySelectorAll('.sp-cw-letter'));
    inputs.sort(function(a, b) {
      return parseInt(a.getAttribute('data-cw-idx') || '0', 10) -
        parseInt(b.getAttribute('data-cw-idx') || '0', 10);
    });
    return inputs;
  }

  function getCrosswordWord(root) {
    return getCrosswordLetterInputs(root).map(function(inp) {
      return (inp.value || '').trim();
    }).join('');
  }

  function allCrosswordLettersFilled(root) {
    var inputs = getCrosswordLetterInputs(root);
    if (!inputs.length) return false;
    return inputs.every(function(inp) { return !!(inp.value || '').trim(); });
  }

  function focusCrosswordLetter(root, idx) {
    var input = root.querySelector('.sp-cw-letter[data-cw-idx="' + idx + '"]');
    if (input && !input.disabled) {
      input.focus();
      input.select();
    }
  }

  function bindCrosswordClues(root, screen, onChange) {
    var inputs = getCrosswordLetterInputs(root);
    inputs.forEach(function(input) {
      input.addEventListener('input', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        var val = input.value.replace(/[^a-zA-Z]/g, '');
        input.value = val ? val[val.length - 1] : '';
        if (input.value) {
          var idx = parseInt(input.getAttribute('data-cw-idx') || '0', 10);
          focusCrosswordLetter(root, idx + 1);
        }
        onChange();
      });

      input.addEventListener('keydown', function(e) {
        if (root.classList.contains('sp-screen--locked')) return;
        var idx = parseInt(input.getAttribute('data-cw-idx') || '0', 10);
        if (e.key === 'Backspace' || e.key === 'Delete') {
          if (!input.value) {
            e.preventDefault();
            focusCrosswordLetter(root, idx - 1);
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          focusCrosswordLetter(root, idx - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          focusCrosswordLetter(root, idx + 1);
        }
      });
    });
  }

  function markCrosswordResults(root, payload, givenWord) {
    var expected = String(payload.answer || '').toLowerCase();
    var given = String(givenWord || '').toLowerCase();
    var filled = !!given.replace(/\s/g, '');
    var inputs = getCrosswordLetterInputs(root);
    inputs.forEach(function(inp, bi) {
      inp.disabled = true;
      inp.classList.remove('sp-cw-letter--correct', 'sp-cw-letter--incorrect');
      if (!filled) return;
      var letterOk = (inp.value || '').toLowerCase() === (expected[bi] || '');
      inp.classList.add(letterOk ? 'sp-cw-letter--correct' : 'sp-cw-letter--incorrect');
    });
  }

  function renderSyncedGapSlot(isMaster, sentenceIndex) {
    if (isMaster) {
      return '<span class="sp-inline-gap-group sp-sync-gap-group sp-sync-gap-group--master" role="group" aria-label="Your answer">' +
        '<input type="text" class="sp-gap-inline-input sp-gap-underline-input sp-sync-master-input" id="sp-sync-master-input" ' +
        'autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type one word for all three sentences">' +
      '</span>';
    }
    return '<span class="sp-sync-gap-group sp-sync-gap-group--preview">' +
      '<span class="sp-sync-preview" data-sync-preview="' + sentenceIndex + '" aria-label="Synced preview">…</span>' +
    '</span>';
  }

  function renderSyncedSentence(sentence, isMaster, sentenceIndex) {
    var parts = String(sentence || '').split(GAP_RE);
    var gapCount = countGaps(sentence);
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      html += formatSentenceText(parts[i]);
      if (i < gapCount) html += renderSyncedGapSlot(isMaster, sentenceIndex);
    }
    return html;
  }

  function renderSyncedGapFill(screen) {
    var p = screen.payload || {};
    var sentences = p.sentences || [];
    var html = '<div class="sp-screen sp-screen--sync-gap" data-format="synced_gap_fill">';
    html += '<div class="sp-sync-sentences">';
    sentences.forEach(function(sent, idx) {
      var isMaster = idx === 0;
      html += '<p class="sp-sync-sentence' + (isMaster ? ' sp-sync-sentence--master' : ' sp-sync-sentence--preview') + '">' +
        renderSyncedSentence(sent, isMaster, idx) + '</p>';
    });
    html += '</div>';
    if (sentences.length > 1) {
      html += '<p class="sp-sync-hint">Type in the first gap — the other two update automatically.</p>';
    }
    html += '</div>';
    return html;
  }

  function getSyncMasterInput(root) {
    return root ? root.querySelector('#sp-sync-master-input') : null;
  }

  function updateSyncPreviews(root, value) {
    var display = value ? value : '…';
    root.querySelectorAll('.sp-sync-preview').forEach(function(preview) {
      preview.textContent = display;
      preview.classList.toggle('sp-sync-preview--filled', !!value);
    });
  }

  function bindSyncedGapFill(root, screen, onChange) {
    var master = getSyncMasterInput(root);
    if (!master) return;
    master.addEventListener('input', function() {
      updateSyncPreviews(root, master.value);
      onChange();
    });
    updateSyncPreviews(root, master.value);
  }

  function markSyncedGapResults(root, correct) {
    var master = getSyncMasterInput(root);
    if (master) {
      master.readOnly = true;
      master.classList.toggle('sp-sync-master-input--correct', correct === true);
      master.classList.toggle('sp-sync-master-input--incorrect', correct === false);
    }
    root.querySelectorAll('.sp-sync-preview').forEach(function(preview) {
      preview.classList.toggle('sp-sync-preview--correct', correct === true);
      preview.classList.toggle('sp-sync-preview--incorrect', correct === false);
    });
  }

  function renderCommaPlacement(screen) {
    var p = screen.payload || {};
    if (p.interactionMode === 'rewrite_sentence') {
      return '<div class="sp-screen sp-screen--comma-rewrite" data-format="comma_placement" data-comma-mode="rewrite_sentence">' +
        '<p class="sp-comma-prompt sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + esc(p.sentence || '') + '</p>' +
        '<textarea class="sp-text-input sp-text-input--large sp-comma-rewrite-input" id="sp-comma-rewrite-input" rows="3" placeholder="Rewrite the sentence with commas where needed" autocomplete="off"></textarea>' +
      '</div>';
    }

    var html = '<div class="sp-screen sp-screen--comma-slots" data-format="comma_placement" data-comma-mode="tap_comma_slots">';
    html += '<div class="sp-comma-sentence sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">';
    (p.tokens || []).forEach(function(token, ti) {
      html += '<span class="sp-comma-token">' + esc(token.text) + '</span>';
      if (ti < (p.tokens || []).length - 1) {
        var allowed = (p.slots || []).some(function(slot) { return slot.slotIndex === ti; });
        if (allowed) {
          html += '<button type="button" class="sp-comma-slot" data-slot-index="' + ti + '" aria-pressed="false" aria-label="Comma after word ' + (ti + 1) + '">,</button>';
        }
      }
    });
    html += '</div></div>';
    return html;
  }

  function getCommaSlotSelection(root) {
    var selected = [];
    root.querySelectorAll('.sp-comma-slot.sp-comma-slot--selected').forEach(function(slot) {
      var idx = parseInt(slot.getAttribute('data-slot-index') || '-1', 10);
      if (idx >= 0) selected.push(idx);
    });
    selected.sort(function(a, b) { return a - b; });
    return selected;
  }

  function commaIndexSetsMatch(selected, expected) {
    if (selected.length !== expected.length) return false;
    for (var i = 0; i < selected.length; i++) {
      if (selected[i] !== expected[i]) return false;
    }
    return true;
  }

  function markCommaSlotResults(root, payload, selected) {
    var expected = (payload.commaAfterTokenIndexes || []).slice().sort(function(a, b) { return a - b; });
    var expectedSet = {};
    expected.forEach(function(i) { expectedSet[i] = true; });
    var selectedSet = {};
    selected.forEach(function(i) { selectedSet[i] = true; });
    var exactMatch = commaIndexSetsMatch(selected, expected);

    root.querySelectorAll('.sp-comma-slot').forEach(function(slot) {
      slot.disabled = true;
      var idx = parseInt(slot.getAttribute('data-slot-index') || '-1', 10);
      var isSel = !!selectedSet[idx];
      var isExp = !!expectedSet[idx];
      slot.classList.remove('sp-comma-slot--correct', 'sp-comma-slot--incorrect', 'sp-comma-slot--reveal');
      if (exactMatch && isSel) {
        slot.classList.add('sp-comma-slot--correct');
      } else if (isSel && !isExp) {
        slot.classList.add('sp-comma-slot--incorrect');
      } else if (!isSel && isExp) {
        slot.classList.add('sp-comma-slot--reveal');
      }
    });
    root.classList.toggle('sp-screen--comma-correct', exactMatch);
    root.classList.toggle('sp-screen--comma-incorrect', !exactMatch);
  }

  function bindCommaPlacement(root, screen, onChange) {
    var payload = screen.payload || {};
    if (payload.interactionMode === 'rewrite_sentence') {
      bindSentenceSpeak(root, function() { return payload.sentence || ''; });
      var rewriteInput = root.querySelector('#sp-comma-rewrite-input');
      if (rewriteInput) rewriteInput.addEventListener('input', onChange);
      return;
    }

    bindSentenceSpeak(root, function() { return payload.sentence || ''; });
    root.querySelectorAll('.sp-comma-slot').forEach(function(slot) {
      slot.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        slot.classList.toggle('sp-comma-slot--selected');
        slot.setAttribute('aria-pressed', slot.classList.contains('sp-comma-slot--selected') ? 'true' : 'false');
        onChange();
      });
    });
  }

  function renderWordBankTick(screen) {
    var p = screen.payload || {};
    var html = '<div class="sp-screen sp-screen--word-bank-tick" data-format="word_bank_tick">';
    html += '<div class="sp-wbt-grid-scroll">';
    html += '<div class="sp-wbt-grid" role="group" aria-label="Word bank">';
    (p.words || []).forEach(function(word) {
      var idx = word.index != null ? word.index : 0;
      html += '<button type="button" class="sp-wbt-chip" data-word-index="' + idx + '" ' +
        'data-word="' + esc(word.text) + '" aria-pressed="false">' + esc(word.text) + '</button>';
    });
    html += '</div></div></div>';
    return html;
  }

  function getWordBankTickSelection(root) {
    var selected = [];
    root.querySelectorAll('.sp-wbt-chip.sp-wbt-chip--selected').forEach(function(chip) {
      selected.push((chip.getAttribute('data-word') || chip.textContent || '').trim());
    });
    return selected;
  }

  function markWordBankTickResults(root, payload, selected) {
    var answerWords = payload.answerWords || [];
    var answerSet = {};
    answerWords.forEach(function(w) {
      answerSet[norm.normalizeAnswer(w)] = true;
    });
    var selectedSet = {};
    selected.forEach(function(w) {
      selectedSet[norm.normalizeAnswer(w)] = true;
    });
    var exactMatch = norm.wordSetsMatch(selected, answerWords, { caseSensitive: false });

    root.querySelectorAll('.sp-wbt-chip').forEach(function(chip) {
      chip.disabled = true;
      var word = (chip.getAttribute('data-word') || chip.textContent || '').trim();
      var key = norm.normalizeAnswer(word);
      var isSelected = !!selectedSet[key];
      var isAnswer = !!answerSet[key];
      chip.classList.remove('sp-wbt-chip--correct', 'sp-wbt-chip--incorrect', 'sp-wbt-chip--reveal');
      if (exactMatch) {
        if (isSelected) chip.classList.add('sp-wbt-chip--correct');
      } else if (isSelected && !isAnswer) {
        chip.classList.add('sp-wbt-chip--incorrect');
      } else if (!isSelected && isAnswer) {
        chip.classList.add('sp-wbt-chip--reveal');
      } else if (isSelected && isAnswer) {
        chip.classList.add('sp-wbt-chip--correct');
      }
    });
    root.classList.toggle('sp-screen--wbt-correct', exactMatch);
    root.classList.toggle('sp-screen--wbt-incorrect', !exactMatch);
  }

  function bindWordBankTick(root, screen, onChange) {
    root.querySelectorAll('.sp-wbt-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        if (root.classList.contains('sp-screen--locked')) return;
        chip.classList.toggle('sp-wbt-chip--selected');
        chip.setAttribute('aria-pressed', chip.classList.contains('sp-wbt-chip--selected') ? 'true' : 'false');
        onChange();
      });
    });
  }

  function buildInlineGapRenderOptions(payload) {
    return {
      gaps: payload.gaps || [],
      sourceSentence: payload.sourceSentence || ''
    };
  }

  function renderGapWordBank(words) {
    if (!words || !words.length) return '';
    var html = '<div class="sp-gap-wordbank" aria-label="Word bank">';
    words.forEach(function(word, i) {
      html += '<button type="button" class="sp-gap-wordbank-chip" data-word="' + esc(word) + '" data-bank-idx="' + i + '">' +
        esc(word) + '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderGapFill(screen) {
    var p = screen.payload || {};
    var verbRef = p.verbPrompt || p.preselectedVerb || '';
    var gapCount = countGaps(p.sentence);
    var multiCls = gapCount > 1 ? ' sp-prompt-sentence--multi-gap' : '';
    // When the verb is already given (highlighted), hide the word bank — the learner only conjugates.
    var showWordBank = !!(p.wordBank && p.wordBank.length && !verbRef);
    var format = showWordBank
      ? 'word_bank_gap_fill'
      : (screen.formatType || 'free_text_gap_fill');
    var html = '<div class="sp-screen sp-screen--gap' +
      (format === 'word_bank_gap_fill' ? ' sp-screen--word-bank-gap' : '') +
      '" data-format="' + esc(format) + '">';
    if (format === 'word_bank_gap_fill') {
      html += renderGapWordBank(p.wordBank || []);
    }
    html += '<div class="sp-prompt-row sp-prompt-row--gap">';
    html += '<p class="sp-prompt-sentence sp-prompt-sentence--inline-gap' + multiCls + ' sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + renderInlineGapSentence(p.sentence, verbRef, buildInlineGapRenderOptions(p)) + '</p>';
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

  function renderPassageGapFill(screen) {
    var p = screen.payload || {};
    var isSequential = !!p.sequentialGaps;
    var fieldOpts = {
      gapInputStyle: p.gapInputStyle,
      showVerbSlot: isSequential && p.requireWordBankAssignment !== false
    };
    var passageHtml = renderPassageGapHtml(p.passage || '', fieldOpts);
    var html = '<div class="sp-screen sp-screen--passage-gap' +
      (isSequential ? ' sp-screen--passage-sequential' : '') +
      '" data-format="passage_gap_fill">';
    if (p.wordBank && p.wordBank.length) {
      html += '<div class="sp-passage-wordbank" aria-label="Word bank">';
      p.wordBank.forEach(function(word) {
        if (isSequential && p.requireWordBankAssignment !== false) {
          html += '<button type="button" class="sp-passage-wordbank-chip sp-passage-wordbank-chip--selectable" ' +
            'data-word="' + esc(word) + '">' + esc(word) + '</button>';
        } else {
          html += '<span class="sp-passage-wordbank-chip" data-word="' + esc(word) + '">' + esc(word) + '</span>';
        }
      });
      html += '</div>';
    }
    html += '<div class="sp-passage-gap-scroll" tabindex="0" aria-label="Story text">';
    html += '<div class="sp-passage-card sp-passage-card--gap-fill sp-passage-card--justified" id="sp-passage-text">' + passageHtml + '</div>';
    html += '</div>';
    html += '</div>';
    return html;
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
      html += '<p class="sp-prompt-sentence sp-prompt-sentence--inline-gap' + multiCls + ' sp-speakable-sentence" data-action="practice-speak-sentence" role="button" tabindex="0" aria-label="Listen to sentence">' + renderInlineGapSentence(p.sentence, verbRef, buildInlineGapRenderOptions(p)) + '</p>';
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

  function getHuntErrorNumber(items, passage, itemIdx) {
    var item = items && items[itemIdx];
    if (item && item.errorIndex != null && item.errorIndex !== '') {
      return Number(item.errorIndex);
    }
    var ranked = (items || []).map(function(it, idx) {
      return { idx: idx, range: getCounterHuntItemRange(passage, it) };
    }).filter(function(r) { return r.range; })
      .sort(function(a, b) { return a.range.start - b.range.start; });
    for (var i = 0; i < ranked.length; i++) {
      if (ranked[i].idx === itemIdx) return i + 1;
    }
    return itemIdx + 1;
  }

  function renderHuntOrderBadge(num) {
    return '<span class="sp-hunt-order-badge" aria-hidden="true">' + num + '</span>';
  }

  function renderHuntCorrectionRow(wrong, placeholder) {
    return '<div class="sp-hunt-correction-row">' +
      '<input type="text" class="sp-text-input" id="sp-hunt-fix-input" ' +
      'placeholder="' + esc(placeholder || 'Type the correction') + '" ' +
      'autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<span class="sp-hunt-correction-error-box"><s>' + esc(wrong) + '</s></span>' +
    '</div>';
  }

  function bindHuntFixInput(correctionEl, root, onChange) {
    var fixInput = correctionEl ? correctionEl.querySelector('#sp-hunt-fix-input') : null;
    if (!fixInput) return null;
    fixInput.addEventListener('input', onChange);
    fixInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !root.classList.contains('sp-screen--locked')) {
        e.preventDefault();
        var actionBtn = document.getElementById('sp-action-btn');
        if (actionBtn && !actionBtn.disabled) actionBtn.click();
      }
    });
    setTimeout(function() { fixInput.focus(); }, 0);
    return fixInput;
  }

  function getCounterHuntItemRange(passage, item) {
    var wrong = item.wrong || item.targetPhrase || '';
    var positions = findAllErrorPositions(passage, wrong);
    return positions.length ? positions[0] : null;
  }

  function buildCounterHuntPassageHtml(passage, items, state) {
    var fixed = (state && state.fixed) || {};
    var marked = (state && state.marked) || {};
    var pending = (state && state.pendingWordIndices) || [];
    var tokens = tokenizePassageWords(passage);
    var overlays = [];

    (items || []).forEach(function(it, idx) {
      var range = getCounterHuntItemRange(passage, it);
      if (!range) return;
      if (fixed[idx]) {
        var errorNum = getHuntErrorNumber(items, passage, idx);
        overlays.push({
          start: range.start,
          end: range.end,
          type: 'fixed',
          html: '<span class="sp-hunt-fixed">' + renderHuntOrderBadge(errorNum) +
            '<span class="sp-hunt-corrected">' + esc(fixed[idx].correction) + '</span></span>'
        });
      } else if (marked[idx]) {
        overlays.push({
          start: range.start,
          end: range.end,
          type: 'marked',
          html: '<span class="sp-hunt-marked">' +
            '<s class="sp-hunt-marked-wrong">' +
            esc(passage.slice(range.start, range.end)) + '</s></span>'
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

  function renderPassageHunt(screen) {
    var p = screen.payload || {};
    var targetWrong = p.wrong || '';
    var passageText = p.passage || '';
    var passageHtml = buildHuntPassageHtml(passageText, [{ wrong: targetWrong }]);

    return '<div class="sp-screen sp-screen--hunt" data-format="passage_error_hunt_single">' +
      '<div class="sp-passage-card" id="sp-passage-text">' + passageHtml + '</div>' +
      '<div class="sp-hunt-correction" id="sp-hunt-correction" hidden></div>' +
    '</div>';
  }

  function renderPassageHuntCounter(screen) {
    var p = screen.payload || {};
    var items = p.items || [];
    var target = (p.counter && p.counter.target) || p.errorCount || items.length;
    var passage = p.passage || '';
    var saved = screen._huntState || {};
    var passageHtml = buildCounterHuntPassageHtml(passage, items, {
      fixed: saved.fixed || {},
      marked: saved.marked || {},
      pendingWordIndices: saved.pendingWordIndices || [],
      foundEntries: saved.foundEntries || []
    });

    var initialMarked = Object.keys(saved.marked || {}).length;
    return '<div class="sp-screen sp-screen--hunt sp-screen--hunt-counter" data-format="passage_error_hunt_counter">' +
      '<div class="sp-hunt-counter" id="sp-hunt-phase-label">' +
        '<span id="sp-hunt-found">' + initialMarked + '</span>/' + target + ' errors found' +
      '</div>' +
      '<div class="sp-passage-card" id="sp-passage-text">' + passageHtml + '</div>' +
      '<div class="sp-hunt-correction" id="sp-hunt-correction" hidden></div>' +
    '</div>';
  }

  function renderGuidedErrorChoice(screen) {
    var p = screen.payload || {};
    var items = p.items || [];
    var idx = screen._guidedIdx || 0;
    var item = items[idx];
    if (!item) return '<p class="sp-empty">No items loaded.</p>';

    var wrong = item.wrong || item.targetPhrase || '';
    var html = '<div class="sp-screen sp-screen--guided-error" data-format="guided_error_choice">';
    html += '<div class="sp-guided-progress">' + (idx + 1) + '/' + items.length + '</div>';
    html += '<p class="sp-guided-prompt">Choose the correct form:</p>';
    html += '<p class="sp-guided-wrong"><s>' + esc(wrong) + '</s></p>';
    html += '<div class="sp-option-grid">';
    (item.options || []).forEach(function(opt, i) {
      html += renderOptionBtn(opt, i);
    });
    html += '</div></div>';
    return html;
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

    if (format === 'guided_error_choice') {
      root.querySelectorAll('.sp-option-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (root.classList.contains('sp-screen--locked')) return;
          root.querySelectorAll('.sp-option-btn').forEach(function(b) { b.classList.remove('sp-option-btn--selected'); });
          btn.classList.add('sp-option-btn--selected');
          onChange();
        });
      });
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
        resizeUnderlineGapInput(errInput);
        errInput.addEventListener('input', function() {
          resizeUnderlineGapInput(errInput);
        });
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

    if (format === 'free_text_gap_fill' || format === 'conjugation_gap_fill' || format === 'preselected_verb_gap_fill' || format === 'word_bank_gap_fill') {
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

    if (format === 'free_text_gap_fill' || format === 'conjugation_gap_fill' || format === 'preselected_verb_gap_fill' || format === 'word_bank_gap_fill') {
      bindGapInputs(root, onChange);
      if (format === 'word_bank_gap_fill' || (screen.payload && screen.payload.wordBank && screen.payload.wordBank.length)) {
        bindWordBankGapFill(root, onChange);
      }
    }

    if (format === 'passage_gap_fill') {
      bindPassageGapFill(root, screen, onChange);
    }

    if (format === 'mc_4_option') {
      bindMc4Option(root, screen, onChange);
    }

    if (format === 'find_extra_word') {
      bindFindExtraWord(root, screen, onChange);
    }

    if (format === 'keyword_transformation') {
      bindKeywordTransformation(root, screen, onChange);
    }

    if (format === 'column_matching') {
      bindColumnMatching(root, screen, onChange);
    }

    if (format === 'crossword_clues') {
      bindCrosswordClues(root, screen, onChange);
    }

    if (format === 'synced_gap_fill') {
      bindSyncedGapFill(root, screen, onChange);
    }

    if (format === 'comma_placement') {
      bindCommaPlacement(root, screen, onChange);
    }

    if (format === 'word_bank_tick') {
      bindWordBankTick(root, screen, onChange);
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
    var correctionEl = root.querySelector('#sp-hunt-correction');
    root._huntSelectedWrong = null;

    function showCorrection(wrong) {
      if (!correctionEl) return;
      correctionEl.hidden = false;
      correctionEl.innerHTML = renderHuntCorrectionRow(wrong, 'Type the correction');
      root._huntTappedWrong = wrong;
      root._huntTappedCorrect = wrong === targetWrong;
      bindHuntFixInput(correctionEl, root, onChange);
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
        onChange();
      });
    });

    bindHuntWrongWordTaps(root);
  }

  function syncHuntStateToScreen(screen, root) {
    if (!screen || !root) return;
    screen._huntState = {
      phase: root._huntPhase,
      marked: root._huntMarked,
      fixed: root._huntFixed,
      foundEntries: root._huntFoundEntries,
      currentCorrectIdx: root._huntCurrentCorrectIdx,
      pendingWordIndices: root._huntPendingIndices
    };
  }

  function restoreHuntStateFromScreen(screen, root) {
    var saved = screen && screen._huntState;
    if (!saved) return;
    root._huntPhase = saved.phase || 'mark';
    root._huntMarked = saved.marked || {};
    root._huntFixed = saved.fixed || {};
    root._huntFoundEntries = saved.foundEntries || [];
    root._huntCurrentCorrectIdx = saved.currentCorrectIdx != null ? saved.currentCorrectIdx : null;
    root._huntPendingIndices = saved.pendingWordIndices || [];
  }

  function bindPassageHuntCounter(root, screen, onChange) {
    var p = screen.payload || {};
    var items = p.items || [];
    var passage = p.passage || '';
    var target = (p.counter && p.counter.target) || p.errorCount || items.length;
    var phaseLabelEl = root.querySelector('#sp-hunt-phase-label');
    var passageEl = root.querySelector('#sp-passage-text');
    var correctionEl = root.querySelector('#sp-hunt-correction');
    var tokens = tokenizePassageWords(passage);

    root._huntTokens = tokens;
    restoreHuntStateFromScreen(screen, root);

    if (!root._huntMarked) root._huntMarked = {};
    if (!root._huntFixed) root._huntFixed = {};
    if (!root._huntFoundEntries) root._huntFoundEntries = [];
    if (root._huntCurrentCorrectIdx == null) root._huntCurrentCorrectIdx = null;
    if (!root._huntPendingIndices) root._huntPendingIndices = [];
    if (!root._huntPhase) root._huntPhase = 'mark';

    function markedCount() {
      return Object.keys(root._huntMarked).length;
    }

    function fixedCount() {
      return Object.keys(root._huntFixed).length;
    }

    function getPendingText() {
      return getSelectionTextFromIndices(passage, tokens, root._huntPendingIndices);
    }

    function updatePhaseLabel() {
      if (!phaseLabelEl) return;
      if (root._huntPhase === 'mark') {
        phaseLabelEl.innerHTML = '<span id="sp-hunt-found">' + markedCount() + '</span>/' + target + ' errors found';
      } else if (root._huntPhase === 'correct') {
        var correctingNum = root._huntCurrentCorrectIdx != null
          ? getHuntErrorNumber(items, passage, root._huntCurrentCorrectIdx)
          : markedCount();
        phaseLabelEl.textContent = 'Write the correction for error ' + correctingNum + ' of ' + target;
      } else if (root._huntPhase === 'done') {
        phaseLabelEl.textContent = target + '/' + target + ' errors corrected';
      }
    }

    function renderPassage() {
      if (!passageEl) return;
      passageEl.innerHTML = buildCounterHuntPassageHtml(passage, items, {
        fixed: root._huntFixed,
        marked: root._huntMarked,
        pendingWordIndices: root._huntPendingIndices,
        foundEntries: root._huntFoundEntries
      });
      bindWordClicks();
    }

    function showCorrectionUI() {
      if (!correctionEl) return;
      var idx = root._huntCurrentCorrectIdx;
      var item = items[idx];
      if (!item) {
        correctionEl.hidden = true;
        return;
      }
      var wrong = item.wrong || item.targetPhrase || '';
      correctionEl.hidden = false;
      correctionEl.innerHTML = renderHuntCorrectionRow(wrong, 'Type the correction');
      bindHuntFixInput(correctionEl, root, onChange);
    }

    function hideCorrectionUI() {
      if (correctionEl) {
        correctionEl.hidden = true;
        correctionEl.innerHTML = '';
      }
    }

    function beginSingleItemCorrection(itemIdx) {
      root._huntPhase = 'correct';
      root._huntCurrentCorrectIdx = itemIdx;
      root._huntPendingIndices = [];
      hideCorrectionUI();
      showCorrectionUI();
      updatePhaseLabel();
      renderPassage();
      syncHuntStateToScreen(screen, root);
      onChange();
    }

    function refresh() {
      renderPassage();
      updatePhaseLabel();
      syncHuntStateToScreen(screen, root);
      onChange();
    }

    function clearPending() {
      root._huntPendingIndices = [];
    }

    function handleWordClick(wordIdx) {
      if (root._huntPhase !== 'mark' || root.classList.contains('sp-screen--locked')) return;

      var pos = root._huntPendingIndices.indexOf(wordIdx);
      if (pos !== -1) {
        root._huntPendingIndices = root._huntPendingIndices.slice(0, pos);
      } else if (!root._huntPendingIndices.length) {
        root._huntPendingIndices = [wordIdx];
      } else {
        var min = root._huntPendingIndices[0];
        var max = root._huntPendingIndices[root._huntPendingIndices.length - 1];
        if (wordIdx === max + 1) {
          root._huntPendingIndices = root._huntPendingIndices.concat([wordIdx]);
        } else if (wordIdx === min - 1) {
          root._huntPendingIndices = [wordIdx].concat(root._huntPendingIndices);
        } else {
          root._huntPendingIndices = [wordIdx];
        }
      }
      renderPassage();
      syncHuntStateToScreen(screen, root);
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

    root._huntValidateMark = function() {
      if (root._huntPhase !== 'mark') return { handled: false };
      var selectionText = getPendingText();
      if (!selectionText) return { handled: true, noop: true };

      var matchedIdx = matchSelectionToItem(selectionText, items, root._huntMarked);
      if (matchedIdx === -1) {
        shakePendingSelection();
        clearPending();
        refresh();
        return {
          handled: true,
          correct: false,
          lifeLoss: 1,
          userAnswer: selectionText,
          correctAnswer: '',
          explanation: 'That phrase is not one of the errors. Keep looking.'
        };
      }

      var item = items[matchedIdx];
      root._huntPendingMarkCommit = {
        itemIdx: matchedIdx,
        text: selectionText,
        item: item
      };
      clearPending();
      refresh();

      return {
        handled: true,
        correct: true,
        _huntMarkResult: true,
        userAnswer: selectionText,
        explanation: item.explanation || 'Correct! Now write the correction for this error.'
      };
    };

    root._huntValidateCorrection = function() {
      if (root._huntPhase !== 'correct') return { handled: false };
      var idx = root._huntCurrentCorrectIdx;
      var item = items[idx];
      if (!item) return { handled: false };

      var fixInp = root.querySelector('#sp-hunt-fix-input');
      var fixVal = fixInp ? fixInp.value.trim() : '';
      if (!fixVal) return { handled: true, noop: true };

      var expected = getItemCorrection(item);
      var isCorrect = norm.matchesAnyAccepted(fixVal, item);
      if (!isCorrect) {
        return {
          handled: true,
          correct: false,
          lifeLoss: 1,
          userAnswer: fixVal,
          correctAnswer: expected,
          explanation: item.explanation || ''
        };
      }

      root._huntPendingFixCommit = {
        itemIdx: idx,
        fixVal: fixVal,
        item: item
      };

      var allDone = fixedCount() + 1 >= target;
      return {
        handled: true,
        correct: true,
        _huntFixResult: true,
        allDone: allDone,
        userAnswer: fixVal,
        correctAnswer: expected,
        explanation: allDone
          ? (item.explanation || p.explanation || 'You found and corrected all the tense mistakes in the passage.')
          : (item.explanation || '')
      };
    };

    root._huntCommitMark = function() {
      var pending = root._huntPendingMarkCommit;
      if (!pending) return;
      var item = pending.item;
      root._huntMarked[pending.itemIdx] = {
        wrong: item.wrong || item.targetPhrase || '',
        text: pending.text
      };
      root._huntFoundEntries.push({ itemIdx: pending.itemIdx, text: pending.text });
      root._huntPendingMarkCommit = null;
      beginSingleItemCorrection(pending.itemIdx);
    };

    root._huntCommitFix = function() {
      var pending = root._huntPendingFixCommit;
      if (!pending) return false;
      var idx = pending.itemIdx;
      root._huntFixed[idx] = {
        correction: pending.fixVal,
        wrong: pending.item.wrong || pending.item.targetPhrase || ''
      };
      root._huntPendingFixCommit = null;

      var allDone = fixedCount() >= target;
      if (allDone) {
        root._huntPhase = 'done';
        root._huntCurrentCorrectIdx = null;
        hideCorrectionUI();
      } else {
        root._huntPhase = 'mark';
        root._huntCurrentCorrectIdx = null;
        hideCorrectionUI();
      }
      updatePhaseLabel();
      renderPassage();
      syncHuntStateToScreen(screen, root);
      onChange();
      return allDone;
    };

    if (root._huntPhase === 'correct') {
      showCorrectionUI();
    } else {
      hideCorrectionUI();
    }

    refresh();
  }

  function processPassageHuntCounterCheck(root, screen, callback) {
    callback = callback || function() {};
    if (!root) {
      callback({ handled: false });
      return;
    }
    if (root._huntPhase === 'mark' && typeof root._huntValidateMark === 'function') {
      callback(root._huntValidateMark());
      return;
    }
    if (root._huntPhase === 'correct' && typeof root._huntValidateCorrection === 'function') {
      callback(root._huntValidateCorrection());
      return;
    }
    callback({ handled: false });
  }

  function resumeHuntCounterAfterFeedback(root, screen) {
    if (!root || !screen) return;
    root.classList.remove('sp-screen--locked');
    root._huntPendingMarkCommit = null;
    root._huntPendingFixCommit = null;
    syncHuntStateToScreen(screen, root);
  }

  function commitHuntMarkAfterFeedback(root, screen) {
    if (!root || typeof root._huntCommitMark !== 'function') return;
    root._huntCommitMark();
    syncHuntStateToScreen(screen || root._spScreen, root);
  }

  function commitHuntFixAfterFeedback(root, screen) {
    if (!root || typeof root._huntCommitFix !== 'function') return false;
    var done = root._huntCommitFix();
    syncHuntStateToScreen(screen || root._spScreen, root);
    return done;
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
    if (f === 'mc_4_option') {
      var mp = screen.payload || {};
      if (mp.displayMode === 'passage') return allMcPassageGapsFilled(root, screen);
      return !!root.querySelector('.sp-option-btn--selected');
    }
    if (f === 'find_extra_word') {
      var fewSel = getFewSelection(root);
      return !!(fewSel.selectedWord || fewSel.okSelected);
    }
    if (f === 'keyword_transformation') {
      var kwtInput = getKwtInput(root);
      var kwtValue = kwtInput ? kwtInput.value.trim() : '';
      return !!kwtValue && isKwtWordCountValid(kwtValue, screen);
    }
    if (f === 'column_matching') {
      var cmPairs = getCmPairs(root);
      var cmPayloadPairs = (screen.payload && screen.payload.pairs) || [];
      if (!cmPayloadPairs.length) return false;
      return cmPayloadPairs.every(function(pair) {
        return !!cmPairs[String(pair.pairId)];
      });
    }
    if (f === 'crossword_clues') {
      return allCrosswordLettersFilled(root);
    }
    if (f === 'synced_gap_fill') {
      var syncInput = getSyncMasterInput(root);
      return syncInput && !!syncInput.value.trim();
    }
    if (f === 'comma_placement') {
      var cpPayload = screen.payload || {};
      if (cpPayload.interactionMode === 'rewrite_sentence') {
        var cpRewrite = root.querySelector('#sp-comma-rewrite-input');
        return cpRewrite && !!cpRewrite.value.trim();
      }
      return true;
    }
    if (f === 'word_bank_tick') {
      return root.querySelectorAll('.sp-wbt-chip.sp-wbt-chip--selected').length > 0;
    }
    if (f === 'free_text_gap_fill' || f === 'conjugation_gap_fill' || f === 'preselected_verb_gap_fill' || f === 'word_bank_gap_fill') {
      return allGapInputsFilled(root);
    }
    if (f === 'passage_gap_fill') {
      return isPassageGapSequentialReady(root, screen);
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
      if (root._huntPhase === 'mark') {
        return root._huntPendingIndices && root._huntPendingIndices.length > 0;
      }
      if (root._huntPhase === 'correct') {
        var fix = root.querySelector('#sp-hunt-fix-input');
        return fix && !!fix.value.trim();
      }
      return false;
    }
    if (f === 'guided_error_choice') {
      return !!root.querySelector('.sp-option-btn--selected');
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
      case 'mc_4_option': {
        if (p.displayMode === 'passage') {
          var gaps = p.gaps || [];
          var selections = getMcGapSelections(root);
          var wrongCount = 0;
          var userParts = [];
          var correctParts = [];
          gaps.forEach(function(gap) {
            var selected = selections[gap.gapNumber] || '';
            userParts.push(selected);
            correctParts.push(gap.answer);
            if (selected.toUpperCase() !== String(gap.answer || '').toUpperCase()) wrongCount++;
          });
          result.userAnswer = userParts.join(' / ');
          result.correctAnswer = correctParts.join(' / ');
          result.correct = wrongCount === 0;
          result.lifeLoss = wrongCount;
          markMcGapResults(root, gaps, selections);
        } else {
          var mcSel = root.querySelector('.sp-option-btn--selected');
          var letter = mcSel ? (mcSel.getAttribute('data-letter') || mcSel.getAttribute('data-value') || '') : '';
          result.userAnswer = letter;
          result.correctAnswer = p.answer;
          result.correct = letter.toUpperCase() === String(p.answer || '').toUpperCase();
          result.lifeLoss = result.correct ? 0 : 1;
        }
        break;
      }
      case 'find_extra_word': {
        var fewPayload = p;
        var fewSelection = getFewSelection(root);
        var fewOkItem = !!fewPayload.isCorrectSentence;
        var fewCorrect = false;

        if (fewOkItem) {
          fewCorrect = fewSelection.okSelected && !fewSelection.selectedWord;
          result.userAnswer = fewSelection.okSelected ? 'OK' : (fewSelection.selectedWord ? fewSelection.selectedWord.textContent.trim() : '');
          result.correctAnswer = 'OK';
        } else {
          if (fewSelection.selectedWord) {
            var fewIsAnswer = fewSelection.selectedWord.getAttribute('data-is-answer') === '1';
            fewCorrect = fewIsAnswer && !fewSelection.okSelected;
            result.userAnswer = fewSelection.selectedWord.textContent.trim();
          } else if (fewSelection.okSelected) {
            result.userAnswer = 'OK';
          } else {
            result.userAnswer = '';
          }
          result.correctAnswer = fewPayload.answer || '';
        }

        result.correct = fewCorrect;
        result.lifeLoss = fewCorrect ? 0 : 1;
        markFewResults(root, fewPayload, fewSelection);
        break;
      }
      case 'keyword_transformation': {
        var kwtInp = getKwtInput(root);
        var kwtText = kwtInp ? kwtInp.value.trim() : '';
        var kwtLimits = getKwtWordLimits(screen);
        result.userAnswer = kwtText;
        result.correctAnswer = (p.acceptedAnswers && p.acceptedAnswers[0]) || p.answer || '';
        if (!kwtText || !isKwtWordCountValid(kwtText, screen)) {
          result.correct = false;
          result.lifeLoss = 0;
          result.wordCountInvalid = true;
          break;
        }
        result.correct = norm.matchesAnyAccepted(kwtText, p);
        result.lifeLoss = result.correct ? 0 : 1;
        if (kwtInp) {
          kwtInp.classList.toggle('sp-kwt-gap-input--correct', result.correct);
          kwtInp.classList.toggle('sp-kwt-gap-input--incorrect', !result.correct);
          kwtInp.readOnly = true;
        }
        break;
      }
      case 'column_matching': {
        var cmPayload = p;
        var cmPairs = getCmPairs(root);
        var cmWrong = 0;
        var userParts = [];
        var correctParts = [];
        (cmPayload.pairs || []).forEach(function(pair) {
          var selected = cmPairs[String(pair.pairId)] || '';
          userParts.push(pair.pairId + '→' + (selected || '–'));
          correctParts.push(pair.pairId + '→' + pair.correctLetter);
          if (selected !== pair.correctLetter) cmWrong++;
        });
        result.userAnswer = userParts.join(' / ');
        result.correctAnswer = correctParts.join(' / ');
        result.correct = cmWrong === 0;
        result.lifeLoss = cmWrong;
        markColumnMatchResults(root, cmPairs, cmPayload.pairs);
        break;
      }
      case 'crossword_clues': {
        var cwWord = getCrosswordWord(root);
        result.userAnswer = cwWord;
        result.correctAnswer = p.answer || '';
        result.correct = norm.matchesAnyAccepted(cwWord, p);
        result.lifeLoss = result.correct ? 0 : 1;
        markCrosswordResults(root, p, cwWord);
        break;
      }
      case 'synced_gap_fill': {
        var syncMaster = getSyncMasterInput(root);
        var syncValue = syncMaster ? syncMaster.value.trim() : '';
        result.userAnswer = syncValue;
        result.correctAnswer = (p.acceptedAnswers && p.acceptedAnswers[0]) || p.answer || '';
        result.correct = norm.matchesAnyAccepted(syncValue, p);
        result.lifeLoss = result.correct ? 0 : 1;
        markSyncedGapResults(root, result.correct);
        break;
      }
      case 'comma_placement': {
        if (p.interactionMode === 'rewrite_sentence') {
          var cpRewriteInput = root.querySelector('#sp-comma-rewrite-input');
          var cpRewriteText = cpRewriteInput ? cpRewriteInput.value.trim() : '';
          result.userAnswer = cpRewriteText;
          result.correctAnswer = p.reconstructedSentence || ((p.acceptedAnswers && p.acceptedAnswers[0]) || '');
          result.correct = norm.matchesCommaRewrite(cpRewriteText, p);
          result.lifeLoss = result.correct ? 0 : 1;
          if (cpRewriteInput) {
            cpRewriteInput.readOnly = true;
            cpRewriteInput.classList.toggle('sp-comma-rewrite-input--correct', result.correct);
            cpRewriteInput.classList.toggle('sp-comma-rewrite-input--incorrect', !result.correct);
          }
        } else {
          var cpSelected = getCommaSlotSelection(root);
          var cpExpected = (p.commaAfterTokenIndexes || []).slice().sort(function(a, b) { return a - b; });
          var cpCorrect = false;
          if (p.noCommaNeeded) {
            cpCorrect = cpSelected.length === 0;
            result.correctAnswer = 'No commas';
          } else {
            cpCorrect = commaIndexSetsMatch(cpSelected, cpExpected);
            result.correctAnswer = cpExpected.join(', ');
          }
          result.userAnswer = cpSelected.length ? cpSelected.join(', ') : '(none)';
          result.correct = cpCorrect;
          result.lifeLoss = cpCorrect ? 0 : 1;
          markCommaSlotResults(root, p, cpSelected);
        }
        break;
      }
      case 'word_bank_tick': {
        var wbtPayload = p;
        var wbtSelected = getWordBankTickSelection(root);
        result.userAnswer = wbtSelected.join(', ');
        result.correctAnswer = (wbtPayload.answerWords || []).join(', ');
        result.correct = norm.wordSetsMatch(wbtSelected, wbtPayload.answerWords, { caseSensitive: false });
        result.lifeLoss = result.correct ? 0 : 1;
        markWordBankTickResults(root, wbtPayload, wbtSelected);
        break;
      }
      case 'free_text_gap_fill':
      case 'conjugation_gap_fill':
      case 'word_bank_gap_fill':
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
      case 'passage_gap_fill': {
        var passageGapValues = getPassageGapInputValues(root);
        var passageGaps = p.gaps || [];
        result.userAnswer = passageGapValues.join(' / ');
        result.correctAnswer = passageGaps.map(function(gap) { return gap.expectedAnswer; }).join(' / ');
        result.correct = passageGapValues.length === passageGaps.length &&
          norm.matchesBlanks(passageGapValues, p);
        result.lifeLoss = result.correct ? 0 : 1;
        if (!result.correct) {
          markPassageGapResults(root, passageGaps, passageGapValues);
        } else {
          markPassageGapResults(root, passageGaps, passageGaps.map(function(gap) {
            return gap.expectedAnswer;
          }));
        }
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
        result.handled = false;
        break;
      }
      case 'guided_error_choice': {
        var gItems = p.items || [];
        var gIdx = screen._guidedIdx || 0;
        var gItem = gItems[gIdx];
        var guidedSel = root.querySelector('.sp-option-btn--selected');
        var guidedVal = guidedSel ? guidedSel.getAttribute('data-value') : '';
        result.userAnswer = guidedVal;
        result.correctAnswer = gItem ? getItemCorrection(gItem) : '';
        result.correct = gItem ? norm.answersMatch(guidedVal, gItem.answer) : false;
        result.explanation = (gItem && gItem.explanation) || '';
        result.lifeLoss = result.correct ? 0 : 1;
        result.partial = result.correct && (gIdx + 1 < gItems.length);
        result.allDone = result.correct && (gIdx + 1 >= gItems.length);
        result._guidedProgress = result.correct;
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
    resumeHuntCounterAfterFeedback: resumeHuntCounterAfterFeedback,
    commitHuntMarkAfterFeedback: commitHuntMarkAfterFeedback,
    processPassageGapSequentialCheck: processPassageGapSequentialCheck,
    advancePassageGapAfterFeedback: advancePassageGapAfterFeedback,
    isPassageGapSequentialReady: isPassageGapSequentialReady,
    commitHuntFixAfterFeedback: commitHuntFixAfterFeedback
  };
})();
