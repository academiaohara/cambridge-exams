#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 4:
 * Unit10, Unit11, Unit12, Review4
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 10: Passive voice ──────────────────────────────
  'b1-u10-exa-1': 'Habitual action + no agent → present simple passive **are washed**.',
  'b1-u10-exa-2': 'Finished past time → past simple passive **was decorated**.',
  'b1-u10-exa-3': 'Future time → **will be emailed**.',
  'b1-u10-exa-4': 'General truth about where things are made → **are produced**.',
  'b1-u10-exa-5': 'Yesterday → past negative passive **weren\'t finished**.',
  'b1-u10-exa-6': 'Passive question → **Will the prizes be given**?',
  'b1-u10-exa-7': 'The teacher marks them → **are marked** by our teacher.',
  'b1-u10-exa-8': 'Past negative + nowhere found → **weren\'t discovered**.',

  'b1-u10-exb-1': 'Active → passive: **Coffee is grown** in Brazil (no agent needed).',
  'b1-u10-exb-2': 'Past passive → **The school gate was damaged** last night.',
  'b1-u10-exb-3': 'Future passive → **The winners will be announced** next week.',
  'b1-u10-exb-4': 'Allow → passive negative → **Phones aren\'t allowed** in class.',
  'b1-u10-exb-5': 'Did they cancel? → **Was the football match cancelled**?',
  'b1-u10-exb-6': 'The chef prepared → **The food was prepared** this morning.',

  'b1-u10-exc-1': 'Each year, ongoing → **is visited** by tourists.',
  'b1-u10-exc-2': 'Yesterday afternoon → **was completed**.',
  'b1-u10-exc-3': 'Next month → **will be opened** (not active **will open**).',
  'b1-u10-exc-4': 'Every night → **are cleaned**.',
  'b1-u10-exc-5': 'During the storm → **wasn\'t opened** (passive negative).',
  'b1-u10-exc-6': 'Passive question → **Is the parcel delivered** every morning?',

  'b1-u10-exd-1': 'The agent who wrote → **by** a famous author.',
  'b1-u10-exd-2': 'The tool used → **with** a sharp knife.',
  'b1-u10-exd-3': 'Who organised → **by** the drama club.',
  'b1-u10-exd-4': 'Instrument used → **with** a mop.',
  'b1-u10-exd-5': 'Who painted → **by** local artists.',
  'b1-u10-exd-6': 'Device used → **with** a digital camera.',

  'b1-u10-exe-1': 'After the event → past passive **were put away**.',
  'b1-u10-exe-2': 'Before the concert → **were put up**.',
  'b1-u10-exe-3': 'Every evening → present passive **are switched off**.',
  'b1-u10-exe-4': 'Next year → future passive **will be knocked down**.',
  'b1-u10-exe-5': 'Her name omitted → **was left out**.',
  'b1-u10-exe-6': 'After the trip → **were picked up**.',

  'b1-u10-exf-1': 'Plural subject **sandwiches** → **are** prepared.',
  'b1-u10-exf-2': 'Singular **bag** → **was** found (not **were**).',
  'b1-u10-exf-3': 'Invitations receive the action → **will be sent**.',
  'b1-u10-exf-4': 'Plural **documents** → question **Are** the documents...?',
  'b1-u10-exf-5': 'Past participle needed → **decorated** (not **decorate**).',
  'b1-u10-exf-6': 'Passive needed → **is played** all over the world.',

  'b1-u10-exg-1': 'Breakfast is served to guests → **is served**.',
  'b1-u10-exg-2': 'In 1965 → past passive **was built**.',
  'b1-u10-exg-3': 'Next Friday → **will be held**.',
  'b1-u10-exg-4': 'Yesterday + server crashed → **weren\'t sent**.',
  'b1-u10-exg-5': 'Passive question about origin → **are** these trainers made?',
  'b1-u10-exg-6': 'After the competition → **was cleaned**.',

  'b1-u10-exh-1': 'Someone washes → **are washed** every day.',
  'b1-u10-exh-2': 'They delivered → **was delivered** this morning.',
  'b1-u10-exh-3': 'They will publish → **will be published** next week.',
  'b1-u10-exh-4': 'Did someone invite? → **Was Emma invited**?',
  'b1-u10-exh-5': 'People don\'t use → **isn\'t used** during holidays.',
  'b1-u10-exh-6': 'Someone turned off → **were turned off** before we arrived.',

  // ── Unit 11: Passive with modals / perfect / continuous ─
  'b1-u11-exa-1': 'Present continuous active → **are being checked** by the manager.',
  'b1-u11-exa-2': 'Present perfect active → **has been decorated** by the students.',
  'b1-u11-exa-3': 'Past perfect active → **had been completed** before winter.',
  'b1-u11-exa-4': 'Might postpone → **might be postponed**.',
  'b1-u11-exa-5': 'Can organise → **can be organised** online.',

  'b1-u11-exb-1': 'At the moment → present continuous passive **is being decorated**.',
  'b1-u11-exb-2': 'Already → present perfect passive **have been reserved**.',
  'b1-u11-exb-3': 'When we arrived (ongoing) → **were being installed**.',
  'b1-u11-exb-4': 'Before the meeting → past perfect passive **had been approved**.',
  'b1-u11-exb-5': 'Next year plan → **is going to be opened**.',
  'b1-u11-exb-6': 'Rule/prohibition → **must not be eaten** in the lab.',

  'b1-u11-exc-1': 'Who wrote → **by** a famous journalist.',
  'b1-u11-exc-2': 'Tool used → **with** a special cloth.',
  'b1-u11-exc-3': 'No agent or instrument → use **-** (no preposition).',
  'b1-u11-exc-4': 'Instrument → chopped **with** a large knife.',
  'b1-u11-exc-5': 'Chosen by → **by** the judges.',

  'b1-u11-exd-1': 'Before the manager arrived → **had been deleted**.',
  'b1-u11-exd-2': 'At the moment → **is being designed**.',
  'b1-u11-exd-3': 'Past event → **were asked** to wait.',
  'b1-u11-exd-4': 'When we entered (ongoing) → **was still being prepared**.',
  'b1-u11-exd-5': 'By next Friday → **will have been completed**.',
  'b1-u11-exd-6': 'Since Monday → **has been kept** at the office.',

  // ── Unit 12: Relationships ──────────────────────────────
  'b1-u12-exa-1': 'You should say sorry → **apologise** to Max.',
  'b1-u12-exa-2': 'Someone unknown → a **stranger**.',
  'b1-u12-exa-3': 'Area where people live → a **neighbourhood**.',
  'b1-u12-exa-4': 'Pays for everyone → very **generous**.',
  'b1-u12-exa-5': 'Thankful for help → **grateful** to neighbours.',
  'b1-u12-exa-6': 'Cheerful feeling → in a cheerful **mood**.',
  'b1-u12-exa-7': 'Value other opinions → **respect** them.',
  'b1-u12-exa-8': 'Tell each other everything → **close** friends.',

  'b1-u12-exb-1': 'Pay his own rent → wants to be **independent**.',
  'b1-u12-exb-2': 'Before guests → **decorate** their flat.',
  'b1-u12-exb-3': 'Share secrets → **trust** my cousin.',
  'b1-u12-exb-4': 'Meet someone new → **introduce** me.',
  'b1-u12-exb-5': 'Family member → a **relation** (uncle).',
  'b1-u12-exb-6': 'No longer married but still friends → **divorced**.',

  'b1-u12-exc-1': 'Raise children → **bring up** three children.',
  'b1-u12-exc-2': 'Have an argument → **fall out with** Emma.',
  'b1-u12-exc-3': 'Have a good relationship → **get on with** your brother.',
  'b1-u12-exc-4': 'Be in a romantic relationship → **go out with** Daniel.',
  'b1-u12-exc-5': 'Disappoint someone → **let down** anyone.',
  'b1-u12-exc-6': 'Take care of → **look after** the dog.',

  'b1-u12-exd-1': 'Alone → by **herself**.',
  'b1-u12-exd-2': 'Shared interests → a lot in **common**.',
  'b1-u12-exd-3': 'Still communicate → in **contact** with friends.',
  'b1-u12-exd-4': 'Romantic phrase → in **love** with each other.',
  'b1-u12-exd-5': 'Not intentionally → not on **purpose**.',
  'b1-u12-exd-6': 'Independently → on his **own**.',

  'b1-u12-exe-1': '**Fond of** is the correct pattern — we feel fond **of** grandparents.',
  'b1-u12-exe-2': '**Jealous of** someone\'s success (not jealous about).',
  'b1-u12-exe-3': '**Kind to** the new student.',
  'b1-u12-exe-4': '**Married to** a musician.',
  'b1-u12-exe-5': '**Proud of** achievements.',
  'b1-u12-exe-6': '**Apologised for** being late.',
  'b1-u12-exe-7': '**Argued about** money.',
  'b1-u12-exe-8': '**Admire** someone **for** their honesty.',

  'b1-u12-exf-1': 'Noun from **ADMIRE** → **admiration**.',
  'b1-u12-exf-2': 'Noun from **FORGIVE** → **forgiveness**.',
  'b1-u12-exf-3': 'Noun from **HONEST** → **honesty**.',
  'b1-u12-exf-4': 'Noun from **INTRODUCE** → **introduction**.',
  'b1-u12-exf-5': 'Noun from **CONFIDENT** → **confidence**.',
  'b1-u12-exf-6': 'Person who lies → a **liar**.',
  'b1-u12-exf-7': 'Noun from **ABLE** → **ability** to stay calm.',
  'b1-u12-exf-8': 'Noun from **RELATE** → their **relationship** improved.',

  'b1-u12-exg-1': 'Alone → **on my own** helps me think.',
  'b1-u12-exg-2': 'Have a good relationship → **get on** really well.',
  'b1-u12-exg-3': 'Tell untruths → don\'t **lie to** me.',
  'b1-u12-exg-4': '**Proud of** her brother (fixed pattern).',
  'b1-u12-exg-5': '**In contact** = still communicating.',
  'b1-u12-exg-6': 'Take care of → **look after** my sister.',

  'b1-u12-exh-1': 'Argue **with** someone (not argue about parents here).',
  'b1-u12-exh-2': 'End a relationship → **split** up.',
  'b1-u12-exh-3': 'Bad feeling → in a bad **mood**.',
  'b1-u12-exh-4': 'Meet formally → **introduce** me to your cousin.',
  'b1-u12-exh-5': 'It was **kind** of you = you were kind.',
  'b1-u12-exh-6': 'Not deliberately → not on **purpose**.',
  'b1-u12-exh-7': 'Apartment → rent a small **flat**.',
  'b1-u12-exh-8': 'Keep in **contact** with neighbours.',

  // ── Review 4 ────────────────────────────────────────────
  'b1-u4-exa-1': 'Meet someone formally → **introduce** you.',
  'b1-u4-exa-2': 'Know who someone is → **recognise** you.',
  'b1-u4-exa-3': 'Say sorry → **apologise**.',
  'b1-u4-exa-4': 'Pay to use a home → **rent** a flat.',
  'b1-u4-exa-5': 'Believe someone is loyal → **trust** Jake.',
  'b1-u4-exa-6': 'Admire her volunteering → **respect** people like her.',
  'b1-u4-exa-7': 'Support someone → **defend** Mia.',

  'b1-u4-exb-1': 'Take care of → look **after** my dog.',
  'b1-u4-exb-2': 'End a relationship → split **up**.',
  'b1-u4-exb-3': 'Have a disagreement → fallen **out**.',
  'b1-u4-exb-4': 'Raised as a child → brought **up** by grandmother.',
  'b1-u4-exb-5': 'In a relationship → going **out** with Ethan.',

  'b1-u4-exc-1': 'Noun from **ADMIRE** → **admiration**.',
  'b1-u4-exc-2': 'Negative from **CARE** → **careless**.',
  'b1-u4-exc-3': 'Person who lies → a **liar**.',
  'b1-u4-exc-4': 'Negative from **ABLE** → **disabled** athletes.',
  'b1-u4-exc-5': 'Past of **forgive** → **forgave** her.',
  'b1-u4-exc-6': 'Noun from **PERSON** → friendly **personality**.',
  'b1-u4-exc-7': 'Noun from **CONFIDENT** → enough **confidence**.',
  'b1-u4-exc-8': 'Negative from **HONEST** → **dishonest** people.',

  'b1-u4-exd-1': 'Hundreds of years ago → **was built**.',
  'b1-u4-exd-2': 'Language spoken in a region → **is spoken**.',
  'b1-u4-exd-3': 'Every afternoon → **are cleaned**.',
  'b1-u4-exd-4': 'Next Friday → **will be announced**.',
  'b1-u4-exd-5': 'At the moment → **is being built**.',
  'b1-u4-exd-6': 'Yesterday → **was caught** by police.',
  'b1-u4-exd-7': 'Where they are made → **are made** in South Korea.',
  'b1-u4-exd-8': 'Before lunchtime → **were sold**.',
  'b1-u4-exd-9': 'After the match → **was taken** to hospital.',
  'b1-u4-exd-10': 'This morning → **was sent**.',
  'b1-u4-exd-11': 'Passive question → **was / designed**?',
  'b1-u4-exd-12': 'Cancelled by the storm → **was** cancelled.',
  'b1-u4-exd-13': 'Since last month → **has been repaired**.',
  'b1-u4-exd-14': 'Made in Switzerland → **were made**.',
  'b1-u4-exd-15': 'Next year → **will be built**.',

  'b1-u4-exe-1': 'From childhood → known each other **since** we were children.',
  'b1-u4-exe-2': 'Good relationship → gets **on** really well.',
  'b1-u4-exe-3': 'For fifty years → have been **married**.',
  'b1-u4-exe-4': 'Good connection → a good **relationship**.',
  'b1-u4-exe-5': 'Protective **of** his little brother.',
  'b1-u4-exe-6': 'Spent childhood → grew **up** in a village.',
  'b1-u4-exe-7': 'No siblings → an only **child**.',
  'b1-u4-exe-8': 'Very **close** and spend time together.',
  'b1-u4-exe-9': 'Had a disagreement → fell **out**.',
  'b1-u4-exe-10': 'After arguing → felt **upset**.',
  'b1-u4-exe-11': 'Friends again → got **back** with her friend.',
  'b1-u4-exe-12': 'Took care of → **looked** after our cat.',
  'b1-u4-exe-13': 'Shared interests → a lot **in** common.',
  'b1-u4-exe-14': 'Best friend → **calls** him her best friend.',
  'b1-u4-exe-15': 'Rely on → **count** on your real friends.'
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

const files = ['Unit10.v2.json', 'Unit11.v2.json', 'Unit12.v2.json', 'Review4.v2.json'];
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
