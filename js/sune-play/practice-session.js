// js/sune-play/practice-session.js
// Practice node list and session UI for Sune Play

(function() {
  'use strict';

  function esc(str) {
    if (typeof DashboardNav !== 'undefined' && DashboardNav._escapeHTML) return DashboardNav._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── HeartsBar ───────────────────────────────────────────────────────

  function HeartsBar(current, max) {
    var html = '<div class="sp-hearts-bar" data-component="HeartsBar">';
    for (var i = 0; i < max; i++) {
      var filled = i < current;
      html += '<span class="sp-heart' + (filled ? '' : ' sp-heart--empty') + '">' +
        '<span class="material-symbols-outlined">favorite</span></span>';
    }
    html += '</div>';
    return html;
  }

  // ─── SessionProgressBar ──────────────────────────────────────────────

  function SessionProgressBar(completed, total) {
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return '<div class="sp-session-progress" data-component="SessionProgressBar">' +
      '<div class="sp-session-progress-track">' +
        '<div class="sp-session-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
    '</div>';
  }

  // ─── PracticeHeader ──────────────────────────────────────────────────

  function PracticeHeader(opts) {
    opts = opts || {};
    return '<header class="sp-practice-header" data-component="PracticeHeader">' +
      '<button type="button" class="sp-header-btn sp-header-exit" data-action="exit-session" aria-label="Exit">' +
        '<span class="material-symbols-outlined">close</span>' +
      '</button>' +
      SessionProgressBar(opts.completed || 0, opts.total || 1) +
      HeartsBar(opts.lives || 0, opts.maxLives || 5) +
      (opts.showReviewTheory ? '<button type="button" class="sp-header-btn sp-header-theory" data-action="review-theory" title="Review theory">' +
        '<span class="material-symbols-outlined">menu_book</span></button>' : '') +
    '</header>';
  }

  // ─── PracticeNodeCard ────────────────────────────────────────────────

  function PracticeNodeCard(node, idx, opts) {
    opts = opts || {};
    var locked = !!opts.locked;
    var completed = !!opts.completed;
    var cls = 'sp-node-card' + (locked ? ' sp-node-card--locked' : '') + (completed ? ' sp-node-card--done' : '');
    return '<button type="button" class="' + cls + '" data-component="PracticeNodeCard" data-node-id="' + esc(node.nodeId) + '"' +
      (locked ? ' disabled' : '') + '>' +
      '<span class="sp-node-num">' + (idx + 1) + '</span>' +
      '<div class="sp-node-body">' +
        '<h3 class="sp-node-title">' + esc(node.title) + '</h3>' +
        '<p class="sp-node-focus">' + esc((node.focus || []).slice(0, 2).join(' · ')) + '</p>' +
      '</div>' +
      (completed ? '<span class="sp-node-check material-symbols-outlined">check_circle</span>' :
        locked ? '<span class="sp-node-lock material-symbols-outlined">lock</span>' :
        '<span class="sp-node-arrow material-symbols-outlined">chevron_right</span>') +
    '</button>';
  }

  // ─── PracticeNodeList ────────────────────────────────────────────────

  function PracticeNodeList(unit, opts) {
    opts = opts || {};
    var nodes = unit.practiceNodes || [];
    var completedNodes = opts.completedNodes || {};

    var html = '<div class="sp-node-list" data-component="PracticeNodeList">';
    html += '<div class="sp-node-list-header">';
    html += '<h2 class="sp-node-list-title">Sune Play</h2>';
    html += '<p class="sp-node-list-subtitle">' + esc(unit.unitSubtitle || '') + '</p>';
    html += '</div><div class="sp-node-list-cards">';
    nodes.forEach(function(node, i) {
      html += PracticeNodeCard(node, i, { locked: false, completed: !!completedNodes[node.nodeId] });
    });
    html += '</div>';
    if (opts.showReviewTheory) {
      html += '<button type="button" class="sp-btn sp-btn--ghost sp-review-theory-btn" data-action="review-theory" aria-label="Review theory">' +
        '<span class="material-symbols-outlined">menu_book</span></button>';
    }
    html += '</div>';
    return html;
  }

  // ─── PracticeSession shell ───────────────────────────────────────────

  function PracticeSession(node, opts) {
    opts = opts || {};
    return '<div class="sp-practice-session" data-component="PracticeSession" data-node-id="' + esc(node.nodeId) + '">' +
      PracticeHeader(opts) +
      '<div class="sp-practice-main">' +
        '<div class="sp-practice-body">' +
          '<div class="sp-exercise-card" id="sp-screen-mount"></div>' +
          '<div id="sp-exercise-tip-mount" class="sp-exercise-tip-mount" hidden></div>' +
        '</div>' +
        '<footer class="sp-practice-footer" id="sp-practice-footer">' +
          '<div class="sp-practice-footer-inner">' +
            '<div id="sp-feedback-mount" class="sp-feedback-mount"></div>' +
            '<div class="sp-practice-footer-actions">' +
              '<button type="button" class="sp-btn sp-btn--skip" id="sp-skip-btn" aria-label="Skip">Skip</button>' +
              '<div class="sp-footer-actions-right">' +
                '<button type="button" class="sp-btn sp-btn--explain-icon" id="sp-explain-btn" hidden aria-label="View explanation">' +
                  '<span class="material-symbols-outlined">help</span>' +
                '</button>' +
                '<button type="button" class="sp-btn sp-btn--primary sp-btn--action" id="sp-action-btn" data-mode="check" aria-label="Check">' +
                  '<span class="material-symbols-outlined">check</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</footer>' +
      '</div>' +
    '</div>';
  }

  // ─── PracticeCompleteScreen ──────────────────────────────────────────

  function PracticeCompleteScreen(node, stats) {
    stats = stats || {};
    var passed = stats.passed !== false;
    return '<div class="sp-result-screen sp-result-screen--complete" data-component="PracticeCompleteScreen">' +
      '<div class="sp-result-celebration" aria-hidden="true">' +
        '<span class="sp-result-confetti sp-result-confetti--1"></span>' +
        '<span class="sp-result-confetti sp-result-confetti--2"></span>' +
        '<span class="sp-result-confetti sp-result-confetti--3"></span>' +
        '<span class="sp-result-confetti sp-result-confetti--4"></span>' +
      '</div>' +
      '<div class="sp-result-icon sp-result-icon--success"><span class="material-symbols-outlined">celebration</span></div>' +
      '<h2 class="sp-result-title">' + (passed ? 'Node complete!' : 'Session finished') + '</h2>' +
      '<p class="sp-result-subtitle">' + esc(node.title) + '</p>' +
      '<div class="sp-result-stats">' +
        '<div class="sp-stat sp-stat--correct">' +
          '<span class="sp-stat-icon material-symbols-outlined" aria-hidden="true">check_circle</span>' +
          '<span class="sp-stat-val">' + (stats.correct || 0) + '</span>' +
          '<span class="sp-stat-lbl">Correct</span>' +
        '</div>' +
        '<div class="sp-stat sp-stat--lives">' +
          '<span class="sp-stat-icon material-symbols-outlined" aria-hidden="true">favorite</span>' +
          '<span class="sp-stat-val">' + (stats.livesLeft || 0) + '</span>' +
          '<span class="sp-stat-lbl">Lives left</span>' +
        '</div>' +
        '<div class="sp-stat sp-stat--xp">' +
          '<span class="sp-stat-icon material-symbols-outlined" aria-hidden="true">bolt</span>' +
          '<span class="sp-stat-val">' + (stats.xp || 0) + '</span>' +
          '<span class="sp-stat-lbl">XP</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="sp-btn sp-btn--primary sp-btn--labeled" data-action="back-to-stage" aria-label="Back to stage">' +
        '<span class="sp-btn-label">Back to stage</span>' +
        '<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>' +
      '</button>' +
    '</div>';
  }

  function ResultActionButtons() {
    return '<div class="sp-result-actions">' +
      '<button type="button" class="sp-btn sp-btn--primary sp-btn--labeled" data-action="retry-node" aria-label="Try again">' +
        '<span class="material-symbols-outlined" aria-hidden="true">refresh</span>' +
        '<span class="sp-btn-label">Try again</span>' +
      '</button>' +
      '<button type="button" class="sp-btn sp-btn--ghost sp-btn--labeled" data-action="back-to-nodes" aria-label="Go back">' +
        '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>' +
        '<span class="sp-btn-label">Go back</span>' +
      '</button>' +
    '</div>';
  }

  // ─── PracticeFailedScreen ────────────────────────────────────────────

  function PracticeFailedScreen(node) {
    return '<div class="sp-result-screen sp-result-screen--failed" data-component="PracticeFailedScreen">' +
      '<div class="sp-result-icon sp-result-icon--failed"><span class="material-symbols-outlined">heart_broken</span></div>' +
      '<h2 class="sp-result-title">Out of lives</h2>' +
      '<p class="sp-result-subtitle">You ran out of hearts in <strong>' + esc(node.shortTitle || node.title) + '</strong>.</p>' +
      ResultActionButtons() +
    '</div>';
  }

  function RetryScreen(node, stats) {
    return '<div class="sp-result-screen sp-result-screen--retry" data-component="PracticeRetryScreen">' +
      '<div class="sp-result-icon"><span class="material-symbols-outlined">replay</span></div>' +
      '<h2 class="sp-result-title">Keep practising</h2>' +
      '<p class="sp-result-subtitle">You need ' + (stats.required || 0) + ' correct screens. You got ' + (stats.correct || 0) + '.</p>' +
      ResultActionButtons() +
    '</div>';
  }

  window.SunePlayPracticeUI = {
    HeartsBar: HeartsBar,
    SessionProgressBar: SessionProgressBar,
    PracticeHeader: PracticeHeader,
    PracticeNodeCard: PracticeNodeCard,
    PracticeNodeList: PracticeNodeList,
    PracticeSession: PracticeSession,
    PracticeCompleteScreen: PracticeCompleteScreen,
    PracticeFailedScreen: PracticeFailedScreen,
    RetryScreen: RetryScreen
  };
})();
