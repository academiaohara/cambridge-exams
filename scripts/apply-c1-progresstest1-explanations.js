#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Progress Test 1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u1-exa-1': 'COME + GO + FAVOUR → **newcomer**, **undergone**, **unfavourable** reviews.',
  'c1-u1-exa-2': 'CONVERT + PRODUCE + STATE + REVOLT → **convertible**, **production**, **understatement**, **revolutionary**.',
  'c1-u1-exa-3': 'ADJUST + PROCESS + LAST → **adjustable**, **processors**, **outlasts**.',

  'c1-u1-exb-1': 'On purpose → **on** purpose.',
  'c1-u1-exb-2': 'In due course → **in** due course.',
  'c1-u1-exb-3': 'Driving at = meaning → driving **at**.',
  'c1-u1-exb-4': 'In discussion → **in** discussion.',
  'c1-u1-exb-5': 'Concentrate on → concentrate **on**.',
  'c1-u1-exb-6': 'From today on → **on**.',
  'c1-u1-exb-7': 'Trust to luck → trust **to** luck.',
  'c1-u1-exb-8': 'Changes in the way → changes **in** the way.',

  'c1-u1-exc-1': 'Duration before performing → **until they have been practising for**.',
  'c1-u1-exc-2': 'About to do → **on the verge of telling**.',
  'c1-u1-exc-3': 'Planned number → **were meant to be** eight.',
  'c1-u1-exc-4': 'Causative passive → **have the pipes looked at**.',
  'c1-u1-exc-5': 'Likely negative → **may well not have seen**.',
  'c1-u1-exc-6': 'Past criticism → **shouldn\'t have let**.',
  'c1-u1-exc-7': 'Strong advice → **had better not leave**.',
  'c1-u1-exc-8': 'Cleft sentence → **it was my sister\'s encouragement that**.',
  'c1-u1-exc-9': 'Unless → **will fail unless**.',
  'c1-u1-exc-10': 'Scheduled → **is due to start**.',

  'c1-u1-exd-1': 'Unclear meaning → somewhat **ambiguous**.',
  'c1-u1-exd-2': 'Temporary agreement → **provisional** agreement.',
  'c1-u1-exd-3': 'Clever solution → **ingenious** solution.',
  'c1-u1-exd-4': 'Informal language → **colloquial** language.',
  'c1-u1-exd-5': 'Sudden end → **abrupt** end.',
  'c1-u1-exd-6': 'Arrived at the right moment → **timely** arrival.',
  'c1-u1-exd-7': 'At the same time → **simultaneous** transmission.',

  'c1-u1-exe-1': 'Cloze gaps → **spend** time, taking **into** account, arriving **at**.',
  'c1-u1-exe-2': 'In the firm belief → evaluate facts **in** the firm belief.',
  'c1-u1-exe-3': 'Arguments for → arguments **for** a fresh look.',
  'c1-u1-exe-4': 'From time to time → from **time** to time, **in** a single instant.',
  'c1-u1-exe-5': 'Passive + phrasal verb → **was** shown, blurted **out**.',
  'c1-u1-exe-6': 'Came as → came **as** a considerable surprise.',
  'c1-u1-exe-7': 'Cast doubt on → cast doubt **on** the prevailing theory.',
  'c1-u1-exe-8': 'Come round to → come **round** to her way, the **difference**.',
  'c1-u1-exe-9': 'Escape notice → completely **escaped** the notice.',
  'c1-u1-exe-10': 'Rarely if ever → rarely, **if** ever, aware.',

  'c1-u1-exf-1': 'Come up with ideas → come **out** with stories.',
  'c1-u1-exf-2': 'Become extinct → die **out**.',
  'c1-u1-exf-3': 'Work harder → knuckle **down**.',
  'c1-u1-exf-4': 'Forward a message → pass **on**.',
  'c1-u1-exf-5': 'Disassemble → take **apart**.',
  'c1-u1-exf-6': 'Revise skills → brush **up** on Spanish.',
  'c1-u1-exf-7': 'Research → reading **up** on research.',
  'c1-u1-exf-8': 'Think carefully → Mull **over** the proposal.',
  'c1-u1-exf-9': 'Appear unexpectedly → cropped **up**.',
  'c1-u1-exf-10': 'Finish all of → got **through** all the snacks.',

  'c1-u1-exg-1': 'Works in all three → **impression**.',
  'c1-u1-exg-2': 'Works in all three → **run**.',
  'c1-u1-exg-3': 'Works in all three → **basis**.',
  'c1-u1-exg-4': 'Works in all three → **thrown**.',
  'c1-u1-exg-5': 'Works in all three → **process**.',
  'c1-u1-exg-6': 'Works in both → **record**.',

  'c1-u1-exh-1': 'Refuse to change → stuck to her **guns**.',
  'c1-u1-exh-2': 'Said a lot indirectly → spoke **volumes**.',
  'c1-u1-exh-3': 'Confess → **come** clean.',
  'c1-u1-exh-4': 'Guess the way → **followed** my nose.',
  'c1-u1-exh-5': 'Head straight for → made a **beeline**.',
  'c1-u1-exh-6': 'Evaluate life → **take** stock.',
  'c1-u1-exh-7': 'Expert knowledge → **knows** electronics inside out.',
  'c1-u1-exh-8': 'Deduced → **put** two and two together.',

  'c1-u1-exi-1': 'Future perfect for completion → once you **have got**.',
  'c1-u1-exi-2': 'Not accustomed → **wasn\'t used** to working.',
  'c1-u1-exi-3': 'Future perfect continuous → **will have been fundraising**.',
  'c1-u1-exi-4': 'Due to be → due **to be** in Manchester.',
  'c1-u1-exi-5': 'Perfect participle passive → **having been lost** somewhere.',
  'c1-u1-exi-6': 'Impersonal passive → **has been estimated**.',
  'c1-u1-exi-7': 'Past perfect after first time → **had ever performed**.',
  'c1-u1-exi-8': 'Unnecessary action → **needn\'t** have prepared.',
  'c1-u1-exi-9': 'Without evidence → can only **speculate**.',
  'c1-u1-exi-10': 'People on foot → safer for **pedestrians**.',
  'c1-u1-exi-11': 'Consumer spending → **consumer** spending.',
  'c1-u1-exi-12': 'Move quickly → **dashed** back inside.',
  'c1-u1-exi-13': 'Writer for hire → used a **ghostwriter**.',
  'c1-u1-exi-14': 'Work out from evidence → **deduce** it.',
  'c1-u1-exi-15': 'Practice interview → **mock** interview.',
  'c1-u1-exi-16': 'Discover by chance → **hit** upon the idea.'
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

const files = ['ProgressTest1.v2.json'];
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
