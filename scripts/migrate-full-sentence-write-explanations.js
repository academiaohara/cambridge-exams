#!/usr/bin/env node
/**
 * Migrate full_sentence_write items from legacy `explanation` strings
 * to structured `explanationContent` objects.
 *
 * Usage: node scripts/migrate-full-sentence-write-explanations.js
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

function getCues(item) {
  let cues = item.prompt?.cues || [];
  const displayPrompt = String(item.displayPrompt || '');
  if ((!cues.length || cues.length <= 1) && /\s\/\s/.test(displayPrompt)) {
    cues = displayPrompt.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
  }
  return cues;
}

function isCueMode(item) {
  return getCues(item).length > 1 && /\s\/\s/.test(String(item.displayPrompt || ''));
}

function isWordCorrection(item) {
  const answer = String(item.answer || '').trim();
  return !answer.includes(' ') && /<s>/.test(String(item.displayPrompt || ''));
}

function extractWrongWord(item) {
  const match = String(item.displayPrompt || '').match(/<s>([^<]*)<\/s>/);
  return match ? match[1].trim() : '';
}

function extractArrowParts(legacy) {
  const stripped = stripMd(legacy);
  if (!stripped.includes('→')) return null;
  const parts = stripped.split('→').map((p) => p.trim());
  return { clue: parts[0], answer: parts.slice(1).join(' → ') };
}

function answerText(item) {
  return String(item.answer || '').trim();
}

function buildSentenceBreakdown(item) {
  const answer = answerText(item);
  const cues = getCues(item);
  const displayPrompt = stripMd(String(item.displayPrompt || ''));

  if (isWordCorrection(item)) {
    const wrong = extractWrongWord(item);
    if (wrong) {
      return ensurePeriod(`Replace "${wrong}" with "${answer}" to complete the sentence correctly`);
    }
    return answer;
  }

  if (isCueMode(item)) {
    return ensurePeriod('Cues: ' + cues.join(' / ') + ' → ' + answer);
  }

  if (displayPrompt) {
    const promptLine = displayPrompt.replace(/<s>[^<]*<\/s>/g, '___');
    return ensurePeriod('Prompt: ' + promptLine + ' → ' + answer);
  }

  return answer;
}

function expandLegacyWhy(item, legacy) {
  const answer = answerText(item);
  const arrow = extractArrowParts(legacy);

  if (arrow) {
    const clue = arrow.clue.replace(/\.$/, '');
    const lower = clue.charAt(0).toLowerCase() + clue.slice(1);
    return ensurePeriod(`${lower.charAt(0).toUpperCase() + lower.slice(1)}, so the sentence is "${answer}"`);
  }

  const stripped = stripMd(legacy);
  if (!stripped) {
    if (isWordCorrection(item)) {
      const wrong = extractWrongWord(item);
      return ensurePeriod(`Replace "${wrong}" with "${answer}" to fix the highlighted word`);
    }
    if (isCueMode(item)) {
      return ensurePeriod('Combine the cues in the correct tense and word order to form: ' + answer);
    }
    return ensurePeriod('Write the complete sentence: ' + answer);
  }
  return ensurePeriod(stripped);
}

function detectGrammarFocus(item, legacy) {
  const text = stripMd(legacy).toLowerCase();
  const answer = answerText(item).toLowerCase();
  const displayPrompt = String(item.displayPrompt || '').toLowerCase();
  const cues = getCues(item).join(' ').toLowerCase();

  if (isWordCorrection(item)) {
    const wrong = extractWrongWord(item).toLowerCase();
    if (/tion$|sion$|ment$|ness$|ity$|ship$|hood$/.test(answer)) {
      return 'Word formation — change the part of speech (verb/adjective → noun) to fit the sentence pattern.';
    }
    if (/er$|or$|ian$|ist$/.test(answer)) {
      return 'Word formation — use the noun for a person who does the action (e.g. translate → translator).';
    }
    if (/un|dis|in|im|mis/.test(answer) && wrong && answer.replace(/^(un|dis|in|im|mis)/, '') === wrong) {
      return 'Prefixes change meaning — un-/dis-/in- often make the opposite of the base word.';
    }
    if (/ed$/.test(answer) && /yesterday|last |ago/.test(displayPrompt)) {
      return 'Past simple — irregular verbs often change form completely (forgive → forgave).';
    }
    if (/ise$|ize$/.test(answer)) {
      return 'Word formation — nouns like memory often become verbs with -ise/-ize (memorise).';
    }
    return `Replace the incorrect word "${extractWrongWord(item)}" with the correct form "${answerText(item)}".`;
  }

  if (/past perfect|had already|hadn't|had not|had been|before.*arrived|by the time/i.test(text + ' ' + answer + ' ' + cues)) {
    return 'Past perfect shows the earlier of two past actions — use had + past participle before the later past event.';
  }
  if (/present perfect|hasn't|haven't|has already|have just|yet\b|already\b/i.test(text + ' ' + answer + ' ' + cues)) {
    return 'Present perfect links past actions to now — has/have + past participle; yet goes at the end of negatives.';
  }
  if (/reported speech|said she|said he|said they|would |might |could |the next day|the day before|that night|there\b/i.test(text + ' ' + answer + ' ' + displayPrompt)) {
    return 'Reported speech backshifts tenses and time/place words (now → then, tomorrow → the next day, here → there).';
  }
  if (/second conditional|would |if i had|if we had/i.test(text + ' ' + answer)) {
    return 'Second conditional: If + past simple, would + base verb — unreal present/future situations.';
  }
  if (/third conditional|would have|hadn't|if.*had.*would have/i.test(text + ' ' + answer)) {
    return 'Third conditional: If + past perfect, would have + past participle — unreal past situations.';
  }
  if (/passive|been|was.*ed|were.*ed|is.*ed/i.test(text + ' ' + answer)) {
    return 'Passive voice — be + past participle when the action matters more than who did it.';
  }
  if (/relative clause|who |which |that |whose /i.test(text + ' ' + answer)) {
    return 'Relative clauses add detail — choose who/which/that/whose to match the noun they describe.';
  }
  if (/when\b|while\b|as soon as|before\b|after\b|until\b/i.test(cues + ' ' + text)) {
    return 'Time clauses set the order of events — match verb tenses to show which action happened first.';
  }
  if (/not\b|negative|n't/i.test(cues + ' ' + text)) {
    return 'Negative sentences need the correct auxiliary + not (hasn\'t, hadn\'t, don\'t) before the main verb.';
  }

  if (isCueMode(item)) {
    return 'Combine the cue words in standard English word order and conjugate verbs to match the time clues.';
  }

  return ensurePeriod('Build a grammatically complete sentence that matches the prompt: ' + answerText(item));
}

function buildWrongOptions(item, legacy) {
  const wrongOptions = {};
  const answer = answerText(item);

  if (isWordCorrection(item)) {
    const wrong = extractWrongWord(item);
    if (wrong) {
      wrongOptions[wrong] = `"${wrong}" is the wrong form here — the correct word is "${answer}".`;
    }
    return wrongOptions;
  }

  if (isCueMode(item)) {
    const cues = getCues(item);
    cues.forEach((cue) => {
      const key = String(cue).trim();
      if (!key) return;
      if (/^(not|already|just|yet|when|before|after|because|if|so)$/i.test(key)) {
        wrongOptions[key] = `"${key}" is a connector or modifier — place it in the correct position in the sentence.`;
      } else if (!cueAppearsInAnswer(key, answer)) {
        wrongOptions[key] = `Conjugate "${key}" to fit the tense and subject — it does not stay as "${key}" in the answer.`;
      }
    });
    return wrongOptions;
  }

  const arrow = extractArrowParts(legacy);
  if (arrow && arrow.clue) {
    const clueWords = arrow.clue.split(/\s+/).filter(Boolean);
    clueWords.slice(0, 2).forEach((word) => {
      const key = word.replace(/[^a-zA-Z'-]/g, '');
      if (key && key.toLowerCase() !== answer.toLowerCase()) {
        wrongOptions[key] = `Check how "${key}" changes in the target sentence — tense or word form may shift.`;
      }
    });
  }

  return wrongOptions;
}

function cueAppearsInAnswer(cue, answer) {
  const escaped = String(cue || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  if (!escaped) return false;
  return new RegExp('\\b' + escaped + '\\b', 'i').test(String(answer || ''));
}

function buildCommonMistake(item, legacy) {
  const text = stripMd(legacy).toLowerCase();

  if (isWordCorrection(item)) {
    const wrong = extractWrongWord(item);
    return ensurePeriod(`Do not leave "${wrong}" — use the correct form "${answerText(item)}" for this sentence pattern`);
  }

  if (isCueMode(item)) {
    const cues = getCues(item);
    const verbCue = cues.find((cue) => !cueAppearsInAnswer(cue, answerText(item)) &&
      !/^(not|already|just|yet|when|before|after|because|if|so|by the time)$/i.test(cue));
    if (verbCue) {
      return ensurePeriod(`Conjugate "${verbCue}" correctly — verb form is the most common error with these cues`);
    }
    if (/yet\b/i.test(cues.join(' '))) {
      return 'Place yet at the end of negative present perfect sentences.';
    }
    if (/already\b/i.test(cues.join(' '))) {
      return 'Put already after has/have and before the past participle.';
    }
    return 'Include every cue and use the correct connector (when, before, because) to link the clauses.';
  }

  if (/tomorrow|yesterday|here|now|tonight|this |last /i.test(String(item.displayPrompt || ''))) {
    return 'In reported speech, change time and place words (tomorrow → the next day, here → there).';
  }
  if (/→/.test(text)) {
    return 'Match the tense shift shown in the explanation — one verb often moves back one step in time.';
  }
  if (/had already|before/i.test(text)) {
    return 'Use past perfect (had + past participle) for the action that happened first.';
  }

  return 'Compare your sentence with the model — check verb tense, connectors, and that every cue is included.';
}

function buildUsefulTip(item) {
  if (isWordCorrection(item)) {
    return 'Read the whole sentence — the highlighted word must match the grammar and meaning of the context.';
  }
  if (isCueMode(item)) {
    return 'Start with the subject, then place time words and connectors before conjugating the main verb.';
  }
  if (/'.*'.*said/i.test(String(item.displayPrompt || ''))) {
    return 'Direct speech in quotes becomes reported speech — backshift tenses and pronouns (I → he/she, we → they).';
  }
  return 'Write one complete sentence with correct punctuation — capital letter at the start and a full stop at the end.';
}

function buildWordCorrectionWhy(item) {
  const wrong = extractWrongWord(item);
  const answer = answerText(item);
  const prompt = stripMd(String(item.displayPrompt || '').replace(/<s>[^<]*<\/s>/g, `"${answer}"`));
  return ensurePeriod(`The word "${wrong}" is incorrect in this context — use "${answer}" to complete: ${prompt}`);
}

function buildExplanationContent(item) {
  const legacy = item.explanation || '';
  const whyCorrect = legacy
    ? expandLegacyWhy(item, legacy)
    : buildWordCorrectionWhy(item);

  return {
    whyCorrect,
    sentenceBreakdown: buildSentenceBreakdown(item),
    grammarFocus: ensurePeriod(detectGrammarFocus(item, legacy)),
    wrongOptions: buildWrongOptions(item, legacy),
    commonMistake: ensurePeriod(buildCommonMistake(item, legacy)),
    usefulTip: ensurePeriod(buildUsefulTip(item))
  };
}

function migrateItem(item, exercise) {
  const ft = exercise.exerciseType || exercise.interaction?.formatType || item.formatType;
  if (ft !== 'full_sentence_write' && item.formatType !== 'full_sentence_write') return false;

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
