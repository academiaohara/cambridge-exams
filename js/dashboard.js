// js/dashboard.js
(function() {
  var subpageCurrentPage = 1;
  var TESTS_PER_PAGE = 5;
  var subpageView = 'byTest';       // 'byTest' | 'bySection'
  var subpageSectionKey = null;     // null = tiles view; 'reading' | 'listening' | 'writing' | 'speaking'
  var sectionCurrentPage = 1;
  var SECTION_ITEMS_PER_PAGE = 4;

  window.Dashboard = {
    render: function(expandExamId) {
      const content = document.getElementById('main-content');
      if (!content) return;
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      AppState.currentView = 'dashboard';
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();
      
      const level = AppState.currentLevel || 'C1';
      const exams = window.EXAMS_DATA[level] || [];
      
      // Build sidebar content
      var leftSidebarContent = '';
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent = BentoGrid._buildLevelSelectorSidebarHtml();
        leftSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(exams);
        rightSidebarContent = BentoGrid._buildContinueBasecampHtml(exams);
        rightSidebarContent += BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
      }

      var html = '<div class="dashboard-layout">' +
        '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
        '<div class="dashboard-center">' +
          '<div class="bento-center-wrapper">' +
            '<div id="bento-grid-container"></div>' +
          '</div>' +
        '</div>' +
        '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
      '</div>';

      content.innerHTML = html;

      // Render bento grid into its container after DOM is updated
      if (typeof BentoGrid !== 'undefined') {
        const bentoContainer = document.getElementById('bento-grid-container');
        if (bentoContainer) BentoGrid.render(bentoContainer);
        BentoGrid._startGradeCarousel();
      }
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
        '<button class="subpage-back-btn" onclick="loadDashboard()">' + 'Back' + '</button>' +
        '<div>' +
          '<div class="subpage-title">' + modeConfig.title + '</div>' +
          '<div class="subpage-subtitle">' + modeConfig.subtitle + '</div>' +
        '</div>' +
      '</div>';

      var isGuest = AppState.isGuest;

      // Premium upgrade banner for guest users
      var premiumBannerHtml = '';
      if (isGuest) {
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
          } else if (isGuest && globalIdx > 0) {
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

        mainContentHtml = '<div class="exams-container">' + examListHtml + '</div>' + paginationHtml;
      } else {
        // ── By Section view ──────────────────────────────────────────────
        if (subpageSectionKey) {
          mainContentHtml = this._renderSectionExerciseList(exams, subpageSectionKey, isGuest, t);
        } else {
          mainContentHtml = this._renderBySectionTiles(t);
        }
      }

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

      var html = '<div class="dashboard-layout">' +
        '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
        '<div class="dashboard-center">' +
          subpageHeader +
          premiumBannerHtml +
          viewToggleHtml +
          mainContentHtml +
        '</div>' +
        '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
      '</div>';

      content.innerHTML = html;
      if (typeof BentoGrid !== 'undefined') {
        BentoGrid._startGradeCarousel();
      }
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
    _renderBySectionTiles: function(t) {
      var mode = AppState.currentMode || 'practice';
      var sections = [
        { key: 'reading',   icon: 'menu_book',        label: 'Reading' },
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
    _renderSectionExerciseList: function(exams, sectionKey, isGuest, t) {
      var mode = AppState.currentMode || 'practice';

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
          '<span class="section-ex-title">' + t(sectionKey, sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)) + '</span>' +
        '</div>' +
        '<div class="exams-container">';

      pageExams.forEach(function(exam, idx) {
        var globalIdx = pageStart + idx;
        if (exam.status === 'coming_soon') {
          html += Dashboard._renderSectionExComingSoon(exam);
        } else if (isGuest && globalIdx > 0) {
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
return '<div class="exam-item guest-exam-locked" onclick="Dashboard.showGuestGate()">' +
        '<div class="exam-header">' +
          '<div class="exam-header-left">' +
            '<span class="exam-number">' + exam.number + '</span>' +
            '<div>' +
              '<div class="exam-title">Test ' + exam.number + '</div>' +
              '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>' + 'Sign in to access' + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="exam-progress-badge"><i class="fas fa-lock"></i> ' + 'Upgrade' + '</div>' +
        '</div>' +
      '</div>';
    },

    _renderSectionExItem: function(exam, sectionKey, isGuest) {
var section = exam.sections[sectionKey];
      if (!section) return '';

      var isGuestLocked = isGuest && (sectionKey === 'writing' || sectionKey === 'speaking');
      if (isGuestLocked) {
        return '<div class="exam-item guest-exam-locked" onclick="Dashboard.showGuestGate()">' +
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

      var html =
        '<div class="exam-item section-ex-item">' +
          '<div class="section-ex-item-header">' +
            '<span class="exam-number">' + exam.number + '</span>' +
            '<div class="section-ex-item-info">' +
              '<div class="exam-title">Test ' + exam.number + '</div>' +
              '<span class="section-progress">' + section.completed.length + '/' + section.total + '</span>' +
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
      const isGuest = AppState.isGuest;
      const isGuestLocked = isGuest && (sectionKey === 'writing' || sectionKey === 'speaking');
      var lockedBadge = isGuestLocked
        ? '<span class="guest-locked-badge"><i class="fas fa-lock"></i> ' + ('Sign in required') + '</span>'
        : '';
      let html = `
        <div class="exam-section${isGuestLocked ? ' guest-locked' : ''}"${isGuestLocked ? ' onclick="Dashboard.showGuestGate()"' : ''}>
          <div class="section-header">
            <span class="material-symbols-outlined section-icon ${sectionKey}">${Utils.getMaterialIcon(sectionKey)}</span>
            <h4>${section.name}${lockedBadge}</h4>
            <button class="section-play" onclick="event.stopPropagation(); Exercise.startFullSection('${exam.id}', '${sectionKey}')">
              <i class="fas fa-play"></i>
            </button>
            <button class="section-results-btn" onclick="event.stopPropagation(); ScoreCalculator.showSectionResults('${exam.id}', '${sectionKey}')" title="Section Results">
              <i class="fas fa-chart-bar"></i>
            </button>
            <span class="section-progress">${section.completed.length}/${section.total}</span>
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
          html += `<span class="part-number ${statusClass}" onclick="event.stopPropagation(); Exercise.openPart('${exam.id}', '${sectionKey}', ${i})">${i}</span>`;
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
return '<div class="premium-banner">' +
        '<div class="premium-banner-icon"><span class="material-symbols-outlined">workspace_premium</span></div>' +
        '<div class="premium-banner-text">' +
          '<div class="premium-banner-title">' + 'Upgrade to Premium' + '</div>' +
          '<div class="premium-banner-desc">' + 'Get full access to all exams, writing evaluation with AI, and speaking exercises.' + '</div>' +
        '</div>' +
        '<button class="premium-banner-btn" onclick="Dashboard.showGuestGate()">' +
          '<i class="fas fa-crown"></i> ' + 'Upgrade' +
        '</button>' +
      '</div>';
    },

    _renderGuestLockedExam: function(exam) {
return '<div class="exam-item guest-exam-locked" onclick="Dashboard.showGuestGate()">' +
        '<div class="exam-header">' +
          '<div class="exam-header-left">' +
            '<span class="exam-number">' + exam.number + '</span>' +
            '<div>' +
              '<div class="exam-title">Test ' + exam.number + '</div>' +
              '<div class="exam-subtitle"><i class="fas fa-lock" style="margin-right:4px;font-size:0.75rem"></i>' + 'Sign in to access' + '</div>' +
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
    }
  };
})();
