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
      const translations = AppState.translations;
      const currentLang = AppState.currentLanguage;
      
      if (!translations || Object.keys(translations).length === 0) return key;
      return translations[currentLang]?.[key] || translations['en']?.[key] || key;
    },
    
    // Actualizar UI con idioma
    updateUILanguage: function() {
      const modeHeader = document.getElementById('modeHeader');
      if (modeHeader) modeHeader.textContent = this.t('fullExams');
      
      document.querySelectorAll('.exam-progress-badge').forEach(badge => {
        const badgeText = badge.textContent.toLowerCase();
        if (badgeText.includes('próximamente') || badgeText.includes('soon')) {
          badge.innerHTML = `<i class="fas fa-clock"></i> ${this.t('soon')}`;
        }
      });
    },
    
    // Actualizar bandera seleccionada
    updateSelectedFlag: function(lang) {
      const flagElement = document.getElementById('selectedFlag');
      const countryCode = countryCodeMap[lang] || 'es';
      flagElement.className = `fi fi-${countryCode}`;
      document.getElementById('selectedLang').textContent = lang.toUpperCase();
    },
    
    // Toggle dropdown
    toggleDropdown: function() {
      const dropdown = document.getElementById('languageDropdown');
      dropdown.classList.toggle('show');
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
})();
