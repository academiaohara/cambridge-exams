#!/usr/bin/env node
/**
 * Migrate error_correction items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-error-correction-explanations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildErrorCorrectionExplanationContent } from './lib/mistake-explanation-content.js';

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

function highlighted(item) {
  return String(item.highlightedText || '').trim();
}

function answerText(item) {
  return String(item.answer || '').trim();
}

function sentenceText(item) {
  return stripMd(String(item.sentence || ''));
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function expandLegacyWhy(item, legacy) {
  const answer = answerText(item);
  const wrong = highlighted(item);
  const arrow = extractArrowParts(legacy);
  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    return ensurePeriod(`The error is in "${wrong}" — ${lower}, so the correction is "${answer}"`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    return ensurePeriod(`Replace "${wrong}" with "${answer}" to fix the highlighted error`);
  }
  return ensurePeriod(stripped);
}

function detectGrammarFocus(item, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const sentence = sentenceText(item).toLowerCase();
  const wrong = highlighted(item).toLowerCase();
  const answer = answerText(item).toLowerCase();

  if (/years use|months use|clock times|parts of a day|preposition/i.test(text) ||
      /^(at|in|on|to|for|with|against|of|like)$/.test(wrong)) {
    if (/\b20\d{2}\b/.test(sentence) || /years use/i.test(text)) {
      return 'Use in with years, months, and longer periods — at is for precise times and places.';
    }
    if (/january|february|march|april|may|june|july|august|september|october|november|december|august/i.test(sentence)) {
      return 'Months and years take in — on is for days and dates.';
    }
    if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening/i.test(sentence)) {
      return 'Days and parts of a day take on — in is for months, years, and longer periods.';
    }
    if (/half past|quarter|o'clock|\d{1,2}:\d{2}/i.test(sentence)) {
      return 'Clock times use at — in is not used for exact times.';
    }
    if (/interested|good at|listen to|fan of|keen on|take part|crazy about/i.test(sentence)) {
      return 'Verb + preposition patterns are fixed — learn the whole chunk (interested in, good at, listen to).';
    }
    return 'Prepositions often form fixed patterns — the highlighted word needs the preposition that collocates here.';
  }
  if (/present perfect|past simple|past continuous|present continuous|tense|agreement|-s\b|plural|singular/i.test(text + ' ' + sentence)) {
    return 'Check tense and subject–verb agreement — the highlighted form must match the time clues in the sentence.';
  }
  if (/article|a\/an|the\b/i.test(text)) {
    return 'Articles show whether a noun is specific (the), new and countable (a/an), or general.';
  }
  if (/collocation|word pattern|vocabulary|meaning/i.test(text) || wrong !== answer) {
    return 'The highlighted word breaks the collocation or meaning — choose the word that fits naturally in this context.';
  }
  if (/passive|active/i.test(text)) {
    return 'Passive voice uses be + past participle — active uses the correct tense of the main verb.';
  }
  if (/modal|should|must|can|could/i.test(text + ' ' + sentence)) {
    return 'Modals express ability, obligation, or permission — pick the modal that matches the sentence meaning.';
  }

  return `Only the highlighted word "${highlighted(item)}" is wrong — replace it with "${answerText(item)}" without changing other words.`;
}

function buildWrongOptions(item, legacy) {
  const wrong = highlighted(item);
  const answer = answerText(item);
  const wrongOptions = {};

  if (wrong) {
    wrongOptions[wrong] = `"${wrong}" is the highlighted error — use "${answer}" here instead.`;
  }

  const text = stripMd(legacy).toLowerCase();
  if (/not \*\*/i.test(legacy) || /not /.test(text)) {
    const match = stripMd(legacy).match(/not\s+(\w+)/i);
    if (match && match[1].toLowerCase() !== answer.toLowerCase()) {
      wrongOptions[match[1]] = `"${match[1]}" does not fit this slot — the correct word is "${answer}".`;
    }
  }

  return wrongOptions;
}

function buildCommonMistake(item, legacy) {
  const wrong = highlighted(item);
  const answer = answerText(item);
  const text = stripMd(legacy).toLowerCase();

  if (text.includes('not')) {
    return `Do not leave "${wrong}" — the rule here needs "${answer}" in the highlighted slot.`;
  }
  if (/only the highlighted|highlighted/i.test(text)) {
    return 'Change only the bold word — other parts of the sentence are already correct.';
  }
  return `The error is in "${wrong}", not elsewhere — replace it with "${answer}" and read the full sentence to check it sounds natural.`;
}

function buildUsefulTip(item) {
  const sentence = sentenceText(item).toLowerCase();
  if (/interested|good at|listen|fan|keen|crazy about|take part/i.test(sentence)) {
    return 'Word-pattern errors are fixed chunks — memorise the preposition that follows the key adjective or verb.';
  }
  if (/\b20\d{2}\b|january|monday|half past/i.test(sentence)) {
    return 'Time expressions follow strict preposition rules: in for years/months, on for days, at for clock times.';
  }
  return 'Read the sentence with your correction inserted — if it still sounds wrong, you may have changed the wrong word.';
}

function inferWhyWithoutLegacy(item) {
  const wrong = highlighted(item);
  const answer = answerText(item);
  const sentence = sentenceText(item).toLowerCase();

  if (/interested/.test(sentence) && wrong === 'on' && answer === 'in') {
    return ensurePeriod('Interested pairs with in, not on — "interested in joining"');
  }
  if (/good/.test(sentence) && wrong === 'in' && answer === 'at') {
    return ensurePeriod('Good at describes skill — "good at table tennis"');
  }
  if (/listened/.test(sentence) && answer === 'to') {
    return ensurePeriod('Listen takes to — "listened to classical music"');
  }
  if (/game/.test(sentence) && answer === 'against') {
    return ensurePeriod('Teams play against each other — "a game against City School"');
  }
  if (/fan/.test(sentence) && answer === 'of') {
    return ensurePeriod('Fan pairs with of — "a fan of that singer"');
  }
  if (/feel/.test(sentence) && answer === 'like') {
    return ensurePeriod('Feel like + -ing expresses wanting to do something');
  }

  return ensurePeriod(`Replace the highlighted word "${wrong}" with "${answer}" to correct the sentence`);
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const base = legacy ? {
    whyCorrect: expandLegacyWhy(item, legacy),
    grammarFocus: ensurePeriod(detectGrammarFocus(item, legacy)),
    wrongOptions: buildWrongOptions(item, legacy),
    commonMistake: ensurePeriod(buildCommonMistake(item, legacy)),
    usefulTip: ensurePeriod(buildUsefulTip(item))
  } : {
    whyCorrect: inferWhyWithoutLegacy(item),
    grammarFocus: ensurePeriod(detectGrammarFocus(item, '')),
    wrongOptions: buildWrongOptions(item, ''),
    commonMistake: ensurePeriod(buildCommonMistake(item, '')),
    usefulTip: ensurePeriod(buildUsefulTip(item))
  };

  return buildErrorCorrectionExplanationContent(item, base);
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'error_correction' && item.formatType !== 'error_correction') return false;

  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item);
  } else {
    item.explanationContent = buildErrorCorrectionExplanationContent(item, item.explanationContent);
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
