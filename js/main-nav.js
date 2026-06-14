// js/main-nav.js — Duolingo-style main navigation sidebar & mode cards

(function() {
  var NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home', color: '#1cb0f6', onclick: 'loadDashboard()' },
    { id: 'course', label: 'Course', icon: 'auto_stories', color: '#ff9600', onclick: 'BentoGrid.openLessons()' },
    { id: 'practice', label: 'Practice', icon: 'edit_note', color: '#ff9600', onclick: 'BentoGrid.selectMode(\'practice\')' },
    { id: 'simulation', label: 'Simulation', icon: 'assignment', color: '#ce82ff', onclick: 'BentoGrid.selectMode(\'exam\')' },
    { id: 'crosswords', label: 'Crosswords', icon: 'grid_on', color: '#ff4b4b', onclick: 'BentoGrid.openCrosswordList()' },
    { id: 'dictionaries', label: 'Dictionaries', icon: 'menu_book', color: '#6366f1', onclick: 'FastExercises._showDictionariesHome()' },
    { id: 'calculator', label: 'Calculator', icon: 'calculate', color: '#ff9600', onclick: 'openScoreCalculator()' },
    { id: 'profile', label: 'Profile', icon: 'person', color: '#777777', onclick: 'BentoGrid.openMobileProfile()' }
  ];

  var MOBILE_BOTTOM_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home', color: '#1cb0f6', onclick: 'BentoGrid.goMobileHome()' },
    { id: 'course', label: 'Course', icon: 'auto_stories', color: '#ff9600', onclick: 'BentoGrid.openLessons()' },
    { id: 'practice', label: 'Practice', icon: 'edit_note', color: '#ff9600', onclick: 'BentoGrid.selectMode(\'practice\')' },
    { id: 'dictionaries', label: 'Dict', icon: 'menu_book', color: '#6366f1', onclick: 'BentoGrid.openMobileDictionaries()' },
    { id: 'more', label: 'More', icon: 'menu', color: '#777777', onclick: 'MainNav.toggleMobileMenu()' }
  ];

  var MOBILE_MENU_ITEMS = [
    'simulation', 'crosswords', 'calculator', 'profile'
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
          '<img src="Assets/images/sunelogoreduced2.svg" class="main-nav-logo" alt="Sune English">' +
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
        'C1': { bg: '#fff3e0', color: '#e65100' },
        'B1': { bg: '#fff8e6', color: '#ce7c3a' },
        'B2': { bg: '#fff3e0', color: '#e65100' }
      };
      var lc = levelColors[level] || levelColors['C1'];

      var streakInactive = streakCount === 0;
      var popoverHtml = this.buildStreakPopoverHtml(streak);
      var levelPopoverHtml = this.buildLevelPopoverHtml(level);
      var dictPopoverHtml = this.buildDictPopoverHtml();

      return '<div class="main-nav-stats-bar" aria-label="Your stats">' +
        '<div class="stats-bar-level-wrap" id="statsBarLevelWrap">' +
          '<button type="button" class="stats-bar-item stats-bar-level" id="statsBarLevelBtn" aria-label="Change level" aria-expanded="false" aria-haspopup="true" style="background:' + lc.bg + ';color:' + lc.color + '">' +
            '<span class="material-symbols-outlined">school</span>' +
            '<strong>' + escapeHTML(level) + '</strong>' +
          '</button>' +
          '<div class="level-popover" id="levelPopover" role="dialog" aria-hidden="true">' + levelPopoverHtml + '</div>' +
        '</div>' +
        '<div class="stats-bar-streak-wrap" id="statsBarStreakWrap">' +
          '<button type="button" class="stats-bar-item stats-bar-streak' + (streakInactive ? ' stats-bar-streak-inactive' : '') + '" id="statsBarStreakBtn" aria-label="View streak" aria-expanded="false" aria-haspopup="true">' +
            '<span class="material-symbols-outlined">local_fire_department</span>' +
            '<strong>' + streakCount + '</strong>' +
          '</button>' +
          '<div class="streak-popover" id="streakPopover" role="dialog" aria-hidden="true">' + popoverHtml + '</div>' +
        '</div>' +
        '<div class="stats-bar-dict-wrap" id="statsBarDictWrap">' +
          '<button type="button" class="stats-bar-item stats-bar-xp" id="statsBarDictBtn" aria-label="Open dictionaries" aria-expanded="false" aria-haspopup="true">' +
            '<span class="material-symbols-outlined">menu_book</span>' +
            '<strong>' + xp + '</strong>' +
          '</button>' +
          '<div class="dict-popover" id="dictPopover" role="dialog" aria-hidden="true">' + dictPopoverHtml + '</div>' +
        '</div>' +
      '</div>';
    },

    buildLevelPopoverHtml: function(currentLevel) {
      currentLevel = (currentLevel || (typeof AppState !== 'undefined' && AppState.currentLevel) || 'C1').toUpperCase();
      var levels = [
        { code: 'B1', name: 'Preliminary', icon: 'school' },
        { code: 'B2', name: 'First', icon: 'workspace_premium' },
        { code: 'C1', name: 'Advanced', icon: 'auto_stories' }
      ];
      var html = '<div class="level-popover-inner">' +
        '<div class="level-popover-kicker">Choose level</div>' +
        '<div class="level-popover-title">What are you studying?</div>' +
        '<div class="level-popover-options">';
      levels.forEach(function(level) {
        var isActive = level.code === currentLevel;
        html += '<button type="button" class="level-popover-option' + (isActive ? ' active' : '') + '" onclick="MainNav.selectLevel(\'' + level.code + '\')">' +
          '<span class="material-symbols-outlined">' + level.icon + '</span>' +
          '<div><strong>' + level.code + '</strong><small>' + level.name + '</small></div>' +
        '</button>';
      });
      html += '</div></div>';
      return html;
    },

    buildDictPopoverHtml: function() {
      var cards = [
        { label: 'General', icon: 'search', ns: 'FastExercises', method: '_showGeneralDictionary' },
        { label: 'Vocabulary', icon: 'library_books', ns: 'FastExercises', method: '_showVocabDictionary' },
        { label: 'Word Formation', icon: 'text_fields', ns: 'FastExercises', method: '_showWfDictionary' },
        { label: 'Phrasal Verbs', icon: 'auto_stories', ns: 'FastExercises', method: '_showPvDictionary' },
        { label: 'Idioms', icon: 'record_voice_over', ns: 'FastExercises', method: '_showIdDictionary' },
        { label: 'Collocations', icon: 'format_quote', ns: 'FastExercises', method: '_showCollocDictionary' },
        { label: 'Irregular Verbs', icon: 'table_view', ns: 'FastExercises', method: '_showIrregularVerbsDictionary' }
      ];
      var html = '<div class="dict-popover-inner">' +
        '<div class="dict-popover-title"><span class="material-symbols-outlined">menu_book</span> Dictionaries</div>' +
        '<div class="dict-popover-grid">';
      cards.forEach(function(card) {
        html += '<button type="button" class="dict-popover-card" onclick="MainNav.openDictionary(\'' + card.ns + '\', \'' + card.method + '\')">' +
          '<span class="material-symbols-outlined">' + card.icon + '</span>' +
          '<span>' + escapeHTML(card.label) + '</span>' +
        '</button>';
      });
      html += '</div></div>';
      return html;
    },

    openDictionary: function(ns, method) {
      this.closeDictPopover();
      var obj = window[ns];
      if (obj && typeof obj[method] === 'function') obj[method]();
    },

    selectLevel: function(level) {
      this.closeLevelPopover();
      if (typeof BentoGrid !== 'undefined' && BentoGrid.changeLevel) {
        BentoGrid.changeLevel(level);
      }
    },

    _initAnchoredPopover: function(opts) {
      var wrap = document.getElementById(opts.wrapId);
      var btn = document.getElementById(opts.btnId);
      var popover = document.getElementById(opts.popoverId);
      if (!wrap || !btn || !popover) return;

      if (wrap[opts.initFlag]) return;
      wrap[opts.initFlag] = true;

      var isOpen = false;
      var dismissedByClick = false;

      function setOpen(open) {
        isOpen = open;
        popover.classList.toggle('is-open', open);
        btn.classList.toggle('is-active', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        popover.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open && opts.onOpen) opts.onOpen();
        if (!open && opts.onClose) opts.onClose();
      }

      wrap.addEventListener('mouseenter', function() {
        if (!dismissedByClick) setOpen(true);
      });

      wrap.addEventListener('mouseleave', function() {
        setOpen(false);
        dismissedByClick = false;
      });

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          setOpen(false);
          dismissedByClick = true;
        } else {
          dismissedByClick = false;
          setOpen(true);
        }
      });

      wrap._setPopoverOpen = setOpen;
    },

    initLevelPopover: function() {
      this._initAnchoredPopover({
        wrapId: 'statsBarLevelWrap',
        btnId: 'statsBarLevelBtn',
        popoverId: 'levelPopover',
        initFlag: '_levelPopoverInit'
      });
    },

    closeLevelPopover: function() {
      var wrap = document.getElementById('statsBarLevelWrap');
      if (wrap && wrap._setPopoverOpen) wrap._setPopoverOpen(false);
    },

    initDictPopover: function() {
      this._initAnchoredPopover({
        wrapId: 'statsBarDictWrap',
        btnId: 'statsBarDictBtn',
        popoverId: 'dictPopover',
        initFlag: '_dictPopoverInit'
      });
    },

    closeDictPopover: function() {
      var wrap = document.getElementById('statsBarDictWrap');
      if (wrap && wrap._setPopoverOpen) wrap._setPopoverOpen(false);
    },

    refreshLevelPopover: function() {
      var popover = document.getElementById('levelPopover');
      var btn = document.getElementById('statsBarLevelBtn');
      if (!popover || !btn) return;
      var level = (typeof AppState !== 'undefined' && AppState.currentLevel) ? AppState.currentLevel : 'C1';
      popover.innerHTML = this.buildLevelPopoverHtml(level);
      btn.querySelector('strong').textContent = level;
      var levelColors = {
        'C1': { bg: '#fff3e0', color: '#e65100' },
        'B1': { bg: '#fff8e6', color: '#ce7c3a' },
        'B2': { bg: '#fff3e0', color: '#e65100' }
      };
      var lc = levelColors[level] || levelColors['C1'];
      btn.style.background = lc.bg;
      btn.style.color = lc.color;
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
      this._initAnchoredPopover({
        wrapId: 'statsBarStreakWrap',
        btnId: 'statsBarStreakBtn',
        popoverId: 'streakPopover',
        initFlag: '_streakPopoverInit'
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
          iconColor: '#ff9600'
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
          iconColor: '#ff9600'
        },
        {
          kicker: level + ' · TOOLS',
          title: 'Score Calculator',
          status: 'Estimate your Cambridge exam score',
          statusClass: '',
          action: 'CALCULATE',
          onclick: 'openScoreCalculator()',
          icon: 'calculate',
          iconColor: '#ff9600'
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
      this.setMobileActive(activeId);
    },

    buildMobileTopBarHtml: function() {
      return '<header class="mobile-nav-top-bar" aria-label="Mobile stats">' +
        '<a class="mobile-nav-top-brand" href="/" onclick="event.preventDefault(); loadDashboard()">' +
          '<img src="Assets/images/sunelogoreduced2.svg" class="mobile-nav-top-logo" alt="Sune English">' +
        '</a>' +
        '<div class="mobile-nav-top-stats">' + this.buildStatsBarHtml() + '</div>' +
      '</header>';
    },

    buildMobileBottomNavHtml: function(activeId) {
      activeId = activeId || getActiveId() || 'home';
      var html = '<nav class="mobile-bottom-nav mobile-bottom-nav--duo" aria-label="Mobile navigation">';
      MOBILE_BOTTOM_ITEMS.forEach(function(item) {
        var isActive = item.id === activeId || (item.id === 'more' && MOBILE_MENU_ITEMS.indexOf(activeId) !== -1);
        html += '<button type="button" class="mobile-bottom-nav-btn' + (isActive ? ' active' : '') + '"' +
          ' data-nav-id="' + item.id + '"' +
          ' onclick="' + item.onclick + '"' +
          ' style="--nav-color:' + item.color + '">' +
          '<span class="mobile-bottom-nav-icon"><span class="material-symbols-outlined">' + item.icon + '</span></span>' +
          '<span>' + escapeHTML(item.label) + '</span>' +
        '</button>';
      });
      html += '</nav>';
      return html;
    },

    buildMobileMenuSheetHtml: function(activeId) {
      activeId = activeId || getActiveId() || 'home';
      var hidePlans = typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI();
      var html = '<div class="mobile-menu-sheet" id="mobileMenuSheet" aria-hidden="true">' +
        '<div class="mobile-menu-sheet-backdrop" onclick="MainNav.closeMobileMenu()"></div>' +
        '<div class="mobile-menu-sheet-panel" role="dialog" aria-modal="true" aria-label="Navigation menu">' +
          '<div class="mobile-menu-sheet-handle" aria-hidden="true"></div>' +
          '<div class="mobile-menu-sheet-header">' +
            '<span class="mobile-menu-sheet-title">Menu</span>' +
            '<button type="button" class="mobile-menu-sheet-close" onclick="MainNav.closeMobileMenu()" aria-label="Close menu">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<ul class="mobile-menu-sheet-list">';

      NAV_ITEMS.forEach(function(item) {
        if (MOBILE_BOTTOM_ITEMS.some(function(b) { return b.id === item.id; })) return;
        var isActive = item.id === activeId;
        html += '<li>' +
          '<button type="button" class="main-nav-item mobile-menu-sheet-item' + (isActive ? ' active' : '') + '"' +
            ' data-nav-id="' + item.id + '"' +
            ' onclick="MainNav._mobileMenuNavigate(\'' + item.id + '\', \'' + item.onclick.replace(/'/g, "\\'") + '\')"' +
            ' style="--nav-color:' + item.color + '">' +
            '<span class="main-nav-icon"><span class="material-symbols-outlined">' + item.icon + '</span></span>' +
            '<span class="main-nav-label">' + escapeHTML(item.label) + '</span>' +
          '</button>' +
        '</li>';
      });

      if (!hidePlans) {
        var plansActive = (typeof AppState !== 'undefined' && AppState.currentView === 'premium');
        html += '<li>' +
          '<button type="button" class="main-nav-item mobile-menu-sheet-item' + (plansActive ? ' active' : '') + '"' +
            ' data-nav-id="plans"' +
            ' onclick="MainNav._mobileMenuNavigate(\'plans\', \'UserProfile.renderPremiumSection()\')"' +
            ' style="--nav-color:#ffc800">' +
            '<span class="main-nav-icon"><span class="material-symbols-outlined">workspace_premium</span></span>' +
            '<span class="main-nav-label">Plans</span>' +
          '</button>' +
        '</li>';
      }

      html += '</ul></div></div>';
      return html;
    },

    _mobileMenuNavigate: function(navId, onclickStr) {
      this.closeMobileMenu();
      if (onclickStr) {
        try { (new Function(onclickStr))(); } catch (e) {}
      }
      this.setMobileActive(navId);
    },

    ensureMobileMenuSheet: function() {
      if (document.getElementById('mobileMenuSheet')) return;
      var wrapper = document.createElement('div');
      wrapper.innerHTML = this.buildMobileMenuSheetHtml();
      var sheet = wrapper.firstElementChild;
      if (sheet) document.body.appendChild(sheet);
    },

    openMobileMenu: function() {
      this.ensureMobileMenuSheet();
      var sheet = document.getElementById('mobileMenuSheet');
      if (!sheet) return;
      sheet.classList.add('is-open');
      sheet.setAttribute('aria-hidden', 'false');
      document.body.classList.add('mobile-menu-open');
      document.querySelectorAll('.mobile-bottom-nav-btn[data-nav-id="more"]').forEach(function(btn) {
        btn.classList.add('active');
      });
    },

    closeMobileMenu: function() {
      var sheet = document.getElementById('mobileMenuSheet');
      if (!sheet) return;
      sheet.classList.remove('is-open');
      sheet.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mobile-menu-open');
      this.setMobileActive(getActiveId());
    },

    toggleMobileMenu: function() {
      var sheet = document.getElementById('mobileMenuSheet');
      if (sheet && sheet.classList.contains('is-open')) this.closeMobileMenu();
      else this.openMobileMenu();
    },

    setMobileActive: function(activeId) {
      activeId = activeId || getActiveId();
      document.querySelectorAll('.mobile-bottom-nav-btn[data-nav-id]').forEach(function(btn) {
        var id = btn.getAttribute('data-nav-id');
        var isMoreGroup = id === 'more' && activeId && MOBILE_MENU_ITEMS.indexOf(activeId) !== -1;
        btn.classList.toggle('active', id === activeId || isMoreGroup);
      });
      document.querySelectorAll('.mobile-menu-sheet-item').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-nav-id') === activeId);
      });
    },

    initMobileStatsPopovers: function() {
      var self = this;
      var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      if (!isMobile) return;

      var popoverConfigs = [
        { wrapId: 'statsBarLevelWrap', btnId: 'statsBarLevelBtn', popoverId: 'levelPopover', closeFn: 'closeLevelPopover' },
        { wrapId: 'statsBarStreakWrap', btnId: 'statsBarStreakBtn', popoverId: 'streakPopover' },
        { wrapId: 'statsBarDictWrap', btnId: 'statsBarDictBtn', popoverId: 'dictPopover', closeFn: 'closeDictPopover' }
      ];

      popoverConfigs.forEach(function(cfg) {
        var wrap = document.getElementById(cfg.wrapId);
        var btn = document.getElementById(cfg.btnId);
        var popover = document.getElementById(cfg.popoverId);
        if (!wrap || !btn || !popover || wrap._mobilePopoverInit) return;
        wrap._mobilePopoverInit = true;

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var isOpen = popover.classList.contains('is-open');
          self._closeAllMobilePopovers();
          if (!isOpen) {
            popover.classList.add('is-open');
            btn.classList.add('is-active');
            btn.setAttribute('aria-expanded', 'true');
            popover.setAttribute('aria-hidden', 'false');
            document.body.classList.add('mobile-popover-open');
          }
        });
      });

      if (!document._mobilePopoverBackdropInit) {
        document._mobilePopoverBackdropInit = true;
        document.addEventListener('click', function(e) {
          if (!document.body.classList.contains('mobile-popover-open')) return;
          if (e.target.closest('.stats-bar-level-wrap, .stats-bar-streak-wrap, .stats-bar-dict-wrap')) return;
          self._closeAllMobilePopovers();
        });
      }
    },

    _closeAllMobilePopovers: function() {
      document.querySelectorAll('.level-popover, .streak-popover, .dict-popover').forEach(function(p) {
        p.classList.remove('is-open');
        p.setAttribute('aria-hidden', 'true');
      });
      document.querySelectorAll('button.stats-bar-item').forEach(function(btn) {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-expanded', 'false');
      });
      document.body.classList.remove('mobile-popover-open');
    }
  };
})();
