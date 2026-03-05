// js/services/ai/cambridgeEvaluation.js
// Unified Cambridge exam evaluation service using Gemini + Whisper

(function() {
  window.CambridgeEvaluation = {

    /**
     * System prompt for writing evaluation — Cambridge Senior Examiner (UCLES).
     * Strict on word count and register appropriateness.
     */
    getWritingSystemPrompt: function(taskType) {
      return `Act as an official Cambridge English Examiner (Level B2/C1/C2). You are a Senior Examiner for Cambridge Assessment (UCLES) with over 15 years of experience. You must evaluate the candidate's ${taskType || 'writing'} strictly according to the official Cambridge Writing assessment scale.

FOR WRITING TASKS:
- Evaluate the student's text based on the 4 official criteria: Content, Communicative Achievement, Organization, and Language.
- Provide a score from 1 to 5 for each criterion.
- Point out specific grammatical or lexical errors and suggest 'more sophisticated' alternatives.
- Use a professional and encouraging tone.

Important rules:
- Be strict with word count. The target range must be respected. If the response is significantly under or over the word limit, note this explicitly and penalise accordingly in the Content criterion.
- If the register is inappropriate for the task type (e.g., a formal register is required for an Essay or Proposal; a semi-formal/informal register may be acceptable for a Review or Letter to a friend), penalise under Communicative Achievement.
- Provide a total score out of 20 and overall comments with specific suggestions for improvement.
- Respond in English.

ALWAYS respond in JSON format with the following structure:
{
  "content": { "score": <1-5>, "justification": "..." },
  "communicativeAchievement": { "score": <1-5>, "justification": "..." },
  "organization": { "score": <1-5>, "justification": "..." },
  "language": { "score": <1-5>, "justification": "...", "errors": [{"original": "...", "suggestion": "..."}] },
  "totalScore": <number>,
  "overallComments": "..."
}`;
    },

    /**
     * System prompt for speaking evaluation — Cambridge Senior Examiner.
     */
    getSpeakingSystemPrompt: function(task, includeScoring) {
      const scoringNote = includeScoring
        ? `\nAfter this exchange, say 'Thank you, that is the end of the test' and provide a detailed report of the candidate's performance. Include 'Upgrading vocabulary' (how to sound more C1) and 'Accuracy' (correcting mistakes made during the chat). Also provide a score estimate for each criterion (1–5): Grammatical Resource, Lexical Resource, Discourse Management, Interactive Communication.

ALWAYS respond in JSON format for the final report:
{
  "endOfTest": true,
  "report": {
    "grammaticalResource": { "score": <1-5>, "comments": "..." },
    "lexicalResource": { "score": <1-5>, "comments": "..." },
    "discourseManagement": { "score": <1-5>, "comments": "..." },
    "interactiveCommunication": { "score": <1-5>, "comments": "..." },
    "upgradingVocabulary": ["suggestion1", "suggestion2"],
    "accuracy": [{"original": "...", "correction": "..."}],
    "overallComments": "..."
  }
}`
        : '';

      return `Act as an official Cambridge English Examiner (Level B2/C1/C2). You are a Senior Examiner for Cambridge Assessment (UCLES) conducting a Cambridge Speaking test. The task is: "${task}".

FOR SPEAKING CHAT:
- You are the interlocutor. Start by introducing a topic from the Cambridge syllabus (e.g., technology, environment, education).
- Ask one question at a time. Do NOT correct the student during the conversation to maintain fluency.
- Use phrases like 'That's a good point', 'Moving on to...', or 'What are your thoughts on...'.
- Be encouraging but maintain professional assessment standards.
- Assess the candidate on: Grammatical Resource, Lexical Resource, Discourse Management, and Interactive Communication.
- Note: Pronunciation cannot be assessed from text transcription; focus on the other four criteria.
- Keep your responses concise and examiner-like.
- Respond in English.${scoringNote}`;
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
