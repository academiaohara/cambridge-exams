#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 4: Review4
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'b2-u4-exa-1': '**Few** is unnecessary — say **a local radio station competition** (not "a few local").',
  'b2-u4-exa-2': '**The** is wrong before **free passes** — remove it.',
  'b2-u4-exa-3': '**Emailed me** — no **to** needed (not "emailed to me").',
  'b2-u4-exa-4': '**Amazing** is an adjective, not a noun — remove **an** (say "It was amazing!").',
  'b2-u4-exa-5': 'This line is correct — tap **OK** (no extra word).',
  'b2-u4-exa-6': '**Lots of** already means many — **a** is the extra word.',
  'b2-u4-exa-7': 'This line is correct — tap **OK** (no extra word).',
  'b2-u4-exa-8': 'This line is correct — tap **OK** (no extra word).',
  'b2-u4-exa-9': '**Go on** a competition — **into** is the extra word (not "go into on").',
  'b2-u4-exa-10': '**Happy** needs no intensifier here — **much** is the extra word.',

  'b2-u4-exb-1': 'People in politics → **politicians** (noun from POLITICS).',
  'b2-u4-exb-2': 'Useful for learning → wasn\'t very **informative** (adjective from INFORM).',
  'b2-u4-exb-3': 'Personal diary → kept a **journal** (noun from JOURNAL).',
  'b2-u4-exb-4': 'Something heard on radio → **announcement** (noun from ANNOUNCE).',
  'b2-u4-exb-5': 'Not written down → an **unwritten** rule (negative prefix + WRITE).',
  'b2-u4-exb-6': 'Unable to believe → complete **disbelief** (negative noun from BELIEVE).',
  'b2-u4-exb-7': 'Means of sharing ideas → **communication** (noun from COMMUNICATE).',
  'b2-u4-exb-8': 'Slightly funny → mildly **humorous** (adjective from HUMOUR).',

  'b2-u4-exc-1': 'Very similar → there **is little difference between** these candidates.',
  'b2-u4-exc-2': 'Strong effect on someone → teacher **had a great influence on** her.',
  'b2-u4-exc-3': 'Report what happened → she **gave a description of** the accident.',
  'b2-u4-exc-4': 'Owned/managed by → channel is now **under the control of** the media group.',
  'b2-u4-exc-5': 'Not worth trying → there **is no point in trying** to apply.',
  'b2-u4-exc-6': 'Personal opinion → it **is my view** that social media shapes opinion.',
  'b2-u4-exc-7': 'Probable future → editor **is likely to make** an announcement.',
  'b2-u4-exc-8': 'Instead of → the film, **in place of** which a documentary will be shown.',
  'b2-u4-exc-9': 'Would not speak about → politician refused **to comment on** the investigation.',

  'b2-u4-exd-1': '**Coverage** is uncountable → **How much** coverage.',
  'b2-u4-exd-2': '**People** are countable → only **a few** people manage.',
  'b2-u4-exd-3': '**Lots of** + countable plural → **lots** of pop-up adverts.',
  'b2-u4-exd-4': '**Money** with positive verb → earned **some** money.',
  'b2-u4-exd-5': 'Unlikely outcome → **little** chance of getting noticed.',
  'b2-u4-exd-6': 'Majority → **most** news programmes have an entertainment angle.',
  'b2-u4-exd-7': 'Negative + countable plural → there aren\'t **many** opportunities.',

  'b2-u4-exe-1': 'Broadcast starts → news bulletin **comes** on just before nine.',
  'b2-u4-exe-2': 'Quickly look through pages → **flicking** through a newspaper.',
  'b2-u4-exe-3': 'Mention a topic → bring that story **up** during the broadcast.',
  'b2-u4-exe-4': 'Examine thoroughly → didn\'t **go** into detail.',
  'b2-u4-exe-5': 'Invent a false story → completely **made up** that story.',
  'b2-u4-exe-6': 'Give to people → **handing out** complimentary copies.',
  'b2-u4-exe-7': 'Understand with difficulty → couldn\'t make **out** what the reporter was saying.'
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
