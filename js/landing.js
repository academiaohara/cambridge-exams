// js/landing.js — Marketing landing page at /
(function () {
  'use strict';

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
        '<header class="landing-header">' +
          '<a href="/" class="landing-logo" onclick="event.preventDefault(); Landing.render()">' +
            '<span class="landing-logo-text">SUNE</span>' +
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
        '</main>';

      document.body.appendChild(screen);
      document.body.classList.add('landing-open');
    },

    hide: function () {
      var screen = document.getElementById('landing-screen');
      if (screen) screen.remove();
      document.body.classList.remove('landing-open');

      var app = document.getElementById('app');
      if (app) app.style.display = '';
    }
  };
})();
