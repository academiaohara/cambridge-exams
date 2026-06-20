// js/exercise.js
(function() {
  /**
   * B2 First listening JSON uses variants the C1 pipeline does not expect:
   * - Part 3: options live on the extract; questions only have speaker + correct (needs content.texts + question stems).
   * - Part 4: questions live under content.task with options as an object (needs flat content.questions + string options).
   */
  function normalizeB2ListeningExercise(exercise, part) {
    if (!exercise || !exercise.content) return;
    var c = exercise.content;
    var p = parseInt(part, 10) || 0;

    if (p === 4 && c.task && Array.isArray(c.task.questions)) {
      var hasFlat = Array.isArray(c.questions) && c.questions.length > 0;
      if (!hasFlat) {
        c.questions = c.task.questions.map(function(q) {
          var nq = {};
          Object.keys(q).forEach(function(k) {
            nq[k] = q[k];
          });
          if (nq.options && typeof nq.options === 'object' && !Array.isArray(nq.options)) {
            nq.options = Object.keys(nq.options).map(function(key) {
              return key + ') ' + nq.options[key];
            });
          }
          if (!nq.correct && nq.answer) nq.correct = nq.answer;
          return nq;
        });
      }
      delete c.task;
    }

    if (p === 3 && c.extracts && c.extracts.length) {
      if ((!c.questions || !c.questions.length) && c.extracts[0] && Array.isArray(c.extracts[0].questions)) {
        c.questions = c.extracts[0].questions.map(function(q) {
          var nq = {};
          Object.keys(q).forEach(function(k) { nq[k] = q[k]; });
          if (!nq.correct && nq.answer) nq.correct = nq.answer;
          return nq;
        });
      }
      if (!Array.isArray(c.questions) || !c.questions.length) return;
      var hasTexts = c.texts && typeof c.texts === 'object' && Object.keys(c.texts).length > 0;
      if (hasTexts) return;
      var first = c.extracts[0];
      if (!first || !first.options) return;
      var texts = {};
      if (Array.isArray(first.options)) {
        first.options.forEach(function(opt) {
          if (opt && opt.letter) {
            var L = String(opt.letter).trim().charAt(0).toUpperCase();
            texts[L] = opt.text != null ? String(opt.text) : '';
          }
        });
      } else if (typeof first.options === 'object') {
        Object.keys(first.options).forEach(function(k) {
          texts[k] = String(first.options[k] != null ? first.options[k] : '');
        });
      }
      if (Object.keys(texts).length) c.texts = texts;
      c.questions.forEach(function(q) {
        if (!q.question && q.speaker) {
          q.question = 'For ' + q.speaker + ', choose the reason (A–H) they give.';
        }
      });
    }
  }

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
      var modePrefix = (window.MixedTest && MixedTest.isActive()) ? 'mixed' : AppState.currentMode;
      return `cambridge_${modePrefix}_${AppState.currentLevel}_${examId}_${section}_${part}`;
    },
    
    getSectionTimerKey: function(examId, section) {
      return `cambridge_${AppState.currentMode}_${AppState.currentLevel}_${examId}_${section}_sectimer`;
    },
    
    saveSectionTimerState: function() {
      if (!AppState.currentExamId || !AppState.currentSection) return;
      var key = this.getSectionTimerKey(AppState.currentExamId, AppState.currentSection);
      try { localStorage.setItem(key, String(AppState.sectionElapsedSeconds || 0)); } catch(e) { console.warn('Could not save section timer:', e); }
      if (typeof SyncManager !== 'undefined' && SyncManager.requestSyncSoon) {
        SyncManager.requestSyncSoon();
      }
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
    
    /** Write exam part blob to localStorage and queue Supabase sync when signed in. */
    _persistPartStateBlob: function(key, data) {
      data.updatedAt = new Date().toISOString();
      if (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()) {
        data.synced = false;
      }
      try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.warn('Could not save state:', e); }
      if (typeof SyncManager !== 'undefined' && SyncManager.requestSyncSoon) {
        SyncManager.requestSyncSoon();
      }
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
      this._persistPartStateBlob(key, data);
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
        Dashboard.showConfirmDialog('Starting a new exam will delete your previous attempt. Continue?', function() {
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
      if (section === 'writing' || section === 'speaking') {
        if (typeof AccessControl !== 'undefined') {
          var access = AccessControl.canAccessWritingSpeaking();
          if (!access.allowed) {
            if (typeof Auth !== 'undefined' && Auth._showAuthModal) Auth._showAuthModal();
            return;
          }
          var gate = AccessControl.shouldBlockWritingSpeakingTrial(section, examId);
          if (gate.block) {
            if (gate.reason === 'upgrade' && typeof Dashboard !== 'undefined' && Dashboard.showExamsUpgradeGate) {
              Dashboard.showExamsUpgradeGate();
            } else if (gate.reason === 'auth' && typeof Auth !== 'undefined' && Auth._showAuthModal) {
              Auth._showAuthModal();
            }
            return;
          }
          if (AccessControl.isWritingSpeakingSectionLocked(section)) {
            AccessControl.showRateLimitModal({ feature: section });
            return;
          }
          AccessControl.markWritingSpeakingTrialUsed(section, examId, gate);
        } else if (!AppState.isAuthenticated) {
          if (typeof Auth !== 'undefined' && Auth._showAuthModal) Auth._showAuthModal();
          return;
        } else if (AppState.isAuthenticated && !AppState.hasExamsPack) {
          if (section === 'writing') {
            if (localStorage.getItem('cambridge_free_writing_used') && AppState._freeWritingAccessExam !== examId) {
              if (typeof Dashboard !== 'undefined' && Dashboard.showExamsUpgradeGate) Dashboard.showExamsUpgradeGate();
              return;
            }
            AppState._freeWritingAccessExam = examId;
            try { localStorage.setItem('cambridge_free_writing_used', '1'); } catch(e) {}
          }
          if (section === 'speaking') {
            if (localStorage.getItem('cambridge_free_speaking_used') && AppState._freeSpeakingAccessExam !== examId) {
              if (typeof Dashboard !== 'undefined' && Dashboard.showExamsUpgradeGate) Dashboard.showExamsUpgradeGate();
              return;
            }
            AppState._freeSpeakingAccessExam = examId;
            try { localStorage.setItem('cambridge_free_speaking_used', '1'); } catch(e) {}
          }
        }
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
          Dashboard.showConfirmDialog('Starting a new exam will delete your previous attempt. Continue?', function() {
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

      if (section === 'writing' || section === 'speaking') {
        if (typeof AccessControl !== 'undefined') {
          var access = AccessControl.canAccessWritingSpeaking();
          if (!access.allowed) {
            if (typeof Auth !== 'undefined' && Auth._showAuthModal) Auth._showAuthModal();
            return;
          }
          var gate = AccessControl.shouldBlockWritingSpeakingTrial(section, examId);
          if (gate.block) {
            if (gate.reason === 'upgrade' && typeof Dashboard !== 'undefined' && Dashboard.showExamsUpgradeGate) {
              Dashboard.showExamsUpgradeGate();
            } else if (gate.reason === 'auth' && typeof Auth !== 'undefined' && Auth._showAuthModal) {
              Auth._showAuthModal();
            }
            return;
          }
          if (AccessControl.isWritingSpeakingSectionLocked(section)) {
            AccessControl.showRateLimitModal({ feature: section });
            return;
          }
          AccessControl.markWritingSpeakingTrialUsed(section, examId, gate);
        } else if (!AppState.isAuthenticated) {
          if (typeof Auth !== 'undefined' && Auth._showAuthModal) Auth._showAuthModal();
          return;
        } else if (AppState.isAuthenticated && !AppState.hasExamsPack) {
          if (section === 'writing') {
            if (localStorage.getItem('cambridge_free_writing_used') && AppState._freeWritingAccessExam !== examId) {
              if (typeof Dashboard !== 'undefined' && Dashboard.showExamsUpgradeGate) Dashboard.showExamsUpgradeGate();
              return;
            }
            AppState._freeWritingAccessExam = examId;
            try { localStorage.setItem('cambridge_free_writing_used', '1'); } catch(e) {}
          }
          if (section === 'speaking') {
            if (localStorage.getItem('cambridge_free_speaking_used') && AppState._freeSpeakingAccessExam !== examId) {
              if (typeof Dashboard !== 'undefined' && Dashboard.showExamsUpgradeGate) Dashboard.showExamsUpgradeGate();
              return;
            }
            AppState._freeSpeakingAccessExam = examId;
            try { localStorage.setItem('cambridge_free_speaking_used', '1'); } catch(e) {}
          }
        }
      }

      const content = document.getElementById('main-content');
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      if (window.Modal && typeof Modal.closeOptionsModal === 'function') Modal.closeOptionsModal();
      if (window.ScoreCalculator && typeof ScoreCalculator.closeResultsModal === 'function') ScoreCalculator.closeResultsModal();
      AppState.currentSection = section;
      AppState.currentPart = part;
      AppState.currentExamId = examId;
      AppState.answersChecked = false;
      if (document.body) document.body.classList.remove('answers-checked-app');
      AppState.answerViewMode = 'student';
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
      if (document.body) document.body.classList.toggle('answers-checked-app', !!AppState.answersChecked);
      
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
      const loadingIsMixed = window.MixedTest && MixedTest.isActive();
      const loadingTotalParts = loadingIsMixed
        ? AppState.mixedTestPlan.length
        : (loadingExam?.sections[section]?.total || 1);
      const loadingDisplayPart = loadingIsMixed ? AppState.mixedTestCurrentIndex + 1 : part;
      const loadingIsExamMode = AppState.currentMode === 'exam';
      let loadingFooterHTML = '';
      if (!loadingIsExamMode) {
        loadingFooterHTML += `<button class="btn-check" disabled><i class="fas fa-check"></i> <span data-i18n="checkAnswers">Check answers</span></button>`;
        loadingFooterHTML += `<button class="btn-reset" disabled><i class="fas fa-redo-alt"></i> <span data-i18n="reset">Reset</span></button>`;
      }
      if (loadingDisplayPart > 1 && (!loadingIsExamMode || AppState.examFullMode)) {
        loadingFooterHTML += `<button class="btn-prev" disabled><i class="fas fa-chevron-left"></i> <span data-i18n="previous">Previous</span></button>`;
      }
      if (loadingDisplayPart < loadingTotalParts) {
        loadingFooterHTML += `<button class="btn-next" disabled><span data-i18n="next">Next</span> <i class="fas fa-chevron-right"></i></button>`;
      } else if (AppState.examFullMode) {
        loadingFooterHTML += `<button class="btn-next btn-finish-section" disabled><span data-i18n="finishSection">Finish Section</span> <i class="fas fa-check"></i></button>`;
      }
      const safeSection = Utils.getSectionTitle ? Utils.getSectionTitle(section) : section;
      const safePart = parseInt(part, 10);
      const loadingInner = `
        <div class="exercise-page-wrapper">
          <div class="exercise-container">
            <div class="loading-exercise"><i class="fas fa-spinner fa-spin"></i><h3>Loading exercise...</h3><p>${safeSection} - Part ${safePart}</p></div>
            <div class="exercise-footer">${loadingFooterHTML}</div>
          </div>
        </div>`;
      content.innerHTML = (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer._buildExerciseLayoutShell)
        ? ExerciseRenderer._buildExerciseLayoutShell(loadingInner, '', section !== 'writing' && section !== 'speaking')
        : `<div class="exercise-container"><div class="loading-exercise"><i class="fas fa-spinner fa-spin"></i><h3>Loading exercise...</h3><p>${safeSection} - Part ${safePart}</p></div><div class="exercise-footer">${loadingFooterHTML}</div></div>`;
      if (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer._applyExerciseDashboardChrome) {
        ExerciseRenderer._applyExerciseDashboardChrome();
      }
      
      try {
        const response = await Utils.fetchWithNoCache(targetUrl);
        const exercise = await response.json();

        if (AppState.currentLevel === 'B1' && window.B1ExerciseProcessors) {
          B1ExerciseProcessors.normalizeExercise(exercise, section, part, examId);
        }
        
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

        if (AppState.currentLevel === 'B2' && section === 'listening') {
          normalizeB2ListeningExercise(exercise, part);
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
          if (defaults[defaultKey].example !== undefined && !exercise.content.example) {
            exercise.content.example = defaults[defaultKey].example;
          }
        }
        
        AppState.currentExercise = exercise;
        AppState.currentExercise.examId = examId;
        AppState.currentExercise.part = part;
        AppState.currentExercise.answers = AppState.currentExercise.answers || {};
        
        if (exercise.content.example && exercise.content.example.correct) {
          AppState.currentExercise.answers[0] = exercise.content.example.correct;
        } else if (exercise.content.example && exercise.content.example.routes && exercise.content.example.routes[0]) {
          const r = exercise.content.example.routes[0];
          AppState.currentExercise.answers[0] = ((r.p1 || '') + ' ' + (r.p2 || '')).trim();
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
          const partConfig = CONFIG.getPartConfig(section, part);
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
      const partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      
      Object.entries(AppState.currentExercise.answers).forEach(([qNum, answer]) => {
        if (qNum === '0') return;
        
        const question = AppState.currentExercise.content.questions?.find(q => q.number === parseInt(qNum));
        if (!question) return;
        
        switch(partConfig.type) {
          case 'multiple-choice':
          case 'cross-text-matching':
          case 'multiple-matching':
            if (AppState.currentExercise._b1PetReading2Ui) {
              break;
            }
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
            if (input) {
              input.value = answer;
              if (partConfig.type === 'word-formation' &&
                typeof BentoGrid !== 'undefined' &&
                typeof BentoGrid._resizeCuInput === 'function') {
                BentoGrid._resizeCuInput(input);
              }
            }
            break;
            
          case 'transformations':
            const transformationInput = document.querySelector(`input[data-question="${qNum}"]`);
            if (transformationInput) {
              transformationInput.value = answer;
              if (typeof ReadingType4 !== 'undefined') ReadingType4.resizeInput(transformationInput);
            }
            break;
            
          case 'multiple-choice-text':
            if (AppState.currentSection !== 'reading') {
              const radioMc = document.querySelector(`input[name="q${qNum}"][value="${answer}"]`);
              if (radioMc) radioMc.checked = true;
            }
            break;
            
          case 'gapped-text':
            const select = document.querySelector(`select[data-question="${qNum}"]`);
            if (select) select.value = answer;
            break;

          case 'speaker-matching':
          case 'dual-matching':
            var letterSelect = document.querySelector(
              partConfig.type === 'speaker-matching'
                ? '.listening-type3-select[data-qnum="' + qNum + '"]'
                : '.listening-type4-select[data-key$="_' + qNum + '"]'
            );
            if (letterSelect) letterSelect.value = answer;
            break;
        }
      });

      if (partConfig.type === 'multiple-choice-text' && AppState.currentSection === 'reading' &&
          typeof ReadingType5 !== 'undefined' && typeof ReadingType5.syncAllFromAppState === 'function') {
        ReadingType5.syncAllFromAppState();
      }

      if (partConfig.type === 'multiple-matching' && AppState.currentExercise._b1PetReading2Ui &&
          typeof ReadingType8 !== 'undefined' && ReadingType8.initB1Reading2StripIfNeeded) {
        ReadingType8.initB1Reading2StripIfNeeded();
      }

      Timer.updateScoreDisplay();
    },
    
    goToNextPart: async function() {
      // Mixed-test mode: delegate to MixedTest navigator
      if (window.MixedTest && MixedTest.isActive()) {
        MixedTest.goToNext();
        return;
      }

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
      // Mixed-test mode: delegate to MixedTest navigator
      if (window.MixedTest && MixedTest.isActive()) {
        MixedTest.goToPrev();
        return;
      }

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
      var loadingHtml = `
        <div class="section-report section-report--loading">
          <div class="section-report-loading">
            <div class="section-report-loading-icon"><i class="fas fa-spinner fa-spin"></i></div>
            <h2>Calculating results…</h2>
            <p>Checking your answers and building your section report.</p>
          </div>
        </div>
      `;
      if (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.setCenterContent) {
        ExerciseRenderer.setCenterContent(loadingHtml, false);
      } else {
        var content = document.getElementById('main-content');
        content.innerHTML = loadingHtml;
      }
      
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
          this._persistPartStateBlob(key, { answers: {}, answersChecked: true, partScore: 0, elapsedSeconds: 0 });
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
          if (!isWriting && !isSpeaking && !savedState.questionOutcomes) {
            await this._backfillQuestionOutcomes(examId, section, i, savedState);
          }
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

        if (AppState.currentLevel === 'B1' && window.B1ExerciseProcessors) {
          B1ExerciseProcessors.normalizeExercise(exercise, section, part, examId);
        }
        
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

        if (AppState.currentLevel === 'B2' && section === 'listening') {
          normalizeB2ListeningExercise(exercise, part);
        }
        
        var questions = (exercise.content && exercise.content.questions) || [];
        var partConfig = CONFIG.getPartConfig(section, part);
        
        var score = 0;
        var answers = savedState.answers || {};
        var questionOutcomes = this._computeQuestionOutcomes(questions, answers, partConfig);
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
        this._persistPartStateBlob(key, Object.assign({}, savedState, {
          answersChecked: true,
          partScore: score,
          questionOutcomes: questionOutcomes
        }));
        
        var sectionKey = examId + '_' + section;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        AppState.sectionScores[sectionKey][part] = score;
      } catch(e) {
        console.error('Error checking part ' + section + part + ':', e);
      }
    },
    
    _evaluateWritingPart: async function(examId, section, part, savedState) {
      var wHeaders = typeof AccessControl !== 'undefined'
        ? AccessControl.getAiAuthHeaders()
        : { 'Content-Type': 'application/json' };
      try {
        var fileName = 'writing' + part + '.json';
        var baseUrl = CONFIG.EXERCISES_URL.replace('Nivel/C1/Exams/', 'Nivel/' + AppState.currentLevel + '/Exams/');
        var targetUrl = baseUrl + examId + '/' + fileName;
        
        var response = await Utils.fetchWithNoCache(targetUrl);
        var exercise = await response.json();

        if (AppState.currentLevel === 'B1' && window.B1ExerciseProcessors) {
          B1ExerciseProcessors.normalizeExercise(exercise, section, part, examId);
        }

        var answers = Object.assign({}, savedState.answers || {});
        var score = 0;

        if (part === 1) {
          var essay = answers[1] || '';
          if (essay.trim()) {
            var question = (typeof WritingType1 !== 'undefined' && WritingType1.buildTaskPromptForAi)
              ? WritingType1.buildTaskPromptForAi(exercise)
              : ((exercise.content && exercise.content.question) || '');
            var taskType = exercise.type === 'email' ? 'Email' : 'Essay';
            try {
              var res = await fetch('/api/writing', {
                method: 'POST',
                headers: wHeaders,
                body: JSON.stringify({ text: essay, taskType: taskType, taskPrompt: question, examLevel: AppState.currentLevel || 'C1' })
              });
              var data = await res.json();
              if (typeof AccessControl !== 'undefined') {
                if (AccessControl.handleAiApiError(data, res)) return;
                AccessControl.applyQuotaFromResponse(res.headers);
              }
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
                  headers: wHeaders,
                  body: JSON.stringify({ text: taskEssay, taskType: taskType, taskPrompt: taskPrompt, examLevel: AppState.currentLevel || 'C1' })
                });
                var data2 = await res2.json();
                if (typeof AccessControl !== 'undefined') {
                  if (AccessControl.handleAiApiError(data2, res2)) return;
                  AccessControl.applyQuotaFromResponse(res2.headers);
                }
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
        this._persistPartStateBlob(key, Object.assign({}, savedState, { answers: answers, answersChecked: true, partScore: score }));
        
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
            var sHeaders = typeof AccessControl !== 'undefined'
              ? AccessControl.getAiAuthHeaders()
              : { 'Content-Type': 'application/json' };
            var res = await fetch('/api/speaking', {
              method: 'POST',
              headers: sHeaders,
              body: JSON.stringify({
                transcripts: transcripts,
                allMessages: allMessages,
                partType: part,
                examLevel: AppState.currentLevel || 'C1'
              })
            });
            var data = await res.json();
            if (typeof AccessControl !== 'undefined') {
              if (AccessControl.handleAiApiError(data, res)) return;
              AccessControl.applyQuotaFromResponse(res.headers);
            }
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
        this._persistPartStateBlob(key, Object.assign({}, savedState, { answers: answers, answersChecked: true, partScore: score }));
        
        var sectionKey = examId + '_' + section;
        if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
        AppState.sectionScores[sectionKey][part] = score;
      } catch(e) {
        console.error('Error evaluating speaking part ' + part + ':', e);
      }
    },
    
    _hasUserAnswer: function(answer) {
      if (answer === undefined || answer === null) return false;
      return String(answer).trim() !== '';
    },

    _computeQuestionOutcomes: function(questions, answers, partConfig) {
      var outcomes = [];
      questions.forEach(function(q) {
        var userAnswer = answers[q.number];
        var hasAnswer = userAnswer !== undefined && userAnswer !== null && String(userAnswer).trim() !== '';
        var status = 'empty';
        if (partConfig && partConfig.type === 'transformations') {
          var evalScore = 0;
          if (hasAnswer) {
            if (window.ReadingType4 && typeof ReadingType4.evaluateTransformation === 'function') {
              evalScore = ReadingType4.evaluateTransformation(userAnswer, q.routes).score;
            } else if (Utils.compareAnswers(userAnswer, q.correct, 'transformations')) {
              evalScore = 2;
            }
          }
          status = evalScore >= 2 ? 'correct' : (hasAnswer ? 'incorrect' : 'empty');
        } else if (!hasAnswer) {
          status = 'empty';
        } else {
          status = Utils.compareAnswers(userAnswer, q.correct, partConfig && partConfig.type) ? 'correct' : 'incorrect';
        }
        outcomes.push({ num: q.number, status: status });
      });
      outcomes.sort(function(a, b) { return a.num - b.num; });
      return outcomes;
    },

    _backfillQuestionOutcomes: async function(examId, section, part, savedState) {
      try {
        var fileName = '';
        if (section === 'reading') fileName = 'reading' + part + '.json';
        else if (section === 'listening') fileName = 'listening' + part + '.json';
        else return;

        var baseUrl = CONFIG.EXERCISES_URL.replace('Nivel/C1/Exams/', 'Nivel/' + AppState.currentLevel + '/Exams/');
        var targetUrl = baseUrl + examId + '/' + fileName;
        var response = await Utils.fetchWithNoCache(targetUrl);
        var exercise = await response.json();

        if (AppState.currentLevel === 'B1' && window.B1ExerciseProcessors) {
          B1ExerciseProcessors.normalizeExercise(exercise, section, part, examId);
        }
        if (!exercise.content && exercise.extracts) {
          exercise.content = { questions: [] };
          exercise.extracts.forEach(function(extract) {
            extract.questions.forEach(function(q) {
              if (q.answer && !q.correct) q.correct = q.answer;
              exercise.content.questions.push(q);
            });
          });
        }
        if (AppState.currentLevel === 'B2' && section === 'listening') {
          normalizeB2ListeningExercise(exercise, part);
        }

        var questions = (exercise.content && exercise.content.questions) || [];
        var partConfig = CONFIG.getPartConfig(section, part);
        var questionOutcomes = this._computeQuestionOutcomes(questions, savedState.answers || {}, partConfig);
        var key = this.getStorageKey(examId, section, part);
        this._persistPartStateBlob(key, Object.assign({}, savedState, { questionOutcomes: questionOutcomes }));
      } catch (e) {
        console.warn('Could not backfill question outcomes for ' + section + part + ':', e);
      }
    },

    _buildQuestionCellsHTML: function(partState, partScore, partConfig, section) {
      var isAiSection = section === 'writing' || section === 'speaking';
      var cells = '';

      if (isAiSection) {
        var answers = (partState && partState.answers) || {};
        var hasAttempt = Object.keys(answers).some(function(k) {
          return k.charAt(0) !== '_' && Exercise._hasUserAnswer(answers[k]);
        });
        var status = !hasAttempt ? 'empty' : (partScore > 0 ? 'correct' : 'incorrect');
        cells += '<span class="sc-q-cell sc-q-' + status + '" title="Task"></span>';
        return '<div class="sc-question-cells sc-question-cells--single">' + cells + '</div>';
      }

      var outcomes = partState && partState.questionOutcomes;
      if (outcomes && outcomes.length) {
        outcomes.forEach(function(o) {
          cells += '<span class="sc-q-cell sc-q-' + o.status + '" title="Question ' + o.num + '"></span>';
        });
        return '<div class="sc-question-cells">' + cells + '</div>';
      }

      var count = partConfig ? (partConfig.total || 0) : 0;
      for (var i = 0; i < count; i++) {
        cells += '<span class="sc-q-cell sc-q-empty" title="Question ' + (i + 1) + '"></span>';
      }
      return '<div class="sc-question-cells">' + cells + '</div>';
    },

    _buildSectionPartNavHTML: function(examId, section, totalParts) {
      var cells = '';
      for (var i = 1; i <= totalParts; i++) {
        cells += '<span class="part-nav-cell completed" title="Part ' + i + ' completed">' + i + '</span>';
      }
      return '<div class="part-nav-row section-report-part-nav">' + cells + '</div>';
    },

    _renderSectionComplete: function(examId, section) {
      var sectionKey = examId + '_' + section;
      var sectionScore = ExerciseRenderer.getSectionRunningTotal(sectionKey);
      var sectionTotal = ExerciseRenderer.getSectionTotalQuestions(section);
      var sectionLabels = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };
      var sectionName = sectionLabels[section] || section;
      var sectionTitle = typeof Utils !== 'undefined' && Utils.getSectionTitle
        ? Utils.getSectionTitle(section)
        : sectionName.toUpperCase();
      var levelName = typeof Utils !== 'undefined' && Utils.getLevelName
        ? Utils.getLevelName(AppState.currentLevel)
        : (AppState.currentLevel || 'C1');

      var currentIdx = AppState.examSectionsOrder.indexOf(section);
      var nextSection = null;
      if (currentIdx >= 0 && currentIdx < AppState.examSectionsOrder.length - 1) {
        nextSection = AppState.examSectionsOrder[currentIdx + 1];
      }
      var nextSectionName = nextSection ? (sectionLabels[nextSection] || nextSection) : '';

      var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
      var totalParts = (exam && exam.sections[section] && exam.sections[section].total) || 1;
      var partsHTML = '';

      for (var i = 1; i <= totalParts; i++) {
        var partState = this.loadPartState(examId, section, i);
        var partScore = (AppState.sectionScores[sectionKey] && AppState.sectionScores[sectionKey][i]) !== undefined
          ? AppState.sectionScores[sectionKey][i]
          : (partState ? (partState.partScore || 0) : 0);
        var partConfig = CONFIG.getPartConfig(section, i);
        var partTotal = partConfig ? (partConfig.maxMarks || partConfig.total) : 0;
        var cellsHTML = this._buildQuestionCellsHTML(partState, partScore, partConfig, section);

        partsHTML += ''
          + '<div class="section-report-part-card">'
          + '  <div class="section-report-part-head">'
          + '    <span class="section-report-part-label">'
          + '      Part ' + i
          + '      <button type="button" class="btn-review-part btn-review-part--icon" onclick="Exercise.openPart(\'' + examId + '\', \'' + section + '\', ' + i + ')" title="Review" aria-label="Review Part ' + i + '">'
          + '        <i class="fas fa-eye"></i>'
          + '      </button>'
          + '    </span>'
          + '    <span class="section-report-part-score">' + partScore + '<span class="section-report-part-score-sep">/</span>' + partTotal + '</span>'
          + '  </div>'
          + '  ' + cellsHTML
          + '</div>';
      }

      var cambridgeHTML = '';
      if (typeof ScoreCalculator !== 'undefined' && ScoreCalculator.getSectionReportStats && ScoreCalculator.buildReportSummaryHTML) {
        var stats = ScoreCalculator.getSectionReportStats(examId, section);
        cambridgeHTML = ScoreCalculator.buildReportSummaryHTML(stats, 'ScoreCalculator.showLiveSectionResults()', {
          rawScore: sectionScore,
          rawTotal: sectionTotal
        });
      }

      var html = ''
        + '<div class="section-report">'
        + '  <div class="exercise-header">'
        + '    <div class="exercise-header-top">'
        + '      <h2 class="exercise-heading">' + levelName + ' - ' + sectionTitle + '</h2>'
        + '      <div class="exercise-header-right">'
        + '        <div class="score-display">' + sectionScore + '/' + sectionTotal + '</div>'
        + '        <div class="exercise-toolbar">'
        + '          <button type="button" class="btn-exit" onclick="Exercise.closeExercise()" title="Close">'
        + '            <i class="fas fa-times"></i>'
        + '          </button>'
        + '        </div>'
        + '      </div>'
        + '    </div>'
        + '    <div class="exercise-header-meta">'
        + '      <span class="exercise-badge">' + sectionTitle + ' — Report</span>'
        + '      <span class="exam-mode-badge"><span class="material-symbols-outlined">timer</span> Simulation</span>'
        + '    </div>'
        + '  </div>'
        + '  <div class="exercise-info section-report-info">'
        + '    <div class="exercise-info-left">' + this._buildSectionPartNavHTML(examId, section, totalParts) + '</div>'
        + '    <div class="exercise-info-right">'
        + '      <span class="section-report-status"><i class="fas fa-check-circle"></i> Section complete</span>'
        + '      <div class="part-score-display section-report-raw-pill">' + sectionScore + '/' + sectionTotal + ' raw</div>'
        + '    </div>'
        + '  </div>'
        + '  <div class="exercise-description section-report-banner">'
        + '    <p><strong>' + sectionName + ' finished.</strong> Review your Cambridge level, per-part breakdown and raw score below.</p>'
        + '  </div>'
        + '  <div class="section-report-body">'
        + cambridgeHTML
        + '    <div class="section-report-parts">'
        + '      <h3 class="section-report-parts-title"><i class="fas fa-list-check"></i> Breakdown by part</h3>'
        + '      <div class="section-report-parts-grid">' + partsHTML + '</div>'
        + '    </div>'
        + '  </div>'
        + '  <div class="exercise-footer section-report-actions">';

      if (nextSection) {
        html += '<button type="button" class="btn-finish-section" onclick="Exercise.continueToNextSection(\'' + examId + '\', \'' + nextSection + '\')">'
          + 'Continue to ' + nextSectionName + ' <i class="fas fa-chevron-right"></i>'
          + '</button>';
      } else {
        html += '<button type="button" class="btn-finish-section" onclick="Exercise.showFinalResults(\'' + examId + '\')">'
          + '<i class="fas fa-trophy"></i> Final results'
          + '</button>';
      }

      html += ''
        + '    <button type="button" class="btn-prev" onclick="Exercise.closeExercise()">'
        + '      <i class="fas fa-home"></i> Back'
        + '    </button>'
        + '  </div>'
        + '</div>';

      if (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.setCenterContent) {
        ExerciseRenderer.setCenterContent(html, false);
      } else {
        var content = document.getElementById('main-content');
        content.innerHTML = html;
      }
    },
    
    continueToNextSection: async function(examId, nextSection) {
      AppState.currentSection = nextSection;
      AppState.examFullMode = true;
      AppState.sectionElapsedSeconds = 0;
      this.markPartInProgress(examId, nextSection, 1);
      await this.openPart(examId, nextSection, 1);
    },
    
    showFinalResults: function(examId) {
      var totalScore = 0;
      var totalQuestions = 0;
      var sectionsHTML = '';
      var sectionLabels2 = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };
      var levelName = typeof Utils !== 'undefined' && Utils.getLevelName
        ? Utils.getLevelName(AppState.currentLevel)
        : (AppState.currentLevel || 'C1');

      AppState.examSectionsOrder.forEach(function(section) {
        var sectionKey = examId + '_' + section;
        var score = ExerciseRenderer.getSectionRunningTotal(sectionKey);
        var total = ExerciseRenderer.getSectionTotalQuestions(section);
        var sectionName = sectionLabels2[section] || section;
        totalScore += score;
        totalQuestions += total;
        var pct = total > 0 ? Math.round(score / total * 100) : 0;
        sectionsHTML += ''
          + '<div class="section-report-part-card section-report-part-card--section">'
          + '  <div class="section-report-part-head">'
          + '    <span class="section-report-part-label">' + sectionName + '</span>'
          + '    <span class="section-report-part-score">' + score + '<span class="section-report-part-score-sep">/</span>' + total + '</span>'
          + '  </div>'
          + '  <div class="section-report-summary-bar-wrap section-report-summary-bar-wrap--inline">'
          + '    <div class="section-report-summary-bar" style="width:' + pct + '%"></div>'
          + '  </div>'
          + '</div>';
      });

      var cambridgeHTML = '';
      if (typeof ScoreCalculator !== 'undefined' && ScoreCalculator.getExamReportStats && ScoreCalculator.buildReportSummaryHTML) {
        var examStats = ScoreCalculator.getExamReportStats(examId);
        cambridgeHTML = ScoreCalculator.buildReportSummaryHTML(
          examStats,
          'ScoreCalculator.showLiveOverallResults()',
          {
            rawScore: totalScore,
            rawTotal: totalQuestions,
            isFinal: true
          }
        );
      }


      var html = ''
        + '<div class="section-report section-report--final">'
        + '  <div class="exercise-header">'
        + '    <div class="exercise-header-top">'
        + '      <h2 class="exercise-heading">' + levelName + ' — Exam complete</h2>'
        + '      <div class="exercise-header-right">'
        + '        <div class="score-display">' + totalScore + '/' + totalQuestions + '</div>'
        + '        <div class="exercise-toolbar">'
        + '          <button type="button" class="btn-exit" onclick="Exercise.closeExercise()" title="Close">'
        + '            <i class="fas fa-times"></i>'
        + '          </button>'
        + '        </div>'
        + '      </div>'
        + '    </div>'
        + '    <div class="exercise-header-meta">'
        + '      <span class="exercise-badge">Final report</span>'
        + '      <span class="exam-mode-badge"><span class="material-symbols-outlined">emoji_events</span> Simulation finished</span>'
        + '    </div>'
        + '  </div>'
        + '  <div class="exercise-description section-report-banner">'
        + '    <p><strong>All sections completed.</strong> Review your Cambridge level, section breakdown and raw score below.</p>'
        + '  </div>'
        + '  <div class="section-report-body">'
        + cambridgeHTML
        + '    <div class="section-report-parts">'
        + '      <h3 class="section-report-parts-title"><i class="fas fa-layer-group"></i> By section</h3>'
        + '      <div class="section-report-parts-grid section-report-parts-grid--sections">' + sectionsHTML + '</div>'
        + '    </div>'
        + '  </div>'
        + '  <div class="exercise-footer section-report-actions">'
        + '    <button type="button" class="btn-prev" onclick="Exercise.closeExercise()">'
        + '      <i class="fas fa-home"></i> Back'
        + '    </button>'
        + '  </div>'
        + '</div>';
      
      if (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.setCenterContent) {
        ExerciseRenderer.setCenterContent(html, false);
      } else {
        var content = document.getElementById('main-content');
        content.innerHTML = html;
      }
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

      // Clear any active mixed-test session
      var wasMixedTest = window.MixedTest && MixedTest.isActive();
      if (wasMixedTest) {
        MixedTest.clear();
      }
      
      // Remember which exam was open so we can expand it in the dashboard.
      // When exiting a mixed test, return to the Random Test page.
      var returnToExamId = wasMixedTest ? 'Random' : AppState.currentExamId;
      
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
      if (document.body) document.body.classList.remove('answers-checked-app');
      AppState.answerViewMode = 'student';
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
        if (typeof BentoGrid !== 'undefined' && BentoGrid.openTests) {
          BentoGrid.openTests(AppState.currentLevel || 'C1', returnToExamId, {
            mode: closingMode,
            skipHistory: !!opts.skipHistory
          });
          if (!opts.skipHistory) {
            var testsState = {
              view: 'testsHub',
              level: AppState.currentLevel || 'C1',
              mode: closingMode
            };
            if (returnToExamId) testsState.examId = returnToExamId;
            history.pushState(testsState, '', Router.stateToPath(testsState));
          }
        } else {
          Dashboard.renderSubpage(closingMode, returnToExamId);
          if (!opts.skipHistory) {
            var subpageState = { view: 'subpage', mode: closingMode, expandExamId: returnToExamId };
            history.pushState(subpageState, '', Router.stateToPath(subpageState));
          }
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
      if (window.MixedTest && MixedTest.isActive()) return;
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
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === examId);
      if (exam && exam.status === 'available') {
        if (exam.sections[section] && !exam.sections[section].completed.includes(part)) {
          exam.sections[section].completed.push(part);
          if (!window.MixedTest || !MixedTest.isActive()) {
            const inProgressIndex = exam.sections[section].inProgress.indexOf(part);
            if (inProgressIndex > -1) {
              exam.sections[section].inProgress.splice(inProgressIndex, 1);
            }
          }
        }
      }
      if (typeof StreakManager !== 'undefined') StreakManager.recordActivity();
    }
  };
})();
