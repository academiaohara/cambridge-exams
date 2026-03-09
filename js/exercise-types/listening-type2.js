// js/exercise-types/listening-type2.js
// Sentence completion - Listening Part 2

(function() {
  var GAP_PATTERN = /\(\d+\)\s*(?:\.{3,})?/g;
  
  window.ListeningType2 = {
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
      }
      
      return '<span class="' + gapClass + '"' + gapDataAttr + '>' +
        '<input type="text"' +
        ' class="' + inputClass + '"' +
        ' data-question="' + qNum + '"' +
        ' value="' + (userAnswer || '') + '"' +
        ' placeholder="..."' +
        (isChecked ? ' disabled' : '') +
        ' oninput="ListeningType2.handleInput(' + qNum + ', this.value)">' +
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
          }
          
          var inputHtml = '<span class="' + gapClass + '"' + gapDataAttr + '>' +
            '<input type="text" class="' + inputClass + '"' +
            ' data-question="' + q.number + '"' +
            ' value="' + (userAnswer || '').replace(/"/g, '&quot;') + '"' +
            ' placeholder="..."' +
            (isChecked ? ' disabled' : '') +
            ' oninput="ListeningType2.handleInput(' + q.number + ', this.value)">' +
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
      }
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
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
    }
  };
})();
