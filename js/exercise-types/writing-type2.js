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
            <textarea class="writing-type2-textarea writing-textarea"
                      placeholder="${I18n.t('writeEssay')}..."
                      oninput="WritingType2.handleInput(this.value)"></textarea>
            <div class="writing-type2-word-count">
              <span id="writing-type2-count">0</span> ${I18n.t('wordsWritten')}
            </div>
            <div class="writing-type2-actions">
              <button class="btn-evaluate-ai" onclick="WritingType2.evaluateWithAI()">
                <i class="fas fa-robot"></i> ${I18n.t('evaluateAI')}
              </button>
              <button class="btn-set-api-key" onclick="WritingType2.toggleApiKeyInput()">
                <i class="fas fa-key"></i> ${I18n.t('setApiKey')}
              </button>
            </div>
            <div class="writing-api-key-row" id="writing-type2-api-key-row" style="display:none;">
              <input type="password" class="writing-api-key-input" id="writing-type2-api-key-input"
                     placeholder="${I18n.t('apiKeyPrompt')}" />
              <button class="btn-save-api-key" onclick="WritingType2.saveApiKey()">
                <i class="fas fa-check"></i>
              </button>
            </div>
            <div class="writing-inline-msg" id="writing-type2-msg" style="display:none;"></div>
            <div class="writing-type2-ai-results" id="writing-type2-ai-results" style="display:none;">
              <h4><i class="fas fa-star"></i> ${I18n.t('aiEvaluation')}</h4>
              <div id="writing-type2-ai-content"></div>
            </div>
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

      if (!silent) {
        if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
        AppState.currentExercise.answers.taskId = taskId;
      }

      const textarea = area?.querySelector('.writing-type2-textarea');
      if (textarea) {
        const savedText = AppState.currentExercise.answers?.[taskId] || '';
        textarea.value = savedText;
        this._updateCount(savedText);
      }
    },

    _updateCount: function(text) {
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      const el = document.getElementById('writing-type2-count');
      if (el) el.textContent = count;
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      if (this.selectedTaskId) AppState.currentExercise.answers[this.selectedTaskId] = value;
      this._updateCount(value);
    },

    _showMsg: function(text) {
      const msg = document.getElementById('writing-type2-msg');
      if (!msg) return;
      msg.textContent = text;
      msg.style.display = 'block';
      clearTimeout(this._msgTimer);
      this._msgTimer = setTimeout(() => { msg.style.display = 'none'; }, 4000);
    },

    toggleApiKeyInput: function() {
      const row = document.getElementById('writing-type2-api-key-row');
      if (!row) return;
      const visible = row.style.display !== 'none';
      row.style.display = visible ? 'none' : 'flex';
      if (!visible) {
        const input = document.getElementById('writing-type2-api-key-input');
        if (input) {
          input.value = localStorage.getItem('gemini_api_key') || '';
          input.focus();
        }
      }
    },

    saveApiKey: function() {
      const input = document.getElementById('writing-type2-api-key-input');
      if (!input) return;
      const key = input.value.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
      } else {
        localStorage.removeItem('gemini_api_key');
      }
      const row = document.getElementById('writing-type2-api-key-row');
      if (row) row.style.display = 'none';
      this._showMsg(I18n.t('apiKeySaved'));
    },

    sendWriting: async function(text) {
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.corrected;
    },

    evaluateWithAI: function() {
      const essay = AppState.currentExercise.answers?.[this.selectedTaskId || 1] || '';
      if (!essay.trim()) {
        this._showMsg(I18n.t('writeEssay'));
        return;
      }

      const tasks = AppState.currentExercise.content.tasks || [];
      const task = tasks.find(t => t.id === this.selectedTaskId) || {};

      const resultsDiv = document.getElementById('writing-type2-ai-results');
      const contentDiv = document.getElementById('writing-type2-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.textContent = I18n.t('evaluating');

      // Try server endpoint first, fall back to client-side Gemini
      this.sendWriting(essay)
        .then(text => {
          if (contentDiv) contentDiv.innerHTML = `<pre class="writing-type2-ai-text">${text}</pre>`;
        })
        .catch(() => {
          CambridgeEvaluation.evaluateWriting(essay, task.prompt || '', '220-260', task.type || 'Writing')
            .then(text => {
              if (contentDiv) contentDiv.innerHTML = `<pre class="writing-type2-ai-text">${text}</pre>`;
            })
            .catch(() => {
              if (contentDiv) contentDiv.textContent = I18n.t('aiError');
            });
        });
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
