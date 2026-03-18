// js/exercise.js
(function() {
  window.Exercise = {
    _exerciseDefaults: null,
    _exerciseDefaultsLevel: null,

    _loadExerciseDefaults: async function() {
      const level = AppState.currentLevel || 'C1';
      if (this._exerciseDefaults !== null && this._exerciseDefaultsLevel === level) {
        return this._exerciseDefaults;
      }
      try {
        const url = `/Nivel/${level}/exercise-defaults.json`;
        const response = await Utils.fetchWithNoCache(url);
        this._exerciseDefaults = await response.json();
        this._exerciseDefaultsLevel = level;
      } catch(e) {
        this._exerciseDefaults = {};
        this._exerciseDefaultsLevel = level;
      }
      return this._exerciseDefaults;
    },

    getStorageKey: function(examId, section, part) {
      return `cambridge_${AppState.currentMode}_${AppState.currentLevel}_${examId}_${section}_${part}`;
    },
    
    getSectionTimerKey: function(examId, section) {
      return `cambridge_${AppState.currentMode}_${AppState.currentLevel}_${examId}_${section}_sectimer`;
    },
    
    saveSectionTimerState: function() {
      if (!AppState.currentExamId || !AppState.currentSection) return;
      var key = this.getSectionTimerKey(AppState.currentExamId, AppState.currentSection);
      try { localStorage.setItem(key, String(AppState.sectionElapsedSeconds || 0)); } catch(e) { console.warn('Could not save section timer:', e); }
    },
    
    loadSectionTimerState: function(examId, section) {
      var key = this.getSectionTimerKey(examId, section);
      try {
        var raw = localStorage.getItem(key);
        if (raw !== null) return parseInt(raw, 10) || 0;
      } catch(e) { console.warn('Could not load section timer:', e); }
      return 0;
    },
    
    clearSectionTimerState: function(examId, section) {
      var key = this.getSectionTimerKey(examId, section);
      try { localStorage.removeItem(key); } catch(e) { console.warn('Could not clear section timer:', e); }
    },
    
    savePartState: function() {
      if (!AppState.currentExamId || !AppState.currentSection || !AppState.currentPart) return;
      var key = this.getStorageKey(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
      var data = {
        answers: AppState.currentExercise ? AppState.currentExercise.answers : {},
        answersChecked: AppState.answersChecked,
        partScore: AppState.currentPartScore || 0,
        elapsedSeconds: AppState.elapsedSeconds || 0,
        examFullMode: AppState.examFullMode,
        examCurrentSectionIndex: AppState.examCurrentSectionIndex || 0
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
        self.clearSectionTimerState(examId, section);
        var scoreKey = examId + '_' + section;
        if (AppState.sectionScores[scoreKey]) delete AppState.sectionScores[scoreKey];
      });
    },
    
    startFullExam: async function(examId) {
      var self = this;
      var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
      if (!exam) return;

      // Check exam attempt limit (exam mode only) — global daily limit (null key)
      if (AppState.currentMode === 'exam' && typeof ExamSession !== 'undefined') {
        if (!ExamSession.canStart(null)) {
          ExamSession.showBlockedModal(null);
          return;
        }
      }
      
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
            self.clearSectionTimerState(examId, section);
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
      AppState.sectionElapsedSeconds = 0;

      // Record attempt usage (exam mode only) — global daily limit (null key)
      if (AppState.currentMode === 'exam' && typeof ExamSession !== 'undefined') {
        ExamSession.incrementAttempts(null);
      }

      this.markPartInProgress(examId, firstSection, 1);
      await this.openPart(examId, firstSection, 1);
    },
    
    startFullSection: async function(examId, section) {
      // Guest gate: block writing and speaking for guest users
      if (AppState.isGuest && (section === 'writing' || section === 'speaking')) {
        if (typeof Dashboard !== 'undefined') Dashboard.showGuestGate();
        return;
      }

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
            self.clearSectionTimerState(examId, section);
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
      AppState.sectionElapsedSeconds = 0;
      
      this.markPartInProgress(examId, section, 1);
      await this.openPart(examId, section, 1);
    },
    
    openPart: async function(examId, section, part) {
      // Cleanup speaking if navigating away from a speaking exercise
      if (window.SpeakingType && typeof SpeakingType.cleanup === 'function') {
        SpeakingType.cleanup();
      }

      // Guest gate: block writing and speaking for guest users
      if (AppState.isGuest && (section === 'writing' || section === 'speaking')) {
        if (typeof Dashboard !== 'undefined') Dashboard.showGuestGate();
        return;
      }

      const content = document.getElementById('main-content');
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      if (window.Modal && typeof Modal.closeOptionsModal === 'function') Modal.closeOptionsModal();
      if (window.ScoreCalculator && typeof ScoreCalculator.closeResultsModal === 'function') ScoreCalculator.closeResultsModal();
      AppState.currentSection = section;
      AppState.currentPart = part;
      AppState.currentExamId = examId;
      AppState.answersChecked = false;
      AppState.currentPartScore = 0;
      AppState.explanationMode = false;
      AppState.explanationActiveQuestion = null;
      
      // Restore saved state from localStorage
      const savedState = this.loadPartState(examId, section, part);
      if (savedState) {
        AppState.answersChecked = savedState.answersChecked || false;
        AppState.currentPartScore = savedState.partScore || 0;
        // Restore exam full mode so footer buttons render correctly after page reload
        if (typeof savedState.examFullMode !== 'undefined') {
          AppState.examFullMode = savedState.examFullMode;
        }
        if (typeof savedState.examCurrentSectionIndex !== 'undefined') {
          AppState.examCurrentSectionIndex = savedState.examCurrentSectionIndex;
        }
        // Restore section score
        const sectionKey = `${examId}_${section}`;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        if (savedState.answersChecked) {
          AppState.sectionScores[sectionKey][part] = savedState.partScore || 0;
        }
      }
      
      // Restore section-level timer (in exam full mode, timer is shared across all parts)
      if (AppState.currentMode === 'exam' && AppState.examFullMode && CONFIG.SECTION_TIMES && CONFIG.SECTION_TIMES[section]) {
        AppState.sectionElapsedSeconds = this.loadSectionTimerState(examId, section);
      }
      
      this.markPartInProgress(examId, section, part);
      
      let fileName = '';
      if (section === 'reading') fileName = `reading${part}.json`;
      else if (section === 'listening') fileName = `listening${part}.json`;
      else if (section === 'writing') fileName = `writing${part}.json`;
      else if (section === 'speaking') fileName = `speaking${part}.json`;
      
      const baseUrl = CONFIG.EXERCISES_URL.replace('Nivel/C1/Exams/', `Nivel/${AppState.currentLevel}/Exams/`);
      const targetUrl = `${baseUrl}${examId}/${fileName}`;
      
      const loadingExam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === examId);
      const loadingTotalParts = loadingExam?.sections[section]?.total || 1;
      const loadingIsExamMode = AppState.currentMode === 'exam';
      let loadingFooterHTML = '';
      if (!loadingIsExamMode) {
        loadingFooterHTML += `<button class="btn-check" disabled><span data-i18n="checkAnswers">${I18n.t('checkAnswers')}</span></button>`;
        loadingFooterHTML += `<button class="btn-reset" disabled><i class="fas fa-redo-alt"></i> <span data-i18n="reset">${I18n.t('reset')}</span></button>`;
      }
      if (part > 1 && (!loadingIsExamMode || AppState.examFullMode)) {
        loadingFooterHTML += `<button class="btn-prev" disabled><i class="fas fa-chevron-left"></i> <span data-i18n="previous">${I18n.t('previous')}</span></button>`;
      }
      if (part < loadingTotalParts) {
        loadingFooterHTML += `<button class="btn-next" disabled><span data-i18n="next">${I18n.t('next')}</span> <i class="fas fa-chevron-right"></i></button>`;
      } else if (AppState.examFullMode) {
        loadingFooterHTML += `<button class="btn-next btn-finish-section" disabled><span data-i18n="finishSection">${I18n.t('finishSection')}</span> <i class="fas fa-check"></i></button>`;
      }
      const safeSection = Utils.getSectionTitle ? Utils.getSectionTitle(section) : section;
      const safePart = parseInt(part, 10);
      content.innerHTML = `
        <div class="exercise-container">
          <div class="loading-exercise"><i class="fas fa-spinner fa-spin"></i><h3>${I18n.t('loading')}</h3><p>${safeSection} - ${I18n.t('part')} ${safePart}</p></div>
          <div class="exercise-footer">${loadingFooterHTML}</div>
        </div>`;
      
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
        
        // Normalize reading6/reading8: questions nested inside content.texts → content.questions
        if (exercise.content && exercise.content.texts && !exercise.content.questions &&
            exercise.content.texts.questions) {
          exercise.content.questions = exercise.content.texts.questions;
          delete exercise.content.texts.questions;
        }

        if (!exercise.content) {
          throw new Error('El archivo JSON no tiene la estructura correcta');
        }

        // Apply shared defaults for time and description from exercise-defaults.json
        const defaults = await this._loadExerciseDefaults();
        const defaultKey = section + part;
        if (defaults[defaultKey]) {
          if (defaults[defaultKey].time !== undefined) exercise.time = defaults[defaultKey].time;
          if (defaults[defaultKey].description !== undefined) exercise.description = defaults[defaultKey].description;
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
        AppState.notesIndex = 0;
        AppState.freeNotes = [];
        AppState.freeNotesIndex = 0;
        AppState.elapsedSeconds = savedState ? (savedState.elapsedSeconds || 0) : 0;
        
        // In exam mode with countdown, set elapsed to saved or 0 (countdown calculates remaining)
        if (AppState.currentMode === 'exam') {
          AppState.elapsedSeconds = savedState ? (savedState.elapsedSeconds || 0) : 0;
        }
        
        await ExerciseRenderer.render(exercise, examId, section, part);
        
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
        
        Timer.startTimer();
        
        var exState = { view: 'exercise', examId: examId, section: section, part: part, level: AppState.currentLevel, mode: AppState.currentMode };
        history.pushState(exState, '', Router.stateToPath(exState));
        
      } catch (error) {
        console.error('❌ Error crítico:', error);
        content.innerHTML = `
          <div class="exercise-error-card">
            <div class="exercise-error-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3 class="exercise-error-title">Error al cargar el ejercicio</h3>
            <p class="exercise-error-desc">No se pudo cargar este ejercicio. Inténtalo de nuevo o vuelve al inicio.</p>
            <div class="exercise-error-detail"><code>${error.message}</code></div>
            <div class="exercise-error-actions">
              <button class="exercise-error-btn exercise-error-btn-primary" onclick="Exercise.openPart('${examId}', '${section}', ${part})">
                <i class="fas fa-redo"></i> Reintentar
              </button>
              <button class="exercise-error-btn exercise-error-btn-secondary" onclick="Dashboard.render()">
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
            const input = document.querySelector(`input[data-question="${qNum}"]`);
            if (input) input.value = answer;
            break;
            
          case 'transformations':
            const transformationInput = document.querySelector(`input[data-question="${qNum}"]`);
            if (transformationInput) {
              transformationInput.value = answer;
              if (typeof ReadingType4 !== 'undefined') ReadingType4.resizeInput(transformationInput);
            }
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
    
    showSectionComplete: async function() {
      if (Timer.timerInterval) {
        clearInterval(Timer.timerInterval);
        Timer.timerInterval = null;
      }
      
      var currentSection = AppState.currentSection;
      var examId = AppState.currentExamId;
      
      // Save and check the current part first.
      // For writing sections, skip checkAnswers (returns 0) so _autoCheckAllParts can do AI evaluation.
      this.savePartState();
      if (!AppState.answersChecked && AppState.currentExercise && currentSection !== 'writing' && currentSection !== 'speaking') {
        ExerciseHandlers.checkAnswers();
        this.savePartState();
      }
      
      // Show loading screen while auto-checking / evaluating all parts
      var content = document.getElementById('main-content');
      content.innerHTML = `
        <div class="section-complete-screen">
          <div class="section-complete-icon"><i class="fas fa-spinner fa-spin"></i></div>
          <h2>${I18n.t('calculatingResults')}</h2>
        </div>
      `;
      
      // Auto-check all parts of the section (including writing AI evaluation)
      await this._autoCheckAllParts(examId, currentSection);
      
      // Now render the full section complete screen with per-part breakdown
      this._renderSectionComplete(examId, currentSection);
    },
    
    _autoCheckAllParts: async function(examId, section) {
      var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
      if (!exam || !exam.sections[section]) return;
      
      var totalParts = exam.sections[section].total;
      var isWriting = section === 'writing';
      var isSpeaking = section === 'speaking';
      var sectionKey = examId + '_' + section;
      if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
      
      for (var i = 1; i <= totalParts; i++) {
        var savedState = this.loadPartState(examId, section, i);
        
        if (!savedState) {
          // No answers saved — store empty checked state
          var key = this.getStorageKey(examId, section, i);
          try { localStorage.setItem(key, JSON.stringify({ answers: {}, answersChecked: true, partScore: 0, elapsedSeconds: 0 })); } catch(e) {}
          AppState.sectionScores[sectionKey][i] = 0;
        } else if (!savedState.answersChecked) {
          if (isWriting) {
            await this._evaluateWritingPart(examId, section, i, savedState);
          } else if (isSpeaking) {
            await this._evaluateSpeakingPart(examId, section, i, savedState);
          } else {
            await this._checkNonWritingPart(examId, section, i, savedState);
          }
        } else {
          // Already checked — just ensure sectionScores is up to date
          AppState.sectionScores[sectionKey][i] = savedState.partScore || 0;
        }
        
        this.markPartCompleted(examId, section, i);
      }
    },
    
    _checkNonWritingPart: async function(examId, section, part, savedState) {
      try {
        var fileName = '';
        if (section === 'reading') fileName = 'reading' + part + '.json';
        else if (section === 'listening') fileName = 'listening' + part + '.json';
        else if (section === 'speaking') fileName = 'speaking' + part + '.json';
        
        var baseUrl = CONFIG.EXERCISES_URL.replace('Nivel/C1/Exams/', 'Nivel/' + AppState.currentLevel + '/Exams/');
        var targetUrl = baseUrl + examId + '/' + fileName;
        
        var response = await Utils.fetchWithNoCache(targetUrl);
        var exercise = await response.json();
        
        // Normalise listening format
        if (!exercise.content && exercise.extracts) {
          exercise.content = { questions: [] };
          exercise.extracts.forEach(function(extract) {
            extract.questions.forEach(function(q) {
              if (q.answer && !q.correct) q.correct = q.answer;
              exercise.content.questions.push(q);
            });
          });
        }
        
        var questions = (exercise.content && exercise.content.questions) || [];
        var partKey = section === 'reading' ? part : section + part;
        var partConfig = CONFIG.PART_TYPES[partKey];
        
        var score = 0;
        var answers = savedState.answers || {};
        questions.forEach(function(q) {
          if (partConfig && partConfig.type === 'transformations') {
            // Key word transformations: 0, 1, or 2 marks per question
            var evalScore = 0;
            if (window.ReadingType4 && typeof ReadingType4.evaluateTransformation === 'function') {
              evalScore = ReadingType4.evaluateTransformation(answers[q.number], q.routes).score;
            } else if (Utils.compareAnswers(answers[q.number], q.correct, 'transformations')) {
              evalScore = 2;
            }
            score += evalScore;
          } else {
            if (Utils.compareAnswers(answers[q.number], q.correct, partConfig && partConfig.type)) {
              var marksPerQ = partConfig && partConfig.maxMarks && partConfig.total ? Math.round(partConfig.maxMarks / partConfig.total) : 1;
              score += marksPerQ;
            }
          }
        });
        
        var key = this.getStorageKey(examId, section, part);
        try { localStorage.setItem(key, JSON.stringify(Object.assign({}, savedState, { answersChecked: true, partScore: score }))); } catch(e) {}
        
        var sectionKey = examId + '_' + section;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        AppState.sectionScores[sectionKey][part] = score;
      } catch(e) {
        console.error('Error checking part ' + section + part + ':', e);
      }
    },
    
    _evaluateWritingPart: async function(examId, section, part, savedState) {
      try {
        var fileName = 'writing' + part + '.json';
        var baseUrl = CONFIG.EXERCISES_URL.replace('Nivel/C1/Exams/', 'Nivel/' + AppState.currentLevel + '/Exams/');
        var targetUrl = baseUrl + examId + '/' + fileName;
        
        var response = await Utils.fetchWithNoCache(targetUrl);
        var exercise = await response.json();
        
        var answers = Object.assign({}, savedState.answers || {});
        var score = 0;
        
        if (part === 1) {
          var essay = answers[1] || '';
          if (essay.trim()) {
            var question = (exercise.content && exercise.content.question) || '';
            try {
              var res = await fetch('/api/writing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: essay, taskType: 'Essay', taskPrompt: question, examLevel: AppState.currentLevel || 'C1' })
              });
              var data = await res.json();
              if (!data.error && data.corrected) {
                var m = data.corrected.match(/Total:\s*(\d+)\s*\/\s*20/i);
                score = m ? parseInt(m[1], 10) : 0;
                answers._aiFeedback = data.corrected;
              }
            } catch(aiErr) { console.error('AI eval error part1:', aiErr); }
          }
        } else if (part === 2) {
          var taskId = answers.taskId;
          if (taskId) {
            var taskEssay = answers[taskId] || '';
            if (taskEssay.trim()) {
              var tasks = (exercise.content && exercise.content.tasks) || [];
              var task = tasks.find(function(t) { return t.id === taskId; });
              var taskType = (task && task.type) || '';
              var taskPrompt = (task && task.prompt) || '';
              try {
                var res2 = await fetch('/api/writing', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: taskEssay, taskType: taskType, taskPrompt: taskPrompt, examLevel: AppState.currentLevel || 'C1' })
                });
                var data2 = await res2.json();
                if (!data2.error && data2.corrected) {
                  var m2 = data2.corrected.match(/Total:\s*(\d+)\s*\/\s*20/i);
                  score = m2 ? parseInt(m2[1], 10) : 0;
                  answers['_aiFeedback_' + taskId] = data2.corrected;
                }
              } catch(aiErr2) { console.error('AI eval error part2:', aiErr2); }
            }
          }
        }
        
        var key = this.getStorageKey(examId, section, part);
        try { localStorage.setItem(key, JSON.stringify(Object.assign({}, savedState, { answers: answers, answersChecked: true, partScore: score }))); } catch(e) {}
        
        var sectionKey = examId + '_' + section;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        AppState.sectionScores[sectionKey][part] = score;
      } catch(e) {
        console.error('Error evaluating writing part ' + part + ':', e);
      }
    },
    
    _evaluateSpeakingPart: async function(examId, section, part, savedState) {
      try {
        var answers = Object.assign({}, savedState.answers || {});
        var score = 0;
        
        var transcripts = answers._transcripts || [];
        var allMessages = answers._allMessages || [];
        
        // If already evaluated (score stored in answers), use that
        if (answers._speakingScore !== undefined) {
          score = answers._speakingScore;
        } else if (transcripts.length && transcripts.join(' ').trim().length >= 5) {
          // Call AI evaluation
          try {
            var res = await fetch('/api/speaking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcripts: transcripts,
                allMessages: allMessages,
                partType: part,
                examLevel: AppState.currentLevel || 'C1'
              })
            });
            var data = await res.json();
            if (!data.error && data.evaluation) {
              // Parse score from evaluation
              var m = data.evaluation.match(/Total[:\s]*(\d+(?:\.\d+)?)\s*\/\s*75/i);
              score = m ? Math.round(parseFloat(m[1])) : 0;
              answers._aiFeedback = data.evaluation;
              answers._speakingScore = score;
            }
          } catch(aiErr) { console.error('AI speaking eval error part ' + part + ':', aiErr); }
        }
        
        var key = this.getStorageKey(examId, section, part);
        try { localStorage.setItem(key, JSON.stringify(Object.assign({}, savedState, { answers: answers, answersChecked: true, partScore: score }))); } catch(e) {}
        
        var sectionKey = examId + '_' + section;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        AppState.sectionScores[sectionKey][part] = score;
      } catch(e) {
        console.error('Error evaluating speaking part ' + part + ':', e);
      }
    },
    
    _renderSectionComplete: function(examId, section) {
      var sectionKey = examId + '_' + section;
      var sectionScore = ExerciseRenderer.getSectionRunningTotal(sectionKey);
      var sectionTotal = ExerciseRenderer.getSectionTotalQuestions(section);
      var sectionName = I18n.t(section) || section;
      
      var currentIdx = AppState.examSectionsOrder.indexOf(section);
      var nextSection = null;
      if (currentIdx >= 0 && currentIdx < AppState.examSectionsOrder.length - 1) {
        nextSection = AppState.examSectionsOrder[currentIdx + 1];
      }
      
      var nextSectionName = nextSection ? (I18n.t(nextSection) || nextSection) : '';
      
      var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
      var totalParts = (exam && exam.sections[section] && exam.sections[section].total) || 1;
      var partsHTML = '';
      
      for (var i = 1; i <= totalParts; i++) {
        var partState = this.loadPartState(examId, section, i);
        var partScore = (AppState.sectionScores[sectionKey] && AppState.sectionScores[sectionKey][i]) !== undefined
          ? AppState.sectionScores[sectionKey][i]
          : (partState ? (partState.partScore || 0) : 0);
        var partKey = section === 'reading' ? i : section + i;
        var partConfig = CONFIG.PART_TYPES[partKey];
        var partTotal = partConfig ? (partConfig.maxMarks || partConfig.total) : 0;
        
        partsHTML += `
          <div class="section-complete-part-row">
            <span class="section-complete-part-name">${I18n.t('part')} ${i}</span>
            <span class="section-complete-part-score">${partScore}/${partTotal}</span>
            <button class="btn-review-part" onclick="Exercise.openPart('${examId}', '${section}', ${i})">
              <i class="fas fa-eye"></i> ${I18n.t('reviewAnswers')}
            </button>
          </div>
        `;
      }
      
      var content = document.getElementById('main-content');
      
      var html = `
        <div class="section-complete-screen">
          <div class="section-complete-icon"><i class="fas fa-check-circle"></i></div>
          <h2>${I18n.t('sectionComplete')} ${sectionName}!</h2>
          <div class="section-complete-score">
            <span class="section-complete-label">${I18n.t('sectionScore')}:</span>
            <span class="section-complete-value">${sectionScore} / ${sectionTotal}</span>
          </div>
          <div class="section-complete-parts-breakdown">
            ${partsHTML}
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
      AppState.sectionElapsedSeconds = 0;
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
      
      // Cleanup speaking audio/recording before closing
      if (window.SpeakingType && typeof SpeakingType.cleanup === 'function') {
        SpeakingType.cleanup();
      }

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
      AppState.notesIndex = 0;
      AppState.freeNotes = [];
      AppState.freeNotesIndex = 0;
      AppState.answersChecked = false;
      AppState.sectionScores = {};
      AppState.currentPartScore = 0;
      AppState.examFullMode = false;
      AppState.examCurrentSectionIndex = 0;
      AppState.sectionElapsedSeconds = 0;
      AppState.explanationMode = false;
      AppState.explanationActiveQuestion = null;
      
      App.restoreExamStatuses();
      var closingMode = AppState.currentMode;
      if (!opts.forceDashboard && (closingMode === 'practice' || closingMode === 'exam')) {
        Dashboard.renderSubpage(closingMode, returnToExamId);
        if (!opts.skipHistory) {
          var subpageState = { view: 'subpage', mode: closingMode, expandExamId: returnToExamId };
          history.pushState(subpageState, '', Router.stateToPath(subpageState));
        }
      } else {
        Dashboard.render(returnToExamId);
        if (!opts.skipHistory) {
          var dashState = { view: 'dashboard' };
          history.pushState(dashState, '', Router.stateToPath(dashState));
        }
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

          // Record streak activity when a part is completed
          if (typeof StreakManager !== 'undefined') {
            StreakManager.recordActivity();
          }
        }
      }
    }
  };
})();
