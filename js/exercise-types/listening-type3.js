// js/exercise-types/listening-type3.js
// B2 Listening Part 3: five speakers + options A–H (single task panel like C1 Listening Part 4)

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
      var isDuoListening =
        typeof Utils !== 'undefined' && Utils.isDuoListeningSection();
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

      html += '<div class="listening-type3-wrapper' + (isDuoListening ? ' listening-type3-wrapper--duo' : '') + '">';
      html += '<div class="listening-type3-tasks">';
      html += this._renderTask(exercise, texts, questions, isChecked, isDuoListening);
      html += '</div>';
      html += '</div>';

      var noteCreator = container.querySelector('#note-creator');
      var wrapper = document.createElement('div');
      wrapper.className = 'listening-type3-container' + (isDuoListening ? ' listening-type3-container--duo' : '');
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

    _getTaskMeta: function(exercise, questions) {
      var extract = exercise.content.extracts && exercise.content.extracts[0];
      var title = 'Task';
      var instruction = exercise.description || exercise.instructions || '';

      if (extract && extract.context) {
        title = extract.context;
      }

      if (!instruction && questions.length) {
        var nums = questions.map(function(q) { return q.number; }).sort(function(a, b) { return a - b; });
        instruction = 'For questions ' + nums[0] + '–' + nums[nums.length - 1] +
          ', choose from the list (A–H) the reason each speaker gives.';
      }

      return { title: title, instruction: instruction };
    },

    _renderTask: function(exercise, texts, questions, isChecked, isDuoListening) {
      var meta = this._getTaskMeta(exercise, questions);
      var optionEntries = Object.keys(texts).sort(function(a, b) { return a.localeCompare(b); })
        .map(function(letter) { return [letter, texts[letter]]; });

      var optionsHTML = optionEntries.map(function(entry) {
        return '<div class="listening-type3-option"><strong class="listening-type3-option-letter">' + entry[0] +
          '</strong><span class="listening-type3-option-text">' + this._escapeHtml(entry[1]) + '</span></div>';
      }.bind(this)).join('');

      var self = this;
      var questionsHTML = questions.map(function(q) {
        var qNum = q.number;
        var savedAnswer = (AppState.currentExercise.answers && AppState.currentExercise.answers[qNum]) || '';
        var selectClass = 'listening-type3-select' + (isDuoListening ? ' listening-type3-select--duo' : '');
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

        var selectHTML = '<select class="' + selectClass + '" data-qnum="' + qNum + '"' +
            (isChecked ? ' disabled' : '') +
            ' onchange="ListeningType3.handleSelect(' + qNum + ', this.value)">' +
            '<option value="" disabled' + (savedAnswer ? '' : ' selected') + ' hidden></option>' +
            optSelectHTML +
          '</select>';

        selectHTML = '<span class="listening-type3-answer-wrapper' + (isIncorrect ? ' listening-type3-answer-wrapper--incorrect' : '') + '">' +
          selectHTML +
          (isIncorrect ? '<span class="listening-type3-correct-tooltip">Correct answer: ' + q.correct + '</span>' : '') +
        '</span>';

        var numClass = 'listening-type3-q-number';
        if (isChecked && typeof Utils !== 'undefined') {
          var stateClass = Utils.getQuestionNumberStateClass({
            answer: savedAnswer,
            correct: q.correct,
            isChecked: isChecked,
            questionType: 'speaker-matching'
          });
          if (stateClass) numClass += ' ' + stateClass;
        }

        var speakerNum = String(q.speaker || '').replace(/^Speaker\s*/i, '').trim();
        return '<div class="listening-type3-question' + (isDuoListening ? ' listening-type3-question--duo' : '') + '" data-listening-q="' + String(qNum) + '">' +
          '<span class="' + numClass + '" data-qnum="' + qNum + '">' + qNum + '</span>' +
          '<span class="listening-type3-speaker-label">Speaker ' + self._escapeHtml(speakerNum) + '</span>' +
          selectHTML +
        '</div>';
      }).join('');

      return '<div class="listening-type3-task' + (isDuoListening ? ' listening-type3-task--duo' : '') + '">' +
        '<h4 class="listening-type3-task-title">' + self._escapeHtml(meta.title) + '</h4>' +
        '<p class="listening-type3-instruction">' + self._escapeHtml(meta.instruction) + '</p>' +
        '<div class="listening-type3-options-list">' + optionsHTML + '</div>' +
        '<div class="listening-type3-questions">' + questionsHTML + '</div>' +
      '</div>';
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
    },

    _getCorrectForQNum: function(qNum) {
      var exercise = AppState.currentExercise;
      if (!exercise || !exercise.content || !exercise.content.questions) return '';
      var q = exercise.content.questions.find(function(item) { return item.number === qNum; });
      return q && q.correct ? q.correct : '';
    },

    setAnswerMode: function(mode) {
      document.querySelectorAll('.listening-type3-select[data-qnum]').forEach(function(sel) {
        var qNum = parseInt(sel.getAttribute('data-qnum'), 10);
        var correct = ListeningType3._getCorrectForQNum(qNum);
        var wrapper = sel.closest('.listening-type3-answer-wrapper');
        var tooltip = wrapper && wrapper.querySelector('.listening-type3-correct-tooltip');

        if (mode === 'correct') {
          if (sel.dataset.lt3ExplPrev === undefined) {
            sel.dataset.lt3ExplPrev = sel.value;
          }
          if (correct) sel.value = correct;
          sel.classList.remove('correct', 'incorrect');
          sel.classList.add('listening-type3-select-expl-show');
          if (wrapper) wrapper.classList.remove('listening-type3-answer-wrapper--incorrect');
          if (tooltip) tooltip.style.display = 'none';
        } else {
          if (sel.dataset.lt3ExplPrev !== undefined) {
            sel.value = sel.dataset.lt3ExplPrev;
            delete sel.dataset.lt3ExplPrev;
          }
          sel.classList.remove('listening-type3-select-expl-show');
          if (tooltip) tooltip.style.display = '';
          if (AppState.answersChecked) {
            var isCorrect = sel.value === correct;
            sel.classList.toggle('correct', isCorrect);
            sel.classList.toggle('incorrect', !isCorrect);
            if (wrapper) {
              wrapper.classList.toggle('listening-type3-answer-wrapper--incorrect', !isCorrect);
            }
          }
        }
      });
    },

    syncExplanationActiveQuestion: function(qNum) {
      document.querySelectorAll('.listening-type3-question').forEach(function(row) {
        var isActive = String(row.getAttribute('data-listening-q')) === String(qNum);
        row.classList.toggle('listening-type3-question--expl-active', isActive);
      });
    },

    applyExplanationMode: function() {
      this.setAnswerMode('correct');
      var container = document.querySelector('.listening-type3-container');
      if (container) container.classList.add('listening-type3-explanation-mode');
      var activeQ = typeof AppState !== 'undefined' ? AppState.explanationActiveQuestion : null;
      if (activeQ != null) this.syncExplanationActiveQuestion(activeQ);
    },

    removeExplanationMode: function() {
      this.setAnswerMode('student');
      var container = document.querySelector('.listening-type3-container');
      if (container) container.classList.remove('listening-type3-explanation-mode');
      document.querySelectorAll('.listening-type3-question--expl-active').forEach(function(row) {
        row.classList.remove('listening-type3-question--expl-active');
      });
    }
  };
})();
