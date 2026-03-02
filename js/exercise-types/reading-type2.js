// js/exercise-types/reading-tipe1.js
// Multiple choice cloze - Part 1

(function() {
  window.ReadingTipe1 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      return `
        <span class="reading-tipe1-gap">
          <span class="reading-tipe1-gap-btn ${isChecked ? 'checked' : ''} ${userAnswer ? 'answered' : ''} ${isChecked && userAnswer ? (this.isAnswerCorrect(question, userAnswer) ? 'correct' : 'incorrect') : ''}" 
                onclick="${!isChecked ? 'ReadingTipe1.openOptions(' + qNum + ')' : ''}"
                data-correct="${isChecked && !this.isAnswerCorrect(question, userAnswer) ? '✓ ' + this.getCorrectText(question) : ''}">
            <span class="reading-tipe1-gap-number">${qNum}</span>
            <span class="reading-tipe1-answer">${this.getDisplayAnswer(question, userAnswer)}</span>
          </span>
        </span>
      `;
    },
    
    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      Modal.openCustomModal({
        title: `${I18n.t('question')} ${qNum}`,
        message: I18n.t('selectOption'),
        options: question.options.map(opt => {
          const letter = opt.charAt(0);
          const text = opt.substring(2).trim();
          return {
            text: text,
            value: letter,
            handler: () => {
              this.selectAnswer(qNum, letter, text);
            }
          };
        })
      });
    },
    
    selectAnswer: function(qNum, letter, text) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      
      const gapBtn = document.querySelector(`.reading-tipe1-gap-btn[onclick*="${qNum}"]`);
      if (gapBtn) {
        const answerSpan = gapBtn.querySelector('.reading-tipe1-answer');
        if (answerSpan) answerSpan.textContent = text;
        gapBtn.classList.add('answered');
      }
      
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
      // Lógica específica para reading-tipe1
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
