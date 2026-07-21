#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 13: Review13
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'b2-u13-exa-1': 'Despite + there → **being** interest; there **seems** to be a gap.',
  'b2-u13-exa-2': 'Plenty **of** examples; insist **on** expressing creativity.',
  'b2-u13-exa-3': 'Prepared **for** the reaction; stared **at**; criticised **for** expressing yourself.',
  'b2-u13-exa-4': 'Complimented **on** originality; for **example**; anxious **to** appeal to buyers.',

  'b2-u13-exb-1': 'Person who styles → professional **stylist** (noun from STYLE).',
  'b2-u13-exb-2': 'Noun from SIMILAR → remarkable **similarity**.',
  'b2-u13-exb-3': 'Plural noun from EXPECT → lower your **expectations**.',
  'b2-u13-exb-4': 'Noun from DECIDE → reach a **decision**.',
  'b2-u13-exb-5': 'Noun from ENTHUSE → greeted with great **enthusiasm**.',
  'b2-u13-exb-6': 'Noun from PRODUCE → increased its **production**.',
  'b2-u13-exb-7': 'Adjective from BEAUTY → absolutely **beautiful**.',
  'b2-u13-exb-8': 'Both groups → collectors and buyers **alike**.',

  'b2-u13-exc-1': 'Long overdue → **is about time you got** a new camera.',
  'b2-u13-exc-2': 'Present wish → **wish you would not** wear that beret.',
  'b2-u13-exc-3': 'Past regret → **wishes she had not worn** formal clothes.',
  'b2-u13-exc-4': 'Despite + gerund → **despite it being** second-hand.',
  'b2-u13-exc-5': 'Wistful if only → **If only I could** get to the exhibition.',
  'b2-u13-exc-6': 'Concession → **even though I begged her** all evening.',
  'b2-u13-exc-7': 'Preference about another person → **would rather you did not** adopt my style.',
  'b2-u13-exc-8': 'Second conditional → **if I had something** suitable to wear.',
  'b2-u13-exc-9': 'Despite the fact → **of the fact that she** is a retiree.',

  'b2-u13-exd-1': 'Pop into → pop **into** that new art supply shop.',
  'b2-u13-exd-2': 'No longer interested → grown **out of** these old brushes.',
  'b2-u13-exd-3': 'Try clothing → try **on** that artist\'s smock.',
  'b2-u13-exd-4': 'Become popular → catch **on** as a legitimate art form.',
  'b2-u13-exd-5': 'Form a queue → lined **up** for portraits.',
  'b2-u13-exd-6': 'Remove clothing → take **off** my paint-stained apron.',
  'b2-u13-exd-7': 'Wear smart clothes → dress **up** for the celebration.',

  'b2-u13-exe-1': 'Piece of fabric → clean the lens with a soft **cloth**.',
  'b2-u13-exe-2': 'Colour fabric → **dye** the canvas indigo blue.',
  'b2-u13-exe-3': 'Look good on someone → doesn\'t **suit** you in the portrait.',
  'b2-u13-exe-4': 'Art collocation → impressive **work** of art.',
  'b2-u13-exe-5': 'Fixed phrase → go out of **fashion**.',
  'b2-u13-exe-6': 'Stage outfit → spectacular **costume** for the lead role.',
  'b2-u13-exe-7': 'Hang laundry → forgot to use clothes **pegs**.'
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
