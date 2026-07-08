// js/sune-play/normalize-column-match.js
// Answer normalization for column_matching exercises

(function() {
  'use strict';

  var LETTER_DASH_ANSWER_RE = /^([A-H])\s*[–\-—]\s*(.+)$/i;
  var LETTER_ONLY_ANSWER_RE = /^[A-H]$/i;
  var SENTENCE_LETTER_RE = /^(.*?)\s*\*\*([A-Z])\*\*\s*(.*)?$/;

  function stripTrailingPeriod(text) {
    return String(text || '').replace(/\s*\.\s*$/, '').trim();
  }

  function normalizeEndingText(text) {
    return stripTrailingPeriod(text).toLowerCase();
  }

  /**
   * Parse a legacy matching sentence into left text, letter marker, and ending.
   */
  function parseMatchSentence(sentence, fallbackIndex) {
    var raw = String(sentence || '').trim();
    var match = raw.match(SENTENCE_LETTER_RE);
    if (match) {
      return {
        leftText: match[1].trim(),
        markerLetter: match[2].toUpperCase(),
        endingText: (match[3] || '').trim(),
        hasEmbeddedLetter: true
      };
    }
    var idx = typeof fallbackIndex === 'number' ? fallbackIndex : 0;
    return {
      leftText: raw,
      markerLetter: String.fromCharCode(65 + idx),
      endingText: '',
      hasEmbeddedLetter: false
    };
  }

  /**
   * Normalize legacy answer formats to a canonical correct letter (+ ending text).
   *
   * RULE — column_match_answer_normalization
   * Priority:
   * 1. **LETTER** embedded in sentence (markerLetter) — authoritative in grammar
   *    split format (e.g. B2 Unit1 ex.G).
   * 2. Answer field patterns:
   *    a) "B – ending text" / "B - ending" (letter + dash + ending)
   *    b) "F" (letter only)
   *    c) "herself" (plain word): resolve letter by matching ending text against
   *       the built right-column options map; if no match, fall back to markerLetter.
   * 3. If answer is empty but sentence has **LETTER**, use markerLetter.
   */
  function normalizeColumnMatchAnswer(rawAnswer, parsed, endingLetterMap) {
    parsed = parsed || {};
    endingLetterMap = endingLetterMap || {};
    var answer = String(rawAnswer || '').trim();
    var markerLetter = parsed.markerLetter || '';
    var parsedEnding = parsed.endingText || '';

    if (!answer) {
      return {
        correctLetter: markerLetter,
        endingText: parsedEnding,
        answerFormat: parsed.hasEmbeddedLetter ? 'sentence_marker' : 'fallback_index'
      };
    }

    if (parsed.hasEmbeddedLetter && markerLetter) {
      return {
        correctLetter: markerLetter,
        endingText: parsedEnding,
        answerFormat: 'sentence_marker'
      };
    }

    var dashMatch = answer.match(LETTER_DASH_ANSWER_RE);
    if (dashMatch) {
      return {
        correctLetter: dashMatch[1].toUpperCase(),
        endingText: dashMatch[2].trim(),
        answerFormat: 'letter_dash_text'
      };
    }

    if (LETTER_ONLY_ANSWER_RE.test(answer)) {
      return {
        correctLetter: answer.toUpperCase(),
        endingText: parsedEnding,
        answerFormat: 'letter_only'
      };
    }

    var plainEnding = answer;
    var mappedLetter = endingLetterMap[normalizeEndingText(plainEnding)] || '';
    return {
      correctLetter: mappedLetter || markerLetter,
      endingText: plainEnding,
      answerFormat: mappedLetter ? 'plain_word_lookup' : 'plain_word_fallback'
    };
  }

  function buildEndingLetterMap(rightOptions) {
    var map = {};
    (rightOptions || []).forEach(function(opt) {
      if (!opt || !opt.letter) return;
      var key = normalizeEndingText(opt.endingText);
      if (key) map[key] = String(opt.letter).toUpperCase();
    });
    return map;
  }

  window.SunePlayColumnMatch = {
    parseMatchSentence: parseMatchSentence,
    normalizeColumnMatchAnswer: normalizeColumnMatchAnswer,
    buildEndingLetterMap: buildEndingLetterMap,
    normalizeEndingText: normalizeEndingText,
    ANSWER_NORMALIZATION_RULE_ID: 'column_match_answer_normalization',
    ANSWER_NORMALIZATION_SUMMARY:
      'Use **LETTER** in sentence first; else parse "B – text", "B", or plain word via ending lookup.'
  };
})();
