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
      var currentMode = AppState.currentMode || 'practice';

      // Exam session attempts
      var examAttempts = '';
      if (typeof ExamSession !== 'undefined') {
        var remaining = ExamSession.getRemaining(null);
        var used = ExamSession.getAttempts(null);
        examAttempts = '<div class="bento-attempts">' +
          '<span class="bento-attempts-used">' + used + '</span>' +
          '<span class="bento-attempts-sep">/</span>' +
          '<span class="bento-attempts-max">5</span>' +
          '<span class="bento-attempts-label"> today</span>' +
          (remaining === 0 ? '<div class="bento-attempts-exhausted">Locked 🔒</div>' : '') +
        '</div>';
      }

      return '<div class="bento-top-row">' +

        '<div class="bento-card bento-mode-arena ' + (currentMode === 'exam' ? 'bento-mode-active' : '') + '" ' +
          'onclick="BentoGrid.selectMode(\'exam\')">' +
          '<div class="bento-mode-icon">⏱️</div>' +
          '<div class="bento-mode-title">The Arena</div>' +
          '<div class="bento-mode-desc">Timed exam mode</div>' +
          examAttempts +
          '<div class="bento-mode-tests">' + availableCount + ' tests</div>' +
        '</div>' +

        '<div class="bento-card bento-mode-practice ' + (currentMode === 'practice' ? 'bento-mode-active' : '') + '" ' +
          'onclick="BentoGrid.selectMode(\'practice\')">' +
          '<div class="bento-mode-icon">🛡️</div>' +
          '<div class="bento-mode-title">Practice</div>' +
          '<div class="bento-mode-desc">No limits. Safe space.</div>' +
          '<div class="bento-mode-tests">' + availableCount + ' tests</div>' +
        '</div>' +

      '</div>';
    },

    _renderLearningRow: function() {
      return '<div class="bento-learning-row">' +

        '<div class="bento-card bento-lessons-card" onclick="BentoGrid.openLessons()">' +
          '<div class="bento-mode-icon">📚</div>' +
          '<div class="bento-mode-title">Lessons</div>' +
          '<div class="bento-mode-desc">Study the curriculum at your own pace</div>' +
          '<div class="bento-lessons-badge">Coming Soon</div>' +
        '</div>' +

        '<div class="bento-card bento-mode-micro" onclick="BentoGrid.openMicroLearning()">' +
          '<div class="bento-mode-icon">📱</div>' +
          '<div class="bento-mode-title">Micro-Learning</div>' +
          '<div class="bento-mode-desc">Quick cards. Scroll style.</div>' +
          '<div class="bento-mode-tests">Vocab · Transformations · MC</div>' +
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
        return '<div class="bento-recommended-row">' +
          '<div class="bento-card bento-recommended">' +
            '<div class="bento-recommended-label">🎯 Recommended Exercise</div>' +
            '<div class="bento-recommended-empty">Complete some exercises to get personalised recommendations!</div>' +
          '</div>' +
        '</div>';
      }

      var sectionIcon = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' };
      var icon = sectionIcon[weak.section] || '📚';
      var scoreHtml = weak.ratio !== null
        ? '<div class="bento-rec-score">Your score: ' + Math.round(weak.ratio * 100) + '%</div>'
        : '';
      var whyHtml = weak.ratio !== null
        ? '<div class="bento-rec-why">Weakest area — keep practising!</div>'
        : '';

      return '<div class="bento-recommended-row">' +
        '<div class="bento-card bento-recommended">' +
          '<div class="bento-recommended-header">' +
            '<div class="bento-recommended-label">🎯 Recommended Exercise</div>' +
            whyHtml +
          '</div>' +
          '<div class="bento-recommended-body">' +
            '<span class="bento-rec-icon">' + icon + '</span>' +
            '<div class="bento-rec-info">' +
              '<div class="bento-rec-title">' + this._escapeHTML(weak.examId) + ' — ' + this._capitalize(weak.section) + (weak.part ? ' Part ' + weak.part : '') + '</div>' +
              scoreHtml +
            '</div>' +
            '<button class="bento-rec-btn" onclick="Exercise.openPart(\'' + this._escapeHTML(weak.examId) + '\', \'' + weak.section + '\', ' + (weak.part || 1) + ')">Start →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    _renderGradeTracker: function(exams) {
      if (typeof ScoreCalculator === 'undefined') return '';

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
            '<div class="bento-grade-title">📊 Grade Tracker</div>' +
            '<div class="bento-grade-empty">Complete exercises to see your performance here!</div>' +
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
            '<div class="bento-grade-title">📊 Grade Tracker</div>' +
            '<div class="bento-grade-subtitle">Avg. across ' + examCount + ' exam' + (examCount !== 1 ? 's' : '') + ' · Scale ' + scaleMin + '–' + scaleMax + '</div>' +
          '</div>' +
          '<div class="bento-grade-bars">' + barsHtml + '</div>' +
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
              '<div class="bento-next-title">' + this._escapeHTML(lesson.examId) + ' — ' + this._capitalize(lesson.section) + '</div>' +
              '<div class="bento-next-part">Part ' + lesson.part + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="bento-next-progress">' +
            '<div class="bento-progress-track">' +
              '<div class="bento-progress-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="bento-next-progress-text">' + completedParts + '/' + totalParts + ' parts</span>' +
          '</div>' +
          '<button class="bento-resume-btn" onclick="Exercise.openPart(\'' + this._escapeHTML(lesson.examId) + '\', \'' + lesson.section + '\', ' + lesson.part + ')">' +
            '▶ Resume' +
          '</button>' +
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
    },

    openMicroLearning: function() {
      if (typeof MicroLearning !== 'undefined') {
        MicroLearning.open();
      }
    },

    openLessons: function() {
      var el = document.createElement('div');
      el.className = 'bento-generic-modal-overlay';
      el.innerHTML =
        '<div class="bento-generic-modal">' +
          '<button class="bento-generic-modal-close" onclick="this.closest(\'.bento-generic-modal-overlay\').remove()">✕</button>' +
          '<div class="bento-generic-modal-icon">📚</div>' +
          '<div class="bento-generic-modal-title">Lessons &amp; Curriculum</div>' +
          '<div class="bento-generic-modal-text">The structured curriculum section is on its way! For now, practise with the exam sections below.</div>' +
          '<button class="bento-generic-modal-btn" onclick="this.closest(\'.bento-generic-modal-overlay\').remove()">Got it</button>' +
        '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function(e) { if (e.target === el) el.remove(); });
    },

    _buildStreakSidebarHtml: function() {
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var streakBest = streak ? (streak.longestStreak || 0) : 0;
      var practicedToday = streak ? streak.practicedToday : false;
      var atRisk = (typeof StreakManager !== 'undefined') ? StreakManager.isAtRisk() : false;
      var statusHtml = practicedToday
        ? '<div style="color:#10b981;font-size:0.8rem;font-weight:700;margin-top:4px;">✅ Streak safe!</div>'
        : (atRisk
          ? '<div style="color:#f59e0b;font-size:0.8rem;font-weight:700;margin-top:4px;">⚠️ At risk!</div>'
          : '<div style="color:#64748b;font-size:0.8rem;margin-top:4px;">Practice today</div>');
      return '<div class="sidebar-widget" onclick="BentoGrid.openStreakSection()" style="cursor:pointer">' +
        '<div class="sidebar-widget-title">🔥 Day Streak</div>' +
        '<div style="text-align:center;padding:4px 0;">' +
          '<div style="font-size:2.2rem;font-weight:800;color:#f59e0b;">' + streakCount + '</div>' +
          '<div style="color:#64748b;font-size:0.8rem;">day streak</div>' +
          statusHtml +
          '<div style="color:#94a3b8;font-size:0.75rem;margin-top:6px;">Best: ' + streakBest + ' days</div>' +
        '</div>' +
      '</div>';
    },

    _buildLevelSelectorSidebarHtml: function() {
      var currentLevel = AppState.currentLevel || 'C1';
      var levels = [
        { code: 'A2', icon: 'fas fa-seedling', label: 'A2 Key' },
        { code: 'B1', icon: 'fas fa-book-reader', label: 'B1 Preliminary' },
        { code: 'B2', icon: 'fas fa-graduation-cap', label: 'B2 First' },
        { code: 'C1', icon: 'fas fa-award', label: 'C1 Advanced' },
        { code: 'C2', icon: 'fas fa-crown', label: 'C2 Proficiency' }
      ];
      var current = levels.find(function(l) { return l.code === currentLevel; }) || levels[3];
      var optionsHtml = '';
      levels.forEach(function(l) {
        if (l.code === currentLevel) return;
        optionsHtml += '<button class="level-selector-option" ' +
          'data-level="' + l.code + '" onclick="event.stopPropagation(); BentoGrid.changeLevel(\'' + l.code + '\')">' +
          '<i class="' + l.icon + '"></i> ' + l.label +
        '</button>';
      });
      return '<div class="sidebar-widget level-selector-widget">' +
        '<div class="level-selector-current" onclick="BentoGrid.toggleLevelDropdown()" role="button" tabindex="0" aria-expanded="false">' +
          '<i class="' + current.icon + ' level-selector-current-icon"></i>' +
          '<div class="level-selector-current-info">' +
            '<div class="level-selector-current-code">' + current.code + '</div>' +
            '<div class="level-selector-current-label">' + current.label + '</div>' +
          '</div>' +
          '<div class="level-selector-chevron"><i class="fas fa-chevron-down"></i></div>' +
        '</div>' +
        '<div class="level-selector-hint">Tap to change level</div>' +
        '<div class="level-selector-options level-selector-collapsed">' + optionsHtml + '</div>' +
      '</div>';
    },

    toggleLevelDropdown: function() {
      var options = document.querySelector('.level-selector-options');
      var current = document.querySelector('.level-selector-current');
      if (!options || !current) return;
      var isCollapsed = options.classList.contains('level-selector-collapsed');
      if (isCollapsed) {
        options.classList.remove('level-selector-collapsed');
        options.classList.add('level-selector-expanded');
        current.setAttribute('aria-expanded', 'true');
      } else {
        options.classList.add('level-selector-collapsed');
        options.classList.remove('level-selector-expanded');
        current.setAttribute('aria-expanded', 'false');
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
        '<div class="sidebar-widget-title">📱 Micro-Learning</div>' +
        '<div style="color:#64748b;font-size:0.85rem;margin-bottom:12px;">Quick cards · Vocab · Transformations</div>' +
        '<button class="bento-resume-btn" style="width:100%;justify-content:center;" onclick="event.stopPropagation();BentoGrid.openMicroLearning()">Start →</button>' +
      '</div>';
    },

    _buildGradeTrackerSidebarHtml: function(exams) {
      if (typeof ScoreCalculator === 'undefined') return '';
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
        return '<div class="sidebar-widget">' +
          '<div class="sidebar-widget-title">📊 Grade Tracker</div>' +
          '<div style="color:#64748b;font-size:0.85rem;">Complete exercises to see your performance here!</div>' +
        '</div>';
      }

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

      var skillColors = {
        'Reading': '#3b82f6',
        'Use of English': '#8b5cf6',
        'Writing': '#10b981',
        'Listening': '#f59e0b',
        'Speaking': '#ef4444'
      };

      var slidesHtml = '';
      skillNames.forEach(function(skill, idx) {
        var d = skillTotals[skill];
        var avgRaw = d.count > 0 ? Math.round(d.raw / d.count) : 0;
        var avgScale = d.count > 0 ? Math.round(d.scale / d.count) : 0;
        var cefr = getCefrFromScale(avgScale);
        var color = skillColors[skill] || '#3b82f6';
        slidesHtml +=
          '<div class="grade-carousel-slide" data-slide="' + idx + '" style="display:' + (idx === 0 ? 'flex' : 'none') + '">' +
            '<div class="grade-carousel-cefr" style="color:' + color + '">' + cefr + '</div>' +
            '<div class="grade-carousel-raw" style="color:' + color + '">' + avgRaw + '</div>' +
            '<div class="grade-carousel-skill">' + skill + '</div>' +
          '</div>';
      });

      return '<div class="sidebar-widget grade-tracker-carousel-widget" data-total-slides="' + skillNames.length + '">' +
        '<div class="sidebar-widget-title">📊 Grade Tracker</div>' +
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
      var pct = Math.round((completedParts / totalParts) * 100);
      var sectionIcon = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' };
      var icon = sectionIcon[lesson.section] || '📚';
      var self = this;
      return '<div class="sidebar-widget">' +
        '<div class="sidebar-widget-title">📌 Next Up</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
          '<span style="font-size:1.5rem;">' + icon + '</span>' +
          '<div>' +
            '<div style="font-weight:700;font-size:0.9rem;color:#0f172a;">' + self._escapeHTML(lesson.examId) + ' — ' + self._capitalize(lesson.section) + '</div>' +
            '<div style="color:#64748b;font-size:0.8rem;">Part ' + lesson.part + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="bento-next-progress" style="margin-bottom:10px;">' +
          '<div class="bento-progress-track">' +
            '<div class="bento-progress-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<span class="bento-next-progress-text">' + completedParts + '/' + totalParts + ' parts</span>' +
        '</div>' +
        '<button class="bento-resume-btn" style="width:100%;justify-content:center;" onclick="Exercise.openPart(\'' + self._escapeHTML(lesson.examId) + '\', \'' + lesson.section + '\', ' + lesson.part + ')">▶ Resume</button>' +
      '</div>';
    },

    openStreakSection: function() {
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
        ? '<div class="bento-streak-modal-status bento-streak-safe">✅ Streak safe today!</div>'
        : (StreakManager && StreakManager.isAtRisk()
          ? '<div class="bento-streak-modal-status bento-streak-risk">⚠️ Practice now to keep your streak!</div>'
          : '<div class="bento-streak-modal-status">Start today\'s practice to build your streak</div>');

      var el = document.createElement('div');
      el.className = 'bento-streak-modal-overlay';
      el.innerHTML =
        '<div class="bento-streak-modal">' +
          '<button class="bento-streak-modal-close" onclick="this.closest(\'.bento-streak-modal-overlay\').remove()">✕</button>' +
          '<div class="bento-streak-modal-fire">🔥</div>' +
          '<div class="bento-streak-modal-count">' + streakCount + '</div>' +
          '<div class="bento-streak-modal-label">day streak</div>' +
          statusHtml +
          '<div class="bento-streak-modal-stats">' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + streakBest + '</div><div class="bento-streak-stat-lbl">Best</div></div>' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + totalDays + '</div><div class="bento-streak-stat-lbl">Total Days</div></div>' +
            '<div class="bento-streak-stat"><div class="bento-streak-stat-val">' + (practicedToday ? '✅' : '❌') + '</div><div class="bento-streak-stat-lbl">Today</div></div>' +
          '</div>' +
          '<div class="bento-streak-modal-section">Last 28 days</div>' +
          calHtml +
        '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function(e) { if (e.target === el) el.remove(); });
    }
  };
})();
