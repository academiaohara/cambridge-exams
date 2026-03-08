// js/exercise-types/reading-type6.js
// Cross-text multiple matching - Part 6

(function() {
  window.ReadingType6 = {
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      const btnClass = 'gap-box gap-box-small' +
        (userAnswer ? ' answered' : '') +
        (isChecked ? ' checked' : '') +
        (isChecked && userAnswer ? (this.isAnswerCorrect(question, userAnswer) ? ' correct' : ' incorrect') : '');
      
      const displayText = userAnswer || '.........';
      const correctAttr = isChecked && !this.isAnswerCorrect(question, userAnswer)
        ? `data-correct="✓ ${question.correct}"` : '';
      
      return `
        <span class="gap-container">
          <span class="gap-number-outside">${qNum})</span>
          <span class="${btnClass}" ${correctAttr}
                onclick="${!isChecked ? 'ReadingType6.openOptions(' + qNum + ')' : ''}">
            <span class="gap-answer" id="answer-${qNum}">
              <span class="gap-text">${displayText}</span>
            </span>
          </span>
        </span>
      `;
    },
    
    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      // Close tools panel when modal opens
      if (window.Tools) Tools.closeSidebar();
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      let html = `<div class="modal-header"><h3>${I18n.t('question')} ${qNum}</h3><p>${I18n.t('selectOption')}</p></div>`;
      html += '<div class="options-grid">';
      
      question.options.forEach(opt => {
        html += `
          <button class="opt-btn" onclick="ReadingType6.selectAnswer(${qNum}, '${opt}')">
            ${opt}
          </button>
        `;
      });
      
      html += '</div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },
    
    selectAnswer: function(qNum, letter) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      
      const answerSpan = document.getElementById(`answer-${qNum}`);
      if (answerSpan) {
        answerSpan.innerHTML = `<span class="gap-text">${letter}</span>`;
        const gapBox = answerSpan.closest('.gap-box');
        if (gapBox) gapBox.classList.add('answered');
      }
      
      document.getElementById('exercise-modal-overlay').style.display = 'none';
      Timer.updateScoreDisplay();
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
        if (isCorrect) correct += 2;
        
        // Visual feedback
        const answerSpan = document.getElementById(`answer-${q.number}`);
        if (answerSpan) {
          const gapBox = answerSpan.closest('.gap-box');
          if (gapBox) {
            gapBox.classList.add('checked');
            gapBox.classList.add(isCorrect ? 'correct' : 'incorrect');
            
            if (!isCorrect) {
              gapBox.setAttribute('data-correct', `✓ ${q.correct}`);
            }
          }
        }
      });
      
      return correct;
    }
  };
})();
