#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 3: Review3
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'b2-u3-exa-1': 'Noun from EXPLAIN → satisfactory **explanation**; noun from INTRODUCE → **introduction** of the engine.',
  'b2-u3-exa-2': 'People who study science → **scientists**; noun from POSSIBLE → no **possibility**; gerund from BUILD → art of **building** a machine.',
  'b2-u3-exa-3': 'Adjective from REVOLUTION → **revolutionary** designs; noun from DISCOVER → the **discovery** about wings; noun from APPEAR → **appearance** of airlines.',
  'b2-u3-exa-4': 'Person who researches → **researcher**; noun from IMPORTANT → the **importance** of understanding this period.',

  'b2-u3-exb-1': 'Machine stopped working → laptop has broken **down**.',
  'b2-u3-exb-2': 'Conduct research → studies have been carried **out** by physicists.',
  'b2-u3-exb-3': 'Invent or devise → came **up with** that idea.',
  'b2-u3-exb-4': 'Connection lost → internet was cut **off** for three hours.',
  'b2-u3-exb-5': 'Discover information → would love to find **out** more about Bronze Age technology.',
  'b2-u3-exb-6': 'Emit → paint gives **off** a nasty smell when heated.',
  'b2-u3-exb-7': 'Make progress → technology has come **on** enormously.',
  'b2-u3-exb-8': 'Connect a phone call → put me **through** to the Radiology Department.',

  'b2-u3-exc-1': 'Eager anticipation → I\'m really **looking forward to doing** the session.',
  'b2-u3-exc-2': 'When something was introduced → easier **with the introduction of** budget airlines.',
  'b2-u3-exc-3': 'Succeeded after effort → director **finally managed to bring** the play to the stage.',
  'b2-u3-exc-4': 'Cannot understand → I **find it impossible to understand** how people sleep on flights.',
  'b2-u3-exc-5': 'Led to a discovery → luck **resulted in Fleming\'s discovery of** penicillin.',
  'b2-u3-exc-6': 'Passive + known as → firefighters **are sometimes known as** everyday heroes.',
  'b2-u3-exc-7': 'Reached a decision → coach **came to the conclusion** that his tactics were wrong.',
  'b2-u3-exc-8': 'Tried to do something → guide **made an attempt to** describe the painting.',
  'b2-u3-exc-9': 'One action immediately after another → fly **as soon as we have** booked the hotel.',

  'b2-u3-exd-1': '**This time next week** → action complete by then → **will have finished** the drive.',
  'b2-u3-exd-2': 'Future plan/intention → **I\'m going to be** a professional chef.',
  'b2-u3-exd-3': 'Ongoing over coming weeks → Jake **will be doing** his renovation project.',
  'b2-u3-exd-4': 'Duration up to a future point → **will have been treating** patients for twenty-five years.',
  'b2-u3-exd-5': 'Future perfect in time clause → we won\'t know until **we\'ve looked** it up.',
  'b2-u3-exd-6': '**While** + present continuous → while **you\'re driving** through the park.',
  'b2-u3-exd-7': 'Offer of help → **Shall I** give you a hand?',

  'b2-u3-exe-1': 'First time finding something → who **discovered** the ancient ruins.',
  'b2-u3-exe-2': 'Appliance for making drinks → getting a coffee **machine**.',
  'b2-u3-exe-3': 'What produced an effect → the **cause** of the flight delay.',
  'b2-u3-exe-4': 'Typical daily amount → flights depart on **average** every day.',
  'b2-u3-exe-5': 'Building where goods are made → new **factory** will increase production.',
  'b2-u3-exe-6': 'Born with talent → she is just **naturally** talented.',
  'b2-u3-exe-7': 'Fixed phrase → finished **on** schedule (not in/at/by).'
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

const files = ['Review3.v2.json'];
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
