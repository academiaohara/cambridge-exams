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

      html += this._renderMobileAppHero(level, exams);

      html += '<section class="mobile-learn-pane" id="mobileLearnPane">';

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

      html += '</section>';

      html += this._renderMobileStatsSection(exams);
      html += this._renderMobileBottomNav(level);

      html += '</div>';
      container.innerHTML = html;
      this._updateCourseProgressDesc(level);
      this.setMobileDashboardTab(this._mobileDashboardTab || 'home');
    },

    _renderMobileAppHero: function(level, exams) {
      var name = this._getUserName() || 'there';
      var availableCount = (exams || []).filter(function(e) { return e.status === 'available'; }).length;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      return '<section class="mobile-app-hero">' +
        '<div class="mobile-app-kicker">EngagEd</div>' +
        '<h1>Hi, ' + this._escapeHTML(name.split(' ')[0]) + '</h1>' +
        '<p>Choose your next move for ' + this._escapeHTML(level) + '.</p>' +
        '<div class="mobile-app-pill-row">' +
          '<span class="mobile-app-pill">' + _mi('school') + this._escapeHTML(level) + '</span>' +
          '<span class="mobile-app-pill">' + _mi('assignment') + availableCount + ' tests</span>' +
        '</div>' +
        '<div class="mobile-app-actions" aria-label="Mobile sections">' +
          '<button onclick="BentoGrid.selectMode(\'practice\')">' + _mi('edit_note') + '<span>Practice</span></button>' +
          '<button onclick="BentoGrid.selectMode(\'exam\')">' + _mi('timer') + '<span>Simulation</span></button>' +
          '<button onclick="BentoGrid.openLessons()">' + _mi('auto_stories') + '<span>Course</span></button>' +
          '<button onclick="BentoGrid.openMicroLearning()">' + _mi('bolt') + '<span>Exercises</span></button>' +
          '<button onclick="document.getElementById(\'mobileStatsSection\')?.scrollIntoView({behavior:\'smooth\',block:\'start\'})">' + _mi('bar_chart') + '<span>Stats</span></button>' +
          '<button onclick="UserProfile.renderProfileSection()">' + _mi('settings') + '<span>Profile</span></button>' +
        '</div>' +
      '</section>';
    },

    _renderMobileStatsSection: function(exams) {
      var level = AppState.currentLevel || 'C1';
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var completedParts = 0;
      var inProgressParts = 0;
      var availableCount = 0;
      var scaleTotal = 0;
      var scaleCount = 0;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      (exams || []).forEach(function(exam) {
        if (exam.status !== 'available') return;
        availableCount++;
        Object.keys(exam.sections || {}).forEach(function(sectionKey) {
          var section = exam.sections[sectionKey] || {};
          completedParts += (section.completed || []).length;
          inProgressParts += (section.inProgress || []).length;
        });
        if (typeof ScoreCalculator !== 'undefined') {
          try {
            ScoreCalculator.getAllSkillScores(exam.id).forEach(function(score) {
              if (score.raw > 0) {
                scaleTotal += score.scale;
                scaleCount++;
              }
            });
          } catch (e) {}
        }
      });

      var avgScale = scaleCount ? Math.round(scaleTotal / scaleCount) : '--';
      var levels = ['B1', 'B2', 'C1'];
      var levelButtons = levels.map(function(lvl) {
        return '<button class="mobile-level-chip' + (lvl === level ? ' active' : '') + '" onclick="BentoGrid.changeLevel(\'' + lvl + '\')">' + lvl + '</button>';
      }).join('');

      return '<section class="mobile-stats-section" id="mobileStatsSection">' +
        '<div class="mobile-section-heading">' +
          '<div>' +
            '<span>Stats</span>' +
            '<h2>Your progress</h2>' +
          '</div>' +
          '<button onclick="BentoGrid.openGradeEvolution()">' + _mi('query_stats') + ' Details</button>' +
        '</div>' +
        '<div class="mobile-stats-grid">' +
          '<div class="mobile-stat-card"><span>Level</span><strong>' + this._escapeHTML(level) + '</strong><small>' + availableCount + ' tests</small></div>' +
          '<div class="mobile-stat-card"><span>Streak</span><strong>' + streakCount + '</strong><small>days</small></div>' +
          '<div class="mobile-stat-card"><span>Done</span><strong>' + completedParts + '</strong><small>' + inProgressParts + ' in progress</small></div>' +
          '<div class="mobile-stat-card"><span>Score</span><strong>' + avgScale + '</strong><small>avg scale</small></div>' +
        '</div>' +
        '<div class="mobile-level-switcher" aria-label="Choose level">' + levelButtons + '</div>' +
        '<div class="mobile-stats-actions">' +
          '<button onclick="openScoreCalculator()">' + _mi('calculate') + '<span>Score calculator</span></button>' +
          '<button onclick="BentoGrid.openStreakSection()">' + _mi('local_fire_department') + '<span>Streak calendar</span></button>' +
        '</div>' +
      '</section>';
    },

    _renderMobileBottomNav: function(level) {
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      return '<nav class="mobile-bottom-nav" aria-label="Mobile dashboard">' +
        '<button class="mobile-bottom-nav-btn" data-mobile-tab="home" onclick="BentoGrid.setMobileDashboardTab(\'home\')">' + _mi('home') + '<span>Inicio</span></button>' +
        '<button class="mobile-bottom-nav-btn" data-mobile-tab="learn" onclick="BentoGrid.setMobileDashboardTab(\'learn\')">' + _mi('school') + '<span>Learn</span></button>' +
        '<button class="mobile-bottom-nav-btn" data-mobile-tab="stats" onclick="BentoGrid.setMobileDashboardTab(\'stats\')">' + _mi('bar_chart') + '<span>Stats</span></button>' +
        '<button class="mobile-bottom-nav-btn" onclick="BentoGrid.openMobileDictionaries()">' + _mi('menu_book') + '<span>Dict</span></button>' +
        '<button class="mobile-bottom-nav-btn mobile-bottom-level" onclick="BentoGrid.cycleMobileLevel()" aria-label="Change level"><strong>' + this._escapeHTML(level || 'C1') + '</strong></button>' +
      '</nav>';
    },

    setMobileDashboardTab: function(tab) {
      tab = tab || 'home';
      this._mobileDashboardTab = tab;
      var grid = document.querySelector('.bento-grid');
      if (grid) {
        grid.setAttribute('data-mobile-tab', tab);
      }
      document.querySelectorAll('.mobile-bottom-nav-btn[data-mobile-tab]').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mobile-tab') === tab);
      });
      if (tab === 'stats') {
        var stats = document.getElementById('mobileStatsSection');
        if (stats) stats.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },

    cycleMobileLevel: function() {
      var levels = ['B1', 'B2', 'C1'];
      var current = (AppState.currentLevel || 'C1').toUpperCase();
      var next = levels[(levels.indexOf(current) + 1) % levels.length] || 'C1';
      this.changeLevel(next);
    },

    openMobileDictionaries: function() {
      if (typeof FastExercises !== 'undefined' && FastExercises._showGeneralDictionary) {
        FastExercises._showGeneralDictionary();
      }
    },


    _renderLearningRow: function() {
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      return '<div class="bento-learning-row">' +

        '<div class="bento-card bento-card-crossword" onclick="BentoGrid.openCrosswordList()">' +
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Crossword</div>' +
            BentoGrid._buildCrosswordBentoMeta() +
            '<div class="bento-card-hover-info">Solve today\'s Cambridge-style crossword. A new puzzle every day — build your streak!</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-card-basecamp" onclick="BentoGrid.openLessons()">' +
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Course</div>' +
            '<div id="bento-course-prog-desc" class="bento-course-prog"></div>' +
            '<div class="bento-card-hover-info">Structured lessons covering grammar theory, vocabulary, phrasal verbs, idioms, word formation, and review exercises — everything you need for Cambridge exams.</div>' +
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
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Weak Spot</div>' +
            '<div class="bento-card-desc">' + 'Complete some exercises to get personalised recommendations!' + '</div>' +
            '<div class="bento-card-hover-info">Your lowest-scoring section — practice it to boost your overall result.</div>' +
          '</div>' +
        '</div>';
      }

      var scoreHtml = weak.ratio !== null
        ? ' · ' + Math.round(weak.ratio * 100) + '%'
        : '';

      return '<div class="bento-card bento-card-weakspot" onclick="Exercise.openPart(\'' + this._escapeHTML(weak.examId) + '\', \'' + weak.section + '\', ' + (weak.part || 1) + ')">' +
        '<div class="bento-hover-overlay"></div>' +
        '<div class="bento-card-inner">' +
          '<div class="bento-card-title">Weak Spot</div>' +
          '<div class="bento-card-desc">' + this._escapeHTML(weak.examId) + ' — ' + this._capitalize(weak.section) + (weak.part ? ' ' + 'Part' + ' ' + weak.part : '') + scoreHtml + '</div>' +
          '<div class="bento-card-hover-info">Your lowest-scoring section — practice it to boost your overall result.</div>' +
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
        '<div class="bento-hover-overlay"></div>' +
        '<div class="bento-card-inner">' +
          '<div class="bento-card-title">Checkpoint</div>' +
          '<div class="bento-card-desc">' + this._escapeHTML(lesson.examId) + ' — ' + this._capitalize(lesson.section) + ' ' + 'Part' + ' ' + lesson.part + ' (' + completedParts + '/' + totalParts + ')</div>' +
          '<div class="bento-card-hover-info">Pick up where you left off and continue your next in-progress exercise.</div>' +
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

    // Returns the number of consecutive days (ending today or yesterday) on which
    // the user played at least one crossword.
    _calcCwStreak: function(progressObj) {
      var dates = {};
      Object.values(progressObj).forEach(function(p) {
        if (!p || !p.lastPlayed) return;
        var d = p.lastPlayed.slice(0, 10); // 'YYYY-MM-DD'
        dates[d] = true;
      });
      if (!Object.keys(dates).length) return 0;

      var today = new Date();
      today.setHours(0, 0, 0, 0);

      // Allow streak to start from today or yesterday
      var cursor = new Date(today);
      var todayStr = today.toISOString().slice(0, 10);
      var yestStr  = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
      if (!dates[todayStr] && !dates[yestStr]) return 0;
      if (!dates[todayStr]) cursor = new Date(today.getTime() - 86400000);

      var streak = 0;
      while (true) {
        var ds = cursor.toISOString().slice(0, 10);
        if (!dates[ds]) break;
        streak++;
        cursor = new Date(cursor.getTime() - 86400000);
      }
      return streak;
    },

    // Returns XP earned: 50 per completed crossword + 10 per in-progress crossword.
    _calcCwXP: function(progressObj) {
      var xp = 0;
      Object.values(progressObj).forEach(function(p) {
        if (!p) return;
        if (p.completed) { xp += 50; }
        else if ((p.wordsCorrect || p.wordsComplete || 0) > 0) { xp += 10; }
      });
      return xp;
    },

    // Returns array of earned badge objects { icon, label, earned }.
    _getCwBadges: function(progressObj, completedCount, total) {
      var badges = [];
      var perfectCount = 0;
      Object.values(progressObj).forEach(function(p) {
        if (p && p.completed && (p.hintsUsed || 0) === 0) perfectCount++;
      });
      var defs = [
        { icon: '⭐', label: 'First Crossword', earned: completedCount >= 1 },
        { icon: '🔥', label: '5 Completed',     earned: completedCount >= 5 },
        { icon: '🏆', label: '10 Completed',    earned: completedCount >= 10 },
        { icon: '💎', label: 'All Done',         earned: total > 0 && completedCount >= total },
        { icon: '🧠', label: 'Perfect Solver',   earned: perfectCount >= 1 }
      ];
      defs.forEach(function(b) { badges.push(b); });
      return badges;
    },

    // Async: loads category data and updates the Course bento card progress rows.
    _updateCourseProgressDesc: async function(level) {
      var el = document.getElementById('bento-course-prog-desc');
      if (!el) return;
      try {
        var results = await Promise.all([
          fetch('data/Course/' + level + '/index.json').then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
          (typeof FastExercises !== 'undefined') ? FastExercises._loadCategoryData('phrasal-verbs') : Promise.resolve(null),
          (typeof FastExercises !== 'undefined') ? FastExercises._loadCategoryData('idioms') : Promise.resolve(null),
          (typeof FastExercises !== 'undefined') ? FastExercises._loadCategoryData('word-formation') : Promise.resolve(null)
        ]);

        var courseIndex = results[0];
        var pvData = results[1];
        var idData = results[2];
        var wfData = results[3];

        // Theory %: grammar + vocabulary units completed vs total
        var theoryPct = 0;
        if (courseIndex && courseIndex.items) {
          var theoryItems = courseIndex.items.filter(function(i) { return i.type === 'grammar' || i.type === 'vocabulary'; });
          var courseProg = {};
          try { courseProg = JSON.parse(localStorage.getItem('cambridge_course_progress_' + level) || '{}'); } catch(e) {}
          var doneCourse = theoryItems.filter(function(i) { return !!courseProg[i.id]; }).length;
          theoryPct = theoryItems.length > 0 ? Math.round((doneCourse / theoryItems.length) * 100) : 0;
        }

        var pvPct = (pvData && pvData.levels && typeof FastExercises !== 'undefined') ? FastExercises._getLevelPercent('phrasal-verbs', level, pvData.levels) : 0;
        var idPct = (idData && idData.levels && typeof FastExercises !== 'undefined') ? FastExercises._getLevelPercent('idioms', level, idData.levels) : 0;
        var wfPct = (wfData && wfData.levels && typeof FastExercises !== 'undefined') ? FastExercises._getLevelPercent('word-formation', level, wfData.levels) : 0;

        el.innerHTML =
          '<div class="bcp-row"><span class="bcp-label">Theory</span><span class="bcp-dots"></span><span class="bcp-pct">' + theoryPct + '%</span></div>' +
          '<div class="bcp-row"><span class="bcp-label">Phrasal Verbs</span><span class="bcp-dots"></span><span class="bcp-pct">' + pvPct + '%</span></div>' +
          '<div class="bcp-row"><span class="bcp-label">Idioms</span><span class="bcp-dots"></span><span class="bcp-pct">' + idPct + '%</span></div>' +
          '<div class="bcp-row"><span class="bcp-label">Word Formation</span><span class="bcp-dots"></span><span class="bcp-pct">' + wfPct + '%</span></div>';
      } catch(e) {}
    },

    // Returns compact meta HTML for the dashboard bento card (daily challenge + progress + streak).
    _buildCrosswordBentoMeta: function() {
      var progress = (typeof CrosswordSync !== 'undefined') ? CrosswordSync.getAll() : this._getCwProgress();
      var LEVEL_CONFIG = (typeof FastExercises !== 'undefined' && FastExercises._cwLevelConfig)
        ? FastExercises._cwLevelConfig() : [];
      var total = LEVEL_CONFIG.reduce(function(s, l) { return s + (l.count || 0); }, 0);
      if (!total) return '';

      var completedCount = 0;
      var lastPlayedMs = 0;
      Object.values(progress).forEach(function(p) {
        if (!p) return;
        if (p.completed) completedCount++;
        if (p.lastPlayed) {
          var t = new Date(p.lastPlayed).getTime();
          if (t > lastPlayedMs) lastPlayedMs = t;
        }
      });
      var streak = this._calcCwStreak(progress);

      var lastPlayedText = '';
      if (lastPlayedMs) {
        var diffDays = Math.floor((Date.now() - lastPlayedMs) / 86400000);
        if (diffDays === 0)      lastPlayedText = 'Last played: Today';
        else if (diffDays === 1) lastPlayedText = 'Last played: Yesterday';
        else                     lastPlayedText = 'Last played: ' + diffDays + ' days ago';
      }

      // Daily challenge status
      var daily = this._getDailyCrossword('mix');
      var dailyHtml = '';
      if (daily) {
        var dailyKey = daily.levelId + '_daily_' + daily.date;
        var dailyProg = progress[dailyKey];
        var isDailyDone = dailyProg && dailyProg.completed;
        var isDailyStarted = dailyProg && !isDailyDone && (dailyProg.wordsCorrect || dailyProg.wordsComplete || 0) > 0;
        var dailyStatusText = isDailyDone ? '✅ Completed!' : (isDailyStarted ? '⏳ In progress' : '▶ Play now');
        dailyHtml = '<div class="bento-card-cw-daily' + (isDailyDone ? ' bento-card-cw-daily-done' : '') + '">' +
          '<span class="bento-cw-daily-label">📅 Daily · ' + daily.levelId + '</span>' +
          '<span class="bento-cw-daily-status">' + dailyStatusText + '</span>' +
        '</div>';
      }

      var html = '<div class="bento-card-cw-meta">';
      html += '<div class="bento-card-cw-prog">' + completedCount + ' / ' + total + ' completed</div>';
      if (streak > 0) html += '<div class="bento-card-cw-streak">🔥 ' + streak + '-day streak</div>';
      if (lastPlayedText) html += '<div class="bento-card-cw-lastplayed">' + lastPlayedText + '</div>';
      html += '</div>';
      return html;
    },

    _buildCrosswordStatsSidebarHtml: function(entries) {
      var progress = (typeof CrosswordSync !== 'undefined') ? CrosswordSync.getAll() : this._getCwProgress();
      var total = entries.length;
      var completedCount = 0;
      var inProgressCount = 0;
      var lastUnfinished = null;
      var lastUnfinishedTime = 0;

      entries.forEach(function(e) {
        var key = e.cwIndex !== undefined ? e.levelId + '_cw' + e.cwIndex : e.levelId + '_' + e.lessonId;
        var p = progress[key];
        if (!p) return;
        if (p.completed) {
          completedCount++;
        } else if ((p.wordsCorrect || p.wordsComplete || 0) > 0) {
          inProgressCount++;
          if (p.lastPlayed) {
            var t = new Date(p.lastPlayed).getTime();
            if (t > lastUnfinishedTime) {
              lastUnfinishedTime = t;
              lastUnfinished = e;
            }
          }
        }
      });

      var pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      var streak = this._calcCwStreak(progress);
      var xp = this._calcCwXP(progress);
      var badges = this._getCwBadges(progress, completedCount, total);
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      // ── Stats block ──
      var html = '<div class="cw-sidebar-stats">' +
        '<div class="cw-sidebar-stats-title">' + _mi('grid_on') + ' Crosswords</div>' +
        '<div class="cw-sidebar-stats-row">' +
          '<div class="cw-sidebar-stat">' +
            '<div class="cw-sidebar-stat-num">' + completedCount + '</div>' +
            '<div class="cw-sidebar-stat-label">Done</div>' +
          '</div>' +
          '<div class="cw-sidebar-stat">' +
            '<div class="cw-sidebar-stat-num">' + inProgressCount + '</div>' +
            '<div class="cw-sidebar-stat-label">In Progress</div>' +
          '</div>' +
          '<div class="cw-sidebar-stat">' +
            '<div class="cw-sidebar-stat-num">' + total + '</div>' +
            '<div class="cw-sidebar-stat-label">Total</div>' +
          '</div>' +
        '</div>' +
        '<div class="cw-sidebar-prog-track"><div class="cw-sidebar-prog-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="cw-sidebar-prog-label">' + pct + '% overall progress</div>' +
      '</div>';

      // ── Streak widget ──
      html += '<div class="cw-sidebar-streak">';
      if (streak > 0) {
        html += '<div class="cw-sidebar-streak-num">🔥 ' + streak + '</div>';
        html += '<div class="cw-sidebar-streak-label">day streak</div>';
      } else {
        html += '<div class="cw-sidebar-streak-empty">Start your streak today!</div>';
      }
      html += '</div>';

      // ── XP bar ──
      var XP_TIER = 500;
      var xpInTier = xp % XP_TIER;
      var xpPct = Math.round((xpInTier / XP_TIER) * 100);
      var tier = Math.floor(xp / XP_TIER);
      html += '<div class="cw-sidebar-xp">' +
        '<div class="cw-sidebar-xp-row">' +
          '<span class="cw-sidebar-xp-label">' + _mi('bolt') + ' ' + xp + ' XP</span>' +
          (tier > 0 ? '<span class="cw-sidebar-xp-tier">Tier ' + tier + '</span>' : '') +
          '<span class="cw-sidebar-xp-next">' + xpInTier + ' / ' + XP_TIER + '</span>' +
        '</div>' +
        '<div class="cw-sidebar-xp-track"><div class="cw-sidebar-xp-fill" style="width:' + xpPct + '%"></div></div>' +
      '</div>';

      // ── Badges ──
      var earnedBadges = badges.filter(function(b) { return b.earned; });
      if (earnedBadges.length > 0) {
        html += '<div class="cw-sidebar-badges">';
        earnedBadges.forEach(function(b) {
          html += '<span class="cw-badge cw-badge-earned" title="' + b.label + '">' + b.icon + ' ' + b.label + '</span>';
        });
        html += '</div>';
      }

      // ── Continue last unfinished ──
      if (lastUnfinished) {
        var key2 = lastUnfinished.cwIndex !== undefined
          ? lastUnfinished.levelId + '_cw' + lastUnfinished.cwIndex
          : lastUnfinished.levelId + '_' + lastUnfinished.lessonId;
        var p2 = progress[key2] || {};
        var wordsPct = (p2.wordsTotal > 0) ? Math.round(((p2.wordsCorrect || p2.wordsComplete || 0) / p2.wordsTotal) * 100) : 0;
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
        'A2': { label: 'Easy',   difficulty: 'easy',   cssClass: 'cw-list-card-a2', badgeColor: '#065f46' },
        'B1': { label: 'Easy',   difficulty: 'easy',   cssClass: 'cw-list-card-b1', badgeColor: '#065f46' },
        'B2': { label: 'Medium', difficulty: 'medium', cssClass: 'cw-list-card-b2', badgeColor: '#713f12' },
        'C1': { label: 'Hard',   difficulty: 'hard',   cssClass: 'cw-list-card-c1', badgeColor: '#7c2d12' },
        'C2': { label: 'Expert', difficulty: 'expert', cssClass: 'cw-list-card-c2', badgeColor: '#7f1d1d' },
        'mix': { label: 'Mixed', difficulty: 'mixed',  cssClass: 'cw-list-card-b2', badgeColor: '#1d4ed8' }
      };
    },

    // Returns today's daily crossword descriptor { levelId, date } for the given level.
    // A new puzzle is generated automatically when the calendar day changes.
    _getDailyCrossword: function(level) {
      var today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
      return { levelId: level, date: today };
    },

    // Opens today's daily crossword. Always uses the mixed level so the puzzle
    // draws from vocabulary across all CEFR levels.
    openDailyCrossword: function() {
      var daily = this._getDailyCrossword('mix');
      if (!daily || typeof FastExercises === 'undefined') {
        this.openCrosswordList();
        return;
      }
      FastExercises._openDailyGeneratedCrossword(daily.levelId, daily.date);
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

      var CEFR_ORDER = ['A2', 'B1', 'B2', 'C1', 'C2', 'mix'];
      var DIFF_MAP = this._cwDiffMap();

      // Build crossword entries from the fixed level config (no topic grouping).
      // CW_LEVEL_CONFIG is defined in fast-exercises.js and exposed via _cwLevelConfig().
      var LEVEL_CONFIG = (typeof FastExercises !== 'undefined' && FastExercises._cwLevelConfig)
        ? FastExercises._cwLevelConfig()
        : [];

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

      // Build left sidebar with stats + gamification
      if (cwLeftSidebar) {
        cwLeftSidebar.innerHTML = BentoGrid._buildCrosswordStatsSidebarHtml(allEntries);
      }

      var progress = (typeof CrosswordSync !== 'undefined') ? CrosswordSync.getAll() : this._getCwProgress();

      // Compute per-level counts for filter buttons
      var levelCounts = {};
      var inProgressTotal = 0;
      allEntries.forEach(function(e) {
        var pKey = e.levelId + '_cw' + e.cwIndex;
        var p = progress[pKey];
        levelCounts[e.levelId] = (levelCounts[e.levelId] || 0);
        if (!levelCounts[e.levelId + '_total']) levelCounts[e.levelId + '_total'] = 0;
        levelCounts[e.levelId + '_total']++;
        if (p && !p.completed && (p.wordsCorrect || p.wordsComplete || 0) > 0) inProgressTotal++;
      });

      // Apply level / in-progress filter
      var activeFilter = levelFilter || null;
      var inProgressFilter = (levelFilter === '__inprogress__');
      var entries;
      if (inProgressFilter) {
        entries = allEntries.filter(function(e) {
          var p = progress[e.levelId + '_cw' + e.cwIndex];
          return p && !p.completed && (p.wordsCorrect || p.wordsComplete || 0) > 0;
        });
        activeFilter = '__inprogress__';
      } else if (activeFilter) {
        entries = allEntries.filter(function(e) { return e.levelId === activeFilter; });
      } else {
        entries = allEntries;
      }

      var PAGE_SIZE = 12;
      var currentPage = (typeof page === 'number' && page >= 0) ? page : 0;
      var totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages - 1);

      // ── Compute summary subtitle counts ──
      var completedTotalAll = 0;
      var inProgressTotalAll = 0;
      allEntries.forEach(function(e) {
        var p = progress[e.levelId + '_cw' + e.cwIndex];
        if (!p) return;
        if (p.completed) completedTotalAll++;
        else if ((p.wordsCorrect || p.wordsComplete || 0) > 0) inProgressTotalAll++;
      });
      var subtitleParts = [allEntries.length + ' crosswords'];
      if (completedTotalAll > 0)   subtitleParts.push(completedTotalAll + ' completed');
      if (inProgressTotalAll > 0)  subtitleParts.push(inProgressTotalAll + ' in progress');
      var subtitleText = subtitleParts.join(' · ');

      // ── Level filter buttons ──
      var availableLevels = [];
      CEFR_ORDER.forEach(function(lvl) {
        if (allEntries.some(function(e) { return e.levelId === lvl; })) availableLevels.push(lvl);
      });

      var filterHtml = '<div class="cw-level-filter">';
      filterHtml += '<button class="cw-filter-btn' + (!activeFilter ? ' cw-filter-btn-active' : '') +
        '" onclick="BentoGrid.openCrosswordList(0)">All</button>';
      availableLevels.forEach(function(lvl) {
        var diff = DIFF_MAP[lvl] || DIFF_MAP['B2'];
        var lvlCount = levelCounts[lvl + '_total'] || 0;
        var isActive = activeFilter === lvl;
        filterHtml += '<button class="cw-filter-btn' + (isActive ? ' cw-filter-btn-active' : '') +
          '" style="' + (isActive ? 'background:' + diff.badgeColor + ';color:#fff;border-color:' + diff.badgeColor : '') + '"' +
          ' onclick="BentoGrid.openCrosswordList(0,\'' + lvl + '\')">' + lvl + ' (' + lvlCount + ')</button>';
      });
      if (inProgressTotalAll > 0) {
        filterHtml += '<button class="cw-filter-btn' + (inProgressFilter ? ' cw-filter-btn-active cw-filter-btn-inprogress' : ' cw-filter-btn-inprogress') + '"' +
          ' onclick="BentoGrid.openCrosswordList(0,\'__inprogress__\')">' +
          _mi('pending') + ' In Progress (' + inProgressTotalAll + ')</button>';
      }
      filterHtml += '</div>';

      // ── Daily challenge banner ──
      var daily = BentoGrid._getDailyCrossword('mix');
      var dailyBannerHtml = '';
      if (daily) {
        var dailyKey = daily.levelId + '_daily_' + daily.date;
        var dailyProgEntry = progress[dailyKey];
        var isDailyDone = dailyProgEntry && dailyProgEntry.completed;
        var isDailyStarted = dailyProgEntry && !isDailyDone && (dailyProgEntry.wordsCorrect || dailyProgEntry.wordsComplete || 0) > 0;
        var dailyPct = 0;
        if (dailyProgEntry && dailyProgEntry.wordsTotal > 0) {
          dailyPct = isDailyDone ? 100 : Math.round(((dailyProgEntry.wordsCorrect || dailyProgEntry.wordsComplete || 0) / dailyProgEntry.wordsTotal) * 100);
        }
        var dailyBtnLabel = isDailyDone ? _mi('check_circle') + ' Completed' : (isDailyStarted ? _mi('play_circle') + ' Continue' : _mi('play_circle') + ' Play Today\'s');
        var dailyBtnClass = 'cw-daily-banner-btn' + (isDailyDone ? ' cw-daily-banner-btn-done' : '');
        dailyBannerHtml =
          '<div class="cw-daily-banner' + (isDailyDone ? ' cw-daily-banner-done' : '') + '">' +
            '<div class="cw-daily-banner-left">' +
              '<div class="cw-daily-banner-icon">📅</div>' +
              '<div class="cw-daily-banner-info">' +
                '<div class="cw-daily-banner-title">Today\'s Daily Crossword</div>' +
                '<div class="cw-daily-banner-sub">' + daily.levelId + ' · ' + daily.date +
                  (isDailyStarted ? ' · ' + dailyPct + '% done' : '') +
                  (isDailyDone ? ' · Solved!' : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<button class="' + dailyBtnClass + '" onclick="BentoGrid.openDailyCrossword()">' + dailyBtnLabel + '</button>' +
          '</div>';
      }

      var headerHtml =
        '<div class="cw-list-header">' +
          '<button class="subpage-back-btn" onclick="loadDashboard()">Back</button>' +
          '<div>' +
            '<div class="subpage-title">' + _mi('grid_on') + ' Crosswords</div>' +
            '<div class="subpage-subtitle">' + subtitleText + '</div>' +
          '</div>' +
        '</div>' +
        dailyBannerHtml +
        filterHtml;

      var cardsHtml = '';
      if (entries.length === 0) {
        cardsHtml = '<div class="fe-map-empty">No crosswords found.</div>';
      } else {
        var pageEntries = entries.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
        cardsHtml = '<div class="cw-list-grid">';
        pageEntries.forEach(function(entry) {
          var num = allEntries.indexOf(entry) + 1;
          var diff = DIFF_MAP[entry.levelId] || DIFF_MAP['B2'];
          var pKey = entry.levelId + '_cw' + entry.cwIndex;
          var prog = progress[pKey];
          var wordsPct = 0;
          var isCompleted = false;
          var isInProgress = false;
          if (prog) {
            isCompleted = !!prog.completed;
            wordsPct = (prog.wordsTotal > 0) ? Math.round(((prog.wordsCorrect || prog.wordsComplete || 0) / prog.wordsTotal) * 100) : 0;
            if (isCompleted) wordsPct = 100;
            else if (wordsPct > 0) isInProgress = true;
          }
          var cardClass = 'cw-list-card ' + diff.cssClass;
          if (isCompleted)   cardClass += ' cw-list-card-done';
          if (isInProgress)  cardClass += ' cw-list-card-inprogress';

          cardsHtml +=
            '<div class="' + cardClass + '" ' +
              'onclick="FastExercises._openMixedCrossword(\'' + entry.levelId + '\',' + entry.cwIndex + ')">' +
              '<div class="cw-list-card-top">' +
                '<span class="cw-list-card-num">#' + num + '</span>' +
                '<span class="cw-list-card-lvl-badge">' + entry.levelId + '</span>' +
              '</div>' +
              '<div class="cw-list-card-title-text">' + entry.levelId + ' Crossword #' + (entry.cwIndex + 1) + '</div>' +
              '<div class="cw-list-card-difficulty">' + diff.label + '</div>' +
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
      var formatLocalDate = (typeof StreakManager !== 'undefined' && StreakManager._formatLocalDate)
        ? function(d) { return StreakManager._formatLocalDate(d); }
        : function(d) {
          var month = String(d.getMonth() + 1).padStart(2, '0');
          var day = String(d.getDate()).padStart(2, '0');
          return d.getFullYear() + '-' + month + '-' + day;
        };

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
        var dateStr = formatLocalDate(d);
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
        : (typeof StreakManager !== 'undefined' && StreakManager.isAtRisk && StreakManager.isAtRisk()
          ? '<div class="bento-streak-modal-status bento-streak-risk"><span class="material-symbols-outlined">warning</span> ' + 'Practice now to keep your streak!' + '</div>'
          : '<div class="bento-streak-modal-status">' + 'Start today\'s practice to build your streak' + '</div>');

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
