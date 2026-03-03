// js/app.js
(function() {
  window.App = {
    init: async function() {
      console.log('🚀 Iniciando aplicación v' + CONFIG.APP_VERSION);
      
      // Cargar nivel guardado
      const savedLevel = localStorage.getItem('preferred_level') || 'C1';
      AppState.currentLevel = savedLevel;
      
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
      
      // Renderizar dashboard
      Dashboard.render();
      
      console.log('✅ App lista');
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
        
        const discovered = [];
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
        
        EXAMS_DATA[level] = discovered;
      }));
    }
  };
  
  // Exponer funciones globales necesarias
  window.setLanguage = App.setLanguage;
  window.filterByLevel = App.filterByLevel;
  window.loadDashboard = App.loadDashboard;
  window.toggleLanguageDropdown = I18n.toggleDropdown;
  
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
