// js/bento-grid.js
// Premium Bento Grid dashboard sections rendered above the exam list

(function() {
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

      if (typeof MainNav !== 'undefined') {
        html += MainNav.buildDesktopModeCardsHtml(exams);
      }

      html += '<section class="mobile-learn-pane mobile-learn-pane--legacy" id="mobileLearnPane" hidden>';

      // Row 1: Arena · Practice
      html += this._renderTopRow(exams);

      // Row 2: Lessons · Micro-Learning
      html += this._renderLearningRow();

      // Row 3: Recommended Exercise + Next in-progress lesson
      html += '<div class="bento-progress-row">';
      html += this._renderRecommendedExercise(exams);

      if (nextLesson) {
        html += this._renderNextLesson(nextLesson);
      }
      html += '</div>';

      html += this._renderMobileStatsSection(exams);

      html += '</section>';

      html += this._renderMobileBottomNav(level);

      html += '</div>';
      container.innerHTML = html;
      this._updateCourseProgressDesc(level);
      if (typeof MainNav !== 'undefined') {
        MainNav.ensureMobileMenuSheet();
        MainNav.setMobileActive('home');
        var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        if (isMobile && MainNav.initMobileStatsPopovers) MainNav.initMobileStatsPopovers();
      }
    },

    _renderMobileAppHero: function(level, exams) {
      var name = this._getUserName() || 'there';
      var availableCount = (exams || []).filter(function(e) { return e.status === 'available'; }).length;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      return '<section class="mobile-app-hero">' +
        '<img src="Assets/images/sunelogoreduced2.svg" class="mobile-app-kicker" alt="Sune English">' +
        '<h1>Hi, ' + this._escapeHTML(name.split(' ')[0]) + '</h1>' +
        '<p>Choose your next move for ' + this._escapeHTML(level) + '.</p>' +
        '<div class="mobile-app-pill-row">' +
          '<span class="mobile-app-pill">' + _mi('school') + this._escapeHTML(level) + '</span>' +
          '<span class="mobile-app-pill">' + _mi('assignment') + availableCount + ' tests</span>' +
        '</div>' +
        '<div class="mobile-app-actions" aria-label="Mobile sections">' +
          '<button onclick="BentoGrid.openTests()">' + _mi('assignment') + '<span>Tests</span></button>' +
          '<button onclick="BentoGrid.openLessons()">' + _mi('auto_stories') + '<span>Course</span></button>' +
          '<button onclick="BentoGrid.openCrosswordList()">' + _mi('grid_on') + '<span>Crosswords</span></button>' +
          (typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI() ? '' :
          '<button onclick="UserProfile.renderPremiumSection()">' + _mi('workspace_premium') + '<span>Plans</span></button>') +
          '<button onclick="BentoGrid.openMobileProfile()">' + _mi('settings') + '<span>Profile</span></button>' +
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
        '<div class="mobile-stats-actions">' +
          '<button onclick="openScoreCalculator(event)">' + _mi('calculate') + '<span>Score calculator</span></button>' +
          '<button onclick="BentoGrid.openStreakSection()">' + _mi('local_fire_department') + '<span>Streak calendar</span></button>' +
        '</div>' +
      '</section>';
    },

    _renderMobileBottomNav: function(level) {
      if (typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml) {
        return MainNav.buildMobileBottomNavHtml();
      }
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var profileMarkup = this._buildMobileBottomNavProfileMarkup(_mi);
      return '<nav class="mobile-bottom-nav" aria-label="Mobile dashboard">' +
        '<button type="button" class="mobile-bottom-nav-btn" data-mobile-tab="home" onclick="BentoGrid.goMobileHome()">' + _mi('home') + '<span>Home</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn" onclick="BentoGrid.openLessons()">' + _mi('auto_stories') + '<span>Course</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn" onclick="BentoGrid.openTests()">' + _mi('assignment') + '<span>Tests</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn" onclick="BentoGrid.openMobileDictionaries()">' + _mi('menu_book') + '<span>Dict</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn mobile-bottom-nav-profile" onclick="BentoGrid.openMobileProfile()" aria-label="Account">' + profileMarkup + '</button>' +
      '</nav>';
    },

    _buildMobileBottomNavProfileMarkup: function(_mi) {
      var isAuth = !!(typeof AppState !== 'undefined' && AppState.isAuthenticated);
      if (!isAuth) {
        return _mi('person') + '<span>Sign in</span>';
      }
      var avatarUrl = '';
      var prof = (typeof UserProfile !== 'undefined' && UserProfile._profile) ? UserProfile._profile : null;
      if (prof && prof.avatar_url) {
        avatarUrl = String(prof.avatar_url);
      } else if (typeof Auth !== 'undefined' && Auth.getUser) {
        var u = Auth.getUser();
        if (u && u.user_metadata && u.user_metadata.avatar_url) {
          avatarUrl = String(u.user_metadata.avatar_url);
        }
      }
      if (avatarUrl) {
        return '<span class="mobile-bottom-nav-avatar-wrap"><img class="mobile-bottom-nav-avatar" src="' + this._escapeHTML(avatarUrl) + '" alt=""></span><span>Profile</span>';
      }
      var name = this._getUserName() || 'User';
      var initials = name.trim().split(/\s+/).map(function(p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase() || 'Me';
      return '<span class="mobile-bottom-nav-initials" aria-hidden="true">' + this._escapeHTML(initials) + '</span><span>Profile</span>';
    },

    openMobileProfile: function() {
      if (typeof AppState !== 'undefined' && AppState.isAuthenticated) {
        if (typeof UserProfile !== 'undefined' && UserProfile.renderProfileSection) {
          UserProfile.renderProfileSection();
        }
      } else if (typeof Auth !== 'undefined' && Auth._showAuthModal) {
        Auth._showAuthModal();
      }
    },

    setMobileDashboardTab: function(tab) {
      tab = tab || 'home';
      this._mobileDashboardTab = tab;
      var grid = document.querySelector('.bento-grid');
      if (grid) {
        grid.setAttribute('data-mobile-tab', tab);
      }
      if (typeof MainNav !== 'undefined' && MainNav.setMobileActive) {
        MainNav.setMobileActive(tab === 'home' ? 'home' : tab);
      }
    },

    /** Leave any screen (profile, course, exercises, subpages) and open the main dashboard home. */
    goMobileHome: function() {
      if (typeof MainNav !== 'undefined' && MainNav.closeMobileMenu) MainNav.closeMobileMenu();
      if (typeof AppState !== 'undefined' && AppState.currentView === 'dashboard') {
        this.setMobileDashboardTab('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof MainNav !== 'undefined' && MainNav.setMobileActive) MainNav.setMobileActive('home');
        return;
      }
      this._mobileDashboardTab = 'home';
      if (typeof loadDashboard === 'function') {
        loadDashboard();
      }
    },

    cycleMobileLevel: function() {
      var levels = ['B1', 'B2', 'C1'];
      var current = (AppState.currentLevel || 'C1').toUpperCase();
      var next = levels[(levels.indexOf(current) + 1) % levels.length] || 'C1';
      this.changeLevel(next);
    },

    openMobileLevelModal: function() {
      var existing = document.getElementById('mobile-level-modal');
      if (existing) existing.remove();

      var current = (AppState.currentLevel || 'C1').toUpperCase();
      var levels = [
        { code: 'B1', name: 'Preliminary', icon: 'school' },
        { code: 'B2', name: 'First', icon: 'workspace_premium' },
        { code: 'C1', name: 'Advanced', icon: 'auto_stories' }
      ];

      var html = '<div class="mobile-level-modal-card" role="dialog" aria-modal="true" aria-labelledby="mobile-level-title">' +
        '<button class="mobile-level-modal-close" onclick="BentoGrid.closeMobileLevelModal()" aria-label="Close level picker">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="mobile-level-modal-kicker">Choose level</div>' +
        '<h2 id="mobile-level-title">What are you studying?</h2>' +
        '<div class="mobile-level-modal-options">';

      levels.forEach(function(level) {
        var isActive = level.code === current;
        html += '<button class="mobile-level-option' + (isActive ? ' active' : '') + '" onclick="BentoGrid.selectMobileLevel(\'' + level.code + '\')">' +
          '<span class="material-symbols-outlined">' + level.icon + '</span>' +
          '<strong>' + level.code + '</strong>' +
          '<small>' + level.name + '</small>' +
        '</button>';
      });

      html += '</div></div>';

      var modal = document.createElement('div');
      modal.id = 'mobile-level-modal';
      modal.className = 'mobile-level-modal-overlay';
      modal.innerHTML = html;
      modal.addEventListener('click', function(e) {
        if (e.target === modal) BentoGrid.closeMobileLevelModal();
      });
      document.body.appendChild(modal);
    },

    closeMobileLevelModal: function() {
      var modal = document.getElementById('mobile-level-modal');
      if (modal) modal.remove();
    },

    selectMobileLevel: function(level) {
      this.closeMobileLevelModal();
      this.changeLevel(level);
    },

    openMobileLangModal: function() {
      var isDesktop = window.matchMedia && window.matchMedia('(min-width: 769px)').matches;
      var langBtn = typeof MainNav !== 'undefined' && MainNav._getStatsBarButton
        ? MainNav._getStatsBarButton('lang')
        : document.querySelector('.dashboard-right-sidebar .stats-bar-lang, .mobile-nav-top-stats .stats-bar-lang');
      if (isDesktop && langBtn && typeof MainNav !== 'undefined') {
        langBtn.click();
        return;
      }

      var existing = document.getElementById('mobile-lang-modal');
      if (existing) existing.remove();

      var currentLang = (typeof MainNav !== 'undefined' && MainNav._getCurrentTranslateLang)
        ? MainNav._getCurrentTranslateLang()
        : (localStorage.getItem('cambridge_translate_lang') || 'es');
      var langs = (typeof Tools !== 'undefined' && Tools.getTranslateLanguages)
        ? Tools.getTranslateLanguages()
        : [{ code: 'es', label: 'Español' }];

      var html = '<div class="mobile-level-modal-card" role="dialog" aria-modal="true" aria-labelledby="mobile-lang-title">' +
        '<button class="mobile-level-modal-close" onclick="BentoGrid.closeMobileLangModal()" aria-label="Close language picker">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="mobile-level-modal-kicker">Translations</div>' +
        '<h2 id="mobile-lang-title">Translate to</h2>' +
        '<div class="mobile-level-modal-options">';

      langs.forEach(function(lang) {
        var isActive = lang.code === currentLang;
        html += '<button class="mobile-level-option' + (isActive ? ' active' : '') + '" onclick="BentoGrid.selectMobileLang(\'' + lang.code + '\')">' +
          '<span class="material-symbols-outlined">language</span>' +
          '<strong>' + lang.label + '</strong>' +
          '<small>' + lang.code.toUpperCase() + '</small>' +
        '</button>';
      });

      html += '</div></div>';

      var modal = document.createElement('div');
      modal.id = 'mobile-lang-modal';
      modal.className = 'mobile-level-modal-overlay';
      modal.innerHTML = html;
      modal.addEventListener('click', function(e) {
        if (e.target === modal) BentoGrid.closeMobileLangModal();
      });
      document.body.appendChild(modal);
    },

    closeMobileLangModal: function() {
      var modal = document.getElementById('mobile-lang-modal');
      if (modal) modal.remove();
    },

    selectMobileLang: function(code) {
      this.closeMobileLangModal();
      if (typeof MainNav !== 'undefined' && MainNav.selectLang) {
        MainNav.selectLang(code);
      } else if (typeof Tools !== 'undefined' && Tools.setTranslateLang) {
        Tools.setTranslateLang(code);
      }
    },

    openMobileDictionaries: function() {
      if (typeof FastExercises !== 'undefined' && FastExercises._showDictionariesHome) {
        FastExercises._showDictionariesHome();
      } else if (typeof FastExercises !== 'undefined' && FastExercises._showGeneralDictionary) {
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

        '<div class="bento-card bento-card-learning" onclick="BentoGrid.openCourseSection(\'learning\')">' +
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Learning</div>' +
            '<div id="bento-learning-prog-desc" class="bento-course-prog"></div>' +
            '<div class="bento-card-hover-info">Grammar units, reviews and progress tests — structured lessons for Cambridge exams.</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-card-vocabulary" onclick="BentoGrid.openCourseSection(\'vocabulary\')">' +
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Vocabulary</div>' +
            '<div id="bento-vocabulary-prog-desc" class="bento-course-prog"></div>' +
            '<div class="bento-card-hover-info">Phrasal verbs, idioms and word formation practice.</div>' +
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

      var allSkills = (typeof ScoreCalculator !== 'undefined' && typeof ScoreCalculator.getSkillsForExamLevel === 'function')
        ? ScoreCalculator.getSkillsForExamLevel(levelData)
        : ['Reading', 'Use of English', 'Writing', 'Listening', 'Speaking'];
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

    // Returns XP earned: 2 per correctly guessed letter (hints/solve excluded).
    _calcCwXP: function(progressObj) {
      var xp = 0;
      Object.values(progressObj).forEach(function(p) {
        if (!p) return;
        xp += (p.lettersXp || 0);
      });
      return xp;
    },

    // Async: loads category data and updates the Learning/Vocabulary bento card progress rows.
    _updateCourseProgressDesc: async function(level) {
      var learningEl = document.getElementById('bento-learning-prog-desc');
      var vocabEl = document.getElementById('bento-vocabulary-prog-desc');
      if (!learningEl && !vocabEl) return;
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

        var courseProg = {};
        try { courseProg = JSON.parse(localStorage.getItem('cambridge_course_progress_' + level) || '{}'); } catch(e) {}

        var grammarPct = 0;
        var reviewPct = 0;
        if (courseIndex && courseIndex.items) {
          var grammarItems = courseIndex.items.filter(function(i) { return i.type === 'grammar'; });
          var reviewItems = courseIndex.items.filter(function(i) { return i.type === 'review'; });
          var doneGrammar = grammarItems.filter(function(i) { return !!courseProg[i.id]; }).length;
          var doneReview = reviewItems.filter(function(i) { return !!courseProg[i.id]; }).length;
          grammarPct = grammarItems.length > 0 ? Math.round((doneGrammar / grammarItems.length) * 100) : 0;
          reviewPct = reviewItems.length > 0 ? Math.round((doneReview / reviewItems.length) * 100) : 0;
        }

        if (learningEl) {
          learningEl.innerHTML =
            '<div class="bcp-row"><span class="bcp-label">Grammar</span><span class="bcp-dots"></span><span class="bcp-pct">' + grammarPct + '%</span></div>' +
            '<div class="bcp-row"><span class="bcp-label">Reviews</span><span class="bcp-dots"></span><span class="bcp-pct">' + reviewPct + '%</span></div>';
        }
        if (vocabEl) {
          var pvCatPct = (pvData && pvData.levels && typeof FastExercises !== 'undefined') ? FastExercises._getCategoryPercent('phrasal-verbs', pvData.levels) : 0;
          var idCatPct = (idData && idData.levels && typeof FastExercises !== 'undefined') ? FastExercises._getCategoryPercent('idioms', idData.levels) : 0;
          var wfCatPct = (wfData && wfData.levels && typeof FastExercises !== 'undefined') ? FastExercises._getCategoryPercent('word-formation', wfData.levels) : 0;
          vocabEl.innerHTML =
            '<div class="bcp-row"><span class="bcp-label">Phrasal Verbs</span><span class="bcp-dots"></span><span class="bcp-pct">' + pvCatPct + '%</span></div>' +
            '<div class="bcp-row"><span class="bcp-label">Idioms</span><span class="bcp-dots"></span><span class="bcp-pct">' + idCatPct + '%</span></div>' +
            '<div class="bcp-row"><span class="bcp-label">Word Formation</span><span class="bcp-dots"></span><span class="bcp-pct">' + wfCatPct + '%</span></div>';
        }
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
      var xp = this._calcCwXP(progress);
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      // ── Stats block ──
      var html = '<div class="cw-sidebar-stats">' +
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

      html += '<div class="cw-sidebar-decor-wrap" aria-hidden="true">' +
        '<img src="Assets/images/sune_crossword.svg" alt="" class="cw-sidebar-decor">' +
      '</div>';

      return html;
    },

    _calcWlXP: function(progressObj) {
      var xp = 0;
      Object.values(progressObj || {}).forEach(function(p) {
        if (!p || !p.completed) return;
        xp += 40;
        if (p.guesses && p.guesses <= 3) xp += 20;
        else if (p.guesses && p.guesses <= 5) xp += 10;
      });
      return xp;
    },

    _buildWordleStatsSidebarHtml: function(entries) {
      var progress = this._getWlProgress();
      var total = entries.length;
      var completedCount = 0;
      var inProgressCount = 0;
      var lastUnfinished = null;
      var lastUnfinishedTime = 0;

      entries.forEach(function(e) {
        var key = e.levelId + '_wl' + e.wlIndex;
        var p = progress[key];
        if (!p) return;
        if (p.completed) {
          completedCount++;
        } else if ((p.guesses || 0) > 0) {
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
      var xp = this._calcWlXP(progress);
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };

      var html = '<div class="cw-sidebar-stats">' +
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
        '<div class="cw-sidebar-prog-track"><div class="cw-sidebar-prog-fill cw-sidebar-prog-fill--wordle" style="width:' + pct + '%"></div></div>' +
        '<div class="cw-sidebar-prog-label">' + pct + '% overall progress</div>' +
      '</div>';

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
        '<div class="cw-sidebar-xp-track"><div class="cw-sidebar-xp-fill cw-sidebar-xp-fill--wordle" style="width:' + xpPct + '%"></div></div>' +
      '</div>';

      if (lastUnfinished) {
        var p2 = progress[lastUnfinished.levelId + '_wl' + lastUnfinished.wlIndex] || {};
        var triesPct = (p2.guesses > 0) ? Math.round((p2.guesses / 6) * 100) : 0;
        html += '<div class="cw-sidebar-continue" onclick="FastExercises._openWordleLevel(\'' + this._escapeHTML(lastUnfinished.levelId) + '\',' + lastUnfinished.wlIndex + ')">' +
          '<div class="cw-sidebar-continue-label">' + _mi('play_circle') + ' Continue</div>' +
          '<div class="cw-sidebar-continue-title">' + this._escapeHTML(lastUnfinished.title) + '</div>' +
          '<div class="cw-sidebar-continue-sub">' + lastUnfinished.levelId + ' · ' + (p2.guesses || 0) + ' / 6 tries</div>' +
          '<div class="cw-sidebar-prog-track" style="margin-top:8px"><div class="cw-sidebar-prog-fill cw-sidebar-prog-fill--wordle" style="width:' + triesPct + '%"></div></div>' +
        '</div>';
      }

      html += '<div class="cw-sidebar-decor-wrap" aria-hidden="true">' +
        '<img src="Assets/images/wordle.svg" alt="" class="cw-sidebar-decor cw-sidebar-decor--wordle">' +
      '</div>';

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

    _buildInlinePawLoadingHtml: function() {
      if (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.wrapInlineLoading) {
        return AppLoadingScreen.wrapInlineLoading(AppLoadingScreen.getMarkup());
      }
      return '<div class="fe-loading"><div class="fe-spinner"></div></div>';
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

    _getCrosswordEntries: function() {
      var CEFR_ORDER = ['A2', 'B1', 'B2', 'C1', 'C2', 'mix'];
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
      return allEntries;
    },

    _cwLevelMeta: function() {
      return {
        'A2':  { label: 'A2',   difficulty: 'Easy',          iconColor: '#059669', headerColor: '#10b981', cardBg: '#ecfdf5', cardBorder: '#6ee7b7', cardText: '#064e3b', icon: 'star' },
        'B1':  { label: 'B1',   difficulty: 'Pre-Intermediate', iconColor: '#2563eb', headerColor: '#3b82f6', cardBg: '#eff6ff', cardBorder: '#93c5fd', cardText: '#1e3a8a', icon: 'star' },
        'B2':  { label: 'B2',   difficulty: 'Intermediate',  iconColor: '#d97706', headerColor: '#f59e0b', cardBg: '#fffbeb', cardBorder: '#fcd34d', cardText: '#78350f', icon: 'star' },
        'C1':  { label: 'C1',   difficulty: 'Advanced',      iconColor: '#dc2626', headerColor: '#ef4444', cardBg: '#fff1f2', cardBorder: '#fca5a5', cardText: '#7f1d1d', icon: 'star' },
        'C2':  { label: 'C2',   difficulty: 'Expert',        iconColor: '#7c3aed', headerColor: '#8b5cf6', cardBg: '#f5f3ff', cardBorder: '#c4b5fd', cardText: '#4c1d95', icon: 'star' },
        'mix': { label: 'Mix',  difficulty: 'Mixed',         iconColor: '#0369a1', headerColor: '#0ea5e9', cardBg: '#f0f9ff', cardBorder: '#7dd3fc', cardText: '#0c4a6e', icon: 'shuffle' }
      };
    },

    _buildCrosswordDailyBannerHtml: function(progress) {
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var daily = this._getDailyCrossword('mix');
      if (!daily) return '';
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
      return '<div class="cw-daily-banner' + (isDailyDone ? ' cw-daily-banner-done' : '') + '">' +
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
    },

    _getNextCwLevel: function(levelId) {
      var ORDER = ['A2', 'B1', 'B2', 'C1', 'mix'];
      var idx = ORDER.indexOf(levelId);
      if (idx === -1 || idx >= ORDER.length - 1) return null;
      return ORDER[idx + 1];
    },

    _wlProgressKey: 'cambridge_wordle_progress',

    _getWlProgress: function() {
      try {
        return JSON.parse(localStorage.getItem(this._wlProgressKey) || '{}');
      } catch (e) {
        return {};
      }
    },

    _getWordleEntries: function() {
      var CEFR_ORDER = ['A2', 'B1', 'B2', 'C1'];
      var LEVEL_CONFIG = (typeof FastExercises !== 'undefined' && FastExercises._wlLevelConfig)
        ? FastExercises._wlLevelConfig()
        : [];
      var allEntries = [];
      CEFR_ORDER.forEach(function(cefrId) {
        var cfg = null;
        for (var i = 0; i < LEVEL_CONFIG.length; i++) {
          if (LEVEL_CONFIG[i].id === cefrId) { cfg = LEVEL_CONFIG[i]; break; }
        }
        if (!cfg || cfg.count <= 0) return;
        for (var idx = 0; idx < cfg.count; idx++) {
          allEntries.push({ levelId: cefrId, wlIndex: idx, title: cefrId + ' #' + (idx + 1) });
        }
      });
      return allEntries;
    },

    _wlLevelMeta: function() {
      return this._cwLevelMeta();
    },

    _getNextWlLevel: function(levelId) {
      var ORDER = ['A2', 'B1', 'B2', 'C1'];
      var idx = ORDER.indexOf(levelId);
      if (idx === -1 || idx >= ORDER.length - 1) return null;
      return ORDER[idx + 1];
    },

    _buildWordleLevelCardsHtml: function(allEntries, progress) {
      var self = this;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var LEVEL_META = this._wlLevelMeta();
      var availableLevels = ['A2', 'B1', 'B2', 'C1'];

      var html = '<div class="cw-level-cards desktop-mode-cards">';
      availableLevels.forEach(function(lvl) {
        var meta = LEVEL_META[lvl] || LEVEL_META['B2'];
        var levelEntries = allEntries.filter(function(e) { return e.levelId === lvl; });
        var completed = 0;
        var inProgress = 0;
        levelEntries.forEach(function(e) {
          var p = progress[e.levelId + '_wl' + e.wlIndex];
          if (!p) return;
          if (p.completed) completed++;
          else if ((p.guesses || 0) > 0) inProgress++;
        });
        var total = levelEntries.length;
        var statusText = completed > 0
          ? completed + ' / ' + total + ' completed' + (inProgress > 0 ? ' · ' + inProgress + ' in progress' : '')
          : total + ' levels · ' + meta.difficulty;
        var statusClass = completed > 0 ? 'mode-card-status-done' : '';

        html += '<div class="mode-card mode-card--cw-level mode-card--wordle-level" data-wl-level="' + lvl.toLowerCase() + '"' +
          ' onclick="BentoGrid.openWordleSection(null, \'' + lvl + '\')" role="button" tabindex="0">' +
          '<div class="mode-card-body">' +
            '<div class="mode-card-title-row">' +
              '<span class="mode-card-title">' + self._escapeHTML(meta.label) + '</span>' +
            '</div>' +
            '<div class="mode-card-status ' + statusClass + '">' + self._escapeHTML(statusText) + '</div>' +
          '</div>' +
          '<div class="mode-card-icon-wrap">' +
            '<div class="mode-card-icon" style="color:#a855f7">' + _mi(meta.icon) + '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      return html;
    },

    _buildWordlePathMapHtml: function(entries, progress, levelId) {
      var self = this;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var LEVEL_META = this._wlLevelMeta();
      var meta = LEVEL_META[levelId] || LEVEL_META['B2'];

      var firstIncompleteIdx = -1;
      entries.forEach(function(entry, idx) {
        if (firstIncompleteIdx !== -1) return;
        var p = progress[entry.levelId + '_wl' + entry.wlIndex];
        if (!p || !p.completed) firstIncompleteIdx = idx;
      });
      if (firstIncompleteIdx === -1) firstIncompleteIdx = entries.length - 1;

      var nextLevel = self._getNextWlLevel(levelId);

      var html = '<div class="cw-path-map cw-path-map--wordle" data-level="' + levelId + '" style="' +
        '--cw-header-color:' + meta.headerColor + ';' +
        '--cw-icon-color:' + meta.iconColor + ';' +
        '--cw-card-bg:' + meta.cardBg + ';' +
        '--cw-card-border:' + meta.cardBorder + ';' +
        '--cw-card-text:' + meta.cardText +
        '">';
      html += '<div class="cw-path-grid" role="list" aria-label="' + self._escapeHTML(levelId) + ' wordle levels">';

      entries.forEach(function(entry, idx) {
        var pKey = entry.levelId + '_wl' + entry.wlIndex;
        var prog = progress[pKey];
        var isCompleted = !!(prog && prog.completed);
        var isInProgress = !!(prog && !isCompleted && (prog.guesses || 0) > 0);
        var isCurrent = idx === firstIncompleteIdx;
        var levelNum = String(idx + 1).padStart(3, '0');

        var cellClass = 'cw-path-cell';
        if (isCompleted) cellClass += ' cw-path-cell--done';
        else if (isInProgress) cellClass += ' cw-path-cell--progress';
        else cellClass += ' cw-path-cell--pending';
        if (isCurrent && !isCompleted) cellClass += ' cw-path-cell--current';

        html += '<button type="button" class="' + cellClass + '" onclick="FastExercises._openWordleLevel(\'' + entry.levelId + '\',' + entry.wlIndex + ')" title="' + self._escapeHTML(entry.title) + '" aria-label="Wordle ' + levelNum + '">';
        html += '<span class="cw-path-cell-num">' + levelNum + '</span>';
        html += '</button>';
      });

      html += '</div>';

      if (nextLevel) {
        var nextMeta = LEVEL_META[nextLevel] || LEVEL_META['B2'];
        html += '<div class="cw-path-next-level">' +
          '<button type="button" class="cw-path-next-level-card" onclick="BentoGrid.openWordleSection(null, \'' + nextLevel + '\')">' +
            '<span class="cw-path-next-level-kicker">Next Level</span>' +
            '<span class="cw-path-next-level-title">' + self._escapeHTML(nextMeta.label) + ' Wordle</span>' +
            '<span class="cw-path-next-level-arrow">' + _mi('arrow_forward') + '</span>' +
          '</button>' +
        '</div>';
      }

      html += '</div>';
      return html;
    },

    _scrollWordlePathToCurrent: function() {
      requestAnimationFrame(function() {
        var current = document.querySelector('.cw-path-map--wordle .cw-path-cell--current');
        if (!current) return;
        var rect = current.getBoundingClientRect();
        var targetY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      });
    },

    _cwPlayBack: function() {
      var state = window._cwState;
      if (state && state.cwIndex !== undefined && state.levelId) {
        history.back();
        return;
      }
      if (state && state.levelId) {
        BentoGrid.openCrosswordList(null, state.levelId === 'mix' ? null : state.levelId);
        return;
      }
      BentoGrid.openCrosswordList();
    },

    _buildCrosswordLevelCardsHtml: function(allEntries, progress) {
      var self = this;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var LEVEL_META = this._cwLevelMeta();
      var CEFR_ORDER = ['A2', 'B1', 'B2', 'C1', 'mix'];
      var availableLevels = CEFR_ORDER.filter(function(lvl) {
        return allEntries.some(function(e) { return e.levelId === lvl; });
      });

      var html = '<div class="cw-level-cards desktop-mode-cards">';
      availableLevels.forEach(function(lvl) {
        var meta = LEVEL_META[lvl] || LEVEL_META['B2'];
        var levelEntries = allEntries.filter(function(e) { return e.levelId === lvl; });
        var completed = 0;
        var inProgress = 0;
        levelEntries.forEach(function(e) {
          var p = progress[e.levelId + '_cw' + e.cwIndex];
          if (!p) return;
          if (p.completed) completed++;
          else if ((p.wordsCorrect || p.wordsComplete || 0) > 0) inProgress++;
        });
        var total = levelEntries.length;
        var statusText = completed > 0
          ? completed + ' / ' + total + ' completed' + (inProgress > 0 ? ' · ' + inProgress + ' in progress' : '')
          : total + ' puzzles · ' + meta.difficulty;
        var statusClass = completed > 0 ? 'mode-card-status-done' : '';

        html += '<div class="mode-card mode-card--cw-level" data-cw-level="' + lvl.toLowerCase() + '"' +
          ' onclick="BentoGrid.openCrosswordList(null, \'' + lvl + '\')" role="button" tabindex="0">' +
          '<div class="mode-card-body">' +
            '<div class="mode-card-title-row">' +
              '<span class="mode-card-title">' + self._escapeHTML(meta.label) + '</span>' +
            '</div>' +
            '<div class="mode-card-status ' + statusClass + '">' + self._escapeHTML(statusText) + '</div>' +
          '</div>' +
          '<div class="mode-card-icon-wrap">' +
            '<div class="mode-card-icon">' + _mi(meta.icon) + '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      return html;
    },

    _buildCrosswordPathMapHtml: function(entries, progress, levelId) {
      var self = this;
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var LEVEL_META = this._cwLevelMeta();
      var meta = LEVEL_META[levelId] || LEVEL_META['B2'];

      var firstIncompleteIdx = -1;
      entries.forEach(function(entry, idx) {
        if (firstIncompleteIdx !== -1) return;
        var p = progress[entry.levelId + '_cw' + entry.cwIndex];
        if (!p || !p.completed) firstIncompleteIdx = idx;
      });
      if (firstIncompleteIdx === -1) firstIncompleteIdx = entries.length - 1;

      var nextLevel = self._getNextCwLevel(levelId);

      var html = '<div class="cw-path-map" data-level="' + levelId + '" style="' +
        '--cw-header-color:' + meta.headerColor + ';' +
        '--cw-icon-color:' + meta.iconColor + ';' +
        '--cw-card-bg:' + meta.cardBg + ';' +
        '--cw-card-border:' + meta.cardBorder + ';' +
        '--cw-card-text:' + meta.cardText +
        '">';
      html += '<div class="cw-path-grid" role="list" aria-label="' + self._escapeHTML(levelId) + ' crosswords">';

      entries.forEach(function(entry, idx) {
        var pKey = entry.levelId + '_cw' + entry.cwIndex;
        var prog = progress[pKey];
        var isCompleted = !!(prog && prog.completed);
        var isInProgress = !!(prog && !isCompleted && (prog.wordsCorrect || prog.wordsComplete || 0) > 0);
        var isCurrent = idx === firstIncompleteIdx;
        var levelNum = String(idx + 1).padStart(3, '0');

        var cellClass = 'cw-path-cell';
        if (isCompleted) cellClass += ' cw-path-cell--done';
        else if (isInProgress) cellClass += ' cw-path-cell--progress';
        else cellClass += ' cw-path-cell--pending';
        if (isCurrent && !isCompleted) cellClass += ' cw-path-cell--current';

        html += '<button type="button" class="' + cellClass + '" onclick="FastExercises._openMixedCrossword(\'' + entry.levelId + '\',' + entry.cwIndex + ')" title="' + self._escapeHTML(entry.title) + '" aria-label="Crossword ' + levelNum + '">';
        html += '<span class="cw-path-cell-num">' + levelNum + '</span>';
        html += '</button>';
      });

      html += '</div>';

      if (nextLevel) {
        var nextMeta = LEVEL_META[nextLevel] || LEVEL_META['B2'];
        html += '<div class="cw-path-next-level">' +
          '<button type="button" class="cw-path-next-level-card" onclick="BentoGrid.openCrosswordList(null, \'' + nextLevel + '\')">' +
            '<span class="cw-path-next-level-kicker">Next Level</span>' +
            '<span class="cw-path-next-level-title">' + self._escapeHTML(nextMeta.label) + ' Crosswords</span>' +
            '<span class="cw-path-next-level-arrow">' + _mi('arrow_forward') + '</span>' +
          '</button>' +
        '</div>';
      }

      html += '</div>';
      return html;
    },

    _scrollCrosswordPathToCurrent: function() {
      requestAnimationFrame(function() {
        var current = document.querySelector('.cw-path-cell--current');
        if (!current) return;
        var rect = current.getBoundingClientRect();
        var targetY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      });
    },

    openCrosswordList: async function(page, levelFilter, options) {
      options = options || {};
      var content = document.getElementById('main-content');
      if (!content) return;

      AppState.currentView = 'crosswordList';
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();

      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var allEntries = this._getCrosswordEntries();
      var progress = (typeof CrosswordSync !== 'undefined') ? CrosswordSync.getAll() : this._getCwProgress();
      var activeLevel = levelFilter || null;
      var LEVEL_META = this._cwLevelMeta();

      var cwState = { view: 'crosswordList' };
      if (activeLevel) cwState.level = activeLevel;
      if (!options.fromRoute) {
        history.pushState(cwState, '', Router.stateToPath(cwState));
      }

      var leftSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent = BentoGrid._buildDashboardSidebars(exams).left;
      }
      var rightSidebarContent = this._buildCrosswordStatsSidebarHtml(allEntries);

      var mobileTopBarHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml
        ? MainNav.buildMobileTopBarHtml() : '';
      var mobileNavHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml
        ? MainNav.buildMobileBottomNavHtml('crosswords')
        : '';

      var loadingStart = (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.markShown)
        ? AppLoadingScreen.markShown()
        : Date.now();

      content.innerHTML =
        '<div class="dashboard-layout dashboard-layout--crossword-scroll">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center dashboard-center--crossword" id="cwDashboardCenter">' +
            mobileTopBarHtml +
            '<div class="cw-section-header' + (activeLevel ? ' cw-section-header--level' : ' cw-section-header--picker') + '"' +
              (activeLevel ? ' style="--cw-header-color:' + (LEVEL_META[activeLevel] || LEVEL_META['B2']).headerColor + '"' : '') + '>' +
              '<button class="cw-section-back" onclick="' + (activeLevel ? 'history.back()' : 'loadDashboard()') + '" aria-label="Back">' + _mi('arrow_back') + '</button>' +
              '<div class="cw-section-header-text">' +
                (activeLevel
                  ? '<div class="cw-section-kicker">' + activeLevel.toUpperCase() + ' · ' + allEntries.filter(function(e) { return e.levelId === activeLevel; }).length + ' PUZZLES</div>' +
                    '<div class="cw-section-title">' + (LEVEL_META[activeLevel] || LEVEL_META['B2']).difficulty + ' Crosswords</div>'
                  : '<div class="cw-section-kicker">CROSSWORDS</div>' +
                    '<div class="cw-section-title">Choose a Level</div>') +
              '</div>' +
            '</div>' +
            '<div class="cw-page-content" id="cwCenterScroll">' +
              '<div class="cw-list-page" id="cwListPage">' + this._buildInlinePawLoadingHtml() + '</div>' +
            '</div>' +
            mobileNavHtml +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof MainNav !== 'undefined' && MainNav.setActive) MainNav.setActive('crosswords');

      var cwListPage = document.getElementById('cwListPage');
      if (!cwListPage) return;

      await new Promise(function(resolve) { requestAnimationFrame(function() { requestAnimationFrame(resolve); }); });

      var bodyHtml = '';
      if (activeLevel) {
        var entries = allEntries.filter(function(e) { return e.levelId === activeLevel; });
        if (entries.length === 0) {
          bodyHtml = '<div class="fe-map-empty">No crosswords found for this level.</div>';
        } else {
          bodyHtml = this._buildCrosswordPathMapHtml(entries, progress, activeLevel);
        }
      } else {
        bodyHtml = this._buildCrosswordDailyBannerHtml(progress) + this._buildCrosswordLevelCardsHtml(allEntries, progress);
      }

      if (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.waitMinDuration) {
        await AppLoadingScreen.waitMinDuration(loadingStart);
      }

      cwListPage.innerHTML = bodyHtml;

      if (activeLevel) {
        this._scrollCrosswordPathToCurrent();
      }
    },

    openWordleSection: async function(page, levelFilter, options) {
      options = options || {};
      var content = document.getElementById('main-content');
      if (!content) return;

      AppState.currentView = 'wordleList';
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();

      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      if (typeof FastExercises !== 'undefined' && FastExercises._ensureWlManifest) {
        await FastExercises._ensureWlManifest();
      }
      var allEntries = this._getWordleEntries();
      var progress = this._getWlProgress();
      var activeLevel = levelFilter || null;
      var LEVEL_META = this._wlLevelMeta();

      var wlState = { view: 'wordleList' };
      if (activeLevel) wlState.level = activeLevel;
      if (!options.fromRoute) {
        history.pushState(wlState, '', Router.stateToPath(wlState));
      }

      var leftSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent = BentoGrid._buildDashboardSidebars(exams).left;
      }
      var rightSidebarContent = this._buildWordleStatsSidebarHtml(allEntries);

      var mobileTopBarHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml
        ? MainNav.buildMobileTopBarHtml() : '';
      var mobileNavHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml
        ? MainNav.buildMobileBottomNavHtml('wordle')
        : '';

      var loadingStart = (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.markShown)
        ? AppLoadingScreen.markShown()
        : Date.now();

      content.innerHTML =
        '<div class="dashboard-layout dashboard-layout--crossword-scroll dashboard-layout--wordle-scroll">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center dashboard-center--crossword" id="wlDashboardCenter">' +
            mobileTopBarHtml +
            '<div class="cw-section-header cw-section-header--wordle' + (activeLevel ? ' cw-section-header--level' : ' cw-section-header--picker') + '"' +
              (activeLevel ? ' style="--cw-header-color:' + (LEVEL_META[activeLevel] || LEVEL_META['B2']).headerColor + '"' : '') + '>' +
              '<button class="cw-section-back" onclick="' + (activeLevel ? 'history.back()' : 'loadDashboard()') + '" aria-label="Back">' + _mi('arrow_back') + '</button>' +
              '<div class="cw-section-header-text">' +
                (activeLevel
                  ? '<div class="cw-section-kicker">' + activeLevel.toUpperCase() + ' · ' + allEntries.filter(function(e) { return e.levelId === activeLevel; }).length + ' LEVELS</div>' +
                    '<div class="cw-section-title">' + (LEVEL_META[activeLevel] || LEVEL_META['B2']).difficulty + ' Wordle</div>'
                  : '<div class="cw-section-kicker">WORDLE</div>' +
                    '<div class="cw-section-title">Choose a Level</div>') +
              '</div>' +
            '</div>' +
            '<div class="cw-page-content" id="wlCenterScroll">' +
              '<div class="cw-list-page" id="wlListPage">' + this._buildInlinePawLoadingHtml() + '</div>' +
            '</div>' +
            mobileNavHtml +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof MainNav !== 'undefined' && MainNav.setActive) MainNav.setActive('wordle');

      var wlListPage = document.getElementById('wlListPage');
      if (!wlListPage) return;

      await new Promise(function(resolve) { requestAnimationFrame(function() { requestAnimationFrame(resolve); }); });

      var bodyHtml = '';
      if (activeLevel) {
        var entries = allEntries.filter(function(e) { return e.levelId === activeLevel; });
        if (entries.length === 0) {
          bodyHtml = '<div class="fe-map-empty">No Wordle levels found for this level.</div>';
        } else {
          bodyHtml = this._buildWordlePathMapHtml(entries, progress, activeLevel);
        }
      } else {
        bodyHtml = this._buildWordleLevelCardsHtml(allEntries, progress);
      }

      if (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.waitMinDuration) {
        await AppLoadingScreen.waitMinDuration(loadingStart);
      }

      wlListPage.innerHTML = bodyHtml;

      if (activeLevel) {
        this._scrollWordlePathToCurrent();
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
      var sidebars = { left: '', right: '' };
      if (typeof BentoGrid !== 'undefined') {
        sidebars = BentoGrid._buildDashboardSidebars(exams);
      }
      var leftSidebarContent = sidebars.left;
      var rightSidebarContent = sidebars.right;

      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="qs-chooser-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="loadDashboard()" aria-label="Back">' + _mi('arrow_back') + '<span class="icon-btn-label">Back</span></button>' +
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
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
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
      if (typeof MainNav !== 'undefined') {
        return MainNav.buildSidebarHtml();
      }
      var currentLevel = AppState.currentLevel || 'C1';
      var lc = _levelColors[currentLevel] || _levelColors['C1'];
      return '<div class="sidebar-widget" style="background:transparent;box-shadow:none;border:none;padding:0;">' +
        '<div class="sidebar-level-badge" data-level="' + currentLevel + '" onclick="BentoGrid.openMobileLevelModal()" style="cursor:pointer;background:' + lc.bg + '">' +
          '<div class="sidebar-level-badge-code" style="color:' + lc.code + '">' + currentLevel + '</div>' +
        '</div></div>';
    },

    _buildRightSidebarHeaderHtml: function() {
      if (typeof MainNav !== 'undefined') {
        return MainNav.buildStatsBarHtml();
      }
      return '';
    },

    _buildProfileCtaSidebarHtml: function() {
      if (typeof AppState !== 'undefined' && AppState.isAuthenticated) return '';

      return '<div class="sw-profile-cta-wrap">' +
        '<img src="Assets/images/asomado.svg" alt="" class="sw-profile-cta-fox" aria-hidden="true">' +
        '<div class="sidebar-widget-duo sw-profile-cta-card">' +
          '<div class="sw-profile-cta-body">' +
            '<p class="sw-profile-cta-text">Create a profile to save your progress!</p>' +
            '<button type="button" class="sw-profile-cta-btn sw-profile-cta-btn--create" onclick="Auth.showRegisterPage()">CREATE PROFILE</button>' +
            '<button type="button" class="sw-profile-cta-btn sw-profile-cta-btn--login" onclick="Auth.showLoginPage()">LOG IN</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    _buildDashboardSidebars: function(exams, options) {
      options = options || {};
      exams = exams || [];
      var left = this._buildLevelSelectorSidebarHtml();
      var right = this._buildRightSidebarHeaderHtml();
      if (options.includeGradeTracker !== false) {
        right += this._buildGradeTrackerSidebarHtml(exams);
      }
      if (options.includeNextLesson) {
        var nextLesson = this._findNextLesson(exams);
        if (nextLesson) right += this._buildNextLessonLeftHtml(nextLesson);
      }
      right += this._buildProfileCtaSidebarHtml();
      return { left: left, right: right };
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
      return '<div class="sidebar-widget-duo sw-next-exam" onclick="Exercise.openPart(\'' + self._escapeHTML(lesson.examId) + '\', \'' + self._escapeHTML(lesson.section) + '\', ' + parseInt(lesson.part, 10) + ')" style="cursor:pointer">' +
        '<div class="sw-duo-header">' +
          '<span class="sw-duo-title">' + 'Next Exam' + '</span>' +
          '<span class="sw-duo-link">CONTINUE</span>' +
        '</div>' +
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
      return '<div class="sidebar-widget-pastel sw-calculator" onclick="openScoreCalculator(event)" aria-label="Open Score Calculator">' +
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

      var allSkills = (typeof ScoreCalculator !== 'undefined' && typeof ScoreCalculator.getSkillsForExamLevel === 'function')
        ? ScoreCalculator.getSkillsForExamLevel(level)
        : ['Reading', 'Use of English', 'Writing', 'Listening', 'Speaking'];
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

      return '<div class="sidebar-widget-duo sw-grade grade-tracker-carousel-widget" data-total-slides="' + totalSlides + '" onclick="BentoGrid.openGradeEvolution()" style="cursor:pointer">' +
        '<div class="sw-duo-header">' +
          '<span class="sw-duo-title">' + 'Grade Tracker' + '</span>' +
          '<span class="sw-duo-link">SEE ALL</span>' +
        '</div>' +
        '<div class="grade-carousel-viewport">' + slidesHtml + '</div>' +
        '<div class="grade-carousel-dots"></div>' +
      '</div>';
    },

    _startGradeCarousel: function() {
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) {
        Dashboard._initStatsPopovers();
      } else if (typeof MainNav !== 'undefined' && MainNav.initStreakPopover) {
        MainNav.initStreakPopover();
      }
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
      var existing = document.querySelector('.bento-streak-modal-overlay');
      if (existing) existing.remove();
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
        ? '<div class="bento-streak-modal-status bento-streak-safe"><span class="bento-streak-status-emoji" aria-hidden="true">🔥</span><span class="bento-streak-status-text">' + 'Streak safe today!' + '</span></div>'
        : (typeof StreakManager !== 'undefined' && StreakManager.isAtRisk && StreakManager.isAtRisk()
          ? '<div class="bento-streak-modal-status bento-streak-risk"><span class="bento-streak-status-emoji" aria-hidden="true">🔥</span><span class="bento-streak-status-text">' + 'Practice now to keep your streak!' + '</span></div>'
          : '<div class="bento-streak-modal-status bento-streak-neutral"><span class="bento-streak-status-emoji" aria-hidden="true">🔥</span><span class="bento-streak-status-text">' + 'Start today\'s practice to build your streak' + '</span></div>');

      var el = document.createElement('div');
      el.className = 'bento-streak-modal-overlay';
      el.innerHTML =
        '<div class="bento-streak-modal">' +
          '<button class="bento-streak-modal-close" type="button" aria-label="Close streak calendar"><span class="material-symbols-outlined">close</span></button>' +
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
      var closeBtn = el.querySelector('.bento-streak-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          el.remove();
        });
      }
    },

    closeStreakSection: function() {
      document.querySelectorAll('.bento-streak-modal-overlay').forEach(function(el) {
        el.remove();
      });
    }
  };
})();
