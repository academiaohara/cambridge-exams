// js/course.js
// Course section: lessons, units, grammar, vocabulary, review exercises

(function() {
  var CU_PAGE_SIZE = 4; // max items per page in paginated course exercises (balanced 4+4 for 8-item sections)
  var CU_MC_BLANK = '<span class="cu-mc-blank">&#9135;&#9135;&#9135;&#9135;&#9135;</span>';
  var CU_DRAG_POOL_MARKER = '__POOL__';
  // KWT-style gap marker: 5+ dots/ellipsis chars, 2+ unicode ellipses, or 3+ underscores.
  var CU_KWTRANS_GAP_PATTERN = /(?:[.\u2026]{5,}|\u2026{2,}|_{3,})/;
  // Trailing keyword marker: "(KEYWORD)" or "(KEY / WORD)" in uppercase at sentence end.
  var CU_KWTRANS_KEYWORD_SUFFIX_PATTERN = /\s*\(([A-Z]{2,}(?:\s*\/\s*[A-Z]+)*)\)\s*$/;

  Object.assign(window.BentoGrid, {
    // Parse MC options. Supports both labelled options ("A text", "B. text")
    // and plain options ("text"), assigning fallback letters by index.
    _parseCuMcOption: function(optionStr, index) {
      var trimmed = (optionStr || '').trim();
      var m = trimmed.match(/^([A-Za-z])(?:[.)\s-]+)(.+)$/);
      if (m) {
        return {
          letter: m[1].toUpperCase(),
          text: (m[2] || '').trim(),
          showLetter: true
        };
      }
      var fallbackIndex = typeof index === 'number' && index >= 0 ? index : 0;
      return {
        letter: String.fromCharCode(65 + (fallbackIndex % 26)),
        text: trimmed,
        showLetter: false
      };
    },

    _getCuMcOptionText: function(optionStr, index) {
      return this._parseCuMcOption(optionStr, index).text;
    },

    // Helper: set text in a mc-passage gap slot, handling split gaps (pre/mid/post).
    // For split gaps the text is stored in the hidden .cu-mc-passage-gap-slot and
    // the visible pre/post spans are populated by splitting on the "…" separator.
    _applyMcPassageGapSlot: function(gap, text, slotClass) {
      var slot = gap.querySelector('.cu-mc-passage-gap-slot');
      if (slot) {
        slot.textContent = text;
        slot.className = slotClass;
      }
      if (gap.classList.contains('cu-mc-passage-gap-split')) {
        var parts = text ? text.split(/\s*\u2026\s*/).slice(0, 2) : ['', ''];
        var pre = gap.querySelector('.cu-mc-passage-gap-slot-pre');
        var post = gap.querySelector('.cu-mc-passage-gap-slot-post');
        if (pre) pre.textContent = parts[0] || '';
        if (post) post.textContent = parts[1] || '';
      }
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

    openCourseTheory: async function(level) {
      var content = document.getElementById('main-content');
      if (!content) return;
      level = level || AppState.currentLevel || 'C1';
      BentoGrid._courseLevel = level;

      // Reset cached course data when switching level
      BentoGrid._courseIndexData = null;
      BentoGrid._courseBlocks = null;
      BentoGrid._courseBlockOrder = null;

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
        BentoGrid._bindCourseOverviewFilterEvents();
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

      // Theory tile: full-width card styled like fe-category-card with B1/B2/C1 level buttons
      var theoryLevelBtns =
        '<button class="fe-cat-level-btn fe-cat-level-btn-locked" title="Coming soon">B1</button>' +
        '<button class="fe-cat-level-btn" style="background:#0284c7" onclick="event.stopPropagation();BentoGrid.openCourseTheory(\'B2\')">B2</button>' +
        '<button class="fe-cat-level-btn" style="background:#0284c7" onclick="event.stopPropagation();BentoGrid.openCourseTheory(\'C1\')">C1</button>';
      var theoryCard =
        '<div class="fe-category-card" style="--cat-color:#0284c7" onclick="BentoGrid.openCourseTheory()">' +
          '<div class="fe-category-card-header">' +
            '<span class="fe-category-icon">' + _mi('menu_book') + '</span>' +
            '<div class="fe-category-info">' +
              '<div class="fe-category-name">Theory</div>' +
              '<div class="fe-category-stats">Grammar &amp; Vocabulary blocks</div>' +
            '</div>' +
            '<div class="fe-cat-level-btns fe-cat-level-btns-header">' + theoryLevelBtns + '</div>' +
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
      BentoGrid._bindCourseOverviewFilterEvents();
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

      // Progress test block: render with individual exercise slots like review
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
          var reviewAnsweredData = BentoGrid._getReviewAnswered(level);
          var ptMeta = BentoGrid._courseUnitMeta && BentoGrid._courseUnitMeta[progressTestItem.id];
          var ptSectionDefs = (ptMeta && ptMeta.ptSections) || [];
          html += '<div class="fe-map-lesson fe-map-pt-block fe-map-review-block ' + (isPtDone ? 'fe-lesson-complete' : 'fe-lesson-active') + '">';
          html += '<div class="fe-map-lesson-title">' +
            '<span class="fe-map-lesson-num">' + _mi('assignment') + ' Progress Test</span>' +
            '<span class="fe-rs-total-score' + (ptScore === null ? ' fe-rs-score-pending' : '') + '">' + (ptScore !== null ? ptScore : '–') + '/' + ptTotal + '</span>' +
          '</div>';
          if (ptSectionDefs.length) {
            html += '<div class="fe-map-pt-slots">';
            ptSectionDefs.forEach(function(sec) {
              var earned = reviewAnsweredData[progressTestItem.id + '_' + sec.sectionIdx];
              var isPending = earned === undefined || earned === null;
              var scoreLabel = (isPending ? '–' : Math.min(earned, sec.maxScore)) + '/' + sec.maxScore;
              var titleParts = sec.title.split(':');
              var letter = titleParts.length > 1 ? titleParts[0].trim() : '';
              var name = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : sec.title;
              html += '<button class="fe-review-slot fe-pt-slot" onclick="BentoGrid.openCourseUnit(\'' + progressTestItem.id + '\',\'' + ptPath + '\',' + sec.sectionIdx + ')">' +
                (letter ? '<span class="fe-rs-letter">' + self._escapeHTML(letter) + '</span>' : '') +
                '<span class="fe-rs-name">' + self._escapeHTML(name) + '</span>' +
                '<span class="fe-rs-score' + (isPending ? ' fe-rs-score-pending' : '') + '">' + scoreLabel + '</span>' +
              '</button>';
            });
            html += '</div>';
          } else {
            html += '<div class="cu-pt-block-cta">' + (isPtDone ? _mi('restart_alt') + ' Retake Test' : _mi('play_arrow') + ' Take the Test') + '</div>';
          }
          html += '</div>';
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
      var level = BentoGrid._courseLevel || AppState.currentLevel || 'C1';

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

      // Unwrap nested format: e.g. {"Review1": {...}} → {...}
      if (unitData && !unitData.type) {
        var keys = Object.keys(unitData);
        if (keys.length === 1 && unitData[keys[0]] && unitData[keys[0]].type) {
          unitData = unitData[keys[0]];
        }
      }

      // Override block/title from index when available (fixes stale data in unit files)
      if (unitData && BentoGrid._courseIndexData && BentoGrid._courseIndexData.items) {
        var _idxItem = BentoGrid._courseIndexData.items.find(function(i) { return i.id === unitId; });
        if (_idxItem) {
          if (_idxItem.block != null) unitData.block = _idxItem.block;
          if (_idxItem.title && (unitData.type === 'review' || unitData.type === 'progress_test')) {
            unitData.unitTitle = unitData.unitTitle || _idxItem.title;
          }
        }
      }

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
          if (Array.isArray(unitData.sections)) {
            // B2 array format: count theory sections like grammar
            var vocabTheorySections = unitData.sections.filter(function(s) { return s.type === 'theory'; });
            sectionStartIdx = vocabTheorySections.length;
          } else {
            // C1 object format: find the rendered index of the 'exercises' key in vocab section order
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
      function _bold(str) { return self._escapeHTML(str).replace(/\n/g, '<br>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>'); }
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

            // subtitleTable: 2-col table where each block's label → "Use" col, items → right col
            if (block.subtitleTable) {
              var stHeaders = block.headers || ['Use', 'Example'];
              html += '<table class="cu-uses-examples-table">';
              if (!block.noHeader) {
                html += '<thead><tr><th class="cu-ue-head">' + self._escapeHTML(stHeaders[0]) + '</th><th class="cu-ue-head">' + self._escapeHTML(stHeaders[1]) + '</th></tr></thead>';
              }
              html += '<tbody>';
              (block.rows || []).forEach(function(row) {
                html += '<tr class="cu-ue-row">';
                html += '<td class="cu-ue-use">' + _bold(row.label || '') + '</td>';
                var stItems = row.items || [];
                var stItemsHtml = '';
                if (stItems.length) {
                  stItemsHtml = '<ul class="cu-theory-list">';
                  stItems.forEach(function(item) { stItemsHtml += '<li>' + _bold(item) + '</li>'; });
                  stItemsHtml += '</ul>';
                }
                html += '<td class="cu-ue-items">' + stItemsHtml + '</td>';
                html += '</tr>';
              });
              html += '</tbody></table>';
              contentIdx++;
              continue;
            }

            // typeTable: 2-col table with type name + useItems in left col, examples in right col
            if (block.typeTable) {
              var ttHeaders = block.headers || ['Type', 'Example'];
              html += '<table class="cu-uses-examples-table">';
              if (!block.noHeader) {
                html += '<thead><tr><th class="cu-ue-head">' + self._escapeHTML(ttHeaders[0]) + '</th><th class="cu-ue-head">' + self._escapeHTML(ttHeaders[1]) + '</th></tr></thead>';
              }
              html += '<tbody>';
              (block.rows || []).forEach(function(row) {
                html += '<tr class="cu-ue-row">';
                var ttLeft = '<span class="cu-ue-type-name">' + self._escapeHTML(row.type || '') + '</span>';
                if ((row.useItems || []).length) {
                  ttLeft += '<ul class="cu-theory-list">';
                  row.useItems.forEach(function(ui) { ttLeft += '<li>' + _bold(ui) + '</li>'; });
                  ttLeft += '</ul>';
                }
                html += '<td class="cu-ue-use">' + ttLeft + '</td>';
                var ttExHtml = (row.examples || []).map(function(ex) { return _bold(ex); }).join('<br>');
                html += '<td class="cu-ue-example">' + ttExHtml + '</td>';
                html += '</tr>';
              });
              (block.fullWidthRows || []).forEach(function(fwRow) {
                html += '<tr class="cu-ue-row"><td colspan="2" class="cu-ue-full-cell">' + _bold(fwRow) + '</td></tr>';
              });
              html += '</tbody></table>';
              contentIdx++;
              continue;
            }

            // quantifierTable: 3-col table (Quantifier | Use | Example)
            if (block.quantifierTable) {
              var qtHeaders = block.headers || ['Quantifier', 'Use', 'Example'];
              html += '<table class="cu-uses-examples-table cu-3col-table">';
              html += '<thead><tr>';
              qtHeaders.forEach(function(h) { html += '<th class="cu-ue-head">' + self._escapeHTML(h) + '</th>'; });
              html += '</tr></thead><tbody>';
              (block.rows || []).forEach(function(row) {
                html += '<tr class="cu-ue-row">';
                html += '<td class="cu-ue-quantifier"><em>' + self._escapeHTML(row.quantifier || '') + '</em></td>';
                html += '<td class="cu-ue-use"><ul class="cu-theory-list"><li>' + _bold(row.use || '') + '</li></ul></td>';
                html += '<td class="cu-ue-example">' + _bold(row.example || '') + '</td>';
                html += '</tr>';
              });
              html += '</tbody></table>';
              contentIdx++;
              continue;
            }

            // modalTable: 3-col table (Use | Modal | Example)
            if (block.modalTable) {
              html += '<table class="cu-uses-examples-table cu-modal-table">';
              html += '<thead><tr>';
              html += '<th class="cu-ue-head">Use</th>';
              html += '<th class="cu-ue-head">Modal</th>';
              html += '<th class="cu-ue-head">Example</th>';
              html += '</tr></thead><tbody>';
              (block.rows || []).forEach(function(row) {
                html += '<tr class="cu-ue-row">';
                html += '<td class="cu-ue-use">' + self._escapeHTML(row.use || '') + '</td>';
                html += '<td class="cu-ue-modal"><em>' + self._escapeHTML(row.modal || '') + '</em></td>';
                html += '<td class="cu-ue-example">' + _bold(row.example || '') + '</td>';
                html += '</tr>';
              });
              html += '</tbody></table>';
              contentIdx++;
              continue;
            }

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

            // Generic multi-column table: tableHeaders + rows (array of arrays)
            if (block.tableHeaders && block.rows) {
              var thCols = block.tableHeaders;
              html += '<table class="cu-uses-examples-table"><thead><tr>';
              thCols.forEach(function(h) {
                html += '<th class="cu-ue-head">' + self._escapeHTML(h) + '</th>';
              });
              html += '</tr></thead><tbody>';
              (block.rows || []).forEach(function(row) {
                html += '<tr class="cu-ue-row">';
                (Array.isArray(row) ? row : []).forEach(function(cell, ci) {
                  var cls = ci === 0 ? 'cu-ue-use' : 'cu-ue-example';
                  html += '<td class="' + cls + '">' + _bold(cell) + '</td>';
                });
                html += '</tr>';
              });
              html += '</tbody></table>';
              contentIdx++;
              continue;
            }

            // "Form" subtitle → Cambridge-style structured form block
            if (block.subtitle === 'Form') {
              var formRows   = block.rows   || null;
              var formItems  = block.items  || [];
              var formFormula = block.formula || null;

              html += '<div class="cu-gc-form-row"><div class="cu-gc-form-content"><div class="cu-gc-form-label">Form</div>';

              // Optional formula header (e.g. "have/has + past participle")
              if (formFormula) {
                html += '<div class="cu-gc-form-formula">' + _bold(formFormula) + '</div>';
              }

              if (formRows && formRows.length) {
                // New structured rows format: { label, left, right?, note? }
                var hasTwoCol = formRows.some(function(r) { return r.right; });
                formRows.forEach(function(row) {
                  html += '<div class="cu-gc-form-stmt-row' + (hasTwoCol ? ' cu-gc-form-two-col' : '') + '">' +
                    '<span class="cu-gc-form-stmt-label">' + self._escapeHTML(row.label || '') + '</span>' +
                    '<span class="cu-gc-form-stmt-cell">' + _bold(row.left || '') + '</span>';
                  if (hasTwoCol) {
                    html += '<span class="cu-gc-form-stmt-cell">' + _bold(row.right || '') + '</span>';
                  }
                  html += '</div>';
                  if (row.note) {
                    html += '<div class="cu-gc-form-stmt-note">' + _bold(row.note) + '</div>';
                  }
                });
              } else if (block.bullets && block.bullets.length) {
                // Bullet-list items (non-italic)
                html += '<ul class="cu-theory-list">';
                block.bullets.forEach(function(fi) {
                  html += '<li>' + _bold(fi) + '</li>';
                });
                html += '</ul>';
              } else if (formItems.length) {
                // Legacy items: detect "statement:", "negative:", "question:" prefixes
                var firstItem = formItems[0] || '';
                var isLabeled = /^(statement|negative|question):/i.test(firstItem);
                if (isLabeled) {
                  formItems.forEach(function(fi) {
                    var sep = fi.indexOf(': ');
                    var lbl = sep !== -1 ? fi.substring(0, sep) : '';
                    var cnt = sep !== -1 ? fi.substring(sep + 2) : fi;
                    html += '<div class="cu-gc-form-stmt-row">' +
                      '<span class="cu-gc-form-stmt-label">' + self._escapeHTML(lbl) + '</span>' +
                      '<span class="cu-gc-form-stmt-cell">' + _bold(cnt) + '</span>' +
                    '</div>';
                  });
                } else {
                  // Simple formula items (e.g. "had + past participle")
                  formItems.forEach(function(fi) {
                    html += '<div class="cu-gc-form-item">' + _bold(fi) + '</div>';
                  });
                }
              }

              html += '</div></div>';
              contentIdx++;
              continue;
            }

            // "Use" (singular) subtitle → Use/Example table (auto-split items on ": ")
            if (block.subtitle === 'Use') {
              var useItems = block.items || [];
              var tHeaders = block.tableHeaders;
              var h1 = tHeaders ? tHeaders[0] : 'Use';
              var h2 = tHeaders ? tHeaders[1] : 'Example';
              html += '<table class="cu-uses-examples-table">';
              if (!block.noHeader) {
                html += '<thead><tr><th class="cu-ue-head">' + self._escapeHTML(h1 || '') + '</th><th class="cu-ue-head">' + self._escapeHTML(h2 || '') + '</th></tr></thead>';
              }
              html += '<tbody>';
              useItems.forEach(function(itm) {
                var colonIdx = itm.indexOf(': ');
                var useText = colonIdx !== -1 ? itm.substring(0, colonIdx) : itm;
                var exText  = colonIdx !== -1 ? itm.substring(colonIdx + 2) : '';
                html += '<tr class="cu-ue-row">' +
                  '<td class="cu-ue-use">' + self._escapeHTML(useText) + '</td>' +
                  '<td class="cu-ue-example">' + _bold(exText) + '</td>' +
                '</tr>';
              });
              html += '</tbody></table>';
              contentIdx++;
              continue;
            }

            // "Watch out!" subtitle → styled warning box
            if (block.subtitle === 'Watch out!') {
              html += '<div class="cu-gc-watchout">' +
                '<div class="cu-gc-watchout-header">' +
                  '<span class="material-symbols-outlined cu-gc-watchout-icon">warning</span>' +
                  '<span class="cu-gc-watchout-label">Watch out!</span>' +
                '</div>';
              if (block.description) {
                html += '<div class="cu-gc-watchout-desc">' + _bold(block.description) + '</div>';
              }
              var woItems = block.items || block.examples || block.notes || [];
              if (woItems.length) {
                html += '<ul class="cu-gc-watchout-list">';
                woItems.forEach(function(item) {
                  if (item && typeof item === 'object') {
                    if (item.correct !== undefined) {
                      html += '<li class="cu-gc-wo-correct"><span class="cu-gc-wo-mark">✓</span>' + _bold(item.correct) + '</li>';
                    } else if (item.incorrect !== undefined) {
                      html += '<li class="cu-gc-wo-incorrect"><span class="cu-gc-wo-mark">✗</span><s>' + _bold(item.incorrect) + '</s></li>';
                    } else if (item.note) {
                      html += '<li class="cu-gc-wo-note">' + _bold(item.note) + '</li>';
                    }
                  } else if (typeof item === 'string') {
                    // Detect leading ✓ or ✗ symbols for auto-styling
                    if (/^✓/.test(item)) {
                      html += '<li class="cu-gc-wo-correct"><span class="cu-gc-wo-mark">✓</span>' + _bold(item.replace(/^✓\s*/, '')) + '</li>';
                    } else if (/^[✗✕]|^[Xx]\s/.test(item)) {
                      html += '<li class="cu-gc-wo-incorrect"><span class="cu-gc-wo-mark">✗</span><s>' + _bold(item.replace(/^[✗✕Xx]\s*/, '')) + '</s></li>';
                    } else {
                      html += '<li>' + _bold(item) + '</li>';
                    }
                  }
                });
                html += '</ul>';
              }
              html += '</div>';
              contentIdx++;
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
                (Array.isArray(cat.verbs) ? cat.verbs : (cat.verbs ? cat.verbs.split(',').map(function(s){return s.trim();}) : [])).forEach(function(v) {
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
          var grIdBase = 'gr-' + section.title.replace(/\W+/g, '');
          if (section.subtype === 'matching') {
            html += self._renderCuMatchingExercise(items, grIdBase, secId);
          } else if (section.subtype === 'kwtrans-match') {
            html += self._renderCuKwtransMatchExercise(items, grIdBase, secId);
          } else if (section.subtype === 'mc-inline') {
            html += self._renderCuMcInlineExercise(section, grIdBase, secId);
          } else if (section.subtype === 'yn') {
            html += '<div class="cu-ex-items">';
            html += self._renderCuYnItems(items, grIdBase, secId, section.yesLabel);
            html += '</div>';
            if (items.length) html += self._renderCuExFooter(secId);
          } else if (section.subtype === 'word-spot') {
            html += self._renderCuWordSpotExercise(section, grIdBase, secId);
          } else if (section.subtype === 'find-extra-word') {
            html += self._renderCuFindExtraWordExercise(section, grIdBase, secId);
          } else if (section.subtype === 'comma-placement') {
            html += self._renderCuCommaPlacementExercise(section, grIdBase, secId);
          } else if (section.subtype === 'bold-correct') {
            html += self._renderCuBoldCorrectExercise(section, grIdBase, secId);
          } else if (section.passage && items.length) {
            html += self._renderCuMcPassageExercise(section, grIdBase, secId);
          } else {
            var hasInteractive = items.some(function(it) { return self._itemHasInteractive(it); });
            html += '<div class="cu-ex-items">';
            html += self._renderCuExItemsList(items, 'gr-' + section.title.replace(/\W+/g, ''), secId, section.continuous, section.hideNumBadge, section.textareaAnswer, section.showOkBtn);
            html += '</div>';
            if (hasInteractive) html += self._renderCuExFooter(secId);
          }

          html += '</div>';
        } else if (section.type === 'passage-input') {
          var secId = 'cu-sec-' + idx;
          var grIdBase = 'gr-' + section.title.replace(/\W+/g, '');
          html += '<div class="cu-section cu-exercise" id="' + secId + '">' +
            '<div class="cu-section-title">' + _mi('edit_note') + ' ' + self._escapeHTML(section.title) + '</div>';
          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }
          html += self._renderCuWordBank(section.words);
          html += self._renderCuPassageInputExercise(section, grIdBase, secId);
          html += '</div>';
        }
      });

      return html || '<div class="fe-error">No content available.</div>';
    },

    _renderVocabUnit: function(data) {
      // B2 vocabulary units use sections as an array (same format as grammar units)
      if (Array.isArray(data.sections)) {
        return BentoGrid._renderGrammarUnit(data);
      }
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
          var questions = ex.questions || [];
          var isWordTickExercise = !questions.length && ex.words && ex.words.length && ex.answer;
          if (ex.type !== 'drag-category' && !isWordTickExercise) html += self._renderCuWordBank(ex.words);

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
          } else if (ex.type === 'crossword') {
            // Crossword clue-list exercise
            html += self._renderCuCrosswordExercise(ex, idBase, secId);
          } else if (ex.type === 'matching') {
            // Two-column matching with drag-to-swap (e.g. Exercise E)
            html += self._renderCuMatchingExercise(questions, idBase, secId);
          } else if (ex.type === 'kwtrans-match') {
            // Matching exercise with keyword-row styled left items (e.g. Exercise D)
            html += self._renderCuKwtransMatchExercise(questions, idBase, secId);
          } else if (ex.type === 'kwtrans') {
            // Key-word transformation (reading4 style) (e.g. Exercise K)
            html += '<div class="cu-ex-items">';
            html += self._renderCuKwtransItems(questions, idBase, secId);
            html += '</div>';
            if (questions.length) html += self._renderCuExFooter(secId);
          } else if (ex.type === 'sync') {
            // One-word-for-three-sentences with synced inputs (e.g. Exercise I)
            if (questions.length <= CU_PAGE_SIZE) {
              html += '<div class="cu-ex-items">';
              html += self._renderCuSyncItems(questions, idBase, secId);
              html += '</div>';
            } else {
              // Paginated rendering for larger sets
              var syncPages = [];
              for (var spi = 0; spi < questions.length; spi += CU_PAGE_SIZE) {
                syncPages.push(questions.slice(spi, spi + CU_PAGE_SIZE));
              }
              html += '<nav class="cu-ex-page-dots" aria-label="Exercise pages">';
              for (var spj = 0; spj < syncPages.length; spj++) {
                html += '<button class="cu-ex-pdot' + (spj === 0 ? ' cu-ex-pdot-active' : '') + '" ' +
                  'onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',' + spj + ')" ' +
                  (spj === 0 ? 'aria-current="true" ' : 'aria-current="false" ') +
                  'aria-label="Parte ' + (spj + 1) + '"></button>';
              }
              html += '</nav>';
              syncPages.forEach(function(pageQs, pageIdx) {
                var startOffset = pageIdx * CU_PAGE_SIZE;
                html += '<div class="cu-ex-page' + (pageIdx === 0 ? ' cu-ex-page-active' : '') + '">' +
                  '<div class="cu-ex-items">';
                html += self._renderCuSyncItems(pageQs, idBase + '-sp' + pageIdx, secId, startOffset);
                html += '</div>';
                if (pageIdx < syncPages.length - 1) {
                  var syncRemaining = syncPages.length - pageIdx - 1;
                  html += '<button class="cu-ex-page-more" type="button" onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',' + (pageIdx + 1) + ')">' +
                    '<span class="material-symbols-outlined">expand_circle_down</span> ' +
                    syncRemaining + ' more part' + (syncRemaining > 1 ? 's' : '') + '</button>';
                }
                html += '</div>';
              });
            }
            if (questions.length) html += self._renderCuExFooter(secId);
          } else if (ex.type === 'mc-inline') {
            // Inline multiple-choice: numbered gaps open a modal (e.g. Exercise C, E)
            html += self._renderCuMcInlineExercise(ex, idBase, secId);
          } else if (ex.type === 'find-extra-word') {
            // Find-the-extra-word: clickable words (vocab units use 'questions')
            html += self._renderCuFindExtraWordExercise(ex, idBase, secId, true);
          } else if (ex.passage && questions.length && questions[0] && questions[0].options) {
            // Multiple-choice passage (e.g. Exercise D) – gaps open a modal with A/B/C/D options
            html += self._renderCuMcPassageExercise(ex, idBase, secId);
          } else if (ex.passage) {
            // Passage-based word formation (e.g. Exercise O)
            html += self._renderCuPassageExercise(ex, idBase, secId);
          } else if (!questions.length && ex.words && ex.words.length && ex.answer) {
            // Word-tick exercise: click words to tick them as valid (e.g. Exercise P)
            html += self._renderCuWordTickExercise(ex, idBase, secId);
          } else {
            var hasInteractive = questions.some(function(q) { return self._itemHasInteractive(q); });
            html += '<div class="cu-ex-items">';
            html += self._renderCuExItemsList(questions, idBase, secId, ex.continuous, ex.hideNumBadge);
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
        if (s.type === 'exercise') {
          totalMaxItems += s.subtype === 'passage-input'
            ? (s.answers || []).length
            : (s.items || []).length;
        }
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
          var multiSelectAttr = section.multiSelect ? ' data-multi-select="true"' : '';
          var isPassageInput = section.subtype === 'passage-input';
          var rvMaxItems = isPassageInput ? (section.answers || []).length : rvItems.length;
          html += '<div class="cu-section cu-exercise cu-review-section" id="' + rvSecId + '" data-max-items="' + rvMaxItems + '"' + multiSelectAttr + '>' +
            '<div class="cu-section-title">' + _mi('quiz') + ' ' + self._escapeHTML(section.title) + '</div>';
          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }
          html += self._renderCuWordBank(section.words);
          if (section.passage && rvItems.length && rvItems[0] && rvItems[0].options) {
            // Multiple-choice passage exercise (e.g. Review Exercise A)
            html += self._renderCuMcPassageExercise(section, 'rv-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (isPassageInput) {
            // Continuous-text gap-fill passage exercise
            html += self._renderCuPassageInputExercise(section, 'rv-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (section.subtype === 'matching') {
            // Two-column drag-to-match table (e.g. Review Exercise B)
            html += self._renderCuMatchingExercise(rvItems, 'rv-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (section.subtype === 'find-extra-word') {
            // Find-the-extra-word: clickable words (e.g. Review Exercise A)
            html += self._renderCuFindExtraWordExercise(section, 'rv-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (section.subtype === 'comma-placement') {
            html += self._renderCuCommaPlacementExercise(section, 'rv-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else {
            html += '<div class="cu-ex-items">';
            var hasInteractiveRv = rvItems.some(function(it) { return self._itemHasInteractive(it); });
            html += self._renderCuExItemsList(rvItems, 'rv-' + section.title.replace(/\W+/g, ''), rvSecId, true);
            html += '</div>';
            if (hasInteractiveRv) html += self._renderCuExFooter(rvSecId);
          }
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
          return '<span class="cu-wordbank-item" role="button" tabindex="0" onclick="BentoGrid._clickWordBankItem(this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._clickWordBankItem(this);event.preventDefault();}" title="Click to mark/unmark">' + self._escapeHTML(w) + '</span>';
        }).join('') +
        '</div>';
    },

    _clickWordBankItem: function(el) {
      el.classList.toggle('cu-wordbank-used');
    },

    _lastFocusedCuInput: null,

    _toggleWordBankItem: function(el) {
      // If a gap input in the same section is focused/was last active, fill it with this word
      var sec = el.closest('.cu-section');
      var target = null;
      if (sec) {
        // Prefer currently focused input
        var active = document.activeElement;
        if (active && active.classList.contains('cu-gap-input') && sec.contains(active) && !active.disabled) {
          target = active;
        } else if (BentoGrid._cuLastFocusedGap && sec.contains(BentoGrid._cuLastFocusedGap) && !BentoGrid._cuLastFocusedGap.disabled) {
          target = BentoGrid._cuLastFocusedGap;
        }
      }
      if (target) {
        target.value = el.textContent.trim();
        BentoGrid._resizeCuInput(target);
        el.classList.add('cu-wordbank-used');
        BentoGrid._saveCuExSectionState(target.closest('.cu-section'));
        return;
      }
      el.classList.toggle('cu-wordbank-used');
    },

    // Renders a word-tick exercise: a grid of words the student ticks as valid.
    // Used for exercises like Exercise P where there are no sentence questions,
    // just a list of words to evaluate with a comma-separated answer string.
    _renderCuWordTickExercise: function(ex, idBase, secId) {
      var self = this;
      var words = ex.words || [];
      var answerWords = (ex.answer || '').split(/,\s*/).map(function(w) { return w.trim().toLowerCase(); }).filter(Boolean);
      var html = '<div class="cu-word-tick-grid" id="' + secId + '-wtg">';
      words.forEach(function(word, idx) {
        var wId = idBase + '-wt-' + idx;
        html += '<button class="cu-word-tick-btn" id="' + wId + '" data-word="' + self._escapeHTML(word) + '" data-answer-words="' + self._escapeHTML(answerWords.join(',')) + '" onclick="BentoGrid._toggleWordTick(this)" type="button">' +
          self._escapeHTML(word) +
          '</button>';
      });
      html += '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    _toggleWordTick: function(btn) {
      if (btn.disabled) return;
      btn.classList.toggle('cu-word-tick-selected');
      BentoGrid._saveCuExSectionState(btn.closest('.cu-section'));
    },

    // Renders a word-spot exercise: a passage where certain words (marked with [[word]])
    // are clickable. Students click the ones they think are wrong/unnecessary.
    // Data: { passage: '...[[word]]...', answer: '1,3,5', instructions: '...' }
    // When freeWordSpot is true, ALL words in the passage are clickable; [[word]] marks
    // the correct answers while all other tokens are non-answer clickable words.
    _renderCuWordSpotExercise: function(ex, idBase, secId) {
      var self = this;
      var passage = ex.passage || '';
      var counterId = idBase + '-ws-count';
      var passageHtml = '';
      var totalWrong;

      if (ex.freeWordSpot) {
        // Free mode: every whitespace-separated token is a clickable span.
        // [[word]] tokens have data-ws-answer="1"; all others have data-ws-answer="0".
        // totalWrong is counted during segment processing (no separate regex scan needed).
        totalWrong = 0;
        var wordCount = 0;
        // Split passage into segments: [[answer-word]] vs plain text chunks
        var segments = [];
        var wsRegex = /\[\[([^\]]+)\]\]/g;
        var lastIdx = 0;
        var wsMatch;
        while ((wsMatch = wsRegex.exec(passage)) !== null) {
          if (wsMatch.index > lastIdx) {
            segments.push({ type: 'text', val: passage.slice(lastIdx, wsMatch.index) });
          }
          segments.push({ type: 'answer', val: wsMatch[1] });
          lastIdx = wsMatch.index + wsMatch[0].length;
        }
        if (lastIdx < passage.length) {
          segments.push({ type: 'text', val: passage.slice(lastIdx) });
        }
        segments.forEach(function(seg) {
          if (seg.type === 'answer') {
            wordCount++;
            totalWrong++;
            passageHtml += '<span class="cu-ws-word" ' +
              'data-ws-idx="' + wordCount + '" ' +
              'data-ws-answer="1" ' +
              'data-counter-id="' + self._escapeHTML(counterId) + '" ' +
              'onclick="BentoGrid._toggleWordSpot(this)" ' +
              'role="button" tabindex="0" ' +
              'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._toggleWordSpot(this);event.preventDefault();}">' +
              self._escapeHTML(seg.val) + '</span>';
          } else {
            // Split plain text into whitespace runs and word tokens
            var textParts = seg.val.split(/(\s+)/);
            textParts.forEach(function(part) {
              if (part === '' || /^\s+$/.test(part)) {
                passageHtml += self._escapeHTML(part);
              } else {
                wordCount++;
                passageHtml += '<span class="cu-ws-word" ' +
                  'data-ws-idx="' + wordCount + '" ' +
                  'data-ws-answer="0" ' +
                  'data-counter-id="' + self._escapeHTML(counterId) + '" ' +
                  'onclick="BentoGrid._toggleWordSpot(this)" ' +
                  'role="button" tabindex="0" ' +
                  'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._toggleWordSpot(this);event.preventDefault();}">' +
                  self._escapeHTML(part) + '</span>';
              }
            });
          }
        });
      } else {
        // Standard mode: only [[word]]-marked tokens are clickable.
        var wrongIndices = (ex.answer || '').split(',').map(function(a) { return parseInt(a.trim()); }).filter(function(n) { return !isNaN(n); });
        totalWrong = wrongIndices.length;
        var wordIdx = 0;
        // Split on [[word]] markers; odd indices are the clickable words
        var parts = passage.split(/\[\[([^\]]+)\]\]/g);
        for (var i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            passageHtml += self._escapeHTML(parts[i]);
          } else {
            wordIdx++;
            var isAnswer = wrongIndices.indexOf(wordIdx) !== -1;
            passageHtml += '<span class="cu-ws-word" ' +
              'data-ws-idx="' + wordIdx + '" ' +
              'data-ws-answer="' + (isAnswer ? '1' : '0') + '" ' +
              'data-counter-id="' + self._escapeHTML(counterId) + '" ' +
              'onclick="BentoGrid._toggleWordSpot(this)" ' +
              'role="button" tabindex="0" ' +
              'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._toggleWordSpot(this);event.preventDefault();}">' +
              self._escapeHTML(parts[i]) +
              '</span>';
          }
        }
      }

      var html = '<div class="cu-ws-counter">' +
        '<span class="material-symbols-outlined">check_circle</span> ' +
        '<span id="' + self._escapeHTML(counterId) + '">0</span> / ' + totalWrong +
        '</div>' +
        '<div class="cu-ws-passage" id="' + self._escapeHTML(idBase) + '-ws"' +
        (ex.freeWordSpot ? ' data-free-ws="true"' : '') + '>' +
        passageHtml +
        '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    _toggleWordSpot: function(span) {
      if (span.getAttribute('data-ws-disabled') === '1') return;
      span.classList.toggle('cu-ws-selected');
      var counterId = span.getAttribute('data-counter-id');
      if (counterId) {
        var counter = document.getElementById(counterId);
        if (counter) {
          var sec = span.closest('.cu-section');
          if (sec) counter.textContent = sec.querySelectorAll('.cu-ws-word.cu-ws-selected').length;
        }
      }
      BentoGrid._saveCuExSectionState(span.closest('.cu-section'));
    },

    _isCuCommaBoundaryAllowed: function(leftToken, rightToken) {
      var left = (leftToken || '').trim();
      var right = (rightToken || '').trim();
      if (!left || !right) return false;
      if (/[.,]$/.test(left)) return false;
      if (/^[.,]/.test(right)) return false;
      return true;
    },

    _getCuCommaAnswerSlots: function(sentence, answer) {
      var ans = (answer || '').trim();
      if (!ans || /^no commas needed/i.test(ans)) return [];
      var baseTokens = (sentence || '').trim().split(/\s+/).filter(Boolean);
      var ansTokensRaw = ans.split(/\s+/).filter(Boolean);
      if (!baseTokens.length || baseTokens.length !== ansTokensRaw.length) return [];

      function normalizeToken(tok) {
        return (tok || '').toLowerCase().replace(/,+$/, '');
      }

      var ansTokens = [];
      var commaAfter = [];
      for (var i = 0; i < ansTokensRaw.length; i++) {
        var tok = ansTokensRaw[i];
        commaAfter.push(/,+$/.test(tok));
        ansTokens.push(tok.replace(/,+$/, ''));
        if (normalizeToken(baseTokens[i]) !== normalizeToken(ansTokens[i])) return [];
      }

      var slots = [];
      for (var k = 0; k < baseTokens.length - 1; k++) {
        if (!commaAfter[k]) continue;
        if (BentoGrid._isCuCommaBoundaryAllowed(baseTokens[k], baseTokens[k + 1])) slots.push(k);
      }
      return slots;
    },

    _renderCuCommaPlacementExercise: function(section, idBase, secId) {
      var self = this;
      var items = section.items || [];
      var html = '<div class="cu-comma-exercise cu-ex-items">';
      items.forEach(function(item, idx) {
        var sentence = (item.sentence || '').trim();
        var tokens = sentence.split(/\s+/).filter(Boolean);
        var answerSlots = self._getCuCommaAnswerSlots(sentence, item.answer || '');
        html += '<div class="cu-comma-item" data-comma-answer="' + self._escapeHTML(answerSlots.join(',')) + '">' +
          '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
          '<div class="cu-comma-sentence">';
        tokens.forEach(function(tok, ti) {
          html += '<span class="cu-comma-token">' + self._escapeHTML(tok) + '</span>';
          if (ti < tokens.length - 1 && BentoGrid._isCuCommaBoundaryAllowed(tok, tokens[ti + 1])) {
            var slotId = idBase + '-cp-' + idx + '-' + ti;
            html += '<button type="button" id="' + self._escapeHTML(slotId) + '" class="cu-comma-slot" ' +
              'data-comma-slot-idx="' + ti + '" aria-pressed="false" ' +
              'onclick="BentoGrid._toggleCuCommaSlot(this)">,</button>';
          }
        });
        html += '</div></div>';
      });
      html += '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    _toggleCuCommaSlot: function(btn) {
      if (btn.disabled || btn.getAttribute('data-comma-disabled') === '1') return;
      btn.classList.toggle('cu-comma-selected');
      btn.setAttribute('aria-pressed', btn.classList.contains('cu-comma-selected') ? 'true' : 'false');
      BentoGrid._saveCuExSectionState(btn.closest('.cu-section'));
    },

    // Renders a find-the-extra-word exercise: each sentence's words are clickable.
    // Students click the word they think is extra. Items with answer "OK" show plain text
    // with no interaction required — leaving them blank on Check counts as correct.
    // Data: { items: [{sentence, answer}] } (grammar) or questions (vocab, useQuestions=true)
    _renderCuFindExtraWordExercise: function(ex, idBase, secId, useQuestions) {
      var self = this;
      var items = useQuestions ? (ex.questions || []) : (ex.items || []);
      var onlyMarkedWordClickable = !!ex.onlyMarkedWordClickable;

      // Strip **bold** markers, returning plain text
      function stripBold(str) {
        return (str || '').replace(/\*\*([^*]+)\*\*/g, '$1');
      }

      // Split sentence into tokens (space-separated), preserving attached punctuation
      function tokenize(sentence) {
        return sentence.split(/\s+/).filter(Boolean);
      }

      // Strip leading/trailing non-word punctuation for comparison
      function wordCore(token) {
        return token.replace(/^[^\w\u2019']+|[^\w\u2019']+$/g, '').toLowerCase();
      }

      var html = '<div class="cu-few-exercise">';
      // Optional passage title
      if (ex.passage && typeof ex.passage === 'string' && ex.items) {
        html += '<div class="cu-few-passage-title">' + self._escapeHTML(ex.passage) + '</div>';
      }
      html += '<div class="cu-ex-items">';

      items.forEach(function(item, idx) {
        var answer = (item.answer || '').trim();
        var isOkItem = answer.toUpperCase() === 'OK';

        // Detect [word] bracket notation: find the index of the bracketed token in the
        // original sentence (after stripping ** bold markers) so that when the same word
        // appears more than once only the marked occurrence is treated as the answer.
        var bracketAnswerIdx = -1;
        var origTokens = (item.sentence || '').replace(/\*\*/g, '').split(/\s+/).filter(Boolean);
        for (var bi = 0; bi < origTokens.length; bi++) {
          if (origTokens[bi].indexOf('[') !== -1 && origTokens[bi].indexOf(']') !== -1) {
            bracketAnswerIdx = bi;
            break;
          }
        }

        // Build the display sentence: strip bold markers and remove [ ] brackets (keep inner text)
        var rawSentence = stripBold(item.sentence || '').replace(/\[([^\]]+)\]/g, '$1');

        html += '<div class="cu-few-item' + (isOkItem ? ' cu-few-ok-item' : '') + '" ' +
          'data-answer="' + self._escapeHTML(answer) + '">';
        if (!ex.hideNumBadge) html += '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>';

        // All items: clickable words + OK button to the right outside the sentence block
        var tokens = tokenize(rawSentence);
        var answerCore = isOkItem ? '' : answer.toLowerCase();
        html += '<div class="cu-few-sentence-row">';
        html += '<div class="cu-few-sentence">';
        tokens.forEach(function(token, ti) {
          var isAnswer;
          if (isOkItem) {
            isAnswer = '0';
          } else if (bracketAnswerIdx !== -1) {
            isAnswer = (ti === bracketAnswerIdx) ? '1' : '0';
          } else {
            isAnswer = (wordCore(token) === answerCore) ? '1' : '0';
          }
          var isBracketMarkedToken = bracketAnswerIdx !== -1 && ti === bracketAnswerIdx;
          var isClickableToken = !onlyMarkedWordClickable || isBracketMarkedToken;
          if (isClickableToken) {
            html += '<span class="cu-few-word" ' +
              'data-few-is-answer="' + isAnswer + '" ' +
              'onclick="BentoGrid._toggleFewWord(this)" ' +
              'role="button" tabindex="0" ' +
              'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._toggleFewWord(this);event.preventDefault();}">' +
              self._escapeHTML(token) +
              '</span>';
          } else {
            html += '<span class="cu-few-word-static">' + self._escapeHTML(token) + '</span>';
          }
        });
        html += '</div>';
        html += '<button class="cu-few-ok-btn" onclick="BentoGrid._toggleFewOk(this)" ' +
          'aria-pressed="false">OK</button>';
        html += '</div>'; // cu-few-sentence-row

        html += '</div>'; // cu-few-item
      });

      html += '</div>'; // cu-ex-items
      html += self._renderCuExFooter(secId);
      html += '</div>'; // cu-few-exercise
      return html;
    },

    _toggleFewWord: function(span) {
      if (span.getAttribute('data-few-disabled') === '1') return;
      var item = span.closest('.cu-few-item');
      if (!item) return;
      var wasSelected = span.classList.contains('cu-few-selected');
      // Deselect all words in this item first
      item.querySelectorAll('.cu-few-word').forEach(function(w) { w.classList.remove('cu-few-selected'); });
      // Toggle: select only if it wasn't already selected
      if (!wasSelected) {
        span.classList.add('cu-few-selected');
        // Deselect OK button when a word is chosen
        var okBtn = item.querySelector('.cu-few-ok-btn');
        if (okBtn) { okBtn.classList.remove('cu-few-ok-selected'); okBtn.setAttribute('aria-pressed', 'false'); }
      }
      BentoGrid._saveCuExSectionState(item.closest('.cu-section'));
    },

    _toggleFewOk: function(btn) {
      if (btn.disabled) return;
      var item = btn.closest('.cu-few-item');
      btn.classList.toggle('cu-few-ok-selected');
      btn.setAttribute('aria-pressed', btn.classList.contains('cu-few-ok-selected') ? 'true' : 'false');
      // Deselect any selected word when OK is toggled on
      if (btn.classList.contains('cu-few-ok-selected') && item) {
        item.querySelectorAll('.cu-few-word').forEach(function(w) { w.classList.remove('cu-few-selected'); });
      }
      BentoGrid._saveCuExSectionState(btn.closest('.cu-section'));
    },

    // Bold-correct exercise: each item shows the sentence with one bold word,
    // a text input for the correction, and an OK button (available for ALL items).
    _renderCuBoldCorrectExercise: function(section, idBase, secId) {
      var self = this;
      var items = section.items || [];
      var useTextarea = !!section.textareaAnswer;

      // Render sentence: convert **...** to <strong> and escape the rest
      function renderSentence(sentence) {
        var parts = (sentence || '').split(/\*\*([^*]+)\*\*/g);
        var out = '';
        for (var i = 0; i < parts.length; i++) {
          if (i % 2 === 1) {
            out += '<strong>' + self._escapeHTML(parts[i]) + '</strong>';
          } else {
            out += self._escapeHTML(parts[i]);
          }
        }
        return out;
      }

      var html = '<div class="cu-bc-exercise cu-ex-items">';
      items.forEach(function(item, idx) {
        var answer = (item.answer || '').trim();
        var inputId = idBase + '-bc' + idx;
        var inputHtml = useTextarea
          ? '<textarea class="cu-gap-input cu-bc-input cu-gap-textarea" id="' + inputId + '" ' +
              'autocomplete="off" autocorrect="off" spellcheck="false" rows="2" ' +
              'oninput="BentoGrid._onCuBcInput(this);BentoGrid._resizeCuInput(this)" ' +
              'placeholder="Rewrite the full sentence correctly…"></textarea>'
          : '<input type="text" class="cu-gap-input cu-bc-input" id="' + inputId + '" ' +
              'autocomplete="off" autocorrect="off" spellcheck="false" ' +
              'oninput="BentoGrid._onCuBcInput(this)" ' +
              'placeholder="correction…" />';
        html += '<div class="cu-bc-item' + (useTextarea ? ' cu-bc-item-textarea' : '') + '" data-answer="' + self._escapeHTML(answer) + '">' +
          '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
          '<div class="cu-bc-row' + (useTextarea ? ' cu-bc-row-textarea' : '') + '">' +
            '<div class="cu-bc-sentence">' + renderSentence(item.sentence || '') + '</div>' +
            '<div class="cu-bc-controls' + (useTextarea ? ' cu-bc-controls-textarea' : '') + '">' +
              inputHtml +
              '<button class="cu-bc-ok-btn" onclick="BentoGrid._toggleCuBcOk(this)" ' +
                'aria-pressed="false" type="button">OK</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    _onCuBcInput: function(input) {
      // When user types, deselect OK button for this item
      var item = input.closest('.cu-bc-item');
      if (item) {
        var okBtn = item.querySelector('.cu-bc-ok-btn');
        if (okBtn && okBtn.classList.contains('cu-bc-ok-selected')) {
          okBtn.classList.remove('cu-bc-ok-selected');
          okBtn.setAttribute('aria-pressed', 'false');
        }
      }
      BentoGrid._saveCuExSectionState(input.closest('.cu-section'));
    },

    _toggleCuBcOk: function(btn) {
      if (btn.disabled) return;
      var item = btn.closest('.cu-bc-item');
      btn.classList.toggle('cu-bc-ok-selected');
      btn.setAttribute('aria-pressed', btn.classList.contains('cu-bc-ok-selected') ? 'true' : 'false');
      // Clear input when OK is toggled on
      if (btn.classList.contains('cu-bc-ok-selected') && item) {
        var input = item.querySelector('.cu-bc-input');
        if (input) input.value = '';
      }
      BentoGrid._saveCuExSectionState(btn.closest('.cu-section'));
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
      sec.removeAttribute('data-checked');
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
      // Reset crossword letter boxes
      sec.querySelectorAll('.cu-cw-letter').forEach(function(b) {
        b.value = '';
        b.disabled = false;
        b.classList.remove('cu-cw-letter-correct', 'cu-cw-letter-incorrect', 'cu-input-show-correct');
        b.removeAttribute('data-saved-cw-value');
      });
      // Remove crossword answer-reveal divs inserted by _doCheckCuExSection
      sec.querySelectorAll('.cu-cw-answer-reveal').forEach(function(el) { el.remove(); });
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
      // Reset word-tick buttons
      sec.querySelectorAll('.cu-word-tick-btn').forEach(function(btn) {
        btn.disabled = false;
        btn.classList.remove('cu-word-tick-selected', 'cu-word-tick-correct', 'cu-word-tick-incorrect', 'cu-word-tick-reveal');
      });
      // Reset word-spot spans
      sec.querySelectorAll('.cu-ws-word').forEach(function(span) {
        span.removeAttribute('data-ws-disabled');
        span.classList.remove('cu-ws-selected', 'cu-ws-correct', 'cu-ws-incorrect', 'cu-ws-reveal');
      });
      var wsCounter = sec.querySelector('.cu-ws-counter span[id]');
      if (wsCounter) wsCounter.textContent = '0';
      // Reset comma-placement items
      sec.querySelectorAll('.cu-comma-item').forEach(function(item) {
        item.classList.remove('cu-comma-item-correct', 'cu-comma-item-incorrect');
      });
      sec.querySelectorAll('.cu-comma-slot').forEach(function(slot) {
        slot.disabled = false;
        slot.removeAttribute('data-comma-disabled');
        slot.removeAttribute('data-saved-selected');
        slot.classList.remove('cu-comma-selected', 'cu-comma-correct', 'cu-comma-incorrect', 'cu-comma-reveal', 'cu-comma-show-correct');
        slot.setAttribute('aria-pressed', 'false');
      });
      // Reset find-extra-word items
      sec.querySelectorAll('.cu-few-word').forEach(function(span) {
        span.removeAttribute('data-few-disabled');
        span.classList.remove('cu-few-selected', 'cu-few-correct', 'cu-few-incorrect', 'cu-few-reveal');
      });
      sec.querySelectorAll('.cu-few-item').forEach(function(item) {
        item.classList.remove('cu-few-ok-correct', 'cu-few-ok-reveal');
        var okBtn = item.querySelector('.cu-few-ok-btn');
        if (okBtn) {
          okBtn.disabled = false;
          okBtn.classList.remove('cu-few-ok-selected', 'cu-few-ok-correct', 'cu-few-ok-incorrect', 'cu-few-ok-reveal');
        }
      });
      // Reset bold-correct items
      sec.querySelectorAll('.cu-bc-item').forEach(function(item) {
        item.classList.remove('cu-bc-item-correct', 'cu-bc-item-incorrect');
        var okBtn = item.querySelector('.cu-bc-ok-btn');
        if (okBtn) {
          okBtn.disabled = false;
          okBtn.classList.remove('cu-bc-ok-selected', 'cu-bc-ok-correct', 'cu-bc-ok-incorrect', 'cu-bc-ok-reveal');
          okBtn.setAttribute('aria-pressed', 'false');
        }
        // Remove reveal divs injected during check or show-answers
        item.querySelectorAll('.cu-bc-reveal').forEach(function(el) { el.remove(); });
        // Restore input visibility if hidden during show-answers
        var input = item.querySelector('.cu-bc-input');
        if (input) input.style.display = '';
      });
      // Reset MC gap pills
      sec.querySelectorAll('.cu-mc-gap-pill').forEach(function(pill) {
        pill.classList.remove('cu-mc-gap-pill-filled', 'cu-mc-gap-pill-correct', 'cu-mc-gap-pill-incorrect');
        pill.innerHTML = CU_MC_BLANK;
      });
      // Reset MC passage gaps
      sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
        gap.classList.remove('cu-mc-passage-gap-answered', 'cu-mc-passage-gap-correct', 'cu-mc-passage-gap-incorrect', 'cu-mc-passage-gap-show-correct');
        gap.style.pointerEvents = '';
        var slot = gap.querySelector('.cu-mc-passage-gap-slot');
        if (slot) { BentoGrid._applyMcPassageGapSlot(gap, '', 'cu-mc-passage-gap-slot'); }
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
      // Reset drag-category exercises: move chips back to pool and re-enable drag
      sec.querySelectorAll('.cu-drag-category-exercise').forEach(function(exEl) {
        var pool = exEl.querySelector('.cu-drag-pool');
        exEl.querySelectorAll('.cu-drag-zone').forEach(function(zone) {
          zone.classList.remove('cu-drag-zone-over');
        });
        exEl.querySelectorAll('.cu-drag-chip').forEach(function(chip) {
          chip.classList.remove('cu-drag-chip-correct', 'cu-drag-chip-incorrect', 'cu-drag-chip-unplaced');
          chip.setAttribute('draggable', 'true');
          chip.style.cursor = '';
          if (pool) pool.appendChild(chip);
        });
      });
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
    _renderCuYnItems: function(questions, idBase, secId, yesLabel) {
      var self = this;
      if (!questions || !questions.length) return '';
      var html = '';
      var yesText = yesLabel || 'OK';
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      questions.forEach(function(item, idx) {
        var iId = idBase + '-yn-' + idx;
        var contextHtml = item.context ? '<div class="cu-ex-context">' + self._escapeHTML(item.context) + '</div>' : '';
        html += '<div class="cu-ex-item cu-yn-item" data-answer="' + self._escapeHTML(item.answer || '') + '">' +
          '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
          '<div class="cu-yn-row">' +
            '<div class="cu-yn-content">' +
              contextHtml +
              '<div class="cu-ex-sentence cu-yn-sentence">' + _bold(item.sentence || '') + '</div>' +
            '</div>' +
            '<div class="cu-yn-buttons">' +
              '<button class="cu-yn-btn cu-yn-yes" data-group="' + iId + '" data-yn="YES" onclick="BentoGrid._selectCuYn(this)" type="button">' + self._escapeHTML(yesText) + '</button>' +
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
      // For single-button groups (e.g. tick-only OK button), allow toggle
      if (siblings.length === 1) {
        btn.classList.toggle('cu-yn-selected');
      } else {
        siblings.forEach(function(s) { s.classList.remove('cu-yn-selected'); });
        btn.classList.add('cu-yn-selected');
      }
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
    _renderCuSyncItems: function(questions, idBase, secId, offset) {
      var self = this;
      if (!questions || !questions.length) return '';
      var startNum = offset || 0;
      var html = '';
      questions.forEach(function(item, idx) {
        var globalIdx = startNum + idx;
        var syncGroup = idBase + '-sync-' + globalIdx;
        var sentences = Array.isArray(item.sentences) ? item.sentences : (item.sentence || '').split('\n');
        html += '<div class="cu-ex-item cu-sync-item" data-answer="' + self._escapeHTML(item.answer || '') + '">' +
          '<div class="cu-ex-num-badge">' + (globalIdx + 1) + '</div>' +
          '<div class="cu-sync-sentences">';
        sentences.forEach(function(sent, sIdx) {
          var gapId = syncGroup + '-g' + sIdx;
          var sentHtml = self._escapeHTML(sent).replace(/……+|\.{5,}/g, function() {
            return '<input type="text" id="' + gapId + '" class="cu-gap-input cu-sync-input" data-sync-group="' + syncGroup + '" placeholder="..." onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._syncInputGroup(this);BentoGrid._resizeCuInput(this)">';
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
    // `ex.continuous`: render all sentences as a single email/passage block (no per-item badges).
    // `ex.sentencePaddingTop`: add 10px top padding to each cu-ex-sentence.
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

      var extraClass = ex.sentencePaddingTop ? ' cu-mc-inline-sentence-pt' : '';
      var html = '<div class="cu-mc-passage-exercise cu-mc-inline-exercise' + extraClass + '" id="' + idBase + '-mcinline">';

      function buildGapHtml(sentence) {
        var escaped = self._escapeHTML(sentence);
        // Phase 1: detect (N) ...... FIXED_TEXT ...... and render a split two-slot pill
        escaped = escaped.replace(
          /\((\d+)\)\s*(?:_{6,}|\u2026{2,}|\.{6,})\s*((?:(?!\(\d+\)\s*(?:_{6,}|\u2026{2,}|\.{6,})).)+?)\s*(?:_{6,}|\u2026{2,}|\.{6,})/g,
          function(_, num, midText) {
            var gapNum = parseInt(num);
            var pillId = idBase + '-mcil-' + gapNum;
            return '<span class="cu-mc-passage-gap cu-mc-passage-gap-split" id="' + pillId + '" ' +
              'data-gap-num="' + gapNum + '" data-sec-id="' + secId + '" ' +
              'data-answer="' + self._escapeHTML((qMap[gapNum] || {}).answer || '') + '" ' +
              'onclick="BentoGrid._openCuMcModal(\'' + secId + '\',' + gapNum + ')" ' +
              'role="button" tabindex="0">' +
              '<span class="cu-mc-passage-gap-num">' + num + '</span>' +
              '<span class="cu-mc-passage-gap-slot-pre"></span>' +
              '<span class="cu-mc-passage-gap-mid">' + midText + '</span>' +
              '<span class="cu-mc-passage-gap-slot-post"></span>' +
              '<span class="cu-mc-passage-gap-slot" style="display:none"></span>' +
            '</span>';
          }
        );
        // Phase 2: handle remaining single-slot gaps: (N) ......
        return escaped.replace(
          /\((\d+)\)\s*(?:_{6,}|\u2026{2,}|\.{6,})/g,
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
      }

      if (ex.continuous) {
        // Render all sentences as a continuous email block without per-item badges
        html += '<div class="cu-mc-inline-continuous">';
        questions.forEach(function(q) {
          html += '<p class="cu-ex-sentence">' + buildGapHtml(q.sentence || '') + '</p>';
        });
        html += '</div>';
      } else {
        html += '<div class="cu-mc-inline-items">';
        questions.forEach(function(q, qi) {
          html += '<div class="cu-mc-inline-item">' +
            (ex.hideNumBadge ? '' : '<div class="cu-ex-num-badge">' + (qi + 1) + '</div>') +
            '<div class="cu-ex-sentence">' + buildGapHtml(q.sentence || '') + '</div>' +
          '</div>';
        });
        html += '</div>';
      }

      html += '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    // --- Passage-based word formation renderer (exercise O/N style) ---
    _renderCuPassageExercise: function(ex, idBase, secId) {
      var self = this;
      var passage = ex.passage || '';
      var questions = ex.questions || [];
      // Build maps from gap number to correct answer and optional hint word.
      // Question sentence formats supported:
      //   …(N)… (WORD)  – old explicit format
      //   (N) ...... (WORD) – dot-gap format with trailing hint word
      //   (N) ...... – dot-gap without hint word
      var answerMap = {};
      var hintMap = {};
      questions.forEach(function(q, qi) {
        var sent = q.sentence || '';
        // Extract gap number: match (N) anywhere at the start
        var numMatch = sent.match(/\((\d+)\)/);
        var num = numMatch ? parseInt(numMatch[1]) : (qi + 1);
        answerMap[num] = q.answer || '';
        // Extract trailing ALL-CAPS hint word in parens at end of sentence.
        // Matches "(WORD)" or "(WORD1 / WORD2)" e.g. "(SAY)", "(SPEAK)", "(EXPRESS / EXPRESSIVE)"
        var hintMatch = sent.match(/\(([A-Z]{2,}(?:\s*\/\s*[A-Z]+)*)\)\s*$/);
        if (hintMatch) hintMap[num] = hintMatch[1];
      });
      // Fallback: use positional answers array when questions is empty
      // Supports "N word" format (e.g. "1 parenthood") or plain strings
      if (!questions.length && ex.answers && ex.answers.length) {
        ex.answers.forEach(function(ans, idx) {
          var raw = String(ans).replace(/^\d+\s+/, '');
          answerMap[idx + 1] = raw;
        });
      }
      // Helper to build a gap pill HTML
      function makeGapPill(num, hintWord) {
        var gId = idBase + '-p' + num;
        var ans = self._escapeHTML(answerMap[num] || '');
        return '<span class="cu-wf-gap-wrap">' +
          '<span class="cu-hint-pill">' +
            '<span class="cu-hint-pill-num">' + num + '</span>' +
            '<input type="text" id="' + gId + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." ' +
              'data-passage-num="' + num + '" data-answer="' + ans + '" ' +
              'onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)">' +
            (hintWord ? '<span class="cu-hint-pill-word cu-wf-pill-word">' + self._escapeHTML(hintWord) + '</span>' : '') +
          '</span>' +
        '</span>';
      }
      // Render passage: replace both gap formats with interactive pill widgets.
      // Format A (old): …(N)… (WORD)
      // Format B (new): (N) ___ or (N) ...... optionally followed by (CAPS) hint inline
      var passageHtml = self._escapeHTML(passage)
        .replace(/…\((\d+)\)…\s*\(([A-Z]+)\)/g, function(_, num, hintWordInPassage) {
          return makeGapPill(parseInt(num), hintWordInPassage || hintMap[parseInt(num)] || null);
        })
        .replace(/\((\d+)\)\s*(?:_{2,}|[.…]{5,})\s*\(([A-Z]{2,}(?:\s*\/\s*[A-Z]+)*)\)/g, function(_, num, hintWord) {
          return makeGapPill(parseInt(num), hintWord || hintMap[parseInt(num)] || null);
        })
        .replace(/\((\d+)\)\s*(?:_{2,}|[.…]{5,})/g, function(_, num) {
          return makeGapPill(parseInt(num), hintMap[parseInt(num)] || null);
        });
      var titleHtml = ex.passageTitle
        ? '<div class="cu-passage-title">' + self._escapeHTML(ex.passageTitle) + '</div>'
        : '';
      var html = '<div class="cu-passage-exercise" id="' + idBase + '-passage">' +
        titleHtml +
        '<div class="cu-passage-text">' + passageHtml + '</div>' +
        '</div>';
      if (questions.length || (ex.answers && ex.answers.length)) html += self._renderCuExFooter(secId);
      return html;
    },

    // --- Passage-input exercise renderer (Exercise C style: word bank + passage with text inputs) ---
    _renderCuPassageInputExercise: function(ex, idBase, secId) {
      var self = this;
      var passage = ex.passage || '';
      var answers = ex.answers || [];
      var hints = ex.hints || [];
      var answerMap = {};
      var hintMap = {};
      answers.forEach(function(ans, idx) { answerMap[idx + 1] = ans; });
      hints.forEach(function(h, idx) { hintMap[idx + 1] = h; });
      var passageHtml = self._escapeHTML(passage)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(
        /\((\d+)\)\s*(?:\.{6,}|…{2,})/g,
        function(_, num) {
          var gapNum = parseInt(num);
          var gId = idBase + '-pi' + gapNum;
          var ans = self._escapeHTML(answerMap[gapNum] || '');
          var hintWord = hintMap[gapNum] || null;
          return '<span class="cu-pi-gap-wrap">' +
            '<span class="cu-hint-pill cu-pi-pill">' +
              '<span class="cu-hint-pill-num">' + num + '</span>' +
              '<input type="text" id="' + gId + '" class="cu-gap-input cu-pi-input" placeholder="..." data-passage-num="' + num + '" data-answer="' + ans + '" oninput="BentoGrid._resizeCuInput(this)">' +
              (hintWord ? '<span class="cu-hint-pill-word cu-wf-pill-word">' + self._escapeHTML(hintWord) + '</span>' : '') +
            '</span>' +
          '</span>';
        }
      ).replace(/\n/g, '<br>');
      var piTitleHtml = ex.passageTitle
        ? '<div class="cu-passage-title">' + self._escapeHTML(ex.passageTitle) + '</div>'
        : '';
      var html = '<div class="cu-passage-exercise" id="' + idBase + '-pi-passage">' +
        piTitleHtml +
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

      function renderGroupSection(grp) {
        var out = '<div class="cu-group-section">';
        if (grp.words && grp.words.length) {
          out += '<div class="cu-group-wordbank">';
          out += '<span class="material-symbols-outlined">view_list</span>';
          grp.words.forEach(function(w) {
            out += '<span class="cu-wordbank-item" role="button" tabindex="0" onclick="BentoGrid._toggleWordBankItem(this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){BentoGrid._toggleWordBankItem(this);event.preventDefault();}" title="Mark as used">' + self._escapeHTML(w) + '</span>';
          });
          out += '</div>';
        }
        var questions = grp.questions || [];
        out += '<div class="cu-ex-items">';
        questions.forEach(function(item) {
          out += self._renderCourseExItem(item, globalIdx, idBase + '-' + globalIdx);
          globalIdx++;
        });
        out += '</div>';
        out += '</div>';
        return out;
      }

      if (groups.length > 1) {
        // Paginate: one page per group
        html += '<nav class="cu-ex-page-dots" aria-label="Exercise pages">';
        for (var p = 0; p < groups.length; p++) {
          html += '<button class="cu-ex-pdot' + (p === 0 ? ' cu-ex-pdot-active' : '') + '" ' +
            'onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',' + p + ')" ' +
            (p === 0 ? 'aria-current="true" ' : 'aria-current="false" ') +
            'aria-label="Parte ' + (p + 1) + '"></button>';
        }
        html += '</nav>';
        groups.forEach(function(grp, grpIdx) {
          html += '<div class="cu-ex-page' + (grpIdx === 0 ? ' cu-ex-page-active' : '') + '">';
          html += renderGroupSection(grp);
          if (grpIdx < groups.length - 1) {
            var remaining = groups.length - grpIdx - 1;
            html += '<button class="cu-ex-page-more" type="button" onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',' + (grpIdx + 1) + ')">' +
              '<span class="material-symbols-outlined">expand_circle_down</span> ' +
              remaining + ' more part' + (remaining > 1 ? 's' : '') + '</button>';
          }
          html += '</div>';
        });
      } else {
        groups.forEach(function(grp) {
          html += renderGroupSection(grp);
        });
      }

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
      categories.forEach(function(cat, catIdx) {
        var zoneId = exId + '-zone-' + catIdx;
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
      if (chip.getAttribute('draggable') === 'false') return;
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

    _getCuDragCategoryZoneMap: function(exEl) {
      var map = {};
      if (!exEl) return map;
      exEl.querySelectorAll('.cu-drag-zone').forEach(function(zone) {
        var category = zone.getAttribute('data-category');
        if (!category) return;
        map[category] = zone;
      });
      return map;
    },

    _dragCatSrc: null,

    // --- Multiple-choice passage renderer (exercise D style, like reading part 1) ---
    // Stores: BentoGrid._cuMcPassageData[secId] = { qNum: { options, answer } }
    _cuMcPassageData: {},
    _cuMcPassageAnswers: {},

    _renderCuMcPassageExercise: function(ex, idBase, secId) {
      var self = this;
      var passage = ex.passage || '';
      var questions = ex.questions || ex.items || [];
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
      ).replace(/\n/g, '<br>');
      var passTitleHtml = ex.passageTitle
        ? '<div class="cu-passage-title">' + self._escapeHTML(ex.passageTitle) + '</div>'
        : '';
      var html = '<div class="cu-mc-passage-exercise" id="' + idBase + '-mcpassage">' +
        passTitleHtml +
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
      qData.options.forEach(function(opt, optIdx) {
        var parsed = BentoGrid._parseCuMcOption(opt, optIdx);
        var letter = parsed.letter;
        var text = BentoGrid._escapeHTML(parsed.text);
        html += '<button class="opt-btn cu-mc-passage-modal-btn"' +
          ' data-sec-id="' + BentoGrid._escapeHTML(secId) + '"' +
          ' data-gap-num="' + gapNum + '"' +
          ' data-letter="' + BentoGrid._escapeHTML(letter) + '"' +
          ' data-opt-idx="' + optIdx + '"' +
          ' onclick="BentoGrid._selectCuMcAnswerFromModal(this)">' +
          text + '</button>';
      });
      html += '</div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },

    _selectCuMcAnswerFromModal: function(btn) {
      var secId = btn.getAttribute('data-sec-id') || '';
      var gapNum = parseInt(btn.getAttribute('data-gap-num') || '0', 10);
      var letter = (btn.getAttribute('data-letter') || '').toUpperCase();
      var optIdx = parseInt(btn.getAttribute('data-opt-idx') || '-1', 10);
      var qData = (BentoGrid._cuMcPassageData[secId] || {})[gapNum];
      if (!qData || !Array.isArray(qData.options) || optIdx < 0 || optIdx >= qData.options.length) return;
      var text = BentoGrid._getCuMcOptionText(qData.options[optIdx], optIdx);
      BentoGrid._selectCuMcAnswer(secId, gapNum, letter, text);
    },

    _selectCuMcAnswer: function(secId, gapNum, letter, text) {
      // Store answer
      if (!BentoGrid._cuMcPassageAnswers[secId]) BentoGrid._cuMcPassageAnswers[secId] = {};
      BentoGrid._cuMcPassageAnswers[secId][gapNum] = letter;
      // Update gap pill display
      var secEl = document.getElementById(secId);
      var pill = secEl ? secEl.querySelector('[data-gap-num="' + gapNum + '"]') : null;
      if (pill) {
        BentoGrid._applyMcPassageGapSlot(pill, text, 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled');
        pill.classList.add('cu-mc-passage-gap-answered');
      }
      // Close modal
      var overlay = document.getElementById('exercise-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      // Persist draft answers locally
      if (secEl) BentoGrid._saveCuExSectionState(secEl);
    },


    _renderCuCrosswordExercise: function(ex, idBase, secId) {
      var self = this;
      var acrossItems = ex.across || [];
      var downItems = ex.down || [];

      function renderClueList(items, dir) {
        if (!items.length) return '';
        var label = dir === 'across' ? 'Across' : 'Down';
        var h = '<div class="cu-cw-section"><div class="cu-cw-section-label">' + self._escapeHTML(label) + '</div><ol class="cu-cw-clue-list">';
        items.forEach(function(it) {
          var boxesHtml = '';
          var ans = it.answer || '';
          var iid = idBase + '-cw-' + dir + '-' + it.num;
          for (var ci = 0; ci < ans.length; ci++) {
            boxesHtml += '<input type="text" class="cu-cw-box cu-cw-letter" maxlength="1" ' +
              'data-cw-id="' + iid + '" data-cw-idx="' + ci + '" ' +
              'autocomplete="off" spellcheck="false" ' +
              'oninput="BentoGrid._cwBoxInput(this)" ' +
              'onkeydown="BentoGrid._cwBoxKeydown(this,event)" />';
          }
          h += '<li class="cu-cw-clue-item" data-answer="' + self._escapeHTML(ans.toLowerCase()) + '" data-cw-id="' + iid + '">' +
            '<span class="cu-cw-clue-text"><span class="cu-cw-clue-num">' + it.num + '.</span> ' + self._escapeHTML(it.clue) + '</span>' +
            '<div class="cu-cw-input-row">' +
              boxesHtml +
              // Hidden backing input keeps compatibility with save/restore logic (_getReviewSectionAnswers reads .cu-gap-input)
              '<input type="text" class="cu-gap-input cu-cw-input" id="' + iid + '" ' +
                'data-answer="' + self._escapeHTML(ans.toLowerCase()) + '" ' +
                'style="display:none" tabindex="-1" aria-hidden="true" ' +
                'autocomplete="off" />' +
            '</div>' +
          '</li>';
        });
        h += '</ol></div>';
        return h;
      }

      // Split into two pages: Across and Down
      var hasAcross = acrossItems.length > 0;
      var hasDown = downItems.length > 0;
      var html = '<div class="cu-cw-exercise">';

      if (hasAcross && hasDown) {
        // Page-dot navigation: page 0 = Across, page 1 = Down
        html += '<nav class="cu-ex-page-dots" aria-label="Exercise pages">';
        html += '<button class="cu-ex-pdot cu-ex-pdot-label cu-ex-pdot-active" ' +
          'onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',0)" ' +
          'aria-current="true" aria-label="Across">Across</button>';
        html += '<button class="cu-ex-pdot cu-ex-pdot-label" ' +
          'onclick="BentoGrid._cuExGoToPage(\'' + secId + '\',1)" ' +
          'aria-current="false" aria-label="Down">Down</button>';
        html += '</nav>';
        html += '<div class="cu-ex-page cu-ex-page-active">' + renderClueList(acrossItems, 'across') + '</div>';
        html += '<div class="cu-ex-page">' + renderClueList(downItems, 'down') + '</div>';
      } else {
        html += renderClueList(acrossItems, 'across');
        html += renderClueList(downItems, 'down');
      }

      html += '</div>';
      html += self._renderCuExFooter(secId);
      return html;
    },

    // Called oninput on each crossword letter box: filter to one letter, auto-advance, sync backing input.
    _cwBoxInput: function(el) {
      // Keep only the last typed character (handles paste/IME)
      var val = el.value.replace(/[^a-zA-Z]/g, '');
      el.value = val ? val[val.length - 1] : '';
      // Auto-advance to next box if a letter was entered
      if (el.value) {
        var iid = el.getAttribute('data-cw-id');
        var idx = parseInt(el.getAttribute('data-cw-idx') || '0');
        var row = el.closest('.cu-cw-input-row');
        var next = row ? row.querySelector('[data-cw-id="' + iid + '"][data-cw-idx="' + (idx + 1) + '"]') : null;
        if (next && !next.disabled) { next.focus(); next.select(); }
      }
      BentoGrid._syncCwBackingInput(el);
      var sec = el.closest('.cu-section');
      if (sec) BentoGrid._saveCuExSectionState(sec);
    },

    // Called onkeydown on each crossword letter box: handle Backspace/Delete and arrow navigation.
    _cwBoxKeydown: function(el, e) {
      var iid = el.getAttribute('data-cw-id');
      var idx = parseInt(el.getAttribute('data-cw-idx') || '0');
      var row = el.closest('.cu-cw-input-row');
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // If box is already empty, move focus to previous box
        if (!el.value) {
          var prev = row ? row.querySelector('[data-cw-id="' + iid + '"][data-cw-idx="' + (idx - 1) + '"]') : null;
          if (prev && !prev.disabled) { prev.focus(); prev.select(); }
        }
      } else if (e.key === 'ArrowLeft') {
        var prevBox = row ? row.querySelector('[data-cw-id="' + iid + '"][data-cw-idx="' + (idx - 1) + '"]') : null;
        if (prevBox) { e.preventDefault(); prevBox.focus(); prevBox.select(); }
      } else if (e.key === 'ArrowRight') {
        var nextBox = row ? row.querySelector('[data-cw-id="' + iid + '"][data-cw-idx="' + (idx + 1) + '"]') : null;
        if (nextBox) { e.preventDefault(); nextBox.focus(); nextBox.select(); }
      }
    },

    // Sync the hidden backing .cu-gap-input with the concatenated values of the letter boxes.
    _syncCwBackingInput: function(el) {
      var iid = el.getAttribute('data-cw-id');
      var row = el.closest('.cu-cw-input-row');
      if (!row) return;
      var backing = document.getElementById(iid);
      if (!backing) return;
      var letters = Array.prototype.slice.call(row.querySelectorAll('.cu-cw-letter[data-cw-id="' + iid + '"]'));
      letters.sort(function(a, b) { return parseInt(a.getAttribute('data-cw-idx') || '0') - parseInt(b.getAttribute('data-cw-idx') || '0'); });
      backing.value = letters.map(function(b) { return b.value || ''; }).join('');
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

    _renderCuKwtransMatchExercise: function(questions, idBase, secId) {
      var self = this;
      if (!questions || !questions.length) return '';
      // Extract beginnings and endings from "beginning **LETTER** ending" sentence format
      var items = questions.map(function(q, idx) {
        var sentence = q.sentence || '';
        var boldMatch = sentence.match(/^(.*?)\s*\*\*([A-Z])\*\*\s*(.*)?$/);
        var beginning = boldMatch ? boldMatch[1].trim() : sentence;
        var letter = boldMatch ? boldMatch[2] : String.fromCharCode(65 + idx);
        var ending = boldMatch ? (boldMatch[3] || '').trim() : '';
        return { num: idx + 1, letter: letter, beginning: beginning, ending: ending, answer: q.answer || '' };
      });
      // Sort right-column items alphabetically A→Z
      var rightItems = items.map(function(it) { return { letter: it.letter, ending: it.ending }; });
      rightItems.sort(function(a, b) { return a.letter.localeCompare(b.letter); });
      var html = '<div class="cu-match-exercise" data-sec-id="' + secId + '">';
      html += '<table class="cu-match-table"><tbody>';
      items.forEach(function(it, idx) {
        var rightItem = rightItems[idx];
        html += '<tr class="cu-match-row">' +
          '<td class="cu-match-left-cell">' +
            '<div class="cu-match-item cu-match-left-item" data-num="' + it.num + '">' +
              '<span class="cu-match-num">' + it.num + '</span>' +
              '<div class="cu-kwtrans-keyword-row cu-match-kwrow"><span class="cu-kwtrans-keyword">' + self._escapeHTML(it.beginning) + '</span></div>' +
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
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    _renderCuExItemsList: function(items, idBase, secId, continuous, hideNumBadge, useTextarea, showOkBtn) {
      var self = this;
      if (!items || !items.length) return '';
      if (continuous || items.length <= CU_PAGE_SIZE) {
        var html = '';
        items.forEach(function(item, iIdx) {
          html += self._renderCourseExItem(item, iIdx, idBase + '-' + iIdx, null, hideNumBadge, useTextarea, showOkBtn);
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
          html += self._renderCourseExItem(item, globalIdx, idBase + '-' + globalIdx, null, hideNumBadge, useTextarea, showOkBtn);
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

    _renderCourseExItem: function(item, idx, idBase, trackCallback, hideNumBadge, useTextarea, showOkBtn) {
      var self = this;
      var answer = item.answer || '';
      var inputId = 'cuex-' + idBase;
      var numBadgeHtml = hideNumBadge ? '' : '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>';

      // Handle paired-sentence format (sentenceA / sentenceB) – e.g. Stative vs Active
      if (item.sentenceA !== undefined || item.sentenceB !== undefined) {
        var rawA = (item.sentenceA || '').replace(/^A[.):\s]\s*/, '');
        var rawB = (item.sentenceB || '').replace(/^B[.):\s]\s*/, '');
        return '<div class="cu-ex-item" data-answer="' + self._escapeHTML(answer) + '">' +
          numBadgeHtml +
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

      // Context + sentence transformation layout (A / KEYWORD / B).
      // Trigger only when sentence has a KWT-style gap and a trailing (KEYWORD).
      var hasKwTransGapInSentence = CU_KWTRANS_GAP_PATTERN.test(sentence);
      var keywordSuffixMatch = sentence.match(CU_KWTRANS_KEYWORD_SUFFIX_PATTERN);
      if (item.context && hasKwTransGapInSentence && keywordSuffixMatch) {
        var kwKeyword = keywordSuffixMatch[1].trim();
        var kwSentenceB = sentence.replace(CU_KWTRANS_KEYWORD_SUFFIX_PATTERN, '');
        return '<div class="cu-ex-item" data-answer="' + self._escapeHTML(answer) + '">' +
          numBadgeHtml +
          '<div class="cu-ex-sentence">' +
            '<div class="cu-ex-kwtrans">' +
              '<div class="cu-ex-kwtrans-row">' +
                '<span class="cu-ex-kwtrans-label">A</span>' +
                '<div class="cu-ex-kwtrans-text">' + self._renderCourseExSentenceParts(item.context, inputId + '_a', true) + '</div>' +
              '</div>' +
              '<div class="cu-kwtrans-keyword-row"><span class="cu-kwtrans-keyword">' + self._escapeHTML(kwKeyword) + '</span></div>' +
              '<div class="cu-ex-kwtrans-row">' +
                '<span class="cu-ex-kwtrans-label">B</span>' +
                '<div class="cu-ex-kwtrans-text">' + self._renderCourseExSentenceParts(kwSentenceB, inputId + '_b') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cu-ex-foot">' +
            '<div class="cu-answer" style="display:none">' + self._escapeHTML(answer) + '</div>' +
          '</div>' +
        '</div>';
      }

      // When showOkBtn is true (e.g. Exercise H style), all items get an OK fill button
      // alongside the text input. Clicking OK fills the input with "OK". The answer field
      // stores either "OK" (correct as written) or a correction word.
      if (showOkBtn) {
        var sentHtmlOk = self._renderCourseExSentence(sentence, inputId, useTextarea);
        return '<div class="cu-ex-item cu-ok-btn-item" data-answer="' + self._escapeHTML(answer) + '">' +
          numBadgeHtml +
          contextHtml +
          '<div class="cu-ok-inline-row">' +
            '<div class="cu-ex-sentence cu-ok-inline-sentence">' + sentHtmlOk + '</div>' +
            '<button class="cu-ok-fill-btn" type="button" onclick="BentoGrid._fillOkChip(this)">OK</button>' +
          '</div>' +
          '<div class="cu-ex-foot">' +
            '<div class="cu-answer" style="display:none">' + self._escapeHTML(answer) + '</div>' +
          '</div>' +
        '</div>';
      }

      // Items with answer '✓' are "correct as is" tick exercises: render OK button.
      // Use _renderCourseExSentence so any hint-gap pills (e.g. bold hint words) are rendered.
      if (answer === '✓') {
        var tickGroupId = inputId + '-tick';
        var tickSentHtml = self._renderCourseExSentence(sentence, inputId, useTextarea);
        return '<div class="cu-ex-item cu-yn-item" data-answer="YES">' +
          numBadgeHtml +
          '<div class="cu-yn-row">' +
            '<div class="cu-ex-sentence cu-yn-sentence">' + tickSentHtml + '</div>' +
            '<div class="cu-yn-buttons">' +
              '<button class="cu-yn-btn cu-yn-yes" data-group="' + tickGroupId + '" data-yn="YES" onclick="BentoGrid._selectCuYn(this)" type="button">OK ✓</button>' +
            '</div>' +
          '</div>' +
          '<div class="cu-ex-foot"><div class="cu-answer" style="display:none">OK</div></div>' +
        '</div>';
      }

      var sentenceHtml;
      if (isMC) {
        sentenceHtml = self._renderCourseExMCItem(sentence, item.options, inputId);
      } else {
        sentenceHtml = self._renderCourseExSentence(sentence, inputId, useTextarea);
      }

      // Detect multi-answer: item has inline options (**A/B** pattern) and answer contains '/'
      var hasInlineChoicePattern = /\*\*[^*]*\/[^*]*\*\*/.test(sentence);
      var multiAnswerAttr = (hasInlineChoicePattern && answer.indexOf('/') !== -1) || item.multiAnswer
        ? ' data-multi-answer="true"' : '';

      // Tick button for items with 'tick' field (e.g. fill-in + tick whether phrasal verb means X)
      var tickHtml = '';
      if (item.tick !== undefined) {
        var tickGroupId2 = inputId + '-itick';
        tickHtml = '<div class="cu-yn-buttons cu-item-tick-buttons">' +
          '<button class="cu-yn-btn cu-yn-yes cu-item-tick-btn" data-group="' + tickGroupId2 + '" data-yn="YES" data-tick-answer="' + self._escapeHTML(item.tick || '') + '" onclick="BentoGrid._selectCuYn(this)" type="button">OK ✓</button>' +
          '</div>';
      }

      return '<div class="cu-ex-item' + (item.tick !== undefined ? ' cu-has-tick' : '') + '"' + multiAnswerAttr + ' data-answer="' + self._escapeHTML(answer) + '"' + (item.tick !== undefined ? ' data-tick="' + self._escapeHTML(item.tick || '') + '"' : '') + '>' +
        numBadgeHtml +
        contextHtml +
        '<div class="cu-ex-sentence">' + sentenceHtml + '</div>' +
        (tickHtml ? '<div class="cu-item-tick-row">' + tickHtml + '</div>' : '') +
        '<div class="cu-ex-foot">' +
          '<div class="cu-answer" style="display:none">' + self._escapeHTML(answer) + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderCourseExMCItem: function(sentence, options, inputId) {
      var self = this;
      var oGroupId = inputId + '_mc';
      // Store options for modal access when the gap pill is clicked
      self._cuMcItemData[oGroupId] = options;
      // Replace gap markers with interactive pills that open a modal when clicked.
      // Each gap gets a unique ID with a counter suffix to satisfy the uniqueness constraint.
      var pillCounter = 0;
      var sentenceHtml = self._formatTextWithHints(sentence).replace(/[…]{2,}|\.{5,}/g, function() {
        var pillId = oGroupId + '-pill' + pillCounter++;
        return '<span class="cu-mc-gap-pill" id="' + pillId + '" role="button" tabindex="0" ' +
          'onclick="BentoGrid._openCuMcItemModal(\'' + oGroupId + '\',\'' + pillId + '\')">' + CU_MC_BLANK + '</span>';
      });
      // All options point to the first pill (counter resets per sentence, single gap expected for MC)
      var firstPillId = oGroupId + '-pill0';
      var optHtml = '<div class="cu-mc-options">';
      options.forEach(function(opt, optIdx) {
        var parsed = self._parseCuMcOption(opt, optIdx);
        var letter = parsed.letter;
        var text = self._escapeHTML(parsed.text);
        var safeLetter = self._escapeHTML(letter);
        optHtml += '<button class="cu-option-btn cu-mc-option" data-group="' + oGroupId +
          '" data-mc-letter="' + safeLetter +
          '" data-pill-id="' + firstPillId +
          '" onclick="BentoGrid._selectMcOption(this)" type="button">' +
          (parsed.showLetter ? '<span class="cu-mc-letter">' + safeLetter + '</span>' : '') +
          '<span class="cu-mc-text">' + text + '</span></button>';
      });
      optHtml += '</div>';
      return sentenceHtml + optHtml;
    },

    // Stores options data for MC item gap-pill modals, keyed by oGroupId
    _cuMcItemData: {},

    _openCuMcItemModal: function(oGroupId, pillId) {
      var options = BentoGrid._cuMcItemData[oGroupId];
      if (!options || !options.length) return;
      var overlay = document.getElementById('exercise-modal-overlay');
      var body = document.getElementById('modal-body');
      if (!overlay || !body) return;
      var html = '<div class="modal-header"><div class="modal-header-row"><p>Select an option</p></div></div>';
      html += '<div class="options-grid">';
      options.forEach(function(opt, optIdx) {
        var parsed = BentoGrid._parseCuMcOption(opt, optIdx);
        var letter = parsed.letter;
        var safeLetter = BentoGrid._escapeHTML(letter);
        var text = BentoGrid._escapeHTML(parsed.text);
        html += '<button class="opt-btn cu-mc-item-modal-btn"' +
          ' data-group="' + BentoGrid._escapeHTML(oGroupId) + '"' +
          ' data-pill-id="' + BentoGrid._escapeHTML(pillId) + '"' +
          ' data-letter="' + safeLetter + '"' +
          ' onclick="BentoGrid._selectMcOptionFromModal(this)">' +
          text + '</button>';
      });
      html += '</div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },

    _selectMcOptionFromModal: function(btn) {
      var oGroupId = btn.getAttribute('data-group');
      var pillId = btn.getAttribute('data-pill-id');
      var letter = btn.getAttribute('data-letter');
      var text = btn.textContent || letter;
      // Update inline option buttons to match selection
      document.querySelectorAll('.cu-option-btn[data-group="' + oGroupId + '"]').forEach(function(b) {
        b.classList.toggle('cu-option-selected', b.getAttribute('data-mc-letter') === letter);
      });
      // Update the gap pill display
      var pill = document.getElementById(pillId);
      if (pill) {
        pill.classList.add('cu-mc-gap-pill-filled');
        pill.textContent = text || letter;
      }
      // Close modal
      var overlay = document.getElementById('exercise-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      // Save section state
      var sec = pill ? pill.closest('.cu-section') : null;
      if (!sec) {
        var ob = document.querySelector('.cu-option-btn[data-group="' + oGroupId + '"]');
        if (ob) sec = ob.closest('.cu-section');
      }
      if (sec) BentoGrid._saveCuExSectionState(sec);
    },

    _getCuMcButtonText: function(btn) {
      if (!btn) return '';
      var txtEl = btn.querySelector('.cu-mc-text');
      if (txtEl) return (txtEl.textContent || '').trim();
      return (btn.getAttribute('data-mc-text') || btn.textContent || '').trim();
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
      var text = BentoGrid._getCuMcButtonText(btn);
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
      function _withLineBreaks(str) {
        return self._escapeHTML(str).replace(/\r?\n/g, '<br>');
      }
      var result = '';
      var parenRegex = /\(([^)]+)\)/g;
      var lastIdx = 0;
      var m;
      while ((m = parenRegex.exec(text)) !== null) {
        result += _withLineBreaks(text.slice(lastIdx, m.index));
        var inner = m[1];
        if (/^\d+$/.test(inner.trim())) {
          // Number — render as circle badge
          result += '<span class="cu-ex-num-circle">' + self._escapeHTML(inner) + '</span>';
        } else {
          // Word hint — render without parentheses
          result += '<span class="cu-hint-word">' + self._escapeHTML(inner) + '</span>';
        }
        lastIdx = m.index + m[0].length;
      }
      result += _withLineBreaks(text.slice(lastIdx));
      return result;
    },

    _renderCourseExSentence: function(sentence, inputIdBase, useTextarea) {
      var self = this;

      // Key Word Transformation: two sentences separated by \n with a visible gap marker
      // → show A / keyword / B rows. Plain line breaks should remain plain line breaks.
      var nlIdx = sentence.indexOf('\n');
      // Treat as key-word transformation only when a clear gap marker is present:
      // 5+ dots/ellipsis chars (..... / ………) or 3+ underscores (___).
      var hasKwTransGap = /(?:[.\u2026]{5,}|\u2026{2,}|_{3,})/.test(sentence);
      if (nlIdx !== -1 && hasKwTransGap) {
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

      return self._renderCourseExSentenceParts(sentence, inputIdBase, false, useTextarea);
    },

    _renderCourseExSentenceParts: function(sentence, inputIdBase, noStandalone, useTextarea) {
      var self = this;
      // Tokenise sentence into: plain text, gap markers, bold+option patterns, plain bold
      // Compound patterns (hint+gap pill) are matched first so they take priority:
      //   Pattern A: optional (number)  (hint)  gap_marker  → dark pill with [num] [input] [hint]
      //   Pattern B: gap_marker  (hint)             → dark pill with [input] [hint]
      var parts = [];
      // Individual sub-patterns:
      //   numParen    – optional number-only parens like "(1) "
      //   hintParen   – hint text in parens like "(you)" or "(I / just)"
      //   gapMarker   – five or more dots/ellipsis characters or underscore blanks
      //   boldMarker  – text enclosed in **double asterisks**
      var numParen    = '(\\(\\d+\\)\\s+)?';
      var hintParen   = '\\(([^)]+)\\)';
      var gapMarker   = '(?:[.\\u2026]{5,}|\\u2026{2,}|_{5,})';
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
      // Also applies to gap-hint pills (e.g. "(1) ...... (HIGH)") so the number appears
      // inside the pill rather than as bold text before it.
      for (var npi = 1; npi < parts.length; npi++) {
        var pillType = parts[npi].type;
        if ((pillType === 'hint-gap' || pillType === 'gap-hint') && parts[npi].num === null) {
          var prevPart = parts[npi - 1];
          if (prevPart && prevPart.type === 'text') {
            var numPrefixMatch = prevPart.val.match(/^([\s\S]*?)\s*\((\d+)\)\s*$/);
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
          if (useTextarea) {
            return '<textarea id="' + inputIdBase + '_g' + (gapCount++) + '" class="cu-gap-input cu-gap-textarea" placeholder="Your answer..." rows="2" aria-label="Your answer" onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)"></textarea>';
          }
          return '<input type="text" id="' + inputIdBase + '_g' + (gapCount++) + '" class="cu-gap-input" placeholder="..." onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)">';
        } else if (p.type === 'gap-wf') {
          // Word-formation gap: input + word-badge together
          var gId = inputIdBase + '_g' + (gapCount++);
          return '<span class="cu-hint-pill">' +
            '<input type="text" id="' + gId + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)">' +
            '<span class="cu-hint-pill-word cu-wf-pill-word">' + self._escapeHTML(p.wfWord) + '</span>' +
            '</span>';
        } else if (p.type === 'hint-gap' || p.type === 'gap-hint') {
          var gId = inputIdBase + '_g' + (gapCount++);
          var pillHtml = '<span class="cu-hint-pill">';
          if (p.num) {
            pillHtml += '<span class="cu-hint-pill-num">' + self._escapeHTML(p.num) + '</span>';
          }
          pillHtml += '<input type="text" id="' + gId + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)">';
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
            '<input type="text" id="' + gId1 + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)">' +
            '<span class="cu-hint-pill-mid">' + self._escapeHTML(p.midText.trim()) + '</span>' +
            '<input type="text" id="' + gId2 + '" class="cu-gap-input cu-hint-pill-input" placeholder="..." onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)">';
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
          if (useTextarea) {
            return '<br><textarea class="cu-gap-input cu-gap-textarea cu-gap-standalone" placeholder="Your answer..." rows="2" aria-label="Your answer" onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)"></textarea>';
          }
          return '<br><input type="text" class="cu-gap-input cu-gap-standalone" placeholder="Your answer..." onfocus="BentoGrid._cuLastFocusedGap=this" oninput="BentoGrid._resizeCuInput(this)">';
        }
        return '';
      }).join('');
    },

    _selectCourseOption: function(btn) {
      if (btn.disabled) return;
      var group = btn.getAttribute('data-group');
      if (!group) return;
      var sec = btn.closest('.cu-section');
      var item = btn.closest('.cu-ex-item');
      var isMultiSelect = (sec && sec.getAttribute('data-multi-select') === 'true') ||
                          (item && item.getAttribute('data-multi-answer') === 'true');
      if (isMultiSelect) {
        // Multi-select mode: toggle the clicked button without deselecting others
        btn.classList.toggle('cu-option-selected');
      } else {
        var siblings = document.querySelectorAll('.cu-option-btn[data-group="' + group + '"]');
        siblings.forEach(function(s) { s.classList.remove('cu-option-selected'); });
        btn.classList.add('cu-option-selected');
      }
      BentoGrid._saveCuExSectionState(sec || btn.closest('.cu-section'));
    },

    // Fill the input inside an error-correction hint pill with "OK" (correct as written).
    // Works both when the button is inside a .cu-hint-pill and when it is at item level
    // (e.g. Exercise H style where each item has a standalone OK button). Toggles the fill
    // so clicking OK a second time clears the input.
    _fillOkChip: function(btn) {
      var pill = btn.closest('.cu-hint-pill');
      var input;
      if (pill) {
        input = pill.querySelector('.cu-gap-input');
      } else {
        var item = btn.closest('.cu-ex-item');
        if (item) input = item.querySelector('.cu-gap-input');
      }
      if (input && !input.disabled) {
        input.value = input.value === 'OK' ? '' : 'OK';
        BentoGrid._resizeCuInput(input);
        BentoGrid._saveCuExSectionState(input.closest('.cu-section'));
      }
    },

    // Auto-resize a course gap input to fit its content (like test inputs)
    _resizeCuInput: function(input) {
      // Textarea inputs: auto-grow height to show all content without scrolling
      if (input.tagName === 'TEXTAREA') {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
        BentoGrid._saveCuExSectionState(input.closest('.cu-section'));
        return;
      }
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
      var widthHost = input.closest('.cu-hint-pill, .cu-ex-sentence, .cu-sync-sentence, .cu-passage-text, .cu-ex-kwtrans-text');
      var maxWidth = 0;
      if (widthHost && widthHost.getBoundingClientRect) {
        maxWidth = Math.max(120, Math.floor(widthHost.getBoundingClientRect().width - 24));
      }
      if (input.classList.contains('cu-input-show-correct')) {
        var viewportMax = Math.max(minWidth, Math.floor(window.innerWidth * 0.92));
        newWidth = Math.min(newWidth, viewportMax);
      } else if (maxWidth > 0) {
        newWidth = Math.min(newWidth, maxWidth);
      }
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
      // Ensure course index data is loaded before trying to derive filePath
      if (!BentoGrid._courseIndexData) {
        await BentoGrid.openCourseTheory(state.level || AppState.currentLevel);
      }
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
        // Vocabulary units using array sections (same format as grammar units) – handle like grammar
        if (Array.isArray(unitData.sections)) {
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

      if (unitData.type === 'progress_test') {
        var ptSections = [];
        (unitData.sections || []).forEach(function(sec, sectionIdx) {
          if (sec.type === 'exercise') {
            ptSections.push({
              title: sec.title,
              maxScore: (sec.scoring && sec.scoring.maxScore) || 0,
              sectionIdx: sectionIdx
            });
          }
        });
        return { ptSections: ptSections };
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
          (item.type === 'grammar' || item.type === 'vocabulary' || item.type === 'progress_test') &&
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
      // Word-tick buttons state
      var wordTickState = [];
      sec.querySelectorAll('.cu-word-tick-btn').forEach(function(btn) {
        wordTickState.push(btn.classList.contains('cu-word-tick-selected') ? 1 : 0);
      });
      if (wordTickState.length) answers.wordTick = wordTickState;
      // Word-spot state (clickable passage words)
      var wordSpotState = [];
      sec.querySelectorAll('.cu-ws-word').forEach(function(span) {
        wordSpotState.push(span.classList.contains('cu-ws-selected') ? 1 : 0);
      });
      if (wordSpotState.length) answers.wordSpot = wordSpotState;
      var commaState = [];
      sec.querySelectorAll('.cu-comma-item').forEach(function(item) {
        var selected = [];
        item.querySelectorAll('.cu-comma-slot').forEach(function(slot) {
          var idx = parseInt(slot.getAttribute('data-comma-slot-idx') || '-1', 10);
          if (idx >= 0 && slot.classList.contains('cu-comma-selected')) selected.push(idx);
        });
        commaState.push(selected);
      });
      if (commaState.length) answers.commaState = commaState;
      // Find-extra-word state
      var fewState = [];
      sec.querySelectorAll('.cu-few-item').forEach(function(item) {
        var okBtn = item.querySelector('.cu-few-ok-btn');
        var words = item.querySelectorAll('.cu-few-word');
        var selIdx = -1;
        words.forEach(function(w, wi) { if (w.classList.contains('cu-few-selected')) selIdx = wi; });
        fewState.push({ ok: okBtn && okBtn.classList.contains('cu-few-ok-selected') ? 1 : 0, sel: selIdx });
      });
      if (fewState.length) answers.fewState = fewState;
      // Bold-correct (bc) items state: OK button selections
      var bcState = [];
      sec.querySelectorAll('.cu-bc-item').forEach(function(item) {
        var okBtn = item.querySelector('.cu-bc-ok-btn');
        bcState.push(okBtn && okBtn.classList.contains('cu-bc-ok-selected') ? 1 : 0);
      });
      if (bcState.length) answers.bcState = bcState;
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
      // Restore crossword letter boxes from the hidden backing inputs
      sec.querySelectorAll('.cu-cw-clue-item').forEach(function(item) {
        var cwId = item.getAttribute('data-cw-id');
        var backing = cwId ? document.getElementById(cwId) : null;
        if (!backing) return;
        var word = backing.value || '';
        var boxes = item.querySelectorAll('.cu-cw-letter');
        boxes.forEach(function(b, bi) { b.value = word[bi] || ''; });
      });
      if (answers.options) {
        sec.querySelectorAll('.cu-option-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (!g || answers.options[g] === undefined) return;
          var saved = answers.options[g];
          // Support both legacy string and new array format
          var selectedTexts = Array.isArray(saved) ? saved : [saved];
          if (selectedTexts.indexOf(btn.textContent.trim()) !== -1) {
            btn.classList.add('cu-option-selected');
            // For MC items, also update the gap pill to reflect the restored selection
            if (btn.classList.contains('cu-mc-option')) {
              var pillId = btn.getAttribute('data-pill-id');
              if (pillId) {
                var pill = document.getElementById(pillId);
                if (pill) {
                  pill.classList.add('cu-mc-gap-pill-filled');
                  pill.textContent = BentoGrid._getCuMcButtonText(btn) || btn.getAttribute('data-mc-letter') || '';
                }
              }
            }
          }
        });
      }
      if (answers.ynButtons) {
        sec.querySelectorAll('.cu-yn-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (g && answers.ynButtons[g] !== undefined && (btn.getAttribute('data-yn') || '') === answers.ynButtons[g]) btn.classList.add('cu-yn-selected');
        });
      }
      if (answers.wordTick && Array.isArray(answers.wordTick)) {
        var wordTickBtns = sec.querySelectorAll('.cu-word-tick-btn');
        wordTickBtns.forEach(function(btn, i) {
          if (answers.wordTick[i]) btn.classList.add('cu-word-tick-selected');
        });
      }
      if (answers.wordSpot && Array.isArray(answers.wordSpot)) {
        var wordSpanEls = sec.querySelectorAll('.cu-ws-word');
        wordSpanEls.forEach(function(span, i) {
          if (answers.wordSpot[i]) span.classList.add('cu-ws-selected');
        });
        // Restore counter
        var counterEl = sec.querySelector('.cu-ws-counter span[id]');
        if (counterEl) counterEl.textContent = sec.querySelectorAll('.cu-ws-word.cu-ws-selected').length;
      }
      if (answers.commaState && Array.isArray(answers.commaState)) {
        sec.querySelectorAll('.cu-comma-item').forEach(function(item, ii) {
          var selectedList = Array.isArray(answers.commaState[ii]) ? answers.commaState[ii] : [];
          item.querySelectorAll('.cu-comma-slot').forEach(function(slot) {
            var idx = parseInt(slot.getAttribute('data-comma-slot-idx') || '-1');
            if (selectedList.indexOf(idx) !== -1) {
              slot.classList.add('cu-comma-selected');
              slot.setAttribute('aria-pressed', 'true');
            }
          });
        });
      }
      // Restore find-extra-word selections
      if (answers.fewState && Array.isArray(answers.fewState)) {
        sec.querySelectorAll('.cu-few-item').forEach(function(item, ii) {
          var state = answers.fewState[ii];
          if (!state) return;
          var okBtn = item.querySelector('.cu-few-ok-btn');
          if (state.ok === 1 && okBtn) {
            okBtn.classList.add('cu-few-ok-selected');
            okBtn.setAttribute('aria-pressed', 'true');
          }
          if (typeof state.sel === 'number' && state.sel >= 0) {
            var words = item.querySelectorAll('.cu-few-word');
            if (words[state.sel]) words[state.sel].classList.add('cu-few-selected');
          }
        });
      }
      // Restore bold-correct OK button selections
      if (answers.bcState && Array.isArray(answers.bcState)) {
        sec.querySelectorAll('.cu-bc-item').forEach(function(item, ii) {
          if (answers.bcState[ii] !== 1) return;
          var okBtn = item.querySelector('.cu-bc-ok-btn');
          if (okBtn) { okBtn.classList.add('cu-bc-ok-selected'); okBtn.setAttribute('aria-pressed', 'true'); }
        });
      }
      if (answers.mcPassage) {
        Object.keys(answers.mcPassage).forEach(function(secId) {
          BentoGrid._cuMcPassageAnswers[secId] = answers.mcPassage[secId];
          Object.keys(answers.mcPassage[secId]).forEach(function(gapNum) {
            var letter = answers.mcPassage[secId][gapNum];
            var gap = sec.querySelector('.cu-mc-passage-gap[data-gap-num="' + gapNum + '"][data-sec-id="' + secId + '"]');
            if (gap) {
              var qData = (BentoGrid._cuMcPassageData[secId] || {})[parseInt(gapNum)];
              var optText = '';
              if (qData) {
                var optIdx = qData.options.findIndex(function(o, oi) { return BentoGrid._parseCuMcOption(o, oi).letter === letter; });
                if (optIdx !== -1) optText = BentoGrid._getCuMcOptionText(qData.options[optIdx], optIdx);
              }
              BentoGrid._applyMcPassageGapSlot(gap, optText || letter, 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled');
              gap.classList.add('cu-mc-passage-gap-answered');
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
        if (s.type === 'exercise') {
          if (s.subtype === 'passage-input') totalMaxItems += (s.answers || []).length;
          else totalMaxItems += (s.items || []).length;
        }
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
          var multiSelectAttr = section.multiSelect ? ' data-multi-select="true"' : '';
          var isPassageInput = section.subtype === 'passage-input';
          var isMcPassage = !!(section.passage && rvItems.length && rvItems[0] && rvItems[0].options);
          var ptMaxItems = isPassageInput ? (section.answers || []).length : rvItems.length;
          html += '<div class="cu-section cu-exercise cu-review-section" id="' + rvSecId + '" data-max-items="' + ptMaxItems + '"' + multiSelectAttr + '>' +
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
          html += self._renderCuWordBank(section.words);
          if (isMcPassage) {
            html += self._renderCuMcPassageExercise(section, 'pt-' + sectionIdx + '-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (isPassageInput) {
            html += self._renderCuPassageInputExercise(section, 'pt-' + sectionIdx + '-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (section.subtype === 'find-extra-word') {
            html += self._renderCuFindExtraWordExercise(section, 'pt-' + sectionIdx + '-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (section.subtype === 'comma-placement') {
            html += self._renderCuCommaPlacementExercise(section, 'pt-' + sectionIdx + '-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else if (section.subtype === 'matching') {
            html += self._renderCuMatchingExercise(rvItems, 'pt-' + sectionIdx + '-' + section.title.replace(/\W+/g, ''), rvSecId);
          } else {
            html += '<div class="cu-ex-items">';
            var hasInteractiveRv = rvItems.some(function(it) { return self._itemHasInteractive(it); });
            html += self._renderCuExItemsList(rvItems, 'pt-' + sectionIdx + '-' + section.title.replace(/\W+/g, ''), rvSecId, true);
            html += '</div>';
            if (hasInteractiveRv) html += self._renderCuExFooter(rvSecId);
          }
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

      BentoGrid._courseOverviewFilterOrder = blockOrder.slice();
      BentoGrid._courseOverviewVisibleBlocks = {};
      blockOrder.forEach(function(bk) {
        BentoGrid._courseOverviewVisibleBlocks[bk] = true;
      });

      html += '<div class="cu-overview-block-filter-wrap">' +
        '<div class="cu-overview-block-filter-icon">' + _mi('filter_alt') + '</div>' +
        '<div class="cu-overview-block-filter-buttons">';
      blockOrder.forEach(function(bk) {
        var chipLabel = bk === 'misc' ? 'OT' : bk;
        var ptMatch = bk.match(/^pt(\d+)$/);
        var escapedBk = self._escapeHTML(bk);
        var escapedLabel = self._escapeHTML(BentoGrid._getBlockLabel(bk));
        if (ptMatch) chipLabel = 'PT' + ptMatch[1];
        html += '<button type="button" class="cu-obf-btn cu-obf-block-btn cu-obf-btn-active" data-overview-filter-btn="' + escapedBk + '" title="' + escapedLabel + '">' + self._escapeHTML(chipLabel) + '</button>';
      });
      html += '<button type="button" class="cu-obf-btn cu-obf-select-all cu-obf-btn-active" data-overview-filter-action="all" title="Select all blocks">' + _mi('done_all') + '</button>' +
        '<button type="button" class="cu-obf-btn cu-obf-select-none" data-overview-filter-action="none" title="Deselect all blocks">' + _mi('block') + '</button>' +
        '</div>' +
      '</div>';

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

        // Progress test blocks: render as a card matching block card size
        if (progressTestItem) {
          var isPtAvail = progressTestItem.status === 'available';
          var isPtDone = !!progress[progressTestItem.id];
          var ptPath = 'data/Course/' + level + '/' + progressTestItem.file;
          var ptScore = BentoGrid._getPtScore(level, progressTestItem.id);
          var ptTotal = progressTestItem.totalPoints || 100;
          var ptClass = 'cu-pt-overview-card cu-overview-filterable' + (isPtDone ? ' cu-pt-card-done' : (isPtAvail ? ' cu-pt-card-available' : ' cu-pt-card-locked'));
          var ptClickAttr = isPtAvail ? ' onclick="BentoGrid.openCourseUnit(\'' + progressTestItem.id + '\',\'' + ptPath + '\')" style="cursor:pointer"' : '';
          html += '<div class="' + ptClass + '" data-overview-block="' + self._escapeHTML(bk) + '"' + ptClickAttr + '>';
          html += '<div class="cu-pt-ov-header-row">';
          html += '<div class="cu-pt-ov-icon">' + _mi('assignment') + '</div>';
          html += '<div class="cu-pt-ov-label">Progress Test</div>';
          if (isPtDone) html += '<div class="cu-pt-ov-check">' + _mi('check_circle') + '</div>';
          else if (!isPtAvail) html += '<div class="cu-pt-ov-lock">' + _mi('lock') + ' Coming Soon</div>';
          html += '</div>'; // .cu-pt-ov-header-row
          html += '<div class="cu-pt-ov-title">' + self._escapeHTML(progressTestItem.title) + '</div>';
          if (ptScore !== null) {
            html += '<div class="cu-pt-ov-score">' + _mi('stars') + ' ' + ptScore + ' / ' + ptTotal + ' pts</div>';
          } else if (isPtAvail) {
            html += '<div class="cu-pt-ov-cta">' + _mi('play_arrow') + ' Take the Test</div>';
          }
          html += '</div>'; // .cu-pt-overview-card
          return;
        }

        var blockClass = 'cu-block-card';
        if (!hasAvailable) blockClass += ' cu-block-card-locked';
        else if (isFullyDone) blockClass += ' cu-block-card-done';
        else if (doneCount > 0) blockClass += ' cu-block-card-in-progress';
        else blockClass += ' cu-block-card-available';
        blockClass += ' cu-overview-filterable';

        html += '<div class="' + blockClass + '" data-overview-block="' + self._escapeHTML(bk) + '">';

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
              '<span class="cu-bur-text">' + (item.unit ? 'U' + item.unit + ': ' : '') + self._escapeHTML(shortTitle) + '</span>' +
              (isDone ? '<span class="cu-bur-done">' + _mi('check_circle') + '</span>' : '<span class="cu-bur-arrow">' + _mi('chevron_right') + '</span>') +
              resetUnitOverviewBtn +
            '</div>';
          } else {
            html += '<div class="cu-block-unit-row cu-block-unit-locked">' +
              '<span class="cu-bur-icon">' + _mi('lock') + '</span>' +
              '<span class="cu-bur-text">' + (item.unit ? 'U' + item.unit + ': ' : '') + self._escapeHTML(shortTitle) + '</span>' +
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

    _applyCourseOverviewFilter: function() {
      var visibleBlocks = BentoGrid._courseOverviewVisibleBlocks || {};
      var cards = document.querySelectorAll('.cu-overview-filterable');
      cards.forEach(function(card) {
        var bk = card.getAttribute('data-overview-block');
        card.classList.toggle('cu-overview-card-hidden', !visibleBlocks[bk]);
      });

      var filterBtns = document.querySelectorAll('.cu-obf-block-btn');
      filterBtns.forEach(function(btn) {
        var bk = btn.getAttribute('data-overview-filter-btn');
        btn.classList.toggle('cu-obf-btn-active', !!visibleBlocks[bk]);
      });

      var order = BentoGrid._courseOverviewFilterOrder || [];
      var selectedCount = 0;
      order.forEach(function(bk) {
        if (visibleBlocks[bk]) selectedCount++;
      });
      var allBtn = document.querySelector('.cu-obf-select-all');
      var noneBtn = document.querySelector('.cu-obf-select-none');
      if (allBtn) allBtn.classList.toggle('cu-obf-btn-active', order.length > 0 && selectedCount === order.length);
      if (noneBtn) noneBtn.classList.toggle('cu-obf-btn-active', selectedCount === 0);
    },

    _bindCourseOverviewFilterEvents: function() {
      var filterWrap = document.querySelector('.cu-overview-block-filter-wrap');
      if (!filterWrap || filterWrap._cuFilterBound) return;
      filterWrap.addEventListener('click', BentoGrid._handleOverviewFilterClick);
      filterWrap._cuFilterBound = true;
    },

    _handleOverviewFilterClick: function(event) {
      if (!event || !event.target || !event.target.closest) return;
      var btn = event.target.closest('.cu-obf-btn');
      if (!btn) return;
      if (btn.classList.contains('cu-obf-select-all')) {
        BentoGrid._selectAllOverviewBlocks();
        return;
      }
      if (btn.classList.contains('cu-obf-select-none')) {
        BentoGrid._clearOverviewBlocks();
        return;
      }
      var blockKey = btn.getAttribute('data-overview-filter-btn');
      if (blockKey) BentoGrid._toggleOverviewBlockFilter(blockKey);
    },

    _toggleOverviewBlockFilter: function(blockKey) {
      var visibleBlocks = BentoGrid._courseOverviewVisibleBlocks || {};
      if (!(blockKey in visibleBlocks)) {
        console.warn('Course overview filter: invalid block key', blockKey);
        return;
      }
      visibleBlocks[blockKey] = !visibleBlocks[blockKey];
      BentoGrid._applyCourseOverviewFilter();
    },

    _selectAllOverviewBlocks: function() {
      var visibleBlocks = BentoGrid._courseOverviewVisibleBlocks || {};
      (BentoGrid._courseOverviewFilterOrder || []).forEach(function(bk) {
        visibleBlocks[bk] = true;
      });
      BentoGrid._applyCourseOverviewFilter();
    },

    _clearOverviewBlocks: function() {
      var visibleBlocks = BentoGrid._courseOverviewVisibleBlocks || {};
      (BentoGrid._courseOverviewFilterOrder || []).forEach(function(bk) {
        visibleBlocks[bk] = false;
      });
      BentoGrid._applyCourseOverviewFilter();
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

        // Middle: "Got it" button for theory sections
        if (isTheorySec) {
          navHtml += '<button class="cu-entendido-btn" onclick="BentoGrid._markCuTheoryDone(' + idx + ',' + total + ',true,' + (idx + 1) + ')">' +
            _mi('check_circle') + ' Got it</button>';
        } else {
          navHtml += '<div class="cu-section-nav-center"></div>';
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
        if (!isTheorySec) {
          var footer = sec.querySelector('.cu-ex-footer');
          var navCenter = sec.querySelector('.cu-section-nav-center');
          if (footer && navCenter) navCenter.appendChild(footer);
        }
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
        var secState = { view: 'courseUnit', blockKey: BentoGrid._currentBlockKey, unitId: BentoGrid._currentUnitId, level: _cuLevel, filePath: BentoGrid._currentUnitFilePath, sectionIdx: idx };
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
        // Exclude tick-only buttons from unanswered detection (not clicking = valid 'NO' answer)
        item.querySelectorAll('.cu-yn-btn:not(.cu-item-tick-btn)').forEach(function(btn) {
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
      // Detect unanswered find-extra-word items
      sec.querySelectorAll('.cu-few-item').forEach(function(item, idx) {
        var hasWord = !!item.querySelector('.cu-few-word.cu-few-selected');
        var okBtn = item.querySelector('.cu-few-ok-btn');
        var hasOk = okBtn && okBtn.classList.contains('cu-few-ok-selected');
        if (!hasWord && !hasOk) unanswered.push(idx + 1);
      });
      // Detect unanswered bold-correct items
      sec.querySelectorAll('.cu-bc-item').forEach(function(item, idx) {
        var input = item.querySelector('.cu-bc-input');
        var okBtn = item.querySelector('.cu-bc-ok-btn');
        var hasInput = input && (input.value || '').trim() !== '';
        var hasOk = okBtn && okBtn.classList.contains('cu-bc-ok-selected');
        if (!hasInput && !hasOk) unanswered.push(idx + 1);
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

    // Normalises answers for text-input comparison.
    // Keep punctuation generally intact, but allow an optional final period.
    _normalizeCompareText: function(s) {
      return BentoGrid._normalizeText((s || '').toLowerCase())
        .replace(/\s+/g, ' ')
        .replace(/\s*\.\s*$/, '')
        .trim();
    },

    // Expands optional groups (word) in an answer string into all combinations.
    // E.g. "have cost (you) a fortune" → ["have cost you a fortune", "have cost a fortune"]
    // "in(to)" → ["into", "in"]
    _expandOptionals: function(ans) {
      var results = [ans];
      var parenRegex = /\(([^)]*)\)/;
      var maxIter = 10;
      while (maxIter-- > 0) {
        var anyMatch = false;
        var next = [];
        results.forEach(function(r) {
          var m = r.match(parenRegex);
          if (!m) { next.push(r); return; }
          anyMatch = true;
          var before = r.substring(0, m.index);
          var inside = m[1];
          var after = r.substring(m.index + m[0].length);
          var withInside = (before + inside + after).replace(/\s+/g, ' ').trim();
          var withoutInside = (before + after).replace(/\s+/g, ' ').trim();
          next.push(withInside);
          if (withoutInside !== withInside) next.push(withoutInside);
        });
        results = next;
        if (!anyMatch) break;
      }
      return results;
    },

    // Splits an answer part by '/' and returns trimmed lowercase alternatives (quotes normalised).
    // Also expands optional (word) groups into all combinations.
    _answerAlts: function(answerPart) {
      var base = BentoGrid._normalizeText((answerPart || '').trim()).split(/\s*\/\s*/);
      var expanded = [];
      base.forEach(function(a) {
        BentoGrid._expandOptionals(a.trim().toLowerCase()).forEach(function(opt) {
          var norm = BentoGrid._normalizeCompareText(opt);
          if (norm && expanded.indexOf(norm) === -1) expanded.push(norm);
        });
      });
      return expanded.filter(Boolean);
    },

    // Splits an item answer into per-gap parts.
    // Supports comma-separated answers and split-gap format like "cross ... off".
    _splitCourseAnswerParts: function(answer, inputCount) {
      var raw = (answer || '').trim();
      var parts = raw.split(/,\s*/);
      if (inputCount > 1 && parts.length === 1) {
        var splitGapParts = raw
          .split(/\s*(?:\.{3}|…)\s*/)
          .map(function(p) { return p.trim(); })
          .filter(Boolean);
        // Only switch to split-gap mode when parts align exactly with the rendered gaps.
        // Otherwise keep the default comma-based interpretation as a safe fallback.
        if (splitGapParts.length === inputCount) parts = splitGapParts;
      }
      if (inputCount === 1 && parts.length > 1) return [raw];
      return parts;
    },

    _doCheckCuExSection: function(sec) {
      var totalItems = 0;
      var correctItems = 0;
      var hasMcPassage = false;
      // Handle bold-correct exercises (input + OK button for each item)
      sec.querySelectorAll('.cu-bc-item').forEach(function(item) {
        totalItems++;
        var answer = (item.getAttribute('data-answer') || '').trim();
        var isOkAnswer = answer === '\u2713';
        var okBtn = item.querySelector('.cu-bc-ok-btn');
        var input = item.querySelector('.cu-bc-input');
        var okSelected = okBtn && okBtn.classList.contains('cu-bc-ok-selected');
        var given = input ? (input.value || '').trim() : '';

        // Disable controls
        if (okBtn) okBtn.disabled = true;
        if (input) input.disabled = true;

        var correct = false;
        if (isOkAnswer) {
          // Correct sentence: correct if OK pressed (no input) OR user typed "ok"
          var typedOk = given.toLowerCase() === 'ok';
          correct = (okSelected && given === '') || typedOk;
          if (correct) {
            item.classList.add('cu-bc-item-correct');
            if (okBtn) okBtn.classList.add('cu-bc-ok-correct');
            if (input && typedOk) input.classList.add('cu-input-correct');
          } else {
            item.classList.add('cu-bc-item-incorrect');
            if (okBtn) okBtn.classList.add(okSelected ? 'cu-bc-ok-incorrect' : 'cu-bc-ok-reveal');
            // Show correct OK if not selected
            if (!okSelected && okBtn) okBtn.classList.add('cu-bc-ok-reveal');
          }
        } else {
          // Wrong word: correct only if input matches answer (not OK)
          var alts = BentoGrid._answerAlts(answer);
          var givenNorm = BentoGrid._normalizeCompareText(given);
          correct = given !== '' && !okSelected && alts.some(function(a) { return a === givenNorm; });
          if (correct) {
            item.classList.add('cu-bc-item-correct');
            if (input) input.classList.add('cu-input-correct');
          } else {
            item.classList.add('cu-bc-item-incorrect');
            if (okSelected) {
              if (okBtn) okBtn.classList.add('cu-bc-ok-incorrect');
            } else if (given !== '') {
              if (input) input.classList.add('cu-input-incorrect');
            }
            // Reveal correct answer
            if (input && !input.disabled) input.disabled = true;
            // Show the correct answer visually
            if (input) {
              var revealEl = document.createElement('div');
              revealEl.className = 'cu-bc-reveal';
              revealEl.textContent = answer;
              item.querySelector('.cu-bc-controls').appendChild(revealEl);
            }
          }
        }
        if (correct) correctItems++;
      });
      // Handle find-extra-word exercises (clickable sentence words)
      sec.querySelectorAll('.cu-few-item').forEach(function(item) {
        totalItems++;
        var isOkItem = item.classList.contains('cu-few-ok-item');
        var okBtn = item.querySelector('.cu-few-ok-btn');
        var okSelected = okBtn && okBtn.classList.contains('cu-few-ok-selected');
        var words = item.querySelectorAll('.cu-few-word');
        var selectedWord = item.querySelector('.cu-few-word.cu-few-selected');

        // Disable OK button
        if (okBtn) okBtn.disabled = true;
        // Disable all word spans
        words.forEach(function(w) { w.setAttribute('data-few-disabled', '1'); });

        if (isOkItem) {
          // Correct-sentence: correct answer = OK pressed, no word selected
          if (okSelected && !selectedWord) {
            item.classList.add('cu-few-ok-correct');
            if (okBtn) okBtn.classList.add('cu-few-ok-correct');
            correctItems++;
          } else {
            if (okBtn) okBtn.classList.add('cu-few-ok-incorrect');
            if (selectedWord) {
              selectedWord.classList.add('cu-few-incorrect');
            }
          }
        } else {
          // Extra-word item: correct answer = correct word selected, no OK
          if (selectedWord) {
            var isAnswer = selectedWord.getAttribute('data-few-is-answer') === '1';
            selectedWord.classList.add(isAnswer ? 'cu-few-correct' : 'cu-few-incorrect');
            if (!isAnswer) {
              words.forEach(function(w) { if (w.getAttribute('data-few-is-answer') === '1') w.classList.add('cu-few-reveal'); });
            }
            if (isAnswer && !okSelected) correctItems++;
          } else if (okSelected) {
            // User clicked OK on an extra-word item — wrong
            if (okBtn) okBtn.classList.add('cu-few-ok-incorrect');
            words.forEach(function(w) { if (w.getAttribute('data-few-is-answer') === '1') w.classList.add('cu-few-reveal'); });
          } else {
            // Nothing selected: reveal the answer
            words.forEach(function(w) { if (w.getAttribute('data-few-is-answer') === '1') w.classList.add('cu-few-reveal'); });
          }
        }
      });
      // Handle word-spot exercises (clickable passage words)
      // In free-word-spot mode (data-free-ws="true"), scoring only counts answer words
      // (data-ws-answer="1"); non-answer words are still marked if incorrectly selected
      // but don't affect the score denominator.
      var freeWsPassage = sec.querySelector('.cu-ws-passage[data-free-ws="true"]');
      sec.querySelectorAll('.cu-ws-word').forEach(function(span) {
        var isAnswer = span.getAttribute('data-ws-answer') === '1';
        var isFreeWs = !!freeWsPassage;
        if (!isFreeWs || isAnswer) totalItems++;
        var isSelected = span.classList.contains('cu-ws-selected');
        var ok = isSelected === isAnswer;
        span.classList.add(ok ? 'cu-ws-correct' : 'cu-ws-incorrect');
        if (!ok && isAnswer) span.classList.add('cu-ws-reveal');
        span.setAttribute('data-ws-disabled', '1');
        if ((!isFreeWs || isAnswer) && ok) correctItems++;
      });
      // Handle comma-placement exercises (clickable comma slots between words)
      sec.querySelectorAll('.cu-comma-item').forEach(function(item) {
        totalItems++;
        var expected = (item.getAttribute('data-comma-answer') || '').split(',')
          .map(function(n) { return parseInt(n, 10); })
          .filter(function(n) { return !isNaN(n); });
        var expectedSet = {};
        expected.forEach(function(i) { expectedSet[i] = true; });
        var selected = [];
        item.querySelectorAll('.cu-comma-slot').forEach(function(slot) {
          var idx = parseInt(slot.getAttribute('data-comma-slot-idx') || '-1', 10);
          if (idx >= 0 && slot.classList.contains('cu-comma-selected')) selected.push(idx);
          slot.disabled = true;
          slot.setAttribute('data-comma-disabled', '1');
          slot.classList.remove('cu-comma-correct', 'cu-comma-incorrect', 'cu-comma-reveal', 'cu-comma-show-correct');
        });
        var selectedSet = {};
        selected.forEach(function(i) { selectedSet[i] = true; });
        var exactMatch = selected.length === expected.length &&
          selected.every(function(i) { return expectedSet[i]; });

        if (exactMatch) {
          item.classList.add('cu-comma-item-correct');
          item.querySelectorAll('.cu-comma-slot.cu-comma-selected').forEach(function(slot) {
            slot.classList.add('cu-comma-correct');
          });
          correctItems++;
        } else {
          item.classList.add('cu-comma-item-incorrect');
          item.querySelectorAll('.cu-comma-slot').forEach(function(slot) {
            var idx = parseInt(slot.getAttribute('data-comma-slot-idx') || '-1', 10);
            var isSel = slot.classList.contains('cu-comma-selected');
            var isExp = !!expectedSet[idx];
            if (isSel && !isExp) slot.classList.add('cu-comma-incorrect');
            if (!isSel && isExp) slot.classList.add('cu-comma-reveal');
          });
        }
      });
      // Handle word-tick exercises (e.g. Exercise P)
      sec.querySelectorAll('.cu-word-tick-btn').forEach(function(btn) {
        totalItems++;
        var word = (btn.getAttribute('data-word') || '').trim().toLowerCase();
        var answerWords = (btn.getAttribute('data-answer-words') || '').split(',').map(function(w) { return w.trim().toLowerCase(); }).filter(Boolean);
        var isSelected = btn.classList.contains('cu-word-tick-selected');
        var isCorrect = answerWords.indexOf(word) !== -1;
        var ok = isSelected === isCorrect;
        btn.classList.add(ok ? 'cu-word-tick-correct' : 'cu-word-tick-incorrect');
        if (!ok && isCorrect) btn.classList.add('cu-word-tick-reveal');
        btn.disabled = true;
        if (ok) correctItems++;
      });
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
          var correctOptIdx = qData ? qData.options.findIndex(function(o, oi) { return BentoGrid._parseCuMcOption(o, oi).letter === expected; }) : -1;
          var correctText = correctOptIdx !== -1 ? BentoGrid._getCuMcOptionText(qData.options[correctOptIdx], correctOptIdx) : expected;
          var studentOptIdx = (given && qData) ? qData.options.findIndex(function(o, oi) { return BentoGrid._parseCuMcOption(o, oi).letter === given; }) : -1;
          var studentText = studentOptIdx !== -1 ? BentoGrid._getCuMcOptionText(qData.options[studentOptIdx], studentOptIdx) : '';
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
            BentoGrid._applyMcPassageGapSlot(gap, correctText, 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled');
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
          var expected = BentoGrid._normalizeCompareText((input.getAttribute('data-answer') || '').trim());
          var given = BentoGrid._normalizeCompareText((input.value || '').trim());
          var alts = [];
          expected.split(/\s*\/\s*/).forEach(function(a) {
            BentoGrid._expandOptionals(a.trim()).forEach(function(opt) {
              var normOpt = BentoGrid._normalizeCompareText(opt);
              if (normOpt && alts.indexOf(normOpt) === -1) alts.push(normOpt);
            });
          });
          var filled = given !== '';
          var ok = filled && alts.some(function(a) { return given === a; });
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
        var answerParts = BentoGrid._splitCourseAnswerParts(answer, inputs.length);
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
          var expected = BentoGrid._normalizeCompareText((answerParts[partIdx] || '').trim());
          var given = BentoGrid._normalizeCompareText((input.value || '').trim());
          var alts = [];
          expected.split(/\s*\/\s*/).forEach(function(a) {
            BentoGrid._expandOptionals(a.trim()).forEach(function(opt) {
              var normOpt = BentoGrid._normalizeCompareText(opt);
              if (normOpt && alts.indexOf(normOpt) === -1) alts.push(normOpt);
            });
          });
          var filled = given !== '';
          var ok = filled && alts.some(function(a) { return given === a; });
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
        var isMultiSelectSection = sec.getAttribute('data-multi-select') === 'true';
        var isMultiSelectItem = item.getAttribute('data-multi-answer') === 'true';
        var isMultiSelect = isMultiSelectSection || isMultiSelectItem;
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
          var mcMatched = false;
          if (selected) {
            var letter = (selected.getAttribute('data-mc-letter') || '').trim().toUpperCase();
            mcMatched = answerParts.some(function(ap) { return ap.trim().toUpperCase() === letter; });
            selected.classList.add(mcMatched ? 'cu-option-correct' : 'cu-option-incorrect');
            if (mcMatched) {
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
          // Update the gap pill to show the answer and apply correct/incorrect colour
          var correctMcBtn = null;
          btns.forEach(function(b) {
            var bLetter = (b.getAttribute('data-mc-letter') || '').trim().toUpperCase();
            if (answerParts.some(function(ap) { return ap.trim().toUpperCase() === bLetter; })) correctMcBtn = b;
          });
          if (correctMcBtn) {
            var mcPillId = null;
            btns.some(function(b) { var pid = b.getAttribute('data-pill-id'); if (pid) { mcPillId = pid; return true; } });
            var mcPill = mcPillId ? document.getElementById(mcPillId) : null;
            if (mcPill) {
              mcPill.classList.remove('cu-mc-gap-pill-filled', 'cu-mc-gap-pill-correct', 'cu-mc-gap-pill-incorrect');
              if (selected) {
                var pillText = mcMatched
                  ? (BentoGrid._getCuMcButtonText(selected) || selected.getAttribute('data-mc-letter') || '')
                  : (BentoGrid._getCuMcButtonText(correctMcBtn) || correctMcBtn.getAttribute('data-mc-letter') || '');
                mcPill.classList.add(mcMatched ? 'cu-mc-gap-pill-correct' : 'cu-mc-gap-pill-incorrect');
                mcPill.textContent = pillText;
              } else {
                // Nothing selected — show correct answer in default filled (blue) style
                mcPill.classList.add('cu-mc-gap-pill-filled');
                mcPill.textContent = BentoGrid._getCuMcButtonText(correctMcBtn) || correctMcBtn.getAttribute('data-mc-letter') || '';
              }
            }
          }
        });
        // Check tick buttons for items with `tick` field (e.g. Exercise H)
        var tickBtns = item.querySelectorAll('.cu-item-tick-btn');
        if (tickBtns.length > 0) {
          totalItems++;
          var tickAnswer = (item.getAttribute('data-tick') || '').trim().toUpperCase();
          var tickSelected = Array.prototype.some.call(tickBtns, function(b) { return b.classList.contains('cu-yn-selected'); });
          var studentTickVal = tickSelected ? 'YES' : 'NO';
          var tickOk = studentTickVal === tickAnswer;
          tickBtns.forEach(function(b) {
            b.disabled = true;
            b.classList.remove('cu-yn-correct', 'cu-yn-incorrect', 'cu-yn-correct-reveal');
            if (b.classList.contains('cu-yn-selected')) {
              b.classList.add(tickOk ? 'cu-yn-correct' : 'cu-yn-incorrect');
            } else if (tickAnswer === 'YES') {
              b.classList.add('cu-yn-correct-reveal');
            }
          });
          if (tickOk) correctItems++;
        }
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
      // Handle crossword exercises (letter-box style)
      sec.querySelectorAll('.cu-cw-clue-item').forEach(function(item) {
        totalItems++;
        var expected = (item.getAttribute('data-answer') || '').toLowerCase();
        var boxes = item.querySelectorAll('.cu-cw-letter');
        var givenArr = Array.prototype.slice.call(boxes).map(function(b) { return (b.value || '').toLowerCase(); });
        var given = givenArr.join('');
        var filled = given.replace(/\s/g, '') !== '';
        var ok = filled && given === expected;
        boxes.forEach(function(b, bi) {
          b.classList.remove('cu-cw-letter-correct', 'cu-cw-letter-incorrect');
          b.disabled = true;
          if (!filled) return;
          var letterOk = (b.value || '').toLowerCase() === (expected[bi] || '');
          b.classList.add(letterOk ? 'cu-cw-letter-correct' : 'cu-cw-letter-incorrect');
        });
        // Show correct answer below the row when wrong or empty
        if (!ok) {
          var row = item.querySelector('.cu-cw-input-row');
          if (row && !row.querySelector('.cu-cw-answer-reveal')) {
            var revSpan = document.createElement('div');
            revSpan.className = 'cu-cw-answer-reveal';
            revSpan.setAttribute('role', 'status');
            revSpan.setAttribute('aria-live', 'polite');
            revSpan.textContent = expected;
            row.parentNode.insertBefore(revSpan, row.nextSibling);
          }
        }
        if (ok) correctItems++;
      });
      var checkBtn = sec.querySelector('.cu-check-btn');
      if (checkBtn) checkBtn.disabled = true;
      // Mark the section as checked so Show/Hide answers doesn't re-enable Check
      sec.setAttribute('data-checked', 'true');
      // If crossword has no other item types, keep "Show answers" visible (per-item toggles don't exist for crossword)
      var hasCwItems = sec.querySelectorAll('.cu-cw-clue-item').length > 0;
      var hasNonCwItems = sec.querySelectorAll('.cu-ex-item, .cu-comma-item').length > 0;
      // Hide "Show answers" button — per-item toggles replace it after checking
      var showBtn = sec.querySelector('.cu-show-all-btn');
      if (showBtn) showBtn.style.display = (hasCwItems && !hasNonCwItems) ? '' : 'none';
      // Disable all inputs, option buttons, and OK chips
      sec.querySelectorAll('.cu-gap-input').forEach(function(input) { input.disabled = true; });
      sec.querySelectorAll('.cu-option-btn').forEach(function(btn) { btn.disabled = true; });
      sec.querySelectorAll('.cu-few-ok-btn').forEach(function(btn) { btn.disabled = true; });
      sec.querySelectorAll('.cu-bc-ok-btn').forEach(function(btn) { btn.disabled = true; });
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
        // Disable OK chips while answers are shown
        sec.querySelectorAll('.cu-few-ok-btn').forEach(function(btn) { btn.disabled = true; });
        sec.querySelectorAll('.cu-ok-fill-btn').forEach(function(btn) { btn.disabled = true; });

        // Text inputs from cu-ex-items
        sec.querySelectorAll('.cu-ex-item, .cu-sync-item').forEach(function(item) {
          var answer = (item.getAttribute('data-answer') || '').trim();
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
          var answerParts = BentoGrid._splitCourseAnswerParts(answer, inputs.length);
          inputs.forEach(function(inp, i) {
            inp.setAttribute('data-saved-value', inp.value);
            var correctRaw = (answerParts[i] || answerParts[0] || '').trim();
            var alts = [];
            correctRaw.split(/\s*\/\s*/).forEach(function(a) {
              BentoGrid._expandOptionals(a.trim()).forEach(function(opt) {
                if (opt && alts.indexOf(opt) === -1) alts.push(opt);
              });
            });
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
            var mcGroupButtons = mcGroups[gId];
            mcGroupButtons.forEach(function(b) {
              var bLetter = (b.getAttribute('data-mc-letter') || '').trim().toUpperCase();
              if (answerParts.some(function(ap) { return ap.trim().toUpperCase() === bLetter; })) {
                b.classList.add('cu-option-correct-reveal');
                // Update the gap pill to show the correct answer
                var saPillId = b.getAttribute('data-pill-id');
                var saPill = saPillId ? document.getElementById(saPillId) : null;
                if (saPill) {
                  saPill.setAttribute('data-saved-pill-text', saPill.textContent);
                  saPill.setAttribute('data-saved-pill-filled', saPill.classList.contains('cu-mc-gap-pill-filled') ? '1' : saPill.classList.contains('cu-mc-gap-pill-correct') ? 'correct' : saPill.classList.contains('cu-mc-gap-pill-incorrect') ? 'incorrect' : '');
                  saPill.classList.remove('cu-mc-gap-pill-filled', 'cu-mc-gap-pill-correct', 'cu-mc-gap-pill-incorrect');
                  saPill.classList.add('cu-mc-gap-pill-filled');
                  saPill.textContent = BentoGrid._getCuMcButtonText(b) || b.getAttribute('data-mc-letter') || '';
                }
              }
            });
          });
          // YN buttons (regular yn-items)
          var ynAnswer = (item.getAttribute('data-answer') || '').trim().toUpperCase();
          var ynGroups = {};
          item.querySelectorAll('.cu-yn-btn:not(.cu-item-tick-btn)').forEach(function(b) {
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
          // Tick buttons (cu-item-tick-btn): reveal correct state based on data-tick attribute
          var tickAnswer = (item.getAttribute('data-tick') || '').trim().toUpperCase();
          if (tickAnswer) {
            item.querySelectorAll('.cu-item-tick-btn').forEach(function(b) {
              if (tickAnswer === 'YES') b.classList.add('cu-yn-correct-reveal');
            });
          }
        });

        // Passage inputs (data-passage-num)
        sec.querySelectorAll('.cu-gap-input[data-passage-num]').forEach(function(inp) {
          var correctRaw = (inp.getAttribute('data-answer') || '').trim();
          var alts = [];
          correctRaw.split(/\s*\/\s*/).forEach(function(a) {
            BentoGrid._expandOptionals(a.trim()).forEach(function(opt) {
              if (opt && alts.indexOf(opt) === -1) alts.push(opt);
            });
          });
          var correct = alts[0] || '';
          inp.setAttribute('data-saved-value', inp.value);
          inp.value = correct;
          inp.classList.add('cu-input-show-correct');
          BentoGrid._resizeCuInput(inp);
          BentoGrid._attachAltBadge(inp, alts);
        });

        // Drag-category exercise: move each chip into its correct category
        sec.querySelectorAll('.cu-drag-category-exercise').forEach(function(exEl) {
          var pool = exEl.querySelector('.cu-drag-pool');
          var zonesByCategory = BentoGrid._getCuDragCategoryZoneMap(exEl);
          exEl.querySelectorAll('.cu-drag-chip').forEach(function(chip) {
            var currentZone = chip.closest('.cu-drag-zone');
            var currentCat = currentZone ? currentZone.getAttribute('data-category') : '';
            chip.setAttribute('data-saved-category', currentCat || CU_DRAG_POOL_MARKER);
            var expectedCat = chip.getAttribute('data-answer') || '';
            var targetZone = expectedCat ? (zonesByCategory[expectedCat] || null) : null;
            var targetItems = targetZone ? targetZone.querySelector('.cu-drag-zone-items') : null;
            if (targetItems) targetItems.appendChild(chip);
            else if (pool) pool.appendChild(chip);
            chip.classList.remove('cu-drag-chip-correct', 'cu-drag-chip-incorrect', 'cu-drag-chip-unplaced');
            chip.setAttribute('draggable', 'false');
            chip.style.cursor = 'default';
          });
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
          var correctOptIdx = qData ? qData.options.findIndex(function(o, oi) { return BentoGrid._parseCuMcOption(o, oi).letter === expected; }) : -1;
          var correctText = correctOptIdx !== -1 ? BentoGrid._getCuMcOptionText(qData.options[correctOptIdx], correctOptIdx) : expected;
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
          BentoGrid._applyMcPassageGapSlot(gap, correctText, 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled');
        });

        // Word-tick exercise: reveal correct state
        sec.querySelectorAll('.cu-word-tick-btn').forEach(function(wBtn) {
          var word = (wBtn.getAttribute('data-word') || '').trim().toLowerCase();
          var answerWords = (wBtn.getAttribute('data-answer-words') || '').split(',').map(function(w) { return w.trim().toLowerCase(); }).filter(Boolean);
          var isCorrect = answerWords.indexOf(word) !== -1;
          if (isCorrect) wBtn.classList.add('cu-word-tick-reveal');
        });
        // Word-spot exercise: reveal correct words
        sec.querySelectorAll('.cu-ws-word').forEach(function(span) {
          if (span.getAttribute('data-ws-answer') === '1') span.classList.add('cu-ws-reveal');
        });
        // Comma-placement exercise: show expected comma slots
        sec.querySelectorAll('.cu-comma-item').forEach(function(item) {
          var expected = (item.getAttribute('data-comma-answer') || '').split(',')
            .map(function(n) { return parseInt(n, 10); })
            .filter(function(n) { return !isNaN(n); });
          item.querySelectorAll('.cu-comma-slot').forEach(function(slot) {
            slot.setAttribute('data-saved-selected', slot.classList.contains('cu-comma-selected') ? '1' : '0');
            slot.classList.remove('cu-comma-correct', 'cu-comma-incorrect', 'cu-comma-reveal');
            var idx = parseInt(slot.getAttribute('data-comma-slot-idx') || '-1', 10);
            var isExpected = expected.indexOf(idx) !== -1;
            slot.classList.toggle('cu-comma-selected', isExpected);
            slot.classList.toggle('cu-comma-show-correct', isExpected);
            slot.setAttribute('aria-pressed', isExpected ? 'true' : 'false');
            slot.disabled = true;
            slot.setAttribute('data-comma-disabled', '1');
          });
        });
        // Find-extra-word exercise: reveal correct word; for OK items highlight the sentence and button
        sec.querySelectorAll('.cu-few-item').forEach(function(item) {
          var okBtn = item.querySelector('.cu-few-ok-btn');
          if (item.classList.contains('cu-few-ok-item')) {
            item.classList.add('cu-few-ok-reveal');
            if (okBtn) { okBtn.disabled = true; okBtn.classList.add('cu-few-ok-reveal'); }
          } else {
            item.querySelectorAll('.cu-few-word').forEach(function(span) {
              if (span.getAttribute('data-few-is-answer') === '1') span.classList.add('cu-few-reveal');
            });
            if (okBtn) okBtn.disabled = true;
          }
        });
        // Bold-correct exercise: reveal correct answers
        sec.querySelectorAll('.cu-bc-item').forEach(function(item) {
          var answer = (item.getAttribute('data-answer') || '').trim();
          var isOkAnswer = answer === '\u2713';
          var input = item.querySelector('.cu-bc-input');
          var okBtn = item.querySelector('.cu-bc-ok-btn');
          if (input) {
            input.setAttribute('data-saved-value', input.value);
            input.disabled = true;
            if (isOkAnswer) {
              input.value = '';
              input.classList.add('cu-input-show-correct');
              BentoGrid._resizeCuInput(input);
            } else {
              // Show answer as a styled reveal div so long sentences display fully (same as check)
              var alts = answer.split(/\s*\/\s*/).map(function(a) { return a.trim(); }).filter(Boolean);
              var revealEl = document.createElement('div');
              revealEl.className = 'cu-bc-reveal cu-bc-show-reveal';
              revealEl.textContent = alts.join(' / ') || answer;
              input.style.display = 'none';
              input.parentNode.insertBefore(revealEl, input.nextSibling);
            }
          }
          if (okBtn) {
            okBtn.disabled = true;
            if (isOkAnswer) okBtn.classList.add('cu-bc-ok-reveal');
          }
        });
        // Crossword: fill each letter box with the correct character
        sec.querySelectorAll('.cu-cw-clue-item').forEach(function(item) {
          var ans = (item.getAttribute('data-answer') || '');
          var boxes = item.querySelectorAll('.cu-cw-letter');
          boxes.forEach(function(b, bi) {
            b.setAttribute('data-saved-cw-value', b.value);
            b.value = ans[bi] || '';
            b.classList.add('cu-input-show-correct');
            b.disabled = true;
          });
        });
      } else {
        // Hide answers: restore original values
        sec.setAttribute('data-answers-showing', 'false');
        if (icon) icon.textContent = 'visibility';
        if (btn) {
          var textNode = btn.lastChild;
          if (textNode && textNode.nodeType === 3) textNode.textContent = ' Show answers';
        }
        // Re-enable check button when answers are hidden (only if section hasn't been checked yet)
        var checkBtn = sec.querySelector('.cu-check-btn');
        var wasChecked = sec.getAttribute('data-checked') === 'true';
        if (checkBtn && !wasChecked) checkBtn.disabled = false;
        // Re-enable OK chips when answers are hidden
        sec.querySelectorAll('.cu-few-ok-btn').forEach(function(btn) { btn.disabled = false; });
        sec.querySelectorAll('.cu-ok-fill-btn').forEach(function(btn) { btn.disabled = false; });

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

        // Restore MC gap pills to their saved state
        sec.querySelectorAll('.cu-mc-gap-pill[data-saved-pill-text]').forEach(function(pill) {
          var savedState = pill.getAttribute('data-saved-pill-filled');
          pill.classList.remove('cu-mc-gap-pill-filled', 'cu-mc-gap-pill-correct', 'cu-mc-gap-pill-incorrect');
          if (savedState === '1') {
            pill.textContent = pill.getAttribute('data-saved-pill-text');
            pill.classList.add('cu-mc-gap-pill-filled');
          } else if (savedState === 'correct') {
            pill.textContent = pill.getAttribute('data-saved-pill-text');
            pill.classList.add('cu-mc-gap-pill-correct');
          } else if (savedState === 'incorrect') {
            pill.textContent = pill.getAttribute('data-saved-pill-text');
            pill.classList.add('cu-mc-gap-pill-incorrect');
          } else {
            pill.innerHTML = CU_MC_BLANK;
          }
          pill.removeAttribute('data-saved-pill-text');
          pill.removeAttribute('data-saved-pill-filled');
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

        // Drag-category exercise: restore chips to the student's saved placement
        sec.querySelectorAll('.cu-drag-category-exercise').forEach(function(exEl) {
          var pool = exEl.querySelector('.cu-drag-pool');
          var zonesByCategory = BentoGrid._getCuDragCategoryZoneMap(exEl);
          exEl.querySelectorAll('.cu-drag-chip').forEach(function(chip) {
            if (chip.hasAttribute('data-saved-category')) {
              var savedCat = chip.getAttribute('data-saved-category');
              if (savedCat === CU_DRAG_POOL_MARKER) {
                if (pool) pool.appendChild(chip);
              } else {
                var targetZone = savedCat ? (zonesByCategory[savedCat] || null) : null;
                var targetItems = targetZone ? targetZone.querySelector('.cu-drag-zone-items') : null;
                if (targetItems) targetItems.appendChild(chip);
                else if (pool) pool.appendChild(chip);
              }
              chip.removeAttribute('data-saved-category');
            }
            chip.classList.remove('cu-drag-chip-correct', 'cu-drag-chip-incorrect', 'cu-drag-chip-unplaced');
            if (!wasChecked) {
              chip.setAttribute('draggable', 'true');
              chip.style.cursor = '';
            } else {
              chip.setAttribute('draggable', 'false');
              chip.style.cursor = 'default';
            }
          });
        });

        // Restore MC passage gaps to their saved state
        sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
          var slot = gap.querySelector('.cu-mc-passage-gap-slot');
          if (gap.hasAttribute('data-saved-gap-classes')) {
            gap.className = gap.getAttribute('data-saved-gap-classes');
            gap.removeAttribute('data-saved-gap-classes');
          } else {
            gap.classList.remove('cu-mc-passage-gap-show-correct');
          }
          if (gap.hasAttribute('data-saved-slot-text') || gap.hasAttribute('data-saved-slot-class')) {
            var savedText = gap.hasAttribute('data-saved-slot-text') ? gap.getAttribute('data-saved-slot-text') : (slot ? slot.textContent : '');
            var savedClass = gap.hasAttribute('data-saved-slot-class') ? gap.getAttribute('data-saved-slot-class') : (slot ? slot.className : 'cu-mc-passage-gap-slot');
            BentoGrid._applyMcPassageGapSlot(gap, savedText, savedClass);
          }
          gap.removeAttribute('data-saved-slot-text');
          gap.removeAttribute('data-saved-slot-class');
        });

        // Word-tick exercise: remove reveal styling
        sec.querySelectorAll('.cu-word-tick-btn').forEach(function(wBtn) {
          wBtn.classList.remove('cu-word-tick-reveal');
        });
        // Word-spot exercise: remove reveal styling
        sec.querySelectorAll('.cu-ws-word').forEach(function(span) {
          span.classList.remove('cu-ws-reveal');
        });
        // Comma-placement exercise: restore selected slots from saved state
        sec.querySelectorAll('.cu-comma-item').forEach(function(item) {
          item.querySelectorAll('.cu-comma-slot').forEach(function(slot) {
            var wasSelected = slot.getAttribute('data-saved-selected') === '1';
            slot.classList.remove('cu-comma-show-correct');
            slot.classList.toggle('cu-comma-selected', wasSelected);
            slot.setAttribute('aria-pressed', wasSelected ? 'true' : 'false');
            slot.removeAttribute('data-saved-selected');
            if (!wasChecked) {
              slot.disabled = false;
              slot.removeAttribute('data-comma-disabled');
            }
          });
        });
        // Find-extra-word exercise: remove reveal styling
        sec.querySelectorAll('.cu-few-word').forEach(function(span) {
          span.classList.remove('cu-few-reveal');
        });
        sec.querySelectorAll('.cu-few-item').forEach(function(item) {
          item.classList.remove('cu-few-ok-reveal');
          var okBtn = item.querySelector('.cu-few-ok-btn');
          if (okBtn) { okBtn.disabled = false; okBtn.classList.remove('cu-few-ok-reveal'); }
        });
        // Bold-correct exercise: restore saved values
        sec.querySelectorAll('.cu-bc-item').forEach(function(item) {
          var input = item.querySelector('.cu-bc-input');
          var okBtn = item.querySelector('.cu-bc-ok-btn');
          // Remove any show-reveal divs added during show-answers
          item.querySelectorAll('.cu-bc-show-reveal').forEach(function(el) { el.remove(); });
          if (input) {
            input.style.display = '';
            var saved = input.getAttribute('data-saved-value');
            if (saved !== null) { input.value = saved; input.removeAttribute('data-saved-value'); }
            input.classList.remove('cu-input-show-correct');
            input.disabled = false;
            input.removeAttribute('data-alt-answers');
            input.removeAttribute('data-alt-idx');
            if (input._cuAltClickHandler) { input.removeEventListener('click', input._cuAltClickHandler); input._cuAltClickHandler = null; }
            input.readOnly = false;
            input._cuAltBadge = null;
          }
          if (okBtn) { okBtn.disabled = false; okBtn.classList.remove('cu-bc-ok-reveal'); }
        });
        // Crossword: restore saved letter values
        sec.querySelectorAll('.cu-cw-letter').forEach(function(b) {
          var saved = b.getAttribute('data-saved-cw-value');
          if (saved !== null) {
            b.value = saved;
            b.removeAttribute('data-saved-cw-value');
          }
          b.classList.remove('cu-input-show-correct');
          b.disabled = false;
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
        var correctText = gap.getAttribute('data-correct-text') || '';
        var studentText = gap.getAttribute('data-student-text') || '';
        var checkClass = gap.getAttribute('data-check-class') || 'cu-mc-passage-gap-show-correct';
        gap.classList.remove('cu-mc-passage-gap-correct', 'cu-mc-passage-gap-incorrect', 'cu-mc-passage-gap-show-correct');
        if (view === 'correct') {
          // All gaps in blue showing correct answers
          gap.classList.add('cu-mc-passage-gap-show-correct');
          BentoGrid._applyMcPassageGapSlot(gap, correctText, 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled');
        } else {
          // 'yours': restore post-check state
          gap.classList.add(checkClass);
          var displayText = (checkClass === 'cu-mc-passage-gap-show-correct') ? correctText : studentText;
          BentoGrid._applyMcPassageGapSlot(gap, displayText, 'cu-mc-passage-gap-slot cu-mc-passage-gap-filled');
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
          var alts = [];
          correctRaw.split(/\s*\/\s*/).forEach(function(a) {
            BentoGrid._expandOptionals(a.trim()).forEach(function(opt) {
              if (opt && alts.indexOf(opt) === -1) alts.push(opt);
            });
          });
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

  // Track the last focused gap input for word bank click-to-fill
  document.addEventListener('focusin', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('cu-gap-input') &&
        e.target.closest('.cu-section')) {
      BentoGrid._lastFocusedCuInput = e.target;
    }
  }, true);
})();
