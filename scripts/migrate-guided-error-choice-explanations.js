#!/usr/bin/env node
/**
 * Migrate guided_error_choice items to structured `explanationContent`.
 *
 * Usage: node scripts/migrate-guided-error-choice-explanations.js
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

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function isGuidedErrorExercise(exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType;
  return ft === 'guided_error_choice';
}

function isGuidedErrorItem(item, exercise) {
  if (item.formatType === 'guided_error_choice') return true;
  if (isGuidedErrorExercise(exercise)) return true;
  return !!(item.wrong || item.targetPhrase) && Array.isArray(item.options) && item.answer != null;
}

function detectGrammarFocus(item, legacy) {
  const text = (stripMd(legacy) + ' ' + String(item.sentence || '')).toLowerCase();
  const wrong = String(item.wrong || item.targetPhrase || '').toLowerCase();
  const answer = String(item.answer || '').toLowerCase();

  if (/\bwere\b/.test(answer) && /\bwas\b/.test(wrong)) {
    return 'After *if* in formal English, use *were* for the subjunctive — *If I were you*.';
  }
  if (/\ban\b/.test(answer) && /\ba\b/.test(wrong)) {
    return 'Use *an* before vowel sounds and *a* before consonant sounds.';
  }
  if (/\ba\b/.test(answer) && /\ban\b/.test(wrong)) {
    return 'Use *a* before consonant sounds — check the next word, not the spelling of the noun.';
  }
  if (text) return ensurePeriod(stripMd(legacy));
  return 'Compare the wrong form with each option — only one fits the grammar rule.';
}

function buildWhyCorrect(item, legacy) {
  const wrong = item.wrong || item.targetPhrase || '';
  const answer = String(item.answer || '').trim();
  const stripped = stripMd(legacy);

  if (stripped) {
    return ensurePeriod(`Replace *${wrong}* with *${answer}* — ${stripped}`);
  }
  if (item.sentence) {
    return ensurePeriod(`In "${item.sentence}", *${answer}* is the correct form instead of *${wrong}*.`);
  }
  return ensurePeriod(`Choose *${answer}* instead of the incorrect form *${wrong}*.`);
}

function buildWrongOptions(item) {
  const answer = String(item.answer || '').trim();
  const wrongOptions = {};
  for (const opt of item.options || []) {
    const key = String(opt).trim();
    if (!key) continue;
    if (key.toLowerCase() === answer.toLowerCase()) continue;
    wrongOptions[key] = `*${key}* is not the correct replacement for *${item.wrong || item.targetPhrase || 'the wrong form'}*.`;
  }
  return wrongOptions;
}

function buildCommonMistake(item) {
  const wrong = item.wrong || item.targetPhrase || '';
  const answer = String(item.answer || '').trim();
  return ensurePeriod(`Do not keep *${wrong}* — the correct form here is *${answer}*.`);
}

function buildUsefulTip(item) {
  if (item.sentence) {
    return 'Read the full sentence in your head with each option before you tap Check.';
  }
  return 'Eliminate options that do not fix the underlined wrong form.';
}

function buildExplanationContent(item, exercise) {
  const legacy = item.explanation || '';
  return {
    whyCorrect: buildWhyCorrect(item, legacy),
    grammarFocus: detectGrammarFocus(item, legacy),
    wrongOptions: buildWrongOptions(item),
    commonMistake: buildCommonMistake(item),
    usefulTip: buildUsefulTip(item)
  };
}

function migrateItem(item, exercise) {
  if (!isGuidedErrorItem(item, exercise)) return false;
  if (item.explanationContent) return false;

  item.explanationContent = buildExplanationContent(item, exercise);
  delete item.explanation;
  return true;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    if (!isGuidedErrorExercise(exercise)) continue;
    for (const item of exercise.items || []) {
      if (migrateItem(item, exercise)) changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  return changed;
}

function main() {
  const files = walkJsonFiles(COURSE_DIR);
  let total = 0;

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      total += n;
      console.log(n, path.relative(ROOT, file));
    }
  }

  console.log('Migrated', total, 'guided_error_choice item(s)');
}

main();
