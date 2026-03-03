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
        const partConfig = CONFIG.PART_TYPES[
          AppState.currentSection === 'reading' ? AppState.currentPart :
          `${AppState.currentSection}${AppState.currentPart}`
        ];
        const skipCheck = ['essay', 'choice', 'interview', 'long-turn', 'collaborative', 'discussion'];
        if (!partConfig || !skipCheck.includes(partConfig.type)) {
          alert(I18n.t('answerFirst'));
          return;
        }
      }
      
      AppState.answersChecked = true;
      const partConfig = CONFIG.PART_TYPES[
        AppState.currentSection === 'reading' ? AppState.currentPart : 
        `${AppState.currentSection}${AppState.currentPart}`
      ];
      
      let correct = 0;
      const questions = AppState.currentExercise.content.questions || [];
      
      // Usar el método específico del tipo si existe
      const typeChecker = this.getTypeChecker(partConfig.type);
      if (typeChecker && typeof typeChecker.checkAnswers === 'function') {
        correct = typeChecker.checkAnswers();
      } else {
        // Fallback al método genérico
        questions.forEach(q => {
          const userAnswer = AppState.currentExercise.answers[q.number];
          const isCorrect = Utils.compareAnswers(userAnswer, q.correct, partConfig.type);
          if (isCorrect) correct++;
          
          this.markAnswerVisual(q.number, userAnswer, q.correct, isCorrect, partConfig);
        });
      }
      
      Timer.updateScoreDisplay();
      
      const checkBtn = document.querySelector('.btn-check');
      if (checkBtn) checkBtn.disabled = true;
      
      this.disableAllInputs(partConfig);
      
      if (AppState.currentExamId && AppState.currentSection && AppState.currentPart) {
        Exercise.markPartCompleted(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
      }
    },
    
    getTypeChecker: function(type) {
      const typeMap = {
        'multiple-choice': window.ReadingType1,
        'open-cloze': window.ReadingType2,
        'word-formation': window.ReadingType3,
        'transformations': window.ReadingType4,
        'multiple-choice-text': AppState.currentSection === 'listening' ? window.ListeningType1 : window.ReadingType5,
        'sentence-completion': window.ListeningType2,
        'cross-text-matching': window.ReadingType6,
        'gapped-text': window.ReadingType7,
        'multiple-matching': window.ReadingType8,
        'dual-matching': window.ListeningType4
      };
      return typeMap[type];
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
          // New reading-type1 design uses onclick attributes, remove them
          document.querySelectorAll('.reading-type1-gap-slot').forEach(slot => {
            slot.style.pointerEvents = 'none';
          });
          document.querySelectorAll('.gap-box').forEach(box => {
            box.classList.add('checked');
            box.style.pointerEvents = 'none';
          });
          break;

        case 'cross-text-matching':
        case 'multiple-matching':
          document.querySelectorAll('.gap-box').forEach(box => {
            box.classList.add('checked');
            box.style.pointerEvents = 'none';
          });
          break;
          
        case 'word-formation':
          // Modal-based design for word formation - disable slot clicks
          document.querySelectorAll('.reading-type3-gap-slot').forEach(slot => {
            slot.style.pointerEvents = 'none';
          });
          document.querySelectorAll('.reading-type3-answered-word').forEach(word => {
            word.style.pointerEvents = 'none';
          });
          document.querySelectorAll('input.gap-input').forEach(input => input.disabled = true);
          break;

        case 'transformations':
          // Inline input design for transformations
          document.querySelectorAll('.reading-type4-inline-input').forEach(input => {
            input.disabled = true;
          });
          document.querySelectorAll('input.gap-input').forEach(input => input.disabled = true);
          break;

        case 'open-cloze':
        case 'sentence-completion':
          document.querySelectorAll('input.gap-input').forEach(input => input.disabled = true);
          break;
          
        case 'multiple-choice-text':
          document.querySelectorAll('input[type="radio"]').forEach(radio => radio.disabled = true);
          break;
          
        case 'gapped-text':
          document.querySelectorAll('select.paragraph-select').forEach(select => select.disabled = true);
          break;

        case 'essay':
        case 'choice':
          document.querySelectorAll('.writing-textarea').forEach(t => t.disabled = true);
          break;

        case 'dual-matching':
          document.querySelectorAll('.listening-type4-select').forEach(s => s.disabled = true);
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
      
      if (AppState.currentExercise) {
        const exampleCorrect = AppState.currentExercise.content?.example?.correct;
        AppState.currentExercise.answers = exampleCorrect ? { '0': exampleCorrect } : {};
      }
      
      if (Timer.timerInterval) clearInterval(Timer.timerInterval);
      AppState.elapsedSeconds = 0;
      AppState.answersChecked = false;
      
      // Re-render exercise for types that use new gap design
      const reRenderTypes = ['multiple-choice', 'word-formation', 'transformations', 'multiple-choice-text', 'cross-text-matching', 'multiple-matching'];
      if (reRenderTypes.includes(partConfig.type)) {
        ExerciseRenderer.render(
          AppState.currentExercise,
          AppState.currentExamId,
          AppState.currentSection,
          AppState.currentPart
        );
      } else {
        this.resetInputsByType(partConfig);
      }
      
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
            const gap = input.closest('.reading-type2-gap');
            if (gap) {
              gap.classList.remove('incorrect');
              gap.removeAttribute('data-correct');
            }
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

        case 'essay':
        case 'choice':
          document.querySelectorAll('.writing-textarea').forEach(t => {
            t.value = '';
            t.disabled = false;
          });
          break;

        case 'dual-matching':
          document.querySelectorAll('.listening-type4-select').forEach(s => {
            s.value = '';
            s.disabled = false;
            s.classList.remove('correct', 'incorrect');
          });
          break;
      }
    }
  };
})();
