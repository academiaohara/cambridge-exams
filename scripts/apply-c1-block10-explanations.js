#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 10: Review10
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u10-exa-1': 'Inversion after Seldom → **does** a reader encounter.',
  'c1-u10-exa-2': 'Idiom → bury heads in the **sand**.',
  'c1-u10-exa-3': 'Not only… but also → **not**, **in** power, stand **up** to.',
  'c1-u10-exa-4': 'At no stage → **no** stage, **are** assertions, talk **down** to.',
  'c1-u10-exa-5': 'Only when → **only** when citizens unite, powers that **be**.',

  'c1-u10-exb-1': 'Verb from HARD → **harden** the skin.',
  'c1-u10-exb-2': 'Verb from EXAMPLE → **exemplifies** the values.',
  'c1-u10-exb-3': 'Negative MORAL → felt **demoralised**.',
  'c1-u10-exb-4': 'Noun from POWER → feeling of **powerlessness**.',
  'c1-u10-exb-5': 'Remove criminal status → **decriminalise** offences.',
  'c1-u10-exb-6': 'Negative SIGNIFY → appear **insignificant**.',
  'c1-u10-exb-7': 'Noun from PROVOKE → without **provocation**.',
  'c1-u10-exb-8': 'Negative GOVERN → virtually **ungovernable**.',

  'c1-u10-exc-1': 'Fixed phrase → **as** a rule.',
  'c1-u10-exc-2': 'Am I right → right **in** thinking.',
  'c1-u10-exc-3': 'Subject to → subject **to** approval.',
  'c1-u10-exc-4': 'Serve a sentence → **served** his time.',
  'c1-u10-exc-5': 'Secure storage → under lock and **key**.',
  'c1-u10-exc-6': 'Nobody is above → **above** the law.',
  'c1-u10-exc-7': 'Surrender weapons → lay **down** their weapons.',
  'c1-u10-exc-8': 'Punish as warning → **make** an example of.',

  'c1-u10-exd-1': 'No circumstances → **are under no circumstances to enter**.',
  'c1-u10-exd-2': 'Argue fiercely → **locking horns with** the director.',
  'c1-u10-exd-3': 'Inversion after Only → **after the chairperson had formally opened the session could the delegates**.',
  'c1-u10-exd-4': 'Deny access → **denied the students access to**.',
  'c1-u10-exd-5': 'No sooner… than → **sooner had the technician entered the building than**.',
  'c1-u10-exd-6': 'Reliable source → **have it on good authority**.',
  'c1-u10-exd-7': 'So + inversion → **so widespread was the anger at**.',
  'c1-u10-exd-8': 'Right to do something → **gives you the right**.',

  'c1-u10-exe-1': 'Public disagreement → considerable **controversy**.',
  'c1-u10-exe-2': 'As do → struggles, **as** do several other districts.',
  'c1-u10-exe-3': 'Legal action → **prosecuted** to the full extent.',
  'c1-u10-exe-4': 'Tackle firmly → **crack** down on fare evasion.',
  'c1-u10-exe-5': 'Fixed phrase → **every** right to request a refund.',
  'c1-u10-exe-6': 'Bullying → push her **around**.',
  'c1-u10-exe-7': 'The thing I find hard → the **thing** I find hard to grasp.',
  'c1-u10-exe-8': 'Use influence → pull a few **strings**.'
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
