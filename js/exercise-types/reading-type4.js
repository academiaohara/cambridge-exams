// js/exercise-types/reading-tipe4.js
// Key word transformations - Part 4

(function() {
  window.ReadingTipe4 = {
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      let inputClass = 'reading-tipe4-input';
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        inputClass += isCorrect ? ' correct' : ' incorrect';
      }
      
      return `
        <div class="reading-tipe4-question">
          <div class="reading-tipe4-sentence">
            ${question.firstSentence}
          </div>
          <div class="reading-tipe4-keyword">
            ${question.keyWord}
          </div>
          <div class="reading-tipe4-transformation">
            <div class="reading-tipe4-gap-container">
              <div class="reading-tipe4-gap">
                <input type="text" 
                       class="${inputClass}" 
                       data-question="${qNum}" 
                       value="${userAnswer || ''}" 
                       placeholder="${I18n.t('writeAnswer')}" 
                       ${isChecked ? 'disabled' : ''}
                       oninput="ReadingTipe4.handleInput(${qNum}, this.value)">
              </div>
              <div class="reading-tipe4-word-limit">
                <i class="fas fa-key"></i> ${I18n.t('useKeyword')}
              </div>
            </div>
            <div class="reading-tipe4-second-sentence">
              ${question.secondSentence}
            </div>
          </div>
        </div>
      `;
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(userAnswer, correctAnswer) {
      if (!userAnswer) return false;
      
      if (Array.isArray(correctAnswer)) {
        return correctAnswer.some(ans => 
          userAnswer.toLowerCase().includes(ans.toLowerCase())
        );
      }
      return userAnswer.toLowerCase().includes(correctAnswer.toLowerCase());
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
