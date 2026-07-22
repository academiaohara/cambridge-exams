#!/usr/bin/env node
/**
 * Migrate mc_4_option items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-mc-4-option-explanations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildOptionContrastMap, ensureExplanationOptionContrast, ensurePeriod } from './lib/option-contrast.js';

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

function attachOptionContrast(item, content) {
  content.optionContrast = buildOptionContrastMap(item, content);
  return content;
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeOption(opt) {
  if (!opt) return { letter: '', text: '' };
  if (typeof opt === 'object' && opt.letter != null) {
    return {
      letter: String(opt.letter).trim().toUpperCase(),
      text: String(opt.text || '').trim()
    };
  }
  const raw = String(opt).trim();
  const match = raw.match(/^([A-D])\s*(.*)$/i);
  if (match) return { letter: match[1].toUpperCase(), text: match[2].trim() };
  return { letter: '', text: raw };
}

function getAnswerLetter(item) {
  return String(item.answer || '').trim().toUpperCase();
}

function getAnswerText(item) {
  const letter = getAnswerLetter(item);
  const opt = (item.options || []).map(normalizeOption).find((o) => o.letter === letter);
  return opt ? opt.text : letter;
}

function sentenceContext(item) {
  const before = String(item.sentenceBefore || '').trim();
  const after = String(item.sentenceAfter || '').trim();
  const prompt = String(item.prompt || item.sentence || '').trim();
  return { before, after, prompt, full: [before, after].filter(Boolean).join(' … ') };
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function expandLegacyWhy(item, legacy) {
  const answerText = getAnswerText(item);
  const arrow = extractArrowParts(legacy);
  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    if (/conditional|tense|phrase|collocation|regret|causative|comparative|purpose|contrast|indirect|possession|wh-/i.test(clue)) {
      return ensurePeriod(`The clue is ${lower}, so the correct answer is "${answerText}"`);
    }
    return ensurePeriod(`The context points to "${answerText}" — ${lower}`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) return ensurePeriod(`"${answerText}" is the only option that fits the grammar and meaning here`);
  return ensurePeriod(stripped);
}

function detectGrammarFocus(legacy, item) {
  const text = stripMd(legacy).toLowerCase();
  const { before, after, full } = sentenceContext(item);

  if (/zero conditional/.test(text)) {
    return 'Zero conditional: if + present simple, present simple — both clauses describe general truths or habits.';
  }
  if (/first conditional/.test(text)) {
    return 'First conditional: if + present simple, will + infinitive — a real possibility in the future.';
  }
  if (/second conditional/.test(text)) {
    return 'Second conditional: if + past simple, would + infinitive — an unreal or unlikely present/future situation.';
  }
  if (/third conditional/.test(text)) {
    return 'Third conditional: if + past perfect, would have + past participle — an unreal past situation and its past result.';
  }
  if (/causative/.test(text)) {
    return 'Causative structures (have/get something done) show that someone else performs the action for you.';
  }
  if (/indirect (question|speech)/.test(text)) {
    return 'Indirect questions keep statement word order — no inversion after the question phrase.';
  }
  if (/comparative/.test(text)) {
    return 'Comparatives compare two things; check whether the sentence needs -er, more, or a fixed comparative pattern.';
  }
  if (/possession/.test(text) || /'s|whose|belong/.test(full)) {
    return 'Possessive forms and possessive determiners show who something belongs to.';
  }
  if (/collocation/.test(text)) {
    return 'Some word pairs are fixed collocations — the correct option is the one native speakers combine naturally.';
  }
  if (/fixed phrase/.test(text)) {
    return 'Fixed phrases must be learned as whole chunks — individual words may not translate literally.';
  }
  if (/purpose/.test(text)) {
    return 'Purpose clauses explain why something is done (e.g. so that, in order to, to + infinitive).';
  }
  if (/contrast/.test(text)) {
    return 'Contrast linkers (although, however, despite) connect ideas that oppose each other.';
  }
  if (/past regret|wish/.test(text) || /wish/.test(full)) {
    return 'Wish + past simple/past perfect expresses regret about the present or past.';
  }
  if (/yesterday|last (week|night|year|weekend)|ago|in \d{4}/i.test(before + ' ' + after)) {
    return 'A finished past time marker (yesterday, last week, ago) requires the past simple, not a perfect tense.';
  }
  if (/for a long time|since|already|yet|just|never|ever|so far/i.test(before + ' ' + after)) {
    return 'Present perfect links past actions to now — look for markers like for, since, already, yet, or ever.';
  }
  if (/it's the first time/i.test(before + ' ' + after)) {
    return "After It's the first time, English uses the present perfect to describe a new experience.";
  }
  if (/will|going to/i.test(text)) {
    return 'Future forms (will, going to, present continuous) depend on whether the sentence predicts, plans, or arranges.';
  }

  return '';
}

function detectVocabularyFocus(legacy, item) {
  const answerText = getAnswerText(item);
  const { after } = sentenceContext(item);
  const text = stripMd(legacy).toLowerCase();

  if (/collocation|fixed phrase/.test(text)) {
    return `"${answerText}" collocates naturally with the words around the gap${
      after ? ` ("${after.slice(0, 60)}${after.length > 60 ? '…' : ''}")` : ''
    }.`;
  }

  if (text && !detectGrammarFocus(legacy, item)) {
    return `"${answerText}" is the only option that matches both meaning and register in this sentence.`;
  }

  return '';
}

function buildDistractorNote(item, wrongLetter, wrongText, legacy) {
  const answerText = getAnswerText(item);
  const text = stripMd(legacy).toLowerCase();

  if (/conditional/.test(text)) {
    if (/zero/.test(text)) return `"${wrongText}" belongs to a different conditional pattern — zero conditional needs present forms.`;
    if (/first/.test(text)) return `"${wrongText}" does not fit the first conditional pattern (if + present, will + infinitive).`;
    if (/second/.test(text)) return `"${wrongText}" does not fit the second conditional pattern (if + past, would + infinitive).`;
    if (/third/.test(text)) return `"${wrongText}" does not fit the third conditional pattern (if + past perfect, would have + past participle).`;
  }

  if (/past simple|yesterday|last /i.test(text + ' ' + sentenceContext(item).full)) {
    return `"${wrongText}" is the wrong tense for a finished past time in this sentence.`;
  }

  if (/present perfect|for a long time|since/i.test(text + ' ' + sentenceContext(item).full)) {
    return `"${wrongText}" does not express the present-perfect link to now that the sentence requires.`;
  }

  if (/collocation|fixed phrase/.test(text)) {
    return `"${wrongText}" does not form the natural collocation needed here — "${answerText}" fits better.`;
  }

  return `"${wrongText}" does not match the grammar or meaning clue in this sentence — "${answerText}" is correct.`;
}

function buildWrongOptions(item, legacy) {
  const answerLetter = getAnswerLetter(item);
  const wrongOptions = {};

  (item.options || []).map(normalizeOption).forEach((opt) => {
    if (!opt.letter && !opt.text) return;
    if (opt.letter === answerLetter) return;
    const note = buildDistractorNote(item, opt.letter, opt.text, legacy);
    if (opt.letter) wrongOptions[opt.letter] = note;
    if (opt.text) wrongOptions[opt.text] = note;
  });

  return wrongOptions;
}

function buildUsefulTip(legacy, item) {
  const text = stripMd(legacy).toLowerCase();
  const { before, after } = sentenceContext(item);

  if (/conditional/.test(text)) {
    return 'Name the conditional type first — that tells you which verb forms belong in each clause.';
  }
  if (/yesterday|last |ago/i.test(before + ' ' + after)) {
    return 'When you see a finished past-time expression, reach for the past simple first.';
  }
  if (/for |since |already|yet|ever|never/i.test(before + ' ' + after)) {
    return 'Time expressions like for, since, already, and yet are strong present-perfect signals.';
  }
  if (/collocation|fixed phrase/.test(text)) {
    return 'Read the words before and after the gap together — collocations are heard as a single chunk.';
  }
  return 'Eliminate options that break grammar first, then check which remaining word fits the meaning.';
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const whyCorrect = expandLegacyWhy(item, legacy);
  const grammarFocus = detectGrammarFocus(legacy, item);
  const vocabularyFocus = !grammarFocus ? detectVocabularyFocus(legacy, item) : '';
  const wrongOptions = buildWrongOptions(item, legacy);
  const usefulTip = buildUsefulTip(legacy, item);

  const content = {
    whyCorrect,
    wrongOptions,
    usefulTip: ensurePeriod(usefulTip)
  };

  if (grammarFocus) content.grammarFocus = ensurePeriod(grammarFocus);
  if (vocabularyFocus) content.vocabularyFocus = ensurePeriod(vocabularyFocus);

  return attachOptionContrast(item, content);
}

function isMc4Item(item, exerciseType) {
  return item.formatType === 'mc_4_option' || exerciseType === 'mc_4_option';
}

function migrateMc4Item(item) {
  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item);
  } else {
    ensureExplanationOptionContrast(item);
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
      if (!isMc4Item(item, ft)) continue;
      if (migrateMc4Item(item)) changed++;
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

  console.log('\nMigrated ' + total + ' mc_4_option items across ' + fileCount + ' files.');
}

main();
