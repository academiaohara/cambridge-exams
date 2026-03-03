// js/state.js
(function() {
  // Datos de los exámenes
  window.EXAMS_DATA = {
    A2: [],
    B1: [],
    B2: [],
    C1: [],
    C2: []
  };
  
  // Estado global de la aplicación
  window.AppState = {
    currentLevel: 'C1',
    currentExercise: null,
    currentSection: null,
    currentPart: null,
    currentExamId: null,
    activeTool: null,
    notes: [],
    freeNotes: "",
    timerInterval: null,
    elapsedSeconds: 0,
    currentNoteRange: null,
    selectedNoteColor: '#fef08a',
    currentLanguage: 'es',
    answersChecked: false,
    translations: {},
    tipsData: {},
    sectionScores: {},
    currentPartScore: 0
  };
})();
