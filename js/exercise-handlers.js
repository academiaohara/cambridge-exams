// js/exercise-handlers.js
(function() {
  window.ExerciseHandlers = {
    handleTextGap: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    handleRadioGap: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    handleSelectGap: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    checkAnswers: function() {
      if (!AppState.currentExercise || !AppState.currentExercise.answers || 
          Object.keys(AppState.currentExercise.answers).length === 0) {
        alert(I18n.t('answerFirst'));
        return;
      }
      
      AppState.answersChecked = true;
      const partConfig = CONFIG.PART_TYPES[
        AppState.currentSection === 'reading' ? AppState.currentPart : 
        `${AppState.currentSection}${AppState.currentPart}`
      ];
      
      let correct = 0;
      const questions = AppState.currentExercise.content.questions || [];
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers[q.number];
        const isCorrect = Utils.compareAnswers(userAnswer, q.correct, partConfig.type);
        if (isCorrect) correct++;
        
        this.markAnswerVisual(q.number, userAnswer, q.correct, isCorrect, partConfig);
      });
      
      Timer.updateScoreDisplay();
      
      const checkBtn = document.querySelector('.btn-check');
      if (checkBtn) checkBtn.disabled = true;
      
      this.disableAllInputs(partConfig);
      
      if (AppState.currentExamId && AppState.currentSection && AppState.currentPart) {
        Exercise.markPartCompleted(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
      }
    },
    
    markAnswerVisual: function(qNum, userAnswer, correctAnswer, isCorrect, partConfig) {
      switch(partConfig.type) {
        case 'multiple-choice':
        case 'cross-text-matching':
        case 'multiple-matching':
          const answerSpan = document.getElementById(`answer-${qNum}`);
          if (answerSpan) {
            const gapBox = answerSpan.closest('.gap-box');
            if (gapBox) {
              gapBox.classList.add('checked');
              gapBox.classList.add(isCorrect ? 'correct' : 'incorrect');
              gapBox.style.pointerEvents = 'none';
              
              if (!isCorrect) {
                const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
                const correctOption = question.options.find(opt => opt.startsWith(correctAnswer));
                const correctText = correctOption ? correctOption.substring(2).trim() : correctAnswer;
                answerSpan.setAttribute('data-correct', `✓ ${correctText}`);
              }
            }
          }
          break;
          
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion':
        case 'transformations':
          const input = document.querySelector(`input[data-question="${qNum}"]`);
          if (input) {
            input.classList.add(isCorrect ? 'correct' : 'incorrect');
            input.disabled = true;
            if (!isCorrect) input.setAttribute('title', `✓ ${correctAnswer}`);
          }
          break;
          
        case 'multiple-choice-text':
          document.querySelectorAll(`input[name="q${qNum}"]`).forEach(radio => radio.disabled = true);
          break;
          
        case 'gapped-text':
          document.querySelector(`select[data-question="${qNum}"]`).disabled = true;
          break;
      }
    },
    
    disableAllInputs: function(partConfig) {
      switch(partConfig.type) {
        case 'multiple-choice':
        case 'cross-text-matching':
        case 'multiple-matching':
          document.querySelectorAll('.gap-box').forEach(box => {
            box.classList.add('checked');
            box.style.pointerEvents = 'none';
          });
          break;
          
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion':
        case 'transformations':
          document.querySelectorAll('input.gap-input').forEach(input => input.disabled = true);
          break;
          
        case 'multiple-choice-text':
          document.querySelectorAll('input[type="radio"]').forEach(radio => radio.disabled = true);
          break;
          
        case 'gapped-text':
          document.querySelectorAll('select.paragraph-select').forEach(select => select.disabled = true);
          break;
      }
    },
    
    toggleExplanations: function() {
      const explanations = document.getElementById('explanations-section');
      if (explanations) {
        explanations.style.display = explanations.style.display === 'none' ? 'block' : 'none';
      }
    },
    
    resetExercise: function() {
      const partConfig = CONFIG.PART_TYPES[
        AppState.currentSection === 'reading' ? AppState.currentPart : 
        `${AppState.currentSection}${AppState.currentPart}`
      ];
      
      this.resetInputsByType(partConfig);
      
      if (AppState.currentExercise) {
        const exampleCorrect = AppState.currentExercise.content?.example?.correct;
        AppState.currentExercise.answers = exampleCorrect ? { '0': exampleCorrect } : {};
      }
      
      if (Timer.timerInterval) clearInterval(Timer.timerInterval);
      AppState.elapsedSeconds = 0;
      AppState.answersChecked = false;
      Timer.startTimer();
      
      Timer.updateTimerColor();
      Timer.updateScoreDisplay();
      
      const checkBtn = document.querySelector('.btn-check');
      if (checkBtn) checkBtn.disabled = false;
    },
    
    resetInputsByType: function(partConfig) {
      switch(partConfig.type) {
        case 'multiple-choice':
        case 'cross-text-matching':
        case 'multiple-matching':
          document.querySelectorAll('.gap-answer').forEach(span => {
            const match = span.textContent.match(/(\d+)\)/);
            if (match) {
              const qNum = match[1];
              if (qNum === '0') {
                const exampleData = AppState.currentExercise.content.example;
                if (exampleData) {
                  let exampleText = exampleData.correct || '_____';
                  if (exampleData.options) {
                    const correctOption = exampleData.options.find(opt => opt.startsWith(exampleData.correct + ')'));
                    exampleText = correctOption ? correctOption.substring(2).trim() : '_____';
                  }
                  span.innerHTML = `<span class="gap-number">0)</span><span class="gap-text">${exampleText}</span>`;
                }
              } else {
                span.innerHTML = `<span class="gap-number">${qNum})</span><span class="gap-dots">.........</span>`;
              }
            }
            span.removeAttribute('data-correct');
          });
          
          document.querySelectorAll('.gap-box').forEach(box => {
            const answerSpan = box.querySelector('.gap-answer');
            const match = answerSpan?.textContent.match(/(\d+)\)/);
            const qNum = match ? match[1] : null;
            if (qNum !== '0') {
              box.classList.remove('answered', 'correct', 'incorrect', 'checked');
              box.style.pointerEvents = 'auto';
            }
          });
          break;
          
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion':
        case 'transformations':
          document.querySelectorAll('input.gap-input').forEach(input => {
            input.value = '';
            input.classList.remove('correct', 'incorrect');
            input.disabled = false;
            input.removeAttribute('title');
          });
          break;
          
        case 'multiple-choice-text':
          document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
            radio.disabled = false;
          });
          break;
          
        case 'gapped-text':
          document.querySelectorAll('select.paragraph-select').forEach(select => {
            select.value = '';
            select.disabled = false;
          });
          break;
      }
    }
  };
})();
