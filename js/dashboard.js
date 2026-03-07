// js/dashboard.js
(function() {
  window.Dashboard = {
    render: function(expandExamId) {
      const content = document.getElementById('main-content');
      if (!content) return;
      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      
      const exams = window.EXAMS_DATA[AppState.currentLevel] || [];
      
      if (exams.length === 0) {
        content.innerHTML = `
          <div class='no-exams'>
            <i class='fas fa-search'></i>
            <h3>${I18n.t('noExams')}</h3>
            <p>${I18n.t('soon')} ${AppState.currentLevel}</p>
          </div>
        `;
        return;
      }
      
      let html = '<div class="exams-container">';
      
      // Mode toggle
      html += `
        <div class="mode-toggle">
          <button class="mode-btn ${AppState.currentMode === 'practice' ? 'active' : ''}" data-mode="practice" onclick="Dashboard.setMode('practice')">
            <i class="fas fa-pencil-alt"></i> ${I18n.t('practiceMode')}
          </button>
          <button class="mode-btn ${AppState.currentMode === 'exam' ? 'active' : ''}" data-mode="exam" onclick="Dashboard.setMode('exam')">
            <i class="fas fa-file-alt"></i> ${I18n.t('examMode')}
          </button>
        </div>
      `;
      
      exams.forEach(exam => {
        if (exam.status === 'coming_soon') {
          html += this.renderComingSoonExam(exam);
        } else {
          html += this.renderAvailableExam(exam, expandExamId);
        }
      });
      html += '</div>';
      content.innerHTML = html;
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
            <button class="dashboard-reset-btn reset-section-btn" onclick="event.stopPropagation(); Dashboard.resetSection('${exam.id}', '${sectionKey}')" title="${I18n.t('resetSection')}">
              <i class="fas fa-redo-alt"></i>
            </button>
            <span class="section-progress">${section.completed.length}/${section.total}</span>
          </div>
          <div class="section-parts">
      `;
      
      for (let i = 1; i <= section.total; i++) {
        let statusClass = '';
        if (section.completed.includes(i)) statusClass = 'completed';
        else if (section.inProgress.includes(i)) statusClass = 'in-progress';
        
        html += `<span class="part-number ${statusClass}" onclick="event.stopPropagation(); Exercise.openPart('${exam.id}', '${sectionKey}', ${i})">${i}</span>`;
      }
      
      html += '</div></div>';
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
