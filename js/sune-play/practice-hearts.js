// js/sune-play/practice-hearts.js
// Hearts / lives management for Sune Play practice sessions

(function() {
  'use strict';

  function usePracticeHearts(opts) {
    opts = opts || {};
    var maxLives = opts.maxLives != null ? opts.maxLives : 5;
    var onGameOver = opts.onGameOver || function() {};

    var state = {
      currentLives: maxLives,
      maxLives: maxLives,
      mistakesCount: 0,
      mistakesByItemId: {},
      screenLifeLoss: {}
    };

    function loseLife(amount, meta) {
      meta = meta || {};
      amount = amount || 1;
      var screenId = meta.screenId || 'unknown';
      var itemId = meta.itemId || screenId;
      var maxLoss = meta.maxLifeLossPerScreen;

      if (maxLoss != null) {
        var alreadyLost = state.screenLifeLoss[screenId] || 0;
        if (alreadyLost >= maxLoss) return false;
        amount = Math.min(amount, maxLoss - alreadyLost);
      }

      if (amount <= 0) return false;

      state.screenLifeLoss[screenId] = (state.screenLifeLoss[screenId] || 0) + amount;
      state.mistakesCount += amount;
      state.mistakesByItemId[itemId] = (state.mistakesByItemId[itemId] || 0) + amount;
      state.currentLives = Math.max(0, state.currentLives - amount);

      if (state.currentLives <= 0) onGameOver();
      return true;
    }

    function resetLives(newMax) {
      if (newMax != null) {
        state.maxLives = newMax;
        maxLives = newMax;
      }
      state.currentLives = state.maxLives;
      state.mistakesCount = 0;
      state.mistakesByItemId = {};
      state.screenLifeLoss = {};
    }

    function getScreenLifeLoss(screenId) {
      return state.screenLifeLoss[screenId] || 0;
    }

    return {
      get currentLives() { return state.currentLives; },
      get maxLives() { return state.maxLives; },
      get isGameOver() { return state.currentLives <= 0; },
      get mistakesCount() { return state.mistakesCount; },
      get mistakesByItemId() { return Object.assign({}, state.mistakesByItemId); },
      get screenLifeLoss() { return Object.assign({}, state.screenLifeLoss); },
      loseLife: loseLife,
      resetLives: resetLives,
      getScreenLifeLoss: getScreenLifeLoss
    };
  }

  window.SunePlayHearts = { usePracticeHearts: usePracticeHearts };
})();
