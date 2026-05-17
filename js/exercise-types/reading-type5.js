// js/exercise-types/reading-type5.js
// Multiple choice text - Part 5

(function() {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sourceCardLabel(format) {
    var f = (format || '').toString();
    if (f === 'notice') return 'Notice';
    if (f === 'text_message') return 'Message';
    if (f === 'advert') return 'Advert';
    if (f === 'email') return 'Email';
    return 'Text';
  }

  window.ReadingType5 = {
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      const notice = question.notice;
      const hasLegacyNotice = notice != null && String(notice).trim() !== '';
      const heading = question.heading;
      const bodyText = question.text;
      const hasPassage =
        (heading != null && String(heading).trim() !== '') ||
        (bodyText != null && String(bodyText).trim() !== '');
      const showSourceCard = hasLegacyNotice || hasPassage;
      const questionBlock = `
        <div class="reading-type5-question">
          <div class="reading-type5-question-header">
            <div class="reading-type5-question-number">${qNum}</div>
            <div class="reading-type5-question-text">${question.question}</div>
          </div>
          <div class="reading-type5-options">
            ${this.renderOptions(question, qNum, isChecked, userAnswer)}
          </div>
        </div>
      `;
      if (!showSourceCard) {
        return questionBlock;
      }
      var label = 'Notice';
      var innerBody = '';
      if (hasLegacyNotice) {
        innerBody = '<div class="reading-type5-notice-text">' + notice + '</div>';
      } else {
        label = sourceCardLabel(question.format);
        var hBlock =
          heading != null && String(heading).trim() !== ''
            ? '<div class="reading-type5-passage-heading">' + escapeHtml(heading) + '</div>'
            : '';
        var tBlock =
          bodyText != null && String(bodyText).trim() !== ''
            ? '<div class="reading-type5-passage-body">' + escapeHtml(bodyText) + '</div>'
            : '';
        innerBody = hBlock + tBlock;
      }
      return `
        <div class="reading-type5-with-notice">
          <aside class="reading-type5-notice-card" aria-label="${escapeHtml(label)}">
            <div class="reading-type5-notice-label">${escapeHtml(label)}</div>
            ${innerBody}
          </aside>
          ${questionBlock}
        </div>
      `;
    },
    
    renderOptions: function(question, qNum, isChecked, userAnswer) {
      let html = '';
      const options = question.options || ['A', 'B', 'C', 'D'];
      options.forEach(opt => {
        const letter = opt.charAt(0);
        const checked = userAnswer === letter ? 'checked' : '';
        const labelClass = isChecked
          ? (letter === question.correct ? 'correct' : (userAnswer === letter ? 'incorrect' : ''))
          : '';
        
        html += `
          <label class="reading-type5-option ${labelClass} ${isChecked ? 'disabled' : ''}">
            <input type="radio" name="q${qNum}" value="${letter}" ${checked} ${isChecked ? 'disabled' : ''}
                   onchange="ReadingType5.selectAnswer(${qNum}, '${letter}')">
            <span>${opt}</span>
          </label>
        `;
      });
      return html;
    },
    
    selectAnswer: function(qNum, letter) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      Timer.updateScoreDisplay();
    },
    
    initListeners: function() {
      // Radio options use inline onchange handlers; no extra binding needed
    },
    
    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct += (AppState.currentExercise && AppState.currentExercise._b1PetScoring) ? 1 : 2;
        
        // Mark visual feedback on options
        document.querySelectorAll(`input[name="q${q.number}"]`).forEach(radio => {
          const label = radio.closest('.reading-type5-option');
          if (!label) return;
          radio.disabled = true;
          label.classList.add('disabled');
          if (radio.value === q.correct) {
            label.classList.add('correct');
          } else if (radio.value === userAnswer && !isCorrect) {
            label.classList.add('incorrect');
          }
        });
      });
      
      return correct;
    }
  };
})();
