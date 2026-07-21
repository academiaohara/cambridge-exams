#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 10: Review10
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'b2-u10-exa-1': 'Help **us** (not to us); remove **out**; stop pollution **happening** (not from).',
  'b2-u10-exa-2': 'Fixed phrase → **long time** (not long of time); remove unnecessary **that**.',
  'b2-u10-exa-3': 'Redundant word → remove **taken** (impact on is enough).',
  'b2-u10-exa-4': 'Redundant word → remove **up** (wasting resources).',

  'b2-u10-exb-1': 'Noun from LIKELY → high **likelihood** of storms.',
  'b2-u10-exb-2': 'Noun from POLLUTE → produces **pollution**.',
  'b2-u10-exb-3': 'Adverb modifying requires → **accurately** requires expertise.',
  'b2-u10-exb-4': 'Adjective from RESIDENT → **residential** neighbourhoods.',
  'b2-u10-exb-5': 'Person noun plural → leading **environmentalists**.',
  'b2-u10-exb-6': 'Weather adjective → gloriously **sunny** morning.',
  'b2-u10-exb-7': 'Threatened species → **endangered** (from DANGER).',
  'b2-u10-exb-8': 'Extreme cold → absolutely **freezing**.',

  'b2-u10-exc-1': 'Reported question → I wonder **if you saw** the documentary.',
  'b2-u10-exc-2': 'Fixed phrase → I **caught sight of** a deer.',
  'b2-u10-exc-3': 'Weather phrasal verb → hope **the weather clears up**.',
  'b2-u10-exc-4': 'Demolish → they **had torn down** the windmill.',
  'b2-u10-exc-5': 'Collocation → **has an effect on** the natural world.',
  'b2-u10-exc-6': 'Familiar with → **am not really familiar with** the work.',
  'b2-u10-exc-7': 'Ruin idiom → **made a mess of** the local park.',
  'b2-u10-exc-8': 'Attribute cause → **put the problems down to** pollution.',
  'b2-u10-exc-9': 'Aware of → most people **are aware of** the contribution.',

  'b2-u10-exd-1': 'Tag after hardly → Hardly anyone…, **do they**?',
  'b2-u10-exd-2': 'Indirect question → where **I can find** a book.',
  'b2-u10-exd-3': 'Stop from + gerund → stops factories **from dumping** waste.',
  'b2-u10-exd-4': 'Let\'s tag → **shall we**?',
  'b2-u10-exd-5': 'Negative statement tag → isn\'t much point…, **is there**?',
  'b2-u10-exd-6': 'Imperative tag → Don\'t leave…, **will you**?',
  'b2-u10-exd-7': 'Question word order → What **did you see** there?',

  'b2-u10-exe-1': 'Natural disaster → a **flood** submerged the village.',
  'b2-u10-exe-2': 'Acronym phrase → what WWF **stands for**.',
  'b2-u10-exe-3': 'No longer existing → have been **extinct** for thousands of years.',
  'b2-u10-exe-4': 'Weather noun → icy **wind** from the north.',
  'b2-u10-exe-5': 'Factory pollution → **industrial** pollution.',
  'b2-u10-exe-6': 'Countryside → surrounding **rural** areas.',
  'b2-u10-exe-7': 'Rain pools → jump in **puddles**.'
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

const files = ['Review10.v2.json'];
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
