// js/services/ai/cambridgeCorrector.js
// Cambridge Writing Corrector using DeepSeek API
(function() {
  window.CambridgeCorrector = {

    /**
     * Evaluate a student's writing using DeepSeek.
     * @param {string} text - The student's written text
     * @param {string} level - Cambridge level (e.g. 'c1', 'b2')
     * @param {string} taskPrompt - The writing task / question prompt
     * @returns {Promise<Object>} - Evaluation result with scores and feedback
     */
    evaluate: async function(text, level, taskPrompt) {
      var apiKey = DeepSeekProvider.getApiKey();
      if (!apiKey) {
        throw new Error('NO_API_KEY');
      }

      var systemPrompt = this.getSystemPrompt(level);
      var userPrompt = this.buildUserPrompt(text, level, taskPrompt);

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      var response = await DeepSeekProvider.chatCompletion(apiKey, messages, {
        temperature: 0.2,
        max_tokens: 1500
      });

      var content = response.choices[0].message.content;
      return JSON.parse(content);
    },

    /**
     * Build system prompt for the Cambridge examiner.
     * @param {string} level
     * @returns {string}
     */
    getSystemPrompt: function(level) {
      return 'You are an official Cambridge English examiner for ' + level.toUpperCase() + ' exams. ' +
             'Always evaluate using official Cambridge criteria. ' +
             'Respond only with valid JSON.';
    },

    /**
     * Build user prompt with the student's writing and evaluation criteria.
     * @param {string} text
     * @param {string} level
     * @param {string} taskPrompt
     * @returns {string}
     */
    buildUserPrompt: function(text, level, taskPrompt) {
      return 'Task: ' + taskPrompt + '\n\n' +
             'Student\'s writing: ' + text + '\n\n' +
             'Evaluate these criteria (each scored 0-5):\n' +
             '- Content\n' +
             '- Communicative Achievement\n' +
             '- Organisation\n' +
             '- Language\n\n' +
             'Return JSON with: total_score (string like "15/20"), ' +
             'criteria_scores (object with content, communicative, organisation, language as numbers 0-5), ' +
             'feedback (string), strengths (array of strings), improvements (array of strings)';
    },

    /**
     * Show an API key prompt bar inside the given container.
     * @param {string} containerId - DOM element id
     * @param {Function} onSetKey - Callback after key is saved
     */
    showApiKeyPrompt: function(containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML =
        '<div class="writing-apikey-bar">' +
          '<i class="fas fa-key"></i> ' +
          '<span>' + I18n.t('noApiKey') + '</span>' +
          '<button onclick="CambridgeCorrector.promptApiKey(\'' + containerId + '\')">' + I18n.t('setApiKey') + '</button>' +
        '</div>';
    },

    /**
     * Prompt user for API key via browser prompt dialog.
     * @param {string} containerId - Container to clear after key is saved
     */
    promptApiKey: function(containerId) {
      var key = prompt(I18n.t('apiKeyPrompt'));
      if (key && key.trim()) {
        DeepSeekProvider.setApiKey(key.trim());
        var el = document.getElementById(containerId);
        if (el) el.innerHTML = '';
      }
    },

    /**
     * Render AI evaluation result into a container element.
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} result - Evaluation result from evaluate()
     */
    renderResult: function(container, result) {
      if (!container || !result) return;

      var scores = result.criteria_scores || {};
      var criteriaKeys = [
        { key: 'content', label: I18n.t('content') },
        { key: 'communicative', label: I18n.t('communicativeAchievement') },
        { key: 'organisation', label: I18n.t('organisation') },
        { key: 'language', label: I18n.t('language') }
      ];

      var criteriaHTML = criteriaKeys.map(function(c) {
        var score = scores[c.key] || 0;
        return '<div class="writing-criterion">' +
          '<span class="writing-criterion-label">' + c.label + '</span>' +
          '<span class="writing-criterion-score">' + score + '/5</span>' +
          '<div class="writing-criterion-bar"><div class="writing-criterion-bar-fill score-' + score + '"></div></div>' +
          '</div>';
      }).join('');

      var strengthsHTML = '';
      if (result.strengths && result.strengths.length) {
        strengthsHTML = '<div class="writing-eval-section">' +
          '<div class="writing-eval-section-title strengths-title"><i class="fas fa-check-circle"></i> ' + I18n.t('strengths') + '</div>' +
          '<ul class="writing-eval-list strengths-list">' +
          result.strengths.map(function(s) { return '<li>' + s + '</li>'; }).join('') +
          '</ul></div>';
      }

      var improvementsHTML = '';
      if (result.improvements && result.improvements.length) {
        improvementsHTML = '<div class="writing-eval-section">' +
          '<div class="writing-eval-section-title improvements-title"><i class="fas fa-arrow-up"></i> ' + I18n.t('improvements') + '</div>' +
          '<ul class="writing-eval-list improvements-list">' +
          result.improvements.map(function(s) { return '<li>' + s + '</li>'; }).join('') +
          '</ul></div>';
      }

      container.innerHTML =
        '<div class="writing-evaluation-result">' +
          '<div class="writing-evaluation-header"><i class="fas fa-clipboard-check"></i> ' + I18n.t('aiEvaluation') + '</div>' +
          '<div class="writing-evaluation-score">' + (result.total_score || '?/20') + '</div>' +
          '<div class="writing-criteria-grid">' + criteriaHTML + '</div>' +
          (result.feedback ? '<div class="writing-feedback">' + result.feedback + '</div>' : '') +
          strengthsHTML +
          improvementsHTML +
        '</div>';
    }
  };
})();
