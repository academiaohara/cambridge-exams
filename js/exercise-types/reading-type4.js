// js/exercise-types/reading-type4.js
// Key word transformations - Part 4

(function() {
  var MAX_OPTIONAL_EXPANSION_DEPTH = 10;

  window.ReadingType4 = {
    _clearAltBadge: function(input) {
      if (input._cuAltBadge) {
        input._cuAltBadge.remove();
        input._cuAltBadge = null;
      }
      if (input._cuAltClickHandler) {
        input.removeEventListener('click', input._cuAltClickHandler);
        input._cuAltClickHandler = null;
      }
      input.removeAttribute('data-alt-answers');
      input.removeAttribute('data-alt-idx');
    },

    _attachAltBadge: function(input, alternatives) {
      this._clearAltBadge(input);
      if (!alternatives || alternatives.length <= 1) return;
      input.setAttribute('data-alt-answers', JSON.stringify(alternatives));
      input.setAttribute('data-alt-idx', '0');
      var badge = document.createElement('span');
      badge.className = 'cu-alt-badge';
      badge.textContent = '1/' + alternatives.length;
      badge.title = 'Click to see next solution';
      var self = this;
      badge.addEventListener('click', function() { self._cycleAltInput(input); });
      input._cuAltBadge = badge;
      input.closest('.reading-type4-inline-wrap').appendChild(badge);
      input._cuAltClickHandler = function() { self._cycleAltInput(input); };
      input.addEventListener('click', input._cuAltClickHandler);
      input.readOnly = true;
    },

    _cycleAltInput: function(input) {
      var alternatives = JSON.parse(input.getAttribute('data-alt-answers') || '[]');
      if (!alternatives.length) return;
      var idx = (parseInt(input.getAttribute('data-alt-idx') || '0', 10) + 1) % alternatives.length;
      input.setAttribute('data-alt-idx', String(idx));
      input.value = alternatives[idx] || '';
      this.resizeInput(input);
      if (input._cuAltBadge) input._cuAltBadge.textContent = (idx + 1) + '/' + alternatives.length;
    },

    _expandOptionals: function(text) {
      var results = [String(text || '').trim()];
      var re = /\(([^)]*)\)/;
      var guard = MAX_OPTIONAL_EXPANSION_DEPTH;
      while (guard-- > 0) {
        var changed = false;
        var next = [];
        results.forEach(function(candidate) {
          var match = candidate.match(re);
          if (!match) {
            next.push(candidate.replace(/\s+/g, ' ').trim());
            return;
          }
          changed = true;
          var before = candidate.substring(0, match.index);
          var inside = match[1];
          var after = candidate.substring(match.index + match[0].length);
          var withInside = (before + inside + after).replace(/\s+/g, ' ').trim();
          var withoutInside = (before + after).replace(/\s+/g, ' ').trim();
          if (withInside) next.push(withInside);
          if (withoutInside && withoutInside !== withInside) next.push(withoutInside);
        });
        results = next;
        if (!changed) break;
      }
      return results.filter(Boolean);
    },

    _buildRouteAlternatives: function(routes) {
      if (!Array.isArray(routes)) return [];
      var out = [];
      var expandOptionals = this._expandOptionals.bind(this);
      routes.forEach(function(route) {
        var full = [route.p1, route.p2].filter(Boolean).join(' ');
        String(full).split('/').forEach(function(part) {
          expandOptionals(part).forEach(function(opt) {
            if (opt && out.indexOf(opt) === -1) out.push(opt);
          });
        });
      });
      return out;
    },

    _getRouteDisplayTexts: function(routes) {
      if (!Array.isArray(routes)) return [];
      return routes.map(function(route) {
        return [route?.p1, route?.p2].filter(Boolean).join(' ').trim();
      }).filter(Boolean);
    },

    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return this._renderExample(question);
      }
      const beforeGap = question.beforeGap || '';
      const afterGap = question.afterGap || '';
      
      let gapHTML = '';
      let answersPanel = '';
      if (isChecked) {
        const result = this.evaluateTransformation(userAnswer, question.routes);
        const colorClass = result.score === 2 ? 'reading-type4-correct' : result.score === 1 ? 'reading-type4-partial' : 'reading-type4-incorrect';
        const displayCorrect = this._formatRoutesDisplay(question.routes);
        const escapedCorrect = String(displayCorrect).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const dataAttr = result.score < 2 ? ` data-correct="✓ ${escapedCorrect}" data-correct-label="✓ ${escapedCorrect}"` : '';
        const escapedStudent = String(userAnswer || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedRoutes = String(JSON.stringify(question.routes || [])).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        gapHTML = `<span class="reading-type4-inline-wrap ${colorClass}${result.score < 2 ? ' incorrect' : ''}"${dataAttr}>` +
          `<input type="text" class="reading-type4-inline-input gap-input ${colorClass}" data-question="${qNum}" data-student-value="${escapedStudent}" data-check-class="${colorClass}" data-correct-routes="${escapedRoutes}" value="${userAnswer || ''}" disabled>` +
          `</span>`;
        answersPanel = this._renderAnswersPanel(question, qNum, beforeGap, afterGap);
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
      const beforeGap = question.beforeGap || '';
      const afterGap = question.afterGap || '';
      const routes = question.routes || [];
      const answer = routes[0] ? (((routes[0].p1 || '') + ' ' + (routes[0].p2 || '')).trim()) : '';
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

    _renderAnswersPanel: function(question, qNum, beforeGap, afterGap) {
      const routeTexts = this._getRouteDisplayTexts(question.routes || []);
      if (routeTexts.length === 0) return '';
      let routesHTML = '';
      routeTexts.forEach(function(full, idx) {
        routesHTML += `<div class="reading-type4-answer-route">` +
          `<span class="reading-type4-answer-route-num">${idx + 1}.</span>` +
          `<span class="reading-type4-answer-route-text">${beforeGap} <strong>${full}</strong> ${afterGap}</span>` +
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
    
    _formatRoutesDisplay: function(routes) {
      var routeTexts = this._getRouteDisplayTexts(routes);
      return routeTexts[0] || '';
    },
    
    evaluateTransformation: function(userAnswer, routes) {
      if (!userAnswer) return { score: 0, parts: [] };
      if (!Array.isArray(routes) || routes.length === 0) return { score: 0, parts: [] };
      
      var normalizedUser = userAnswer.trim().replace(/\s+/g, ' ');
      if (!normalizedUser) return { score: 0, parts: [] };
      
      var self = this;
      var bestScore = 0;
      
      for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        if (!route.p1 || !route.p2) continue;
        
        // Build regex for p1 (must match start of user answer)
        var p1Regex = new RegExp('^' + self._buildPartRegex(route.p1).source, 'i');
        var p1Match = normalizedUser.match(p1Regex);
        
        if (!p1Match) continue;
        
        // p1 matched → at least 1 point
        var score = 1;
        
        // Get residue (what's left after p1 match)
        var residue = normalizedUser.slice(p1Match[0].length).trim();
        
        // Build regex for p2 (must match residue exactly)
        var p2Regex = new RegExp('^' + self._buildPartRegex(route.p2).source + '$', 'i');
        
        if (p2Regex.test(residue)) {
          score = 2;
        }
        
        if (score > bestScore) bestScore = score;
        if (bestScore === 2) break;
      }
      
      return {
        score: bestScore,
        parts: bestScore === 2 ? [true, true] : bestScore === 1 ? [true, false] : [false, false]
      };
    },
    
    isAnswerCorrect: function(userAnswer, routes) {
      const result = this.evaluateTransformation(userAnswer, routes);
      return result.score > 0;
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let totalScore = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const result = this.evaluateTransformation(userAnswer, q.routes);
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
          input.setAttribute('data-student-value', userAnswer || '');
          input.setAttribute('data-check-class', colorClass);
          input.setAttribute('data-correct-routes', JSON.stringify(q.routes || []));
          this._clearAltBadge(input);
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
              const displayCorrect = this._formatRoutesDisplay(q.routes);
              const escapedCorrect = String(displayCorrect).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              wrap.setAttribute('data-correct', '✓ ' + escapedCorrect);
              wrap.setAttribute('data-correct-label', '✓ ' + escapedCorrect);
            }
          }
          // Inject answers panel into the question card
          if (questionDiv && !questionDiv.querySelector('.reading-type4-answers-panel')) {
            questionDiv.insertAdjacentHTML('beforeend',
              this._renderAnswersPanel(q, q.number, q.beforeGap || '', q.afterGap || ''));
          }
        }
      });

      // Inject "Show all possible answers" button above the first question
      const container = document.getElementById('selectable-text');
      if (container && !container.querySelector('.reading-type4-show-all-row')) {
        container.insertAdjacentHTML('afterbegin', this._renderShowAllBtn());
      }
      
      return totalScore;
    },

    setAnswerMode: function(mode) {
      var self = this;
      document.querySelectorAll('.reading-type4-inline-input[data-question]').forEach(function(input) {
        var studentValue = input.getAttribute('data-student-value') || '';
        var checkClass = input.getAttribute('data-check-class') || '';
        var routes = [];
        try { routes = JSON.parse(input.getAttribute('data-correct-routes') || '[]'); } catch (e) { routes = []; }
        var wrap = input.closest('.reading-type4-inline-wrap');
        if (!wrap) return;
        if (mode === 'correct') {
          var alternatives = self._getRouteDisplayTexts(routes);
          input.value = alternatives[0] || '';
          input.classList.remove('reading-type4-correct', 'reading-type4-partial', 'reading-type4-incorrect');
          input.classList.add('cu-input-show-correct');
          wrap.classList.remove('reading-type4-correct', 'reading-type4-partial', 'reading-type4-incorrect', 'incorrect');
          wrap.classList.add('reading-type4-show-correct');
          wrap.removeAttribute('data-correct');
          self._attachAltBadge(input, alternatives);
        } else {
          input.value = studentValue;
          input.classList.remove('cu-input-show-correct');
          input.classList.remove('reading-type4-correct', 'reading-type4-partial', 'reading-type4-incorrect');
          wrap.classList.remove('reading-type4-show-correct');
          wrap.classList.remove('reading-type4-correct', 'reading-type4-partial', 'reading-type4-incorrect', 'incorrect');
          if (checkClass) {
            input.classList.add(checkClass);
            wrap.classList.add(checkClass);
            if (checkClass !== 'reading-type4-correct') {
              wrap.classList.add('incorrect');
              var correctLabel = wrap.getAttribute('data-correct-label');
              if (correctLabel) wrap.setAttribute('data-correct', correctLabel);
            } else {
              wrap.removeAttribute('data-correct');
            }
          }
          self._clearAltBadge(input);
        }
        self.resizeInput(input);
      });
    }
  };
})();
