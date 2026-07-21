#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 5: Review5
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {
  'c1-u5-ex-a': [
    'Fixed phrase → **taken** for granted.',
    'In other words → in other **words**.',
    'Idiom catch on → has **taken** on.',
    'Meet a need → **answers** a real appetite.',
    'Firmly maintain → networks **insist**.',
    'Publicly condemn → **denounced** several shows.',
    'State as fact → **asserted** unverified claims.',
    'Media attention → wide media **coverage**.',
    'Overstate → they **exaggerate** the extent.',
    'Slight awareness → little **inkling** of how much.'
  ]
};

const EXPLANATIONS = {
  'c1-u5-exa-1': 'Fixed phrase → **taken** for granted.',
  'c1-u5-exa-2': 'In other words → in other **words**.',
  'c1-u5-exa-3': 'Catch on → has **taken** on.',
  'c1-u5-exa-4': 'Meet demand → **answers** a real appetite.',
  'c1-u5-exa-5': 'Firmly claim → networks **insist**.',
  'c1-u5-exa-6': 'Condemn publicly → **denounced** popular shows.',
  'c1-u5-exa-7': 'State confidently → **asserted** unverified claims.',
  'c1-u5-exa-8': 'Press attention → media **coverage**.',
  'c1-u5-exa-9': 'Overstate → **exaggerate** the extent.',
  'c1-u5-exa-10': 'Slight sense → little **inkling** of how much.',

  'c1-u5-exb-1': 'In trouble with boss → **am in my boss\'s bad books**.',
  'c1-u5-exb-2': 'Obvious → **goes without saying**.',
  'c1-u5-exb-3': 'Infer indirectly → **reading between the lines**.',
  'c1-u5-exb-4': 'Not speaking → no longer **on speaking terms**.',
  'c1-u5-exb-5': 'Shouldn\'t have persuaded → **not have talked Marco into keeping quiet**.',
  'c1-u5-exb-6': 'Certain past deduction → **must have had a word with Claire about**.',
  'c1-u5-exb-7': 'Misunderstood → **have got the wrong end of the stick**.',
  'c1-u5-exb-8': 'No promise needed → **needn\'t give me your word**.',

  'c1-u5-exc-1': 'Noun from EDIT → inspiring **editorship**.',
  'c1-u5-exc-2': 'Rumour not fact → pure **hearsay**.',
  'c1-u5-exc-3': 'Noun from IMPLY → widespread **implications**.',
  'c1-u5-exc-4': 'Understatement → bit of an **understatement**.',
  'c1-u5-exc-5': 'Adjective from TALK → not very **talkative**.',
  'c1-u5-exc-6': 'Not written down → **unwritten** agreement.',
  'c1-u5-exc-7': 'Noun from EXCLAIM → **exclamation** mark.',
  'c1-u5-exc-8': 'Clearly stated → **expressly** prohibited.',

  'c1-u5-exd-1': 'Be released → come **out** on the platform.',
  'c1-u5-exd-2': 'Persuade → talk her **round**.',
  'c1-u5-exd-3': 'Discuss → talk it **over** with the board.',
  'c1-u5-exd-4': 'Reveal accidentally → don\'t let **slip** to Hannah.',
  'c1-u5-exd-5': 'Say suddenly → blurted **out**.',
  'c1-u5-exd-6': 'Forget your words → dry **up**.',
  'c1-u5-exd-7': 'Oppose publicly → speak **out** against cuts.',
  'c1-u5-exd-8': 'Silenced by shouting → shouted **down**.',

  'c1-u5-exe-1': 'Impossible past → **can\'t have read** it last year.',
  'c1-u5-exe-2': 'Suggestive question → **Hadn\'t** we better confirm?',
  'c1-u5-exe-3': 'Would like + infinitive → **to be able to** speak three languages.',
  'c1-u5-exe-4': 'Might as well → might **as well** leave now.',
  'c1-u5-exe-5': 'Past obligation → **Did you have to** wear a uniform?',
  'c1-u5-exe-6': 'Past possibility not taken → **could have gone** but stayed home.',
  'c1-u5-exe-7': 'Past criticism → **could** have warned us.',
  'c1-u5-exe-8': 'Unnecessary action → **didn\'t need to get** an extra chair.'
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

const files = ['Review5.v2.json'];
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
