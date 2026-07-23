#!/usr/bin/env node
/**
 * Migrate two_option_choice items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-two-option-explanations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildOptionContrastMap,
  ensurePeriod
} from './lib/option-contrast.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data', 'Course');

function walkJsonFiles(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJsonFiles(full, files);
    else if (name.endsWith('.v2.json') || /^Unit\d+\.json$/.test(name)) files.push(full);
  }
  return files;
}

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function sentenceContext(item) {
  const before = String(item.sentenceBefore || '').trim();
  const after = String(item.sentenceAfter || '').trim();
  return { before, after, full: [before, after].filter(Boolean).join(' … ') };
}

function otherOption(item) {
  const answer = String(item.answer || '').trim();
  return (item.options || []).find((o) => String(o).trim() !== answer);
}

function pairKey(options) {
  return (options || []).map((o) => String(o).trim().toLowerCase()).sort().join('|');
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function expandLegacyWhy(item, legacy) {
  const stripped = stripMd(legacy);
  if (!stripped) return '';

  if (stripped.includes('→')) {
    const parts = stripped.split('→').map((p) => p.trim());
    const clue = parts[0];
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    return ensurePeriod(`The context clue is that ${lower}`);
  }

  return ensurePeriod(stripped);
}

/** Hand-crafted rules for recurring option pairs */
const PAIR_BUILDERS = {
  'a few|a little': (item) => {
    const { after } = sentenceContext(item);
    const noun = after.split(/\s+/)[0] || 'the noun';
    const countable = item.answer === 'a few';
    return {
      whyCorrect: countable
        ? ensurePeriod(`"${capitalize(noun)}" is countable here, so we need a quantifier for countable nouns`)
        : ensurePeriod(`"${capitalize(noun)}" is uncountable here, so we need a quantifier for uncountable nouns`),
      grammarFocus: countable
        ? 'Use a few with countable plural nouns (a few ideas, a few children).'
        : 'Use a little with uncountable nouns (a little bread, a little time).',
      wrongOptions: {
        'a few': 'A few is only for countable nouns you can pluralise.',
        'a little': 'A little is only for uncountable nouns.'
      },
      usefulTip: 'Look at the noun after the gap — if it has a plural form, it is usually countable.'
    };
  },
  'many|much': (item) => {
    const { after } = sentenceContext(item);
    const noun = after.split(/\s+/)[0] || 'the noun';
    const uncountable = item.answer === 'much';
    return {
      whyCorrect: uncountable
        ? ensurePeriod(`"${capitalize(noun)}" is uncountable, so we use much`)
        : ensurePeriod(`"${capitalize(noun)}" is countable, so we use many`),
      grammarFocus: 'Much goes with uncountable nouns; many goes with countable plural nouns.',
      wrongOptions: {
        much: 'Much does not combine with countable plural nouns.',
        many: 'Many does not combine with uncountable nouns.'
      },
      usefulTip: 'Ask yourself: can you say "two Xs"? If not, the noun is probably uncountable.'
    };
  },
  'a|an': (item) => ({
    whyCorrect: 'The next word begins with a vowel sound, so we need the indefinite article an.',
    grammarFocus: 'Use a before consonant sounds and an before vowel sounds — listen to the sound, not just the letter.',
    wrongOptions: {
      a: 'A is used before consonant sounds, not before a vowel sound here.',
      an: 'An is only used before vowel sounds.'
    },
    usefulTip: 'Say the next word aloud — if it starts with a vowel sound, choose an.'
  }),
  '-|the': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      'We are talking about one specific thing both speakers know about, so the definite article is required.',
    grammarFocus: 'Use the when the listener knows which person, place, or thing you mean.',
    wrongOptions: {
      '-': 'No article is wrong here — English needs the before a specific known thing.',
      the: 'The is wrong only when no specific thing is meant — that is not the case here.'
    }
  }),
  "don't have to|mustn't": (item) => ({
    whyCorrect: item.answer === "don't have to"
      ? 'There is no obligation — the action is optional, not forbidden.'
      : 'The situation requires a strong prohibition or ban.',
    grammarFocus: "Don't have to = no obligation. Mustn't = prohibition (not allowed).",
    wrongOptions: {
      "don't have to": "Don't have to means optional — it does not mean forbidden.",
      "mustn't": "Mustn't means something is forbidden, not merely optional."
    },
    usefulTip: "Mustn't is one of the strongest ways to say something is not allowed."
  }),
  'enough|too': (item) => ({
    whyCorrect: item.answer === 'too'
      ? 'The sentence shows a negative result — the degree is excessive.'
      : 'The amount satisfies what is needed — it is sufficient.',
    grammarFocus: 'Too + adjective = more than is good. Enough = sufficient amount.',
    wrongOptions: {
      too: 'Too suggests a problem caused by excess; that may not match the sentence.',
      enough: 'Enough means sufficient — it does not express excess.'
    }
  }),
  'at|in': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      (item.answer === 'in'
        ? 'This is a fixed expression or enclosed space that takes in.'
        : 'This is a point or specific location that takes at.'),
    grammarFocus: 'At marks a point (at the station). In marks inside or fixed phrases (in front of).',
    wrongOptions: {
      at: 'At does not fit this type of location or fixed phrase.',
      in: 'In does not fit when we need a point or a different preposition pattern.'
    }
  }),
  'at|on': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      (item.answer === 'on' ? 'Days and dates take on.' : 'A specific point or place takes at.'),
    grammarFocus: 'On is used with days and dates. At is used with specific times and places.',
    wrongOptions: {
      at: 'At is not used with days or dates in standard English.',
      on: 'On is not used for a precise meeting point like a station.'
    }
  }),
  'in|on': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      'The time expression in this sentence follows a fixed preposition pattern.',
    grammarFocus: 'In is used with months, years, and longer periods. On is used with days and dates.',
    wrongOptions: {
      in: 'In does not match this type of time expression.',
      on: 'On does not match this type of time expression.'
    }
  }),
  'can|could': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      (item.answer === 'can' ? 'The speaker is giving permission now.' : 'Could softens the request or refers to past ability.'),
    grammarFocus: 'Can often gives permission or states ability. Could is more polite or past.',
    wrongOptions: {
      can: 'Can may be too direct or present-tense for this context.',
      could: 'Could may be too tentative when clear present permission is meant.'
    }
  }),
  'can|may': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      (item.answer === 'may' ? 'A formal permission or rule is being stated.' : 'Ability or informal permission fits better.'),
    grammarFocus: 'May is formal permission. Can is everyday permission or ability.',
    wrongOptions: {
      can: 'Can can sound informal where a rule or polite permission is needed.',
      may: 'May is formal — it may not fit informal ability sentences.'
    }
  }),
  'could|may': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      'The level of formality and meaning in the sentence matches one modal, not the other.',
    grammarFocus: 'May states permission or possibility in formal English. Could is a polite request or past ability.',
    wrongOptions: {
      could: 'Could does not express the same type of permission or rule here.',
      may: 'May does not match the intended meaning or register here.'
    }
  }),
  "didn't have to|had to": (item) => ({
    whyCorrect: item.answer === "didn't have to"
      ? 'No waiting was necessary — the action was not required.'
      : 'Waiting was necessary in this situation.',
    grammarFocus: "Didn't have to = it was not necessary. Had to = it was necessary / obligatory.",
    wrongOptions: {
      "didn't have to": "Didn't have to means unnecessary — not the same as had to.",
      "had to": "Had to means obligation — not the same as no need to wait."
    }
  }),
  'so|such': (item) => ({
    whyCorrect: item.answer === 'so'
      ? 'So is followed directly by an adjective (so + adjective).'
      : 'Such is followed by a noun phrase (such + a + adjective + noun).',
    grammarFocus: 'So + adjective. Such + (a) + adjective + noun.',
    wrongOptions: {
      so: 'So cannot be followed by a noun phrase in this pattern.',
      such: 'Such is not used directly before a lone adjective.'
    },
    usefulTip: 'If a noun comes right after the gap, you usually need such.'
  }),
  'no|yes': (item) => ({
    whyCorrect: expandLegacyWhy(item, item.explanation) ||
      'The first part of the sentence matches the meaning of yes.',
    vocabularyFocus: 'Read the definition or clue in the sentence — it tells you whether yes or no fits.',
    wrongOptions: {
      YES: 'Yes would mean the statement is true, which does not match the clue.',
      NO: 'No would mean the statement is false, which does not match the clue.',
      Yes: 'Yes would mean the statement is true, which does not match the clue.',
      No: 'No would mean the statement is false, which does not match the clue.'
    }
  })
};

