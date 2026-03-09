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
      if (!AppState.currentExercise) return;
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      
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
        // Re-render type-specific content to reflect checked state (e.g. correct/incorrect classes)
        if (typeof typeChecker.reRender === 'function') {
          typeChecker.reRender();
        }
      } else {
        // Fallback al método genérico
        const marksPerQ = partConfig.maxMarks && partConfig.total ? Math.round(partConfig.maxMarks / partConfig.total) : 1;
        questions.forEach(q => {
          const userAnswer = AppState.currentExercise.answers[q.number];
          const isCorrect = Utils.compareAnswers(userAnswer, q.correct, partConfig.type);
          if (isCorrect) correct += marksPerQ;
          
          this.markAnswerVisual(q.number, userAnswer, q.correct, isCorrect, partConfig);
        });
      }
      
      // Store the actual score (may include partial marks) before updateScoreDisplay overrides it
      AppState.currentPartScore = correct;
      
      Timer.updateScoreDisplay();
      
      const checkBtn = document.querySelector('.btn-check');
      if (checkBtn) checkBtn.disabled = true;
      
      this.disableAllInputs(partConfig);
      
      if (AppState.currentExamId && AppState.currentSection && AppState.currentPart) {
        Exercise.markPartCompleted(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
        
        // Update part navigation to show completed state
        this.updatePartNavigation();
      }
      
      Exercise.savePartState();
      
      // Update question nav row cells to reflect checked state
      if (typeof QuestionNav !== 'undefined') {
        QuestionNav.updateAllNavCells();
        if (QuestionNav.currentQNum !== null) {
          QuestionNav.openQuestion(QuestionNav.currentQNum);
        }
      }
      
      // For types 5, 6, 8: auto-switch to questions view after correction so user sees results
      const autoSwitchTypes = ['multiple-choice-text', 'cross-text-matching', 'multiple-matching'];
      if (autoSwitchTypes.includes(partConfig.type) && typeof ExerciseRenderer !== 'undefined') {
        ExerciseRenderer.toggleView('questions');
      }
    },
    
    updatePartNavigation: function() {
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === AppState.currentExamId);
      if (!exam) return;
      const completedParts = exam.sections[AppState.currentSection]?.completed || [];
      
      document.querySelectorAll('.part-nav-cell').forEach(cell => {
        const partNum = parseInt(cell.getAttribute('data-part'));
        if (completedParts.includes(partNum)) {
          cell.classList.add('completed');
        }
      });
    },
    
    getTypeChecker: function(type) {
      const typeMap = {
        'multiple-choice': AppState.currentSection === 'listening' ? window.ListeningType1 : window.ReadingType1,
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
              
              if (!isCorrect) {
                const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
                const correctOption = question.options.find(opt => opt.startsWith(correctAnswer));
                const correctText = correctOption ? correctOption.substring(2).trim() : correctAnswer;
                gapBox.setAttribute('data-correct', `✓ ${correctText}`);
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
          // Listening-type1 options
          document.querySelectorAll('.listening-type1-option').forEach(opt => {
            opt.classList.add('disabled');
            opt.style.pointerEvents = 'none';
          });
          break;

        case 'cross-text-matching':
        case 'multiple-matching':
          document.querySelectorAll('.gap-box').forEach(box => {
            box.classList.add('checked');
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
      // Prevent reset in exam mode
      if (AppState.currentMode === 'exam') return;
      
      const partConfig = CONFIG.PART_TYPES[
        AppState.currentSection === 'reading' ? AppState.currentPart : 
        `${AppState.currentSection}${AppState.currentPart}`
      ];
      
      // Subtract current part's score from section total before reset
      const sectionKey = `${AppState.currentExamId}_${AppState.currentSection}`;
      if (AppState.sectionScores[sectionKey]) {
        AppState.sectionScores[sectionKey][AppState.currentPart] = 0;
      }
      AppState.currentPartScore = 0;
      
      // Remove from completed when resetting
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === AppState.currentExamId);
      if (exam && exam.sections[AppState.currentSection]) {
        const completedArr = exam.sections[AppState.currentSection].completed;
        const idx = completedArr.indexOf(AppState.currentPart);
        if (idx > -1) completedArr.splice(idx, 1);
      }
      
      if (AppState.currentExercise) {
        const exampleCorrect = AppState.currentExercise.content?.example?.correct;
        AppState.currentExercise.answers = exampleCorrect ? { '0': exampleCorrect } : {};
      }
      
      if (Timer.timerInterval) clearInterval(Timer.timerInterval);
      AppState.elapsedSeconds = 0;
      AppState.answersChecked = false;
      
      // Clear saved state from localStorage
      Exercise.clearPartState(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
      
      // Clear all visual correction indicators before re-rendering or resetting inputs
      this.clearAllCorrections();
      
      // Re-render exercise for types that use new gap design
      const reRenderTypes = ['multiple-choice', 'word-formation', 'transformations', 'multiple-choice-text', 'cross-text-matching', 'gapped-text', 'multiple-matching'];
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
    
    clearAllCorrections: function() {
      // Remove correction classes from gap boxes, inputs, labels, options
      document.querySelectorAll('.correct, .incorrect, .checked, .correct-answer').forEach(function(el) {
        el.classList.remove('correct', 'incorrect', 'checked', 'correct-answer');
      });
      
      // Remove type-specific correction classes
      document.querySelectorAll('.reading-type1-correct, .reading-type1-incorrect, .reading-type3-correct, .reading-type3-incorrect, .reading-type4-correct, .reading-type4-incorrect').forEach(function(el) {
        el.classList.remove(
          'reading-type1-correct', 'reading-type1-incorrect',
          'reading-type3-correct', 'reading-type3-incorrect',
          'reading-type4-correct', 'reading-type4-incorrect'
        );
      });
      
      // Remove data-correct attributes (correction tooltips)
      document.querySelectorAll('[data-correct]').forEach(function(el) {
        el.removeAttribute('data-correct');
      });
      
      // Remove injected correction text spans (e.g., reading-type4)
      document.querySelectorAll('.reading-type4-correction-text').forEach(function(el) {
        el.remove();
      });
      
      // Remove title tooltips that show correct answers
      document.querySelectorAll('[title^="✓"]').forEach(function(el) {
        el.removeAttribute('title');
      });
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
          document.querySelectorAll('input.gap-input, .reading-type2-input, .listening-type2-input').forEach(input => {
            input.value = '';
            input.classList.remove('correct', 'incorrect');
            input.disabled = false;
            input.removeAttribute('title');
            const gap = input.closest('.reading-type2-gap, .listening-type2-gap');
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
            const label = radio.closest('.reading-type5-option');
            if (label) {
              label.classList.remove('correct', 'incorrect', 'disabled');
            }
          });
          break;
          
        case 'gapped-text':
          document.querySelectorAll('select.paragraph-select').forEach(select => {
            select.value = '';
            select.disabled = false;
            select.classList.remove('correct', 'incorrect');
            select.removeAttribute('title');
          });
          break;

        case 'essay':
        case 'choice':
          document.querySelectorAll('.writing-textarea').forEach(t => {
            t.value = '';
            t.disabled = false;
            t.style.display = '';
          });
          document.querySelectorAll('.writing-corrected-text').forEach(d => {
            d.innerHTML = '';
            d.style.display = 'none';
          });
          document.querySelectorAll('.writing-type1-ai-results, .writing-type2-ai-results').forEach(d => {
            d.style.display = 'none';
          });
          document.querySelectorAll('.btn-evaluate-ai').forEach(b => {
            b.disabled = false;
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
