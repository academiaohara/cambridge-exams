// js/exercise-types/writing-type1.js
// Essay writing - Writing Part 1

(function() {
  window.WritingType1 = {

    _escapeHtml: function(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    _isB1EmailTask: function(exercise) {
      return !!(exercise && exercise.type === 'email' && exercise.content && exercise.content.b1EmailTask);
    },

    /**
     * Full task text for AI evaluation (B1 email reply or C1/B2 essay prompt).
     * Used by WritingType1 and Exercise._evaluateWritingPart.
     */
    buildTaskPromptForAi: function(exercise) {
      if (!exercise || !exercise.content) return '';
      if (this._isB1EmailTask(exercise)) {
        var t = exercise.content.b1EmailTask;
        var lines = [];
        lines.push(exercise.content.question || '');
        lines.push('');
        lines.push('From: ' + (t.from || ''));
        lines.push('Subject: ' + (t.subject || ''));
        lines.push('');
        lines.push('--- Original email ---');
        lines.push((t.initialEmail || '').replace(/\|\|/g, '\n'));
        lines.push('');
        lines.push('--- Notes you must address in your reply ---');
        (t.notes || []).forEach(function(n) {
          var id = n.id != null && n.id !== '' ? String(n.id) : '';
          lines.push((id ? id + ') ' : '• ') + (n.text || ''));
        });
        return lines.join('\n');
      }
      return exercise.content.question || '';
    },

    _formatB1InitialEmailParagraphHtml: function(para) {
      var self = this;
      var re = /\[(\d+)\]([\s\S]*?)\[\/\1\]/g;
      var out = '';
      var last = 0;
      var m;
      while ((m = re.exec(para)) !== null) {
        out += self._escapeHtml(para.slice(last, m.index));
        out += '<span class="writing-b1-reply-slot"><span class="writing-b1-slot-num">' + self._escapeHtml(m[1]) + '</span>' +
          self._escapeHtml(m[2]) + '</span>';
        last = m.index + m[0].length;
      }
      out += self._escapeHtml(para.slice(last));
      return out;
    },

    _formatB1InitialEmailToHtml: function(raw) {
      if (!raw) return '';
      var parts = String(raw).split('||');
      var self = this;
      return parts.map(function(p) {
        if (!p.trim()) return '';
        return '<p class="writing-b1-email-para">' + self._formatB1InitialEmailParagraphHtml(p) + '</p>';
      }).join('');
    },

    /**
     * Ideal model answer (B1 email): strip [n]…[/n] markers, underline the inner text,
     * and expose the matching handwritten note in a native tooltip (title).
     */
    _formatB1IdealModelAnswerHtml: function(raw, notes) {
      var self = this;
      if (!raw) return '';
      var noteMap = {};
      (notes || []).forEach(function(n) {
        var key = n.id != null && n.id !== '' && n.id !== 0 ? String(n.id) : '';
        if (key) noteMap[key] = n.text || '';
      });
      function escapeAttr(str) {
        return String(str == null ? '' : str)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r?\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      function escapeAndBr(str) {
        return self._escapeHtml(str).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
      }
      var re = /\[(\d+)\]([\s\S]*?)\[\/\1\]/g;
      var out = '';
      var last = 0;
      var m;
      while ((m = re.exec(raw)) !== null) {
        out += escapeAndBr(raw.slice(last, m.index));
        var nid = m[1];
        var noteBody = Object.prototype.hasOwnProperty.call(noteMap, nid) ? noteMap[nid] : '';
        var titleStr = noteBody ? ('Note ' + nid + ': ' + noteBody) : ('Note ' + nid);
        out += '<span class="writing-b1-ideal-note-ref" title="' + escapeAttr(titleStr) + '">' + escapeAndBr(m[2]) + '</span>';
        last = m.index + m[0].length;
      }
      out += escapeAndBr(raw.slice(last));
      return out;
    },

    _buildB1EmailNotesHtml: function(notes) {
      if (!notes || !notes.length) return '';
      var self = this;
      var html = '<div class="writing-b1-notes-hint"><strong>Your notes (respond to each point in your email):</strong><ul class="writing-b1-notes-checklist">';
      notes.forEach(function(n) {
        var label = n.id != null && n.id !== '' && n.id !== 0 ? '<span class="writing-b1-note-pill">' + self._escapeHtml(String(n.id)) + '</span> ' : '';
        html += '<li>' + label + self._escapeHtml(n.text || '') + '</li>';
      });
      html += '</ul></div>';
      return html;
    },

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const isB1Email = this._isB1EmailTask(exercise);
      const question = exercise.content.question || '';
      const level = (typeof AppState !== 'undefined' && AppState.currentLevel) || 'C1';
      const defaultWordLimit = level === 'B2' ? '140-190' : '220-260';
      const wordLimit = exercise.content.wordLimit || defaultWordLimit;
      const savedAnswer = exercise.answers?.[1] || '';
      const notesHtml = isB1Email
        ? this._buildB1EmailNotesHtml(exercise.content.b1EmailTask.notes)
        : this._buildNotesHtml(exercise.content.notes);

      const headingIcon = isB1Email ? 'fa-envelope' : 'fa-pencil-alt';
      const headingText = isB1Email ? 'Write your email' : 'Write your essay';
      const placeholder = isB1Email ? 'Write your email here...' : 'Write your essay...';
      const textareaClass = isB1Email ? 'writing-type1-textarea writing-textarea writing-type1-textarea-b1-email' : 'writing-type1-textarea writing-textarea';

      let promptInner;
      if (isB1Email) {
        const t = exercise.content.b1EmailTask;
        promptInner = `
            <h3><i class="fas ${headingIcon}"></i> ${headingText}</h3>
            <p class="writing-type1-question">${this._escapeHtml(question)}</p>
            <div class="writing-b1-email-meta">
              <div><strong>From:</strong> ${this._escapeHtml(t.from)}</div>
              <div><strong>Subject:</strong> ${this._escapeHtml(t.subject)}</div>
            </div>
            <div class="writing-b1-initial-mail" aria-label="Email you are replying to">
              ${this._formatB1InitialEmailToHtml(t.initialEmail)}
            </div>
            ${notesHtml}
            <div class="writing-type1-word-limit">
              <i class="fas fa-info-circle"></i> ${this._escapeHtml(wordLimit)}
            </div>`;
      } else {
        promptInner = `
            <h3><i class="fas ${headingIcon}"></i> ${headingText}</h3>
            <p class="writing-type1-question">${question}</p>
            ${notesHtml}
            <div class="writing-type1-word-limit">
              <i class="fas fa-info-circle"></i> ${wordLimit} words
            </div>`;
      }

      const html = `
        <div class="writing-type1-wrapper">
          <div class="writing-type1-prompt">
            ${promptInner}
          </div>
          <textarea class="${textareaClass}"
                    lang="en" spellcheck="true"
                    placeholder="${placeholder}"
                    oninput="WritingType1.handleInput(this.value)">${savedAnswer}</textarea>
          <div class="writing-corrected-text" id="writing-type1-corrected" style="display:none;"></div>
          <div class="writing-type1-toolbar">
            <div class="writing-type1-word-count">
              <span id="writing-type1-count">0</span> words written
            </div>
            <button class="btn-copy-clipboard" onclick="WritingType1.copyToClipboard()" title="Copy to clipboard">
              <i class="fas fa-copy"></i><span class="writing-btn-label"> Copy to clipboard</span>
            </button>
            ${AppState.currentMode !== 'exam' ? `<button class="btn-evaluate-ai" id="writing-type1-evaluate-btn" onclick="WritingType1.evaluateWithAI()" title="Evaluate with AI">
              <i class="fas fa-robot"></i><span class="writing-btn-label"> Evaluate with AI</span>
            </button>` : ''}
          </div>
          <div class="writing-inline-msg" id="writing-type1-msg" style="display:none;"></div>
          <div class="writing-type1-ai-results" id="writing-type1-ai-results" style="display:none;">
            <h4><i class="fas fa-star"></i> AI Evaluation</h4>
            <div id="writing-type1-ai-content"></div>
          </div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      wrapper.className = 'writing-type1-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      // Hide standard footer buttons
      const checkBtn = document.querySelector('.btn-check');
      const explBtn = document.querySelector('.btn-explanations');
      if (checkBtn) checkBtn.style.display = 'none';
      if (explBtn) explBtn.style.display = 'none';

      // Update word count for any saved text
      if (savedAnswer) this._updateCount(savedAnswer);

      // Restore AI feedback if previously evaluated
      const savedFeedback = exercise.answers?._aiFeedback;
      if (savedFeedback) {
        const correctedText = this._extractCorrectedText(savedFeedback);
        const correctedDiv = document.getElementById('writing-type1-corrected');
        const textarea = document.querySelector('.writing-type1-textarea');
        if (correctedText && correctedDiv) {
          correctedDiv.innerHTML = this._renderCorrectedText(correctedText);
          correctedDiv.style.display = 'block';
          if (textarea) textarea.style.display = 'none';
        }
        if (textarea) textarea.disabled = true;

        const evalBtn = document.getElementById('writing-type1-evaluate-btn');
        if (evalBtn) evalBtn.disabled = true;

        const resultsDiv = document.getElementById('writing-type1-ai-results');
        const contentDiv = document.getElementById('writing-type1-ai-content');
        if (resultsDiv) resultsDiv.style.display = 'block';
        const feedbackText = savedFeedback.replace(/✏️\s*CORRECTED TEXT\s*\n[\s\S]*?(?=\n📝\s*DETAILED FEEDBACK|\n✅|\n⚠️|$)/i, '');
        if (contentDiv) contentDiv.innerHTML = this._buildFeedbackTabs(feedbackText, 'type1');
      }
    },

    _buildNotesHtml: function(notes) {
      if (!notes || typeof notes !== 'object') return '';
      const topicKey = Object.keys(notes).find(k => k !== 'opinions');
      const topicItems = topicKey ? (notes[topicKey] || []) : [];
      const opinions = notes.opinions || [];
      if (!topicItems.length && !opinions.length) return '';

      const label = topicKey
        ? topicKey.charAt(0).toUpperCase() + topicKey.slice(1)
        : '';

      let html = '<div class="writing-type1-notes">';

      if (topicItems.length) {
        html += `<div class="writing-type1-notes-section">
          <span class="writing-type1-notes-label">${label}:</span>
          <ul class="writing-type1-notes-list">`;
        topicItems.forEach(item => {
          html += `<li>${item}</li>`;
        });
        html += '</ul></div>';
      }

      if (opinions.length) {
        html += `<div class="writing-type1-notes-section">
          <span class="writing-type1-notes-label">Opinions:</span>
          <ul class="writing-type1-notes-list">`;
        opinions.forEach(op => {
          html += `<li>${op}</li>`;
        });
        html += '</ul></div>';
      }

      html += '</div>';
      return html;
    },

    _updateCount: function(text) {
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      const el = document.getElementById('writing-type1-count');
      if (el) {
        el.textContent = count;
        const ex = AppState.currentExercise;
        let cls;
        if (this._isB1EmailTask(ex) && ex.wordRange && typeof ex.wordRange.min === 'number') {
          const mx = typeof ex.wordRange.max === 'number' ? ex.wordRange.max : null;
          cls = typeof WritingValidator !== 'undefined'
            ? WritingValidator.getColorClassForRange(count, ex.wordRange.min, mx)
            : 'wv-green';
        } else if (typeof WritingValidator !== 'undefined') {
          cls = WritingValidator.getColorClass(count);
        } else {
          cls = 'wv-green';
        }
        el.className = 'wv-counter-number ' + cls;
      }
    },

    handleInput: function(value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[1] = value;
      this._updateCount(value);
    },

    _showMsg: function(text) {
      const msg = document.getElementById('writing-type1-msg');
      if (!msg) return;
      msg.textContent = text;
      msg.style.display = 'block';
      clearTimeout(this._msgTimer);
      this._msgTimer = setTimeout(() => { msg.style.display = 'none'; }, 4000);
    },

    copyToClipboard: function() {
      const essay = AppState.currentExercise.answers?.[1] || '';
      const emptyMsg = this._isB1EmailTask(AppState.currentExercise) ? 'Write your email' : 'Write your essay';
      if (!essay.trim()) {
        this._showMsg(emptyMsg);
        return;
      }
      navigator.clipboard.writeText(essay).then(() => {
        this._showMsg('Copied to clipboard!');
      }).catch(() => {
        this._showMsg('Could not copy to clipboard');
      });
    },

    sendWriting: async function(text, taskPrompt, taskType) {
      const tt = taskType || 'Essay';
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, taskType: tt, taskPrompt, examLevel: AppState.currentLevel || 'C1' })
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
      const essay = AppState.currentExercise.answers?.[1] || '';
      const emptyMsg = this._isB1EmailTask(AppState.currentExercise) ? 'Write your email' : 'Write your essay';
      if (!essay.trim()) {
        this._showMsg(emptyMsg);
        return;
      }

      // Pre-submit word count validation
      if (typeof WritingValidator !== 'undefined') {
        const ex = AppState.currentExercise;
        const wr = ex && ex.wordRange;
        const rangeOpts = (this._isB1EmailTask(ex) && wr && typeof wr.min === 'number')
          ? { min: wr.min, max: typeof wr.max === 'number' ? wr.max : undefined }
          : null;
        if (rangeOpts) {
          WritingValidator.validateBeforeSubmit(essay, () => {
            this._doEvaluate(essay);
          }, null, rangeOpts);
        } else {
          WritingValidator.validateBeforeSubmit(essay, () => {
            this._doEvaluate(essay);
          }, null);
        }
        return;
      }

      this._doEvaluate(essay);
    },

    _doEvaluate: function(essay) {
      const resultsDiv = document.getElementById('writing-type1-ai-results');
      const contentDiv = document.getElementById('writing-type1-ai-content');
      if (resultsDiv) resultsDiv.style.display = 'block';
      if (contentDiv) contentDiv.innerHTML = `<div class="writing-ai-loading"><i class="fas fa-spinner fa-spin"></i> Evaluating...</div>`;

      // Disable textarea and evaluate button during evaluation
      const textarea = document.querySelector('.writing-type1-textarea');
      const evalBtn = document.getElementById('writing-type1-evaluate-btn');
      if (textarea) textarea.disabled = true;
      if (evalBtn) evalBtn.disabled = true;

      const taskPrompt = this.buildTaskPromptForAi(AppState.currentExercise);
      const taskType = AppState.currentExercise.type === 'email' ? 'Email' : 'Essay';
      this.sendWriting(essay, taskPrompt, taskType)
        .then(text => {
          // Extract and display corrected text
          const correctedText = this._extractCorrectedText(text);
          const correctedDiv = document.getElementById('writing-type1-corrected');
          if (correctedText && correctedDiv) {
            correctedDiv.innerHTML = this._renderCorrectedText(correctedText);
            correctedDiv.style.display = 'block';
            if (textarea) textarea.style.display = 'none';
          }

          // Save AI feedback for persistence
          AppState.currentExercise.answers._aiFeedback = text;
          AppState.answersChecked = true;

          // Extract score and update display
          const score = this._extractScore(text);
          this._updatePartScore(score);

          // Display feedback in tabs (exclude corrected text section)
          const feedbackText = text.replace(/✏️\s*CORRECTED TEXT\s*\n[\s\S]*?(?=\n📝\s*DETAILED FEEDBACK|\n✅|\n⚠️|$)/i, '');
          if (contentDiv) contentDiv.innerHTML = this._buildFeedbackTabs(feedbackText, 'type1');
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

      // Extract scores section
      const scoresMatch = escaped.match(/📊\s*SCORES\s*\n([\s\S]*?)(?=\n✏️|\n📝|\n✅|\n⚠️|$)/i);
      if (scoresMatch) sections.scores = scoresMatch[1].trim();

      // Extract detailed feedback section
      const detailedMatch = escaped.match(/📝\s*DETAILED FEEDBACK\s*\n([\s\S]*?)(?=\n✅|\n⚠️|$)/i);
      if (detailedMatch) sections.detailed = detailedMatch[1].trim();

      // Extract strengths section
      const strengthsMatch = escaped.match(/✅\s*STRENGTHS\s*\n([\s\S]*?)(?=\n⚠️|$)/i);
      if (strengthsMatch) sections.strengths = strengthsMatch[1].trim();

      // Extract improvements section
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
      return exercise?.content?.modelAnswer || '';
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
        html += `<button class="writing-feedback-tab-btn${i === 0 ? ' active' : ''}" data-tab="${prefix}-${tab.id}" onclick="WritingType1.switchFeedbackTab('${prefix}', '${tab.id}')">
          <i class="fas ${tab.icon}"></i> ${tab.label}
        </button>`;
      });
      html += '</div>';

      const exercise = AppState.currentExercise;
      tabs.forEach((tab, i) => {
        const isIdeal = tab.id === 'ideal';
        const idealB1Email = isIdeal && this._isB1EmailTask(exercise);
        const contentHtml = isIdeal
          ? '<div class="writing-model-answer">' + (idealB1Email
            ? this._formatB1IdealModelAnswerHtml(tab.content, exercise.content.b1EmailTask.notes)
            : tab.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')) + '</div>'
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
