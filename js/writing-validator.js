// js/writing-validator.js
// Real-time word counter and pre-submit validation for Writing exercises

(function() {
  window.WritingValidator = {
    MIN_WORDS: 150,
    IDEAL_MIN: 250,
    IDEAL_MAX: 400,

    countWords: function(text) {
      if (!text || !text.trim()) return 0;
      return text.trim().split(/\s+/).length;
    },

    getColorClass: function(count) {
      if (count < this.MIN_WORDS) return 'wv-red';
      if (count < this.IDEAL_MIN) return 'wv-orange';
      if (count <= this.IDEAL_MAX) return 'wv-green';
      return 'wv-red';
    },

    getEstimatedScore: function(count) {
      if (count < 50) return '0-5';
      if (count < this.MIN_WORDS) return '5-12';
      if (count < this.IDEAL_MIN) return '12-18';
      if (count <= this.IDEAL_MAX) return '18-24';
      return '15-20';
    },

    attach: function(textarea, counterId) {
      if (!textarea) return;
      var self = this;
      if (textarea.dataset.wvAttached) return;
      textarea.dataset.wvAttached = '1';

      var update = function() {
        var count = self.countWords(textarea.value);
        var el = document.getElementById(counterId);
        if (el) {
          el.textContent = count;
          el.className = 'wv-counter-number ' + self.getColorClass(count);
        }
      };

      textarea.addEventListener('input', update);
      update();
    },

    validateBeforeSubmit: function(text, onProceed, onCancel) {
      var count = this.countWords(text);

      if (count >= this.MIN_WORDS) {
        if (typeof onProceed === 'function') onProceed();
        return;
      }

      var estimated = this.getEstimatedScore(count);
      var self = this;

      // Create a simple inline confirmation dialog
      var overlay = document.createElement('div');
      overlay.className = 'wv-modal-overlay';
      overlay.innerHTML =
        '<div class="wv-modal-dialog">' +
          '<div class="wv-modal-icon">⚠️</div>' +
          '<h4 class="wv-modal-title">Short Response</h4>' +
          '<p>Your response is <strong>' + count + ' words</strong>. ' +
          'The recommended length is <strong>' + self.IDEAL_MIN + '+ words</strong> for a good score (minimum accepted: ' + self.MIN_WORDS + ').</p>' +
          (count < 50
            ? '<p class="wv-modal-note wv-red">This response may be too short to evaluate properly.</p>'
            : '<p class="wv-modal-note">Estimated score at current length: <strong>' + estimated + ' pts</strong></p>') +
          '<div class="wv-modal-actions">' +
            '<button class="wv-modal-btn wv-modal-btn-primary" id="wv-keep-writing">✏️ Keep writing</button>' +
            '<button class="wv-modal-btn wv-modal-btn-secondary" id="wv-submit-anyway">Submit anyway</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      var dismiss = function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      };

      document.getElementById('wv-keep-writing').onclick = function() {
        dismiss();
        if (typeof onCancel === 'function') onCancel();
      };
      document.getElementById('wv-submit-anyway').onclick = function() {
        dismiss();
        if (typeof onProceed === 'function') onProceed();
      };
    }
  };
})();
