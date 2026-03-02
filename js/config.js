// js/config.js
(function() {
  window.CONFIG = {
    GITHUB_USER: 'academiaohara',
    REPO_NAME: 'cambridge-exams',
    BRANCH: 'main',
    APP_VERSION: '3.1.0',
    WARNING_TIME: 300,
    DANGER_TIME: 600
  };
  
  // URLs base
  window.CONFIG.EXERCISES_URL = `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USER}/${CONFIG.REPO_NAME}@${CONFIG.BRANCH}/Nivel/C1/Exams/`;
  window.CONFIG.LANG_BASE_URL = `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USER}/${CONFIG.REPO_NAME}@${CONFIG.BRANCH}/lang/`;
  window.CONFIG.TIPS_BASE_URL = `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USER}/${CONFIG.REPO_NAME}@${CONFIG.BRANCH}/tips/`;
  window.CONFIG.JS_BASE_URL = `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USER}/${CONFIG.REPO_NAME}@${CONFIG.BRANCH}/js/`;
  
  // Configuración de tipos de ejercicios
  window.CONFIG.PART_TYPES = {
    // Reading & Use of English
    1: { type: 'multiple-choice', inputMode: 'modal', total: 8 },
    2: { type: 'open-cloze', inputMode: 'text', total: 8 },
    3: { type: 'word-formation', inputMode: 'text', total: 8 },
    4: { type: 'transformations', inputMode: 'text-with-key', total: 6 },
    5: { type: 'multiple-choice-text', inputMode: 'radio', total: 6 },
    6: { type: 'cross-text-matching', inputMode: 'modal', total: 4 },
    7: { type: 'gapped-text', inputMode: 'select', total: 6 },
    8: { type: 'multiple-matching', inputMode: 'modal', total: 10 },
    
    // Listening
    listening1: { type: 'multiple-choice', inputMode: 'radio', total: 8 },
    listening2: { type: 'sentence-completion', inputMode: 'text', total: 10 },
    listening3: { type: 'multiple-matching', inputMode: 'modal', total: 5 },
    listening4: { type: 'multiple-choice', inputMode: 'radio', total: 7 },
    
    // Writing
    writing1: { type: 'essay', inputMode: 'textarea', total: 1 },
    writing2: { type: 'choice', inputMode: 'textarea', total: 1 },
    
    // Speaking
    speaking1: { type: 'interview', inputMode: 'script', total: 1 },
    speaking2: { type: 'long-turn', inputMode: 'script', total: 2 },
    speaking3: { type: 'collaborative', inputMode: 'script', total: 1 },
    speaking4: { type: 'discussion', inputMode: 'script', total: 1 }
  };
})();
