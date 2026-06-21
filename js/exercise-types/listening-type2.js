// js/exercise-types/listening-type2.js
// Sentence completion - Listening Part 2

(function() {
  var GAP_PATTERN = /\(\d+\)\s*(?:\.{3,})?/g;
  
  window.ListeningType2 = {
    _answerAlternatives: function(correctAnswer) {
      if (!correctAnswer) return [];
      var raw = Array.isArray(correctAnswer)
        ? correctAnswer
        : String(correctAnswer).split('/');
      var out = [];
      raw.forEach(function(part) {
        var candidate = String(part == null ? '' : part).trim();
        if (candidate && out.indexOf(candidate) === -1) out.push(candidate);
      });
      return out;
    },

    _formatCorrectAnswer: function(correctAnswer) {
      var alternatives = this._answerAlternatives(correctAnswer);
      return alternatives[0] || '';
    },

    _serializeCorrectAnswer: function(correctAnswer) {
      if (Array.isArray(correctAnswer)) {
        return correctAnswer.map(function(part) {
          return String(part == null ? '' : part).trim();
        }).filter(Boolean).join('/');
      }
      return String(correctAnswer == null ? '' : correctAnswer);
    },

    _clearAltBadge: function(input) {
      if (input._cuAltBadge) {
        input._cuAltBadge.remove();
        input._cuAltBadge = null;
      }
      if (input._cuAltClickHandler) {
        input.removeEventListener('click', input._cuAltClickHandler);
        input._cuAltClickHandler = null;
      }
      input.removeAttribute('data-alt-answers');
      input.removeAttribute('data-alt-idx');
    },

    _attachAltBadge: function(input, alternatives) {
      this._clearAltBadge(input);
      if (!alternatives || alternatives.length <= 1) return;
      input.setAttribute('data-alt-answers', JSON.stringify(alternatives));
      input.setAttribute('data-alt-idx', '0');
      var badge = document.createElement('span');
      badge.className = 'cu-alt-badge';
      badge.textContent = '1/' + alternatives.length;
      badge.title = 'Click to see next solution';
      var self = this;
      badge.addEventListener('click', function() { self._cycleAltInput(input); });
      input._cuAltBadge = badge;
      input.parentNode.insertBefore(badge, input.nextSibling);
      input._cuAltClickHandler = function() { self._cycleAltInput(input); };
      input.addEventListener('click', input._cuAltClickHandler);
      input.readOnly = true;
    },

    _cycleAltInput: function(input) {
      var alternatives = JSON.parse(input.getAttribute('data-alt-answers') || '[]');
      if (!alternatives.length) return;
      var idx = (parseInt(input.getAttribute('data-alt-idx') || '0', 10) + 1) % alternatives.length;
      input.setAttribute('data-alt-idx', String(idx));
      input.value = alternatives[idx] || '';
      this.resizeInput(input);
      if (input._cuAltBadge) input._cuAltBadge.textContent = (idx + 1) + '/' + alternatives.length;
    },

    renderGap: function(question, qNum, isChecked, userAnswer) {
      var isDuoListening =
        typeof Utils !== 'undefined' && Utils.isDuoListeningSection();
      var inputClass = 'listening-type2-input gap-input';
      var gapClass = 'listening-type2-gap' + (isDuoListening ? ' listening-type2-gap--duo' : '');
      var gapDataAttr = '';
      if (isChecked) {
        var isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        inputClass += isCorrect ? ' correct' : ' incorrect';
        if (!isCorrect) {
          gapClass += ' incorrect';
          gapDataAttr = ' data-correct="\u2713 ' + this._formatCorrectAnswer(question.correct) + '"';
        }
        var dataAttrs = ' data-student-value="' + String(userAnswer || '').replace(/"/g, '&quot;') + '"' +
          ' data-check-class="' + (isCorrect ? 'correct' : 'incorrect') + '"' +
          ' data-correct-raw="' + String(this._serializeCorrectAnswer(question.correct)).replace(/"/g, '&quot;') + '"';
      } else {
        var dataAttrs = '';
      }
      
      return '<span class="' + gapClass + '"' + gapDataAttr + '>' +
        '<input type="text"' +
        ' class="' + inputClass + '"' +
        ' data-question="' + qNum + '"' +
        dataAttrs +
        ' value="' + (userAnswer || '') + '"' +
        ' placeholder="..."' +
        (isChecked ? ' disabled' : '') +
        ' oninput="ListeningType2.handleInput(' + qNum + ', this.value); ListeningType2.resizeInput(this)">' +
        '</span>';
    },
    
    initListeners: function() {
      var exercise = AppState.currentExercise;
      if (!exercise) return;
      
      if (!exercise.content.text && exercise.content.questions) {
        var container = document.getElementById('toggle-questions-section') || document.getElementById('selectable-text');
        if (!container) return;
        
        var isChecked = AppState.answersChecked;
        var audioSource = exercise.audio_source || '';
        var hasAudioSource = false;
        try {
          if (audioSource) {
            var url = new URL(audioSource);
            hasAudioSource = url.protocol === 'https:' || url.protocol === 'http:';
          }
        } catch(e) { hasAudioSource = false; }
        
        var isDuoListening =
          typeof Utils !== 'undefined' && Utils.isDuoListeningSection();
        
        var html = '';
        
        if (hasAudioSource) {
          var safeUrl = audioSource.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += '<div class="listening-type2-audio-section">';
          html += '<p><strong>Click play to start the listening test:</strong></p>';
          html += '<audio controls controlsList="nodownload" aria-label="Listening exercise audio">';
          html += '<source src="' + safeUrl + '" type="audio/mpeg">';
          html += '</audio>';
          html += '</div>';
        }
        
        html += '<div class="listening-type2-sentences">';
        
        var self = this;
        exercise.content.questions.forEach(function(q) {
          var userAnswer = exercise.answers?.[q.number] || '';
          var inputClass = 'listening-type2-input gap-input';
          var gapClass = 'listening-type2-gap' + (isDuoListening ? ' listening-type2-gap--duo' : '');
          var gapDataAttr = '';
          if (isChecked) {
            var isCorrect = self.isAnswerCorrect(userAnswer, q.correct);
            inputClass += isCorrect ? ' correct' : ' incorrect';
            if (!isCorrect) {
              gapClass += ' incorrect';
              gapDataAttr = ' data-correct="\u2713 ' + self._formatCorrectAnswer(q.correct) + '"';
            }
            var dataAttrs = ' data-student-value="' + String(userAnswer || '').replace(/"/g, '&quot;') + '"' +
              ' data-check-class="' + (isCorrect ? 'correct' : 'incorrect') + '"' +
              ' data-correct-raw="' + String(self._serializeCorrectAnswer(q.correct)).replace(/"/g, '&quot;') + '"';
          } else {
            var dataAttrs = '';
          }
          
          var inputHtml = '<span class="' + gapClass + '"' + gapDataAttr + '>' +
            '<input type="text" class="' + inputClass + '"' +
            ' data-question="' + q.number + '"' +
            dataAttrs +
            ' value="' + (userAnswer || '').replace(/"/g, '&quot;') + '"' +
            ' placeholder="..."' +
            (isChecked ? ' disabled' : '') +
            ' oninput="ListeningType2.handleInput(' + q.number + ', this.value); ListeningType2.resizeInput(this)">' +
            '</span>';
          
          var questionHtml = q.question.replace(
            GAP_PATTERN,
            inputHtml
          );
          
          html += '<div class="listening-type2-sentence">' + questionHtml + '</div>';
        });
        
        html += '</div>';
        
        var noteCreator = container.querySelector('#note-creator');
        var wrapper = document.createElement('div');
        wrapper.className = 'listening-type2-questions-wrapper' + (isDuoListening ? ' listening-type2-questions-wrapper--duo' : '');
        wrapper.innerHTML = html;
        if (noteCreator) {
          container.insertBefore(wrapper, noteCreator);
        } else {
          container.appendChild(wrapper);
        }
        if (isChecked && AppState.answerViewMode === 'correct') {
          this.setAnswerMode('correct');
        }
      }
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    resizeInput: function(input) {
      var minWidth = 100;
      var span = document.getElementById('listening-type2-resize-span');
      if (!span) {
        span = document.createElement('span');
        span.id = 'listening-type2-resize-span';
        span.style.cssText = 'visibility:hidden;position:absolute;white-space:pre;pointer-events:none;';
        document.body.appendChild(span);
      }
      var computed = window.getComputedStyle(input);
      var isShowCorrect = input.classList.contains('cu-input-show-correct');
      span.style.font = computed.font;
      span.style.fontWeight = isShowCorrect ? '700' : computed.fontWeight;
      span.style.letterSpacing = computed.letterSpacing;
      span.textContent = input.value || input.placeholder || '';
      var padding = isShowCorrect ? 40 : 28;
      var newWidth = Math.max(minWidth, Math.ceil(span.getBoundingClientRect().width) + padding);
      input.style.width = newWidth + 'px';
    },
    
    isAnswerCorrect: function(userAnswer, correctAnswer) {
      if (!userAnswer) return false;
      var ua = userAnswer.trim().toLowerCase();
      return this._answerAlternatives(correctAnswer).some(function(ans) {
        return ua === ans.trim().toLowerCase();
      });
    },
    
    checkAnswers: function() {
      var questions = AppState.currentExercise.content.questions;
      var correct = 0;
      var self = this;
      
      questions.forEach(function(q) {
        var userAnswer = AppState.currentExercise.answers?.[q.number];
        var isCorrect = self.isAnswerCorrect(userAnswer, q.correct);
        if (isCorrect) correct++;
        
        var input = document.querySelector('.listening-type2-input[data-question="' + q.number + '"]');
        if (input) {
          var colorClass = isCorrect ? 'correct' : 'incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          input.setAttribute('data-student-value', userAnswer || '');
          input.setAttribute('data-check-class', colorClass);
          input.setAttribute('data-correct-raw', self._serializeCorrectAnswer(q.correct));
          self._clearAltBadge(input);
          if (!isCorrect) {
            var gap = input.closest('.listening-type2-gap');
            if (gap) {
              gap.classList.add('incorrect');
              gap.setAttribute('data-correct', '\u2713 ' + self._formatCorrectAnswer(q.correct));
            }
          }
        }
      });
      
      return correct;
    },

    setAnswerMode: function(mode) {
      var self = this;
      document.querySelectorAll('.listening-type2-input[data-question]').forEach(function(input) {
        var gap = input.closest('.listening-type2-gap');
        var studentValue = input.getAttribute('data-student-value') || '';
        var checkClass = input.getAttribute('data-check-class') || '';
        var correctRaw = input.getAttribute('data-correct-raw') || '';
        if (mode === 'correct') {
          var alternatives = self._answerAlternatives(correctRaw);
          input.value = alternatives[0] || '';
          input.classList.remove('correct', 'incorrect');
          input.classList.add('cu-input-show-correct');
          self._attachAltBadge(input, alternatives);
          if (gap) {
            gap.classList.remove('incorrect');
            gap.removeAttribute('data-correct');
          }
        } else {
          input.value = studentValue;
          input.classList.remove('cu-input-show-correct');
          input.classList.remove('correct', 'incorrect');
          if (checkClass) input.classList.add(checkClass);
          self._clearAltBadge(input);
          if (gap && checkClass === 'incorrect' && correctRaw) {
            gap.classList.add('incorrect');
            gap.setAttribute('data-correct', '\u2713 ' + correctRaw);
          } else if (gap) {
            gap.classList.remove('incorrect');
            gap.removeAttribute('data-correct');
          }
        }
        self.resizeInput(input);
      });
    },

    renderExplanationGap: function(correctAnswer) {
      var alternatives = this._answerAlternatives(correctAnswer);
      var value = alternatives[0] || '';
      return '<span class="listening-type2-gap">' +
        '<input type="text" class="listening-type2-input gap-input cu-input-show-correct"' +
        ' disabled readonly value="' + String(value).replace(/"/g, '&quot;') + '">' +
        '</span>';
    },

    replaceQuestionGapForExplanation: function(questionText, correctAnswer) {
      var gapHtml = this.renderExplanationGap(correctAnswer);
      return String(questionText || '').replace(GAP_PATTERN, gapHtml);
    },

    applyExplanationMode: function() {
      this.setAnswerMode('correct');
      var wrapper = document.querySelector('.listening-type2-questions-wrapper');
      if (wrapper) wrapper.classList.add('listening-type2-explanation-mode');
    },

    removeExplanationMode: function() {
      this.setAnswerMode('student');
      var wrapper = document.querySelector('.listening-type2-questions-wrapper');
      if (wrapper) wrapper.classList.remove('listening-type2-explanation-mode');
    }
  };
})();
