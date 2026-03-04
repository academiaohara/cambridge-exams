// js/services/ai/whisperProvider.js
// Whisper transcription provider via Hugging Face Inference API

(function() {
  window.WhisperProvider = {

    /**
     * Transcribe an audio blob using Whisper via Hugging Face Inference API.
     * @param {Blob} audioBlob - Audio data (webm, wav, mp3, etc.)
     * @returns {Promise<string>} Transcribed text
     */
    transcribe: async function(audioBlob) {
      const apiKey = localStorage.getItem('hf_api_key');
      if (!apiKey) throw new Error('NO_HF_API_KEY');

      const model = CONFIG.WHISPER_MODEL;
      const endpoint = `${CONFIG.HF_API_ENDPOINT}/models/${model}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': audioBlob.type || 'audio/webm'
        },
        body: audioBlob
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        // Model may be loading — Hugging Face returns 503 while warming up
        if (response.status === 503) {
          throw new Error('WHISPER_LOADING');
        }
        throw new Error(err.error || `Whisper API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';
      if (!text.trim()) throw new Error('No speech detected in audio. Please try speaking louder or closer to the microphone.');
      return text.trim();
    },

    /**
     * Start recording audio from the user's microphone.
     * Returns an object with stop() to end recording and get the audio blob.
     * @returns {Promise<{stop: () => Promise<Blob>}>}
     */
    startRecording: async function() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.start();

      return {
        stop: () => new Promise((resolve) => {
          mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
            resolve(blob);
          };
          mediaRecorder.stop();
        })
      };
    }
  };
})();
