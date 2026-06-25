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

    function normalizeFormatType(formatType) {
      if (window.SunePlayScreens && window.SunePlayScreens.normalizeFormatType) {
        return window.SunePlayScreens.normalizeFormatType(formatType);
      }
      switch (formatType) {
        case 'conjugation_gap_fill': return 'free_text_gap_fill';
        case 'marked_error_gap_correction': return 'error_correction';
        case 'verb_tile_conjugation_gap': return 'verb_bank_two_step';
        case 'passage_error_hunt_counter': return 'passage_error_hunt_single';
        default: return formatType;
      }
    }

    function applyFallbackIfNeeded(screen) {
      if (!screen) return screen;
      var key = screen.screenId || screen.itemId;
      var count = failureCounts[key] || 0;
      if (count < maxFailures || !screen.fallbackFormatType) return screen;

      var fallback = screen.fallbackFormatType;
      var normalizedFallback = normalizeFormatType(fallback);
      if (normalizedFallback === screen.formatType) return screen;

      var converted = Object.assign({}, screen, {
        formatType: normalizedFallback,
        sourceFormatType: fallback,
        _convertedFrom: screen.formatType,
        _isFallback: true
      });

      if (normalizedFallback === 'word_order_tiles' && screen.payload) {
        converted.payload = buildWordOrderPayload(screen.payload);
      }
      if (normalizedFallback === 'two_option_choice' && screen.payload) {
        converted.payload = buildTwoOptionFromGapFill(screen.payload);
      }
      if (normalizedFallback === 'free_text_gap_fill' && screen.payload) {
        if (fallback === 'conjugation_gap_fill' || screen.formatType === 'verb_bank_two_step') {
          converted.payload = Object.assign({}, screen.payload, {
            sentence: screen.payload.sentence || screen.payload.blankSentence || '',
            verbPrompt: screen.payload.verbPrompt
              || screen.payload.baseVerb
              || screen.payload.selectedVerb
              || ''
          });
        } else if (fallback === 'preselected_verb_gap_fill') {
          converted.payload = Object.assign({}, screen.payload, {
            preselectedVerb: screen.payload.selectedVerb || screen.payload.baseVerb
          });
        }
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
