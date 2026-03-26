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
          '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
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
          '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
        '</div>';

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

      // Build sidebars
      var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        rightSidebarContent = BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
      }

      var headerHtml =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="loadDashboard()">' + 'Back' + '</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' Course</div>' +
            '<div class="subpage-subtitle">' + 'Structured lessons for' + ' ' + level + '</div>' +
          '</div>' +
        '</div>';

      // Render initial layout with loading spinner
      content.innerHTML =
        '<div class="dashboard-layout">' +
          '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
          '<div class="dashboard-center">' +
            '<div class="fe-section" id="courseCenterSection">' +
              headerHtml +
              '<div class="fe-loading"><div class="fe-spinner"></div></div>' +
            '</div>' +
          '</div>' +
          '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
        '</div>';

      // Try to fetch index.json for this level
      var indexData = null;
      try {
        var r = await fetch('data/Course/' + level + '/index.json');
        if (r.ok) indexData = await r.json();
      } catch(e) { /* no index available */ }

      var centerSection = document.getElementById('courseCenterSection');
      if (!centerSection) return;

      var mapHtml = '<div class="fe-map-container">';

      if (indexData && indexData.items && indexData.items.length > 0) {
        // Group items by block
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

        blockOrder.forEach(function(blockKey, bi) {
          var items = blocks[blockKey];
          var hasAvailable = items.some(function(i) { return i.status === 'available'; });
          var lessonClass = hasAvailable ? 'fe-map-lesson fe-lesson-active' : 'fe-map-lesson fe-lesson-locked';
          var blockLabel = blockKey !== 'misc' ? 'Block ' + blockKey : '';

          mapHtml += '<div class="' + lessonClass + '">';
          if (blockLabel) {
            mapHtml += '<div class="fe-map-lesson-title">' +
              '<span class="fe-map-lesson-num">' + blockLabel + '</span>' +
            '</div>';
          }
          mapHtml += '<div class="fe-map-points-row">';

          items.forEach(function(item) {
            var isAvailable = item.status === 'available';
            var typeIcon = item.type === 'grammar' ? 'menu_book' :
                           item.type === 'vocabulary' ? 'translate' :
                           item.type === 'review' ? 'quiz' :
                           item.type === 'progress_test' ? 'assignment' : 'school';
            var typeColor = item.type === 'grammar' ? '#3b82f6' :
                            item.type === 'vocabulary' ? '#10b981' :
                            item.type === 'review' ? '#f59e0b' : '#6366f1';

            if (isAvailable) {
              mapHtml += '<div class="fe-review-row fe-level-item fe-level-unlocked" style="cursor:pointer" onclick="BentoGrid.openCourseUnit(\'' + item.id + '\',\'data/Course/' + level + '/' + item.file + '\')">' +
                '<span class="fe-level-icon" style="color:' + typeColor + '">' + _mi(typeIcon) + '</span>' +
                '<div class="fe-level-label">' +
                  '<span class="fe-level-name">' + item.title + '</span>' +
                  '<span class="fe-level-pct" style="color:' + typeColor + '">' + _mi('chevron_right') + '</span>' +
                '</div>' +
              '</div>';
            } else {
              mapHtml += '<div class="fe-review-row fe-level-item fe-level-locked">' +
                '<span class="fe-level-icon">' + _mi('lock') + '</span>' +
                '<div class="fe-level-label">' +
                  '<span class="fe-level-name">' + item.title + '</span>' +
                  '<span class="fe-level-pct">Coming Soon</span>' +
                '</div>' +
              '</div>';
            }
          });

          mapHtml += '</div></div>';

          if (bi < blockOrder.length - 1) {
            mapHtml += '<div class="fe-map-connector"></div>';
          }
        });
      } else {
        // Fallback: no index available for this level
        mapHtml += '<div class="lt-coming-soon-banner">' +
          _mi('schedule') +
          '<div class="lt-coming-soon-text">' +
            '<strong>' + 'Coming Soon' + '</strong>' +
            '<span>' + 'The Course curriculum is under development. Structured lessons with explanations, exercises, and progress tracking will be available here soon.' + '</span>' +
          '</div>' +
        '</div>';
      }

      mapHtml += '</div>';

      centerSection.innerHTML = headerHtml + mapHtml;
    },

    openCourseUnit: async function(unitId, filePath) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var level = AppState.currentLevel || 'C1';

      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

      var centerSection = content.querySelector('#courseCenterSection');
      if (!centerSection) {
        // Re-render layout if navigated directly
        var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
        var rightSidebarContent = '';
        if (typeof BentoGrid !== 'undefined') {
          rightSidebarContent = BentoGrid._buildStreakSidebarHtml();
          rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
        }
        content.innerHTML =
          '<div class="dashboard-layout">' +
            '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
            '<div class="dashboard-center">' +
              '<div class="fe-section" id="courseCenterSection"></div>' +
            '</div>' +
            '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
          '</div>';
        centerSection = document.getElementById('courseCenterSection');
      }

      // Show loading
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

      var html =
        '<div class="subpage-header">' +
          '<button class="subpage-back-btn" onclick="BentoGrid.openLessons()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('auto_stories') + ' ' + (unitData.unitTitle || '') + '</div>' +
            '<div class="subpage-subtitle">' + level + ' Advanced</div>' +
          '</div>' +
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
    },

    _renderGrammarUnit: function(data) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      var html = '';

      (data.sections || []).forEach(function(section) {
        if (section.type === 'theory') {
          html += '<div class="cu-section cu-theory">' +
            '<div class="cu-section-title">' + _mi('menu_book') + ' ' + self._escapeHTML(section.title) + '</div>' +
            '<div class="cu-theory-body">';

          (section.content || []).forEach(function(block) {
            if (block.subtitle) {
              html += '<div class="cu-theory-subtitle">' + self._escapeHTML(block.subtitle) + '</div>';
            }
            if (block.description) {
              html += '<div class="cu-theory-desc">' + _bold(block.description) + '</div>';
            }
            var listItems = block.items || block.examples || [];
            if (listItems.length) {
              html += '<ul class="cu-theory-list">';
              listItems.forEach(function(item) {
                html += '<li>' + _bold(item) + '</li>';
              });
              html += '</ul>';
            }
          });

          html += '</div></div>';

        } else if (section.type === 'exercise') {
          html += '<div class="cu-section cu-exercise">' +
            '<div class="cu-section-title">' + _mi('edit_note') + ' ' + self._escapeHTML(section.title) + '</div>';

          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }

          html += '<div class="cu-ex-items">';
          (section.items || []).forEach(function(item, idx) {
            html += '<div class="cu-ex-item">' +
              '<div class="cu-ex-sentence">' + (idx + 1) + '. ' + _bold(item.sentence || '') + '</div>' +
              '<button class="cu-answer-btn" onclick="this.nextElementSibling.style.display=\'block\';this.style.display=\'none\'">Show Answer</button>' +
              '<div class="cu-answer" style="display:none">' + self._escapeHTML(item.answer || '') + '</div>' +
            '</div>';
          });
          html += '</div></div>';
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

      // Topic vocabulary
      if (sections.topic_vocabulary) {
        html += '<div class="cu-section cu-vocab">' +
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
        html += '<div class="cu-section cu-pv">' +
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
        html += '<div class="cu-section cu-collocations">' +
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
        html += '<div class="cu-section cu-idioms">' +
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
        html += '<div class="cu-section cu-wf">' +
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

      // Exercises
      if (sections.exercises && Object.keys(sections.exercises).length) {
        html += '<div class="cu-section cu-exercise">' +
          '<div class="cu-section-title">' + _mi('edit_note') + ' Exercises</div>';
        Object.keys(sections.exercises).forEach(function(key) {
          var ex = sections.exercises[key];
          html += '<div class="cu-ex-sub">' +
            '<div class="cu-ex-subtitle">Exercise ' + self._escapeHTML(key) + ': ' + self._escapeHTML(ex.title || '') + '</div>';
          if (ex.instructions) html += '<div class="cu-ex-instructions">' + _bold(ex.instructions) + '</div>';
          if (ex.words && ex.words.length) {
            html += '<div class="cu-ex-wordbank"><strong>Word bank:</strong> ' + ex.words.map(function(w) { return self._escapeHTML(w); }).join(', ') + '</div>';
          }
          html += '<div class="cu-ex-items">';
          (ex.questions || []).forEach(function(q, idx) {
            html += '<div class="cu-ex-item">' +
              '<div class="cu-ex-sentence">' + (idx + 1) + '. ' + _bold(q.sentence || '') + '</div>' +
              '<button class="cu-answer-btn" onclick="this.nextElementSibling.style.display=\'block\';this.style.display=\'none\'">Show Answer</button>' +
              '<div class="cu-answer" style="display:none">' + self._escapeHTML(q.answer || '') + '</div>' +
            '</div>';
          });
          html += '</div></div>';
        });
        html += '</div>';
      }

      return html || '<div class="fe-error">No content available.</div>';
    },

    _renderReviewUnit: function(data) {
      var self = this;
      function _mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }
      function _bold(str) { return self._escapeHTML(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
      var html = '';

      (data.sections || []).forEach(function(section) {
        if (section.type === 'exercise') {
          html += '<div class="cu-section cu-exercise">' +
            '<div class="cu-section-title">' + _mi('quiz') + ' ' + self._escapeHTML(section.title) + '</div>';
          if (section.instructions) {
            html += '<div class="cu-ex-instructions">' + _bold(section.instructions) + '</div>';
          }
          html += '<div class="cu-ex-items">';
          (section.items || []).forEach(function(item, idx) {
            html += '<div class="cu-ex-item">' +
              '<div class="cu-ex-sentence">' + (idx + 1) + '. ' + _bold(item.sentence || '') + '</div>' +
              '<button class="cu-answer-btn" onclick="this.nextElementSibling.style.display=\'block\';this.style.display=\'none\'">Show Answer</button>' +
              '<div class="cu-answer" style="display:none">' + self._escapeHTML(item.answer || '') + '</div>' +
            '</div>';
          });
          html += '</div></div>';
        }
      });

      return html || '<div class="fe-error">No content available.</div>';
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
          '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
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
          '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
        '</div>';

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
