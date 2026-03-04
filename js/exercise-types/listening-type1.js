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
        let stateClass = '';
        if (isChecked) {
          if (letter === question.correct && userAnswer === letter) {
            stateClass = 'correct';
          } else if (userAnswer === letter && letter !== question.correct) {
            stateClass = 'incorrect';
          } else if (letter === question.correct) {
            stateClass = 'correct-answer';
          }
        }
        html += `
          <div class="listening-type1-option ${selected} ${stateClass} ${isChecked ? 'disabled' : ''}" 
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
    
    playExtract: function(extractId, btn) {
      if (this.currentPlaying && this.currentPlaying !== extractId) {
        this.stopExtract(this.currentPlaying);
      }
      
      const icon = btn.querySelector('i');
      if (icon.classList.contains('fa-play')) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        this.currentPlaying = extractId;
        this.simulateProgress(extractId);
      } else {
        this.stopExtract(extractId);
      }
    },
    
    stopExtract: function(extractId) {
      const btn = document.querySelector(`[onclick*="ListeningType1.playExtract(${extractId}"] i`);
      if (btn) {
        btn.classList.remove('fa-pause');
        btn.classList.add('fa-play');
      }
      this.currentPlaying = null;
    },
    
    simulateProgress: function(extractId) {
      const progressBar = document.getElementById(`progress-${extractId}`);
      const timeDisplay = document.getElementById(`time-${extractId}`);
      let seconds = 0;
      const duration = 30;
      
      const interval = setInterval(() => {
        if (this.currentPlaying !== extractId) {
          clearInterval(interval);
          return;
        }
        
        seconds++;
        const progress = (seconds / duration) * 100;
        progressBar.style.width = `${progress}%`;
        timeDisplay.textContent = `00:${seconds.toString().padStart(2, '0')}`;
        
        if (seconds >= duration) {
          clearInterval(interval);
          this.stopExtract(extractId);
        }
      }, 1000);
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = userAnswer === q.correct;
        if (isCorrect) correct++;
        
        // Visual feedback on DOM options
        const optionEls = document.querySelectorAll('[onclick*="ListeningType1.selectAnswer(' + q.number + ',"]');
        optionEls.forEach(function(opt) {
          var letter = opt.querySelector('.listening-type1-option-letter');
          var optLetter = letter ? letter.textContent.trim() : '';
          opt.classList.add('disabled');
          opt.style.pointerEvents = 'none';
          if (optLetter === q.correct && userAnswer === optLetter) {
            opt.classList.add('correct');
          } else if (userAnswer === optLetter && optLetter !== q.correct) {
            opt.classList.add('incorrect');
          } else if (optLetter === q.correct) {
            opt.classList.add('correct-answer');
          }
        });
      });
      
      return correct;
    },
    
    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;
      
      if (!exercise.content.text && exercise.content.questions) {
        const container = document.getElementById('selectable-text');
        if (!container) return;
        
        const isChecked = AppState.answersChecked;
        const extracts = exercise.content.extracts || [];
        var audioSource = exercise.audio_source || exercise.audioUrl || '';
        var hasAudioSource = false;
        try {
          if (audioSource) {
            var url = new URL(audioSource);
            hasAudioSource = url.protocol === 'https:' || url.protocol === 'http:';
          }
        } catch(e) { hasAudioSource = false; }
        let html = '';
        
        if (hasAudioSource) {
          var safeUrl = audioSource.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += '<div class="listening-type1-audio-section">';
          html += '<p><strong>Click play to start the listening test:</strong></p>';
          html += '<audio controls controlsList="nodownload">';
          html += '<source src="' + safeUrl + '" type="audio/mpeg">';
          html += '</audio>';
          html += '</div>';
        }
        
        if (extracts.length > 0) {
          // Render grouped by extracts
          extracts.forEach(function(extract) {
            html += '<div class="listening-type1-extract">';
            html += '<div class="listening-type1-extract-header">';
            html += '<span class="listening-type1-extract-number">' + extract.id + '</span>';
            html += '<span class="listening-type1-context">' + extract.context + '</span>';
            html += '</div>';
            if (!hasAudioSource) {
              html += '<div class="listening-type1-audio-bar" data-extract="' + extract.id + '">';
              html += '<button class="listening-type1-play-btn" onclick="ListeningType1.playExtract(' + extract.id + ', this)">';
              html += '<i class="fas fa-play"></i>';
              html += '</button>';
              html += '<div class="listening-type1-timeline" id="timeline-' + extract.id + '">';
              html += '<div class="listening-type1-progress" id="progress-' + extract.id + '" style="width: 0%"></div>';
              html += '</div>';
              html += '<span class="listening-type1-time" id="time-' + extract.id + '">00:00</span>';
              html += '</div>';
            }
            
            extract.questions.forEach(function(q) {
              var userAnswer = exercise.answers?.[q.number] || '';
              html += '<p class="listening-type1-question-text"><strong>' + q.number + '.</strong> ' + q.question + '</p>';
              html += '<div class="listening-type1-options">';
              html += ListeningType1.renderOptions(q, q.number, isChecked, userAnswer);
              html += '</div>';
            });
            
            html += '</div>';
          });
        } else {
          // Fallback: render flat question list
          exercise.content.questions.forEach(function(q) {
            var userAnswer = exercise.answers?.[q.number] || '';
            html += '<div class="listening-type1-extract">';
            if (!hasAudioSource) {
              html += '<div class="listening-type1-audio-bar" data-extract="' + q.number + '">';
              html += '<button class="listening-type1-play-btn" onclick="ListeningType1.playExtract(' + q.number + ', this)">';
              html += '<i class="fas fa-play"></i>';
              html += '</button>';
              html += '<div class="listening-type1-timeline" id="timeline-' + q.number + '">';
              html += '<div class="listening-type1-progress" id="progress-' + q.number + '" style="width: 0%"></div>';
              html += '</div>';
              html += '<span class="listening-type1-time" id="time-' + q.number + '">00:00</span>';
              html += '</div>';
            }
            html += '<p class="listening-type1-question-text"><strong>' + q.number + '.</strong> ' + (q.question || '') + '</p>';
            html += '<div class="listening-type1-options">';
            html += ListeningType1.renderOptions(q, q.number, isChecked, userAnswer);
            html += '</div>';
            html += '</div>';
          });
        }
        
        const noteCreator = container.querySelector('#note-creator');
        const wrapper = document.createElement('div');
        wrapper.className = 'listening-type1-questions-wrapper';
        wrapper.innerHTML = html;
        container.insertBefore(wrapper, noteCreator);
      }
    }
  };
})();
