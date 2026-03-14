/**
 * Phrasal Verbs Academy - Main Application Module
 * Handles initialization, data loading, state management, and local storage
 */
(function () {
    'use strict';

    // ---- App State ----
    var AppState = {
        data: null,
        currentLevel: null,
        currentLesson: null,
        currentPoint: null,
        progress: {},
        favorites: [],
        mistakes: [],
        stats: { xp: 0, streak: 0, points: 0 }
    };

    // ---- Local Storage Keys ----
    var STORAGE_KEYS = {
        PROGRESS: 'pva_progress',
        FAVORITES: 'pva_favorites',
        MISTAKES: 'pva_mistakes',
        STATS: 'pva_stats'
    };

    // ---- Initialize App ----
    function init() {
        loadFromStorage();
        loadIndex().then(function () {
            if (typeof PhrasalMap !== 'undefined') {
                PhrasalMap.init(AppState);
            }
            if (typeof Widgets !== 'undefined') {
                Widgets.init(AppState);
            }
            setupEventListeners();
            updateUI();
        });
    }

    // ---- Load Master Index ----
    function loadIndex() {
        return fetch('data/index.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Failed to load index.json');
                return response.json();
            })
            .then(function (data) {
                AppState.data = data;
                if (!AppState.currentLevel) {
                    AppState.currentLevel = data.levels[0].level;
                }
            })
            .catch(function (err) {
                console.error('Error loading index:', err);
                document.getElementById('map-tree').innerHTML =
                    '<p class="empty-state">Failed to load data. Please refresh the page.</p>';
            });
    }

    // ---- Load Lesson Data ----
    function loadLesson(filePath) {
        return fetch('data/phrasal-verbs/' + filePath)
            .then(function (response) {
                if (!response.ok) throw new Error('Failed to load ' + filePath);
                return response.json();
            });
    }

    // ---- Local Storage ----
    function loadFromStorage() {
        try {
            var progress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            if (progress) AppState.progress = JSON.parse(progress);

            var favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            if (favorites) AppState.favorites = JSON.parse(favorites);

            var mistakes = localStorage.getItem(STORAGE_KEYS.MISTAKES);
            if (mistakes) AppState.mistakes = JSON.parse(mistakes);

            var stats = localStorage.getItem(STORAGE_KEYS.STATS);
            if (stats) AppState.stats = JSON.parse(stats);
        } catch (e) {
            console.warn('Error reading localStorage:', e);
        }
    }

    function saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(AppState.progress));
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(AppState.favorites));
            localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(AppState.mistakes));
            localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(AppState.stats));
        } catch (e) {
            console.warn('Error writing localStorage:', e);
        }
    }

    // ---- Progress Tracking ----
    function markPointCompleted(pointId) {
        if (!AppState.progress[pointId]) {
            AppState.progress[pointId] = {
                completed: true,
                timestamp: new Date().toISOString()
            };
            AppState.stats.points += 10;
            AppState.stats.xp += 25;
            saveToStorage();
            updateUI();
        }
    }

    function isPointCompleted(pointId) {
        return AppState.progress[pointId] && AppState.progress[pointId].completed;
    }

    // ---- Favorites ----
    function toggleFavorite(phrasalVerb) {
        var index = AppState.favorites.indexOf(phrasalVerb);
        if (index === -1) {
            AppState.favorites.push(phrasalVerb);
        } else {
            AppState.favorites.splice(index, 1);
        }
        saveToStorage();
        if (typeof Widgets !== 'undefined') {
            Widgets.updateFavorites(AppState.favorites);
        }
    }

    function isFavorite(phrasalVerb) {
        return AppState.favorites.indexOf(phrasalVerb) !== -1;
    }

    // ---- Mistakes ----
    function recordMistake(questionId, phrasalVerb, userAnswer, correctAnswer) {
        AppState.mistakes.unshift({
            questionId: questionId,
            phrasalVerb: phrasalVerb,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            timestamp: new Date().toISOString()
        });
        // Keep only last 50 mistakes
        if (AppState.mistakes.length > 50) {
            AppState.mistakes = AppState.mistakes.slice(0, 50);
        }
        saveToStorage();
        if (typeof Widgets !== 'undefined') {
            Widgets.updateMistakes(AppState.mistakes);
        }
    }

    // ---- UI Updates ----
    function updateUI() {
        // Update XP
        var xpEl = document.getElementById('xp-count');
        if (xpEl) xpEl.textContent = AppState.stats.xp;

        // Update streak
        var streakEl = document.getElementById('streak-count');
        if (streakEl) streakEl.textContent = AppState.stats.streak;

        // Update bottom bar stats
        var statPoints = document.getElementById('stat-points');
        if (statPoints) statPoints.textContent = AppState.stats.points;

        var statStreak = document.getElementById('stat-streak');
        if (statStreak) statStreak.textContent = AppState.stats.streak;

        // Update progress bar
        updateProgressBar();
    }

    function updateProgressBar() {
        if (!AppState.data) return;
        var totalPoints = 0;
        var completedPoints = 0;

        AppState.data.levels.forEach(function (level) {
            level.lessons.forEach(function (lesson) {
                totalPoints += lesson.pointsCount;
            });
        });

        Object.keys(AppState.progress).forEach(function (key) {
            if (AppState.progress[key].completed) completedPoints++;
        });

        var percentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
        var fill = document.getElementById('progress-fill');
        var text = document.getElementById('progress-text');
        if (fill) fill.style.width = percentage + '%';
        if (text) text.textContent = percentage + '%';
    }

    function updateCurrentLocation(locationText) {
        var el = document.getElementById('current-location');
        if (el) el.textContent = locationText;
    }

    // ---- Modal ----
    function openModal(contentHtml) {
        var overlay = document.getElementById('modal-overlay');
        var content = document.getElementById('modal-content');
        if (content) content.innerHTML = contentHtml;
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        var overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ---- Event Listeners ----
    function setupEventListeners() {
        // Modal close
        var closeBtn = document.getElementById('modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        var overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeModal();
            });
        }

        // Sidebar toggles (mobile)
        var toggleLeft = document.getElementById('toggle-left');
        var toggleRight = document.getElementById('toggle-right');
        var sidebarLeft = document.getElementById('sidebar-left');
        var sidebarRight = document.getElementById('sidebar-right');

        if (toggleLeft) {
            toggleLeft.addEventListener('click', function () {
                sidebarLeft.classList.toggle('open');
                if (sidebarRight) sidebarRight.classList.remove('open');
            });
        }

        if (toggleRight) {
            toggleRight.addEventListener('click', function () {
                sidebarRight.classList.toggle('open');
                if (sidebarLeft) sidebarLeft.classList.remove('open');
            });
        }

        // Continue button
        var continueBtn = document.getElementById('btn-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', function () {
                if (typeof PhrasalMap !== 'undefined') {
                    PhrasalMap.navigateToNext();
                }
            });
        }

        // Keyboard shortcut: Escape closes modal
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeModal();
        });
    }

    // ---- Public API ----
    window.App = {
        state: AppState,
        init: init,
        loadLesson: loadLesson,
        markPointCompleted: markPointCompleted,
        isPointCompleted: isPointCompleted,
        toggleFavorite: toggleFavorite,
        isFavorite: isFavorite,
        recordMistake: recordMistake,
        openModal: openModal,
        closeModal: closeModal,
        updateUI: updateUI,
        updateCurrentLocation: updateCurrentLocation,
        saveToStorage: saveToStorage
    };

    // ---- Start App ----
    document.addEventListener('DOMContentLoaded', init);
})();
