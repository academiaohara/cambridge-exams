// js/bento-grid.js
// Premium Bento Grid dashboard sections rendered above the exam list

(function() {
  window.BentoGrid = {
    render: function(container) {
      if (!container) return;
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];

      // Find the last in-progress exam/part for "Next Lesson" card
      var nextLesson = this._findNextLesson(exams);

      var html = '<div class="bento-grid">';

      // Row 1: Hero greeting + streak
      html += this._renderHeroRow(streak, level, exams);

      // Row 2: Study mode cards
      html += this._renderStudyModes();

      // Row 3: Next lesson (if any)
      if (nextLesson) {
        html += this._renderNextLesson(nextLesson);
      }

      html += '</div>';
      container.innerHTML = html;
    },

    _renderHeroRow: function(streak, level, exams) {
      var userName = this._getUserName();
      var completedCount = 0;
      var totalCount = 0;
      exams.forEach(function(exam) {
        if (exam.status !== 'available') return;
        ['reading', 'listening', 'writing', 'speaking'].forEach(function(s) {
          var sec = exam.sections && exam.sections[s];
          if (!sec) return;
          totalCount += sec.total || 0;
          completedCount += (sec.completed || []).length;
        });
      });
      var pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var streakBest = streak ? (streak.longestStreak || 0) : 0;
      var practicedToday = streak ? streak.practicedToday : false;
      var atRisk = (typeof StreakManager !== 'undefined') ? StreakManager.isAtRisk() : false;

      var streakStatus = practicedToday
        ? '<span class="bento-streak-status bento-streak-safe">✅ Streak safe</span>'
        : (atRisk
          ? '<span class="bento-streak-status bento-streak-risk">⚠️ Streak at risk!</span>'
          : '<span class="bento-streak-status">Start today\'s practice</span>');

      return '<div class="bento-hero-row">' +
        '<div class="bento-card bento-hero">' +
          '<div class="bento-hero-greeting">👋 ' + (userName ? 'Hello, <strong>' + this._escapeHTML(userName) + '</strong>!' : 'Welcome back!') + '</div>' +
          '<div class="bento-hero-level">Level: <span class="bento-level-badge">' + level + '</span></div>' +
          '<div class="bento-hero-progress">' +
            '<div class="bento-progress-label">' + completedCount + ' / ' + totalCount + ' parts completed</div>' +
            '<div class="bento-progress-track">' +
              '<div class="bento-progress-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<div class="bento-progress-pct">' + pct + '%</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-streak-card" data-streak-widget="1">' +
          '<div class="bento-streak-fire">🔥</div>' +
          '<div class="bento-streak-number">' + streakCount + '</div>' +
          '<div class="bento-streak-label">day streak</div>' +
          streakStatus +
          '<div class="bento-streak-best">Best: ' + streakBest + ' days</div>' +
        '</div>' +
      '</div>';
    },

    _renderStudyModes: function() {
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var availableCount = exams.filter(function(e) { return e.status === 'available'; }).length;

      // Exam mode attempts display (global daily limit — null key = '__global__')
      var examAttempts = '';
      if (typeof ExamSession !== 'undefined') {
        var remaining = ExamSession.getRemaining(null);
        var used = ExamSession.getAttempts(null);
        examAttempts = '<div class="bento-attempts">' +
          '<span class="bento-attempts-used">' + used + '</span>' +
          '<span class="bento-attempts-sep">/</span>' +
          '<span class="bento-attempts-max">5</span>' +
          '<span class="bento-attempts-label"> attempts today</span>' +
          (remaining === 0 ? '<span class="bento-attempts-exhausted">Locked 🔒</span>' : '') +
        '</div>';
      }

      var currentMode = AppState.currentMode || 'practice';

      return '<div class="bento-modes-row">' +

        '<div class="bento-card bento-mode-arena ' + (currentMode === 'exam' ? 'bento-mode-active' : '') + '" ' +
          'onclick="BentoGrid.selectMode(\'exam\')">' +
          '<div class="bento-mode-icon">⏱️</div>' +
          '<div class="bento-mode-title">The Arena</div>' +
          '<div class="bento-mode-desc">Full exam mode. Timed.</div>' +
          examAttempts +
          '<div class="bento-mode-tests">' + availableCount + ' tests available</div>' +
        '</div>' +

        '<div class="bento-card bento-mode-micro" onclick="BentoGrid.openMicroLearning()">' +
          '<div class="bento-mode-icon">📱</div>' +
          '<div class="bento-mode-title">Micro-Learning</div>' +
          '<div class="bento-mode-desc">Quick cards. Scroll style.</div>' +
          '<div class="bento-mode-tests">Vocab · Transformations · MC</div>' +
        '</div>' +

        '<div class="bento-card bento-mode-practice ' + (currentMode === 'practice' ? 'bento-mode-active' : '') + '" ' +
          'onclick="BentoGrid.selectMode(\'practice\')">' +
          '<div class="bento-mode-icon">🛡️</div>' +
          '<div class="bento-mode-title">Practice</div>' +
          '<div class="bento-mode-desc">No limits. Safe space.</div>' +
          '<div class="bento-mode-tests">' + availableCount + ' tests available</div>' +
        '</div>' +

      '</div>';
    },

    _renderNextLesson: function(lesson) {
      var completedParts = lesson.completedParts || 0;
      var totalParts = lesson.totalParts || 1;
      var pct = Math.round((completedParts / totalParts) * 100);
      var sectionIcon = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' };
      var icon = sectionIcon[lesson.section] || '📚';

      return '<div class="bento-next-row">' +
        '<div class="bento-card bento-next-lesson">' +
          '<div class="bento-next-badge">📌 Next Up</div>' +
          '<div class="bento-next-header">' +
            '<span class="bento-next-icon">' + icon + '</span>' +
            '<div>' +
              '<div class="bento-next-title">' + lesson.examId + ' — ' + this._capitalize(lesson.section) + '</div>' +
              '<div class="bento-next-part">Part ' + lesson.part + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="bento-next-progress">' +
            '<div class="bento-progress-track">' +
              '<div class="bento-progress-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="bento-next-progress-text">' + completedParts + '/' + totalParts + ' parts</span>' +
          '</div>' +
          '<button class="bento-resume-btn" onclick="Exercise.openPart(\'' + lesson.examId + '\', \'' + lesson.section + '\', ' + lesson.part + ')">' +
            '▶ Resume' +
          '</button>' +
        '</div>' +
      '</div>';
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
      if (typeof Dashboard !== 'undefined' && Dashboard.setMode) {
        Dashboard.setMode(mode);
      }
    },

    openMicroLearning: function() {
      if (typeof MicroLearning !== 'undefined') {
        MicroLearning.open();
      }
    }
  };
})();
