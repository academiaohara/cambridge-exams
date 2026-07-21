#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 11:
 * Unit31, Unit32, Unit33, Review11
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 31: Reported speech (statements) ────────────────
  'b1-u31-exa-1': 'Present simple → past → **said she enjoyed** painting.',
  'b1-u31-exa-2': 'Present continuous → past continuous → **were cleaning**.',
  'b1-u31-exa-3': '**Can** → **could** ride a horse.',
  'b1-u31-exa-4': '**Are going to** → **were going to** travel abroad.',
  'b1-u31-exa-5': '**May** → **might**; **tomorrow** → **the next day**.',
  'b1-u31-exa-6': 'Past continuous → past perfect continuous → **had been studying**.',

  'b1-u31-exb-1': 'Present → past → **felt** tired.',
  'b1-u31-exb-2': '**Are preparing** → **were preparing** then.',
  'b1-u31-exb-3': 'Present perfect → past perfect → **had completed**.',
  'b1-u31-exb-4': '**Can** → **could** help us.',
  'b1-u31-exb-5': '**Have to** → **had to** be careful.',
  'b1-u31-exb-6': 'Future plan → **were going** to Rome the following month.',

  'b1-u31-exc-1': '**Tomorrow** → **the next day**; **will** → **would**.',
  'b1-u31-exc-2': '**Here** → **there**; **yesterday** → **the day before**.',
  'b1-u31-exc-3': '**Now** → **then**; present → past **was** busy.',
  'b1-u31-exc-4': '**Last week** → **the week before**; past → past perfect.',
  'b1-u31-exc-5': '**Here** → **there**; **tonight** → **that night**.',
  'b1-u31-exc-6': '**This job** → **that job**; **ago** → **before**.',

  'b1-u31-exd-1': 'Backshift → **was** hungry.',
  'b1-u31-exd-2': '**Can** → **could** join us.',
  'b1-u31-exd-3': '**Will** → **would** phone me.',
  'b1-u31-exd-4': '**Have to** → **had to** leave.',
  'b1-u31-exd-5': '**Yesterday** → **the day before**.',
  'b1-u31-exd-6': '**Next month** → **the following month**.',

  'b1-u31-exe-1': '**Will** → **would** buy a new car.',
  'b1-u31-exe-2': '**Have to** → **had to** study.',
  'b1-u31-exe-3': '**Can** → **could** play the piano.',
  'b1-u31-exe-4': 'Ongoing past → **had been working** all afternoon.',
  'b1-u31-exe-5': '**Are going to** → **were going to** move.',
  'b1-u31-exe-6': '**May** → **might**; **tomorrow** → **the next day**.',

  'b1-u31-exf-1': 'Present → past → **was** hungry.',
  'b1-u31-exf-2': '**Will** → **would** come later.',
  'b1-u31-exf-3': '**Can** → **could** speak Italian.',
  'b1-u31-exf-4': '**Have to** → **had to** finish.',
  'b1-u31-exf-5': '**Tomorrow** → **the next day**.',
  'b1-u31-exf-6': 'Present perfect → **had done** his homework.',

  'b1-u31-exg-1': 'Backshift → **was** tired.',
  'b1-u31-exg-2': '**Will** → **would** help.',
  'b1-u31-exg-3': '**Can** → **could** drive.',
  'b1-u31-exg-4': '**Have to** → **had to** be quiet.',
  'b1-u31-exg-5': '**Yesterday** → **the day before**.',
  'b1-u31-exg-6': 'Present perfect → past perfect **had** finished.',

  'b1-u31-exh-1': '**Will help** → **would help me**.',
  'b1-u31-exh-2': '**Are revising** → **were revising**.',
  'b1-u31-exh-3': '**Might buy** a laptop the following year.',
  'b1-u31-exh-4': 'Past continuous → **had been reading**.',
  'b1-u31-exh-5': 'Present perfect → **had cleaned** her room.',
  'b1-u31-exh-6': '**Could meet** the next day.',

  // ── Unit 32: Reported questions & imperatives ─────────────
  'b1-u32-exa-1': 'Yes/no question → **asked if I was** feeling better.',
  'b1-u32-exa-2': 'Present perfect → **if I had sent** the email.',
  'b1-u32-exa-3': '**Can** → **could** speak Italian.',
  'b1-u32-exa-4': '**Tonight** → **that night**; **will** → **would**.',
  'b1-u32-exa-5': '**Should we** → **if they should** wait.',
  'b1-u32-exa-6': 'Past question → **if I had locked** the door.',

  'b1-u32-exb-1': 'Wh- question → statement order **worked**.',
  'b1-u32-exb-2': 'Present continuous → **were** laughing.',
  'b1-u32-exb-3': '**Will** → **would finish**.',
  'b1-u32-exb-4': 'Past question → **had invited**.',
  'b1-u32-exb-5': 'Past → past perfect **had lasted**.',
  'b1-u32-exb-6': 'Present → past **preferred**.',

  'b1-u32-exc-1': 'Order → **told us to open** our books.',
  'b1-u32-exc-2': 'Negative order → **not to park there**.',
  'b1-u32-exc-3': 'Request → **asked Leo to carry** that bag.',
  'b1-u32-exc-4': 'Polite request → **not to make** any noise.',
  'b1-u32-exc-5': 'Order → **told Anna to bring** him the receipt.',
  'b1-u32-exc-6': 'Request → **not to eat** his sandwich.',

  'b1-u32-exd-1': 'Yes/no → **if I lived** nearby (statement order).',
  'b1-u32-exd-2': 'Wh- → **where I had put** (no inversion).',
  'b1-u32-exd-3': 'Order → **told me to wait** there.',
  'b1-u32-exd-4': 'Negative order → **not to touch**.',
  'b1-u32-exd-5': '**Can** → **could** open the window.',
  'b1-u32-exd-6': '**Will** → **would close**.',

  'b1-u32-exe-1': 'Yes/no → **if I played** tennis.',
  'b1-u32-exe-2': 'Wh- → **where I had found** that wallet.',
  'b1-u32-exe-3': 'Request → **asked Ben to text her** later.',
  'b1-u32-exe-4': 'Order → **told us not to shout**.',
  'b1-u32-exe-5': 'Wh- → **when they were moving** house.',
  'b1-u32-exe-6': 'Permission → **whether she could use** my charger.',

  // ── Unit 33: Art, design & fashion ────────────────────────
  'b1-u33-exa-1': 'Very old → **ancient** paintings.',
  'b1-u33-exa-2': 'Natural fabric → pure **cotton**.',
  'b1-u33-exa-3': 'Make something new → **create** a website.',
  'b1-u33-exa-4': 'Plan/drawing → latest **design**.',
  'b1-u33-exa-5': 'Repair → **fix** the chair.',
  'b1-u33-exa-6': 'Art space → photography **gallery**.',
  'b1-u33-exa-7': 'Not tight → too **loose**.',
  'b1-u33-exa-8': 'Keep in good condition → **maintain** monuments.',

  'b1-u33-exb-1': 'Too small → too **tight**.',
  'b1-u33-exb-2': 'Stack → **pile** of magazines.',
  'b1-u33-exb-3': 'Opposite of rough → **smooth**.',
  'b1-u33-exb-4': 'Go together → **match** your jacket.',
  'b1-u33-exb-5': 'See → **notice** the crack.',
  'b1-u33-exb-6': 'Instrument → best **tool** for painting.',

  'b1-u33-exc-1': 'Wear → **put on** a jumper.',
  'b1-u33-exc-2': 'Remove → **take off** your hat.',
  'b1-u33-exc-3': 'Test before buying → **try on** trainers.',
  'b1-u33-exc-4': 'Omit → **leave out** information.',
  'b1-u33-exc-5': 'Fasten → **do up** your coat.',
  'b1-u33-exc-6': 'Make full → **fill up** my glass.',
  'b1-u33-exc-7': 'Wearing → **has on** a black jacket.',
  'b1-u33-exc-8': 'Remove by cutting → **cut off** fabric.',

  'b1-u33-exd-1': 'Position → **at the back of** the building.',
  'b1-u33-exd-2': 'Time → **at the end of** the performance.',
  'b1-u33-exd-3': 'Trendy → **in fashion** this winter.',
  'b1-u33-exd-4': 'Position → **in front of** the hotel.',
  'b1-u33-exd-5': 'Position → **in the corner of** the room.',
  'b1-u33-exd-6': 'Not trendy → **out of fashion**.',

  'b1-u33-exe-1': 'Amazed **at** her talent.',
  'b1-u33-exe-2': 'Disappointed **with** the result.',
  'b1-u33-exe-3': 'Familiar **with** this material.',
  'b1-u33-exe-4': 'Involved **in** designing.',
  'b1-u33-exe-5': 'Similar **to** one in Paris.',
  'b1-u33-exe-6': 'Change **into** offices.',
  'b1-u33-exe-7': 'Explain **to** us.',
  'b1-u33-exe-8': 'Reminds me **of** her kitchen.',
  'b1-u33-exe-9': 'Remove **from** the box.',
  'b1-u33-exe-10': 'Describe **as** impressive.',

  'b1-u33-exf-1': 'Person from ART → **artist**.',
  'b1-u33-exf-2': 'Negative from BREAK → **unbreakable**.',
  'b1-u33-exf-3': 'Person from COMPOSE → **composer**.',
  'b1-u33-exf-4': 'Noun from EXHIBIT → **exhibition**.',
  'b1-u33-exf-5': 'Noun from FREE → greater **freedom**.',
  'b1-u33-exf-6': 'Noun from HAND → **handful** of guests.',
  'b1-u33-exf-7': 'Adjective from IMAGINE → **imaginative** way.',
  'b1-u33-exf-8': 'Noun from INTELLIGENT → his **intelligence**.',
  'b1-u33-exf-9': 'Negative from PERFECT → still **imperfect**.',
  'b1-u33-exf-10': 'Noun from PREPARE → careful **preparation**.',

  'b1-u33-exg-1': 'Fit well → don\'t **suit** me.',
  'b1-u33-exg-2': 'Make smaller → **fold** the map.',
  'b1-u33-exg-3': 'Not smooth → felt **rough**.',
  'b1-u33-exg-4': 'Substance → durable **material**.',
  'b1-u33-exg-5': 'Image → beautiful **picture**.',
  'b1-u33-exg-6': 'Effect → strong **influence**.',

  'b1-u33-exh-1': 'Wear → put **on** a scarf.',
  'b1-u33-exh-2': 'Too small → too **tight**.',
  'b1-u33-exh-3': 'Time → **end** of the exhibition.',
  'b1-u33-exh-4': 'Substances → recycled **materials**.',
  'b1-u33-exh-5': 'See → didn\'t **notice** the stain.',
  'b1-u33-exh-6': 'Trendy → in **fashion**.',
  'b1-u33-exh-7': 'Reminds me **of** childhood.',
  'b1-u33-exh-8': 'Transform → **change** the mill into a museum.',

  'b1-u33-exj-1': 'Instrument → right **tool**.',
  'b1-u33-exj-2': 'Stack → huge **pile** of newspapers.',
  'b1-u33-exj-3': 'Fabric → soft **cotton**.',
  'b1-u33-exj-4': 'Design → geometric **pattern**.',
  'b1-u33-exj-5': 'Very old → **ancient** temple.',
  'b1-u33-exj-6': 'Art space → famous **gallery**.',
  'b1-u33-exj-7': 'Part of clothing → tore the **sleeve**.',
  'b1-u33-exj-8': 'Make smaller → **fold** the letter.',
  'b1-u33-exj-9': 'Surface → clean and **smooth**.',
  'b1-u33-exj-10': 'Keep going → **maintain** motivation.',

  // ── Review 11 ───────────────────────────────────────────
  'b1-u11-exb-1': 'Describe **as** → **as experimental**.',
  'b1-u11-exb-2': 'Involved **in** → **in planning** modern homes.',
  'b1-u11-exb-3': 'Familiar **with** → **with his early drawings**.',
  'b1-u11-exb-4': 'Explain **to** → **to the class**.',
  'b1-u11-exb-5': 'Remove **from** → **from the gallery**.',
  'b1-u11-exb-6': 'Influence **on** → **on young artists**.',
  'b1-u11-exb-7': 'Picture **of** → **of a dancer**.',
  'b1-u11-exb-8': 'Change **from** … **into** → dark scene into bright beach.',

  'b1-u11-exc-1': '**Want** → **wanted** → **said he wanted**.',
  'b1-u11-exc-2': 'Present continuous → **said they were designing**.',
  'b1-u11-exc-3': '**Tomorrow** → **the following day**.',
  'b1-u11-exc-4': 'Request → **asked me to help her paint**.',

  'b1-u11-exd-1': 'Backshift → **was** busy.',
  'b1-u11-exd-2': 'Negative order → **not to touch**.',
  'b1-u11-exd-3': 'Wh- → **I had bought** (statement order).',
  'b1-u11-exd-4': '**Will** → **would visit** the following day.',
  'b1-u11-exd-5': 'Tell + infinitive → **not to copy**.',
  'b1-u11-exd-6': 'Yes/no → **if I was** interested.',
  'b1-u11-exd-7': 'Past → past perfect **had seen**.',
  'b1-u11-exd-8': 'Negative request → **not to take** photos.',
  'b1-u11-exd-9': 'Present → past **had** a special meaning.',
  'b1-u11-exd-10': 'Wh- → **I would arrive** (no inversion).',
  'b1-u11-exd-11': 'Present perfect → **hadn\'t visited** before.',
  'b1-u11-exd-12': 'Ask + infinitive → **to finish** sketches.',
  'b1-u11-exd-13': 'Past perfect → **had been** there the day before.',
  'b1-u11-exd-14': 'Warn → **not to stand** near wet paint.',

  'b1-u11-exe-1': 'Designs → prepared the **plans**.',
  'b1-u11-exe-2': 'Construct → **building** a new school.',
  'b1-u11-exe-3': 'Constructed from → **made** from local stone.',
  'b1-u11-exe-4': 'Woodworker → **carpenter**.',
  'b1-u11-exe-5': 'Demolish → **knock** the garage down.',
  'b1-u11-exe-6': 'Layout → **design** of the theatre.',
  'b1-u11-exe-7': 'Think of → came **up** with an idea.',
  'b1-u11-exe-8': 'Erect → put **up** barriers.',
  'b1-u11-exe-9': 'Surface → **covered** with paintings.',
  'b1-u11-exe-10': 'Pipe repair → called a **plumber**.',
  'b1-u11-exe-11': 'Duration → **take** several weeks.',
  'b1-u11-exe-12': 'Demolish → **pull** the factory down.',
  'b1-u11-exe-13': 'Install → **put** a new door.',
  'b1-u11-exe-14': 'Field of study → studied **architecture**.'
};

const PASSAGE_EXPLANATIONS = {
  'b1-u11-ex-a': [
    'Try clothes → tried **on** several jackets.',
    'Surprised **at** how many styles.',
    'Reminded me **of** the afternoon.',
    'Trendy → **in** fashion.',
    'Fasten → couldn\'t do it **up** (zip broken).',
    'Time → **at** the weekend.',
    'Similar **to** the black boots.',
    'Wearing → got them **on** now.',
    'Transform → changed dress **into** a skirt.',
    'Remove → cut the top part **off**.'
  ]
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

const files = ['Unit31.v2.json', 'Unit32.v2.json', 'Unit33.v2.json', 'Review11.v2.json'];
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
