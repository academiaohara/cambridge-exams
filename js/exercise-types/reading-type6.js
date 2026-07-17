// js/exercise-types/reading-type6.js
// Cross-text multiple matching - Part 6

(function() {
  window.ReadingType6 = {
    _isDuoCrossText: function() {
      return typeof Utils !== 'undefined' && Utils.isDuoCrossTextReading();
    },

    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      if (this._isDuoCrossText()) {
        return this.renderDuoQuestionCard(question, qNum, isChecked, userAnswer);
      }

      const btnClass = 'gap-box gap-box-small' +
        (userAnswer ? ' answered' : '') +
        (isChecked ? ' checked' : '') +
        (isChecked && userAnswer ? (this.isAnswerCorrect(question, userAnswer) ? ' correct' : ' incorrect') : '');

      const displayText = userAnswer || '.........';
      const correctAttr = isChecked && !this.isAnswerCorrect(question, userAnswer)
        ? `data-correct="${question.correct}"` : '';

      return `
        <span class="gap-container">
          <span class="gap-number-outside">${qNum})</span>
          <span class="${btnClass}" ${correctAttr}
                onclick="${!isChecked ? 'ReadingType6.openOptions(' + qNum + ')' : ''}">
            <span class="gap-answer" id="answer-${qNum}">
              <span class="gap-text">${displayText}</span>
            </span>
          </span>
        </span>
      `;
    },

    renderDuoQuestionCard: function(question, qNum, isChecked, userAnswer) {
      const options = question.options || ['A', 'B', 'C', 'D'];
      let badgeCls = 'c1-reading6-q-badge';
      if (isChecked) {
        if (!userAnswer) badgeCls += ' c1-reading6-q-badge-unanswered';
        else if (this.isAnswerCorrect(question, userAnswer)) badgeCls += ' c1-reading6-q-badge-correct';
        else badgeCls += ' c1-reading6-q-badge-incorrect';
      }

      let html = '<div class="c1-reading6-question-card" data-qnum="' + qNum + '">';
      html += '<div class="c1-reading6-question-header">';
      html += '<span class="' + badgeCls + '">' + qNum + '</span>';
      html += '<div class="c1-reading6-question-text">' + question.question + '</div>';
      html += '</div>';
      html += '<div class="c1-reading6-picker-wrap" data-qnum="' + qNum + '">';
      html += '<span class="c1-reading6-picker-label">Expert</span>';
      html += '<div class="c1-reading6-chips">';

      options.forEach(function(opt) {
        const isSelected = userAnswer === opt;
        let chipCls = 'c1-reading6-chip';
        if (isSelected) chipCls += ' c1-reading6-chip-selected';
        if (isChecked) {
          if (!userAnswer && isSelected) {
            chipCls += ' c1-reading6-chip-unanswered';
          } else if (isSelected) {
            chipCls += userAnswer === question.correct
              ? ' c1-reading6-chip-correct'
              : ' c1-reading6-chip-incorrect';
          } else if (opt === question.correct && userAnswer !== question.correct) {
            chipCls += ' c1-reading6-chip-key';
          }
        }
        const disabled = isChecked ? ' disabled' : '';
        const pressed = isSelected ? 'true' : 'false';
        html += '<button type="button" class="' + chipCls + '" data-letter="' + opt + '" aria-pressed="' + pressed + '"' + disabled +
          ' onclick="ReadingType6.onChipClick(' + qNum + ', \'' + opt + '\')">' + opt + '</button>';
      });

      html += '</div></div>';

      var texts = (AppState.currentExercise && AppState.currentExercise.content &&
        AppState.currentExercise.content.texts) || {};
      var solKey = question.correct ? String(question.correct).trim().toUpperCase().charAt(0) : '';
      var solRaw = solKey && texts[solKey] != null ? texts[solKey] : '';
      if (solRaw) {
        var bodyHtml = typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.processEvidenceMarkers
          ? ExerciseRenderer.processEvidenceMarkers(String(solRaw))
          : String(solRaw);
        html += '<div class="b1-reading2-solution-expl c1-reading6-solution-expl" data-qnum="' + qNum +
          '" data-sol-letter="' + solKey + '">';
        html += '<div class="reading-type6-text-content">' + bodyHtml + '</div>';
        html += '</div>';
      }

      html += '</div>';
      return html;
    },

    applyExplanationMode: function() {
      if (!this._isDuoCrossText()) return;
      (AppState.currentExercise.content.questions || []).forEach(function(q) {
        var wrap = document.querySelector('.c1-reading6-picker-wrap[data-qnum="' + q.number + '"]');
        if (!wrap || !q.correct) return;
        wrap.querySelectorAll('.c1-reading6-chip').forEach(function(chip) {
          var letter = chip.getAttribute('data-letter');
          var isCorrect = letter === q.correct;
          if (chip.dataset.r6ExplPrevSelected === undefined) {
            chip.dataset.r6ExplPrevSelected = chip.classList.contains('c1-reading6-chip-selected') ? '1' : '0';
          }
          chip.classList.toggle('c1-reading6-chip-selected', isCorrect);
          chip.classList.toggle('c1-reading6-chip-expl-show', isCorrect);
          chip.setAttribute('aria-pressed', isCorrect ? 'true' : 'false');
        });
      });
    },

    removeExplanationMode: function() {
      if (!this._isDuoCrossText()) return;
      var answers = AppState.currentExercise.answers || {};
      (AppState.currentExercise.content.questions || []).forEach(function(q) {
        var wrap = document.querySelector('.c1-reading6-picker-wrap[data-qnum="' + q.number + '"]');
        if (!wrap) return;
        var userAnswer = answers[q.number] || '';
        wrap.querySelectorAll('.c1-reading6-chip').forEach(function(chip) {
          var letter = chip.getAttribute('data-letter');
          chip.classList.remove('c1-reading6-chip-expl-show');
          if (chip.dataset.r6ExplPrevSelected !== undefined) {
            var wasSelected = chip.dataset.r6ExplPrevSelected === '1';
            chip.classList.toggle('c1-reading6-chip-selected', wasSelected);
            chip.setAttribute('aria-pressed', wasSelected ? 'true' : 'false');
            delete chip.dataset.r6ExplPrevSelected;
          } else {
            var isSelected = letter === userAnswer;
            chip.classList.toggle('c1-reading6-chip-selected', isSelected);
            chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          }
        });
      });
    },

    onChipClick: function(qNum, letter) {
      if (AppState.answersChecked) return;
      const current = AppState.currentExercise.answers && AppState.currentExercise.answers[qNum];
      const next = current === letter ? '' : letter;
      this.selectAnswer(qNum, next);
    },

    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;

      if (window.Tools) Tools.closeSidebar();

      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');

      let html = '<div class="reading-gap-modal">';
      html += `<div class="modal-header"><h3>Question ${qNum}</h3><p>Select an option</p></div>`;
      html += '<div class="options-grid">';

      question.options.forEach(opt => {
        html += `
          <button class="opt-btn" onclick="ReadingType6.selectAnswer(${qNum}, '${opt}')">
            ${opt}
          </button>
        `;
      });

      html += '</div></div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },

    selectAnswer: function(qNum, letter) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;

      if (this._isDuoCrossText()) {
        this.syncDuoQuestionCard(qNum);
        Timer.updateScoreDisplay();
        return;
      }

      const answerSpan = document.getElementById(`answer-${qNum}`);
      if (answerSpan) {
        answerSpan.innerHTML = `<span class="gap-text">${letter}</span>`;
        const gapBox = answerSpan.closest('.gap-box');
        if (gapBox) gapBox.classList.add('answered');
      }

      document.getElementById('exercise-modal-overlay').style.display = 'none';
      Timer.updateScoreDisplay();
    },

    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },

    syncDuoQuestionCard: function(qNum) {
      var questions = AppState.currentExercise.content.questions || [];
      var q = questions.find(function(x) { return x.number === qNum; });
      if (!q) return;
      var card = document.querySelector('.c1-reading6-question-card[data-qnum="' + qNum + '"]');
      if (!card) return;
      var userAnswer = (AppState.currentExercise.answers && AppState.currentExercise.answers[qNum]) || '';
      card.outerHTML = this.renderDuoQuestionCard(q, qNum, !!AppState.answersChecked, userAnswer);
    },

    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;

      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct += (AppState.currentExercise && AppState.currentExercise._b1PetScoring) ? 1 : 2;

        if (!this._isDuoCrossText()) {
          const answerSpan = document.getElementById(`answer-${q.number}`);
          if (answerSpan) {
            const gapBox = answerSpan.closest('.gap-box');
            if (gapBox) {
              gapBox.classList.add('checked');
              gapBox.classList.add(isCorrect ? 'correct' : 'incorrect');

              if (!isCorrect) {
                gapBox.setAttribute('data-correct', q.correct);
              }
            }
          }
        }
      });

      return correct;
    },

    reRender: function() {
      if (!this._isDuoCrossText()) return;
      var section = document.getElementById('toggle-questions-section');
      if (!section || typeof ExerciseRenderer === 'undefined') return;
      var partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      section.innerHTML = ExerciseRenderer.renderToggleQuestions(AppState.currentExercise, partConfig);
    }
  };
})();
