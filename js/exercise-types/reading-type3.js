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
      if (isChecked && userAnswer) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        const colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered-word ${colorClass}" ${!isCorrect ? 'title="✓ ' + question.correct + '"' : ''}>${userAnswer}</span>
          </span>
        `;
      }
      
      if (userAnswer) {
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered-word reading-type3-purple" onclick="ReadingType3.openModal(${qNum})">${userAnswer}</span>
          </span>
        `;
      }
      
      return `
        <span class="reading-type3-gap-inline">
          <span class="reading-type3-gap-number">(${qNum})</span>
          <span class="reading-type3-gap-slot" onclick="ReadingType3.openModal(${qNum})"></span>
        </span>
      `;
    },
    
    openModal: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      const currentAnswer = AppState.currentExercise.answers?.[qNum] || '';
      
      let html = '<div class="modal-header"><p>' + I18n.t('question') + ' ' + qNum + '</p></div>';
      html += '<div class="reading-type3-modal-word" style="text-align:left;">';
      html += '<span class="reading-type3-stem-label">' + question.word + '</span>';
      html += '</div>';
      html += '<div class="reading-type3-modal-input-wrap">';
      html += '<input type="text" class="reading-type3-modal-input" id="type3-modal-input" value="' + currentAnswer + '" placeholder="..." autofocus>';
      html += '</div>';
      html += '<div class="reading-type3-modal-actions">';
      html += '<button class="opt-btn" onclick="ReadingType3.submitAnswer(' + qNum + ')">' + I18n.t('confirm') + '</button>';
      html += '</div>';
      
      body.innerHTML = html;
      overlay.style.display = 'flex';
      
      setTimeout(function() {
        var inp = document.getElementById('type3-modal-input');
        if (inp) {
          inp.focus();
          inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              ReadingType3.submitAnswer(qNum);
            }
          });
        }
      }, 100);
    },
    
    submitAnswer: function(qNum) {
      var inp = document.getElementById('type3-modal-input');
      var value = inp ? inp.value : '';
      
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      // Update the gap in place
      var question = AppState.currentExercise.content.questions.find(function(q) { return q.number === qNum; });
      var gaps = document.querySelectorAll('.reading-type3-gap-inline');
      gaps.forEach(function(gap) {
        var numSpan = gap.querySelector('.reading-type3-gap-number');
        if (numSpan && numSpan.textContent.trim() === '(' + qNum + ')') {
          if (value.trim()) {
            gap.innerHTML = '<span class="reading-type3-gap-number">(' + qNum + ')</span>' +
              '<span class="reading-type3-answered-word reading-type3-purple" onclick="ReadingType3.openModal(' + qNum + ')">' + value + '</span>';
          } else {
            gap.innerHTML = '<span class="reading-type3-gap-number">(' + qNum + ')</span>' +
              '<span class="reading-type3-gap-slot" onclick="ReadingType3.openModal(' + qNum + ')"></span>';
          }
        }
      });
      
      document.getElementById('exercise-modal-overlay').style.display = 'none';
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
        
        // Update visual state
        const gaps = document.querySelectorAll('.reading-type3-gap-inline');
        gaps.forEach(gap => {
          const numSpan = gap.querySelector('.reading-type3-gap-number');
          if (numSpan && numSpan.textContent.trim() === `(${q.number})`) {
            const answerText = userAnswer || '_____';
            const colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
            gap.innerHTML = `
              <span class="reading-type3-gap-number">(${q.number})</span>
              <span class="reading-type3-answered-word ${colorClass}" ${!isCorrect ? 'title="✓ ' + q.correct + '"' : ''}>${answerText}</span>
            `;
          }
        });
      });
      
      return correct;
    }
  };
})();
