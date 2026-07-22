/**
 * Builds structured explanation views for Sune Play v2 course exercises.
 * Educational content comes from JSON (explanationContent); runtime fills answers.
 */
var SunePlayExplanation = (function() {
  'use strict';

  var SECTION_DEFS = {
    correct: { label: 'Correct answer', icon: 'check_circle', variant: 'answer' },
    yourAnswer: { label: 'Your answer', icon: 'cancel', variant: 'mistake' },
    whyCorrect: { label: "Why it's correct", icon: 'lightbulb', variant: 'teach' },
    vocabularyFocus: { label: 'Vocabulary focus', icon: 'menu_book', variant: 'teach' },
    grammarFocus: { label: 'Grammar focus', icon: 'school', variant: 'teach' },
    commonMistake: { label: 'Common mistake', icon: 'error_outline', variant: 'mistake-note' },
    sentenceBreakdown: { label: 'Sentence breakdown', icon: 'format_quote', variant: 'neutral' },
    usefulTip: { label: 'Useful tip', icon: 'tips_and_updates', variant: 'tip' },
    similarExample: { label: 'Similar example', icon: 'auto_awesome', variant: 'tip' }
  };

  function getContent(payload) {
    if (!payload) return null;
    return payload.explanationContent || null;
  }

  function hasExplanation(screen, result) {
    var p = (screen && screen.payload) || {};
    if (getContent(p)) return true;
    if (p.explanation) return true;
    if (result && result.explanation) return true;
    return false;
  }

  function pickFocusSection(content) {
    if (!content) return null;
    if (content.vocabularyFocus) return { key: 'vocabularyFocus', text: content.vocabularyFocus };
    if (content.grammarFocus) return { key: 'grammarFocus', text: content.grammarFocus };
    return null;
  }

  function lookupWrongOptionNote(content, userAnswer, options) {
    if (!content || !content.wrongOptions || !userAnswer) return '';
    var wrongKey = String(userAnswer).trim();
    var wrongNote = content.wrongOptions[wrongKey];
    if (wrongNote) return wrongNote;
    for (var i = 0; i < (options || []).length; i++) {
      if (String(options[i]).trim().toLowerCase() === wrongKey.toLowerCase()) {
        return content.wrongOptions[options[i]] || '';
      }
    }
    return '';
  }

  function appendTeachingSections(sections, content, isWrong, userAnswer, options) {
    if (!content) return;

    if (content.whyCorrect) {
      sections.push({ key: 'whyCorrect', text: content.whyCorrect });
    }
    var focus = pickFocusSection(content);
    if (focus) sections.push(focus);

    if (isWrong) {
      var wrongNote = lookupWrongOptionNote(content, userAnswer, options);
      if (wrongNote) {
        sections.push({ key: 'commonMistake', text: wrongNote });
      }
    }

    if (content.usefulTip) {
      sections.push({ key: 'usefulTip', text: content.usefulTip });
    }
    if (content.similarExample) {
      sections.push({ key: 'similarExample', text: content.similarExample });
    }
  }

  function buildTwoOptionChoice(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false && userAnswer;

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      appendTeachingSections(sections, content, isWrong, userAnswer, p.options);
    } else if (p.explanation) {
      sections.push({ key: 'whyCorrect', text: p.explanation });
    }

    var completed = p.completedSentence || '';
    if (completed) {
      sections.push({ key: 'sentenceBreakdown', text: completed });
    }

    return {
      title: 'Explanation',
      formatType: 'two_option_choice',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildMeaningContrast(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false && userAnswer;
    var sentence = String(p.sentence || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (sentence) {
      sections.push({ key: 'sentenceBreakdown', text: sentence });
    }

    if (content) {
      appendTeachingSections(sections, content, isWrong, userAnswer, p.options);
    } else if (p.explanation) {
      sections.push({ key: 'whyCorrect', text: p.explanation });
    }

    return {
      title: 'Explanation',
      formatType: 'meaning_contrast',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildLegacy(screen, result) {
    var p = (screen && screen.payload) || {};
    var text = (result && result.explanation) || p.explanation || '';
    if (!text) return null;
    return {
      title: 'Explanation',
      formatType: screen && screen.formatType,
      context: buildContext(screen),
      sections: [
        { key: 'correct', text: (result && result.correctAnswer) || '' },
        { key: 'whyCorrect', text: text }
      ].filter(function(s) { return s.text; })
    };
  }

  function buildContext(screen) {
    if (!screen) return '';
    var p = screen.payload || {};
    if (screen.formatType === 'meaning_contrast') {
      var prompt = String(p.prompt || '').trim();
      var sentence = String(p.sentence || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
      if (prompt && sentence) {
        return prompt + '\n' + sentence;
      }
      return sentence || prompt;
    }
    if (screen.formatType === 'two_option_choice') {
      if (p.displayMode === 'same_meaning') {
        return String(p.sentenceBefore || p.sentence || '').trim();
      }
      var before = String(p.sentenceBefore || '').trim();
      var after = String(p.sentenceAfter || '').trim();
      if (before || after) {
        return (before + ' ___ ' + after).replace(/\s+/g, ' ').trim();
      }
    }
    return String(p.sentence || p.prompt || p.instruction || '').trim();
  }

  function buildExplainOpts(screen, result) {
    if (!screen) return null;
    switch (screen.formatType) {
      case 'two_option_choice':
        return buildTwoOptionChoice(screen, result);
      case 'meaning_contrast':
        return buildMeaningContrast(screen, result);
      default:
        return buildLegacy(screen, result);
    }
  }

  return {
    SECTION_DEFS: SECTION_DEFS,
    hasExplanation: hasExplanation,
    buildExplainOpts: buildExplainOpts,
    buildContext: buildContext
  };
})();
