#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 11: Review11
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u11-exa-1': 'Idiom → stole the **show**.',
  'c1-u11-exa-2': 'Out of this world → **out** of this world.',
  'c1-u11-exa-3': 'Reconcile + new season → patched **up**, brand **new**.',
  'c1-u11-exa-4': 'Not remarkable / at its best → **stand** out, **at** its best.',
  'c1-u11-exa-5': 'Mastered an art → got **down** to a fine art, **in** style.',
  'c1-u11-exa-6': 'Worth seeing → check it **out**.',
  'c1-u11-exa-7': 'Highly important → takes **pride** of place.',

  'c1-u11-exb-1': 'Very little difference → **a fine line**.',
  'c1-u11-exb-2': 'Sincerely → **from the bottom of my heart**.',
  'c1-u11-exb-3': 'As far as I know → **the best of my knowledge**.',
  'c1-u11-exb-4': 'Express clearly → **make myself clear**.',
  'c1-u11-exb-5': 'Overwhelmed by → **are getting on top of** her.',
  'c1-u11-exb-6': 'No regrets → **have a clear conscience**.',
  'c1-u11-exb-7': 'Find the truth → **get to the bottom of**.',
  'c1-u11-exb-8': 'Worsened → **took a turn for the worse**.',

  'c1-u11-exc-1': 'Increase → bookings **pick** up.',
  'c1-u11-exc-2': 'Declare a total loss → **write** it off.',
  'c1-u11-exc-3': 'Neglect an area → **runs** this neighbourhood down.',
  'c1-u11-exc-4': 'Repair minor damage → **touch** that up.',
  'c1-u11-exc-5': 'Dress more formally → **smartening** up their wardrobe.',
  'c1-u11-exc-6': 'Become more lively → **livened** up considerably.',
  'c1-u11-exc-7': 'Barely pass → **scrape** through.',
  'c1-u11-exc-8': 'Become brighter → sky should **brighten** up.',

  'c1-u11-exd-1': 'Not real → entirely **artificial**.',
  'c1-u11-exd-2': 'Job ads section → **classifieds**.',
  'c1-u11-exd-3': 'Person who wants perfection → **perfectionist**.',
  'c1-u11-exd-4': 'Noun from DESTROY → trail of **destruction**.',
  'c1-u11-exd-5': 'Past verb STRENGTH → **strengthened** her determination.',
  'c1-u11-exd-6': 'Copy, not original → high-quality **imitation**.',
  'c1-u11-exd-7': 'Valuable possessions → keep their **valuables**.',
  'c1-u11-exd-8': 'Business reputation → building **goodwill**.',

  'c1-u11-exe-1': 'Tiny particle → speck of **dust**.',
  'c1-u11-exe-2': 'Countable noun → significant **number** of people.',
  'c1-u11-exe-3': 'Collective noun for birds → **Flocks** of geese.',
  'c1-u11-exe-4': 'Negative meaning with plural noun → **few** students.',
  'c1-u11-exe-5': 'Positive aspect → only redeeming **feature**.',
  'c1-u11-exe-6': 'The very best → the **ultimate** collection.',
  'c1-u11-exe-7': 'Strengthened structurally → **reinforced** with steel cables.',
  'c1-u11-exe-8': 'Collector\'s piece → collector\'s **item**.'
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

const files = ['Review11.v2.json'];
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
