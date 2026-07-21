#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 3:
 * Unit7, Unit8, Unit9, Review3
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 7: Future forms ────────────────────────────────
  'b1-u7-exa-1': 'A fixed arrangement → present continuous **are meeting** (not **will meet**).',
  'b1-u7-exa-2': 'Evidence-based prediction → **is going to rain** with keyword **GOING**.',
  'b1-u7-exa-3': 'A promise → **will help** with keyword **WILL**.',
  'b1-u7-exa-4': 'A decision already made → **are moving** with keyword **MOVING**.',
  'b1-u7-exa-5': 'An intention → **is going to learn** with keyword **GOING**.',
  'b1-u7-exa-6': 'Offering help → **Shall I** carry your bags?',

  'b1-u7-exb-1': 'A prediction about the weather → **will rain**.',
  'b1-u7-exb-2': 'A promise to help → **will help**.',
  'b1-u7-exb-3': 'A future request → **Will you call** me?',
  'b1-u7-exb-4': 'A decision about next year → **will move**.',
  'b1-u7-exb-5': 'A suggestion → **Shall we wait** outside?',
  'b1-u7-exb-6': 'A prediction about tomorrow → **will show**.',
  'b1-u7-exb-7': 'Ordering food politely → **will buy** a sandwich.',
  'b1-u7-exb-8': 'A promise they will be there → **will meet** us.',

  'b1-u7-exc-1': 'A plan for university → **\'m going to study**.',
  'b1-u7-exc-2': 'A plan for this weekend → **are going to paint**.',
  'b1-u7-exc-3': 'Question about a plan → **Is Ben going to apply**?',
  'b1-u7-exc-4': 'Negative plan → **aren\'t going to stay** at home.',
  'b1-u7-exc-5': 'You can see the books falling → **\'re going to drop**.',
  'b1-u7-exc-6': 'A decision about next month → **\'m going to start**.',
  'b1-u7-exc-7': 'Question about July plans → **Are they going to visit**?',
  'b1-u7-exc-8': 'Dad\'s plan not to drive → **isn\'t going to drive**.',

  'b1-u7-exe-1': 'A general prediction → **will become** (not a fixed arrangement).',
  'b1-u7-exe-2': 'A fixed arrangement today → **are meeting** our teacher.',
  'b1-u7-exe-3': 'A decision about tonight\'s clothes → **are you going to wear**?',
  'b1-u7-exe-4': 'A polite offer of help → **Will you help** (not **Shall you**).',
  'b1-u7-exe-5': 'A plan to study medicine → **is going to study**.',
  'b1-u7-exe-6': 'A scheduled test → **are having** a science test tomorrow.',
  'b1-u7-exe-7': 'A confident prediction → **will enjoy** the concert.',
  'b1-u7-exe-8': 'A travel arrangement → **Are they travelling** to Italy?',
  'b1-u7-exe-9': 'An opinion about the result → **will win**.',
  'b1-u7-exe-10': 'A spontaneous offer → **will speak** to the teacher.',

  'b1-u7-exf-1': 'A holiday already arranged → **We\'re going** to Greece.',
  'b1-u7-exf-2': 'A spontaneous decision to help → **I\'ll help** you.',
  'b1-u7-exf-3': 'An instant decision → **I\'ll give** it to you.',
  'b1-u7-exf-4': 'A plan for next year → **I\'m going to take** a course.',
  'b1-u7-exf-5': 'A prediction about Mia → **she\'ll win** the race.',
  'b1-u7-exf-6': 'Dark clouds = evidence → **it\'s going to snow**.',

  // ── Unit 8: Prepositions of time and place ──────────────
  'b1-u8-exa-1': 'Years use **in**, not **at** → born **in** 2012.',
  'b1-u8-exa-2': 'Parts of a day use **on** → **on** Friday afternoon.',
  'b1-u8-exa-3': 'Clock times use **at** → starts **at** half past eight.',
  'b1-u8-exa-4': 'Months use **in**, not **on** → **in** August.',
  'b1-u8-exa-5': 'Days use **on**, not **at** → **on** Sunday.',
  'b1-u8-exa-6': 'Parts of the day use **in** → **in** the evening.',
  'b1-u8-exa-7': 'Festivals like Christmas use **at** → **at** Christmas.',
  'b1-u8-exa-8': 'Dates use **on** → **on** 18th March.',

  'b1-u8-exb-1': 'A specific place/event → fans **at** the stadium.',
  'b1-u8-exb-2': 'Addresses use **at** → **at** 25 King Street.',
  'b1-u8-exb-3': 'Cities use **in** → stayed **in** Madrid.',
  'b1-u8-exb-4': 'Large areas/regions use **in** → **in** very cold parts.',
  'b1-u8-exb-5': 'Surfaces use **on** → painting **on** the wall.',
  'b1-u8-exb-6': 'Inside a book/notebook → message **in** my notebook.',
  'b1-u8-exb-7': 'Islands and countries can use **on** → holiday **on** Malta.',
  'b1-u8-exb-8': 'Surfaces use **on** → volleyball **on** the beach.',

  'b1-u8-exc-1': 'Seasons use **in** → **in** spring.',
  'b1-u8-exc-2': 'At an event → **at** a football match.',
  'b1-u8-exc-3': 'Inside water → fish **in** the river.',
  'b1-u8-exc-4': 'Page numbers use **on** → **on** page 38.',
  'b1-u8-exc-5': 'Position inside a space → **in** the middle of the room.',
  'b1-u8-exc-6': 'On an island → staying **on** a small island.',
  'b1-u8-exc-7': 'On top of a surface → snow **on** the top of the hill.',
  'b1-u8-exc-8': 'At an event → **at** a meeting.',

  'b1-u8-exd-1': 'Direction towards a place → move **to** Canada.',
  'b1-u8-exd-2': 'Go **to** the cinema = direction towards.',
  'b1-u8-exd-3': 'At a specific building → stayed **at** a hotel.',
  'b1-u8-exd-4': 'At a specific point → wait **at** the entrance.',
  'b1-u8-exd-5': 'Come **to** my flat = direction towards.',
  'b1-u8-exd-6': 'Walking towards → walking **to** the museum.',
  'b1-u8-exd-7': 'Arrive **in** a city → **in** Rome.',
  'b1-u8-exd-8': 'On a surface → forms **on** my desk.',
  'b1-u8-exd-9': 'Inside an enclosed area → cows **in** that field.',
  'b1-u8-exd-10': 'Fly **to** a destination → **to** South America.',

  'b1-u8-exe-1': 'A specific meeting point → **at** the station.',
  'b1-u8-exe-2': 'Fixed phrase → **in** front of the museum.',
  'b1-u8-exe-3': 'Dates use **on** → begins **on** the third of September.',
  'b1-u8-exe-4': 'Days with a time of day → **on** Saturday morning.',
  'b1-u8-exe-5': 'Inside a container → milk **in** the fridge.',
  'b1-u8-exe-6': 'Future time period → **in** the future.',
  'b1-u8-exe-7': 'Fixed phrase → busy **at** the moment.',
  'b1-u8-exe-8': 'At a specific point → waiting **at** the window.',

  'b1-u8-exf-1': 'Fly **to** a country = direction towards.',
  'b1-u8-exf-2': 'Fixed phrase → **in** the middle of the night.',
  'b1-u8-exf-3': 'Parts of the day → tired **in** the morning.',
  'b1-u8-exf-4': 'Travel **to** a different time zone.',
  'b1-u8-exf-5': 'Clock times → leave **at** six o\'clock.',
  'b1-u8-exf-6': 'Fly **to** another continent.',
  'b1-u8-exf-7': 'Arrive **at** the airport (a specific place).',
  'b1-u8-exf-8': 'A point in time → local time could be **at** five.',
  'b1-u8-exf-9': 'Arrive **at** the hotel.',
  'b1-u8-exf-10': '**At night** is a fixed time expression.',
  'b1-u8-exf-11': 'Inside a country → **in** your own country.',

  'b1-u8-exg-1': 'Seasons use **in** → camping **in** summer.',
  'b1-u8-exg-2': 'Clock times use **at** → begins **at** 8:15.',
  'b1-u8-exg-3': 'Dates use **on** → birthday **on** 22nd April.',
  'b1-u8-exg-4': 'On a surface → keys **on** the kitchen table.',
  'b1-u8-exg-5': 'At a specific point → waiting **at** the door.',
  'b1-u8-exg-6': 'Arrive **in** a city (not **to** Barcelona).',
  'b1-u8-exg-7': 'On a surface → playing **on** the beach.',
  'b1-u8-exg-8': 'A period of time in the future → ready **in** ten minutes.',

  'b1-u8-exi-1': 'Clock times → arrives **at** quarter to seven.',
  'b1-u8-exi-2': 'Years use **in** → born **in** 2009.',
  'b1-u8-exi-3': 'Days use **on** → meeting **on** Saturday.',
  'b1-u8-exi-4': 'On a surface → clock **on** the wall.',
  'b1-u8-exi-5': 'Countries use **in** → lives **in** Australia.',
  'b1-u8-exi-6': 'Festivals use **at** → visit family **at** Easter.',
  'b1-u8-exi-7': 'On a surface → sleeping **on** the sofa.',
  'b1-u8-exi-8': 'Direction towards → travelled **to** the mountains.',

  'b1-u8-exj-1': 'A meeting point → met **at** the library.',
  'b1-u8-exj-2': 'Inside a container → phone **in** my bag.',
  'b1-u8-exj-3': 'Seasons → hot **in** the summer.',
  'b1-u8-exj-4': 'Day + time of day → concert **on** Friday night.',
  'b1-u8-exj-5': 'Fixed phrase → café **on** the corner.',
  'b1-u8-exj-6': 'Addresses → live **at** 42 River Road.',
  'b1-u8-exj-7': 'Direction towards → travelling **to** the coast.',
  'b1-u8-exj-8': 'Inside a container → wallet **in** the drawer.',
  'b1-u8-exj-9': 'A specific place → meet **at** the bus station.',
  'b1-u8-exj-10': 'A period from now → here **in** a few seconds.',

  // ── Unit 9: Travel and transport ────────────────────────
  'b1-u9-exa-1': '**Book** tickets = reserve them in advance.',
  'b1-u9-exa-2': 'You need a **passport** to cross borders.',
  'b1-u9-exa-3': 'Trains leave from a numbered **platform**.',
  'b1-u9-exa-4': 'Lots of people → the airport was **crowded**.',
  'b1-u9-exa-5': 'Heavy **traffic** on the motorway caused the delay.',
  'b1-u9-exa-6': 'Don\'t leave your **luggage** unattended.',
  'b1-u9-exa-7': 'Your final **destination** is where the journey ends.',
  'b1-u9-exa-8': 'Study **abroad** = in another country.',

  'b1-u9-exb-1': 'A place to stay → comfortable **accommodation** near the harbour.',
  'b1-u9-exb-2': 'A long trip → the **journey** from Madrid to Lisbon.',
  'b1-u9-exb-3': 'Because of the storm, they had to **cancel** flights.',
  'b1-u9-exb-4': 'Hurry to **catch** the coach before it leaves.',
  'b1-u9-exb-5': 'A bicycle is a **vehicle** for short journeys.',
  'b1-u9-exb-6': 'Next to the station makes it **convenient**.',

  'b1-u9-exc-1': '**Set off** = start a journey.',
  'b1-u9-exc-2': '**Get on** the bus = board it.',
  'b1-u9-exc-3': '**Get off** at the next stop = leave the train.',
  'b1-u9-exc-4': '**Get out of** the taxi = leave it.',
  'b1-u9-exc-5': 'Planes **take off** = leave the ground.',
  'b1-u9-exc-6': '**Go back** home = return home.',

  'b1-u9-exd-1': '**By train** matches travelling across Europe.',
  'b1-u9-exd-2': '**On board** = on the plane/ship.',
  'b1-u9-exd-3': '**On foot** = walking, not using transport.',
  'b1-u9-exd-4': '**On holiday** = away on vacation.',
  'b1-u9-exd-5': '**On schedule** = at the planned time.',
  'b1-u9-exd-6': '**On the coast** = by the sea.',

  'b1-u9-exe-1': 'Close **to** = near our hotel.',
  'b1-u9-exe-2': 'Famous **for** its beaches (fixed pattern).',
  'b1-u9-exe-3': 'Far **from** the nearest town.',
  'b1-u9-exe-4': 'Late **for** our flight (not late to).',
  'b1-u9-exe-5': 'Ask **about** the history of the castle.',
  'b1-u9-exe-6': 'Wait **for** the ferry.',
  'b1-u9-exe-7': 'Provide someone **with** towels.',
  'b1-u9-exf-1': 'Noun from **ATTRACT** → tourist **attraction**.',
  'b1-u9-exf-2': 'Plural noun from **DIRECT** → **directions**.',
  'b1-u9-exf-3': 'Noun from **DEPART** → **departure** time.',
  'b1-u9-exf-4': 'Person who drives → bus **driver**.',
  'b1-u9-exf-5': 'Noun from **FLY** → the **flight** was delayed.',
  'b1-u9-exf-6': 'Person who travels → experienced **traveller**.',
  'b1-u9-exf-7': 'Plural of person who visits → **visitors**.',
  'b1-u9-exf-8': 'Adjective from **COMFORT** → **comfortable** seats.',

  'b1-u9-exg-1': 'We **reached** the resort = arrived at.',
  'b1-u9-exg-2': 'The receptionist will **provide** you with information.',
  'b1-u9-exg-3': 'Suitable **for** families (fixed pattern).',
  'b1-u9-exg-4': 'Airport closed → travel **by road**.',
  'b1-u9-exg-5': '**Ask for** a window seat when checking in.',
  'b1-u9-exg-6': 'A ferry leaves from a **harbour**.',

  'b1-u9-exh-1': 'Have a short **break** = pause during a drive.',
  'b1-u9-exh-2': 'Go **on foot** = walk.',
  'b1-u9-exh-3': 'Far **from** the city centre.',
  'b1-u9-exh-4': '**Pack** your suitcase before the trip.',
  'b1-u9-exh-5': 'Got **off** the train = left it.',
  'b1-u9-exh-6': '**Look** at the timetable to find the time.',
  'b1-u9-exh-7': '**On schedule** = on time.',
  'b1-u9-exh-8': 'A **souvenir** reminds you of a trip.',

  // ── Review 3 ────────────────────────────────────────────
  'b1-u3-exa-1': 'This sentence is correct — no extra word to remove.',
  'b1-u3-exa-2': '**Arrive in** a city — remove the extra **to**.',
  'b1-u3-exa-3': '**Close to** the centre — remove the extra **near**.',
  'b1-u3-exa-4': 'This sentence is correct — no extra word.',
  'b1-u3-exa-5': '**Set off sightseeing** — remove the extra **to**.',
  'b1-u3-exa-6': '**By public transport** — remove the extra **on**.',
  'b1-u3-exa-7': 'This sentence is correct — no extra word.',
  'b1-u3-exa-8': '**Not far from** — remove the extra **distance**.',
  'b1-u3-exa-9': '**Get off the coach** — remove the extra **from**.',
  'b1-u3-exa-10': 'This sentence is correct — no extra word.',

  'b1-u3-exb-1': '**Provide you with** = give you (same meaning).',
  'b1-u3-exb-2': 'A plan → **am going to** visit Greece.',
  'b1-u3-exb-3': 'Hotels by the sea → **on the coast**.',
  'b1-u3-exb-4': 'Leave the train → **get off**.',
  'b1-u3-exb-5': 'Walk there → **go on foot**.',
  'b1-u3-exb-6': 'Travel in your car → **by car**.',
  'b1-u3-exb-7': 'Return → **go back to** Rome.',
  'b1-u3-exb-8': 'Planes leave the ground → **taking off**.',

  'b1-u3-exc-1': 'Past simple of **fly** → **flew**.',
  'b1-u3-exc-2': 'Person who drives → taxi **driver**.',
  'b1-u3-exc-3': 'People who travel → experienced **travellers**.',
  'b1-u3-exc-4': 'Adjective from **ATTRACT** → **attractive** at night.',
  'b1-u3-exc-5': 'Adjective from **COMFORT** → **comfortable** bed.',
  'b1-u3-exc-6': 'Noun from **DEPART** → **departure** gate.',
  'b1-u3-exc-7': 'Past simple of **choose** → **chose**.',
  'b1-u3-exc-8': 'Noun from **DIRECT** → continue in that **direction**.',

  'b1-u3-exd-1': 'A plan after school → **am going to study** abroad.',
  'b1-u3-exd-2': 'A prediction → **will arrive** on time.',
  'b1-u3-exd-3': 'Countries use **in** → weather **in** Canada.',
  'b1-u3-exd-4': 'A fixed arrangement → **am visiting** my grandparents.',
  'b1-u3-exd-5': 'Page numbers use **on** → timetable **on** page twelve.',
  'b1-u3-exd-6': 'Festivals use **at** → visit relatives **at** Easter.',
  'b1-u3-exd-7': 'Dark clouds = evidence → **is going to** rain.',
  'b1-u3-exd-8': 'Day + time → flying **on** Monday morning.',

  'b1-u3-exe-1': 'Get **into** a taxi = enter it.',
  'b1-u3-exe-2': 'Leave **on schedule** = on time.',
  'b1-u3-exe-3': '**Catches** the train = takes it regularly.',
  'b1-u3-exe-4': '**Set off** before six = started the journey.',
  'b1-u3-exe-5': 'Prepare **for** your holiday.',
  'b1-u3-exe-6': 'Public **transport** = buses, trains, etc.',
  'b1-u3-exe-7': 'Going **away** for the weekend.',
  'b1-u3-exe-8': 'A **foreign** language = from another country.'
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

const files = ['Unit7.v2.json', 'Unit8.v2.json', 'Unit9.v2.json', 'Review3.v2.json'];
let totalMissing = [];

files.forEach(function(f) {
  const r = applyToFile(f);
  console.log(f + ': updated ' + r.updated + ', skipped ' + r.skipped + ' (already filled)');
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
