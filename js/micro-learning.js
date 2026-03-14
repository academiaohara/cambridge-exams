// js/micro-learning.js
// TikTok-style scrollable micro-learning mode

(function() {
  var STORAGE_KEY = 'cambridge_microlearning';

  window.MicroLearning = {
    cards: [],
    currentIndex: 0,
    answered: [],
    isOpen: false,

    open: async function() {
      this.isOpen = true;
      this.cards = [];
      this.currentIndex = 0;
      this.answered = [];

      // Load questions from available exercises
      await this._loadCards();

      if (this.cards.length === 0) {
        alert('No micro-learning questions available yet. Make sure you have exercises loaded.');
        this.isOpen = false;
        return;
      }

      this._render();
    },

    close: function() {
      this.isOpen = false;
      var overlay = document.getElementById('micro-learning-overlay');
      if (overlay) overlay.remove();
    },

    _loadCards: async function() {
      var self = this;
      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];

      for (var i = 0; i < exams.length && self.cards.length < 20; i++) {
        var exam = exams[i];
        if (exam.status !== 'available') continue;

        // Load reading Part 1 (multiple choice cloze) questions
        try {
          var r = await fetch('Nivel/' + level + '/Exams/' + exam.id + '/reading1.json');
          if (r.ok) {
            var data = await r.json();
            if (data.content && data.content.questions) {
              data.content.questions.forEach(function(q) {
                self.cards.push({
                  type: 'mc',
                  source: 'Reading Part 1',
                  examId: exam.id,
                  questionNumber: q.number,
                  text: data.content.text ? self._getContextSnippet(data.content.text, q.number) : null,
                  options: q.options,
                  correct: q.correct,
                  explanation: q.explanation || ''
                });
              });
            }
          }
        } catch (e) { /* continue */ }

        // Load reading Part 4 (key word transformations)
        try {
          var r4 = await fetch('Nivel/' + level + '/Exams/' + exam.id + '/reading4.json');
          if (r4.ok) {
            var data4 = await r4.json();
            if (data4.content && data4.content.questions) {
              data4.content.questions.forEach(function(q) {
                self.cards.push({
                  type: 'transform',
                  source: 'Part 4 – Key Word Transformations',
                  examId: exam.id,
                  questionNumber: q.number,
                  sentence: q.sentence || '',
                  keyWord: q.keyWord || '',
                  gapped: q.gapped || '',
                  answer: (q.routes || [{ answer: q.answer }])[0].answer || '',
                  explanation: q.explanation || ''
                });
              });
            }
          }
        } catch (e) { /* continue */ }
      }

      // Shuffle cards
      for (var i = self.cards.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = self.cards[i];
        self.cards[i] = self.cards[j];
        self.cards[j] = tmp;
      }

      // Cap at 20 cards per session
      self.cards = self.cards.slice(0, 20);
    },

    _getContextSnippet: function(text, questionNum) {
      if (!text) return null;
      // Text uses || as paragraph separator, gaps are (1), (2) etc.
      var parts = text.split('||');
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].indexOf('(' + questionNum + ')') !== -1) {
          return parts[i].replace(/\|+/g, ' ').trim();
        }
      }
      return null;
    },

    _render: function() {
      var existing = document.getElementById('micro-learning-overlay');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'micro-learning-overlay';
      overlay.className = 'ml-overlay';
      overlay.innerHTML = this._buildHTML();
      document.body.appendChild(overlay);

      requestAnimationFrame(function() {
        overlay.classList.add('ml-overlay-visible');
      });

      this._renderCurrentCard();
    },

    _buildHTML: function() {
      return '<div class="ml-container">' +
        '<div class="ml-header">' +
          '<button class="ml-close-btn" onclick="MicroLearning.close()" aria-label="Close micro-learning">' +
            '<i class="fas fa-times"></i>' +
          '</button>' +
          '<div class="ml-title"><span class="material-symbols-outlined">bolt</span> Micro-Learning</div>' +
          '<div class="ml-progress-text" id="ml-progress-text">1/' + this.cards.length + '</div>' +
        '</div>' +
        '<div class="ml-progress-bar-wrapper">' +
          '<div class="ml-progress-bar" id="ml-progress-bar" style="width:0%"></div>' +
        '</div>' +
        '<div class="ml-cards-viewport">' +
          '<div class="ml-card-slot" id="ml-card-slot"></div>' +
        '</div>' +
        '<div class="ml-footer">' +
          '<div class="ml-stats" id="ml-stats">0 correct · 0 incorrect</div>' +
        '</div>' +
      '</div>';
    },

    _renderCurrentCard: function() {
      var slot = document.getElementById('ml-card-slot');
      if (!slot) return;

      var i = this.currentIndex;
      if (i >= this.cards.length) {
        this._renderComplete();
        return;
      }

      var card = this.cards[i];
      var progress = Math.round(((i) / this.cards.length) * 100);

      var progressBar = document.getElementById('ml-progress-bar');
      var progressText = document.getElementById('ml-progress-text');
      if (progressBar) progressBar.style.width = progress + '%';
      if (progressText) progressText.textContent = (i + 1) + '/' + this.cards.length;

      var html = '';
      if (card.type === 'mc') {
        html = this._renderMCCard(card, i);
      } else if (card.type === 'transform') {
        html = this._renderTransformCard(card, i);
      }

      var cardEl = document.createElement('div');
      cardEl.className = 'ml-card ml-card-enter';
      cardEl.innerHTML = html;
      slot.innerHTML = '';
      slot.appendChild(cardEl);

      requestAnimationFrame(function() {
        cardEl.classList.remove('ml-card-enter');
        cardEl.classList.add('ml-card-visible');
      });
    },

    _renderMCCard: function(card, idx) {
      var optionsHTML = (card.options || []).map(function(opt) {
        return '<button class="ml-option-btn" onclick="MicroLearning.answerMC(' + idx + ', \'' + opt.charAt(0) + '\')">' +
          opt + '</button>';
      }).join('');

      var contextHTML = card.text
        ? '<div class="ml-context">' + card.text + '</div>'
        : '';

      return '<div class="ml-card-source">' + card.source + '</div>' +
        contextHTML +
        '<div class="ml-question">Choose the correct word for gap <strong>(' + card.questionNumber + ')</strong>:</div>' +
        '<div class="ml-options">' + optionsHTML + '</div>' +
        '<div class="ml-feedback" id="ml-feedback-' + idx + '" style="display:none;"></div>';
    },

    _renderTransformCard: function(card, idx) {
      return '<div class="ml-card-source">' + card.source + '</div>' +
        '<div class="ml-question">' +
          '<div class="ml-transform-sentence">' + (card.sentence || '') + '</div>' +
          '<div class="ml-transform-keyword">Key word: <strong>' + card.keyWord + '</strong></div>' +
          '<div class="ml-transform-gapped">' + (card.gapped || '') + '</div>' +
        '</div>' +
        '<div class="ml-transform-answer-area">' +
          '<input class="ml-transform-input" id="ml-transform-input-' + idx + '" type="text" placeholder="Type your answer..." />' +
          '<button class="ml-submit-btn" onclick="MicroLearning.answerTransform(' + idx + ')">Check</button>' +
        '</div>' +
        '<div class="ml-feedback" id="ml-feedback-' + idx + '" style="display:none;"></div>';
    },

    answerMC: function(idx, chosen) {
      var card = this.cards[idx];
      if (!card) return;

      var isCorrect = chosen === card.correct;
      this.answered.push({ idx: idx, correct: isCorrect });

      var feedbackEl = document.getElementById('ml-feedback-' + idx);
      var buttons = document.querySelectorAll('.ml-option-btn');

      buttons.forEach(function(btn) {
        btn.disabled = true;
        if (btn.textContent.startsWith(card.correct)) {
          btn.classList.add('ml-option-correct');
        }
        if (btn.textContent.startsWith(chosen) && !isCorrect) {
          btn.classList.add('ml-option-wrong');
        }
      });

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'ml-feedback ml-feedback-correct';
          feedbackEl.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Correct! ' + (card.explanation || '');
        } else {
          feedbackEl.className = 'ml-feedback ml-feedback-wrong';
          feedbackEl.innerHTML = '<span class="material-symbols-outlined">cancel</span> The correct answer is <strong>' + card.correct + '</strong>. ' + (card.explanation || '');
          this._vibrate();
        }
        feedbackEl.style.display = 'block';
      }

      this._updateStats();
      this._scheduleNext(isCorrect);
    },

    answerTransform: function(idx) {
      var card = this.cards[idx];
      if (!card) return;

      var input = document.getElementById('ml-transform-input-' + idx);
      if (!input) return;

      var userAnswer = input.value.trim().toLowerCase();
      var correctAnswer = (card.answer || '').toLowerCase();
      var isCorrect = userAnswer === correctAnswer ||
        userAnswer.replace(/[(),]/g, '').trim() === correctAnswer.replace(/[(),]/g, '').trim();

      this.answered.push({ idx: idx, correct: isCorrect });

      var feedbackEl = document.getElementById('ml-feedback-' + idx);
      input.disabled = true;

      if (feedbackEl) {
        if (isCorrect) {
          feedbackEl.className = 'ml-feedback ml-feedback-correct';
          feedbackEl.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Correct! ' + (card.explanation || '');
        } else {
          feedbackEl.className = 'ml-feedback ml-feedback-wrong';
          feedbackEl.innerHTML = '<span class="material-symbols-outlined">cancel</span> Expected: <strong>' + card.answer + '</strong>. ' + (card.explanation || '');
          this._vibrate();
        }
        feedbackEl.style.display = 'block';
      }

      this._updateStats();
      this._scheduleNext(isCorrect);
    },

    _scheduleNext: function(wasCorrect) {
      var delay = wasCorrect ? 1000 : 2500;
      var self = this;
      setTimeout(function() {
        self.currentIndex++;
        self._animateNext();
      }, delay);
    },

    _animateNext: function() {
      var slot = document.getElementById('ml-card-slot');
      if (!slot) return;
      var card = slot.querySelector('.ml-card');
      if (card) {
        card.classList.add('ml-card-exit');
        var self = this;
        setTimeout(function() {
          self._renderCurrentCard();
        }, 300);
      } else {
        this._renderCurrentCard();
      }
    },

    _vibrate: function() {
      var slot = document.getElementById('ml-card-slot');
      if (slot) {
        slot.classList.add('ml-vibrate');
        setTimeout(function() { slot.classList.remove('ml-vibrate'); }, 400);
      }
      if (navigator.vibrate) navigator.vibrate(200);
    },

    _updateStats: function() {
      var statsEl = document.getElementById('ml-stats');
      if (!statsEl) return;
      var correct = this.answered.filter(function(a) { return a.correct; }).length;
      var incorrect = this.answered.length - correct;
      statsEl.textContent = correct + ' correct · ' + incorrect + ' incorrect';
    },

    _renderComplete: function() {
      var slot = document.getElementById('ml-card-slot');
      if (!slot) return;

      var total = this.cards.length;
      var correct = this.answered.filter(function(a) { return a.correct; }).length;
      var pct = total > 0 ? Math.round((correct / total) * 100) : 0;

      // Record streak activity
      if (typeof StreakManager !== 'undefined') {
        StreakManager.recordActivity();
      }

      slot.innerHTML = '<div class="ml-complete">' +
        '<div class="ml-complete-icon"><span class="material-symbols-outlined">celebration</span></div>' +
        '<div class="ml-complete-title">Session Complete!</div>' +
        '<div class="ml-complete-score">' + correct + '/' + total + ' correct</div>' +
        '<div class="ml-complete-pct">' + pct + '%</div>' +
        '<button class="ml-btn-primary" onclick="MicroLearning.close()">Back to Dashboard</button>' +
        '<button class="ml-btn-secondary" onclick="MicroLearning.open()">Play Again</button>' +
      '</div>';

      var progressBar = document.getElementById('ml-progress-bar');
      if (progressBar) progressBar.style.width = '100%';
    }
  };
})();
