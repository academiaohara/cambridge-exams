// js/i18n.js
(function() {
  const countryCodeMap = {
    'es': 'es', 'en': 'gb', 'fr': 'fr', 'de': 'de', 'it': 'it', 'pt': 'pt'
  };
  
  window.I18n = {
    // Cargar idioma
    loadLanguage: async function(lang) {
      console.log(`🌐 Cargando idioma: ${lang}`);
      const url = `${window.CONFIG.LANG_BASE_URL}${lang}.json`;
      
      try {
        const response = await window.Utils.fetchWithNoCache(url);
        const langData = await response.json();
        
        AppState.translations[lang] = langData;
        AppState.currentLanguage = lang;
        console.log(`✅ Idioma ${lang} cargado correctamente`);
        
        this.updateUILanguage();
        this.updateSelectedFlag(lang);
        
        return langData;
        
      } catch (error) {
        console.error(`❌ Error al cargar el idioma ${lang}:`, error);
        if (lang !== 'en') {
          console.warn(`⚠️ Usando inglés como fallback`);
          return this.loadLanguage('en');
        }
        return null;
      }
    },
    
    // Función de traducción
    t: function(key) {
      // Verificar que AppState existe
      if (!window.AppState) return key;
      
      const translations = AppState.translations || {};
      const currentLang = AppState.currentLanguage || 'es';
      
      if (!translations || Object.keys(translations).length === 0) return key;
      return translations[currentLang]?.[key] || translations['en']?.[key] || key;
    },

    // Actualizar UI con el idioma
    updateUILanguage: function() {
      // Verificar que podemos acceder al DOM
      if (!document) return;
      
      // Actualizar todos los elementos con data-i18n
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = this.t(key);
      });
      
      // Actualizar placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = this.t(key);
      });
      
      // Actualizar elementos específicos que no tienen data-i18n
      const modeHeader = document.getElementById('modeHeader');
      if (modeHeader) modeHeader.textContent = this.t('fullExams');
      
      // Actualizar badges de progreso
      document.querySelectorAll('.exam-progress-badge').forEach(badge => {
        badge.innerHTML = `<i class="fas fa-clock"></i> ${this.t('soon')}`;
      });
      
      // Actualizar títulos de secciones si es necesario
      if (window.AppState && AppState.currentExercise) {
        const sectionTitle = document.querySelector('.exercise-title h2');
        if (sectionTitle && window.Utils) {
          const levelName = Utils.getLevelName(AppState.currentLevel);
          const sectionDisplay = Utils.getSectionTitle(AppState.currentSection);
          sectionTitle.textContent = `${levelName} - ${sectionDisplay}`;
        }
      }
    },
    
    // Actualizar bandera seleccionada
    updateSelectedFlag: function(lang) {
      const flagElement = document.getElementById('selectedFlag');
      const langElement = document.getElementById('selectedLang');
      
      if (flagElement) {
        const countryCode = countryCodeMap[lang] || 'es';
        flagElement.className = `fi fi-${countryCode}`;
      }
      
      if (langElement) {
        langElement.textContent = lang.toUpperCase();
      }
    },
    
    // Toggle dropdown
    toggleDropdown: function() {
      const dropdown = document.getElementById('languageDropdown');
      if (dropdown) {
        dropdown.classList.toggle('show');
      }
    },
    
    // Cerrar dropdown al hacer clic fuera
    initClickOutside: function() {
      document.addEventListener('click', function(e) {
        const wrapper = document.querySelector('.language-selector-wrapper');
        const dropdown = document.getElementById('languageDropdown');
        if (wrapper && !wrapper.contains(e.target) && dropdown) {
          dropdown.classList.remove('show');
        }
      });
    }
  };
  
  // Verificar que se creó correctamente
  console.log('✅ I18n cargado correctamente:', window.I18n);
})();
