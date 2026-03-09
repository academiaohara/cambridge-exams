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
      // Skip for listening section — ListeningType1.initListeners() handles rendering
      if (partConfig.type === 'multiple-choice-text' && !exercise.content.text && exercise.content.questions && section !== 'listening') {
        paragraphsHTML = this.renderMultipleChoiceTextQuestions(exercise, partConfig);
      }
      
      // Check if toggle is needed for types 5, 6, 7, 8
      const isToggleType = section === 'reading' && 
        ['multiple-choice-text', 'cross-text-matching', 'gapped-text', 'multiple-matching'].includes(partConfig.type);
      const hasTextsContent = exercise.content.texts && Object.keys(exercise.content.texts).length > 0;
      const hasTextContent = !!exercise.content.text;
      const needsToggle = isToggleType && (hasTextsContent || hasTextContent);
      
      let toggleHTML = '';
      let questionNavRowHTML = '';
      let contentTitleBlockHTML = '';
      if (needsToggle) {
        let textsSectionHTML = '';
        let questionsSectionHTML = '';
        
        if (hasTextsContent) {
          textsSectionHTML = this.renderTextsCards(exercise, partConfig);
        }
        if (hasTextContent) {
          textsSectionHTML = paragraphsHTML;
        }
        
        questionsSectionHTML = this.renderToggleQuestions(exercise, partConfig);
        
        const secondToggleI18nKey = partConfig.type === 'gapped-text' ? 'paragraphOptions' : 'showQuestions';
        const secondToggleLabel = I18n.t(secondToggleI18nKey);
        toggleHTML = `
          <div class="toggle-view-header">
            <button class="toggle-view-btn active" id="toggle-text-btn" onclick="ExerciseRenderer.toggleView('text')">
              <i class="fas fa-file-alt"></i> <span data-i18n="showText">${I18n.t('showText')}</span>
            </button>
            <button class="toggle-view-btn" id="toggle-questions-btn" onclick="ExerciseRenderer.toggleView('questions')">
              <i class="fas fa-question-circle"></i> <span data-i18n="${secondToggleI18nKey}">${secondToggleLabel}</span>
            </button>
          </div>
        `;
        
        questionNavRowHTML = this.renderQuestionNavRow(exercise, partConfig);
        const cTitle = exercise.content?.title || '';
        const cSubtitle = (section === 'reading' && part === 5) ? (exercise.content?.subtitle || '') : '';
        contentTitleBlockHTML = `
          <div class="content-title-block">
            <div class="content-title" title="${cTitle}">${cTitle}</div>
            ${cSubtitle ? `<div class="content-subtitle" title="${cSubtitle}">${cSubtitle}</div>` : ''}
          </div>
        `;
        
        paragraphsHTML = `
          <div class="toggle-text-section" id="toggle-text-section">
            ${contentTitleBlockHTML}
            ${textsSectionHTML}
          </div>
          <div class="toggle-questions-section" id="toggle-questions-section" style="display: none;">
            ${questionsSectionHTML}
          </div>
        `;
      }
      
      let exampleHTML = this.renderExampleBox(exercise.content.example, partConfig);
      
      const sectionTitle = Utils.getSectionTitle(section);
      const levelName = Utils.getLevelName(AppState.currentLevel);
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === examId);
      const totalParts = exam?.sections[section]?.total || 1;
      const sectionTotalQuestions = this.getSectionTotalQuestions(section);
      
      const partTotal = (section === 'writing' || section === 'speaking') ? partConfig.total : (partConfig.maxMarks || exercise.totalQuestions || partConfig.total);
      
      // For parts 5-8, use content.title/subtitle; for parts 1-4, no content header
      let contentHeaderHTML = '';
      if (isToggleType) {
        contentHeaderHTML = `
          <div class="content-section-header">
            ${questionNavRowHTML}
            ${toggleHTML}
          </div>
        `;
      } else if (section !== 'reading' && section !== 'writing' && section !== 'listening') {
        const contentTitle = exercise.title || I18n.t('exercise');
        const contentSubtitle = exercise.content?.subtitle || exercise.description || '';
        contentHeaderHTML = `
          <div class="content-section-header">
            <div class="content-title-block">
              <div class="content-title" title="${contentTitle}">${contentTitle}</div>
              <div class="content-subtitle" title="${contentSubtitle}">${contentSubtitle}</div>
            </div>
          </div>
        `;
      }
      
      // Calculate running total from sectionScores
      const sectionKey = `${examId}_${section}`;
      if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
      const displayTotal = this.getSectionRunningTotal(sectionKey);
      
      // Build part navigation cells
      const partNavHTML = this.renderPartNavigation(section, part, totalParts, examId);
      
      // Build tools bar HTML (not for writing/speaking)
      const showTools = section !== 'writing' && section !== 'speaking';
      const isExamMode = AppState.currentMode === 'exam';
      let toolsBarHTML = '';
      if (showTools) {
        toolsBarHTML = `
          <div class="tools-sidebar" id="tools-sidebar">
            <div class="sidebar-panel" id="sidebar-panel">
              <div class="sidebar-panel-header">
                <span class="sidebar-panel-title" id="sidebar-panel-title"></span>
                <button class="sidebar-panel-close" onclick="Tools.toggleSidebar()">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div id="active-tool-content" class="active-tool-content">
                <p class="placeholder-text" data-i18n="activateTool">${I18n.t('activateTool')}</p>
              </div>
            </div>
            <div class="sidebar-rail">
              <div class="sidebar-tools-list">
                <button class="sidebar-tool-btn" id="tab-notes" onclick="Tools.switchTool('notes')" data-tooltip="${I18n.t('highlight')}">
                  <i class="fas fa-highlighter"></i><span class="tool-label">${I18n.t('highlight')}</span>
                </button>
                <button class="sidebar-tool-btn" id="tab-freenotes" onclick="Tools.switchTool('freenotes')" data-tooltip="${I18n.t('notes')}">
                  <i class="fas fa-sticky-note"></i><span class="tool-label">${I18n.t('notes')}</span>
                </button>
                ${!isExamMode ? `
                <button class="sidebar-tool-btn" id="tab-dict" onclick="Tools.switchTool('dict')" data-tooltip="${I18n.t('dictionary')}">
                  <i class="fas fa-book"></i><span class="tool-label">${I18n.t('dictionary')}</span>
                </button>
                <button class="sidebar-tool-btn" id="tab-translate" onclick="Tools.switchTool('translate')" data-tooltip="${I18n.t('translate')}">
                  <i class="fas fa-language"></i><span class="tool-label">${I18n.t('translate')}</span>
                </button>
                <button class="sidebar-tool-btn" id="tab-tips" onclick="Tools.switchTool('tips')" data-tooltip="${I18n.t('tips')}">
                  <i class="fas fa-lightbulb"></i><span class="tool-label">${I18n.t('tips')}</span>
                </button>
                ${section === 'listening' ? `
                <button class="sidebar-tool-btn" id="tab-transcript" onclick="Tools.switchTool('transcript')" data-tooltip="${I18n.t('transcript')}">
                  <i class="fas fa-file-audio"></i><span class="tool-label">${I18n.t('transcript')}</span>
                </button>` : ''}
                ` : ''}
              </div>
            </div>
          </div>`;
      }

      let html = `
        <div class="exercise-page-wrapper no-sidebar">
          <div class="exercise-container">
            <div class="exercise-header">
              <div class="exercise-title">
                <h2>${levelName} - ${sectionTitle}</h2>
                <div class="exercise-subtitle" data-i18n="part">${I18n.t('part')} ${part} ${I18n.t('of')} ${totalParts}</div>
                <span class="exercise-badge">${exercise.title || I18n.t('exercise')}</span>
                ${AppState.currentMode === 'exam' ? `<span class="exam-mode-badge"><i class="fas fa-file-alt"></i> ${I18n.t('examModeActive')}</span>` : ''}
              </div>
              <div class="exercise-header-right">
                <div class="score-display" id="score-display">${displayTotal}/${sectionTotalQuestions}</div>
                <div class="exercise-toolbar">
                  <button class="btn-cambridge-score" onclick="ScoreCalculator.showLiveSectionResults()" title="${I18n.t('cambridgeScore') || 'Cambridge Score'}">
                    <i class="fas fa-chart-bar"></i>
                  </button>
                  <button class="btn-cambridge-score btn-cambridge-overall" onclick="ScoreCalculator.showLiveOverallResults()" title="${I18n.t('overallResults') || 'Overall Results'}">
                    <i class="fas fa-chart-line"></i>
                  </button>
                  <button class="btn-exit" onclick="Exercise.closeExercise()">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="exercise-info">
              <div class="exercise-info-left">
                ${partNavHTML}
                <span><i class="fas fa-clock"></i> ${
                  (AppState.currentMode === 'exam' && AppState.examFullMode && CONFIG.SECTION_TIMES && CONFIG.SECTION_TIMES[section])
                    ? CONFIG.SECTION_TIMES[section]
                    : (exercise.time || '10')
                } <span data-i18n="minutes">${I18n.t('minutes')}</span></span>
              </div>
              <div class="exercise-info-right">
                <div class="exercise-timer" id="exercise-timer">
                  <i class="fas fa-hourglass-half"></i>
                  <span id="timer-display">${
                    (AppState.currentMode === 'exam' && AppState.examFullMode && CONFIG.SECTION_TIMES && CONFIG.SECTION_TIMES[section])
                      ? Utils.formatTime(Math.max(0, CONFIG.SECTION_TIMES[section] * 60 - AppState.sectionElapsedSeconds))
                      : AppState.currentMode === 'exam'
                        ? Utils.formatTime(Math.max(0, (exercise.time || 10) * 60 - AppState.elapsedSeconds))
                        : Utils.formatTime(AppState.elapsedSeconds)
                  }</span>
                </div>
                <div class="part-score-display" id="part-score-display">0/${partTotal}</div>
              </div>
            </div>
            
            <div class="exercise-description" lang="en">
              <p data-i18n-description="${this.getDescriptionKey(partConfig)}">${exercise.description || this.getDefaultDescription(partConfig)}</p>
            </div>
            
            ${exampleHTML}
            
            ${contentHeaderHTML}
            
            <div class="exercise-main-layout" lang="en">
              <div class="reading-text-enhanced" id="selectable-text">
                ${paragraphsHTML}
              </div>
            </div>

            ${this.renderExplanationsSection(exercise)}
            
            <div class="exercise-footer">
              ${this.renderExerciseFooter(part, totalParts)}
            </div>
            ${toolsBarHTML}
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
        
        // For gapped-text (Part 7), use a div wrapper for gap-only paragraphs to allow block display
        const isGappedTextGap = partConfig.type === 'gapped-text' && gapNumbers.length > 0 &&
          para.trim().match(/^\(\d+\)$/);
        if (isGappedTextGap) {
          html += `<div class="reading-type7-gap-para">${paraProcessed}</div>`;
        } else {
          html += `<p>${paraProcessed}</p>`;
        }
      });
      return html;
    },
    
    getSectionTotalQuestions: function(section) {
      if (section === 'reading') {
        return [1, 2, 3, 4, 5, 6, 7, 8].reduce((sum, part) => {
          const cfg = CONFIG.PART_TYPES[part];
          return sum + (cfg ? (cfg.maxMarks || cfg.total || 0) : 0);
        }, 0);
      }
      if (section === 'listening') {
        return [1, 2, 3, 4].reduce((sum, part) => sum + (CONFIG.PART_TYPES[`listening${part}`]?.total || 0), 0);
      }
      if (section === 'writing') {
        return [1, 2].reduce((sum, part) => sum + (CONFIG.PART_TYPES[`writing${part}`]?.total || 0), 0);
      }
      if (section === 'speaking') {
        return [1, 2, 3, 4].reduce((sum, part) => sum + (CONFIG.PART_TYPES[`speaking${part}`]?.total || 0), 0);
      }
      return 0;
    },
    
    getSectionRunningTotal: function(sectionKey) {
      if (!AppState.sectionScores[sectionKey]) return 0;
      return Object.values(AppState.sectionScores[sectionKey])
        .reduce((sum, score) => sum + score, 0);
    },
    
    renderTextsCards: function(exercise, partConfig) {
      const texts = exercise.content.texts;
      const typePrefix = partConfig.type === 'cross-text-matching' ? 'reading-type6' : 'reading-type8';
      
      let html = '<div class="' + typePrefix + '-texts">';
      Object.entries(texts).forEach(function(entry) {
        var key = entry[0], text = entry[1];
        html += '<div class="' + typePrefix + '-text-card">';
        html += '<span class="' + typePrefix + '-text-label">' + key + '</span>';
        html += '<div class="' + typePrefix + '-text-content">' + text + '</div>';
        html += '</div>';
      });
      html += '</div>';
      return html;
    },
    
    renderToggleQuestions: function(exercise, partConfig) {
      const questions = exercise.content.questions || [];
      const userAnswer = AppState.currentExercise?.answers || {};
      const isChecked = AppState.answersChecked;
      const typePrefix = partConfig.type === 'cross-text-matching' ? 'reading-type6' : 
                         partConfig.type === 'multiple-matching' ? 'reading-type8' :
                         partConfig.type === 'gapped-text' ? 'reading-type7' : 'reading-type5';
      
      let html = '';
      
      // For gapped-text (Part 7), show paragraph options A-G
      if (partConfig.type === 'gapped-text' && exercise.content.paragraphs) {
        html += '<div class="reading-type7-options">';
        html += '<h4><i class="fas fa-list"></i> ' + I18n.t('paragraphOptions') + '</h4>';
        html += '<div class="reading-type7-paragraph-list">';
        Object.entries(exercise.content.paragraphs).forEach(function(entry) {
          const key = entry[0], text = entry[1];
          html += '<div class="reading-type7-paragraph-row"><span class="reading-type7-paragraph-label">' + key + '</span><div class="reading-type7-paragraph-item">' + text + '</div></div>';
        });
        html += '</div></div>';
        return html;
      }
      
      html += '<div class="' + typePrefix + '-questions">';
      questions.forEach(function(q) {
        var questionGap = '';
        if (partConfig.type === 'cross-text-matching' && typeof window.ReadingType6 !== 'undefined') {
          questionGap = ReadingType6.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        } else if (partConfig.type === 'multiple-matching' && typeof window.ReadingType8 !== 'undefined') {
          questionGap = ReadingType8.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        } else if (typeof window.ReadingType5 !== 'undefined') {
          questionGap = ReadingType5.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        }
        if (partConfig.type === 'multiple-choice-text') {
          html += questionGap;
        } else {
          html += '<div class="' + typePrefix + '-question">';
          html += '<div class="' + typePrefix + '-question-text">' + q.question + '</div>';
          html += questionGap;
          html += '</div>';
        }
      });
      html += '</div>';
      return html;
    },
    
    renderQuestionNavRow: function(exercise, partConfig) {
      const questions = exercise.content.questions || [];
      const paragraphs = exercise.content.paragraphs || {};
      const isPart7 = partConfig && partConfig.type === 'gapped-text' && Object.keys(paragraphs).length;
      if (!questions.length && !isPart7) return '';
      const escapeHtml = function(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };
      const escapeJsString = function(value) {
        return String(value)
          .replace(/\\/g, '\\\\')
          .replace(/'/g, '\\\'');
      };
      const answers = AppState.currentExercise?.answers || {};
      const isChecked = AppState.answersChecked;
      let cells = '';
      if (isPart7) {
        Object.keys(paragraphs).forEach(function(key) {
          cells += '<button class="question-nav-cell" onclick="QuestionNav.openParagraph(\'' + escapeJsString(key) + '\')">' + escapeHtml(key) + '</button>';
        });
        return '<div class="question-nav-row" id="question-nav-row">' + cells + '</div>';
      }
      questions.forEach(function(q) {
        const qNum = q.number;
        const answer = answers[qNum];
        let cls = 'question-nav-cell';
        if (isChecked) {
          if (answer) cls += answer === q.correct ? ' correct' : ' incorrect';
          else cls += ' unanswered-checked';
        } else if (answer) {
          cls += ' answered';
        }
        cells += '<button class="' + cls + '" data-qnum="' + qNum + '" onclick="QuestionNav.openQuestion(' + qNum + ')">' + qNum + '</button>';
      });
      return '<div class="question-nav-row" id="question-nav-row">' + cells + '</div>';
    },

    toggleView: function(view) {
      var textSection = document.getElementById('toggle-text-section');
      var questionsSection = document.getElementById('toggle-questions-section');
      var textBtn = document.getElementById('toggle-text-btn');
      var questionsBtn = document.getElementById('toggle-questions-btn');
      
      if (!textSection || !questionsSection) return;
      
      if (view === 'text') {
        textSection.style.display = '';
        questionsSection.style.display = 'none';
        if (textBtn) textBtn.classList.add('active');
        if (questionsBtn) questionsBtn.classList.remove('active');
      } else {
        textSection.style.display = 'none';
        questionsSection.style.display = '';
        if (questionsBtn) questionsBtn.classList.add('active');
        if (textBtn) textBtn.classList.remove('active');
      }
    },
    
    renderTransformationQuestions: function(exercise, partConfig) {
      let html = '';
      const questions = exercise.content.questions || [];
      const userAnswer = AppState.currentExercise?.answers || {};
      const isChecked = AppState.answersChecked;
      
      if (isChecked && typeof window.ReadingType4 !== 'undefined') {
        html += ReadingType4._renderShowAllBtn();
      }

      questions.forEach(q => {
        if (typeof window.ReadingType4 !== 'undefined') {
          html += ReadingType4.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        }
      });
      
      return html;
    },
    
    renderMultipleChoiceTextQuestions: function(exercise, partConfig) {
      let html = '';
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
        case 'transformations':
          // Initialize auto-resize for all transformation inputs that have existing answers
          setTimeout(function() {
            document.querySelectorAll('.reading-type4-inline-input:not([disabled])').forEach(function(inp) {
              if (inp.value && typeof ReadingType4 !== 'undefined') ReadingType4.resizeInput(inp);
            });
          }, 50);
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
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered reading-type3-example-answer">${exampleText}</span>
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
      
      if (partConfig.type === 'word-formation') {
        const wordHint = exampleData.word ? ` (${exampleData.word})` : '';
        return `
          <div class="example-container simple">
            <div class="example-title">
              <i class="fas fa-lightbulb"></i> <span data-i18n="example">${I18n.t('example')}</span>:
            </div>
            <div class="example-text">
              <strong>(0)</strong> <strong>${exampleData.correct || ''}</strong>${wordHint}
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
      // Collect all questions: from content.questions or from dual-matching tasks
      var allQuestions = [];
      if (exercise.content?.questions) {
        allQuestions = exercise.content.questions;
      } else if (exercise.content?.task1 && exercise.content?.task2) {
        allQuestions = (exercise.content.task1.questions || []).concat(exercise.content.task2.questions || []);
      }
      if (allQuestions.length === 0) return '';
      
      let explanations = `
        <div class="explanations-section" id="explanations-section" style="display: none;" lang="en">
          <h3><i class="fas fa-info-circle"></i> <span data-i18n="showExplanations">${I18n.t('showExplanations')}</span></h3>
      `;
      
      allQuestions.forEach(q => {
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
      var isExamMode = AppState.currentMode === 'exam';
      var isReading = AppState.currentSection === 'reading';
      let footer = '';
      
      if (!isExamMode) {
        footer += `
          <button class="btn-check" onclick="ExerciseHandlers.checkAnswers()" ${AppState.answersChecked ? 'disabled' : ''}>
            <span data-i18n="checkAnswers">${I18n.t('checkAnswers')}</span>
          </button>
        `;

        // Part 4 of reading: never show explanations button (broken)
        // Parts 5–8 of reading: show only after answers have been checked
        // All other parts: always show in practice mode
        if (!isReading || (part >= 1 && part <= 3)) {
          footer += `
          <button class="btn-explanations" onclick="ExerciseHandlers.toggleExplanations()">
            <i class="fas fa-info-circle"></i> <span data-i18n="showExplanations">${I18n.t('showExplanations')}</span>
          </button>
          `;
        } else if (isReading && part >= 5) {
          footer += `
          <button class="btn-explanations" onclick="ExerciseHandlers.toggleExplanations()" ${AppState.answersChecked ? '' : 'style="display:none"'}>
            <i class="fas fa-info-circle"></i> <span data-i18n="showExplanations">${I18n.t('showExplanations')}</span>
          </button>
          `;
        }

        footer += `
          <button class="btn-reset" onclick="ExerciseHandlers.resetExercise()">
            <i class="fas fa-redo-alt"></i> <span data-i18n="reset">${I18n.t('reset')}</span>
          </button>
        `;
      }
      
      // Allow going back in both practice mode and exam full mode
      if (part > 1 && (!isExamMode || AppState.examFullMode)) {
        footer += `<button class="btn-prev" onclick="Exercise.goToPrevPart()"><i class="fas fa-chevron-left"></i> <span data-i18n="previous">${I18n.t('previous')}</span></button>`;
      }
      
      if (part < totalParts) {
        footer += `<button class="btn-next" onclick="Exercise.goToNextPart()"><span data-i18n="next">${I18n.t('next')}</span> <i class="fas fa-chevron-right"></i></button>`;
      } else if (AppState.examFullMode) {
        // Last part of a section in exam full mode: show "Finish Section" button
        footer += `<button class="btn-next btn-finish-section" onclick="Exercise.goToNextPart()"><span data-i18n="finishSection">${I18n.t('finishSection')}</span> <i class="fas fa-check"></i></button>`;
      }
      
      return footer;
    },
    
    renderPartNavigation: function(section, currentPart, totalParts, examId) {
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === examId);
      if (!exam) return '';
      
      const completedParts = exam.sections[section]?.completed || [];
      
      let cells = '';
      for (let i = 1; i <= totalParts; i++) {
        const isActive = i === currentPart;
        const isCompleted = completedParts.includes(i);
        let cellClass = 'part-nav-cell';
        if (isActive) cellClass += ' active';
        if (isCompleted) cellClass += ' completed';
        
        cells += `<button class="${cellClass}" data-part="${i}" onclick="Exercise.openPart('${examId}', '${section}', ${i})" title="${I18n.t('part')} ${i}">
          ${i}
        </button>`;
      }
      
      return `<div class="part-nav-row">${cells}</div>`;
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
