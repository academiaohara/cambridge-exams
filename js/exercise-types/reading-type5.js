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

  /** Matches "A) word" style options used in B1 reading cloze JSON. */
  function parseMcTextOption(opt) {
    var s = String(opt == null ? '' : opt).trim();
    var m = s.match(/^([A-Z])\)\s*(.*)$/);
    if (m) {
      var word = (m[2] != null ? String(m[2]) : '').trim();
      return { letter: m[1], word: word || m[1] };
    }
    return { letter: s.charAt(0) || '', word: s };
  }

  function isDuoInlineMcClozePart() {
    return typeof Utils !== 'undefined' && Utils.isDuoInlineMcClozeReading();
  }

  function wordFromQuestionOption(question, letter) {
    if (!letter || !question || !Array.isArray(question.options)) return letter || '';
    var L = String(letter).trim().toUpperCase();
    for (var i = 0; i < question.options.length; i++) {
      var p = parseMcTextOption(question.options[i]);
      if (p.letter === L) return p.word;
    }
    return letter;
  }

  function optionInnerHtmlNumbered(opt) {
    var p = parseMcTextOption(opt);
    return (
      '<span class="reading-type5-opt-line">' +
      '<span class="reading-type5-opt-word">' + escapeHtml(p.word) + '</span>' +
      '</span>'
    );
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

  function gapTriggerLabel(qNum, userAnswer, question) {
    var letter = (userAnswer || '').trim();
    if (!letter) return '(' + qNum + ')';
    if (isDuoInlineMcClozePart()) {
      var w = wordFromQuestionOption(question, letter) || letter;
      return '(' + qNum + ') ' + w;
    }
    return letter;
  }

  window.ReadingType5 = {
    /**
     * Inline cloze gap in the passage: tap to open a panel with all options (4 or 5).
     * Uses only phrasing elements so markup stays valid inside <p>.
     */
    renderInlineGap: function(question, qNum, isChecked, userAnswer) {
      var options = question.options || ['A', 'B', 'C', 'D'];
      var b1r5 = isDuoInlineMcClozePart();
      var ua = userAnswer;
      var viewCorrect =
        typeof AppState !== 'undefined' && AppState.answerViewMode === 'correct';
      var showAnswerKey = isChecked && b1r5 && viewCorrect;
      var label;
      if (showAnswerKey) {
        var keyWord = wordFromQuestionOption(question, question.correct) || question.correct;
        label = '(' + qNum + ') ' + keyWord;
      } else {
        label = gapTriggerLabel(qNum, userAnswer, question);
      }
      var triggerDisabled = isChecked ? ' disabled' : '';
      var choicesHtml = '';
      options.forEach(function(opt) {
        var letter = parseMcTextOption(opt).letter;
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
        var choiceBody = b1r5 ? optionInnerHtmlNumbered(opt) : escapeHtml(opt);
        choicesHtml +=
          '<button type="button" class="' + choiceCls + '" data-letter="' + escapeHtml(letter) + '"' + onpick + '>' +
          choiceBody +
          '</button>';
      });
      var trigCls = 'reading-type5-gap-trigger';
      if (isChecked) {
        trigCls += ' disabled';
        if (b1r5) {
          if (showAnswerKey) {
            trigCls += ' reading-type5-gap-trigger-show-correct';
          } else if (ua === question.correct) {
            trigCls += ' correct';
          } else {
            trigCls += ' incorrect';
          }
        } else if (ua === question.correct) {
          trigCls += ' correct';
        } else if (ua) {
          trigCls += ' incorrect';
        } else {
          trigCls += ' unanswered-checked';
        }
      } else if (userAnswer) {
        trigCls += ' filled';
      }
      var onTrig = isChecked
        ? ''
        : ' onclick="event.stopPropagation(); ReadingType5.toggleGapPopover(event, ' + qNum + ')"';
      var wrapTooltip = '';
      if (isChecked && b1r5 && !showAnswerKey && ua !== question.correct) {
        var tipWord = wordFromQuestionOption(question, question.correct) || question.correct;
        var hint = typeof Utils !== 'undefined' && Utils.correctHintText
          ? Utils.correctHintText(tipWord)
          : tipWord;
        wrapTooltip = ' data-correct="' + escapeHtml(hint) + '"';
      }
      return (
        '<span class="reading-type5-gap-wrap" data-qnum="' + qNum + '"' + wrapTooltip + '>' +
        '<button type="button" class="' + trigCls + '" aria-haspopup="listbox" aria-expanded="false"' +
        triggerDisabled + onTrig + '>' + escapeHtml(label) + '</button>' +
        '<span class="reading-type5-gap-panel" role="listbox" aria-label="Question ' + qNum + '">' +
        '<span class="reading-type5-gap-panel-options">' + choicesHtml + '</span>' +
        '</span>' +
        '</span>'
      );
    },

    /** B1 Reading Part 5 “Questions” tab: question number + options on one row. */
    renderQuestionRow: function(question, qNum, isChecked, userAnswer) {
      var numClass = 'reading-type5-question-number';
      if (typeof Utils !== 'undefined') {
        var stateClass = Utils.getQuestionNumberStateClass({
          answer: userAnswer,
          correct: question.correct,
          isChecked: isChecked,
          questionType: 'multiple-choice-text'
        });
        if (stateClass) numClass += ' ' + stateClass;
      }
      return (
        '<div class="reading-type5-question reading-type5-cloze-row">' +
        '<div class="reading-type5-cloze-row-inner">' +
        '<div class="' + numClass + '" data-qnum="' + qNum + '">' + qNum + '</div>' +
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
      var numClass = 'reading-type5-question-number';
      if (typeof Utils !== 'undefined') {
        var stateClass = Utils.getQuestionNumberStateClass({
          answer: userAnswer,
          correct: question.correct,
          isChecked: isChecked,
          questionType: 'multiple-choice-text'
        });
        if (stateClass) numClass += ' ' + stateClass;
      }
      const questionBlock = `
        <div class="reading-type5-question">
          <div class="reading-type5-question-header">
            <div class="${numClass}" data-qnum="${qNum}">${qNum}</div>
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
      const b1r5 = isDuoInlineMcClozePart();
      const viewKey =
        isChecked && b1r5 && typeof AppState !== 'undefined' && AppState.answerViewMode === 'correct';
      options.forEach(function(opt, idx) {
        const letter = parseMcTextOption(opt).letter;
        const checked = userAnswer === letter ? 'checked' : '';
        let labelClass = '';
        if (isChecked) {
          if (viewKey) {
            if (letter === question.correct) labelClass = 'reading-type5-option-key';
          } else {
            labelClass =
              letter === question.correct ? 'correct' : userAnswer === letter ? 'incorrect' : '';
          }
        }
        const inner = b1r5 ? optionInnerHtmlNumbered(opt) : '<span>' + escapeHtml(opt) + '</span>';

        html += `
          <label class="reading-type5-option ${labelClass} ${isChecked ? 'disabled' : ''}">
            <input type="radio" name="q${qNum}" value="${letter}" ${checked} ${isChecked ? 'disabled' : ''}
                   onchange="ReadingType5.selectAnswer(${qNum}, '${letter}')">
            ${inner}
          </label>
        `;
      });
      return html;
    },

    /**
     * When active exercise is B1 Reading Part 5, returns HTML (option word only)
     * for explanation panels; otherwise returns null so callers keep the raw option string.
     */
    explanationOptionHtml: function(opt) {
      if (!isDuoInlineMcClozePart()) return null;
      return optionInnerHtmlNumbered(opt);
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
        ReadingType5.positionGapPanel(wrap);
        ReadingType5._bindGapPanelReposition();
      }
    },

    _gapPanelRepositionBound: false,
    _bindGapPanelReposition: function() {
      if (ReadingType5._gapPanelRepositionBound) return;
      ReadingType5._gapPanelRepositionBound = true;
      var reposition = function(ev) {
        var open = document.querySelector('.reading-type5-gap-wrap.reading-type5-gap-open');
        if (!open) return;
        if (ev && ev.type === 'resize') {
          ReadingType5.resetGapPanelWidth(open);
          ReadingType5.positionGapPanel(open);
          return;
        }
        ReadingType5.updateGapPanelPosition(open);
      };
      window.addEventListener('resize', reposition);
      window.addEventListener('scroll', reposition, true);
    },

    _getExerciseToolsSidebarWidth: function() {
      var layout = document.querySelector('.dashboard-layout--exercise:not(.dashboard-layout-right-closed)');
      if (!layout) return 0;
      var sidebar = layout.querySelector(
        '.dashboard-right-sidebar--tools, #dashboardRightSidebarTools, .dashboard-right-sidebar'
      );
      if (!sidebar) return 0;
      var rect = sidebar.getBoundingClientRect();
      if (!rect.width || rect.left >= window.innerWidth) return 0;
      return Math.max(0, window.innerWidth - rect.left);
    },

    _measureGapPanelWidth: function(panel, vw, margin) {
      var minW = 132;
      var maxW = Math.min(280, vw - margin * 2);
      var maxChoice = 0;
      panel.querySelectorAll('.reading-type5-gap-choice').forEach(function(btn) {
        btn.style.width = 'max-content';
        maxChoice = Math.max(maxChoice, btn.scrollWidth || btn.offsetWidth || 0);
        btn.style.width = '';
      });
      var shell = 24;
      return Math.min(maxW, Math.max(minW, maxChoice + shell));
    },

    _lockGapPanelWidth: function(panel, vw, margin) {
      var popW = ReadingType5._measureGapPanelWidth(panel, vw, margin);
      panel.setAttribute('data-rt5-width', String(popW));
      panel.style.width = popW + 'px';
      panel.style.minWidth = popW + 'px';
      panel.style.maxWidth = popW + 'px';
      return popW;
    },

    resetGapPanelWidth: function(wrap) {
      var panel = wrap && wrap.querySelector('.reading-type5-gap-panel');
      if (!panel) return;
      panel.removeAttribute('data-rt5-width');
      panel.style.width = '';
      panel.style.minWidth = '';
      panel.style.maxWidth = '';
    },

    updateGapPanelPosition: function(wrap) {
      var panel = wrap && wrap.querySelector('.reading-type5-gap-panel');
      var trig = wrap && wrap.querySelector('.reading-type5-gap-trigger');
      if (!panel || !trig || !panel.classList.contains('reading-type5-gap-panel--fixed')) return;

      var gap = 8;
      var margin = 12;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var rect = trig.getBoundingClientRect();
      var sidebarW = ReadingType5._getExerciseToolsSidebarWidth();
      var availRight = vw - sidebarW - margin;
      var popW = parseInt(panel.getAttribute('data-rt5-width'), 10) || parseInt(panel.style.width, 10) || 200;
      var popH = panel.offsetHeight || 180;

      var left = rect.left;
      var top = rect.bottom + gap;
      var opensAbove = false;

      if (left + popW > availRight) left = Math.max(margin, availRight - popW);
      if (left < margin) left = margin;

      if (top + popH > vh - margin) {
        top = rect.top - popH - gap;
        opensAbove = true;
      }
      if (top < margin) top = margin;

      var triggerCenter = rect.left + rect.width / 2;
      var arrowLeft = Math.max(16, Math.min(popW - 16, triggerCenter - left - 6));

      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.setProperty('--rt5-gap-arrow-left', arrowLeft + 'px');
      panel.classList.toggle('reading-type5-gap-panel--above', opensAbove);
    },

    positionGapPanel: function(wrap) {
      var panel = wrap && wrap.querySelector('.reading-type5-gap-panel');
      var trig = wrap && wrap.querySelector('.reading-type5-gap-trigger');
      if (!panel || !trig) return;

      panel.classList.add('reading-type5-gap-panel--fixed');
      panel.style.visibility = 'hidden';
      panel.style.pointerEvents = 'none';

      var margin = 12;
      var vw = window.innerWidth;
      var popW;
      if (panel.getAttribute('data-rt5-width')) {
        popW = parseInt(panel.getAttribute('data-rt5-width'), 10) || 200;
        panel.style.width = popW + 'px';
        panel.style.minWidth = popW + 'px';
        panel.style.maxWidth = popW + 'px';
      } else {
        popW = ReadingType5._lockGapPanelWidth(panel, vw, margin);
      }

      ReadingType5.updateGapPanelPosition(wrap);

      panel.style.visibility = '';
      panel.style.pointerEvents = '';
    },

    resetGapPanelPosition: function(wrap) {
      var panel = wrap && wrap.querySelector('.reading-type5-gap-panel');
      if (!panel) return;
      panel.classList.remove('reading-type5-gap-panel--fixed', 'reading-type5-gap-panel--above');
      panel.style.left = '';
      panel.style.top = '';
      panel.style.width = '';
      panel.style.minWidth = '';
      panel.style.maxWidth = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.visibility = '';
      panel.style.pointerEvents = '';
      panel.style.removeProperty('--rt5-gap-arrow-left');
      panel.removeAttribute('data-rt5-width');
    },

    closeAllGapPopovers: function() {
      document.querySelectorAll('.reading-type5-gap-wrap.reading-type5-gap-open').forEach(function(w) {
        w.classList.remove('reading-type5-gap-open');
        ReadingType5.resetGapPanelPosition(w);
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
      var question = null;
      if (typeof AppState !== 'undefined' && AppState.currentExercise && AppState.currentExercise.content) {
        var qs = AppState.currentExercise.content.questions || [];
        for (var i = 0; i < qs.length; i++) {
          if (qs[i].number === qNum) {
            question = qs[i];
            break;
          }
        }
      }
      var b1r5 = isDuoInlineMcClozePart();
      if (checked && b1r5 && question) {
        var viewCorrect = typeof AppState !== 'undefined' && AppState.answerViewMode === 'correct';
        if (viewCorrect) {
          var keyWord = wordFromQuestionOption(question, question.correct) || question.correct;
          btn.textContent = '(' + qNum + ') ' + keyWord;
          btn.classList.remove('correct', 'incorrect', 'unanswered-checked', 'filled');
          btn.classList.add('reading-type5-gap-trigger-show-correct');
          wrap.removeAttribute('data-correct');
        } else {
          btn.textContent = gapTriggerLabel(qNum, letter, question);
          btn.classList.remove('reading-type5-gap-trigger-show-correct', 'filled');
          if (letter === question.correct) {
            btn.classList.add('correct');
            btn.classList.remove('incorrect');
            wrap.removeAttribute('data-correct');
          } else {
            btn.classList.add('incorrect');
            btn.classList.remove('correct');
            var tipW = wordFromQuestionOption(question, question.correct) || question.correct;
            var hintW = typeof Utils !== 'undefined' && Utils.correctHintText
              ? Utils.correctHintText(tipW)
              : tipW;
            wrap.setAttribute('data-correct', hintW);
          }
        }
        return;
      }

      btn.textContent = gapTriggerLabel(qNum, letter, question);
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
            trig.classList.remove(
              'correct',
              'incorrect',
              'unanswered-checked',
              'filled',
              'reading-type5-gap-trigger-show-correct'
            );
            var b1r5 = isDuoInlineMcClozePart();
            if (b1r5) {
              wrap.removeAttribute('data-correct');
              if (userAnswer === q.correct) {
                trig.classList.add('correct');
              } else {
                trig.classList.add('incorrect');
                var tipW = wordFromQuestionOption(q, q.correct) || q.correct;
                var hintW = typeof Utils !== 'undefined' && Utils.correctHintText
                  ? Utils.correctHintText(tipW)
                  : tipW;
                wrap.setAttribute('data-correct', hintW);
              }
            } else if (userAnswer === q.correct) {
              trig.classList.add('correct');
            } else if (userAnswer) {
              trig.classList.add('incorrect');
            } else {
              trig.classList.add('unanswered-checked');
            }
            trig.textContent = gapTriggerLabel(q.number, userAnswer || '', q);
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
    },

    /**
     * B1 Reading Part 5: footer toggle swaps passage gaps and Questions tab between
     * the student's marked answers and the key "(n) word" in purple.
     */
    setAnswerMode: function(mode) {
      if (!AppState.currentExercise || !AppState.answersChecked) return;
      if (!isDuoInlineMcClozePart()) return;
      var qs = AppState.currentExercise.content.questions || [];
      qs.forEach(function(q) {
        if (!q || q.number === 0) return;
        var wrap = document.querySelector('.reading-type5-gap-wrap[data-qnum="' + q.number + '"]');
        if (!wrap) return;
        var ua = (AppState.currentExercise.answers && AppState.currentExercise.answers[q.number]) || '';
        wrap.outerHTML = ReadingType5.renderInlineGap(q, q.number, true, ua);
      });
      var tqs = document.getElementById('toggle-questions-section');
      if (tqs && typeof ExerciseRenderer !== 'undefined' &&
        typeof ExerciseRenderer.renderToggleQuestions === 'function') {
        var pc = typeof CONFIG !== 'undefined' && CONFIG.getPartConfig
          ? CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart)
          : null;
        if (pc && pc.type === 'multiple-choice-text') {
          tqs.innerHTML = ExerciseRenderer.renderToggleQuestions(AppState.currentExercise, pc);
        }
      }
      ReadingType5.syncAllFromAppState();
    }
  };
})();
