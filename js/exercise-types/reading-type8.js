// js/exercise-types/reading-type8.js
// Multiple matching - Part 8

(function() {
  window.ReadingType8 = {
    _b1PreviewEscape: function(text) {
      return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    _setB1Reading2Preview: function(qNum, letter, rawText) {
      var el = document.querySelector('.b1-reading2-preview[data-qpreview="' + qNum + '"]');
      if (!el) return;
      if (!letter) {
        el.innerHTML = '';
        el.classList.remove('has-text');
        return;
      }
      var body = String(rawText || '').replace(/\r\n/g, '\n');
      var html = '<span class="b1-reading2-preview-letter">' + letter + '</span>';
      html += '<div class="b1-reading2-preview-text">' +
        this._b1PreviewEscape(body).replace(/\n/g, '<br>') + '</div>';
      el.innerHTML = html;
      el.classList.add('has-text');
    },

    initB1Reading2StripIfNeeded: function() {
      if (!AppState.currentExercise || !AppState.currentExercise._b1PetReading2Ui) return;
      var texts = AppState.currentExercise.content.texts || {};
      var answers = AppState.currentExercise.answers || {};
      (AppState.currentExercise.content.questions || []).forEach(function(q) {
        var v = answers[q.number];
        if (!v) return;
        var sel = document.querySelector('.b1-reading2-select[data-qnum="' + q.number + '"]');
        if (sel) sel.value = v;
        ReadingType8._setB1Reading2Preview(q.number, v, texts[v]);
      });
    },

    onB1Reading2SelectChange: function(qNum, letter) {
      if (AppState.answersChecked) return;
      this.selectAnswer(qNum, letter || '');
    },

    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      const btnClass = 'gap-box gap-box-small' +
        (userAnswer ? ' answered' : '') +
        (isChecked ? ' checked' : '') +
        (isChecked && userAnswer ? (this.isAnswerCorrect(question, userAnswer) ? ' correct' : ' incorrect') : '');
      
      const displayText = userAnswer || '.........';
      const correctAttr = isChecked && !this.isAnswerCorrect(question, userAnswer)
        ? `data-correct="✓ ${question.correct}"` : '';
      
      return `
        <span class="gap-container">
          <span class="gap-number-outside">${qNum})</span>
          <span class="${btnClass}" ${correctAttr}
                onclick="${!isChecked ? 'ReadingType8.openOptions(' + qNum + ')' : ''}">
            <span class="gap-answer" id="answer-${qNum}">
              <span class="gap-text">${displayText}</span>
            </span>
          </span>
        </span>
      `;
    },
    
    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      // Close tools panel when modal opens
      if (window.Tools) Tools.closeSidebar();
      
      const texts = AppState.currentExercise.content.texts || {};
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      let html = '<div class="reading-gap-modal">';
      html += `<div class="modal-header"><h3>Question ${qNum}</h3><p>Select an option</p></div>`;
      html += '<div class="options-grid">';
      
      Object.keys(texts).forEach(key => {
        html += `
          <button class="opt-btn" onclick="ReadingType8.selectAnswer(${qNum}, '${key}')">
            ${key}
          </button>
        `;
      });
      
      html += '</div></div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },
    
    selectAnswer: function(qNum, letter) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter || '';

      const answerSpan = document.getElementById('answer-' + qNum);
      if (answerSpan) {
        answerSpan.innerHTML = '<span class="gap-text">' + (letter || '.........') + '</span>';
        const gapBox = answerSpan.closest('.gap-box');
        if (gapBox) {
          if (letter) gapBox.classList.add('answered');
          else gapBox.classList.remove('answered');
        }
      }

      if (AppState.currentExercise._b1PetReading2Ui) {
        var sel = document.querySelector('.b1-reading2-select[data-qnum="' + qNum + '"]');
        if (sel && !AppState.answersChecked) {
          sel.value = letter || '';
        }
        var texts = AppState.currentExercise.content.texts || {};
        ReadingType8._setB1Reading2Preview(qNum, letter, letter ? texts[letter] : '');
      }

      var overlay = document.getElementById('exercise-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      const isB1 = AppState.currentExercise._b1PetReading2Ui;

      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct++;

        if (isB1) {
          var row = document.querySelector('.b1-reading2-row[data-qnum="' + q.number + '"]');
          if (row) {
            row.classList.remove('b1-reading2-row-correct', 'b1-reading2-row-incorrect', 'b1-reading2-row-unanswered');
            if (userAnswer) {
              row.classList.add(isCorrect ? 'b1-reading2-row-correct' : 'b1-reading2-row-incorrect');
            } else {
              row.classList.add('b1-reading2-row-unanswered');
            }
          }
        }

        const answerSpan = document.getElementById('answer-' + q.number);
        if (answerSpan) {
          const gapBox = answerSpan.closest('.gap-box');
          if (gapBox) {
            gapBox.classList.add('checked');
            gapBox.classList.add(isCorrect ? 'correct' : 'incorrect');

            if (!isCorrect) {
              gapBox.setAttribute('data-correct', '✓ ' + q.correct);
            }
          }
        }
      });

      return correct;
    }
  };
})();
