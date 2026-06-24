// js/sune-play/theory-flow.js
// Theory card flow for Sune Play units

(function() {
  'use strict';

  function esc(str) {
    if (typeof BentoGrid !== 'undefined' && BentoGrid._escapeHTML) return BentoGrid._escapeHTML(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function bold(str) {
    return esc(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  // ─── TheoryCardSection ───────────────────────────────────────────────

  function TheoryCardSection(section) {
    if (!section) return '';
    switch (section.type) {
      case 'form_table':
        return renderFormTable(section);
      case 'bullet_list':
        return renderBulletList(section);
      case 'example_list':
        return renderExampleList(section);
      case 'chips':
        return renderChips(section);
      case 'remember_box':
        return renderRememberBox(section);
      case 'explanation':
        return renderExplanation(section);
      case 'correct_incorrect_examples':
        return renderCorrectIncorrect(section);
      default:
        return '<div class="sp-theory-unknown">Unsupported section: ' + esc(section.type) + '</div>';
    }
  }

  function sectionTitle(title) {
    return title ? '<h4 class="sp-theory-section-title">' + esc(title) + '</h4>' : '';
  }

  function renderFormTable(section) {
    var rows = section.rows || [];
    var html = '<div class="sp-theory-section sp-theory-form-table" data-component="TheoryCardSection" data-type="form_table">';
    html += sectionTitle(section.title);
    html += '<div class="sp-form-table">';
    rows.forEach(function(row) {
      html += '<div class="sp-form-table-row">';
      html += '<div class="sp-form-table-label">' + bold(row.label || '') + '</div>';
      html += '<div class="sp-form-table-cols">';
      if (row.left) html += '<div class="sp-form-table-cell sp-form-table-left">' + bold(row.left) + '</div>';
      if (row.right) html += '<div class="sp-form-table-cell sp-form-table-right">' + bold(row.right) + '</div>';
      html += '</div></div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderBulletList(section) {
    var html = '<div class="sp-theory-section sp-theory-bullets" data-component="TheoryCardSection" data-type="bullet_list">';
    html += sectionTitle(section.title);
    html += '<ul class="sp-bullet-list">';
    (section.items || []).forEach(function(item) {
      html += '<li>' + bold(item) + '</li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderExampleList(section) {
    var html = '<div class="sp-theory-section sp-theory-examples" data-component="TheoryCardSection" data-type="example_list">';
    html += sectionTitle(section.title);
    html += '<div class="sp-example-list">';
    (section.items || []).forEach(function(item) {
      html += '<div class="sp-example-line">' + bold(item) + '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderChips(section) {
    var html = '<div class="sp-theory-section sp-theory-chips" data-component="TheoryCardSection" data-type="chips">';
    html += sectionTitle(section.title);
    html += '<div class="sp-chip-row">';
    (section.items || []).forEach(function(item) {
      html += '<span class="sp-chip">' + esc(item) + '</span>';
    });
    html += '</div></div>';
    return html;
  }

  function renderRememberBox(section) {
    var html = '<div class="sp-theory-section sp-theory-remember" data-component="TheoryCardSection" data-type="remember_box">';
    html += '<div class="sp-remember-box">';
    html += '<div class="sp-remember-icon"><span class="material-symbols-outlined">lightbulb</span></div>';
    html += '<div class="sp-remember-body">';
    if (section.title) html += '<h4 class="sp-remember-title">' + esc(section.title) + '</h4>';
    if (section.description) html += '<p class="sp-remember-desc">' + bold(section.description) + '</p>';
    if (section.items && section.items.length) {
      html += '<ul class="sp-remember-list">';
      section.items.forEach(function(item) { html += '<li>' + bold(item) + '</li>'; });
      html += '</ul>';
    }
    if (section.examples && section.examples.length) {
      html += '<div class="sp-remember-examples">';
      section.examples.forEach(function(ex) {
        html += '<div class="sp-example-line sp-example-line--small">' + bold(ex) + '</div>';
      });
      html += '</div>';
    }
    html += '</div></div></div>';
    return html;
  }

  function renderExplanation(section) {
    var html = '<div class="sp-theory-section sp-theory-explanation" data-component="TheoryCardSection" data-type="explanation">';
    if (section.title) html += '<h4 class="sp-theory-section-title">' + esc(section.title) + '</h4>';
    if (section.description) html += '<p class="sp-explanation-text">' + bold(section.description) + '</p>';
    html += '</div>';
    return html;
  }

  function renderCorrectIncorrect(section) {
    var html = '<div class="sp-theory-section sp-theory-compare" data-component="TheoryCardSection" data-type="correct_incorrect_examples">';
    html += sectionTitle(section.title);
    html += '<div class="sp-compare-grid">';
    (section.correctExamples || []).forEach(function(ex) {
      html += '<div class="sp-compare-item sp-compare-item--correct">' +
        '<span class="sp-badge sp-badge--correct">Correct</span>' +
        '<p>' + bold(ex) + '</p></div>';
    });
    (section.incorrectExamples || []).forEach(function(ex) {
      html += '<div class="sp-compare-item sp-compare-item--careful">' +
        '<span class="sp-badge sp-badge--careful">Not natural</span>' +
        '<p>' + bold(ex) + '</p></div>';
    });
    html += '</div></div>';
    return html;
  }

  // ─── TheoryCard ──────────────────────────────────────────────────────

  function TheoryCard(card) {
    var sectionsHtml = (card.sections || []).map(TheoryCardSection).join('');
    return '<article class="sp-theory-card" data-component="TheoryCard" data-card-id="' + esc(card.id) + '">' +
      '<header class="sp-theory-card-header">' +
        '<h3 class="sp-theory-card-title">' + esc(card.title) + '</h3>' +
        (card.subtitle ? '<p class="sp-theory-card-subtitle">' + esc(card.subtitle) + '</p>' : '') +
      '</header>' +
      '<div class="sp-theory-card-body scroll-accent-blue">' + sectionsHtml + '</div>' +
    '</article>';
  }

  // ─── TheoryDots ──────────────────────────────────────────────────────

  function TheoryDots(cardIdx, total) {
    if (total <= 1) return '';
    var dots = '';
    for (var i = 0; i < total; i++) {
      var active = i === cardIdx;
      dots += '<button type="button" class="sp-theory-dot' + (active ? ' sp-theory-dot--active' : '') + '"' +
        ' data-action="theory-goto" data-card-idx="' + i + '"' +
        ' aria-label="Tarjeta ' + (i + 1) + ' de ' + total + '"' +
        (active ? ' aria-current="true"' : '') + '></button>';
    }
    return '<div class="sp-theory-dots" data-component="TheoryDots" role="tablist">' + dots + '</div>';
  }

  // ─── TheoryNavButton ─────────────────────────────────────────────────

  function TheoryNavButton(direction, opts) {
    opts = opts || {};
    var isPrev = direction === 'prev';
    var action = isPrev ? 'theory-prev' : 'theory-next';
    var icon = isPrev ? 'arrow_back' : (opts.isLast ? 'play_arrow' : 'arrow_forward');
    var label = isPrev ? 'Anterior' : (opts.isLast ? 'Empezar práctica' : 'Siguiente');
    var disabled = isPrev && opts.isFirst;
    return '<button type="button" class="sp-theory-nav sp-theory-nav--' + direction + '"' +
      ' data-component="TheoryNavButton" data-action="' + action + '"' +
      ' aria-label="' + esc(label) + '"' +
      (disabled ? ' disabled' : '') + '>' +
      '<span class="material-symbols-outlined" aria-hidden="true">' + icon + '</span>' +
    '</button>';
  }

  // ─── TheoryFlow ──────────────────────────────────────────────────────

  function TheoryFlow(unit, opts) {
    opts = opts || {};
    var cards = (unit.theory && unit.theory.cards) || [];
    var cardIdx = opts.cardIdx != null ? opts.cardIdx : 0;
    cardIdx = Math.max(0, Math.min(cardIdx, cards.length - 1));
    var card = cards[cardIdx];
    var isLast = cardIdx >= cards.length - 1;

    if (!card) {
      return '<div class="sp-theory-empty">No theory cards available.</div>';
    }

    var isFirst = cardIdx <= 0;

    return '<div class="sp-theory-shell" data-component="TheoryShell">' +
      TheoryNavButton('prev', { isFirst: isFirst }) +
      '<div class="sp-theory-flow" data-component="TheoryFlow">' +
        '<div class="sp-theory-flow-top">' +
          TheoryDots(cardIdx, cards.length) +
        '</div>' +
        '<div class="sp-theory-flow-card-wrap">' + TheoryCard(card) + '</div>' +
      '</div>' +
      TheoryNavButton('next', { isLast: isLast }) +
    '</div>';
  }

  function getTheoryStorageKey(unitId) {
    return 'sune_play_theory_' + unitId;
  }

  function isTheoryCompleted(unitId) {
    try {
      return localStorage.getItem(getTheoryStorageKey(unitId)) === 'complete';
    } catch (e) { return false; }
  }

  function markTheoryCompleted(unitId) {
    try { localStorage.setItem(getTheoryStorageKey(unitId), 'complete'); } catch (e) { /* ignore */ }
  }

  window.SunePlayTheory = {
    TheoryFlow: TheoryFlow,
    TheoryCard: TheoryCard,
    TheoryCardSection: TheoryCardSection,
    TheoryDots: TheoryDots,
    TheoryNavButton: TheoryNavButton,
    isTheoryCompleted: isTheoryCompleted,
    markTheoryCompleted: markTheoryCompleted,
    getTheoryStorageKey: getTheoryStorageKey
  };
})();
