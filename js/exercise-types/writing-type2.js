// js/exercise-types/writing-type2.js
// Choice writing - Writing Part 2

(function() {
  window.WritingType2 = {
    selectedTaskId: null,
    _autoEvalTimer: null,
    _debouncedInput: null,
    _lastProgressiveWordCount: 0,
    _isEvaluating: false,
    _lastErrors: [],

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
              <div class="writing-stats-richness">
                <span class="writing-stats-label">${I18n.t('lexicalRichness')}:</span>
                <span class="richness-badge richness-none" id="writing-type2-richness-badge">—</span>
              </div>
              <div class="writing-stats-errors" id="writing-type2-errors-stat">
                <i class="fas fa-exclamation-circle"></i>
                <span id="writing-type2-error-count">0</span> ${I18n.t('errorsDetected')}
              </div>
            </div>
            <textarea class="writing-type2-textarea writing-textarea"
                      placeholder="${I18n.t('writeEssay')}..."
                      oninput="WritingType2.handleInput(this.value)"></textarea>
            <div class="writing-type2-actions">
              <button class="btn-evaluate-ai" onclick="WritingType2.evaluateWithAI()">
                <i class="fas fa-robot"></i> ${I18n.t('evaluateAI')}
              </button>
              <span class="writing-evaluating-indicator" id="writing-type2-evaluating" style="display:none;">
                <i class="fas fa-spinner fa-spin"></i> ${I18n.t('evaluating')}
              </span>
            </div>
            <div class="writing-suggestions-panel" id="writing-type2-suggestions" style="display:none;">
              <h4><i class="fas fa-lightbulb"></i> ${I18n.t('writingSuggestions')}</h4>
              <div class="writing-suggestions-list" id="writing-type2-suggestions-list"></div>
            </div>
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

      this._debouncedInput = Debounce(this._checkProgressiveEval.bind(this), 500);
      this._lastProgressiveWordCount = 0;
      this._lastErrors = [];

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
        this._lastProgressiveWordCount = this._getWordCount(savedText);
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

      if (count >= 20) this._updateLexicalRichness(text);
    },

    _updateLexicalRichness: function(text) {
      const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
      if (!words.length) return;
      const unique = new Set(words);
      const ttr = unique.size / words.length;

      var label, cls;
      if (ttr > 0.6) { label = I18n.t('lexicalGood'); cls = 'richness-good'; }
      else if (ttr > 0.4) { label = I18n.t('lexicalMedium'); cls = 'richness-medium'; }
      else { label = I18n.t('lexicalLow'); cls = 'richness-low'; }

      const badgeEl = document.getElementById('writing-type2-richness-badge');
      if (badgeEl) {
        badgeEl.textContent = label;
        badgeEl.className = 'richness-badge ' + cls;
      }
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      if (this.selectedTaskId) AppState.currentExercise.answers[this.selectedTaskId] = value;
      this._updateStats(value);
      this._resetAutoEvalTimer();
      if (this._debouncedInput) this._debouncedInput(value);
    },

    _checkProgressiveEval: function(value) {
      const count = this._getWordCount(value);
      if (count >= this._lastProgressiveWordCount + 100) {
        this._lastProgressiveWordCount = Math.floor(count / 100) * 100;
        this._triggerEvaluation(true);
      }
    },

    _resetAutoEvalTimer: function() {
      clearTimeout(this._autoEvalTimer);
      this._autoEvalTimer = setTimeout(function() {
        WritingType2._triggerEvaluation(true);
      }, 120000);
    },

    _triggerEvaluation: function(auto) {
      if (this._isEvaluating) return;
      const essay = AppState.currentExercise.answers?.[this.selectedTaskId || 1] || '';
      if (!essay.trim()) return;
      this.evaluateWithAI(auto);
    },

    evaluateWithAI: function(auto) {
      if (this._isEvaluating) return;
      const essay = AppState.currentExercise.answers?.[this.selectedTaskId || 1] || '';
      if (!essay.trim()) {
        if (!auto) alert(I18n.t('writeEssay'));
        return;
      }

      this._isEvaluating = true;
      const indicator = document.getElementById('writing-type2-evaluating');
      if (indicator) indicator.style.display = 'inline-flex';

      const tasks = AppState.currentExercise.content.tasks || [];
      const task = tasks.find(t => t.id === this.selectedTaskId) || {};
      const wordLimit = task.wordLimit || AppState.currentExercise.content.wordLimit || '220-260';

      const resultsDiv = document.getElementById('writing-type2-ai-results');
      const contentDiv = document.getElementById('writing-type2-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.innerHTML =
        '<div class="writing-eval-loading"><i class="fas fa-spinner fa-spin"></i> ' + I18n.t('evaluating') + '</div>';

      const self = this;
      CambridgeEvaluation.evaluateWriting(essay, task.prompt || '', wordLimit, task.type || 'Writing')
        .then(function(result) {
          if (contentDiv) contentDiv.innerHTML = self._renderEvalResult(result);
          if (result && typeof result === 'object' && result.language && Array.isArray(result.language.errors)) {
            self._lastErrors = result.language.errors;
            self._updateErrorCount(result.language.errors.length);
            self._showSuggestions(result.language.errors);
          }
        })
        .catch(function() {
          if (contentDiv) contentDiv.textContent = I18n.t('aiError');
        })
        .finally(function() {
          self._isEvaluating = false;
          if (indicator) indicator.style.display = 'none';
        });
    },

    _renderEvalResult: function(result) {
      if (!result || typeof result !== 'object') {
        return '<pre class="writing-type2-ai-text">' + (result || '') + '</pre>';
      }
      const criteria = [
        { key: 'content', label: 'Content' },
        { key: 'communicativeAchievement', label: 'Communicative Achievement' },
        { key: 'organization', label: 'Organization' },
        { key: 'language', label: 'Language' }
      ];
      let html = '<div class="writing-eval-results">';
      if (result.totalScore !== undefined) {
        html += '<div class="writing-eval-total">Total: ' + result.totalScore + '/20</div>';
      }
      criteria.forEach(function(c) {
        const criterion = result[c.key];
        if (!criterion) return;
        const score = criterion.score || 0;
        html += '<div class="writing-eval-criterion">' +
          '<div class="writing-eval-criterion-header">' +
            '<span class="writing-eval-criterion-name">' + c.label + '</span>' +
            '<span class="writing-eval-criterion-score">' + score + '/5</span>' +
          '</div>' +
          '<div class="writing-eval-bar"><div class="writing-eval-bar-fill" style="width:' + (score * 20) + '%"></div></div>' +
          '<p class="writing-eval-justification">' + (criterion.justification || '') + '</p>' +
        '</div>';
      });
      if (result.overallComments) {
        html += '<div class="writing-eval-overall"><strong>Overall:</strong> ' + result.overallComments + '</div>';
      }
      html += '</div>';
      return html;
    },

    _updateErrorCount: function(count) {
      const el = document.getElementById('writing-type2-error-count');
      if (el) el.textContent = count;
    },

    _showSuggestions: function(errors) {
      const panel = document.getElementById('writing-type2-suggestions');
      const list = document.getElementById('writing-type2-suggestions-list');
      if (!panel || !list) return;
      if (!errors || !errors.length) {
        panel.style.display = 'none';
        return;
      }
      const self = this;
      panel.style.display = 'block';
      list.innerHTML = errors.map(function(err, i) {
        return '<div class="writing-suggestion-item">' +
          '<span class="suggestion-original">' + self._escapeHtml(err.original) + '</span>' +
          '<i class="fas fa-arrow-right suggestion-arrow"></i>' +
          '<span class="suggestion-fix">' + self._escapeHtml(err.suggestion) + '</span>' +
          '<button class="btn-apply-fix" onclick="WritingType2.applyFix(' + i + ')">' +
            '<i class="fas fa-check"></i> ' + I18n.t('applyFix') +
          '</button>' +
        '</div>';
      }).join('');
    },

    applyFix: function(index) {
      const error = this._lastErrors[index];
      if (!error) return;
      const textarea = document.querySelector('.writing-type2-textarea');
      if (!textarea) return;
      const newText = textarea.value.replace(error.original, error.suggestion);
      textarea.value = newText;
      this.handleInput(newText);
    },

    _escapeHtml: function(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();

