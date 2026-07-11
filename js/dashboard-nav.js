// js/dashboard-nav.js
// Dashboard navigation shell: home mode cards, section routing, sidebars, and mobile nav.

(function() {
  var _levelColors = {
    'C1': { bg: '#ffffff', label: '#104862', code: '#46B1E1' },
    'B1': { bg: '#fff3e0', label: '#bf360c', code: '#ff9800' },
    'B2': { bg: '#e3f2fd', label: '#0d47a1', code: '#2196f3' },
    'C2': { bg: '#f3e5f5', label: '#4a148c', code: '#9c27b0' }
  };

  window.DashboardNav = {
    render: function(container) {
      if (!container) return;
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];

      var html = '<div class="dashboard-home">';

      if (typeof MainNav !== 'undefined') {
        html += MainNav.buildDesktopModeCardsHtml(exams);
      }

      html += this._renderMobileBottomNav(level);
      html += '</div>';
      container.innerHTML = html;

      if (typeof MainNav !== 'undefined') {
        MainNav.ensureMobileMenuSheet();
        MainNav.setMobileActive('home');
        var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        if (isMobile && MainNav.initMobileStatsPopovers) MainNav.initMobileStatsPopovers();
      }
    },

    _renderMobileBottomNav: function(level) {
      if (typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml) {
        return MainNav.buildMobileBottomNavHtml();
      }
      var _mi = function(n) { return '<span class="material-symbols-outlined">' + n + '</span>'; };
      var profileMarkup = this._buildMobileBottomNavProfileMarkup(_mi);
      return '<nav class="mobile-bottom-nav" aria-label="Mobile dashboard">' +
        '<button type="button" class="mobile-bottom-nav-btn" data-mobile-tab="learning" onclick="DashboardNav.goMobileHome()">' + _mi('menu_book') + '<span>Learning</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn" onclick="DashboardNav.openLessons()">' + _mi('auto_stories') + '<span>Course</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn" onclick="DashboardNav.openTests()">' + _mi('assignment') + '<span>Tests</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn" onclick="DashboardNav.openMobileDictionaries()">' + _mi('menu_book') + '<span>Dict</span></button>' +
        '<button type="button" class="mobile-bottom-nav-btn mobile-bottom-nav-profile" onclick="DashboardNav.openMobileProfile()" aria-label="Account">' + profileMarkup + '</button>' +
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
      var grid = document.querySelector('.dashboard-home');
      if (grid) {
        grid.setAttribute('data-mobile-tab', tab);
      }
      if (typeof MainNav !== 'undefined' && MainNav.setMobileActive) {
        MainNav.setMobileActive(tab === 'home' ? 'home' : tab);
      }
    },

    /** Leave any screen and open Learning at the current stage. */
    goMobileHome: function() {
      if (typeof MainNav !== 'undefined' && MainNav.closeMobileMenu) MainNav.closeMobileMenu();
      if (typeof DashboardNav !== 'undefined' && DashboardNav.openCourseSection) {
        DashboardNav.openCourseSection('learning');
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
        '<button class="mobile-level-modal-close" onclick="DashboardNav.closeMobileLevelModal()" aria-label="Close level picker">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="mobile-level-modal-kicker">Choose level</div>' +
        '<h2 id="mobile-level-title">What are you studying?</h2>' +
        '<div class="mobile-level-modal-options">';

      levels.forEach(function(level) {
        var isActive = level.code === current;
        html += '<button class="mobile-level-option' + (isActive ? ' active' : '') + '" onclick="DashboardNav.selectMobileLevel(\'' + level.code + '\')">' +
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
        if (e.target === modal) DashboardNav.closeMobileLevelModal();
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
        '<button class="mobile-level-modal-close" onclick="DashboardNav.closeMobileLangModal()" aria-label="Close language picker">' +
          '<span class="material-symbols-outlined">close</span>' +
        '</button>' +
        '<div class="mobile-level-modal-kicker">Language</div>' +
        '<h2 id="mobile-lang-title">Instructions &amp; translations</h2>' +
        '<div class="mobile-level-modal-options">';

      langs.forEach(function(lang) {
        var isActive = lang.code === currentLang;
        html += '<button class="mobile-level-option' + (isActive ? ' active' : '') + '" onclick="DashboardNav.selectMobileLang(\'' + lang.code + '\')">' +
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
        if (e.target === modal) DashboardNav.closeMobileLangModal();
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
            var partNum = inProgress[0];
            var storedMode = (typeof Exercise !== 'undefined' && Exercise.detectPartMode)
              ? Exercise.detectPartMode(exam.id, sec, partNum, AppState.currentLevel)
              : 'practice';
            return {
              examId: exam.id,
              section: sec,
              part: partNum,
              mode: storedMode,
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
        DashboardNav.openQuickstepsChooser();
      }
    },

    openVideoExercises: function() {
      if (typeof VideoExercises !== 'undefined') {
        VideoExercises.openHub();
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
        '<button class="' + dailyBtnClass + '" onclick="DashboardNav.openDailyCrossword()">' + dailyBtnLabel + '</button>' +
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
          ' onclick="DashboardNav.openWordleSection(null, \'' + lvl + '\')" role="button" tabindex="0">' +
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
          '<button type="button" class="cw-path-next-level-card" onclick="DashboardNav.openWordleSection(null, \'' + nextLevel + '\')">' +
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
        DashboardNav.openCrosswordList(null, state.levelId === 'mix' ? null : state.levelId);
        return;
      }
      DashboardNav.openCrosswordList();
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
          ' onclick="DashboardNav.openCrosswordList(null, \'' + lvl + '\')" role="button" tabindex="0">' +
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
          '<button type="button" class="cw-path-next-level-card" onclick="DashboardNav.openCrosswordList(null, \'' + nextLevel + '\')">' +
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
      if (typeof DashboardNav !== 'undefined') {
        leftSidebarContent = DashboardNav._buildDashboardSidebars(exams).left;
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
              '<div class="cw-section-header-text">' +
                (activeLevel
                  ? '<div class="cw-section-title">' + (LEVEL_META[activeLevel] || LEVEL_META['B2']).difficulty + ' Crosswords</div>'
                  : '<div class="cw-section-title">Choose a Level</div>') +
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
      if (typeof DashboardNav !== 'undefined') {
        leftSidebarContent = DashboardNav._buildDashboardSidebars(exams).left;
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
              '<div class="cw-section-header-text">' +
                (activeLevel
                  ? '<div class="cw-section-title">' + (LEVEL_META[activeLevel] || LEVEL_META['B2']).difficulty + ' Wordle</div>'
                  : '<div class="cw-section-title">Choose a Level</div>') +
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
        buttonsHtml += '<button class="qs-category-btn" onclick="DashboardNav._startQuicksteps(\'' + cat.id + '\')">' +
          '<span class="qs-category-icon">' + _mi(cat.icon) + '</span>' +
          '<div class="qs-category-info">' +
            '<div class="qs-category-name">' + cat.name + '</div>' +
            '<div class="qs-category-desc">' + cat.desc + '</div>' +
          '</div>' +
        '</button>';
      });

      // Build sidebars like main dashboard
      var sidebars = { left: '', right: '' };
      if (typeof DashboardNav !== 'undefined') {
        sidebars = DashboardNav._buildDashboardSidebars(exams);
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
      if (typeof DashboardNav !== 'undefined') {
        DashboardNav._startGradeCarousel();
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
      return '<div class="sidebar-widget-pastel sw-streak" onclick="DashboardNav.openStreakSection()" style="cursor:pointer">' +
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

      return '<div class="sidebar-widget-pastel sw-calendar" onclick="DashboardNav.openStreakSection()" style="cursor:pointer">' +
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
        '<div class="sidebar-level-badge" data-level="' + currentLevel + '" onclick="DashboardNav.openMobileLevelModal()" style="cursor:pointer;background:' + lc.bg + '">' +
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
      var lessonMode = lesson.mode || 'practice';
      var self = this;
      return '<div class="sidebar-widget-duo sw-next-exam" onclick="Exercise.openPart(\'' + self._escapeHTML(lesson.examId) + '\', \'' + self._escapeHTML(lesson.section) + '\', ' + parseInt(lesson.part, 10) + ', \'' + lessonMode + '\')" style="cursor:pointer">' +
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
      return '<div class="sidebar-widget" onclick="DashboardNav.openMicroLearning()" style="cursor:pointer">' +
        '<div class="sidebar-widget-title"><span class="material-symbols-outlined">smartphone</span> ' + 'Micro-Learning' + '</div>' +
        '<div style="color:#64748b;font-size:0.85rem;margin-bottom:12px;">' + 'Vocab · Transformations · MC' + '</div>' +
        '<button class="bento-resume-btn" style="width:100%;justify-content:center;" onclick="event.stopPropagation();DashboardNav.openMicroLearning()">' + 'Start →' + '</button>' +
      '</div>';
    },

    _buildCalculatorSidebarHtml: function() {
      if (typeof ScoreCalculator === 'undefined') return '';
      return '<div class="sidebar-widget-pastel sw-calculator" onclick="openScoreCalculator(event)" aria-label="Open Score Calculator">' +
        '<span class="material-symbols-outlined sw-calculator-icon">calculate</span>' +
      '</div>';
    },

    _gradeSkillMeta: function(skill) {
      var map = {
        'Reading': { icon: 'menu_book', color: '#1cb0f6' },
        'Use of English': { icon: 'spellcheck', color: '#ce82ff' },
        'Writing': { icon: 'edit_note', color: '#58cc02' },
        'Listening': { icon: 'headphones', color: '#ff9600' },
        'Speaking': { icon: 'record_voice_over', color: '#ff4b4b' }
      };
      return map[skill] || { icon: 'description', color: '#1cb0f6' };
    },

    _gradeCarouselNavIconHtml: function(skill) {
      var meta = DashboardNav._gradeSkillMeta(skill);
      return '<span class="grade-carousel-nav-icon" style="--grade-skill-color:' + meta.color + '">' +
        '<span class="material-symbols-outlined" aria-hidden="true">' + meta.icon + '</span>' +
      '</span>';
    },

    _updateGradeCarouselNav: function(widget) {
      var total = parseInt(widget.getAttribute('data-total-slides'), 10) || 1;
      if (total <= 1) return;
      var current = parseInt(widget.getAttribute('data-current-slide'), 10) || 0;
      var slides = widget.querySelectorAll('.grade-carousel-slide');
      var prevIdx = (current - 1 + total) % total;
      var nextIdx = (current + 1) % total;
      var prevSkill = slides[prevIdx] && slides[prevIdx].getAttribute('data-skill');
      var nextSkill = slides[nextIdx] && slides[nextIdx].getAttribute('data-skill');
      var prevBtn = widget.querySelector('.grade-carousel-prev');
      var nextBtn = widget.querySelector('.grade-carousel-next');

      if (prevBtn && prevSkill) {
        prevBtn.innerHTML = DashboardNav._gradeCarouselNavIconHtml(prevSkill);
        prevBtn.setAttribute('aria-label', 'Previous skill: ' + prevSkill);
      }
      if (nextBtn && nextSkill) {
        nextBtn.innerHTML = DashboardNav._gradeCarouselNavIconHtml(nextSkill);
        nextBtn.setAttribute('aria-label', 'Next skill: ' + nextSkill);
      }
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
          '<div class="grade-carousel-slide" style="display:flex" data-skill="' + DashboardNav._escapeHTML(skill) + '">' +
            '<div class="grade-carousel-content">' +
              '<div class="grade-carousel-data">' +
                '<div class="grade-carousel-raw">' + (hasData ? avgScale : '–') + '</div>' +
                '<div class="grade-carousel-cefr' + (cefrText === '–' ? ' grade-carousel-cefr-dash' : '') + '">' + cefrText + '</div>' +
                '<div class="grade-carousel-skill-label"><span>' + skill + '</span></div>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
      });

      var slidesHtml = '';
      if (slides.length === 0) {
        slidesHtml = '<div class="grade-carousel-slide" style="display:flex;opacity:0.6">' +
          '<div class="grade-carousel-content grade-carousel-content--empty">' +
            '<div class="grade-carousel-data">' +
              '<div class="grade-carousel-raw">–</div>' +
              '<div class="grade-carousel-skill-label"><span>' + 'Complete exercises to see results' + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      } else {
        slides.forEach(function(s, idx) {
          slidesHtml += s.replace('display:flex', idx === 0 ? 'display:flex' : 'display:none');
        });
      }

      var totalSlides = slides.length || 1;
      var showNav = totalSlides > 1;
      var prevSkill = showNav ? allSkills[(totalSlides - 1) % totalSlides] : '';
      var nextSkill = showNav ? allSkills[1 % totalSlides] : '';

      return '<div class="sidebar-widget-duo sw-grade grade-tracker-carousel-widget" data-total-slides="' + totalSlides + '">' +
        '<div class="sw-duo-header">' +
          '<span class="sw-duo-title">' + 'Grade Tracker' + '</span>' +
          '<button type="button" class="sw-duo-link grade-tracker-see-all" onclick="DashboardNav.openGradeEvolution()">SEE ALL<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>' +
        '</div>' +
        '<div class="grade-carousel-shell' + (showNav ? '' : ' grade-carousel-shell--single') + '">' +
          (showNav ? '<button type="button" class="grade-carousel-nav grade-carousel-prev" aria-label="Previous skill: ' + DashboardNav._escapeHTML(prevSkill) + '">' + DashboardNav._gradeCarouselNavIconHtml(prevSkill) + '</button>' : '') +
          '<div class="grade-carousel-viewport" onclick="DashboardNav.openGradeEvolution()" role="button" tabindex="0" aria-label="Open grade evolution">' + slidesHtml + '</div>' +
          (showNav ? '<button type="button" class="grade-carousel-nav grade-carousel-next" aria-label="Next skill: ' + DashboardNav._escapeHTML(nextSkill) + '">' + DashboardNav._gradeCarouselNavIconHtml(nextSkill) + '</button>' : '') +
        '</div>' +
        '<div class="grade-carousel-dots"></div>' +
      '</div>';
    },

    _goGradeCarouselSlide: function(widget, targetIdx) {
      var total = parseInt(widget.getAttribute('data-total-slides'), 10) || 1;
      if (total <= 1) return 0;
      var slides = widget.querySelectorAll('.grade-carousel-slide');
      var dots = widget.querySelectorAll('.grade-carousel-dot');
      if (!slides.length) return 0;

      var current = parseInt(widget.getAttribute('data-current-slide'), 10) || 0;
      var next = ((targetIdx % total) + total) % total;

      slides[current].style.display = 'none';
      if (dots[current]) dots[current].classList.remove('active');

      slides[next].style.display = 'flex';
      if (dots[next]) dots[next].classList.add('active');

      widget.setAttribute('data-current-slide', next);
      DashboardNav._updateGradeCarouselNav(widget);
      return next;
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
      if (!total) return;

      widget.setAttribute('data-current-slide', '0');

      // Build dots
      var dotsContainer = widget.querySelector('.grade-carousel-dots');
      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        if (total > 1) {
          for (var i = 0; i < total; i++) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'grade-carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('data-idx', i);
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dotsContainer.appendChild(dot);
          }
        }
      }

      var restartTimer = function() {
        if (DashboardNav._gradeCarouselTimer) clearInterval(DashboardNav._gradeCarouselTimer);
        if (total <= 1) return;
        DashboardNav._gradeCarouselTimer = setInterval(function() {
          var current = parseInt(widget.getAttribute('data-current-slide'), 10) || 0;
          DashboardNav._goGradeCarouselSlide(widget, current + 1);
        }, 4000);
      };

      var prevBtn = widget.querySelector('.grade-carousel-prev');
      var nextBtn = widget.querySelector('.grade-carousel-next');
      if (prevBtn && !prevBtn._gradeNavBound) {
        prevBtn._gradeNavBound = true;
        prevBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var current = parseInt(widget.getAttribute('data-current-slide'), 10) || 0;
          DashboardNav._goGradeCarouselSlide(widget, current - 1);
          restartTimer();
        });
      }
      if (nextBtn && !nextBtn._gradeNavBound) {
        nextBtn._gradeNavBound = true;
        nextBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var current = parseInt(widget.getAttribute('data-current-slide'), 10) || 0;
          DashboardNav._goGradeCarouselSlide(widget, current + 1);
          restartTimer();
        });
      }
      if (dotsContainer && !dotsContainer._gradeNavBound) {
        dotsContainer._gradeNavBound = true;
        dotsContainer.addEventListener('click', function(e) {
          var dot = e.target.closest('.grade-carousel-dot');
          if (!dot) return;
          e.preventDefault();
          e.stopPropagation();
          var idx = parseInt(dot.getAttribute('data-idx'), 10);
          if (isNaN(idx)) return;
          DashboardNav._goGradeCarouselSlide(widget, idx);
          restartTimer();
        });
      }

      DashboardNav._updateGradeCarouselNav(widget);
      restartTimer();
    },

    _buildNextLessonSidebarHtml: function(lesson) {
      var completedParts = lesson.completedParts || 0;
      var totalParts = lesson.totalParts || 1;
      var sectionIcon = { reading: 'menu_book', listening: 'headphones', writing: 'edit_note', speaking: 'record_voice_over' };
      var icon = sectionIcon[lesson.section] || 'auto_stories';
      var lessonMode = lesson.mode || 'practice';
      var self = this;
      return '<div class="sidebar-widget" onclick="Exercise.openPart(\'' + self._escapeHTML(lesson.examId) + '\', \'' + lesson.section + '\', ' + lesson.part + ', \'' + lessonMode + '\')" style="cursor:pointer">' +
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
