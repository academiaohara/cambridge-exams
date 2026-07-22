#!/usr/bin/env node
/**
 * Validate Sune Play v2 unit JSON (schema + per-type rules).
 *
 * Usage:
 *   node scripts/validate-v2-unit.js data/Course/B1/Unit4.v2.json
 *   node scripts/validate-v2-unit.js data/Course/B1/Unit4.v2.json data/Course/B1/Unit3.v2.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUIRED_TOP = [
  'schemaVersion', 'course', 'block', 'unit', 'type', 'unitTitle',
  'lessonStyle', 'theory', 'practiceConfig', 'practiceNodes', 'contentBanks'
];

const SUPPORTED_FORMAT_TYPES = new Set([
  'two_option_choice', 'free_text_gap_fill', 'conjugation_gap_fill',
  'full_sentence_write', 'word_order_tiles', 'error_correction',
  'verb_bank_two_step', 'passage_error_hunt_single', 'passage_error_hunt_counter',
  'passage_gap_fill', 'guided_error_choice', 'stative_sorting', 'meaning_contrast',
  'preselected_verb_gap_fill', 'mc_4_option', 'find_extra_word',
  'keyword_transformation', 'column_matching', 'crossword_clues',
  'synced_gap_fill', 'comma_placement', 'word_bank_tick', 'word_bank_gap_fill'
]);

const SCREEN_MODES = new Set([
  'single_passage_with_counter', 'single_passage_with_gaps',
  'all_gaps_single_screen', 'all_pairs_single_screen', 'all_words_single_screen'
]);

function error(file, msg) {
  return { file: file, level: 'error', message: msg };
}

function warn(file, msg) {
  return { file: file, level: 'warn', message: msg };
}

function validateExercise(file, exercise) {
  var issues = [];
  if (!exercise.id) issues.push(error(file, 'Exercise missing id'));
  if (!exercise.exerciseType && !exercise.type) {
    issues.push(error(file, 'Exercise ' + (exercise.id || '?') + ' missing exerciseType'));
  }
  var ft = exercise.exerciseType || exercise.interaction?.formatType;
  if (ft && !SUPPORTED_FORMAT_TYPES.has(ft)) {
    issues.push(warn(file, 'Unsupported formatType in exercise ' + exercise.id + ': ' + ft));
  }

  if (ft === 'word_bank_tick') {
    if (!exercise.words || !exercise.words.length) {
      issues.push(error(file, 'word_bank_tick ' + exercise.id + ' missing words[]'));
    }
    if (!exercise.answer) {
      issues.push(error(file, 'word_bank_tick ' + exercise.id + ' missing answer'));
    }
  }

  if (ft === 'passage_gap_fill') {
    if (!exercise.passage) issues.push(error(file, 'passage_gap_fill ' + exercise.id + ' missing passage'));
    var answers = exercise.answers || [];
    if (!answers.length) issues.push(error(file, 'passage_gap_fill ' + exercise.id + ' missing answers[]'));
  }

  if (ft === 'column_matching' && !(exercise.items || []).length) {
    issues.push(error(file, 'column_matching ' + exercise.id + ' missing items'));
  }

  if (ft === 'crossword_clues' && !(exercise.items || []).length) {
    issues.push(error(file, 'crossword_clues ' + exercise.id + ' missing items'));
  }

  (exercise.items || []).forEach(function(item, idx) {
    if (!item.id) issues.push(error(file, 'Item ' + idx + ' in ' + exercise.id + ' missing id'));
    if (item.answer == null && !(item.acceptedAnswers && item.acceptedAnswers.length)) {
      issues.push(warn(file, 'Item ' + (item.id || idx) + ' has no answer/acceptedAnswers'));
    }
    if (ft === 'two_option_choice' && !(item.options && item.options.length >= 2)) {
      issues.push(error(file, 'two_option_choice item ' + (item.id || idx) + ' needs options[]'));
    }
    if (item.formatType === 'two_option_choice' || ft === 'two_option_choice') {
      if (!item.explanationContent && !item.explanation) {
        issues.push(warn(file, 'two_option_choice item ' + (item.id || idx) + ' missing explanationContent'));
      } else if (item.explanationContent && !item.explanationContent.whyCorrect) {
        issues.push(warn(file, 'two_option_choice item ' + (item.id || idx) + ' explanationContent missing whyCorrect'));
      }
      if (item.explanation) {
        issues.push(warn(file, 'two_option_choice item ' + (item.id || idx) + ' still uses legacy explanation string'));
      }
    }
    if (item.formatType === 'meaning_contrast' || ft === 'meaning_contrast') {
      if (!(item.options && item.options.length >= 2) && ft === 'meaning_contrast') {
        issues.push(error(file, 'meaning_contrast item ' + (item.id || idx) + ' needs options[]'));
      }
      if (!item.explanationContent && !item.explanation) {
        issues.push(warn(file, 'meaning_contrast item ' + (item.id || idx) + ' missing explanationContent'));
      } else if (item.explanationContent && !item.explanationContent.whyCorrect) {
        issues.push(warn(file, 'meaning_contrast item ' + (item.id || idx) + ' explanationContent missing whyCorrect'));
      }
      if (item.explanation) {
        issues.push(warn(file, 'meaning_contrast item ' + (item.id || idx) + ' still uses legacy explanation string'));
      }
    }
    if (item.formatType === 'mc_4_option' || ft === 'mc_4_option') {
      if (!(item.options && item.options.length >= 2)) {
        issues.push(error(file, 'mc_4_option item ' + (item.id || idx) + ' needs options[]'));
      }
      if (!item.explanationContent && !item.explanation) {
        issues.push(warn(file, 'mc_4_option item ' + (item.id || idx) + ' missing explanationContent'));
      } else if (item.explanationContent && !item.explanationContent.whyCorrect) {
        issues.push(warn(file, 'mc_4_option item ' + (item.id || idx) + ' explanationContent missing whyCorrect'));
      }
      if (item.explanation) {
        issues.push(warn(file, 'mc_4_option item ' + (item.id || idx) + ' still uses legacy explanation string'));
      }
    }
    if (item.formatType === 'free_text_gap_fill' || ft === 'free_text_gap_fill') {
      if (!item.explanationContent && !item.explanation) {
        issues.push(warn(file, 'free_text_gap_fill item ' + (item.id || idx) + ' missing explanationContent'));
      } else if (item.explanationContent && !item.explanationContent.whyCorrect) {
        issues.push(warn(file, 'free_text_gap_fill item ' + (item.id || idx) + ' explanationContent missing whyCorrect'));
      }
      if (item.explanation) {
        issues.push(warn(file, 'free_text_gap_fill item ' + (item.id || idx) + ' still uses legacy explanation string'));
      }
    }
    if (item.formatType === 'conjugation_gap_fill' || ft === 'conjugation_gap_fill') {
      if (!item.explanationContent && !item.explanation) {
        issues.push(warn(file, 'conjugation_gap_fill item ' + (item.id || idx) + ' missing explanationContent'));
      } else if (item.explanationContent && !item.explanationContent.whyCorrect) {
        issues.push(warn(file, 'conjugation_gap_fill item ' + (item.id || idx) + ' explanationContent missing whyCorrect'));
      }
      if (item.explanation) {
        issues.push(warn(file, 'conjugation_gap_fill item ' + (item.id || idx) + ' still uses legacy explanation string'));
      }
    }
    if (ft === 'synced_gap_fill') {
      if (!(item.sentences && item.sentences.length >= 2)) {
        issues.push(error(file, 'synced_gap_fill item ' + (item.id || idx) + ' needs sentences[]'));
      }
    }
    if (ft === 'keyword_transformation' && !item.promptSentence) {
      issues.push(warn(file, 'keyword_transformation item ' + (item.id || idx) + ' missing promptSentence'));
    }
    if (ft === 'error_correction' && !item.highlightedText) {
      issues.push(warn(file, 'error_correction item ' + (item.id || idx) + ' missing highlightedText'));
    }
    if (item.acceptedAnswers && item.acceptedAnswers.some(function(a) { return typeof a !== 'string'; })) {
      issues.push(error(file, 'Item ' + (item.id || idx) + ' acceptedAnswers must be strings'));
    }
  });

  return issues;
}

function validateUnitFile(filePath) {
  var rel = path.relative(ROOT, filePath);
  var issues = [];
  var unit;

  try {
    unit = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return { file: rel, ok: false, issues: [error(rel, 'Invalid JSON: ' + e.message)] };
  }

  if (!unit.schemaVersion || !String(unit.schemaVersion).includes('v2')) {
    issues.push(error(rel, 'Missing or invalid schemaVersion'));
  }

  REQUIRED_TOP.forEach(function(key) {
    if (unit[key] == null) issues.push(error(rel, 'Missing required field: ' + key));
  });

  if (unit.lessonStyle !== 'sune-play-interactive') {
    issues.push(warn(rel, 'lessonStyle is not sune-play-interactive'));
  }

  var bank = unit.contentBanks || {};
  var exercises = bank.exercises || [];
  var exerciseById = {};
  exercises.forEach(function(ex) {
    exerciseById[ex.id] = ex;
    issues = issues.concat(validateExercise(rel, ex));
  });

  (unit.practiceNodes || []).forEach(function(node) {
    if (!node.nodeId) issues.push(error(rel, 'Practice node missing nodeId'));
    (node.screenGeneration || []).forEach(function(rule, ri) {
      if (!rule.sourceExerciseId) {
        issues.push(error(rel, 'screenGeneration[' + ri + '] missing sourceExerciseId'));
        return;
      }
      if (!exerciseById[rule.sourceExerciseId]) {
        issues.push(error(rel, 'screenGeneration references unknown exercise ' + rule.sourceExerciseId));
      }
      if (!rule.formatType) {
        issues.push(error(rel, 'screenGeneration[' + ri + '] missing formatType'));
      } else if (!SUPPORTED_FORMAT_TYPES.has(rule.formatType)) {
        issues.push(warn(rel, 'screenGeneration formatType not in renderer: ' + rule.formatType));
      }
      if (rule.screenMode && !SCREEN_MODES.has(rule.screenMode)) {
        issues.push(error(rel, 'Unknown screenMode: ' + rule.screenMode));
      }
      if (!rule.screenMode && !(rule.sourceItemIds && rule.sourceItemIds.length)) {
        issues.push(error(rel, 'screenGeneration[' + ri + '] needs sourceItemIds or screenMode'));
      }
      if (rule.sourceItemIds) {
        var ex = exerciseById[rule.sourceExerciseId];
        rule.sourceItemIds.forEach(function(itemId) {
          if (ex && ex.items && !ex.items.find(function(it) { return it.id === itemId; })) {
            issues.push(error(rel, 'Unknown itemId ' + itemId + ' in exercise ' + rule.sourceExerciseId));
          }
        });
      }
    });
  });

  var formatDefs = (unit.practiceConfig && unit.practiceConfig.formatDefinitions) || [];
  formatDefs.forEach(function(def) {
    if (!def.formatType) issues.push(error(rel, 'formatDefinition missing formatType'));
  });

  var errors = issues.filter(function(i) { return i.level === 'error'; });
  return { file: rel, ok: errors.length === 0, issues: issues };
}

function main() {
  var files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node scripts/validate-v2-unit.js <unit.v2.json> [...]');
    process.exit(1);
  }

  var results = files.map(function(f) {
    return validateUnitFile(path.resolve(ROOT, f));
  });

  var totalErrors = 0;
  var totalWarnings = 0;

  results.forEach(function(result) {
    console.log('\n## ' + result.file + (result.ok ? ' ✓' : ' ✗'));
    result.issues.forEach(function(issue) {
      var prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      console.log('  ' + prefix + ': ' + issue.message);
      if (issue.level === 'error') totalErrors++;
      else totalWarnings++;
    });
    if (!result.issues.length) console.log('  No issues');
  });

  console.log('\n=== Summary ===');
  console.log('Files:', results.length);
  console.log('Errors:', totalErrors);
  console.log('Warnings:', totalWarnings);
  console.log('Status:', totalErrors === 0 ? 'PASS' : 'FAIL');

  process.exit(totalErrors === 0 ? 0 : 1);
}

main();
