#!/usr/bin/env node
/**
 * Backfill explanationContent.optionContrast for multiple-choice exercise types.
 * Keeps existing explanationContent fields intact.
 *
 * Usage: node scripts/backfill-option-contrast.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureExplanationOptionContrast } from './lib/option-contrast.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data', 'Course');

const CHOICE_FORMATS = new Set([
  'two_option_choice',
  'mc_4_option',
  'meaning_contrast',
  'guided_error_choice'
]);

function walkJsonFiles(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJsonFiles(full, files);
    else if (name.endsWith('.v2.json')) files.push(full);
  }
  return files;
}

function migrateGapItem(gap) {
  if (!gap || !gap.explanationContent) return false;
  return ensureExplanationOptionContrast(gap);
}

function migrateItem(item, exerciseType) {
  const ft = item.formatType || exerciseType;
  if (!CHOICE_FORMATS.has(ft)) {
    if (ft !== 'mc_4_option' || !item.gaps) return 0;
    let changed = 0;
    for (const gap of item.gaps || []) {
      if (migrateGapItem(gap)) changed++;
    }
    return changed;
  }

  if (!item.explanationContent) return 0;
  return ensureExplanationOptionContrast(item) ? 1 : 0;
}

function migrateGuidedItems(item) {
  let changed = 0;
  for (const subItem of item.items || []) {
    if (!subItem.explanationContent) continue;
    if (ensureExplanationOptionContrast(subItem)) changed++;
  }
  return changed;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    const ft = exercise.exerciseType || exercise.interaction?.formatType;
    for (const item of exercise.items || []) {
      changed += migrateItem(item, ft);
      if (ft === 'guided_error_choice' || item.formatType === 'guided_error_choice') {
        changed += migrateGuidedItems(item);
      }
      if (item.gaps) {
        for (const gap of item.gaps) {
          if (migrateGapItem(gap)) changed++;
        }
      }
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
  const touched = [];

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      total += n;
      touched.push({ file: path.relative(ROOT, file), count: n });
    }
  }

  console.log('Backfilled optionContrast on', total, 'items in', touched.length, 'files');
  touched.forEach(({ file, count }) => console.log(' ', count, file));
}

main();
