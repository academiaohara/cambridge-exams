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
        const colorClass = isCorrect ? 'correct' : 'incorrect';
        const correctionHtml = !isCorrect ? `<span class="reading-type3-correction">${question.correct}</span>` : '';
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-word-box">
              <input type="text" class="reading-type3-input gap-input ${colorClass}" data-question="${qNum}" value="${userAnswer || ''}" disabled ${!isCorrect ? 'title="✓ ' + question.correct + '"' : ''}>
              <span class="reading-type3-stem">${question.word}</span>
            </span>
            ${correctionHtml}
          </span>
        `;
      }
      
      return `
        <span class="reading-type3-gap-inline">
          <span class="reading-type3-gap-number">(${qNum})</span>
          <span class="reading-type3-word-box${userAnswer ? ' reading-type3-filled' : ''}">
            <input type="text" class="reading-type3-input gap-input" data-question="${qNum}" value="${userAnswer || ''}" placeholder="..." oninput="ReadingType3.handleInput(${qNum}, this.value)">
            <span class="reading-type3-stem">${question.word}</span>
          </span>
        </span>
      `;
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      const wrap = document.querySelector(`input[data-question="${qNum}"]`)?.closest('.reading-type3-word-box');
      if (wrap) {
        if (value.trim()) {
          wrap.classList.add('reading-type3-filled');
        } else {
          wrap.classList.remove('reading-type3-filled');
        }
      }
      
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
        
        const input = document.querySelector(`.reading-type3-input[data-question="${q.number}"]`);
        if (input) {
          const wrap = input.closest('.reading-type3-word-box');
          const colorClass = isCorrect ? 'correct' : 'incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          if (!isCorrect) {
            input.setAttribute('title', '✓ ' + q.correct);
            const gapInline = input.closest('.reading-type3-gap-inline') || wrap?.parentNode;
            if (gapInline && !gapInline.querySelector('.reading-type3-correction')) {
              const correctionSpan = document.createElement('span');
              correctionSpan.className = 'reading-type3-correction';
              correctionSpan.textContent = q.correct;
              gapInline.appendChild(correctionSpan);
            }
          }
          if (wrap) {
            wrap.classList.remove('reading-type3-filled');
          }
        }
      });
      
      return correct;
    }
  };
})();
