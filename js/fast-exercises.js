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
  var CW_CLUE_SEP = ' | ';     // Separator between definition and fill-in-blank in clue text

  // Human-readable short labels for each crossword word type
  var CW_TYPE_LABELS = { 'vocabulary': 'vocab', 'collocation': 'coloc', 'phrasal-verb': 'phrasal', 'idiom': 'idiom' };

  // Max scrollHeight (px) for a single-row dots row; taller means the dots wrapped
  var DOTS_SINGLE_ROW_MAX_HEIGHT = 56;

  // Levels available for mixed crosswords and their crossword counts
  var CW_LEVEL_CONFIG = [
    { id: 'A2',  count: 100 },
    { id: 'B1',  count: 100 },
    { id: 'B2',  count: 100 },
    { id: 'C1',  count: 100 },
    { id: 'mix', count: 100 }
  ];

  var WL_LEVEL_CONFIG = [
    { id: 'A2',  count: 0 },
    { id: 'B1',  count: 0 },
    { id: 'B2',  count: 0 },
    { id: 'C1',  count: 0 }
  ];

  var WL_PROGRESS_KEY = 'cambridge_wordle_progress';
  var _wlManifestPromise = null;

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
  function _backButtonContent(label) {
    return '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span class="icon-btn-label">' + (label || 'Back') + '</span>';
  }
  function _symbolButtonContent(icon, label) {
    return '<span class="material-symbols-outlined" aria-hidden="true">' + icon + '</span><span class="visually-hidden">' + label + '</span>';
  }

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
      if (typeof SyncManager !== 'undefined' && SyncManager.notifyFastLearningDirty) {
        SyncManager.notifyFastLearningDirty();
      }
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

    // Text-to-Speech using the Web Speech API (en-GB, no external API)
    _speakWord: function(word) {
      if (!word || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(word.trim());
      utter.lang = 'en-GB';
      utter.rate = 0.85;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
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
      var sidebars = { left: '', right: '' };
      if (typeof BentoGrid !== 'undefined') {
        sidebars = BentoGrid._buildDashboardSidebars(window.EXAMS_DATA[AppState.currentLevel || 'C1'] || [], { includeGradeTracker: true });
      }
      var leftSidebarContent = sidebars.left;
      var rightSidebarContent = sidebars.right;

      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="fe-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="loadDashboard()" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
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
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
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
      var _backFn = _isCourseCategory ? 'BentoGrid.openCourseSection(\'vocabulary\')' : 'FastExercises.openCategories()';

      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftWidget)
            : '<div class="dashboard-left-sidebar">' + leftWidget + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="fe-section">' +
              '<div class="subpage-header subpage-header--with-levels">' +
                '<button class="subpage-back-btn" onclick="' + _backFn + '" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
                '<div class="subpage-header-core">' +
                  '<div class="subpage-header-titles">' +
                    '<div class="subpage-title">' + _mi(catMeta.icon) + ' ' + this._escapeHTML(data.name || catMeta.name) + '</div>' +
                    '<div class="subpage-subtitle">' + 'Level Progress' + ' — ' + activeLevel + '</div>' +
                  '</div>' +
                  this._buildSubpageLevelRow(catMeta, data, activeLevel) +
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
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      var catState = { view: 'fastExerciseCategory', categoryId: categoryId };
      history.pushState(catState, '', Router.stateToPath(catState));
      var self = this;
      requestAnimationFrame(function() { self._compactDots(); });
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
          _mi('refresh') + ' ' + 'Reset Level' +
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
      var _mobileMap =
        typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches;

      var level = null;
      for (var i = 0; i < data.levels.length; i++) {
        if (data.levels[i].id === activeLevel) { level = data.levels[i]; break; }
      }
      if (!level || !level.lessons || level.lessons.length === 0) {
        return '<div class="fe-map-empty">' + 'No lessons available for this level yet.' + '</div>';
      }

      var totalLessons = level.lessons.length;
      var isCourseVocabCategory = ['phrasal-verbs', 'idioms', 'word-formation'].indexOf(catMeta.id) !== -1;
      /* Course vocabulary categories show every lesson in one vertical path. */
      var LESSONS_PER_PAGE = (_mobileMap || isCourseVocabCategory) ? totalLessons : 4;
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
      html += '<button type="button" class="fe-map-mobile-back subpage-back-btn" onclick="FastExercises._closeMobileLessonRoadmap()" aria-label="' + 'Lessons' + '">' + _backButtonContent('Lessons') + '</button>';

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

          html += '<div class="fe-map-lesson ' + lessonClass + '" data-lesson-global-idx="' + li + '">' +
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
                var reviewIcon = (isAccessible || isDone) ? _mi('rate_review') : _mi('lock');
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
                dotIcon = _mi('article');
              } else if (point.type === 'exercise') {
                dotClass += ' fe-dot-exercise';
                dotIcon = _mi('fitness_center');
              } else if (point.type === 'trophy') {
                dotClass += ' fe-dot-trophy';
                dotIcon = _mi('emoji_events');
              } else if (point.type === 'pv-gallery') {
                dotClass += ' fe-dot-pv-gallery';
                dotIcon = _mi('collections_bookmark');
              } else if (point.type === 'pv-fill-in') {
                dotClass += ' fe-dot-pv-fill-in';
                dotIcon = _mi('edit');
              } else if (point.type === 'pv-conversations') {
                dotClass += ' fe-dot-pv-conv';
                dotIcon = _mi('forum');
              } else if (point.type === 'pv-conversation-drag') {
                dotClass += ' fe-dot-pv-drag';
                dotIcon = _mi('drag_indicator');
              } else if (point.type === 'pv-mixed') {
                dotClass += ' fe-dot-pv-mixed';
                dotIcon = _mi('shuffle');
              } else if (point.type === 'wf-explanation') {
                dotClass += ' fe-dot-wf-explanation';
                dotIcon = _mi('school');
              } else if (point.type === 'wf-multiple-choice') {
                dotClass += ' fe-dot-wf-multiple-choice';
                dotIcon = _mi('rule');
              } else if (point.type === 'wf-transform') {
                dotClass += ' fe-dot-wf-transform';
                dotIcon = _mi('transform');
              } else if (point.type === 'id-gallery') {
                dotClass += ' fe-dot-id-gallery';
                dotIcon = _mi('collections_bookmark');
              } else if (point.type === 'id-fill-in') {
                dotClass += ' fe-dot-id-fill-in';
                dotIcon = _mi('edit');
              } else if (point.type === 'id-conversations') {
                dotClass += ' fe-dot-id-conv';
                dotIcon = _mi('forum');
              } else if (point.type === 'id-conversation-drag') {
                dotClass += ' fe-dot-id-drag';
                dotIcon = _mi('drag_indicator');
              } else if (point.type === 'id-quiz') {
                dotClass += ' fe-dot-id-quiz';
                dotIcon = _mi('quiz');
              } else if (point.type === 'id-trophy') {
                dotClass += ' fe-dot-trophy';
                dotIcon = _mi('emoji_events');
              } else if (point.type === 'vocab-flashcards') {
                dotClass += ' fe-dot-vocab-flashcards';
                dotIcon = _mi('style');
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

    // ── COMPACT DOTS ─────────────────────────────────────────────────────
    // If a points row wraps to more than one line, shrink the dots to fit.
    _compactDots: function() {
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches) {
        document.querySelectorAll('.fe-map-points-row').forEach(function(row) {
          row.classList.remove('fe-dots-compact');
        });
        return;
      }
      var rows = document.querySelectorAll('.fe-map-points-row');
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        row.classList.remove('fe-dots-compact');
        if (row.scrollHeight > DOTS_SINGLE_ROW_MAX_HEIGHT) {
          row.classList.add('fe-dots-compact');
        }
      }
    },

    _mobileLessonTitleClick: function(e, categoryId, levelId, lessonGlobalIdx) {
      /* Mobile roadmap drill-in removed: lessons scroll in the map instead. */
    },

    _closeMobileLessonRoadmap: function() {
      var page = document.querySelector('.fe-map-page.fe-map-page-active');
      var container = page ? page.querySelector('.fe-map-container') : document.querySelector('.fe-map-container');
      var outer = document.querySelector('.fe-map-outer');
      if (outer) outer.classList.remove('fe-mobile-roadmap-active');
      var feSectionClose = document.querySelector('.dashboard-center .fe-section');
      if (feSectionClose) feSectionClose.classList.remove('fe-mobile-lesson-drill-active');
      if (container) {
        container.classList.remove('fe-mobile-roadmap-active');
        container.querySelectorAll('.fe-map-lesson').forEach(function(l) {
          l.classList.remove('fe-map-lesson-mobile-selected');
        });
        container.querySelectorAll('.fe-map-points-row').forEach(function(r) {
          r.classList.remove('fe-mobile-vertical-roadmap');
        });
      }
      requestAnimationFrame(function() { FastExercises._compactDots(); });
    },

    _attachHorizontalSwipe: function(element, onPrev, onNext) {
      if (!element || typeof onPrev !== 'function' || typeof onNext !== 'function') return;
      var sx = 0;
      var sy = 0;
      element.addEventListener('touchstart', function(ev) {
        if (!ev.touches || !ev.touches[0]) return;
        sx = ev.touches[0].clientX;
        sy = ev.touches[0].clientY;
      }, { passive: true });
      element.addEventListener('touchend', function(ev) {
        if (!ev.changedTouches || !ev.changedTouches[0]) return;
        var dx = ev.changedTouches[0].clientX - sx;
        var dy = ev.changedTouches[0].clientY - sy;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        if (dx < 0) onNext(); else onPrev();
      }, { passive: true });
    },

    // ── MAP PAGE NAVIGATION ───────────────────────────────────────────────
    _goToMapPage: function(pageIdx) {
      this._closeMobileLessonRoadmap();
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
      var self = this;
      requestAnimationFrame(function() { self._compactDots(); });
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
                    '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span class="icon-btn-label">Topics</span>' +
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

    /** Compact level pills for mobile subpage header (hidden on wide screens via CSS). */
    _buildSubpageLevelRow: function(catMeta, data, activeLevel) {
      if (!data || !data.levels) return '';
      var html = '';
      for (var i = 0; i < data.levels.length; i++) {
        var lv = data.levels[i];
        var isUnlocked = this._isLevelUnlocked(catMeta.id, lv.id, data.levels);
        var isActive = lv.id === activeLevel;
        var lockClass = isUnlocked ? '' : ' fe-subpage-lv-locked';
        var activeClass = isActive ? ' active' : '';
        var oc = isUnlocked ? 'onclick="FastExercises._switchLevel(\'' + catMeta.id + '\', \'' + lv.id + '\')"' : '';
        html += '<button type="button" class="fe-subpage-lv-btn' + activeClass + lockClass + '" style="--lv-color:' + catMeta.color + '" ' + oc + '>' + lv.id + '</button>';
      }
      return '<div class="fe-subpage-level-row">' + html + '</div>';
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

      // All complete - stay on current level; user must switch manually
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
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
              '<div class="subpage-header-titles">' +
                '<div class="subpage-title">' + _mi('quiz') + ' Quick Review</div>' +
                '<div class="subpage-subtitle">' + self._escapeHTML(catMeta.name) + ' · ' + activeLevel + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fe-exercise-card" style="--cat-color:' + catMeta.color + '">' +
              '<div class="fe-quiz-complete-section" style="display:block;">' +
                '<div class="fe-quiz-complete-icon">' + _mi('info') + '</div>' +
                '<div class="fe-quiz-complete-text">No exercises available for this level yet.</div>' +
                '<button class="fe-point-next-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')" aria-label="Back to map" style="background:' + catMeta.color + '">' + _backButtonContent('Map') + '</button>' +
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
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
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
                '<button class="fe-qr-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back to map">' + _backButtonContent('Map') + '</button>' +
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
                '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
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
                  _backButtonContent('Map') +
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
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + categoryId + '\')" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
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
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
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
              '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
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
            '<button class="subpage-back-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back">' + _backButtonContent('Back') + '</button>' +
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
        this._attachHorizontalSwipe(cardsArea, function() {
          FastExercises._idGalleryGoTo((FastExercises._idGalleryCurrentIdx || 0) - 1);
        }, function() {
          FastExercises._idGalleryGoTo((FastExercises._idGalleryCurrentIdx || 0) + 1);
        });
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
      requestAnimationFrame(function() {
        var nav = document.getElementById('id-gallery-nav');
        var dot = nav && nav.querySelector('.pv-gallery-nav-dot-active');
        if (dot && dot.scrollIntoView) dot.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
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
        this._attachHorizontalSwipe(slidesArea, function() {
          FastExercises._idConvGoTo((FastExercises._idConvCurrentIdx || 0) - 1);
        }, function() {
          FastExercises._idConvGoTo((FastExercises._idConvCurrentIdx || 0) + 1);
        });
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
      requestAnimationFrame(function() {
        var nav = document.getElementById('id-conv-nav');
        var dot = nav && nav.querySelector('.pv-gallery-nav-dot-active');
        if (dot && dot.scrollIntoView) dot.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
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
              '<div class="pv-chips-panel" id="id-chips-panel" data-total-gaps="' + totalGaps + '" data-filled="0">' +
                '<div class="pv-chips-title">' + 'Idioms' + ':</div>' +
                '<div class="pv-chips-list" id="id-chips-list">' + chipsHtml + '</div>' +
              '</div>' +
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
          '<button class="subpage-back-btn pv-sidebar-back" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back">' +
            _backButtonContent('Back') +
          '</button>' +
          '<div class="pv-sidebar-lesson-info">' +
            '<div class="pv-sidebar-lesson-info-header">' +
              '<div class="pv-sidebar-lesson-info-text">' +
                '<div class="pv-sidebar-lesson-name">' + self._escapeHTML(lessonTitle || '') + '</div>' +
                '<div class="pv-sidebar-level-label">' + self._escapeHTML(levelId || '') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button class="pv-sidebar-exit-btn" title="' + 'Back' + '" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="pv-sidebar-content" id="pv-sidebar-content">' +
          (exerciseDesc ? '<div class="pv-sidebar-exercise-desc">' + exerciseDesc + '</div>' : '') +
        '</div>' +
        '<div class="pv-sidebar-points">' + dotsHtml + '</div>' +
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
          '<button class="subpage-back-btn pv-sidebar-back" onclick="FastExercises.openCategory(\'' + self._jsStr(catMeta.id) + '\')" aria-label="Back">' +
            _backButtonContent('Back') +
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
        this._attachHorizontalSwipe(cardsArea, function() {
          FastExercises._pvGalleryGoTo((FastExercises._pvGalleryCurrentIdx || 0) - 1);
        }, function() {
          FastExercises._pvGalleryGoTo((FastExercises._pvGalleryCurrentIdx || 0) + 1);
        });
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
      requestAnimationFrame(function() {
        var nav = document.getElementById('pv-gallery-nav');
        var dot = nav && nav.querySelector('.pv-gallery-nav-dot-active');
        if (dot && dot.scrollIntoView) dot.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
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
      if (!questionsContainer) return;

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-correct';
          feedbackEl.innerHTML = _mi('check_circle') + ' ' + 'Correct' + '!';
        } else {
          feedbackEl.className = 'fe-quiz-feedback fe-quiz-feedback-wrong fe-quiz-feedback-stack';
          feedbackEl.innerHTML =
            '<div class="fe-quiz-feedback-wrong-line">' + _mi('cancel') + ' ' + 'Not quite.' + '</div>' +
            '<div class="fe-quiz-correct-answer-box">' +
              '<span class="fe-quiz-correct-label">' + 'Correct answer' + '</span>' +
              '<span class="fe-quiz-correct-value">' + self._escapeHTML(correctAnswer) + '</span>' +
            '</div>';
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

      var qEl = document.getElementById('fe-quiz-q-' + qIndex);
      if (qEl) {
        qEl.querySelectorAll('.fe-quiz-continue-wrap').forEach(function(n) { n.remove(); });
      }

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
      } else if (qEl) {
        var wrap = document.createElement('div');
        wrap.className = 'fe-quiz-continue-wrap';
        wrap.innerHTML =
          '<button type="button" class="fe-quiz-continue-btn" onclick="FastExercises._advanceFillInQuiz(' + qIndex + ',\'' + categoryId + '\',\'' + levelId + '\',\'' + lessonId + '\',' + pointIndex + ')">' +
          'Continue' +
          '</button>';
        qEl.appendChild(wrap);
      }
    },

    _advanceFillInQuiz: function(qIndex, categoryId, levelId, lessonId, pointIndex) {
      var wrap = document.querySelector('#fe-quiz-q-' + qIndex + ' .fe-quiz-continue-wrap');
      if (wrap) wrap.remove();
      this._showQuizQuestion(qIndex + 1);
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
        this._attachHorizontalSwipe(slidesArea, function() {
          FastExercises._pvConvGoTo((FastExercises._pvConvCurrentIdx || 0) - 1);
        }, function() {
          FastExercises._pvConvGoTo((FastExercises._pvConvCurrentIdx || 0) + 1);
        });
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
      requestAnimationFrame(function() {
        var nav = document.getElementById('pv-conv-nav');
        var dot = nav && nav.querySelector('.pv-gallery-nav-dot-active');
        if (dot && dot.scrollIntoView) dot.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
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
              '<div class="pv-chips-panel" id="pv-chips-panel" data-total-gaps="' + totalGaps + '" data-filled="0">' +
                '<div class="pv-chips-title">' + 'Phrasal Verbs' + ':</div>' +
                '<div class="pv-chips-list" id="pv-chips-list">' + chipsHtml + '</div>' +
              '</div>' +
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
        this._attachHorizontalSwipe(cardsArea, function() {
          FastExercises._wfCardGoTo((FastExercises._wfCardCurrentIdx || 0) - 1);
        }, function() {
          FastExercises._wfCardGoTo((FastExercises._wfCardCurrentIdx || 0) + 1);
        });
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
      requestAnimationFrame(function() {
        var nav = document.getElementById('wf-gallery-nav');
        var dot = nav && nav.querySelector('.pv-gallery-nav-dot-active');
        if (dot && dot.scrollIntoView) dot.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
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
            '<label class="dict-filter-wrap dict-filter-wrap--level" title="Level">' +
              '<span class="material-symbols-outlined dict-filter-wrap-icon">layers</span>' +
              '<select class="wf-dict-level-filter" id="wf-dict-level" onchange="FastExercises._filterWfDict(document.getElementById(\'wf-dict-search\').value)">' +
                '<option value="">All Levels</option>' +
                '<option value="B1">B1</option>' +
                '<option value="B2">B2</option>' +
                '<option value="C1">C1</option>' +
              '</select>' +
            '</label>' +
            '<label class="dict-filter-wrap dict-filter-wrap--type" title="Word type">' +
              '<span class="material-symbols-outlined dict-filter-wrap-icon">bookmark</span>' +
              '<select class="wf-dict-type-filter" id="wf-dict-type-filter" onchange="FastExercises._filterWfDict(document.getElementById(\'wf-dict-search\').value)">' +
                '<option value="">All Types</option>' +
                '<option value="noun">Noun</option>' +
                '<option value="verb">Verb</option>' +
                '<option value="adjective">Adjective</option>' +
                '<option value="adverb">Adverb</option>' +
              '</select>' +
            '</label>' +
            '<div class="wf-dict-mf-triggers">' +
              '<button type="button" class="wf-dict-mf-trigger" id="wf-dict-mf-level-btn" aria-haspopup="listbox">' +
                '<span class="material-symbols-outlined">layers</span>' +
                '<span class="wf-dict-mf-trigger-label" id="wf-dict-mf-level-lbl">All levels</span>' +
                '<span class="material-symbols-outlined wf-dict-mf-chevron">expand_more</span>' +
              '</button>' +
              '<button type="button" class="wf-dict-mf-trigger" id="wf-dict-mf-type-btn" aria-haspopup="listbox">' +
                '<span class="material-symbols-outlined">bookmark</span>' +
                '<span class="wf-dict-mf-trigger-label" id="wf-dict-mf-type-lbl">All types</span>' +
                '<span class="material-symbols-outlined wf-dict-mf-chevron">expand_more</span>' +
              '</button>' +
            '</div>' +
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
      this._wfDictInitMobileFilters();

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
          var morph = e.type ? '<span class="wf-dict-morph">' + self._escapeHTML(e.type) + '</span>' : '';
          var wtBadge = wt
            ? '<span class="wf-dict-type wf-type-' + self._escapeHTML(wt) + '">' + self._escapeHTML(wt) + '</span>'
            : '';
          derivedHtml +=
            '<div class="wf-dict-form">' +
              '<div class="wf-dict-form-top">' +
                '<span class="wf-dict-derived">' + self._escapeHTML(e.derived) + '</span>' +
                '<span class="wf-dict-level-badge wf-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
                wtBadge +
                morph +
                '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + self._jsStr(e.derived) + '\')" title="Listen to pronunciation">' +
                  '<span class="material-symbols-outlined">volume_up</span>' +
                '</button>' +
              '</div>' +
              '<span class="wf-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
            '</div>';
        });
        html +=
          '<div class="wf-dict-entry">' +
            '<div class="wf-dict-base">' + self._escapeHTML(base) + '</div>' +
            '<div class="wf-dict-forms">' + derivedHtml + '</div>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
      this._wfDictSyncMobileFilterTriggers();
    },

    _wfDictSyncMobileFilterTriggers: function() {
      var levelSel = document.getElementById('wf-dict-level');
      var typeSel = document.getElementById('wf-dict-type-filter');
      var lblL = document.getElementById('wf-dict-mf-level-lbl');
      var lblT = document.getElementById('wf-dict-mf-type-lbl');
      function optText(sel) {
        if (!sel) return '';
        var o = sel.options[sel.selectedIndex];
        return o ? o.textContent : '';
      }
      if (lblL) lblL.textContent = optText(levelSel);
      if (lblT) lblT.textContent = optText(typeSel);
    },

    _wfDictCloseMobileFilterSheet: function() {
      var el = document.getElementById('wf-dict-filter-sheet-root');
      if (el) el.remove();
    },

    /** Native select pickers are hard to style on mobile; use a short bottom sheet of options. */
    _wfDictOpenMobileFilterSheet: function(which) {
      var selectId = which === 'type' ? 'wf-dict-type-filter' : 'wf-dict-level';
      var sel = document.getElementById(selectId);
      if (!sel) return;
      var self = this;
      this._wfDictCloseMobileFilterSheet();
      var root = document.createElement('div');
      root.id = 'wf-dict-filter-sheet-root';
      root.className = 'wf-dict-filter-sheet-root';
      var title = which === 'type' ? 'Word type' : 'Level';
      var optsHtml = '';
      for (var i = 0; i < sel.options.length; i++) {
        var opt = sel.options[i];
        var val = opt.value;
        var active = val === sel.value ? ' wf-dict-filter-sheet-opt--active' : '';
        optsHtml += '<button type="button" class="wf-dict-filter-sheet-opt' + active + '" data-wf-opt-val="' + String(val).replace(/"/g, '&quot;') + '">' +
          this._escapeHTML(opt.textContent) + '</button>';
      }
      root.innerHTML =
        '<div class="wf-dict-filter-sheet-backdrop"></div>' +
        '<div class="wf-dict-filter-sheet" role="dialog" aria-modal="true">' +
          '<div class="wf-dict-filter-sheet-handle"></div>' +
          '<div class="wf-dict-filter-sheet-title">' + title + '</div>' +
          '<div class="wf-dict-filter-sheet-list">' + optsHtml + '</div>' +
        '</div>';
      document.body.appendChild(root);
      function close() { self._wfDictCloseMobileFilterSheet(); }
      root.querySelector('.wf-dict-filter-sheet-backdrop').addEventListener('click', close);
      var list = root.querySelector('.wf-dict-filter-sheet-list');
      if (list) {
        list.addEventListener('click', function(ev) {
          var btn = ev.target.closest('.wf-dict-filter-sheet-opt');
          if (!btn) return;
          var v = btn.getAttribute('data-wf-opt-val');
          if (v === null) v = '';
          sel.value = v;
          try {
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e1) {}
          var searchEl = document.getElementById('wf-dict-search');
          self._filterWfDict(searchEl ? searchEl.value : '');
          close();
        });
      }
    },

    _wfDictInitMobileFilters: function() {
      if (!window.matchMedia || !window.matchMedia('(max-width: 640px)').matches) return;
      var self = this;
      var bL = document.getElementById('wf-dict-mf-level-btn');
      var bT = document.getElementById('wf-dict-mf-type-btn');
      if (bL && !bL._wfMfBound) {
        bL._wfMfBound = true;
        bL.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); self._wfDictOpenMobileFilterSheet('level'); });
      }
      if (bT && !bT._wfMfBound) {
        bT._wfMfBound = true;
        bT.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); self._wfDictOpenMobileFilterSheet('type'); });
      }
      this._wfDictSyncMobileFilterTriggers();
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
            '<label class="dict-filter-wrap dict-filter-wrap--level" title="Level">' +
              '<span class="material-symbols-outlined dict-filter-wrap-icon">layers</span>' +
              '<select class="colloc-dict-level-filter" id="colloc-dict-level" onchange="FastExercises._filterCollocDict(document.getElementById(\'colloc-dict-search\').value)">' +
                '<option value="">All Levels</option>' +
                '<option value="A1">A1</option>' +
                '<option value="A2">A2</option>' +
                '<option value="B1">B1</option>' +
                '<option value="B2">B2</option>' +
                '<option value="C1">C1</option>' +
              '</select>' +
            '</label>' +
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
          var exHtml = e.example
            ? '<div class="colloc-dict-example">' + self._escapeHTML(e.example) + '</div>'
            : '';
          phrasesHtml +=
            '<div class="colloc-dict-form">' +
              '<div class="colloc-dict-form-top">' +
                '<span class="colloc-dict-phrase">' + self._escapeHTML(e.phrase) + '</span>' +
                '<span class="colloc-dict-level-badge colloc-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
                '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + self._jsStr(e.phrase) + '\')" title="Listen to pronunciation">' +
                  '<span class="material-symbols-outlined">volume_up</span>' +
                '</button>' +
              '</div>' +
              '<span class="colloc-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
              exHtml +
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
            '<label class="dict-filter-wrap dict-filter-wrap--level" title="Level">' +
              '<span class="material-symbols-outlined dict-filter-wrap-icon">layers</span>' +
              '<select class="pv-dict-level-filter" id="pv-dict-level" onchange="FastExercises._filterPvDict(document.getElementById(\'pv-dict-search\').value)">' +
                '<option value="">All Levels</option>' +
                '<option value="B1">B1</option>' +
                '<option value="B2">B2</option>' +
                '<option value="C1">C1</option>' +
              '</select>' +
            '</label>' +
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
                '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + self._jsStr(e.verb) + '\')" title="Listen to pronunciation">' +
                  '<span class="material-symbols-outlined">volume_up</span>' +
                '</button>' +
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
              '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + FastExercises._jsStr(info.word) + '\')" title="Listen to pronunciation">' +
                '<span class="material-symbols-outlined">volume_up</span>' +
              '</button>' +
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
            '<button class="id-dict-close" onclick="document.getElementById(\'id-dict-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="id-dict-search-row">' +
            '<span class="id-dict-search-icon"><span class="material-symbols-outlined">search</span></span>' +
            '<input type="text" class="id-dict-search" id="id-dict-search" placeholder="Search idiom or keyword…" oninput="FastExercises._filterIdDict(this.value)" />' +
            '<label class="dict-filter-wrap dict-filter-wrap--level" title="Level">' +
              '<span class="material-symbols-outlined dict-filter-wrap-icon">layers</span>' +
              '<select class="id-dict-level-filter" id="id-dict-level" onchange="FastExercises._filterIdDict(document.getElementById(\'id-dict-search\').value)">' +
                '<option value="">All Levels</option>' +
                '<option value="B1">B1</option>' +
                '<option value="B2">B2</option>' +
                '<option value="C1">C1</option>' +
              '</select>' +
            '</label>' +
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
              '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + self._jsStr(e.idiom) + '\')" title="Listen to pronunciation">' +
                '<span class="material-symbols-outlined">volume_up</span>' +
              '</button>' +
            '</div>' +
            '<span class="id-dict-def">' + self._escapeHTML(e.definition) + '</span>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
    },

    // ── IRREGULAR VERBS DICTIONARY ────────────────────────────────────────
    _irvDictCache: null,

    _closeIrvDictModal: function() {
      this._irvPracticeState = null;
      var modal = document.getElementById('irv-dict-modal');
      if (modal) modal.remove();
    },

    _showIrregularVerbsDictionary: async function() {
      var existing = document.getElementById('irv-dict-modal');
      if (existing) {
        this._closeIrvDictModal();
        return;
      }

      if (!this._irvDictCache) {
        try {
          var r = await fetch('data/irregular-verbs/dictionary.json');
          if (r.ok) this._irvDictCache = await r.json();
        } catch (e) {}
      }
      var entries = (this._irvDictCache && this._irvDictCache.entries) || [];

      var modal = document.createElement('div');
      modal.id = 'irv-dict-modal';
      modal.className = 'irv-dict-overlay';
      modal.innerHTML =
        '<div class="irv-dict-box">' +
          '<div class="irv-dict-header">' +
            '<span class="irv-dict-icon"><span class="material-symbols-outlined">table_view</span></span>' +
            '<button class="irv-dict-practice-btn" id="irv-dict-practice-btn" onclick="FastExercises._toggleIrvPracticeMode()">Practice mode</button>' +
            '<button class="irv-dict-close" onclick="FastExercises._closeIrvDictModal()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="irv-dict-search-row" id="irv-dict-search-row">' +
            '<span class="irv-dict-search-icon"><span class="material-symbols-outlined">search</span></span>' +
            '<input type="text" class="irv-dict-search" id="irv-dict-search" placeholder="Search infinitive or form…" oninput="FastExercises._filterIrvDict(this.value)" />' +
          '</div>' +
          '<div class="irv-dict-count" id="irv-dict-count">' + entries.length + ' entries</div>' +
          '<div class="irv-dict-body" id="irv-dict-body"></div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) FastExercises._closeIrvDictModal();
      });
      document.body.appendChild(modal);

      this._irvDictEntries = entries;
      this._irvPracticeState = null;
      this._renderIrvDictResults('');

      setTimeout(function() {
        var searchEl = document.getElementById('irv-dict-search');
        if (searchEl) searchEl.focus();
      }, 100);
    },

    _filterIrvDict: function(query) {
      this._renderIrvDictResults(query || '');
    },

    _renderIrvDictResults: function(query) {
      var self = this;
      var entries = this._irvDictEntries || [];
      var q = (query || '').toLowerCase().trim();

      var filtered = entries.filter(function(e) {
        if (!q) return true;
        return (e.infinitive || '').toLowerCase().indexOf(q) !== -1 ||
               (e.pastSimple || '').toLowerCase().indexOf(q) !== -1 ||
               (e.pastParticiple || '').toLowerCase().indexOf(q) !== -1;
      });

      var bodyEl = document.getElementById('irv-dict-body');
      var countEl = document.getElementById('irv-dict-count');
      if (!bodyEl) return;

      if (countEl) countEl.textContent = filtered.length + ' entries' + (q ? ' (filtered)' : '');

      if (!filtered.length) {
        bodyEl.innerHTML = '<div class="irv-dict-empty"><span class="material-symbols-outlined">search_off</span><p>No results found</p></div>';
        return;
      }

      var rowsHtml = filtered.map(function(e) {
        var pastSimple = e.pastSimple || '';
        var pastParticiple = e.pastParticiple || '';
        var buildFormCell = function(word) {
          return '<div class="irv-col-form">' +
            '<span class="irv-col-word">' + self._escapeHTML(word) + '</span>' +
            (word ? (
              '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + self._jsStr(word) + '\')" title="Listen to pronunciation">' +
                '<span class="material-symbols-outlined">volume_up</span>' +
              '</button>'
            ) : '') +
          '</div>';
        };
        return '<tr>' +
          '<td>' + buildFormCell(e.infinitive || '') + '</td>' +
          '<td>' + buildFormCell(pastSimple) + '</td>' +
          '<td>' + buildFormCell(pastParticiple) + '</td>' +
        '</tr>';
      }).join('');

      bodyEl.innerHTML =
        '<div class="irv-dict-table-wrap">' +
          '<table class="irv-dict-table">' +
            '<thead>' +
              '<tr><th>Infinitive</th><th>Past simple</th><th>Past participle</th></tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>';
    },

    _toggleIrvPracticeMode: function() {
      var btn = document.getElementById('irv-dict-practice-btn');
      var searchRow = document.getElementById('irv-dict-search-row');
      var count = document.getElementById('irv-dict-count');
      var searchInput = document.getElementById('irv-dict-search');

      if (this._irvPracticeState && this._irvPracticeState.active) {
        this._irvPracticeState = null;
        if (btn) {
          btn.setAttribute('aria-label', 'Practice mode');
          btn.textContent = 'Practice mode';
        }
        if (searchRow) searchRow.style.display = '';
        if (count) count.style.display = '';
        this._renderIrvDictResults((searchInput && searchInput.value) || '');
        return;
      }
      this._startIrvPracticeMode();
    },

    _startIrvPracticeMode: function() {
      var entries = this._irvDictEntries || [];
      if (!entries.length) return;

      var shuffled = entries.slice();
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }

      this._irvPracticeState = {
        active: true,
        items: shuffled,
        batchSize: 5,
        batchIndex: 0,
        checked: false,
        showingCorrect: false,
        totalCorrect: 0,
        totalAnswers: 0,
        currentBatch: []
      };

      var btn = document.getElementById('irv-dict-practice-btn');
      var searchRow = document.getElementById('irv-dict-search-row');
      var count = document.getElementById('irv-dict-count');
      if (btn) {
        btn.setAttribute('aria-label', 'Back to dictionary');
        btn.innerHTML = _backButtonContent('Dictionary');
      }
      if (searchRow) searchRow.style.display = 'none';
      if (count) count.style.display = 'none';
      this._renderIrvPracticeBatch();
    },

    _restartIrvPracticeMode: function() {
      this._irvPracticeState = null;
      this._startIrvPracticeMode();
    },

    _renderIrvPracticeBatch: function() {
      var state = this._irvPracticeState;
      var bodyEl = document.getElementById('irv-dict-body');
      if (!state || !bodyEl) return;

      var totalBatches = Math.ceil(state.items.length / state.batchSize);
      if (state.batchIndex >= totalBatches) {
        var pct = state.totalAnswers ? Math.round((state.totalCorrect / state.totalAnswers) * 100) : 0;
        bodyEl.innerHTML =
          '<div class="irv-practice-complete">' +
            '<span class="material-symbols-outlined">trophy</span>' +
            '<h3>Practice complete</h3>' +
            '<p>Score: <strong>' + state.totalCorrect + '/' + state.totalAnswers + '</strong> (' + pct + '%)</p>' +
            '<div class="irv-practice-complete-actions">' +
              '<button class="irv-practice-btn irv-practice-btn-primary" onclick="FastExercises._toggleIrvPracticeMode()" aria-label="Back to dictionary" title="Back to dictionary">' + _symbolButtonContent('arrow_back', 'Back to dictionary') + '</button>' +
              '<button class="irv-practice-btn" onclick="FastExercises._restartIrvPracticeMode()" aria-label="Restart practice" title="Restart practice">' + _symbolButtonContent('restart_alt', 'Restart practice') + '</button>' +
            '</div>' +
          '</div>';
        return;
      }

      var start = state.batchIndex * state.batchSize;
      var end = Math.min(start + state.batchSize, state.items.length);
      var batch = state.items.slice(start, end);
      state.currentBatch = batch;
      state.checked = false;
      state.showingCorrect = false;

      var rowsHtml = '';
      for (var i = 0; i < batch.length; i++) {
        var item = batch[i];
        rowsHtml +=
          '<tr>' +
            '<td class="irv-practice-infinitive">' + this._escapeHTML(item.infinitive || '') + '</td>' +
            '<td>' +
              '<input id="irv-ps-' + i + '" class="irv-practice-input" type="text" placeholder="Past simple" autocomplete="off" />' +
              '<div id="irv-res-ps-' + i + '" class="irv-practice-result" aria-live="polite"></div>' +
            '</td>' +
            '<td>' +
              '<input id="irv-pp-' + i + '" class="irv-practice-input" type="text" placeholder="Past participle" autocomplete="off" />' +
              '<div id="irv-res-pp-' + i + '" class="irv-practice-result" aria-live="polite"></div>' +
            '</td>' +
          '</tr>';
      }

      bodyEl.innerHTML =
        '<div class="irv-practice-top">' +
          '<div class="irv-practice-title">Batch ' + (state.batchIndex + 1) + ' of ' + totalBatches + '</div>' +
          '<div class="irv-practice-score">Running score: ' + state.totalCorrect + '/' + state.totalAnswers + '</div>' +
        '</div>' +
        '<div class="irv-dict-table-wrap">' +
          '<table class="irv-dict-table irv-practice-table">' +
            '<thead><tr><th>Infinitive</th><th>Past simple</th><th>Past participle</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="irv-practice-actions">' +
          '<button class="irv-practice-btn irv-practice-btn-primary" onclick="FastExercises._checkIrvPracticeBatch()" aria-label="Check batch" title="Check batch">' + _symbolButtonContent('check', 'Check batch') + '</button>' +
          '<button class="irv-practice-btn" id="irv-practice-toggle" onclick="FastExercises._toggleIrvPracticeAnswers()" disabled aria-label="Show correct answers" title="Show correct answers">' + _symbolButtonContent('visibility', 'Show correct answers') + '</button>' +
          '<button class="irv-practice-btn" id="irv-practice-next" onclick="FastExercises._nextIrvPracticeBatch()" disabled aria-label="Next batch" title="Next batch">' + _symbolButtonContent('arrow_forward', 'Next batch') + '</button>' +
          '<button class="irv-practice-btn" onclick="FastExercises._restartIrvPracticeMode()" aria-label="Restart practice" title="Restart practice">' + _symbolButtonContent('restart_alt', 'Restart practice') + '</button>' +
        '</div>';
    },

    _irvNormalizeForm: function(value) {
      // Normalize typographic apostrophes from copied lists/user input.
      return (value || '').toLowerCase().replace(/[\u2018\u2019]/g, '\'').replace(/\s+/g, ' ').trim();
    },

    _irvMatchesForm: function(typed, expected) {
      var normalizedTyped = this._irvNormalizeForm(typed);
      if (!normalizedTyped) return false;
      // Support alternatives such as "was/were", "burned, burnt", or "burned or burnt".
      var options = (expected || '')
        .split(/\/|,|\bor\b/gi)
        .map(this._irvNormalizeForm.bind(this))
        .filter(Boolean);
      return options.indexOf(normalizedTyped) !== -1;
    },

    _checkIrvPracticeBatch: function() {
      var state = this._irvPracticeState;
      if (!state || state.checked || !state.currentBatch || !state.currentBatch.length) return;

      for (var i = 0; i < state.currentBatch.length; i++) {
        var item = state.currentBatch[i];
        var psInput = document.getElementById('irv-ps-' + i);
        var ppInput = document.getElementById('irv-pp-' + i);
        if (!psInput || !ppInput) continue;

        var psTyped = psInput.value || '';
        var ppTyped = ppInput.value || '';

        var psOk = this._irvMatchesForm(psTyped, item.pastSimple);
        var ppOk = this._irvMatchesForm(ppTyped, item.pastParticiple);

        state.totalAnswers += 2;
        if (psOk) state.totalCorrect++;
        if (ppOk) state.totalCorrect++;

        psInput.dataset.userAnswer = psTyped;
        ppInput.dataset.userAnswer = ppTyped;
        psInput.dataset.correctAnswer = item.pastSimple || '';
        ppInput.dataset.correctAnswer = item.pastParticiple || '';
        psInput.dataset.isCorrect = psOk ? '1' : '0';
        ppInput.dataset.isCorrect = ppOk ? '1' : '0';

        psInput.disabled = true;
        ppInput.disabled = true;
        psInput.classList.add(psOk ? 'irv-input-correct' : 'irv-input-wrong');
        ppInput.classList.add(ppOk ? 'irv-input-correct' : 'irv-input-wrong');
        this._renderIrvPracticeFieldResult('ps', i, psInput.dataset.userAnswer || '', psInput.dataset.correctAnswer || '', psOk, false);
        this._renderIrvPracticeFieldResult('pp', i, ppInput.dataset.userAnswer || '', ppInput.dataset.correctAnswer || '', ppOk, false);
      }

      state.checked = true;
      state.showingCorrect = false;
      var toggleBtn = document.getElementById('irv-practice-toggle');
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.setAttribute('aria-label', 'Show correct answers');
        toggleBtn.setAttribute('title', 'Show correct answers');
        toggleBtn.innerHTML = _symbolButtonContent('visibility', 'Show correct answers');
      }
      var nextBtn = document.getElementById('irv-practice-next');
      if (nextBtn) nextBtn.disabled = false;
    },

    _toggleIrvPracticeAnswers: function() {
      var state = this._irvPracticeState;
      if (!state || !state.checked || !state.currentBatch || !state.currentBatch.length) return;

      state.showingCorrect = !state.showingCorrect;
      for (var i = 0; i < state.currentBatch.length; i++) {
        var psInput = document.getElementById('irv-ps-' + i);
        var ppInput = document.getElementById('irv-pp-' + i);
        if (!psInput || !ppInput) continue;
        this._renderIrvPracticeFieldResult('ps', i, psInput.dataset.userAnswer || '', psInput.dataset.correctAnswer || '', psInput.dataset.isCorrect === '1', state.showingCorrect);
        this._renderIrvPracticeFieldResult('pp', i, ppInput.dataset.userAnswer || '', ppInput.dataset.correctAnswer || '', ppInput.dataset.isCorrect === '1', state.showingCorrect);
      }

      var toggleBtn = document.getElementById('irv-practice-toggle');
      if (toggleBtn) {
        var label = state.showingCorrect ? 'Show my answers' : 'Show correct answers';
        toggleBtn.innerHTML = _symbolButtonContent(state.showingCorrect ? 'person' : 'visibility', label);
        toggleBtn.setAttribute('aria-label', label);
        toggleBtn.setAttribute('title', label);
      }
    },

    _renderIrvPracticeFieldResult: function(fieldType, rowIndex, userAnswer, correctAnswer, isCorrect, showCorrectAnswer) {
      var resultEl = document.getElementById('irv-res-' + fieldType + '-' + rowIndex);
      if (!resultEl) return;
      var inputEl = document.getElementById('irv-' + fieldType + '-' + rowIndex);
      resultEl.style.display = 'none';
      resultEl.textContent = '';
      if (!inputEl) return;

      if (isCorrect) {
        inputEl.classList.remove('irv-input-showing-correct');
        return;
      }

      if (showCorrectAnswer) {
        inputEl.value = (correctAnswer || '').trim() || '—';
        inputEl.classList.remove('irv-input-wrong');
        inputEl.classList.add('irv-input-showing-correct');
        return;
      }

      inputEl.value = (userAnswer || '').trim() || '—';
      inputEl.classList.remove('irv-input-showing-correct');
      inputEl.classList.add('irv-input-wrong');
    },

    _nextIrvPracticeBatch: function() {
      var state = this._irvPracticeState;
      if (!state || !state.checked) return;
      state.batchIndex++;
      state.checked = false;
      this._renderIrvPracticeBatch();
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
            '<label class="dict-filter-wrap dict-filter-wrap--level" title="Level">' +
              '<span class="material-symbols-outlined dict-filter-wrap-icon">layers</span>' +
              '<select class="vocab-dict-level-filter" id="vocab-dict-level" onchange="FastExercises._filterVocabDict(document.getElementById(\'vocab-dict-search\').value)">' +
                '<option value="">All Levels</option>' +
                '<option value="A2">A2</option>' +
                '<option value="B1">B1</option>' +
                '<option value="B2">B2</option>' +
                '<option value="C1">C1</option>' +
              '</select>' +
            '</label>' +
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
               (e.definition || '').toLowerCase().indexOf(q) !== -1 ||
               (e.example || '').toLowerCase().indexOf(q) !== -1;
      });

      var resultsEl = document.getElementById('vocab-dict-results');
      var countEl = document.getElementById('vocab-dict-count');
      var missingValuePlaceholder = '—';
      if (!resultsEl) return;

      if (countEl) countEl.textContent = filtered.length + ' entries' + (q || levelFilter ? ' (filtered)' : '');

      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="vocab-dict-empty"><span class="material-symbols-outlined">search_off</span><p>No results found</p></div>';
        return;
      }

      var groups = {};
      var groupOrder = [];
      filtered.forEach(function(e) {
        var key = (e.word || '').toLowerCase().trim();
        if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
        groups[key].push(e);
      });

      var html = '';
      groupOrder.forEach(function(key) {
        var group = groups[key];
        var baseWord = (group[0] && group[0].word) || '';
        var formsHtml = '';
        group.forEach(function(e) {
          formsHtml +=
            '<div class="vocab-dict-form">' +
              '<div class="vocab-dict-form-top">' +
                '<span class="vocab-dict-level-badge vocab-level-' + (e.level || '').toLowerCase() + '">' + self._escapeHTML(e.level || '') + '</span>' +
              '</div>' +
              '<span class="vocab-dict-def"><strong>Definition:</strong> ' + self._escapeHTML(e.definition || missingValuePlaceholder) + '</span>' +
              '<span class="vocab-dict-example"><strong>Example:</strong> ' + self._escapeHTML(e.example || missingValuePlaceholder) + '</span>' +
            '</div>';
        });

        html +=
          '<div class="vocab-dict-entry">' +
            '<div class="vocab-dict-base">' +
              self._escapeHTML(baseWord) +
              '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + self._jsStr(baseWord) + '\')" title="Listen to pronunciation">' +
                '<span class="material-symbols-outlined">volume_up</span>' +
              '</button>' +
            '</div>' +
            '<div class="vocab-dict-forms">' + formsHtml + '</div>' +
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
          '<div class="pv-verb-popup-verb">' +
            FastExercises._escapeHTML(pv.verb || '') +
            '<button class="dict-speak-btn" onclick="FastExercises._speakWord(\'' + FastExercises._jsStr(pv.verb || '') + '\')" title="Listen to pronunciation">' +
              '<span class="material-symbols-outlined">volume_up</span>' +
            '</button>' +
          '</div>' +
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
            '<button class="vocab-fc-next-batch-btn vocab-fc-back-topics-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back to topics" style="background:#64748b">' +
              '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span class="icon-btn-label">Topics</span>' +
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
            '<button class="vocab-fc-next-batch-btn" onclick="FastExercises.openCategory(\'' + catMeta.id + '\')" aria-label="Back to topics" style="background:' + color + '">' +
              '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span class="icon-btn-label">Topics</span>' +
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
          '<button class="subpage-back-btn pv-sidebar-back" onclick="FastExercises.openCategory(\'vocabulary\')" aria-label="Back">' +
            _backButtonContent('Back') +
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

    _wlLevelConfig: function() { return WL_LEVEL_CONFIG; },

    _ensureWlManifest: function() {
      if (_wlManifestPromise) return _wlManifestPromise;
      _wlManifestPromise = fetch('/wordle/manifest.json')
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function(manifest) {
          if (manifest && manifest.levels) {
            manifest.levels.forEach(function(level) {
              for (var i = 0; i < WL_LEVEL_CONFIG.length; i++) {
                if (WL_LEVEL_CONFIG[i].id === level.id) {
                  WL_LEVEL_CONFIG[i].count = level.count || 0;
                  break;
                }
              }
            });
          }
        })
        .catch(function() {});
      return _wlManifestPromise;
    },

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
      // 'mix' level combines words from all CEFR levels
      if (levelId === 'mix') {
        var mixSeen = {};
        var mixPool = [];
        var mixLevels = ['A2', 'B1', 'B2', 'C1'];
        for (var mi = 0; mi < mixLevels.length; mi++) {
          var lvlPool = await self._buildMixedWordPool(mixLevels[mi]);
          for (var pi = 0; pi < lvlPool.length; pi++) {
            var key = lvlPool[pi].word.toLowerCase();
            if (!mixSeen[key]) { mixSeen[key] = 1; mixPool.push(lvlPool[pi]); }
          }
        }
        return mixPool;
      }

      var WORD_RE = /^[a-zA-Z]{3,12}$/;
      var seen = {};
      var pool = [];

      function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

      function add(word, clue, type, example) {
        var key = word.toLowerCase();
        if (!WORD_RE.test(key) || seen[key]) return;
        seen[key] = 1;
        pool.push({ word: word.toUpperCase(), clue: self._cwSanitizeClue(word, clue), type: type, example: example || '' });
      }

      // 1. Vocabulary dictionary
      try {
        var vocabRes = await fetch('data/vocabulary/dictionary.json');
        if (vocabRes.ok) {
          var vd = await vocabRes.json();
          (vd.entries || []).forEach(function(e) {
            if (e.level === levelId) add(e.word, e.definition, 'vocabulary', e.example);
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

    _cwGetGridCellClasses: function(state, key) {
      var classes = ['vocab-cw-cell', 'vocab-cw-grid-cell'];
      if (!state || !key) return classes.join(' ');
      if (state.lockedCells[key]) classes.push('vocab-cw-cell-locked');
      else if (state.revealedCells[key]) classes.push('vocab-cw-cell-revealed');
      else if (state.checkedCells[key] === 'correct') classes.push('vocab-cw-cell-correct');
      else if (state.checkedCells[key] === 'incorrect') classes.push('vocab-cw-cell-incorrect');
      return classes.join(' ');
    },

    _cwBuildGridBoardHtml: function(state) {
      if (!state || !state.cwData) return '';
      var self = this;
      var grid = state.cwData.grid;
      var rows = state.cwData.rows;
      var cols = state.cwData.cols;
      var numberMap = {};
      (state.cwData.placed || []).forEach(function(p) {
        if (!p.number) return;
        var key = p.row + ',' + p.col;
        if (!numberMap[key] || p.number < numberMap[key]) numberMap[key] = p.number;
      });

      var gridHtml = '<div class="vocab-cw-grid-board" style="grid-template-columns: repeat(' + cols + ', 1fr);">';
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (grid[r][c] === null) {
            gridHtml += '<div class="vocab-cw-grid-slot vocab-cw-grid-slot--empty" aria-hidden="true"></div>';
            continue;
          }
          var cellKey = r + ',' + c;
          var num = numberMap[cellKey];
          var numHtml = num ? '<span class="vocab-cw-grid-cell-num">' + num + '</span>' : '';
          var letter = state.userGrid[cellKey] || '';
          gridHtml += '<button type="button" class="' + self._cwGetGridCellClasses(state, cellKey) + ' vocab-cw-grid-slot" data-r="' + r + '" data-c="' + c + '" data-cell-key="' + cellKey + '" aria-label="Cell ' + (r + 1) + ',' + (c + 1) + '">' +
            numHtml + '<span class="vocab-cw-grid-cell-letter">' + self._escapeHTML(letter) + '</span>' +
          '</button>';
        }
      }
      gridHtml += '</div>';
      return gridHtml;
    },

    _cwBindGridCellHandlers: function(container) {
      if (!container) return;
      var self = this;
      var cellEls = container.querySelectorAll('.vocab-cw-grid-slot:not(.vocab-cw-grid-slot--empty)');
      for (var i = 0; i < cellEls.length; i++) {
        (function(cellEl) {
          cellEl.addEventListener('click', function() {
            var state = window._cwState;
            if (!state) return;
            var r2 = parseInt(cellEl.getAttribute('data-r'), 10);
            var c2 = parseInt(cellEl.getAttribute('data-c'), 10);
            if (isNaN(r2) || isNaN(c2)) return;
            var words = state.cellMap[r2 + ',' + c2] || [];
            if (words.length) self._cwSelectCell(r2, c2, words[0].dir);
          });
        })(cellEls[i]);
      }
    },

    _cwGetViewMode: function() {
      var body = document.querySelector('.vocab-cw-body');
      if (!body) return 'list';
      return body.getAttribute('data-cw-view') === 'grid' ? 'grid' : 'list';
    },

    _cwIsMobilePlay: function() {
      if (!window.matchMedia) return false;
      return window.matchMedia('(max-width: 700px)').matches ||
        window.matchMedia('(max-height: 520px) and (orientation: landscape) and (max-width: 1024px)').matches;
    },

    _cwEnsureMobileDock: function() {
      var dock = document.getElementById('cw-mobile-dock');
      if (dock) return dock;
      dock = document.createElement('div');
      dock.id = 'cw-mobile-dock';
      dock.className = 'vocab-cw-mobile-dock';
      var mainEl = document.getElementById('vocab-cw-main');
      if (mainEl) mainEl.appendChild(dock);
      return dock;
    },

    _cwGetWordsInDir: function(dir) {
      var state = window._cwState;
      if (!state || !state.cwData || !state.cwData.placed) return [];
      var normalized = dir === 'down' ? 'down' : 'across';
      var words = state.cwData.placed.filter(function(p) { return p.dir === normalized; });
      words.sort(function(a, b) { return a.number - b.number; });
      return words;
    },

    _cwNavigateWord: function(delta) {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var words = FastExercises._cwGetWordsInDir(state.activeWord.dir);
      var idx = -1;
      for (var i = 0; i < words.length; i++) {
        if (words[i].number === state.activeWord.number && words[i].dir === state.activeWord.dir) {
          idx = i;
          break;
        }
      }
      var nextIdx = idx + delta;
      if (nextIdx >= 0 && nextIdx < words.length) {
        FastExercises._cwSelectWord(words[nextIdx], 0);
      }
    },

    _cwEnsureMobileWordNav: function() {
      var nav = document.getElementById('cw-mobile-word-nav');
      if (nav) return nav;
      nav = document.createElement('div');
      nav.id = 'cw-mobile-word-nav';
      nav.className = 'vocab-cw-mobile-word-nav';
      nav.innerHTML =
        '<button type="button" class="vocab-cw-word-nav-btn" id="cw-word-prev" aria-label="Previous word">' +
          '<span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>' +
        '</button>' +
        '<span class="vocab-cw-word-nav-label" id="cw-word-nav-label"></span>' +
        '<button type="button" class="vocab-cw-word-nav-btn" id="cw-word-next" aria-label="Next word">' +
          '<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>' +
        '</button>';
      nav.querySelector('#cw-word-prev').addEventListener('click', function(e) {
        e.preventDefault();
        FastExercises._cwNavigateWord(-1);
      });
      nav.querySelector('#cw-word-next').addEventListener('click', function(e) {
        e.preventDefault();
        FastExercises._cwNavigateWord(1);
      });
      return nav;
    },

    _cwSyncMobileWordNav: function() {
      var nav = document.getElementById('cw-mobile-word-nav');
      var label = document.getElementById('cw-word-nav-label');
      var state = window._cwState;
      if (!nav || !label || !state || !state.activeWord) return;
      var words = FastExercises._cwGetWordsInDir(state.activeWord.dir);
      var idx = -1;
      for (var i = 0; i < words.length; i++) {
        if (words[i].number === state.activeWord.number) { idx = i; break; }
      }
      var dirLabel = state.activeWord.dir === 'down' ? 'Down' : 'Across';
      label.textContent = state.activeWord.number + ' ' + dirLabel + ' · ' + (idx + 1) + '/' + words.length;
      var prevBtn = document.getElementById('cw-word-prev');
      var nextBtn = document.getElementById('cw-word-next');
      if (prevBtn) prevBtn.disabled = idx <= 0;
      if (nextBtn) nextBtn.disabled = idx < 0 || idx >= words.length - 1;
    },

    _cwBindMobileResize: function() {
      if (FastExercises._cwResizeBound) return;
      FastExercises._cwResizeBound = true;
      var onResize = function() {
        if (!window._cwState) return;
        var stripInput = document.getElementById('cw-strip-input');
        if (stripInput) {
          if (FastExercises._cwIsMobilePlay()) {
            stripInput.setAttribute('readonly', 'readonly');
            stripInput.setAttribute('inputmode', 'none');
          } else {
            stripInput.removeAttribute('readonly');
            stripInput.removeAttribute('inputmode');
          }
        }
        if (FastExercises._cwIsMobilePlay()) {
          FastExercises._cwSetViewMode('list');
        }
        FastExercises._cwSyncMobilePanel();
      };
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
    },

    _cwFocusCwInput: function() {
      if (FastExercises._cwIsMobilePlay()) return;
      var stripInput = document.getElementById('cw-strip-input');
      if (stripInput) stripInput.focus();
    },

    _cwEnsureMobileKeyboard: function() {
      var kb = document.getElementById('cw-mobile-keyboard');
      if (kb) return kb;
      var rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
      ];
      var html = '';
      for (var ri = 0; ri < rows.length; ri++) {
        html += '<div class="vocab-cw-mobile-keyboard-row">';
        if (ri === 2) {
          html += '<button type="button" class="vocab-cw-mobile-key vocab-cw-mobile-key--wide vocab-cw-mobile-key--clear vocab-cw-word-clear-btn" aria-label="Clear incorrect letters" title="Clear incorrect">' +
            '<span class="material-symbols-outlined" aria-hidden="true">ink_eraser</span>' +
          '</button>';
        }
        for (var ki = 0; ki < rows[ri].length; ki++) {
          var key = rows[ri][ki];
          if (key === 'BACKSPACE') {
            html += '<button type="button" class="vocab-cw-mobile-key vocab-cw-mobile-key--wide" data-key="Backspace" aria-label="Backspace">' +
              '<span class="material-symbols-outlined" aria-hidden="true">backspace</span>' +
            '</button>';
          } else {
            html += '<button type="button" class="vocab-cw-mobile-key" data-key="' + key + '" aria-label="' + key + '">' + key + '</button>';
          }
        }
        html += '</div>';
      }
      kb = document.createElement('div');
      kb.id = 'cw-mobile-keyboard';
      kb.className = 'vocab-cw-mobile-keyboard';
      kb.setAttribute('role', 'group');
      kb.setAttribute('aria-label', 'Letter keyboard');
      kb.innerHTML = html;
      kb.addEventListener('click', function(e) {
        var clearBtn = e.target.closest('.vocab-cw-mobile-key--clear');
        if (clearBtn) {
          e.preventDefault();
          var cwState = window._cwState;
          if (cwState && cwState.selectedWordId) {
            FastExercises._cwClearWordIncorrect(cwState.selectedWordId);
          }
          return;
        }
        var keyBtn = e.target.closest('[data-key]');
        if (!keyBtn) return;
        e.preventDefault();
        FastExercises._cwKeyHandler({ key: keyBtn.getAttribute('data-key'), preventDefault: function() {} });
      });
      return kb;
    },

    _cwSyncMobilePanel: function() {
      var defEl = document.getElementById('cw-active-def');
      var stickyTop = document.querySelector('.vocab-cw-play-sticky-top');
      var mainEl = document.getElementById('vocab-cw-main');
      var kb = document.getElementById('cw-mobile-keyboard');
      var dock = document.getElementById('cw-mobile-dock');
      var wordNav = document.getElementById('cw-mobile-word-nav');
      var dirToggle = document.getElementById('cw-dir-toggle');
      var headerBtns = document.querySelector('.vocab-cw-header-btns');

      if (kb) kb.remove();
      if (wordNav) wordNav.remove();
      if (dock) {
        if (dirToggle && dock.contains(dirToggle)) {
          dock.removeChild(dirToggle);
        }
        dock.remove();
      }

      if (dirToggle && headerBtns && !headerBtns.contains(dirToggle)) {
        headerBtns.insertBefore(dirToggle, headerBtns.firstChild);
      }

      if (!FastExercises._cwIsMobilePlay()) {
        if (mainEl) mainEl.classList.remove('vocab-cw-main--mobile-play');
        if (defEl) {
          defEl.classList.remove('vocab-cw-active-def--inline');
          if (stickyTop && !stickyTop.contains(defEl)) stickyTop.appendChild(defEl);
        }
        return;
      }

      if (mainEl) mainEl.classList.add('vocab-cw-main--mobile-play');
      dock = FastExercises._cwEnsureMobileDock();

      var state = window._cwState;
      if (!state || !state.activeWord || !defEl) {
        if (defEl) {
          defEl.classList.remove('vocab-cw-active-def--inline');
          if (stickyTop && !stickyTop.contains(defEl)) stickyTop.appendChild(defEl);
        }
        kb = FastExercises._cwEnsureMobileKeyboard();
        dock.appendChild(kb);
        return;
      }

      var activeRow = document.querySelector('.vocab-cw-word-row.active');
      if (!activeRow) {
        kb = FastExercises._cwEnsureMobileKeyboard();
        dock.appendChild(kb);
        return;
      }

      wordNav = FastExercises._cwEnsureMobileWordNav();
      activeRow.parentNode.insertBefore(wordNav, activeRow);

      defEl.classList.add('vocab-cw-active-def--inline');
      activeRow.parentNode.insertBefore(defEl, activeRow);
      FastExercises._cwSyncMobileWordNav();

      kb = FastExercises._cwEnsureMobileKeyboard();
      dock.appendChild(kb);
    },

    _cwSetViewMode: function(mode) {
      var normalized = mode === 'grid' ? 'grid' : 'list';
      var body = document.querySelector('.vocab-cw-body');
      if (body) body.setAttribute('data-cw-view', normalized);
      var gridBtn = document.getElementById('cw-grid-btn');
      if (gridBtn) {
        gridBtn.classList.toggle('vocab-cw-grid-btn-active', normalized === 'grid');
        gridBtn.setAttribute('aria-pressed', normalized === 'grid' ? 'true' : 'false');
        gridBtn.title = normalized === 'grid' ? 'List view' : 'Grid view';
        gridBtn.setAttribute('aria-label', normalized === 'grid' ? 'List view' : 'Grid view');
        var icon = gridBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = normalized === 'grid' ? 'view_list' : 'grid_view';
      }
      if (normalized === 'grid') FastExercises._cwSyncActiveCellHighlight();
    },

    _cwToggleViewMode: function() {
      if (FastExercises._cwIsMobilePlay()) return;
      FastExercises._cwSetViewMode(FastExercises._cwGetViewMode() === 'grid' ? 'list' : 'grid');
    },

    _cwMountInlineGrid: function() {
      var state = window._cwState;
      if (!state) return;
      var gridArea = document.getElementById('cw-grid-area');
      if (!gridArea) return;
      gridArea.innerHTML = FastExercises._cwBuildGridBoardHtml(state);
      FastExercises._cwBindGridCellHandlers(gridArea);
    },

    _cwShowClueTab: function(dir) {
      var normalized = dir === 'down' ? 'down' : 'across';
      var wordList = document.getElementById('cw-word-list');
      if (wordList) wordList.setAttribute('data-cw-words-dir', normalized);
      var cluesPanel = document.getElementById('cw-clues');
      if (cluesPanel) cluesPanel.setAttribute('data-cw-clues-dir', normalized);
      var cluesHeading = document.getElementById('cw-clues-heading');
      if (cluesHeading) cluesHeading.textContent = normalized === 'down' ? 'Down' : 'Across';
      var toggle = document.getElementById('cw-dir-toggle');
      if (toggle) toggle.setAttribute('data-cw-dir', normalized);
      var tabA = document.getElementById('cw-strip-tab-across');
      var tabD = document.getElementById('cw-strip-tab-down');
      if (tabA) {
        tabA.classList.toggle('vocab-cw-dir-toggle-btn-active', normalized === 'across');
        tabA.setAttribute('aria-selected', normalized === 'across' ? 'true' : 'false');
      }
      if (tabD) {
        tabD.classList.toggle('vocab-cw-dir-toggle-btn-active', normalized === 'down');
        tabD.setAttribute('aria-selected', normalized === 'down' ? 'true' : 'false');
      }

      if (FastExercises._cwIsMobilePlay()) {
        var state = window._cwState;
        if (state) {
          var wordsInDir = FastExercises._cwGetWordsInDir(normalized);
          if (wordsInDir.length) {
            var currentInDir = state.activeWord && state.activeWord.dir === normalized;
            if (!currentInDir) {
              FastExercises._cwSelectWord(wordsInDir[0], 0, normalized);
              return;
            }
          }
        }
        FastExercises._cwSyncMobilePanel();
      }
    },

    _cwIsCellProtected: function(state, key) {
      if (!state || !key) return false;
      return !!(state.lockedCells[key] || state.revealedCells[key] || state.checkedCells[key] === 'correct');
    },

    _cwShouldHighlightActive: function(state, key) {
      if (!state || !key) return false;
      if (state.lockedCells[key] || state.revealedCells[key]) return false;
      if (state.checkedCells[key] === 'correct' || state.checkedCells[key] === 'incorrect') return false;
      return true;
    },

    _cwWordId: function(word) {
      return word.dir + '_' + word.number;
    },

    _cwCellKey: function(r, c) {
      return r + ',' + c;
    },

    _cwGetWordCells: function(word) {
      var cells = [];
      for (var i = 0; i < word.word.length; i++) {
        var row = word.dir === 'down' ? word.row + i : word.row;
        var col = word.dir === 'across' ? word.col + i : word.col;
        cells.push({
          cellId: row + '-' + col,
          cellKey: row + ',' + col,
          row: row,
          col: col,
          index: i
        });
      }
      return cells;
    },

    _cwFindWordById: function(wordId) {
      var state = window._cwState;
      if (!state || !wordId) return null;
      var parts = wordId.split('_');
      if (parts.length < 2) return null;
      var dir = parts[0];
      var num = parseInt(parts[1], 10);
      if (isNaN(num)) return null;
      for (var i = 0; i < state.cwData.placed.length; i++) {
        var p = state.cwData.placed[i];
        if (p.dir === dir && p.number === num) return p;
      }
      return null;
    },

    _showCrosswordLoading: function() {
      if (typeof AppLoadingScreen !== 'undefined') {
        AppLoadingScreen.show({ manual: true, minMs: 0 });
      }
    },

    _hideCrosswordLoading: function() {
      if (typeof AppLoadingScreen !== 'undefined') {
        AppLoadingScreen.skipDelay();
        AppLoadingScreen.hide();
      }
    },

    _mountCrosswordPlayDashboard: function() {
      var content = document.getElementById('main-content');
      if (!content) return null;

      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();

      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var leftSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent = BentoGrid._buildDashboardSidebars(exams).left;
      }

      var mobileTopBarHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml
        ? MainNav.buildMobileTopBarHtml() : '';
      var mobileNavHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml
        ? MainNav.buildMobileBottomNavHtml('crosswords')
        : '';

      content.innerHTML =
        '<div class="dashboard-layout dashboard-layout--crossword-scroll dashboard-layout--crossword-play">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center dashboard-center--crossword dashboard-center--crossword-play" id="cwPlayCenter">' +
            mobileTopBarHtml +
            '<div class="cw-page-content" id="cwPlayScroll">' +
              '<div class="fe-section vocab-cw-play-section" id="cwPlaySection"></div>' +
            '</div>' +
            mobileNavHtml +
          '</div>' +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof MainNav !== 'undefined' && MainNav.setActive) MainNav.setActive('crosswords');

      return document.getElementById('cwPlaySection');
    },

    _attachCrosswordCluesToSidebar: function() {
      // Clues panel is rendered inline beside the word list in _renderVocabCrossword.
    },

    _renderCrosswordIntoDashboard: function(playSection, cwData, options) {
      if (!playSection) return;

      var catMeta = options.catMeta;
      var color = options.color;
      var levelId = options.levelId;
      var lessonId = options.lessonId;
      var cwIndex = options.cwIndex;
      var savedState = options.savedState;
      var lessonData = options.lessonData;

      playSection.innerHTML = '';
      var mainDiv = document.createElement('div');
      mainDiv.className = 'vocab-cw-layout';
      mainDiv.innerHTML = '<div class="vocab-cw-main" id="vocab-cw-main"></div>';
      playSection.appendChild(mainDiv);

      var mainEl = document.getElementById('vocab-cw-main');
      if (!mainEl) return;

      this._renderVocabCrossword(mainEl, cwData, lessonData, catMeta, color, levelId, lessonId, cwIndex, savedState);
      this._attachCrosswordCluesToSidebar();
    },

    // Open a mixed (non-topic-grouped) crossword by level and slot index.
    _openMixedCrossword: async function(levelId, cwIndex, options) {
      var self = this;
      options = options || {};
      AppState.currentView = 'crosswordPlay';
      if (!options.fromRoute && typeof Router !== 'undefined') {
        var playState = { view: 'crosswordPlay', level: levelId, cwIndex: cwIndex };
        history.pushState(playState, '', Router.stateToPath(playState));
      }
      this._showCrosswordLoading();

      try {
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
            this._hideCrosswordLoading();
            var errContent = document.getElementById('main-content');
            if (errContent) errContent.innerHTML = '<div class="fe-error">No words available for this level.</div>';
            return;
          }
          var shuffled = this._cwSeededShuffle(pool, cwIndex);
          var batch = shuffled.slice(0, CW_BATCH_SIZE);
          cwData = this._generateCrossword(batch);
        }

        if (!cwData || !cwData.placed || cwData.placed.length < CW_MIN_PLACED) {
          this._hideCrosswordLoading();
          var errContent2 = document.getElementById('main-content');
          if (errContent2) errContent2.innerHTML = '<div class="fe-error">Not enough words could be placed. Please try another crossword.</div>';
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
        var title = 'Crossword #' + (cwIndex + 1);

        this._hideCrosswordLoading();
        var playSection = this._mountCrosswordPlayDashboard();
        if (!playSection) return;

        this._renderCrosswordIntoDashboard(playSection, cwData, {
          catMeta: catMeta,
          color: color,
          levelId: levelId,
          lessonId: null,
          cwIndex: cwIndex,
          savedState: savedState,
          lessonData: { title: title }
        });
      } catch (loadError) {
        this._hideCrosswordLoading();
        var errContent3 = document.getElementById('main-content');
        if (errContent3) errContent3.innerHTML = '<div class="fe-error">Could not load this crossword. Please try again.</div>';
      }
    },

    // ─── Daily generated crossword ────────────────────────────────────────────
    // Generates a fresh crossword for today, caches it in localStorage, and
    // overwrites it automatically when the calendar date changes.

    _openDailyGeneratedCrossword: async function(levelId, date) {
      var self = this;
      this._showCrosswordLoading();

      try {
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
            this._hideCrosswordLoading();
            var errContent = document.getElementById('main-content');
            if (errContent) errContent.innerHTML = '<div class="fe-error">No words available for this level.</div>';
            return;
          }
          // Derive a reproducible seed from the date string using a simple hash
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
            this._hideCrosswordLoading();
            var errContent2 = document.getElementById('main-content');
            if (errContent2) errContent2.innerHTML = '<div class="fe-error">Not enough words could be placed. Please try again later.</div>';
            return;
          }
          try {
            localStorage.setItem(storageKey, JSON.stringify({ date: date, cwData: cwData }));
          } catch(e) {}
        }

        if (!cwData || !cwData.placed || cwData.placed.length < CW_MIN_PLACED) {
          this._hideCrosswordLoading();
          var errContent3 = document.getElementById('main-content');
          if (errContent3) errContent3.innerHTML = '<div class="fe-error">Not enough words could be placed. Please try again later.</div>';
          return;
        }

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

        this._hideCrosswordLoading();
        var playSection = this._mountCrosswordPlayDashboard();
        if (!playSection) return;

        this._renderCrosswordIntoDashboard(playSection, cwData, {
          catMeta: catMeta,
          color: color,
          levelId: levelId,
          lessonId: dailyProgressId,
          cwIndex: undefined,
          savedState: savedState,
          lessonData: { title: title }
        });
      } catch (loadError) {
        this._hideCrosswordLoading();
        var errContent4 = document.getElementById('main-content');
        if (errContent4) errContent4.innerHTML = '<div class="fe-error">Could not load today\'s crossword. Please try again.</div>';
      }
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

    // For phrasal verbs, collocations and idioms the clue is "definition | phrase with ___".
    // Always show both parts so the user has enough context to guess the answer.
    _cwFormatClueDisplay: function(clue) {
      if (!clue) return '';
      var sep = clue.indexOf(CW_CLUE_SEP);
      if (sep === -1) return clue;
      var definition = clue.slice(0, sep).trim();
      var blankPart = clue.slice(sep + CW_CLUE_SEP.length).trim();
      if (!definition) return blankPart;
      if (!blankPart) return definition;
      return definition + ' — ' + blankPart;
    },

    // Replace ___ blanks with the solved answer in green; chip fallback when no blanks.
    _cwInjectSolvedBlanks: function(text, word) {
      if (!text) return '';
      if (!word) return FastExercises._escapeHTML(text);
      var answer = word.toLowerCase();
      if (/___+/.test(text)) {
        var parts = text.split(/___+/);
        var html = '';
        for (var i = 0; i < parts.length; i++) {
          html += FastExercises._escapeHTML(parts[i]);
          if (i < parts.length - 1) {
            html += '<strong class="vocab-cw-solved-blank">' + FastExercises._escapeHTML(answer) + '</strong>';
          }
        }
        return html;
      }
      return FastExercises._escapeHTML(text) +
        ' <span class="vocab-cw-solved-chip">' + FastExercises._escapeHTML(answer) + '</span>';
    },

    // Active definition card: two-line layout and inline solved answers.
    _cwFormatActiveDefClueHtml: function(clue, word, solved) {
      if (!clue) return '';
      var sep = clue.indexOf(CW_CLUE_SEP);
      if (sep === -1) {
        var singleLine = solved
          ? FastExercises._cwInjectSolvedBlanks(clue, word)
          : FastExercises._escapeHTML(clue);
        return '<p class="vocab-cw-active-def-line">' + singleLine + '</p>';
      }
      var definition = clue.slice(0, sep).trim();
      var blankPart = clue.slice(sep + CW_CLUE_SEP.length).trim();
      var html = '';
      if (definition) {
        var defLine = solved
          ? FastExercises._cwInjectSolvedBlanks(definition, word)
          : FastExercises._escapeHTML(definition);
        html += '<p class="vocab-cw-active-def-line vocab-cw-active-def-line--definition">' + defLine + '</p>';
      }
      if (blankPart) {
        var phraseLine = solved
          ? FastExercises._cwInjectSolvedBlanks(blankPart, word)
          : FastExercises._escapeHTML(blankPart);
        html += '<p class="vocab-cw-active-def-line vocab-cw-active-def-line--phrase">' + phraseLine + '</p>';
      }
      return html;
    },

    _cwSanitizeClue: function(word, clue) {
      if (!clue || !word) return clue || '';
      var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('\\b' + escaped + '\\b', 'gi');
      var sanitized = clue.replace(re, '___').trim();
      // If the clue became too short after removal, keep the original
      if (sanitized.replace(/[_\s|]/g, '').length < 8) return clue;
      return sanitized;
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
      placed.push({ word: firstW, clue: self._cwSanitizeClue(eligible[0].word, eligible[0].clue || eligible[0].definition || ''), definition: eligible[0].definition || '', example: eligible[0].example || '', row: center, col: startC, dir: 'across', number: 0 });

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
          placed.push({ word: word, clue: self._cwSanitizeClue(wordObj.word, wordObj.clue || wordObj.definition || ''), definition: wordObj.definition || '', example: wordObj.example || '', row: pr, col: pc, dir: pd, number: 0 });
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

      var acrossWords = placed.filter(function(p) { return p.dir === 'across' && p.number; }).sort(function(a, b) { return a.number - b.number; });
      var downWords   = placed.filter(function(p) { return p.dir === 'down'   && p.number; }).sort(function(a, b) { return a.number - b.number; });

      var cwTypeBadge = function(type) {
        if (!type) return '';
        var label = CW_TYPE_LABELS[type] || type;
        return '<span class="vocab-cw-type-badge vocab-cw-type-' + self._escapeHTML(type) + '">' + label + '</span>';
      };

      var buildClue = function(p) {
        return '<button type="button" class="vocab-cw-clue" data-dir="' + p.dir + '" data-num="' + p.number + '" data-r="' + p.row + '" data-c="' + p.col + '">' +
          '<span class="vocab-cw-clue-num">' + p.number + (p.dir === 'across' ? 'A' : 'D') + '</span> ' +
          '<span class="vocab-cw-clue-text">' + self._escapeHTML(self._cwFormatClueDisplay(p.clue || p.definition || '')) + '</span>' +
          cwTypeBadge(p.type) +
        '</button>';
      };

      var buildWordRow = function(word) {
        var wordId = self._cwWordId(word);
        var cellsHtml = '';
        var cells = self._cwGetWordCells(word);
        for (var ci = 0; ci < cells.length; ci++) {
          var cell = cells[ci];
          cellsHtml += '<button type="button" class="vocab-cw-cell" data-r="' + cell.row + '" data-c="' + cell.col + '" data-cell-key="' + cell.cellKey + '" data-word-id="' + wordId + '" data-index="' + cell.index + '" id="cw-cell-' + cell.row + '-' + cell.col + '-' + wordId + '" aria-label="Letter ' + (cell.index + 1) + ' of word ' + word.number + '"></button>';
        }
        var cellSlots = cells.length;
        return '<div class="vocab-cw-word-row" data-word-id="' + wordId + '" data-dir="' + word.dir + '" data-r="' + word.row + '" data-c="' + word.col + '" style="--cw-cells:' + cellSlots + '">' +
          '<button type="button" class="vocab-cw-word-number" data-word-id="' + wordId + '" aria-label="Select word ' + word.number + '">' + word.number + '</button>' +
          '<div class="vocab-cw-cells">' + cellsHtml + '</div>' +
          '<button type="button" class="vocab-cw-word-clear-btn" data-word-id="' + wordId + '" aria-label="Clear incorrect letters" title="Clear incorrect">' +
            '<span class="material-symbols-outlined" aria-hidden="true">ink_eraser</span>' +
          '</button>' +
        '</div>';
      };

      var lessonTitle = lessonData.title || lessonId || '';
      var isStandaloneCrossword = (typeof cwIndex !== 'undefined') || (lessonId && lessonId.indexOf('daily_') === 0);
      var headerTitle = (isStandaloneCrossword && lessonTitle) ? lessonTitle : 'Crossword';
      var headerDetail = (!isStandaloneCrossword && lessonTitle) ? lessonTitle : '';

      mainEl.innerHTML =
        '<div class="vocab-cw-play-sticky-top">' +
          '<div class="vocab-cw-header vocab-cw-header--full vocab-cw-header--duo vocab-cw-header--lvl-' + self._escapeHTML(levelId.toLowerCase()) + '">' +
            '<button class="vocab-cw-back-btn vocab-cw-back-btn--duo" title="Back" aria-label="Back" onclick="BentoGrid._cwPlayBack()">' + _symbolButtonContent('arrow_back', 'Back') + '</button>' +
            '<div class="vocab-cw-header-title">' +
              '<div class="vocab-cw-header-kicker">' + self._escapeHTML(levelId) + '</div>' +
              '<div class="vocab-cw-header-text">' + self._escapeHTML(headerTitle) + '</div>' +
              (headerDetail ? '<div class="vocab-cw-header-lesson">' + self._escapeHTML(headerDetail) + '</div>' : '') +
            '</div>' +
            '<div class="vocab-cw-header-btns">' +
              '<div class="vocab-cw-dir-toggle" id="cw-dir-toggle" data-cw-dir="across" role="tablist" aria-label="Word direction">' +
                '<button type="button" class="vocab-cw-dir-toggle-btn vocab-cw-dir-toggle-btn-active" id="cw-strip-tab-across" role="tab" aria-selected="true" aria-label="Across words" title="Across">' +
                  '<span class="material-symbols-outlined vocab-cw-dir-toggle-icon" aria-hidden="true">trending_flat</span>' +
                  '<span class="vocab-cw-dir-toggle-label">A</span>' +
                '</button>' +
                '<button type="button" class="vocab-cw-dir-toggle-btn" id="cw-strip-tab-down" role="tab" aria-selected="false" aria-label="Down words" title="Down">' +
                  '<span class="material-symbols-outlined vocab-cw-dir-toggle-icon" aria-hidden="true">south</span>' +
                  '<span class="vocab-cw-dir-toggle-label">D</span>' +
                '</button>' +
              '</div>' +
              '<button class="vocab-cw-btn vocab-cw-btn--duo vocab-cw-grid-btn" id="cw-grid-btn" title="Grid view" aria-label="Grid view" aria-pressed="false">' + _mi('grid_view') + '</button>' +
              '<button class="vocab-cw-btn vocab-cw-btn--duo vocab-cw-hint-btn" id="cw-hint-btn" title="Hint" aria-label="Hint">' + _mi('lightbulb') + '</button>' +
              '<button class="vocab-cw-btn vocab-cw-btn--duo vocab-cw-solve-btn" id="cw-solve-btn" title="Solve" aria-label="Solve">' + _mi('auto_fix') + '</button>' +
              '<button class="vocab-cw-btn vocab-cw-btn--duo vocab-cw-reset-btn" id="cw-reset-btn" title="Reset" aria-label="Reset">' + _mi('refresh') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="vocab-cw-active-def vocab-cw-active-def--under-header" id="cw-active-def"><em>Click a word to begin</em></div>' +
        '</div>' +
        '<div class="vocab-cw-body" data-cw-view="list">' +
          '<div class="vocab-cw-play-area">' +
            '<div class="vocab-cw-word-list" id="cw-word-list" data-cw-words-dir="across">' +
              '<section class="vocab-cw-section vocab-cw-section--across">' +
                '<h3 class="vocab-cw-section-title">Across</h3>' +
                acrossWords.map(buildWordRow).join('') +
              '</section>' +
              '<section class="vocab-cw-section vocab-cw-section--down">' +
                '<h3 class="vocab-cw-section-title">Down</h3>' +
                downWords.map(buildWordRow).join('') +
              '</section>' +
            '</div>' +
          '</div>' +
          '<div class="vocab-cw-grid-body" id="cw-grid-area" aria-label="Crossword grid"></div>' +
          '<aside class="vocab-cw-clues vocab-cw-clues--play" id="cw-clues" data-cw-clues-dir="across" aria-label="Clues">' +
            '<h3 class="vocab-cw-clues-heading" id="cw-clues-heading">Across</h3>' +
            '<div class="vocab-cw-clues-scroll">' +
              '<div class="vocab-cw-clue-section vocab-cw-clue-section--across" id="cw-clues-across">' +
                acrossWords.map(buildClue).join('') +
              '</div>' +
              '<div class="vocab-cw-clue-section vocab-cw-clue-section--down" id="cw-clues-down">' +
                downWords.map(buildClue).join('') +
              '</div>' +
            '</div>' +
          '</aside>' +
        '</div>' +
        '<input type="text" id="cw-strip-input" class="vocab-cw-strip-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Crossword letter input" />';

      var cwState = {
        userGrid: {},
        revealedCells: {},
        checkedCells: {},
        lockedCells: {},
        selectedCell: null,
        selectedDir: 'across',
        selectedWordId: null,
        activeWord: null,
        activeStripPos: 0,
        cwData: cwData,
        cellMap: cellMap,
        levelId: levelId,
        lessonId: lessonId,
        cwIndex: cwIndex
      };
      window._cwState = cwState;
      FastExercises._cwMountInlineGrid();
      if (FastExercises._cwIsMobilePlay()) {
        FastExercises._cwSetViewMode('list');
      }

      // Restore previously saved cell state so the user can continue where they left off
      if (savedState && savedState.cellState && typeof savedState.cellState === 'object') {
        var cellStateKeys = Object.keys(savedState.cellState);
        for (var sci = 0; sci < cellStateKeys.length; sci++) {
          var sck = cellStateKeys[sci];
          var letter = savedState.cellState[sck];
          if (typeof letter !== 'string' || !letter) continue;
          cwState.userGrid[sck] = letter.toUpperCase();
        }
      }
      // Restore locked cells (dark green: correctly solved)
      if (savedState && savedState.lockedCells && typeof savedState.lockedCells === 'object') {
        Object.keys(savedState.lockedCells).forEach(function(k) {
          if (savedState.lockedCells[k]) cwState.lockedCells[k] = true;
        });
      }
      // Restore revealed cells (purple: shown via hint/solve)
      if (savedState && savedState.revealedCells && typeof savedState.revealedCells === 'object') {
        Object.keys(savedState.revealedCells).forEach(function(k) {
          if (savedState.revealedCells[k]) cwState.revealedCells[k] = true;
        });
      }
      // Apply visual colours for all restored cells
      if (savedState && savedState.cellState && typeof savedState.cellState === 'object') {
        var cellStateKeys2 = Object.keys(savedState.cellState);
        for (var sci2 = 0; sci2 < cellStateKeys2.length; sci2++) {
          var sck2 = cellStateKeys2[sci2];
          if (typeof savedState.cellState[sck2] !== 'string' || !savedState.cellState[sck2]) continue;
          var parts2 = sck2.split(',');
          var sr2 = parseInt(parts2[0]);
          var sc2 = parseInt(parts2[1]);
          if (!isNaN(sr2) && !isNaN(sc2)) FastExercises._cwUpdateCell(sr2, sc2);
        }
        // Also refresh any revealed cells not covered above
        Object.keys(cwState.revealedCells).forEach(function(k) {
          var rp = k.split(',');
          var rr = parseInt(rp[0]), rc = parseInt(rp[1]);
          if (!isNaN(rr) && !isNaN(rc)) FastExercises._cwUpdateCell(rr, rc);
        });
      }

      var wordListEl = document.getElementById('cw-word-list');
      if (wordListEl) {
        wordListEl.addEventListener('click', function(e) {
          var target = e.target;
          var clearBtn = target.closest('.vocab-cw-word-clear-btn');
          if (clearBtn) {
            e.stopPropagation();
            var clearWordId = clearBtn.getAttribute('data-word-id');
            if (clearWordId) FastExercises._cwClearWordIncorrect(clearWordId);
            return;
          }
          var wordId = target.getAttribute('data-word-id');
          if (!wordId) {
            var rowEl = target.closest('.vocab-cw-word-row');
            if (rowEl) wordId = rowEl.getAttribute('data-word-id');
          }
          if (!wordId) return;

          var cellIndex = 0;
          if (target.classList.contains('vocab-cw-cell')) {
            var idx = parseInt(target.getAttribute('data-index'), 10);
            if (!isNaN(idx)) cellIndex = idx;
            e.stopPropagation();
          } else if (target.classList.contains('vocab-cw-word-number')) {
            e.stopPropagation();
          } else if (!target.classList.contains('vocab-cw-word-row')) {
            return;
          }

          var word = FastExercises._cwFindWordById(wordId);
          if (word) FastExercises._cwSelectWord(word, cellIndex);
        });
      }

      var stripInput = document.getElementById('cw-strip-input');
      if (stripInput) {
        if (FastExercises._cwIsMobilePlay()) {
          stripInput.setAttribute('readonly', 'readonly');
          stripInput.setAttribute('inputmode', 'none');
        }
        stripInput.addEventListener('keydown', function(e) {
          FastExercises._cwKeyHandler(e);
        });
        if (!FastExercises._cwIsMobilePlay()) {
          stripInput.addEventListener('input', function() {
            var val = stripInput.value;
            stripInput.value = '';
            if (val && /[a-zA-Z]/.test(val[val.length - 1])) {
              FastExercises._cwKeyHandler({ key: val[val.length - 1], preventDefault: function() {} });
            }
          });
        }
      }

      var gridBtn = document.getElementById('cw-grid-btn');
      if (gridBtn) gridBtn.addEventListener('click', function() { FastExercises._cwToggleViewMode(); });
      var hintBtn = document.getElementById('cw-hint-btn');
      if (hintBtn) hintBtn.addEventListener('click', function() { FastExercises._cwHint(); });
      var solveBtn = document.getElementById('cw-solve-btn');
      if (solveBtn) solveBtn.addEventListener('click', function() { FastExercises._cwSolveWord(); });
      var resetBtn = document.getElementById('cw-reset-btn');
      if (resetBtn) resetBtn.addEventListener('click', function() { FastExercises._cwReset(); });

      var clueEls = document.querySelectorAll('.vocab-cw-clue');
      for (var ci = 0; ci < clueEls.length; ci++) {
        (function(clueEl) {
          clueEl.addEventListener('click', function() {
            var r2 = parseInt(clueEl.getAttribute('data-r'), 10);
            var c2 = parseInt(clueEl.getAttribute('data-c'), 10);
            var dir = clueEl.getAttribute('data-dir');
            if (!isNaN(r2) && !isNaN(c2) && dir) FastExercises._cwSelectCell(r2, c2, dir);
          });
        })(clueEls[ci]);
      }

      FastExercises._cwShowClueTab('across');
      var stripTabA = document.getElementById('cw-strip-tab-across');
      var stripTabD = document.getElementById('cw-strip-tab-down');
      if (stripTabA) stripTabA.addEventListener('click', function() { FastExercises._cwShowClueTab('across'); });
      if (stripTabD) stripTabD.addEventListener('click', function() { FastExercises._cwShowClueTab('down'); });

      FastExercises._cwBindMobileResize();
      if (FastExercises._cwIsMobilePlay()) {
        var firstAcross = FastExercises._cwGetWordsInDir('across');
        if (firstAcross.length) {
          FastExercises._cwSelectWord(firstAcross[0], 0);
        } else {
          FastExercises._cwSyncMobilePanel();
        }
      }
    },

    _cwSelectWord: function(word, cellIndex, forceDir) {
      if (!word) return;
      var state = window._cwState;
      if (!state) return;
      if (forceDir) state.selectedDir = forceDir;
      else state.selectedDir = word.dir;

      var cells = FastExercises._cwGetWordCells(word);
      var idx = (typeof cellIndex === 'number' && cellIndex >= 0) ? cellIndex : 0;
      if (idx >= cells.length) idx = cells.length - 1;
      var cell = cells[idx];
      if (!cell) return;

      state.selectedWordId = FastExercises._cwWordId(word);
      state.activeStripPos = idx;
      FastExercises._cwSelectCell(cell.row, cell.col, word.dir);
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

      var rowEls = document.querySelectorAll('.vocab-cw-word-row');
      for (var ri = 0; ri < rowEls.length; ri++) rowEls[ri].classList.remove('active');
      var cellEls = document.querySelectorAll('.vocab-cw-cell, .vocab-cw-grid-slot:not(.vocab-cw-grid-slot--empty)');
      for (var i = 0; i < cellEls.length; i++) cellEls[i].classList.remove('vocab-cw-cell-active', 'vocab-cw-cell-word');
      var clueEls = document.querySelectorAll('.vocab-cw-clue');
      for (var ci = 0; ci < clueEls.length; ci++) clueEls[ci].classList.remove('vocab-cw-clue-active');

      var activeWord = null;
      for (var i = 0; i < wordsHere.length; i++) {
        if (wordsHere[i].dir === state.selectedDir) { activeWord = wordsHere[i]; break; }
      }
      state.activeWord = activeWord;

      if (activeWord) {
        state.selectedWordId = FastExercises._cwWordId(activeWord);
        var activeRowEl = document.querySelector('.vocab-cw-word-row[data-word-id="' + state.selectedWordId + '"]');
        if (activeRowEl && FastExercises._cwGetViewMode() !== 'grid') {
          activeRowEl.classList.add('active');
          activeRowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (activeRowEl) {
          activeRowEl.classList.add('active');
        }

        var wordCells = FastExercises._cwGetWordCells(activeWord);
        for (var wi = 0; wi < wordCells.length; wi++) {
          var wc = wordCells[wi];
          var wordCellEls = document.querySelectorAll('.vocab-cw-cell[data-cell-key="' + wc.cellKey + '"], .vocab-cw-grid-slot[data-cell-key="' + wc.cellKey + '"]');
          for (var wj = 0; wj < wordCellEls.length; wj++) wordCellEls[wj].classList.add('vocab-cw-cell-word');
        }

        state.activeStripPos = 0;
        for (var si = 0; si < wordCells.length; si++) {
          if (wordCells[si].row === r && wordCells[si].col === c) {
            state.activeStripPos = wordCells[si].index;
            break;
          }
        }

        FastExercises._cwShowClueTab(activeWord.dir);
        var clueEl = document.querySelector('.vocab-cw-clue[data-dir="' + activeWord.dir + '"][data-num="' + activeWord.number + '"]');
        if (clueEl) {
          clueEl.classList.add('vocab-cw-clue-active');
          clueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        FastExercises._cwRefreshActiveDef();
        FastExercises._cwSyncActiveCellHighlight();
        FastExercises._cwSyncMobilePanel();
      } else {
        FastExercises._cwSyncMobilePanel();
      }

      FastExercises._cwFocusCwInput();
    },

    _cwSyncActiveCellHighlight: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var pos = state.activeStripPos;
      var wr = state.activeWord.dir === 'across' ? state.activeWord.row : state.activeWord.row + pos;
      var wc = state.activeWord.dir === 'across' ? state.activeWord.col + pos : state.activeWord.col;
      var cellKey = wr + ',' + wc;
      var allCellEls = document.querySelectorAll('.vocab-cw-cell, .vocab-cw-grid-slot:not(.vocab-cw-grid-slot--empty)');
      for (var i = 0; i < allCellEls.length; i++) allCellEls[i].classList.remove('vocab-cw-cell-active');
      var activeCellEls = document.querySelectorAll('.vocab-cw-cell[data-cell-key="' + cellKey + '"], .vocab-cw-grid-slot[data-cell-key="' + cellKey + '"]');
      if (FastExercises._cwShouldHighlightActive(state, cellKey)) {
        for (var j = 0; j < activeCellEls.length; j++) activeCellEls[j].classList.add('vocab-cw-cell-active');
      }
      if (FastExercises._cwGetViewMode() === 'grid' && activeCellEls.length) {
        activeCellEls[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },

    _cwKeyHandler: function(e) {
      var state = window._cwState;
      if (!state) return;

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
        if (!FastExercises._cwIsCellProtected(state, wkey) && state.userGrid[wkey]) {
          delete state.userGrid[wkey];
          delete state.checkedCells[wkey];
          FastExercises._cwUpdateCell(wr, wc);
          FastExercises._cwUpdateStatus();
        } else if (pos > 0) {
          // Move back, skipping protected cells, then delete
          var newPos = pos - 1;
          while (newPos > 0) {
            var checkR = activeWord.dir === 'across' ? activeWord.row : activeWord.row + newPos;
            var checkC = activeWord.dir === 'across' ? activeWord.col + newPos : activeWord.col;
            if (!FastExercises._cwIsCellProtected(state, checkR + ',' + checkC)) break;
            newPos--;
          }
          var pr = activeWord.dir === 'across' ? activeWord.row : activeWord.row + newPos;
          var pc = activeWord.dir === 'across' ? activeWord.col + newPos : activeWord.col;
          var pkey = pr + ',' + pc;
          if (!FastExercises._cwIsCellProtected(state, pkey)) {
            delete state.userGrid[pkey];
            delete state.checkedCells[pkey];
            FastExercises._cwUpdateCell(pr, pc);
            FastExercises._cwUpdateStatus();
            state.activeStripPos = newPos;
          }
        }
        FastExercises._cwSyncActiveCellHighlight();
        FastExercises._cwRefreshActiveDef();
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        var wr2 = activeWord.dir === 'across' ? activeWord.row : activeWord.row + pos;
        var wc2 = activeWord.dir === 'across' ? activeWord.col + pos : activeWord.col;
        var ltKey = wr2 + ',' + wc2;
        if (!FastExercises._cwIsCellProtected(state, ltKey)) {
          state.userGrid[ltKey] = e.key.toUpperCase();
          delete state.checkedCells[ltKey];
          FastExercises._cwUpdateCell(wr2, wc2);
          FastExercises._cwUpdateStatus();
          FastExercises._cwRefreshActiveDef();
        }
        // Advance to next non-protected position
        var nextPos = pos + 1;
        while (nextPos < wordLen) {
          var nr3 = activeWord.dir === 'across' ? activeWord.row : activeWord.row + nextPos;
          var nc3 = activeWord.dir === 'across' ? activeWord.col + nextPos : activeWord.col;
          if (!FastExercises._cwIsCellProtected(state, nr3 + ',' + nc3)) break;
          nextPos++;
        }
        if (nextPos < wordLen) state.activeStripPos = nextPos;
        FastExercises._cwSyncActiveCellHighlight();
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
      var letter = state.userGrid[key] || '';
      var cellEls = document.querySelectorAll('.vocab-cw-cell[data-cell-key="' + key + '"]');
      for (var i = 0; i < cellEls.length; i++) {
        var cellEl = cellEls[i];
        cellEl.textContent = letter;
        cellEl.classList.remove('vocab-cw-cell-correct', 'vocab-cw-cell-incorrect', 'vocab-cw-cell-revealed', 'vocab-cw-cell-locked');
        if (state.lockedCells[key]) cellEl.classList.add('vocab-cw-cell-locked');
        else if (state.revealedCells[key]) cellEl.classList.add('vocab-cw-cell-revealed');
        else if (state.checkedCells[key] === 'correct') cellEl.classList.add('vocab-cw-cell-correct');
        else if (state.checkedCells[key] === 'incorrect') cellEl.classList.add('vocab-cw-cell-incorrect');
      }
      var gridCellEls = document.querySelectorAll('.vocab-cw-grid-slot[data-cell-key="' + key + '"]');
      for (var gi = 0; gi < gridCellEls.length; gi++) {
        var gridEl = gridCellEls[gi];
        var letterEl = gridEl.querySelector('.vocab-cw-grid-cell-letter');
        if (letterEl) letterEl.textContent = letter;
        gridEl.classList.remove('vocab-cw-cell-correct', 'vocab-cw-cell-incorrect', 'vocab-cw-cell-revealed', 'vocab-cw-cell-locked');
        if (state.lockedCells[key]) gridEl.classList.add('vocab-cw-cell-locked');
        else if (state.revealedCells[key]) gridEl.classList.add('vocab-cw-cell-revealed');
        else if (state.checkedCells[key] === 'correct') gridEl.classList.add('vocab-cw-cell-correct');
        else if (state.checkedCells[key] === 'incorrect') gridEl.classList.add('vocab-cw-cell-incorrect');
      }
    },

    _cwHint: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;

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
      FastExercises._cwSyncActiveCellHighlight();
      FastExercises._cwUpdateStatus();
      FastExercises._cwRefreshActiveDef();
    },

    _cwSolveWord: function() {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var activeWord = state.activeWord;
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
      FastExercises._cwUpdateClueText(activeWord);
      FastExercises._cwSyncActiveCellHighlight();
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
      // Lock any word that is fully and correctly filled
      state.cwData.placed.forEach(function(word) {
        var allCorrect = true;
        var hasUnlocked = false;
        for (var i = 0; i < word.word.length; i++) {
          var wr = word.dir === 'across' ? word.row : word.row + i;
          var wc = word.dir === 'across' ? word.col + i : word.col;
          var wkey = wr + ',' + wc;
          if (state.lockedCells[wkey] || state.revealedCells[wkey]) continue;
          hasUnlocked = true;
          if (state.userGrid[wkey] !== word.word[i]) { allCorrect = false; break; }
        }
        if (allCorrect && hasUnlocked) {
          for (var j = 0; j < word.word.length; j++) {
            var wr2 = word.dir === 'across' ? word.row : word.row + j;
            var wc2 = word.dir === 'across' ? word.col + j : word.col;
            var wkey2 = wr2 + ',' + wc2;
            if (!state.lockedCells[wkey2]) {
              state.lockedCells[wkey2] = true;
              delete state.checkedCells[wkey2];
              FastExercises._cwUpdateCell(wr2, wc2);
            }
          }
          FastExercises._cwUpdateClueText(word);
        }
      });
      FastExercises._cwUpdateStatus();
      FastExercises._cwSyncActiveCellHighlight();
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
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (grid[r][c] === null) continue;
          FastExercises._cwUpdateCell(r, c);
        }
      }
      FastExercises._cwUpdateStatus();
      var dir = state.selectedDir || 'across';
      var wordsInDir = FastExercises._cwGetWordsInDir(dir);
      if (wordsInDir.length) {
        FastExercises._cwSelectWord(wordsInDir[0], 0);
        return;
      }
      state.selectedWordId = null;
      state.activeWord = null;
      var rowEls = document.querySelectorAll('.vocab-cw-word-row');
      for (var ri = 0; ri < rowEls.length; ri++) rowEls[ri].classList.remove('active');
      FastExercises._cwSyncActiveCellHighlight();
      FastExercises._cwRefreshActiveDef();
    },

    _cwAwardLetterXp: function(cellKeys) {
      var state = window._cwState;
      if (!state || !state.levelId || !cellKeys || !cellKeys.length) return;

      var pKey = state.cwIndex !== undefined
        ? state.levelId + '_cw' + state.cwIndex
        : state.levelId + '_' + state.lessonId;

      var prev = {};
      if (typeof CrosswordSync !== 'undefined') {
        prev = CrosswordSync.get(pKey) || {};
      } else {
        try {
          var raw = localStorage.getItem('cambridge_crossword_progress');
          if (raw) prev = (JSON.parse(raw) || {})[pKey] || {};
        } catch (e) { prev = {}; }
      }

      var earnedLetters = prev.earnedLetters ? Object.assign({}, prev.earnedLetters) : {};
      var lettersXp = prev.lettersXp || 0;
      var newCount = 0;

      cellKeys.forEach(function(k) {
        if (state.revealedCells[k]) return;
        if (earnedLetters[k]) return;
        earnedLetters[k] = true;
        newCount++;
      });

      if (newCount > 0) {
        lettersXp += newCount * 2;
        state._pendingLettersXp = lettersXp;
        state._pendingEarnedLetters = earnedLetters;
      }
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
          var savePayload = {
            level:        state.levelId,
            cwIndex:      state.cwIndex !== undefined ? state.cwIndex : 0,
            completed:    complete === placed.length,
            wordsCorrect: complete,
            wordsTotal:   placed.length,
            cellState:    state.userGrid || {},
            lockedCells:  state.lockedCells || {},
            revealedCells: state.revealedCells || {}
          };
          if (state._pendingLettersXp !== undefined) {
            savePayload.lettersXp = state._pendingLettersXp;
            savePayload.earnedLetters = state._pendingEarnedLetters || {};
            delete state._pendingLettersXp;
            delete state._pendingEarnedLetters;
          }
          CrosswordSync.save(pKey, savePayload);
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
        defEl.innerHTML = '<em>Click a word to begin</em>';
        FastExercises._cwSyncMobilePanel();
        return;
      }
      var wordSolved = FastExercises._cwIsWordComplete(activeWord, state);
      var clueHtml = FastExercises._cwFormatActiveDefClueHtml(
        activeWord.clue || activeWord.definition || '',
        activeWord.word,
        wordSolved
      );
      var exampleHtml = '';
      if (wordSolved && activeWord.example) {
        exampleHtml = '<em class="vocab-cw-active-example">&ldquo;' + FastExercises._escapeHTML(activeWord.example) + '&rdquo;</em>';
      }
      var typeBadgeHtml = '';
      if (activeWord.type) {
        var typeLabel = CW_TYPE_LABELS[activeWord.type] || activeWord.type;
        typeBadgeHtml = '<span class="vocab-cw-type-badge vocab-cw-type-' + FastExercises._escapeHTML(activeWord.type) + '">' + typeLabel + '</span>';
      }
      var dirIcon = activeWord.dir === 'across'
        ? '<span class="vocab-cw-active-def-dir-icon" title="Across" aria-label="Across">' + _mi('trending_flat') + '</span>'
        : '<span class="vocab-cw-active-def-dir-icon" title="Down" aria-label="Down">' + _mi('south') + '</span>';
      defEl.innerHTML =
        '<div class="vocab-cw-active-def-header">' +
          '<span class="vocab-cw-active-def-number">' + activeWord.number + '</span>' +
          dirIcon +
          '<div class="vocab-cw-active-def-meta">' +
            typeBadgeHtml +
          '</div>' +
        '</div>' +
        '<div class="vocab-cw-active-def-body">' + clueHtml + exampleHtml + '</div>';
      FastExercises._cwSyncMobilePanel();
    },

    _cwSelectStripPos: function(pos) {
      var state = window._cwState;
      if (!state || !state.activeWord) return;
      var wordLen = state.activeWord.word.length;
      if (pos < 0 || pos >= wordLen) return;
      var wr = state.activeWord.dir === 'across' ? state.activeWord.row : state.activeWord.row + pos;
      var wc = state.activeWord.dir === 'across' ? state.activeWord.col + pos : state.activeWord.col;
      if (FastExercises._cwIsCellProtected(state, wr + ',' + wc)) return;
      state.activeStripPos = pos;
      FastExercises._cwSyncActiveCellHighlight();
      FastExercises._cwFocusCwInput();
    },

    _cwClearWordIncorrect: function(wordId) {
      var state = window._cwState;
      if (!state) return;
      var word = FastExercises._cwFindWordById(wordId);
      if (!word) return;
      var changed = false;
      for (var i = 0; i < word.word.length; i++) {
        var wr = word.dir === 'across' ? word.row : word.row + i;
        var wc = word.dir === 'across' ? word.col + i : word.col;
        var key = wr + ',' + wc;
        if (FastExercises._cwIsCellProtected(state, key)) continue;
        if (state.userGrid[key] || state.checkedCells[key]) {
          delete state.userGrid[key];
          delete state.checkedCells[key];
          FastExercises._cwUpdateCell(wr, wc);
          changed = true;
        }
      }
      if (!changed) return;
      if (state.selectedWordId === wordId) {
        var cells = FastExercises._cwGetWordCells(word);
        var nextPos = 0;
        while (nextPos < cells.length && FastExercises._cwIsCellProtected(state, cells[nextPos].cellKey)) nextPos++;
        if (nextPos < cells.length) state.activeStripPos = nextPos;
        FastExercises._cwSyncActiveCellHighlight();
        FastExercises._cwRefreshActiveDef();
      }
      FastExercises._cwUpdateStatus();
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
        var earnedKeys = [];
        for (var ei = 0; ei < wordLen; ei++) {
          var er = activeWord.dir === 'across' ? activeWord.row : activeWord.row + ei;
          var ec = activeWord.dir === 'across' ? activeWord.col + ei : activeWord.col;
          var ekey = er + ',' + ec;
          if (!state.lockedCells[ekey] && !state.revealedCells[ekey]) {
            earnedKeys.push(ekey);
          }
        }
        FastExercises._cwAwardLetterXp(earnedKeys);
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
        FastExercises._cwUpdateClueText(activeWord);
      }
      FastExercises._cwSyncActiveCellHighlight();
      FastExercises._cwUpdateStatus();
      FastExercises._cwRefreshActiveDef();
    },

    // Update the clue list entry for a word to show the full definition once solved
    _cwUpdateClueText: function(word) {
      var clueEl = document.querySelector('.vocab-cw-clue[data-dir="' + word.dir + '"][data-num="' + word.number + '"]');
      if (!clueEl) return;
      var textEl = clueEl.querySelector('.vocab-cw-clue-text');
      if (!textEl) return;
      textEl.textContent = FastExercises._cwFormatClueDisplay(word.clue || word.definition || '');
    },

    // ── STANDALONE WORDLE SECTION ───────────────────────────────────────────

    _getWlProgress: function() {
      try {
        return JSON.parse(localStorage.getItem(WL_PROGRESS_KEY) || '{}');
      } catch (e) {
        return {};
      }
    },

    _saveWlProgress: function(pKey, data) {
      try {
        var progress = this._getWlProgress();
        progress[pKey] = Object.assign({}, progress[pKey] || {}, data, { lastPlayed: new Date().toISOString() });
        localStorage.setItem(WL_PROGRESS_KEY, JSON.stringify(progress));
      } catch (e) {}
    },

    _buildVocabWordPool: async function(levelId) {
      var self = this;
      var WORD_RE = /^[a-zA-Z]{3,12}$/;
      var seen = {};
      var pool = [];

      try {
        var vocabRes = await fetch('data/vocabulary/dictionary.json');
        if (vocabRes.ok) {
          var vd = await vocabRes.json();
          (vd.entries || []).forEach(function(e) {
            if (e.level !== levelId || !e.word) return;
            var key = e.word.toLowerCase();
            if (!WORD_RE.test(key) || seen[key]) return;
            seen[key] = 1;
            pool.push({
              word: e.word.toUpperCase(),
              clue: self._cwSanitizeClue(e.word, e.definition || '')
            });
          });
        }
      } catch (e) {}

      return pool;
    },

    _loadWordleLevelData: async function(levelId, wlIndex) {
      var self = this;
      var wordEntry = null;
      try {
        var wlRes = await fetch('/wordle/' + levelId + '/wl' + wlIndex + '.json');
        if (!wlRes.ok) throw new Error('HTTP ' + wlRes.status);
        wordEntry = await wlRes.json();
      } catch (fetchErr) {
        var pool = await this._buildVocabWordPool(levelId);
        if (!pool.length) return { error: 'No words available for Wordle.' };
        var shuffled = this._cwSeededShuffle(pool, wlIndex);
        wordEntry = shuffled[0];
      }

      if (!wordEntry || !wordEntry.word) {
        return { error: 'No words available for Wordle.' };
      }

      var pKey = levelId + '_wl' + wlIndex;
      var saved = this._getWlProgress()[pKey] || null;

      window._wdlState = {
        target: wordEntry.word.toUpperCase(),
        clue: self._cwFormatClueDisplay(wordEntry.clue || ''),
        guesses: saved && saved.guessHistory ? saved.guessHistory.slice() : [],
        results: saved && saved.resultHistory ? saved.resultHistory.slice() : [],
        solved: !!(saved && saved.completed),
        currentInput: '',
        cursorPos: 0,
        levelId: levelId,
        wlIndex: wlIndex,
        levelLabel: 'Level ' + (wlIndex + 1)
      };

      return { ok: true };
    },

    _mountWordlePlayDashboard: function(levelId, wlIndex) {
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var sidebars = (typeof BentoGrid !== 'undefined')
        ? BentoGrid._buildDashboardSidebars(exams)
        : { left: '', right: '' };
      var LEVEL_META = (typeof BentoGrid !== 'undefined' && BentoGrid._wlLevelMeta)
        ? BentoGrid._wlLevelMeta()
        : {};
      var meta = LEVEL_META[levelId] || LEVEL_META['B2'] || { headerColor: '#a855f7' };

      var mobileTopBarHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml
        ? MainNav.buildMobileTopBarHtml() : '';
      var mobileNavHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml
        ? MainNav.buildMobileBottomNavHtml('wordle')
        : '';

      var content = document.getElementById('main-content');
      if (!content) return null;

      content.innerHTML =
        '<div class="dashboard-layout dashboard-layout--crossword-scroll dashboard-layout--wordle-scroll dashboard-layout--wordle-play">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', sidebars.left)
            : '<div class="dashboard-left-sidebar">' + sidebars.left + '</div>') +
          '<div class="dashboard-center dashboard-center--crossword" id="wlPlayCenter">' +
            mobileTopBarHtml +
            '<div class="cw-section-header cw-section-header--wordle cw-section-header--level cw-section-header--duo" style="--cw-header-color:' + meta.headerColor + '">' +
              '<button class="cw-section-back" onclick="history.back()" aria-label="Back">' + _mi('arrow_back') + '</button>' +
              '<div class="cw-section-header-text">' +
                '<div class="cw-section-kicker">' + levelId.toUpperCase() + ' · LEVEL ' + (wlIndex + 1) + '</div>' +
                '<div class="cw-section-title">Guess the Word</div>' +
              '</div>' +
            '</div>' +
            '<div class="cw-page-content" id="wlWordlePage"></div>' +
            mobileNavHtml +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', sidebars.right)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + sidebars.right + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof MainNav !== 'undefined' && MainNav.setActive) MainNav.setActive('wordle');

      return document.getElementById('wlWordlePage');
    },

    _openWordleLevel: async function(levelId, wlIndex, options) {
      options = options || {};
      var self = this;
      AppState.currentView = 'wordlePlay';
      if (!options.fromRoute && typeof Router !== 'undefined') {
        var playState = { view: 'wordlePlay', level: levelId, wlIndex: wlIndex };
        history.pushState(playState, '', Router.stateToPath(playState));
      }

      this._showCrosswordLoading();

      try {
        var loadResult = await this._loadWordleLevelData(levelId, wlIndex);
        if (loadResult.error) {
          this._hideCrosswordLoading();
          var errContent = document.getElementById('main-content');
          if (errContent) errContent.innerHTML = '<div class="fe-error">' + loadResult.error + '</div>';
          return;
        }

        this._hideCrosswordLoading();
        var pageEl = this._mountWordlePlayDashboard(levelId, wlIndex);
        if (!pageEl) return;

        self._wdlBindPlayEvents(pageEl);
        self._renderStandaloneWordle(pageEl);
      } catch (e) {
        this._hideCrosswordLoading();
        var errContent3 = document.getElementById('main-content');
        if (errContent3) errContent3.innerHTML = '<div class="fe-error">Could not load Wordle. Please try again.</div>';
      }
    },

    _wdlIsMobilePlay: function() {
      return FastExercises._cwIsMobilePlay();
    },

    _wdlCanSubmit: function(state) {
      if (!state || !state.target) return false;
      return state.currentInput.length === state.target.length;
    },

    _wdlBindPlayEvents: function(pageEl) {
      if (!pageEl || pageEl._wdlPlayBound) return;
      pageEl._wdlPlayBound = true;

      pageEl.addEventListener('click', function(e) {
        var keyBtn = e.target.closest('#wdl-mobile-keyboard [data-key]');
        if (keyBtn && !keyBtn.disabled) {
          e.preventDefault();
          FastExercises._wdlHandleKey(keyBtn.getAttribute('data-key'));
          return;
        }
        var box = e.target.closest('.vocab-cw-wordle-cur-row .vocab-cw-wordle-box');
        if (box) {
          e.preventDefault();
          var boxes = box.parentElement.querySelectorAll('.vocab-cw-wordle-box');
          for (var bi = 0; bi < boxes.length; bi++) {
            if (boxes[bi] === box) {
              FastExercises._wdlSetCursorPos(bi);
              break;
            }
          }
          return;
        }
        if (e.target.closest('.vocab-cw-wordle-grid, .cw-wordle-play-card, .cw-wordle-def-card')) {
          FastExercises._wdlFocusInput();
        }
      });

      if (!window._wdlGlobalKeyBound) {
        window._wdlGlobalKeyBound = true;
        document.addEventListener('keydown', function(e) {
          if (!e || !e.key) return;
          if (typeof AppState === 'undefined' || AppState.currentView !== 'wordlePlay') return;
          if (FastExercises._wdlIsMobilePlay()) return;
          var target = e.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
              target.tagName === 'SELECT' || target.isContentEditable)) {
            return;
          }
          var state = window._wdlState;
          if (!state || state.solved || state.guesses.length >= 6) return;
          if (e.key === 'Enter' || e.key === 'Backspace' || (e.key.length === 1 && /[a-zA-Z]/.test(e.key))) {
            e.preventDefault();
            FastExercises._wdlFocusInput();
            if (e.key === 'Enter' && !FastExercises._wdlCanSubmit(state)) return;
            FastExercises._wdlHandleKey(e.key);
          }
        });
      }
    },

    _wdlBindInputEvents: function(wdlInput) {
      if (!wdlInput || wdlInput._wdlInputBound) return;
      wdlInput._wdlInputBound = true;
      wdlInput.addEventListener('keydown', function(e) {
        FastExercises._wdlKeyHandler(e);
      });
      if (!FastExercises._wdlIsMobilePlay()) {
        wdlInput.addEventListener('input', function() {
          var val = wdlInput.value;
          wdlInput.value = '';
          if (val && /[a-zA-Z]/.test(val[val.length - 1])) {
            FastExercises._wdlHandleKey(val[val.length - 1]);
          }
        });
      }
    },

    _wdlBuildMobileKeyboardHtml: function() {
      var rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
      ];
      var html = '';
      for (var ri = 0; ri < rows.length; ri++) {
        html += '<div class="wdl-mobile-keyboard-row">';
        for (var ki = 0; ki < rows[ri].length; ki++) {
          var key = rows[ri][ki];
          if (key === 'BACKSPACE') {
            html += '<button type="button" class="wdl-mobile-key wdl-mobile-key--wide" data-key="Backspace" aria-label="Backspace">' +
              '<span class="material-symbols-outlined" aria-hidden="true">backspace</span>' +
            '</button>';
          } else if (key === 'ENTER') {
            html += '<button type="button" class="wdl-mobile-key wdl-mobile-key--enter" data-key="Enter" aria-label="Submit">CHECK</button>';
          } else {
            html += '<button type="button" class="wdl-mobile-key" data-key="' + key + '" aria-label="' + key + '">' + key + '</button>';
          }
        }
        html += '</div>';
      }
      return html;
    },

    _wdlFocusInput: function() {
      if (FastExercises._wdlIsMobilePlay()) return;
      var wdlInput = document.getElementById('wdl-input');
      if (wdlInput) wdlInput.focus();
    },

    _wdlEnsureCursorPos: function(state) {
      if (!state) return 0;
      var wordLen = state.target ? state.target.length : 0;
      if (typeof state.cursorPos !== 'number' || isNaN(state.cursorPos)) {
        state.cursorPos = state.currentInput.length;
      }
      state.cursorPos = Math.max(0, Math.min(state.cursorPos, wordLen));
      if (state.cursorPos > state.currentInput.length) {
        state.cursorPos = state.currentInput.length;
      }
      return state.cursorPos;
    },

    _wdlSetCursorPos: function(pos) {
      var state = window._wdlState;
      if (!state || state.solved || state.guesses.length >= 6) return;
      var wordLen = state.target.length;
      pos = Math.max(0, Math.min(pos, wordLen - 1));
      if (pos > state.currentInput.length) pos = state.currentInput.length;
      state.cursorPos = pos;
      FastExercises._wdlUpdateInputUI();
      FastExercises._wdlFocusInput();
    },

    _wdlHandleKey: function(key) {
      var state = window._wdlState;
      if (!state || state.solved || state.guesses.length >= 6) return;
      var wordLen = state.target.length;
      var pos = FastExercises._wdlEnsureCursorPos(state);

      if (key === 'Enter') {
        if (FastExercises._wdlCanSubmit(state)) FastExercises._wdlSubmit();
        return;
      }
      if (key === 'Backspace') {
        if (state.currentInput.length > 0 && pos > 0) {
          state.currentInput = state.currentInput.slice(0, pos - 1) + state.currentInput.slice(pos);
          state.cursorPos = pos - 1;
          FastExercises._wdlUpdateInputUI();
        }
        return;
      }
      if (key && key.length === 1 && /[a-zA-Z]/.test(key)) {
        var letter = key.toUpperCase();
        if (pos < state.currentInput.length) {
          state.currentInput = state.currentInput.slice(0, pos) + letter + state.currentInput.slice(pos + 1);
          state.cursorPos = Math.min(pos + 1, wordLen);
        } else if (state.currentInput.length < wordLen) {
          state.currentInput += letter;
          state.cursorPos = state.currentInput.length;
        }
        FastExercises._wdlUpdateInputUI();
      }
    },

    _wdlUpdateInputUI: function() {
      var state = window._wdlState;
      if (!state) return;
      var wordLen = state.target.length;
      var cursorPos = FastExercises._wdlEnsureCursorPos(state);
      var rowEl = document.querySelector('.vocab-cw-wordle-cur-row');
      if (rowEl) {
        var boxes = rowEl.querySelectorAll('.vocab-cw-wordle-box');
        for (var ci = 0; ci < wordLen && ci < boxes.length; ci++) {
          var ltr = state.currentInput[ci] || '';
          var box = boxes[ci];
          box.textContent = ltr;
          box.className = 'vocab-cw-wordle-box wdl-empty' + (ci === cursorPos ? ' wdl-cur' : '');
        }
      }
      var canSubmit = FastExercises._wdlCanSubmit(state);
      var checkBtn = document.getElementById('wdl-check-btn');
      if (checkBtn) checkBtn.disabled = !canSubmit;
      var enterKey = document.querySelector('.wdl-mobile-key--enter');
      if (enterKey) enterKey.disabled = !canSubmit;
      var msgEl = document.getElementById('wdl-msg');
      if (msgEl && msgEl.querySelector('span[style*="ef4444"]')) msgEl.innerHTML = '';
    },

    _renderStandaloneWordle: function(pageEl) {
      var state = window._wdlState;
      if (!state || !pageEl) return;
      var wordLen = state.target.length;
      var MAX_GUESSES = 6;
      var isMobile = FastExercises._wdlIsMobilePlay();
      var guessNum = state.guesses.length;
      var progressPct = state.solved
        ? 100
        : Math.round((guessNum / MAX_GUESSES) * 100);

      var rowsHtml = '';
      for (var g = 0; g < state.guesses.length; g++) {
        var guess = state.guesses[g];
        var result = state.results[g];
        rowsHtml += '<div class="vocab-cw-wordle-row">';
        for (var i = 0; i < wordLen; i++) {
          rowsHtml += '<div class="vocab-cw-wordle-box wdl-' + (result[i] || 'gray') + '">' + (guess[i] || '') + '</div>';
        }
        rowsHtml += '</div>';
      }
      if (!state.solved && state.guesses.length < MAX_GUESSES) {
        rowsHtml += '<div class="vocab-cw-wordle-row vocab-cw-wordle-cur-row">';
        var renderCursor = FastExercises._wdlEnsureCursorPos(state);
        for (var ci = 0; ci < wordLen; ci++) {
          var ltr = state.currentInput[ci] || '';
          var boxCls = 'vocab-cw-wordle-box wdl-empty' + (ci === renderCursor ? ' wdl-cur' : '');
          rowsHtml += '<div class="' + boxCls + '">' + ltr + '</div>';
        }
        rowsHtml += '</div>';
        for (var g2 = state.guesses.length + 1; g2 < MAX_GUESSES; g2++) {
          rowsHtml += '<div class="vocab-cw-wordle-row">';
          for (var ei = 0; ei < wordLen; ei++) rowsHtml += '<div class="vocab-cw-wordle-box wdl-empty"></div>';
          rowsHtml += '</div>';
        }
      }

      var msgHtml = state.solved
        ? '<span class="vocab-cw-wordle-solved">' + _mi('check_circle') + ' Solved!</span>'
        : (state.guesses.length >= MAX_GUESSES
            ? '<span class="vocab-cw-wordle-failed">Answer: <strong>' + FastExercises._escapeHTML(state.target.toLowerCase()) + '</strong></span>'
            : '');

      var actionsHtml = '';
      var canSubmit = FastExercises._wdlCanSubmit(state);
      if (!state.solved && state.guesses.length < MAX_GUESSES) {
        actionsHtml += '<button type="button" id="wdl-check-btn" class="wdl-duo-btn wdl-duo-btn--check"' +
          (canSubmit ? '' : ' disabled') +
          ' onclick="FastExercises._wdlSubmit()">' + _mi('check') + '<span>CHECK</span></button>';
      }
      actionsHtml += '<button type="button" class="wdl-duo-btn wdl-duo-btn--retry" onclick="FastExercises._wdlReset()">' + _mi('restart_alt') + '<span>Retry</span></button>';

      var keyboardHtml = isMobile
        ? '<div id="wdl-mobile-keyboard" class="wdl-mobile-keyboard" role="group" aria-label="Letter keyboard">' +
            FastExercises._wdlBuildMobileKeyboardHtml() +
          '</div>'
        : '';

      pageEl.innerHTML =
        '<div class="cw-wordle-duo">' +
          '<div class="cw-wordle-duo-progress" aria-hidden="true">' +
            '<div class="cw-wordle-duo-progress-fill" style="width:' + progressPct + '%"></div>' +
          '</div>' +
          '<div class="cw-wordle-def-card cw-wordle-def-card--duo">' +
            '<div class="cw-wordle-def-label">Definition</div>' +
            '<p class="cw-wordle-def-text">' + FastExercises._escapeHTML(state.clue) + '</p>' +
            '<div class="cw-wordle-def-meta">' +
              '<span class="cw-wordle-duo-badge">' + wordLen + ' letters</span>' +
              '<span class="cw-wordle-duo-badge">' + FastExercises._escapeHTML(state.levelLabel || 'Wordle') + '</span>' +
              '<span class="cw-wordle-duo-badge">' + guessNum + ' / ' + MAX_GUESSES + ' tries</span>' +
            '</div>' +
          '</div>' +
          '<div class="cw-wordle-play-card cw-wordle-play-card--duo">' +
            '<div class="vocab-cw-wordle-grid">' + rowsHtml + '</div>' +
            '<div class="vocab-cw-wordle-actions wdl-duo-actions">' + actionsHtml + '</div>' +
            '<div class="vocab-cw-wordle-msg" id="wdl-msg">' + msgHtml + '</div>' +
          '</div>' +
          keyboardHtml +
          '<input type="text" id="wdl-input" class="vocab-cw-strip-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Wordle input" />' +
        '</div>';

      var wdlInput = document.getElementById('wdl-input');
      if (wdlInput) {
        if (isMobile) {
          wdlInput.setAttribute('readonly', 'readonly');
          wdlInput.setAttribute('inputmode', 'none');
        } else {
          wdlInput.removeAttribute('readonly');
          wdlInput.removeAttribute('inputmode');
          wdlInput.value = '';
        }
        FastExercises._wdlBindInputEvents(wdlInput);
        FastExercises._wdlFocusInput();
      }

      FastExercises._wdlUpdateInputUI();
    },

    _wdlKeyHandler: function(e) {
      if (!e || !e.key) return;
      var state = window._wdlState;
      if (!state || state.solved || state.guesses.length >= 6) return;
      if (e.key === 'Enter' || e.key === 'Backspace' || (e.key.length === 1 && /[a-zA-Z]/.test(e.key))) {
        e.preventDefault();
        if (e.key === 'Enter' && !FastExercises._wdlCanSubmit(state)) return;
        FastExercises._wdlHandleKey(e.key);
      }
    },

    _wdlSubmit: function() {
      var state = window._wdlState;
      if (!state || state.solved || state.guesses.length >= 6) return;
      if (!FastExercises._wdlCanSubmit(state)) return;
      var guess = state.currentInput;
      var result = FastExercises._cwEvalWordle(guess, state.target);
      state.guesses.push(guess);
      state.results.push(result);
      if (result.every(function(r) { return r === 'green'; })) state.solved = true;
      state.currentInput = '';
      state.cursorPos = 0;

      if (state.levelId !== undefined && typeof state.wlIndex !== 'undefined') {
        var pKey = state.levelId + '_wl' + state.wlIndex;
        FastExercises._saveWlProgress(pKey, {
          completed: state.solved,
          guesses: state.guesses.length,
          guessHistory: state.guesses.slice(),
          resultHistory: state.results.slice()
        });
      }

      FastExercises._wdlRerender();
    },

    _wdlReset: function() {
      var state = window._wdlState;
      if (!state) return;
      state.guesses = [];
      state.results = [];
      state.solved = false;
      state.currentInput = '';
      state.cursorPos = 0;
      if (state.levelId !== undefined && typeof state.wlIndex !== 'undefined') {
        var pKey = state.levelId + '_wl' + state.wlIndex;
        FastExercises._saveWlProgress(pKey, {
          completed: false,
          guesses: 0,
          guessHistory: [],
          resultHistory: []
        });
      }
      FastExercises._wdlRerender();
    },

    _wdlRerender: function() {
      var pageEl = document.getElementById('wlWordlePage');
      if (pageEl) FastExercises._renderStandaloneWordle(pageEl);
    },

    _showDictionariesHome: function() {
      var isDesktop = window.matchMedia && window.matchMedia('(min-width: 769px)').matches;
      var dictBtn = typeof MainNav !== 'undefined' && MainNav._getStatsBarButton
        ? MainNav._getStatsBarButton('dict')
        : document.querySelector('.dashboard-right-sidebar .stats-bar-xp, .mobile-nav-top-stats .stats-bar-xp');
      if (isDesktop && dictBtn && typeof MainNav !== 'undefined') {
        dictBtn.click();
        return;
      }

      var existing = document.getElementById('dict-home-modal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'dict-home-modal';
      modal.className = 'dict-home-overlay';
      modal.innerHTML =
        '<div class="dict-home-box dict-home-box--duo">' +
          '<div class="dict-home-header dict-home-header--duo">' +
            '<span class="dict-home-icon"><span class="material-symbols-outlined">menu_book</span></span>' +
            '<h2 class="dict-home-title">Dictionaries</h2>' +
            '<button class="dict-home-close" onclick="document.getElementById(\'dict-home-modal\').remove()">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<div class="dict-home-grid dict-home-grid--duo">' +
            '<button class="dict-home-card dict-home-card--duo" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showGeneralDictionary();">' +
              '<span class="dict-home-card-icon dict-home-card-icon--duo"><span class="material-symbols-outlined">search</span></span>' +
              '<span class="dict-home-card-name">General Dictionary</span>' +
            '</button>' +
            '<button class="dict-home-card dict-home-card--duo" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showVocabDictionary();">' +
              '<span class="dict-home-card-icon dict-home-card-icon--duo"><span class="material-symbols-outlined">library_books</span></span>' +
              '<span class="dict-home-card-name">Vocabulary</span>' +
            '</button>' +
            '<button class="dict-home-card dict-home-card--duo" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showWfDictionary();">' +
              '<span class="dict-home-card-icon dict-home-card-icon--duo"><span class="material-symbols-outlined">text_fields</span></span>' +
              '<span class="dict-home-card-name">Word Formation</span>' +
            '</button>' +
            '<button class="dict-home-card dict-home-card--duo" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showPvDictionary();">' +
              '<span class="dict-home-card-icon dict-home-card-icon--duo"><span class="material-symbols-outlined">auto_stories</span></span>' +
              '<span class="dict-home-card-name">Phrasal Verbs</span>' +
            '</button>' +
            '<button class="dict-home-card dict-home-card--duo" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showIdDictionary();">' +
              '<span class="dict-home-card-icon dict-home-card-icon--duo"><span class="material-symbols-outlined">record_voice_over</span></span>' +
              '<span class="dict-home-card-name">Idioms</span>' +
            '</button>' +
            '<button class="dict-home-card dict-home-card--duo" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showCollocDictionary();">' +
              '<span class="dict-home-card-icon dict-home-card-icon--duo"><span class="material-symbols-outlined">format_quote</span></span>' +
              '<span class="dict-home-card-name">Collocations</span>' +
            '</button>' +
            '<button class="dict-home-card dict-home-card--duo" onclick="document.getElementById(\'dict-home-modal\').remove(); FastExercises._showIrregularVerbsDictionary();">' +
              '<span class="dict-home-card-icon dict-home-card-icon--duo"><span class="material-symbols-outlined">table_view</span></span>' +
              '<span class="dict-home-card-name">Irregular Verbs</span>' +
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
