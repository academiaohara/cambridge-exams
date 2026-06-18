// js/exercise-types/listening-type1.js
// Multiple choice - Listening Part 1

(function() {
  function escapeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function nlToBrEscaped(str) {
    return escapeAttr(String(str == null ? '' : str)).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  }

  function optionLabelHtml(text) {
    return '<span>' + escapeAttr(text) + '</span>';
  }

  function optionImageHtml(url) {
    return (
      '<span class="listening-type1-option-image-wrap">' +
      '<img class="listening-type1-option-image" src="' + escapeAttr(url) + '" alt="" loading="lazy">' +
      '</span>'
    );
  }

  window.ListeningType1 = {
    audioElements: {},
    currentPlaying: null,
    /** Simulated extract duration (seconds) for the inline demo player (no file URL). */
    _demoDuration: 30,
    extractTimers: {},
    extractSeconds: {},

    /** Row class: 3-column grid when choices are http(s) image URLs (e.g. B1 Listening Part 1). */
    optionsRowClass: function(question) {
      var opts = question.options || [];
      for (var i = 0; i < opts.length; i++) {
        var o = opts[i];
        if (typeof o !== 'string') continue;
        var t = o.substring(2).trim();
        if (/^https?:\/\//i.test(t)) {
          return 'listening-type1-options listening-type1-options-images';
        }
      }
      return 'listening-type1-options';
    },

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
          
          <div class="${this.optionsRowClass(question)}">
            ${this.renderOptions(question, qNum, isChecked, userAnswer)}
          </div>
        </div>
      `;
    },

    renderOptions: function(question, qNum, isChecked, userAnswer) {
      let html = '';
      const opts = question.options || [];
      opts.forEach(function(opt) {
        if (typeof opt !== 'string') return;
        const letter = opt.charAt(0);
        const text = opt.substring(2).trim();
        const body = /^https?:\/\//i.test(text) ? optionImageHtml(text) : optionLabelHtml(text);
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
            ${body}
          </div>
        `;
      });
      return html;
    },

    selectAnswer: function(qNum, letter) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;

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
        var dur = this._demoDuration;
        var prev = this.extractSeconds[extractId];
        if (prev === undefined || prev >= dur) {
          this.extractSeconds[extractId] = 0;
        }
        this.simulateProgress(extractId);
      } else {
        this.stopExtract(extractId);
      }
    },

    stopExtract: function(extractId) {
      if (this.extractTimers[extractId]) {
        clearInterval(this.extractTimers[extractId]);
        this.extractTimers[extractId] = null;
      }
      const btn = document.querySelector(`[onclick*="ListeningType1.playExtract(${extractId}"] i`);
      if (btn) {
        btn.classList.remove('fa-pause');
        btn.classList.add('fa-play');
      }
      this.currentPlaying = null;
    },

    seekTimeline: function(ev, timelineEl) {
      if (ev.pointerType === 'mouse' && ev.button != null && ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      var extractId = timelineEl.id.replace(/^timeline-/, '');
      var duration = this._demoDuration;
      var rect = timelineEl.getBoundingClientRect();
      var clientX = ev.clientX;
      if (typeof clientX !== 'number' && ev.changedTouches && ev.changedTouches[0]) {
        clientX = ev.changedTouches[0].clientX;
      }
      if (typeof clientX !== 'number') return;
      var ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      ratio = Math.max(0, Math.min(1, ratio));
      var seconds = Math.floor(ratio * duration);
      this.extractSeconds[extractId] = seconds;
      var progressBar = document.getElementById('progress-' + extractId);
      var timeDisplay = document.getElementById('time-' + extractId);
      if (progressBar) progressBar.style.width = (seconds / duration * 100) + '%';
      if (timeDisplay) timeDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
      if (this.currentPlaying === extractId) {
        if (this.extractTimers[extractId]) {
          clearInterval(this.extractTimers[extractId]);
          this.extractTimers[extractId] = null;
        }
        this.simulateProgress(extractId);
      }
    },

    simulateProgress: function(extractId) {
      var progressBar = document.getElementById('progress-' + extractId);
      var timeDisplay = document.getElementById('time-' + extractId);
      var duration = this._demoDuration;
      if (!progressBar || !timeDisplay) return;

      if (this.extractTimers[extractId]) {
        clearInterval(this.extractTimers[extractId]);
        this.extractTimers[extractId] = null;
      }
      if (this.extractSeconds[extractId] === undefined) this.extractSeconds[extractId] = 0;

      var self = this;
      this.extractTimers[extractId] = setInterval(function() {
        if (self.currentPlaying !== extractId) {
          clearInterval(self.extractTimers[extractId]);
          self.extractTimers[extractId] = null;
          return;
        }
        self.extractSeconds[extractId]++;
        var seconds = self.extractSeconds[extractId];
        var progress = (seconds / duration) * 100;
        progressBar.style.width = progress + '%';
        timeDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
        if (seconds >= duration) {
          clearInterval(self.extractTimers[extractId]);
          self.extractTimers[extractId] = null;
          self.stopExtract(extractId);
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
        const container = document.getElementById('toggle-questions-section') || document.getElementById('selectable-text');
        if (!container) return;

        const isChecked = AppState.answersChecked;
        const extracts = exercise.content.extracts || [];
        var audioSource =
          exercise.audio_source ||
          exercise.audioUrl ||
          (exercise.content && exercise.content.audio_source) ||
          '';
        var hasAudioSource = false;
        try {
          if (audioSource) {
            var url = new URL(audioSource);
            hasAudioSource = url.protocol === 'https:' || url.protocol === 'http:';
          }
        } catch (e) {
          hasAudioSource = false;
        }
        let html = '';

        var isB1Listening4 =
          typeof AppState !== 'undefined' &&
          AppState.currentLevel === 'B1' &&
          AppState.currentSection === 'listening' &&
          AppState.currentPart === 4;
        var isC1Listening3 =
          typeof AppState !== 'undefined' &&
          AppState.currentLevel === 'C1' &&
          AppState.currentSection === 'listening' &&
          AppState.currentPart === 3;
        var showC1ListeningQuestionNumber =
          typeof AppState !== 'undefined' &&
          AppState.currentLevel === 'C1' &&
          AppState.currentSection === 'listening' &&
          (AppState.currentPart === 1 || AppState.currentPart === 3);
        var ctxBlock = '';
        if (exercise.content && exercise.content.context) {
          var ctxTrim = String(exercise.content.context).trim();
          if (ctxTrim) {
            ctxBlock =
              '<aside class="listening-type1-context-strip" lang="en">' +
              '<span class="listening-type1-context-strip-kicker">Interview</span>' +
              '<p class="listening-type1-context-strip-text">' + nlToBrEscaped(ctxTrim) + '</p>' +
              '</aside>';
          }
        }

        if (hasAudioSource) {
          var safeUrl = audioSource.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += '<div class="listening-type1-audio-section">';
          if (isB1Listening4) {
            html +=
              '<p class="listening-type1-audio-lead"><strong>Listening</strong> — Play the recording when you are ready. ' +
              'You can open the <strong>Transcript</strong> tab above to follow the interview while you answer.</p>';
          } else {
            html += '<p><strong>Click play to start the listening test:</strong></p>';
          }
          html += '<audio controls controlsList="nodownload" preload="metadata">';
          html += '<source src="' + safeUrl + '" type="audio/mpeg">';
          html += '</audio>';
          html += '</div>';
        }

        if (ctxBlock) {
          html += ctxBlock;
        }

        if (extracts.length > 0) {
          extracts.forEach(function(extract) {
            html += '<div class="listening-type1-extract">';
            var extractCtx = String(extract.context || '').trim();
            if (!isC1Listening3) {
              html += '<div class="listening-type1-extract-header">';
              html += '<span class="listening-type1-extract-number">' + extract.id + '</span>';
              html += '<span class="listening-type1-context">' + nlToBrEscaped(String(extract.context || '')) + '</span>';
              html += '</div>';
            } else if (extractCtx) {
              html += '<div class="listening-type1-extract-header listening-type1-extract-header--context-only">';
              html += '<span class="listening-type1-context">' + nlToBrEscaped(extractCtx) + '</span>';
              html += '</div>';
            }
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
              html += '<div class="listening-type1-item" data-listening-q="' + String(q.number) + '">';
              if (showC1ListeningQuestionNumber) {
                html += '<p class="listening-type1-question-text">';
                html += '<span class="listening-type1-question-number">' + String(q.number) + '.</span> ';
                html += q.question;
                html += '</p>';
              } else {
                html += '<p class="listening-type1-question-text">' + q.question + '</p>';
              }
              html += '<div class="' + ListeningType1.optionsRowClass(q) + '">';
              html += ListeningType1.renderOptions(q, q.number, isChecked, userAnswer);
              html += '</div>';
              html += '</div>';
            });

            html += '</div>';
          });
        } else {
          html += '<div class="listening-type1-extract listening-type1-compact">';
          exercise.content.questions.forEach(function(q, idx) {
            var userAnswer = exercise.answers?.[q.number] || '';
            html += '<div class="listening-type1-item" data-listening-q="' + String(q.number) + '">';
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
            var itemCtx = q.context != null ? String(q.context).trim() : '';
            if (itemCtx) {
              html +=
                '<p class="listening-type1-item-context" lang="en">' + nlToBrEscaped(itemCtx) + '</p>';
            }
            if (showC1ListeningQuestionNumber) {
              html += '<p class="listening-type1-question-text">';
              html += '<span class="listening-type1-question-number">' + String(q.number) + '.</span> ';
              html += (q.question || '');
              html += '</p>';
            } else {
              html += '<p class="listening-type1-question-text">' + (q.question || '') + '</p>';
            }
            html += '<div class="' + ListeningType1.optionsRowClass(q) + '">';
            html += ListeningType1.renderOptions(q, q.number, isChecked, userAnswer);
            html += '</div>';
            html += '</div>';
            if (idx < exercise.content.questions.length - 1) {
              html += '<hr class="listening-type1-separator">';
            }
          });
          html += '</div>';
        }

        const noteCreator = container.querySelector('#note-creator');
        var isB1Listening =
          typeof AppState !== 'undefined' &&
          AppState.currentLevel === 'B1' &&
          AppState.currentSection === 'listening';
        const wrapper = document.createElement('div');
        wrapper.className =
          'listening-type1-questions-wrapper' +
          (isB1Listening ? ' listening-type1-questions-wrapper--duo' : '') +
          (isB1Listening4 ? ' listening-type1-b1-interview' : '');
        wrapper.innerHTML = html;
        if (noteCreator) {
          container.insertBefore(wrapper, noteCreator);
        } else {
          container.appendChild(wrapper);
        }
      }
    }
  };

  document.addEventListener('pointerdown', function(ev) {
    var tl = ev.target.closest('.listening-type1-timeline');
    if (!tl) return;
    if (ev.pointerType === 'mouse' && ev.button != null && ev.button !== 0) return;
    ListeningType1.seekTimeline(ev, tl);
  }, true);
})();
