// js/main-nav.js — Duolingo-style main navigation sidebar & mode cards

(function() {
  var NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home', color: '#1cb0f6', onclick: 'loadDashboard()' },
    { id: 'course', label: 'Course', icon: 'auto_stories', color: '#58cc02', onclick: 'BentoGrid.openLessons()' },
    { id: 'practice', label: 'Practice', icon: 'edit_note', color: '#ff9600', onclick: 'BentoGrid.selectMode(\'practice\')' },
    { id: 'simulation', label: 'Simulation', icon: 'assignment', color: '#ce82ff', onclick: 'BentoGrid.selectMode(\'exam\')' },
    { id: 'crosswords', label: 'Crosswords', icon: 'grid_on', color: '#ff4b4b', onclick: 'BentoGrid.openCrosswordList()' },
    { id: 'dictionaries', label: 'Dictionaries', icon: 'menu_book', color: '#6366f1', onclick: 'FastExercises._showDictionariesHome()' },
    { id: 'calculator', label: 'Calculator', icon: 'calculate', color: '#1E9D8E', onclick: 'openScoreCalculator()' },
    { id: 'profile', label: 'Profile', icon: 'person', color: '#777777', onclick: 'BentoGrid.openMobileProfile()' }
  ];

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getActiveId() {
    var view = (typeof AppState !== 'undefined') ? AppState.currentView : 'dashboard';
    if (view === 'dashboard') return 'home';
    if (view === 'subpage') {
      return AppState.currentMode === 'exam' ? 'simulation' : 'practice';
    }
    if (view === 'course' || view === 'courseBlock' || view === 'courseUnit' || view === 'courseTheory') return 'course';
    if (view === 'crosswordList') return 'crosswords';
    if (view === 'fastExercises' || view === 'fastExerciseCategory' || view === 'fastExercisePoint') return 'dictionaries';
    if (view === 'profile') return 'profile';
    return null;
  }

  window.MainNav = {
    NAV_ITEMS: NAV_ITEMS,

    buildSidebarHtml: function(activeId) {
      activeId = activeId || getActiveId() || 'home';
      var hidePlans = typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI();

      var html = '<nav class="main-nav-sidebar" aria-label="Main navigation">' +
        '<a class="main-nav-brand" href="/" onclick="event.preventDefault(); loadDashboard()">' +
          '<img src="Assets/images/sunelogoreduced.svg" class="main-nav-logo" alt="Sune English">' +
        '</a>' +
        '<ul class="main-nav-list">';

      NAV_ITEMS.forEach(function(item) {
        var isActive = item.id === activeId;
        html += '<li>' +
          '<button type="button" class="main-nav-item' + (isActive ? ' active' : '') + '"' +
            ' data-nav-id="' + item.id + '"' +
            ' onclick="' + item.onclick + '"' +
            ' style="--nav-color:' + item.color + '">' +
            '<span class="main-nav-icon"><span class="material-symbols-outlined">' + item.icon + '</span></span>' +
            '<span class="main-nav-label">' + escapeHTML(item.label) + '</span>' +
          '</button>' +
        '</li>';
      });

      if (!hidePlans) {
        var plansActive = (typeof AppState !== 'undefined' && AppState.currentView === 'premium');
        html += '<li>' +
          '<button type="button" class="main-nav-item' + (plansActive ? ' active' : '') + '"' +
            ' data-nav-id="plans"' +
            ' onclick="UserProfile.renderPremiumSection()"' +
            ' style="--nav-color:#ffc800">' +
            '<span class="main-nav-icon"><span class="material-symbols-outlined">workspace_premium</span></span>' +
            '<span class="main-nav-label">Plans</span>' +
          '</button>' +
        '</li>';
      }

      html += '</ul></nav>';
      return html;
    },

    buildStatsBarHtml: function() {
      var level = (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1';
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;

      var xp = 0;
      if (typeof BentoGrid !== 'undefined' && BentoGrid._calcCwXP) {
        try {
          var cwProg = BentoGrid._getCwProgress ? BentoGrid._getCwProgress() : {};
          xp = BentoGrid._calcCwXP(cwProg);
        } catch (e) {}
      }

      var levelColors = {
        'C1': { bg: '#e3f2fd', color: '#1565c0' },
        'B1': { bg: '#fff3e0', color: '#e65100' },
        'B2': { bg: '#e8f5e9', color: '#2e7d32' }
      };
      var lc = levelColors[level] || levelColors['C1'];

      return '<div class="main-nav-stats-bar" aria-label="Your stats">' +
        '<button type="button" class="stats-bar-item stats-bar-level" onclick="BentoGrid.openMobileLevelModal()" aria-label="Change level" style="background:' + lc.bg + ';color:' + lc.color + '">' +
          '<span class="material-symbols-outlined">school</span>' +
          '<strong>' + escapeHTML(level) + '</strong>' +
        '</button>' +
        '<button type="button" class="stats-bar-item stats-bar-streak" onclick="BentoGrid.openStreakSection()" aria-label="View streak">' +
          '<span class="material-symbols-outlined">local_fire_department</span>' +
          '<strong>' + streakCount + '</strong>' +
        '</button>' +
        '<div class="stats-bar-item stats-bar-xp" aria-label="XP">' +
          '<span class="material-symbols-outlined">diamond</span>' +
          '<strong>' + xp + '</strong>' +
        '</div>' +
      '</div>';
    },

    buildDesktopModeCardsHtml: function(exams) {
      exams = exams || [];
      var level = (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1';
      var available = exams.filter(function(e) { return e.status === 'available'; });
      var availableCount = available.length;

      var completedExams = 0;
      var startedExams = 0;
      available.forEach(function(exam) {
        var secs = exam.sections || {};
        var hasCompleted = Object.keys(secs).some(function(s) { return secs[s].completed && secs[s].completed.length > 0; });
        var hasInProgress = Object.keys(secs).some(function(s) { return secs[s].inProgress && secs[s].inProgress.length > 0; });
        if (hasCompleted) completedExams++;
        else if (hasInProgress) startedExams++;
      });

      var testStatus = availableCount === 0
        ? 'No tests available yet'
        : completedExams > 0
          ? completedExams + ' completed · ' + availableCount + ' available'
          : startedExams > 0
            ? startedExams + ' in progress · ' + availableCount + ' available'
            : availableCount + ' test' + (availableCount !== 1 ? 's' : '') + ' available';

      var cwProgress = (typeof BentoGrid !== 'undefined' && BentoGrid._getCwProgress) ? BentoGrid._getCwProgress() : {};
      var cwCompleted = Object.values(cwProgress).filter(function(p) { return p && p.completed; }).length;
      var cwStreak = (typeof BentoGrid !== 'undefined' && BentoGrid._calcCwStreak) ? BentoGrid._calcCwStreak(cwProgress) : 0;

      var cards = [
        {
          kicker: level + ' · COURSE',
          title: 'Course',
          status: 'Structured lessons & theory',
          statusClass: '',
          action: 'OPEN',
          onclick: 'BentoGrid.openLessons()',
          icon: 'auto_stories',
          iconColor: '#58cc02'
        },
        {
          kicker: level + ' · PRACTICE',
          title: 'Test Practice',
          status: testStatus,
          statusClass: completedExams > 0 ? 'mode-card-status-done' : '',
          action: 'PRACTICE',
          onclick: 'BentoGrid.selectMode(\'practice\')',
          icon: 'edit_note',
          iconColor: '#ff9600'
        },
        {
          kicker: level + ' · SIMULATION',
          title: 'Test Simulation',
          status: testStatus,
          statusClass: completedExams > 0 ? 'mode-card-status-done' : '',
          action: 'START',
          onclick: 'BentoGrid.selectMode(\'exam\')',
          icon: 'assignment',
          iconColor: '#ce82ff'
        },
        {
          kicker: 'DAILY · CROSSWORDS',
          title: 'Crosswords',
          status: cwCompleted > 0
            ? cwCompleted + ' completed' + (cwStreak > 0 ? ' · ' + cwStreak + ' day streak' : '')
            : 'Solve today\'s puzzle',
          statusClass: cwCompleted > 0 ? 'mode-card-status-done' : '',
          action: 'PLAY',
          onclick: 'BentoGrid.openCrosswordList()',
          icon: 'grid_on',
          iconColor: '#ff4b4b'
        },
        {
          kicker: 'REFERENCE',
          title: 'Dictionaries',
          status: 'General, vocab, phrasal verbs & more',
          statusClass: '',
          action: 'BROWSE',
          onclick: 'FastExercises._showDictionariesHome()',
          icon: 'menu_book',
          iconColor: '#6366f1'
        },
        {
          kicker: level + ' · TOOLS',
          title: 'Score Calculator',
          status: 'Estimate your Cambridge exam score',
          statusClass: '',
          action: 'CALCULATE',
          onclick: 'openScoreCalculator()',
          icon: 'calculate',
          iconColor: '#1E9D8E'
        }
      ];

      var html = '<div class="desktop-mode-cards">';
      cards.forEach(function(card) {
        html += '<div class="mode-card" onclick="' + card.onclick + '">' +
          '<div class="mode-card-icon" style="background:' + card.iconColor + '20;color:' + card.iconColor + '">' +
            '<span class="material-symbols-outlined">' + card.icon + '</span>' +
          '</div>' +
          '<div class="mode-card-body">' +
            '<div class="mode-card-kicker">' + escapeHTML(card.kicker) + '</div>' +
            '<div class="mode-card-title">' + escapeHTML(card.title) + '</div>' +
            '<div class="mode-card-status ' + card.statusClass + '">' + escapeHTML(card.status) + '</div>' +
          '</div>' +
          '<button type="button" class="mode-card-action" onclick="event.stopPropagation();' + card.onclick + '">' +
            escapeHTML(card.action) +
          '</button>' +
        '</div>';
      });
      html += '</div>';
      return html;
    },

    setActive: function(activeId) {
      document.querySelectorAll('.main-nav-item').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-nav-id') === activeId);
      });
    }
  };
})();
