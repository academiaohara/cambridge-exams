#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 9:
 * Unit25, Unit26, Unit27, Review9
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 25: So/such, too/enough ────────────────────────
  'b1-u25-exa-1': '**Such** + noun phrase → **such** a noisy restaurant.',
  'b1-u25-exa-2': '**So** + adjective → **so** sad that.',
  'b1-u25-exa-3': '**Such** + noun → **such** helpful neighbours.',
  'b1-u25-exa-4': '**So** + adverb → answered **so** quickly.',
  'b1-u25-exa-5': '**So many** + countable noun → **so** many mistakes.',
  'b1-u25-exa-6': '**Such** + noun → **such** an expensive hotel.',
  'b1-u25-exa-7': '**So little** + uncountable → **so** little patience.',
  'b1-u25-exa-8': '**Such** + noun phrase → **such** a lot of noise.',

  'b1-u25-exb-1': 'Too small → can\'t wear → **too** small.',
  'b1-u25-exb-2': 'Not long enough → **enough** to reach.',
  'b1-u25-exb-3': 'Not enough plates → **enough** plates.',
  'b1-u25-exb-4': 'Can\'t keep up → walking **too** quickly.',
  'b1-u25-exb-5': 'Not clearly enough → **enough** (at the end).',
  'b1-u25-exb-6': 'Excessive → **too** many adverts.',
  'b1-u25-exb-7': 'Sufficient → quiet **enough** to study.',
  'b1-u25-exb-8': 'Too early to enter → **too** early.',

  'b1-u25-exc-1': '**So** + adjective → **so** loud that.',
  'b1-u25-exc-2': 'Excessive price → **too** expensive.',
  'b1-u25-exc-3': '**Such** + noun → **such** a strange dream.',
  'b1-u25-exc-4': 'Sufficient warmth → warm **enough**.',
  'b1-u25-exc-5': 'Countable → **so many** people.',
  'b1-u25-exc-6': '**Such** + noun → **such** a busy day.',
  'b1-u25-exc-7': 'Excessive speed → **too** fast.',
  'b1-u25-exc-8': 'Sufficient effort → hard **enough**.',

  'b1-u25-exd-1': 'Too full → **was too full to** close.',
  'b1-u25-exd-2': '**So** popular → **so popular that** tickets sold out.',
  'b1-u25-exd-3': 'Not wide enough → **is too narrow** for two buses.',
  'b1-u25-exd-4': '**Such** + noun → **such a cold morning that**.',
  'b1-u25-exd-5': 'Not loud enough → speaks **too quietly for** everyone.',
  'b1-u25-exd-6': '**So much** rain → **so much rain that**.',

  'b1-u25-exe-1': 'Before a noun → **such** a beautiful painting.',
  'b1-u25-exe-2': 'Adjective before **enough** → **strong enough**.',
  'b1-u25-exe-3': 'Many people → **so many** (not **such many**).',
  'b1-u25-exe-4': 'Excessive difficulty → **too difficult**.',
  'b1-u25-exe-5': 'Adverb before **enough** → **well enough**.',
  'b1-u25-exe-6': '**Enough** before noun → **enough space**.',

  'b1-u25-exf-1': 'Can\'t fit → **too** big.',
  'b1-u25-exf-2': '**Such** + noun → **such** a funny joke.',
  'b1-u25-exf-3': 'Insufficient practice → **enough**.',
  'b1-u25-exf-4': '**So** + adjective → **so** expensive that.',
  'b1-u25-exf-5': 'Too quiet to hear → **too** quietly.',
  'b1-u25-exf-6': '**So much** fog → **so** much fog.',

  'b1-u25-exg-1': 'Adjective → **so** easy (not **such**).',
  'b1-u25-exg-2': '**Such** + noun → **such** a delicious meal.',
  'b1-u25-exg-3': 'Need more → **enough** money (not **too**).',
  'b1-u25-exg-4': 'Excessive heat → **too** hot to drink.',
  'b1-u25-exg-5': 'Adjective + **enough** → **old enough**.',
  'b1-u25-exg-6': 'Uncountable → **so much** homework.',
  'b1-u25-exg-7': 'Need **to** → **for us to understand**.',
  'b1-u25-exg-8': 'Adjective → **so** windy (not **such**).',

  'b1-u25-exh-1': '**So** + adjective → **so interesting that**.',
  'b1-u25-exh-2': 'Too heavy → **too heavy for me** to move.',
  'b1-u25-exh-3': '**Such** + noun → **such a useful lesson that**.',
  'b1-u25-exh-4': 'Not sufficient → **experienced enough**.',
  'b1-u25-exh-5': '**So many** questions → **so many questions that**.',
  'b1-u25-exh-6': 'Too small → **too small for us** to sit.',

  // ── Unit 26: Comparatives & superlatives ────────────────
  'b1-u26-exa-1': 'Long adjective → **more comfortable** than.',
  'b1-u26-exa-2': 'Short adjective → **younger** than.',
  'b1-u26-exa-3': 'Short adjective → **slower** than.',
  'b1-u26-exa-4': 'Short adjective → **colder** than.',
  'b1-u26-exa-5': 'Long adjective → **more boring** than.',
  'b1-u26-exa-6': 'Irregular → **better** than.',
  'b1-u26-exa-7': 'Irregular → **worse** than.',
  'b1-u26-exa-8': 'Distance → **farther** away.',

  'b1-u26-exb-1': 'Superlative → **the quietest** place.',
  'b1-u26-exb-2': 'Superlative → **the oldest** person.',
  'b1-u26-exb-3': 'Long adjective → **the most amazing**.',
  'b1-u26-exb-4': 'Superlative → **the busiest** day.',
  'b1-u26-exb-5': 'Irregular → **the best** student.',
  'b1-u26-exb-6': 'Irregular → **the worst** hotel.',
  'b1-u26-exb-7': 'Superlative → **the cheapest** option.',
  'b1-u26-exb-8': 'Superlative → **the strangest** dream.',

  'b1-u26-exc-1': 'Adverb comparative → **more gracefully** than.',
  'b1-u26-exc-2': 'Superlative adverb → **the fastest**.',
  'b1-u26-exc-3': 'Adverb → **more carefully** than.',
  'b1-u26-exc-4': 'Superlative → **the latest**.',
  'b1-u26-exc-5': 'Irregular → **worse**.',
  'b1-u26-exc-6': 'Superlative adverb → **the best**.',
  'b1-u26-exc-7': 'Comparative adverb → **more slowly**.',
  'b1-u26-exc-8': 'Comparative adverb → **more quickly** than.',

  'b1-u26-exd-1': 'Long adjective → **more difficult** than.',
  'b1-u26-exd-2': 'Superlative → **the longest** river.',
  'b1-u26-exd-3': 'Comparative → **clearer** than.',
  'b1-u26-exd-4': 'Superlative → **the wettest** day.',
  'b1-u26-exd-5': 'Comparative → **less expensive** than.',
  'b1-u26-exd-6': 'Comparative adverb → **more carefully** than.',
  'b1-u26-exd-7': 'Superlative → **the funniest** student.',
  'b1-u26-exd-8': 'Superlative → **the least helpful**.',

  'b1-u26-exe-1': 'Long adjective → **more boring** (not **boringer**).',
  'b1-u26-exe-2': 'Superlative → **the best** (not **better**).',
  'b1-u26-exe-3': 'Double consonant → **bigger**.',
  'b1-u26-exe-4': 'Comparative adverb → **more carefully**.',
  'b1-u26-exe-5': 'Irregular superlative → **the best**.',
  'b1-u26-exe-6': 'Irregular → **later** (not **more late**).',
  'b1-u26-exe-7': 'Superlative adverb → **the best**.',
  'b1-u26-exe-8': '**-y** ending → **windiest**.',

  'b1-u26-exf-1': 'Opposite of easier → **is more difficult than**.',
  'b1-u26-exf-2': 'Superlative → **speaks the most clearly**.',
  'b1-u26-exf-3': 'Comparative → **is more comfortable than**.',
  'b1-u26-exf-4': 'Comparative → **stronger than** any other.',
  'b1-u26-exf-5': 'Opposite of least useful → **the most useless**.',
  'b1-u26-exf-6': 'Equal comparison → **as carefully as** me.',

  'b1-u26-exg-1': 'Short adjective → **softer** (not **more soft**).',
  'b1-u26-exg-2': 'Superlative → **youngest** (not **most young**).',
  'b1-u26-exg-3': 'Short adjective → **faster**.',
  'b1-u26-exg-4': 'Irregular adverb → **better** (not **more well**).',
  'b1-u26-exg-5': 'Irregular superlative → **worst**.',
  'b1-u26-exg-6': 'Short adjective → **warmer**.',
  'b1-u26-exg-7': 'Short adjective → **shorter**.',
  'b1-u26-exg-8': '**-y** ending → **foggiest**.',

  // ── Unit 27: Work & employment ────────────────────────────
  'b1-u27-exa-1': 'Extra hours → work **overtime**.',
  'b1-u27-exa-2': 'Legal agreement → read the **contract**.',
  'b1-u27-exa-3': 'Higher position → got a **promotion**.',
  'b1-u27-exa-4': 'Job meeting → **interview** at ten.',
  'b1-u27-exa-5': 'Degree/certificate → university **qualification**.',
  'b1-u27-exa-6': 'No job → been **unemployed**.',
  'b1-u27-exa-7': 'Workers → members of **staff**.',
  'b1-u27-exa-8': 'Annual pay → **salary** increased.',

  'b1-u27-exb-1': 'Works for himself → **self-employed**.',
  'b1-u27-exb-2': 'Hire workers → **take on** more workers.',
  'b1-u27-exb-3': 'Summer only → **temporary** job.',
  'b1-u27-exb-4': 'Money paid → good **wages**.',
  'b1-u27-exb-5': 'Company → small **firm**.',
  'b1-u27-exb-6': 'Previous work → **experience** needed.',

  'b1-u27-exc-1': 'Start a business → **set up** a company.',
  'b1-u27-exc-2': 'Complete a form → **fill in** the form.',
  'b1-u27-exc-3': 'Stop trying → didn\'t **give up** her dream.',
  'b1-u27-exc-4': 'Request a job → **apply for** a job.',
  'b1-u27-exc-5': 'Submit work → **hand in** projects.',
  'b1-u27-exc-6': 'Do research → **carry out** research.',
  'b1-u27-exc-7': 'Hire → **take on** assistants.',
  'b1-u27-exc-8': 'Search for → **looking for** work.',

  'b1-u27-exd-1': 'Punctual → arrive **on time**.',
  'b1-u27-exd-2': 'No job → **out of work**.',
  'b1-u27-exd-3': 'At the workplace → **at work**.',
  'b1-u27-exd-4': 'In control → **in charge of** the team.',
  'b1-u27-exd-5': 'Working shift → **on duty**.',
  'b1-u27-exd-6': 'In a meeting → **at a meeting**.',

  'b1-u27-exe-1': 'Responsible **for** employees.',
  'b1-u27-exe-2': 'Experienced **in** organising events.',
  'b1-u27-exe-3': 'Interested **in** working abroad.',
  'b1-u27-exe-4': 'Good **at** solving problems.',
  'b1-u27-exe-5': 'Applied **for** a job.',
  'b1-u27-exe-6': 'Go **on** strike.',
  'b1-u27-exe-7': 'Earn a living **by** repairing.',
  'b1-u27-exe-8': '**For** the first time.',

  'b1-u27-exf-1': 'Noun from EMPLOY → **employment**.',
  'b1-u27-exf-2': 'Adjective from QUALIFY → **qualified** nurses.',
  'b1-u27-exf-3': 'Noun from MANAGE → good **management**.',
  'b1-u27-exf-4': 'Noun from PAY → final **payment**.',
  'b1-u27-exf-5': 'Adverb from PROFESSION → **professionally**.',
  'b1-u27-exf-6': 'Noun from RETIRE → enjoying **retirement**.',
  'b1-u27-exf-7': 'Adjective from SKILL → **skilled** workers.',
  'b1-u27-exf-8': 'Negative from EMPLOY → **unemployed** adults.',

  'b1-u27-exg-1': 'Person who works for a company → **employee**.',
  'b1-u27-exg-2': 'Regular earnings → **income**.',
  'b1-u27-exg-3': 'Short-term → **temporary** position.',
  'b1-u27-exg-4': 'Extra hours → work **overtime**.',
  'b1-u27-exg-5': 'Start a business → **set up**.',
  'b1-u27-exg-6': 'Work partner → **colleague**.',

  'b1-u27-exh-1': 'Submit → hand **in** your application.',
  'b1-u27-exh-2': 'No job → out of **work**.',
  'b1-u27-exh-3': 'Search for → looking **for** a receptionist.',
  'b1-u27-exh-4': 'Legal document → read the **contract**.',
  'b1-u27-exh-5': 'In control → in **charge** of training.',
  'b1-u27-exh-6': 'Sector → tourist **industry**.',
  'b1-u27-exh-7': 'Start → set **up** a business.',
  'b1-u27-exh-8': 'Certificates → several **qualifications**.',

  // ── Review 9 ────────────────────────────────────────────
  'b1-u9-exa-1': 'Person from ASSIST → shop **assistant**.',
  'b1-u9-exa-2': 'Adjective from SUCCESS → very **successful**.',
  'b1-u9-exa-3': 'Past tense of SAVE → **saved** the project.',
  'b1-u9-exa-4': 'Negative from BOSS → never **bossy**.',
  'b1-u9-exa-5': 'Plural from EMPLOY → **employees**.',
  'b1-u9-exa-6': 'Noun from OCCUPY → demanding **occupation**.',
  'b1-u9-exa-7': 'Adjective from OFFICE → **official** announcement.',
  'b1-u9-exa-8': 'Noun from RETIRE → reached **retirement**.',
  'b1-u9-exa-9': 'Adjective from FAME → became **famous**.',
  'b1-u9-exa-10': 'Past participle from RETIRE → she\'s **retired**.',

  'b1-u9-exb-1': 'Responsible **for** → **for training** new staff.',
  'b1-u9-exb-2': 'Inform **about** → **about** the timetable change.',
  'b1-u9-exb-3': 'Fed up **with** → **with** his job.',
  'b1-u9-exb-4': 'Depends **on** → **on** qualifications.',
  'b1-u9-exb-5': 'Work **as** → **as** a photographer.',
  'b1-u9-exb-6': 'Referred **to** → **to** the old manager.',
  'b1-u9-exb-7': 'Kind **of** → **of** coach.',
  'b1-u9-exb-8': 'Apply **for** → **for** a position.',

  'b1-u9-exc-1': '**So** noisy → **too noisy for** me to study.',
  'b1-u9-exc-2': 'Can\'t sleep early → **stay up** late.',
  'b1-u9-exc-3': 'Too inexperienced → isn\'t **experienced enough**.',
  'b1-u9-exc-4': 'Cancelled → **called off** the interview.',

  'b1-u9-exd-1': '**So** + adjective → **so** confusing that.',
  'b1-u9-exd-2': '**Such** + noun → **such** a busy morning.',
  'b1-u9-exd-3': 'Not sufficient → confident **enough**.',
  'b1-u9-exd-4': 'Excessive size → **too** small.',
  'b1-u9-exd-5': 'Short adverb → works **harder**.',
  'b1-u9-exd-6': 'Superlative → **the most** difficult.',
  'b1-u9-exd-7': 'Comparative → much **more reliable**.',
  'b1-u9-exd-8': 'Comparative → **more** experience.',
  'b1-u9-exd-9': 'Excessive nervousness → **too** nervous to speak.',
  'b1-u9-exd-10': '**Such** + uncountable noun → **such** useful advice.',
  'b1-u9-exd-11': 'Progress → **better / better**.',
  'b1-u9-exd-12': 'Not sufficient → practical **enough**.',
  'b1-u9-exd-13': '**Such** + noun → **such** a long interview.',
  'b1-u9-exd-14': 'Comparative → **more confident** than.',

  'b1-u9-exe-1': 'Apply **for** a job.',
  'b1-u9-exe-2': 'Higher position → **promotion**.',
  'b1-u9-exe-3': 'Leave a job → **quit**.',
  'b1-u9-exe-4': 'Job meeting → **interview**.',
  'b1-u9-exe-5': 'Long shifts → work long **hours**.',
  'b1-u9-exe-6': 'Pay → higher **salary**.',
  'b1-u9-exe-7': 'Not on time → **late** for meetings.',
  'b1-u9-exe-8': 'Works for herself → **herself**.',
  'b1-u9-exe-9': 'Hire → **take** on more waiters.',
  'b1-u9-exe-10': 'Deal with → **handle** pressure.',
  'b1-u9-exe-11': 'Revised → **updated** her CV.',
  'b1-u9-exe-12': 'Job cut → made **redundant**.',
  'b1-u9-exe-13': 'Make a change → **make** a career change.',
  'b1-u9-exe-14': 'Productive → very **efficient**.'
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

const files = ['Unit25.v2.json', 'Unit26.v2.json', 'Unit27.v2.json', 'Review9.v2.json'];
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
