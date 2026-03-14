// js/router.js
(function() {
  window.Router = {
    /**
     * Convert a history state object into a URL path.
     * @param {Object} state - The state object from history.pushState / replaceState
     * @returns {string} URL path (e.g. '/c1/test-1/reading/3')
     */
    stateToPath: function(state) {
      if (!state || !state.view) return '/';

      switch (state.view) {
        case 'dashboard':
          return '/';

        case 'subpage':
          return '/' + (state.mode || 'practice');

        case 'exercise':
          var level = (AppState.currentLevel || 'C1').toLowerCase();
          var test = (state.examId || 'Test1').replace('Test', 'test-');
          var section = state.section || 'reading';
          var part = state.part || 1;
          return '/' + level + '/' + test + '/' + section + '/' + part;

        case 'profile':
          return '/profile';

        case 'premium':
          return '/premium';

        case 'gradeEvolution':
          return '/stats';

        case 'quicksteps':
          return '/quicksteps';

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
      if (first === 'practice' && segments.length === 1) return { view: 'subpage', mode: 'practice' };
      if (first === 'exam' && segments.length === 1)     return { view: 'subpage', mode: 'exam' };
      if (first === 'profile')                            return { view: 'profile' };
      if (first === 'premium')                            return { view: 'premium' };
      if (first === 'stats')                              return { view: 'gradeEvolution' };
      if (first === 'quicksteps')                         return { view: 'quicksteps' };

      // ── Exercise routes: /{level}/{test-N}/{section}/{part} ──
      var validLevels = ['a2', 'b1', 'b2', 'c1', 'c2'];
      var validSections = ['reading', 'listening', 'writing', 'speaking'];

      if (validLevels.indexOf(first) !== -1 && segments.length >= 4) {
        var level   = first.toUpperCase();                        // 'C1'
        var examId  = segments[1].replace('test-', 'Test');       // 'Test1'
        var section = segments[2].toLowerCase();                  // 'reading'
        var part    = parseInt(segments[3], 10);                  // 3

        if (validSections.indexOf(section) !== -1 && !isNaN(part) && part >= 1) {
          return { view: 'exercise', level: level, examId: examId, section: section, part: part };
        }
      }

      // Fallback
      return { view: 'dashboard' };
    }
  };
})();
