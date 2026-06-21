// js/exercise-types/listening-type4.js
// Dual Matching - Listening Part 4

(function() {
  window.ListeningType4 = {

    initListeners: function() {
      var exercise = AppState.currentExercise;
      if (!exercise) return;

      var container = document.getElementById('toggle-questions-section') || document.getElementById('selectable-text');
      if (!container) return;

      var task1 = exercise.content.task1;
      var task2 = exercise.content.task2;

      if (!task1 || !task2) return;

      var isChecked = AppState.answersChecked;
      var isDuoListening =
        typeof Utils !== 'undefined' && Utils.isDuoListeningSection();
      var html = '';

      // Audio player at the top (same pattern as listening-type1/type2)
      var audioSource = exercise.audio_source || exercise.audioUrl || '';
      var hasAudioSource = false;
      try {
        if (audioSource) {
          var url = new URL(audioSource);
          hasAudioSource = url.protocol === 'https:' || url.protocol === 'http:';
        }
      } catch(e) { hasAudioSource = false; }

      if (hasAudioSource) {
        var safeUrl = audioSource.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += '<div class="listening-type4-audio-section">';
        html += '<p><strong>Click play to start the listening test:</strong></p>';
        html += '<audio controls controlsList="nodownload" aria-label="Listening exercise audio">';
        html += '<source src="' + safeUrl + '" type="audio/mpeg">';
        html += '</audio>';
        html += '</div>';
      }

      // Both tasks side by side
      html += '<div class="listening-type4-wrapper' + (isDuoListening ? ' listening-type4-wrapper--duo' : '') + '">';
      html += '<div class="listening-type4-tasks">';
      html += this._renderTask(task1, 1, isChecked, isDuoListening);
      html += this._renderTask(task2, 2, isChecked, isDuoListening);
      html += '</div>';
      html += '</div>';

      var noteCreator = container.querySelector('#note-creator');
      var wrapper = document.createElement('div');
      wrapper.className = 'listening-type4-container' + (isDuoListening ? ' listening-type4-container--duo' : '');
      wrapper.innerHTML = html;
      if (noteCreator) {
        container.insertBefore(wrapper, noteCreator);
      } else {
        container.appendChild(wrapper);
      }
    },

    _renderTask: function(task, taskNum, isChecked, isDuoListening) {
      var optionEntries = Object.entries(task.options || {});
      var optionsHTML = optionEntries.map(function(entry) {
        return '<div class="listening-type4-option"><strong class="listening-type4-option-letter">' + entry[0] + '</strong><span class="listening-type4-option-text">' + entry[1] + '</span></div>';
      }).join('');

      var self = this;
      var questionsHTML = task.questions.map(function(q) {
        var key = 't' + taskNum + '_' + q.number;
        var savedAnswer = (AppState.currentExercise.answers && AppState.currentExercise.answers[key]) || '';
        var selectClass = 'listening-type4-select' + (isDuoListening ? ' listening-type4-select--duo' : '');
        var isIncorrect = false;
        if (isChecked) {
          if (savedAnswer === q.correct) {
            selectClass += ' correct';
          } else {
            selectClass += ' incorrect';
            isIncorrect = true;
          }
        }

        var optSelectHTML = optionEntries.map(function(entry) {
          return '<option value="' + entry[0] + '"' + (savedAnswer === entry[0] ? ' selected' : '') + '>' + entry[0] + '</option>';
        }).join('');

        var selectHTML = '<select class="' + selectClass + '" data-key="' + key + '"' +
            (isChecked ? ' disabled' : '') +
            ' onchange="ListeningType4.handleSelect(' + taskNum + ', ' + q.number + ', this.value)">' +
            '<option value="" disabled' + (savedAnswer ? '' : ' selected') + ' hidden></option>' +
            optSelectHTML +
          '</select>';

        selectHTML = '<span class="listening-type4-answer-wrapper' + (isIncorrect ? ' listening-type4-answer-wrapper--incorrect' : '') + '">' +
          selectHTML +
          (isIncorrect ? '<span class="listening-type4-correct-tooltip">' + 'Correct answer' + ': ' + q.correct + '</span>' : '') +
        '</span>';

        var numClass = 'listening-type4-q-number';
        if (isChecked && typeof Utils !== 'undefined') {
          var stateClass = Utils.getQuestionNumberStateClass({
            answer: savedAnswer,
            correct: q.correct,
            isChecked: isChecked,
            questionType: 'dual-matching'
          });
          if (stateClass) numClass += ' ' + stateClass;
        }

        var speakerNum = String(q.speaker || '').replace(/^Speaker\s*/i, '').trim();
        return '<div class="listening-type4-question' + (isDuoListening ? ' listening-type4-question--duo' : '') + '" data-listening-q="' + String(q.number) + '">' +
          '<span class="' + numClass + '" data-qnum="' + q.number + '">' + q.number + '</span>' +
          '<span class="listening-type4-speaker-label">' + 'Speaker ' + speakerNum + '</span>' +
          selectHTML +
        '</div>';
      }).join('');

      var taskTitle = (task.title && String(task.title).trim()) || ('Task ' + taskNum);
      return '<div class="listening-type4-task' + (isDuoListening ? ' listening-type4-task--duo' : '') + '">' +
        '<h4 class="listening-type4-task-title">' + taskTitle + '</h4>' +
        '<p class="listening-type4-instruction">' + task.instruction + '</p>' +
        '<div class="listening-type4-options-list">' + optionsHTML + '</div>' +
        '<div class="listening-type4-questions">' + questionsHTML + '</div>' +
      '</div>';
    },

    handleSelect: function(taskNum, qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers['t' + taskNum + '_' + qNum] = value;
      Timer.updateScoreDisplay();
    },

    checkAnswers: function() {
      var exercise = AppState.currentExercise;
      var task1 = exercise.content.task1;
      var task2 = exercise.content.task2;
      var correct = 0;

      [task1, task2].forEach(function(task, idx) {
        var taskNum = idx + 1;
        task.questions.forEach(function(q) {
          var key = 't' + taskNum + '_' + q.number;
          if (exercise.answers && exercise.answers[key] === q.correct) correct++;
        });
      });

      return correct;
    },

    reRender: function() {
      var existing = document.querySelector('.listening-type4-container');
      if (existing) existing.remove();
      this.initListeners();
    },

    _getCorrectForKey: function(key) {
      var exercise = AppState.currentExercise;
      if (!exercise || !exercise.content || !key) return '';
      var match = String(key).match(/^t(\d+)_(\d+)$/);
      if (!match) return '';
      var task = match[1] === '1' ? exercise.content.task1 : exercise.content.task2;
      if (!task || !task.questions) return '';
      var qNum = parseInt(match[2], 10);
      var q = task.questions.find(function(item) { return item.number === qNum; });
      return q && q.correct ? q.correct : '';
    },

    setAnswerMode: function(mode) {
      document.querySelectorAll('.listening-type4-select[data-key]').forEach(function(sel) {
        var key = sel.getAttribute('data-key') || '';
        var correct = ListeningType4._getCorrectForKey(key);
        var wrapper = sel.closest('.listening-type4-answer-wrapper');
        var tooltip = wrapper && wrapper.querySelector('.listening-type4-correct-tooltip');

        if (mode === 'correct') {
          if (sel.dataset.lt4ExplPrev === undefined) {
            sel.dataset.lt4ExplPrev = sel.value;
          }
          if (correct) sel.value = correct;
          sel.classList.remove('correct', 'incorrect');
          sel.classList.add('listening-type4-select-expl-show');
          if (wrapper) wrapper.classList.remove('listening-type4-answer-wrapper--incorrect');
          if (tooltip) tooltip.style.display = 'none';
        } else {
          if (sel.dataset.lt4ExplPrev !== undefined) {
            sel.value = sel.dataset.lt4ExplPrev;
            delete sel.dataset.lt4ExplPrev;
          }
          sel.classList.remove('listening-type4-select-expl-show');
          if (tooltip) tooltip.style.display = '';
          if (AppState.answersChecked) {
            var isCorrect = sel.value === correct;
            sel.classList.toggle('correct', isCorrect);
            sel.classList.toggle('incorrect', !isCorrect);
            if (wrapper) {
              wrapper.classList.toggle('listening-type4-answer-wrapper--incorrect', !isCorrect);
            }
          }
        }
      });
    },

    syncExplanationActiveQuestion: function(qNum) {
      document.querySelectorAll('.listening-type4-question').forEach(function(row) {
        var isActive = String(row.getAttribute('data-listening-q')) === String(qNum);
        row.classList.toggle('listening-type4-question--expl-active', isActive);
      });
    },

    applyExplanationMode: function() {
      this.setAnswerMode('correct');
      var container = document.querySelector('.listening-type4-container');
      if (container) container.classList.add('listening-type4-explanation-mode');
      var activeQ = typeof AppState !== 'undefined' ? AppState.explanationActiveQuestion : null;
      if (activeQ != null) this.syncExplanationActiveQuestion(activeQ);
    },

    removeExplanationMode: function() {
      this.setAnswerMode('student');
      var container = document.querySelector('.listening-type4-container');
      if (container) container.classList.remove('listening-type4-explanation-mode');
      document.querySelectorAll('.listening-type4-question--expl-active').forEach(function(row) {
        row.classList.remove('listening-type4-question--expl-active');
      });
    }
  };
})();
