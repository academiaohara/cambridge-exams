// js/exercise-types/speaking-type.js
// AI Speaking interface - Cambridge C1 Speaking Parts

(function() {
  window.SpeakingType = {
    conversation: [],
    recognition: null,
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

      const hasMic = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const micButton = hasMic
        ? `<button class="speaking-type-mic-btn" onclick="SpeakingType.startMic()" title="Microphone">
             <i class="fas fa-microphone"></i>
           </button>`
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
              ${micButton}
              <button class="speaking-type-send-btn" onclick="SpeakingType.sendFromInput()">
                <i class="fas fa-paper-plane"></i> ${I18n.t('sendMessage')}
              </button>
            </div>
          </div>
          <div class="speaking-type-actions">
            <button class="btn-set-api-key" onclick="SpeakingType.setApiKey()">
              <i class="fas fa-key"></i> ${I18n.t('setApiKey')}
            </button>
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
      const apiKey = localStorage.getItem('ai_api_key');
      if (!apiKey) {
        alert(I18n.t('noApiKey'));
        return;
      }

      this._addMessage('user', text);
      this.conversation.push({ role: 'user', content: text });
      this.exchangeCount++;

      const exercise = AppState.currentExercise;
      const task = exercise?.content.task || exercise?.content.questions?.[0]?.task || '';
      const scoringNote = this.exchangeCount >= 5 ? ' Now provide a brief score estimate for each criterion (0-5): fluency, lexical resource, grammatical range, discourse management.' : '';
      const systemPrompt = `You are a Cambridge C1 Advanced speaking examiner. The task is: "${task}". Ask the student follow-up questions based on their responses. Be encouraging but assess fluency, lexical resource, grammatical range, and discourse management.${scoringNote}`;

      const messages = [{ role: 'system', content: systemPrompt }, ...this.conversation];

      const historyEl = document.getElementById('speaking-chat-history');
      const typingEl = document.createElement('div');
      typingEl.className = 'speaking-type-message examiner typing';
      typingEl.innerHTML = '<span class="speaking-type-bubble"><i class="fas fa-ellipsis-h"></i></span>';
      if (historyEl) historyEl.appendChild(typingEl);

      fetch(CONFIG.AI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: CONFIG.AI_MODEL,
          messages: messages,
          max_tokens: 300
        })
      })
      .then(r => r.json())
      .then(data => {
        if (historyEl && typingEl.parentNode) historyEl.removeChild(typingEl);
        const reply = data.choices?.[0]?.message?.content || I18n.t('aiError');
        this.conversation.push({ role: 'assistant', content: reply });
        this._addMessage('examiner', reply);
      })
      .catch(() => {
        if (historyEl && typingEl.parentNode) historyEl.removeChild(typingEl);
        this._addMessage('examiner', I18n.t('aiError'));
      });
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

    startMic: function() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
        document.querySelector('.speaking-type-mic-btn i').className = 'fas fa-microphone';
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-GB';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      const micBtn = document.querySelector('.speaking-type-mic-btn i');
      if (micBtn) micBtn.className = 'fas fa-microphone-slash';

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('speaking-type-input');
        if (input) input.value = transcript;
        this.sendFromInput();
      };

      this.recognition.onend = () => {
        this.recognition = null;
        if (micBtn) micBtn.className = 'fas fa-microphone';
      };

      this.recognition.start();
    },

    setApiKey: function() {
      const key = prompt(I18n.t('apiKeyPrompt'));
      if (key && key.trim()) {
        localStorage.setItem('ai_api_key', key.trim());
        alert('API key saved.');
      }
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
