#!/usr/bin/env node
/**
 * Migrate find_extra_word items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-find-extra-word-explanations.js
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

function isOkItem(item) {
  return answerText(item).toUpperCase() === 'OK';
}

function sentenceText(item) {
  return stripMd(String(item.sentence || '').replace(/\[[^\]]+\]/g, (m) => m.slice(1, -1)));
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function expandLegacyWhy(item, legacy) {
  const answer = answerText(item);
  if (isOkItem(item)) {
    return ensurePeriod('There is no extra word — tap OK because the sentence is already correct');
  }

  const arrow = extractArrowParts(legacy);
  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    if (/remove/i.test(arrow.answer)) {
      return ensurePeriod(`The extra word is "${answer}" — ${lower}`);
    }
    return ensurePeriod(`The clue is ${lower}, so remove "${answer}"`);
  }

  const stripped = stripMd(legacy);
  if (/correct.*tap.*ok/i.test(stripped)) {
    return ensurePeriod('There is no extra word — tap OK because the sentence is already correct');
  }
  if (/remove/i.test(stripped)) {
    return ensurePeriod(`"${answer}" is redundant here and should be removed`);
  }
  if (!stripped) {
    return ensurePeriod(`"${answer}" is the unnecessary extra word in this sentence`);
  }
  return ensurePeriod(stripped);
}

function detectGrammarFocus(item, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const answer = answerText(item).toLowerCase();
  const sentence = sentenceText(item).toLowerCase();

  if (isOkItem(item)) {
    return 'If every word is necessary and the grammar is correct, tap OK — do not remove a word just to change the sentence.';
  }
  if (/double article|extra article|\bthe the\b|\ba a\b/i.test(text + ' ' + sentence) || answer === 'the' || answer === 'a') {
    return 'An extra article (a/an/the) makes the noun phrase ungrammatical — remove the duplicate.';
  }
  if (/passive|been/i.test(text + ' ' + sentence) && answer === 'been') {
    return 'Present simple passive uses is/are + past participle — been is not needed after is in this pattern.';
  }
  if (/despite/i.test(sentence) && answer === 'of') {
    return 'Despite is followed directly by a noun phrase — do not add of (unlike in spite of).';
  }
  if (/send|tell|give|show/i.test(sentence) && (answer === 'to' || answer === 'out')) {
    return 'Some verbs take a direct object without to — check whether the verb already links to the person or thing.';
  }
  if (/make .* feel/i.test(sentence) && answer === 'out') {
    return 'Make + person + base verb does not need out — make people feel, not make out people feel.';
  }
  if (/double subject|extra subject|pronoun/i.test(text)) {
    return 'A sentence needs only one subject — remove the repeated pronoun or noun.';
  }
  if (/phrasal|particle|preposition/i.test(text)) {
    return 'An extra preposition or particle breaks the verb pattern — remove the word that is not part of the fixed chunk.';
  }

  return 'Read the sentence aloud without the tapped word — if it sounds natural, that word is the extra one.';
}

function tokenizeForWrongOptions(sentence) {
  return String(sentence || '')
    .replace(/\[[^\]]+\]/g, (m) => m.slice(1, -1))
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildWrongOptions(item, legacy) {
  const answer = answerText(item);
  const wrongOptions = {};
  const tokens = tokenizeForWrongOptions(item.sentence);

  if (isOkItem(item)) {
    tokens.forEach((token) => {
      const key = token.replace(/[^\w']/g, '');
      if (key) {
        wrongOptions[key] = `"${key}" is needed in this sentence — tap OK because there is no extra word.`;
      }
    });
    wrongOptions.OK = 'There is no extra word to remove — the sentence is already correct.';
    return wrongOptions;
  }

  tokens.forEach((token) => {
    const key = token.replace(/[^\w']/g, '');
    if (!key) return;
    if (key.toLowerCase() === answer.toLowerCase()) {
      wrongOptions[key] = `"${key}" is the redundant word — tap it (do not tap OK).`;
    } else {
      wrongOptions[key] = `"${key}" is necessary here — the extra word is "${answer}".`;
    }
  });
  wrongOptions.OK = `There is an extra word ("${answer}") — do not tap OK.`;

  return wrongOptions;
}

function buildCommonMistake(item, legacy) {
  const answer = answerText(item);
  const text = stripMd(legacy).toLowerCase();

  if (isOkItem(item)) {
    return 'If the sentence is already correct, tap OK — removing a necessary word would make it wrong.';
  }
  if (/tap.*ok/i.test(text)) {
    return 'Do not tap OK when there is an extra word — find and tap the redundant token.';
  }
  if (/content word|necessary/i.test(text)) {
    return 'Only the redundant function word or repeated element is extra — content words are usually needed.';
  }
  return `Look for a repeated or unnecessary small word — "${answer}" is the one to tap, not a content word the sentence needs.`;
}

function buildUsefulTip(item) {
  if (isOkItem(item)) {
    return 'Read the whole line first — if grammar and meaning are fine, tap OK without selecting any word.';
  }
  return 'Try reading the sentence without each word in your head — the extra word is the one that can be dropped with no loss of meaning.';
}

function inferWhyWithoutLegacy(item) {
  const answer = answerText(item);
  if (isOkItem(item)) {
    return ensurePeriod('This sentence has no extra word — tap OK');
  }
  return ensurePeriod(`"${answer}" is the extra word that should be removed from this sentence`);
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const whyCorrect = legacy ? expandLegacyWhy(item, legacy) : inferWhyWithoutLegacy(item);
  const grammarFocus = ensurePeriod(detectGrammarFocus(item, legacy));
  const wrongOptions = buildWrongOptions(item, legacy);
  const commonMistake = ensurePeriod(buildCommonMistake(item, legacy));
  const usefulTip = ensurePeriod(buildUsefulTip(item));

  return {
    whyCorrect,
    grammarFocus,
    wrongOptions,
    commonMistake,
    usefulTip
  };
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'find_extra_word' && item.formatType !== 'find_extra_word') return false;

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
