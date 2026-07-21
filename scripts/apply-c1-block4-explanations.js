#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 4: Review4
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u4-exa-1': 'Passive past → service **was** launched in 1981.',
  'c1-u4-exa-2': 'Powered by → runs **on** electricity.',
  'c1-u4-exa-3': 'Passive + every carriage → **is** maintained in **every** carriage.',
  'c1-u4-exa-4': 'Fixed phrase → **in** this way preventing discomfort.',
  'c1-u4-exa-5': 'Reflexive → activates **itself**.',
  'c1-u4-exa-6': 'On platform + modal → **on** the platform; **can** be updated.',
  'c1-u4-exa-7': 'Existential → **There** are reported to be projects.',
  'c1-u4-exa-8': 'Dummy object → consider **it** the most important investment.',

  'c1-u4-exb-1': 'Noun from COME → remarkable **comeback**.',
  'c1-u4-exb-2': 'Negative adjective → walking **unsteady**ly.',
  'c1-u4-exb-3': 'Moving tribute → most **moving** speech.',
  'c1-u4-exb-4': 'Noun from PASS → narrow cobbled **passage**.',
  'c1-u4-exb-5': 'Adjective from PROGRESS → **progressive** reforms.',
  'c1-u4-exb-6': 'Opposite of STABLE → **destabilised** the economy.',
  'c1-u4-exb-7': 'Despite injuries → injuries **notwithstanding**.',
  'c1-u4-exb-8': 'Noun from SPEED → second **speeding** penalty.',

  'c1-u4-exc-1': 'Give a tour → **run** the intern a quick induction tour.',
  'c1-u4-exc-2': 'Increase expectations → **raise** expectations too soon.',
  'c1-u4-exc-3': 'Irrelevant → beside the **point**.',
  'c1-u4-exc-4': 'Accepted eagerly → **jumped** at the chance.',
  'c1-u4-exc-5': 'Understand a lecture → difficult to **follow**.',
  'c1-u4-exc-6': 'Everything worked out → **fell** into place.',
  'c1-u4-exc-7': 'Become cold → started to **turn** cold.',
  'c1-u4-exc-8': 'Go without heating → millions **go** without adequate heating.',

  'c1-u4-exd-1': 'Passive by-agent → **was given the ball by** López.',
  'c1-u4-exd-2': 'Reported perfect → **are reported to have been** irregularities.',
  'c1-u4-exd-3': 'Don\'t fall behind → **not to fall behind** the riders.',
  'c1-u4-exd-4': 'Passive cordon → **has been cordoned off by the** police.',
  'c1-u4-exd-5': 'Causative had → **had our kitchen repainted by** a decorator.',
  'c1-u4-exd-6': 'Deliberately does → **makes a point of congratulating** staff.',
  'c1-u4-exd-7': 'Causative had → **soon had the crowd cheering**.',
  'c1-u4-exd-8': 'Deal with quickly → **get this email out of the way**.',

  'c1-u4-exe-1': 'Return to stage → triumphant **comeback**.',
  'c1-u4-exe-2': 'Emotional portrait → deeply **moving**.',
  'c1-u4-exe-3': 'Through a tunnel → passed **through** the tunnel.',
  'c1-u4-exe-4': 'Reforming adjective → **progressive** reforms.',
  'c1-u4-exe-5': 'Reach the leaders → **catch** up with the front group.',
  'c1-u4-exe-6': 'Police barrier → area was **cordoned** off.',
  'c1-u4-exe-7': 'Fixed phrase → **makes** a point of thanking.',
  'c1-u4-exe-8': 'Traffic offence → fined for **speeding**.'
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

const files = ['Review4.v2.json'];
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
