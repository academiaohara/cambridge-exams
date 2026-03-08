// js/exercise-types/reading-type7.js
// Gapped text - Part 7

(function() {
  window.ReadingType7 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return `
          <span class="reading-type7-gap">
            <span class="reading-type7-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      const paragraphs = AppState.currentExercise.content.paragraphs || {};
      const options = Object.keys(paragraphs);
      
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(question, userAnswer);
        const chosenText = userAnswer ? (paragraphs[userAnswer] || '') : '';
        const correctText = paragraphs[question.correct] || '';
        const blockClass = isCorrect ? 'reading-type7-answer-block correct' : 'reading-type7-answer-block incorrect';
        const dataAttr = !isCorrect ? ` data-correct="${question.correct}"` : '';
        const labelBg = isCorrect ? '#10b981' : '#ef4444';
        let html = `<span class="reading-type7-gap" data-qnum="${qNum}">`;
        html += `<span class="reading-type7-gap-number">(${qNum})</span>`;
        html += `<span class="${blockClass}"${dataAttr}>`;
        if (userAnswer) {
          html += `<span class="reading-type7-para-letter" style="background:${labelBg}">${userAnswer}</span>`;
          html += `<span class="reading-type7-para-text">${this._escapeHtml(chosenText)}</span>`;
        } else {
          html += `<span class="reading-type7-para-empty">${I18n.t('noAnswer') || '—'}</span>`;
        }
        if (!isCorrect) {
          html += `<span class="reading-type7-correct-label"><span class="reading-type7-para-letter" style="background:#10b981">${question.correct}</span><span class="reading-type7-para-text reading-type7-correct-text">${this._escapeHtml(correctText)}</span></span>`;
        }
        html += '</span></span>';
        return html;
      }
      
      if (userAnswer) {
        const paraText = paragraphs[userAnswer] || '';
        return `
          <span class="reading-type7-gap" data-qnum="${qNum}">
            <span class="reading-type7-gap-number">(${qNum})</span>
            <span class="reading-type7-answer-block filled" onclick="ReadingType7.openSelectModal(${qNum})">
              <span class="reading-type7-para-letter">${userAnswer}</span>
              <span class="reading-type7-para-text">${this._escapeHtml(paraText)}</span>
            </span>
          </span>
        `;
      }
      
      let optionsHTML = `<option value="">-- ${I18n.t('selectOption')} --</option>`;
      options.forEach(key => {
        optionsHTML += `<option value="${key}">${key}</option>`;
      });
      
      return `
        <span class="reading-type7-gap" data-qnum="${qNum}">
          <span class="reading-type7-gap-number">(${qNum})</span>
          <select class="reading-type7-select paragraph-select" data-question="${qNum}"
                  onchange="ReadingType7.handleSelect(${qNum}, this.value)">
            ${optionsHTML}
          </select>
        </span>
      `;
    },
    
    openSelectModal: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      if (window.Tools) Tools.closeSidebar();
      // Use the question nav to re-select
      QuestionNav.openQuestion(qNum);
    },
    
    handleSelect: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      // Update the gap display in place
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      const gap = document.querySelector(`.reading-type7-gap[data-qnum="${qNum}"]`);
      if (gap && question) {
        const isChecked = AppState.answersChecked;
        gap.outerHTML = ReadingType7.renderGap(question, qNum, isChecked, value);
      }
      
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },
    
    _escapeHtml: function(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct++;
        
        // Update gap display to show paragraph text with correct/incorrect styling
        const gap = document.querySelector(`.reading-type7-gap[data-qnum="${q.number}"]`);
        if (gap) {
          gap.outerHTML = ReadingType7.renderGap(q, q.number, true, userAnswer || '');
        } else {
          // Fallback: find by select element
          const select = document.querySelector(`select[data-question="${q.number}"]`);
          if (select) {
            const parentGap = select.closest('.reading-type7-gap');
            if (parentGap) {
              parentGap.outerHTML = ReadingType7.renderGap(q, q.number, true, userAnswer || '');
            }
          }
        }
      });
      
      return correct;
    }
  };
})();
