#!/usr/bin/env node
/**
 * Remove legacy course JSON files that are superseded by .v2.json entries in index.json.
 *
 * Safe to run when index.json already points at UnitN.v2.json / ReviewN.v2.json and the
 * legacy UnitN.json / ReviewN.json copy is only kept from migration.
 *
 * Usage:
 *   node scripts/cleanup-legacy-course-json.js [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LEVELS = ['B1', 'B2', 'C1'];
const dryRun = process.argv.includes('--dry-run');

function legacyPathForV2(file) {
  if (!file || !file.endsWith('.v2.json')) return null;
  return file.replace(/\.v2\.json$/, '.json');
}

function collectReferencedFiles(level) {
  const indexPath = path.join(ROOT, 'data/Course', level, 'index.json');
  if (!fs.existsSync(indexPath)) return new Set();
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const refs = new Set();
  (index.items || []).forEach(function(item) {
    if (item && item.file) refs.add(item.file);
  });
  return refs;
}

let removed = 0;
let skipped = 0;

LEVELS.forEach(function(level) {
  const courseDir = path.join(ROOT, 'data/Course', level);
  if (!fs.existsSync(courseDir)) return;

  const referenced = collectReferencedFiles(level);
  console.log('\n=== ' + level + ' ===');

  fs.readdirSync(courseDir).forEach(function(file) {
    if (!file.endsWith('.v2.json')) return;
    const legacyName = legacyPathForV2(file);
    if (!legacyName) return;

    const legacyPath = path.join(courseDir, legacyName);
    if (!fs.existsSync(legacyPath)) return;

    const v2Name = file;
    if (!referenced.has(v2Name)) {
      console.log('  skip ' + legacyName + ' (index does not reference ' + v2Name + ')');
      skipped++;
      return;
    }
    if (referenced.has(legacyName)) {
      console.log('  skip ' + legacyName + ' (still referenced in index.json)');
      skipped++;
      return;
    }

    if (dryRun) {
      console.log('  would remove ' + level + '/' + legacyName);
    } else {
      fs.unlinkSync(legacyPath);
      console.log('  removed ' + level + '/' + legacyName);
    }
    removed++;
  });
});

console.log('\n' + (dryRun ? 'Would remove' : 'Removed') + ': ' + removed + ', skipped: ' + skipped);
if (dryRun) console.log('Run without --dry-run to delete files.');
