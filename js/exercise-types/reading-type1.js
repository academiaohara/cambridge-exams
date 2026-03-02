// js/exercise-types/reading-type1.js
// Multiple choice cloze - Part 1

(function() {
  window.ReadingType1 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (isChecked && userAnswer) {
        const isCorrect = this.isAnswerCorrect(question, userAnswer);
        const answerText = this.getDisplayAnswer(question, userAnswer);
        const colorClass = isCorrect ? 'reading-type1-correct' : 'reading-type1-incorrect';
        const correctText = !isCorrect ? this.getCorrectText(question) : '';
        return `
          <span class="reading-type1-gap">
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word ${colorClass}" ${!isCorrect ? 'title="✓ ' + correctText + '"' : ''}>${answerText}</span>
          </span>
        `;
      }
      
      if (userAnswer) {
        const answerText = this.getDisplayAnswer(question, userAnswer);
        return `
          <span class="reading-type1-gap">
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word reading-type1-purple">${answerText}</span>
          </span>
        `;
      }
      
      return `
        <span class="reading-type1-gap">
          <span class="reading-type1-gap-number">(${qNum})</span>
          <span class="reading-type1-gap-slot" onclick="ReadingType1.openOptions(${qNum})"></span>
        </span>
      `;
    },
    
    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      let optionsHTML = '<div class="modal-header"><p>' + I18n.t('selectOption') + '</p></div>';
      optionsHTML += '<div class="options-grid">';
      
      question.options.forEach(opt => {
        const letter = opt.charAt(0);
        const text = opt.substring(2).trim();
        optionsHTML += `
          <button class="opt-btn" onclick="ReadingType1.selectAnswer(${qNum}, '${letter}', '${text.replace(/'/g, "\\'")}')">
            ${text}
          </button>
        `;
      });
      
      optionsHTML += '</div>';
      body.innerHTML = optionsHTML;
      overlay.style.display = 'flex';
    },
    
    selectAnswer: function(qNum, letter, text) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      
      // Re-render the gap in place
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      const gaps = document.querySelectorAll('.reading-type1-gap');
      gaps.forEach(gap => {
        const numSpan = gap.querySelector('.reading-type1-gap-number');
        if (numSpan && numSpan.textContent.trim() === `(${qNum})`) {
          gap.innerHTML = `
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word reading-type1-purple">${text}</span>
          `;
        }
      });
      
      document.getElementById('exercise-modal-overlay').style.display = 'none';
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
      if (!userAnswer) return '';
      const option = question.options.find(opt => opt.startsWith(userAnswer + ')'));
      return option ? option.substring(2).trim() : '';
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct++;
        
        // Update visual state
        const gaps = document.querySelectorAll('.reading-type1-gap');
        gaps.forEach(gap => {
          const numSpan = gap.querySelector('.reading-type1-gap-number');
          if (numSpan && numSpan.textContent.trim() === `(${q.number})`) {
            const answerText = this.getDisplayAnswer(q, userAnswer) || '_____';
            const colorClass = isCorrect ? 'reading-type1-correct' : 'reading-type1-incorrect';
            const correctText = !isCorrect ? this.getCorrectText(q) : '';
            gap.innerHTML = `
              <span class="reading-type1-gap-number">(${q.number})</span>
              <span class="reading-type1-answered-word ${colorClass}" ${!isCorrect ? 'title="✓ ' + correctText + '"' : ''}>${answerText}</span>
            `;
          }
        });
      });
      
      return correct;
    }
  };
})();
