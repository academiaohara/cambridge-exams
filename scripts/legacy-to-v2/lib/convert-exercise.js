import {
  makeItemId,
  splitAnswerVariants,
  parseTwoOptionFromBold,
  parseGapSlashChoice,
  parseMcStandaloneItem,
  parseKeywordTransformationItem,
  parseSyncSentences,
  extractBold,
  extractLetterCountFromClue,
  stripBold,
  flattenExerciseItems,
  parseInlineAbChoice,
  slugify
} from './utils.js';
import { detectLegacyFormat } from './detect-format.js';

function buildCrosswordItems(exercise, unitPrefix, exerciseKey) {
  var items = [];
  var idx = 0;
  ['across', 'down'].forEach(function(direction) {
    (exercise[direction] || []).forEach(function(clue) {
      var letterCount = extractLetterCountFromClue(clue.clue) ||
        String(clue.answer || '').replace(/\s+/g, '').length;
      items.push({
        id: makeItemId(unitPrefix, exerciseKey, idx),
        direction: direction,
        clueNumber: clue.num,
        clue: clue.clue,
        answer: clue.answer,
        acceptedAnswers: [clue.answer],
        letterCount: letterCount,
        formatType: 'crossword_clues'
      });
      idx++;
    });
  });
  return items;
}

function buildPassageAnswers(exercise) {
  if (exercise.answers && exercise.answers.length) return exercise.answers.slice();
  return (exercise.questions || exercise.items || []).map(function(q) { return q.answer; });
}

function convertItem(exercise, item, index, unitPrefix, exerciseKey, detection) {
  var id = makeItemId(unitPrefix, exerciseKey, index);
  var base = { id: id, formatType: detection.formatType };

  switch (detection.formatType) {
    case 'two_option_choice': {
      if (detection.legacyPattern === 'phrasal-particle') {
        var gapChoice = parseGapSlashChoice(item.sentence, item.answer);
        if (gapChoice) return Object.assign(base, gapChoice);
      }
      if (detection.legacyPattern === 'same-meaning-ab') {
        return Object.assign(base, {
          context: item.context || '',
          sentenceBefore: item.context || '',
          sentenceAfter: '',
          options: [
            'A: ' + String(item.sentenceA || '').trim(),
            'B: ' + String(item.sentenceB || '').trim()
          ],
          answer: String(item.answer || '').trim().toUpperCase(),
          originalSentence: item.context || ''
        });
      }
      if (detection.legacyPattern === 'inline-ab-choice') {
        var inline = parseInlineAbChoice(item.sentence, item.answer);
        if (inline) return Object.assign(base, inline);
      }
      if (detection.legacyPattern === 'yn' || detection.legacyPattern === 'yn-inline') {
        return Object.assign(base, {
          sentenceBefore: stripBold(item.sentence || ''),
          sentenceAfter: '',
          options: ['YES', 'NO'],
          answer: String(item.answer || '').trim().toUpperCase(),
          originalSentence: item.sentence || ''
        });
      }
      var parsed = parseTwoOptionFromBold(item.sentence, item.answer);
      if (!parsed) {
        return Object.assign(base, {
          sentence: item.sentence || '',
          options: splitAnswerVariants(item.answer),
          answer: item.answer
        });
      }
      return Object.assign(base, parsed);
    }

    case 'mc_4_option': {
      var mc = parseMcStandaloneItem(item);
      return Object.assign(base, mc, {
        explanation: item.explanation || ''
      });
    }

    case 'conjugation_gap_fill':
    case 'free_text_gap_fill': {
      var answer = String(item.answer || '').trim();
      var variants = splitAnswerVariants(answer);
      var converted = {
        sentence: item.sentence || '',
        answer: variants[0] || answer,
        acceptedAnswers: variants.length > 1 ? variants : [answer],
        explanation: item.explanation || ''
      };
      if (/\([^)]+\)/.test(item.sentence || '')) {
        var verbMatch = item.sentence.match(/\(([^)]+)\)\s*$/);
        if (verbMatch) converted.verbPrompt = verbMatch[1].replace(/\s*\/\s*/g, ' / ');
      }
      return Object.assign(base, converted);
    }

    case 'full_sentence_write':
      return Object.assign(base, {
        displayPrompt: item.sentence || '',
        prompt: { cues: String(item.sentence || '').split(/\s*\/\s*/) },
        answer: item.answer,
        acceptedAnswers: [item.answer]
      });

    case 'error_correction': {
      var wrongWord = extractBold(item.sentence || '');
      return Object.assign(base, {
        sentence: stripBold(item.sentence || ''),
        highlightedText: wrongWord,
        answer: item.answer,
        acceptedAnswers: splitAnswerVariants(item.answer)
      });
    }

    case 'keyword_transformation': {
      var kwt = parseKeywordTransformationItem(item);
      return Object.assign(base, Object.assign(kwt, {
        acceptedAnswers: [kwt.answer],
        minWords: 2,
        maxWords: detection.legacyPattern === 'kwtrans' ? 8 : 5,
        wordCountRule: 'whitespace_tokens_apostrophe_single_word'
      }));
    }

    case 'synced_gap_fill': {
      var sentences = parseSyncSentences(item);
      return Object.assign(base, {
        sentences: sentences,
        answer: item.answer,
        acceptedAnswers: [item.answer]
      });
    }

    case 'find_extra_word': {
      return Object.assign(base, {
        sentence: item.sentence || '',
        answer: String(item.answer || '').trim(),
        acceptedAnswers: [String(item.answer || '').trim()]
      });
    }

    case 'comma_placement': {
      return Object.assign(base, {
        sentence: item.sentence || '',
        answer: item.answer,
        acceptedAnswers: splitAnswerVariants(item.answer),
        interactionMode: 'rewrite_sentence'
      });
    }

    case 'stative_sorting': {
      return Object.assign(base, {
        groups: item.groups || [],
        verbs: item.verbs || []
      });
    }

    default:
      return Object.assign(base, {
        sentence: item.sentence || '',
        answer: item.answer,
        acceptedAnswers: splitAnswerVariants(item.answer)
      });
  }
}

