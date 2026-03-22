// js/fast-exercises.js
// Multi-category Fast Learning system with vertical progression maps

(function() {
  var STORAGE_KEY = 'cambridge_fast_exercises';
  var CATEGORIES = [
    { id: 'vocabulary', icon: 'menu_book', name: 'Vocabulary', color: '#10b981' },
    { id: 'collocations', icon: 'library_books', name: 'Collocations', color: '#8b5cf6' },
    { id: 'phrasal-verbs', icon: 'auto_stories', name: 'Phrasal Verbs', color: '#3b82f6' },
    { id: 'idioms', icon: 'record_voice_over', name: 'Idioms', color: '#f59e0b' }
  ];

  function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

  window.FastExercises = {
    _cache: {},
    _currentCategory: null,
    _currentLevel: null,
    _currentLesson: null,
    _currentPointIndex: 0,
    _pvSelectedChip: null,
    _pvDragContext: null,
    _currentMapPage: 0,
    _currentPvVerbs: [],

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
      return progress[categoryId] || { completedPoints: {}, activeLevel: 'B1' };
    },

    _markPointComplete: function(categoryId, levelId, lessonId, pointIndex) {
      var progress = this._getProgress();
      if (!progress[categoryId]) progress[categoryId] = { completedPoints: {}, activeLevel: 'B1' };
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

    _isLessonComplete: function(categoryId, levelId, lessonId, lessonPoints) {
      if (!lessonPoints || lessonPoints.length === 0) return true;
      for (var pi = 0; pi < lessonPoints.length; pi++) {
        if (!this._isPointComplete(categoryId, levelId, lessonId, pi)) return false;
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

      // Unlock all levels up to the student's current study level
      var LEVEL_ORDER = ['B1', 'B2', 'C1', 'C2'];
      var studentLevel = (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1';
      var studentIdx = LEVEL_ORDER.indexOf(studentLevel);
      var thisIdx = LEVEL_ORDER.indexOf(levelId);
      if (studentIdx >= 0 && thisIdx >= 0 && thisIdx <= studentIdx) return true;

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

    // Escape a string for safe embedding in a JS single-quoted string literal
    _jsStr: function(str) {
      return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    },


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
            '<span class="fe-category-icon">' + _mi(cat.icon) + '</span>' +
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
                  '<div class="subpage-title">' + _mi('bolt') + ' ' + t('fastLearning', 'Fast Learning') + '</div>' +
                  '<div class="subpage-subtitle">' + t('fastLearningSubtitle', 'Choose a category and start your learning path') + '</div>' +
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
      var feState = { view: 'fastExercises' };
      history.pushState(feState, '', Router.stateToPath(feState));
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

      // Determine active level (validate stored level exists in data)
      var catProg = this._getCategoryProgress(categoryId);
      var storedLevel = catProg.activeLevel;
      var firstLevelId = (data.levels && data.levels.length > 0) ? data.levels[0].id : 'B1';
      var levelExists = false;
      if (storedLevel) {
        for (var i = 0; i < data.levels.length; i++) {
          if (data.levels[i].id === storedLevel) { levelExists = true; break; }
        }
      }
      var activeLevel = levelExists ? storedLevel : firstLevelId;
      this._currentLevel = activeLevel;

      // ── LEFT WIDGET: Category Info + Level Selector ──
      var leftWidget = this._buildCategoryInfoWidget(catMeta, data, activeLevel);

      // ── CENTER: Vertical Progression Map ──
      var centerMap = this._buildProgressionMap(catMeta, data, activeLevel);

      // ── RIGHT WIDGET: Quick Review Mixer ──
      var rightWidget = this._buildQuickReviewWidget(catMeta, data);

      // ── PROGRESS BAR ──
      var bottomBar = this._buildBottomProgressBar(catMeta, data, activeLevel);

      // ── LEGEND (PV only) ──
      var legendHtml = '';
      if (categoryId === 'phrasal-verbs') {
        legendHtml = '<div class="fe-map-legend fe-map-legend-top">' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-gallery fe-dot-mini fe-dot-outline">' + _mi('collections_bookmark') + '</span> ' + t('gallery', 'Gallery') + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-fill-in fe-dot-mini fe-dot-outline">' + _mi('edit') + '</span> ' + t('fillIn', 'Fill In') + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-conv fe-dot-mini fe-dot-outline">' + _mi('forum') + '</span> ' + t('conversations', 'Conversations') + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-drag fe-dot-mini fe-dot-outline">' + _mi('drag_indicator') + '</span> ' + t('dragDrop', 'Drag & Drop') + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-mixed fe-dot-mini fe-dot-outline">' + _mi('shuffle') + '</span> ' + t('mixed', 'Mixed') + '</span>' +
        '</div>';
      }

      content.innerHTML =
        '<div class="dashboard-layout">' +
          '<div class="dashboard-left-sidebar">' + leftWidget + '</div>' +
          '<div class="dashboard-center">' +
            '<div class="fe-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="FastExercises.openCategories()">' + t('back', 'Back') + '</button>' +
                '<div class="subpage-header-titles">' +
                  '<div class="subpage-title">' + _mi(catMeta.icon) + ' ' + this._escapeHTML(data.name || catMeta.name) + '</div>' +
                  '<div class="subpage-subtitle">' + t('levelProgress', 'Level Progress') + ' — ' + activeLevel + '</div>' +
                '</div>' +
                (categoryId === 'phrasal-verbs' ? '<button class="subpage-info-btn" onclick="FastExercises._showPvInfoModal()" title="' + t('whatArePhrasalVerbs', 'What are phrasal verbs?') + '">' + _mi('info') + '</button>' : '') +
              '</div>' +
              bottomBar +
              legendHtml +
              centerMap +
            '</div>' +
          '</div>' +
          '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightWidget + '</div>' +
        '</div>';

      var catState = { view: 'fastExerciseCategory', categoryId: categoryId };
      history.pushState(catState, '', Router.stateToPath(catState));
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
        var icon = isComplete ? _mi('check_circle') : (isUnlocked ? _mi('radio_button_unchecked') : _mi('lock'));
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
          '<span class="fe-info-icon">' + _mi(catMeta.icon) + '</span>' +
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
        '<button class="fe-reset-level-btn" onclick="FastExercises._confirmResetLevel(\'' + catMeta.id + '\', \'' + activeLevel + '\')">' +
          _mi('restart_alt') + ' ' + t('resetLevel', 'Reset Level') +
        '</button>' +
      '</div>';
    },

    // ── RESET LEVEL ──────────────────────────────────────────────────────
    _confirmResetLevel: function(categoryId, levelId) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var msg = t('resetLevelConfirm', 'Reset all progress for level ') + levelId + '?';
      if (!confirm(msg)) return;
      this._resetLevel(categoryId, levelId);
    },

    _resetLevel: function(categoryId, levelId) {
      var progress = this._getProgress();
      if (!progress[categoryId]) return;
      var cp = progress[categoryId].completedPoints || {};
      var prefix = levelId + '/';
      Object.keys(cp).forEach(function(key) {
        if (key.indexOf(prefix) === 0) delete cp[key];
      });
      this._saveProgress(progress);
      this.openCategory(categoryId);
    },

    // ── PHRASAL VERBS INFO MODAL ─────────────────────────────────────────
    _showPvInfoModal: function() {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var existing = document.getElementById('pv-info-modal');
      if (existing) { existing.remove(); return; }

      var modal = document.createElement('div');
      modal.id = 'pv-info-modal';
      modal.className = 'pv-info-modal-overlay';
      modal.innerHTML =
        '<div class="pv-info-modal-box">' +
          '<div class="pv-info-modal-header">' +
            '<span class="pv-info-modal-icon">' + '<span class="material-symbols-outlined">auto_stories</span>' + '</span>' +
            '<h2 class="pv-info-modal-title">' + t('whatArePhrasalVerbs', 'What are Phrasal Verbs?') + '</h2>' +
            '<button class="pv-info-modal-close" onclick="document.getElementById(\'pv-info-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="pv-info-modal-body">' +
            '<p>' + t('pvInfoP1', 'A <strong>phrasal verb</strong> is a combination of a verb and one or more particles (a preposition, an adverb, or both) that together create a new meaning different from the original verb.') + '</p>' +
            '<p class="pv-info-example"><span class="material-symbols-outlined">format_quote</span> <em>' + t('pvInfoEx1', '"Turn off the lights." — <strong>turn off</strong> = switch off (not just "turn")') + '</em></p>' +
            '<p>' + t('pvInfoP2', 'Phrasal verbs are extremely common in everyday English — both spoken and written. Native speakers use them constantly in conversations, emails, and texts.') + '</p>' +
            '<p>' + t('pvInfoP3', '<strong>Why are they important?</strong> Understanding phrasal verbs will help you:') + '</p>' +
            '<ul class="pv-info-list">' +
              '<li>' + t('pvInfoL1', 'Sound more natural and fluent') + '</li>' +
              '<li>' + t('pvInfoL2', 'Understand native speakers better') + '</li>' +
              '<li>' + t('pvInfoL3', 'Score higher in reading and listening exams') + '</li>' +
              '<li>' + t('pvInfoL4', 'Express yourself more precisely in writing') + '</li>' +
            '</ul>' +
            '<p>' + t('pvInfoP4', '<strong>How to learn them:</strong> Each lesson in this section introduces a group of related phrasal verbs. You will read them in context, practise filling in gaps, and test yourself with mixed exercises.') + '</p>' +
          '</div>' +
          '<div class="pv-info-modal-footer">' +
            '<button class="pv-info-modal-btn" onclick="document.getElementById(\'pv-info-modal\').remove()">' + t('gotIt', 'Got it!') + '</button>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);
    },

    // ── CENTER MAP ───────────────────────────────────────────────────────
    _buildProgressionMap: function(catMeta, data, activeLevel) {
      var self = this;
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var LESSONS_PER_PAGE = 4;

      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === activeLevel) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons || level.lessons.length === 0) {
        return '<div class="fe-map-empty">' + t('noLessonsAvailable', 'No lessons available for this level yet.') + '</div>';
      }

      var totalLessons = level.lessons.length;
      var totalPages = Math.ceil(totalLessons / LESSONS_PER_PAGE);

      // Find page containing the first incomplete lesson
      var firstIncompleteLessonIdx = totalLessons - 1;
      var foundIncomplete = false;
      for (var si = 0; si < level.lessons.length; si++) {
        var sl = level.lessons[si];
        if (sl.points) {
          for (var spi = 0; spi < sl.points.length; spi++) {
            if (!self._isPointComplete(catMeta.id, activeLevel, sl.id, spi)) {
              firstIncompleteLessonIdx = si;
              foundIncomplete = true;
              break;
            }
          }
        }
        if (foundIncomplete) break;
      }
      var initialPage = Math.floor(firstIncompleteLessonIdx / LESSONS_PER_PAGE);
      this._currentMapPage = initialPage;

      var html = '<div class="fe-map-outer' + (totalPages <= 1 ? ' fe-map-single-page' : '') + '">';

      // Navigation dots sidebar (only for multi-page)
      if (totalPages > 1) {
        html += '<div class="fe-map-page-dots" id="fe-map-page-dots">';
        for (var p = 0; p < totalPages; p++) {
          var startL = p * LESSONS_PER_PAGE + 1;
          var endL = Math.min((p + 1) * LESSONS_PER_PAGE, totalLessons);
          html += '<div class="fe-map-page-dot' + (p === initialPage ? ' fe-map-page-dot-active' : '') + '" data-page="' + p + '" onclick="FastExercises._goToMapPage(' + p + ')" title="' + t('lessons', 'Lessons') + ' ' + startL + '\u2013' + endL + '"></div>';
        }
        html += '</div>';
      }

      html += '<div class="fe-map-main">';

      // Up arrow
      if (totalPages > 1) {
        html += '<button class="fe-map-arrow-btn fe-map-arrow-up" id="fe-map-arrow-up" onclick="FastExercises._goToMapPage(FastExercises._currentMapPage - 1)"' + (initialPage === 0 ? ' style="visibility:hidden"' : '') + '>' + _mi('expand_less') + '</button>';
      }

      // Pages
      for (var p = 0; p < totalPages; p++) {
        html += '<div class="fe-map-page' + (p === initialPage ? ' fe-map-page-active' : '') + '" data-page="' + p + '">';
        html += '<div class="fe-map-container">';
        var lessonStart = p * LESSONS_PER_PAGE;
        var lessonEnd = Math.min((p + 1) * LESSONS_PER_PAGE, totalLessons);

        for (var li = lessonStart; li < lessonEnd; li++) {
          var lesson = level.lessons[li];
          var lessonComplete = true;
          var lessonStarted = false;
          var lessonLocked = false;

          if (lesson.points) {
            for (var pi = 0; pi < lesson.points.length; pi++) {
              if (!self._isPointComplete(catMeta.id, activeLevel, lesson.id, pi)) {
                lessonComplete = false;
              } else {
                lessonStarted = true;
              }
            }
          }

          var lessonClass = lessonLocked ? 'fe-lesson-locked' : (lessonComplete ? 'fe-lesson-complete' : (lessonStarted ? 'fe-lesson-active' : 'fe-lesson-pending'));

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

              var isLastPvMixed = (point.type === 'pv-mixed' && pi === lesson.points.length - 1);
              var isAccessible = true;
              if (isLastPvMixed) {
                for (var prev = 0; prev < pi; prev++) {
                  if (!self._isPointComplete(catMeta.id, activeLevel, lesson.id, prev)) {
                    isAccessible = false;
                    break;
                  }
                }
              }

              // Review points render as rows
              if (point.type === 'review') {
                var reviewStateClass = isDone ? 'fe-level-active' : (isAccessible ? 'fe-level-unlocked' : 'fe-level-locked');
                var reviewIcon = isDone ? _mi('check_circle') : (isAccessible ? _mi('rate_review') : _mi('lock'));
                var reviewOnclick = (isAccessible || isDone) ? 'onclick="FastExercises.openPoint(\'' + catMeta.id + '\', \'' + activeLevel + '\', \'' + lesson.id + '\', ' + pi + ')"' : '';
                html += '<div class="fe-review-row fe-level-item ' + reviewStateClass + '" ' + reviewOnclick + '>' +
                  '<span class="fe-level-icon">' + reviewIcon + '</span>' +
                  '<div class="fe-level-label">' +
                    '<span class="fe-level-name">' + self._escapeHTML(point.label || t('review', 'Review')) + '</span>' +
                    '<span class="fe-level-pct">' + (isDone ? t('completed', 'Completed') : (isAccessible ? t('available', 'Available') : t('locked', 'Locked'))) + '</span>' +
                  '</div>' +
                '</div>';
                continue;
              }

              var dotClass = 'fe-dot';
              var dotIcon = '';
              if (point.type === 'explanation') {
                dotClass += ' fe-dot-explanation';
                dotIcon = isDone ? _mi('check') : _mi('article');
              } else if (point.type === 'exercise') {
                dotClass += ' fe-dot-exercise';
                dotIcon = isDone ? _mi('check') : _mi('fitness_center');
              } else if (point.type === 'trophy') {
                dotClass += ' fe-dot-trophy';
                dotIcon = isDone ? _mi('check') : _mi('emoji_events');
              } else if (point.type === 'pv-gallery') {
                dotClass += ' fe-dot-pv-gallery';
                dotIcon = isDone ? _mi('check') : _mi('collections_bookmark');
              } else if (point.type === 'pv-fill-in') {
                dotClass += ' fe-dot-pv-fill-in';
                dotIcon = isDone ? _mi('check') : _mi('edit');
              } else if (point.type === 'pv-conversations') {
                dotClass += ' fe-dot-pv-conv';
                dotIcon = isDone ? _mi('check') : _mi('forum');
              } else if (point.type === 'pv-conversation-drag') {
                dotClass += ' fe-dot-pv-drag';
                dotIcon = isDone ? _mi('check') : _mi('drag_indicator');
              } else if (point.type === 'pv-mixed') {
                dotClass += ' fe-dot-pv-mixed';
                dotIcon = isDone ? _mi('check') : _mi('shuffle');
              }

              if (isDone) {
                dotClass += ' fe-dot-done';
              } else if (!isAccessible) {
                dotClass += ' fe-dot-locked';
              } else {
                dotClass += ' fe-dot-outline';
              }

              var onclick = (isAccessible || isDone) ? 'onclick="FastExercises.openPoint(\'' + catMeta.id + '\', \'' + activeLevel + '\', \'' + lesson.id + '\', ' + pi + ')"' : '';
              var tooltip = self._escapeHTML(point.label || '');

              html += (pi > 0 ? '<div class="fe-map-line"></div>' : '') +
                '<div class="' + dotClass + '" ' + onclick + ' title="' + tooltip + '">' +
                  '<span class="fe-dot-icon">' + dotIcon + '</span>' +
                '</div>';
            }
          }

          html += '</div></div>';

          if (li < lessonEnd - 1) {
            html += '<div class="fe-map-connector"></div>';
          }
        }

        html += '</div>'; // fe-map-container
        html += '</div>'; // fe-map-page
      }

      // Down arrow
      if (totalPages > 1) {
        html += '<button class="fe-map-arrow-btn fe-map-arrow-down" id="fe-map-arrow-down" onclick="FastExercises._goToMapPage(FastExercises._currentMapPage + 1)"' + (initialPage === totalPages - 1 ? ' style="visibility:hidden"' : '') + '>' + _mi('expand_more') + '</button>';
      }

      html += '</div>'; // fe-map-main
      html += '</div>'; // fe-map-outer

      return html;
    },

    // ── MAP PAGE NAVIGATION ───────────────────────────────────────────────
    _goToMapPage: function(pageIdx) {
      var pages = document.querySelectorAll('.fe-map-page');
      var totalPages = pages.length;
      if (totalPages === 0) return;
      pageIdx = Math.max(0, Math.min(totalPages - 1, pageIdx));
      this._currentMapPage = pageIdx;

      for (var i = 0; i < pages.length; i++) {
        pages[i].classList.toggle('fe-map-page-active', parseInt(pages[i].getAttribute('data-page')) === pageIdx);
      }

      var dots = document.querySelectorAll('.fe-map-page-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('fe-map-page-dot-active', parseInt(dots[i].getAttribute('data-page')) === pageIdx);
      }

      var upArrow = document.getElementById('fe-map-arrow-up');
      var downArrow = document.getElementById('fe-map-arrow-down');
      if (upArrow) upArrow.style.visibility = pageIdx === 0 ? 'hidden' : 'visible';
      if (downArrow) downArrow.style.visibility = pageIdx === totalPages - 1 ? 'hidden' : 'visible';
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
        '<div class="fe-review-title">' + _mi('sync') + ' ' + t('quickReview', 'Quick Review') + '</div>' +
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
      if (!progress[categoryId]) progress[categoryId] = { completedPoints: {}, activeLevel: 'B1' };
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

      // Find first incomplete accessible point across all lessons.
      // All points are free except the last pv-mixed in each lesson,
      // which requires all prior points in the lesson to be done.
      for (var li = 0; li < level.lessons.length; li++) {
        var lesson = level.lessons[li];
        if (!lesson.points) continue;

        for (var pi = 0; pi < lesson.points.length; pi++) {
          if (!this._isPointComplete(categoryId, levelId, lesson.id, pi)) {
            // Skip locked pv-mixed (last point) if not all prior done
            var point = lesson.points[pi];
            var isLastPvMixed = (point.type === 'pv-mixed' && pi === lesson.points.length - 1);
            if (isLastPvMixed) {
              var allPriorDone = true;
              for (var prev = 0; prev < pi; prev++) {
                if (!this._isPointComplete(categoryId, levelId, lesson.id, prev)) { allPriorDone = false; break; }
              }
              if (!allPriorDone) continue;
            }
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

      // Get point metadata from levels.json
      var pointLabel = 'Point ' + (pointIndex + 1);
      var pointType = 'explanation';
      var lessonTitle = lessonId;
      if (catData && catData.levels) {
        for (var i = 0; i < catData.levels.length; i++) {
          if (catData.levels[i].id === levelId && catData.levels[i].lessons) {
            for (var j = 0; j < catData.levels[i].lessons.length; j++) {
              var lsn = catData.levels[i].lessons[j];
              if (lsn.id === lessonId) {
                lessonTitle = lsn.title || lessonId;
                if (lsn.points && lsn.points[pointIndex]) {
                  pointLabel = lsn.points[pointIndex].label || pointLabel;
                  pointType  = lsn.points[pointIndex].type  || pointType;
                }
              }
            }
          }
        }
      }

      var catMeta = null;
      for (var c = 0; c < CATEGORIES.length; c++) {
        if (CATEGORIES[c].id === categoryId) { catMeta = CATEGORIES[c]; break; }
      }

      // ── New PV point types (read from lesson-level fields) ──────────────
      var pvTypes = ['pv-gallery', 'pv-fill-in', 'pv-conversations', 'pv-conversation-drag', 'pv-mixed'];
      if (pvTypes.indexOf(pointType) !== -1) {
        if (!lessonData || (!lessonData.phrasalVerbs && !lessonData.fillInExercises && !lessonData.conversations)) {
          // Data file not available yet
          this._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          content.innerHTML =
            '<div class="fe-point-view">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')">' + t('back', 'Back') + '</button>' +
                '<div>' +
                  '<div class="subpage-title">' + self._escapeHTML(pointLabel) + '</div>' +
                  '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonTitle) + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="fe-point-card">' +
                '<div class="fe-point-icon">' + _mi('description') + '</div>' +
                '<div class="fe-point-message">' + t('contentComingSoon', 'Detailed content coming soon! Point marked as complete.') + '</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#3b82f6') + '">' +
                  t('next', 'Next') + '' +
                '</button>' +
              '</div>' +
            '</div>';
          return;
        }
        if (pointType === 'pv-gallery') {
          this._renderPvGallery(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex);
        } else if (pointType === 'pv-fill-in') {
          this._renderPvFillIn(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex);
        } else if (pointType === 'pv-conversations') {
          this._renderPvConversations(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex);
        } else if (pointType === 'pv-conversation-drag') {
          this._renderPvConversationDrag(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex);
        } else if (pointType === 'pv-mixed') {
          this._renderPvMixed(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex);
        }
        var pvState = { view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex };
        history.pushState(pvState, '', Router.stateToPath(pvState));
        return;
      }

      // ── Legacy point types (read from lesson JSON's points array) ────────
      if (!lessonData || !lessonData.points || !lessonData.points[pointIndex]) {
        // No detailed lesson data - mark complete and show simple view
        this._markPointComplete(categoryId, levelId, lessonId, pointIndex);

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
              '<div class="fe-point-icon">' + (pointType === 'trophy' ? _mi('emoji_events') : _mi('description')) + '</div>' +
              '<div class="fe-point-message">' + t('contentComingSoon', 'Detailed content coming soon! Point marked as complete.') + '</div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#3b82f6') + '">' +
                t('next', 'Next') + '' +
              '</button>' +
            '</div>' +
          '</div>';
        return;
      }

      var point = lessonData.points[pointIndex];

      if (point.type === 'explanation') {
        this._renderExplanationPoint(content, point, catMeta, levelId, lessonId, lessonData.title, pointIndex);
      } else if (point.type === 'exercise' || point.type === 'review') {
        this._renderExercisePoint(content, point, catMeta, levelId, lessonId, lessonData.title, pointIndex);
      } else if (point.type === 'trophy') {
        this._renderExercisePoint(content, point, catMeta, levelId, lessonId, lessonData.title, pointIndex);
      }

      var pointState = { view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex };
      history.pushState(pointState, '', Router.stateToPath(pointState));
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
          '<h4>' + _mi('link') + ' ' + self._escapeHTML(ct.relatedVerb) + '</h4>' +
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
            (examplesHtml ? '<div class="fe-explanation-examples"><h4>' + _mi('lightbulb') + ' ' + t('examples', 'Examples') + '</h4><ul class="fe-example-list">' + examplesHtml + '</ul></div>' : '') +
            relatedHtml +
            '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
              t('gotItNext', 'Got it! Next') + '' +
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
              '<div class="fe-point-icon">' + (point.type === 'trophy' ? _mi('emoji_events') : _mi('check_circle')) + '</div>' +
              '<div class="fe-point-message">' + t('exerciseComingSoon', 'Exercises for this section coming soon! Point marked as complete.') + '</div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                t('next', 'Next') + '' +
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
              '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
              '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                t('next', 'Next') + '' +
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
          feedbackEl.textContent = '';
          feedbackEl.innerHTML = _mi('check_circle') + ' ' + t('correct', 'Correct') + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.textContent = '';
          feedbackEl.innerHTML = _mi('cancel') + ' ' + t('correctAnswerIs', 'The correct answer is') + ' ' + correctAnswer;
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

    // ── PV GALLERY (Point 1) ─────────────────────────────────────────────
    _renderPvGallery: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var pvs = (lessonData && lessonData.phrasalVerbs) || [];

      if (pvs.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + t('contentComingSoon', 'Content coming soon!') + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button></div></div>';
        return;
      }

      // Build cards HTML (all cards, shown/hidden via JS)
      var cardsHtml = '';
      pvs.forEach(function(pv, idx) {
        var examplesHtml = '';
        (pv.examples || []).forEach(function(ex) {
          examplesHtml += '<li>' + self._escapeHTML(ex) + '</li>';
        });
        cardsHtml += '<div class="pv-gallery-card pv-gallery-card-single' + (idx === 0 ? ' pv-gallery-card-active' : '') + '" data-idx="' + idx + '" style="--cat-color:' + catMeta.color + '">' +
          '<div class="pv-gallery-verb">' + self._escapeHTML(pv.verb) + '</div>' +
          '<div class="pv-gallery-def">' + self._escapeHTML(pv.definition || '') + '</div>' +
          (examplesHtml ? '<ul class="pv-gallery-examples">' + examplesHtml + '</ul>' : '') +
          '<div class="pv-gallery-num">' + (idx + 1) + ' / ' + pvs.length + '</div>' +
        '</div>';
      });

      // Build nav dots HTML
      var dotsHtml = '';
      pvs.forEach(function(pv, idx) {
        dotsHtml += '<div class="pv-gallery-nav-dot' + (idx === 0 ? ' pv-gallery-nav-dot-active' : '') + '" data-idx="' + idx + '" title="' + self._escapeHTML(pv.verb) + '" onclick="FastExercises._pvGalleryGoTo(' + idx + ')"></div>';
      });

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
            '<div class="subpage-header-titles">' +
              '<div class="subpage-title">' + '<span class="material-symbols-outlined">collections_bookmark</span>' + ' ' + self._escapeHTML(lessonTitle || '') + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + t('phrasalVerbGallery', 'Phrasal Verb Gallery') + ' · ' + pvs.length + ' ' + t('verbs', 'verbs') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="pv-gallery-single-wrap">' +
            '<div class="pv-gallery-cards-area" id="pv-gallery-cards">' +
              cardsHtml +
            '</div>' +
            '<div class="pv-gallery-nav-col" id="pv-gallery-nav">' +
              dotsHtml +
            '</div>' +
          '</div>' +
          '<div class="pv-gallery-footer">' +
            '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' +
              t('gotItNext', 'Got it! Next') + '' +
            '</button>' +
          '</div>' +
        '</div>';

      // Attach wheel scroll handler
      var cardsArea = document.getElementById('pv-gallery-cards');
      if (cardsArea) {
        cardsArea.addEventListener('wheel', function(e) {
          e.preventDefault();
          var current = FastExercises._pvGalleryCurrentIdx || 0;
          if (e.deltaY > 0) FastExercises._pvGalleryGoTo(current + 1);
          else FastExercises._pvGalleryGoTo(current - 1);
        }, { passive: false });
      }
      this._pvGalleryCurrentIdx = 0;
      this._pvGalleryTotal = pvs.length;
    },

    _pvGalleryGoTo: function(idx) {
      var total = this._pvGalleryTotal || 0;
      if (total === 0) return;
      idx = Math.max(0, Math.min(total - 1, idx));
      this._pvGalleryCurrentIdx = idx;

      var cards = document.querySelectorAll('.pv-gallery-card-single');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('pv-gallery-card-active', parseInt(cards[i].getAttribute('data-idx')) === idx);
      }
      var dots = document.querySelectorAll('#pv-gallery-nav .pv-gallery-nav-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('pv-gallery-nav-dot-active', parseInt(dots[i].getAttribute('data-idx')) === idx);
      }
    },

    // ── PV FILL-IN EXERCISES (Point 2) ───────────────────────────────────
    _renderPvFillIn: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var exercises = (lessonData && lessonData.fillInExercises) || [];

      if (exercises.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + t('contentComingSoon', 'Content coming soon!') + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button></div></div>';
        return;
      }

      var questionsHtml = '';
      exercises.forEach(function(ex, qi) {
        var inputHtml = '';
        if (ex.type === 'multiple-choice') {
          var optHtml = '';
          (ex.options || []).forEach(function(opt) {
            optHtml += '<button class="fe-quiz-option" data-question="pf' + qi + '" data-answer="' + self._escapeHTML(opt) + '" onclick="FastExercises._answerPvFillIn(this,' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')">' + self._escapeHTML(opt) + '</button>';
          });
          inputHtml = '<div class="fe-quiz-options">' + optHtml + '</div>';
        } else if (ex.type === 'write-verb') {
          inputHtml = '<div class="pv-write-row">' +
            (ex.hint ? '<span class="pv-write-hint">' + self._escapeHTML(ex.hint) + '</span>' : '') +
            '<input type="text" class="pv-write-input" id="pv-write-' + qi + '" placeholder="' + t('typeVerb', 'Type the verb…') + '" />' +
            '<button class="pv-write-btn" onclick="FastExercises._checkPvWriteVerb(' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('check', 'Check') + '</button>' +
          '</div>';
        }

        questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
          '<div class="fe-quiz-num">' + t('question', 'Question') + ' ' + (qi + 1) + '/' + exercises.length + '</div>' +
          '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(ex.sentence || '') + '</div>' +
          inputHtml +
          '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
        '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
            '<div class="subpage-header-titles">' +
              '<div class="subpage-title"><span class="material-symbols-outlined">edit</span> ' + self._escapeHTML(lessonTitle || '') + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + t('fillInTheGaps', 'Fill in the Gaps') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
            '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
            '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + exercises.length + '" data-answered="0" data-correct="0">' +
              questionsHtml +
            '</div>' +
            '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
              '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
              '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._showQuizQuestion(0);
    },

    _answerPvFillIn: function(btn, qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var chosen = btn.getAttribute('data-answer');
      var isCorrect = chosen.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      this._processPvFillInAnswer(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex);
      var buttons = document.querySelectorAll('[data-question="pf' + qIndex + '"]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (buttons[i].getAttribute('data-answer').trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          buttons[i].classList.add('fe-quiz-correct');
        }
        if (buttons[i] === btn && !isCorrect) {
          buttons[i].classList.add('fe-quiz-wrong');
        }
      }
    },

    _checkPvWriteVerb: function(qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var input = document.getElementById('pv-write-' + qIndex);
      if (!input) return;
      var typed = input.value.trim().toLowerCase();
      var correct = correctAnswer.trim().toLowerCase();
      var isCorrect = typed === correct;
      input.disabled = true;
      input.classList.add(isCorrect ? 'pv-write-correct' : 'pv-write-wrong');
      var btn = input.parentElement && input.parentElement.querySelector('.pv-write-btn');
      if (btn) btn.disabled = true;
      this._processPvFillInAnswer(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex);
    },

    _processPvFillInAnswer: function(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var feedbackEl = document.getElementById('fe-quiz-feedback-' + qIndex);
      var questionsContainer = document.getElementById('fe-quiz-questions');

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.innerHTML = _mi('check_circle') + ' ' + t('correct', 'Correct') + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.innerHTML = _mi('cancel') + ' ' + t('correctAnswerIs', 'The correct answer is') + ' <strong>' + self._escapeHTML(correctAnswer) + '</strong>';
        }
        feedbackEl.style.display = 'block';
      }

      var answered = parseInt(questionsContainer.getAttribute('data-answered')) + 1;
      var correct = parseInt(questionsContainer.getAttribute('data-correct')) + (isCorrect ? 1 : 0);
      var total = parseInt(questionsContainer.getAttribute('data-total'));
      questionsContainer.setAttribute('data-answered', answered);
      questionsContainer.setAttribute('data-correct', correct);

      var progressFill = document.getElementById('fe-quiz-progress-fill');
      if (progressFill) progressFill.style.width = Math.round((answered / total) * 100) + '%';

      setTimeout(function() {
        if (answered >= total) {
          self._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          var completeSection = document.getElementById('fe-quiz-complete');
          var completeText = document.getElementById('fe-quiz-complete-text');
          if (completeSection && completeText) {
            completeText.textContent = correct + '/' + total + ' ' + t('correct', 'correct') + '!';
            completeSection.style.display = 'block';
          }
          var qs = document.querySelectorAll('.fe-quiz-question');
          for (var i = 0; i < qs.length; i++) qs[i].style.display = 'none';
          if (typeof StreakManager !== 'undefined') StreakManager.recordActivity();
        } else {
          self._showQuizQuestion(qIndex + 1);
        }
      }, isCorrect ? 800 : 1800);
    },

    // ── PV CONVERSATIONS (Point 3) ───────────────────────────────────────
    _renderPvConversations: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var convs = (lessonData && lessonData.conversations) || [];

      // Store phrasal verbs for popup lookup
      this._currentPvVerbs = (lessonData && lessonData.phrasalVerbs) || [];

      if (convs.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + t('contentComingSoon', 'Content coming soon!') + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button></div></div>';
        return;
      }

      var convsHtml = '';
      convs.forEach(function(conv, ci) {
        var linesHtml = '';
        var speakers = {};
        var speakerIdx = 0;
        (conv.lines || []).forEach(function(line) {
          if (!(line.speaker in speakers)) { speakers[line.speaker] = speakerIdx++; }
          var side = speakers[line.speaker] % 2 === 0 ? 'left' : 'right';
          var text = self._escapeHTML(line.text).replace(/\[([^\]]+)\]/g, function(match, inner) {
            var sepIdx = inner.indexOf('|');
            if (sepIdx === -1) sepIdx = inner.indexOf('/');
            var displayVerb = sepIdx !== -1 ? inner.slice(0, sepIdx) : inner;
            var lookupVerb = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
            return '<strong class="pv-highlight pv-highlight-clickable" onclick="FastExercises._showPvVerbPopup(\'' + self._jsStr(lookupVerb) + '\')" title="' + self._escapeHTML(displayVerb) + '">' + displayVerb + '</strong>';
          });
          linesHtml += '<div class="pv-conv-line pv-conv-' + side + '">' +
            self._getAvatarHtml(line.speaker) +
            '<div class="pv-conv-bubble">' +
              '<span class="pv-conv-name">' + self._escapeHTML(line.speaker || '') + '</span>' +
              '<span class="pv-conv-text">' + text + '</span>' +
            '</div>' +
          '</div>';
        });
        convsHtml += '<div class="pv-conv-block pv-conv-slide' + (ci === 0 ? ' pv-conv-slide-active' : '') + '" data-idx="' + ci + '">' +
          '<div class="pv-conv-title"><span class="material-symbols-outlined">forum</span> ' + self._escapeHTML(conv.title || '') + '</div>' +
          '<div class="pv-conv-dialogue">' + linesHtml + '</div>' +
        '</div>';
      });

      // Nav dots for conversations
      var convDotsHtml = '';
      convs.forEach(function(conv, ci) {
        convDotsHtml += '<div class="pv-gallery-nav-dot' + (ci === 0 ? ' pv-gallery-nav-dot-active' : '') + '" data-idx="' + ci + '" title="' + self._escapeHTML(conv.title || ('Conversation ' + (ci + 1))) + '" onclick="FastExercises._pvConvGoTo(' + ci + ')"></div>';
      });

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
            '<div class="subpage-header-titles">' +
              '<div class="subpage-title"><span class="material-symbols-outlined">forum</span> ' + self._escapeHTML(lessonTitle || '') + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + t('realConversations', 'Real Conversations') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="pv-gallery-single-wrap">' +
            '<div class="pv-conversations-slides" id="pv-conv-slides">' +
              convsHtml +
            '</div>' +
            '<div class="pv-gallery-nav-col" id="pv-conv-nav">' +
              convDotsHtml +
            '</div>' +
          '</div>' +
          '<div class="pv-conv-footer">' +
            '<p class="pv-conv-hint"><span class="material-symbols-outlined">info</span> ' + t('pvHighlightHint', 'Phrasal verbs are highlighted in bold. Click a highlighted verb to see its definition.') + '</p>' +
            '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' +
              t('readyNext', 'Ready! Next') +
            '</button>' +
          '</div>' +
        '</div>';

      // Attach wheel scroll handler
      var slidesArea = document.getElementById('pv-conv-slides');
      if (slidesArea) {
        slidesArea.addEventListener('wheel', function(e) {
          e.preventDefault();
          var current = FastExercises._pvConvCurrentIdx || 0;
          if (e.deltaY > 0) FastExercises._pvConvGoTo(current + 1);
          else FastExercises._pvConvGoTo(current - 1);
        }, { passive: false });
      }
      this._pvConvCurrentIdx = 0;
      this._pvConvTotal = convs.length;
    },

    _pvConvGoTo: function(idx) {
      var total = this._pvConvTotal || 0;
      if (total === 0) return;
      idx = Math.max(0, Math.min(total - 1, idx));
      this._pvConvCurrentIdx = idx;

      var slides = document.querySelectorAll('.pv-conv-slide');
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle('pv-conv-slide-active', parseInt(slides[i].getAttribute('data-idx')) === idx);
      }
      var dots = document.querySelectorAll('#pv-conv-nav .pv-gallery-nav-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('pv-gallery-nav-dot-active', parseInt(dots[i].getAttribute('data-idx')) === idx);
      }
    },

    // ── PV CONVERSATION DRAG (Point 4) ───────────────────────────────────
    _renderPvConversationDrag: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var convs = (lessonData && lessonData.conversations) || [];
      var pvs = (lessonData && lessonData.phrasalVerbs) || [];

      if (convs.length === 0 || pvs.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + t('contentComingSoon', 'Content coming soon!') + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button></div></div>';
        return;
      }

      // Store full context including all conversations
      this._pvDragContext = {
        categoryId: catMeta.id, levelId: levelId, lessonId: lessonId,
        pointIndex: pointIndex, catColor: catMeta.color,
        convs: convs, currentConvIdx: 0, container: container,
        lessonTitle: lessonTitle, catMeta: catMeta, lessonData: lessonData
      };

      // Render the first conversation
      this._pvDragRenderConv(container, catMeta, levelId, lessonId, lessonTitle, pointIndex);
    },

    _pvDragRenderConv: function(container, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var ctx = this._pvDragContext;
      var convs = ctx.convs;
      var convIdx = ctx.currentConvIdx;
      var conv = convs[convIdx];
      var totalConvs = convs.length;

      // Extract gaps from this conversation only
      var gapVerbs = {};
      var totalGaps = 0;
      (conv.lines || []).forEach(function(line) {
        var matches = line.text.match(/\[([^\]]+)\]/g);
        if (matches) {
          matches.forEach(function(m) {
            var inner = m.replace(/[\[\]]/g, '');
            var sepIdx = inner.indexOf('|');
            if (sepIdx === -1) sepIdx = inner.indexOf('/');
            var verb = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
            gapVerbs[verb] = (gapVerbs[verb] || 0) + 1;
            totalGaps++;
          });
        }
      });

      // Build chip list for this conversation
      var chipsList = [];
      Object.keys(gapVerbs).forEach(function(verb) {
        for (var n = 0; n < gapVerbs[verb]; n++) chipsList.push(verb);
      });
      chipsList = chipsList.sort(function() { return Math.random() - 0.5; });

      var gapCounter = 0;
      var speakers = {};
      var speakerIdx = 0;
      var linesHtml = '';
      (conv.lines || []).forEach(function(line) {
        if (!(line.speaker in speakers)) { speakers[line.speaker] = speakerIdx++; }
        var side = speakers[line.speaker] % 2 === 0 ? 'left' : 'right';
        var text = self._escapeHTML(line.text).replace(/\[([^\]]+)\]/g, function(match, inner) {
          var sepIdx = inner.indexOf('|');
          if (sepIdx === -1) sepIdx = inner.indexOf('/');
          var displayForm = sepIdx !== -1 ? inner.slice(0, sepIdx) : inner;
          var phrasalVerb = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
          var gid = 'pv-gap-' + gapCounter;
          gapCounter++;
          return '<span class="pv-drop-zone" id="' + gid + '" data-verb="' + self._escapeHTML(phrasalVerb) + '" data-display="' + self._escapeHTML(displayForm) + '" data-filled="false" onclick="FastExercises._pvGapClick(\'' + gid + '\')" ondragover="event.preventDefault()" ondrop="FastExercises._pvDrop(event,\'' + gid + '\')">' +
            '<span class="pv-drop-placeholder">_____</span>' +
          '</span>';
        });
        linesHtml += '<div class="pv-conv-line pv-conv-' + side + '">' +
          self._getAvatarHtml(line.speaker) +
          '<div class="pv-conv-bubble">' +
            '<span class="pv-conv-name">' + self._escapeHTML(line.speaker || '') + '</span>' +
            '<span class="pv-conv-text">' + text + '</span>' +
          '</div>' +
        '</div>';
      });

      var chipsHtml = '';
      chipsList.forEach(function(verb, i) {
        chipsHtml += '<span class="pv-chip" id="pv-chip-' + i + '" draggable="true" data-verb="' + self._escapeHTML(verb) + '" data-chip-id="' + i + '" onclick="FastExercises._pvChipClick(' + i + ')" ondragstart="FastExercises._pvDragStart(event,' + i + ')">' +
          self._escapeHTML(verb) +
        '</span>';
      });

      // Progress indicator: "Conversation 1 / 2"
      var progressHtml = totalConvs > 1
        ? '<div class="pv-drag-conv-progress">' + t('conversation', 'Conversation') + ' ' + (convIdx + 1) + ' / ' + totalConvs + '</div>'
        : '';

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
            '<div class="subpage-header-titles">' +
              '<div class="subpage-title"><span class="material-symbols-outlined">drag_indicator</span> ' + self._escapeHTML(lessonTitle || '') + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + t('completeConversations', 'Complete the Conversations') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="pv-drag-container">' +
            progressHtml +
            '<p class="pv-drag-instruction">' + _mi('drag_indicator') + ' ' + t('dragInstruction', 'Drag each phrasal verb to the correct gap, or tap a chip and then tap a gap.') + '</p>' +
            '<div class="pv-conv-block">' +
              '<div class="pv-conv-title">' + _mi('forum') + ' ' + self._escapeHTML(conv.title || '') + '</div>' +
              '<div class="pv-conv-dialogue">' + linesHtml + '</div>' +
            '</div>' +
            '<div class="pv-chips-panel" id="pv-chips-panel" data-total-gaps="' + totalGaps + '" data-filled="0">' +
              '<div class="pv-chips-title">' + t('phrasalVerbs', 'Phrasal Verbs') + ':</div>' +
              '<div class="pv-chips-list" id="pv-chips-list">' + chipsHtml + '</div>' +
            '</div>' +
            '<div class="pv-drag-result" id="pv-drag-result" style="display:none;">' +
              '<div class="pv-drag-result-icon">' + _mi('celebration') + '</div>' +
              '<div class="pv-drag-result-text" id="pv-drag-result-text"></div>' +
              (convIdx + 1 < totalConvs
                ? '<button class="fe-point-next-btn" onclick="FastExercises._pvDragNextConv()" style="background:' + catMeta.color + '">' + t('nextConversation', 'Next Conversation') + '</button>'
                : '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button>'
              ) +
            '</div>' +
          '</div>' +
        '</div>';

      // Update context for drag handlers
      this._pvDragContext.totalGaps = totalGaps;
    },

    _pvDragNextConv: function() {
      var ctx = this._pvDragContext;
      if (!ctx) return;
      ctx.currentConvIdx++;
      this._pvDragRenderConv(ctx.container, ctx.catMeta, ctx.levelId, ctx.lessonId, ctx.lessonTitle, ctx.pointIndex);
    },

    _pvDragStart: function(event, chipId) {
      event.dataTransfer.setData('text/plain', String(chipId));
      this._pvSelectedChip = chipId;
      var chip = document.getElementById('pv-chip-' + chipId);
      if (chip) chip.classList.add('pv-chip-dragging');
    },

    _pvDrop: function(event, gapId) {
      event.preventDefault();
      var chipId = parseInt(event.dataTransfer.getData('text/plain'));
      this._pvFillGap(gapId, chipId);
    },

    _pvChipClick: function(chipId) {
      // Toggle selection
      if (this._pvSelectedChip === chipId) {
        this._pvSelectedChip = null;
        document.querySelectorAll('.pv-chip').forEach(function(c) { c.classList.remove('pv-chip-selected'); });
        return;
      }
      document.querySelectorAll('.pv-chip').forEach(function(c) { c.classList.remove('pv-chip-selected', 'pv-chip-dragging'); });
      this._pvSelectedChip = chipId;
      var chip = document.getElementById('pv-chip-' + chipId);
      if (chip) chip.classList.add('pv-chip-selected');
    },

    _pvGapClick: function(gapId) {
      if (this._pvSelectedChip !== null && this._pvSelectedChip !== undefined) {
        this._pvFillGap(gapId, this._pvSelectedChip);
        this._pvSelectedChip = null;
        document.querySelectorAll('.pv-chip').forEach(function(c) { c.classList.remove('pv-chip-selected', 'pv-chip-dragging'); });
      }
    },

    _pvFillGap: function(gapId, chipId) {
      var gap = document.getElementById(gapId);
      var chip = document.getElementById('pv-chip-' + chipId);
      if (!gap || !chip || chip.classList.contains('pv-chip-used')) return;
      if (gap.getAttribute('data-filled') === 'true') return;

      var verbFromChip = chip.getAttribute('data-verb');
      var correctVerb = gap.getAttribute('data-verb');
      // Normalize both sides: strip optional parenthetical parts for comparison
      var normChip = verbFromChip.trim().toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/\(a\)/g,'').replace(/\s+/g,' ').trim();
      var normGap  = correctVerb.trim().toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/\(a\)/g,'').replace(/\s+/g,' ').trim();
      var isCorrect = verbFromChip.trim().toLowerCase() === correctVerb.trim().toLowerCase() || normChip === normGap;

      // Fill the gap: show conjugated display form when correct, chip verb when wrong
      var displayText = isCorrect ? (gap.getAttribute('data-display') || verbFromChip) : verbFromChip;
      gap.setAttribute('data-filled', 'true');
      gap.innerHTML = '<span class="pv-drop-filled ' + (isCorrect ? 'pv-drop-correct' : 'pv-drop-wrong') + '">' + this._escapeHTML(displayText) + '</span>';
      if (!isCorrect) {
        gap.setAttribute('data-filled', 'false'); // Allow re-drop
        var self = this;
        setTimeout(function() {
          gap.innerHTML = '<span class="pv-drop-placeholder">_____</span>';
          gap.setAttribute('data-filled', 'false');
        }, 1200);
        return;
      }

      // Mark chip as used
      chip.classList.add('pv-chip-used');
      chip.draggable = false;

      // Check completion
      var panel = document.getElementById('pv-chips-panel');
      if (panel) {
        var total = parseInt(panel.getAttribute('data-total-gaps'));
        var filled = parseInt(panel.getAttribute('data-filled')) + 1;
        panel.setAttribute('data-filled', filled);
        if (filled >= total) {
          var ctx = this._pvDragContext;
          var convs = ctx && ctx.convs;
          var isLastConv = !convs || (ctx.currentConvIdx + 1 >= convs.length);
          // Only mark point complete when the last conversation is done
          if (ctx && isLastConv) this._markPointComplete(ctx.categoryId, ctx.levelId, ctx.lessonId, ctx.pointIndex);
          var result = document.getElementById('pv-drag-result');
          var resultText = document.getElementById('pv-drag-result-text');
          if (result && resultText) {
            var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
            resultText.textContent = t('allCorrect', 'All correct! Well done!');
            result.style.display = 'flex';
          }
          if (isLastConv && typeof StreakManager !== 'undefined') StreakManager.recordActivity();
        }
      }
    },

    // ── PV MIXED PRACTICE (Point 5) ──────────────────────────────────────
    _renderPvMixed: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var fillIns = (lessonData && lessonData.fillInExercises) || [];
      var convs   = (lessonData && lessonData.conversations) || [];

      // Build mixed list: take up to 4 fill-in exercises (every other one)
      var mixed = [];
      for (var fi = 0; fi < fillIns.length && mixed.length < 4; fi += 2) {
        mixed.push({ kind: 'fillin', data: fillIns[fi] });
      }
      // Add drag gaps extracted from conversation lines (up to 4)
      var gapCount = 0;
      convs.forEach(function(conv) {
        (conv.lines || []).forEach(function(line) {
          if (gapCount >= 4) return;
          var m = line.text.match(/\[([^\]]+)\]/);
          if (m) {
            var inner = m[1];
            var sepIdx = inner.indexOf('|');
            if (sepIdx === -1) sepIdx = inner.indexOf('/');
            var phrasalVerb = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
            var rawSentence = line.text.replace(/\[([^\]]+)\]/g, '_____');
            mixed.push({ kind: 'drag-single', data: { sentence: rawSentence, correct: phrasalVerb, speaker: line.speaker } });
            gapCount++;
          }
        });
      });

      // Shuffle mixed array
      mixed = mixed.sort(function() { return Math.random() - 0.5; });

      if (mixed.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + t('contentComingSoon', 'Content coming soon!') + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button></div></div>';
        return;
      }

      // Build all PV verbs list for chips in drag questions
      var allVerbs = (lessonData.phrasalVerbs || []).map(function(p) { return p.verb; });

      var questionsHtml = '';
      mixed.forEach(function(item, qi) {
        var inputHtml = '';
        if (item.kind === 'fillin') {
          var ex = item.data;
          if (ex.type === 'multiple-choice') {
            var optHtml = '';
            (ex.options || []).forEach(function(opt) {
              optHtml += '<button class="fe-quiz-option" data-question="pm' + qi + '" data-answer="' + self._escapeHTML(opt) + '" onclick="FastExercises._answerPvMixed(this,' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ',\'fillin\')">' + self._escapeHTML(opt) + '</button>';
            });
            inputHtml = '<div class="fe-quiz-options">' + optHtml + '</div>';
          } else if (ex.type === 'write-verb') {
            inputHtml = '<div class="pv-write-row">' +
              (ex.hint ? '<span class="pv-write-hint">' + self._escapeHTML(ex.hint) + '</span>' : '') +
              '<input type="text" class="pv-write-input" id="pv-mx-write-' + qi + '" placeholder="' + t('typeVerb', 'Type the verb…') + '" />' +
              '<button class="pv-write-btn" onclick="FastExercises._checkPvMixedWrite(' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('check', 'Check') + '</button>' +
            '</div>';
          }
          questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
            '<div class="fe-quiz-num">' + t('question', 'Question') + ' ' + (qi + 1) + '/' + mixed.length + '</div>' +
            '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(ex.sentence || '') + '</div>' +
            inputHtml +
            '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
          '</div>';
        } else if (item.kind === 'drag-single') {
          var ds = item.data;
          // Show 4 options: the correct verb + 3 random distractors
          var distractors = allVerbs.filter(function(v) { return v !== ds.correct; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
          var opts = [ds.correct].concat(distractors).sort(function() { return Math.random() - 0.5; });
          var optHtml = '';
          opts.forEach(function(opt) {
            optHtml += '<button class="fe-quiz-option" data-question="pm' + qi + '" data-answer="' + self._escapeHTML(opt) + '" onclick="FastExercises._answerPvMixed(this,' + qi + ',\'' + self._jsStr(ds.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ',\'conv\')">' + self._escapeHTML(opt) + '</button>';
          });
          questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
            '<div class="fe-quiz-num">' + t('question', 'Question') + ' ' + (qi + 1) + '/' + mixed.length + '</div>' +
            '<div class="pv-mx-conv-label">' + _mi('forum') + ' ' + self._escapeHTML(ds.speaker || '') + ':</div>' +
            '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(ds.sentence || '') + '</div>' +
            '<div class="fe-quiz-options">' + optHtml + '</div>' +
            '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
          '</div>';
        }
      });

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + t('back', 'Back') + '</button>' +
            '<div class="subpage-header-titles">' +
              '<div class="subpage-title"><span class="material-symbols-outlined">shuffle</span> ' + self._escapeHTML(lessonTitle || '') + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + t('mixedPractice', 'Mixed Practice') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
            '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
            '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + mixed.length + '" data-answered="0" data-correct="0">' +
              questionsHtml +
            '</div>' +
            '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
              '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
              '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + t('next', 'Next') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._showQuizQuestion(0);
    },

    _answerPvMixed: function(btn, qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex, kind) {
      var chosen = btn.getAttribute('data-answer');
      var isCorrect = chosen.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      var buttons = document.querySelectorAll('[data-question="pm' + qIndex + '"]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (buttons[i].getAttribute('data-answer').trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          buttons[i].classList.add('fe-quiz-correct');
        }
        if (buttons[i] === btn && !isCorrect) {
          buttons[i].classList.add('fe-quiz-wrong');
        }
      }
      this._processPvMixedAnswer(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex);
    },

    _checkPvMixedWrite: function(qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var input = document.getElementById('pv-mx-write-' + qIndex);
      if (!input) return;
      var typed = input.value.trim().toLowerCase();
      var isCorrect = typed === correctAnswer.trim().toLowerCase();
      input.disabled = true;
      input.classList.add(isCorrect ? 'pv-write-correct' : 'pv-write-wrong');
      var btn = input.parentElement && input.parentElement.querySelector('.pv-write-btn');
      if (btn) btn.disabled = true;
      this._processPvMixedAnswer(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex);
    },

    _processPvMixedAnswer: function(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var self = this;
      var feedbackEl = document.getElementById('fe-quiz-feedback-' + qIndex);
      var questionsContainer = document.getElementById('fe-quiz-questions');

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.innerHTML = _mi('check_circle') + ' ' + t('correct', 'Correct') + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.innerHTML = _mi('cancel') + ' ' + t('correctAnswerIs', 'The correct answer is') + ' <strong>' + self._escapeHTML(correctAnswer) + '</strong>';
        }
        feedbackEl.style.display = 'block';
      }

      var answered = parseInt(questionsContainer.getAttribute('data-answered')) + 1;
      var correct  = parseInt(questionsContainer.getAttribute('data-correct')) + (isCorrect ? 1 : 0);
      var total    = parseInt(questionsContainer.getAttribute('data-total'));
      questionsContainer.setAttribute('data-answered', answered);
      questionsContainer.setAttribute('data-correct', correct);

      var progressFill = document.getElementById('fe-quiz-progress-fill');
      if (progressFill) progressFill.style.width = Math.round((answered / total) * 100) + '%';

      setTimeout(function() {
        if (answered >= total) {
          self._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          var completeSection = document.getElementById('fe-quiz-complete');
          var completeText = document.getElementById('fe-quiz-complete-text');
          if (completeSection && completeText) {
            completeText.textContent = correct + '/' + total + ' ' + t('correct', 'correct') + '!';
            completeSection.style.display = 'block';
          }
          var qs = document.querySelectorAll('.fe-quiz-question');
          for (var i = 0; i < qs.length; i++) qs[i].style.display = 'none';
          if (typeof StreakManager !== 'undefined') StreakManager.recordActivity();
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
        // Go to first point of next lesson (no lesson locking)
        var nextLesson = level.lessons[currentLessonIdx + 1];
        this.openPoint(categoryId, levelId, nextLesson.id, 0);
      } else {
        // Level complete - go back to map
        this.openCategory(categoryId);
      }
    },

    // ── PROFILE AVATAR HELPER ────────────────────────────────────────────
    _getAvatarHtml: function(speakerName) {
      var PROFILES = ['Aisha','Alex','Anna','Carla','Carlos','Chen','Clara','Dan',
        'Daniel','Elena','Emma','Fatima','Jack','James','Javier','Kenji','Lucas',
        'Lucia','Malik','Maria','Mateo','Miguel','Oliver','Pierre','Priya',
        'Sarah','Sofia','Sophie'];
      var lname = (speakerName || '').toLowerCase();
      var matched = null;
      for (var i = 0; i < PROFILES.length; i++) {
        if (PROFILES[i].toLowerCase() === lname) { matched = PROFILES[i]; break; }
      }
      var initial = (speakerName || '').charAt(0).toUpperCase() || '?';
      if (matched) {
        return '<div class="pv-conv-avatar pv-avatar-has-photo" data-initial="' + initial + '">' +
          '<img class="pv-avatar-img" src="Assets/images/Profiles/' + matched + '.png" ' +
          'onerror="this.parentNode.classList.remove(\'pv-avatar-has-photo\')" />' +
          initial +
        '</div>';
      }
      return '<div class="pv-conv-avatar">' + initial + '</div>';
    },

    // ── PV VERB POPUP ────────────────────────────────────────────────────
    _normalizePvVerb: function(s) {
      // Normalize a verb string for flexible matching:
      // strip optional parenthetical parts and whitespace
      return (s || '').trim().toLowerCase()
        .replace(/\s*\([^)]*\)/g, '')   // remove (optional)
        .replace(/\(a\)/g, '')           // remove (a) in come (a)round
        .replace(/\s+/g, ' ')
        .trim();
    },
    _showPvVerbPopup: function(verbText) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var verbs = this._currentPvVerbs || [];
      var pv = null;
      var lv = (verbText || '').trim().toLowerCase();
      var lvNorm = this._normalizePvVerb(lv);

      for (var i = 0; i < verbs.length; i++) {
        if (!verbs[i].verb) continue;
        var vl = verbs[i].verb.trim().toLowerCase();
        // 1. Exact match
        if (vl === lv) { pv = verbs[i]; break; }
        // 2. Match after stripping parens from both sides
        var vlNorm = this._normalizePvVerb(vl);
        if (vlNorm === lvNorm && lvNorm.length > 0) { pv = verbs[i]; break; }
        // 3. Match any slash alternative: "switch on/off" contains "on" or "off"
        if (vl.indexOf('/') !== -1) {
          var vlParts = vl.replace(/\s*\([^)]*\)/g, '').split('/');
          // First word + each alternative
          var firstWord = vlParts[0].trim().split(' ')[0];
          for (var j = 0; j < vlParts.length; j++) {
            var alt = (firstWord + ' ' + vlParts[j].trim().split(' ').slice(-1)[0]).trim();
            if (alt === lvNorm) { pv = verbs[i]; break; }
          }
          if (pv) break;
        }
      }
      if (!pv) return;

      var existing = document.getElementById('pv-verb-popup');
      if (existing) existing.remove();

      var popup = document.createElement('div');
      popup.id = 'pv-verb-popup';
      popup.className = 'pv-verb-popup-overlay';

      var examplesHtml = '';
      (pv.examples || []).forEach(function(ex) {
        examplesHtml += '<li>' + FastExercises._escapeHTML(ex) + '</li>';
      });

      popup.innerHTML =
        '<div class="pv-verb-popup-card">' +
          '<button class="pv-verb-popup-close" onclick="document.getElementById(\'pv-verb-popup\').remove()">' +
            '<span class="material-symbols-outlined">close</span>' +
          '</button>' +
          '<div class="pv-verb-popup-badge">' + t('phrasalVerb', 'Phrasal Verb') + '</div>' +
          '<div class="pv-verb-popup-verb">' + FastExercises._escapeHTML(pv.verb || '') + '</div>' +
          '<div class="pv-verb-popup-def">' + FastExercises._escapeHTML(pv.definition || '') + '</div>' +
          (examplesHtml ? '<ul class="pv-verb-popup-examples">' + examplesHtml + '</ul>' : '') +
        '</div>';

      popup.addEventListener('click', function(e) {
        if (e.target === popup) popup.remove();
      });

      document.body.appendChild(popup);
    }
  };
})();
