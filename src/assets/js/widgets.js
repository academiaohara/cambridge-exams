/**
 * Phrasal Verbs Academy - Widgets Module
 * Handles sidebar widgets: Categories, Favorites, Review Mixer, Mistakes
 */
(function () {
    'use strict';

    var _state = null;

    // ---- Initialize Widgets ----
    function init(appState) {
        _state = appState;
        updateFavorites(appState.favorites);
        updateMistakes(appState.mistakes);
        setupReviewMixer();
    }

    // ---- Update Favorites List ----
    function updateFavorites(favorites) {
        var container = document.getElementById('favorites-list');
        if (!container) return;

        if (!favorites || favorites.length === 0) {
            container.innerHTML = '<p class="empty-state">No favorites yet. Click the heart on any phrasal verb to save it here.</p>';
            return;
        }

        var html = '';
        favorites.forEach(function (verb) {
            html += '<div class="favorite-item" data-verb="' + escapeAttr(verb) + '">';
            html += '<span class="material-symbols-rounded">favorite</span>';
            html += '<span>' + escapeHtml(verb) + '</span>';
            html += '</div>';
        });
        container.innerHTML = html;

        // Click to remove favorite
        container.querySelectorAll('.favorite-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var verb = item.getAttribute('data-verb');
                App.toggleFavorite(verb);
            });
        });
    }

    // ---- Update Mistakes List ----
    function updateMistakes(mistakes) {
        var container = document.getElementById('mistakes-list');
        if (!container) return;

        if (!mistakes || mistakes.length === 0) {
            container.innerHTML = '<p class="empty-state">No mistakes yet. Keep practicing!</p>';
            return;
        }

        var html = '';
        var shown = mistakes.slice(0, 10);
        shown.forEach(function (m) {
            html += '<div class="mistake-item">';
            html += '<span class="material-symbols-rounded">close</span>';
            html += '<div>';
            html += '<strong>' + escapeHtml(m.phrasalVerb || 'Unknown') + '</strong>';
            html += '<div style="font-size:0.75rem;color:var(--color-text-light)">';
            html += 'Your answer: ' + escapeHtml(m.userAnswer) + ' → ' + escapeHtml(m.correctAnswer);
            html += '</div></div>';
            html += '</div>';
        });
        container.innerHTML = html;
    }

    // ---- Review Mixer ----
    function setupReviewMixer() {
        var startBtn = document.getElementById('start-review');
        if (!startBtn) return;

        startBtn.addEventListener('click', function () {
            var selectedLevels = getSelectedLevels();
            var count = parseInt(document.getElementById('question-count').value, 10) || 10;
            var mixLevels = document.getElementById('mix-levels').checked;
            var prioritizeMistakes = document.getElementById('prioritize-mistakes').checked;
            var onlyFavorites = document.getElementById('only-favorites').checked;

            startReviewSession(selectedLevels, count, mixLevels, prioritizeMistakes, onlyFavorites);
        });
    }

    function getSelectedLevels() {
        var checkboxes = document.querySelectorAll('.review-levels input[type="checkbox"]:checked');
        var levels = [];
        checkboxes.forEach(function (cb) {
            levels.push(cb.value);
        });
        return levels;
    }

    function startReviewSession(levels, count, mixLevels, prioritizeMistakes, onlyFavorites) {
        if (levels.length === 0) {
            App.openModal('<div style="text-align:center;padding:20px">' +
                '<span class="material-symbols-rounded" style="font-size:48px;color:var(--color-accent)">warning</span>' +
                '<h3 style="margin:12px 0 8px">No levels selected</h3>' +
                '<p style="color:var(--color-text-light)">Please select at least one level to review.</p>' +
                '</div>');
            return;
        }

        // Collect review questions from available lessons
        var allQuestions = [];
        var promises = [];

        if (!_state.data) return;

        _state.data.levels.forEach(function (level) {
            if (levels.indexOf(level.level) === -1) return;

            level.lessons.forEach(function (lesson) {
                var p = App.loadLesson(lesson.file).then(function (data) {
                    if (!data.points) return;
                    data.points.forEach(function (point) {
                        if (point.type === 'exercises' && point.questions) {
                            point.questions.forEach(function (q) {
                                allQuestions.push(q);
                            });
                        }
                    });
                }).catch(function () { /* ignore load errors */ });
                promises.push(p);
            });
        });

        Promise.all(promises).then(function () {
            if (allQuestions.length === 0) {
                App.openModal('<div style="text-align:center;padding:20px">' +
                    '<span class="material-symbols-rounded" style="font-size:48px;color:var(--color-text-light)">quiz</span>' +
                    '<h3 style="margin:12px 0 8px">No questions available</h3>' +
                    '<p style="color:var(--color-text-light)">No exercises found for the selected levels.</p>' +
                    '</div>');
                return;
            }

            // Shuffle and limit
            shuffleArray(allQuestions);
            var reviewQuestions = allQuestions.slice(0, count);

            // Start exercise session
            var reviewPoint = {
                type: 'exercises',
                title: 'Review Session',
                description: 'Mixed practice from ' + levels.join(', '),
                questions: reviewQuestions
            };

            if (typeof Exercises !== 'undefined') {
                Exercises.start(reviewPoint, 'REVIEW-MIX', null);
            }
        });
    }

    // ---- Utility ----
    function shuffleArray(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
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

    // ---- Public API ----
    window.Widgets = {
        init: init,
        updateFavorites: updateFavorites,
        updateMistakes: updateMistakes
    };
})();
