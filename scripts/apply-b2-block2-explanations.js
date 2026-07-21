#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 2: Review2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u2-ex-a': [
    'Adjective from INTEREST → found it **interesting**.',
    'Sports club → **association** for beginner players.',
    'Bad news about no local club → **unfortunately**.',
    'Little **knowledge** at first (noun from KNOW).',
    'Things you need to play → basic **equipment**.',
    'Adjective from ENJOY → an **enjoyable** way to stay active.',
    'Friendly match → **competition** (noun from COMPETE).',
    'Person who coaches → part-time **trainer**.',
    'People you play against → regular **opponents**.',
    'Prize winner → silver **medallist** (noun from MEDAL).'
  ]
};

const EXPLANATIONS = {
  'b2-u2-exb-1': 'Cannot tolerate → **put up with** people who cheat.',
  'b2-u2-exb-2': 'Eliminated from a tournament → knocked **out** in the second round.',
  'b2-u2-exb-3': 'Lost interest → has **gone off** team sports lately.',
  'b2-u2-exb-4': 'Continue doing something → **carry on** with the activity.',
  'b2-u2-exb-5': 'Move to an earlier date → **bring** the race **forward**.',
  'b2-u2-exb-6': 'Start a new hobby → **taking up** a martial art.',
  'b2-u2-exb-7': 'Liked immediately → **took to** swimming as soon as he tried it.',
  'b2-u2-exb-8': 'Withdraw from a race → **pull out** because of injury.',

  'b2-u2-exc-1': 'Duration up to three o\'clock → **had been playing tennis for** three hours.',
  'b2-u2-exc-2': 'Past habit, negative → Jake **did not use to** spend so many evenings gaming.',
  'b2-u2-exc-3': 'Ensure something → **make certain that** all the pieces are on the board.',
  'b2-u2-exc-4': 'Become accustomed → after a while you **get used to** it.',
  'b2-u2-exc-5': 'Earlier action → when told to squat, I **had already run** ten miles.',
  'b2-u2-exc-6': 'Past habit, negative → we **never used to spend** so much time indoors.',
  'b2-u2-exc-7': 'Occupy time → guitar practice **takes up** a lot of his free time.',
  'b2-u2-exc-8': 'Express preference → I **would prefer to play** chess rather than draughts.',
  'b2-u2-exc-9': 'Unlikely to win → there\'s **little chance of your winning** the tournament.',

  'b2-u2-exd-1': 'Ongoing activity before exhaustion → **had been jogging** all afternoon.',
  'b2-u2-exd-2': '**It was the first time** + past perfect → **had ever seen** a live race.',
  'b2-u2-exd-3': 'Past habit, negative → we **didn\'t use to** have such a big training ground.',
  'b2-u2-exd-4': 'Completed before age twelve → **had read** every book by then.',
  'b2-u2-exd-5': 'Eventually became accustomed → finally **got used to** it.',
  'b2-u2-exd-6': 'Interrupted background action → she **was waiting** when her shoelace snapped.',
  'b2-u2-exd-7': 'Repeated past habit → my uncle **would** practise his serve every evening.',

  'b2-u2-exe-1': 'People watching sport → arena **spectators** rose to their feet.',
  'b2-u2-exe-2': 'Cricket equipment → bought a brand-new cricket **bat**.',
  'b2-u2-exe-3': 'Equal score → could only **draw** with Town, 2-2.',
  'b2-u2-exe-4': 'Fixed phrase → each player **takes** it in turns to roll the dice.',
  'b2-u2-exe-5': 'Collocation → what matters is to **do** your best.',
  'b2-u2-exe-6': 'Join an activity already happening → they\'ll let you **join in**.',
  'b2-u2-exe-7': 'Defeat an opponent → expect Williams to **beat** Chen in the final.'
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
