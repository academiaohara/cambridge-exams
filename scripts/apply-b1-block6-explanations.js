#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 6:
 * Unit16, Unit17, Unit18, Review6
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 16: Pronouns ───────────────────────────────────
  'b1-u16-exa-1': '**Sofia and I** = first person plural → **We**.',
  'b1-u16-exa-2': '**Leo** = male singular → **He**.',
  'b1-u16-exa-3': '**My tablet** = thing → **It**.',
  'b1-u16-exa-4': '**Hugo and Clara** = they → **They**.',
  'b1-u16-exa-5': 'Speaker talking about themselves → **I**.',
  'b1-u16-exa-6': 'Direct question to **Mia** → **you**.',

  'b1-u16-exb-1': 'Object of **call** → **me**.',
  'b1-u16-exb-2': '**A message** = thing → **it**.',
  'b1-u16-exb-3': '**Alex** = male → object **him**.',
  'b1-u16-exb-4': '**The plants** = plural things → **them**.',
  'b1-u16-exb-5': '**My cousins** = plural → object **them**.',
  'b1-u16-exb-6': 'Object of **tell** → **us**.',

  'b1-u16-exc-1': 'Before a noun → possessive determiner **my** (not **mine**).',
  'b1-u16-exc-2': 'Before **phone** → **her** (not **hers**).',
  'b1-u16-exc-3': 'Possession, not **it is** → **its** wings.',
  'b1-u16-exc-4': 'Before **grandparents** → **our**.',
  'b1-u16-exc-5': 'Before **bags** → **their** (not **theirs**).',
  'b1-u16-exc-6': 'Before **idea** → **your** (not **yours**).',

  'b1-u16-exd-1': 'No noun after → possessive pronoun **mine**.',
  'b1-u16-exd-2': 'Belongs to Julia → **hers**.',
  'b1-u16-exd-3': 'For you, no noun → **yours**.',
  'b1-u16-exd-4': 'Belongs to us → **ours**.',
  'b1-u16-exd-5': 'Belong to neighbours → **theirs**.',
  'b1-u16-exd-6': 'Belongs to my father → **his**.',

  'b1-u16-exe-1': 'Warning to the person → **yourself**.',
  'b1-u16-exe-2': 'I did it alone → **myself**.',
  'b1-u16-exe-3': 'They did it alone → **themselves**.',
  'b1-u16-exe-4': 'We did it alone → **ourselves**.',
  'b1-u16-exe-5': 'She taught herself → **herself**.',
  'b1-u16-exe-6': 'The door closes alone → **itself**.',

  'b1-u16-exf-1': '**Laura and I** = subject → **We** walk to school.',
  'b1-u16-exf-2': 'Object of **seen** → **them** (my glasses).',
  'b1-u16-exf-3': 'No noun after → possessive pronoun **theirs**.',
  'b1-u16-exf-4': '**By** + reflexive → **himself**.',
  'b1-u16-exf-5': 'Before **bedroom** → possessive determiner **our**.',
  'b1-u16-exf-6': 'Object of **speak to** → **her**.',

  'b1-u16-exg-1': 'Before a noun → **their** house (not **theirs**).',
  'b1-u16-exg-2': 'Subject pronoun → **He** is my cousin.',
  'b1-u16-exg-3': 'After **to** → object **us**.',
  'b1-u16-exg-4': '**The boys** = plural → **themselves**.',
  'b1-u16-exg-5': 'Possession → **its** basket (not **it\'s**).',
  'b1-u16-exg-6': 'No noun after → **yours** (not **your**).',

  'b1-u16-exh-1': 'After **is** with no noun → **hers**.',
  'b1-u16-exh-2': '**By** + reflexive → **himself**.',
  'b1-u16-exh-3': 'Before **classroom** → **our**.',
  'b1-u16-exh-4': 'Object of **show** → **them**.',
  'b1-u16-exh-5': 'After **is** with no noun → **hers**.',
  'b1-u16-exh-6': '**By** + reflexive, plural → **themselves**.',

  'b1-u16-exi-1': 'Alone, without help → **by herself**.',
  'b1-u16-exi-2': 'Belongs to David → **David\'s wallet**.',
  'b1-u16-exi-3': 'Hurt herself = injured herself → **hurt herself**.',
  'b1-u16-exi-4': 'No help → **by ourselves**.',
  'b1-u16-exi-5': 'Question about ownership → **Is that your** black backpack?',
  'b1-u16-exi-6': 'They made the posters alone → **the posters themselves**.',

  // ── Unit 17: Relative clauses ───────────────────────────
  'b1-u17-exa-1': '**The man** = person → **who** helped us.',
  'b1-u17-exa-2': '**The camera** = thing → **which** I used.',
  'b1-u17-exa-3': '**The library** = place → **where** I study.',
  'b1-u17-exa-4': 'Possession → friend **whose** mother works.',
  'b1-u17-exa-5': '**The doctor** = person → **who** examined me.',
  'b1-u17-exa-6': '**The song** = thing → **which** you heard.',
  'b1-u17-exa-7': '**A hotel** = place → **where** the rooms had views.',
  'b1-u17-exa-8': 'Possession → girl **whose** bag was lost.',

  'b1-u17-exb-1': 'Extra information about **my brother** → non-defining → commas.',
  'b1-u17-exb-2': 'Identifies which bike → defining clause → **no commas**.',
  'b1-u17-exb-3': 'Extra information about **Mrs Carter** → non-defining → commas.',
  'b1-u17-exb-4': 'Identifies which people → defining → **no commas**.',
  'b1-u17-exb-5': 'Extra information about the castle → non-defining → commas.',
  'b1-u17-exb-6': 'Identifies which students → defining → **no commas**.',

  'b1-u17-exc-1': '**The neighbour** = person → **who** looks after our dog.',
  'b1-u17-exc-2': '**The programme** = thing → **that** everyone watched.',
  'b1-u17-exc-3': '**A restaurant** = thing → **that** serves food.',
  'b1-u17-exc-4': 'Possession → man **whose** wallet was stolen.',
  'b1-u17-exc-5': '**The village** = place → **where** my dad grew up.',
  'b1-u17-exc-6': '**The tablet** = thing → **which** I ordered.',
  'b1-u17-exc-7': '**The singer** = person → **that** won.',
  'b1-u17-exc-8': '**The gallery** = thing → **which** has paintings.',

  'b1-u17-exd-1': 'Join with **who** for a person → **who can solve**.',
  'b1-u17-exd-2': 'Join with **which** for a thing → **which was close**.',
  'b1-u17-exd-3': 'Possession → **whose sister won**.',
  'b1-u17-exd-4': 'Place → **where my mother studied**.',
  'b1-u17-exd-5': 'Thing → **which was under the table**.',
  'b1-u17-exd-6': 'Place → **where we met on Saturday**.',

  'b1-u17-exe-1': 'Remove extra **she** after **who** → **who won**.',
  'b1-u17-exe-2': 'Remove extra **it** after **which** → **which I bought**.',
  'b1-u17-exe-3': 'Remove extra **he** in non-defining clause → **who works**.',
  'b1-u17-exe-4': '**Film** = thing → **which** (not **who**).',
  'b1-u17-exe-5': 'Remove extra **there** after **where**.',
  'b1-u17-exe-6': '**Neighbour** = person → **who plays** (not **that he**).',

  'b1-u17-exf-1': 'Possession → woman **whose** daughter is in my class.',
  'b1-u17-exf-2': 'Place → shop **where** I bought my jacket.',
  'b1-u17-exf-3': 'Thing → phone **which** belongs to Sam.',
  'b1-u17-exf-4': 'Person → man **who** I spoke to.',
  'b1-u17-exf-5': 'Reason → reason **why** they cancelled.',
  'b1-u17-exf-6': 'Place → beach **where** we learned to surf.',

  'b1-u17-exg-1': '**The woman** = person who acted → **who**.',
  'b1-u17-exg-2': 'Possession → dog **whose** owner lives next door.',
  'b1-u17-exg-3': '**The café** = place → **where** we met.',
  'b1-u17-exg-4': '**The jacket** = thing → **which** I bought.',
  'b1-u17-exg-5': 'Possession → boy **whose** father is a firefighter.',
  'b1-u17-exg-6': '**The town** = place → **where** we stayed.',
  'b1-u17-exg-7': '**The player** = person → **who** scored.',
  'b1-u17-exg-8': '**The headphones** = things → **which** I want.',

  'b1-u17-exh-1': '**A teacher** = person → **who** works.',
  'b1-u17-exh-2': '**A school** = thing → **which** has students.',
  'b1-u17-exh-3': 'Non-defining clause about the school → **which**.',
  'b1-u17-exh-4': 'Possession → man **whose** lessons are exciting.',
  'b1-u17-exh-5': '**The classroom** = place → **where** they study.',
  'b1-u17-exh-6': 'Reason → reason **why** she became a teacher.',
  'b1-u17-exh-7': '**Students** = people → **who** speak languages.',
  'b1-u17-exh-8': '**A school** = place → **where** I would love to visit.',

  'b1-u17-exi-1': 'Combine: musician **who plays** in an orchestra.',
  'b1-u17-exi-2': 'Omit the object: scarf **I bought** at the market.',
  'b1-u17-exi-3': 'Combine: shop **that sells** handmade gifts.',
  'b1-u17-exi-4': 'Possession → painter **whose picture won** a prize.',
  'b1-u17-exi-5': 'Omit the object: village **we visited** in June.',
  'b1-u17-exi-6': 'Combine: doctor **who studies** tropical diseases.',

  // ── Unit 18: Science & technology ───────────────────────
  'b1-u18-exa-1': 'Doors that open by themselves → **automatic**.',
  'b1-u18-exa-2': 'Portable computer for essays → **laptop**.',
  'b1-u18-exa-3': 'Years of study before testing → **research**.',
  'b1-u18-exa-4': 'Use/work a machine → **operate**.',
  'b1-u18-exa-5': 'Tools for an experiment → **equipment**.',
  'b1-u18-exa-6': 'Read on a tablet → **digital** books.',
  'b1-u18-exa-7': 'Nobody understood → **complicated** instructions.',
  'b1-u18-exa-8': 'Find something new → **discover** planets.',
  'b1-u18-exa-9': 'Small useful device → **gadget**.',
  'b1-u18-exa-10': 'Different from all others → **unique** design.',
  'b1-u18-exa-11': 'Scientists work in a **laboratory**.',
  'b1-u18-exa-12': 'Modern medicine uses new **technology**.',

  'b1-u18-exb-1': 'Guess the time → **estimate** (not **involve**).',
  'b1-u18-exb-2': 'Unexpected flash → **sudden**.',
  'b1-u18-exb-3': 'Material the toy is made of → **plastic**.',
  'b1-u18-exb-4': 'Precise weight → **exact**.',
  'b1-u18-exb-5': 'Part of the computer → **screen** is too bright.',
  'b1-u18-exb-6': 'Make bills smaller → **decrease**.',
  'b1-u18-exb-7': 'Software **runs** on a laptop.',
  'b1-u18-exb-8': 'Does not have enough → **lacks** power.',

  'b1-u18-exc-1': 'Switch off → **turn off** the projector.',
  'b1-u18-exc-2': 'Find by chance → **came across** an article.',
  'b1-u18-exc-3': 'Discover information → **find out** what time.',
  'b1-u18-exc-4': 'Stop working → lift **breaks down**.',
  'b1-u18-exc-5': 'Dispose of → don\'t **throw away** phones.',
  'b1-u18-exc-6': 'Invent a false story → **make up** a story.',
  'b1-u18-exc-7': 'Switch on → **turn on** the lights.',
  'b1-u18-exc-8': 'Remove by pulling → don\'t **pull off** the handle.',

  'b1-u18-exd-1': 'Finally, after waiting → **at last**.',
  'b1-u18-exd-2': 'Unexpectedly → **by chance**.',
  'b1-u18-exd-3': 'Giving an opinion → **in my opinion**.',
  'b1-u18-exd-4': 'Not working → **out of order**.',
  'b1-u18-exd-5': 'After trying several → **in the end**.',
  'b1-u18-exd-6': 'Later time → **in the future**.',

  'b1-u18-exe-1': 'Different **from** the one before.',
  'b1-u18-exe-2': 'Full **of** old computer parts.',
  'b1-u18-exe-3': 'Start **with** a short video.',
  'b1-u18-exe-4': 'Connect **to** the computer.',
  'b1-u18-exe-5': 'Disconnect **from** the power supply.',
  'b1-u18-exe-6': 'Result **in** headaches.',
  'b1-u18-exe-7': 'Difference **between** hardware and software.',
  'b1-u18-exe-8': 'Idea **about** how to fix it.',
  'b1-u18-exe-9': 'A number **of** scientists.',
  'b1-u18-exe-10': 'Reason **for** the decrease.',

  'b1-u18-exf-1': 'Adjective from BOIL → **boiling** soup.',
  'b1-u18-exf-2': 'Noun (machine) from BOIL → **boiler**.',
  'b1-u18-exf-3': 'Person from SCIENCE → **scientist**.',
  'b1-u18-exf-4': 'Adjective from CHEMIST → **chemical** experiment.',
  'b1-u18-exf-5': 'Noun from CONCLUDE → **conclusion**.',
  'b1-u18-exf-6': 'Adjective from FASCINATE → **fascinating** exhibition.',
  'b1-u18-exf-7': 'Adjective from HISTORY → **historic** moment.',
  'b1-u18-exf-8': 'Noun from MEASURE → **measurement**.',

  'b1-u18-exg-1': 'Software **runs** games on a computer.',
  'b1-u18-exg-2': 'Not enough → a **lack** of clean water.',
  'b1-u18-exg-3': 'Highest speed → **maximum** speed.',
  'b1-u18-exg-4': 'Programs on a computer → **software**.',
  'b1-u18-exg-5': 'Include as part of → **involve** designing.',
  'b1-u18-exg-6': 'Have an effect **on** → positive **effect**.',

  'b1-u18-exh-1': 'Material → recycled **plastic**.',
  'b1-u18-exh-2': 'Opinion phrase → **in my** opinion.',
  'b1-u18-exh-3': 'Discover → find **out** why.',
  'b1-u18-exh-4': 'Precise → **exact** number.',
  'b1-u18-exh-5': 'Finally → in the **end**.',
  'b1-u18-exh-6': 'Dispose of → throw **away** batteries.',
  'b1-u18-exh-7': 'Not working → out of **order**.',
  'b1-u18-exh-8': 'Later → in the **future**.',

  // ── Review 6 ────────────────────────────────────────────
  'b1-u6-exa-1': 'Find by chance → **came across** an old calculator.',
  'b1-u6-exa-2': 'Not the same → **is a difference between** tablets and laptops.',
  'b1-u6-exa-3': 'Passive → false information **be made up by** inventors.',
  'b1-u6-exa-4': 'Dispose of → don\'t **throw those old batteries away**.',
  'b1-u6-exa-5': 'Stop working → printer **broke down**.',
  'b1-u6-exa-6': 'Led to → discovery **resulted in** a change.',
  'b1-u6-exa-7': 'Several → **a number of** gadgets.',
  'b1-u6-exa-8': 'Contains → tank **is full of** clean water.',

  'b1-u6-exb-1': 'Switch off → turn **off**.',
  'b1-u6-exb-2': 'Opinion → **In** my opinion.',
  'b1-u6-exb-3': 'Separate from → disconnect **from** the tablet.',
  'b1-u6-exb-4': 'Finally → **in** the end.',
  'b1-u6-exb-5': 'At last → **At** last.',
  'b1-u6-exb-6': 'Types **of** software.',
  'b1-u6-exb-7': 'Switch on → turn **on**.',
  'b1-u6-exb-8': 'Reason **for** the decrease.',

  'b1-u6-exc-1': 'Noun from LONG → **length** of the bridge.',
  'b1-u6-exc-2': 'Adjective from FASCINATE → **fascinating** lecture.',
  'b1-u6-exc-3': 'Adverb from IDENTICAL → moved **identically**.',
  'b1-u6-exc-4': 'Noun from CONCLUDE → surprising **conclusion**.',

  'b1-u6-exd-1': '**The inventor** = person → **who** created.',
  'b1-u6-exd-2': '**The museum** = place/thing → **which** we visited.',
  'b1-u6-exd-3': 'Possession → scientist **whose** research changed.',
  'b1-u6-exd-4': '**Everything** = thing → **that** I found.',
  'b1-u6-exd-5': '**The engineer** = person → **who** I spoke to.',
  'b1-u6-exd-6': '**The program** = thing → **that** solved.',
  'b1-u6-exd-7': 'Before **charger** → possessive **your**.',
  'b1-u6-exd-8': 'No noun after → possessive pronoun **hers**.',
  'b1-u6-exd-9': '**The workshop** = place → **where** students build.',
  'b1-u6-exd-10': '**A machine** = thing → **that** can clean.',

  'b1-u6-exe-1': 'Do research → carry **out** research.',
  'b1-u6-exe-2': 'Strong effect → huge **impact** on daily life.',
  'b1-u6-exe-3': 'Think of an idea → came **up** with an idea.',
  'b1-u6-exe-4': 'Once more → tried it **again**.',
  'b1-u6-exe-5': 'Solve → worked **out** how to repair.',
  'b1-u6-exe-6': 'Find something new → **discovered** a new material.',
  'b1-u6-exe-7': 'Surprised by → amazed **at** the results.',
  'b1-u6-exe-8': 'Request officially → **apply** for a patent.',
  'b1-u6-exe-9': 'Make it possible **to** send messages.',
  'b1-u6-exe-10': 'Responsible **for** programming.',
  'b1-u6-exe-11': 'Turned out → **proved** to be useful.',
  'b1-u6-exe-12': 'Start a company → set **up** a company.'
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

const files = ['Unit16.v2.json', 'Unit17.v2.json', 'Unit18.v2.json', 'Review6.v2.json'];
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
