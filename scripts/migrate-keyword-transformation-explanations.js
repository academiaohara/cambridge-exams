#!/usr/bin/env node
/**
 * Migrate keyword_transformation items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-keyword-transformation-explanations.js
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

function keywordText(item) {
  return String(item.keyword || item.keyWord || '').trim();
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function expandLegacyWhy(item, legacy) {
  const answer = String(item.answer || '').trim();
  const keyword = keywordText(item);
  const arrow = extractArrowParts(legacy);
  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    return ensurePeriod(`The clue is ${lower}, so the correct transformation is "${answer}"`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    return ensurePeriod(`Use the keyword "${keyword}" unchanged to rewrite the sentence as "${answer}"`);
  }
  return ensurePeriod(stripped);
}

function detectGrammarFocus(item, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const keyword = keywordText(item).toLowerCase();
  const prompt = String(item.promptSentence || '').toLowerCase();
  const answer = String(item.answer || '').toLowerCase();

  if (/wish|regret|past perfect/i.test(text + ' ' + prompt)) {
    return 'Wish + past perfect expresses regret about a past action not taken.';
  }
  if (/passive|was \w+ed|were \w+ed|been \w+ed/i.test(text + ' ' + prompt)) {
    return 'Passive voice uses be + past participle — keep the keyword and change the structure around it.';
  }
  if (/reported|indirect speech|warned|said|told/i.test(text + ' ' + keyword + ' ' + answer)) {
    return 'Reported speech keeps statement word order after verbs like said, told, or warned + that.';
  }
  if (/present continuous|fixed arrangement|are meeting|arranged to/i.test(text + ' ' + prompt + ' ' + answer)) {
    return 'Present continuous expresses a fixed arrangement or plan — not will for a diary appointment.';
  }
  if (/going to|prediction|evidence/i.test(text + ' ' + keyword)) {
    return 'Going to shows a prediction based on present evidence or a prior decision.';
  }
  if (/will |promise|\'ll /i.test(text + ' ' + keyword + ' ' + answer)) {
    return 'Will + infinitive expresses a promise, offer, or instant decision.';
  }
  if (/succeed in|capable of|talented at|good at/i.test(text + ' ' + answer)) {
    return 'Verb + preposition patterns (succeed in, capable of, talented at) are fixed — learn them as chunks.';
  }
  if (/conclusion|account|impression|balance|consideration/i.test(keyword)) {
    return 'Formal noun phrases (come to the conclusion, give an account of, strike a balance) are typical C1 transformations.';
  }
  if (/occurred to|crossed.*mind/i.test(text + ' ' + answer)) {
    return 'Crossed my mind and occurred to me are parallel idioms for suddenly thinking of something.';
  }
  if (/spent.*learning|devoted/i.test(text + ' ' + prompt)) {
    return 'Present perfect (has spent years + -ing) links past duration to the present.';
  }
  if (/causative|have something done/i.test(text)) {
    return 'Causative have/get + object + past participle shows someone else does the action.';
  }
  if (/conditional|would have/i.test(text + ' ' + prompt)) {
    return 'Conditional transformations pair specific verb forms in the if-clause and main clause.';
  }
  if (/so that|in order to|purpose/i.test(text)) {
    return 'Purpose clauses explain why something is done (so that, in order to, to + infinitive).';
  }
  if (/comparative|superlative|as .+ as/i.test(text + ' ' + prompt)) {
    return 'Comparative and as…as structures compare qualities — check whether the keyword needs -er, more, or as.';
  }

  return `Use "${keywordText(item)}" exactly as given and change the grammar around it to preserve the meaning of the first sentence.`;
}

function buildWordCountMistake(item) {
  const minW = item.minWords != null ? item.minWords : 2;
  const maxW = item.maxWords != null ? item.maxWords : 5;
  const keyword = keywordText(item);
  return `Write between ${minW} and ${maxW} words, including the keyword "${keyword}" unchanged. Contractions such as don't count as one word.`;
}

function buildCommonMistake(item, legacy) {
  const keyword = keywordText(item);
  const text = stripMd(legacy).toLowerCase();

  if (/keyword|unchanged/i.test(text)) {
    return `The keyword "${keyword}" must appear exactly — do not change its form unless the task allows it.`;
  }
  if (/present continuous|will meet/i.test(text)) {
    return 'Will + infinitive is for predictions or promises — a fixed arrangement needs present continuous.';
  }
  if (/going to/i.test(text)) {
    return 'Will is not the same as going to — check whether the first sentence shows evidence or a prior plan.';
  }

  return 'Check that your answer keeps the keyword, matches the word limit, and preserves the meaning of the prompt sentence.';
}

function buildSimilarExample(item, legacy) {
  const keyword = keywordText(item);
  const text = stripMd(legacy).toLowerCase();
  const answer = String(item.answer || '').trim();

  if (/wish/i.test(text + ' ' + keyword)) {
    return 'Similar: I wish I had known the truth.';
  }
  if (/present continuous|are meeting/i.test(answer)) {
    return "Similar: We're meeting the coach at five.";
  }
  if (/going to/i.test(answer)) {
    return "Similar: Look at those clouds — it's going to rain.";
  }
  if (/will help|\'ll help/i.test(answer)) {
    return "Similar: I'll call you when I arrive.";
  }
  if (/succeed in/i.test(answer)) {
    return 'Similar: She succeeded in passing the exam.';
  }
  if (/capable of/i.test(answer)) {
    return 'Similar: He is capable of solving difficult problems.';
  }
  if (/occurred to/i.test(answer)) {
    return 'Similar: It never occurred to me that she was lying.';
  }
  if (/conclusion/i.test(keyword.toLowerCase())) {
    return 'Similar: We came to the conclusion that the plan would not work.';
  }

  return `Similar pattern: keep "${keyword}" and rewrite the grammar to match the prompt meaning.`;
}

function buildUsefulTip(item) {
  const keyword = keywordText(item);
  const minW = item.minWords != null ? item.minWords : 2;
  const maxW = item.maxWords != null ? item.maxWords : 5;

  return `Count your words (${minW}–${maxW}) before you check — include "${keyword}" unchanged and read the completed second sentence aloud.`;
}

function buildWrongOptions(item) {
  const keyword = keywordText(item);
  const wrongOptions = {};
  if (keyword) {
    wrongOptions[keyword.toLowerCase()] = `Do not leave out or alter the keyword "${keyword}" — it must appear in your answer.`;
  }
  return wrongOptions;
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const whyCorrect = expandLegacyWhy(item, legacy);
  const grammarFocus = ensurePeriod(detectGrammarFocus(item, legacy));
  const wordCountMistake = ensurePeriod(buildWordCountMistake(item));
  const commonMistake = ensurePeriod(buildCommonMistake(item, legacy));
  const similarExample = ensurePeriod(buildSimilarExample(item, legacy));
  const usefulTip = ensurePeriod(buildUsefulTip(item));

  return {
    whyCorrect,
    grammarFocus,
    wordCountMistake,
    wrongOptions: buildWrongOptions(item),
    commonMistake,
    similarExample,
    usefulTip
  };
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'keyword_transformation' && item.formatType !== 'keyword_transformation') return false;

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
