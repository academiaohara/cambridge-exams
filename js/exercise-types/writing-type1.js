// js/exercise-types/writing-type1.js
// Essay writing - Writing Part 1

(function() {
  window.WritingType1 = {
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
            <div class="writing-stats-richness">
              <span class="writing-stats-label">${I18n.t('lexicalRichness')}:</span>
              <span class="richness-badge richness-none" id="writing-type1-richness-badge">—</span>
            </div>
            <div class="writing-stats-errors" id="writing-type1-errors-stat">
              <i class="fas fa-exclamation-circle"></i>
              <span id="writing-type1-error-count">0</span> ${I18n.t('errorsDetected')}
            </div>
          </div>
          <textarea class="writing-type1-textarea writing-textarea"
                    placeholder="${I18n.t('writeEssay')}..."
                    oninput="WritingType1.handleInput(this.value)">${savedAnswer}</textarea>
          <div class="writing-type1-actions">
            <button class="btn-evaluate-ai" onclick="WritingType1.evaluateWithAI()">
              <i class="fas fa-robot"></i> ${I18n.t('evaluateAI')}
            </button>
            <span class="writing-evaluating-indicator" id="writing-type1-evaluating" style="display:none;">
              <i class="fas fa-spinner fa-spin"></i> ${I18n.t('evaluating')}
            </span>
          </div>
          <div class="writing-suggestions-panel" id="writing-type1-suggestions" style="display:none;">
            <h4><i class="fas fa-lightbulb"></i> ${I18n.t('writingSuggestions')}</h4>
            <div class="writing-suggestions-list" id="writing-type1-suggestions-list"></div>
          </div>
          <div class="writing-type1-ai-results" id="writing-type1-ai-results" style="display:none;">
            <h4><i class="fas fa-star"></i> ${I18n.t('aiEvaluation')}</h4>
            <div id="writing-type1-ai-content"></div>
          </div>
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

      // Set up debounced input handler
      this._debouncedInput = Debounce(this._checkProgressiveEval.bind(this), 500);
      this._lastProgressiveWordCount = 0;
      this._lastErrors = [];

      // Update stats for any saved text
      if (savedAnswer) {
        this._updateStats(savedAnswer);
        this._lastProgressiveWordCount = this._getWordCount(savedAnswer);
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

      const badgeEl = document.getElementById('writing-type1-richness-badge');
      if (badgeEl) {
        badgeEl.textContent = label;
        badgeEl.className = 'richness-badge ' + cls;
      }
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[1] = value;
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
        WritingType1._triggerEvaluation(true);
      }, 120000);
    },

    _triggerEvaluation: function(auto) {
      if (this._isEvaluating) return;
      const essay = AppState.currentExercise.answers?.[1] || '';
      if (!essay.trim()) return;
      this.evaluateWithAI(auto);
    },

    evaluateWithAI: function(auto) {
      if (this._isEvaluating) return;
      const essay = AppState.currentExercise.answers?.[1] || '';
      if (!essay.trim()) {
        if (!auto) alert(I18n.t('writeEssay'));
        return;
      }

      this._isEvaluating = true;
      const indicator = document.getElementById('writing-type1-evaluating');
      if (indicator) indicator.style.display = 'inline-flex';

      const question = AppState.currentExercise.content.question || '';
      const wordLimit = AppState.currentExercise.content.wordLimit || '220-260';

      const resultsDiv = document.getElementById('writing-type1-ai-results');
      const contentDiv = document.getElementById('writing-type1-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.innerHTML =
        '<div class="writing-eval-loading"><i class="fas fa-spinner fa-spin"></i> ' + I18n.t('evaluating') + '</div>';

      const self = this;
      CambridgeEvaluation.evaluateWriting(essay, question, wordLimit, 'Essay')
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
        return '<pre class="writing-type1-ai-text">' + (result || '') + '</pre>';
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
      const el = document.getElementById('writing-type1-error-count');
      if (el) el.textContent = count;
    },

    _showSuggestions: function(errors) {
      const panel = document.getElementById('writing-type1-suggestions');
      const list = document.getElementById('writing-type1-suggestions-list');
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
          '<button class="btn-apply-fix" onclick="WritingType1.applyFix(' + i + ')">' +
            '<i class="fas fa-check"></i> ' + I18n.t('applyFix') +
          '</button>' +
        '</div>';
      }).join('');
    },

    applyFix: function(index) {
      const error = this._lastErrors[index];
      if (!error) return;
      const textarea = document.querySelector('.writing-type1-textarea');
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

