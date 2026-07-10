#!/usr/bin/env node
/**
 * Rebuild theory blocks for vocabulary v2 units from legacy source JSON.
 *
 * Usage:
 *   node scripts/legacy-to-v2/patch-vocab-theory.js
 *   node scripts/legacy-to-v2/patch-vocab-theory.js --level B1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildVocabTheory } from './lib/convert-theory.js';
import { slugify } from './lib/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  var opts = { levels: ['B1', 'B2', 'C1'] };
  for (var i = 2; i < argv.length; i++) {
    if (argv[i] === '--level' && argv[i + 1]) opts.levels = [argv[++i]];
  }
  return opts;
}

function isLegacyUnitFile(name) {
  return /^Unit\d+\.json$/.test(name);
}

function patchLevel(level) {
  var levelDir = path.join(ROOT, 'data/Course', level);
  if (!fs.existsSync(levelDir)) return [];

  var results = [];
  fs.readdirSync(levelDir)
    .filter(isLegacyUnitFile)
    .forEach(function(name) {
      var unitNum = parseInt(name.replace(/^Unit(\d+)\.json$/, '$1'), 10);
      var legacyPath = path.join(levelDir, name);
      var legacyUnit = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
      if (legacyUnit.type !== 'vocabulary') return;

      var v2Path = path.join(levelDir, 'Unit' + unitNum + '.v2.json');
      if (!fs.existsSync(v2Path)) {
        results.push({ level: level, unit: unitNum, status: 'skipped_no_v2' });
        return;
      }

      var v2Unit = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
      var unitPrefix = slugify(level) + '-u' + unitNum;
      var theory = buildVocabTheory(legacyUnit, unitPrefix);
      var prevCardCount = (v2Unit.theory && v2Unit.theory.cards && v2Unit.theory.cards.length) || 0;
      v2Unit.theory = theory;
      fs.writeFileSync(v2Path, JSON.stringify(v2Unit, null, 2) + '\n');
      results.push({
        level: level,
        unit: unitNum,
        status: 'patched',
        cards: theory.cards.length,
        prevCards: prevCardCount
      });
    });

  return results;
}

function main() {
  var opts = parseArgs(process.argv);
  var all = [];
  opts.levels.forEach(function(level) {
    all = all.concat(patchLevel(level));
  });

  var patched = all.filter(function(r) { return r.status === 'patched'; });
  console.log('Patched ' + patched.length + ' vocabulary unit(s).');
  patched.forEach(function(r) {
    console.log('  ' + r.level + ' Unit' + r.unit + ': ' + r.prevCards + ' -> ' + r.cards + ' theory card(s)');
  });

  var skipped = all.filter(function(r) { return r.status !== 'patched'; });
  if (skipped.length) {
    console.log('Skipped ' + skipped.length + ' unit(s) without v2 file.');
  }
}

main();
