#!/usr/bin/env node
/**
 * Apply personalized English explanations to B2 Block 11: Review11
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B2');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'b2-u11-exa-1': 'Noun from POOR → live in **poverty**; adjective from WEALTH → more **wealthy**.',
  'b2-u11-exa-2': 'Adjective from DAY → **daily** routines; plural noun from LUXURY → unimaginable **luxuries**.',
  'b2-u11-exa-3': 'Adjective from ACCEPT → **acceptable**; noun from ASSIST → foreign **assistance**.',
  'b2-u11-exa-4': 'Person noun from ECONOMY → leading **economists**; noun from INVEST → foreign **investment**.',
  'b2-u11-exa-5': 'Adjective from VALUE → **valuable** partners in trade.',
  'b2-u11-exa-6': 'Noun from REAL → the **reality** is that closing the gap…',

  'b2-u11-exb-1': 'Inherit money → came **into** some money.',
  'b2-u11-exb-2': 'Save regularly → put **by** a little money each month.',
  'b2-u11-exb-3': 'Rely on → bank **on** house prices coming down.',
  'b2-u11-exb-4': 'Survive financially → get **by** on a low salary.',
  'b2-u11-exb-5': 'Write a cheque → make **out** the cheque.',
  'b2-u11-exb-6': 'Distribute free → giving **away** free software.',
  'b2-u11-exb-7': 'Accumulate for purchase → saving **up** to buy a DVD player.',
  'b2-u11-exb-8': 'Survive using money → live **on** now I\'ve lost my job.',

  'b2-u11-exc-1': 'Passive → I **was charged for** using the gym.',
  'b2-u11-exc-2': 'Belong to → Does **this credit card belong to** you?',
  'b2-u11-exc-3': 'Small quantity → only **a small amount of** flour.',
  'b2-u11-exc-4': 'Expensive idiom → It **cost a fortune** to buy.',
  'b2-u11-exc-5': 'Demand + noun → demanded **an apology from** the manager.',
  'b2-u11-exc-6': 'Save from → **saves me from having** to walk.',
  'b2-u11-exc-7': 'Ignore idiom → Take **no notice of** your critics.',
  'b2-u11-exc-8': 'Lack money → I **am short of** money.',
  'b2-u11-exc-9': 'Polite request → Could **I borrow some money from you**?',

  'b2-u11-exd-1': 'Promise + infinitive → promised **to give me** an explanation.',
  'b2-u11-exd-2': 'Reported question → why **I hadn\'t invited him**.',
  'b2-u11-exd-3': 'Reported yes/no question → asked **if he wanted** to join.',
  'b2-u11-exd-4': 'Tell + object → Maria **told** me she had found a deal.',
  'b2-u11-exd-5': 'Reported future → he **was going to** return the item.',
  'b2-u11-exd-6': 'Reported past continuous → he **was thinking** of changing careers.',
  'b2-u11-exd-7': 'Apologise for + gerund → apologised **for doubting** me.',
  'b2-u11-exd-8': 'Past participle after had → whether we had **paid** the invoice.',

  'b2-u11-exe-1': 'Low running cost → extremely **economical**.',
  'b2-u11-exe-2': 'Great deal idiom → a real **bargain**.',
  'b2-u11-exe-3': 'Manufacturer → what **make** of motorbike.',
  'b2-u11-exe-4': 'Fixed phrase → in **charge** of the department.',
  'b2-u11-exe-5': 'Money returned → collect her **change**.',
  'b2-u11-exe-6': 'Earn collocation → **made** a great deal of money.',
  'b2-u11-exe-7': 'Fixed phrase → at **least** she found a present.',
  'b2-u11-exe-8': 'Proof of purchase → give you a **receipt**.'
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

const files = ['Review11.v2.json'];
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
