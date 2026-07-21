#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Progress Test 2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const EX_A_EXPLANATIONS = [
  'Collocation → can **require** a great deal of effort.',
  'Naturally **curious** about new places.',
  'Be mindful **of** local customs (aware and respectful).',
  'Teeming **with** tourists (very full of people).',
  'Don\'t **worry** too much about feeling lost.',
  'Would not **deter** her from enjoying the experience.',
  'Positive **aspect** of being somewhere unfamiliar.',
  'Not **deficient** in knowledge — challenges help you grow.',
  'Encourages travellers → expert **encourages** travellers to…',
  'Research the culture → important to **research** what it expects.',
  'Make a **living** from travel writing.',
  'Complete **disaster** on her first trip.',
  'Continue → decided to **carry on** travelling.',
  'Depend → Success does not **hinge** entirely on a perfect itinerary.',
  'Turn out → experiences can **prove** to be more rewarding.'
];

const PASSAGE_EXPLANATIONS = {
  'b2-u2-ex-a': EX_A_EXPLANATIONS,
  'b2-u2-ex-c': [
    'Rise **in** the use of social media.',
    'Regarded **as** being addicted to smartphones.',
    'Passive relative → teenagers who **were** interviewed.',
    'Comfortable **with** their online identities.',
    'Tell **the** truth about screen time.',
    'Responsible **for** raising awareness.',
    'Effect **on** concentration in the classroom.',
    'Stayed **up** very late at night.',
    'Despite + gerund → despite **having** early lessons.',
    'Non-defining relative → the report, **which** was produced…',
    'Understanding **of** how social media shapes self-image.',
    'Take action → urged to **take** action.',
    'In **spite** of these concerns…',
    'Existential → **there** are practical steps families can take.',
    'Fixed phrase → **At** the very least…'
  ],
  'b2-u2-ex-h': [
    'Popular **saying** among graduates.',
    'No **student** who first hears it believes it.',
    '**Financial** pressure alongside coursework.',
    '**Boredom** sets in during long library sessions.',
    'Look back on **exciting** aspects of university life.',
    'Pay **attention** during a dull lecture.',
    'Criticised for poor **behaviour** in a group project.',
    'Feel completely **helpless** when a deadline approaches.',
    '**Misunderstood** the requirements for an exam.',
    'Entirely **acceptable** to look back with warmth.'
  ]
};

const EXPLANATIONS = {
  ...Object.fromEntries(EX_A_EXPLANATIONS.map(function(exp, i) {
    return ['b2-u2-exa-' + (i + 1), exp];
  })),

  'b2-u2-exb-1': 'Take from a shelf → **picked** a book off the shelf.',
  'b2-u2-exb-2': 'Morning meal → continental **breakfast** with pastries.',
  'b2-u2-exb-3': 'Cook too long → Try not to **overcook** the vegetables.',
  'b2-u2-exb-4': 'Proof of purchase → kept all her shopping **receipts**.',
  'b2-u2-exb-5': 'Food to take home → order a **takeaway**.',
  'b2-u2-exb-6': 'Praise for quality → widespread **recognition** for reporting.',
  'b2-u2-exb-7': 'Of historical interest → very **historic** old town.',
  'b2-u2-exb-8': 'Stop working before pension age → take early **retirement**.',
  'b2-u2-exb-9': 'Gratitude → showed their **appreciation** with an ovation.',
  'b2-u2-exb-10': 'In charge of → who is **responsible** for maintaining the website.',

  'b2-u2-exd-1': 'Future passive → **is going to be completed** next month.',
  'b2-u2-exd-2': 'Urgent advice → you\'d **better** get a move on.',
  'b2-u2-exd-3': 'Suggestion tag → Let\'s go…, **shall** we?',
  'b2-u2-exd-4': 'Indirect question → I wonder **whether you would** mind helping.',
  'b2-u2-exd-5': 'Deny + gerund → denied **having done** anything improper.',
  'b2-u2-exd-6': 'Possession → the student **whose** project won first prize.',
  'b2-u2-exd-7': 'Past subjunctive → It\'s high time they **were leaving**.',
  'b2-u2-exd-8': 'Wish about past attitude → I wish she **hadn\'t been** so negative.',
  'b2-u2-exd-9': 'Despite + gerund → Despite **working** all night…',
  'b2-u2-exd-10': 'Causative → **had the flat redecorated** last spring.',

  'b2-u2-exe-1': 'Submit work → hand **in** their assignments.',
  'b2-u2-exe-2': 'Take control of → take **over** the family business.',
  'b2-u2-exe-3': 'Delay → held **up** our journey to the airport.',
  'b2-u2-exe-4': 'Reduce consumption → cut **down on** fatty foods.',
  'b2-u2-exe-5': 'Investigate → looking **into** the cause of the fire.',
  'b2-u2-exe-6': 'Reject an offer → turn **down** the promotion.',
  'b2-u2-exe-7': 'Begin a journey → set **off** before dawn.',

  'b2-u2-exf-1': 'Ability → **is capable of climbing** that rocky peak.',
  'b2-u2-exf-2': 'Knowledge of a subject → **are you familiar with** quantum physics?',
  'b2-u2-exf-3': 'Spend a lot → **gone to the expense of** decorating the house.',
  'b2-u2-exf-4': 'Habit → **has a tendency to phone** relatives late at night.',
  'b2-u2-exf-5': 'Seemed → **gave me the impression that** he was exhausted.',
  'b2-u2-exf-6': 'Beneficial → **in your interest to take** regular exercise.',
  'b2-u2-exf-7': 'Understand an argument → **see Gary\'s point** but I\'m not convinced.',
  'b2-u2-exf-8': 'Stop from doing → **to prevent passengers from getting** on the wrong train.',
  'b2-u2-exf-9': 'Try hard → **make a real effort** to meet this deadline.',

  'b2-u2-exg-1': 'Present simple passive → It **is** often said (remove **been**).',
  'b2-u2-exg-2': 'This line is correct — tap **OK** (no extra word).',
  'b2-u2-exg-3': 'Shown a photograph → shown **a photograph** (remove **that**).',
  'b2-u2-exg-4': 'Despite + noun → despite **the** fading light (remove **of**).',
  'b2-u2-exg-5': 'Extra article → a certain timeless quality (remove the extra **a**).',
  'b2-u2-exg-6': 'Make people feel → make people **feel** emotion (remove **out**).',
  'b2-u2-exg-7': 'Send to someone → send **me** their shots (remove **to**).',
  'b2-u2-exg-8': 'Make me feel → makes me **feel** something (remove **it**).',
  'b2-u2-exg-9': 'This line is correct — tap **OK** (no extra word).',
  'b2-u2-exg-10': 'Subject looks → the subject **looks** composed (remove **was**).',
  'b2-u2-exg-11': 'Make a room look → can **make** a cold room look inviting (remove **up**).',
  'b2-u2-exg-12': 'This line is correct — tap **OK** (no extra word).',
  'b2-u2-exg-13': 'Not just about → Photography is **not** just about technical skill (remove **made**).',
  'b2-u2-exg-14': 'This line is correct — tap **OK** (no extra word).',
  'b2-u2-exg-15': 'This line is correct — tap **OK** (no extra word).'
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

const files = ['ProgressTest2.v2.json'];
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
