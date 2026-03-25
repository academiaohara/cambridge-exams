// js/mixed-test.js
// Random Mix: generates a practice session using one of each exercise part
// picked from different tests at random.  speaking3 + speaking4 always share
// the same source test because they are thematically linked.

(function () {
  // ── helpers ──────────────────────────────────────────────────────────────

  function _shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Returns only the available (non coming_soon) tests for the current level.
  function _availableTests() {
    var level = AppState.currentLevel || 'C1';
    return (window.EXAMS_DATA[level] || []).filter(function (e) {
      return e.status === 'available';
    });
  }

  // ── public API ────────────────────────────────────────────────────────────

  window.MixedTest = {

    /**
     * Build a random exercise plan.
     * Returns an array of { examId, section, part, label } objects.
     */
    generatePlan: function () {
      var tests = _availableTests();
      if (tests.length === 0) return [];

      var level = AppState.currentLevel || 'C1';

      // Determine part counts for this level
      var readingTotal = level === 'B2' ? 7 : 8;
      var listeningTotal = 4;
      var writingTotal = 2;
      var speakingTotal = 4;

      var plan = [];
      var shuffled = _shuffle(tests);
      var idx = 0;

      // Helper: pick next available test, cycling if needed
      function nextTest() {
        var t = shuffled[idx % shuffled.length];
        idx++;
        return t.id;
      }

      // reading parts
      for (var r = 1; r <= readingTotal; r++) {
        plan.push({ examId: nextTest(), section: 'reading', part: r });
      }
      // listening parts
      for (var l = 1; l <= listeningTotal; l++) {
        plan.push({ examId: nextTest(), section: 'listening', part: l });
      }
      // writing parts
      for (var w = 1; w <= writingTotal; w++) {
        plan.push({ examId: nextTest(), section: 'writing', part: w });
      }
      // speaking 1 + 2 (independent)
      plan.push({ examId: nextTest(), section: 'speaking', part: 1 });
      plan.push({ examId: nextTest(), section: 'speaking', part: 2 });
      // speaking 3 + 4 — must share the same test
      var sp34 = nextTest();
      plan.push({ examId: sp34, section: 'speaking', part: 3 });
      plan.push({ examId: sp34, section: 'speaking', part: 4 });

      return plan;
    },

    /** True when a mixed session is currently active. */
    isActive: function () {
      return Array.isArray(AppState.mixedTestPlan) && AppState.mixedTestPlan.length > 0;
    },

    /** Start a brand-new mixed test session. */
    start: function () {
      var plan = this.generatePlan();
      if (plan.length === 0) {
        alert('No tests available yet. Please check back later.');
        return;
      }
      AppState.mixedTestPlan = plan;
      AppState.mixedTestCurrentIndex = 0;
      AppState.currentMode = 'practice';

      // Persist so a page reload can resume
      try {
        localStorage.setItem('cambridge_mixed_plan', JSON.stringify(plan));
      } catch (e) { /* ignore */ }

      this._openCurrent();
    },

    /** Open the exercise at the current index of the plan. */
    _openCurrent: function () {
      if (!this.isActive()) return;
      var item = AppState.mixedTestPlan[AppState.mixedTestCurrentIndex];
      if (!item) return;
      Exercise.openPart(item.examId, item.section, item.part);
    },

    /** Navigate to the next exercise in the plan. */
    goToNext: function () {
      if (!this.isActive()) return;
      Exercise.savePartState();
      AppState.mixedTestCurrentIndex++;
      if (AppState.mixedTestCurrentIndex >= AppState.mixedTestPlan.length) {
        this.finish();
      } else {
        this._openCurrent();
      }
    },

    /** Navigate to the previous exercise in the plan. */
    goToPrev: function () {
      if (!this.isActive()) return;
      Exercise.savePartState();
      if (AppState.mixedTestCurrentIndex > 0) {
        AppState.mixedTestCurrentIndex--;
        this._openCurrent();
      }
    },

    /** Called when the user reaches the end of the plan. */
    finish: function () {
      AppState.mixedTestPlan = null;
      AppState.mixedTestCurrentIndex = 0;
      try { localStorage.removeItem('cambridge_mixed_plan'); } catch (e) { /* ignore */ }
      this._showFinishScreen();
    },

    /** Clear state without showing a finish screen (e.g., user exits mid-session). */
    clear: function () {
      AppState.mixedTestPlan = null;
      AppState.mixedTestCurrentIndex = 0;
      try { localStorage.removeItem('cambridge_mixed_plan'); } catch (e) { /* ignore */ }
    },

    _showFinishScreen: function () {
      var content = document.getElementById('main-content');
      if (!content) { loadDashboard(); return; }
      content.innerHTML =
        '<div class="mixed-test-finish">' +
          '<div class="mixed-test-finish-icon"><span class="material-symbols-outlined">celebration</span></div>' +
          '<h2>Congratulations!</h2>' +
          '<p>You have completed your Random Mix session.<br>All exercises have been saved to your progress.</p>' +
          '<div class="mixed-test-finish-btns">' +
            '<button class="btn-mixed-again" onclick="MixedTest.start()">' +
              '<span class="material-symbols-outlined">shuffle</span> New Random Mix' +
            '</button>' +
            '<button class="btn-mixed-home" onclick="Exercise.closeExercise()">' +
              '<i class="fas fa-home"></i> Back to Home' +
            '</button>' +
          '</div>' +
        '</div>';
    },

    /**
     * Returns a human-readable label for the current mixed exercise position,
     * e.g. "Exercise 5 / 17  ·  Reading Part 3  (Test12)"
     */
    getProgressLabel: function () {
      if (!this.isActive()) return '';
      var idx = AppState.mixedTestCurrentIndex;
      var plan = AppState.mixedTestPlan;
      var item = plan[idx];
      if (!item) return '';
      var sectionLabel = item.section.charAt(0).toUpperCase() + item.section.slice(1);
      return 'Exercise ' + (idx + 1) + ' / ' + plan.length +
             '\u00a0\u00b7\u00a0' + sectionLabel + ' Part ' + item.part +
             '\u00a0(' + item.examId + ')';
    }
  };
})();
