// js/exercise-types/listening-type3.js
// B2 Listening Part 3: five speakers + options A–H (layout like C1 Listening Part 4 task panel)

(function() {
  window.ListeningType3 = {

    initListeners: function() {
      var exercise = AppState.currentExercise;
      if (!exercise || !exercise.content) return;

      var container = document.getElementById('toggle-questions-section') || document.getElementById('selectable-text');
      if (!container) return;
      if (container.querySelector('.listening-type3-container')) return;

      var texts = exercise.content.texts || {};
      var questions = exercise.content.questions || [];
      if (!questions.length || !Object.keys(texts).length) return;

      var isChecked = AppState.answersChecked;
      var html = '';

      var audioSource = exercise.audio_source || exercise.audioUrl || '';
      var hasAudioSource = false;
      try {
        if (audioSource) {
          var url = new URL(audioSource);
          hasAudioSource = url.protocol === 'https:' || url.protocol === 'http:';
        }
      } catch (e) {
        hasAudioSource = false;
      }

      if (hasAudioSource) {
        var safeUrl = audioSource.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
          .replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += '<div class="listening-type3-audio-section">';
        html += '<p><strong>Click play to start the listening test:</strong></p>';
        html += '<audio controls controlsList="nodownload" aria-label="Listening exercise audio">';
        html += '<source src="' + safeUrl + '" type="audio/mpeg">';
        html += '</audio>';
        html += '</div>';
      }

      html += '<div class="listening-type3-panel">';
      html += this._renderOptionsList(texts);
      html += '<div class="listening-type3-questions-col">';
      html += this._renderQuestions(questions, texts, isChecked);
      html += '</div>';
      html += '</div>';

      var noteCreator = container.querySelector('#note-creator');
      var wrapper = document.createElement('div');
      wrapper.className = 'listening-type3-container';
      wrapper.innerHTML = html;
      if (noteCreator) {
        container.insertBefore(wrapper, noteCreator);
      } else {
        container.appendChild(wrapper);
      }
    },

    _escapeHtml: function(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    _renderOptionsList: function(texts) {
      var letters = Object.keys(texts).sort(function(a, b) { return a.localeCompare(b); });
      var optionsHTML = letters.map(function(letter) {
        return '<div class="listening-type3-option"><strong>' + letter + '</strong> ' +
          this._escapeHtml(texts[letter]) + '</div>';
      }.bind(this)).join('');

      return '<div class="listening-type3-options-col">' +
        '<div class="listening-type3-options-list">' + optionsHTML + '</div>' +
        '</div>';
    },

    _renderQuestions: function(questions, texts, isChecked) {
      var letters = Object.keys(texts).sort(function(a, b) { return a.localeCompare(b); });
      var self = this;

      return questions.map(function(q) {
        var qNum = q.number;
        var savedAnswer = (AppState.currentExercise.answers && AppState.currentExercise.answers[qNum]) || '';
        var selectClass = 'listening-type3-select';
        if (isChecked) {
          if (savedAnswer === q.correct) {
            selectClass += ' correct';
          } else {
            selectClass += ' incorrect';
          }
        }

        var optSelectHTML = letters.map(function(L) {
          return '<option value="' + L + '"' + (savedAnswer === L ? ' selected' : '') + '>' + L + '</option>';
        }).join('');

        var selectHTML = '<select class="' + selectClass + '" data-qnum="' + qNum + '"' +
          (isChecked ? ' disabled' : '') +
          ' onchange="ListeningType3.handleSelect(' + qNum + ', this.value)">' +
          '<option value="">Choose option</option>' +
          optSelectHTML +
          '</select>';

        var speakerLabel = q.speaker || ('Speaker ' + qNum);
        var speakerNum = String(speakerLabel).replace(/^Speaker\s*/i, '').trim();

        return '<div class="listening-type3-question">' +
          '<span class="listening-type3-speaker-label">Speaker ' + self._escapeHtml(speakerNum) + '</span>' +
          '<span class="listening-type3-q-number">' + qNum + '</span>' +
          selectHTML +
          '</div>';
      }).join('');
    },

    handleSelect: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },

    checkAnswers: function() {
      var questions = AppState.currentExercise.content.questions || [];
      var correct = 0;
      questions.forEach(function(q) {
        var key = q.number;
        if (AppState.currentExercise.answers && AppState.currentExercise.answers[key] === q.correct) {
          correct++;
        }
      });
      return correct;
    },

    reRender: function() {
      var existing = document.querySelector('.listening-type3-container');
      if (existing) existing.remove();
      this.initListeners();
    }
  };
})();
