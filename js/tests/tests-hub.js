// js/tests/tests-hub.js — Unified Tests hub (Practice + Simulation)

(function() {
  var SECTION_KEYS = ['reading', 'listening', 'writing', 'speaking'];

  var SECTION_ART = {
    reading: 'Assets/images/reading.svg',
    listening: 'Assets/images/listening.svg',
    writing: 'Assets/images/writing.svg',
    speaking: 'Assets/images/speaking.svg'
  };

  var SECTION_CARD_THEME = {
    reading:   { bg: '#eff6ff', border: '#93c5fd', title: '#1e3a8a', accent: '#3b82f6' },
    listening: { bg: '#fffbeb', border: '#fcd34d', title: '#78350f', accent: '#f59e0b' },
    writing:   { bg: '#ecfdf5', border: '#6ee7b7', title: '#064e3b', accent: '#10b981' },
    speaking:  { bg: '#fff8e6', border: '#ffca6b', title: '#78350f', accent: '#e28000' }
  };

  function _mi(name) {
    return '<span class="material-symbols-outlined">' + name + '</span>';
  }

  function _escape(str) {
    return (typeof BentoGrid !== 'undefined' && BentoGrid._escapeHTML)
      ? BentoGrid._escapeHTML(str)
      : String(str);
  }

  function _testsLevelMeta() {
    return {
      'B1': { label: 'B1', difficulty: 'Preliminary (PET)', iconColor: '#2563eb', headerColor: '#3b82f6', cardBg: '#eff6ff', cardBorder: '#93c5fd', cardText: '#1e3a8a', icon: 'school' },
      'B2': { label: 'B2', difficulty: 'First (FCE)', iconColor: '#d97706', headerColor: '#f59e0b', cardBg: '#fffbeb', cardBorder: '#fcd34d', cardText: '#78350f', icon: 'school' },
      'C1': { label: 'C1', difficulty: 'Advanced (CAE)', iconColor: '#dc2626', headerColor: '#ef4444', cardBg: '#fff1f2', cardBorder: '#fca5a5', cardText: '#7f1d1d', icon: 'school' },
      'C2': { label: 'C2', difficulty: 'Proficiency (CPE)', iconColor: '#7c3aed', headerColor: '#8b5cf6', cardBg: '#f5f3ff', cardBorder: '#c4b5fd', cardText: '#4c1d95', icon: 'school' }
    };
  }

  function _getExamProgressState(exam) {
    if (!exam || exam.status !== 'available') return 'pending';
    var secs = exam.sections || {};
    var anyStarted = false;
    var allDone = true;
    SECTION_KEYS.forEach(function(key) {
      var sec = secs[key];
      if (!sec) return;
      var done = (sec.completed || []).length;
      var prog = (sec.inProgress || []).length;
      if (done > 0 || prog > 0) anyStarted = true;
      if (done < (sec.total || 0)) allDone = false;
    });
    if (allDone && anyStarted) return 'done';
    if (anyStarted) return 'progress';
    return 'pending';
  }

  Object.assign(window.BentoGrid, {
    openTests: async function(levelFilter, examId, options) {
      options = options || {};
      var content = document.getElementById('main-content');
      if (!content) return;

      if (options.mode) {
        if (options.fromRoute && typeof UserProfile !== 'undefined' && UserProfile.setPreferredMode) {
          UserProfile.setPreferredMode(options.mode);
        } else if (typeof UserProfile !== 'undefined' && UserProfile.persistPreferredMode) {
          UserProfile.persistPreferredMode(options.mode);
        } else {
          AppState.currentMode = options.mode;
          localStorage.setItem('preferred_mode', options.mode);
        }
      } else if (AppState.currentView !== 'testsHub' && AppState.currentView !== 'exercise') {
        // Entering Tests from elsewhere — default to practice (not persisted global exam mode)
        if (typeof UserProfile !== 'undefined' && UserProfile.setPreferredMode) {
          UserProfile.setPreferredMode('practice');
        } else {
          AppState.currentMode = 'practice';
        }
      }

      AppState.currentView = 'testsHub';
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();

      var activeLevel = levelFilter || null;
      var activeExamId = examId || null;
      var isRandomTest = activeExamId === 'Random';
      if (options.fromRoute && options.mode && !activeLevel && !activeExamId) {
        activeLevel = AppState.currentLevel || 'C1';
      }
      if (activeLevel) AppState.currentLevel = activeLevel;

      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var LEVEL_META = _testsLevelMeta();

      var testsState = { view: 'testsHub', mode: AppState.currentMode || 'practice' };
      if (activeLevel) testsState.level = activeLevel;
      if (activeExamId) testsState.examId = activeExamId;
      if (!options.fromRoute && !options.skipHistory) {
        history.pushState(testsState, '', Router.stateToPath(testsState));
      }

      var sidebars = { left: '', right: '' };
      if (typeof BentoGrid !== 'undefined') {
        sidebars = BentoGrid._buildDashboardSidebars(exams);
      }
      var leftSidebarContent = sidebars.left;
      var rightSidebarContent = sidebars.right;

      var headerTitle = 'Choose a Level';
      var headerClass = ' cw-section-header--picker cw-section-header--tests cw-section-header--duo';
      var headerStyle = ' style="--cw-header-color:#58cc02"';
      var backOnclick = '';

      if (isRandomTest) {
        var randomMeta = LEVEL_META[activeLevel || level] || LEVEL_META['B2'];
        headerTitle = 'Random Mix';
        headerClass = ' cw-section-header--level cw-section-header--tests cw-section-header--duo';
        headerStyle = ' style="--cw-header-color:' + randomMeta.headerColor + '"';
        backOnclick = 'BentoGrid.openTests(\'' + (activeLevel || level) + '\')';
      } else if (activeExamId) {
        var examMatch = exams.find(function(e) { return e.id === activeExamId; });
        var examNum = examMatch ? examMatch.number : activeExamId.replace('Test', '');
        var examMeta = LEVEL_META[activeLevel || level] || LEVEL_META['B2'];
        headerTitle = 'Choose a Section';
        headerClass = ' cw-section-header--level cw-section-header--tests cw-section-header--duo';
        headerStyle = ' style="--cw-header-color:' + examMeta.headerColor + '"';
        backOnclick = 'BentoGrid.openTests(\'' + (activeLevel || level) + '\')';
      } else if (activeLevel) {
        var meta = LEVEL_META[activeLevel] || LEVEL_META['B2'];
        headerTitle = meta.difficulty;
        headerClass = ' cw-section-header--level cw-section-header--tests cw-section-header--duo';
        headerStyle = ' style="--cw-header-color:' + meta.headerColor + '"';
        backOnclick = 'BentoGrid.openTests()';
      }

      var mobileTopBarHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml
        ? MainNav.buildMobileTopBarHtml() : '';
      var mobileNavHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml
        ? MainNav.buildMobileBottomNavHtml('tests') : '';

      var loadingStart = (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.markShown)
        ? AppLoadingScreen.markShown()
        : Date.now();

      content.innerHTML =
        '<div class="dashboard-layout dashboard-layout--crossword-scroll">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center dashboard-center--crossword dashboard-center--mobile-hub dashboard-center--tests-hub">' +
            mobileTopBarHtml +
            '<div class="cw-section-header' + headerClass + '"' + headerStyle + '>' +
              (backOnclick
                ? '<button type="button" class="cw-section-back" onclick="' + backOnclick + '" aria-label="Back">' + _mi('arrow_back') + '</button>'
                : '') +
              '<div class="cw-section-header-text">' +
                '<div class="cw-section-title">' + _escape(headerTitle) + '</div>' +
              '</div>' +
            '</div>' +
            BentoGrid._buildTestsModeBarHtml() +
            '<div class="cw-page-content" id="testsCenterScroll">' +
              '<div class="tests-hub-page" id="testsHubPage">' + BentoGrid._buildInlinePawLoadingHtml() + '</div>' +
            '</div>' +
            mobileNavHtml +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof BentoGrid !== 'undefined') BentoGrid._startGradeCarousel();
      if (typeof MainNav !== 'undefined' && MainNav.setActive) MainNav.setActive('tests');

      var hubPage = document.getElementById('testsHubPage');
      if (!hubPage) return;

      await new Promise(function(resolve) { requestAnimationFrame(function() { requestAnimationFrame(resolve); }); });

      var bodyHtml = '';
      if (isRandomTest) {
        bodyHtml = BentoGrid._buildRandomTestPageHtml(activeLevel || level);
      } else if (activeExamId) {
        bodyHtml = BentoGrid._buildTestsSectionCardsHtml(exams, activeExamId, activeLevel || level);
      } else if (activeLevel) {
        bodyHtml = BentoGrid._buildTestsPathMapHtml(exams, activeLevel);
      } else {
        bodyHtml = BentoGrid._buildTestsLevelCardsHtml();
      }

      if (typeof AppLoadingScreen !== 'undefined' && AppLoadingScreen.waitMinDuration) {
        await AppLoadingScreen.waitMinDuration(loadingStart);
      }

      hubPage.innerHTML = bodyHtml;

      if (activeLevel && !activeExamId) {
        BentoGrid._scrollTestsPathToCurrent();
      }
    },

    setTestsMode: function(mode) {
      if (typeof UserProfile !== 'undefined' && UserProfile.persistPreferredMode) {
        UserProfile.persistPreferredMode(mode);
      } else {
        AppState.currentMode = mode;
        localStorage.setItem('preferred_mode', mode);
      }
      var hubPage = document.getElementById('testsHubPage');
      if (!hubPage) return;

      document.querySelectorAll('.tests-mode-toggle-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
      });

      var path = window.location.pathname || '';
      var segments = path.split('/').filter(Boolean);
      if (segments[0] === 'tests' && segments.length >= 3) {
        var levelIdx = 1;
        if (segments[1] === 'practice' || segments[1] === 'simulation') levelIdx = 2;
        var level = (segments[levelIdx] || AppState.currentLevel || 'C1').toUpperCase();
        if (segments[levelIdx + 1] && segments[levelIdx + 1].toLowerCase() === 'random') {
          hubPage.innerHTML = BentoGrid._buildRandomTestPageHtml(level);
          var randomState = { view: 'testsHub', mode: mode, level: level, examId: 'Random' };
          history.replaceState(randomState, '', Router.stateToPath(randomState));
          return;
        }
        if (segments[levelIdx + 1] && /^test-\d+$/i.test(segments[levelIdx + 1])) {
          var examId = segments[levelIdx + 1].replace('test-', 'Test');
          var exams = window.EXAMS_DATA[level] || [];
          hubPage.innerHTML = BentoGrid._buildTestsSectionCardsHtml(exams, examId, level);
          var examState = { view: 'testsHub', mode: mode, level: level, examId: examId };
          history.replaceState(examState, '', Router.stateToPath(examState));
        }
      }
    },

    showTestsModeHelp: function() {
      if (document.getElementById('testsModeHelpOverlay')) return;

      var overlay = document.createElement('div');
      overlay.id = 'testsModeHelpOverlay';
      overlay.className = 'tests-mode-help-overlay';
      overlay.innerHTML =
        '<div class="tests-mode-help-modal" role="dialog" aria-modal="true" aria-labelledby="tests-mode-help-title">' +
          '<button type="button" class="tests-mode-help-close" onclick="BentoGrid.closeTestsModeHelp()" aria-label="Close">' + _mi('close') + '</button>' +
          '<div class="tests-mode-help-hero">' +
            '<img src="Assets/images/Cabezasune.svg" alt="" class="tests-mode-help-mascot" aria-hidden="true">' +
            '<div class="tests-mode-help-speech">' +
              '<p class="tests-mode-help-kicker">Test modes</p>' +
              '<h2 id="tests-mode-help-title" class="tests-mode-help-title">Practice vs Simulation</h2>' +
            '</div>' +
          '</div>' +
          '<div class="tests-mode-help-cards">' +
            '<div class="tests-mode-help-card tests-mode-help-card--practice">' +
              '<div class="tests-mode-help-card-header">' +
                '<div class="tests-mode-help-card-badge">' + _mi('edit_note') + '</div>' +
                '<div class="tests-mode-help-card-head"><span>Practice</span></div>' +
              '</div>' +
              '<ul class="tests-mode-help-list">' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>No time limits — learn at your own pace</li>' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>Pick any part or section freely</li>' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>AI feedback on writing tasks</li>' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>Ideal for focused study and revision</li>' +
              '</ul>' +
            '</div>' +
            '<div class="tests-mode-help-card tests-mode-help-card--simulation">' +
              '<div class="tests-mode-help-card-header">' +
                '<div class="tests-mode-help-card-badge">' + _mi('timer') + '</div>' +
                '<div class="tests-mode-help-card-head"><span>Simulation</span></div>' +
              '</div>' +
              '<ul class="tests-mode-help-list">' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>Timed exam conditions like the real test</li>' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>Full exam mode with section timers</li>' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>Limited daily exam attempts</li>' +
                '<li><span class="tests-mode-help-check">' + _mi('check') + '</span>Best for exam-day preparation</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
          '<p class="tests-mode-help-foot">Switch anytime with the toggle above. Your progress is saved in both modes.</p>' +
          '<button type="button" class="tests-mode-help-cta" onclick="BentoGrid.closeTestsModeHelp()">Got it!</button>' +
        '</div>';

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) BentoGrid.closeTestsModeHelp();
      });
      document.body.appendChild(overlay);
    },

    closeTestsModeHelp: function() {
      var overlay = document.getElementById('testsModeHelpOverlay');
      if (overlay) overlay.remove();
    },

    _buildTestsModeBarHtml: function() {
      var mode = AppState.currentMode || 'practice';
      var practiceActive = mode !== 'exam' ? ' active' : '';
      var examActive = mode === 'exam' ? ' active' : '';
      return '<div class="tests-mode-bar">' +
        '<div class="tests-mode-toggle" role="group" aria-label="Test attempt mode">' +
          '<button type="button" class="tests-mode-toggle-btn tests-mode-toggle-btn--practice' + practiceActive + '" data-mode="practice" onclick="BentoGrid.setTestsMode(\'practice\')">' +
            _mi('edit_note') + '<span>Practice</span>' +
          '</button>' +
          '<button type="button" class="tests-mode-toggle-btn tests-mode-toggle-btn--simulation' + examActive + '" data-mode="exam" onclick="BentoGrid.setTestsMode(\'exam\')">' +
            _mi('timer') + '<span>Simulation</span>' +
          '</button>' +
        '</div>' +
        '<button type="button" class="tests-mode-help-btn" onclick="BentoGrid.showTestsModeHelp()" aria-label="What is the difference between Practice and Simulation?" title="What\'s the difference?">' +
          _mi('help') +
        '</button>' +
      '</div>';
    },

    _buildTestsModeToggleHtml: function() {
      return BentoGrid._buildTestsModeBarHtml();
    },

    _buildTestsLevelCardsHtml: function() {
      var self = this;
      var LEVEL_META = _testsLevelMeta();
      var LEVEL_ORDER = ['B1', 'B2', 'C1', 'C2'];
      var availableLevels = LEVEL_ORDER.filter(function(lvl) {
        return (window.EXAMS_DATA[lvl] || []).some(function(e) { return e.status === 'available'; });
      });

      var html = '<div class="cw-level-cards desktop-mode-cards tests-level-cards">';
      availableLevels.forEach(function(lvl) {
        var meta = LEVEL_META[lvl] || LEVEL_META['B2'];
        var exams = window.EXAMS_DATA[lvl] || [];
        var available = exams.filter(function(e) { return e.status === 'available'; });
        var completed = 0;
        var inProgress = 0;
        available.forEach(function(exam) {
          var state = _getExamProgressState(exam);
          if (state === 'done') completed++;
          else if (state === 'progress') inProgress++;
        });
        var statusText = completed > 0
          ? completed + ' / ' + available.length + ' completed' + (inProgress > 0 ? ' · ' + inProgress + ' in progress' : '')
          : available.length + ' tests · ' + meta.difficulty;
        var statusClass = completed > 0 ? 'mode-card-status-done' : '';

        html += '<div class="mode-card mode-card--tests-level" data-tests-level="' + lvl.toLowerCase() + '"' +
          ' onclick="BentoGrid.openTests(\'' + lvl + '\')" role="button" tabindex="0">' +
          '<div class="mode-card-body">' +
            '<div class="mode-card-title-row">' +
              '<span class="mode-card-title">' + self._escapeHTML(meta.label) + '</span>' +
            '</div>' +
            '<div class="mode-card-status ' + statusClass + '">' + self._escapeHTML(statusText) + '</div>' +
          '</div>' +
          '<div class="mode-card-icon-wrap">' +
            '<div class="mode-card-icon">' + _mi(meta.icon) + '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      return html;
    },

    _buildTestsPathMapHtml: function(exams, levelId) {
      var self = this;
      var LEVEL_META = _testsLevelMeta();
      var meta = LEVEL_META[levelId] || LEVEL_META['B2'];
      var available = exams.filter(function(e) { return e.status === 'available'; });

      var hasExamsPack = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasExamsPack()
        : !!AppState.hasExamsPack;

      var firstIncompleteIdx = -1;
      available.forEach(function(exam, idx) {
        if (firstIncompleteIdx !== -1) return;
        if (_getExamProgressState(exam) !== 'done') firstIncompleteIdx = idx;
      });
      if (firstIncompleteIdx === -1) firstIncompleteIdx = available.length - 1;

      var html = '<div class="cw-path-map tests-path-map" data-level="' + levelId + '" style="' +
        '--cw-header-color:' + meta.headerColor + ';' +
        '--cw-icon-color:' + meta.iconColor + ';' +
        '--cw-card-bg:' + meta.cardBg + ';' +
        '--cw-card-border:' + meta.cardBorder + ';' +
        '--cw-card-text:' + meta.cardText +
        '">';

      if (typeof BentoGrid !== 'undefined' && BentoGrid._buildRandomTestPathCardHtml) {
        html += BentoGrid._buildRandomTestPathCardHtml(levelId);
      }

      html += '<div class="cw-path-grid tests-path-grid" role="list" aria-label="' + self._escapeHTML(levelId) + ' tests">';

      available.forEach(function(exam, idx) {
        var state = _getExamProgressState(exam);
        var isCurrent = idx === firstIncompleteIdx;
        var testNum = String(exam.number).padStart(3, '0');
        var locked = !hasExamsPack && idx > 0;

        var cellClass = 'cw-path-cell tests-path-cell';
        if (state === 'done') cellClass += ' cw-path-cell--done';
        else if (state === 'progress') cellClass += ' cw-path-cell--progress';
        else cellClass += ' cw-path-cell--pending';
        if (isCurrent && state !== 'done') cellClass += ' cw-path-cell--current';
        if (locked) cellClass += ' tests-path-cell--locked';

        var onclick = locked
          ? 'Dashboard.showExamsUpgradeGate()'
          : 'BentoGrid.openTests(\'' + levelId + '\', \'' + exam.id + '\')';

        html += '<button type="button" class="' + cellClass + '" onclick="' + onclick + '" title="Test ' + exam.number + '" aria-label="Test ' + testNum + '">';
        html += '<span class="cw-path-cell-num">' + testNum + '</span>';
        if (locked) html += '<span class="tests-path-lock">' + _mi('lock') + '</span>';
        html += '</button>';
      });

      html += '</div></div>';
      return html;
    },

    _buildRandomTestPathCardHtml: function(levelId) {
      var hasExamsPack = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasExamsPack()
        : !!AppState.hasExamsPack;
      var plan = window.MixedTest ? MixedTest.getStoredPlan() : null;
      var completedSet = window.MixedTest ? MixedTest.getCompletedSet() : new Set();
      var hasPlan = Array.isArray(plan) && plan.length > 0;
      var completedCount = hasPlan
        ? plan.filter(function(_, idx) { return completedSet.has(idx); }).length
        : 0;
      var allDone = hasPlan && completedCount === plan.length;

      var cardClass = 'tests-random-path-card';
      if (!hasExamsPack) cardClass += ' tests-random-path-card--locked';
      else if (allDone) cardClass += ' tests-random-path-card--done';
      else if (hasPlan && completedCount > 0) cardClass += ' tests-random-path-card--progress';

      var onclick = !hasExamsPack
        ? 'Dashboard.showExamsUpgradeGate()'
        : 'BentoGrid.openTests(\'' + levelId + '\', \'Random\')';

      var statusText = !hasExamsPack
        ? 'Pack Exams required'
        : (hasPlan
          ? (allDone ? 'Completed · ' + plan.length + ' exercises' : completedCount + '/' + plan.length + ' done')
          : 'Generate a custom mix');

      var html = '<button type="button" class="' + cardClass + '" onclick="' + onclick + '" aria-label="Random Test">';
      html += '<span class="tests-random-path-icon-wrap">' + _mi('shuffle') + '</span>';
      html += '<span class="tests-random-path-body">';
      html += '<span class="tests-random-path-title">Random Test</span>';
      html += '<span class="tests-random-path-sub">' + _escape(statusText) + '</span>';
      html += '</span>';
      if (!hasExamsPack) {
        html += '<span class="tests-random-path-lock">' + _mi('lock') + '</span>';
      } else if (hasPlan) {
        html += '<span class="tests-random-path-badge">' + completedCount + '/' + plan.length + '</span>';
      }
      html += '<span class="tests-random-path-chevron">' + _mi('chevron_right') + '</span>';
      html += '</button>';
      return html;
    },

    _buildRandomTestPageHtml: function(levelId) {
      var self = this;
      var hasExamsPack = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasExamsPack()
        : !!AppState.hasExamsPack;

      if (!hasExamsPack) {
        return '<div class="tests-random-locked">' +
          '<div class="tests-random-locked-icon">' + _mi('lock') + '</div>' +
          '<h2>Random Test</h2>' +
          '<p>Unlock Pack Exams to generate custom mixes from your available tests.</p>' +
          '<button type="button" class="tests-random-generate-btn" onclick="Dashboard.showExamsUpgradeGate()">' +
            _mi('lock') + '<span>Upgrade to unlock</span>' +
          '</button>' +
        '</div>';
      }

      var plan = window.MixedTest ? MixedTest.getStoredPlan() : null;
      var completedSet = window.MixedTest ? MixedTest.getCompletedSet() : new Set();
      var hasPlan = Array.isArray(plan) && plan.length > 0;

      if (!hasPlan) {
        return '<div class="tests-random-empty">' +
          '<div class="tests-random-empty-icon">' + _mi('shuffle') + '</div>' +
          '<h2>Build your random mix</h2>' +
          '<p>Combine exercises from different tests into one practice session. Speaking parts 3 &amp; 4 always share the same source test.</p>' +
          '<button type="button" class="tests-random-generate-btn" onclick="MixedTest.generateNew({ refreshPage: true })">' +
            _mi('shuffle') + '<span>Generate Random Test</span>' +
          '</button>' +
        '</div>';
      }

      var completedCount = plan.filter(function(_, idx) { return completedSet.has(idx); }).length;
      var isB1 = levelId === 'B1';
      var readingLabel = isB1 ? 'READING' : 'READING & UOE';

      var html = '<div class="tests-section-cards tests-random-page">';
      html += '<div class="tests-random-actions">';
      html += '<button type="button" class="tests-random-action-btn tests-random-action-btn--primary" onclick="MixedTest.generateNew({ refreshPage: true })">' +
        _mi('shuffle') + '<span>New mix</span></button>';
      html += '<button type="button" class="tests-random-action-btn" onclick="MixedTest.restart()">' +
        _mi('replay') + '<span>Repeat</span></button>';
      html += '<span class="tests-random-progress-pill">' + completedCount + '/' + plan.length + '</span>';
      html += '</div>';
      html += '<div class="tests-section-cards-grid">';

      SECTION_KEYS.forEach(function(sectionKey) {
        var items = [];
        plan.forEach(function(item, idx) {
          if (item.section === sectionKey) items.push({ item: item, idx: idx });
        });
        if (!items.length) return;

        var theme = SECTION_CARD_THEME[sectionKey] || SECTION_CARD_THEME.reading;
        var label = sectionKey === 'reading'
          ? readingLabel
          : sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
        var iconName = typeof Utils !== 'undefined' ? Utils.getMaterialIcon(sectionKey) : 'menu_book';
        var artSrc = SECTION_ART[sectionKey];
        var firstIncomplete = items.find(function(o) { return !completedSet.has(o.idx); });
        var startIdx = firstIncomplete ? firstIncomplete.idx : items[0].idx;

        html += '<div class="tests-section-card tests-section-card--' + sectionKey + '"' +
          ' style="--tests-card-bg:' + theme.bg + ';--tests-card-border:' + theme.border + ';--tests-card-title:' + theme.title + ';--tests-card-accent:' + theme.accent + '">';

        html += '<div class="tests-section-card-body">';
        html += '<div class="tests-section-card-title-row">';
        html += '<span class="material-symbols-outlined tests-section-card-icon">' + iconName + '</span>';
        html += '<h3 class="tests-section-card-title">' + _escape(label) + '</h3>';
        html += '</div>';

        html += '<div class="tests-section-card-parts">';
        items.forEach(function(o) {
          var chipClass = 'tests-part-chip';
          if (completedSet.has(o.idx)) chipClass += ' tests-part-chip--done';
          var tip = o.item.examId + ' · Part ' + o.item.part;
          html += '<button type="button" class="' + chipClass + '" onclick="MixedTest.startAtIndex(' + o.idx + ')" title="' + _escape(tip) + '">' + o.item.part + '</button>';
        });
        html += '</div>';

        html += '<div class="tests-section-card-footer">';
        html += '<button type="button" class="tests-section-play-btn" onclick="MixedTest.startAtIndex(' + startIdx + ')">' +
          _mi('play_arrow') + '<span>Play section</span></button>';
        html += '</div>';
        html += '</div>';

        html += '<div class="tests-section-card-art" aria-hidden="true">' +
          '<img src="' + artSrc + '" alt="" class="tests-section-card-img" onerror="this.classList.add(\'is-hidden\');this.nextElementSibling.classList.add(\'is-visible\')">' +
          '<span class="material-symbols-outlined tests-section-card-fallback">' + iconName + '</span>' +
        '</div>';

        html += '</div>';
      });

      html += '</div></div>';
      return html;
    },

    _buildTestsSectionCardsHtml: function(exams, examId, levelId) {
      var self = this;
      var exam = exams.find(function(e) { return e.id === examId; });
      if (!exam) return '<div class="fe-map-empty">Test not found.</div>';

      var isExamMode = AppState.currentMode === 'exam';
      var isB1 = levelId === 'B1';
      var readingLabel = isB1 ? 'READING' : 'READING & UOE';

      var html = '<div class="tests-section-cards">';

      if (isExamMode) {
        html += '<button type="button" class="tests-full-exam-btn" onclick="Exercise.startFullExam(\'' + exam.id + '\')">' +
          _mi('play_circle') + '<span>Start Full Exam</span>' +
        '</button>';
      }

      html += '<div class="tests-section-cards-grid">';

      SECTION_KEYS.forEach(function(sectionKey) {
        var section = exam.sections && exam.sections[sectionKey];
        if (!section) return;

        var theme = SECTION_CARD_THEME[sectionKey] || SECTION_CARD_THEME.reading;
        var label = sectionKey === 'reading' ? readingLabel : (section.name || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1));
        var iconName = typeof Utils !== 'undefined' ? Utils.getMaterialIcon(sectionKey) : 'menu_book';
        var artSrc = SECTION_ART[sectionKey];

        var lockInfo = self._getTestsSectionLockInfo(sectionKey);
        var isLocked = lockInfo.locked;

        html += '<div class="tests-section-card tests-section-card--' + sectionKey + (isLocked ? ' tests-section-card--locked' : '') + '"' +
          ' style="--tests-card-bg:' + theme.bg + ';--tests-card-border:' + theme.border + ';--tests-card-title:' + theme.title + ';--tests-card-accent:' + theme.accent + '">';

        html += '<div class="tests-section-card-body">';
        html += '<div class="tests-section-card-title-row">';
        html += '<span class="material-symbols-outlined tests-section-card-icon">' + iconName + '</span>';
        html += '<h3 class="tests-section-card-title">' + _escape(label) + '</h3>';
        if (lockInfo.badge) html += lockInfo.badge;
        html += '</div>';

        html += '<div class="tests-section-card-parts">';
        for (var i = 1; i <= section.total; i++) {
          var chipClass = 'tests-part-chip';
          if (section.completed && section.completed.indexOf(i) !== -1) chipClass += ' tests-part-chip--done';
          else if (section.inProgress && section.inProgress.indexOf(i) !== -1) chipClass += ' tests-part-chip--progress';

          if (isExamMode && !(section.completed && section.completed.indexOf(i) !== -1)) {
            html += '<span class="' + chipClass + ' tests-part-chip--locked" title="Complete the exam to review">' + i + '</span>';
          } else if (isLocked) {
            html += '<span class="' + chipClass + ' tests-part-chip--locked" onclick="' + lockInfo.click + '">' + i + '</span>';
          } else {
            html += '<button type="button" class="' + chipClass + '" onclick="Exercise.openPart(\'' + exam.id + '\', \'' + sectionKey + '\', ' + i + ')">' + i + '</button>';
          }
        }
        html += '</div>';

        html += '<div class="tests-section-card-footer">';
        if (!isLocked) {
          html += '<button type="button" class="tests-section-play-btn" onclick="' +
            (isExamMode ? 'Exercise.startFullSection(\'' + exam.id + '\', \'' + sectionKey + '\')' : 'Exercise.startFullSection(\'' + exam.id + '\', \'' + sectionKey + '\')') +
            '">' + _mi('play_arrow') + '<span>Play section</span></button>';
          html += '<button type="button" class="tests-section-results-btn" onclick="ScoreCalculator.showSectionResults(\'' + exam.id + '\', \'' + sectionKey + '\')" title="Section results">' +
            _mi('bar_chart') + '</button>';
        } else {
          html += '<button type="button" class="tests-section-play-btn tests-section-play-btn--locked" onclick="' + lockInfo.click + '">' +
            _mi('lock') + '<span>' + lockInfo.label + '</span></button>';
        }
        html += '</div>';

        html += '</div>';

        html += '<div class="tests-section-card-art" aria-hidden="true">' +
          '<img src="' + artSrc + '" alt="" class="tests-section-card-img" onerror="this.classList.add(\'is-hidden\');this.nextElementSibling.classList.add(\'is-visible\')">' +
          '<span class="material-symbols-outlined tests-section-card-fallback">' + iconName + '</span>' +
        '</div>';

        html += '</div>';
      });

      html += '</div></div>';
      return html;
    },

    _getTestsSectionLockInfo: function(sectionKey) {
      var isWritingSpeaking = sectionKey === 'writing' || sectionKey === 'speaking';
      if (!isWritingSpeaking) return { locked: false, click: '', label: '', badge: '' };

      if (typeof AccessControl !== 'undefined') {
        if (!AccessControl.canAccessWritingSpeaking().allowed) {
          return { locked: true, click: 'Auth._showAuthModal()', label: 'Sign in required', badge: '' };
        }
        if (AccessControl.isWritingSpeakingSectionLocked(sectionKey)) {
          var click = AccessControl.isPromotionMode()
            ? 'AccessControl.showRateLimitModal({ feature: \'' + sectionKey + '\' })'
            : 'Dashboard.showExamsUpgradeGate()';
          return { locked: true, click: click, label: 'Daily limit', badge: '' };
        }
      } else if (!AppState.isAuthenticated) {
        return { locked: true, click: 'Auth._showAuthModal()', label: 'Sign in required', badge: '' };
      } else if (!AppState.hasExamsPack) {
        var trialKey = sectionKey === 'writing' ? 'cambridge_free_writing_used' : 'cambridge_free_speaking_used';
        if (localStorage.getItem(trialKey)) {
          return { locked: true, click: 'Dashboard.showExamsUpgradeGate()', label: 'Upgrade required', badge: '' };
        }
        return { locked: false, click: '', label: '', badge: '<span class="tests-free-badge">1 free try</span>' };
      }
      return { locked: false, click: '', label: '', badge: '' };
    },

    _buildTestsStatsSidebarHtml: function(exams) {
      var available = (exams || []).filter(function(e) { return e.status === 'available'; });
      var completed = 0;
      var inProgress = 0;
      available.forEach(function(exam) {
        var state = _getExamProgressState(exam);
        if (state === 'done') completed++;
        else if (state === 'progress') inProgress++;
      });
      var total = available.length;
      var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      var mode = AppState.currentMode === 'exam' ? 'Simulation' : 'Practice';

      return '<div class="tests-sidebar-stats">' +
        '<div class="tests-sidebar-mode">' + _mi(AppState.currentMode === 'exam' ? 'timer' : 'edit_note') + ' ' + mode + ' mode</div>' +
        '<div class="cw-sidebar-stats-row">' +
          '<div class="cw-sidebar-stat"><div class="cw-sidebar-stat-num">' + completed + '</div><div class="cw-sidebar-stat-label">Done</div></div>' +
          '<div class="cw-sidebar-stat"><div class="cw-sidebar-stat-num">' + inProgress + '</div><div class="cw-sidebar-stat-label">In Progress</div></div>' +
          '<div class="cw-sidebar-stat"><div class="cw-sidebar-stat-num">' + total + '</div><div class="cw-sidebar-stat-label">Total</div></div>' +
        '</div>' +
        '<div class="cw-sidebar-prog-track"><div class="cw-sidebar-prog-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="cw-sidebar-prog-label">' + pct + '% tests completed</div>' +
      '</div>';
    },

    _scrollTestsPathToCurrent: function() {
      requestAnimationFrame(function() {
        var current = document.querySelector('.tests-path-map .cw-path-cell--current');
        if (!current) return;
        var scrollRoot = document.getElementById('testsCenterScroll');
        if (scrollRoot && scrollRoot.scrollHeight > scrollRoot.clientHeight) {
          var rootRect = scrollRoot.getBoundingClientRect();
          var cellRect = current.getBoundingClientRect();
          var targetTop = scrollRoot.scrollTop + (cellRect.top - rootRect.top) - (rootRect.height / 2) + (cellRect.height / 2);
          scrollRoot.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
          return;
        }
        var rect = current.getBoundingClientRect();
        var targetY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      });
    }
  });
})();
