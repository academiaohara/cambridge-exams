#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 5:
 * Unit13, Unit14, Unit15, Review5
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 13: Countable / uncountable ────────────────────
  'b1-u13-exa-1': '**Countable**: banana, person, box, woman (can be plural). **Uncountable**: furniture, money, news, bread (no plural form).',

  'b1-u13-exb-1': '**Information** is uncountable → **much** information.',
  'b1-u13-exb-2': '**Chairs** are countable → **a few** chairs.',
  'b1-u13-exb-3': '**Money** is uncountable → **a little** money.',
  'b1-u13-exb-4': '**Photos** are countable → **many** photos.',
  'b1-u13-exb-5': '**Rice** is uncountable → **a little** rice.',
  'b1-u13-exb-6': '**People** are countable → **many** people (not much).',
  'b1-u13-exb-7': '**Museums** are countable → **a few** museums.',
  'b1-u13-exb-8': '**Furniture** is uncountable → **much** furniture.',

  'b1-u13-exc-1': 'Offer/request → **some** advice.',
  'b1-u13-exc-2': 'Negative + uncountable → **any** rice.',
  'b1-u13-exc-3': 'Singular countable → **a** banana and **a** sandwich.',
  'b1-u13-exc-4': 'Question → **any** information.',
  'b1-u13-exc-5': 'Plural countable → **some** new desks.',
  'b1-u13-exc-6': 'Before vowel sound → **an** intelligent student.',

  'b1-u13-exd-1': '**Furniture** is uncountable → **much**.',
  'b1-u13-exd-2': '**Ideas** are countable → **a few** ideas.',
  'b1-u13-exd-3': '**Money** is uncountable → **much** money.',
  'b1-u13-exd-4': '**Bread** is uncountable → **a little** bread.',
  'b1-u13-exd-5': '**Postcards** are countable → **many** postcards.',
  'b1-u13-exd-6': '**Children** are countable → **a few** children.',

  'b1-u13-exe-1': '**Information** is uncountable — no **an**.',
  'b1-u13-exe-2': '**Bread** is uncountable → **much** bread (not many).',
  'b1-u13-exe-3': '**Furniture** is uncountable → **two pieces of furniture**.',
  'b1-u13-exe-4': '**Money** is uncountable → **How much** money.',
  'b1-u13-exe-5': '**Jeans** are always plural → **are** on the chair.',
  'b1-u13-exe-6': '**Advice** is uncountable → **a little** advice (not a few).',

  'b1-u13-exf-1': 'Offer in a request → **some** bread.',
  'b1-u13-exf-2': '**Students** are countable → **many** students.',
  'b1-u13-exf-3': '**Information** is uncountable → **much** information.',
  'b1-u13-exf-4': '**Apples** are countable → **a few** apples.',
  'b1-u13-exf-5': '**Clothes** are plural → **are** clean.',
  'b1-u13-exf-6': '**Advice** is countable with **a piece of** → **a** piece of advice.',

  'b1-u13-exg-1': 'Not many → only **a few** chairs.',
  'b1-u13-exg-2': 'Not much → only **a little** rice.',
  'b1-u13-exg-3': 'Offer → give me **some information**.',
  'b1-u13-exg-4': 'Countable item → **pair of jeans** is expensive.',
  'b1-u13-exh-1': '**Money** uncountable → not **much** money.',
  'b1-u13-exh-2': 'Both uncountable → **some** rice and **some** vegetables.',
  'b1-u13-exh-3': 'Negative → **any** fruit.',
  'b1-u13-exh-4': 'Singular countable → **a** shopping bag.',
  'b1-u13-exh-5': '**People** countable → **many** people.',
  'b1-u13-exh-6': 'Singular countable → **a** bottle of juice.',
  'b1-u13-exh-7': '**Food** uncountable → **some** food.',

  // ── Unit 14: Articles ───────────────────────────────────
  'b1-u14-exa-1': 'First mention + vowel sound → **an** amazing hotel.',
  'b1-u14-exa-2': 'Specific door we can see → **the** door.',
  'b1-u14-exa-3': 'Job + vowel sound → **an** architect.',
  'b1-u14-exa-4': 'First mention → **a** new sofa.',
  'b1-u14-exa-5': 'Specific tickets we know → **the** tickets.',
  'b1-u14-exa-6': '**An** hour (h is silent).',
  'b1-u14-exa-7': 'First mention → **a** beautiful castle.',
  'b1-u14-exa-8': 'Specific book you lent → **the** book.',

  'b1-u14-exb-1': 'General substance → **chocolate** (no article).',
  'b1-u14-exb-2': 'Any umbrella → **an** umbrella.',
  'b1-u14-exb-3': 'Specific sandwiches → **The** sandwiches on the table.',
  'b1-u14-exb-4': 'Job → **a** doctor.',
  'b1-u14-exb-5': 'Institution (purpose) → go to **university** (no article).',
  'b1-u14-exb-6': 'Specific building → **the** university library.',
  'b1-u14-exb-7': 'Musical instrument → play **the** violin.',
  'b1-u14-exb-8': 'Music genre → enjoy **jazz** (no article).',

  'b1-u14-exc-1': 'Vowel sound → **an** excellent student.',
  'b1-u14-exc-2': '**An** hour (silent h).',
  'b1-u14-exc-3': 'Consonant sound → **a** uniform.',
  'b1-u14-exc-4': 'Consonant sound → **a** euro note.',
  'b1-u14-exc-5': 'Specific building → go to **the** theatre.',
  'b1-u14-exc-6': 'Media → on **TV** (no article).',
  'b1-u14-exc-7': 'At work (activity) → at **work** (no article).',
  'b1-u14-exc-8': 'Media → on **the** radio.',

  'b1-u14-exd-1': 'Unique river → **The** Nile.',
  'b1-u14-exd-2': 'Continent → around **Asia** (no article).',
  'b1-u14-exd-3': 'Country group → **the** USA.',
  'b1-u14-exd-4': 'Country → in **Germany** (no article).',
  'b1-u14-exd-5': 'Unique object → **The** Moon.',
  'b1-u14-exd-6': 'Specific building → at **the** theatre.',
  'b1-u14-exd-7': 'City → in **Paris** (no article).',
  'b1-u14-exd-8': 'Unique planet → **the** Earth.',

  'b1-u14-exe-1': 'Go to work (activity) → no article.',
  'b1-u14-exe-2': 'Media → on **the** radio.',
  'b1-u14-exe-3': 'Sport → play **basketball** (no article).',
  'b1-u14-exe-4': 'Musical instrument → play **the** guitar.',
  'b1-u14-exe-5': 'Specific date → on **the** 15th June.',
  'b1-u14-exe-6': 'Decade → in **the** 1960s.',
  'b1-u14-exe-7': 'Day of week → on **Monday** morning (no article).',
  'b1-u14-exe-8': 'Time of day → at **night** (no article).',

  'b1-u14-exf-1': '**European** starts with /j/ sound → **a** European.',
  'b1-u14-exf-2': 'Language name → **French** (no **The**).',
  'b1-u14-exf-3': 'Job in general → **a** receptionist (not **the**).',
  'b1-u14-exf-4': 'Unique object → **the** sun (not **a**).',
  'b1-u14-exf-5': 'Famous building → **the** British Museum.',
  'b1-u14-exf-6': 'Media → **the** radio (not **a**).',
  'b1-u14-exf-7': 'Go to school (purpose) → no **the** before school.',
  'b1-u14-exf-8': 'General preference → **classical music** (no **the**).',

  'b1-u14-exg-1': 'Consonant sound → **a** new laptop (not **an**).',
  'b1-u14-exg-2': 'Specific restaurant in the hotel → **the** hotel restaurant.',
  'b1-u14-exg-3': 'Country name → **Italy** (no **the**).',
  'b1-u14-exg-4': 'Musical instrument → play **the** piano.',
  'b1-u14-exg-5': '**An** hour (silent h).',
  'b1-u14-exg-6': 'Plural noun → **The** students (not **A**).',

  'b1-u14-exh-1': 'Job → works as **a doctor**.',
  'b1-u14-exh-2': 'Media → on **the radio**.',
  'b1-u14-exh-3': 'In prison (institution) → no **the**.',
  'b1-u14-exh-4': 'Subject in general → about **history** (no article).',
  'b1-u14-exh-5': 'Country group → **the USA**.',
  'b1-u14-exh-6': 'Study at institution → at **university** (no **the**).',

  'b1-u14-exi-1': 'Musical instrument → **the** violin.',
  'b1-u14-exi-2': 'First mention → **an** orange.',
  'b1-u14-exi-3': 'Job + vowel → **an** accountant.',
  'b1-u14-exi-4': 'Famous landmark → **the** Colosseum.',
  'b1-u14-exi-5': 'Unique ocean → **The** Pacific Ocean.',
  'b1-u14-exi-6': 'Go to school (purpose) → no article.',
  'b1-u14-exi-7': 'University name → **Cambridge University** (no article).',
  'b1-u14-exi-8': 'Superlative → **the** best concert.',

  // ── Unit 15: Money & shopping ───────────────────────────
  'b1-u15-exa-1': 'An **advertisement** on the bus stop.',
  'b1-u15-exa-2': 'Can\'t **afford** = don\'t have enough money.',
  'b1-u15-exa-3': 'A real **bargain** = very good price.',
  'b1-u15-exa-4': 'Keep the **receipt** for returns.',
  'b1-u15-exa-5': 'Wait for your **change** (money back).',
  'b1-u15-exa-6': 'A wide **variety** of fruit.',
  'b1-u15-exa-7': '**Save** enough money over time.',
  'b1-u15-exa-8': 'In excellent **condition** = good state.',

  'b1-u15-exb-1': '**Add up** the total cost before paying.',
  'b1-u15-exb-2': '**Take back** shoes = return them to the shop.',
  'b1-u15-exb-3': '**Hurry up** — the sale ends soon.',
  'b1-u15-exb-4': '**Pay back** money you borrowed.',
  'b1-u15-exb-5': '**Saving up** for something = putting money aside.',
  'b1-u15-exb-6': '**Give away** free bags = distribute for free.',

  'b1-u15-exc-1': 'Pay **in cash** = with notes and coins.',
  'b1-u15-exc-2': '**For sale** = available to buy.',
  'b1-u15-exc-3': '**For rent** = available to hire.',
  'b1-u15-exc-4': 'Pay **by credit card**.',
  'b1-u15-exc-5': '**In debt** = owing money.',
  'b1-u15-exc-6': '**In good condition** = not damaged.',

  'b1-u15-exd-1': 'Belong **to** my brother.',
  'b1-u15-exd-2': 'Borrow **from** the library.',
  'b1-u15-exd-3': 'Buy **from** a shop.',
  'b1-u15-exd-4': 'Choose **between** two options.',
  'b1-u15-exd-5': 'Compare prices **on** websites.',
  'b1-u15-exd-6': 'Decide **on** a present.',
  'b1-u15-exd-7': 'Lend something **to** me.',
  'b1-u15-exd-8': 'Spend money **on** clothes.',

  'b1-u15-exe-1': 'Noun from **ADD** → an **addition** for service.',
  'b1-u15-exe-2': 'Adjective from **AFFORD** → **affordable**.',
  'b1-u15-exe-3': 'Noun from **COMPARE** → no **comparison**.',
  'b1-u15-exe-4': 'Noun from **DECIDE** → a sensible **decision**.',
  'b1-u15-exe-5': 'Adjective from **EXPENSE** → very **expensive**.',
  'b1-u15-exe-6': 'Adjective from **USE** → really **useful**.',
  'b1-u15-exe-7': 'Noun from **TRUE** → tell the **truth**.',
  'b1-u15-exe-8': 'Adjective from **VALUE** → quite **valuable**.',

  'b1-u15-exf-1': 'Noun from **INVEST** → a good **investment**.',
  'b1-u15-exf-2': 'Adjective from **WEALTH** → very **wealthy**.',
  'b1-u15-exf-3': 'Noun from **OPEN** → the **opening** of the supermarket.',
  'b1-u15-exf-4': 'Noun from **RESPONSIBLE** → financial **responsibility**.',
  'b1-u15-exf-5': 'Noun from **REDUCE** → a 20% **reduction**.',
  'b1-u15-exf-6': 'Noun from **EMPLOY** → offers **employment**.',

  'b1-u15-exh-1': 'Noun from **DETERMINE** → her **determination**.',
  'b1-u15-exh-2': 'Noun from **CREATE** → a lot of **creativity**.',
  'b1-u15-exh-3': 'Noun from **BRAVE** → real **bravery**.',
  'b1-u15-exh-4': 'Noun from **ORGANISE** → excellent **organisation**.',
  'b1-u15-exh-5': 'Noun from **ABLE** → **ability** to bargain.',
  'b1-u15-exh-6': 'Noun from **ATTEND** → pay **attention**.',

  // ── Review 5 ────────────────────────────────────────────
  'b1-u5-exb-1': 'Noun from **DECIDE** → made her **decision**.',
  'b1-u5-exb-2': 'Adjective from **EXPENSE** → too **expensive**.',
  'b1-u5-exb-3': 'Negative from **USE** → completely **useless**.',
  'b1-u5-exb-4': 'People who serve → **servants**.',
  'b1-u5-exb-5': 'Adjective from **AFFORD** → **affordable** clothes.',
  'b1-u5-exb-6': 'Negative from **TRUE** → completely **untrue**.',
  'b1-u5-exb-7': 'Adjective from **VALUE** → very **valuable**.',
  'b1-u5-exb-8': 'Verb from **COMPARE** → **compare** prices.',

  'b1-u5-exc-1': 'Lend → **borrow €20 from** you.',
  'b1-u5-exc-2': 'Decide between two → **choose between**.',
  'b1-u5-exc-3': 'Return trainers → **take them back**.',
  'b1-u5-exc-4': 'Owing money → **are in debt**.',
  'b1-u5-exc-5': 'Go faster → **hurry up**.',
  'b1-u5-exc-6': 'Using notes and coins → paid **in cash**.',

  'b1-u5-exd-1': 'Singular countable → **a** sandwich.',
  'b1-u5-exd-2': 'Vowel sound → **an** intelligent student.',
  'b1-u5-exd-3': '**Juice** uncountable → **much** juice left.',
  'b1-u5-exd-4': 'Some (not many) → **a few** people came.',
  'b1-u5-exd-5': '**Information** uncountable → **some** information.',
  'b1-u5-exd-6': 'Superlative → **the** most expensive phone.',
  'b1-u5-exd-7': '**Flour** uncountable → need **some** flour.',
  'b1-u5-exd-8': '**Advice** uncountable → **a lot of** useful advice.',
  'b1-u5-exd-9': 'Countable friends → **a few** close friends.',
  'b1-u5-exd-10': 'Offer → **some** bread with soup.',
  'b1-u5-exd-11': 'Specific place → goes to **the** gym.',
  'b1-u5-exd-12': '**Coffee** uncountable → **much** coffee left.',

  'b1-u5-exe-1': 'Fixed phrase → **have** a look at prices.',
  'b1-u5-exe-2': 'Try shoes **on** before buying.',
  'b1-u5-exe-3': '**On sale** = at a reduced price.',
  'b1-u5-exe-4': '**Make up** my mind = decide.',
  'b1-u5-exe-5': 'Too **small** — need a larger size.',
  'b1-u5-exe-6': 'A great **bargain** = cheap price.',
  'b1-u5-exe-7': 'Pay **in** cash.',
  'b1-u5-exe-8': '**Make** a complaint.',
  'b1-u5-exe-9': 'Full **refund** after returning the phone.',
  'b1-u5-exe-10': '**Out of** stock = none left in the shop.',
  'b1-u5-exe-11': 'Saving **up** for something.',
  'b1-u5-exe-12': 'A **lot** of money = a large amount.',
  'b1-u5-exe-13': 'At a real **bargain** = very cheap.',
  'b1-u5-exe-14': 'Always **compare** prices before buying.'
};

const PASSAGE_EXPLANATIONS = {
  'b1-u5-ex-a': [
    'Superlative → **the** most popular websites.',
    'Belong **to** different sellers.',
    'Vowel sound → **an** amazing variety.',
    'Specific website already mentioned → **the** website.',
    'Pay **for** your order.',
    'Pay **by** credit card.',
    'General description → **a** very convenient way.',
    'Uncountable time → **a little** time.',
    'Condition → arrive **in** excellent condition.',
    'Fixed phrase → **a lot** of special offers.'
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

const files = ['Unit13.v2.json', 'Unit14.v2.json', 'Unit15.v2.json', 'Review5.v2.json'];
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
