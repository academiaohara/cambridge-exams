// js/exercise-types/listening-type1.js
// Multiple choice - Listening Part 1

(function() {
  window.ListeningType1 = {
    audioElements: {},
    currentPlaying: null,
    
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      return `
        <div class="listening-type1-extract">
          <div class="listening-type1-audio-bar" data-extract="${qNum}">
            <button class="listening-type1-play-btn" onclick="ListeningType1.playExtract(${qNum}, this)">
              <i class="fas fa-play"></i>
            </button>
            <div class="listening-type1-timeline" id="timeline-${qNum}">
              <div class="listening-type1-progress" id="progress-${qNum}" style="width: 0%"></div>
            </div>
            <span class="listening-type1-time" id="time-${qNum}">00:00</span>
          </div>
          
          <div class="listening-type1-options">
            ${this.renderOptions(question, qNum, isChecked, userAnswer)}
          </div>
        </div>
      `;
    },
    
    renderOptions: function(question, qNum, isChecked, userAnswer) {
      let html = '';
      question.options.forEach(opt => {
        const letter = opt.charAt(0);
        const text = opt.substring(2).trim();
        const selected = userAnswer === letter ? 'selected' : '';
        html += `
          <div class="listening-type1-option ${selected} ${isChecked ? 'disabled' : ''}" 
               onclick="${!isChecked ? 'ListeningType1.selectAnswer(' + qNum + ', \'' + letter + '\')' : ''}">
            <span class="listening-type1-option-letter">${letter}</span>
            <span>${text}</span>
          </div>
        `;
      });
      return html;
    },
    
    selectAnswer: function(qNum, letter) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      
      // Actualizar UI
      document.querySelectorAll(`[onclick*="ListeningType1.selectAnswer(${qNum}"]`).forEach(opt => {
        opt.classList.remove('selected');
      });
      
      const selectedOpt = Array.from(document.querySelectorAll(`[onclick*="ListeningType1.selectAnswer(${qNum}"]`))
        .find(opt => opt.getAttribute('onclick').includes(`'${letter}'`));
      
      if (selectedOpt) selectedOpt.classList.add('selected');
      
      Timer.updateScoreDisplay();
    },
    
    playExtract: function(qNum, btn) {
      if (this.currentPlaying && this.currentPlaying !== qNum) {
        this.stopExtract(this.currentPlaying);
      }
      
      const icon = btn.querySelector('i');
      if (icon.classList.contains('fa-play')) {
        // Simular reproducción
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        this.currentPlaying = qNum;
        this.simulateProgress(qNum);
      } else {
        this.stopExtract(qNum);
      }
    },
    
    stopExtract: function(qNum) {
      const btn = document.querySelector(`[onclick*="ListeningType1.playExtract(${qNum}"] i`);
      if (btn) {
        btn.classList.remove('fa-pause');
        btn.classList.add('fa-play');
      }
      this.currentPlaying = null;
    },
    
    simulateProgress: function(qNum) {
      const progressBar = document.getElementById(`progress-${qNum}`);
      const timeDisplay = document.getElementById(`time-${qNum}`);
      let seconds = 0;
      const duration = 30; // 30 segundos simulados
      
      const interval = setInterval(() => {
        if (this.currentPlaying !== qNum) {
          clearInterval(interval);
          return;
        }
        
        seconds++;
        const progress = (seconds / duration) * 100;
        progressBar.style.width = `${progress}%`;
        timeDisplay.textContent = `00:${seconds.toString().padStart(2, '0')}`;
        
        if (seconds >= duration) {
          clearInterval(interval);
          this.stopExtract(qNum);
        }
      }, 1000);
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        if (userAnswer === q.correct) correct++;
      });
      
      return correct;
    }
  };
})();
