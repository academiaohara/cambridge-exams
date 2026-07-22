#!/usr/bin/env node
/**
 * Migrate preselected_verb_gap_fill items (verb_tile items with verb pre-selected)
 * from legacy `explanation` strings to structured `explanationContent`.
 *
 * Usage: node scripts/migrate-preselected-verb-gap-fill-explanations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data', 'Course');

function walkJsonFiles(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJsonFiles(full, files);
    else if (name.endsWith('.json')) files.push(full);
  }
  return files;
}

function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

function baseVerb(item) {
  return String(item.selectedTileAnswer || item.preselectedVerb || item.baseVerb || '').trim();
}

function answerDisplay(item) {
  const ans = item.answer;
  if (Array.isArray(ans)) return ans.join(' / ');
  return String(ans || '').trim();
}

function isPreselectedItem(item, exerciseType) {
  if (item.formatType === 'preselected_verb_gap_fill') return true;
  if (exerciseType === 'preselected_verb_gap_fill') return true;
  if (exerciseType !== 'verb_tile_conjugation_gap') return false;
  return !!(item.selectedTileAnswer || item.preselectedVerb || item.baseVerb);
}

function detectGrammarFocus(legacy, item) {
  const text = String(legacy || '').toLowerCase();
  const sentence = String(item.sentence || item.blankSentence || '').toLowerCase();
  const verb = baseVerb(item).toLowerCase();

  if (/stative|belong|know|understand|prefer/i.test(text + ' ' + sentence + ' ' + verb)) {
    return 'Stative verbs describe states, not actions — they usually stay in the simple form, not continuous.';
  }
  if (/present continuous|happening now|action happening|temporary|today|now|at the moment/i.test(text + ' ' + sentence)) {
    return 'Present continuous (am/is/are + -ing) describes actions happening around now or temporary situations.';
  }
  if (/present simple|habit|routine|usually|always|every|fact|general/i.test(text + ' ' + sentence)) {
    return 'Present simple describes habits, facts, and routines — remember third person singular -s where needed.';
  }
  if (/past simple|finished|yesterday|last |ago|in \d{4}/i.test(text + ' ' + sentence)) {
    return 'Past simple describes finished actions in the past — use the past form of the pre-selected verb.';
  }
  if (/negative|didn't|did not/i.test(text)) {
    return "Past simple negatives use didn't + base verb — the main verb stays in the infinitive form.";
  }
  if (/question|are you|do you/i.test(sentence)) {
    return 'Questions need the correct auxiliary (do/does or am/is/are) plus the verb form that matches the tense.';
  }
  if (/singular|plural|-s\b|third person/i.test(text)) {
    return 'Check subject–verb agreement — singular subjects in present simple usually need -s on the verb.';
  }

  return verb
    ? `Conjugate "${verb}" to match the time clue and subject in the sentence.`
    : 'Choose the verb form that matches the tense and subject in the sentence.';
}

function buildCommonMistake(legacy, item) {
  const grammar = detectGrammarFocus(legacy, item);
  const verb = baseVerb(item);

  if (/present continuous/i.test(grammar)) {
    return `With "${verb}", use am/is/are + -ing for an action in progress — simple present sounds like a general habit here.`;
  }
  if (/present simple/i.test(grammar) && /stative/i.test(grammar) === false) {
    return 'Present continuous is for actions in progress — this sentence describes a habit, fact, or routine.';
  }
  if (/stative/i.test(grammar)) {
    return `Verbs like "${verb}" describe a state — avoid continuous forms unless the verb is deliberately used as an action.`;
  }
  if (/past simple/i.test(grammar)) {
    return 'Check you used the past form of the verb, not the base form or a present tense.';
  }

  return 'The verb is already chosen — your mistake is in the tense, auxiliary, or agreement of the form you typed.';
}

function buildWrongOptions(item, legacy) {
  const wrongOptions = {};
  const verb = baseVerb(item).toLowerCase();
  const answer = answerDisplay(item).toLowerCase();

  if (verb) {
    wrongOptions[verb] = `The base verb "${verb}" is not conjugated — add the correct tense ending or auxiliary.`;
  }
  if (answer.includes(' ')) {
    const parts = answer.split(' / ');
    parts.forEach((part) => {
      if (part && part !== verb) {
        wrongOptions[part] = 'This part of the answer does not match the required tense or auxiliary for the gap.';
      }
    });
  }

  return wrongOptions;
}

function buildUsefulTip(legacy, item) {
  const sentence = String(item.sentence || '').toLowerCase();
  if (/usually|always|every|often/i.test(sentence)) {
    return 'Frequency words like usually and always are strong signals for present simple.';
  }
  if (/now|today|at the moment|listen!/i.test(sentence)) {
    return 'Words that point to right now favour present continuous.';
  }
  if (/yesterday|last |ago/i.test(sentence)) {
    return 'Finished past-time words require past simple forms.';
  }
  return 'The verb choice is fixed — focus on tense, auxiliary, and subject–verb agreement.';
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const grammarFocus = ensurePeriod(detectGrammarFocus(legacy, item));
  const whyCorrect = legacy
    ? ensurePeriod(legacy)
    : ensurePeriod(`The correct form is "${answerDisplay(item)}" for the verb ${baseVerb(item)} in this context.`);

  return {
    whyCorrect,
    grammarFocus,
    wrongOptions: buildWrongOptions(item, legacy),
    commonMistake: ensurePeriod(buildCommonMistake(legacy, item)),
    usefulTip: ensurePeriod(buildUsefulTip(legacy, item))
  };
}

function migrateItem(item, exerciseType) {
  if (!isPreselectedItem(item, exerciseType)) return false;
  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item);
  }
  delete item.explanation;
  return true;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    const ft = exercise.exerciseType || exercise.interaction?.formatType;
    for (const item of exercise.items || []) {
      if (migrateItem(item, ft)) changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }
  return changed;
}

function main() {
  const files = walkJsonFiles(COURSE_DIR);
  let total = 0;
  let fileCount = 0;

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      total += n;
      fileCount++;
      console.log(path.relative(ROOT, file) + ': ' + n + ' items');
    }
  }

  console.log('\nMigrated ' + total + ' preselected_verb_gap_fill items across ' + fileCount + ' files.');
}

main();
