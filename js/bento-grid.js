// js/bento-grid.js
// Premium Bento Grid dashboard sections rendered above the exam list

(function() {
  var _levelSelectorPreviewIdx = 0;
  var _levelColors = {
    'C1': { bg: '#ffffff', label: '#104862', code: '#46B1E1' },
    'B1': { bg: '#fff3e0', label: '#bf360c', code: '#ff9800' },
    'B2': { bg: '#e3f2fd', label: '#0d47a1', code: '#2196f3' },
    'C2': { bg: '#f3e5f5', label: '#4a148c', code: '#9c27b0' }
  };

  window.BentoGrid = {
    render: function(container) {
      if (!container) return;
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var nextLesson = this._findNextLesson(exams);

      var html = '<div class="bento-grid">';

      // Row 1: Arena · Practice
      html += this._renderTopRow(exams);

      // Row 2: Lessons · Micro-Learning
      html += this._renderLearningRow();

      // Row 3: Recommended Exercise
      html += this._renderRecommendedExercise(exams);

      // Row 4 (optional): Next in-progress lesson
      if (nextLesson) {
        html += this._renderNextLesson(nextLesson);
      }

      html += '</div>';
      container.innerHTML = html;
    },

    _renderTopRow: function(exams) {
      return '<div class="bento-top-row">' +

        '<div class="bento-card bento-card-summit" onclick="BentoGrid.selectMode(\'exam\')">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Test Simulation</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-card-ascent" onclick="BentoGrid.selectMode(\'practice\')">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Test Practice</div>' +
          '</div>' +
        '</div>' +

      '</div>';
    },

    _renderMixedRow: function(exams) {
      var availableCount = (exams || []).filter(function(e) { return e.status === 'available'; }).length;
      var disabled = availableCount === 0;
      var clickAttr = disabled ? '' : ' onclick="BentoGrid.startMixedTest()"';
      var descText = disabled
        ? 'No tests available yet'
        : 'Mix exercises from ' + availableCount + ' tests — speaking 3 & 4 always from the same test';
      return '<div class="bento-mixed-row">' +
        '<div class="bento-card bento-card-mixed' + (disabled ? ' disabled' : '') + '"' + clickAttr + '>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">' +
              '<span class="material-symbols-outlined" style="vertical-align:middle;font-size:1.4rem;margin-right:6px">shuffle</span>' +
              'Random Mix' +
            '</div>' +
            '<div class="bento-card-desc">' + descText + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    startMixedTest: function() {
      if (window.MixedTest) {
        MixedTest.start();
      }
    },

    _renderLearningRow: function() {
      return '<div class="bento-learning-row">' +

        '<div class="bento-card bento-card-quicksteps" onclick="BentoGrid.openMicroLearning()">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Fast Learning</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-card-basecamp" onclick="BentoGrid.openLessons()">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Course</div>' +
          '</div>' +
        '</div>' +

      '</div>';
    },

    _renderRecommendedExercise: function(exams) {
      var weak = this._getWeakTopic(exams);

      // If no score data yet, suggest first incomplete part
      if (!weak) {
        for (var i = 0; i < exams.length; i++) {
          if (exams[i].status !== 'available') continue;
          var secData = exams[i].sections && exams[i].sections['reading'];
          if (secData && secData.total > 0) {
            var firstPart = 1;
            for (var p = 1; p <= secData.total; p++) {
              if (!secData.completed || secData.completed.indexOf(p) === -1) {
                firstPart = p;
                break;
              }
            }
            weak = { examId: exams[i].id, section: 'reading', part: firstPart, ratio: null };
            break;
          }
        }
      }

      if (!weak) {
        return '<div class="bento-card bento-card-weakspot">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Weak Spot</div>' +
            '<div class="bento-card-desc">' + 'Complete some exercises to get personalised recommendations!' + '</div>' +
          '</div>' +
        '</div>';
      }

      var scoreHtml = weak.ratio !== null
        ? ' · ' + Math.round(weak.ratio * 100) + '%'
        : '';

      return '<div class="bento-card bento-card-weakspot" onclick="Exercise.openPart(\'' + this._escapeHTML(weak.examId) + '\', \'' + weak.section + '\', ' + (weak.part || 1) + ')">' +
        '<div class="bento-card-inner">' +
          '<div class="bento-card-title">Weak Spot</div>' +
          '<div class="bento-card-desc">' + this._escapeHTML(weak.examId) + ' — ' + this._capitalize(weak.section) + (weak.part ? ' ' + 'Part' + ' ' + weak.part : '') + scoreHtml + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderGradeTracker: function(exams) {
      if (typeof ScoreCalculator === 'undefined') return '';
      var noScore = '–';
      var levelData = AppState.currentLevel || 'C1';
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      var skillTotals = {};
      var examCount = 0;

      exams.forEach(function(exam) {
        if (exam.status !== 'available') return;
        try {
          var scores = ScoreCalculator.getAllSkillScores(exam.id);
          var hasData = scores.some(function(s) { return s.raw > 0; });
          if (!hasData) return;
          examCount++;
          scores.forEach(function(s) {
            if (!skillTotals[s.skill]) skillTotals[s.skill] = { raw: 0, maxRaw: 0, scale: 0, count: 0 };
            skillTotals[s.skill].raw += s.raw;
            skillTotals[s.skill].maxRaw += s.maxRaw;
            skillTotals[s.skill].scale += s.scale;
            skillTotals[s.skill].count++;
          });
        } catch (e) { /* skip */ }
      });

      var scaleBounds = { A2: [82, 140], B1: [102, 160], B2: [122, 180], C1: [142, 200], C2: [162, 220] };
      var bounds = scaleBounds[levelData] || [142, 200];
      var scaleMin = bounds[0];
      var scaleMax = bounds[1];

      var allSkills = ['Reading', 'Use of English', 'Writing', 'Listening', 'Speaking'];
      var skillColors = {
        'Reading': '#3b82f6',
        'Use of English': '#8b5cf6',
        'Writing': '#10b981',
        'Listening': '#f59e0b',
        'Speaking': '#ef4444'
      };

      var barsHtml = '';
      allSkills.forEach(function(skill) {
        var d = skillTotals[skill];
        var color = skillColors[skill] || '#3b82f6';
        if (d && d.count > 0) {
          var avgScale = Math.round(d.scale / d.count);
          var pct = Math.round(((avgScale - scaleMin) / (scaleMax - scaleMin)) * 100);
          pct = Math.max(2, Math.min(100, pct));
          barsHtml +=
            '<div class="bento-grade-bar-row">' +
              '<div class="bento-grade-skill">' + skill + '</div>' +
              '<div class="bento-grade-track">' +
                '<div class="bento-grade-fill" style="width:' + pct + '%;background:' + color + '"></div>' +
              '</div>' +
              '<div class="bento-grade-score">' + avgScale + '</div>' +
            '</div>';
        } else {
          barsHtml +=
            '<div class="bento-grade-bar-row">' +
              '<div class="bento-grade-skill">' + skill + '</div>' +
              '<div class="bento-grade-track">' +
                '<div class="bento-grade-fill" style="width:0%;background:' + color + '"></div>' +
              '</div>' +
              '<div class="bento-grade-score" style="opacity:0.5">' + noScore + '</div>' +
            '</div>';
        }
      });

      var subtitleText = examCount > 0
        ? 'Avg. across' + ' ' + examCount + ' ' + 'exams' + ' · ' + 'Scale' + ' ' + scaleMin + '–' + scaleMax
        : 'Latest registered scores';

      return '<div class="bento-grade-row">' +
        '<div class="bento-card bento-grade-tracker">' +
          '<div class="bento-grade-header">' +
            '<div class="bento-grade-title">' + _mi('bar_chart') + ' ' + 'Current Level' + ' · ' + levelData + '</div>' +
            '<div class="bento-grade-subtitle">' + subtitleText + '</div>' +
          '</div>' +
          '<div class="bento-grade-bars">' + barsHtml + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderNextLesson: function(lesson) {
      var completedParts = lesson.completedParts || 0;
      var totalParts = lesson.totalParts || 1;

      return '<div class="bento-card bento-card-checkpoint" onclick="Exercise.openPart(\'' + this._escapeHTML(lesson.examId) + '\', \'' + lesson.section + '\', ' + lesson.part + ')">' +
        '<div class="bento-card-inner">' +
          '<div class="bento-card-title">Checkpoint</div>' +
          '<div class="bento-card-desc">' + this._escapeHTML(lesson.examId) + ' — ' + this._capitalize(lesson.section) + ' ' + 'Part' + ' ' + lesson.part + ' (' + completedParts + '/' + totalParts + ')</div>' +
        '</div>' +
      '</div>';
    },

    _getWeakTopic: function(exams) {
      if (typeof ScoreCalculator === 'undefined') return null;
      var worstRatio = 1.1;
      var worstItem = null;

      exams.forEach(function(exam) {
        if (exam.status !== 'available') return;
        var sections = ['reading', 'listening', 'writing', 'speaking'];
        sections.forEach(function(sec) {
          var secData = exam.sections && exam.sections[sec];
          if (!secData || !secData.completed || secData.completed.length === 0) return;
          try {
            var skillScores = ScoreCalculator.getSkillScoresForSection(exam.id, sec);
            skillScores.forEach(function(s) {
              if (s.maxRaw > 0) {
                var ratio = s.raw / s.maxRaw;
                if (ratio < worstRatio) {
                  worstRatio = ratio;
                  worstItem = { examId: exam.id, section: sec, part: null, ratio: ratio };
                }
              }
            });
          } catch (e) { /* skip */ }
        });
      });

      return worstItem;
    },

    _findNextLesson: function(exams) {
      for (var i = 0; i < exams.length; i++) {
        var exam = exams[i];
        if (exam.status !== 'available') continue;
        var sections = ['reading', 'listening', 'writing', 'speaking'];
        for (var j = 0; j < sections.length; j++) {
          var sec = sections[j];
          var sectionData = exam.sections && exam.sections[sec];
          if (!sectionData) continue;
          var inProgress = sectionData.inProgress || [];
          if (inProgress.length > 0) {
            return {
              examId: exam.id,
              section: sec,
              part: inProgress[0],
              completedParts: (sectionData.completed || []).length,
              totalParts: sectionData.total || 1
            };
          }
        }
      }
      return null;
    },

    _getUserName: function() {
      if (AppState.currentUser) {
        return AppState.currentUser.user_metadata?.full_name ||
               AppState.currentUser.user_metadata?.name ||
               AppState.currentUser.email?.split('@')[0] ||
               null;
      }
      return null;
    },

    _capitalize: function(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    _escapeHTML: function(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    selectMode: function(mode) {
      if (typeof Dashboard !== 'undefined' && Dashboard.renderSubpage) {
        var modeState = { view: 'subpage', mode: mode };
        history.pushState(modeState, '', Router.stateToPath(modeState));
        Dashboard.renderSubpage(mode);
      } else if (typeof Dashboard !== 'undefined' && Dashboard.setMode) {
        Dashboard.setMode(mode);
      }
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) {
        App.updateHeaderModeButtons();
      }
    },

    openMicroLearning: function() {
      if (typeof FastExercises !== 'undefined') {
        FastExercises.openCategories();
      } else {
        BentoGrid.openQuickstepsChooser();
      }
    },

    openQuickstepsChooser: function() {
      var content = document.getElementById('main-content');
      if (!content) return;

      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];

      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var categories = [
        { id: 'all', icon: 'bolt', name: 'All Exercises', desc: 'Mixed practice from all categories' },
        { id: 'definitions', icon: 'menu_book', name: 'Definitions', desc: 'Vocabulary and word meaning exercises' },
        { id: 'pronunciation', icon: 'record_voice_over', name: 'Pronunciation', desc: 'Practice correct word pronunciation' },
        { id: 'phrasal_verbs', icon: 'link', name: 'Phrasal Verbs', desc: 'Common phrasal verb exercises' },
        { id: 'mini_listening', icon: 'headphones', name: 'Mini-Listening', desc: 'Short audio comprehension tasks' },
        { id: 'mini_reading', icon: 'edit_note', name: 'Mini-Reading', desc: 'Quick reading comprehension tasks' },
        { id: 'transformations', icon: 'sync', name: 'Transformations', desc: 'Key word transformation practice' }
      ];

      var buttonsHtml = '';
      categories.forEach(function(cat) {
        buttonsHtml += '<button class="qs-category-btn" onclick="BentoGrid._startQuicksteps(\'' + cat.id + '\')">' +
          '<span class="qs-category-icon">' + _mi(cat.icon) + '</span>' +
          '<div class="qs-category-info">' +
            '<div class="qs-category-name">' + cat.name + '</div>' +
            '<div class="qs-category-desc">' + cat.desc + '</div>' +
          '</div>' +
        '</button>';
      });

      // Build sidebars like main dashboard
      var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(exams);
      }
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        rightSidebarContent = BentoGrid._buildContinueBasecampHtml(exams);
        rightSidebarContent += BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
      }

      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="qs-chooser-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="loadDashboard()">' + 'Back' + '</button>' +
                '<div>' +
                  '<div class="subpage-title">' + 'Quicksteps' + '</div>' +
                  '<div class="subpage-subtitle">' + 'Choose a category to start practicing' + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="qs-chooser-grid">' + buttonsHtml + '</div>' +
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
      var qsState = { view: 'quicksteps' };
      history.pushState(qsState, '', Router.stateToPath(qsState));
    },

    _startQuicksteps: function(category) {
      if (typeof MicroLearning !== 'undefined') {
        MicroLearning._selectedCategory = category;
        MicroLearning.open();
      }
    },

    openLessons: async function() {
      var content = document.getElementById('main-content');
      if (!content) return;
      var level = AppState.currentLevel || 'C1';

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      // Render initial layout with loading spinners in both sidebars
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

        // Left sidebar: course navigation
        leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(indexData, level, null);

        // Default to first block (Block 1)
        var defaultBlock = blockOrder[0] || '1';
        var headerHtml =
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="loadDashboard()">Back</button>' +
            '<div>' +
              '<div class="subpage-title">' + _mi('auto_stories') + ' Course</div>' +
              '<div class="subpage-subtitle">Structured lessons for ' + level + '</div>' +
            '</div>' +
          '</div>';
        centerSection.innerHTML = headerHtml + BentoGrid._renderCourseOverview();
      } else {
        // Fallback: no index available for this level
        leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(null, level, null);
        var headerHtml =
          '<div class="subpage-header">' +
            '<button class="subpage-back-btn" onclick="loadDashboard()">Back</button>' +
            '<div>' +
              '<div class="subpage-title">' + _mi('auto_stories') + ' Course</div>' +
              '<div class="subpage-subtitle">Structured lessons for ' + level + '</div>' +
            '</div>' +
          '</div>';
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
    },

    _selectCourseBlock: function(blockKey) {
      var centerSection = document.getElementById('courseCenterSection');
      if (!centerSection || !BentoGrid._courseBlocks) return;

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      var level = BentoGrid._courseLevel || 'C1';
      var blockProgress = BentoGrid._getCourseProgress(level);
      var blockItems = (BentoGrid._courseBlocks || {})[blockKey] || [];
      var blockHasProgress = blockItems.some(function(i) { return !!blockProgress[i.id]; });
      var resetBlockBtn = blockHasProgress
        ? '<button class="cu-reset-btn" onclick="BentoGrid._resetCourseBlock(\'' + blockKey + '\')" title="Restart block">' + _mi('restart_alt') + ' Restart</button>'
        : '';
      var headerHtml =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="BentoGrid._backToCourseOverview()">Overview</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' Block ' + blockKey + '</div>' +
            '<div class="subpage-subtitle">Structured lessons for ' + level + '</div>' +
          '</div>' +
          resetBlockBtn +
        '</div>';

      centerSection.innerHTML = headerHtml + BentoGrid._renderCourseBlockView(blockKey);
    },

    _backToCourseOverview: function() {
      var centerSection = document.getElementById('courseCenterSection');
      if (!centerSection) return;
      var level = BentoGrid._courseLevel || 'C1';
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      var headerHtml =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="loadDashboard()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' Course</div>' +
            '<div class="subpage-subtitle">Structured lessons for ' + level + '</div>' +
          '</div>' +
        '</div>';
      centerSection.innerHTML = headerHtml + BentoGrid._renderCourseOverview();
      // Update left sidebar to deselect any active unit
      var leftSidebar = document.getElementById('courseLeftSidebar');
      if (leftSidebar && BentoGrid._courseIndexData) {
        leftSidebar.innerHTML = BentoGrid._buildCourseNavSidebarHtml(BentoGrid._courseIndexData, level, null);
      }
    },

    _renderCourseBlockView: function(activeBlockKey) {
      var self = this;
      var level = BentoGrid._courseLevel || 'C1';
      var blocks = BentoGrid._courseBlocks || {};
      var progress = BentoGrid._getCourseProgress(level);
      var sectionProgress = BentoGrid._getCourseSectionProgress(level);

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      var items = blocks[activeBlockKey] || [];
      var unitItems = items.filter(function(i) { return i.type === 'grammar' || i.type === 'vocabulary'; });
      var reviewItem = items.find(function(i) { return i.type === 'review'; });

      var html = '<div class="cu-course-view"><div class="fe-map-container">';

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
          var theoryPoints = meta && meta.theory && meta.theory.length ? meta.theory : [{ label: theoryLabel, sectionIdx: 0 }];
          var exercisePoints = meta && meta.exercises && meta.exercises.length ? meta.exercises : [{ label: 'A', sectionIdx: theoryPoints.length }];
          html +=
            '<div class="fe-map-lesson ' + (isDone ? 'fe-lesson-complete' : 'fe-lesson-active') + '" style="cursor:pointer" ' +
              'onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'' + unitPath + '\', 0)">' +
              '<div class="fe-map-lesson-title">' +
                '<span class="fe-map-lesson-num">' + theoryLabel + '</span>' +
              '</div>' +
              BentoGrid._buildCourseBlockDotsHtml(theoryPoints, unitSectionProgress, 'fe-dot-explanation') +
            '</div>' +
            '<div class="fe-map-lesson ' + (isDone ? 'fe-lesson-complete' : 'fe-lesson-pending') + '" style="cursor:pointer;margin-top:10px" ' +
              'onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'' + unitPath + '\', \'exercises\')">' +
              '<div class="fe-map-lesson-title">' +
                '<span class="fe-map-lesson-num">Exercises</span>' +
              '</div>' +
              BentoGrid._buildCourseBlockDotsHtml(exercisePoints, unitSectionProgress, 'fe-dot-exercise') +
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

    _buildCourseBlockDotsHtml: function(points, visitedPoints, pendingClass) {
      var dotsHtml = '<div class="fe-map-points-row">';
      (points || []).forEach(function(point) {
        var isVisited = !!(visitedPoints && visitedPoints[point.sectionIdx]);
        dotsHtml += '<span class="fe-dot fe-dot-section-marker ' + (isVisited ? 'fe-dot-done' : 'fe-dot-outline ' + pendingClass) + '" title="' + point.label + '">' +
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
          '<button class="subpage-back-btn" onclick="BentoGrid.openLessons()">Back</button>' +
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
            '<button class="subpage-back-btn" onclick="BentoGrid.openLessons()">Back</button>' +
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
      var backFn = blockNum ? 'BentoGrid._selectCourseBlock(\'' + blockNum + '\')' : 'BentoGrid.openLessons()';
      var unitHasProgress = !!(BentoGrid._getCourseSectionProgress(level)[unitId] && Object.keys(BentoGrid._getCourseSectionProgress(level)[unitId]).length);
      var resetUnitBtn = unitHasProgress
        ? '<button class="cu-reset-btn" onclick="BentoGrid._resetCourseUnit(\'' + unitId + '\')" title="Restart unit">' + _mi('restart_alt') + ' Restart</button>'
        : '';

      var html =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="' + backFn + '">Block ' + (blockNum || '') + '</button>' +
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
      } else {
        html += '<div class="fe-error">Unknown unit type.</div>';
      }

      html += '</div>';
      centerSection.innerHTML = html;

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
          html += '<div class="cu-section cu-exercise" id="' + secId + '">' +
            '<div class="cu-section-title">' + _mi('edit_note') + ' ' + self._escapeHTML(section.title) + '</div>';

          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }

          html += self._renderCuWordBank(section.words);

          var items = section.items || [];
          var hasInteractive = items.some(function(it) { return !!(it && it.sentence); });
          html += '<div class="cu-ex-items">';
          items.forEach(function(item, iIdx) {
            html += self._renderCourseExItem(item, iIdx, 'gr-' + section.title.replace(/\W+/g, '') + '-' + iIdx);
          });
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

      // Phrasal verbs
      if (sections.phrasal_verbs && sections.phrasal_verbs.length) {
        html += '<div class="cu-section cu-pv" id="cu-sec-' + (sectionIndex++) + '">' +
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

      // Collocations
      if (sections.collocations_patterns && Object.keys(sections.collocations_patterns).length) {
        html += '<div class="cu-section cu-collocations" id="cu-sec-' + (sectionIndex++) + '">' +
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

      // Idioms
      if (sections.idioms && sections.idioms.length) {
        html += '<div class="cu-section cu-idioms" id="cu-sec-' + (sectionIndex++) + '">' +
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

      // Word formation
      if (sections.word_formation && sections.word_formation.length) {
        html += '<div class="cu-section cu-wf" id="cu-sec-' + (sectionIndex++) + '">' +
          '<div class="cu-section-title">' + _mi('spellcheck') + ' Word Formation</div>' +
          '<div class="cu-pv-list">';
        sections.word_formation.forEach(function(wf) {
          var forms = [];
          if (wf.noun) forms.push('n: ' + (Array.isArray(wf.noun) ? wf.noun.join(', ') : wf.noun));
          if (wf.verb) forms.push('v: ' + (Array.isArray(wf.verb) ? wf.verb.join(', ') : wf.verb));
          if (wf.adjective) forms.push('adj: ' + (Array.isArray(wf.adjective) ? wf.adjective.join(', ') : wf.adjective));
          if (wf.adverb) forms.push('adv: ' + (Array.isArray(wf.adverb) ? wf.adverb.join(', ') : wf.adverb));
          html += '<div class="cu-pv-item">' +
            '<span class="cu-pv-verb">' + self._escapeHTML(wf.base || wf.root || '') + '</span>' +
            '<span class="cu-pv-meaning">' + self._escapeHTML(forms.join(' · ')) + '</span>' +
          '</div>';
        });
        html += '</div></div>';
      }

      // Exercises — each letter as its own section
      if (sections.exercises && Object.keys(sections.exercises).length) {
        Object.keys(sections.exercises).forEach(function(key) {
          var ex = sections.exercises[key];
          var secId = 'cu-sec-' + sectionIndex;
          html += '<div class="cu-section cu-exercise" id="' + secId + '">' +
            '<div class="cu-section-title">' + _mi('edit_note') + ' Exercise ' + self._escapeHTML(key) + ': ' + self._escapeHTML(ex.title || '') + '</div>';
          if (ex.instructions) html += '<div class="cu-ex-instructions">' + _bold(ex.instructions) + '</div>';
          html += self._renderCuWordBank(ex.words);
          var questions = ex.questions || [];
          var hasInteractive = questions.some(function(q) { return !!(q && q.sentence); });
          html += '<div class="cu-ex-items">';
          questions.forEach(function(q, qIdx) {
            html += self._renderCourseExItem(q, qIdx, 'vc-' + key.replace(/\W+/g, '') + '-' + qIdx);
          });
          html += '</div>';
          if (hasInteractive) html += self._renderCuExFooter(secId);
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
      '</div>';

      (data.sections || []).forEach(function(section, sectionIdx) {
        if (section.type === 'exercise') {
          var rvSecId = 'cu-sec-' + sectionIdx;
          html += '<div class="cu-section cu-exercise" id="' + rvSecId + '">' +
            '<div class="cu-section-title">' + _mi('quiz') + ' ' + self._escapeHTML(section.title) + '</div>';
          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }
          html += '<div class="cu-ex-items">';
          var reviewUnitId = BentoGrid._currentUnitId || '';
          var pointsPerItem = (section.scoring && section.scoring.pointsPerItem) || 1;
          var rvItems = section.items || [];
          var hasInteractiveRv = rvItems.some(function(it) { return !!(it && it.sentence); });
          rvItems.forEach(function(item, iIdx) {
            var trackCb = reviewUnitId
              ? 'BentoGrid._trackReviewItem(\'' + reviewUnitId + '\',' + sectionIdx + ',' + pointsPerItem + ')'
              : '';
            html += self._renderCourseExItem(item, iIdx, 'rv-' + section.title.replace(/\W+/g, '') + '-' + iIdx, trackCb);
          });
          html += '</div>';
          if (hasInteractiveRv) html += self._renderCuExFooter(rvSecId);
          html += '</div>';
        }
      });

      return html || '<div class="fe-error">No content available.</div>';
    },

    // --- Interactive exercise item helpers ---

    _renderCuWordBank: function(words) {
      var self = this;
      if (!words || !words.length) return '';
      return '<div class="cu-ex-wordbank">' +
        '<span class="material-symbols-outlined">view_list</span> <strong>Word bank:</strong> ' +
        words.map(function(w) { return '<span class="cu-wordbank-item">' + self._escapeHTML(w) + '</span>'; }).join('') +
        '</div>';
    },

    _renderCuExFooter: function(secId) {
      return '<div class="cu-ex-footer">' +
        '<button class="cu-check-btn" onclick="BentoGrid._checkCuExSection(\'' + secId + '\')">' +
          '<span class="material-symbols-outlined">check_circle</span> Corregir</button>' +
        '<button class="cu-show-all-btn" onclick="BentoGrid._showAllCuAnswers(\'' + secId + '\')">' +
          '<span class="material-symbols-outlined">visibility</span> Mostrar respuestas</button>' +
        '</div>';
    },

    _renderCourseExItem: function(item, idx, idBase, trackCallback) {
      var self = this;
      var sentence = item.sentence || '';
      var answer = item.answer || '';
      var inputId = 'cuex-' + idBase;

      var sentenceHtml = self._renderCourseExSentence(sentence, inputId);
      return '<div class="cu-ex-item" data-answer="' + self._escapeHTML(answer) + '">' +
        '<div class="cu-ex-sentence">' + (idx + 1) + '. ' + sentenceHtml + '</div>' +
        '<div class="cu-ex-foot">' +
          '<div class="cu-answer" style="display:none">' + self._escapeHTML(answer) + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderCourseExSentence: function(sentence, inputIdBase) {
      var self = this;
      // Tokenise sentence into: plain text, gap markers, bold+option patterns, plain bold
      var parts = [];
      var tokenRegex = /([.…]{5,}|\*\*[^*]+\*\*)/g;
      var lastIndex = 0;
      var match;
      while ((match = tokenRegex.exec(sentence)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', val: sentence.slice(lastIndex, match.index) });
        }
        var m = match[0];
        if (m.charAt(0) === '*') {
          // Bold marker
          var inner = m.slice(2, -2);
          if (inner.indexOf('/') !== -1) {
            parts.push({ type: 'options', parts: inner.split(/\s*\/\s*/) });
          } else {
            parts.push({ type: 'bold', val: inner });
          }
        } else {
          parts.push({ type: 'gap' });
        }
        lastIndex = match.index + m.length;
      }
      if (lastIndex < sentence.length) {
        parts.push({ type: 'text', val: sentence.slice(lastIndex) });
      }

      // Check if there are any interactive elements
      var hasInteractive = parts.some(function(p) { return p.type === 'gap' || p.type === 'options'; });

      // If no gaps or options detected, add a standalone answer input at the end
      if (!hasInteractive) {
        parts.push({ type: 'standalone' });
      }

      var gapCount = 0;
      var optCount = 0;
      return parts.map(function(p) {
        if (p.type === 'text') {
          return self._escapeHTML(p.val);
        } else if (p.type === 'bold') {
          return '<strong>' + self._escapeHTML(p.val) + '</strong>';
        } else if (p.type === 'gap') {
          return '<input type="text" id="' + inputIdBase + '_g' + (gapCount++) + '" class="cu-gap-input" placeholder="...">';
        } else if (p.type === 'options') {
          var oId = inputIdBase + '_o' + (optCount++);
          return p.parts.map(function(opt) {
            return '<button class="cu-option-btn" data-group="' + oId + '" onclick="BentoGrid._selectCourseOption(this)" type="button">' + self._escapeHTML(opt.trim()) + '</button>';
          }).join('');
        } else if (p.type === 'standalone') {
          return '<br><input type="text" class="cu-gap-input cu-gap-standalone" placeholder="Your answer...">';
        }
        return '';
      }).join('');
    },

    _selectCourseOption: function(btn) {
      var group = btn.getAttribute('data-group');
      if (!group) return;
      var siblings = document.querySelectorAll('.cu-option-btn[data-group="' + group + '"]');
      siblings.forEach(function(s) { s.classList.remove('cu-option-selected'); });
      btn.classList.add('cu-option-selected');
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
      if (!confirm('Restart this unit? Your progress will be cleared.')) return;
      var prog = BentoGrid._getCourseProgress(level);
      delete prog[unitId];
      try { localStorage.setItem('cambridge_course_progress_' + level, JSON.stringify(prog)); } catch(e) {}
      var secProg = BentoGrid._getCourseSectionProgress(level);
      delete secProg[unitId];
      try { localStorage.setItem('cambridge_course_section_progress_' + level, JSON.stringify(secProg)); } catch(e) {}
      // Reopen the unit fresh
      var foundItem = BentoGrid._courseIndexData && BentoGrid._courseIndexData.items &&
        BentoGrid._courseIndexData.items.find(function(i) { return i.id === unitId; });
      if (foundItem) {
        BentoGrid.openCourseUnit(unitId, 'data/Course/' + level + '/' + foundItem.file);
      }
    },

    _resetCourseBlock: function(blockKey) {
      var level = BentoGrid._courseLevel || 'C1';
      if (!confirm('Restart Block ' + blockKey + '? Progress for all units in this block will be cleared.')) return;
      var items = (BentoGrid._courseBlocks || {})[blockKey] || [];
      var prog = BentoGrid._getCourseProgress(level);
      var secProg = BentoGrid._getCourseSectionProgress(level);
      items.forEach(function(item) {
        delete prog[item.id];
        delete secProg[item.id];
      });
      try { localStorage.setItem('cambridge_course_progress_' + level, JSON.stringify(prog)); } catch(e) {}
      try { localStorage.setItem('cambridge_course_section_progress_' + level, JSON.stringify(secProg)); } catch(e) {}
      BentoGrid._selectCourseBlock(blockKey);
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
        data[skey] = (data[skey] || 0) + (pts || 1);
        localStorage.setItem(key, JSON.stringify(data));
      } catch(e) {}
    },

    _getReviewAnswered: function(level) {
      try {
        return JSON.parse(localStorage.getItem('cambridge_review_answers_' + level) || '{}');
      } catch(e) { return {}; }
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

        // Separate units from review
        var unitItems = items.filter(function(i) { return i.type === 'grammar' || i.type === 'vocabulary'; });
        var reviewItem = items.find(function(i) { return i.type === 'review'; });

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
          '<span class="cu-block-num">Block ' + bk + '</span>' +
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
        var isOpen = hasActive || bk === blockOrder[0];
        var label = bk !== 'misc' ? 'Block ' + bk : 'Other';
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
                           item.type === 'review' ? 'quiz' : 'school';
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
                       item.type === 'review' ? 'quiz' : 'school';
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
      } else if (unitData.type === 'review') {
        (unitData.sections || []).forEach(function(sec, i) {
          html += '<button class="course-roadmap-item crm-exercise" id="crm-item-' + i + '" onclick="BentoGrid._scrollToCuSection(' + i + ')">' +
            '<span class="crm-icon">' + _mi('quiz') + '</span>' +
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
      for (var d = 0; d < total; d++) {
        var sec = sections[d];
        var isTheory = sec.classList.contains('cu-theory');
        var dotTypeClass = isTheory ? 'cu-dot-theory' : 'cu-dot-exercise';
        var activeClass = d === startIdx ? ' cu-dot-active' : '';
        var titleEl = sec.querySelector('.cu-section-title');
        var titleText = titleEl ? titleEl.textContent.trim().replace(/"/g, '&quot;') : String(d + 1);
        dotsHtml += '<button class="cu-dot-nav ' + dotTypeClass + activeClass + '" ' +
          'onclick="BentoGrid._showCuSection(' + d + ')" ' +
          'title="' + titleText + '">' + (d + 1) + '</button>';
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
      if (startSec && !startSec.classList.contains('cu-theory')) {
        BentoGrid._markCourseSectionVisited(BentoGrid._courseLevel || 'C1', BentoGrid._currentUnitId, startIdx);
        BentoGrid._checkCourseUnitAllDone(BentoGrid._courseLevel || 'C1', BentoGrid._currentUnitId);
      }
      BentoGrid._updateRoadmapActiveItem(startIdx);
    },

    _showCuSection: function(idx) {
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
      // Only auto-mark exercise sections; theory sections require explicit "Entendido"
      var targetSec = sections[idx];
      if (targetSec && !targetSec.classList.contains('cu-theory')) {
        BentoGrid._markCourseSectionVisited(BentoGrid._courseLevel || 'C1', BentoGrid._currentUnitId, idx);
        BentoGrid._checkCourseUnitAllDone(BentoGrid._courseLevel || 'C1', BentoGrid._currentUnitId);
      }
      BentoGrid._updateRoadmapActiveItem(idx);
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
      var totalItems = 0;
      var correctItems = 0;
      sec.querySelectorAll('.cu-ex-item').forEach(function(item) {
        totalItems++;
        var answer = (item.getAttribute('data-answer') || '').trim();
        var answerParts = answer.split(/,\s*/);
        var inputs = item.querySelectorAll('.cu-gap-input');
        var optGroups = {};
        item.querySelectorAll('.cu-option-btn').forEach(function(btn) {
          var g = btn.getAttribute('data-group');
          if (g) { if (!optGroups[g]) optGroups[g] = []; optGroups[g].push(btn); }
        });
        var allCorrect = true;
        var partIdx = 0;
        inputs.forEach(function(input) {
          var expected = (answerParts[partIdx] || '').trim().toLowerCase();
          var given = (input.value || '').trim().toLowerCase();
          var alts = expected.split(/\s*\/\s*/);
          var filled = given !== '';
          var ok = filled && alts.some(function(a) { return given === a.trim(); });
          input.classList.remove('cu-input-correct', 'cu-input-incorrect');
          if (filled) input.classList.add(ok ? 'cu-input-correct' : 'cu-input-incorrect');
          if (!ok) allCorrect = false;
          partIdx++;
        });
        Object.keys(optGroups).forEach(function(gId) {
          var btns = optGroups[gId];
          var selected = null;
          btns.forEach(function(b) { if (b.classList.contains('cu-option-selected')) selected = b; });
          if (selected) {
            var selectedText = selected.textContent.trim().toLowerCase();
            var matched = answerParts.some(function(ap) { return ap.trim().toLowerCase() === selectedText; });
            btns.forEach(function(b) { b.classList.remove('cu-option-correct', 'cu-option-incorrect'); });
            selected.classList.add(matched ? 'cu-option-correct' : 'cu-option-incorrect');
            if (!matched) allCorrect = false;
          }
        });
        if (allCorrect) correctItems++;
        // Show answer div for incorrect items
        var ansDiv = item.querySelector('.cu-answer');
        if (ansDiv && !allCorrect) ansDiv.style.display = 'block';
      });
      var checkBtn = sec.querySelector('.cu-check-btn');
      if (checkBtn) checkBtn.disabled = true;
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
      }
    },

    _showAllCuAnswers: function(sectionId) {
      var sec = document.getElementById(sectionId);
      if (!sec) return;
      sec.querySelectorAll('.cu-answer').forEach(function(div) { div.style.display = 'block'; });
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

    _buildStreakSidebarHtml: function() {
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      return '<div class="sidebar-widget-pastel sw-streak" onclick="BentoGrid.openStreakSection()" style="cursor:pointer">' +
        '<div class="sidebar-widget-pastel-title" style="text-align:center">' + 'Day Streak' + '</div>' +
        '<div class="sw-streak-count">' + streakCount + '</div>' +
      '</div>';
    },

    _buildCalendarSidebarHtml: function() {
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var locale = 'en';

      // Use activeDates array for accurate calendar display
      var trainedDates = {};
      if (streak && Array.isArray(streak.activeDates)) {
        streak.activeDates.forEach(function(d) { trainedDates[d] = true; });
      }

      // Current month info
      var now = new Date();
      var year = now.getFullYear();
      var month = now.getMonth();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var todayDay = now.getDate();

      // First weekday of month (Mon-first: 0=Mon, 6=Sun)
      var firstDow = new Date(year, month, 1).getDay();
      var firstDayMon = (firstDow === 0) ? 6 : firstDow - 1;

      // Locale-aware month label
      var monthLabel = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      monthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

      // Locale-aware narrow weekday initials (Mon-first)
      // 2024-01-01 was a Monday — use it as anchor for Mon…Sun
      var dayInitials = [];
      for (var di = 0; di < 7; di++) {
        var anchor = new Date(2024, 0, 1 + di);
        dayInitials.push(anchor.toLocaleDateString(locale, { weekday: 'narrow' }).toUpperCase());
      }

      // Day-of-week header row
      var headerHtml = '';
      dayInitials.forEach(function(initial) {
        headerHtml += '<div class="sw-cal-header">' + initial + '</div>';
      });

      // Pad single digit to two-character string
      function p2(n) { return n < 10 ? '0' + n : '' + n; }

      // Empty cells before first day
      var emptyCells = '';
      for (var e = 0; e < firstDayMon; e++) {
        emptyCells += '<div class="sw-cal-empty"></div>';
      }

      // Day cells
      var daysCells = '';
      for (var i = 1; i <= daysInMonth; i++) {
        var dateStr = year + '-' + p2(month + 1) + '-' + p2(i);
        var isTrained = !!trainedDates[dateStr];
        var isToday = (i === todayDay);
        var cls = 'sw-cal-day';
        if (isTrained) cls += ' sw-cal-done';
        if (isToday) cls += ' today';
        daysCells += '<div class="' + cls + '">' +
          '<span class="sw-cal-day-num">' + i + '</span>' +
        '</div>';
      }

      return '<div class="sidebar-widget-pastel sw-calendar" onclick="BentoGrid.openStreakSection()" style="cursor:pointer">' +
        '<div class="sidebar-widget-pastel-title">' + 'Calendar' + '</div>' +
        '<div class="sw-calendar-month-label">' + monthLabel + '</div>' +
        '<div class="sw-calendar-grid">' + headerHtml + emptyCells + daysCells + '</div>' +
      '</div>';
    },

    _buildLevelSelectorSidebarHtml: function() {
      var self = this;
      var currentLevel = AppState.currentLevel || 'C1';
      var levels = [
        { code: 'B1', icon: 'fas fa-book-reader', label: 'B1 Preliminary' },
        { code: 'B2', icon: 'fas fa-graduation-cap', label: 'B2 First' },
        { code: 'C1', icon: 'fas fa-award', label: 'C1 Advanced' }
      ];

      // Level-specific badge colors
      var lc = _levelColors[currentLevel] || _levelColors['C1'];

      var exams = window.EXAMS_DATA[currentLevel] || [];

      // "YOU ARE STUDYING" header + level badge
      var html = '<div class="sidebar-widget" style="background:transparent;box-shadow:none;border:none;padding:0;">' +
        '<div style="font-size:0.78rem;font-weight:700;color:#5a7a9a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;text-align:center;">' + 'You are studying' + '</div>' +
        '<div class="sidebar-level-badge" data-level="' + currentLevel + '" onclick="BentoGrid.toggleLevelDropdown()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();BentoGrid.toggleLevelDropdown()}" role="button" tabindex="0" aria-expanded="false" style="cursor:pointer;background:' + lc.bg + '">' +
          '<div class="sidebar-level-badge-label" style="color:' + lc.label + '">' + 'Level' + '</div>' +
          '<div class="sidebar-level-badge-code" style="color:' + lc.code + '">' + currentLevel + '</div>' +
        '</div>';

      // Level dropdown (hidden by default) — carousel style
      html += '<div class="level-selector-options level-selector-collapsed" id="level-selector-options-panel">' +
        '<div class="level-selector-changing-to">' + 'You are changing to:' + '</div>' +
        '<div class="level-selector-carousel">' +
          '<button class="level-selector-arrow" onclick="event.stopPropagation(); BentoGrid.navigateLevelSelector(-1)" aria-label="Previous level">' +
            '<span class="material-symbols-outlined">chevron_left</span>' +
          '</button>' +
          '<div id="level-selector-carousel-badge"></div>' +
          '<button class="level-selector-arrow" onclick="event.stopPropagation(); BentoGrid.navigateLevelSelector(1)" aria-label="Next level">' +
            '<span class="material-symbols-outlined">chevron_right</span>' +
          '</button>' +
        '</div>' +
      '</div>';

      // Widget: Next Exam in progress (moved from right sidebar)
      var nextLesson = BentoGrid._findNextLesson(exams);
      if (nextLesson) {
        html += BentoGrid._buildNextLessonLeftHtml(nextLesson);
      }

      html += '</div>';
      return html;
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
    },

    toggleLevelDropdown: function() {
      var options = document.getElementById('level-selector-options-panel') ||
                    document.querySelector('.level-selector-options');
      var badge = document.querySelector('.sidebar-level-badge');
      if (!options) return;
      var isCollapsed = options.classList.contains('level-selector-collapsed');
      if (isCollapsed) {
        options.classList.remove('level-selector-collapsed');
        options.classList.add('level-selector-expanded');
        if (badge) badge.setAttribute('aria-expanded', 'true');
        // Initialize carousel at index 0
        _levelSelectorPreviewIdx = 0;
        this._updateCarouselBadge();
      } else {
        options.classList.add('level-selector-collapsed');
        options.classList.remove('level-selector-expanded');
        if (badge) badge.setAttribute('aria-expanded', 'false');
      }
    },

    _getOtherLevels: function() {
      var currentLevel = AppState.currentLevel || 'C1';
      var levels = ['B1', 'B2', 'C1'];
      return levels.filter(function(l) { return l !== currentLevel; });
    },

    _updateCarouselBadge: function() {
      var badgeContainer = document.getElementById('level-selector-carousel-badge');
      if (!badgeContainer) return;
      var otherLevels = this._getOtherLevels();
      if (!otherLevels.length) return;
      if (_levelSelectorPreviewIdx < 0) _levelSelectorPreviewIdx = otherLevels.length - 1;
      if (_levelSelectorPreviewIdx >= otherLevels.length) _levelSelectorPreviewIdx = 0;
      var lvl = otherLevels[_levelSelectorPreviewIdx];
      var lc = _levelColors[lvl] || _levelColors['C1'];
      badgeContainer.innerHTML =
        '<div class="sidebar-level-badge level-selector-preview-badge" data-level="' + lvl + '" ' +
          'onclick="event.stopPropagation(); BentoGrid.changeLevel(\'' + lvl + '\')" ' +
          'role="button" tabindex="0" style="cursor:pointer;background:' + lc.bg + '">' +
          '<div class="sidebar-level-badge-label" style="color:' + lc.label + '">' + 'Level' + '</div>' +
          '<div class="sidebar-level-badge-code" style="color:' + lc.code + '">' + lvl + '</div>' +
        '</div>';
    },

    navigateLevelSelector: function(dir) {
      _levelSelectorPreviewIdx += dir;
      this._updateCarouselBadge();
    },

    _toggleUnit: function(el) {
      var lessons = el.querySelector('.sidebar-unit-lessons');
      if (!lessons || !el.parentNode) return;
      var isExpanding = lessons.style.display === 'none';

      // Collapse all other units first
      var allItems = el.parentNode.querySelectorAll('.sidebar-unit-item');
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i] === el) continue;
        var otherLessons = allItems[i].querySelector('.sidebar-unit-lessons');
        if (otherLessons) otherLessons.style.display = 'none';
        allItems[i].classList.remove('expanded');
      }

      // Toggle the clicked unit
      if (isExpanding) {
        lessons.style.display = 'flex';
        el.classList.add('expanded');
      } else {
        lessons.style.display = 'none';
        el.classList.remove('expanded');
      }
    },

    changeLevel: function(level) {
      // Collapse the dropdown before changing level
      var options = document.getElementById('level-selector-options-panel') ||
                    document.querySelector('.level-selector-options');
      if (options) {
        options.classList.add('level-selector-collapsed');
        options.classList.remove('level-selector-expanded');
      }
      if (typeof filterByLevel === 'function') {
        filterByLevel(level);
      } else if (typeof Dashboard !== 'undefined' && Dashboard.filterByLevel) {
        Dashboard.filterByLevel(level);
      }
      // Sync level with user profile
      if (typeof UserProfile !== 'undefined' && UserProfile.updateProfile) {
        UserProfile.updateProfile({ preferred_level: level });
      }
    },

    _buildNextLessonLeftHtml: function(lesson) {
      var sectionIcon = { reading: 'menu_book', listening: 'headphones', writing: 'edit_note', speaking: 'record_voice_over' };
      var icon = sectionIcon[lesson.section] || 'auto_stories';
      var completedParts = lesson.completedParts || 0;
      var totalParts = lesson.totalParts || 1;
      var pct = Math.round((completedParts / totalParts) * 100);
      var self = this;
      return '<div class="sw-left-widget sw-next-exam" onclick="Exercise.openPart(\'' + self._escapeHTML(lesson.examId) + '\', \'' + self._escapeHTML(lesson.section) + '\', ' + parseInt(lesson.part, 10) + ')" style="cursor:pointer">' +
        '<div class="sw-left-widget-label">' + 'Next Exam' + '</div>' +
        '<div class="sw-left-widget-row">' +
          '<span class="sw-left-widget-icon"><span class="material-symbols-outlined">' + icon + '</span></span>' +
          '<div class="sw-left-widget-info">' +
            '<div class="sw-left-widget-title">' + self._escapeHTML(lesson.examId) + '</div>' +
            '<div class="sw-left-widget-sub">' + self._capitalize(lesson.section) + ' · ' + 'Part' + ' ' + lesson.part + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sw-left-progress-track"><div class="sw-left-progress-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
    },

    _buildMicroLearningSidebarHtml: function() {
      return '<div class="sidebar-widget" onclick="BentoGrid.openMicroLearning()" style="cursor:pointer">' +
        '<div class="sidebar-widget-title"><span class="material-symbols-outlined">smartphone</span> ' + 'Micro-Learning' + '</div>' +
        '<div style="color:#64748b;font-size:0.85rem;margin-bottom:12px;">' + 'Vocab · Transformations · MC' + '</div>' +
        '<button class="bento-resume-btn" style="width:100%;justify-content:center;" onclick="event.stopPropagation();BentoGrid.openMicroLearning()">' + 'Start →' + '</button>' +
      '</div>';
    },

    _buildCalculatorSidebarHtml: function() {
      if (typeof ScoreCalculator === 'undefined') return '';
      return '<div class="sidebar-widget-pastel sw-calculator" onclick="openScoreCalculator()" aria-label="Open Score Calculator">' +
        '<span class="material-symbols-outlined sw-calculator-icon">calculate</span>' +
      '</div>';
    },

    _buildGradeTrackerSidebarHtml: function(exams) {
      var level = AppState.currentLevel || 'C1';

      // Collect skill scores via ScoreCalculator
      var skillTotals = {}; // { skill: { scale, count } }
      if (typeof ScoreCalculator !== 'undefined') {
        (exams || []).forEach(function(exam) {
          if (exam.status !== 'available') return;
          try {
            var scores = ScoreCalculator.getAllSkillScores(exam.id);
            scores.forEach(function(s) {
              if (s.raw <= 0) return;
              if (!skillTotals[s.skill]) skillTotals[s.skill] = { scale: 0, count: 0 };
              skillTotals[s.skill].scale += s.scale;
              skillTotals[s.skill].count++;
            });
          } catch(e) {}
        });
      }

      var allSkills = ['Reading', 'Use of English', 'Writing', 'Listening', 'Speaking'];
      var slides = [];

      allSkills.forEach(function(skill) {
        var d = skillTotals[skill];
        var hasData = d && d.count > 0;
        var avgScale = hasData ? Math.round(d.scale / d.count) : 0;
        var gradeInfo = (hasData && typeof ScoreCalculator !== 'undefined') ? ScoreCalculator.getGradeInfo(avgScale, level) : { cefr: '–' };
        var cefrText = gradeInfo.cefr || '–';
        slides.push(
          '<div class="grade-carousel-slide" style="display:flex">' +
            '<div class="grade-carousel-raw">' + (hasData ? avgScale : '–') + '</div>' +
            '<div class="grade-carousel-cefr' + (cefrText === '–' ? ' grade-carousel-cefr-dash' : '') + '">' + cefrText + '</div>' +
            '<div class="grade-carousel-skill-label"><span>' + skill + '</span></div>' +
          '</div>'
        );
      });

      var slidesHtml = '';
      if (slides.length === 0) {
        slidesHtml = '<div class="grade-carousel-slide" style="display:flex;opacity:0.6">' +
          '<div class="grade-carousel-raw" style="font-size:1.6rem;">–</div>' +
          '<div class="grade-carousel-skill-label"><span>' + 'Complete exercises to see results' + '</span></div>' +
        '</div>';
      } else {
        slides.forEach(function(s, idx) {
          slidesHtml += s.replace('display:flex', idx === 0 ? 'display:flex' : 'display:none');
        });
      }

      var totalSlides = slides.length || 1;

      return '<div class="sidebar-widget-pastel sw-grade grade-tracker-carousel-widget" data-total-slides="' + totalSlides + '" onclick="BentoGrid.openGradeEvolution()" style="cursor:pointer">' +
        '<div class="sidebar-widget-pastel-title">' + 'Grade Tracker' + '</div>' +
        '<div class="grade-carousel-viewport">' + slidesHtml + '</div>' +
        '<div class="grade-carousel-dots"></div>' +
      '</div>';
    },

    _startGradeCarousel: function() {
      var widget = document.querySelector('.grade-tracker-carousel-widget');
      if (!widget) return;
      var total = parseInt(widget.getAttribute('data-total-slides'), 10);
      if (!total || total <= 1) return;

      // Build dots
      var dotsContainer = widget.querySelector('.grade-carousel-dots');
      if (dotsContainer && dotsContainer.children.length === 0) {
        for (var i = 0; i < total; i++) {
          var dot = document.createElement('span');
          dot.className = 'grade-carousel-dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('data-idx', i);
          dotsContainer.appendChild(dot);
        }
      }

      var currentSlide = 0;
      if (BentoGrid._gradeCarouselTimer) clearInterval(BentoGrid._gradeCarouselTimer);

      BentoGrid._gradeCarouselTimer = setInterval(function() {
        var slides = widget.querySelectorAll('.grade-carousel-slide');
        var dots = widget.querySelectorAll('.grade-carousel-dot');
        if (!slides.length) return;

        slides[currentSlide].style.display = 'none';
        if (dots[currentSlide]) dots[currentSlide].classList.remove('active');

        currentSlide = (currentSlide + 1) % total;

        slides[currentSlide].style.display = 'flex';
        if (dots[currentSlide]) dots[currentSlide].classList.add('active');
      }, 3000);
    },

    _buildNextLessonSidebarHtml: function(lesson) {
      var completedParts = lesson.completedParts || 0;
      var totalParts = lesson.totalParts || 1;
      var sectionIcon = { reading: 'menu_book', listening: 'headphones', writing: 'edit_note', speaking: 'record_voice_over' };
      var icon = sectionIcon[lesson.section] || 'auto_stories';
      var self = this;
      return '<div class="sidebar-widget" onclick="Exercise.openPart(\'' + self._escapeHTML(lesson.examId) + '\', \'' + lesson.section + '\', ' + lesson.part + ')" style="cursor:pointer">' +
        '<div class="sidebar-widget-title"><span class="material-symbols-outlined">push_pin</span> ' + 'Next Up' + '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
          '<span style="font-size:1.5rem;"><span class="material-symbols-outlined">' + icon + '</span></span>' +
          '<div>' +
            '<div style="font-weight:700;font-size:0.9rem;color:#0f172a;">' + self._escapeHTML(lesson.examId) + ' — ' + self._capitalize(lesson.section) + '</div>' +
            '<div style="color:#64748b;font-size:0.8rem;">' + 'Part' + ' ' + lesson.part + ' (' + completedParts + '/' + totalParts + ')</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    openStreakSection: function() {
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var streakBest = streak ? (streak.longestStreak || 0) : 0;
      var totalDays = streak ? (streak.totalDaysActive || 0) : 0;
      var practicedToday = streak ? streak.practicedToday : false;

      // Build last 28-day calendar from activeDates
      var today = new Date();
      var calDays = [];
      var activeDatesSet = {};
      if (streak && Array.isArray(streak.activeDates)) {
        streak.activeDates.forEach(function(d) { activeDatesSet[d] = true; });
      }
      for (var i = 27; i >= 0; i--) {
        var d = new Date(today);
        d.setDate(today.getDate() - i);
        var dateStr = StreakManager._formatLocalDate(d);
        var isActive = !!activeDatesSet[dateStr];
        calDays.push({ date: dateStr, active: isActive });
      }

      var calHtml = '<div class="bento-cal-grid">';
      calDays.forEach(function(day) {
        calHtml += '<div class="bento-cal-day' + (day.active ? ' bento-cal-active' : '') + '" title="' + day.date + '"></div>';
      });
      calHtml += '</div>';

      var statusHtml = practicedToday
        ? '<div class="bento-streak-modal-status bento-streak-safe"><span class="material-symbols-outlined">check_circle</span> ' + 'Streak safe today!' + '</div>'
        : (StreakManager && StreakManager.isAtRisk()
          ? '<div class="bento-streak-modal-status bento-streak-risk"><span class="material-symbols-outlined">warning</span> ' + 'Practice now to keep your streak!' + '</div>'
          : '<div class="bento-streak-modal-status">' + t('startTodayStreak', 'Start today\'s practice to build your streak') + '</div>');

      var el = document.createElement('div');
      el.className = 'bento-streak-modal-overlay';
      el.innerHTML =
        '<div class="bento-streak-modal">' +
          '<button class="bento-streak-modal-close" onclick="this.closest(\'.bento-streak-modal-overlay\').remove()">✕</button>' +
          '<div class="bento-streak-modal-fire"><span class="material-symbols-outlined">local_fire_department</span></div>' +
          '<div class="bento-streak-modal-count">' + streakCount + '</div>' +
          '<div class="bento-streak-modal-label">' + 'day streak' + '</div>' +
          statusHtml +
          '<div class="bento-streak-modal-stats">' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + streakBest + '</div><div class="bento-streak-stat-lbl">' + 'Best' + '</div></div>' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + totalDays + '</div><div class="bento-streak-stat-lbl">' + 'Total Days' + '</div></div>' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + (practicedToday ? '<span class="material-symbols-outlined">check_circle</span>' : '<span class="material-symbols-outlined">cancel</span>') + '</div><div class="bento-streak-stat-lbl">' + 'Today' + '</div></div>' +
          '</div>' +
          '<div class="bento-streak-modal-section">' + 'Last 28 days' + '</div>' +
          calHtml +
        '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function(e) { if (e.target === el) el.remove(); });
    },

    // ── Grade Evolution Section ──────────────────────────────────────────
    openGradeEvolution: function() {
      var content = document.getElementById('main-content');
      if (!content) return;

      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];

      var allSkills = ['Reading', 'Use of English', 'Writing', 'Listening', 'Speaking'];
      var skillColors = {
        'Reading': '#3b82f6',
        'Use of English': '#8b5cf6',
        'Writing': '#10b981',
        'Listening': '#f59e0b',
        'Speaking': '#ef4444',
        'Total': '#6366f1'
      };

      var scaleBounds = { A2: [80, 140], B1: [80, 160], B2: [120, 190], C1: [140, 210], C2: [160, 230] };
      var bounds = scaleBounds[level] || [140, 210];
      var scaleMin = bounds[0];
      var scaleMax = bounds[1];

      var gradeBandsByLevel = {
        'A2': [{ min: 120, label: 'Grade A' }, { min: 110, label: 'Grade B' }, { min: 100, label: 'Grade C' }, { min: 82, label: 'Level A1' }],
        'B1': [{ min: 140, label: 'Grade A' }, { min: 133, label: 'Grade B' }, { min: 120, label: 'Grade C' }, { min: 102, label: 'Level A2' }, { min: 82, label: 'Level A1' }],
        'B2': [{ min: 180, label: 'Grade A' }, { min: 173, label: 'Grade B' }, { min: 160, label: 'Grade C' }, { min: 140, label: 'Level B1' }, { min: 120, label: 'Level A2' }],
        'C1': [{ min: 200, label: 'Grade A' }, { min: 193, label: 'Grade B' }, { min: 180, label: 'Grade C' }, { min: 160, label: 'Level B2' }, { min: 142, label: 'Level B1' }],
        'C2': [{ min: 220, label: 'Grade A' }, { min: 213, label: 'Grade B' }, { min: 200, label: 'Grade C' }, { min: 180, label: 'Level C1' }]
      };

      // Gather per-exam skill scores
      var examScores = []; // [{ examId, skills: { skill: scaleScore } }]
      exams.forEach(function(exam) {
        if (exam.status !== 'available' || typeof ScoreCalculator === 'undefined') return;
        try {
          var scores = ScoreCalculator.getAllSkillScores(exam.id);
          var hasData = scores.some(function(s) { return s.raw > 0; });
          if (!hasData) return;
          var entry = { examId: exam.id, skills: {} };
          scores.forEach(function(s) {
            entry.skills[s.skill] = s.scale;
          });
          examScores.push(entry);
        } catch (e) { /* skip */ }
      });

      var bodyHtml = BentoGrid._buildGradeEvoChart(examScores, allSkills, skillColors, gradeBandsByLevel[level] || [], scaleMin, scaleMax);

      // Build sidebars like main dashboard
      var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(exams);
      }
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        rightSidebarContent = BentoGrid._buildContinueBasecampHtml(exams);
        rightSidebarContent += BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
      }

      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="grade-evolution-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="loadDashboard()">' + 'Back' + '</button>' +
                '<div>' +
                  '<div class="subpage-title">' + 'Grade Evolution' + '</div>' +
                  '<div class="subpage-subtitle">' + level + ' · ' + 'Track your progress across exams' + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="grade-evolution-body">' + bodyHtml + '</div>' +
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
      var geState = { view: 'gradeEvolution' };
      history.pushState(geState, '', Router.stateToPath(geState));
    },

    _buildGradeEvoChart: function(examScores, allSkills, skillColors, gradeBands, scaleMin, scaleMax) {
      if (examScores.length === 0) {
        return '<div class="ge-chart-card">' +
          '<div class="grade-evo-no-data"><i class="fas fa-chart-line"></i> ' + 'No data yet — complete exams to see your progress' + '</div>' +
        '</div>';
      }

      var self = this;

      // SVG dimensions – include a grades-column on the right
      var svgW = 700, svgH = 320;
      var gradeColW = 62;  // width of the grade-labels column
      var gradeColGap = 8; // gap between chart area and grade column
      var marginL = 48, marginR = 8, marginT = 20, marginB = 32;
      var chartW = svgW - marginL - marginR - gradeColW - gradeColGap;
      var chartH = svgH - marginT - marginB;
      var scoreRange = scaleMax - scaleMin;
      var axisBottom = marginT + chartH;
      var gradeColX = marginL + chartW + gradeColGap; // X start of grade column

      function scoreToY(score) {
        return marginT + chartH - ((score - scaleMin) / scoreRange) * chartH;
      }

      var n = examScores.length;
      // Add horizontal inner padding so dots never sit on the chart edge (accounts for dot radius + visual breathing room)
      var pointPadX = n > 1 ? Math.min(28, chartW * 0.07) : 0;
      function indexToX(i) {
        if (n <= 1) return marginL + chartW / 2;
        return marginL + pointPadX + (i / (n - 1)) * (chartW - 2 * pointPadX);
      }

      // Catmull-Rom spline → cubic bezier path (smooth curves through all points)
      function smoothLinePath(pts) {
        if (pts.length === 1) return 'M' + pts[0].x + ',' + pts[0].y;
        var d = 'M' + pts[0].x + ',' + pts[0].y;
        for (var i = 0; i < pts.length - 1; i++) {
          var p0 = pts[Math.max(i - 1, 0)];
          var p1 = pts[i];
          var p2 = pts[i + 1];
          var p3 = pts[Math.min(i + 2, pts.length - 1)];
          var cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(2);
          var cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(2);
          var cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(2);
          var cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(2);
          d += ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + p2.x + ',' + p2.y;
        }
        return d;
      }

      var svg = '<svg class="ge-chart-svg" viewBox="0 0 ' + svgW + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg">';

      // Defs: clip path + per-series gradient fills
      svg += '<defs>';
      svg += '<clipPath id="ge-clip"><rect x="' + marginL + '" y="' + marginT + '" width="' + chartW + '" height="' + chartH + '"/></clipPath>';
      var seriesList = allSkills.concat(['Total']);
      seriesList.forEach(function(skill) {
        var color = skillColors[skill] || '#6366f1';
        var isTotal = skill === 'Total';
        var gid = 'ge-grad-' + skill.replace(/[\s/]+/g, '-');
        svg += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">';
        svg += '<stop offset="0%" stop-color="' + color + '" stop-opacity="' + (isTotal ? '0.22' : '0.10') + '"/>';
        svg += '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>';
        svg += '</linearGradient>';
      });
      svg += '</defs>';

      // Grade band backgrounds (chart area) + grade labels column (outside chart)
      var bandPalette = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
      // Grade column header
      svg += '<text x="' + (gradeColX + gradeColW / 2) + '" y="' + (marginT - 5) + '" text-anchor="middle" font-size="8" fill="#94a3b8" font-weight="600" font-family="inherit">Grade</text>';
      gradeBands.forEach(function(band, i) {
        var topScore = i === 0 ? scaleMax : gradeBands[i - 1].min;
        var y1 = scoreToY(topScore);
        var y2 = scoreToY(band.min);
        var bandH = y2 - y1;
        var color = bandPalette[i % bandPalette.length];
        // Subtle background stripe in chart area
        svg += '<rect x="' + marginL + '" y="' + y1 + '" width="' + chartW + '" height="' + bandH + '" fill="' + color + '" opacity="0.07"/>';
        // Dashed boundary line spanning chart + gap + grade column
        svg += '<line x1="' + marginL + '" y1="' + y2 + '" x2="' + (gradeColX + gradeColW) + '" y2="' + y2 + '" stroke="#94a3b8" stroke-dasharray="4,3" stroke-width="0.75" opacity="0.4"/>';
        // Grade column: colored band rect
        svg += '<rect x="' + gradeColX + '" y="' + y1 + '" width="' + gradeColW + '" height="' + bandH + '" fill="' + color + '" opacity="0.14" rx="3"/>';
        // Label centered in grade band (skip if too short)
        if (bandH >= 12) {
          svg += '<text x="' + (gradeColX + gradeColW / 2) + '" y="' + ((y1 + y2) / 2 + 3.5) + '" text-anchor="middle" font-size="9" fill="' + color + '" opacity="0.9" font-weight="700" font-family="inherit">' + self._escapeHTML(band.label) + '</text>';
        }
      });
      // Top dashed line at scaleMax spanning chart + grade column
      svg += '<line x1="' + marginL + '" y1="' + marginT + '" x2="' + (gradeColX + gradeColW) + '" y2="' + marginT + '" stroke="#94a3b8" stroke-dasharray="4,3" stroke-width="0.75" opacity="0.4"/>';

      // Light horizontal grid lines and Y-axis labels (every 10 score points)
      for (var score = scaleMin; score <= scaleMax; score += 10) {
        var gy = scoreToY(score);
        svg += '<line x1="' + marginL + '" y1="' + gy + '" x2="' + (marginL + chartW) + '" y2="' + gy + '" stroke="#e2e8f0" stroke-width="0.6"/>';
        svg += '<text x="' + (marginL - 5) + '" y="' + (gy + 3.5) + '" text-anchor="end" font-size="9" fill="#94a3b8" font-family="inherit">' + score + '</text>';
      }

      // Vertical grid lines at each exam X position
      examScores.forEach(function(entry, i) {
        var x = indexToX(i);
        svg += '<line x1="' + x + '" y1="' + marginT + '" x2="' + x + '" y2="' + axisBottom + '" stroke="#e2e8f0" stroke-width="0.5" opacity="0.8"/>';
      });

      // X-axis tick marks and labels (exam ids)
      examScores.forEach(function(entry, i) {
        var x = indexToX(i);
        svg += '<line x1="' + x + '" y1="' + axisBottom + '" x2="' + x + '" y2="' + (axisBottom + 4) + '" stroke="#cbd5e1" stroke-width="1"/>';
        svg += '<text x="' + x + '" y="' + (svgH - 6) + '" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="inherit">' + self._escapeHTML(entry.examId.replace('Test', 'T')) + '</text>';
      });

      // Axis borders
      svg += '<line x1="' + marginL + '" y1="' + marginT + '" x2="' + marginL + '" y2="' + axisBottom + '" stroke="#cbd5e1" stroke-width="1.5"/>';
      svg += '<line x1="' + marginL + '" y1="' + axisBottom + '" x2="' + (marginL + chartW) + '" y2="' + axisBottom + '" stroke="#cbd5e1" stroke-width="1.5"/>';
      svg += '<line x1="' + (marginL + chartW) + '" y1="' + marginT + '" x2="' + (marginL + chartW) + '" y2="' + axisBottom + '" stroke="#cbd5e1" stroke-width="1"/>';

      // Data series inside clip region
      svg += '<g clip-path="url(#ge-clip)">';
      seriesList.forEach(function(skill) {
        var color = skillColors[skill] || '#6366f1';
        var isTotal = skill === 'Total';
        var gid = 'ge-grad-' + skill.replace(/[\s/]+/g, '-');

        var points = [];
        examScores.forEach(function(entry, i) {
          var sc;
          if (isTotal) {
            var sks = Object.keys(entry.skills);
            var tot = 0; var cnt = 0;
            sks.forEach(function(sk) { if (entry.skills[sk] > 0) { tot += entry.skills[sk]; cnt++; } });
            sc = cnt > 0 ? Math.round(tot / cnt) : 0;
          } else {
            sc = entry.skills[skill] || 0;
          }
          if (sc > 0) {
            points.push({ x: indexToX(i), y: scoreToY(sc), score: sc, label: entry.examId.replace('Test', 'T') });
          }
        });

        if (points.length === 0) return;

        var sid = 'ge-series-' + skill.replace(/[\s/]+/g, '-');
        var safeSkill = self._escapeHTML(skill);
        svg += '<g id="' + sid + '">';

        if (points.length > 1) {
          var linePath = smoothLinePath(points);
          // Gradient area fill under the curve
          var areaPath = linePath + ' L' + points[points.length - 1].x + ',' + axisBottom + ' L' + points[0].x + ',' + axisBottom + ' Z';
          svg += '<path d="' + areaPath + '" fill="url(#' + gid + ')" stroke="none"/>';
          // Smooth bezier line
          svg += '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="' + (isTotal ? 2.5 : 1.75) + '"' + (isTotal ? ' stroke-dasharray="7,4"' : '') + ' opacity="0.85" stroke-linejoin="round" stroke-linecap="round"/>';
        }

        // Dots with interactive tooltip via data attributes
        points.forEach(function(p) {
          var tipText = safeSkill + ': ' + p.score + ' (' + self._escapeHTML(p.label) + ')';
          svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (isTotal ? 5.5 : 4.5) + '" fill="' + color + '" stroke="white" stroke-width="2"' +
            ' data-ge-tip="' + tipText + '" data-ge-color="' + color + '"' +
            ' onmouseenter="BentoGrid._showGeTip(event,this)" onmouseleave="BentoGrid._hideGeTip()"' +
            ' style="cursor:pointer"/>';
        });
        svg += '</g>';
      });
      svg += '</g>';
      svg += '</svg>';

      // Horizontal legend
      var legendHtml = '<div class="ge-legend">';
      seriesList.forEach(function(skill) {
        var color = skillColors[skill] || '#6366f1';
        var sid = 'ge-series-' + skill.replace(/[\s/]+/g, '-');
        var isTotal = skill === 'Total';
        legendHtml += '<button class="ge-legend-btn active" data-series="' + sid + '" onclick="BentoGrid.toggleGradeEvoSeries(\'' + sid + '\', this)" style="--ge-color:' + color + '">' +
          '<span class="ge-legend-dot' + (isTotal ? ' ge-legend-dash' : '') + '" style="background:' + color + '"></span>' +
          '<span>' + self._escapeHTML(skill) + '</span>' +
        '</button>';
      });
      legendHtml += '</div>';

      return '<div class="ge-chart-card">' + svg + legendHtml + '</div>';
    },

    toggleGradeEvoSeries: function(seriesId, btn) {
      var el = document.getElementById(seriesId);
      if (!el) return;
      if (btn.classList.contains('active')) {
        el.style.display = 'none';
        btn.classList.remove('active');
      } else {
        el.style.display = '';
        btn.classList.add('active');
      }
    },

    _showGeTip: function(evt, el) {
      var tip = document.getElementById('ge-tip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'ge-tip';
        tip.className = 'ge-tip';
        document.body.appendChild(tip);
      }
      var text = el.getAttribute('data-ge-tip') || '';
      var color = el.getAttribute('data-ge-color') || '#6366f1';
      tip.style.setProperty('--ge-tip-color', color);
      tip.textContent = text;
      tip.style.display = 'block';
      var tipW = tip.offsetWidth;
      var tipH = tip.offsetHeight;
      var x = evt.clientX + 14;
      var y = evt.clientY - 36;
      if (x + tipW > window.innerWidth - 8) { x = evt.clientX - tipW - 14; }
      if (y < 8) { y = evt.clientY + 10; }
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    },

    _hideGeTip: function() {
      var tip = document.getElementById('ge-tip');
      if (tip) tip.style.display = 'none';
    }
  };
})();