function buildWhyFromContext(item, answer, wrongStr) {
  const { before, after } = sentenceContext(item);
  const afterLow = after.toLowerCase();
  const beforeLow = before.toLowerCase();
  const full = (before + ' ' + after).toLowerCase();

  if (/i'?m sure|you'?ll pass|you will pass/.test(afterLow) && /far too|too/.test(beforeLow)) {
    return 'The speaker disagrees with a negative outlook — they say you will pass, so the gap must describe an attitude that is too negative.';
  }
  if (/in favour of|in favor of/.test(afterLow) && /documentary|article|report/.test(full)) {
    return 'Media that unfairly supports one side is biased. Prejudiced usually describes a person\'s unfair attitude, not a one-sided documentary.';
  }
  if (/never believe|don'?t believe a word/.test(afterLow)) {
    return 'The speaker shows deep distrust of politicians. Cynical (believing people act from self-interest) fits better than merely doubtful.';
  }
  if (/learn a language|in just two months|fluently in/.test(afterLow)) {
    return 'Believing you can become fluent in two months is unrealistic — the sentence calls that idea naïve, not sceptical.';
  }
  if (/none of us had ever thought|never thought of/.test(afterLow)) {
    return 'A clever, original solution is ingenious. Plausible only means believable, which is weaker than the surprise in the sentence.';
  }
  if (/completely|confused|baffled/.test(full) && /students|people|audience/.test(afterLow)) {
    return 'Technical language confuses people — baffled means confused, not discriminated (treated unfairly).';
  }
  if (/full impact|evaluate|assess/.test(full)) {
    return 'We assess (= judge/evaluate) impact when it is too early to know for certain. Assume means to take for granted without proof.';
  }
  if (/work out|solve|calculate/.test(beforeLow) || /work out|solve/.test(afterLow)) {
    return 'Work out means to solve or find the answer — so the statement is true (YES).';
  }
  if (/permission|allowed|may i|can i/.test(full)) {
    return expandLegacyWhy(item, item.explanation || '');
  }

  if (wrongStr) {
    return `Only "${answer}" fits the meaning created by the words before and after the gap.`;
  }
  return `The sentence only makes sense with "${answer}" in the gap.`;
}

