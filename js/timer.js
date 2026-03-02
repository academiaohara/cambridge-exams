// js/timer.js
(function() {
  window.Timer = {
    timerInterval: null,
    
    startTimer: function() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      
      this.updateTimerDisplay();
      this.updateTimerColor();
      
      this.timerInterval = setInterval(() => {
        AppState.elapsedSeconds++;
        this.updateTimerDisplay();
        this.updateTimerColor();
      }, 1000);
    },
    
    updateTimerDisplay: function() {
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) {
        timerDisplay.textContent = Utils.formatTime(AppState.elapsedSeconds);
      }
    },
    
    updateTimerColor: function() {
      const timerElement = document.getElementById('exercise-timer');
      if (!timerElement) return;
      
      timerElement.classList.remove('warning', 'danger');
      
      if (AppState.elapsedSeconds >= CONFIG.DANGER_TIME) {
        timerElement.classList.add('danger');
      } else if (AppState.elapsedSeconds >= CONFIG.WARNING_TIME) {
        timerElement.classList.add('warning');
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
      
      questions.forEach(q => {
        if (Utils.compareAnswers(AppState.currentExercise.answers[q.number], q.correct, partConfig.type)) {
          correct++;
        }
      });
      
      const scoreElement = document.getElementById('score-display');
      if (scoreElement) {
        scoreElement.innerHTML = `${correct}/${total}`;
      }
      
      return { correct, total };
    }
  };
})();
