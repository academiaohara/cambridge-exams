// js/router.js
(function() {
  var VALID_LEVELS = ['b1', 'b2', 'c1', 'c2'];
  var VALID_SECTIONS = ['reading', 'listening', 'writing', 'speaking'];
  var COURSE_CATEGORIES = ['phrasal-verbs', 'idioms', 'word-formation'];
  var TIPS_SKILLS = ['reading', 'listening', 'writing', 'speaking'];

  window.Router = {
    /**
     * Convert a history state object into a URL path.
     * @param {Object} state - The state object from history.pushState / replaceState
     * @returns {string} URL path (e.g. '/testpractice/c1/test-1/reading/3')
     */
    /**
     * Map internal mode name to URL prefix.
     * @param {string} mode - 'practice' or 'exam'
     * @returns {string} URL prefix ('testpractice' or 'testsimulation')
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

        case 'crosswordList':
          return '/crosswords';

        case 'tips':
          return '/tips';

        case 'tipsSkill':
          return '/tips/' + (state.level || 'B2').toLowerCase() + '/' + (state.skill || 'reading');

        case 'fastExercises':
          return '/fast-exercises';

        case 'fastExerciseCategory':
          if (COURSE_CATEGORIES.indexOf(state.categoryId) !== -1) {
            return '/course/' + (state.categoryId || '');
          }
          return '/fast-exercises/' + (state.categoryId || '');

        case 'fastExercisePoint':
          return '/fast-exercises/' + (state.categoryId || '') + '/' +
            (state.levelId || '') + '/' + (state.lessonId || '') + '/' +
            (typeof state.pointIndex !== 'undefined' ? state.pointIndex : 0);

        case 'course':
          return '/course';

        case 'courseTheory':
          return '/course/theory';

        case 'courseBlock':
          return '/course/block-' + (state.blockKey || '1');

        case 'courseUnit':
          var cuPath = '/course/block-' + (state.blockKey || '1') + '/' + (state.unitId || '');
          if (typeof state.sectionIdx !== 'undefined' && state.sectionIdx !== null) {
            cuPath += '/' + state.sectionIdx;
          }
          return cuPath;

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
      if (first === 'crosswords')                         return { view: 'crosswordList' };

      // ── Tips routes ───────────────────────────────
      if (first === 'tips') {
        if (segments.length === 1) {
          return { view: 'tips' };
        }
        if (segments.length >= 3 &&
            VALID_LEVELS.indexOf(segments[1].toLowerCase()) !== -1 &&
            TIPS_SKILLS.indexOf(segments[2].toLowerCase()) !== -1) {
          return {
            view: 'tipsSkill',
            level: segments[1].toUpperCase(),
            skill: segments[2].toLowerCase()
          };
        }
        return { view: 'tips' };
      }

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
        if (segments.length >= 5 && VALID_LEVELS.indexOf(segments[1].toLowerCase()) !== -1) {
          var level   = segments[1].toUpperCase();
          var examId  = segments[2].replace('test-', 'Test');
          var section = segments[3].toLowerCase();
          var part    = parseInt(segments[4], 10);
          if (VALID_SECTIONS.indexOf(section) !== -1 && !isNaN(part) && part >= 1) {
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

      // ── Course routes ──────────────────────────────
      if (first === 'course') {
        if (segments.length === 1) {
          return { view: 'course' };
        }
        if (segments.length === 2) {
          if (segments[1] === 'theory') {
            return { view: 'courseTheory' };
          }
          var _courseCategories = COURSE_CATEGORIES;
          if (_courseCategories.indexOf(segments[1]) !== -1) {
            return { view: 'fastExerciseCategory', categoryId: segments[1] };
          }
        }
        if (segments.length >= 2 && segments[1].indexOf('block-') === 0) {
          var blockKey = segments[1].replace('block-', '');
          if (segments.length === 2) {
            return { view: 'courseBlock', blockKey: blockKey };
          }
          if (segments.length >= 3) {
            var courseUnitId = segments[2];
            var courseUnitState = { view: 'courseUnit', blockKey: blockKey, unitId: courseUnitId };
            if (segments.length >= 4) {
              var sIdx = parseInt(segments[3], 10);
              if (!isNaN(sIdx)) courseUnitState.sectionIdx = sIdx;
            }
            return courseUnitState;
          }
        }
        return { view: 'course' };
      }

      // ── Legacy exercise routes: /{level}/{test-N}/{section}/{part} ──
      if (VALID_LEVELS.indexOf(first) !== -1 && segments.length >= 4) {
        var legLevel   = first.toUpperCase();
        var legExamId  = segments[1].replace('test-', 'Test');
        var legSection = segments[2].toLowerCase();
        var legPart    = parseInt(segments[3], 10);

        if (VALID_SECTIONS.indexOf(legSection) !== -1 && !isNaN(legPart) && legPart >= 1) {
          return { view: 'exercise', level: legLevel, examId: legExamId, section: legSection, part: legPart };
        }
      }

      // Fallback
      return { view: 'dashboard' };
    }
  };
})();
