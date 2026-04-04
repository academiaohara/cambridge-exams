// js/exercise-types/reading-type4.js
// Key word transformations - Part 4

(function() {
  window.ReadingType4 = {
    _splitSecondSentence: function(question) {
      var s = question.secondSentence || '';
      var GAP = '(1) _________';
      var idx = s.indexOf(GAP);
      if (idx !== -1) {
        return {
          beforeGap: s.slice(0, idx).trim(),
          afterGap: s.slice(idx + GAP.length).trim()
        };
      }
      // Fallback to legacy fields
      return {
        beforeGap: question.beforeGap || '',
        afterGap: question.afterGap || ''
      };
    },

    _getSolutions: function(question) {
      // New format: solutions array of strings
      if (Array.isArray(question.solutions) && question.solutions.length > 0) {
        return question.solutions;
      }
      // Legacy format: routes with p1/p2
      var routes = question.routes || [];
      return routes.map(function(r) { return ((r.p1 || '') + ' ' + (r.p2 || '')).trim(); }).filter(Boolean);
    },

    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return this._renderExample(question);
      }
      var parts = this._splitSecondSentence(question);
      var beforeGap = parts.beforeGap;
      var afterGap = parts.afterGap;
      var solutions = this._getSolutions(question);
      
      let gapHTML = '';
      let answersPanel = '';
      if (isChecked) {
        const result = this.evaluateTransformation(userAnswer, solutions);
        const colorClass = result.score === 2 ? 'reading-type4-correct' : result.score === 1 ? 'reading-type4-partial' : 'reading-type4-incorrect';
        const displayCorrect = solutions[0] || '';
        const escapedCorrect = String(displayCorrect).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const dataAttr = result.score < 2 ? ` data-correct="✓ ${escapedCorrect}"` : '';
        gapHTML = `<span class="reading-type4-inline-wrap ${colorClass}${result.score < 2 ? ' incorrect' : ''}"${dataAttr}>` +
          `<input type="text" class="reading-type4-inline-input gap-input ${colorClass}" data-question="${qNum}" value="${userAnswer || ''}" disabled>` +
          `</span>`;
        answersPanel = this._renderAnswersPanel(solutions, qNum, beforeGap, afterGap);
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
          ${answersPanel}
        </div>
      `;
    },

    _renderExample: function(question) {
      var parts = this._splitSecondSentence(question);
      var beforeGap = parts.beforeGap;
      var afterGap = parts.afterGap;
      var solutions = this._getSolutions(question);
      const answer = solutions[0] || '';
      const escapedAnswer = String(answer).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const exampleLabel = 'Example';
      return `
        <div class="reading-type4-question reading-type4-example">
          <div class="reading-type4-example-label">${exampleLabel} (0)</div>
          <div class="reading-type4-original">
            <span class="reading-type4-number">0.</span> ${question.firstSentence}
          </div>
          <div class="reading-type4-keyword-line">
            <span class="reading-type4-keyword">${question.keyWord}</span>
          </div>
          <div class="reading-type4-second">
            ${beforeGap} <span class="reading-type4-inline-wrap reading-type4-correct"><span class="reading-type4-inline-answer reading-type4-correct">${escapedAnswer}</span></span> ${afterGap}
          </div>
        </div>
      `;
    },

    _renderAnswersPanel: function(solutions, qNum, beforeGap, afterGap) {
      if (!Array.isArray(solutions) || solutions.length === 0) return '';
      let routesHTML = '';
      solutions.forEach(function(sol, idx) {
        routesHTML += `<div class="reading-type4-answer-route">` +
          `<span class="reading-type4-answer-route-num">${idx + 1}.</span>` +
          `<span class="reading-type4-answer-route-text">${beforeGap} <strong>${sol}</strong> ${afterGap}</span>` +
          `</div>`;
      });
      return `<div class="reading-type4-answers-panel" data-qnum-answers="${qNum}" style="display:none;">${routesHTML}</div>`;
    },

    _renderShowAllBtn: function() {
      const showLabel = 'See all the right possible answers';
      return `<div class="reading-type4-show-all-row">` +
        `<button class="reading-type4-show-all-btn" onclick="ReadingType4.toggleAllAnswers(this)" data-showing="false">` +
        `<i class="fas fa-eye"></i> <span>${showLabel}</span>` +
        `</button></div>`;
    },

    toggleAllAnswers: function(btn) {
      const panels = document.querySelectorAll('.reading-type4-answers-panel');
      const isShowing = btn.dataset.showing === 'true';
      if (!isShowing) {
        panels.forEach(function(p) { p.style.display = 'block'; });
        btn.dataset.showing = 'true';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> <span>' + 'Hide all the right possible answers' + '</span>';
      } else {
        panels.forEach(function(p) { p.style.display = 'none'; });
        btn.dataset.showing = 'false';
        btn.innerHTML = '<i class="fas fa-eye"></i> <span>' + ('See all the right possible answers') + '</span>';
      }
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
      var span = document.getElementById('reading-type4-resize-span');
      if (!span) {
        span = document.createElement('span');
        span.id = 'reading-type4-resize-span';
        span.style.cssText = 'visibility:hidden;position:absolute;white-space:pre;pointer-events:none;';
        document.body.appendChild(span);
      }
      span.style.font = window.getComputedStyle(input).font;
      span.textContent = input.value || input.placeholder || '';
      const newWidth = Math.max(minWidth, span.getBoundingClientRect().width + 50); // extra buffer (padding 32px + 18px breathing room)
      input.style.width = newWidth + 'px';
    },
    
    _buildPartRegex: function(text) {
      // Single pass: handle all parenthesized optional groups
      var pattern = text.replace(/(\s*)\(([^)]*)\)/g, function(match, space, inner) {
        var alternatives = inner.split('/').map(function(s) { return s.trim(); }).join('|');
        if (space) {
          // Preceding space + optional group → both become optional together
          return '(?:\\s+(?:' + alternatives + '))?';
        }
        return '(?:' + alternatives + ')?';
      });
      // Handle remaining slashes as alternatives
      pattern = pattern.replace(/\//g, '|');
      // Replace remaining spaces with flexible whitespace
      pattern = pattern.replace(/\s+/g, '\\s+');
      return new RegExp(pattern, 'i');
    },
    
    evaluateTransformation: function(userAnswer, solutions) {
      if (!userAnswer) return { score: 0, parts: [] };
      // Accept either new format (array of strings) or legacy format (array of {p1,p2} objects)
      var solList = [];
      if (Array.isArray(solutions) && solutions.length > 0) {
        if (typeof solutions[0] === 'string') {
          solList = solutions;
        } else {
          // Legacy routes format
          solList = solutions.map(function(r) { return ((r.p1 || '') + ' ' + (r.p2 || '')).trim(); }).filter(Boolean);
        }
      }
      if (solList.length === 0) return { score: 0, parts: [] };

      var normalizedUser = userAnswer.trim().replace(/\s+/g, ' ');
      if (!normalizedUser) return { score: 0, parts: [] };

      var self = this;
      for (var i = 0; i < solList.length; i++) {
        var solRegex = new RegExp('^' + self._buildPartRegex(solList[i]).source + '$', 'i');
        if (solRegex.test(normalizedUser)) {
          return { score: 2, parts: [true, true] };
        }
      }
      return { score: 0, parts: [false, false] };
    },
    
    isAnswerCorrect: function(userAnswer, solutions) {
      const result = this.evaluateTransformation(userAnswer, solutions);
      return result.score > 0;
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let totalScore = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const solutions = this._getSolutions(q);
        const result = this.evaluateTransformation(userAnswer, solutions);
        totalScore += result.score;
        
        const input = document.querySelector(`.reading-type4-inline-input[data-question="${q.number}"]`);
        if (input) {
          const wrap = input.closest('.reading-type4-inline-wrap');
          const questionDiv = input.closest('.reading-type4-question');
          const isCorrect = result.score >= 2;
          const isPartial = result.score === 1;
          const colorClass = isCorrect ? 'reading-type4-correct' : isPartial ? 'reading-type4-partial' : 'reading-type4-incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          this.resizeInput(input);
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
              const displayCorrect = solutions[0] || '';
              const escapedCorrect = String(displayCorrect).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              wrap.setAttribute('data-correct', '✓ ' + escapedCorrect);
            }
          }
          // Inject answers panel into the question card
          if (questionDiv && !questionDiv.querySelector('.reading-type4-answers-panel')) {
            var parts = this._splitSecondSentence(q);
            questionDiv.insertAdjacentHTML('beforeend',
              this._renderAnswersPanel(solutions, q.number, parts.beforeGap, parts.afterGap));
          }
        }
      });

      // Inject "Show all possible answers" button above the first question
      const container = document.getElementById('selectable-text');
      if (container && !container.querySelector('.reading-type4-show-all-row')) {
        container.insertAdjacentHTML('afterbegin', this._renderShowAllBtn());
      }
      
      return totalScore;
    }
  };
})();
