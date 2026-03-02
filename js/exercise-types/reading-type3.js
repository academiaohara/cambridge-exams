// js/exercise-types/reading-type3.js
// Word formation - Part 3

(function() {
  window.ReadingType3 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      let inputClass = 'reading-type3-input gap-input';
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        inputClass += isCorrect ? ' correct' : ' incorrect';
      }
      
      return `
        <span class="reading-type3-word-box">
          <span class="reading-type3-stem">${question.word}</span>
          <input type="text" 
                 class="${inputClass}" 
                 data-question="${qNum}" 
                 value="${userAnswer || ''}" 
                 placeholder="..." 
                 ${isChecked ? 'disabled' : ''}
                 oninput="ReadingType3.handleInput(${qNum}, this.value)">
          ${question.hint ? `<span class="reading-type3-hint">${question.hint}</span>` : ''}
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
      return userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        if (this.isAnswerCorrect(userAnswer, q.correct)) correct++;
      });
      
      return correct;
    }
  };
})();
