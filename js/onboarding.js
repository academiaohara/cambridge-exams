// js/onboarding.js — Path choice + level selection + placement progress test after first sign-in / guest entry
(function () {
  'use strict';

  var STORAGE_KEY = 'engaged_onboarding_done_v1';
  var PLACEMENT_PASS_PCT = 60;

  var ONBOARDING_LEVELS = [
    { code: 'tier1', name: 'Elemental', equiv: 'B1 Preliminary', bars: 1, courseLevel: 'B1' },
    { code: 'tier2', name: 'Principiante', equiv: 'B2 First', bars: 2, courseLevel: 'B2' },
    { code: 'tier3', name: 'Intermedio', equiv: 'B2 First', bars: 3, courseLevel: 'B2' },
    { code: 'tier4', name: 'Avanzado', equiv: 'C1 Advanced', bars: 4, courseLevel: 'C1' },
    { code: 'tier5', name: 'Experto', equiv: 'C1 Advanced', bars: 5, courseLevel: 'C1' }
  ];

  var _selectedLevel = null;
  var _pendingNewUser = false;
  var _placementCourseLevel = null;

  function isDone() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markDone() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
      localStorage.setItem('engaged_welcome_seen_v1', '1');
    } catch (e) { /* ignore */ }
  }

  function getLevelConfig(code) {
    return ONBOARDING_LEVELS.find(function (l) { return l.code === code; }) || null;
  }

  function mapToCourseLevel(onboardingLevel) {
    var cfg = getLevelConfig(onboardingLevel);
    return cfg ? cfg.courseLevel : 'B1';
  }

  function clearUnitLessonStorage(unitId) {
    if (!unitId) return;
    try {
      localStorage.removeItem('sune_play_progress_' + unitId);
      localStorage.removeItem('sune_play_theory_' + unitId);
      var bglPrefix = 'bgl-progress-' + unitId;
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(bglPrefix) === 0) keysToRemove.push(key);
      }
      keysToRemove.forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (e) { /* ignore */ }
  }

  function clearAllUnitLessonStorage() {
    try {
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        if (key.indexOf('sune_play_progress_') === 0 ||
            key.indexOf('sune_play_theory_') === 0 ||
            key.indexOf('bgl-progress-') === 0) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (e) { /* ignore */ }
  }

  function clearCourseProgress(level) {
    var keys = [
      'cambridge_course_progress_' + level,
      'cambridge_course_section_progress_' + level,
      'cambridge_course_section_opened_' + level,
      'cambridge_review_answers_' + level,
      'cambridge_review_section_state_' + level
    ];
    keys.forEach(function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    });
  }

  function clearAllCourseProgress() {
    ['B1', 'B2', 'C1'].forEach(clearCourseProgress);
    ['B1', 'B2', 'C1'].forEach(function (level) {
      try { localStorage.removeItem('course_ex_state_' + level); } catch (e) { /* ignore */ }
    });
    clearAllUnitLessonStorage();
    try {
      localStorage.removeItem('cambridge_course_path_advance_index');
      localStorage.removeItem('cambridge_course_path_advance_pending');
    } catch (e) { /* ignore */ }
  }

  function buildLevelOptionsHtml() {
    return ONBOARDING_LEVELS.map(function (level) {
      var barsHtml = '';
      for (var i = 1; i <= 5; i++) {
        barsHtml += '<span class="onboarding-bar' + (i <= level.bars ? ' onboarding-bar--filled' : '') + '"></span>';
      }
      return '<button type="button" class="onboarding-option" data-level="' + level.code + '" onclick="Onboarding.selectLevel(\'' + level.code + '\')">' +
        '<span class="onboarding-option-icon" aria-hidden="true">' + barsHtml + '</span>' +
        '<span class="onboarding-option-text">' +
          '<strong class="onboarding-level-name">' + level.name + '</strong>' +
          '<span class="onboarding-level-equiv">' + level.equiv + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
  }

  function ensureLevelOptions() {
    var container = document.getElementById('onboarding-level-options');
    if (container && !container.children.length) {
      container.innerHTML = buildLevelOptionsHtml();
    }
  }

  function showStep(step) {
    var pathStep = document.getElementById('onboarding-path-step');
    var levelStep = document.getElementById('onboarding-level-step');
    var placementStep = document.getElementById('onboarding-placement-step');
    if (pathStep) pathStep.style.display = step === 'path' ? 'flex' : 'none';
    if (levelStep) levelStep.style.display = step === 'level' ? 'flex' : 'none';
    if (placementStep) placementStep.style.display = step === 'placement' ? 'flex' : 'none';
  }

  function getPlacementScore() {
    var totalCorrect = 0;
    var totalMax = 0;
    document.querySelectorAll('#onboarding-placement-content .cu-review-section').forEach(function (sec) {
      var c = parseInt(sec.getAttribute('data-correct-items') || '-1', 10);
      var m = parseInt(sec.getAttribute('data-total-items') || '0', 10);
      if (c >= 0 && m > 0) {
        totalCorrect += c;
        totalMax += m;
      }
    });
    return {
      correct: totalCorrect,
      max: totalMax,
      pct: totalMax > 0 ? Math.round((totalCorrect / totalMax) * 100) : 0
    };
  }

  function openFirstB1Topic() {
    if (typeof BentoGrid === 'undefined') return;
    BentoGrid._courseLevel = 'B1';
    BentoGrid._courseSection = 'learning';
    if (typeof MainNav !== 'undefined' && MainNav.setActive) {
      MainNav.setActive('learning');
    }
    BentoGrid.openCourseUnit('Unit1', 'data/Course/B1/Unit1.json', 0);
  }

  window.Onboarding = {
    clearAllCourseProgress: clearAllCourseProgress,
    clearUnitLessonStorage: clearUnitLessonStorage,
    clearAllUnitLessonStorage: clearAllUnitLessonStorage,

    needsShow: function () {
      if (isDone()) return false;
      return _pendingNewUser || AppState.isGuest;
    },

    markPendingForNewUser: function () {
      _pendingNewUser = true;
    },

    show: function () {
      var screen = document.getElementById('onboarding-screen');
      if (!screen) return;

      ensureLevelOptions();
      _selectedLevel = null;
      _placementCourseLevel = null;
      showStep('path');

      screen.querySelectorAll('.onboarding-option[data-level]').forEach(function (btn) {
        btn.classList.remove('selected');
      });
      screen.querySelectorAll('.onboarding-path-option').forEach(function (btn) {
        btn.classList.remove('selected');
      });
      var continueBtn = document.getElementById('onboarding-continue-btn');
      if (continueBtn) continueBtn.disabled = true;

      var placementContent = document.getElementById('onboarding-placement-content');
      if (placementContent) placementContent.innerHTML = '';

      screen.style.display = 'flex';
      screen.classList.add('visible');
      document.body.classList.add('onboarding-open');
    },

    hide: function () {
      var screen = document.getElementById('onboarding-screen');
      if (!screen) return;
      screen.classList.remove('visible');
      screen.style.display = 'none';
      document.body.classList.remove('onboarding-open');
    },

    selectPath: function (path) {
      document.querySelectorAll('.onboarding-path-option').forEach(function (btn) {
        btn.classList.toggle('selected', btn.getAttribute('data-path') === path);
      });

      if (path === 'from-zero') {
        this.startFromZero();
      } else if (path === 'by-level') {
        showStep('level');
      }
    },

    backToPathSelection: function () {
      _selectedLevel = null;
      showStep('path');
      var continueBtn = document.getElementById('onboarding-continue-btn');
      if (continueBtn) continueBtn.disabled = true;
      document.querySelectorAll('.onboarding-option[data-level]').forEach(function (btn) {
        btn.classList.remove('selected');
      });
    },

    startFromZero: function () {
      clearAllCourseProgress();
      this._finalizeOnboarding('B1', true, null, { openFirstB1Topic: true });
    },

    selectLevel: function (level) {
      _selectedLevel = level;
      document.querySelectorAll('.onboarding-option[data-level]').forEach(function (btn) {
        btn.classList.toggle('selected', btn.getAttribute('data-level') === level);
      });
      var continueBtn = document.getElementById('onboarding-continue-btn');
      if (continueBtn) continueBtn.disabled = false;
    },

    backToLevelSelection: function () {
      showStep('level');
      var contentEl = document.getElementById('onboarding-placement-content');
      if (contentEl) contentEl.innerHTML = '';
    },

    complete: function () {
      if (!_selectedLevel) return;
      this.startPlacementTest();
    },

    startPlacementTest: async function () {
      if (!_selectedLevel) return;

      var courseLevel = mapToCourseLevel(_selectedLevel);
      _placementCourseLevel = courseLevel;
      AppState.currentLevel = courseLevel;

      var contentEl = document.getElementById('onboarding-placement-content');
      var loadingEl = document.getElementById('onboarding-placement-loading');
      var finishBtn = document.getElementById('onboarding-placement-finish-btn');
      if (!contentEl) {
        this._finalizeOnboarding(courseLevel, false);
        return;
      }

      showStep('placement');
      var placementLoadingStart = (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.markShown)
        ? AppLoadingScreen.markShown()
        : Date.now();
      if (loadingEl) {
        loadingEl.style.display = 'flex';
        if (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.getPawsMarkup) {
          loadingEl.innerHTML = AppLoadingScreen.getPawsMarkup();
        }
      }
      if (finishBtn) finishBtn.disabled = true;
      contentEl.innerHTML = '';

      var cfg = getLevelConfig(_selectedLevel);
      var subtitle = document.getElementById('onboarding-placement-subtitle');
      if (subtitle && cfg) {
        subtitle.textContent = 'Progress Test · ' + cfg.equiv;
      }

      try {
        var indexRes = await fetch('data/Course/' + courseLevel + '/index.json');
        if (!indexRes.ok) throw new Error('index');
        var indexData = await indexRes.json();
        var ptItem = (indexData.items || []).find(function (i) { return i.id === 'ProgressTest1'; });
        if (!ptItem) throw new Error('no progress test');

        var ptRes = await fetch('data/Course/' + courseLevel + '/' + ptItem.file);
        if (!ptRes.ok) throw new Error('progress test file');
        var unitData = await ptRes.json();

        if (unitData && !unitData.type) {
          var keys = Object.keys(unitData);
          if (keys.length === 1 && unitData[keys[0]] && unitData[keys[0]].type) {
            unitData = unitData[keys[0]];
          }
        }

        if (!unitData || unitData.type !== 'progress_test' || typeof BentoGrid === 'undefined' || !BentoGrid._renderProgressTestUnit) {
          throw new Error('invalid progress test');
        }

        BentoGrid._courseLevel = courseLevel;
        contentEl.innerHTML = '<div class="onboarding-placement-test">' + BentoGrid._renderProgressTestUnit(unitData) + '</div>';
        if (finishBtn) finishBtn.disabled = false;
      } catch (e) {
        contentEl.innerHTML = '<div class="onboarding-placement-error">Could not load the placement test. You will start from Etapa 1.</div>';
        if (finishBtn) finishBtn.disabled = false;
      }

      if (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.waitMinDuration) {
        await AppLoadingScreen.waitMinDuration(placementLoadingStart);
      }
      if (loadingEl) loadingEl.style.display = 'none';
    },

    finishPlacementTest: async function () {
      if (typeof BentoGrid !== 'undefined' && BentoGrid._checkCuExSection) {
        document.querySelectorAll('#onboarding-placement-content .cu-review-section').forEach(function (sec) {
          if (sec.getAttribute('data-checked') !== 'true' && sec.id) {
            BentoGrid._doCheckCuExSection(sec);
          }
        });
      }

      var score = getPlacementScore();
      var passed = score.max > 0 && score.pct >= PLACEMENT_PASS_PCT;
      var courseLevel = passed ? (_placementCourseLevel || mapToCourseLevel(_selectedLevel)) : 'B1';

      if (!passed) {
        clearAllCourseProgress();
      } else {
        clearAllCourseProgress();
        var cfg = getLevelConfig(_selectedLevel);
        if (cfg && typeof BentoGrid !== 'undefined' && BentoGrid._markGlobalStagesCompleteThrough) {
          await BentoGrid._markGlobalStagesCompleteThrough(cfg.bars - 1);
        }
      }

      this._finalizeOnboarding(courseLevel, passed, score);
    },

    _finalizeOnboarding: async function (courseLevel, passed, score, options) {
      options = options || {};
      AppState.currentLevel = courseLevel;
      try {
        localStorage.setItem('preferred_level', courseLevel);
      } catch (e) { /* ignore */ }

      if (AppState.isAuthenticated && typeof UserProfile !== 'undefined') {
        await UserProfile.updateProfile({ preferred_level: courseLevel });
      }

      markDone();
      _pendingNewUser = false;
      this.hide();

      if (!AppState.isAuthenticated && !AppState.isGuest) {
        AppState.isGuest = true;
        if (typeof Auth !== 'undefined') Auth.renderSignInButton();
      }

      var app = document.getElementById('app');
      if (app) app.style.display = '';
      if (typeof Landing !== 'undefined') Landing.hide();

      history.replaceState({ view: 'dashboard' }, '', '/');

      var afterLoad = function () {
        if (options.openFirstB1Topic) {
          openFirstB1Topic();
        } else if (typeof App !== 'undefined' && App.openLearningHome) {
          App.openLearningHome();
        } else if (typeof BentoGrid !== 'undefined') {
          BentoGrid.openCourseSection('learning');
        }
      };

      if (typeof AppLoadingScreen !== 'undefined') {
        AppLoadingScreen.show({ onHidden: afterLoad });
      } else {
        afterLoad();
      }
    },

    maybeShowAfterAuth: function () {
      if (!this.needsShow()) {
        if (typeof App !== 'undefined' && App.openLearningHome) {
          App.openLearningHome();
        } else if (typeof BentoGrid !== 'undefined') {
          BentoGrid.openCourseSection('learning');
        }
        return;
      }
      history.replaceState({ view: 'welcome' }, '', '/welcome');
      if (typeof App !== 'undefined' && App.showWelcome) {
        App.showWelcome();
      } else {
        this.show();
      }
    }
  };
})();
