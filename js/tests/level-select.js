// js/tests/level-select.js — Level selection with progress rings

(function() {
  function mi(name) {
    return '<span class="material-symbols-outlined" aria-hidden="true">' + name + '</span>';
  }

  function buildHtml() {
    var T = window.TestTokens;
    if (!T) return '';

    var LEVEL_ORDER = ['B1', 'B2', 'C1', 'C2'];
    var availableLevels = LEVEL_ORDER.filter(function(lvl) {
      return ((window.EXAMS_DATA[lvl] || []).some(function(e) { return e.status === 'available'; }));
    });
    var activeLevel = T.getActiveLevel();

    var html = '<div class="test-level-select" role="list">';

    availableLevels.forEach(function(lvl) {
      var meta = T.LEVEL_META[lvl] || T.LEVEL_META.B2;
      var prog = T.getLevelProgress(lvl);
      var isActive = activeLevel === lvl;
      var hasProgress = prog.completed > 0 || prog.inProgress > 0;

      var cardClass = 'test-level-card';
      if (isActive) cardClass += ' test-level-card--active';
      if (hasProgress) cardClass += ' test-level-card--has-progress';

      var ringInner = prog.completed + '/' + prog.total;
      var ring = T.buildProgressRing(prog.pct, 80, 7, meta.ringTrack, meta.accent, ringInner);

      html += '<button type="button" class="' + cardClass + '" data-level="' + lvl + '"' +
        ' onclick="DashboardNav.openTests(\'' + lvl + '\')"' +
        ' style="--test-level-accent:' + meta.accent + ';--test-level-card-bg:' + meta.cardBg + ';--test-level-card-border:' + meta.cardBorder + '"' +
        ' aria-label="' + T.escapeHtml(meta.label + ', ' + prog.completed + ' of ' + prog.total + ' tests completed') + '">';

      html += '<div class="test-level-card-ring">' + ring + '</div>';

      html += '<div class="test-level-card-body">';
      html += '<div class="test-level-card-title">' + T.escapeHtml(meta.label) + '</div>';
      html += '<div class="test-level-card-subtitle">' + T.escapeHtml(meta.subtitle) + '</div>';

      if (isActive && hasProgress) {
        html += '<span class="test-level-card-badge">' + mi('arrow_forward') + ' Continue here</span>';
      } else if (hasProgress) {
        html += '<span class="test-level-card-status">' + prog.completed + ' / ' + prog.total + ' completed</span>';
      } else {
        html += '<span class="test-level-card-status">' + prog.total + ' tests available</span>';
      }

      html += '</div>';
      html += '</button>';
    });

    html += '</div>';
    return html;
  }

  window.LevelSelect = {
    buildHtml: buildHtml
  };
})();
