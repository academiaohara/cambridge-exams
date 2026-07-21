#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 7:
 * Unit19, Unit20, Unit21, Review7
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 19: Modals (ability, permission, advice) ───────
  'b1-u19-exa-1': 'Not able yet → **can\'t** dive very well.',
  'b1-u19-exa-2': 'Past ability → **could** climb trees.',
  'b1-u19-exa-3': 'Future ability → **be able to** ride safely.',
  'b1-u19-exa-4': 'Present perfect ability → **been able to** contact.',
  'b1-u19-exa-5': 'Past ability question → **Could** you speak English?',
  'b1-u19-exa-6': 'Future with condition → **be able to** buy.',
  'b1-u19-exa-7': 'Not possible today → **can\'t** meet you.',
  'b1-u19-exa-8': 'Past inability → wasn\'t **able to** open the door.',

  'b1-u19-exb-1': 'Formal permission request → **May** I speak to the manager?',
  'b1-u19-exb-2': 'Giving permission → you **can** use my charger.',
  'b1-u19-exb-3': 'Polite request → **Could** you help me?',
  'b1-u19-exb-4': 'Rule/permission → visitors **may** enter after 10.',
  'b1-u19-exb-5': 'Polite request → **May** I have another copy?',
  'b1-u19-exb-6': 'Prohibition → you **can\'t** swim here.',
  'b1-u19-exb-7': 'Polite request → **could** you show me the way?',
  'b1-u19-exb-8': 'Prohibition → **may not** take photographs.',

  'b1-u19-exc-1': 'Good advice → you **should** take an umbrella.',
  'b1-u19-exc-2': 'Bad idea → **shouldn\'t** leave bags unattended.',
  'b1-u19-exc-3': 'Advice → she **ought to** practise every day.',
  'b1-u19-exc-4': 'Bad idea → **ought not to** spend all afternoon on a screen.',
  'b1-u19-exc-5': 'Asking for advice → what **should** we do?',
  'b1-u19-exc-6': 'Advice → you **should** ask your parents.',
  'b1-u19-exc-7': 'Bad idea → drivers **shouldn\'t** use phones.',
  'b1-u19-exc-8': 'Advice → we **ought to** check the address.',

  'b1-u19-exd-1': 'Ability/possibility → **Can** you send me the file?',
  'b1-u19-exd-2': 'Bad idea → you **shouldn\'t** eat too quickly.',
  'b1-u19-exd-3': 'Past ability → I **could** play chess.',
  'b1-u19-exd-4': 'Permission → **May** I open the door?',
  'b1-u19-exd-5': 'Bad idea → **shouldn\'t** leave your bike unlocked.',
  'b1-u19-exd-6': 'Managed to → have **been able to** repair.',

  'b1-u19-exe-1': 'Bad idea → **shouldn\'t walk** home alone.',
  'b1-u19-exe-2': 'Permission → **May I borrow** your bike?',
  'b1-u19-exe-3': 'Past ability → I **could cook** simple meals.',
  'b1-u19-exe-4': 'Future ability → **be able to** finish the bridge.',
  'b1-u19-exe-5': 'Advice → **ought to apologise** to her.',
  'b1-u19-exe-6': 'Prohibition → **mustn\'t enter** without permission.',

  'b1-u19-exf-1': 'Reassurance → you **shouldn\'t worry** so much.',
  'b1-u19-exf-2': 'Past ability → I **could** draw realistic animals.',
  'b1-u19-exf-3': 'Permission request → **May** I use your ruler?',
  'b1-u19-exf-4': 'Advice because it\'s cold → **should** take a coat.',
  'b1-u19-exf-5': 'Future ability → **will be able to** design a website.',
  'b1-u19-exf-6': 'Rule in a library → **shouldn\'t** talk loudly.',

  'b1-u19-exg-1': '**Can** has no -s → **can** ride (not **cans**).',
  'b1-u19-exg-2': '**Should** + base verb → **should call** (no **to**).',
  'b1-u19-exg-3': '**May** + base verb → **May I ask** (no **to**).',
  'b1-u19-exg-4': 'Past negative → **couldn\'t** find (not **didn\'t could**).',
  'b1-u19-exg-5': 'Future ability → **will be able to** (not **will can**).',
  'b1-u19-exg-6': 'Negative advice → **ought not to** arrive.',

  'b1-u19-exh-1': 'Polite permission → **may** I sit next to you?',
  'b1-u19-exh-2': 'Health advice → **should** drink more water.',
  'b1-u19-exh-3': 'Past inability → **couldn\'t** tie my shoes.',
  'b1-u19-exh-4': 'Future ability → **be able to** play perfectly.',
  'b1-u19-exh-5': 'Polite request → **Could** you speak more slowly?',
  'b1-u19-exh-6': 'Advice → **ought to** book the tickets.',
  'b1-u19-exh-7': 'Prohibition → **mustn\'t** touch the paintings.',
  'b1-u19-exh-8': 'Present ability → **can** speak Italian now.',

  'b1-u19-exi-1': 'Past ability → **could swim** at the age of six.',
  'b1-u19-exi-2': 'Against the rules → **aren\'t allowed to take** photos.',
  'b1-u19-exi-3': 'Reported advice → **should eat** fewer sweets.',
  'b1-u19-exi-4': 'Succeeded → **was able to answer** all the questions.',
  'b1-u19-exi-5': 'Permission question → **Are we allowed to use** dictionaries?',
  'b1-u19-exi-6': 'Advice → **ought to train** more often.',

  // ── Unit 20: Obligation & probability ───────────────────
  'b1-u20-exa-1': 'Strong obligation/rule → **must** show your ticket.',
  'b1-u20-exa-2': 'External necessity → **have to** hurry.',
  'b1-u20-exa-3': 'Necessity → **need to** send this form.',
  'b1-u20-exa-4': 'Prohibition → **mustn\'t** take food in.',
  'b1-u20-exa-5': 'Rule → **have to** wear correct boots.',
  'b1-u20-exa-6': 'Prohibition/warning → **mustn\'t** open that file.',
  'b1-u20-exa-7': 'Personal obligation → I **must** remember to lock.',
  'b1-u20-exa-8': 'Question about necessity → **have to** arrive before eight?',

  'b1-u20-exb-1': 'Not necessary → **don\'t need to** wash the dishes.',
  'b1-u20-exb-2': 'No obligation (bank holiday) → **doesn\'t have to** go to work.',
  'b1-u20-exb-3': 'Optional → **needn\'t** come with us.',
  'b1-u20-exb-4': 'Not necessary → **don\'t need to** bring chairs.',
  'b1-u20-exb-5': 'No obligation → **doesn\'t have to** study French.',
  'b1-u20-exb-6': 'No rush → **needn\'t** answer now.',
  'b1-u20-exb-7': 'Alternative available → **don\'t have to** get a taxi.',
  'b1-u20-exb-8': 'Unnecessary → **don\'t need to** write your name twice.',

  'b1-u20-exc-1': 'Past obligation → **had to** wait outside.',
  'b1-u20-exc-2': 'No past obligation → **didn\'t have to** take an umbrella.',
  'b1-u20-exc-3': 'Past obligation → **had to** finish homework.',
  'b1-u20-exc-4': 'Not necessary → **didn\'t need to** wear sports clothes.',
  'b1-u20-exc-5': 'Had a map → **didn\'t have to** ask for directions.',
  'b1-u20-exc-6': 'Past obligation → **had to** stay in hospital.',
  'b1-u20-exc-7': 'Tickets already bought → **didn\'t need to** buy tickets.',
  'b1-u20-exc-8': 'No obligation on Sunday → **didn\'t have to** get up early.',

  'b1-u20-exd-1': 'Optional → **don\'t have to** come.',
  'b1-u20-exd-2': 'Forbidden → **mustn\'t** touch the paintings.',
  'b1-u20-exd-3': 'Bus came immediately → **didn\'t have to** wait long.',
  'b1-u20-exd-4': 'Necessity → **need to** buy a present.',
  'b1-u20-exd-5': 'Rule → **must** wear a badge.',
  'b1-u20-exd-6': 'Past necessity → **had to** call a mechanic.',
  'b1-u20-exd-7': 'Already understand → **needn\'t** explain again.',
  'b1-u20-exd-8': 'Must not lose → **mustn\'t** lose these documents.',

  'b1-u20-exe-1': 'Logical certainty → **must** be Omar (red jacket).',
  'b1-u20-exe-2': 'Impossible → **can\'t** be Anna\'s bag.',
  'b1-u20-exe-3': 'Possible → meeting **might** finish late.',
  'b1-u20-exe-4': 'Expectation → parcel **should** arrive tomorrow.',
  'b1-u20-exe-5': 'Possibility → he **could** be in the garage.',
  'b1-u20-exe-6': 'Impossible (closed) → **couldn\'t** be open.',
  'b1-u20-exe-7': 'Expected result → **ought to** win the match.',
  'b1-u20-exe-8': 'Possibility → it **may** get cold later.',

  'b1-u20-exf-1': 'Advice, not obligation → **should** see a doctor.',
  'b1-u20-exf-2': 'Strong certainty → **must** be Daniel\'s notebook.',
  'b1-u20-exf-3': 'Food provided → **don\'t have to** bring lunch.',
  'b1-u20-exf-4': 'Dangerous → **mustn\'t** touch (not **needn\'t**).',
  'b1-u20-exf-5': 'Left an hour ago → she **should** arrive soon.',
  'b1-u20-exf-6': 'Past obligation → **had to** work late yesterday.',

  'b1-u20-exg-1': 'Red light = prohibition → **mustn\'t** cross.',
  'b1-u20-exg-2': '**Must** + base verb → **must finish** (no **to**).',
  'b1-u20-exg-3': 'No obligation → **didn\'t have to bring** books.',
  'b1-u20-exg-4': 'On holiday in Portugal → **can\'t** be Sophie.',
  'b1-u20-exg-5': '**Needn\'t** + base verb → **needn\'t pay** (no **to**).',
  'b1-u20-exg-6': 'Possibility → **may be** the correct password.',

  'b1-u20-exh-1': 'Necessary → passengers **must fasten** seatbelts.',
  'b1-u20-exh-2': 'Not necessary → I **didn\'t have** to phone.',
  'b1-u20-exh-3': 'Certainty → **must be** Maya\'s umbrella.',
  'b1-u20-exh-4': 'Possibility → they **might visit** us.',
  'b1-u20-exh-5': 'Prohibited → **mustn\'t enter** this area.',
  'b1-u20-exh-6': 'Probable → train **should arrive** soon.',

  'b1-u20-exi-1': 'Hotel provides towels → **don\'t have to** bring one.',
  'b1-u20-exi-2': 'Urgent → we **have to** go now.',
  'b1-u20-exi-3': 'Phone on table → he **can\'t** be far away.',
  'b1-u20-exi-4': 'Deadline next week → **don\'t need to** finish today.',
  'b1-u20-exi-5': 'Lots of practice → she **should** do well.',
  'b1-u20-exi-6': 'Forbidden → **mustn\'t** feed the animals.',
  'b1-u20-exi-7': 'Car in drive → Dad **must** be home.',
  'b1-u20-exi-8': 'Mum picked us up → **didn\'t have to** walk.',
  'b1-u20-exi-9': 'Uncertain → key **might** open the door.',
  'b1-u20-exi-10': 'Lift broken → **had to** use the stairs.',

  'b1-u20-exj-1': 'No need → **You don\'t need to** bring your dictionary.',
  'b1-u20-exj-2': 'Rules forbid it → **mustn\'t eat** in this room.',
  'b1-u20-exj-3': 'Certain → **must be** in the garden.',
  'b1-u20-exj-4': 'Past obligation → **had to arrive** early.',
  'b1-u20-exj-5': 'Possibility in past → **might have missed** the bus.',
  'b1-u20-exj-6': 'Not required → **You needn\'t** bring your own lunch.',

  // ── Unit 21: Communication ──────────────────────────────
  'b1-u21-exa-1': 'Digital document → saved the **file**.',
  'b1-u21-exa-2': 'Stop someone speaking → **interrupt** the teacher.',
  'b1-u21-exa-3': 'Public message → **announcement** at the airport.',
  'b1-u21-exa-4': 'TV **channel** shows documentaries.',
  'b1-u21-exa-5': 'Way of speaking → Scottish **accent**.',
  'b1-u21-exa-6': 'Online → download from our **website**.',
  'b1-u21-exa-7': 'Transmit live → **broadcast** the concert.',
  'b1-u21-exa-8': 'Portable phone → **mobile phone** out of battery.',

  'b1-u21-exb-1': 'Say a word → **pronounce** your surname.',
  'b1-u21-exb-2': 'Rude language → don\'t **swear**.',
  'b1-u21-exb-3': 'Enter text → **type** your password.',
  'b1-u21-exb-4': 'Too official → too **formal** for a friend.',
  'b1-u21-exb-5': 'News item → weather **report**.',
  'b1-u21-exb-6': 'Use a mouse → **click** the blue button.',

  'b1-u21-exc-1': 'Return a call → **call back** in ten minutes.',
  'b1-u21-exc-2': 'Be published → book **comes out** next month.',
  'b1-u21-exc-3': 'Connection lost → were **cut off**.',
  'b1-u21-exc-4': 'Complete a form → **fill in** your details.',
  'b1-u21-exc-5': 'End a call → don\'t **hang up** yet.',
  'b1-u21-exc-6': 'Sign out → **log off** after checking.',
  'b1-u21-exc-7': 'Sign in → **log on to** e-mail.',
  'b1-u21-exc-8': 'Make a paper copy → **print out** the tickets.',

  'b1-u21-exd-1': 'Radio medium → **on the radio**.',
  'b1-u21-exd-2': 'Television → **on TV** last night.',
  'b1-u21-exd-3': 'Method of sending → **by e-mail**.',
  'b1-u21-exd-4': 'News broadcast → **on the news**.',
  'b1-u21-exd-5': 'Online → **on the Internet**.',
  'b1-u21-exd-6': 'Busy talking → **on the phone**.',

  'b1-u21-exe-1': 'Comment **on** something.',
  'b1-u21-exe-2': 'Communicate **with** someone.',
  'b1-u21-exe-3': 'Glance **at** a message.',
  'b1-u21-exe-4': 'Receive **from** someone.',
  'b1-u21-exe-5': 'Reply **to** an e-mail.',
  'b1-u21-exe-6': 'Write **to** someone.',
  'b1-u21-exe-7': 'Translate **into** English.',
  'b1-u21-exe-8': 'Tell **about** something.',

  'b1-u21-exf-1': 'Adverb from CERTAIN → **certainly** call you.',
  'b1-u21-exf-2': 'Noun from COMMUNICATE → **communication**.',
  'b1-u21-exf-3': 'Noun from CONNECT → Internet **connection**.',
  'b1-u21-exf-4': 'Noun from DELIVER → **delivery** of the package.',
  'b1-u21-exf-5': 'Noun from EXPRESS → angry **expression**.',
  'b1-u21-exf-6': 'Adjective from INFORM → **informative** website.',
  'b1-u21-exf-7': 'Noun from PREDICT → weather **prediction**.',
  'b1-u21-exf-8': 'Adverb from SECRET → met **secretly**.',
  'b1-u21-exf-9': 'Person from SPEAK → main **speaker**.',
  'b1-u21-exf-10': 'Noun from TRANSLATE → this **translation**.',

  'b1-u21-exg-1': 'Driving now → **call back** later.',
  'b1-u21-exg-2': 'Be released → album will **come out**.',
  'b1-u21-exg-3': 'Found online → **on the Internet**.',
  'b1-u21-exg-4': 'Stop someone speaking → **interrupt**.',
  'b1-u21-exg-5': 'Complete a form → **fill in**.',
  'b1-u21-exg-6': 'Bad signal → were **cut off**.',

  'b1-u21-exh-1': 'Method → send photos **by e-mail**.',
  'b1-u21-exh-2': 'End a call → **hang** up.',
  'b1-u21-exh-3': 'News item → short **report** on TV.',
  'b1-u21-exh-4': 'Easy to hear → voice isn\'t very **clear**.',
  'b1-u21-exh-5': 'Make a copy → **print** out the worksheet.',
  'b1-u21-exh-6': 'Return a call → call you **back**.',
  'b1-u21-exh-7': 'Stop someone speaking → **interrupt** the speaker.',
  'b1-u21-exh-8': 'Sign out → log **off**.',

  'b1-u21-exj-1': 'Say again → **repeat** your address.',
  'b1-u21-exj-2': 'Speak more quietly → **lower** your voice.',
  'b1-u21-exj-3': 'Refused to give → **gave no** information.',
  'b1-u21-exj-4': 'Formal for give → **delivered** a speech.',
  'b1-u21-exj-5': 'Couldn\'t understand → **couldn\'t follow** his explanation.',
  'b1-u21-exj-6': 'Mentioned briefly → **referred to** the problem.',

  // ── Review 7 ────────────────────────────────────────────
  'b1-u7-exb-1': 'Be published → magazine **come out**.',
  'b1-u7-exb-2': 'Disconnect → cut the Internet **off**.',
  'b1-u7-exb-3': 'Return a call → call you **back**.',
  'b1-u7-exb-4': 'End a call → hung **up**.',
  'b1-u7-exb-5': 'Make a copy → print **out**.',
  'b1-u7-exb-6': 'Sign in → logged **onto** the website.',
  'b1-u7-exb-7': 'Complete a form → fill **in** your name.',
  'b1-u7-exb-8': 'Sign out → logged **off**.',

  'b1-u7-exc-1': 'Passive receive → **received an invitation from** Laura.',
  'b1-u7-exc-2': 'Not necessary → **don\'t have to** bring headphones.',
  'b1-u7-exc-3': 'Ability → Nina **can speak and understand** German.',
  'b1-u7-exc-4': 'Not necessary (past) → **didn\'t need** to print.',
  'b1-u7-exc-5': 'Possibility → message **might be** from our teacher.',

  'b1-u7-exd-1': 'Forbidden during test → **mustn\'t** use your phone.',
  'b1-u7-exd-2': 'Past ability → **could** ride a horse.',
  'b1-u7-exd-3': 'Free entrance → **don\'t have to** buy a ticket.',
  'b1-u7-exd-4': 'Music upstairs → he **must** be in his room.',
  'b1-u7-exd-5': 'Permission request → **May** I use your charger?',
  'b1-u7-exd-6': 'Law → cyclists **must** stop at red lights.',
  'b1-u7-exd-7': 'Hasn\'t eaten → she **must** be hungry.',
  'b1-u7-exd-8': 'Advice → **ought** to check your spelling.',
  'b1-u7-exd-9': 'Offer to help → I **can** translate for you.',
  'b1-u7-exd-10': 'Bad idea → **shouldn\'t** send angry messages.',

  'b1-u7-exe-1': 'Send a message → **send** a message.',
  'b1-u7-exe-2': 'Close an envelope → **sealed** the envelope.',
  'b1-u7-exe-3': 'Carry → **take** this parcel.',
  'b1-u7-exe-4': 'Past of send → **sent** him a voice message.',
  'b1-u7-exe-5': 'Past passive → package was **delivered** late.',
  'b1-u7-exe-6': 'Past of send → **sent** a quick text.',
  'b1-u7-exe-7': 'Make a copy → printed **out** the form.',
  'b1-u7-exe-8': 'Stay in contact → **get** in touch with.',
  'b1-u7-exe-9': 'Complete a form → **fill** in this application.',
  'b1-u7-exe-10': 'Keeping for you → **holding** a package.',
  'b1-u7-exe-11': 'Letter container → address on the **envelope**.',
  'b1-u7-exe-12': 'Work colleagues → forwarded to all her **colleagues**.'
};

const PASSAGE_EXPLANATIONS = {
  'b1-u7-ex-a': [
    'Noun from COMMUNICATE → good **communication**.',
    'Noun from TRANSLATE → a clear **translation**.',
    'Noun from EXPRESS → a word or **expression**.',
    'Person from SPEAK → a good **speaker**.',
    'Adjective from PREDICT → messages can be **unpredictable**.',
    'Noun from CONNECT → Internet **connection**.',
    'Noun from CERTAIN → with **certainty**.',
    'Noun from INFORM → share **information**.',
    'Adverb from SECRET → write **secretly** to each other.',
    'Adverb from CERTAIN → has **certainly** made communication faster.'
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

const files = ['Unit19.v2.json', 'Unit20.v2.json', 'Unit21.v2.json', 'Review7.v2.json'];
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
