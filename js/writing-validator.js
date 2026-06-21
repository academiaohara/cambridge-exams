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

    /** Parse "220-260 words" or "90-120" into { min, max }. */
    parseWordLimit: function(str) {
      if (!str) return null;
      var m = String(str).match(/(\d+)\s*[-–]\s*(\d+)/);
      if (!m) return null;
      return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
    },

    /** Green = stated range; orange = slightly wider; red = outside orange. */
    getTaskRanges: function(min, max) {
      var lo = typeof min === 'number' ? min : 0;
      var hi = typeof max === 'number' ? max : lo;
      if (hi < lo) hi = lo;
      var margin = Math.max(10, Math.round((hi - lo) * 0.25));
      return {
        greenMin: lo,
        greenMax: hi,
        orangeMin: lo - margin,
        orangeMax: hi + margin
      };
    },

    getTaskZone: function(count, min, max) {
      var r = this.getTaskRanges(min, max);
      if (count >= r.greenMin && count <= r.greenMax) return 'green';
      if (count >= r.orangeMin && count <= r.orangeMax) return 'orange';
      return 'red';
    },

    /** Word-count colour for tasks with an explicit min/max (B1 email, B2/C1 essay). */
    getColorClassForRange: function(count, min, max) {
      if (typeof min !== 'number') return this.getColorClass(count);
      var zone = this.getTaskZone(count, min, typeof max === 'number' ? max : min);
      if (zone === 'green') return 'wv-green';
      if (zone === 'orange') return 'wv-orange';
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

    validateBeforeSubmit: function(text, onProceed, onCancel, options) {
      var opts = options || {};
      var count = this.countWords(text);
      var hasTaskRange = typeof opts.min === 'number' && typeof opts.max === 'number';

      if (hasTaskRange) {
        var zone = this.getTaskZone(count, opts.min, opts.max);
        if (zone === 'green' || zone === 'orange') {
          if (typeof onProceed === 'function') onProceed();
          return;
        }
        this._showTaskRangeBlockedModal(count, opts.min, opts.max, onCancel);
        return;
      }

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

      this._showConfirmModal(title, mainP, extraNote, onProceed, onCancel);
    },

    _showTaskRangeBlockedModal: function(count, min, max, onCancel) {
      var r = this.getTaskRanges(min, max);
      var mainP = 'Your response is <strong>' + count + ' words</strong>. This task asks for about <strong>' +
        min + '–' + max + ' words</strong> (accepted range: ' + r.orangeMin + '–' + r.orangeMax + ').';
      this._showConfirmModal(
        'Word count out of range',
        mainP,
        '<p class="wv-modal-note wv-red">Please adjust your text before evaluating.</p>',
        null,
        onCancel,
        true
      );
    },

    _showConfirmModal: function(title, mainP, extraNote, onProceed, onCancel, blockOnly) {
      var actions = blockOnly
        ? '<div class="wv-modal-actions">' +
            '<button class="wv-modal-btn wv-modal-btn-primary" id="wv-keep-writing">✏️ Keep writing</button>' +
          '</div>'
        : '<div class="wv-modal-actions">' +
            '<button class="wv-modal-btn wv-modal-btn-primary" id="wv-keep-writing">✏️ Keep writing</button>' +
            '<button class="wv-modal-btn wv-modal-btn-secondary" id="wv-submit-anyway">Submit anyway</button>' +
          '</div>';

      var overlay = document.createElement('div');
      overlay.className = 'wv-modal-overlay';
      overlay.innerHTML =
        '<div class="wv-modal-dialog">' +
          '<div class="wv-modal-icon">⚠️</div>' +
          '<h4 class="wv-modal-title">' + title + '</h4>' +
          '<p>' + mainP + '</p>' +
          (extraNote || '') +
          actions +
        '</div>';

      document.body.appendChild(overlay);

      var dismiss = function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      };

      document.getElementById('wv-keep-writing').onclick = function() {
        dismiss();
        if (typeof onCancel === 'function') onCancel();
      };

      if (!blockOnly) {
        document.getElementById('wv-submit-anyway').onclick = function() {
          dismiss();
          if (typeof onProceed === 'function') onProceed();
        };
      }
    }
  };
})();
