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
        return Promise.resolve();
      }
      
      const cssId = `css-${type}`;
      if (document.getElementById(cssId)) {
        console.log(`✅ CSS ya cargado para tipo: ${type}`);
        return Promise.resolve();
      }
      
      const loadStylesheet = function(id, href, label) {
        return new Promise(function(resolve) {
          if (document.getElementById(id)) {
            resolve();
            return;
          }
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = href;
          link.onload = function() { console.log(`🎨 CSS cargado: ${label}`); resolve(); };
          link.onerror = function() { console.error(`❌ Error cargando CSS: ${label}`); resolve(); };
          document.head.appendChild(link);
        });
      };

      const baseUrl = `${window.CONFIG.CSS_BASE_URL}exercise-types/`;
      const typePromise = loadStylesheet(cssId, window.CONFIG.assetUrl(`${baseUrl}${fileInfo.css}`), fileInfo.css);
      const isWritingType = fileInfo.css.indexOf('writing-type') === 0;
      const sharedPromise = isWritingType
        ? typePromise.then(function() {
            return loadStylesheet('css-writing-shared', window.CONFIG.assetUrl(`${baseUrl}writing-shared.css`), 'writing-shared.css');
          })
        : typePromise;

      return sharedPromise;
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
        script.src = window.CONFIG.assetUrl(`${window.CONFIG.JS_BASE_URL}exercise-types/${fileInfo.js}`);
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
          link.href = window.CONFIG.assetUrl(`${window.CONFIG.CSS_BASE_URL}components/${item.file}`);
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

      var norm = window.SunePlayNormalize;
      function normalizedSentenceMatch(given, expected) {
        if (norm && norm.answersMatch) {
          return norm.answersMatch(given, expected);
        }
        var givenLower = String(given == null ? '' : given).trim().toLowerCase();
        return givenLower === String(expected == null ? '' : expected).trim().toLowerCase();
      }
      function normalizedIncludes(given, expected) {
        if (norm && norm.normalizeAnswer) {
          var givenNorm = norm.normalizeAnswer(given);
          var expectedNorm = norm.normalizeAnswer(expected);
          return givenNorm.indexOf(expectedNorm) !== -1;
        }
        return String(given == null ? '' : given).toLowerCase().indexOf(String(expected).toLowerCase()) !== -1;
      }
      
      switch(questionType) {
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion': {
          var ua = String(userAnswer == null ? '' : userAnswer).trim();
          if (!ua) return false;
          if (Array.isArray(correctAnswer)) {
            return correctAnswer.some(function(ans) {
              return normalizedSentenceMatch(ua, ans);
            });
          }
          var ca = String(correctAnswer == null ? '' : correctAnswer);
          if (ca.indexOf('/') !== -1) {
            return ca.split('/').some(function(ans) {
              return normalizedSentenceMatch(ua, ans);
            });
          }
          return normalizedSentenceMatch(ua, ca);
        }
          
        case 'transformations': {
          var ut = String(userAnswer == null ? '' : userAnswer);
          if (Array.isArray(correctAnswer)) {
            return correctAnswer.some(function(ans) {
              return normalizedIncludes(ut, ans);
            });
          }
          if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
            return correctAnswer.split('/').some(function(ans) {
              return normalizedIncludes(ut, ans);
            });
          }
          return normalizedIncludes(ut, correctAnswer);
        }
          
        default:
          if (norm && norm.answersMatch) {
            return norm.answersMatch(userAnswer, correctAnswer);
          }
          return userAnswer === correctAnswer;
      }
    },

    isAnswerViewCorrectActive: function() {
      return typeof AppState !== 'undefined' &&
        AppState.answersChecked &&
        AppState.answerViewMode === 'correct' &&
        typeof ExerciseHandlers !== 'undefined' &&
        typeof ExerciseHandlers.shouldEnableAnswerToggle === 'function' &&
        ExerciseHandlers.shouldEnableAnswerToggle();
    },

    QUESTION_NUMBER_STATE_CLASSES: ['answered', 'correct', 'incorrect', 'unanswered-checked', 'show-correct'],

    getQuestionNumberStateClass: function(opts) {
      if (!opts.isChecked) {
        return opts.answer ? 'answered' : '';
      }
      if (this.isAnswerViewCorrectActive()) {
        return 'show-correct';
      }
      var isCorrect = this.compareAnswers(opts.answer, opts.correct, opts.questionType);
      if (isCorrect) return 'correct';
      return opts.answer ? 'incorrect' : 'unanswered-checked';
    },

    applyQuestionNumberStateClass: function(el, stateClass) {
      if (!el) return;
      var self = this;
      this.QUESTION_NUMBER_STATE_CLASSES.forEach(function(cls) {
        el.classList.toggle(cls, cls === stateClass);
      });
    },

    syncQuestionNumberBadges: function() {
      if (typeof AppState === 'undefined' || !AppState.currentExercise) return;
      var content = AppState.currentExercise.content || {};
      var questions = content.questions || [];
      if (!questions.length && content.task1 && content.task2) {
        questions = (content.task1.questions || []).concat(content.task2.questions || []);
      }
      var answers = AppState.currentExercise.answers || {};
      var isChecked = AppState.answersChecked;
      var partConfig = typeof CONFIG !== 'undefined' && CONFIG.getPartConfig
        ? CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart)
        : null;
      var questionType = partConfig ? partConfig.type : undefined;
      var hasDualTasks = !!content.task1;
      var self = this;

      document.querySelectorAll('.reading-type5-question-number[data-qnum], .listening-type1-question-number[data-qnum], .listening-type4-q-number[data-qnum]').forEach(function(el) {
        var qNum = parseInt(el.getAttribute('data-qnum'), 10);
        if (!qNum) return;
        var question = questions.find(function(q) { return q.number === qNum; });
        if (!question) return;
        var answer = answers[qNum];
        if (!answer && hasDualTasks) {
          answer = answers['t1_' + qNum] || answers['t2_' + qNum];
        }
        var stateClass = self.getQuestionNumberStateClass({
          answer: answer,
          correct: question.correct,
          isChecked: isChecked,
          questionType: questionType
        });
        self.applyQuestionNumberStateClass(el, stateClass);
      });
    },
    
    // Etiqueta del badge de ejercicio (p. ej. "Reading - Part 2", no el título del texto)
    /** B1/B2/C1 test exercises use the shared Duolingo-style UI shell. */
    isDuoExerciseUi: function(level) {
      var lvl = level || (typeof AppState !== 'undefined' && AppState.currentLevel) || '';
      return lvl === 'B1' || lvl === 'B2' || lvl === 'C1';
    },

    isDuoListeningSection: function() {
      return this.isDuoExerciseUi() &&
        typeof AppState !== 'undefined' &&
        AppState.currentSection === 'listening';
    },

    isDuoOpenClozeReading: function(section, part) {
      if (!this.isDuoExerciseUi() || typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      if (section !== 'reading') return false;
      var pc = CONFIG.getPartConfig('reading', part);
      return !!(pc && pc.type === 'open-cloze');
    },

    isDuoGappedTextReading: function(section, part) {
      if (!this.isDuoExerciseUi() || typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      if (section !== 'reading') return false;
      var pc = CONFIG.getPartConfig('reading', part);
      return !!(pc && pc.type === 'gapped-text');
    },

    isB1GappedTextReading: function(section, part) {
      if (!this.isDuoGappedTextReading(section, part)) return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      return AppState.currentLevel === 'B1' && part === 4;
    },

    isC1GappedTextReading: function(section, part) {
      if (!this.isDuoGappedTextReading(section, part)) return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      return AppState.currentLevel === 'C1' && part === 7;
    },

    /** B1 Reading Part 5, B2/C1 Reading Part 1: inline MC cloze chips in the passage. */
    isDuoInlineMcClozeReading: function() {
      if (typeof AppState === 'undefined' || !this.isDuoExerciseUi()) return false;
      if (AppState.currentSection !== 'reading') return false;
      if (AppState.currentLevel === 'B1' && AppState.currentPart === 5) return true;
      if ((AppState.currentLevel === 'B2' || AppState.currentLevel === 'C1') && AppState.currentPart === 1) return true;
      return false;
    },

    isB1InlineMcClozeReading: function() {
      return this.isDuoInlineMcClozeReading();
    },

    isDuoWordFormationReading: function(section, part) {
      if (!this.isDuoExerciseUi() || typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      if (section !== 'reading') return false;
      var pc = CONFIG.getPartConfig('reading', part);
      return !!(pc && pc.type === 'word-formation');
    },

    isDuoTransformationsReading: function(section, part) {
      if (!this.isDuoExerciseUi() || typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      if (section !== 'reading') return false;
      var pc = CONFIG.getPartConfig('reading', part);
      return !!(pc && pc.type === 'transformations');
    },

    isDuoReadingPlainPassage: function(section, part) {
      if (!this.isDuoExerciseUi() || typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      if (section !== 'reading') return false;
      var pc = CONFIG.getPartConfig('reading', part);
      var typesWithPassage = ['open-cloze', 'gapped-text', 'multiple-choice-text', 'word-formation', 'transformations'];
      return !!(pc && typesWithPassage.indexOf(pc.type) !== -1);
    },

    /** C1 Reading Part 6: cross-text multiple matching with Duo text cards + letter chips. */
    isDuoCrossTextReading: function(section, part) {
      if (!this.isDuoExerciseUi() || typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      if (section !== 'reading') return false;
      var pc = CONFIG.getPartConfig('reading', part);
      return !!(pc && pc.type === 'cross-text-matching');
    },

    /** B1 Reading 2, B2 Reading 7, C1 Reading 8 — Duolingo chip + card matching UI. */
    isDuoMultipleMatchingReading: function(section, part) {
      if (!this.isDuoExerciseUi() || typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      if (section !== 'reading') return false;
      var pc = CONFIG.getPartConfig('reading', part);
      if (!pc || pc.type !== 'multiple-matching') return false;
      var level = AppState.currentLevel;
      if (level === 'B1' && part === 2) return true;
      if (level === 'B2' && part === 7) return true;
      if (level === 'C1' && part === 8) return true;
      return false;
    },

    /** C1 Reading Part 8 — answer via bottom panel; no answer paragraph under question cards. */
    isC1Reading8: function(section, part) {
      if (typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      return section === 'reading' && AppState.currentLevel === 'C1' && part === 8;
    },

    /** B2 Reading Part 7 — multiple matching with bottom panel modal (like C1 Part 8). */
    isB2Reading7: function(section, part) {
      if (typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      return section === 'reading' && AppState.currentLevel === 'B2' && part === 7;
    },

    /** B2 Reading Part 7 / C1 Reading Part 8 — open modal with question + text options. */
    usesMatchingModalPanel: function(section, part) {
      return this.isC1Reading8(section, part) || this.isB2Reading7(section, part);
    },

    /** C1 Reading Part 6 — cross-text matching with bottom question panel. */
    isC1Reading6: function(section, part) {
      if (typeof AppState === 'undefined') return false;
      section = section || AppState.currentSection;
      part = part != null ? part : AppState.currentPart;
      return section === 'reading' && AppState.currentLevel === 'C1' && part === 6;
    },

    /** C1 Reading Parts 6 & 8, B2 Reading Part 7 — open bottom panel instead of scrolling to Questions tab. */
    usesC1ReadingBottomPanel: function(section, part) {
      return this.isC1Reading6(section, part) || this.usesMatchingModalPanel(section, part);
    },

    /** B1 Reading 2 swaps People/Options tabs; C1/B2 keep Text/Questions order. */
    usesDuoMatchingSwappedLayout: function(exercise) {
      return !!(exercise && exercise._b1PetReading2Ui);
    },

    hasDuoMatchingUi: function(exercise, section, part) {
      if (exercise && exercise._b1PetReading2Ui) return true;
      return this.isDuoMultipleMatchingReading(section, part) || this.isDuoCrossTextReading(section, part);
    },

    /** After check answers: which toggle view shows the chip results strip. */
    duoMatchingResultsView: function(exercise) {
      return this.usesDuoMatchingSwappedLayout(exercise) ? 'text' : 'questions';
    },

    isDuoListeningInterviewPart: function() {
      if (!this.isDuoListeningSection() || typeof AppState === 'undefined') return false;
      if (AppState.currentLevel === 'B1' && AppState.currentPart === 4) return true;
      if (AppState.currentLevel === 'B2' && AppState.currentPart === 4) return true;
      return false;
    },

    isDuoListeningSentenceCompletion: function() {
      if (!this.isDuoListeningSection() || typeof AppState === 'undefined') return false;
      var pc = CONFIG.getPartConfig('listening', AppState.currentPart);
      return !!(pc && pc.type === 'sentence-completion');
    },

    /** B2/C1 Listening Part 2: transcript explanation mode (not answer toggle). */
    isC1ListeningSentenceCompletion: function() {
      if (!this.isDuoListeningSentenceCompletion()) return false;
      if (AppState.currentPart !== 2) return false;
      return AppState.currentLevel === 'B2' || AppState.currentLevel === 'C1';
    },

    isB1ListeningSentenceCompletion: function() {
      if (!this.isDuoListeningSentenceCompletion()) return false;
      return AppState.currentLevel === 'B1' && AppState.currentPart === 3;
    },

    usesListeningType2ExplanationMode: function() {
      return this.isC1ListeningSentenceCompletion() || this.isB1ListeningSentenceCompletion();
    },

    isC1ListeningDualMatching: function() {
      if (!this.isDuoListeningSection() || typeof AppState === 'undefined') return false;
      if (AppState.currentLevel !== 'C1' || AppState.currentPart !== 4) return false;
      var pc = CONFIG.getPartConfig('listening', AppState.currentPart);
      return !!(pc && pc.type === 'dual-matching');
    },

    isB2ListeningSpeakerMatching: function() {
      if (!this.isDuoListeningSection() || typeof AppState === 'undefined') return false;
      if (AppState.currentLevel !== 'B2' || AppState.currentPart !== 3) return false;
      var pc = CONFIG.getPartConfig('listening', AppState.currentPart);
      return !!(pc && pc.type === 'speaker-matching');
    },

    getExerciseBadgeLabel: function(section, part, exercise) {
      if (section === 'reading') {
        return 'Reading - Part ' + part;
      }
      return (exercise && exercise.title) || 'Exercise';
    },

    // Obtener título de sección
    getSectionTitle: function(section) {
      var lvl = (typeof AppState !== 'undefined' && AppState.currentLevel) || 'C1';
      const titles = {
        'reading': lvl === 'B1' ? 'READING' : 'READING & UOE',
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
    
    /** Plain correct-answer label for gap hover hints (no checkmark prefix). */
    correctHintText: function(word) {
      return String(word == null ? '' : word).trim();
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
