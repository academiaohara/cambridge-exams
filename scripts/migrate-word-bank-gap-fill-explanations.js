#!/usr/bin/env node
/**
 * Migrate word_bank_gap_fill items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-word-bank-gap-fill-explanations.js
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

function wordBank(exercise) {
  return exercise.words || exercise.wordBank || [];
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function expandLegacyWhy(item, legacy) {
  const answer = String(item.answer || '').trim();
  const arrow = extractArrowParts(legacy);
  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    return ensurePeriod(`The clue is ${lower}, so "${answer}" is the word from the box that fits`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    return ensurePeriod(`"${answer}" is the only word from the box that completes this sentence correctly`);
  }
  return ensurePeriod(stripped);
}

function detectVocabularyFocus(legacy, item, bank) {
  const answer = String(item.answer || '').trim();
  const sentence = stripMd(String(item.sentence || '').split('\n')[0]);
  const text = stripMd(legacy).toLowerCase();

  if (/collocation|phrase|phrasal|=\s*/.test(text + legacy)) {
    return `"${answer}" forms a fixed chunk or collocation with the rest of the sentence.`;
  }
  if (/countable|uncountable|a few|a little|many|much/.test(text + sentence)) {
    return `Choose the quantifier that matches the noun type in the sentence — "${answer}" fits here.`;
  }

  const distractors = bank.filter((w) => String(w).toLowerCase() !== answer.toLowerCase()).slice(0, 3);
  if (distractors.length) {
    return `"${answer}" is the bank word that matches the meaning of the sentence; other chips such as ${distractors.map((w) => `"${w}"`).join(', ')} do not.`;
  }

  return `"${answer}" is the only word from the box that fits both grammar and meaning in this sentence.`;
}

function detectGrammarFocus(legacy, item) {
  const text = stripMd(legacy).toLowerCase();
  const answer = String(item.answer || '').trim();
  const sentence = String(item.sentence || '').toLowerCase();

  if (/will |shall |going to|future/.test(text + ' ' + sentence)) {
    return 'After will/shall, use the base form of the verb from the box — do not add extra endings.';
  }
  if (/plural|-s\b|singular|agreement/.test(text)) {
    return 'Check subject–verb agreement — the verb form from the box may need an -s ending.';
  }
  if (answer.includes(' ') || /phrasal/.test(text)) {
    return 'Some answers are multi-word chunks from the box — use the full phrase, not just one word.';
  }

  return '';
}

function buildWrongOptions(item, exercise, legacy) {
  const answer = String(item.answer || '').trim().toLowerCase();
  const bank = wordBank(exercise);
  const wrongOptions = {};

  bank.forEach((word) => {
    const key = String(word).trim();
    if (key.toLowerCase() === answer) return;
    wrongOptions[key] = `"${key}" does not match the meaning or collocation needed in this sentence — "${item.answer}" fits better.`;
  });

  if (/a few|a little/.test(legacy)) {
    wrongOptions['a little'] = 'A little pairs with uncountable nouns, not countable plurals.';
    wrongOptions['a few'] = 'A few pairs with countable plural nouns, not uncountable nouns.';
    wrongOptions.much = 'Much is for uncountable nouns.';
    wrongOptions.many = 'Many is for countable plural nouns.';
  }

  return wrongOptions;
}

function buildCommonMistake(legacy, item, bank) {
  const answer = String(item.answer || '').trim();
  const userBank = bank.filter((w) => String(w).toLowerCase() !== answer.toLowerCase());

  if (/collocation|phrase|phrasal/.test(stripMd(legacy).toLowerCase())) {
    return 'Another chip from the box may look similar, but only one forms the natural collocation in this sentence.';
  }
  if (userBank.length === 1) {
    return `Only one bank word fits — if you chose "${userBank[0]}", check how it collocates with the words around the gap.`;
  }
  return 'Pick the bank word that matches the sentence meaning first — then check the verb form if will/shall is already in the sentence.';
}

function buildUsefulTip(legacy, item) {
  const sentence = String(item.sentence || '').toLowerCase();
  if (/will |shall /.test(sentence)) {
    return 'Will and shall are already in the sentence — the gap only needs the base verb from the box.';
  }
  if (/countable|uncountable|many|much|few|little/.test(sentence + legacy)) {
    return 'Decide if the noun after the gap is countable or uncountable before you choose the quantifier.';
  }
  return 'Read the whole sentence first, then eliminate bank words that break the meaning or collocation.';
}

function buildExplanationContent(item, exercise) {
  const legacy = item.explanation || '';
  const bank = wordBank(exercise);
  const whyCorrect = expandLegacyWhy(item, legacy);
  const vocabularyFocus = ensurePeriod(detectVocabularyFocus(legacy, item, bank));
  const grammarFocus = detectGrammarFocus(legacy, item);
  const wrongOptions = buildWrongOptions(item, exercise, legacy);
  const commonMistake = ensurePeriod(buildCommonMistake(legacy, item, bank));
  const usefulTip = ensurePeriod(buildUsefulTip(legacy, item));

  const content = {
    whyCorrect,
    vocabularyFocus,
    wrongOptions,
    commonMistake,
    usefulTip
  };

  if (grammarFocus) content.grammarFocus = ensurePeriod(grammarFocus);

  return content;
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType;
  if (ft !== 'word_bank_gap_fill' && item.formatType !== 'word_bank_gap_fill') return false;

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

  console.log('\nMigrated ' + total + ' word_bank_gap_fill items across ' + fileCount + ' files.');
}

main();