function buildVocabularyContent(item, legacy) {
  const answer = String(item.answer || '').trim();
  const wrong = otherOption(item);
  const wrongStr = wrong ? String(wrong).trim() : '';
  const { after } = sentenceContext(item);

  const whyCorrect = legacy && legacy.includes('→')
    ? buildWhyFromContext(item, answer, wrongStr)
    : (expandLegacyWhy(item, legacy) || buildWhyFromContext(item, answer, wrongStr));

  let vocabularyFocus = '';
  if (wrongStr) {
    vocabularyFocus = `"${answer}" collocates with the rest of the sentence. "${wrongStr}" would change the meaning or is the wrong register for this context.`;
  } else {
    vocabularyFocus = `"${answer}" is the only word that fits both grammar and meaning here.`;
  }

  const wrongOptions = {};
  if (wrongStr) {
    wrongOptions[wrongStr] = buildWrongOptionNote(item, answer, wrongStr, after);
  }

  return attachOptionContrast(item, {
    whyCorrect: ensurePeriod(whyCorrect),
    vocabularyFocus: ensurePeriod(vocabularyFocus),
    wrongOptions,
    usefulTip: 'When two words look similar, read the whole sentence — the clue is usually before or after the gap.'
  });
}

function buildWrongOptionNote(item, answer, wrongStr, after) {
  const afterLow = after.toLowerCase();
  const beforeLow = String(item.sentenceBefore || '').trim().toLowerCase();
  const full = `${beforeLow} ${afterLow}`;

  if (/very often|usually|always|every day|every evening|every week|never|sometimes|in tennis/.test(full)) {
    if (/\w+ing\b/.test(wrongStr) || /aren't|isn't|am not/.test(wrongStr)) {
      return `"${wrongStr}" describes something happening now, but the time clue signals a habit or routine.`;
    }
    if (/^do |^does /.test(wrongStr)) {
      return `"${wrongStr}" is the wrong question form for a routine — check whether the sentence needs present simple or continuous.`;
    }
    return `"${wrongStr}" does not fit a habit or general fact — the present simple is needed here.`;
  }

  if (/right now|at the moment|now|this month|today|tonight/.test(full)) {
    if (/don't|doesn't|^do |^does /.test(wrongStr) && !/\w+ing\b/.test(wrongStr)) {
      return `"${wrongStr}" describes a habit or general fact, but the time clue signals an action happening now.`;
    }
    return `"${wrongStr}" does not match the present continuous time clue in this sentence.`;
  }

  if (/these days/.test(full) && !/\w+ing\b/.test(wrongStr)) {
    return `"${wrongStr}" does not describe a gradual change over time — the present continuous fits better.`;
  }

  if (/understand|know|believe|belong/.test(full) && /\w+ing\b/.test(wrongStr)) {
    return `"${wrongStr}" uses a stative verb in the continuous form, which is unusual here.`;
  }

  if (/pronounce/.test(full) && /\w+ing\b/.test(wrongStr)) {
    return `"${wrongStr}" suggests an action happening now, but this asks about the general way to say a word.`;
  }

  if (/i'?m sure|you'?ll pass/.test(afterLow)) {
    return `"${wrongStr}" points the wrong way — the speaker is rejecting ${wrongStr === 'optimistic' ? 'too much hope' : 'the opposite attitude'}, not supporting it.`;
  }
  if (/in favour of|in favor of/.test(afterLow)) {
    return `"${wrongStr}" does not describe one-sided media as naturally as "${answer}" does here.`;
  }
  return `"${wrongStr}" does not match the clue in the rest of the sentence${
    after ? ` ("${after.slice(0, 55)}${after.length > 55 ? '…' : ''}")` : ''
  }.`;
}

