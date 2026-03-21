// js/state.js
(function() {
  // Datos de los exámenes
  window.EXAMS_DATA = {
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
    toolSelectionEnabled: true,
    notes: [],
    notesIndex: 0,
    freeNotes: [],
    freeNotesIndex: 0,
    timerInterval: null,
    elapsedSeconds: 0,
    currentNoteRange: null,
    selectedNoteColor: '#fef08a',
    currentLanguage: 'en',
    answersChecked: false,
    translations: {},
    tipsData: {},
    sectionScores: {},
    currentPartScore: 0,
    currentMode: 'practice',
    examFullMode: false,
    examSectionsOrder: ['reading', 'listening', 'writing', 'speaking'],
    examCurrentSectionIndex: 0,
    sectionElapsedSeconds: 0,
    explanationMode: false,
    explanationActiveQuestion: null,
    // Auth state
    isAuthenticated: false,
    currentUser: null,
    isGuest: false,
    isPremium: false,
    // Streak state (managed by StreakManager)
    streak: {
      currentStreak: 0,
      longestStreak: 0,
      practicedToday: false,
      lastActivityDate: null
    },
    // Exam attempts (managed by ExamSession)
    examAttempts: {},
    // Writing validation flags
    writingValidationEnabled: true
  };
})();
