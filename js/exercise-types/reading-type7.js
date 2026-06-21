// js/exercise-types/reading-type7.js
// Gapped text - Part 7

(function() {
  window.ReadingType7 = {
    renderGap: function(question, qNum, isChecked, userAnswer, isInline) {
      if (qNum === 0) {
        return `
          <span class="reading-type7-gap">
            <span class="reading-type7-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      const paragraphs = AppState.currentExercise.content.paragraphs || {};
      const inlineClass = isInline ? ' reading-type7-gap--inline' : '';
      const inlineAttr = isInline ? ' data-inline="true"' : '';
      
      if (isChecked) {
        var showCorrectOnly = typeof AppState !== 'undefined' && AppState.answerViewMode === 'correct';
        var isCorrect = showCorrectOnly ? true : this.isAnswerCorrect(question, userAnswer);
        var displayLetter = showCorrectOnly ? (question.correct || '') : userAnswer;
        var chosenText = displayLetter ? (paragraphs[displayLetter] || '') : '';

        var pillClass;
        if (showCorrectOnly) {
          pillClass = 'reading-type7-gap-pill rt7-pill-show-correct';
        } else {
          pillClass = isCorrect ? 'reading-type7-gap-pill correct' : 'reading-type7-gap-pill incorrect';
        }

        let html = `<span class="reading-type7-gap${inlineClass}" data-qnum="${qNum}"${inlineAttr}>`;
        html += `<span class="reading-type7-gap-check-row">`;
        html += ReadingType7._renderCheckedPillHtml(pillClass, qNum, displayLetter);
        var hideRevealBtn = typeof Utils !== 'undefined' && Utils.isDuoGappedTextReading();
        if (!showCorrectOnly && !isCorrect && userAnswer && !hideRevealBtn) {
          html += `<button class="reading-type7-reveal-btn" onclick="ReadingType7.toggleReveal(${qNum}, this)" data-revealed="false">`;
          html += `<i class="fas fa-eye"></i>`;
          html += `<span class="reading-type7-correct-circle">${question.correct}</span>`;
          html += `</button>`;
        }
        html += `</span>`;
        if (displayLetter) {
          var blockClass = showCorrectOnly
            ? 'reading-type7-answer-block rt7-show-correct'
            : 'reading-type7-answer-block ' + (isCorrect ? 'correct' : 'incorrect');
          html += `<span class="${blockClass}" data-qnum-block="${qNum}">`;
          html += `<span class="reading-type7-para-text">${this._formatParaText(chosenText)}</span>`;
          html += `</span>`;
        }
        html += `</span>`;
        return html;
      }
      
      const paraText = userAnswer ? (paragraphs[userAnswer] || '') : '';
      
      return `
        <span class="reading-type7-gap${inlineClass}" data-qnum="${qNum}"${inlineAttr}>
          <span class="reading-type7-gap-pill${userAnswer ? ' has-value' : ''}"
                onclick="QuestionNav.openQuestion(${qNum})">
            <span class="reading-type7-gap-num">${qNum}</span>
            <span class="reading-type7-gap-circle">${userAnswer || '?'}</span>
          </span>
          ${userAnswer ? `<span class="reading-type7-selected-text">${this._formatParaText(paraText)}</span>` : ''}
        </span>
      `;
    },
    
    openSelectModal: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      if (window.Tools) Tools.closeSidebar();
      
      const paragraphs = AppState.currentExercise.content.paragraphs || {};
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      if (!overlay || !body) return;
      
      // Collect letters already used by other questions
      const usedLetters = new Set();
      const answers = AppState.currentExercise.answers || {};
      Object.entries(answers).forEach(function(entry) {
        const n = parseInt(entry[0], 10);
        if (n !== qNum && entry[1]) usedLetters.add(entry[1]);
      });
      
      let html = '<div class="reading-gap-modal">';
      html += '<div class="modal-header"><div class="modal-header-row"><span class="modal-q-circle">' + parseInt(qNum, 10) + '</span></div></div>';
      html += '<div class="options-grid-type7">';
      Object.keys(paragraphs).sort(function(a, b) { return a.localeCompare(b); }).forEach(key => {
        const usedClass = usedLetters.has(key) ? ' opt-btn-used' : '';
        html += `<button class="opt-btn opt-btn-letter${usedClass}" onclick="ReadingType7.selectFromModal(${qNum}, '${key}')">${this._escapeHtml(key)}</button>`;
      });
      html += '</div></div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },
    
    selectFromModal: function(qNum, key) {
      const overlay = document.getElementById('exercise-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      ReadingType7.handleSelect(qNum, key);
    },

    _refreshSingleGapDom: function(qNum, value) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      const gap = document.querySelector('.reading-type7-gap[data-qnum="' + qNum + '"]');
      if (gap && question) {
        const isInline = gap.dataset.inline === 'true';
        const isChecked = AppState.answersChecked;
        gap.outerHTML = ReadingType7.renderGap(question, qNum, isChecked, value || '', isInline);
      }
    },

    refreshParagraphToggleDOM: function() {
      const el = document.getElementById('reading-type7-paragraph-toggle');
      if (!el || typeof ExerciseRenderer === 'undefined') return;
      const partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      el.innerHTML = ExerciseRenderer.renderGappedTextParagraphToggleInner(AppState.currentExercise, partConfig);
    },
    
    toggleReveal: function(qNum, btn) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      const paragraphs = AppState.currentExercise.content.paragraphs || {};
      const userAnswer = AppState.currentExercise.answers?.[qNum] || '';
      const block = document.querySelector(`.reading-type7-answer-block[data-qnum-block="${qNum}"]`);
      if (!block) return;
      
      const isRevealed = btn.dataset.revealed === 'true';
      if (!isRevealed) {
        const correctText = paragraphs[question.correct] || '';
        block.className = 'reading-type7-answer-block rt7-show-correct';
        block.innerHTML = `<span class="reading-type7-para-text">${ReadingType7._formatParaText(correctText)}</span>`;
        btn.dataset.revealed = 'true';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fas fa-eye-slash';
      } else {
        const chosenText = userAnswer ? (paragraphs[userAnswer] || '') : '';
        block.className = 'reading-type7-answer-block incorrect';
        block.innerHTML = userAnswer
          ? `<span class="reading-type7-para-text">${ReadingType7._formatParaText(chosenText)}</span>`
          : `<span class="reading-type7-para-empty">—</span>`;
        btn.dataset.revealed = 'false';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fas fa-eye';
      }
    },
    
    handleSelect: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      const answers = AppState.currentExercise.answers;
      if (value) {
        Object.keys(answers).forEach(function(n) {
          const ni = parseInt(n, 10);
          if (ni !== qNum && answers[n] === value) {
            answers[n] = '';
            ReadingType7._refreshSingleGapDom(ni, '');
          }
        });
      }
      answers[qNum] = value;
      ReadingType7._refreshSingleGapDom(qNum, value);
      ReadingType7.refreshParagraphToggleDOM();
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },
    
    _escapeHtml: function(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    _stripBrackets: function(text) {
      return String(text || '').replace(/\[\/?(\d+)\]/g, '');
    },

    _isB1GappedText: function() {
      return typeof Utils !== 'undefined' && Utils.isDuoGappedTextReading();
    },

    _renderCheckedPillHtml: function(pillClass, qNum, letter) {
      var display = letter || '—';
      if (ReadingType7._isB1GappedText()) {
        return '<span class="' + pillClass + '">' +
          '<span class="reading-type7-gap-circle"><span class="reading-type7-gap-num">' + qNum + '</span></span>' +
          '<span class="reading-type7-gap-letter">' + display + '</span>' +
          '</span>';
      }
      return '<span class="' + pillClass + '">' +
        '<span class="reading-type7-gap-num">' + qNum + '</span>' +
        '<span class="reading-type7-gap-circle">' + display + '</span>' +
        '</span>';
    },

    _formatParaText: function(text) {
      var stripped = this._stripBrackets(text);
      if (typeof ExerciseRenderer !== 'undefined' && ExerciseRenderer.formatReadingPassageText) {
        return ExerciseRenderer.formatReadingPassageText(stripped);
      }
      return this._escapeHtml(stripped);
    },

    _applyGapExplanationMode: function(gap, q, paragraphs) {
      var pill = gap.querySelector('.reading-type7-gap-pill');
      if (pill) {
        pill.dataset.origClass = pill.className;
        pill.className = 'reading-type7-gap-pill rt7-pill-show-correct';
        var letterEl = pill.querySelector('.reading-type7-gap-letter');
        if (letterEl) {
          letterEl.dataset.origText = letterEl.textContent;
          letterEl.textContent = q.correct;
        } else {
          var circle = pill.querySelector('.reading-type7-gap-circle');
          if (circle) {
            circle.dataset.origText = circle.textContent;
            circle.textContent = q.correct;
          }
        }
      }

      var correctText = paragraphs[q.correct] || '';
      var paraBlock = gap.querySelector('.reading-type7-answer-block:not(.reading-type7-explanation-block)');
      if (paraBlock) {
        paraBlock.dataset.origClass = paraBlock.className;
        paraBlock.dataset.origInner = paraBlock.innerHTML;
        paraBlock.className = 'reading-type7-answer-block rt7-show-correct rt7-explanation';
        paraBlock.style.display = '';
        paraBlock.innerHTML = '<span class="reading-type7-para-text">' +
          ExerciseRenderer.processEvidenceMarkers(ReadingType7._formatParaText(correctText)) + '</span>';
      } else {
        gap.querySelectorAll('.reading-type7-explanation-block').forEach(function(el) { el.remove(); });
        var revealBtn = gap.querySelector('.reading-type7-reveal-btn');
        if (revealBtn) revealBtn.style.display = 'none';
        var explanationBlock = document.createElement('span');
        explanationBlock.className = 'reading-type7-answer-block reading-type7-explanation-block rt7-explanation';
        explanationBlock.innerHTML = '<span class="reading-type7-para-text">' +
          ExerciseRenderer.processEvidenceMarkers(ReadingType7._formatParaText(correctText)) + '</span>';
        gap.appendChild(explanationBlock);
      }
    },

    _applyParagraphToggleExplanationMode: function() {
      var el = document.getElementById('reading-type7-paragraph-toggle');
      if (!el || el.dataset.rt7ExplMode === '1') return;
      el.dataset.rt7ExplMode = '1';
      el.classList.add('explanation-mode-text');

      var questions = AppState.currentExercise.content.questions || [];
      var paragraphs = AppState.currentExercise.content.paragraphs || {};
      var correctByLetter = {};
      questions.forEach(function(q) {
        if (q.correct) correctByLetter[q.correct] = q;
      });

      el.querySelectorAll('.reading-type7-toggle-card').forEach(function(card) {
        var letter = card.getAttribute('data-letter');
        var q = correctByLetter[letter];
        if (!q) return;

        card.dataset.rt7ExplOrigClass = card.className;
        card.className = card.className
          .replace(/\s*reading-type7-toggle-card-(correct|incorrect|unused)\b/g, '')
          .replace(/\s*reading-type7-toggle-card-show-correct\b/g, '')
          .trim() + ' reading-type7-toggle-card-show-correct';

        var body = card.querySelector('.reading-type7-toggle-card-body');
        if (body) {
          body.dataset.rt7ExplOrigInner = body.innerHTML;
          var raw = paragraphs[letter] || '';
          body.innerHTML = ExerciseRenderer.processEvidenceMarkers(
            ReadingType7._formatParaText(raw).replace(/\n/g, '<br>')
          );
        }

        var btn = card.querySelector('.reading-type7-toggle-gapbtn[data-qnum="' + q.number + '"]');
        if (btn) {
          btn.dataset.rt7ExplOrigClass = btn.className;
          btn.className = 'reading-type7-toggle-gapbtn checked rt7-gapbtn-show-correct';
        }
      });
    },

    _removeParagraphToggleExplanationMode: function() {
      var el = document.getElementById('reading-type7-paragraph-toggle');
      if (!el || el.dataset.rt7ExplMode !== '1') return;
      delete el.dataset.rt7ExplMode;
      el.classList.remove('explanation-mode-text');

      el.querySelectorAll('.reading-type7-toggle-card').forEach(function(card) {
        if (card.dataset.rt7ExplOrigClass) {
          card.className = card.dataset.rt7ExplOrigClass;
          delete card.dataset.rt7ExplOrigClass;
        }
        var body = card.querySelector('.reading-type7-toggle-card-body');
        if (body && body.dataset.rt7ExplOrigInner) {
          body.innerHTML = body.dataset.rt7ExplOrigInner;
          delete body.dataset.rt7ExplOrigInner;
        }
      });

      el.querySelectorAll('.reading-type7-toggle-gapbtn').forEach(function(btn) {
        if (btn.dataset.rt7ExplOrigClass) {
          btn.className = btn.dataset.rt7ExplOrigClass;
          delete btn.dataset.rt7ExplOrigClass;
        }
      });
    },

    applyExplanationMode: function() {
      var questions = AppState.currentExercise.content.questions || [];
      var paragraphs = AppState.currentExercise.content.paragraphs || {};

      questions.forEach(function(q) {
        var gap = document.querySelector('.reading-type7-gap[data-qnum="' + q.number + '"]');
        if (!gap || gap.dataset.rt7ExplMode === '1') return;
        gap.dataset.rt7ExplMode = '1';
        ReadingType7._applyGapExplanationMode(gap, q, paragraphs);
      });

      ReadingType7._applyParagraphToggleExplanationMode();
    },

    removeExplanationMode: function() {
      var questions = AppState.currentExercise.content.questions || [];

      questions.forEach(function(q) {
        var gap = document.querySelector('.reading-type7-gap[data-qnum="' + q.number + '"]');
        if (!gap || gap.dataset.rt7ExplMode !== '1') return;
        delete gap.dataset.rt7ExplMode;

        var pill = gap.querySelector('.reading-type7-gap-pill');
        if (pill && pill.dataset.origClass) {
          pill.className = pill.dataset.origClass;
          delete pill.dataset.origClass;
          var letterEl = pill.querySelector('.reading-type7-gap-letter');
          if (letterEl && letterEl.dataset.origText != null) {
            letterEl.textContent = letterEl.dataset.origText;
            delete letterEl.dataset.origText;
          } else {
            var circle = pill.querySelector('.reading-type7-gap-circle');
            if (circle && circle.dataset.origText != null) {
              circle.textContent = circle.dataset.origText;
              delete circle.dataset.origText;
            }
          }
        }

        var paraBlock = gap.querySelector('.reading-type7-answer-block:not(.reading-type7-explanation-block)');
        if (paraBlock && paraBlock.dataset.origClass) {
          paraBlock.className = paraBlock.dataset.origClass;
          if (paraBlock.dataset.origInner) {
            paraBlock.innerHTML = paraBlock.dataset.origInner;
          }
          delete paraBlock.dataset.origClass;
          delete paraBlock.dataset.origInner;
        }
        gap.querySelectorAll('.reading-type7-explanation-block').forEach(function(el) {
          el.remove();
        });
        var revealBtn = gap.querySelector('.reading-type7-reveal-btn');
        if (revealBtn) revealBtn.style.display = '';
      });

      ReadingType7._removeParagraphToggleExplanationMode();
    },

    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct += (AppState.currentExercise && AppState.currentExercise._b1PetScoring) ? 1 : 2;
        
        // Update gap display in the text section (pill design)
        const gap = document.querySelector(`.reading-type7-gap[data-qnum="${q.number}"]`);
        if (gap) {
          const isInline = gap.dataset.inline === 'true';
          gap.outerHTML = ReadingType7.renderGap(q, q.number, true, userAnswer || '', isInline);
        }
        
      });

      ReadingType7.refreshParagraphToggleDOM();

      return correct;
    },

    /**
     * After checking answers, "Show correct answer" swaps the passage and sentence cards to the key + text in purple.
     */
    setAnswerMode: function(mode) {
      if (!AppState.currentExercise || !AppState.answersChecked) return;
      var questions = AppState.currentExercise.content.questions || [];
      questions.forEach(function(q) {
        if (!q || q.number === 0) return;
        var gap = document.querySelector('.reading-type7-gap[data-qnum="' + q.number + '"]');
        if (!gap) return;
        var isInline = gap.dataset.inline === 'true';
        var ua = (AppState.currentExercise.answers && AppState.currentExercise.answers[q.number]) || '';
        var display = mode === 'correct' ? (q.correct || '') : ua;
        gap.outerHTML = ReadingType7.renderGap(q, q.number, true, display, isInline);
      });
      ReadingType7.refreshParagraphToggleDOM();
    }
  };
})();
