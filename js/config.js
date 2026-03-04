// js/config.js
(function() {
  window.CONFIG = {
    GITHUB_USER: 'academiaohara',
    REPO_NAME: 'cambridge-exams',
    BRANCH: 'main',
    APP_VERSION: '3.2.0',
    WARNING_TIME: 300,
    DANGER_TIME: 600,
    
    // Mapeo de tipos de ejercicio a archivos CSS y JS
    EXERCISE_TYPE_FILES: {
      'multiple-choice': {
        css: 'reading-type1.css',
        js: 'reading-type1.js'
      },
      'open-cloze': {
        css: 'reading-type2.css',
        js: 'reading-type2.js'
      },
      'word-formation': {
        css: 'reading-type3.css',
        js: 'reading-type3.js'
      },
      'transformations': {
        css: 'reading-type4.css',
        js: 'reading-type4.js'
      },
      'multiple-choice-text': {
        css: 'reading-type5.css',
        js: 'reading-type5.js'
      },
      'cross-text-matching': {
        css: 'reading-type6.css',
        js: 'reading-type6.js'
      },
      'gapped-text': {
        css: 'reading-type7.css',
        js: 'reading-type7.js'
      },
      'multiple-matching': {
        css: 'reading-type8.css',
        js: 'reading-type8.js'
      },
      'sentence-completion': {
        css: 'listening-type2.css',
        js: 'listening-type2.js'
      },
      'listening-1': {
        css: 'listening-type1.css',
        js: 'listening-type1.js'
      },
      'listening-2': {
        css: 'listening-type2.css',
        js: 'listening-type2.js'
      },
      'listening-3': {
        css: 'listening-type1.css',
        js: 'listening-type1.js'
      },
      'listening-4': {
        css: 'listening-type4.css',
        js: 'listening-type4.js'
      },
      'essay': {
        css: 'writing-type1.css',
        js: 'writing-type1.js'
      },
      'choice': {
        css: 'writing-type2.css',
        js: 'writing-type2.js'
      },
      'interview': {
        css: 'speaking-type.css',
        js: 'speaking-type.js'
      },
      'long-turn': {
        css: 'speaking-type.css',
        js: 'speaking-type.js'
      },
      'collaborative': {
        css: 'speaking-type.css',
        js: 'speaking-type.js'
      },
      'discussion': {
        css: 'speaking-type.css',
        js: 'speaking-type.js'
      },
      'dual-matching': {
        css: 'listening-type4.css',
        js: 'listening-type4.js'
      }
    }
  };
  
  // URLs base (relative paths for GitHub Pages)
  window.CONFIG.EXERCISES_URL = `Nivel/C1/Exams/`;
  window.CONFIG.LANG_BASE_URL = `lang/`;
  window.CONFIG.TIPS_BASE_URL = `tips/`;
  window.CONFIG.JS_BASE_URL = `js/`;
  window.CONFIG.CSS_BASE_URL = `css/`;
  // Gemini (Google AI Studio) — free tier
  window.CONFIG.GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
  window.CONFIG.GEMINI_MODEL = 'gemini-2.0-flash';

  // Whisper (Hugging Face Inference API) — free tier
  window.CONFIG.HF_API_ENDPOINT = 'https://api-inference.huggingface.co';
  window.CONFIG.WHISPER_MODEL = 'openai/whisper-large-v3';
  
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
    listening2: { type: 'sentence-completion', inputMode: 'text', total: 8 },
    listening3: { type: 'multiple-choice-text', inputMode: 'radio', total: 6 },
    listening4: { type: 'dual-matching', inputMode: 'select', total: 10 },
    
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
