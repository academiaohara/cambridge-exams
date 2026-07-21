#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Progress Test 1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const EX_A_EXPLANATIONS = [
  'Collocation → exploration **made** a lasting difference.',
  'Modern **media** age (not journalism/programme).',
  'Charts were **discovered** in libraries (found, not invented).',
  'Mediterranean **area** around the sea.',
  '**Ancient** Greeks and Phoenicians (very old civilisations).',
  'It is **true** that Columbus never accepted…',
  'Population was **estimated** at sixty million.',
  'First **modern** world map with all continents.',
  'Interest **spread** to countries across Europe.',
  'Changes took **place** (fixed phrase).',
  'As time **passed** , navigation improved.',
  'Remained **unknown** to ordinary people for centuries.',
  'Investigate → **look into** the early history.',
  'In **order** to calculate position (fixed phrase).',
  'In **place** of firm borders (uncertain territories).'
];

const PASSAGE_EXPLANATIONS = {
  'b2-u1-ex-a': EX_A_EXPLANATIONS,
  'b2-u1-ex-c': [
    'Specific photographs → look at **the** stunning photographs.',
    'Condition → **If** that sounds like you…',
    'Ability → Photography **can** be a wonderful hobby.',
    'Take up a hobby → thinking of **taking** it up.',
    'As long as → **as long as** you don\'t expect too much.',
    'So much + uncountable → so **much** technical detail.',
    'Emphasis → might **even** discover a real talent.',
    'Advice → you **should** always ask permission.',
    'Choose between two → choose **between** a compact and a mirrorless camera.',
    'Countable singular → **a** great way of finding your eye.',
    'Gerund after preposition → way of **finding** your eye for composition.',
  'Comparison → more interesting subjects **than** you might imagine.',
    'Difficulty + gerund → no difficulty **in** finding a style.',
    'Future necessity → you **will** need manual controls.',
    'Comparative → much **better** at giving creative freedom.'
  ],
  'b2-u1-ex-h': [
    'Plural noun → Some **criminals** are remembered for their daring.',
    'Adjective → decisions so **ridiculous** .',
    'Person who steals → one **robber** who broke in.',
    'Adjective → extremely **comfortable** sofa.',
    'Adjective → It may seem **unbelievable** .',
    'Adverb → The guard **nervously** called the police.',
    'Adjective → Another **humorous** case.',
    'Compound noun → professional **security** camera system.',
    'Uncountable plural → carried all the **equipment** away.',
    'Legal term → used as **evidence** against him.'
  ]
};

const EXPLANATIONS = {
  ...Object.fromEntries(EX_A_EXPLANATIONS.map(function(exp, i) {
    return ['b2-u1-exa-' + (i + 1), exp];
  })),

  'b2-u1-exb-1': 'Not real gems → **artificial** gemstones.',
  'b2-u1-exb-2': 'Connection between people → business **relationship** built on trust.',
  'b2-u1-exb-3': 'Legal action → will be **prosecuted** (not persecuted).',
  'b2-u1-exb-4': 'Well liked → become very **popular** with students.',
  'b2-u1-exb-5': 'Newspaper title → the **headline** read…',
  'b2-u1-exb-6': 'Fail to catch → you\'ll **miss** the last train.',
  'b2-u1-exb-7': 'Medical operation → required **surgery** on his knee.',
  'b2-u1-exb-8': 'Court witness → asked the **witness** to confirm.',
  'b2-u1-exb-9': 'Team activity → Basketball is a **sport**.',
  'b2-u1-exb-10': 'Formally accused → was **charged** with misuse of funds.',

  'b2-u1-exd-1': 'Adjective + enough → waited **long enough**.',
  'b2-u1-exd-2': 'Past obligation → I **had to** deal with an urgent call.',
  'b2-u1-exd-3': 'Past state no longer true → There **used to** be a bookshop.',
  'b2-u1-exd-4': 'Third conditional → we **could have** had a lovely picnic.',
  'b2-u1-exd-5': 'Precaution → **in case** my laptop battery runs out.',
  'b2-u1-exd-6': 'Mild obligation → we really **ought** to book a table.',
  'b2-u1-exd-7': 'Uncountable → run out of **time** (no article).',
  'b2-u1-exd-8': 'Third conditional → if she **hadn\'t seen** the warning sign.',
  'b2-u1-exd-9': 'Too + adjective → **too** heavy for me to carry.',
  'b2-u1-exd-10': 'Few + countable plural → **few** students turned up.',

  'b2-u1-exe-1': 'Withdraw from project → pull **out** of the construction project.',
  'b2-u1-exe-2': 'Have a good relationship → get **on** with the rest of the team.',
  'b2-u1-exe-3': 'Reduce options → narrow it **down** to five candidates.',
  'b2-u1-exe-4': 'Investigate → look **into** the noise complaints.',
  'b2-u1-exe-5': 'Quarrel → fallen **out** with her sister.',
  'b2-u1-exe-6': 'Think of an idea → came **up** with the idea.',
  'b2-u1-exe-7': 'Eventually become → turned **out** to be one of the most visited.',

  'b2-u1-exf-1': 'Ordinal experience → **second time I have lost** my wallet.',
  'b2-u1-exf-2': 'Duration → **have been playing squash for** six years.',
  'b2-u1-exf-3': 'Eager anticipation → **looking forward to being** old enough.',
  'b2-u1-exf-4': 'Cause and effect → **often results in** serious accidents.',
  'b2-u1-exf-5': 'Pointless → **is no point in denying** you were there.',
  'b2-u1-exf-6': 'Wish about ability → **to be able to travel** around the world.',
  'b2-u1-exf-7': 'Confirm → phoned the hotel to **make sure that** my booking was correct.',
  'b2-u1-exf-8': 'Insufficient age → **are not old enough** to enter.',
  'b2-u1-exf-9': 'Past habit → **never used to be** so crowded.',

  'b2-u1-exg-1': 'Wrong auxiliary → We **were** working (remove **been**).',
  'b2-u1-exg-2': 'Tell + object → told **us** (remove **to**).',
  'b2-u1-exg-3': 'This line is correct — tap **OK** (no extra word).',
  'b2-u1-exg-4': 'Present perfect → I\'ve always **been** fascinated (remove **had**).',
  'b2-u1-exg-5': 'Career field → a career in cinema (remove **the**).',
  'b2-u1-exg-6': 'Find + adjective → found it difficult (remove **out**).',
  'b2-u1-exg-7': 'This line is correct — tap **OK** (no extra word).',
  'b2-u1-exg-8': 'Used to + base verb → used to **attend** (remove **were**).',
  'b2-u1-exg-9': 'Reflexive not needed → shaped **their** futures (remove **them**).',
  'b2-u1-exg-10': 'This line is correct — tap **OK** (no extra word).',
  'b2-u1-exg-11': 'Asked me to contact → asked me **contact** (remove **to**).',
  'b2-u1-exg-12': 'This line is correct — tap **OK** (no extra word).',
  'b2-u1-exg-13': 'Describe + clause → described **what** I was hoping (remove **them**).',
  'b2-u1-exg-14': 'This line is correct — tap **OK** (no extra word).',
  'b2-u1-exg-15': 'Noun clause → precisely **what** they tell me (remove **that**).'
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

const files = ['ProgressTest1.v2.json'];
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
