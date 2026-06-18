// js/dashboard.js
(function() {
  var subpageCurrentPage = 1;
  var TESTS_PER_PAGE = 5;
  var subpageView = 'byTest';       // 'byTest' | 'bySection'
  var subpageSectionKey = null;     // null = tiles view; 'reading' | 'listening' | 'writing' | 'speaking'
  var sectionCurrentPage = 1;
  var SECTION_ITEMS_PER_PAGE = 4;
  var leftSidebarCollapsed = false;
  var rightSidebarCollapsed = false;
  var LEFT_SIDEBAR_WIDTH = '256px';

  try {
    leftSidebarCollapsed = localStorage.getItem('cambridge_dashboard_sidebar_left') === '1';
    rightSidebarCollapsed = localStorage.getItem('cambridge_dashboard_sidebar_right') === '1';
  } catch (e) {}

  window.Dashboard = {
    /** Display title for "By Exercise Type" section drill-down (mobile Mileast header). */
    _sectionExDisplayTitle: function(sectionKey) {
      var isB1 = typeof AppState !== 'undefined' && AppState.currentLevel === 'B1';
      if (sectionKey === 'reading') return isB1 ? 'Reading' : 'READING & UOE';
      if (!sectionKey) return '';
      return sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
    },

    _formatSectionProgress: function(examId, sectionKey, section) {
      var display = (typeof ScoreCalculator !== 'undefined' && ScoreCalculator.getSectionScaleDisplay)
        ? ScoreCalculator.getSectionScaleDisplay(examId, sectionKey, section)
        : { type: 'progress', value: ((section.completed || []).length) + '/' + (section.total || 0) };
      if (display.type === 'scale') {
        return '<span class="section-progress section-progress--scale" title="Cambridge scale">' + display.value + '</span>';
      }
      return '<span class="section-progress">' + display.value + '</span>';
    },

    _renderCenterHeader: function(title, subtitle) {
      return '<div class="dashboard-center-header">' +
        '<h1 class="dashboard-center-title">' + title + '</h1>' +
        (subtitle ? '<p class="dashboard-center-subtitle">' + subtitle + '</p>' : '') +
      '</div>';
    },

    _initStatsPopovers: function() {
      if (typeof MainNav === 'undefined') return;
      var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        if (MainNav.initMobileStatsPopovers) MainNav.initMobileStatsPopovers();
      } else {
        if (MainNav.initStreakPopover) MainNav.initStreakPopover();
        if (MainNav.initLangPopover) MainNav.initLangPopover();
        if (MainNav.initDictPopover) MainNav.initDictPopover();
      }
      if (MainNav.ensureMobileMenuSheet) MainNav.ensureMobileMenuSheet();
    },

    _renderSidebarShell: function(side, shellId, contentId, contentHtml) {
      return '<div class="dashboard-' + side + '-sidebar dashboard-sidebar-shell" id="' + shellId + '">' +
        '<div class="dashboard-sidebar-content" id="' + contentId + '">' + (contentHtml || '') + '</div>' +
      '</div>';
    },

    _applySidebarState: function() {
      document.querySelectorAll('.dashboard-sidebar-shell').forEach(function(shell) {
        shell.classList.remove('is-collapsed');
      });

      if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
        document.querySelectorAll('.dashboard-layout').forEach(function(layout) {
          layout.style.removeProperty('grid-template-columns');
        });
        var mobileContainer = document.querySelector('.app-container');
        if (mobileContainer) mobileContainer.style.removeProperty('padding-left');
        return;
      }

      var appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.style.removeProperty('padding-left');
      }

      document.querySelectorAll('.dashboard-layout').forEach(function(layout) {
        var hasLeft = !!layout.querySelector('.dashboard-left-sidebar');
        var hasRight = !!layout.querySelector('.dashboard-right-sidebar');
        var isRightClosed = layout.classList.contains('dashboard-layout-right-closed');
        var isPlayLayout = layout.classList.contains('dashboard-layout--crossword-play');

        layout.style.removeProperty('grid-template-columns');

        if (isRightClosed || isPlayLayout || !hasRight) {
          if (hasLeft && appContainer && !layout.classList.contains('dashboard-layout--lesson-focus')) {
            appContainer.style.paddingLeft = LEFT_SIDEBAR_WIDTH;
          } else if (layout.classList.contains('dashboard-layout--lesson-focus') && appContainer) {
            appContainer.style.paddingLeft = '0';
          }
          return;
        }

        if (hasLeft && appContainer && !layout.classList.contains('dashboard-layout--lesson-focus')) {
          appContainer.style.paddingLeft = LEFT_SIDEBAR_WIDTH;
        } else if (layout.classList.contains('dashboard-layout--lesson-focus') && appContainer) {
          appContainer.style.paddingLeft = '0';
        }
      });
    },

    toggleSidebar: function(side) {
      if (side === 'left') {
        leftSidebarCollapsed = !leftSidebarCollapsed;
        try { localStorage.setItem('cambridge_dashboard_sidebar_left', leftSidebarCollapsed ? '1' : '0'); } catch (e) {}
      } else {
        rightSidebarCollapsed = !rightSidebarCollapsed;
        try { localStorage.setItem('cambridge_dashboard_sidebar_right', rightSidebarCollapsed ? '1' : '0'); } catch (e) {}
      }
      this._applySidebarState();
    },

    render: function(expandExamId) {
      const content = document.getElementById('main-content');
      if (!content) return;
      if (typeof Landing !== 'undefined') Landing.hide();
      var app = document.getElementById('app');
      if (app) app.style.display = '';
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      AppState.currentView = 'dashboard';
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();
      
      const level = AppState.currentLevel || 'C1';
      const exams = window.EXAMS_DATA[level] || [];
      
      // Build sidebar content
      var sidebars = { left: '', right: '' };
      if (typeof BentoGrid !== 'undefined') {
        sidebars = BentoGrid._buildDashboardSidebars(exams, { includeNextLesson: true });
      }
      var leftSidebarContent = sidebars.left;
      var rightSidebarContent = sidebars.right;

      var html = '<div class="dashboard-layout">' +
        this._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent) +
        '<div class="dashboard-center">' +
          (typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml ? MainNav.buildMobileTopBarHtml() : '') +
          this._renderCenterHeader('Home', 'Your learning dashboard for ' + level) +
          '<div class="bento-center-wrapper">' +
            '<div id="bento-grid-container"></div>' +
          '</div>' +
        '</div>' +
        this._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent) +
      '</div>';

      content.innerHTML = html;
      this._applySidebarState();

      // Render bento grid into its container after DOM is updated
      if (typeof BentoGrid !== 'undefined') {
        const bentoContainer = document.getElementById('bento-grid-container');
        if (bentoContainer) BentoGrid.render(bentoContainer);
        BentoGrid._startGradeCarousel();
      }
      if (typeof MainNav !== 'undefined') {
        this._initStatsPopovers();
        MainNav.setMobileActive('home');
      }
      if (typeof AppLoadingScreen !== 'undefined') AppLoadingScreen.hide();
    },

    // keepPage: if true, do not reset pagination to page 1
    renderSubpage: function(mode, expandExamId, keepPage) {
      AppState.currentMode = mode;
      AppState.currentView = 'subpage';
      localStorage.setItem('preferred_mode', mode);
      if (typeof App !== 'undefined') App.restoreExamStatuses();

      const content = document.getElementById('main-content');
      if (!content) return;
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();

      const level = AppState.currentLevel || 'C1';
      const exams = window.EXAMS_DATA[level] || [];

      var modeConfig = mode === 'exam'
        ? { title: 'Test Simulation', subtitle: 'Timed exam mode' }
        : { title: 'Test Practice', subtitle: 'No limits. Safe space.' };

      var subpageHeader = '<div class="subpage-header">' +
        '<button class="subpage-back-btn" onclick="loadDashboard()" aria-label="Back"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span class="icon-btn-label">Back</span></button>' +
        '<div>' +
          '<div class="subpage-title">' + modeConfig.title + '</div>' +
          '<div class="subpage-subtitle">' + modeConfig.subtitle + '</div>' +
        '</div>' +
      '</div>';

      var isGuest = AppState.isGuest;
      var hasExamsPack = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasExamsPack()
        : !!AppState.hasExamsPack;

      // Premium upgrade banner (hidden in promotion mode)
      var premiumBannerHtml = '';
      if (!hasExamsPack && !(typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI())) {
        premiumBannerHtml = this._renderPremiumBanner();
      }

      // View toggle (only in practice mode)
      var viewToggleHtml = '';
      if (mode !== 'exam') {
        var byTestActive = subpageView === 'byTest' ? ' active' : '';
        var bySectionActive = subpageView === 'bySection' ? ' active' : '';
        viewToggleHtml =
          '<div class="subpage-view-toggle">' +
            '<button class="subpage-view-btn' + byTestActive + '" onclick="Dashboard.setSubpageView(\'byTest\', \'' + mode + '\')">' +
              '<i class="fas fa-list"></i> ' + 'By Test' +
            '</button>' +
            '<button class="subpage-view-btn' + bySectionActive + '" onclick="Dashboard.setSubpageView(\'bySection\', \'' + mode + '\')">' +
              '<span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle">category</span> ' + 'By Exercise Type' +
            '</button>' +
          '</div>';
      }

      // Main content area depends on active view
      var mainContentHtml = '';
      if (mode === 'exam' || subpageView === 'byTest') {
        // ── By Test view (existing behaviour) ───────────────────────────
        var totalPages = Math.ceil(exams.length / TESTS_PER_PAGE);
        if (expandExamId) {
          var expandIdx = exams.findIndex(function(e) { return e.id === expandExamId; });
          if (expandIdx !== -1) {
            subpageCurrentPage = Math.floor(expandIdx / TESTS_PER_PAGE) + 1;
          }
        } else if (!keepPage) {
          subpageCurrentPage = 1;
        }
        if (subpageCurrentPage < 1) subpageCurrentPage = 1;
        if (subpageCurrentPage > totalPages) subpageCurrentPage = totalPages || 1;

        var pageStart = (subpageCurrentPage - 1) * TESTS_PER_PAGE;
        var pageExams = exams.slice(pageStart, pageStart + TESTS_PER_PAGE);

        var examListHtml = '';
        pageExams.forEach(function(exam, idx) {
          var globalIdx = pageStart + idx;
          if (exam.status === 'coming_soon') {
            examListHtml += Dashboard.renderComingSoonExam(exam);
          } else if (!hasExamsPack && globalIdx > 0) {
            examListHtml += Dashboard._renderGuestLockedExam(exam);
          } else {
            examListHtml += Dashboard.renderAvailableExam(exam, expandExamId);
          }
        });

        var paginationHtml = '';
        if (totalPages > 1) {
          paginationHtml = '<div class="subpage-pagination">';
          for (var p = 1; p <= totalPages; p++) {
            var activeClass = p === subpageCurrentPage ? ' active' : '';
            paginationHtml += '<button class="pagination-btn' + activeClass + '" onclick="Dashboard.goToSubpagePage(' + p + ', \'' + mode + '\')">' + p + '</button>';
          }
          paginationHtml += '</div>';
        }

        mainContentHtml = Dashboard._renderRandomTestCard(mode) + '<div class="exams-container">' + examListHtml + '</div>' + paginationHtml;
      } else {
        // ── By Section view ──────────────────────────────────────────────
        if (subpageSectionKey) {
          mainContentHtml = this._renderSectionExerciseList(exams, subpageSectionKey, isGuest);
        } else {
          mainContentHtml = this._renderBySectionTiles();
        }
      }

      var sidebars = { left: '', right: '' };
      if (typeof BentoGrid !== 'undefined') {
        sidebars = BentoGrid._buildDashboardSidebars(exams);
      }
      var leftSidebarContent = sidebars.left;
      var rightSidebarContent = sidebars.right;

      var mobileNavHtml =
        typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml
          ? MainNav.buildMobileBottomNavHtml()
          : (typeof BentoGrid !== 'undefined'
            ? BentoGrid._renderMobileBottomNav(AppState.currentLevel || 'C1')
            : '');

      var mobileTopBarHtml =
        typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml
          ? MainNav.buildMobileTopBarHtml()
          : '';

      var html = '<div class="dashboard-layout">' +
        this._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent) +
        '<div class="dashboard-center dashboard-center--subpage">' +
          mobileTopBarHtml +
          subpageHeader +
          premiumBannerHtml +
          viewToggleHtml +
          mainContentHtml +
          mobileNavHtml +
        '</div>' +
        this._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent) +
      '</div>';

      content.innerHTML = html;
      this._applySidebarState();
      if (typeof BentoGrid !== 'undefined') {
        BentoGrid._startGradeCarousel();
        if (typeof MainNav !== 'undefined' && MainNav.setMobileActive) {
          MainNav.setMobileActive('tests');
        }
      }
      this._initStatsPopovers();
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();
    },

    goToSubpagePage: function(page, mode) {
      subpageCurrentPage = page;
      this.renderSubpage(mode || AppState.currentMode, null, true);
    },

    setSubpageView: function(view, mode) {
      subpageView = view;
      subpageSectionKey = null;
      subpageCurrentPage = 1;
      this.renderSubpage(mode || AppState.currentMode, null, false);
    },

    goToSectionView: function(sectionKey, mode) {
      subpageSectionKey = sectionKey;
      sectionCurrentPage = 1;
      this.renderSubpage(mode || AppState.currentMode, null, true);
    },

    backToSectionTiles: function(mode) {
      subpageSectionKey = null;
      sectionCurrentPage = 1;
      this.renderSubpage(mode || AppState.currentMode, null, true);
    },

    goToSectionPage: function(page, mode) {
      sectionCurrentPage = page;
      this.renderSubpage(mode || AppState.currentMode, null, true);
    },

    // ── By-Section tiles ────────────────────────────────────────────────
    _renderBySectionTiles: function() {
      var mode = AppState.currentMode || 'practice';
      var isB1 = typeof AppState !== 'undefined' && AppState.currentLevel === 'B1';
      var readingTileLabel = isB1 ? 'Reading' : 'READING & UOE';
      var sections = [
        { key: 'reading',   icon: 'menu_book',        label: readingTileLabel },
        { key: 'listening', icon: 'headphones',        label: 'Listening' },
        { key: 'writing',   icon: 'edit_note',         label: 'Writing' },
        { key: 'speaking',  icon: 'record_voice_over', label: 'Speaking' }
      ];
      var html = '<div class="section-type-tiles">';
      sections.forEach(function(s) {
        html +=
          '<div class="section-type-tile ' + s.key + '" onclick="Dashboard.goToSectionView(\'' + s.key + '\', \'' + mode + '\')">' +
            '<span class="material-symbols-outlined section-type-tile-icon">' + s.icon + '</span>' +
            '<span class="section-type-tile-label">' + s.label + '</span>' +
            '<i class="fas fa-chevron-right section-type-tile-arrow"></i>' +
          '</div>';
      });
      html += '</div>';
      return html;
    },

    // ── Section exercise list (paginated by section type) ──────────
    _renderSectionExerciseList: function(exams, sectionKey, isGuest) {
      var mode = AppState.currentMode || 'practice';
      var hasExamsPack = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasExamsPack()
        : !!AppState.hasExamsPack;

      // Pagination
      var totalPages = Math.ceil(exams.length / SECTION_ITEMS_PER_PAGE);
      if (sectionCurrentPage < 1) sectionCurrentPage = 1;
      if (sectionCurrentPage > totalPages) sectionCurrentPage = totalPages || 1;
      var pageStart = (sectionCurrentPage - 1) * SECTION_ITEMS_PER_PAGE;
      var pageExams = exams.slice(pageStart, pageStart + SECTION_ITEMS_PER_PAGE);

      var html =
        '<div class="section-ex-header">' +
          '<button class="section-ex-back-btn" onclick="Dashboard.backToSectionTiles(\'' + mode + '\')">' +
            '<i class="fas fa-arrow-left"></i>' +
          '</button>' +
          '<span class="material-symbols-outlined section-icon ' + sectionKey + '">' + Utils.getMaterialIcon(sectionKey) + '</span>' +
          '<span class="section-ex-title">' + Dashboard._sectionExDisplayTitle(sectionKey) + '</span>' +
        '</div>' +
        '<div class="exams-container">';

      pageExams.forEach(function(exam, idx) {
        var globalIdx = pageStart + idx;
        if (exam.status === 'coming_soon') {
          html += Dashboard._renderSectionExComingSoon(exam);
        } else if (!hasExamsPack && globalIdx > 0) {
          html += Dashboard._renderSectionExGuestLocked(exam, sectionKey);
        } else {
          html += Dashboard._renderSectionExItem(exam, sectionKey, isGuest);
        }
      });

      html += '</div>';

      if (totalPages > 1) {
        html += '<div class="subpage-pagination">';
        for (var p = 1; p <= totalPages; p++) {
          var activeClass = p === sectionCurrentPage ? ' active' : '';
          html += '<button class="pagination-btn' + activeClass + '" onclick="Dashboard.goToSectionPage(' + p + ', \'' + mode + '\')">' + p + '</button>';
        }
        html += '</div>';
      }

      return html;
    },

    _renderSectionExComingSoon: function(exam) {
      return '<div class="exam-item">' +
        '<div class="exam-header">' +
          '<div class="exam-header-left">' +
            '<span class="exam-number">' + exam.number + '</span>' +
            '<div>' +
              '<div class="exam-title">Test ' + exam.number + '</div>' +
              '<div class="exam-subtitle">' + 'Coming soon' + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="exam-progress-badge"><i class="fas fa-clock"></i> ' + 'Coming soon' + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderSectionExGuestLocked: function(exam, sectionKey) {
      var isAuth = !!AppState.isAuthenticated;
      var action = isAuth ? 'Dashboard.showExamsUpgradeGate()' : 'Dashboard.showGuestGate()';
      var subtitle = isAuth ? 'Pack Exams required' : 'Sign in to access';
      return '<div class="exam-item guest-exam-locked" onclick="' + action + '">' +
        '<div class="exam-header">' +
          '<div class="exam-header-left">' +
            '<span class="exam-number">' + exam.number + '</span>' +
            '<div>' +
              '<div class="exam-title">Test ' + exam.number + '</div>' +
              '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>' + subtitle + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="exam-progress-badge"><i class="fas fa-lock"></i> ' + 'Upgrade' + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderSectionExItem: function(exam, sectionKey, isGuest) {
      var section = exam.sections[sectionKey];
      if (!section) return '';

      var isWritingSpeaking = sectionKey === 'writing' || sectionKey === 'speaking';
      if (isWritingSpeaking && !AppState.isAuthenticated) {
        return '<div class="exam-item guest-exam-locked" onclick="Auth._showAuthModal()">' +
          '<div class="exam-header">' +
            '<div class="exam-header-left">' +
              '<span class="exam-number">' + exam.number + '</span>' +
              '<div>' +
                '<div class="exam-title">Test ' + exam.number + '</div>' +
                '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>' + 'Sign in required' + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="exam-progress-badge"><i class="fas fa-lock"></i></div>' +
          '</div>' +
        '</div>';
      }
      if (isWritingSpeaking && typeof AccessControl !== 'undefined') {
        if (!AccessControl.canAccessWritingSpeaking().allowed) {
          return '<div class="exam-item guest-exam-locked" onclick="Auth._showAuthModal()">' +
            '<div class="exam-header">' +
              '<div class="exam-header-left">' +
                '<span class="exam-number">' + exam.number + '</span>' +
                '<div>' +
                  '<div class="exam-title">Test ' + exam.number + '</div>' +
                  '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>Sign in required</div>' +
                '</div>' +
              '</div>' +
              '<div class="exam-progress-badge"><i class="fas fa-lock"></i></div>' +
            '</div>' +
          '</div>';
        }
        if (AccessControl.isWritingSpeakingSectionLocked(sectionKey)) {
          var lockAction = AccessControl.isPromotionMode()
            ? 'AccessControl.showRateLimitModal({ feature: \'' + sectionKey + '\' })'
            : 'Dashboard.showExamsUpgradeGate()';
          return '<div class="exam-item guest-exam-locked" onclick="' + lockAction + '">' +
            '<div class="exam-header">' +
              '<div class="exam-header-left">' +
                '<span class="exam-number">' + exam.number + '</span>' +
                '<div>' +
                  '<div class="exam-title">Test ' + exam.number + '</div>' +
                  '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>Daily limit reached</div>' +
                '</div>' +
              '</div>' +
              '<div class="exam-progress-badge"><i class="fas fa-lock"></i></div>' +
            '</div>' +
          '</div>';
        }
      } else if (isWritingSpeaking && AppState.isAuthenticated && !AppState.hasExamsPack) {
        var trialKey = sectionKey === 'writing' ? 'cambridge_free_writing_used' : 'cambridge_free_speaking_used';
        var trialUsed = !!localStorage.getItem(trialKey);
        if (trialUsed) {
          return '<div class="exam-item guest-exam-locked" onclick="Dashboard.showExamsUpgradeGate()">' +
            '<div class="exam-header">' +
              '<div class="exam-header-left">' +
                '<span class="exam-number">' + exam.number + '</span>' +
                '<div>' +
                  '<div class="exam-title">Test ' + exam.number + '</div>' +
                  '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>Pack Exams required</div>' +
                '</div>' +
              '</div>' +
              '<div class="exam-progress-badge"><i class="fas fa-lock"></i></div>' +
            '</div>' +
          '</div>';
        }
      }

      var html =
        '<div class="exam-item section-ex-item">' +
          '<div class="section-ex-item-header">' +
            '<span class="exam-number">' + exam.number + '</span>' +
            '<div class="section-ex-item-info">' +
              '<div class="exam-title">Test ' + exam.number + '</div>' +
              this._formatSectionProgress(exam.id, sectionKey, section) +
            '</div>' +
            '<button class="section-play" onclick="event.stopPropagation(); Exercise.startFullSection(\'' + exam.id + '\', \'' + sectionKey + '\')" title="' + ('Start' || 'Start') + '">' +
              '<i class="fas fa-play"></i>' +
            '</button>' +
            '<button class="section-results-btn" onclick="event.stopPropagation(); ScoreCalculator.showSectionResults(\'' + exam.id + '\', \'' + sectionKey + '\')" title="' + ('Section Results' || 'Section Results') + '">' +
              '<i class="fas fa-chart-bar"></i>' +
            '</button>' +
          '</div>' +
          '<div class="section-parts">';

      for (var i = 1; i <= section.total; i++) {
        var statusClass = '';
        if (section.completed.includes(i)) statusClass = 'completed';
        else if (section.inProgress.includes(i)) statusClass = 'in-progress';
        html += '<span class="part-number ' + statusClass + '" onclick="event.stopPropagation(); Exercise.openPart(\'' + exam.id + '\', \'' + sectionKey + '\', ' + i + ')">' + i + '</span>';
      }

      html += '</div></div>';
      return html;
    },
    
    // ── Random Test card (always shown at top of test list) ──────────────
    _renderRandomTestCard: function(mode) {
      var hasExams = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasExamsPack()
        : !!AppState.hasExamsPack;
      if (!hasExams) {
        return '<div class="exam-item guest-exam-locked" onclick="Dashboard.showExamsUpgradeGate()">' +
          '<div class="exam-header">' +
            '<div class="exam-header-left">' +
              '<span class="exam-number exam-number-random"><span class="material-symbols-outlined" style="font-size:1.1rem;line-height:1">shuffle</span></span>' +
              '<div>' +
                '<div class="exam-title">Random Test</div>' +
                '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>Pack Exams required</div>' +
              '</div>' +
            '</div>' +
            '<div class="exam-progress-badge"><i class="fas fa-lock"></i> Upgrade</div>' +
          '</div>' +
        '</div>';
      }
      var plan         = window.MixedTest ? MixedTest.getStoredPlan() : null;
      var completedSet = window.MixedTest ? MixedTest.getCompletedSet() : new Set();
      var hasPlan      = Array.isArray(plan) && plan.length > 0;

      var html =
        '<div class="exam-item random-test-item">' +
          '<div class="exam-header" onclick="Dashboard.toggleExam(this)">' +
            '<div class="exam-header-left">' +
              '<span class="exam-number exam-number-random">' +
                '<span class="material-symbols-outlined" style="font-size:1.1rem;line-height:1">shuffle</span>' +
              '</span>' +
              '<div>' +
                '<div class="exam-title">Random Test</div>' +
                '<div class="exam-subtitle">' + (hasPlan ? 'Exercises from available tests' : 'No test generated yet') + '</div>' +
              '</div>' +
            '</div>' +
            '<button class="exam-play-btn random-test-btn-generate" ' +
              'onclick="event.stopPropagation(); MixedTest.generateNew()" ' +
              'title="Generate a new random test">' +
              '<span class="material-symbols-outlined" style="font-size:1.1rem">shuffle</span>' +
            '</button>' +
            (hasPlan
              ? '<button class="exam-play-btn random-test-btn-repeat" ' +
                  'onclick="event.stopPropagation(); MixedTest.restart()" ' +
                  'title="Repeat this random test">' +
                  '<i class="fas fa-redo-alt"></i>' +
                '</button>'
              : '') +
            '<i class="fas fa-chevron-down exam-arrow"></i>' +
          '</div>' +
          '<div class="exam-content">' +
            '<div class="exam-sections">' +
              (hasPlan
                ? this._renderRandomTestSections(plan, completedSet)
                : '<div class="random-test-empty">Click <span class="material-symbols-outlined" style="font-size:0.9rem;vertical-align:middle">shuffle</span> to generate a Random Test</div>') +
            '</div>' +
          '</div>' +
        '</div>';

      return html;
    },

    _renderRandomTestSections: function(plan, completedSet) {
      var sections = ['reading', 'listening', 'writing', 'speaking'];
      var html = '';

      sections.forEach(function(sectionKey) {
        var items = [];
        plan.forEach(function(item, idx) {
          if (item.section === sectionKey) items.push({ item: item, idx: idx });
        });
        if (!items.length) return;

        var completedCount = items.filter(function(o) { return completedSet.has(o.idx); }).length;

        html +=
          '<div class="exam-section">' +
            '<div class="section-header">' +
              '<span class="material-symbols-outlined section-icon ' + sectionKey + '">' +
                Utils.getMaterialIcon(sectionKey) +
              '</span>' +
              '<h4>' + Dashboard._sectionExDisplayTitle(sectionKey) + '</h4>' +
              '<span class="section-progress">' + completedCount + '/' + items.length + '</span>' +
            '</div>' +
            '<div class="section-parts">';

        items.forEach(function(o) {
          var statusClass = completedSet.has(o.idx) ? 'completed' : '';
          html +=
            '<span class="part-number ' + statusClass + '" ' +
              'onclick="event.stopPropagation(); MixedTest.startAtIndex(' + o.idx + ')" ' +
              'title="' + o.item.examId + ' · ' + sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1) + ' Part ' + o.item.part + '">' +
              o.item.part +
            '</span>';
        });

        html += '</div></div>';
      });

      return html;
    },

    renderComingSoonExam: function(exam) {
      return `
        <div class="exam-item">
          <div class="exam-header">
            <div class="exam-header-left">
              <span class="exam-number">${exam.number}</span>
              <div>
                <div class="exam-title">Test ${exam.number}</div>
                <div class="exam-subtitle">Coming soon</div>
              </div>
            </div>
            <div class="exam-progress-badge">
              <i class="fas fa-clock"></i> Coming soon
            </div>
          </div>
        </div>
      `;
    },
    
    renderAvailableExam: function(exam, expandExamId) {
      var isOpen = expandExamId && exam.id === expandExamId;
      let html = `
        <div class="exam-item">
          <div class="exam-header${isOpen ? ' active' : ''}" onclick="Dashboard.toggleExam(this)">
            <div class="exam-header-left">
              <span class="exam-number">${exam.number}</span>
              <div>
                <div class="exam-title">Test ${exam.number}</div>
                <div class="exam-subtitle">Available exercises</div>
              </div>
            </div>
            ${AppState.currentMode === 'exam' ? `<button class="exam-play-btn" onclick="event.stopPropagation(); Exercise.startFullExam('${exam.id}')" title="Start Exam">
              <i class="fas fa-play"></i>
            </button>` : ''}
            <button class="exam-results-btn" onclick="event.stopPropagation(); ScoreCalculator.showOverallResults('${exam.id}')" title="Overall Results">
              <i class="fas fa-chart-bar"></i>
            </button>
            <button class="dashboard-reset-btn reset-test-btn" onclick="event.stopPropagation(); Dashboard.resetTest('${exam.id}')" title="Reset test">
              <i class="fas fa-redo-alt"></i>
            </button>
            <i class="fas fa-chevron-down exam-arrow"></i>
          </div>
          <div class="exam-content${isOpen ? ' show' : ''}">
            <div class="exam-sections">
      `;
      
      html += this.renderSection(exam, 'reading');
      html += this.renderSection(exam, 'listening');
      html += this.renderSection(exam, 'writing');
      html += this.renderSection(exam, 'speaking');
      
      html += `
            </div>
          </div>
        </div>
      `;
      return html;
    },
    
    renderSection: function(exam, sectionKey) {
      const section = exam.sections[sectionKey];
      const isExamMode = AppState.currentMode === 'exam';
      var isLocked = false;
      var lockClick = '';
      var lockedBadge = '';
      if (sectionKey === 'writing' || sectionKey === 'speaking') {
        if (typeof AccessControl !== 'undefined') {
          if (!AccessControl.canAccessWritingSpeaking().allowed) {
            isLocked = true;
            lockClick = 'Auth._showAuthModal()';
          } else if (AccessControl.isWritingSpeakingSectionLocked(sectionKey)) {
            isLocked = true;
            lockClick = AccessControl.isPromotionMode()
              ? 'AccessControl.showRateLimitModal({ feature: \'' + sectionKey + '\' })'
              : 'Dashboard.showExamsUpgradeGate()';
          }
          lockedBadge = AccessControl.getWritingSpeakingBadge(sectionKey);
        } else if (!AppState.isAuthenticated) {
          isLocked = true;
          lockClick = 'Auth._showAuthModal()';
          lockedBadge = '<span class="guest-locked-badge"><i class="fas fa-lock"></i> Sign in required</span>';
        } else if (!AppState.hasExamsPack) {
          var trialKey = sectionKey === 'writing' ? 'cambridge_free_writing_used' : 'cambridge_free_speaking_used';
          if (localStorage.getItem(trialKey)) {
            isLocked = true;
            lockClick = 'Dashboard.showExamsUpgradeGate()';
            lockedBadge = '<span class="guest-locked-badge"><i class="fas fa-lock"></i> Pack Exams required</span>';
          } else {
            lockedBadge = '<span class="guest-locked-badge"><i class="fas fa-gift"></i> 1 free try</span>';
          }
        }
      }
      var readingSectionHeading = (typeof AppState !== 'undefined' && AppState.currentLevel === 'B1') ? 'Reading' : 'READING & UOE';
      let html = `
        <div class="exam-section${isLocked ? ' guest-locked' : ''}"${isLocked ? ' onclick="' + lockClick + '"' : ''}>
          <div class="section-header">
            <span class="material-symbols-outlined section-icon ${sectionKey}">${Utils.getMaterialIcon(sectionKey)}</span>
            <h4>${sectionKey === 'reading' ? readingSectionHeading : section.name}${lockedBadge}</h4>
            <button class="section-play" onclick="event.stopPropagation(); ${isLocked ? lockClick : "Exercise.startFullSection('" + exam.id + "', '" + sectionKey + "')"}">
              <i class="fas fa-play"></i>
            </button>
            <button class="section-results-btn" onclick="event.stopPropagation(); ScoreCalculator.showSectionResults('${exam.id}', '${sectionKey}')" title="Section Results">
              <i class="fas fa-chart-bar"></i>
            </button>
            ${this._formatSectionProgress(exam.id, sectionKey, section)}
          </div>
          <div class="section-parts">
      `;
      
      for (let i = 1; i <= section.total; i++) {
        let statusClass = '';
        if (section.completed.includes(i)) statusClass = 'completed';
        else if (section.inProgress.includes(i)) statusClass = 'in-progress';
        
        if (isExamMode && !section.completed.includes(i)) {
          html += `<span class="part-number ${statusClass} exam-locked" title="Complete the exam to view corrections">${i}</span>`;
        } else {
           html += `<span class="part-number ${statusClass}" onclick="event.stopPropagation(); ${isLocked ? lockClick : "Exercise.openPart('" + exam.id + "', '" + sectionKey + "', " + i + ")"}">${i}</span>`;
        }
      }
      
      html += `</div>
          <button class="reset-section-corner-btn" onclick="event.stopPropagation(); Dashboard.resetSection('${exam.id}', '${sectionKey}')" title="Reset section">
            <i class="fas fa-redo-alt"></i>
          </button>
        </div>`;
      return html;
    },
    
    toggleExam: function(header) {
      header.classList.toggle('active');
      const content = header.nextElementSibling;
      content.classList.toggle('show');
    },
    
    filterByLevel: function(level) {
      AppState.currentLevel = level;
      localStorage.setItem('preferred_level', level);
      subpageCurrentPage = 1;
      
      document.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-level') === level) {
          btn.classList.add('active');
        }
      });
      
      App.restoreExamStatuses();
      this.render();
    },
    
    setMode: function(mode) {
      AppState.currentMode = mode;
      localStorage.setItem('preferred_mode', mode);
      App.restoreExamStatuses();
      this.render();
    },
    
    showConfirmDialog: function(message, onConfirm) {
      var overlay = document.createElement('div');
      overlay.className = 'confirm-dialog-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <p>${message}</p>
          <div class="confirm-dialog-buttons">
            <button class="confirm-dialog-btn confirm-cancel">Cancel</button>
            <button class="confirm-dialog-btn confirm-ok">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      overlay.querySelector('.confirm-cancel').addEventListener('click', function() {
        document.body.removeChild(overlay);
      });
      overlay.querySelector('.confirm-ok').addEventListener('click', function() {
        document.body.removeChild(overlay);
        onConfirm();
      });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) document.body.removeChild(overlay);
      });
    },
    
    resetSection: function(examId, sectionKey) {
      var self = this;
      this.showConfirmDialog('Are you sure you want to reset this section? All your answers will be lost.', function() {
        var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
        if (!exam) return;
        var sectionData = exam.sections[sectionKey];
        if (!sectionData) return;
        for (var i = 1; i <= sectionData.total; i++) {
          Exercise.clearPartState(examId, sectionKey, i);
        }
        sectionData.completed = [];
        sectionData.inProgress = [];
        // Clear section scores
        var scoreKey = examId + '_' + sectionKey;
        if (AppState.sectionScores[scoreKey]) delete AppState.sectionScores[scoreKey];
        var scrollY = window.scrollY;
        self.renderSubpage(AppState.currentMode || 'practice', examId, true);
        window.scrollTo(0, scrollY);
      });
    },
    
    resetTest: function(examId) {
      var self = this;
      this.showConfirmDialog('Are you sure you want to reset this entire test? All your answers will be lost.', function() {
        var exam = EXAMS_DATA[AppState.currentLevel]?.find(function(e) { return e.id === examId; });
        if (!exam) return;
        ['reading', 'listening', 'writing', 'speaking'].forEach(function(sectionKey) {
          var sectionData = exam.sections[sectionKey];
          if (!sectionData) return;
          for (var i = 1; i <= sectionData.total; i++) {
            Exercise.clearPartState(examId, sectionKey, i);
          }
          sectionData.completed = [];
          sectionData.inProgress = [];
          var scoreKey = examId + '_' + sectionKey;
          if (AppState.sectionScores[scoreKey]) delete AppState.sectionScores[scoreKey];
        });
        var scrollY = window.scrollY;
        self.renderSubpage(AppState.currentMode || 'practice', examId, true);
        window.scrollTo(0, scrollY);
      });
    },

    // ── Guest / Premium helpers ──────────────────────────────────────────

    _renderPremiumBanner: function() {
      var isAuth = !!AppState.isAuthenticated;
      return '<div class="premium-banner">' +
        '<div class="premium-banner-icon"><span class="material-symbols-outlined">workspace_premium</span></div>' +
        '<div class="premium-banner-text">' +
          '<div class="premium-banner-title">' + (isAuth ? 'Unlock Pack Exams' : 'Sign in & unlock more') + '</div>' +
          '<div class="premium-banner-desc">' + 'Unlock all exams, Random Test, and unlimited Writing/Speaking.' + '</div>' +
        '</div>' +
        '<button class="premium-banner-btn" onclick="' + (isAuth ? 'Dashboard.showExamsUpgradeGate()' : 'Dashboard.showGuestGate()') + '">' +
          '<i class="fas fa-crown"></i> ' + (isAuth ? 'View Plans' : 'Sign in') +
        '</button>' +
      '</div>';
    },

    _renderGuestLockedExam: function(exam) {
      var isAuth = !!AppState.isAuthenticated;
      var action = isAuth ? 'Dashboard.showExamsUpgradeGate()' : 'Dashboard.showGuestGate()';
      return '<div class="exam-item guest-exam-locked" onclick="' + action + '">' +
        '<div class="exam-header">' +
          '<div class="exam-header-left">' +
            '<span class="exam-number">' + exam.number + '</span>' +
            '<div>' +
              '<div class="exam-title">Test ' + exam.number + '</div>' +
              '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>' + (isAuth ? 'Pack Exams required' : 'Sign in to access') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="exam-progress-badge"><i class="fas fa-lock"></i> ' + 'Upgrade' + '</div>' +
        '</div>' +
      '</div>';
    },

    showGuestGate: function() {
      if (document.getElementById('guest-gate-overlay')) return;
      var overlay = document.createElement('div');
      overlay.id = 'guest-gate-overlay';
      overlay.className = 'guest-gate-overlay';
      overlay.innerHTML =
        '<div class="guest-gate-card">' +
          '<div class="guest-gate-icon"><span class="material-symbols-outlined">lock</span></div>' +
          '<h3>' + 'Sign in to unlock' + '</h3>' +
          '<p>' + 'Sign in with Google to access all exams, writing and speaking exercises, and save your progress in the cloud.' + '</p>' +
          '<div class="guest-gate-btns">' +
            '<button class="btn-gate-signin" onclick="Dashboard.closeGuestGate(); Auth._showAuthModal();"><i class="fas fa-sign-in-alt"></i> ' + 'Sign in with Google' + '</button>' +
            '<button class="btn-gate-close" onclick="Dashboard.closeGuestGate()">' + 'Cancel' + '</button>' +
          '</div>' +
        '</div>';
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) Dashboard.closeGuestGate();
      });
      document.body.appendChild(overlay);
    },

    closeGuestGate: function() {
      var overlay = document.getElementById('guest-gate-overlay');
      if (overlay) overlay.remove();
    },

    showExamsUpgradeGate: function() {
      if (typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI()) {
        if (!AppState.isAuthenticated) {
          this.showGuestGate();
        }
        return;
      }
      if (document.getElementById('upgrade-gate-overlay')) return;
      var overlay = document.createElement('div');
      overlay.id = 'upgrade-gate-overlay';
      overlay.className = 'upgrade-gate-overlay';
      overlay.innerHTML =
        '<div class="upgrade-gate-card">' +
          '<div class="upgrade-gate-icon">🔒</div>' +
          '<div class="upgrade-gate-title">Pack Exams required</div>' +
          '<div class="upgrade-gate-desc">Unlock all exams, Random Test, Writing and Speaking with unlimited access.</div>' +
          '<div class="upgrade-gate-actions">' +
            '<button class="upgrade-gate-btn-primary" onclick="Dashboard.closeUpgradeGate(); UserProfile.renderPremiumSection()">View Plans</button>' +
            '<button class="upgrade-gate-btn-secondary" onclick="Dashboard.closeUpgradeGate()">Close</button>' +
          '</div>' +
        '</div>';
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) Dashboard.closeUpgradeGate();
      });
      document.body.appendChild(overlay);
    },

    showTheoryUpgradeGate: function() {
      if (document.getElementById('upgrade-gate-overlay')) return;
      var overlay = document.createElement('div');
      overlay.id = 'upgrade-gate-overlay';
      overlay.className = 'upgrade-gate-overlay';
      overlay.innerHTML =
        '<div class="upgrade-gate-card">' +
          '<div class="upgrade-gate-icon">🔒</div>' +
          '<div class="upgrade-gate-title">Pack Theory required</div>' +
          '<div class="upgrade-gate-desc">Unlock all Grammar &amp; Vocabulary theory blocks.</div>' +
          '<div class="upgrade-gate-actions">' +
            '<button class="upgrade-gate-btn-primary" onclick="Dashboard.closeUpgradeGate(); UserProfile.renderPremiumSection()">View Plans</button>' +
            '<button class="upgrade-gate-btn-secondary" onclick="Dashboard.closeUpgradeGate()">Close</button>' +
          '</div>' +
        '</div>';
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) Dashboard.closeUpgradeGate();
      });
      document.body.appendChild(overlay);
    },

    closeUpgradeGate: function() {
      var overlay = document.getElementById('upgrade-gate-overlay');
      if (overlay) overlay.remove();
    }
  };
})();
