#!/usr/bin/env node
/**
 * Migrate "correct the mistake" exercises to the standardized 4-part explanation format:
 *   question, fix, whyCorrect, correctedSentence
 *
 * Usage: node scripts/migrate-mistake-explanation-format.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildMistakeExplanationContent,
  isMistakeCorrectionFullSentence
} from './lib/mistake-explanation-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data', 'Course');

function walkJsonFiles(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJsonFiles(full, files);
    else if (name.endsWith('.v2.json') || name.endsWith('.v2-test.json')) files.push(full);
  }
  return files;
}

function shouldMigrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft === 'error_correction' || item.formatType === 'error_correction') return true;
  if (ft === 'full_sentence_write' || item.formatType === 'full_sentence_write') {
    return isMistakeCorrectionFullSentence(item, exercise);
  }
  return false;
}

function migrateItem(item, exercise) {
  if (!shouldMigrateItem(item, exercise)) return false;

  const existing = item.explanationContent || {};
  const next = buildMistakeExplanationContent(item, exercise, existing);
  item.explanationContent = next;
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
