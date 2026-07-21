#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 8: Review8
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u8-ex-a': [
    'Collocation → lucky enough to **have** tickets.',
    'Comment **on** the performance.',
    'Come back **for** this band any time.',
    'Tend not **to** make any noise.',
    'A form **of** respect for the performers.',
    'Regarded **as** impolite.',
    'Show enthusiasm **with** applause.',
    'Wait and **see** what others are doing.',
    'Uncertain **about** the right moment.',
    'Noun clause → the most important thing is **that** you enjoy the occasion.'
  ]
};

const EXPLANATIONS = {
  'b2-u8-exb-1': 'Noun from SWEET → artificial **sweetener**.',
  'b2-u8-exb-2': 'Adjective describing food → sounds completely **disgusting**.',
  'b2-u8-exb-3': 'Adverb modifying waited → waited **anxiously**.',
  'b2-u8-exb-4': 'Past verb from ORIGIN → the potato **originated** in the Andes.',
  'b2-u8-exb-5': 'Adjective from CREATE → so **creative** when designing costumes.',
  'b2-u8-exb-6': 'Noun from CONTAIN → sealed **container**.',
  'b2-u8-exb-7': 'Noun from SAFE → health and **safety** guidelines.',
  'b2-u8-exb-8': 'Adverb modifying enjoyable → **thoroughly** enjoyable.',

  'b2-u8-exc-1': 'Obligation + passive → paint **has to be stirred**.',
  'b2-u8-exc-2': 'Causative **had** → **had the cake delivered by** a baker.',
  'b2-u8-exc-3': 'Get someone to do something → **got Elaine to taste**.',
  'b2-u8-exc-4': 'Passive reporting → dark chocolate **is said to be** good for your mood.',
  'b2-u8-exc-5': 'Present perfect passive → it **has been said** that green tea…',
  'b2-u8-exc-6': 'Ongoing project → stadium **has been under construction**.',
  'b2-u8-exc-7': 'Past passive → herbs **were grown in** a greenhouse.',
  'b2-u8-exc-8': 'Causative **get** → **get your cooker fitted by** an electrician.',
  'b2-u8-exc-9': 'Fixed phrase → soup **is lacking in** herbs.',

  'b2-u8-exd-1': 'Food spoiled → yoghurt has gone **off**.',
  'b2-u8-exd-2': 'Meet by chance → ran **into** our old neighbour.',
  'b2-u8-exd-3': 'No more left → run out **of** butter.',
  'b2-u8-exd-4': 'Test something new → trying **out** a new recipe.',
  'b2-u8-exd-5': 'Approaching a time → getting **on** for lunchtime.',
  'b2-u8-exd-6': 'Visit someone\'s home → come **round** for a meal.',
  'b2-u8-exd-7': 'Result of cooking → hasn\'t turned **out** quite as well.',

  'b2-u8-exe-1': 'Past participle as adjective → **frozen** peas.',
  'b2-u8-exe-2': 'Restaurant list of dishes → children\'s **menu**.',
  'b2-u8-exe-3': 'Cook in a pan with butter → **Fry** the garlic gently.',
  'b2-u8-exe-4': 'Appliance for baking → pre-heated **oven**.',
  'b2-u8-exe-5': 'Fixed collocation → **do** the washing-up.',
  'b2-u8-exe-6': 'Quantity phrase → biscuits are **full of** calories.',
  'b2-u8-exe-7': 'Unexpected visit → sister **dropped** in last night.'
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

const files = ['Review8.v2.json'];
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
