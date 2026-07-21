#!/usr/bin/env node
/**
 * Apply personalized English explanations to C1 Block 1: Review1 & Unit2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/C1');

const PASSAGE_EXPLANATIONS = {
  'c1-u2-ex-j': [
    'Decided → made up my **mind**.',
    'Considered → took into **account**.',
    'Wrong belief → under the **misapprehension**.',
    'After reflection → in **conclusion**.',
    'Positive side → on the bright **side**.',
    'Overall → on **balance**.'
  ],
  'c1-u2-ex-o': [
    'Noun from CONCEIVE → **conception** of critical thinking.',
    'Noun from ASSUME → **assumption** that intelligence is fixed.',
    'Adverb from DOUBT → **undoubtedly** true.',
    'Noun from CONFUSE → **confusion** surrounding techniques.',
    'Adjective from BELIEVE → **unbelievable** impression of learning.',
    'Negative adjective CONVINCE → feel **unconvinced**.',
    'Adjective from DECIDE → **decisive** learner.',
    'Adjective from EXPLAIN → seem **inexplicable**.',
    'Adjective from IMAGINE → **imaginative** approach.',
    'Adjective from DEFINE → most **definitive** measure.'
  ]
};

const EXPLANATIONS = {
  // ── Review1: Unit 1 ─────────────────────────────────────
  'c1-u1-exa-1': 'DOUBT + CONVINCE → **doubtful**, **convincing** evidence.',
  'c1-u1-exa-2': 'EXPLAIN + IMAGINE → clear **explanation**, **imaginative**.',
  'c1-u1-exa-3': 'ASSUME + DECIDE → **assumption**, **decisive** action.',
  'c1-u1-exa-4': 'CONFUSE + BELIEVE → initial **confusion**, deep **belief**.',
  'c1-u1-exa-5': 'CONCEIVE + BRILLIANT → **inconceivable**, such **brilliance**.',

  'c1-u1-exb-1': 'Since 2020, still ongoing → **has been using its new curriculum since**.',
  'c1-u1-exb-2': 'Phrasal verb → **come up with a plan to deal**.',
  'c1-u1-exb-3': 'Annoying habit → **is always talking over people**.',
  'c1-u1-exb-4': 'Just + present perfect → **has just reached its** conclusion.',
  'c1-u1-exb-5': 'Yet in perfect → **not yet managed to figure out**.',
  'c1-u1-exb-6': 'Duration → **has been mulling over her decision**.',
  'c1-u1-exb-7': 'First time structure → **the first time I have** come across.',
  'c1-u1-exb-8': 'Decided → **has already made up her mind about**.',

  'c1-u1-exc-1': 'Stay alert → have your **wits** about you.',
  'c1-u1-exc-2': 'Uninformed → in the **dark** about plans.',
  'c1-u1-exc-3': 'Deduced → **put** two and two together.',
  'c1-u1-exc-4': 'Learns fast → quick on the **uptake**.',
  'c1-u1-exc-5': 'Sounds familiar → doesn\'t **ring** a bell.',
  'c1-u1-exc-6': 'Drive crazy → round the **bend**.',
  'c1-u1-exc-7': 'Evaluate → **take** stock of progress.',
  'c1-u1-exc-8': 'Minor details → **splitting** hairs.',

  'c1-u1-exd-1': 'Revise rusty skills → **brush** up on French.',
  'c1-u1-exd-2': 'Eventually accept → **come** round to the idea.',
  'c1-u1-exd-3': 'Reconstruct events → **piece** together what happened.',
  'c1-u1-exd-4': 'Discover by chance → **hit** upon the perfect title.',
  'c1-u1-exd-5': 'Absorb information → a lot to **take** in.',
  'c1-u1-exd-6': 'Think carefully → **mull** over the offer.',
  'c1-u1-exd-7': 'Solve → **figure** out how it worked.',
  'c1-u1-exd-8': 'Consider fully → **think** it through carefully.',

  'c1-u1-exe-1': 'Gut feeling → detective had a **hunch**.',
  'c1-u1-exe-2': 'Evaluate risks → carefully **assess** the risks.',
  'c1-u1-exe-3': 'Doubting methodology → remained **sceptical**.',
  'c1-u1-exe-4': 'Clever solution → an **ingenious** solution.',
  'c1-u1-exe-5': 'Think back → **reflect** on what she had learned.',
  'c1-u1-exe-6': 'Careful and thorough → most **conscientious** student.',
  'c1-u1-exe-7': 'Difficult choice → faced a **dilemma**.',
  'c1-u1-exe-8': 'Logical conclusion → able to **deduce** the decision.',

  // ── Unit 2: A – word choice ─────────────────────────────
  'c1-u2-exa-1': 'Too negative about chances → **pessimistic**.',
  'c1-u2-exa-2': 'One-sided documentary → clearly **biased**.',
  'c1-u2-exa-3': 'Distrusts politicians → rather **cynical**.',
  'c1-u2-exa-4': 'Unrealistic belief → slightly **naïve**.',
  'c1-u2-exa-5': 'Clever idea → an **ingenious** solution.',
  'c1-u2-exa-6': 'Confused students → completely **baffled** them.',
  'c1-u2-exa-7': 'Evaluate impact → difficult to **assess**.',
  'c1-u2-exa-8': 'Defend spending → **justify** spending so much.',
  'c1-u2-exa-9': 'Rough calculation → would **estimate** around a hundred.',
  'c1-u2-exa-10': 'Assume wrongly → don\'t **presume** everyone agrees.',

  // ── Unit 2: B – word bank ───────────────────────────────
  'c1-u2-exb-1': 'Understand fully → **grasp** the implications.',
  'c1-u2-exb-2': 'Still deciding → still **deliberating**.',
  'c1-u2-exb-3': 'Infer → **gather** from what he said.',
  'c1-u2-exb-4': 'Focus → **concentrate** with distractions.',
  'c1-u2-exb-5': 'Thinking about changing → **considering** changing course.',
  'c1-u2-exb-6': 'Estimate time → how long do you **reckon**.',
  'c1-u2-exb-7': 'Don\'t think → don\'t **suppose** there\'s any point.',
  'c1-u2-exb-8': 'Thought long → **pondering** whether to accept.',
  'c1-u2-exb-9': 'Refuse to accept → refuse to **contemplate** failure.',

  // ── Unit 2: C – error correction ────────────────────────
  'c1-u2-exc-1': 'Creative spark → no **inspiration** for her novel.',
  'c1-u2-exc-2': 'Gut feeling → strong **hunch** about the offer.',
  'c1-u2-exc-3': 'No evidence → rely on **guesswork**.',
  'c1-u2-exc-4': 'Natural talent → natural **genius**.',
  'c1-u2-exc-5': 'Difficult choice → real **dilemma**.',
  'c1-u2-exc-6': 'Set of beliefs → political **ideology**.',
  'c1-u2-exc-7': 'Trust → absolute **faith** in her students.',
  'c1-u2-exc-8': 'Contradiction → fascinating **paradox**.',
  'c1-u2-exc-9': 'Vague sense → had a **notion** that support was needed.',
  'c1-u2-exc-10': 'Gut instinct → trusted her **intuition**.',
  'c1-u2-exc-11': 'Rough plan → based on the **idea** that demand would grow.',

  // ── Unit 2: D – passage MC ──────────────────────────────
  'c1-u2-exd-1': 'School programme → national **curriculum**.',
  'c1-u2-exd-2': 'Evaluate critically → **assess** information.',
  'c1-u2-exd-3': 'Last-minute study → **cramming** for exams.',
  'c1-u2-exd-4': 'Deep thinkers → **intellectual** thinkers.',
  'c1-u2-exd-5': 'Independent work → struggle with **self-study**.',
  'c1-u2-exd-6': 'Academic dishonesty → **plagiarising**.',
  'c1-u2-exd-7': 'Claim → supporters **argue** that.',
  'c1-u2-exd-8': 'Foundation → equal **basis** on which to build.',
  'c1-u2-exd-9': 'Lacking knowledge → **ignorant** of basic skills.',
  'c1-u2-exd-10': 'Believable solution → most **plausible** solution.',

  // ── Unit 2: E – column matching ─────────────────────────
  'c1-u2-exe-1': 'Revise → brush **up** on statistics.',
  'c1-u2-exe-2': 'Accept idea → come **round** to the idea.',
  'c1-u2-exe-3': 'Accept reality → face **up** to the fact.',
  'c1-u2-exe-4': 'Hear clearly → make **out** what the lecturer said.',
  'c1-u2-exe-5': 'Solve slowly → puzzle **out** the answer.',
  'c1-u2-exe-6': 'Study topic → reading **up** on the Renaissance.',
  'c1-u2-exe-7': 'Invent → come **up** with a better argument.',

  // ── Unit 2: F – phrasal gaps ────────────────────────────
  'c1-u2-exf-1': 'Study topic → read **up** on art.',
  'c1-u2-exf-2': 'Persuade → brought me **round** to the idea.',
  'c1-u2-exf-3': 'Understand → **figure** out why.',
  'c1-u2-exf-4': 'Revise → brush **up** on French.',
  'c1-u2-exf-5': 'Invent → thought **up** a plan.',
  'c1-u2-exf-6': 'Solve → puzzled **out** how to solve it.',
  'c1-u2-exf-7': 'Consider → mull **over** your proposal.',
  'c1-u2-exf-8': 'Accept → face **up** to the fact.',
  'c1-u2-exf-9': 'Cram → swotted **up** on vocabulary.',

  // ── Unit 2: G – phrasal verb YES/NO ─────────────────────
  'c1-u2-exg-1': 'Work out = solve → **YES**.',
  'c1-u2-exg-2': 'Pour out ≠ work out → **NO**.',
  'c1-u2-exg-3': 'Check out = investigate → **YES**.',
  'c1-u2-exg-4': 'Ferret out = discover → **YES**.',
  'c1-u2-exg-5': 'Run out = be exhausted → **NO** (battery died).',
  'c1-u2-exg-6': 'Fathom out = understand → **YES**.',
  'c1-u2-exg-7': 'Drown out = make inaudible → **NO**.',
  'c1-u2-exg-8': 'Sound out = ask tentatively → **YES**.',
  'c1-u2-exg-9': 'Stand out = be noticeable → **NO** (different meaning).',
  'c1-u2-exg-10': 'Seek out = search for → **YES**.',

  // ── Unit 2: H – preposition gaps ────────────────────────
  'c1-u2-exh-1': 'Wrong idea → under the misapprehension.',
  'c1-u2-exh-2': 'Question → cast doubt **on** effectiveness.',
  'c1-u2-exh-3': 'Not focused → out **of** focus.',
  'c1-u2-exh-4': 'Be optimistic → look **on** the positive side.',
  'c1-u2-exh-5': 'In principle → opposed **in** principle.',
  'c1-u2-exh-6': 'Connect with memory → associate smell **with** visits.',
  'c1-u2-exh-7': 'Remember → bear **in** mind.',
  'c1-u2-exh-8': 'Trust in → belief **in** the power of education.',
  'c1-u2-exh-9': 'Impossible → out **of** the question.',
  'c1-u2-exh-10': 'See differently → put into **perspective**.',
  'c1-u2-exh-11': 'Opinion → point **of** view.',
  'c1-u2-exh-12': 'Condition → on the basis **on** which.',
  'c1-u2-exh-13': 'Overall → **On** balance.',
  'c1-u2-exh-14': 'Consider → taken into **account**.',
  'c1-u2-exh-15': 'Finally → **In** conclusion.',

  // ── Unit 2: I – synced gap fill ─────────────────────────
  'c1-u2-exi-1': 'All three need **focus** — concentration, marketing focus, out of focus.',
  'c1-u2-exi-2': 'All three need **mind** — would you mind, make up her mind, bear in mind.',
  'c1-u2-exi-3': 'All three need **view** — point of view, change his view, better view.',
  'c1-u2-exi-4': 'All three need **sense** — make sense, makes sense, sense of humour.',
  'c1-u2-exi-5': 'All three need **conclusion** — came to the conclusion, jump to conclusions, In conclusion.',
  'c1-u2-exi-6': 'All three need **doubt** — no doubt, beyond doubt, serious doubts.',
  'c1-u2-exi-7': 'All three need **account** — give an account, take into account, first-hand account.',

  // ── Unit 2: K – keyword transformation ──────────────────
  'c1-u2-exk-1': 'Crossed her mind → **never occurred to** her.',
  'c1-u2-exk-2': 'Decided → came **to the conclusion that**.',
  'c1-u2-exk-3': 'Explained in detail → **gave a full account of**.',
  'c1-u2-exk-4': 'False belief → **gave a false impression that**.',
  'c1-u2-exk-5': 'Equal amounts → **strike a balance between**.',
  'c1-u2-exk-6': 'So as not to upset → **out of consideration for**.',
  'c1-u2-exk-7': 'Devoted for years → **has spent years learning**.',
  'c1-u2-exk-8': 'Said warningly → **warned us that**.',

  // ── Unit 2: L – idioms word bank ────────────────────────
  'c1-u2-exl-1': 'Sounds familiar → rings a **bell**.',
  'c1-u2-exl-2': 'Minor details → splitting **hairs**.',
  'c1-u2-exl-3': 'Current gossip → knows what\'s **what**.',
  'c1-u2-exl-4': 'Stay alert → all your **wits** about you.',
  'c1-u2-exl-5': 'Become arrogant → go to your **head**.',
  'c1-u2-exl-6': 'Deduced → put two and **two** together.',
  'c1-u2-exl-7': 'Drive crazy → round the **bend**.',
  'c1-u2-exl-8': 'Evaluate → take **stock** of where we are.',
  'c1-u2-exl-9': 'Uninformed → in the **dark** about changes.',
  'c1-u2-exl-10': 'Miss the main point → see the wood for the trees.',
  'c1-u2-exl-11': 'Learns quickly → quick on the **uptake**.',
  'c1-u2-exl-12': 'No support → no **leg** to stand on.',

  // ── Unit 2: M – word formation ──────────────────────────
  'c1-u2-exm-1': 'Noun from CONFUSE → considerable **confusion**.',
  'c1-u2-exm-2': 'Noun from CONVINCE → spoke with **conviction**.',
  'c1-u2-exm-3': 'Negative BELIEVE → stood in **disbelief**.',
  'c1-u2-exm-4': 'Noun from CONCEIVE → **conception** of the university.',
  'c1-u2-exm-5': 'Noun from ASSUME → underlying **assumption**.',
  'c1-u2-exm-6': 'Noun from BRILLIANT → his **brilliance** as a mathematician.',
  'c1-u2-exm-7': 'Negative EXPLAIN → completely **inexplicable**.',
  'c1-u2-exm-8': 'Negative SANE → reason of **insanity**.',
  'c1-u2-exm-9': 'Noun from IMAGINE → her **imagination** knew no limits.',
  'c1-u2-exm-10': 'Negative LOGIC → completely **illogical** to commute.',

  // ── Unit 2: N – prefix YES/NO ───────────────────────────
  'c1-u2-exn-1': 'Illegible = unreadable → **YES**.',
  'c1-u2-exn-2': 'Illustrations ≠ illegible → **NO**.',
  'c1-u2-exn-3': 'Illegal = against the law → **YES**.',
  'c1-u2-exn-4': 'Illustrious ≠ illegal → **NO**.',
  'c1-u2-exn-5': 'Illiberal = restricting freedoms → **YES**.',
  'c1-u2-exn-6': 'Illegality = unlawfulness → **YES**.',
  'c1-u2-exn-7': 'Illusion ≠ illegality → **NO**.',
  'c1-u2-exn-8': 'Illuminating ≠ illegitimate → **NO**.',
  'c1-u2-exn-9': 'Illegitimate = not valid → **YES**.'
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

const files = ['Review1.v2.json', 'Unit2.v2.json'];
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
