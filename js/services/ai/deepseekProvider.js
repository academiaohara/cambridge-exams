// js/services/ai/deepseekProvider.js
// DeepSeek API provider using native fetch
(function() {
  window.DeepSeekProvider = {

    /**
     * Send a chat completion request to the DeepSeek API.
     * @param {string} apiKey - DeepSeek API key
     * @param {Array} messages - Array of {role, content} message objects
     * @param {Object} [options] - Optional parameters (temperature, max_tokens, etc.)
     * @returns {Promise<Object>} - Parsed API response
     */
    chatCompletion: async function(apiKey, messages, options) {
      var baseURL = CONFIG.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
      var model = CONFIG.DEEPSEEK_MODEL || 'deepseek-chat';

      var body = {
        model: model,
        messages: messages,
        temperature: (options && options.temperature != null) ? options.temperature : 0.3,
        max_tokens: (options && options.max_tokens) || 1500,
        response_format: { type: 'json_object' }
      };

      var response = await fetch(baseURL + '/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        var errorData;
        try { errorData = await response.json(); } catch (e) { errorData = null; }
        var err = new Error('DeepSeek API error: ' + response.status);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      return await response.json();
    },

    /**
     * Get the API key from CONFIG or localStorage.
     * @returns {string|null}
     */
    getApiKey: function() {
      return CONFIG.DEEPSEEK_API_KEY || localStorage.getItem('deepseek_api_key') || null;
    },

    /**
     * Save API key to localStorage.
     * @param {string} key
     */
    setApiKey: function(key) {
      localStorage.setItem('deepseek_api_key', key);
    }
  };
})();
