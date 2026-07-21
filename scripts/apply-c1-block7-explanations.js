#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 7: Review7
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u7-exa-1': 'Verb HIGHLIGHTS + noun EXTENT → **highlights** the **extent**.',
  'c1-u7-exa-2': 'Passive PORTION + go to LENGTHS → **apportioned** unfairly; **lengths** to recruit.',
  'c1-u7-exa-3': 'Linking adverb from ADD → **Additionally**.',
  'c1-u7-exa-4': 'Funding proposal withdrawn → **withdrawn** (past participle of DRAW).',
  'c1-u7-exa-5': 'Not CONSIDER + double negative → burden is not **inconsiderable**.',
  'c1-u7-exa-6': 'MAJOR + PAY → **majority** fell behind on **payments**.',
  'c1-u7-exa-7': 'Opposite of majority → a **minority** of borrowers.',

  'c1-u7-exb-1': 'Risky behaviour → **skating on thin ice**.',
  'c1-u7-exb-2': 'Gets irritated easily → **has a short temper**.',
  'c1-u7-exb-3': 'Worthwhile activity → **it pays to compare** prices.',
  'c1-u7-exb-4': 'Get full value → **got my money\'s worth**.',
  'c1-u7-exb-5': 'Preoccupied with worries → **has a lot on his mind**.',
  'c1-u7-exb-6': 'Search everywhere → **you had searched high and low**.',
  'c1-u7-exb-7': 'Can\'t cope with difficulty → **I was not out of my depth in**.',
  'c1-u7-exb-8': 'Unlucky one chosen → **had not drawn the short straw**.',

  'c1-u7-exc-1': 'Loan on a house → paid off the **mortgage**.',
  'c1-u7-exc-2': 'Direct debit → bills go out by direct **debit**.',
  'c1-u7-exc-3': 'First instalment → first down **payment**.',
  'c1-u7-exc-4': 'Lump sum vs monthly → single lump **sum**.',
  'c1-u7-exc-5': 'Retirement income → state **pension**.',
  'c1-u7-exc-6': 'Borrow when account is empty → **overdraft** facility.',
  'c1-u7-exc-7': 'Upfront rental payment → 20% **deposit**.',
  'c1-u7-exc-8': 'Court award for injury → **compensation**.',

  'c1-u7-exd-1': 'Share costs → **club** together.',
  'c1-u7-exd-2': 'Generate enthusiasm → **drum** up enthusiasm.',
  'c1-u7-exd-3': 'Accumulate hours → **clocked** up flying time.',
  'c1-u7-exd-4': 'Costs increasing → **mounting** up.',
  'c1-u7-exd-5': 'Evaluate options → **size** the options up.',
  'c1-u7-exd-6': 'Divide into smaller parts → **break** it down.',
  'c1-u7-exd-7': 'Repay a loan → **pay** her back.',
  'c1-u7-exd-8': 'Buying eagerly → **buying** up properties.',

  'c1-u7-exe-1': 'It\'s high time + past simple → **you thought**.',
  'c1-u7-exe-2': 'Would rather + past → **didn\'t say**.',
  'c1-u7-exe-3': 'Wish + infinitive → **to submit**.',
  'c1-u7-exe-4': 'Regret about past possibility → **could have had**.',
  'c1-u7-exe-5': 'Wish about present → **didn\'t have** to prepare.',
  'c1-u7-exe-6': 'Inverted third conditional → **Had the service been** any slower.',
  'c1-u7-exe-7': 'Hypothetical unless → **showed** me proper identification.',
  'c1-u7-exe-8': 'Imagine + past perfect → **hadn\'t been** invented.'
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

const files = ['Review7.v2.json'];
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
