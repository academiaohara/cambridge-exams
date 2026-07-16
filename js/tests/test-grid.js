// js/tests/test-grid.js — Unit-grouped test grid with quick navigation

(function() {
  var _scrollSpyBound = false;
  var _highlightTimer = null;

  function mi(name) {
    return '<span class="material-symbols-outlined" aria-hidden="true">' + name + '</span>';
  }

  function buildNodeHtml(exam, index, recommendedIndex, levelId) {
    var T = window.TestTokens;
    var locked = T.isTestLocked(index);
    var state = T.getNodeState(exam, index, recommendedIndex, locked);
    var nodeTokens = T.NODE_STATE[state];
    var testNum = String(exam.number).padStart(3, '0');
    var grade = state === 'completed' ? T.getTestOverallGrade(exam.id, levelId) : null;

    var ariaParts = ['Test ' + exam.number];
    if (state === 'completed') ariaParts.push('completed');
    else if (state === 'current') ariaParts.push('recommended');
    else if (state === 'locked') ariaParts.push('locked');
    else ariaParts.push('available');
    if (grade) ariaParts.push('grade ' + grade);

    var cellClass = 'test-grid-node test-grid-node--' + state;
    if (state === 'current' && !T.prefersReducedMotion()) cellClass += ' test-grid-node--pulse';

    var onclick = locked
      ? 'Dashboard.showExamsUpgradeGate()'
      : 'SectionSheet.open(\'' + exam.id + '\', \'' + levelId + '\')';

    var html = '<button type="button" class="' + cellClass + '"' +
      ' id="test-node-' + exam.number + '"' +
      ' data-test-num="' + exam.number + '"' +
      ' data-unit="' + T.getUnitNumber(exam.number) + '"' +
      ' onclick="' + onclick + '"' +
      ' aria-label="' + T.escapeHtml(ariaParts.join(', ')) + '">';

    if (state === 'completed') {
      html += '<span class="test-grid-node-icon">' + mi('check') + '</span>';
      if (grade) html += '<span class="test-grid-node-grade">' + grade + '</span>';
    } else if (state === 'current') {
      html += '<span class="test-grid-node-icon">' + mi('play_arrow') + '</span>';
      html += '<span class="test-grid-node-num">' + testNum + '</span>';
    } else if (state === 'locked') {
      html += '<span class="test-grid-node-icon">' + mi('lock') + '</span>';
      html += '<span class="test-grid-node-num">' + testNum + '</span>';
    } else {
      html += '<span class="test-grid-node-num">' + testNum + '</span>';
    }

    html += '</button>';
    return html;
  }

  function buildHeaderHtml(levelId, exams) {
    var T = window.TestTokens;
    var meta = T.LEVEL_META[levelId] || T.LEVEL_META.B2;
    var prog = T.getLevelProgress(levelId);
    var pct = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
    var streak = (typeof StreakManager !== 'undefined' && StreakManager.getStreak)
      ? (StreakManager.getStreak().currentStreak || 0) : 0;
    var atRisk = typeof StreakManager !== 'undefined' && StreakManager.isAtRisk && StreakManager.isAtRisk();
    var avgGrade = T.getLevelAverageGrade(levelId);

    var streakClass = 'test-grid-stat test-grid-stat--streak';
    if (atRisk && !T.prefersReducedMotion()) streakClass += ' test-grid-stat--at-risk';

    var html = '<div class="test-grid-header" style="--test-level-accent:' + meta.accent + '">';
    html += '<div class="test-grid-header-top">';
    html += '<button type="button" class="test-grid-back" onclick="DashboardNav.openTests()" aria-label="Back to levels">' + mi('arrow_back') + '</button>';
    html += '<div class="test-grid-header-title">';
    html += '<h1 class="test-grid-level-name">' + T.escapeHtml(meta.label) + '</h1>';
    html += '<p class="test-grid-level-sub">' + T.escapeHtml(meta.subtitle) + '</p>';
    html += '</div>';
    html += '<div class="test-grid-header-stats">';
    html += '<div class="' + streakClass + '" title="Day streak">' + mi('local_fire_department') + '<span>' + streak + '</span></div>';
    if (avgGrade) {
      html += '<div class="test-grid-stat test-grid-stat--grade" title="Average grade">' + mi('grade') + '<span>' + avgGrade + '</span></div>';
    }
    html += '</div>';
    html += '</div>';
    html += '<div class="test-grid-progress-bar" role="progressbar" aria-valuenow="' + prog.completed + '" aria-valuemin="0" aria-valuemax="' + prog.total + '" aria-label="' + prog.completed + ' of ' + prog.total + ' tests completed">';
    html += '<div class="test-grid-progress-fill" style="width:' + pct + '%"></div>';
    html += '<span class="test-grid-progress-label">' + prog.completed + '/' + prog.total + ' tests</span>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function buildNavBarHtml(unitCount) {
    var html = '<div class="test-grid-nav" id="testGridNav">';
    html += '<div class="test-grid-unit-chips" id="testGridUnitChips" role="tablist" aria-label="Units">';
    for (var u = 1; u <= unitCount; u++) {
      html += '<button type="button" class="test-grid-unit-chip' + (u === 1 ? ' is-active' : '') + '"' +
        ' data-unit="' + u + '" role="tab" aria-selected="' + (u === 1 ? 'true' : 'false') + '"' +
        ' onclick="TestGrid.scrollToUnit(' + u + ')">U' + u + '</button>';
    }
    html += '</div>';
    html += '<form class="test-grid-jump" onsubmit="TestGrid.jumpToTest(event)" aria-label="Jump to test">';
    html += '<label class="visually-hidden" for="testGridJumpInput">Go to test number</label>';
    html += '<input type="number" id="testGridJumpInput" class="test-grid-jump-input" min="1" max="50" placeholder="Test #" inputmode="numeric">';
    html += '<button type="submit" class="test-grid-jump-btn">Go</button>';
    html += '</form>';
    html += '</div>';
    return html;
  }

  function buildUnitsHtml(exams, levelId, recommendedIndex) {
    var T = window.TestTokens;
    var available = exams.filter(function(e) { return e.status === 'available'; });
    var unitCount = Math.ceil(available.length / 5) || 10;
    var html = '<div class="test-grid-units" id="testGridUnits">';

    for (var u = 1; u <= unitCount; u++) {
      var start = (u - 1) * 5;
      var unitExams = available.slice(start, start + 5);
      if (!unitExams.length) continue;

      var unitProg = T.getUnitProgress(available, u);
      var isUnitComplete = unitProg.done === unitProg.total;
      var theme = T.getUnitTheme(u);

      var cardClass = 'test-grid-unit-card';
      if (isUnitComplete) cardClass += ' test-grid-unit-card--complete';

      html += '<section class="' + cardClass + '" id="test-unit-' + u + '" data-unit="' + u + '" aria-label="Unit ' + u + '">';
      html += '<header class="test-grid-unit-header">';
      html += '<div class="test-grid-unit-title">';
      html += '<span class="test-grid-unit-num">Unit ' + u + '</span>';
      html += '<span class="test-grid-unit-theme">· ' + T.escapeHtml(theme) + '</span>';
      html += '</div>';
      html += '<div class="test-grid-unit-meta">';
      if (isUnitComplete) html += '<span class="test-grid-unit-badge">' + mi('verified') + '</span>';
      html += '<span class="test-grid-unit-progress">' + unitProg.done + '/' + unitProg.total + '</span>';
      html += '</div>';
      html += '</header>';
      html += '<div class="test-grid-unit-nodes" role="list">';

      unitExams.forEach(function(exam) {
        var globalIdx = available.indexOf(exam);
        html += buildNodeHtml(exam, globalIdx, recommendedIndex, levelId);
      });

      html += '</div></section>';
    }

    html += '</div>';
    return html;
  }

  function buildRandomCardHtml(levelId) {
    if (typeof DashboardNav === 'undefined' || !DashboardNav._buildRandomTestPathCardHtml) return '';
    return '<div class="test-grid-random-wrap">' + DashboardNav._buildRandomTestPathCardHtml(levelId) + '</div>';
  }

  function buildHtml(exams, levelId) {
    var T = window.TestTokens;
    var meta = T.LEVEL_META[levelId] || T.LEVEL_META.B2;
    var available = (exams || []).filter(function(e) { return e.status === 'available'; });
    var recommendedIndex = T.getRecommendedTestIndex(available);
    var unitCount = Math.ceil(available.length / 5) || 10;

    var html = '<div class="test-grid" data-level="' + levelId + '" style="--test-level-accent:' + meta.accent + '">';
    html += buildHeaderHtml(levelId, exams);
    html += buildNavBarHtml(unitCount);
    html += buildRandomCardHtml(levelId);
    html += buildUnitsHtml(exams, levelId, recommendedIndex);
    html += '</div>';
    return html;
  }

  function getScrollRoot() {
    return document.getElementById('testsCenterScroll') || document.querySelector('.cw-page-content') || window;
  }

  function scrollToElement(el) {
    if (!el) return;
    var scrollRoot = getScrollRoot();
    if (scrollRoot === window) {
      var rect = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - 120, behavior: TestTokens.prefersReducedMotion() ? 'auto' : 'smooth' });
    } else {
      var rootRect = scrollRoot.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      var target = scrollRoot.scrollTop + (elRect.top - rootRect.top) - 100;
      scrollRoot.scrollTo({ top: Math.max(0, target), behavior: TestTokens.prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function highlightElement(el) {
    if (!el) return;
    el.classList.add('test-grid-highlight');
    if (_highlightTimer) clearTimeout(_highlightTimer);
    _highlightTimer = setTimeout(function() {
      el.classList.remove('test-grid-highlight');
    }, 1200);
  }

  function setActiveUnitChip(unitNum) {
    document.querySelectorAll('.test-grid-unit-chip').forEach(function(chip) {
      var active = parseInt(chip.getAttribute('data-unit'), 10) === unitNum;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function scrollToUnit(unitNum) {
    var el = document.getElementById('test-unit-' + unitNum);
    scrollToElement(el);
    highlightElement(el);
    setActiveUnitChip(unitNum);
  }

  function scrollToTest(testNum) {
    var el = document.getElementById('test-node-' + testNum);
    if (!el) return;
    var unitNum = parseInt(el.getAttribute('data-unit'), 10);
    scrollToElement(el);
    highlightElement(el);
    if (unitNum) setActiveUnitChip(unitNum);
  }

  function jumpToTest(e) {
    if (e && e.preventDefault) e.preventDefault();
    var input = document.getElementById('testGridJumpInput');
    if (!input) return false;
    var num = parseInt(input.value, 10);
    if (!num || num < 1) return false;
    scrollToTest(num);
    return false;
  }

  function initScrollSpy() {
    var units = document.querySelectorAll('.test-grid-unit-card');
    if (!units.length) return;

    var scrollRoot = getScrollRoot();
    var onScroll = function() {
      var rootTop = scrollRoot === window ? 0 : scrollRoot.getBoundingClientRect().top;
      var activeUnit = 1;
      units.forEach(function(unit) {
        var rect = unit.getBoundingClientRect();
        if (rect.top - rootTop <= 140) {
          activeUnit = parseInt(unit.getAttribute('data-unit'), 10) || activeUnit;
        }
      });
      setActiveUnitChip(activeUnit);
    };

    if (scrollRoot === window) {
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      scrollRoot.addEventListener('scroll', onScroll, { passive: true });
    }
    onScroll();
  }

  function init() {
    initScrollSpy();
    var recommended = document.querySelector('.test-grid-node--current');
    if (recommended) {
      requestAnimationFrame(function() {
        scrollToTest(parseInt(recommended.getAttribute('data-test-num'), 10));
      });
    }
  }

  window.TestGrid = {
    buildHtml: buildHtml,
    init: init,
    scrollToUnit: scrollToUnit,
    scrollToTest: scrollToTest,
    jumpToTest: jumpToTest
  };
})();
