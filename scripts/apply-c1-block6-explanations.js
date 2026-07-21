#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 6: Review6
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u6-exa-1': 'Cannot be overcome → **insurmountable** challenges.',
  'c1-u6-exa-2': 'Not FAVOUR → far from **favourable**.',
  'c1-u6-exa-3': 'Complete reassessment → **reassessment** of what is achievable.',
  'c1-u6-exa-4': 'Adverb from SEEM → **seemingly** inhospitable.',
  'c1-u6-exa-5': 'Improbable as it sounds → **Improbable**.',
  'c1-u6-exa-6': 'Underwater wilderness → **wilderness** untouched by sunlight.',
  'c1-u6-exa-7': 'Past participle THREAT → now **threatened**.',
  'c1-u6-exa-8': 'Close to extinction → **extinction**.',
  'c1-u6-exa-9': 'Adjective from ECOLOGY → **ecological** collapse.',
  'c1-u6-exa-10': 'Adjective from MYSTERY → most **mysterious** frontiers.',

  'c1-u6-exb-1': 'Third conditional → **hadn\'t** taken so long.',
  'c1-u6-exb-2': 'Formal if you happen to → **should** happen to see.',
  'c1-u6-exb-3': 'Precaution → **in case** we lose connection.',
  'c1-u6-exb-4': 'Wouldn\'t have had to → **have had** to redo.',
  'c1-u6-exb-5': 'Unreal past → If she **had been** born a century earlier.',
  'c1-u6-exb-6': 'Condition for avoiding rush hour → **Unless** we leave by seven.',
  'c1-u6-exb-7': 'Without X it would have failed → **but for** the improvisation.',
  'c1-u6-exb-8': 'On condition that → **providing** everyone is available.',

  'c1-u6-exc-1': 'Had it not been for → **it not been for the relocation**.',
  'c1-u6-exc-2': 'Attribute failure → **put the failure down** to?',
  'c1-u6-exc-3': 'Feeling unwell → **under the weather**.',
  'c1-u6-exc-4': 'Inverted conditional → **the manager to reduce unnecessary** spending.',
  'c1-u6-exc-5': 'Don\'t interfere → **let nature take its course**.',
  'c1-u6-exc-6': 'Condition → **so long as they** collaborate effectively.',
  'c1-u6-exc-7': 'Regret small error → **if I hadn\'t slipped up** early on.',
  'c1-u6-exc-8': 'Likelihood of selection → **chances of being picked**.',

  'c1-u6-exd-1': 'At someone\'s disposal → **at** the delegates\' disposal.',
  'c1-u6-exd-2': 'By dint of → **by** dint of training.',
  'c1-u6-exd-3': 'Polite disclaimer → **At** the risk of sounding impatient.',
  'c1-u6-exd-4': 'Rough estimate → **as** a guess I\'d say.',
  'c1-u6-exd-5': 'In all weathers → **in** all weathers.',
  'c1-u6-exd-6': 'As luck would have it → **as** luck would have it.',
  'c1-u6-exd-7': 'Leave nothing to chance → leave anything **to** chance.',
  'c1-u6-exd-8': 'Bet on a race → place a bet **on** a horse race.',

  'c1-u6-exe-1': 'Cause complications → **thrown** up complications.',
  'c1-u6-exe-2': 'Hypothetical present → **could be lying** in the mountains now.',
  'c1-u6-exe-3': 'Not intentional → hadn\'t been **deliberate**.',
  'c1-u6-exe-4': 'Against expectations → won **against** all expectations.',
  'c1-u6-exe-5': 'Reduce spending → **cutting** back on dining out.',
  'c1-u6-exe-6': 'Inverted third conditional → **had** the power not gone out.',
  'c1-u6-exe-7': 'Unlucky person chosen → drew the short **straw**.',
  'c1-u6-exe-8': 'Removed from danger → residents were **evacuated**.'
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

const files = ['Review6.v2.json'];
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
