// js/exercise-types/reading-type2.js
// Open cloze - Part 2

(function() {
  window.ReadingType2 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return `
          <span class="reading-type2-gap">
            <span class="reading-type2-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      let inputClass = 'reading-type2-input gap-input';
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        inputClass += isCorrect ? ' correct' : ' incorrect';
      }
      
      return `
        <span class="reading-type2-gap">
          <input type="text" 
                 class="${inputClass}" 
                 data-question="${qNum}" 
                 value="${userAnswer || ''}" 
                 placeholder="..." 
                 ${isChecked ? 'disabled' : ''}
                 oninput="ReadingType2.handleInput(${qNum}, this.value)">
        </span>
      `;
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(userAnswer, correctAnswer) {
      if (!userAnswer) return false;
      if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
        return correctAnswer.split('/').some(ans =>
          userAnswer.trim().toLowerCase() === ans.trim().toLowerCase()
        );
      }
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(userAnswer, q.correct);
        if (isCorrect) correct++;
        
        const input = document.querySelector(`.reading-type2-input[data-question="${q.number}"]`);
        if (input) {
          const colorClass = isCorrect ? 'correct' : 'incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          if (!isCorrect) {
            input.setAttribute('title', '✓ ' + q.correct);
          }
        }
      });
      
      return correct;
    }
  };
})();
