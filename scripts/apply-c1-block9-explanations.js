#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 9: Review9
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u9-exa-1': 'Phrasal verb → burst **out** in joy.',
  'c1-u9-exa-2': 'Response to something → response **to** comic stimuli.',
  'c1-u9-exa-3': 'Feel like doing → feel **like** laughing.',
  'c1-u9-exa-4': 'For no reason → laugh **for** no apparent reason.',
  'c1-u9-exa-5': 'Effect on health → effects **on** our health.',
  'c1-u9-exa-6': 'Benefits of → benefits **of** a good laugh.',
  'c1-u9-exa-7': 'Overcome difficulties → get **over** challenging events.',
  'c1-u9-exa-8': 'Fixed idiom → crying over **spilt** milk.',
  'c1-u9-exa-9': 'Idiom → **grin** and bear it.',
  'c1-u9-exa-10': 'Put on a front → **put** on a cheerful front.',

  'c1-u9-exb-1': 'Go down badly → **who went down badly with** the critics.',
  'c1-u9-exb-2': 'Caught in the act → **caught in the act of opening**.',
  'c1-u9-exb-3': 'Very different → **a far cry from**.',
  'c1-u9-exb-4': 'From a date → **with effect from** Monday.',
  'c1-u9-exb-5': 'Euphemism for suicide → **take their own life**.',
  'c1-u9-exb-6': 'You\'ll enjoy it → **in for a treat**.',
  'c1-u9-exb-7': 'Without laughing → **with a straight face it** was impossible.',
  'c1-u9-exb-8': 'Very angry → **whose neighbours are up in arms**.',

  'c1-u9-exc-1': 'Negative adjective → **insensitive**.',
  'c1-u9-exc-2': 'Useful → **handy** little gadget.',
  'c1-u9-exc-3': 'People who depend → **dependants**.',
  'c1-u9-exc-4': 'Opposite of APPROVE → **disapproval**.',
  'c1-u9-exc-5': 'Person who campaigns → political **activist**.',
  'c1-u9-exc-6': 'Noun from FOLD → smart **folder**.',
  'c1-u9-exc-7': 'So small it can be ignored → **negligible**.',
  'c1-u9-exc-8': 'Come to fruition → come to **fruition**.',

  'c1-u9-exd-1': 'Realise the truth → **cottoned** on to the fact.',
  'c1-u9-exd-2': 'Allergic reaction → **come** out in a rash.',
  'c1-u9-exd-3': 'Faint from shock → **passed** out.',
  'c1-u9-exd-4': 'Euphemism for die → **passed** away.',
  'c1-u9-exd-5': 'Recover from illness → **pull** through the night.',
  'c1-u9-exd-6': 'Lose consciousness → **blacked** out.',
  'c1-u9-exd-7': 'Keep away → **ward** off evil spirits.',
  'c1-u9-exd-8': 'Cause pain again → **playing** up again.',

  'c1-u9-exe-1': 'Before noun → **despite** being one of the strongest.',
  'c1-u9-exe-2': 'Hypothetical condition → **Even if** she submits today.',
  'c1-u9-exe-3': 'Reduced relative clause → document **seized**.',
  'c1-u9-exe-4': 'Contrast between sentences → **However** , residents continue.',
  'c1-u9-exe-5': 'Concessive clause → **Much as** I admire your dedication.',
  'c1-u9-exe-6': 'Place → community centre **where** they hold evenings.',
  'c1-u9-exe-7': 'Possession → candidate **whose** experience matches.',
  'c1-u9-exe-8': 'Past participle condition → **given** a fairer draw.'
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

const files = ['Review9.v2.json'];
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
