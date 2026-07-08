#!/usr/bin/env node
/**
 * Batch-migrate all legacy units in a course level.
 *
 * Usage:
 *   node scripts/legacy-to-v2/migrate-level.js --level B1
 *   node scripts/legacy-to-v2/migrate-level.js --level B1 --tag "[V2]"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildV2Unit } from './lib/build-unit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  var opts = { tag: '[V2]', updateIndex: true };
  for (var i = 2; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--level' && argv[i + 1]) opts.level = argv[++i];
    else if (arg === '--tag' && argv[i + 1]) opts.tag = argv[++i];
    else if (arg === '--no-index') opts.updateIndex = false;
    else if (arg === '--report-dir' && argv[i + 1]) opts.reportDir = argv[++i];
  }
  return opts;
}

function isLegacyUnitFile(name) {
  return /^Unit\d+\.json$/.test(name);
}

function isAlreadyV2Unit(data) {
  return data.schemaVersion && String(data.schemaVersion).includes('v2');
}

function listUnitNumbers(levelDir) {
  return fs.readdirSync(levelDir)
    .filter(isLegacyUnitFile)
    .map(function(name) { return parseInt(name.replace(/^Unit(\d+)\.json$/, '$1'), 10); })
    .filter(function(n) { return !isNaN(n); })
    .sort(function(a, b) { return a - b; });
}

function migrateOne(level, unitNum, tag, reportDir) {
  var inputPath = path.join(ROOT, 'data/Course', level, 'Unit' + unitNum + '.json');
  var outputPath = path.join(ROOT, 'data/Course', level, 'Unit' + unitNum + '.v2.json');
  var legacyUnit = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  if (isAlreadyV2Unit(legacyUnit)) {
    return {
      unit: unitNum,
      status: 'skipped_native_v2',
      input: path.relative(ROOT, inputPath),
      legacyItems: null,
      v2Items: null
    };
  }

  var result = buildV2Unit(legacyUnit, {
    level: level,
    sourceFile: path.relative(ROOT, inputPath),
    pilotTag: tag
  });

  fs.writeFileSync(outputPath, JSON.stringify(result.unit, null, 2) + '\n');

  if (reportDir) {
    var reportPath = path.join(reportDir, level + '-Unit' + unitNum + '.json');
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      unit: unitNum,
      coverage: result.coverage,
      stats: result.stats
    }, null, 2) + '\n');
  }

  var ambiguous = [];
  result.coverage.forEach(function(row) {
    if (row.notes && row.notes.length) {
      ambiguous.push({ exercise: row.exerciseKey, pattern: row.legacyPattern, notes: row.notes });
    }
  });

  return {
    unit: unitNum,
    status: result.stats.legacyItemCount === result.stats.v2ItemCount ? 'ok' : 'item_mismatch',
    input: path.relative(ROOT, inputPath),
    output: path.relative(ROOT, outputPath),
    title: legacyUnit.unitTitle || ('Unit ' + unitNum),
    type: legacyUnit.type || 'grammar',
    block: legacyUnit.block,
    legacyExercises: result.stats.legacyExerciseCount,
    legacyItems: result.stats.legacyItemCount,
    v2Items: result.stats.v2ItemCount,
    screens: result.stats.estimatedScreens,
    formatTypes: result.stats.formatTypes,
    ambiguous: ambiguous,
    coverage: result.coverage
  };
}

function updateIndexJson(level, results, tag) {
  var indexPath = path.join(ROOT, 'data/Course', level, 'index.json');
  var index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  var items = index.items || [];

  // Remove old pilot v2 entries for units we're batch-migrating
  items = items.filter(function(item) {
    if (!item.id) return true;
    if (item.id.endsWith('-v2-pilot')) return false;
    if (item.id.endsWith('-v2') && item.file && item.file.endsWith('.v2.json')) {
      var m = item.file.match(/^Unit(\d+)\.v2\.json$/);
      if (m && results.some(function(r) { return r.unit === parseInt(m[1], 10) && r.status !== 'skipped_native_v2'; })) {
        return false;
      }
    }
    return true;
  });

  results.forEach(function(r) {
    if (r.status === 'skipped_native_v2') return;
    var id = 'Unit' + r.unit + '-v2';
    var file = 'Unit' + r.unit + '.v2.json';
    var existingIdx = items.findIndex(function(item) { return item.id === id; });
    var entry = {
      id: id,
      type: r.type,
      block: r.block,
      unit: r.unit,
      title: tag + ' ' + r.title,
      file: file,
      status: 'available'
    };
    if (existingIdx >= 0) {
      items[existingIdx] = entry;
    } else {
      var legacyIdx = items.findIndex(function(item) { return item.id === 'Unit' + r.unit; });
      if (legacyIdx >= 0) {
        items.splice(legacyIdx + 1, 0, entry);
      } else {
        items.push(entry);
      }
    }
  });

  index.items = items;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
  return path.relative(ROOT, indexPath);
}

function main() {
  var opts = parseArgs(process.argv);
  if (!opts.level) {
    console.error('Usage: node scripts/legacy-to-v2/migrate-level.js --level B1');
    process.exit(1);
  }

  var levelDir = path.join(ROOT, 'data/Course', opts.level);
  var reportDir = opts.reportDir
    ? path.resolve(ROOT, opts.reportDir)
    : path.join(ROOT, 'scripts/legacy-to-v2/reports', opts.level);

  var unitNums = listUnitNumbers(levelDir);
  var results = unitNums.map(function(n) {
    try {
      return migrateOne(opts.level, n, opts.tag, reportDir);
    } catch (err) {
      return {
        unit: n,
        status: 'error',
        error: err.message
      };
    }
  });

  if (opts.updateIndex) {
    var indexPath = updateIndexJson(opts.level, results, opts.tag);
    console.log('Updated', indexPath);
  }

  var summaryPath = path.join(reportDir, opts.level + '-summary.json');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify({ level: opts.level, results: results }, null, 2) + '\n');

  console.log('\n=== ' + opts.level + ' migration summary ===');
  console.log('Units processed:', results.length);
  console.log('Migrated:', results.filter(function(r) { return r.status === 'ok' || r.status === 'item_mismatch'; }).length);
  console.log('Native v2 skipped:', results.filter(function(r) { return r.status === 'skipped_native_v2'; }).length);
  console.log('Item mismatches:', results.filter(function(r) { return r.status === 'item_mismatch'; }).length);
  console.log('Errors:', results.filter(function(r) { return r.status === 'error'; }).length);
  console.log('Summary written to', path.relative(ROOT, summaryPath));

  var mismatches = results.filter(function(r) { return r.status === 'item_mismatch'; });
  if (mismatches.length) {
    mismatches.forEach(function(r) {
      console.log('MISMATCH Unit' + r.unit + ': legacy=' + r.legacyItems + ' v2=' + r.v2Items);
    });
    process.exit(2);
  }

  var errors = results.filter(function(r) { return r.status === 'error'; });
  if (errors.length) {
    errors.forEach(function(r) { console.error('ERROR Unit' + r.unit + ':', r.error); });
    process.exit(1);
  }
}

main();
