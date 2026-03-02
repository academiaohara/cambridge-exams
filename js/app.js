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
    }
  };
  
  // Exponer funciones globales necesarias
  window.setLanguage = App.setLanguage;
  window.filterByLevel = App.filterByLevel;
  window.loadDashboard = App.loadDashboard;
  window.toggleLanguageDropdown = I18n.toggleDropdown;
  
  // Inicializar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
