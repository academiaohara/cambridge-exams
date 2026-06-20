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
            '<option value="">' + 'Choose option' + '</option>' +
            optSelectHTML +
          '</select>';

        // Wrap incorrect answers with a tooltip showing the correct answer
        if (isIncorrect) {
          selectHTML = '<span class="listening-type4-answer-wrapper">' +
            selectHTML +
            '<span class="listening-type4-correct-tooltip">' + 'Correct answer' + ': ' + q.correct + '</span>' +
          '</span>';
        }

        var speakerNum = String(q.speaker || '').replace(/^Speaker\s*/i, '').trim();
        return '<div class="listening-type4-question' + (isDuoListening ? ' listening-type4-question--duo' : '') + '" data-listening-q="' + String(q.number) + '">' +
          '<span class="listening-type4-q-number">' + q.number + '</span>' +
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
    }
  };
})();
