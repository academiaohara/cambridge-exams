#!/usr/bin/env node
/**
 * Migrate word_bank_tick exercises to structured `explanationContent`.
 * Exercise-level format (no items[]) — content lives on the exercise object.
 *
 * Usage: node scripts/migrate-word-bank-tick-explanations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data', 'Course');

function walkJsonFiles(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJsonFiles(full, files);
    else if (name.endsWith('.json')) files.push(full);
  }
  return files;
}

function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

function parseAnswerWords(exercise) {
  if (Array.isArray(exercise.answerWords)) return exercise.answerWords;
  return String(exercise.answer || '')
    .split(/,\s*/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function detectSuffixRule(instructions) {
  const text = String(instructions || '').toLowerCase();
  if (/-y\b/.test(text) || /suffix -y/.test(text)) return 'suffix_y';
  if (/uncountable/.test(text)) return 'uncountable';
  if (/stative/.test(text)) return 'stative';
  return 'generic';
}

function buildWhyCorrect(exercise, rule) {
  if (rule === 'suffix_y') {
    return ensurePeriod(
      'The suffix -y turns many nouns and verbs into adjectives (brain → brainy, scare → scary). ' +
      'Select every base word that forms a natural -y adjective.'
    );
  }
  if (rule === 'uncountable') {
    return ensurePeriod('Uncountable nouns cannot be counted individually and usually have no plural form.');
  }
  return ensurePeriod(
    'Read the instruction carefully and select every word that matches the stated rule.'
  );
}

function buildGrammarFocus(exercise, rule) {
  if (rule === 'suffix_y') {
    return 'Suffix -y often forms adjectives from nouns or verbs — e.g. luck → lucky, shine → shiny. ' +
      'Some words use a different pattern (culture → cultural) or have no common -y form.';
  }
  if (rule === 'uncountable') {
    return 'Uncountable nouns take singular verbs and no plural (*furnitures* ✗).';
  }
  return 'Apply the selection rule to each chip before you check your answer.';
}

function buildCommonMistake(rule) {
  if (rule === 'suffix_y') {
    return 'Do not select words that already form adjectives with -al/-ic/-ful instead of -y, or that have no standard -y adjective.';
  }
  return 'Check each word against the rule — missing one correct chip counts as wrong.';
}

function buildUsefulTip(rule) {
  if (rule === 'suffix_y') {
    return 'Try saying the -y adjective aloud — if it sounds natural (juicy, spotty), the base word belongs.';
  }
  return 'Scan the whole bank once for clear matches before tapping uncertain words.';
}

const SUFFIX_Y_WRONG = {
  budget: 'forms budgetary, not *budgety* — a different adjective pattern.',
  culture: 'forms cultural, not *culturey* — use -al instead of -y here.',
  engine: 'has no common -y adjective (*enginey* is not standard English).',
  method: 'forms methodical, not *methody* — a different adjective pattern.',
  system: 'forms systematic, not *systemy* — use -atic instead of -y here.'
};

const SUFFIX_Y_CORRECT = {
  brain: 'brain → brainy',
  bump: 'bump → bumpy',
  curl: 'curl → curly',
  flavour: 'flavour → flavoury / flavoursome',
  guilt: 'guilt → guilty',
  hair: 'hair → hairy',
  haste: 'haste → hasty',
  juice: 'juice → juicy',
  luck: 'luck → lucky',
  lump: 'lump → lumpy',
  meat: 'meat → meaty',
  milk: 'milk → milky',
  scare: 'scare → scary',
  shine: 'shine → shiny',
  sport: 'sport → sporty',
  spot: 'spot → spotty',
  taste: 'taste → tasty',
  waste: 'waste → wasteful is more common, but wastey/waste-based -y forms exist in set exercises',
  water: 'water → watery',
  wealth: 'wealth → wealthy'
};

function buildWrongOptions(exercise, rule) {
  const words = exercise.words || [];
  const answerSet = new Set(parseAnswerWords(exercise).map((w) => w.toLowerCase()));
  const wrongOptions = {};

  if (rule === 'suffix_y') {
    words.forEach((word) => {
      const key = String(word).trim();
      const lower = key.toLowerCase();
      if (!answerSet.has(lower) && SUFFIX_Y_WRONG[lower]) {
        wrongOptions[key] = SUFFIX_Y_WRONG[lower];
      } else if (answerSet.has(lower) && SUFFIX_Y_CORRECT[lower]) {
        wrongOptions[key] = SUFFIX_Y_CORRECT[lower];
      }
    });
    return wrongOptions;
  }

  words.forEach((word) => {
    const key = String(word).trim();
    if (!answerSet.has(key.toLowerCase())) {
      wrongOptions[key] = 'this word does not belong in the target set.';
    } else {
      wrongOptions[key] = 'this word belongs in the target set.';
    }
  });
  return wrongOptions;
}

function buildExplanationContent(exercise) {
  const rule = detectSuffixRule(exercise.instructions || exercise.studentInstruction);
  return {
    whyCorrect: buildWhyCorrect(exercise, rule),
    grammarFocus: buildGrammarFocus(exercise, rule),
    wrongOptions: buildWrongOptions(exercise, rule),
    commonMistake: buildCommonMistake(rule),
    usefulTip: buildUsefulTip(rule)
  };
}

function isWordBankTickExercise(exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType;
  return ft === 'word_bank_tick';
}

function migrateFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const unit = JSON.parse(raw);
  let changed = 0;

  const exercises = unit.contentBanks?.exercises || [];
  for (const exercise of exercises) {
    if (!isWordBankTickExercise(exercise)) continue;
    if (exercise.explanationContent) continue;
    exercise.explanationContent = buildExplanationContent(exercise);
    delete exercise.explanation;
    changed++;
    console.log('  migrated exercise', exercise.id, 'in', rel);
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(unit, null, 2) + '\n');
  }
  return changed;
}

function main() {
  const files = walkJsonFiles(COURSE_DIR);
  let total = 0;
  for (const file of files) {
    total += migrateFile(file);
  }
  console.log('Done. Migrated', total, 'word_bank_tick exercise(s).');
}

main();
