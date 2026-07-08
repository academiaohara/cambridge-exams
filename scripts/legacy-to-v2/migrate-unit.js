#!/usr/bin/env node
/**
 * Migrate legacy course units to Sune Play v2 schema.
 *
 * Usage:
 *   node scripts/legacy-to-v2/migrate-unit.js --level B1 --unit 4
 *   node scripts/legacy-to-v2/migrate-unit.js --input data/Course/C1/Unit2.json --level C1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildV2Unit } from './lib/build-unit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  var opts = { pilotTag: '[PILOT]' };
  for (var i = 2; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--level' && argv[i + 1]) opts.level = argv[++i];
    else if (arg === '--unit' && argv[i + 1]) opts.unit = parseInt(argv[++i], 10);
    else if (arg === '--input' && argv[i + 1]) opts.input = argv[++i];
    else if (arg === '--output' && argv[i + 1]) opts.output = argv[++i];
    else if (arg === '--pilot-tag' && argv[i + 1]) opts.pilotTag = argv[++i];
    else if (arg === '--report' && argv[i + 1]) opts.report = argv[++i];
  }
  return opts;
}

function resolveInput(opts) {
  if (opts.input) return path.resolve(ROOT, opts.input);
  if (!opts.level || !opts.unit) {
    throw new Error('Provide --input or both --level and --unit');
  }
  return path.resolve(ROOT, 'data/Course', opts.level, 'Unit' + opts.unit + '.json');
}

function resolveOutput(inputPath, opts) {
  if (opts.output) return path.resolve(ROOT, opts.output);
  var dir = path.dirname(inputPath);
  var base = path.basename(inputPath, '.json');
  return path.join(dir, base + '.v2.json');
}

function printCoverageReport(coverage, stats) {
  console.log('\n=== Coverage report ===');
  console.log('Exercises:', stats.legacyExerciseCount);
  console.log('Legacy items:', stats.legacyItemCount);
  console.log('V2 items:', stats.v2ItemCount);
  console.log('Estimated screens:', stats.estimatedScreens);
  console.log('Format types:', stats.formatTypes.join(', '));
  console.log('');
  coverage.forEach(function(row) {
    var flag = row.legacyItems === row.v2Items ? 'OK' : 'MISMATCH';
    console.log(
      flag + ' | ' + row.exerciseKey + ' | ' + row.legacyPattern + ' → ' + row.formatType +
      ' | legacy=' + row.legacyItems + ' v2=' + row.v2Items +
      (row.notes && row.notes.length ? ' | ' + row.notes.join('; ') : '')
    );
  });
  if (stats.legacyItemCount !== stats.v2ItemCount) {
    console.log('\n⚠ Item count mismatch: legacy ' + stats.legacyItemCount + ' vs v2 ' + stats.v2ItemCount);
  } else {
    console.log('\n✓ Item counts match');
  }
}

function main() {
  var opts = parseArgs(process.argv);
  var inputPath = resolveInput(opts);
  var outputPath = resolveOutput(inputPath, opts);
  var level = opts.level || path.basename(path.dirname(inputPath));

  if (!fs.existsSync(inputPath)) {
    console.error('Input not found:', inputPath);
    process.exit(1);
  }

  var legacyUnit = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (legacyUnit.schemaVersion && String(legacyUnit.schemaVersion).includes('v2')) {
    console.error('Input already appears to be v2:', inputPath);
    process.exit(1);
  }

  var result = buildV2Unit(legacyUnit, {
    level: level,
    sourceFile: path.relative(ROOT, inputPath),
    pilotTag: opts.pilotTag
  });

  fs.writeFileSync(outputPath, JSON.stringify(result.unit, null, 2) + '\n');
  console.log('Wrote', path.relative(ROOT, outputPath));

  if (opts.report) {
    var reportPath = path.resolve(ROOT, opts.report);
    fs.writeFileSync(reportPath, JSON.stringify({ coverage: result.coverage, stats: result.stats }, null, 2) + '\n');
    console.log('Wrote report', path.relative(ROOT, reportPath));
  }

  printCoverageReport(result.coverage, result.stats);
}

main();
