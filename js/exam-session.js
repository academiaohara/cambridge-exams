// js/exam-session.js
// Limits full exam attempts to 5 per day, resets at midnight UTC

(function() {
  var STORAGE_KEY = 'cambridge_exam_attempts';
  var MAX_ATTEMPTS = 5;

  window.ExamSession = {
    data: null,

    init: function() {
      this.data = this._load();
      this._cleanStale();
    },

    _today: function() {
      return new Date().toISOString().slice(0, 10);
    },

    _load: function() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore */ }
      return {};
    },

    _save: function() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) { /* ignore */ }
    },

    _cleanStale: function() {
      var today = this._today();
      var changed = false;
      Object.keys(this.data).forEach(function(key) {
        if (this.data[key].date !== today) {
          delete this.data[key];
          changed = true;
        }
      }, this);
      if (changed) this._save();
    },

    _key: function(examId) {
      return examId || '__global__';
    },

    getAttempts: function(examId) {
      var key = this._key(examId);
      var today = this._today();
      var entry = this.data[key];
      if (!entry || entry.date !== today) return 0;
      return entry.count || 0;
    },

    getRemaining: function(examId) {
      return Math.max(0, MAX_ATTEMPTS - this.getAttempts(examId));
    },

    canStart: function(examId) {
      return this.getAttempts(examId) < MAX_ATTEMPTS;
    },

    incrementAttempts: function(examId) {
      var key = this._key(examId);
      var today = this._today();
      if (!this.data[key] || this.data[key].date !== today) {
        this.data[key] = { date: today, count: 0 };
      }
      this.data[key].count += 1;
      this._save();
      this._refreshDisplays(examId);
    },

    getDisplay: function(examId) {
      return this.getAttempts(examId) + '/' + MAX_ATTEMPTS;
    },

    showBlockedModal: function(examId) {
      var midnight = new Date();
      midnight.setUTCHours(24, 0, 0, 0);
      var msLeft = midnight - new Date();
      var hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
      var minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
      var timeStr = hoursLeft + 'h ' + minutesLeft + 'm';

      var overlay = document.createElement('div');
      overlay.className = 'wv-modal-overlay';
      overlay.innerHTML =
        '<div class="wv-modal-dialog">' +
          '<div class="wv-modal-icon"><span class="material-symbols-outlined">alarm</span></div>' +
          '<h4 class="wv-modal-title">Daily Limit Reached</h4>' +
          '<p>You have used all <strong>5 daily attempts</strong> for full exams.</p>' +
          '<p>Come back tomorrow! Resets in: <span class="exam-blocked-timer">' + timeStr + '</span></p>' +
          '<p class="wv-modal-note"><span class="material-symbols-outlined">lightbulb</span> You can still use <strong>Practice Mode</strong> or <strong>Micro-Learning</strong> without limits.</p>' +
          '<div class="wv-modal-actions">' +
            '<button class="wv-modal-btn wv-modal-btn-primary" id="exam-blocked-ok">Got it</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      document.getElementById('exam-blocked-ok').onclick = function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      };
    },

    _refreshDisplays: function(examId) {
      var key = this._key(examId);
      var self = this;
      document.querySelectorAll('[data-attempts-examid="' + examId + '"]').forEach(function(el) {
        el.textContent = self.getDisplay(examId);
        if (!self.canStart(examId)) {
          el.closest('[data-exam-attempts-block]')
            ?.classList.add('attempts-exhausted');
        }
      });
    }
  };
})();
