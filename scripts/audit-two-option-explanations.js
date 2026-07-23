#!/usr/bin/env node
/**
 * Audit all two_option_choice items across the course.
 * Exits 1 when any item is missing required explanation fields.
 *
 * Usage: node scripts/audit-two-option-explanations.js
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

function isTwoOptionChoiceItem(exercise, item) {
  return item.formatType === 'two_option_choice' ||
    exercise.exerciseType === 'two_option_choice';
}

function wrongOptions(item) {
  const answer = String(item.answer || '').trim();
  return (item.options || []).filter((o) => String(o).trim() !== answer);
}

function hasOptionContrast(item, ec) {
  const contrast = ec.optionContrast || {};
  return wrongOptions(item).every((opt) => {
    const key = String(opt).trim();
    const line = contrast[key];
    return line && /doesn't fit here\s*→/.test(line);
  });
}

function main() {
  const issues = [];
  let total = 0;

  for (const file of walkJsonFiles(COURSE_DIR)) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      continue;
    }

    const rel = path.relative(ROOT, file);
    for (const exercise of data.contentBanks?.exercises || []) {
      for (const item of exercise.items || []) {
        if (!isTwoOptionChoiceItem(exercise, item)) continue;
        total++;

        const id = item.id || exercise.id || 'unknown';
        if (item.explanation) {
          issues.push(`${rel} ${id}: still uses legacy explanation string`);
          continue;
        }

        const ec = item.explanationContent;
        if (!ec) {
          issues.push(`${rel} ${id}: missing explanationContent`);
          continue;
        }
        if (!ec.whyCorrect || !String(ec.whyCorrect).trim()) {
          issues.push(`${rel} ${id}: explanationContent.whyCorrect is empty`);
        }
        if (!hasOptionContrast(item, ec)) {
          issues.push(`${rel} ${id}: missing optionContrast for wrong option(s)`);
        }
      }
    }
  }

  console.log(`Audited ${total} two_option_choice items in ${walkJsonFiles(COURSE_DIR).length} course files`);

  if (!issues.length) {
    console.log('PASS all two_option_choice items have explanationContent with whyCorrect and optionContrast');
    return;
  }

  console.error(`FAIL ${issues.length} issue(s):`);
  issues.forEach((issue) => console.error(' -', issue));
  process.exit(1);
}

main();
