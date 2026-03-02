// js/exercise-types/reading-type5.js
// Multiple choice text - Part 5

(function() {
  window.ReadingType5 = {
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      return `
        <div class="reading-type5-question">
          <div class="reading-type5-question-number">${qNum}</div>
          <div class="reading-type5-question-text">${question.question}</div>
          <div class="reading-type5-options">
            ${this.renderOptions(question, qNum, isChecked, userAnswer)}
          </div>
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
        if (this.isAnswerCorrect(q, userAnswer)) correct++;
      });
      
      return correct;
    }
  };
})();
