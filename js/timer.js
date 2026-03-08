// js/timer.js
(function() {
  window.Timer = {
    timerInterval: null,
    
    _isExamSectionMode: function() {
      return AppState.currentMode === 'exam' &&
             AppState.examFullMode &&
             !!(CONFIG.SECTION_TIMES && CONFIG.SECTION_TIMES[AppState.currentSection]);
    },
    
    startTimer: function() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      
      this.updateTimerDisplay();
      this.updateTimerColor();
      
      if (this._isExamSectionMode()) {
        // Section-level countdown: timer shared across all parts in the section
        const sectionTotal = CONFIG.SECTION_TIMES[AppState.currentSection] * 60;
        this.timerInterval = setInterval(() => {
          AppState.sectionElapsedSeconds++;
          Exercise.saveSectionTimerState();
          this.updateTimerDisplay();
          this.updateTimerColor();
          
          const remaining = sectionTotal - AppState.sectionElapsedSeconds;
          if (remaining <= 0) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.onTimeUp();
          }
        }, 1000);
      } else if (AppState.currentMode === 'exam') {
        // Per-exercise countdown (individual part exam mode, not full section)
        this.timerInterval = setInterval(() => {
          AppState.elapsedSeconds++;
          this.updateTimerDisplay();
          this.updateTimerColor();
          
          const totalSeconds = (AppState.currentExercise?.time || 10) * 60;
          const remaining = totalSeconds - AppState.elapsedSeconds;
          if (remaining <= 0) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.onTimeUp();
          }
        }, 1000);
      } else {
        // Count up mode (practice)
        this.timerInterval = setInterval(() => {
          AppState.elapsedSeconds++;
          this.updateTimerDisplay();
          this.updateTimerColor();
        }, 1000);
      }
    },
    
    onTimeUp: function() {
      // Auto-save current answers
      Exercise.savePartState();
      
      // Auto-check answers
      if (!AppState.answersChecked) {
        ExerciseHandlers.checkAnswers();
      }
      
      // In exam full mode with section timer, always trigger section complete
      if (this._isExamSectionMode()) {
        Exercise.showSectionComplete();
      } else {
        // Auto-advance to next part
        Exercise.goToNextPart();
      }
    },
    
    updateTimerDisplay: function() {
      const timerDisplay = document.getElementById('timer-display');
      if (!timerDisplay) return;
      
      if (this._isExamSectionMode()) {
        const sectionTotal = CONFIG.SECTION_TIMES[AppState.currentSection] * 60;
        const remaining = Math.max(0, sectionTotal - AppState.sectionElapsedSeconds);
        timerDisplay.textContent = Utils.formatTime(remaining);
      } else if (AppState.currentMode === 'exam') {
        const totalSeconds = (AppState.currentExercise?.time || 10) * 60;
        const remaining = Math.max(0, totalSeconds - AppState.elapsedSeconds);
        timerDisplay.textContent = Utils.formatTime(remaining);
      } else {
        timerDisplay.textContent = Utils.formatTime(AppState.elapsedSeconds);
      }
    },
    
    updateTimerColor: function() {
      const timerElement = document.getElementById('exercise-timer');
      if (!timerElement) return;
      
      timerElement.classList.remove('warning', 'danger');
      
      if (this._isExamSectionMode()) {
        const sectionTotal = CONFIG.SECTION_TIMES[AppState.currentSection] * 60;
        const remaining = sectionTotal - AppState.sectionElapsedSeconds;
        if (remaining <= 60) {
          timerElement.classList.add('danger');
        } else if (remaining <= 300) {
          timerElement.classList.add('warning');
        }
      } else if (AppState.currentMode === 'exam') {
        const totalSeconds = (AppState.currentExercise?.time || 10) * 60;
        const remaining = totalSeconds - AppState.elapsedSeconds;
        if (remaining <= 60) {
          timerElement.classList.add('danger');
        } else if (remaining <= 120) {
          timerElement.classList.add('warning');
        }
      } else {
        if (AppState.elapsedSeconds >= CONFIG.DANGER_TIME) {
          timerElement.classList.add('danger');
        } else if (AppState.elapsedSeconds >= CONFIG.WARNING_TIME) {
          timerElement.classList.add('warning');
        }
      }
    },
    
    updateScoreDisplay: function() {
      if (!AppState.currentExercise || !AppState.currentExercise.answers) return;
      
      let correct = 0;
      const questions = AppState.currentExercise.content.questions || [];
      const total = questions.length;
      const partConfig = CONFIG.PART_TYPES[
        AppState.currentSection === 'reading' ? AppState.currentPart : 
        `${AppState.currentSection}${AppState.currentPart}`
      ];
      
      const isWritingOrSpeaking = AppState.currentSection === 'writing' || AppState.currentSection === 'speaking';
      const isMultiMarkPart = partConfig && partConfig.maxMarks && partConfig.maxMarks > partConfig.total;
      
      if (isWritingOrSpeaking || (AppState.answersChecked && isMultiMarkPart)) {
        // Use the stored score which reflects actual marks (e.g. partial marks for Part 4)
        correct = AppState.currentPartScore || 0;
      } else {
        const marksPerQ = isMultiMarkPart ? Math.round(partConfig.maxMarks / partConfig.total) : 1;
        questions.forEach(q => {
          if (partConfig.type === 'transformations' && typeof ReadingType4 !== 'undefined' && q.routes) {
            correct += ReadingType4.evaluateTransformation(AppState.currentExercise.answers[q.number], q.routes).score;
          } else if (Utils.compareAnswers(AppState.currentExercise.answers[q.number], q.correct, partConfig.type)) {
            correct += marksPerQ;
          }
        });
      }
      
      // Update partial (part) score
      const partMax = partConfig ? (partConfig.maxMarks || partConfig.total) : total;      const partTotal = isWritingOrSpeaking ? partConfig.total : (AppState.currentExercise.totalQuestions || partMax);
      const partScoreElement = document.getElementById('part-score-display');
      if (partScoreElement) {
        partScoreElement.innerHTML = `${correct}/${partTotal}`;
      }
      
      // Store current part score
      AppState.currentPartScore = correct;
      
      // Update total (section) score
      const sectionKey = `${AppState.currentExamId}_${AppState.currentSection}`;
      if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
      
      // Save current part's score
      AppState.sectionScores[sectionKey][AppState.currentPart] = correct;
      
      // Sum all parts' scores for the section total
      const runningTotal = ExerciseRenderer.getSectionRunningTotal(sectionKey);
      
      const scoreElement = document.getElementById('score-display');
      if (scoreElement) {
        const sectionTotal = ExerciseRenderer.getSectionTotalQuestions(AppState.currentSection);
        scoreElement.innerHTML = `${runningTotal}/${sectionTotal || total}`;
      }
      
      // Save state to localStorage
      Exercise.savePartState();
      
      // Update question nav row cells if visible (parts 5-8)
      if (typeof QuestionNav !== 'undefined') QuestionNav.updateAllNavCells();
      
      return { correct, total };
    }
  };
})();
