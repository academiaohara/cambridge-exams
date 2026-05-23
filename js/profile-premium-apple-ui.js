/**
 * Light motion polish for My Account profile and Choose your Pack (entrance only).
 * Observes #main-content; does not alter Auth, purchase handlers, or pricing logic.
 */
(function () {
  'use strict';

  var MO_OPTS = { childList: true, subtree: true };
  var scanTimer = null;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function enhanceAppleProfileUI(root) {
    if (!root || !root.querySelector) return;
    var el = root.querySelector('.account-page');
    if (!el || el.getAttribute('data-account-profile-ui') === '1') return;
    el.setAttribute('data-account-profile-ui', '1');

    if (prefersReducedMotion()) {
      el.classList.add('apple-ui-reduced-motion');
      return;
    }

    var cards = el.querySelectorAll('.account-identity-card, .account-module');
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.setProperty('--apple-stagger', String(i * 52) + 'ms');
      cards[i].classList.add('apple-ui-profile-card-enter');
    }
  }

  function enhancePremiumPlansUI(root) {
    if (!root || !root.querySelector) return;
    var el = root.querySelector('.premium-plans-section');
    if (!el) return;

    if (prefersReducedMotion()) {
      el.classList.add('apple-ui-reduced-motion');
    }

    var grid = el.querySelector('#premium-packs-grid');
    if (grid) {
      var packCards = grid.querySelectorAll('.premium-pack-card');
      for (var i = 0; i < packCards.length; i++) {
        var card = packCards[i];
        if (card.getAttribute('data-apple-pack-animated') === '1') continue;
        card.setAttribute('data-apple-pack-animated', '1');
        if (!prefersReducedMotion()) {
          card.style.setProperty('--apple-stagger', String(i * 68) + 'ms');
          card.classList.add('apple-ui-pack-enter');
        }
      }
    }

    var dur = el.querySelector('.premium-duration-selector');
    if (dur && dur.getAttribute('data-apple-duration-ui') !== '1') {
      dur.setAttribute('data-apple-duration-ui', '1');
      if (!prefersReducedMotion()) {
        var btns = dur.querySelectorAll('.premium-duration-btn');
        for (var j = 0; j < btns.length; j++) {
          btns[j].style.setProperty('--apple-stagger', String(j * 36) + 'ms');
          btns[j].classList.add('apple-ui-duration-enter');
        }
      }
    }
  }

  function scanMainContent() {
    var mc = document.getElementById('main-content');
    if (!mc) return;
    enhanceAppleProfileUI(mc);
    enhancePremiumPlansUI(mc);
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scanMainContent();
    }, 0);
  }

  function bindObserver() {
    var mc = document.getElementById('main-content');
    if (!mc || mc.getAttribute('data-apple-ui-observer') === '1') return;
    mc.setAttribute('data-apple-ui-observer', '1');
    var obs = new MutationObserver(scheduleScan);
    obs.observe(mc, MO_OPTS);
  }

  document.addEventListener('DOMContentLoaded', function () {
    scanMainContent();
    bindObserver();
  });
})();
