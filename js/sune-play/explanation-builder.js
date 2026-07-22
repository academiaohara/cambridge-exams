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
    similarExample: { label: 'Similar example', icon: 'auto_awesome', variant: 'tip' },
    wordFormation: { label: 'Word formation', icon: 'transform', variant: 'teach' }
  };

  function getContent(payload) {
    if (!payload) return null;
    return payload.explanationContent || null;
  }

  function hasMcExplanation(payload) {
    if (!payload) return false;
    if (getContent(payload)) return true;
    if (payload.explanation) return true;
    if (payload.displayMode === 'passage') {
      return (payload.gaps || []).some(function(gap) {
        return gap.explanationContent || gap.explanation;
      });
    }
    return false;
  }

  function hasWordBankExplanation(payload) {
    if (!payload) return false;
    if (getContent(payload)) return true;
    if (payload.explanation) return true;
    if (payload.sequentialSentences) {
      return (payload.sentences || []).some(function(sentence) {
        return sentence.explanationContent || sentence.explanation;
      });
    }
    return false;
  }

  function hasExplanation(screen, result) {
    var p = (screen && screen.payload) || {};
    if (screen && screen.formatType === 'mc_4_option') {
      if (hasMcExplanation(p)) return true;
    } else if (screen && screen.formatType === 'word_bank_gap_fill') {
      if (hasWordBankExplanation(p)) return true;
    } else {
      if (getContent(p)) return true;
      if (p.explanation) return true;
    }
    if (result && result.explanation) return true;
    if (result && result.explanationContent) return true;
    return false;
  }

  function formatMcAnswerDisplay(letter, text) {
    var letterStr = String(letter || '').trim().toUpperCase();
    var textStr = String(text || '').trim();
    if (letterStr && textStr) return letterStr + ' — ' + textStr;
    return textStr || letterStr;
  }

  function findMcOption(options, letterOrText) {
    var key = String(letterOrText || '').trim();
    if (!key) return null;
    for (var i = 0; i < (options || []).length; i++) {
      var opt = options[i];
      if (String(opt.letter || '').toUpperCase() === key.toUpperCase()) return opt;
      if (String(opt.text || '').trim().toLowerCase() === key.toLowerCase()) return opt;
    }
    return null;
  }

  function formatGapContext(gap) {
    var before = String(gap.sentenceBefore || '').trim();
    var after = String(gap.sentenceAfter || '').trim();
    if (before || after) return (before + ' ___ ' + after).replace(/\s+/g, ' ').trim();
    if (gap.gapNumber != null) return 'Gap (' + gap.gapNumber + ')';
    return '';
  }

  function pickFocusSection(content) {
    if (!content) return null;
    if (content.vocabularyFocus) return { key: 'vocabularyFocus', text: content.vocabularyFocus };
    if (content.grammarFocus) return { key: 'grammarFocus', text: content.grammarFocus };
    return null;
  }

  function lookupWrongOptionNote(content, userAnswer, options) {
    if (!content || !userAnswer) return '';
    var wrongKey = String(userAnswer).trim();
    if (content.wrongOptions) {
      var wrongNote = content.wrongOptions[wrongKey];
      if (wrongNote) return wrongNote;
      var lower = wrongKey.toLowerCase();
      var keys = Object.keys(content.wrongOptions);
      for (var k = 0; k < keys.length; k++) {
        if (String(keys[k]).trim().toLowerCase() === lower) return content.wrongOptions[keys[k]];
      }
    }
    for (var i = 0; i < (options || []).length; i++) {
      if (String(options[i]).trim().toLowerCase() === wrongKey.toLowerCase()) {
        return (content.wrongOptions && content.wrongOptions[options[i]]) || '';
      }
    }
    return '';
  }

  function appendTeachingSections(sections, content, isWrong, userAnswer, options) {
    if (!content) return;

    if (content.whyCorrect) {
      sections.push({ key: 'whyCorrect', text: content.whyCorrect });
    }
    if (content.wordFormation) {
      sections.push({ key: 'wordFormation', text: content.wordFormation });
    }
    var focus = pickFocusSection(content);
    if (focus) sections.push(focus);

    if (isWrong) {
      var wrongNote = lookupWrongOptionNote(content, userAnswer, options);
      if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
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

  function buildMc4OptionStandalone(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctLetter = String((result && result.correctLetter) || p.answer || '').trim().toUpperCase();
    var correctOpt = findMcOption(p.options, correctLetter);
    var correctText = (result && result.correctAnswer) ||
      p.answerText ||
      (correctOpt && correctOpt.text) ||
      correctLetter;
    var userLetter = result && result.userLetter;
    var userText = result && result.userAnswer;
    var isWrong = result && result.correct === false && (userLetter || userText);

    sections.push({
      key: 'correct',
      text: formatMcAnswerDisplay(correctLetter, correctOpt ? correctOpt.text : correctText)
    });

    if (isWrong) {
      sections.push({
        key: 'yourAnswer',
        text: formatMcAnswerDisplay(userLetter, userText)
      });
    }

    if (content) {
      if (content.wordFormation) {
        sections.push({ key: 'wordFormation', text: content.wordFormation });
      }
      appendTeachingSections(sections, content, isWrong, userLetter || userText, p.options);
    } else if (p.explanation) {
      sections.push({ key: 'whyCorrect', text: p.explanation });
    }

    var completed = p.completedSentence || '';
    if (completed) {
      sections.push({ key: 'sentenceBreakdown', text: completed });
    }

    return {
      title: 'Explanation',
      formatType: 'mc_4_option',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildMc4OptionPassage(screen, result) {
    var p = screen.payload || {};
    var gaps = p.gaps || [];
    var gapResults = (result && result.mcGapResults) || [];
    var sections = [];
    var wrongGaps = gapResults.filter(function(gr) { return gr.correct === false; });
    var isWrong = wrongGaps.length > 0;

    sections.push({ key: 'correct', text: String((result && result.correctAnswer) || '') });

    if (isWrong && result && result.userAnswer) {
      sections.push({ key: 'yourAnswer', text: String(result.userAnswer) });
    }

    if (isWrong) {
      wrongGaps.forEach(function(gr) {
        var gap = gaps.find(function(g) { return g.gapNumber === gr.gapNumber; }) || {};
        var content = gap.explanationContent || null;
        var gapContext = formatGapContext(gap);
        var wrongNote = content
          ? lookupWrongOptionNote(content, gr.userLetter, gap.options) ||
            lookupWrongOptionNote(content, gr.userText, gap.options)
          : '';

        if (content && content.whyCorrect) {
          sections.push({
            key: 'whyCorrect',
            label: 'Gap ' + gr.gapNumber,
            text: content.whyCorrect + (gapContext ? '\n' + gapContext : '')
          });
        }

        var focus = content ? pickFocusSection(content) : null;
        if (focus) {
          sections.push({
            key: focus.key,
            label: 'Gap ' + gr.gapNumber,
            text: focus.text
          });
        }

        if (wrongNote) {
          sections.push({
            key: 'commonMistake',
            label: 'Your mistake (gap ' + gr.gapNumber + ')',
            text: formatMcAnswerDisplay(gr.userLetter, gr.userText) + '. ' + wrongNote
          });
        } else if (gr.userText) {
          sections.push({
            key: 'commonMistake',
            label: 'Your mistake (gap ' + gr.gapNumber + ')',
            text: 'You chose ' + formatMcAnswerDisplay(gr.userLetter, gr.userText) +
              '; the correct answer is ' + formatMcAnswerDisplay(gr.correctLetter, gr.correctText) + '.'
          });
        }
      });
    } else {
      var firstGap = gaps[0] || {};
      var firstContent = firstGap.explanationContent || getContent(p);
      if (firstContent) {
        appendTeachingSections(sections, firstContent, false, '', firstGap.options || []);
      } else if (p.explanation) {
        sections.push({ key: 'whyCorrect', text: p.explanation });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'mc_4_option',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildMc4Option(screen, result) {
    var p = screen.payload || {};
    if (p.displayMode === 'passage') return buildMc4OptionPassage(screen, result);
    return buildMc4OptionStandalone(screen, result);
  }

  function gapSentenceDisplay(sentence) {
    return String(sentence || '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(?:\.{3,}|…{2,}|_{3,})/g, '___')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildWordBankContext(payload, sentence) {
    var bank = (payload && payload.wordBank) || [];
    var bankLine = bank.length ? 'Word bank: ' + bank.join(', ') : '';
    var sent = gapSentenceDisplay((sentence && sentence.sentence) || (payload && payload.sentence) || '');
    return bankLine ? bankLine + '\n' + sent : sent;
  }

  function findWordBankSeqSentence(payload, result) {
    var sentences = (payload && payload.sentences) || [];
    if (result && result.activeSentenceId) {
      for (var i = 0; i < sentences.length; i++) {
        if (sentences[i].sentenceId === result.activeSentenceId) return sentences[i];
      }
    }
    if (result && result.correctAnswer) {
      for (var j = 0; j < sentences.length; j++) {
        if (String(sentences[j].answer) === String(result.correctAnswer)) return sentences[j];
      }
    }
    return sentences[0] || null;
  }

  function buildWordBankGapFill(screen, result) {
    var p = screen.payload || {};
    if (p.sequentialSentences && p.sentences && p.sentences.length) {
      var sentence = findWordBankSeqSentence(p, result);
      var content = (sentence && sentence.explanationContent) || getContent(p);
      var sections = [];
      var correctAnswer = (result && result.correctAnswer) || (sentence && sentence.answer) || '';
      var userAnswer = result && result.userAnswer;
      var isWrong = result && result.correct === false && userAnswer;

      sections.push({ key: 'correct', text: String(correctAnswer) });

      if (isWrong) {
        sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      }

      if (content) {
        appendTeachingSections(sections, content, isWrong, userAnswer, p.wordBank);
      } else if (sentence && sentence.explanation) {
        sections.push({ key: 'whyCorrect', text: sentence.explanation });
      } else if (p.explanation) {
        sections.push({ key: 'whyCorrect', text: p.explanation });
      }

      var sentText = sentence && sentence.sentence;
      if (sentText && correctAnswer) {
        sections.push({
          key: 'sentenceBreakdown',
          text: gapSentenceDisplay(String(sentText).replace(/(?:\.{3,}|…{2,}|_{3,})/g, correctAnswer))
        });
      }

      return {
        title: 'Explanation',
        formatType: 'word_bank_gap_fill',
        context: buildWordBankContext(p, sentence),
        sections: sections
      };
    }

    var standalone = buildFreeTextGapFill(screen, result);
    if (!standalone) return null;
    standalone.formatType = 'word_bank_gap_fill';
    standalone.context = buildWordBankContext(p, null);
    return standalone;
  }

  function buildPreselectedVerbGapFill(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    if (Array.isArray(correctAnswer)) correctAnswer = correctAnswer.join(' / ');
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false && userAnswer;

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (content) {
      var focus = pickFocusSection(content);
      if (focus) {
        sections.push(focus);
      } else if (content.whyCorrect) {
        sections.push({ key: 'grammarFocus', text: content.whyCorrect });
      }
    } else if (p.explanation) {
      sections.push({ key: 'grammarFocus', text: p.explanation });
    }

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      var wrongNote = lookupWrongOptionNote(content, userAnswer, null);
      if (!wrongNote && content && content.commonMistake) wrongNote = content.commonMistake;
      if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
    }

    var completed = p.completedSentence || '';
    if (completed) {
      sections.push({ key: 'sentenceBreakdown', text: stripGapMarkers(completed) });
    }

    return {
      title: 'Explanation',
      formatType: 'preselected_verb_gap_fill',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildConjugationGapFill(screen, result) {
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
      appendTeachingSections(sections, content, isWrong, userAnswer, null);
    } else if (p.explanation) {
      sections.push({ key: 'whyCorrect', text: p.explanation });
    }

    var completed = p.completedSentence || '';
    if (completed) {
      sections.push({ key: 'sentenceBreakdown', text: stripGapMarkers(completed) });
    }

    return {
      title: 'Explanation',
      formatType: 'conjugation_gap_fill',
      context: buildContext(screen),
      sections: sections
    };
  }

  function stripGapMarkers(text) {
    return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
  }

  function buildFreeTextGapFill(screen, result) {
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
      appendTeachingSections(sections, content, isWrong, userAnswer, null);
    } else if (p.explanation) {
      sections.push({ key: 'whyCorrect', text: p.explanation });
    }

    var completed = p.completedSentence || '';
    if (completed) {
      sections.push({ key: 'sentenceBreakdown', text: completed });
    }

    return {
      title: 'Explanation',
      formatType: 'free_text_gap_fill',
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
    if (screen.formatType === 'mc_4_option') {
      if (p.displayMode === 'passage') {
        return String(p.passage || p.instruction || '').trim();
      }
      var mcBefore = String(p.sentenceBefore || '').trim();
      var mcAfter = String(p.sentenceAfter || '').trim();
      if (mcBefore || mcAfter) {
        return (mcBefore + ' ___ ' + mcAfter).replace(/\s+/g, ' ').trim();
      }
      return String(p.prompt || p.sentence || p.instruction || '').trim();
    }
    if (screen.formatType === 'free_text_gap_fill') {
      return gapSentenceDisplay(p.sentence);
    }
    if (screen.sourceFormatType === 'conjugation_gap_fill' || screen.formatType === 'conjugation_gap_fill') {
      return gapSentenceDisplay(p.sentence || p.sourceSentence);
    }
    if (screen.formatType === 'preselected_verb_gap_fill') {
      var verb = String(p.preselectedVerb || '').trim();
      var preSent = gapSentenceDisplay(p.sentence);
      if (verb) return 'Verb: ' + verb + '\n' + preSent;
      return preSent;
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
      case 'mc_4_option':
        return buildMc4Option(screen, result);
      case 'free_text_gap_fill':
        if (screen.sourceFormatType === 'conjugation_gap_fill') {
          return buildConjugationGapFill(screen, result);
        }
        return buildFreeTextGapFill(screen, result);
      case 'conjugation_gap_fill':
        return buildConjugationGapFill(screen, result);
      case 'preselected_verb_gap_fill':
        return buildPreselectedVerbGapFill(screen, result);
      case 'word_bank_gap_fill':
        return buildWordBankGapFill(screen, result);
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
