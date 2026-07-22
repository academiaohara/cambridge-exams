/**
 * Shared explanation view for learning lesson flows (Sune Play + B1 Grammar).
 * Supports legacy single "Why" block and structured multi-section explanations.
 */
var LessonExplanation = (function() {
  var SHEET_ID = 'lesson-explanation-sheet';
  var INLINE_OVERLAY_ID = 'lesson-explanation-inline';
  var CARD_VIEW_ID = 'sp-explanation-card-view';

  var DEFAULT_SECTION_DEFS = {
    correct: { label: 'Correct answer', icon: 'check_circle', variant: 'answer' },
    yourAnswer: { label: 'Your answer', icon: 'cancel', variant: 'mistake' },
    optionContrast: { label: 'The fix', icon: 'compare_arrows', variant: 'mistake-note' },
    question: { label: 'Question', icon: 'quiz', variant: 'neutral' },
    fix: { label: 'The fix', icon: 'build', variant: 'teach' },
    whyCorrect: { label: "Why it's correct", wrongLabel: 'Why', icon: 'lightbulb', variant: 'teach' },
    correctedSentence: { label: 'Corrected sentence', icon: 'format_quote', variant: 'answer' },
    vocabularyFocus: { label: 'Vocabulary focus', icon: 'menu_book', variant: 'teach' },
    grammarFocus: { label: 'Grammar focus', icon: 'school', variant: 'teach' },
    commonMistake: { label: 'Common mistake', icon: 'error_outline', variant: 'mistake-note' },
    sentenceBreakdown: { label: 'Sentence breakdown', icon: 'format_quote', variant: 'neutral' },
    usefulTip: { label: 'Useful tip', icon: 'tips_and_updates', variant: 'tip' },
    similarExample: { label: 'Similar example', icon: 'auto_awesome', variant: 'tip' },
    wordFormation: { label: 'Word formation', icon: 'transform', variant: 'teach' }
  };

  function isMobile() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  }

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatBracketMarkers(text) {
    var raw = String(text || '');
    if (!/\[start\d+\]/.test(raw)) return esc(raw);

    var result = '';
    var re = /\[start(\d+)\]([\s\S]*?)\[end\1\]/g;
    var lastIdx = 0;
    var match;
    while ((match = re.exec(raw)) !== null) {
      result += esc(raw.slice(lastIdx, match.index));
      result += '<mark class="sp-snippet-highlight">' + esc(match[2]) + '</mark>';
      lastIdx = match.index + match[0].length;
    }
    result += esc(raw.slice(lastIdx));
    return result.replace(/\[start\d+\]|\[end\d+\]/g, '');
  }

  function formatBody(text) {
    if (!text) return '';
    var withMarkers = formatBracketMarkers(text);
    if (withMarkers !== esc(text)) return withMarkers.replace(/\n/g, '<br>');

    return esc(text)
      .replace(/&lt;mistake&gt;([\s\S]*?)&lt;\/mistake&gt;/g,
        '<mark class="sp-error-mark"><strong>$1</strong></mark>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<mark class="sp-explanation-emphasis">$1</mark>')
      .replace(/\n/g, '<br>');
  }

  function getSectionDefs(opts) {
    if (typeof SunePlayExplanation !== 'undefined' && SunePlayExplanation.SECTION_DEFS) {
      return SunePlayExplanation.SECTION_DEFS;
    }
    return DEFAULT_SECTION_DEFS;
  }

  function normalizeOpts(opts) {
    if (!opts) return null;
    if (opts.sections && opts.sections.length) return opts;

    if (opts.explanation || opts.correctAnswer || opts.context) {
      var sections = [];
      if (opts.correctAnswer) sections.push({ key: 'correct', text: opts.correctAnswer });
      if (opts.explanation) sections.push({ key: 'whyCorrect', text: opts.explanation });
      return Object.assign({}, opts, { sections: sections });
    }
    return null;
  }

  function hasRenderableContent(opts) {
    var normalized = normalizeOpts(opts);
    return !!(normalized && normalized.sections && normalized.sections.length);
  }

  var _inlineRestore = null;
  var _onClose = null;

  function close() {
    var sheet = document.getElementById(SHEET_ID);
    if (sheet) sheet.remove();
    document.body.classList.remove('lesson-explanation-open');
    if (_inlineRestore) {
      _inlineRestore();
      _inlineRestore = null;
    }
    if (_onClose) {
      var callback = _onClose;
      _onClose = null;
      callback();
    }
  }

  function sectionBlockHtml(section, defs, mode) {
    var def = defs[section.key] || { label: section.key, icon: 'info', variant: 'teach' };
    var label = section.label ||
      (section.isWrong && def.wrongLabel ? def.wrongLabel : def.label);
    var icon = section.icon || def.icon;
    var variant = section.variant || def.variant;
    var prefix = mode === 'inline' ? 'sp-explanation-inline-block' : 'sp-explanation-section';
    var labelClass = prefix + '-label' + (mode === 'inline' ? ' sp-explanation-inline-block-label' : '');
    var iconWrap = mode === 'inline'
      ? '<span class="sp-explanation-inline-block-icon material-symbols-outlined" aria-hidden="true">' + icon + '</span>'
      : '<span class="material-symbols-outlined" aria-hidden="true">' + icon + '</span>';
    var bodyClass = mode === 'inline' ? prefix + '-text' : prefix + '-body';

    return '<section class="' + prefix + ' sp-explanation-section--' + esc(variant) + '" data-section="' + esc(section.key) + '">' +
        '<div class="' + labelClass + '">' + iconWrap + esc(label) + '</div>' +
        '<div class="' + bodyClass + '">' + formatBody(section.text) + '</div>' +
      '</section>';
  }

  function structuredBodyHtml(opts, mode) {
    var defs = getSectionDefs(opts);
    var sections = opts.sections || [];
    return sections.map(function(section) {
      return sectionBlockHtml(section, defs, mode);
    }).join('');
  }

  function contextBlockHtml(label, text, variant) {
    if (!text) return '';
    var blockClass = variant === 'question'
      ? 'lesson-explanation-question'
      : 'lesson-explanation-answer';
    var icon = variant === 'question' ? 'quiz' : 'check_circle';
    return '<div class="' + blockClass + '">' +
        '<span class="' + blockClass + '-label">' +
          '<span class="material-symbols-outlined" aria-hidden="true">' + icon + '</span>' +
          esc(label) +
        '</span>' +
        '<p class="' + blockClass + '-text">' + formatBody(text) + '</p>' +
      '</div>';
  }

  function cardContextHtml(text) {
    if (!text) return '';
    return '<div class="sp-explanation-card-context">' +
        '<span class="sp-explanation-card-context-label">' +
          '<span class="material-symbols-outlined" aria-hidden="true">quiz</span>' +
          'Question' +
        '</span>' +
        '<p class="sp-explanation-card-context-text">' + formatBody(text) + '</p>' +
      '</div>';
  }

  function cardStructuredHtml(opts) {
    return '<div class="sp-explanation-sections">' + structuredBodyHtml(opts, 'card') + '</div>';
  }

  function openInline(mountEl, opts) {
    var normalized = normalizeOpts(opts);
    if (!mountEl || !normalized) return;
    close();
    _onClose = opts.onClose || null;

    var contextHtml = normalized.context
      ? contextBlockHtml('Question', normalized.context, 'question')
      : '';

    mountEl.classList.add('sp-explanation-inline-mount');
    if (mountEl.classList.contains('sp-lesson-mount') || mountEl.classList.contains('sp-practice-session')) {
      document.body.classList.add('lesson-explanation-open');
    }

    var overlay = document.createElement('div');
    overlay.className = 'sp-explanation-inline';
    overlay.id = INLINE_OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', normalized.title || 'Explanation');
    overlay.innerHTML =
        '<header class="sp-explanation-inline-header">' +
          '<button type="button" class="sp-explanation-inline-close" aria-label="Close">' +
            '<span class="material-symbols-outlined">close</span>' +
          '</button>' +
          '<span class="sp-explanation-inline-header-icon" aria-hidden="true">' +
            '<span class="material-symbols-outlined">menu_book</span>' +
          '</span>' +
        '</header>' +
        '<div class="sp-explanation-inline-body">' +
          contextHtml +
          '<div class="sp-explanation-sections">' + structuredBodyHtml(normalized, 'inline') + '</div>' +
        '</div>' +
        '<footer class="sp-explanation-inline-footer">' +
          '<button type="button" class="sp-explanation-inline-continue">' +
            esc(opts.continueLabel || 'Continue') +
          '</button>' +
        '</footer>';

    mountEl.appendChild(overlay);

    _inlineRestore = function() {
      var node = mountEl.querySelector('#' + INLINE_OVERLAY_ID);
      if (node) node.remove();
      mountEl.classList.remove('sp-explanation-inline-mount');
    };

    overlay.querySelector('.sp-explanation-inline-close').addEventListener('click', close);
    overlay.querySelector('.sp-explanation-inline-continue').addEventListener('click', close);
  }

  function open(opts) {
    var normalized = normalizeOpts(opts);
    if (!normalized) return;
    if (opts.inlineMount) {
      openInline(opts.inlineMount, normalized);
      return;
    }
    close();
    _onClose = opts.onClose || null;

    var sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'lesson-explanation-sheet' +
      (opts.compact ? ' lesson-explanation-sheet--compact' : '');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Explanation');

    var contextHtml = normalized.context
      ? contextBlockHtml('Question', normalized.context, 'question')
      : '';

    var closeLabel = opts.compact ? 'close' : 'arrow_back';
    var closeAria = opts.compact ? 'Close' : 'Back';

    sheet.innerHTML =
      '<div class="lesson-explanation-sheet-inner">' +
        '<header class="lesson-explanation-header">' +
          '<button type="button" class="lesson-explanation-back" aria-label="' + closeAria + '">' +
            '<span class="material-symbols-outlined">' + closeLabel + '</span>' +
          '</button>' +
          '<span class="lesson-explanation-header-icon" aria-hidden="true">' +
            '<span class="material-symbols-outlined">menu_book</span>' +
          '</span>' +
        '</header>' +
        '<div class="lesson-explanation-body">' +
          contextHtml +
          '<div class="sp-explanation-sections">' + structuredBodyHtml(normalized, 'sheet') + '</div>' +
        '</div>' +
        '<footer class="lesson-explanation-footer">' +
          '<button type="button" class="lesson-explanation-continue">' +
            esc(opts.continueLabel || 'Continue') +
          '</button>' +
        '</footer>' +
      '</div>';

    document.body.appendChild(sheet);
    document.body.classList.add('lesson-explanation-open');

    sheet.querySelector('.lesson-explanation-back').addEventListener('click', close);
    sheet.querySelector('.lesson-explanation-continue').addEventListener('click', close);
    sheet.addEventListener('click', function(e) {
      if (e.target === sheet) close();
    });
  }

  function isOpenInCard(cardEl) {
    return !!(cardEl && cardEl.classList.contains('sp-exercise-card--explanation'));
  }

  function closeInCard(cardEl) {
    if (!cardEl) return;
    var view = cardEl.querySelector('#' + CARD_VIEW_ID);
    if (view) view.remove();
    cardEl.classList.remove('sp-exercise-card--explanation');
    var screen = cardEl.querySelector('.sp-screen');
    if (screen) screen.hidden = false;
  }

  function openInCard(cardEl, opts) {
    var normalized = normalizeOpts(opts);
    if (!cardEl || !normalized) return;
    closeInCard(cardEl);

    var screen = cardEl.querySelector('.sp-screen');
    if (screen) screen.hidden = true;

    var view = document.createElement('div');
    view.className = 'sp-explanation-card-view';
    view.id = CARD_VIEW_ID;
    view.setAttribute('role', 'region');
    view.setAttribute('aria-label', normalized.title || 'Explanation');
    view.innerHTML =
        '<div class="sp-explanation-card-view-inner">' +
          cardContextHtml(normalized.context) +
          cardStructuredHtml(normalized) +
        '</div>';

    cardEl.appendChild(view);
    cardEl.classList.add('sp-exercise-card--explanation');
  }

  function toggleInCard(cardEl, opts) {
    if (isOpenInCard(cardEl)) {
      closeInCard(cardEl);
      return false;
    }
    openInCard(cardEl, opts);
    return true;
  }

  return {
    isMobile: isMobile,
    open: open,
    close: close,
    hasRenderableContent: hasRenderableContent,
    isOpenInCard: isOpenInCard,
    openInCard: openInCard,
    closeInCard: closeInCard,
    toggleInCard: toggleInCard
  };
})();
