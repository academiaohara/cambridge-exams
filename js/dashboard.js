// js/dashboard.js
(function() {
  window.Dashboard = {
    render: function(expandExamId) {
      const content = document.getElementById('main-content');
      if (!content) return;
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      
      const level = AppState.currentLevel || 'C1';
      const exams = window.EXAMS_DATA[level] || [];
      
      // Build sidebar content
      var leftSidebarContent = '';
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent = BentoGrid._buildLevelSelectorSidebarHtml();
        rightSidebarContent = BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
        rightSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(exams);
        var nextLesson = BentoGrid._findNextLesson(exams);
        if (nextLesson) {
          rightSidebarContent += BentoGrid._buildNextLessonSidebarHtml(nextLesson);
        }
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

    renderSubpage: function(mode) {
      AppState.currentMode = mode;
      localStorage.setItem('preferred_mode', mode);
      if (typeof App !== 'undefined') App.restoreExamStatuses();

      const content = document.getElementById('main-content');
      if (!content) return;
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();

      const level = AppState.currentLevel || 'C1';
      const exams = window.EXAMS_DATA[level] || [];

      var t = function(key, fallback) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fallback; };
      var modeConfig = mode === 'exam'
        ? { icon: '⏱️', title: t('theArena', 'The Arena'), subtitle: t('timedExamMode', 'Timed exam mode') }
        : { icon: '🛡️', title: t('practiceMode', 'Practice'), subtitle: t('noLimitsSafeSpace', 'No limits. Safe space.') };

      var subpageHeader = '<div class="subpage-header">' +
        '<button class="subpage-back-btn" onclick="history.back()">← ' + t('backToDashboard', 'Back') + '</button>' +
        '<div>' +
          '<div class="subpage-title">' + modeConfig.icon + ' ' + modeConfig.title + '</div>' +
          '<div class="subpage-subtitle">' + modeConfig.subtitle + '</div>' +
        '</div>' +
      '</div>';

      let examListHtml = '';
      exams.forEach(exam => {
        if (exam.status === 'coming_soon') {
          examListHtml += this.renderComingSoonExam(exam);
        } else {
          examListHtml += this.renderAvailableExam(exam, null);
        }
      });

      var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        rightSidebarContent = BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
        rightSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(exams);
      }

      var html = '<div class="dashboard-layout">' +
        '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>' +
        '<div class="dashboard-center">' +
          subpageHeader +
          '<div class="exams-container">' + examListHtml + '</div>' +
        '</div>' +
        '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>' +
      '</div>';

      content.innerHTML = html;
      if (typeof BentoGrid !== 'undefined') {
        BentoGrid._startGradeCarousel();
      }
    },
    
    renderComingSoonExam: function(exam) {
      return `
        <div class="exam-item">
          <div class="exam-header">
            <div class="exam-header-left">
              <span class="exam-number">${exam.number}</span>
              <div>
                <div class="exam-title">Test ${exam.number}</div>
                <div class="exam-subtitle">${I18n.t('soon')}</div>
              </div>
            </div>
            <div class="exam-progress-badge">
              <i class="fas fa-clock"></i> ${I18n.t('soon')}
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
                <div class="exam-subtitle">${I18n.t('availableExercises')}</div>
              </div>
            </div>
            ${AppState.currentMode === 'exam' ? `<button class="exam-play-btn" onclick="event.stopPropagation(); Exercise.startFullExam('${exam.id}')" title="${I18n.t('startExam') || 'Start Exam'}">
              <i class="fas fa-play"></i>
            </button>` : ''}
            <button class="exam-results-btn" onclick="event.stopPropagation(); ScoreCalculator.showOverallResults('${exam.id}')" title="${I18n.t('overallResults') || 'Overall Results'}">
              <i class="fas fa-chart-bar"></i>
            </button>
            <button class="dashboard-reset-btn reset-test-btn" onclick="event.stopPropagation(); Dashboard.resetTest('${exam.id}')" title="${I18n.t('resetTest')}">
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
      let html = `
        <div class="exam-section">
          <div class="section-header">
            <span class="material-symbols-outlined section-icon ${sectionKey}">${Utils.getMaterialIcon(sectionKey)}</span>
            <h4>${section.name}</h4>
            <button class="section-play" onclick="event.stopPropagation(); Exercise.startFullSection('${exam.id}', '${sectionKey}')">
              <i class="fas fa-play"></i>
            </button>
            <button class="section-results-btn" onclick="event.stopPropagation(); ScoreCalculator.showSectionResults('${exam.id}', '${sectionKey}')" title="${I18n.t('sectionResults') || 'Section Results'}">
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
          html += `<span class="part-number ${statusClass} exam-locked" title="${I18n.t('completeExamFirst') || 'Complete the exam first'}">${i}</span>`;
        } else {
          html += `<span class="part-number ${statusClass}" onclick="event.stopPropagation(); Exercise.openPart('${exam.id}', '${sectionKey}', ${i})">${i}</span>`;
        }
      }
      
      html += `</div>
          <button class="reset-section-corner-btn" onclick="event.stopPropagation(); Dashboard.resetSection('${exam.id}', '${sectionKey}')" title="${I18n.t('resetSection')}">
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
            <button class="confirm-dialog-btn confirm-cancel">${I18n.t('cancel')}</button>
            <button class="confirm-dialog-btn confirm-ok">${I18n.t('confirm')}</button>
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
      this.showConfirmDialog(I18n.t('confirmResetSection'), function() {
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
        self.render(examId);
      });
    },
    
    resetTest: function(examId) {
      var self = this;
      this.showConfirmDialog(I18n.t('confirmResetTest'), function() {
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
        self.render(examId);
      });
    }
  };
})();
