// js/state.js
(function() {
  // Datos de los exámenes
  window.EXAMS_DATA = {
    A2: [],
    B1: [],
    B2: [],
    C1: [
      {
        id: 'Test1',
        number: 1,
        title: 'Test 1',
        status: 'available',
        progress: 'Ejercicios disponibles: Reading 1-8, Listening 1-4, Writing 1-2, Speaking 1-4',
        sections: {
          reading: { name: 'READING & USE OF ENGLISH', icon: 'book-open', total: 8, completed: [], inProgress: [] },
          listening: { name: 'LISTENING', icon: 'headphones', total: 4, completed: [], inProgress: [] },
          writing: { name: 'WRITING', icon: 'pen', total: 2, completed: [], inProgress: [] },
          speaking: { name: 'SPEAKING', icon: 'microphone', total: 4, completed: [], inProgress: [] }
        }
      },
      {
        id: 'Test2',
        number: 2,
        title: 'Test 2',
        status: 'coming_soon',
        progress: 'Próximamente',
        sections: {
          reading: { name: 'READING & USE OF ENGLISH', icon: 'book-open', total: 8, completed: [], inProgress: [] },
          listening: { name: 'LISTENING', icon: 'headphones', total: 4, completed: [], inProgress: [] },
          writing: { name: 'WRITING', icon: 'pen', total: 2, completed: [], inProgress: [] },
          speaking: { name: 'SPEAKING', icon: 'microphone', total: 4, completed: [], inProgress: [] }
        }
      }
    ],
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
    tipsData: {}
  };
})();
