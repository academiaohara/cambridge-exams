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
        gapHTML = `<span class="reading-type4-inline-wrap ${colorClass}">` +
          `<input type="text" class="reading-type4-inline-input gap-input ${colorClass}" data-question="${qNum}" value="${userAnswer || ''}" disabled ${!isCorrect ? 'title="✓ ' + question.correct + '"' : ''}>` +
          `</span>`;
      } else {
        gapHTML = `<span class="reading-type4-inline-wrap${userAnswer ? ' reading-type4-purple' : ''}">` +
          `<input type="text" class="reading-type4-inline-input gap-input" data-question="${qNum}" value="${userAnswer || ''}" placeholder="..." oninput="ReadingType4.handleInput(${qNum}, this.value)">` +
          `</span>`;
      }
      
      return `
        <div class="reading-type4-question">
          <div class="reading-type4-number">${qNum}.</div>
          <div class="reading-type4-original">
            ${question.firstSentence}
          </div>
          <div class="reading-type4-keyword-line">
            <span class="reading-type4-keyword">${question.keyWord}</span>
          </div>
          <div class="reading-type4-second">
            ${beforeGap} ${gapHTML} ${afterGap}
          </div>
        </div>
      `;
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      const wrap = document.querySelector(`input[data-question="${qNum}"]`)?.closest('.reading-type4-inline-wrap');
      if (wrap) {
        if (value.trim()) {
          wrap.classList.add('reading-type4-purple');
        } else {
          wrap.classList.remove('reading-type4-purple');
        }
      }
      
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
        
        const input = document.querySelector(`.reading-type4-inline-input[data-question="${q.number}"]`);
        if (input) {
          const wrap = input.closest('.reading-type4-inline-wrap');
          const colorClass = isCorrect ? 'reading-type4-correct' : 'reading-type4-incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          if (!isCorrect) input.setAttribute('title', '✓ ' + q.correct);
          if (wrap) {
            wrap.classList.remove('reading-type4-purple');
            wrap.classList.add(colorClass);
          }
        }
      });
      
      return correct;
    }
  };
})();
