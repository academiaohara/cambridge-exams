// js/fast-exercises.js
// Multi-category Fast Learning system with vertical progression maps

(function() {
  var STORAGE_KEY = 'cambridge_fast_exercises';
  var CATEGORIES = [
    { id: 'phrasal-verbs', icon: 'auto_stories', name: 'Phrasal Verbs', color: '#3b82f6' },
    { id: 'idioms', icon: 'record_voice_over', name: 'Idioms', color: '#f59e0b' },
    { id: 'word-formation', icon: 'text_fields', name: 'Word Formation', color: '#e11d48' }
  ];

  // Vocabulary flashcard constants
  var VOCAB_BATCH_SIZE = 15;   // Cards shown per session
  var VOCAB_MAX_STREAK = 10;   // Cap on consecutive-correct streak per word
  var VOCAB_RETRY_POS = 2;     // How far from front a bad card is reinserted (near top)

  // Mixed crossword constants
  var CW_MIN_PLACED = 8;       // Minimum words that must be placed for a valid crossword
  var CW_MAX_PLACED = 20;      // Maximum words placed per crossword
  var CW_BATCH_SIZE = 30;      // Words fed to the generator per crossword slot

  // Levels available for mixed crosswords and their crossword counts
  var CW_LEVEL_CONFIG = [
    { id: 'A2', count: 6 },
    { id: 'B1', count: 9 },
    { id: 'B2', count: 20 },
    { id: 'C1', count: 13 }
  ];

  // Common words excluded when extracting the key word from an idiom
  var CW_STOPWORDS = { 'the': 1, 'a': 1, 'an': 1, 'in': 1, 'at': 1, 'on': 1, 'to': 1,
    'of': 1, 'for': 1, 'with': 1, 'by': 1, 'from': 1, 'up': 1, 'about': 1, 'into': 1,
    'is': 1, 'be': 1, 'as': 1, 'it': 1, 'its': 1, 'this': 1, 'that': 1, 'was': 1,
    'are': 1, 'were': 1, 'has': 1, 'have': 1, 'had': 1, 'do': 1, 'does': 1, 'did': 1,
    'will': 1, 'would': 1, 'can': 1, 'could': 1, 'may': 1, 'might': 1, 'shall': 1,
    'should': 1, 'must': 1, 'not': 1, 'no': 1, 'nor': 1, 'so': 1, 'yet': 1, 'both': 1,
    'also': 1, 'just': 1, 'there': 1, 'their': 1, 'they': 1, 'all': 1, 'any': 1,
    'each': 1, 'few': 1, 'more': 1, 'most': 1, 'other': 1, 'some': 1, 'such': 1,
    'out': 1, 'off': 1, 'over': 1, 'under': 1, 'again': 1, 'then': 1, 'once': 1,
    'through': 1, 'my': 1, 'your': 1, 'his': 1, 'her': 1, 'our': 1, 'and': 1,
    'but': 1, 'or': 1, 'if': 1, 'how': 1, 'what': 1, 'when': 1, 'who': 1, 'which': 1,
    'where': 1, 'why': 1, 'too': 1, 'very': 1, 'these': 1, 'those': 1
  };

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
    _quickReviewCurrent: null,
    _quickReviewAll: null,
    _quickReviewCategory: null,
    _quickReviewLevel: null,

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
      var defaultLevel = categoryId === 'vocabulary' ? 'A2' : 'B1';
      return progress[categoryId] || { completedPoints: {}, activeLevel: defaultLevel };
    },

    _markPointComplete: function(categoryId, levelId, lessonId, pointIndex) {
      var progress = this._getProgress();
      var defaultLevel = categoryId === 'vocabulary' ? 'A2' : 'B1';
      if (!progress[categoryId]) progress[categoryId] = { completedPoints: {}, activeLevel: defaultLevel };
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
      var LEVEL_ORDER = ['A2', 'B1', 'B2', 'C1', 'C2'];
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

      // Show loading state
      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      // Load all category data
      var categoryCards = '';
      for (var i = 0; i < CATEGORIES.length; i++) {
        var cat = CATEGORIES[i];
        var data = await this._loadCategoryData(cat.id);
        var pct = data ? this._getCategoryPercent(cat.id, data.levels) : 0;
        var totalPoints = data ? this._getTotalPoints(data.levels) : 0;

        var levelBtnsHtml = '';
        if (data && data.levels) {
          for (var lvIdx = 0; lvIdx < data.levels.length; lvIdx++) {
            var lv = data.levels[lvIdx];
            var isUnlocked = this._isLevelUnlocked(cat.id, lv.id, data.levels);
            var lockClass = isUnlocked ? '' : ' fe-cat-level-btn-locked';
            var lvClick = isUnlocked
              ? 'onclick="event.stopPropagation(); FastExercises._switchLevel(\'' + cat.id + '\', \'' + lv.id + '\')"'
              : '';
            levelBtnsHtml += '<button class="fe-cat-level-btn' + lockClass + '" style="background:' + cat.color + '" ' + lvClick + '>' + lv.id + '</button>';
          }
        }

        categoryCards += '<div class="fe-category-card" style="--cat-color: ' + cat.color + '" onclick="FastExercises.openCategory(\'' + cat.id + '\')">' +
          '<div class="fe-category-card-header">' +
            '<span class="fe-category-icon">' + _mi(cat.icon) + '</span>' +
            '<div class="fe-category-info">' +
              '<div class="fe-category-name">' + this._escapeHTML(cat.name) + '</div>' +
              '<div class="fe-category-stats">' + totalPoints + ' ' + 'items' + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fe-category-progress">' +
            '<div class="fe-progress-bar-bg">' +
              '<div class="fe-progress-bar-fill" style="width:' + pct + '%; background:' + cat.color + '"></div>' +
            '</div>' +
            '<span class="fe-progress-text">' + pct + '% ' + 'complete' + '</span>' +
          '</div>' +
          '<div class="fe-cat-level-btns">' + levelBtnsHtml + '</div>' +
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
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="fe-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="loadDashboard()">' + 'Back' + '</button>' +
                '<div>' +
                  '<div class="subpage-title">' + _mi('bolt') + ' ' + 'Fast Learning' + '</div>' +
                  '<div class="subpage-subtitle">' + 'Choose a category and start your learning path' + '</div>' +
                '</div>' +
              '</div>' +
                '<div class="fe-categories-grid">' + categoryCards + '</div>' +
              '</div>' +
            '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
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

      // ── CENTER: Vertical Progression Map / Topic List (vocabulary) ──
      var centerMap;
      if (categoryId === 'vocabulary') {
        centerMap = await self._buildVocabTopicList(catMeta, data, activeLevel);
      } else {
        centerMap = self._buildProgressionMap(catMeta, data, activeLevel);
      }

      // ── RIGHT WIDGET: Quick Review Mixer ──
      var rightWidget = this._buildQuickReviewWidget(catMeta, data, activeLevel);

      // ── PROGRESS BAR ──
      var bottomBar = this._buildBottomProgressBar(catMeta, data, activeLevel);

      // ── LEGEND (PV only) ──
      var legendHtml = '';
      if (categoryId === 'phrasal-verbs') {
        legendHtml = '<div class="fe-map-legend fe-map-legend-top">' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-gallery fe-dot-mini fe-dot-outline">' + _mi('collections_bookmark') + '</span> ' + 'Gallery' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-fill-in fe-dot-mini fe-dot-outline">' + _mi('edit') + '</span> ' + 'Fill In' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-conv fe-dot-mini fe-dot-outline">' + _mi('forum') + '</span> ' + 'Conversations' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-drag fe-dot-mini fe-dot-outline">' + _mi('drag_indicator') + '</span> ' + 'Drag & Drop' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-pv-mixed fe-dot-mini fe-dot-outline">' + _mi('shuffle') + '</span> ' + 'Mixed' + '</span>' +
        '</div>';
      } else if (categoryId === 'word-formation') {
        legendHtml = '<div class="fe-map-legend fe-map-legend-top">' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-wf-explanation fe-dot-mini fe-dot-outline">' + _mi('school') + '</span> ' + 'Explanation' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-wf-multiple-choice fe-dot-mini fe-dot-outline">' + _mi('rule') + '</span> ' + 'Multiple Choice' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-wf-transform fe-dot-mini fe-dot-outline">' + _mi('transform') + '</span> ' + 'Transformation' + '</span>' +
        '</div>';
      } else if (categoryId === 'collocations') {
        legendHtml = '<div class="fe-map-legend fe-map-legend-top">' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-explanation fe-dot-mini fe-dot-outline">' + _mi('school') + '</span> ' + 'Explanation' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-exercise fe-dot-mini fe-dot-outline">' + _mi('rule') + '</span> ' + 'Exercise' + '</span>' +
          '<span class="fe-legend-item"><span class="fe-dot fe-dot-review fe-dot-mini fe-dot-outline">' + _mi('replay') + '</span> ' + 'Review' + '</span>' +
        '</div>';
      } else if (categoryId === 'vocabulary') {
        legendHtml = '';
      }

      var _isCourseCategory = ['phrasal-verbs', 'idioms', 'word-formation'].indexOf(categoryId) !== -1;
      var _backFn = _isCourseCategory ? 'BentoGrid.openLessons()' : 'FastExercises.openCategories()';

      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftWidget)
            : '<div class="dashboard-left-sidebar">' + leftWidget + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="fe-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="' + _backFn + '">' + 'Back' + '</button>' +
                '<div class="subpage-header-titles">' +
                  '<div class="subpage-title">' + _mi(catMeta.icon) + ' ' + this._escapeHTML(data.name || catMeta.name) + '</div>' +
                  '<div class="subpage-subtitle">' + 'Level Progress' + ' — ' + activeLevel + '</div>' +
                '</div>' +
                (categoryId === 'phrasal-verbs' ? '<button class="subpage-info-btn" onclick="FastExercises._showPvInfoModal()" title="' + 'What are phrasal verbs?' + '">' + _mi('info') + '</button>' : '') +
                (categoryId === 'word-formation' ? '<button class="subpage-info-btn" onclick="FastExercises._showWfInfoModal()" title="' + 'What is word formation?' + '">' + _mi('info') + '</button>' : '') +
                (categoryId === 'collocations' ? '<button class="subpage-info-btn" onclick="FastExercises._showCollocInfoModal()" title="' + 'What are collocations?' + '">' + _mi('info') + '</button>' : '') +
                (categoryId === 'idioms' ? '<button class="subpage-info-btn" onclick="FastExercises._showIdInfoModal()" title="' + 'What are idioms?' + '">' + _mi('info') + '</button>' : '') +
              '</div>' +
              bottomBar +
              legendHtml +
              centerMap +
            '</div>' +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightWidget)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightWidget + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      var catState = { view: 'fastExerciseCategory', categoryId: categoryId };
      history.pushState(catState, '', Router.stateToPath(catState));
    },

    // ── LEFT WIDGET ──────────────────────────────────────────────────────
    _buildCategoryInfoWidget: function(catMeta, data, activeLevel) {
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
            (isUnlocked ? '<span class="fe-level-pct">' + lvPct + '%</span>' : '<span class="fe-level-pct">' + 'Locked' + '</span>') +
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
            '<div class="fe-info-subtitle">' + 'Level' + ': ' + activeLevel + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="fe-info-progress-wrap">' +
          '<div class="fe-progress-bar-bg">' +
            '<div class="fe-progress-bar-fill" style="width:' + catPct + '%; background:' + catMeta.color + '"></div>' +
          '</div>' +
          '<div class="fe-info-progress-text">' + catPct + '% ' + 'complete' + '</div>' +
        '</div>' +
        '<div class="fe-level-selector-title">' + 'Levels' + '</div>' +
        '<div class="fe-level-selector">' + levelsHtml + '</div>' +
        '<div class="fe-info-stats">' +
          '<div class="fe-info-stat">' + totalDone + '/' + totalAll + ' ' + 'items' + '</div>' +
        '</div>' +
        '<button class="fe-reset-level-btn" onclick="FastExercises._confirmResetLevel(\'' + catMeta.id + '\', \'' + activeLevel + '\')">' +
          _mi('restart_alt') + ' ' + 'Reset Level' +
        '</button>' +
      '</div>';
    },

    // ── RESET LEVEL ──────────────────────────────────────────────────────
    _confirmResetLevel: function(categoryId, levelId) {
      var msg = 'Reset all progress for level ' + levelId + '?';
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
      var existing = document.getElementById('pv-info-modal');
      if (existing) { existing.remove(); return; }

      var modal = document.createElement('div');
      modal.id = 'pv-info-modal';
      modal.className = 'pv-info-modal-overlay';
      modal.innerHTML =
        '<div class="pv-info-modal-box">' +
          '<div class="pv-info-modal-header">' +
            '<span class="pv-info-modal-icon">' + '<span class="material-symbols-outlined">auto_stories</span>' + '</span>' +
            '<h2 class="pv-info-modal-title">' + 'What are Phrasal Verbs' + '</h2>' +
            '<button class="pv-info-modal-close" onclick="document.getElementById(\'pv-info-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="pv-info-modal-body">' +
            '<p><strong>' + 'What are phrasal verbs?' + '</strong></p>' +
            '<p>' + 'Phrasal verbs are combinations of a verb and one or two particles (a preposition or an adverb) that together create a meaning different from the original verb.' + '</p>' +
            '<p>' + 'For example:' + '</p>' +
            '<ul class="pv-info-list">' +
              '<li>' + '<em>look</em> (to see) → <em>look after</em> (to take care of)' + '</li>' +
              '<li>' + '<em>get</em> (to obtain) → <em>get along</em> (to have a good relationship)' + '</li>' +
            '</ul>' +
            '<p>' + '👉 The key point is that their meaning is often <strong>not literal</strong>, so they need to be learned as a whole.' + '</p>' +
            '<p><strong>' + 'Why are they important?' + '</strong></p>' +
            '<p>' + 'Phrasal verbs are very common in everyday English and frequently appear in Cambridge exams. Learning them will help you:' + '</p>' +
            '<ul class="pv-info-list">' +
              '<li>' + 'Understand real-life conversations' + '</li>' +
              '<li>' + 'Sound more natural when speaking' + '</li>' +
              '<li>' + 'Improve your exam performance' + '</li>' +
            '</ul>' +
            '<p><strong>' + 'Tip 💡' + '</strong></p>' +
            '<p>' + 'Try to learn them with examples and in context, not as isolated words.' + '</p>' +
            '<p><button class="pv-info-dict-link" onclick="FastExercises._showPvDictionary(); document.getElementById(\'pv-info-modal\').remove();">' + _mi('search') + ' Open the Phrasal Verbs Dictionary</button></p>' +
          '</div>' +
          '<div class="pv-info-modal-footer">' +
            '<button class="pv-info-modal-btn" onclick="document.getElementById(\'pv-info-modal\').remove()">' + 'Got it!' + '</button>' +
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
      var LESSONS_PER_PAGE = 4;

      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === activeLevel) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons || level.lessons.length === 0) {
        return '<div class="fe-map-empty">' + 'No lessons available for this level yet.' + '</div>';
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
          html += '<div class="fe-map-page-dot' + (p === initialPage ? ' fe-map-page-dot-active' : '') + '" data-page="' + p + '" onclick="FastExercises._goToMapPage(' + p + ')" title="' + 'Lessons' + ' ' + startL + '\u2013' + endL + '"></div>';
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
              '<span class="fe-map-lesson-num">' + 'Lesson' + ' ' + (li + 1) + '</span>' +
              '<span class="fe-map-lesson-name">' + self._escapeHTML(lesson.title) + '</span>' +
            '</div>' +
            '<div class="fe-map-points-row">';

          if (lesson.points) {
            for (var pi = 0; pi < lesson.points.length; pi++) {
              var point = lesson.points[pi];
              var isDone = self._isPointComplete(catMeta.id, activeLevel, lesson.id, pi);

              var isLastPvMixed = (point.type === 'pv-mixed' && pi === lesson.points.length - 1) ||
                                  (point.type === 'id-quiz' && pi === lesson.points.length - 1);
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
                    '<span class="fe-level-name">' + self._escapeHTML(point.label || 'Review') + '</span>' +
                    '<span class="fe-level-pct">' + (isDone ? 'Completed' : (isAccessible ? 'Available' : 'Locked')) + '</span>' +
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
              } else if (point.type === 'wf-explanation') {
                dotClass += ' fe-dot-wf-explanation';
                dotIcon = isDone ? _mi('check') : _mi('school');
              } else if (point.type === 'wf-multiple-choice') {
                dotClass += ' fe-dot-wf-multiple-choice';
                dotIcon = isDone ? _mi('check') : _mi('rule');
              } else if (point.type === 'wf-transform') {
                dotClass += ' fe-dot-wf-transform';
                dotIcon = isDone ? _mi('check') : _mi('transform');
              } else if (point.type === 'id-gallery') {
                dotClass += ' fe-dot-id-gallery';
                dotIcon = isDone ? _mi('check') : _mi('collections_bookmark');
              } else if (point.type === 'id-fill-in') {
                dotClass += ' fe-dot-id-fill-in';
                dotIcon = isDone ? _mi('check') : _mi('edit');
              } else if (point.type === 'id-conversations') {
                dotClass += ' fe-dot-id-conv';
                dotIcon = isDone ? _mi('check') : _mi('forum');
              } else if (point.type === 'id-conversation-drag') {
                dotClass += ' fe-dot-id-drag';
                dotIcon = isDone ? _mi('check') : _mi('drag_indicator');
              } else if (point.type === 'id-quiz') {
                dotClass += ' fe-dot-id-quiz';
                dotIcon = isDone ? _mi('check') : _mi('quiz');
              } else if (point.type === 'id-trophy') {
                dotClass += ' fe-dot-trophy';
                dotIcon = isDone ? _mi('check') : _mi('emoji_events');
              } else if (point.type === 'vocab-flashcards') {
                dotClass += ' fe-dot-vocab-flashcards';
                dotIcon = isDone ? _mi('check') : _mi('style');
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

    // ── VOCABULARY TOPIC LIST ─────────────────────────────────────────────
    _buildVocabTopicList: async function(catMeta, data, activeLevel) {
      var self = this;
      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === activeLevel) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons || level.lessons.length === 0) {
        return '<div class="fe-map-empty">No topics available for this level yet.</div>';
      }

      // Load all lesson data in parallel to get word counts
      var lessonDataMap = {};
      await Promise.all(level.lessons.map(async function(lesson) {
        var ld = await self._loadLessonData('vocabulary', activeLevel, lesson.id);
        lessonDataMap[lesson.id] = ld;
      }));

      var html = '<div class="vocab-topic-list">';
      for (var li = 0; li < level.lessons.length; li++) {
        var lesson = level.lessons[li];
        var ld = lessonDataMap[lesson.id];
        var totalWords = ld && ld.words ? ld.words.length : 0;
        var streaks = self._getVocabStreaks(activeLevel, lesson.id);
        var learnedCount = 0;
        Object.keys(streaks).forEach(function(w) { if ((streaks[w] || 0) > 0) learnedCount++; });
        var hasReview = learnedCount > 0;
        var hasLearn = learnedCount < totalWords;
        var progressPct = totalWords > 0 ? Math.round(learnedCount / totalWords * 100) : 0;

        html += '<div class="vocab-topic-row">' +
          '<div class="vocab-topic-info">' +
            '<div class="vocab-topic-name">' + self._escapeHTML(lesson.title) + '</div>' +
            '<div class="vocab-topic-stats">' +
              '<span class="vocab-topic-count">' + learnedCount + ' / ' + totalWords + '</span> learned' +
            '</div>' +
            '<div class="vocab-topic-bar">' +
              '<div class="vocab-topic-bar-fill" style="width:' + progressPct + '%; background:' + catMeta.color + '"></div>' +
            '</div>' +
          '</div>' +
          '<div class="vocab-topic-btns">' +
            '<button class="vocab-topic-btn vocab-topic-review-btn' + (!hasReview ? ' vocab-topic-btn-disabled' : '') + '" ' +
              (hasReview ? 'onclick="FastExercises._openVocabSession(\'' + activeLevel + '\',\'' + lesson.id + '\',\'review\')"' : 'disabled') + '>' +
              _mi('replay') + '<span>Review</span>' +
            '</button>' +
            '<button class="vocab-topic-btn vocab-topic-learn-btn' + (!hasLearn ? ' vocab-topic-btn-disabled' : '') + '" ' +
              (hasLearn ? 'onclick="FastExercises._openVocabSession(\'' + activeLevel + '\',\'' + lesson.id + '\',\'learn\')"' : 'disabled') + '>' +
              _mi('school') + '<span>Learn</span>' +
            '</button>' +
            '<button class="vocab-topic-btn vocab-topic-crossword-btn" onclick="FastExercises._openVocabCrossword(\'' + activeLevel + '\',\'' + lesson.id + '\')">' +
              _mi('grid_on') + '<span>Crossword</span>' +
            '</button>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
      return html;
    },

    // ── OPEN VOCABULARY SESSION ───────────────────────────────────────────
    _openVocabSession: async function(levelId, lessonId, mode) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      var catMeta = null;
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].id === 'vocabulary') { catMeta = CATEGORIES[i]; break; }
      }

      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      var lessonData = await this._loadLessonData('vocabulary', levelId, lessonId);
      if (!lessonData || !lessonData.words || lessonData.words.length === 0) {
        content.innerHTML = '<div class="fe-error">No words available.</div>';
        return;
      }

      var allWords = lessonData.words;
      var streaks = this._getVocabStreaks(levelId, lessonId);
      var lessonTitle = lessonData.title || lessonId;
      var color = catMeta ? catMeta.color : '#10b981';
      var levelsData = await this._loadCategoryData('vocabulary');

      // Filter words by mode
      var filteredWords;
      if (mode === 'review') {
        filteredWords = allWords.filter(function(w) { return (streaks[w.word] || 0) > 0; });
        // Weakest words first (lowest streak)
        filteredWords.sort(function(a, b) { return (streaks[a.word] || 0) - (streaks[b.word] || 0); });
      } else {
        filteredWords = allWords.filter(function(w) { return (streaks[w.word] || 0) === 0; });
      }

      if (filteredWords.length === 0) {
        var emptyIcon = mode === 'review' ? 'info' : 'emoji_events';
        var emptyTitle = mode === 'review' ? 'Nothing to review yet!' : 'All words learned!';
        var emptyMsg = mode === 'review' ? 'Learn some words first, then come back to review them.' : 'You\'ve learned all the words in this topic. Try reviewing them!';

        var wrapper = document.createElement('div');
        wrapper.className = 'fe-section';
        content.innerHTML = '';
        content.appendChild(wrapper);

        var sidebarHtml = self._buildVocabSidebarHtml(catMeta, levelId, lessonId, levelsData, mode);
        wrapper.innerHTML =
          '<div class="vocab-fc-layout">' +
            '<div class="vocab-fc-main" id="vocab-fc-main">' +
              '<div class="vocab-fc-wrapper">' +
                '<div class="vocab-fc-results-card" style="--card-color:' + color + '">' +
                  '<div class="vocab-fc-results-icon"><span class="material-symbols-outlined" style="color:' + color + '">' + emptyIcon + '</span></div>' +
                  '<div class="vocab-fc-results-title">' + emptyTitle + '</div>' +
                  '<div class="vocab-fc-results-msg">' + emptyMsg + '</div>' +
                  '<button class="vocab-fc-next-batch-btn" onclick="FastExercises.openCategory(\'vocabulary\')" style="background:' + color + '">' +
                    '<span class="material-symbols-outlined">arrow_back</span> Back to Topics' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            sidebarHtml +
          '</div>';
        return;
      }

      var BATCH_SIZE = VOCAB_BATCH_SIZE;
      var batchWords = filteredWords.slice(0, BATCH_SIZE);

      this._currentCategory = 'vocabulary';
      this._currentLevel = levelId;

      var wrapper = document.createElement('div');
      wrapper.className = 'fe-section';
      content.innerHTML = '';
      content.appendChild(wrapper);

      this._startVocabFlashcardSession(wrapper, batchWords, allWords, streaks, catMeta, levelId, lessonId, lessonTitle, mode, null, null, color, levelsData);
    },

    // ── RIGHT WIDGET ─────────────────────────────────────────────────────
    _buildQuickReviewWidget: function(catMeta, data, activeLevel) {
      return '<div class="sidebar-widget fe-review-widget">' +
        '<div class="fe-review-title">' + _mi('quiz') + '<span>Quick Review</span></div>' +
        '<div class="fe-review-subtitle">' + 'Random exercises from' + ' ' + this._escapeHTML(catMeta.name) + ' · ' + activeLevel + '</div>' +
        '<button class="fe-review-btn" onclick="FastExercises._startQuickReview(\'' + catMeta.id + '\', \'' + activeLevel + '\')" style="background:' + catMeta.color + '">' +
          _mi('shuffle') + ' Start Quick Review' +
        '</button>' +
      '</div>';
    },

    // ── BOTTOM BAR ───────────────────────────────────────────────────────
    _buildBottomProgressBar: function(catMeta, data, activeLevel) {
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
          'Continue' +
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
            var isLastPvMixed = (point.type === 'pv-mixed' && pi === lesson.points.length - 1) ||
                                 (point.type === 'id-quiz' && pi === lesson.points.length - 1);
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

    // ── QUICK REVIEW ─────────────────────────────────────────────────────
    _startQuickReview: async function(categoryId, activeLevel) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var self = this;

      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      var catMeta = null;
      for (var c = 0; c < CATEGORIES.length; c++) {
        if (CATEGORIES[c].id === categoryId) { catMeta = CATEGORIES[c]; break; }
      }
      if (!catMeta) return;

      var data = await this._loadCategoryData(categoryId);
      if (!data) return;

      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === activeLevel) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons) return;

      // Load all lesson data in parallel
      var lessonDataMap = {};
      await Promise.all(level.lessons.map(async function(lesson) {
        var ld = await self._loadLessonData(categoryId, activeLevel, lesson.id);
        lessonDataMap[lesson.id] = ld;
      }));

      // Extract exercises from last point of each lesson
      var allExercises = [];
      level.lessons.forEach(function(lesson) {
        var ld = lessonDataMap[lesson.id];
        if (!ld) return;
        var exs = self._extractQuickReviewExercises(ld, categoryId);
        allExercises = allExercises.concat(exs);
      });

      // Shuffle and pick up to 10
      allExercises = allExercises.sort(function() { return Math.random() - 0.5; });
      var selected = allExercises.slice(0, 10);

      if (selected.length === 0) {
        content.innerHTML =
          '<div class="fe-point-view">' +
            '<div class="subpage-header">' +
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')">' + 'Back' + '</button>' +
              '<div class="subpage-header-titles">' +
                '<div class="subpage-title">' + _mi('quiz') + ' Quick Review</div>' +
                '<div class="subpage-subtitle">' + self._escapeHTML(catMeta.name) + ' · ' + activeLevel + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="fe-quiz-complete-section" style="display:block;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('info') + '</div>' +
                '<div class="fe-quiz-complete-text">No exercises available for this level yet.</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')" style="background:' + catMeta.color + '">Back to Map</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        return;
      }

      this._renderQuickReview(content, selected, catMeta, activeLevel, allExercises);
    },

    // ── EXTRACT EXERCISES FOR QUICK REVIEW ───────────────────────────────
    _extractQuickReviewExercises: function(lessonData, categoryId) {
      var exercises = [];

      if (categoryId === 'phrasal-verbs') {
        var allVerbs = (lessonData.phrasalVerbs || []).map(function(p) { return p.verb; });
        // Multiple-choice fill-in exercises
        (lessonData.fillInExercises || []).forEach(function(ex) {
          if (ex.type === 'multiple-choice') {
            var opts = (ex.options || []).slice().sort(function() { return Math.random() - 0.5; });
            exercises.push({ sentence: ex.sentence, options: opts, correct: ex.correct, type: 'mcq' });
          }
        });
        // Conversation gap exercises
        (lessonData.conversations || []).forEach(function(conv) {
          (conv.lines || []).forEach(function(line) {
            var m = line.text.match(/\[([^\]]+)\]/);
            if (m) {
              var inner = m[1];
              var sepIdx = inner.indexOf('|');
              if (sepIdx === -1) sepIdx = inner.indexOf('/');
              var pv = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
              var sentence = line.text.replace(/\[([^\]]+)\]/g, '_____');
              var distractors = allVerbs.filter(function(v) { return v !== pv; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
              var opts = [pv].concat(distractors).sort(function() { return Math.random() - 0.5; });
              exercises.push({ sentence: sentence, options: opts, correct: pv, type: 'mcq' });
            }
          });
        });

      } else if (categoryId === 'idioms') {
        (lessonData.quizExercises || []).forEach(function(ex) {
          if (ex.type === 'match-meaning') {
            (ex.pairs || []).forEach(function(pair, pi) {
              var distractors = (ex.pairs || []).filter(function(p, i) { return i !== pi; }).map(function(p) { return p.meaning; });
              var opts = [pair.meaning].concat(distractors.sort(function() { return Math.random() - 0.5; }).slice(0, 3)).sort(function() { return Math.random() - 0.5; });
              exercises.push({ sentence: 'What does "' + pair.idiom + '" mean?', options: opts, correct: pair.meaning, type: 'mcq' });
            });
          } else if (ex.type === 'complete-sentence' || ex.type === 'select-situation') {
            var correct = typeof ex.correct === 'number' ? (ex.options || [])[ex.correct] : ex.correct;
            var opts = (ex.options || []).slice().sort(function() { return Math.random() - 0.5; });
            exercises.push({ sentence: ex.sentence || ex.question || '', options: opts, correct: correct, type: 'mcq' });
          }
        });

      } else if (categoryId === 'word-formation') {
        (lessonData.transformExercises || []).forEach(function(ex) {
          exercises.push({ sentence: ex.sentence, correct: ex.correct, type: 'write', hint: ex.root, options: [] });
        });
      }

      return exercises;
    },

    // ── RENDER QUICK REVIEW INTERFACE ─────────────────────────────────────
    _renderQuickReview: function(container, exercises, catMeta, activeLevel, allExercises) {
      var self = this;

      var questionsHtml = '';
      exercises.forEach(function(q, qi) {
        var inputHtml = '';
        if (q.type === 'mcq') {
          var optHtml = '';
          (q.options || []).forEach(function(opt) {
            optHtml += '<button class="fe-quiz-option" data-question="qr' + qi + '" data-answer="' + self._escapeHTML(opt) + '" onclick="FastExercises._answerQuickReview(this,' + qi + ',\'' + self._jsStr(q.correct) + '\')">' + self._escapeHTML(opt) + '</button>';
          });
          inputHtml = '<div class="fe-quiz-options">' + optHtml + '</div>';
        } else if (q.type === 'write') {
          inputHtml =
            '<div class="pv-write-row">' +
              '<input type="text" class="pv-write-input wf-transform-input" id="qr-write-' + qi + '" placeholder="Type the correct form…" />' +
              '<button class="pv-write-btn" onclick="FastExercises._checkQuickReviewWrite(' + qi + ',\'' + self._jsStr(q.correct) + '\')" style="background:' + catMeta.color + '">Check</button>' +
            '</div>';
        }

        var sentenceText = q.type === 'write' ? (q.sentence || '').replace(/\s*\([A-Z]+\)\s*$/, '') : (q.sentence || '');
        var sentenceClass = 'fe-quiz-sentence' + (q.type === 'write' ? ' wf-transform-sentence' : '');
        questionsHtml +=
          '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
            '<div class="fe-quiz-num">Question ' + (qi + 1) + '/' + exercises.length + '</div>' +
            (q.hint ? '<div class="wf-transform-root-row">' + _mi('text_fields') + ' <span class="wf-transform-root-word">' + self._escapeHTML(q.hint) + '</span></div>' : '') +
            '<div class="' + sentenceClass + '">' + self._escapeHTML(sentenceText) + '</div>' +
            inputHtml +
            '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
          '</div>';
      });

      // Store state for repeat/new round
      this._quickReviewCurrent = exercises;
      this._quickReviewAll = allExercises;
      this._quickReviewCategory = catMeta.id;
      this._quickReviewLevel = activeLevel;

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + 'Back' + '</button>' +
            '<div class="subpage-header-titles">' +
              '<div class="subpage-title">' + _mi('quiz') + ' Quick Review</div>' +
              '<div class="subpage-subtitle">' + self._escapeHTML(catMeta.name) + ' · ' + activeLevel + ' · ' + exercises.length + ' exercises</div>' +
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
              '<div class="fe-qr-complete-actions">' +
                '<button class="fe-point-next-btn" onclick="FastExercises._quickReviewNewRound()" style="background:' + catMeta.color + '">' + _mi('shuffle') + ' New Review</button>' +
                '<button class="fe-point-next-btn fe-qr-repeat-btn" onclick="FastExercises._quickReviewRepeat()" style="background:' + catMeta.color + '">' + _mi('replay') + ' Repeat</button>' +
                '<button class="fe-qr-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + _mi('arrow_back') + ' Back to Map</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._showQuizQuestion(0);

      // Allow Enter key for write inputs
      var inputs = container.querySelectorAll('.wf-transform-input');
      for (var i = 0; i < inputs.length; i++) {
        (function(idx) {
          inputs[idx].addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              var btn = e.target.parentElement && e.target.parentElement.querySelector('.pv-write-btn');
              if (btn && !btn.disabled) btn.click();
            }
          });
        })(i);
      }
    },

    _answerQuickReview: function(btn, qIndex, correctAnswer) {
      var chosen = btn.getAttribute('data-answer');
      var isCorrect = chosen.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      var buttons = document.querySelectorAll('[data-question="qr' + qIndex + '"]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (buttons[i].getAttribute('data-answer').trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          buttons[i].classList.add('fe-quiz-correct');
        }
        if (buttons[i] === btn && !isCorrect) {
          buttons[i].classList.add('fe-quiz-wrong');
        }
      }
      this._processQuickReviewAnswer(qIndex, isCorrect, correctAnswer);
    },

    _checkQuickReviewWrite: function(qIndex, correctAnswer) {
      var input = document.getElementById('qr-write-' + qIndex);
      if (!input) return;
      var typed = input.value.trim().toLowerCase();
      var isCorrect = typed === correctAnswer.trim().toLowerCase();
      input.disabled = true;
      input.classList.add(isCorrect ? 'pv-write-correct' : 'pv-write-wrong');
      var btn = input.parentElement && input.parentElement.querySelector('.pv-write-btn');
      if (btn) btn.disabled = true;
      this._processQuickReviewAnswer(qIndex, isCorrect, correctAnswer);
    },

    _processQuickReviewAnswer: function(qIndex, isCorrect, correctAnswer) {
      var self = this;
      var feedbackEl = document.getElementById('fe-quiz-feedback-' + qIndex);
      var questionsContainer = document.getElementById('fe-quiz-questions');

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.innerHTML = _mi('check_circle') + ' Correct!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.innerHTML = _mi('cancel') + ' The correct answer is <strong>' + self._escapeHTML(correctAnswer) + '</strong>';
        }
        feedbackEl.style.display = 'flex';
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
          var completeSection = document.getElementById('fe-quiz-complete');
          var completeText = document.getElementById('fe-quiz-complete-text');
          if (completeSection && completeText) {
            completeText.textContent = correct + '/' + total + ' correct!';
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

    _quickReviewNewRound: function() {
      var content = document.getElementById('main-content');
      if (!content || !this._quickReviewAll || !this._quickReviewCategory) return;
      var catMeta = null;
      for (var c = 0; c < CATEGORIES.length; c++) {
        if (CATEGORIES[c].id === this._quickReviewCategory) { catMeta = CATEGORIES[c]; break; }
      }
      if (!catMeta) return;
      var shuffled = this._quickReviewAll.slice().sort(function() { return Math.random() - 0.5; });
      var selected = shuffled.slice(0, 10);
      this._renderQuickReview(content, selected, catMeta, this._quickReviewLevel, this._quickReviewAll);
    },

    _quickReviewRepeat: function() {
      var content = document.getElementById('main-content');
      if (!content || !this._quickReviewCurrent || !this._quickReviewCategory) return;
      var catMeta = null;
      for (var c = 0; c < CATEGORIES.length; c++) {
        if (CATEGORIES[c].id === this._quickReviewCategory) { catMeta = CATEGORIES[c]; break; }
      }
      if (!catMeta) return;
      this._renderQuickReview(content, this._quickReviewCurrent, catMeta, this._quickReviewLevel, this._quickReviewAll);
    },

    // ── OPEN INDIVIDUAL POINT ────────────────────────────────────────────
    openPoint: async function(categoryId, levelId, lessonId, pointIndex) {
      var content = document.getElementById('main-content');
      if (!content) return;
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
      var lessonPoints = [];
      if (catData && catData.levels) {
        for (var i = 0; i < catData.levels.length; i++) {
          if (catData.levels[i].id === levelId && catData.levels[i].lessons) {
            for (var j = 0; j < catData.levels[i].lessons.length; j++) {
              var lsn = catData.levels[i].lessons[j];
              if (lsn.id === lessonId) {
                lessonTitle = lsn.title || lessonId;
                lessonPoints = lsn.points || [];
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
      if (pvTypes.indexOf(pointType) !== -1) {        if (!lessonData || (!lessonData.phrasalVerbs && !lessonData.fillInExercises && !lessonData.conversations)) {
          // Data file not available yet
          this._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          content.innerHTML =
            '<div class="fe-point-view">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')">' + 'Back' + '</button>' +
                '<div>' +
                  '<div class="subpage-title">' + self._escapeHTML(pointLabel) + '</div>' +
                  '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonTitle) + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="fe-point-card">' +
                '<div class="fe-point-icon">' + _mi('description') + '</div>' +
                '<div class="fe-point-message">' + 'Detailed content coming soon! Point marked as complete.' + '</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#3b82f6') + '">' +
                  'Next' + '' +
                '</button>' +
              '</div>' +
            '</div>';
          return;
        }
        if (pointType === 'pv-gallery') {
          this._renderPvGallery(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'pv-fill-in') {
          this._renderPvFillIn(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'pv-conversations') {
          this._renderPvConversations(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'pv-conversation-drag') {
          this._renderPvConversationDrag(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'pv-mixed') {
          this._renderPvMixed(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        }
        var pvState = { view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex };
        history.pushState(pvState, '', Router.stateToPath(pvState));
        return;
      }

      // ── Word Formation point types ──────────────────────────────────────
      var wfTypes = ['wf-explanation', 'wf-multiple-choice', 'wf-transform'];
      if (wfTypes.indexOf(pointType) !== -1) {
        if (!lessonData || (!lessonData.wordForms && !lessonData.multipleChoiceExercises && !lessonData.transformExercises)) {
          this._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          content.innerHTML =
            '<div class="fe-point-view">' +
              '<div class="fe-point-card">' +
                '<div class="fe-point-message">' + 'Content coming soon!' + '</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#e11d48') + '">' + 'Next' + '</button>' +
              '</div>' +
            '</div>';
          return;
        }
        if (pointType === 'wf-explanation') {
          this._renderWfExplanation(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'wf-multiple-choice') {
          this._renderWfMultipleChoice(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'wf-transform') {
          this._renderWfTransform(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        }
        var wfState = { view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex };
        history.pushState(wfState, '', Router.stateToPath(wfState));
        return;
      }

      // ── Idioms point types ──────────────────────────────────────────────
      var idTypes = ['id-gallery', 'id-fill-in', 'id-conversations', 'id-conversation-drag', 'id-quiz', 'id-trophy'];
      if (idTypes.indexOf(pointType) !== -1) {
        if (pointType === 'id-trophy') {
          this._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          content.innerHTML =
            '<div class="fe-point-view">' +
              '<div class="fe-point-card">' +
                '<div class="fe-point-icon">' + _mi('emoji_events') + '</div>' +
                '<div class="fe-point-message">' + '🏆 Congratulations! You\'ve completed all ' + levelId + ' Idioms lessons!' + '</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')" style="background:' + (catMeta ? catMeta.color : '#f59e0b') + '">' +
                  'Back to Map' +
                '</button>' +
              '</div>' +
            '</div>';
          var trophyState = { view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex };
          history.pushState(trophyState, '', Router.stateToPath(trophyState));
          return;
        }
        if (!lessonData || (!lessonData.idioms && !lessonData.fillInExercises && !lessonData.conversations && !lessonData.quizExercises)) {
          this._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          content.innerHTML =
            '<div class="fe-point-view">' +
              '<div class="fe-point-card">' +
                '<div class="fe-point-message">' + 'Content coming soon!' + '</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#f59e0b') + '">' + 'Next' + '</button>' +
              '</div>' +
            '</div>';
          return;
        }
        if (pointType === 'id-gallery') {
          this._renderIdGallery(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'id-fill-in') {
          this._renderIdFillIn(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'id-conversations') {
          this._renderIdConversations(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'id-conversation-drag') {
          this._renderIdConversationDrag(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        } else if (pointType === 'id-quiz') {
          this._renderIdQuiz(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        }
        var idState = { view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex };
        history.pushState(idState, '', Router.stateToPath(idState));
        return;
      }

      // ── Vocabulary Flashcards ───────────────────────────────────────────
      if (pointType === 'vocab-flashcards') {
        if (!lessonData || !lessonData.words || lessonData.words.length === 0) {
          this._markPointComplete(categoryId, levelId, lessonId, pointIndex);
          content.innerHTML =
            '<div class="fe-point-view">' +
              '<div class="fe-point-card">' +
                '<div class="fe-point-message">' + 'Content coming soon!' + '</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#10b981') + '">' + 'Next' + '</button>' +
              '</div>' +
            '</div>';
          return;
        }
        this._renderVocabFlashcards(content, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints);
        var vocabState = { view: 'fastExercisePoint', categoryId: categoryId, levelId: levelId, lessonId: lessonId, pointIndex: pointIndex };
        history.pushState(vocabState, '', Router.stateToPath(vocabState));
        return;
      }

      if (!lessonData || !lessonData.points || !lessonData.points[pointIndex]) {
        // No detailed lesson data - mark complete and show simple view
        this._markPointComplete(categoryId, levelId, lessonId, pointIndex);

        content.innerHTML =
          '<div class="fe-point-view">' +
            '<div class="subpage-header">' +
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')">' + 'Back' + '</button>' +
              '<div>' +
                '<div class="subpage-title">' + self._escapeHTML(pointLabel) + '</div>' +
                '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonId) + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fe-point-card">' +
              '<div class="fe-point-icon">' + (pointType === 'trophy' ? _mi('emoji_events') : _mi('description')) + '</div>' +
              '<div class="fe-point-message">' + 'Detailed content coming soon! Point marked as complete.' + '</div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + categoryId + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + (catMeta ? catMeta.color : '#3b82f6') + '">' +
                'Next' + '' +
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
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + 'Back' + '</button>' +
            '<div>' +
              '<div class="subpage-title">' + self._escapeHTML(point.label) + '</div>' +
              '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonTitle || '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fe-explanation-card" style="--cat-color:' + catMeta.color + '">' +
            '<div class="fe-explanation-verb">' + self._escapeHTML(ct.phrasalVerb || point.label) + '</div>' +
            '<div class="fe-explanation-def">' + self._escapeHTML(ct.definition || '') + '</div>' +
            (examplesHtml ? '<div class="fe-explanation-examples"><h4>' + _mi('lightbulb') + ' ' + 'Examples' + '</h4><ul class="fe-example-list">' + examplesHtml + '</ul></div>' : '') +
            relatedHtml +
            '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
              'Got it! Next' + '' +
            '</button>' +
          '</div>' +
        '</div>';
    },

    // ── RENDER EXERCISE POINT ────────────────────────────────────────────
    _renderExercisePoint: function(container, point, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var self = this;
      var ct = point.content || {};
      var questions = ct.questions || [];

      if (questions.length === 0) {
        // No questions available
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML =
          '<div class="fe-point-view">' +
            '<div class="subpage-header">' +
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + 'Back' + '</button>' +
              '<div>' +
                '<div class="subpage-title">' + self._escapeHTML(point.label) + '</div>' +
                '<div class="subpage-subtitle">' + levelId + ' · ' + self._escapeHTML(lessonTitle || '') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fe-point-card">' +
              '<div class="fe-point-icon">' + (point.type === 'trophy' ? _mi('emoji_events') : _mi('check_circle')) + '</div>' +
              '<div class="fe-point-message">' + 'Exercises for this section coming soon! Point marked as complete.' + '</div>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\', \'' + levelId + '\', \'' + lessonId + '\', ' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                'Next' + '' +
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
          '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + questions.length + '</div>' +
          '<div class="fe-quiz-sentence">' + self._escapeHTML(q.sentence || '') + '</div>' +
          '<div class="fe-quiz-options">' + optionsHtml + '</div>' +
          '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
        '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view">' +
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' + 'Back' + '</button>' +
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
                'Next' + '' +
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
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.textContent = '';
          feedbackEl.innerHTML = _mi('check_circle') + ' ' + 'Correct' + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.textContent = '';
          feedbackEl.innerHTML = _mi('cancel') + ' ' + 'The correct answer is' + ' ' + correctAnswer;
        }
        feedbackEl.style.display = 'flex';
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
            completeText.textContent = correct + '/' + total + ' ' + 'correct' + '!';
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

    // ── IDIOMS: GALLERY (Point 1) ─────────────────────────────────────────
    _renderIdGallery: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
      var idioms = (lessonData && lessonData.idioms) || [];

      if (idioms.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      var cardsHtml = '';
      idioms.forEach(function(id, idx) {
        var examplesHtml = '';
        (id.examples || []).forEach(function(ex) {
          examplesHtml += '<li>' + self._escapeHTML(ex) + '</li>';
        });
        cardsHtml += '<div class="pv-gallery-card pv-gallery-card-single' + (idx === 0 ? ' pv-gallery-card-active' : '') + '" data-idx="' + idx + '" style="--cat-color:' + catMeta.color + '">' +
          '<div class="pv-gallery-verb id-gallery-idiom">' + self._escapeHTML(id.idiom) + '</div>' +
          '<div class="pv-gallery-def">' + self._escapeHTML(id.definition || '') + '</div>' +
          (examplesHtml ? '<ul class="pv-gallery-examples">' + examplesHtml + '</ul>' : '') +
          (id.usageTip ? '<div class="id-gallery-tip"><span class="material-symbols-outlined">lightbulb</span>' + self._escapeHTML(id.usageTip) + '</div>' : '') +
          '<div class="pv-gallery-num">' + (idx + 1) + ' / ' + idioms.length + '</div>' +
        '</div>';
      });

      var dotsHtml = '';
      idioms.forEach(function(id, idx) {
        dotsHtml += '<div class="pv-gallery-nav-dot' + (idx === 0 ? ' pv-gallery-nav-dot-active' : '') + '" data-idx="' + idx + '" title="' + self._escapeHTML(id.idiom) + '" onclick="FastExercises._idGalleryGoTo(' + idx + ')"></div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="pv-gallery-single-wrap">' +
              '<div class="pv-gallery-cards-area" id="id-gallery-cards">' +
                cardsHtml +
              '</div>' +
              '<div class="pv-gallery-nav-col" id="id-gallery-nav">' +
                dotsHtml +
              '</div>' +
            '</div>' +
            '<div class="pv-gallery-footer">' +
              '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                'Got it! Next' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var cardsArea = document.getElementById('id-gallery-cards');
      if (cardsArea) {
        cardsArea.addEventListener('wheel', function(e) {
          e.preventDefault();
          var current = FastExercises._idGalleryCurrentIdx || 0;
          if (e.deltaY > 0) FastExercises._idGalleryGoTo(current + 1);
          else FastExercises._idGalleryGoTo(current - 1);
        }, { passive: false });
      }
      this._idGalleryCurrentIdx = 0;
      this._idGalleryTotal = idioms.length;
    },

    _idGalleryGoTo: function(idx) {
      var total = this._idGalleryTotal || 0;
      if (total === 0) return;
      idx = Math.max(0, Math.min(total - 1, idx));
      this._idGalleryCurrentIdx = idx;
      var cards = document.querySelectorAll('#id-gallery-cards .pv-gallery-card-single');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('pv-gallery-card-active', parseInt(cards[i].getAttribute('data-idx')) === idx);
      }
      var dots = document.querySelectorAll('#id-gallery-nav .pv-gallery-nav-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('pv-gallery-nav-dot-active', parseInt(dots[i].getAttribute('data-idx')) === idx);
      }
    },

    // ── IDIOMS: FILL-IN EXERCISES (Point 2) ───────────────────────────────
    _renderIdFillIn: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
      var exercises = (lessonData && lessonData.fillInExercises) || [];

      if (exercises.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      var questionsHtml = '';
      exercises.forEach(function(ex, qi) {
        var optHtml = '';
        (ex.options || []).forEach(function(opt) {
          optHtml += '<button class="fe-quiz-option" data-question="id-fi' + qi + '" data-answer="' + self._escapeHTML(opt) + '" onclick="FastExercises._answerIdFillIn(this,' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')">' + self._escapeHTML(opt) + '</button>';
        });
        questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
          '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + exercises.length + '</div>' +
          '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(ex.sentence || '') + '</div>' +
          '<div class="fe-quiz-options">' + optHtml + '</div>' +
          '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
        '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
              '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + exercises.length + '" data-answered="0" data-correct="0">' +
                questionsHtml +
              '</div>' +
              '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
                '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._showQuizQuestion(0);
    },

    _answerIdFillIn: function(btn, qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var chosen = btn.getAttribute('data-answer');
      var isCorrect = chosen.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      var buttons = document.querySelectorAll('[data-question="id-fi' + qIndex + '"]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (buttons[i].getAttribute('data-answer').trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          buttons[i].classList.add('fe-quiz-correct');
        }
        if (buttons[i] === btn && !isCorrect) {
          buttons[i].classList.add('fe-quiz-wrong');
        }
      }
      this._processPvFillInAnswer(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex);
    },

    // ── IDIOMS: CONVERSATIONS (Point 3) ───────────────────────────────────
    _renderIdConversations: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      var convs = (lessonData && lessonData.conversations) || [];
      this._currentLessonData = lessonData;
      this._currentIdIdioms = (lessonData && lessonData.idioms) || [];

      if (convs.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      var totalConvs = convs.length;
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
            var displayIdiom = sepIdx !== -1 ? inner.slice(0, sepIdx) : inner;
            var lookupIdiom = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
            return '<strong class="pv-highlight pv-highlight-clickable" onclick="FastExercises._showIdIdiomPopup(\'' + self._jsStr(lookupIdiom) + '\')" title="' + self._escapeHTML(displayIdiom) + '">' + displayIdiom + '</strong>';
          });
          linesHtml += '<div class="pv-conv-line pv-conv-' + side + '">' +
            self._getAvatarHtml(line.speaker) +
            '<div class="pv-conv-bubble">' +
              '<span class="pv-conv-name">' + self._escapeHTML(line.speaker || '') + '</span>' +
              '<span class="pv-conv-text">' + text + '</span>' +
            '</div>' +
          '</div>';
        });
        var numHtml = totalConvs > 1 ? '<span class="pv-conv-num">' + (ci + 1) + '/' + totalConvs + '</span>' : '';
        convsHtml += '<div class="pv-conv-block pv-conv-slide' + (ci === 0 ? ' pv-conv-slide-active' : '') + '" data-idx="' + ci + '">' +
          '<div class="pv-conv-title"><span class="material-symbols-outlined">forum</span><span class="pv-conv-title-text">' + self._escapeHTML(conv.title || '') + '</span>' + numHtml + '</div>' +
          '<div class="pv-conv-dialogue">' + linesHtml + '</div>' +
        '</div>';
      });

      var convDotsHtml = '';
      convs.forEach(function(conv, ci) {
        convDotsHtml += '<div class="pv-gallery-nav-dot' + (ci === 0 ? ' pv-gallery-nav-dot-active' : '') + '" data-idx="' + ci + '" title="' + self._escapeHTML(conv.title || ('Conversation ' + (ci + 1))) + '" onclick="FastExercises._idConvGoTo(' + ci + ')"></div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="pv-gallery-single-wrap">' +
              '<div class="pv-conversations-slides" id="id-conv-slides">' +
                convsHtml +
              '</div>' +
              '<div class="pv-gallery-nav-col" id="id-conv-nav">' +
                convDotsHtml +
              '</div>' +
            '</div>' +
            '<div class="pv-conv-footer">' +
              '<p class="pv-conv-hint"><span class="material-symbols-outlined">info</span> ' + 'Idioms are highlighted in bold. Click a highlighted idiom to see its meaning.' + '</p>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                'Ready! Next' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var slidesArea = document.getElementById('id-conv-slides');
      if (slidesArea) {
        slidesArea.addEventListener('wheel', function(e) {
          e.preventDefault();
          var current = FastExercises._idConvCurrentIdx || 0;
          if (e.deltaY > 0) FastExercises._idConvGoTo(current + 1);
          else FastExercises._idConvGoTo(current - 1);
        }, { passive: false });
      }
      this._idConvCurrentIdx = 0;
      this._idConvTotal = convs.length;
    },

    _idConvGoTo: function(idx) {
      var total = this._idConvTotal || 0;
      if (total === 0) return;
      idx = Math.max(0, Math.min(total - 1, idx));
      this._idConvCurrentIdx = idx;
      var slides = document.querySelectorAll('.pv-conv-slide');
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle('pv-conv-slide-active', parseInt(slides[i].getAttribute('data-idx')) === idx);
      }
      var dots = document.querySelectorAll('#id-conv-nav .pv-gallery-nav-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('pv-gallery-nav-dot-active', parseInt(dots[i].getAttribute('data-idx')) === idx);
      }
    },

    _showIdIdiomPopup: function(idiomText) {
      var existing = document.getElementById('id-idiom-popup');
      if (existing) existing.remove();

      var idioms = this._currentIdIdioms || (this._currentLessonData && this._currentLessonData.idioms) || [];
      var found = null;
      var normLookup = idiomText.trim().toLowerCase();
      for (var i = 0; i < idioms.length; i++) {
        if ((idioms[i].idiom || '').trim().toLowerCase() === normLookup) { found = idioms[i]; break; }
      }
      if (!found) return;

      var examplesHtml = '';
      (found.examples || []).forEach(function(ex) {
        examplesHtml += '<li>' + FastExercises._escapeHTML(ex) + '</li>';
      });

      var popup = document.createElement('div');
      popup.id = 'id-idiom-popup';
      popup.className = 'pv-verb-popup-overlay';
      popup.innerHTML =
        '<div class="pv-verb-popup-card">' +
          '<button class="pv-verb-popup-close" onclick="document.getElementById(\'id-idiom-popup\').remove()">' +
            '<span class="material-symbols-outlined">close</span>' +
          '</button>' +
          '<div class="pv-verb-popup-badge" style="background:#f59e0b">Idiom</div>' +
          '<div class="pv-verb-popup-verb">' + FastExercises._escapeHTML(found.idiom || '') + '</div>' +
          '<div class="pv-verb-popup-def">' + FastExercises._escapeHTML(found.definition || '') + '</div>' +
          (examplesHtml ? '<ul class="pv-verb-popup-examples">' + examplesHtml + '</ul>' : '') +
          (found.usageTip ? '<div class="id-gallery-tip"><span class="material-symbols-outlined">lightbulb</span>' + FastExercises._escapeHTML(found.usageTip) + '</div>' : '') +
        '</div>';
      popup.addEventListener('click', function(e) { if (e.target === popup) popup.remove(); });
      document.body.appendChild(popup);
    },

    // ── IDIOMS: CONVERSATION DRAG (Point 4) ───────────────────────────────
    _renderIdConversationDrag: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
      var convs = (lessonData && lessonData.conversations) || [];
      var idioms = (lessonData && lessonData.idioms) || [];

      if (convs.length === 0 || idioms.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      this._idDragContext = {
        categoryId: catMeta.id, levelId: levelId, lessonId: lessonId,
        pointIndex: pointIndex, catColor: catMeta.color,
        convs: convs, currentConvIdx: 0, container: container,
        lessonTitle: lessonTitle, catMeta: catMeta, lessonData: lessonData,
        lessonPoints: lessonPoints
      };

      this._idDragRenderConv(container, catMeta, levelId, lessonId, lessonTitle, pointIndex);
    },

    _idDragRenderConv: function(container, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
      var self = this;
      var ctx = this._idDragContext;
      var convs = ctx.convs;
      var convIdx = ctx.currentConvIdx;
      var conv = convs[convIdx];
      var totalConvs = convs.length;

      var gapIdioms = {};
      var totalGaps = 0;
      (conv.lines || []).forEach(function(line) {
        var matches = line.text.match(/\[([^\]]+)\]/g);
        if (matches) {
          matches.forEach(function(m) {
            var inner = m.replace(/[\[\]]/g, '');
            var sepIdx = inner.indexOf('|');
            if (sepIdx === -1) sepIdx = inner.indexOf('/');
            var idiom = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
            gapIdioms[idiom] = (gapIdioms[idiom] || 0) + 1;
            totalGaps++;
          });
        }
      });

      var chipsList = [];
      Object.keys(gapIdioms).forEach(function(idiom) {
        for (var n = 0; n < gapIdioms[idiom]; n++) chipsList.push(idiom);
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
          var idiomKey = sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner;
          var gid = 'id-gap-' + gapCounter;
          gapCounter++;
          return '<span class="pv-drop-zone" id="' + gid + '" data-verb="' + self._escapeHTML(idiomKey) + '" data-display="' + self._escapeHTML(displayForm) + '" data-filled="false" onclick="FastExercises._idGapClick(\'' + gid + '\')" ondragover="event.preventDefault()" ondrop="FastExercises._idDrop(event,\'' + gid + '\')">' +
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
      chipsList.forEach(function(idiom, i) {
        chipsHtml += '<span class="pv-chip" id="id-chip-' + i + '" draggable="true" data-verb="' + self._escapeHTML(idiom) + '" data-chip-id="' + i + '" onclick="FastExercises._idChipClick(' + i + ')" ondragstart="FastExercises._idDragStart(event,' + i + ')">' +
          self._escapeHTML(idiom) +
        '</span>';
      });

      var numHtml = totalConvs > 1 ? '<span class="pv-conv-num">' + (convIdx + 1) + '/' + totalConvs + '</span>' : '';

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, ctx.lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="pv-drag-container">' +
              '<div class="pv-drag-main">' +
                '<div class="pv-conv-block">' +
                  '<div class="pv-conv-title">' + _mi('forum') + '<span class="pv-conv-title-text">' + self._escapeHTML(conv.title || '') + '</span>' + numHtml + '</div>' +
                  '<div class="pv-conv-dialogue">' + linesHtml + '</div>' +
                '</div>' +
                '<div class="pv-drag-result" id="id-drag-result" style="display:none;">' +
                  '<div class="pv-drag-result-icon">' + _mi('celebration') + '</div>' +
                  '<div class="pv-drag-result-text" id="id-drag-result-text"></div>' +
                  (convIdx + 1 < totalConvs
                    ? '<button class="fe-point-next-btn" onclick="FastExercises._idDragNextConv()" style="background:' + catMeta.color + '">' + 'Next Conversation' + '</button>'
                    : '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>'
                  ) +
                '</div>' +
              '</div>' +
              '<div class="pv-chips-panel" id="id-chips-panel" data-total-gaps="' + totalGaps + '" data-filled="0">' +
                '<div class="pv-chips-title">' + 'Idioms' + ':</div>' +
                '<div class="pv-chips-list" id="id-chips-list">' + chipsHtml + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._idDragContext.totalGaps = totalGaps;
    },

    _idDragNextConv: function() {
      var ctx = this._idDragContext;
      if (!ctx) return;
      ctx.currentConvIdx++;
      this._idDragRenderConv(ctx.container, ctx.catMeta, ctx.levelId, ctx.lessonId, ctx.lessonTitle, ctx.pointIndex);
    },

    _idDragStart: function(event, chipId) {
      event.dataTransfer.setData('text/plain', String(chipId));
      this._idSelectedChip = chipId;
      var chip = document.getElementById('id-chip-' + chipId);
      if (chip) chip.classList.add('pv-chip-dragging');
    },

    _idDrop: function(event, gapId) {
      event.preventDefault();
      var chipId = parseInt(event.dataTransfer.getData('text/plain'));
      this._idFillGap(gapId, chipId);
    },

    _idChipClick: function(chipId) {
      if (this._idSelectedChip === chipId) {
        this._idSelectedChip = null;
        document.querySelectorAll('.pv-chip').forEach(function(c) { c.classList.remove('pv-chip-selected'); });
        return;
      }
      document.querySelectorAll('.pv-chip').forEach(function(c) { c.classList.remove('pv-chip-selected', 'pv-chip-dragging'); });
      this._idSelectedChip = chipId;
      var chip = document.getElementById('id-chip-' + chipId);
      if (chip) chip.classList.add('pv-chip-selected');
    },

    _idGapClick: function(gapId) {
      if (this._idSelectedChip !== null && this._idSelectedChip !== undefined) {
        this._idFillGap(gapId, this._idSelectedChip);
        this._idSelectedChip = null;
        document.querySelectorAll('.pv-chip').forEach(function(c) { c.classList.remove('pv-chip-selected', 'pv-chip-dragging'); });
      }
    },

    _idFillGap: function(gapId, chipId) {
      var gap = document.getElementById(gapId);
      var chip = document.getElementById('id-chip-' + chipId);
      if (!gap || !chip || chip.classList.contains('pv-chip-used')) return;
      if (gap.getAttribute('data-filled') === 'true') return;

      var verbFromChip = chip.getAttribute('data-verb');
      var correctVerb = gap.getAttribute('data-verb');
      var normChip = verbFromChip.trim().toLowerCase();
      var normGap  = correctVerb.trim().toLowerCase();
      var isCorrect = normChip === normGap;

      var displayText = isCorrect ? (gap.getAttribute('data-display') || verbFromChip) : verbFromChip;
      gap.setAttribute('data-filled', 'true');
      gap.innerHTML = '<span class="pv-drop-filled ' + (isCorrect ? 'pv-drop-correct' : 'pv-drop-wrong') + '">' + this._escapeHTML(displayText) + '</span>';
      if (!isCorrect) {
        gap.setAttribute('data-filled', 'false');
        var self = this;
        setTimeout(function() {
          gap.innerHTML = '<span class="pv-drop-placeholder">_____</span>';
          gap.setAttribute('data-filled', 'false');
        }, 1200);
        return;
      }

      chip.classList.add('pv-chip-used');
      chip.draggable = false;

      var panel = document.getElementById('id-chips-panel');
      if (panel) {
        var total = parseInt(panel.getAttribute('data-total-gaps'));
        var filled = parseInt(panel.getAttribute('data-filled')) + 1;
        panel.setAttribute('data-filled', filled);
        if (filled >= total) {
          var ctx = this._idDragContext;
          var convs = ctx && ctx.convs;
          var isLastConv = !convs || (ctx.currentConvIdx + 1 >= convs.length);
          if (ctx && isLastConv) this._markPointComplete(ctx.categoryId, ctx.levelId, ctx.lessonId, ctx.pointIndex);
          var result = document.getElementById('id-drag-result');
          var resultText = document.getElementById('id-drag-result-text');
          if (result && resultText) {
            resultText.textContent = 'All correct! Well done!';
            result.style.display = 'flex';
          }
          if (isLastConv && typeof StreakManager !== 'undefined') StreakManager.recordActivity();
        }
      }
    },

    // ── IDIOMS: QUIZ (Point 5) ─────────────────────────────────────────────
    _renderIdQuiz: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
      var quizExercises = (lessonData && lessonData.quizExercises) || [];

      if (quizExercises.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      // Flatten quiz exercises: expand match-meaning into individual pairs
      var questions = [];
      quizExercises.forEach(function(ex) {
        if (ex.type === 'match-meaning') {
          // Convert to a multiple-choice question: for each idiom, choose the meaning
          (ex.pairs || []).forEach(function(pair, pi) {
            var distractorMeanings = (ex.pairs || []).filter(function(p, i) { return i !== pi; }).map(function(p) { return p.meaning; });
            var opts = [pair.meaning].concat(distractorMeanings.sort(function() { return Math.random() - 0.5; }).slice(0, 3)).sort(function() { return Math.random() - 0.5; });
            questions.push({
              type: 'match-meaning',
              sentence: 'What does "' + pair.idiom + '" mean?',
              options: opts,
              correct: pair.meaning,
              explanation: '"' + pair.idiom + '" means: ' + pair.meaning
            });
          });
        } else if (ex.type === 'complete-sentence') {
          var csOpts = (ex.options || []).slice().sort(function() { return Math.random() - 0.5; });
          questions.push({
            type: 'complete-sentence',
            sentence: ex.sentence,
            options: csOpts,
            correct: ex.correct,
            explanation: ex.explanation || ''
          });
        } else if (ex.type === 'select-situation') {
          var ssCorrect = typeof ex.correct === 'number' ? (ex.options || [])[ex.correct] : ex.correct;
          var ssOpts = (ex.options || []).slice().sort(function() { return Math.random() - 0.5; });
          questions.push({
            type: 'select-situation',
            sentence: (ex.question || ('In which situation would you use "' + (ex.idiom || '') + '"?')),
            options: ssOpts,
            correct: ssCorrect,
            explanation: ex.explanation || ''
          });
        }
      });

      if (questions.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      var questionsHtml = '';
      questions.forEach(function(q, qi) {
        var qTypeLabel = '';
        if (q.type === 'match-meaning') qTypeLabel = '<span class="id-quiz-type-badge id-quiz-type-match">' + _mi('swap_horiz') + ' Match Meaning</span>';
        else if (q.type === 'complete-sentence') qTypeLabel = '<span class="id-quiz-type-badge id-quiz-type-complete">' + _mi('edit') + ' Complete</span>';
        else if (q.type === 'select-situation') qTypeLabel = '<span class="id-quiz-type-badge id-quiz-type-situation">' + _mi('psychology') + ' Situation</span>';

        var optHtml = '';
        (q.options || []).forEach(function(opt) {
          optHtml += '<button class="fe-quiz-option" data-question="id-qz' + qi + '" data-answer="' + self._escapeHTML(opt) + '" onclick="FastExercises._answerIdQuiz(this,' + qi + ',\'' + self._jsStr(q.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')">' + self._escapeHTML(opt) + '</button>';
        });

        questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
          '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + questions.length + ' ' + qTypeLabel + '</div>' +
          '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(q.sentence || '') + '</div>' +
          '<div class="fe-quiz-options">' + optHtml + '</div>' +
          '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
        '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
              '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + questions.length + '" data-answered="0" data-correct="0">' +
                questionsHtml +
              '</div>' +
              '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
                '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._showQuizQuestion(0);
    },

    _answerIdQuiz: function(btn, qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var chosen = btn.getAttribute('data-answer');
      var isCorrect = chosen.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      var buttons = document.querySelectorAll('[data-question="id-qz' + qIndex + '"]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (buttons[i].getAttribute('data-answer').trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          buttons[i].classList.add('fe-quiz-correct');
        }
        if (buttons[i] === btn && !isCorrect) {
          buttons[i].classList.add('fe-quiz-wrong');
        }
      }
      this._processPvFillInAnswer(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex);
    },

    // ── PV SIDEBAR BUILDER ───────────────────────────────────────────────
    _buildPvSidebarHtml: function(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;

      var pvIconMap = {
        'pv-gallery':           'collections_bookmark',
        'pv-fill-in':           'edit',
        'pv-conversations':     'forum',
        'pv-conversation-drag': 'drag_indicator',
        'pv-mixed':             'shuffle',
        'wf-explanation':       'school',
        'wf-multiple-choice':   'rule',
        'wf-transform':         'transform',
        'id-gallery':           'collections_bookmark',
        'id-fill-in':           'edit',
        'id-conversations':     'forum',
        'id-conversation-drag': 'drag_indicator',
        'id-quiz':              'quiz',
        'id-trophy':            'emoji_events'
      };

      var pvDescriptions = {
        'pv-gallery':           'Read and learn the phrasal verbs for this lesson.',
        'pv-fill-in':           'Choose or write the correct phrasal verb for each sentence.',
        'pv-conversations':     'Read the conversations. Tap highlighted verbs to see their definition.',
        'pv-conversation-drag': 'Drag each phrasal verb to the correct gap in the conversation.',
        'pv-mixed':             'Mixed practice: test yourself with questions from the whole lesson.',
        'wf-explanation':       'Learn the transformation rule with examples and word cards.',
        'wf-multiple-choice':   'Choose the correct derived form for each sentence.',
        'wf-transform':         'Write the correct form of the root word in CAPITALS.',
        'id-gallery':           'Read and learn the idioms for this lesson.',
        'id-fill-in':           'Choose the correct idiom to complete each sentence.',
        'id-conversations':     'Read the conversations. Click highlighted idioms to see their meaning.',
        'id-conversation-drag': 'Drag each idiom to the correct gap in the conversation.',
        'id-quiz':              'Quiz: test yourself with different question types.',
        'id-trophy':            'Congratulations! You have completed this level.'
      };

      var dotsHtml = '';
      if (lessonPoints && lessonPoints.length > 0) {
        lessonPoints.forEach(function(pt, pi) {
          var isDone   = self._isPointComplete(catMeta.id, levelId, lessonId, pi);
          var isActive = (pi === pointIndex);

          // pv-mixed / id-quiz locked until all previous points are done
          var isAccessible = true;
          if ((pt.type === 'pv-mixed' || pt.type === 'id-quiz') && pi === lessonPoints.length - 1) {
            for (var prev = 0; prev < pi; prev++) {
              if (!self._isPointComplete(catMeta.id, levelId, lessonId, prev)) {
                isAccessible = false;
                break;
              }
            }
          }

          var icon = isDone ? 'check' : (pvIconMap[pt.type] || 'circle');
          var cls = 'pv-sidebar-point-dot';
          if (isActive)          cls += ' pv-sidebar-point-active';
          else if (isDone)       cls += ' pv-sidebar-point-done';
          else if (!isAccessible) cls += ' pv-sidebar-point-locked';

          var onclick = '';
          if (!isActive && (isDone || isAccessible)) {
            onclick = 'onclick="FastExercises.openPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pi + ')"';
          }

          // Use the category color for the active dot
          var style = isActive ? 'style="--dot-color:' + catMeta.color + '"' : '';

          if (pi > 0) {
            dotsHtml += '<div class="pv-sidebar-connector"></div>';
          }
          dotsHtml += '<div class="' + cls + '" ' + onclick + ' ' + style + ' title="' + self._escapeHTML(pt.label || '') + '">' +
            '<span class="material-symbols-outlined">' + icon + '</span>' +
          '</div>';
        });
      }

      var currentPointType = (lessonPoints && lessonPoints[pointIndex]) ? lessonPoints[pointIndex].type : '';
      var exerciseDesc = pvDescriptions[currentPointType] || '';

      return '<div class="pv-point-sidebar" id="pv-point-sidebar">' +
        '<div class="pv-sidebar-top-row">' +
          '<button class="subpage-back-btn pv-sidebar-back" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' +
            'Back' +
          '</button>' +
          '<button class="pv-sidebar-collapse-btn" id="pv-sidebar-toggle" title="' + 'Collapse' + '" onclick="FastExercises._pvToggleSidebar()">' +
            '<span class="material-symbols-outlined pv-sidebar-toggle-icon">chevron_left</span>' +
          '</button>' +
        '</div>' +
        '<button class="pv-sidebar-exit-btn" title="' + 'Back' + '" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="pv-sidebar-content" id="pv-sidebar-content">' +
          '<div class="pv-sidebar-lesson-info">' +
            '<div class="pv-sidebar-lesson-info-header">' +
              '<div class="pv-sidebar-lesson-info-text">' +
                '<div class="pv-sidebar-lesson-name">' + self._escapeHTML(lessonTitle || '') + '</div>' +
                '<div class="pv-sidebar-level-label">' + self._escapeHTML(levelId || '') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="pv-sidebar-points">' + dotsHtml + '</div>' +
          (exerciseDesc ? '<div class="pv-sidebar-exercise-desc">' + exerciseDesc + '</div>' : '') +
        '</div>' +
      '</div>';
    },

    _pvToggleSidebar: function() {
      var sidebar = document.getElementById('pv-point-sidebar');
      var icon = document.querySelector('#pv-sidebar-toggle .pv-sidebar-toggle-icon');
      if (!sidebar) return;
      var isCollapsed = sidebar.classList.contains('pv-sidebar-collapsed');
      sidebar.classList.toggle('pv-sidebar-collapsed', !isCollapsed);
      if (icon) icon.textContent = isCollapsed ? 'chevron_left' : 'chevron_right';
    },

    // ── VOCABULARY SIDEBAR ───────────────────────────────────────────────
    _buildVocabSidebarHtml: function(catMeta, levelId, lessonId, levelsData, mode) {
      var self = this;
      var color = catMeta ? catMeta.color : '#10b981';

      // Find lessons for the current level
      var level = null;
      if (levelsData && levelsData.levels) {
        for (var i = 0; i < levelsData.levels.length; i++) {
          if (levelsData.levels[i].id === levelId) { level = levelsData.levels[i]; break; }
        }
      }

      var lessonsHtml = '';
      if (level && level.lessons && level.lessons.length > 0) {
        level.lessons.forEach(function(lesson) {
          var isActive = (lesson.id === lessonId);
          var streaks = self._getVocabStreaks(levelId, lesson.id);
          var hasProgress = Object.keys(streaks).some(function(w) { return (streaks[w] || 0) > 0; });
          var cls = 'vocab-fc-sidebar-lesson' + (isActive ? ' vocab-fc-sidebar-lesson-active' : '') + (hasProgress ? ' vocab-fc-sidebar-lesson-progress' : '');
          var onclick = isActive ? '' : ('onclick="FastExercises._openVocabSession(\'' + self._jsStr(levelId) + '\',\'' + self._jsStr(lesson.id) + '\',\'' + (mode || 'learn') + '\')"');
          lessonsHtml +=
            '<div class="' + cls + '" ' + onclick + '>' +
              '<span class="material-symbols-outlined vocab-fc-sidebar-lesson-icon">' + (isActive ? 'radio_button_checked' : (hasProgress ? 'check_circle' : 'radio_button_unchecked')) + '</span>' +
              '<span class="vocab-fc-sidebar-lesson-title">' + self._escapeHTML(lesson.title || lesson.id) + '</span>' +
            '</div>';
        });
      }

      return '<div class="pv-point-sidebar vocab-fc-sidebar-right" id="vocab-fc-sidebar">' +
        '<div class="pv-sidebar-top-row">' +
          '<button class="subpage-back-btn pv-sidebar-back" onclick="FastExercises.openCategory(\'' + self._jsStr(catMeta.id) + '\')">' +
            'Back' +
          '</button>' +
          '<button class="pv-sidebar-collapse-btn" id="vocab-fc-sidebar-toggle" title="Collapse" onclick="FastExercises._vocabToggleSidebar()">' +
            '<span class="material-symbols-outlined pv-sidebar-toggle-icon">chevron_right</span>' +
          '</button>' +
        '</div>' +
        '<button class="pv-sidebar-exit-btn" title="Back" onclick="FastExercises.openCategory(\'' + self._jsStr(catMeta.id) + '\')">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="pv-sidebar-content" id="vocab-fc-sidebar-content">' +
          '<div class="pv-sidebar-lesson-info">' +
            '<div class="pv-sidebar-lesson-name">' + self._escapeHTML(levelId) + ' Vocabulary</div>' +
            '<div class="pv-sidebar-level-label">' + (mode === 'review' ? 'Review' : 'Learn') + ' mode</div>' +
          '</div>' +
          '<div class="vocab-fc-sidebar-lessons">' + lessonsHtml + '</div>' +
        '</div>' +
      '</div>';
    },

    _vocabToggleSidebar: function() {
      var sidebar = document.getElementById('vocab-fc-sidebar');
      var icon = document.querySelector('#vocab-fc-sidebar-toggle .pv-sidebar-toggle-icon');
      if (!sidebar) return;
      var isCollapsed = sidebar.classList.contains('pv-sidebar-collapsed');
      sidebar.classList.toggle('pv-sidebar-collapsed', !isCollapsed);
      if (icon) icon.textContent = isCollapsed ? 'chevron_right' : 'chevron_left';
    },

    _showPvLessonInfoModal: function(lessonTitle, levelId) {
      var self = this;
      // Toggle: if already open, clicking the info button closes it
      var existing = document.getElementById('pv-lesson-info-modal');
      if (existing) { existing.remove(); return; }

      var pvs = (this._currentLessonData && this._currentLessonData.phrasalVerbs) || [];
      var verbsHtml = '';
      pvs.forEach(function(pv) {
        verbsHtml +=
          '<div class="pv-lesson-info-verb">' +
            '<strong>' + self._escapeHTML(pv.verb) + '</strong>' +
            '<span>' + self._escapeHTML(pv.definition || '') + '</span>' +
          '</div>';
      });

      var modal = document.createElement('div');
      modal.id = 'pv-lesson-info-modal';
      modal.className = 'pv-info-modal-overlay';
      modal.innerHTML =
        '<div class="pv-info-modal-box">' +
          '<div class="pv-info-modal-header">' +
            '<span class="pv-info-modal-icon"><span class="material-symbols-outlined">school</span></span>' +
            '<h2 class="pv-info-modal-title">' + self._escapeHTML(lessonTitle || '') + '</h2>' +
            '<button class="pv-info-modal-close" onclick="document.getElementById(\'pv-lesson-info-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="pv-info-modal-body">' +
            '<p class="pv-lesson-info-level"><span class="material-symbols-outlined">label</span> ' + self._escapeHTML(levelId || '') + '</p>' +
            (verbsHtml ? '<div class="pv-lesson-info-verbs">' + verbsHtml + '</div>' : '') +
          '</div>' +
          '<div class="pv-info-modal-footer">' +
            '<button class="pv-info-modal-btn" onclick="document.getElementById(\'pv-lesson-info-modal\').remove()">' + 'Got it!' + '</button>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
      document.body.appendChild(modal);
    },

    // ── PV GALLERY (Point 1) ─────────────────────────────────────────────
    _renderPvGallery: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
      var pvs = (lessonData && lessonData.phrasalVerbs) || [];

      if (pvs.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
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
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
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
                'Got it! Next' + '' +
              '</button>' +
            '</div>' +
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
    _renderPvFillIn: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
      var exercises = (lessonData && lessonData.fillInExercises) || [];

      if (exercises.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
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
            '<input type="text" class="pv-write-input" id="pv-write-' + qi + '" placeholder="' + 'Type the verb…' + '" />' +
            '<button class="pv-write-btn" onclick="FastExercises._checkPvWriteVerb(' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Check' + '</button>' +
          '</div>';
        }

        questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
          '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + exercises.length + '</div>' +
          '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(ex.sentence || '') + '</div>' +
          inputHtml +
          '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
        '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
              '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + exercises.length + '" data-answered="0" data-correct="0">' +
                questionsHtml +
              '</div>' +
              '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
                '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>' +
              '</div>' +
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
      var self = this;
      var feedbackEl = document.getElementById('fe-quiz-feedback-' + qIndex);
      var questionsContainer = document.getElementById('fe-quiz-questions');

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.innerHTML = _mi('check_circle') + ' ' + 'Correct' + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.innerHTML = _mi('cancel') + ' ' + 'The correct answer is' + ' <strong>' + self._escapeHTML(correctAnswer) + '</strong>';
        }
        feedbackEl.style.display = 'flex';
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
            completeText.textContent = correct + '/' + total + ' ' + 'correct' + '!';
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
    _renderPvConversations: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      var convs = (lessonData && lessonData.conversations) || [];

      // Store lesson data and phrasal verbs for popup lookup
      this._currentLessonData = lessonData;
      this._currentPvVerbs = (lessonData && lessonData.phrasalVerbs) || [];

      if (convs.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      var totalConvs = convs.length;
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
        var numHtml = totalConvs > 1 ? '<span class="pv-conv-num">' + (ci + 1) + '/' + totalConvs + '</span>' : '';
        convsHtml += '<div class="pv-conv-block pv-conv-slide' + (ci === 0 ? ' pv-conv-slide-active' : '') + '" data-idx="' + ci + '">' +
          '<div class="pv-conv-title"><span class="material-symbols-outlined">forum</span><span class="pv-conv-title-text">' + self._escapeHTML(conv.title || '') + '</span>' + numHtml + '</div>' +
          '<div class="pv-conv-dialogue">' + linesHtml + '</div>' +
        '</div>';
      });

      // Nav dots for conversations
      var convDotsHtml = '';
      convs.forEach(function(conv, ci) {
        convDotsHtml += '<div class="pv-gallery-nav-dot' + (ci === 0 ? ' pv-gallery-nav-dot-active' : '') + '" data-idx="' + ci + '" title="' + self._escapeHTML(conv.title || ('Conversation ' + (ci + 1))) + '" onclick="FastExercises._pvConvGoTo(' + ci + ')"></div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="pv-gallery-single-wrap">' +
              '<div class="pv-conversations-slides" id="pv-conv-slides">' +
                convsHtml +
              '</div>' +
              '<div class="pv-gallery-nav-col" id="pv-conv-nav">' +
                convDotsHtml +
              '</div>' +
            '</div>' +
            '<div class="pv-conv-footer">' +
              '<p class="pv-conv-hint"><span class="material-symbols-outlined">info</span> ' + 'Phrasal verbs are highlighted in bold. Click a highlighted verb to see its definition.' + '</p>' +
              '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                'Ready! Next' +
              '</button>' +
            '</div>' +
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
    _renderPvConversationDrag: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
      var convs = (lessonData && lessonData.conversations) || [];
      var pvs = (lessonData && lessonData.phrasalVerbs) || [];

      if (convs.length === 0 || pvs.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      // Store full context including all conversations
      this._pvDragContext = {
        categoryId: catMeta.id, levelId: levelId, lessonId: lessonId,
        pointIndex: pointIndex, catColor: catMeta.color,
        convs: convs, currentConvIdx: 0, container: container,
        lessonTitle: lessonTitle, catMeta: catMeta, lessonData: lessonData,
        lessonPoints: lessonPoints
      };

      // Render the first conversation
      this._pvDragRenderConv(container, catMeta, levelId, lessonId, lessonTitle, pointIndex);
    },

    _pvDragRenderConv: function(container, catMeta, levelId, lessonId, lessonTitle, pointIndex) {
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

      var numHtml = totalConvs > 1 ? '<span class="pv-conv-num">' + (convIdx + 1) + '/' + totalConvs + '</span>' : '';

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, ctx.lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="pv-drag-container">' +
              '<div class="pv-drag-main">' +
                '<div class="pv-conv-block">' +
                  '<div class="pv-conv-title">' + _mi('forum') + '<span class="pv-conv-title-text">' + self._escapeHTML(conv.title || '') + '</span>' + numHtml + '</div>' +
                  '<div class="pv-conv-dialogue">' + linesHtml + '</div>' +
                '</div>' +
                '<div class="pv-drag-result" id="pv-drag-result" style="display:none;">' +
                  '<div class="pv-drag-result-icon">' + _mi('celebration') + '</div>' +
                  '<div class="pv-drag-result-text" id="pv-drag-result-text"></div>' +
                  (convIdx + 1 < totalConvs
                    ? '<button class="fe-point-next-btn" onclick="FastExercises._pvDragNextConv()" style="background:' + catMeta.color + '">' + 'Next Conversation' + '</button>'
                    : '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>'
                  ) +
                '</div>' +
              '</div>' +
              '<div class="pv-chips-panel" id="pv-chips-panel" data-total-gaps="' + totalGaps + '" data-filled="0">' +
                '<div class="pv-chips-title">' + 'Phrasal Verbs' + ':</div>' +
                '<div class="pv-chips-list" id="pv-chips-list">' + chipsHtml + '</div>' +
              '</div>' +
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
            resultText.textContent = 'All correct! Well done!';
            result.style.display = 'flex';
          }
          if (isLastConv && typeof StreakManager !== 'undefined') StreakManager.recordActivity();
        }
      }
    },

    // ── PV MIXED PRACTICE (Point 5) ──────────────────────────────────────
    _renderPvMixed: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      this._currentLessonData = lessonData;
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
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
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
              '<input type="text" class="pv-write-input" id="pv-mx-write-' + qi + '" placeholder="' + 'Type the verb…' + '" />' +
              '<button class="pv-write-btn" onclick="FastExercises._checkPvMixedWrite(' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Check' + '</button>' +
            '</div>';
          }
          questionsHtml += '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
            '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + mixed.length + '</div>' +
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
            '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + mixed.length + '</div>' +
            '<div class="pv-mx-conv-label">' + _mi('forum') + ' ' + self._escapeHTML(ds.speaker || '') + ':</div>' +
            '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(ds.sentence || '') + '</div>' +
            '<div class="fe-quiz-options">' + optHtml + '</div>' +
            '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
          '</div>';
        }
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
              '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + mixed.length + '" data-answered="0" data-correct="0">' +
                questionsHtml +
              '</div>' +
              '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
                '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>' +
              '</div>' +
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
      var self = this;
      var feedbackEl = document.getElementById('fe-quiz-feedback-' + qIndex);
      var questionsContainer = document.getElementById('fe-quiz-questions');

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.innerHTML = _mi('check_circle') + ' ' + 'Correct' + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong';
          feedbackEl.innerHTML = _mi('cancel') + ' ' + 'The correct answer is' + ' <strong>' + self._escapeHTML(correctAnswer) + '</strong>';
        }
        feedbackEl.style.display = 'flex';
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
            completeText.textContent = correct + '/' + total + ' ' + 'correct' + '!';
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
    // ── WORD FORMATION: EXPLANATION (Point 1) ────────────────────────────
    _renderWfExplanation: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      var explanation = (lessonData && lessonData.explanation) || {};
      var wordForms = (lessonData && lessonData.wordForms) || [];
      var groups = explanation.groups || [];

      // Build rule header
      var ruleHtml = '';
      if (explanation.rule) {
        ruleHtml = '<div class="wf-exp-rule">' + self._escapeHTML(explanation.rule) + '</div>';
      }

      // Build suffix groups
      var groupsHtml = '';
      groups.forEach(function(group) {
        var examplesHtml = '';
        (group.examples || []).forEach(function(ex) {
          examplesHtml +=
            '<div class="wf-exp-example">' +
              '<span class="wf-exp-base">' + self._escapeHTML(ex.base) + '</span>' +
              '<span class="wf-exp-arrow">→</span>' +
              '<span class="wf-exp-derived" style="color:' + catMeta.color + '">' + self._escapeHTML(ex.derived) + '</span>' +
              '<span class="wf-exp-def">' + self._escapeHTML(ex.definition || '') + '</span>' +
            '</div>';
        });
        groupsHtml +=
          '<div class="wf-exp-group">' +
            '<div class="wf-exp-suffix" style="background:' + catMeta.color + '">' + self._escapeHTML(group.suffix || '') + '</div>' +
            (group.note ? '<div class="wf-exp-note">' + self._escapeHTML(group.note) + '</div>' : '') +
            '<div class="wf-exp-examples">' + examplesHtml + '</div>' +
          '</div>';
      });

      // Build word forms cards
      var cardsHtml = '';
      wordForms.forEach(function(wf, idx) {
        cardsHtml +=
          '<div class="wf-card' + (idx === 0 ? ' wf-card-active' : '') + '" data-idx="' + idx + '" style="--cat-color:' + catMeta.color + '">' +
            '<div class="wf-card-badge">' + self._escapeHTML(wf.type || '') + '</div>' +
            '<div class="wf-card-pair">' +
              '<span class="wf-card-base">' + self._escapeHTML(wf.base || '') + '</span>' +
              '<span class="wf-card-arrow">→</span>' +
              '<span class="wf-card-derived" style="color:' + catMeta.color + '">' + self._escapeHTML(wf.derived || '') + '</span>' +
            '</div>' +
            '<div class="wf-card-definition">' + self._escapeHTML(wf.definition || '') + '</div>' +
            (wf.example ? '<div class="wf-card-example">&ldquo;' + self._escapeHTML(wf.example) + '&rdquo;</div>' : '') +
            '<div class="wf-card-num">' + (idx + 1) + ' / ' + wordForms.length + '</div>' +
          '</div>';
      });

      var dotsHtml = '';
      wordForms.forEach(function(wf, idx) {
        dotsHtml += '<div class="pv-gallery-nav-dot' + (idx === 0 ? ' pv-gallery-nav-dot-active' : '') + '" data-idx="' + idx + '" title="' + self._escapeHTML(wf.base + ' → ' + wf.derived) + '" onclick="FastExercises._wfCardGoTo(' + idx + ')"></div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="wf-explanation-wrap">' +
              (groups.length > 0 ?
                '<div class="wf-exp-panel">' + ruleHtml + groupsHtml + '</div>' : '') +
              (wordForms.length > 0 ?
                '<div class="pv-gallery-single-wrap">' +
                  '<div class="pv-gallery-cards-area" id="wf-gallery-cards">' + cardsHtml + '</div>' +
                  '<div class="pv-gallery-nav-col" id="wf-gallery-nav">' + dotsHtml + '</div>' +
                '</div>' : '') +
            '</div>' +
            '<div class="pv-gallery-footer">' +
              '<button class="fe-point-next-btn" onclick="FastExercises._completeAndNext(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' +
                'Got it! Next' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      // Attach wheel scroll handler
      var cardsArea = document.getElementById('wf-gallery-cards');
      if (cardsArea) {
        cardsArea.addEventListener('wheel', function(e) {
          e.preventDefault();
          var current = FastExercises._wfCardCurrentIdx || 0;
          if (e.deltaY > 0) FastExercises._wfCardGoTo(current + 1);
          else FastExercises._wfCardGoTo(current - 1);
        }, { passive: false });
      }
      this._wfCardCurrentIdx = 0;
      this._wfCardTotal = wordForms.length;
    },

    _wfCardGoTo: function(idx) {
      var total = this._wfCardTotal || 0;
      if (total === 0) return;
      idx = Math.max(0, Math.min(total - 1, idx));
      this._wfCardCurrentIdx = idx;
      var cards = document.querySelectorAll('.wf-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('wf-card-active', parseInt(cards[i].getAttribute('data-idx'), 10) === idx);
      }
      var dots = document.querySelectorAll('#wf-gallery-nav .pv-gallery-nav-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('pv-gallery-nav-dot-active', parseInt(dots[i].getAttribute('data-idx'), 10) === idx);
      }
    },

    // ── WORD FORMATION: MULTIPLE CHOICE (Point 2) ────────────────────────
    _renderWfMultipleChoice: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      var exercises = (lessonData && lessonData.multipleChoiceExercises) || [];

      if (exercises.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      var questionsHtml = '';
      exercises.forEach(function(ex, qi) {
        var optHtml = '';
        var shuffledOpts = (ex.options || []).slice().sort(function() { return Math.random() - 0.5; });
        shuffledOpts.forEach(function(opt) {
          optHtml += '<button class="fe-quiz-option" data-question="wfmc' + qi + '" data-answer="' + self._escapeHTML(opt) + '" onclick="FastExercises._answerWfMC(this,' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')">' + self._escapeHTML(opt) + '</button>';
        });
        questionsHtml +=
          '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
            '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + exercises.length + '</div>' +
            '<div class="wf-mc-root-label">' + _mi('text_fields') + ' ' + 'Root word: ' + '<strong>' + self._escapeHTML(ex.root || '') + '</strong></div>' +
            '<div class="fe-quiz-sentence pv-fillin-sentence">' + self._escapeHTML(ex.sentence || '') + '</div>' +
            '<div class="fe-quiz-options">' + optHtml + '</div>' +
            '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
          '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
              '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + exercises.length + '" data-answered="0" data-correct="0">' +
                questionsHtml +
              '</div>' +
              '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
                '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._showQuizQuestion(0);
    },

    _answerWfMC: function(btn, qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var chosen = btn.getAttribute('data-answer');
      var isCorrect = chosen.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      this._processPvFillInAnswer(qIndex, isCorrect, correctAnswer, categoryId, levelId, lessonId, pointIndex);
      var buttons = document.querySelectorAll('[data-question="wfmc' + qIndex + '"]');
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

    // ── WORD FORMATION: TRANSFORM (Point 3) ─────────────────────────────
    _renderWfTransform: function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      var exercises = (lessonData && lessonData.transformExercises) || [];

      if (exercises.length === 0) {
        this._markPointComplete(catMeta.id, levelId, lessonId, pointIndex);
        container.innerHTML = '<div class="fe-point-view"><div class="fe-point-card"><div class="fe-point-message">' + 'Content coming soon!' + '</div><button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button></div></div>';
        return;
      }

      var questionsHtml = '';
      exercises.forEach(function(ex, qi) {
        questionsHtml +=
          '<div class="fe-quiz-question" id="fe-quiz-q-' + qi + '">' +
            '<div class="fe-quiz-num">' + 'Question' + ' ' + (qi + 1) + '/' + exercises.length + '</div>' +
            '<div class="wf-transform-sentence">' + self._escapeHTML((ex.sentence || '').replace(/\s*\([A-Z]+\)\s*$/, '')) + '</div>' +
            '<div class="wf-transform-root-row">' +
              _mi('text_fields') + ' ' +
              '<span class="wf-transform-root-word">' + self._escapeHTML(ex.root || '') + '</span>' +
            '</div>' +
            '<div class="pv-write-row">' +
              '<input type="text" class="pv-write-input wf-transform-input" id="wf-tr-' + qi + '" placeholder="' + 'Type the correct form…' + '" />' +
              '<button class="pv-write-btn" onclick="FastExercises._checkWfTransform(' + qi + ',\'' + self._jsStr(ex.correct) + '\',\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Check' + '</button>' +
            '</div>' +
            '<div class="fe-quiz-feedback" id="fe-quiz-feedback-' + qi + '"></div>' +
          '</div>';
      });

      container.innerHTML =
        '<div class="fe-point-view pv-point-layout">' +
          this._buildPvSidebarHtml(catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) +
          '<div class="pv-point-main">' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="wf-transform-header">' +
                _mi('transform') + ' <span>' + 'Word Transformation' + '</span>' +
                '<span class="wf-transform-hint">' + 'Write the correct form of the word in CAPITALS' + '</span>' +
              '</div>' +
              '<div class="fe-quiz-progress-bar"><div class="fe-quiz-progress-fill" id="fe-quiz-progress-fill" style="background:' + catMeta.color + '"></div></div>' +
              '<div class="fe-quiz-questions" id="fe-quiz-questions" data-total="' + exercises.length + '" data-answered="0" data-correct="0">' +
                questionsHtml +
              '</div>' +
              '<div class="fe-quiz-complete-section" id="fe-quiz-complete" style="display:none;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('celebration') + '</div>' +
                '<div class="fe-quiz-complete-text" id="fe-quiz-complete-text"></div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises._nextPoint(\'' + catMeta.id + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')" style="background:' + catMeta.color + '">' + 'Next' + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      this._showQuizQuestion(0);

      // Allow Enter key in inputs
      var inputs = container.querySelectorAll('.wf-transform-input');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            var btn = e.target.parentElement && e.target.parentElement.querySelector('.pv-write-btn');
            if (btn && !btn.disabled) btn.click();
          }
        });
      }
    },

    _checkWfTransform: function(qIndex, correctAnswer, categoryId, levelId, lessonId, pointIndex) {
      var input = document.getElementById('wf-tr-' + qIndex);
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

    // ── WORD FORMATION INFO MODAL ────────────────────────────────────────
    _showWfInfoModal: function() {
      var existing = document.getElementById('wf-info-modal');
      if (existing) { existing.remove(); return; }

      var modal = document.createElement('div');
      modal.id = 'wf-info-modal';
      modal.className = 'pv-info-modal-overlay';
      modal.innerHTML =
        '<div class="pv-info-modal-box">' +
          '<div class="pv-info-modal-header">' +
            '<span class="pv-info-modal-icon"><span class="material-symbols-outlined">text_fields</span></span>' +
            '<h2 class="pv-info-modal-title">What is Word Formation?</h2>' +
            '<button class="pv-info-modal-close" onclick="document.getElementById(\'wf-info-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="pv-info-modal-body">' +
            '<p><strong>What is word formation?</strong></p>' +
            '<p>Word formation is the process of creating new words by adding prefixes or suffixes to a base (root) word, or by combining words.</p>' +
            '<p><strong>For example:</strong></p>' +
            '<ul class="pv-info-list">' +
              '<li><em>act</em> → <em>action</em> (suffix <strong>-ion</strong>)</li>' +
              '<li><em>happy</em> → <em>unhappy</em> (prefix <strong>un-</strong>)</li>' +
              '<li><em>use</em> → <em>useful</em> → <em>usefulness</em> (multiple suffixes)</li>' +
            '</ul>' +
            '<p><strong>Why is it important?</strong></p>' +
            '<p>Word formation is a key part of Cambridge exams (B1 Preliminary, B2 First, C1 Advanced). It tests your ability to transform words to fit a sentence grammatically and meaningfully.</p>' +
            '<p><strong>Tip 💡</strong></p>' +
            '<p>Learn root words together with their most common derivatives. Pay attention to whether you need a noun, adjective, verb or adverb in context.</p>' +
            '<p><button class="wf-info-dict-link" onclick="FastExercises._showWfDictionary(); document.getElementById(\'wf-info-modal\').remove();">' + _mi('search') + ' Open the Word Formation Dictionary</button></p>' +
          '</div>' +
          '<div class="pv-info-modal-footer">' +
            '<button class="pv-info-modal-btn" onclick="document.getElementById(\'wf-info-modal\').remove()" style="background:#e11d48">Got it!</button>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);
    },

    // ── WORD FORMATION DICTIONARY ─────────────────────────────────────────
    _wfDictCache: null,

    _showWfDictionary: async function() {
      var existing = document.getElementById('wf-dict-modal');
      if (existing) { existing.remove(); return; }

      // Load dictionary data
      if (!this._wfDictCache) {
        try {
          var r = await fetch('data/word-formation/dictionary.json');
          if (r.ok) this._wfDictCache = await r.json();
        } catch (e) {}
      }
      var entries = (this._wfDictCache && this._wfDictCache.entries) || [];

      var modal = document.createElement('div');
      modal.id = 'wf-dict-modal';
      modal.className = 'wf-dict-overlay';
      modal.innerHTML =
        '<div class="wf-dict-box">' +
          '<div class="wf-dict-header">' +
            '<span class="wf-dict-icon">' + _mi('menu_book') + '</span>' +
            '<h2 class="wf-dict-title">Word Formation Dictionary</h2>' +
            '<button class="wf-dict-close" onclick="document.getElementById(\'wf-dict-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="wf-dict-search-row">' +
            '<span class="wf-dict-search-icon">' + _mi('search') + '</span>' +
            '<input type="text" class="wf-dict-search" id="wf-dict-search" placeholder="Search root word or derived form…" oninput="FastExercises._filterWfDict(this.value)" />' +
            '<select class="wf-dict-level-filter" id="wf-dict-level" onchange="FastExercises._filterWfDict(document.getElementById(\'wf-dict-search\').value)">' +
              '<option value="">All Levels</option>' +
              '<option value="B1">B1</option>' +
              '<option value="B2">B2</option>' +
              '<option value="C1">C1</option>' +
            '</select>' +
            '<select class="wf-dict-type-filter" id="wf-dict-type-filter" onchange="FastExercises._filterWfDict(document.getElementById(\'wf-dict-search\').value)">' +
              '<option value="">All Types</option>' +
              '<option value="noun">Noun</option>' +
              '<option value="verb">Verb</option>' +
              '<option value="adjective">Adjective</option>' +
              '<option value="adverb">Adverb</option>' +
            '</select>' +
          '</div>' +
          '<div class="wf-dict-count" id="wf-dict-count">' + entries.length + ' entries</div>' +
          '<div class="wf-dict-results" id="wf-dict-results"></div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);

      // Store entries for filtering
      this._wfDictEntries = entries;
      this._renderWfDictResults('', '', '');

      // Focus search
      setTimeout(function() {
        var searchEl = document.getElementById('wf-dict-search');
        if (searchEl) searchEl.focus();
      }, 100);
    },

    _filterWfDict: function(query) {
      var levelFilter = (document.getElementById('wf-dict-level') || {}).value || '';
      var typeFilter = (document.getElementById('wf-dict-type-filter') || {}).value || '';
      this._renderWfDictResults(query || '', levelFilter, typeFilter);
    },

    _renderWfDictResults: function(query, levelFilter, typeFilter) {
      var self = this;
      var entries = this._wfDictEntries || [];
      var q = (query || '').toLowerCase().trim();

      var filtered = entries.filter(function(e) {
        var matchLevel = !levelFilter || e.level === levelFilter;
        if (!matchLevel) return false;
        var matchType = !typeFilter || e.wordType === typeFilter;
        if (!matchType) return false;
        if (!q) return true;
        return (e.base || '').toLowerCase().indexOf(q) !== -1 ||
               (e.derived || '').toLowerCase().indexOf(q) !== -1;
      });

      var resultsEl = document.getElementById('wf-dict-results');
      var countEl = document.getElementById('wf-dict-count');
      if (!resultsEl) return;

      if (countEl) countEl.textContent = filtered.length + ' entries' + (q || levelFilter || typeFilter ? ' (filtered)' : '');

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="wf-dict-empty">' + _mi('search_off') + '<p>No results found</p></div>';
        return;
      }

      // Group by base word
      var groups = {};
      var groupOrder = [];
      filtered.forEach(function(e) {
        if (!groups[e.base]) { groups[e.base] = []; groupOrder.push(e.base); }
        groups[e.base].push(e);
      });

      var html = '';
      groupOrder.forEach(function(base) {
        var group = groups[base];
        var derivedHtml = '';
        group.forEach(function(e) {
          var wt = e.wordType || '';
          derivedHtml +=
            '<div class="wf-dict-form">' +
              '<span class="wf-dict-derived">' + self._escapeHTML(e.derived) + '</span>' +
              '<span class="wf-dict-type wf-type-' + self._escapeHTML(wt) + '">' + self._escapeHTML(wt) + '</span>' +
              '<span class="wf-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
              '<span class="wf-dict-level-badge wf-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
            '</div>';
        });
        html +=
          '<div class="wf-dict-entry">' +
            '<div class="wf-dict-base">' + self._escapeHTML(base) + '</div>' +
            '<div class="wf-dict-forms">' + derivedHtml + '</div>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
    },

    // ── COLLOCATIONS INFO MODAL ───────────────────────────────────────────
    _showCollocInfoModal: function() {
      var existing = document.getElementById('colloc-info-modal');
      if (existing) { existing.remove(); return; }

      var modal = document.createElement('div');
      modal.id = 'colloc-info-modal';
      modal.className = 'pv-info-modal-overlay';
      modal.innerHTML =
        '<div class="pv-info-modal-box">' +
          '<div class="pv-info-modal-header">' +
            '<span class="pv-info-modal-icon"><span class="material-symbols-outlined">format_quote</span></span>' +
            '<h2 class="pv-info-modal-title">What are Collocations?</h2>' +
            '<button class="pv-info-modal-close" onclick="document.getElementById(\'colloc-info-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="pv-info-modal-body">' +
            '<p><strong>What are collocations?</strong></p>' +
            '<p>Collocations are words that naturally go together in English. They are combinations of words — phrases and patterns — that native speakers use habitually.</p>' +
            '<p><strong>For example:</strong></p>' +
            '<ul class="pv-info-list">' +
              '<li><em>make</em> a decision (not <em>do</em> a decision)</li>' +
              '<li><em>take</em> into account / <em>give</em> an account of</li>' +
              '<li><em>act</em> on sb\'s advice / <em>act</em> in good faith</li>' +
            '</ul>' +
            '<p><strong>Why is it important?</strong></p>' +
            '<p>Knowing collocations, fixed phrases, and common patterns is essential for Cambridge exams (B1 Preliminary, B2 First, C1 Advanced). They help you sound natural and achieve higher marks in Use of English and Writing.</p>' +
            '<p><strong>Tip 💡</strong></p>' +
            '<p>Learn collocations in context, not in isolation. Notice which verbs go with which nouns, and which prepositions follow key words.</p>' +
            '<p><button class="colloc-info-dict-link" onclick="FastExercises._showCollocDictionary(); document.getElementById(\'colloc-info-modal\').remove();">' + _mi('search') + ' Open the Collocations Dictionary</button></p>' +
          '</div>' +
          '<div class="pv-info-modal-footer">' +
            '<button class="pv-info-modal-btn" onclick="document.getElementById(\'colloc-info-modal\').remove()" style="background:#8b5cf6">Got it!</button>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);
    },

    // ── IDIOMS INFO MODAL ────────────────────────────────────────────────
    _showIdInfoModal: function() {
      var existing = document.getElementById('id-info-modal');
      if (existing) { existing.remove(); return; }

      var modal = document.createElement('div');
      modal.id = 'id-info-modal';
      modal.className = 'pv-info-modal-overlay';
      modal.innerHTML =
        '<div class="pv-info-modal-box">' +
          '<div class="pv-info-modal-header">' +
            '<span class="pv-info-modal-icon"><span class="material-symbols-outlined">record_voice_over</span></span>' +
            '<h2 class="pv-info-modal-title">What are Idioms?</h2>' +
            '<button class="pv-info-modal-close" onclick="document.getElementById(\'id-info-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="pv-info-modal-body">' +
            '<p><strong>What are idioms?</strong></p>' +
            '<p>Idioms are fixed expressions whose meaning cannot be deduced from the literal meaning of the individual words. They are a key part of natural, fluent English.</p>' +
            '<p><strong>For example:</strong></p>' +
            '<ul class="pv-info-list">' +
              '<li><em>break the ice</em> → to make people feel more relaxed in a social situation</li>' +
              '<li><em>hit the nail on the head</em> → to describe exactly what is causing a problem</li>' +
              '<li><em>under the weather</em> → to feel slightly ill</li>' +
            '</ul>' +
            '<p><strong>Why are they important?</strong></p>' +
            '<p>Idioms appear frequently in Cambridge exams (B1 Preliminary, B2 First, C1 Advanced). Using them correctly will help you sound more natural and score higher in Speaking and Writing.</p>' +
            '<p><strong>Tip 💡</strong></p>' +
            '<p>Learn idioms in context — pay attention to the situation in which they are used, not just their meaning.</p>' +
            '<p><button class="wf-info-dict-link" onclick="FastExercises._showIdDictionary(); document.getElementById(\'id-info-modal\').remove();" style="background:#f59e0b">' + _mi('search') + ' Open the Idioms Dictionary</button></p>' +
          '</div>' +
          '<div class="pv-info-modal-footer">' +
            '<button class="pv-info-modal-btn" onclick="document.getElementById(\'id-info-modal\').remove()" style="background:#f59e0b">Got it!</button>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);
    },

    // ── COLLOCATIONS DICTIONARY ───────────────────────────────────────────
    _collocDictCache: null,

    _showCollocDictionary: async function() {
      var existing = document.getElementById('colloc-dict-modal');
      if (existing) { existing.remove(); return; }

      // Load dictionary data
      if (!this._collocDictCache) {
        try {
          var r = await fetch('data/collocations/dictionary.json');
          if (r.ok) this._collocDictCache = await r.json();
        } catch (e) {}
      }
      var entries = (this._collocDictCache && this._collocDictCache.entries) || [];

      var modal = document.createElement('div');
      modal.id = 'colloc-dict-modal';
      modal.className = 'colloc-dict-overlay';
      modal.innerHTML =
        '<div class="colloc-dict-box">' +
          '<div class="colloc-dict-header">' +
            '<span class="colloc-dict-icon">' + _mi('menu_book') + '</span>' +
            '<h2 class="colloc-dict-title">Collocations Dictionary</h2>' +
            '<button class="colloc-dict-close" onclick="document.getElementById(\'colloc-dict-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="colloc-dict-search-row">' +
            '<span class="colloc-dict-search-icon">' + _mi('search') + '</span>' +
            '<input type="text" class="colloc-dict-search" id="colloc-dict-search" placeholder="Search word or phrase…" oninput="FastExercises._filterCollocDict(this.value)" />' +
            '<select class="colloc-dict-level-filter" id="colloc-dict-level" onchange="FastExercises._filterCollocDict(document.getElementById(\'colloc-dict-search\').value)">' +
              '<option value="">All Levels</option>' +
              '<option value="A1">A1</option>' +
              '<option value="A2">A2</option>' +
              '<option value="B1">B1</option>' +
              '<option value="B2">B2</option>' +
              '<option value="C1">C1</option>' +
            '</select>' +
          '</div>' +
          '<div class="colloc-dict-count" id="colloc-dict-count">' + entries.length + ' entries</div>' +
          '<div class="colloc-dict-results" id="colloc-dict-results"></div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);

      // Store entries for filtering
      this._collocDictEntries = entries;
      this._renderCollocDictResults('', '');

      // Focus search
      setTimeout(function() {
        var searchEl = document.getElementById('colloc-dict-search');
        if (searchEl) searchEl.focus();
      }, 100);
    },

    _filterCollocDict: function(query) {
      var levelFilter = (document.getElementById('colloc-dict-level') || {}).value || '';
      this._renderCollocDictResults(query || '', levelFilter);
    },

    _renderCollocDictResults: function(query, levelFilter) {
      var self = this;
      var entries = this._collocDictEntries || [];
      var q = (query || '').toLowerCase().trim();

      var filtered = entries.filter(function(e) {
        var matchLevel = !levelFilter || e.level === levelFilter;
        if (!matchLevel) return false;
        if (!q) return true;
        return (e.word || '').toLowerCase().indexOf(q) !== -1 ||
               (e.phrase || '').toLowerCase().indexOf(q) !== -1 ||
               (e.definition || '').toLowerCase().indexOf(q) !== -1;
      });

      var resultsEl = document.getElementById('colloc-dict-results');
      var countEl = document.getElementById('colloc-dict-count');
      if (!resultsEl) return;

      if (countEl) countEl.textContent = filtered.length + ' entries' + (q || levelFilter ? ' (filtered)' : '');

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="colloc-dict-empty">' + _mi('search_off') + '<p>No results found</p></div>';
        return;
      }

      // Group by base word
      var groups = {};
      var groupOrder = [];
      filtered.forEach(function(e) {
        var key = (e.word || '').toLowerCase();
        if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
        groups[key].push(e);
      });

      var html = '';
      groupOrder.forEach(function(key) {
        var group = groups[key];
        var phrasesHtml = '';
        group.forEach(function(e) {
          phrasesHtml +=
            '<div class="colloc-dict-form">' +
              '<span class="colloc-dict-phrase">' + self._escapeHTML(e.phrase) + '</span>' +
              '<span class="colloc-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
              '<span class="colloc-dict-level-badge colloc-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
            '</div>';
        });
        html +=
          '<div class="colloc-dict-entry">' +
            '<div class="colloc-dict-base">' + self._escapeHTML(group[0].word) + '</div>' +
            '<div class="colloc-dict-forms">' + phrasesHtml + '</div>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
    },

    _showPvDictionary: async function() {
      var existing = document.getElementById('pv-dict-modal');
      if (existing) { existing.remove(); return; }

      // Load dictionary data
      if (!this._pvDictCache) {
        try {
          var r = await fetch('data/phrasal-verbs/dictionary.json');
          if (r.ok) this._pvDictCache = await r.json();
        } catch (e) {}
      }
      var entries = (this._pvDictCache && this._pvDictCache.entries) || [];

      var modal = document.createElement('div');
      modal.id = 'pv-dict-modal';
      modal.className = 'pv-dict-overlay';
      modal.innerHTML =
        '<div class="pv-dict-box">' +
          '<div class="pv-dict-header">' +
            '<span class="pv-dict-icon">' + _mi('menu_book') + '</span>' +
            '<h2 class="pv-dict-title">Phrasal Verbs Dictionary</h2>' +
            '<button class="pv-dict-close" onclick="document.getElementById(\'pv-dict-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="pv-dict-search-row">' +
            '<span class="pv-dict-search-icon">' + _mi('search') + '</span>' +
            '<input type="text" class="pv-dict-search" id="pv-dict-search" placeholder="Search phrasal verb or keyword…" oninput="FastExercises._filterPvDict(this.value)" />' +
            '<select class="pv-dict-level-filter" id="pv-dict-level" onchange="FastExercises._filterPvDict(document.getElementById(\'pv-dict-search\').value)">' +
              '<option value="">All Levels</option>' +
              '<option value="B1">B1</option>' +
              '<option value="B2">B2</option>' +
              '<option value="C1">C1</option>' +
            '</select>' +
          '</div>' +
          '<div class="pv-dict-count" id="pv-dict-count">' + entries.length + ' entries</div>' +
          '<div class="pv-dict-results" id="pv-dict-results"></div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);

      // Store entries for filtering
      this._pvDictEntries = entries;
      this._renderPvDictResults('', '');

      // Focus search
      setTimeout(function() {
        var searchEl = document.getElementById('pv-dict-search');
        if (searchEl) searchEl.focus();
      }, 100);
    },

    _filterPvDict: function(query) {
      var levelFilter = (document.getElementById('pv-dict-level') || {}).value || '';
      this._renderPvDictResults(query || '', levelFilter);
    },

    _renderPvDictResults: function(query, levelFilter) {
      var self = this;
      var entries = this._pvDictEntries || [];
      var q = (query || '').toLowerCase().trim();

      var filtered = entries.filter(function(e) {
        var matchLevel = !levelFilter || e.level === levelFilter;
        if (!matchLevel) return false;
        if (!q) return true;
        return (e.verb || '').toLowerCase().indexOf(q) !== -1 ||
               (e.definition || '').toLowerCase().indexOf(q) !== -1;
      });

      var resultsEl = document.getElementById('pv-dict-results');
      var countEl = document.getElementById('pv-dict-count');
      if (!resultsEl) return;

      if (countEl) countEl.textContent = filtered.length + ' entries' + (q || levelFilter ? ' (filtered)' : '');

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="pv-dict-empty">' + _mi('search_off') + '<p>No results found</p></div>';
        return;
      }

      // Group by main verb (first word)
      var groups = {};
      var groupOrder = [];
      filtered.forEach(function(e) {
        var mainVerb = (e.verb || '').split(' ')[0];
        if (!groups[mainVerb]) { groups[mainVerb] = []; groupOrder.push(mainVerb); }
        groups[mainVerb].push(e);
      });

      var html = '';
      groupOrder.forEach(function(mainVerb) {
        var group = groups[mainVerb];
        var verbsHtml = '';
        group.forEach(function(e) {
          var examplesHtml = '';
          if (e.examples && e.examples.length) {
            examplesHtml = '<ul class="pv-dict-examples">' +
              e.examples.map(function(ex) {
                return '<li>' + self._escapeHTML(ex) + '</li>';
              }).join('') +
            '</ul>';
          }
          verbsHtml +=
            '<div class="pv-dict-form">' +
              '<div class="pv-dict-form-top">' +
                '<span class="pv-dict-verb">' + self._escapeHTML(e.verb) + '</span>' +
                '<span class="pv-dict-level-badge pv-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
              '</div>' +
              '<span class="pv-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
              examplesHtml +
            '</div>';
        });
        html +=
          '<div class="pv-dict-entry">' +
            '<div class="pv-dict-base">' + self._escapeHTML(mainVerb) + '</div>' +
            '<div class="pv-dict-forms">' + verbsHtml + '</div>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
    },

    // ── GENERAL DICTIONARY ────────────────────────────────────────────────
    _gdRequestId: 0,

    _showGeneralDictionary: function(initialWord) {
      var existing = document.getElementById('gd-dict-modal');
      if (existing) { existing.remove(); return; }

      var modal = document.createElement('div');
      modal.id = 'gd-dict-modal';
      modal.className = 'gd-dict-overlay';
      modal.innerHTML =
        '<div class="gd-dict-box">' +
          '<div class="gd-dict-header">' +
            '<span class="gd-dict-icon"><span class="material-symbols-outlined">menu_book</span></span>' +
            '<h2 class="gd-dict-title">General Dictionary</h2>' +
            '<button class="gd-dict-close" onclick="document.getElementById(\'gd-dict-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="gd-dict-search-row">' +
            '<span class="gd-dict-search-icon"><span class="material-symbols-outlined">search</span></span>' +
            '<input type="text" class="gd-dict-search" id="gd-dict-search" placeholder="Type a word or phrasal verb…" />' +
            '<button class="gd-dict-search-btn" onclick="FastExercises._searchGeneralDict(document.getElementById(\'gd-dict-search\').value)">Search</button>' +
          '</div>' +
          '<div class="gd-dict-body" id="gd-dict-body">' +
            '<div class="gd-dict-placeholder">' +
              '<span class="material-symbols-outlined">auto_stories</span>' +
              '<p>Type a word above to look it up.</p>' +
            '</div>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);

      var input = document.getElementById('gd-dict-search');
      if (input) {
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') FastExercises._searchGeneralDict(input.value);
        });
        if (initialWord) {
          input.value = initialWord;
          FastExercises._searchGeneralDict(initialWord);
        } else {
          input.focus();
        }
      }
    },

    _searchGeneralDict: async function(texto) {
      var body = document.getElementById('gd-dict-body');
      if (!body) return;

      var query = (texto || '').trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
      if (!query) return;

      var requestId = ++this._gdRequestId;

      body.innerHTML = '<div class="gd-dict-loading"><i class="fas fa-spinner fa-spin"></i> Looking up…</div>';

      try {
        var response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(query));
        var data = await response.json();

        if (data.title === 'No Definitions Found' && query.indexOf(' ') !== -1) {
          var hyphenated = query.replace(/ /g, '-');
          response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(hyphenated));
          data = await response.json();
        }

        if (data.title === 'No Definitions Found') {
          // Fall back to AI-powered dictionary for comprehensive coverage
          var aiResponse = await fetch('/api/dictionary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: query })
          });
          if (aiResponse.ok) {
            data = await aiResponse.json();
          }
        }

        if (!Array.isArray(data) || data.length === 0 || (data.title && data.title === 'No Definitions Found')) {
          if (requestId !== this._gdRequestId) return;
          body.innerHTML = '<p class="gd-dict-not-found">No definition found for "' + this._escapeHTML(query) + '".</p>';
          return;
        }

        if (requestId !== this._gdRequestId) return;

        var info = data[0];
        var allMeaningsHTML = '';
        var synonymsList = [];

        info.meanings.forEach(function(meaning) {
          var defs = meaning.definitions.slice(0, 2);
          defs.forEach(function(def) {
            var exHtml = def.example
              ? '<div class="gd-dict-example">"' + FastExercises._escapeHTML(def.example) + '"</div>'
              : '';
            allMeaningsHTML +=
              '<div class="gd-dict-meaning">' +
                '<span class="gd-dict-pos">' + FastExercises._escapeHTML(meaning.partOfSpeech) + '</span>' +
                '<p class="gd-dict-definition">' + FastExercises._escapeHTML(def.definition) + '</p>' +
                exHtml +
              '</div>';
            if (def.synonyms && def.synonyms.length > 0) {
              synonymsList = synonymsList.concat(def.synonyms);
            }
          });
          if (meaning.synonyms && meaning.synonyms.length > 0) {
            synonymsList = synonymsList.concat(meaning.synonyms);
          }
        });

        var synonyms = [];
        var seen = {};
        synonymsList.forEach(function(s) {
          if (!seen[s]) { seen[s] = true; synonyms.push(s); }
        });
        synonyms = synonyms.slice(0, 6);

        var synonymsHTML = synonyms.length
          ? '<div class="gd-dict-synonyms">' +
              synonyms.map(function(s) {
                var safeS = FastExercises._jsStr(s);
                return '<span class="gd-dict-tag-pill" onclick="FastExercises._searchGeneralDict(\'' +
                  safeS + '\'); document.getElementById(\'gd-dict-search\').value=\'' +
                  safeS + '\'">' + FastExercises._escapeHTML(s) + '</span>';
              }).join('') +
            '</div>'
          : '';

        body.innerHTML =
          '<div class="gd-dict-result">' +
            '<div class="gd-dict-word-row">' +
              '<span class="gd-dict-word">' + FastExercises._escapeHTML(info.word) + '</span>' +
              '<span class="gd-dict-phonetic">' + FastExercises._escapeHTML(info.phonetic || '') + '</span>' +
            '</div>' +
            allMeaningsHTML +
            synonymsHTML +
          '</div>';

      } catch (err) {
        if (requestId !== this._gdRequestId) return;
        body.innerHTML = '<p class="gd-dict-not-found">Error connecting to dictionary. Please try again.</p>';
      }
    },

    _showIdDictionary: async function() {
      var existing = document.getElementById('id-dict-modal');
      if (existing) { existing.remove(); return; }

      if (!this._idDictCache) {
        try {
          var r = await fetch('data/idioms/dictionary.json');
          if (r.ok) this._idDictCache = await r.json();
        } catch (e) {}
      }
      var entries = (this._idDictCache && this._idDictCache.entries) || [];

      var modal = document.createElement('div');
      modal.id = 'id-dict-modal';
      modal.className = 'id-dict-overlay';
      modal.innerHTML =
        '<div class="id-dict-box">' +
          '<div class="id-dict-header">' +
            '<span class="id-dict-icon"><span class="material-symbols-outlined">record_voice_over</span></span>' +
            '<h2 class="id-dict-title">Idioms Dictionary</h2>' +
            '<button class="id-dict-close" onclick="document.getElementById(\'id-dict-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="id-dict-search-row">' +
            '<span class="id-dict-search-icon"><span class="material-symbols-outlined">search</span></span>' +
            '<input type="text" class="id-dict-search" id="id-dict-search" placeholder="Search idiom or keyword…" oninput="FastExercises._filterIdDict(this.value)" />' +
            '<select class="id-dict-level-filter" id="id-dict-level" onchange="FastExercises._filterIdDict(document.getElementById(\'id-dict-search\').value)">' +
              '<option value="">All Levels</option>' +
              '<option value="B1">B1</option>' +
              '<option value="B2">B2</option>' +
              '<option value="C1">C1</option>' +
            '</select>' +
          '</div>' +
          '<div class="id-dict-count" id="id-dict-count">' + entries.length + ' entries</div>' +
          '<div class="id-dict-results" id="id-dict-results"></div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);

      this._idDictEntries = entries;
      this._renderIdDictResults('', '');

      setTimeout(function() {
        var searchEl = document.getElementById('id-dict-search');
        if (searchEl) searchEl.focus();
      }, 100);
    },

    _filterIdDict: function(query) {
      var levelFilter = (document.getElementById('id-dict-level') || {}).value || '';
      this._renderIdDictResults(query || '', levelFilter);
    },

    _renderIdDictResults: function(query, levelFilter) {
      var self = this;
      var entries = this._idDictEntries || [];
      var q = (query || '').toLowerCase().trim();

      var filtered = entries.filter(function(e) {
        var matchLevel = !levelFilter || e.level === levelFilter;
        if (!matchLevel) return false;
        if (!q) return true;
        return (e.idiom || '').toLowerCase().indexOf(q) !== -1 ||
               (e.definition || '').toLowerCase().indexOf(q) !== -1;
      });

      var resultsEl = document.getElementById('id-dict-results');
      var countEl = document.getElementById('id-dict-count');
      if (!resultsEl) return;

      if (countEl) countEl.textContent = filtered.length + ' entries' + (q || levelFilter ? ' (filtered)' : '');

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="id-dict-empty"><span class="material-symbols-outlined">search_off</span><p>No results found</p></div>';
        return;
      }

      var html = '';
      filtered.forEach(function(e) {
        html +=
          '<div class="id-dict-entry id-entry-' + (e.level || '').toLowerCase() + '">' +
            '<div class="id-dict-idiom-row">' +
              '<span class="id-dict-idiom">' + self._escapeHTML(e.idiom) + '</span>' +
              '<span class="id-dict-level-badge id-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
            '</div>' +
            '<span class="id-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
    },

    // ── VOCABULARY DICTIONARY ─────────────────────────────────────────────
    _showVocabDictionary: async function() {
      var existing = document.getElementById('vocab-dict-modal');
      if (existing) { existing.remove(); return; }

      if (!this._vocabDictCache) {
        try {
          var r = await fetch('data/vocabulary/dictionary.json');
          if (r.ok) this._vocabDictCache = await r.json();
        } catch (e) {}
      }
      var entries = (this._vocabDictCache && this._vocabDictCache.entries) || [];

      var modal = document.createElement('div');
      modal.id = 'vocab-dict-modal';
      modal.className = 'vocab-dict-overlay';
      modal.innerHTML =
        '<div class="vocab-dict-box">' +
          '<div class="vocab-dict-header">' +
            '<span class="vocab-dict-icon"><span class="material-symbols-outlined">menu_book</span></span>' +
            '<h2 class="vocab-dict-title">Vocabulary Dictionary</h2>' +
            '<button class="vocab-dict-close" onclick="document.getElementById(\'vocab-dict-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="vocab-dict-search-row">' +
            '<span class="vocab-dict-search-icon"><span class="material-symbols-outlined">search</span></span>' +
            '<input type="text" class="vocab-dict-search" id="vocab-dict-search" placeholder="Search word or definition…" oninput="FastExercises._filterVocabDict(this.value)" />' +
            '<select class="vocab-dict-level-filter" id="vocab-dict-level" onchange="FastExercises._filterVocabDict(document.getElementById(\'vocab-dict-search\').value)">' +
              '<option value="">All Levels</option>' +
              '<option value="A2">A2</option>' +
              '<option value="B1">B1</option>' +
              '<option value="B2">B2</option>' +
              '<option value="C1">C1</option>' +
            '</select>' +
          '</div>' +
          '<div class="vocab-dict-count" id="vocab-dict-count">' + entries.length + ' entries</div>' +
          '<div class="vocab-dict-results" id="vocab-dict-results"></div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);

      this._vocabDictEntries = entries;
      this._renderVocabDictResults('', '');

      setTimeout(function() {
        var searchEl = document.getElementById('vocab-dict-search');
        if (searchEl) searchEl.focus();
      }, 100);
    },

    _filterVocabDict: function(query) {
      var levelFilter = (document.getElementById('vocab-dict-level') || {}).value || '';
      this._renderVocabDictResults(query || '', levelFilter);
    },

    _renderVocabDictResults: function(query, levelFilter) {
      var self = this;
      var entries = this._vocabDictEntries || [];
      var q = (query || '').toLowerCase().trim();

      var filtered = entries.filter(function(e) {
        var matchLevel = !levelFilter || e.level === levelFilter;
        if (!matchLevel) return false;
        if (!q) return true;
        return (e.word || '').toLowerCase().indexOf(q) !== -1 ||
               (e.definition || '').toLowerCase().indexOf(q) !== -1;
      });

      var resultsEl = document.getElementById('vocab-dict-results');
      var countEl = document.getElementById('vocab-dict-count');
      if (!resultsEl) return;

      if (countEl) countEl.textContent = filtered.length + ' entries' + (q || levelFilter ? ' (filtered)' : '');

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="vocab-dict-empty"><span class="material-symbols-outlined">search_off</span><p>No results found</p></div>';
        return;
      }

      var html = '';
      filtered.forEach(function(e) {
        html +=
          '<div class="vocab-dict-entry vocab-entry-' + (e.level || '').toLowerCase() + '">' +
            '<div class="vocab-dict-word-row">' +
              '<span class="vocab-dict-word">' + self._escapeHTML(e.word) + '</span>' +
              '<span class="vocab-dict-level-badge vocab-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
            '</div>' +
            '<span class="vocab-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
    },

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
          '<div class="pv-verb-popup-badge">' + 'Phrasal Verb' + '</div>' +
          '<div class="pv-verb-popup-verb">' + FastExercises._escapeHTML(pv.verb || '') + '</div>' +
          '<div class="pv-verb-popup-def">' + FastExercises._escapeHTML(pv.definition || '') + '</div>' +
          (examplesHtml ? '<ul class="pv-verb-popup-examples">' + examplesHtml + '</ul>' : '') +
        '</div>';

      popup.addEventListener('click', function(e) {
        if (e.target === popup) popup.remove();
      });

      document.body.appendChild(popup);
    },

    // ── VOCABULARY FLASHCARD HELPERS ─────────────────────────────────────
    _vocabStreaksKey: 'cambridge_vocab_streaks',

    _getVocabStreaks: function(levelId, lessonId) {
      try {
        var data = JSON.parse(localStorage.getItem(this._vocabStreaksKey)) || {};
        return data[levelId + '/' + lessonId] || {};
      } catch (e) { return {}; }
    },

    _saveVocabStreaks: function(levelId, lessonId, streaks) {
      try {
        var data = JSON.parse(localStorage.getItem(this._vocabStreaksKey)) || {};
        data[levelId + '/' + lessonId] = streaks;
        localStorage.setItem(this._vocabStreaksKey, JSON.stringify(data));
      } catch (e) {}
    },

    // ── VOCABULARY FLASHCARDS RENDERER ───────────────────────────────────
    _renderVocabFlashcards: async function(container, lessonData, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints) {
      var self = this;
      var allWords = lessonData.words || [];
      var color = (catMeta && catMeta.color) ? catMeta.color : '#10b981';

      // Load word streaks from storage
      var streaks = self._getVocabStreaks(levelId, lessonId);
      var totalWords = allWords.length;

      // Build the deck: words not yet learned (streak === 0)
      var remaining = allWords.filter(function(w) {
        return (streaks[w.word] || 0) === 0;
      });

      var levelsData = await self._loadCategoryData('vocabulary');

      // If all words learned, show completion screen
      if (remaining.length === 0) {
        var sidebarHtml = self._buildVocabSidebarHtml(catMeta, levelId, lessonId, levelsData, 'learn');
        container.innerHTML = '<div class="vocab-fc-layout"><div class="vocab-fc-main" id="vocab-fc-main"></div>' + sidebarHtml + '</div>';
        var mainEl = document.getElementById('vocab-fc-main');
        self._showVocabFlashcardsComplete(mainEl || container, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints, totalWords, color);
        return;
      }

      // Take a batch of max VOCAB_BATCH_SIZE words
      var batchWords = remaining.slice(0, VOCAB_BATCH_SIZE);

      // Build the flashcard session UI
      self._startVocabFlashcardSession(container, batchWords, allWords, streaks, catMeta, levelId, lessonId, lessonTitle, 'learn', pointIndex, lessonPoints, color, levelsData);
    },

    _startVocabFlashcardSession: function(container, batchWords, allWords, streaks, catMeta, levelId, lessonId, lessonTitle, mode, pointIndex, lessonPoints, color, levelsData) {
      var self = this;
      var totalWords = allWords.length;

      // Pre-compute how many words are already learned (streak > 0) at session start
      var learnedAtStart = allWords.filter(function(w) { return (streaks[w.word] || 0) > 0; }).length;

      // Set up layout: sidebar on right, main content on left
      var sidebarHtml = self._buildVocabSidebarHtml(catMeta, levelId, lessonId, levelsData, mode);
      container.innerHTML =
        '<div class="vocab-fc-layout">' +
          '<div class="vocab-fc-main" id="vocab-fc-main"></div>' +
          sidebarHtml +
        '</div>';

      // Per-word pill state: 'pending' | 'failed' | 'recovering' | 'correct'
      var cardStates = {};
      batchWords.forEach(function(w) { cardStates[w.word] = 'pending'; });

      // Session state: { word, definition, example, streak, state: 'fresh'|'needs-retry'|'neutral', hadBad }
      var deck = batchWords.map(function(w) {
        return { word: w.word, definition: w.definition, example: w.example, streak: streaks[w.word] || 0, state: 'fresh', hadBad: false };
      });

      var sessionLearned = []; // Words removed from deck (answered Good in 'fresh' or 'neutral' state)
      var isFlipped = false;

      function buildPillsHtml() {
        var currentWord = deck.length > 0 ? deck[0].word : null;
        var html = '<div class="vocab-fc-pills">';
        batchWords.forEach(function(w) {
          var state = cardStates[w.word] || 'pending';
          var isCurrent = (w.word === currentWord);
          var cls = 'vocab-fc-pill vocab-fc-pill-' + state + (isCurrent ? ' vocab-fc-pill-current' : '');
          html += '<span class="' + cls + '"></span>';
        });
        html += '</div>';
        return html;
      }

      function renderCard() {
        var mainEl = document.getElementById('vocab-fc-main');
        if (!mainEl) return;

        if (deck.length === 0) {
          // Session complete — compute and save updated streaks
          var updatedStreaks = {};
          Object.keys(streaks).forEach(function(w) { updatedStreaks[w] = streaks[w]; });

          // Update streaks based on session results:
          // - Answered Good without any Bad: streak++
          // - Had a Bad answer at any point: reset streak to 0
          sessionLearned.forEach(function(word) {
            if (self._sessionHadBad && self._sessionHadBad[word]) {
              // Had at least one bad answer — reset streak
              updatedStreaks[word] = 0;
            } else {
              // Clean Good answer: increment streak
              updatedStreaks[word] = Math.min(VOCAB_MAX_STREAK, (updatedStreaks[word] || 0) + 1);
            }
          });
          self._sessionHadBad = null;

          self._saveVocabStreaks(levelId, lessonId, updatedStreaks);

          var newLearnedCount = allWords.filter(function(w) { return (updatedStreaks[w.word] || 0) > 0; }).length;

          // Mark point complete if all words are learned
          if (newLearnedCount >= totalWords) {
            self._markPointComplete(catMeta.id, levelId, lessonId, pointIndex !== null ? pointIndex : 0);
          }

          self._showVocabSessionResults(mainEl, sessionLearned.length, newLearnedCount, totalWords, catMeta, levelId, lessonId, lessonTitle, mode, pointIndex, lessonPoints, color);
          return;
        }

        var card = deck[0];
        isFlipped = false;

        var stateHtml = '';
        if (card.state === 'needs-retry') {
          stateHtml = '<div class="vocab-fc-card-state vocab-fc-state-retry"><span class="material-symbols-outlined">replay</span> Try again</div>';
        } else if (card.state === 'neutral') {
          stateHtml = '<div class="vocab-fc-card-state vocab-fc-state-neutral"><span class="material-symbols-outlined">hourglass_empty</span> Almost there</div>';
        }

        var streakBadge = '';
        if (card.streak > 0) {
          streakBadge = '<div class="vocab-fc-streak-badge"><span class="material-symbols-outlined">bolt</span>' + card.streak + '</div>';
        }

        mainEl.innerHTML =
          '<div class="vocab-fc-wrapper">' +
            buildPillsHtml() +

            '<div class="vocab-fc-scene" id="vocab-fc-scene" onclick="vocabFcFlip()">' +
              '<div class="vocab-fc-card" id="vocab-fc-card">' +
                '<div class="vocab-fc-card-front" style="--card-color:' + color + '">' +
                  stateHtml +
                  streakBadge +
                  '<div class="vocab-fc-word">' + self._escapeHTML(card.word) + '</div>' +
                  '<div class="vocab-fc-flip-hint"><span class="material-symbols-outlined">touch_app</span> Tap to reveal</div>' +
                '</div>' +
                '<div class="vocab-fc-card-back" style="--card-color:' + color + '">' +
                  stateHtml +
                  '<div class="vocab-fc-back-word">' + self._escapeHTML(card.word) + '</div>' +
                  '<div class="vocab-fc-definition">' + self._escapeHTML(card.definition) + '</div>' +
                  '<div class="vocab-fc-example">&ldquo;' + self._escapeHTML(card.example) + '&rdquo;</div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="vocab-fc-actions" id="vocab-fc-actions">' +
              '<button class="vocab-fc-btn vocab-fc-bad" onclick="vocabFcAnswer(false)">' +
                '<span class="material-symbols-outlined">thumb_down</span> Bad' +
              '</button>' +
              '<button class="vocab-fc-btn vocab-fc-good" onclick="vocabFcAnswer(true)">' +
                '<span class="material-symbols-outlined">thumb_up</span> Good' +
              '</button>' +
            '</div>' +
          '</div>';

        // Initially hide action buttons
        var actionsEl = document.getElementById('vocab-fc-actions');
        if (actionsEl) actionsEl.style.display = 'none';
      }

      // Session-level bad tracking (accessible from renderCard's session end logic)
      self._sessionHadBad = {};

      // Expose handlers to global scope for inline onclick
      window.vocabFcFlip = function() {
        if (isFlipped) return; // Already flipped
        isFlipped = true;
        var cardEl = document.getElementById('vocab-fc-card');
        if (cardEl) cardEl.classList.add('vocab-fc-card-flipped');
        var actionsEl = document.getElementById('vocab-fc-actions');
        if (actionsEl) actionsEl.style.display = 'flex';
        var sceneEl = document.getElementById('vocab-fc-scene');
        if (sceneEl) {
          sceneEl.style.cursor = 'default';
          sceneEl.style.pointerEvents = 'none'; // Prevent scene from blocking buttons
        }
      };

      window.vocabFcAnswer = function(good) {
        if (!isFlipped) return; // Must flip first
        var card = deck.shift(); // Remove from front

        if (good) {
          if (card.state === 'fresh' || card.state === 'neutral') {
            // Good from fresh or recovering (neutral) → GREEN → done
            cardStates[card.word] = 'correct';
            sessionLearned.push(card.word);
          } else if (card.state === 'needs-retry') {
            // Good from failed → BLUE (recovering) → put near end for one more check
            cardStates[card.word] = 'recovering';
            card.state = 'neutral';
            var insertPos = deck.length > 0 ? deck.length : 0;
            deck.splice(insertPos, 0, card);
          }
        } else {
          // Bad: mark as failed, push further back in the deck
          cardStates[card.word] = 'failed';
          card.state = 'needs-retry';
          card.hadBad = true;
          self._sessionHadBad[card.word] = true;
          // Push at least 3 positions back, or to ~60% of the remaining deck
          var retryPos = Math.max(3, Math.min(deck.length, Math.floor(deck.length * 0.6)));
          deck.splice(retryPos, 0, card);
        }

        renderCard();
      };

      renderCard();
    },

    _showVocabSessionResults: function(container, batchLearned, totalLearned, totalWords, catMeta, levelId, lessonId, lessonTitle, mode, pointIndex, lessonPoints, color) {
      var self = this;
      var allDone = totalLearned >= totalWords;
      var remaining = totalWords - totalLearned;

      var continueBtn = '';
      if (!allDone) {
        var nextMode = mode === 'review' ? 'review' : 'learn';
        continueBtn =
          '<button class="vocab-fc-next-batch-btn" onclick="FastExercises._openVocabSession(\'' + levelId + '\',\'' + lessonId + '\',\'' + nextMode + '\')" style="background:' + color + '">' +
            '<span class="material-symbols-outlined">arrow_forward</span> Continue' +
          '</button>';
      }

      container.innerHTML =
        '<div class="vocab-fc-wrapper vocab-fc-results">' +
          '<div class="vocab-fc-results-card' + (allDone ? ' vocab-fc-complete-card' : '') + '" style="--card-color:' + color + '">' +
            '<div class="vocab-fc-results-icon"><span class="material-symbols-outlined" style="color:' + color + '">' + (allDone ? 'emoji_events' : 'check_circle') + '</span></div>' +
            '<div class="vocab-fc-results-title">' + (allDone ? 'Topic Complete! 🎉' : 'Batch Complete!') + '</div>' +
            '<div class="vocab-fc-results-stats">' +
              '<div class="vocab-fc-stat"><span class="vocab-fc-stat-num" style="color:' + color + '">' + totalLearned + '</span><span class="vocab-fc-stat-label">/ ' + totalWords + ' learned</span></div>' +
              (!allDone ? '<div class="vocab-fc-stat"><span class="vocab-fc-stat-num" style="color:#f59e0b">' + remaining + '</span><span class="vocab-fc-stat-label">remaining</span></div>' : '') +
            '</div>' +
            '<div class="vocab-fc-results-progress-track">' +
              '<div class="vocab-fc-results-progress-fill" style="width:' + Math.round((totalLearned / totalWords) * 100) + '%; background:' + color + '"></div>' +
            '</div>' +
            '<div class="vocab-fc-results-msg">' + (batchLearned > 0 ? 'You got ' + batchLearned + ' word' + (batchLearned !== 1 ? 's' : '') + ' right this session!' : 'Keep practising — you\'ll get them!') + '</div>' +
            continueBtn +
            '<button class="vocab-fc-next-batch-btn vocab-fc-back-topics-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" style="background:#64748b">' +
              '<span class="material-symbols-outlined">arrow_back</span> Back to Topics' +
            '</button>' +
          '</div>' +
        '</div>';
    },

    _showVocabFlashcardsComplete: function(container, catMeta, levelId, lessonId, lessonTitle, pointIndex, lessonPoints, totalWords, color) {
      var self = this;

      container.innerHTML =
        '<div class="vocab-fc-wrapper vocab-fc-results">' +
          '<div class="vocab-fc-results-card vocab-fc-complete-card" style="--card-color:' + color + '">' +
            '<div class="vocab-fc-results-icon"><span class="material-symbols-outlined" style="color:' + color + '">emoji_events</span></div>' +
            '<div class="vocab-fc-results-title">Topic Complete! 🎉</div>' +
            '<div class="vocab-fc-results-stats">' +
              '<div class="vocab-fc-stat"><span class="vocab-fc-stat-num" style="color:' + color + '">' + totalWords + '</span><span class="vocab-fc-stat-label">words mastered</span></div>' +
            '</div>' +
            '<div class="vocab-fc-results-progress-track">' +
              '<div class="vocab-fc-results-progress-fill" style="width:100%; background:' + color + '"></div>' +
            '</div>' +
            '<div class="vocab-fc-results-msg">You\'ve mastered all the words in this topic. Keep it up!</div>' +
            '<button class="vocab-fc-next-batch-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" style="background:' + color + '">' +
              '<span class="material-symbols-outlined">arrow_back</span> Back to Topics' +
            '</button>' +
          '</div>' +
        '</div>';
    },

    // ── VOCABULARY CROSSWORD ─────────────────────────────────────────────

    _buildVocabCrosswordSidebarHtml: function(catMeta, levelId, lessonId, levelsData) {
      var self = this;
      var level = null;
      if (levelsData && levelsData.levels) {
        for (var i = 0; i < levelsData.levels.length; i++) {
          if (levelsData.levels[i].id === levelId) { level = levelsData.levels[i]; break; }
        }
      }
      var lessonsHtml = '';
      if (level && level.lessons && level.lessons.length > 0) {
        level.lessons.forEach(function(lesson) {
          var isActive = (lesson.id === lessonId);
          var cls = 'vocab-fc-sidebar-lesson' + (isActive ? ' vocab-fc-sidebar-lesson-active' : '');
          var onclick = isActive ? '' : ('onclick="FastExercises._openVocabCrossword(\'' + self._jsStr(levelId) + '\',\'' + self._jsStr(lesson.id) + '\')"');
          lessonsHtml +=
            '<div class="' + cls + '" ' + onclick + '>' +
              '<span class="material-symbols-outlined vocab-fc-sidebar-lesson-icon">' + (isActive ? 'radio_button_checked' : 'radio_button_unchecked') + '</span>' +
              '<span class="vocab-fc-sidebar-lesson-title">' + self._escapeHTML(lesson.title || lesson.id) + '</span>' +
            '</div>';
        });
      }
      return '<div class="pv-point-sidebar vocab-fc-sidebar-right" id="vocab-fc-sidebar">' +
        '<div class="pv-sidebar-top-row">' +
          '<button class="subpage-back-btn pv-sidebar-back" onclick="FastExercises.openCategory(\'vocabulary\')">' +
            'Back' +
          '</button>' +
          '<button class="pv-sidebar-collapse-btn" id="vocab-fc-sidebar-toggle" title="Collapse" onclick="FastExercises._vocabToggleSidebar()">' +
            '<span class="material-symbols-outlined pv-sidebar-toggle-icon">chevron_right</span>' +
          '</button>' +
        '</div>' +
        '<button class="pv-sidebar-exit-btn" title="Back" onclick="FastExercises.openCategory(\'vocabulary\')">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="pv-sidebar-content" id="vocab-fc-sidebar-content">' +
          '<div class="pv-sidebar-lesson-info">' +
            '<div class="pv-sidebar-lesson-name">' + self._escapeHTML(levelId) + ' Vocabulary</div>' +
            '<div class="pv-sidebar-level-label">Crossword</div>' +
          '</div>' +
          '<div class="vocab-fc-sidebar-lessons">' + lessonsHtml + '</div>' +
        '</div>' +
      '</div>';
    },

    // ─── Mixed crossword helpers ────────────────────────────────────────────────

    // Returns the level configuration for mixed crosswords.
    _cwLevelConfig: function() { return CW_LEVEL_CONFIG; },

    // Deterministic Fisher-Yates shuffle using a simple LCG seeded by cwIndex.
    // LCG parameters (1664525 multiplier, 1013904223 increment) are the classic
    // Numerical Recipes values chosen for good distribution on 32-bit integers.
    _cwSeededShuffle: function(arr, seed) {
      var a = arr.slice();
      var s = (seed + 1) * 1664525 + 1013904223;
      for (var i = a.length - 1; i > 0; i--) {
        s = ((s * 1664525) + 1013904223) | 0;
        var j = Math.abs(s) % (i + 1);
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    },

    // Extract the most distinctive single word from a multi-word idiom phrase.
    _cwExtractIdiomWord: function(idiomStr) {
      var WORD_RE = /^[a-zA-Z]{3,12}$/;
      var parts = idiomStr.toLowerCase().split(/\s+/);
      var eligible = parts.filter(function(p) { return WORD_RE.test(p) && !CW_STOPWORDS[p]; });
      if (!eligible.length) eligible = parts.filter(function(p) { return WORD_RE.test(p); });
      if (!eligible.length) return null;
      return eligible.reduce(function(a, b) { return b.length > a.length ? b : a; });
    },

    // Build a deduplicated, level-filtered word pool from all four vocabulary
    // sources.  Each entry has { word (uppercase), clue, type }.
    _buildMixedWordPool: async function(levelId) {
      var self = this;
      var WORD_RE = /^[a-zA-Z]{3,12}$/;
      var seen = {};
      var pool = [];

      function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

      function add(word, clue, type) {
        var key = word.toLowerCase();
        if (!WORD_RE.test(key) || seen[key]) return;
        seen[key] = 1;
        pool.push({ word: word.toUpperCase(), clue: clue, type: type });
      }

      // 1. Vocabulary dictionary
      try {
        var vocabRes = await fetch('data/vocabulary/dictionary.json');
        if (vocabRes.ok) {
          var vd = await vocabRes.json();
          (vd.entries || []).forEach(function(e) {
            if (e.level === levelId) add(e.word, e.definition, 'vocabulary');
          });
        }
      } catch(e) {}

      // 2. Collocations dictionary
      try {
        var collocRes = await fetch('data/collocations/dictionary.json');
        if (collocRes.ok) {
          var cd = await collocRes.json();
          (cd.entries || []).forEach(function(e) {
            if (e.level === levelId && e.word && e.phrase) {
              var blank = e.phrase.replace(new RegExp('\\b' + escRe(e.word) + '\\b', 'gi'), '___');
              add(e.word, e.definition + ' | ' + blank, 'collocation');
            }
          });
        }
      } catch(e) {}

      // 3. Phrasal verbs — use the particle/preposition as the answer word when possible
      try {
        var pvLevelsRes = await fetch('data/phrasal-verbs/levels.json');
        if (pvLevelsRes.ok) {
          var pvLevels = await pvLevelsRes.json();
          var pvLevel = null;
          (pvLevels.levels || []).forEach(function(l) { if (l.id === levelId) pvLevel = l; });
          if (pvLevel) {
            for (var li = 0; li < pvLevel.lessons.length; li++) {
              try {
                var pvLessonRes = await fetch('data/phrasal-verbs/' + levelId + '/' + pvLevel.lessons[li].id + '.json');
                if (pvLessonRes.ok) {
                  var pvLesson = await pvLessonRes.json();
                  (pvLesson.phrasalVerbs || []).forEach(function(pv) {
                    if (!pv.verb) return;
                    var parts = pv.verb.split(/\s+/);
                    var mainVerb = parts[0];
                    var particle = parts.slice(1).join(' ');
                    // Prefer the particle as the crossword answer (allow 2+ letters)
                    if (particle && /^[a-zA-Z]{2,12}$/.test(particle)) {
                      var pk = particle.toLowerCase();
                      if (!seen[pk]) {
                        seen[pk] = 1;
                        pool.push({ word: particle.toUpperCase(), clue: pv.definition + ' | ' + mainVerb + ' ___', type: 'phrasal-verb' });
                        return;
                      }
                    }
                    // Fallback to main verb
                    add(mainVerb, pv.definition + (particle ? ' | ___ ' + particle : ''), 'phrasal-verb');
                  });
                }
              } catch(e) {}
            }
          }
        }
      } catch(e) {}

      // 4. Idioms
      try {
        var idLevelsRes = await fetch('data/idioms/levels.json');
        if (idLevelsRes.ok) {
          var idLevels = await idLevelsRes.json();
          var idLevel = null;
          (idLevels.levels || []).forEach(function(l) { if (l.id === levelId) idLevel = l; });
          if (idLevel) {
            for (var li = 0; li < idLevel.lessons.length; li++) {
              try {
                var idLessonRes = await fetch('data/idioms/' + levelId + '/' + idLevel.lessons[li].id + '.json');
                if (idLessonRes.ok) {
                  var idLesson = await idLessonRes.json();
                  (idLesson.idioms || []).forEach(function(id) {
                    if (!id.idiom) return;
                    var kw = self._cwExtractIdiomWord(id.idiom);
                    if (!kw) return;
                    var blank = id.idiom.replace(new RegExp('\\b' + escRe(kw) + '\\b', 'gi'), '___');
                    add(kw, id.definition + ' | ' + blank, 'idiom');
                  });
                }
              } catch(e) {}
            }
          }
        }
      } catch(e) {}

      return pool;
    },

    _cwShowClueTab: function(dir) {
      var acrossEl = document.getElementById('cw-clues-across');
      var downEl   = document.getElementById('cw-clues-down');
      var tabA     = document.getElementById('cw-tab-across');
      var tabD     = document.getElementById('cw-tab-down');
      if (!acrossEl || !downEl) return;
      if (dir === 'across') {
        acrossEl.style.display = 'block';
        downEl.style.display   = 'none';
        if (tabA) tabA.classList.add('vocab-cw-clues-tab-active');
        if (tabD) tabD.classList.remove('vocab-cw-clues-tab-active');
      } else {
        acrossEl.style.display = 'none';
        downEl.style.display   = 'block';
        if (tabA) tabA.classList.remove('vocab-cw-clues-tab-active');
        if (tabD) tabD.classList.add('vocab-cw-clues-tab-active');
      }
    },

    // Open a mixed (non-topic-grouped) crossword by level and slot index.
    _openMixedCrossword: async function(levelId, cwIndex) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      // Load pre-generated static JSON instead of generating at runtime
      var cwData = null;
      try {
        var cwRes = await fetch('/crosswords/' + levelId + '/cw' + cwIndex + '.json');
        if (!cwRes.ok) throw new Error('HTTP ' + cwRes.status);
        var staticCw = await cwRes.json();

        // Normalize static JSON format to runtime format expected by _renderVocabCrossword
        // Static format: binary grid (1/0) + across/down arrays
        // Runtime format: letter grid (letter/null) + placed array with dir field
        var normPlaced = [];
        (staticCw.across || []).forEach(function(e) {
          normPlaced.push({ word: e.word, clue: e.clue, definition: e.clue, type: e.type, row: e.row, col: e.col, dir: 'across', number: e.number, length: e.length });
        });
        (staticCw.down || []).forEach(function(e) {
          normPlaced.push({ word: e.word, clue: e.clue, definition: e.clue, type: e.type, row: e.row, col: e.col, dir: 'down', number: e.number, length: e.length });
        });

        // Reconstruct letter grid from placed entries
        var normGrid = [];
        for (var r = 0; r < staticCw.rows; r++) {
          normGrid[r] = [];
          for (var c = 0; c < staticCw.cols; c++) normGrid[r][c] = null;
        }
        normPlaced.forEach(function(p) {
          for (var i = 0; i < p.word.length; i++) {
            var gr = p.dir === 'across' ? p.row : p.row + i;
            var gc = p.dir === 'across' ? p.col + i : p.col;
            normGrid[gr][gc] = p.word[i];
          }
        });

        cwData = { grid: normGrid, placed: normPlaced, rows: staticCw.rows, cols: staticCw.cols };
      } catch(e) {
        // Fallback: generate at runtime if static file not found
        var pool = await this._buildMixedWordPool(levelId);
        if (!pool.length) {
          content.innerHTML = '<div class="fe-error">No words available for this level.</div>';
          return;
        }
        var shuffled = this._cwSeededShuffle(pool, cwIndex);
        var batch = shuffled.slice(0, CW_BATCH_SIZE);
        cwData = this._generateCrossword(batch);
      }

      if (!cwData || !cwData.placed || cwData.placed.length < CW_MIN_PLACED) {
        content.innerHTML = '<div class="fe-error">Not enough words could be placed. Please try another crossword.</div>';
        return;
      }

      // Load saved cell state for progress restoration
      var pKey = levelId + '_cw' + cwIndex;
      var savedState = null;
      try {
        savedState = (typeof CrosswordSync !== 'undefined') ? CrosswordSync.get(pKey) : null;
        if (!savedState) {
          var rawProg = localStorage.getItem('cambridge_crossword_progress');
          if (rawProg) savedState = (JSON.parse(rawProg) || {})[pKey] || null;
        }
      } catch(e) { savedState = null; }

      var catMeta = { id: 'crossword', icon: 'grid_on', name: 'Crossword', color: '#10b981' };
      var color = catMeta.color;
      var title = levelId + ' Crossword #' + (cwIndex + 1);

      var wrapper = document.createElement('div');
      wrapper.className = 'fe-section';
      content.innerHTML = '';
      content.appendChild(wrapper);

      var mainDiv = document.createElement('div');
      mainDiv.className = 'vocab-cw-layout';
      mainDiv.innerHTML = '<div class="vocab-cw-main" id="vocab-cw-main"></div>';
      wrapper.appendChild(mainDiv);

      var mainEl = document.getElementById('vocab-cw-main');
      this._renderVocabCrossword(mainEl, cwData, { title: title }, catMeta, color, levelId, null, cwIndex, savedState);
    },

    // ─── Daily generated crossword ────────────────────────────────────────────
    // Generates a fresh crossword for today, caches it in localStorage, and
    // overwrites it automatically when the calendar date changes.

    _openDailyGeneratedCrossword: async function(levelId, date) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      // Return the cached crossword for today, or generate (and store) a new one.
      var storageKey = 'cambridge_daily_crossword_' + levelId;
      var cwData = null;
      try {
        var stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (stored && stored.date === date && stored.cwData) {
          cwData = stored.cwData;
        }
      } catch(e) { cwData = null; }

      if (!cwData) {
        var pool = await this._buildMixedWordPool(levelId);
        if (!pool.length) {
          content.innerHTML = '<div class="fe-error">No words available for this level.</div>';
          return;
        }
        // Derive a reproducible seed from the date string using a simple hash
        // (same approach as the rest of the codebase for seeded shuffles)
        var dateSeed = 0;
        for (var i = 0; i < date.length; i++) {
          dateSeed = ((dateSeed << 5) - dateSeed) + date.charCodeAt(i);
          dateSeed = dateSeed & dateSeed;
        }
        dateSeed = Math.abs(dateSeed);
        var shuffled = this._cwSeededShuffle(pool, dateSeed);
        var batch = shuffled.slice(0, CW_BATCH_SIZE);
        cwData = this._generateCrossword(batch);
        if (!cwData || !cwData.placed || cwData.placed.length < CW_MIN_PLACED) {
          content.innerHTML = '<div class="fe-error">Not enough words could be placed. Please try again later.</div>';
          return;
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify({ date: date, cwData: cwData }));
        } catch(e) {}
      }

      if (!cwData || !cwData.placed || cwData.placed.length < CW_MIN_PLACED) {
        content.innerHTML = '<div class="fe-error">Not enough words could be placed. Please try again later.</div>';
        return;
      }

      // Progress key is date-based so each day's puzzle has independent tracking.
      // We reuse the lessonId slot (cwIndex = undefined) so the save path becomes
      // levelId + '_' + dailyProgressId  →  e.g. 'B1_daily_2026-04-05'
      var dailyProgressId = 'daily_' + date;
      var pKey = levelId + '_' + dailyProgressId;
      var savedState = null;
      try {
        savedState = (typeof CrosswordSync !== 'undefined') ? CrosswordSync.get(pKey) : null;
        if (!savedState) {
          var rawProg = localStorage.getItem('cambridge_crossword_progress');
          if (rawProg) savedState = (JSON.parse(rawProg) || {})[pKey] || null;
        }
      } catch(e) { savedState = null; }

      var catMeta = { id: 'crossword', icon: 'grid_on', name: 'Crossword', color: '#10b981' };
      var color = catMeta.color;
      var title = '📅 Daily · ' + date;

      var wrapper = document.createElement('div');
      wrapper.className = 'fe-section';
      content.innerHTML = '';
      content.appendChild(wrapper);

      var mainDiv = document.createElement('div');
      mainDiv.className = 'vocab-cw-layout';
      mainDiv.innerHTML = '<div class="vocab-cw-main" id="vocab-cw-main"></div>';
      wrapper.appendChild(mainDiv);

      var mainEl = document.getElementById('vocab-cw-main');
      // cwIndex = undefined → progress key uses lessonId path (levelId_dailyProgressId)
      this._renderVocabCrossword(mainEl, cwData, { title: title }, catMeta, color, levelId, dailyProgressId, undefined, savedState);
    },

    // ─── Vocabulary-lesson crossword (kept for the vocabulary learning section) ──

    _openVocabCrossword: async function(levelId, lessonId) {
      var self = this;
      var content = document.getElementById('main-content');
      if (!content) return;

      var catMeta = { id: 'vocabulary', icon: 'menu_book', name: 'Vocabulary', color: '#10b981' };
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].id === 'vocabulary') { catMeta = CATEGORIES[i]; break; }
      }

      content.innerHTML = '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      var lessonData = await this._loadLessonData('vocabulary', levelId, lessonId);
      if (!lessonData || !lessonData.words || lessonData.words.length === 0) {
        content.innerHTML = '<div class="fe-error">No words available.</div>';
        return;
      }

      var color = catMeta.color;
      var cwData = this._generateCrossword(lessonData.words);

      if (!cwData || !cwData.placed || cwData.placed.length < 2) {
        content.innerHTML = '<div class="fe-error">Not enough words to generate a crossword for this lesson.</div>';
        return;
      }

      var wrapper = document.createElement('div');
      wrapper.className = 'fe-section';
      content.innerHTML = '';
      content.appendChild(wrapper);

      var mainDiv = document.createElement('div');
      mainDiv.className = 'vocab-cw-layout';
      mainDiv.innerHTML = '<div class="vocab-cw-main" id="vocab-cw-main"></div>';
      wrapper.appendChild(mainDiv);

      var mainEl = document.getElementById('vocab-cw-main');
      this._renderVocabCrossword(mainEl, cwData, lessonData, catMeta, color, levelId, lessonId);
    },

    _canPlace: function(grid, dirGrid, word, row, col, dir, SIZE) {
      var len = word.length;
      var oppDir = dir === 'across' ? 'down' : 'across';
      if (dir === 'across') {
        if (col < 0 || col + len > SIZE || row < 0 || row >= SIZE) return false;
        if (col > 0 && grid[row][col - 1] !== null) return false;
        if (col + len < SIZE && grid[row][col + len] !== null) return false;
      } else {
        if (row < 0 || row + len > SIZE || col < 0 || col >= SIZE) return false;
        if (row > 0 && grid[row - 1][col] !== null) return false;
        if (row + len < SIZE && grid[row + len][col] !== null) return false;
      }
      var hasCrossing = false;
      for (var i = 0; i < len; i++) {
        var r = dir === 'across' ? row : row + i;
        var c = dir === 'across' ? col + i : col;
        if (grid[r][c] !== null) {
          if (grid[r][c] !== word[i]) return false;
          // A valid crossing requires the existing letter was placed by a perpendicular word
          // and no word in the same direction already occupies this cell
          if (!dirGrid[r][c][oppDir]) return false;
          if (dirGrid[r][c][dir]) return false;
          hasCrossing = true;
        } else {
          if (dir === 'across') {
            if (r > 0 && grid[r - 1][c] !== null) return false;
            if (r + 1 < SIZE && grid[r + 1][c] !== null) return false;
          } else {
            if (c > 0 && grid[r][c - 1] !== null) return false;
            if (c + 1 < SIZE && grid[r][c + 1] !== null) return false;
          }
        }
      }
      return hasCrossing;
    },

    _countCrossings: function(grid, word, row, col, dir) {
      var count = 0;
      for (var i = 0; i < word.length; i++) {
        var r = dir === 'across' ? row : row + i;
        var c = dir === 'across' ? col + i : col;
        if (grid[r][c] !== null) count++;
      }
      return count;
    },

    _generateCrossword: function(words) {
      var SIZE = 21;
      var self = this;

      var eligible = words.filter(function(w) {
        return /^[a-zA-Z]{2,12}$/.test(w.word);
      });
      if (eligible.length < 2) return null;

      eligible = eligible.slice().sort(function(a, b) { return b.word.length - a.word.length; });

      var grid = [];
      var dirGrid = []; // tracks which directions are used at each cell
      for (var r = 0; r < SIZE; r++) {
        grid[r] = [];
        dirGrid[r] = [];
        for (var c = 0; c < SIZE; c++) {
          grid[r][c] = null;
          dirGrid[r][c] = { across: false, down: false };
        }
      }

      var placed = [];
      var center = Math.floor(SIZE / 2);

      var firstW = eligible[0].word.toUpperCase();
      var startC = Math.max(0, center - Math.floor(firstW.length / 2));
      if (startC + firstW.length > SIZE) startC = SIZE - firstW.length;
      for (var i = 0; i < firstW.length; i++) {
        grid[center][startC + i] = firstW[i];
        dirGrid[center][startC + i].across = true;
      }
      placed.push({ word: firstW, clue: eligible[0].clue || eligible[0].definition || '', definition: eligible[0].definition || '', row: center, col: startC, dir: 'across', number: 0 });

      for (var wi = 1; wi < eligible.length && placed.length < CW_MAX_PLACED; wi++) {
        var wordObj = eligible[wi];
        var word = wordObj.word.toUpperCase();
        var bestScore = -Infinity;
        var bestPos = null;

        for (var pi = 0; pi < placed.length; pi++) {
          var pw = placed[pi];
          var tryDir = pw.dir === 'across' ? 'down' : 'across';
          for (var li = 0; li < word.length; li++) {
            for (var pli = 0; pli < pw.word.length; pli++) {
              if (word[li] !== pw.word[pli]) continue;
              var tr, tc;
              if (tryDir === 'down') {
                tc = pw.col + pli;
                tr = pw.row - li;
              } else {
                tr = pw.row + pli;
                tc = pw.col - li;
              }
              if (!self._canPlace(grid, dirGrid, word, tr, tc, tryDir, SIZE)) continue;
              var crossings = self._countCrossings(grid, word, tr, tc, tryDir);
              var score = crossings * 10 - Math.abs(tr - center) - Math.abs(tc - center);
              if (score > bestScore) {
                bestScore = score;
                bestPos = { r: tr, c: tc, dir: tryDir };
              }
            }
          }
        }

        if (bestPos) {
          var pr = bestPos.r, pc = bestPos.c, pd = bestPos.dir;
          for (var i = 0; i < word.length; i++) {
            var pr2 = pd === 'across' ? pr : pr + i;
            var pc2 = pd === 'across' ? pc + i : pc;
            grid[pr2][pc2] = word[i];
            dirGrid[pr2][pc2][pd] = true;
          }
          placed.push({ word: word, clue: wordObj.clue || wordObj.definition || '', definition: wordObj.definition || '', row: pr, col: pc, dir: pd, number: 0 });
        }
      }

      var minR = SIZE, maxR = -1, minC = SIZE, maxC = -1;
      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
          if (grid[r][c] !== null) {
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
      }
      if (maxR < 0 || placed.length < CW_MIN_PLACED) return null;
      minR = Math.max(0, minR - 1);
      minC = Math.max(0, minC - 1);
      maxR = Math.min(SIZE - 1, maxR + 1);
      maxC = Math.min(SIZE - 1, maxC + 1);
      var rows = maxR - minR + 1;
      var cols = maxC - minC + 1;

      var trimGrid = [];
      for (var r = 0; r < rows; r++) {
        trimGrid[r] = [];
        for (var c = 0; c < cols; c++) trimGrid[r][c] = grid[minR + r][minC + c];
      }
      placed.forEach(function(p) { p.row -= minR; p.col -= minC; });

      var numCounter = 1;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (trimGrid[r][c] === null) continue;
          var startsAcross = (c === 0 || trimGrid[r][c - 1] === null) && (c + 1 < cols && trimGrid[r][c + 1] !== null);
          var startsDown = (r === 0 || trimGrid[r - 1][c] === null) && (r + 1 < rows && trimGrid[r + 1][c] !== null);
          if (startsAcross || startsDown) {
            placed.forEach(function(p) {
              if (p.row === r && p.col === c) {
                p.number = numCounter;
              }
            });
            numCounter++;
          }
        }
      }

      return { grid: trimGrid, placed: placed, rows: rows, cols: cols };
    },

    _renderVocabCrossword: function(mainEl, cwData, lessonData, catMeta, color, levelId, lessonId, cwIndex, savedState) {
      var self = this;
      var grid = cwData.grid;
      var placed = cwData.placed;
      var rows = cwData.rows;
      var cols = cwData.cols;

      mainEl.classList.add('vocab-cw-main-' + levelId.toLowerCase());

      var cellMap = {};
      placed.forEach(function(p) {
        for (var i = 0; i < p.word.length; i++) {
          var r = p.dir === 'across' ? p.row : p.row + i;
          var c = p.dir === 'across' ? p.col + i : p.col;
          var key = r + ',' + c;
          if (!cellMap[key]) cellMap[key] = [];
          cellMap[key].push(p);
        }
      });

      var numMap = {};
      placed.forEach(function(p) {
        if (p.number) numMap[p.row + ',' + p.col] = p.number;
      });

      // Grid HTML — display-only cells (no inline inputs)
      var gridHtml = '';
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var letter = grid[r][c];
          if (letter === null) {
            gridHtml += '<div class="vocab-cw-cell vocab-cw-black" aria-hidden="true"></div>';
          } else {
            var numLabel = numMap[r + ',' + c] || '';
            var cellWords = cellMap[r + ',' + c] || [];
            var ariaLabel = cellWords.map(function(p) { return p.number + (p.dir === 'across' ? ' across' : ' down'); }).join(', ') || 'cell';
            gridHtml += '<div class="vocab-cw-cell" role="button" tabindex="-1" data-r="' + r + '" data-c="' + c + '" id="cw-cell-' + r + '-' + c + '" aria-label="' + ariaLabel + '">' +
              (numLabel ? '<span class="vocab-cw-cell-num">' + numLabel + '</span>' : '') +
              '<span class="vocab-cw-cell-letter"></span>' +
            '</div>';
          }
        }
      }

      var acrossClues = placed.filter(function(p) { return p.dir === 'across' && p.number; }).sort(function(a, b) { return a.number - b.number; });
      var downClues   = placed.filter(function(p) { return p.dir === 'down'   && p.number; }).sort(function(a, b) { return a.number - b.number; });

      var cwTypeBadge = function(type) {
        var labels = { 'vocabulary': 'vocab', 'collocation': 'coloc', 'phrasal-verb': 'phrasal', 'idiom': 'idiom' };
        if (!type) return '';
        var label = labels[type] || type;
        return '<span class="vocab-cw-type-badge vocab-cw-type-' + self._escapeHTML(type) + '">' + label + '</span>';
      };

      var cwClueText = function(clue, solved) {
        if (!clue) return '';
        var pipe = clue.indexOf(' | ');
        if (pipe !== -1) return solved ? clue : clue.slice(pipe + 3);
        return clue;
      };

      var buildClue = function(p) {
        return '<div class="vocab-cw-clue" data-dir="' + p.dir + '" data-num="' + p.number + '" data-r="' + p.row + '" data-c="' + p.col + '">' +
          '<span class="vocab-cw-clue-num">' + p.number + (p.dir === 'across' ? 'A' : 'D') + '</span> ' +
          '<span class="vocab-cw-clue-text">' + self._escapeHTML(cwClueText(p.clue || p.definition || '', false)) + '</span>' +
          cwTypeBadge(p.type) +
        '</div>';
      };

      var lessonTitle = lessonData.title || lessonId;

      mainEl.innerHTML =
        '<div class="vocab-cw-header">' +
          '<button class="vocab-cw-btn vocab-cw-back-btn" onclick="BentoGrid.openCrosswordList()">' + _mi('arrow_back') + '<span>Back</span></button>' +
          '<div class="vocab-cw-header-title">' +
            '<span class="material-symbols-outlined vocab-cw-header-icon">grid_on</span>' +
            '<span class="vocab-cw-header-text">' + self._escapeHTML(levelId) + ' Crossword</span>' +
            '<span class="vocab-cw-header-sep">—</span>' +
            '<span class="vocab-cw-header-lesson">' + self._escapeHTML(lessonTitle) + '</span>' +
            '<span class="vocab-cw-level-badge vocab-cw-lvl-' + self._escapeHTML(levelId.toLowerCase()) + '">' + self._escapeHTML(levelId) + '</span>' +
          '</div>' +
          '<div class="vocab-cw-header-btns">' +
            '<button class="vocab-cw-btn vocab-cw-mode-btn vocab-cw-cw-mode-btn vocab-cw-cw-mode-btn-active" id="cw-crossword-btn">' + _mi('grid_on') + '<span>Crossword</span></button>' +
            '<button class="vocab-cw-btn vocab-cw-mode-btn vocab-cw-wordle-btn" id="cw-wordle-btn">' + _mi('casino') + '<span>Wordle</span></button>' +
            '<button class="vocab-cw-btn vocab-cw-hint-btn" id="cw-hint-btn">' + _mi('lightbulb') + '<span>Hint</span></button>' +
            '<button class="vocab-cw-btn vocab-cw-solve-btn" id="cw-solve-btn">' + _mi('auto_fix') + '<span>Solve</span></button>' +
            '<button class="vocab-cw-btn vocab-cw-reset-btn" id="cw-reset-btn">' + _mi('refresh') + '<span>Reset</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="vocab-cw-active-def" id="cw-active-def"><em>Click a clue to begin</em></div>' +
        '<div class="vocab-cw-board">' +
          '<div class="vocab-cw-grid-outer">' +
            '<div class="vocab-cw-grid-wrap" id="cw-grid-wrap">' +
              '<div class="vocab-cw-grid" id="cw-grid" style="grid-template-columns:repeat(' + cols + ',var(--cw-cell-size,36px))">' +
                gridHtml +
              '</div>' +
            '</div>' +
            '<div class="vocab-cw-wordle-area" id="cw-wordle-area" style="display:none"></div>' +
          '</div>' +
          '<div class="vocab-cw-clues" id="cw-clues">' +
            '<div class="vocab-cw-clues-toggle">' +
              '<button class="vocab-cw-clues-tab vocab-cw-clues-tab-active" id="cw-tab-across" onclick="FastExercises._cwShowClueTab(\'across\')">ACROSS</button>' +
              '<button class="vocab-cw-clues-tab" id="cw-tab-down" onclick="FastExercises._cwShowClueTab(\'down\')">DOWN</button>' +
            '</div>' +
            '<div class="vocab-cw-clue-section" id="cw-clues-across">' +
              acrossClues.map(buildClue).join('') +
            '</div>' +
            '<div class="vocab-cw-clue-section" id="cw-clues-down" style="display:none">' +
              downClues.map(buildClue).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="vocab-cw-word-strip" id="cw-word-strip">' +
          '<div class="vocab-cw-strip-cells" id="cw-strip-cells"><span class="vocab-cw-strip-hint">Click a clue to select a word</span></div>' +
        '</div>' +
        '<input type="text" id="cw-strip-input" class="vocab-cw-strip-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Crossword letter input" />';

      var cwState = {
        userGrid: {},
        revealedCells: {},
        checkedCells: {},
        lockedCells: {},
        selectedCell: null,
        selectedDir: 'across',
        activeWord: null,
        activeStripPos: 0,
        wordleState: {},
        wordleMode: false,
        cwData: cwData,
        cellMap: cellMap,
        levelId: levelId,
        lessonId: lessonId,
        cwIndex: cwIndex
      };
      window._cwState = cwState;

      // Restore previously saved cell state so the user can continue where they left off
      if (savedState && savedState.cellState && typeof savedState.cellState === 'object') {
        var cellStateKeys = Object.keys(savedState.cellState);
        for (var sci = 0; sci < cellStateKeys.length; sci++) {
          var sck = cellStateKeys[sci];
          var letter = savedState.cellState[sck];
          if (typeof letter !== 'string' || !letter) continue;
          cwState.userGrid[sck] = letter.toUpperCase();
          var parts = sck.split(',');
          var sr = parseInt(parts[0]);
          var sc = parseInt(parts[1]);
          if (!isNaN(sr) && !isNaN(sc)) {
            var cellDom = document.getElementById('cw-cell-' + sr + '-' + sc);
            if (cellDom) {
              var letterSpan = cellDom.querySelector('.vocab-cw-cell-letter');
              if (letterSpan) letterSpan.textContent = letter.toUpperCase();
              cellDom.classList.add('vocab-cw-cell-filled');
            }
          }
        }
      }

      var gridEl = document.getElementById('cw-grid');
      if (gridEl) {
        gridEl.addEventListener('click', function(e) {
          var target = e.target;
          var r = parseInt(target.getAttribute('data-r'));
          var c = parseInt(target.getAttribute('data-c'));
          if (isNaN(r) || isNaN(c)) {
            var cellEl = target.parentElement;
            if (cellEl) {
              r = parseInt(cellEl.getAttribute('data-r'));
              c = parseInt(cellEl.getAttribute('data-c'));
            }
          }
          if (!isNaN(r) && !isNaN(c)) FastExercises._cwSelectCell(r, c);
        });
      }

      var stripInput = document.getElementById('cw-strip-input');
      if (stripInput) {
        stripInput.addEventListener('keydown', function(e) {
          FastExercises._cwKeyHandler(e);
        });
        // Mobile input fallback
        stripInput.addEventListener('input', function() {
          var val = stripInput.value;
          stripInput.value = '';
          if (val && /[a-zA-Z]/.test(val[val.length - 1])) {
            FastExercises._cwKeyHandler({ key: val[val.length - 1], preventDefault: function() {} });
          }
        });
      }

      var hintBtn = document.getElementById('cw-hint-btn');
      if (hintBtn) hintBtn.addEventListener('click', function() { FastExercises._cwHint(); });
      var solveBtn = document.getElementById('cw-solve-btn');
      if (solveBtn) solveBtn.addEventListener('click', function() { FastExercises._cwSolveWord(); });
      var resetBtn = document.getElementById('cw-reset-btn');
      if (resetBtn) resetBtn.addEventListener('click', function() { FastExercises._cwReset(); });
      var wordleBtn = document.getElementById('cw-wordle-btn');
      if (wordleBtn) wordleBtn.addEventListener('click', function() {
        if (window._cwState && !window._cwState.wordleMode) FastExercises._cwToggleWordleMode();
      });
      var crosswordBtn = document.getElementById('cw-crossword-btn');
      if (crosswordBtn) crosswordBtn.addEventListener('click', function() {
        if (window._cwState && window._cwState.wordleMode) FastExercises._cwToggleWordleMode();
      });

      var clueEls = document.querySelectorAll('.vocab-cw-clue');
      for (var ci = 0; ci < clueEls.length; ci++) {
        (function(clueEl) {
          clueEl.addEventListener('click', function() {
            var r2 = parseInt(clueEl.getAttribute('data-r'));
            var c2 = parseInt(clueEl.getAttribute('data-c'));
            var dir = clueEl.getAttribute('data-dir');
            if (window._cwState) window._cwState.selectedDir = dir;
            FastExercises._cwSelectCell(r2, c2, dir);
          });
        })(clueEls[ci]);
      }
    },

    _cwSelectCell: function(r, c, forceDir) {
      var state = window._cwState;
      if (!state) return;
      var grid = state.cwData.grid;
      var rows = state.cwData.rows;
      var cols = state.cwData.cols;
      if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === null) return;

      var key = r + ',' + c;
      var wordsHere = state.cellMap[key] || [];

      if (forceDir) {
        state.selectedDir = forceDir;
      } else if (state.selectedCell && state.selectedCell.r === r && state.selectedCell.c === c) {
        var otherDir = state.selectedDir === 'across' ? 'down' : 'across';
        var hasOther = wordsHere.some(function(p) { return p.dir === otherDir; });
        if (hasOther) state.selectedDir = otherDir;
      }

      var hasWordInDir = wordsHere.some(function(p) { return p.dir === state.selectedDir; });
      if (!hasWordInDir && wordsHere.length > 0) state.selectedDir = wordsHere[0].dir;

      state.selectedCell = { r: r, c: c };

      var cellEls = document.querySelectorAll('.vocab-cw-cell');
      for (var i = 0; i < cellEls.length; i++) cellEls[i].classList.remove('vocab-cw-cell-active', 'vocab-cw-cell-word');
      var clueEls = document.querySelectorAll('.vocab-cw-clue');
      for (var i = 0; i < clueEls.length; i++) clueEls[i].classList.remove('vocab-cw-clue-active');

      var activeWord = null;
      for (var i = 0; i < wordsHere.length; i++) {
        if (wordsHere[i].dir === state.selectedDir) { activeWord = wordsHere[i]; break; }
      }
      state.activeWord = activeWord;

      if (activeWord) {
        for (var i = 0; i < activeWord.word.length; i++) {
          var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
          var wc = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
          var wCellEl = document.getElementById('cw-cell-' + wr + '-' + wc);
          if (wCellEl) wCellEl.classList.add('vocab-cw-cell-word');
        }
        var clueEl = document.querySelector('.vocab-cw-clue[data-dir="' + activeWord.dir + '"][data-num="' + activeWord.number + '"]');
        if (clueEl) {
          clueEl.classList.add('vocab-cw-clue-active');
          FastExercises._cwShowClueTab(activeWord.dir);
          clueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // Set strip to first non-revealed position
        state.activeStripPos = 0;
        for (var i = 0; i < activeWord.word.length; i++) {
          var wr2 = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
          var wc2 = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
          if (!state.revealedCells[wr2 + ',' + wc2] && !state.lockedCells[wr2 + ',' + wc2]) { state.activeStripPos = i; break; }
        }
        FastExercises._cwRefreshActiveDef();
        FastExercises._cwUpdateWordStrip();
        if (state.wordleMode) FastExercises._cwRenderWordleView();
      }

      var activeCellEl = document.getElementById('cw-cell-' + r + '-' + c);
      if (activeCellEl) activeCellEl.classList.add('vocab-cw-cell-active');

      var stripInput = document.getElementById('cw-strip-input');
      if (stripInput) stripInput.focus();
    },

    _cwKeyHandler: function(e) {
      var state = window._cwState;
      if (!state) return;

      // Route to wordle handler when in wordle mode
      if (state.wordleMode) {
        FastExercises._cwWordleKeyHandler(e);
        return;
      }

      if (!state.activeWord) return;
      var activeWord = state.activeWord;
      var wordLen = activeWord.word.length;
      var pos = state.activeStripPos;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (state.selectedCell) {
          var tabKey = state.selectedCell.r + ',' + state.selectedCell.c;
          var tabWords = state.cellMap[tabKey] || [];
          var otherDir = state.selectedDir === 'across' ? 'down' : 'across';
          if (tabWords.some(function(p) { return p.dir === otherDir; })) {
            state.selectedDir = otherDir;
            FastExercises._cwSelectCell(state.selectedCell.r, state.selectedCell.c, otherDir);
          }
        }
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + pos;
        var wc = activeWord.dir === 'across' ? activeWord.col + pos : activeWord.col;
        var wkey = wr + ',' + wc;
        if (!state.revealedCells[wkey] && !state.lockedCells[wkey] && state.userGrid[wkey]) {
          delete state.userGrid[wkey];
          delete state.checkedCells[wkey];
          FastExercises._cwUpdateCell(wr, wc);
          FastExercises._cwUpdateStatus();
        } else if (pos > 0) {
          // Move back, skipping locked/revealed cells, then delete
          var newPos = pos - 1;
          while (newPos > 0) {
            var checkR = activeWord.dir === 'across' ? activeWord.row : activeWord.row + newPos;
            var checkC = activeWord.dir === 'across' ? activeWord.col + newPos : activeWord.col;
            if (!state.revealedCells[checkR + ',' + checkC] && !state.lockedCells[checkR + ',' + checkC]) break;
            newPos--;
          }
          var pr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + newPos;
          var pc = activeWord.dir === 'across' ? activeWord.col + newPos : activeWord.col;
          var pkey = pr + ',' + pc;
          if (!state.revealedCells[pkey] && !state.lockedCells[pkey]) {
            delete state.userGrid[pkey];
            delete state.checkedCells[pkey];
            FastExercises._cwUpdateCell(pr, pc);
            FastExercises._cwUpdateStatus();
            state.activeStripPos = newPos;
          }
        }
        FastExercises._cwUpdateWordStrip();
        FastExercises._cwRefreshActiveDef();
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        var wr2 = activeWord.dir === 'across' ? activeWord.row : activeWord.row + pos;
        var wc2 = activeWord.dir === 'across' ? activeWord.col + pos : activeWord.col;
        var ltKey = wr2 + ',' + wc2;
        if (!state.revealedCells[ltKey] && !state.lockedCells[ltKey]) {
          state.userGrid[ltKey] = e.key.toUpperCase();
          delete state.checkedCells[ltKey];
          FastExercises._cwUpdateCell(wr2, wc2);
          FastExercises._cwUpdateStatus();
          FastExercises._cwRefreshActiveDef();
        }
        // Advance to next non-revealed, non-locked position
        var nextPos = pos + 1;
        while (nextPos < wordLen) {
          var nr3 = activeWord.dir === 'across' ? activeWord.row : activeWord.row + nextPos;
          var nc3 = activeWord.dir === 'across' ? activeWord.col + nextPos : activeWord.col;
          if (!state.revealedCells[nr3 + ',' + nc3] && !state.lockedCells[nr3 + ',' + nc3]) break;
          nextPos++;
        }
        if (nextPos < wordLen) state.activeStripPos = nextPos;
        FastExercises._cwUpdateWordStrip();
        // Update active cell highlight on grid
        var newCr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + state.activeStripPos;
        var newCc = activeWord.dir === 'across' ? activeWord.col + state.activeStripPos : activeWord.col;
        var allCellEls = document.querySelectorAll('.vocab-cw-cell');
        for (var i = 0; i < allCellEls.length; i++) allCellEls[i].classList.remove('vocab-cw-cell-active');
        var newActiveCellEl = document.getElementById('cw-cell-' + newCr + '-' + newCc);
        if (newActiveCellEl) newActiveCellEl.classList.add('vocab-cw-cell-active');
        // Auto-check when word is fully filled
        if (nextPos >= wordLen) FastExercises._cwAutoCheckWord();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (pos > 0) FastExercises._cwSelectStripPos(pos - 1);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (pos < wordLen - 1) FastExercises._cwSelectStripPos(pos + 1);
        return;
      }
    },


    _cwUpdateCell: function(r, c) {
      var state = window._cwState;
      if (!state) return;
      var key = r + ',' + c;
      var cellEl = document.getElementById('cw-cell-' + r + '-' + c);
      if (!cellEl) return;
      var letterEl = cellEl.querySelector('.vocab-cw-cell-letter');
      if (letterEl) letterEl.textContent = state.userGrid[key] || '';
      cellEl.classList.remove('vocab-cw-cell-correct', 'vocab-cw-cell-incorrect', 'vocab-cw-cell-revealed', 'vocab-cw-cell-locked');
      if (state.lockedCells[key]) cellEl.classList.add('vocab-cw-cell-locked');
      else if (state.revealedCells[key]) cellEl.classList.add('vocab-cw-cell-revealed');
      else if (state.checkedCells[key] === 'correct') cellEl.classList.add('vocab-cw-cell-correct');
      else if (state.checkedCells[key] === 'incorrect') cellEl.classList.add('vocab-cw-cell-incorrect');
    },

    _cwHint: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;

      if (state.wordleMode) {
        var wordKey = activeWord.dir + '_' + activeWord.number;
        if (!state.wordleState[wordKey]) {
          state.wordleState[wordKey] = {
            guesses: [], results: [], solved: false, currentInput: '',
            confirmedLetters: new Array(activeWord.word.length).fill(null),
            hintedPositions: [],
            hintMessage: null
          };
        }
        var ws = state.wordleState[wordKey];
        if (ws.solved) return;
        var pos = ws.currentInput.length;
        if (pos >= activeWord.word.length) return;
        ws.hintedPositions = ws.hintedPositions || [];
        ws.hintedPositions.push(pos);
        ws.currentInput += activeWord.word[pos];
        ws.confirmedLetters[pos] = activeWord.word[pos];
        FastExercises._cwRenderWordleView();
        return;
      }

      var candidates = [];
      for (var i = 0; i < activeWord.word.length; i++) {
        var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
        var wc = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
        var wkey = wr + ',' + wc;
        if (!state.revealedCells[wkey] && !state.lockedCells[wkey] && state.userGrid[wkey] !== activeWord.word[i]) {
          candidates.push({ r: wr, c: wc, letter: activeWord.word[i], key: wkey });
        }
      }
      if (candidates.length === 0) return;
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      state.userGrid[pick.key] = pick.letter;
      state.revealedCells[pick.key] = true;
      delete state.checkedCells[pick.key];
      FastExercises._cwUpdateCell(pick.r, pick.c);
      FastExercises._cwUpdateWordStrip();
      FastExercises._cwUpdateStatus();
      FastExercises._cwRefreshActiveDef();
    },

    _cwSolveWord: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;
      if (state.wordleMode) {
        var wordKey = activeWord.dir + '_' + activeWord.number;
        if (!state.wordleState[wordKey]) {
          state.wordleState[wordKey] = {
            guesses: [], results: [], solved: false, currentInput: '',
            confirmedLetters: new Array(activeWord.word.length).fill(null),
            hintedPositions: [],
            hintMessage: null
          };
        }
        var ws = state.wordleState[wordKey];
        if (ws.solved) return;
        for (var pos = 0; pos < activeWord.word.length; pos++) {
          if (!ws.confirmedLetters[pos]) {
            ws.hintedPositions = ws.hintedPositions || [];
            ws.hintedPositions.push(pos);
            ws.confirmedLetters[pos] = activeWord.word[pos];
          }
        }
        ws.currentInput = activeWord.word;
        FastExercises._cwRenderWordleView();
        return;
      }
      for (var i = 0; i < activeWord.word.length; i++) {
        var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
        var wc = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
        var wkey = wr + ',' + wc;
        if (!state.lockedCells[wkey]) {
          state.userGrid[wkey] = activeWord.word[i];
          state.revealedCells[wkey] = true;
          delete state.checkedCells[wkey];
          FastExercises._cwUpdateCell(wr, wc);
        }
      }
      FastExercises._cwUpdateWordStrip();
      FastExercises._cwUpdateStatus();
      FastExercises._cwRefreshActiveDef();
    },

    _cwCheck: function() {
      var state = window._cwState;
      if (!state) return;
      var grid = state.cwData.grid;
      var rows = state.cwData.rows;
      var cols = state.cwData.cols;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (grid[r][c] === null) continue;
          var key = r + ',' + c;
          if (state.revealedCells[key]) continue;
          if (state.userGrid[key]) {
            state.checkedCells[key] = state.userGrid[key] === grid[r][c] ? 'correct' : 'incorrect';
          }
          FastExercises._cwUpdateCell(r, c);
        }
      }
      FastExercises._cwUpdateStatus();
      FastExercises._cwUpdateWordStrip();
      FastExercises._cwRefreshActiveDef();
    },

    _cwReset: function() {
      var state = window._cwState;
      if (!state) return;
      var grid = state.cwData.grid;
      var rows = state.cwData.rows;
      var cols = state.cwData.cols;
      state.userGrid = {};
      state.checkedCells = {};
      state.revealedCells = {};
      state.lockedCells = {};
      state.wordleState = {};
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (grid[r][c] === null) continue;
          FastExercises._cwUpdateCell(r, c);
        }
      }
      FastExercises._cwUpdateStatus();
      FastExercises._cwUpdateWordStrip();
      FastExercises._cwRefreshActiveDef();
    },

    _cwUpdateStatus: function() {
      var state = window._cwState;
      if (!state) return;
      var placed = state.cwData.placed;
      var complete = 0;
      placed.forEach(function(p) {
        var wordComplete = true;
        for (var i = 0; i < p.word.length; i++) {
          var r = p.dir === 'across' ? p.row : p.row + i;
          var c = p.dir === 'across' ? p.col + i : p.col;
          if (state.userGrid[r + ',' + c] !== p.word[i]) { wordComplete = false; break; }
        }
        if (wordComplete) complete++;
      });

      // Persist progress
      if (state.levelId) {
        var pKey = state.cwIndex !== undefined
          ? state.levelId + '_cw' + state.cwIndex
          : state.levelId + '_' + state.lessonId;
        if (typeof CrosswordSync !== 'undefined') {
          CrosswordSync.save(pKey, {
            level:        state.levelId,
            cwIndex:      state.cwIndex !== undefined ? state.cwIndex : 0,
            completed:    complete === placed.length,
            wordsCorrect: complete,
            wordsTotal:   placed.length,
            cellState:    state.userGrid || {}
          });
        } else {
          // Guest fallback
          try {
            var key = 'cambridge_crossword_progress';
            var progressData = JSON.parse(localStorage.getItem(key)) || {};
            progressData[pKey] = {
              wordsComplete: complete,
              wordsTotal: placed.length,
              completed: complete === placed.length,
              lastPlayed: new Date().toISOString()
            };
            localStorage.setItem(key, JSON.stringify(progressData));
          } catch(e) { /* ignore */ }
        }
      }
    },

    _cwIsWordComplete: function(word, state) {
      for (var i = 0; i < word.word.length; i++) {
        var r = word.dir === 'across' ? word.row : word.row + i;
        var c = word.dir === 'across' ? word.col + i : word.col;
        if (state.userGrid[r + ',' + c] !== word.word[i]) return false;
      }
      return true;
    },

    _cwRefreshActiveDef: function() {
      var state = window._cwState;
      if (!state) return;
      var defEl = document.getElementById('cw-active-def');
      if (!defEl) return;
      var activeWord = state.activeWord;
      if (!activeWord) {
        defEl.innerHTML = '<em>Click a clue to begin</em>';
        return;
      }
      var wordSolved = FastExercises._cwIsWordComplete(activeWord, state);
      var rawClue = activeWord.clue || activeWord.definition || '';
      var pipe = rawClue.indexOf(' | ');
      var displayClue = (pipe !== -1 && !wordSolved) ? rawClue.slice(pipe + 3) : rawClue;
      var typeLabels = { 'vocabulary': 'vocab', 'collocation': 'coloc', 'phrasal-verb': 'phrasal', 'idiom': 'idiom' };
      var typeBadgeHtml = '';
      if (activeWord.type) {
        var tl = typeLabels[activeWord.type] || activeWord.type;
        typeBadgeHtml = ' <span class="vocab-cw-type-badge vocab-cw-type-' + FastExercises._escapeHTML(activeWord.type) + '">' + tl + '</span>';
      }
      defEl.innerHTML =
        '<span class="vocab-cw-active-num">' + activeWord.number + (activeWord.dir === 'across' ? 'A' : 'D') + '</span> ' +
        FastExercises._escapeHTML(displayClue) + typeBadgeHtml +
        (wordSolved
          ? ' <strong class="vocab-cw-active-word">→ ' + FastExercises._escapeHTML(activeWord.word.toLowerCase()) + '</strong>'
          : '');
    },

    _cwUpdateWordStrip: function() {
      var state = window._cwState;
      var stripCells = document.getElementById('cw-strip-cells');
      if (!stripCells || !state) return;
      var activeWord = state.activeWord;
      if (!activeWord) {
        stripCells.innerHTML = '<span class="vocab-cw-strip-hint">Click a clue to select a word</span>';
        return;
      }
      var html = '';
      var wordLen = activeWord.word.length;
      for (var i = 0; i < wordLen; i++) {
        var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
        var wc = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
        var wkey = wr + ',' + wc;
        var letter = state.userGrid[wkey] || '';
        var isRevealed = !!state.revealedCells[wkey];
        var isCorrect = state.checkedCells[wkey] === 'correct';
        var isIncorrect = state.checkedCells[wkey] === 'incorrect';
        var isActive = (state.activeStripPos === i);
        var isLocked = !!state.lockedCells[wkey];
        var cls = 'vocab-cw-strip-cell';
        if (isLocked) cls += ' vocab-cw-strip-cell-locked';
        else if (isActive) cls += ' vocab-cw-strip-cell-active';
        if (!isLocked) {
          if (isRevealed) cls += ' vocab-cw-strip-cell-revealed';
          else if (isCorrect) cls += ' vocab-cw-strip-cell-correct';
          else if (isIncorrect) cls += ' vocab-cw-strip-cell-incorrect';
          else if (letter) cls += ' vocab-cw-strip-cell-filled';
        }
        html += '<div class="' + cls + '" data-pos="' + i + '" onclick="FastExercises._cwSelectStripPos(' + i + ')">' +
          (letter || '') +
        '</div>';
      }
      stripCells.innerHTML = html;
    },

    _cwSelectStripPos: function(pos) {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var wordLen = state.activeWord.word.length;
      if (pos < 0 || pos >= wordLen) return;
      var wr = state.activeWord.dir === 'across' ? state.activeWord.row : state.activeWord.row + pos;
      var wc = state.activeWord.dir === 'across' ? state.activeWord.col + pos : state.activeWord.col;
      if (state.revealedCells[wr + ',' + wc] || state.lockedCells[wr + ',' + wc]) return;
      state.activeStripPos = pos;
      FastExercises._cwUpdateWordStrip();
      // Sync active cell on grid
      var allCells = document.querySelectorAll('.vocab-cw-cell');
      for (var i = 0; i < allCells.length; i++) allCells[i].classList.remove('vocab-cw-cell-active');
      var cellEl = document.getElementById('cw-cell-' + wr + '-' + wc);
      if (cellEl) cellEl.classList.add('vocab-cw-cell-active');
      var stripInput = document.getElementById('cw-strip-input');
      if (stripInput) stripInput.focus();
    },

    // ── AUTO-CHECK (crossword) ──────────────────────────────────────────────

    _cwAutoCheckWord: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;
      var wordLen = activeWord.word.length;
      // Only run if all non-locked, non-revealed cells are filled
      for (var i = 0; i < wordLen; i++) {
        var r0 = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
        var c0 = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
        var k0 = r0 + ',' + c0;
        if (!state.lockedCells[k0] && !state.revealedCells[k0] && !state.userGrid[k0]) return;
      }
      var allCorrect = true;
      for (var i = 0; i < wordLen; i++) {
        var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
        var wc = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
        var wkey = wr + ',' + wc;
        if (state.lockedCells[wkey] || state.revealedCells[wkey]) continue;
        var correct = (state.userGrid[wkey] === activeWord.word[i]);
        state.checkedCells[wkey] = correct ? 'correct' : 'incorrect';
        if (!correct) allCorrect = false;
        FastExercises._cwUpdateCell(wr, wc);
      }
      if (allCorrect) {
        for (var i = 0; i < wordLen; i++) {
          var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
          var wc = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
          var wkey = wr + ',' + wc;
          if (!state.lockedCells[wkey]) {
            state.lockedCells[wkey] = true;
            delete state.checkedCells[wkey];
            FastExercises._cwUpdateCell(wr, wc);
          }
        }
      }
      FastExercises._cwUpdateWordStrip();
      FastExercises._cwUpdateStatus();
      FastExercises._cwRefreshActiveDef();
    },

    // ── WORDLE MODE ─────────────────────────────────────────────────────────

    _cwToggleWordleMode: function() {
      var state = window._cwState;
      if (!state) return;
      state.wordleMode = !state.wordleMode;

      var gridWrap   = document.getElementById('cw-grid-wrap');
      var wordleArea = document.getElementById('cw-wordle-area');
      var wordStrip  = document.getElementById('cw-word-strip');
      var wordleBtn  = document.getElementById('cw-wordle-btn');
      var crosswordBtn = document.getElementById('cw-crossword-btn');

      if (state.wordleMode) {
        // Save grid width before hiding it
        if (gridWrap && wordleArea) {
          var gw = gridWrap.offsetWidth;
          if (gw > 0) wordleArea.style.minWidth = gw + 'px';
        }
        if (gridWrap)    gridWrap.style.display   = 'none';
        if (wordStrip)   wordStrip.style.display   = 'none';
        if (wordleArea)  wordleArea.style.display  = '';
        if (wordleBtn)   wordleBtn.classList.add('vocab-cw-mode-btn-active');
        if (crosswordBtn) { crosswordBtn.classList.remove('vocab-cw-mode-btn-active'); crosswordBtn.classList.remove('vocab-cw-cw-mode-btn-active'); }
        // Ensure a word is selected
        if (!state.activeWord && state.cwData.placed.length > 0) {
          var fw = state.cwData.placed[0];
          state.selectedDir = fw.dir;
          FastExercises._cwSelectCell(fw.row, fw.col, fw.dir);
        } else {
          FastExercises._cwRenderWordleView();
        }
      } else {
        // Apply confirmed green letters from all solved wordle words
        Object.keys(state.wordleState).forEach(function(wordKey) {
          var ws = state.wordleState[wordKey];
          if (!ws || !ws.confirmedLetters) return;
          var parts = wordKey.split('_');
          var wdir = parts[0];
          var wnum = parseInt(parts[1]);
          var wordData = null;
          state.cwData.placed.forEach(function(p) {
            if (p.dir === wdir && p.number === wnum) wordData = p;
          });
          if (!wordData) return;
          ws.confirmedLetters.forEach(function(letter, idx) {
            if (!letter) return;
            var wr = wordData.dir === 'across' ? wordData.row : wordData.row + idx;
            var wc = wordData.dir === 'across' ? wordData.col + idx : wordData.col;
            var wkey = wr + ',' + wc;
            if (!state.revealedCells[wkey] && !state.lockedCells[wkey]) {
              state.userGrid[wkey] = letter;
              state.checkedCells[wkey] = 'correct';
            }
          });
        });
        // Refresh all grid cells
        var grid = state.cwData.grid;
        for (var r = 0; r < state.cwData.rows; r++) {
          for (var c = 0; c < state.cwData.cols; c++) {
            if (grid[r][c] !== null) FastExercises._cwUpdateCell(r, c);
          }
        }
        if (gridWrap)    gridWrap.style.display   = '';
        if (wordStrip)   wordStrip.style.display   = '';
        if (wordleArea)  wordleArea.style.display  = 'none';
        if (wordleBtn)   wordleBtn.classList.remove('vocab-cw-mode-btn-active');
        if (crosswordBtn) { crosswordBtn.classList.add('vocab-cw-mode-btn-active'); crosswordBtn.classList.add('vocab-cw-cw-mode-btn-active'); }
        FastExercises._cwUpdateWordStrip();
        FastExercises._cwRefreshActiveDef();
        FastExercises._cwUpdateStatus();
      }
    },

    _cwRenderWordleView: function() {
      var state = window._cwState;
      var wordleArea = document.getElementById('cw-wordle-area');
      if (!state || !wordleArea) return;
      var activeWord = state.activeWord;
      if (!activeWord) {
        wordleArea.innerHTML = '<div class="vocab-cw-wordle-empty">Select a clue to play Wordle</div>';
        return;
      }
      var wordKey = activeWord.dir + '_' + activeWord.number;
      if (!state.wordleState[wordKey]) {
        state.wordleState[wordKey] = {
          guesses: [],
          results: [],
          solved: false,
          currentInput: '',
          confirmedLetters: new Array(activeWord.word.length).fill(null),
          hintedPositions: [],
          hintMessage: null
        };
      }
      var ws = state.wordleState[wordKey];
      var wordLen = activeWord.word.length;
      var MAX_GUESSES = 6;

      var rowsHtml = '';
      for (var g = 0; g < ws.guesses.length; g++) {
        var guess = ws.guesses[g];
        var result = ws.results[g];
        rowsHtml += '<div class="vocab-cw-wordle-row">';
        for (var i = 0; i < wordLen; i++) {
          rowsHtml += '<div class="vocab-cw-wordle-box wdl-' + (result[i] || 'gray') + '">' + (guess[i] || '') + '</div>';
        }
        rowsHtml += '</div>';
      }
      if (!ws.solved && ws.guesses.length < MAX_GUESSES) {
        rowsHtml += '<div class="vocab-cw-wordle-row vocab-cw-wordle-cur-row">';
        for (var i = 0; i < wordLen; i++) {
          var ltr = ws.currentInput[i] || '';
          var boxCls = 'vocab-cw-wordle-box wdl-empty' + (i === ws.currentInput.length ? ' wdl-cur' : '');
          if (ltr && ws.hintedPositions && ws.hintedPositions.indexOf(i) >= 0) boxCls += ' wdl-hint';
          rowsHtml += '<div class="' + boxCls + '">' + ltr + '</div>';
        }
        rowsHtml += '</div>';
        for (var g2 = ws.guesses.length + 1; g2 < MAX_GUESSES; g2++) {
          rowsHtml += '<div class="vocab-cw-wordle-row">';
          for (var i = 0; i < wordLen; i++) rowsHtml += '<div class="vocab-cw-wordle-box wdl-empty"></div>';
          rowsHtml += '</div>';
        }
      }

      var msgHtml = ws.solved
        ? '<span class="vocab-cw-wordle-solved">' + _mi('check_circle') + ' Solved!</span>'
        : (ws.guesses.length >= MAX_GUESSES
            ? '<span class="vocab-cw-wordle-failed">Answer: <strong>' + FastExercises._escapeHTML(activeWord.word.toLowerCase()) + '</strong></span>'
            : '');

      var actionsHtml = '';
      if (!ws.solved && ws.guesses.length < MAX_GUESSES) {
        actionsHtml += '<button class="vocab-cw-btn vocab-cw-wordle-submit-btn" onclick="FastExercises._cwWordleSubmit()">' + _mi('send') + '<span>Submit</span></button>';
      }
      actionsHtml += '<button class="vocab-cw-btn vocab-cw-wordle-reset-btn" onclick="FastExercises._cwWordleReset()">' + _mi('restart_alt') + '<span>Retry</span></button>';

      wordleArea.innerHTML =
        '<div class="vocab-cw-wordle-info">' +
          '<span class="vocab-cw-active-num">' + activeWord.number + (activeWord.dir === 'across' ? 'A' : 'D') + '</span> ' +
          '<span class="vocab-cw-wordle-len">' + wordLen + ' letters</span>' +
        '</div>' +
        '<div class="vocab-cw-wordle-grid">' + rowsHtml + '</div>' +
        '<div class="vocab-cw-wordle-actions">' + actionsHtml + '</div>' +
        '<div class="vocab-cw-wordle-msg">' + msgHtml + '</div>';

      var stripInput = document.getElementById('cw-strip-input');
      if (stripInput) stripInput.focus();
    },

    _cwWordleKeyHandler: function(e) {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;
      var wordKey = activeWord.dir + '_' + activeWord.number;
      var ws = state.wordleState[wordKey];
      if (!ws || ws.solved || ws.guesses.length >= 6) return;
      var wordLen = activeWord.word.length;

      if (e.key === 'Enter') {
        e.preventDefault();
        FastExercises._cwWordleSubmit();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (ws.currentInput.length > 0) {
          var removedPos = ws.currentInput.length - 1;
          ws.currentInput = ws.currentInput.slice(0, -1);
          if (ws.hintedPositions) {
            var hi = ws.hintedPositions.indexOf(removedPos);
            if (hi >= 0) ws.hintedPositions.splice(hi, 1);
          }
          FastExercises._cwRenderWordleView();
        }
        return;
      }
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        if (ws.currentInput.length < wordLen) {
          ws.currentInput += e.key.toUpperCase();
          FastExercises._cwRenderWordleView();
        }
        return;
      }
    },

    _cwWordleSubmit: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;
      var wordKey = activeWord.dir + '_' + activeWord.number;
      var ws = state.wordleState[wordKey];
      if (!ws || ws.solved || ws.guesses.length >= 6) return;
      var wordLen = activeWord.word.length;
      if (ws.currentInput.length < wordLen) {
        var msgEl = document.querySelector('.vocab-cw-wordle-msg');
        if (msgEl) {
          msgEl.innerHTML = '<span style="color:#ef4444">Enter ' + wordLen + ' letters</span>';
          setTimeout(function() { FastExercises._cwRenderWordleView(); }, 1200);
        }
        return;
      }
      var guess = ws.currentInput;
      var result = FastExercises._cwEvalWordle(guess, activeWord.word);
      ws.guesses.push(guess);
      ws.results.push(result);
      result.forEach(function(r, i) {
        if (r === 'green') ws.confirmedLetters[i] = guess[i];
      });
      var allGreen = result.every(function(r) { return r === 'green'; });
      if (allGreen) {
        ws.solved = true;
        for (var i = 0; i < wordLen; i++) {
          var wr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
          var wc = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
          state.userGrid[wr + ',' + wc] = guess[i];
          state.checkedCells[wr + ',' + wc] = 'correct';
        }
        FastExercises._cwUpdateStatus();
      }
      ws.currentInput = '';
      FastExercises._cwRenderWordleView();
    },

    _cwWordleReset: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;
      var wordKey = activeWord.dir + '_' + activeWord.number;
      delete state.wordleState[wordKey];
      FastExercises._cwRenderWordleView();
    },

    _showDictionariesHome: function() {
      var existing = document.getElementById('dict-home-modal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'dict-home-modal';
      modal.className = 'dict-home-overlay';
      modal.innerHTML =
        '<div class="dict-home-box">' +
          '<div class="dict-home-header">' +
            '<span class="dict-home-icon"><span class="material-symbols-outlined">menu_book</span></span>' +
            '<h2 class="dict-home-title">Dictionaries</h2>' +
            '<button class="dict-home-close" onclick="document.getElementById(\'dict-home-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="dict-home-grid">' +
            '<button class="dict-home-card" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showGeneralDictionary();">' +
              '<span class="dict-home-card-icon" style="background:#6d28d9"><span class="material-symbols-outlined">search</span></span>' +
              '<span class="dict-home-card-name">General Dictionary</span>' +
              '<span class="dict-home-card-desc">Look up any word or phrasal verb</span>' +
            '</button>' +
            '<button class="dict-home-card" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showVocabDictionary();">' +
              '<span class="dict-home-card-icon" style="background:#0ea5e9"><span class="material-symbols-outlined">library_books</span></span>' +
              '<span class="dict-home-card-name">Vocabulary</span>' +
              '<span class="dict-home-card-desc">Cambridge exam vocabulary by level</span>' +
            '</button>' +
            '<button class="dict-home-card" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showWfDictionary();">' +
              '<span class="dict-home-card-icon" style="background:#e11d48"><span class="material-symbols-outlined">text_fields</span></span>' +
              '<span class="dict-home-card-name">Word Formation</span>' +
              '<span class="dict-home-card-desc">Prefixes, suffixes and derived forms</span>' +
            '</button>' +
            '<button class="dict-home-card" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showPvDictionary();">' +
              '<span class="dict-home-card-icon" style="background:#3b82f6"><span class="material-symbols-outlined">auto_stories</span></span>' +
              '<span class="dict-home-card-name">Phrasal Verbs</span>' +
              '<span class="dict-home-card-desc">Phrasal verbs with meanings and examples</span>' +
            '</button>' +
            '<button class="dict-home-card" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showIdDictionary();">' +
              '<span class="dict-home-card-icon" style="background:#f59e0b"><span class="material-symbols-outlined">record_voice_over</span></span>' +
              '<span class="dict-home-card-name">Idioms</span>' +
              '<span class="dict-home-card-desc">Common idioms with usage and examples</span>' +
            '</button>' +
            '<button class="dict-home-card" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showCollocDictionary();">' +
              '<span class="dict-home-card-icon" style="background:#10b981"><span class="material-symbols-outlined">format_quote</span></span>' +
              '<span class="dict-home-card-name">Collocations</span>' +
              '<span class="dict-home-card-desc">Word combinations and collocations</span>' +
            '</button>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);
    },

    _cwEvalWordle: function(guess, target) {
      var result = new Array(guess.length).fill('gray');
      var targetArr = target.split('');
      var guessArr  = guess.split('');
      for (var i = 0; i < guessArr.length; i++) {
        if (guessArr[i] === targetArr[i]) {
          result[i] = 'green';
          targetArr[i] = null;
          guessArr[i]  = null;
        }
      }
      for (var i = 0; i < guessArr.length; i++) {
        if (guessArr[i] === null) continue;
        var ti = targetArr.indexOf(guessArr[i]);
        if (ti !== -1) {
          result[i] = 'yellow';
          targetArr[ti] = null;
        }
      }
      return result;
    }

  };
})();
