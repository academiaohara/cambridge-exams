// js/exercise-types/listening-type4.js
// Dual Matching - Listening Part 4

(function() {
  window.ListeningType4 = {
    currentPlaying: null,

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const task1 = exercise.content.task1;
      const task2 = exercise.content.task2;

      if (!task1 || !task2) return;

      const isChecked = AppState.answersChecked;

      const html = `
        <div class="listening-type4-wrapper">
          <div class="listening-type4-tasks">
            ${this._renderTask(task1, 1, isChecked)}
            ${this._renderTask(task2, 2, isChecked)}
          </div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      wrapper.className = 'listening-type4-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);
    },

    _renderTask: function(task, taskNum, isChecked) {
      const optionEntries = Object.entries(task.options || {});
      const optionsHTML = optionEntries.map(([key, val]) =>
        `<div class="listening-type4-option"><strong>${key}</strong> ${val}</div>`
      ).join('');

      const questionsHTML = task.questions.map(q => {
        const key = `t${taskNum}_${q.number}`;
        const savedAnswer = AppState.currentExercise.answers?.[key] || '';
        let selectClass = 'listening-type4-select';
        if (isChecked) {
          selectClass += savedAnswer === q.correct ? ' correct' : ' incorrect';
        }

        const optSelectHTML = optionEntries.map(([k]) =>
          `<option value="${k}" ${savedAnswer === k ? 'selected' : ''}>${k}</option>`
        ).join('');

        return `
          <div class="listening-type4-question">
            <div class="listening-type4-audio-bar">
              <button class="listening-type4-play-btn"
                      onclick="ListeningType4.playExtract('${key}', this)">
                <i class="fas fa-play"></i>
              </button>
              <span class="listening-type4-speaker-label">${I18n.t('speaker')} ${q.number}</span>
              <div class="listening-type4-timeline">
                <div class="listening-type4-progress" id="lt4-progress-${key}" style="width:0%"></div>
              </div>
              <span class="listening-type4-time" id="lt4-time-${key}">00:00</span>
            </div>
            <select class="${selectClass}"
                    data-key="${key}"
                    ${isChecked ? 'disabled' : ''}
                    onchange="ListeningType4.handleSelect(${taskNum}, ${q.number}, this.value)">
              <option value="">${I18n.t('chooseOption')}</option>
              ${optSelectHTML}
            </select>
            ${isChecked && savedAnswer !== q.correct
              ? `<span class="listening-type4-correct-answer">✓ ${q.correct}</span>`
              : ''}
          </div>
        `;
      }).join('');

      return `
        <div class="listening-type4-task">
          <h4 class="listening-type4-task-title">${I18n.t('task' + taskNum)}</h4>
          <p class="listening-type4-instruction">${task.instruction}</p>
          <div class="listening-type4-options-list">${optionsHTML}</div>
          <div class="listening-type4-questions">${questionsHTML}</div>
        </div>
      `;
    },

    handleSelect: function(taskNum, qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[`t${taskNum}_${qNum}`] = value;
      Timer.updateScoreDisplay();
    },

    playExtract: function(key, btn) {
      if (this.currentPlaying && this.currentPlaying !== key) {
        this._stopExtract(this.currentPlaying);
      }

      const icon = btn.querySelector('i');
      if (icon.classList.contains('fa-play')) {
        icon.classList.replace('fa-play', 'fa-pause');
        this.currentPlaying = key;
        this._simulateProgress(key);
      } else {
        this._stopExtract(key);
      }
    },

    _stopExtract: function(key) {
      const btn = document.querySelector(`[onclick*="'${key}'"] i`);
      if (btn) btn.classList.replace('fa-pause', 'fa-play');
      this.currentPlaying = null;
    },

    SIMULATE_DURATION: 30,

    _simulateProgress: function(key) {
      const progressBar = document.getElementById(`lt4-progress-${key}`);
      const timeDisplay = document.getElementById(`lt4-time-${key}`);
      let seconds = 0;
      const duration = this.SIMULATE_DURATION;

      const interval = setInterval(() => {
        if (this.currentPlaying !== key) {
          clearInterval(interval);
          return;
        }
        seconds++;
        if (progressBar) progressBar.style.width = `${(seconds / duration) * 100}%`;
        if (timeDisplay) timeDisplay.textContent = `00:${seconds.toString().padStart(2, '0')}`;

        if (seconds >= duration) {
          clearInterval(interval);
          this._stopExtract(key);
        }
      }, 1000);
    },

    checkAnswers: function() {
      const exercise = AppState.currentExercise;
      const task1 = exercise.content.task1;
      const task2 = exercise.content.task2;
      let correct = 0;

      [task1, task2].forEach((task, idx) => {
        const taskNum = idx + 1;
        task.questions.forEach(q => {
          const key = `t${taskNum}_${q.number}`;
          if (exercise.answers?.[key] === q.correct) correct++;
        });
      });

      return correct;
    }
  };
})();
