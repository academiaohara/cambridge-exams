// js/exercise-types/reading-type4.js
// Key word transformations - Part 4

(function() {
  window.ReadingType4 = {
    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      const beforeGap = question.beforeGap || '';
      const afterGap = question.afterGap || '';
      
      let gapHTML = '';
      if (isChecked) {
        const result = this.evaluateTransformation(userAnswer, question.correct);
        const colorClass = result.score === 2 ? 'reading-type4-correct' : result.score === 1 ? 'reading-type4-partial' : 'reading-type4-incorrect';
        const escapedCorrect = String(question.correct).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const dataAttr = result.score < 2 ? ` data-correct="✓ ${escapedCorrect}"` : '';
        gapHTML = `<span class="reading-type4-inline-wrap ${colorClass}${result.score < 2 ? ' incorrect' : ''}"${dataAttr}>` +
          `<input type="text" class="reading-type4-inline-input gap-input ${colorClass}" data-question="${qNum}" value="${userAnswer || ''}" disabled>` +
          `</span>`;
      } else {
        gapHTML = `<span class="reading-type4-inline-wrap${userAnswer ? ' reading-type4-purple' : ''}">` +
          `<input type="text" class="reading-type4-inline-input gap-input" data-question="${qNum}" value="${userAnswer || ''}" maxlength="100" placeholder="..." oninput="ReadingType4.handleInput(${qNum}, this.value); ReadingType4.resizeInput(this)">` +
          `</span>`;
      }
      
      return `
        <div class="reading-type4-question">
          <div class="reading-type4-original">
            <span class="reading-type4-number">${qNum}.</span> ${question.firstSentence}
          </div>
          <div class="reading-type4-keyword-line">
            <span class="reading-type4-keyword">${question.keyWord}</span>
          </div>
          <div class="reading-type4-second">
            ${beforeGap} ${gapHTML} ${afterGap}
          </div>
        </div>
      `;
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      const wrap = document.querySelector(`input[data-question="${qNum}"]`)?.closest('.reading-type4-inline-wrap');
      if (wrap) {
        if (value.trim()) {
          wrap.classList.add('reading-type4-purple');
        } else {
          wrap.classList.remove('reading-type4-purple');
        }
      }
      
      Timer.updateScoreDisplay();
    },
    
    resizeInput: function(input) {
      const minWidth = 120;
      input.style.width = '0px';
      const newWidth = Math.max(minWidth, input.scrollWidth + 16);
      input.style.width = newWidth + 'px';
    },
    
    _buildPartRegex: function(text) {
      const pattern = text
        .replace(/\((.*?)\)/g, '(?:$1)?')
        .replace(/\//g, '|')
        .replace(/\s+/g, '\\s+');
      return new RegExp(pattern, 'i');
    },
    
    evaluateTransformation: function(userAnswer, officialString) {
      if (!userAnswer || !officialString) return { score: 0, parts: [] };
      
      // Handle array format (legacy)
      if (Array.isArray(officialString)) {
        const normalize = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
        const normalizedUser = normalize(userAnswer);
        const matched = officialString.some(ans => normalizedUser.includes(normalize(ans)));
        return { score: matched ? 2 : 0, parts: [matched] };
      }
      
      if (typeof officialString !== 'string') return { score: 0, parts: [] };
      
      const trimmedAnswer = userAnswer.trim();
      
      // Single-part (no | separator) - full match only
      if (!officialString.includes('|')) {
        const regexTotal = new RegExp(`^${this._buildPartRegex(officialString).source}$`, 'i');
        const matched = regexTotal.test(trimmedAnswer);
        return { score: matched ? 2 : 0, parts: [matched] };
      }
      
      // Two-part scoring with | separator
      const [part1, part2] = officialString.split('|').map(p => p.trim());
      const regexPart1 = new RegExp(`^${this._buildPartRegex(part1).source}`, 'i');
      const regexPart2 = new RegExp(`${this._buildPartRegex(part2).source}$`, 'i');
      const regexTotal = new RegExp(`^${this._buildPartRegex(part1).source}\\s+${this._buildPartRegex(part2).source}$`, 'i');
      
      if (regexTotal.test(trimmedAnswer)) {
        return { score: 2, parts: [true, true] };
      }
      
      let score = 0;
      const parts = [false, false];
      if (regexPart1.test(trimmedAnswer)) {
        score = 1;
        parts[0] = true;
      }
      if (regexPart2.test(trimmedAnswer)) {
        score = 1;
        parts[1] = true;
      }
      
      return { score, parts };
    },
    
    isAnswerCorrect: function(userAnswer, correctAnswer) {
      const result = this.evaluateTransformation(userAnswer, correctAnswer);
      return result.score > 0;
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let totalScore = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const result = this.evaluateTransformation(userAnswer, q.correct);
        totalScore += result.score;
        
        const input = document.querySelector(`.reading-type4-inline-input[data-question="${q.number}"]`);
        if (input) {
          const wrap = input.closest('.reading-type4-inline-wrap');
          const isCorrect = result.score >= 2;
          const isPartial = result.score === 1;
          const colorClass = isCorrect ? 'reading-type4-correct' : isPartial ? 'reading-type4-partial' : 'reading-type4-incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          if (!isCorrect) {
            const secondDiv = input.closest('.reading-type4-second');
            // Remove any leftover correction text elements
            secondDiv && secondDiv.querySelectorAll('.reading-type4-correction-text').forEach(el => el.remove());
          }
          if (wrap) {
            wrap.classList.remove('reading-type4-purple');
            wrap.classList.add(colorClass);
            if (!isCorrect) {
              wrap.classList.add('incorrect');
              const escapedCorrect = String(q.correct).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              wrap.setAttribute('data-correct', '✓ ' + escapedCorrect);
            }
          }
        }
      });
      
      return totalScore;
    }
  };
})();
