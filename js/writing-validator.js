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

    /** Word-count colour for tasks with an explicit min/max (e.g. B1 email). */
    getColorClassForRange: function(count, min, max) {
      if (typeof min !== 'number') return this.getColorClass(count);
      if (count < min) return 'wv-red';
      if (typeof max === 'number' && count > max) return 'wv-orange';
      return 'wv-green';
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

    validateBeforeSubmit: function(text, onProceed, onCancel, options) {
      var opts = options || {};
      var count = this.countWords(text);
      var min = typeof opts.min === 'number' ? opts.min : this.MIN_WORDS;
      var max = typeof opts.max === 'number' ? opts.max : null;
      var inRange = count >= min && (max == null || count <= max);

      if (inRange) {
        if (typeof onProceed === 'function') onProceed();
        return;
      }

      var estimated = this.getEstimatedScore(count);
      var self = this;
      var title = 'Short response';
      var mainP;
      if (max != null && count > max) {
        title = 'Long response';
        mainP = 'Your response is <strong>' + count + ' words</strong>. For this task, aim for about <strong>' + min + '–' + max + ' words</strong>.';
      } else if (max != null && count < min) {
        mainP = 'Your response is <strong>' + count + ' words</strong>. The task asks for about <strong>' + min + '–' + max + ' words</strong>.';
      } else {
        mainP = 'Your response is <strong>' + count + ' words</strong>. The recommended length is <strong>' + self.IDEAL_MIN + '+ words</strong> for a good score (minimum accepted: ' + min + ').';
      }

      var extraNote = '';
      if (count < 50 && max == null) {
        extraNote = '<p class="wv-modal-note wv-red">This response may be too short to evaluate properly.</p>';
      } else if (max == null && count < min) {
        extraNote = '<p class="wv-modal-note">Estimated score at current length: <strong>' + estimated + ' pts</strong></p>';
      } else if (max != null && count < min) {
        extraNote = '<p class="wv-modal-note">Estimated score at current length: <strong>' + estimated + ' pts</strong></p>';
      }

      // Create a simple inline confirmation dialog
      var overlay = document.createElement('div');
      overlay.className = 'wv-modal-overlay';
      overlay.innerHTML =
        '<div class="wv-modal-dialog">' +
          '<div class="wv-modal-icon">⚠️</div>' +
          '<h4 class="wv-modal-title">' + title + '</h4>' +
          '<p>' + mainP + '</p>' +
          extraNote +
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
