// js/modal.js
(function() {
  window.Modal = {
    openOptionsModal: function(qNum) {
      if (AppState.answersChecked) return;
      
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      // Close tools panel when modal opens
      if (window.Tools) Tools.closeSidebar();
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      body.innerHTML = `
        <div class="modal-header">
          <h3>Question ${qNum}</h3>
          <p>Select an option</p>
        </div>
        <div class="options-grid">
          ${question.options.map(opt => {
            const letter = opt.charAt(0);
            const text = opt.substring(2).trim();
            return `
              <button class="opt-btn" onclick="Modal.selectAndClose(${qNum}, '${letter}', '${text.replace(/'/g, "\\'")}')">
                ${text.toUpperCase()}
              </button>
            `;
          }).join('')}
        </div>
      `;
      
      overlay.style.display = 'flex';
    },
    
    closeOptionsModal: function() {
      document.getElementById('exercise-modal-overlay').style.display = 'none';
    },
    
    selectAndClose: function(qNum, letter, text) {
      this.selectGapOption(qNum, letter, text);
      this.closeOptionsModal();
    },
    
    selectGapOption: function(questionNum, letter, text) {
      const answerSpan = document.getElementById(`answer-${questionNum}`);
      if (answerSpan) {
        answerSpan.innerHTML = `<span class="gap-number">${questionNum})</span> <span class="gap-text">${text}</span>`;
        
        if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
        AppState.currentExercise.answers[questionNum] = letter;
        
        const gapBox = answerSpan.closest('.gap-box');
        if (gapBox) {
          gapBox.classList.add('answered');
          if (AppState.answersChecked) {
            gapBox.classList.add('checked');
            gapBox.style.pointerEvents = 'none';
          }
        }
        
        Timer.updateScoreDisplay();
      }
    }
  };
})();
