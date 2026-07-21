#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 6: Review6
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u6-ex-a': [
    'Person on trial → Daniel Marsh, the **accused**.',
    'Noun from investigate → police **investigation** spanned eighteen months.',
    'Court material → hours of **evidence** were presented.',
    'Defence team → Marsh\'s **lawyers** had argued…',
    'Could not provide **proof**.',
    'Criminal → highly experienced **thief**.',
    'Plural crime noun → a series of **robberies**.',
    'Not his first **conviction**.',
    'Crime of faking documents → guilty of **forgery**.',
    'Punishment noun → length of Marsh\'s **imprisonment**.'
  ]
};

const EXPLANATIONS = {
  'b2-u6-exb-1': 'Phrasal verb → bring **in** a law.',
  'b2-u6-exb-2': 'Phrasal verb → come **forward** with information.',
  'b2-u6-exb-3': 'Alarm phrasal verb → had gone **off** accidentally.',
  'b2-u6-exb-4': 'Record in writing → take **down** everything the witness described.',
  'b2-u6-exb-5': 'Deceived by → taken **in** by this scheme.',
  'b2-u6-exb-6': 'Robbery phrasal verb → holding **up** a security van.',
  'b2-u6-exb-7': 'Escape punishment → get **away** with minor offences.',
  'b2-u6-exb-8': 'Lenient punishment → let Kevin **off** with a warning.',

  'b2-u6-exc-1': 'Superlative comparison → described it **as the worst crime in** over ten years.',
  'b2-u6-exc-2': 'No respect → **have no respect for** the law.',
  'b2-u6-exc-3': 'Such…that structure → **have such strict laws that** people have little freedom.',
  'b2-u6-exc-4': 'Not old enough → **was not old enough** to be sent to prison.',
  'b2-u6-exc-5': 'Mistook someone for → **took me for the thief**.',
  'b2-u6-exc-6': 'Superlative → knows the law **better than anyone else**.',
  'b2-u6-exc-7': 'Quantity + that → **such a lot of** robberies lately.',
  'b2-u6-exc-8': 'Too + adjective → **were too young** (even though…).',
  'b2-u6-exc-9': 'Fixed phrase → **take into account** the defendant\'s history.',

  'b2-u6-exd-1': 'Such + noun → had **such** a miserable journey that…',
  'b2-u6-exd-2': 'Not sufficient → not **enough** volunteers.',
  'b2-u6-exd-3': 'Adjective + enough → isn\'t **old enough** to compete.',
  'b2-u6-exd-4': 'Comparative → **much less common** in this region.',
  'b2-u6-exd-5': 'Blame collocates with **on** → blamed the attendance **on** the weather.',
  'b2-u6-exd-6': 'So…that result → **so** much noise that she couldn\'t concentrate.',
  'b2-u6-exd-7': 'Degree adverb → turned **quite dark** as we hiked back.',

  'b2-u6-exe-1': 'Collocation → **made** a terrible mistake.',
  'b2-u6-exe-2': 'Deny doing something → **denied** that he had copied any work.',
  'b2-u6-exe-3': 'Escape quickly → quickly **made off** across the field.',
  'b2-u6-exe-4': 'Formal allowance → **permission** to use the vehicle.',
  'b2-u6-exe-5': 'Deliberately → did it on **purpose**.',
  'b2-u6-exe-6': 'Things go wrong → started to **go** wrong for the gang.',
  'b2-u6-exe-7': 'Legal term → shoplifters will be **prosecuted** (not persecuted).'
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
