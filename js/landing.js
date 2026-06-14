// js/landing.js — App-style marketing landing at /
(function () {
  'use strict';

  var _touchBlocker = null;
  var _viewportMeta = null;
  var _originalViewport = '';

  function lockViewport() {
    _viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!_viewportMeta) return;
    _originalViewport = _viewportMeta.getAttribute('content') || '';
    _viewportMeta.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }

  function unlockViewport() {
    if (_viewportMeta && _originalViewport) {
      _viewportMeta.setAttribute('content', _originalViewport);
    }
  }

  function preventTouchMove(e) {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }

  function lockScroll() {
    document.documentElement.classList.add('landing-open');
    document.body.classList.add('landing-open');
    lockViewport();

    _touchBlocker = function (e) {
      preventTouchMove(e);
    };
    document.addEventListener('touchmove', _touchBlocker, { passive: false });
    document.addEventListener('gesturestart', _touchBlocker, { passive: false });
  }

  function unlockScroll() {
    document.documentElement.classList.remove('landing-open');
    document.body.classList.remove('landing-open');
    unlockViewport();

    if (_touchBlocker) {
      document.removeEventListener('touchmove', _touchBlocker);
      document.removeEventListener('gesturestart', _touchBlocker);
      _touchBlocker = null;
    }
  }

  window.Landing = {
    render: function () {
      AppState.currentView = 'landing';

      var app = document.getElementById('app');
      if (app) app.style.display = 'none';

      var existing = document.getElementById('landing-screen');
      if (existing) existing.remove();

      var screen = document.createElement('div');
      screen.id = 'landing-screen';
      screen.className = 'landing-screen';
      screen.innerHTML =
        '<main class="landing-main">' +
          '<section class="landing-hero" aria-labelledby="landing-brand">' +
            '<div class="landing-mascot-wrap">' +
              '<img src="Assets/images/SunePanther.svg" alt="" class="landing-mascot" aria-hidden="true">' +
              '<div class="landing-mascot-shadow" aria-hidden="true"></div>' +
            '</div>' +
            '<h1 id="landing-brand" class="landing-brand">sune english</h1>' +
            '<p class="landing-tagline">Aprende y diviértete. Gratis de por vida.</p>' +
          '</section>' +
          '<div class="landing-actions">' +
            '<a href="/welcome" class="landing-btn landing-btn--primary" onclick="event.preventDefault(); Auth.navigateTo(\'/welcome\')">Empieza ahora</a>' +
            '<a href="/login" class="landing-btn landing-btn--secondary" onclick="event.preventDefault(); Auth.navigateTo(\'/login\')">Ya tengo una cuenta</a>' +
          '</div>' +
        '</main>';

      document.body.appendChild(screen);
      lockScroll();
    },

    hide: function () {
      var screen = document.getElementById('landing-screen');
      if (screen) screen.remove();
      unlockScroll();

      var app = document.getElementById('app');
      if (app) app.style.display = '';
    }
  };
})();
