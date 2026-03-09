// js/exercise-types/reading-type7.js
// Gapped text - Part 7

(function() {
  window.ReadingType7 = {
    renderGap: function(question, qNum, isChecked, userAnswer) {
      if (qNum === 0) {
        return `
          <span class="reading-type7-gap">
            <span class="reading-type7-example-answer">${userAnswer || ''}</span>
          </span>
        `;
      }
      const paragraphs = AppState.currentExercise.content.paragraphs || {};
      
      if (isChecked) {
        const isCorrect = this.isAnswerCorrect(question, userAnswer);
        const chosenText = userAnswer ? (paragraphs[userAnswer] || '') : '';
        const pillClass = isCorrect ? 'reading-type7-gap-pill correct' : 'reading-type7-gap-pill incorrect';
        const circleColor = isCorrect ? '#065f46' : '#ef4444';

        let html = `<span class="reading-type7-gap" data-qnum="${qNum}">`;
        html += `<span class="reading-type7-gap-check-row"${!isCorrect ? ` data-correct="✓ ${question.correct}"` : ''}>`;
        html += `<span class="${pillClass}">`;
        html += `<span class="reading-type7-gap-num">${qNum}</span>`;
        html += `<span class="reading-type7-gap-circle" style="color:${circleColor}">${userAnswer || '—'}</span>`;
        html += `</span>`;
        if (!isCorrect) {
          html += `<button class="reading-type7-reveal-btn" onclick="ReadingType7.toggleReveal(${qNum}, this)" data-revealed="false">`;
          html += `<i class="fas fa-eye"></i>`;
          html += `<span class="reading-type7-correct-circle">${question.correct}</span>`;
          html += `</button>`;
        }
        html += `</span>`;
        html += `<span class="reading-type7-answer-block ${isCorrect ? 'correct' : 'incorrect'}" data-qnum-block="${qNum}">`;
        if (userAnswer) {
          html += `<span class="reading-type7-para-text">${this._escapeHtml(chosenText)}</span>`;
        } else {
          html += `<span class="reading-type7-para-empty">${I18n.t('noAnswer') || '—'}</span>`;
        }
        html += `</span></span>`;
        return html;
      }
      
      const paraText = userAnswer ? (paragraphs[userAnswer] || '') : '';
      
      return `
        <span class="reading-type7-gap" data-qnum="${qNum}">
          <span class="reading-type7-gap-pill${userAnswer ? ' has-value' : ''}"
                onclick="ReadingType7.openSelectModal(${qNum})">
            <span class="reading-type7-gap-num">${qNum}</span>
            <span class="reading-type7-gap-circle">${userAnswer || '?'}</span>
          </span>
          ${userAnswer ? `<span class="reading-type7-selected-text">${this._escapeHtml(paraText)}</span>` : ''}
        </span>
      `;
    },
    
    openSelectModal: function(qNum) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      if (window.Tools) Tools.closeSidebar();
      
      const paragraphs = AppState.currentExercise.content.paragraphs || {};
      const overlay = document.getElementById('exercise-modal-overlay');
      const body = document.getElementById('modal-body');
      if (!overlay || !body) return;
      
      let html = `<div class="modal-header"><h3>${I18n.t('question')} ${qNum}</h3><p>${I18n.t('selectOption')}</p></div>`;
      html += '<div class="options-grid">';
      Object.keys(paragraphs).forEach(key => {
        html += `<button class="opt-btn" onclick="ReadingType7.selectFromModal(${qNum}, '${key}')">${key}</button>`;
      });
      html += '</div>';
      body.innerHTML = html;
      overlay.style.display = 'flex';
    },
    
    selectFromModal: function(qNum, key) {
      const overlay = document.getElementById('exercise-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      ReadingType7.handleSelect(qNum, key);
    },
    
    toggleReveal: function(qNum, btn) {
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      if (!question) return;
      const paragraphs = AppState.currentExercise.content.paragraphs || {};
      const userAnswer = AppState.currentExercise.answers?.[qNum] || '';
      const block = document.querySelector(`.reading-type7-answer-block[data-qnum-block="${qNum}"]`);
      if (!block) return;
      
      const isRevealed = btn.dataset.revealed === 'true';
      if (!isRevealed) {
        const correctText = paragraphs[question.correct] || '';
        block.className = 'reading-type7-answer-block correct';
        block.innerHTML = `<span class="reading-type7-para-text">${ReadingType7._escapeHtml(correctText)}</span>`;
        btn.dataset.revealed = 'true';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fas fa-eye-slash';
      } else {
        const chosenText = userAnswer ? (paragraphs[userAnswer] || '') : '';
        block.className = 'reading-type7-answer-block incorrect';
        block.innerHTML = userAnswer
          ? `<span class="reading-type7-para-text">${ReadingType7._escapeHtml(chosenText)}</span>`
          : `<span class="reading-type7-para-empty">${I18n.t('noAnswer') || '—'}</span>`;
        btn.dataset.revealed = 'false';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fas fa-eye';
      }
    },
    
    handleSelect: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      
      // Update the gap display in place
      const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
      const gap = document.querySelector(`.reading-type7-gap[data-qnum="${qNum}"]`);
      if (gap && question) {
        const isChecked = AppState.answersChecked;
        gap.outerHTML = ReadingType7.renderGap(question, qNum, isChecked, value);
      }
      
      Timer.updateScoreDisplay();
    },
    
    isAnswerCorrect: function(question, userAnswer) {
      return userAnswer === question.correct;
    },
    
    _escapeHtml: function(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    
    checkAnswers: function() {
      const questions = AppState.currentExercise.content.questions;
      let correct = 0;
      
      questions.forEach(q => {
        const userAnswer = AppState.currentExercise.answers?.[q.number];
        const isCorrect = this.isAnswerCorrect(q, userAnswer);
        if (isCorrect) correct += 2;
        
        // Update gap display to show checked state with pill design
        const gap = document.querySelector(`.reading-type7-gap[data-qnum="${q.number}"]`);
        if (gap) {
          gap.outerHTML = ReadingType7.renderGap(q, q.number, true, userAnswer || '');
        }
      });
      
      return correct;
    }
  };
})();
