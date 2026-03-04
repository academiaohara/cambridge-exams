// js/exercise-types/listening-type2.js
// Sentence completion - Listening Part 2

(function() {
  var GAP_MARKER = '______';
  
  window.ListeningType2 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      let inputClass = 'listening-type2-input gap-input';
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        inputClass += isCorrect ? ' correct' : ' incorrect';
      }
      
      return `
        <span class="listening-type2-gap">
          <input type="text"
                 class="${inputClass}"
                 data-question="${qNum}"
                 value="${userAnswer || ''}"
                 placeholder="..."
                 ${isChecked ? 'disabled' : ''}
                 oninput="ListeningType2.handleInput(${qNum}, this.value)">
        </span>
      `;
    },
    
    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;
      
      // If there is no text with (N) markers, render all questions as a list
      if (!exercise.content.text && exercise.content.questions) {
        const container = document.getElementById('selectable-text');
        if (!container) return;
        
        const isChecked = AppState.answersChecked;
        let html = '<div class="listening-type2-sentences">';
        
        exercise.content.questions.forEach(q => {
          const userAnswer = exercise.answers?.[q.number] || '';
          let inputClass = 'listening-type2-input gap-input';
          if (isChecked) {
            inputClass += this.isAnswerCorrect(userAnswer, q.correct) ? ' correct' : ' incorrect';
          }
          
          const inputHtml = `<input type="text" class="${inputClass}" data-question="${q.number}" value="${userAnswer}" placeholder="..." ${isChecked ? 'disabled' : ''} oninput="ListeningType2.handleInput(${q.number}, this.value)">`;
          let questionHtml;
          if (q.question.includes(GAP_MARKER)) {
            questionHtml = q.question.replace(GAP_MARKER, inputHtml);
          } else {
            const numberPattern = new RegExp('\\(' + q.number + '\\)');
            questionHtml = q.question.replace(numberPattern, `(${q.number}) ` + inputHtml);
          }
          
          html += `
            <div class="listening-type2-sentence">
              ${questionHtml}
            </div>
          `;
        });
        
        html += '</div>';
        
        const noteCreator = container.querySelector('#note-creator');
        const wrapper = document.createElement('div');
        wrapper.className = 'listening-type2-questions-wrapper';
        wrapper.innerHTML = html;
        container.insertBefore(wrapper, noteCreator);
      }
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
