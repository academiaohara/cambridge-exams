// js/timer.js
(function() {
  window.Timer = {
    timerInterval: null,
    
    startTimer: function() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      
      this.updateTimerDisplay();
      this.updateTimerColor();
      
      var self = this;
      
      if (AppState.currentMode === 'exam') {
        // Countdown mode
        this.timerInterval = setInterval(function() {
          AppState.elapsedSeconds++;
          self.updateTimerDisplay();
          self.updateTimerColor();
          
          // Check if countdown reached 0
          var totalSeconds = (AppState.currentExercise?.time || 10) * 60;
          var remaining = totalSeconds - AppState.elapsedSeconds;
          if (remaining <= 0) {
            clearInterval(self.timerInterval);
            self.timerInterval = null;
            self.onTimeUp();
          }
        }, 1000);
      } else {
        // Count up mode (practice)
        this.timerInterval = setInterval(function() {
          AppState.elapsedSeconds++;
          self.updateTimerDisplay();
          self.updateTimerColor();
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
      
      // Auto-advance to next part
      Exercise.goToNextPart();
    },
    
    updateTimerDisplay: function() {
      var timerDisplay = document.getElementById('timer-display');
      if (!timerDisplay) return;
      
      if (AppState.currentMode === 'exam') {
        var totalSeconds = (AppState.currentExercise?.time || 10) * 60;
        var remaining = Math.max(0, totalSeconds - AppState.elapsedSeconds);
        timerDisplay.textContent = Utils.formatTime(remaining);
      } else {
        timerDisplay.textContent = Utils.formatTime(AppState.elapsedSeconds);
      }
    },
    
    updateTimerColor: function() {
      var timerElement = document.getElementById('exercise-timer');
      if (!timerElement) return;
      
      timerElement.classList.remove('warning', 'danger');
      
      if (AppState.currentMode === 'exam') {
        var totalSeconds = (AppState.currentExercise?.time || 10) * 60;
        var remaining = totalSeconds - AppState.elapsedSeconds;
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
      
      if (isWritingOrSpeaking) {
        correct = AppState.currentPartScore || 0;
      } else {
        questions.forEach(q => {
          if (Utils.compareAnswers(AppState.currentExercise.answers[q.number], q.correct, partConfig.type)) {
            correct++;
          }
        });
      }
      
      // Update partial (part) score
      const partTotal = isWritingOrSpeaking ? partConfig.total : (AppState.currentExercise.totalQuestions || partConfig.total);
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
