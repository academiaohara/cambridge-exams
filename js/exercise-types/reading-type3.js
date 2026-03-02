// js/exercise-types/reading-type3.js
// Word formation - Part 3

(function() {
  window.ReadingType3 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered reading-type3-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        const colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered ${colorClass}" ${!isCorrect ? 'title="✓ ' + question.correct + '"' : ''}>${userAnswer || '_____'}</span>
          </span>
        `;
      }
      
      if (userAnswer) {
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered reading-type3-purple" onclick="ReadingType3.openInput(${qNum})">${userAnswer}</span>
          </span>
        `;
      }
      
      return `
        <span class="reading-type3-gap-inline">
          <span class="reading-type3-gap-number">(${qNum})</span>
          <span class="reading-type3-gap-slot" onclick="ReadingType3.openInput(${qNum})"></span>
        </span>
      `;
    },
    
    openInput: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      const currentAnswer = AppState.currentExercise.answers?.[qNum] || '';
      
      body.innerHTML = `
        <div class="modal-header">
          <p>${I18n.t('wordFormationDesc') || 'Write the correct form of the word'}</p>
        </div>
        <div class="reading-type3-modal-word">
          <span class="reading-type3-stem-label">${question.word}</span>
        </div>
        <div class="reading-type3-modal-input-wrap">
          <input type="text" 
                 id="reading-type3-modal-input" 
                 class="reading-type3-modal-input" 
                 value="${currentAnswer}" 
                 placeholder="..." 
                 autofocus>
        </div>
        <div class="reading-type3-modal-actions">
          <button class="btn-confirm" onclick="ReadingType3.confirmInput(${qNum})">
            <i class="fas fa-check"></i> ${I18n.t('confirm') || 'Confirm'}
          </button>
        </div>
      `;
      overlay.style.display = 'flex';
      
      setTimeout(() => {
        const input = document.getElementById('reading-type3-modal-input');
        if (input) {
          input.focus();
          input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') ReadingType3.confirmInput(qNum);
          });
        }
      }, 100);
    },
    
    confirmInput: function(qNum) {
      const input = document.getElementById('reading-type3-modal-input');
      if (!input) return;
      
      const value = input.value.trim();
      if (!value) return;
      
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      // Update the gap display
      const gaps = document.querySelectorAll('.reading-type3-gap-inline');
      gaps.forEach(gap => {
        const numSpan = gap.querySelector('.reading-type3-gap-number');
        if (numSpan && numSpan.textContent.trim() === `(${qNum})`) {
          gap.innerHTML = `
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered reading-type3-purple" onclick="ReadingType3.openInput(${qNum})">${value}</span>
          `;
        }
      });
      
      document.getElementById('exercise-modal-overlay').style.display = 'none';
      Timer.updateScoreDisplay();
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
        const isCorrect = this.isAnswerCorrect(userAnswer, q.correct);
        if (isCorrect) correct++;
        
        // Update visual
        const gaps = document.querySelectorAll('.reading-type3-gap-inline');
        gaps.forEach(gap => {
          const numSpan = gap.querySelector('.reading-type3-gap-number');
          if (numSpan && numSpan.textContent.trim() === `(${q.number})`) {
            const answerText = userAnswer || '_____';
            const colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
            gap.innerHTML = `
              <span class="reading-type3-gap-number">(${q.number})</span>
              <span class="reading-type3-answered ${colorClass}" ${!isCorrect ? 'title="✓ ' + q.correct + '"' : ''}>${answerText}</span>
            `;
          }
        });
      });
      
      return correct;
    }
  };
})();
