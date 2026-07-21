#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 13:
 * Unit37, Unit38, Unit39, Review13
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 37: -ing / infinitive ────────────────────────────
  'b1-u37-exa-1': '**Love** + **-ing** → **painting** landscapes.',
  'b1-u37-exa-2': '**Agree** + infinitive → **to meet**.',
  'b1-u37-exa-3': '**Hope** + infinitive → **to visit** Italy.',
  'b1-u37-exa-4': '**Dislike** + **-ing** → **waiting** for buses.',
  'b1-u37-exa-5': '**Mind** + **-ing** → **closing** the door.',
  'b1-u37-exa-6': '**Offer** + infinitive → **to carry** my bag.',

  'b1-u37-exb-1': 'After **about** → **-ing** → **travelling**.',
  'b1-u37-exb-2': 'After **for** → **inviting** me.',
  'b1-u37-exb-3': 'After **in** → **collecting** coins.',
  'b1-u37-exb-4': 'After **about** → **missing** the train.',
  'b1-u37-exb-5': 'After **about** → **studying** together.',
  'b1-u37-exb-6': '**Used to** + **-ing** → **waking** up early.',

  'b1-u37-exc-1': 'Past memory → **forget meeting** him.',
  'b1-u37-exc-2': 'Future action → **forget to switch off**.',
  'b1-u37-exc-3': 'Quit an activity → **stopped playing**.',
  'b1-u37-exc-4': 'Pause for a reason → **stopped to buy** snacks.',
  'b1-u37-exc-5': 'Experiment → **try adding** honey.',
  'b1-u37-exc-6': 'Attempt → **trying to do** more exercise.',

  'b1-u37-exd-1': '**Let** + bare infinitive → **use**.',
  'b1-u37-exd-2': '**Make** + bare infinitive → **do**.',
  'b1-u37-exd-3': 'Passive **made** → **to stay**.',
  'b1-u37-exd-4': '**Advise** + infinitive → **to drink**.',
  'b1-u37-exd-5': '**Ask** + infinitive → **to be** quiet.',
  'b1-u37-exd-6': '**Would like** + infinitive → **to play**.',

  'b1-u37-exe-1': '**Suggest** + **-ing** → **leaving** earlier.',
  'b1-u37-exe-2': '**Afford** + infinitive → **to take** a holiday.',
  'b1-u37-exe-3': '**Feel like** + **-ing** → **watching** a film.',
  'b1-u37-exe-4': 'Future reminder → **remember to close**.',
  'b1-u37-exe-5': '**Make** + bare infinitive → **do** again.',
  'b1-u37-exe-6': '**Helps** + infinitive → **to become** independent.',

  'b1-u37-exf-1': 'Past memory → **remember visiting**.',
  'b1-u37-exf-2': 'Future duty → **Remember to lock**.',
  'b1-u37-exf-3': 'Pause for purpose → **stopped to answer**.',
  'b1-u37-exf-4': 'Experiment → **tried turning** the computer off.',
  'b1-u37-exf-5': '**Made us stay** (bare infinitive).',
  'b1-u37-exf-6': 'Passive → **was made to** apologise.',

  // ── Unit 38: Both/either/neither & so/nor ─────────────────
  'b1-u38-exa-1': 'Two people → **Both** my sisters.',
  'b1-u38-exa-2': 'One of two → **either** seat.',
  'b1-u38-exa-3': 'Not one nor the other → **Neither** restaurant.',
  'b1-u38-exa-4': 'Two qualities → **both** funny and exciting.',
  'b1-u38-exa-5': 'Negative + two → **either** of those books.',
  'b1-u38-exa-6': 'None of two → **Neither** of them.',

  'b1-u38-exb-1': 'Agreement → **so can** my brother.',
  'b1-u38-exb-2': 'Negative agreement → **nor has** Tom.',
  'b1-u38-exb-3': 'Present perfect → **so have** they.',
  'b1-u38-exb-4': 'Negative → **nor does** my cousin.',
  'b1-u38-exb-5': 'Past state → **so was** I.',
  'b1-u38-exb-6': 'Would → **nor would** we.',

  'b1-u38-exc-1': 'Two people → **Both** Ben and Oliver.',
  'b1-u38-exc-2': 'Choice → **either** stay here or come back.',
  'b1-u38-exc-3': '**Neither** Spanish **nor** Italian.',
  'b1-u38-exc-4': 'Negative agreement → **nor was** my brother.',
  'b1-u38-exc-5': 'Positive agreement → **so am** I.',
  'b1-u38-exc-6': 'Not one correct → **Neither** of these answers.',

  // ── Unit 39: Feelings & behaviour ─────────────────────────
  'b1-u39-exa-1': 'Makes people laugh → **amusing** story.',
  'b1-u39-exa-2': 'Irritate → **annoy** me.',
  'b1-u39-exa-3': 'Way of behaving → friendly **attitude**.',
  'b1-u39-exa-4': 'Act properly → **behave** well.',
  'b1-u39-exa-5': 'Very sad → felt **depressed**.',
  'b1-u39-exa-6': 'Feeling → natural **emotion**.',
  'b1-u39-exa-7': 'Happy about → **glad** you enjoyed.',
  'b1-u39-exa-8': 'Cause pain → can **hurt** people.',

  'b1-u39-exb-1': 'Impolite → **rude** to leave.',
  'b1-u39-exb-2': 'Badly behaved → **naughty** child.',
  'b1-u39-exb-3': 'Silly → sounds **ridiculous**.',
  'b1-u39-exb-4': 'Gets angry easily → **bad-tempered** when hungry.',
  'b1-u39-exb-5': 'Loud → very **noisy** party.',
  'b1-u39-exb-6': 'Makes jokes → sense of **humour**.',

  'b1-u39-exc-1': 'Hurry → **Come on**!',
  'b1-u39-exc-2': 'Louder → **speak up**.',
  'b1-u39-exc-3': 'Relax → **calm down**.',
  'b1-u39-exc-4': 'Avoid → **run away from** conversations.',
  'b1-u39-exc-5': 'Feel happier → **cheer up**.',
  'b1-u39-exc-6': 'Continue → argument **go on**.',
  'b1-u39-exc-7': 'Wait → **Hang on** a moment.',
  'b1-u39-exc-8': 'Be quiet → **shut up**.',

  'b1-u39-exd-1': 'Initially → **at first**.',
  'b1-u39-exd-2': 'Sometimes → **at times** annoying.',
  'b1-u39-exd-3': 'Crying → **in tears**.',
  'b1-u39-exd-4': 'Despite → **in spite of** the stress.',
  'b1-u39-exd-5': 'Privately → **in secret**.',
  'b1-u39-exd-6': 'Minimum → **at least** listen.',

  'b1-u39-exe-1': 'Ashamed **of** behaviour.',
  'b1-u39-exe-2': 'Embarrassed **about** crying.',
  'b1-u39-exe-3': 'Frightened **of** thunder.',
  'b1-u39-exe-4': 'Nervous **about** meeting.',
  'b1-u39-exe-5': 'Scared **of** spiders.',
  'b1-u39-exe-6': 'Tired **of** listening.',
  'b1-u39-exe-7': 'Congratulated **on** passing.',
  'b1-u39-exe-8': 'Laugh **at** mistakes.',
  'b1-u39-exe-9': 'Joke **about** her holiday.',
  'b1-u39-exe-10': 'Ashamed **of** being shy.',

  'b1-u39-exf-1': 'Adjective from BORE → **boring** lesson.',
  'b1-u39-exf-2': 'Person from COMEDY → **comedian**.',
  'b1-u39-exf-3': 'Adjective from EMOTION → **emotional** moment.',
  'b1-u39-exf-4': 'Adjective from ENERGY → **energetic** puppy.',
  'b1-u39-exf-5': 'Adjective from EXCITE → **excited** about trip.',
  'b1-u39-exf-6': 'Noun from FEEL → talk about **feelings**.',
  'b1-u39-exf-7': 'Noun from HAPPY → bring **happiness**.',
  'b1-u39-exf-8': 'Adverb from NOISE → entered **noisily**.',
  'b1-u39-exf-9': 'Adjective from SYMPATHY → very **sympathetic**.',
  'b1-u39-exf-10': 'Noun from HATE → his **hatred** of rules.',

  'b1-u39-exg-1': 'Crying → **in tears**.',
  'b1-u39-exg-2': 'Continue → **go on**.',
  'b1-u39-exg-3': 'Funny → **amusing**.',
  'b1-u39-exg-4': 'Congratulate **on** success.',
  'b1-u39-exg-5': 'Very sad → **miserable**.',
  'b1-u39-exg-6': 'Louder → speak **up**.',

  'b1-u39-exh-1': 'Funny story → tell a **joke**.',
  'b1-u39-exh-2': 'Respectful → be **polite**.',
  'b1-u39-exh-3': 'Privately → met in **secret**.',
  'b1-u39-exh-4': 'Sorry **for** laughing.',
  'b1-u39-exh-5': 'Nervous **about** giving speech.',
  'b1-u39-exh-6': 'Louder → speak **up**.',
  'b1-u39-exh-7': 'Initially → **At first** she seemed shy.',
  'b1-u39-exh-8': 'Encourage → cheered **up**.',

  // ── Review 13 ───────────────────────────────────────────
  'b1-u13-exa-1': 'Noun from FEEL → your **feelings**.',
  'b1-u13-exa-2': 'Negative from HAPPY → felt **unhappy**.',
  'b1-u13-exa-3': 'Adjective from EMOTION → **emotional** changes.',
  'b1-u13-exa-4': 'Adjective from SYMPATHY → **sympathetic** teacher.',
  'b1-u13-exa-5': 'Adjective from BORE → looked **bored**.',
  'b1-u13-exa-6': 'Adjective from EXCITE → **exciting** game.',
  'b1-u13-exa-7': 'Feeling excited → **excited** about trip.',
  'b1-u13-exa-8': 'Adjective from ENERGY → very **energetic**.',

  'b1-u13-exb-1': 'Hurry → Come **on**!',
  'b1-u13-exb-2': 'Wait → Hang **on** a minute.',
  'b1-u13-exb-3': 'Be quiet → shut **up**.',
  'b1-u13-exb-4': 'Continue → went **on** for hours.',
  'b1-u13-exb-5': 'Relax → calm **down**.',
  'b1-u13-exb-6': 'Louder → speak **up**.',
  'b1-u13-exb-7': 'Escape → ran **away**.',
  'b1-u13-exb-8': 'Encourage → cheered me **up**.',

  'b1-u13-exc-1': 'Not enough money → **can\'t afford** tickets.',
  'b1-u13-exc-2': 'Pretended → **pretended to be** happy.',
  'b1-u13-exc-3': 'Passive → **were made to** apologise.',
  'b1-u13-exc-4': 'Chose → **decided to speak** to Jake.',
  'b1-u13-exc-5': 'Succeeded → **managed to make** Anna smile.',
  'b1-u13-exc-6': 'Try not to → **avoid arguing**.',

  'b1-u13-exd-1': '**Enjoy** + **-ing** → **reading**.',
  'b1-u13-exd-2': '**Decided** + infinitive → **to move**.',
  'b1-u13-exd-3': '**Both** … **and** → cousins **and** uncle.',
  'b1-u13-exd-4': 'Negative agreement → **neither** does my sister.',
  'b1-u13-exd-5': 'Quit activity → **stopped talking**.',
  'b1-u13-exd-6': 'Attempt → **tried to find**.',
  'b1-u13-exd-7': '**Neither** Emma **nor** Chloe.',
  'b1-u13-exd-8': 'Past memory → **remember seeing**.',
  'b1-u13-exd-9': 'Agreement → **So am** I.',
  'b1-u13-exd-10': 'Future action → **forgot to bring**.',
  'b1-u13-exd-11': 'Choice → **either** … **or**.',
  'b1-u13-exd-12': '**Admitted** + **-ing** → **to breaking**.',
  'b1-u13-exd-13': 'Agreement → **So do** I.',
  'b1-u13-exd-14': '**Refused** + infinitive → **to speak**.',

  'b1-u13-exe-1': 'Suddenly laugh → **burst** out laughing.',
  'b1-u13-exe-2': 'Start crying → burst into **tears**.',
  'b1-u13-exe-3': 'Laughing hard → **crying** with laughter.',
  'b1-u13-exe-4': 'Couldn\'t stop → **stop** laughing.',
  'b1-u13-exe-5': 'Gave → **gave** a warm smile.',
  'b1-u13-exe-6': 'Began → started **crying**.',
  'b1-u13-exe-7': 'Tears flowed → tears **ran** down.',
  'b1-u13-exe-8': 'Said a joke → **told** a funny joke.',
  'b1-u13-exe-9': 'Not laugh → straight **face**.',
  'b1-u13-exe-10': 'Encouraged → cheered him **up**.',
  'b1-u13-exe-11': 'Moved to cry → moved to **tears**.',
  'b1-u13-exe-12': 'Laughing a lot → in **stitches**.',
  'b1-u13-exe-13': 'Tried **hard** not to cry.',
  'b1-u13-exe-14': 'Hold back → **contain** his laughter.'
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

const files = ['Unit37.v2.json', 'Unit38.v2.json', 'Unit39.v2.json', 'Review13.v2.json'];
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
