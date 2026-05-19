// js/exercise-types/reading-type5.js
// Multiple choice text - Part 5 (and B1 Part 1 notices)

(function() {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeJsString(str) {
    return String(str == null ? '' : str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\\\'');
  }

  function sourceCardLabel(format) {
    var f = (format || '').toString();
    if (f === 'notice') return 'Notice';
    if (f === 'text_message') return 'Message';
    if (f === 'advert') return 'Advert';
    if (f === 'email') return 'Email';
    return 'Text';
  }

  /** Normalized key for CSS theming of the source card (aside). */
  function sourceCardFormatKey(hasLegacyNotice, format) {
    if (hasLegacyNotice) return 'notice';
    var f = String(format || '').trim();
    if (f === 'notice' || f === 'text_message' || f === 'advert' || f === 'email') return f;
    return 'text';
  }

  function gapTriggerLabel(qNum, userAnswer) {
    var letter = (userAnswer || '').trim();
    if (letter) return letter;
    return '(' + qNum + ')';
  }

  window.ReadingType5 = {
    /**
     * Inline cloze gap in the passage: tap to open a panel with all options (4 or 5).
     * Uses only phrasing elements so markup stays valid inside <p>.
     */
    renderInlineGap: function(question, qNum, isChecked, userAnswer) {
      var options = question.options || ['A', 'B', 'C', 'D'];
      var label = gapTriggerLabel(qNum, userAnswer);
      var triggerDisabled = isChecked ? ' disabled' : '';
      var choicesHtml = '';
      options.forEach(function(opt) {
        var letter = opt.charAt(0);
        var picked = userAnswer === letter;
        var choiceCls = 'reading-type5-gap-choice';
        if (isChecked) {
          choiceCls += ' disabled';
          if (letter === question.correct) choiceCls += ' correct';
          else if (picked) choiceCls += ' incorrect';
        } else if (picked) {
          choiceCls += ' selected';
        }
        var onpick = isChecked
          ? ''
          : ' onclick="event.stopPropagation(); ReadingType5.pickGapAnswer(' + qNum + ', \'' + escapeJsString(letter) + '\')"';
        choicesHtml +=
          '<button type="button" class="' + choiceCls + '" data-letter="' + escapeHtml(letter) + '"' + onpick + '>' +
          escapeHtml(opt) +
          '</button>';
      });
      var trigCls = 'reading-type5-gap-trigger';
      if (isChecked) {
        trigCls += ' disabled';
        var ua = userAnswer;
        if (ua === question.correct) trigCls += ' correct';
        else if (ua) trigCls += ' incorrect';
        else trigCls += ' unanswered-checked';
      } else if (userAnswer) {
        trigCls += ' filled';
      }
      var onTrig = isChecked
        ? ''
        : ' onclick="event.stopPropagation(); ReadingType5.toggleGapPopover(event, ' + qNum + ')"';
      return (
        '<span class="reading-type5-gap-wrap" data-qnum="' + qNum + '">' +
        '<button type="button" class="' + trigCls + '" aria-haspopup="listbox" aria-expanded="false"' +
        triggerDisabled + onTrig + '>' + escapeHtml(label) + '</button>' +
        '<span class="reading-type5-gap-panel" role="listbox" aria-label="Question ' + qNum + '">' +
        choicesHtml +
        '</span>' +
        '</span>'
      );
    },

    /** B1 Reading Part 5 “Questions” tab: question number + options on one row. */
    renderQuestionRow: function(question, qNum, isChecked, userAnswer) {
      return (
        '<div class="reading-type5-question reading-type5-cloze-row">' +
        '<div class="reading-type5-cloze-row-inner">' +
        '<div class="reading-type5-question-number">' + qNum + '</div>' +
        '<div class="reading-type5-options reading-type5-options-row">' +
        this.renderOptions(question, qNum, isChecked, userAnswer) +
        '</div></div></div>'
      );
    },

    renderQuestion: function(question, qNum, isChecked, userAnswer) {
      const notice = question.notice;
      const hasLegacyNotice = notice != null && String(notice).trim() !== '';
      const heading = question.heading;
      const bodyText = question.text;
      const hasPassage =
        (heading != null && String(heading).trim() !== '') ||
        (bodyText != null && String(bodyText).trim() !== '');
      const showSourceCard = hasLegacyNotice || hasPassage;
      const questionBlock = `
        <div class="reading-type5-question">
          <div class="reading-type5-question-header">
            <div class="reading-type5-question-number">${qNum}</div>
            <div class="reading-type5-question-text">${question.question}</div>
          </div>
          <div class="reading-type5-options">
            ${this.renderOptions(question, qNum, isChecked, userAnswer)}
          </div>
        </div>
      `;
      if (!showSourceCard) {
        return questionBlock;
      }
      var label = 'Notice';
      var innerBody = '';
      if (hasLegacyNotice) {
        innerBody = '<div class="reading-type5-notice-text">' + notice + '</div>';
      } else {
        label = sourceCardLabel(question.format);
        var hBlock =
          heading != null && String(heading).trim() !== ''
            ? '<div class="reading-type5-passage-heading">' + escapeHtml(heading) + '</div>'
            : '';
        var tBlock =
          bodyText != null && String(bodyText).trim() !== ''
            ? '<div class="reading-type5-passage-body">' + escapeHtml(bodyText) + '</div>'
            : '';
        innerBody = hBlock + tBlock;
      }
      var sourceKey = sourceCardFormatKey(hasLegacyNotice, question.format);
      return `
        <div class="reading-type5-with-notice">
          <aside class="reading-type5-notice-card" data-reading-type5-source="${sourceKey}" aria-label="${escapeHtml(label)}">
            <div class="reading-type5-notice-label">${escapeHtml(label)}</div>
            ${innerBody}
          </aside>
          ${questionBlock}
        </div>
      `;
    },

    renderOptions: function(question, qNum, isChecked, userAnswer) {
      let html = '';
      const options = question.options || ['A', 'B', 'C', 'D'];
      options.forEach(opt => {
        const letter = opt.charAt(0);
        const checked = userAnswer === letter ? 'checked' : '';
        const labelClass = isChecked
          ? (letter === question.correct ? 'correct' : (userAnswer === letter ? 'incorrect' : ''))
          : '';

        html += `
          <label class="reading-type5-option ${labelClass} ${isChecked ? 'disabled' : ''}">
            <input type="radio" name="q${qNum}" value="${letter}" ${checked} ${isChecked ? 'disabled' : ''}
                   onchange="ReadingType5.selectAnswer(${qNum}, '${letter}')">
            <span>${opt}</span>
          </label>
        `;
      });
      return html;
    },

    toggleGapPopover: function(ev, qNum) {
      if (ev) ev.stopPropagation();
      if (typeof AppState !== 'undefined' && AppState.answersChecked) return;
      var wrap = document.querySelector('.reading-type5-gap-wrap[data-qnum="' + qNum + '"]');
      if (!wrap) return;
      var wasOpen = wrap.classList.contains('reading-type5-gap-open');
      var trig = wrap.querySelector('.reading-type5-gap-trigger');
      ReadingType5.closeAllGapPopovers();
      if (!wasOpen) {
        wrap.classList.add('reading-type5-gap-open');
        if (trig) trig.setAttribute('aria-expanded', 'true');
      }
    },

    closeAllGapPopovers: function() {
      document.querySelectorAll('.reading-type5-gap-wrap.reading-type5-gap-open').forEach(function(w) {
        w.classList.remove('reading-type5-gap-open');
        var t = w.querySelector('.reading-type5-gap-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    },

    pickGapAnswer: function(qNum, letter) {
      ReadingType5.selectAnswer(qNum, letter);
      ReadingType5.closeAllGapPopovers();
    },

    selectAnswer: function(qNum, letter) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = letter;
      ReadingType5._syncDualViews(qNum, letter);
      Timer.updateScoreDisplay();
    },

    _syncDualViews: function(qNum, letter) {
      var r = document.querySelector('input[name="q' + qNum + '"][value="' + letter + '"]');
      if (r) r.checked = true;
      ReadingType5.updateInlineGapTrigger(qNum, letter);
    },

    updateInlineGapTrigger: function(qNum, letter) {
      var wrap = document.querySelector('.reading-type5-gap-wrap[data-qnum="' + qNum + '"]');
      if (!wrap) return;
      var btn = wrap.querySelector('.reading-type5-gap-trigger');
      if (!btn) return;
      var checked = typeof AppState !== 'undefined' && AppState.answersChecked;
      btn.textContent = gapTriggerLabel(qNum, letter);
      if (checked) return;
      if (letter) {
        btn.classList.add('filled');
      } else {
        btn.classList.remove('filled');
      }
      wrap.querySelectorAll('.reading-type5-gap-choice').forEach(function(c) {
        var L = c.getAttribute('data-letter');
        c.classList.toggle('selected', !!letter && L === letter);
      });
    },

    /** After restore / tab switch: align passage gaps and row radios with AppState. */
    syncAllFromAppState: function() {
      if (!AppState.currentExercise || !AppState.currentExercise.content) return;
      var qs = AppState.currentExercise.content.questions || [];
      var ans = AppState.currentExercise.answers || {};
      qs.forEach(function(q) {
        var n = q.number;
        var a = ans[n];
        if (a) {
          var radio = document.querySelector('input[name="q' + n + '"][value="' + a + '"]');
          if (radio) radio.checked = true;
        }
        ReadingType5.updateInlineGapTrigger(n, a || '');
      });
    },

    initListeners: function() {
      if (ReadingType5._docGapCloseBound) return;
      ReadingType5._docGapCloseBound = true;
      document.addEventListener('click', function() {
        ReadingType5.closeAllGapPopovers();
      });
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
        if (isCorrect) correct += (AppState.currentExercise && AppState.currentExercise._b1PetScoring) ? 1 : 2;

        document.querySelectorAll(`input[name="q${q.number}"]`).forEach(radio => {
          const label = radio.closest('.reading-type5-option');
          if (!label) return;
          radio.disabled = true;
          label.classList.add('disabled');
          if (radio.value === q.correct) {
            label.classList.add('correct');
          } else if (radio.value === userAnswer && !isCorrect) {
            label.classList.add('incorrect');
          }
        });

        var wrap = document.querySelector('.reading-type5-gap-wrap[data-qnum="' + q.number + '"]');
        if (wrap) {
          ReadingType5.closeAllGapPopovers();
          var trig = wrap.querySelector('.reading-type5-gap-trigger');
          if (trig) {
            trig.disabled = true;
            trig.classList.remove('correct', 'incorrect', 'unanswered-checked', 'filled');
            if (userAnswer === q.correct) trig.classList.add('correct');
            else if (userAnswer) trig.classList.add('incorrect');
            else trig.classList.add('unanswered-checked');
            trig.textContent = gapTriggerLabel(q.number, userAnswer || '');
          }
          wrap.querySelectorAll('.reading-type5-gap-choice').forEach(function(btn) {
            btn.disabled = true;
            btn.classList.add('disabled');
            var L = btn.getAttribute('data-letter');
            if (L === q.correct) btn.classList.add('correct');
            else if (L === userAnswer && userAnswer !== q.correct) btn.classList.add('incorrect');
          });
        }
      });

      return correct;
    }
  };
})();
