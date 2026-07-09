// js/sune-play/generate-practice-screens.js
// Generates playable screens from unit content banks and practice node config

(function() {
  'use strict';

  var GAP_RE = /(?:\.{3,}|…{2,}|_{3,})/;
  var NUMBERED_CONTEXT_GAP_RE = /\((\d+)\)\s*(?:\.{3,}|…{2,}|_{2,})/g;

  function warn(msg) {
    if (typeof console !== 'undefined' && console.warn) console.warn('[SunePlay] ' + msg);
  }

  function getExerciseBank(unit) {
    var banks = unit.contentBanks || {};
    if (banks.exercises && banks.exercises.length) return banks.exercises;
    if (unit.sections) {
      return unit.sections.filter(function(s) { return s.type === 'exercise'; });
    }
    return [];
  }

  function findExercise(bank, exerciseId) {
    return bank.find(function(ex) {
      return ex.id === exerciseId || ex.exerciseId === exerciseId;
    });
  }

  function findItem(exercise, itemId) {
    return (exercise.items || []).find(function(it) {
      return it.id === itemId;
    });
  }

  function getFormatDef(unit, formatType) {
    var defs = (unit.practiceConfig && unit.practiceConfig.formatDefinitions) || [];
    return defs.find(function(d) { return d.formatType === formatType; }) || {};
  }

  function normalizeFormatType(formatType) {
    switch (formatType) {
      case 'conjugation_gap_fill': return 'free_text_gap_fill';
      case 'word_bank_gap_fill': return 'word_bank_gap_fill';
      case 'marked_error_gap_correction': return 'error_correction';
      case 'verb_tile_conjugation_gap': return 'verb_bank_two_step';
      case 'passage_error_hunt_counter': return 'passage_error_hunt_single';
      default: return formatType;
    }
  }

  function buildCounterHuntPayload(exercise) {
    var items = exercise.items || [];
    return {
      passage: exercise.passage || '',
      items: items.map(function(it) {
        return {
          id: it.id,
          wrong: it.targetPhrase || it.wrong || '',
          answer: it.answer,
          acceptedAnswers: it.acceptedAnswers || (it.answer ? [it.answer] : []),
          explanation: it.explanation || ''
        };
      }),
      errorCount: exercise.errorCount || items.length,
      counter: exercise.counter || { target: items.length },
      hideCorrectInline: exercise.hideCorrectInline !== false,
      instruction: exercise.studentInstruction || exercise.instructions || ''
    };
  }

  function parsePassageStemWords(passage) {
    var stems = {};
    var re = /\((\d+)\)\s*(?:\.{3,}|…{2,}|_{3,})\s*\(([A-Z][A-Z0-9'-]*)\)/g;
    var match;
    while ((match = re.exec(passage)) !== null) {
      stems[parseInt(match[1], 10)] = match[2];
    }
    var c1Re = /…\((\d+)\)…\s*\(([A-Z][A-Z0-9'-]*)\)/g;
    while ((match = c1Re.exec(passage)) !== null) {
      stems[parseInt(match[1], 10)] = match[2];
    }
    return stems;
  }

  function buildPassageGapFillPayload(exercise) {
    var passage = exercise.passage || '';
    var answers = exercise.answers || [];
    var wordBank = exercise.words || exercise.wordBank || [];
    var interaction = exercise.interaction || {};
    var explicitGapVerbs = exercise.gapVerbs || interaction.gapVerbs || [];
    var stemWords = parsePassageStemWords(passage);
    var isWordFormation = exercise.legacyPattern === 'passage-wf' || Object.keys(stemWords).length > 0;
    var sequentialGaps = interaction.sequentialGaps != null
      ? !!interaction.sequentialGaps
      : isWordFormation;
    var requireWordBankAssignment = interaction.requireWordBankAssignment != null
      ? !!interaction.requireWordBankAssignment
      : (sequentialGaps && wordBank.length > 0);
    var requireWordFormation = interaction.requireWordFormation != null
      ? !!interaction.requireWordFormation
      : isWordFormation;
    var passageGapRe = /\((\d+)\)\s*(?:\.{3,}|…{2,}|_{3,})/;
    var firstGapMatch = passageGapRe.exec(passage);
    var startGap = firstGapMatch ? parseInt(firstGapMatch[1], 10) : 1;
    var gaps = answers.map(function(ans, idx) {
      var gapNumber = startGap + idx;
      var stemWord = stemWords[gapNumber] || '';
      return {
        gapId: 'gap' + gapNumber,
        gapNumber: gapNumber,
        expectedAnswer: ans,
        baseVerb: explicitGapVerbs[idx] || stemWord || '',
        stemWord: stemWord
      };
    });
    return {
      passage: passage,
      wordBank: wordBank,
      answers: answers,
      gaps: gaps,
      explanation: exercise.explanation || 'Check each gap against the story context and verb form.',
      instruction: exercise.instructions || exercise.studentInstruction || '',
      sequentialGaps: sequentialGaps,
      requireWordBankAssignment: requireWordBankAssignment,
      requireWordFormation: requireWordFormation,
      gapInputStyle: interaction.gapInputStyle || (sequentialGaps ? 'underline_expand' : 'pill')
    };
  }

  function shuffleCopy(list) {
    return list.slice().sort(function() { return Math.random() - 0.5; });
  }

  function shuffleChoicePayload(payload) {
    if (!payload || !payload.options || payload.options.length < 2) return payload;
    return Object.assign({}, payload, {
      options: shuffleCopy(payload.options)
    });
  }

  var MC_OPTION_LETTER_RE = /^([A-D])\s*(.*)$/i;

  function normalizeMcOption(opt) {
    if (!opt) return { letter: '', text: '' };
    if (typeof opt === 'object' && opt.letter != null) {
      return {
        letter: String(opt.letter).trim().toUpperCase(),
        text: String(opt.text || '').trim()
      };
    }
    var raw = String(opt).trim();
    var match = raw.match(MC_OPTION_LETTER_RE);
    if (match) {
      return { letter: match[1].toUpperCase(), text: match[2].trim() };
    }
    return { letter: '', text: raw };
  }

  function normalizeMcOptions(options) {
    return (options || []).map(normalizeMcOption).filter(function(opt) {
      return opt.letter || opt.text;
    });
  }

  function shuffleMcOptionsPayload(payload) {
    if (!payload || !payload.options || payload.options.length < 2) return payload;
    return Object.assign({}, payload, {
      options: shuffleCopy(payload.options)
    });
  }

  function splitMcPrompt(prompt) {
    var text = String(prompt || '');
    var match = text.match(/^(.*?)(?:\.{3,}|…{2,}|_{3,})(.*)$/);
    if (!match) return { before: text, after: '' };
    return { before: match[1].trim(), after: (match[2] || '').trim() };
  }

  function collectMcPassageGaps(exercise) {
    var gaps = [];
    var gapMap = {};

    if (exercise.gaps && exercise.gaps.length) {
      exercise.gaps.forEach(function(gap) {
        gapMap[gap.gapNumber || gap.num] = gap;
      });
    }

    (exercise.questions || []).forEach(function(q) {
      if (q.gaps && q.gaps.length) {
        q.gaps.forEach(function(gap) {
          gapMap[gap.num || gap.gapNumber] = gap;
        });
        return;
      }
      if (q.options && q.options.length) {
        var numMatch = String(q.sentence || '').match(/\((\d+)\)/);
        var gapNumber = numMatch ? parseInt(numMatch[1], 10) : gaps.length + 1;
        gapMap[gapNumber] = {
          gapNumber: gapNumber,
          options: q.options,
          answer: q.answer
        };
      }
    });

    Object.keys(gapMap).sort(function(a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    }).forEach(function(key) {
      var gap = gapMap[key];
      var gapNumber = parseInt(gap.gapNumber || gap.num || key, 10);
      gaps.push({
        gapId: 'gap' + gapNumber,
        gapNumber: gapNumber,
        options: normalizeMcOptions(gap.options || []),
        answer: String(gap.answer || '').trim().toUpperCase()
      });
    });

    return gaps;
  }

  function buildMcPassageText(exercise, gaps) {
    if (exercise.passage) return exercise.passage;

    var questions = exercise.questions || [];
    if (!questions.length) return '';

    if (exercise.interaction && exercise.interaction.continuous) {
      return questions.map(function(q) { return q.sentence || ''; }).join('\n\n');
    }

    return questions.map(function(q, idx) {
      var sentence = q.sentence || '';
      if (!/\(\d+\)/.test(sentence) && gaps[idx]) {
        return sentence.replace(/(?:\.{3,}|…{2,}|_{3,})/, '(' + gaps[idx].gapNumber + ') ......');
      }
      return sentence;
    }).join('\n\n');
  }

  function buildMc4OptionStandalonePayload(item, exercise) {
    var prompt = item.prompt || item.sentence || '';
    var parts = splitMcPrompt(prompt);
    var options = normalizeMcOptions(item.options || []);
    var answerLetter = String(item.answer || '').trim().toUpperCase();
    var answerOpt = options.find(function(opt) { return opt.letter === answerLetter; });
    return shuffleMcOptionsPayload({
      displayMode: 'standalone',
      prompt: prompt,
      sentenceBefore: item.sentenceBefore != null ? item.sentenceBefore : parts.before,
      sentenceAfter: item.sentenceAfter != null ? item.sentenceAfter : parts.after,
      options: options,
      answer: answerLetter,
      answerText: item.answerText || (answerOpt && answerOpt.text) || '',
      completedSentence: item.completedSentence || '',
      explanation: item.explanation || '',
      instruction: exercise.studentInstruction || exercise.instructions || ''
    });
  }

  function buildMc4OptionPassagePayload(exercise) {
    var gaps = collectMcPassageGaps(exercise);
    return {
      displayMode: 'passage',
      passage: buildMcPassageText(exercise, gaps),
      gaps: gaps,
      explanation: exercise.explanation || '',
      instruction: exercise.studentInstruction || exercise.instructions || '',
      continuous: !!(exercise.interaction && exercise.interaction.continuous)
    };
  }

  function stripBoldMarkers(str) {
    return String(str || '').replace(/\*\*([^*]+)\*\*/g, '$1');
  }

  function tokenizeSentence(sentence) {
    return String(sentence || '').split(/\s+/).filter(Boolean);
  }

  function fewWordCore(token) {
    return String(token || '').replace(/^[^\w\u2019']+|[^\w\u2019']+$/g, '').toLowerCase();
  }

  function buildFindExtraWordPayload(item, exercise) {
    var answer = String(item.answer || '').trim();
    var isOkItem = answer.toUpperCase() === 'OK';
    var onlyMarkedWordClickable = !!(exercise.onlyMarkedWordClickable || item.onlyMarkedWordClickable);

    if (item.tokens && item.tokens.length) {
      return {
        sentence: item.sentence || '',
        tokens: item.tokens,
        answer: answer,
        answerTokenIndex: item.answerTokenIndex != null ? item.answerTokenIndex : -1,
        isCorrectSentence: item.isCorrectSentence != null ? item.isCorrectSentence : isOkItem,
        answerMode: item.answerMode || 'tap_extra_word_or_ok',
        instruction: exercise.studentInstruction || exercise.instructions || '',
        explanation: item.explanation || '',
        onlyMarkedWordClickable: onlyMarkedWordClickable
      };
    }

    var origSentence = item.sentence || '';
    var bracketAnswerIdx = -1;
    var origTokens = origSentence.replace(/\*\*/g, '').split(/\s+/).filter(Boolean);
    for (var bi = 0; bi < origTokens.length; bi++) {
      if (origTokens[bi].indexOf('[') !== -1 && origTokens[bi].indexOf(']') !== -1) {
        bracketAnswerIdx = bi;
        break;
      }
    }

    var displaySentence = stripBoldMarkers(origSentence).replace(/\[([^\]]+)\]/g, '$1');
    var tokens = tokenizeSentence(displaySentence);
    var answerCore = isOkItem ? '' : answer.toLowerCase();
    var answerTokenIndex = -1;
    var tokenPayload = tokens.map(function(token, ti) {
      var isAnswer;
      if (isOkItem) {
        isAnswer = false;
      } else if (bracketAnswerIdx !== -1) {
        isAnswer = ti === bracketAnswerIdx;
      } else {
        isAnswer = fewWordCore(token) === answerCore;
      }
      if (isAnswer) answerTokenIndex = ti;
      var isBracketMarked = bracketAnswerIdx !== -1 && ti === bracketAnswerIdx;
      return {
        text: token,
        index: ti,
        isAnswer: isAnswer,
        clickable: !onlyMarkedWordClickable || isBracketMarked
      };
    });

    return {
      sentence: displaySentence,
      tokens: tokenPayload,
      answer: answer,
      answerTokenIndex: isOkItem ? -1 : answerTokenIndex,
      isCorrectSentence: isOkItem,
      answerMode: 'tap_extra_word_or_ok',
      instruction: exercise.studentInstruction || exercise.instructions || '',
      explanation: item.explanation || '',
      onlyMarkedWordClickable: onlyMarkedWordClickable
    };
  }

  var KWT_GAP_RE = /(?:[.\u2026]{5,}|\u2026{2,}|_{3,})/;

  function isKeywordTransformationItem(item) {
    if (!item) return false;
    if (item.promptSentence && item.targetSentence) return true;
    if (item.keyword || item.keyWord) {
      return String(item.sentence || '').indexOf('\n') !== -1 && KWT_GAP_RE.test(item.sentence || '');
    }
    var sentence = item.sentence || '';
    var nlIdx = sentence.indexOf('\n');
    if (nlIdx === -1 || !KWT_GAP_RE.test(sentence)) return false;
    var sentA = sentence.slice(0, nlIdx);
    var sentB = sentence.slice(nlIdx + 1);
    return /\*\*[^*]+\*\*/.test(sentA) || /\*\*[^*]+\*\*/.test(sentB);
  }

  function parseKeywordTransformationSentence(sentence, explicitKeyword) {
    var raw = String(sentence || '');
    var nlIdx = raw.indexOf('\n');
    var promptSentence = nlIdx !== -1 ? raw.slice(0, nlIdx).trim() : raw.trim();
    var secondPart = nlIdx !== -1 ? raw.slice(nlIdx + 1).trim() : '';
    var keyword = explicitKeyword || '';
    var targetSentence = secondPart;

    var kwMatchA = promptSentence.match(/\s*\*\*([^*]+)\*\*\s*$/);
    if (kwMatchA) {
      keyword = keyword || kwMatchA[1];
      promptSentence = promptSentence.slice(0, kwMatchA.index).trim();
    } else {
      var kwMatchB = secondPart.match(/^\*\*([^*]+)\*\*\s*/);
      if (kwMatchB) {
        keyword = keyword || kwMatchB[1];
        targetSentence = secondPart.slice(kwMatchB[0].length).trim();
      }
    }

    return {
      promptSentence: promptSentence,
      keyword: keyword,
      targetSentence: targetSentence
    };
  }

  function buildKeywordTransformationPayload(item, exercise) {
    exercise = exercise || {};
    if (item.promptSentence && item.targetSentence) {
      return {
        promptSentence: item.promptSentence,
        keyword: item.keyword || item.keyWord || '',
        targetSentence: item.targetSentence,
        answer: item.answer,
        acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
        minWords: item.minWords != null ? item.minWords : 2,
        maxWords: item.maxWords != null ? item.maxWords : 5,
        wordCountRule: item.wordCountRule || 'whitespace_tokens_apostrophe_single_word',
        explanation: item.explanation || '',
        instruction: exercise.studentInstruction || exercise.instructions || ''
      };
    }

    var parsed = parseKeywordTransformationSentence(
      item.sentence || '',
      item.keyword || item.keyWord || ''
    );

    return {
      promptSentence: parsed.promptSentence,
      keyword: parsed.keyword,
      targetSentence: parsed.targetSentence,
      answer: item.answer,
      acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
      minWords: item.minWords != null ? item.minWords : 2,
      maxWords: item.maxWords != null ? item.maxWords : 5,
      wordCountRule: 'whitespace_tokens_apostrophe_single_word',
      explanation: item.explanation || '',
      instruction: exercise.studentInstruction || exercise.instructions || ''
    };
  }

  function getColumnMatchLib() {
    return window.SunePlayColumnMatch || {};
  }

  function buildColumnMatchingPayload(exercise) {
    var cm = getColumnMatchLib();
    var parseMatchSentence = cm.parseMatchSentence || function(sentence, idx) {
      var raw = String(sentence || '').trim();
      var match = raw.match(/^(.*?)\s*\*\*([A-Z])\*\*\s*(.*)?$/);
      if (match) {
        return { leftText: match[1].trim(), markerLetter: match[2].toUpperCase(), endingText: (match[3] || '').trim() };
      }
      return { leftText: raw, markerLetter: String.fromCharCode(65 + idx), endingText: '' };
    };

    var sourceItems = exercise.items || exercise.questions || [];
    var draftPairs = sourceItems.map(function(item, idx) {
      var parsed = parseMatchSentence(item.sentence || '', idx);
      var endingText = parsed.endingText || '';
      var rawAnswer = String(item.answer || '').trim();
      if (!endingText && rawAnswer && !/^[A-H](?:\s*[–\-—]|\s*$)/i.test(rawAnswer)) {
        endingText = rawAnswer;
      }
      var dashMatch = rawAnswer.match(/^([A-H])\s*[–\-—]\s*(.+)$/i);
      if (dashMatch && !parsed.endingText) endingText = dashMatch[2].trim();
      return {
        pairId: idx + 1,
        leftText: parsed.leftText,
        markerLetter: parsed.markerLetter,
        endingText: endingText,
        rawAnswer: rawAnswer,
        hasEmbeddedLetter: !!parsed.hasEmbeddedLetter
      };
    });

    var rightByLetter = {};
    draftPairs.forEach(function(pair) {
      if (!pair.markerLetter) return;
      if (!rightByLetter[pair.markerLetter] && pair.endingText) {
        rightByLetter[pair.markerLetter] = pair.endingText;
      }
    });

    var rightOptions = Object.keys(rightByLetter).sort(function(a, b) {
      return a.localeCompare(b);
    }).map(function(letter) {
      return { letter: letter, endingText: rightByLetter[letter] };
    });

    var endingLetterMap = cm.buildEndingLetterMap
      ? cm.buildEndingLetterMap(rightOptions)
      : {};
    var normalizeAnswer = cm.normalizeColumnMatchAnswer || function(answer, parsed) {
      return { correctLetter: parsed.markerLetter, endingText: parsed.endingText };
    };

    var pairs = draftPairs.map(function(pair) {
      var normalized = normalizeAnswer(pair.rawAnswer, {
        markerLetter: pair.markerLetter,
        endingText: pair.endingText,
        hasEmbeddedLetter: pair.hasEmbeddedLetter
      }, endingLetterMap);
      return {
        pairId: pair.pairId,
        leftText: pair.leftText,
        correctLetter: normalized.correctLetter || pair.markerLetter
      };
    });

    return {
      pairs: pairs,
      rightOptions: rightOptions,
      pairCount: pairs.length,
      answerNormalizationRule: 'column_match_answer_normalization',
      explanation: exercise.explanation || '',
      instruction: exercise.studentInstruction || exercise.instructions || ''
    };
  }

  function buildCrosswordCluePayload(item, exercise) {
    var answer = String(item.answer || '').trim();
    var letterCount = item.letterCount != null
      ? item.letterCount
      : answer.replace(/\s+/g, '').length;
    var clue = item.clue || '';
    if (typeof LearningCrossword !== 'undefined' && LearningCrossword.formatClueDisplay) {
      clue = LearningCrossword.formatClueDisplay(clue);
    }
    return {
      layoutMode: item.layoutMode || 'clue_list',
      clueNumber: item.clueNumber != null ? item.clueNumber : item.num,
      clue: clue,
      answer: answer,
      acceptedAnswers: item.acceptedAnswers || (answer ? [answer] : []),
      letterCount: letterCount,
      explanation: item.explanation || '',
      instruction: exercise.studentInstruction || exercise.instructions || ''
    };
  }

  function isNoCommaAnswer(answer) {
    return /^no commas/i.test(String(answer || '').trim());
  }

  function isCommaBoundaryAllowed(leftToken, rightToken) {
    var left = String(leftToken || '').trim();
    var right = String(rightToken || '').trim();
    if (!left || !right) return false;
    if (/[.,]$/.test(left)) return false;
    if (/^[.,]/.test(right)) return false;
    return true;
  }

  function parseCommaAfterTokenIndexes(sentence, answer) {
    var ans = String(answer || '').trim();
    if (!ans || isNoCommaAnswer(ans)) return [];

    var baseTokens = String(sentence || '').trim().split(/\s+/).filter(Boolean);
    var ansTokensRaw = ans.split(/\s+/).filter(Boolean);
    if (!baseTokens.length || baseTokens.length !== ansTokensRaw.length) return [];

    function normalizeToken(tok) {
      return String(tok || '').toLowerCase().replace(/,+$/, '');
    }

    var ansTokens = [];
    var commaAfter = [];
    for (var i = 0; i < ansTokensRaw.length; i++) {
      var tok = ansTokensRaw[i];
      commaAfter.push(/,+$/.test(tok));
      ansTokens.push(tok.replace(/,+$/, ''));
      if (normalizeToken(baseTokens[i]) !== normalizeToken(ansTokens[i])) return [];
    }

    var slots = [];
    for (var k = 0; k < baseTokens.length - 1; k++) {
      if (!commaAfter[k]) continue;
      if (isCommaBoundaryAllowed(baseTokens[k], baseTokens[k + 1])) slots.push(k);
    }
    return slots;
  }

  function buildCommaRewriteAcceptedAnswers(sentence, answer, noCommaNeeded) {
    if (noCommaNeeded) {
      return ['No commas', 'no commas', sentence];
    }
    return answer ? [answer] : [];
  }

  function parseWordBankTickAnswers(answer) {
    if (Array.isArray(answer)) {
      return answer.map(function(w) { return String(w).trim(); }).filter(Boolean);
    }
    return String(answer || '').split(/,\s*/).map(function(w) { return w.trim(); }).filter(Boolean);
  }

  function buildWordBankTickPayload(exercise) {
    var words = exercise.words || [];
    var answerWords = exercise.answerWords || parseWordBankTickAnswers(exercise.answer);
    return {
      words: words.map(function(word, index) {
        return { text: word, index: index };
      }),
      answerWords: answerWords,
      validation: {
        caseInsensitive: true,
        orderInsensitive: true
      },
      instruction: exercise.studentInstruction || exercise.instructions || '',
      explanation: exercise.explanation || ''
    };
  }

  function buildCommaPlacementPayload(item, exercise) {
    var sentence = String(item.sentence || '').trim();
    var answer = String(item.answer || '').trim();
    var interaction = exercise.interaction || {};
    var mode = item.interactionMode || item.commaMode ||
      interaction.commaPlacementMode || interaction.mode || 'tap_comma_slots';
    var tokens = tokenizeSentence(sentence);
    var tokenPayload = tokens.map(function(token, index) {
      return { text: token, index: index };
    });
    var slots = [];
    for (var i = 0; i < tokens.length - 1; i++) {
      if (isCommaBoundaryAllowed(tokens[i], tokens[i + 1])) {
        slots.push({ slotIndex: i, afterTokenIndex: i });
      }
    }
    var noCommaNeeded = item.noCommaNeeded != null ? !!item.noCommaNeeded : isNoCommaAnswer(answer);
    var commaAfterTokenIndexes = item.commaAfterTokenIndexes ||
      parseCommaAfterTokenIndexes(sentence, answer);

    var payload = {
      interactionMode: mode,
      sentence: sentence,
      tokens: tokenPayload,
      slots: slots,
      commaAfterTokenIndexes: commaAfterTokenIndexes,
      noCommaNeeded: noCommaNeeded,
      instruction: exercise.studentInstruction || exercise.instructions || '',
      explanation: item.explanation || ''
    };

    if (mode === 'rewrite_sentence') {
      payload.reconstructedSentence = noCommaNeeded ? sentence : answer;
      payload.acceptedAnswers = item.acceptedAnswers ||
        buildCommaRewriteAcceptedAnswers(sentence, answer, noCommaNeeded);
    }

    return payload;
  }

  function buildSyncedGapFillPayload(item, exercise) {
    var sentences = item.sentences || [];
    if (!sentences.length && item.sentence) {
      sentences = String(item.sentence).split('\n').filter(Boolean);
    }
    var answer = item.answer;
    return {
      sentences: sentences,
      answer: answer,
      acceptedAnswers: item.acceptedAnswers || (answer ? [answer] : []),
      syncUiMode: 'master_with_previews',
      explanation: item.explanation || '',
      instruction: exercise.studentInstruction || exercise.instructions || ''
    };
  }

  function buildScreenId(nodeId, exerciseId, itemId, formatType) {
    return [nodeId, exerciseId, itemId, formatType].filter(Boolean).join('__');
  }

  /**
   * Legacy helper for passage items that intentionally show one active blank
   * while hiding sibling numbered gaps. Only applies when explicitly requested
   * via passageContextMode on the item.
   */
  function prepareSinglePassageGapSentence(sentence, item) {
    if (!item || item.passageContextMode !== 'single_gap_from_passage') {
      return sentence;
    }
    return String(sentence || '')
      .replace(NUMBERED_CONTEXT_GAP_RE, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.!?])/g, '$1')
      .trim();
  }

  function itemToPayload(formatType, item, exercise, genRule) {
    switch (formatType) {
      case 'two_option_choice':
        return shuffleChoicePayload({
          sentenceBefore: item.sentenceBefore || '',
          sentenceAfter: item.sentenceAfter || '',
          options: item.options || [],
          answer: item.answer,
          completedSentence: item.completedSentence || '',
          explanation: item.explanation || ''
        });

      case 'free_text_gap_fill':
      case 'word_bank_gap_fill':
        return {
          sentence: item.sentence || '',
          verbPrompt: item.verbPrompt || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          explanation: item.explanation || '',
          completedSentence: (item.sentence || '').replace(GAP_RE, item.answer || ''),
          instruction: exercise.instructions || '',
          wordBank: exercise.words || exercise.wordBank || item.wordBank || []
        };

      case 'full_sentence_write':
        return {
          displayPrompt: item.displayPrompt || '',
          prompt: item.prompt || {},
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          explanation: item.explanation || ''
        };

      case 'word_order_tiles': {
        var ans = item.answer || (item.acceptedAnswers && item.acceptedAnswers[0]) || '';
        var tiles = item.tiles && item.tiles.length
          ? shuffleCopy(item.tiles)
          : shuffleCopy(String(ans).replace(/\s*\.\s*$/, '').split(/\s+/).filter(Boolean));
        var topPrompt = item.topPrompt || {};
        var visualPrompt = item.visualPrompt || {};
        var imageUrl = topPrompt.visualAssetUrl
          || visualPrompt.assetUrl
          || '';
        var altText = visualPrompt.altText || '';
        var contextQuestion = item.contextQuestion
          || topPrompt.contextQuestion
          || '';
        return {
          prompt: item.displayPrompt || item.sentence || 'Build the sentence.',
          instruction: exercise.instructions || exercise.studentInstruction || '',
          tiles: tiles,
          answer: ans,
          acceptedAnswers: item.acceptedAnswers || [ans],
          explanation: item.explanation || '',
          answerTiles: item.answerTiles || null,
          tileValidation: item.tileValidation || null,
          contextQuestion: contextQuestion,
          imageUrl: imageUrl,
          imageAlt: altText
        };
      }

      case 'error_correction':
        return {
          sentence: item.sentence || '',
          highlightedText: item.highlightedText || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          explanation: item.explanation || ''
        };

      case 'verb_bank_two_step':
        return {
          sentence: item.sentence || '',
          baseVerb: item.baseVerb || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers,
          completedSentence: item.completedSentence || '',
          explanation: item.explanation || '',
          wordBank: exercise.words || exercise.wordBank || [],
          step: 'choose_verb',
          selectedVerb: item.preselectedVerb || null
        };

      case 'conjugation_gap_fill': {
        var gapSentence = prepareSinglePassageGapSentence(
          item.blankSentence || item.sentence || '',
          item
        );
        return {
          sentence: gapSentence,
          sourceSentence: item.sentence || '',
          verbPrompt: item.verbPrompt || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          gaps: item.gaps || [],
          explanation: item.explanation || '',
          completedSentence: (item.sentence || '').replace(GAP_RE, item.answer || ''),
          instruction: exercise.instructions || exercise.studentInstruction || ''
        };
      }

      case 'marked_error_gap_correction':
        return {
          sentence: item.incorrectSentence || item.sentence || '',
          highlightedText: item.markedError || item.highlightedText || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          explanation: item.explanation || '',
          replacementOnly: item.answerMode === 'typed_replacement_only'
        };

      case 'verb_tile_conjugation_gap':
        return {
          sentence: item.blankSentence || item.sentence || '',
          baseVerb: item.baseVerb || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers,
          completedSentence: item.completedSentence || '',
          explanation: item.explanation || '',
          wordBank: exercise.wordBank || exercise.words || [],
          step: item.preselectedVerb || item.selectedTileAnswer ? 'type_form' : 'choose_verb',
          selectedVerb: item.preselectedVerb || item.selectedTileAnswer || null
        };

      case 'passage_error_hunt_counter':
      case 'passage_error_hunt_single':
        return {
          passage: exercise.passage || '',
          wrong: item.targetPhrase || item.wrong || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          explanation: item.explanation || '',
          itemId: item.id,
          allErrors: (exercise.items || []).map(function(it) {
            return { id: it.id, wrong: it.targetPhrase || it.wrong, fixed: false };
          }),
          hideCorrectInline: exercise.hideCorrectInline !== false
        };

      case 'stative_sorting':
        return {
          prompt: item.prompt || genRule.prompt || 'Sort the verbs.',
          groups: item.groups || genRule.groups || [],
          verbs: item.verbs || flattenSortVerbs(item.groups || genRule.groups || [])
        };

      case 'meaning_contrast':
        return shuffleChoicePayload({
          prompt: item.prompt || genRule.prompt || 'What does this sentence mean?',
          sentence: item.sentence || genRule.sentence || '',
          options: item.options || genRule.options || [],
          answer: item.answer || genRule.answer,
          explanation: item.explanation || genRule.explanation || ''
        });

      case 'preselected_verb_gap_fill':
        return {
          sentence: item.blankSentence || item.sentence || '',
          preselectedVerb: item.selectedTileAnswer || item.preselectedVerb || item.baseVerb || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers,
          gaps: item.gaps || [],
          explanation: item.explanation || '',
          completedSentence: item.completedSentence || '',
          instruction: exercise.instructions || exercise.studentInstruction || ''
        };

      case 'mc_4_option':
        return buildMc4OptionStandalonePayload(item, exercise);

      case 'find_extra_word':
        return buildFindExtraWordPayload(item, exercise);

      case 'keyword_transformation':
        return buildKeywordTransformationPayload(item, exercise);

      case 'crossword_clues':
        return buildCrosswordCluePayload(item, exercise);

      case 'synced_gap_fill':
        return buildSyncedGapFillPayload(item, exercise);

      case 'comma_placement':
        return buildCommaPlacementPayload(item, exercise);

      default:
        warn('Unknown formatType: ' + formatType);
        return { raw: item };
    }
  }

  function flattenSortVerbs(groups) {
    var out = [];
    groups.forEach(function(g) {
      (g.answers || []).forEach(function(v) { out.push({ verb: v, groupId: g.groupId }); });
    });
    return out.sort(function() { return Math.random() - 0.5; });
  }

  function buildScreen(unit, node, formatType, payload, meta) {
    meta = meta || {};
    var normalizedType = meta.formatTypeOverride || normalizeFormatType(formatType);
    var formatDef = getFormatDef(unit, formatType) || getFormatDef(unit, normalizedType);
    return {
      screenId: meta.screenId,
      nodeId: node.nodeId,
      formatType: normalizedType,
      sourceFormatType: formatType,
      itemId: meta.itemId || meta.screenId,
      sourceExerciseId: meta.sourceExerciseId,
      payload: payload,
      fallbackFormatType: meta.fallbackFormatType || formatDef.fallbackFormatType,
      maxLifeLossPerScreen: meta.maxLifeLossPerScreen != null
        ? meta.maxLifeLossPerScreen
        : (formatDef.maxLifeLossPerScreen != null ? formatDef.maxLifeLossPerScreen : 1),
      attemptsPerScreen: meta.attemptsPerScreen != null
        ? meta.attemptsPerScreen
        : (formatDef.attemptsPerScreen != null ? formatDef.attemptsPerScreen : 1),
      lives: node.lives,
      _attemptsUsed: 0,
      _isCustom: !!meta.isCustom
    };
  }

  function generatePracticeScreens(unit, nodeId) {
    if (!unit || !nodeId) return [];

    var nodes = unit.practiceNodes || [];
    var node = nodes.find(function(n) { return n.nodeId === nodeId; });
    if (!node) {
      warn('Practice node not found: ' + nodeId);
      return [];
    }

    var bank = getExerciseBank(unit);
    var screens = [];

    (node.customScreens || []).forEach(function(custom) {
      var formatType = custom.formatType;
      var payload = (formatType === 'two_option_choice' || formatType === 'meaning_contrast')
        ? shuffleChoicePayload(custom)
        : custom;
      screens.push(buildScreen(unit, node, formatType, payload, {
        screenId: custom.screenId,
        itemId: custom.screenId,
        isCustom: true,
        maxLifeLossPerScreen: custom.maxLifeLossPerScreen,
        attemptsPerScreen: custom.attemptsPerScreen
      }));
    });

    (node.screenGeneration || []).forEach(function(rule) {
      var exerciseId = rule.sourceExerciseId;
      var exercise = findExercise(bank, exerciseId);
      if (!exercise) {
        warn('Exercise not found in content bank: ' + exerciseId + ' (node ' + nodeId + ')');
        return;
      }

      if (rule.screenMode === 'single_passage_with_counter') {
        var counterFormat = rule.formatType || 'passage_error_hunt_counter';
        var counterPayload = buildCounterHuntPayload(exercise);
        var counterScreenId = buildScreenId(nodeId, exerciseId, null, counterFormat);
        screens.push(buildScreen(unit, node, counterFormat, counterPayload, {
          screenId: counterScreenId,
          itemId: exerciseId,
          sourceExerciseId: exerciseId,
          fallbackFormatType: rule.fallbackFormatType,
          formatTypeOverride: 'passage_error_hunt_counter'
        }));
        return;
      }

      if (rule.screenMode === 'single_passage_with_gaps') {
        var passageFormat = rule.formatType || 'passage_gap_fill';
        var passagePayload = buildPassageGapFillPayload(exercise);
        var passageScreenId = buildScreenId(nodeId, exerciseId, null, passageFormat);
        screens.push(buildScreen(unit, node, passageFormat, passagePayload, {
          screenId: passageScreenId,
          itemId: exerciseId,
          sourceExerciseId: exerciseId,
          fallbackFormatType: rule.fallbackFormatType,
          formatTypeOverride: passageFormat,
          maxLifeLossPerScreen: rule.maxLifeLossPerScreen
        }));
        return;
      }

      if (rule.screenMode === 'all_gaps_single_screen') {
        var mcFormat = rule.formatType || 'mc_4_option';
        var mcPayload = buildMc4OptionPassagePayload(exercise);
        var gapCount = (mcPayload.gaps || []).length || 1;
        var mcScreenId = buildScreenId(nodeId, exerciseId, null, mcFormat);
        screens.push(buildScreen(unit, node, mcFormat, mcPayload, {
          screenId: mcScreenId,
          itemId: exerciseId,
          sourceExerciseId: exerciseId,
          fallbackFormatType: rule.fallbackFormatType,
          formatTypeOverride: mcFormat,
          maxLifeLossPerScreen: rule.maxLifeLossPerScreen != null ? rule.maxLifeLossPerScreen : gapCount
        }));
        return;
      }

      if (rule.screenMode === 'all_pairs_single_screen') {
        var cmFormat = rule.formatType || 'column_matching';
        var cmPayload = buildColumnMatchingPayload(exercise);
        var pairCount = cmPayload.pairCount || (cmPayload.pairs || []).length || 1;
        var cmScreenId = buildScreenId(nodeId, exerciseId, null, cmFormat);
        screens.push(buildScreen(unit, node, cmFormat, cmPayload, {
          screenId: cmScreenId,
          itemId: exerciseId,
          sourceExerciseId: exerciseId,
          fallbackFormatType: rule.fallbackFormatType,
          formatTypeOverride: cmFormat,
          maxLifeLossPerScreen: rule.maxLifeLossPerScreen != null ? rule.maxLifeLossPerScreen : pairCount
        }));
        return;
      }

      if (rule.screenMode === 'all_words_single_screen') {
        var wbtFormat = rule.formatType || 'word_bank_tick';
        var wbtPayload = buildWordBankTickPayload(exercise);
        var wbtScreenId = buildScreenId(nodeId, exerciseId, null, wbtFormat);
        screens.push(buildScreen(unit, node, wbtFormat, wbtPayload, {
          screenId: wbtScreenId,
          itemId: exerciseId,
          sourceExerciseId: exerciseId,
          fallbackFormatType: rule.fallbackFormatType,
          formatTypeOverride: wbtFormat
        }));
        return;
      }

      (rule.sourceItemIds || []).forEach(function(itemId) {
        var item = findItem(exercise, itemId);
        if (!item) {
          warn('Item not found: ' + itemId + ' in exercise ' + exerciseId);
          return;
        }

        var formatType = rule.formatType;
        if (formatType === 'free_text_gap_fill' && (exercise.words || exercise.wordBank || []).length) {
          formatType = 'word_bank_gap_fill';
        }
        if (formatType === 'free_text_gap_fill' && isKeywordTransformationItem(item)) {
          formatType = 'keyword_transformation';
        }
        var buildFormatType = formatType;
        if (formatType === 'verb_tile_conjugation_gap' &&
            (item.preselectedVerb || item.selectedTileAnswer || item.baseVerb)) {
          buildFormatType = 'preselected_verb_gap_fill';
        }
        var payload = itemToPayload(buildFormatType, item, exercise, rule);
        var screenId = buildScreenId(nodeId, exerciseId, itemId, buildFormatType);

        screens.push(buildScreen(unit, node, buildFormatType, payload, {
          screenId: screenId,
          itemId: itemId,
          sourceExerciseId: exerciseId,
          fallbackFormatType: rule.fallbackFormatType
        }));
      });
    });

    var maxScreens = (unit.queueBehaviour && unit.queueBehaviour.maxScreensPerNode) || screens.length;
    return screens.slice(0, maxScreens);
  }

  function exerciseItemOrderKey(screen) {
    var id = screen && screen.itemId ? String(screen.itemId) : '';
    var match = id.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // When opening a single exercise from the course menu, items may be spread
  // across several practice nodes — gather every screen for that exercise.
  function collectScreensForExercise(unit, exerciseId) {
    if (!unit || !exerciseId) return [];
    var seen = {};
    var list = [];
    (unit.practiceNodes || []).forEach(function(node) {
      generatePracticeScreens(unit, node.nodeId).forEach(function(screen) {
        if (screen.sourceExerciseId !== exerciseId) return;
        var key = screen.itemId || screen.screenId;
        if (!key || seen[key]) return;
        seen[key] = true;
        list.push(screen);
      });
    });
    list.sort(function(a, b) {
      return exerciseItemOrderKey(a) - exerciseItemOrderKey(b);
    });
    return list;
  }

  window.SunePlayScreens = {
    generatePracticeScreens: generatePracticeScreens,
    collectScreensForExercise: collectScreensForExercise,
    getExerciseBank: getExerciseBank,
    normalizeFormatType: normalizeFormatType,
    normalizeMcOptions: normalizeMcOptions,
    buildMc4OptionPassagePayload: buildMc4OptionPassagePayload,
    buildFindExtraWordPayload: buildFindExtraWordPayload,
    buildKeywordTransformationPayload: buildKeywordTransformationPayload,
    isKeywordTransformationItem: isKeywordTransformationItem,
    parseKeywordTransformationSentence: parseKeywordTransformationSentence,
    buildColumnMatchingPayload: buildColumnMatchingPayload,
    buildCrosswordCluePayload: buildCrosswordCluePayload,
    buildSyncedGapFillPayload: buildSyncedGapFillPayload,
    buildCommaPlacementPayload: buildCommaPlacementPayload,
    parseCommaAfterTokenIndexes: parseCommaAfterTokenIndexes,
    buildWordBankTickPayload: buildWordBankTickPayload
  };
})();
