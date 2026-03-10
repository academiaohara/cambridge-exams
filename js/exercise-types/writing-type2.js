// js/exercise-types/writing-type2.js
// Choice writing - Writing Part 2

(function() {
  window.WritingType2 = {
    selectedTaskId: null,

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const tasks = exercise.content.tasks || [];

      let tasksHTML = tasks.map(task => `
        <div class="writing-type2-task-option" data-task-id="${task.id}"
             onclick="WritingType2.selectTask('${task.id}')">
          <div class="writing-type2-task-header">
            <span class="writing-type2-task-badge">${task.type}</span>
            <span class="writing-type2-task-title">${task.title}</span>
          </div>
          <p class="writing-type2-task-preview">${task.prompt.substring(0, 100)}${task.prompt.length > 100 ? '…' : ''}</p>
          <div class="writing-type2-task-full-prompt" style="display:none;">${task.prompt}</div>
        </div>
      `).join('');

      const html = `
        <div class="writing-type2-wrapper">
          <div class="writing-type2-select-section">
            <h3><i class="fas fa-tasks"></i> ${I18n.t('selectTask')}</h3>
            <div class="writing-type2-tasks-list">
              ${tasksHTML}
            </div>
          </div>
          <div class="writing-type2-writing-section" id="writing-type2-writing-area" style="display:none;">
            <textarea class="writing-type2-textarea writing-textarea"
                      lang="en" spellcheck="true"
                      placeholder="${I18n.t('writeEssay')}..."
                      oninput="WritingType2.handleInput(this.value)"></textarea>
            <div class="writing-corrected-text" id="writing-type2-corrected" style="display:none;"></div>
            <div class="writing-type2-footer-row">
              <div class="writing-type2-word-count">
                <span id="writing-type2-count">0</span> ${I18n.t('wordsWritten')}
              </div>
              <button class="btn-copy-clipboard" onclick="WritingType2.copyToClipboard()" title="${I18n.t('copyClipboard')}">
                <i class="fas fa-copy"></i> ${I18n.t('copyClipboard')}
              </button>
            </div>
            <div class="writing-type2-actions">
              ${AppState.currentMode !== 'exam' ? `<button class="btn-evaluate-ai" id="writing-type2-evaluate-btn" onclick="WritingType2.evaluateWithAI()">
                <i class="fas fa-robot"></i> ${I18n.t('evaluateAI')}
              </button>` : ''}
            </div>
            <div class="writing-inline-msg" id="writing-type2-msg" style="display:none;"></div>
            <div class="writing-type2-ai-results" id="writing-type2-ai-results" style="display:none;">
              <h4><i class="fas fa-star"></i> ${I18n.t('aiEvaluation')}</h4>
              <div id="writing-type2-ai-content"></div>
            </div>
          </div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      wrapper.className = 'writing-type2-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      const checkBtn = document.querySelector('.btn-check');
      const explBtn = document.querySelector('.btn-explanations');
      if (checkBtn) checkBtn.style.display = 'none';
      if (explBtn) explBtn.style.display = 'none';

      // Restore saved state
      const savedTaskId = AppState.currentExercise.answers?.taskId;
      if (savedTaskId) this.selectTask(savedTaskId, true);
    },

    selectTask: function(taskId, silent) {
      this.selectedTaskId = taskId;

      document.querySelectorAll('.writing-type2-task-option').forEach(el => {
        const isSelected = el.dataset.taskId === taskId;
        el.classList.toggle('selected', isSelected);
        const preview = el.querySelector('.writing-type2-task-preview');
        const fullPrompt = el.querySelector('.writing-type2-task-full-prompt');
        if (preview) preview.style.display = isSelected ? 'none' : '';
        if (fullPrompt) fullPrompt.style.display = isSelected ? 'block' : 'none';
      });

      const tasks = AppState.currentExercise.content.tasks || [];
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const area = document.getElementById('writing-type2-writing-area');
      if (area) area.style.display = 'block';

      if (!silent) {
        if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
        AppState.currentExercise.answers.taskId = taskId;
      }

      const textarea = area?.querySelector('.writing-type2-textarea');
      const correctedDiv = document.getElementById('writing-type2-corrected');
      const evalBtn = document.getElementById('writing-type2-evaluate-btn');
      const resultsDiv = document.getElementById('writing-type2-ai-results');
      const contentDiv = document.getElementById('writing-type2-ai-content');

      const savedFeedback = AppState.currentExercise.answers?.['_aiFeedback_' + taskId];

      if (savedFeedback) {
        // Restore evaluated state
        const correctedText = this._extractCorrectedText(savedFeedback);
        if (correctedText && correctedDiv) {
          correctedDiv.innerHTML = this._renderCorrectedText(correctedText);
          correctedDiv.style.display = 'block';
        } else if (correctedDiv) {
          correctedDiv.style.display = 'none';
        }
        if (textarea) {
          textarea.value = AppState.currentExercise.answers?.[taskId] || '';
          textarea.disabled = true;
          textarea.style.display = 'none';
        }
        if (evalBtn) evalBtn.disabled = true;
        if (resultsDiv) resultsDiv.style.display = 'block';
        const feedbackText = savedFeedback.replace(/✏️\s*CORRECTED TEXT\s*\n[\s\S]*?(?=\n📝\s*DETAILED FEEDBACK|\n✅|\n⚠️|$)/i, '');
        if (contentDiv) contentDiv.innerHTML = this._buildFeedbackTabs(feedbackText, 'type2');
        this._updateCount(AppState.currentExercise.answers?.[taskId] || '');
      } else {
        // Normal unevaluated state
        if (textarea) {
          const savedText = AppState.currentExercise.answers?.[taskId] || '';
          textarea.value = savedText;
          textarea.disabled = false;
          textarea.style.display = '';
          this._updateCount(savedText);
        }
        if (correctedDiv) { correctedDiv.innerHTML = ''; correctedDiv.style.display = 'none'; }
        if (evalBtn) evalBtn.disabled = false;
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (contentDiv) contentDiv.innerHTML = '';
      }
    },

    _updateCount: function(text) {
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      const el = document.getElementById('writing-type2-count');
      if (el) {
        el.textContent = count;
        if (typeof WritingValidator !== 'undefined') {
          el.className = 'wv-counter-number ' + WritingValidator.getColorClass(count);
        }
      }
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      if (this.selectedTaskId) AppState.currentExercise.answers[this.selectedTaskId] = value;
      this._updateCount(value);
    },

    _showMsg: function(text) {
      const msg = document.getElementById('writing-type2-msg');
      if (!msg) return;
      msg.textContent = text;
      msg.style.display = 'block';
      clearTimeout(this._msgTimer);
      this._msgTimer = setTimeout(() => { msg.style.display = 'none'; }, 4000);
    },

    copyToClipboard: function() {
      const essay = AppState.currentExercise.answers?.[this.selectedTaskId] || '';
      if (!essay.trim()) {
        this._showMsg(I18n.t('writeEssay'));
        return;
      }
      navigator.clipboard.writeText(essay).then(() => {
        this._showMsg(I18n.t('copiedClipboard'));
      }).catch(() => {
        this._showMsg(I18n.t('copyError'));
      });
    },

    sendWriting: async function(text, taskType, taskPrompt) {
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, taskType, taskPrompt, examLevel: AppState.currentLevel || 'C1' })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.corrected;
    },

    _extractScore: function(text) {
      const match = text.match(/Total:\s*(\d+)\s*\/\s*20/i);
      return match ? parseInt(match[1], 10) : 0;
    },

    _extractCorrectedText: function(text) {
      const match = text.match(/✏️\s*CORRECTED TEXT\s*\n([\s\S]*?)(?=\n📝\s*DETAILED FEEDBACK|\n✅|\n⚠️|$)/i);
      if (!match) return '';
      return match[1].trim();
    },

    _renderCorrectedText: function(corrected) {
      let html = corrected
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/~~(.*?)~~/g, '<del class="writing-correction-del">$1</del>')
        .replace(/\+\+(.*?)\+\+/g, '<ins class="writing-correction-ins">$1</ins>')
        .replace(/\n/g, '<br>');
      return html;
    },

    _updatePartScore: function(score) {
      const partScoreElement = document.getElementById('part-score-display');
      if (partScoreElement) {
        partScoreElement.innerHTML = score + '/20';
      }

      const sectionKey = AppState.currentExamId + '_' + AppState.currentSection;
      if (!AppState.sectionScores[sectionKey]) AppState.sectionScores[sectionKey] = {};
      AppState.sectionScores[sectionKey][AppState.currentPart] = score;
      AppState.currentPartScore = score;

      const scoreElement = document.getElementById('score-display');
      if (scoreElement) {
        const sectionTotal = ExerciseRenderer.getSectionTotalQuestions(AppState.currentSection);
        const runningTotal = ExerciseRenderer.getSectionRunningTotal(sectionKey);
        scoreElement.innerHTML = runningTotal + '/' + sectionTotal;
      }

      Exercise.savePartState();
    },

    evaluateWithAI: function() {
      if (!this.selectedTaskId) {
        this._showMsg(I18n.t('selectTask'));
        return;
      }

      const essay = AppState.currentExercise.answers?.[this.selectedTaskId] || '';
      if (!essay.trim()) {
        this._showMsg(I18n.t('writeEssay'));
        return;
      }

      // Pre-submit word count validation
      if (typeof WritingValidator !== 'undefined') {
        WritingValidator.validateBeforeSubmit(essay, () => {
          this._doEvaluate(essay);
        }, null);
        return;
      }

      this._doEvaluate(essay);
    },

    _doEvaluate: function(essay) {
      const resultsDiv = document.getElementById('writing-type2-ai-results');
      const contentDiv = document.getElementById('writing-type2-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.innerHTML = `<div class="writing-ai-loading"><i class="fas fa-spinner fa-spin"></i> ${I18n.t('evaluating')}</div>`;

      // Disable textarea and evaluate button during evaluation
      const textarea = document.querySelector('.writing-type2-textarea');
      const evalBtn = document.getElementById('writing-type2-evaluate-btn');
      if (textarea) textarea.disabled = true;
      if (evalBtn) evalBtn.disabled = true;

      const tasks = AppState.currentExercise.content.tasks || [];
      const task = tasks.find(t => t.id === this.selectedTaskId);
      const taskType = task?.type || '';
      const taskPrompt = task?.prompt || '';

      this.sendWriting(essay, taskType, taskPrompt)
        .then(text => {
          // Extract and display corrected text
          const correctedText = this._extractCorrectedText(text);
          const correctedDiv = document.getElementById('writing-type2-corrected');
          if (correctedText && correctedDiv) {
            correctedDiv.innerHTML = this._renderCorrectedText(correctedText);
            correctedDiv.style.display = 'block';
            if (textarea) textarea.style.display = 'none';
          }

          // Save AI feedback for persistence
          if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
          AppState.currentExercise.answers['_aiFeedback_' + this.selectedTaskId] = text;
          AppState.answersChecked = true;

          // Extract score and update display
          const score = this._extractScore(text);
          this._updatePartScore(score);

          // Display feedback in tabs (exclude corrected text section)
          const feedbackText = text.replace(/✏️\s*CORRECTED TEXT\s*\n[\s\S]*?(?=\n📝\s*DETAILED FEEDBACK|\n✅|\n⚠️|$)/i, '');
          if (contentDiv) contentDiv.innerHTML = this._buildFeedbackTabs(feedbackText, 'type2');
        })
        .catch(() => {
          if (contentDiv) contentDiv.textContent = I18n.t('aiError');
          // Re-enable on error
          if (textarea) { textarea.disabled = false; textarea.style.display = ''; }
          if (evalBtn) evalBtn.disabled = false;
        });
    },

    _parseFeedbackSections: function(text) {
      const sections = { scores: '', detailed: '', strengths: '', improvements: '' };
      const escaped = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const scoresMatch = escaped.match(/📊\s*SCORES\s*\n([\s\S]*?)(?=\n✏️|\n📝|\n✅|\n⚠️|$)/i);
      if (scoresMatch) sections.scores = scoresMatch[1].trim();

      const detailedMatch = escaped.match(/📝\s*DETAILED FEEDBACK\s*\n([\s\S]*?)(?=\n✅|\n⚠️|$)/i);
      if (detailedMatch) sections.detailed = detailedMatch[1].trim();

      const strengthsMatch = escaped.match(/✅\s*STRENGTHS\s*\n([\s\S]*?)(?=\n⚠️|$)/i);
      if (strengthsMatch) sections.strengths = strengthsMatch[1].trim();

      const improvementsMatch = escaped.match(/⚠️\s*AREAS FOR IMPROVEMENT\s*\n([\s\S]*?)$/i);
      if (improvementsMatch) sections.improvements = improvementsMatch[1].trim();

      return sections;
    },

    _formatSectionContent: function(text) {
      return text
        .replace(/^(Content|Communicative Achievement|Organisation|Language):/gm,
          '<div class="writing-feedback-criterion-title"><i class="fas fa-angle-right"></i> <strong>$1</strong></div>')
        .replace(/^• (.+)/gm, '<div class="writing-score-line">$1</div>')
        .replace(/^- (.+)/gm, '<div class="writing-feedback-list-item"><i class="fas fa-chevron-right writing-feedback-list-icon"></i> $1</div>')
        .replace(/\n/g, '<br>');
    },

    _getModelAnswer: function() {
      const exercise = AppState.currentExercise;
      if (!this.selectedTaskId) return '';
      const tasks = exercise?.content?.tasks || [];
      const task = tasks.find(t => t.id === this.selectedTaskId);
      return task?.modelAnswer || '';
    },

    _buildFeedbackTabs: function(text, prefix) {
      const sections = this._parseFeedbackSections(text);
      const modelAnswer = this._getModelAnswer();

      const tabs = [
        { id: 'scores', icon: 'fa-chart-bar', label: I18n.t('feedbackScores'), content: sections.scores },
        { id: 'detailed', icon: 'fa-comment-dots', label: I18n.t('feedbackDetailed'), content: sections.detailed },
        { id: 'strengths', icon: 'fa-check-circle', label: I18n.t('feedbackStrengths'), content: sections.strengths },
        { id: 'improvements', icon: 'fa-exclamation-triangle', label: I18n.t('feedbackImprovements'), content: sections.improvements },
        { id: 'ideal', icon: 'fa-star', label: I18n.t('feedbackIdealResponse'), content: modelAnswer }
      ].filter(t => t.content);

      if (!tabs.length) return '<div class="writing-ai-feedback">' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div>';

      let html = '<div class="writing-feedback-tabs">';
      html += '<div class="writing-feedback-tab-buttons">';
      tabs.forEach((tab, i) => {
        html += `<button class="writing-feedback-tab-btn${i === 0 ? ' active' : ''}" data-tab="${prefix}-${tab.id}" onclick="WritingType2.switchFeedbackTab('${prefix}', '${tab.id}')">
          <i class="fas ${tab.icon}"></i> ${tab.label}
        </button>`;
      });
      html += '</div>';

      tabs.forEach((tab, i) => {
        const isIdeal = tab.id === 'ideal';
        const contentHtml = isIdeal
          ? '<div class="writing-model-answer">' + tab.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div>'
          : '<div class="writing-ai-feedback">' + this._formatSectionContent(tab.content) + '</div>';
        html += `<div class="writing-feedback-tab-panel${i === 0 ? ' active' : ''}" id="panel-${prefix}-${tab.id}">
          ${contentHtml}
        </div>`;
      });

      html += '</div>';
      return html;
    },

    switchFeedbackTab: function(prefix, tabId) {
      document.querySelectorAll(`.writing-feedback-tab-btn[data-tab^="${prefix}-"]`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === `${prefix}-${tabId}`);
      });
      document.querySelectorAll(`.writing-feedback-tab-panel[id^="panel-${prefix}-"]`).forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${prefix}-${tabId}`);
      });
    },

    _formatFeedback: function(text) {
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^(📊 SCORES|📝 DETAILED FEEDBACK|✅ STRENGTHS|⚠️ AREAS FOR IMPROVEMENT)/gm, '<h5 class="writing-feedback-heading">$1</h5>')
        .replace(/^• (.+)/gm, '<div class="writing-score-line">$1</div>')
        .replace(/\n/g, '<br>');
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
