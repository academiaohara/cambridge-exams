#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 1: Review1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u1-ex-a': [
    'Question with **does** → What **does** the phrase mean?',
    'Fixed phrase → **off** the top of their head.',
    'Think of **going** on a trip.',
    'Want to **see** the real wilderness.',
    'Passive → travellers **are** often surprised.',
    'Present perfect → boards **have** worked hard.',
    'A **change** of approach.',
    'Emphatic **do** → those that **do** make the journey.',
    'Differ **from** what people expect.',
    'Phrasal verb → keep **up** with expectations.',
    'Present continuous → what it **is** doing.',
    'Present perfect → attention **has** been paid.',
    'Means → service **means** islands are within reach.',
    'Seems **to** be attracting visitors.',
    'Time period → **for** the summer months.'
  ]
};

const EXPLANATIONS = {
  'b2-u1-exb-1': 'Person who takes photos → **photographer**.',
  'b2-u1-exb-2': 'Which way → **direction**.',
  'b2-u1-exb-3': 'Negative adjective → **unrecognisable**.',
  'b2-u1-exb-4': 'Train schedule → **timetable**.',
  'b2-u1-exb-5': 'Industry noun → **tourism**.',
  'b2-u1-exb-6': 'People who live there → **inhabitants**.',
  'b2-u1-exb-7': 'Noun from ARRIVE → **arrival** lounge.',

  'b2-u1-exc-1': 'Past perfect + **just** → **had just got on** the plane.',
  'b2-u1-exc-2': 'Duration → **have been in Budapest for** two days.',
  'b2-u1-exc-3': 'Ordinal visit → **second time I\'ve visited** Paris.',
  'b2-u1-exc-4': 'Match someone\'s pace → **keep up with**.',
  'b2-u1-exc-5': 'Passion for travel → **keen on travelling**.',
  'b2-u1-exc-6': 'As fast as possible → **at full speed**.',
  'b2-u1-exc-7': 'Towards → **in the direction of** the house.',
  'b2-u1-exc-8': 'Past regret → **regret not looking at** the room.',

  'b2-u1-exd-1': 'Habit/routine → **washes** every morning.',
  'b2-u1-exd-2': 'Past habit → I **went** every afternoon.',
  'b2-u1-exd-3': 'State verb → it **belongs** to my sister.',
  'b2-u1-exd-4': 'Past appearance → she **seemed** upset.',
  'b2-u1-exd-5': 'Interrupted thought → I **was just thinking** about.',
  'b2-u1-exd-6': 'Emphatic past → I **did go** to Brazil.',

  'b2-u1-exe-1': 'Crossing point → **border**.',
  'b2-u1-exe-2': 'Scenic panorama → breathtaking **view**.',
  'b2-u1-exe-3': 'Hotel arrival → **check in**.',
  'b2-u1-exe-4': 'Can\'t find the route → **lost** our way.',
  'b2-u1-exe-5': 'Train travel → **journey** (not trip/voyage).',
  'b2-u1-exe-6': 'Fixed phrase → book in **advance**.'
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

const files = ['Review1.v2.json'];
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
