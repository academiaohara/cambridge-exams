// js/utils.js
(function() {
  window.Utils = {
    // Fetch con control de caché
    fetchWithNoCache: async function(url) {
      const cacheBuster = new Date().getTime();
      const finalUrl = `${url}?v=${cacheBuster}`;
      
      console.log('🔄 Cargando:', finalUrl);
      
      try {
        const response = await fetch(finalUrl);
        if (response.ok) return response;
        throw new Error(`Error HTTP: ${response.status}`);
      } catch (error) {
        console.warn('⚠️ Fallo directo, intentando proxy...');
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (!proxyResponse.ok) throw new Error('El servidor no responde.');
        const data = await proxyResponse.json();
        return new Response(data.contents, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },
    
    // Cargar CSS específico del tipo de ejercicio
    loadExerciseTypeCSS: function(type) {
      const fileInfo = window.CONFIG?.EXERCISE_TYPE_FILES?.[type];
      if (!fileInfo || !fileInfo.css) {
        console.warn(`⚠️ No hay CSS definido para el tipo: ${type}`);
        return;
      }
      
      const cssId = `css-${type}`;
      if (document.getElementById(cssId)) {
        console.log(`✅ CSS ya cargado para tipo: ${type}`);
        return;
      }
      
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = `${window.CONFIG.CSS_BASE_URL}exercise-types/${fileInfo.css}`;
      link.onload = () => console.log(`🎨 CSS cargado: ${fileInfo.css}`);
      link.onerror = () => console.error(`❌ Error cargando CSS: ${fileInfo.css}`);
      document.head.appendChild(link);
    },
    
    // Cargar JS específico del tipo de ejercicio
    loadExerciseTypeJS: function(type) {
      const fileInfo = window.CONFIG?.EXERCISE_TYPE_FILES?.[type];
      if (!fileInfo || !fileInfo.js) {
        console.warn(`⚠️ No hay JS definido para el tipo: ${type}`);
        return Promise.resolve();
      }
      
      const jsId = `js-${type}`;
      if (document.getElementById(jsId)) {
        console.log(`✅ JS ya cargado para tipo: ${type}`);
        return Promise.resolve();
      }
      
      return new Promise(function(resolve) {
        const script = document.createElement('script');
        script.id = jsId;
        script.src = `${window.CONFIG.JS_BASE_URL}exercise-types/${fileInfo.js}`;
        script.onload = function() { console.log(`📦 JS cargado: ${fileInfo.js}`); resolve(); };
        script.onerror = function() { console.error(`❌ Error cargando JS: ${fileInfo.js}`); resolve(); };
        document.body.appendChild(script);
      });
    },
    
    // NUEVO: Cargar CSS base que antes estaba en components
    loadBaseExerciseCSS: function() {
      const baseCSSFiles = [
        { id: 'base-example-css', file: 'example.css' },
        { id: 'base-gaps-css', file: 'gaps.css' }
      ];
      
      baseCSSFiles.forEach(item => {
        if (!document.getElementById(item.id)) {
          const link = document.createElement('link');
          link.id = item.id;
          link.rel = 'stylesheet';
          link.href = `${window.CONFIG.CSS_BASE_URL}components/${item.file}`;
          document.head.appendChild(link);
          console.log(`📁 CSS base cargado: ${item.file}`);
        }
      });
    },
    
    // Formatear tiempo
    formatTime: function(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Comparar respuestas según tipo
    compareAnswers: function(userAnswer, correctAnswer, questionType) {
      if (!userAnswer) return false;
      
      switch(questionType) {
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion':
          if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
            return correctAnswer.split('/').some(ans =>
              userAnswer.trim().toLowerCase() === ans.trim().toLowerCase()
            );
          }
          return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
          
        case 'transformations':
          if (Array.isArray(correctAnswer)) {
            return correctAnswer.some(ans => 
              userAnswer.toLowerCase().includes(ans.toLowerCase())
            );
          }
          if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
            return correctAnswer.split('/').some(ans =>
              userAnswer.toLowerCase().includes(ans.trim().toLowerCase())
            );
          }
          return userAnswer.toLowerCase().includes(correctAnswer.toLowerCase());
          
        default:
          return userAnswer === correctAnswer;
      }
    },
    
    // Obtener título de sección
    getSectionTitle: function(section) {
      const titles = {
        'reading': 'READING & USE OF ENGLISH',
        'listening': 'LISTENING',
        'writing': 'WRITING',
        'speaking': 'SPEAKING'
      };
      return titles[section] || section.toUpperCase();
    },
    
    // Obtener nombre del nivel
    getLevelName: function(level) {
      const levelNames = {
        'B1': 'B1 Preliminary',
        'B2': 'B2 First',
        'C1': 'C1 Advanced',
        'C2': 'C2 Proficiency'
      };
      return levelNames[level] || level;
    },
    
    // Obtener icono Material
    getMaterialIcon: function(section) {
      const iconMap = {
        'reading': 'menu_book',
        'listening': 'headphones',
        'writing': 'edit_note',
        'speaking': 'record_voice_over'
      };
      return iconMap[section] || 'description';
    }
  };
})();
