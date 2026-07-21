#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 8:
 * Unit22, Unit23, Unit24, Review8
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 22: Modal perfect ──────────────────────────────
  'b1-u22-exa-1': 'Past opportunity not taken → **could have helped**.',
  'b1-u22-exa-2': 'Looks terrible → **can\'t have rested** properly.',
  'b1-u22-exa-3': 'Criticism → **should have warned** me.',
  'b1-u22-exa-4': 'Logical deduction → **must have gone** to bed.',
  'b1-u22-exa-5': 'Missed opportunity → **could have reserved** a table.',
  'b1-u22-exa-6': 'Impossible (saw her downtown) → **can\'t have stayed** home.',
  'b1-u22-exa-7': 'Wrong to say → **shouldn\'t have said** those things.',
  'b1-u22-exa-8': 'Possibility → **might have left** his notebook.',

  'b1-u22-exb-1': 'Possible but didn\'t → **could have** taken a taxi.',
  'b1-u22-exb-2': 'Certain deduction → **must have** been nervous.',
  'b1-u22-exb-3': 'Impossible (huge project) → **can\'t have** finished.',
  'b1-u22-exb-4': 'Should have done → **should have** asked permission.',
  'b1-u22-exb-5': 'Possibility → **might have** forgotten to lock.',
  'b1-u22-exb-6': 'Possible if studied → **could have** passed.',
  'b1-u22-exb-7': 'Certain (very late) → **must have** taken wrong train.',
  'b1-u22-exb-8': 'Should have been kinder → **ought to have** been kinder.',

  'b1-u22-exc-1': 'Should have worn warmer coat → **should have**.',
  'b1-u22-exc-2': 'Shouldn\'t have eaten so much → **shouldn\'t have**.',
  'b1-u22-exc-3': 'Regret → **should have** paid more attention.',
  'b1-u22-exc-4': 'Wrong to laugh → **shouldn\'t have** laughed.',
  'b1-u22-exc-5': 'Expected by now → **ought to have** arrived.',
  'b1-u22-exc-6': 'Should have explained → **should have**.',
  'b1-u22-exc-7': 'Wrong to lie → **shouldn\'t have** lied.',
  'b1-u22-exc-8': 'Expected yesterday → **should have** come.',

  'b1-u22-exd-1': 'Open windows → someone **must have** forgotten.',
  'b1-u22-exd-2': 'Not in room → **might have** gone out.',
  'b1-u22-exd-3': 'Perfect answers → **must have** studied hard.',
  'b1-u22-exd-4': 'Empty fridge → smell **can\'t have** come from it.',
  'b1-u22-exd-5': 'Arrived before us → **may have** taken earlier bus.',
  'b1-u22-exd-6': 'Checked earlier → email **can\'t have** arrived this morning.',
  'b1-u22-exd-7': 'Looks relieved → **must have** solved the problem.',
  'b1-u22-exd-8': 'Wallet missing → **might have** dropped it.',

  'b1-u22-exe-1': 'Modal perfect + past participle → **should have spoken**.',
  'b1-u22-exe-2': 'After **might** → **have missed** (not **had**).',
  'b1-u22-exe-3': 'Past participle → **could have eaten** (not **ate**).',
  'b1-u22-exe-4': 'Past participle → **can\'t have written**.',
  'b1-u22-exe-5': 'Correct form → **ought to have checked**.',
  'b1-u22-exe-6': 'Irregular past participle → **shouldn\'t have driven**.',
  'b1-u22-exe-7': 'Past participle → **may have gone** (not **went**).',
  'b1-u22-exe-8': 'Past participle → **must have seen**.',

  'b1-u22-exf-1': 'Certain past → Ethan **must have lost** his keys.',
  'b1-u22-exf-2': 'Bad idea → **shouldn\'t have ignored** her messages.',
  'b1-u22-exf-3': 'Possibility → Chloe **might have forgotten** her homework.',
  'b1-u22-exf-4': 'Didn\'t join → **could have joined** the team.',
  'b1-u22-exf-5': 'Impossible → Noah **can\'t have broken** the window.',
  'b1-u22-exf-6': 'Should have thanked → **ought to have thanked** her.',

  'b1-u22-exg-1': 'After **have** → past participle **lost**.',
  'b1-u22-exg-2': 'After **have** → past participle **gone**.',
  'b1-u22-exg-3': 'After **have** → past participle **given**.',
  'b1-u22-exg-4': 'After **have** → past participle **forgotten**.',
  'b1-u22-exg-5': '**Done** is already the correct past participle here.',
  'b1-u22-exg-6': 'After **have** → past participle **seen**.',

  'b1-u22-exh-1': 'Impossible → **can\'t have stolen** the bicycle.',
  'b1-u22-exh-2': 'Wrong to interrupt → **shouldn\'t have interrupted**.',
  'b1-u22-exh-3': 'Certain → **must have been** tired.',
  'b1-u22-exh-4': 'Perhaps → **might have missed** the beginning.',
  'b1-u22-exh-5': 'Regret → **should have applied** for the job.',
  'b1-u22-exh-6': 'Impossible → **can\'t have been** easy.',

  // ── Unit 23: Questions & question tags ──────────────────
  'b1-u23-exa-1': '**You are** → **Are you** ready?',
  'b1-u23-exa-2': 'Present perfect → **Has she** received?',
  'b1-u23-exa-3': 'Past simple → **Did they go** to the concert?',
  'b1-u23-exa-4': 'Modal → **Could he** lend you?',
  'b1-u23-exa-5': 'Subject question → **Who called** you?',
  'b1-u23-exa-6': 'Object question → Who **did you call**?',
  'b1-u23-exa-7': 'When question → **When is Clara** starting?',
  'b1-u23-exa-8': 'Why question → **Why did** they cancel?',

  'b1-u23-exb-1': 'Positive statement → negative tag **aren\'t you**.',
  'b1-u23-exb-2': '**She is** → **isn\'t she**?',
  'b1-u23-exb-3': 'Negative → positive tag **have you**.',
  'b1-u23-exb-4': '**Tom has** → **doesn\'t he**?',
  'b1-u23-exb-5': '**Let\'s** → **shall we**?',
  'b1-u23-exb-6': 'Imperative → **will** you?',
  'b1-u23-exb-7': '**I\'m** → **aren\'t I**?',
  'b1-u23-exb-8': '**Everyone enjoyed** → **didn\'t they**?',

  'b1-u23-exc-1': '**You like** → **don\'t you**?',
  'b1-u23-exc-2': '**Never** (negative) → positive tag **does she**?',
  'b1-u23-exc-3': '**No milk** → positive tag **is there**?',
  'b1-u23-exc-4': '**We are meeting** → **aren\'t we**?',
  'b1-u23-exc-5': '**No one** → positive tag **did they**?',
  'b1-u23-exc-6': '**Should recycle** → **shouldn\'t they**?',
  'b1-u23-exc-7': 'Negative imperative → **will you**?',
  'b1-u23-exc-8': '**There will be** → **won\'t there**?',

  'b1-u23-exd-1': 'Indirect question → statement order: **the nearest pharmacy is**.',
  'b1-u23-exd-2': 'No inversion → **the museum opens**.',
  'b1-u23-exd-3': 'Indirect → **this costs**.',
  'b1-u23-exd-4': 'Indirect → **the next flight departs**.',
  'b1-u23-exd-5': 'Indirect → **the next steps are**.',
  'b1-u23-exd-6': '**I wonder if** → **whether** the shop is open.',
  'b1-u23-exd-7': 'Statement order → **the post office is**.',
  'b1-u23-exd-8': 'Indirect wh- → **where** he lives.',

  'b1-u23-exe-1': 'After **did** → base verb **go**.',
  'b1-u23-exe-2': 'After **does** → base verb **want**.',
  'b1-u23-exe-3': 'Question word order → **does \'procrastinate\' mean**.',
  'b1-u23-exe-4': 'Indirect → **the post office is** (not **is the**).',
  'b1-u23-exe-5': '**She** → **isn\'t she** (not **isn\'t it**).',
  'b1-u23-exe-6': '**You have** → **haven\'t you**.',
  'b1-u23-exe-7': 'Indirect → **the exit is**.',
  'b1-u23-exe-8': '**He** → **doesn\'t he** (not **doesn\'t it**).',

  'b1-u23-exf-1': 'Polite request → **Could** you tell me?',
  'b1-u23-exf-2': '**She\'s punctual** → **isn\'t she**?',
  'b1-u23-exf-3': 'Indirect → **when** the meeting starts.',
  'b1-u23-exf-4': 'Subject question → **Who** called?',
  'b1-u23-exf-5': '**Nothing** → positive tag **is there**?',
  'b1-u23-exf-6': 'Indirect question needs statement order + full stop → **what time the lesson is.**',
  'b1-u23-exf-7': 'Negative statement → positive tag **am I**?',
  'b1-u23-exf-8': '**Someone** → **didn\'t they**?',

  'b1-u23-exg-1': 'Present perfect question → **Have** you ever been?',
  'b1-u23-exg-2': '**Emma works** → **doesn\'t she**?',
  'b1-u23-exg-3': 'Indirect → **the library is**.',
  'b1-u23-exg-4': 'Future question → **Will** she be there?',
  'b1-u23-exg-5': '**Enjoyed** → **didn\'t they**?',
  'b1-u23-exg-6': 'Indirect → **how much** the tickets cost.',
  'b1-u23-exg-7': 'Possibility → **Might** they be lost?',
  'b1-u23-exg-8': 'How + auxiliary → **do** you say?',

  'b1-u23-exh-1': 'Indirect → **where the post office is**.',
  'b1-u23-exh-2': '**You don\'t live** → **do you**?',
  'b1-u23-exh-3': 'Indirect → **what time the lesson starts**.',
  'b1-u23-exh-4': '**Let\'s** → **shall we**?',
  'b1-u23-exh-5': '**I wonder** → **if** the shop is open.',
  'b1-u23-exh-6': 'Subject question → **Who** made that noise?',
  'b1-u23-exh-7': '**She sings** → **doesn\'t she**?',
  'b1-u23-exh-8': 'Indirect → **when the next flight departs**.',

  // ── Unit 24: Society & daily life ───────────────────────
  'b1-u24-exa-1': 'ID for travel → **identity card**.',
  'b1-u24-exa-2': 'Regular behaviour → good **habit**.',
  'b1-u24-exa-3': 'Timetable → my **schedule**.',
  'b1-u24-exa-4': 'Confess → **admit** breaking the vase.',
  'b1-u24-exa-5': 'Teen activities → **youth club**.',
  'b1-u24-exa-6': 'In charge of → **responsible** for feeding.',
  'b1-u24-exa-7': 'Local people together → whole **community**.',
  'b1-u24-exa-8': 'Number of people → **population** of the village.',

  'b1-u24-exb-1': 'Against the law → **illegal**.',
  'b1-u24-exb-2': 'Legal place for trials → **court**.',
  'b1-u24-exb-3': 'Normal for him → quite **typical**.',
  'b1-u24-exb-4': 'Elections → adults can **vote**.',
  'b1-u24-exb-5': 'Person who lives there → **resident**.',
  'b1-u24-exb-6': 'Traditions → national **culture**.',

  'b1-u24-exc-1': 'Start the day → **get up** at 6:30.',
  'b1-u24-exc-2': 'Stop sleeping → **wake up** early.',
  'b1-u24-exc-3': 'Tidy away → **put away** your clothes.',
  'b1-u24-exc-4': 'Clean dishes → **wash up** after dinner.',
  'b1-u24-exc-5': 'Enter illegally → **break into** the shop.',
  'b1-u24-exc-6': 'Reach same level → **catch up with** the class.',
  'b1-u24-exc-7': 'Avoid punishment → didn\'t **get away with** it.',
  'b1-u24-exc-8': 'Arrive to live → **move in** next weekend.',

  // ── Review 8 ────────────────────────────────────────────
  'b1-u8-exa-1': 'Past regret → **have spent** so much money.',
  'b1-u8-exa-2': 'Expected by now → train **must** have arrived.',
  'b1-u8-exa-3': 'Indirect question → **the nearest bank is.**',
  'b1-u8-exa-4': '**You don\'t live** → **do** you?',
  'b1-u8-exa-5': '**Let\'s** → **shall we**?',
  'b1-u8-exa-6': 'Uncertain → **might** have left his phone.',
  'b1-u8-exa-7': 'Indirect → **what time the lesson starts.**',
  'b1-u8-exa-8': '**I\'m making noise** → **aren\'t** I?',

  'b1-u8-exb-1': '**Broke** + **into** → broke into the shop.',
  'b1-u8-exb-2': '**Put** + **away** → put your shoes away.',
  'b1-u8-exb-3': '**Wakes me** + **up** → wakes me up.',
  'b1-u8-exb-4': '**Wash** + **up** → wash the cups up.',
  'b1-u8-exb-5': '**Move** + **in** → move in next weekend.',
  'b1-u8-exb-6': '**Get** + **up** → get up now.',

  'b1-u8-exc-1': 'Impossible → Sophie **can\'t have taken** your notebook.',
  'b1-u8-exc-2': 'Avoid punishment → won\'t **get away with** cheating.',
  'b1-u8-exc-3': 'Forgive for → forgiven **Liam for breaking** my camera.',
  'b1-u8-exc-4': 'Accuse of → **accused the man of stealing** the painting.',

  'b1-u8-exd-1': 'Past certainty → **must have seen** the film.',
  'b1-u8-exd-2': 'Should have done earlier → **should have started**.',
  'b1-u8-exd-3': 'Present deduction → **must be** busy.',
  'b1-u8-exd-4': 'Possibility → **might have left** it at home.',
  'b1-u8-exd-5': 'Impossible (finished quickly) → **can\'t have** been difficult.',
  'b1-u8-exd-6': 'Nearly missed → **could have missed** the train.',
  'b1-u8-exd-7': 'Possible mistake → **could have taken** wrong turning.',
  'b1-u8-exd-8': 'Past deduction → **must have been** ill.',
  'b1-u8-exd-9': 'Should have called → **should have called** me.',
  'b1-u8-exd-10': 'Good news → something **must have** happened.',
  'b1-u8-exd-11': '**You work** → **don\'t** you?',
  'b1-u8-exd-12': '**No sugar** → positive tag **is** there?',
  'b1-u8-exd-13': '**Hasn\'t finished** → positive tag **has** he?',
  'b1-u8-exd-14': '**Let\'s order** → **shall we**?',
  'b1-u8-exd-15': 'Indirect → **Anna lives** (statement order).',
  'b1-u8-exd-16': 'Indirect → **the film** starts (no **does**).',

  'b1-u8-exe-1': 'Catch a criminal → **arrest** the thief.',
  'b1-u8-exe-2': 'Against the **law** to drive without insurance.',
  'b1-u8-exe-3': 'Helps people → local **charity**.',
  'b1-u8-exe-4': 'Confess → **admit** he made a mistake.',
  'b1-u8-exe-5': 'Number of people → **population** has grown.',
  'b1-u8-exe-6': 'Stay in contact → keep in **touch**.',
  'b1-u8-exe-7': 'Guilty **of** stealing.',
  'b1-u8-exe-8': 'Blame **on** me.',
  'b1-u8-exe-9': 'Smiled **at** the children.',
  'b1-u8-exe-10': 'Punishment → sent to **prison**.',
  'b1-u8-exe-11': 'Oppose rules → **protest** against.',
  'b1-u8-exe-12': 'Share **with** me.',
  'b1-u8-exe-13': 'Start the day → gets **up** at seven.',
  'b1-u8-exe-14': 'Tidy away → put books **away**.',
  'b1-u8-exe-15': 'Start living → moved **in** last month.',
  'b1-u8-exe-16': 'Elections → can **vote**.'
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

const files = ['Unit22.v2.json', 'Unit23.v2.json', 'Unit24.v2.json', 'Review8.v2.json'];
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
