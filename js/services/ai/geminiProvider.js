// js/services/ai/geminiProvider.js
// Gemini 2.0 Flash provider via Google AI Studio REST API

(function() {
  window.GeminiProvider = {

    /**
     * Send a single-shot prompt to Gemini (for writing evaluation).
     * @param {string} systemPrompt - System instruction text
     * @param {string} userPrompt - User message text
     * @param {Object} [options] - Optional config overrides
     * @returns {Promise<string>} The model's text response
     */
    generateContent: async function(systemPrompt, userPrompt, options = {}) {
      const apiKey = CONFIG.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
      if (!apiKey) throw new Error('NO_API_KEY');

      const model = options.model || CONFIG.GEMINI_MODEL;
      const maxTokens = options.maxOutputTokens || 800;
      const endpoint = `${CONFIG.GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

      const body = {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    },

    /**
     * Send a multi-turn conversation to Gemini (for speaking evaluation).
     * @param {string} systemPrompt - System instruction text
     * @param {Array<{role: string, content: string}>} messages - Conversation history
     * @param {Object} [options] - Optional config overrides
     * @returns {Promise<string>} The model's text response
     */
    chat: async function(systemPrompt, messages, options = {}) {
      const apiKey = CONFIG.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
      if (!apiKey) throw new Error('NO_API_KEY');

      const model = options.model || CONFIG.GEMINI_MODEL;
      const maxTokens = options.maxOutputTokens || 300;
      const endpoint = `${CONFIG.GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

      // Convert messages to Gemini format, filtering out any system role messages
      // (system instructions are handled separately via systemInstruction)
      const contents = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

      const body = {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: contents,
        generationConfig: {
          maxOutputTokens: maxTokens
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    }
  };
})();
