import { slugify } from './utils.js';
import { convertTheory, extractLegacyExercises } from './convert-theory.js';
import {
  convertLegacyExercise,
  buildScreenGenerationRule,
  countV2Items
} from './convert-exercise.js';
import { countLegacyItems } from './utils.js';
import { detectLegacyFormat } from './detect-format.js';

const FORMAT_DEFINITIONS = {
  two_option_choice: {
    formatType: 'two_option_choice',
    displayName: 'Choose the correct option',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'choice_cards',
      studentAction: 'tap_one_option',
      evaluationTrigger: 'on_option_tap',
      optionLayout: 'two_large_buttons'
    }
  },
  conjugation_gap_fill: {
    formatType: 'conjugation_gap_fill',
    displayName: 'Type the conjugation',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_correct_answer_then_continue',
    interaction: {
      component: 'inline_gap_input',
      studentAction: 'type_conjugation',
      evaluationTrigger: 'check_button'
    }
  },
  free_text_gap_fill: {
    formatType: 'free_text_gap_fill',
    displayName: 'Complete the gap',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'inline_gap_input',
      studentAction: 'type_answer',
      evaluationTrigger: 'check_button'
    }
  },
  full_sentence_write: {
    formatType: 'full_sentence_write',
    displayName: 'Write the sentence',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'textarea',
      studentAction: 'write_sentence',
      evaluationTrigger: 'check_button'
    }
  },
  passage_gap_fill: {
    formatType: 'passage_gap_fill',
    displayName: 'Complete the passage',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'passage_inline_gaps',
      studentAction: 'type_gap_answers',
      evaluationTrigger: 'check_button',
      gapInputStyle: 'pill'
    }
  },
  error_correction: {
    formatType: 'error_correction',
    displayName: 'Correct the error',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'inline_correction_input',
      studentAction: 'type_correction',
      evaluationTrigger: 'check_button'
    }
  },
  mc_4_option: {
    formatType: 'mc_4_option',
    displayName: 'Multiple choice',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'option_cards',
      studentAction: 'tap_one_option',
      evaluationTrigger: 'check_button'
    }
  },
  crossword_clues: {
    formatType: 'crossword_clues',
    displayName: 'Crossword clue',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'crossword_letter_boxes',
      studentAction: 'type_letters',
      evaluationTrigger: 'check_button',
      layoutMode: 'clue_list'
    }
  },
  column_matching: {
    formatType: 'column_matching',
    displayName: 'Match columns',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'tap_to_pair',
      studentAction: 'pair_beginnings_endings',
      evaluationTrigger: 'check_button'
    }
  },
  synced_gap_fill: {
    formatType: 'synced_gap_fill',
    displayName: 'One word for three sentences',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'synced_gap_master_previews',
      studentAction: 'type_master_word',
      evaluationTrigger: 'check_button',
      syncUiMode: 'master_with_previews'
    }
  },
  keyword_transformation: {
    formatType: 'keyword_transformation',
    displayName: 'Key word transformation',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'keyword_gap_input',
      studentAction: 'type_transformation',
      evaluationTrigger: 'check_button'
    }
  },
  word_bank_tick: {
    formatType: 'word_bank_tick',
    displayName: 'Select words',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'word_chip_grid',
      studentAction: 'multi_select_toggle',
      evaluationTrigger: 'check_button'
    }
  },
  find_extra_word: {
    formatType: 'find_extra_word',
    displayName: 'Find the extra word',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'clickable_sentence_tokens',
      studentAction: 'tap_extra_word_or_ok',
      evaluationTrigger: 'check_button'
    }
  },
  comma_placement: {
    formatType: 'comma_placement',
    displayName: 'Comma placement',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'comma_placement_dual_mode',
      studentAction: 'tap_comma_slots_or_rewrite_sentence',
      evaluationTrigger: 'check_button'
    }
  },
  stative_sorting: {
    formatType: 'stative_sorting',
    displayName: 'Sort into categories',
    defaultLives: 5,
    maxLifeLossPerScreen: 2,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'drag_sort_groups',
      studentAction: 'sort_into_groups',
      evaluationTrigger: 'check_button'
    }
  },
  word_bank_gap_fill: {
    formatType: 'word_bank_gap_fill',
    displayName: 'Complete with words from the box',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'word_bank_chips_plus_gap_input',
      studentAction: 'tap_word_or_type_answer',
      evaluationTrigger: 'check_button',
      chipLayout: 'wrap_scroll'
    }
  },
  word_order_tiles: {
    formatType: 'word_order_tiles',
    displayName: 'Build the sentence with tiles',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'visual_context_word_tiles_ordering',
      studentAction: 'tap_or_drag_tiles',
      evaluationTrigger: 'check_button'
    }
  },
  verb_bank_two_step: {
    formatType: 'verb_bank_two_step',
    displayName: 'Choose verb and conjugate',
    defaultLives: 5,
    maxLifeLossPerScreen: 2,
    attemptsPerScreen: 1,
    failureAction: 'show_correct_answer_then_continue',
    fallbackFormatType: 'preselected_verb_gap_fill',
    interaction: {
      component: 'verb_bank_tiles_plus_gap_input',
      studentAction: 'tap_base_verb_tile_then_type_conjugation',
      evaluationTrigger: 'check_button'
    }
  },
  passage_error_hunt_single: {
    formatType: 'passage_error_hunt_single',
    displayName: 'Find the error in the passage',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'passage_tap_error',
      studentAction: 'tap_wrong_phrase_in_text',
      evaluationTrigger: 'check_button'
    }
  },
  passage_error_hunt_counter: {
    formatType: 'passage_error_hunt_counter',
    displayName: 'Find all errors in the passage',
    defaultLives: 6,
    maxLifeLossPerScreen: 2,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'passage_tap_error_counter',
      studentAction: 'tap_wrong_phrases_in_text',
      evaluationTrigger: 'check_button'
    }
  },
  guided_error_choice: {
    formatType: 'guided_error_choice',
    displayName: 'Choose the correct form',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'guided_error_options',
      studentAction: 'tap_one_option',
      evaluationTrigger: 'check_button'
    }
  },
  meaning_contrast: {
    formatType: 'meaning_contrast',
    displayName: 'Choose the meaning',
    defaultLives: 4,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_explanation_then_continue',
    interaction: {
      component: 'choice_cards',
      studentAction: 'tap_one_option',
      evaluationTrigger: 'on_option_tap'
    }
  },
  preselected_verb_gap_fill: {
    formatType: 'preselected_verb_gap_fill',
    displayName: 'Type the conjugation',
    defaultLives: 5,
    maxLifeLossPerScreen: 1,
    attemptsPerScreen: 1,
    failureAction: 'show_correct_answer_then_continue',
    interaction: {
      component: 'inline_gap_input',
      studentAction: 'type_conjugation',
      evaluationTrigger: 'check_button'
    }
  }
};

