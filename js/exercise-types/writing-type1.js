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
                    placeholder="${I18n.t('writeEssay')}..."
                    oninput="WritingType1.handleInput(this.value)">${savedAnswer}</textarea>
          <div class="writing-type1-word-count">
            <span id="writing-type1-count">0</span> ${I18n.t('wordsWritten')}
          </div>
          <div class="writing-type1-actions">
            <button class="btn-set-api-key" onclick="WritingType1.setApiKey()">
              <i class="fas fa-key"></i> ${I18n.t('setApiKey')}
            </button>
            <button class="btn-evaluate-ai" onclick="WritingType1.evaluateWithAI()">
              <i class="fas fa-robot"></i> ${I18n.t('evaluateAI')}
            </button>
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

    setApiKey: function() {
      const key = prompt(I18n.t('apiKeyPrompt'));
      if (key && key.trim()) {
        localStorage.setItem('ai_api_key', key.trim());
        alert(I18n.t('apiKeySaved'));
      }
    },

    evaluateWithAI: function() {
      const apiKey = localStorage.getItem('ai_api_key');
      if (!apiKey) {
        alert(I18n.t('noApiKey'));
        return;
      }

      const essay = AppState.currentExercise.answers?.[1] || '';
      if (!essay.trim()) {
        alert(I18n.t('writeEssay'));
        return;
      }

      const question = AppState.currentExercise.content.question || '';
      const wordLimit = AppState.currentExercise.content.wordLimit || '220-260';

      const resultsDiv = document.getElementById('writing-type1-ai-results');
      const contentDiv = document.getElementById('writing-type1-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.textContent = I18n.t('evaluating');

      const systemPrompt = `You are a Cambridge C1 Advanced writing examiner. Evaluate the essay on four criteria, each scored 0-5: Content, Communicative Achievement, Organisation, and Language. Provide a score and brief feedback for each criterion, then a total score out of 20 and overall comments. Format your response clearly with sections for each criterion.`;
      const userPrompt = `Task: ${question}\nWord limit: ${wordLimit}\n\nEssay:\n${essay}`;

      fetch(CONFIG.AI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: CONFIG.AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 800
        })
      })
      .then(r => r.json())
      .then(data => {
        const text = data.choices?.[0]?.message?.content || I18n.t('aiError');
        if (contentDiv) contentDiv.innerHTML = `<pre class="writing-type1-ai-text">${text}</pre>`;
      })
      .catch(() => {
        if (contentDiv) contentDiv.textContent = I18n.t('aiError');
      });
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
