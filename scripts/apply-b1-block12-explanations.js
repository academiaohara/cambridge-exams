#!/usr/bin/env node
/**
 * Apply personalized English explanations to B1 Block 12:
 * Unit34, Unit35, Unit36, Review12
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COURSE = path.join(ROOT, 'data/Course/B1');

const EXPLANATIONS = {
  // ── Unit 34: Irregular verbs & double object ─────────────
  'b1-u34-exa-1': 'Past simple irregular → **slept** in his chair.',
  'b1-u34-exa-2': 'Past simple irregular → **put** my backpack.',
  'b1-u34-exa-3': 'Past simple irregular → **lend** me your charger.',
  'b1-u34-exa-4': 'Past simple irregular → **closed** the door.',
  'b1-u34-exa-5': 'Past simple irregular → **laughed** at the story.',
  'b1-u34-exa-6': 'Past simple irregular → **sent** me a text.',

  'b1-u34-exb-1': 'Double object → **gave Jack** a postcard (no **to**).',
  'b1-u34-exb-2': 'Double object → **bought my cousin** headphones.',
  'b1-u34-exb-3': 'Double object → **showed us** his photos.',
  'b1-u34-exb-4': 'Double object → **sent us** a package.',
  'b1-u34-exb-5': 'Read **to** someone → **read the email to** her manager.',
  'b1-u34-exb-6': 'Double object → **wrote his friend** a postcard.',

  'b1-u34-exc-1': 'Give **to** someone → **gave the keys to** her brother.',
  'b1-u34-exc-2': 'Buy **for** someone → **bought a jacket for** me.',
  'b1-u34-exc-3': 'Explain **to** someone → **explained the rules to** us.',
  'b1-u34-exc-4': 'Make **for** someone → **made dinner for** his parents.',
  'b1-u34-exc-5': 'Write **to** someone → **wrote an email to** my teacher.',
  'b1-u34-exc-6': 'Offer **to** someone → **offered a discount to** customers.',

  'b1-u34-exd-1': 'Indirect object → pass **me** the bread.',
  'b1-u34-exd-2': 'Explain **to** me again.',
  'b1-u34-exd-3': 'Double object → taught **me** how to swim.',
  'b1-u34-exd-4': 'Direct object → paid **the** cashier.',
  'b1-u34-exd-5': 'Send **to** her grandparents.',
  'b1-u34-exd-6': 'Make **for** me a sandwich.',

  'b1-u34-exe-1': 'No **to** with double object → **gave Ben** her laptop.',
  'b1-u34-exe-2': 'Buy + person + thing → **bought me** a bicycle.',
  'b1-u34-exe-3': 'Show person + thing → **show the manager to me**.',
  'b1-u34-exe-4': 'Offer + person + thing → **offered him** a ticket.',
  'b1-u34-exe-5': 'Write + person + thing → **wrote my cousin** an email.',
  'b1-u34-exe-6': 'Read + person + thing → **read the students** the story.',

  'b1-u34-exf-1': 'Rewrite with **for** → **for my** dad.',
  'b1-u34-exf-2': 'Double object → **sent Amy a** message.',
  'b1-u34-exf-3': 'Double object → **give me this** book.',
  'b1-u34-exf-4': 'Double object → **cooked us** dinner.',
  'b1-u34-exf-5': 'Double object → **showed the visitors the** paintings.',
  'b1-u34-exf-6': 'Double object → **send strangers your** address.',

  // ── Unit 35: Wish / if only ───────────────────────────────
  'b1-u35-exa-1': 'Present wish → past **knew** how to cook.',
  'b1-u35-exa-2': 'Present wish → **wasn\'t** afraid.',
  'b1-u35-exa-3': 'Ability wish → **could** travel.',
  'b1-u35-exa-4': 'Past regret → **had taken** more photos.',
  'b1-u35-exa-5': 'Annoying habit → **wouldn\'t leave** his clothes.',
  'b1-u35-exa-6': 'Past regret → **hadn\'t lost** her keys.',
  'b1-u35-exa-7': 'Present state → **was** more confident.',
  'b1-u35-exa-8': 'Ability → **could play** the guitar.',

  'b1-u35-exb-1': 'Present wish → **understood** maths better.',
  'b1-u35-exb-2': 'Present state → **weren\'t** so busy.',
  'b1-u35-exb-3': 'Ability → **could** ski.',
  'b1-u35-exb-4': 'Annoying action → **would stop** making noise.',
  'b1-u35-exb-5': 'Past regret → **had visited** the museum.',
  'b1-u35-exb-6': 'If only → **were** more organised.',

  'b1-u35-exc-1': 'Present wish → **I wish I knew** how to dance.',
  'b1-u35-exc-2': 'Annoying habit → **wouldn\'t borrow** my clothes.',
  'b1-u35-exc-3': 'Past regret → **had remembered** my homework.',
  'b1-u35-exc-4': 'Ability → **I wish I could** drive.',
  'b1-u35-exc-5': 'Possible future → **hope** (not **wish**).',
  'b1-u35-exc-6': 'Present state → **If only I was** famous.',

  'b1-u35-exd-1': 'After **wish** → past **knew** (not **would know**).',
  'b1-u35-exd-2': 'Present state → **was/were** stronger.',
  'b1-u35-exd-3': 'Annoying habit → **would be** quieter.',
  'b1-u35-exd-4': 'Past → **had gone** to bed earlier.',
  'b1-u35-exd-5': 'Past result → **had won** (not **could won**).',
  'b1-u35-exd-6': 'Possible future → **hope** the test is easy.',

  'b1-u35-exe-1': 'Present wish → **had** enough money.',
  'b1-u35-exe-2': 'Past regret → **had practised** more.',
  'b1-u35-exe-3': 'Present state → **were better** at remembering.',
  'b1-u35-exe-4': 'Annoying habit → **wouldn\'t bark** all night.',
  'b1-u35-exe-5': 'Ability → **could** play chess.',
  'b1-u35-exe-6': 'Past regret → **had saved** our work earlier.',

  // ── Unit 36: Environment & nature ───────────────────────
  'b1-u36-exa-1': 'Weather prediction → weather **forecast**.',
  'b1-u36-exa-2': 'Reuse materials → **recycle** bottles.',
  'b1-u36-exa-3': 'Protect → **preserve** forests.',
  'b1-u36-exa-4': 'Long-term weather → warm **climate**.',
  'b1-u36-exa-5': 'Very hot period → summer **heatwave**.',
  'b1-u36-exa-6': 'Small creature → tiny **insect**.',
  'b1-u36-exa-7': 'Storm light → bright **lightning**.',
  'b1-u36-exa-8': 'Rural area → live in the **countryside**.',

  'b1-u36-exb-1': 'Celestial body → **planet** in solar system.',
  'b1-u36-exb-2': 'Very cold → almost **freezing**.',
  'b1-u36-exb-3': 'No longer exists → **extinct**.',
  'b1-u36-exb-4': 'Save → **rescue** the bird.',
  'b1-u36-exb-5': 'Feeds milk → **mammal**.',
  'b1-u36-exb-6': 'Wonderful → looked **amazing**.',

  'b1-u36-exc-1': 'Place down → **put down** that box.',
  'b1-u36-exc-2': 'Become fine → **clear up** later.',
  'b1-u36-exc-3': 'Block entry → **keep out** people.',
  'b1-u36-exc-4': 'Extinguish → **put out** the campfire.',
  'b1-u36-exc-5': 'Display → **put up** a map.',
  'b1-u36-exc-6': 'Stop burning → **go out**.',
  'b1-u36-exc-7': 'Accumulate → **build up**.',
  'b1-u36-exc-8': 'Explode → **blow up** if too hot.',

  'b1-u36-exd-1': 'Far away → **in the distance**.',
  'b1-u36-exd-2': 'At first → **In the beginning**.',
  'b1-u36-exd-3': 'Complete amount → **in total**.',
  'b1-u36-exd-4': 'Position → **on top of** the wall.',
  'b1-u36-exd-5': 'Highest point → **at the top of** the mountain.',
  'b1-u36-exd-6': 'Maximum → **at most** an hour.',

  'b1-u36-exe-1': 'Afraid **of** storms.',
  'b1-u36-exe-2': 'Aware **of** the damage.',
  'b1-u36-exe-3': 'Enthusiastic **about** protecting wildlife.',
  'b1-u36-exe-4': 'Serious **about** recycling.',
  'b1-u36-exe-5': 'Short **of** food.',
  'b1-u36-exe-6': 'Prevent **from** entering.',
  'b1-u36-exe-7': 'Save **from** the flood.',
  'b1-u36-exe-8': 'Worry **about** pollution.',
  'b1-u36-exe-9': 'Increase **in** temperatures.',
  'b1-u36-exe-10': 'Damage **to** the bridge.',

  'b1-u36-exf-1': 'Adjective from CENTRE → **central** area.',
  'b1-u36-exf-2': 'Adjective from CIRCLE → **circular** moon.',
  'b1-u36-exf-3': 'Adjective from DANGER → **dangerous** animals.',
  'b1-u36-exf-4': 'Noun from DEEP → **depth** of the ocean.',
  'b1-u36-exf-5': 'Noun from DESTROY → terrible **destruction**.',
  'b1-u36-exf-6': 'Adjective from FOG → **foggy**.',
  'b1-u36-exf-7': 'Person from GARDEN → **gardener**.',
  'b1-u36-exf-8': 'Noun from INVADE → **invasion** of insects.',
  'b1-u36-exf-9': 'Adjective from NATURE → **natural** in autumn.',
  'b1-u36-exf-10': 'Noun from POLLUTE → air **pollution**.',

  'b1-u36-exg-1': 'Animals in nature → **wildlife**.',
  'b1-u36-exg-2': 'Drop rubbish → **litter**.',
  'b1-u36-exg-3': 'Type of animal → **reptile**.',
  'b1-u36-exg-4': 'Planets around the sun → **solar system**.',
  'b1-u36-exg-5': 'Stops burning → **goes out**.',
  'b1-u36-exg-6': 'Brief rain → rain **shower**.',

  'b1-u36-exh-1': 'Rubbish → leave **litter**.',
  'b1-u36-exh-2': 'Lowest part → **bottom** of the sea.',
  'b1-u36-exh-3': 'No longer exist → become **extinct**.',
  'b1-u36-exh-4': 'Not extreme → weather was **mild**.',
  'b1-u36-exh-5': 'Find position → **locate** the satellite.',
  'b1-u36-exh-6': 'Storm sound → heard **thunder**.',
  'b1-u36-exh-7': 'Aware **of** the need to save water.',
  'b1-u36-exh-8': 'Stay away → keep **out** of the field.',

  'b1-u36-exi-1': 'Feeds milk → **mammal** (even though it flies).',
  'b1-u36-exi-2': 'Save people → **rescue** people.',
  'b1-u36-exi-3': 'Very cold → **freezing** water.',
  'b1-u36-exi-4': 'Ground movement → **earthquake**.',
  'b1-u36-exi-5': 'May disappear → become **extinct**.',
  'b1-u36-exi-6': 'Orbits Earth → weather **satellite**.',
  'b1-u36-exi-7': 'Harm in seas → plastic **pollution**.',
  'b1-u36-exi-8': 'Hottest → **planet** in solar system.',
  'b1-u36-exi-9': 'Not domesticated → live **wild**.',
  'b1-u36-exi-10': 'Long-term weather pattern → dry **climate**.',

  // ── Review 12 ───────────────────────────────────────────
  'b1-u12-exa-1': 'Not extreme → **mild** climate.',
  'b1-u12-exa-2': 'Very cold → **freezing** water.',
  'b1-u12-exa-3': 'No longer exist → become **extinct**.',
  'b1-u12-exa-4': 'Worldwide → **global** issue.',
  'b1-u12-exa-5': 'Not tame → **wild** horses.',
  'b1-u12-exa-6': 'In the area → **local** council.',

  'b1-u12-exb-1': 'Adjective from FOG → **foggy** road.',
  'b1-u12-exb-2': 'Adjective from DESTROY → **destructive** fire.',
  'b1-u12-exb-3': 'Adjective from NATURE → **natural** for animals.',
  'b1-u12-exb-4': 'Noun from POLLUTE → water **pollution**.',
  'b1-u12-exb-5': 'Activity from GARDEN → enjoys **gardening**.',
  'b1-u12-exb-6': 'Noun from DEEP → exact **depth**.',
  'b1-u12-exb-7': 'Adjective from CIRCLE → **circular** path.',
  'b1-u12-exb-8': 'Adjective from DANGER → **dangerous** insects.',

  'b1-u12-exc-1': 'Maximum → **at most** twenty people.',
  'b1-u12-exc-2': 'Explode → **blows up** near the moon.',
  'b1-u12-exc-3': 'Lowest part → **at the bottom of** the valley.',
  'b1-u12-exc-4': 'Stopped burning → **went out**.',
  'b1-u12-exc-5': 'Display → **put up** a poster.',
  'b1-u12-exc-6': 'Increase gradually → **build up** support.',

  'b1-u12-exd-1': 'Ability wish → **could** speak five languages.',
  'b1-u12-exd-2': 'Present wish → **had** more free time.',
  'b1-u12-exd-3': 'Annoying habit → **wouldn\'t** leave books.',
  'b1-u12-exd-4': 'Indirect object → told **us** the answer.',
  'b1-u12-exd-5': 'Double object → gave **him** the keys.',
  'b1-u12-exd-6': 'Past regret → **had** remembered my camera.',
  'b1-u12-exd-7': 'Double object → sent **her** a postcard.',
  'b1-u12-exd-8': 'Past regret → **had worked** harder.',
  'b1-u12-exd-9': 'Double object → showed **us** the ruins.',
  'b1-u12-exd-10': 'Annoying habit → **would stop** barking.',
  'b1-u12-exd-11': 'Double object → bought **her** a coat.',
  'b1-u12-exd-12': 'Indirect object → asked **me** a question.',
  'b1-u12-exd-13': 'Present state → **were** braver.',
  'b1-u12-exd-14': 'Double object → lent **us** his tent.',
  'b1-u12-exd-15': 'Past regret → **had won** the race.',

  'b1-u12-exe-1': 'Types of living things → **species**.',
  'b1-u12-exe-2': 'Ocean height → sea **levels**.',
  'b1-u12-exe-3': 'Possessive → protect **our** planet.',
  'b1-u12-exe-4': 'Measurement → Richter **scale**.',
  'b1-u12-exe-5': 'Volcano action → **erupted**.',
  'b1-u12-exe-6': 'No longer exist → **extinct**.',
  'b1-u12-exe-7': 'Overflowed → **burst** its banks.',
  'b1-u12-exe-8': 'Large number → 14 **billion** years.',
  'b1-u12-exe-9': 'Planets together → solar **system**.',
  'b1-u12-exe-10': 'Harmful gases → carbon **emissions**.',
  'b1-u12-exe-11': 'Essential → **vital** for living things.',
  'b1-u12-exe-12': 'Very serious → **severe** damage.',
  'b1-u12-exe-13': 'Metaphor → **lungs** of the Earth.',
  'b1-u12-exe-14': 'Celestial body → new **planet**.',
  'b1-u12-exe-15': 'Night sky → many **stars**.'
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

const files = ['Unit34.v2.json', 'Unit35.v2.json', 'Unit36.v2.json', 'Review12.v2.json'];
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
