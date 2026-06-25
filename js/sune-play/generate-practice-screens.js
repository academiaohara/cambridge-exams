// js/sune-play/generate-practice-screens.js
// Generates playable screens from unit content banks and practice node config

(function() {
  'use strict';

  var GAP_RE = /(?:\.{3,}|…{2,}|_{3,})/;

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

  function shuffleCopy(list) {
    return list.slice().sort(function() { return Math.random() - 0.5; });
  }

  function buildScreenId(nodeId, exerciseId, itemId, formatType) {
    return [nodeId, exerciseId, itemId, formatType].filter(Boolean).join('__');
  }

  function itemToPayload(formatType, item, exercise, genRule) {
    switch (formatType) {
      case 'two_option_choice':
        return {
          sentenceBefore: item.sentenceBefore || '',
          sentenceAfter: item.sentenceAfter || '',
          options: item.options || [],
          answer: item.answer,
          completedSentence: item.completedSentence || '',
          explanation: item.explanation || ''
        };

      case 'free_text_gap_fill':
        return {
          sentence: item.sentence || '',
          verbPrompt: item.verbPrompt || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          explanation: item.explanation || '',
          completedSentence: (item.sentence || '').replace(GAP_RE, item.answer || ''),
          instruction: exercise.instructions || ''
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

      case 'conjugation_gap_fill':
        return {
          sentence: item.blankSentence || item.sentence || '',
          verbPrompt: item.verbPrompt || '',
          answer: item.answer,
          acceptedAnswers: item.acceptedAnswers || (item.answer ? [item.answer] : []),
          explanation: item.explanation || '',
          completedSentence: (item.sentence || '').replace(GAP_RE, item.answer || ''),
          instruction: exercise.instructions || exercise.studentInstruction || ''
        };

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
        return {
          prompt: item.prompt || genRule.prompt || 'What does this sentence mean?',
          sentence: item.sentence || genRule.sentence || '',
          options: item.options || genRule.options || [],
          answer: item.answer || genRule.answer,
          explanation: item.explanation || genRule.explanation || ''
        };

      case 'preselected_verb_gap_fill':
        return {
          sentence: item.sentence || '',
          preselectedVerb: item.baseVerb || item.preselectedVerb,
          answer: Array.isArray(item.answer) ? item.answer[0] : item.answer,
          acceptedAnswers: item.acceptedAnswers,
          explanation: item.explanation || '',
          instruction: exercise.instructions || ''
        };

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
      screens.push(buildScreen(unit, node, formatType, custom, {
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

      (rule.sourceItemIds || []).forEach(function(itemId) {
        var item = findItem(exercise, itemId);
        if (!item) {
          warn('Item not found: ' + itemId + ' in exercise ' + exerciseId);
          return;
        }

        var formatType = rule.formatType;
        var payload = itemToPayload(formatType, item, exercise, rule);
        var screenId = buildScreenId(nodeId, exerciseId, itemId, formatType);

        screens.push(buildScreen(unit, node, formatType, payload, {
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

  window.SunePlayScreens = {
    generatePracticeScreens: generatePracticeScreens,
    getExerciseBank: getExerciseBank,
    normalizeFormatType: normalizeFormatType
  };
})();
