// js/landing.js — Marketing landing page at /
(function () {
  'use strict';

  var MOBILE_QUERY = '(max-width: 768px)';
  var _touchBlocker = null;
  var _viewportMeta = null;
  var _originalViewport = '';

  function isMobileLanding() {
    return window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;
  }

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
    if (!isMobileLanding()) {
      document.body.classList.add('landing-open');
      return;
    }

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

  function renderDesktopLanding() {
    return (
      '<header class="landing-header">' +
        '<a href="/" class="preauth-brand-link" onclick="event.preventDefault(); Landing.render()">' +
          '<img src="Assets/images/sunelogoreduced.svg" class="preauth-brand-logo" alt="Sune English">' +
        '</a>' +
      '</header>' +
      '<main class="landing-main">' +
        '<div class="landing-mascot-col">' +
          '<img src="Assets/images/SunePanther.svg" alt="" class="landing-mascot" aria-hidden="true">' +
        '</div>' +
        '<div class="landing-content-col">' +
          '<h1 class="landing-title">' +
            'Learn English<br>with <span class="landing-title-accent">confidence</span>' +
          '</h1>' +
          '<div class="landing-cta-block">' +
            '<p class="landing-subtitle">Fun, simple lessons with your smart fox guide.</p>' +
            '<div class="landing-actions">' +
              '<a href="/welcome" class="landing-btn landing-btn--primary" onclick="event.preventDefault(); Auth.navigateTo(\'/welcome\')">Get started</a>' +
              '<a href="/login" class="landing-btn landing-btn--secondary" onclick="event.preventDefault(); Auth.navigateTo(\'/login\')">I already have an account</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</main>'
    );
  }

  function renderMobileLanding() {
    return (
      '<main class="landing-main">' +
        '<div class="landing-mascot-col">' +
          '<div class="landing-mascot-wrap">' +
            '<img src="Assets/images/SunePanther.svg" alt="" class="landing-mascot" aria-hidden="true">' +
            '<div class="landing-mascot-shadow" aria-hidden="true"></div>' +
          '</div>' +
          '<img src="Assets/images/sunelogoreduced.svg" class="landing-brand-logo" id="landing-brand" alt="Sune English">' +
          '<p class="landing-subtitle">Learn and have fun. Free forever.</p>' +
        '</div>' +
        '<div class="landing-actions">' +
          '<a href="/welcome" class="landing-btn landing-btn--primary" onclick="event.preventDefault(); Auth.navigateTo(\'/welcome\')">Get started</a>' +
          '<a href="/login" class="landing-btn landing-btn--secondary" onclick="event.preventDefault(); Auth.navigateTo(\'/login\')">I already have an account</a>' +
        '</div>' +
      '</main>'
    );
  }

  window.Landing = {
    render: function () {
      AppState.currentView = 'landing';

      var app = document.getElementById('app');
      if (app) app.style.display = 'none';

      var existing = document.getElementById('landing-screen');
      if (existing) existing.remove();

      var mobile = isMobileLanding();
      var screen = document.createElement('div');
      screen.id = 'landing-screen';
      screen.className = 'landing-screen' + (mobile ? ' landing-screen--mobile-app' : '');
      screen.innerHTML = mobile ? renderMobileLanding() : renderDesktopLanding();

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
