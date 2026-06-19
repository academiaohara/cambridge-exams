// js/exercise-types/writing-type2.js
// Choice writing - Writing Part 2

(function() {
  window.WritingType2 = {
    selectedTaskId: null,

    /** Escape text for safe HTML insertion. */
    _escapeHtml: function(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    /** Escape for double-quoted HTML attributes. */
    _escapeAttr: function(s) {
      return this._escapeHtml(s).replace(/'/g, '&#39;');
    },

    /**
     * B1 Preliminary JSON uses "||" between lines in prompts and model answers.
     * @returns {string}
     */
    _promptToPlainLines: function(raw) {
      return String(raw == null ? '' : raw).replace(/\|\|/g, '\n');
    },

    /** Prompt / model answer body: normalize delimiters, escape, then line breaks for display. */
    _formatPromptBodyHtml: function(raw) {
      var text = this._promptToPlainLines(raw);
      return this._escapeHtml(text).replace(/\n/g, '<br>');
    },

    /** Short plain preview (first ~len chars) for task cards. */
    _previewSnippet: function(raw, len) {
      var plain = this._promptToPlainLines(raw).replace(/\s+/g, ' ').trim();
      var cap = typeof len === 'number' ? len : 100;
      if (plain.length <= cap) return this._escapeHtml(plain);
      return this._escapeHtml(plain.substring(0, cap)) + '…';
    },

    /**
     * Parse a suggested word range from the exercise description (B1 "about 100 words",
     * B2 "140-190 words", C1 "220-260 words", etc.).
     * @returns {{ min: number, max: number }|null}
     */
    _parseWordRangeFromDescription: function(exercise) {
      var desc = exercise && exercise.description != null ? String(exercise.description) : '';
      var m = desc.match(/(\d+)\s*[-–]\s*(\d+)\s+words/i);
      if (m) {
        var a = parseInt(m[1], 10);
        var b = parseInt(m[2], 10);
        if (!isNaN(a) && !isNaN(b) && b >= a) return { min: a, max: b };
      }
      m = desc.match(/about\s+(\d+)\s+words/i);
      if (m) {
        var n = parseInt(m[1], 10);
        if (!isNaN(n)) {
          return { min: Math.max(35, Math.floor(n * 0.75)), max: Math.ceil(n * 1.2) };
        }
      }
      return null;
    },

    _getActiveWordRange: function() {
      var ex = typeof AppState !== 'undefined' ? AppState.currentExercise : null;
      var r = this._parseWordRangeFromDescription(ex);
      if (r) return r;
      if (ex && ex.level === 'B1' && parseInt(ex.part, 10) === 2) {
        return { min: 80, max: 120 };
      }
      return null;
    },

    _normalizePromptForApi: function(raw) {
      return this._promptToPlainLines(raw);
    },

    _placeholderText: function() {
      var range = this._getActiveWordRange();
      var isB1 = typeof AppState !== 'undefined' && AppState.currentLevel === 'B1';
      if (isB1 || range) return 'Write your answer...';
      return 'Write your essay...';
    },

    _emptyAnswerMsg: function() {
      var isB1 = typeof AppState !== 'undefined' && AppState.currentLevel === 'B1';
      return isB1 ? 'Write your answer' : 'Write your essay';
    },

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const tasks = (exercise.content && exercise.content.tasks) || [];
      const range = this._getActiveWordRange();
      const rangeHint = range
        ? '<p class="writing-type2-range-hint">Your answer should be about <strong>' +
          range.min + '–' + range.max + ' words</strong>.</p>'
        : '';

      let tasksHTML = tasks.map(task => {
        const escType = WritingType2._escapeHtml(task.type);
        const escTitle = WritingType2._escapeHtml(task.title);
        const escId = WritingType2._escapeAttr(task.id);
        const preview = WritingType2._previewSnippet(task.prompt, 100);
        const fullHtml = WritingType2._formatPromptBodyHtml(task.prompt);
        return `
        <div class="writing-type2-task-option" data-task-id="${escId}" role="button" tabindex="0">
          <div class="writing-type2-task-header">
            <span class="writing-type2-task-badge">${escType}</span>
            <span class="writing-type2-task-title">${escTitle}</span>
          </div>
          <p class="writing-type2-task-preview">${preview}</p>
          <div class="writing-type2-task-full-prompt writing-type2-task-full-prompt--formatted" style="display:none;">${fullHtml}</div>
        </div>
      `;
      }).join('');

      const html = `
        <div class="writing-type2-wrapper">
          <div class="writing-type2-select-section">
            <h3><i class="fas fa-tasks"></i> Select a task</h3>
            ${rangeHint}
            <div class="writing-type2-tasks-list">
              ${tasksHTML}
            </div>
          </div>
          <div class="writing-type2-writing-section" id="writing-type2-writing-area" style="display:none;">
            <textarea class="writing-type2-textarea writing-textarea"
                      lang="en" spellcheck="true"
                      placeholder="${WritingType2._escapeAttr(WritingType2._placeholderText())}"
                      oninput="WritingType2.handleInput(this.value)"></textarea>
            <div class="writing-corrected-text" id="writing-type2-corrected" style="display:none;"></div>
            <div class="writing-type2-toolbar">
              <div class="writing-type2-word-count">
                <span id="writing-type2-count">0</span> words written
              </div>
              <button class="btn-copy-clipboard" onclick="WritingType2.copyToClipboard()" title="Copy to clipboard" aria-label="Copy to clipboard">
                <i class="fas fa-copy" aria-hidden="true"></i>
              </button>
              ${AppState.currentMode !== 'exam' ? `<button class="btn-evaluate-ai" id="writing-type2-evaluate-btn" onclick="WritingType2.evaluateWithAI()" title="Evaluate with AI">
                <i class="fas fa-robot"></i><span class="writing-btn-label"> Evaluate with AI</span>
              </button>` : ''}
            </div>
            <div class="writing-inline-msg" id="writing-type2-msg" style="display:none;"></div>
            <div class="writing-type2-ai-results" id="writing-type2-ai-results" style="display:none;">
              <h4><i class="fas fa-star"></i> AI Evaluation</h4>
              <div id="writing-type2-ai-content"></div>
            </div>
          </div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      const level = (typeof AppState !== 'undefined' && AppState.currentLevel) || '';
      wrapper.className = 'writing-type2-container' + (Utils.isDuoExerciseUi(level) ? ' b1-writing' : '');
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      const tasksList = wrapper.querySelector('.writing-type2-tasks-list');
      if (tasksList) {
        tasksList.addEventListener('click', function(ev) {
          const opt = ev.target.closest('.writing-type2-task-option');
          if (!opt || !tasksList.contains(opt)) return;
          const id = opt.getAttribute('data-task-id');
          if (id) WritingType2.selectTask(id);
        });
      }

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
          const range = this._getActiveWordRange();
          const cls = range && typeof WritingValidator.getColorClassForRange === 'function'
            ? WritingValidator.getColorClassForRange(count, range.min, range.max)
            : WritingValidator.getColorClass(count);
          el.className = 'wv-counter-number ' + cls;
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
        this._showMsg(this._emptyAnswerMsg());
        return;
      }
      navigator.clipboard.writeText(essay).then(() => {
        this._showMsg('Copied to clipboard!');
      }).catch(() => {
        this._showMsg('Could not copy to clipboard');
      });
    },

    sendWriting: async function(text, taskType, taskPrompt) {
      const headers = typeof AccessControl !== 'undefined'
        ? AccessControl.getAiAuthHeaders()
        : { "Content-Type": "application/json" };
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ text, taskType, taskPrompt, examLevel: AppState.currentLevel || 'C1' })
      });

      const data = await res.json();
      if (typeof AccessControl !== 'undefined' && AccessControl.handleAiApiError(data, res)) {
        throw new Error(data.message || data.error || 'Request blocked');
      }
      if (typeof AccessControl !== 'undefined') AccessControl.applyQuotaFromResponse(res.headers);
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
        this._showMsg('Select a task');
        return;
      }

      const essay = AppState.currentExercise.answers?.[this.selectedTaskId] || '';
      if (!essay.trim()) {
        this._showMsg(this._emptyAnswerMsg());
        return;
      }

      // Pre-submit word count validation
      if (typeof WritingValidator !== 'undefined') {
        const range = this._getActiveWordRange();
        const opts = range ? { min: range.min, max: range.max } : {};
        WritingValidator.validateBeforeSubmit(essay, () => {
          this._doEvaluate(essay);
        }, null, opts);
        return;
      }

      this._doEvaluate(essay);
    },

    _doEvaluate: function(essay) {
      const resultsDiv = document.getElementById('writing-type2-ai-results');
      const contentDiv = document.getElementById('writing-type2-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.innerHTML = `<div class="writing-ai-loading"><i class="fas fa-spinner fa-spin"></i> Evaluating...</div>`;

      // Disable textarea and evaluate button during evaluation
      const textarea = document.querySelector('.writing-type2-textarea');
      const evalBtn = document.getElementById('writing-type2-evaluate-btn');
      if (textarea) textarea.disabled = true;
      if (evalBtn) evalBtn.disabled = true;

      const tasks = AppState.currentExercise.content.tasks || [];
      const task = tasks.find(t => t.id === this.selectedTaskId);
      const taskType = task?.type || '';
      const taskPrompt = this._normalizePromptForApi(task?.prompt || '');

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
          if (contentDiv) contentDiv.textContent = 'Error connecting to AI service.';
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
        { id: 'scores', icon: 'fa-chart-bar', label: 'Scores', content: sections.scores },
        { id: 'detailed', icon: 'fa-comment-dots', label: 'Feedback', content: sections.detailed },
        { id: 'strengths', icon: 'fa-check-circle', label: 'Strengths', content: sections.strengths },
        { id: 'improvements', icon: 'fa-exclamation-triangle', label: 'Improvements', content: sections.improvements },
        { id: 'ideal', icon: 'fa-star', label: 'Ideal Response', content: modelAnswer }
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
          ? '<div class="writing-model-answer">' + this._formatPromptBodyHtml(tab.content) + '</div>'
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
      var iconMap = { '📊': 'bar_chart', '📝': 'edit_note', '✅': 'check_circle', '⚠️': 'warning' };
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^(📊 SCORES|📝 DETAILED FEEDBACK|✅ STRENGTHS|⚠️ AREAS FOR IMPROVEMENT)/gm, function(m) {
          var emoji = m.match(/^[^\s]+/)[0];
          var label = m.replace(/^[^\s]+\s*/, '');
          var icon = iconMap[emoji] || 'description';
          return '<h5 class="writing-feedback-heading"><span class="material-symbols-outlined">' + icon + '</span> ' + label + '</h5>';
        })
        .replace(/^• (.+)/gm, '<div class="writing-score-line">$1</div>')
        .replace(/\n/g, '<br>');
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
