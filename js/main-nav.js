// js/main-nav.js — Duolingo-style main navigation sidebar & mode cards

(function() {
  var NAV_ITEMS = [
    { id: 'learning', label: 'Learning', icon: 'menu_book', color: '#3b82f6', onclick: 'DashboardNav.openCourseSection(\'learning\')' },
    { id: 'vocabulary', label: 'Vocabulary', icon: 'translate', color: '#10b981', onclick: 'DashboardNav.openCourseSection(\'vocabulary\')' },
    { id: 'tests', label: 'Tests', icon: 'assignment', color: '#58cc02', onclick: 'DashboardNav.openTests()' },
    { id: 'crosswords', label: 'Crosswords', icon: 'grid_on', color: '#ff4b4b', onclick: 'DashboardNav.openCrosswordList()' },
    { id: 'video-exercises', label: 'Stories', icon: 'auto_stories', color: '#1cb0f6', onclick: 'DashboardNav.openVideoExercises()' },
    { id: 'wordle', label: 'Wordle', icon: 'casino', color: '#a855f7', onclick: 'DashboardNav.openWordleSection()' },
    { id: 'profile', label: 'Profile', icon: 'person', color: '#777777', onclick: 'DashboardNav.openMobileProfile()' }
  ];

  var MOBILE_BOTTOM_ITEMS = [
    { id: 'learning', label: 'Learning', icon: 'menu_book', color: '#3b82f6', onclick: 'DashboardNav.openCourseSection(\'learning\')' },
    { id: 'vocabulary', label: 'Vocabulary', icon: 'translate', color: '#10b981', onclick: 'DashboardNav.openCourseSection(\'vocabulary\')' },
    { id: 'tests', label: 'Tests', icon: 'assignment', color: '#58cc02', onclick: 'DashboardNav.openTests()' },
    { id: 'dictionaries', label: 'Dict', icon: 'menu_book', color: '#6366f1', onclick: 'DashboardNav.openMobileDictionaries()' },
    { id: 'more', label: 'More', icon: 'menu', color: '#777777', onclick: 'MainNav.toggleMobileMenu()' }
  ];

  var MOBILE_MENU_ITEMS = [
    'crosswords', 'video-exercises', 'wordle', 'profile'
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
    if (view === 'dashboard') return 'learning';
    if (view === 'subpage' || view === 'testsHub') return 'tests';
    if (view === 'course' || view === 'courseBlock' || view === 'courseUnit' || view === 'courseTheory' || view === 'courseEtapa') {
      var courseSection = (typeof DashboardNav !== 'undefined' && DashboardNav._courseSection) ? DashboardNav._courseSection : 'learning';
      return courseSection === 'vocabulary' ? 'vocabulary' : 'learning';
    }
    if (view === 'crosswordList' || view === 'crosswordPlay') return 'crosswords';
    if (view === 'videoExercises' || view === 'videoExercise') return 'video-exercises';
    if (view === 'wordleList' || view === 'wordlePlay') return 'wordle';
    if (view === 'fastExercises' || view === 'fastExerciseCategory' || view === 'fastExercisePoint') return 'dictionaries';
    if (view === 'profile') return 'profile';
    return null;
  }

  window.MainNav = {
    NAV_ITEMS: NAV_ITEMS,

    _isMobileStatsLayout: function() {
      return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    },

    _getActiveStatsBarScope: function() {
      if (this._isMobileStatsLayout()) {
        return document.querySelector('.mobile-nav-top-stats');
      }
      return document.querySelector('.dashboard-right-sidebar');
    },

    _getStatsBarButton: function(kind) {
      var scope = this._getActiveStatsBarScope();
      if (!scope) return null;
      var selectors = {
        lang: '.stats-bar-lang',
        streak: '.stats-bar-streak',
        dict: '.stats-bar-xp'
      };
      return scope.querySelector(selectors[kind] || kind);
    },

    buildSidebarHtml: function(activeId) {
      activeId = activeId || getActiveId() || 'learning';
      var hidePlans = typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI();

      var html = '<nav class="main-nav-sidebar" aria-label="Main navigation">' +
        '<a class="main-nav-brand" href="/course/learning" onclick="event.preventDefault(); DashboardNav.openCourseSection(\'learning\')">' +
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
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;

      var streakInactive = streakCount === 0;
      var popoverHtml = this.buildStreakPopoverHtml(streak);
      var langPopoverHtml = this.buildLangPopoverHtml();
      var dictPopoverHtml = this.buildDictPopoverHtml();
      var currentLang = this._getCurrentTranslateLang();
      var langLabel = this._getTranslateLangLabel(currentLang);

      return '<div class="main-nav-stats-bar" aria-label="Your stats">' +
        '<div class="stats-bar-lang-wrap">' +
          '<button type="button" class="stats-bar-item stats-bar-lang" aria-label="Change translation language" aria-expanded="false" aria-haspopup="true">' +
            '<span class="material-symbols-outlined">translate</span>' +
            '<strong>' + escapeHTML(langLabel) + '</strong>' +
          '</button>' +
          '<div class="lang-popover" role="dialog" aria-hidden="true">' + langPopoverHtml + '</div>' +
        '</div>' +
        '<div class="stats-bar-streak-wrap">' +
          '<button type="button" class="stats-bar-item stats-bar-streak' + (streakInactive ? ' stats-bar-streak-inactive' : '') + '" aria-label="View streak" aria-expanded="false" aria-haspopup="true">' +
            '<span class="material-symbols-outlined">local_fire_department</span>' +
            '<strong>' + streakCount + '</strong>' +
          '</button>' +
          '<div class="streak-popover" role="dialog" aria-hidden="true">' + popoverHtml + '</div>' +
        '</div>' +
        '<div class="stats-bar-dict-wrap">' +
          '<button type="button" class="stats-bar-item stats-bar-xp" aria-label="Open dictionaries" aria-expanded="false" aria-haspopup="true">' +
            '<span class="material-symbols-outlined">menu_book</span>' +
          '</button>' +
          '<div class="dict-popover" role="dialog" aria-hidden="true">' + dictPopoverHtml + '</div>' +
        '</div>' +
        '<div class="stats-bar-calc-wrap">' +
        '<button type="button" class="stats-bar-item stats-bar-calc" aria-label="Open score calculator" aria-expanded="false" aria-haspopup="true" onclick="openScoreCalculator(event)">' +
          '<span class="material-symbols-outlined">calculate</span>' +
        '</button>' +
        '</div>' +
      '</div>';
    },

    _getCurrentTranslateLang: function() {
      if (typeof Tools !== 'undefined' && Tools.getTranslateLang) {
        return Tools.getTranslateLang();
      }
      try {
        return localStorage.getItem('cambridge_translate_lang') || 'es';
      } catch (e) {
        return 'es';
      }
    },

    _getTranslateLangLabel: function(code) {
      var langs = (typeof Tools !== 'undefined' && Tools.getTranslateLanguages)
        ? Tools.getTranslateLanguages()
        : [];
      var found = langs.find(function(l) { return l.code === code; });
      if (found) return found.label;
      return String(code || 'es').toUpperCase();
    },

    buildLangPopoverHtml: function() {
      var currentLang = this._getCurrentTranslateLang();
      var langs = (typeof Tools !== 'undefined' && Tools.getTranslateLanguages)
        ? Tools.getTranslateLanguages()
        : [{ code: 'es', label: 'Español' }];
      var html = '<div class="lang-popover-inner">' +
        '<div class="lang-popover-kicker">Language</div>' +
        '<div class="lang-popover-title">Instructions &amp; translations</div>' +
        '<div class="lang-popover-options">';
      langs.forEach(function(lang) {
        var isActive = lang.code === currentLang;
        html += '<button type="button" class="lang-popover-option' + (isActive ? ' active' : '') + '" onclick="MainNav.selectLang(\'' + lang.code + '\')">' +
          '<span class="material-symbols-outlined">language</span>' +
          '<div><strong>' + escapeHTML(lang.label) + '</strong><small>' + escapeHTML(lang.code.toUpperCase()) + '</small></div>' +
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

    selectLang: function(code) {
      this.closeLangPopover();
      if (typeof Tools !== 'undefined' && Tools.setTranslateLang) {
        Tools.setTranslateLang(code);
      } else {
        try { localStorage.setItem('cambridge_translate_lang', code); } catch (e) {}
      }
      this.refreshLangPopover();
    },

    _initAnchoredPopover: function(opts) {
      var scope = opts.scope || this._getActiveStatsBarScope();
      if (!scope) return;

      var wrap = scope.querySelector(opts.wrapSelector);
      var btn = wrap && wrap.querySelector(opts.btnSelector);
      var popover = wrap && wrap.querySelector(opts.popoverSelector);
      if (!wrap || !btn || !popover) return;

      if (wrap[opts.initFlag]) return;
      wrap[opts.initFlag] = true;

      var isOpen = false;
      var dismissedByClick = false;
      var closeTimer = null;
      var HOVER_CLOSE_DELAY = 280;

      function setOpen(open) {
        if (open) MainNav._closeAllStatsBarPopovers();
        isOpen = open;
        popover.classList.toggle('is-open', open);
        btn.classList.toggle('is-active', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        popover.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open && opts.onOpen) opts.onOpen();
        if (!open && opts.onClose) opts.onClose();
      }

      function cancelClose() {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      }

      function scheduleClose() {
        cancelClose();
        closeTimer = setTimeout(function() {
          setOpen(false);
          dismissedByClick = false;
        }, HOVER_CLOSE_DELAY);
      }

      function handleEnter() {
        cancelClose();
        if (!dismissedByClick) setOpen(true);
      }

      wrap.addEventListener('mouseenter', handleEnter);
      wrap.addEventListener('mouseleave', scheduleClose);
      popover.addEventListener('mouseenter', handleEnter);
      popover.addEventListener('mouseleave', scheduleClose);

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

    _needsFixedLangPopover: function() {
      return !!(window.matchMedia && window.matchMedia('(min-width: 901px)').matches);
    },

    _positionLangPopover: function() {
      if (!this._needsFixedLangPopover()) return;

      var gap = 8;
      var margin = 12;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var popW = 300;

      document.querySelectorAll('.stats-bar-lang-wrap').forEach(function(wrap) {
        var popover = wrap.querySelector('.lang-popover');
        var btn = wrap.querySelector('.stats-bar-lang');
        if (!popover || !btn || !popover.classList.contains('is-open')) return;

        var rect = btn.getBoundingClientRect();
        var popH = popover.offsetHeight || 360;
        var top = rect.bottom + gap;
        var right = Math.max(margin, vw - rect.right);

        if (top + popH > vh - margin) {
          top = Math.max(margin, rect.top - popH - gap);
        }

        popover.style.top = top + 'px';
        popover.style.right = right + 'px';
        popover.style.left = 'auto';
        popover.style.bottom = 'auto';
        popover.style.width = popW + 'px';
      });
    },

    _resetLangPopoverPosition: function() {
      document.querySelectorAll('.lang-popover').forEach(function(popover) {
        popover.style.removeProperty('top');
        popover.style.removeProperty('right');
        popover.style.removeProperty('left');
        popover.style.removeProperty('bottom');
        popover.style.removeProperty('width');
      });
    },

    initLangPopover: function() {
      var self = this;
      this._initAnchoredPopover({
        wrapSelector: '.stats-bar-lang-wrap',
        btnSelector: '.stats-bar-lang',
        popoverSelector: '.lang-popover',
        initFlag: '_langPopoverInit',
        onOpen: function() {
          self._positionLangPopover();
          if (!self._langPopoverResizeHandler) {
            self._langPopoverResizeHandler = function() { self._positionLangPopover(); };
            window.addEventListener('resize', self._langPopoverResizeHandler);
            window.addEventListener('scroll', self._langPopoverResizeHandler, true);
          }
        },
        onClose: function() {
          self._resetLangPopoverPosition();
        }
      });
    },

    closeLangPopover: function() {
      document.querySelectorAll('.stats-bar-lang-wrap').forEach(function(wrap) {
        if (wrap._setPopoverOpen) wrap._setPopoverOpen(false);
      });
    },

    initDictPopover: function() {
      this._initAnchoredPopover({
        wrapSelector: '.stats-bar-dict-wrap',
        btnSelector: '.stats-bar-xp',
        popoverSelector: '.dict-popover',
        initFlag: '_dictPopoverInit'
      });
    },

    closeDictPopover: function() {
      document.querySelectorAll('.stats-bar-dict-wrap').forEach(function(wrap) {
        if (wrap._setPopoverOpen) wrap._setPopoverOpen(false);
      });
    },

    closeStreakPopover: function() {
      document.querySelectorAll('.stats-bar-streak-wrap').forEach(function(wrap) {
        if (wrap._setPopoverOpen) wrap._setPopoverOpen(false);
      });
    },

    _closeAllStatsBarPopovers: function() {
      this.closeLangPopover();
      this.closeStreakPopover();
      this.closeDictPopover();
      this._closeAllMobilePopovers();
      if (typeof ScoreCalculator !== 'undefined' && ScoreCalculator.closeInputPopover) {
        ScoreCalculator.closeInputPopover();
      }
    },

    refreshLangPopover: function() {
      var self = this;
      var currentLang = this._getCurrentTranslateLang();
      var langLabel = this._getTranslateLangLabel(currentLang);
      var hadOpen = false;
      document.querySelectorAll('.stats-bar-lang-wrap').forEach(function(wrap) {
        var popover = wrap.querySelector('.lang-popover');
        var btn = wrap.querySelector('.stats-bar-lang');
        if (!popover || !btn) return;
        hadOpen = hadOpen || popover.classList.contains('is-open');
        popover.innerHTML = self.buildLangPopoverHtml();
        var strong = btn.querySelector('strong');
        if (strong) strong.textContent = langLabel;
      });
      if (hadOpen) this._positionLangPopover();
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
        wrapSelector: '.stats-bar-streak-wrap',
        btnSelector: '.stats-bar-streak',
        popoverSelector: '.streak-popover',
        initFlag: '_streakPopoverInit'
      });
    },

    refreshStreakPopover: function() {
      var self = this;
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      document.querySelectorAll('.stats-bar-streak-wrap').forEach(function(wrap) {
        var popover = wrap.querySelector('.streak-popover');
        var btn = wrap.querySelector('.stats-bar-streak');
        if (!popover || !btn) return;
        popover.innerHTML = self.buildStreakPopoverHtml(streak);
        btn.querySelector('strong').textContent = streakCount;
        btn.classList.toggle('stats-bar-streak-inactive', streakCount === 0);
      });
    },

    buildDesktopModeCardsHtml: function(exams) {
      exams = exams || [];
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

      var cwProgress = (typeof DashboardNav !== 'undefined' && DashboardNav._getCwProgress) ? DashboardNav._getCwProgress() : {};
      var cwCompleted = Object.values(cwProgress).filter(function(p) { return p && p.completed; }).length;
      var cwStreak = (typeof DashboardNav !== 'undefined' && DashboardNav._calcCwStreak) ? DashboardNav._calcCwStreak(cwProgress) : 0;

      var cards = [
        {
          title: 'Learning',
          status: 'Grammar, reviews & progress tests',
          statusClass: '',
          onclick: 'DashboardNav.openCourseSection(\'learning\')',
          icon: 'menu_book',
          iconColor: '#3b82f6',
          super: true
        },
        {
          title: 'Vocabulary',
          status: 'Units, phrasal verbs & idioms',
          statusClass: '',
          onclick: 'DashboardNav.openCourseSection(\'vocabulary\')',
          icon: 'translate',
          iconColor: '#10b981',
          super: true
        },
        {
          title: 'Tests',
          status: testStatus,
          statusClass: completedExams > 0 ? 'mode-card-status-done' : '',
          onclick: 'DashboardNav.openTests()',
          icon: 'assignment',
          iconColor: '#58cc02',
          super: true,
          badge: availableCount > 0 ? availableCount + '+' : ''
        },
        {
          title: 'Crosswords',
          status: cwCompleted > 0
            ? cwCompleted + ' completed' + (cwStreak > 0 ? ' · ' + cwStreak + ' day streak' : '')
            : 'Solve today\'s puzzle',
          statusClass: cwCompleted > 0 ? 'mode-card-status-done' : '',
          onclick: 'DashboardNav.openCrosswordList()',
          icon: 'grid_on',
          iconColor: '#ff4b4b',
          badge: cwStreak > 0 ? cwStreak + '' : ''
        }
      ];

      var html = '<div class="desktop-mode-cards">';
      cards.forEach(function(card) {
        html += '<div class="mode-card" onclick="' + card.onclick + '" role="button" tabindex="0">' +
          '<div class="mode-card-body">' +
            '<div class="mode-card-title-row">' +
              '<span class="mode-card-title">' + escapeHTML(card.title) + '</span>' +
              (card.super ? '<span class="mode-card-super">SUPER</span>' : '') +
            '</div>' +
            '<div class="mode-card-status ' + (card.statusClass || '') + '">' + escapeHTML(card.status) + '</div>' +
          '</div>' +
          '<div class="mode-card-icon-wrap">' +
            '<div class="mode-card-icon" style="color:' + card.iconColor + '">' +
              '<span class="material-symbols-outlined">' + card.icon + '</span>' +
            '</div>' +
            (card.badge ? '<span class="mode-card-icon-badge">' + escapeHTML(card.badge) + '</span>' : '') +
          '</div>' +
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
      return '';
    },

    buildMobileBottomNavHtml: function(activeId) {
      activeId = activeId || getActiveId() || 'learning';
      var html = '<nav class="mobile-bottom-nav mobile-bottom-nav--duo" aria-label="Mobile navigation">';
      MOBILE_BOTTOM_ITEMS.forEach(function(item) {
        var isActive = item.id === activeId || (item.id === 'more' && MOBILE_MENU_ITEMS.indexOf(activeId) !== -1);
        html += '<button type="button" class="mobile-bottom-nav-btn' + (isActive ? ' active' : '') + '"' +
          ' data-nav-id="' + item.id + '"' +
          ' aria-label="' + escapeHTML(item.label) + '"' +
          ' onclick="' + item.onclick + '"' +
          ' style="--nav-color:' + item.color + '">' +
          '<span class="mobile-bottom-nav-icon"><span class="material-symbols-outlined">' + item.icon + '</span></span>' +
        '</button>';
      });
      html += '</nav>';
      return html;
    },

    buildMobileMenuSheetHtml: function(activeId) {
      activeId = activeId || getActiveId() || 'learning';
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
      if (!this._isMobileStatsLayout()) return;

      var scope = document.querySelector('.mobile-nav-top-stats');
      if (!scope) return;

      var popoverConfigs = [
        { wrapSelector: '.stats-bar-lang-wrap', btnSelector: '.stats-bar-lang', popoverSelector: '.lang-popover' },
        { wrapSelector: '.stats-bar-streak-wrap', btnSelector: '.stats-bar-streak', popoverSelector: '.streak-popover' },
        { wrapSelector: '.stats-bar-dict-wrap', btnSelector: '.stats-bar-xp', popoverSelector: '.dict-popover' }
      ];

      popoverConfigs.forEach(function(cfg) {
        var wrap = scope.querySelector(cfg.wrapSelector);
        var btn = wrap && wrap.querySelector(cfg.btnSelector);
        var popover = wrap && wrap.querySelector(cfg.popoverSelector);
        if (!wrap || !btn || !popover || wrap._mobilePopoverInit) return;
        wrap._mobilePopoverInit = true;

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var isOpen = popover.classList.contains('is-open');
          self._closeAllStatsBarPopovers();
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
          if (e.target.closest('.stats-bar-lang-wrap, .stats-bar-streak-wrap, .stats-bar-dict-wrap')) return;
          self._closeAllMobilePopovers();
        });
      }
    },

    _closeAllMobilePopovers: function() {
      document.querySelectorAll('.lang-popover, .streak-popover, .dict-popover').forEach(function(p) {
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
