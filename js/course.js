// js/course.js
// Course section: lessons, units, grammar, vocabulary, review exercises

(function() {
  var CU_PAGE_SIZE = 4; // max items per page in paginated course exercises (balanced 4+4 for 8-item sections)
  var CU_MC_BLANK = '<span class="cu-mc-blank">&#9135;&#9135;&#9135;&#9135;&#9135;</span>';

  Object.assign(window.BentoGrid, {
    // Extract display text from an MC option string like "A special" or "A. special"
    _getCuMcOptionText: function(optionStr) {
      return (optionStr || '').slice(1).replace(/^[.)\s]+/, '').trim();
    },

    openLessons: async function() {
      var content = document.getElementById('main-content');
      if (!content) return;
      var level = AppState.currentLevel || 'C1';

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      // Build home-page style sidebars
      var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(window.EXAMS_DATA[level] || []);
      }
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        rightSidebarContent = BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
      }

      // Render initial layout with loading spinner in center
      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="fe-section" id="courseCenterSection">' +
              '<div class="fe-loading"><div class="fe-spinner"></div></div>' +
            '</div>' +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>') +
        '</div>';
      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof BentoGrid !== 'undefined') BentoGrid._startGradeCarousel();

      var centerSection = document.getElementById('courseCenterSection');
      if (!centerSection) return;

      var headerHtml =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="loadDashboard()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' Course</div>' +
            '<div class="subpage-subtitle">Structured lessons for ' + level + '</div>' +
          '</div>' +
        '</div>';

      centerSection.innerHTML = headerHtml + await BentoGrid._renderCourseLearningTiles();
      var courseState = { view: 'course', level: level };
      history.pushState(courseState, '', Router.stateToPath(courseState));
    },

    openCourseTheory: async function() {
      var content = document.getElementById('main-content');
      if (!content) return;
      var level = AppState.currentLevel || 'C1';

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      // Render initial layout with loading spinners
      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'courseLeftSidebarShell', 'courseLeftSidebar', '<div class="fe-loading"><div class="fe-spinner"></div></div>')
            : '<div class="dashboard-left-sidebar" id="courseLeftSidebar"><div class="fe-loading"><div class="fe-spinner"></div></div></div>') +
          '<div class="dashboard-center">' +
            '<div class="fe-section" id="courseCenterSection">' +
              '<div class="fe-loading"><div class="fe-spinner"></div></div>' +
            '</div>' +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', '')
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar"></div>') +
        '</div>';
      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();

      // Try to fetch index.json for this level
      var indexData = null;
      try {
        var r = await fetch('data/Course/' + level + '/index.json');
        if (r.ok) indexData = await r.json();
      } catch(e) { /* no index available */ }

      var leftSidebar = document.getElementById('courseLeftSidebar');
      var centerSection = document.getElementById('courseCenterSection');
      if (!leftSidebar || !centerSection) return;

      var headerHtml =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="BentoGrid.openLessons()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('menu_book') + ' Theory</div>' +
            '<div class="subpage-subtitle">Grammar &amp; Vocabulary theory blocks for ' + level + '</div>' +
          '</div>' +
        '</div>';

      if (indexData && indexData.items && indexData.items.length > 0) {
        // Group items by block and store for block switching
        var blocks = {};
        var blockOrder = [];
        indexData.items.forEach(function(item) {
          var blockKey = item.block != null ? String(item.block) : 'misc';
          if (!blocks[blockKey]) {
            blocks[blockKey] = [];
            blockOrder.push(blockKey);
          }
          blocks[blockKey].push(item);
        });

        BentoGrid._courseBlocks = blocks;
        BentoGrid._courseBlockOrder = blockOrder;
        BentoGrid._courseLevel = level;
        BentoGrid._courseIndexData = indexData;
        await BentoGrid._ensureCourseUnitMeta(level, indexData.items);

        leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(indexData, level, null);
        centerSection.innerHTML = headerHtml + BentoGrid._renderCourseOverview();
      } else {
        leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(null, level, null);
        centerSection.innerHTML = headerHtml +
          '<div class="fe-map-container">' +
          '<div class="lt-coming-soon-banner">' +
            _mi('schedule') +
            '<div class="lt-coming-soon-text">' +
              '<strong>Coming Soon</strong>' +
              '<span>The Course curriculum is under development. Structured lessons with explanations, exercises, and progress tracking will be available here soon.</span>' +
            '</div>' +
          '</div>' +
          '</div>';
      }
      var theoryState = { view: 'courseTheory', level: level };
      history.pushState(theoryState, '', Router.stateToPath(theoryState));
    },

    _renderCourseLearningTiles: async function() {
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      // Theory tile: full-width card styled like fe-category-card
      var theoryCard =
        '<div class="fe-category-card" style="--cat-color:#0284c7" onclick="BentoGrid.openCourseTheory()">' +
          '<div class="fe-category-card-header">' +
            '<span class="fe-category-icon">' + _mi('menu_book') + '</span>' +
            '<div class="fe-category-info">' +
              '<div class="fe-category-name">Theory</div>' +
              '<div class="fe-category-stats">Grammar &amp; Vocabulary blocks</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      // Category tiles: load progress data for each
      var catDefs = [
        { id: 'phrasal-verbs', icon: 'auto_stories', name: 'Phrasal Verbs', color: '#3b82f6' },
        { id: 'idioms', icon: 'record_voice_over', name: 'Idioms', color: '#f59e0b' },
        { id: 'word-formation', icon: 'text_fields', name: 'Word Formation', color: '#e11d48' }
      ];

      var categoryCards = '';
      for (var i = 0; i < catDefs.length; i++) {
        var cat = catDefs[i];
        var data = null;
        try { data = await FastExercises._loadCategoryData(cat.id); } catch(e) { console.warn('Course hub: failed to load category data for ' + cat.id, e); }
        var pct = data ? FastExercises._getCategoryPercent(cat.id, data.levels) : 0;
        var totalPoints = data ? FastExercises._getTotalPoints(data.levels) : 0;

        var levelBtnsHtml = '';
        if (data && data.levels) {
          for (var lvIdx = 0; lvIdx < data.levels.length; lvIdx++) {
            var lv = data.levels[lvIdx];
            var isUnlocked = FastExercises._isLevelUnlocked(cat.id, lv.id, data.levels);
            var lockClass = isUnlocked ? '' : ' fe-cat-level-btn-locked';
            var lvClick = isUnlocked
              ? 'onclick="event.stopPropagation(); FastExercises._switchLevel(\'' + cat.id + '\', \'' + lv.id + '\')"'
              : '';
            levelBtnsHtml += '<button class="fe-cat-level-btn' + lockClass + '" style="background:' + cat.color + '" ' + lvClick + '>' + lv.id + '</button>';
          }
        }

        categoryCards +=
          '<div class="fe-category-card" style="--cat-color:' + cat.color + '" onclick="FastExercises.openCategory(\'' + cat.id + '\')">' +
            '<div class="fe-category-card-header">' +
              '<span class="fe-category-icon">' + _mi(cat.icon) + '</span>' +
              '<div class="fe-category-info">' +
                '<div class="fe-category-name">' + cat.name + '</div>' +
                '<div class="fe-category-stats">' + totalPoints + ' items</div>' +
              '</div>' +
            '</div>' +
            '<div class="fe-category-progress">' +
              '<div class="fe-progress-bar-bg">' +
                '<div class="fe-progress-bar-fill" style="width:' + pct + '%;background:' + cat.color + '"></div>' +
              '</div>' +
              '<span class="fe-progress-text">' + pct + '% complete</span>' +
            '</div>' +
            '<div class="fe-cat-level-btns">' + levelBtnsHtml + '</div>' +
          '</div>';
      }

      return '<div class="course-hub-grid">' +
        theoryCard +
        categoryCards +
      '</div>';
    },

    _getBlockLabel: function(bk) {
      var ptMatch = bk.match(/^pt(\d+)$/);
      if (ptMatch) return 'Progress Test ' + ptMatch[1];
      if (bk !== 'misc') return 'Block ' + bk;
      return 'Other';
    },

    _selectCourseBlock: function(blockKey) {
      var centerSection = document.getElementById('courseCenterSection');
      if (!centerSection || !BentoGrid._courseBlocks) return;

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      var level = BentoGrid._courseLevel || 'C1';
      var blockProgress = BentoGrid._getCourseProgress(level);
      var blockItems = (BentoGrid._courseBlocks || {})[blockKey] || [];
      var blockHasProgress = blockItems.some(function(i) { return !!blockProgress[i.id]; });
      var isPtBlock = /^pt\d+$/.test(blockKey);
      var resetBlockBtn = (!isPtBlock && blockHasProgress)
        ? '<button class="cu-reset-btn" onclick="BentoGrid._resetCourseBlock(\'' + blockKey + '\')" title="Restart block">' + _mi('restart_alt') + ' Restart</button>'
        : '';
      var blockLabel = BentoGrid._getBlockLabel(blockKey);
      var headerHtml =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="BentoGrid._backToCourseOverview()">Overview</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' ' + blockLabel + '</div>' +
            '<div class="subpage-subtitle">Structured lessons for ' + level + '</div>' +
          '</div>' +
          resetBlockBtn +
        '</div>';

      centerSection.innerHTML = headerHtml + BentoGrid._renderCourseBlockView(blockKey);
      var cbState = { view: 'courseBlock', blockKey: blockKey, level: level };
      history.pushState(cbState, '', Router.stateToPath(cbState));
    },

    _backToCourseOverview: function() {
      var centerSection = document.getElementById('courseCenterSection');
      if (!centerSection) return;
      var level = BentoGrid._courseLevel || 'C1';
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      var headerHtml =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="BentoGrid.openLessons()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('menu_book') + ' Theory</div>' +
            '<div class="subpage-subtitle">Grammar &amp; Vocabulary theory blocks for ' + level + '</div>' +
          '</div>' +
        '</div>';
      centerSection.innerHTML = headerHtml + BentoGrid._renderCourseOverview();
      // Update left sidebar to deselect any active unit
      var leftSidebar = document.getElementById('courseLeftSidebar');
      if (leftSidebar && BentoGrid._courseIndexData) {
        leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(BentoGrid._courseIndexData, level, null);
      }
      var theoryState = { view: 'courseTheory', level: level };
      history.pushState(theoryState, '', Router.stateToPath(theoryState));
    },

    _renderCourseBlockView: function(activeBlockKey) {
      var self = this;
      var level = BentoGrid._courseLevel || 'C1';
      var blocks = BentoGrid._courseBlocks || {};
      var progress = BentoGrid._getCourseProgress(level);
      var sectionProgress = BentoGrid._getCourseSectionProgress(level);
      var openedProgress = BentoGrid._getCourseSectionOpened(level);

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      var items = blocks[activeBlockKey] || [];
      var unitItems = items.filter(function(i) { return i.type === 'grammar' || i.type === 'vocabulary'; });
      var reviewItem = items.find(function(i) { return i.type === 'review'; });
      var progressTestItem = items.find(function(i) { return i.type === 'progress_test'; });

      var html = '<div class="cu-course-view"><div class="fe-map-container">';

      // Progress test block: render as a single large card
      if (progressTestItem) {
        var isPtAvail = progressTestItem.status === 'available';
        var isPtDone = !!progress[progressTestItem.id];
        var ptPath = 'data/Course/' + level + '/' + progressTestItem.file;
        var ptScore = BentoGrid._getPtScore(level, progressTestItem.id);
        var ptTotal = progressTestItem.totalPoints || 100;

        html += '<div class="cu-unit-section cu-pt-section">';
        html += '<div class="cu-unit-section-header">' +
          '<span style="color:#f59e0b">' + _mi('assignment') + '</span>' +
          '<span class="cu-us-title">' + self._escapeHTML(progressTestItem.title) + '</span>' +
          (isPtDone ? '<span class="cu-us-done">' + _mi('check_circle') + '</span>' : '') +
        '</div>';

        if (isPtAvail) {
          var scoreLabel = ptScore !== null ? (ptScore + ' / ' + ptTotal) : '–/' + ptTotal;
          html += '<div class="fe-map-lesson fe-map-pt-block ' + (isPtDone ? 'fe-lesson-complete' : 'fe-lesson-active') + '" style="cursor:pointer" ' +
            'onclick="BentoGrid.openCourseUnit(\'' + progressTestItem.id + '\',\'' + ptPath + '\')">' +
            '<div class="fe-map-lesson-title">' +
              '<span class="fe-map-lesson-num">' + _mi('assignment') + ' Progress Test</span>' +
              '<span class="fe-rs-total-score' + (ptScore === null ? ' fe-rs-score-pending' : '') + '">' + scoreLabel + '</span>' +
            '</div>' +
            '<div class="cu-pt-block-desc">' + _mi('info') + ' ' + self._escapeHTML((progressTestItem.title || '').replace(/^Progress Test \d+\s*[—–-]\s*/i, '')) + '</div>' +
            '<div class="cu-pt-block-cta">' + (isPtDone ? _mi('restart_alt') + ' Retake Test' : _mi('play_arrow') + ' Take the Test') + '</div>' +
          '</div>';
        } else {
          html += '<div class="fe-map-lesson fe-lesson-locked">' +
            '<div class="fe-map-lesson-title">' +
              '<span class="fe-map-lesson-lock">' + _mi('lock') + ' Coming Soon</span>' +
            '</div>' +
          '</div>';
        }

        html += '</div>'; // .cu-unit-section
        html += '</div></div>';
        return html;
      }

      unitItems.forEach(function(item, uIdx) {
        var isAvail = item.status === 'available';
        var isDone = !!progress[item.id];
        var typeIcon = item.type === 'grammar' ? 'menu_book' : 'translate';
        var typeColor = item.type === 'grammar' ? '#3b82f6' : '#10b981';
        var theoryLabel = item.type === 'grammar' ? 'Theory' : 'Vocabulary';
        var theoryName = item.type === 'grammar' ? 'Grammar Study' : 'Vocabulary Study';
        var unitPath = 'data/Course/' + level + '/' + item.file;

        if (uIdx > 0) {
          html += '<div class="fe-map-connector"></div>';
        }

        html += '<div class="cu-unit-section">';
        html += '<div class="cu-unit-section-header">' +
          '<span style="color:' + typeColor + '">' + _mi(typeIcon) + '</span>' +
          '<span class="cu-us-title">' + self._escapeHTML(item.title) + '</span>' +
          (isDone ? '<span class="cu-us-done">' + _mi('check_circle') + '</span>' : '') +
        '</div>';

        if (isAvail) {
          var meta = BentoGrid._courseUnitMeta && BentoGrid._courseUnitMeta[item.id];
          var unitSectionProgress = sectionProgress[item.id] || {};
          var unitOpenedProgress = openedProgress[item.id] || {};
          var theoryPoints = meta && meta.theory && meta.theory.length ? meta.theory : [{ label: theoryLabel, sectionIdx: 0 }];
          var exercisePoints = meta && meta.exercises && meta.exercises.length ? meta.exercises : [{ label: 'A', sectionIdx: theoryPoints.length }];
          html +=
            '<div class="fe-map-lesson ' + (isDone ? 'fe-lesson-complete' : 'fe-lesson-active') + '" style="cursor:pointer" ' +
              'onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'' + unitPath + '\', 0)">' +
              '<div class="fe-map-lesson-title">' +
                '<span class="fe-map-lesson-num">' + theoryLabel + '</span>' +
              '</div>' +
              BentoGrid._buildCourseBlockDotsHtml(theoryPoints, unitSectionProgress, unitOpenedProgress, 'fe-dot-explanation', item.id, unitPath) +
            '</div>' +
            '<div class="fe-map-lesson ' + (isDone ? 'fe-lesson-complete' : 'fe-lesson-pending') + '" style="cursor:pointer;margin-top:10px" ' +
              'onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'' + unitPath + '\', \'exercises\')">' +
              '<div class="fe-map-lesson-title">' +
                '<span class="fe-map-lesson-num">Exercises</span>' +
              '</div>' +
              BentoGrid._buildCourseBlockDotsHtml(exercisePoints, unitSectionProgress, unitOpenedProgress, 'fe-dot-exercise', item.id, unitPath) +
            '</div>';
        } else {
          html +=
            '<div class="fe-map-lesson fe-lesson-locked">' +
              '<div class="fe-map-lesson-title">' +
                '<span class="fe-map-lesson-lock">' + _mi('lock') + ' Coming Soon</span>' +
              '</div>' +
              '<div class="fe-map-points-row">' +
                '<div class="fe-dot fe-dot-locked" title="Locked">' +
                  '<span class="fe-dot-icon">' + _mi('lock') + '</span>' +
                '</div>' +
              '</div>' +
            '</div>';
        }

        html += '</div>'; // .cu-unit-section
      });

      if (reviewItem) {
        var isAvail = reviewItem.status === 'available';
        var isDone = !!progress[reviewItem.id];
        var reviewPath = 'data/Course/' + level + '/' + reviewItem.file;

        html += '<div class="fe-map-connector"></div>';
        html += '<div class="cu-unit-section">';
        html += '<div class="cu-unit-section-header">' +
          '<span style="color:#f59e0b">' + _mi('quiz') + '</span>' +
          '<span class="cu-us-title">' + self._escapeHTML(reviewItem.title) + '</span>' +
          (isDone ? '<span class="cu-us-done">' + _mi('check_circle') + '</span>' : '') +
        '</div>';

        if (isAvail) {
          var reviewSectionDefs = [
            { letter: 'A', name: 'Word Formation', maxScore: 10 },
            { letter: 'B', name: 'Key Word Transformation', maxScore: 16 },
            { letter: 'C', name: 'Idioms & Collocations', maxScore: 8 },
            { letter: 'D', name: 'Phrasal Verbs', maxScore: 8 },
            { letter: 'E', name: 'Multiple Choice', maxScore: 8 }
          ];
          var reviewTotalMax = 50;
          var reviewAnsweredData = BentoGrid._getReviewAnswered(level);
          var totalEarned = 0;
          reviewSectionDefs.forEach(function(sec, idx) {
            totalEarned += reviewAnsweredData[reviewItem.id + '_' + idx] || 0;
          });
          totalEarned = Math.min(totalEarned, reviewTotalMax);
          html += '<div class="fe-map-lesson fe-map-review-block ' + (isDone ? 'fe-lesson-complete' : 'fe-lesson-pending') + '">' +
            '<div class="fe-map-lesson-title">' +
              '<span class="fe-map-lesson-num">Review</span>' +
              '<span class="fe-rs-total-score' + (totalEarned === 0 ? ' fe-rs-score-pending' : '') + '">' + (totalEarned > 0 ? totalEarned : '–') + '/' + reviewTotalMax + '</span>' +
            '</div>' +
            '<div class="fe-map-review-slots">';
          reviewSectionDefs.forEach(function(sec, idx) {
            var earned = reviewAnsweredData[reviewItem.id + '_' + idx] || 0;
            var isPending = earned === 0;
            var scoreLabel = (earned > 0 ? Math.min(earned, sec.maxScore) : '–') + '/' + sec.maxScore;
            html += '<button class="fe-review-slot" onclick="BentoGrid.openCourseUnit(\'' + reviewItem.id + '\',\'' + reviewPath + '\', ' + idx + ')">' +
              '<span class="fe-rs-letter">' + sec.letter + '</span>' +
              '<span class="fe-rs-name">' + self._escapeHTML(sec.name) + '</span>' +
              '<span class="fe-rs-score' + (isPending ? ' fe-rs-score-pending' : '') + '">' + scoreLabel + '</span>' +
            '</button>';
          });
          html += '</div></div>';
        } else {
          html +=
            '<div class="fe-map-lesson fe-lesson-locked">' +
              '<div class="fe-map-lesson-title">' +
                '<span class="fe-map-lesson-lock">' + _mi('lock') + ' Coming Soon</span>' +
              '</div>' +
              '<div class="fe-map-points-row">' +
                '<div class="fe-dot fe-dot-locked" title="Locked">' +
                  '<span class="fe-dot-icon">' + _mi('lock') + '</span>' +
                '</div>' +
              '</div>' +
            '</div>';
        }

        html += '</div>'; // .cu-unit-section
      }

      html += '</div></div>'; // .fe-map-container, .cu-course-view
      return html;
    },

    _buildCourseBlockDotsHtml: function(points, visitedPoints, openedPoints, pendingClass, unitId, unitPath) {
      var dotsHtml = '<div class="fe-map-points-row">';
      (points || []).forEach(function(point) {
        var isVisited = !!(visitedPoints && visitedPoints[point.sectionIdx]);
        var isOpened = !!(openedPoints && openedPoints[point.sectionIdx]);
        var dotClass = isVisited ? 'fe-dot-done' : (isOpened ? 'fe-dot-in-progress' : 'fe-dot-outline ' + pendingClass);
        var clickAttr = (unitId && unitPath)
          ? ' onclick="event.stopPropagation();BentoGrid.openCourseUnit(\'' + unitId + '\',\'' + unitPath + '\',' + point.sectionIdx + ')" style="cursor:pointer"'
          : '';
        dotsHtml += '<span class="fe-dot fe-dot-section-marker ' + dotClass + '" title="' + point.label + '"' + clickAttr + '>' +
          '<span class="fe-dot-label">' + point.label + '</span>' +
        '</span>';
      });
      dotsHtml += '</div>';
      return dotsHtml;
    },

    openCourseUnit: async function(unitId, filePath, startSection) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var level = AppState.currentLevel || 'C1';

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      var centerSection = content.querySelector('#courseCenterSection');
      if (!centerSection) {
        // Re-render layout if navigated directly — use course-specific sidebars
        content.innerHTML =
          '<div class="dashboard-layout">' +
            (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
              ? Dashboard._renderSidebarShell('left', 'courseLeftSidebarShell', 'courseLeftSidebar', '<div class="fe-loading"><div class="fe-spinner"></div></div>')
              : '<div class="dashboard-left-sidebar" id="courseLeftSidebar"><div class="fe-loading"><div class="fe-spinner"></div></div></div>') +
            '<div class="dashboard-center">' +
              '<div class="fe-section" id="courseCenterSection"></div>' +
            '</div>' +
            (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
              ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', '')
              : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar"></div>') +
          '</div>';
        if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
        centerSection = document.getElementById('courseCenterSection');
        // Load index.json to build navigation sidebar
        var leftSidebar = document.getElementById('courseLeftSidebar');
        if (leftSidebar && !BentoGrid._courseIndexData) {
          try {
            var ri = await fetch('data/Course/' + level + '/index.json');
            if (ri.ok) {
              var idxData = await ri.json();
              if (idxData && idxData.items) {
                var blocks = {}, blockOrder = [];
                idxData.items.forEach(function(item) {
                  var bk = item.block != null ? String(item.block) : 'misc';
                  if (!blocks[bk]) { blocks[bk] = []; blockOrder.push(bk); }
                  blocks[bk].push(item);
                });
                BentoGrid._courseBlocks = blocks;
                BentoGrid._courseBlockOrder = blockOrder;
                BentoGrid._courseLevel = level;
                BentoGrid._courseIndexData = idxData;
                leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(idxData, level, unitId);
              }
            }
          } catch(e) { /* index not available */ }
          if (leftSidebar.querySelector('.fe-spinner')) {
            leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(null, level, unitId);
          }
        } else if (leftSidebar) {
          leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(BentoGrid._courseIndexData || null, level, unitId);
        }
      } else {
        // Update left sidebar to highlight the newly active unit
        var leftSidebar = document.getElementById('courseLeftSidebar');
        if (leftSidebar && BentoGrid._courseIndexData) {
          leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(BentoGrid._courseIndexData, level, unitId);
        }
      }

      // Show loading in center
      centerSection.innerHTML =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="BentoGrid.openCourseTheory()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' Course</div>' +
            '<div class="subpage-subtitle">' + level + ' Advanced</div>' +
          '</div>' +
        '</div>' +
        '<div class="fe-loading"><div class="fe-spinner"></div></div>';

      var unitData = null;
      try {
        var r = await fetch(filePath);
        if (r.ok) unitData = await r.json();
      } catch(e) { /* failed */ }

      if (!unitData) {
        centerSection.innerHTML =
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="BentoGrid.openCourseTheory()">Back</button>' +
            '<div><div class="subpage-title">' + _mi('auto_stories') + ' Course</div></div>' +
          '</div>' +
          '<div class="fe-error">Could not load unit content.</div>';
        return;
      }

      BentoGrid._courseUnitMeta = BentoGrid._courseUnitMeta || {};
      BentoGrid._courseUnitMeta[unitId] = BentoGrid._extractCourseUnitMeta(unitData);

      BentoGrid._currentUnitId = unitId;

      // Update right sidebar with learning roadmap for this unit
      var rightSidebar = document.getElementById('dashboardRightSidebar');
      if (rightSidebar) {
        rightSidebar.innerHTML = BentoGrid._buildCourseRoadmapSidebarHtml(unitData, unitId);
      }

      var blockNum = null;
      if (BentoGrid._courseIndexData && BentoGrid._courseIndexData.items) {
        var foundItem = BentoGrid._courseIndexData.items.find(function(i) { return i.id === unitId; });
        if (foundItem) blockNum = foundItem.block;
      }
      var backFn = blockNum ? 'BentoGrid._selectCourseBlock(\'' + blockNum + '\')' : 'BentoGrid.openCourseTheory()';
      var backLabel = blockNum ? BentoGrid._getBlockLabel(String(blockNum)) : 'Back';
      var unitHasProgress = !!(BentoGrid._getCourseSectionProgress(level)[unitId] && Object.keys(BentoGrid._getCourseSectionProgress(level)[unitId]).length);
      var resetUnitBtn = (unitData.type !== 'progress_test' && unitHasProgress)
        ? '<button class="cu-reset-btn" onclick="BentoGrid._resetCourseUnit(\'' + unitId + '\')" title="Restart unit">' + _mi('restart_alt') + ' Restart</button>'
        : '';

      var html =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="' + backFn + '">' + backLabel + '</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' ' + (unitData.unitTitle || '') + '</div>' +
            '<div class="subpage-subtitle">' + level + ' Advanced</div>' +
          '</div>' +
          resetUnitBtn +
        '</div>' +
        '<div class="course-unit-content">';

      if (unitData.type === 'grammar') {
        html += BentoGrid._renderGrammarUnit(unitData);
      } else if (unitData.type === 'vocabulary') {
        html += BentoGrid._renderVocabUnit(unitData);
      } else if (unitData.type === 'review') {
        html += BentoGrid._renderReviewUnit(unitData);
      } else if (unitData.type === 'progress_test') {
        html += BentoGrid._renderProgressTestUnit(unitData);
      } else {
        html += '<div class="fe-error">Unknown unit type.</div>';
      }

      html += '</div>';
      centerSection.innerHTML = html;

      // Restore saved answers and scores for review/progress test units
      if (unitData.type === 'review' || unitData.type === 'progress_test') {
        BentoGrid._restoreReviewUnit(unitId);
      }

      // Compute start section index
      var sectionStartIdx = 0;
      if (startSection === 'exercises') {
        if (unitData.type === 'grammar') {
          var theorySections = (unitData.sections || []).filter(function(s) { return s.type === 'theory'; });
          sectionStartIdx = theorySections.length;
        } else if (unitData.type === 'vocabulary') {
          // Find the rendered index of the 'exercises' key in vocab section order
          var vocabKeys = ['topic_vocabulary', 'phrasal_verbs', 'collocations_patterns', 'idioms', 'word_formation', 'exercises'];
          var secs = unitData.sections || {};
          var vIdx = 0;
          vocabKeys.forEach(function(k) {
            var hasContent = secs[k] && (Array.isArray(secs[k]) ? secs[k].length > 0 : Object.keys(secs[k]).length > 0);
            if (hasContent) {
              if (k === 'exercises') sectionStartIdx = vIdx;
              vIdx++;
            }
          });
        }
      } else if (typeof startSection === 'number') {
        sectionStartIdx = startSection;
      }
      BentoGrid._initCuSectionNav(sectionStartIdx);

      // Update URL to reflect the current unit and section
      var cuBlockKey = blockNum ? String(blockNum) : '1';
      BentoGrid._currentBlockKey = cuBlockKey;
      BentoGrid._currentUnitFilePath = filePath;
      // filePath is stored in state (not part of the URL path) so popstate can reload the unit without needing the index
      var cuState = { view: 'courseUnit', blockKey: cuBlockKey, unitId: unitId, level: level, filePath: filePath, sectionIdx: sectionStartIdx };
      history.pushState(cuState, '', Router.stateToPath(cuState));
    },

    _renderGrammarUnit: function(data) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      var html = '';

      (data.sections || []).forEach(function(section, idx) {
        if (section.type === 'theory') {
          html += '<div class="cu-section cu-theory" id="cu-sec-' + idx + '">' +
            '<div class="cu-section-title">' + _mi('menu_book') + ' ' + self._escapeHTML(section.title) + '</div>' +
            '<div class="cu-theory-body">';

          var content = section.content || [];
          var contentIdx = 0;
          while (contentIdx < content.length) {
            var block = content[contentIdx];
            var nextBlock = content[contentIdx + 1];

            // Pair "Uses" + "Examples" as a 2-column table
            if (block.subtitle === 'Uses' && nextBlock && nextBlock.subtitle === 'Examples') {
              var uses = block.items || [];
              var examples = nextBlock.items || nextBlock.examples || [];
              html += '<table class="cu-uses-examples-table">' +
                '<thead><tr><th class="cu-ue-head">Use</th><th class="cu-ue-head">Example</th></tr></thead>' +
                '<tbody>';
              var maxLen = Math.max(uses.length, examples.length);
              for (var r = 0; r < maxLen; r++) {
                html += '<tr class="cu-ue-row">' +
                  '<td class="cu-ue-use">' + (uses[r] ? self._escapeHTML(uses[r]) : '') + '</td>' +
                  '<td class="cu-ue-example">' + (examples[r] ? _bold(examples[r]) : '') + '</td>' +
                '</tr>';
              }
              html += '</tbody></table>';
              contentIdx += 2;
              continue;
            }

            // "Common words and phrases" as chips
            if (block.subtitle === 'Common words and phrases') {
              html += '<div class="cu-theory-subtitle">' + self._escapeHTML(block.subtitle) + '</div>';
              html += '<div class="cu-theory-chips">';
              (block.items || []).forEach(function(item) {
                html += '<span class="cu-theory-chip">' + self._escapeHTML(item) + '</span>';
              });
              html += '</div>';
              contentIdx++;
              continue;
            }

            // "Note on American English" as 2-column US vs UK comparison
            if (block.subtitle && block.subtitle.toLowerCase().indexOf('american english') !== -1) {
              html += '<div class="cu-usuk-block">';
              html += '<div class="cu-usuk-header">' +
                '<div class="cu-usuk-col-head">American English</div>' +
                '<div class="cu-usuk-col-head">British English</div>' +
              '</div>';
              if (block.description) {
                html += '<div class="cu-usuk-note">' + _bold(block.description) + '</div>';
              }
              var usukExamples = block.examples || block.items || [];
              if (usukExamples.length) {
                html += '<div class="cu-usuk-rows">';
                usukExamples.forEach(function(ex) {
                  // Inline note object
                  if (ex && typeof ex === 'object' && ex.note) {
                    html += '<div class="cu-usuk-note cu-usuk-note-mid">' + _bold(ex.note) + '</div>';
                    return;
                  }
                  // Split "US: … UK: …" into two parts
                  var usMatch = ex.match(/^US:\s*(.*?)\s+UK:\s*(.*)$/i);
                  if (usMatch) {
                    html += '<div class="cu-usuk-row">' +
                      '<div class="cu-usuk-cell cu-usuk-us">' + _bold(usMatch[1]) + '</div>' +
                      '<div class="cu-usuk-cell cu-usuk-uk">' + _bold(usMatch[2]) + '</div>' +
                    '</div>';
                  } else {
                    html += '<div class="cu-usuk-row cu-usuk-row-full"><div class="cu-usuk-cell">' + _bold(ex) + '</div></div>';
                  }
                });
                html += '</div>';
              }
              html += '</div>';
              contentIdx++;
              continue;
            }

            // Chip-style list (e.g. Common Verbs)
            if (block.chipStyle) {
              html += '<div class="cu-theory-subtitle">' + self._escapeHTML(block.subtitle) + '</div>';
              html += '<div class="cu-theory-chips">';
              (block.items || []).forEach(function(item) {
                html += '<span class="cu-theory-chip">' + self._escapeHTML(item) + '</span>';
              });
              html += '</div>';
              contentIdx++;
              continue;
            }

            // Default rendering
            if (block.subtitle && !(block.categories && block.categories.length)) {
              html += '<div class="cu-theory-subtitle">' + self._escapeHTML(block.subtitle) + '</div>';
            }
            if (block.description) {
              html += '<div class="cu-theory-desc">' + _bold(block.description) + '</div>';
            }
            // Categories (e.g. stative verbs grouped by type)
            if (block.categories && block.categories.length) {
              html += '<div class="cu-theory-categories">';
              block.categories.forEach(function(cat) {
                html += '<div class="cu-theory-cat-row">' +
                  '<span class="cu-theory-cat-name">' + self._escapeHTML(cat.name) + '</span>' +
                  '<div class="cu-theory-chips">';
                (cat.verbs || []).forEach(function(v) {
                  html += '<span class="cu-theory-chip">' + self._escapeHTML(v) + '</span>';
                });
                html += '</div></div>';
              });
              html += '</div>';
            } else {
              var listItems = block.items || block.examples || [];
              if (listItems.length) {
                html += '<ul class="cu-theory-list">';
                listItems.forEach(function(item) {
                  html += '<li>' + _bold(item) + '</li>';
                });
                html += '</ul>';
              }
            }
            contentIdx++;
          }

          html += '</div></div>';

        } else if (section.type === 'exercise') {
          var secId = 'cu-sec-' + idx;
          var multiSelectAttr = section.multiSelect ? ' data-multi-select="true"' : '';
          html += '<div class="cu-section cu-exercise" id="' + secId + '"' + multiSelectAttr + '>' +
            '<div class="cu-section-title">' + _mi('edit_note') + ' ' + self._escapeHTML(section.title) + '</div>';

          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }

          html += self._renderCuWordBank(section.words);

          var items = section.items || [];
          var hasInteractive = items.some(function(it) { return self._itemHasInteractive(it); });
          html += '<div class="cu-ex-items">';
          html += self._renderCuExItemsList(items, 'gr-' + section.title.replace(/\W+/g, ''), secId);
          html += '</div>';

          if (hasInteractive) html += self._renderCuExFooter(secId);

          html += '</div>';
        }
      });

      return html || '<div class="fe-error">No content available.</div>';
    },

    _renderVocabUnit: function(data) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      var html = '';
      var sections = data.sections || {};
      var sectionIndex = 0;

      // Topic vocabulary
      if (sections.topic_vocabulary) {
        html += '<div class="cu-section cu-vocab" id="cu-sec-' + (sectionIndex++) + '">' +
          '<div class="cu-section-title">' + _mi('translate') + ' Topic Vocabulary</div>';
        Object.keys(sections.topic_vocabulary).forEach(function(topic) {
          var words = sections.topic_vocabulary[topic];
          html += '<div class="cu-vocab-group">' +
            '<div class="cu-vocab-group-title">' + self._escapeHTML(topic.charAt(0).toUpperCase() + topic.slice(1).replace(/_/g, ' ')) + '</div>' +
            '<div class="cu-vocab-words">';
          words.forEach(function(w) {
            html += '<div class="cu-vocab-word">' +
              '<span class="cu-word">' + self._escapeHTML(w.word) + '</span>' +
              '<span class="cu-pos">' + self._escapeHTML(w.part_of_speech || '') + '</span>' +
              (w.variant ? '<span class="cu-variant">(' + self._escapeHTML(w.variant) + ')</span>' : '') +
            '</div>';
          });
          html += '</div></div>';
        });
        html += '</div>';
      }

      // Phrasal verbs — add cu-vocab class so dots-nav counts it as a content section (number)
      if (sections.phrasal_verbs && sections.phrasal_verbs.length) {
        html += '<div class="cu-section cu-pv cu-vocab" id="cu-sec-' + (sectionIndex++) + '">' +
          '<div class="cu-section-title">' + _mi('format_list_bulleted') + ' Phrasal Verbs</div>' +
          '<div class="cu-pv-list">';
        sections.phrasal_verbs.forEach(function(pv) {
          html += '<div class="cu-pv-item">' +
            '<span class="cu-pv-verb">' + self._escapeHTML(pv.verb) + '</span>' +
            '<span class="cu-pv-meaning">' + self._escapeHTML(pv.meaning) + '</span>' +
          '</div>';
        });
        html += '</div></div>';
      }

      // Collocations — add cu-vocab class so dots-nav counts it as a content section (number)
      if (sections.collocations_patterns && Object.keys(sections.collocations_patterns).length) {
        html += '<div class="cu-section cu-collocations cu-vocab" id="cu-sec-' + (sectionIndex++) + '">' +
          '<div class="cu-section-title">' + _mi('link') + ' Collocations & Patterns</div>' +
          '<div class="cu-coll-list">';
        Object.keys(sections.collocations_patterns).forEach(function(word) {
          var patterns = sections.collocations_patterns[word];
          var patternsText = Array.isArray(patterns) ? patterns.join(', ') : String(patterns);
          html += '<div class="cu-coll-item">' +
            '<span class="cu-coll-word">' + self._escapeHTML(word) + '</span>' +
            '<span class="cu-coll-patterns">' + self._escapeHTML(patternsText) + '</span>' +
          '</div>';
        });
        html += '</div></div>';
      }

      // Idioms — add cu-vocab class so dots-nav counts it as a content section (number)
      if (sections.idioms && sections.idioms.length) {
        html += '<div class="cu-section cu-idioms cu-vocab" id="cu-sec-' + (sectionIndex++) + '">' +
          '<div class="cu-section-title">' + _mi('lightbulb') + ' Idioms</div>' +
          '<div class="cu-pv-list">';
        sections.idioms.forEach(function(idiom) {
          html += '<div class="cu-pv-item">' +
            '<span class="cu-pv-verb">' + self._escapeHTML(idiom.idiom) + '</span>' +
            '<span class="cu-pv-meaning">' + self._escapeHTML(idiom.meaning) + '</span>' +
          '</div>';
        });
        html += '</div></div>';
      }

      // Word formation — add cu-vocab class so dots-nav counts it as a content section (number)
      if (sections.word_formation && sections.word_formation.length) {
        html += '<div class="cu-section cu-wf cu-vocab" id="cu-sec-' + (sectionIndex++) + '">' +
          '<div class="cu-section-title">' + _mi('spellcheck') + ' Word Formation</div>' +
          '<div class="cu-wf-list">';
        // POS colour definitions (noun=blue, verb=green, adjective=purple, adverb=orange)
        var wfPosColors = {
          noun:      { text: '#1d4ed8', bg: 'rgba(29,78,216,0.09)',  border: 'rgba(29,78,216,0.28)'  },
          verb:      { text: '#059669', bg: 'rgba(5,150,105,0.09)',  border: 'rgba(5,150,105,0.28)'  },
          adjective: { text: '#7c3aed', bg: 'rgba(124,58,237,0.09)', border: 'rgba(124,58,237,0.28)' },
          adverb:    { text: '#d97706', bg: 'rgba(217,119,6,0.09)',  border: 'rgba(217,119,6,0.28)'  }
        };
        // Fallback cycling colours for unlabelled derivatives
        var wfChipDefs = [
          wfPosColors.noun, wfPosColors.verb, wfPosColors.adjective, wfPosColors.adverb,
          { text: '#be185d', bg: 'rgba(190,24,93,0.09)', border: 'rgba(190,24,93,0.28)' }
        ];
        sections.word_formation.forEach(function(wf) {
          var base = wf.base || wf.root || '';
          // Build labelled derivative list from POS-categorised fields when available
          var labelledDerivs = [];
          var hasCategories = wf.noun || wf.verb || wf.adjective || wf.adverb;
          if (hasCategories) {
            ['noun', 'verb', 'adjective', 'adverb'].forEach(function(pos) {
              if (!wf[pos]) return;
              var words = Array.isArray(wf[pos]) ? wf[pos] : [wf[pos]];
              words.forEach(function(w) { labelledDerivs.push({ word: w, pos: pos }); });
            });
          } else {
            // Plain derivatives array – fall back to index-based cycling colours
            var derivatives = wf.derivatives || [];
            derivatives.forEach(function(d, di) { labelledDerivs.push({ word: d, pos: null, idx: di }); });
          }
          html += '<div class="cu-wf-item">' +
            '<span class="cu-wf-base">' + self._escapeHTML(base) + '</span>' +
            '<div class="cu-theory-chips cu-wf-chips">';
          labelledDerivs.forEach(function(item, di) {
            var chip = item.pos ? (wfPosColors[item.pos] || wfChipDefs[di % wfChipDefs.length]) : wfChipDefs[(item.idx !== undefined ? item.idx : di) % wfChipDefs.length];
            var posClass = item.pos ? ' cu-wf-chip-' + item.pos : '';
            html += '<span class="cu-theory-chip cu-wf-chip' + posClass + '" style="color:' + chip.text + ';background:' + chip.bg + ';border-color:' + chip.border + '">' + self._escapeHTML(item.word) + '</span>';
          });
          html += '</div></div>';
        });
        html += '</div></div>';
      }

      // Exercises — each letter as its own section
      if (sections.exercises && Object.keys(sections.exercises).length) {
        Object.keys(sections.exercises).forEach(function(key) {
          var ex = sections.exercises[key];
          var secId = 'cu-sec-' + sectionIndex;
          var idBase = 'vc-' + key.replace(/\W+/g, '');
          html += '<div class="cu-section cu-exercise" id="' + secId + '">' +
            '<div class="cu-section-title">' + _mi('edit_note') + ' Exercise ' + self._escapeHTML(key) + ': ' + self._escapeHTML(ex.title || '') + '</div>';
          if (ex.instructions) html += '<div class="cu-ex-instructions">' + _bold(ex.instructions) + '</div>';
          html += self._renderCuWordBank(ex.words);
          var questions = ex.questions || [];

          if (ex.type === 'grouped') {
            html += self._renderCuGroupedExercise(ex, idBase, secId);
          } else if (ex.type === 'drag-category') {
            html += self._renderCuDragCategoryExercise(ex, idBase, secId);
          } else if (ex.type === 'passage-input') {
            html += self._renderCuPassageInputExercise(ex, idBase, secId);
          } else if (ex.type === 'yn') {
            // Yes / No exercise (e.g. Exercise N, G)
            html += '<div class="cu-ex-items">';
            html += self._renderCuYnItems(questions, idBase, secId);
            html += '</div>';
            if (questions.length) html += self._renderCuExFooter(secId);
          } else if (ex.type === 'matching') {
            // Two-column matching with drag-to-swap (e.g. Exercise E)
            html += self._renderCuMatchingExercise(questions, idBase, secId);
          } else if (ex.type === 'kwtrans') {
            // Key-word transformation (reading4 style) (e.g. Exercise K)
            html += '<div class="cu-ex-items">';
            html += self._renderCuKwtransItems(questions, idBase, secId);
            html += '</div>';
            if (questions.length) html += self._renderCuExFooter(secId);
          } else if (ex.type === 'sync') {
            // One-word-for-three-sentences with synced inputs (e.g. Exercise I)
            html += '<div class="cu-ex-items">';
            html += self._renderCuSyncItems(questions, idBase, secId);
            html += '</div>';
            if (questions.length) html += self._renderCuExFooter(secId);
          } else if (ex.type === 'mc-inline') {
            // Inline multiple-choice: numbered gaps open a modal (e.g. Exercise C, E)
            html += self._renderCuMcInlineExercise(ex, idBase, secId);
          } else if (ex.passage && questions.length && questions[0] && questions[0].options) {
            // Multiple-choice passage (e.g. Exercise D) – gaps open a modal with A/B/C/D options
            html += self._renderCuMcPassageExercise(ex, idBase, secId);
          } else if (ex.passage) {
            // Passage-based word formation (e.g. Exercise O)
            html += self._renderCuPassageExercise(ex, idBase, secId);
          } else {
            var hasInteractive = questions.some(function(q) { return self._itemHasInteractive(q); });
            html += '<div class="cu-ex-items">';
            html += self._renderCuExItemsList(questions, idBase, secId);
            html += '</div>';
            if (hasInteractive) html += self._renderCuExFooter(secId);
          }
          html += '</div>';
          sectionIndex++;
        });
      }

      return html || '<div class="fe-error">No content available.</div>';
    },

    _renderReviewUnit: function(data) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      var html = '';

      // Evaluation-style header banner
      var blockNum = data.block ? 'Block ' + data.block : '';
      var unitsInfo = '';
      if (data.block && BentoGrid._courseBlocks) {
        var bk = String(data.block);
        var blockItems = BentoGrid._courseBlocks[bk] || [];
        var unitItems = blockItems.filter(function(i) { return i.type === 'grammar' || i.type === 'vocabulary'; });
        if (unitItems.length) {
          unitsInfo = unitItems.map(function(i) {
            var shortTitle = i.title;
            var colonIdx = shortTitle.indexOf(':');
            if (colonIdx !== -1) shortTitle = shortTitle.slice(colonIdx + 1).trim();
            return shortTitle;
          }).join(' · ');
        }
      }

      // Compute total possible points across all exercise sections
      var totalMaxItems = 0;
      (data.sections || []).forEach(function(s) {
        if (s.type === 'exercise') totalMaxItems += (s.items || []).length;
      });

      html += '<div class="cu-review-banner">' +
        '<div class="cu-review-banner-icon">' + _mi('quiz') + '</div>' +
        '<div class="cu-review-banner-body">' +
          '<div class="cu-review-banner-label">Review — ' + self._escapeHTML(blockNum) + '</div>' +
          (data.unitTitle ? '<div class="cu-review-banner-title">' + self._escapeHTML(data.unitTitle) + '</div>' : '') +
          (unitsInfo ? '<div class="cu-review-banner-covers">' + _mi('layers') + ' Covers: ' + self._escapeHTML(unitsInfo) + '</div>' : '') +
        '</div>' +
        '<div class="cu-review-banner-stat">' +
          '<span class="cu-review-stat-num">' + (data.sections || []).length + '</span>' +
          '<span class="cu-review-stat-lbl">Sections</span>' +
        '</div>' +
      '</div>' +
      '<div class="cu-review-total-score" id="cu-review-total-score" style="display:none">' +
        '<span class="material-symbols-outlined">star</span>' +
        '<span class="cu-review-total-label">Total:</span>' +
        '<span class="cu-review-total-val" id="cu-review-total-val">0</span>' +
        '<span class="cu-review-total-max">/ ' + totalMaxItems + '</span>' +
        '<span class="cu-review-total-pct" id="cu-review-total-pct"></span>' +
      '</div>';

      (data.sections || []).forEach(function(section, sectionIdx) {
        if (section.type === 'exercise') {
          var rvSecId = 'cu-sec-' + sectionIdx;
          var rvItems = section.items || [];
          html += '<div class="cu-section cu-exercise cu-review-section" id="' + rvSecId + '" data-max-items="' + rvItems.length + '">' +
            '<div class="cu-section-title">' + _mi('quiz') + ' ' + self._escapeHTML(section.title) + '</div>';
          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }
          html += '<div class="cu-ex-items">';
          var hasInteractiveRv = rvItems.some(function(it) { return self._itemHasInteractive(it); });
          html += self._renderCuExItemsList(rvItems, 'rv-' + section.title.replace(/\W+/g, ''), rvSecId);
          html += '</div>';
          if (hasInteractiveRv) html += self._renderCuExFooter(rvSecId);
          html += '</div>';
        }
      });

      return html || '<div class="fe-error">No content available.</div>';
    },

    // --- Interactive exercise item helpers ---

    _itemHasInteractive: function(item) {
      return !!(item && (item.sentence || item.sentenceA !== undefined || item.sentenceB !== undefined));
    },

    _renderCuWordBank: function(words) {
      var self = this;
      if (!words || !words.length) return '';
      return '<div class="cu-ex-wordbank">' +
        '<span class="material-symbols-outlined">view_list</span>' +
        words.map(function(w) {
          return '<span class="cu-wordbank-item" role="button" tabindex="0" onclick="BentoGrid._toggleWordBankItem(this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._toggleWordBankItem(this);event.preventDefault();}" title="Mark as used">' + self._escapeHTML(w) + '</span>';
        }).join('') +
        '</div>';
    },

    _toggleWordBankItem: function(el) {
      el.classList.toggle('cu-wordbank-used');
    },

    _renderCuExFooter: function(secId) {
      return '<div class="cu-ex-footer">' +
        '<button class="cu-check-btn" onclick="BentoGrid._checkCuExSection(\'' + secId + '\')">' +
          '<span class="material-symbols-outlined">check_circle</span> Check</button>' +
        '<button class="cu-show-all-btn" onclick="BentoGrid._toggleCuAnswers(\'' + secId + '\')">' +
          '<span class="material-symbols-outlined">visibility</span> Show answers</button>' +
        '<button class="cu-retry-btn" onclick="BentoGrid._resetCuExSection(\'' + secId + '\')" style="display:none">' +
          '<span class="material-symbols-outlined">replay</span> Retry</button>' +
        '</div>';
    },

    _resetCuExSection: function(sectionId) {
      var sec = document.getElementById(sectionId);
      if (!sec) return;
      // Remove score summary
      var summary = sec.querySelector('.cu-ex-score-summary');
      if (summary) summary.remove();
      // Clear stored result data for total score
      sec.removeAttribute('data-correct-items');
      sec.removeAttribute('data-total-items');
      // Re-enable check button, hide retry button
      var checkBtn = sec.querySelector('.cu-check-btn');
      if (checkBtn) checkBtn.disabled = false;
      var retryBtn = sec.querySelector('.cu-retry-btn');
      if (retryBtn) retryBtn.style.display = 'none';
      // Restore show/hide answers button
      var showBtn = sec.querySelector('.cu-show-all-btn');
      if (showBtn) {
        showBtn.style.display = '';
        var showIcon = showBtn.querySelector('.material-symbols-outlined');
        if (showIcon) showIcon.textContent = 'visibility';
        var textNode = showBtn.lastChild;
        if (textNode && textNode.nodeType === 3) textNode.textContent = ' Show answers';
      }
      // Reset text inputs
      sec.querySelectorAll('.cu-gap-input').forEach(function(input) {
        input.value = '';
        input.disabled = false;
        input.readOnly = false;
        if (input._cuAltClickHandler) { input.removeEventListener('click', input._cuAltClickHandler); input._cuAltClickHandler = null; }
        input.classList.remove('cu-input-correct', 'cu-input-incorrect', 'cu-input-show-correct');
        input.removeAttribute('data-student-value');
        input.removeAttribute('data-correct-value');
        input.removeAttribute('data-correct-raw');
        input.removeAttribute('data-check-class');
        input.removeAttribute('data-saved-value');
        input.removeAttribute('data-alt-answers');
        input.removeAttribute('data-alt-idx');
        input._cuAltBadge = null;
        BentoGrid._resizeCuInput(input);
      });
      // Remove alt-solution cycle badges
      sec.querySelectorAll('.cu-alt-badge').forEach(function(b) { b.remove(); });
      // Remove per-item toggle buttons
      sec.querySelectorAll('.cu-item-toggle-btn').forEach(function(btn) { btn.remove(); });
      // Remove matching view toggle button
      sec.querySelectorAll('.cu-match-view-btn').forEach(function(btn) { btn.remove(); });
      // Reset option buttons (inline word-choice and MC)
      sec.querySelectorAll('.cu-option-btn').forEach(function(btn) {
        btn.disabled = false;
        btn.classList.remove('cu-option-selected', 'cu-option-correct', 'cu-option-incorrect', 'cu-option-correct-reveal');
      });
      // Hide answer divs
      sec.querySelectorAll('.cu-answer').forEach(function(div) { div.style.display = 'none'; });
      // Reset show-answers state
      sec.setAttribute('data-answers-showing', 'false');
      // Reset yn (yes/no) buttons
      sec.querySelectorAll('.cu-yn-btn').forEach(function(btn) {
        btn.disabled = false;
        btn.classList.remove('cu-yn-selected', 'cu-yn-correct', 'cu-yn-incorrect', 'cu-yn-correct-reveal');
      });
      // Reset drag-category exercises
      sec.querySelectorAll('.cu-drag-category-exercise').forEach(function(exEl) {
        var exId = exEl.id;
        var pool = document.getElementById(exId + '-pool');
        exEl.querySelectorAll('.cu-drag-chip').forEach(function(chip) {
          chip.classList.remove('cu-drag-chip-correct', 'cu-drag-chip-incorrect', 'cu-drag-chip-unplaced');
          chip.setAttribute('draggable', 'true');
          chip.style.cursor = '';
          if (pool) pool.appendChild(chip);
        });
      });
      // Reset MC gap pills
      sec.querySelectorAll('.cu-mc-gap-pill').forEach(function(pill) {
        pill.classList.remove('cu-mc-gap-pill-filled');
        pill.innerHTML = CU_MC_BLANK;
      });
      // Reset MC passage gaps
      sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
        gap.classList.remove('cu-mc-passage-gap-answered', 'cu-mc-passage-gap-correct', 'cu-mc-passage-gap-incorrect', 'cu-mc-passage-gap-show-correct');
        gap.style.pointerEvents = '';
        var slot = gap.querySelector('.cu-mc-passage-gap-slot');
        if (slot) { slot.textContent = ''; slot.className = 'cu-mc-passage-gap-slot'; }
        var secId = gap.getAttribute('data-sec-id');
        var gapNum = parseInt(gap.getAttribute('data-gap-num') || '0');
        if (secId && BentoGrid._cuMcPassageAnswers[secId]) delete BentoGrid._cuMcPassageAnswers[secId][gapNum];
        gap.removeAttribute('data-check-class');
        gap.removeAttribute('data-student-text');
        gap.removeAttribute('data-correct-text');
        gap.removeAttribute('data-saved-gap-classes');
        gap.removeAttribute('data-saved-slot-text');
        gap.removeAttribute('data-saved-slot-class');
      });
      // Remove MC passage view-toggle buttons
      sec.querySelectorAll('.cu-mc-passage-view-btn').forEach(function(btn) { btn.remove(); });
      // Reset matching exercise: re-sort right column to A–G order and re-enable drag
      var matchExercise = sec.querySelector('.cu-match-exercise');
      if (matchExercise) {
        matchExercise.querySelectorAll('.cu-match-item').forEach(function(item) {
          item.classList.remove('cu-match-correct', 'cu-match-incorrect', 'cu-match-show-correct');
        });
        matchExercise.removeAttribute('data-student-letters');
        matchExercise.removeAttribute('data-saved-letters');
        // Collect all right items and sort alphabetically
        var allRightItems = [];
        matchExercise.querySelectorAll('.cu-match-row').forEach(function(row) {
          var ri = row.querySelector('.cu-match-right-cell > .cu-match-right-item');
          if (ri) allRightItems.push(ri);
        });
        allRightItems.sort(function(a, b) {
          var la = a.getAttribute('data-letter') || '';
          var lb = b.getAttribute('data-letter') || '';
          return la.localeCompare(lb);
        });
        var rows = matchExercise.querySelectorAll('.cu-match-row');
        rows.forEach(function(row, idx) {
          var rightCell = row.querySelector('.cu-match-right-cell');
          if (rightCell && allRightItems[idx]) {
            rightCell.appendChild(allRightItems[idx]);
          }
        });
        // Re-enable drag
        matchExercise.querySelectorAll('.cu-match-right-item').forEach(function(item) {
          item.setAttribute('draggable', 'true');
          item.style.cursor = '';
        });
      }
      // Reset word-bank used state
      sec.querySelectorAll('.cu-wordbank-item').forEach(function(item) {
        item.classList.remove('cu-wordbank-used');
      });
      // Clear saved state from localStorage for review sections
      if (sec.classList.contains('cu-review-section')) {
        var unitId = BentoGrid._currentUnitId;
        var sectionIdx = parseInt((sec.id || '').replace('cu-sec-', ''));
        if (unitId && !isNaN(sectionIdx)) {
          BentoGrid._clearReviewSectionState(unitId, sectionIdx);
        }
      } else {
        // Non-review exercise: clear the locally persisted draft/checked state
        var unitId = BentoGrid._currentUnitId;
        var sectionIdx = parseInt((sec.id || '').replace('cu-sec-', ''));
        var level = BentoGrid._courseLevel || 'C1';
        if (unitId && !isNaN(sectionIdx)) {
          BentoGrid._clearCuExSectionState(level, unitId, sectionIdx);
        }
      }
      // Refresh total review score panel
      BentoGrid._updateReviewTotalScore();
    },

    // --- Yes/No exercise renderer ---
    _renderCuYnItems: function(questions, idBase, secId) {
      var self = this;
      if (!questions || !questions.length) return '';
      var html = '';
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      questions.forEach(function(item, idx) {
        var iId = idBase + '-yn-' + idx;
        html += '<div class="cu-ex-item cu-yn-item" data-answer="' + self._escapeHTML(item.answer || '') + '">' +
          '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
          '<div class="cu-yn-row">' +
            '<div class="cu-ex-sentence cu-yn-sentence">' + _bold(item.sentence || '') + '</div>' +
            '<div class="cu-yn-buttons">' +
              '<button class="cu-yn-btn cu-yn-yes" data-group="' + iId + '" data-yn="YES" onclick="BentoGrid._selectCuYn(this)" type="button">YES</button>' +
              '<button class="cu-yn-btn cu-yn-no" data-group="' + iId + '" data-yn="NO" onclick="BentoGrid._selectCuYn(this)" type="button">NO</button>' +
            '</div>' +
          '</div>' +
          '<div class="cu-ex-foot"><div class="cu-answer" style="display:none">' + self._escapeHTML(item.answer || '') + '</div></div>' +
        '</div>';
      });
      return html;
    },

    _selectCuYn: function(btn) {
      if (btn.disabled) return;
      var group = btn.getAttribute('data-group');
      if (!group) return;
      var siblings = document.querySelectorAll('.cu-yn-btn[data-group="' + group + '"]');
      siblings.forEach(function(s) { s.classList.remove('cu-yn-selected'); });
      btn.classList.add('cu-yn-selected');
      BentoGrid._saveCuExSectionState(btn.closest('.cu-section'));
    },

    // --- Key Word Transformation exercise renderer (reading4 style) ---
    _renderCuKwtransItems: function(questions, idBase, secId) {
      var self = this;
      if (!questions || !questions.length) return '';
      var html = '';
      questions.forEach(function(item, idx) {
        var iId = idBase + '-kw-' + idx;
        var sentence = item.sentence || '';
        var nlIdx = sentence.indexOf('\n');
        var sentA = nlIdx !== -1 ? sentence.slice(0, nlIdx) : sentence;
        var sentB = nlIdx !== -1 ? sentence.slice(nlIdx + 1) : '';
        // Extract keyword from **keyword** in sentB
        var keyword = '';
        var keywordMatch = sentB.match(/^\*\*([^*]+)\*\*\s*/);
        if (keywordMatch) {
          keyword = keywordMatch[1];
          sentB = sentB.slice(keywordMatch[0].length);
        }
        html += '<div class="cu-ex-item cu-kwtrans-item" data-answer="' + self._escapeHTML(item.answer || '') + '">' +
          '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
          '<div class="cu-kwtrans-block">' +
            '<div class="cu-kwtrans-original">' + self._escapeHTML(sentA) + '</div>' +
            (keyword ? '<div class="cu-kwtrans-keyword-row"><span class="cu-kwtrans-keyword">' + self._escapeHTML(keyword) + '</span></div>' : '') +
            '<div class="cu-kwtrans-second">' + self._renderCourseExSentenceParts(sentB, iId) + '</div>' +
          '</div>' +
          '<div class="cu-ex-foot"><div class="cu-answer" style="display:none">' + self._escapeHTML(item.answer || '') + '</div></div>' +
        '</div>';
      });
      return html;
    },

    // --- Sync-input exercise renderer (one word for 3 sentences) ---
    _renderCuSyncItems: function(questions, idBase, secId) {
      var self = this;
      if (!questions || !questions.length) return '';
      var html = '';
      questions.forEach(function(item, idx) {
        var syncGroup = idBase + '-sync-' + idx;
        var sentences = Array.isArray(item.sentences) ? item.sentences : (item.sentence || '').split('\n');
        html += '<div class="cu-ex-item cu-sync-item" data-answer="' + self._escapeHTML(item.answer || '') + '">' +
          '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
          '<div class="cu-sync-sentences">';
        sentences.forEach(function(sent, sIdx) {
          var gapId = syncGroup + '-g' + sIdx;
          var sentHtml = self._escapeHTML(sent).replace(/……+|\.{5,}/g, function() {
            return '<input type="text" id="' + gapId + '" class="cu-gap-input cu-sync-input" data-sync-group="' + syncGroup + '" placeholder="..." oninput="BentoGrid._syncInputGroup(this);BentoGrid._resizeCuInput(this)">';
          });
          html += '<div class="cu-sync-sentence">' + sentHtml + '</div>';
        });
        html += '</div>' +
          '<div class="cu-ex-foot"><div class="cu-answer" style="display:none">' + self._escapeHTML(item.answer || '') + '</div></div>' +
        '</div>';
      });
      return html;
    },

    _syncInputGroup: function(input) {
      var group = input.getAttribute('data-sync-group');
      if (!group) return;
      var val = input.value;
      document.querySelectorAll('.cu-sync-input[data-sync-group="' + group + '"]').forEach(function(inp) {
        if (inp !== input) {
          inp.value = val;
          BentoGrid._resizeCuInput(inp);
        }
      });
    },

    // --- Inline multiple-choice renderer (exercise C/E style) ---
    // Questions have a `gaps` array: [{ num, options, answer }]
    // Each (N) ...... in the sentence becomes a clickable pill that opens a modal.
    _renderCuMcInlineExercise: function(ex, idBase, secId) {
      var self = this;
      var questions = ex.questions || [];
      // Collect all gap data keyed by gap number
      var qMap = {};
      questions.forEach(function(q) {
        (q.gaps || []).forEach(function(gap) {
          var num = parseInt(gap.num);
          qMap[num] = { options: gap.options || [], answer: (gap.answer || '').trim().toUpperCase() };
        });
      });
      self._cuMcPassageData[secId] = qMap;
      if (!self._cuMcPassageAnswers[secId]) self._cuMcPassageAnswers[secId] = {};

      var html = '<div class="cu-mc-passage-exercise cu-mc-inline-exercise" id="' + idBase + '-mcinline">';
      html += '<div class="cu-mc-inline-items">';
      questions.forEach(function(q, qi) {
        var sentence = q.sentence || '';
        // Replace (N) ______ / (N) ...... patterns with clickable gap pills
        var sentHtml = self._escapeHTML(sentence).replace(
          /\((\d+)\)\s*(?:_{6,}|\.{6,}|\u2026{2,})/g,
          function(_, num) {
            var gapNum = parseInt(num);
            var pillId = idBase + '-mcil-' + gapNum;
            return '<span class="cu-mc-passage-gap" id="' + pillId + '" ' +
              'data-gap-num="' + gapNum + '" data-sec-id="' + secId + '" ' +
              'data-answer="' + self._escapeHTML((qMap[gapNum] || {}).answer || '') + '" ' +
              'onclick="BentoGrid._openCuMcModal(\'' + secId + '\',' + gapNum + ')" ' +
              'role="button" tabindex="0">' +
              '<span class="cu-mc-passage-gap-num">' + num + '</span>' +
              '<span class="cu-mc-passage-gap-slot"></span>' +
            '</span>';
          }
        );
        html += '<div class="cu-mc-inline-item">' +
          '<div class="cu-ex-num-badge">' + (qi + 1) + '</div>' +
          '<div class="cu-ex-sentence">' + sentHtml + '</div>' +
        '</div>';
      });
      html += '</div>';
      html += '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    // --- Passage-based word formation renderer (exercise O style) ---
    _renderCuPassageExercise: function(ex, idBase, secId) {
      var self = this;
      var passage = ex.passage || '';
      var questions = ex.questions || [];
      // Build a map from gap number to correct answer
      var answerMap = {};
      questions.forEach(function(q) {
        var numMatch = (q.sentence || '').match(/…\((\d+)\)…/);
        if (numMatch) answerMap[parseInt(numMatch[1])] = q.answer || '';
      });
      // Render passage: replace …(N)… (WORD) patterns with inline gap+badge widgets.
      // Each gap input carries data-answer for scoring.
      var passageHtml = self._escapeHTML(passage).replace(
        /…\((\d+)\)…\s*\(([A-Z]+)\)/g,
        function(_, num, word) {
          var gId = idBase + '-p' + num;
          var ans = self._escapeHTML(answerMap[parseInt(num)] || '');
          return '<span class="cu-wf-gap-wrap">' +
            '<span class="cu-hint-pill">' +
              '<span class="cu-hint-pill-num">' + num + '</span>' +
              '<input type="text" id="' + gId + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." data-passage-num="' + num + '" data-answer="' + ans + '" oninput="BentoGrid._resizeCuInput(this)">' +
              '<span class="cu-hint-pill-word cu-wf-pill-word">' + word + '</span>' +
            '</span>' +
          '</span>';
        }
      );
      var html = '<div class="cu-passage-exercise" id="' + idBase + '-passage">' +
        '<div class="cu-passage-text">' + passageHtml + '</div>' +
        '</div>';
      if (questions.length) html += self._renderCuExFooter(secId);
      return html;
    },

    // --- Passage-input exercise renderer (Exercise C style: word bank + passage with text inputs) ---
    _renderCuPassageInputExercise: function(ex, idBase, secId) {
      var self = this;
      var passage = ex.passage || '';
      var answers = ex.answers || [];
      var answerMap = {};
      answers.forEach(function(ans, idx) { answerMap[idx + 1] = ans; });
      var passageHtml = self._escapeHTML(passage).replace(
        /\((\d+)\)\s*(?:\.{6,}|…{2,})/g,
        function(_, num) {
          var gapNum = parseInt(num);
          var gId = idBase + '-pi' + gapNum;
          var ans = self._escapeHTML(answerMap[gapNum] || '');
          return '<span class="cu-pi-gap-wrap">' +
            '<span class="cu-hint-pill cu-pi-pill">' +
              '<span class="cu-hint-pill-num">' + num + '</span>' +
              '<input type="text" id="' + gId + '" class="cu-gap-input cu-pi-input" placeholder="..." data-passage-num="' + num + '" data-answer="' + ans + '" oninput="BentoGrid._resizeCuInput(this)">' +
            '</span>' +
          '</span>';
        }
      );
      var html = '<div class="cu-passage-exercise" id="' + idBase + '-pi-passage">' +
        '<div class="cu-passage-text">' + passageHtml + '</div>' +
        '</div>';
      if (answers.length) html += self._renderCuExFooter(secId);
      return html;
    },

    // --- Grouped exercise renderer (Exercise A/B style: word bank per group + questions) ---
    _renderCuGroupedExercise: function(ex, idBase, secId) {
      var self = this;
      var groups = ex.groups || [];
      var html = '<div class="cu-grouped-exercise">';
      var globalIdx = 0;
      groups.forEach(function(grp, grpIdx) {
        html += '<div class="cu-group-section">';
        if (grp.words && grp.words.length) {
          html += '<div class="cu-group-wordbank">';
          html += '<span class="material-symbols-outlined">view_list</span>';
          grp.words.forEach(function(w) {
            html += '<span class="cu-wordbank-item" role="button" tabindex="0" onclick="BentoGrid._toggleWordBankItem(this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._toggleWordBankItem(this);event.preventDefault();}" title="Mark as used">' + self._escapeHTML(w) + '</span>';
          });
          html += '</div>';
        }
        var questions = grp.questions || [];
        html += '<div class="cu-ex-items">';
        questions.forEach(function(item) {
          html += self._renderCourseExItem(item, globalIdx, idBase + '-' + globalIdx);
          globalIdx++;
        });
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
      var totalQs = groups.reduce(function(n, g) { return n + (g.questions || []).length; }, 0);
      if (totalQs > 0) html += self._renderCuExFooter(secId);
      return html;
    },

    // --- Drag-category exercise renderer (Exercise G/M style) ---
    _renderCuDragCategoryExercise: function(ex, idBase, secId) {
      var self = this;
      var categories = ex.categories || [];
      var words = ex.words || [];
      var answers = ex.answers || {};
      var exId = idBase + '-dragcat';
      var html = '<div class="cu-drag-category-exercise" id="' + exId + '" data-sec-id="' + secId + '">';
      html += '<div class="cu-drag-pool" id="' + exId + '-pool">';
      words.forEach(function(w) {
        html += '<span class="cu-drag-chip" draggable="true" ' +
          'data-word="' + self._escapeHTML(w) + '" ' +
          'data-answer="' + self._escapeHTML(answers[w] || '') + '" ' +
          'data-ex-id="' + exId + '" ' +
          'ondragstart="BentoGrid._dragCatStart(event)" ' +
          'onclick="BentoGrid._dragCatClick(this)">' +
          self._escapeHTML(w) + '</span>';
      });
      html += '</div>';
      html += '<div class="cu-drag-zones">';
      categories.forEach(function(cat) {
        var zoneId = exId + '-zone-' + cat.replace(/[^a-z0-9]/gi, '_');
        html += '<div class="cu-drag-zone" id="' + zoneId + '" ' +
          'data-category="' + self._escapeHTML(cat) + '" ' +
          'data-ex-id="' + exId + '" ' +
          'ondragover="BentoGrid._dragCatOver(event)" ' +
          'ondrop="BentoGrid._dragCatDrop(event)" ' +
          'ondragleave="BentoGrid._dragCatLeave(event)">' +
          '<div class="cu-drag-zone-label">' + self._escapeHTML(cat) + '</div>' +
          '<div class="cu-drag-zone-items" id="' + zoneId + '-items"></div>' +
        '</div>';
      });
      html += '</div>';
      html += '</div>';
      if (words.length) html += self._renderCuExFooter(secId);
      return html;
    },

    _dragCatStart: function(e) {
      var el = e.currentTarget || e.target;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.getAttribute('data-word') || '');
      BentoGrid._dragCatSrc = el;
    },

    _dragCatOver: function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var zone = (e.currentTarget || e.target).closest('.cu-drag-zone');
      if (zone) zone.classList.add('cu-drag-zone-over');
    },

    _dragCatLeave: function(e) {
      var zone = (e.currentTarget || e.target).closest('.cu-drag-zone');
      if (zone) zone.classList.remove('cu-drag-zone-over');
    },

    _dragCatDrop: function(e) {
      e.preventDefault();
      var zone = (e.currentTarget || e.target).closest('.cu-drag-zone');
      if (!zone) return;
      zone.classList.remove('cu-drag-zone-over');
      var src = BentoGrid._dragCatSrc;
      if (!src) return;
      var itemsContainer = zone.querySelector('.cu-drag-zone-items');
      if (itemsContainer) itemsContainer.appendChild(src);
      BentoGrid._dragCatSrc = null;
      var sec = zone.closest('.cu-section');
      if (sec) BentoGrid._saveCuExSectionState(sec);
    },

    _dragCatClick: function(chip) {
      if (chip.disabled) return;
      var exId = chip.getAttribute('data-ex-id');
      var exEl = exId ? document.getElementById(exId) : null;
      if (!exEl) return;
      var categories = exEl.querySelectorAll('.cu-drag-zone');
      var currentZone = chip.closest('.cu-drag-zone');
      var pool = document.getElementById(exId + '-pool');
      if (!currentZone) {
        if (categories.length > 0) {
          var firstZone = categories[0].querySelector('.cu-drag-zone-items');
          if (firstZone) firstZone.appendChild(chip);
        }
      } else {
        var catArr = Array.prototype.slice.call(categories);
        var idx = catArr.indexOf(currentZone);
        if (idx < catArr.length - 1) {
          var nextZone = catArr[idx + 1].querySelector('.cu-drag-zone-items');
          if (nextZone) nextZone.appendChild(chip);
        } else {
          if (pool) pool.appendChild(chip);
        }
      }
      var sec = chip.closest('.cu-section');
      if (sec) BentoGrid._saveCuExSectionState(sec);
    },

    _dragCatSrc: null,

    // --- Multiple-choice passage renderer (exercise D style, like reading part 1) ---
    // Stores: BentoGrid._cuMcPassageData[secId] = { qNum: { options, answer } }
    _cuMcPassageData: {},
    _cuMcPassageAnswers: {},

    _renderCuMcPassageExercise: function(ex, idBase, secId) {
      var self = this;
      var passage = ex.passage || '';
      var questions = ex.questions || [];
      // Build question data keyed by gap number (1-based, matching "(N) ......" in passage)
      var qMap = {};
      questions.forEach(function(q, qi) {
        // Determine gap number from sentence: "(1) ......" → 1
        var numMatch = (q.sentence || '').match(/^\((\d+)\)/);
        var gapNum = numMatch ? parseInt(numMatch[1]) : (qi + 1);
        qMap[gapNum] = { options: q.options || [], answer: (q.answer || '').trim().toUpperCase() };
      });
      // Store question data for modal access
      self._cuMcPassageData[secId] = qMap;
      if (!self._cuMcPassageAnswers[secId]) self._cuMcPassageAnswers[secId] = {};

      // Replace "(N) ......" patterns in the passage with clickable gap pills
      // Escape HTML first, then replace the gap markers
      var passageHtml = self._escapeHTML(passage).replace(
        /\((\d+)\)\s*(?:\.{6,}|…{2,})/g,
        function(_, num) {
          var gapNum = parseInt(num);
          var pillId = idBase + '-mcpg-' + gapNum;
          return '<span class="cu-mc-passage-gap" id="' + pillId + '" ' +
            'data-gap-num="' + gapNum + '" data-sec-id="' + secId + '" data-answer="' + self._escapeHTML((qMap[gapNum] || {}).answer || '') + '" ' +
            'onclick="BentoGrid._openCuMcModal(\'' + secId + '\',' + gapNum + ')" role="button" tabindex="0">' +
            '<span class="cu-mc-passage-gap-num">' + num + '</span>' +
            '<span class="cu-mc-passage-gap-slot"></span>' +
          '</span>';
        }
      );
      var html = '<div class="cu-mc-passage-exercise" id="' + idBase + '-mcpassage">' +
        '<div class="cu-passage-text">' + passageHtml + '</div>' +
        '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    _openCuMcModal: function(secId, gapNum) {
      var qData = (BentoGrid._cuMcPassageData[secId] || {})[gapNum];
      if (!qData) return;
      var overlay = document.getElementById('exercise-modal-overlay');
      var body = document.getElementById('modal-body');
      if (!overlay || !body) return;
      var html = '<div class="modal-header"><div class="modal-header-row"><span class="modal-q-circle">' + gapNum + '</span><p>Select an option</p></div></div>';
      html += '<div class="options-grid">';
      qData.options.forEach(function(opt) {
        var letter = opt.charAt(0).toUpperCase();
        var text = BentoGrid._escapeHTML(BentoGrid._getCuMcOptionText(opt));
        html += '<button class="opt-btn" onclick="BentoGrid._selectCuMcAnswer(\'' + secId + '\',' + gapNum + ',\'' + letter + '\',\'' + text.replace(/'/g, "\\'") + '\')">' + text + '</button>';
      });
      html += '</div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },

    _selectCuMcAnswer: function(secId, gapNum, letter, text) {
      // Store answer
      if (!BentoGrid._cuMcPassageAnswers[secId]) BentoGrid._cuMcPassageAnswers[secId] = {};
      BentoGrid._cuMcPassageAnswers[secId][gapNum] = letter;
      // Update gap pill display
      var secEl = document.getElementById(secId);
      var pill = secEl ? secEl.querySelector('[data-gap-num="' + gapNum + '"]') : null;
      if (pill) {
        var slot = pill.querySelector('.cu-mc-passage-gap-slot');
        if (slot) {
          slot.textContent = text;
          slot.className = 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled';
        }
        pill.classList.add('cu-mc-passage-gap-answered');
      }
      // Close modal
      var overlay = document.getElementById('exercise-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      // Persist draft answers locally
      if (secEl) BentoGrid._saveCuExSectionState(secEl);
    },


    _renderCuMatchingExercise: function(questions, idBase, secId) {
      var self = this;
      if (!questions || !questions.length) return '';
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      // Extract beginnings and endings from sentence data
      var items = questions.map(function(q, idx) {
        var sentence = q.sentence || '';
        var boldMatch = sentence.match(/^(.*?)\s*\*\*([A-Z])\*\*\s*(.*)?$/);
        var beginning = boldMatch ? boldMatch[1].trim() : sentence;
        var letter = boldMatch ? boldMatch[2] : String.fromCharCode(65 + idx);
        var ending = boldMatch ? (boldMatch[3] || '').trim() : '';
        return { num: idx + 1, letter: letter, beginning: beginning, ending: ending, answer: q.answer || '' };
      });
      // Sort right-column items alphabetically A→G (never shuffled)
      var rightItems = items.map(function(it) { return { letter: it.letter, ending: it.ending }; });
      rightItems.sort(function(a, b) { return a.letter.localeCompare(b.letter); });
      var html = '<div class="cu-match-exercise" data-sec-id="' + secId + '">';
      // Table layout: each row contains a left item and a right item so heights stay aligned
      html += '<table class="cu-match-table"><tbody>';
      items.forEach(function(it, idx) {
        var rightItem = rightItems[idx];
        html += '<tr class="cu-match-row">' +
          '<td class="cu-match-left-cell">' +
            '<div class="cu-match-item cu-match-left-item" data-num="' + it.num + '">' +
              '<span class="cu-match-num">' + it.num + '</span>' +
              '<span class="cu-match-text">' + self._escapeHTML(it.beginning) + '</span>' +
            '</div>' +
          '</td>' +
          '<td class="cu-match-right-cell">' +
            '<div class="cu-match-item cu-match-right-item" data-letter="' + rightItem.letter + '" draggable="true" ' +
              'ondragstart="BentoGrid._matchDragStart(event)" ' +
              'ondragover="BentoGrid._matchDragOver(event)" ' +
              'ondrop="BentoGrid._matchDrop(event)" ' +
              'ondragend="BentoGrid._matchDragEnd(event)">' +
              '<span class="cu-match-letter">' + rightItem.letter + '</span>' +
              '<span class="cu-match-text">' + self._escapeHTML(rightItem.ending) + '</span>' +
            '</div>' +
          '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      // Hidden answer data
      html += '<div class="cu-match-answers" style="display:none">';
      items.forEach(function(it) {
        html += '<span data-num="' + it.num + '" data-letter="' + it.letter + '"></span>';
      });
      html += '</div>';
      html += self._renderCuExFooter(secId);
      html += '</div>';
      return html;
    },

    _matchDragStart: function(e) {
      var el = e.currentTarget || e.target;
      el.classList.add('cu-match-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.getAttribute('data-letter') || '');
      BentoGrid._matchDragSrc = el;
    },

    _matchDragOver: function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var target = (e.currentTarget || e.target).closest('.cu-match-right-item');
      if (target && target !== BentoGrid._matchDragSrc) {
        target.classList.add('cu-match-drag-over');
      }
    },

    _matchDragEnd: function(e) {
      var el = e.currentTarget || e.target;
      el.classList.remove('cu-match-dragging');
      document.querySelectorAll('.cu-match-drag-over').forEach(function(el) { el.classList.remove('cu-match-drag-over'); });
      BentoGrid._matchDragSrc = null;
    },

    _matchDrop: function(e) {
      e.preventDefault();
      var target = (e.currentTarget || e.target).closest('.cu-match-right-item');
      var src = BentoGrid._matchDragSrc;
      if (!target || !src || target === src) return;
      // Table layout: swap items between their respective cells (td.cu-match-right-cell)
      var srcCell = src.parentNode;
      var tgtCell = target.parentNode;
      if (srcCell && tgtCell && srcCell !== tgtCell) {
        srcCell.appendChild(target);
        tgtCell.appendChild(src);
      }
      target.classList.remove('cu-match-drag-over');
      // Persist draft answers locally after a drag-drop swap
      var sec = src.closest('.cu-section');
      if (sec) BentoGrid._saveCuExSectionState(sec);
    },

    _matchDragSrc: null,

    _cuExGoToPage: function(sectionId, pageIdx) {
      var sec = document.getElementById(sectionId);
      if (!sec) return;
      sec.querySelectorAll('.cu-ex-page').forEach(function(p, i) {
        p.classList.toggle('cu-ex-page-active', i === pageIdx);
      });
      sec.querySelectorAll('.cu-ex-pdot').forEach(function(d, i) {
        d.classList.toggle('cu-ex-pdot-active', i === pageIdx);
        d.setAttribute('aria-current', i === pageIdx ? 'true' : 'false');
      });
    },

    _renderCuExItemsList: function(items, idBase, secId) {
      var self = this;
      if (!items || !items.length) return '';
      if (items.length <= CU_PAGE_SIZE) {
        var html = '';
        items.forEach(function(item, iIdx) {
          html += self._renderCourseExItem(item, iIdx, idBase + '-' + iIdx);
        });
        return html;
      }
      // Paginated rendering
      var pages = [];
      for (var i = 0; i < items.length; i += CU_PAGE_SIZE) {
        pages.push(items.slice(i, i + CU_PAGE_SIZE));
      }
      var html = '';
      // Dot navigation above pages
      html += '<nav class="cu-ex-page-dots" aria-label="Exercise pages">';
      for (var p = 0; p < pages.length; p++) {
        html += '<button class="cu-ex-pdot' + (p === 0 ? ' cu-ex-pdot-active' : '') + '" ' +
          'onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',' + p + ')" ' +
          (p === 0 ? 'aria-current="true" ' : 'aria-current="false" ') +
          'aria-label="Parte ' + (p + 1) + '"></button>';
      }
      html += '</nav>';
      // Pages
      pages.forEach(function(pageItems, pageIdx) {
        html += '<div class="cu-ex-page' + (pageIdx === 0 ? ' cu-ex-page-active' : '') + '">';
        pageItems.forEach(function(item, itemIdx) {
          var globalIdx = pageIdx * CU_PAGE_SIZE + itemIdx;
          html += self._renderCourseExItem(item, globalIdx, idBase + '-' + globalIdx);
        });
        if (pageIdx < pages.length - 1) {
          var remaining = pages.length - pageIdx - 1;
          html += '<button class="cu-ex-page-more" type="button" onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',' + (pageIdx + 1) + ')">' +
            '<span class="material-symbols-outlined">expand_circle_down</span> ' +
            remaining + ' more part' + (remaining > 1 ? 's' : '') + '</button>';
        }
        html += '</div>';
      });
      return html;
    },

    _renderCourseExItem: function(item, idx, idBase, trackCallback) {
      var self = this;
      var answer = item.answer || '';
      var inputId = 'cuex-' + idBase;

      // Handle paired-sentence format (sentenceA / sentenceB) – e.g. Stative vs Active
      if (item.sentenceA !== undefined || item.sentenceB !== undefined) {
        var rawA = (item.sentenceA || '').replace(/^A[.):\s]\s*/, '');
        var rawB = (item.sentenceB || '').replace(/^B[.):\s]\s*/, '');
        return '<div class="cu-ex-item" data-answer="' + self._escapeHTML(answer) + '">' +
          '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
          '<div class="cu-ex-sentence">' +
            '<div class="cu-ex-kwtrans">' +
              '<div class="cu-ex-kwtrans-row">' +
                '<span class="cu-ex-kwtrans-label">A</span>' +
                '<div class="cu-ex-kwtrans-text">' + self._renderCourseExSentenceParts(rawA, inputId + '_a') + '</div>' +
              '</div>' +
              '<div class="cu-ex-kwtrans-row">' +
                '<span class="cu-ex-kwtrans-label">B</span>' +
                '<div class="cu-ex-kwtrans-text">' + self._renderCourseExSentenceParts(rawB, inputId + '_b') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cu-ex-foot">' +
            '<div class="cu-answer" style="display:none">' + self._escapeHTML(answer) + '</div>' +
          '</div>' +
        '</div>';
      }

      var sentence = item.sentence || '';
      var isMC = !!(item.options && item.options.length);
      // Optional read-only context sentence rendered above the interactive sentence
      var contextHtml = item.context ? '<div class="cu-ex-context">' + self._escapeHTML(item.context) + '</div>' : '';

      var sentenceHtml;
      if (isMC) {
        sentenceHtml = self._renderCourseExMCItem(sentence, item.options, inputId);
      } else {
        sentenceHtml = self._renderCourseExSentence(sentence, inputId);
      }

      return '<div class="cu-ex-item" data-answer="' + self._escapeHTML(answer) + '">' +
        '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
        contextHtml +
        '<div class="cu-ex-sentence">' + sentenceHtml + '</div>' +
        '<div class="cu-ex-foot">' +
          '<div class="cu-answer" style="display:none">' + self._escapeHTML(answer) + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderCourseExMCItem: function(sentence, options, inputId) {
      var self = this;
      var oGroupId = inputId + '_mc';
      // Replace gap markers with interactive pills that update when an option is selected.
      // Each gap gets a unique ID with a counter suffix to satisfy the uniqueness constraint.
      var pillCounter = 0;
      var sentenceHtml = self._formatTextWithHints(sentence).replace(/[…]{3,}|\.{5,}/g, function() {
        var pillId = oGroupId + '-pill' + pillCounter++;
        return '<span class="cu-mc-gap-pill" id="' + pillId + '">' + CU_MC_BLANK + '</span>';
      });
      // All options point to the first pill (counter resets per sentence, single gap expected for MC)
      var firstPillId = oGroupId + '-pill0';
      var optHtml = '<div class="cu-mc-options">';
      options.forEach(function(opt) {
        var trimmed = opt.trim();
        var letter = trimmed.charAt(0).toUpperCase();
        var text = self._escapeHTML(trimmed.slice(1).trim());
        optHtml += '<button class="cu-option-btn cu-mc-option" data-group="' + oGroupId +
          '" data-mc-letter="' + letter +
          '" data-mc-text="' + text +
          '" data-pill-id="' + firstPillId +
          '" onclick="BentoGrid._selectMcOption(this)" type="button">' +
          '<span class="cu-mc-letter">' + letter + '</span>' + text + '</button>';
      });
      optHtml += '</div>';
      return sentenceHtml + optHtml;
    },

    _selectMcOption: function(btn) {
      if (btn.disabled) return;
      var group = btn.getAttribute('data-group');
      if (!group) return;
      var siblings = document.querySelectorAll('.cu-option-btn[data-group="' + group + '"]');
      siblings.forEach(function(s) { s.classList.remove('cu-option-selected'); });
      btn.classList.add('cu-option-selected');
      // Update the gap pill in the sentence
      var pillId = btn.getAttribute('data-pill-id');
      var text = btn.getAttribute('data-mc-text') || '';
      if (pillId) {
        var pill = document.getElementById(pillId);
        if (pill) {
          pill.textContent = '';
          pill.classList.add('cu-mc-gap-pill-filled');
          pill.textContent = text || btn.getAttribute('data-mc-letter') || '';
        }
      }
      BentoGrid._saveCuExSectionState(btn.closest('.cu-section'));
    },

    _formatTextWithHints: function(text) {
      var self = this;
      var result = '';
      var parenRegex = /\(([^)]+)\)/g;
      var lastIdx = 0;
      var m;
      while ((m = parenRegex.exec(text)) !== null) {
        result += self._escapeHTML(text.slice(lastIdx, m.index));
        var inner = m[1];
        if (/^\d+$/.test(inner.trim())) {
          // Number — render as bold, no box
          result += '<strong>' + self._escapeHTML(inner) + '</strong>';
        } else {
          // Word hint — render without parentheses
          result += '<span class="cu-hint-word">' + self._escapeHTML(inner) + '</span>';
        }
        lastIdx = m.index + m[0].length;
      }
      result += self._escapeHTML(text.slice(lastIdx));
      return result;
    },

    _renderCourseExSentence: function(sentence, inputIdBase) {
      var self = this;

      // Key Word Transformation: two sentences separated by \n → show A / keyword / B rows
      var nlIdx = sentence.indexOf('\n');
      if (nlIdx !== -1) {
        var sentA = sentence.slice(0, nlIdx);
        var sentB = sentence.slice(nlIdx + 1);
        // Extract **keyword** from the end of sentA (e.g. "...decision. **account**")
        // or from the beginning of sentB (e.g. "**been** When you called, ......")
        var keyword = '';
        var kwMatch = sentA.match(/\s*\*\*([^*]+)\*\*\s*$/);
        if (kwMatch) {
          keyword = kwMatch[1];
          sentA = sentA.slice(0, kwMatch.index).trim();
        } else {
          var kwMatchB = sentB.match(/^\s*\*\*([^*]+)\*\*\s*/);
          if (kwMatchB) {
            keyword = kwMatchB[1];
            sentB = sentB.slice(kwMatchB[0].length).trim();
          }
        }
        return '<div class="cu-ex-kwtrans">' +
          '<div class="cu-ex-kwtrans-row">' +
            '<span class="cu-ex-kwtrans-label">A</span>' +
            '<div class="cu-ex-kwtrans-text">' + self._renderCourseExSentenceParts(sentA, inputIdBase, true) + '</div>' +
          '</div>' +
          (keyword ? '<div class="cu-kwtrans-keyword-row"><span class="cu-kwtrans-keyword">' + self._escapeHTML(keyword) + '</span></div>' : '') +
          '<div class="cu-ex-kwtrans-row">' +
            '<span class="cu-ex-kwtrans-label">B</span>' +
            '<div class="cu-ex-kwtrans-text">' + self._renderCourseExSentenceParts(sentB, inputIdBase) + '</div>' +
          '</div>' +
        '</div>';
      }

      return self._renderCourseExSentenceParts(sentence, inputIdBase);
    },

    _renderCourseExSentenceParts: function(sentence, inputIdBase, noStandalone) {
      var self = this;
      // Tokenise sentence into: plain text, gap markers, bold+option patterns, plain bold
      // Compound patterns (hint+gap pill) are matched first so they take priority:
      //   Pattern A: optional (number)  (hint)  gap_marker  → dark pill with [num] [input] [hint]
      //   Pattern B: gap_marker  (hint)             → dark pill with [input] [hint]
      var parts = [];
      // Individual sub-patterns:
      //   numParen    – optional number-only parens like "(1) "
      //   hintParen   – hint text in parens like "(you)" or "(I / just)"
      //   gapMarker   – five or more dots/ellipsis characters
      //   boldMarker  – text enclosed in **double asterisks**
      var numParen    = '(\\(\\d+\\)\\s+)?';
      var hintParen   = '\\(([^)]+)\\)';
      var gapMarker   = '[.\\u2026]{5,}';
      var boldMarker  = '\\*\\*[^*]+\\*\\*';
      var strikeMarker = '\\*[^*]+\\*';
      var tokenRegex = new RegExp(
        numParen + hintParen + '\\s*' + gapMarker +    // Pattern A: (num?) (hint) gap
        '|' + gapMarker + '\\s*' + hintParen +         // Pattern B: gap (hint)
        '|' + gapMarker +                              // Simple gap
        '|' + boldMarker +                             // Bold text **...**
        '|' + strikeMarker,                            // Strikethrough text *...*
        'g'
      );
      var lastIndex = 0;
      var match;
      while ((match = tokenRegex.exec(sentence)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', val: sentence.slice(lastIndex, match.index) });
        }
        var m = match[0];
        if (match[2] !== undefined) {
          // Pattern A: (optional-number) (hint) gap
          var pillNumber = match[1] ? match[1].replace(/[()]/g, '').trim() : null;
          var hintText = match[2].trim();
          // If the "hint" is a pure number, treat it as the pill number (not a word hint badge).
          // This handles sentences like "It's (1) …………… my principles" where Pattern A matches
          // with numParen empty and hintParen="(1)", which would otherwise render as [input][1]
          // (number after input). Converting to num=1, hint=null gives [1][input] (correct order).
          if (!pillNumber && /^\d+$/.test(hintText)) {
            parts.push({ type: 'hint-gap', num: hintText, hint: null });
          } else {
            parts.push({ type: 'hint-gap', num: pillNumber, hint: hintText });
          }
        } else if (match[3] !== undefined) {
          // Pattern B: gap (hint)
          parts.push({ type: 'gap-hint', hint: match[3].trim() });
        } else if (m.startsWith('**')) {
          // Bold marker **...**
          var inner = m.slice(2, -2);
          if (inner.indexOf('/') !== -1) {
            parts.push({ type: 'options', parts: inner.split(/\s*\/\s*/) });
          } else {
            parts.push({ type: 'bold', val: inner });
          }
        } else if (m.charAt(0) === '*') {
          // Strikethrough marker *...*
          parts.push({ type: 'strike', val: m.slice(1, -1) });
        } else {
          parts.push({ type: 'gap' });
        }
        lastIndex = match.index + m.length;
      }
      if (lastIndex < sentence.length) {
        parts.push({ type: 'text', val: sentence.slice(lastIndex) });
      }

      // Post-process: if the last part is a bold ALL-CAPS word (word-formation hint)
      // and there's a gap somewhere before it, move the badge to be right after the last gap
      var lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.type === 'bold' && /^[A-Z]{2,}$/.test(lastPart.val)) {
        // Find last gap index
        var lastGapIdx = -1;
        for (var pi = parts.length - 2; pi >= 0; pi--) {
          if (parts[pi].type === 'gap' || parts[pi].type === 'hint-gap' || parts[pi].type === 'gap-hint') {
            lastGapIdx = pi;
            break;
          }
        }
        if (lastGapIdx !== -1) {
          // Remove the bold from end, attach as wf-badge on the gap
          var wfWord = parts.pop().val;
          parts[lastGapIdx] = { type: 'gap-wf', wfWord: wfWord };
        }
      }

      // Post-process: capture trailing (HINT) text into the preceding hint-gap pill
      // e.g. "(1) ...... (EXPLAIN)" → pill with num=1, input, hint="EXPLAIN" all together
      for (var pi = 0; pi < parts.length - 1; pi++) {
        if (parts[pi].type === 'hint-gap' && parts[pi].hint === null) {
          var nextPart = parts[pi + 1];
          if (nextPart.type === 'text') {
            var trailingHintMatch = nextPart.val.match(/^\s*\(([^)]+)\)([\s\S]*)/);
            if (trailingHintMatch) {
              parts[pi].hint = trailingHintMatch[1].trim();
              var remainder = trailingHintMatch[2];
              if (remainder) {
                parts[pi + 1] = { type: 'text', val: remainder };
              } else {
                parts.splice(pi + 1, 1);
              }
            }
          }
        }
      }

      // Post-process: when no interactive elements and there are bold words, convert them
      // to inline hint-gap pills (hint = bold word + input together), as in Exercise F
      // style error-correction where the incorrect bold word acts as the hint.
      // All bold items are converted (no break) so sentences with multiple numbered
      // error-correction targets (e.g. Exercise G) get one input pill per bold phrase.
      var hasInteractive = parts.some(function(p) {
        return p.type === 'gap' || p.type === 'hint-gap' || p.type === 'gap-hint' || p.type === 'gap-wf' || p.type === 'options';
      });
      if (!hasInteractive) {
        for (var bpi = 0; bpi < parts.length; bpi++) {
          if (parts[bpi].type === 'bold') {
            parts[bpi] = { type: 'hint-gap', num: null, hint: parts[bpi].val };
            hasInteractive = true;
          }
        }
      }

      // Post-process: extract a leading "(N)" from the text part immediately before each
      // hint-gap pill (with no number yet) so the number is displayed inside the pill.
      // This handles error-correction sentences like "(2) **hadSeen** ..." where the item
      // number should appear as the pill's num badge rather than as plain text.
      for (var npi = 1; npi < parts.length; npi++) {
        if (parts[npi].type === 'hint-gap' && parts[npi].num === null) {
          var prevPart = parts[npi - 1];
          if (prevPart && prevPart.type === 'text') {
            var numPrefixMatch = prevPart.val.match(/^(.*)\s*\((\d+)\)\s*$/);
            if (numPrefixMatch) {
              parts[npi].num = numPrefixMatch[2];
              prevPart.val = numPrefixMatch[1];
            }
          }
        }
      }

      // Check if there are any interactive elements (re-evaluate after post-processing)
      hasInteractive = parts.some(function(p) {
        return p.type === 'gap' || p.type === 'hint-gap' || p.type === 'gap-hint' || p.type === 'gap-wf' || p.type === 'options';
      });

      // If no gaps or options detected, add a standalone answer input at the end
      // (noStandalone=true is used for KWT sentence A which is a reference-only sentence)
      if (!hasInteractive && !noStandalone) {
        parts.push({ type: 'standalone' });
      }

      // Post-process: group [gap, text, gap-hint] into a single gap-group pill so both
      // inputs are visually tied together (e.g. "Darren [____] usually [____](get) home…")
      for (var gg = 0; gg < parts.length - 2; gg++) {
        if (parts[gg].type === 'gap' && parts[gg + 1].type === 'text' && parts[gg + 2].type === 'gap-hint') {
          parts.splice(gg, 3, { type: 'gap-group', midText: parts[gg + 1].val, hint: parts[gg + 2].hint });
        }
      }

      var gapCount = 0;
      var optCount = 0;
      return parts.map(function(p) {
        if (p.type === 'text') {
          return self._formatTextWithHints(p.val);
        } else if (p.type === 'bold') {
          return '<strong>' + self._escapeHTML(p.val) + '</strong>';
        } else if (p.type === 'strike') {
          return '<s>' + self._escapeHTML(p.val) + '</s>';
        } else if (p.type === 'gap') {
          return '<input type="text" id="' + inputIdBase + '_g' + (gapCount++) + '" class="cu-gap-input" placeholder="..." oninput="BentoGrid._resizeCuInput(this)">';
        } else if (p.type === 'gap-wf') {
          // Word-formation gap: input + word-badge together
          var gId = inputIdBase + '_g' + (gapCount++);
          return '<span class="cu-hint-pill">' +
            '<input type="text" id="' + gId + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." oninput="BentoGrid._resizeCuInput(this)">' +
            '<span class="cu-hint-pill-word cu-wf-pill-word">' + self._escapeHTML(p.wfWord) + '</span>' +
            '</span>';
        } else if (p.type === 'hint-gap' || p.type === 'gap-hint') {
          var gId = inputIdBase + '_g' + (gapCount++);
          var pillHtml = '<span class="cu-hint-pill">';
          if (p.num) {
            pillHtml += '<span class="cu-hint-pill-num">' + self._escapeHTML(p.num) + '</span>';
          }
          pillHtml += '<input type="text" id="' + gId + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." oninput="BentoGrid._resizeCuInput(this)">';
          if (p.hint) {
            pillHtml += '<span class="cu-hint-word">' + self._escapeHTML(p.hint) + '</span>';
          }
          pillHtml += '</span>';
          return pillHtml;
        } else if (p.type === 'gap-group') {
          // Two inputs joined by middle text, both styled as hint-pill inputs
          var gId1 = inputIdBase + '_g' + (gapCount++);
          var gId2 = inputIdBase + '_g' + (gapCount++);
          var groupHtml = '<span class="cu-hint-pill">' +
            '<input type="text" id="' + gId1 + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." oninput="BentoGrid._resizeCuInput(this)">' +
            '<span class="cu-hint-pill-mid">' + self._escapeHTML(p.midText.trim()) + '</span>' +
            '<input type="text" id="' + gId2 + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." oninput="BentoGrid._resizeCuInput(this)">';
          if (p.hint) {
            groupHtml += '<span class="cu-hint-pill-word">' + self._escapeHTML(p.hint) + '</span>';
          }
          groupHtml += '</span>';
          return groupHtml;
        } else if (p.type === 'options') {
          var oId = inputIdBase + '_o' + (optCount++);
          return p.parts.map(function(opt) {
            return '<button class="cu-option-btn" data-group="' + oId + '" onclick="BentoGrid._selectCourseOption(this)" type="button">' + self._escapeHTML(opt.trim()) + '</button>';
          }).join('<span class="cu-option-sep">/</span>');
        } else if (p.type === 'standalone') {
          return '<br><input type="text" class="cu-gap-input cu-gap-standalone" placeholder="Your answer..." oninput="BentoGrid._resizeCuInput(this)">';
        }
        return '';
      }).join('');
    },

    _selectCourseOption: function(btn) {
      if (btn.disabled) return;
      var group = btn.getAttribute('data-group');
      if (!group) return;
      var sec = btn.closest('.cu-section');
      if (sec && sec.getAttribute('data-multi-select') === 'true') {
        // Multi-select mode: toggle the clicked button without deselecting others
        btn.classList.toggle('cu-option-selected');
      } else {
        var siblings = document.querySelectorAll('.cu-option-btn[data-group="' + group + '"]');
        siblings.forEach(function(s) { s.classList.remove('cu-option-selected'); });
        btn.classList.add('cu-option-selected');
      }
      BentoGrid._saveCuExSectionState(sec || btn.closest('.cu-section'));
    },

    // Auto-resize a course gap input to fit its content (like test inputs)
    _resizeCuInput: function(input) {
      var minWidth = 80;
      var span = document.getElementById('cu-resize-span');
      if (!span) {
        span = document.createElement('span');
        span.id = 'cu-resize-span';
        span.style.cssText = 'visibility:hidden;position:absolute;white-space:pre;pointer-events:none;font-size:0.9rem;';
        document.body.appendChild(span);
      }
      span.style.font = window.getComputedStyle(input).font;
      span.textContent = input.value || input.placeholder || '';
      var newWidth = Math.max(minWidth, span.getBoundingClientRect().width + 28);
      input.style.width = newWidth + 'px';
      BentoGrid._saveCuExSectionState(input.closest('.cu-section'));
    },

    // Resize all cu-gap-input elements inside a section
    _resizeAllCuInputs: function(sec) {
      if (!sec) return;
      sec.querySelectorAll('.cu-gap-input').forEach(function(inp) {
        BentoGrid._resizeCuInput(inp);
      });
    },


    _cuConfirm: function(message, onConfirm) {
      // Remove any existing confirm overlay
      var existing = document.getElementById('cu-confirm-overlay');
      if (existing) existing.remove();
      var overlay = document.createElement('div');
      overlay.id = 'cu-confirm-overlay';
      overlay.className = 'cu-confirm-overlay';
      // Use _escapeHTML for consistent, thorough HTML escaping
      var escapedMsg = BentoGrid._escapeHTML(message);
      overlay.innerHTML =
        '<div class="cu-confirm-dialog">' +
          '<div class="cu-confirm-message">' + escapedMsg + '</div>' +
          '<div class="cu-confirm-buttons">' +
            '<button class="cu-confirm-btn cu-confirm-cancel" type="button">Cancel</button>' +
            '<button class="cu-confirm-btn cu-confirm-ok" type="button">OK</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.querySelector('.cu-confirm-cancel').addEventListener('click', function() {
        overlay.remove();
      });
      overlay.querySelector('.cu-confirm-ok').addEventListener('click', function() {
        overlay.remove();
        if (typeof onConfirm === 'function') onConfirm();
      });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
      });
    },
    _popstateCourseBlock: async function(blockKey) {
      // Ensure course data is loaded, then select the block
      if (!BentoGrid._courseBlocks) {
        await BentoGrid.openCourseTheory();
      }
      BentoGrid._selectCourseBlock(blockKey);
    },

    _popstateCourseUnit: async function(state) {
      var unitId = state.unitId;
      var filePath = state.filePath;
      // Derive filePath from index data if not stored in state
      if (!filePath && BentoGrid._courseIndexData) {
        var item = (BentoGrid._courseIndexData.items || []).find(function(i) { return i.id === unitId; });
        if (item) filePath = 'data/Course/' + (BentoGrid._courseLevel || 'C1') + '/' + item.file;
      }
      if (!filePath) {
        // Cannot navigate without a file path — fall back to theory overview
        await BentoGrid.openCourseTheory();
        return;
      }
      var sectionIdx = typeof state.sectionIdx !== 'undefined' ? state.sectionIdx : 0;
      await BentoGrid.openCourseUnit(unitId, filePath, sectionIdx);
    },

    // ── Course Progress Tracking ─────────────────────────────────────────
    _getCourseProgress: function(level) {
      try {
        return JSON.parse(localStorage.getItem('cambridge_course_progress_' + level) || '{}');
      } catch(e) { return {}; }
    },

    _getCourseSectionProgress: function(level) {
      try {
        return JSON.parse(localStorage.getItem('cambridge_course_section_progress_' + level) || '{}');
      } catch(e) { return {}; }
    },

    _getCourseSectionOpened: function(level) {
      try {
        return JSON.parse(localStorage.getItem('cambridge_course_section_opened_' + level) || '{}');
      } catch(e) { return {}; }
    },

    _markCourseUnitOpened: function(level, unitId) {
      var prog = BentoGrid._getCourseProgress(level);
      prog[unitId] = true;
      try {
        localStorage.setItem('cambridge_course_progress_' + level, JSON.stringify(prog));
      } catch(e) {}
    },

    _markCourseSectionVisited: function(level, unitId, sectionIdx) {
      if (!unitId || typeof sectionIdx !== 'number' || sectionIdx < 0) return;
      var prog = BentoGrid._getCourseSectionProgress(level);
      var unitProg = prog[unitId] || {};
      unitProg[sectionIdx] = true;
      prog[unitId] = unitProg;
      try {
        localStorage.setItem('cambridge_course_section_progress_' + level, JSON.stringify(prog));
      } catch(e) {}
    },

    _markCourseSectionOpened: function(level, unitId, sectionIdx) {
      if (!level || !unitId || typeof sectionIdx !== 'number' || sectionIdx < 0) return;
      var opened = BentoGrid._getCourseSectionOpened(level);
      var unitOpened = opened[unitId] || {};
      unitOpened[sectionIdx] = true;
      opened[unitId] = unitOpened;
      try {
        localStorage.setItem('cambridge_course_section_opened_' + level, JSON.stringify(opened));
      } catch(e) {}
    },

    _checkCourseUnitAllDone: function(level, unitId) {
      if (!unitId) return;
      var container = document.querySelector('.course-unit-content');
      if (!container) return;
      var total = container.querySelectorAll('.cu-section').length;
      if (total === 0) return;
      var prog = BentoGrid._getCourseSectionProgress(level);
      var unitProg = prog[unitId] || {};
      var visitedCount = Object.keys(unitProg).filter(function(k) { return unitProg[k]; }).length;
      if (visitedCount < total) return;
      BentoGrid._markCourseUnitOpened(level, unitId);
    },

    _resetCourseUnit: function(unitId) {
      var level = BentoGrid._courseLevel || 'C1';
      BentoGrid._cuConfirm('Restart this unit? Your progress will be cleared.', function() {
        var prog = BentoGrid._getCourseProgress(level);
        delete prog[unitId];
        try { localStorage.setItem('cambridge_course_progress_' + level, JSON.stringify(prog)); } catch(e) {}
        var secProg = BentoGrid._getCourseSectionProgress(level);
        delete secProg[unitId];
        try { localStorage.setItem('cambridge_course_section_progress_' + level, JSON.stringify(secProg)); } catch(e) {}
        // Clear opened (in-progress) state for this unit
        var openedProg = BentoGrid._getCourseSectionOpened(level);
        delete openedProg[unitId];
        try { localStorage.setItem('cambridge_course_section_opened_' + level, JSON.stringify(openedProg)); } catch(e) {}
        // Clear review section scores and state for this unit
        try {
          var prefix = unitId + '_';
          var raKey = 'cambridge_review_answers_' + level;
          var raData = JSON.parse(localStorage.getItem(raKey) || '{}');
          Object.keys(raData).forEach(function(k) { if (k.indexOf(prefix) === 0) delete raData[k]; });
          localStorage.setItem(raKey, JSON.stringify(raData));
          var rsKey = 'cambridge_review_section_state_' + level;
          var rsData = JSON.parse(localStorage.getItem(rsKey) || '{}');
          Object.keys(rsData).forEach(function(k) { if (k.indexOf(prefix) === 0) delete rsData[k]; });
          localStorage.setItem(rsKey, JSON.stringify(rsData));
        } catch(e) {}
        // Clear exercise section draft/checked states for this unit
        try {
          var exKey = BentoGrid._cuExStateKey(level);
          var exData = JSON.parse(localStorage.getItem(exKey) || '{}');
          var exPrefix = unitId + '_';
          Object.keys(exData).forEach(function(k) { if (k.indexOf(exPrefix) === 0) delete exData[k]; });
          localStorage.setItem(exKey, JSON.stringify(exData));
        } catch(e) {}
        // Reopen the unit fresh
        var foundItem = BentoGrid._courseIndexData && BentoGrid._courseIndexData.items &&
          BentoGrid._courseIndexData.items.find(function(i) { return i.id === unitId; });
        if (foundItem) {
          BentoGrid.openCourseUnit(unitId, 'data/Course/' + level + '/' + foundItem.file);
        }
      });
    },

    _resetCourseBlock: function(blockKey) {
      var level = BentoGrid._courseLevel || 'C1';
      BentoGrid._cuConfirm('Restart Block ' + blockKey + '? Progress for all units in this block will be cleared.', function() {
        var items = (BentoGrid._courseBlocks || {})[blockKey] || [];
        var prog = BentoGrid._getCourseProgress(level);
        var secProg = BentoGrid._getCourseSectionProgress(level);
        var openedProg = BentoGrid._getCourseSectionOpened(level);
        items.forEach(function(item) {
          delete prog[item.id];
          delete secProg[item.id];
          delete openedProg[item.id];
        });
        try { localStorage.setItem('cambridge_course_progress_' + level, JSON.stringify(prog)); } catch(e) {}
        try { localStorage.setItem('cambridge_course_section_progress_' + level, JSON.stringify(secProg)); } catch(e) {}
        try { localStorage.setItem('cambridge_course_section_opened_' + level, JSON.stringify(openedProg)); } catch(e) {}
        // Clear review section scores and state for all review units in this block
        try {
          var raKey = 'cambridge_review_answers_' + level;
          var raData = JSON.parse(localStorage.getItem(raKey) || '{}');
          var rsKey = 'cambridge_review_section_state_' + level;
          var rsData = JSON.parse(localStorage.getItem(rsKey) || '{}');
          items.forEach(function(item) {
            var prefix = item.id + '_';
            Object.keys(raData).forEach(function(k) { if (k.indexOf(prefix) === 0) delete raData[k]; });
            Object.keys(rsData).forEach(function(k) { if (k.indexOf(prefix) === 0) delete rsData[k]; });
          });
          localStorage.setItem(raKey, JSON.stringify(raData));
          localStorage.setItem(rsKey, JSON.stringify(rsData));
        } catch(e) {}
        // Clear exercise section draft/checked states for all units in this block
        try {
          var exKey = BentoGrid._cuExStateKey(level);
          var exData = JSON.parse(localStorage.getItem(exKey) || '{}');
          items.forEach(function(item) {
            var exPrefix = item.id + '_';
            Object.keys(exData).forEach(function(k) { if (k.indexOf(exPrefix) === 0) delete exData[k]; });
          });
          localStorage.setItem(exKey, JSON.stringify(exData));
        } catch(e) {}
        BentoGrid._selectCourseBlock(blockKey);
      });
    },

    _extractCourseUnitMeta: function(unitData) {
      if (!unitData) return null;

      if (unitData.type === 'grammar') {
        var sections = unitData.sections || [];
        var theoryCount = sections.filter(function(section) { return section.type === 'theory'; }).length;
        var exerciseCount = Math.max(0, sections.length - theoryCount);
        return {
          theory: Array.from({ length: theoryCount }, function(_, idx) {
            return { label: String(idx + 1), sectionIdx: idx };
          }),
          exercises: Array.from({ length: exerciseCount }, function(_, idx) {
            return { label: BentoGrid._getCourseExerciseLabel(idx), sectionIdx: theoryCount + idx };
          })
        };
      }

      if (unitData.type === 'vocabulary') {
        var secs = unitData.sections || {};
        var vocabKeys = ['topic_vocabulary', 'phrasal_verbs', 'collocations_patterns', 'idioms', 'word_formation', 'exercises'];
        var theory = [];
        var exercises = [];
        var sectionIdx = 0;

        vocabKeys.forEach(function(key) {
          var value = secs[key];
          var hasContent = value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0);
          if (!hasContent) return;
          if (key === 'exercises') {
            // Each exercise letter becomes its own section
            Object.keys(value).forEach(function(exKey) {
              exercises.push({ label: exKey, sectionIdx: sectionIdx });
              sectionIdx++;
            });
          } else {
            theory.push({ label: String(theory.length + 1), sectionIdx: sectionIdx });
            sectionIdx++;
          }
        });

        return { theory: theory, exercises: exercises };
      }

      return null;
    },

    _ensureCourseUnitMeta: async function(level, items) {
      var list = items || [];
      if (!list.length) return;

      if (BentoGrid._courseUnitMetaLevel !== level) {
        BentoGrid._courseUnitMeta = {};
        BentoGrid._courseUnitMetaLevel = level;
      }

      var pendingItems = list.filter(function(item) {
        return item &&
          item.status === 'available' &&
          item.file &&
          (item.type === 'grammar' || item.type === 'vocabulary') &&
          !BentoGrid._courseUnitMeta[item.id];
      });

      if (!pendingItems.length) return;

      await Promise.all(pendingItems.map(async function(item) {
        try {
          var response = await fetch('data/Course/' + level + '/' + item.file);
          if (!response.ok) return;
          var unitData = await response.json();
          BentoGrid._courseUnitMeta[item.id] = BentoGrid._extractCourseUnitMeta(unitData);
        } catch (e) {
          console.warn('Could not preload course unit metadata for', item.id, e);
        }
      }));
    },

    _getCourseExerciseLabel: function(idx) {
      var n = idx + 1;
      var label = '';
      while (n > 0) {
        var rem = (n - 1) % 26;
        label = String.fromCharCode(65 + rem) + label;
        n = Math.floor((n - 1) / 26);
      }
      return label;
    },

    _trackReviewItem: function(unitId, sectionIdx, pts) {
      var level = BentoGrid._courseLevel || 'C1';
      try {
        var key = 'cambridge_review_answers_' + level;
        var data = JSON.parse(localStorage.getItem(key) || '{}');
        var skey = unitId + '_' + sectionIdx;
        data[skey] = pts;
        localStorage.setItem(key, JSON.stringify(data));
      } catch(e) {}
    },

    // ── Course Exercise Answer Persistence (non-review sections) ─────────────
    _cuExStateKey: function(level) {
      return 'course_ex_state_' + (level || BentoGrid._courseLevel || 'C1');
    },

    // Save the current (draft) answers of an exercise section to localStorage.
    // Skipped when restoring answers from storage to avoid circular saves.
    _saveCuExSectionState: function(sec) {
      if (BentoGrid._isRestoringCuAnswers) return;
      if (!sec || !sec.classList.contains('cu-exercise')) return;
      // Don't save while "Show answers" is active — those values were filled by the app, not the user
      if (sec.getAttribute('data-answers-showing') === 'true') return;
      var unitId = BentoGrid._currentUnitId;
      if (!unitId) return;
      var sectionIdx = parseInt((sec.id || '').replace('cu-sec-', ''));
      if (isNaN(sectionIdx)) return;
      var level = BentoGrid._courseLevel || 'C1';
      try {
        var key = BentoGrid._cuExStateKey(level);
        var state = JSON.parse(localStorage.getItem(key) || '{}');
        var skey = unitId + '_' + sectionIdx;
        // Don't overwrite a checked state with a plain draft save
        if ((state[skey] || {}).checked) return;
        state[skey] = { answers: BentoGrid._getReviewSectionAnswers(sec) };
        localStorage.setItem(key, JSON.stringify(state));
      } catch(e) {}
    },

    // Persist the final checked result (score + answers) and push to Supabase.
    _saveCuExSectionChecked: function(unitId, sectionIdx, answers, score, total) {
      // Skip when called from programmatic restoration to avoid redundant API calls
      if (BentoGrid._isRestoringCuAnswers) return;
      var level = BentoGrid._courseLevel || 'C1';
      try {
        var key = BentoGrid._cuExStateKey(level);
        var state = JSON.parse(localStorage.getItem(key) || '{}');
        var skey = unitId + '_' + sectionIdx;
        state[skey] = { answers: answers, checked: true, score: score, total: total };
        localStorage.setItem(key, JSON.stringify(state));
      } catch(e) {}
      BentoGrid._saveCuExToSupabase(level, unitId, sectionIdx, answers, score);
    },

    _loadCuExSectionState: function(level, unitId, sectionIdx) {
      try {
        var key = BentoGrid._cuExStateKey(level);
        var state = JSON.parse(localStorage.getItem(key) || '{}');
        return state[unitId + '_' + sectionIdx] || null;
      } catch(e) { return null; }
    },

    _clearCuExSectionState: function(level, unitId, sectionIdx) {
      try {
        var key = BentoGrid._cuExStateKey(level);
        var state = JSON.parse(localStorage.getItem(key) || '{}');
        delete state[unitId + '_' + sectionIdx];
        localStorage.setItem(key, JSON.stringify(state));
      } catch(e) {}
    },

    // Upsert score + answers to Supabase user_progress table on check.
    _saveCuExToSupabase: async function(level, unitId, sectionIdx, answers, score) {
      // Skip when called during programmatic restoration to avoid redundant API calls
      if (BentoGrid._isRestoringCuAnswers) return;
      var client = window.Auth && window.Auth._client;
      var user = window.Auth && window.Auth.getUser();
      if (!client || !user) return;
      try {
        await client.from('user_progress').upsert({
          user_id: user.id,
          level: level,
          exam_id: unitId,
          section: 'ex_' + sectionIdx,
          part: 1,
          answers: answers,
          score: score,
          mode: 'course',
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,exam_id,section,part,mode' });
      } catch(e) {
        console.warn('[BentoGrid] Failed to save course exercise to Supabase:', e);
      }
    },

    // Flag used to suppress saves triggered by programmatic answer restoration.
    _isRestoringCuAnswers: false,

    // Restore saved answers (and re-check if already checked) for a section.
    _restoreCuExSectionAnswers: function(sec) {
      if (!sec || !sec.classList.contains('cu-exercise')) return;
      if (sec.classList.contains('cu-review-section')) return;
      var unitId = BentoGrid._currentUnitId;
      if (!unitId) return;
      var sectionIdx = parseInt((sec.id || '').replace('cu-sec-', ''));
      if (isNaN(sectionIdx)) return;
      var level = BentoGrid._courseLevel || 'C1';
      var saved = BentoGrid._loadCuExSectionState(level, unitId, sectionIdx);
      if (!saved || !saved.answers) return;
      // Keep the flag true for the entire restore (including re-check) to suppress
      // redundant localStorage writes and Supabase API calls.
      BentoGrid._isRestoringCuAnswers = true;
      BentoGrid._applyReviewSectionAnswers(sec, saved.answers);
      if (saved.checked) {
        BentoGrid._doCheckCuExSection(sec);
      } else {
        BentoGrid._resizeAllCuInputs(sec);
      }
      BentoGrid._isRestoringCuAnswers = false;
    },

    _saveReviewSectionState: function(sec, unitId, sectionIdx, correctItems, totalItems) {
      var level = BentoGrid._courseLevel || 'C1';
      try {
        var stateKey = 'cambridge_review_section_state_' + level;
        var stateData = JSON.parse(localStorage.getItem(stateKey) || '{}');
        var skey = unitId + '_' + sectionIdx;
        stateData[skey] = { score: correctItems, total: totalItems, answers: BentoGrid._getReviewSectionAnswers(sec) };
        localStorage.setItem(stateKey, JSON.stringify(stateData));
      } catch(e) {}
    },

    _clearReviewSectionState: function(unitId, sectionIdx) {
      var level = BentoGrid._courseLevel || 'C1';
      try {
        var key = 'cambridge_review_answers_' + level;
        var data = JSON.parse(localStorage.getItem(key) || '{}');
        var skey = unitId + '_' + sectionIdx;
        delete data[skey];
        localStorage.setItem(key, JSON.stringify(data));
        var stateKey = 'cambridge_review_section_state_' + level;
        var stateData = JSON.parse(localStorage.getItem(stateKey) || '{}');
        delete stateData[skey];
        localStorage.setItem(stateKey, JSON.stringify(stateData));
      } catch(e) {}
    },

    _getReviewSectionAnswers: function(sec) {
      var answers = {};
      var inputVals = [];
      sec.querySelectorAll('.cu-gap-input').forEach(function(inp) { inputVals.push(inp.value || ''); });
      answers.inputs = inputVals;
      // Build option state as arrays (supports both single-select and multi-select)
      var optionState = {};
      sec.querySelectorAll('.cu-option-btn').forEach(function(btn) {
        var g = btn.getAttribute('data-group');
        if (g && btn.classList.contains('cu-option-selected')) {
          if (!optionState[g]) optionState[g] = [];
          optionState[g].push(btn.textContent.trim());
        }
      });
      answers.options = optionState;
      var ynState = {};
      sec.querySelectorAll('.cu-yn-btn').forEach(function(btn) {
        var g = btn.getAttribute('data-group');
        if (g && btn.classList.contains('cu-yn-selected')) ynState[g] = btn.getAttribute('data-yn');
      });
      answers.ynButtons = ynState;
      var mcPassage = {};
      sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
        var secId = gap.getAttribute('data-sec-id') || '';
        if (secId && BentoGrid._cuMcPassageAnswers[secId]) mcPassage[secId] = Object.assign({}, BentoGrid._cuMcPassageAnswers[secId]);
      });
      answers.mcPassage = mcPassage;
      var matchExercise = sec.querySelector('.cu-match-exercise');
      if (matchExercise) {
        var savedLetters = matchExercise.getAttribute('data-student-letters');
        if (savedLetters) {
          try { answers.matchLetters = JSON.parse(savedLetters); } catch(e) {}
        }
      }
      var dragCatState = {};
      sec.querySelectorAll('.cu-drag-chip').forEach(function(chip) {
        var word = chip.getAttribute('data-word') || '';
        var zone = chip.closest('.cu-drag-zone');
        if (word) dragCatState[word] = zone ? (zone.getAttribute('data-category') || '') : '';
      });
      if (Object.keys(dragCatState).length) answers.dragCat = dragCatState;
      return answers;
    },

    _applyReviewSectionAnswers: function(sec, answers) {
      if (!answers) return;
      if (answers.inputs) {
        var inputs = sec.querySelectorAll('.cu-gap-input');
        inputs.forEach(function(inp, i) { if (answers.inputs[i] !== undefined) inp.value = answers.inputs[i]; });
      }
      if (answers.options) {
        sec.querySelectorAll('.cu-option-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (!g || answers.options[g] === undefined) return;
          var saved = answers.options[g];
          // Support both legacy string and new array format
          var selectedTexts = Array.isArray(saved) ? saved : [saved];
          if (selectedTexts.indexOf(btn.textContent.trim()) !== -1) btn.classList.add('cu-option-selected');
        });
      }
      if (answers.ynButtons) {
        sec.querySelectorAll('.cu-yn-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (g && answers.ynButtons[g] !== undefined && (btn.getAttribute('data-yn') || '') === answers.ynButtons[g]) btn.classList.add('cu-yn-selected');
        });
      }
      if (answers.mcPassage) {
        Object.keys(answers.mcPassage).forEach(function(secId) {
          BentoGrid._cuMcPassageAnswers[secId] = answers.mcPassage[secId];
          Object.keys(answers.mcPassage[secId]).forEach(function(gapNum) {
            var letter = answers.mcPassage[secId][gapNum];
            var gap = sec.querySelector('.cu-mc-passage-gap[data-gap-num="' + gapNum + '"][data-sec-id="' + secId + '"]');
            if (gap) {
              var slot = gap.querySelector('.cu-mc-passage-gap-slot');
              if (slot) {
                var qData = (BentoGrid._cuMcPassageData[secId] || {})[parseInt(gapNum)];
                var optText = '';
                if (qData) {
                  var opt = qData.options.find(function(o) { return o.charAt(0).toUpperCase() === letter; });
                  if (opt) optText = BentoGrid._getCuMcOptionText(opt);
                }
                slot.textContent = optText || letter;
                slot.className = 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled';
                gap.classList.add('cu-mc-passage-gap-answered');
              }
            }
          });
        });
      }
      if (answers.dragCat) {
        sec.querySelectorAll('.cu-drag-category-exercise').forEach(function(exEl) {
          var exId = exEl.id;
          var pool = document.getElementById(exId + '-pool');
          exEl.querySelectorAll('.cu-drag-chip').forEach(function(chip) {
            var word = chip.getAttribute('data-word') || '';
            var savedCat = answers.dragCat[word];
            if (savedCat === undefined) return;
            if (savedCat === '') {
              if (pool) pool.appendChild(chip);
            } else {
              var zones = exEl.querySelectorAll('.cu-drag-zone');
              zones.forEach(function(zone) {
                if ((zone.getAttribute('data-category') || '') === savedCat) {
                  var items = zone.querySelector('.cu-drag-zone-items');
                  if (items) items.appendChild(chip);
                }
              });
            }
          });
        });
      }
      if (answers.matchLetters && Array.isArray(answers.matchLetters)) {
        var matchExercise = sec.querySelector('.cu-match-exercise');
        if (matchExercise) {
          var rightItemsByLetter = {};
          matchExercise.querySelectorAll('.cu-match-right-item').forEach(function(item) {
            var letter = item.getAttribute('data-letter') || '';
            rightItemsByLetter[letter] = item;
          });
          var rows = matchExercise.querySelectorAll('.cu-match-row');
          rows.forEach(function(row, idx) {
            var savedLetter = answers.matchLetters[idx];
            if (savedLetter && rightItemsByLetter[savedLetter]) {
              var rightCell = row.querySelector('.cu-match-right-cell');
              if (rightCell) rightCell.appendChild(rightItemsByLetter[savedLetter]);
            }
          });
        }
      }
    },

    _restoreReviewUnit: function(unitId) {
      var level = BentoGrid._courseLevel || 'C1';
      try {
        var stateKey = 'cambridge_review_section_state_' + level;
        var stateData = JSON.parse(localStorage.getItem(stateKey) || '{}');
        document.querySelectorAll('.cu-review-section').forEach(function(sec) {
          var sectionIdx = parseInt((sec.id || '').replace('cu-sec-', ''));
          if (isNaN(sectionIdx)) return;
          var skey = unitId + '_' + sectionIdx;
          var state = stateData[skey];
          if (!state) return;
          if (state.answers) BentoGrid._applyReviewSectionAnswers(sec, state.answers);
          BentoGrid._doCheckCuExSection(sec);
        });
      } catch(e) {}
    },

    _getReviewAnswered: function(level) {
      try {
        return JSON.parse(localStorage.getItem('cambridge_review_answers_' + level) || '{}');
      } catch(e) { return {}; }
    },

    // Returns the sum of stored correct-item counts for a progress test unit,
    // or null if the test has not been started yet.
    _getPtScore: function(level, unitId) {
      var ra = BentoGrid._getReviewAnswered(level);
      var prefix = unitId + '_';
      var total = 0;
      var started = false;
      Object.keys(ra).forEach(function(k) {
        if (k.indexOf(prefix) === 0) {
          total += ra[k] || 0;
          started = true;
        }
      });
      return started ? total : null;
    },

    _renderProgressTestUnit: function(data) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      var html = '';

      // Count total answerable items across all sections
      var totalMaxItems = 0;
      (data.sections || []).forEach(function(s) {
        if (s.type === 'exercise') totalMaxItems += (s.items || []).length;
      });

      html += '<div class="cu-review-banner cu-pt-banner">' +
        '<div class="cu-review-banner-icon">' + _mi('assignment') + '</div>' +
        '<div class="cu-review-banner-body">' +
          '<div class="cu-review-banner-label">Progress Test</div>' +
          (data.unitTitle ? '<div class="cu-review-banner-title">' + self._escapeHTML(data.unitTitle) + '</div>' : '') +
          (data.totalPoints ? '<div class="cu-review-banner-covers">' + _mi('grade') + ' ' + data.totalPoints + ' points</div>' : '') +
        '</div>' +
        '<div class="cu-review-banner-stat">' +
          '<span class="cu-review-stat-num">' + (data.sections || []).length + '</span>' +
          '<span class="cu-review-stat-lbl">Sections</span>' +
        '</div>' +
      '</div>' +
      '<div class="cu-review-total-score" id="cu-review-total-score" style="display:none">' +
        '<span class="material-symbols-outlined">star</span>' +
        '<span class="cu-review-total-label">Total:</span>' +
        '<span class="cu-review-total-val" id="cu-review-total-val">0</span>' +
        '<span class="cu-review-total-max">/ ' + totalMaxItems + '</span>' +
        '<span class="cu-review-total-pct" id="cu-review-total-pct"></span>' +
      '</div>';

      (data.sections || []).forEach(function(section, sectionIdx) {
        if (section.type === 'exercise') {
          var rvSecId = 'cu-sec-' + sectionIdx;
          var rvItems = section.items || [];
          html += '<div class="cu-section cu-exercise cu-review-section" id="' + rvSecId + '" data-max-items="' + rvItems.length + '">' +
            '<div class="cu-section-title">' + _mi('assignment') + ' ' + self._escapeHTML(section.title) + '</div>';
          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }
          if (section.scoring && section.scoring.maxScore) {
            html += '<div class="cu-pt-scoring-info">' + _mi('grade') + ' ' + section.scoring.maxScore + ' points' +
              (section.scoring.pointsPerItem && section.scoring.pointsPerItem !== 1
                ? ' (' + section.scoring.pointsPerItem + ' pts per item)'
                : '') +
            '</div>';
          }
          html += '<div class="cu-ex-items">';
          var hasInteractiveRv = rvItems.some(function(it) { return self._itemHasInteractive(it); });
          html += self._renderCuExItemsList(rvItems, 'pt-' + sectionIdx + '-' + section.title.replace(/\W+/g, ''), rvSecId);
          html += '</div>';
          if (hasInteractiveRv) html += self._renderCuExFooter(rvSecId);
          html += '</div>';
        }
      });

      return html || '<div class="fe-error">No content available.</div>';
    },

    // ── Course Overview (all blocks roadmap) ─────────────────────────────
    _renderCourseOverview: function() {
      var self = this;
      var level = BentoGrid._courseLevel || 'C1';
      var blocks = BentoGrid._courseBlocks || {};
      var blockOrder = BentoGrid._courseBlockOrder || [];
      var progress = BentoGrid._getCourseProgress(level);
      var indexData = BentoGrid._courseIndexData || {};

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      // Compute overall progress stats
      var totalAvailable = 0, totalDone = 0;
      (indexData.items || []).forEach(function(item) {
        if (item.status === 'available') {
          totalAvailable++;
          if (progress[item.id]) totalDone++;
        }
      });
      var overallPct = totalAvailable > 0 ? Math.round((totalDone / totalAvailable) * 100) : 0;

      var html = '<div class="cu-overview-container">';

      // Overall progress bar at top
      html += '<div class="cu-overview-progress-bar-wrap">' +
        '<div class="cu-overview-progress-header">' +
          '<span class="cu-overview-progress-label">' + _mi('school') + ' Overall Progress</span>' +
          '<span class="cu-overview-progress-pct">' + overallPct + '%</span>' +
        '</div>' +
        '<div class="cu-overview-progress-track">' +
          '<div class="cu-overview-progress-fill" style="width:' + overallPct + '%"></div>' +
        '</div>' +
        '<div class="cu-overview-progress-sub">' + totalDone + ' of ' + totalAvailable + ' units completed</div>' +
      '</div>';

      // Block cards grid
      html += '<div class="cu-blocks-grid">';

      blockOrder.forEach(function(bk) {
        var items = blocks[bk] || [];
        var hasAvailable = items.some(function(i) { return i.status === 'available'; });
        var availableItems = items.filter(function(i) { return i.status === 'available'; });
        var doneCount = availableItems.filter(function(i) { return !!progress[i.id]; }).length;
        var blockPct = availableItems.length > 0 ? Math.round((doneCount / availableItems.length) * 100) : 0;
        var isFullyDone = hasAvailable && doneCount === availableItems.length;

        // Separate units from review and progress test
        var unitItems = items.filter(function(i) { return i.type === 'grammar' || i.type === 'vocabulary'; });
        var reviewItem = items.find(function(i) { return i.type === 'review'; });
        var progressTestItem = items.find(function(i) { return i.type === 'progress_test'; });

        // Progress test blocks: render as full-width card
        if (progressTestItem) {
          var isPtAvail = progressTestItem.status === 'available';
          var isPtDone = !!progress[progressTestItem.id];
          var ptPath = 'data/Course/' + level + '/' + progressTestItem.file;
          var ptScore = BentoGrid._getPtScore(level, progressTestItem.id);
          var ptTotal = progressTestItem.totalPoints || 100;
          var ptClass = 'cu-pt-overview-card' + (isPtDone ? ' cu-pt-card-done' : (isPtAvail ? ' cu-pt-card-available' : ' cu-pt-card-locked'));
          var ptClickAttr = isPtAvail ? ' onclick="BentoGrid.openCourseUnit(\'' + progressTestItem.id + '\',\'' + ptPath + '\')" style="cursor:pointer"' : '';
          html += '<div class="' + ptClass + '"' + ptClickAttr + '>';
          html += '<div class="cu-pt-ov-icon">' + _mi('assignment') + '</div>';
          html += '<div class="cu-pt-ov-body">';
          html += '<div class="cu-pt-ov-label">Progress Test</div>';
          html += '<div class="cu-pt-ov-title">' + self._escapeHTML(progressTestItem.title) + '</div>';
          if (ptScore !== null) {
            html += '<div class="cu-pt-ov-score">' + _mi('stars') + ' ' + ptScore + ' / ' + ptTotal + ' pts</div>';
          } else if (isPtAvail) {
            html += '<div class="cu-pt-ov-cta">' + _mi('play_arrow') + ' Take the Test</div>';
          }
          html += '</div>';
          if (isPtDone) html += '<div class="cu-pt-ov-check">' + _mi('check_circle') + '</div>';
          else if (!isPtAvail) html += '<div class="cu-pt-ov-lock">' + _mi('lock') + ' Coming Soon</div>';
          html += '</div>'; // .cu-pt-overview-card
          return;
        }

        var blockClass = 'cu-block-card';
        if (!hasAvailable) blockClass += ' cu-block-card-locked';
        else if (isFullyDone) blockClass += ' cu-block-card-done';
        else if (doneCount > 0) blockClass += ' cu-block-card-in-progress';
        else blockClass += ' cu-block-card-available';

        html += '<div class="' + blockClass + '">';

        // Block header
        var badgeHtml = '';
        if (!hasAvailable) {
          badgeHtml = '<span class="cu-block-badge cu-badge-locked">' + _mi('lock') + ' Coming Soon</span>';
        } else if (isFullyDone) {
          badgeHtml = '<span class="cu-block-badge cu-badge-done">' + _mi('check_circle') + ' Completed</span>';
        } else if (doneCount > 0) {
          badgeHtml = '<span class="cu-block-badge cu-badge-progress">In Progress</span>';
        } else {
          badgeHtml = '<span class="cu-block-badge cu-badge-available">Available</span>';
        }

        var headerOnClick = hasAvailable ? ' onclick="BentoGrid._selectCourseBlock(\'' + bk + '\')" style="cursor:pointer"' : '';
        var resetBlockOverviewBtn = (hasAvailable && doneCount > 0)
          ? '<button class="cu-reset-btn cu-reset-btn-sm" onclick="event.stopPropagation();BentoGrid._resetCourseBlock(\'' + bk + '\')" title="Restart block">' + _mi('restart_alt') + '</button>'
          : '';
        html += '<div class="cu-block-card-header"' + headerOnClick + '>' +
          '<span class="cu-block-num">' + self._escapeHTML(BentoGrid._getBlockLabel(bk)) + '</span>' +
          badgeHtml +
          resetBlockOverviewBtn +
        '</div>';

        // Unit rows
        html += '<div class="cu-block-units">';
        unitItems.forEach(function(item) {
          var isDone = !!progress[item.id];
          var isAvail = item.status === 'available';
          var typeIcon = item.type === 'grammar' ? 'menu_book' : 'translate';
          var typeColor = item.type === 'grammar' ? '#3b82f6' : '#10b981';
          var shortTitle = item.title;
          var colonIdx = shortTitle.indexOf(':');
          if (colonIdx !== -1) shortTitle = shortTitle.slice(colonIdx + 1).trim();

          if (isAvail) {
            var resetUnitOverviewBtn = isDone
              ? '<button class="cu-reset-btn cu-reset-btn-sm" onclick="event.stopPropagation();BentoGrid._resetCourseUnit(\'' + item.id + '\')" title="Restart unit">' + _mi('restart_alt') + '</button>'
              : '';
            html += '<div class="cu-block-unit-row cu-block-unit-available" onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'data/Course/' + level + '/' + item.file + '\')">' +
              '<span class="cu-bur-icon" style="color:' + typeColor + '">' + _mi(typeIcon) + '</span>' +
              '<span class="cu-bur-text">' + self._escapeHTML(shortTitle) + '</span>' +
              (isDone ? '<span class="cu-bur-done">' + _mi('check_circle') + '</span>' : '<span class="cu-bur-arrow">' + _mi('chevron_right') + '</span>') +
              resetUnitOverviewBtn +
            '</div>';
          } else {
            html += '<div class="cu-block-unit-row cu-block-unit-locked">' +
              '<span class="cu-bur-icon">' + _mi('lock') + '</span>' +
              '<span class="cu-bur-text">' + self._escapeHTML(shortTitle) + '</span>' +
            '</div>';
          }
        });
        html += '</div>';

        // Review row
        if (reviewItem) {
          var reviewDone = !!progress[reviewItem.id];
          var reviewAvail = reviewItem.status === 'available';
          if (reviewAvail) {
            var reviewLabel = unitItems.length >= 2
              ? 'Review — Units ' + unitItems[0].unit + ' & ' + unitItems[1].unit
              : (unitItems.length === 1 ? 'Review — Unit ' + unitItems[0].unit : 'Review');
            html += '<div class="cu-block-review-row cu-block-review-available" onclick="BentoGrid.openCourseUnit(\'' + reviewItem.id + '\',\'data/Course/' + level + '/' + reviewItem.file + '\')">' +
              '<span class="cu-brr-icon">' + _mi('quiz') + '</span>' +
              '<span class="cu-brr-text">' + self._escapeHTML(reviewLabel) + '</span>' +
              (reviewDone ? '<span class="cu-brr-done">' + _mi('check_circle') + '</span>' : '<span class="cu-brr-badge">Start</span>') +
            '</div>';
          } else {
            html += '<div class="cu-block-review-row cu-block-review-locked">' +
              '<span class="cu-brr-icon">' + _mi('quiz') + '</span>' +
              '<span class="cu-brr-text">Review</span>' +
              '<span class="cu-brr-badge cu-brr-badge-locked">Locked</span>' +
            '</div>';
          }
        }

        // Progress bar at bottom
        if (hasAvailable) {
          html += '<div class="cu-block-progress-wrap">' +
            '<div class="cu-block-progress-track">' +
              '<div class="cu-block-progress-fill" style="width:' + blockPct + '%"></div>' +
            '</div>' +
            '<span class="cu-block-progress-label">' + blockPct + '%</span>' +
          '</div>';
        }

        html += '</div>'; // .cu-block-card
      });

      html += '</div>'; // .cu-blocks-grid
      html += '</div>'; // .cu-overview-container
      return html;
    },

    // ── Course Navigation Sidebar (left) ─────────────────────────────────
    _buildCourseNavSidebarHtml: function(indexData, level, activeItemId) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      var progress = BentoGrid._getCourseProgress(level);

      var html = '<div class="course-nav-sidebar">';
      html += '<div class="course-nav-header">' +
        '<div class="course-nav-title">' + _mi('auto_stories') + ' Course</div>' +
      '</div>';

      if (!indexData || !indexData.items) {
        html += '<div class="course-nav-empty">No course data available.</div>';
        html += '</div>';
        return html;
      }

      // Group items by block
      var blocks = {};
      var blockOrder = [];
      indexData.items.forEach(function(item) {
        var bk = item.block != null ? String(item.block) : 'misc';
        if (!blocks[bk]) { blocks[bk] = []; blockOrder.push(bk); }
        blocks[bk].push(item);
      });

      html += '<div class="course-nav-blocks">';

      blockOrder.forEach(function(bk) {
        var items = blocks[bk] || [];
        var hasAvailable = items.some(function(i) { return i.status === 'available'; });
        var hasActive = items.some(function(i) { return i.id === activeItemId; });
        var isOpen = false;
        var label = BentoGrid._getBlockLabel(bk);
        var availItems = items.filter(function(i) { return i.status === 'available'; });
        var doneItems = availItems.filter(function(i) { return !!progress[i.id]; });
        var blockPct = availItems.length > 0 ? Math.round((doneItems.length / availItems.length) * 100) : 0;

        html += '<div class="course-nav-block" id="cnb-' + bk + '">';

        if (!hasAvailable) {
          html += '<div class="course-nav-block-hdr cnb-locked">' +
            '<span class="cnb-lock-icon">' + _mi('lock') + '</span>' +
            '<span class="cnb-label">' + label + '</span>' +
          '</div>';
        } else {
          html += '<div class="course-nav-block-hdr cnb-available' + (hasActive ? ' cnb-has-active' : '') + '" ' +
            'onclick="BentoGrid._toggleCourseNavBlock(\'' + bk + '\')">' +
            '<span class="cnb-label">' + label + '</span>' +
            (blockPct > 0 ? '<span class="cnb-pct">' + blockPct + '%</span>' : '') +
            '<span class="material-symbols-outlined cnb-arrow">' + (isOpen ? 'expand_less' : 'expand_more') + '</span>' +
          '</div>';

          html += '<div class="course-nav-items" id="cni-' + bk + '" style="display:' + (isOpen ? 'flex' : 'none') + '">';

          items.forEach(function(item) {
            var typeIcon = item.type === 'grammar' ? 'menu_book' :
                           item.type === 'vocabulary' ? 'translate' :
                           item.type === 'review' ? 'quiz' :
                           item.type === 'progress_test' ? 'assignment' : 'school';
            var isActive = item.id === activeItemId;
            var isAvail = item.status === 'available';
            var isDone = !!progress[item.id];

            // Shorten display title
            var shortTitle = item.title;
            if (item.type === 'grammar' || item.type === 'vocabulary') {
              var colonIdx = shortTitle.indexOf(':');
              if (colonIdx !== -1) shortTitle = shortTitle.slice(colonIdx + 1).trim();
            } else if (item.type === 'review') {
              var dashIdx = shortTitle.indexOf('—');
              if (dashIdx !== -1) shortTitle = shortTitle.slice(0, dashIdx).trim();
            }

            if (isAvail) {
              html += '<div class="course-nav-item cni-available' + (isActive ? ' cni-active' : '') + (isDone ? ' cni-done' : '') + '" ' +
                'onclick="BentoGrid.openCourseUnit(\'' + item.id + '\', \'data/Course/' + level + '/' + item.file + '\')">' +
                '<span class="cni-icon">' + _mi(typeIcon) + '</span>' +
                '<span class="cni-text">' + self._escapeHTML(shortTitle) + '</span>' +
                (isDone ? '<span class="cni-check">' + _mi('check_circle') + '</span>' : '') +
              '</div>';
            } else {
              html += '<div class="course-nav-item cni-locked">' +
                '<span class="cni-icon">' + _mi('lock') + '</span>' +
                '<span class="cni-text">' + self._escapeHTML(shortTitle) + '</span>' +
              '</div>';
            }
          });

          html += '</div>'; // .course-nav-items
        }

        html += '</div>'; // .course-nav-block
      });

      html += '</div>'; // .course-nav-blocks
      html += '</div>'; // .course-nav-sidebar
      return html;
    },

    _toggleCourseNavBlock: function(bk) {
      var items = document.getElementById('cni-' + bk);
      var arrow = document.querySelector('#cnb-' + bk + ' .cnb-arrow');
      if (!items) return;
      var isOpen = items.style.display !== 'none';
      items.style.display = isOpen ? 'none' : 'flex';
      if (arrow) arrow.textContent = isOpen ? 'expand_more' : 'expand_less';
    },

    _toggleCrmGroup: function(itemId) {
      var items = document.getElementById('crm-group-items-' + itemId);
      var arrow = document.getElementById('crm-arrow-' + itemId);
      if (!items) return;
      var isOpen = items.style.display !== 'none';
      items.style.display = isOpen ? 'none' : '';
      if (arrow) arrow.textContent = isOpen ? 'expand_more' : 'expand_less';
    },

    // ── Course Learning Roadmap Sidebar (right) ───────────────────────────
    _buildCourseRoadmapSidebarHtml: function(unitData, unitId) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      if (!unitData) return '';

      var level = BentoGrid._courseLevel || 'C1';
      var html = '<div class="course-roadmap-widget">';
      html += '<div class="course-roadmap-heading">' + _mi('map') + ' Learning Roadmap</div>';

      // Find block context
      var blockKey = null;
      var blockItems = [];
      if (unitId && BentoGrid._courseIndexData) {
        var foundItem = (BentoGrid._courseIndexData.items || []).find(function(i) { return i.id === unitId; });
        if (foundItem && foundItem.block != null) {
          blockKey = String(foundItem.block);
          blockItems = (BentoGrid._courseBlocks || {})[blockKey] || [];
        }
      }

      if (blockItems.length === 0) {
        // Fallback: flat list for the current unit
        if (unitData.unitTitle) {
          html += '<div class="course-roadmap-unit-title">' + self._escapeHTML(unitData.unitTitle) + '</div>';
        }
        html += self._buildCrmSectionItems(unitData, 0);
        html += '</div>';
        return html;
      }

      html += '<div class="crm-block-label">Block ' + self._escapeHTML(blockKey) + '</div>';

      blockItems.forEach(function(item) {
        var isCurrent = item.id === unitId;
        var typeIcon = item.type === 'grammar' ? 'menu_book' :
                       item.type === 'vocabulary' ? 'translate' :
                       item.type === 'review' ? 'quiz' :
                       item.type === 'progress_test' ? 'assignment' : 'school';
        var itemPath = 'data/Course/' + level + '/' + item.file;
        var shortTitle = item.title;
        var colonIdx = shortTitle.indexOf(':');
        if (colonIdx !== -1 && item.type !== 'review') shortTitle = shortTitle.slice(colonIdx + 1).trim();
        var isAvail = item.status === 'available';

        if (isCurrent) {
          html += '<div class="crm-group crm-group-open">';
          html += '<div class="crm-group-hdr crm-current-hdr" onclick="BentoGrid._toggleCrmGroup(\'' + item.id + '\')">' +
            '<span class="crm-group-icon">' + _mi(typeIcon) + '</span>' +
            '<span class="crm-group-title">' + self._escapeHTML(shortTitle) + '</span>' +
            '<span class="material-symbols-outlined crm-group-arrow" id="crm-arrow-' + item.id + '">expand_less</span>' +
          '</div>';
          html += '<div class="crm-group-items" id="crm-group-items-' + item.id + '">';
          html += self._buildCrmSectionItems(unitData, 0);
          html += '</div>';
          html += '</div>';
        } else if (isAvail) {
          html += '<div class="crm-group">';
          html += '<button class="crm-group-hdr crm-other-hdr" onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'' + itemPath + '\')">' +
            '<span class="crm-group-icon">' + _mi(typeIcon) + '</span>' +
            '<span class="crm-group-title">' + self._escapeHTML(shortTitle) + '</span>' +
            '<span class="material-symbols-outlined crm-group-arrow">chevron_right</span>' +
          '</button>';
          html += '</div>';
        }
      });

      html += '</div>'; // .course-roadmap-widget
      return html;
    },

    _buildCrmSectionItems: function(unitData, startIndex) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      var html = '';
      var idx = startIndex;

      if (unitData.type === 'grammar') {
        (unitData.sections || []).forEach(function(sec, i) {
          var isTheory = sec.type === 'theory';
          var icon = isTheory ? 'menu_book' : 'edit_note';
          var cls = isTheory ? 'crm-theory' : 'crm-exercise';
          html += '<button class="course-roadmap-item ' + cls + '" id="crm-item-' + i + '" onclick="BentoGrid._scrollToCuSection(' + i + ')">' +
            '<span class="crm-icon">' + _mi(icon) + '</span>' +
            '<span class="crm-text">' + self._escapeHTML(sec.title || '') + '</span>' +
          '</button>';
        });
      } else if (unitData.type === 'vocabulary') {
        var secs = unitData.sections || {};
        var vocabMap = [
          { key: 'topic_vocabulary', icon: 'translate', label: 'Topic Vocabulary' },
          { key: 'phrasal_verbs', icon: 'format_list_bulleted', label: 'Phrasal Verbs' },
          { key: 'collocations_patterns', icon: 'link', label: 'Collocations & Patterns' },
          { key: 'idioms', icon: 'lightbulb', label: 'Idioms' },
          { key: 'word_formation', icon: 'spellcheck', label: 'Word Formation' }
        ];
        var sectionIndex = 0;
        vocabMap.forEach(function(vs) {
          var hasContent = secs[vs.key] && (
            Array.isArray(secs[vs.key]) ? secs[vs.key].length > 0 : Object.keys(secs[vs.key]).length > 0
          );
          if (hasContent) {
            var i = sectionIndex++;
            html += '<button class="course-roadmap-item crm-vocab" id="crm-item-' + i + '" onclick="BentoGrid._scrollToCuSection(' + i + ')">' +
              '<span class="crm-icon">' + _mi(vs.icon) + '</span>' +
              '<span class="crm-text">' + vs.label + '</span>' +
            '</button>';
          }
        });
        // Each exercise letter as its own roadmap item
        if (secs.exercises && Object.keys(secs.exercises).length > 0) {
          Object.keys(secs.exercises).forEach(function(exKey) {
            var ex = secs.exercises[exKey];
            var i = sectionIndex++;
            html += '<button class="course-roadmap-item crm-exercise" id="crm-item-' + i + '" onclick="BentoGrid._scrollToCuSection(' + i + ')">' +
              '<span class="crm-icon">' + _mi('edit_note') + '</span>' +
              '<span class="crm-text">Exercise ' + self._escapeHTML(exKey) + ': ' + self._escapeHTML(ex.title || '') + '</span>' +
            '</button>';
          });
        }
      } else if (unitData.type === 'review' || unitData.type === 'progress_test') {
        var sectionIcon = unitData.type === 'progress_test' ? 'assignment' : 'quiz';
        (unitData.sections || []).forEach(function(sec, i) {
          html += '<button class="course-roadmap-item crm-exercise" id="crm-item-' + i + '" onclick="BentoGrid._scrollToCuSection(' + i + ')">' +
            '<span class="crm-icon">' + _mi(sectionIcon) + '</span>' +
            '<span class="crm-text">' + self._escapeHTML(sec.title || '') + '</span>' +
          '</button>';
        });
      }
      return html;
    },

    _scrollToCuSection: function(idx) {
      BentoGrid._showCuSection(idx);
    },

    _initCuSectionNav: function(startIdx) {
      var container = document.querySelector('.course-unit-content');
      if (!container) return;
      var sections = container.querySelectorAll('.cu-section');
      var total = sections.length;
      if (total === 0) return;

      startIdx = Math.max(0, Math.min(startIdx, total - 1));

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      // Build dots navigation bar above all sections
      var dotsHtml = '<div class="cu-dots-nav" id="cu-dots-nav">';
      var theoryDotCount = 0;
      var vocabDotCount = 0;
      var exerciseDotCount = 0;
      for (var d = 0; d < total; d++) {
        var sec = sections[d];
        var isTheory = sec.classList.contains('cu-theory');
        var isVocab = sec.classList.contains('cu-vocab');
        var dotTypeClass = isTheory ? 'cu-dot-theory' : (isVocab ? 'cu-dot-vocab' : 'cu-dot-exercise');
        var activeClass = d === startIdx ? ' cu-dot-active' : '';
        var titleEl = sec.querySelector('.cu-section-title');
        var titleText = titleEl ? titleEl.textContent.trim().replace(/"/g, '&quot;') : String(d + 1);
        var dotLabel = isTheory ? String(++theoryDotCount) : (isVocab ? String(++vocabDotCount) : String.fromCharCode(65 + exerciseDotCount++));
        dotsHtml += '<button class="cu-dot-nav ' + dotTypeClass + activeClass + '" ' +
          'onclick="BentoGrid._showCuSection(' + d + ')" ' +
          'title="' + titleText + '">' + dotLabel + '</button>';
      }
      dotsHtml += '</div>';
      container.insertAdjacentHTML('afterbegin', dotsHtml);

      sections.forEach(function(sec, idx) {
        sec.style.display = (idx === startIdx) ? '' : 'none';

        var isTheorySec = sec.classList.contains('cu-theory');
        var navHtml = '<div class="cu-section-nav">';
        if (idx > 0) {
          navHtml += '<button class="cu-nav-btn cu-nav-prev" onclick="BentoGrid._showCuSection(' + (idx - 1) + ')">' +
            _mi('arrow_back') + ' Previous</button>';
        } else {
          navHtml += '<span></span>';
        }

        // Middle: "Entendido" button for theory sections
        if (isTheorySec) {
          navHtml += '<button class="cu-entendido-btn" onclick="BentoGrid._markCuTheoryDone(' + idx + ',' + total + ')">' +
            _mi('check_circle') + ' Entendido</button>';
        } else {
          navHtml += '<span></span>';
        }

        if (idx < total - 1) {
          if (isTheorySec) {
            // Next on theory also marks as done
            navHtml += '<button class="cu-nav-btn cu-nav-next" onclick="BentoGrid._markCuTheoryDone(' + idx + ',' + total + ',true,' + (idx + 1) + ')">' +
              'Next ' + _mi('arrow_forward') + '</button>';
          } else {
            navHtml += '<button class="cu-nav-btn cu-nav-next" onclick="BentoGrid._showCuSection(' + (idx + 1) + ')">' +
              'Next ' + _mi('arrow_forward') + '</button>';
          }
        } else {
          navHtml += '<span></span>';
        }
        navHtml += '</div>';
        sec.insertAdjacentHTML('beforeend', navHtml);
      });

      // Only auto-mark if starting section is an exercise (not theory)
      var startSec = sections[startIdx];
      var _initLevel = BentoGrid._courseLevel || 'C1';
      var _initUnitId = BentoGrid._currentUnitId;
      BentoGrid._markCourseSectionOpened(_initLevel, _initUnitId, startIdx);
      if (startSec && startSec.classList.contains('cu-review-section')) {
        BentoGrid._markCourseSectionVisited(_initLevel, _initUnitId, startIdx);
        BentoGrid._checkCourseUnitAllDone(_initLevel, _initUnitId);
      }
      BentoGrid._updateRoadmapActiveItem(startIdx);
      // Restore saved answers (and re-check if already checked) for the initial section
      if (startSec && startSec.classList.contains('cu-exercise') && !startSec.classList.contains('cu-review-section')) {
        BentoGrid._restoreCuExSectionAnswers(startSec);
      } else {
        // Resize inputs in the initial section (restore already calls resize internally)
        if (startSec) BentoGrid._resizeAllCuInputs(startSec);
      }
    },

    _showCuSection: function(idx) {
      // Close the options modal whenever the user navigates to another section
      if (window.Modal) Modal.closeOptionsModal();
      var container = document.querySelector('.course-unit-content');
      if (!container) return;
      var sections = container.querySelectorAll('.cu-section');
      sections.forEach(function(sec, i) {
        sec.style.display = (i === idx) ? '' : 'none';
      });
      // Sync active dot
      var dots = container.querySelectorAll('.cu-dot-nav');
      dots.forEach(function(dot, i) {
        dot.classList.toggle('cu-dot-active', i === idx);
      });
      var center = document.querySelector('.dashboard-center');
      if (center) center.scrollTop = 0;
      // Mark the section as opened (in progress); review sections are auto-done when visited
      var targetSec = sections[idx];
      var _cuLevel = BentoGrid._courseLevel || 'C1';
      var _cuUnitId = BentoGrid._currentUnitId;
      BentoGrid._markCourseSectionOpened(_cuLevel, _cuUnitId, idx);
      if (targetSec && targetSec.classList.contains('cu-review-section')) {
        BentoGrid._markCourseSectionVisited(_cuLevel, _cuUnitId, idx);
        BentoGrid._checkCourseUnitAllDone(_cuLevel, _cuUnitId);
      }
      BentoGrid._updateRoadmapActiveItem(idx);
      // Restore saved answers (and re-check if already checked) for exercise sections
      if (targetSec && targetSec.classList.contains('cu-exercise') && !targetSec.classList.contains('cu-review-section')) {
        BentoGrid._restoreCuExSectionAnswers(targetSec);
      } else {
        // Resize inputs in the newly visible section (restore already calls resize internally)
        if (targetSec) BentoGrid._resizeAllCuInputs(targetSec);
      }
      // Update URL to reflect the current section
      if (BentoGrid._currentUnitId && BentoGrid._currentBlockKey && BentoGrid._currentUnitFilePath) {
        var secState = { view: 'courseUnit', blockKey: BentoGrid._currentBlockKey, unitId: BentoGrid._currentUnitId, filePath: BentoGrid._currentUnitFilePath, sectionIdx: idx };
        history.replaceState(secState, '', Router.stateToPath(secState));
      }
    },

    _markCuTheoryDone: function(idx, total, goNext, nextIdx) {
      var level = BentoGrid._courseLevel || 'C1';
      var unitId = BentoGrid._currentUnitId;
      BentoGrid._markCourseSectionVisited(level, unitId, idx);
      BentoGrid._checkCourseUnitAllDone(level, unitId);
      // Update dot visual for this section
      var container = document.querySelector('.course-unit-content');
      if (container) {
        var dots = container.querySelectorAll('.cu-dot-nav');
        if (dots[idx]) dots[idx].classList.add('cu-dot-done-mark');
      }
      if (goNext && typeof nextIdx === 'number' && nextIdx < total) {
        BentoGrid._showCuSection(nextIdx);
      }
    },

    _checkCuExSection: function(sectionId) {
      var sec = document.getElementById(sectionId);
      if (!sec) return;

      // Close the options modal when the user checks the section
      if (window.Modal) Modal.closeOptionsModal();

      // Prevent checking while "Show answers" is active
      if (sec.getAttribute('data-answers-showing') === 'true') return;

      // Detect unanswered questions (empty inputs with no option/yn-btn selected)
      var unanswered = [];
      // MC passage gaps count separately
      var mcPassageGaps = sec.querySelectorAll('.cu-mc-passage-gap');
      if (mcPassageGaps.length > 0) {
        mcPassageGaps.forEach(function(gap, idx) {
          var gapNum = parseInt(gap.getAttribute('data-gap-num') || String(idx + 1));
          var secId = gap.getAttribute('data-sec-id') || '';
          var given = ((BentoGrid._cuMcPassageAnswers[secId] || {})[gapNum] || '').trim();
          if (given === '') unanswered.push(gapNum);
        });
      }
      sec.querySelectorAll('.cu-ex-item').forEach(function(item, idx) {
        var inputs = item.querySelectorAll('.cu-gap-input');
        var optGroups = {};
        item.querySelectorAll('.cu-option-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (g) { if (!optGroups[g]) optGroups[g] = []; optGroups[g].push(btn); }
        });
        var ynGroups = {};
        item.querySelectorAll('.cu-yn-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (g) { if (!ynGroups[g]) ynGroups[g] = []; ynGroups[g].push(btn); }
        });
        var isEmpty = true;
        inputs.forEach(function(inp) { if ((inp.value || '').trim() !== '') isEmpty = false; });
        Object.keys(optGroups).forEach(function(g) {
          if (optGroups[g].some(function(b) { return b.classList.contains('cu-option-selected'); })) isEmpty = false;
        });
        Object.keys(ynGroups).forEach(function(g) {
          if (ynGroups[g].some(function(b) { return b.classList.contains('cu-yn-selected'); })) isEmpty = false;
        });
        var hasAnyInput = inputs.length > 0 || Object.keys(optGroups).length > 0 || Object.keys(ynGroups).length > 0;
        if (!hasAnyInput) isEmpty = false;
        if (isEmpty) unanswered.push(idx + 1);
      });

      if (unanswered.length > 0) {
        var msg = 'Questions ' + unanswered.join(', ') + (unanswered.length === 1 ? ' has' : ' have') + ' not been answered. Check anyway?';
        BentoGrid._cuConfirm(msg, function() { BentoGrid._doCheckCuExSection(sec); });
        return;
      }

      BentoGrid._doCheckCuExSection(sec);
    },

    // Returns option group keys sorted by their _oN DOM-order suffix
    _sortedOptGroupKeys: function(optGroups) {
      return Object.keys(optGroups).sort(function(a, b) {
        var ai = parseInt((a.match(/_o(\d+)$/) || ['', '0'])[1]);
        var bi = parseInt((b.match(/_o(\d+)$/) || ['', '0'])[1]);
        return ai - bi;
      });
    },

    // Normalises curly/smart quotes to straight equivalents for comparison
    _normalizeText: function(s) {
      return (s || '').replace(/[\u2018\u2019\u201a\u201b]/g, "'").replace(/[\u201c\u201d\u201e\u201f]/g, '"');
    },

    // Splits an answer part by '/' and returns trimmed lowercase alternatives (quotes normalised)
    _answerAlts: function(answerPart) {
      return BentoGrid._normalizeText((answerPart || '').trim()).split(/\s*\/\s*/).map(function(a) { return BentoGrid._normalizeText(a.trim().toLowerCase()); }).filter(Boolean);
    },

    _doCheckCuExSection: function(sec) {
      var totalItems = 0;
      var correctItems = 0;
      var hasMcPassage = false;
      // Handle MC passage exercises (multiple-choice cloze, e.g. Exercise D)
      sec.querySelectorAll('.cu-mc-passage-exercise').forEach(function(mcPassage) {
        hasMcPassage = true;
        mcPassage.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
          totalItems++;
          var gapNum = parseInt(gap.getAttribute('data-gap-num') || '0');
          var secId = gap.getAttribute('data-sec-id') || '';
          var expected = (gap.getAttribute('data-answer') || '').trim().toUpperCase();
          var given = ((BentoGrid._cuMcPassageAnswers[secId] || {})[gapNum] || '').trim().toUpperCase();
          var ok = given !== '' && given === expected;

          // Resolve option texts for view toggling
          var qData = (BentoGrid._cuMcPassageData[secId] || {})[gapNum];
          var correctOpt = qData ? qData.options.find(function(o) { return o.charAt(0).toUpperCase() === expected; }) : null;
          var correctText = correctOpt ? BentoGrid._getCuMcOptionText(correctOpt) : expected;
          var studentOpt = (given && qData) ? qData.options.find(function(o) { return o.charAt(0).toUpperCase() === given; }) : null;
          var studentText = studentOpt ? BentoGrid._getCuMcOptionText(studentOpt) : '';
          gap.setAttribute('data-correct-text', correctText);
          gap.setAttribute('data-student-text', studentText);

          gap.classList.remove('cu-mc-passage-gap-correct', 'cu-mc-passage-gap-incorrect', 'cu-mc-passage-gap-show-correct');
          var slot = gap.querySelector('.cu-mc-passage-gap-slot');
          if (given !== '') {
            var checkClass = ok ? 'cu-mc-passage-gap-correct' : 'cu-mc-passage-gap-incorrect';
            gap.classList.add(checkClass);
            gap.setAttribute('data-check-class', checkClass);
          } else {
            // Unanswered: show correct answer in blue
            gap.classList.add('cu-mc-passage-gap-show-correct');
            gap.setAttribute('data-check-class', 'cu-mc-passage-gap-show-correct');
            if (slot) {
              slot.textContent = correctText;
              slot.className = 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled';
            }
          }
          gap.style.pointerEvents = 'none';
          if (ok) correctItems++;
        });
      });
      // Add view-toggle buttons for MC passage sections
      if (hasMcPassage) {
        var footer = sec.querySelector('.cu-ex-footer');
        if (footer && !footer.querySelector('.cu-mc-passage-view-btn')) {
          var yourBtn = document.createElement('button');
          yourBtn.type = 'button';
          yourBtn.className = 'cu-mc-passage-view-btn cu-mc-passage-view-active';
          yourBtn.setAttribute('data-view', 'yours');
          yourBtn.innerHTML = '<span class="material-symbols-outlined">person</span> Your answers';
          var correctViewBtn = document.createElement('button');
          correctViewBtn.type = 'button';
          correctViewBtn.className = 'cu-mc-passage-view-btn';
          correctViewBtn.setAttribute('data-view', 'correct');
          correctViewBtn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Correct answers';
          (function(capturedSec) {
            yourBtn.addEventListener('click', function() { BentoGrid._setCuMcPassageView(capturedSec, 'yours'); });
            correctViewBtn.addEventListener('click', function() { BentoGrid._setCuMcPassageView(capturedSec, 'correct'); });
          })(sec);
          footer.appendChild(yourBtn);
          footer.appendChild(correctViewBtn);
        }
      }
      // Handle passage exercises (word formation passage like Exercise O)
      sec.querySelectorAll('.cu-passage-exercise').forEach(function(passageEl) {
        passageEl.querySelectorAll('.cu-gap-input[data-passage-num]').forEach(function(input) {
          totalItems++;
          var expected = (input.getAttribute('data-answer') || '').trim().toLowerCase();
          var given = (input.value || '').trim().toLowerCase();
          var alts = expected.split(/\s*\/\s*/);
          var filled = given !== '';
          var ok = filled && alts.some(function(a) { return given === a.trim(); });
          input.classList.remove('cu-input-correct', 'cu-input-incorrect');
          if (filled) input.classList.add(ok ? 'cu-input-correct' : 'cu-input-incorrect');
          if (ok) correctItems++;
          input.disabled = true;
        });
      });
      // Handle yn-items
      sec.querySelectorAll('.cu-yn-item').forEach(function(item) {
        totalItems++;
        var answer = (item.getAttribute('data-answer') || '').trim().toUpperCase();
        var selected = item.querySelector('.cu-yn-btn.cu-yn-selected');
        var ynGroups = {};
        item.querySelectorAll('.cu-yn-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (g) { if (!ynGroups[g]) ynGroups[g] = []; ynGroups[g].push(btn); }
        });
        Object.keys(ynGroups).forEach(function(g) {
          var btns = ynGroups[g];
          btns.forEach(function(b) { b.classList.remove('cu-yn-correct', 'cu-yn-incorrect'); b.disabled = true; });
        });
        var wasCorrect = false;
        if (selected) {
          var given = (selected.getAttribute('data-yn') || '').toUpperCase();
          wasCorrect = given === answer;
          selected.classList.add(wasCorrect ? 'cu-yn-correct' : 'cu-yn-incorrect');
          if (wasCorrect) correctItems++;
        }
        // Mark the correct button whenever student was wrong or nothing was selected
        if (!wasCorrect) {
          Object.keys(ynGroups).forEach(function(g) {
            ynGroups[g].forEach(function(b) {
              if ((b.getAttribute('data-yn') || '').toUpperCase() === answer) {
                b.classList.add('cu-yn-correct-reveal');
              }
            });
          });
        }
      });
      // Handle drag-category exercises
      sec.querySelectorAll('.cu-drag-category-exercise').forEach(function(exEl) {
        exEl.querySelectorAll('.cu-drag-chip').forEach(function(chip) {
          totalItems++;
          var word = chip.getAttribute('data-word') || '';
          var expected = (chip.getAttribute('data-answer') || '').trim().toUpperCase();
          var zone = chip.closest('.cu-drag-zone');
          var given = zone ? (zone.getAttribute('data-category') || '').trim().toUpperCase() : '';
          chip.classList.remove('cu-drag-chip-correct', 'cu-drag-chip-incorrect', 'cu-drag-chip-unplaced');
          if (!zone) {
            chip.classList.add('cu-drag-chip-unplaced');
          } else if (given === expected) {
            chip.classList.add('cu-drag-chip-correct');
            correctItems++;
          } else {
            chip.classList.add('cu-drag-chip-incorrect');
          }
          chip.setAttribute('draggable', 'false');
          chip.style.cursor = 'default';
        });
      });
      // Handle matching exercise
      var matchExercise = sec.querySelector('.cu-match-exercise');
      if (matchExercise) {
        var answerMap = {};
        matchExercise.querySelectorAll('.cu-match-answers span').forEach(function(sp) {
          answerMap[sp.getAttribute('data-num')] = sp.getAttribute('data-letter');
        });
        // Save student's arrangement before any toggling
        var studentLetters = [];
        matchExercise.querySelectorAll('.cu-match-row').forEach(function(row) {
          var ri = row.querySelector('.cu-match-right-item');
          studentLetters.push(ri ? ri.getAttribute('data-letter') : '');
        });
        matchExercise.setAttribute('data-student-letters', JSON.stringify(studentLetters));
        // Table layout: each .cu-match-row has a left and right item
        matchExercise.querySelectorAll('.cu-match-row').forEach(function(row, idx) {
          totalItems++;
          var leftItem = row.querySelector('.cu-match-left-item');
          var rightItem = row.querySelector('.cu-match-right-item');
          var num = leftItem ? leftItem.getAttribute('data-num') || String(idx + 1) : String(idx + 1);
          var correctLetter = answerMap[num] || '';
          var givenLetter = rightItem ? rightItem.getAttribute('data-letter') : '';
          var ok = givenLetter === correctLetter;
          if (leftItem) leftItem.classList.add(ok ? 'cu-match-correct' : 'cu-match-incorrect');
          if (rightItem) rightItem.classList.add(ok ? 'cu-match-correct' : 'cu-match-incorrect');
          if (ok) correctItems++;
        });
        // Disable drag after checking
        matchExercise.querySelectorAll('.cu-match-right-item').forEach(function(item) {
          item.setAttribute('draggable', 'false');
          item.style.cursor = 'default';
        });
        // Add view-toggle button to the footer
        var footer = sec.querySelector('.cu-ex-footer');
        if (footer && !footer.querySelector('.cu-match-view-btn')) {
          var viewBtn = document.createElement('button');
          viewBtn.type = 'button';
          viewBtn.className = 'cu-match-view-btn';
          viewBtn.setAttribute('data-mode', 'student');
          viewBtn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> See correct order';
          (function(capturedMatch) {
            viewBtn.addEventListener('click', function() { BentoGrid._toggleMatchView(capturedMatch, this); });
          })(matchExercise);
          footer.appendChild(viewBtn);
        }
      }
      sec.querySelectorAll('.cu-ex-item:not(.cu-yn-item)').forEach(function(item) {
        var answer = (item.getAttribute('data-answer') || '').trim();
        var answerParts = answer.split(/,\s*/);
        // For sync-items, only check one representative input (all are synced to the same value)
        var isSyncItem = item.classList.contains('cu-sync-item');
        var rawInputs = item.querySelectorAll('.cu-gap-input');
        var inputs;
        if (isSyncItem) {
          // Deduplicate: only take the first input from each sync group
          var seenGroups = {};
          var dedupedInputs = [];
          rawInputs.forEach(function(inp) {
            var g = inp.getAttribute('data-sync-group') || '__no_group__';
            if (!seenGroups[g]) { seenGroups[g] = true; dedupedInputs.push(inp); }
          });
          inputs = dedupedInputs;
        } else {
          inputs = Array.prototype.slice.call(rawInputs);
        }
        // Separate inline option groups from MC option groups
        var optGroups = {};
        var mcGroups = {};
        item.querySelectorAll('.cu-option-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (!g) return;
          if (btn.classList.contains('cu-mc-option')) {
            if (!mcGroups[g]) mcGroups[g] = [];
            mcGroups[g].push(btn);
          } else {
            if (!optGroups[g]) optGroups[g] = [];
            optGroups[g].push(btn);
          }
        });
        var anyInputWrong = false;
        var partIdx = 0;
        inputs.forEach(function(input) {
          totalItems++;
          var expected = (answerParts[partIdx] || '').trim().toLowerCase();
          var given = (input.value || '').trim().toLowerCase();
          var alts = expected.split(/\s*\/\s*/);
          var filled = given !== '';
          var ok = filled && alts.some(function(a) { return given === a.trim(); });
          var checkClass = filled ? (ok ? 'cu-input-correct' : 'cu-input-incorrect') : '';
          // For sync items, apply visual feedback to all inputs in the group
          if (isSyncItem) {
            var group = input.getAttribute('data-sync-group');
            var allInGroup = group
              ? item.querySelectorAll('.cu-sync-input[data-sync-group="' + group + '"]')
              : [input];
            allInGroup.forEach(function(inp) {
              inp.classList.remove('cu-input-correct', 'cu-input-incorrect');
              if (checkClass) {
                inp.classList.add(checkClass);
                inp.setAttribute('data-check-class', checkClass);
              }
            });
          } else {
            input.classList.remove('cu-input-correct', 'cu-input-incorrect');
            if (checkClass) {
              input.classList.add(checkClass);
              input.setAttribute('data-check-class', checkClass);
            }
          }
          if (ok) correctItems++;
          if (!ok) anyInputWrong = true;
          partIdx++;
        });
        // Inline word-choice buttons (e.g. **word/word/word**)
        // Sort groups in DOM order by their _oN suffix so answer parts map correctly
        var isMultiSelect = sec.getAttribute('data-multi-select') === 'true';
        BentoGrid._sortedOptGroupKeys(optGroups).forEach(function(gId, gIdx) {
          totalItems++;
          var btns = optGroups[gId];
          // Each option group maps to the next answer part after all text inputs
          var gAlts = BentoGrid._answerAlts(answerParts[partIdx + gIdx]);
          btns.forEach(function(b) { b.classList.remove('cu-option-correct', 'cu-option-incorrect', 'cu-option-correct-reveal'); });
          if (isMultiSelect) {
            // Multi-select: correct only if the selected set exactly matches gAlts
            var selectedBtns = btns.filter(function(b) { return b.classList.contains('cu-option-selected'); });
            var selectedTexts = selectedBtns.map(function(b) { return BentoGrid._normalizeText(b.textContent.trim().toLowerCase()); });
            var allCorrectSelected = gAlts.every(function(a) { return selectedTexts.indexOf(a) !== -1; });
            var noExtraSelected = selectedTexts.every(function(t) { return gAlts.indexOf(t) !== -1; });
            var matched = selectedBtns.length > 0 && allCorrectSelected && noExtraSelected;
            selectedBtns.forEach(function(b) { b.classList.add(matched ? 'cu-option-correct' : 'cu-option-incorrect'); });
            if (matched) {
              correctItems++;
            } else {
              // Reveal all correct options
              btns.forEach(function(b) {
                var bText = BentoGrid._normalizeText(b.textContent.trim().toLowerCase());
                if (!b.classList.contains('cu-option-incorrect') && gAlts.some(function(a) { return a === bText; })) {
                  b.classList.add('cu-option-correct-reveal');
                }
              });
              anyInputWrong = true;
            }
          } else {
          var selected = null;
          btns.forEach(function(b) { if (b.classList.contains('cu-option-selected')) selected = b; });
          if (selected) {
            var selectedText = BentoGrid._normalizeText(selected.textContent.trim().toLowerCase());
            var matched = gAlts.some(function(a) { return a === selectedText; });
            selected.classList.add(matched ? 'cu-option-correct' : 'cu-option-incorrect');
            if (matched) {
              correctItems++;
            } else {
              // Mark the correct button(s) if student chose wrong
              btns.forEach(function(b) {
                var bText = BentoGrid._normalizeText(b.textContent.trim().toLowerCase());
                if (b !== selected && gAlts.some(function(a) { return a === bText; })) {
                  b.classList.add('cu-option-correct-reveal');
                }
              });
              anyInputWrong = true;
            }
          } else {
            // Nothing selected — mark correct option(s) and count as incorrect
            btns.forEach(function(b) {
              var bText = BentoGrid._normalizeText(b.textContent.trim().toLowerCase());
              if (gAlts.some(function(a) { return a === bText; })) {
                b.classList.add('cu-option-correct-reveal');
              }
            });
            anyInputWrong = true;
          }
          }
        });
        // Multiple-choice option buttons (Exercise E style)
        Object.keys(mcGroups).forEach(function(gId) {
          totalItems++;
          var btns = mcGroups[gId];
          var selected = null;
          btns.forEach(function(b) { if (b.classList.contains('cu-option-selected')) selected = b; });
          btns.forEach(function(b) { b.classList.remove('cu-option-correct', 'cu-option-incorrect', 'cu-option-correct-reveal'); });
          if (selected) {
            var letter = (selected.getAttribute('data-mc-letter') || '').trim().toUpperCase();
            var matched = answerParts.some(function(ap) { return ap.trim().toUpperCase() === letter; });
            selected.classList.add(matched ? 'cu-option-correct' : 'cu-option-incorrect');
            if (matched) {
              correctItems++;
            } else {
              // Mark the correct button if student chose wrong
              btns.forEach(function(b) {
                var bLetter = (b.getAttribute('data-mc-letter') || '').trim().toUpperCase();
                if (b !== selected && answerParts.some(function(ap) { return ap.trim().toUpperCase() === bLetter; })) {
                  b.classList.add('cu-option-correct-reveal');
                }
              });
              anyInputWrong = true;
            }
          } else {
            // Nothing selected — mark correct option and count as incorrect
            btns.forEach(function(b) {
              var bLetter = (b.getAttribute('data-mc-letter') || '').trim().toUpperCase();
              if (answerParts.some(function(ap) { return ap.trim().toUpperCase() === bLetter; })) {
                b.classList.add('cu-option-correct-reveal');
              }
            });
            anyInputWrong = true;
          }
        });
        // For items with wrong text inputs (not MC/choice which show correct via button reveal), add a per-item toggle button
        var hasNoOptionGroups = Object.keys(optGroups).length === 0 && Object.keys(mcGroups).length === 0;
        var hasWrongInput = inputs.length > 0 && anyInputWrong && hasNoOptionGroups;
        if (hasWrongInput) {
          // Store student answers and correct answers on inputs
          inputs.forEach(function(inp, i) {
            inp.setAttribute('data-student-value', inp.value || '');
            var correctRaw = (answerParts[i] || '').trim();
            // Store raw (with all alternatives) and first alternative for display
            inp.setAttribute('data-correct-raw', correctRaw);
            inp.setAttribute('data-correct-value', correctRaw.split(/\s*\/\s*/)[0].trim());
            // For sync items, propagate to all siblings in the group
            if (isSyncItem) {
              var syncGroup = inp.getAttribute('data-sync-group');
              if (syncGroup) {
                item.querySelectorAll('.cu-sync-input[data-sync-group="' + syncGroup + '"]').forEach(function(syncInp) {
                  syncInp.setAttribute('data-student-value', syncInp.value || '');
                  syncInp.setAttribute('data-correct-raw', correctRaw);
                  syncInp.setAttribute('data-correct-value', correctRaw.split(/\s*\/\s*/)[0].trim());
                });
              }
            }
          });
          var foot = item.querySelector('.cu-ex-foot');
          if (foot && !foot.querySelector('.cu-item-toggle-btn')) {
            var toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'cu-item-toggle-btn';
            toggleBtn.setAttribute('data-mode', 'student');
            toggleBtn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> Show correct answer';
            (function(capturedItem) {
              toggleBtn.addEventListener('click', function() { BentoGrid._toggleCuItemAnswer(this, capturedItem); });
            })(item);
            // Hide the static answer div — the toggle button replaces it
            var ansDiv = item.querySelector('.cu-answer');
            if (ansDiv) ansDiv.style.display = 'none';
            foot.appendChild(toggleBtn);
          }
        }
      });
      var checkBtn = sec.querySelector('.cu-check-btn');
      if (checkBtn) checkBtn.disabled = true;
      // Hide "Show answers" button — per-item toggles replace it after checking
      var showBtn = sec.querySelector('.cu-show-all-btn');
      if (showBtn) showBtn.style.display = 'none';
      // Disable all inputs and option buttons
      sec.querySelectorAll('.cu-gap-input').forEach(function(input) { input.disabled = true; });
      sec.querySelectorAll('.cu-option-btn').forEach(function(btn) { btn.disabled = true; });
      // Show retry button
      var retryBtn = sec.querySelector('.cu-retry-btn');
      if (retryBtn) retryBtn.style.display = '';
      // Show score summary panel
      if (totalItems > 0) {
        var existing = sec.querySelector('.cu-ex-score-summary');
        if (existing) existing.remove();
        var pct = Math.round((correctItems / totalItems) * 100);
        var isGood = pct >= 70;
        var summary = document.createElement('div');
        summary.className = 'cu-ex-score-summary ' + (isGood ? 'cu-ex-score-good' : 'cu-ex-score-review');
        summary.setAttribute('role', 'status');
        summary.setAttribute('aria-live', 'polite');
        var emojiLabel = isGood ? '(celebration)' : '(hint)';
        var scoreText = correctItems + '/' + totalItems + ' correct';
        var feedbackText = isGood ? '¡Muy bien!' : 'Review the highlighted answers above.';
        summary.innerHTML =
          '<span aria-hidden="true">' + (isGood ? '🎉' : '💡') + '</span>' +
          '<span class="visually-hidden">' + emojiLabel + ' </span>' +
          scoreText + ' — ' + feedbackText;
        var footer = sec.querySelector('.cu-ex-footer');
        if (footer) {
          footer.parentNode.insertBefore(summary, footer.nextSibling);
        } else {
          sec.appendChild(summary);
        }
        // Store result on the section element for total score tracking
        sec.setAttribute('data-correct-items', correctItems);
        sec.setAttribute('data-total-items', totalItems);
        // Persist score and answers to localStorage for review sections
        if (sec.classList.contains('cu-review-section')) {
          var unitId = BentoGrid._currentUnitId;
          var sectionIdx = parseInt((sec.id || '').replace('cu-sec-', ''));
          if (unitId && !isNaN(sectionIdx)) {
            BentoGrid._trackReviewItem(unitId, sectionIdx, correctItems);
            BentoGrid._saveReviewSectionState(sec, unitId, sectionIdx, correctItems, totalItems);
          }
        } else {
          // Non-review exercise: persist checked answers + score locally and to Supabase
          var unitId = BentoGrid._currentUnitId;
          var sectionIdx = parseInt((sec.id || '').replace('cu-sec-', ''));
          if (unitId && !isNaN(sectionIdx)) {
            var checkedAnswers = BentoGrid._getReviewSectionAnswers(sec);
            BentoGrid._saveCuExSectionChecked(unitId, sectionIdx, checkedAnswers, correctItems, totalItems);
            // Mark section as done only on first check, not during answer restoration.
            // _isRestoringCuAnswers is set true by _restoreCuExSectionAnswers to suppress
            // redundant localStorage/Supabase writes when re-checking previously saved answers.
            if (!BentoGrid._isRestoringCuAnswers) {
              var _exLevel = BentoGrid._courseLevel || 'C1';
              BentoGrid._markCourseSectionVisited(_exLevel, unitId, sectionIdx);
              BentoGrid._checkCourseUnitAllDone(_exLevel, unitId);
            }
          }
        }
        // Update total review score if this is a review section
        BentoGrid._updateReviewTotalScore();
      }
    },

    _updateReviewTotalScore: function() {
      var totalPanel = document.getElementById('cu-review-total-score');
      if (!totalPanel) return;
      var totalCorrect = 0;
      var totalMax = 0;
      var checkedSections = 0;
      document.querySelectorAll('.cu-review-section').forEach(function(sec) {
        var c = parseInt(sec.getAttribute('data-correct-items') || '-1');
        var m = parseInt(sec.getAttribute('data-total-items') || '0');
        if (c >= 0 && m > 0) { totalCorrect += c; totalMax += m; checkedSections++; }
      });
      if (totalMax === 0) { totalPanel.style.display = 'none'; return; }
      var valEl = document.getElementById('cu-review-total-val');
      var pctEl = document.getElementById('cu-review-total-pct');
      if (valEl) valEl.textContent = totalCorrect;
      if (pctEl) {
        var pct = Math.round((totalCorrect / totalMax) * 100);
        pctEl.textContent = '(' + pct + '%)';
      }
      totalPanel.style.display = '';
    },

    _toggleCuAnswers: function(sectionId) {
      var sec = document.getElementById(sectionId);
      if (!sec) return;

      // Close the options modal when the user toggles answers
      if (window.Modal) Modal.closeOptionsModal();

      var btn = sec.querySelector('.cu-show-all-btn');
      var icon = btn ? btn.querySelector('.material-symbols-outlined') : null;
      var isShowing = sec.getAttribute('data-answers-showing') === 'true';

      if (!isShowing) {
        // Show answers: fill inputs with correct values, mark correct options/yn
        sec.setAttribute('data-answers-showing', 'true');
        if (icon) icon.textContent = 'visibility_off';
        if (btn) {
          var textNode = btn.lastChild;
          if (textNode && textNode.nodeType === 3) textNode.textContent = ' Hide answers';
        }
        // Disable check button while answers are shown
        var checkBtn = sec.querySelector('.cu-check-btn');
        if (checkBtn) checkBtn.disabled = true;

        // Text inputs from cu-ex-items
        sec.querySelectorAll('.cu-ex-item, .cu-sync-item').forEach(function(item) {
          var answer = (item.getAttribute('data-answer') || '').trim();
          var answerParts = answer.split(/,\s*/);
          var isSyncItem = item.classList.contains('cu-sync-item');
          var rawInputs = item.querySelectorAll('.cu-gap-input');
          var inputs;
          if (isSyncItem) {
            var seenGroups = {};
            var dedupedInputs = [];
            rawInputs.forEach(function(inp) {
              var g = inp.getAttribute('data-sync-group') || '__';
              if (!seenGroups[g]) { seenGroups[g] = true; dedupedInputs.push(inp); }
            });
            inputs = dedupedInputs;
          } else {
            inputs = Array.prototype.slice.call(rawInputs);
          }
          inputs.forEach(function(inp, i) {
            inp.setAttribute('data-saved-value', inp.value);
            var correctRaw = (answerParts[i] || answerParts[0] || '').trim();
            var alts = correctRaw.split(/\s*\/\s*/).map(function(a) { return a.trim(); }).filter(Boolean);
            var correctDisplay = alts[0] || '';
            inp.value = correctDisplay;
            inp.classList.add('cu-input-show-correct');
            BentoGrid._resizeCuInput(inp);
            BentoGrid._attachAltBadge(inp, alts);
            // For sync items, propagate to all siblings
            if (isSyncItem) {
              var syncGroup = inp.getAttribute('data-sync-group');
              if (syncGroup) {
                item.querySelectorAll('.cu-sync-input[data-sync-group="' + syncGroup + '"]').forEach(function(syncInp) {
                  if (syncInp !== inp) {
                    syncInp.setAttribute('data-saved-value', syncInp.value);
                    syncInp.value = correctDisplay;
                    syncInp.classList.add('cu-input-show-correct');
                    BentoGrid._resizeCuInput(syncInp);
                    BentoGrid._attachAltBadge(syncInp, alts);
                  }
                });
              }
            }
          });
          // Inline option buttons (word-choice)
          var optGroups = {};
          item.querySelectorAll('.cu-option-btn:not(.cu-mc-option)').forEach(function(b) {
            var g = b.getAttribute('data-group');
            if (g) { if (!optGroups[g]) optGroups[g] = []; optGroups[g].push(b); }
          });
          // Sort groups in DOM order by their _oN suffix so answer parts map correctly
          BentoGrid._sortedOptGroupKeys(optGroups).forEach(function(gId, gIdx) {
            // Option groups start at answer part index = number of text inputs
            var gAlts = BentoGrid._answerAlts(answerParts[inputs.length + gIdx]);
            optGroups[gId].forEach(function(b) {
              var bText = BentoGrid._normalizeText(b.textContent.trim().toLowerCase());
              if (gAlts.some(function(a) { return a === bText; })) {
                b.classList.add('cu-option-correct-reveal');
              }
            });
          });
          // MC option buttons
          var mcGroups = {};
          item.querySelectorAll('.cu-option-btn.cu-mc-option').forEach(function(b) {
            var g = b.getAttribute('data-group');
            if (g) { if (!mcGroups[g]) mcGroups[g] = []; mcGroups[g].push(b); }
          });
          Object.keys(mcGroups).forEach(function(gId) {
            mcGroups[gId].forEach(function(b) {
              var bLetter = (b.getAttribute('data-mc-letter') || '').trim().toUpperCase();
              if (answerParts.some(function(ap) { return ap.trim().toUpperCase() === bLetter; })) {
                b.classList.add('cu-option-correct-reveal');
              }
            });
          });
          // YN buttons
          var ynAnswer = (item.getAttribute('data-answer') || '').trim().toUpperCase();
          var ynGroups = {};
          item.querySelectorAll('.cu-yn-btn').forEach(function(b) {
            var g = b.getAttribute('data-group');
            if (g) { if (!ynGroups[g]) ynGroups[g] = []; ynGroups[g].push(b); }
          });
          Object.keys(ynGroups).forEach(function(gId) {
            ynGroups[gId].forEach(function(b) {
              if ((b.getAttribute('data-yn') || '').toUpperCase() === ynAnswer) {
                b.classList.add('cu-yn-correct-reveal');
              }
            });
          });
        });

        // Passage inputs (data-passage-num)
        sec.querySelectorAll('.cu-gap-input[data-passage-num]').forEach(function(inp) {
          var correctRaw = (inp.getAttribute('data-answer') || '').trim();
          var alts = correctRaw.split(/\s*\/\s*/).map(function(a) { return a.trim(); }).filter(Boolean);
          var correct = alts[0] || '';
          inp.setAttribute('data-saved-value', inp.value);
          inp.value = correct;
          inp.classList.add('cu-input-show-correct');
          BentoGrid._resizeCuInput(inp);
          BentoGrid._attachAltBadge(inp, alts);
        });

        // Matching exercise: show correct order in blue
        var matchExercise = sec.querySelector('.cu-match-exercise');
        if (matchExercise) {
          var currentLetters = [];
          matchExercise.querySelectorAll('.cu-match-row').forEach(function(row) {
            var ri = row.querySelector('.cu-match-right-item');
            currentLetters.push(ri ? ri.getAttribute('data-letter') : '');
          });
          matchExercise.setAttribute('data-saved-letters', JSON.stringify(currentLetters));
          var answerMap = {};
          matchExercise.querySelectorAll('.cu-match-answers span').forEach(function(sp) {
            answerMap[sp.getAttribute('data-num')] = sp.getAttribute('data-letter');
          });
          var rightItemsByLetter = {};
          matchExercise.querySelectorAll('.cu-match-right-item').forEach(function(item) {
            rightItemsByLetter[item.getAttribute('data-letter')] = item;
          });
          matchExercise.querySelectorAll('.cu-match-row').forEach(function(row) {
            var leftItem = row.querySelector('.cu-match-left-item');
            var num = leftItem ? leftItem.getAttribute('data-num') : '';
            var correctLetter = answerMap[num];
            var rightCell = row.querySelector('.cu-match-right-cell');
            if (correctLetter && rightItemsByLetter[correctLetter] && rightCell) {
              rightCell.appendChild(rightItemsByLetter[correctLetter]);
            }
          });
          // Apply blue show-correct style to all items
          matchExercise.querySelectorAll('.cu-match-item').forEach(function(item) {
            item.classList.add('cu-match-show-correct');
          });
        }

        // MC passage gaps: show correct answers in blue
        sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
          var secId = gap.getAttribute('data-sec-id') || '';
          var gapNum = parseInt(gap.getAttribute('data-gap-num') || '0');
          var expected = (gap.getAttribute('data-answer') || '').trim().toUpperCase();
          var qData = (BentoGrid._cuMcPassageData[secId] || {})[gapNum];
          var correctOpt = qData ? qData.options.find(function(o) { return o.charAt(0).toUpperCase() === expected; }) : null;
          var correctText = correctOpt ? BentoGrid._getCuMcOptionText(correctOpt) : expected;
          var slot = gap.querySelector('.cu-mc-passage-gap-slot');
          // Save current state
          gap.setAttribute('data-saved-gap-classes', gap.classList.toString());
          if (slot) {
            gap.setAttribute('data-saved-slot-text', slot.textContent);
            gap.setAttribute('data-saved-slot-class', slot.className);
          }
          // Apply show-correct style
          gap.classList.remove('cu-mc-passage-gap-answered');
          gap.classList.add('cu-mc-passage-gap-show-correct');
          if (slot) {
            slot.textContent = correctText;
            slot.className = 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled';
          }
        });
      } else {
        // Hide answers: restore original values
        sec.setAttribute('data-answers-showing', 'false');
        if (icon) icon.textContent = 'visibility';
        if (btn) {
          var textNode = btn.lastChild;
          if (textNode && textNode.nodeType === 3) textNode.textContent = ' Show answers';
        }
        // Re-enable check button when answers are hidden
        var checkBtn = sec.querySelector('.cu-check-btn');
        if (checkBtn) checkBtn.disabled = false;

        sec.querySelectorAll('.cu-gap-input').forEach(function(inp) {
          var saved = inp.getAttribute('data-saved-value');
          if (saved !== null) {
            inp.value = saved;
            inp.removeAttribute('data-saved-value');
          }
          inp.removeAttribute('data-alt-answers');
          inp.removeAttribute('data-alt-idx');
          if (inp._cuAltClickHandler) { inp.removeEventListener('click', inp._cuAltClickHandler); inp._cuAltClickHandler = null; }
          inp.readOnly = false;
          inp._cuAltBadge = null;
          inp.classList.remove('cu-input-show-correct');
          BentoGrid._resizeCuInput(inp);
        });
        sec.querySelectorAll('.cu-alt-badge').forEach(function(b) { b.remove(); });
        sec.querySelectorAll('.cu-option-btn').forEach(function(b) {
          b.classList.remove('cu-option-correct-reveal');
        });
        sec.querySelectorAll('.cu-yn-btn').forEach(function(b) {
          b.classList.remove('cu-yn-correct-reveal');
        });

        // Restore matching exercise to saved order
        var matchExercise = sec.querySelector('.cu-match-exercise');
        if (matchExercise) {
          // Remove show-correct styling before restoring
          matchExercise.querySelectorAll('.cu-match-item').forEach(function(item) {
            item.classList.remove('cu-match-show-correct');
          });
          var savedLetters = JSON.parse(matchExercise.getAttribute('data-saved-letters') || '[]');
          var rightItemsByLetter = {};
          matchExercise.querySelectorAll('.cu-match-right-item').forEach(function(item) {
            rightItemsByLetter[item.getAttribute('data-letter')] = item;
          });
          matchExercise.querySelectorAll('.cu-match-row').forEach(function(row, idx) {
            var rightCell = row.querySelector('.cu-match-right-cell');
            var letter = savedLetters[idx];
            if (letter && rightItemsByLetter[letter] && rightCell) {
              rightCell.appendChild(rightItemsByLetter[letter]);
            }
          });
          matchExercise.removeAttribute('data-saved-letters');
        }

        // Restore MC passage gaps to their saved state
        sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
          var slot = gap.querySelector('.cu-mc-passage-gap-slot');
          if (gap.hasAttribute('data-saved-gap-classes')) {
            gap.className = gap.getAttribute('data-saved-gap-classes');
            gap.removeAttribute('data-saved-gap-classes');
          } else {
            gap.classList.remove('cu-mc-passage-gap-show-correct');
          }
          if (slot) {
            if (gap.hasAttribute('data-saved-slot-text')) slot.textContent = gap.getAttribute('data-saved-slot-text');
            if (gap.hasAttribute('data-saved-slot-class')) slot.className = gap.getAttribute('data-saved-slot-class');
          }
          gap.removeAttribute('data-saved-slot-text');
          gap.removeAttribute('data-saved-slot-class');
        });
      }
    },

    _showAllCuAnswers: function(sectionId) {
      var sec = document.getElementById(sectionId);
      if (!sec) return;
      sec.querySelectorAll('.cu-answer').forEach(function(div) { div.style.display = 'block'; });
    },

    // Toggle MC passage exercise view between 'yours' (student results) and 'correct' (all correct in blue)
    _setCuMcPassageView: function(sec, view) {
      // Update button active states
      sec.querySelectorAll('.cu-mc-passage-view-btn').forEach(function(btn) {
        btn.classList.toggle('cu-mc-passage-view-active', btn.getAttribute('data-view') === view);
      });
      sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
        var slot = gap.querySelector('.cu-mc-passage-gap-slot');
        var correctText = gap.getAttribute('data-correct-text') || '';
        var studentText = gap.getAttribute('data-student-text') || '';
        var checkClass = gap.getAttribute('data-check-class') || 'cu-mc-passage-gap-show-correct';
        gap.classList.remove('cu-mc-passage-gap-correct', 'cu-mc-passage-gap-incorrect', 'cu-mc-passage-gap-show-correct');
        if (view === 'correct') {
          // All gaps in blue showing correct answers
          gap.classList.add('cu-mc-passage-gap-show-correct');
          if (slot) {
            slot.textContent = correctText;
            slot.className = 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled';
          }
        } else {
          // 'yours': restore post-check state
          gap.classList.add(checkClass);
          if (slot) {
            if (checkClass === 'cu-mc-passage-gap-show-correct') {
              // Unanswered: show correct in blue
              slot.textContent = correctText;
            } else {
              // Answered: show student's text (correct or wrong)
              slot.textContent = studentText;
            }
            slot.className = 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled';
          }
        }
      });
    },


    // Attach a clickable alt-solution badge after an input if there are multiple alternatives
    _attachAltBadge: function(inp, alts) {
      if (!alts || alts.length <= 1) return;
      // Remove any previously attached badge/handler (idempotent)
      if (inp._cuAltBadge) { inp._cuAltBadge.remove(); inp._cuAltBadge = null; }
      if (inp._cuAltClickHandler) { inp.removeEventListener('click', inp._cuAltClickHandler); inp._cuAltClickHandler = null; }
      inp.setAttribute('data-alt-answers', JSON.stringify(alts));
      inp.setAttribute('data-alt-idx', '0');
      var badge = document.createElement('span');
      badge.className = 'cu-alt-badge';
      badge.textContent = '1/' + alts.length;
      badge.title = 'Click to see next solution';
      badge.setAttribute('aria-label', 'Cycle through ' + alts.length + ' alternative solutions');
      (function(capturedInp) {
        badge.addEventListener('click', function() { BentoGrid._cycleInputAlt(capturedInp); });
      })(inp);
      inp._cuAltBadge = badge;
      var anchor = inp.closest('.cu-hint-pill') || inp;
      anchor.parentNode.insertBefore(badge, anchor.nextSibling);
      // Make the input non-editable; clicking it cycles through alternatives
      inp.readOnly = true;
      inp._cuAltClickHandler = function() { BentoGrid._cycleInputAlt(inp); };
      inp.addEventListener('click', inp._cuAltClickHandler);
    },

    // Cycle through alt solutions on a gap input
    _cycleInputAlt: function(inp) {
      var alts = JSON.parse(inp.getAttribute('data-alt-answers') || '[]');
      if (alts.length <= 1) return;
      var idx = (parseInt(inp.getAttribute('data-alt-idx') || '0') + 1) % alts.length;
      inp.setAttribute('data-alt-idx', String(idx));
      inp.value = alts[idx];
      BentoGrid._resizeCuInput(inp);
      var badge = inp._cuAltBadge;
      if (badge) badge.textContent = (idx + 1) + '/' + alts.length;
      // Propagate to sync siblings
      var syncGroup = inp.getAttribute('data-sync-group');
      if (syncGroup) {
        var sec = inp.closest('.cu-section');
        if (sec) {
          sec.querySelectorAll('.cu-gap-input[data-sync-group="' + syncGroup + '"]').forEach(function(sibling) {
            if (sibling === inp) return;
            sibling.setAttribute('data-alt-idx', String(idx));
            sibling.value = alts[idx];
            BentoGrid._resizeCuInput(sibling);
            var sibBadge = sibling._cuAltBadge;
            if (sibBadge) sibBadge.textContent = (idx + 1) + '/' + alts.length;
          });
        }
      }
    },

    _toggleCuItemAnswer: function(btn, item) {
      var mode = btn.getAttribute('data-mode');
      var newMode = mode === 'student' ? 'correct' : 'student';
      btn.setAttribute('data-mode', newMode);
      // Update all gap inputs in this item
      item.querySelectorAll('.cu-gap-input').forEach(function(inp) {
        if (newMode === 'correct') {
          var correctRaw = inp.getAttribute('data-correct-raw') || inp.getAttribute('data-correct-value') || '';
          var alts = correctRaw.split(/\s*\/\s*/).map(function(a) { return a.trim(); }).filter(Boolean);
          inp.value = alts[0] || '';
          inp.classList.remove('cu-input-correct', 'cu-input-incorrect');
          inp.classList.add('cu-input-show-correct');
          BentoGrid._attachAltBadge(inp, alts);
        } else {
          // Clean up alt badge, readonly and click handler
          if (inp._cuAltBadge) { inp._cuAltBadge.remove(); inp._cuAltBadge = null; }
          if (inp._cuAltClickHandler) { inp.removeEventListener('click', inp._cuAltClickHandler); inp._cuAltClickHandler = null; }
          inp.readOnly = false;
          inp.removeAttribute('data-alt-answers');
          inp.removeAttribute('data-alt-idx');
          inp.value = inp.getAttribute('data-student-value') || '';
          inp.classList.remove('cu-input-show-correct');
          // Restore the original check result class (correct or incorrect per input)
          var savedClass = inp.getAttribute('data-check-class');
          if (savedClass) inp.classList.add(savedClass);
        }
        BentoGrid._resizeCuInput(inp);
      });
      if (newMode === 'correct') {
        btn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> Show your answer';
      } else {
        btn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> Show correct answer';
      }
    },

    // Toggle matching exercise between student's arrangement and correct order
    _toggleMatchView: function(matchExercise, btn) {
      var mode = btn.getAttribute('data-mode');
      var answerMap = {};
      matchExercise.querySelectorAll('.cu-match-answers span').forEach(function(sp) {
        answerMap[sp.getAttribute('data-num')] = sp.getAttribute('data-letter');
      });
      // Collect all right items by letter
      var rightItemsByLetter = {};
      matchExercise.querySelectorAll('.cu-match-right-item').forEach(function(item) {
        rightItemsByLetter[item.getAttribute('data-letter')] = item;
      });
      if (mode === 'student') {
        // Switch to correct view: show proper A→G alignment
        matchExercise.querySelectorAll('.cu-match-row').forEach(function(row) {
          var leftItem = row.querySelector('.cu-match-left-item');
          var num = leftItem ? leftItem.getAttribute('data-num') : '';
          var correctLetter = answerMap[num];
          var rightCell = row.querySelector('.cu-match-right-cell');
          if (correctLetter && rightItemsByLetter[correctLetter] && rightCell) {
            rightCell.appendChild(rightItemsByLetter[correctLetter]);
          }
        });
        // Apply blue show-correct style in correct view
        matchExercise.querySelectorAll('.cu-match-item').forEach(function(item) {
          item.classList.remove('cu-match-correct', 'cu-match-incorrect');
          item.classList.add('cu-match-show-correct');
        });
        btn.setAttribute('data-mode', 'correct');
        btn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> See your answer';
      } else {
        // Switch back to student view
        var studentLetters = JSON.parse(matchExercise.getAttribute('data-student-letters') || '[]');
        matchExercise.querySelectorAll('.cu-match-row').forEach(function(row, idx) {
          var rightCell = row.querySelector('.cu-match-right-cell');
          var letter = studentLetters[idx];
          if (letter && rightItemsByLetter[letter] && rightCell) {
            rightCell.appendChild(rightItemsByLetter[letter]);
          }
        });
        // Restore feedback classes
        matchExercise.querySelectorAll('.cu-match-row').forEach(function(row) {
          var leftItem = row.querySelector('.cu-match-left-item');
          var rightItem = row.querySelector('.cu-match-right-item');
          var num = leftItem ? leftItem.getAttribute('data-num') : '';
          var correctLetter = answerMap[num] || '';
          var givenLetter = rightItem ? rightItem.getAttribute('data-letter') : '';
          var ok = givenLetter === correctLetter;
          if (leftItem) { leftItem.classList.remove('cu-match-show-correct'); leftItem.classList.toggle('cu-match-correct', ok); leftItem.classList.toggle('cu-match-incorrect', !ok); }
          if (rightItem) { rightItem.classList.remove('cu-match-show-correct'); rightItem.classList.toggle('cu-match-correct', ok); rightItem.classList.toggle('cu-match-incorrect', !ok); }
        });
        btn.setAttribute('data-mode', 'student');
        btn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> See correct order';
      }
    },

    _updateRoadmapActiveItem: function(idx) {
      var widget = document.querySelector('.course-roadmap-widget');
      if (!widget) return;
      // Remove active from all items
      widget.querySelectorAll('.course-roadmap-item').forEach(function(item) {
        item.classList.remove('crm-active');
      });
      // Prefer ID-based lookup (new structure)
      var activeItem = widget.querySelector('#crm-item-' + idx);
      if (activeItem) {
        activeItem.classList.add('crm-active');
      } else {
        // Fallback: index-based
        var items = widget.querySelectorAll('.course-roadmap-item');
        if (items[idx]) items[idx].classList.add('crm-active');
      }
    },

    _buildContinueBasecampHtml: function(exams) {

      // Always point to the Course page (coming soon)
      return '<div class="sw-left-widget sw-continue-basecamp" onclick="BentoGrid.openLessons()" style="cursor:pointer">' +
        '<div class="sw-left-widget-label">' + 'Course' + '</div>' +
        '<div class="sw-left-widget-row">' +
          '<span class="sw-left-widget-icon"><span class="material-symbols-outlined">auto_stories</span></span>' +
          '<div class="sw-left-widget-info">' +
            '<div class="sw-left-widget-title">' + 'Coming Soon' + '</div>' +
            '<div class="sw-left-widget-sub">' + 'Structured lessons' + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  });
})();
