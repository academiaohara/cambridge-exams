// js/tests/section-sheet.js — Section picker as bottom sheet (mobile) / modal (desktop)

(function() {
  var _overlay = null;
  var _previousFocus = null;
  var _escHandler = null;
  var _currentExamId = null;
  var _currentLevelId = null;
  var _expanded = false;

  function mi(name) {
    return '<span class="material-symbols-outlined" aria-hidden="true">' + name + '</span>';
  }

  function getSectionLockInfo(sectionKey) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._getTestsSectionLockInfo) {
      return DashboardNav._getTestsSectionLockInfo(sectionKey);
    }
    return { locked: false, click: '', label: '', badge: '' };
  }

  function getFirstIncompletePart(exam, sectionKey) {
    var section = exam.sections && exam.sections[sectionKey];
    if (!section) return 1;
    for (var i = 1; i <= section.total; i++) {
      if (!section.completed || section.completed.indexOf(i) === -1) return i;
    }
    return 1;
  }

  function getFirstIncompleteSection(exam) {
    var T = window.TestTokens;
    if (!T) return { section: 'reading', part: 1 };
    for (var i = 0; i < T.SECTION_KEYS.length; i++) {
      var key = T.SECTION_KEYS[i];
      var section = exam.sections && exam.sections[key];
      if (!section) continue;
      if ((section.completed || []).length < (section.total || 0)) {
        return { section: key, part: getFirstIncompletePart(exam, key) };
      }
    }
    return { section: 'reading', part: 1 };
  }

  function hasAnyProgress(exam) {
    var T = window.TestTokens;
    if (!T) return false;
    for (var i = 0; i < T.SECTION_KEYS.length; i++) {
      var sec = exam.sections && exam.sections[T.SECTION_KEYS[i]];
      if (!sec) continue;
      if ((sec.completed || []).length > 0 || (sec.inProgress || []).length > 0) return true;
    }
    return false;
  }

  function isSectionComplete(section) {
    if (!section) return false;
    return (section.completed || []).length >= (section.total || 0);
  }

  function buildSectionChipHtml(exam, sectionKey, levelId, expanded) {
    var T = window.TestTokens;
    var meta = T.SECTION_META[sectionKey] || { label: sectionKey, icon: 'circle' };
    var section = exam.sections && exam.sections[sectionKey];
    if (!section) return '';

    var lockInfo = getSectionLockInfo(sectionKey);
    var isLocked = lockInfo.locked;
    var complete = isSectionComplete(section);
    var display = typeof ScoreCalculator !== 'undefined'
      ? ScoreCalculator.getSectionScaleDisplay(exam.id, sectionKey, section)
      : { type: 'progress', value: (section.completed || []).length + '/' + section.total };

    var chipClass = 'section-sheet-chip section-sheet-chip--' + sectionKey;
    if (complete) chipClass += ' section-sheet-chip--done';
    else if (isLocked) chipClass += ' section-sheet-chip--locked';

    var statusHtml = '';
    if (complete && display.type === 'scale') {
      statusHtml = '<span class="section-sheet-chip-status">' + display.value + '</span>';
    } else if (complete) {
      statusHtml = '<span class="section-sheet-chip-check">' + mi('check') + '</span>';
    } else {
      statusHtml = '<span class="section-sheet-chip-status section-sheet-chip-status--pending">' +
        (section.completed || []).length + '/' + section.total + '</span>';
    }

    var onclick = isLocked
      ? lockInfo.click
      : 'SectionSheet.openSection(\'' + exam.id + '\', \'' + sectionKey + '\', \'' + levelId + '\')';

    var html = '<button type="button" class="' + chipClass + '"' +
      (isLocked ? '' : '') +
      ' onclick="' + onclick + '"' +
      ' aria-label="' + T.escapeHtml(meta.label + (complete ? ', completed' : ', pending')) + '">';
    html += '<span class="section-sheet-chip-icon">' + mi(meta.icon) + '</span>';
    html += '<span class="section-sheet-chip-label">' + T.escapeHtml(meta.short || meta.label) + '</span>';
    html += statusHtml;
    html += '</button>';

    if (expanded && !isLocked) {
      html += '<div class="section-sheet-parts section-sheet-parts--' + sectionKey + '">';
      for (var p = 1; p <= section.total; p++) {
        var partDone = section.completed && section.completed.indexOf(p) !== -1;
        var partClass = 'section-sheet-part-chip' + (partDone ? ' section-sheet-part-chip--done' : '');
        html += '<button type="button" class="' + partClass + '" onclick="Exercise.openPart(\'' + exam.id + '\', \'' + sectionKey + '\', ' + p + ')">' + p + '</button>';
      }
      html += '</div>';
    }

    return html;
  }

  function buildContent(exam, levelId, expanded) {
    var T = window.TestTokens;
    var testNum = String(exam.number).padStart(3, '0');
    var overallGrade = T.getTestOverallGrade(exam.id, levelId);
    var progress = T.getExamProgressState(exam);
    var isComplete = progress === 'done';
    var hasProgress = hasAnyProgress(exam);
    var next = getFirstIncompleteSection(exam);
    var isExamMode = AppState.currentMode === 'exam';

    var html = '<div class="section-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sectionSheetTitle">';
    html += '<div class="section-sheet-handle" aria-hidden="true"></div>';
    html += '<button type="button" class="section-sheet-close" onclick="SectionSheet.close()" aria-label="Close">' + mi('close') + '</button>';

    html += '<header class="section-sheet-header">';
    html += '<h2 id="sectionSheetTitle" class="section-sheet-title">Test ' + testNum + '</h2>';
    if (isComplete && overallGrade) {
      html += '<span class="section-sheet-overall-grade">' + overallGrade + '</span>';
    }
    html += '</header>';

    if (isExamMode && typeof DashboardNav !== 'undefined' && DashboardNav._buildTestsFullExamBarHtml) {
      html += DashboardNav._buildTestsFullExamBarHtml(exam.id);
    }

    html += '<div class="section-sheet-chips' + (expanded ? ' section-sheet-chips--expanded' : '') + '">';
    T.SECTION_KEYS.forEach(function(key) {
      html += buildSectionChipHtml(exam, key, levelId, expanded);
    });
    html += '</div>';

    var continueLabel = hasProgress ? 'Continue' : 'Start';
    var continueAction = isExamMode
      ? 'Exercise.startFullSection(\'' + exam.id + '\', \'' + next.section + '\')'
      : 'Exercise.openPart(\'' + exam.id + '\', \'' + next.section + '\', ' + next.part + ')';

    html += '<div class="section-sheet-actions">';
    html += '<button type="button" class="section-sheet-continue" onclick="' + continueAction + '; SectionSheet.close()">' + continueLabel + '</button>';
    if (!expanded) {
      html += '<button type="button" class="section-sheet-expand" onclick="SectionSheet.toggleExpanded()">View all sections</button>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  function trapFocus(panel) {
    var focusable = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    panel.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  function open(examId, levelId, options) {
    options = options || {};
    _expanded = !!options.expanded;
    _currentExamId = examId;
    _currentLevelId = levelId;

    var exams = (window.EXAMS_DATA && window.EXAMS_DATA[levelId]) || [];
    var exam = exams.find(function(e) { return e.id === examId; });
    if (!exam) return;

    close();

    _previousFocus = document.activeElement;

    var T = window.TestTokens;
    var meta = T.LEVEL_META[levelId] || T.LEVEL_META.B2;
    var isDesktop = window.matchMedia('(min-width: 769px)').matches;

    _overlay = document.createElement('div');
    _overlay.id = 'sectionSheetOverlay';
    _overlay.className = 'section-sheet-overlay' + (isDesktop ? ' section-sheet-overlay--desktop' : ' section-sheet-overlay--mobile');
    _overlay.style.setProperty('--test-level-accent', meta.accent);
    _overlay.innerHTML = buildContent(exam, levelId, _expanded);

    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) close();
    });

    document.body.appendChild(_overlay);
    document.body.classList.add('section-sheet-open');

    var panel = _overlay.querySelector('.section-sheet-panel');
    if (panel) {
      trapFocus(panel);
      var continueBtn = panel.querySelector('.section-sheet-continue');
      if (continueBtn) continueBtn.focus();
    }

    _escHandler = function(e) {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', _escHandler);

    if (!options.skipHistory) {
      var state = { view: 'testsHub', mode: AppState.currentMode || 'practice', level: levelId, examId: examId };
      history.replaceState(state, '', Router.stateToPath(state));
    }

    if (typeof TestGrid !== 'undefined' && TestGrid.scrollToTest && exam.number) {
      TestGrid.scrollToTest(exam.number);
    }
  }

  function close() {
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler);
      _escHandler = null;
    }
    if (_overlay) {
      _overlay.remove();
      _overlay = null;
    }
    document.body.classList.remove('section-sheet-open');
    if (_previousFocus && _previousFocus.focus) {
      try { _previousFocus.focus(); } catch (e) { /* ignore */ }
    }
    _previousFocus = null;

    if (_currentLevelId && typeof Router !== 'undefined') {
      var state = { view: 'testsHub', mode: AppState.currentMode || 'practice', level: _currentLevelId };
      history.replaceState(state, '', Router.stateToPath(state));
    }
    _currentExamId = null;
  }

  function toggleExpanded() {
    if (!_currentExamId || !_currentLevelId) return;
    open(_currentExamId, _currentLevelId, { expanded: true, skipHistory: true });
  }

  function openSection(examId, sectionKey, levelId) {
    close();
    var exams = (window.EXAMS_DATA && window.EXAMS_DATA[levelId]) || [];
    var exam = exams.find(function(e) { return e.id === examId; });
    if (!exam) return;
    var part = getFirstIncompletePart(exam, sectionKey);
    if (AppState.currentMode === 'exam') {
      Exercise.startFullSection(examId, sectionKey);
    } else {
      Exercise.openPart(examId, sectionKey, part);
    }
  }

  function refresh() {
    if (_currentExamId && _currentLevelId && _overlay) {
      open(_currentExamId, _currentLevelId, { expanded: _expanded, skipHistory: true });
    }
  }

  window.SectionSheet = {
    open: open,
    close: close,
    toggleExpanded: toggleExpanded,
    openSection: openSection,
    refresh: refresh
  };
})();
