// js/sune-play/normalize-answer.js
// Answer normalization for Sune Play practice screens

(function() {
  'use strict';

  var APOSTROPHE_RE = /[\u2018\u2019\u201a\u201b`´]/g;

  function normalizeContractions(s) {
    return s
      .replace(/\bisn't\b/g, 'is not')
      .replace(/\baren't\b/g, 'are not');
  }

  function normalizeAnswer(answer) {
    if (answer == null) return '';
    var s = String(answer);
    s = s.replace(APOSTROPHE_RE, "'");
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*\.\s*$/, '');
    s = normalizeContractions(s);
    return s.toLowerCase();
  }

  function normalizeAnswerPreserveCase(answer) {
    if (answer == null) return '';
    var s = String(answer);
    s = s.replace(APOSTROPHE_RE, "'");
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*\.\s*$/, '');
    return normalizeContractions(s);
  }

  function answersMatch(given, expected, opts) {
    opts = opts || {};
    var g = opts.caseSensitive ? normalizeAnswerPreserveCase(given) : normalizeAnswer(given);
    if (!g) return false;
    var list = Array.isArray(expected) ? expected : [expected];
    return list.some(function(a) {
      var e = opts.caseSensitive ? normalizeAnswerPreserveCase(a) : normalizeAnswer(a);
      return e === g;
    });
  }

  function matchesAnyAccepted(given, item, opts) {
    opts = opts || {};
    var accepted = item.acceptedAnswers;
    if (accepted && accepted.length) {
      if (typeof accepted[0] === 'string') {
        return answersMatch(given, accepted, opts);
      }
    }
    if (item.answer != null) {
      if (typeof item.answer === 'string') return answersMatch(given, item.answer, opts);
      if (Array.isArray(item.answer) && typeof item.answer[0] === 'string') {
        return answersMatch(given, item.answer, opts);
      }
    }
    return false;
  }

  function splitBlankRow(row) {
    if (Array.isArray(row)) return row;
    if (typeof row !== 'string') return [];
    return row.split(/\s*,\s*/).map(function(part) { return part.trim(); }).filter(Boolean);
  }

  function normalizeCommaRewrite(answer) {
    if (answer == null) return '';
    var s = String(answer);
    s = s.replace(APOSTROPHE_RE, "'");
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*,\s*/g, ', ');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*\.\s*$/, '');
    s = normalizeContractions(s);
    return s.toLowerCase();
  }

  function matchesCommaRewrite(given, item) {
    var normalizedGiven = normalizeCommaRewrite(given);
    if (!normalizedGiven) return false;
    var accepted = item.acceptedAnswers;
    if (accepted && accepted.length) {
      return accepted.some(function(a) {
        return normalizeCommaRewrite(a) === normalizedGiven;
      });
    }
    if (item.reconstructedSentence) {
      return normalizeCommaRewrite(item.reconstructedSentence) === normalizedGiven;
    }
    return false;
  }

  function matchesBlanks(givens, item, opts) {
    opts = opts || {};
    var expectedRows = [];
    if (item.gaps && item.gaps.length) {
      expectedRows = [item.gaps.map(function(gap) { return gap.expectedAnswer; })];
    } else if (item.acceptedAnswers && item.acceptedAnswers.length && Array.isArray(item.acceptedAnswers[0])) {
      expectedRows = item.acceptedAnswers;
    } else if (item.acceptedAnswers && item.acceptedAnswers.length) {
      expectedRows = item.acceptedAnswers.map(splitBlankRow);
    } else if (Array.isArray(item.answer)) {
      expectedRows = [item.answer];
    } else if (typeof item.answer === 'string' && item.answer.indexOf(',') !== -1) {
      expectedRows = [splitBlankRow(item.answer)];
    }
    if (!expectedRows.length) return false;
    return expectedRows.some(function(row) {
      if (!Array.isArray(row) || row.length !== givens.length) return false;
      return row.every(function(exp, i) {
        var g = opts.caseSensitive ? normalizeAnswerPreserveCase(givens[i]) : normalizeAnswer(givens[i]);
        var variants = String(exp).split(/\s*\/\s*/);
        return variants.some(function(v) {
          var e = opts.caseSensitive ? normalizeAnswerPreserveCase(v) : normalizeAnswer(v);
          return e === g;
        });
      });
    });
  }

  window.SunePlayNormalize = {
    normalizeAnswer: normalizeAnswer,
    normalizeAnswerPreserveCase: normalizeAnswerPreserveCase,
    normalizeCommaRewrite: normalizeCommaRewrite,
    answersMatch: answersMatch,
    matchesAnyAccepted: matchesAnyAccepted,
    matchesCommaRewrite: matchesCommaRewrite,
    matchesBlanks: matchesBlanks
  };
})();
