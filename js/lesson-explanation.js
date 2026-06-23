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
  }

  function open(opts) {
    if (!opts || !opts.explanation) return;
    close();

    var sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'lesson-explanation-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'lesson-explanation-title');

    var contextHtml = opts.context
      ? '<p class="lesson-explanation-context">' + formatBody(opts.context) + '</p>'
      : '';
    var answerHtml = opts.correctAnswer
      ? '<div class="lesson-explanation-answer">' +
          '<span class="lesson-explanation-answer-label">Correct answer</span>' +
          '<p class="lesson-explanation-answer-text">' + formatBody(opts.correctAnswer) + '</p>' +
        '</div>'
      : '';

    sheet.innerHTML =
      '<div class="lesson-explanation-sheet-inner">' +
        '<header class="lesson-explanation-header">' +
          '<button type="button" class="lesson-explanation-back" aria-label="Back">' +
            '<span class="material-symbols-outlined">arrow_back</span>' +
          '</button>' +
          '<h2 class="lesson-explanation-title" id="lesson-explanation-title">' +
            esc(opts.title || 'Explain my answer') +
          '</h2>' +
        '</header>' +
        '<div class="lesson-explanation-body">' +
          contextHtml +
          answerHtml +
          '<div class="lesson-explanation-card">' +
            '<p class="lesson-explanation-text">' + formatBody(opts.explanation) + '</p>' +
          '</div>' +
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
