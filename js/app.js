// js/app.js
(function() {
  window.App = {
    init: async function() {
      console.log('🚀 Iniciando aplicación v' + CONFIG.APP_VERSION);
      
      // Inicializar autenticación Supabase
      if (typeof Auth !== 'undefined') {
        await Auth.init();
      }

      // Inicializar streak y sesión de examen
      if (typeof StreakManager !== 'undefined') {
        StreakManager.init();
      }
      if (typeof ExamSession !== 'undefined') {
        ExamSession.init();
      }
      
      // Cargar nivel guardado
      const savedLevel = localStorage.getItem('preferred_level') || 'C1';
      AppState.currentLevel = savedLevel;
      
      // Cargar modo guardado
      const savedMode = localStorage.getItem('preferred_mode') || 'practice';
      AppState.currentMode = savedMode;
      
      document.querySelectorAll('.level-btn').forEach(btn => {
        if (btn.getAttribute('data-level') === savedLevel) {
          btn.classList.add('active');
        }
      });

      await this.syncExamsFromFolders();
      
      // Restore completed/inProgress statuses from localStorage
      this.restoreExamStatuses();
      
      // ── URL-based deep-link routing ──────────────────────────
      var initialState = Router.pathToState();
      
      // If the URL points to an exercise with a specific level, apply it
      if (initialState.level) {
        AppState.currentLevel = initialState.level;
        // Re-sync for the target level if it changed
        if (initialState.level !== savedLevel) {
          await this.syncExamsFromFolders();
          this.restoreExamStatuses();
        }
      }
      
      // If the URL indicates a mode, apply it
      if (initialState.mode) {
        AppState.currentMode = initialState.mode;
        localStorage.setItem('preferred_mode', initialState.mode);
      }
      
      // Render the view indicated by the URL
      if (initialState.view === 'exercise' && initialState.examId && initialState.section && initialState.part) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        Exercise.openPart(initialState.examId, initialState.section, initialState.part);
      } else if (initialState.view === 'subpage' && initialState.mode) {
        Dashboard.renderSubpage(initialState.mode);
        // renderSubpage does not push state itself, so replace initial entry
        history.replaceState(initialState, '', Router.stateToPath(initialState));
      } else if (initialState.view === 'profile') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof UserProfile !== 'undefined') UserProfile.renderProfileSection();
      } else if (initialState.view === 'premium') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof UserProfile !== 'undefined') UserProfile.renderPremiumSection();
      } else if (initialState.view === 'gradeEvolution') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof BentoGrid !== 'undefined') BentoGrid.openGradeEvolution();
      } else if (initialState.view === 'quicksteps') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof BentoGrid !== 'undefined') BentoGrid.openQuickstepsChooser();
      } else if (initialState.view === 'crosswordList') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof BentoGrid !== 'undefined') BentoGrid.openCrosswordList();
      } else if (initialState.view === 'fastExercises') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof FastExercises !== 'undefined') FastExercises.openCategories();
      } else if (initialState.view === 'fastExerciseCategory' && initialState.categoryId) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof FastExercises !== 'undefined') FastExercises.openCategory(initialState.categoryId);
      } else if (initialState.view === 'fastExercisePoint' && initialState.categoryId && initialState.levelId && initialState.lessonId && typeof initialState.pointIndex !== 'undefined') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof FastExercises !== 'undefined') FastExercises.openPoint(initialState.categoryId, initialState.levelId, initialState.lessonId, initialState.pointIndex);
      } else if (initialState.view === 'course') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof BentoGrid !== 'undefined') BentoGrid.openLessons();
      } else if (initialState.view === 'courseTheory') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof BentoGrid !== 'undefined') BentoGrid.openCourseTheory();
      } else if (initialState.view === 'courseBlock' && initialState.blockKey) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof BentoGrid !== 'undefined') BentoGrid._popstateCourseBlock(initialState.blockKey);
      } else if (initialState.view === 'courseUnit' && initialState.unitId) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof BentoGrid !== 'undefined') BentoGrid._popstateCourseUnit(initialState);
      } else if (initialState.view === 'tips') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof TipsPage !== 'undefined') TipsPage.openTipsHome();
      } else if (initialState.view === 'tipsSkill' && initialState.level && initialState.skill) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof TipsPage !== 'undefined') TipsPage.openTipsSkill(initialState.level, initialState.skill);
      } else {
        // Default: dashboard
        Dashboard.render();
        history.replaceState({ view: 'dashboard' }, '', '/');
      }
      
      // Update header mode buttons
      this.updateHeaderModeButtons();
      
      // Handle browser back/forward buttons
      window.addEventListener('popstate', function(e) {
        var state = e.state;
        if (!state || state.view === 'dashboard') {
          if (AppState.currentExercise) {
            Exercise.closeExercise({ skipHistory: true });
          } else {
            Dashboard.render();
          }
        } else if (state.view === 'subpage' && state.mode) {
          Dashboard.renderSubpage(state.mode, state.expandExamId || null);
        } else if (state.view === 'exercise' && state.examId && state.section && state.part) {
          if (state.level) AppState.currentLevel = state.level;
          if (state.mode) {
            AppState.currentMode = state.mode;
            localStorage.setItem('preferred_mode', state.mode);
          }
          Exercise.openPart(state.examId, state.section, state.part);
        } else if (state.view === 'profile') {
          if (typeof UserProfile !== 'undefined') UserProfile.renderProfileSection();
        } else if (state.view === 'premium') {
          if (typeof UserProfile !== 'undefined') UserProfile.renderPremiumSection();
        } else if (state.view === 'gradeEvolution') {
          if (typeof BentoGrid !== 'undefined') BentoGrid.openGradeEvolution();
        } else if (state.view === 'quicksteps') {
          if (typeof BentoGrid !== 'undefined') BentoGrid.openQuickstepsChooser();
        } else if (state.view === 'crosswordList') {
          if (typeof BentoGrid !== 'undefined') BentoGrid.openCrosswordList();
        } else if (state.view === 'fastExercises') {
          if (typeof FastExercises !== 'undefined') FastExercises.openCategories();
        } else if (state.view === 'fastExerciseCategory' && state.categoryId) {
          if (typeof FastExercises !== 'undefined') FastExercises.openCategory(state.categoryId);
        } else if (state.view === 'fastExercisePoint' && state.categoryId && state.levelId && state.lessonId && typeof state.pointIndex !== 'undefined') {
          if (typeof FastExercises !== 'undefined') FastExercises.openPoint(state.categoryId, state.levelId, state.lessonId, state.pointIndex);
        } else if (state.view === 'course') {
          if (state.level) AppState.currentLevel = state.level;
          if (typeof BentoGrid !== 'undefined') BentoGrid.openLessons();
        } else if (state.view === 'courseTheory') {
          if (state.level) AppState.currentLevel = state.level;
          if (typeof BentoGrid !== 'undefined') BentoGrid.openCourseTheory();
        } else if (state.view === 'courseBlock' && state.blockKey) {
          if (state.level) AppState.currentLevel = state.level;
          if (typeof BentoGrid !== 'undefined') BentoGrid._popstateCourseBlock(state.blockKey);
        } else if (state.view === 'courseUnit' && state.unitId) {
          if (state.level) AppState.currentLevel = state.level;
          if (typeof BentoGrid !== 'undefined') BentoGrid._popstateCourseUnit(state);
        } else if (state.view === 'tips') {
          if (typeof TipsPage !== 'undefined') TipsPage._renderHome();
        } else if (state.view === 'tipsSkill' && state.level && state.skill) {
          if (typeof TipsPage !== 'undefined') TipsPage._renderSkill(state.level, state.skill);
        }
      });
      
      console.log('✅ App lista');
    },
    
    restoreExamStatuses: function() {
      var level = AppState.currentLevel;
      var mode = AppState.currentMode;
      var exams = EXAMS_DATA[level] || [];
      exams.forEach(function(exam) {
        if (exam.status !== 'available') return;
        ['reading', 'listening', 'writing', 'speaking'].forEach(function(section) {
          var sectionData = exam.sections[section];
          if (!sectionData) return;
          sectionData.completed = [];
          sectionData.inProgress = [];
          for (var i = 1; i <= sectionData.total; i++) {
            var key = 'cambridge_' + mode + '_' + level + '_' + exam.id + '_' + section + '_' + i;
            try {
              var raw = localStorage.getItem(key);
              if (raw) {
                var data = JSON.parse(raw);
                if (data.answersChecked) {
                  sectionData.completed.push(i);
                } else {
                  sectionData.inProgress.push(i);
                }
              }
            } catch(e) { /* ignore parse errors */ }
          }
        });
      });
    },
    
    updateHeaderModeButtons: function() {
      var mode = AppState.currentView === 'subpage' ? AppState.currentMode : null;
      document.querySelectorAll('.header-mode-btn, .header-nav-btn[data-mode]').forEach(function(btn) {
        if (mode && btn.getAttribute('data-mode') === mode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    },
    
    filterByLevel: function(level) {
      Dashboard.filterByLevel(level);
    },
    
    loadDashboard: function() {
      Exercise.closeExercise({ forceDashboard: true });
    },
    
    syncExamsFromFolders: async function() {
      const levels = Object.keys(EXAMS_DATA || {});
      const getSectionTemplate = function(level) {
        var readingTotal = level === 'B2' ? 7 : 8;
        var readingLabel = level === 'B2' ? 'Reading 1-7' : 'Reading 1-8';
        return {
          reading: { name: 'READING & USE OF ENGLISH', icon: 'book-open', total: readingTotal, completed: [], inProgress: [] },
          listening: { name: 'LISTENING', icon: 'headphones', total: 4, completed: [], inProgress: [] },
          writing: { name: 'WRITING', icon: 'pen', total: 2, completed: [], inProgress: [] },
          speaking: { name: 'SPEAKING', icon: 'microphone', total: 4, completed: [], inProgress: [] },
          _progressStr: `Ejercicios disponibles: ${readingLabel}, Listening 1-4, Writing 1-2, Speaking 1-4`
        };
      };
      
      await Promise.all(levels.map(async level => {
        const existingById = (EXAMS_DATA[level] || []).reduce((acc, exam) => {
          acc[exam.id] = exam;
          return acc;
        }, {});
        const sectionTemplate = getSectionTemplate(level);
        const progressStr = sectionTemplate._progressStr;
        delete sectionTemplate._progressStr;
        
        // Try to load index.json catalog for this level first
        let indexData = null;
        try {
          const indexResponse = await fetch(`Nivel/${level}/Exams/index.json`);
          if (indexResponse.ok) {
            indexData = await indexResponse.json();
          }
        } catch (e) {
          console.debug(`No index.json found for level ${level}, falling back to HEAD requests`);
        }
        
        let discovered = [];
        
        if (indexData && Array.isArray(indexData.tests)) {
          // Build exam list from index.json catalog
          discovered = indexData.tests.map((testEntry, idx) => {
            const examId = testEntry.id;
            const parsed = parseInt(examId.replace('Test', ''), 10);
            const number = Number.isNaN(parsed) ? (idx + 1) : parsed;
            const prev = existingById[examId];
            return {
              id: examId,
              number: number,
              title: `Test ${number}`,
              status: testEntry.status || 'available',
              progress: testEntry.status === 'coming_soon'
                ? 'Próximamente'
                : progressStr,
              sections: prev?.sections || JSON.parse(JSON.stringify(sectionTemplate))
            };
          });
        } else {
          // Fallback: sequential HEAD requests to detect available tests
          let i = 1;
          while (true) {
            const examId = `Test${i}`;
            const testFile = `Nivel/${level}/Exams/${examId}/reading1.json`;
            try {
              const response = await fetch(testFile, { method: 'HEAD' });
              if (!response.ok) {
                console.debug(`Test discovery stopped at ${testFile} (${response.status})`);
                break;
              }
            } catch (error) {
              // Stop discovery if the next sequential test folder is not available.
              console.debug(`Test discovery stopped at ${testFile}`);
              break;
            }
            
            const prev = existingById[examId];
            discovered.push({
              id: examId,
              number: i,
              title: `Test ${i}`,
              status: 'available',
              progress: progressStr,
              sections: prev?.sections || JSON.parse(JSON.stringify(sectionTemplate))
            });
            i++;
          }
        }
        
        EXAMS_DATA[level] = discovered;
      }));
    }
  };
  
  // Exponer funciones globales necesarias
  window.filterByLevel = App.filterByLevel;
  window.loadDashboard = App.loadDashboard;
  window.openScoreCalculator = function() {
    if (AppState.currentExercise) Exercise.closeExercise();
    ScoreCalculator.render();
  };
  
  // Deshabilitar el corrector ortográfico del navegador en todos los inputs y textareas
  function disableSpellcheck(el) {
    if ((el.tagName === 'INPUT' && el.type === 'text') || el.tagName === 'TEXTAREA') {
      el.spellcheck = false;
    }
  }
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input[type="text"], textarea').forEach(disableSpellcheck);
    new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          disableSpellcheck(node);
          node.querySelectorAll('input[type="text"], textarea').forEach(disableSpellcheck);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  });

  // Inicializar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
