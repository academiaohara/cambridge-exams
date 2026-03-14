/**
 * Phrasal Verbs Academy - Exercises Module
 * Handles rendering and interaction for all exercise types:
 * fill-blank, choose-particle, reorder, dialogue, multiple-choice, pronoun-exercise
 */
(function () {
    'use strict';

    var _currentExercise = null;
    var _currentQuestionIndex = 0;
    var _score = 0;
    var _answers = [];
    var _pointId = null;
    var _lessonData = null;

    // ---- Start Exercise Session ----
    function start(exercisePoint, pointId, lessonData) {
        _currentExercise = exercisePoint;
        _currentQuestionIndex = 0;
        _score = 0;
        _answers = [];
        _pointId = pointId;
        _lessonData = lessonData;

        renderExercise();
    }

    // ---- Render Current Exercise ----
    function renderExercise() {
        if (!_currentExercise || !_currentExercise.questions) return;

        var questions = _currentExercise.questions;
        if (_currentQuestionIndex >= questions.length) {
            showResults();
            return;
        }

        var question = questions[_currentQuestionIndex];
        var total = questions.length;
        var current = _currentQuestionIndex + 1;

        var html = '<div class="exercise-card">';

        // Header
        html += '<div class="exercise-header">';
        html += '<h3>' + escapeHtml(_currentExercise.title || 'Practice') + '</h3>';
        html += '<p>Question ' + current + ' of ' + total + '</p>';
        html += '</div>';

        // Progress dots
        html += '<div class="exercise-progress">';
        for (var i = 0; i < total; i++) {
            var dotClass = 'exercise-dot';
            if (i < _currentQuestionIndex) {
                dotClass += _answers[i] && _answers[i].correct ? ' correct' : ' incorrect';
            } else if (i === _currentQuestionIndex) {
                dotClass += ' active';
            }
            html += '<div class="' + dotClass + '"></div>';
        }
        html += '</div>';

        // Question content
        html += renderQuestion(question);

        html += '</div>';

        App.openModal(html);

        // Attach listeners after DOM update
        setTimeout(function () {
            attachQuestionListeners(question);
        }, 50);
    }

    // ---- Render Question by Type ----
    function renderQuestion(q) {
        var html = '<div class="question-container">';

        // Type badge
        var typeLabel = getTypeLabel(q.type);
        html += '<div class="question-type-badge">' + typeLabel + '</div>';

        switch (q.type) {
            case 'fill-blank':
                html += renderFillBlank(q);
                break;
            case 'choose-particle':
            case 'particle':
                html += renderChooseParticle(q);
                break;
            case 'multiple-choice':
                html += renderMultipleChoice(q);
                break;
            case 'reorder':
                html += renderReorder(q);
                break;
            case 'dialogue':
                html += renderDialogue(q);
                break;
            case 'pronoun-exercise':
                html += renderPronounExercise(q);
                break;
            default:
                html += '<p>Unknown question type: ' + escapeHtml(q.type) + '</p>';
        }

        html += '<div id="feedback-area"></div>';
        html += '</div>';

        return html;
    }

    // ---- Fill in the Blank ----
    function renderFillBlank(q) {
        var html = '<div class="question-text">' + formatSentenceWithBlanks(q.sentence) + '</div>';

        if (q.options && q.options.length > 0) {
            html += '<div class="options-grid">';
            q.options.forEach(function (opt, idx) {
                html += '<button class="option-btn" data-answer="' + escapeAttr(opt) + '">' + escapeHtml(opt) + '</button>';
            });
            html += '</div>';
        } else {
            html += '<div class="text-input-group">';
            html += '<input type="text" class="text-input" id="answer-input" placeholder="Type your answer..." autocomplete="off">';
            html += '<button class="btn btn-primary" id="check-answer" style="width:auto;padding:10px 20px">Check</button>';
            html += '</div>';
        }

        return html;
    }

    // ---- Choose Particle ----
    function renderChooseParticle(q) {
        var html = '<div class="question-text">' + formatSentenceWithBlanks(q.sentence) + '</div>';
        html += '<div class="options-grid">';
        q.options.forEach(function (opt) {
            html += '<button class="option-btn" data-answer="' + escapeAttr(opt) + '">' + escapeHtml(opt) + '</button>';
        });
        html += '</div>';
        return html;
    }

    // ---- Multiple Choice ----
    function renderMultipleChoice(q) {
        var html = '<div class="question-text">' + escapeHtml(q.question) + '</div>';
        html += '<div class="options-grid">';
        q.options.forEach(function (opt, idx) {
            html += '<button class="option-btn" data-index="' + idx + '">' + escapeHtml(opt) + '</button>';
        });
        html += '</div>';
        return html;
    }

    // ---- Reorder Words ----
    function renderReorder(q) {
        var html = '<div class="question-text">Arrange the words in the correct order:</div>';

        // Shuffled word bank
        var words = q.scrambled_words.slice();
        html += '<div class="word-bank" id="word-bank">';
        words.forEach(function (word, idx) {
            html += '<button class="word-chip" data-word="' + escapeAttr(word) + '" data-index="' + idx + '">' + escapeHtml(word) + '</button>';
        });
        html += '</div>';

        // Answer zone
        html += '<div class="answer-zone" id="answer-zone"></div>';

        // Check button
        html += '<button class="btn btn-primary" id="check-reorder" style="margin-top:8px">Check Answer</button>';

        return html;
    }

    // ---- Dialogue ----
    function renderDialogue(q) {
        var html = '<div class="question-text">' + formatSentenceWithBlanks(q.context) + '</div>';
        html += '<div class="text-input-group">';
        html += '<input type="text" class="text-input" id="answer-input" placeholder="Type the missing phrasal verb..." autocomplete="off">';
        html += '<button class="btn btn-primary" id="check-answer" style="width:auto;padding:10px 20px">Check</button>';
        html += '</div>';
        return html;
    }

    // ---- Pronoun Exercise ----
    function renderPronounExercise(q) {
        var html = '<div class="question-text">';
        html += '<strong>Original:</strong> ' + escapeHtml(q.original_sentence) + '<br>';
        html += '<em>' + escapeHtml(q.instruction) + '</em>';
        html += '</div>';
        html += '<div class="text-input-group">';
        html += '<input type="text" class="text-input" id="answer-input" placeholder="Type your answer..." autocomplete="off">';
        html += '<button class="btn btn-primary" id="check-answer" style="width:auto;padding:10px 20px">Check</button>';
        html += '</div>';
        return html;
    }

    // ---- Attach Listeners ----
    function attachQuestionListeners(question) {
        switch (question.type) {
            case 'fill-blank':
                attachOptionListeners(question, function (answer) {
                    return answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
                });
                attachTextInputListener(question, function (answer) {
                    return answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
                });
                break;

            case 'choose-particle':
            case 'particle':
                attachOptionListeners(question, function (answer) {
                    return answer.toLowerCase().trim() === question.correct_particle.toLowerCase().trim();
                });
                break;

            case 'multiple-choice':
                attachMultipleChoiceListeners(question);
                break;

            case 'reorder':
                attachReorderListeners(question);
                break;

            case 'dialogue':
            case 'pronoun-exercise':
                attachTextInputListener(question, function (answer) {
                    return answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
                });
                break;
        }
    }

    // ---- Option Button Listeners ----
    function attachOptionListeners(question, checkFn) {
        var buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.classList.contains('disabled')) return;

                var answer = btn.getAttribute('data-answer');
                var isCorrect = checkFn(answer);

                // Disable all buttons
                buttons.forEach(function (b) { b.classList.add('disabled'); });

                if (isCorrect) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('incorrect');
                    // Highlight correct answer
                    var correctAnswer = question.answer || question.correct_particle;
                    buttons.forEach(function (b) {
                        if (b.getAttribute('data-answer').toLowerCase() === correctAnswer.toLowerCase()) {
                            b.classList.add('correct');
                        }
                    });
                }

                processAnswer(isCorrect, answer, question);
            });
        });
    }

    // ---- Multiple Choice Listeners ----
    function attachMultipleChoiceListeners(question) {
        var buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.classList.contains('disabled')) return;

                var selectedIndex = parseInt(btn.getAttribute('data-index'), 10);
                var isCorrect = selectedIndex === question.correct_answer;

                buttons.forEach(function (b) { b.classList.add('disabled'); });

                if (isCorrect) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('incorrect');
                    buttons.forEach(function (b) {
                        if (parseInt(b.getAttribute('data-index'), 10) === question.correct_answer) {
                            b.classList.add('correct');
                        }
                    });
                }

                processAnswer(isCorrect, question.options[selectedIndex], question);
            });
        });
    }

    // ---- Text Input Listener ----
    function attachTextInputListener(question, checkFn) {
        var checkBtn = document.getElementById('check-answer');
        var input = document.getElementById('answer-input');
        if (!checkBtn || !input) return;

        function doCheck() {
            var answer = input.value;
            if (!answer.trim()) return;

            var isCorrect = checkFn(answer);
            input.classList.add(isCorrect ? 'correct' : 'incorrect');
            input.disabled = true;
            checkBtn.disabled = true;

            processAnswer(isCorrect, answer, question);
        }

        checkBtn.addEventListener('click', doCheck);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') doCheck();
        });
    }

    // ---- Reorder Listeners ----
    function attachReorderListeners(question) {
        var wordBank = document.getElementById('word-bank');
        var answerZone = document.getElementById('answer-zone');
        var checkBtn = document.getElementById('check-reorder');
        if (!wordBank || !answerZone || !checkBtn) return;

        var placedWords = [];

        // Click word to add to answer zone
        wordBank.querySelectorAll('.word-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                if (chip.classList.contains('placed')) return;

                chip.classList.add('placed');
                var word = chip.getAttribute('data-word');
                placedWords.push(word);

                var newChip = document.createElement('button');
                newChip.className = 'word-chip';
                newChip.textContent = word;
                newChip.setAttribute('data-word', word);
                answerZone.appendChild(newChip);
                answerZone.classList.add('active');

                // Click to remove from answer zone
                newChip.addEventListener('click', function () {
                    answerZone.removeChild(newChip);
                    chip.classList.remove('placed');
                    var idx = placedWords.indexOf(word);
                    if (idx > -1) placedWords.splice(idx, 1);
                    if (answerZone.children.length === 0) {
                        answerZone.classList.remove('active');
                    }
                });
            });
        });

        checkBtn.addEventListener('click', function () {
            var userAnswer = placedWords.join(' ');
            var isCorrect = userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();

            // Disable interactions
            wordBank.querySelectorAll('.word-chip').forEach(function (c) { c.style.pointerEvents = 'none'; });
            answerZone.querySelectorAll('.word-chip').forEach(function (c) { c.style.pointerEvents = 'none'; });
            checkBtn.disabled = true;

            processAnswer(isCorrect, userAnswer, question);
        });
    }

    // ---- Process Answer ----
    function processAnswer(isCorrect, userAnswer, question) {
        _answers.push({
            questionId: question.id,
            correct: isCorrect,
            userAnswer: userAnswer
        });

        if (isCorrect) {
            _score++;
        } else {
            // Record mistake
            var phrasalVerb = question.answer || question.correct_particle || '';
            App.recordMistake(
                question.id,
                phrasalVerb,
                userAnswer,
                question.answer || question.options[question.correct_answer] || question.correct_particle || ''
            );
        }

        showFeedback(isCorrect, question.feedback);
    }

    // ---- Show Feedback ----
    function showFeedback(isCorrect, feedbackText) {
        var area = document.getElementById('feedback-area');
        if (!area) return;

        var html = '<div class="feedback-box ' + (isCorrect ? 'correct' : 'incorrect') + '">';
        html += '<span class="material-symbols-rounded">' + (isCorrect ? 'check_circle' : 'cancel') + '</span>';
        html += '<span>' + escapeHtml(feedbackText || (isCorrect ? 'Correct!' : 'Not quite right.')) + '</span>';
        html += '</div>';

        // Next button
        html += '<div class="exercise-nav">';
        html += '<button class="btn btn-primary" id="btn-next" style="margin-top:12px">';
        html += '<span class="material-symbols-rounded">arrow_forward</span>';

        var isLast = _currentQuestionIndex >= _currentExercise.questions.length - 1;
        html += isLast ? 'See Results' : 'Next Question';
        html += '</button>';
        html += '</div>';

        area.innerHTML = html;

        var nextBtn = document.getElementById('btn-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                _currentQuestionIndex++;
                renderExercise();
            });
        }
    }

    // ---- Show Results ----
    function showResults() {
        var total = _currentExercise.questions.length;
        var percentage = Math.round((_score / total) * 100);
        var passed = percentage >= 70;

        var html = '<div class="score-summary">';
        html += '<div class="score-circle ' + (passed ? 'pass' : 'fail') + '">';
        html += percentage + '%';
        html += '<small>' + _score + '/' + total + '</small>';
        html += '</div>';

        html += '<div class="score-message">' + (passed ? 'Great job!' : 'Keep practicing!') + '</div>';
        html += '<div class="score-details">';
        html += 'You got ' + _score + ' out of ' + total + ' questions correct.';
        html += '</div>';

        // Badge for final challenges
        if (_lessonData && _lessonData.type === 'final-challenge' && passed && _lessonData.reward) {
            html += '<div class="badge-earned">';
            html += '<span class="material-symbols-rounded">emoji_events</span>';
            html += _lessonData.reward.badge + ' earned!';
            html += '</div>';
        }

        // Mark point as completed if passed
        if (passed && _pointId) {
            App.markPointCompleted(_pointId);
        }

        html += '<div class="exercise-nav" style="justify-content:center;gap:12px">';
        html += '<button class="btn btn-outline" id="btn-retry">';
        html += '<span class="material-symbols-rounded">refresh</span> Try Again';
        html += '</button>';
        html += '<button class="btn btn-primary" id="btn-done">';
        html += '<span class="material-symbols-rounded">check</span> Done';
        html += '</button>';
        html += '</div>';
        html += '</div>';

        App.openModal(html);

        setTimeout(function () {
            var retryBtn = document.getElementById('btn-retry');
            if (retryBtn) {
                retryBtn.addEventListener('click', function () {
                    _currentQuestionIndex = 0;
                    _score = 0;
                    _answers = [];
                    renderExercise();
                });
            }

            var doneBtn = document.getElementById('btn-done');
            if (doneBtn) {
                doneBtn.addEventListener('click', function () {
                    App.closeModal();
                    if (typeof PhrasalMap !== 'undefined') {
                        PhrasalMap.renderMap();
                    }
                });
            }
        }, 50);
    }

    // ---- Utility ----
    function formatSentenceWithBlanks(sentence) {
        if (!sentence) return '';
        // Replace ______ patterns with styled blanks
        return escapeHtml(sentence).replace(/______\s*______/g, '<span class="blank">______</span>')
            .replace(/______/g, '<span class="blank">______</span>');
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getTypeLabel(type) {
        var labels = {
            'fill-blank': 'Fill in the Blank',
            'choose-particle': 'Choose the Particle',
            'particle': 'Choose the Particle',
            'multiple-choice': 'Multiple Choice',
            'reorder': 'Word Order',
            'dialogue': 'Complete the Dialogue',
            'pronoun-exercise': 'Pronoun Placement'
        };
        return labels[type] || type;
    }

    // ---- Public API ----
    window.Exercises = {
        start: start
    };
})();
