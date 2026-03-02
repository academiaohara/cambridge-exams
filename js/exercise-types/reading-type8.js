// js/exercise-types/reading-type8.js
// Multiple matching - Part 8

(function() {
  window.ReadingType8 = {
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      const btnClass = 'gap-box' +
        (userAnswer ? ' answered' : '') +
        (isChecked ? ' checked' : '') +
        (isChecked && userAnswer ? (this.isAnswerCorrect(question, userAnswer) ? ' correct' : ' incorrect') : '');
      
      const displayText = userAnswer || '.........';
      const correctAttr = isChecked && !this.isAnswerCorrect(question, userAnswer)
        ? `data-correct="✓ ${question.correct}"` : '';
      
      return `
        <span class="gap-container">
          <span class="${btnClass}" ${correctAttr}
                onclick="${!isChecked ? 'ReadingType8.openOptions(' + qNum + ')' : ''}"
                style="${isChecked ? 'pointer-events: none;' : ''}">
            <span class="gap-answer" id="answer-${qNum}">
              <span class="gap-number">${qNum})</span>
              <span class="gap-text">${displayText}</span>
            </span>
          </span>
        </span>
      `;
    },
    
    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      const texts = AppState.currentExercise.content.texts || {};
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      let html = `<div class="modal-header"><h3>${I18n.t('question')} ${qNum}</h3><p>${I18n.t('selectOption')}</p></div>`;
      html += '<div class="options-grid">';
      
      Object.keys(texts).forEach(key => {
        html += `
          <button class="opt-btn" onclick="ReadingType8.selectAnswer(${qNum}, '${key}')">
            ${key}
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
        answerSpan.innerHTML = `<span class="gap-number">${qNum})</span> <span class="gap-text">${letter}</span>`;
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
        if (this.isAnswerCorrect(q, userAnswer)) correct++;
      });
      
      return correct;
    }
  };
})();
