#!/usr/bin/env node
/**
 * Migrate comma_placement items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-comma-placement-explanations.js
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

function isNoCommaAnswer(answer) {
  return /^no commas/i.test(String(answer || '').trim());
}

function interactionMode(item, exercise) {
  const interaction = exercise.interaction || {};
  return item.interactionMode || item.commaMode ||
    interaction.commaPlacementMode || interaction.mode || 'tap_comma_slots';
}

function isDefiningClause(item) {
  return isNoCommaAnswer(item.answer);
}

function expandLegacyWhy(item, legacy) {
  const stripped = stripMd(legacy);
  if (stripped) return ensurePeriod(stripped);

  if (isDefiningClause(item)) {
    return ensurePeriod('No commas are needed — the relative clause defines which noun is meant.');
  }
  return ensurePeriod('Add commas around the non-defining relative clause that gives extra information.');
}

function detectGrammarFocus(item, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const sentence = String(item.sentence || '').toLowerCase();

  if (isDefiningClause(item) || /defining/.test(text)) {
    return 'Defining relative clauses identify which person or thing — they are essential and are not separated by commas.';
  }
  if (/non-defining|extra information/.test(text)) {
    return 'Non-defining relative clauses add extra information — use commas before and after the clause.';
  }
  if (/\bwho\b|\bwhich\b|\bthat\b/.test(sentence)) {
    return 'Check if the relative clause is defining (essential) or non-defining (extra detail) — only non-defining clauses take commas.';
  }
  return 'Commas separate non-defining clauses, list items, and introductory phrases from the main clause.';
}

function buildSentenceBreakdown(item) {
  const answer = String(item.answer || '').trim();
  const sentence = String(item.sentence || '').trim();
  if (isNoCommaAnswer(answer)) return ensurePeriod(sentence);
  return ensurePeriod(answer);
}

function buildCommonMistake(item) {
  if (isDefiningClause(item)) {
    return 'Do not add commas around a defining who/which/that clause — it is essential to the meaning.';
  }
  return 'Non-defining clauses need commas on both sides — missing either comma makes the sentence incorrect.';
}

function buildUsefulTip(item, exercise) {
  const mode = interactionMode(item, exercise);
  if (mode === 'rewrite_sentence') {
    return 'If the clause only adds extra detail you could remove, write commas around it; if it identifies which one, write "No commas".';
  }
  return 'Tap only where a comma belongs — non-defining clauses need a comma before and after the extra information.';
}

function buildWrongOptions(item) {
  const wrongOptions = {};
  if (isDefiningClause(item)) {
    wrongOptions['(comma added)'] = 'A comma here would wrongly treat the clause as extra information.';
  } else {
    wrongOptions['(no comma)'] = 'Missing commas around a non-defining clause makes the sentence harder to read and grammatically incorrect.';
  }
  return wrongOptions;
}

function buildExplanationContent(item, exercise) {
  const legacy = item.explanation || '';
  return {
    whyCorrect: expandLegacyWhy(item, legacy),
    grammarFocus: ensurePeriod(detectGrammarFocus(item, legacy)),
    sentenceBreakdown: buildSentenceBreakdown(item),
    wrongOptions: buildWrongOptions(item),
    commonMistake: ensurePeriod(buildCommonMistake(item)),
    usefulTip: ensurePeriod(buildUsefulTip(item, exercise))
  };
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'comma_placement' && item.formatType !== 'comma_placement') return false;

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
    if (ft !== 'comma_placement' && exercise.formatType !== 'comma_placement') continue;

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
