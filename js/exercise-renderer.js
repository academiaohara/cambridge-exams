// js/exercise-renderer.js
(function() {
  window.ExerciseRenderer = {
    _buildExerciseLayoutShell: function(centerHtml, toolsBarHTML, showTools) {
      var level = (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var leftSidebar = '';
      if (typeof DashboardNav !== 'undefined' && DashboardNav._buildDashboardSidebars) {
        leftSidebar = DashboardNav._buildDashboardSidebars(exams).left;
      }

      var leftShell = (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell)
        ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebar)
        : '<div class="dashboard-left-sidebar" id="dashboardLeftSidebar">' + leftSidebar + '</div>';

      var layoutClass = 'dashboard-layout dashboard-layout--exercise';
      if (!showTools) layoutClass += ' dashboard-layout-right-closed';

      var rightShell = '';
      if (showTools) {
        var toolsWrap = '<div class="exercise-tools-sidebar-wrap">' + toolsBarHTML + '</div>';
        rightShell = (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell)
          ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebarTools', toolsWrap)
          : '<div class="dashboard-right-sidebar dashboard-right-sidebar--tools" id="dashboardRightSidebarTools">' +
              '<div class="dashboard-sidebar-content">' + toolsWrap + '</div></div>';
      }

      return '<div class="' + layoutClass + '">' +
        leftShell +
        '<div class="dashboard-center dashboard-center--exercise">' + centerHtml + '</div>' +
        rightShell +
      '</div>';
    },

    _applyExerciseDashboardChrome: function() {
      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof MainNav !== 'undefined' && MainNav.setActive) MainNav.setActive('tests');
    },

    wrapExerciseCenter: function(innerHtml) {
      return '<div class="exercise-page-wrapper"><div class="exercise-container" data-tile-theme="tests">' + innerHtml + '</div></div>';
    },

    setCenterContent: function(centerHtml, showTools) {
      var content = document.getElementById('main-content');
      if (!content) return;
      var wrapped = this.wrapExerciseCenter(centerHtml);
      content.innerHTML = this._buildExerciseLayoutShell(wrapped, '', !!showTools);
      this._applyExerciseDashboardChrome();
    },

    render: async function(exercise, examId, section, part) {
      const content = document.getElementById('main-content');
      const partConfig = CONFIG.getPartConfig(section, part);
      
      // Cargar CSS y JS específicos del tipo de ejercicio (esperar ambos antes de renderizar)
      const cssPromises = [Utils.loadExerciseTypeCSS(partConfig.type)];
      const jsPromises = [Utils.loadExerciseTypeJS(partConfig.type)];

      // C1 Reading Part 1 uses inline gap chips from ReadingType5 (multiple-choice-text assets).
      if (typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading() && partConfig.type === 'multiple-choice') {
        cssPromises.push(Utils.loadExerciseTypeCSS('multiple-choice-text'));
        jsPromises.push(Utils.loadExerciseTypeJS('multiple-choice-text'));
      }
      
      // Cargar CSS/JS adicional para secciones de listening
      if (section === 'listening') {
        cssPromises.push(Utils.loadExerciseTypeCSS('listening-' + part));
        jsPromises.push(Utils.loadExerciseTypeJS('listening-' + part));
      }
      
      // gapped-text toggle questions section uses reading-type8 CSS classes
      if (partConfig.type === 'gapped-text') {
        cssPromises.push(Utils.loadExerciseTypeCSS('multiple-matching'));
      }
      
      // Esperar CSS y JS antes de construir el HTML dependiente del tipo
      await Promise.all([...cssPromises, ...jsPromises]);
      
      const paragraphs = exercise.content.text ? exercise.content.text.split('||') : [];
      let paragraphsHTML = this.renderParagraphs(paragraphs, exercise, partConfig, section);
      
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
      
      // Check if listening toggle is needed (transcript + questions toggle)
      const isListeningToggle = section === 'listening';
      const hasTranscript = isListeningToggle && this._hasTranscriptContent(exercise);
      let toggleHTML = '';
      let questionNavRowHTML = '';
      let contentTitleBlockHTML = '';
      if (needsToggle) {
        let textsSectionHTML = '';
        let questionsSectionHTML = '';
        const isB1Reading2Pet = !!exercise._b1PetReading2Ui;
        const hasDuoMatchingUi = typeof Utils !== 'undefined' &&
          Utils.hasDuoMatchingUi(exercise, section, part);

        if (isB1Reading2Pet) {
          textsSectionHTML = this.renderB1Reading2PeopleCards(exercise);
          questionsSectionHTML = this.renderTextsCards(exercise, partConfig);
        } else if (hasDuoMatchingUi) {
          if (exercise.content.texts && Object.keys(exercise.content.texts).length) {
            textsSectionHTML = this.renderTextsCards(exercise, partConfig);
          }
          questionsSectionHTML = this.renderB1Reading2PeopleCards(exercise);
        } else {
          if (hasTextsContent) {
            textsSectionHTML = this.renderTextsCards(exercise, partConfig);
          }
          if (hasTextContent) {
            textsSectionHTML = paragraphsHTML;
          }
          questionsSectionHTML = this.renderToggleQuestions(exercise, partConfig);
        }

        const isGappedWithParagraphs = partConfig.type === 'gapped-text' &&
          exercise.content.paragraphs && Object.keys(exercise.content.paragraphs).length > 0;
        const isC1Reading7Gapped = isGappedWithParagraphs &&
          (typeof Utils !== 'undefined' && Utils.isC1GappedTextReading(section, part));
        const isGappedSentencesToggle = isGappedWithParagraphs &&
          (typeof Utils !== 'undefined' && Utils.isDuoGappedTextReading(section, part)) &&
          !isC1Reading7Gapped;
        let secondToggleI18nKey = isGappedWithParagraphs
          ? (isC1Reading7Gapped ? 'showParagraphs' : (isGappedSentencesToggle ? 'showSentences' : 'showParagraphs'))
          : 'showQuestions';
        if (isB1Reading2Pet) {
          secondToggleI18nKey = 'showOptionsReading2';
        }
        const i18nMap = {
          showQuestions: 'Questions',
          showParagraphs: 'Paragraphs',
          showSentences: 'Sentences',
          showText: 'Text',
          showPeopleReading2: 'People',
          showOptionsReading2: 'Options (A–H)'
        };
        const secondToggleLabel = i18nMap[secondToggleI18nKey] || secondToggleI18nKey;
        const secondToggleIconClass = isB1Reading2Pet
          ? 'fa-list-ul'
          : secondToggleI18nKey === 'showSentences'
            ? 'fa-stream'
            : secondToggleI18nKey === 'showParagraphs'
              ? 'fa-align-left'
              : 'fa-question-circle';
        const firstToggleI18nKey = isB1Reading2Pet ? 'showPeopleReading2' : 'showText';
        const firstToggleLabel = i18nMap[firstToggleI18nKey] || firstToggleI18nKey;
        const firstToggleIconClass = isB1Reading2Pet ? 'fa-users' : 'fa-file-alt';
        const isReadingPart5to8 = section === 'reading' && part >= 5;
        const isB1Reading5FooterExplanations =
          AppState.currentLevel === 'B1' && section === 'reading' && part === 5;
        const isB1Reading3Explanation =
          AppState.currentLevel === 'B1' && section === 'reading' && part === 3;
        const isB1Reading4Explanation =
          AppState.currentLevel === 'B1' && section === 'reading' && part === 4;
        // B1 Reading Part 5: footer "Show explanations" only (no header Explanation mode).
        const showExplanationBtn =
          (isReadingPart5to8 && !isB1Reading5FooterExplanations) ||
          isB1Reading2Pet ||
          hasDuoMatchingUi ||
          isB1Reading3Explanation ||
          isB1Reading4Explanation;
        toggleHTML = `
          <div class="toggle-view-header">
            <button class="toggle-view-btn active" id="toggle-text-btn" onclick="ExerciseRenderer.toggleView('text')">
              <i class="fas ${firstToggleIconClass}"></i> <span data-i18n="${firstToggleI18nKey}">${firstToggleLabel}</span>
            </button>
            <button class="toggle-view-btn" id="toggle-questions-btn" onclick="ExerciseRenderer.toggleView('questions')">
              <i class="fas ${secondToggleIconClass}"></i> <span data-i18n="${secondToggleI18nKey}">${secondToggleLabel}</span>
            </button>
            ${showExplanationBtn ? `
            <button class="toggle-view-btn btn-explanation-mode" id="toggle-explanation-btn"
                    style="${AppState.answersChecked ? '' : 'display:none'}"
                    onclick="ExerciseHandlers.toggleExplanationMode()">
              <i class="fas fa-lightbulb"></i> <span data-i18n="explanation">Explanation</span>
            </button>
            ` : ''}
          </div>
        `;

        questionNavRowHTML = (isB1Reading2Pet || hasDuoMatchingUi)
          ? this.renderB1Reading2QuestionNav(exercise)
          : this.renderQuestionNavRow(exercise, partConfig);
        const cTitle = exercise.content?.title || '';
        const cSubtitle = (section === 'reading' && (part === 5 || (AppState.currentLevel === 'B1' && part === 3)))
          ? (exercise.content?.subtitle || '')
          : '';
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
      } else if (hasTranscript) {
        // Listening toggle: Questions (active) | Transcript | Explanation
        const transcriptHTML = this.renderListeningTranscript(exercise);
        const isExamMode = AppState.currentMode === 'exam';
        toggleHTML = `
          <div class="toggle-view-header">
            <button class="toggle-view-btn active" id="toggle-questions-btn" onclick="ExerciseRenderer.toggleView('questions')">
              <i class="fas fa-question-circle"></i> <span data-i18n="showQuestions">Questions</span>
            </button>
            <button class="toggle-view-btn" id="toggle-text-btn" onclick="ExerciseRenderer.toggleView('text')">
              <i class="fas fa-file-audio"></i> <span data-i18n="transcript">TRANSCRIPT</span>
            </button>
            ${!isExamMode ? `
            <button class="toggle-view-btn btn-explanation-mode" id="toggle-explanation-btn"
                    style="${AppState.answersChecked ? '' : 'display:none'}"
                    onclick="ExerciseHandlers.toggleExplanationMode()">
              <i class="fas fa-lightbulb"></i> <span data-i18n="explanation">Explanation</span>
            </button>
            ` : ''}
          </div>
        `;
        questionNavRowHTML = this.renderListeningQuestionNavRow(exercise, partConfig);
        paragraphsHTML = `
          <div class="toggle-questions-section" id="toggle-questions-section">
          </div>
          <div class="toggle-text-section" id="toggle-text-section" style="display: none;">
            ${transcriptHTML}
          </div>
        `;
      }
      
      let exampleHTML = this.renderExampleBox(exercise.content.example, partConfig);
      
      const sectionTitle = Utils.getSectionTitle(section);
      const levelName = Utils.getLevelName(AppState.currentLevel);
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === examId);

      // In mixed-test mode, use plan position as navigation context
      const isMixed = window.MixedTest && MixedTest.isActive();
      const totalParts = isMixed
        ? AppState.mixedTestPlan.length
        : (exam?.sections[section]?.total || 1);
      const displayPart = isMixed ? AppState.mixedTestCurrentIndex + 1 : part;

      const sectionTotalQuestions = this.getSectionTotalQuestions(section);
      
      const partTotal = (section === 'writing' || section === 'speaking') ? partConfig.total : (partConfig.maxMarks || exercise.totalQuestions || partConfig.total);

      const duoReadingPlainText =
        typeof Utils !== 'undefined' && Utils.isDuoReadingPlainPassage(section, part);
      const duoReading6OpenCloze =
        typeof Utils !== 'undefined' && Utils.isDuoOpenClozeReading(section, part);
      const duoReading4Gapped =
        typeof Utils !== 'undefined' && Utils.isDuoGappedTextReading(section, part);
      const c1Reading7Gapped =
        typeof Utils !== 'undefined' && Utils.isC1GappedTextReading(section, part);
      const duoGappedSentenceStyle = duoReading4Gapped && !c1Reading7Gapped;
      const duoReading5Cloze =
        typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading();
      const duoReading3WordFormation =
        typeof Utils !== 'undefined' && Utils.isDuoWordFormationReading(section, part);
      const duoReading4Transformations =
        typeof Utils !== 'undefined' && Utils.isDuoTransformationsReading(section, part);
      const duoReading6CrossText =
        typeof Utils !== 'undefined' && Utils.isDuoCrossTextReading(section, part);
      const duoReadingMultipleMatching =
        typeof Utils !== 'undefined' && Utils.isDuoMultipleMatchingReading(section, part);
      const duoListening =
        typeof Utils !== 'undefined' && Utils.isDuoListeningSection();
      const hasDuoMatchingUiShell = typeof Utils !== 'undefined' &&
        Utils.hasDuoMatchingUi(exercise, section, part);
      
      // For parts 5-8, use content.title/subtitle; for parts 1-4, no content header
      let contentHeaderHTML = '';
      // Only when there is a real toggle/transcript bar; avoid empty header for
      // B1 reading part 1 (multiple-choice-text with questions only, no passage).
      if (needsToggle || hasTranscript) {
        contentHeaderHTML = `
          <div class="content-section-header${duoGappedSentenceStyle ? ' b1-reading4-header' : ''}${c1Reading7Gapped ? ' c1-reading7-header' : ''}${hasDuoMatchingUiShell ? ' b1-reading2-header' : ''}">
            ${questionNavRowHTML}
            ${toggleHTML}
          </div>
        `;
      } else if (section !== 'reading' && section !== 'writing' && section !== 'listening' && section !== 'speaking') {
        const contentTitle = exercise.title || 'Exercise';
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
      const partNavHTML = isMixed
        ? this.renderMixedTestProgress()
        : this.renderPartNavigation(section, part, totalParts, examId);
      
      // Build tools bar HTML (not for writing/speaking)
      const showTools = section !== 'writing' && section !== 'speaking';
      const isExamMode = AppState.currentMode === 'exam';
      let toolsBarHTML = '';
      if (showTools) {
        toolsBarHTML = `
          <div class="tools-sidebar tools-sidebar--right-column" id="tools-sidebar">
            <div class="sidebar-rail">
              <div class="sidebar-tools-list">
                <button class="sidebar-tool-btn" id="tab-notes" onclick="Tools.switchTool('notes')" data-tooltip="HIGHLIGHT">
                  <i class="fas fa-highlighter"></i><span class="tool-label">HIGHLIGHT</span>
                </button>
                <button class="sidebar-tool-btn" id="tab-freenotes" onclick="Tools.switchTool('freenotes')" data-tooltip="NOTES">
                  <i class="fas fa-sticky-note"></i><span class="tool-label">NOTES</span>
                </button>
                ${!isExamMode ? `
                <button class="sidebar-tool-btn" id="tab-dict" onclick="Tools.switchTool('dict')" data-tooltip="DICTIONARY">
                  <i class="fas fa-book"></i><span class="tool-label">DICTIONARY</span>
                </button>
                <button class="sidebar-tool-btn" id="tab-translate" onclick="Tools.switchTool('translate')" data-tooltip="TRANSLATE">
                  <i class="fas fa-language"></i><span class="tool-label">TRANSLATE</span>
                </button>
                <button class="sidebar-tool-btn" id="tab-tips" onclick="Tools.switchTool('tips')" data-tooltip="TIPS">
                  <i class="fas fa-lightbulb"></i><span class="tool-label">TIPS</span>
                </button>
                ` : ''}
              </div>
            </div>
            <div class="sidebar-panel" id="sidebar-panel">
              <div id="active-tool-content" class="active-tool-content"></div>
            </div>
          </div>`;
      }

      const descriptionText = (typeof InstructionI18n !== 'undefined')
        ? InstructionI18n.resolveSync(exercise.description || this.getDefaultDescription(partConfig))
        : (exercise.description || this.getDefaultDescription(partConfig));
      const descriptionSource = exercise.description || this.getDefaultDescription(partConfig);

      const exerciseInnerHtml = `
        <div class="exercise-page-wrapper">
          <div class="exercise-container" data-tile-theme="tests">
            <div class="exercise-header">
              <div class="exercise-header-top">
                <h2 class="exercise-heading">${levelName} - ${isMixed ? 'Random Test' : sectionTitle}</h2>
                <div class="exercise-header-right">
                  <div class="score-display" id="score-display">${displayTotal}/${sectionTotalQuestions}</div>
                  <div class="exercise-toolbar">
                    <button class="btn-cambridge-score" onclick="ScoreCalculator.showLiveSectionResults()" title="Cambridge Score">
                      <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="btn-cambridge-score btn-cambridge-overall" onclick="ScoreCalculator.showLiveOverallResults()" title="Overall Results">
                      <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="btn-exit" onclick="Exercise.closeExercise()">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div class="exercise-header-meta">
                <span class="exercise-badge">${Utils.getExerciseBadgeLabel(section, displayPart, exercise)}</span>
                ${isMixed ? `<span class="mixed-mode-badge${AppState.currentMode === 'exam' ? ' mixed-mode-badge--simulation' : ''}"><span class="material-symbols-outlined">${AppState.currentMode === 'exam' ? 'timer' : 'shuffle'}</span> ${AppState.currentMode === 'exam' ? 'Simulation' : 'Random Test'}</span>` : (AppState.currentMode === 'exam' ? `<span class="exam-mode-badge"><span class="material-symbols-outlined" style="font-size:0.95rem">timer</span> Simulation</span>` : `<span class="practice-mode-badge"><span class="material-symbols-outlined" style="font-size:0.95rem">school</span> Practice</span>`)}
              </div>
            </div>
            
            <div class="exercise-info">
              <div class="exercise-info-left">
                ${partNavHTML}
              </div>
              <div class="exercise-info-right">
                <span class="exercise-duration"><i class="fas fa-clock"></i> ${
                  (AppState.currentMode === 'exam' && AppState.examFullMode && CONFIG.SECTION_TIMES && CONFIG.SECTION_TIMES[section])
                    ? CONFIG.SECTION_TIMES[section]
                    : (exercise.time || '10')
                } <span data-i18n="minutes">min</span></span>
                <div class="exercise-timer" id="exercise-timer"${section === 'speaking' ? ' style="display:none"' : ''}>
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
              <p data-i18n-description="${this.getDescriptionKey(partConfig)}" data-instruction-source="${descriptionSource.replace(/"/g, '&quot;')}">${descriptionText}</p>
            </div>
            
            ${exampleHTML}
            
            ${contentHeaderHTML}
            
            <div class="exercise-main-layout" lang="en">
              <div class="explanation-question-display" id="explanation-question-display" style="display:none" lang="en"></div>
              <div class="reading-text-enhanced${hasDuoMatchingUiShell ? ' reading-text-enhanced--b1r2' : ''}${duoReadingPlainText ? ' reading-text-enhanced--b1r-plain' : ''}${duoGappedSentenceStyle ? ' b1-reading4' : ''}${c1Reading7Gapped ? ' c1-reading7' : ''}${duoReading5Cloze ? ' b1-reading5' : ''}${duoReading6OpenCloze ? ' b1-reading6' : ''}${duoReading3WordFormation ? ' c1-reading3' : ''}${duoReading4Transformations ? ' c1-reading4' : ''}${duoReading6CrossText ? ' c1-reading6' : ''}${duoReadingMultipleMatching ? ' duo-reading-matching' : ''}${duoListening ? ' b1-listening' : ''}" id="selectable-text">
                ${paragraphsHTML}
              </div>
            </div>

            ${this.renderExplanationsPanel(exercise, partConfig)}
            
            <div class="exercise-footer">
              ${this.renderExerciseFooter(displayPart, totalParts)}
            </div>
          </div>
        </div>`;

      let html = this._buildExerciseLayoutShell(exerciseInnerHtml, toolsBarHTML, showTools);
      
      content.innerHTML = html;
      
      this._applyExerciseDashboardChrome();
      
      // Initialize type-specific listeners (JS already loaded above)
      this.initTypeSpecificListeners(partConfig.type);

      if (showTools && typeof Tools !== 'undefined') {
        // On mobile the tools bar starts closed; user taps an icon to open it.
        if (!window.matchMedia('(max-width: 768px)').matches) {
          Tools.switchTool('notes');
        }
      }
    },
    
    /** *word* / **word** in reading passages → bold (Cambridge-style emphasis in JSON). */
    formatReadingEmphasis: function(text) {
      return String(text || '')
        .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<strong>$1</strong>');
    },

    formatReadingPassageText: function(text) {
      return this.formatReadingEmphasis(this._escapeHtmlAttr(text));
    },

    /** [n]...[/n] evidence: plain inner text; styled phrase only under .explanation-mode-text (no bracket labels). */
    processEvidenceMarkers: function(text) {
      return String(text || '').replace(/\[(\d+)\]([\s\S]*?)\[\/\1\]/g, function(_, n, inner) {
        return '<span class="evidence-wrap" data-qnum="' + n + '">' +
          '<span class="evidence-normal">' + inner + '</span>' +
          '<span class="evidence-explanation-mode evidence-marker" data-qnum="' + n + '">' +
          '<span class="evidence-core">' + inner + '</span>' +
          '</span></span>';
      });
    },

    renderParagraphs: function(paragraphs, exercise, partConfig, section) {
      let html = '';
      var sec = section || (typeof AppState !== 'undefined' ? AppState.currentSection : '');
      paragraphs.forEach(para => {
        if (para.trim() === '') return;
        
        const gapMatches = para.match(/\((\d+)\)/g) || [];
        const gapNumbers = gapMatches.map(match => parseInt(match.replace(/[()]/g, '')));
        
        // For gapped-text: detect if this paragraph segment contains an isolated gap (C1 style)
        // or inline gaps within surrounding text (B2 style)
        const isIsolatedGap = partConfig.type === 'gapped-text' && gapNumbers.length > 0 &&
          para.trim().match(/^\(\d+\)$/);
        const isInlineGapContext = gapNumbers.length > 0 && !isIsolatedGap && (
          partConfig.type === 'gapped-text' ||
          (partConfig.type === 'multiple-choice-text' && sec === 'reading') ||
          (partConfig.type === 'multiple-choice' && sec === 'reading' &&
            typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading())
        );
        
        let paraProcessed = this.formatReadingPassageText(para);
        
        gapNumbers.forEach(qNum => {
          const question = exercise.content.questions?.find(q => q.number === qNum);
          const isExample = qNum === 0;
          
          let gapHtml = '';
          if (question) {
            gapHtml = this.renderGapByType(question, qNum, partConfig, isInlineGapContext);
          } else if (isExample && exercise.content.example) {
            gapHtml = this.renderExample(exercise.content.example, qNum, partConfig);
          }
          
          if (gapHtml) {
            let regex;
            if (partConfig.type === 'open-cloze' || (partConfig.type === 'word-formation' && isExample)) {
              // For open-cloze and word-formation example (0), remove the answer word that follows the gap marker
              regex = new RegExp(`\\(${qNum}\\)\\s+\\S+`, 'g');
            } else {
              regex = new RegExp(`\\(${qNum}\\)`, 'g');
            }
            paraProcessed = paraProcessed.replace(regex, gapHtml);
          }
        });
        
        // Process evidence markers [n]...[/n]
        paraProcessed = this.processEvidenceMarkers(paraProcessed);
        
        // For gapped-text (Part 7 / C1), use a div wrapper for isolated gap paragraphs to allow block display
        if (isIsolatedGap) {
          html += `<div class="reading-type7-gap-para">${paraProcessed}</div>`;
        } else {
          html += `<p>${paraProcessed}</p>`;
        }
      });
      return html;
    },
    
    getSectionTotalQuestions: function(section) {
      if (section === 'reading') {
        var level = (typeof AppState !== 'undefined') ? AppState.currentLevel : 'C1';
        if (level === 'B1' && typeof CONFIG.B1_READING_MAX_RAW === 'number') {
          return CONFIG.B1_READING_MAX_RAW;
        }
        var readingParts = CONFIG.getReadingPartNumbers(level);
        return readingParts.reduce((sum, part) => {
          const cfg = CONFIG.getPartConfig(section, part);
          return sum + (cfg ? (cfg.maxMarks || cfg.total || 0) : 0);
        }, 0);
      }
      if (section === 'listening') {
        return [1, 2, 3, 4].reduce(function(sum, part) {
          var cfg = CONFIG.getPartConfig(section, part);
          return sum + (cfg ? (cfg.total || 0) : 0);
        }, 0);
      }
      if (section === 'writing') {
        return [1, 2].reduce((sum, part) => sum + (CONFIG.PART_TYPES[`writing${part}`]?.total || 0), 0);
      }
      if (section === 'speaking') {
        return 75;
      }
      return 0;
    },
    
    getSectionRunningTotal: function(sectionKey) {
      if (!AppState.sectionScores[sectionKey]) return 0;
      var scores = Object.values(AppState.sectionScores[sectionKey]);
      if (!scores.length) return 0;
      // Speaking: use average since each part is assessed on the full 75-mark scale
      if (sectionKey.includes('_speaking') && scores.length > 0) {
        return Math.round(scores.reduce(function(sum, score) { return sum + score; }, 0) / scores.length);
      }
      return scores.reduce(function(sum, score) { return sum + score; }, 0);
    },
    
    renderTextsCards: function(exercise, partConfig) {
      const texts = exercise.content.texts;
      const typePrefix = partConfig.type === 'cross-text-matching' ? 'reading-type6' : 'reading-type8';
      var self = this;
      var isDuoCrossText = partConfig.type === 'cross-text-matching' &&
        typeof Utils !== 'undefined' && Utils.isDuoCrossTextReading();
      var textsCls = typePrefix + '-texts';
      var hasDuoMatchingTexts = typePrefix === 'reading-type8' && (
        exercise._b1PetReading2Ui || exercise._duoMatchingUi ||
        (typeof Utils !== 'undefined' && Utils.hasDuoMatchingUi(exercise))
      );
      if (hasDuoMatchingTexts) {
        textsCls += ' b1-reading2-notices';
      }
      if (isDuoCrossText) {
        textsCls += ' c1-reading6-texts';
      }

      let html = '<div class="' + textsCls + '">';
      Object.keys(texts).sort(function(a, b) { return a.localeCompare(b); }).forEach(function(key) {
        var text = texts[key];
        if (typeof text !== 'string') return;
        var cardCls = typePrefix + '-text-card';
        if (isDuoCrossText) cardCls += ' c1-reading6-text-card';
        html += '<div class="' + cardCls + '"' + (isDuoCrossText ? ' data-letter="' + key + '"' : '') + '>';
        if (hasDuoMatchingTexts) {
          if (text.startsWith('### ')) {
            var duoNl = text.indexOf('\n');
            var duoTitle = duoNl !== -1 ? text.substring(4, duoNl).trim() : text.substring(4).trim();
            var duoBody = duoNl !== -1 ? text.substring(duoNl + 1) : '';
            var duoBodyCls = AppState.answersChecked
              ? 'reading-type8-text-content b1-reading2-notice-body'
              : 'b1-reading2-notice-plain';
            html += '<div class="reading-type8-text-header">';
            html += '<span class="reading-type8-text-label">' + key + '</span>';
            html += '<strong class="reading-type8-text-title">' + self._escapeHtmlAttr(duoTitle) + '</strong>';
            html += '</div>';
            html += '<div class="' + duoBodyCls + '">' +
              self.processEvidenceMarkers(self._escapeHtmlAttr(duoBody).replace(/\n/g, '<br>')) + '</div>';
          } else {
            html += '<div class="reading-type8-text-header">';
            html += '<span class="reading-type8-text-label">' + key + '</span>';
            html += '</div>';
            html += self.formatB1Reading2NoticeHtml(text, !!AppState.answersChecked);
          }
        } else if (typePrefix === 'reading-type8' && text.startsWith('### ')) {
          var firstNewline = text.indexOf('\n');
          var titleLine = firstNewline !== -1 ? text.substring(4, firstNewline) : text.substring(4);
          var bodyText = firstNewline !== -1 ? text.substring(firstNewline + 1) : '';
          html += '<div class="reading-type8-text-header">';
          html += '<span class="reading-type8-text-label">' + key + '</span>';
          html += '<strong class="reading-type8-text-title">' + titleLine + '</strong>';
          html += '</div>';
          html += '<div class="' + typePrefix + '-text-content">' + self.processEvidenceMarkers(bodyText) + '</div>';
        } else {
          html += '<span class="' + typePrefix + '-text-label">' + key + '</span>';
          html += '<div class="' + typePrefix + '-text-content">' + self.processEvidenceMarkers(text) + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
      return html;
    },

    _escapeHtmlAttr: function(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * B1 Reading Part 2 / type8 notice: optional ### title line + body with [n]…[/n] evidence markers.
     * Returns safe HTML (content escaped before markers are applied).
     * @param {boolean} [withNoticeBodyClasses] When true (after answers are checked), use reading-type8 notice typography classes.
     */
    formatB1Reading2NoticeHtml: function(raw, withNoticeBodyClasses) {
      var self = this;
      var useNotice = !!withNoticeBodyClasses;
      var bodyCls = useNotice ? 'reading-type8-text-content b1-reading2-notice-body' : 'b1-reading2-notice-plain';
      var r = String(raw == null ? '' : raw).replace(/\r\n/g, '\n');
      if (r.startsWith('### ')) {
        var nl = r.indexOf('\n');
        var titleLine = nl !== -1 ? r.substring(4, nl).trim() : r.substring(4).trim();
        var bodyText = nl !== -1 ? r.substring(nl + 1) : '';
        var head = '<div class="reading-type8-text-header b1-reading2-notice-head">' +
          '<strong class="reading-type8-text-title">' + self._escapeHtmlAttr(titleLine) + '</strong></div>';
        var body = '<div class="' + bodyCls + '">' +
          self.processEvidenceMarkers(self._escapeHtmlAttr(bodyText).replace(/\n/g, '<br>')) + '</div>';
        return head + body;
      }
      return '<div class="' + bodyCls + '">' +
        self.processEvidenceMarkers(self._escapeHtmlAttr(r).replace(/\n/g, '<br>')) + '</div>';
    },

    /** B1 Preliminary Reading Part 2: person card + letter chips + chosen notice preview. */
    renderB1Reading2PeopleCards: function(exercise) {
      var questions = exercise.content.questions || [];
      var texts = exercise.content.texts || {};
      var letters = Object.keys(texts).sort(function(a, b) { return a.localeCompare(b); });
      var userAnswer = AppState.currentExercise && AppState.currentExercise.answers ? AppState.currentExercise.answers : {};
      var isChecked = AppState.answersChecked;
      var self = this;
      var html = '<div class="reading-type8-texts b1-reading2-people" id="b1-reading2-people-root">';
      questions.forEach(function(q) {
        var qNum = q.number;
        var body = (q.personText != null && String(q.personText).trim() !== ''
          ? q.personText
          : (q.question || '')).toString().replace(/\r\n/g, '\n');
        var safe = self.processEvidenceMarkers(self._escapeHtmlAttr(body).replace(/\n/g, '<br>'));
        var sel = userAnswer[qNum] || '';
        var cardCls = 'reading-type8-text-card b1-reading2-person-card';
        var badgeCls = 'b1-reading2-q-badge';
        if (isChecked) {
          if (!sel) {
            cardCls += ' b1-reading2-row-incorrect';
            badgeCls += ' b1-reading2-q-badge-incorrect';
          } else if (sel === q.correct) {
            cardCls += ' b1-reading2-row-correct';
            badgeCls += ' b1-reading2-q-badge-correct';
          } else {
            cardCls += ' b1-reading2-row-incorrect';
            badgeCls += ' b1-reading2-q-badge-incorrect';
          }
        }
        var selClass = 'b1-reading2-select b1-reading2-select-sr';
        if (isChecked) {
          if (!sel) selClass += ' b1-reading2-select-incorrect';
          else if (sel === q.correct) selClass += ' b1-reading2-select-correct';
          else selClass += ' b1-reading2-select-incorrect';
        }
        html += '<div class="' + cardCls + '" data-qnum="' + qNum + '">';
        html += '<div class="b1-reading2-person-header">';
        html += '<span class="' + badgeCls + '">' + qNum + '</span>';
        html += '</div>';
        html += '<div class="reading-type8-text-content b1-reading2-person-content">' + safe + '</div>';
        html += '<div class="b1-reading2-picker-wrap" data-qnum="' + qNum + '">';
        html += '<span class="b1-reading2-picker-label">' +
          (exercise._b1PetReading2Ui ? 'Choose an option' : 'Choose a person') +
          '</span>';
        html += '<div class="b1-reading2-chip-row" role="group" aria-label="Choose option for question ' + qNum + '">';
        letters.forEach(function(L) {
          var chipCls = 'b1-reading2-chip';
          if (sel === L) chipCls += ' b1-reading2-chip-selected';
          if (isChecked) {
            if (sel === L) {
              chipCls += sel === q.correct ? ' b1-reading2-chip-correct' : ' b1-reading2-chip-incorrect';
            }
            if (q.correct && L === q.correct && sel !== q.correct) {
              chipCls += ' b1-reading2-chip-key';
            }
          }
          html += '<button type="button" class="' + chipCls + '" data-letter="' + L + '"' +
            ' aria-pressed="' + (sel === L ? 'true' : 'false') + '"' +
            (isChecked ? ' disabled' : '') +
            ' onclick="ReadingType8.onB1Reading2ChipClick(' + qNum + ', \'' + L + '\')">' + L + '</button>';
        });
        html += '</div>';
        html += '<select class="' + selClass + '" data-qnum="' + qNum + '"' + (isChecked ? ' disabled' : ' required') +
          ' onchange="ReadingType8.onB1Reading2SelectChange(' + qNum + ', this.value)" tabindex="-1" aria-hidden="true">';
        html += '<option value="">' + (isChecked ? '—' : 'Choose…') + '</option>';
        letters.forEach(function(L) {
          html += '<option value="' + L + '"' + (sel === L ? ' selected' : '') + '>' + L + '</option>';
        });
        html += '</select>';
        html += '</div>';
        var solKey = q.correct ? String(q.correct).trim().toUpperCase().charAt(0) : '';
        var solRaw = solKey && texts[solKey] != null ? texts[solKey] : '';
        if (solRaw) {
          html += '<div class="b1-reading2-solution-expl" data-qnum="' + qNum + '" data-sol-letter="' + self._escapeHtmlAttr(solKey) + '">';
          html += self.formatB1Reading2NoticeHtml(solRaw, isChecked);
          html += '</div>';
        }
        html += '<div class="b1-reading2-preview" data-qpreview="' + qNum + '"></div>';
        html += '</div>';
      });
      html += '</div>';
      return html;
    },

    /** B1 Reading Part 2: question-number nav with correct/incorrect state colours. */
    renderB1Reading2QuestionNav: function(exercise) {
      var questions = exercise.content.questions || [];
      var answers = AppState.currentExercise && AppState.currentExercise.answers ? AppState.currentExercise.answers : {};
      var isChecked = AppState.answersChecked;
      var questionType = 'multiple-matching';
      var cells = '';
      questions.forEach(function(q) {
        var qNum = q.number;
        var answer = answers[qNum];
        var cls = 'question-nav-cell question-nav-letter';
        var stateClass = typeof Utils !== 'undefined'
          ? Utils.getQuestionNumberStateClass({
            answer: answer,
            correct: q.correct,
            isChecked: isChecked,
            questionType: questionType
          })
          : '';
        if (stateClass) cls += ' ' + stateClass;
        cells += '<button type="button" class="' + cls + '" data-qnum="' + qNum + '"' +
          ' onclick="QuestionNav.openQuestion(' + qNum + ')">' + qNum + '</button>';
      });
      return '<div class="question-nav-row b1-reading2-question-nav" id="question-nav-row">' + cells + '</div>';
    },

    /** B1 Reading Part 2: in explanation mode, nav shows question numbers to switch explanations. */
    renderB1Reading2ExplanationQuestionNav: function(exercise) {
      var questions = (exercise && exercise.content && exercise.content.questions) || [];
      var answers = AppState.currentExercise && AppState.currentExercise.answers ? AppState.currentExercise.answers : {};
      var isChecked = AppState.answersChecked;
      var questionType = 'multiple-matching';
      var activeQ = typeof AppState !== 'undefined' ? AppState.explanationActiveQuestion : null;
      var cells = '';
      questions.forEach(function(q) {
        var qNum = q.number;
        var cls = 'question-nav-cell question-nav-letter';
        var stateClass = typeof Utils !== 'undefined'
          ? Utils.getQuestionNumberStateClass({
            answer: answers[qNum],
            correct: q.correct,
            isChecked: isChecked,
            questionType: questionType
          })
          : '';
        if (stateClass) cls += ' ' + stateClass;
        if (activeQ != null && qNum === activeQ) cls += ' explanation-active';
        cells += '<button type="button" class="' + cls + '" data-qnum="' + qNum + '"' +
          ' onclick="ExerciseHandlers.selectExplanationQuestion(' + qNum + ')">' + qNum + '</button>';
      });
      return '<div class="question-nav-row question-nav-row-letters question-nav-row-b1r2-expl explanation-mode" id="question-nav-row" data-nav-letters="0">' + cells + '</div>';
    },

    /**
     * B2 Reading 6 / C1 Reading 7: full paragraph or sentence cards with gap assignment buttons.
     * Inner HTML only (wrapper is added by renderToggleQuestions).
     */
  /**
   * C1 Reading 7 (checked, not explanation): which gap badges to show per paragraph card.
   * One green badge if correct; red (user) + green (key) if wrong; green key-only if gap failed elsewhere.
   * Card color reflects user placement only (see renderGappedTextParagraphToggleInner).
   */
  _c1Reading7ParagraphResultBadges: function(key, questions, userAnswer) {
    var userGap = null;
    questions.forEach(function(q) {
      if (userAnswer[q.number] === key) userGap = q.number;
    });
    var correctQ = questions.find(function(q) { return q.correct === key; });
    var correctGap = correctQ ? correctQ.number : null;
    var badges = [];

    if (userGap != null) {
      if (userGap === correctGap) {
        badges.push({ qNum: userGap, selected: true, outcome: 'correct' });
      } else {
        badges.push({ qNum: userGap, selected: true, outcome: 'incorrect' });
        if (correctGap != null) {
          badges.push({ qNum: correctGap, selected: false, outcome: 'correct' });
        }
      }
    } else if (correctGap != null && userAnswer[correctGap] !== key) {
      badges.push({ qNum: correctGap, selected: false, outcome: 'correct' });
    }

    return { badges: badges, userGap: userGap, correctGap: correctGap };
  },

    renderGappedTextParagraphToggleInner: function(exercise, partConfig) {
      var paragraphs = exercise.content.paragraphs || {};
      var questions = exercise.content.questions || [];
      var userAnswer = (AppState.currentExercise && AppState.currentExercise.answers) || {};
      var isChecked = AppState.answersChecked;
      var viewAsCorrect = typeof AppState !== 'undefined' && isChecked &&
        AppState.answerViewMode === 'correct';
      var isC1Gapped = typeof Utils !== 'undefined' && Utils.isC1GappedTextReading();
      var c1CheckedFeedback = isC1Gapped && isChecked && !viewAsCorrect;
      var effectiveAnswer = function(qNum) {
        if (viewAsCorrect) {
          var fq = questions.find(function(x) { return x.number === qNum; });
          return fq ? fq.correct : userAnswer[qNum];
        }
        return userAnswer[qNum];
      };
      var escapeHtml = function(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };
      var keys = Object.keys(paragraphs).sort(function(a, b) { return a.localeCompare(b); });
      var html = '';
      keys.forEach(function(key) {
        var raw = paragraphs[key] || '';
        var stripped = ReadingType7._stripBrackets(raw);
        var bodyHtml = typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.formatReadingPassageText
          ? ExerciseRenderer.formatReadingPassageText(stripped).replace(/\n/g, '<br>')
          : escapeHtml(stripped).replace(/\n/g, '<br>');
        var cardCls = 'reading-type7-toggle-card';
        var correctForQ = questions.find(function(q) { return q.correct === key; });
        var assignedQ = null;
        questions.forEach(function(q) {
          if (effectiveAnswer(q.number) === key) assignedQ = q;
        });
        var c1Result = c1CheckedFeedback
          ? ExerciseRenderer._c1Reading7ParagraphResultBadges(key, questions, userAnswer)
          : null;
        if (isChecked) {
          if (viewAsCorrect) {
            if (correctForQ) cardCls += ' reading-type7-toggle-card-show-correct';
          } else if (c1CheckedFeedback) {
            if (c1Result.userGap != null) {
              cardCls += c1Result.userGap === c1Result.correctGap
                ? ' reading-type7-toggle-card-correct'
                : ' reading-type7-toggle-card-incorrect';
            } else if (c1Result.correctGap != null && userAnswer[c1Result.correctGap] !== key) {
              // Correct answer paragraph not placed by user — gap failed, card red; badge stays green.
              cardCls += ' reading-type7-toggle-card-incorrect';
            }
          } else if (assignedQ) {
            var assignedUa = userAnswer[assignedQ.number];
            if (assignedUa && assignedUa === assignedQ.correct) {
              cardCls += ' reading-type7-toggle-card-correct';
            } else if (assignedUa) {
              cardCls += ' reading-type7-toggle-card-incorrect';
            }
          } else if (correctForQ) {
            var correctUa = userAnswer[correctForQ.number];
            if (!correctUa) {
              cardCls += ' reading-type7-toggle-card-incorrect';
            } else if (correctUa !== correctForQ.correct) {
              cardCls += ' reading-type7-toggle-card-incorrect';
            }
          } else {
            cardCls += ' reading-type7-toggle-card-unused';
          }
        }
        html += '<div class="' + cardCls + '" data-letter="' + escapeHtml(key) + '">';
        html += '<div class="reading-type7-toggle-card-head">';
        html += '<span class="reading-type7-toggle-letter">' + escapeHtml(key) + '</span>';
        html += '</div>';
        html += '<div class="reading-type7-toggle-card-body">' + bodyHtml + '</div>';
        html += '<div class="reading-type7-toggle-card-actions">';
        html += '<span class="reading-type7-toggle-actions-label">Gap</span>';
        if (c1CheckedFeedback) {
          c1Result.badges.forEach(function(badge) {
            var btnCls = 'reading-type7-toggle-gapbtn checked';
            if (badge.selected) btnCls += ' selected';
            btnCls += badge.outcome === 'correct' ? ' correct' : ' incorrect';
            html += '<button type="button" class="' + btnCls + '" data-qnum="' + badge.qNum +
              '" data-letter="' + escapeHtml(key) + '" disabled>' + badge.qNum + '</button>';
          });
        } else {
          questions.forEach(function(q) {
            var qNum = q.number;
            var selected = effectiveAnswer(qNum) === key;
            var btnCls = 'reading-type7-toggle-gapbtn';
            if (selected) btnCls += ' selected';
            if (isChecked) {
              if (viewAsCorrect) {
                if (q.correct === key) {
                  btnCls += ' checked rt7-gapbtn-show-correct';
                }
              } else {
                var gapUa = userAnswer[qNum];
                if (!gapUa) {
                  if (q.correct === key) {
                    btnCls += ' checked incorrect';
                  }
                } else if (q.correct === key && gapUa !== q.correct) {
                  btnCls += ' checked correct';
                } else if (selected && gapUa) {
                  btnCls += ' checked';
                  btnCls += gapUa === q.correct ? ' correct' : ' incorrect';
                }
              }
            } else if (userAnswer[qNum] && userAnswer[qNum] !== key) {
              btnCls += ' other-filled';
            }
            var attrs = 'type="button" class="' + btnCls + '" data-qnum="' + qNum + '" data-letter="' + escapeHtml(key) + '"';
            if (isChecked) {
              attrs += ' disabled';
            } else {
              attrs += ' onclick="ReadingType7.handleSelect(' + qNum + ', \'' + key + '\')"';
            }
            html += '<button ' + attrs + '>' + qNum + '</button>';
          });
        }
        html += '</div></div>';
      });
      return html;
    },
    
    renderToggleQuestions: function(exercise, partConfig) {
      const questions = exercise.content.questions || [];
      const userAnswer = AppState.currentExercise?.answers || {};
      const isChecked = AppState.answersChecked;
      const typePrefix = partConfig.type === 'cross-text-matching' ? 'reading-type6' : 
                         partConfig.type === 'multiple-matching' ? 'reading-type8' :
                         partConfig.type === 'gapped-text' ? 'reading-type7' : 'reading-type5';
      const isDuoCrossText = partConfig.type === 'cross-text-matching' &&
        typeof Utils !== 'undefined' && Utils.isDuoCrossTextReading();
      
      let html = '';
      
      // For gapped-text (B2 Part 6 / C1 Part 7): list each paragraph/sentence with gap buttons
      if (partConfig.type === 'gapped-text') {
        html += '<div id="reading-type7-paragraph-toggle" class="reading-type7-toggle-paras">';
        html += this.renderGappedTextParagraphToggleInner(exercise, partConfig);
        html += '</div>';
        return html;
      }
      
      html += '<div class="' + typePrefix + '-questions' + (isDuoCrossText ? ' c1-reading6-questions' : '') + '">';
      questions.forEach(function(q) {
        var questionGap = '';
        if (partConfig.type === 'cross-text-matching' && typeof window.ReadingType6 !== 'undefined') {
          if (isDuoCrossText && typeof ReadingType6.renderDuoQuestionCard === 'function') {
            html += ReadingType6.renderDuoQuestionCard(q, q.number, isChecked, userAnswer[q.number] || '');
            return;
          }
          questionGap = ReadingType6.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        } else if (partConfig.type === 'multiple-matching' && typeof window.ReadingType8 !== 'undefined') {
          questionGap = ReadingType8.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
        } else if (typeof window.ReadingType5 !== 'undefined') {
          var isClozeMcText = partConfig.type === 'multiple-choice-text' &&
            exercise.content && typeof exercise.content.text === 'string' && exercise.content.text.trim() !== '';
          questionGap = isClozeMcText
            ? ReadingType5.renderQuestionRow(q, q.number, isChecked, userAnswer[q.number] || '')
            : ReadingType5.renderQuestion(q, q.number, isChecked, userAnswer[q.number] || '');
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
      const questionType = partConfig ? partConfig.type : undefined;
      let cells = '';
      if (isPart7) {
        questions.forEach(function(q) {
          const qNum = q.number;
          const answer = answers[qNum];
          let cls = 'question-nav-cell question-nav-letter';
          var stateClass = typeof Utils !== 'undefined'
            ? Utils.getQuestionNumberStateClass({
              answer: answer,
              correct: q.correct,
              isChecked: isChecked,
              questionType: questionType
            })
            : '';
          if (stateClass) cls += ' ' + stateClass;
          cells += '<button class="' + cls + '" data-qnum="' + qNum + '" onclick="QuestionNav.openQuestion(' + qNum + ')">' + qNum + '</button>';
        });
        return '<div class="question-nav-row" id="question-nav-row">' + cells + '</div>';
      }
      questions.forEach(function(q) {
        const qNum = q.number;
        const answer = answers[qNum];
        let cls = 'question-nav-cell question-nav-letter';
        var stateClass = typeof Utils !== 'undefined'
          ? Utils.getQuestionNumberStateClass({
            answer: answer,
            correct: q.correct,
            isChecked: isChecked,
            questionType: questionType
          })
          : '';
        if (stateClass) cls += ' ' + stateClass;
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

      if (typeof ReadingType5 !== 'undefined' && typeof ReadingType5.syncAllFromAppState === 'function' &&
          typeof AppState !== 'undefined' && AppState.currentSection === 'reading') {
        var pc = typeof CONFIG !== 'undefined' && CONFIG.getPartConfig
          ? CONFIG.getPartConfig('reading', AppState.currentPart)
          : null;
        if (pc && pc.type === 'multiple-choice-text') {
          ReadingType5.syncAllFromAppState();
        }
      }

      if (view === 'questions' && typeof AppState !== 'undefined' && AppState.explanationMode &&
          typeof Utils !== 'undefined' && Utils.isC1ListeningDualMatching() &&
          typeof ListeningType4 !== 'undefined' && ListeningType4.applyExplanationMode) {
        ListeningType4.applyExplanationMode();
      }

      if (typeof AppState !== 'undefined' && AppState.explanationMode &&
          typeof Utils !== 'undefined' && AppState.currentExercise &&
          Utils.hasDuoMatchingUi(AppState.currentExercise) &&
          Utils.usesDuoMatchingSwappedLayout(AppState.currentExercise) &&
          typeof ExerciseHandlers !== 'undefined') {
        var swappedTextContainer = document.getElementById('selectable-text');
        if (swappedTextContainer) {
          swappedTextContainer.classList.toggle('explanation-mode-questions-view', view === 'questions');
        }
        if (view === 'text' && AppState.explanationActiveQuestion != null &&
            ExerciseHandlers._updateExplanationActiveQuestion) {
          ExerciseHandlers._updateExplanationActiveQuestion(AppState.explanationActiveQuestion);
        } else if (view === 'questions' && AppState.explanationActiveQuestion != null &&
            ExerciseHandlers._updateExplanationActiveQuestion) {
          ExerciseHandlers._clearEvidenceHighlights();
          ExerciseHandlers._updateExplanationActiveQuestion(AppState.explanationActiveQuestion);
          ExerciseHandlers._applyEvidenceHighlight(AppState.explanationActiveQuestion);
        }
      } else if (typeof AppState !== 'undefined' && AppState.explanationMode &&
          typeof Utils !== 'undefined' && AppState.currentExercise &&
          Utils.hasDuoMatchingUi(AppState.currentExercise) &&
          !Utils.usesDuoMatchingSwappedLayout(AppState.currentExercise) &&
          typeof ExerciseHandlers !== 'undefined') {
        var textContainer = document.getElementById('selectable-text');
        if (textContainer) {
          textContainer.classList.toggle('explanation-mode-questions-view', view === 'questions');
        }
        if (view === 'questions' && ExerciseHandlers.syncDuoMatchingQuestionsExplanationView) {
          ExerciseHandlers.syncDuoMatchingQuestionsExplanationView();
        } else if (view === 'text' && AppState.explanationActiveQuestion != null &&
            ExerciseHandlers._updateExplanationActiveQuestion) {
          ExerciseHandlers._clearEvidenceHighlights();
          ExerciseHandlers._updateExplanationActiveQuestion(AppState.explanationActiveQuestion);
          ExerciseHandlers._applyEvidenceHighlight(AppState.explanationActiveQuestion);
        }
      }
    },

    _hasTranscriptContent: function(exercise) {
      if (exercise.content.extracts && exercise.content.extracts.length > 0) {
        if (exercise.content.extracts.some(function(e) { return !!e.audio_script; })) return true;
        if (exercise.content.extracts.some(function(e) { return Array.isArray(e.dialogue) && e.dialogue.length > 0; })) return true;
      }
      if (exercise.content.audio_script) return true;
      if (Array.isArray(exercise.content.dialogue) && exercise.content.dialogue.length > 0) {
        return true;
      }
      var qs = exercise.content.questions || [];
      return qs.some(function(q) { return q && q.audio_script; });
    },

    renderListeningTranscript: function(exercise) {
      var html = '<div class="transcript-content listening-transcript-main">';
      var escapeHtml = function(text) {
        return String(text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };
      var self = this;
      var processScript = function(script) {
        var escaped = escapeHtml(script);
        var withMarkers = self.processEvidenceMarkers(escaped);
        return withMarkers.replace(/(\|\||\n)/g, '<br>');
      };
      var formatSpeakerLabel = function(raw, idx) {
        var label = String(raw || '').trim();
        if (!label) return 'Speaker ' + (idx + 1);
        var speakerMatch = label.match(/^speaker[_\s-]*(\d+)$/i);
        if (speakerMatch) return 'Speaker ' + speakerMatch[1];
        if (/^interviewer$/i.test(label)) return 'Interviewer';
        if (/^guest$/i.test(label)) return 'Guest';
        return label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, ' ');
      };
      var parseInterviewScriptTurns = function(script) {
        var raw = String(script || '').trim();
        if (!raw) return [];
        var blocks = raw.indexOf('||') >= 0 ? raw.split('||') : raw.split(/\n\n+/);
        var turns = [];
        blocks.forEach(function(block) {
          block = String(block || '').trim();
          if (!block) return;
          var match = block.match(/^([^:\n]{1,40}):\s*([\s\S]*)$/);
          if (match) {
            turns.push({ speaker: match[1].trim(), text: match[2].trim() });
          } else if (turns.length > 0) {
            turns[turns.length - 1].text += '\n\n' + block;
          } else {
            turns.push({ speaker: '', text: block });
          }
        });
        return turns;
      };
      var hasInterviewTurns = function(turns) {
        return turns.length > 1 || (turns.length === 1 && !!turns[0].speaker);
      };
      var renderDialogueTurn = function(turn, idx, opts) {
        if (!turn || typeof turn !== 'object') return '';
        opts = opts || {};
        var label = formatSpeakerLabel(turn.speaker, idx);
        var bodyRaw = String(turn.text == null ? '' : turn.text);
        var body = self.processEvidenceMarkers(escapeHtml(bodyRaw)).replace(/\n/g, '<br>');
        var speakerKey = String(turn.speaker || label || '').toLowerCase().trim();
        var turnClass = 'transcript-extract transcript-extract-interview transcript-speaker-card';
        if (/^interviewer$/.test(speakerKey)) {
          turnClass += ' transcript-turn-interviewer';
        } else if (/^guest$/.test(speakerKey)) {
          turnClass += ' transcript-turn-guest';
        } else {
          turnClass += ' transcript-turn-other';
        }
        var attrs = ' data-speaker-index="' + (opts.speakerIndex != null ? opts.speakerIndex : idx + 1) + '"';
        if (opts.extractId != null) {
          attrs += ' data-extract-id="' + escapeHtml(String(opts.extractId)) + '"';
        }
        return '<div class="' + turnClass + '"' + attrs + '>' +
          '<div class="transcript-speaker-label">' + escapeHtml(label) + '</div>' +
          '<div class="transcript-text">' + body + '</div>' +
          '</div>';
      };

      if (exercise.content.context && String(exercise.content.context).trim() !== '') {
        html += '<div class="listening-transcript-context" role="note">';
        html += '<span class="listening-transcript-context-label">Context</span>';
        html += '<p class="listening-transcript-context-text">' +
          escapeHtml(String(exercise.content.context).trim()).replace(/\n/g, '<br>') + '</p>';
        html += '</div>';
      }

      var multiExtractListening =
        exercise.content.extracts && exercise.content.extracts.length > 1;

      if (exercise.content.extracts && exercise.content.extracts.length > 0) {
        exercise.content.extracts.forEach(function(extract) {
          var extractIdAttr = multiExtractListening && extract.id != null
            ? ' data-extract-id="' + escapeHtml(String(extract.id)) + '"'
            : '';
          // Prefer audio_script for transcript display: it carries [n]…[/n] evidence markers used in explanation mode.
          if (extract.audio_script && String(extract.audio_script).trim() !== '') {
            if (extract.context) {
              html += '<div class="transcript-extract transcript-extract-header-only"' + extractIdAttr + '>';
              html += '<div class="transcript-extract-header">';
              html += '<span>' + escapeHtml(extract.context) + '</span>';
              html += '</div>';
              html += '</div>';
            }
            var interviewTurns = parseInterviewScriptTurns(extract.audio_script);
            if (hasInterviewTurns(interviewTurns)) {
              interviewTurns.forEach(function(turn, idx) {
                html += renderDialogueTurn(turn, idx, {
                  extractId: multiExtractListening ? extract.id : null,
                  speakerIndex: idx + 1
                });
              });
            } else {
              var scriptParts = extract.audio_script.split('||');
              if (scriptParts.length === 1 && String(scriptParts[0]).trim() !== '') {
                html += '<div class="transcript-extract transcript-extract-interview transcript-turn-other"' +
                  extractIdAttr + '>';
                html += '<div class="transcript-text">' + processScript(scriptParts[0].trim()) + '</div>';
                html += '</div>';
              } else {
                scriptParts.forEach(function(part, idx) {
                  if (String(part).trim() === '') return;
                  html += '<div class="transcript-extract transcript-extract-interview transcript-turn-other"' +
                    extractIdAttr + ' data-speaker-index="' + (idx + 1) + '">';
                  html += '<div class="transcript-text">' + processScript(part.trim()) + '</div>';
                  html += '</div>';
                });
              }
            }
            return;
          }
          if (Array.isArray(extract.dialogue) && extract.dialogue.length > 0) {
            if (extract.context) {
              html += '<div class="transcript-extract transcript-extract-header-only"' + extractIdAttr + '>';
              html += '<div class="transcript-extract-header">';
              html += '<span>' + escapeHtml(extract.context) + '</span>';
              html += '</div>';
              html += '</div>';
            }
            extract.dialogue.forEach(function(turn, idx) {
              html += renderDialogueTurn(turn, idx, {
                extractId: multiExtractListening ? extract.id : null,
                speakerIndex: idx + 1
              });
            });
            return;
          }
          if (!extract.audio_script) return;
          html += '<div class="transcript-extract" data-extract-id="' + extract.id + '">';
          html += '<div class="transcript-extract-header">';
          html += '<span>' + escapeHtml(extract.context) + '</span>';
          html += '</div>';
          html += '<div class="transcript-text">' + processScript(extract.audio_script) + '</div>';
          html += '</div>';
        });
      } else if (exercise.content.audio_script) {
        var rootTurns = parseInterviewScriptTurns(exercise.content.audio_script);
        if (hasInterviewTurns(rootTurns)) {
          rootTurns.forEach(function(turn, idx) {
            html += renderDialogueTurn(turn, idx, { speakerIndex: idx + 1 });
          });
        } else {
          var parts = exercise.content.audio_script.split('||');
          parts.forEach(function(part, idx) {
            if (part.trim() === '') return;
            var trimmed = part.trim();
            var turnExtra = ' transcript-extract-interview';
            if (/^Interviewer\s*:/i.test(trimmed)) {
              turnExtra += ' transcript-turn-interviewer';
            } else if (/^Guest\s*:/i.test(trimmed)) {
              turnExtra += ' transcript-turn-guest';
            }
            html += '<div class="transcript-extract' + turnExtra + '" data-speaker-index="' + (idx + 1) + '">';
            html += '<div class="transcript-text">' + processScript(part) + '</div>';
            html += '</div>';
          });
        }
      } else if (Array.isArray(exercise.content.dialogue) && exercise.content.dialogue.length > 0) {
        exercise.content.dialogue.forEach(function(turn, idx) {
          if (!turn || typeof turn !== 'object') return;
          var sp = String(turn.speaker || '').toLowerCase().trim();
          html += renderDialogueTurn(turn, idx, { speakerIndex: idx + 1 });
        });
      } else {
        var qsScript = (exercise.content.questions || []).filter(function(q) {
          return q && q.audio_script;
        });
        qsScript.forEach(function(q) {
          var qid = q.extractId != null ? q.extractId : q.number;
          html += '<div class="transcript-extract" data-extract-id="' + escapeHtml(String(qid)) + '">';
          if (q.context) {
            html += '<div class="transcript-extract-header">';
            html += '<span>' + escapeHtml(String(q.context)) + '</span>';
            html += '</div>';
          }
          html += '<div class="transcript-text">' + processScript(q.audio_script) + '</div>';
          html += '</div>';
        });
      }

      html += '</div>';
      return html;
    },

    renderListeningQuestionNavRow: function(exercise, partConfig) {
      var questions = exercise.content.questions || [];
      if (questions.length === 0 && exercise.content.task1 && exercise.content.task2) {
        questions = (exercise.content.task1.questions || []).concat(exercise.content.task2.questions || []);
      }
      if (questions.length === 0) return '';

      var answers = AppState.currentExercise?.answers || {};
      var isChecked = AppState.answersChecked;
      var questionType = partConfig ? partConfig.type : undefined;
      var cells = '';
      questions.forEach(function(q) {
        var qNum = q.number;
        var answer = answers[qNum];
        // For dual-matching, answers use key format 't1_qNum' or 't2_qNum'
        if (!answer && exercise.content.task1) {
          answer = answers['t1_' + qNum] || answers['t2_' + qNum];
        }
        var cls = 'question-nav-cell question-nav-letter';
        var stateClass = typeof Utils !== 'undefined'
          ? Utils.getQuestionNumberStateClass({
            answer: answer,
            correct: q.correct,
            isChecked: isChecked,
            questionType: questionType
          })
          : '';
        if (stateClass) cls += ' ' + stateClass;
        cells += '<button class="' + cls + '" data-qnum="' + qNum + '" onclick="QuestionNav.openQuestion(' + qNum + ')">' + qNum + '</button>';
      });
      return '<div class="question-nav-row" id="question-nav-row">' + cells + '</div>';
    },

    
    renderTransformationQuestions: function(exercise, partConfig) {
      let html = '';
      const questions = exercise.content.questions || [];
      const userAnswer = AppState.currentExercise?.answers || {};
      const isChecked = AppState.answersChecked;
      
      if (isChecked && typeof window.ReadingType4 !== 'undefined') {
        html += ReadingType4._renderShowAllBtn();
      }

      if (exercise.content.example && typeof window.ReadingType4 !== 'undefined') {
        html += ReadingType4.renderQuestion(exercise.content.example, 0, false, '');
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
    
    renderGapByType: function(question, qNum, partConfig, isInline) {
      const userAnswer = AppState.currentExercise?.answers?.[qNum] || '';
      const isChecked = AppState.answersChecked;
      
      switch(partConfig.type) {
        case 'multiple-choice':
          if (isInline && typeof window.ReadingType5 !== 'undefined' &&
              typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading() &&
              typeof ReadingType5.renderInlineGap === 'function') {
            return ReadingType5.renderInlineGap(question, qNum, isChecked, userAnswer);
          }
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
            if (isInline && typeof ReadingType5.renderInlineGap === 'function') {
              return ReadingType5.renderInlineGap(question, qNum, isChecked, userAnswer);
            }
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
            return ReadingType7.renderGap(question, qNum, isChecked, userAnswer, isInline);
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
          if (typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading()) {
            if (typeof ReadingType5?.initListeners === 'function') {
              ReadingType5.initListeners();
            }
          } else if (AppState.currentSection === 'listening' && typeof ListeningType1?.initListeners === 'function') {
            ListeningType1.initListeners();
          } else if (typeof ReadingType1?.initListeners === 'function') {
            ReadingType1.initListeners();
          }
          break;
        case 'transformations':
          // Initialize auto-resize for all transformation inputs that have existing answers
          setTimeout(function() {
            document.querySelectorAll('.reading-type4-inline-input').forEach(function(inp) {
              if (inp.value && typeof ReadingType4 !== 'undefined') ReadingType4.resizeInput(inp);
            });
          }, 50);
          break;
        case 'open-cloze':
          // Initialize auto-resize for all open-cloze inputs
          setTimeout(function() {
            document.querySelectorAll('.reading-type2-input').forEach(function(inp) {
              if (typeof ReadingType2 !== 'undefined') ReadingType2.resizeInput(inp);
            });
            document.querySelectorAll('.reading-type2-pill-input').forEach(function(inp) {
              if (typeof DashboardNav !== 'undefined' && typeof DashboardNav._resizeCuInput === 'function') {
                DashboardNav._resizeCuInput(inp);
              } else if (typeof ReadingType2 !== 'undefined') {
                ReadingType2.resizeInput(inp);
              }
            });
          }, 50);
          break;
        case 'word-formation':
          setTimeout(function() {
            document.querySelectorAll('.reading-type3-pill-input').forEach(function(inp) {
              if (typeof DashboardNav !== 'undefined' && typeof DashboardNav._resizeCuInput === 'function') {
                DashboardNav._resizeCuInput(inp);
              }
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
          // Initialize auto-resize for all sentence-completion inputs
          setTimeout(function() {
            document.querySelectorAll('.listening-type2-input').forEach(function(inp) {
              if (typeof ListeningType2 !== 'undefined') ListeningType2.resizeInput(inp);
            });
          }, 50);
          break;
        case 'essay':
          if (typeof WritingType1?.initListeners === 'function') WritingType1.initListeners();
          break;
        case 'email':
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
        case 'speaker-matching':
          if (typeof ListeningType3?.initListeners === 'function') ListeningType3.initListeners();
          break;
        case 'multiple-matching':
          setTimeout(function() {
            if (typeof ReadingType8 !== 'undefined' && ReadingType8.initB1Reading2StripIfNeeded) {
              ReadingType8.initB1Reading2StripIfNeeded();
            }
          }, 0);
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
        if (typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading()) {
          var duoLabel = '(' + qNum + ') ' + exampleText;
          var duoEsc = duoLabel.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return (
            '<span class="reading-type5-gap-wrap" data-qnum="' + qNum + '">' +
            '<button type="button" class="reading-type5-gap-trigger correct" disabled>' + duoEsc + '</button>' +
            '</span>'
          );
        }
        return `
          <span class="reading-type1-gap">
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word reading-type1-correct">${exampleText}</span>
          </span>
        `;
      }
      
      if (partConfig.type === 'word-formation') {
        const exEsc = (exampleText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const exWord = exampleData && exampleData.word ? String(exampleData.word) : '';
        const wordEsc = exWord.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const stemPill = exWord
          ? '<span class="cu-hint-pill-word cu-wf-pill-word">' + wordEsc + '</span>'
          : '';
        return (
          '<span class="reading-type3-gap-inline" data-type3-q="' + qNum + '">' +
          '<span class="cu-hint-pill reading-type3-wf-pill reading-type3-gap-pill--example">' +
          '<span class="cu-hint-pill-num">' + qNum + '</span>' +
          '<span class="reading-type3-answered reading-type3-example-answer">' + exEsc + '</span>' +
          stemPill +
          '</span></span>'
        );
      }
      
      if (partConfig.type === 'open-cloze') {
        if (typeof ReadingType2 !== 'undefined' && ReadingType2._isB1Reading6 && ReadingType2._isB1Reading6()) {
          return ReadingType2._renderDuoGap(
            { correct: exampleText },
            qNum,
            false,
            exampleText
          );
        }
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
      
      // For transformations (reading4), the example is already rendered inside renderTransformationQuestions
      if (partConfig.type === 'transformations') {
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
              <i class="fas fa-lightbulb"></i> <span data-i18n="example">Example</span>:
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
              <i class="fas fa-lightbulb"></i> <span data-i18n="example">Example</span>:
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
              <i class="fas fa-lightbulb"></i> <span data-i18n="example">Example</span>:
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
            <i class="fas fa-lightbulb"></i> <span data-i18n="example">Example</span>:
          </div>
          <div class="example-text">
            ${exampleData.text || ''} <strong>${exampleData.correct || ''}</strong>
          </div>
        </div>
      `;
    },
    
    renderExplanationsPanel: function(exercise) {
      var questions = [];
      if (exercise.content && exercise.content.questions) {
        questions = exercise.content.questions;
      } else if (exercise.content && exercise.content.task1 && exercise.content.task2) {
        questions = (exercise.content.task1.questions || []).concat(exercise.content.task2.questions || []);
      }
      if (questions.length === 0) return '';

      var html = '<div class="explanations-panel" id="explanations-panel" style="display:none" lang="en">';
      html += '<h3><i class="fas fa-lightbulb"></i> <span data-i18n="showExplanations">' + ('Show explanations') + '</span></h3>';

      questions.forEach(function(q) {
        html += '<div class="explanation-card" data-qnum="' + q.number + '" onclick="ExerciseHandlers.selectExplanationQuestion(' + q.number + ')">';
        html += '<div class="explanation-card-header">';
        html += '<span class="explanation-card-number">' + q.number + '</span>';
        html += '<span class="explanation-card-text">' + (q.explanation || 'No explanation available') + '</span>';
        html += '</div>';
        html += '</div>';
      });

      html += '</div>';
      return html;
    },
    
    renderExerciseFooter: function(part, totalParts) {
      var isExamMode = AppState.currentMode === 'exam';
      var isMixed = window.MixedTest && MixedTest.isActive();
      var mixedIdx = isMixed ? AppState.mixedTestCurrentIndex : -1;
      var mixedLastInSection = isMixed && MixedTest.isLastInSection(mixedIdx);
      var mixedLastInPlan = isMixed && MixedTest.isLastInPlan(mixedIdx);
      var isReading = AppState.currentSection === 'reading';
      var isListening = AppState.currentSection === 'listening';
      // In mixed mode, use actual section part for content-based conditions (explanations)
      var actualPart = AppState.currentPart || part;
      var isDuoInlineMcClozeAnswerToggle =
        typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading();
      var isDuoOpenClozeAnswerToggle =
        typeof Utils !== 'undefined' && Utils.isDuoOpenClozeReading();
      var isDuoListeningSentenceAnswerToggle =
        typeof Utils !== 'undefined' && Utils.isDuoListeningSentenceCompletion();
      var isC1ListeningSentenceAnswerToggle =
        typeof Utils !== 'undefined' && Utils.isC1ListeningSentenceCompletion();
      var supportsAnswerToggle =
        ((isReading && actualPart >= 1 && actualPart <= 4) ||
          isDuoInlineMcClozeAnswerToggle ||
          isDuoOpenClozeAnswerToggle ||
          (isDuoListeningSentenceAnswerToggle && !isC1ListeningSentenceAnswerToggle)) &&
        !(AppState.currentExercise && AppState.currentExercise._b1PetHideAnswerToggle);
      var answerToggleLabel = AppState.answerViewMode === 'correct'
        ? 'Show your answer'
        : (isDuoInlineMcClozeAnswerToggle || isDuoOpenClozeAnswerToggle || isDuoListeningSentenceAnswerToggle
          ? 'Show correct answers'
          : 'Show correct answer');
      var answerToggleIcon = AppState.answerViewMode === 'correct' ? 'visibility_off' : 'visibility';
      let footer = '';

      if ((isMixed ? mixedIdx > 0 : part > 1) && (!isExamMode || AppState.examFullMode)) {
        footer += `<button class="btn-prev" onclick="Exercise.goToPrevPart()"><i class="fas fa-chevron-left"></i> <span data-i18n="previous">Previous</span></button>`;
      }
      
      if (!isExamMode) {
        footer += `
          <button class="btn-check" onclick="ExerciseHandlers.checkAnswers()" ${AppState.answersChecked ? 'disabled' : ''}>
            <i class="fas fa-check"></i> <span data-i18n="checkAnswers">Check answers</span>
          </button>
        `;

        footer += `
          <button class="btn-toggle-answer" onclick="ExerciseHandlers.toggleAnswerView()" ${supportsAnswerToggle && AppState.answersChecked ? '' : 'style="display:none"'}>
            <span class="material-symbols-outlined btn-toggle-answer-icon">${answerToggleIcon}</span> <span class="btn-toggle-answer-label">${answerToggleLabel}</span>
          </button>
        `;

        // Reading and listening: show explanations only after answers have been checked
        // Reading part 4: never show (broken); reading parts 5–8 (except B1 parts 5–6): header Explanation mode
        // B1 Reading Parts 5–6: footer "Show explanations" like parts 1–2
        // Listening: explanation button is in toggle-view-header
        // all other sections: always show in practice mode
        // Reading parts 1–2: footer "Show explanations" (part 4 excluded; B1 part 3 and other 5–8 use header Explanation;
        // B1 Preliminary Reading Part 2 uses header only).
        var isDuoOpenClozeFooterExplanations =
          typeof Utils !== 'undefined' && Utils.isDuoOpenClozeReading();
        var isDuoInlineMcClozeFooterExplanations =
          typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading();
        if ((isReading && actualPart > 0 && actualPart < 4 &&
            !(AppState.currentExercise && typeof Utils !== 'undefined' &&
              Utils.hasDuoMatchingUi(AppState.currentExercise)) &&
            !(AppState.currentLevel === 'B1' && actualPart === 3)) ||
            isDuoOpenClozeFooterExplanations ||
            isDuoInlineMcClozeFooterExplanations) {
          footer += `
          <button class="btn-explanations" onclick="ExerciseHandlers.toggleExplanations()" ${AppState.answersChecked ? '' : 'style="display:none"'}>
            <i class="fas fa-lightbulb"></i> <span data-i18n="showExplanations">Show explanations</span>
          </button>
          `;
        } else if (!isReading && !isListening) {
          footer += `
          <button class="btn-explanations" onclick="ExerciseHandlers.toggleExplanations()">
            <i class="fas fa-lightbulb"></i> <span data-i18n="showExplanations">Show explanations</span>
          </button>
          `;
        }

        footer += `
          <button class="btn-reset" onclick="ExerciseHandlers.resetExercise()">
            <i class="fas fa-redo-alt"></i> <span data-i18n="reset">Reset</span>
          </button>
        `;
      }
      
      if (isMixed) {
        if (!mixedLastInSection) {
          footer += `<button class="btn-next" onclick="Exercise.goToNextPart()"><span data-i18n="next">Next</span> <i class="fas fa-chevron-right"></i></button>`;
        } else if (AppState.examFullMode) {
          footer += `<button class="btn-next btn-finish-section" onclick="Exercise.goToNextPart()"><span data-i18n="finishSection">Finish Section</span> <i class="fas fa-check"></i></button>`;
        } else if (mixedLastInPlan) {
          footer += `<button class="btn-next btn-finish-section" onclick="Exercise.goToNextPart()"><span>Finish Test</span> <i class="fas fa-check"></i></button>`;
        } else {
          footer += `<button class="btn-next" onclick="Exercise.goToNextPart()"><span data-i18n="next">Next</span> <i class="fas fa-chevron-right"></i></button>`;
        }
      } else if (part < totalParts) {
        footer += `<button class="btn-next" onclick="Exercise.goToNextPart()"><span data-i18n="next">Next</span> <i class="fas fa-chevron-right"></i></button>`;
      } else if (AppState.examFullMode) {
        // Last part of a section in exam full mode: show "Finish Section" button
        footer += `<button class="btn-next btn-finish-section" onclick="Exercise.goToNextPart()"><span data-i18n="finishSection">Finish Section</span> <i class="fas fa-check"></i></button>`;
      }
      
      return footer;
    },

    /** Navigation cells for mixed-test mode (same style as normal part-nav-row). */
    renderMixedTestProgress: function() {
      if (!window.MixedTest || !MixedTest.isActive()) return '';
      var plan = AppState.mixedTestPlan;
      var idx  = AppState.mixedTestCurrentIndex;
      var currentItem = plan[idx];
      if (!currentItem) return '';
      var currentSection = currentItem.section;
      var level = AppState.currentLevel || 'C1';

      var cells = '';
      for (var i = 0; i < plan.length; i++) {
        var item = plan[i];
        if (item.section !== currentSection) continue;
        var isActive = i === idx;
        var exam = window.EXAMS_DATA && EXAMS_DATA[level] ? EXAMS_DATA[level].find(function(e) { return e.id === item.examId; }) : null;
        var isCompleted = exam ? ((exam.sections[item.section] && exam.sections[item.section].completed || []).includes(item.part)) : false;
        var cellClass = 'part-nav-cell';
        if (isActive)    cellClass += ' active';
        if (isCompleted) cellClass += ' completed';
        var sectionLabel = item.section.charAt(0).toUpperCase() + item.section.slice(1);
        var tooltip = sectionLabel + ' ' + item.part;
        cells += '<button class="' + cellClass + '" data-plan-index="' + i + '" title="' + tooltip + '" onclick="MixedTest.startAtIndex(' + i + ')">' + item.part + '</button>';
      }

      return '<div class="part-nav-row">' + cells + '</div>';
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
        
        cells += `<button class="${cellClass}" data-part="${i}" onclick="Exercise.openPart('${examId}', '${section}', ${i})" title="Part ${i}">
          ${i}
        </button>`;
      }
      
      return `<div class="part-nav-row">${cells}</div>`;
    },
    
    _isGappedSentenceMode: function(exercise) {
      // Returns true when gaps are inline sentences within paragraphs (B2 Part 6),
      // vs false when gaps are isolated paragraph-level blocks (C1 Part 7).
      // An isolated gap is a text segment (split by ||) that contains only "(N)".
      if (!exercise.content || !exercise.content.text) return false;
      var segments = exercise.content.text.split('||');
      return !segments.some(function(seg) { return !!seg.trim().match(/^\(\d+\)$/); });
    },

    getDefaultDescription: function(partConfig) {
      const descriptions = {
        'multiple-choice': 'Choose the correct word for each gap.',
        'open-cloze': 'Write one word in each gap.',
        'word-formation': 'Use the word in capitals to form a new word.',
        'transformations': 'Key word transformation practice',
        'multiple-choice-text': 'Read the text and choose the best answer.',
        'cross-text-matching': 'Read the texts and match the questions.',
        'gapped-text': 'Choose which paragraph fits each gap.',
        'multiple-matching': 'Match the questions to the correct section.',
        'sentence-completion': 'Complete the sentences with the missing information.'
      };
      return descriptions[partConfig.type] || 'Complete the exercise.';
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
