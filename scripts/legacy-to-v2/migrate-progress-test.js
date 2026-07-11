#!/usr/bin/env node
/**
 * Migrate legacy course progress tests to Sune Play v2 schema.
 *
 * Usage:
 *   node scripts/legacy-to-v2/migrate-progress-test.js --level B1
 *   node scripts/legacy-to-v2/migrate-progress-test.js --input data/Course/B1/ProgressTest1.json --level B1
 *   node scripts/legacy-to-v2/migrate-progress-test.js --all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildProgressTestUnit } from './build-progress-test.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const LEVELS = ['B1', 'B2', 'C1'];

function parseArgs(argv) {
  var opts = { all: false };
  for (var i = 2; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--level' && argv[i + 1]) opts.level = argv[++i];
    else if (arg === '--input' && argv[i + 1]) opts.input = argv[++i];
    else if (arg === '--output' && argv[i + 1]) opts.output = argv[++i];
    else if (arg === '--all') opts.all = true;
  }
  return opts;
}

function loadJson(pathname) {
  var raw = fs.readFileSync(pathname, 'utf8').trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(raw);
}

function migrateFile(inputPath, level, outputPath) {
  var legacy = loadJson(inputPath);
  if (legacy.schemaVersion && String(legacy.schemaVersion).includes('v2')) {
    console.log('Skip (already v2):', path.relative(ROOT, inputPath));
    return false;
  }
  var testMatch = path.basename(inputPath).match(/^ProgressTest(\d+)\.json$/i);
  var testNum = testMatch ? parseInt(testMatch[1], 10) : 1;
  var result = buildProgressTestUnit(legacy, {
    level: level,
    testNum: testNum,
    sourceFile: path.relative(ROOT, inputPath)
  });
  fs.writeFileSync(outputPath, JSON.stringify(result.unit, null, 2) + '\n');
  console.log('Wrote', path.relative(ROOT, outputPath),
    '| exercises:', result.stats.legacyExerciseCount,
    '| screens:', result.stats.estimatedScreens);
  return true;
}

function main() {
  var opts = parseArgs(process.argv);

  if (opts.all) {
    var count = 0;
    LEVELS.forEach(function(level) {
      var dir = path.join(ROOT, 'data/Course', level);
      fs.readdirSync(dir)
        .filter(function(name) { return /^ProgressTest\d+\.json$/i.test(name) && !name.endsWith('.v2.json'); })
        .sort()
        .forEach(function(name) {
          var inputPath = path.join(dir, name);
          var outputPath = path.join(dir, name.replace(/\.json$/, '.v2.json'));
          if (migrateFile(inputPath, level, outputPath)) count++;
        });
    });
    console.log('\nMigrated', count, 'progress test files');
    return;
  }

  if (opts.input) {
    var inputPath = path.resolve(ROOT, opts.input);
    var level = opts.level || path.basename(path.dirname(inputPath));
    var outputPath = opts.output
      ? path.resolve(ROOT, opts.output)
      : inputPath.replace(/\.json$/, '.v2.json');
    migrateFile(inputPath, level, outputPath);
    return;
  }

  if (!opts.level) {
    console.error('Provide --level, --input, or --all');
    process.exit(1);
  }

  var dir = path.join(ROOT, 'data/Course', opts.level);
  fs.readdirSync(dir)
    .filter(function(name) { return /^ProgressTest\d+\.json$/i.test(name) && !name.endsWith('.v2.json'); })
    .sort()
    .forEach(function(name) {
      migrateFile(path.join(dir, name), opts.level, path.join(dir, name.replace(/\.json$/, '.v2.json')));
    });
}

main();
