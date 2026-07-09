// js/sune-play/practice-queue.js
// Practice screen queue for Sune Play sessions

(function() {
  'use strict';

  function createPracticeQueue(initialScreens, opts) {
    opts = opts || {};

    var queue = (initialScreens || []).slice();
    var completed = [];
    var failed = [];
    var failureCounts = {};

    function currentScreen() {
      return queue.length ? queue[0] : null;
    }

    function remainingScreens() {
      return queue.slice();
    }

    function removeCompletedItem(screen) {
      if (!screen) return;
      var idx = queue.indexOf(screen);
      if (idx === -1) idx = queue.findIndex(function(s) { return s.screenId === screen.screenId; });
      if (idx !== -1) queue.splice(idx, 1);
      completed.push(screen);
    }

    function returnFailedItemToQueue(screen, position) {
      if (!screen) return;
      var idx = queue.indexOf(screen);
      if (idx !== -1) queue.splice(idx, 1);
      var key = screen.screenId || screen.itemId;
      failureCounts[key] = (failureCounts[key] || 0) + 1;
      failed.push(screen);
      if (position === 'front') {
        queue.unshift(screen);
      } else {
        queue.push(screen);
      }
    }

    function applyFallbackIfNeeded(screen) {
      return screen;
    }

    function getFailureCount(screen) {
      var key = screen && (screen.screenId || screen.itemId);
      return key ? (failureCounts[key] || 0) : 0;
    }

    function incrementFailure(screen) {
      var key = screen.screenId || screen.itemId;
      failureCounts[key] = (failureCounts[key] || 0) + 1;
      return failureCounts[key];
    }

    function isComplete() {
      return queue.length === 0;
    }

    function correctCount() {
      return completed.length;
    }

    return {
      get currentScreen() { return currentScreen(); },
      get completedScreens() { return completed.slice(); },
      get failedScreens() { return failed.slice(); },
      remainingScreens: remainingScreens,
      removeCompletedItem: removeCompletedItem,
      returnFailedItemToQueue: returnFailedItemToQueue,
      applyFallbackIfNeeded: applyFallbackIfNeeded,
      getFailureCount: getFailureCount,
      incrementFailure: incrementFailure,
      isComplete: isComplete,
      correctCount: correctCount,
      get queueLength() { return queue.length; }
    };
  }

  window.SunePlayQueue = { createPracticeQueue: createPracticeQueue };
})();
