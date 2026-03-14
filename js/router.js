// js/router.js
(function() {
  window.Router = {
    /**
     * Convert a history state object into a URL path.
     * @param {Object} state - The state object from history.pushState / replaceState
     * @returns {string} URL path (e.g. '/testpractice/c1/test-1/reading/3')
     */
    /**
     * Map internal mode name to URL prefix.
     */
    _modePrefix: function(mode) {
      return (mode || 'practice') === 'exam' ? 'testsimulation' : 'testpractice';
    },

    stateToPath: function(state) {
      if (!state || !state.view) return '/';

      switch (state.view) {
        case 'dashboard':
          return '/';

        case 'subpage':
          return '/' + this._modePrefix(state.mode);

        case 'exercise':
          var level = (state.level || AppState.currentLevel || 'C1').toLowerCase();
          var test = (state.examId || 'Test1').replace('Test', 'test-');
          var section = state.section || 'reading';
          var part = state.part || 1;
          var prefix = this._modePrefix(state.mode || AppState.currentMode);
          return '/' + prefix + '/' + level + '/' + test + '/' + section + '/' + part;

        case 'profile':
          return '/profile';

        case 'premium':
          return '/premium';

        case 'gradeEvolution':
          return '/stats';

        case 'quicksteps':
          return '/quicksteps';

        case 'fastExercises':
          return '/fast-exercises';

        case 'fastExerciseCategory':
          return '/fast-exercises/' + (state.categoryId || '');

        case 'fastExercisePoint':
          return '/fast-exercises/' + (state.categoryId || '') + '/' +
            (state.levelId || '') + '/' + (state.lessonId || '') + '/' +
            (typeof state.pointIndex !== 'undefined' ? state.pointIndex : 0);

        default:
          return '/';
      }
    },

    /**
     * Parse a URL path into a state object that the popstate handler understands.
     * @param {string} [path] - URL pathname (defaults to window.location.pathname)
     * @returns {Object} state object
     */
    pathToState: function(path) {
      path = path || window.location.pathname;

      // Strip trailing slash (but keep '/')
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }

      var segments = path.split('/').filter(Boolean);

      if (segments.length === 0) {
        return { view: 'dashboard' };
      }

      var first = segments[0].toLowerCase();

      // ── Static pages ──────────────────────────────
      if (first === 'profile')                            return { view: 'profile' };
      if (first === 'premium')                            return { view: 'premium' };
      if (first === 'stats')                              return { view: 'gradeEvolution' };
      if (first === 'quicksteps')                         return { view: 'quicksteps' };

      // ── Test Practice / Test Simulation routes ─────
      var modeMap = { testpractice: 'practice', testsimulation: 'exam' };
      // Legacy aliases
      if (first === 'practice' && segments.length === 1) return { view: 'subpage', mode: 'practice' };
      if (first === 'exam' && segments.length === 1)     return { view: 'subpage', mode: 'exam' };

      if (modeMap[first]) {
        var mode = modeMap[first];
        // Subpage: /testpractice or /testsimulation (no further segments)
        if (segments.length === 1) {
          return { view: 'subpage', mode: mode };
        }
        // Exercise: /testpractice/{level}/{test-N}/{section}/{part}
        var validLevels = ['a2', 'b1', 'b2', 'c1', 'c2'];
        var validSections = ['reading', 'listening', 'writing', 'speaking'];
        if (segments.length >= 5 && validLevels.indexOf(segments[1].toLowerCase()) !== -1) {
          var level   = segments[1].toUpperCase();
          var examId  = segments[2].replace('test-', 'Test');
          var section = segments[3].toLowerCase();
          var part    = parseInt(segments[4], 10);
          if (validSections.indexOf(section) !== -1 && !isNaN(part) && part >= 1) {
            return { view: 'exercise', level: level, examId: examId, section: section, part: part, mode: mode };
          }
        }
        // Fallback: treat as subpage
        return { view: 'subpage', mode: mode };
      }

      // ── Fast Exercises routes ──────────────────────
      if (first === 'fast-exercises') {
        if (segments.length === 1) {
          return { view: 'fastExercises' };
        }
        if (segments.length === 2) {
          return { view: 'fastExerciseCategory', categoryId: segments[1] };
        }
        if (segments.length >= 5) {
          var pointIdx = parseInt(segments[4], 10);
          if (!isNaN(pointIdx) && pointIdx >= 0) {
            return {
              view: 'fastExercisePoint',
              categoryId: segments[1],
              levelId: segments[2],
              lessonId: segments[3],
              pointIndex: pointIdx
            };
          }
        }
        // Fallback for fast-exercises with unrecognised sub-path
        return { view: 'fastExercises' };
      }

      // ── Legacy exercise routes: /{level}/{test-N}/{section}/{part} ──
      var legacyValidLevels = ['a2', 'b1', 'b2', 'c1', 'c2'];
      var legacyValidSections = ['reading', 'listening', 'writing', 'speaking'];

      if (legacyValidLevels.indexOf(first) !== -1 && segments.length >= 4) {
        var legLevel   = first.toUpperCase();
        var legExamId  = segments[1].replace('test-', 'Test');
        var legSection = segments[2].toLowerCase();
        var legPart    = parseInt(segments[3], 10);

        if (legacyValidSections.indexOf(legSection) !== -1 && !isNaN(legPart) && legPart >= 1) {
          return { view: 'exercise', level: legLevel, examId: legExamId, section: legSection, part: legPart };
        }
      }

      // Fallback
      return { view: 'dashboard' };
    }
  };
})();
