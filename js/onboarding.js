// js/onboarding.js — One-step level selection after first sign-in / guest entry
(function () {
  'use strict';

  var STORAGE_KEY = 'engaged_onboarding_done_v1';
  var _selectedLevel = null;
  var _pendingNewUser = false;

  function isDone() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markDone() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) { /* ignore */ }
  }

  window.Onboarding = {
    needsShow: function () {
      if (isDone()) return false;
      return _pendingNewUser || AppState.isGuest;
    },

    markPendingForNewUser: function () {
      _pendingNewUser = true;
    },

    show: function () {
      var screen = document.getElementById('onboarding-screen');
      if (!screen) return;

      _selectedLevel = null;
      screen.querySelectorAll('.onboarding-option').forEach(function (btn) {
        btn.classList.remove('selected');
      });
      var continueBtn = document.getElementById('onboarding-continue-btn');
      if (continueBtn) continueBtn.disabled = true;

      screen.style.display = 'flex';
      screen.classList.add('visible');
      document.body.classList.add('onboarding-open');
    },

    hide: function () {
      var screen = document.getElementById('onboarding-screen');
      if (!screen) return;
      screen.classList.remove('visible');
      screen.style.display = 'none';
      document.body.classList.remove('onboarding-open');
    },

    selectLevel: function (level) {
      _selectedLevel = level;
      document.querySelectorAll('.onboarding-option').forEach(function (btn) {
        btn.classList.toggle('selected', btn.getAttribute('data-level') === level);
      });
      var continueBtn = document.getElementById('onboarding-continue-btn');
      if (continueBtn) continueBtn.disabled = false;
    },

    complete: async function () {
      if (!_selectedLevel) return;

      var level = _selectedLevel;
      AppState.currentLevel = level;
      try {
        localStorage.setItem('preferred_level', level);
      } catch (e) { /* ignore */ }

      if (AppState.isAuthenticated && typeof UserProfile !== 'undefined') {
        await UserProfile.updateProfile({ preferred_level: level });
      }

      markDone();
      _pendingNewUser = false;
      this.hide();

      if (!AppState.isAuthenticated && !AppState.isGuest) {
        AppState.isGuest = true;
        if (typeof Auth !== 'undefined') Auth.renderSignInButton();
      }

      var app = document.getElementById('app');
      if (app) app.style.display = '';
      if (typeof Landing !== 'undefined') Landing.hide();

      history.replaceState({ view: 'dashboard' }, '', '/');

      if (typeof AppLoadingScreen !== 'undefined') {
        AppLoadingScreen.show({
          minMs: 2500,
          onHidden: function () {
            if (typeof Dashboard !== 'undefined') Dashboard.render();
          }
        });
      } else if (typeof Dashboard !== 'undefined') {
        Dashboard.render();
      }
    },

    maybeShowAfterAuth: function () {
      if (!this.needsShow()) {
        if (typeof Dashboard !== 'undefined') Dashboard.render();
        history.replaceState({ view: 'dashboard' }, '', '/');
        return;
      }
      history.replaceState({ view: 'welcome' }, '', '/welcome');
      if (typeof App !== 'undefined' && App.showWelcome) {
        App.showWelcome();
      } else {
        this.show();
      }
    }
  };
})();
