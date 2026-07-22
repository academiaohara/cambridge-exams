#!/usr/bin/env node
/**
 * Migrate synced_gap_fill items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-synced-gap-fill-explanations.js
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

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

function fillSentence(sentence, answer) {
  return stripMd(String(sentence).replace(/(?:\.{3,}|…{2,}|_{3,})/g, answer || '___'));
}

function parseAllThreeLegacy(legacy, answer) {
  const stripped = stripMd(legacy);
  const match = stripped.match(/^all three need\s+(.+?)\s*[—–-]\s*(.+)$/i);
  if (!match) return null;
  const parsedAnswer = match[1].trim();
  const senses = match[2].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  return {
    answer: parsedAnswer || answer,
    senses
  };
}

function expandLegacyWhy(item, legacy) {
  const answer = String(item.answer || '').trim();
  const parsed = parseAllThreeLegacy(legacy, answer);
  if (parsed) {
    if (parsed.senses.length >= 2) {
      return ensurePeriod(
        `"${answer}" works in all three sentences — ${parsed.senses.join('; ')}`
      );
    }
    return ensurePeriod(`"${answer}" is the one word that fits all three sentence contexts`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    return ensurePeriod(`"${answer}" is the only word that completes all three sentences correctly`);
  }
  return ensurePeriod(stripped);
}

function detectGrammarFocus(item, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const answer = String(item.answer || '').trim().toLowerCase();
  const sentences = (item.sentences || []).map(fillSentence).join(' ').toLowerCase();

  if (/point of view|make sense|bear in mind|take into account|out of focus|sense of humour/i.test(text + sentences)) {
    return 'The same word can appear in different fixed phrases — each sentence uses a different collocation with the same core noun or verb.';
  }
  if (/polysem|different meaning|same word/i.test(text)) {
    return 'One word can have several related meanings — here it must work in all three contexts at once.';
  }
  if (sentences.includes('would you ') && answer === 'mind') {
    return 'Mind appears in polite requests (would you mind), decisions (make up her mind), and reminders (bear in mind).';
  }
  if (answer === 'come' || /come to|come as/i.test(sentences)) {
    return 'Come combines with different prepositions and patterns (come to a conclusion, come to leave, come as a surprise).';
  }
  if (answer === 'head' || /head towards|head the/i.test(sentences)) {
    return 'Head works as a verb of movement and as a verb meaning to lead or reach the top of a list.';
  }

  return 'Look for one word that forms a natural collocation or phrase in every sentence — not just one or two.';
}

function buildWrongOptions(item, legacy) {
  const answer = String(item.answer || '').trim().toLowerCase();
  const wrongOptions = {};
  const parsed = parseAllThreeLegacy(legacy, answer);

  if (parsed && parsed.senses.length) {
    parsed.senses.forEach((sense) => {
      const token = sense.split(/\s+/).pop()?.replace(/[.,]$/, '');
      if (token && token.toLowerCase() !== answer) {
        wrongOptions[token] = `"${token}" may fit one phrase but does not work in all three sentences here.`;
      }
    });
  }

  const nearMisses = {
    focus: { concentrate: 'Concentrate fits the first idea but not marketing focus or out of focus.' },
    mind: { brain: 'Brain is a noun for the organ, not the verb/noun patterns needed here.' },
    view: { sight: 'Sight does not collocate with point of view or change his view in the same way.' },
    sense: { feeling: 'Feeling does not form make sense or sense of humour.' },
    conclusion: { decision: 'Decision does not fit jump to conclusions or In conclusion.' },
    doubt: { question: 'Question does not match no doubt, beyond doubt, or serious doubts.' },
    account: { report: 'Report does not form take into account or give an account in the same way.' },
    drove: { pushed: 'Pushed does not collocate naturally with drove someone mad or drove the point home.' },
    head: { lead: 'Lead fits one context but not head towards or head the bestseller list.' },
    come: { go: 'Go does not form come to a conclusion or come as a surprise.' },
    steady: { stable: 'Stable does not collocate with steady pace, steady relationship, steady look.' }
  };

  if (nearMisses[answer]) {
    Object.assign(wrongOptions, nearMisses[answer]);
  }

  return wrongOptions;
}

function buildCommonMistake(item, legacy) {
  const answer = String(item.answer || '').trim();
  const text = stripMd(legacy).toLowerCase();

  if (/all three/i.test(text)) {
    return `A word that fits only one or two sentences is not enough — "${answer}" must work in all three contexts.`;
  }
  return 'Read all three sentences with your word inserted — if it sounds wrong in even one line, try another word with a broader range of collocations.';
}

function buildUsefulTip(item) {
  const sentences = item.sentences || [];
  const first = fillSentence(sentences[0] || '', '___').toLowerCase();

  if (/would you /.test(first)) {
    return 'Start with the most fixed phrase (e.g. would you mind) — the shared word is often part of an idiom.';
  }
  if (/point of |take into |out of |make up /.test(sentences.join(' ').toLowerCase())) {
    return 'List the phrases around each gap — the answer is usually the shared noun in three different collocations.';
  }
  return 'Type your word in the first gap and read all three lines — they should all sound natural with the same word.';
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const whyCorrect = expandLegacyWhy(item, legacy);
  const grammarFocus = ensurePeriod(detectGrammarFocus(item, legacy));
  const wrongOptions = buildWrongOptions(item, legacy);
  const commonMistake = ensurePeriod(buildCommonMistake(item, legacy));
  const usefulTip = ensurePeriod(buildUsefulTip(item));

  return {
    whyCorrect,
    grammarFocus,
    wrongOptions,
    commonMistake,
    usefulTip
  };
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'synced_gap_fill' && item.formatType !== 'synced_gap_fill') return false;

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
