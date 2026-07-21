/**
 * Shared mobile explanation sheet for learning lesson flows.
 * Opens a full-screen readable view instead of cramming text in the feedback bar.
 */
var LessonExplanation = (function() {
  var SHEET_ID = 'lesson-explanation-sheet';
  var INLINE_OVERLAY_ID = 'lesson-explanation-inline';
  var CARD_VIEW_ID = 'sp-explanation-card-view';

  function isMobile() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  }

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatBody(text) {
    if (!text) return '';
    return esc(text)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
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

  function inlineContextBlockHtml(label, text, variant) {
    if (!text) return '';
    var blockClass = variant === 'question'
      ? 'lesson-explanation-question sp-explanation-inline-block'
      : 'lesson-explanation-answer sp-explanation-inline-block';
    var icon = variant === 'question' ? 'quiz' : 'check_circle';
    return '<div class="' + blockClass + '">' +
        '<span class="' + blockClass + '-label sp-explanation-inline-block-label">' +
          '<span class="sp-explanation-inline-block-icon material-symbols-outlined" aria-hidden="true">' +
            icon +
          '</span>' +
          esc(label) +
        '</span>' +
        '<p class="' + blockClass + '-text">' + formatBody(text) + '</p>' +
      '</div>';
  }

  function explanationCardHtml(text) {
    return '<div class="lesson-explanation-card">' +
        '<div class="lesson-explanation-card-label">' +
          '<span class="material-symbols-outlined" aria-hidden="true">lightbulb</span>' +
          'Why' +
        '</div>' +
        '<p class="lesson-explanation-text">' + formatBody(text) + '</p>' +
      '</div>';
  }

  function inlineExplanationCardHtml(text) {
    return '<div class="sp-explanation-inline-card sp-explanation-inline-block">' +
        '<div class="sp-explanation-inline-card-label sp-explanation-inline-block-label">' +
          '<span class="sp-explanation-inline-block-icon sp-explanation-inline-block-icon--why" aria-hidden="true">' +
            '<span class="material-symbols-outlined">lightbulb</span>' +
          '</span>' +
          'Why' +
        '</div>' +
        '<p class="sp-explanation-inline-text">' + formatBody(text) + '</p>' +
      '</div>';
  }

  function openInline(mountEl, opts) {
    if (!mountEl || !opts || !opts.explanation) return;
    close();
    _onClose = opts.onClose || null;

    var contextHtml = inlineContextBlockHtml('Question', opts.context, 'question');
    var answerHtml = inlineContextBlockHtml('Correct answer', opts.correctAnswer);

    mountEl.classList.add('sp-explanation-inline-mount');
    if (mountEl.classList.contains('sp-lesson-mount') || mountEl.classList.contains('sp-practice-session')) {
      document.body.classList.add('lesson-explanation-open');
    }

    var overlay = document.createElement('div');
    overlay.className = 'sp-explanation-inline';
    overlay.id = INLINE_OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', opts.title || 'Explanation');
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
          answerHtml +
          inlineExplanationCardHtml(opts.explanation) +
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
    if (!opts || !opts.explanation) return;
    if (opts.inlineMount) {
      openInline(opts.inlineMount, opts);
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

    var contextHtml = contextBlockHtml('Question', opts.context, 'question');
    var answerHtml = contextBlockHtml('Correct answer', opts.correctAnswer);

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
          answerHtml +
          explanationCardHtml(opts.explanation) +
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

  function cardAnswerHtml(text) {
    if (!text) return '';
    return '<div class="sp-explanation-card-answer">' +
        '<span class="sp-explanation-card-answer-label">' +
          '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span>' +
          'Correct answer' +
        '</span>' +
        '<p class="sp-explanation-card-answer-text">' + formatBody(text) + '</p>' +
      '</div>';
  }

  function cardWhyHtml(text) {
    return '<div class="sp-explanation-card-why">' +
        '<div class="sp-explanation-card-why-header">' +
          '<span class="sp-explanation-card-why-icon" aria-hidden="true">' +
            '<span class="material-symbols-outlined">lightbulb</span>' +
          '</span>' +
          '<span class="sp-explanation-card-why-title">Why</span>' +
        '</div>' +
        '<div class="sp-explanation-card-why-body">' + formatBody(text) + '</div>' +
      '</div>';
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
    if (!cardEl || !opts || !opts.explanation) return;
    closeInCard(cardEl);

    var screen = cardEl.querySelector('.sp-screen');
    if (screen) screen.hidden = true;

    var view = document.createElement('div');
    view.className = 'sp-explanation-card-view';
    view.id = CARD_VIEW_ID;
    view.setAttribute('role', 'region');
    view.setAttribute('aria-label', opts.title || 'Explanation');
    view.innerHTML =
        '<div class="sp-explanation-card-view-inner">' +
          cardContextHtml(opts.context) +
          cardAnswerHtml(opts.correctAnswer) +
          cardWhyHtml(opts.explanation) +
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
    isOpenInCard: isOpenInCard,
    openInCard: openInCard,
    closeInCard: closeInCard,
    toggleInCard: toggleInCard
  };
})();
