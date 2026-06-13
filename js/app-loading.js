// js/app-loading.js — Full-page loading screen with paw animation and random tips
(function () {
  'use strict';

  var TIPS = [
    'Read the questions before you listen.',
    'Eliminate wrong options first in multiple choice.',
    'Only one word is required for each open cloze gap.',
    'Check for collocations and fixed phrases.',
    'Look at the words before and after each gap.',
    'Read the whole sentence before answering.',
    'Think about word formation patterns.',
    'Consider if the word should be positive or negative.',
    'Your answer must not exceed six words in key word transformations.',
    'The keyword must be used and cannot be changed.',
    'Read broadly to develop your vocabulary.',
    "Don't spend too much time on any single part of the test.",
    'Be careful with spelling — it affects your score.',
    "As you read, you don't need to understand every single word.",
    'Practice skimming and scanning texts under timed conditions.',
    'Listen for key words and synonyms in listening tasks.',
    "Don't panic if you miss one answer — focus on the next.",
    'Write while listening; do not rely on memory.',
    'Pay attention to linking words in reading passages.',
    'Study the completed examples to understand expected answers.',
    'Look closely at each option before choosing an answer.',
    'Read each text carefully to understand what it explores.',
    'Check that your answer fits grammatically with the surrounding words.',
    'Note whether words are followed by a preposition, gerund, or infinitive.',
    'Familiarise yourself with the format of each exam part.',
    'Use context to deduce the meaning of unknown words.',
    'Contractions count as two words in transformations.',
    'Underline key words in questions to find answers faster.',
    'Read the title and subtitle — they hint at the main idea.',
    'Save a few minutes at the end to review your answers.'
  ];

  window.AppLoadingScreen = {
    _hidden: false,

    init: function () {
      var tipEl = document.getElementById('app-loading-tip-text');
      if (tipEl && TIPS.length) {
        tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      }
      document.body.classList.add('app-is-loading');
    },

    hide: function () {
      if (this._hidden) return;
      var el = document.getElementById('app-loading-screen');
      if (!el) return;

      this._hidden = true;
      el.classList.add('app-loading-screen--hiding');

      var cleanup = function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        document.body.classList.remove('app-is-loading');
      };

      el.addEventListener('transitionend', cleanup, { once: true });
      setTimeout(cleanup, 500);
    },

    /** Safety net if init hangs on network/auth calls. */
    _startSafetyTimeout: function () {
      setTimeout(function () {
        AppLoadingScreen.hide();
      }, 12000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      AppLoadingScreen.init();
      AppLoadingScreen._startSafetyTimeout();
    });
  } else {
    AppLoadingScreen.init();
    AppLoadingScreen._startSafetyTimeout();
  }
})();
