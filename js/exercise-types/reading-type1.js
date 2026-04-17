// js/exercise-types/reading-type1.js
// Multiple choice cloze - Part 1

(function() {
  window.ReadingType1 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return `
          <span class="reading-type1-gap">
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word reading-type1-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(question, userAnswer);
        const answerText = this.getDisplayAnswer(question, userAnswer) || '_____';
        const colorClass = isCorrect ? 'reading-type1-correct' : 'reading-type1-incorrect';
        const correctText = !isCorrect ? this.getCorrectText(question) : '';
        const escapedStudent = String(answerText).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedCorrect = String(this.getCorrectText(question)).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
          <span class="reading-type1-gap" data-student-value="${escapedStudent}" data-correct-value="${escapedCorrect}" data-check-class="${colorClass}">
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word ${colorClass}" ${!isCorrect ? 'data-correct="✓ ' + correctText + '"' : ''}>${answerText}</span>
          </span>
        `;
      }
      
      if (userAnswer) {
        const answerText = this.getDisplayAnswer(question, userAnswer);
        return `
          <span class="reading-type1-gap">
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word reading-type1-purple" onclick="ReadingType1.openOptions(${qNum})">${answerText}</span>
          </span>
        `;
      }
      
      return `
        <span class="reading-type1-gap">
          <span class="reading-type1-gap-number">(${qNum})</span>
          <span class="reading-type1-gap-slot" onclick="ReadingType1.openOptions(${qNum})"></span>
        </span>
      `;
    },
    
    _escapeHtml: function(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _getContextAround: function(text, qNum) {
      if (!text) return { before: '', after: '' };
      var gapMarker = '(' + qNum + ')';
      var paragraphs = text.split('||');
      var targetPara = null;
      for (var i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].indexOf(gapMarker) !== -1) {
          targetPara = paragraphs[i];
          break;
        }
      }
      if (!targetPara) return { before: '', after: '' };
      var gapPos = targetPara.indexOf(gapMarker);
      var beforeText = targetPara.substring(0, gapPos);
      var prevQMatch = beforeText.match(/^[\s\S]*\(\d+\)/);
      if (prevQMatch) {
        beforeText = beforeText.substring(prevQMatch[0].length);
      }
      var afterText = targetPara.substring(gapPos + gapMarker.length);
      var nextQMatch = afterText.match(/\(\d+\)/);
      if (nextQMatch) {
        afterText = afterText.substring(0, nextQMatch.index);
      }
      return { before: this._escapeHtml(beforeText.trim()), after: this._escapeHtml(afterText.trim()) };
    },

    openOptions: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      // Close tools panel when modal opens
      if (window.Tools) Tools.closeSidebar();
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      const ctx = this._getContextAround(AppState.currentExercise.content.text, qNum);

      let optionsHTML = '<div class="modal-header"><div class="modal-header-row"><span class="modal-q-circle">' + qNum + '</span><p>' + 'Select an option' + '</p></div></div>';
      if (ctx.before || ctx.after) {
        optionsHTML += '<div class="rt1-modal-context">';
        if (ctx.before) optionsHTML += '<span class="rt1-modal-context-text">' + ctx.before + '</span> ';
        optionsHTML += '<span class="rt1-modal-context-gap">(' + qNum + ') ..........</span>';
        if (ctx.after) optionsHTML += ' <span class="rt1-modal-context-text">' + ctx.after + '</span>';
        optionsHTML += '</div>';
      }
      optionsHTML += '<div class="options-grid">';
      
      question.options.forEach(opt => {
        const letter = opt.charAt(0);
        const text = opt.substring(2).trim();
        optionsHTML += `
          <button class="opt-btn" onclick="ReadingType1.selectAnswer(${qNum}, '${letter}', '${text.replace(/'/g, "\\'")}')">
            ${text}
          </button>
        `;
      });
      
      optionsHTML += '</div>';
      body.innerHTML = optionsHTML;
      overlay.style.display = 'flex';
    },
    
    selectAnswer: function(qNum, letter, text) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      
      // Re-render the gap in place
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      const gaps = document.querySelectorAll('.reading-type1-gap');
      gaps.forEach(gap => {
        const numSpan = gap.querySelector('.reading-type1-gap-number');
        if (numSpan && numSpan.textContent.trim() === `(${qNum})`) {
          gap.innerHTML = `
            <span class="reading-type1-gap-number">(${qNum})</span>
            <span class="reading-type1-answered-word reading-type1-purple" onclick="ReadingType1.openOptions(${qNum})">${text}</span>
          `;
        }
      });
      
      document.getElementById('exercise-modal-overlay').style.display = 'none';
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },
    
    getCorrectText: function(question) {
      const correctOption = question.options.find(opt => opt.startsWith(question.correct + ')'));
      return correctOption ? correctOption.substring(2).trim() : question.correct;
    },
    
    getDisplayAnswer: function(question, userAnswer) {
      if (!userAnswer) return '';
      const option = question.options.find(opt => opt.startsWith(userAnswer + ')'));
      return option ? option.substring(2).trim() : '';
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct++;
        
        // Update visual state
        const gaps = document.querySelectorAll('.reading-type1-gap');
        gaps.forEach(gap => {
          const numSpan = gap.querySelector('.reading-type1-gap-number');
          if (numSpan && numSpan.textContent.trim() === `(${q.number})`) {
            const answerText = this.getDisplayAnswer(q, userAnswer) || '_____';
            const colorClass = isCorrect ? 'reading-type1-correct' : 'reading-type1-incorrect';
            const correctText = !isCorrect ? this.getCorrectText(q) : '';
            gap.setAttribute('data-student-value', answerText);
            gap.setAttribute('data-correct-value', this.getCorrectText(q));
            gap.setAttribute('data-check-class', colorClass);
            gap.innerHTML = `
              <span class="reading-type1-gap-number">(${q.number})</span>
              <span class="reading-type1-answered-word ${colorClass}" ${!isCorrect ? 'data-correct="✓ ' + correctText + '"' : ''}>${answerText}</span>
            `;
          }
        });
      });
      
      return correct;
    },

    setAnswerMode: function(mode) {
      const self = this;
      const questionsByNumber = {};
      (AppState.currentExercise.content.questions || []).forEach(function(q) { questionsByNumber[q.number] = q; });
      document.querySelectorAll('.reading-type1-gap').forEach(function(gap) {
        const numberEl = gap.querySelector('.reading-type1-gap-number');
        if (!numberEl) return;
        const match = numberEl.textContent.match(/\((\d+)\)/);
        if (!match) return;
        const qNum = parseInt(match[1], 10);
        if (qNum === 0) return;
        const question = questionsByNumber[qNum];
        if (!question) return;
        const studentValue = gap.getAttribute('data-student-value') || '_____';
        // Fallback is needed for restored checked states where data attributes may be missing.
        const correctValue = gap.getAttribute('data-correct-value') || self.getCorrectText(question) || '';
        const checkClass = gap.getAttribute('data-check-class') || 'reading-type1-incorrect';
        const answerEl = gap.querySelector('.reading-type1-answered-word');
        if (!answerEl) return;
        if (mode === 'correct') {
          answerEl.textContent = correctValue;
          answerEl.classList.remove('reading-type1-correct', 'reading-type1-incorrect');
          answerEl.classList.add('reading-type1-show-correct');
          answerEl.removeAttribute('data-correct');
        } else {
          answerEl.textContent = studentValue;
          answerEl.classList.remove('reading-type1-show-correct', 'reading-type1-correct', 'reading-type1-incorrect');
          answerEl.classList.add(checkClass);
          if (checkClass === 'reading-type1-incorrect') {
            answerEl.setAttribute('data-correct', '✓ ' + correctValue);
          } else {
            answerEl.removeAttribute('data-correct');
          }
        }
      });
    }
  };
})();
