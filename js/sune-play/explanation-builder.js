/**
 * Builds structured explanation views for Sune Play v2 course exercises.
 * Educational content comes from JSON (explanationContent); runtime fills answers.
 */
var SunePlayExplanation = (function() {
  'use strict';

  var SECTION_DEFS = {
    correct: { label: 'Correct answer', icon: 'check_circle', variant: 'answer' },
    yourAnswer: { label: 'Your answer', icon: 'cancel', variant: 'mistake' },
    optionContrast: { label: 'The fix', icon: 'compare_arrows', variant: 'mistake-note' },
    question: { label: 'Question', icon: 'quiz', variant: 'neutral' },
    fix: { label: 'The fix', icon: 'build', variant: 'teach' },
    whyCorrect: { label: "Why it's correct", wrongLabel: 'Why', icon: 'lightbulb', variant: 'teach' },
    correctedSentence: { label: 'Corrected sentence', icon: 'format_quote', variant: 'answer' },
    vocabularyFocus: { label: 'Vocabulary focus', icon: 'menu_book', variant: 'teach' },
    grammarFocus: { label: 'Grammar focus', icon: 'school', variant: 'teach' },
    commonMistake: { label: 'Common mistake', icon: 'error_outline', variant: 'mistake-note' },
    sentenceBreakdown: { label: 'Sentence breakdown', icon: 'format_quote', variant: 'neutral' },
    usefulTip: { label: 'Useful tip', icon: 'tips_and_updates', variant: 'tip' },
    similarExample: { label: 'Similar example', icon: 'auto_awesome', variant: 'tip' },
    wordFormation: { label: 'Word formation', icon: 'transform', variant: 'teach' },
    wordOrder: { label: 'Word order', icon: 'reorder', variant: 'teach' }
  };

  function whyCorrectSection(text, isWrong, extra) {
    var section = { key: 'whyCorrect', text: text };
    if (extra) {
      Object.keys(extra).forEach(function(k) {
        if (extra[k] !== undefined) section[k] = extra[k];
      });
    }
    if (section.label == null) {
      section.label = isWrong ? SECTION_DEFS.whyCorrect.wrongLabel : SECTION_DEFS.whyCorrect.label;
    }
    return section;
  }

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

  function hasPassageGapExplanation(payload) {
    if (!payload) return false;
    if (getContent(payload)) return true;
    if (payload.explanation) return true;
    return (payload.gaps || []).some(function(gap) {
      return gap.explanationContent || gap.explanation;
    });
  }

  function hasHuntCounterExplanation(payload) {
    if (!payload) return false;
    return (payload.items || []).some(function(item) {
      return item.explanationContent || item.explanation;
    });
  }

  function hasGuidedErrorExplanation(payload) {
    if (!payload) return false;
    return (payload.items || []).some(function(item) {
      return item.explanationContent || item.explanation;
    });
  }

  function hasExplanation(screen, result) {
    var p = (screen && screen.payload) || {};
    if (screen && screen.formatType === 'mc_4_option') {
      if (hasMcExplanation(p)) return true;
    } else if (screen && screen.formatType === 'word_bank_gap_fill') {
      if (hasWordBankExplanation(p)) return true;
    } else if (screen && screen.formatType === 'passage_gap_fill') {
      if (hasPassageGapExplanation(p)) return true;
    } else if (screen && screen.formatType === 'passage_error_hunt_counter') {
      if (hasHuntCounterExplanation(p)) return true;
    } else if (screen && screen.formatType === 'guided_error_choice') {
      if (hasGuidedErrorExplanation(p)) return true;
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

  function lookupMapNote(map, userAnswer, options) {
    if (!map || !userAnswer) return '';
    var wrongKey = String(userAnswer).trim();
    var wrongNote = map[wrongKey];
    if (wrongNote) return wrongNote;
    var lower = wrongKey.toLowerCase();
    var keys = Object.keys(map);
    for (var k = 0; k < keys.length; k++) {
      if (String(keys[k]).trim().toLowerCase() === lower) return map[keys[k]];
    }
    for (var i = 0; i < (options || []).length; i++) {
      var opt = options[i];
      var optText = typeof opt === 'object' && opt != null
        ? String(opt.text || opt.letter || '').trim()
        : String(opt).trim();
      var optLetter = typeof opt === 'object' && opt != null
        ? String(opt.letter || '').trim()
        : '';
      if (optText && optText.toLowerCase() === lower) {
        if (map[optText]) return map[optText];
        if (optLetter && map[optLetter]) return map[optLetter];
      }
      if (optLetter && optLetter.toLowerCase() === lower) {
        if (map[optLetter]) return map[optLetter];
        if (optText && map[optText]) return map[optText];
      }
    }
    return '';
  }

  function lookupWrongOptionNote(content, userAnswer, options) {
    if (!content || !userAnswer) return '';
    return lookupMapNote(content.wrongOptions, userAnswer, options);
  }

  function stripContrastQuotes(text) {
    return String(text || '').replace(/^["']|["']$/g, '').trim();
  }

  function formatOptionContrastLine(wrongText, correctText, becauseClause) {
    var wrong = stripContrastQuotes(wrongText);
    var correct = stripContrastQuotes(correctText);
    var because = String(becauseClause || '').trim().replace(/[.!?]$/, '');
    if (!because) return '';
    if (/^because\b/i.test(because)) because = because.replace(/^because\s+/i, '');
    return '"' + wrong + '" doesn\'t fit here → "' + correct + '" does, because ' + because + '.';
  }

  function inferBecauseFromWrongNote(wrongNote, whyCorrect) {
    var note = String(wrongNote || '').trim();
    if (!note) {
      return String(whyCorrect || '').trim().replace(/[.!?]$/, '');
    }
    var quoted = note.match(/^["']([^"']+)["']\s+(.+)$/);
    if (quoted) {
      var rest = quoted[2].trim().replace(/[.!?]$/, '');
      rest = rest
        .replace(/^points the wrong way\s*[—-]\s*/i, '')
        .replace(/^does not match the clue in the rest of the sentence/i, 'it does not match the clue in the rest of the sentence')
        .replace(/^does not describe\b/i, 'it does not describe')
        .replace(/^does not form\b/i, 'it does not form')
        .replace(/^belongs to\b/i, 'it belongs to')
        .replace(/^is the wrong\b/i, 'it is the wrong')
        .replace(/^is only for\b/i, 'it is only for')
        .replace(/^is not used\b/i, 'it is not used')
        .replace(/^may be\b/i, 'it may be')
        .replace(/^can sound\b/i, 'it can sound')
        .replace(/^does not express\b/i, 'it does not express')
        .replace(/^does not fit\b/i, 'it does not fit')
        .replace(/^does not combine\b/i, 'it does not combine')
        .replace(/^breaks the grammar pattern described above/i, 'it breaks the grammar pattern needed here')
        .replace(/^does not match the grammar or meaning clue in this sentence/i, 'it does not match the grammar or meaning clue in this sentence');
      if (!/^(it|the|this|that|they|we|you|he|she)\b/i.test(rest)) {
        rest = rest.charAt(0).toLowerCase() + rest.slice(1);
      }
      return rest;
    }
    return note.replace(/[.!?]$/, '');
  }

  function lookupOptionContrast(content, userAnswer, options, correctAnswer) {
    if (!content || !userAnswer) return '';
    var contrast = lookupMapNote(content.optionContrast, userAnswer, options);
    if (contrast) return contrast;

    var wrongNote = lookupWrongOptionNote(content, userAnswer, options);
    if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
    if (!wrongNote || !correctAnswer) return '';

    if (/doesn't fit here\s*→/.test(wrongNote)) return wrongNote;
    return formatOptionContrastLine(
      userAnswer,
      correctAnswer,
      inferBecauseFromWrongNote(wrongNote, content.whyCorrect)
    );
  }

  function appendChoiceTeachingSections(sections, content, isWrong, userAnswer, options, correctAnswer) {
    if (!content) return;

    if (isWrong) {
      var contrast = lookupOptionContrast(content, userAnswer, options, correctAnswer);
      if (contrast) {
        sections.push({ key: 'optionContrast', text: contrast });
      }
    }

    if (content.whyCorrect) {
      sections.push(whyCorrectSection(content.whyCorrect, isWrong));
    }
    if (content.wordFormation) {
      sections.push({ key: 'wordFormation', text: content.wordFormation });
    }
    var focus = pickFocusSection(content);
    if (focus) sections.push(focus);

    if (content.usefulTip) {
      sections.push({ key: 'usefulTip', text: content.usefulTip });
    }
    if (content.similarExample) {
      sections.push({ key: 'similarExample', text: content.similarExample });
    }
  }

  function usesMistakeExplanationFormat(content) {
    return !!(content && content.fix && content.question && content.correctedSentence);
  }

  function appendMistakeExplanationSections(sections, content, isWrong) {
    if (!usesMistakeExplanationFormat(content)) return false;

    sections.push({ key: 'question', text: String(content.question) });
    sections.push({ key: 'fix', text: String(content.fix) });
    sections.push(whyCorrectSection(content.whyCorrect, isWrong, { label: 'Why' }));
    sections.push({ key: 'correctedSentence', text: String(content.correctedSentence) });
    return true;
  }

  function appendTeachingSections(sections, content, isWrong, userAnswer, options) {
    if (!content) return;

    if (appendMistakeExplanationSections(sections, content, isWrong)) return;

    if (content.whyCorrect) {
      sections.push(whyCorrectSection(content.whyCorrect, isWrong));
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
      appendChoiceTeachingSections(sections, content, isWrong, userAnswer, p.options, correctAnswer);
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
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
      appendChoiceTeachingSections(
        sections,
        content,
        isWrong,
        userLetter || userText,
        p.options,
        correctText
      );
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
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
          sections.push(whyCorrectSection(
            content.whyCorrect + (gapContext ? '\n' + gapContext : ''),
            true,
            { label: 'Gap ' + gr.gapNumber }
          ));
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
        sections.push(whyCorrectSection(p.explanation, false));
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

  function extractPassageGapLine(passage, gapNumber, answer) {
    var lines = String(passage || '').split('\n');
    var gapToken = '(' + gapNumber + ')';
    var gapRe = new RegExp('\\.{3,}|…{2,}|_{3,}|…\\(' + gapNumber + '\\)…', 'g');
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(gapToken) === -1) continue;
      var line = lines[i]
        .replace(gapRe, answer || '___')
        .replace(/\s*\([A-Z][A-Z0-9'-]*\)/g, '')
        .trim();
      return gapSentenceDisplay(line);
    }
    return gapNumber != null ? 'Gap (' + gapNumber + ')' : '';
  }

  function findPassageGap(payload, result) {
    var gaps = (payload && payload.gaps) || [];
    if (result && result.activeGapNumber != null) {
      for (var i = 0; i < gaps.length; i++) {
        if (gaps[i].gapNumber === result.activeGapNumber) return gaps[i];
      }
    }
    if (result && result.correctAnswer) {
      for (var j = 0; j < gaps.length; j++) {
        if (String(gaps[j].expectedAnswer) === String(result.correctAnswer)) return gaps[j];
      }
    }
    return gaps[0] || null;
  }

  function appendPassageGapTeaching(sections, gap, payload, userAnswer, isWrong, options) {
    options = options || {};
    var content = gap.explanationContent || null;
    var gapNum = gap.gapNumber;

    if (content) {
      if (content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong, {
          label: options.gapLabel ? 'Gap ' + gapNum : undefined
        }));
      }
      if (content.wordFormation) {
        sections.push({
          key: 'wordFormation',
          label: options.gapLabel ? 'Gap ' + gapNum : undefined,
          text: content.wordFormation
        });
      }
      var focus = pickFocusSection(content);
      if (focus) {
        sections.push({
          key: focus.key,
          label: options.gapLabel ? 'Gap ' + gapNum : undefined,
          text: focus.text
        });
      }
      if (isWrong) {
        var wrongNote = lookupWrongOptionNote(content, userAnswer, null);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (wrongNote) {
          sections.push({
            key: 'commonMistake',
            label: options.gapLabel
              ? 'Your mistake (gap ' + gapNum + ')'
              : 'Your mistake',
            text: wrongNote
          });
        }
      }
      if (content.usefulTip && !options.gapLabel) {
        sections.push({ key: 'usefulTip', text: content.usefulTip });
      }
    } else if (gap.explanation) {
      sections.push(whyCorrectSection(gap.explanation, isWrong, {
        label: options.gapLabel ? 'Gap ' + gapNum : undefined
      }));
    }

    var line = extractPassageGapLine(payload.passage, gap.gapNumber, gap.expectedAnswer);
    if (line && !options.gapLabel) {
      sections.push({ key: 'sentenceBreakdown', text: line });
    } else if (line && options.gapLabel) {
      sections.push({
        key: 'sentenceBreakdown',
        label: 'Gap ' + gapNum,
        text: line
      });
    }
  }

  function buildPassageGapFill(screen, result) {
    var p = screen.payload || {};
    var gaps = p.gaps || [];

    if (p.sequentialGaps) {
      var gap = findPassageGap(p, result);
      if (!gap) return null;
      var sections = [];
      var correctAnswer = gap.expectedAnswer || '';
      var userAnswer = result && result.userAnswer;
      var isWrong = result && result.correct === false && userAnswer;
      var gapLabel = gap.gapNumber != null ? 'Gap (' + gap.gapNumber + ')' : 'Correct answer';

      sections.push({ key: 'correct', label: gapLabel, text: String(correctAnswer) });

      if (isWrong) {
        sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      }

      appendPassageGapTeaching(sections, gap, p, userAnswer, isWrong, {});

      return {
        title: 'Explanation',
        formatType: 'passage_gap_fill',
        context: buildContext(screen),
        sections: sections
      };
    }

    var gapResults = (result && result.passageGapResults) || [];
    var wrongGaps = gapResults.filter(function(gr) { return gr.correct === false; });
    var allSections = [];

    allSections.push({ key: 'correct', text: String((result && result.correctAnswer) || '') });

    if (wrongGaps.length > 0 && result && result.userAnswer) {
      allSections.push({ key: 'yourAnswer', text: String(result.userAnswer) });
    }

    if (wrongGaps.length > 0) {
      wrongGaps.forEach(function(gr) {
        var wrongGap = gaps.find(function(g) { return g.gapNumber === gr.gapNumber; }) || {};
        appendPassageGapTeaching(allSections, wrongGap, p, gr.userAnswer, true, { gapLabel: true });
      });
    } else {
      var firstGap = gaps[0] || {};
      appendPassageGapTeaching(allSections, firstGap, p, '', false, {});
      if (!firstGap.explanationContent && !firstGap.explanation && p.explanation) {
        allSections.push(whyCorrectSection(p.explanation, false));
      }
    }

    return {
      title: 'Explanation',
      formatType: 'passage_gap_fill',
      context: buildContext(screen),
      sections: allSections
    };
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
        sections.push(whyCorrectSection(sentence.explanation, isWrong));
      } else if (p.explanation) {
        sections.push(whyCorrectSection(p.explanation, isWrong));
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
      if (content.grammarFocus) {
        sections.push({ key: 'grammarFocus', text: content.grammarFocus });
      } else {
        var focus = pickFocusSection(content);
        if (focus) {
          sections.push(focus);
        } else if (content.whyCorrect) {
          sections.push({ key: 'grammarFocus', text: content.whyCorrect });
        }
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
      sections.push(whyCorrectSection(p.explanation, isWrong));
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
      sections.push(whyCorrectSection(p.explanation, isWrong));
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

    if (content) {
      appendChoiceTeachingSections(sections, content, isWrong, userAnswer, p.options, correctAnswer);
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
    }

    if (sentence) {
      sections.push({ key: 'sentenceBreakdown', text: sentence });
    }

    return {
      title: 'Explanation',
      formatType: 'meaning_contrast',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildSyncedSentenceBreakdown(sentences, answer) {
    return (sentences || []).map(function(sentence) {
      return gapSentenceDisplay(String(sentence).replace(/(?:\.{3,}|…{2,}|_{3,})/g, answer || '___'));
    }).join('\n');
  }

  function buildSyncedGapFill(screen, result) {
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
      sections.push(whyCorrectSection(p.explanation, isWrong));
    }

    var breakdown = buildSyncedSentenceBreakdown(p.sentences, correctAnswer);
    if (breakdown) {
      sections.push({ key: 'sentenceBreakdown', text: breakdown });
    }

    return {
      title: 'Explanation',
      formatType: 'synced_gap_fill',
      context: buildContext(screen),
      sections: sections
    };
  }

  function fillKwtTarget(targetSentence, answer) {
    return gapSentenceDisplay(String(targetSentence || '').replace(/(?:\.{3,}|…{2,}|_{3,})/g, answer || '___'));
  }

  function buildKeywordTransformation(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    var userAnswer = result && result.userAnswer;
    var wordCountInvalid = result && result.wordCountInvalid;
    var isWrong = result && result.correct === false;

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (wordCountInvalid) {
      var minW = p.minWords != null ? p.minWords : 2;
      var maxW = p.maxWords != null ? p.maxWords : 5;
      var wcNote = (content && content.wordCountMistake) ||
        ('Write between ' + minW + ' and ' + maxW + ' words, including the keyword unchanged. Contractions such as don\'t count as one word.');
      sections.push({ key: 'commonMistake', text: wcNote });
      if (userAnswer) {
        sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      }
    } else if (isWrong && userAnswer) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      if (content.whyCorrect && !wordCountInvalid) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong));
      }
      var focus = pickFocusSection(content);
      if (focus) sections.push(focus);
      if (isWrong && !wordCountInvalid) {
        var wrongNote = lookupWrongOptionNote(content, userAnswer, null);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
      }
      if (content.similarExample) {
        sections.push({ key: 'similarExample', text: content.similarExample });
      }
      if (content.usefulTip) {
        sections.push({ key: 'usefulTip', text: content.usefulTip });
      }
    } else if (p.explanation && !wordCountInvalid) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
    }

    var completed = fillKwtTarget(p.targetSentence, correctAnswer);
    if (completed) {
      sections.push({ key: 'sentenceBreakdown', text: completed });
    }

    return {
      title: 'Explanation',
      formatType: 'keyword_transformation',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildErrorCorrectedSentence(sentence, highlightedText, answer) {
    var text = String(sentence || '');
    var wrong = String(highlightedText || '').trim();
    var fix = String(answer || '').trim();
    if (!wrong || !fix) return gapSentenceDisplay(text);
    var escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return gapSentenceDisplay(text.replace(new RegExp(escaped, 'i'), fix));
  }

  function buildErrorCorrection(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    var userAnswer = result && result.userAnswer;
    var highlighted = String(p.highlightedText || '').trim();
    var isWrong = result && result.correct === false && userAnswer;
    var standardized = usesMistakeExplanationFormat(content);

    if (!standardized) {
      sections.push({ key: 'correct', text: String(correctAnswer) });
    }

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      appendTeachingSections(sections, content, isWrong, userAnswer, null);
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
    }

    if (!standardized) {
      var corrected = buildErrorCorrectedSentence(p.sentence, highlighted, correctAnswer);
      if (corrected) {
        sections.push({ key: 'sentenceBreakdown', text: corrected });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'error_correction',
      context: standardized ? '' : buildContext(screen),
      sections: sections
    };
  }

  function fewTokenCore(token) {
    return String(token || '').replace(/^[^\w\u2019']+|[^\w\u2019']+$/g, '').toLowerCase();
  }

  function buildFewCorrectedSentence(sentence, answer, isCorrectSentence) {
    var text = gapSentenceDisplay(sentence || '');
    if (isCorrectSentence || String(answer || '').trim().toUpperCase() === 'OK') {
      return text;
    }
    var extra = String(answer || '').trim();
    if (!extra) return text;
    var parts = String(sentence || '').replace(/\[[^\]]+\]/g, function(m) {
      return m.slice(1, -1);
    }).split(/\s+/).filter(Boolean);
    var removed = false;
    var filtered = parts.filter(function(token) {
      var core = fewTokenCore(token);
      if (!removed && core === extra.toLowerCase()) {
        removed = true;
        return false;
      }
      return true;
    });
    if (removed) return gapSentenceDisplay(filtered.join(' '));
    var escaped = extra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return gapSentenceDisplay(text.replace(new RegExp('\\b' + escaped + '\\b', 'i'), '').replace(/\s+/g, ' ').trim());
  }

  function formatFewCorrectAnswer(payload) {
    if (payload.isCorrectSentence || String(payload.answer || '').trim().toUpperCase() === 'OK') {
      return 'OK — sentence is correct';
    }
    var answer = String(payload.answer || '').trim();
    return answer ? answer + ' (extra word)' : 'OK';
  }

  function buildFindExtraWord(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || formatFewCorrectAnswer(p);
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false && userAnswer;

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      appendTeachingSections(sections, content, isWrong, userAnswer, null);
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
    }

    var corrected = buildFewCorrectedSentence(p.sentence, p.answer, p.isCorrectSentence);
    if (corrected) {
      sections.push({ key: 'sentenceBreakdown', text: corrected });
    }

    return {
      title: 'Explanation',
      formatType: 'find_extra_word',
      context: buildContext(screen),
      sections: sections
    };
  }

  function formatVerbBankAnswer(payload) {
    var ans = payload && payload.answer;
    if (Array.isArray(ans)) return ans.join(' / ');
    return String(ans || '').trim();
  }

  function isVerbBankStep1(screen, result) {
    var p = (screen && screen.payload) || {};
    var step = p.step || 'choose_verb';
    return step === 'choose_verb' && result && result.correct === false && result.partial && !result._advanceStep;
  }

  function lookupWrongVerbNote(content, userAnswer, wordBank) {
    if (!content || !userAnswer) return '';
    if (content.wrongVerbs) {
      var fromVerbs = lookupWrongOptionNote({ wrongOptions: content.wrongVerbs }, userAnswer, wordBank);
      if (fromVerbs) return fromVerbs;
    }
    return lookupWrongOptionNote(content, userAnswer, wordBank);
  }

  function cleanCrosswordClue(clue) {
    return String(clue || '')
      .replace(/\.{3,}|…{2,}|_{3,}/g, '___')
      .replace(/\s*\(\d+\)\s*$/, '')
      .trim();
  }

  function isNoCommaAnswer(answer) {
    return /^no commas/i.test(String(answer || '').trim());
  }

  function formatCommaCorrectAnswer(payload, result) {
    var p = payload || {};
    if (p.interactionMode === 'rewrite_sentence') {
      if (p.noCommaNeeded) return 'No commas';
      return (result && result.correctAnswer) || p.reconstructedSentence || p.answer || '';
    }
    if (p.noCommaNeeded) return 'No commas';
    var indexes = p.commaAfterTokenIndexes || [];
    if (!indexes.length) return 'No commas';
    var tokens = (p.tokens || []).map(function(tok) {
      return tok && tok.text != null ? tok.text : tok;
    });
    return indexes.map(function(idx) {
      var word = tokens[idx] || ('token ' + idx);
      return 'after "' + word + '"';
    }).join('; ');
  }

  function parseWordList(value) {
    if (Array.isArray(value)) {
      return value.map(function(w) { return String(w).trim(); }).filter(Boolean);
    }
    return String(value || '').split(/,\s*/).map(function(w) { return w.trim(); }).filter(Boolean);
  }

  function wordBankTickSetDiff(selected, answerWords) {
    var answerMap = {};
    var selectedMap = {};
    (answerWords || []).forEach(function(word) {
      var key = String(word).trim().toLowerCase();
      if (key) answerMap[key] = String(word).trim();
    });
    (selected || []).forEach(function(word) {
      var key = String(word).trim().toLowerCase();
      if (key) selectedMap[key] = String(word).trim();
    });
    var falsePositives = [];
    var falseNegatives = [];
    Object.keys(selectedMap).forEach(function(key) {
      if (!answerMap[key]) falsePositives.push(selectedMap[key]);
    });
    Object.keys(answerMap).forEach(function(key) {
      if (!selectedMap[key]) falseNegatives.push(answerMap[key]);
    });
    return { falsePositives: falsePositives, falseNegatives: falseNegatives };
  }

  function formatWordBankTickAnswer(words) {
    return (words || []).slice().sort(function(a, b) {
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    }).join(', ');
  }

  function wordBankTickWordNote(content, word, kind) {
    var note = lookupWrongOptionNote(content, word, null);
    if (note) return note;
    if (kind === 'missed') {
      return 'it matches the selection rule — check the adjective form with -y.';
    }
    return 'it does not match the selection rule.';
  }

  function buildWordBankTickMistakeNote(content, diff) {
    if (!diff) return '';
    var lines = [];
    if (diff.falsePositives.length) {
      var extra = diff.falsePositives[0];
      lines.push('You selected *' + extra + '* — ' + wordBankTickWordNote(content, extra, 'extra'));
    }
    if (diff.falseNegatives.length) {
      var missed = diff.falseNegatives[0];
      lines.push('You missed *' + missed + '* — ' + wordBankTickWordNote(content, missed, 'missed'));
    }
    if (lines.length > 1) {
      return lines[0] + ' ' + lines[1].charAt(0).toLowerCase() + lines[1].slice(1);
    }
    if (lines.length) return lines[0];
    return content && content.commonMistake ? content.commonMistake : '';
  }

  function buildWordBankTick(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var answerWords = p.answerWords || parseWordList(result && result.correctAnswer);
    var selected = (result && result.selectedWords) ||
      parseWordList(result && result.userAnswer);
    var correctAnswer = formatWordBankTickAnswer(answerWords);
    var userAnswer = formatWordBankTickAnswer(selected);
    var isWrong = result && result.correct === false;
    var diff = isWrong ? wordBankTickSetDiff(selected, answerWords) : null;
    var sections = [];

    sections.push({ key: 'correct', text: correctAnswer });

    if (isWrong && userAnswer) {
      sections.push({ key: 'yourAnswer', text: userAnswer });
    }

    if (content) {
      if (content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong));
      }
      var focus = pickFocusSection(content);
      if (focus) sections.push(focus);
      if (isWrong) {
        var wrongNote = buildWordBankTickMistakeNote(content, diff);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
      }
      if (content.usefulTip) {
        sections.push({ key: 'usefulTip', text: content.usefulTip });
      }
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
      if (isWrong) {
        var legacyNote = buildWordBankTickMistakeNote(null, diff);
        if (legacyNote) sections.push({ key: 'commonMistake', text: legacyNote });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'word_bank_tick',
      context: buildContext(screen),
      sections: sections
    };
  }

  function stativeVerbGroupMap(groups) {
    var map = {};
    (groups || []).forEach(function(group) {
      (group.answers || []).forEach(function(verb) {
        map[String(verb).trim().toLowerCase()] = {
          groupId: group.groupId,
          label: group.label || group.groupId || ''
        };
      });
    });
    return map;
  }

  function formatStativeSortingAnswer(groups) {
    var lines = [];
    (groups || []).forEach(function(group) {
      var label = group.label || group.groupId || '';
      (group.answers || []).forEach(function(verb) {
        lines.push(String(verb).trim() + ' \u2192 ' + label);
      });
    });
    return lines.join('\n');
  }

  function stativeSortingWordNote(content, verb, correctLabel) {
    var note = lookupWrongOptionNote(content, verb, null);
    if (note) return note;
    if (correctLabel) {
      return 'it belongs in *' + correctLabel + '*.';
    }
    return 'check which category rule applies to this word.';
  }

  function buildStativeSortingMistakeNote(content, misplaced) {
    if (!misplaced || !misplaced.length) {
      return content && content.commonMistake ? content.commonMistake : '';
    }
    var first = misplaced[0];
    var verb = first.verb || '';
    var placedLabel = first.placedLabel || first.placedGroupId || 'the wrong box';
    var correctLabel = first.correctLabel || '';
    var note = stativeSortingWordNote(content, verb, correctLabel);
    var line = 'You put *' + verb + '* in ' + placedLabel + ' \u2014 ' + note;
    if (misplaced.length > 1) {
      var second = misplaced[1];
      var secondNote = stativeSortingWordNote(content, second.verb, second.correctLabel);
      line += ' You also put *' + second.verb + '* in ' +
        (second.placedLabel || second.placedGroupId) + ' \u2014 ' + secondNote;
    }
    return line;
  }

  function buildStativeSorting(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var groups = p.groups || [];
    var correctAnswer = (result && result.correctAnswer) || formatStativeSortingAnswer(groups);
    var misplaced = (result && result.misplacedWords) || [];
    var isWrong = result && result.correct === false && misplaced.length > 0;
    var sections = [];

    sections.push({ key: 'correct', text: correctAnswer });

    if (content) {
      if (content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong));
      }
      var focus = pickFocusSection(content);
      if (focus) sections.push(focus);
      if (isWrong) {
        var wrongNote = buildStativeSortingMistakeNote(content, misplaced);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
      } else if (!isWrong && content.commonMistake && result && result.correct === false) {
        sections.push({ key: 'commonMistake', text: content.commonMistake });
      }
      if (content.usefulTip) {
        sections.push({ key: 'usefulTip', text: content.usefulTip });
      }
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
      if (isWrong) {
        var legacyMistake = buildStativeSortingMistakeNote(null, misplaced);
        if (legacyMistake) sections.push({ key: 'commonMistake', text: legacyMistake });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'stative_sorting',
      context: buildContext(screen),
      sections: sections
    };
  }

  function findPhraseIndex(text, phrase) {
    var haystack = String(text || '');
    var needle = String(phrase || '').trim();
    if (!haystack || !needle) return -1;
    return haystack.toLowerCase().indexOf(needle.toLowerCase());
  }

  function extractSentenceContaining(text, phrase) {
    var passage = String(text || '').trim();
    var target = String(phrase || '').trim();
    if (!passage) return '';
    var idx = findPhraseIndex(passage, target);
    if (idx === -1) return passage;

    var start = passage.lastIndexOf('.', idx);
    start = start === -1 ? 0 : start + 1;
    while (start < passage.length && /\s/.test(passage.charAt(start))) start++;

    var end = passage.indexOf('.', idx + target.length);
    if (end === -1) end = passage.length;
    else end += 1;

    return passage.slice(start, end).trim();
  }

  function wrapMarkedSnippet(sentence, phrase, markerNum) {
    var num = markerNum || 1;
    var target = String(phrase || '').trim();
    if (!sentence || !target) return String(sentence || '').trim();
    var escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var replaced = false;
    var marked = String(sentence).replace(new RegExp(escaped, 'i'), function(match) {
      replaced = true;
      return '[start' + num + ']' + match + '[end' + num + ']';
    });
    return replaced ? marked : String(sentence).trim();
  }

  function buildHuntMarkedSnippet(passage, phrase, markerNum) {
    return wrapMarkedSnippet(extractSentenceContaining(passage, phrase), phrase, markerNum);
  }

  function buildHuntSentenceBreakdown(passage, wrong, answer) {
    var sentence = extractSentenceContaining(passage, wrong);
    var wrongPhrase = String(wrong || '').trim();
    var fix = String(answer || '').trim();
    if (!sentence || !wrongPhrase || !fix) return '';
    var escaped = wrongPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var corrected = sentence.replace(new RegExp(escaped, 'i'), fix);
    return wrapMarkedSnippet(corrected, fix, 1);
  }

  function huntWrongTapNote(content, tappedPhrase, wrongPhrase) {
    var note = lookupWrongOptionNote(content, tappedPhrase, null);
    if (!note && content && content.wrongOptions && content.wrongOptions.wrong_tap) {
      note = content.wrongOptions.wrong_tap;
    }
    if (note) return note;
    if (tappedPhrase) {
      return '*' + tappedPhrase + '* is not the error — look for an unnatural verb form' +
        (wrongPhrase ? ' like *' + wrongPhrase + '*' : '') + '.';
    }
    return 'That phrase is not the error. Look for an unnatural verb form.';
  }

  function buildPassageErrorHuntSingle(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var wrongPhrase = p.wrong || '';
    var huntPhase = (result && result.huntPhase) ||
      (result && result.correct ? 'correct' : 'wrong_fix');
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    var userAnswer = result && result.userAnswer;
    var tappedPhrase = (result && result.tappedPhrase) || '';
    var sections = [];

    if (huntPhase === 'wrong_tap') {
      sections.push({
        key: 'commonMistake',
        text: huntWrongTapNote(content, tappedPhrase, wrongPhrase)
      });
      if (content) {
        if (content.whyCorrect) {
          sections.push(whyCorrectSection(content.whyCorrect, true));
        }
        var tapFocus = pickFocusSection(content);
        if (tapFocus) sections.push(tapFocus);
      }
    } else {
      var isWrong = result && result.correct === false;
      sections.push({ key: 'correct', text: String(correctAnswer) });
      if (isWrong && userAnswer) {
        sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      }
      if (content) {
        if (content.whyCorrect) {
          sections.push(whyCorrectSection(content.whyCorrect, isWrong));
        }
        var focus = pickFocusSection(content);
        if (focus) sections.push(focus);
        if (isWrong) {
          var fixNote = lookupWrongOptionNote(content, userAnswer, null);
          if (!fixNote && content.commonMistake) fixNote = content.commonMistake;
          if (fixNote) sections.push({ key: 'commonMistake', text: fixNote });
        }
        var breakdown = content.sentenceBreakdown ||
          buildHuntSentenceBreakdown(p.passage, wrongPhrase, correctAnswer);
        if (breakdown) sections.push({ key: 'sentenceBreakdown', text: breakdown });
      } else if (p.explanation) {
        sections.push(whyCorrectSection(p.explanation, isWrong));
        var legacyBreakdown = buildHuntSentenceBreakdown(p.passage, wrongPhrase, correctAnswer);
        if (legacyBreakdown) sections.push({ key: 'sentenceBreakdown', text: legacyBreakdown });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'passage_error_hunt_single',
      context: buildHuntMarkedSnippet(p.passage, wrongPhrase) || buildContext(screen),
      sections: sections
    };
  }

  function huntCounterProgressTip(remaining, total) {
    if (remaining == null) return '';
    if (remaining <= 0) {
      return total ? 'All errors corrected — well done!' : '';
    }
    if (remaining === 1) {
      return '1 error left — check another verb tense in the passage.';
    }
    return remaining + ' errors left — keep hunting for unnatural verb forms.';
  }

  function getHuntExerciseTip(screen, result) {
    if (!screen || !result) return '';
    var p = screen.payload || {};
    var activeItem = null;
    var content = null;
    var wrongPhrase = '';
    var remaining = result.errorsRemaining;
    var total = result.errorsTotal ||
      (p.counter && p.counter.target) || p.errorCount || (p.items && p.items.length) || 0;

    if (screen.formatType === 'passage_error_hunt_counter') {
      activeItem = getHuntActiveItem(p, result) || {};
      content = activeItem.explanationContent || null;
      wrongPhrase = activeItem.wrong || '';
    } else if (screen.formatType === 'passage_error_hunt_single') {
      content = getContent(p);
      wrongPhrase = p.wrong || '';
    } else {
      return '';
    }

    var huntPhase = result.huntPhase;
    if (!huntPhase) {
      if (result._huntMarkResult) huntPhase = 'mark_success';
      else if (result._huntFixResult && result.correct) huntPhase = 'correct_fix';
      else if (result.correct === false) huntPhase = 'wrong_fix';
      else if (result.correct) huntPhase = 'correct_fix';
      else huntPhase = 'wrong_tap';
    }

    if (huntPhase === 'wrong_tap') {
      return huntCounterProgressTip(remaining, total);
    }
    if (huntPhase === 'mark_success') {
      var markTip = wrongPhrase
        ? 'Now write the correction for *' + wrongPhrase + '*.'
        : 'Now write the correction for this error.';
      var markProgress = huntCounterProgressTip(remaining, total);
      if (markProgress) markTip += ' ' + markProgress;
      return markTip.trim();
    }

    var progressTip = huntCounterProgressTip(result.allDone ? 0 : remaining, total);
    var baseTip = content && content.usefulTip ? content.usefulTip + ' ' : '';
    if (progressTip) return (baseTip + progressTip).trim();
    return (content && content.usefulTip) || '';
  }

  function getHuntActiveItem(payload, result) {
    if (result && result.activeItem) return result.activeItem;
    var idx = result && result.huntItemIdx;
    if (idx != null && payload && payload.items && payload.items[idx]) {
      return payload.items[idx];
    }
    return null;
  }

  function buildPassageErrorHuntCounter(screen, result) {
    var p = screen.payload || {};
    var activeItem = getHuntActiveItem(p, result) || {};
    var content = activeItem.explanationContent || null;
    var huntPhase = result && result.huntPhase;
    if (!huntPhase) {
      if (result && result._huntMarkResult) huntPhase = 'mark_success';
      else if (result && result._huntFixResult && result.correct) huntPhase = 'correct_fix';
      else if (result && result.correct === false) huntPhase = 'wrong_fix';
      else huntPhase = 'correct_fix';
    }
    var wrongPhrase = activeItem.wrong || '';
    var correctAnswer = (result && result.correctAnswer) || activeItem.answer || '';
    var userAnswer = result && result.userAnswer;
    var tappedPhrase = (result && result.tappedPhrase) || '';
    var remaining = result && result.errorsRemaining;
    var total = (result && result.errorsTotal) ||
      (p.counter && p.counter.target) || p.errorCount || (p.items && p.items.length) || 0;
    var sections = [];

    if (huntPhase === 'wrong_tap') {
      sections.push({
        key: 'commonMistake',
        text: huntWrongTapNote(content, tappedPhrase, wrongPhrase)
      });
      if (content) {
        if (content.whyCorrect) {
          sections.push(whyCorrectSection(content.whyCorrect, true));
        }
        var tapFocus = pickFocusSection(content);
        if (tapFocus) sections.push(tapFocus);
      }
    } else if (huntPhase === 'mark_success') {
      if (content && content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, false));
      }
      var markFocus = pickFocusSection(content);
      if (markFocus) sections.push(markFocus);
    } else {
      var isWrong = result && result.correct === false;
      sections.push({ key: 'correct', text: String(correctAnswer) });
      if (isWrong && userAnswer) {
        sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      }
      if (content) {
        if (content.whyCorrect) {
          sections.push(whyCorrectSection(content.whyCorrect, isWrong));
        }
        var focus = pickFocusSection(content);
        if (focus) sections.push(focus);
        if (isWrong) {
          var fixNote = lookupWrongOptionNote(content, userAnswer, null);
          if (!fixNote && content.commonMistake) fixNote = content.commonMistake;
          if (fixNote) sections.push({ key: 'commonMistake', text: fixNote });
        }
        var breakdown = content.sentenceBreakdown ||
          buildHuntSentenceBreakdown(p.passage, wrongPhrase, correctAnswer);
        if (breakdown) sections.push({ key: 'sentenceBreakdown', text: breakdown });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'passage_error_hunt_counter',
      context: buildHuntMarkedSnippet(p.passage, wrongPhrase) || buildContext(screen),
      sections: sections
    };
  }

  function getGuidedErrorItem(screen, result) {
    var p = (screen && screen.payload) || {};
    if (result && result.activeItem) return result.activeItem;
    var idx = result && result.guidedItemIdx != null
      ? result.guidedItemIdx
      : ((screen && screen._guidedIdx) || 0);
    return (p.items || [])[idx] || null;
  }

  function buildGuidedErrorChoice(screen, result) {
    var item = getGuidedErrorItem(screen, result) || {};
    var content = item.explanationContent || null;
    var wrongForm = item.wrong || item.targetPhrase || '';
    var correctAnswer = (result && result.correctAnswer) || item.answer || '';
    var userAnswer = result && result.userAnswer;
    var options = item.options || [];
    var isWrong = result && result.correct === false && userAnswer;
    var sections = [];

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      appendChoiceTeachingSections(sections, content, isWrong, userAnswer, options, correctAnswer);
      if (isWrong && wrongForm && !sections.some(function(s) { return s.key === 'optionContrast'; })) {
        sections.splice(2, 0, {
          key: 'optionContrast',
          text: formatOptionContrastLine(
            userAnswer,
            correctAnswer,
            'it does not replace the highlighted error *' + wrongForm + '*'
          )
        });
      }
    } else if (item.explanation) {
      sections.push(whyCorrectSection(item.explanation, isWrong));
    }

    return {
      title: 'Explanation',
      formatType: 'guided_error_choice',
      context: wrongForm ? ('Wrong form: ~~' + wrongForm + '~~') : buildContext(screen),
      sections: sections
    };
  }

  function buildConvGapLineBreakdown(lines, activeLineIndex, answer) {
    var line = (lines || [])[activeLineIndex];
    if (!line) return '';
    if (line.mode === 'gap') {
      return ((line.before || '') + (answer || '') + ' ' + (line.after || ''))
        .replace(/\s+/g, ' ')
        .trim();
    }
    return String(line.text || '').trim();
  }

  function buildConversationGapFill(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false && userAnswer;
    var sections = [];

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      if (content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong));
      }
      var focus = pickFocusSection(content);
      if (focus) sections.push(focus);
      if (isWrong) {
        var wrongNote = lookupWrongOptionNote(content, userAnswer, null);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (!wrongNote) {
          wrongNote = '*' + userAnswer + '* does not fit this line — try *' + correctAnswer + '*.';
        }
        if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
      }
      var breakdown = content.sentenceBreakdown ||
        buildConvGapLineBreakdown(p.lines, p.activeLineIndex, correctAnswer);
      if (breakdown) sections.push({ key: 'sentenceBreakdown', text: breakdown });
      if (content.usefulTip) {
        sections.push({ key: 'usefulTip', text: content.usefulTip });
      }
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
      var legacyBreakdown = buildConvGapLineBreakdown(p.lines, p.activeLineIndex, correctAnswer);
      if (legacyBreakdown) sections.push({ key: 'sentenceBreakdown', text: legacyBreakdown });
    }

    return {
      title: 'Explanation',
      formatType: 'conversation_gap_fill',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildCommaPlacement(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || formatCommaCorrectAnswer(p, result);
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false;

    sections.push({ key: 'correct', text: String(correctAnswer) });

    if (isWrong && userAnswer) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      if (content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong));
      }
      if (content.grammarFocus) {
        sections.push({ key: 'grammarFocus', text: content.grammarFocus });
      } else {
        var focus = pickFocusSection(content);
        if (focus) sections.push(focus);
      }
      if (isWrong) {
        var wrongNote = lookupWrongOptionNote(content, userAnswer, null);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
      }
      if (content.sentenceBreakdown) {
        sections.push({ key: 'sentenceBreakdown', text: content.sentenceBreakdown });
      } else if (p.reconstructedSentence && !p.noCommaNeeded) {
        sections.push({ key: 'sentenceBreakdown', text: p.reconstructedSentence });
      } else if (!p.noCommaNeeded && p.answer) {
        sections.push({ key: 'sentenceBreakdown', text: p.answer });
      } else if (p.sentence) {
        sections.push({ key: 'sentenceBreakdown', text: p.sentence });
      }
      if (content.usefulTip) {
        sections.push({ key: 'usefulTip', text: content.usefulTip });
      }
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
      if (p.reconstructedSentence && !p.noCommaNeeded) {
        sections.push({ key: 'sentenceBreakdown', text: p.reconstructedSentence });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'comma_placement',
      context: buildContext(screen),
      sections: sections
    };
  }

  function crosswordSpellingNote(userAnswer, correctAnswer, letterCount) {
    var user = String(userAnswer || '').trim();
    var correct = String(correctAnswer || '').trim();
    if (!user) return '';
    var expectedLen = letterCount != null
      ? letterCount
      : correct.replace(/\s+/g, '').length;
    if (expectedLen && user.replace(/\s+/g, '').length !== expectedLen) {
      return 'Check the letter count — the answer has ' + expectedLen + ' letters.';
    }
    if (user.toLowerCase() === correct.toLowerCase() && user !== correct) {
      return 'The letters are right but check capitalization or spelling of the full word.';
    }
    if (Math.abs(user.length - correct.length) === 1) {
      return 'One letter too many or too few — use the letter count in the clue.';
    }
    return 'Compare your spelling with the definition — one letter may be wrong.';
  }

  function buildCrosswordClues(screen, result) {
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
      if (content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong));
      }
      var focus = pickFocusSection(content);
      if (focus) sections.push(focus);
      if (isWrong) {
        var wrongNote = lookupWrongOptionNote(content, userAnswer, null);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (!wrongNote) wrongNote = crosswordSpellingNote(userAnswer, correctAnswer, p.letterCount);
        if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
      }
      if (content.usefulTip) {
        sections.push({ key: 'usefulTip', text: content.usefulTip });
      }
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
      if (isWrong) {
        sections.push({ key: 'commonMistake', text: crosswordSpellingNote(userAnswer, correctAnswer, p.letterCount) });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'crossword_clues',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildVerbBankTwoStep(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var step1 = isVerbBankStep1(screen, result);
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false && userAnswer;

    if (step1) {
      if (isWrong) {
        sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      }
      if (content) {
        var verbWhy = content.whyVerbFits || content.vocabularyWhy;
        if (verbWhy) {
          sections.push(whyCorrectSection(verbWhy, isWrong));
        }
        if (content.vocabularyFocus) {
          sections.push({ key: 'vocabularyFocus', text: content.vocabularyFocus });
        }
        if (isWrong) {
          var verbWrong = lookupWrongVerbNote(content, userAnswer, p.wordBank);
          if (!verbWrong && content.commonMistakeStep1) verbWrong = content.commonMistakeStep1;
          if (!verbWrong && content.commonMistake) verbWrong = content.commonMistake;
          if (verbWrong) sections.push({ key: 'commonMistake', text: verbWrong });
        }
      } else if (isWrong) {
        sections.push({
          key: 'commonMistake',
          text: (result && result.explanation) || 'That verb does not fit this sentence.'
        });
      }
    } else {
      var correctAnswer = (result && result.correctAnswer) || formatVerbBankAnswer(p);
      sections.push({ key: 'correct', text: String(correctAnswer) });

      if (isWrong) {
        sections.push({ key: 'yourAnswer', text: String(userAnswer) });
      }

      if (content) {
        if (content.grammarFocus) {
          sections.push({ key: 'grammarFocus', text: content.grammarFocus });
        } else if (content.whyCorrect) {
          sections.push(whyCorrectSection(content.whyCorrect, isWrong));
        }
        if (isWrong) {
          var formWrong = lookupWrongOptionNote(content, userAnswer, null);
          if (!formWrong && content.commonMistakeStep2) formWrong = content.commonMistakeStep2;
          if (!formWrong && content.commonMistake) formWrong = content.commonMistake;
          if (formWrong) sections.push({ key: 'commonMistake', text: formWrong });
        }
        if (content.sentenceBreakdown) {
          sections.push({ key: 'sentenceBreakdown', text: content.sentenceBreakdown });
        } else if (p.completedSentence) {
          sections.push({ key: 'sentenceBreakdown', text: p.completedSentence });
        }
        if (content.usefulTip) {
          sections.push({ key: 'usefulTip', text: content.usefulTip });
        }
      } else if (p.explanation) {
        sections.push({ key: 'grammarFocus', text: p.explanation });
        if (p.completedSentence) {
          sections.push({ key: 'sentenceBreakdown', text: p.completedSentence });
        }
      }
    }

    return {
      title: 'Explanation',
      formatType: 'verb_bank_two_step',
      context: buildContext(screen),
      sections: sections
    };
  }

  function getFullSentenceCues(payload) {
    var cues = (payload.prompt && payload.prompt.cues) || [];
    if ((!cues.length || cues.length <= 1) && payload.displayPrompt && /\s\/\s/.test(payload.displayPrompt)) {
      cues = String(payload.displayPrompt).split(/\s*\/\s*/).map(function(s) {
        return s.trim();
      }).filter(Boolean);
    }
    return cues;
  }

  function buildFullSentenceBreakdown(payload, content) {
    if (content && content.sentenceBreakdown) {
      return content.sentenceBreakdown;
    }
    var answer = String((payload.acceptedAnswers && payload.acceptedAnswers[0]) || payload.answer || '').trim();
    var cues = getFullSentenceCues(payload);
    var displayPrompt = String(payload.displayPrompt || '').trim();
    if (cues.length > 1 && /\s\/\s/.test(displayPrompt)) {
      return 'Cues: ' + cues.join(' / ') + ' → ' + answer;
    }
    if (displayPrompt && !/\s\/\s/.test(displayPrompt)) {
      return 'Prompt: ' + displayPrompt.replace(/<s>[^<]*<\/s>/g, '___') + ' → ' + answer;
    }
    return answer;
  }

  function buildFullSentenceWrite(screen, result) {
    var p = screen.payload || {};
    var content = getContent(p);
    var sections = [];
    var correctAnswer = (result && result.correctAnswer) || p.answer || '';
    var userAnswer = result && result.userAnswer;
    var isWrong = result && result.correct === false && userAnswer;
    var standardized = usesMistakeExplanationFormat(content);

    if (!standardized) {
      sections.push({ key: 'correct', text: String(correctAnswer) });
    }

    if (isWrong) {
      sections.push({ key: 'yourAnswer', text: String(userAnswer) });
    }

    if (content) {
      appendTeachingSections(sections, content, isWrong, userAnswer, null);
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
    }

    if (!standardized) {
      var breakdown = buildFullSentenceBreakdown(p, content);
      if (breakdown) {
        sections.push({ key: 'sentenceBreakdown', text: breakdown });
      }
    }

    return {
      title: 'Explanation',
      formatType: 'full_sentence_write',
      context: standardized ? '' : buildContext(screen),
      sections: sections
    };
  }

  function buildWordOrderTiles(screen, result) {
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
      if (content.whyCorrect) {
        sections.push(whyCorrectSection(content.whyCorrect, isWrong));
      }
      var focus = pickFocusSection(content);
      if (focus) sections.push(focus);
      if (isWrong) {
        var wrongNote = lookupWrongOptionNote(content, userAnswer, p.tiles);
        if (!wrongNote && content.commonMistake) wrongNote = content.commonMistake;
        if (wrongNote) sections.push({ key: 'commonMistake', text: wrongNote });
      }
    } else if (p.explanation) {
      sections.push(whyCorrectSection(p.explanation, isWrong));
    }

    return {
      title: 'Explanation',
      formatType: 'word_order_tiles',
      context: buildContext(screen),
      sections: sections
    };
  }

  function buildLegacy(screen, result) {
    var p = (screen && screen.payload) || {};
    var text = (result && result.explanation) || p.explanation || '';
    if (!text) return null;
    var isWrong = result && result.correct === false;
    return {
      title: 'Explanation',
      formatType: screen && screen.formatType,
      context: buildContext(screen),
      sections: [
        { key: 'correct', text: (result && result.correctAnswer) || '' },
        whyCorrectSection(text, isWrong)
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
    if (screen.formatType === 'synced_gap_fill') {
      return (p.sentences || []).map(function(sentence) {
        return gapSentenceDisplay(sentence);
      }).join('\n');
    }
    if (screen.formatType === 'passage_gap_fill') {
      return String(p.passage || p.instruction || '').trim();
    }
    if (screen.formatType === 'keyword_transformation') {
      var kwtPrompt = String(p.promptSentence || '').trim();
      var kwtKeyword = String(p.keyword || '').trim();
      var kwtTarget = gapSentenceDisplay(p.targetSentence || '');
      var kwtLines = [];
      if (kwtPrompt) kwtLines.push(kwtPrompt);
      if (kwtKeyword) kwtLines.push('Keyword: ' + kwtKeyword);
      if (kwtTarget) kwtLines.push(kwtTarget);
      return kwtLines.join('\n');
    }
    if (screen.formatType === 'error_correction') {
      return gapSentenceDisplay(p.sentence || '');
    }
    if (screen.formatType === 'find_extra_word') {
      return gapSentenceDisplay(p.sentence || '');
    }
    if (screen.formatType === 'word_order_tiles') {
      return String(p.contextQuestion || p.prompt || p.instruction || '').trim();
    }
    if (screen.formatType === 'full_sentence_write') {
      var fswPrompt = String(p.displayPrompt || '').trim();
      if (fswPrompt) return fswPrompt;
      var fswCues = getFullSentenceCues(p);
      if (fswCues.length) return fswCues.join(' / ');
      return '';
    }
    if (screen.formatType === 'verb_bank_two_step') {
      return gapSentenceDisplay(p.sentence || p.blankSentence || '');
    }
    if (screen.formatType === 'crossword_clues') {
      var cwClue = cleanCrosswordClue(p.clue || '');
      if (p.clueNumber != null && cwClue) return String(p.clueNumber) + '. ' + cwClue;
      return cwClue;
    }
    if (screen.formatType === 'comma_placement') {
      return String(p.sentence || '').trim();
    }
    if (screen.formatType === 'word_bank_tick') {
      return String(p.instruction || '').trim();
    }
    if (screen.formatType === 'stative_sorting') {
      return String(p.prompt || p.instruction || '').trim();
    }
    if (screen.formatType === 'passage_error_hunt_single') {
      return String(p.passage || p.instruction || '').trim();
    }
    if (screen.formatType === 'passage_error_hunt_counter') {
      return String(p.passage || p.instruction || '').trim();
    }
    if (screen.formatType === 'guided_error_choice') {
      var guidedItem = getGuidedErrorItem(screen, null);
      var wrongForm = guidedItem && (guidedItem.wrong || guidedItem.targetPhrase);
      if (wrongForm) return 'Wrong form: ~~' + wrongForm + '~~';
      return String(p.instruction || '').trim();
    }
    if (screen.formatType === 'conversation_gap_fill') {
      var title = String(p.conversationTitle || '').trim();
      var activeLine = null;
      var lines = p.lines || [];
      var activeIdx = p.activeLineIndex != null ? p.activeLineIndex : -1;
      for (var li = 0; li < lines.length; li++) {
        if (lines[li].isActive || li === activeIdx) {
          activeLine = lines[li];
          break;
        }
      }
      if (activeLine && activeLine.mode === 'gap') {
        var gapLine = ((activeLine.before || '') + ' ___ ' + (activeLine.after || ''))
          .replace(/\s+/g, ' ')
          .trim();
        return title ? (title + '\n' + gapLine) : gapLine;
      }
      return title || String(p.instruction || '').trim();
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
      case 'passage_gap_fill':
        return buildPassageGapFill(screen, result);
      case 'synced_gap_fill':
        return buildSyncedGapFill(screen, result);
      case 'keyword_transformation':
        return buildKeywordTransformation(screen, result);
      case 'error_correction':
        return buildErrorCorrection(screen, result);
      case 'find_extra_word':
        return buildFindExtraWord(screen, result);
      case 'word_order_tiles':
        return buildWordOrderTiles(screen, result);
      case 'full_sentence_write':
        return buildFullSentenceWrite(screen, result);
      case 'verb_bank_two_step':
        return buildVerbBankTwoStep(screen, result);
      case 'crossword_clues':
        return buildCrosswordClues(screen, result);
      case 'comma_placement':
        return buildCommaPlacement(screen, result);
      case 'word_bank_tick':
        return buildWordBankTick(screen, result);
      case 'stative_sorting':
        return buildStativeSorting(screen, result);
      case 'passage_error_hunt_single':
        return buildPassageErrorHuntSingle(screen, result);
      case 'passage_error_hunt_counter':
        return buildPassageErrorHuntCounter(screen, result);
      case 'guided_error_choice':
        return buildGuidedErrorChoice(screen, result);
      case 'conversation_gap_fill':
        return buildConversationGapFill(screen, result);
      default:
        return buildLegacy(screen, result);
    }
  }

  return {
    SECTION_DEFS: SECTION_DEFS,
    hasExplanation: hasExplanation,
    buildExplainOpts: buildExplainOpts,
    buildContext: buildContext,
    getHuntExerciseTip: getHuntExerciseTip,
    buildHuntSentenceBreakdown: buildHuntSentenceBreakdown,
    buildHuntMarkedSnippet: buildHuntMarkedSnippet
  };
})();
