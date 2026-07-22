#!/usr/bin/env node
/**
 * Migrate passage_error_hunt_* exercises from items[] to errors[] and fix
 * per-error grammarFocus / sentenceBreakdown issues.
 *
 * Usage: node scripts/migrate-passage-hunt-errors-array.js [file.json ...]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildHuntSentenceBreakdown } from './lib/hunt-snippet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data', 'Course');

const USEFUL_TIP_BY_WRONG = {
  'paint': 'Time markers like *right now* often need the present continuous.',
  'practises': 'If someone is doing something at this moment, use the present continuous.'
};

const GRAMMAR_FOCUS_BY_WRONG = {
  'am enjoying': 'Stative verbs like *enjoy* take the present simple — use *enjoy*, not *am enjoying*.',
  'are choosing': 'General instructions use the present simple — *choose*, not *are choosing*.',
  'is looking': 'When *look* means *seem*, it is stative — use *looks*, not *is looking*.',
  'are needing': '*Need* is normally stative — use *need*, not *are needing*.',
  'are throwing': '*Sometimes* describes a general habit — use the present simple *throw*.',
  'are improving': 'This is a general statement about progress — use *improve*, not *are improving*.',
  'are preferring': '*Prefer* is stative — use *prefer*, not *are preferring*.',
  'am not believing': '*Believe* is stative — use *don\'t believe*, not *am not believing*.',
  'paint': '*Right now* signals an action in progress — use *am painting*, not *paint*.',
  'practises': 'The sister is playing now — use *is practising*, not *practises*.'
};

function walkJsonFiles(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJsonFiles(full, files);
    else if (name.endsWith('.json')) files.push(full);
  }
  return files;
}

function isHuntExercise(exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType;
  return ft === 'passage_error_hunt_single' || ft === 'passage_error_hunt_counter';
}

function buildSentenceBreakdown(passage, wrong, answer) {
  return buildHuntSentenceBreakdown(passage, wrong, answer);
}

function migrateErrorSlot(slot, passage) {
  const wrong = slot.targetPhrase || slot.wrong || '';
  const answer = String(slot.answer || '').trim();
  const focus = GRAMMAR_FOCUS_BY_WRONG[wrong];

  if (!slot.explanationContent) slot.explanationContent = {};
  if (focus) {
    slot.explanationContent.grammarFocus = focus;
  }
  const tip = USEFUL_TIP_BY_WRONG[wrong];
  if (tip) {
    slot.explanationContent.usefulTip = tip;
  }

  const breakdown = buildSentenceBreakdown(passage, wrong, answer);
  if (breakdown) {
    slot.explanationContent.sentenceBreakdown = breakdown;
  }

  if (slot.explanationContent.wrongOptions && answer) {
    const keys = Object.keys(slot.explanationContent.wrongOptions);
    for (const key of keys) {
      if (key !== 'wrong_tap' && key.toLowerCase() !== answer.toLowerCase()) continue;
    }
    if (!slot.explanationContent.wrongOptions[answer]) {
      slot.explanationContent.wrongOptions[answer] =
        'Check the corrected form — the answer is *' + answer + '*.';
    }
  }

  return slot;
}

function migrateExercise(exercise) {
  if (!isHuntExercise(exercise)) return false;
  const passage = exercise.passage || '';
  const source = exercise.errors || exercise.items || [];
  if (!source.length) return false;

  const errors = source.map((slot) => migrateErrorSlot({ ...slot }, passage));
  exercise.errors = errors;
  if (exercise.items) delete exercise.items;
  if (!exercise.errorCount) exercise.errorCount = errors.length;
  return true;
}

function migrateUnit(unit) {
  let count = 0;
  const exercises = unit.contentBanks?.exercises || unit.sections?.filter((s) => s.type === 'exercise') || [];
  for (const exercise of exercises) {
    if (migrateExercise(exercise)) count += 1;
  }
  return count;
}

function main() {
  const files = process.argv.slice(2).length
    ? process.argv.slice(2).map((f) => path.resolve(ROOT, f))
    : walkJsonFiles(COURSE_DIR);

  let total = 0;
  for (const file of files) {
    let unit;
    try {
      unit = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    const migrated = migrateUnit(unit);
    if (!migrated) continue;
    fs.writeFileSync(file, JSON.stringify(unit, null, 2) + '\n');
    console.log('Migrated', migrated, 'hunt exercise(s) in', path.relative(ROOT, file));
    total += migrated;
  }
  console.log('Done —', total, 'exercise(s) now use errors[].');
}

main();
