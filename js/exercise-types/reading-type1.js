// js/exercise-types/reading-type1.js
// Multiple choice cloze - Part 1

(function() {
  window.ReadingType1 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      let btnClass = 'reading-type1-gap-btn';
      if (isChecked) btnClass += ' checked';
      if (userAnswer) btnClass += ' answered';
      if (isChecked && userAnswer) {
        btnClass += this.isAnswerCorrect(question, userAnswer) ? ' correct' : ' incorrect';
      }
      
      return `
        <span class="reading-type1-gap">
          <span class="${btnClass}" 
                onclick="${!isChecked ? 'ReadingType1.openOptions(' + qNum + ')' : ''}"
                data-correct="${isChecked && !this.isAnswerCorrect(question, userAnswer) ? '✓ ' + this.getCorrectText(question) : ''}">
            <span class="reading-type1-gap-number">${qNum}</span>
            <span class="reading-type1-answer">${this.getDisplayAnswer(question, userAnswer)}</span>
          </span>
        </span>
      `;
    },
    
    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      // Crear modal personalizado
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      let optionsHTML = '<div class="modal-header"><h3>' + I18n.t('question') + ' ' + qNum + '</h3><p>' + I18n.t('selectOption') + '</p></div>';
      optionsHTML += '<div class="options-grid">';
      
      question.options.forEach(opt => {
        const letter = opt.charAt(0);
        const text = opt.substring(2).trim();
        optionsHTML += `
          <button class="opt-btn" onclick="ReadingType1.selectAnswer(${qNum}, '${letter}', '${text.replace(/'/g, "\\'")}')">
            ${text}
          </button>
        `;
      });
      
      optionsHTML += '</div>';
      body.innerHTML = optionsHTML;
      overlay.style.display = 'flex';
    },
    
    selectAnswer: function(qNum, letter, text) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      
      const gapBtn = document.querySelector(`.reading-type1-gap-btn[onclick*="ReadingType1.openOptions(${qNum})"]`);
      if (gapBtn) {
        const answerSpan = gapBtn.querySelector('.reading-type1-answer');
        if (answerSpan) answerSpan.textContent = text;
        gapBtn.classList.add('answered');
      }
      
      // Cerrar modal
      document.getElementById('exercise-modal-overlay').style.display = 'none';
      
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },
    
    getCorrectText: function(question) {
      const correctOption = question.options.find(opt => opt.startsWith(question.correct + ')'));
      return correctOption ? correctOption.substring(2).trim() : question.correct;
    },
    
    getDisplayAnswer: function(question, userAnswer) {
      if (!userAnswer) return '_____';
      const option = question.options.find(opt => opt.startsWith(userAnswer + ')'));
      return option ? option.substring(2).trim() : '_____';
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
