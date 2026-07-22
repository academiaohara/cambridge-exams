#!/usr/bin/env node
/**
 * Migrate column_matching items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-column-matching-explanations.js
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

function parseMatchSentence(sentence, idx) {
  const raw = String(sentence || '').trim();
  const match = raw.match(/^(.*?)\s*\*\*([A-Z])\*\*\s*(.*)?$/);
  if (match) {
    return {
      leftText: match[1].trim(),
      markerLetter: match[2].toUpperCase(),
      endingText: (match[3] || '').trim()
    };
  }
  return {
    leftText: raw.replace(/\.{3,}|…{2,}|_{3,}/g, '').trim(),
    markerLetter: String.fromCharCode(65 + idx),
    endingText: ''
  };
}

function parseItemPair(item, idx) {
  const parsed = parseMatchSentence(item.sentence || '', idx);
  let endingText = parsed.endingText || '';
  const rawAnswer = String(item.answer || '').trim();
  if (!endingText && rawAnswer && !/^[A-H](?:\s*[–\-—]|\s*$)/i.test(rawAnswer)) {
    endingText = rawAnswer;
  }
  const dashMatch = rawAnswer.match(/^([A-H])\s*[–\-—]\s*(.+)$/i);
  const correctLetter = dashMatch
    ? dashMatch[1].toUpperCase()
    : (/^[A-H]$/i.test(rawAnswer) ? rawAnswer.toUpperCase() : parsed.markerLetter);
  if (dashMatch && !parsed.endingText) endingText = dashMatch[2].trim();
  if (!endingText && /^[A-H]$/i.test(rawAnswer)) endingText = '';

  return {
    leftText: parsed.leftText,
    correctLetter,
    endingText
  };
}

function buildEndingMap(exercise) {
  const map = {};
  (exercise.items || exercise.questions || []).forEach((item, idx) => {
    const pair = parseItemPair(item, idx);
    if (pair.correctLetter && pair.endingText && !map[pair.correctLetter]) {
      map[pair.correctLetter] = pair.endingText;
    }
  });
  return map;
}

function buildSentenceBreakdown(pair) {
  const left = String(pair.leftText || '').trim();
  const ending = String(pair.endingText || '').trim();
  if (left && ending) return ensurePeriod(left + ' ' + ending);
  return left || ending;
}

function expandLegacyWhy(item, pair, legacy) {
  const stripped = stripMd(legacy);
  if (stripped) return ensurePeriod(stripped);
  if (pair.leftText && pair.endingText) {
    return ensurePeriod(`"${pair.leftText}" collocates with ending ${pair.correctLetter}: "${pair.endingText}"`);
  }
  return ensurePeriod(`Match item ${item.id || ''} with ending ${pair.correctLetter}.`);
}

function buildVocabularyFocus(pair, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const ending = String(pair.endingText || '').toLowerCase();

  if (/collocat|phrase|pattern|preposition|phrasal/.test(text)) {
    return 'Column matching tests fixed phrases and collocations — the ending must complete the beginning naturally.';
  }
  if (/^on /.test(ending) || / on /.test(ending)) {
    return 'Many travel and place phrases use on (on foot, on holiday, on schedule) — match the whole chunk, not single words.';
  }
  if (/^by /.test(ending)) {
    return 'By phrases describe means or method (by train, by bus) — they attach directly to the verb phrase.';
  }
  if (/^up | up /.test(ending)) {
    return 'Phrasal verbs split across the match — the particle (up, off, out) must collocate with the verb on the left.';
  }
  if (/^out | out /.test(ending)) {
    return 'Out particles often complete phrasal verbs (went out, split up) — read the full sentence to check meaning.';
  }

  return 'Read the beginning and ending together — only one ending forms a natural, grammatical sentence.';
}

function buildWrongOptions(pair, endingMap) {
  const wrongOptions = {};
  const correctLetter = pair.correctLetter;

  Object.keys(endingMap).forEach((letter) => {
    if (letter === correctLetter) return;
    const ending = endingMap[letter];
    wrongOptions[letter] = ending
      ? `Ending ${letter} ("${ending}") does not collocate naturally with "${pair.leftText}".`
      : `Ending ${letter} does not complete "${pair.leftText}" correctly.`;
  });

  return wrongOptions;
}

function buildCommonMistake(pair, endingMap) {
  const others = Object.keys(endingMap).filter((letter) => letter !== pair.correctLetter);
  if (!others.length) {
    return 'Check the whole sentence sounds natural when you join the beginning with the ending.';
  }
  const sample = endingMap[others[0]];
  return ensurePeriod(
    `Do not force ending ${others[0]}${sample ? ` ("${sample}")` : ''} — only ${pair.correctLetter} completes "${pair.leftText}" naturally`
  );
}

function buildUsefulTip(pair) {
  const left = String(pair.leftText || '').toLowerCase();
  if (/took |take |split |look |run |went |find |thinking/.test(left)) {
    return 'Phrasal verbs are common in these matches — the particle in the ending must fit the verb on the left.';
  }
  if (/on |by |in |at |for /.test(left)) {
    return 'Prepositional phrases are fixed chunks — small changes (on/at/for) change the meaning completely.';
  }
  return 'Say the full sentence aloud — if it sounds unnatural, try a different ending letter.';
}

function buildExplanationContent(item, exercise, idx) {
  const pair = parseItemPair(item, idx);
  const endingMap = buildEndingMap(exercise);
  if (!pair.endingText && endingMap[pair.correctLetter]) {
    pair.endingText = endingMap[pair.correctLetter];
  }
  const legacy = item.explanation || '';

  return {
    whyCorrect: expandLegacyWhy(item, pair, legacy),
    vocabularyFocus: ensurePeriod(buildVocabularyFocus(pair, legacy)),
    sentenceBreakdown: buildSentenceBreakdown(pair),
    wrongOptions: buildWrongOptions(pair, endingMap),
    commonMistake: buildCommonMistake(pair, endingMap),
    usefulTip: ensurePeriod(buildUsefulTip(pair))
  };
}

function migrateItem(item, exercise, idx) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'column_matching' && item.formatType !== 'column_matching') return false;

  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item, exercise, idx);
  }
  delete item.explanation;
  return true;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  const exercises = data.contentBanks?.exercises ||
    (Array.isArray(data.sections) ? data.sections.filter((s) => s.type === 'exercise') : []);

  for (const exercise of exercises) {
    const ft = exercise.exerciseType || exercise.interaction?.formatType || exercise.formatType;
    if (ft !== 'column_matching' && exercise.formatType !== 'column_matching') continue;

    (exercise.items || exercise.questions || []).forEach((item, idx) => {
      if (migrateItem(item, exercise, idx)) changed++;
    });
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
