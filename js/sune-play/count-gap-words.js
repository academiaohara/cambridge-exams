// js/sune-play/count-gap-words.js
// Word counting for keyword-transformation gap fills (2–5 word limit)

(function() {
  'use strict';

  /**
   * Counts words typed in a keyword-transformation gap.
   *
   * RULE — whitespace_tokens_apostrophe_single_word
   * 1. Trim leading/trailing whitespace.
   * 2. Split on whitespace runs (spaces, tabs, newlines).
   * 3. Discard empty tokens.
   * 4. Each remaining token counts as ONE word. Contractions written with an
   *    apostrophe stay a single token (e.g. don't, I've, won't → 1 word each).
   *    We do NOT expand contractions into two words.
   * 5. Hyphenated compounds count as one word when written without spaces
   *    (e.g. well-known → 1 word).
   * 6. Punctuation glued to a token does not add words (about. → 1 word).
   */
  function countKeywordTransformationWords(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }

  function isKeywordTransformationWordCountValid(text, minWords, maxWords) {
    var count = countKeywordTransformationWords(text);
    var min = typeof minWords === 'number' ? minWords : 2;
    var max = typeof maxWords === 'number' ? maxWords : 5;
    return count >= min && count <= max;
  }

  window.SunePlayCountGapWords = {
    countKeywordTransformationWords: countKeywordTransformationWords,
    isKeywordTransformationWordCountValid: isKeywordTransformationWordCountValid,
    WORD_COUNT_RULE_ID: 'whitespace_tokens_apostrophe_single_word',
    WORD_COUNT_RULE_SUMMARY:
      'Split on whitespace; each token counts as one word (contractions such as don\'t count as 1, not 2).'
  };
})();
