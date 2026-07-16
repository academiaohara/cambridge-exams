// js/tile-themes.js
// Shared colour tokens for hint-word tiles and gap pills across learning, vocabulary and tests.

(function() {
  'use strict';

  var VALID_KEYS = ['learning', 'phrasal-verbs', 'idioms', 'word-formation', 'tests'];

  var TileThemes = {
    VALID_KEYS: VALID_KEYS,

    isValid: function(key) {
      return VALID_KEYS.indexOf(key) !== -1;
    },

    /** Resolve theme key from course / vocab / test context. */
    resolve: function(opts) {
      opts = opts || {};
      if (opts.tileTheme && this.isValid(opts.tileTheme)) return opts.tileTheme;
      if (opts.categoryId && this.isValid(opts.categoryId)) return opts.categoryId;

      var unitData = opts.unitData || null;
      var unitType = unitData && unitData.type;
      if (unitType === 'progress_test' || unitType === 'review') return 'tests';

      if (opts.section === 'tests' || opts.isTest) return 'tests';

      return 'learning';
    },

    apply: function(el, key) {
      if (!el) return;
      var theme = this.isValid(key) ? key : 'learning';
      el.setAttribute('data-tile-theme', theme);
    },

    applyResolved: function(el, opts) {
      this.apply(el, this.resolve(opts));
    }
  };

  window.TileThemes = TileThemes;
})();
