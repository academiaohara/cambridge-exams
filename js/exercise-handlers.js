// js/exercise-handlers.js
(function() {
  window.ExerciseHandlers = {
    handleTextGap: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    handleRadioGap: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    handleSelectGap: function(qNum, value) {
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      AppState.currentExercise.answers[qNum] = value;
      Timer.updateScoreDisplay();
    },
    
    checkAnswers: function() {
      if (!AppState.currentExercise) return;
      if (!AppState.currentExercise.answers) AppState.currentExercise.answers = {};
      
      AppState.answersChecked = true;
      const partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      
      let correct = 0;
      const questions = AppState.currentExercise.content.questions || [];
      
      // Usar el método específico del tipo si existe
      const typeChecker = this.getTypeChecker(partConfig.type);
      if (typeChecker && typeof typeChecker.checkAnswers === 'function') {
        correct = typeChecker.checkAnswers();
        // Re-render type-specific content to reflect checked state (e.g. correct/incorrect classes)
        if (typeof typeChecker.reRender === 'function') {
          typeChecker.reRender();
        }
      } else {
        // Fallback al método genérico
        const marksPerQ = partConfig.maxMarks && partConfig.total ? Math.round(partConfig.maxMarks / partConfig.total) : 1;
        questions.forEach(q => {
          const userAnswer = AppState.currentExercise.answers[q.number];
          const isCorrect = Utils.compareAnswers(userAnswer, q.correct, partConfig.type);
          if (isCorrect) correct += marksPerQ;
          
          this.markAnswerVisual(q.number, userAnswer, q.correct, isCorrect, partConfig);
        });
      }
      
      // Store the actual score (may include partial marks) before updateScoreDisplay overrides it
      AppState.currentPartScore = correct;
      
      Timer.updateScoreDisplay();
      
      const checkBtn = document.querySelector('.btn-check');
      if (checkBtn) checkBtn.disabled = true;
      
      this.disableAllInputs(partConfig);
      
      if (AppState.currentExamId && AppState.currentSection && AppState.currentPart) {
        Exercise.markPartCompleted(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
        
        // Update part navigation to show completed state
        this.updatePartNavigation();
      }
      
      Exercise.savePartState();
      
      // Update question nav row cells to reflect checked state
      if (typeof QuestionNav !== 'undefined') {
        QuestionNav.updateAllNavCells();
        if (QuestionNav.currentQNum !== null) {
          QuestionNav.openQuestion(QuestionNav.currentQNum);
        }
      }
      
      // For types 5, 6, 8: auto-switch to questions view after correction so user sees results
      const autoSwitchTypes = ['multiple-choice-text', 'cross-text-matching', 'multiple-matching'];
      if (autoSwitchTypes.includes(partConfig.type) && typeof ExerciseRenderer !== 'undefined') {
        ExerciseRenderer.toggleView('questions');
      }

      // For reading parts 5–8 and listening: reveal the explanation toggle button in the toggle-view-header
      if ((AppState.currentSection === 'reading' && AppState.currentPart >= 5) || AppState.currentSection === 'listening') {
        const explBtn = document.getElementById('toggle-explanation-btn');
        if (explBtn) explBtn.style.display = '';
      }

      // For parts 1–3 and listening: reveal the footer explanation button
      const footerExplBtn = document.querySelector('.btn-explanations');
      if (footerExplBtn) footerExplBtn.style.display = '';
    },
    
    updatePartNavigation: function() {
      if (window.MixedTest && MixedTest.isActive()) {
        const plan = AppState.mixedTestPlan;
        const level = AppState.currentLevel || 'C1';
        document.querySelectorAll('.part-nav-cell[data-plan-index]').forEach(cell => {
          const planIdx = parseInt(cell.getAttribute('data-plan-index'));
          const item = plan && plan[planIdx];
          if (!item) return;
          const exam = EXAMS_DATA[level]?.find(e => e.id === item.examId);
          const isCompleted = exam ? (exam.sections[item.section]?.completed || []).includes(item.part) : false;
          if (isCompleted) cell.classList.add('completed');
        });
        return;
      }
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === AppState.currentExamId);
      if (!exam) return;
      const completedParts = exam.sections[AppState.currentSection]?.completed || [];
      
      document.querySelectorAll('.part-nav-cell').forEach(cell => {
        const partNum = parseInt(cell.getAttribute('data-part'));
        if (completedParts.includes(partNum)) {
          cell.classList.add('completed');
        }
      });
    },
    
    getTypeChecker: function(type) {
      const typeMap = {
        'multiple-choice': AppState.currentSection === 'listening' ? window.ListeningType1 : window.ReadingType1,
        'open-cloze': window.ReadingType2,
        'word-formation': window.ReadingType3,
        'transformations': window.ReadingType4,
        'multiple-choice-text': AppState.currentSection === 'listening' ? window.ListeningType1 : window.ReadingType5,
        'sentence-completion': window.ListeningType2,
        'cross-text-matching': window.ReadingType6,
        'gapped-text': window.ReadingType7,
        'multiple-matching': window.ReadingType8,
        'dual-matching': window.ListeningType4,
        'interview': window.SpeakingType,
        'long-turn': window.SpeakingType,
        'collaborative': window.SpeakingType,
        'discussion': window.SpeakingType
      };
      return typeMap[type];
    },
    
    markAnswerVisual: function(qNum, userAnswer, correctAnswer, isCorrect, partConfig) {
      switch(partConfig.type) {
        case 'multiple-choice':
        case 'cross-text-matching':
        case 'multiple-matching':
          const answerSpan = document.getElementById(`answer-${qNum}`);
          if (answerSpan) {
            const gapBox = answerSpan.closest('.gap-box');
            if (gapBox) {
              gapBox.classList.add('checked');
              gapBox.classList.add(isCorrect ? 'correct' : 'incorrect');
              
              if (!isCorrect) {
                const question = AppState.currentExercise.content.questions.find(q => q.number === qNum);
                const correctOption = question.options.find(opt => opt.startsWith(correctAnswer));
                const correctText = correctOption ? correctOption.substring(2).trim() : correctAnswer;
                gapBox.setAttribute('data-correct', `✓ ${correctText}`);
              }
            }
          }
          break;
          
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion':
        case 'transformations':
          const input = document.querySelector(`input[data-question="${qNum}"]`);
          if (input) {
            input.classList.add(isCorrect ? 'correct' : 'incorrect');
            input.disabled = true;
            if (!isCorrect) {
              input.setAttribute('title', `✓ ${correctAnswer}`);
              input.setAttribute('data-student-value', userAnswer || '');
              input.setAttribute('data-correct-raw', correctAnswer || '');
              input.setAttribute('data-correct-value', (correctAnswer || '').split(/\s*\/\s*/)[0].trim());
              input.setAttribute('data-check-class', 'incorrect');
              const anchor = input.closest('.gap-box') || input;
              const parent = anchor.parentNode;
              if (parent) {
                const existingBtn = parent.querySelector(`.ex-item-toggle-btn[data-question-toggle="${qNum}"]`);
                if (existingBtn) existingBtn.remove();
                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'ex-item-toggle-btn';
                toggleBtn.setAttribute('data-question-toggle', String(qNum));
                toggleBtn.setAttribute('data-mode', 'student');
                toggleBtn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> Show correct answer';
                toggleBtn.addEventListener('click', () => {
                  ExerciseHandlers.toggleInputAnswer(toggleBtn, input, correctAnswer || '');
                });
                parent.insertBefore(toggleBtn, anchor.nextSibling);
              }
            } else {
              input.setAttribute('data-check-class', 'correct');
            }
          }
          break;
          
        case 'multiple-choice-text':
          document.querySelectorAll(`input[name="q${qNum}"]`).forEach(radio => radio.disabled = true);
          break;
          
        case 'gapped-text':
          document.querySelector(`select[data-question="${qNum}"]`).disabled = true;
          break;
      }
    },

    toggleInputAnswer: function(btn, input, correctAnswer) {
      if (!btn || !input) return;
      const mode = btn.getAttribute('data-mode') || 'student';
      const toCorrect = mode === 'student';
      if (toCorrect) {
        const alts = this._parseInputAlternatives(correctAnswer);
        input.disabled = false;
        input.readOnly = true;
        input.value = alts[0] || '';
        input.classList.remove('correct', 'incorrect');
        input.classList.add('correct-shown', 'ex-input-correct-shown');
        this._attachInputAltBadge(input, alts);
        btn.setAttribute('data-mode', 'correct');
        btn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> Show your answer';
      } else {
        this._removeInputAltBadge(input);
        input.disabled = false;
        input.readOnly = true;
        input.value = input.getAttribute('data-student-value') || '';
        input.classList.remove('correct-shown', 'ex-input-correct-shown');
        const checkClass = input.getAttribute('data-check-class');
        if (checkClass) input.classList.add(checkClass);
        btn.setAttribute('data-mode', 'student');
        btn.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span> Show correct answer';
      }
    },

    _parseInputAlternatives: function(correctAnswer) {
      const raw = (correctAnswer || '').trim();
      if (!raw) return [''];
      const all = [];
      raw.split(/\s*\/\s*/).forEach(part => {
        this._expandOptionals(part.trim()).forEach(opt => {
          if (opt && all.indexOf(opt) === -1) all.push(opt);
        });
      });
      return all.length ? all : [''];
    },

    _expandOptionals: function(answer) {
      let results = [answer];
      const parenRegex = /\(([^)]*)\)/;
      let maxIter = 10;
      while (maxIter-- > 0) {
        let found = false;
        const next = [];
        results.forEach(result => {
          const match = result.match(parenRegex);
          if (!match) {
            next.push(result);
            return;
          }
          found = true;
          const before = result.substring(0, match.index);
          const inside = match[1];
          const after = result.substring(match.index + match[0].length);
          const withInside = (before + inside + after).replace(/\s+/g, ' ').trim();
          const withoutInside = (before + after).replace(/\s+/g, ' ').trim();
          next.push(withInside);
          if (withoutInside !== withInside) next.push(withoutInside);
        });
        results = next;
        if (!found) break;
      }
      return results;
    },

    _attachInputAltBadge: function(input, alts) {
      this._removeInputAltBadge(input);
      if (!alts || alts.length <= 1) return;
      input.setAttribute('data-alt-answers', JSON.stringify(alts));
      input.setAttribute('data-alt-idx', '0');
      const badge = document.createElement('span');
      badge.className = 'ex-alt-badge';
      badge.textContent = '1/' + alts.length;
      badge.title = 'Click to see next solution';
      badge.setAttribute('aria-label', 'Cycle through ' + alts.length + ' alternative solutions');
      badge.addEventListener('click', function() {
        ExerciseHandlers._cycleInputAlt(input);
      });
      input._exAltBadge = badge;
      const anchor = input.closest('.gap-box') || input;
      const parent = anchor.parentNode;
      if (parent) parent.insertBefore(badge, anchor.nextSibling);
      input._exAltClickHandler = function() { ExerciseHandlers._cycleInputAlt(input); };
      input.addEventListener('click', input._exAltClickHandler);
    },

    _cycleInputAlt: function(input) {
      const alts = JSON.parse(input.getAttribute('data-alt-answers') || '[]');
      if (alts.length <= 1) return;
      const idx = (parseInt(input.getAttribute('data-alt-idx') || '0', 10) + 1) % alts.length;
      input.setAttribute('data-alt-idx', String(idx));
      input.value = alts[idx];
      const badge = input._exAltBadge;
      if (badge) badge.textContent = (idx + 1) + '/' + alts.length;
    },

    _removeInputAltBadge: function(input) {
      if (!input) return;
      if (input._exAltBadge) {
        input._exAltBadge.remove();
        input._exAltBadge = null;
      }
      if (input._exAltClickHandler) {
        input.removeEventListener('click', input._exAltClickHandler);
        input._exAltClickHandler = null;
      }
      input.removeAttribute('data-alt-answers');
      input.removeAttribute('data-alt-idx');
    },
    
    disableAllInputs: function(partConfig) {
      switch(partConfig.type) {
        case 'multiple-choice':
          // New reading-type1 design uses onclick attributes, remove them
          document.querySelectorAll('.reading-type1-gap-slot').forEach(slot => {
            slot.style.pointerEvents = 'none';
          });
          document.querySelectorAll('.gap-box').forEach(box => {
            box.classList.add('checked');
            box.style.pointerEvents = 'none';
          });
          // Listening-type1 options
          document.querySelectorAll('.listening-type1-option').forEach(opt => {
            opt.classList.add('disabled');
            opt.style.pointerEvents = 'none';
          });
          break;

        case 'cross-text-matching':
        case 'multiple-matching':
          document.querySelectorAll('.gap-box').forEach(box => {
            box.classList.add('checked');
          });
          break;
          
        case 'word-formation':
          // Modal-based design for word formation - disable slot clicks
          document.querySelectorAll('.reading-type3-gap-slot').forEach(slot => {
            slot.style.pointerEvents = 'none';
          });
          document.querySelectorAll('.reading-type3-answered-word').forEach(word => {
            word.style.pointerEvents = 'none';
          });
          document.querySelectorAll('input.gap-input').forEach(input => input.disabled = true);
          break;

        case 'transformations':
          // Inline input design for transformations
          document.querySelectorAll('.reading-type4-inline-input').forEach(input => {
            input.disabled = true;
          });
          document.querySelectorAll('input.gap-input').forEach(input => input.disabled = true);
          break;

        case 'open-cloze':
        case 'sentence-completion':
          document.querySelectorAll('input.gap-input').forEach(input => input.disabled = true);
          break;
          
        case 'multiple-choice-text':
          document.querySelectorAll('input[type="radio"]').forEach(radio => radio.disabled = true);
          break;
          
        case 'gapped-text':
          document.querySelectorAll('select.paragraph-select').forEach(select => select.disabled = true);
          break;

        case 'essay':
        case 'choice':
          document.querySelectorAll('.writing-textarea').forEach(t => t.disabled = true);
          break;

        case 'dual-matching':
          document.querySelectorAll('.listening-type4-select').forEach(s => s.disabled = true);
          break;
      }
    },
    
    toggleExplanations: function() {
      const explanations = document.getElementById('explanations-section');
      if (explanations) {
        explanations.style.display = explanations.style.display === 'none' ? 'block' : 'none';
      }
    },

    toggleExplanationMode: function() {
      AppState.explanationMode = !AppState.explanationMode;
      const btn = document.getElementById('toggle-explanation-btn');
      const partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      const isPart7 = partConfig && partConfig.type === 'gapped-text';
      const isListening = AppState.currentSection === 'listening';

      if (AppState.explanationMode) {
        if (btn) btn.classList.add('explanation-active');

        const navRow = document.getElementById('question-nav-row');
        if (navRow) navRow.classList.add('explanation-mode');

        // Apply explanation mode paragraph styling
        const textContainer = document.getElementById('selectable-text');
        if (textContainer) textContainer.classList.add('explanation-mode-text');

        // Show explanations panel
        var panel = document.getElementById('explanations-panel');
        if (panel) panel.style.display = '';

        // Remove student highlights (keep their text but remove the highlight spans)
        this._removeStudentHighlights();

        if (isPart7) {
          // Part 7: switch to text view, show all explanations at once
          ExerciseRenderer.toggleView('text');
          if (typeof ReadingType7 !== 'undefined') ReadingType7.applyExplanationMode();
          // Add tooltips after applyExplanationMode creates new evidence-marker spans in gap texts
          this._addEvidenceTooltips();
          this._applyAllEvidenceHighlights();
          // Activate all explanation cards at once
          document.querySelectorAll('.explanation-card').forEach(function(card) {
            card.classList.add('explanation-active');
          });
        } else {
          // Add explanation tooltips to evidence markers
          this._addEvidenceTooltips();
          // Switch to text/transcript view, activate first question
          ExerciseRenderer.toggleView('text');
          var questions = this._getAllQuestions();
          if (questions.length > 0) {
            AppState.explanationActiveQuestion = questions[0].number;
            this._updateExplanationActiveQuestion(questions[0].number);
            this._applyEvidenceHighlight(questions[0].number);
          }
        }
      } else {
        if (btn) btn.classList.remove('explanation-active');

        const navRow = document.getElementById('question-nav-row');
        if (navRow) navRow.classList.remove('explanation-mode');

        // Remove explanation mode paragraph styling
        const textContainer = document.getElementById('selectable-text');
        if (textContainer) textContainer.classList.remove('explanation-mode-text');

        document.querySelectorAll('.question-nav-cell.explanation-active').forEach(function(cell) {
          cell.classList.remove('explanation-active');
        });

        // Hide explanations panel
        var panel = document.getElementById('explanations-panel');
        if (panel) panel.style.display = 'none';
        document.querySelectorAll('.explanation-card.explanation-active').forEach(function(card) {
          card.classList.remove('explanation-active');
        });

        this._clearEvidenceHighlights();
        this._removeEvidenceTooltips();

        // Restore all transcript extract visibility
        document.querySelectorAll('.transcript-extract').forEach(function(div) {
          div.style.display = '';
        });

        // Reverse Part 7 explanation mode changes
        if (isPart7 && typeof ReadingType7 !== 'undefined') {
          ReadingType7.removeExplanationMode();
        }

        // For listening: switch back to questions view
        if (isListening) {
          ExerciseRenderer.toggleView('questions');
        }

        const qDisplay = document.getElementById('explanation-question-display');
        if (qDisplay) qDisplay.style.display = 'none';

        AppState.explanationActiveQuestion = null;
      }
    },

    selectExplanationQuestion: function(qNum) {
      if (!AppState.explanationMode) return;
      // Part 7: all explanations shown at once, no individual selection
      const partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      if (partConfig && partConfig.type === 'gapped-text') return;

      AppState.explanationActiveQuestion = qNum;
      this._clearEvidenceHighlights();
      this._updateExplanationActiveQuestion(qNum);
      this._applyEvidenceHighlight(qNum);
    },

    _getAllQuestions: function() {
      var exercise = AppState.currentExercise;
      if (!exercise || !exercise.content) return [];
      if (exercise.content.questions && exercise.content.questions.length > 0) {
        return exercise.content.questions;
      }
      if (exercise.content.task1 && exercise.content.task2) {
        return (exercise.content.task1.questions || []).concat(exercise.content.task2.questions || []);
      }
      return [];
    },

    _removeStudentHighlights: function() {
      document.querySelectorAll('.text-highlight').forEach(function(span) {
        var parent = span.parentNode;
        if (parent) {
          var text = document.createTextNode(span.textContent);
          parent.replaceChild(text, span);
          parent.normalize();
        }
      });
      AppState.notes = [];
      AppState.notesIndex = 0;
    },

    _updateExplanationActiveQuestion: function(qNum) {
      // Update nav cells
      document.querySelectorAll('.question-nav-cell.explanation-active').forEach(function(cell) {
        cell.classList.remove('explanation-active');
      });

      var cell = document.querySelector('.question-nav-cell[data-qnum="' + qNum + '"]');
      if (cell) cell.classList.add('explanation-active');

      // Update explanation panel cards
      document.querySelectorAll('.explanation-card.explanation-active').forEach(function(card) {
        card.classList.remove('explanation-active');
      });
      var card = document.querySelector('.explanation-card[data-qnum="' + qNum + '"]');
      if (card) {
        card.classList.add('explanation-active');
      }

      var questions = this._getAllQuestions();
      var question = questions.find(function(q) { return q.number === qNum; });
      if (!question) return;

      // For listening: show only the relevant transcript extract or speaker
      if (AppState.currentSection === 'listening') {
        var exercise = AppState.currentExercise;
        if (exercise && exercise.content) {
          if (exercise.content.extracts && exercise.content.extracts.length > 0) {
            var extractId = question.extractId;
            if (extractId != null) {
              document.querySelectorAll('.transcript-extract[data-extract-id]').forEach(function(div) {
                div.style.display = (String(div.getAttribute('data-extract-id')) === String(extractId)) ? '' : 'none';
              });
            }
          } else if (exercise.content.audio_script) {
            if (exercise.content.task1 || exercise.content.task2) {
              // Dual-matching (Part 4): filter transcript to show only the relevant speaker
              var speakerIdx = -1;
              if (exercise.content.task1) {
                var idx1 = exercise.content.task1.questions.findIndex(function(q) { return q.number === qNum; });
                if (idx1 >= 0) speakerIdx = idx1;
              }
              if (speakerIdx === -1 && exercise.content.task2) {
                var idx2 = exercise.content.task2.questions.findIndex(function(q) { return q.number === qNum; });
                if (idx2 >= 0) speakerIdx = idx2;
              }
              document.querySelectorAll('.transcript-extract[data-speaker-index]').forEach(function(div) {
                div.style.display = (speakerIdx >= 0 && parseInt(div.getAttribute('data-speaker-index')) === speakerIdx + 1) ? '' : 'none';
              });
            }
            // For single audio_script exercises (e.g. Part 3), all transcript extracts remain visible
          }
        }
      }

      var qDisplay = document.getElementById('explanation-question-display');
      if (!qDisplay) return;
      qDisplay.style.display = '';

      // Apply sticky-mode for Listening parts 2-3 and Reading parts 5, 6, 8
      if ((AppState.currentSection === 'listening' && (AppState.currentPart === 2 || AppState.currentPart === 3)) ||
          (AppState.currentSection === 'reading' && (AppState.currentPart === 5 || AppState.currentPart === 6 || AppState.currentPart === 8))) {
        qDisplay.classList.add('sticky-mode');
      } else {
        qDisplay.classList.remove('sticky-mode');
      }

      // Offset sticky top to sit below the sticky header
      var header = document.querySelector('.main-header');
      if (header) {
        qDisplay.style.top = header.offsetHeight + 'px';
      }

      // Determine part type for layout
      var partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      var partType = partConfig ? partConfig.type : '';

      var html = '<span class="eq-number">' + qNum + '</span>';
      html += '<div class="eq-content">';

      // Add question text
      if (question.question) {
        html += '<span class="eq-question-text">' + question.question + '</span>';
      }

      // Add options based on part type
      var options = [];
      if ((partType === 'multiple-choice-text' || partType === 'multiple-choice') && question.options) {
        options = Array.isArray(question.options) ? question.options : [];
      } else if (partType === 'cross-text-matching' && question.options) {
        options = question.options;
      } else if (partType === 'multiple-matching') {
        var texts = AppState.currentExercise && AppState.currentExercise.content && AppState.currentExercise.content.texts || {};
        options = Object.keys(texts);
      } else if (partType === 'dual-matching') {
        // For dual-matching, find which task this question belongs to
        var exercise = AppState.currentExercise;
        var task = null;
        if (exercise.content.task1 && exercise.content.task1.questions.some(function(q) { return q.number === qNum; })) {
          task = exercise.content.task1;
        } else if (exercise.content.task2 && exercise.content.task2.questions.some(function(q) { return q.number === qNum; })) {
          task = exercise.content.task2;
        }
        if (task && task.options) {
          options = Object.entries(task.options).map(function(entry) { return entry[0] + ') ' + entry[1]; });
        }
      }

      if (options.length > 0) {
        var layoutClass = (partType === 'multiple-choice-text' || partType === 'multiple-choice') ? 'eq-options eq-options-rows' : 'eq-options eq-options-columns';
        html += '<div class="' + layoutClass + '">';
        options.forEach(function(opt) {
          var optText = opt;
          var optLetter = '';
          if (partType === 'multiple-choice-text' || partType === 'multiple-choice' || partType === 'dual-matching') {
            optLetter = opt.charAt(0);
          } else {
            optLetter = opt;
          }
          var isCorrect = optLetter === question.correct;
          html += '<span class="eq-option' + (isCorrect ? ' eq-option-correct' : '') + '">' + optText + '</span>';
        });
        html += '</div>';
      }

      // For sentence-completion, show correct answer
      if (partType === 'sentence-completion' && question.correct) {
        html += '<span class="eq-option eq-option-correct" style="display:inline-block;margin-top:4px">' + question.correct + '</span>';
      }

      // Add explanation text
      html += '<span class="eq-text">' + (question.explanation || '') + '</span>';
      html += '</div>';
      qDisplay.innerHTML = html;
    },

    _applyEvidenceHighlight: function(qNum) {
      document.querySelectorAll('.evidence-marker[data-qnum="' + qNum + '"]').forEach(function(span) {
        span.classList.add('evidence-active');
      });
    },

    _applyAllEvidenceHighlights: function() {
      document.querySelectorAll('.evidence-marker').forEach(function(span) {
        span.classList.add('evidence-active');
      });
    },

    _clearEvidenceHighlights: function() {
      document.querySelectorAll('.evidence-marker.evidence-active').forEach(function(span) {
        span.classList.remove('evidence-active');
      });
    },

    _addEvidenceTooltips: function() {
      var questions = this._getAllQuestions();
      questions.forEach(function(q) {
        if (q.explanation) {
          document.querySelectorAll('.evidence-marker[data-qnum="' + q.number + '"]').forEach(function(span) {
            span.setAttribute('data-explanation', q.explanation);
          });
        }
      });
    },

    _removeEvidenceTooltips: function() {
      document.querySelectorAll('.evidence-marker[data-explanation]').forEach(function(span) {
        span.removeAttribute('data-explanation');
      });
    },
    
    
    resetExercise: async function() {
      // Prevent reset in exam mode
      if (AppState.currentMode === 'exam') return;
      
      const partConfig = CONFIG.getPartConfig(AppState.currentSection, AppState.currentPart);
      
      // Subtract current part's score from section total before reset
      const sectionKey = `${AppState.currentExamId}_${AppState.currentSection}`;
      if (AppState.sectionScores[sectionKey]) {
        AppState.sectionScores[sectionKey][AppState.currentPart] = 0;
      }
      AppState.currentPartScore = 0;
      
      // Remove from completed when resetting
      const exam = EXAMS_DATA[AppState.currentLevel]?.find(e => e.id === AppState.currentExamId);
      if (exam && exam.sections[AppState.currentSection]) {
        const completedArr = exam.sections[AppState.currentSection].completed;
        const idx = completedArr.indexOf(AppState.currentPart);
        if (idx > -1) completedArr.splice(idx, 1);
      }
      
      if (AppState.currentExercise) {
        const exampleCorrect = AppState.currentExercise.content?.example?.correct;
        AppState.currentExercise.answers = exampleCorrect ? { '0': exampleCorrect } : {};
      }
      
      if (Timer.timerInterval) clearInterval(Timer.timerInterval);
      AppState.elapsedSeconds = 0;
      AppState.answersChecked = false;
      AppState.explanationMode = false;
      AppState.explanationActiveQuestion = null;
      
      // Clear saved state from localStorage
      Exercise.clearPartState(AppState.currentExamId, AppState.currentSection, AppState.currentPart);
      
      // Clear all visual correction indicators before re-rendering or resetting inputs
      this.clearAllCorrections();
      
      // Re-render exercise for types that use new gap design
      const reRenderTypes = ['multiple-choice', 'word-formation', 'transformations', 'multiple-choice-text', 'cross-text-matching', 'gapped-text', 'multiple-matching'];
      if (reRenderTypes.includes(partConfig.type)) {
        await ExerciseRenderer.render(
          AppState.currentExercise,
          AppState.currentExamId,
          AppState.currentSection,
          AppState.currentPart
        );
      } else {
        this.resetInputsByType(partConfig);
      }
      
      Timer.startTimer();
      Timer.updateTimerColor();
      Timer.updateScoreDisplay();
      
      const checkBtn = document.querySelector('.btn-check');
      if (checkBtn) checkBtn.disabled = false;
    },
    
    clearAllCorrections: function() {
      // Remove correction classes from gap boxes, inputs, labels, options
      document.querySelectorAll('.correct, .incorrect, .checked, .correct-answer').forEach(function(el) {
        el.classList.remove('correct', 'incorrect', 'checked', 'correct-answer');
      });
      
      // Remove type-specific correction classes
      document.querySelectorAll('.reading-type1-correct, .reading-type1-incorrect, .reading-type3-correct, .reading-type3-incorrect, .reading-type4-correct, .reading-type4-incorrect').forEach(function(el) {
        el.classList.remove(
          'reading-type1-correct', 'reading-type1-incorrect',
          'reading-type3-correct', 'reading-type3-incorrect',
          'reading-type4-correct', 'reading-type4-incorrect'
        );
      });
      
      // Remove data-correct attributes (correction tooltips)
      document.querySelectorAll('[data-correct]').forEach(function(el) {
        el.removeAttribute('data-correct');
      });
      
      // Remove injected correction text spans (e.g., reading-type4)
      document.querySelectorAll('.reading-type4-correction-text').forEach(function(el) {
        el.remove();
      });
      
      // Remove title tooltips that show correct answers
      document.querySelectorAll('[title^="✓"]').forEach(function(el) {
        el.removeAttribute('title');
      });

      // Remove injected test-mode toggle buttons and alt badges for inputs
      document.querySelectorAll('.ex-item-toggle-btn, .ex-alt-badge').forEach(function(el) {
        el.remove();
      });
      document.querySelectorAll('input.gap-input, .reading-type2-input, .listening-type2-input').forEach(function(input) {
        if (ExerciseHandlers && typeof ExerciseHandlers._removeInputAltBadge === 'function') {
          ExerciseHandlers._removeInputAltBadge(input);
        }
        input.classList.remove('correct-shown', 'ex-input-correct-shown');
        input.removeAttribute('data-student-value');
        input.removeAttribute('data-correct-value');
        input.removeAttribute('data-correct-raw');
        input.removeAttribute('data-check-class');
      });
    },
    
    resetInputsByType: function(partConfig) {
      switch(partConfig.type) {
        case 'multiple-choice':
        case 'cross-text-matching':
        case 'multiple-matching':
          document.querySelectorAll('.gap-answer').forEach(span => {
            const match = span.textContent.match(/(\d+)\)/);
            if (match) {
              const qNum = match[1];
              if (qNum === '0') {
                const exampleData = AppState.currentExercise.content.example;
                if (exampleData) {
                  let exampleText = exampleData.correct || '_____';
                  if (exampleData.options) {
                    const correctOption = exampleData.options.find(opt => opt.startsWith(exampleData.correct + ')'));
                    exampleText = correctOption ? correctOption.substring(2).trim() : '_____';
                  }
                  span.innerHTML = `<span class="gap-number">0)</span><span class="gap-text">${exampleText}</span>`;
                }
              } else {
                span.innerHTML = `<span class="gap-number">${qNum})</span><span class="gap-dots">.........</span>`;
              }
            }
            span.removeAttribute('data-correct');
          });
          
          document.querySelectorAll('.gap-box').forEach(box => {
            const answerSpan = box.querySelector('.gap-answer');
            const match = answerSpan?.textContent.match(/(\d+)\)/);
            const qNum = match ? match[1] : null;
            if (qNum !== '0') {
              box.classList.remove('answered', 'correct', 'incorrect', 'checked');
              box.style.pointerEvents = 'auto';
            }
          });
          break;
          
        case 'open-cloze':
        case 'word-formation':
        case 'sentence-completion':
        case 'transformations':
          document.querySelectorAll('input.gap-input, .reading-type2-input, .listening-type2-input').forEach(input => {
            input.value = '';
            input.classList.remove('correct', 'incorrect');
            input.disabled = false;
            input.readOnly = false;
            input.removeAttribute('title');
            this._removeInputAltBadge(input);
            input.classList.remove('correct-shown', 'ex-input-correct-shown');
            input.removeAttribute('data-student-value');
            input.removeAttribute('data-correct-value');
            input.removeAttribute('data-correct-raw');
            input.removeAttribute('data-check-class');
            const gap = input.closest('.reading-type2-gap, .listening-type2-gap');
            if (gap) {
              gap.classList.remove('incorrect');
              gap.removeAttribute('data-correct');
            }
          });
          document.querySelectorAll('.ex-item-toggle-btn, .ex-alt-badge').forEach(el => el.remove());
          break;
          
        case 'multiple-choice-text':
          document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
            radio.disabled = false;
            const label = radio.closest('.reading-type5-option');
            if (label) {
              label.classList.remove('correct', 'incorrect', 'disabled');
            }
          });
          break;
          
        case 'gapped-text':
          document.querySelectorAll('select.paragraph-select').forEach(select => {
            select.value = '';
            select.disabled = false;
            select.classList.remove('correct', 'incorrect');
            select.removeAttribute('title');
          });
          break;

        case 'essay':
        case 'choice':
          document.querySelectorAll('.writing-textarea').forEach(t => {
            t.value = '';
            t.disabled = false;
            t.style.display = '';
          });
          document.querySelectorAll('.writing-corrected-text').forEach(d => {
            d.innerHTML = '';
            d.style.display = 'none';
          });
          document.querySelectorAll('.writing-type1-ai-results, .writing-type2-ai-results').forEach(d => {
            d.style.display = 'none';
          });
          document.querySelectorAll('.btn-evaluate-ai').forEach(b => {
            b.disabled = false;
          });
          break;

        case 'dual-matching':
          document.querySelectorAll('.listening-type4-select').forEach(s => {
            s.value = '';
            s.disabled = false;
            s.classList.remove('correct', 'incorrect');
          });
          break;
      }
    }
  };
})();
