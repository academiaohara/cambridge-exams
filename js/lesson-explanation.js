/**
 * Shared mobile explanation sheet for learning lesson flows.
 * Opens a full-screen readable view instead of cramming text in the feedback bar.
 */
var LessonExplanation = (function() {
  var SHEET_ID = 'lesson-explanation-sheet';

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

  function close() {
    var sheet = document.getElementById(SHEET_ID);
    if (sheet) sheet.remove();
    document.body.classList.remove('lesson-explanation-open');
    if (_inlineRestore) {
      _inlineRestore();
      _inlineRestore = null;
    }
  }

  var _inlineRestore = null;

  function captureFormState(mountEl) {
    var fields = [];
    if (!mountEl) return fields;
    mountEl.querySelectorAll('input, textarea').forEach(function(el, idx) {
      fields.push({
        id: el.id || '',
        idx: idx,
        value: el.value
      });
    });
    return fields;
  }

  function restoreFormState(mountEl, fields) {
    if (!mountEl || !fields || !fields.length) return;
    var inputs = mountEl.querySelectorAll('input, textarea');
    fields.forEach(function(field) {
      var el = field.id ? mountEl.querySelector('#' + field.id) : inputs[field.idx];
      if (el) el.value = field.value;
    });
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

  function explanationCardHtml(text) {
    return '<div class="lesson-explanation-card">' +
        '<div class="lesson-explanation-card-label">' +
          '<span class="material-symbols-outlined" aria-hidden="true">lightbulb</span>' +
          'Why' +
        '</div>' +
        '<p class="lesson-explanation-text">' + formatBody(text) + '</p>' +
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

    var previousHtml = mountEl.innerHTML;
    var previousClass = mountEl.className;
    var formState = captureFormState(mountEl);
    _inlineRestore = function() {
      mountEl.innerHTML = previousHtml;
      mountEl.className = previousClass;
      restoreFormState(mountEl, formState);
    };

    var contextHtml = inlineContextBlockHtml('Question', opts.context, 'question');
    var answerHtml = inlineContextBlockHtml('Correct answer', opts.correctAnswer);

    mountEl.className = (mountEl.className ? mountEl.className + ' ' : '') + 'sp-explanation-inline-mount';
    if (mountEl.classList.contains('sp-lesson-mount')) {
      document.body.classList.add('lesson-explanation-open');
    }
    mountEl.innerHTML =
      '<div class="sp-explanation-inline" role="dialog" aria-labelledby="sp-explanation-inline-title">' +
        '<header class="sp-explanation-inline-header">' +
          '<button type="button" class="sp-explanation-inline-close" aria-label="Close">' +
            '<span class="material-symbols-outlined">close</span>' +
          '</button>' +
          '<div class="sp-explanation-inline-header-main">' +
            '<span class="sp-explanation-inline-hero" aria-hidden="true">' +
              '<span class="material-symbols-outlined">menu_book</span>' +
            '</span>' +
            '<h2 class="sp-explanation-inline-title" id="sp-explanation-inline-title">' +
              esc(opts.title || 'Explanation') +
            '</h2>' +
          '</div>' +
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
        '</footer>' +
      '</div>';

    mountEl.querySelector('.sp-explanation-inline-close').addEventListener('click', close);
    mountEl.querySelector('.sp-explanation-inline-continue').addEventListener('click', close);
  }

  function open(opts) {
    if (!opts || !opts.explanation) return;
    if (opts.inlineMount) {
      openInline(opts.inlineMount, opts);
      return;
    }
    close();

    var sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'lesson-explanation-sheet' +
      (opts.compact ? ' lesson-explanation-sheet--compact' : '');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'lesson-explanation-title');

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
          '<h2 class="lesson-explanation-title" id="lesson-explanation-title">' +
            esc(opts.title || 'Explain my answer') +
          '</h2>' +
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

  return {
    isMobile: isMobile,
    open: open,
    close: close
  };
})();
