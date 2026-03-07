// js/exercise.js
(function() {
  window.Exercise = {
    getStorageKey: function(examId, section, part) {
      return `cambridge_${AppState.currentMode}_${AppState.currentLevel}_${examId}_${section}_${part}`;
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
    
    clearExamAttempt: function(examId) {
      var self = this;
      var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
      if (!exam) return;
      ['reading', 'listening', 'writing', 'speaking'].forEach(function(section) {
        var sectionData = exam.sections[section];
        if (sectionData) {
          for (var i = 1; i <= sectionData.total; i++) {
            self.clearPartState(examId, section, i);
          }
          sectionData.completed = [];
          sectionData.inProgress = [];
        }
        var scoreKey = examId + '_' + section;
        if (AppState.sectionScores[scoreKey]) delete AppState.sectionScores[scoreKey];
      });
    },
    
    startFullExam: async function(examId) {
      var self = this;
      var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
      if (!exam) return;
      
      // Check if there's any saved progress for this exam
      var hasSaved = false;
      ['reading', 'listening', 'writing', 'speaking'].forEach(function(section) {
        var sectionData = exam.sections[section];
        if (sectionData) {
          for (var i = 1; i <= sectionData.total; i++) {
            if (self.loadPartState(examId, section, i)) { hasSaved = true; }
          }
        }
      });
      
      if (hasSaved) {
        Dashboard.showConfirmDialog(I18n.t('confirmStartExam'), function() {
          // Clear all previous progress
          ['reading', 'listening', 'writing', 'speaking'].forEach(function(section) {
            var sectionData = exam.sections[section];
            if (sectionData) {
              for (var i = 1; i <= sectionData.total; i++) {
                self.clearPartState(examId, section, i);
              }
              sectionData.completed = [];
              sectionData.inProgress = [];
            }
            var scoreKey = examId + '_' + section;
            if (AppState.sectionScores[scoreKey]) delete AppState.sectionScores[scoreKey];
          });
          self._doStartFullExam(examId);
        });
        return;
      }
      
      this._doStartFullExam(examId);
    },
    
    _doStartFullExam: async function(examId) {
      var firstSection = AppState.examSectionsOrder[0] || 'reading';
      AppState.currentExamId = examId;
      AppState.currentSection = firstSection;
      AppState.examFullMode = true;
      this.markPartInProgress(examId, firstSection, 1);
      await this.openPart(examId, firstSection, 1);
    },
    
    startFullSection: async function(examId, section) {
      var self = this;
      
      if (AppState.currentMode === 'exam') {
        // Check if there's already a saved attempt and confirm deletion
        var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
        var hasSaved = false;
        if (exam) {
          var sectionData = exam.sections[section];
          if (sectionData) {
            for (var i = 1; i <= sectionData.total; i++) {
              if (self.loadPartState(examId, section, i)) { hasSaved = true; break; }
            }
          }
        }
        
        if (hasSaved) {
          Dashboard.showConfirmDialog(I18n.t('confirmStartExam'), function() {
            // Clear previous attempt for this section
            if (exam && exam.sections[section]) {
              for (var i = 1; i <= exam.sections[section].total; i++) {
                self.clearPartState(examId, section, i);
              }
              exam.sections[section].completed = [];
              exam.sections[section].inProgress = [];
            }
            self._doStartFullSection(examId, section);
          });
          return;
        }
      }
      
      this._doStartFullSection(examId, section);
    },
    
    _doStartFullSection: async function(examId, section) {
      AppState.currentExamId = examId;
      AppState.currentSection = section;
      AppState.examFullMode = AppState.currentMode === 'exam';
      
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
        
        // Transform listening extracts format to standard content format
        if (!exercise.content && exercise.extracts) {
          exercise.content = { questions: [], extracts: exercise.extracts };
          exercise.time = exercise.duration_minutes || 10;
          exercise.description = exercise.instructions || '';
          exercise.totalQuestions = 0;
          exercise.extracts.forEach(function(extract) {
            extract.questions.forEach(function(q) {
              if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
                q.options = Object.entries(q.options).map(function(entry) {
                  return entry[0] + ') ' + entry[1];
                });
              }
              if (q.answer && !q.correct) {
                q.correct = q.answer;
              }
              q.context = extract.context;
              q.extractId = extract.id;
              exercise.content.questions.push(q);
              exercise.totalQuestions++;
            });
          });
        }
        
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
        
        // In exam mode with countdown, set elapsed to saved or 0 (countdown calculates remaining)
        if (AppState.currentMode === 'exam') {
          AppState.elapsedSeconds = savedState ? (savedState.elapsedSeconds || 0) : 0;
        }
        
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
        
        history.pushState({ view: 'exercise', examId: examId, section: section, part: part }, '');
        
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
      } else if (AppState.currentMode === 'exam' && AppState.examFullMode) {
        // In exam full mode: show section completion screen
        this.showSectionComplete();
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
    
    showSectionComplete: function() {
      if (Timer.timerInterval) {
        clearInterval(Timer.timerInterval);
        Timer.timerInterval = null;
      }
      
      // Auto-check answers for exam mode if not already checked
      if (!AppState.answersChecked && AppState.currentExercise) {
        ExerciseHandlers.checkAnswers();
      }
      
      var currentSection = AppState.currentSection;
      var examId = AppState.currentExamId;
      var sectionKey = examId + '_' + currentSection;
      var sectionScore = ExerciseRenderer.getSectionRunningTotal(sectionKey);
      var sectionTotal = ExerciseRenderer.getSectionTotalQuestions(currentSection);
      var sectionName = I18n.t(currentSection) || currentSection;
      
      // Find next section
      var currentIdx = AppState.examSectionsOrder.indexOf(currentSection);
      var nextSection = null;
      if (currentIdx >= 0 && currentIdx < AppState.examSectionsOrder.length - 1) {
        nextSection = AppState.examSectionsOrder[currentIdx + 1];
      }
      
      var content = document.getElementById('main-content');
      var nextSectionName = nextSection ? (I18n.t(nextSection) || nextSection) : '';
      
      var html = `
        <div class="section-complete-screen">
          <div class="section-complete-icon"><i class="fas fa-check-circle"></i></div>
          <h2>${I18n.t('sectionComplete')} ${sectionName}!</h2>
          <div class="section-complete-score">
            <span class="section-complete-label">${I18n.t('sectionScore')}:</span>
            <span class="section-complete-value">${sectionScore} / ${sectionTotal}</span>
          </div>
          <div class="section-complete-actions">
      `;
      
      if (nextSection) {
        html += `<button class="btn-next-section" onclick="Exercise.continueToNextSection('${examId}', '${nextSection}')">
          ${I18n.t('continueToNext')} ${nextSectionName} <i class="fas fa-chevron-right"></i>
        </button>`;
      } else {
        html += `<button class="btn-final-results" onclick="Exercise.showFinalResults('${examId}')">
          <i class="fas fa-trophy"></i> ${I18n.t('viewFinalResults')}
        </button>`;
      }
      
      html += `
            <button class="btn-back-dashboard" onclick="Exercise.closeExercise()">
              <i class="fas fa-home"></i> ${I18n.t('backToDashboard')}
            </button>
          </div>
        </div>
      `;
      
      content.innerHTML = html;
    },
    
    continueToNextSection: async function(examId, nextSection) {
      AppState.currentSection = nextSection;
      AppState.examFullMode = true;
      this.markPartInProgress(examId, nextSection, 1);
      await this.openPart(examId, nextSection, 1);
    },
    
    showFinalResults: function(examId) {
      var content = document.getElementById('main-content');
      var totalScore = 0;
      var totalQuestions = 0;
      var sectionsHTML = '';
      
      AppState.examSectionsOrder.forEach(function(section) {
        var sectionKey = examId + '_' + section;
        var score = ExerciseRenderer.getSectionRunningTotal(sectionKey);
        var total = ExerciseRenderer.getSectionTotalQuestions(section);
        var sectionName = I18n.t(section) || section;
        totalScore += score;
        totalQuestions += total;
        sectionsHTML += `
          <div class="final-results-section-row">
            <span class="final-results-section-name">${sectionName}</span>
            <span class="final-results-section-score">${score} / ${total}</span>
          </div>
        `;
      });
      
      var html = `
        <div class="section-complete-screen">
          <div class="section-complete-icon final"><i class="fas fa-trophy"></i></div>
          <h2>${I18n.t('examFinished')}</h2>
          <p>${I18n.t('examFinishedDesc')}</p>
          <div class="final-results-breakdown">
            ${sectionsHTML}
          </div>
          <div class="section-complete-score final-total">
            <span class="section-complete-label">${I18n.t('finalScore')}:</span>
            <span class="section-complete-value">${totalScore} / ${totalQuestions}</span>
          </div>
          <div class="section-complete-actions">
            <button class="btn-back-dashboard" onclick="Exercise.closeExercise()">
              <i class="fas fa-home"></i> ${I18n.t('backToDashboard')}
            </button>
          </div>
        </div>
      `;
      
      content.innerHTML = html;
    },
    
    closeExercise: function(opts) {
      opts = opts || {};
      Modal.closeOptionsModal();
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      
      if (Timer.timerInterval) {
        clearInterval(Timer.timerInterval);
        Timer.timerInterval = null;
      }
      
      // Remember which exam was open so we can expand it in the dashboard
      var returnToExamId = AppState.currentExamId;
      
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
      AppState.examFullMode = false;
      AppState.examCurrentSectionIndex = 0;
      
      App.restoreExamStatuses();
      Dashboard.render(returnToExamId);
      if (!opts.skipHistory) {
        history.pushState({ view: 'dashboard' }, '');
      }
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
    
    reRenderCurrentExercise: async function() {
      if (AppState.currentExamId && AppState.currentSection && AppState.currentPart) {
        this.savePartState();
        await this.openPart(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
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