export function convertLegacyExercise(exercise, exerciseKey, unitPrefix, unitMeta) {
  var detection = detectLegacyFormat(exercise);
  var exerciseId = unitPrefix + '-ex-' + String(exerciseKey).toLowerCase();
  var title = exercise.title || ('Exercise ' + exerciseKey);
  var instructions = exercise.instructions || '';
  var converted = {
    id: exerciseId,
    type: 'exercise',
    exerciseType: detection.formatType,
    exerciseTypeName: title,
    title: title,
    instructions: instructions,
    studentInstruction: exercise.studentInstruction || instructions,
    legacyKey: String(exerciseKey),
    legacyPattern: detection.legacyPattern,
    interaction: {
      formatType: detection.formatType
    }
  };

  if (exercise.words) {
    converted.words = exercise.words.slice();
    converted.wordBank = exercise.words.slice();
  }
  if (exercise.passageTitle) converted.passageTitle = exercise.passageTitle;
  if (exercise.passage) converted.passage = exercise.passage;
  if (exercise.textareaAnswer) converted.textareaAnswer = true;

  if (detection.formatType === 'crossword_clues') {
    converted.items = buildCrosswordItems(exercise, unitPrefix, exerciseKey);
    converted.interaction.layoutMode = 'clue_list';
    return { exercise: converted, detection: detection };
  }

  if (detection.formatType === 'word_bank_tick') {
    converted.exerciseType = 'word_bank_tick';
    converted.answer = exercise.answer;
    converted.words = exercise.words || [];
    converted.interaction.screenMode = 'all_words_single_screen';
    return { exercise: converted, detection: detection };
  }

  if (detection.formatType === 'stative_sorting' && detection.legacyPattern === 'drag-category') {
    var categories = exercise.categories || [];
    var words = exercise.words || [];
    var answers = exercise.answers || {};
    var groups = categories.map(function(cat) {
      return {
        groupId: slugify(cat),
        label: cat,
        answers: words.filter(function(w) { return answers[w] === cat; })
      };
    });
    converted.items = [{
      id: makeItemId(unitPrefix, exerciseKey, 0),
      formatType: 'stative_sorting',
      groups: groups,
      verbs: words.map(function(w) { return { verb: w, groupId: slugify(answers[w]) }; })
    }];
    return { exercise: converted, detection: detection };
  }

  if (detection.screenMode === 'single_passage_with_gaps') {
    converted.exerciseType = 'passage_gap_fill';
    converted.formatType = 'passage_gap_fill';
    converted.answers = buildPassageAnswers(exercise);
    converted.interaction.formatType = 'passage_gap_fill';
    converted.interaction.sequentialGaps = detection.legacyPattern === 'passage-input';
    converted.interaction.gapInputStyle = detection.legacyPattern === 'passage-input' ? 'underline_expand' : 'pill';
    if (detection.legacyPattern === 'passage-input') {
      converted.interaction.requireWordBankAssignment = false;
    }
    if (exercise.gapVerbs) converted.gapVerbs = exercise.gapVerbs;
    return { exercise: converted, detection: detection };
  }

  if (detection.screenMode === 'all_pairs_single_screen') {
    converted.items = flattenExerciseItems(exercise).map(function(item, index) {
      return convertItem(exercise, item, index, unitPrefix, exerciseKey, detection);
    });
    return { exercise: converted, detection: detection };
  }

  if (detection.screenMode === 'all_gaps_single_screen') {
    converted.items = flattenExerciseItems(exercise).map(function(item, index) {
      return convertItem(exercise, item, index, unitPrefix, exerciseKey, detection);
    });
    converted.interaction.displayMode = 'passage';
    converted.interaction.continuous = !!exercise.continuous;
    return { exercise: converted, detection: detection };
  }

  var sourceItems = flattenExerciseItems(exercise);
  converted.items = sourceItems.map(function(item, index) {
    return convertItem(exercise, item, index, unitPrefix, exerciseKey, detection);
  });

  return { exercise: converted, detection: detection };
}

export function buildScreenGenerationRule(exercise, detection) {
  var rule = {
    sourceExerciseId: exercise.id,
    formatType: detection.formatType
  };

  if (detection.screenMode) {
    rule.screenMode = detection.screenMode;
    return [rule];
  }

  if (detection.formatType === 'crossword_clues') {
    rule.sourceItemIds = (exercise.items || []).map(function(it) { return it.id; });
    return [rule];
  }

  rule.sourceItemIds = (exercise.items || []).map(function(it) { return it.id; });
  return [rule];
}

export function countV2Items(exercise, detection) {
  if (detection.formatType === 'word_bank_tick') return 1;
  if (detection.formatType === 'stative_sorting' && detection.legacyPattern === 'drag-category') {
    return detection.legacyItemCount || 1;
  }
  if (detection.screenMode === 'single_passage_with_gaps') {
    return (exercise.answers || []).length;
  }
  if (detection.formatType === 'crossword_clues') {
    return (exercise.items || []).length;
  }
  return (exercise.items || []).length;
}
