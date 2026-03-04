// js/exercise.js
(function() {
  window.Exercise = {
    getStorageKey: function(examId, section, part) {
      return `cambridge_${AppState.currentLevel}_${examId}_${section}_${part}`;
    },
    
    savePartState: function() {
      if (!AppState.currentExamId || !AppState.currentSection || !AppState.currentPart) return;
      var key = this.getStorageKey(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
      var data = {
        answers: AppState.currentExercise ? AppState.currentExercise.answers : {},
        answersChecked: AppState.answersChecked,
        partScore: AppState.currentPartScore || 0,
        elapsedSeconds: AppState.elapsedSeconds || 0
      };
      try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.warn('Could not save state:', e); }
    },
    
    loadPartState: function(examId, section, part) {
      var key = this.getStorageKey(examId, section, part);
      try {
        var raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch(e) { console.warn('Could not load state:', e); }
      return null;
    },
    
    clearPartState: function(examId, section, part) {
      var key = this.getStorageKey(examId, section, part);
      try { localStorage.removeItem(key); } catch(e) { console.warn('Could not clear state:', e); }
    },
    
    startFullSection: async function(examId, section) {
      AppState.currentExamId = examId;
      AppState.currentSection = section;
      
      this.markPartInProgress(examId, section, 1);
      await this.openPart(examId, section, 1);
    },
    
    openPart: async function(examId, section, part) {
      const content = document.getElementById('main-content');
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      AppState.currentSection = section;
      AppState.currentPart = part;
      AppState.currentExamId = examId;
      AppState.answersChecked = false;
      AppState.currentPartScore = 0;
      
      // Restore saved state from localStorage
      const savedState = this.loadPartState(examId, section, part);
      if (savedState) {
        AppState.answersChecked = savedState.answersChecked || false;
        AppState.currentPartScore = savedState.partScore || 0;
        // Restore section score
        const sectionKey = `${examId}_${section}`;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        if (savedState.answersChecked) {
          AppState.sectionScores[sectionKey][part] = savedState.partScore || 0;
        }
      }
      
      this.markPartInProgress(examId, section, part);
      
      let fileName = '';
      if (section === 'reading') fileName = `reading${part}.json`;
      else if (section === 'listening') fileName = `listening${part}.json`;
      else if (section === 'writing') fileName = `writing${part}.json`;
      else if (section === 'speaking') fileName = `speaking${part}.json`;
      
      const baseUrl = CONFIG.EXERCISES_URL.replace('Nivel/C1/Exams/', `Nivel/${AppState.currentLevel}/Exams/`);
      const targetUrl = `${baseUrl}${examId}/${fileName}`;
      
      content.innerHTML = `<div class="loading-exercise"><i class="fas fa-spinner fa-spin"></i><h3>${I18n.t('loading')}</h3><p>Test ${examId} - ${section} - ${I18n.t('part')} ${part}</p></div>`;
      
      try {
        const response = await Utils.fetchWithNoCache(targetUrl);
        const exercise = await response.json();
        
        if (!exercise.content) {
          throw new Error('El archivo JSON no tiene la estructura correcta');
        }
        
        AppState.currentExercise = exercise;
        AppState.currentExercise.examId = examId;
        AppState.currentExercise.part = part;
        AppState.currentExercise.answers = AppState.currentExercise.answers || {};
        
        if (exercise.content.example && exercise.content.example.correct) {
          AppState.currentExercise.answers[0] = exercise.content.example.correct;
        }
        
        // Restore saved answers from localStorage
        if (savedState && savedState.answers) {
          Object.assign(AppState.currentExercise.answers, savedState.answers);
        }
        
        AppState.notes = [];
        AppState.freeNotes = "";
        AppState.elapsedSeconds = savedState ? (savedState.elapsedSeconds || 0) : 0;
        
        ExerciseRenderer.render(exercise, examId, section, part);
        
        setTimeout(() => {
          this.restoreSavedAnswers();
          if (AppState.answersChecked) {
            const partConfig = CONFIG.PART_TYPES[
              section === 'reading' ? part : `${section}${part}`
            ];
            // Re-run answer checking to restore visual marks
            const typeChecker = ExerciseHandlers.getTypeChecker(partConfig.type);
            if (typeChecker && typeof typeChecker.checkAnswers === 'function') {
              typeChecker.checkAnswers();
            } else {
              const questions = AppState.currentExercise.content.questions || [];
              questions.forEach(q => {
                const userAnswer = AppState.currentExercise.answers[q.number];
                const isCorrect = Utils.compareAnswers(userAnswer, q.correct, partConfig.type);
                ExerciseHandlers.markAnswerVisual(q.number, userAnswer, q.correct, isCorrect, partConfig);
              });
            }
            ExerciseHandlers.disableAllInputs(partConfig);
            const checkBtn = document.querySelector('.btn-check');
            if (checkBtn) checkBtn.disabled = true;
            Timer.updateScoreDisplay();
          }
        }, 100);
        
        Timer.startTimer();
        
      } catch (error) {
        console.error('❌ Error crítico:', error);
        content.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Error de Sincronización</h3>
            <p>No se pudo obtener la versión más reciente del examen.</p>
            <p><small>${error.message}</small></p>
            <div class="error-actions">
              <button class="btn-back" onclick="Exercise.openPart('${examId}', '${section}', ${part})">
                <i class="fas fa-redo"></i> Reintentar
              </button>
              <button class="btn-back btn-back-secondary" onclick="Dashboard.render()">
                <i class="fas fa-home"></i> Volver al inicio
              </button>
            </div>
          </div>`;
      }
    },
    
    restoreSavedAnswers: function() {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      const partConfig = CONFIG.PART_TYPES[
        AppState.currentSection === 'reading' ? AppState.currentPart : 
        `${AppState.currentSection}${AppState.currentPart}`
      ];
      
      setTimeout(() => {
        Object.entries(AppState.currentExercise.answers).forEach(([qNum, answer]) => {
          if (qNum === '0') return;
          
          const question = AppState.currentExercise.content.questions?.find(q => q.number === parseInt(qNum));
          if (!question) return;
          
          switch(partConfig.type) {
            case 'multiple-choice':
            case 'cross-text-matching':
            case 'multiple-matching':
              const option = question.options?.find(opt => opt.startsWith(answer));
              if (option) {
                const text = option.substring(2).trim();
                const answerSpan = document.getElementById(`answer-${qNum}`);
                if (answerSpan) {
                  answerSpan.innerHTML = `<span class="gap-number">${qNum})</span> <span class="gap-text">${text}</span>`;
                  const gapBox = answerSpan.closest('.gap-box');
                  if (gapBox) gapBox.classList.add('answered');
                }
              }
              break;
              
            case 'open-cloze':
            case 'word-formation':
            case 'sentence-completion':
            case 'transformations':
              const input = document.querySelector(`input[data-question="${qNum}"]`);
              if (input) input.value = answer;
              break;
              
            case 'multiple-choice-text':
              const radio = document.querySelector(`input[name="q${qNum}"][value="${answer}"]`);
              if (radio) radio.checked = true;
              break;
              
            case 'gapped-text':
              const select = document.querySelector(`select[data-question="${qNum}"]`);
              if (select) select.value = answer;
              break;
          }
        });
        
        Timer.updateScoreDisplay();
      }, 100);
    },
    
    goToNextPart: async function() {
      if (!AppState.currentSection || !AppState.currentPart || !AppState.currentExamId) return;
      
      // Save current state to localStorage before moving
      this.savePartState();
      
      const sectionData = EXAMS_DATA[AppState.currentLevel].find(e => e.id === AppState.currentExamId)?.sections[AppState.currentSection];
      if (!sectionData) return;
      
      const nextPart = AppState.currentPart + 1;
      if (nextPart <= sectionData.total) {
        // Save current part score before moving
        const sectionKey = `${AppState.currentExamId}_${AppState.currentSection}`;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        AppState.sectionScores[sectionKey][AppState.currentPart] = AppState.currentPartScore || 0;
        
        this.markPartInProgress(AppState.currentExamId, AppState.currentSection, nextPart);
        
        await this.openPart(AppState.currentExamId, AppState.currentSection, nextPart);
      }
    },
    
    goToPrevPart: async function() {
      if (!AppState.currentSection || !AppState.currentPart || !AppState.currentExamId) return;
      
      // Save current state to localStorage before moving
      this.savePartState();
      
      // Save current part score before moving
      const sectionKey = `${AppState.currentExamId}_${AppState.currentSection}`;
      if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
      AppState.sectionScores[sectionKey][AppState.currentPart] = AppState.currentPartScore || 0;
      
      const prevPart = AppState.currentPart - 1;
      if (prevPart >= 1) {
        await this.openPart(AppState.currentExamId, AppState.currentSection, prevPart);
      }
    },
    
    closeExercise: function() {
      Modal.closeOptionsModal();
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      
      if (Timer.timerInterval) {
        clearInterval(Timer.timerInterval);
        Timer.timerInterval = null;
      }
      
      AppState.currentExercise = null;
      AppState.currentSection = null;
      AppState.currentPart = null;
      AppState.currentExamId = null;
      AppState.activeTool = null;
      AppState.notes = [];
      AppState.freeNotes = "";
      AppState.answersChecked = false;
      AppState.sectionScores = {};
      AppState.currentPartScore = 0;
      
      Dashboard.render();
    },
    
    markPartInProgress: function(examId, section, part) {
      const exam = EXAMS_DATA[AppState.currentLevel].find(e => e.id === examId);
      if (exam && exam.status === 'available') {
        if (!exam.sections[section].completed.includes(part)) {
          if (!exam.sections[section].inProgress.includes(part)) {
            exam.sections[section].inProgress.push(part);
          }
        }
      }
    },
    
    markPartCompleted: function(examId, section, part) {
      const exam = EXAMS_DATA[AppState.currentLevel].find(e => e.id === examId);
      if (exam && exam.status === 'available') {
        if (!exam.sections[section].completed.includes(part)) {
          exam.sections[section].completed.push(part);
          
          const inProgressIndex = exam.sections[section].inProgress.indexOf(part);
          if (inProgressIndex > -1) {
            exam.sections[section].inProgress.splice(inProgressIndex, 1);
          }
        }
      }
    }
  };
})();
