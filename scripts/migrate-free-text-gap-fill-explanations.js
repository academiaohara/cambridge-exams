#!/usr/bin/env node
/**
 * Migrate free_text_gap_fill items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-free-text-gap-fill-explanations.js
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
    else if (name.endsWith('.v2.json')) files.push(full);
  }
  return files;
}

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

function sentenceText(item) {
  return stripMd(String(item.sentence || '').split('\n')[0]);
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function expandLegacyWhy(item, legacy) {
  const answer = String(item.answer || '').trim();
  const arrow = extractArrowParts(legacy);
  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    if (/works in all three/i.test(clue)) {
      return ensurePeriod(`"${answer}" is the one word that fits all three linked sentences`);
    }
    return ensurePeriod(`The clue is ${lower}, so the correct answer is "${answer}"`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    return ensurePeriod(`"${answer}" is the only form that completes the sentence correctly`);
  }
  return ensurePeriod(stripped);
}

function detectGrammarFocus(legacy, item) {
  const text = stripMd(legacy).toLowerCase();
  const sentence = sentenceText(item).toLowerCase();

  if (/past perfect|had already|before.*arrived|earlier past/i.test(text + ' ' + sentence)) {
    return 'Past perfect describes an action that happened before another past action.';
  }
  if (/present perfect|already|yet|ever|never|since|for \d|all (her|his|my|their) life/i.test(text + ' ' + sentence)) {
    return 'Present perfect links a past action to the present or unfinished time.';
  }
  if (/past simple|yesterday|last (night|week|year)|ago|in \d{4}/i.test(text + ' ' + sentence)) {
    return 'Past simple is used for finished actions at a specific past time.';
  }
  if (/passive|was \w+ed|were \w+ed|been \w+ed/i.test(text + ' ' + sentence)) {
    return 'Passive voice focuses on the action or object, not who performs it.';
  }
  if (/indirect (question|speech)|reported/i.test(text)) {
    return 'Indirect speech keeps statement word order — do not invert subject and auxiliary.';
  }
  if (/modal|advice|should|must|have to|don't have to|mustn't/i.test(text)) {
    return 'Modals express advice, obligation, permission, or prohibition — choose the nuance that matches the sentence.';
  }
  if (/conditional|would have|if.*had/i.test(text + ' ' + sentence)) {
    return 'Conditional sentences pair specific verb forms in the if-clause and main clause.';
  }
  if (/relative clause|who|which|that|whose|where/i.test(text + ' ' + sentence)) {
    return 'Relative clauses add detail about a noun — choose the pronoun that matches the antecedent.';
  }
  if (/article|a\/an|the|-/i.test(text) && /\ba\b|\ban\b|\bthe\b/i.test(sentence)) {
    return 'Articles show whether a noun is specific (the), new and countable (a/an), or general.';
  }
  if (/preposition|at|in|on|to|for|with/i.test(text)) {
    return 'Prepositions often form fixed patterns — learn them as chunks, not word by word.';
  }
  if (/comparative|superlative|more|most|-er|-est/i.test(text + ' ' + sentence)) {
    return 'Comparatives and superlatives compare people, things, or actions.';
  }
  if (/\(.*\)/.test(item.sentence || '') && !/phrasal|collocation/i.test(text)) {
    return 'Read the verb in brackets and choose the tense/form that matches the time clues in the sentence.';
  }
  if (/possibility|impossible|ability|permission/i.test(text)) {
    return 'Modal verbs express different degrees of possibility, ability, and permission.';
  }
  if (/double object|indirect object/i.test(text)) {
    return 'Some verbs take two objects — a person (indirect) and a thing (direct).';
  }
  if (/past regret|wish/i.test(text + ' ' + sentence)) {
    return 'Wish + past simple/past perfect expresses regret about the present or past.';
  }

  return '';
}

function detectVocabularyFocus(legacy, item) {
  const answer = String(item.answer || '').trim();
  const text = stripMd(legacy).toLowerCase();
  const sentence = sentenceText(item);

  if (/phrasal|particle|→/.test(text + legacy) && /\s/.test(answer)) {
    return `"${answer}" is a phrasal verb or fixed chunk that collocates with the rest of the sentence.`;
  }
  if (/collocation|fixed phrase|works in all three/i.test(text)) {
    return `"${answer}" collocates naturally with the words around the gap in this context.`;
  }
  if (/remain|recover|allergy|fresh|gain weight|eat less/i.test(text)) {
    return `The sentence paraphrases an idea that English expresses with "${answer}" — learn the chunk as a whole.`;
  }
  if (!detectGrammarFocus(legacy, item)) {
    return `"${answer}" is the only word or phrase that fits both grammar and meaning in: "${sentence.slice(0, 80)}${sentence.length > 80 ? '…' : ''}".`;
  }
  return '';
}

function buildCommonMistake(legacy, item) {
  const grammar = detectGrammarFocus(legacy, item);
  const answer = String(item.answer || '').trim();

  if (/past perfect/i.test(grammar)) {
    return 'Past simple only shows one past event — use past perfect when one past action happened before another.';
  }
  if (/present perfect/i.test(grammar)) {
    return 'Past simple is wrong when the sentence links past to now (for, since, already, yet, ever).';
  }
  if (/past simple/i.test(grammar)) {
    return 'Present perfect does not combine with finished past-time words like yesterday or last week.';
  }
  if (/phrasal|collocation/i.test(detectVocabularyFocus(legacy, item))) {
    return `Check the word order and particles — English often needs the full chunk "${answer}", not just one word.`;
  }
  if (/article/i.test(grammar)) {
    return 'Check whether the noun is specific, countable, or mentioned for the first time.';
  }
  if (/preposition/i.test(grammar)) {
    return 'Try saying the phrase aloud — the correct preposition is usually part of a fixed pattern.';
  }

  return 'Compare your answer with the grammar or vocabulary clue in the sentence — tense, form, or collocation may be wrong.';
}

function buildWrongOptions(item, legacy) {
  const answer = String(item.answer || '').trim().toLowerCase();
  const wrongOptions = {};
  const sentence = sentenceText(item).toLowerCase();

  if (/\bmuch\b/.test(sentence) && answer === 'many') {
    wrongOptions.much = 'Much is used with uncountable nouns, not countable plurals.';
  }
  if (/\bmany\b/.test(sentence) && answer === 'much') {
    wrongOptions.many = 'Many is used with countable plural nouns, not uncountable nouns.';
  }
  if (answer.startsWith('have ') || answer.startsWith('has ') || answer.startsWith("'ve") || answer.startsWith("'s")) {
    wrongOptions[answer.replace(/^(have|has) /, '')] = 'This form misses the auxiliary — present perfect needs have/has + past participle.';
  }
  if (answer.startsWith('had ')) {
    wrongOptions[answer.replace(/^had /, '')] = 'Without had, the earlier-past relationship is lost — use past perfect for the first of two past actions.';
  }

  return wrongOptions;
}

function buildUsefulTip(legacy, item) {
  const text = stripMd(legacy).toLowerCase();
  const sentence = sentenceText(item).toLowerCase();

  if (/→/.test(legacy)) {
    return 'The words before the arrow in the original note are your clue — match that meaning to the gap.';
  }
  if (/before|after|already|yet|since|for /i.test(sentence)) {
    return 'Underline time expressions first — they usually tell you which tense to use.';
  }
  if (/\(.*\)/.test(item.sentence || '')) {
    return 'Start from the verb in brackets, then adjust tense, person, and negative form to fit the sentence.';
  }
  if (/works in all three/i.test(text)) {
    return 'When one word fits several sentences, look for the shared meaning across all of them.';
  }
  return 'Read the full sentence with your answer inserted — if it sounds wrong, check tense, preposition, or word form.';
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const whyCorrect = expandLegacyWhy(item, legacy);
  const grammarFocus = detectGrammarFocus(legacy, item);
  const vocabularyFocus = !grammarFocus ? detectVocabularyFocus(legacy, item) : '';
  const wrongOptions = buildWrongOptions(item, legacy);
  const commonMistake = buildCommonMistake(legacy, item);
  const usefulTip = buildUsefulTip(legacy, item);

  const content = {
    whyCorrect,
    wrongOptions,
    commonMistake: ensurePeriod(commonMistake),
    usefulTip: ensurePeriod(usefulTip)
  };

  if (grammarFocus) content.grammarFocus = ensurePeriod(grammarFocus);
  if (vocabularyFocus) content.vocabularyFocus = ensurePeriod(vocabularyFocus);

  return content;
}

function migrateItem(item) {
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
    if (ft !== 'free_text_gap_fill') continue;
    for (const item of exercise.items || []) {
      if (migrateItem(item)) changed++;
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

  console.log('\nMigrated ' + total + ' free_text_gap_fill items across ' + fileCount + ' files.');
}

main();
