// js/exercise-types/reading-type2.js
// Open cloze - Part 2

(function() {
  window.ReadingType2 = {
    _isB1Reading6: function() {
      return typeof Utils !== 'undefined' && Utils.isDuoOpenClozeReading();
    },

    _escapeHtml: function(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _escapeAttr: function(str) {
      return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _renderDuoPill: function(inner, opts) {
      opts = opts || {};
      var cls = 'cu-hint-pill reading-type2-oc-pill';
      if (opts.example) cls += ' reading-type2-oc-pill--example';
      return '<span class="' + cls + '">' + inner + '</span>';
    },

    _answerAlternatives: function(correctAnswer) {
      if (!correctAnswer) return [];
      var raw = String(correctAnswer).split('/');
      var out = [];
      raw.forEach(function(part) {
        var candidate = part.trim();
        if (candidate && out.indexOf(candidate) === -1) out.push(candidate);
      });
      return out;
    },

    _clearAltBadge: function(el) {
      if (el._cuAltBadge) {
        el._cuAltBadge.remove();
        el._cuAltBadge = null;
      }
      if (el._cuAltClickHandler) {
        el.removeEventListener('click', el._cuAltClickHandler);
        el._cuAltClickHandler = null;
      }
      el.removeAttribute('data-alt-answers');
      el.removeAttribute('data-alt-idx');
    },

    _attachAltBadge: function(el, alternatives) {
      this._clearAltBadge(el);
      if (!alternatives || alternatives.length <= 1) return;
      el.setAttribute('data-alt-answers', JSON.stringify(alternatives));
      el.setAttribute('data-alt-idx', '0');
      var badge = document.createElement('span');
      badge.className = 'cu-alt-badge';
      badge.textContent = '1/' + alternatives.length;
      badge.title = 'Click to see next solution';
      var self = this;
      var isInput = el.tagName === 'INPUT';
      var cycleFn = function() {
        if (isInput) self._cycleAltInput(el);
        else self._cycleAltGap(el);
      };
      badge.addEventListener('click', cycleFn);
      el._cuAltBadge = badge;
      var anchor = isInput ? el : (el.querySelector('.reading-type2-answered-word') || el.querySelector('.reading-type2-oc-pill'));
      if (anchor) anchor.insertAdjacentElement('afterend', badge);
      el._cuAltClickHandler = cycleFn;
      el.addEventListener('click', cycleFn);
      if (isInput) el.readOnly = true;
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

    _cycleAltGap: function(gap) {
      var alternatives = JSON.parse(gap.getAttribute('data-alt-answers') || '[]');
      if (!alternatives.length) return;
      var idx = (parseInt(gap.getAttribute('data-alt-idx') || '0', 10) + 1) % alternatives.length;
      gap.setAttribute('data-alt-idx', String(idx));
      var answerEl = gap.querySelector('.reading-type2-answered-word');
      if (answerEl) answerEl.textContent = alternatives[idx] || '';
      if (gap._cuAltBadge) gap._cuAltBadge.textContent = (idx + 1) + '/' + alternatives.length;
    },

    _renderDuoGap: function(question, qNum, isChecked, userAnswer) {
      var outerOpen = '<span class="reading-type2-gap reading-type2-gap--duo" data-type2-q="' + qNum + '">';

      if (qNum === 0) {
        var exText = this._escapeHtml(userAnswer || '');
        var exInner = '<span class="cu-hint-pill-num">' + qNum + '</span>' +
          '<span class="reading-type2-answered reading-type2-example-answer">' + exText + '</span>';
        return outerOpen + this._renderDuoPill(exInner, { example: true }) + '</span>';
      }

      if (isChecked) {
        var isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        var colorClass = isCorrect ? 'reading-type2-correct' : 'reading-type2-incorrect';
        var escapedCorrect = this._escapeAttr(String(question.correct || ''));
        var answerText = userAnswer || '_____';
        var escapedAnswer = this._escapeHtml(answerText);
        var dataAttr = !isCorrect ? ' data-correct="' + this._escapeHtml(question.correct) + '"' : '';
        var innerChecked = '<span class="cu-hint-pill-num">' + qNum + '</span>' +
          '<span class="reading-type2-answered-word ' + colorClass + '">' + escapedAnswer + '</span>';
        return (
          '<span class="reading-type2-gap reading-type2-gap--duo' + (!isCorrect ? ' incorrect' : '') + '" data-type2-q="' + qNum + '"' +
          dataAttr + ' data-student-value="' + escapedAnswer + '" data-correct-raw="' + escapedCorrect + '"' +
          ' data-check-class="' + colorClass + '">' +
          this._renderDuoPill(innerChecked) +
          '</span>'
        );
      }

      var val = userAnswer != null ? userAnswer : '';
      var escapedVal = this._escapeAttr(val);
      var inner = '<span class="cu-hint-pill-num">' + qNum + '</span>' +
        '<input type="text" class="cu-gap-input cu-hint-pill-input gap-input reading-type2-pill-input" data-question="' + qNum + '" ' +
        'value="' + escapedVal + '" placeholder="..." ' +
        'oninput="ReadingType2.handlePillInput(' + qNum + ', this)">';
      return outerOpen + this._renderDuoPill(inner) + '</span>';
    },

    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (this._isB1Reading6()) {
        return this._renderDuoGap(question, qNum, isChecked, userAnswer);
      }

      if (qNum === 0) {
        return `
          <span class="reading-type2-gap">
            <span class="reading-type2-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      let inputClass = 'reading-type2-input gap-input';
      let gapClass = 'reading-type2-gap';
      let gapDataAttr = '';
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        inputClass += isCorrect ? ' correct' : ' incorrect';
        if (!isCorrect) {
          gapClass += ' incorrect';
          gapDataAttr = ` data-correct="${question.correct}"`;
        }
        var dataAttrs = ` data-student-value="${(userAnswer || '').replace(/"/g, '&quot;')}" data-check-class="${isCorrect ? 'correct' : 'incorrect'}" data-correct-raw="${String(question.correct || '').replace(/"/g, '&quot;')}"`;
      } else {
        var dataAttrs = '';
      }
      
      return `
        <span class="${gapClass}"${gapDataAttr}>
          <span class="reading-type2-gap-number">(${qNum})</span><input type="text" 
                 class="${inputClass}" 
                 data-question="${qNum}" 
                 ${dataAttrs}
                 value="${userAnswer || ''}" 
                 placeholder="..." 
                 ${isChecked ? 'disabled' : ''}
                 oninput="ReadingType2.handleInput(${qNum}, this.value); ReadingType2.resizeInput(this)">
        </span>
      `;
    },
    
    handleInput: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },

    handlePillInput: function(qNum, el) {
      this.handleInput(qNum, el.value);
      if (typeof DashboardNav !== 'undefined' && typeof DashboardNav._resizeCuInput === 'function') {
        DashboardNav._resizeCuInput(el);
      } else {
        this.resizeInput(el);
      }
    },
    
    resizeInput: function(input) {
      var minWidth = 100;
      var span = document.getElementById('reading-type2-resize-span');
      if (!span) {
        span = document.createElement('span');
        span.id = 'reading-type2-resize-span';
        span.style.cssText = 'visibility:hidden;position:absolute;white-space:pre;pointer-events:none;';
        document.body.appendChild(span);
      }
      span.style.font = window.getComputedStyle(input).font;
      span.textContent = input.value || input.placeholder || '';
      var newWidth = Math.max(minWidth, span.getBoundingClientRect().width + 28);
      input.style.width = newWidth + 'px';
    },
    
    isAnswerCorrect: function(userAnswer, correctAnswer) {
      var ua = String(userAnswer == null ? '' : userAnswer).trim();
      if (!ua) return false;
      var ca = String(correctAnswer == null ? '' : correctAnswer);
      if (ca.indexOf('/') !== -1) {
        return ca.split('/').some(function(ans) {
          return ua.toLowerCase() === ans.trim().toLowerCase();
        });
      }
      return ua.toLowerCase() === ca.trim().toLowerCase();
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      var isDuo = this._isB1Reading6();
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(userAnswer, q.correct);
        if (isCorrect) correct++;

        if (isDuo) {
          const gaps = document.querySelectorAll('.reading-type2-gap--duo[data-type2-q]');
          gaps.forEach(function(gap) {
            if (gap.getAttribute('data-type2-q') !== String(q.number)) return;
            const answerText = userAnswer || '_____';
            const escapedAnswerText = ReadingType2._escapeHtml(answerText);
            const colorClass = isCorrect ? 'reading-type2-correct' : 'reading-type2-incorrect';
            const escapedCorrect = String(q.correct).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            gap.setAttribute('data-student-value', answerText);
            gap.setAttribute('data-correct-raw', q.correct || '');
            gap.setAttribute('data-check-class', colorClass);
            ReadingType2._clearAltBadge(gap);
            gap.className = 'reading-type2-gap reading-type2-gap--duo' + (!isCorrect ? ' incorrect' : '');
            if (!isCorrect) gap.setAttribute('data-correct', escapedCorrect);
            else gap.removeAttribute('data-correct');
            var inner = '<span class="cu-hint-pill-num">' + q.number + '</span>' +
              '<span class="reading-type2-answered-word ' + colorClass + '">' + escapedAnswerText + '</span>';
            gap.innerHTML = ReadingType2._renderDuoPill(inner);
          });
          return;
        }
        
        const input = document.querySelector(`.reading-type2-input[data-question="${q.number}"]`);
        if (input) {
          const colorClass = isCorrect ? 'correct' : 'incorrect';
          input.classList.add(colorClass);
          input.disabled = true;
          input.setAttribute('data-student-value', userAnswer || '');
          input.setAttribute('data-check-class', colorClass);
          input.setAttribute('data-correct-raw', q.correct || '');
          this._clearAltBadge(input);
          if (!isCorrect) {
            const gap = input.closest('.reading-type2-gap');
            if (gap) {
              gap.classList.add('incorrect');
              gap.setAttribute('data-correct', q.correct);
            }
          }
        }
      });
      
      return correct;
    },

    setAnswerMode: function(mode) {
      var self = this;

      document.querySelectorAll('.reading-type2-gap--duo[data-type2-q]').forEach(function(gap) {
        var qStr = gap.getAttribute('data-type2-q');
        if (!qStr || qStr === '0') return;
        var answerEl = gap.querySelector('.reading-type2-answered-word');
        if (!answerEl) return;
        var studentValue = gap.getAttribute('data-student-value') || '_____';
        var checkClass = gap.getAttribute('data-check-class') || 'reading-type2-incorrect';
        var correctRaw = gap.getAttribute('data-correct-raw') || '';
        if (mode === 'correct') {
          var alternatives = self._answerAlternatives(correctRaw);
          answerEl.textContent = alternatives[0] || '';
          answerEl.classList.remove('reading-type2-correct', 'reading-type2-incorrect');
          answerEl.classList.add('reading-type2-show-correct');
          gap.classList.remove('incorrect');
          gap.removeAttribute('data-correct');
          self._attachAltBadge(gap, alternatives);
        } else {
          answerEl.textContent = studentValue;
          answerEl.classList.remove('reading-type2-show-correct', 'reading-type2-correct', 'reading-type2-incorrect');
          answerEl.classList.add(checkClass);
          if (checkClass === 'reading-type2-incorrect') {
            gap.classList.add('incorrect');
            gap.setAttribute('data-correct', correctRaw);
          } else {
            gap.classList.remove('incorrect');
            gap.removeAttribute('data-correct');
          }
          self._clearAltBadge(gap);
        }
      });

      document.querySelectorAll('.reading-type2-input[data-question]').forEach(function(input) {
        var gap = input.closest('.reading-type2-gap');
        var studentValue = input.getAttribute('data-student-value') || '';
        var checkClass = input.getAttribute('data-check-class') || '';
        var correctRaw = input.getAttribute('data-correct-raw') || '';
        if (mode === 'correct') {
          var alternatives = self._answerAlternatives(correctRaw);
          input.value = alternatives[0] || '';
          input.classList.remove('correct', 'incorrect');
          input.classList.add('cu-input-show-correct');
          self._attachAltBadge(input, alternatives);
          if (gap) {
            gap.classList.remove('incorrect');
            gap.removeAttribute('data-correct');
          }
        } else {
          input.value = studentValue;
          input.classList.remove('cu-input-show-correct');
          input.classList.remove('correct', 'incorrect');
          if (checkClass) input.classList.add(checkClass);
          self._clearAltBadge(input);
          if (gap && checkClass === 'incorrect' && correctRaw) {
            gap.classList.add('incorrect');
            gap.setAttribute('data-correct', correctRaw);
          }
        }
        self.resizeInput(input);
      });
    }
  };
})();
