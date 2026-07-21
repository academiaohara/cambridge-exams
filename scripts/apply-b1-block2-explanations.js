#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 2:
 * Unit4, Unit5, Unit6, Review2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 4 ──────────────────────────────────────────────
  'b1-u4-exa-1': '**Already** shows the project is complete with a result that matters now — use **have finished**.',
  'b1-u4-exa-2': '**All her life** links past to present, so Emily still lives there: **has lived**.',
  'b1-u4-exa-3': '**Today** is unfinished time, so use present perfect negative **haven\'t seen**.',
  'b1-u4-exa-4': '**Since 2018** needs present perfect **have had** — they still own the car.',
  'b1-u4-exa-5': '**Ever** in experience questions → **Have you ever eaten**.',
  'b1-u4-exa-6': 'The homework affects us now, so use present perfect **has given**.',
  'b1-u4-exa-7': '**Yet** in negatives → **haven\'t chosen** (they still have no name).',
  'b-u4-exa-8': '',
  'b1-u4-exa-8': '**Just** in a question about a very recent event → **Has Sophie just arrived**.',

  'b1-u4-exb-1': '**I\'ve never visited** — experience up to now; **before** fits present perfect, not past simple.',
  'b1-u4-exb-2': '**Yesterday evening** is a finished past time → past simple **finished**.',
  'b1-u4-exb-3': '**For a long time** up to now → **Have they worked** (present perfect).',
  'b1-u4-exb-4': '**Last weekend** is a specific past time → past simple **went**.',
  'b1-u4-exb-5': '**It\'s the first time** triggers present perfect → **she\'s played**.',
  'b1-u4-exb-6': '**Yet** in negatives → **haven\'t eaten**.',
  'b1-u4-exb-7': 'Asking about a specific past trip → **Did you go** to Paris?',
  'b1-u4-exb-8': 'Life-experience question with **ever** → **Have you ever ridden**.',

  'b1-u4-exc-1': '**Yet** goes at the end of a negative present perfect sentence: **hasn\'t started yet**.',
  'b1-u4-exc-2': '**Already** shows the popcorn is bought before now → **has already bought**.',
  'b-u4-exc-3': '',
  'b1-u4-exc-3': '**Just** + present perfect → **have just sat down** (a moment ago).',
  'b1-u4-exc-4': 'Negative present perfect + **yet** → **hasn\'t finished her drink**.',
  'b1-u4-exc-5': '**Already** before the past participle → **has already turned off**.',
  'b1-u4-exc-6': 'Unspecified past time with present result → **has dropped** a ticket.',
  'b1-u4-exc-7': 'Negative + **yet** → **haven\'t picked it up yet**.',

  'b1-u4-exe-1': 'Experience up to now → present perfect **seen**, not continuous **been seeing**.',
  'b1-u4-exe-2': 'Completed action with **yet** → simple form **finished**, not continuous.',
  'b1-u4-exe-3': '**For hours** emphasises duration → **been studying** (present perfect continuous).',
  'b1-u4-exe-4': 'Ongoing wait up to now → **been waiting**, not just **waited**.',
  'b1-u4-exe-5': 'Completed result (**already**) → **washed**, not ongoing **been washing**.',
  'b1-u4-exe-6': '**All week** + still not finished → **been reading** (continuous activity).',
  'b1-u4-exe-7': '**Since this morning** → ongoing activity → **been playing**.',

  'b1-u4-exf-1': '**Yet** goes at the end of negative present perfect sentences.',
  'b1-u4-exf-2': '**For** + period of time → **for three years**.',
  'b1-u4-exf-3': '**Ever** in present perfect questions about life experience.',
  'b1-u4-exf-4': '**Already** shows the action happened before now → **already finished**.',
  'b1-u4-exf-5': '**Since** + starting point → **since 2020**.',
  'b1-u4-exf-6': '**Just** means a very short time ago → **just spoken**.',
  'b1-u4-exf-7': '**Never** + present perfect → no experience at any time.',

  // ── Unit 5 ──────────────────────────────────────────────
  'b1-u5-exa-1': 'The train left **before** we arrived → past perfect **had already left**.',
  'b1-u5-exa-2': 'Homework finished **before** dinner → **had finished**.',
  'b1-u5-exa-3': 'No table booked **before** they arrived → **hadn\'t booked**.',
  'b1-u5-exa-4': 'Experience **before** Canada → **Had Tom ever flown**.',
  'b1-u5-exa-5': 'Referee checked **before** the match started → **the referee had checked**.',
  'b1-u5-exa-6': 'Wallet left at home **before** trying to buy → **I had left**.',
  'b1-u5-exa-7': 'Lunch finished **before** I arrived → **Had you already finished**.',

  'b1-u5-exb-1': 'Kitchen cleaned **before** Mum came home → option B matches the order.',
  'b1-u5-exb-2': 'Project finished **before** calling Sam → option A.',
  'b1-u5-exb-3': 'Popcorn bought **before** the film started → option A.',
  'b1-u5-exb-4': 'Brother arrived **before** Lily left → option B.',
  'b1-u5-exb-5': 'Tests still unmarked on Friday → option A.',
  'b1-u5-exb-6': 'Bike sold **before** the phone call → option A.',
  'b1-u5-exb-7': 'Dinner cooked **before** we arrived → option B.',

  'b1-u5-exc-1': 'They left **before** we arrived → **had already left when we arrived**.',
  'b1-u5-exc-2': 'Meeting Anna happened **before** she joined → **hadn\'t met**.',
  'b1-u5-exc-3': 'Dinner eaten **before** Dad got home → **had already eaten**.',
  'b1-u5-exc-4': 'Bad sleep **before** feeling tired → **hadn\'t slept well**.',
  'b1-u5-exc-5': 'Seats found **before** the concert began → **had found their seats**.',

  'b1-u5-exd-1': 'Paint on him shows ongoing activity before now → **had been painting the fence**.',
  'b1-u5-exd-2': 'Exhaustion from walking all morning → **had been walking all morning**.',
  'b1-u5-exd-3': 'Wet streets show rain before → **it had been raining**.',
  'b1-u5-exd-4': 'Singing for hours caused the lost voice → **had been singing for hours**.',
  'b1-u5-exd-5': 'Waiting started before the bus came → **we had been waiting for forty minutes**.',
  'b1-u5-exd-6': 'They hadn\'t studied long **before** the call → **hadn\'t been studying long**.',

  'b1-u5-exe-1': 'Only ten minutes of sleep before the phone rang → **been sleeping** (duration).',
  'b1-u5-exe-2': 'Tickets bought **before** you called → past perfect simple **bought**.',
  'b1-u5-exe-3': 'She hadn\'t told us **before** we were surprised → **told** (completed earlier).',
  'b1-u5-exe-4': 'An hour of playing **before** rain → **been playing** (continuous duration).',
  'b1-u5-exe-5': 'Tidying all morning (ongoing) → **been tidying**.',
  'b1-u5-exe-6': 'Never been abroad **before** this trip → **been** (past perfect of **be**).',

  'b1-u5-exf-1': '**Yesterday** needs past simple **won** — **had** is the extra word.',
  'b1-u5-exf-2': '**Had been trained** is wrong here; **been** is the extra word — say **had trained**.',
  'b1-u5-exf-3': 'After **had**, use past participle **given**, not past simple **gave** — **had** is wrong.',
  'b1-u5-exf-4': 'This sentence is correct — no extra word to remove.',
  'b1-u5-exf-5': '**Been** doesn\'t fit before **scored** — remove **been** (say **had scored**).',
  'b1-u5-exf-6': 'This sentence is correct — **had been running** is the right past perfect continuous.',
  'b1-u5-exf-7': 'This sentence is correct — no extra word.',
  'b1-u5-exf-8': 'This sentence is correct — **had prepared** is fine.',
  'b1-u5-exf-9': '**Been** at the start is the extra word — remove it.',
  'b1-u5-exf-10': '**Yet** doesn\'t fit after **had** here — remove **yet**.',

  // ── Unit 6 ──────────────────────────────────────────────
  'b1-u6-exa-1': 'After studying hard, Maria hopes to **pass** the exam.',
  'b1-u6-exa-2': 'Without revision you might **fail** the test.',
  'b1-u6-exa-3': 'Results this term → present perfect **achieved**.',
  'b1-u6-exa-4': 'Read the **instructions** before starting an activity.',
  'b1-u6-exa-5': 'Working in a school was useful **experience**.',
  'b1-u6-exa-6': 'This job needs a university **degree**.',
  'b1-u6-exa-7': 'Typing quickly is a practical **skill**.',
  'b1-u6-exa-8': 'An online English **course** is something you study on.',
  'b1-u6-exa-9': 'A certificate is a teaching **qualification**.',
  'b1-u6-exa-10': 'Collocation: **made** a lot of **progress** since September.',
  'b1-u6-exa-11': 'You **take an exam** in a subject — you don\'t "make" one.',
  'b1-u6-exa-12': '**Make sure** your name is on the paper = check carefully.',

  'b1-u6-exb-1': '**Wonder** if = ask yourself whether; **search** needs an object.',
  'b1-u6-exb-2': 'A school **term** is a period of study; **mark** is a grade.',
  'b1-u6-exb-3': '**Remind** someone to do something; **revise** means study again.',
  'b1-u6-exb-4': 'A science **expert** knows the subject well.',
  'b1-u6-exb-5': 'A **talented** artist has natural ability.',
  'b1-u6-exb-6': '**Clever** describes someone who learns quickly.',
  'b1-u6-exb-7': 'Without knowing the answer, you **guessed**.',
  'b1-u6-exb-8': '**Considered studying** = thought about the idea of studying.',
  'b1-u6-exb-9': 'A school **report** describes a project or topic.',

  'b1-u6-exc-1': '**Revise** = study your notes again before a test.',
  'b1-u6-exc-2': '**Smart** is another word for intelligent.',
  'b1-u6-exc-3': 'Maths is a school **subject** you study.',
  'b1-u6-exc-4': 'When it\'s noisy, you can\'t **concentrate**.',
  'b1-u6-exc-5': 'Chess trains your **mental** (thinking) abilities.',
  'b1-u6-exc-6': 'A good **mark** is a high grade in a test.',
  'b1-u6-exc-7': '**Search for** information = look for it.',
  'b1-u6-exc-8': 'He **hesitated** = paused before answering.',
  'b1-u6-exc-9': 'The human **brain** controls thinking.',

  'b1-u6-exe-1': '**By heart** = from memory; **by fact** is not a phrase.',
  'b1-u6-exe-2': '**In favour of** = supporting an idea; **in instance of** is wrong.',
  'b1-u6-exe-3': '**In fact** = actually/truthfully; **in heart** is not used here.',
  'b1-u6-exe-4': '**For instance** = for example; **for conclusion** is wrong.',
  'b1-u6-exe-5': '**In general** = usually/on the whole; **In favour** needs "of".',
  'b1-u6-exe-6': 'Essays often end with **In conclusion**; **In general** comes earlier.',

  'b1-u6-exf-1': 'Noun from **EDUCATE** → **education**.',
  'b1-u6-exf-2': 'Plural noun for people starting → **beginners**.',
  'b1-u6-exf-3': 'Noun from **BRAVE** → **bravery**.',
  'b1-u6-exf-4': 'Noun from **REFER** → **reference** (section).',
  'b1-u6-exf-5': 'Noun from **SILENT** → **silence**.',
  'b1-u6-exf-6': 'Person who teaches → **instructor** from **INSTRUCT**.',
  'b1-u6-exf-7': 'Negative adjective from **CORRECT** → **incorrect**.',
  'b1-u6-exf-8': 'Maths operation noun from **DIVIDE** → **division**.',
  'b1-u6-exf-9': 'Verb from **SIMPLE** → **simplify**.',
  'b1-u6-exf-10': 'Verb from **MEMORY** → **memorise** (UK spelling).',

  'b1-u6-exg-1': 'We cheat **in** a test (inside an exam).',
  'b1-u6-exg-2': 'Learn **about** a topic = study it.',
  'b1-u6-exg-3': 'Opinion **of** something = your view on it.',
  'b1-u6-exg-4': 'Confuse X **with** Y = mix them up.',
  'b1-u6-exg-5': 'A question **about** the story = on that topic.',
  'b1-u6-exg-6': 'Cope **with** pressure/exams = manage them.',

  'b1-u6-exh-1': '**Good at** → **talented at** drawing (same meaning).',
  'b1-u6-exh-2': '**Didn\'t stop working** → **continued with** their work.',
  'b1-u6-exh-3': '**No information about** → **don\'t know anything about**.',
  'b1-u6-exh-4': 'Tom helped her → **helping Lucy with** the exercise.',
  'b1-u6-exh-5': '**Nobody can** → **is capable of** finishing (able to).',
  'b1-u6-exh-6': '**Manage to pass** → **succeed in passing**.',

  // ── Review 2 ────────────────────────────────────────────
  'b1-u2-exa-1': 'Collocation: **make progress** in a subject.',
  'b1-u2-exa-2': 'You sit an **exam** in a subject.',
  'b1-u2-exa-3': '**In favour of** = supporting uniforms.',
  'b1-u2-exa-4': 'Communication is a useful **skill** in jobs.',
  'b1-u2-exa-5': 'Learn **by heart** = memorise completely.',
  'b1-u2-exa-6': '**For instance** introduces an example (Canada).',
  'b1-u2-exa-7': 'A high **mark** is a good test score.',
  'b1-u2-exa-8': '**In fact** = actually (grammar is logical).',

  'b1-u2-exb-1': '**Rub out** = erase pencil marks.',
  'b1-u2-exb-2': '**Rip up** = tear into pieces.',
  'b1-u2-exb-3': '**Cross out** = draw a line through a wrong answer.',
  'b1-u2-exb-4': '**Look up** words = find them in a dictionary/online.',
  'b1-u2-exb-5': '**Read out** = say aloud for others to hear.',
  'b1-u2-exb-6': '**Point out** = mention/draw attention to something.',
  'b1-u2-exb-7': '**Write down** = record in writing.',

  'b1-u2-exc-1': 'Person who teaches swimming → **instructor**.',
  'b1-u2-exc-2': 'Atlas books are **reference** materials.',
  'b1-u2-exc-3': 'Someone new at an activity → **beginner**.',
  'b1-u2-exc-4': 'Opposite of multiplication in maths → **division**.',
  'b1-u2-exc-5': 'Negative form of correct → **incorrect**.',
  'b1-u2-exc-6': 'Noun from **BRAVE** → **bravery**.',

  'b1-u2-exd-1': 'Homework done with a present result → **have done**.',
  'b1-u2-exd-2': 'French studied **before** moving → **had studied**.',
  'b1-u2-exd-3': 'Life experience with **ever** → **eaten**.',
  'b1-u2-exd-4': 'Lesson started **before** we arrived → **had already started**.',
  'b1-u2-exd-5': 'Training from January until now → **has been training**.',
  'b1-u2-exd-6': 'Three films this weekend (unfinished time) → **has watched**.',
  'b1-u2-exd-7': 'Exercise done **before** the explanation → **had completed**.',
  'b1-u2-exd-8': '**Since last Christmas** → **haven\'t seen**.',
  'b1-u2-exd-9': '**How long** + ongoing action → **have you been studying**.',
  'b1-u2-exd-10': 'Film started **before** we reached the cinema → **had started**.',

  'b1-u2-exe-1': 'On your second **attempt** = second try.',
  'b1-u2-exe-2': 'An excellent **grade** is a high mark.',
  'b1-u2-exe-3': '**Revise** regularly to prepare for exams.',
  'b1-u2-exe-4': '**Take notes** during a lecture.',
  'b1-u2-exe-5': '**Good at** languages = skilled in them.',
  'b1-u2-exe-6': 'He **failed** the test twice before passing.',
  'b1-u2-exe-7': '**Work out** an answer = solve it.',
  'b1-u2-exe-8': 'Learning piano needs time and **practice**.',
  'b1-u2-exe-9': '**Take up** photography = start a new hobby.',
  'b1-u2-exe-10': '**Study** for a test = prepare for it.',
  'b1-u2-exe-11': 'Knew the speech **by heart** = memorised it.',
  'b1-u2-exe-12': 'The teacher gave useful **advice** (uncountable).'
};