export function buildV2Unit(legacyUnit, options) {
  options = options || {};
  var level = options.level || legacyUnit.unitLevel || 'B1';
  var course = options.course || (level + ' English');
  var block = legacyUnit.block;
  var unitNum = legacyUnit.unit;
  var unitType = legacyUnit.type || 'grammar';
  var unitPrefix = slugify(level) + '-u' + unitNum;
  var pilotTag = options.pilotTag != null ? options.pilotTag : '';

  var legacyExercises = extractLegacyExercises(legacyUnit);
  var convertedExercises = [];
  var screenGeneration = [];
  var coverage = [];
  var formatTypesUsed = {};

  legacyExercises.forEach(function(entry) {
    var result = convertLegacyExercise(entry.data, entry.key, unitPrefix, legacyUnit);
    convertedExercises.push(result.exercise);
    var rules = buildScreenGenerationRule(result.exercise, result.detection);
    screenGeneration = screenGeneration.concat(rules);

    var legacyCount = countLegacyItems(entry.data, result.detection);
    var v2Count = countV2Items(result.exercise, result.detection);
    coverage.push({
      exerciseKey: entry.key,
      title: result.exercise.title,
      legacyPattern: result.detection.legacyPattern,
      formatType: result.detection.formatType,
      screenMode: result.detection.screenMode || 'per_item',
      legacyItems: legacyCount,
      v2Items: v2Count,
      notes: result.detection.notes
    });

    formatTypesUsed[result.detection.formatType] = true;
  });

  var totalScreensEstimate = screenGeneration.reduce(function(sum, rule) {
    if (rule.screenMode === 'single_passage_with_gaps' ||
        rule.screenMode === 'all_pairs_single_screen' ||
        rule.screenMode === 'all_gaps_single_screen' ||
        rule.screenMode === 'all_words_single_screen') {
      return sum + 1;
    }
    return sum + (rule.sourceItemIds || []).length;
  }, 0);

  var formatDefinitions = Object.keys(formatTypesUsed)
    .map(function(ft) { return FORMAT_DEFINITIONS[ft]; })
    .filter(Boolean);

  var theory = convertTheory(legacyUnit, unitPrefix);
  var hasRequiredTheory = theory.completionRule && theory.completionRule.required;

  return {
    unit: {
      schemaVersion: 'sune-english-unit-v2-interactive-formats',
      course: course,
      block: block,
      unit: unitNum,
      type: unitType,
      unitTitle: (pilotTag ? pilotTag + ' ' : '') + (legacyUnit.unitTitle || ('Unit ' + unitNum)),
      unitSubtitle: legacyUnit.unitSubtitle || legacyUnit.title || '',
      unitLevel: level,
      unitFocus: legacyUnit.unitFocus || [legacyUnit.unitTitle || ('Unit ' + unitNum)],
      estimatedDurationMinutes: legacyUnit.estimatedDurationMinutes || 25,
      lessonStyle: 'sune-play-interactive',
      migrationMeta: {
        pilot: true,
        sourceFile: options.sourceFile || null,
        migratedAt: new Date().toISOString().slice(0, 10),
        legacyExerciseCount: legacyExercises.length
      },
      unitStructure: {
        mode: 'theory_then_practice_nodes',
        theoryRequiredBeforePractice: hasRequiredTheory,
        allowTheoryReviewFromPractice: true,
        practiceNodesUseExerciseItemsAsContentBank: true
      },
      theory: theory,
      practiceConfig: {
        formatDefinitions: formatDefinitions,
        globalRules: {
          failedItemsReturnToQueue: true,
          maxRepeatedFailuresBeforeFallback: 2,
          doNotPenalize: [
            'capitalization_only',
            'extra_spaces',
            'missing_final_period',
            'minor_punctuation'
          ]
        }
      },
      practiceNodes: [{
        nodeId: unitPrefix + '-pilot-node-1',
        title: 'Practice',
        shortTitle: 'Practice',
        focus: Object.keys(formatTypesUsed),
        lives: 5,
        passCondition: {
          minimumCorrectScreens: Math.max(1, Math.floor(totalScreensEstimate * 0.7)),
          allowFinishWithZeroLives: false
        },
        screenGeneration: screenGeneration
      }],
      queueBehaviour: {
        initialOrder: 'pedagogical',
        shuffleWithinNode: false,
        failedItemPlacement: 'end_of_queue',
        repeatFailedItemsBeforeCompletion: true,
        maxScreensPerNode: Math.max(totalScreensEstimate, 20),
        minimumScreensPerNode: Math.min(totalScreensEstimate, 6)
      },
      xpRules: {
        baseXpPerCorrectScreen: 10,
        bonusXpForPerfectNode: 20,
        bonusXpForNoHints: 10,
        xpPenaltyPerLifeLost: 2
      },
      feedbackTone: {
        correct: ['Nice!', 'Correct!'],
        incorrect: ['Not quite.', 'Try again.'],
        hintPrompts: []
      },
      contentBanks: {
        source: 'embedded_exercises',
        requiredExerciseIds: convertedExercises.map(function(ex) { return ex.id; }),
        exercises: convertedExercises
      }
    },
    coverage: coverage,
    stats: {
      legacyExerciseCount: legacyExercises.length,
      legacyItemCount: coverage.reduce(function(s, c) { return s + c.legacyItems; }, 0),
      v2ItemCount: coverage.reduce(function(s, c) { return s + c.v2Items; }, 0),
      estimatedScreens: totalScreensEstimate,
      formatTypes: Object.keys(formatTypesUsed)
    }
  };
}
