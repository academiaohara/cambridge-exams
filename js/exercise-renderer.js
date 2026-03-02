// js/exercise-renderer.js
(function() {
  window.ExerciseRenderer = {
    render: function(exercise, examId, section, part) {
      const content = document.getElementById('main-content');
      const partConfig = CONFIG.PART_TYPES[section === 'reading' ? part : `${section}${part}`] || CONFIG.PART_TYPES[1];
      
      const paragraphs = exercise.content.text ? exercise.content.text.split('||') : [];
      let paragraphsHTML = this.renderParagraphs(paragraphs, exercise, partConfig);
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
              <div class="exercise-subtitle">${I18n.t('part')} ${part} ${I18n.t('of')} ${totalParts}</div>
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
              <span><i class="fas fa-clock"></i> ${exercise.time || '10'} ${I18n.t('minutes')}</span>
              <span><i class="fas fa-question-circle"></i> ${exercise.totalQuestions || partConfig.total} ${I18n.t('questions')}</span>
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
            <p>${exercise.description || this.getDefaultDescription(partConfig)}</p>
          </div>
          
          ${exampleHTML}
          
          <div class="tool-tabs-horizontal">
            <button class="tool-btn-nav" id="tab-notes" onclick="Tools.switchTool('notes')">
              <i class="fas fa-highlighter"></i> ${I18n.t('highlight')}
            </button>
            <button class="tool-btn-nav" id="tab-freenotes" onclick="Tools.switchTool('freenotes')">
              <i class="fas fa-sticky-note"></i> ${I18n.t('notes')}
            </button>
            <button class="tool-btn-nav" id="tab-dict" onclick="Tools.switchTool('dict')">
              <i class="fas fa-book"></i> ${I18n.t('dictionary')}
            </button>
            <button class="tool-btn-nav" id="tab-translate" onclick="Tools.switchTool('translate')">
              <i class="fas fa-language"></i> ${I18n.t('translate')}
            </button>
            <button class="tool-btn-nav" id="tab-tips" onclick="Tools.switchTool('tips')">
              <i class="fas fa-lightbulb"></i> ${I18n.t('tips')}
            </button>
          </div>
          
          <div class="exercise-main-layout">
            <div class="reading-text-enhanced" id="selectable-text">
              ${paragraphsHTML}
              
              <div id="note-creator" class="note-creator-card" style="display:none;">
                <div class="note-creator-header">
                  ${I18n.t('highlightText')} "<span id="selected-phrase-display"></span>"
                </div>
                <input type="text" id="note-input-field" placeholder="${I18n.t('addNote')}">
                <div class="note-creator-footer">
                  <div class="color-options">
                    <span class="color-dot yellow active" data-color="#fef08a" onclick="Tools.setNoteColor('#fef08a', this)"></span>
                    <span class="color-dot green" data-color="#bbf7d0" onclick="Tools.setNoteColor('#bbf7d0', this)"></span>
                    <span class="color-dot blue" data-color="#bfdbfe" onclick="Tools.setNoteColor('#bfdbfe', this)"></span>
                    <span class="color-dot pink" data-color="#fbcfe8" onclick="Tools.setNoteColor('#fbcfe8', this)"></span>
                  </div>
                  <div class="note-actions">
                    <button class="btn-cancel" onclick="Tools.hideNoteCreator()">${I18n.t('cancel')}</button>
                    <button class="btn-confirm" onclick="Tools.saveNote()">${I18n.t('confirm')}</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div id="active-tool-content" class="active-tool-content">
              <p class="placeholder-text">${I18n.t('activateTool')}</p>
            </div>
          </div>
          
          ${this.renderExplanationsSection(exercise)}
          
          <div class="exercise-footer">
            ${this.renderExerciseFooter(part, totalParts)}
          </div>
        </div>`;
      
      content.innerHTML = html;
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
            const regex = new RegExp(`\\(${qNum}\\)`, 'g');
            paraProcessed = paraProcessed.replace(regex, gapHtml);
          }
        });
        
        html += `<p>${paraProcessed}</p>`;
      });
      return html;
    },
    
    renderGapByType: function(question, qNum, partConfig) {
      const userAnswer = AppState.currentExercise?.answers?.[qNum] || '';
      const isChecked = AppState.answersChecked;
      
      switch(partConfig.type) {
        case 'multiple-choice':
        case 'cross-text-matching':
        case 'multiple-matching':
          return `
            <span class="gap-container">
              <span class="gap-box ${isChecked ? 'checked' : ''}" onclick="${!isChecked ? 'Modal.openOptionsModal(' + qNum + ')' : ''}">
                <span class="gap-answer" id="answer-${qNum}">
                  <span class="gap-number">${qNum})</span>
                  <span class="gap-dots">.........</span>
                </span>
              </span>
            </span>
          `;
        
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion':
          let inputClass = 'gap-input';
          if (isChecked) {
            const isCorrect = Utils.compareAnswers(userAnswer, question.correct, partConfig.type);
            inputClass += isCorrect ? ' correct' : ' incorrect';
          }
          return `
            <span class="gap-container">
              <input type="text" 
                     class="${inputClass}" 
                     data-question="${qNum}" 
                     value="${userAnswer}" 
                     placeholder="..." 
                     ${isChecked ? 'disabled' : ''}
                     oninput="ExerciseHandlers.handleTextGap(${qNum}, this.value)">
            </span>
          `;
        
        case 'transformations':
          const keyWords = question.keyWord || '';
          return `
            <span class="gap-container transformation-gap">
              <span class="transformation-keywords">${keyWords}</span>
              <input type="text" 
                     class="gap-input transformation-input ${isChecked ? (Utils.compareAnswers(userAnswer, question.correct, partConfig.type) ? 'correct' : 'incorrect') : ''}" 
                     data-question="${qNum}" 
                     value="${userAnswer}" 
                     placeholder="${I18n.t('writeAnswer')}" 
                     ${isChecked ? 'disabled' : ''}
                     oninput="ExerciseHandlers.handleTextGap(${qNum}, this.value)">
            </span>
          `;
        
        case 'multiple-choice-text':
          let radioHtml = `<span class="gap-container radio-gap" id="radio-group-${qNum}">`;
          question.options.forEach(opt => {
            const letter = opt.charAt(0);
            const text = opt.substring(2).trim();
            const checked = userAnswer === letter ? 'checked' : '';
            radioHtml += `
              <label class="radio-option ${isChecked ? 'disabled' : ''}">
                <input type="radio" 
                       name="q${qNum}" 
                       value="${letter}" 
                       ${checked} 
                       ${isChecked ? 'disabled' : ''}
                       onchange="ExerciseHandlers.handleRadioGap(${qNum}, '${letter}')">
                <span class="radio-text">${letter}) ${text}</span>
              </label>
            `;
          });
          radioHtml += `</span>`;
          return radioHtml;
        
        case 'gapped-text':
          return `
            <span class="gap-container paragraph-gap">
              <select class="paragraph-select" 
                      data-question="${qNum}" 
                      ${isChecked ? 'disabled' : ''}
                      onchange="ExerciseHandlers.handleSelectGap(${qNum}, this.value)">
                <option value="">${I18n.t('selectParagraph')}</option>
                ${question.options?.map(opt => {
                  const letter = opt.charAt(0);
                  const text = opt.substring(2).trim();
                  return `<option value="${letter}" ${userAnswer === letter ? 'selected' : ''}>${letter}) ${text}</option>`;
                }).join('')}
              </select>
            </span>
          `;
        
        default:
          return `<span class="gap-error">[Error]</span>`;
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
      
      if (partConfig.type === 'multiple-choice' && exampleData.options) {
        let optionsHTML = '';
        exampleData.options.forEach(opt => {
          const isCorrect = opt.startsWith(exampleData.correct + ')');
          optionsHTML += `
            <div class="example-option ${isCorrect ? 'correct' : ''}">
              ${isCorrect ? '<i class="fas fa-check-circle"></i>' : '<i class="far fa-circle"></i>'}
              ${opt}
            </div>
          `;
        });
        
        return `
          <div class="example-container">
            <div class="example-title">
              <i class="fas fa-lightbulb"></i> ${I18n.t('example')}:
            </div>
            <div class="example-text">
              ${exampleData.text || ''}
            </div>
            <div class="example-options">
              ${optionsHTML}
            </div>
            ${exampleData.explanation ? `
              <div class="example-explanation">
                <i class="fas fa-info-circle"></i> ${exampleData.explanation}
              </div>
            ` : ''}
          </div>
        `;
      }
      
      return `
        <div class="example-container simple">
          <div class="example-title">
            <i class="fas fa-lightbulb"></i> ${I18n.t('example')}:
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
          <h3><i class="fas fa-info-circle"></i> ${I18n.t('showExplanations')}</h3>
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
          <i class="fas fa-check"></i> ${I18n.t('checkAnswers')}
        </button>
        <button class="btn-explanations" onclick="ExerciseHandlers.toggleExplanations()">
          <i class="fas fa-info-circle"></i> ${I18n.t('showExplanations')}
        </button>
        <button class="btn-reset" onclick="ExerciseHandlers.resetExercise()">
          <i class="fas fa-redo-alt"></i> ${I18n.t('reset')}
        </button>
      `;
      
      if (part > 1) {
        footer += `<button class="btn-prev" onclick="Exercise.goToPrevPart()"><i class="fas fa-arrow-left"></i> ${I18n.t('previous')}</button>`;
      }
      
      if (part < totalParts) {
        footer += `<button class="btn-next" onclick="Exercise.goToNextPart()">${I18n.t('next')} <i class="fas fa-arrow-right"></i></button>`;
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
    }
  };
})();
