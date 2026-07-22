#!/usr/bin/env node
/**
 * Migrate passage_gap_fill exercises from legacy explanations[] strings
 * to structured gapExplanationContent[] objects.
 *
 * Usage: node scripts/migrate-passage-gap-fill-explanations.js
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

function parsePassageStemWords(passage) {
  const stems = {};
  const re = /\((\d+)\)\s*(?:\.{3,}|…{2,}|_{3,})\s*\(([A-Z][A-Z0-9'-]*)\)/g;
  let match;
  while ((match = re.exec(passage)) !== null) {
    stems[parseInt(match[1], 10)] = match[2];
  }
  const c1Re = /…\((\d+)\)…\s*\(([A-Z][A-Z0-9'-]*)\)/g;
  while ((match = c1Re.exec(passage)) !== null) {
    stems[parseInt(match[1], 10)] = match[2];
  }
  return stems;
}

function getGapNumberStart(passage) {
  const match = passage.match(/\((\d+)\)\s*(?:\.{3,}|…{2,}|_{3,})/);
  return match ? parseInt(match[1], 10) : 1;
}

function extractGapLine(passage, gapNumber) {
  const lines = String(passage || '').split('\n');
  const token = `(${gapNumber})`;
  for (const line of lines) {
    if (line.includes(token)) {
      return stripMd(line.replace(/\.{3,}|…{2,}|_{3,}|…\(\d+\)…/g, ' ___ '));
    }
  }
  return '';
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function expandLegacyWhy(answer, legacy, gapLine) {
  const arrow = extractArrowParts(legacy);
  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    if (/noun from|adjective from|adverb from|verb from|negative/i.test(clue)) {
      return ensurePeriod(`The clue is ${lower}, so the correct answer is "${answer}"`);
    }
    return ensurePeriod(`The clue is ${lower}, so "${answer}" fits this gap`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    return ensurePeriod(`"${answer}" is the only word that completes this gap in the passage`);
  }
  return ensurePeriod(stripped);
}

function detectWordFormation(legacy, stem, answer) {
  if (!stem) return '';
  const text = stripMd(legacy).toLowerCase();
  const stemUpper = stem.toUpperCase();
  let rule = 'Apply the correct suffix or word form from the root';

  if (/adverb/i.test(text)) rule = 'Add the adverb suffix (-ly) or use the adverb form';
  else if (/adjective/i.test(text) || /negative/i.test(text)) rule = 'Use the adjective form (often -ive, -able, or a negative prefix)';
  else if (/noun/i.test(text)) rule = 'Use the noun form (often -tion, -ment, -ity, or -ness)';
  else if (/verb/i.test(text) || /-ing\b/.test(answer)) rule = 'Use the verb form that fits the grammar of the sentence';
  else if (/plural/i.test(text)) rule = 'Use the plural noun form';

  return `${stemUpper} → ${answer}: ${rule}.`;
}

function detectGrammarFocus(legacy, gapLine, answer) {
  const text = stripMd(legacy).toLowerCase();
  const line = gapLine.toLowerCase();

  if (/present perfect continuous|been \w+ing|have been|has been/i.test(text + ' ' + line + ' ' + answer)) {
    return 'Present perfect continuous describes an action that started in the past and is still ongoing or recently finished.';
  }
  if (/present perfect|have \w+ed|has \w+ed/i.test(text + ' ' + line)) {
    return 'Present perfect links a past action to the present or unfinished time.';
  }
  if (/past simple|yesterday|last (night|week|year)|ago/i.test(text + ' ' + line)) {
    return 'Past simple is used for finished actions at a specific past time.';
  }
  if (/relative clause|who|which|that\b/i.test(text + ' ' + line)) {
    return 'Relative clauses add detail about a noun — choose who/which/that to match the antecedent.';
  }
  if (/passive|were \w+ed|was \w+ed|been \w+ed/i.test(text + ' ' + line)) {
    return 'Passive voice uses be + past participle — the focus is on the action, not the doer.';
  }
  if (/phrasal verb|fixed phrase|collocation|keen on|crazy about|take part|listen to|good at/i.test(text + ' ' + line)) {
    return 'Some gaps need a fixed preposition or phrasal-verb pattern — learn them as chunks.';
  }
  if (/article|\ba\b|\ban\b|\bthe\b/i.test(text + ' ' + line)) {
    return 'Articles show whether a noun is specific (the), new and countable (a/an), or general.';
  }
  if (/preposition| at | in | on | to | for | with | from | against /i.test(text + ' ' + line)) {
    return 'Prepositions often form fixed patterns with nouns, verbs, and adjectives in context.';
  }
  if (/modal|could|would|might/i.test(text + ' ' + line)) {
    return 'Modal verbs express possibility, ability, or hypothetical meaning in context.';
  }
  if (/\(you \/|\(I \/|\(we \/|\(he \/|\(she \//i.test(line)) {
    return 'Read the subject and time clues in the brackets, then choose the correct tense and person.';
  }

  return '';
}

function buildWrongOptions(answer, stem, legacy, gapLine) {
  const wrongOptions = {};
  const lowerAnswer = String(answer).trim().toLowerCase();

  if (stem) {
    wrongOptions[stem.toLowerCase()] = `The root ${stem} cannot fill the gap alone — you need a derived form like "${answer}".`;
    if (lowerAnswer.endsWith('ly')) {
      wrongOptions[lowerAnswer.replace(/ly$/, '')] = 'An adjective cannot modify a verb here — use the adverb form.';
    }
  }

  if (lowerAnswer.startsWith('have ') || lowerAnswer.startsWith("i've ") || lowerAnswer.startsWith("we've ")) {
    wrongOptions[lowerAnswer.replace(/^(have |i've |we've )/, '')] = 'Missing the auxiliary — present perfect needs have/has + past participle or been + -ing.';
  }
  if (lowerAnswer.startsWith('has ')) {
    wrongOptions[lowerAnswer.replace(/^has /, '')] = 'Missing has — third person singular present perfect needs has + past participle.';
  }
  if (lowerAnswer.startsWith('had ')) {
    wrongOptions[lowerAnswer.replace(/^had /, '')] = 'Without had, the earlier-past relationship is lost.';
  }
  if (/^a |^an |^the /.test(lowerAnswer)) {
    wrongOptions[lowerAnswer.replace(/^(a|an|the) /, '')] = 'The gap needs an article before the noun in this context.';
  }

  if (/preposition|keen|good at|listen to|take part|crazy about/i.test(stripMd(legacy).toLowerCase() + gapLine)) {
  }

  return wrongOptions;
}

function buildCommonMistake(answer, stem, legacy) {
  const text = stripMd(legacy).toLowerCase();
  if (stem) {
    return `Check the suffix and word class — the gap needs the form of ${stem} that fits grammatically, not just the root.`;
  }
  if (/present perfect continuous|been \w+ing/i.test(text)) {
    return 'Past simple or present simple misses the ongoing link — use have/has been + -ing for continuous duration.';
  }
  if (/present perfect/i.test(text)) {
    return 'Past simple misses the link to now — present perfect needs have/has + past participle.';
  }
  if (/phrasal|preposition|collocation/i.test(text)) {
    return 'Another preposition may look similar, but only one forms the natural collocation in this line.';
  }
  return 'Read the whole line in the passage — tense, preposition, or word form must match the surrounding context.';
}

function buildUsefulTip(legacy, gapLine, stem) {
  const text = stripMd(legacy).toLowerCase();
  const line = gapLine.toLowerCase();

  if (stem) {
    return 'Identify the word class needed (noun, adjective, adverb) before choosing the suffix from the root in capitals.';
  }
  if (/all day|since|for |all afternoon/i.test(line + ' ' + text)) {
    return 'Duration phrases (all day, since, for) often signal present perfect or continuous forms.';
  }
  if (/keen|good at|crazy about|take part|listen to/i.test(line)) {
    return 'Word-pattern gaps are fixed chunks — memorise the preposition that follows the key word.';
  }
  if (/\(you \/|\(I \//i.test(line)) {
    return 'The verb in brackets shows the base form — conjugate it to match the subject and tense clues in the line.';
  }
  return 'Read the sentence before and after the gap — the story context usually signals tense and word choice.';
}

function buildGapExplanationContent(exercise, idx, gapNumber) {
  const passage = exercise.passage || '';
  const answers = exercise.answers || [];
  const answer = String(answers[idx] || '').trim();
  const legacy = (exercise.explanations || exercise.gapExplanations || [])[idx] || '';
  const stems = parsePassageStemWords(passage);
  const stem = stems[gapNumber] || '';
  const gapLine = extractGapLine(passage, gapNumber);
  const isWordFormation = exercise.legacyPattern === 'passage-wf' || !!stem;

  const whyCorrect = expandLegacyWhy(answer, legacy, gapLine);
  const content = {
    whyCorrect,
    wrongOptions: buildWrongOptions(answer, stem, legacy, gapLine),
    commonMistake: ensurePeriod(buildCommonMistake(answer, stem, legacy)),
    usefulTip: ensurePeriod(buildUsefulTip(legacy, gapLine, stem))
  };

  if (isWordFormation && stem) {
    content.wordFormation = detectWordFormation(legacy, stem, answer);
    content.grammarFocus = ensurePeriod(`Word formation from ${stem}: choose the form that matches the grammar of the line.`);
  } else {
    const grammarFocus = detectGrammarFocus(legacy, gapLine, answer);
    if (grammarFocus) {
      content.grammarFocus = ensurePeriod(grammarFocus);
    } else {
      content.vocabularyFocus = ensurePeriod(`"${answer}" fits the meaning and grammar of this line in the passage.`);
    }
  }

  return content;
}

function migrateExercise(exercise) {
  if (exercise.exerciseType !== 'passage_gap_fill') return 0;

  const answers = exercise.answers || [];
  if (!answers.length) return 0;

  const startGap = getGapNumberStart(exercise.passage || '');
  const existing = exercise.gapExplanationContent || [];
  let changed = 0;

  exercise.gapExplanationContent = answers.map((ans, idx) => {
    if (existing[idx] && existing[idx].whyCorrect) return existing[idx];
    changed++;
    return buildGapExplanationContent(exercise, idx, startGap + idx);
  });

  if (exercise.explanations) {
    delete exercise.explanations;
    changed++;
  }
  if (exercise.gapExplanations) {
    delete exercise.gapExplanations;
    changed++;
  }

  return changed > 0 ? answers.length : 0;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    changed += migrateExercise(exercise);
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }
  return changed;
}

function main() {
  const files = walkJsonFiles(COURSE_DIR);
  let totalGaps = 0;
  let fileCount = 0;

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      totalGaps += n;
      fileCount++;
      console.log(path.relative(ROOT, file) + ': ' + n + ' gaps');
    }
  }

  console.log('\nDone. Migrated ' + totalGaps + ' gaps across ' + fileCount + ' files.');
}

main();
