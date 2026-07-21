#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 10:
 * Unit28, Unit29, Unit30, Review10
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 28: Conditionals 0, 1, 2 ────────────────────────
  'b1-u28-exa-1': 'Zero conditional → **freeze**, **becomes** (general truth).',
  'b1-u28-exa-2': 'Zero conditional → **don\'t sleep**, **feel**.',
  'b1-u28-exa-3': 'Zero conditional → **exercise**, **stay** healthy.',
  'b1-u28-exa-4': 'Zero conditional → **eat** late, **have** problems.',
  'b1-u28-exa-5': 'Zero conditional → **combine**, **make** pink.',
  'b1-u28-exa-6': 'Zero conditional → **don\'t listen**, **miss** information.',

  'b1-u28-exb-1': 'First conditional → **improves**, **will go**.',
  'b1-u28-exb-2': 'First conditional → **practise**, **will improve**.',
  'b1-u28-exb-3': 'First conditional → **meet**, **will invite**.',
  'b1-u28-exb-4': 'First conditional → **catch**, **will arrive**.',
  'b1-u28-exb-5': 'First conditional → **don\'t leave**, **will be** late.',
  'b1-u28-exb-6': 'First conditional → **feel**, **stay** at home.',

  'b1-u28-exc-1': 'Second conditional → **knew**, **would work**.',
  'b1-u28-exc-2': 'Second conditional → **had**, **would speak**.',
  'b1-u28-exc-3': 'Second conditional → **owned**, **would invite**.',
  'b1-u28-exc-4': 'Second conditional → **didn\'t waste**, **would finish**.',
  'b1-u28-exc-5': 'Second conditional → **lived**, **would see**.',
  'b1-u28-exc-6': 'Second conditional → **were**, **would accept**.',

  'b1-u28-exd-1': 'Zero conditional → **touch**, **burns**.',
  'b1-u28-exd-2': 'First conditional → **works**, **will succeed**.',
  'b1-u28-exd-3': 'Second conditional → **were**, **would help**.',
  'b1-u28-exd-4': 'First conditional → **don\'t charge**, **will die**.',
  'b1-u28-exd-5': 'First conditional → **take**, **will arrive**.',
  'b1-u28-exd-6': 'Second conditional → **were**, **wouldn\'t forget**.',

  'b1-u28-exe-1': 'Second conditional → **If I knew** (not **would know**).',
  'b1-u28-exe-2': 'First conditional → **If he leaves** (not **will leave**).',
  'b1-u28-exe-3': 'Zero conditional → **don\'t get** water.',
  'b1-u28-exe-4': 'Second conditional → **If you practised** (not **would practise**).',
  'b1-u28-exe-5': 'After **wouldn\'t** → base verb **stay**.',
  'b1-u28-exe-6': 'After **unless** → present **hurries**.',

  'b1-u28-exf-1': 'Zero conditional rewrite → **If you heat** metal.',
  'b1-u28-exf-2': 'Possibility → **might not arrive** before dark.',
  'b1-u28-exf-3': 'Second conditional → **practised more**.',
  'b1-u28-exf-4': 'Second conditional → **would be** fitter.',
  'b1-u28-exf-5': 'Second conditional → **had** a car.',
  'b1-u28-exf-6': 'Zero conditional → **If people work** too much.',

  // ── Unit 29: Third conditional ────────────────────────────
  'b1-u29-exa-1': 'Third conditional → **had remembered**, **would have sent**.',
  'b1-u29-exa-2': 'Third conditional → **had booked**, **would have found**.',
  'b1-u29-exa-3': 'Third conditional → **hadn\'t forgotten**, **would have taken**.',
  'b1-u29-exa-4': 'Third conditional → **had listened**, **wouldn\'t have got** lost.',
  'b1-u29-exa-5': 'Third conditional → **had worn**, **wouldn\'t have caught** a cold.',
  'b1-u29-exa-6': 'Third conditional → **had saved**, **wouldn\'t have lost**.',

  'b1-u29-exb-1': 'Certain result → **would have** replied.',
  'b1-u29-exb-2': 'Possible ability → **could have** avoided.',
  'b1-u29-exb-3': 'Uncertain result → **might have** recovered faster.',
  'b1-u29-exb-4': 'Certain result → **would have** arrived on time.',
  'b1-u29-exb-5': 'Possible ability → **could have** studied better.',
  'b1-u29-exb-6': 'Uncertain result → **might have** enjoyed the party.',

  'b1-u29-exc-1': 'Past perfect → **If I had had** more time.',
  'b1-u29-exc-2': 'Past participle → **had drunk** (not **drank**).',
  'b1-u29-exc-3': 'Past participle → **had taken** (not **took**).',
  'b1-u29-exc-4': 'Past participle → **hadn\'t lost** (not **lose**).',
  'b1-u29-exc-5': 'Need **have** → **would have won**.',
  'b1-u29-exc-6': 'Need **have** → **might have helped**.',

  'b1-u29-exd-1': 'Forgot passport → **hadn\'t forgotten**.',
  'b1-u29-exd-2': 'Didn\'t charge → **had charged**.',
  'b1-u29-exd-3': 'No reservation → **would have got** a seat.',
  'b1-u29-exd-4': 'Failed test → **could have passed**.',
  'b1-u29-exd-5': 'Match cancelled → **would have played**.',
  'b1-u29-exd-6': 'Stayed up late → **wouldn\'t have felt** exhausted.',

  // ── Unit 30: Health & food ────────────────────────────────
  'b1-u30-exa-1': 'Too much salt → **salty**.',
  'b1-u30-exa-2': 'Mix in a pan → **stir** the soup.',
  'b1-u30-exa-3': 'Include → nuts **contain** healthy fats.',
  'b1-u30-exa-4': 'Get better → **recover** after the operation.',
  'b1-u30-exa-5': 'Eat properly → **chew** each mouthful.',
  'b1-u30-exa-6': 'Illness → had the **flu**.',
  'b1-u30-exa-7': 'Positive effects → many **benefits**.',
  'b1-u30-exa-8': 'Part of the day → important **meal**.',

  'b1-u30-exb-1': 'Make well → **cure** the infection.',
  'b1-u30-exb-2': 'Influence → **affect** your concentration.',
  'b1-u30-exb-3': 'Cut into pieces → **chop** the tomatoes.',
  'b1-u30-exb-4': 'Surgery → had an **operation**.',
  'b1-u30-exb-5': 'Inhale → **breathe** deeply.',
  'b1-u30-exb-6': 'Not fresh → tastes **sour**.',

  'b1-u30-exc-1': 'Reduce → **cut down on** coffee.',
  'b1-u30-exc-2': 'Lose balance → **fall down**.',
  'b1-u30-exc-3': 'Recover from illness → **get over** the flu.',
  'b1-u30-exc-4': 'Spoiled → has **gone off**.',
  'b1-u30-exc-5': 'Rest horizontally → **lie down**.',
  'b1-u30-exc-6': 'Gain → **put on** weight.',
  'b1-u30-exc-7': 'Take a seat → **sit down**.',
  'b1-u30-exc-8': 'Rise → **stand up** slowly.',

  'b1-u30-exd-1': 'Time phrase → cough more **at night**.',
  'b1-u30-exd-2': 'Danger → **at risk** of health problems.',
  'b1-u30-exd-3': 'Also → **In addition to** swimming.',
  'b1-u30-exd-4': 'Contrast → healthier **in comparison with** fast food.',
  'b1-u30-exd-5': 'Fit → stay **in shape**.',
  'b1-u30-exd-6': 'Trying to lose weight → **on a diet**.',

  'b1-u30-exe-1': 'Allergic **to** seafood.',
  'b1-u30-exe-2': 'Covered **in** mud.',
  'b1-u30-exe-3': 'Fight **against** infections.',
  'b1-u30-exe-4': 'Smells **of** fresh bread.',
  'b1-u30-exe-5': 'Complained **about** the pain.',
  'b1-u30-exe-6': 'Cure **for** illnesses.',
  'b1-u30-exe-7': 'Recipe **for** curry.',
  'b1-u30-exe-8': 'Recovered **from** the operation.',

  'b1-u30-exf-1': 'Person from BAKE → **baker**.',
  'b1-u30-exf-2': 'Adjective from BEND → arm was **bent**.',
  'b1-u30-exf-3': 'Appliance from COOK → electric **cooker**.',
  'b1-u30-exf-4': 'Noun from INTEND → her **intention**.',
  'b1-u30-exf-5': 'Activity from JOG → goes **jogging**.',
  'b1-u30-exf-6': 'Adjective from MEDICINE → **medical** advice.',
  'b1-u30-exf-7': 'Adjective from PAIN → very **painful**.',
  'b1-u30-exf-8': 'Noun from REDUCE → a **reduction** in salt.',
  'b1-u30-exf-9': 'Adjective from SENSE → isn\'t **sensible**.',
  'b1-u30-exf-10': 'Noun from WEIGH → checks his **weight**.',

  'b1-u30-exg-1': 'Spoiled → has **gone off**.',
  'b1-u30-exg-2': 'Medicine tablet → **pill**.',
  'b1-u30-exg-3': 'Reduce → **cut down on** fizzy drinks.',
  'b1-u30-exg-4': 'Medical care → new **treatment**.',
  'b1-u30-exg-5': 'Prepare food → **chop** the onions.',
  'b1-u30-exg-6': 'Fit → stay **in shape**.',

  'b1-u30-exh-1': 'Don\'t ignore → **ignore** a serious cough.',
  'b1-u30-exh-2': 'Piece → another **slice** of cake.',
  'b1-u30-exh-3': 'Too much salt → too **salty**.',
  'b1-u30-exh-4': 'Rest → **lie** down.',
  'b1-u30-exh-5': 'Illness symptom → started to **cough**.',
  'b1-u30-exh-6': 'Harm → **affect** your health.',
  'b1-u30-exh-7': 'Also → **In addition** to running.',
  'b1-u30-exh-8': 'Nutrient → **vitamin** C.',

  'b1-u30-exj-1': 'Start → **set up** a fitness club.',
  'b1-u30-exj-2': 'Cancelled → **called off** the appointment.',
  'b1-u30-exj-3': 'Do → **carry out** the test.',
  'b1-u30-exj-4': 'Result → **turned out** better than expected.',
  'b1-u30-exj-5': 'Controls → **manages** his diet.',
  'b1-u30-exj-6': 'Postponed → **put off** the operation.',

  // ── Review 10 ───────────────────────────────────────────
  'b1-u10-exa-1': 'Trying to lose weight → on a **diet**.',
  'b1-u10-exa-2': 'Cut into pieces → **Chop** the onions.',
  'b1-u10-exa-3': 'Recipe items → **ingredients** for soup.',
  'b1-u10-exa-4': 'Mix → **Stir** the sauce.',
  'b1-u10-exa-5': 'Not fresh → tastes too **sour**.',
  'b1-u10-exa-6': 'Compare → in **comparison** with last year.',
  'b1-u10-exa-7': 'Include → doesn\'t **contain** much sugar.',
  'b1-u10-exa-8': 'Illness → has the **flu**.',
  'b1-u10-exa-9': 'Experience pain → **suffered** from back pain.',
  'b1-u10-exa-10': 'Don\'t ignore → **ignore** warning signs.',

  'b1-u10-exb-1': 'Adjective from SENSE → **sensitive** skin.',
  'b1-u10-exb-2': 'Activity from JOG → go **jogging**.',
  'b1-u10-exb-3': 'Adjective from PAIN → really **painful**.',
  'b1-u10-exb-4': 'Adjective from MEDICINE → **medical** websites.',
  'b1-u10-exb-5': 'Noun from WEIGH → lose **weight**.',
  'b1-u10-exb-6': 'Adjective from INTEND → wasn\'t **intentional**.',
  'b1-u10-exb-7': 'Adjective from BEND → completely **bent**.',
  'b1-u10-exb-8': 'Appliance from COOK → electric **cooker**.',

  'b1-u10-exc-1': 'Gain weight → **put on** weight.',
  'b1-u10-exc-2': 'Eat less → **cut down on** junk food.',
  'b1-u10-exc-3': 'Not fresh → **has gone off**.',
  'b1-u10-exc-4': 'Allergy → **am allergic to** seafood.',
  'b1-u10-exc-5': 'Recover → **gets over** the flu.',

  'b1-u10-exd-1': 'Zero conditional → **get** tired.',
  'b1-u10-exd-2': 'Second conditional → **had** more free time.',
  'b1-u10-exd-3': 'Second conditional → **would become** healthier.',
  'b1-u10-exd-4': 'Third conditional → **would have reached**.',
  'b1-u10-exd-5': 'Zero conditional → **gain** weight.',
  'b1-u10-exd-6': 'Second conditional question → **would you do**.',
  'b1-u10-exd-7': 'Third conditional → **had trained** harder.',
  'b1-u10-exd-8': 'First conditional → **will become** exhausted.',
  'b1-u10-exd-9': 'First conditional → **will see** a doctor.',
  'b1-u10-exd-10': 'Second conditional → **did** more exercise.',
  'b1-u10-exd-11': 'Zero conditional → **feel** sick.',
  'b1-u10-exd-12': 'Third conditional → **had felt** worse.',
  'b1-u10-exd-13': 'Second conditional → **were** you.',
  'b1-u10-exd-14': 'Second conditional → **ate** more vegetables.',

  'b1-u10-exe-1': 'Remain → **stay** healthy.',
  'b1-u10-exe-2': 'Add → **include** more vegetables.',
  'b1-u10-exe-3': 'Body part → injured his **ankle**.',
  'b1-u10-exe-4': 'Hydration → **drink** plenty of water.',
  'b1-u10-exe-5': 'Prepare muscles → warm **up**.',
  'b1-u10-exe-6': 'No meat → **vegetarian**.',
  'b1-u10-exe-7': 'Deal with → **cope** with stress.',
  'b1-u10-exe-8': 'Reduce → cut **down** on fizzy drinks.',
  'b1-u10-exe-9': 'Strengthen → **boost** immune system.',
  'b1-u10-exe-10': 'Fitness → good **shape**.',
  'b1-u10-exe-11': 'Rest → plenty of **sleep**.',
  'b1-u10-exe-12': 'Past → **had** a terrible headache.',
  'b1-u10-exe-13': 'Ongoing → pain **continues**.'
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

const files = ['Unit28.v2.json', 'Unit29.v2.json', 'Unit30.v2.json', 'Review10.v2.json'];
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
