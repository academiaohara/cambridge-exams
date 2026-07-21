#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 2: Review2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u2-exa-1': 'Lasting legacy → **enduring** (adjective from ENDURE).',
  'c1-u2-exa-2': 'Changed completely → **revolutionised** our understanding.',
  'c1-u2-exa-3': 'Noun from ALTER → radical **alternative** to fossil fuels.',
  'c1-u2-exa-4': 'Noun from PLACE → improved **replacement**.',
  'c1-u2-exa-5': 'CAPABLE + PROCESS → limited **capability**, local **processing**.',
  'c1-u2-exa-6': 'ELECTRIC + MODERN → powered by **electricity**, **modernise** storage.',
  'c1-u2-exa-7': 'Adverb PERSIST + discontinue → **persistently** criticised, **discontinued**.',

  'c1-u2-exb-1': 'Past simple for completed sighting → **spotted** Laura.',
  'c1-u2-exb-2': 'Earlier past before surprise → **had already read**.',
  'c1-u2-exb-3': 'First time + past perfect → **had tasted** such spicy food.',
  'c1-u2-exb-4': 'Past habit → **used to** collect stamps.',
  'c1-u2-exb-5': 'Specific past moment → I **was** so relieved.',
  'c1-u2-exb-6': 'Annoying repeated past habit → **was always borrowing**.',
  'c1-u2-exb-7': 'Activity before exhaustion → **had been chasing** its tail.',
  'c1-u2-exb-8': 'Accustomed to → **were used to sleeping** in bunks.',

  'c1-u2-exc-1': 'Tidy up → **we spruced up** the office.',
  'c1-u2-exc-2': 'What\'s the point → **the use of me offering**.',
  'c1-u2-exc-3': 'Changed behaviour → **turned over a new leaf since**.',
  'c1-u2-exc-4': 'No point complaining → **no good complaining to me about**.',
  'c1-u2-exc-5': 'Very little time → **working against the clock**.',
  'c1-u2-exc-6': 'Came true → **became a reality**.',
  'c1-u2-exc-7': 'Confuse two people → **mix Rachel up with** Paula.',
  'c1-u2-exc-8': 'Exchange lives → **swap places with** a professional athlete.',

  'c1-u2-exd-1': 'Leading → **in** the lead.',
  'c1-u2-exd-2': 'Currently being used → **in** use.',
  'c1-u2-exd-3': 'Access to → access **to** publications.',
  'c1-u2-exd-4': 'Improved → changed **for** the better.',
  'c1-u2-exd-5': 'Future date → held **at** a later date.',
  'c1-u2-exd-6': 'On the internet → sources **on** the Web.',
  'c1-u2-exd-7': 'Intentionally → not **on** purpose.',
  'c1-u2-exd-8': 'Good form → **in** excellent form.',

  'c1-u2-exe-1': 'Earlier event before sounding upset → **had had** distressing news.',
  'c1-u2-exe-2': 'Interrupted action → I **was getting** ready.',
  'c1-u2-exe-3': 'Collocation → massive **influence** on communication.',
  'c1-u2-exe-4': 'First time + past perfect → **had eaten** a Moroccan meal.',
  'c1-u2-exe-5': 'Phrasal verb → **back** up your files.',
  'c1-u2-exe-6': 'Twist the truth → **distorting** the facts.',
  'c1-u2-exe-7': 'Fixed phrase → out of **place**.',
  'c1-u2-exe-8': 'Ongoing worry before oversleeping → **had been worrying** about packing.'
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

const files = ['Review2.v2.json'];
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
