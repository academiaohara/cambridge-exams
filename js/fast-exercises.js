// js/fast-exercises.js
// Multi-category Fast Exercises system with vertical progression maps

(function() {
  var STORAGE_KEY = 'cambridge_fast_exercises';
  var CATEGORIES = [
    { id: 'phrasal-verbs', icon: '📘', name: 'Phrasal Verbs', color: '#3b82f6' },
    { id: 'collocations', icon: '📚', name: 'Collocations', color: '#8b5cf6' },
    { id: 'vocabulary', icon: '📖', name: 'Vocabulary', color: '#10b981' },
    { id: 'idioms', icon: '🗣️', name: 'Idioms', color: '#f59e0b' },
    { id: 'business-english', icon: '💼', name: 'Business English', color: '#ef4444' }
  ];

  window.FastExercises = {
    _cache: {},
    _currentCategory: null,
    _currentLevel: null,
    _currentLesson: null,
    _currentPointIndex: 0,

    // ── Progress Storage ─────────────────────────────────────────────────
    _getProgress: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      } catch (e) { return {}; }
    },

    _saveProgress: function(progress) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    },

    _getCategoryProgress: function(categoryId) {
      var progress = this._getProgress();
      return progress[categoryId] || { completedPoints: {}, activeLevel: 'A2' };
    },

    _markPointComplete: function(categoryId, levelId, lessonId, pointIndex) {
      var progress = this._getProgress();
      if (!progress[categoryId]) progress[categoryId] = { completedPoints: {}, activeLevel: 'A2' };
      var key = levelId + '/' + lessonId + '/' + pointIndex;
      progress[categoryId].completedPoints[key] = true;
      this._saveProgress(progress);
    },

    _isPointComplete: function(categoryId, levelId, lessonId, pointIndex) {
      var catProg = this._getCategoryProgress(categoryId);
      var key = levelId + '/' + lessonId + '/' + pointIndex;
      return !!catProg.completedPoints[key];
    },

    _isLevelComplete: function(categoryId, levelId, levelsData) {
      if (!levelsData) return false;
      var level = null;
      for (var i = 0; i < levelsData.length; i++) {
        if (levelsData[i].id === levelId) { level = levelsData[i]; break; }
      }
      if (!level || !level.lessons || level.lessons.length === 0) return false;

      for (var li = 0; li < level.lessons.length; li++) {
        var lesson = level.lessons[li];
        if (!lesson.points) continue;
        for (var pi = 0; pi < lesson.points.length; pi++) {
          if (!this._isPointComplete(categoryId, levelId, lesson.id, pi)) return false;
        }
      }
      return true;
    },

    _isLevelUnlocked: function(categoryId, levelId, levelsData) {
      if (!levelsData) return false;
      var level = null;
      for (var i = 0; i < levelsData.length; i++) {
        if (levelsData[i].id === levelId) { level = levelsData[i]; break; }
      }
      if (!level) return false;
      if (!level.requiredToUnlock) return true;
      return this._isLevelComplete(categoryId, level.requiredToUnlock, levelsData);
    },

    _getCategoryPercent: function(categoryId, levelsData) {
      if (!levelsData) return 0;
      var total = 0, done = 0;
      for (var li = 0; li < levelsData.length; li++) {
        var level = levelsData[li];
        if (!level.lessons) continue;
        for (var lj = 0; lj < level.lessons.length; lj++) {
          var lesson = level.lessons[lj];
          if (!lesson.points) continue;
          for (var pi = 0; pi < lesson.points.length; pi++) {
            total++;
            if (this._isPointComplete(categoryId, level.id, lesson.id, pi)) done++;
          }
        }
      }
      return total > 0 ? Math.round((done / total) * 100) : 0;
    },

    _getLevelPercent: function(categoryId, levelId, levelsData) {
      if (!levelsData) return 0;
      var level = null;
      for (var i = 0; i < levelsData.length; i++) {
        if (levelsData[i].id === levelId) { level = levelsData[i]; break; }
      }
      if (!level || !level.lessons) return 0;
      var total = 0, done = 0;
      for (var lj = 0; lj < level.lessons.length; lj++) {
        var lesson = level.lessons[lj];
        if (!lesson.points) continue;
        for (var pi = 0; pi < lesson.points.length; pi++) {
          total++;
          if (this._isPointComplete(categoryId, level.id, lesson.id, pi)) done++;
        }
      }
      return total > 0 ? Math.round((done / total) * 100) : 0;
    },

    _getTotalPoints: function(levelsData) {
      var total = 0;
      if (!levelsData) return 0;
      for (var i = 0; i < levelsData.length; i++) {
        var level = levelsData[i];
        if (!level.lessons) continue;
        for (var j = 0; j < level.lessons.length; j++) {
          if (level.lessons[j].points) total += level.lessons[j].points.length;
        }
      }
      return total;
    },

    // ── Data Loading ─────────────────────────────────────────────────────
    _loadCategoryData: async function(categoryId) {
      if (this._cache[categoryId]) return this._cache[categoryId];
      try {
        var r = await fetch('data/' + categoryId + '/levels.json');
        if (!r.ok) return null;
        var data = await r.json();
        this._cache[categoryId] = data;
        return data;
      } catch (e) { return null; }
    },

    _loadLessonData: async function(categoryId, levelId, lessonId) {
      var cacheKey = categoryId + '/' + levelId + '/' + lessonId;
      if (this._cache[cacheKey]) return this._cache[cacheKey];
      try {
        var r = await fetch('data/' + categoryId + '/' + levelId + '/' + lessonId + '.json');
        if (!r.ok) return null;
        var data = await r.json();
        this._cache[cacheKey] = data;
        return data;
      } catch (e) { return null; }
    },

    // ── HTML Escape ──────────────────────────────────────────────────────
    _escapeHTML: function(str) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(str || ''));
      return div.innerHTML;
    },

    // ── MAIN CATEGORIES VIEW ─────────────────────────────────────────────
    openCategories: async function() {
      var content = document.getElementById('main-content');
      if (!content) return;
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };

      // Show loading state
      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      // Load all category data
      var categoryCards = '';
      for (var i = 0; i < CATEGORIES.length; i++) {
        var cat = CATEGORIES[i];
        var data = await this._loadCategoryData(cat.id);
        var pct = data ? this._getCategoryPercent(cat.id, data.levels) : 0;
        var totalPoints = data ? this._getTotalPoints(data.levels) : 0;
        var btnLabel = pct > 0 ? t('continue', 'Continue') : t('start', 'Start');

        categoryCards += '<div class="fe-category-card" style="--cat-color: ' + cat.color + '" onclick="FastExercises.openCategory(\'' + cat.id + '\')">' +
          '<div class="fe-category-card-header">' +
            '<span class="fe-category-icon">' + cat.icon + '</span>' +
            '<div class="fe-category-info">' +
              '<div class="fe-category-name">' + this._escapeHTML(cat.name) + '</div>' +
              '<div class="fe-category-stats">' + totalPoints + ' ' + t('items', 'items') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fe-category-progress">' +
            '<div class="fe-progress-bar-bg">' +
              '<div class="fe-progress-bar-fill" style="width:' + pct + '%; background:' + cat.color + '"></div>' +
            '</div>' +
            '<span class="fe-progress-text">' + pct + '% ' + t('complete', 'complete') + '</span>' +
          '</div>' +
          '<button class="fe-category-btn" style="background:' + cat.color + '">' + btnLabel + '</button>' +
        '</div>';
      }

      // Build sidebars
      var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(window.EXAMS_DATA[AppState.currentLevel || 'C1'] || []);
      }
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        rightSidebarContent = BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
      }

      content.innerHTML =
        '<div class="dashboard-layout">' +
          '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
          '<div class="dashboard-center">' +
            '<div class="fe-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="loadDashboard()">' + t('back', 'Back') + '</button>' +
                '<div>' +
                  '<div class="subpage-title">⚡ ' + t('fastExercises', 'Fast Exercises') + '</div>' +
                  '<div class="subpage-subtitle">' + t('fastExercisesSubtitle', 'Choose a category and start your learning path') + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="fe-categories-grid">' + categoryCards + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
        '</div>';

      if (typeof BentoGrid !== 'undefined') {
        BentoGrid._startGradeCarousel();
      }
      history.pushState({ view: 'fastExercises' }, '');
    },

    // ── INDIVIDUAL CATEGORY VIEW ─────────────────────────────────────────
    openCategory: async function(categoryId) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      this._currentCategory = categoryId;

      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      var data = await this._loadCategoryData(categoryId);
      if (!data || !data.levels) {
        content.innerHTML = '<div class="fe-error">Category data not available.</div>';
        return;
      }

      var catMeta = null;
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].id === categoryId) { catMeta = CATEGORIES[i]; break; }
      }
      if (!catMeta) return;

      // Determine active level
      var catProg = this._getCategoryProgress(categoryId);
      var activeLevel = catProg.activeLevel || 'A2';
      this._currentLevel = activeLevel;

      // ── LEFT WIDGET: Category Info + Level Selector ──
      var leftWidget = this._buildCategoryInfoWidget(catMeta, data, activeLevel);

      // ── CENTER: Vertical Progression Map ──
      var centerMap = this._buildProgressionMap(catMeta, data, activeLevel);

      // ── RIGHT WIDGET: Quick Review Mixer ──
      var rightWidget = this._buildQuickReviewWidget(catMeta, data);

      // ── BOTTOM: Progress bar ──
      var bottomBar = this._buildBottomProgressBar(catMeta, data, activeLevel);

      content.innerHTML =
        '<div class="dashboard-layout">' +
          '<div class="dashboard-left-sidebar">' + leftWidget + '</div>' +
          '<div class="dashboard-center">' +
            '<div class="fe-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="FastExercises.openCategories()">' + t('back', 'Back') + '</button>' +
                '<div>' +
                  '<div class="subpage-title">' + catMeta.icon + ' ' + this._escapeHTML(data.name || catMeta.name) + '</div>' +
                  '<div class="subpage-subtitle">' + t('levelProgress', 'Level Progress') + ' — ' + activeLevel + '</div>' +
                '</div>' +
              '</div>' +
              centerMap +
            '</div>' +
            bottomBar +
          '</div>' +
          '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightWidget + '</div>' +
        '</div>';

      history.pushState({ view: 'fastExerciseCategory', categoryId: categoryId }, '');
    },

    // ── LEFT WIDGET ──────────────────────────────────────────────────────
    _buildCategoryInfoWidget: function(catMeta, data, activeLevel) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var catPct = this._getCategoryPercent(catMeta.id, data.levels);

      var levelsHtml = '';
      for (var i = 0; i < data.levels.length; i++) {
        var lv = data.levels[i];
        var isUnlocked = this._isLevelUnlocked(catMeta.id, lv.id, data.levels);
        var isActive = lv.id === activeLevel;
        var isComplete = this._isLevelComplete(catMeta.id, lv.id, data.levels);
        var lvPct = this._getLevelPercent(catMeta.id, lv.id, data.levels);

        var stateClass = isActive ? 'fe-level-active' : (isUnlocked ? 'fe-level-unlocked' : 'fe-level-locked');
        var icon = isComplete ? '✅' : (isUnlocked ? '○' : '🔒');
        var onclick = isUnlocked ? 'onclick="FastExercises._switchLevel(\'' + catMeta.id + '\', \'' + lv.id + '\')"' : '';

        levelsHtml += '<div class="fe-level-item ' + stateClass + '" ' + onclick + '>' +
          '<span class="fe-level-icon">' + icon + '</span>' +
          '<div class="fe-level-label">' +
            '<span class="fe-level-name">' + lv.id + '</span>' +
            (isUnlocked ? '<span class="fe-level-pct">' + lvPct + '%</span>' : '<span class="fe-level-pct">' + t('locked', 'Locked') + '</span>') +
          '</div>' +
        '</div>';
      }

      // Count completed points
      var totalDone = 0, totalAll = 0;
      for (var li = 0; li < data.levels.length; li++) {
        var level = data.levels[li];
        if (!level.lessons) continue;
        for (var lj = 0; lj < level.lessons.length; lj++) {
          if (!level.lessons[lj].points) continue;
          for (var pi = 0; pi < level.lessons[lj].points.length; pi++) {
            totalAll++;
            if (this._isPointComplete(catMeta.id, level.id, level.lessons[lj].id, pi)) totalDone++;
          }
        }
      }

      return '<div class="sidebar-widget fe-info-widget" style="--cat-color:' + catMeta.color + '">' +
        '<div class="fe-info-header">' +
          '<span class="fe-info-icon">' + catMeta.icon + '</span>' +
          '<div>' +
            '<div class="fe-info-title">' + this._escapeHTML(catMeta.name) + '</div>' +
            '<div class="fe-info-subtitle">' + t('level', 'Level') + ': ' + activeLevel + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="fe-info-progress-wrap">' +
          '<div class="fe-progress-bar-bg">' +
            '<div class="fe-progress-bar-fill" style="width:' + catPct + '%; background:' + catMeta.color + '"></div>' +
          '</div>' +
          '<div class="fe-info-progress-text">' + catPct + '% ' + t('complete', 'complete') + '</div>' +
        '</div>' +
        '<div class="fe-level-selector-title">' + t('levels', 'Levels') + '</div>' +
        '<div class="fe-level-selector">' + levelsHtml + '</div>' +
        '<div class="fe-info-stats">' +
          '<div class="fe-info-stat">' + totalDone + '/' + totalAll + ' ' + t('items', 'items') + '</div>' +
        '</div>' +
      '</div>';
    },

    // ── CENTER MAP ───────────────────────────────────────────────────────
    _buildProgressionMap: function(catMeta, data, activeLevel) {
      var self = this;
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };

      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === activeLevel) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons || level.lessons.length === 0) {
        return '<div class="fe-map-empty">' + t('noLessonsAvailable', 'No lessons available for this level yet.') + '</div>';
      }

      var html = '<div class="fe-map-container">';

      for (var li = 0; li < level.lessons.length; li++) {
        var lesson = level.lessons[li];
        var lessonComplete = true;
        var lessonStarted = false;

        // Check lesson status
        if (lesson.points) {
          for (var pi = 0; pi < lesson.points.length; pi++) {
            if (!self._isPointComplete(catMeta.id, activeLevel, lesson.id, pi)) {
              lessonComplete = false;
            } else {
              lessonStarted = true;
            }
          }
        }

        var lessonClass = lessonComplete ? 'fe-lesson-complete' : (lessonStarted ? 'fe-lesson-active' : 'fe-lesson-pending');

        html += '<div class="fe-map-lesson ' + lessonClass + '">' +
          '<div class="fe-map-lesson-title">' +
            '<span class="fe-map-lesson-num">' + t('lesson', 'Lesson') + ' ' + (li + 1) + '</span>' +
            '<span class="fe-map-lesson-name">' + self._escapeHTML(lesson.title) + '</span>' +
          '</div>' +
          '<div class="fe-map-points-row">';

        if (lesson.points) {
          for (var pi = 0; pi < lesson.points.length; pi++) {
            var point = lesson.points[pi];
            var isDone = self._isPointComplete(catMeta.id, activeLevel, lesson.id, pi);

            // Determine if this point is accessible (all previous points must be done)
            var isAccessible = true;
            if (pi > 0) {
              for (var prev = 0; prev < pi; prev++) {
                if (!self._isPointComplete(catMeta.id, activeLevel, lesson.id, prev)) {
                  isAccessible = false;
                  break;
                }
              }
            }

            var dotClass = 'fe-dot';
            var dotIcon = '';
            if (point.type === 'explanation') {
              dotClass += ' fe-dot-explanation';
              dotIcon = isDone ? '✓' : '○';
            } else if (point.type === 'exercise') {
              dotClass += ' fe-dot-exercise';
              dotIcon = isDone ? '✓' : '●';
            } else if (point.type === 'review') {
              dotClass += ' fe-dot-review';
              dotIcon = isDone ? '✓' : '═';
            } else if (point.type === 'trophy') {
              dotClass += ' fe-dot-trophy';
              dotIcon = isDone ? '🏆' : '★';
            }

            if (isDone) dotClass += ' fe-dot-done';
            else if (!isAccessible) dotClass += ' fe-dot-locked';

            var onclick = (isAccessible || isDone) ? 'onclick="FastExercises.openPoint(\'' + catMeta.id + '\', \'' + activeLevel + '\', \'' + lesson.id + '\', ' + pi + ')"' : '';
            var tooltip = self._escapeHTML(point.label || '');

            html += (pi > 0 ? '<div class="fe-map-line ' + (point.type === 'review' ? 'fe-line-review' : '') + '"></div>' : '') +
              '<div class="' + dotClass + '" ' + onclick + ' title="' + tooltip + '">' +
                '<span class="fe-dot-icon">' + dotIcon + '</span>' +
              '</div>';
          }
        }

        html += '</div></div>';

        // Connector between lessons
        if (li < level.lessons.length - 1) {
          html += '<div class="fe-map-connector"></div>';
        }
      }

      html += '</div>';

      // Legend
      html += '<div class="fe-map-legend">' +
        '<span class="fe-legend-item"><span class="fe-dot fe-dot-explanation fe-dot-mini">○</span> ' + t('explanation', 'Explanation') + '</span>' +
        '<span class="fe-legend-item"><span class="fe-dot fe-dot-exercise fe-dot-mini">●</span> ' + t('exercise', 'Exercise') + '</span>' +
        '<span class="fe-legend-item"><span class="fe-dot fe-dot-review fe-dot-mini">═</span> ' + t('review', 'Review') + '</span>' +
        '<span class="fe-legend-item"><span class="fe-dot fe-dot-trophy fe-dot-mini">★</span> ' + t('challenge', 'Challenge') + '</span>' +
      '</div>';

      return html;
    },

    // ── RIGHT WIDGET ─────────────────────────────────────────────────────
    _buildQuickReviewWidget: function(catMeta, data) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;

      // Level checkboxes for mixer
      var levelsCheckboxes = '';
      for (var i = 0; i < data.levels.length; i++) {
        var lv = data.levels[i];
        var isUnlocked = this._isLevelUnlocked(catMeta.id, lv.id, data.levels);
        levelsCheckboxes += '<label class="fe-mixer-level ' + (!isUnlocked ? 'fe-mixer-level-disabled' : '') + '">' +
          '<input type="checkbox" value="' + lv.id + '" ' + (isUnlocked ? 'checked' : 'disabled') + ' class="fe-mixer-checkbox" />' +
          ' ' + lv.id +
        '</label>';
      }

      // Recent mistakes (from progress data)
      var catProg = this._getCategoryProgress(catMeta.id);
      var mistakes = catProg.recentMistakes || [];
      var mistakesHtml = '';
      if (mistakes.length > 0) {
        for (var m = 0; m < Math.min(mistakes.length, 5); m++) {
          mistakesHtml += '<div class="fe-mistake-item">' + self._escapeHTML(mistakes[m]) + '</div>';
        }
      } else {
        mistakesHtml = '<div class="fe-no-mistakes">' + t('noMistakesYet', 'No mistakes yet — keep practicing!') + '</div>';
      }

      return '<div class="sidebar-widget fe-review-widget">' +
        '<div class="fe-review-title">🔄 ' + t('quickReview', 'Quick Review') + '</div>' +
        '<div class="fe-review-subtitle">' + t('mixerForCategory', 'Mixer for') + ' ' + this._escapeHTML(catMeta.name) + '</div>' +
        '<div class="fe-mixer-levels">' + levelsCheckboxes + '</div>' +
        '<button class="fe-review-btn" onclick="FastExercises._startQuickReview(\'' + catMeta.id + '\')" style="background:' + catMeta.color + '">' +
          t('startReview', 'Start Review') +
        '</button>' +
        '<div class="fe-review-divider"></div>' +
        '<div class="fe-mistakes-title">' + t('recentMistakes', 'Recent Mistakes') + '</div>' +
        '<div class="fe-mistakes-list">' + mistakesHtml + '</div>' +
      '</div>';
    },

    // ── BOTTOM BAR ───────────────────────────────────────────────────────
    _buildBottomProgressBar: function(catMeta, data, activeLevel) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var lvPct = this._getLevelPercent(catMeta.id, activeLevel, data.levels);

      return '<div class="fe-bottom-bar">' +
        '<div class="fe-bottom-breadcrumb">' +
          this._escapeHTML(catMeta.name) + ' › ' + activeLevel +
        '</div>' +
        '<div class="fe-bottom-progress">' +
          '<div class="fe-progress-bar-bg fe-bottom-progress-bg">' +
            '<div class="fe-progress-bar-fill" style="width:' + lvPct + '%; background:' + catMeta.color + '"></div>' +
          '</div>' +
          '<span class="fe-bottom-pct">' + lvPct + '%</span>' +
        '</div>' +
        '<button class="fe-bottom-continue-btn" onclick="FastExercises._continueCategory(\'' + catMeta.id + '\', \'' + activeLevel + '\')" style="background:' + catMeta.color + '">' +
          t('continue', 'Continue') +
        '</button>' +
      '</div>';
    },

    // ── SWITCH LEVEL ─────────────────────────────────────────────────────
    _switchLevel: function(categoryId, levelId) {
      var progress = this._getProgress();
      if (!progress[categoryId]) progress[categoryId] = { completedPoints: {}, activeLevel: 'A2' };
      progress[categoryId].activeLevel = levelId;
      this._saveProgress(progress);
      this.openCategory(categoryId);
    },

    // ── CONTINUE FROM LAST POINT ─────────────────────────────────────────
    _continueCategory: async function(categoryId, levelId) {
      var data = await this._loadCategoryData(categoryId);
      if (!data) return;

      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === levelId) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons) return;

      // Find first incomplete point
      for (var li = 0; li < level.lessons.length; li++) {
        var lesson = level.lessons[li];
        if (!lesson.points) continue;
        for (var pi = 0; pi < lesson.points.length; pi++) {
          if (!this._isPointComplete(categoryId, levelId, lesson.id, pi)) {
            this.openPoint(categoryId, levelId, lesson.id, pi);
            return;
          }
        }
      }

      // All complete - offer next level
      var nextLevelIdx = -1;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === levelId) { nextLevelIdx = i + 1; break; }
      }
      if (nextLevelIdx >= 0 && nextLevelIdx < data.levels.length) {
        this._switchLevel(categoryId, data.levels[nextLevelIdx].id);
      }
    },

    // ── QUICK REVIEW MIXER ───────────────────────────────────────────────
    _startQuickReview: function(categoryId) {
      // Gather checked levels
      var checkboxes = document.querySelectorAll('.fe-mixer-checkbox:checked');
      var selectedLevels = [];
      for (var i = 0; i < checkboxes.length; i++) {
        selectedLevels.push(checkboxes[i].value);
      }
      if (selectedLevels.length === 0) return;

      // Launch micro-learning with category filter
      if (typeof MicroLearning !== 'undefined') {
        MicroLearning._selectedCategory = categoryId === 'phrasal-verbs' ? 'phrasal_verbs' : categoryId;
        MicroLearning.open();
      }
    },

    // ── OPEN INDIVIDUAL POINT ────────────────────────────────────────────
    openPoint: async function(categoryId, levelId, lessonId, pointIndex) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;

      this._currentCategory = categoryId;
      this._currentLevel = levelId;
      this._currentLesson = lessonId;
      this._currentPointIndex = pointIndex;

      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      var lessonData = await this._loadLessonData(categoryId, levelId, lessonId);
      var catData = await this._loadCategoryData(categoryId);

      if (!lessonData || !lessonData.points || !lessonData.points[pointIndex]) {
        // No detailed lesson data - mark complete and show simple view
        this._markPointComplete(categoryId, levelId, lessonId, pointIndex);

        // Get point info from levels.json
        var pointLabel = 'Point ' + (pointIndex + 1);
        var pointType = 'explanation';
        if (catData && catData.levels) {
          for (var i = 0; i < catData.levels.length; i++) {
            if (catData.levels[i].id === levelId && catData.levels[i].lessons) {
              for (var j = 0; j < catData.levels[i].lessons.length; j++) {
                if (catData.levels[i].lessons[j].id === lessonId && catData.levels[i].lessons[j].points) {
                  var pt = catData.levels[i].lessons[j].points[pointIndex];
                  if (pt) { pointLabel = pt.label; pointType = pt.type; }
                }
              }
            }
          }
        }

        var catMeta = null;
        for (var c = 0; c < CATEGORIES.length; c++) {
          if (CATEGORIES[c].id === categoryId) { catMeta = CATEGORIES[c]; break; }
        }

        content.innerHTML =
          '<div class="fe-point-view">' +
            '<div class="subpage-header">' +
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')">' + t('back', 'Back') + '</button>' +
              '<div>' +
                '<div class="subpage-title">' + self._escapeHTML(pointLabel) + '</div>' +
                '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonId) + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fe-point-card">' +
              '<div class="fe-point-icon">' + (pointType === 'trophy' ? '🏆' : '📝') + '</div>' +
              '<div class="fe-point-message">' + t('contentComingSoon', 'Detailed content coming soon! Point marked as complete.') + '</div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#3b82f6') + '">' +
                t('next', 'Next') + ' →' +
              '</button>' +
            '</div>' +
          '</div>';
        return;
      }

      var point = lessonData.points[pointIndex];
      var catMeta = null;
      for (var c = 0; c < CATEGORIES.length; c++) {
        if (CATEGORIES[c].id === categoryId) { catMeta = CATEGORIES[c]; break; }
      }

      if (point.type === 'explanation') {
        this._renderExplanationPoint(content, point, catMeta, levelId, lessonId, lessonData.title, pointIndex);
      } else if (point.type === 'exercise' || point.type === 'review') {
        this._renderExercisePoint(content, point, catMeta, levelId, lessonId, lessonData.title, pointIndex);
      } else if (point.type === 'trophy') {
        this._renderExercisePoint(content, point, catMeta, levelId, lessonId, lessonData.title, pointIndex);
      }

      history.pushState({ view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex }, '');
    },

    // ── RENDER EXPLANATION POINT ─────────────────────────────────────────
    _renderExplanationPoint: function(container, point, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var ct = point.content || {};

      var examplesHtml = '';
      if (ct.examples && ct.examples.length > 0) {
        ct.examples.forEach(function(ex) {
          examplesHtml += '<li>' + self._escapeHTML(ex) + '</li>';
        });
      }

      var relatedHtml = '';
      if (ct.relatedVerb) {
        var relExamples = '';
        if (ct.relatedExamples && ct.relatedExamples.length > 0) {
          ct.relatedExamples.forEach(function(ex) {
            relExamples += '<li>' + self._escapeHTML(ex) + '</li>';
          });
        }
        relatedHtml = '<div class="fe-explanation-related">' +
          '<h4>🔗 ' + self._escapeHTML(ct.relatedVerb) + '</h4>' +
          '<p>' + self._escapeHTML(ct.relatedDefinition || '') + '</p>' +
          (relExamples ? '<ul class="fe-example-list">' + relExamples + '</ul>' : '') +
        '</div>';
      }

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
            '<div>' +
              '<div class="subpage-title">' + self._escapeHTML(point.label) + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonTitle || '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fe-explanation-card" style="--cat-color:' + catMeta.color + '">' +
            '<div class="fe-explanation-verb">' + self._escapeHTML(ct.phrasalVerb || point.label) + '</div>' +
            '<div class="fe-explanation-def">' + self._escapeHTML(ct.definition || '') + '</div>' +
            (examplesHtml ? '<div class="fe-explanation-examples"><h4>💡 ' + t('examples', 'Examples') + '</h4><ul class="fe-example-list">' + examplesHtml + '</ul></div>' : '') +
            relatedHtml +
            '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
              t('gotItNext', 'Got it! Next') + ' →' +
            '</button>' +
          '</div>' +
        '</div>';
    },

    // ── RENDER EXERCISE POINT ────────────────────────────────────────────
    _renderExercisePoint: function(container, point, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var ct = point.content || {};
      var questions = ct.questions || [];

      if (questions.length === 0) {
        // No questions available
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML =
          '<div class="fe-point-view">' +
            '<div class="subpage-header">' +
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
              '<div>' +
                '<div class="subpage-title">' + self._escapeHTML(point.label) + '</div>' +
                '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonTitle || '') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fe-point-card">' +
              '<div class="fe-point-icon">' + (point.type === 'trophy' ? '🏆' : '✅') + '</div>' +
              '<div class="fe-point-message">' + t('exerciseComingSoon', 'Exercises for this section coming soon! Point marked as complete.') + '</div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                t('next', 'Next') + ' →' +
              '</button>' +
            '</div>' +
          '</div>';
        return;
      }

      var questionsHtml = '';
      questions.forEach(function(q, qi) {
        var optionsHtml = '';
        (q.options || []).forEach(function(opt) {
          optionsHtml += '<button class="fe-quiz-option" data-question="' + qi + '" data-answer="' + self._escapeHTML(opt.charAt(0)) + '" onclick="FastExercises._answerQuestion(this, ' + qi + ', \'' + self._escapeHTML(q.correct) + '\', \'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')">' +
            self._escapeHTML(opt) +
          '</button>';
        });

        questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
          '<div class="fe-quiz-num">' + t('question', 'Question') + ' ' + (qi + 1) + '/' + questions.length + '</div>' +
          '<div class="fe-quiz-sentence">' + self._escapeHTML(q.sentence || '') + '</div>' +
          '<div class="fe-quiz-options">' + optionsHtml + '</div>' +
          '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
        '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
            '<div>' +
              '<div class="subpage-title">' + self._escapeHTML(point.label) + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonTitle || '') + ' · ' + (ct.instructions || '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
            '<div class="fe-quiz-progress-bar">' +
              '<div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div>' +
            '</div>' +
            '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + questions.length + '" data-answered="0" data-correct="0">' +
              questionsHtml +
            '</div>' +
            '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
              '<div class="fe-quiz-complete-icon">🎉</div>' +
              '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                t('next', 'Next') + ' →' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      // Show only first question
      this._showQuizQuestion(0);
    },

    _showQuizQuestion: function(qIndex) {
      var questions = document.querySelectorAll('.fe-quiz-question');
      for (var i = 0; i < questions.length; i++) {
        questions[i].style.display = i === qIndex ? 'block' : 'none';
      }
    },

    _answerQuestion: function(btn, qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var chosen = btn.getAttribute('data-answer');
      var isCorrect = chosen === correctAnswer;
      var feedbackEl = document.getElementById('fe-quiz-feedback-' + qIndex);
      var questionsContainer = document.getElementById('fe-quiz-questions');

      // Disable all buttons for this question
      var buttons = document.querySelectorAll('[data-question="' + qIndex + '"]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (buttons[i].getAttribute('data-answer') === correctAnswer) {
          buttons[i].classList.add('fe-quiz-correct');
        }
        if (buttons[i] === btn && !isCorrect) {
          buttons[i].classList.add('fe-quiz-wrong');
        }
      }

      // Show feedback
      if (feedbackEl) {
        var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.textContent = '✅ ' + t('correct', 'Correct') + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.textContent = '❌ ' + t('correctAnswerIs', 'The correct answer is') + ' ' + correctAnswer;
        }
        feedbackEl.style.display = 'block';
      }

      // Update progress
      var answered = parseInt(questionsContainer.getAttribute('data-answered')) + 1;
      var correct = parseInt(questionsContainer.getAttribute('data-correct')) + (isCorrect ? 1 : 0);
      var total = parseInt(questionsContainer.getAttribute('data-total'));
      questionsContainer.setAttribute('data-answered', answered);
      questionsContainer.setAttribute('data-correct', correct);

      // Update progress bar
      var progressFill = document.getElementById('fe-quiz-progress-fill');
      if (progressFill) {
        progressFill.style.width = Math.round((answered / total) * 100) + '%';
      }

      var self = this;
      // Auto-advance after delay
      setTimeout(function() {
        if (answered >= total) {
          // All questions answered - show completion
          self._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          var completeSection = document.getElementById('fe-quiz-complete');
          var completeText = document.getElementById('fe-quiz-complete-text');
          if (completeSection && completeText) {
            var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
            completeText.textContent = correct + '/' + total + ' ' + t('correct', 'correct') + '!';
            completeSection.style.display = 'block';
          }
          // Hide last question
          var questions = document.querySelectorAll('.fe-quiz-question');
          for (var i = 0; i < questions.length; i++) {
            questions[i].style.display = 'none';
          }
          // Record streak
          if (typeof StreakManager !== 'undefined') {
            StreakManager.recordActivity();
          }
        } else {
          self._showQuizQuestion(qIndex + 1);
        }
      }, isCorrect ? 800 : 1800);
    },

    // ── NAVIGATION HELPERS ───────────────────────────────────────────────
    _completeAndNext: function(categoryId, levelId, lessonId, pointIndex) {
      this._markPointComplete(categoryId, levelId, lessonId, pointIndex);
      this._nextPoint(categoryId, levelId, lessonId, pointIndex);
    },

    _nextPoint: async function(categoryId, levelId, lessonId, pointIndex) {
      var data = await this._loadCategoryData(categoryId);
      if (!data) { this.openCategory(categoryId); return; }

      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === levelId) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons) { this.openCategory(categoryId); return; }

      // Find current lesson
      var currentLessonIdx = -1;
      for (var i = 0; i < level.lessons.length; i++) {
        if (level.lessons[i].id === lessonId) { currentLessonIdx = i; break; }
      }
      if (currentLessonIdx < 0) { this.openCategory(categoryId); return; }

      var lesson = level.lessons[currentLessonIdx];
      var nextPointIndex = pointIndex + 1;

      if (lesson.points && nextPointIndex < lesson.points.length) {
        // Next point in same lesson
        this.openPoint(categoryId, levelId, lessonId, nextPointIndex);
      } else if (currentLessonIdx + 1 < level.lessons.length) {
        // Next lesson
        var nextLesson = level.lessons[currentLessonIdx + 1];
        this.openPoint(categoryId, levelId, nextLesson.id, 0);
      } else {
        // Level complete - go back to map
        this.openCategory(categoryId);
      }
    }
  };
})();
