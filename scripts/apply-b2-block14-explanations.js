#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 14: Review14
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {
  'b2-u14-ex-a': [
    'Fixed phrase → **make** a point about remote working.',
    'Out of touch → **out** of touch with business realities.',
    'Responsible **for** the results their teams achieve.',
    'Past perfect → Had the journalist **done** their research.',
    'Collocation → **made** a genuine effort to speak with workers.',
    'Begin **by** saying that remote workers are productive.',
    'Apply **for** internal promotions.',
    'Collocation → **put** enormous effort into delivering results.',
    'Hiring phrasal verb → not taking **on** new remote staff.',
    'Slowed **down** → business growth has slowed down.'
  ]
};

const EXPLANATIONS = {
  'b2-u14-exb-1': 'Negative prefix → formally warned for being **irresponsible**.',
  'b2-u14-exb-2': 'Adverb from HELP → said **helpfully**.',
  'b2-u14-exb-3': 'People who apply → successful **applicants**.',
  'b2-u14-exb-4': 'Verb form → to **supervise** the new intake.',
  'b2-u14-exb-5': 'Noun from DEDICATE → praised their **dedication**.',
  'b2-u14-exb-6': 'People employed → all **employees** eligible for a bonus.',
  'b2-u14-exb-7': 'Adjective from WORK → simply not **workable**.',
  'b2-u14-exb-8': 'Plural noun from QUALIFY → certified **qualifications**.',

  'b2-u14-exc-1': 'No sooner → **No sooner had Yuri qualified than** he launched his consultancy.',
  'b2-u14-exc-2': 'Inversion with rarely → **Rarely do women get promoted** to senior positions.',
  'b2-u14-exc-3': 'Little did I → **Little did I realise** that Tony was the CEO.',
  'b2-u14-exc-4': 'Not until inversion → **Not until Tracy rang did I know** about the restructuring.',
  'b2-u14-exc-5': 'Benefit structure → **good for you to get** more responsibilities.',
  'b2-u14-exc-6': 'Settled on terms → **reached an agreement on** the terms.',
  'b2-u14-exc-7': 'Under no circumstances → **Under no circumstances are** staff allowed to take files off-site.',
  'b2-u14-exc-8': 'Only later inversion → **Only later did I think of** a suitable response.',
  'b2-u14-exc-9': 'Such inversion → **Such a boring job was it** that nobody wanted it.',

  'b2-u14-exd-1': 'Cease operations → forced to close **down**.',
  'b2-u14-exd-2': 'Replace temporarily → stand **in** for him.',
  'b2-u14-exd-3': 'Deal with orders → see **to** the orders.',
  'b2-u14-exd-4': 'Acquire a company → taken **over** Cookright.',
  'b2-u14-exd-5': 'Intend from the start → never set **out** to become a millionaire.',
  'b2-u14-exd-6': 'Launch a product → bringing **out** a new flavour.',
  'b2-u14-exd-7': 'Start a business → setting **up** a jewellery business.',

  'b2-u14-exe-1': 'Annual pay for professionals → managerial **salary**.',
  'b2-u14-exe-2': 'Retirement income → lives on his **pension**.',
  'b2-u14-exe-3': 'Daily travel to work → workers **commute** to the financial district.',
  'b2-u14-exe-4': 'Receive money for work → will **earn** significantly more.',
  'b2-u14-exe-5': 'Leave a job voluntarily → Marcus **resigned** and joined a rival.',
  'b2-u14-exe-6': 'Fixed collocation → were **made** redundant.',
  'b2-u14-exe-7': 'All employees → all **staff** members must complete the assessment.'
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

const files = ['Review14.v2.json'];
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
