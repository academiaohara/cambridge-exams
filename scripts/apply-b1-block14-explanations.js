#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 14:
 * Unit40, Unit41, Unit42, Review14
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 40: Connectives ──────────────────────────────────
  'b1-u40-exa-1': 'Action before another → **before** the train leaves.',
  'b1-u40-exa-2': 'Wait up to a point → **until** I come back.',
  'b1-u40-exa-3': 'When something happens → **when** the rain stops.',
  'b1-u40-exa-4': 'Immediately after → **as soon as** I find it.',
  'b1-u40-exa-5': 'Do something first → **before** you go to sleep.',
  'b1-u40-exa-6': 'Two actions at the same time → **while** she waits.',

  'b1-u40-exb-1': 'Contrast with clause → **Although** it was very late.',
  'b1-u40-exb-2': 'Contrast + **-ing** → **Despite** feeling ill.',
  'b1-u40-exb-3': 'Contrast + noun phrase → **in spite of** the bad weather.',
  'b1-u40-exb-4': 'Contrast + noun → **Despite** his mistakes.',
  'b1-u40-exb-5': 'Contrast clause → **Although** the restaurant was expensive.',
  'b1-u40-exb-6': 'Contrast + noun → **In spite of** the cold.',

  'b1-u40-exc-1': 'Wait for completion → **until** the update finishes.',
  'b1-u40-exc-2': 'Contrast clause → **Although** she was scared.',
  'b1-u40-exc-3': 'Contrast + noun → **Despite** the long journey.',
  'b1-u40-exc-4': 'Condition (if not) → **unless** you practise.',
  'b1-u40-exc-5': 'Contrast between sentences → **However**.',
  'b1-u40-exc-6': 'Simultaneous actions → **while** you clean.',

  'b1-u40-exd-1': 'Condition → **unless** you read the first chapter.',
  'b1-u40-exd-2': 'Contrast clause → **Although** she was nervous.',
  'b1-u40-exd-3': 'Condition (only if) → **unless** we have tickets.',
  'b1-u40-exd-4': 'Contrast between sentences → **However**.',
  'b1-u40-exd-5': 'Contrast + noun → **Despite** the rain.',
  'b1-u40-exd-6': 'Condition (if not) → **unless** you drop it.',

  'b1-u40-exe-1': 'After **as soon as** → present **know** (not **will know**).',
  'b1-u40-exe-2': 'Contrast clause → **Although** he was busy.',
  'b1-u40-exe-3': 'After **in spite of** → **-ing** → **listening**.',
  'b1-u40-exe-4': 'Contrast between sentences → **However**.',
  'b1-u40-exe-5': 'Condition (if not) → **unless** you arrive early.',
  'b1-u40-exe-6': 'Up to a point in time → **until** I call your name.',

  // ── Unit 41: Causative ──────────────────────────────────────
  'b1-u41-exa-1': 'Past causative → **had** their garden **designed**.',
  'b1-u41-exa-2': 'Present continuous causative → **is having** his suit **cleaned**.',
  'b1-u41-exa-3': 'Future causative → **are going to have** serviced.',
  'b1-u41-exa-4': 'Present simple causative → **has** her nails **done**.',
  'b1-u41-exa-5': 'Past perfect causative → **had had** replaced.',
  'b1-u41-exa-6': 'Should + causative → **have** the documents **translated**.',

  'b1-u41-exb-1': 'Causative rewrite → **We had our shower repaired** yesterday.',
  'b1-u41-exb-2': 'Present continuous → **is having her hair coloured** now.',
  'b1-u41-exb-3': 'Future causative → **will have their new sofa delivered**.',
  'b1-u41-exb-4': 'Present continuous → **is having his computer software updated**.',
  'b1-u41-exb-5': 'Habitual causative → **have their trees trimmed** every spring.',
  'b1-u41-exb-6': 'Past causative → **had my eyes tested** last week.',

  'b1-u41-exc-1': 'Past causative → **had** her bike fixed.',
  'b1-u41-exc-2': 'Future → **going to have** their flat decorated.',
  'b1-u41-exc-3': 'Past causative → **had** his teeth cleaned.',
  'b1-u41-exc-4': 'Habit → **have** their car washed.',
  'b1-u41-exc-5': 'Past causative → **had** her passport photo taken.',
  'b1-u41-exc-6': 'Present continuous → **having** their company logo made.',

  // ── Unit 42: Topic vocabulary ───────────────────────────────
  'b1-u42-exa-1': 'Look into a problem → **investigate**.',
  'b1-u42-exa-2': 'Think without proof → **assume**.',
  'b1-u42-exa-3': 'Noun after **made a** → **claim**.',
  'b1-u42-exa-4': 'Alert someone → **warn** drivers.',
  'b1-u42-exa-5': 'Say no → **refused** to answer.',
  'b1-u42-exa-6': 'Make something happen → **cause** problems.',
  'b1-u42-exa-7': 'As a **result** → consequence of hard work.',
  'b1-u42-exa-8': 'Say you didn\'t do it → **deny** taking.',

  'b1-u42-exb-1': 'Opinion phrase → **In my view**.',
  'b1-u42-exb-2': 'Untidy room → **in a mess**.',
  'b1-u42-exb-3': 'Unverified story → **rumour**.',
  'b1-u42-exb-4': 'Stressed situation → **under pressure**.',
  'b1-u42-exb-5': 'After winning → coach **praised** players.',
  'b1-u42-exb-6': 'Not on purpose → **by mistake**.',

  'b1-u42-exc-1': 'Collect from the floor → **pick up**.',
  'b1-u42-exc-2': 'Solve a problem → **sort out**.',
  'b1-u42-exc-3': 'Warning → **Watch out**!',
  'b1-u42-exc-4': 'Put on a hook → **hang** it **up**.',
  'b1-u42-exc-5': 'No more left → **run out of** time.',
  'b1-u42-exc-6': 'Distribute equally → **share out**.',
  'b1-u42-exc-7': 'Return to place → **put back**.',
  'b1-u42-exc-8': 'Find the answer → **work out**.',

  'b1-u42-exd-1': 'Not on purpose → **by accident**.',
  'b1-u42-exd-2': 'Stressed → **under pressure**.',
  'b1-u42-exd-3': 'Untidy room → **in a mess**.',
  'b1-u42-exd-4': 'At risk of → **in danger of** losing.',
  'b1-u42-exd-5': 'Opinion → **In my view**.',
  'b1-u42-exd-6': 'In trouble → consequences of copying.',

  'b1-u42-exe-1': 'Sure **about** your decision.',
  'b1-u42-exe-2': 'Advise **against** eating sugar.',
  'b1-u42-exe-3': 'Agree **with** Maria.',
  'b1-u42-exe-4': 'Believe **in** second chances.',
  'b1-u42-exe-5': 'Deal **with** this problem.',
  'b1-u42-exe-6': 'Happen **to** your phone?',
  'b1-u42-exe-7': 'Hide **from** her parents.',
  'b1-u42-exe-8': 'Insist **on** telling the truth.',
  'b1-u42-exe-9': 'Rely **on** me.',
  'b1-u42-exe-10': 'Advantage **of** teamwork.',

  'b1-u42-exf-1': 'Uncountable noun → **advice**.',
  'b1-u42-exf-2': 'How you feel → **confused**.',
  'b1-u42-exf-3': 'Noun from EXCEPT → **exception**.',
  'b1-u42-exf-4': 'Adjective → **helpful** comments.',
  'b1-u42-exf-5': 'Adjective → **lucky** to find.',
  'b1-u42-exf-6': 'Noun → **preference** for tea.',
  'b1-u42-exf-7': 'Noun → **recommendation**.',
  'b1-u42-exf-8': 'Noun → **refusal** to listen.',
  'b1-u42-exf-9': 'Noun from SOLVE → **solution**.',
  'b1-u42-exf-10': 'Noun → **suggestion**.',

  'b1-u42-exg-1': 'Unverified story → **rumour**.',
  'b1-u42-exg-2': 'Solve a problem → **sort out**.',
  'b1-u42-exg-3': 'Approve **of** lying.',
  'b1-u42-exg-4': 'No more left → **run out of** paper.',
  'b1-u42-exg-5': 'Noun from suggest → **suggestion**.',
  'b1-u42-exg-6': 'Opinion phrase → **In my view**.',

  'b1-u42-exh-1': 'Talk behind backs → **gossip**.',
  'b1-u42-exh-2': 'Not on purpose → by **accident**.',
  'b1-u42-exh-3': 'Serious talk → **discussion**.',
  'b1-u42-exh-4': 'Make someone believe → **convince**.',
  'b1-u42-exh-5': 'Say something good → **praise**.',
  'b1-u42-exh-6': 'Act as if → **pretended** to be asleep.',
  'b1-u42-exh-7': 'Get **in** trouble.',
  'b1-u42-exh-8': 'Answer to a problem → **solution**.',

  'b1-u42-exi-1': 'Opinion → **In my opinion**.',
  'b1-u42-exi-2': 'Serious talk → **discussion**.',
  'b1-u42-exi-3': 'Not on purpose → by **accident**.',
  'b1-u42-exi-4': 'Effect on choices → **influence**.',
  'b1-u42-exi-5': 'Get into **trouble**.',
  'b1-u42-exi-6': 'Positive **attitude**.',
  'b1-u42-exi-7': 'Unverified story → **rumour**.',
  'b1-u42-exi-8': 'Make a **decision**.',
  'b1-u42-exi-9': 'Feel **pressure** before exams.',
  'b1-u42-exi-10': 'From my **view** → opinion.',

  // ── Review 14 ───────────────────────────────────────────────
  'b1-u14-exa-1': 'Persuade someone → **convince** Mia.',
  'b1-u14-exa-2': 'Say no → **refused** to give.',
  'b1-u14-exa-3': 'Stop **complaining** about the weather.',
  'b1-u14-exa-4': 'Not sure → **doubt** he\'ll remember.',
  'b1-u14-exa-5': 'Past of warn → **warned** us not to.',
  'b1-u14-exa-6': 'Say you didn\'t → **deny** breaking.',
  'b1-u14-exa-7': 'Say something good → **praise** children.',
  'b1-u14-exa-8': 'Say something negative → **criticise** her ideas.',

  'b1-u14-exb-1': 'Opinion → **In** my view.',
  'b1-u14-exb-2': 'Such + noun → **such** a terrible mess.',
  'b1-u14-exb-3': 'Stressed → **under** a lot of pressure.',
  'b1-u14-exb-4': 'Get **in** trouble.',
  'b1-u14-exb-5': 'Not **in** any danger.',
  'b1-u14-exb-6': 'Not on purpose → **by** mistake.',

  'b1-u14-exc-1': 'Throw away → **get rid of**.',
  'b1-u14-exc-2': 'Don\'t approve **of students using** phones.',
  'b1-u14-exc-3': 'Exist → **believe in** aliens.',
  'b1-u14-exc-4': 'Solve → **sort out this misunderstanding**.',
  'b1-u14-exc-5': 'No more left → **we have run out of** coffee.',
  'b1-u14-exc-6': 'Handle → **deal with** customers.',
  'b1-u14-exc-7': 'Be careful → **don\'t watch out**.',
  'b1-u14-exc-8': 'Advice → **advise you not to accept**.',

  'b1-u14-exd-1': 'Causative → **had** the windows **cleaned**.',
  'b1-u14-exd-2': 'Causative → got her bike **fixed**.',
  'b1-u14-exd-3': 'Causative → have their kitchen **painted**.',
  'b1-u14-exd-4': 'Causative → getting his screen **replaced**.',
  'b1-u14-exd-5': 'Contrast after **although** → **still** we enjoyed it.',
  'b1-u14-exd-6': 'Contrast between clauses → **however**.',
  'b1-u14-exd-7': 'As well as → kind **as** well as intelligent.',
  'b1-u14-exd-8': 'Purpose → **so that** I wouldn\'t forget.',
  'b1-u14-exd-9': 'Contrast + **-ing** → **Despite** arriving late.',
  'b1-u14-exd-10': 'Causative → had photo **taken**.',
  'b1-u14-exd-11': 'Not only … **but** also.',
  'b1-u14-exd-12': 'Reason + noun → **because of** the rain.',
  'b1-u14-exd-13': 'Causative → had her eyes **tested**.',
  'b1-u14-exd-14': 'Contrast clause → **Although** it was difficult.',

  'b1-u14-exe-1': 'Fix a problem → **solve** the issue.',
  'b1-u14-exe-2': 'Think of an idea → came **up** with.',
  'b1-u14-exe-3': 'Handle → **deal** with the complaint.',
  'b1-u14-exe-4': 'Repair → **fix** the computer.',
  'b1-u14-exe-5': 'Discover → **find** a solution.',
  'b1-u14-exe-6': 'Noun → made a **complaint**.',
  'b1-u14-exe-7': 'Ask for help → **seek** advice.',
  'b1-u14-exe-8': 'Past participle → was **sorted** out.',
  'b1-u14-exe-9': 'Help → **step** in.',
  'b1-u14-exe-10': 'End peacefully → **resolve** the argument.',
  'b1-u14-exe-11': 'Report the **problem**.',
  'b1-u14-exe-12': 'Answer → simplest **solution**.',
  'b1-u14-exe-13': 'Talk **speak** to her parents.',
  'b1-u14-exe-14': 'Take **control** of the team.'
};

function applyToFile(filename) {
  const filePath = path.join(COURSE, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = 0;
  let missing = [];
  let skipped = 0;

  (data.contentBanks?.exercises || []).forEach(function(ex) {
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

const files = ['Unit40.v2.json', 'Unit41.v2.json', 'Unit42.v2.json', 'Review14.v2.json'];
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
