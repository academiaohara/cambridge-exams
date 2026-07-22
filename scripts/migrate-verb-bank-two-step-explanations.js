#!/usr/bin/env node
/**
 * Migrate verb_bank_two_step / verb_tile_conjugation_gap items
 * to structured step-aware `explanationContent` objects.
 *
 * Usage: node scripts/migrate-verb-bank-two-step-explanations.js
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
  return String(item.baseVerb || item.selectedTileAnswer || item.preselectedVerb || '').trim();
}

function answerDisplay(item) {
  const ans = item.answer;
  if (Array.isArray(ans)) return ans.join(' / ');
  return String(ans || '').trim();
}

function sentenceText(item) {
  return String(item.sentence || item.blankSentence || '').replace(/\.{3,}|…{2,}|_{3,}/g, ' ').trim();
}

function isVerbBankItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  return ft === 'verb_tile_conjugation_gap' ||
    ft === 'verb_bank_two_step' ||
    item.formatType === 'verb_tile_conjugation_gap' ||
    item.formatType === 'verb_bank_two_step';
}

function detectGrammarFocus(legacy, item, exercise) {
  const text = String(legacy || '').toLowerCase();
  const sentence = sentenceText(item).toLowerCase();
  const verb = baseVerb(item).toLowerCase();
  const grammar = String(exercise.grammarFocus || '').toLowerCase();

  if (/stative|belong|know|understand|prefer/i.test(text + ' ' + sentence + ' ' + verb)) {
    return 'Stative verbs describe states, not actions — they usually stay in the simple form, not continuous.';
  }
  if (/present continuous|happening now|action happening|temporary|today|now|at the moment/i.test(text + ' ' + sentence)) {
    return 'Present continuous (am/is/are + -ing) describes actions happening around now or temporary situations.';
  }
  if (/present simple|habit|routine|usually|always|every|fact|general/i.test(text + ' ' + sentence + ' ' + grammar)) {
    return 'Present simple describes habits, facts, and routines — remember third person singular -s where needed.';
  }
  if (/past simple|finished|yesterday|last |ago|in \d{4}/i.test(text + ' ' + sentence + ' ' + grammar)) {
    return 'Past simple describes finished actions in the past — use the past form of the chosen verb.';
  }
  if (/negative|didn't|did not/i.test(text)) {
    return "Past simple negatives use didn't + base verb — the main verb stays in the infinitive form.";
  }
  if (/\?/.test(sentence) || /are you|do you|does /i.test(sentence)) {
    return 'Questions need the correct auxiliary (do/does or am/is/are) plus the verb form that matches the tense.';
  }

  return verb
    ? `Conjugate "${verb}" to match the time clue and subject in the sentence.`
    : 'Choose the verb form that matches the tense and subject in the sentence.';
}

function buildWhyVerbFits(item, exercise) {
  const verb = baseVerb(item);
  const sentence = sentenceText(item).toLowerCase();

  if (!verb) {
    return ensurePeriod(`The correct form is "${answerDisplay(item)}" for this sentence.`);
  }

  if (/belong/.test(verb)) {
    return ensurePeriod('"Belong" describes possession or membership — it collocates with "to" and states, not actions.');
  }
  if (/listen/.test(verb) && /radio|music|to /.test(sentence)) {
    return ensurePeriod('"Listen" collocates with "to the radio" — the sentence asks about an action happening now.');
  }
  if (/stay/.test(verb) && /hotel|home|house|summer/.test(sentence)) {
    return ensurePeriod('"Stay" fits places where people live or sleep temporarily, such as hotels.');
  }
  if (/wear/.test(verb) && /uniform|clothes|jacket|hat|jeans/.test(sentence)) {
    return ensurePeriod('"Wear" collocates with clothing — pick it when the sentence is about what someone has on.');
  }
  if (/help/.test(verb)) {
    return ensurePeriod('"Help" fits when someone gives assistance that matches the object in the sentence.');
  }
  if (/look/.test(verb) && /for |keys|watch/.test(sentence)) {
    return ensurePeriod('"Look for" describes searching — the context signals an action in progress.');
  }
  if (/carry/.test(verb) && /bag|box|case|luggage/.test(sentence)) {
    return ensurePeriod('"Carry" fits when someone moves an object with them.');
  }
  if (/do/.test(verb) && /shopping|homework|exercise/.test(sentence)) {
    return ensurePeriod('"Do" collocates with activities like shopping or homework.');
  }
  if (/bring/.test(verb) && /water|food|book|bottle/.test(sentence)) {
    return ensurePeriod('"Bring" means take something to a person or place — it fits giving someone an object.');
  }
  if (/write/.test(verb) && /article|letter|email|story/.test(sentence)) {
    return ensurePeriod('"Write" collocates with texts such as articles, letters, or stories.');
  }
  if (/buy/.test(verb) && /ticket|phone|car|popcorn|present/.test(sentence)) {
    return ensurePeriod('"Buy" fits when someone purchases an object mentioned in the sentence.');
  }
  if (/find/.test(verb) && /wallet|keys|ticket|phone/.test(sentence)) {
    return ensurePeriod('"Find" fits when someone discovers a lost object.');
  }
  if (/meet/.test(verb) && /friend|class|teacher|someone/.test(sentence)) {
    return ensurePeriod('"Meet" collocates with people — use it when the sentence is about seeing someone.');
  }
  if (/drive/.test(verb) && /car|home|work|school/.test(sentence)) {
    return ensurePeriod('"Drive" fits when someone travels by car.');
  }
  if (/leave/.test(verb) && /house|school|work|early/.test(sentence)) {
    return ensurePeriod('"Leave" means go away from a place — it matches departure contexts.');
  }
  if (/speak/.test(verb) && /english|french|language|teacher/.test(sentence)) {
    return ensurePeriod('"Speak" collocates with languages and communication contexts.');
  }

  const grammar = String(exercise.grammarFocus || '').trim();
  if (grammar) {
    return ensurePeriod(`"${verb}" is the verb from the bank that best matches this ${grammar.toLowerCase()} sentence.`);
  }

  return ensurePeriod(`"${verb}" is the verb that best matches the meaning of this sentence.`);
}

function buildVocabularyFocus(item, exercise) {
  const verb = baseVerb(item).toLowerCase();
  const grammar = String(exercise.grammarFocus || '').toLowerCase();

  if (/belong|know|understand|prefer|need|want|like|love|hate|own/.test(verb)) {
    return 'Some verbs describe states (belong, know, prefer) — they often stay in simple tenses, not continuous.';
  }
  if (/past simple/.test(grammar)) {
    return 'Past simple verbs in the bank describe finished actions — pick the one that matches the sentence meaning.';
  }
  if (/present continuous|simple or continuous/.test(grammar)) {
    return 'Decide whether the sentence describes a routine (simple) or an action happening now (continuous) before choosing the verb.';
  }
  return 'Read the whole sentence first — the correct base verb must collocate with the words around the gap.';
}

function buildWrongVerbs(item, exercise) {
  const wrongVerbs = {};
  const verb = baseVerb(item).toLowerCase();
  const bank = exercise.wordBank || exercise.words || [];

  bank.forEach((word) => {
    const key = String(word).trim();
    if (!key || key.toLowerCase() === verb) return;
    wrongVerbs[key] = `"${key}" does not fit the meaning of this sentence — choose a verb that collocates with the context.`;
  });

  return wrongVerbs;
}

function buildWrongOptions(item, legacy) {
  const wrongOptions = {};
  const verb = baseVerb(item).toLowerCase();
  const answer = answerDisplay(item).toLowerCase();

  if (verb) {
    wrongOptions[verb] = `The base verb "${verb}" is not conjugated — add the correct tense ending or auxiliary.`;
  }
  if (answer.includes(' / ')) {
    answer.split(' / ').forEach((part) => {
      if (part && part !== verb) {
        wrongOptions[part] = 'This part of the answer does not match the required tense or auxiliary for the gap.';
      }
    });
  }

  return wrongOptions;
}

function buildCommonMistakeStep1(item) {
  const verb = baseVerb(item);
  return ensurePeriod(`"${verb}" is the verb that fits this sentence — other tiles describe different actions or collocations.`);
}

function buildCommonMistakeStep2(legacy, item) {
  const grammar = detectGrammarFocus(legacy, item, {});
  const verb = baseVerb(item);

  if (/present continuous/i.test(grammar)) {
    return ensurePeriod(`With "${verb}", use am/is/are + -ing for an action in progress — simple present sounds like a general habit here.`);
  }
  if (/present simple/i.test(grammar) && !/stative/i.test(grammar)) {
    return 'Present continuous is for actions in progress — this sentence describes a habit, fact, or routine.';
  }
  if (/stative/i.test(grammar)) {
    return ensurePeriod(`Verbs like "${verb}" describe a state — avoid continuous forms unless the verb is deliberately used as an action.`);
  }
  if (/past simple/i.test(grammar)) {
    return 'Check you used the past form of the verb, not the base form or a present tense.';
  }
  if (/negative/i.test(grammar)) {
    return "Use didn't + base verb for past negatives — do not conjugate the main verb after didn't.";
  }

  return 'The verb is already chosen — your mistake is in the tense, auxiliary, or agreement of the form you typed.';
}

function buildUsefulTip(legacy, item) {
  const sentence = sentenceText(item).toLowerCase();
  if (/usually|always|every|often|on fridays/i.test(sentence)) {
    return 'Frequency words like usually and always are strong signals for present simple.';
  }
  if (/now|today|at the moment|listen!/i.test(sentence)) {
    return 'Words that point to right now favour present continuous.';
  }
  if (/yesterday|last |ago/i.test(sentence)) {
    return 'Finished past-time words require past simple forms.';
  }
  return 'Step 1: pick the verb that fits the meaning. Step 2: conjugate it to match the tense clues.';
}

function buildSentenceBreakdown(item) {
  const completed = String(item.completedSentence || '').trim();
  if (completed) return completed;
  const answer = answerDisplay(item);
  const sentence = sentenceText(item);
  if (sentence && answer) {
    return ensurePeriod(sentence.replace(/\s+/g, ' ').replace(/\.+$/, '') + ' → ' + answer);
  }
  return answer;
}

function buildExplanationContent(item, exercise) {
  const legacy = item.explanation || '';
  const existing = item.explanationContent || {};
  const grammarFocus = existing.grammarFocus || ensurePeriod(detectGrammarFocus(legacy, item, exercise));
  const whyCorrect = existing.whyCorrect || (legacy
    ? ensurePeriod(legacy)
    : ensurePeriod(`The correct form is "${answerDisplay(item)}" for the verb ${baseVerb(item) || 'in the gap'} in this context.`));

  return {
    whyVerbFits: existing.whyVerbFits || buildWhyVerbFits(item, exercise),
    vocabularyFocus: existing.vocabularyFocus || buildVocabularyFocus(item, exercise),
    wrongVerbs: Object.keys(existing.wrongVerbs || {}).length ? existing.wrongVerbs : buildWrongVerbs(item, exercise),
    whyCorrect,
    grammarFocus,
    wrongOptions: Object.keys(existing.wrongOptions || {}).length ? existing.wrongOptions : buildWrongOptions(item, legacy),
    commonMistakeStep1: existing.commonMistakeStep1 || buildCommonMistakeStep1(item),
    commonMistakeStep2: existing.commonMistakeStep2 || existing.commonMistake || buildCommonMistakeStep2(legacy, item),
    commonMistake: existing.commonMistake || buildCommonMistakeStep2(legacy, item),
    sentenceBreakdown: existing.sentenceBreakdown || buildSentenceBreakdown(item),
    usefulTip: existing.usefulTip || buildUsefulTip(legacy, item)
  };
}

function migrateItem(item, exercise) {
  if (!isVerbBankItem(item, exercise)) return false;

  item.explanationContent = buildExplanationContent(item, exercise);
  delete item.explanation;
  return true;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  const exercises = data.contentBanks?.exercises ||
    (Array.isArray(data.sections) ? data.sections.filter((s) => s.type === 'exercise') : []);

  for (const exercise of exercises) {
    for (const item of exercise.items || []) {
      if (migrateItem(item, exercise)) changed++;
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

  console.log('\nDone. Migrated ' + total + ' items across ' + fileCount + ' files.');
}

main();
