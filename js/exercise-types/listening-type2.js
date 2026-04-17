// js/exercise-types/listening-type2.js
// Sentence completion - Listening Part 2

(function() {
  var GAP_PATTERN = /\(\d+\)\s*(?:\.{3,})?/g;
  
  window.ListeningType2 = {
    _answerAlternatives: function(correctAnswer) {
      if (!correctAnswer) return [];
      var raw = String(correctAnswer).split('/');
      var out = [];
      raw.forEach(function(part) {
        var candidate = part.trim();
        if (candidate && out.indexOf(candidate) === -1) out.push(candidate);
      });
      return out;
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
      var inputClass = 'listening-type2-input gap-input';
      var gapClass = 'listening-type2-gap';
      var gapDataAttr = '';
      if (isChecked) {
        var isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        inputClass += isCorrect ? ' correct' : ' incorrect';
        if (!isCorrect) {
          gapClass += ' incorrect';
          gapDataAttr = ' data-correct="\u2713 ' + question.correct + '"';
        }
        var dataAttrs = ' data-student-value="' + String(userAnswer || '').replace(/"/g, '&quot;') + '"' +
          ' data-check-class="' + (isCorrect ? 'correct' : 'incorrect') + '"' +
          ' data-correct-raw="' + String(question.correct || '').replace(/"/g, '&quot;') + '"';
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
          var gapClass = 'listening-type2-gap';
          var gapDataAttr = '';
          if (isChecked) {
            var isCorrect = self.isAnswerCorrect(userAnswer, q.correct);
            inputClass += isCorrect ? ' correct' : ' incorrect';
            if (!isCorrect) {
              gapClass += ' incorrect';
              gapDataAttr = ' data-correct="\u2713 ' + q.correct + '"';
            }
            var dataAttrs = ' data-student-value="' + String(userAnswer || '').replace(/"/g, '&quot;') + '"' +
              ' data-check-class="' + (isCorrect ? 'correct' : 'incorrect') + '"' +
              ' data-correct-raw="' + String(q.correct || '').replace(/"/g, '&quot;') + '"';
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
        wrapper.className = 'listening-type2-questions-wrapper';
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
      span.style.font = window.getComputedStyle(input).font;
      span.textContent = input.value || input.placeholder || '';
      var newWidth = Math.max(minWidth, span.getBoundingClientRect().width + 28);
      input.style.width = newWidth + 'px';
    },
    
    isAnswerCorrect: function(userAnswer, correctAnswer) {
      if (!userAnswer) return false;
      if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
        return correctAnswer.split('/').some(function(ans) {
          return userAnswer.trim().toLowerCase() === ans.trim().toLowerCase();
        });
      }
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
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
          input.setAttribute('data-correct-raw', q.correct || '');
          self._clearAltBadge(input);
          if (!isCorrect) {
            var gap = input.closest('.listening-type2-gap');
            if (gap) {
              gap.classList.add('incorrect');
              gap.setAttribute('data-correct', '\u2713 ' + q.correct);
            }
          }
        }
      });
      
      return correct;
    },

    setAnswerMode: function(mode) {
      var self = this;
      document.querySelectorAll('.listening-type2-input[data-question]').forEach(function(input) {
        var studentValue = input.getAttribute('data-student-value') || '';
        var checkClass = input.getAttribute('data-check-class') || '';
        var correctRaw = input.getAttribute('data-correct-raw') || '';
        if (mode === 'correct') {
          var alternatives = self._answerAlternatives(correctRaw);
          input.value = alternatives[0] || '';
          input.classList.remove('correct', 'incorrect');
          input.classList.add('cu-input-show-correct');
          self._attachAltBadge(input, alternatives);
        } else {
          input.value = studentValue;
          input.classList.remove('cu-input-show-correct');
          input.classList.remove('correct', 'incorrect');
          if (checkClass) input.classList.add(checkClass);
          self._clearAltBadge(input);
        }
        self.resizeInput(input);
      });
    }
  };
})();
