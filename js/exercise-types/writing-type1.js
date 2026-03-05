// js/exercise-types/writing-type1.js
// Essay writing - Writing Part 1

(function() {
  window.WritingType1 = {

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const question = exercise.content.question || '';
      const wordLimit = exercise.content.wordLimit || '220-260';
      const savedAnswer = exercise.answers?.[1] || '';
      const maxWords = this._parseWordLimit(wordLimit).max;

      const html = `
        <div class="writing-type1-wrapper">
          <div class="writing-type1-prompt">
            <h3><i class="fas fa-pencil-alt"></i> ${I18n.t('writeEssay')}</h3>
            <p class="writing-type1-question">${question}</p>
            <div class="writing-type1-word-limit">
              <i class="fas fa-info-circle"></i> ${wordLimit} ${I18n.t('wordsWritten')}
            </div>
          </div>
          <div class="writing-stats-bar">
            <div class="writing-stats-words">
              <span id="writing-type1-count">0</span><span class="writing-stats-sep">/${maxWords}</span>
              <div class="writing-stats-progress">
                <div class="writing-stats-progress-fill" id="writing-type1-progress" style="width:0%"></div>
              </div>
            </div>
          </div>
          <textarea class="writing-type1-textarea writing-textarea"
                    placeholder="${I18n.t('writeEssay')}..."
                    oninput="WritingType1.handleInput(this.value)">${savedAnswer}</textarea>
          <button class="writing-evaluate-btn" id="writing-type1-evaluate-btn"
                  onclick="WritingType1.evaluateWithAI()">
            <i class="fas fa-robot"></i> ${I18n.t('evaluateAI')}
          </button>
          <div id="writing-type1-eval-result"></div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      wrapper.className = 'writing-type1-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      // Hide standard footer buttons
      const checkBtn = document.querySelector('.btn-check');
      const explBtn = document.querySelector('.btn-explanations');
      if (checkBtn) checkBtn.style.display = 'none';
      if (explBtn) explBtn.style.display = 'none';

      // Update stats for any saved text
      if (savedAnswer) {
        this._updateStats(savedAnswer);
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
      const wordLimit = AppState.currentExercise?.content?.wordLimit || '220-260';
      const { min, max } = this._parseWordLimit(wordLimit);

      const countEl = document.getElementById('writing-type1-count');
      if (countEl) countEl.textContent = count;

      const progressEl = document.getElementById('writing-type1-progress');
      if (progressEl) {
        const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
        progressEl.style.width = pct + '%';
        progressEl.className = 'writing-stats-progress-fill' +
          (count < min ? ' progress-under' : count <= max ? ' progress-ok' : ' progress-over');
      }
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[1] = value;
      this._updateStats(value);
    },

    evaluateWithAI: async function() {
      var text = AppState.currentExercise?.answers?.[1] || '';
      if (!text.trim()) return;

      var apiKey = (typeof GeminiProvider !== 'undefined') && GeminiProvider.getApiKey();
      if (!apiKey) {
        CambridgeCorrector.showApiKeyPrompt('writing-type1-eval-result');
        return;
      }

      var btn = document.getElementById('writing-type1-evaluate-btn');
      var resultDiv = document.getElementById('writing-type1-eval-result');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + I18n.t('evaluating');
      }
      if (resultDiv) resultDiv.innerHTML = '';

      try {
        var taskPrompt = AppState.currentExercise?.content?.question || '';
        var level = AppState.currentLevel || 'c1';
        var result = await CambridgeCorrector.evaluate(text, level, taskPrompt);
        CambridgeCorrector.renderResult(resultDiv, result);
      } catch (err) {
        if (resultDiv) {
          resultDiv.innerHTML = '<div class="writing-eval-error"><i class="fas fa-exclamation-triangle"></i> ' +
            I18n.t('aiError') + '</div>';
        }
        console.error('AI evaluation error:', err);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-robot"></i> ' + I18n.t('evaluateAI');
        }
      }
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();


