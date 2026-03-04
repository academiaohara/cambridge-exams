// js/exercise-types/listening-type4.js
// Dual Matching - Listening Part 4

(function() {
  window.ListeningType4 = {

    initListeners: function() {
      var exercise = AppState.currentExercise;
      if (!exercise) return;

      var container = document.getElementById('selectable-text');
      if (!container) return;

      var task1 = exercise.content.task1;
      var task2 = exercise.content.task2;

      if (!task1 || !task2) return;

      var isChecked = AppState.answersChecked;
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
      html += '<div class="listening-type4-wrapper">';
      html += '<div class="listening-type4-tasks">';
      html += this._renderTask(task1, 1, isChecked);
      html += this._renderTask(task2, 2, isChecked);
      html += '</div>';
      html += '</div>';

      var noteCreator = container.querySelector('#note-creator');
      var wrapper = document.createElement('div');
      wrapper.className = 'listening-type4-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);
    },

    _renderTask: function(task, taskNum, isChecked) {
      var optionEntries = Object.entries(task.options || {});
      var optionsHTML = optionEntries.map(function(entry) {
        return '<div class="listening-type4-option"><strong>' + entry[0] + '</strong> ' + entry[1] + '</div>';
      }).join('');

      var self = this;
      var questionsHTML = task.questions.map(function(q) {
        var key = 't' + taskNum + '_' + q.number;
        var savedAnswer = (AppState.currentExercise.answers && AppState.currentExercise.answers[key]) || '';
        var selectClass = 'listening-type4-select';
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
            '<option value="">' + I18n.t('chooseOption') + '</option>' +
            optSelectHTML +
          '</select>';

        // Wrap incorrect answers with a tooltip showing the correct answer
        if (isIncorrect) {
          selectHTML = '<span class="listening-type4-answer-wrapper">' +
            selectHTML +
            '<span class="listening-type4-correct-tooltip">' + I18n.t('correctAnswer') + ': ' + q.correct + '</span>' +
          '</span>';
        }

        return '<div class="listening-type4-question">' +
          '<span class="listening-type4-speaker-label">' + I18n.t('speaker') + ' ' + q.speaker.replace('Speaker ', '') + '</span>' +
          '<span class="listening-type4-q-number">' + q.number + '</span>' +
          selectHTML +
        '</div>';
      }).join('');

      return '<div class="listening-type4-task">' +
        '<h4 class="listening-type4-task-title">' + I18n.t('task' + taskNum) + '</h4>' +
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
    }
  };
})();
