// js/services/ai/cambridgeEvaluation.js
// Unified Cambridge exam evaluation service using Gemini + Whisper

(function() {
  window.CambridgeEvaluation = {

    /**
     * System prompt for writing evaluation — Cambridge Senior Examiner (UCLES).
     * Strict on word count and register appropriateness.
     */
    getWritingSystemPrompt: function(taskType) {
      return `You are a Senior Examiner for Cambridge Assessment (UCLES) with over 15 years of experience marking Cambridge C1 Advanced papers. You must evaluate the candidate's ${taskType || 'writing'} strictly according to the official Cambridge C1 Advanced Writing assessment scale.

Evaluate on four criteria, each scored 0–5:
1. **Content** — Has the candidate addressed all parts of the task? Is the target reader fully informed?
2. **Communicative Achievement** — Does the text achieve its communicative purpose? Is the register (formal/informal) appropriate for the task type (e.g., a formal register is required for an Essay or Proposal; a semi-formal/informal register may be acceptable for a Review or Letter to a friend)?
3. **Organisation** — Is the text well-structured with clear paragraphing and cohesive devices?
4. **Language** — Is there a range of vocabulary and grammatical structures? Are errors minor and non-impeding?

Important rules:
- Be strict with word count. The target range must be respected. If the response is significantly under or over the word limit, note this explicitly and penalise accordingly in the Content criterion.
- If the register is inappropriate for the task type, penalise under Communicative Achievement.
- Provide a score (0–5) and a brief justification for each criterion.
- Provide a total score out of 20 and overall comments with specific suggestions for improvement.
- Format your response clearly with labelled sections for each criterion.
- Respond in English.`;
    },

    /**
     * System prompt for speaking evaluation — Cambridge Senior Examiner.
     */
    getSpeakingSystemPrompt: function(task, includeScoring) {
      const scoringNote = includeScoring
        ? ' Now also provide a brief score estimate for each criterion (0–5): Grammatical Resource, Lexical Resource, Discourse Management, Interactive Communication.'
        : '';

      return `You are a Senior Examiner for Cambridge Assessment (UCLES) conducting a Cambridge C1 Advanced Speaking test. The task is: "${task}".

Your role:
- Ask the candidate follow-up questions based on their responses to simulate a realistic speaking exam.
- Be encouraging but maintain professional assessment standards.
- Assess the candidate on: Grammatical Resource, Lexical Resource, Discourse Management, and Interactive Communication.
- Note: Pronunciation cannot be assessed from text transcription; focus on the other four criteria.
- Keep your responses concise and examiner-like.${scoringNote}
- Respond in English.`;
    },

    /**
     * Evaluate a writing submission using Gemini.
     * @param {string} essay - The candidate's text
     * @param {string} question - The task/question prompt
     * @param {string} wordLimit - Expected word range (e.g. "220-260")
     * @param {string} [taskType] - Task type (e.g. "Essay", "Review", "Letter")
     * @returns {Promise<string>} Evaluation feedback text
     */
    evaluateWriting: async function(essay, question, wordLimit, taskType) {
      const systemPrompt = this.getWritingSystemPrompt(taskType);
      const userPrompt = `Task type: ${taskType || 'Essay'}\nTask: ${question}\nWord limit: ${wordLimit}\n\nCandidate's response:\n${essay}`;

      return await GeminiProvider.generateContent(systemPrompt, userPrompt, {
        maxOutputTokens: 800
      });
    },

    /**
     * Send a message in a speaking conversation and get examiner response.
     * @param {string} task - The speaking task description
     * @param {Array<{role: string, content: string}>} conversation - Chat history
     * @param {number} exchangeCount - Number of exchanges so far
     * @returns {Promise<string>} Examiner's reply
     */
    evaluateSpeaking: async function(task, conversation, exchangeCount) {
      const includeScoring = exchangeCount >= 5;
      const systemPrompt = this.getSpeakingSystemPrompt(task, includeScoring);

      return await GeminiProvider.chat(systemPrompt, conversation, {
        maxOutputTokens: 300
      });
    },

    /**
     * Full speaking flow: transcribe audio with Whisper, then evaluate with Gemini.
     * @param {Blob} audioBlob - Recorded audio
     * @param {string} task - The speaking task description
     * @param {Array<{role: string, content: string}>} conversation - Chat history
     * @param {number} exchangeCount - Number of exchanges so far
     * @returns {Promise<{transcript: string, reply: string}>}
     */
    processAudioSpeaking: async function(audioBlob, task, conversation, exchangeCount) {
      const transcript = await WhisperProvider.transcribe(audioBlob);
      const updatedConversation = [...conversation, { role: 'user', content: transcript }];
      const reply = await this.evaluateSpeaking(task, updatedConversation, exchangeCount);
      return { transcript, reply };
    }
  };
})();
