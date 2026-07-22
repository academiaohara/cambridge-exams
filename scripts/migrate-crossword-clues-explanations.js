#!/usr/bin/env node
/**
 * Migrate crossword_clues items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-crossword-clues-explanations.js
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

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

function answerText(item) {
  return String(item.answer || '').trim();
}

function cleanClue(item) {
  return stripMd(String(item.clue || ''))
    .replace(/\.{3,}|…{2,}|_{3,}/g, '___')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
}

function letterCount(item) {
  if (item.letterCount != null) return item.letterCount;
  return answerText(item).replace(/\s+/g, '').length;
}

function expandLegacyWhy(item, legacy) {
  const stripped = stripMd(legacy);
  if (stripped) return ensurePeriod(stripped);

  const clue = cleanClue(item);
  const answer = answerText(item);
  return ensurePeriod(`The clue "${clue}" leads to the word "${answer}".`);
}

function buildVocabularyFocus(item) {
  const answer = answerText(item);
  const clue = cleanClue(item);
  const count = letterCount(item);
  return ensurePeriod(`"${answer}" (${count} letters) matches the definition: ${clue}`);
}

function buildWrongOptions(item, exercise) {
  const wrongOptions = {};
  const answer = answerText(item).toLowerCase();
  const count = letterCount(item);

  (exercise.items || []).forEach((other) => {
    if (other === item) return;
    const otherAnswer = answerText(other).toLowerCase();
    if (!otherAnswer || otherAnswer === answer) return;
    if (Math.abs(otherAnswer.length - count) <= 1) {
      wrongOptions[otherAnswer] = `"${otherAnswer}" is a different word from the crossword — check the clue definition again.`;
    }
  });

  return wrongOptions;
}

function buildCommonMistake(item) {
  const answer = answerText(item);
  const count = letterCount(item);

  if (/ph|gh|rh|tion|ious|eous|ough|ei|ie/.test(answer)) {
    return ensurePeriod(`Watch tricky spelling in "${answer}" — silent letters and suffix patterns are common mistakes.`);
  }
  if (count >= 9) {
    return ensurePeriod(`Double-check long words like "${answer}" — it has ${count} letters.`);
  }
  return ensurePeriod(`Count the letters in the clue (${count}) and spell "${answer}" carefully.`);
}

function buildUsefulTip(item) {
  const clue = cleanClue(item).toLowerCase();
  if (/another word for|synonym|means/.test(clue)) {
    return 'Synonym clues need the exact word with the right number of letters — not a similar phrase.';
  }
  if (/past form|verb/.test(clue)) {
    return 'If the clue describes an action, use the correct verb form and check the ending (-ed, -ing).';
  }
  return 'Read the clue again — the definition points to one word with a fixed letter count.';
}

function buildExplanationContent(item, exercise) {
  const legacy = item.explanation || '';
  return {
    whyCorrect: expandLegacyWhy(item, legacy),
    vocabularyFocus: buildVocabularyFocus(item),
    wrongOptions: buildWrongOptions(item, exercise),
    commonMistake: ensurePeriod(buildCommonMistake(item)),
    usefulTip: ensurePeriod(buildUsefulTip(item))
  };
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'crossword_clues' && item.formatType !== 'crossword_clues') return false;

  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item, exercise);
  }
  delete item.explanation;
  return true;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    const ft = exercise.exerciseType || exercise.interaction?.formatType || exercise.formatType;
    if (ft !== 'crossword_clues' && exercise.formatType !== 'crossword_clues') continue;

    for (const item of exercise.items || []) {
      if (migrateItem(item, exercise)) changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }
  return changed;
}

function main() {
  const files = walkJsonFiles(COURSE_DIR);
  let total = 0;
  let fileCount = 0;

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      total += n;
      fileCount++;
      console.log(path.relative(ROOT, file) + ': ' + n + ' items');
    }
  }

  console.log('\nDone. Migrated ' + total + ' items across ' + fileCount + ' files.');
}

main();
