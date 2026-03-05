// js/exercise-types/speaking-type.js
// AI Speaking interface - Cambridge C1 Speaking Parts
// Uses Whisper (Hugging Face) for transcription + Gemini for evaluation

(function() {
  window.SpeakingType = {
    conversation: [],
    recorder: null,
    exchangeCount: 0,
    SIMULATE_DURATION: 30,

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const task = exercise.content.task || exercise.content.questions?.[0]?.task || '';
      const images = exercise.content.questions?.[0]?.images || [];
      const options = exercise.content.options || [];

      let imagesHTML = images.map(src => `<img class="speaking-type-image" src="${src}" alt="Speaking task image">`).join('');
      let optionsHTML = options.length
        ? `<ul class="speaking-type-options">${options.map(o => `<li>${o}</li>`).join('')}</ul>`
        : '';

      const html = `
        <div class="speaking-type-wrapper">
          <div class="speaking-type-task">
            <h3><i class="fas fa-comments"></i> ${exercise.title || I18n.t('startSpeaking')}</h3>
            <p class="speaking-type-task-text">${task}</p>
            ${optionsHTML}
            ${imagesHTML ? `<div class="speaking-type-images">${imagesHTML}</div>` : ''}
          </div>
          <div class="speaking-type-chat">
            <div class="speaking-chat-history" id="speaking-chat-history">
              <div class="speaking-type-start-msg">
                <i class="fas fa-robot"></i> ${I18n.t('startSpeaking')}
              </div>
            </div>
            <div class="speaking-type-input-area">
              <input type="text"
                     class="speaking-type-input"
                     id="speaking-type-input"
                     placeholder="${I18n.t('speakingPrompt')}"
                     onkeydown="if(event.key==='Enter') SpeakingType.sendFromInput()">
              <button class="speaking-type-mic-btn" id="speaking-mic-btn" onclick="SpeakingType.toggleRecording()" title="Record audio (Whisper)">
                <i class="fas fa-microphone"></i>
              </button>
              <button class="speaking-type-send-btn" onclick="SpeakingType.sendFromInput()">
                <i class="fas fa-paper-plane"></i> ${I18n.t('sendMessage')}
              </button>
            </div>
          </div>
          <div class="speaking-type-actions">
          </div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      wrapper.className = 'speaking-type-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      const checkBtn = document.querySelector('.btn-check');
      const explBtn = document.querySelector('.btn-explanations');
      if (checkBtn) checkBtn.style.display = 'none';
      if (explBtn) explBtn.style.display = 'none';
    },

    sendFromInput: function() {
      const input = document.getElementById('speaking-type-input');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.sendMessage(text);
    },

    sendMessage: function(text) {
      this._addMessage('user', text);
      this.conversation.push({ role: 'user', content: text });
      this.exchangeCount++;

      const exercise = AppState.currentExercise;
      const task = exercise?.content.task || exercise?.content.questions?.[0]?.task || '';

      const historyEl = document.getElementById('speaking-chat-history');
      const typingEl = document.createElement('div');
      typingEl.className = 'speaking-type-message examiner typing';
      typingEl.innerHTML = '<span class="speaking-type-bubble"><i class="fas fa-ellipsis-h"></i></span>';
      if (historyEl) historyEl.appendChild(typingEl);

      CambridgeEvaluation.evaluateSpeaking(task, this.conversation, this.exchangeCount)
        .then(reply => {
          if (historyEl && typingEl.parentNode) historyEl.removeChild(typingEl);
          this.conversation.push({ role: 'assistant', content: reply });
          this._addMessage('examiner', reply);
        })
        .catch(() => {
          if (historyEl && typingEl.parentNode) historyEl.removeChild(typingEl);
          this._addMessage('examiner', I18n.t('aiError'));
        });
    },

    /**
     * Toggle audio recording using MediaRecorder + Whisper transcription.
     */
    toggleRecording: async function() {
      const micBtn = document.getElementById('speaking-mic-btn');
      const micIcon = micBtn?.querySelector('i');

      // If already recording, stop and transcribe
      if (this.recorder) {
        if (micIcon) micIcon.className = 'fas fa-spinner fa-spin';
        try {
          const audioBlob = await this.recorder.stop();
          this.recorder = null;

          const transcript = await WhisperProvider.transcribe(audioBlob);
          const input = document.getElementById('speaking-type-input');
          if (input) input.value = transcript;
          this.sendFromInput();
        } catch (err) {
          if (err.message === 'WHISPER_LOADING') {
            this._addMessage('examiner', I18n.t('whisperLoading'));
          } else {
            this._addMessage('examiner', I18n.t('aiError'));
          }
        }
        if (micIcon) micIcon.className = 'fas fa-microphone';
        return;
      }

      // Start recording
      try {
        this.recorder = await WhisperProvider.startRecording();
        if (micIcon) micIcon.className = 'fas fa-microphone-slash';
      } catch (err) {
        this._addMessage('examiner', I18n.t('micError'));
      }
    },

    _addMessage: function(role, text) {
      const historyEl = document.getElementById('speaking-chat-history');
      if (!historyEl) return;

      // Remove start message if present
      const startMsg = historyEl.querySelector('.speaking-type-start-msg');
      if (startMsg) startMsg.remove();

      const label = role === 'examiner' ? I18n.t('examinerSays') : I18n.t('youSaid');
      const msgEl = document.createElement('div');
      msgEl.className = `speaking-type-message ${role}`;
      msgEl.innerHTML = `
        <span class="speaking-type-label">${label}</span>
        <span class="speaking-type-bubble">${text}</span>
      `;
      historyEl.appendChild(msgEl);
      historyEl.scrollTop = historyEl.scrollHeight;
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
