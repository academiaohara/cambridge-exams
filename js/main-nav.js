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

      var streakInactive = streakCount === 0;
      var popoverHtml = this.buildStreakPopoverHtml(streak);

      return '<div class="main-nav-stats-bar" aria-label="Your stats">' +
        '<button type="button" class="stats-bar-item stats-bar-level" onclick="BentoGrid.openMobileLevelModal()" aria-label="Change level" style="background:' + lc.bg + ';color:' + lc.color + '">' +
          '<span class="material-symbols-outlined">school</span>' +
          '<strong>' + escapeHTML(level) + '</strong>' +
        '</button>' +
        '<div class="stats-bar-streak-wrap" id="statsBarStreakWrap">' +
          '<button type="button" class="stats-bar-item stats-bar-streak' + (streakInactive ? ' stats-bar-streak-inactive' : '') + '" id="statsBarStreakBtn" aria-label="View streak" aria-expanded="false" aria-haspopup="true">' +
            '<span class="material-symbols-outlined">local_fire_department</span>' +
            '<strong>' + streakCount + '</strong>' +
          '</button>' +
          '<div class="streak-popover" id="streakPopover" role="dialog" aria-hidden="true">' + popoverHtml + '</div>' +
        '</div>' +
        '<button type="button" class="stats-bar-item stats-bar-xp" onclick="FastExercises._showDictionariesHome()" aria-label="Open dictionaries">' +
          '<span class="material-symbols-outlined">diamond</span>' +
          '<strong>' + xp + '</strong>' +
        '</button>' +
      '</div>';
    },

    buildStreakPopoverHtml: function(streak) {
      streak = streak || ((typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null);
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var practicedToday = streak ? streak.practicedToday : false;
      var activeDates = {};
      if (streak && Array.isArray(streak.activeDates)) {
        streak.activeDates.forEach(function(d) { activeDates[d] = true; });
      }

      var formatLocalDate = (typeof StreakManager !== 'undefined' && StreakManager._formatLocalDate)
        ? function(d) { return StreakManager._formatLocalDate(d); }
        : function(d) {
          var month = String(d.getMonth() + 1).padStart(2, '0');
          var day = String(d.getDate()).padStart(2, '0');
          return d.getFullYear() + '-' + month + '-' + day;
        };

      var desc = practicedToday
        ? 'Streak safe today! Keep it going.'
        : ((typeof StreakManager !== 'undefined' && StreakManager.isAtRisk && StreakManager.isAtRisk())
          ? 'Practice now to keep your streak!'
          : 'Do a lesson now and start your new streak!');

      var today = new Date();
      var dayOfWeek = today.getDay();
      var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      var dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      var todayStr = formatLocalDate(today);
      var weekHtml = '';

      for (var i = 0; i < 7; i++) {
        var d = new Date(today);
        d.setDate(today.getDate() + mondayOffset + i);
        var dateStr = formatLocalDate(d);
        var isActive = !!activeDates[dateStr];
        var isToday = dateStr === todayStr;
        var cls = 'streak-week-day';
        if (isActive) cls += ' streak-week-done';
        if (isToday) cls += ' streak-week-today';
        weekHtml += '<div class="' + cls + '">' +
          '<span class="streak-week-label">' + dayLabels[i] + '</span>' +
          '<span class="streak-week-circle" aria-hidden="true"></span>' +
        '</div>';
      }

      return '<div class="streak-popover-inner">' +
        '<div class="streak-popover-top">' +
          '<div class="streak-popover-text">' +
            '<div class="streak-popover-count">' + streakCount + ' day streak</div>' +
            '<div class="streak-popover-desc">' + escapeHTML(desc) + '</div>' +
          '</div>' +
          '<span class="streak-popover-flame-bg material-symbols-outlined" aria-hidden="true">local_fire_department</span>' +
        '</div>' +
        '<div class="streak-popover-week">' + weekHtml + '</div>' +
      '</div>';
    },

    initStreakPopover: function() {
      var wrap = document.getElementById('statsBarStreakWrap');
      var btn = document.getElementById('statsBarStreakBtn');
      var popover = document.getElementById('streakPopover');
      if (!wrap || !btn || !popover) return;

      if (wrap._streakPopoverInit) return;
      wrap._streakPopoverInit = true;

      var isOpen = false;
      var dismissedByClick = false;

      function setOpen(open) {
        isOpen = open;
        popover.classList.toggle('is-open', open);
        btn.classList.toggle('is-active', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        popover.setAttribute('aria-hidden', open ? 'false' : 'true');
      }

      function showPopover() {
        if (!isOpen) setOpen(true);
      }

      function hidePopover() {
        if (isOpen) setOpen(false);
      }

      wrap.addEventListener('mouseenter', function() {
        if (!dismissedByClick) showPopover();
      });

      wrap.addEventListener('mouseleave', function() {
        hidePopover();
        dismissedByClick = false;
      });

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          hidePopover();
          dismissedByClick = true;
        } else {
          dismissedByClick = false;
          showPopover();
        }
      });
    },

    refreshStreakPopover: function() {
      var popover = document.getElementById('streakPopover');
      var btn = document.getElementById('statsBarStreakBtn');
      if (!popover || !btn) return;

      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      popover.innerHTML = this.buildStreakPopoverHtml(streak);
      btn.querySelector('strong').textContent = streakCount;
      btn.classList.toggle('stats-bar-streak-inactive', streakCount === 0);
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
        var isDone = card.statusClass.indexOf('mode-card-status-done') !== -1;
        var actionLabel = isDone ? 'REVIEW' : card.action;
        var actionClass = isDone ? 'mode-card-action mode-card-action-outline' : 'mode-card-action';
        html += '<div class="mode-card" onclick="' + card.onclick + '">' +
          '<div class="mode-card-icon" style="background:' + card.iconColor + '20;color:' + card.iconColor + '">' +
            '<span class="material-symbols-outlined">' + card.icon + '</span>' +
          '</div>' +
          '<div class="mode-card-body">' +
            '<div class="mode-card-kicker"><span class="mode-card-kicker-text">' + escapeHTML(card.kicker.split(' · ')[0] || card.kicker) + '</span><span class="mode-card-kicker-link"> · SEE DETAILS</span></div>' +
            '<div class="mode-card-title">' + escapeHTML(card.title) + '</div>' +
            '<div class="mode-card-status ' + card.statusClass + '">' + (isDone ? 'COMPLETED!' : escapeHTML(card.status)) + '</div>' +
          '</div>' +
          '<button type="button" class="' + actionClass + '" onclick="event.stopPropagation();' + card.onclick + '">' +
            escapeHTML(actionLabel) +
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
