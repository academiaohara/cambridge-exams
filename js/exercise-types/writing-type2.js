// js/exercise-types/writing-type2.js
// Choice writing - Writing Part 2

(function() {
  window.WritingType2 = {
    selectedTaskId: null,

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const tasks = exercise.content.tasks || [];

      let tasksHTML = tasks.map(task => `
        <div class="writing-type2-task-option" data-task-id="${task.id}"
             onclick="WritingType2.selectTask('${task.id}')">
          <div class="writing-type2-task-header">
            <span class="writing-type2-task-badge">${task.type}</span>
            <span class="writing-type2-task-title">${task.title}</span>
          </div>
          <p class="writing-type2-task-preview">${task.prompt.substring(0, 100)}${task.prompt.length > 100 ? '…' : ''}</p>
        </div>
      `).join('');

      const html = `
        <div class="writing-type2-wrapper">
          <div class="writing-type2-select-section">
            <h3><i class="fas fa-tasks"></i> ${I18n.t('selectTask')}</h3>
            <div class="writing-type2-tasks-list">
              ${tasksHTML}
            </div>
          </div>
          <div class="writing-type2-writing-section" id="writing-type2-writing-area" style="display:none;">
            <div class="writing-type2-prompt" id="writing-type2-prompt-box"></div>
            <div class="writing-stats-bar">
              <div class="writing-stats-words">
                <span id="writing-type2-count">0</span><span class="writing-stats-sep">/260</span>
                <div class="writing-stats-progress">
                  <div class="writing-stats-progress-fill" id="writing-type2-progress" style="width:0%"></div>
                </div>
              </div>
            </div>
            <textarea class="writing-type2-textarea writing-textarea"
                      placeholder="${I18n.t('writeEssay')}..."
                      oninput="WritingType2.handleInput(this.value)"></textarea>
          </div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      wrapper.className = 'writing-type2-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      const checkBtn = document.querySelector('.btn-check');
      const explBtn = document.querySelector('.btn-explanations');
      if (checkBtn) checkBtn.style.display = 'none';
      if (explBtn) explBtn.style.display = 'none';

      // Restore saved state
      const savedTaskId = AppState.currentExercise.answers?.taskId;
      if (savedTaskId) this.selectTask(savedTaskId, true);
    },

    selectTask: function(taskId, silent) {
      this.selectedTaskId = taskId;

      document.querySelectorAll('.writing-type2-task-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.taskId === taskId);
      });

      const tasks = AppState.currentExercise.content.tasks || [];
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const area = document.getElementById('writing-type2-writing-area');
      const promptBox = document.getElementById('writing-type2-prompt-box');

      if (promptBox) {
        promptBox.innerHTML = `
          <span class="writing-type2-task-badge">${task.type}</span>
          <h4>${task.title}</h4>
          <p>${task.prompt.replace(/\n/g, '<br>')}</p>
        `;
      }
      if (area) area.style.display = 'block';

      // Update the word limit display for this task
      const wordLimit = task.wordLimit || AppState.currentExercise.content.wordLimit || '220-260';
      const max = this._parseWordLimit(wordLimit).max;
      const sepEl = area && area.querySelector('.writing-stats-sep');
      if (sepEl) sepEl.textContent = '/' + max;

      if (!silent) {
        if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
        AppState.currentExercise.answers.taskId = taskId;
      }

      const textarea = area?.querySelector('.writing-type2-textarea');
      if (textarea) {
        const savedText = AppState.currentExercise.answers?.[taskId] || '';
        textarea.value = savedText;
        this._updateStats(savedText);
      }
    },

    _parseWordLimit: function(wordLimit) {
      var parts = String(wordLimit).split('-').map(function(n) { return parseInt(n.trim(), 10); });
      if (parts.length === 2) return { min: parts[0] || 0, max: parts[1] || parts[0] };
      return { min: 0, max: parts[0] || 260 };
    },

    _getWordCount: function(text) {
      return text.trim() ? text.trim().split(/\s+/).length : 0;
    },

    _updateStats: function(text) {
      const count = this._getWordCount(text);
      const task = (AppState.currentExercise.content.tasks || []).find(t => t.id === this.selectedTaskId);
      const wordLimit = task?.wordLimit || AppState.currentExercise?.content?.wordLimit || '220-260';
      const { min, max } = this._parseWordLimit(wordLimit);

      const countEl = document.getElementById('writing-type2-count');
      if (countEl) countEl.textContent = count;

      const progressEl = document.getElementById('writing-type2-progress');
      if (progressEl) {
        const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
        progressEl.style.width = pct + '%';
        progressEl.className = 'writing-stats-progress-fill' +
          (count < min ? ' progress-under' : count <= max ? ' progress-ok' : ' progress-over');
      }
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      if (this.selectedTaskId) AppState.currentExercise.answers[this.selectedTaskId] = value;
      this._updateStats(value);
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();

