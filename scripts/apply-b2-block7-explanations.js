#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 7: Review7
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u7-ex-a': [
    'Did not know → completely **unaware** that the berries were dangerous.',
    'Stress importance → cannot **emphasise** enough how important…',
    'Medical noun → urgently needed an **injection** of antidote.',
    'Harmful → highly **poisonous** substance.',
    'Feeling unwell → felt incredibly **uncomfortable**.',
    'Medical professional → A **surgeon** at the hospital confirmed…',
    'Care received → The **treatment** involved close monitoring.',
    'Doctor\'s note for medicine → gave him a **prescription**.',
    'Bad reaction → **allergic** to one of the tablets.',
    'Return to health → made a full **recovery**.'
  ]
};

const EXPLANATIONS = {
  'b2-u7-exb-1': 'No necessity → there **is no need for Adrian** to take medication.',
  'b2-u7-exb-2': 'Cause and result → a serious illness **led to the minister\'s** resignation.',
  'b2-u7-exb-3': 'Not worth it → it **is not worth seeing** the doctor.',
  'b2-u7-exb-4': 'Arrange a visit → **made an appointment with** the physiotherapist.',
  'b2-u7-exb-5': 'Fed up with → I **am tired of being** on a strict diet.',
  'b2-u7-exb-6': 'Unlikely future → your knee **is unlikely to** recover in time.',
  'b2-u7-exb-7': 'Wish about ability → I\'d love **to be able to do** a triathlon.',
  'b2-u7-exb-8': 'Reduce consumption → **cut down on** salt.',

  'b2-u7-exc-1': 'Become ill → **come down with** a bad cold.',
  'b2-u7-exc-2': 'Recover from illness → **get over** his knee operation.',
  'b2-u7-exc-3': 'Regain consciousness → patients **come round** after surgery.',
  'b2-u7-exc-4': 'Lose consciousness suddenly → she nearly **passed out**.',
  'b2-u7-exc-5': 'Gain weight → has **put on** quite a lot of weight.',
  'b2-u7-exc-6': 'Start suddenly (infections) → infections **break out** in crowded spaces.',
  'b2-u7-exc-7': 'Cause symptoms → what\'s been **bringing on** my back pain.',
  'b2-u7-exc-8': 'Stop a habit → decided to **give up** processed foods.',

  'b2-u7-exd-1': 'Past possibility not taken → I **could** have signed up, but I went jogging instead.',
  'b2-u7-exd-2': 'Advice about now → You **should get** more sleep.',
  'b2-u7-exd-3': 'Past regret/advice → You should **have called** me.',
  'b2-u7-exd-4': 'Past obligation question → **Did you have to** wear a bandage?',
  'b2-u7-exd-5': 'No obligation → You **don\'t have to** follow a strict diet.',
  'b2-u7-exd-6': 'Impossible deduction → That **can\'t** be Lucy — she\'s in surgery.',
  'b2-u7-exd-7': 'Past deduction → You must **have been** relieved.',
  'b2-u7-exd-8': 'Obligation in a hypothetical → I\'d hate to **have to** do that.',

  'b2-u7-exe-1': 'Medical check → the nurse **examined** the bruise.',
  'b2-u7-exe-2': 'Cooking instructions → a healthy **recipe** for soup.',
  'b2-u7-exe-3': 'Muscles after exercise → shoulders are **sore**.',
  'b2-u7-exe-4': 'Hurt in an accident → luckily wasn\'t **injured** at all.',
  'b2-u7-exe-5': 'Unhealthily thin → looks terribly **thin**.',
  'b2-u7-exe-6': 'Medicine collocation → unpleasant side **effects**.',
  'b2-u7-exe-7': 'Euthanise an animal → would have to **put down** Bonnie.',
  'b2-u7-exe-8': 'Fixed phrase → has really **done** me good.'
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

const files = ['Review7.v2.json'];
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
