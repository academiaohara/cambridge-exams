// js/access-control.js
// Central access checks — toggle promotion via CONFIG.PROMOTION_MODE
(function () {
  'use strict';

  function cfg() {
    return (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
  }

  window.AccessControl = {
    isPromotionMode: function () {
      return !!cfg().PROMOTION_MODE;
    },

    shouldHidePlansUI: function () {
      return this.isPromotionMode();
    },

    effectiveHasExamsPack: function () {
      if (AppState.hasExamsPack || AppState.isAdmin) return true;
      return this.isPromotionMode() && AppState.isAuthenticated;
    },

    effectiveHasTheoryPack: function () {
      if (AppState.hasTheoryPack || AppState.isAdmin) return true;
      return this.isPromotionMode() && AppState.isAuthenticated;
    },

    /** Writing / Speaking: auth required; promo skips one-free-try gate (API rate limit applies). */
    canAccessWritingSpeaking: function () {
      if (!AppState.isAuthenticated) {
        return { allowed: false, reason: 'auth' };
      }
      if (AppState.hasExamsPack || AppState.isAdmin) {
        return { allowed: true, unlimited: true };
      }
      if (this.isPromotionMode()) {
        return { allowed: true, limited: true, reason: 'promotion' };
      }
      return { allowed: true, limited: true, reason: 'trial' };
    },

    shouldBlockWritingSpeakingTrial: function (section, examId) {
      var access = this.canAccessWritingSpeaking();
      if (!access.allowed) return { block: true, reason: 'auth' };
      if (access.unlimited) return { block: false };
      if (this.isPromotionMode()) return { block: false };

      var trialKey = section === 'writing' ? 'cambridge_free_writing_used' : 'cambridge_free_speaking_used';
      var stateKey = section === 'writing' ? '_freeWritingAccessExam' : '_freeSpeakingAccessExam';
      if (localStorage.getItem(trialKey) && AppState[stateKey] !== examId) {
        return { block: true, reason: 'upgrade' };
      }
      return { block: false, consumeTrial: true, trialKey: trialKey, stateKey: stateKey };
    },

    markWritingSpeakingTrialUsed: function (section, examId, gate) {
      if (!gate || !gate.consumeTrial) return;
      AppState[gate.stateKey] = examId;
      try { localStorage.setItem(gate.trialKey, '1'); } catch (e) { /* quota */ }
    },

    getWritingSpeakingBadge: function (sectionKey) {
      var access = this.canAccessWritingSpeaking();
      if (!access.allowed) {
        return '<span class="guest-locked-badge"><i class="fas fa-lock"></i> Sign in required</span>';
      }
      if (access.unlimited) return '';
      if (this.isPromotionMode()) {
        var q = this._quotaFor(sectionKey);
        var left = q && typeof q.remaining === 'number' ? q.remaining : '—';
        var lim = q && q.limit ? q.limit : (cfg().PROMOTION_WRITING_LIMIT || 5);
        return '<span class="guest-locked-badge promo-quota-badge"><i class="fas fa-bolt"></i> ' + left + '/' + lim + ' today</span>';
      }
      var trialKey = sectionKey === 'writing' ? 'cambridge_free_writing_used' : 'cambridge_free_speaking_used';
      if (localStorage.getItem(trialKey)) {
        return '<span class="guest-locked-badge"><i class="fas fa-lock"></i> Pack Exams required</span>';
      }
      return '<span class="guest-locked-badge"><i class="fas fa-gift"></i> 1 free try</span>';
    },

    isWritingSpeakingSectionLocked: function (sectionKey) {
      if (!AppState.isAuthenticated && (sectionKey === 'writing' || sectionKey === 'speaking')) {
        return true;
      }
      if (this.effectiveHasExamsPack()) {
        if (this.isPromotionMode() && !AppState.hasExamsPack && !AppState.isAdmin) {
          var q = this._quotaFor(sectionKey);
          if (q && q.remaining === 0) return true;
        }
        return false;
      }
      if (this.isPromotionMode()) return false;
      if (sectionKey === 'writing' || sectionKey === 'speaking') {
        var trialKey = sectionKey === 'writing' ? 'cambridge_free_writing_used' : 'cambridge_free_speaking_used';
        return !!localStorage.getItem(trialKey);
      }
      return false;
    },

    getAiAuthHeaders: function () {
      var headers = { 'Content-Type': 'application/json' };
      if (typeof Auth !== 'undefined' && Auth.getToken) {
        var token = Auth.getToken();
        if (token) headers.Authorization = 'Bearer ' + token;
      }
      return headers;
    },

    refreshPromoQuotas: async function () {
      if (!this.isPromotionMode() || !AppState.isAuthenticated) return;
      if (AppState.hasExamsPack || AppState.isAdmin) return;
      try {
        var headers = this.getAiAuthHeaders();
        var res = await fetch('/api/ai-quota', { method: 'GET', headers: headers });
        if (!res.ok) return;
        var data = await res.json();
        AppState.promoQuota = data;
      } catch (e) {
        console.warn('[AccessControl] quota fetch failed', e);
      }
    },

    applyQuotaFromResponse: function (headers) {
      if (!headers || !headers.get) return;
      var remaining = headers.get('X-AI-Remaining');
      if (remaining == null) return;
      var feature = headers.get('X-AI-Feature') || 'writing';
      var limit = headers.get('X-AI-Limit');
      if (!AppState.promoQuota) AppState.promoQuota = {};
      AppState.promoQuota[feature] = {
        remaining: parseInt(remaining, 10),
        limit: limit ? parseInt(limit, 10) : undefined
      };
    },

    handleAiApiError: function (data, res) {
      if (!data) return false;
      if (data.error === 'auth_required' || res.status === 401) {
        if (typeof Auth !== 'undefined' && Auth._showAuthModal) Auth._showAuthModal();
        return true;
      }
      if (data.error === 'rate_limit' || res.status === 429) {
        this.showRateLimitModal(data);
        if (typeof data.remaining === 'number' && data.feature) {
          if (!AppState.promoQuota) AppState.promoQuota = {};
          AppState.promoQuota[data.feature] = { remaining: data.remaining, limit: data.limit };
        }
        if (typeof Dashboard !== 'undefined' && Dashboard.render) Dashboard.render();
        return true;
      }
      return false;
    },

    showRateLimitModal: function (data) {
      if (document.getElementById('promo-rate-limit-overlay')) return;
      var limit = data && data.limit ? data.limit : (cfg().PROMOTION_WRITING_LIMIT || 5);
      var feature = data && data.feature === 'speaking' ? 'Speaking' : 'Writing';
      var overlay = document.createElement('div');
      overlay.id = 'promo-rate-limit-overlay';
      overlay.className = 'guest-gate-overlay';
      overlay.innerHTML =
        '<div class="guest-gate-modal">' +
          '<button type="button" class="guest-gate-close" onclick="document.getElementById(\'promo-rate-limit-overlay\').remove()" aria-label="Close">&times;</button>' +
          '<div class="guest-gate-icon"><i class="fas fa-hourglass-half"></i></div>' +
          '<h3>Daily ' + feature + ' limit reached</h3>' +
          '<p>You have used all ' + limit + ' AI ' + feature.toLowerCase() + ' evaluations for today. Come back tomorrow to continue practicing.</p>' +
          '<button type="button" class="premium-plan-btn primary" onclick="document.getElementById(\'promo-rate-limit-overlay\').remove()">Got it</button>' +
        '</div>';
      document.body.appendChild(overlay);
    },

    _quotaFor: function (sectionKey) {
      if (!AppState.promoQuota) return null;
      var key = sectionKey === 'speaking' ? 'speaking' : 'writing';
      return AppState.promoQuota[key] || null;
    }
  };
})();
