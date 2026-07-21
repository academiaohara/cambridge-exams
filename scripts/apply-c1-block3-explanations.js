#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 3: Review3
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u3-exa-1': 'Plural WORK + overtime + MANAGE → **Workers**, **overtime**, **management**.',
  'c1-u3-exa-2': 'Noun PRODUCE + adjective COMPETE → **production**, **competitive**.',
  'c1-u3-exa-3': 'EMPLOY forms + periodic adverb → **employer**, **employees**, **Periodically**.',
  'c1-u3-exa-4': 'Outdated and not applicable → **antiquated**, **inapplicable**.',

  'c1-u3-exb-1': 'Very effective → **worked like magic**.',
  'c1-u3-exb-2': 'Great start → **got off to a flying start**.',
  'c1-u3-exb-3': 'On the other hand → **then again** I miss the social side.',
  'c1-u3-exb-4': 'Stop something → **put an end** to cheating.',
  'c1-u3-exb-5': 'Nowadays → **in this day and age**.',
  'c1-u3-exb-6': 'About to do something → **on the point of boarding**.',
  'c1-u3-exb-7': 'Very quick → **will only take a second to** sign.',
  'c1-u3-exb-8': 'Immediately → **at the drop of a hat**.',

  'c1-u3-exc-1': 'Overwhelmed → snowed **under** with complaints.',
  'c1-u3-exc-2': 'Until payday → tide me **over**.',
  'c1-u3-exc-3': 'Appeared unexpectedly → cropped **up**.',
  'c1-u3-exc-4': 'Accept new work → take **on** new projects.',
  'c1-u3-exc-5': 'Pass time leisurely → while the weekend **away**.',
  'c1-u3-exc-6': 'Finish work → knock **off** at five.',
  'c1-u3-exc-7': 'Continue despite resistance → press **on** with the plan.',
  'c1-u3-exc-8': 'Made redundant → laid **off**.',

  'c1-u3-exd-1': 'Future continuous → **will be sitting** on a beach.',
  'c1-u3-exd-2': 'Already correct → future perfect **you\'ll have finished**.',
  'c1-u3-exd-3': 'Offer → **Shall I** make some tea?',
  'c1-u3-exd-4': 'Time clause present → until **he hears** from the coach.',
  'c1-u3-exd-5': 'Present continuous for immediate danger → already correct.',
  'c1-u3-exd-6': 'Future plan → **I\'m going to be** a chef.',
  'c1-u3-exd-7': 'Future in time clause → **we\'ll arrange** a date.',
  'c1-u3-exd-8': 'Emphatic do in question → already correct.',

  'c1-u3-exe-1': 'Duration up to a point → **will have been teaching** for thirty years.',
  'c1-u3-exe-2': 'Scheduled → **due to be** opened next spring.',
  'c1-u3-exe-3': 'Formal future in the past → **was to be** Head of Department.',
  'c1-u3-exe-4': 'Unable to help now → I\'m sorry, I **can\'t**.',
  'c1-u3-exe-5': 'Always on time → incredibly **punctual**.',
  'c1-u3-exe-6': 'Government administration → **civil** service.',
  'c1-u3-exe-7': 'Business area → private **sector**.',
  'c1-u3-exe-8': 'Life stage → difficult **phase** in early teens.'
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

const files = ['Review3.v2.json'];
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
