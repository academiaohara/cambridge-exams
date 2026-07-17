// js/question-nav.js
// Question navigation panel for Reading parts 5-8
(function() {
  window.QuestionNav = {
    currentQNum: null,

    openQuestion: function(qNum) {
      // If in explanation mode, select the question for explanation instead of opening modal
      if (AppState.explanationMode) {
        if (typeof ExerciseHandlers !== 'undefined') {
          ExerciseHandlers.selectExplanationQuestion(qNum);
        }
        return;
      }

      // Listening: no modal; scroll to the rendered question block if present
      if (AppState.currentSection === 'listening') {
        var anchor = document.querySelector('[data-listening-q="' + String(qNum) + '"]');
        if (anchor && typeof anchor.scrollIntoView === 'function') {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }

      if (!AppState.currentExercise) return;

      if (typeof Utils !== 'undefined' && Utils.hasDuoMatchingUi(AppState.currentExercise) &&
          !Utils.isC1Reading8()) {
        if (typeof ExerciseRenderer !== 'undefined') {
          ExerciseRenderer.toggleView(Utils.duoMatchingResultsView(AppState.currentExercise));
        }
        var card = document.querySelector('.b1-reading2-person-card[data-qnum="' + qNum + '"]');
        if (card && typeof card.scrollIntoView === 'function') {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }

      this.currentQNum = qNum;

      const questions = AppState.currentExercise.content.questions || [];
      const question = questions.find(function(q) { return q.number === qNum; });
      if (!question) return;

      // Close tools panel when question nav opens
      if (window.Tools) Tools.closeSidebar();

      const overlay = document.getElementById('question-nav-overlay');
      const body = document.getElementById('question-nav-body');
      if (!overlay || !body) return;

      const isChecked = AppState.answersChecked;
      const userAnswer = (AppState.currentExercise.answers || {})[qNum] || '';
      const part = AppState.currentPart;
      const partConfig = CONFIG.getPartConfig(AppState.currentSection, part);

      body.innerHTML = this._buildContent(question, qNum, isChecked, userAnswer, partConfig);
      this._resetCollapse();
      this._syncPanelVariant();
      overlay.style.display = 'flex';
    },

    openParagraph: function(key) {
      // Do nothing in explanation mode for Part 7 - all explanations shown at once
      if (AppState.explanationMode) return;

      const paragraphs = (AppState.currentExercise && AppState.currentExercise.content && AppState.currentExercise.content.paragraphs) || {};
      const paragraphText = paragraphs[key];
      if (!paragraphText) return;

      // Close tools panel when paragraph nav opens
      if (window.Tools) Tools.closeSidebar();

      const overlay = document.getElementById('question-nav-overlay');
      const body = document.getElementById('question-nav-body');
      if (!overlay || !body) return;

      body.innerHTML = '<div class="qnav-header">' +
        '<span class="qnav-title">' + this._escapeHtml(key) + '</span>' +
        this._headerActionsHtml() +
        '</div>' +
        '<div class="qnav-body"><p class="qnav-question-text">' + this._escapeHtml(ReadingType7._stripBrackets(paragraphText)) + '</p></div>';
      this._resetCollapse();
      this._syncPanelVariant();
      overlay.style.display = 'flex';
    },

    close: function() {
      const overlay = document.getElementById('question-nav-overlay');
      if (overlay) overlay.style.display = 'none';
      this.currentQNum = null;
      this._resetCollapse();
      this._syncPanelVariant(false);
    },

    toggleCollapse: function() {
      var panel = document.querySelector('#question-nav-overlay .question-nav-panel');
      if (!panel) return;
      var collapsed = panel.classList.toggle('qnav-collapsed');
      var btn = panel.querySelector('.qnav-collapse-btn');
      var icon = panel.querySelector('.qnav-collapse-icon');
      if (btn) {
        btn.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel');
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      }
      if (icon) {
        icon.className = collapsed
          ? 'fas fa-chevron-up qnav-collapse-icon'
          : 'fas fa-chevron-down qnav-collapse-icon';
      }
    },

    _resetCollapse: function() {
      var panel = document.querySelector('#question-nav-overlay .question-nav-panel');
      if (!panel) return;
      panel.classList.remove('qnav-collapsed');
      var btn = panel.querySelector('.qnav-collapse-btn');
      var icon = panel.querySelector('.qnav-collapse-icon');
      if (btn) {
        btn.setAttribute('aria-label', 'Collapse panel');
        btn.setAttribute('aria-expanded', 'true');
      }
      if (icon) {
        icon.className = 'fas fa-chevron-down qnav-collapse-icon';
      }
    },

    _isB1Reading4: function() {
      return typeof Utils !== 'undefined' && Utils.isDuoGappedTextReading();
    },

    /** Compact letter-row modal (B1 R4, C1 R7 gapped text; C1 R8 multiple matching). */
    _usesCompactLetterModal: function() {
      if (typeof Utils === 'undefined') return false;
      return Utils.isDuoGappedTextReading() || Utils.isC1Reading8();
    },

    _syncPanelVariant: function(forceOff) {
      var panel = document.querySelector('#question-nav-overlay .question-nav-panel');
      if (!panel) return;
      var useCompact = forceOff === false ? false : this._usesCompactLetterModal();
      panel.classList.toggle('qnav-b1r4', useCompact);
    },

    _headerActionsHtml: function() {
      return '<div class="qnav-header-actions">' +
        '<button type="button" class="qnav-collapse-btn" onclick="QuestionNav.toggleCollapse()" aria-label="Collapse panel" aria-expanded="true">' +
          '<i class="fas fa-chevron-down qnav-collapse-icon"></i>' +
        '</button>' +
        '<button type="button" class="qnav-close-btn" onclick="QuestionNav.close()" aria-label="Close">' +
          '<i class="fas fa-times"></i>' +
        '</button>' +
        '</div>';
    },

    // --- answer handlers ---

    answerPart5: function(qNum, letter) {
      ReadingType5.selectAnswer(qNum, letter);
      // sync radio in questions section if present
      const radio = document.querySelector('input[name="q' + qNum + '"][value="' + letter + '"]');
      if (radio) radio.checked = true;
      this._updateNavCell(qNum);
      this.close();
    },

    answerPart6: function(qNum, letter) {
      ReadingType6.selectAnswer(qNum, letter);
      this._updateNavCell(qNum);
      this.close();
    },

    answerPart7: function(qNum, value) {
      ReadingType7.handleSelect(qNum, value);
      this._updateNavCell(qNum);
      this.close();
    },

    answerPart8: function(qNum, key) {
      ReadingType8.selectAnswer(qNum, key);
      this._updateNavCell(qNum);
      this.close();
    },

    // --- nav cell sync ---

    _updateNavCell: function(qNum) {
      const cell = document.querySelector('.question-nav-cell[data-qnum="' + qNum + '"]');
      if (!cell) return;
      const answer = (AppState.currentExercise && AppState.currentExercise.answers) ? AppState.currentExercise.answers[qNum] : null;
      if (answer) {
        cell.classList.add('answered');
      } else {
        cell.classList.remove('answered');
      }
    },

    _syncNavCellState: function(cell, answer, correct, isChecked, questionType) {
      if (!cell || typeof Utils === 'undefined') return;
      var stateClass = Utils.getQuestionNumberStateClass({
        answer: answer,
        correct: correct,
        isChecked: isChecked,
        questionType: questionType
      });
      Utils.applyQuestionNumberStateClass(cell, stateClass);
    },

    updateAllNavCells: function() {
      var exercise = AppState.currentExercise;
      var content = exercise && exercise.content;
      var questions = (content && content.questions) || [];
      if (!questions.length && content && content.task1 && content.task2) {
        questions = (content.task1.questions || []).concat(content.task2.questions || []);
      }
      var answers = (exercise && exercise.answers) || {};
      var isChecked = AppState.answersChecked;
      var partConfig = typeof CONFIG !== 'undefined' && CONFIG.getPartConfig
        ? CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart)
        : null;
      var questionType = partConfig ? partConfig.type : undefined;
      var hasDualTasks = !!(content && content.task1);
      questions.forEach(function(q) {
        var cell = document.querySelector('.question-nav-cell[data-qnum="' + q.number + '"]');
        if (!cell) return;
        var answer = answers[q.number];
        if (!answer && hasDualTasks) {
          answer = answers['t1_' + q.number] || answers['t2_' + q.number];
        }
        QuestionNav._syncNavCellState(cell, answer, q.correct, isChecked, questionType);
      });
      if (typeof Utils !== 'undefined' && typeof Utils.syncQuestionNumberBadges === 'function') {
        Utils.syncQuestionNumberBadges();
      }
    },

    openReading2Letter: function(letter) {
      if (AppState.explanationMode) return;
      if (typeof Utils === 'undefined' || !Utils.hasDuoMatchingUi(AppState.currentExercise)) return;
      var texts = AppState.currentExercise.content.texts || {};
      var body = texts[letter];
      if (body == null) return;

      if (window.Tools) Tools.closeSidebar();

      var overlay = document.getElementById('question-nav-overlay');
      var bodyEl = document.getElementById('question-nav-body');
      if (!overlay || !bodyEl) return;

      var safeBody = '';
      var raw = String(body).replace(/\r\n/g, '\n');
      if (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.formatB1Reading2NoticeHtml) {
        safeBody = ExerciseRenderer.formatB1Reading2NoticeHtml(raw, !!AppState.answersChecked);
      } else {
        safeBody = this._escapeHtml(raw).replace(/\n/g, '<br>');
      }
      bodyEl.innerHTML =
        '<div class="qnav-header">' +
        '<div class="qnav-header-main">' +
        '<span class="qnav-title">' + this._escapeHtml(letter) + '</span>' +
        '<span class="qnav-question-text qnav-question-text-header">Text ' + this._escapeHtml(letter) + '</span>' +
        '</div>' +
        this._headerActionsHtml() +
        '</div>' +
        '<div class="qnav-body">' +
        '<div class="b1-reading2-letter-modal-card">' +
        '<div class="b1-reading2-letter-modal-text">' + safeBody + '</div></div></div>';
      this._resetCollapse();
      this._syncPanelVariant();
      overlay.style.display = 'flex';
    },

    // --- content builders ---

    _buildContent: function(question, qNum, isChecked, userAnswer, partConfig) {
      var type = partConfig ? partConfig.type : '';
      var inner = '';
      var showHeaderQuestion = type === 'multiple-choice-text' || type === 'cross-text-matching' || type === 'multiple-matching';
      if (type === 'multiple-choice-text') {
        inner = this._buildPart5(question, qNum, isChecked, userAnswer);
      } else if (type === 'cross-text-matching') {
        inner = this._buildPart6(question, qNum, isChecked, userAnswer);
      } else if (type === 'gapped-text') {
        inner = this._buildPart7(question, qNum, isChecked, userAnswer);
      } else if (type === 'multiple-matching') {
        inner = this._buildPart8(question, qNum, isChecked, userAnswer);
      }
      var titleText = showHeaderQuestion ? qNum : 'Question' + ' ' + qNum;
      var headerQuestion = showHeaderQuestion && String(question.question || '').trim() !== ''
        ? '<span class="qnav-question-text qnav-question-text-header">' + this._escapeHtml(question.question) + '</span>'
        : '';
      return '<div class="qnav-header">' +
        '<div class="qnav-header-main">' +
          '<span class="qnav-title">' + titleText + '</span>' +
          headerQuestion +
        '</div>' +
        this._headerActionsHtml() +
        '</div>' +
        '<div class="qnav-body">' + inner + '</div>';
    },

    _buildPart5: function(question, qNum, isChecked, userAnswer) {
      var self = this;
      var html = '<div class="qnav-options">';
      (question.options || []).forEach(function(opt) {
        var letter = opt.charAt(0);
        var text = opt.substring(2).trim();
        var isSelected = userAnswer === letter;
        var cls = 'qnav-option';
        if (isChecked) {
          cls += letter === question.correct ? ' correct' : (isSelected ? ' incorrect' : '');
          cls += ' disabled';
        } else {
          if (isSelected) cls += ' selected';
        }
        var onclick = isChecked ? '' : 'onclick="QuestionNav.answerPart5(' + qNum + ', \'' + letter + '\')"';
        html += '<button class="' + cls + '" ' + onclick + '>' +
          '<span class="qnav-option-letter">' + letter + '</span>' +
          '<span class="qnav-option-text">' + self._escapeHtml(text) + '</span>' +
          '</button>';
      });
      html += '</div>';
      return html;
    },

    _buildPart6: function(question, qNum, isChecked, userAnswer) {
      var html = '<div class="qnav-opts-grid qnav-opts-grid-part8">';
      (question.options || []).forEach(function(opt) {
        var isSelected = userAnswer === opt;
        var cls = 'qnav-opt-btn';
        if (isChecked) {
          cls += opt === question.correct ? ' correct' : (isSelected ? ' incorrect' : '');
          cls += ' disabled';
        } else {
          if (isSelected) cls += ' selected';
        }
        var onclick = isChecked ? '' : 'onclick="QuestionNav.answerPart6(' + qNum + ', \'' + opt + '\')"';
        html += '<button class="' + cls + '" ' + onclick + '>' + opt + '</button>';
      });
      html += '</div>';
      return html;
    },

    _buildPart7: function(question, qNum, isChecked, userAnswer) {
      var paragraphs = (AppState.currentExercise && AppState.currentExercise.content && AppState.currentExercise.content.paragraphs) || {};
      var keys = Object.keys(paragraphs).sort(function(a, b) { return a.localeCompare(b); });
      // Collect letters already used by other questions
      var usedLetters = new Set();
      var answers = (AppState.currentExercise && AppState.currentExercise.answers) || {};
      Object.keys(answers).forEach(function(n) {
        if (parseInt(n, 10) !== qNum && answers[n]) usedLetters.add(answers[n]);
      });
      var gridCls = this._isB1Reading4()
        ? 'qnav-opts-grid qnav-opts-grid-b1r4'
        : 'qnav-opts-grid qnav-opts-grid-part8';
      var html = '<div class="' + gridCls + '">';
      keys.forEach(function(key) {
        var isSelected = userAnswer === key;
        var cls = 'qnav-opt-btn';
        if (isChecked) {
          cls += key === question.correct ? ' correct' : (isSelected ? ' incorrect' : '');
          cls += ' disabled';
        } else {
          if (isSelected) cls += ' selected';
          else if (usedLetters.has(key)) cls += ' used';
        }
        var onclick = isChecked ? '' : 'onclick="QuestionNav.answerPart7(' + qNum + ', \'' + key + '\')"';
        html += '<button class="' + cls + '" ' + onclick + '>' + key + '</button>';
      });
      html += '</div>';
      return html;
    },

    _escapeHtml: function(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    _buildPart8: function(question, qNum, isChecked, userAnswer) {
      var texts = (AppState.currentExercise && AppState.currentExercise.content && AppState.currentExercise.content.texts) || {};
      var keys = Object.keys(texts).sort(function(a, b) { return a.localeCompare(b); });
      var gridCls = this._usesCompactLetterModal()
        ? 'qnav-opts-grid qnav-opts-grid-b1r4'
        : 'qnav-opts-grid qnav-opts-grid-part8';
      var html = '<div class="' + gridCls + '">';
      keys.forEach(function(key) {
        var isSelected = userAnswer === key;
        var cls = 'qnav-opt-btn';
        if (isChecked) {
          cls += key === question.correct ? ' correct' : (isSelected ? ' incorrect' : '');
          cls += ' disabled';
        } else {
          if (isSelected) cls += ' selected';
        }
        var onclick = isChecked ? '' : 'onclick="QuestionNav.answerPart8(' + qNum + ', \'' + key + '\')"';
        html += '<button class="' + cls + '" ' + onclick + '>' + key + '</button>';
      });
      html += '</div>';
      return html;
    }
  };
})();
