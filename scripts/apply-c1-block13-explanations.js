#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 13: Review13
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u13-exa-1': 'Open cloze passage → **couch** surfers, **to** listen, **switched**, **between**, **satisfies**, **end**, **out**, **taken**, **too**, **lack**.',

  'c1-u13-exb-1': 'Determined to do → **he has set his heart on moving**.',
  'c1-u13-exb-2': 'No choice → **have no option but to renew**.',
  'c1-u13-exb-3': 'Reported question → **if Maria took an interest in**.',
  'c1-u13-exb-4': 'Relax and enjoy → **was going to let her hair down**.',
  'c1-u13-exb-5': 'Come to a stop → **came to a rest**.',
  'c1-u13-exb-6': 'Unusual for someone → **is not like Daniel to arrive**.',
  'c1-u13-exb-7': 'Decide as you go → **playing it by ear**.',
  'c1-u13-exb-8': 'Impulsive decision → **booked it on a whim**.',

  'c1-u13-exc-1': 'Noun from TEND → a **tendency** to procrastinate.',
  'c1-u13-exc-2': 'Favouring some over others → **preferential** access.',
  'c1-u13-exc-3': 'Unpleasant task → **unenviable** responsibility.',
  'c1-u13-exc-4': 'Minimise seriousness → **downplay** the severity.',
  'c1-u13-exc-5': 'Very selective → incredibly **choosy**.',
  'c1-u13-exc-6': 'Cooked too long → slightly **overdone**.',
  'c1-u13-exc-7': 'Athletic → not particularly **sporty**.',
  'c1-u13-exc-8': 'Lacking drive → **unmotivated** employee.',

  'c1-u13-exd-1': 'Enjoy/like → **gone** in for extreme sports.',
  'c1-u13-exd-2': 'Focus on → documentary **centres** on daily lives.',
  'c1-u13-exd-3': 'Cause trouble → **get** into mischief.',
  'c1-u13-exd-4': 'Gradually like more → **grown** on me.',
  'c1-u13-exd-5': 'Collect by car → **pick** me up from the station.',
  'c1-u13-exd-6': 'Begin with → thriller **opens** with a gripping scene.',
  'c1-u13-exd-7': 'Prepare for exercise → **warm** up properly.',
  'c1-u13-exd-8': 'Waste time → stop **messing** around.',

  'c1-u13-exe-1': 'Relax after stress → **unwind** before cooking.',
  'c1-u13-exe-2': 'Accuse of → accused him **of fabricating**.',
  'c1-u13-exe-3': 'Fixed saying → you know what they **say**.',
  'c1-u13-exe-4': 'Ask repeatedly → asked **him three times to confirm**.',
  'c1-u13-exe-5': 'Ambition → lifelong **aspiration**.',
  'c1-u13-exe-6': 'Reported question past → **he had ever been** to the summit.',
  'c1-u13-exe-7': 'Average quality → **Mediocre** , most critics agreed.',
  'c1-u13-exe-8': 'Thrilling → absolutely **exhilarating**.'
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

const files = ['Review13.v2.json'];
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