function looksLikeTenseChoice(item) {
  const options = (item.options || []).map((o) => String(o).trim().toLowerCase());
  if (options.length < 2) return false;
  const joined = options.join(' ');
  return /\b(?:am|are|is|was|were)\s+\w+ing\b/.test(joined) ||
    /\b(?:don't|doesn't|didn't|do|does|did)\b/.test(joined) ||
    /\w+ed\b/.test(joined) ||
    /\w+ing\b/.test(joined);
}

function buildTenseChoiceContent(item, legacy) {
  const answer = String(item.answer || '').trim();
  const wrong = otherOption(item);
  const wrongStr = wrong ? String(wrong).trim() : '';
  const { before, after } = sentenceContext(item);
  const full = `${before} ${after}`.toLowerCase();

  const whyCorrect = expandLegacyWhy(item, legacy) || buildWhyFromContext(item, answer, wrongStr);

  let grammarFocus = 'Present simple describes habits, routines and general facts. Present continuous describes actions happening now or temporary situations.';
  let usefulTip = 'Look for time clues — frequency words (very often, usually) point to present simple; right now and at the moment point to present continuous.';

  if (/walked|were walking|was \w+ing|did\b/.test((item.options || []).join(' ').toLowerCase())) {
    grammarFocus = 'Past simple describes completed events. Past continuous describes actions in progress or background situations.';
    usefulTip = 'Every day / an hour ago often signal past simple; while / when + past continuous often describe background actions.';
  }

  if (/very often|usually|always|every day|every evening|in tennis/.test(full)) {
    grammarFocus = 'Use present simple with frequency words (very often, usually, every day) and general facts.';
  } else if (/right now|at the moment|this month|today|tonight/.test(full)) {
    grammarFocus = 'Use present continuous with time clues like right now, at the moment and this month.';
  } else if (/these days/.test(full)) {
    grammarFocus = 'Present continuous can describe gradual changes over a period (becoming more confident these days).';
  } else if (/understand|believe|belong/.test(full)) {
    grammarFocus = 'Stative verbs (understand, know, believe) are usually in the present simple, not the continuous.';
  } else if (/pronounce/.test(full)) {
    grammarFocus = 'Use present simple when asking about general facts or standard pronunciation.';
  }

  const wrongOptions = {};
  if (wrongStr) {
    wrongOptions[wrongStr] = buildWrongOptionNote(item, answer, wrongStr, after);
  }

  return attachOptionContrast(item, {
    whyCorrect: ensurePeriod(whyCorrect),
    grammarFocus: ensurePeriod(grammarFocus),
    wrongOptions,
    usefulTip: ensurePeriod(usefulTip)
  });
}

function attachOptionContrast(item, content) {
  content.optionContrast = buildOptionContrastMap(item, content);
  return content;
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const key = pairKey(item.options);
  const builder = PAIR_BUILDERS[key];

  if (builder) {
    const built = builder(item);
    const wrong = otherOption(item);
    const wrongStr = wrong ? String(wrong).trim() : '';

    if (!built.wrongOptions && wrongStr) {
      built.wrongOptions = {
        [wrongStr]: `"${wrongStr}" does not match the rule or meaning needed in this sentence.`
      };
    }

    if (built.grammarFocus && !built.vocabularyFocus) {
      if (wrongStr && built.wrongOptions && !built.wrongOptions[wrongStr]) {
        built.wrongOptions[wrongStr] = `"${wrongStr}" breaks the grammar pattern described above.`;
      }
    }

    return attachOptionContrast(item, built);
  }

  if (looksLikeTenseChoice(item)) {
    return buildTenseChoiceContent(item, legacy);
  }

  return attachOptionContrast(item, buildVocabularyContent(item, legacy));
}

function isTwoOptionChoiceItem(exercise, item) {
  return item.formatType === 'two_option_choice' ||
    exercise.exerciseType === 'two_option_choice';
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    for (const item of exercise.items || []) {
      if (!isTwoOptionChoiceItem(exercise, item)) continue;
      if (item.explanationContent && !item.explanation) continue;

      item.explanationContent = buildExplanationContent(item);
      delete item.explanation;
      changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  return changed;
}

function main() {
  const files = walkJsonFiles(COURSE_DIR);
  let total = 0;
  const touched = [];

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      total += n;
      touched.push({ file: path.relative(ROOT, file), count: n });
    }
  }

  console.log('Migrated', total, 'two_option_choice items in', touched.length, 'files');
  touched.forEach(({ file, count }) => console.log(' ', count, file));
}

main();
