/**
 * Shared formatting helpers for writing AI evaluation feedback.
 */
const WritingFeedback = (function() {
  'use strict';

  function applyMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\*/g, '');
  }

  function buildScoreSquares(score, max) {
    var filled = Math.max(0, Math.min(score, max));
    var html = '<span class="writing-score-squares" aria-hidden="true">';
    for (var i = 0; i < max; i++) {
      html += '<span class="writing-score-square' + (i < filled ? ' writing-score-square--filled' : '') + '"></span>';
    }
    html += '</span>';
    return html;
  }

  function formatScoreLine(content) {
    var match = content.match(/^(.+?):\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!match) {
      return '<div class="writing-score-row"><span class="writing-score-label">' + content + '</span></div>';
    }

    var label = match[1];
    var score = parseInt(match[2], 10);
    var max = parseInt(match[3], 10);
    var visualMax = max <= 10 ? max : 10;
    var visualScore = max <= 10 ? score : Math.round((score / max) * visualMax);

    return '<div class="writing-score-row">' +
      '<span class="writing-score-label">' + label + '</span>' +
      buildScoreSquares(visualScore, visualMax) +
      '<span class="writing-score-fraction">' + score + '/' + max + '</span>' +
      '</div>';
  }

  function isImprovementsEmpty(text) {
    if (!text || !String(text).trim()) return true;
    var t = String(text).trim().toLowerCase().replace(/[.!]+$/, '');
    return /^(none|n\/a|no improvements?( needed)?|nothing( to improve)?|no areas?( for improvement)?|—|-)$/.test(t);
  }

  function improvementsDisplayContent(text) {
    if (isImprovementsEmpty(text)) {
      return 'Your writing does not need any improvements.';
    }
    return text;
  }

  function formatSectionContent(text) {
    var listCounter = 0;

    function nextListItem(bodyHtml) {
      listCounter++;
      return '<div class="writing-feedback-list-item">' +
        '<span class="writing-feedback-list-num">' + listCounter + '</span>' +
        '<span class="writing-feedback-list-text">' + bodyHtml + '</span>' +
        '</div>';
    }

    return text
      .replace(/^(Content|Communicative Achievement|Organisation|Language):/gm,
        '<div class="writing-feedback-criterion-title"><strong>$1</strong></div>')
      .replace(/^\d+\.\s+(.+)$/gm, function(_match, line) {
        if (/:\s*\d+\s*\/\s*\d+\s*$/.test(line)) {
          return formatScoreLine(line);
        }
        return nextListItem(applyMarkdown(line));
      })
      .replace(/^• (.+)/gm, function(_match, line) {
        if (/:\s*\d+\s*\/\s*\d+\s*$/.test(line)) {
          return formatScoreLine(line);
        }
        return nextListItem(applyMarkdown(line));
      })
      .replace(/^- (.+)/gm, function(_match, line) {
        return nextListItem(applyMarkdown(line));
      })
      .replace(/^\*\*(.+?)\*\*:?\s*(.*)$/gm, function(_match, title, body) {
        var content = '<strong>' + title + '</strong>';
        if (body) content += (body.startsWith(':') ? '' : ': ') + applyMarkdown(body.replace(/^:\s*/, ''));
        return nextListItem(content);
      })
      .replace(/\n/g, '<br>');
  }

  return {
    applyMarkdown: applyMarkdown,
    formatScoreLine: formatScoreLine,
    formatSectionContent: formatSectionContent,
    isImprovementsEmpty: isImprovementsEmpty,
    improvementsDisplayContent: improvementsDisplayContent
  };
})();
