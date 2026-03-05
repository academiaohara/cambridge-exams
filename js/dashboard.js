// js/dashboard.js
(function() {
  window.Dashboard = {
    render: function() {
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
      exams.forEach(exam => {
        if (exam.status === 'coming_soon') {
          html += this.renderComingSoonExam(exam);
        } else {
          html += this.renderAvailableExam(exam);
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
    
    renderAvailableExam: function(exam) {
      let html = `
        <div class="exam-item">
          <div class="exam-header" onclick="Dashboard.toggleExam(this)">
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
            <i class="fas fa-chevron-down exam-arrow"></i>
          </div>
          <div class="exam-content">
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
      
      this.render();
    }
  };
})();
