// js/app.js
(function() {
  var STATIC_PAGE_VIEWS = ['terms', 'about', 'contact', 'privacy', 'faq'];

  window.App = {
    hasAppAccess: function () {
      if (AppState.isAuthenticated) return true;
      try {
        if (localStorage.getItem('engaged_onboarding_done_v1') === '1') {
          if (!AppState.isAuthenticated) AppState.isGuest = true;
          return true;
        }
      } catch (e) { /* ignore */ }
      return false;
    },

    restoreAccessState: function () {
      try {
        if (!AppState.isAuthenticated && localStorage.getItem('engaged_onboarding_done_v1') === '1') {
          AppState.isGuest = true;
        }
      } catch (e) { /* ignore */ }
    },

    openLearningHome: async function(options) {
      options = options || {};
      if (typeof Landing !== 'undefined') Landing.hide();
      var app = document.getElementById('app');
      if (app) app.style.display = '';
      if (typeof DashboardNav !== 'undefined' && DashboardNav.openCourseSection) {
        await DashboardNav.openCourseSection('learning', null, options);
      }
    },

    handleRoute: function (state) {
      state = state || { view: 'landing' };

      if (state.view !== 'login' && state.view !== 'register') {
        if (typeof Auth !== 'undefined') Auth._hideAuthScreen();
      }
      if (state.view !== 'landing') {
        if (typeof Landing !== 'undefined') Landing.hide();
      }
      if (state.view !== 'welcome') {
        if (typeof Onboarding !== 'undefined') Onboarding.hide();
      }

      if (state.view === 'login') {
        if (AppState.isAuthenticated) {
          this.openLearningHome({ fromRoute: true });
          return;
        }
        if (typeof Auth !== 'undefined') Auth.showLoginPage();
        return;
      }
      if (state.view === 'register') {
        if (AppState.isAuthenticated) {
          this.openLearningHome({ fromRoute: true });
          return;
        }
        if (typeof Auth !== 'undefined') Auth.showRegisterPage();
        return;
      }
      if (state.view === 'welcome') {
        this.showWelcome();
        return;
      }
      if (state.view === 'landing') {
        if (this.hasAppAccess()) {
          this.openLearningHome({ fromRoute: true });
        } else if (typeof Landing !== 'undefined') {
          Landing.render();
        }
        return;
      }

      if (state.view === 'profile' && !AppState.isAuthenticated) {
        if (typeof Auth !== 'undefined') Auth.navigateTo('/login');
        return;
      }

      if (!this.hasAppAccess() && state.view !== 'exercise') {
        if (typeof Landing !== 'undefined') Landing.render();
        history.replaceState({ view: 'landing' }, '', '/');
        return;
      }

      this._renderAppView(state);
    },

    showWelcome: function () {
      if (typeof Landing !== 'undefined') Landing.hide();
      if (typeof Auth !== 'undefined') Auth._hideAuthScreen();

      if (this.hasAppAccess() && typeof Onboarding !== 'undefined' && !Onboarding.needsShow()) {
        this.openLearningHome({ fromRoute: true });
        return;
      }

      AppState.currentView = 'welcome';
      var app = document.getElementById('app');
      if (app) app.style.display = 'none';

      if (typeof Onboarding !== 'undefined') {
        Onboarding.show();
      }
    },

    afterSuccessfulAuth: function () {
      if (typeof Onboarding !== 'undefined' && Onboarding.needsShow()) {
        history.replaceState({ view: 'welcome' }, '', '/welcome');
        this.showWelcome();
      } else {
        this.openLearningHome({ fromRoute: true });
      }
    },

    _renderAppView: function (state) {
      if (typeof Landing !== 'undefined') Landing.hide();
      var app = document.getElementById('app');
      if (app) app.style.display = '';

      if (typeof DashboardNav !== 'undefined' && DashboardNav.closeGradeEvolution && (!state || state.view !== 'gradeEvolution')) {
        DashboardNav.closeGradeEvolution({ skipHistory: true });
      }

      if (!state || state.view === 'dashboard') {
        if (AppState.currentExercise) {
          Exercise.closeExercise({ skipHistory: true });
        } else {
          this.openLearningHome({ fromRoute: true });
        }
      } else if (state.view === 'testsHub') {
        if (typeof DashboardNav !== 'undefined') {
          if (state.mode) {
            if (typeof UserProfile !== 'undefined' && UserProfile.setPreferredMode) {
              UserProfile.setPreferredMode(state.mode);
            } else {
              AppState.currentMode = state.mode;
            }
          }
          DashboardNav.openTests(state.level || null, state.examId || null, { fromRoute: true, mode: state.mode });
        }
      } else if (state.view === 'subpage' && state.mode) {
        Dashboard.renderSubpage(state.mode, state.expandExamId || null);
      } else if (state.view === 'exercise' && state.examId && state.section && state.part) {
        if (state.level) AppState.currentLevel = state.level;
        if (state.mode) {
          if (typeof UserProfile !== 'undefined' && UserProfile.setPreferredMode) {
            UserProfile.setPreferredMode(state.mode);
          } else {
            AppState.currentMode = state.mode;
            localStorage.setItem('preferred_mode', state.mode);
          }
        }
        Exercise.openPart(state.examId, state.section, state.part);
      } else if (state.view === 'profile') {
        Dashboard.render();
        if (typeof UserProfile !== 'undefined') UserProfile.renderProfileSection();
      } else if (state.view === 'premium') {
        Dashboard.render();
        if (typeof UserProfile !== 'undefined') {
          if (typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI()) {
            UserProfile.renderProfileSection();
          } else {
            UserProfile.renderPremiumSection();
          }
        }
      } else if (state.view === 'gradeEvolution') {
        Dashboard.render();
        if (typeof DashboardNav !== 'undefined') DashboardNav.openGradeEvolution({ fromRoute: true });
      } else if (state.view === 'quicksteps') {
        Dashboard.render();
        if (typeof DashboardNav !== 'undefined') DashboardNav.openQuickstepsChooser();
      } else if (state.view === 'crosswordList') {
        if (typeof DashboardNav !== 'undefined') DashboardNav.openCrosswordList(null, state.level || null, { fromRoute: true });
      } else if (state.view === 'crosswordPlay' && state.level && typeof state.cwIndex !== 'undefined') {
        if (typeof FastExercises !== 'undefined') FastExercises._openMixedCrossword(state.level, state.cwIndex, { fromRoute: true });
      } else if (state.view === 'wordleList') {
        if (typeof DashboardNav !== 'undefined') DashboardNav.openWordleSection(null, state.level || null, { fromRoute: true });
      } else if (state.view === 'wordlePlay' && state.level && typeof state.wlIndex !== 'undefined') {
        if (typeof FastExercises !== 'undefined') FastExercises._openWordleLevel(state.level, state.wlIndex, { fromRoute: true });
      } else if (state.view === 'fastExercises') {
        Dashboard.render();
        if (typeof FastExercises !== 'undefined') FastExercises.openCategories();
      } else if (state.view === 'fastExerciseCategory' && state.categoryId) {
        Dashboard.render();
        if (typeof FastExercises !== 'undefined') FastExercises.openCategory(state.categoryId);
      } else if (state.view === 'fastExercisePoint' && state.categoryId && state.levelId && state.lessonId && typeof state.pointIndex !== 'undefined') {
        Dashboard.render();
        if (typeof FastExercises !== 'undefined') FastExercises.openPoint(state.categoryId, state.levelId, state.lessonId, state.pointIndex);
      } else if (state.view === 'videoExercises') {
        Dashboard.render();
        if (typeof VideoExercises !== 'undefined') VideoExercises.openHub({ fromRoute: true });
      } else if (state.view === 'videoExercise' && state.exerciseId) {
        Dashboard.render();
        if (typeof VideoExercises !== 'undefined') VideoExercises.openExercise(state.exerciseId, { fromRoute: true });
      } else if (state.view === 'course') {
        if (typeof DashboardNav !== 'undefined') DashboardNav.openLessons({ fromRoute: true });
      } else if (state.view === 'courseSection' && state.section) {
        if (typeof DashboardNav !== 'undefined') {
          DashboardNav.openCourseSection(state.section, state.level, {
            fromRoute: true,
            showStageList: !!state.showStageList
          });
        }
      } else if (state.view === 'courseEtapa' && state.section && state.level && state.etapaKey) {
        if (typeof DashboardNav !== 'undefined') {
          DashboardNav.openCourseSection(state.section, state.level, { fromRoute: true, etapaKey: state.etapaKey });
        }
      } else if (state.view === 'courseTheory') {
        if (typeof DashboardNav !== 'undefined') DashboardNav.openCourseSection('learning', state.level, { fromRoute: true });
      } else if (state.view === 'courseBlock' && state.blockKey) {
        Dashboard.render();
        if (state.level) AppState.currentLevel = state.level;
        if (typeof DashboardNav !== 'undefined') DashboardNav._popstateCourseBlock(state.blockKey);
      } else if (state.view === 'courseUnit' && state.unitId) {
        Dashboard.render();
        if (state.level) AppState.currentLevel = state.level;
        if (typeof DashboardNav !== 'undefined') DashboardNav._popstateCourseUnit(state);
      } else if (state.view === 'tips') {
        Dashboard.render();
        if (typeof TipsPage !== 'undefined') TipsPage._renderHome();
      } else if (state.view === 'tipsSkill' && state.level && state.skill) {
        Dashboard.render();
        if (typeof TipsPage !== 'undefined') TipsPage._renderSkill(state.level, state.skill);
      } else if (STATIC_PAGE_VIEWS.indexOf(state.view) !== -1) {
        if (typeof StaticPages !== 'undefined') StaticPages.render(state.view, false);
      } else {
        this.openLearningHome({ fromRoute: true });
      }
    },

    init: async function() {
      try {
      console.log('🚀 Iniciando aplicación v' + CONFIG.APP_VERSION);
      
      // Inicializar autenticación Supabase
      if (typeof Auth !== 'undefined') {
        await Auth.init();
      }

      this.restoreAccessState();

      if (this.hasAppAccess() && typeof AppLoadingScreen !== 'undefined') {
        AppLoadingScreen.skipDelay();
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
      if (typeof UserProfile !== 'undefined' && UserProfile.setPreferredMode) {
        UserProfile.setPreferredMode(savedMode);
      } else {
        AppState.currentMode = savedMode;
      }
      
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
        if (typeof UserProfile !== 'undefined' && UserProfile.setPreferredMode) {
          UserProfile.setPreferredMode(initialState.mode);
        } else {
          AppState.currentMode = initialState.mode;
          localStorage.setItem('preferred_mode', initialState.mode);
        }
      }
      
      // Render the view indicated by the URL
      if (initialState.view === 'exercise' && initialState.examId && initialState.section && initialState.part) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        Exercise.openPart(initialState.examId, initialState.section, initialState.part);
      } else if (initialState.view === 'testsHub') {
        if (typeof Landing !== 'undefined') Landing.hide();
        var _testsAppEl = document.getElementById('app'); if (_testsAppEl) _testsAppEl.style.display = '';
        if (typeof DashboardNav !== 'undefined') await DashboardNav.openTests(initialState.level || null, initialState.examId || null, { fromRoute: true, mode: initialState.mode });
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
        if (typeof UserProfile !== 'undefined') {
          if (typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI()) {
            UserProfile.renderProfileSection();
          } else {
            UserProfile.renderPremiumSection();
          }
        }
      } else if (initialState.view === 'gradeEvolution') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof DashboardNav !== 'undefined') DashboardNav.openGradeEvolution({ fromRoute: true });
      } else if (initialState.view === 'quicksteps') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof DashboardNav !== 'undefined') DashboardNav.openQuickstepsChooser();
      } else if (initialState.view === 'crosswordList') {
        if (typeof Landing !== 'undefined') Landing.hide();
        var _cwAppEl = document.getElementById('app'); if (_cwAppEl) _cwAppEl.style.display = '';
        if (typeof DashboardNav !== 'undefined') await DashboardNav.openCrosswordList(null, initialState.level || null, { fromRoute: true });
      } else if (initialState.view === 'crosswordPlay' && initialState.level && typeof initialState.cwIndex !== 'undefined') {
        if (typeof Landing !== 'undefined') Landing.hide();
        var _cwAppEl = document.getElementById('app'); if (_cwAppEl) _cwAppEl.style.display = '';
        if (typeof FastExercises !== 'undefined') await FastExercises._openMixedCrossword(initialState.level, initialState.cwIndex, { fromRoute: true });
      } else if (initialState.view === 'wordleList') {
        if (typeof Landing !== 'undefined') Landing.hide();
        var _wlAppEl = document.getElementById('app'); if (_wlAppEl) _wlAppEl.style.display = '';
        if (typeof DashboardNav !== 'undefined') await DashboardNav.openWordleSection(null, initialState.level || null, { fromRoute: true });
      } else if (initialState.view === 'wordlePlay' && initialState.level && typeof initialState.wlIndex !== 'undefined') {
        if (typeof Landing !== 'undefined') Landing.hide();
        var _wlAppEl = document.getElementById('app'); if (_wlAppEl) _wlAppEl.style.display = '';
        if (typeof FastExercises !== 'undefined') await FastExercises._openWordleLevel(initialState.level, initialState.wlIndex, { fromRoute: true });
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
      } else if (initialState.view === 'videoExercises') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof VideoExercises !== 'undefined') VideoExercises.openHub({ fromRoute: true });
      } else if (initialState.view === 'videoExercise' && initialState.exerciseId) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof VideoExercises !== 'undefined') VideoExercises.openExercise(initialState.exerciseId, { fromRoute: true });
      } else if (initialState.view === 'course') {
        if (typeof DashboardNav !== 'undefined') DashboardNav.openLessons({ fromRoute: true });
      } else if (initialState.view === 'courseSection' && initialState.section) {
        if (typeof DashboardNav !== 'undefined') {
          DashboardNav.openCourseSection(initialState.section, initialState.level, {
            fromRoute: true,
            showStageList: !!initialState.showStageList
          });
        }
      } else if (initialState.view === 'courseEtapa' && initialState.section && initialState.level && initialState.etapaKey) {
        if (typeof DashboardNav !== 'undefined') {
          DashboardNav.openCourseSection(initialState.section, initialState.level, { fromRoute: true, etapaKey: initialState.etapaKey });
        }
      } else if (initialState.view === 'courseTheory') {
        if (typeof DashboardNav !== 'undefined') DashboardNav.openCourseSection('learning', initialState.level, { fromRoute: true });
      } else if (initialState.view === 'courseBlock' && initialState.blockKey) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (initialState.level) AppState.currentLevel = initialState.level;
        if (typeof DashboardNav !== 'undefined') DashboardNav._popstateCourseBlock(initialState.blockKey);
      } else if (initialState.view === 'courseUnit' && initialState.unitId) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (initialState.level) AppState.currentLevel = initialState.level;
        if (typeof DashboardNav !== 'undefined') DashboardNav._popstateCourseUnit(initialState);
      } else if (initialState.view === 'tips') {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof TipsPage !== 'undefined') TipsPage.openTipsHome();
      } else if (initialState.view === 'tipsSkill' && initialState.level && initialState.skill) {
        history.replaceState({ view: 'dashboard' }, '', '/');
        Dashboard.render();
        if (typeof TipsPage !== 'undefined') TipsPage.openTipsSkill(initialState.level, initialState.skill);
      } else if (STATIC_PAGE_VIEWS.indexOf(initialState.view) !== -1) {
        if (typeof StaticPages !== 'undefined') StaticPages.render(initialState.view, false);
      } else if (initialState.view === 'landing' || initialState.view === 'welcome' ||
                 initialState.view === 'login' || initialState.view === 'register') {
        if (this.hasAppAccess() && (initialState.view === 'landing' || initialState.view === 'welcome')) {
          this.openLearningHome({ fromRoute: true });
        } else {
          this.handleRoute(initialState);
          history.replaceState(initialState, '', Router.stateToPath(initialState));
        }
      } else if (this.hasAppAccess()) {
        this._renderAppView(initialState);
        if (initialState.view === 'dashboard' || initialState.view === 'subpage' || initialState.view === 'testsHub') {
          history.replaceState(initialState, '', Router.stateToPath(initialState));
        }
      } else {
        this.handleRoute({ view: 'landing' });
        history.replaceState({ view: 'landing' }, '', '/');
      }

      if (typeof Auth !== 'undefined') Auth.renderSignInButton();

      // Update header mode buttons
      this.updateHeaderModeButtons();
      
      // Handle browser back/forward buttons
      window.addEventListener('popstate', function(e) {
        var state = e.state;
        if (!state) {
          App.handleRoute({ view: 'landing' });
          return;
        }
        if (state.view === 'landing' || state.view === 'welcome' ||
            state.view === 'login' || state.view === 'register' ||
            state.view === 'profile') {
          App.handleRoute(state);
          return;
        }
        if (state.view === 'dashboard') {
          App._renderAppView(state);
          return;
        }
        App._renderAppView(state);
      });
      
      console.log('✅ App lista');
      } catch (err) {
        console.error('[App] init failed:', err);
      } finally {
        if (typeof AppLoadingScreen !== 'undefined') AppLoadingScreen.hide();
      }
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

    refreshProgressUI: function () {
      this.restoreExamStatuses();
      if (typeof Router === 'undefined' || typeof App === 'undefined') return;
      var app = document.getElementById('app');
      if (!app || app.style.display === 'none') return;
      var state = Router.pathToState();
      if (!state || state.view === 'landing' || state.view === 'login' || state.view === 'register' || state.view === 'welcome') {
        return;
      }
      this.handleRoute(state);
    },
    
    updateHeaderModeButtons: function() {
      if (typeof MainNav !== 'undefined' && MainNav.setActive) {
        MainNav.setActive();
      }
    },
    
    filterByLevel: function(level) {
      Dashboard.filterByLevel(level);
    },
    
    loadDashboard: function() {
      if (AppState.currentExercise) {
        Exercise.closeExercise({ forceDashboard: true });
        return;
      }
      this.openLearningHome();
    },
    
    syncExamsFromFolders: async function() {
      const levels = Object.keys(EXAMS_DATA || {});
        const getSectionTemplate = function(level) {
        var readingTotal = CONFIG.getReadingPartCount(level);
        var readingLabel = 'Reading 1-' + readingTotal;
        return {
          reading: { name: level === 'B1' ? 'READING' : 'READING & UOE', icon: 'book-open', total: readingTotal, completed: [], inProgress: [] },
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
  window.openScoreCalculator = function(evt) {
    if (AppState.currentExercise) Exercise.closeExercise();
    var trigger = (evt && evt.currentTarget) ? evt.currentTarget : null;
    ScoreCalculator.openInputPopover(trigger);
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
