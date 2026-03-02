// js/exercise-renderer.js
(function() {
  window.ExerciseRenderer = {
    render: function(exercise, examId, section, part) {
      const content = document.getElementById('main-content');
      const partConfig = CONFIG.PART_TYPES[section === 'reading' ? part : `${section}${part}`] || CONFIG.PART_TYPES[1];
      
      // Cargar CSS y JS específicos del tipo de ejercicio
      Utils.loadExerciseTypeCSS(partConfig.type);
      Utils.loadExerciseTypeJS(partConfig.type);
      
      // Cargar CSS/JS adicional para secciones de listening
      if (section === 'listening') {
        Utils.loadExerciseTypeCSS('listening-' + part);
        Utils.loadExerciseTypeJS('listening-' + part);
      }
      
      const paragraphs = exercise.content.text ? exercise.content.text.split('||') : [];
      let paragraphsHTML = this.renderParagraphs(paragraphs, exercise, partConfig);
      
      // For transformations (Part 4), render questions directly if no text
      if (partConfig.type === 'transformations' && !exercise.content.text && exercise.content.questions) {
        paragraphsHTML = this.renderTransformationQuestions(exercise, partConfig);
      }
      
      // For multiple-choice-text (Part 5), render questions directly if no text
      if (partConfig.type === 'multiple-choice-text' && !exercise.content.text && exercise.content.questions) {
        paragraphsHTML = this.renderMultipleChoiceTextQuestions(exercise, partConfig);
      }
      
      let exampleHTML = this.renderExampleBox(exercise.content.example, partConfig);
      
      const sectionTitle = Utils.getSectionTitle(section);
      const levelName = Utils.getLevelName(AppState.currentLevel);
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === examId);
      const totalParts = exam?.sections[section]?.total || 1;
      
      let html = `
        <div class="exercise-container">
          <div class="exercise-header">
            <div class="exercise-title">
              <h2>${levelName} - ${sectionTitle}</h2>
              <div class="exercise-subtitle" data-i18n="part">${I18n.t('part')} ${part} ${I18n.t('of')} ${totalParts}</div>
              <span class="exercise-badge">${exercise.title || I18n.t('exercise')}</span>
            </div>
            <div class="exercise-toolbar">
              <button class="btn-exit" onclick="Exercise.closeExercise()">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <div class="exercise-info">
            <div class="exercise-info-left">
              <span><i class="fas fa-clock"></i> ${exercise.time || '10'} <span data-i18n="minutes">${I18n.t('minutes')}</span></span>
              <span><i class="fas fa-question-circle"></i> ${exercise.totalQuestions || partConfig.total} <span data-i18n="questions">${I18n.t('questions')}</span></span>
            </div>
            <div class="exercise-info-right">
              <div class="exercise-timer" id="exercise-timer">
                <i class="fas fa-hourglass-half"></i>
                <span id="timer-display">${Utils.formatTime(AppState.elapsedSeconds)}</span>
              </div>
              <div class="score-display" id="score-display">0/${exercise.totalQuestions || partConfig.total}</div>
            </div>
          </div>
          
          <div class="exercise-description">
            <p data-i18n-description="${this.getDescriptionKey(partConfig)}">${exercise.description || this.getDefaultDescription(partConfig)}</p>
          </div>
          
          ${exampleHTML}
          
          <div class="tool-tabs-horizontal">
            <button class="tool-btn-nav" id="tab-notes" onclick="Tools.switchTool('notes')">
              <i class="fas fa-highlighter"></i> <span data-i18n="highlight">${I18n.t('highlight')}</span>
            </button>
            <button class="tool-btn-nav" id="tab-freenotes" onclick="Tools.switchTool('freenotes')">
              <i class="fas fa-sticky-note"></i> <span data-i18n="notes">${I18n.t('notes')}</span>
            </button>
            <button class="tool-btn-nav" id="tab-dict" onclick="Tools.switchTool('dict')">
              <i class="fas fa-book"></i> <span data-i18n="dictionary">${I18n.t('dictionary')}</span>
            </button>
            <button class="tool-btn-nav" id="tab-translate" onclick="Tools.switchTool('translate')">
              <i class="fas fa-language"></i> <span data-i18n="translate">${I18n.t('translate')}</span>
            </button>
            <button class="tool-btn-nav" id="tab-tips" onclick="Tools.switchTool('tips')">
              <i class="fas fa-lightbulb"></i> <span data-i18n="tips">${I18n.t('tips')}</span>
            </button>
          </div>
          
          <div class="exercise-main-layout">
            <div class="reading-text-enhanced" id="selectable-text">
              ${paragraphsHTML}
            </div>
          </div>

          <div id="active-tool-content" class="active-tool-content">
            <p class="placeholder-text" data-i18n="activateTool">${I18n.t('activateTool')}</p>
          </div>
          
          ${this.renderExplanationsSection(exercise)}
          
          <div class="exercise-footer">
            ${this.renderExerciseFooter(part, totalParts)}
          </div>
        </div>`;
      
      content.innerHTML = html;
      
      // Inicializar listeners específicos después de renderizar
      setTimeout(() => {
        this.initTypeSpecificListeners(partConfig.type);
      }, 100);
    },
    
    renderParagraphs: function(paragraphs, exercise, partConfig) {
      let html = '';
      paragraphs.forEach(para => {
        if (para.trim() === '') return;
        
        const gapMatches = para.match(/\((\d+)\)/g) || [];
        const gapNumbers = gapMatches.map(match => parseInt(match.replace(/[()]/g, '')));
        
        let paraProcessed = para;
        
        gapNumbers.forEach(qNum => {
          const question = exercise.content.questions?.find(q => q.number === qNum);
          const isExample = qNum === 0;
          
          let gapHtml = '';
          if (question) {
            gapHtml = this.renderGapByType(question, qNum, partConfig);
          } else if (isExample && exercise.content.example) {
            gapHtml = this.renderExample(exercise.content.example, qNum, partConfig);
          }
          
          if (gapHtml) {
            let regex;
            if (partConfig.type === 'open-cloze') {
              // For open-cloze, also remove the answer word that follows the gap marker
              regex = new RegExp(`\\(${qNum}\\)\\s+\\S+`, 'g');
            } else {
              regex = new RegExp(`\\(${qNum}\\)`, 'g');
            }
            paraProcessed = paraProcessed.replace(regex, gapHtml);
          }
        });
        
        html += `<p>${paraProcessed}</p>`;
      });
      return html;
    },
    
    renderTransformationQuestions: function(exercise, partConfig) {
      let html = '';
      const questions = exercise.content.questions || [];
      const userAnswer = AppState.currentExercise?.answers || {};
      const isChecked = AppState.answersChecked;
      
      questions.forEach(q => {
        if (typeof window.ReadingType4 !== 'undefined') {
          html += ReadingType4.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        }
      });
      
      return html;
    },
    
    renderMultipleChoiceTextQuestions: function(exercise, partConfig) {
      let html = '';
      if (exercise.content.title) {
        html += `<h3 class="reading-type5-content-title">${exercise.content.title}</h3>`;
      }
      const questions = exercise.content.questions || [];
      const userAnswer = AppState.currentExercise?.answers || {};
      const isChecked = AppState.answersChecked;
      
      questions.forEach(q => {
        if (typeof window.ReadingType5 !== 'undefined') {
          html += ReadingType5.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        }
      });
      
      return html;
    },
    
    renderGapByType: function(question, qNum, partConfig) {
      const userAnswer = AppState.currentExercise?.answers?.[qNum] || '';
      const isChecked = AppState.answersChecked;
      
      switch(partConfig.type) {
        case 'multiple-choice':
          if (typeof window.ReadingType1 !== 'undefined') {
            return ReadingType1.renderGap(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'open-cloze':
          if (typeof window.ReadingType2 !== 'undefined') {
            return ReadingType2.renderGap(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'word-formation':
          if (typeof window.ReadingType3 !== 'undefined') {
            return ReadingType3.renderGap(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'transformations':
          if (typeof window.ReadingType4 !== 'undefined') {
            return ReadingType4.renderQuestion(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'multiple-choice-text':
          if (AppState.currentSection === 'listening' && typeof window.ListeningType1 !== 'undefined') {
            return ListeningType1.renderQuestion(question, qNum, isChecked, userAnswer);
          } else if (typeof window.ReadingType5 !== 'undefined') {
            return ReadingType5.renderQuestion(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'sentence-completion':
          if (typeof window.ListeningType2 !== 'undefined') {
            return ListeningType2.renderGap(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'cross-text-matching':
          if (typeof window.ReadingType6 !== 'undefined') {
            return ReadingType6.renderQuestion(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'gapped-text':
          if (typeof window.ReadingType7 !== 'undefined') {
            return ReadingType7.renderGap(question, qNum, isChecked, userAnswer);
          }
          break;
          
        case 'multiple-matching':
          if (typeof window.ReadingType8 !== 'undefined') {
            return ReadingType8.renderQuestion(question, qNum, isChecked, userAnswer);
          }
          break;
      }
      
      // Fallback genérico
      return `<span class="gap-error">[Error: Tipo no soportado]</span>`;
    },
    
    initTypeSpecificListeners: function(type) {
      switch(type) {
        case 'multiple-choice':
          if (AppState.currentSection === 'listening' && typeof ListeningType1?.initListeners === 'function') {
            ListeningType1.initListeners();
          } else if (typeof ReadingType1?.initListeners === 'function') {
            ReadingType1.initListeners();
          }
          break;
        case 'multiple-choice-text':
          if (AppState.currentSection === 'listening' && typeof ListeningType1?.initListeners === 'function') {
            ListeningType1.initListeners();
          } else if (typeof ReadingType5?.initListeners === 'function') {
            ReadingType5.initListeners();
          }
          break;
        case 'sentence-completion':
          if (typeof ListeningType2?.initListeners === 'function') ListeningType2.initListeners();
          break;
        case 'essay':
          if (typeof WritingType1?.initListeners === 'function') WritingType1.initListeners();
          break;
        case 'choice':
          if (typeof WritingType2?.initListeners === 'function') WritingType2.initListeners();
          break;
        case 'interview':
        case 'long-turn':
        case 'collaborative':
        case 'discussion':
          if (typeof SpeakingType?.initListeners === 'function') SpeakingType.initListeners();
          break;
        case 'dual-matching':
          if (typeof ListeningType4?.initListeners === 'function') ListeningType4.initListeners();
          break;
      }
    },
    
    renderExample: function(exampleData, qNum, partConfig) {
      if (!exampleData) return '';
      
      let exampleText = '_____';
      let exampleAnswer = '';
      
      if (partConfig.type === 'multiple-choice' && exampleData.options) {
        const correctOption = exampleData.options.find(opt => opt.startsWith(exampleData.correct + ')'));
        exampleText = correctOption ? correctOption.substring(2).trim() : '_____';
        exampleAnswer = exampleData.correct || '';
      } else {
        exampleText = exampleData.correct || '_____';
        exampleAnswer = exampleData.correct || '';
      }
      
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      if (exampleAnswer) AppState.currentExercise.answers[qNum] = exampleAnswer;
      
      if (partConfig.type === 'multiple-choice') {
        return `
          <span class="reading-type1-gap">
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word reading-type1-correct">${exampleText}</span>
          </span>
        `;
      }
      
      if (partConfig.type === 'word-formation') {
        const wordHtml = exampleData.word
          ? `<span class="reading-type3-hint">(${exampleData.word})</span>`
          : '';
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered reading-type3-example-answer">${exampleText}</span>
            ${wordHtml}
          </span>
        `;
      }
      
      if (partConfig.type === 'open-cloze') {
        return `
          <span class="reading-type2-gap">
            <span class="reading-type2-gap-number">(${qNum})</span>
            <strong class="reading-type2-example-answer">${exampleText}</strong>
          </span>
        `;
      }
      
      return `
        <span class="gap-container">
          <span class="gap-box correct checked" style="pointer-events: none;">
            <span class="gap-answer" id="answer-${qNum}">
              <span class="gap-number">${qNum})</span>
              <span class="gap-text">${exampleText}</span>
            </span>
          </span>
        </span>
      `;
    },
    
    renderExampleBox: function(exampleData, partConfig) {
      if (!exampleData) return '';
      
      if (exampleData.text === "example-test" || exampleData.correct === "test") {
        return '';
      }
      
      // For multiple-choice type, show simplified inline example
      if (partConfig.type === 'multiple-choice' && exampleData.options) {
        const correctOption = exampleData.options.find(opt => opt.startsWith(exampleData.correct + ')'));
        const correctText = correctOption ? correctOption.substring(2).trim() : exampleData.correct;
        
        let optionsHTML = '';
        exampleData.options.forEach(opt => {
          const isCorrect = opt.startsWith(exampleData.correct + ')');
          optionsHTML += `
            <span class="example-option-inline ${isCorrect ? 'correct' : ''}">
              ${opt}
            </span>
          `;
        });
        
        return `
          <div class="example-container simple">
            <div class="example-title">
              <i class="fas fa-lightbulb"></i> <span data-i18n="example">${I18n.t('example')}</span>:
            </div>
            <div class="example-options-row">
              ${optionsHTML}
            </div>
          </div>
        `;
      }
      
      if (partConfig.type === 'open-cloze') {
        return `
          <div class="example-container simple">
            <div class="example-title">
              <i class="fas fa-lightbulb"></i> <span data-i18n="example">${I18n.t('example')}</span>:
            </div>
            <div class="example-text">
              <strong>0</strong> <strong>${exampleData.correct || ''}</strong>
            </div>
          </div>
        `;
      }
      
      return `
        <div class="example-container simple">
          <div class="example-title">
            <i class="fas fa-lightbulb"></i> <span data-i18n="example">${I18n.t('example')}</span>:
          </div>
          <div class="example-text">
            ${exampleData.text || ''} <strong>${exampleData.correct || ''}</strong>
          </div>
        </div>
      `;
    },
    
    renderExplanationsSection: function(exercise) {
      if (!exercise.content?.questions) return '';
      
      let explanations = `
        <div class="explanations-section" id="explanations-section" style="display: none;">
          <h3><i class="fas fa-info-circle"></i> <span data-i18n="showExplanations">${I18n.t('showExplanations')}</span></h3>
      `;
      
      exercise.content.questions.forEach(q => {
        explanations += `
          <div class="explanation-item" data-question="${q.number}">
            <strong>${q.number}.</strong> — ${q.explanation || I18n.t('noExplanation')}
          </div>
        `;
      });
      
      explanations += `</div>`;
      return explanations;
    },
    
    renderExerciseFooter: function(part, totalParts) {
      let footer = `
        <button class="btn-check" onclick="ExerciseHandlers.checkAnswers()" ${AppState.answersChecked ? 'disabled' : ''}>
          <i class="fas fa-check"></i> <span data-i18n="checkAnswers">${I18n.t('checkAnswers')}</span>
        </button>
        <button class="btn-explanations" onclick="ExerciseHandlers.toggleExplanations()">
          <i class="fas fa-info-circle"></i> <span data-i18n="showExplanations">${I18n.t('showExplanations')}</span>
        </button>
        <button class="btn-reset" onclick="ExerciseHandlers.resetExercise()">
          <i class="fas fa-redo-alt"></i> <span data-i18n="reset">${I18n.t('reset')}</span>
        </button>
      `;
      
      if (part > 1) {
        footer += `<button class="btn-prev" onclick="Exercise.goToPrevPart()"><i class="fas fa-chevron-left"></i> <span data-i18n="previous">${I18n.t('previous')}</span></button>`;
      }
      
      if (part < totalParts) {
        footer += `<button class="btn-next" onclick="Exercise.goToNextPart()"><span data-i18n="next">${I18n.t('next')}</span> <i class="fas fa-chevron-right"></i></button>`;
      }
      
      return footer;
    },
    
    getDefaultDescription: function(partConfig) {
      const descriptions = {
        'multiple-choice': I18n.t('multipleChoiceDesc'),
        'open-cloze': I18n.t('openClozeDesc'),
        'word-formation': I18n.t('wordFormationDesc'),
        'transformations': I18n.t('transformationsDesc'),
        'multiple-choice-text': I18n.t('multipleChoiceTextDesc'),
        'cross-text-matching': I18n.t('crossTextDesc'),
        'gapped-text': I18n.t('gappedTextDesc'),
        'multiple-matching': I18n.t('multipleMatchingDesc'),
        'sentence-completion': I18n.t('sentenceCompletionDesc')
      };
      return descriptions[partConfig.type] || I18n.t('defaultDesc');
    },
    
    getDescriptionKey: function(partConfig) {
      const keys = {
        'multiple-choice': 'multipleChoiceDesc',
        'open-cloze': 'openClozeDesc',
        'word-formation': 'wordFormationDesc',
        'transformations': 'transformationsDesc',
        'multiple-choice-text': 'multipleChoiceTextDesc',
        'cross-text-matching': 'crossTextDesc',
        'gapped-text': 'gappedTextDesc',
        'multiple-matching': 'multipleMatchingDesc',
        'sentence-completion': 'sentenceCompletionDesc'
      };
      return keys[partConfig.type] || 'defaultDesc';
    }
  };
})();
