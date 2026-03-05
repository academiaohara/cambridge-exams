// js/services/ai/geminiProvider.js
// Gemini API provider using native fetch — model: gemini-2.5-flash
(function() {
  window.GeminiProvider = {

    /**
     * Send a generateContent request to the Gemini REST API.
     * @param {string} apiKey - Gemini API key provided by the user
     * @param {string} systemPrompt - System-level instruction for the model
     * @param {string} userPrompt - User message / evaluation request
     * @param {Object} [options] - Optional generation parameters
     * @returns {Promise<string>} - The model's text response
     */
    generateContent: async function(apiKey, systemPrompt, userPrompt, options) {
      var model = CONFIG.GEMINI_MODEL || 'gemini-2.5-flash';
      var url = (CONFIG.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta') +
                '/models/' + model + ':generateContent?key=' + apiKey;

      var body = {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          temperature: (options && options.temperature != null) ? options.temperature : 0.2,
          maxOutputTokens: (options && options.maxOutputTokens) || 1500,
          responseMimeType: 'application/json'
        }
      };

      var response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        var errorData;
        try { errorData = await response.json(); } catch (e) { errorData = null; }
        var err = new Error('Gemini API error: ' + response.status);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      var data = await response.json();
      var text = data.candidates &&
                 data.candidates[0] &&
                 data.candidates[0].content &&
                 data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] &&
                 data.candidates[0].content.parts[0].text;

      if (!text) throw new Error('Empty response from Gemini');
      return text;
    },

    /**
     * Get the API key from localStorage.
     * @returns {string|null}
     */
    getApiKey: function() {
      return localStorage.getItem('gemini_api_key') || null;
    },

    /**
     * Save API key to localStorage.
     * @param {string} key
     */
    setApiKey: function(key) {
      localStorage.setItem('gemini_api_key', key);
    }
  };
})();
