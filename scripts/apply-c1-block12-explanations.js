#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 12: Review12
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u12-exa-1': 'Noun from CHARACTER → defining **characteristic**.',
  'c1-u12-exa-2': 'Adverb + adjective → live **separately**, anything but **unfamiliar**.',
  'c1-u12-exa-3': 'Noun from RACE → **racism** can take hold.',
  'c1-u12-exa-4': 'LOYAL + APPRECIATE → deep **loyalty**, an **appreciation** of perspectives.',
  'c1-u12-exa-5': 'INHERIT + APPEAR → digital **inheritance**, **disappearance** of privacy.',
  'c1-u12-exa-6': 'PERCEIVE + RELATE → matter of **perception**, **relative** safety.',

  'c1-u12-exb-1': 'Agree to + infinitive → agreed to **meet**.',
  'c1-u12-exb-2': 'Mind + gerund → mind **lowering** your voice.',
  'c1-u12-exb-3': 'Justify + gerund → justifies **speaking** to a colleague.',
  'c1-u12-exb-4': 'Passive make → were made **to return** it.',
  'c1-u12-exb-5': 'Forget + gerund (past memory) → forget **watching**.',
  'c1-u12-exb-6': 'Hesitate to + infinitive → hesitate to **reach** out.',
  'c1-u12-exb-7': 'End up + gerund → end up **losing** our reservation.',
  'c1-u12-exb-8': 'Dare to + infinitive → didn\'t dare to **bring** up.',

  'c1-u12-exc-1': 'Resemble in character → **takes after her grandmother**.',
  'c1-u12-exc-2': 'Suddenly realised → **found myself sitting**.',
  'c1-u12-exc-3': 'Very easy → **was child\'s play**.',
  'c1-u12-exc-4': 'Share interests → **have anything in common with**.',
  'c1-u12-exc-5': 'Give time/freedom → **will free her up to pursue**.',
  'c1-u12-exc-6': 'Got on brilliantly → **got on like a house on fire**.',
  'c1-u12-exc-7': 'Want to do → **feel like walking**.',
  'c1-u12-exc-8': 'Disagree → **didn\'t see eye to eye with**.',

  'c1-u12-exd-1': 'Born into → born **into** a family.',
  'c1-u12-exd-2': 'Features in a film → features **in** a short film.',
  'c1-u12-exd-3': 'Equal to → equal **to** at least sixty percent.',
  'c1-u12-exd-4': 'In one respect → problematic **in** one key respect.',
  'c1-u12-exd-5': 'Public interest → **in** the public interest.',
  'c1-u12-exd-6': 'Native to → native **to** the rainforests.',
  'c1-u12-exd-7': 'In person → attend **in** person.',
  'c1-u12-exd-8': 'Nearest thing to → nearest thing **to** a peaceful experience.',

  'c1-u12-exe-1': 'Opposite statements → **contradicts** everything she claimed.',
  'c1-u12-exe-2': 'Purpose → paused **to check** the diagram.',
  'c1-u12-exe-3': 'Brother or sister → middle **sibling**.',
  'c1-u12-exe-4': 'Consider to be → considered **to be** one of the most innovative.',
  'c1-u12-exe-5': 'Formal mistake → administrative **error**.',
  'c1-u12-exe-6': 'Difference between groups → digital **gap**.',
  'c1-u12-exe-7': 'Gather closely → began to **crowd** around.',
  'c1-u12-exe-8': 'Deserve + passive → didn\'t deserve **to be** criticised.'
};

function applyToFile(filename) {
  const filePath = path.join(COURSE, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = 0;
  let missing = [];
  let skipped = 0;

  (data.contentBanks?.exercises || []).forEach(function(ex) {
    if (PASSAGE_EXPLANATIONS[ex.id]) {
      ex.explanations = PASSAGE_EXPLANATIONS[ex.id];
      updated += PASSAGE_EXPLANATIONS[ex.id].length;
    }
    (ex.items || []).forEach(function(item) {
      if (item.explanation && item.explanation.trim()) {
        skipped++;
        return;
      }
      if (EXPLANATIONS[item.id]) {
        item.explanation = EXPLANATIONS[item.id];
        updated++;
      } else {
        missing.push(item.id);
      }
    });
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  return { file: filename, updated, skipped, missing };
}

const files = ['Review12.v2.json'];
let totalMissing = [];

files.forEach(function(f) {
  const r = applyToFile(f);
  console.log(f + ': updated ' + r.updated + ', skipped ' + r.skipped);
  if (r.missing.length) {
    console.log('  MISSING:', r.missing.join(', '));
    totalMissing = totalMissing.concat(r.missing);
  }
});

if (totalMissing.length) {
  console.error('\nFailed — missing explanations for:', totalMissing.length, 'items');
  process.exit(1);
}
console.log('\nDone.');
