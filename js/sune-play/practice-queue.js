// js/sune-play/practice-queue.js
// Practice screen queue for Sune Play sessions

(function() {
  'use strict';

  function createPracticeQueue(initialScreens, opts) {
    opts = opts || {};
    var maxFailures = opts.maxFailuresBeforeFallback != null
      ? opts.maxFailuresBeforeFallback
      : 2;

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
      if (!screen) return screen;
      var key = screen.screenId || screen.itemId;
      var count = failureCounts[key] || 0;
      if (count < maxFailures || !screen.fallbackFormatType) return screen;

      var fallback = screen.fallbackFormatType;
      if (fallback === screen.formatType) return screen;

      var converted = Object.assign({}, screen, {
        formatType: fallback,
        _convertedFrom: screen.formatType,
        _isFallback: true
      });

      if (fallback === 'word_order_tiles' && screen.payload) {
        converted.payload = buildWordOrderPayload(screen.payload);
      }
      if (fallback === 'two_option_choice' && screen.payload) {
        converted.payload = buildTwoOptionFromGapFill(screen.payload);
      }
      if (fallback === 'preselected_verb_gap_fill' && screen.payload) {
        converted.formatType = 'free_text_gap_fill';
        converted.payload = Object.assign({}, screen.payload, {
          preselectedVerb: screen.payload.selectedVerb || screen.payload.baseVerb
        });
      }

      return converted;
    }

    function buildWordOrderPayload(payload) {
      var answer = payload.answer || (payload.acceptedAnswers && payload.acceptedAnswers[0]) || '';
      var words = String(answer).replace(/\s*\.\s*$/, '').split(/\s+/).filter(Boolean);
      var shuffled = words.slice().sort(function() { return Math.random() - 0.5; });
      return Object.assign({}, payload, {
        tiles: shuffled,
        answer: answer,
        acceptedAnswers: payload.acceptedAnswers || [answer]
      });
    }

    function buildTwoOptionFromGapFill(payload) {
      var correct = payload.answer || (payload.acceptedAnswers && payload.acceptedAnswers[0]) || '';
      var wrong = payload.wrongOption || 'is playing';
      if (payload.verbPrompt) {
        wrong = payload.verbPrompt.indexOf('not') !== -1 ? "aren't watching" : 'plays';
      }
      return Object.assign({}, payload, {
        sentenceBefore: (payload.sentence || '').split(/\.{3,}|…{2,}|_{3,}/)[0] || '',
        sentenceAfter: (payload.sentence || '').split(/\.{3,}|…{2,}|_{3,}/)[1] || '',
        options: [wrong, correct].filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 2),
        answer: correct,
        completedSentence: payload.completedSentence || payload.sentence
      });
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
