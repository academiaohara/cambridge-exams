#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Progress Test 2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {};

const EXPLANATIONS = {
  'c1-u2-exa-1': 'Not dependent → **independent** of state funding.',
  'c1-u2-exa-2': 'Length and breadth → length and **breadth**.',
  'c1-u2-exa-3': 'SIGNIFY → **significant** impact.',
  'c1-u2-exa-4': 'GOOD + CHARITY → **goodness** of supporters, **charitable** donations.',
  'c1-u2-exa-5': 'OBJECT + VALUE → raised **objections**, **invaluable** service.',
  'c1-u2-exa-6': 'KNOW + EXAMPLE + SELF → **known**, **exemplary**, **selflessness**.',

  'c1-u2-exb-1': 'Undecided → **kept her options open**.',
  'c1-u2-exb-2': 'Shared interests → **has a lot in common with** Sophie.',
  'c1-u2-exb-3': 'Wiser to → **be better off booking**.',
  'c1-u2-exb-4': 'Highly skilled at → **down to a fine art**.',
  'c1-u2-exb-5': 'Strongly opposed → **being dead set against attending**.',
  'c1-u2-exb-6': 'It\'s high time → **was put in charge of**.',
  'c1-u2-exb-7': 'Very angry → **up in arms about me**.',
  'c1-u2-exb-8': 'Survive to tell → **were going to live to tell the tale**.',
  'c1-u2-exb-9': 'Win in the end → **have the last laugh**.',
  'c1-u2-exb-10': 'Wish about present → **caffeine didn\'t have an effect on**.',

  'c1-u2-exc-1': 'Inversion after rarely → **has** a single earthquake caused.',
  'c1-u2-exc-2': 'Non-defining relative → San Francisco, **which** lies along.',
  'c1-u2-exc-3': 'Not only…being…ever → **Not**, **so**, **being**, **ever**.',
  'c1-u2-exc-4': 'Many of them → many **of** them perished.',
  'c1-u2-exc-5': 'Possessive → the **city\'s** infrastructure.',
  'c1-u2-exc-6': 'A number of → remarkable **number** of buildings.',
  'c1-u2-exc-7': 'Inversion after Only after → **did** authorities manage.',

  'c1-u2-exd-1': 'Works in all three → **big**.',
  'c1-u2-exd-2': 'Works in all three → **short**.',
  'c1-u2-exd-3': 'Works in all three → **matter**.',
  'c1-u2-exd-4': 'Works in all three → **act**.',
  'c1-u2-exd-5': 'Works in all three → **dead**.',
  'c1-u2-exd-6': 'Works in all three → **sick**.',
  'c1-u2-exd-7': 'Works in all three → **example**.',
  'c1-u2-exd-8': 'Works in all three → **right**.',
  'c1-u2-exd-9': 'Works in all three → **better**.',
  'c1-u2-exd-10': 'Works in all three → **fine**.',

  'c1-u2-exe-1': 'Clothes got smaller → **shrank** in the wash.',
  'c1-u2-exe-2': 'Bank payment → direct **debit**.',
  'c1-u2-exe-3': 'Small pieces of bread → bread **crumbs**.',
  'c1-u2-exe-4': 'Unpleasant expression → **grimaced** as she swallowed.',
  'c1-u2-exe-5': 'Vaccinated against → **inoculated** against yellow fever.',
  'c1-u2-exe-6': 'Make people obey → **enforce** the restrictions.',
  'c1-u2-exe-7': 'Strike → industrial **action**.',
  'c1-u2-exe-8': 'Gradual fall → steadily **declined**.',
  'c1-u2-exe-9': 'Priceless treasure → considered **priceless**.',
  'c1-u2-exe-10': 'Not a close friend → more of an **acquaintance**.',

  'c1-u2-exf-1': 'It\'s high time + past → **we redecorated**.',
  'c1-u2-exf-2': 'Inverted third conditional → **Had I taken** your advice.',
  'c1-u2-exf-3': 'Wish about past → **you hadn\'t mentioned** it.',
  'c1-u2-exf-4': 'Perfect participle → **Having lived** abroad.',
  'c1-u2-exf-5': 'Reported past perfect continuous → **she had been attending**.',
  'c1-u2-exf-6': 'Second conditional continuous → **I were driving** any faster.',
  'c1-u2-exf-7': 'Time for someone to → **you to apologise**.',
  'c1-u2-exf-8': 'Would sooner + past → **I booked** a table.',
  'c1-u2-exf-9': 'Inverted second conditional → **Were you** to receive confirmation.',
  'c1-u2-exf-10': 'Passive gerund subject → **Being asked** to present.',

  'c1-u2-exg-1': 'Start a habit → taken **to** wearing a hat.',
  'c1-u2-exg-2': 'Dismiss chances → write **off** her chances.',
  'c1-u2-exg-3': 'Cover an area → spread **out** along the riverbank.',
  'c1-u2-exg-4': 'Weaken proposals → watered **down**.',
  'c1-u2-exg-5': 'Recover from illness → pull **through**.',
  'c1-u2-exg-6': 'Bullying → push you **around**.',
  'c1-u2-exg-7': 'Losing weight → wasting **away**.',
  'c1-u2-exg-8': 'Realise → cotton **on** to the fact.',
  'c1-u2-exg-9': 'Generate interest → drum **up** enough interest.',
  'c1-u2-exg-10': 'Give up → give **up**.',

  'c1-u2-exh-1': 'Chemical additions → **additives** in soft drinks.',
  'c1-u2-exh-2': 'Make bigger → **enlarge** the image.',
  'c1-u2-exh-3': 'Divide blame → **apportion** blame.',
  'c1-u2-exh-4': 'Cannot be repaired → **irreparable** damage.',
  'c1-u2-exh-5': 'Roomy → more **spacious** than the previous one.',
  'c1-u2-exh-6': 'Not supported by evidence → **unsubstantiated** allegations.',
  'c1-u2-exh-7': 'Financial operations → financial **transactions**.',
  'c1-u2-exh-8': 'Deceptive appearance → **illusory** impression.',
  'c1-u2-exh-9': 'Severe difficulty → financial **hardship**.',
  'c1-u2-exh-10': 'Cannot be destroyed → virtually **indestructible**.',

  'c1-u2-exi-1': 'Six of one… → **dozen** (not face).',
  'c1-u2-exi-2': 'Eyesore → **blot** on the landscape.',
  'c1-u2-exi-3': 'Commuter belt → commuter **belt**.',
  'c1-u2-exi-4': 'Lose temper → fly off the **handle**.',
  'c1-u2-exi-5': 'Not laugh → straight **face**.',
  'c1-u2-exi-6': 'Use influence → pull a few **strings**.',
  'c1-u2-exi-7': 'Bureaucracy → red **tape**.',
  'c1-u2-exi-8': 'Latest word → last **word** in comfort.',
  'c1-u2-exi-9': 'Pride of place → **pride** of place.',
  'c1-u2-exi-10': 'Same wavelength → same **wavelength**.',

  'c1-u2-exj-1': 'Tackle tax evasion → **Cracking** down on income.',
  'c1-u2-exj-2': 'Avoid addressing → **papers** over the issue.',
  'c1-u2-exj-3': 'Protect windows → **boarded** up their windows.',
  'c1-u2-exj-4': 'Have installed → have a system **put** in.',
  'c1-u2-exj-5': 'Respond to accusations → **hit** back at accusations.',
  'c1-u2-exj-6': 'Chosen for praise → **singled** out for dedication.',
  'c1-u2-exj-7': 'Try a restaurant → **checking** out that restaurant.',
  'c1-u2-exj-8': 'Persuade over time → **wore** him down.',
  'c1-u2-exj-9': 'Contribute together → **club** together.',
  'c1-u2-exj-10': 'Find courage → **summon** up the courage.',

  'c1-u2-exk-1': 'Greeting → Long time no **see**.',
  'c1-u2-exk-2': 'Much on my plate → so much **on** lately.',
  'c1-u2-exk-3': 'Overwhelmed → getting **top** of you.',
  'c1-u2-exk-4': 'In short → the **long** and short of it.',
  'c1-u2-exk-5': 'Own worst enemy → my own **worst** enemy.',
  'c1-u2-exk-6': 'Very soon → in the very **near** future.',
  'c1-u2-exk-7': 'Actually → as a **matter** of fact.',
  'c1-u2-exk-8': 'Welcome to use → feel **free** to borrow.',
  'c1-u2-exk-9': 'Do one\'s best → **do** my best.',
  'c1-u2-exk-10': 'Something enjoyable → in for a real **treat**.',

  'c1-u2-exl-1': 'Medical expert → **consultant**.',
  'c1-u2-exl-2': 'Intimidates others → **bully**.',
  'c1-u2-exl-3': 'Relies financially → **dependant**.',
  'c1-u2-exl-4': 'Husband or wife → **spouse**.',
  'c1-u2-exl-5': 'Previous holder of job → **predecessor**.',
  'c1-u2-exl-6': 'Museum caretaker of objects → **curator**.',
  'c1-u2-exl-7': 'Family descendant → **descendant**.',
  'c1-u2-exl-8': 'Outgoing person → **extrovert**.',
  'c1-u2-exl-9': 'Brother or sister → **sibling**.',
  'c1-u2-exl-10': 'King or queen → **monarch**.',

  'c1-u2-exm-1': 'Collocation → **highest** priority.',
  'c1-u2-exm-2': 'At long last → **last**.',
  'c1-u2-exm-3': 'Scarce → thin on the **ground**.',
  'c1-u2-exm-4': 'Put forward formally → **table** a proposal.',
  'c1-u2-exm-5': 'Standard phrase → **quality** of life.',
  'c1-u2-exm-6': 'Instinct → **gut** feeling.',
  'c1-u2-exm-7': 'Give permission → **grant** permission.',
  'c1-u2-exm-8': 'Social influence → peer **pressure**.',
  'c1-u2-exm-9': 'Completely new → **brand** new.',
  'c1-u2-exm-10': 'Traditional family → **nuclear** family.',

  'c1-u2-exn-1': 'Neither do I → **neither** do I.',
  'c1-u2-exn-2': 'Sufficient money → **enough** money.',
  'c1-u2-exn-3': 'If only → **only** the supermarket had stayed open.',
  'c1-u2-exn-4': 'Much as → **Much** as we wanted to accept.',
  'c1-u2-exn-5': 'Even if → **if** you feel fully recovered.',
  'c1-u2-exn-6': 'In spite of → **despite** widespread opposition.',
  'c1-u2-exn-7': 'Not nearly → **nowhere** near as gripping.',
  'c1-u2-exn-8': 'Find + remarkable → find **it** remarkable.',
  'c1-u2-exn-9': 'As if → as **if** you know exactly.',
  'c1-u2-exn-10': 'Little did she realise → **Little** did she realise.'
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
