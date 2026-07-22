#!/usr/bin/env node
/**
 * Migrate conjugation_gap_fill items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-conjugation-gap-fill-explanations.js
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

function verbBracket(item) {
  const match = String(item.sentence || '').match(/\(([^)]+)\)/);
  return match ? match[1].trim() : String(item.verbPrompt || '').trim();
}

function rootWord(item) {
  const bracket = verbBracket(item);
  const rootMatch = bracket.match(/^([A-Z]{3,})$/);
  return rootMatch ? rootMatch[1] : '';
}

function isWordFormationItem(item) {
  const bracket = verbBracket(item);
  return /^[A-Z]{3,}$/.test(bracket);
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
    return ensurePeriod(`The clue is ${lower}, so the correct answer is "${answer}"`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    const verb = verbBracket(item);
    return ensurePeriod(
      verb
        ? `From (${verb}), the correct form here is "${answer}"`
        : `"${answer}" is the correct form for this sentence`
    );
  }
  return ensurePeriod(stripped);
}

function buildWordFormationNote(item, legacy) {
  const root = rootWord(item);
  const answer = String(item.answer || '').trim();
  if (!root) return '';

  const text = stripMd(legacy).toLowerCase();
  let suffix = '';
  if (/adjective/i.test(text) || /-ive|-ful|-less|-ous|-al|-ic\b/i.test(answer)) {
    suffix = 'Change the word class to an adjective with the right suffix.';
  } else if (/noun/i.test(text)) {
    suffix = 'Change the word class to a noun with the right suffix.';
  } else if (/activity|verb/i.test(text) || answer.endsWith('ing')) {
    suffix = 'Use the -ing form for an activity or gerund.';
  } else if (/adverb/i.test(text) || answer.endsWith('ly')) {
    suffix = 'Add -ly to form the adverb.';
  } else {
    suffix = 'Apply the correct suffix or word form from the root.';
  }

  return ensurePeriod(`${root} → ${answer}: ${suffix}`);
}

function detectGrammarFocus(legacy, item) {
  if (isWordFormationItem(item)) return '';

  const text = stripMd(legacy).toLowerCase();
  const sentence = sentenceText(item).toLowerCase();
  const verb = verbBracket(item).toLowerCase();

  if (/zero conditional/.test(text)) {
    return 'Zero conditional: if + present simple, present simple — both clauses describe general truths.';
  }
  if (/first conditional/.test(text)) {
    return 'First conditional: if + present simple, will + infinitive — a real future result.';
  }
  if (/second conditional/.test(text)) {
    return 'Second conditional: if + past simple, would + infinitive — an unreal present/future situation.';
  }
  if (/third conditional/.test(text)) {
    return 'Third conditional: if + past perfect, would have + past participle — an unreal past result.';
  }
  if (/present perfect|already|yet|ever|never|since|for \d|all (her|his|my|their) life|today|just/i.test(text + ' ' + sentence)) {
    return 'Present perfect (have/has + past participle) links past actions to now or unfinished time.';
  }
  if (/past perfect|before.*arrived|earlier|already.*when/i.test(text + ' ' + sentence)) {
    return 'Past perfect (had + past participle) shows the earlier of two past actions.';
  }
  if (/past simple|yesterday|last (night|week|year)|ago|in \d{4}|irregular/i.test(text + ' ' + sentence)) {
    return 'Past simple is used for finished actions at a specific past time — watch irregular past forms.';
  }
  if (/passive|was \w+ed|were \w+ed|been \w+ed/i.test(text + ' ' + sentence)) {
    return 'Passive voice uses be + past participle — the focus is on the action, not the doer.';
  }
  if (/future|will |going to/i.test(text + ' ' + sentence)) {
    return 'Choose the future form that matches whether the sentence predicts, plans, or arranges.';
  }
  if (/superlative|most |-est\b/i.test(text + ' ' + answerHint(item))) {
    return 'Superlatives compare one thing with all others in a group (the most / the -est).';
  }
  if (/comparative|-er\b|more /i.test(text + ' ' + answerHint(item))) {
    return 'Comparatives compare two things (-er or more + adjective).';
  }
  if (/modal|should|must|can|could|may|might|have to/i.test(text + ' ' + sentence)) {
    return 'Modals and semi-modals express ability, obligation, permission, or possibility — match the nuance in the sentence.';
  }
  if (verb && !isWordFormationItem(item)) {
    return `Conjugate (${verb}) to match the subject and the time clues in the sentence.`;
  }

  return '';
}

function answerHint(item) {
  return String(item.answer || '').toLowerCase();
}

function detectVocabularyFocus(legacy, item) {
  if (!isWordFormationItem(item)) return '';

  const answer = String(item.answer || '').trim();
  const root = rootWord(item);
  return `"${answer}" is the word-formation answer from the root ${root} in this context.`;
}

function buildCommonMistake(legacy, item) {
  const answer = String(item.answer || '').trim();

  if (isWordFormationItem(item)) {
    return `Check the suffix and word class — the gap needs the form of ${rootWord(item)} that fits grammatically, not just the root.`;
  }

  const grammar = detectGrammarFocus(legacy, item);
  if (/present perfect/i.test(grammar)) {
    return 'Past simple misses the link to now — present perfect needs have/has + past participle.';
  }
  if (/past perfect/i.test(grammar)) {
    return 'Past simple only shows one past event — use had + past participle for the earlier action.';
  }
  if (/past simple/i.test(grammar)) {
    return 'Present perfect does not combine with finished past-time words like yesterday or last week.';
  }
  if (/passive/i.test(grammar)) {
    return 'Active voice puts the wrong focus here — passive needs be + past participle.';
  }

  return 'Check subject–verb agreement, tense, and whether the verb form matches the time clues in the sentence.';
}

function buildWrongOptions(item, legacy) {
  const answer = String(item.answer || '').trim().toLowerCase();
  const wrongOptions = {};
  const verb = verbBracket(item).toLowerCase();

  if (!isWordFormationItem(item) && answer.startsWith('have ')) {
    wrongOptions[answer.replace(/^have /, '')] = 'Missing auxiliary have — present perfect needs have + past participle.';
  }
  if (!isWordFormationItem(item) && answer.startsWith('has ')) {
    wrongOptions[answer.replace(/^has /, '')] = 'Missing auxiliary has — third person singular present perfect needs has + past participle.';
  }
  if (!isWordFormationItem(item) && answer.startsWith('had ')) {
    wrongOptions[answer.replace(/^had /, '')] = 'Without had, the earlier-past relationship is lost.';
  }
  if (isWordFormationItem(item) && rootWord(item)) {
    wrongOptions[rootWord(item).toLowerCase()] = `The root ${rootWord(item)} cannot fill the gap alone — you need a derived form like "${answer}".`;
  }
  if (verb && !isWordFormationItem(item)) {
    wrongOptions[verb] = `The bare infinitive (${verb}) is not conjugated — adjust tense and person to fit the sentence.`;
  }

  return wrongOptions;
}

function buildUsefulTip(legacy, item) {
  const text = stripMd(legacy).toLowerCase();
  const sentence = sentenceText(item).toLowerCase();

  if (isWordFormationItem(item)) {
    return 'Identify the word class needed (noun, adjective, adverb) before choosing the suffix from the root in capitals.';
  }
  if (/already|yet|since|for |ever|never|today/i.test(sentence + ' ' + text)) {
    return 'Time words like already, yet, since, and for are strong signals for present perfect.';
  }
  if (/yesterday|last |ago/i.test(sentence)) {
    return 'A finished past-time expression usually requires the past simple, not a perfect tense.';
  }
  if (/conditional/.test(text)) {
    return 'Name the conditional type first — that tells you which verb forms belong in each clause.';
  }
  return 'Read the subject and any time expressions before you conjugate — they decide tense and agreement.';
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const whyCorrect = expandLegacyWhy(item, legacy);
  const wordFormation = isWordFormationItem(item) ? buildWordFormationNote(item, legacy) : '';
  const grammarFocus = detectGrammarFocus(legacy, item);
  const vocabularyFocus = detectVocabularyFocus(legacy, item);
  const wrongOptions = buildWrongOptions(item, legacy);
  const commonMistake = buildCommonMistake(legacy, item);
  const usefulTip = buildUsefulTip(legacy, item);

  const content = {
    whyCorrect,
    wrongOptions,
    commonMistake: ensurePeriod(commonMistake),
    usefulTip: ensurePeriod(usefulTip)
  };

  if (wordFormation) content.wordFormation = wordFormation;
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
    if (ft !== 'conjugation_gap_fill') continue;
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

  console.log('\nMigrated ' + total + ' conjugation_gap_fill items across ' + fileCount + ' files.');
}

main();
