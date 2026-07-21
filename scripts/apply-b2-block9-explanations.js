#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 9: Review9
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u9-ex-a': [
    'Phrasal verb → slow to catch **on** (realise).',
    'Keep pace → keep **up** with the experienced climbers.',
    'Study purpose → studied **for** his navigation skills.',
    'Complete easily → sail **through** the training sessions.',
    'Sudden thought → it **crossed** his mind.',
    'Point **of** continuing.',
    'Consider carefully → thinking it **over**.',
    'Fixed phrase → **made** his mind up.',
    'Had no idea → guide **had** no idea.',
    'Realisation → it dawned **on** him.',
    'Continue → get **on** with the climb.',
    'Succeed **in** reaching the summit.',
    'Fixed phrase → everything **made** sense.',
    'Past participle → had **learned** an important lesson.',
    'Capable **of** far more than they imagined.'
  ]
};

const EXPLANATIONS = {
  'b2-u9-exb-1': 'Noun from CERTIFY → waiting for her **certificate**.',
  'b2-u9-exb-2': 'Noun from REVISE → do more **revision** before the test.',
  'b2-u9-exb-3': 'Fixed phrase → pay **attention**.',
  'b2-u9-exb-4': 'Noun from SOLVE → find a **solution** to the problem.',
  'b2-u9-exb-5': 'Noun from BEHAVE → unacceptable **behaviour** on board.',
  'b2-u9-exb-6': 'Noun from IMPROVE → clear **improvement** in performance.',
  'b2-u9-exb-7': 'Subject noun → studied English **literature**.',

  'b2-u9-exc-1': 'Passive causative → group **was made to wait**.',
  'b2-u9-exc-2': 'Preference → I **would rather you did not** take photographs.',
  'b2-u9-exc-3': 'Imply/mean → what the leader **was getting at**.',
  'b2-u9-exc-4': 'Fixed phrase → there **is no point in counting**.',
  'b2-u9-exc-5': 'Undecided idiom → **in two minds about** the job.',
  'b2-u9-exc-6': 'Leave a programme → decided **to drop out of** training.',
  'b2-u9-exc-7': 'Ability phrase → **is capable of doing** far better.',
  'b2-u9-exc-8': 'Succeed + gerund → **succeeded in passing** the test.',

  'b2-u9-exd-1': 'Expect + infinitive → expected her **to give** a report.',
  'b2-u9-exd-2': 'Remember + gerund (past memory) → remember **going** abroad.',
  'b2-u9-exd-3': 'Purpose → stopped **to watch** the sunset.',
  'b2-u9-exd-4': 'Forget + infinitive → don\'t forget **to hand in** reports.',
  'b2-u9-exd-5': 'Make + bare infinitive → made travellers **stay**.',
  'b2-u9-exd-6': 'Deny + gerund → denied **being** aware of any risk.',

  'b2-u9-exe-1': 'Student leader role → appointed as a **prefect**.',
  'b2-u9-exe-2': 'Collocation → **achieve** great things.',
  'b2-u9-exe-3': 'Instruct someone → Who **taught** you how to navigate?',
  'b2-u9-exe-4': 'Prepare for presentation → hadn\'t **studied**.',
  'b2-u9-exe-5': 'Present an argument → hadn\'t **set out** the main argument.',
  'b2-u9-exe-6': 'Training session → workplace safety **lesson**.'
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
