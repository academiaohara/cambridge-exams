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

      const html = `
        <div class="writing-type1-wrapper">
          <div class="writing-type1-prompt">
            <h3><i class="fas fa-pencil-alt"></i> ${I18n.t('writeEssay')}</h3>
            <p class="writing-type1-question">${question}</p>
            <div class="writing-type1-word-limit">
              <i class="fas fa-info-circle"></i> ${wordLimit} ${I18n.t('wordsWritten')}
            </div>
          </div>
          <textarea class="writing-type1-textarea writing-textarea"
                    lang="en" spellcheck="true"
                    placeholder="${I18n.t('writeEssay')}..."
                    oninput="WritingType1.handleInput(this.value)">${savedAnswer}</textarea>
          <div class="writing-type1-footer-row">
            <div class="writing-type1-word-count">
              <span id="writing-type1-count">0</span> ${I18n.t('wordsWritten')}
            </div>
            <button class="btn-copy-clipboard" onclick="WritingType1.copyToClipboard()" title="${I18n.t('copyClipboard')}">
              <i class="fas fa-copy"></i> ${I18n.t('copyClipboard')}
            </button>
          </div>
          <div class="writing-type1-actions">
            <button class="btn-evaluate-ai" onclick="WritingType1.evaluateWithAI()">
              <i class="fas fa-robot"></i> ${I18n.t('evaluateAI')}
            </button>
          </div>
          <div class="writing-inline-msg" id="writing-type1-msg" style="display:none;"></div>
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

      // Update word count for any saved text
      if (savedAnswer) this._updateCount(savedAnswer);
    },

    _updateCount: function(text) {
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      const el = document.getElementById('writing-type1-count');
      if (el) el.textContent = count;
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[1] = value;
      this._updateCount(value);
    },

    _showMsg: function(text) {
      const msg = document.getElementById('writing-type1-msg');
      if (!msg) return;
      msg.textContent = text;
      msg.style.display = 'block';
      clearTimeout(this._msgTimer);
      this._msgTimer = setTimeout(() => { msg.style.display = 'none'; }, 4000);
    },

    copyToClipboard: function() {
      const essay = AppState.currentExercise.answers?.[1] || '';
      if (!essay.trim()) {
        this._showMsg(I18n.t('writeEssay'));
        return;
      }
      navigator.clipboard.writeText(essay).then(() => {
        this._showMsg(I18n.t('copiedClipboard'));
      }).catch(() => {
        this._showMsg(I18n.t('copyError'));
      });
    },

    sendWriting: async function(text, taskPrompt) {
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, taskType: "Essay", taskPrompt })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.corrected;
    },

    evaluateWithAI: function() {
      const essay = AppState.currentExercise.answers?.[1] || '';
      if (!essay.trim()) {
        this._showMsg(I18n.t('writeEssay'));
        return;
      }

      const resultsDiv = document.getElementById('writing-type1-ai-results');
      const contentDiv = document.getElementById('writing-type1-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.innerHTML = `<div class="writing-ai-loading"><i class="fas fa-spinner fa-spin"></i> ${I18n.t('evaluating')}</div>`;

      const question = AppState.currentExercise.content.question || '';
      this.sendWriting(essay, question)
        .then(text => {
          if (contentDiv) contentDiv.innerHTML = `<div class="writing-ai-feedback">${this._formatFeedback(text)}</div>`;
        })
        .catch(() => {
          if (contentDiv) contentDiv.textContent = I18n.t('aiError');
        });
    },

    _formatFeedback: function(text) {
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^(📊 SCORES|📝 DETAILED FEEDBACK|✅ STRENGTHS|⚠️ AREAS FOR IMPROVEMENT|📌 CAMBRIDGE ENGLISH SCALE)/gm, '<h5 class="writing-feedback-heading">$1</h5>')
        .replace(/^• (.+)/gm, '<div class="writing-score-line">$1</div>')
        .replace(/\n/g, '<br>');
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
