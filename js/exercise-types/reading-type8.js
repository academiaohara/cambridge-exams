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
      var bodyHtml;
      if (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.formatB1Reading2NoticeHtml) {
        bodyHtml = ExerciseRenderer.formatB1Reading2NoticeHtml(body, !!AppState.answersChecked);
      } else {
        var escaped = this._b1PreviewEscape(body).replace(/\n/g, '<br>');
        bodyHtml = typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.processEvidenceMarkers
          ? ExerciseRenderer.processEvidenceMarkers(escaped)
          : escaped;
      }
      var html = '<div class="b1-reading2-preview-inner">';
      html += '<span class="b1-reading2-preview-letter">' + letter + '</span>';
      html += '<div class="b1-reading2-preview-text">' + bodyHtml + '</div>';
      html += '</div>';
      el.innerHTML = html;
      el.classList.add('has-text');
    },

    syncB1Reading2ChipsForQuestion: function(qNum) {
      var sel = document.querySelector('.b1-reading2-select[data-qnum="' + qNum + '"]');
      var wrap = document.querySelector('.b1-reading2-picker-wrap[data-qnum="' + qNum + '"]');
      if (!sel || !wrap) return;
      var value = sel.value || '';
      var isDisabled = sel.disabled;
      var selClasses = sel.className.split(/\s+/);
      wrap.querySelectorAll('.b1-reading2-chip').forEach(function(chip) {
        var letter = chip.getAttribute('data-letter');
        var isSelected = letter === value;
        chip.classList.toggle('b1-reading2-chip-selected', isSelected);
        chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        chip.disabled = isDisabled;
        chip.classList.remove(
          'b1-reading2-chip-correct',
          'b1-reading2-chip-incorrect',
          'b1-reading2-chip-unanswered',
          'b1-reading2-chip-expl-show',
          'b1-reading2-chip-answer-toggle-correct'
        );
        if (isDisabled && isSelected) {
          if (selClasses.indexOf('b1-reading2-select-correct') !== -1) {
            chip.classList.add('b1-reading2-chip-correct');
          } else if (selClasses.indexOf('b1-reading2-select-incorrect') !== -1) {
            chip.classList.add('b1-reading2-chip-incorrect');
          } else if (selClasses.indexOf('b1-reading2-select-unanswered') !== -1) {
            chip.classList.add('b1-reading2-chip-unanswered');
          }
        }
        if (isSelected && selClasses.indexOf('b1-reading2-select-expl-show') !== -1) {
          chip.classList.add('b1-reading2-chip-expl-show');
        }
        if (isSelected && selClasses.indexOf('b1-reading2-select-answer-toggle-correct') !== -1) {
          chip.classList.add('b1-reading2-chip-answer-toggle-correct');
        }
      });
    },

    syncAllB1Reading2Chips: function() {
      if (!AppState.currentExercise || !AppState.currentExercise._b1PetReading2Ui) return;
      document.querySelectorAll('.b1-reading2-select[data-qnum]').forEach(function(sel) {
        var qNum = parseInt(sel.getAttribute('data-qnum'), 10);
        if (!isNaN(qNum)) ReadingType8.syncB1Reading2ChipsForQuestion(qNum);
      });
    },

    onB1Reading2ChipClick: function(qNum, letter) {
      if (AppState.answersChecked) return;
      var sel = document.querySelector('.b1-reading2-select[data-qnum="' + qNum + '"]');
      if (!sel || sel.disabled) return;
      var next = sel.value === letter ? '' : letter;
      sel.value = next;
      this.onB1Reading2SelectChange(qNum, next);
      this.syncB1Reading2ChipsForQuestion(qNum);
    },

    initB1Reading2StripIfNeeded: function() {
      if (!AppState.currentExercise || !AppState.currentExercise._b1PetReading2Ui) return;
      var texts = AppState.currentExercise.content.texts || {};
      var answers = AppState.currentExercise.answers || {};
      if (AppState.explanationMode) {
        (AppState.currentExercise.content.questions || []).forEach(function(q) {
          var sel = document.querySelector('.b1-reading2-select[data-qnum="' + q.number + '"]');
          if (sel && q.correct) sel.value = q.correct;
          ReadingType8._setB1Reading2Preview(q.number, '', '');
        });
        this.syncAllB1Reading2Chips();
        return;
      }
      (AppState.currentExercise.content.questions || []).forEach(function(q) {
        var v = answers[q.number];
        if (!v) return;
        var sel = document.querySelector('.b1-reading2-select[data-qnum="' + q.number + '"]');
        if (sel) sel.value = v;
        ReadingType8._setB1Reading2Preview(q.number, v, texts[v]);
      });
      this.syncAllB1Reading2Chips();
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
      
      Object.keys(texts).sort(function(a, b) { return a.localeCompare(b); }).forEach(function(key) {
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
        ReadingType8.syncB1Reading2ChipsForQuestion(qNum);
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
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct++;

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
    },

    /** After check answers, rebuild people strip so notice markup uses post-check classes. */
    reRender: function() {
      if (!AppState.currentExercise || !AppState.currentExercise._b1PetReading2Ui) return;
      var root = document.getElementById('b1-reading2-people-root');
      if (root && typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.renderB1Reading2PeopleCards) {
        root.outerHTML = ExerciseRenderer.renderB1Reading2PeopleCards(AppState.currentExercise);
      }
      if (typeof ReadingType8.initB1Reading2StripIfNeeded === 'function') {
        ReadingType8.initB1Reading2StripIfNeeded();
      }
    },

    /**
     * Footer "Show correct answer" for B1 Reading Part 2: swap the letter selects (and previews)
     * between the student's choices and the key; purple styling while showing the key.
     */
    setAnswerMode: function(mode) {
      if (!AppState.currentExercise || !AppState.currentExercise._b1PetReading2Ui) return;
      var answers = AppState.currentExercise.answers || {};
      var questions = AppState.currentExercise.content.questions || [];
      questions.forEach(function(q) {
        var sel = document.querySelector('.b1-reading2-select[data-qnum="' + q.number + '"]');
        if (!sel) return;
        if (sel.dataset.b1AnsToggleStored === undefined) {
          var fromState = answers[q.number];
          sel.dataset.b1AnsToggleStored = (fromState != null && String(fromState).trim() !== '')
            ? String(fromState).trim()
            : (sel.value || '');
        }
        if (mode === 'correct') {
          if (q.correct) sel.value = q.correct;
          sel.classList.add('b1-reading2-select-answer-toggle-correct');
        } else {
          sel.value = sel.dataset.b1AnsToggleStored || '';
          sel.classList.remove('b1-reading2-select-answer-toggle-correct');
        }
      });
      ReadingType8._refreshB1Reading2PreviewsForAnswerMode(mode);
      this.syncAllB1Reading2Chips();
    },

    _refreshB1Reading2PreviewsForAnswerMode: function(mode) {
      if (!AppState.currentExercise || !AppState.currentExercise._b1PetReading2Ui) return;
      var texts = AppState.currentExercise.content.texts || {};
      var answers = AppState.currentExercise.answers || {};
      (AppState.currentExercise.content.questions || []).forEach(function(q) {
        var letter = '';
        if (mode === 'correct') {
          letter = q.correct ? String(q.correct).trim() : '';
        } else {
          var a = answers[q.number];
          letter = (a != null && String(a).trim() !== '') ? String(a).trim() : '';
        }
        ReadingType8._setB1Reading2Preview(q.number, letter, letter ? texts[letter] : '');
        var prev = document.querySelector('.b1-reading2-preview[data-qpreview="' + q.number + '"]');
        if (prev) {
          prev.classList.toggle('b1-reading2-preview-key-mode', mode === 'correct' && !!letter);
        }
      });
    }
  };
})();
