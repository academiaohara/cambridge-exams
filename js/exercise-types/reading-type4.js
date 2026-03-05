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
        const colorClass = result.score > 0 ? 'reading-type4-correct' : 'reading-type4-incorrect';
        const correctionHtml = result.score < 2 ? `<span class="reading-type4-correction-text" title="✓ ${question.correct}">${question.correct}</span>` : '';
        gapHTML = `<span class="reading-type4-inline-wrap ${colorClass}">` +
          `<input type="text" class="reading-type4-inline-input gap-input ${colorClass}" data-question="${qNum}" value="${userAnswer || ''}" disabled>` +
          `</span>` + correctionHtml;
      } else {
        gapHTML = `<span class="reading-type4-inline-wrap${userAnswer ? ' reading-type4-purple' : ''}">` +
          `<input type="text" class="reading-type4-inline-input gap-input" data-question="${qNum}" value="${userAnswer || ''}" placeholder="..." oninput="ReadingType4.handleInput(${qNum}, this.value)">` +
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
    
    evaluateTransformation: function(userAnswer, officialString) {
      if (!userAnswer || !officialString) return { score: 0, parts: [] };
      
      const normalize = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedUser = normalize(userAnswer);
      
      // Handle array format
      if (Array.isArray(officialString)) {
        const matched = officialString.some(ans => normalizedUser.includes(normalize(ans)));
        return { score: matched ? 2 : 0, parts: [matched] };
      }
      
      // Check if officialString uses pipe separator for two-part scoring
      if (typeof officialString === 'string' && officialString.includes('|')) {
        const parts = officialString.split('|').map(p => p.trim());
        const results = parts.map(part => this._matchPart(normalizedUser, part));
        const score = results.filter(r => r).length;
        return { score: score, parts: results };
      }
      
      // Simple string (no pipe) - check with alternatives support
      if (typeof officialString === 'string') {
        const matched = this._matchPart(normalizedUser, officialString);
        return { score: matched ? 2 : 0, parts: [matched] };
      }
      
      return { score: 0, parts: [] };
    },
    
    _matchPart: function(normalizedUser, partString) {
      // Build regex-like patterns from the part string
      // Handle alternatives (/) and optionals (())
      const patterns = this._generatePatterns(partString);
      return patterns.some(pattern => {
        const normalizedPattern = pattern.trim().toLowerCase().replace(/\s+/g, ' ');
        return normalizedUser.includes(normalizedPattern);
      });
    },
    
    _generatePatterns: function(partString) {
      // Step 1: Extract optional groups (words in parentheses)
      const optionalRegex = /\(([^)]+)\)/g;
      const optionals = [];
      let match;
      let cleanString = partString;
      
      while ((match = optionalRegex.exec(partString)) !== null) {
        optionals.push(match[1].trim());
      }
      cleanString = cleanString.replace(optionalRegex, ' __OPT__ ').replace(/\s+/g, ' ').trim();
      
      // Step 2: Split by / for alternatives at each position
      const segments = cleanString.split(/\s+/);
      const expandedSegments = segments.map(seg => {
        if (seg === '__OPT__') return seg;
        if (seg.includes('/')) {
          return seg.split('/').map(s => s.trim()).filter(s => s);
        }
        return [seg];
      });
      
      // Step 3: Generate all alternative combinations
      let combinations = [''];
      expandedSegments.forEach(seg => {
        if (seg === '__OPT__') {
          // For optional words, generate versions with and without
          if (optionals.length > 0) {
            const optWord = optionals.shift();
            const newCombinations = [];
            combinations.forEach(c => {
              newCombinations.push((c + ' ' + optWord).trim());
              newCombinations.push(c.trim());
            });
            combinations = newCombinations;
          }
        } else {
          const newCombinations = [];
          combinations.forEach(c => {
            seg.forEach(alt => {
              newCombinations.push((c + ' ' + alt).trim());
            });
          });
          combinations = newCombinations;
        }
      });
      
      return combinations.length > 0 ? combinations : [partString];
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
        totalScore += result.score > 0 ? 1 : 0;
        
        const input = document.querySelector(`.reading-type4-inline-input[data-question="${q.number}"]`);
        if (input) {
          const wrap = input.closest('.reading-type4-inline-wrap');
          const isCorrect = result.score > 0;
          const colorClass = isCorrect ? 'reading-type4-correct' : 'reading-type4-incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          if (!isCorrect) {
            input.setAttribute('title', '✓ ' + q.correct);
            const secondDiv = input.closest('.reading-type4-second');
            if (secondDiv && !secondDiv.querySelector('.reading-type4-correction-text')) {
              const correctionSpan = document.createElement('span');
              correctionSpan.className = 'reading-type4-correction-text';
              correctionSpan.textContent = q.correct;
              correctionSpan.setAttribute('title', '✓ ' + q.correct);
              wrap.parentNode.insertBefore(correctionSpan, wrap.nextSibling);
            }
          }
          if (wrap) {
            wrap.classList.remove('reading-type4-purple');
            wrap.classList.add(colorClass);
          }
        }
      });
      
      return totalScore;
    }
  };
})();
