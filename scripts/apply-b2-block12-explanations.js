#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 12: Review12
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'b2-u12-exa-1': 'Person who performs → professional **entertainer** (noun from ENTERTAIN).',
  'b2-u12-exa-2': 'Noun from CONVERSE → lengthy **conversation**; noun from BORE → **boredom**; plural noun from PERFORM → solo **performances**.',
  'b2-u12-exa-3': 'Adverb from CURRENT → **currently** rehearsing.',
  'b2-u12-exa-4': 'Noun from EXCITE → genuine **excitement**.',
  'b2-u12-exa-5': 'Noun from VARY → real **variety**; adjective from AMUSE → **amusing** stories; adjective from FAME → **famous** politicians; adverb from ACT → **actively** engaged.',

  'b2-u12-exb-1': 'Instead of → **instead of having** an after-show party.',
  'b2-u12-exb-2': 'Typical behaviour → **is just like Sandra to** miss rehearsals.',
  'b2-u12-exb-3': 'Certain to happen → fans **are bound to go** wild.',
  'b2-u12-exb-4': 'Not allowed → **are not supposed to take** videos.',
  'b2-u12-exb-5': 'Said sorry → **apologised for ruining** the ending.',
  'b2-u12-exb-6': 'Don\'t mind → producers **are happy for you to** attend.',
  'b2-u12-exb-7': 'Tease → **make fun of** Marcus.',
  'b2-u12-exb-8': 'Affected deeply → **made an impression on** me.',

  'b2-u12-exc-1': 'Fell asleep → **dropped off** during the ballet.',
  'b2-u12-exc-2': 'Felt disappointed → felt **let down** when the show was cancelled.',
  'b2-u12-exc-3': 'Have a good relationship → don\'t **get along** offstage.',
  'b2-u12-exc-4': 'Perform a show → **put on** a musical.',
  'b2-u12-exc-5': 'Resembles → **takes after** his grandfather.',
  'b2-u12-exc-6': 'Believed a trick → everyone **fell for** the prank.',
  'b2-u12-exc-7': 'Be remembered → will **go down** in history.',
  'b2-u12-exc-8': 'Trust → you can **count on** the orchestra.',

  'b2-u12-exd-1': 'Prior achievement → **Having won** three consecutive Grammy Awards…',
  'b2-u12-exd-2': 'Place → the one **where** they serve champagne.',
  'b2-u12-exd-3': 'Possession → the director **whose** latest film broke records.',
  'b2-u12-exd-4': 'Causative passive → **Made** to audition once more by his coach.',
  'b2-u12-exd-5': 'Relative + preposition → the musical **for which** she is celebrated.',
  'b2-u12-exd-6': 'Non-defining relative → the comedian, **who** I last saw…',
  'b2-u12-exd-7': 'Reduced passive → the track **chosen** by our listeners.',
  'b2-u12-exd-8': 'Reason → that\'s the reason **why** I focused on theatre.',

  'b2-u12-exe-1': 'Check listings → **look** in the magazine.',
  'b2-u12-exe-2': 'Long fiction → writing a **novel**.',
  'b2-u12-exe-3': 'Kept amused → kept the crowd **entertained**.',
  'b2-u12-exe-4': 'Critical opinions → read **reviews** of new albums.',
  'b2-u12-exe-5': 'Casting try-out → How did your **audition** go?',
  'b2-u12-exe-6': 'Fixed phrase → work in show **business**.',
  'b2-u12-exe-7': 'Understand a joke → didn\'t **get** it.',
  'b2-u12-exe-8': 'Gradually like more → starting to **grow** on me.'
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

const files = ['Review12.v2.json'];
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
