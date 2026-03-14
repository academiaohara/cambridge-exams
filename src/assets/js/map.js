/**
 * Phrasal Verbs Academy - Vertical Progression Map
 * Renders the learning tree with levels, lessons, reviews, and challenges
 */
(function () {
    'use strict';

    var _state = null;

    // ---- Level Colors ----
    var LEVEL_COLORS = {
        'A2': '#4CAF50',
        'B1': '#2196F3',
        'B2': '#FF9800',
        'C1': '#9C27B0',
        'C2': '#F44336'
    };

    // ---- Initialize Map ----
    function init(appState) {
        _state = appState;
        renderMap();
    }

    // ---- Render Full Map ----
    function renderMap() {
        var container = document.getElementById('map-tree');
        if (!container || !_state.data) return;

        var html = '';
        var levels = _state.data.levels;

        levels.forEach(function (level, levelIdx) {
            var color = LEVEL_COLORS[level.level] || '#9CA3AF';
            var hasLessons = level.lessons && level.lessons.length > 0;

            // Level Banner
            html += '<div class="map-level-banner" style="background: ' + color + '">';
            html += '<h3>' + level.level + ' — ' + level.name + '</h3>';
            html += '<p>' + level.description + '</p>';
            html += '</div>';

            if (!hasLessons) {
                html += renderConnector(false);
                html += renderLockedNode('Coming Soon', 'More lessons will be added');
                if (levelIdx < levels.length - 1) {
                    html += renderConnector(false);
                }
                return;
            }

            // Lesson Nodes
            level.lessons.forEach(function (lesson, lessonIdx) {
                html += renderConnector(isLessonCompleted(level.level, lesson.number));

                var lessonPoints = getLessonPoints(level.level, lesson);
                var isCompleted = isLessonCompleted(level.level, lesson.number);
                var isLocked = isLessonLocked(level.level, lesson.number, levelIdx, lessonIdx, levels);
                var isCurrent = isCurrentLesson(level.level, lesson.number);

                // Render each point in the lesson
                lessonPoints.forEach(function (point, pointIdx) {
                    if (pointIdx > 0) {
                        html += renderConnector(App.isPointCompleted(point.id));
                    }
                    html += renderNode(point, isLocked, level.level, lesson);
                });
            });

            // Review node
            if (level.review) {
                if (level.review['lessons-1-3'] || level.review['lessons-1-5']) {
                    var reviewKey = level.review['lessons-1-3'] || level.review['lessons-1-5'];
                    html += renderConnector(false);
                    html += renderReviewNode(level.level, reviewKey, 'Review');
                }

                // Final challenge
                if (level.review['final-challenge']) {
                    html += renderConnector(false);
                    html += renderChallengeNode(level.level, level.review['final-challenge']);
                }
            }

            if (levelIdx < levels.length - 1) {
                html += renderConnector(false);
            }
        });

        container.innerHTML = html;
        attachNodeListeners();
    }

    // ---- Render Helpers ----
    function renderConnector(completed) {
        return '<div class="map-connector' + (completed ? ' active' : '') + '"></div>';
    }

    function renderNode(point, isLocked, level, lesson) {
        var completed = App.isPointCompleted(point.id);
        var nodeClass = 'map-node';
        var iconClass = 'node-icon';
        var icon = '';
        var statusIcon = '';

        if (completed) {
            nodeClass += ' completed';
            iconClass += ' completed';
            statusIcon = '<span class="material-symbols-rounded node-status completed">check_circle</span>';
        } else if (isLocked) {
            nodeClass += ' locked';
            statusIcon = '<span class="material-symbols-rounded node-status locked">lock</span>';
        } else {
            // Find the first uncompleted point
            var isCurrent = !isLocked && !completed && isFirstUncompleted(point.id);
            if (isCurrent) {
                nodeClass += ' current';
            }
        }

        if (point.type === 'explanation') {
            iconClass += completed ? '' : ' explanation';
            icon = 'menu_book';
        } else if (point.type === 'exercises') {
            iconClass += completed ? '' : ' exercise';
            icon = 'quiz';
        }

        var title = point.type === 'explanation' ? point.phrasalVerb : point.title;
        var subtitle = point.type === 'explanation'
            ? point.definition
            : point.description || (point.questions ? point.questions.length + ' questions' : '');

        var html = '<div class="' + nodeClass + '" data-point-id="' + point.id + '"';
        html += ' data-type="' + point.type + '"';
        html += ' data-level="' + level + '"';
        html += ' data-lesson-file="' + (lesson.file || '') + '">';
        html += '<div class="' + iconClass + '">';
        html += '<span class="material-symbols-rounded">' + icon + '</span>';
        html += '</div>';
        html += '<div class="node-content">';
        html += '<div class="node-title">' + escapeHtml(title) + '</div>';
        html += '<div class="node-subtitle">' + escapeHtml(subtitle) + '</div>';
        html += '</div>';
        html += statusIcon;
        html += '</div>';

        return html;
    }

    function renderReviewNode(level, filePath, title) {
        var nodeId = level + '-REVIEW';
        var completed = App.isPointCompleted(nodeId);
        var nodeClass = 'map-node' + (completed ? ' completed' : '');
        var iconClass = 'node-icon' + (completed ? ' completed' : ' review');

        var html = '<div class="' + nodeClass + '" data-point-id="' + nodeId + '"';
        html += ' data-type="review" data-level="' + level + '"';
        html += ' data-lesson-file="' + filePath + '">';
        html += '<div class="' + iconClass + '">';
        html += '<span class="material-symbols-rounded">rate_review</span>';
        html += '</div>';
        html += '<div class="node-content">';
        html += '<div class="node-title">' + title + '</div>';
        html += '<div class="node-subtitle">Mixed practice from all lessons</div>';
        html += '</div>';
        if (completed) {
            html += '<span class="material-symbols-rounded node-status completed">check_circle</span>';
        }
        html += '</div>';

        return html;
    }

    function renderChallengeNode(level, filePath) {
        var nodeId = level + '-FINAL';
        var completed = App.isPointCompleted(nodeId);
        var nodeClass = 'map-node' + (completed ? ' completed' : '');
        var iconClass = 'node-icon' + (completed ? ' completed' : ' challenge');

        var html = '<div class="' + nodeClass + '" data-point-id="' + nodeId + '"';
        html += ' data-type="final-challenge" data-level="' + level + '"';
        html += ' data-lesson-file="' + filePath + '">';
        html += '<div class="' + iconClass + '">';
        html += '<span class="material-symbols-rounded">emoji_events</span>';
        html += '</div>';
        html += '<div class="node-content">';
        html += '<div class="node-title">' + level + ' Final Challenge</div>';
        html += '<div class="node-subtitle">Pass to unlock the next level</div>';
        html += '</div>';
        if (completed) {
            html += '<span class="material-symbols-rounded node-status completed">check_circle</span>';
        } else {
            html += '<span class="material-symbols-rounded node-status" style="color: #FFD700">emoji_events</span>';
        }
        html += '</div>';

        return html;
    }

    function renderLockedNode(title, subtitle) {
        var html = '<div class="map-node locked">';
        html += '<div class="node-icon" style="background: var(--color-locked)">';
        html += '<span class="material-symbols-rounded">lock</span>';
        html += '</div>';
        html += '<div class="node-content">';
        html += '<div class="node-title">' + escapeHtml(title) + '</div>';
        html += '<div class="node-subtitle">' + escapeHtml(subtitle) + '</div>';
        html += '</div>';
        html += '<span class="material-symbols-rounded node-status locked">lock</span>';
        html += '</div>';

        return html;
    }

    // ---- Logic Helpers ----
    function getLessonPoints(level, lesson) {
        // Generate point IDs based on the lesson's pointsCount
        var points = [];
        for (var i = 1; i <= lesson.pointsCount; i++) {
            var id = level + '-L' + lesson.number + '-P' + i;
            var isExercise = i === lesson.pointsCount; // Last point is exercise

            if (isExercise) {
                points.push({
                    id: id,
                    type: 'exercises',
                    title: 'Practice: ' + lesson.title,
                    description: lesson.phrasalVerbs.join(', '),
                    questions: []
                });
            } else {
                var pvIndex = i - 1;
                var pvName = lesson.phrasalVerbs[pvIndex] || 'Phrasal Verb ' + i;
                points.push({
                    id: id,
                    type: 'explanation',
                    phrasalVerb: pvName,
                    definition: 'Tap to learn about "' + pvName + '"'
                });
            }
        }
        return points;
    }

    function isLessonCompleted(level, lessonNumber) {
        var levelData = findLevel(level);
        if (!levelData) return false;
        var lesson = levelData.lessons.find(function (l) { return l.number === lessonNumber; });
        if (!lesson) return false;

        for (var i = 1; i <= lesson.pointsCount; i++) {
            var id = level + '-L' + lessonNumber + '-P' + i;
            if (!App.isPointCompleted(id)) return false;
        }
        return true;
    }

    function isLessonLocked(level, lessonNumber, levelIdx, lessonIdx, levels) {
        // First lesson of first level is always unlocked
        if (levelIdx === 0 && lessonIdx === 0) return false;

        // Check if previous lesson in same level is completed
        if (lessonIdx > 0) {
            var prevLesson = levels[levelIdx].lessons[lessonIdx - 1];
            return !isLessonCompleted(level, prevLesson.number);
        }

        // First lesson of a new level: check if previous level's final challenge is done
        if (levelIdx > 0) {
            var prevLevel = levels[levelIdx - 1];
            var prevFinalId = prevLevel.level + '-FINAL';
            return !App.isPointCompleted(prevFinalId);
        }

        return false;
    }

    function isCurrentLesson(level, lessonNumber) {
        return _state.currentLevel === level && _state.currentLesson === lessonNumber;
    }

    function isFirstUncompleted(pointId) {
        if (!_state.data) return false;
        var levels = _state.data.levels;

        for (var li = 0; li < levels.length; li++) {
            var level = levels[li];
            for (var si = 0; si < level.lessons.length; si++) {
                var lesson = level.lessons[si];
                for (var pi = 1; pi <= lesson.pointsCount; pi++) {
                    var id = level.level + '-L' + lesson.number + '-P' + pi;
                    if (!App.isPointCompleted(id)) {
                        return id === pointId;
                    }
                }
            }
        }
        return false;
    }

    function findLevel(levelCode) {
        if (!_state.data) return null;
        return _state.data.levels.find(function (l) { return l.level === levelCode; });
    }

    // ---- Node Click Handling ----
    function attachNodeListeners() {
        var nodes = document.querySelectorAll('.map-node:not(.locked)');
        nodes.forEach(function (node) {
            node.addEventListener('click', function () {
                var pointId = node.getAttribute('data-point-id');
                var type = node.getAttribute('data-type');
                var level = node.getAttribute('data-level');
                var lessonFile = node.getAttribute('data-lesson-file');

                handleNodeClick(pointId, type, level, lessonFile);
            });
        });
    }

    function handleNodeClick(pointId, type, level, lessonFile) {
        if (!lessonFile) return;

        App.loadLesson(lessonFile).then(function (data) {
            if (type === 'explanation') {
                var point = findPointInData(data, pointId);
                if (point) {
                    showExplanation(point, pointId);
                }
            } else if (type === 'exercises' || type === 'review' || type === 'final-challenge') {
                var exercisePoint = findExercisePoint(data);
                if (exercisePoint) {
                    if (typeof Exercises !== 'undefined') {
                        Exercises.start(exercisePoint, pointId, data);
                    }
                }
            }

            // Update location
            App.updateCurrentLocation(level + ' > ' + (data.title || 'Lesson'));
        }).catch(function (err) {
            console.error('Error loading lesson:', err);
        });
    }

    function findPointInData(data, pointId) {
        if (!data.points) return null;
        return data.points.find(function (p) { return p.id === pointId; });
    }

    function findExercisePoint(data) {
        if (!data.points) return null;
        return data.points.find(function (p) { return p.type === 'exercises'; });
    }

    // ---- Show Explanation Modal ----
    function showExplanation(point, pointId) {
        var isFav = App.isFavorite(point.phrasalVerb);

        var html = '<div class="explanation-card">';
        html += '<div class="explanation-verb">' + escapeHtml(point.phrasalVerb) + '</div>';
        html += '<div class="explanation-definition">' + escapeHtml(point.definition) + '</div>';

        if (point.grammar) {
            html += '<div class="explanation-grammar">' + escapeHtml(point.grammar) + '</div>';
        }

        if (point.examples && point.examples.length > 0) {
            html += '<div class="explanation-examples">';
            html += '<h4>Examples</h4>';
            point.examples.forEach(function (ex) {
                html += '<div class="example-item">';
                html += '<span class="material-symbols-rounded">format_quote</span>';
                html += '<span>' + escapeHtml(ex.english) + '</span>';
                html += '<button class="audio-btn" title="Play audio (coming soon)">';
                html += '<span class="material-symbols-rounded">volume_up</span>';
                html += '</button>';
                html += '</div>';
            });
            html += '</div>';
        }

        if (point.notes) {
            html += '<div class="explanation-notes">';
            html += '<span class="material-symbols-rounded">info</span> ';
            html += escapeHtml(point.notes);
            html += '</div>';
        }

        html += '<div class="explanation-actions">';
        html += '<button class="btn btn-fav' + (isFav ? ' active' : '') + '" id="btn-fav" data-verb="' + escapeAttr(point.phrasalVerb) + '">';
        html += '<span class="material-symbols-rounded">' + (isFav ? 'favorite' : 'favorite_border') + '</span>';
        html += isFav ? 'Saved' : 'Save';
        html += '</button>';
        html += '<button class="btn btn-primary" id="btn-understood" data-point-id="' + escapeAttr(pointId) + '">';
        html += '<span class="material-symbols-rounded">check</span>';
        html += 'Got it!';
        html += '</button>';
        html += '</div>';
        html += '</div>';

        App.openModal(html);

        // Attach modal button listeners
        setTimeout(function () {
            var favBtn = document.getElementById('btn-fav');
            if (favBtn) {
                favBtn.addEventListener('click', function () {
                    var verb = favBtn.getAttribute('data-verb');
                    App.toggleFavorite(verb);
                    var isNowFav = App.isFavorite(verb);
                    favBtn.classList.toggle('active', isNowFav);
                    favBtn.innerHTML = '<span class="material-symbols-rounded">' +
                        (isNowFav ? 'favorite' : 'favorite_border') + '</span>' +
                        (isNowFav ? 'Saved' : 'Save');
                });
            }

            var understoodBtn = document.getElementById('btn-understood');
            if (understoodBtn) {
                understoodBtn.addEventListener('click', function () {
                    var pid = understoodBtn.getAttribute('data-point-id');
                    App.markPointCompleted(pid);
                    App.closeModal();
                    renderMap();
                });
            }
        }, 50);
    }

    // ---- Navigate to Next ----
    function navigateToNext() {
        if (!_state.data) return;
        var levels = _state.data.levels;

        for (var li = 0; li < levels.length; li++) {
            var level = levels[li];
            for (var si = 0; si < level.lessons.length; si++) {
                var lesson = level.lessons[si];
                for (var pi = 1; pi <= lesson.pointsCount; pi++) {
                    var id = level.level + '-L' + lesson.number + '-P' + pi;
                    if (!App.isPointCompleted(id)) {
                        // Scroll to this node
                        var node = document.querySelector('[data-point-id="' + id + '"]');
                        if (node) {
                            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            node.click();
                        }
                        return;
                    }
                }
            }
        }
    }

    // ---- Utility ----
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
    window.PhrasalMap = {
        init: init,
        renderMap: renderMap,
        navigateToNext: navigateToNext
    };
})();
