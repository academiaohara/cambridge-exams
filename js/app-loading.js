// js/app-loading.js — Full-page loading screen with paw animation and random tips
(function () {
  'use strict';

  var DEFAULT_MIN_MS = 5000;
  var INLINE_MIN_MS = 3000;
  var _pageStart = Date.now();

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

  function getMinLoadingMs() {
    if (window.CONFIG && typeof CONFIG.MIN_LOADING_MS === 'number') {
      return CONFIG.MIN_LOADING_MS;
    }
    return DEFAULT_MIN_MS;
  }

  function pickRandomTip() {
    if (!TIPS.length) return '';
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  function buildPawsMarkup() {
    return (
      '<div class="app-loading-paws" aria-hidden="true">' +
        '<div class="app-loading-paws-row app-loading-paws-row--top">' +
          '<img src="Assets/images/huella.svg" alt="" class="app-loading-paw app-loading-paw--1" width="52" height="65">' +
          '<img src="Assets/images/huella.svg" alt="" class="app-loading-paw app-loading-paw--3" width="52" height="65">' +
          '<img src="Assets/images/huella.svg" alt="" class="app-loading-paw app-loading-paw--5" width="52" height="65">' +
        '</div>' +
        '<div class="app-loading-paws-row app-loading-paws-row--bottom">' +
          '<img src="Assets/images/huella.svg" alt="" class="app-loading-paw app-loading-paw--2" width="52" height="65">' +
          '<img src="Assets/images/huella.svg" alt="" class="app-loading-paw app-loading-paw--4" width="52" height="65">' +
          '<img src="Assets/images/huella.svg" alt="" class="app-loading-paw app-loading-paw--6" width="52" height="65">' +
        '</div>' +
      '</div>'
    );
  }

  function buildInlineMarkup(options) {
    options = options || {};
    var title = options.title || 'Loading';
    var subtitle = options.subtitle || '';
    var showLogo = options.showLogo !== false;
    var showTip = options.showTip !== false;
    var compact = options.compact === true;

    var html = '<div class="app-loading-inner' + (compact ? ' app-loading-inner--compact' : '') + '">';
    if (showLogo && !compact) {
      html += '<img src="Assets/images/sunelogoreduced2.svg" alt="Sune English" class="app-loading-logo">';
    }
    if (title) {
      html += '<p class="app-loading-title">' + title + '</p>';
    }
    html += buildPawsMarkup();
    if (subtitle) {
      html += '<p class="app-loading-subtitle">' + subtitle + '</p>';
    }
    if (showTip && !compact) {
      html += (
        '<div class="app-loading-tip">' +
          '<div class="app-loading-tip-label">' +
            '<span class="material-symbols-outlined" aria-hidden="true">lightbulb</span>' +
            '<span>English tip</span>' +
          '</div>' +
          '<p class="app-loading-tip-text">' + pickRandomTip() + '</p>' +
        '</div>'
      );
    }
    html += '</div>';
    return html;
  }

  function buildLoadingMarkup() {
    return buildInlineMarkup({ title: 'Loading', showLogo: true, showTip: true });
  }

  window.AppLoadingScreen = {
    _hidden: false,
    _hideRequested: false,
    _shownAt: null,
    _onHiddenCallback: null,
    _customMinMs: null,
    _manual: false,
    INLINE_MIN_MS: INLINE_MIN_MS,

    getMarkup: function () {
      return buildLoadingMarkup();
    },

    getPawsMarkup: function () {
      return buildPawsMarkup();
    },

    buildInlineMarkup: function (options) {
      return buildInlineMarkup(options);
    },

    wrapInlineLoading: function (innerHtml, wrapperClass) {
      wrapperClass = wrapperClass || 'cw-inline-loading';
      return (
        '<div class="' + wrapperClass + '" role="status" aria-live="polite" aria-label="Loading">' +
          innerHtml +
        '</div>'
      );
    },

    markShown: function () {
      return Date.now();
    },

    waitMinDuration: function (shownAt, minMs) {
      minMs = typeof minMs === 'number' ? minMs : INLINE_MIN_MS;
      var elapsed = Date.now() - (shownAt || Date.now());
      var remaining = Math.max(0, minMs - elapsed);
      return new Promise(function (resolve) {
        setTimeout(resolve, remaining);
      });
    },

    showInline: function (el, options) {
      options = options || {};
      var shownAt = Date.now();
      var inner = this.buildInlineMarkup(options);
      var wrapperClass = options.wrapperClass || 'cw-inline-loading';
      var html = this.wrapInlineLoading(inner, wrapperClass);
      if (typeof el === 'string') el = document.getElementById(el);
      if (el) el.innerHTML = html;
      return shownAt;
    },

    init: function () {
      this._shownAt = _pageStart;
      var tipEl = document.getElementById('app-loading-tip-text');
      if (tipEl && TIPS.length) {
        tipEl.textContent = pickRandomTip();
      }
      document.body.classList.add('app-is-loading');
    },

    show: function (options) {
      options = options || {};
      this._hidden = false;
      this._hideRequested = false;
      this._shownAt = Date.now();
      this._onHiddenCallback = typeof options.onHidden === 'function' ? options.onHidden : null;
      this._customMinMs = typeof options.minMs === 'number' ? options.minMs : null;
      this._manual = options.manual === true;

      var el = document.getElementById('app-loading-screen');
      if (!el) {
        el = document.createElement('div');
        el.id = 'app-loading-screen';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', 'Loading');
        document.body.appendChild(el);
      }

      el.classList.remove('app-loading-screen--hiding');
      el.innerHTML = buildLoadingMarkup();
      el.style.display = 'flex';
      document.body.classList.add('app-is-loading');

      if (!this._manual) {
        var self = this;
        setTimeout(function () {
          self.hide();
        }, this._customMinMs || getMinLoadingMs());
      }
    },

    skipDelay: function () {
      this._customMinMs = 0;
    },

    hide: function () {
      if (this._hidden || this._hideRequested) return;
      this._hideRequested = true;

      var minMs = this._customMinMs != null ? this._customMinMs : getMinLoadingMs();
      var elapsed = Date.now() - (this._shownAt || Date.now());
      var remaining = Math.max(0, minMs - elapsed);
      var self = this;

      setTimeout(function () {
        self._doHide();
      }, remaining);
    },

    _doHide: function () {
      if (this._hidden) return;
      var el = document.getElementById('app-loading-screen');
      if (!el) return;

      this._hidden = true;
      this._customMinMs = null;
      this._manual = false;
      el.classList.add('app-loading-screen--hiding');

      var callback = this._onHiddenCallback;
      this._onHiddenCallback = null;

      var cleanup = function () {
        el.style.display = 'none';
        document.body.classList.remove('app-is-loading');
        if (typeof callback === 'function') callback();
      };

      el.addEventListener('transitionend', cleanup, { once: true });
      setTimeout(cleanup, 500);
    },

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
