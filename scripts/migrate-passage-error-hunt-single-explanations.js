#!/usr/bin/env node
/**
 * Migrate passage_error_hunt_single / passage_error_hunt_counter items
 * from legacy `explanation` strings to structured `explanationContent`.
 *
 * Usage: node scripts/migrate-passage-error-hunt-single-explanations.js
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

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function isHuntExercise(exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType;
  return ft === 'passage_error_hunt_single' || ft === 'passage_error_hunt_counter';
}

function isHuntItem(item) {
  return !!(item.wrong || item.targetPhrase) && item.answer != null;
}

function detectGrammarFocus(wrong, answer, exercise, legacy) {
  const text = (stripMd(legacy) + ' ' + (exercise.grammarFocus || '')).toLowerCase();
  const wrongLower = String(wrong || '').toLowerCase();
  const answerLower = String(answer || '').toLowerCase();

  if (/stative|present simple|continuous/.test(text)) {
    return 'Stative verbs usually take the present simple, not the continuous — e.g. I enjoy, not I am enjoying.';
  }
  if (/past perfect|had been/.test(text) || /^had\b/.test(answerLower)) {
    return 'Past perfect forms describe an earlier past action or state before another past event.';
  }
  if (/passive|was cooked|was worked/.test(text) || /\bwas\b/.test(wrongLower)) {
    return 'Check whether the verb should be active or passive in this context.';
  }
  if (/used to/.test(text) || answerLower === 'used to') {
    return 'Use *used to* for past habits or states that are no longer true.';
  }
  if (/\b(am|is|are)\b/.test(wrongLower) && !/\b(am|is|are)\b/.test(answerLower)) {
    return 'The marked phrase uses the wrong tense or aspect — match the time frame in the passage.';
  }
  if (exercise.grammarFocus) return ensurePeriod(exercise.grammarFocus);
  return 'Find the verb phrase that does not fit the grammar of the passage, then write the natural correction.';
}

function buildWhyCorrect(item, exercise) {
  const legacy = stripMd(item.explanation || '');
  const wrong = item.targetPhrase || item.wrong || '';
  const answer = String(item.answer || '').trim();

  if (legacy) {
    return ensurePeriod(`The error is *${wrong}* — ${legacy}`);
  }
  return ensurePeriod(`Replace *${wrong}* with *${answer}* to correct the passage.`);
}

function buildWrongTapNote(wrong) {
  return `That phrase is fine — look for an unnatural verb form like *${wrong}*.`;
}

function buildCommonMistake(wrong, answer) {
  return `After you mark *${wrong}*, write *${answer}* — check tense and whether the verb is stative or active.`;
}

function buildUsefulTip(exercise) {
  const focus = String(exercise.grammarFocus || '').toLowerCase();
  if (/stative/.test(focus)) {
    return 'Read each verb phrase aloud — if it describes a state or feeling, it is probably not continuous.';
  }
  if (/past/.test(focus)) {
    return 'Match each verb to the time line in the story — earlier events often need a perfect or simple past form.';
  }
  return 'Mark one wrong phrase at a time, then fix it before hunting the next error.';
}

function extractSentenceContaining(text, phrase) {
  const passage = String(text || '').trim();
  const target = String(phrase || '').trim();
  if (!passage) return '';
  const idx = passage.toLowerCase().indexOf(target.toLowerCase());
  if (idx === -1) return passage;

  let start = passage.lastIndexOf('.', idx);
  start = start === -1 ? 0 : start + 1;
  while (start < passage.length && /\s/.test(passage.charAt(start))) start++;

  let end = passage.indexOf('.', idx + target.length);
  if (end === -1) end = passage.length;
  else end += 1;

  return passage.slice(start, end).trim();
}

function wrapMarkedSnippet(sentence, phrase, markerNum = 1) {
  const target = String(phrase || '').trim();
  if (!sentence || !target) return String(sentence || '').trim();
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let replaced = false;
  const marked = String(sentence).replace(new RegExp(escaped, 'i'), (match) => {
    replaced = true;
    return `[start${markerNum}]${match}[end${markerNum}]`;
  });
  return replaced ? marked : String(sentence).trim();
}

function buildSentenceBreakdown(passage, wrong, answer) {
  const sentence = extractSentenceContaining(passage, wrong);
  const wrongPhrase = String(wrong || '').trim();
  const fix = String(answer || '').trim();
  if (!sentence || !wrongPhrase || !fix) return '';
  const escaped = wrongPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const corrected = sentence.replace(new RegExp(escaped, 'i'), fix);
  return ensurePeriod(wrapMarkedSnippet(corrected, fix, 1));
}

function buildWrongOptions(item, exercise) {
  const wrong = item.targetPhrase || item.wrong || '';
  const answer = String(item.answer || '').trim();
  const wrongOptions = {
    wrong_tap: buildWrongTapNote(wrong)
  };
  if (answer) {
    wrongOptions[answer] = `Check the corrected form — the answer is *${answer}*.`;
  }
  return wrongOptions;
}

function buildExplanationContent(item, exercise) {
  const wrong = item.targetPhrase || item.wrong || '';
  const answer = String(item.answer || '').trim();
  const legacy = item.explanation || '';

  return {
    whyCorrect: buildWhyCorrect(item, exercise),
    grammarFocus: ensurePeriod(detectGrammarFocus(wrong, answer, exercise, legacy)),
    wrongOptions: buildWrongOptions(item, exercise),
    commonMistake: ensurePeriod(buildCommonMistake(wrong, answer)),
    usefulTip: buildUsefulTip(exercise),
    sentenceBreakdown: buildSentenceBreakdown(exercise.passage, wrong, answer)
  };
}

function migrateItem(item, exercise) {
  if (!isHuntItem(item)) return false;
  const wrong = item.targetPhrase || item.wrong || '';
  const answer = String(item.answer || '').trim();
  const passage = exercise.passage || '';
  let changed = false;

  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item, exercise);
    delete item.explanation;
    changed = true;
  } else {
    const breakdown = buildSentenceBreakdown(passage, wrong, answer);
    if (breakdown && item.explanationContent.sentenceBreakdown !== breakdown) {
      item.explanationContent.sentenceBreakdown = breakdown;
      changed = true;
    }
  }

  return changed;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    if (!isHuntExercise(exercise)) continue;
    for (const item of exercise.errors || exercise.items || []) {
      if (migrateItem(item, exercise)) changed++;
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

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      total += n;
      console.log(n, path.relative(ROOT, file));
    }
  }

  console.log('Migrated', total, 'passage_error_hunt item(s)');
}

main();
