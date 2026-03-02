// js/exercise-types/reading-type4.js
// Key word transformations - Part 4

(function() {
  window.ReadingType4 = {
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      const beforeGap = question.beforeGap || '';
      const afterGap = question.afterGap || '';
      
      let gapHTML = '';
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        const colorClass = isCorrect ? 'reading-type4-correct' : 'reading-type4-incorrect';
        gapHTML = `<span class="reading-type4-answered ${colorClass}" ${!isCorrect ? 'title="✓ ' + question.correct + '"' : ''}>${userAnswer || '_____'}</span>`;
      } else if (userAnswer) {
        gapHTML = `<span class="reading-type4-answered reading-type4-purple" onclick="ReadingType4.openInput(${qNum})">${userAnswer}</span>`;
      } else {
        gapHTML = `<span class="reading-type4-gap-slot" onclick="ReadingType4.openInput(${qNum})"></span>`;
      }
      
      return `
        <div class="reading-type4-question">
          <div class="reading-type4-number">${qNum}.</div>
          <div class="reading-type4-original">
            ${question.firstSentence}
          </div>
          <div class="reading-type4-keyword-row">
            <span class="reading-type4-keyword">${question.keyWord}</span>
            <span class="reading-type4-points">2 pts</span>
          </div>
          <div class="reading-type4-second">
            ${beforeGap} ${gapHTML} ${afterGap}
          </div>
        </div>
      `;
    },
    
    openInput: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question || AppState.answersChecked) return;
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      const currentAnswer = AppState.currentExercise.answers?.[qNum] || '';
      
      body.innerHTML = `
        <div class="modal-header">
          <p>${I18n.t('transformationsDesc') || 'Complete with 3 to 6 words using the keyword'}</p>
        </div>
        <div class="reading-type4-modal-keyword">
          <span class="reading-type4-keyword">${question.keyWord}</span>
        </div>
        <div class="reading-type4-modal-input-wrap">
          <input type="text" 
                 id="reading-type4-modal-input" 
                 class="reading-type4-modal-input" 
                 value="${currentAnswer}" 
                 placeholder="${I18n.t('writeAnswer') || 'Write your answer...'}" 
                 autofocus>
        </div>
        <div class="reading-type4-modal-actions">
          <button class="btn-confirm" onclick="ReadingType4.confirmInput(${qNum})">
            <i class="fas fa-check"></i> ${I18n.t('confirm') || 'Confirm'}
          </button>
        </div>
      `;
      overlay.style.display = 'flex';
      
      setTimeout(() => {
        const input = document.getElementById('reading-type4-modal-input');
        if (input) {
          input.focus();
          input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') ReadingType4.confirmInput(qNum);
          });
        }
      }, 100);
    },
    
    confirmInput: function(qNum) {
      const input = document.getElementById('reading-type4-modal-input');
      if (!input) return;
      
      const value = input.value.trim();
      if (!value) return;
      
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      // Update the gap display
      const questions = document.querySelectorAll('.reading-type4-question');
      questions.forEach(qEl => {
        const numEl = qEl.querySelector('.reading-type4-number');
        if (numEl && numEl.textContent.trim() === `${qNum}.`) {
          const secondEl = qEl.querySelector('.reading-type4-second');
          if (secondEl) {
            const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
            const beforeGap = question.beforeGap || '';
            const afterGap = question.afterGap || '';
            secondEl.innerHTML = `${beforeGap} <span class="reading-type4-answered reading-type4-purple" onclick="ReadingType4.openInput(${qNum})">${value}</span> ${afterGap}`;
          }
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
      const normalize = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedUser = normalize(userAnswer);

      if (Array.isArray(correctAnswer)) {
        return correctAnswer.some(ans => normalizedUser.includes(normalize(ans)));
      }
      if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
        return correctAnswer.split('/').some(ans => normalizedUser.includes(normalize(ans)));
      }
      return normalizedUser.includes(normalize(correctAnswer));
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(userAnswer, q.correct);
        if (isCorrect) correct++;
        
        // Update visual
        const qElements = document.querySelectorAll('.reading-type4-question');
        qElements.forEach(qEl => {
          const numEl = qEl.querySelector('.reading-type4-number');
          if (numEl && numEl.textContent.trim() === `${q.number}.`) {
            const secondEl = qEl.querySelector('.reading-type4-second');
            if (secondEl) {
              const beforeGap = q.beforeGap || '';
              const afterGap = q.afterGap || '';
              const answerText = userAnswer || '_____';
              const colorClass = isCorrect ? 'reading-type4-correct' : 'reading-type4-incorrect';
              secondEl.innerHTML = `${beforeGap} <span class="reading-type4-answered ${colorClass}" ${!isCorrect ? 'title="✓ ' + q.correct + '"' : ''}>${answerText}</span> ${afterGap}`;
            }
          }
        });
      });
      
      return correct;
    }
  };
})();
