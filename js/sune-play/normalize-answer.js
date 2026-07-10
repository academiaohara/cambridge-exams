// js/sune-play/normalize-answer.js
// Answer normalization for Sune Play practice screens

(function() {
  'use strict';

  var APOSTROPHE_RE = /[\u2018\u2019\u201a\u201b`´]/g;

  var NEGATIVE_CONTRACTIONS = [
    ["shan't", 'shall not'],
    ["can't", 'cannot'],
    ["won't", 'will not'],
    ["wouldn't", 'would not'],
    ["shouldn't", 'should not'],
    ["couldn't", 'could not'],
    ["mustn't", 'must not'],
    ["mightn't", 'might not'],
    ["needn't", 'need not'],
    ["daren't", 'dare not'],
    ["oughtn't", 'ought not'],
    ["isn't", 'is not'],
    ["aren't", 'are not'],
    ["wasn't", 'was not'],
    ["weren't", 'were not'],
    ["hasn't", 'has not'],
    ["haven't", 'have not'],
    ["hadn't", 'had not'],
    ["doesn't", 'does not'],
    ["don't", 'do not'],
    ["didn't", 'did not']
  ];

  var PRONOUN_AUX_CONTRACTIONS = [
    ["i'm", 'i am'],
    ["you're", 'you are'],
    ["we're", 'we are'],
    ["they're", 'they are'],
    ["i've", 'i have'],
    ["you've", 'you have'],
    ["we've", 'we have'],
    ["they've", 'they have'],
    ["he's", 'he is'],
    ["she's", 'she is'],
    ["it's", 'it is'],
    ["that's", 'that is'],
    ["there's", 'there is'],
    ["here's", 'here is'],
    ["what's", 'what is'],
    ["who's", 'who is'],
    ["where's", 'where is'],
    ["i'll", 'i will'],
    ["you'll", 'you will'],
    ["he'll", 'he will'],
    ["she'll", 'she will'],
    ["it'll", 'it will'],
    ["we'll", 'we will'],
    ["they'll", 'they will'],
    ["i'd", 'i would'],
    ["you'd", 'you would'],
    ["he'd", 'he would'],
    ["she'd", 'she would'],
    ["we'd", 'we would'],
    ["they'd", 'they would']
  ];

  var IS_HAS_SUBJECTS = ['he', 'she', 'it', 'that', 'there'];
  var WOULD_HAD_SUBJECTS = ['i', 'you', 'he', 'she', 'we', 'they'];

  function replaceWordContraction(text, contraction, expanded) {
    var escaped = contraction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('\\b' + escaped + '\\b', 'gi'), expanded);
  }

  function normalizeContractions(s) {
    var out = s;
    NEGATIVE_CONTRACTIONS.forEach(function(pair) {
      out = replaceWordContraction(out, pair[0], pair[1]);
    });
    PRONOUN_AUX_CONTRACTIONS.forEach(function(pair) {
      out = replaceWordContraction(out, pair[0], pair[1]);
    });
    out = out.replace(/^'m\b/i, 'am');
    out = out.replace(/^'re\b/i, 'are');
    out = out.replace(/^'ve\b/i, 'have');
    out = out.replace(/^'s\b/i, 'is');
    out = out.replace(/^'ll\b/i, 'will');
    out = out.replace(/^'d\b/i, 'would');
    return out;
  }

  function swapPhraseVariants(variants, from, to) {
    variants.slice().forEach(function(v) {
      if (v.indexOf(from) !== -1) {
        var alt = v.split(from).join(to);
        if (variants.indexOf(alt) === -1) variants.push(alt);
      }
    });
  }

  function ambiguousAuxiliaryVariants(normalized) {
    var variants = [normalized];
    IS_HAS_SUBJECTS.forEach(function(subj) {
      swapPhraseVariants(variants, subj + ' is', subj + ' has');
      swapPhraseVariants(variants, subj + ' has', subj + ' is');
    });
    WOULD_HAD_SUBJECTS.forEach(function(subj) {
      swapPhraseVariants(variants, subj + ' would', subj + ' had');
      swapPhraseVariants(variants, subj + ' had', subj + ' would');
    });
    return variants;
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
    var normFn = opts.caseSensitive ? normalizeAnswerPreserveCase : normalizeAnswer;
    var givenVariants = ambiguousAuxiliaryVariants(normFn(given));
    if (!givenVariants[0]) return false;
    var list = Array.isArray(expected) ? expected : [expected];
    return list.some(function(a) {
      var expectedVariants = ambiguousAuxiliaryVariants(normFn(a));
      return givenVariants.some(function(g) {
        return expectedVariants.some(function(e) { return e === g; });
      });
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

  function wordSetsMatch(givenWords, expectedWords, opts) {
    opts = opts || {};
    var normFn = opts.caseSensitive ? normalizeAnswerPreserveCase : normalizeAnswer;
    var givenSet = {};
    (givenWords || []).forEach(function(w) {
      var key = normFn(w);
      if (key) givenSet[key] = true;
    });
    var expectedSet = {};
    (expectedWords || []).forEach(function(w) {
      var key = normFn(w);
      if (key) expectedSet[key] = true;
    });
    var givenKeys = Object.keys(givenSet);
    var expectedKeys = Object.keys(expectedSet);
    if (givenKeys.length !== expectedKeys.length) return false;
    return givenKeys.every(function(k) { return expectedSet[k]; });
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

  function isUnchangedStemWord(given, stemWord) {
    if (!stemWord) return false;
    return answersMatch(given, stemWord);
  }

  function matchesPassageGaps(givens, item, opts) {
    opts = opts || {};
    var gaps = item.gaps || [];
    if (!Array.isArray(givens) || givens.length !== gaps.length) return false;
    return gaps.every(function(gap, i) {
      var given = givens[i];
      if (!given) return false;
      if (item.requireWordFormation) {
        var stem = gap.stemWord || gap.baseVerb || '';
        if (isUnchangedStemWord(given, stem)) return false;
      }
      return answersMatch(given, gap.expectedAnswer, opts);
    });
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
        var variants = String(exp).split(/\s*\/\s*/);
        return variants.some(function(v) {
          return answersMatch(givens[i], v, opts);
        });
      });
    });
  }

  window.SunePlayNormalize = {
    normalizeAnswer: normalizeAnswer,
    normalizeAnswerPreserveCase: normalizeAnswerPreserveCase,
    normalizeCommaRewrite: normalizeCommaRewrite,
    answersMatch: answersMatch,
    isUnchangedStemWord: isUnchangedStemWord,
    matchesAnyAccepted: matchesAnyAccepted,
    matchesCommaRewrite: matchesCommaRewrite,
    wordSetsMatch: wordSetsMatch,
    matchesPassageGaps: matchesPassageGaps,
    matchesBlanks: matchesBlanks
  };
})();