const PASSAGE_EXPLANATIONS = {
  'b1-u4-ex-d': [
    'Lucy asks what Ben has been doing recently → **have you been doing**.',
    'Ben is still revising → **I\'ve been revising**.',
    'All-day study → **Have you been studying**.',
    'Sitting since morning (ongoing) → **I\'ve been sitting**.',
    'Negative continuous: no breaks → **I haven\'t been taking**.',
    'Working with Alex (ongoing) → **I\'ve been working**.',
    'Cleaning all afternoon → **I\'ve been cleaning**.',
    'Also preparing dinner → **we\'ve also been preparing**.',
    'Still deciding on toppings → **We\'ve been looking** at recipes.',
    'Thinking about joining the team → **I\'ve been thinking**.'
  ],
  'b1-u6-ex-d': [
    'Turn exam papers **over** to start writing on the back.',
    'Read the questions **out** loud for everyone.',
    'Look **up** dates = find them in a book (not look at the ceiling).',
    'Rub a mistake **out** with an eraser.',
    'Cross a wrong sentence **out**.',
    'Rip the paper **up** when nervous.',
    'Write important names **down**.',
    'Point **out** = tell/remind everyone to check spelling.'
  ]
};

function applyToFile(filename) {
  const filePath = path.join(COURSE, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = 0;
  let missing = [];

  (data.contentBanks?.exercises || []).forEach(function(ex) {
    if (PASSAGE_EXPLANATIONS[ex.id]) {
      ex.explanations = PASSAGE_EXPLANATIONS[ex.id];
      updated += PASSAGE_EXPLANATIONS[ex.id].length;
    }
    (ex.items || []).forEach(function(item) {
      if (EXPLANATIONS[item.id]) {
        item.explanation = EXPLANATIONS[item.id];
        updated++;
      } else if (!item.explanation || !item.explanation.trim()) {
        missing.push(item.id);
      }
    });
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  return { file: filename, updated, missing };
}

const files = ['Unit4.v2.json', 'Unit5.v2.json', 'Unit6.v2.json', 'Review2.v2.json'];
let totalMissing = [];

files.forEach(function(f) {
  const r = applyToFile(f);
  console.log(f + ': updated ' + r.updated + ' explanations');
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
