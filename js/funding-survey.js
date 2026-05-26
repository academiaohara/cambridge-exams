// js/funding-survey.js — one-time funding preference survey on entry
(function () {
  'use strict';

  var STORAGE_KEY = 'engaged_funding_survey_v1';
  var DEFER_KEY = 'engaged_funding_survey_deferred_until';
  var _retryTimer = null;

  function isAuthModalOpen() {
    var auth = document.getElementById('auth-modal-overlay');
    if (!auth) return false;
    if (auth.classList.contains('visible')) return true;
    try {
      return window.getComputedStyle(auth).display !== 'none';
    } catch (e) {
      return auth.style.display !== 'none';
    }
  }

  window.FundingSurvey = {
    isEnabled: function () {
      if (typeof CONFIG === 'undefined') return false;
      if (CONFIG.FUNDING_SURVEY_ENABLED === false) return false;
      if (CONFIG.FUNDING_SURVEY_ENABLED === true) return true;
      return !!CONFIG.PROMOTION_MODE;
    },

    hasCompleted: function () {
      try {
        return !!localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        return false;
      }
    },

    isDeferred: function () {
      try {
        var until = localStorage.getItem(DEFER_KEY);
        if (!until) return false;
        return Date.now() < parseInt(until, 10);
      } catch (e) {
        return false;
      }
    },

    /** Wait until auth modal is closed, then show (retries automatically). */
    maybeShow: function () {
      if (!this.isEnabled() || this.hasCompleted() || this.isDeferred()) return;
      if (_retryTimer) {
        clearTimeout(_retryTimer);
        _retryTimer = null;
      }

      var self = this;
      var attempts = 0;
      var maxAttempts = 60;

      function attempt() {
        attempts += 1;
        if (!self.isEnabled() || self.hasCompleted() || self.isDeferred()) return;

        if (isAuthModalOpen()) {
          if (attempts < maxAttempts) {
            _retryTimer = setTimeout(attempt, 500);
          }
          return;
        }

        _retryTimer = null;
        var overlay = document.getElementById('funding-survey-overlay');
        if (!overlay) {
          console.warn('[FundingSurvey] Overlay #funding-survey-overlay not found — deploy includes index.html update?');
          return;
        }
        if (overlay.classList.contains('visible')) return;

        setTimeout(function () {
          if (!self.isEnabled() || self.hasCompleted() || self.isDeferred()) return;
          if (isAuthModalOpen()) {
            self.maybeShow();
            return;
          }
          self._show();
        }, 350);
      }

      attempt();
    },

    _show: function () {
      var overlay = document.getElementById('funding-survey-overlay');
      if (!overlay) return;
      overlay.classList.add('visible');
      overlay.style.display = 'flex';
      document.body.classList.add('funding-survey-open');
      var first = overlay.querySelector('input[name="funding_model"]');
      if (first) first.focus();
    },

    _hide: function () {
      var overlay = document.getElementById('funding-survey-overlay');
      if (!overlay) return;
      overlay.classList.remove('visible');
      overlay.classList.add('hiding');
      document.body.classList.remove('funding-survey-open');
      setTimeout(function () {
        overlay.style.display = 'none';
        overlay.classList.remove('hiding');
      }, 280);
    },

    defer: function () {
      var days = (CONFIG && CONFIG.FUNDING_SURVEY_DEFER_DAYS) || 3;
      try {
        localStorage.setItem(DEFER_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
      } catch (e) { /* ignore */ }
      this._hide();
    },

    submit: async function () {
      var form = document.getElementById('funding-survey-form');
      if (!form) return;

      var choiceEl = form.querySelector('input[name="funding_model"]:checked');
      var commentEl = document.getElementById('funding-survey-comment');
      var errEl = document.getElementById('funding-survey-error');
      var submitBtn = document.getElementById('funding-survey-submit');

      if (!choiceEl) {
        if (errEl) {
          errEl.textContent = 'Please choose one option.';
          errEl.style.display = 'block';
        }
        return;
      }

      var choice = choiceEl.value;
      var comment = commentEl ? (commentEl.value || '').trim() : '';

      if (errEl) errEl.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      try {
        var headers = { 'Content-Type': 'application/json' };
        if (typeof Auth !== 'undefined' && Auth.getToken) {
          var token = Auth.getToken();
          if (token) headers.Authorization = 'Bearer ' + token;
        }

        var res = await fetch('/api/funding-survey', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            choice: choice,
            comment: comment,
            level: AppState.currentLevel || null,
            isGuest: !!AppState.isGuest
          })
        });

        var data = {};
        try { data = await res.json(); } catch (e2) { /* empty */ }

        if (!res.ok && !data.storedLocally) {
          throw new Error(data.message || data.error || 'Could not save your response');
        }
      } catch (err) {
        console.warn('[FundingSurvey] save failed, storing locally', err);
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          choice: choice,
          at: new Date().toISOString()
        }));
        localStorage.removeItem(DEFER_KEY);
      } catch (e3) { /* ignore */ }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
      this._hide();
    }
  };
})();
