#!/usr/bin/env node
/**
 * Promote v2 units into the learning path:
 * - Point UnitN entries at UnitN.v2.json when available
 * - Remove duplicate UnitN-v2 / UnitN-v2-test / UnitN-v2-pilot index entries
 * - Strip [V2]/[TEST]/[PILOT] from titles and unitTitle fields
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const PILOT_RE = /^\[(?:V2|TEST|PILOT)\]\s*/i;

function sanitizeTitle(title) {
  if (!title) return title;
  return String(title).replace(PILOT_RE, '').replace(/\s*\(v2\)\s*$/i, '').trim();
}

function promoteIndex(level) {
  const indexPath = path.join(ROOT, 'data/Course', level, 'index.json');
  if (!fs.existsSync(indexPath)) return;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const courseDir = path.join(ROOT, 'data/Course', level);
  const v2Files = new Set(
    fs.readdirSync(courseDir)
      .filter(function(f) { return /^Unit\d+\.v2\.json$/.test(f); })
      .map(function(f) { return f.replace('.v2.json', ''); })
  );

  const kept = [];
  const seen = new Set();

  (index.items || []).forEach(function(item) {
    if (!item || !item.id) return;
    if (/-v2-test$/.test(item.id) || /-v2-pilot$/.test(item.id) || /-v2$/.test(item.id)) {
      return;
    }
    if (seen.has(item.id)) return;
    seen.add(item.id);

    const unitMatch = item.id.match(/^Unit(\d+)$/);
    if (unitMatch) {
      const unitKey = 'Unit' + unitMatch[1];
      const v2Path = path.join(courseDir, unitKey + '.v2.json');
      const nativeV2Path = path.join(courseDir, unitKey + '.json');
      if (v2Files.has(unitKey) && fs.existsSync(v2Path)) {
        const nativeIsV2 = fs.existsSync(nativeV2Path) &&
          fs.readFileSync(nativeV2Path, 'utf8').includes('sune-english-unit-v2');
        if (!nativeIsV2) {
          item.file = unitKey + '.v2.json';
        }
      }
    }

    item.title = sanitizeTitle(item.title);
    kept.push(item);
  });

  index.items = kept;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
  console.log(level + ': kept ' + kept.length + ' index items');
}

function stripV2UnitTitles(level) {
  const courseDir = path.join(ROOT, 'data/Course', level);
  if (!fs.existsSync(courseDir)) return;
  fs.readdirSync(courseDir).forEach(function(file) {
    if (!file.endsWith('.v2.json')) return;
    const filePath = path.join(courseDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.unitTitle) {
      const cleaned = sanitizeTitle(data.unitTitle);
      if (cleaned !== data.unitTitle) {
        data.unitTitle = cleaned;
        if (data.migrationMeta) {
          data.migrationMeta.pilot = false;
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log('  cleaned unitTitle in ' + file);
      }
    }
  });
}

['B1', 'B2', 'C1'].forEach(function(level) {
  console.log('\n=== ' + level + ' ===');
  promoteIndex(level);
  stripV2UnitTitles(level);
});

console.log('\nDone.');
