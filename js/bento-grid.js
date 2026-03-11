// js/bento-grid.js
// Premium Bento Grid dashboard sections rendered above the exam list

(function() {
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
      var availableCount = exams.filter(function(e) { return e.status === 'available'; }).length;
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };

      // Exam session attempts
      var examAttempts = '';
      if (typeof ExamSession !== 'undefined') {
        var remaining = ExamSession.getRemaining(null);
        var used = ExamSession.getAttempts(null);
        examAttempts = '<div class="bento-attempts">' +
          '<span class="bento-attempts-used">' + used + '</span>' +
          '<span class="bento-attempts-sep">/</span>' +
          '<span class="bento-attempts-max">5</span>' +
          '<span class="bento-attempts-label"> ' + t('todayLabel', 'today') + '</span>' +
          (remaining === 0 ? '<div class="bento-attempts-exhausted">' + t('lockedLabel', 'Locked') + ' 🔒</div>' : '') +
        '</div>';
      }

      return '<div class="bento-top-row">' +

        '<div class="bento-card bento-card-summit" onclick="BentoGrid.selectMode(\'exam\')">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Summit</div>' +
            '<div class="bento-card-desc">' + t('timedExamMode', 'Timed exam mode') + '</div>' +
            examAttempts +
            '<div class="bento-card-extra">' + availableCount + ' ' + t('testsCount', 'tests') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-card-ascent" onclick="BentoGrid.selectMode(\'practice\')">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Ascent</div>' +
            '<div class="bento-card-desc">' + t('noLimitsSafeSpace', 'No limits. Safe space.') + '</div>' +
            '<div class="bento-card-extra">' + availableCount + ' ' + t('testsCount', 'tests') + '</div>' +
          '</div>' +
        '</div>' +

      '</div>';
    },

    _renderLearningRow: function() {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      return '<div class="bento-learning-row">' +

        '<div class="bento-card bento-card-quicksteps" onclick="BentoGrid.openMicroLearning()">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Quicksteps</div>' +
            '<div class="bento-card-desc">' + t('quickCards', 'Quick cards. Scroll style.') + '</div>' +
            '<div class="bento-card-extra">' + t('vocabTransformations', 'Vocab · Transformations · MC') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-card-basecamp" onclick="BentoGrid.openLessons()">' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Basecamp</div>' +
            '<div class="bento-card-desc">' + t('studyCurriculum', 'Study the curriculum at your own pace') + '</div>' +
            '<div class="bento-card-extra">' + t('comingSoon', 'Coming Soon') + '</div>' +
          '</div>' +
        '</div>' +

      '</div>';
    },

    _renderRecommendedExercise: function(exams) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
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
            '<div class="bento-card-desc">' + t('completeForRecommendations', 'Complete some exercises to get personalised recommendations!') + '</div>' +
          '</div>' +
        '</div>';
      }

      var scoreHtml = weak.ratio !== null
        ? ' · ' + Math.round(weak.ratio * 100) + '%'
        : '';

      return '<div class="bento-card bento-card-weakspot" onclick="Exercise.openPart(\'' + this._escapeHTML(weak.examId) + '\', \'' + weak.section + '\', ' + (weak.part || 1) + ')">' +
        '<div class="bento-card-inner">' +
          '<div class="bento-card-title">Weak Spot</div>' +
          '<div class="bento-card-desc">' + this._escapeHTML(weak.examId) + ' — ' + this._capitalize(weak.section) + (weak.part ? ' ' + t('part', 'Part') + ' ' + weak.part : '') + scoreHtml + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderGradeTracker: function(exams) {
      if (typeof ScoreCalculator === 'undefined') return '';
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };

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

      var skillNames = Object.keys(skillTotals);

      if (skillNames.length === 0) {
        return '<div class="bento-grade-row">' +
          '<div class="bento-card bento-grade-tracker">' +
            '<div class="bento-grade-title">📊 ' + t('gradeTracker', 'Grade Tracker') + '</div>' +
            '<div class="bento-grade-empty">' + t('completeForPerformance', 'Complete exercises to see your performance here!') + '</div>' +
          '</div>' +
        '</div>';
      }

      var levelData = AppState.currentLevel || 'C1';
      var scaleBounds = { A2: [82, 140], B1: [102, 160], B2: [122, 180], C1: [142, 200], C2: [162, 220] };
      var bounds = scaleBounds[levelData] || [142, 200];
      var scaleMin = bounds[0];
      var scaleMax = bounds[1];

      var skillColors = {
        'Reading': '#3b82f6',
        'Use of English': '#8b5cf6',
        'Writing': '#10b981',
        'Listening': '#f59e0b',
        'Speaking': '#ef4444'
      };

      var barsHtml = '';
      skillNames.forEach(function(skill) {
        var d = skillTotals[skill];
        var avgScale = d.count > 0 ? Math.round(d.scale / d.count) : scaleMin;
        var pct = Math.round(((avgScale - scaleMin) / (scaleMax - scaleMin)) * 100);
        pct = Math.max(2, Math.min(100, pct));
        var color = skillColors[skill] || '#3b82f6';
        barsHtml +=
          '<div class="bento-grade-bar-row">' +
            '<div class="bento-grade-skill">' + skill + '</div>' +
            '<div class="bento-grade-track">' +
              '<div class="bento-grade-fill" style="width:' + pct + '%;background:' + color + '"></div>' +
            '</div>' +
            '<div class="bento-grade-score">' + avgScale + '</div>' +
          '</div>';
      });

      return '<div class="bento-grade-row">' +
        '<div class="bento-card bento-grade-tracker">' +
          '<div class="bento-grade-header">' +
            '<div class="bento-grade-title">📊 ' + t('gradeTracker', 'Grade Tracker') + '</div>' +
            '<div class="bento-grade-subtitle">' + t('avgAcross', 'Avg. across') + ' ' + examCount + ' ' + t('examsLabel', 'exams') + ' · ' + t('scaleLabel', 'Scale') + ' ' + scaleMin + '–' + scaleMax + '</div>' +
          '</div>' +
          '<div class="bento-grade-bars">' + barsHtml + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderNextLesson: function(lesson) {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var completedParts = lesson.completedParts || 0;
      var totalParts = lesson.totalParts || 1;
      var sectionIcon = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' };
      var icon = sectionIcon[lesson.section] || '📚';

      return '<div class="bento-card bento-card-checkpoint" onclick="Exercise.openPart(\'' + this._escapeHTML(lesson.examId) + '\', \'' + lesson.section + '\', ' + lesson.part + ')">' +
        '<div class="bento-card-inner">' +
          '<div class="bento-card-title">Checkpoint</div>' +
          '<div class="bento-card-desc">' + icon + ' ' + this._escapeHTML(lesson.examId) + ' — ' + this._capitalize(lesson.section) + ' ' + t('part', 'Part') + ' ' + lesson.part + ' (' + completedParts + '/' + totalParts + ')</div>' +
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
        history.pushState({ view: 'subpage', mode: mode }, '');
        Dashboard.renderSubpage(mode);
      } else if (typeof Dashboard !== 'undefined' && Dashboard.setMode) {
        Dashboard.setMode(mode);
      }
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) {
        App.updateHeaderModeButtons();
      }
    },

    openMicroLearning: function() {
      if (typeof MicroLearning !== 'undefined') {
        MicroLearning.open();
      }
    },

    openLessons: function() {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var el = document.createElement('div');
      el.className = 'bento-generic-modal-overlay';
      el.innerHTML =
        '<div class="bento-generic-modal">' +
          '<button class="bento-generic-modal-close" onclick="this.closest(\'.bento-generic-modal-overlay\').remove()">✕</button>' +
          '<div class="bento-generic-modal-icon">📚</div>' +
          '<div class="bento-generic-modal-title">' + t('lessonsCurriculum', 'Lessons &amp; Curriculum') + '</div>' +
          '<div class="bento-generic-modal-text">' + t('lessonsComingDesc', 'The structured curriculum section is on its way! For now, practise with the exam sections below.') + '</div>' +
          '<button class="bento-generic-modal-btn" onclick="this.closest(\'.bento-generic-modal-overlay\').remove()">' + t('gotIt', 'Got it') + '</button>' +
        '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function(e) { if (e.target === el) el.remove(); });
    },

    _buildStreakSidebarHtml: function() {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      return '<div class="sidebar-widget-pastel sw-streak" onclick="BentoGrid.openStreakSection()" style="cursor:pointer">' +
        '<div class="sidebar-widget-pastel-title">' + t('dayStreak', 'Day Streak') + '</div>' +
        '<div class="sw-streak-flame"><i class="fas fa-fire"></i></div>' +
        '<div class="sw-streak-count">' + streakCount + '</div>' +
      '</div>';
    },

    _buildCalendarSidebarHtml: function() {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var lastActivityDate = streak ? streak.lastActivityDate : null;
      var locale = (typeof AppState !== 'undefined' && AppState.currentLanguage) ? AppState.currentLanguage : 'es';

      // Compute trained dates from current streak window
      var trainedDates = {};
      if (lastActivityDate && streakCount > 0) {
        var lastDate = new Date(lastActivityDate);
        for (var s = 0; s < streakCount; s++) {
          var td = new Date(lastDate);
          td.setDate(lastDate.getDate() - s);
          trainedDates[td.toISOString().slice(0, 10)] = true;
        }
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
        var cls = 'sw-calendar-day';
        if (isTrained) cls += ' trained';
        if (isToday) cls += ' today';
        daysCells += '<div class="' + cls + '">' + i + (isTrained ? '<span class="sw-cal-footstep">&#x1F43E;</span>' : '') + '</div>';
      }

      return '<div class="sidebar-widget-pastel sw-calendar" onclick="BentoGrid.openStreakSection()" style="cursor:pointer">' +
        '<div class="sidebar-widget-pastel-title">' + t('calendar', 'Calendar') + '</div>' +
        '<div class="sw-calendar-month-label">' + monthLabel + '</div>' +
        '<div class="sw-calendar-grid">' + headerHtml + emptyCells + daysCells + '</div>' +
      '</div>';
    },

    _buildLevelSelectorSidebarHtml: function() {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var currentLevel = AppState.currentLevel || 'C1';
      var levels = [
        { code: 'A2', icon: 'fas fa-seedling', label: 'A2 Key' },
        { code: 'B1', icon: 'fas fa-book-reader', label: 'B1 Preliminary' },
        { code: 'B2', icon: 'fas fa-graduation-cap', label: 'B2 First' },
        { code: 'C1', icon: 'fas fa-award', label: 'C1 Advanced' },
        { code: 'C2', icon: 'fas fa-crown', label: 'C2 Proficiency' }
      ];

      var exams = window.EXAMS_DATA[currentLevel] || [];

      // "YOU ARE STUDYING" header + level badge
      var html = '<div class="sidebar-widget" style="background:transparent;box-shadow:none;border:none;padding:0;">' +
        '<div style="font-size:0.78rem;font-weight:700;color:#5a7a9a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">' + t('youAreStudying', 'You are studying') + '</div>' +
        '<div class="sidebar-level-badge" onclick="BentoGrid.toggleLevelDropdown()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();BentoGrid.toggleLevelDropdown()}" role="button" tabindex="0" aria-expanded="false" style="cursor:pointer">' +
          '<div class="sidebar-level-badge-label">' + t('level', 'Level') + '</div>' +
          '<div class="sidebar-level-badge-code">' + currentLevel + '</div>' +
        '</div>';

      // Level dropdown (hidden by default)
      var optionsHtml = '';
      levels.forEach(function(l) {
        if (l.code === currentLevel) return;
        optionsHtml += '<button class="level-selector-option" ' +
          'data-level="' + l.code + '" onclick="event.stopPropagation(); BentoGrid.changeLevel(\'' + l.code + '\')">' +
          '<i class="' + l.icon + '"></i> ' + l.label +
        '</button>';
      });
      html += '<div class="level-selector-options level-selector-collapsed">' + optionsHtml + '</div>';

      // Unit timeline — always show at least 6 units with placeholder lessons
      html += '<div class="sidebar-unit-timeline">';

      var minUnits = 6;
      // Build unit list: use real exams, pad to minUnits with placeholders
      var units = [];
      exams.forEach(function(exam, idx) {
        units.push({
          id: exam.id,
          number: exam.number || (idx + 1),
          sections: exam.sections || {}
        });
      });
      for (var u = units.length + 1; u <= minUnits; u++) {
        units.push({ id: 'placeholder-unit-' + u, number: u, sections: {} });
      }

      // Placeholder lesson names per unit (temporary until Basecamp content is ready)
      var placeholderLessons = [
        'Vocabulary & Collocations',
        'Grammar Focus',
        'Practice & Review'
      ];

      units.forEach(function(unit) {
        var sections = unit.sections;
        var hasCompleted = false;
        var hasInProgress = false;
        ['reading', 'listening', 'writing', 'speaking'].forEach(function(sec) {
          if (sections[sec]) {
            if (sections[sec].completed && sections[sec].completed.length > 0) hasCompleted = true;
            if (sections[sec].inProgress && sections[sec].inProgress.length > 0) hasInProgress = true;
          }
        });

        var dotClass = hasCompleted ? 'unit-completed' : (hasInProgress ? 'unit-open' : '');
        html += '<div class="sidebar-unit-item" data-exam-id="' + unit.id + '" onclick="BentoGrid._toggleUnit(this)">' +
          '<div class="sidebar-unit-dot ' + dotClass + '"></div>' +
          '<div class="sidebar-unit-label">' + t('unit', 'Unit') + ' ' + unit.number + '</div>';

        // Expandable lessons section (always present, hidden by default)
        html += '<div class="sidebar-unit-lessons" style="display:none">';
        placeholderLessons.forEach(function(lessonName) {
          html += '<div class="sidebar-lesson-item" tabindex="0" onclick="event.stopPropagation(); Dashboard.renderSubpage(\'practice\')" onkeydown="if(event.key===\'Enter\'){event.stopPropagation(); Dashboard.renderSubpage(\'practice\')}">' +
            '<i class="fas fa-circle"></i>' + lessonName +
          '</div>';
        });
        html += '</div>';

        html += '</div>';
      });
      html += '</div>';

      html += '</div>';
      return html;
    },

    toggleLevelDropdown: function() {
      var options = document.querySelector('.level-selector-options');
      var badge = document.querySelector('.sidebar-level-badge');
      if (!options) return;
      var isCollapsed = options.classList.contains('level-selector-collapsed');
      if (isCollapsed) {
        options.classList.remove('level-selector-collapsed');
        options.classList.add('level-selector-expanded');
        if (badge) badge.setAttribute('aria-expanded', 'true');
      } else {
        options.classList.add('level-selector-collapsed');
        options.classList.remove('level-selector-expanded');
        if (badge) badge.setAttribute('aria-expanded', 'false');
      }
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
      var options = document.querySelector('.level-selector-options');
      if (options) {
        options.classList.add('level-selector-collapsed');
        options.classList.remove('level-selector-expanded');
      }
      if (typeof filterByLevel === 'function') {
        filterByLevel(level);
      } else if (typeof Dashboard !== 'undefined' && Dashboard.filterByLevel) {
        Dashboard.filterByLevel(level);
      }
    },

    _buildMicroLearningSidebarHtml: function() {
      return '<div class="sidebar-widget" onclick="BentoGrid.openMicroLearning()" style="cursor:pointer">' +
        '<div class="sidebar-widget-title">📱 ' + (typeof I18n !== 'undefined' ? I18n.t('microLearning') : 'Micro-Learning') + '</div>' +
        '<div style="color:#64748b;font-size:0.85rem;margin-bottom:12px;">' + (typeof I18n !== 'undefined' ? I18n.t('vocabTransformations') : 'Vocab · Transformations · MC') + '</div>' +
        '<button class="bento-resume-btn" style="width:100%;justify-content:center;" onclick="event.stopPropagation();BentoGrid.openMicroLearning()">' + (typeof I18n !== 'undefined' ? I18n.t('startArrow') : 'Start →') + '</button>' +
      '</div>';
    },

    _buildCalculatorSidebarHtml: function() {
      if (typeof ScoreCalculator === 'undefined') return '';
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      return '<div class="sidebar-widget-pastel sw-calculator" onclick="openScoreCalculator()">' +
        '<div class="sidebar-widget-pastel-title">' + t('scoreCalculator', 'Calculator') + '</div>' +
      '</div>';
    },

    _buildGradeTrackerSidebarHtml: function(exams) {
      if (typeof ScoreCalculator === 'undefined') return '';
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
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
      var skillNames = Object.keys(skillTotals);

      // CEFR level from scale score
      function getCefrFromScale(scale) {
        if (scale >= 200) return 'C2';
        if (scale >= 180) return 'C1';
        if (scale >= 160) return 'B2';
        if (scale >= 140) return 'B1';
        if (scale >= 120) return 'A2';
        if (scale >= 100) return 'A1';
        return '—';
      }

      if (skillNames.length === 0) {
        return '<div class="sidebar-widget-pastel sw-grade">' +
          '<div class="sidebar-widget-pastel-title">' + t('gradeTracker', 'Grade Tracker') + '</div>' +
          '<div style="text-align:center;font-size:0.85rem;opacity:0.8;">' + t('completeForPerformance', 'Complete exercises to see your performance here!') + '</div>' +
        '</div>';
      }

      // Show first skill as featured slide (carousel kept internally)
      var firstSkill = skillNames[0];
      var d = skillTotals[firstSkill];
      var avgRaw = d.count > 0 ? Math.round(d.raw / d.count) : 0;
      var avgScale = d.count > 0 ? Math.round(d.scale / d.count) : 0;
      var cefr = getCefrFromScale(avgScale);

      var slidesHtml = '';
      skillNames.forEach(function(skill, idx) {
        var sd = skillTotals[skill];
        var sRaw = sd.count > 0 ? Math.round(sd.raw / sd.count) : 0;
        var sScale = sd.count > 0 ? Math.round(sd.scale / sd.count) : 0;
        var sCefr = getCefrFromScale(sScale);
        slidesHtml +=
          '<div class="grade-carousel-slide" data-slide="' + idx + '" style="display:' + (idx === 0 ? 'flex' : 'none') + '">' +
            '<div class="sw-grade-raw">' + sRaw + '</div>' +
            '<div class="sw-grade-cefr">' + sCefr + '</div>' +
            '<div class="sw-grade-skill">' + skill + '</div>' +
          '</div>';
      });

      return '<div class="sidebar-widget-pastel sw-grade grade-tracker-carousel-widget" data-total-slides="' + skillNames.length + '">' +
        '<div class="sidebar-widget-pastel-title">' + t('gradeTracker', 'Grade Tracker') + '</div>' +
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
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var completedParts = lesson.completedParts || 0;
      var totalParts = lesson.totalParts || 1;
      var sectionIcon = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' };
      var icon = sectionIcon[lesson.section] || '📚';
      var self = this;
      return '<div class="sidebar-widget" onclick="Exercise.openPart(\'' + self._escapeHTML(lesson.examId) + '\', \'' + lesson.section + '\', ' + lesson.part + ')" style="cursor:pointer">' +
        '<div class="sidebar-widget-title">📌 ' + t('nextUp', 'Next Up') + '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
          '<span style="font-size:1.5rem;">' + icon + '</span>' +
          '<div>' +
            '<div style="font-weight:700;font-size:0.9rem;color:#0f172a;">' + self._escapeHTML(lesson.examId) + ' — ' + self._capitalize(lesson.section) + '</div>' +
            '<div style="color:#64748b;font-size:0.8rem;">' + t('part', 'Part') + ' ' + lesson.part + ' (' + completedParts + '/' + totalParts + ')</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    openStreakSection: function() {
      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var streakBest = streak ? (streak.longestStreak || 0) : 0;
      var totalDays = streak ? (streak.totalDaysActive || 0) : 0;
      var practicedToday = streak ? streak.practicedToday : false;
      var lastActivity = streak ? streak.lastActivityDate : null;

      // Build last 28-day calendar approximation based on current streak
      var today = new Date();
      var calDays = [];
      var lastDate = lastActivity ? new Date(lastActivity) : null;
      var firstStreakDate = null;
      if (lastDate && streakCount > 0) {
        firstStreakDate = new Date(lastDate);
        firstStreakDate.setDate(lastDate.getDate() - (streakCount - 1));
      }
      for (var i = 27; i >= 0; i--) {
        var d = new Date(today);
        d.setDate(today.getDate() - i);
        var dateStr = d.toISOString().slice(0, 10);
        var isActive = !!(firstStreakDate && lastDate && d >= firstStreakDate && d <= lastDate);
        calDays.push({ date: dateStr, active: isActive });
      }

      var calHtml = '<div class="bento-cal-grid">';
      calDays.forEach(function(day) {
        calHtml += '<div class="bento-cal-day' + (day.active ? ' bento-cal-active' : '') + '" title="' + day.date + '"></div>';
      });
      calHtml += '</div>';

      var statusHtml = practicedToday
        ? '<div class="bento-streak-modal-status bento-streak-safe">✅ ' + t('streakSafeToday', 'Streak safe today!') + '</div>'
        : (StreakManager && StreakManager.isAtRisk()
          ? '<div class="bento-streak-modal-status bento-streak-risk">⚠️ ' + t('practiceNowStreak', 'Practice now to keep your streak!') + '</div>'
          : '<div class="bento-streak-modal-status">' + t('startTodayStreak', 'Start today\'s practice to build your streak') + '</div>');

      var el = document.createElement('div');
      el.className = 'bento-streak-modal-overlay';
      el.innerHTML =
        '<div class="bento-streak-modal">' +
          '<button class="bento-streak-modal-close" onclick="this.closest(\'.bento-streak-modal-overlay\').remove()">✕</button>' +
          '<div class="bento-streak-modal-fire">🔥</div>' +
          '<div class="bento-streak-modal-count">' + streakCount + '</div>' +
          '<div class="bento-streak-modal-label">' + t('dayStreakLower', 'day streak') + '</div>' +
          statusHtml +
          '<div class="bento-streak-modal-stats">' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + streakBest + '</div><div class="bento-streak-stat-lbl">' + t('bestStreak', 'Best') + '</div></div>' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + totalDays + '</div><div class="bento-streak-stat-lbl">' + t('totalDaysLabel', 'Total Days') + '</div></div>' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + (practicedToday ? '✅' : '❌') + '</div><div class="bento-streak-stat-lbl">' + t('todayLabel', 'Today') + '</div></div>' +
          '</div>' +
          '<div class="bento-streak-modal-section">' + t('last28Days', 'Last 28 days') + '</div>' +
          calHtml +
        '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function(e) { if (e.target === el) el.remove(); });
    }
  };
})();
