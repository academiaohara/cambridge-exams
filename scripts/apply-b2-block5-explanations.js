#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 5: Review5
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u5-ex-a': [
    'Fixed phrase → dream **of** studying abroad.',
    'Those who **have** the determination and drive.',
    'Settle **down** in a new country.',
    'Where you **grew** up.',
    'Passive idiom → be **taken** aback.',
    'Phrasal verb → **get** on with other students.',
    'Collocation → **make** genuine friendships.',
    'Approve **of** your study habits.',
    'Object **to** ideas you express.',
    'Banned **from** using certain websites.',
    'Second conditional → **If** you were to study…',
    'Forced **to** use a VPN.',
    'Phrasal verb → **fall** in love with their adopted country.',
    'It does **take** real courage (emphatic).',
    'Agree **that** the experience transforms you.'
  ]
};

const EXPLANATIONS = {
  'b2-u5-exb-1': 'Relationship noun from FRIEND → **friendship** with Carlos.',
  'b2-u5-exb-2': 'Opposite of obey → students\' **disobedience**.',
  'b2-u5-exb-3': 'Feeling envious → you\'re just **jealous** of them.',
  'b2-u5-exb-4': 'Adverb from NERVE → watched **nervously**.',
  'b2-u5-exb-5': 'Visitors with disabilities → **disabled** visitors.',
  'b2-u5-exb-6': 'Likes arguing → incredibly **argumentative**.',
  'b2-u5-exb-7': 'Negative of POLITE → very **impolite** to use your phone.',

  'b2-u5-exc-1': 'Promise collocation → **made my mum a promise**.',
  'b2-u5-exc-2': 'Allow someone to do something → **let me go out**.',
  'b2-u5-exc-3': 'Quarrelled → Margaret and I **have fallen out**.',
  'b2-u5-exc-4': 'No one approved → didn\'t **meet with anyone\'s approval**.',
  'b2-u5-exc-5': 'Not willing to argue → wasn\'t **in the mood for** an argument.',
  'b2-u5-exc-6': 'Couldn\'t connect → **of her inability to make** friends.',
  'b2-u5-exc-7': 'Polite request reported → Simon **asked me to open** the door.',
  'b2-u5-exc-8': 'Look after → **take care of** your little brother.',

  'b2-u5-exd-1': 'Second conditional (unreal present) → If I **won** the competition.',
  'b2-u5-exd-2': 'Mixed conditional → you **would have done** the same.',
  'b2-u5-exd-3': 'Real future condition → **tell** her (imperative instruction).',
  'b2-u5-exd-4': 'Third conditional → I **would have baked** your favourite cake.',
  'b2-u5-exd-5': 'Precaution → leave a note **in case** he\'s forgotten.',
  'b2-u5-exd-6': 'First conditional → if you **see** her (real possibility).',

  'b2-u5-exe-1': 'Famous for bad reasons → most **infamous** crimes.',
  'b2-u5-exe-2': 'Average people → life is like for **ordinary** people.',
  'b2-u5-exe-3': 'Reflexive verb → really **enjoyed himself** at the party.',
  'b2-u5-exe-4': 'Reconcile after a quarrel → we could **make up**.',
  'b2-u5-exe-5': 'Fixed phrase → it wasn\'t their **fault**.',
  'b2-u5-exe-6': 'At a performance → the **audience** fell silent.'
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
