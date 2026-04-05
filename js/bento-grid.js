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


    _renderLearningRow: function() {
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      return '<div class="bento-learning-row">' +

        '<div class="bento-card bento-card-crossword" onclick="BentoGrid.openCrosswordList()">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Crossword</div>' +
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

    openMicroLearning: function() {
      if (typeof FastExercises !== 'undefined') {
        FastExercises.openCategories();
      } else {
        BentoGrid.openQuickstepsChooser();
      }
    },

    _cwProgressKey: 'cambridge_crossword_progress',

    _getCwProgress: function() {
      try { return JSON.parse(localStorage.getItem(this._cwProgressKey)) || {}; } catch(e) { return {}; }
    },

    _buildCrosswordStatsSidebarHtml: function(entries) {
      var progress = this._getCwProgress();
      var total = entries.length;
      var completedCount = 0;
      var lastUnfinished = null;
      var lastUnfinishedTime = 0;

      entries.forEach(function(e) {
        var key = e.cwIndex !== undefined ? e.levelId + '_cw' + e.cwIndex : e.levelId + '_' + e.lessonId;
        var p = progress[key];
        if (!p) return;
        if (p.completed) {
          completedCount++;
        } else if (p.wordsComplete > 0 && p.lastPlayed) {
          var t = new Date(p.lastPlayed).getTime();
          if (t > lastUnfinishedTime) {
            lastUnfinishedTime = t;
            lastUnfinished = e;
          }
        }
      });

      var pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      var html = '<div class="cw-sidebar-stats">' +
        '<div class="cw-sidebar-stats-title">' + _mi('grid_on') + ' Crosswords</div>' +
        '<div class="cw-sidebar-stats-row">' +
          '<div class="cw-sidebar-stat">' +
            '<div class="cw-sidebar-stat-num">' + completedCount + '</div>' +
            '<div class="cw-sidebar-stat-label">Completed</div>' +
          '</div>' +
          '<div class="cw-sidebar-stat">' +
            '<div class="cw-sidebar-stat-num">' + total + '</div>' +
            '<div class="cw-sidebar-stat-label">Total</div>' +
          '</div>' +
        '</div>' +
        '<div class="cw-sidebar-prog-track"><div class="cw-sidebar-prog-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="cw-sidebar-prog-label">' + pct + '% overall progress</div>' +
      '</div>';

      if (lastUnfinished) {
        var diff = this._cwDiffMap()[lastUnfinished.levelId] || this._cwDiffMap()['B2'];
        var key2 = lastUnfinished.cwIndex !== undefined
          ? lastUnfinished.levelId + '_cw' + lastUnfinished.cwIndex
          : lastUnfinished.levelId + '_' + lastUnfinished.lessonId;
        var p2 = progress[key2] || {};
        var wordsPct = (p2.wordsTotal > 0) ? Math.round((p2.wordsComplete / p2.wordsTotal) * 100) : 0;
        var continueOnclick = lastUnfinished.cwIndex !== undefined
          ? 'FastExercises._openMixedCrossword(\'' + this._escapeHTML(lastUnfinished.levelId) + '\',' + lastUnfinished.cwIndex + ')'
          : 'FastExercises._openVocabCrossword(\'' + this._escapeHTML(lastUnfinished.levelId) + '\',\'' + this._escapeHTML(lastUnfinished.lessonId) + '\')';
        html += '<div class="cw-sidebar-continue" onclick="' + continueOnclick + '">' +
          '<div class="cw-sidebar-continue-label">' + _mi('play_circle') + ' Continue</div>' +
          '<div class="cw-sidebar-continue-title">' + this._escapeHTML(lastUnfinished.title) + '</div>' +
          '<div class="cw-sidebar-continue-sub">' + lastUnfinished.levelId + ' · ' + wordsPct + '% done</div>' +
          '<div class="cw-sidebar-prog-track" style="margin-top:8px"><div class="cw-sidebar-prog-fill" style="width:' + wordsPct + '%"></div></div>' +
        '</div>';
      }

      return html;
    },

    _cwDiffMap: function() {
      return {
        'A2': { label: 'A2', difficulty: 'easy',   bg: '#d1fae5', badgeColor: '#065f46' },
        'B1': { label: 'B1', difficulty: 'easy',   bg: '#d1fae5', badgeColor: '#065f46' },
        'B2': { label: 'B2', difficulty: 'medium', bg: '#fef9c3', badgeColor: '#713f12' },
        'C1': { label: 'C1', difficulty: 'hard',   bg: '#ffedd5', badgeColor: '#7c2d12' },
        'C2': { label: 'C2', difficulty: 'expert', bg: '#fee2e2', badgeColor: '#7f1d1d' }
      };
    },

    openCrosswordList: async function(page, levelFilter) {
      var content = document.getElementById('main-content');
      if (!content) return;

      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      var cwState = { view: 'crosswordList' };
      history.pushState(cwState, '', Router.stateToPath(cwState));

      // Render initial layout with spinner (no sidebars yet — built after data load)
      content.innerHTML =
        '<div class="dashboard-layout cw-list-layout">' +
          '<div class="dashboard-left-sidebar" id="cwLeftSidebar"><div class="fe-loading"><div class="fe-spinner"></div></div></div>' +
          '<div class="dashboard-center">' +
            '<div class="cw-list-page" id="cwListPage">' +
              '<div class="fe-loading"><div class="fe-spinner"></div></div>' +
            '</div>' +
          '</div>' +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();

      var cwListPage = document.getElementById('cwListPage');
      var cwLeftSidebar = document.getElementById('cwLeftSidebar');
      if (!cwListPage) return;

      var CEFR_ORDER = ['A2', 'B1', 'B2', 'C1', 'C2'];
      var DIFF_MAP = this._cwDiffMap();

      // Build crossword entries from the fixed level config (no topic grouping)
      var LEVEL_CONFIG = typeof FastExercises !== 'undefined' && FastExercises._cwLevelConfig
        ? FastExercises._cwLevelConfig()
        : [{ id: 'A2', count: 6 }, { id: 'B1', count: 9 }, { id: 'B2', count: 20 }, { id: 'C1', count: 13 }];

      var allEntries = [];
      CEFR_ORDER.forEach(function(cefrId) {
        var cfg = null;
        for (var i = 0; i < LEVEL_CONFIG.length; i++) {
          if (LEVEL_CONFIG[i].id === cefrId) { cfg = LEVEL_CONFIG[i]; break; }
        }
        if (!cfg || cfg.count <= 0) return;
        for (var idx = 0; idx < cfg.count; idx++) {
          allEntries.push({ levelId: cefrId, cwIndex: idx, title: cefrId + ' #' + (idx + 1) });
        }
      });

      // Build left sidebar with stats
      if (cwLeftSidebar) {
        cwLeftSidebar.innerHTML = BentoGrid._buildCrosswordStatsSidebarHtml(allEntries);
      }

      // Apply level filter
      var activeFilter = levelFilter || null;
      var entries = activeFilter
        ? allEntries.filter(function(e) { return e.levelId === activeFilter; })
        : allEntries;

      var PAGE_SIZE = 12;
      var currentPage = (typeof page === 'number' && page >= 0) ? page : 0;
      var totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages - 1);

      // Level filter buttons
      var availableLevels = [];
      CEFR_ORDER.forEach(function(lvl) {
        if (allEntries.some(function(e) { return e.levelId === lvl; })) availableLevels.push(lvl);
      });

      var filterHtml = '<div class="cw-level-filter">';
      filterHtml += '<button class="cw-filter-btn' + (!activeFilter ? ' cw-filter-btn-active' : '') +
        '" onclick="BentoGrid.openCrosswordList(0)">All</button>';
      availableLevels.forEach(function(lvl) {
        var diff = DIFF_MAP[lvl] || DIFF_MAP['B2'];
        filterHtml += '<button class="cw-filter-btn' + (activeFilter === lvl ? ' cw-filter-btn-active' : '') +
          '" style="' + (activeFilter === lvl ? 'background:' + diff.badgeColor + ';color:#fff;border-color:' + diff.badgeColor : '') + '"' +
          ' onclick="BentoGrid.openCrosswordList(0,\'' + lvl + '\')">' + lvl + '</button>';
      });
      filterHtml += '</div>';

      var headerHtml =
        '<div class="cw-list-header">' +
          '<button class="subpage-back-btn" onclick="loadDashboard()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('grid_on') + ' Crosswords</div>' +
            '<div class="subpage-subtitle">Select a crossword to play</div>' +
          '</div>' +
        '</div>' +
        filterHtml;

      var progress = this._getCwProgress();

      var cardsHtml = '';
      if (entries.length === 0) {
        cardsHtml = '<div class="fe-map-empty">No crosswords available yet.</div>';
      } else {
        var pageEntries = entries.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
        cardsHtml = '<div class="cw-list-grid">';
        pageEntries.forEach(function(entry, i) {
          var num = allEntries.indexOf(entry) + 1;
          var diff = DIFF_MAP[entry.levelId] || DIFF_MAP['B2'];
          var pKey = entry.levelId + '_cw' + entry.cwIndex;
          var prog = progress[pKey];
          var wordsPct = 0;
          var isCompleted = false;
          if (prog) {
            isCompleted = !!prog.completed;
            wordsPct = (prog.wordsTotal > 0) ? Math.round((prog.wordsComplete / prog.wordsTotal) * 100) : 0;
            if (isCompleted) wordsPct = 100;
          }
          cardsHtml +=
            '<div class="cw-list-card' + (isCompleted ? ' cw-list-card-done' : '') + '" style="background:' + diff.bg + '" ' +
              'onclick="FastExercises._openMixedCrossword(\'' + entry.levelId + '\',' + entry.cwIndex + ')">' +
              '<div class="cw-list-card-num">' + num + '</div>' +
              '<div class="cw-list-card-badge" style="background:' + diff.badgeColor + '">' + entry.levelId + '</div>' +
              '<div class="cw-list-card-prog-wrap">' +
                '<div class="cw-list-card-prog-track">' +
                  '<div class="cw-list-card-prog-fill' + (isCompleted ? ' cw-prog-done' : '') + '" style="width:' + wordsPct + '%"></div>' +
                '</div>' +
                '<span class="cw-list-card-prog-pct">' + (isCompleted ? _mi('check_circle') : wordsPct + '%') + '</span>' +
              '</div>' +
            '</div>';
        });
        cardsHtml += '</div>';
      }

      // Pagination
      var paginationHtml = '';
      if (totalPages > 1) {
        var filterArg = activeFilter ? ',\'' + activeFilter + '\'' : '';
        paginationHtml = '<div class="cw-list-pagination">';
        paginationHtml += '<button class="cw-list-page-btn" ' +
          (currentPage === 0 ? 'disabled' : 'onclick="BentoGrid.openCrosswordList(' + (currentPage - 1) + filterArg + ')"') +
          '>' + _mi('chevron_left') + ' Previous</button>';
        for (var p = 0; p < totalPages; p++) {
          paginationHtml += '<button class="cw-list-page-btn' + (p === currentPage ? ' cw-list-page-btn-active' : '') +
            '" onclick="BentoGrid.openCrosswordList(' + p + filterArg + ')">' + (p + 1) + '</button>';
        }
        paginationHtml += '<button class="cw-list-page-btn" ' +
          (currentPage === totalPages - 1 ? 'disabled' : 'onclick="BentoGrid.openCrosswordList(' + (currentPage + 1) + filterArg + ')"') +
          '>Next ' + _mi('chevron_right') + '</button>';
        paginationHtml += '</div>';
      }

      cwListPage.innerHTML = headerHtml + cardsHtml + paginationHtml;
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
    }
  };
})();
