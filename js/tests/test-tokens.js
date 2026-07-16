// js/tests/test-tokens.js — Centralized design tokens for the test flow redesign

(function() {
  var SECTION_KEYS = ['reading', 'listening', 'writing', 'speaking'];

  var SECTION_META = {
    reading:   { label: 'Reading', short: 'Read', icon: 'menu_book' },
    listening: { label: 'Listening', short: 'Listen', icon: 'headphones' },
    writing:   { label: 'Writing', short: 'Write', icon: 'edit' },
    speaking:  { label: 'Speaking', short: 'Speak', icon: 'mic' }
  };

  var LEVEL_META = {
    B1: {
      label: 'B1',
      subtitle: 'Preliminary (PET)',
      accent: '#3b82f6',
      accentDark: '#2563eb',
      ringTrack: '#dbeafe',
      cardBg: '#eff6ff',
      cardBorder: '#93c5fd'
    },
    B2: {
      label: 'B2',
      subtitle: 'First (FCE)',
      accent: '#8b5cf6',
      accentDark: '#7c3aed',
      ringTrack: '#ede9fe',
      cardBg: '#f5f3ff',
      cardBorder: '#c4b5fd'
    },
    C1: {
      label: 'C1',
      subtitle: 'Advanced (CAE)',
      accent: '#fb7185',
      accentDark: '#f97316',
      ringTrack: '#ffe4e6',
      cardBg: '#fff1f2',
      cardBorder: '#fda4af'
    },
    C2: {
      label: 'C2',
      subtitle: 'Proficiency (CPE)',
      accent: '#a855f7',
      accentDark: '#9333ea',
      ringTrack: '#f3e8ff',
      cardBg: '#faf5ff',
      cardBorder: '#d8b4fe'
    }
  };

  var NODE_STATE = {
    completed: {
      bg: '#16a34a',
      border: '#16a34a',
      text: '#ffffff',
      icon: 'check'
    },
    current: {
      bg: 'transparent',
      border: 'var(--test-level-accent, #3b82f6)',
      text: 'var(--test-level-accent, #3b82f6)',
      icon: 'play_arrow'
    },
    available: {
      bg: 'transparent',
      border: '#cbd5e1',
      text: '#475569',
      icon: null
    },
    locked: {
      bg: '#f1f5f9',
      border: '#e2e8f0',
      text: '#94a3b8',
      icon: 'lock'
    }
  };

  var UNIT_THEMES = [
    'Getting started',
    'Present tenses',
    'Past tenses',
    'Future forms',
    'Conditionals',
    'Modal verbs',
    'Passive voice',
    'Reported speech',
    'Word formation',
    'Exam strategies'
  ];

  function escapeHtml(str) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._escapeHTML) {
      return DashboardNav._escapeHTML(str);
    }
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getExamProgressState(exam) {
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

  function getLevelProgress(level) {
    var exams = (window.EXAMS_DATA && window.EXAMS_DATA[level]) || [];
    var available = exams.filter(function(e) { return e.status === 'available'; });
    var completed = 0;
    var inProgress = 0;
    available.forEach(function(exam) {
      var state = getExamProgressState(exam);
      if (state === 'done') completed++;
      else if (state === 'progress') inProgress++;
    });
    var total = available.length || 50;
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      completed: completed,
      inProgress: inProgress,
      total: total,
      pct: pct
    };
  }

  function getActiveLevel() {
    var order = ['B1', 'B2', 'C1', 'C2'];
    for (var i = 0; i < order.length; i++) {
      var prog = getLevelProgress(order[i]);
      if (prog.inProgress > 0 || (prog.completed > 0 && prog.completed < prog.total)) {
        return order[i];
      }
    }
    return null;
  }

  function getRecommendedTestIndex(exams) {
    var available = (exams || []).filter(function(e) { return e.status === 'available'; });
    for (var i = 0; i < available.length; i++) {
      if (getExamProgressState(available[i]) !== 'done') return i;
    }
    return available.length > 0 ? available.length - 1 : 0;
  }

  function getNodeState(exam, index, recommendedIndex, locked) {
    if (locked) return 'locked';
    var progress = getExamProgressState(exam);
    if (progress === 'done') return 'completed';
    if (index === recommendedIndex) return 'current';
    return 'available';
  }

  function getUnitNumber(testNumber) {
    return Math.ceil(testNumber / 5);
  }

  function getUnitTheme(unitNum) {
    return UNIT_THEMES[(unitNum - 1) % UNIT_THEMES.length] || 'Practice';
  }

  function getUnitProgress(exams, unitNum) {
    var start = (unitNum - 1) * 5 + 1;
    var end = unitNum * 5;
    var done = 0;
    (exams || []).forEach(function(exam) {
      if (exam.number >= start && exam.number <= end && getExamProgressState(exam) === 'done') {
        done++;
      }
    });
    return { done: done, total: 5 };
  }

  function buildProgressRing(pct, size, stroke, trackColor, accentColor, innerText) {
    size = size || 72;
    stroke = stroke || 6;
    var radius = (size - stroke) / 2;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference - (pct / 100) * circumference;
    return '<svg class="test-progress-ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle class="test-progress-ring-track" cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + radius + '" fill="none" stroke="' + trackColor + '" stroke-width="' + stroke + '"/>' +
      '<circle class="test-progress-ring-fill" cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + radius + '" fill="none" stroke="' + accentColor + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')"/>' +
      '<text class="test-progress-ring-text" x="50%" y="50%" dominant-baseline="central" text-anchor="middle">' + escapeHtml(innerText) + '</text>' +
    '</svg>';
  }

  function getLevelAverageGrade(level) {
    var exams = (window.EXAMS_DATA && window.EXAMS_DATA[level]) || [];
    if (typeof ScoreCalculator === 'undefined') return null;
    var total = 0;
    var count = 0;
    exams.forEach(function(exam) {
      if (exam.status !== 'available') return;
      try {
        var scores = ScoreCalculator.getAllSkillScores(exam.id);
        scores.forEach(function(s) {
          if (s.raw > 0) {
            total += s.scale;
            count++;
          }
        });
      } catch (e) { /* ignore */ }
    });
    if (!count) return null;
    return Math.round(total / count);
  }

  function getTestOverallGrade(examId, level) {
    if (typeof ScoreCalculator === 'undefined') return null;
    var prevLevel = AppState.currentLevel;
    if (level) AppState.currentLevel = level;
    try {
      var scores = ScoreCalculator.getAllSkillScores(examId);
      var withData = scores.filter(function(s) { return s.raw > 0; });
      if (!withData.length) return null;
      var avg = Math.round(withData.reduce(function(sum, s) { return sum + s.scale; }, 0) / withData.length);
      return avg;
    } finally {
      if (level) AppState.currentLevel = prevLevel;
    }
  }

  function isTestLocked(index) {
    var hasExamsPack = typeof AccessControl !== 'undefined'
      ? AccessControl.effectiveHasExamsPack()
      : !!AppState.hasExamsPack;
    return !hasExamsPack && index > 0;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  window.TestTokens = {
    SECTION_KEYS: SECTION_KEYS,
    SECTION_META: SECTION_META,
    LEVEL_META: LEVEL_META,
    NODE_STATE: NODE_STATE,
    UNIT_THEMES: UNIT_THEMES,
    escapeHtml: escapeHtml,
    getExamProgressState: getExamProgressState,
    getLevelProgress: getLevelProgress,
    getActiveLevel: getActiveLevel,
    getRecommendedTestIndex: getRecommendedTestIndex,
    getNodeState: getNodeState,
    getUnitNumber: getUnitNumber,
    getUnitTheme: getUnitTheme,
    getUnitProgress: getUnitProgress,
    buildProgressRing: buildProgressRing,
    getLevelAverageGrade: getLevelAverageGrade,
    getTestOverallGrade: getTestOverallGrade,
    isTestLocked: isTestLocked,
    prefersReducedMotion: prefersReducedMotion
  };
})();
