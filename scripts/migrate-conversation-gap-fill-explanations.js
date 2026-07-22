#!/usr/bin/env node
/**
 * Migrate conversation gap-fill lines in phrasal-verbs / idioms lessons
 * to structured `explanationContent` on each gap line.
 *
 * Usage: node scripts/migrate-conversation-gap-fill-explanations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIRS = [
  path.join(ROOT, 'data', 'phrasal-verbs'),
  path.join(ROOT, 'data', 'idioms')
];

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

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function normalizePhrase(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseConvBracket(inner) {
  const sepIdx = inner.indexOf('|') !== -1 ? inner.indexOf('|') : inner.indexOf('/');
  return {
    displayForm: (sepIdx !== -1 ? inner.slice(0, sepIdx) : inner).trim(),
    answer: (sepIdx !== -1 ? inner.slice(sepIdx + 1) : inner).trim()
  };
}

function vocabEntries(lesson) {
  const entries = [];
  for (const pv of lesson.phrasalVerbs || []) {
    entries.push({
      label: pv.verb,
      definition: pv.definition,
      usageTip: pv.usageTip || null,
      type: 'phrasal'
    });
  }
  for (const idiom of lesson.idioms || []) {
    entries.push({
      label: idiom.idiom,
      definition: idiom.definition,
      usageTip: idiom.usageTip || null,
      type: 'idiom'
    });
  }
  return entries;
}

function findVocabEntry(lesson, answer, displayForm) {
  const entries = vocabEntries(lesson);
  const candidates = [normalizePhrase(answer), normalizePhrase(displayForm)].filter(Boolean);

  for (const norm of candidates) {
    for (const entry of entries) {
      if (normalizePhrase(entry.label) === norm) return entry;
    }
  }

  let best = null;
  let bestLen = 0;
  for (const entry of entries) {
    const labelNorm = normalizePhrase(entry.label);
    for (const norm of candidates) {
      if (!norm) continue;
      if (norm.includes(labelNorm) || labelNorm.includes(norm)) {
        if (labelNorm.length > bestLen) {
          best = entry;
          bestLen = labelNorm.length;
        }
      }
      const labelWords = labelNorm.split(' ');
      const tail = norm.split(' ').slice(-labelWords.length).join(' ');
      if (tail === labelNorm && labelNorm.length > bestLen) {
        best = entry;
        bestLen = labelNorm.length;
      }
    }
  }
  return best;
}

function findFillInExplanation(lesson, answer, displayForm, label) {
  const norms = [
    normalizePhrase(answer),
    normalizePhrase(displayForm),
    normalizePhrase(label)
  ].filter(Boolean);

  for (const ex of lesson.fillInExercises || []) {
    const correct = normalizePhrase(ex.correct);
    if (norms.includes(correct) && ex.explanation) return ex.explanation;
  }

  if (!label) return '';

  const labelNorm = normalizePhrase(label);
  let best = '';
  let bestLen = 0;
  for (const ex of lesson.fillInExercises || []) {
    const correct = normalizePhrase(ex.correct);
    if (!ex.explanation || !correct) continue;
    if (correct === labelNorm || labelNorm.includes(correct) || correct.includes(labelNorm)) {
      if (correct.length > bestLen) {
        best = ex.explanation;
        bestLen = correct.length;
      }
    }
  }
  return best;
}

function lineWithAnswer(text, answer) {
  return String(text || '').replace(/\[([^\]]+)\]/, answer).replace(/\s+/g, ' ').trim();
}

function buildWhyCorrect(entry, legacy, answer) {
  if (legacy) return ensurePeriod(stripMd(legacy));
  const label = entry ? entry.label : answer;
  return ensurePeriod(`*${label}* fits naturally in this line of the dialogue.`);
}

function buildVocabularyFocus(entry) {
  if (!entry) return '';
  return ensurePeriod(`*${entry.label}* — ${entry.definition}`);
}

function buildCommonMistake(answer, entry) {
  const term = entry ? entry.label : answer;
  return ensurePeriod(
    `Do not confuse this with other items from the lesson — here you need *${answer}* (*${term}*).`
  );
}

function buildWrongOptions(lesson, answer, entry) {
  const wrongOptions = {};
  const answerNorm = normalizePhrase(answer);
  const entryNorm = entry ? normalizePhrase(entry.label) : answerNorm;

  for (const other of vocabEntries(lesson)) {
    const key = other.label;
    const keyNorm = normalizePhrase(key);
    if (keyNorm === answerNorm || keyNorm === entryNorm) continue;
    const shortDef = stripMd(other.definition).split(/[.;]/)[0];
    wrongOptions[key] = ensurePeriod(
      `*${key}* (${shortDef}) does not match the meaning needed in this line.`
    );
  }
  return wrongOptions;
}

function buildUsefulTip(entry) {
  if (entry?.usageTip) return ensurePeriod(entry.usageTip);
  if (entry?.type === 'phrasal') {
    return ensurePeriod(`In conversation, *${entry.label}* is often used in informal spoken English.`);
  }
  if (entry?.type === 'idiom') {
    return ensurePeriod(`Learn *${entry.label}* as a fixed phrase — the words together create the meaning.`);
  }
  return 'Read the whole dialogue aloud; the correct phrase should sound natural in context.';
}

function buildExplanationContent(lesson, line, parsed) {
  const legacy = line.explanation || '';
  const entry = findVocabEntry(lesson, parsed.answer, parsed.displayForm);
  const fillLegacy = findFillInExplanation(lesson, parsed.answer, parsed.displayForm, entry?.label);
  const whySource = legacy || fillLegacy;

  return {
    whyCorrect: buildWhyCorrect(entry, whySource, parsed.answer),
    vocabularyFocus: buildVocabularyFocus(entry),
    sentenceBreakdown: lineWithAnswer(line.text, parsed.displayForm || parsed.answer),
    commonMistake: buildCommonMistake(parsed.answer, entry),
    wrongOptions: buildWrongOptions(lesson, parsed.answer, entry),
    usefulTip: buildUsefulTip(entry)
  };
}

function migrateLine(lesson, line, force) {
  const text = line.text || '';
  const match = text.match(/\[([^\]]+)\]/);
  if (!match) return false;
  if (line.explanationContent && !force) return false;

  const parsed = parseConvBracket(match[1]);
  line.explanationContent = buildExplanationContent(lesson, line, parsed);
  if (line.explanation) delete line.explanation;
  return true;
}

function migrateFile(filePath, force) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const conv of data.conversations || []) {
    for (const line of conv.lines || []) {
      if (migrateLine(data, line, force)) changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  return changed;
}

function main() {
  const force = process.argv.includes('--force');
  const files = DATA_DIRS.flatMap((dir) => walkJsonFiles(dir));
  let total = 0;

  for (const file of files) {
    const n = migrateFile(file, force);
    if (n > 0) {
      total += n;
      console.log(n, path.relative(ROOT, file));
    }
  }

  console.log('Migrated', total, 'conversation gap line(s)');
}

main();
