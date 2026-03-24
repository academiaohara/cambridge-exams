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

      // For listening, nav cells are for display only (no modal)
      if (AppState.currentSection === 'listening') return;

      if (!AppState.currentExercise) return;
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
        '<button class="qnav-close-btn" onclick="QuestionNav.close()">' +
          '<i class="fas fa-times"></i>' +
        '</button>' +
        '</div>' +
        '<div class="qnav-body"><p class="qnav-question-text">' + this._escapeHtml(ReadingType7._stripBrackets(paragraphText)) + '</p></div>';
      overlay.style.display = 'flex';
    },

    close: function() {
      const overlay = document.getElementById('question-nav-overlay');
      if (overlay) overlay.style.display = 'none';
      this.currentQNum = null;
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

    updateAllNavCells: function() {
      var questions = (AppState.currentExercise && AppState.currentExercise.content && AppState.currentExercise.content.questions) || [];
      var answers = (AppState.currentExercise && AppState.currentExercise.answers) || {};
      var isChecked = AppState.answersChecked;
      questions.forEach(function(q) {
        var cell = document.querySelector('.question-nav-cell[data-qnum="' + q.number + '"]');
        if (!cell) return;
        var answer = answers[q.number];
        cell.classList.toggle('answered', !!answer && !isChecked);
        cell.classList.toggle('correct', !!(isChecked && answer && answer === q.correct));
        cell.classList.toggle('incorrect', !!(isChecked && answer && answer !== q.correct));
        cell.classList.toggle('unanswered-checked', !!(isChecked && !answer));
      });
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
      var headerQuestion = showHeaderQuestion
        ? '<span class="qnav-question-text qnav-question-text-header">' + this._escapeHtml(question.question) + '</span>'
        : '';
      return '<div class="qnav-header">' +
        '<div class="qnav-header-main">' +
          '<span class="qnav-title">' + titleText + '</span>' +
          headerQuestion +
        '</div>' +
        '<button class="qnav-close-btn" onclick="QuestionNav.close()">' +
          '<i class="fas fa-times"></i>' +
        '</button>' +
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
      var keys = Object.keys(paragraphs);
      // Collect letters already used by other questions
      var usedLetters = new Set();
      var answers = (AppState.currentExercise && AppState.currentExercise.answers) || {};
      Object.keys(answers).forEach(function(n) {
        if (parseInt(n, 10) !== qNum && answers[n]) usedLetters.add(answers[n]);
      });
      var html = '<div class="qnav-opts-grid qnav-opts-grid-part8">';
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
      var keys = ['A', 'B', 'C', 'D'].filter(function(key) {
        return Object.prototype.hasOwnProperty.call(texts, key);
      });
      var html = '<div class="qnav-opts-grid qnav-opts-grid-part8">';
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
