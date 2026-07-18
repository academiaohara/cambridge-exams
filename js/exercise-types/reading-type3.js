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
      var anchor = (gap.querySelector('.reading-type3-wf-pill .cu-wf-pill-word') || answerEl);
      if (anchor) anchor.insertAdjacentElement('afterend', badge);
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

    _escapeHtml: function(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _escapeAttr: function(str) {
      return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    /** Inline pill (course-style cu-hint-pill); passage keeps the stem word after the gap, so we only wrap number + field. */
    _renderPill: function(inner, opts) {
      opts = opts || {};
      var cls = 'cu-hint-pill reading-type3-wf-pill';
      if (opts.example) cls += ' reading-type3-gap-pill--example';
      return '<span class="' + cls + '">' + inner + '</span>';
    },

    /** Stem word in capitals (unchanged), shown inside the pill after the input / answer. */
    _stemHintHtml: function(word) {
      if (!word) return '';
      var w = String(word).trim();
      if (!w) return '';
      return '<span class="cu-hint-pill-word cu-wf-pill-word">' + this._escapeHtml(w) + '</span>';
    },

    renderGap: function(question, qNum, isChecked, userAnswer) {
      var outerOpen = '<span class="reading-type3-gap-inline" data-type3-q="' + qNum + '">';
      var stemHint = this._stemHintHtml(question && question.word);

      if (qNum === 0) {
        var exText = this._escapeHtml(userAnswer || '');
        var inner = '<span class="cu-hint-pill-num">' + qNum + '</span>' +
          '<span class="reading-type3-answered reading-type3-example-answer">' + exText + '</span>' +
          stemHint;
        return outerOpen + this._renderPill(inner, { example: true }) + '</span>';
      }

      if (isChecked) {
        var isCorrect = this.isAnswerCorrect(userAnswer, question.correct);
        var colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
        var escapedCorrect = String(question.correct).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var answerText = userAnswer || '_____';
        var escapedAnswer = this._escapeHtml(answerText);
        var dataAttr = !isCorrect ? ' data-correct="' + escapedCorrect + '"' : '';
        var innerChecked = '<span class="cu-hint-pill-num">' + qNum + '</span>' +
          '<span class="reading-type3-answered-word ' + colorClass + '">' + escapedAnswer + '</span>' +
          stemHint;
        return (
          '<span class="reading-type3-gap-inline' + (!isCorrect ? ' incorrect' : '') + '" data-type3-q="' + qNum + '"' +
          dataAttr + ' data-student-value="' + escapedAnswer + '" data-correct-raw="' + this._escapeAttr(String(question.correct || '')) + '"' +
          ' data-check-class="' + colorClass + '">' +
          this._renderPill(innerChecked) +
          '</span>'
        );
      }

      var val = userAnswer != null ? userAnswer : '';
      var escapedVal = this._escapeAttr(val);
      var inner = '<span class="cu-hint-pill-num">' + qNum + '</span>' +
        '<input type="text" class="cu-gap-input cu-hint-pill-input gap-input reading-type3-pill-input" data-question="' + qNum + '" ' +
        'value="' + escapedVal + '" placeholder="..." ' +
        'oninput="ReadingType3.handlePillInput(' + qNum + ', this)">' +
        stemHint;
      return outerOpen + this._renderPill(inner) + '</span>';
    },

    handlePillInput: function(qNum, el) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = el.value;
      Timer.updateScoreDisplay();
      if (typeof DashboardNav !== 'undefined' && typeof DashboardNav._resizeCuInput === 'function') {
        DashboardNav._resizeCuInput(el);
      }
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

        const gaps = document.querySelectorAll('.reading-type3-gap-inline[data-type3-q]');
        gaps.forEach(gap => {
          if (gap.getAttribute('data-type3-q') !== String(q.number)) return;
          const answerText = userAnswer || '_____';
          const escapedAnswerText = this._escapeHtml(answerText);
          const colorClass = isCorrect ? 'reading-type3-correct' : 'reading-type3-incorrect';
          const escapedCorrect = String(q.correct).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          gap.setAttribute('data-student-value', answerText);
          gap.setAttribute('data-correct-raw', q.correct || '');
          gap.setAttribute('data-check-class', colorClass);
          this._clearAltBadgeForGap(gap);
          gap.className = 'reading-type3-gap-inline' + (!isCorrect ? ' incorrect' : '');
          if (!isCorrect) gap.setAttribute('data-correct', escapedCorrect);
          else gap.removeAttribute('data-correct');
          var inner = '<span class="cu-hint-pill-num">' + q.number + '</span>' +
            '<span class="reading-type3-answered-word ' + colorClass + '">' + escapedAnswerText + '</span>' +
            this._stemHintHtml(q.word);
          gap.innerHTML = this._renderPill(inner);
        });
      });

      return correct;
    },

    setAnswerMode: function(mode) {
      var self = this;
      document.querySelectorAll('.reading-type3-gap-inline[data-type3-q]').forEach(function(gap) {
        var qStr = gap.getAttribute('data-type3-q');
        if (!qStr || qStr === '0') return;
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
            gap.setAttribute('data-correct', correctRaw);
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
