#!/usr/bin/env node
/**
 * Migrate meaning_contrast exercises to structured explanationContent.
 * Scans v2 unit files (contentBanks items) and legacy unit JSON (customScreens).
 *
 * Usage: node scripts/migrate-meaning-contrast-explanations.js
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

function buildContentFromLegacy(item) {
  const legacy = item.explanation || '';
  const answer = String(item.answer || '').trim();
  const wrong = (item.options || []).find((o) => String(o).trim() !== answer);
  const wrongStr = wrong ? String(wrong).trim() : '';
  const sentence = String(item.sentence || '').trim();

  let whyCorrect = legacy
    ? ensurePeriod(legacy)
    : ensurePeriod(`In this context, "${answer}" is the meaning of the sentence`);

  let grammarFocus = '';
  if (/think|opinion|considering|stative|continuous/i.test(sentence + legacy)) {
    grammarFocus = 'Some verbs change meaning in continuous forms — a state verb can become an action verb.';
  } else if (sentence) {
    grammarFocus = `Read the full sentence and decide which option best captures its meaning.`;
  }

  const wrongOptions = {};
  if (wrongStr) {
    wrongOptions[wrongStr] = `"${wrongStr}" does not match what the sentence is expressing${
      sentence ? ` ("${sentence}")` : ''
    }.`;
  }

  return {
    whyCorrect,
    ...(grammarFocus ? { grammarFocus: ensurePeriod(grammarFocus) } : {}),
    wrongOptions,
    usefulTip: 'Focus on what the speaker is doing with their mind — stating a view or actively weighing a choice.'
  };
}

function migrateMeaningContrastItem(item) {
  if (item.formatType !== 'meaning_contrast' && !item.sentence) return false;
  if (item.formatType !== 'meaning_contrast') return false;

  if (!item.explanationContent) {
    item.explanationContent = buildContentFromLegacy(item);
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
      if (migrateMeaningContrastItem(item)) changed++;
    }
  }

  for (const node of data.practiceNodes || []) {
    for (const custom of node.customScreens || []) {
      if (custom.formatType !== 'meaning_contrast') continue;
      if (!custom.explanationContent) {
        custom.explanationContent = buildContentFromLegacy(custom);
      }
      delete custom.explanation;
      changed++;
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

  console.log('Migrated', total, 'meaning_contrast item(s)');
}

main();
