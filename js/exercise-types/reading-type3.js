// js/exercise-types/reading-type3.js
// Word formation - Part 3

(function() {
  window.ReadingType3 = {
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

    _clearAltBadgeForGap: function(gap) {
      if (gap._cuAltBadge) {
        gap._cuAltBadge.remove();
        gap._cuAltBadge = null;
      }
      gap.removeAttribute('data-alt-answers');
      gap.removeAttribute('data-alt-idx');
    },

    _attachAltBadgeForGap: function(gap, alternatives) {
      this._clearAltBadgeForGap(gap);
      if (!alternatives || alternatives.length <= 1) return;
      gap.setAttribute('data-alt-answers', JSON.stringify(alternatives));
      gap.setAttribute('data-alt-idx', '0');
      var badge = document.createElement('span');
      badge.className = 'cu-alt-badge';
      badge.textContent = '1/' + alternatives.length;
      badge.title = 'Click to see next solution';
      var self = this;
      badge.addEventListener('click', function() { self._cycleGapAlt(gap); });
      gap._cuAltBadge = badge;
      var answerEl = gap.querySelector('.reading-type3-answered-word');
      if (answerEl) answerEl.insertAdjacentElement('afterend', badge);
    },

    _cycleGapAlt: function(gap) {
      var alternatives = JSON.parse(gap.getAttribute('data-alt-answers') || '[]');
      if (!alternatives.length) return;
      var idx = (parseInt(gap.getAttribute('data-alt-idx') || '0', 10) + 1) % alternatives.length;
      gap.setAttribute('data-alt-idx', String(idx));
      var answerEl = gap.querySelector('.reading-type3-answered-word');
      if (answerEl) answerEl.textContent = alternatives[idx] || '';
      if (gap._cuAltBadge) gap._cuAltBadge.textContent = (idx + 1) + '/' + alternatives.length;
    },

    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered reading-type3-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      // Intentionally render checked unanswered gaps as "_____" to allow toggle mode on restored attempts.
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        const colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
        const escapedCorrect = String(question.correct).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const answerText = userAnswer || '_____';
        const escapedAnswer = this._escapeHtml(answerText);
        const dataAttr = !isCorrect ? ` data-correct="✓ ${escapedCorrect}"` : '';
        return `
          <span class="reading-type3-gap-inline${!isCorrect ? ' incorrect' : ''}"${dataAttr} data-student-value="${escapedAnswer}" data-correct-raw="${escapedCorrect}" data-check-class="${colorClass}">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered-word ${colorClass}">${escapedAnswer}</span>
          </span>
        `;
      }
      
      if (userAnswer) {
        const escapedAnswer = this._escapeHtml(userAnswer);
        return `
          <span class="reading-type3-gap-inline">
            <span class="reading-type3-gap-number">(${qNum})</span>
            <span class="reading-type3-answered-word reading-type3-purple" onclick="ReadingType3.openModal(${qNum})">${escapedAnswer}</span>
          </span>
        `;
      }
      
      return `
        <span class="reading-type3-gap-inline">
          <span class="reading-type3-gap-number">(${qNum})</span>
          <span class="reading-type3-gap-slot" onclick="ReadingType3.openModal(${qNum})"></span>
        </span>
      `;
    },
    
    _escapeHtml: function(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    openModal: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      
      // Close tools panel when modal opens
      if (window.Tools) Tools.closeSidebar();
      
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      
      const currentAnswer = AppState.currentExercise.answers?.[qNum] || '';
      const escapedCurrentAnswer = this._escapeHtml(currentAnswer);
      const escapedWord = this._escapeHtml(question.word || '');

      let html = '<div class="modal-header"><div class="modal-header-row"><span class="modal-q-circle">' + qNum + '</span></div></div>';
      html += '<div class="reading-type3-input-word-row">';
      html += '<input type="text" class="reading-type3-modal-input" id="type3-modal-input" value="' + escapedCurrentAnswer + '" placeholder="..." autofocus>';
      html += '<span class="reading-type3-word-badge">' + escapedWord + '</span>';
      html += '</div>';
      html += '<div class="reading-type3-modal-actions">';
      html += '<button class="opt-btn" onclick="ReadingType3.submitAnswer(' + qNum + ')">' + 'Confirm' + '</button>';
      html += '</div>';
      
      body.innerHTML = html;
      overlay.style.display = 'flex';
      
      setTimeout(function() {
        var inp = document.getElementById('type3-modal-input');
        if (inp) {
          inp.focus();
          inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              ReadingType3.submitAnswer(qNum);
            }
          });
        }
      }, 100);
    },
    
    submitAnswer: function(qNum) {
      var inp = document.getElementById('type3-modal-input');
      var value = inp ? inp.value : '';
      var escapedValue = this._escapeHtml(value);
      
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      // Update the gap in place
      var gaps = document.querySelectorAll('.reading-type3-gap-inline');
      gaps.forEach(function(gap) {
        var numSpan = gap.querySelector('.reading-type3-gap-number');
        if (numSpan && numSpan.textContent.trim() === '(' + qNum + ')') {
          if (value.trim()) {
            gap.innerHTML = '<span class="reading-type3-gap-number">(' + qNum + ')</span>' +
              '<span class="reading-type3-answered-word reading-type3-purple" onclick="ReadingType3.openModal(' + qNum + ')">' + escapedValue + '</span>';
          } else {
            gap.innerHTML = '<span class="reading-type3-gap-number">(' + qNum + ')</span>' +
              '<span class="reading-type3-gap-slot" onclick="ReadingType3.openModal(' + qNum + ')"></span>';
          }
        }
      });
      
      document.getElementById('exercise-modal-overlay').style.display = 'none';
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(userAnswer, correctAnswer) {
      if (!userAnswer) return false;
      if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
        return correctAnswer.split('/').some(ans =>
          userAnswer.trim().toLowerCase() === ans.trim().toLowerCase()
        );
      }
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(userAnswer, q.correct);
        if (isCorrect) correct++;
        
        // Update visual state
        const gaps = document.querySelectorAll('.reading-type3-gap-inline');
        gaps.forEach(gap => {
          const numSpan = gap.querySelector('.reading-type3-gap-number');
          if (numSpan && numSpan.textContent.trim() === `(${q.number})`) {
            const answerText = userAnswer || '_____';
            const escapedAnswerText = this._escapeHtml(answerText);
            const colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
            const escapedCorrect = String(q.correct).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            gap.setAttribute('data-student-value', answerText);
            gap.setAttribute('data-correct-raw', q.correct || '');
            gap.setAttribute('data-check-class', colorClass);
            this._clearAltBadgeForGap(gap);
            gap.className = 'reading-type3-gap-inline' + (!isCorrect ? ' incorrect' : '');
            if (!isCorrect) gap.setAttribute('data-correct', '✓ ' + escapedCorrect);
            else gap.removeAttribute('data-correct');
            gap.innerHTML = `
              <span class="reading-type3-gap-number">(${q.number})</span>
              <span class="reading-type3-answered-word ${colorClass}">${escapedAnswerText}</span>
            `;
          }
        });
      });
      
      return correct;
    },

    setAnswerMode: function(mode) {
      var self = this;
      document.querySelectorAll('.reading-type3-gap-inline').forEach(function(gap) {
        var numberEl = gap.querySelector('.reading-type3-gap-number');
        if (!numberEl || numberEl.textContent.trim() === '(0)') return;
        var answerEl = gap.querySelector('.reading-type3-answered-word');
        if (!answerEl) return;
        var studentValue = gap.getAttribute('data-student-value') || '_____';
        var checkClass = gap.getAttribute('data-check-class') || 'reading-type3-incorrect';
        var correctRaw = gap.getAttribute('data-correct-raw') || '';
        if (mode === 'correct') {
          var alternatives = self._answerAlternatives(correctRaw);
          answerEl.textContent = alternatives[0] || '';
          answerEl.classList.remove('reading-type3-correct', 'reading-type3-incorrect');
          answerEl.classList.add('reading-type3-show-correct');
          gap.classList.remove('incorrect');
          gap.removeAttribute('data-correct');
          self._attachAltBadgeForGap(gap, alternatives);
        } else {
          answerEl.textContent = studentValue;
          answerEl.classList.remove('reading-type3-show-correct', 'reading-type3-correct', 'reading-type3-incorrect');
          answerEl.classList.add(checkClass);
          if (checkClass === 'reading-type3-incorrect') {
            gap.classList.add('incorrect');
            gap.setAttribute('data-correct', '✓ ' + correctRaw);
          } else {
            gap.classList.remove('incorrect');
            gap.removeAttribute('data-correct');
          }
          self._clearAltBadgeForGap(gap);
        }
      });
    }
  };
})();
