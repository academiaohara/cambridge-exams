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
      
      let selectClass = 'reading-type7-select paragraph-select';
      if (isChecked) {
        selectClass += this.isAnswerCorrect(question, userAnswer) ? ' correct' : ' incorrect';
      }
      
      let optionsHTML = `<option value="">-- ${I18n.t('selectOption')} --</option>`;
      options.forEach(key => {
        const selected = userAnswer === key ? 'selected' : '';
        optionsHTML += `<option value="${key}" ${selected}>${key}</option>`;
      });
      
      return `
        <span class="reading-type7-gap">
          <select class="${selectClass}" data-question="${qNum}"
                  ${isChecked ? 'disabled' : ''}
                  onchange="ReadingType7.handleSelect(${qNum}, this.value)">
            ${optionsHTML}
          </select>
        </span>
      `;
    },
    
    handleSelect: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
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
