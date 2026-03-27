// js/bento-grid.js
// Premium Bento Grid dashboard sections rendered above the exam list

(function() {
  var _levelSelectorPreviewIdx = 0;
  var CU_PAGE_SIZE = 4; // max items per page in paginated course exercises (balanced 4+4 for 8-item sections)
  var CU_MC_BLANK = '<span class="cu-mc-blank">&#9135;&#9135;&#9135;&#9135;&#9135;</span>';
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
      var courseState = { view: 'course', level: level };
      history.pushState(courseState, '', Router.stateToPath(courseState));
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
      var courseState = { view: 'course', level: level };
      history.pushState(courseState, '', Router.stateToPath(courseState));
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
              BentoGrid._buildCourseBlockDotsHtml(theoryPoints, unitSectionProgress, 'fe-dot-explanation', item.id, unitPath) +
            '</div>' +
            '<div class="fe-map-lesson ' + (isDone ? 'fe-lesson-complete' : 'fe-lesson-pending') + '" style="cursor:pointer;margin-top:10px" ' +
              'onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'' + unitPath + '\', \'exercises\')">' +
              '<div class="fe-map-lesson-title">' +
                '<span class="fe-map-lesson-num">Exercises</span>' +
              '</div>' +
              BentoGrid._buildCourseBlockDotsHtml(exercisePoints, unitSectionProgress, 'fe-dot-exercise', item.id, unitPath) +
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

    _buildCourseBlockDotsHtml: function(points, visitedPoints, pendingClass, unitId, unitPath) {
      var dotsHtml = '<div class="fe-map-points-row">';
      (points || []).forEach(function(point) {
        var isVisited = !!(visitedPoints && visitedPoints[point.sectionIdx]);
        var clickAttr = (unitId && unitPath)
          ? ' onclick="event.stopPropagation();BentoGrid.openCourseUnit(\'' + unitId + '\',\'' + unitPath + '\',' + point.sectionIdx + ')" style="cursor:pointer"'
          : '';
        dotsHtml += '<span class="fe-dot fe-dot-section-marker ' + (isVisited ? 'fe-dot-done' : 'fe-dot-outline ' + pendingClass) + '" title="' + point.label + '"' + clickAttr + '>' +
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

          if (ex.type === 'yn') {
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
        input.classList.remove('cu-input-correct', 'cu-input-incorrect', 'cu-input-show-correct');
        input.removeAttribute('data-student-value');
        input.removeAttribute('data-correct-value');
        input.removeAttribute('data-saved-value');
        BentoGrid._resizeCuInput(input);
      });
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
      // Reset MC gap pills
      sec.querySelectorAll('.cu-mc-gap-pill').forEach(function(pill) {
        pill.classList.remove('cu-mc-gap-pill-filled');
        pill.innerHTML = CU_MC_BLANK;
      });
      // Reset MC passage gaps
      sec.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
        gap.classList.remove('cu-mc-passage-gap-answered', 'cu-mc-passage-gap-correct', 'cu-mc-passage-gap-incorrect');
        gap.style.pointerEvents = '';
        var slot = gap.querySelector('.cu-mc-passage-gap-slot');
        if (slot) { slot.textContent = ''; slot.className = 'cu-mc-passage-gap-slot'; }
        var secId = gap.getAttribute('data-sec-id');
        var gapNum = parseInt(gap.getAttribute('data-gap-num') || '0');
        if (secId && BentoGrid._cuMcPassageAnswers[secId]) delete BentoGrid._cuMcPassageAnswers[secId][gapNum];
      });
      // Reset matching exercise: re-sort right column to A–G order and re-enable drag
      var matchExercise = sec.querySelector('.cu-match-exercise');
      if (matchExercise) {
        matchExercise.querySelectorAll('.cu-match-item').forEach(function(item) {
          item.classList.remove('cu-match-correct', 'cu-match-incorrect');
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
        var sentences = (item.sentence || '').split('\n');
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
            '<span class="cu-mc-passage-gap-num">(' + num + ')</span>' +
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
        var text = BentoGrid._escapeHTML(opt.slice(1).replace(/^[.)\s]+/, '').trim());
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

      var sentenceHtml;
      if (isMC) {
        sentenceHtml = self._renderCourseExMCItem(sentence, item.options, inputId);
      } else {
        sentenceHtml = self._renderCourseExSentence(sentence, inputId);
      }

      return '<div class="cu-ex-item" data-answer="' + self._escapeHTML(answer) + '">' +
        '<div class="cu-ex-num-badge">' + (idx + 1) + '</div>' +
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
        var keyword = '';
        var kwMatch = sentA.match(/\s*\*\*([^*]+)\*\*\s*$/);
        if (kwMatch) {
          keyword = kwMatch[1];
          sentA = sentA.slice(0, kwMatch.index).trim();
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
      var numParen   = '(\\(\\d+\\)\\s+)?';
      var hintParen  = '\\(([^)]+)\\)';
      var gapMarker  = '[.\\u2026]{5,}';
      var boldMarker = '\\*\\*[^*]+\\*\\*';
      var tokenRegex = new RegExp(
        numParen + hintParen + '\\s*' + gapMarker +    // Pattern A: (num?) (hint) gap
        '|' + gapMarker + '\\s*' + hintParen +         // Pattern B: gap (hint)
        '|' + gapMarker +                              // Simple gap
        '|' + boldMarker,                              // Bold text
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
        } else if (m.charAt(0) === '*') {
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

      // Post-process: when no interactive elements and there is a bold word, convert it
      // to an inline hint-gap pill (hint = bold word + input together), as in Exercise F
      // style error-correction where the incorrect bold word acts as the hint.
      var hasInteractive = parts.some(function(p) {
        return p.type === 'gap' || p.type === 'hint-gap' || p.type === 'gap-hint' || p.type === 'gap-wf' || p.type === 'options';
      });
      if (!hasInteractive) {
        for (var bpi = 0; bpi < parts.length; bpi++) {
          if (parts[bpi].type === 'bold') {
            parts[bpi] = { type: 'hint-gap', num: null, hint: parts[bpi].val };
            hasInteractive = true;
            break;
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

      var gapCount = 0;
      var optCount = 0;
      return parts.map(function(p) {
        if (p.type === 'text') {
          return self._formatTextWithHints(p.val);
        } else if (p.type === 'bold') {
          return '<strong>' + self._escapeHTML(p.val) + '</strong>';
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
      var siblings = document.querySelectorAll('.cu-option-btn[data-group="' + group + '"]');
      siblings.forEach(function(s) { s.classList.remove('cu-option-selected'); });
      btn.classList.add('cu-option-selected');
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
        await BentoGrid.openLessons();
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
        // Cannot navigate without a file path — fall back to course overview
        await BentoGrid.openLessons();
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
      BentoGrid._cuConfirm('Restart this unit? Your progress will be cleared.', function() {
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
      });
    },

    _resetCourseBlock: function(blockKey) {
      var level = BentoGrid._courseLevel || 'C1';
      BentoGrid._cuConfirm('Restart Block ' + blockKey + '? Progress for all units in this block will be cleared.', function() {
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
      if (startSec && !startSec.classList.contains('cu-theory')) {
        BentoGrid._markCourseSectionVisited(BentoGrid._courseLevel || 'C1', BentoGrid._currentUnitId, startIdx);
        BentoGrid._checkCourseUnitAllDone(BentoGrid._courseLevel || 'C1', BentoGrid._currentUnitId);
      }
      BentoGrid._updateRoadmapActiveItem(startIdx);
      // Resize inputs in the initial section
      if (startSec) BentoGrid._resizeAllCuInputs(startSec);
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
      // Resize inputs in the newly visible section
      if (targetSec) BentoGrid._resizeAllCuInputs(targetSec);
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

    // Splits an answer part by '/' and returns trimmed lowercase alternatives
    _answerAlts: function(answerPart) {
      return (answerPart || '').trim().split(/\s*\/\s*/).map(function(a) { return a.trim().toLowerCase(); }).filter(Boolean);
    },

    _doCheckCuExSection: function(sec) {
      var totalItems = 0;
      var correctItems = 0;
      // Handle MC passage exercises (multiple-choice cloze, e.g. Exercise D)
      sec.querySelectorAll('.cu-mc-passage-exercise').forEach(function(mcPassage) {
        mcPassage.querySelectorAll('.cu-mc-passage-gap').forEach(function(gap) {
          totalItems++;
          var gapNum = parseInt(gap.getAttribute('data-gap-num') || '0');
          var secId = gap.getAttribute('data-sec-id') || '';
          var expected = (gap.getAttribute('data-answer') || '').trim().toUpperCase();
          var given = ((BentoGrid._cuMcPassageAnswers[secId] || {})[gapNum] || '').trim().toUpperCase();
          var ok = given !== '' && given === expected;
          gap.classList.remove('cu-mc-passage-gap-correct', 'cu-mc-passage-gap-incorrect');
          if (given !== '') gap.classList.add(ok ? 'cu-mc-passage-gap-correct' : 'cu-mc-passage-gap-incorrect');
          gap.style.pointerEvents = 'none';
          if (ok) correctItems++;
        });
      });
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
        totalItems++;
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
        var allCorrect = true;
        var partIdx = 0;
        inputs.forEach(function(input) {
          var expected = (answerParts[partIdx] || '').trim().toLowerCase();
          var given = (input.value || '').trim().toLowerCase();
          var alts = expected.split(/\s*\/\s*/);
          var filled = given !== '';
          var ok = filled && alts.some(function(a) { return given === a.trim(); });
          // For sync items, apply visual feedback to all inputs in the group
          if (isSyncItem) {
            var group = input.getAttribute('data-sync-group');
            var allInGroup = group
              ? item.querySelectorAll('.cu-sync-input[data-sync-group="' + group + '"]')
              : [input];
            allInGroup.forEach(function(inp) {
              inp.classList.remove('cu-input-correct', 'cu-input-incorrect');
              if (filled) inp.classList.add(ok ? 'cu-input-correct' : 'cu-input-incorrect');
            });
          } else {
            input.classList.remove('cu-input-correct', 'cu-input-incorrect');
            if (filled) input.classList.add(ok ? 'cu-input-correct' : 'cu-input-incorrect');
          }
          if (!ok) allCorrect = false;
          partIdx++;
        });
        // Inline word-choice buttons (e.g. **word/word/word**)
        // Sort groups in DOM order by their _oN suffix so answer parts map correctly
        BentoGrid._sortedOptGroupKeys(optGroups).forEach(function(gId, gIdx) {
          var btns = optGroups[gId];
          // Each option group maps to the next answer part after all text inputs
          var gAlts = BentoGrid._answerAlts(answerParts[partIdx + gIdx]);
          var selected = null;
          btns.forEach(function(b) { if (b.classList.contains('cu-option-selected')) selected = b; });
          btns.forEach(function(b) { b.classList.remove('cu-option-correct', 'cu-option-incorrect', 'cu-option-correct-reveal'); });
          if (selected) {
            var selectedText = selected.textContent.trim().toLowerCase();
            var matched = gAlts.some(function(a) { return a === selectedText; });
            selected.classList.add(matched ? 'cu-option-correct' : 'cu-option-incorrect');
            // Mark the correct button(s) if student chose wrong
            if (!matched) {
              btns.forEach(function(b) {
                var bText = b.textContent.trim().toLowerCase();
                if (b !== selected && gAlts.some(function(a) { return a === bText; })) {
                  b.classList.add('cu-option-correct-reveal');
                }
              });
              allCorrect = false;
            }
          } else {
            // Nothing selected — mark correct option(s) and count as incorrect
            btns.forEach(function(b) {
              var bText = b.textContent.trim().toLowerCase();
              if (gAlts.some(function(a) { return a === bText; })) {
                b.classList.add('cu-option-correct-reveal');
              }
            });
            allCorrect = false;
          }
        });
        // Multiple-choice option buttons (Exercise E style)
        Object.keys(mcGroups).forEach(function(gId) {
          var btns = mcGroups[gId];
          var selected = null;
          btns.forEach(function(b) { if (b.classList.contains('cu-option-selected')) selected = b; });
          btns.forEach(function(b) { b.classList.remove('cu-option-correct', 'cu-option-incorrect', 'cu-option-correct-reveal'); });
          if (selected) {
            var letter = (selected.getAttribute('data-mc-letter') || '').trim().toUpperCase();
            var matched = answerParts.some(function(ap) { return ap.trim().toUpperCase() === letter; });
            selected.classList.add(matched ? 'cu-option-correct' : 'cu-option-incorrect');
            // Mark the correct button if student chose wrong
            if (!matched) {
              btns.forEach(function(b) {
                var bLetter = (b.getAttribute('data-mc-letter') || '').trim().toUpperCase();
                if (b !== selected && answerParts.some(function(ap) { return ap.trim().toUpperCase() === bLetter; })) {
                  b.classList.add('cu-option-correct-reveal');
                }
              });
              allCorrect = false;
            }
          } else {
            // Nothing selected — mark correct option and count as incorrect
            btns.forEach(function(b) {
              var bLetter = (b.getAttribute('data-mc-letter') || '').trim().toUpperCase();
              if (answerParts.some(function(ap) { return ap.trim().toUpperCase() === bLetter; })) {
                b.classList.add('cu-option-correct-reveal');
              }
            });
            allCorrect = false;
          }
        });
        if (allCorrect) correctItems++;
        // For incorrect items with text inputs (not MC/choice which show correct via button reveal), add a per-item toggle button
        var hasNoOptionGroups = Object.keys(optGroups).length === 0 && Object.keys(mcGroups).length === 0;
        var hasWrongInput = inputs.length > 0 && !allCorrect && hasNoOptionGroups;
        if (hasWrongInput) {
          // Store student answers and correct answers on inputs
          inputs.forEach(function(inp, i) {
            inp.setAttribute('data-student-value', inp.value || '');
            var correctRaw = (answerParts[i] || '').trim();
            // Pick first alternative for display
            inp.setAttribute('data-correct-value', correctRaw.split(/\s*\/\s*/)[0].trim());
            // For sync items, propagate to all siblings in the group
            if (isSyncItem) {
              var syncGroup = inp.getAttribute('data-sync-group');
              if (syncGroup) {
                item.querySelectorAll('.cu-sync-input[data-sync-group="' + syncGroup + '"]').forEach(function(syncInp) {
                  syncInp.setAttribute('data-student-value', syncInp.value || '');
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
            var correctDisplay = correctRaw.split(/\s*\/\s*/)[0].trim();
            inp.value = correctDisplay;
            inp.classList.add('cu-input-show-correct');
            BentoGrid._resizeCuInput(inp);
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
              var bText = b.textContent.trim().toLowerCase();
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
          var correct = (inp.getAttribute('data-answer') || '').split(/\s*\/\s*/)[0].trim();
          inp.setAttribute('data-saved-value', inp.value);
          inp.value = correct;
          inp.classList.add('cu-input-show-correct');
          BentoGrid._resizeCuInput(inp);
        });

        // Matching exercise: show correct order
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
        }

      } else {
        // Hide answers: restore original values
        sec.setAttribute('data-answers-showing', 'false');
        if (icon) icon.textContent = 'visibility';
        if (btn) {
          var textNode = btn.lastChild;
          if (textNode && textNode.nodeType === 3) textNode.textContent = ' Show answers';
        }

        sec.querySelectorAll('.cu-gap-input').forEach(function(inp) {
          var saved = inp.getAttribute('data-saved-value');
          if (saved !== null) {
            inp.value = saved;
            inp.removeAttribute('data-saved-value');
          }
          inp.classList.remove('cu-input-show-correct');
          BentoGrid._resizeCuInput(inp);
        });
        sec.querySelectorAll('.cu-option-btn').forEach(function(b) {
          b.classList.remove('cu-option-correct-reveal');
        });
        sec.querySelectorAll('.cu-yn-btn').forEach(function(b) {
          b.classList.remove('cu-yn-correct-reveal');
        });

        // Restore matching exercise to saved order
        var matchExercise = sec.querySelector('.cu-match-exercise');
        if (matchExercise) {
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
      }
    },

    _showAllCuAnswers: function(sectionId) {
      var sec = document.getElementById(sectionId);
      if (!sec) return;
      sec.querySelectorAll('.cu-answer').forEach(function(div) { div.style.display = 'block'; });
    },


    _toggleCuItemAnswer: function(btn, item) {
      var mode = btn.getAttribute('data-mode');
      var newMode = mode === 'student' ? 'correct' : 'student';
      btn.setAttribute('data-mode', newMode);
      // Update all gap inputs in this item
      item.querySelectorAll('.cu-gap-input').forEach(function(inp) {
        if (newMode === 'correct') {
          inp.value = inp.getAttribute('data-correct-value') || '';
          inp.classList.remove('cu-input-incorrect');
          inp.classList.add('cu-input-show-correct');
        } else {
          inp.value = inp.getAttribute('data-student-value') || '';
          inp.classList.remove('cu-input-show-correct');
          inp.classList.add('cu-input-incorrect');
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
        // Remove feedback colours in correct view
        matchExercise.querySelectorAll('.cu-match-item').forEach(function(item) {
          item.classList.remove('cu-match-correct', 'cu-match-incorrect');
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
          if (leftItem) { leftItem.classList.toggle('cu-match-correct', ok); leftItem.classList.toggle('cu-match-incorrect', !ok); }
          if (rightItem) { rightItem.classList.toggle('cu-match-correct', ok); rightItem.classList.toggle('cu-match-incorrect', !ok); }
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
