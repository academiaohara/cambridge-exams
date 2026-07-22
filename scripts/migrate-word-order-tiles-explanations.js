#!/usr/bin/env node
/**
 * Migrate word_order_tiles items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-word-order-tiles-explanations.js
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

function buildWordOrder(item) {
  const tiles = item.answerTiles || [];
  if (!tiles.length) {
    return ensurePeriod(`Build the sentence in the natural English word order for: ${String(item.answer || '').trim()}`);
  }
  return ensurePeriod('Correct tile order: ' + tiles.join(' '));
}

function detectGrammarFocus(legacy, item) {
  const text = stripMd(legacy).toLowerCase();
  const prompt = JSON.stringify(item.prompt || {}).toLowerCase();

  if (/present continuous|happening now|at the moment|right now/i.test(text)) {
    return 'Present continuous describes actions happening now — use am/is/are + verb-ing.';
  }
  if (/present continuous question|put are before|put do before/i.test(text)) {
    return 'In yes/no questions, put the auxiliary (do/does/am/is/are) before the subject.';
  }
  if (/negative present continuous|aren't|isn't|am not/i.test(text)) {
    return 'Negative present continuous: subject + am/is/are + not + verb-ing.';
  }
  if (/present simple|routine|habit|every |usually|often|never|twice/i.test(text + ' ' + prompt)) {
    return 'Present simple describes routines and habits — add -s for he/she/it.';
  }
  if (/usually goes before|often goes before|never goes before|always goes before/i.test(text)) {
    return 'Frequency adverbs (usually, often, never) normally go before the main verb.';
  }
  if (/singular|use does|use walks|use drinks|becomes visits/i.test(text)) {
    return 'Third person singular (he/she/it) needs -s on the verb in the present simple.';
  }
  if (/question inversion|auxiliary before/i.test(text)) {
    return 'In questions, the auxiliary verb comes before the subject.';
  }

  return 'Follow standard English word order: subject + verb + object, with time expressions in their natural position.';
}

function expandLegacyWhy(item, legacy) {
  const stripped = stripMd(legacy);
  if (!stripped) {
    return ensurePeriod(`Arrange the tiles to form: ${String(item.answer || '').trim()}`);
  }
  return ensurePeriod(stripped);
}

function buildWrongOptions(item) {
  const wrongOptions = {};
  const distractors = item.distractorTiles || [];
  const answerTiles = item.answerTiles || [];

  distractors.forEach((tile) => {
    const key = String(tile).trim();
    if (!key) return;
    const correctForm = answerTiles.find((t) =>
      String(t).replace(/[^\w]/g, '').toLowerCase() === key.replace(/[^\w]/g, '').toLowerCase()
    );
    if (correctForm && correctForm !== key) {
      wrongOptions[key] = `"${key}" is a distractor — the correct form here is "${correctForm}".`;
    } else {
      wrongOptions[key] = `"${key}" is an extra tile and should not be used in the final sentence.`;
    }
  });

  return wrongOptions;
}

function buildCommonMistake(item, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const distractors = item.distractorTiles || [];

  if (distractors.length) {
    return `Do not use the extra tile "${distractors[0]}" — check subject-verb agreement and tile order.`;
  }
  if (/before the main verb/i.test(text)) {
    return 'Place frequency adverbs before the main verb, not after the subject chain breaks.';
  }
  if (/singular/i.test(text)) {
    return 'Check subject-verb agreement — singular subjects need the -s form of the verb.';
  }
  return 'Compare your tile order with the model — the first wrong tile is usually a misplaced adverb or wrong verb form.';
}

function buildUsefulTip(item) {
  if ((item.distractorTiles || []).length) {
    return 'Ignore tiles that do not fit grammatically — one verb form is correct for the subject.';
  }
  return 'Start with the subject, then place time expressions and adverbs before the verb where they sound natural.';
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  return {
    whyCorrect: expandLegacyWhy(item, legacy),
    wordOrder: buildWordOrder(item),
    grammarFocus: ensurePeriod(detectGrammarFocus(legacy, item)),
    wrongOptions: buildWrongOptions(item),
    commonMistake: ensurePeriod(buildCommonMistake(item, legacy)),
    usefulTip: ensurePeriod(buildUsefulTip(item))
  };
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'word_order_tiles' && item.formatType !== 'word_order_tiles') return false;

  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item);
  }
  delete item.explanation;
  return true;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
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
