// js/app.js
(function() {
  window.App = {
    init: async function() {
      console.log('🚀 Iniciando aplicación v' + CONFIG.APP_VERSION);
      
      // Inicializar autenticación Supabase
      if (typeof Auth !== 'undefined') {
        await Auth.init();
      }

      // Inicializar streak y sesión de examen
      if (typeof StreakManager !== 'undefined') {
        StreakManager.init();
      }
      if (typeof ExamSession !== 'undefined') {
        ExamSession.init();
      }
      
      // Cargar nivel guardado
      const savedLevel = localStorage.getItem('preferred_level') || 'C1';
      AppState.currentLevel = savedLevel;
      
      // Cargar modo guardado
      const savedMode = localStorage.getItem('preferred_mode') || 'practice';
      AppState.currentMode = savedMode;
      
      document.querySelectorAll('.level-btn').forEach(btn => {
        if (btn.getAttribute('data-level') === savedLevel) {
          btn.classList.add('active');
        }
      });
      
      // Cargar idioma guardado
      const savedLanguage = localStorage.getItem('preferred_language') || 'es';
      await I18n.loadLanguage(savedLanguage);
      I18n.updateSelectedFlag(savedLanguage);
      
      // Inicializar eventos de dropdown
      I18n.initClickOutside();

      await this.syncExamsFromFolders();
      
      // Restore completed/inProgress statuses from localStorage
      this.restoreExamStatuses();
      
      // Renderizar dashboard
      Dashboard.render();
      
      // Update header mode buttons
      this.updateHeaderModeButtons();
      
      // Set initial history state
      history.replaceState({ view: 'dashboard' }, '');
      
      // Handle browser back/forward buttons
      window.addEventListener('popstate', function(e) {
        var state = e.state;
        if (!state || state.view === 'dashboard') {
          if (AppState.currentExercise) {
            Exercise.closeExercise({ skipHistory: true });
          } else {
            Dashboard.render();
          }
        } else if (state.view === 'subpage' && state.mode) {
          Dashboard.renderSubpage(state.mode);
        } else if (state.view === 'exercise' && state.examId && state.section && state.part) {
          Exercise.openPart(state.examId, state.section, state.part);
        } else if (state.view === 'profile') {
          if (typeof UserProfile !== 'undefined') UserProfile.renderProfileSection();
        } else if (state.view === 'premium') {
          if (typeof UserProfile !== 'undefined') UserProfile.renderPremiumSection();
        } else if (state.view === 'gradeEvolution') {
          if (typeof BentoGrid !== 'undefined') BentoGrid.openGradeEvolution();
        } else if (state.view === 'quicksteps') {
          if (typeof BentoGrid !== 'undefined') BentoGrid.openQuickstepsChooser();
        }
      });
      
      console.log('✅ App lista');
    },
    
    restoreExamStatuses: function() {
      var level = AppState.currentLevel;
      var mode = AppState.currentMode;
      var exams = EXAMS_DATA[level] || [];
      exams.forEach(function(exam) {
        if (exam.status !== 'available') return;
        ['reading', 'listening', 'writing', 'speaking'].forEach(function(section) {
          var sectionData = exam.sections[section];
          if (!sectionData) return;
          sectionData.completed = [];
          sectionData.inProgress = [];
          for (var i = 1; i <= sectionData.total; i++) {
            var key = 'cambridge_' + mode + '_' + level + '_' + exam.id + '_' + section + '_' + i;
            try {
              var raw = localStorage.getItem(key);
              if (raw) {
                var data = JSON.parse(raw);
                if (data.answersChecked) {
                  sectionData.completed.push(i);
                } else {
                  sectionData.inProgress.push(i);
                }
              }
            } catch(e) { /* ignore parse errors */ }
          }
        });
      });
    },
    
    setLanguage: async function(lang) {
      await I18n.loadLanguage(lang);
      I18n.updateSelectedFlag(lang);
      
      document.getElementById('languageDropdown').classList.remove('show');
      localStorage.setItem('preferred_language', lang);
      
      if (AppState.currentExercise) {
        await Exercise.reRenderCurrentExercise();
      } else {
        Dashboard.render();
      }
      this.updateHeaderModeButtons();
    },
    
    updateHeaderModeButtons: function() {
      var mode = AppState.currentMode || 'practice';
      document.querySelectorAll('.header-mode-btn').forEach(function(btn) {
        if (btn.getAttribute('data-mode') === mode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    },
    
    filterByLevel: function(level) {
      Dashboard.filterByLevel(level);
    },
    
    loadDashboard: function() {
      Exercise.closeExercise();
    },
    
    syncExamsFromFolders: async function() {
      const levels = Object.keys(EXAMS_DATA || {});
      const sectionTemplate = {
        reading: { name: 'READING & USE OF ENGLISH', icon: 'book-open', total: 8, completed: [], inProgress: [] },
        listening: { name: 'LISTENING', icon: 'headphones', total: 4, completed: [], inProgress: [] },
        writing: { name: 'WRITING', icon: 'pen', total: 2, completed: [], inProgress: [] },
        speaking: { name: 'SPEAKING', icon: 'microphone', total: 4, completed: [], inProgress: [] }
      };
      
      await Promise.all(levels.map(async level => {
        const existingById = (EXAMS_DATA[level] || []).reduce((acc, exam) => {
          acc[exam.id] = exam;
          return acc;
        }, {});
        
        // Try to load index.json catalog for this level first
        let indexData = null;
        try {
          const indexResponse = await fetch(`Nivel/${level}/Exams/index.json`);
          if (indexResponse.ok) {
            indexData = await indexResponse.json();
          }
        } catch (e) {
          console.debug(`No index.json found for level ${level}, falling back to HEAD requests`);
        }
        
        let discovered = [];
        
        if (indexData && Array.isArray(indexData.tests)) {
          // Build exam list from index.json catalog
          discovered = indexData.tests.map((testEntry, idx) => {
            const examId = testEntry.id;
            const parsed = parseInt(examId.replace('Test', ''), 10);
            const number = Number.isNaN(parsed) ? (idx + 1) : parsed;
            const prev = existingById[examId];
            return {
              id: examId,
              number: number,
              title: `Test ${number}`,
              status: testEntry.status || 'available',
              progress: testEntry.status === 'coming_soon'
                ? 'Próximamente'
                : 'Ejercicios disponibles: Reading 1-8, Listening 1-4, Writing 1-2, Speaking 1-4',
              sections: prev?.sections || JSON.parse(JSON.stringify(sectionTemplate))
            };
          });
        } else {
          // Fallback: sequential HEAD requests to detect available tests
          let i = 1;
          while (true) {
            const examId = `Test${i}`;
            const testFile = `Nivel/${level}/Exams/${examId}/reading1.json`;
            try {
              const response = await fetch(testFile, { method: 'HEAD' });
              if (!response.ok) {
                console.debug(`Test discovery stopped at ${testFile} (${response.status})`);
                break;
              }
            } catch (error) {
              // Stop discovery if the next sequential test folder is not available.
              console.debug(`Test discovery stopped at ${testFile}`);
              break;
            }
            
            const prev = existingById[examId];
            discovered.push({
              id: examId,
              number: i,
              title: `Test ${i}`,
              status: 'available',
              progress: 'Ejercicios disponibles: Reading 1-8, Listening 1-4, Writing 1-2, Speaking 1-4',
              sections: prev?.sections || JSON.parse(JSON.stringify(sectionTemplate))
            });
            i++;
          }
        }
        
        EXAMS_DATA[level] = discovered;
      }));
    }
  };
  
  // Exponer funciones globales necesarias
  window.setLanguage = App.setLanguage;
  window.filterByLevel = App.filterByLevel;
  window.loadDashboard = App.loadDashboard;
  window.toggleLanguageDropdown = I18n.toggleDropdown;
  window.openScoreCalculator = function() {
    if (AppState.currentExercise) Exercise.closeExercise();
    ScoreCalculator.render();
  };
  
  // Mobile menu toggle
  window.toggleMobileMenu = function() {
    const navGroup = document.getElementById('headerNavGroup');
    const icon = document.getElementById('mobileMenuIcon');
    if (navGroup && icon) {
      navGroup.classList.toggle('show');
      icon.className = navGroup.classList.contains('show') ? 'fas fa-times' : 'fas fa-bars';
    }
  };
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(e) {
    const navGroup = document.getElementById('headerNavGroup');
    const toggle = document.getElementById('mobileMenuToggle');
    if (navGroup && toggle && navGroup.classList.contains('show')) {
      if (!navGroup.contains(e.target) && !toggle.contains(e.target)) {
        navGroup.classList.remove('show');
        const icon = document.getElementById('mobileMenuIcon');
        if (icon) icon.className = 'fas fa-bars';
      }
    }
  });
  
  // Close mobile menu on level selection
  var origFilterByLevel = App.filterByLevel;
  window.filterByLevel = function(level) {
    origFilterByLevel.call(App, level);
    var navGroup = document.getElementById('headerNavGroup');
    var icon = document.getElementById('mobileMenuIcon');
    if (navGroup) { navGroup.classList.remove('show'); }
    if (icon) { icon.className = 'fas fa-bars'; }
  };
  
  // Inicializar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
