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
          return userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
          
        case 'transformations':
          if (Array.isArray(correctAnswer)) {
            return correctAnswer.some(ans => 
              userAnswer.toLowerCase().includes(ans.toLowerCase())
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
        'A2': 'A2 Key',
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
