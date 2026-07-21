#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 8: Review8
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u8-exa-1': 'Noun from RESIDE → permanent **residence**.',
  'c1-u8-exa-2': 'ROUND + surroundings → natural **surroundings**.',
  'c1-u8-exa-3': 'SOLID + ARCHITECT → **solidity**, **architectural** detail.',
  'c1-u8-exa-4': 'Plural noun → car **manufacturers**.',
  'c1-u8-exa-5': 'Adjective from SPACE → remarkably **spacious**.',
  'c1-u8-exa-6': 'Plural of SHELF → built-in **shelves**.',
  'c1-u8-exa-7': 'STRUCTURE + INHABIT → the **structure**, **inhabitable**.',
  'c1-u8-exa-8': 'Adjective from RESIDE → **residential** neighbourhoods.',

  'c1-u8-exb-1': 'By far the best → **far and away** the strongest.',
  'c1-u8-exb-2': 'Fixed phrase → **nowhere** near as busy.',
  'c1-u8-exb-3': 'Collocation → nowhere **near** as abundant.',
  'c1-u8-exb-4': 'Adverb of manner → train **hard** (not hardly).',
  'c1-u8-exb-5': 'Modifier before adjective → **quite** remarkable.',
  'c1-u8-exb-6': 'The more… the more → **the** more confident.',
  'c1-u8-exb-7': 'Adjective complement → roam **free**.',
  'c1-u8-exb-8': 'Intensifier + absolute adjective → **absolutely** flawless.',

  'c1-u8-exc-1': 'No basis → rumours **are without foundation**.',
  'c1-u8-exc-2': 'Watch closely → **keep a sharp eye on**.',
  'c1-u8-exc-3': 'Only a few hours → **in a matter of** hours.',
  'c1-u8-exc-4': 'Much more qualified → **a great deal more experience than**.',
  'c1-u8-exc-5': 'Make less strong → **of watering down his statement**.',
  'c1-u8-exc-6': 'Make easier → **smooth the way for**.',
  'c1-u8-exc-7': 'So + adjective + a + noun → **is so talented a**.',
  'c1-u8-exc-8': 'Eyesore → **an ugly blot on the landscape**.',

  'c1-u8-exd-1': 'Hospitality phrase → make **yourself** comfortable.',
  'c1-u8-exd-2': 'Quick to react → quick **off** the mark.',
  'c1-u8-exd-3': 'Fixed phrase → no **matter** what.',
  'c1-u8-exd-4': 'Collocation → tough **on** antisocial behaviour.',
  'c1-u8-exd-5': 'Free for customers → **on** the house.',
  'c1-u8-exd-6': 'Superficial improvement → **window** dressing.',
  'c1-u8-exd-7': 'Drive crazy → round the **bend**.',
  'c1-u8-exd-8': 'Subjective issue → matter of **opinion**.',

  'c1-u8-exe-1': 'Opposite of relaxing → **far** from the most relaxing.',
  'c1-u8-exe-2': 'Surface quality → rough **texture**.',
  'c1-u8-exe-3': 'Almost as → **nearly** as demanding.',
  'c1-u8-exe-4': 'Phrasal verb → spread **out** across the floor.',
  'c1-u8-exe-5': 'Densely inhabited → heavily **populated**.',
  'c1-u8-exe-6': 'Forced to leave home → **evicted**.',
  'c1-u8-exe-7': 'Gradable adjective → getting **fairly** cold.',
  'c1-u8-exe-8': 'Clean vigorously → **scrub** the engine parts.'
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
