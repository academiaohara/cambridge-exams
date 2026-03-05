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
             'Evaluate these criteria (0-5):\n' +
             '- Content\n' +
             '- Communicative Achievement\n' +
             '- Organisation\n' +
             '- Language\n\n' +
             'Return JSON with: total_score (string like "15/20"), ' +
             'criteria_scores (object with content, communicative, organisation, language as numbers), ' +
             'feedback (string), strengths (array of strings), improvements (array of strings)';
    }
  };
})();
