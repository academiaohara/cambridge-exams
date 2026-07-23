#!/usr/bin/env node
/**
 * Smoke test for SunePlayExplanation two_option_choice builder.
 * Run: node scripts/test-explanation-builder.js
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadBuilder() {
  const code = fs.readFileSync(path.join(ROOT, 'js/sune-play/explanation-builder.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  return ctx.SunePlayExplanation;
}

const SunePlayExplanation = loadBuilder();
const sample = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/C1/Unit2.v2.json'), 'utf8'));
const item = sample.contentBanks.exercises.find((e) => e.id === 'c1-u2-ex-a').items[0];

const screen = {
  formatType: 'two_option_choice',
  payload: {
    sentenceBefore: item.sentenceBefore,
    sentenceAfter: item.sentenceAfter,
    options: item.options,
    answer: item.answer,
    completedSentence: item.completedSentence,
    explanationContent: item.explanationContent
  }
};

const wrongResult = {
  correct: false,
  correctAnswer: 'pessimistic',
  userAnswer: 'optimistic'
};

const opts = SunePlayExplanation.buildExplainOpts(screen, wrongResult);
const keys = opts.sections.map((s) => s.key);

const expected = ['correct', 'yourAnswer', 'optionContrast', 'sentenceBreakdown'];
const missing = expected.filter((k) => !keys.includes(k));

if (missing.length) {
  console.error('FAIL missing sections:', missing.join(', '));
  process.exit(1);
}

if (!SunePlayExplanation.hasExplanation(screen, wrongResult)) {
  console.error('FAIL hasExplanation should be true');
  process.exit(1);
}


const excluded = ['whyCorrect', 'vocabularyFocus', 'usefulTip'];
const leaked = excluded.filter((k) => keys.includes(k));
if (leaked.length) {
  console.error('FAIL explanation should exclude sections:', leaked.join(', '));
  process.exit(1);
}
console.log('PASS two_option_choice explanation builder');
console.log('Sections:', keys.join(' → '));

// two_option_choice — correct answer should still show teaching sections
const u3Item = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit3.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u3-ex-c').items
  .find((i) => i.id === 'b1-u3-exc-1');

const u3Screen = {
  formatType: 'two_option_choice',
  payload: {
    sentenceBefore: u3Item.sentenceBefore,
    sentenceAfter: u3Item.sentenceAfter,
    options: u3Item.options,
    answer: u3Item.answer,
    completedSentence: u3Item.completedSentence,
    explanationContent: u3Item.explanationContent
  }
};

const u3Correct = {
  correct: true,
  correctAnswer: 'video',
  userAnswer: 'video'
};

const u3CorrectOpts = SunePlayExplanation.buildExplainOpts(u3Screen, u3Correct);
const u3CorrectKeys = u3CorrectOpts.sections.map((s) => s.key);
const u3CorrectExpected = ['correct', 'whyCorrect', 'vocabularyFocus', 'usefulTip', 'sentenceBreakdown'];
const u3CorrectMissing = u3CorrectExpected.filter((k) => !u3CorrectKeys.includes(k));

if (u3CorrectMissing.length) {
  console.error('FAIL Unit3 ex-c correct answer missing sections:', u3CorrectMissing.join(', '));
  process.exit(1);
}

console.log('PASS Unit3 ex-c two_option_choice explanation (correct answer)');
console.log('Sections:', u3CorrectKeys.join(' → '));

// two_option_choice — legacy Unit 1 present simple vs continuous (migrated content)
const u1Ex4Item = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit1.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u1-ex-4').items
  .find((i) => i.id === 'b1-u1-ex4-2');

const u1Ex4Screen = {
  formatType: 'two_option_choice',
  payload: {
    sentenceBefore: u1Ex4Item.sentenceBefore,
    sentenceAfter: u1Ex4Item.sentenceAfter,
    options: u1Ex4Item.options,
    answer: u1Ex4Item.answer,
    completedSentence: u1Ex4Item.completedSentence,
    explanationContent: u1Ex4Item.explanationContent
  }
};

const u1Ex4Wrong = {
  correct: false,
  correctAnswer: "don't eat",
  userAnswer: "aren't eating"
};

const u1Ex4Opts = SunePlayExplanation.buildExplainOpts(u1Ex4Screen, u1Ex4Wrong);
const u1Ex4Keys = u1Ex4Opts.sections.map((s) => s.key);
const u1Ex4Expected = ['correct', 'yourAnswer', 'optionContrast', 'grammarFocus', 'sentenceBreakdown'];
const u1Ex4Missing = u1Ex4Expected.filter((k) => !u1Ex4Keys.includes(k));

if (u1Ex4Missing.length) {
  console.error('FAIL Unit1 ex4-2 missing sections:', u1Ex4Missing.join(', '));
  process.exit(1);
}

const u1Ex4Contrast = u1Ex4Opts.sections.find((s) => s.key === 'optionContrast');
if (!u1Ex4Contrast || !String(u1Ex4Contrast.text).includes("aren't eating")) {
  console.error('FAIL Unit1 ex4-2 should explain why aren\'t eating is wrong');
  process.exit(1);
}

console.log('PASS Unit1 ex4-2 two_option_choice explanation (present simple vs continuous)');
console.log('Sections:', u1Ex4Keys.join(' → '));

console.log('PASS excluded explanation sections filtered');

// meaning_contrast
const meaningScreen = {
  formatType: 'meaning_contrast',
  payload: {
    prompt: 'What does this sentence mean?',
    sentence: "I'm thinking about changing schools.",
    options: ['opinion', 'considering'],
    answer: 'considering',
    explanationContent: {
      whyCorrect: "The continuous form I'm thinking describes an action in progress.",
      grammarFocus: 'Think can be stative (opinion) or dynamic (considering).',
      wrongOptions: {
        opinion: 'Opinion is a state, not an action.'
      },
      usefulTip: 'If think describes a process happening now, it means considering.'
    }
  }
};

const meaningWrong = {
  correct: false,
  correctAnswer: 'considering',
  userAnswer: 'opinion'
};

const meaningOpts = SunePlayExplanation.buildExplainOpts(meaningScreen, meaningWrong);
const meaningKeys = meaningOpts.sections.map((s) => s.key);
const meaningExpected = ['correct', 'yourAnswer', 'optionContrast', 'grammarFocus', 'sentenceBreakdown'];
const meaningMissing = meaningExpected.filter((k) => !meaningKeys.includes(k));

if (meaningMissing.length) {
  console.error('FAIL meaning_contrast missing sections:', meaningMissing.join(', '));
  process.exit(1);
}

console.log('PASS meaning_contrast explanation builder');
console.log('Sections:', meaningKeys.join(' → '));

// mc_4_option standalone
const mcItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit4.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u4-ex-b').items[0];

const mcScreen = {
  formatType: 'mc_4_option',
  payload: {
    sentenceBefore: mcItem.sentenceBefore,
    sentenceAfter: mcItem.sentenceAfter,
    options: mcItem.options,
    answer: mcItem.answer,
    explanationContent: mcItem.explanationContent
  }
};

const mcWrong = {
  correct: false,
  correctLetter: 'A',
  correctAnswer: "I've",
  userLetter: 'B',
  userAnswer: 'I'
};

const mcOpts = SunePlayExplanation.buildExplainOpts(mcScreen, mcWrong);
const mcKeys = mcOpts.sections.map((s) => s.key);
const mcExpected = ['correct', 'yourAnswer', 'optionContrast', 'grammarFocus'];
const mcMissing = mcExpected.filter((k) => !mcKeys.includes(k));

if (mcMissing.length) {
  console.error('FAIL mc_4_option missing sections:', mcMissing.join(', '));
  process.exit(1);
}

console.log('PASS mc_4_option standalone explanation builder');
console.log('Sections:', mcKeys.join(' → '));

// mc_4_option passage
const passageEx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/C1/Unit2.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'c1-u2-ex-d');
const passageGap = passageEx.items[0];

const passageScreen = {
  formatType: 'mc_4_option',
  payload: {
    displayMode: 'passage',
    passage: passageEx.passage,
    gaps: [{
      gapNumber: 1,
      options: passageGap.options,
      answer: passageGap.answer,
      sentenceBefore: passageGap.sentenceBefore,
      sentenceAfter: passageGap.sentenceAfter,
      explanationContent: passageGap.explanationContent
    }]
  }
};

const passageWrong = {
  correct: false,
  correctAnswer: 'curriculum',
  userAnswer: 'programme',
  mcGapResults: [{
    gapNumber: 1,
    userLetter: 'A',
    userText: 'programme',
    correctLetter: 'C',
    correctText: 'curriculum',
    correct: false
  }]
};

const passageOpts = SunePlayExplanation.buildExplainOpts(passageScreen, passageWrong);
const passageKeys = passageOpts.sections.map((s) => s.key);
if (!passageKeys.includes('correct') || !passageKeys.includes('yourAnswer')) {
  console.error('FAIL mc_4_option passage missing core sections:', passageKeys.join(', '));
  process.exit(1);
}

console.log('PASS mc_4_option passage explanation builder');
console.log('Sections:', passageKeys.join(' → '));

// free_text_gap_fill
const gapItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit5.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u5-ex-a').items[0];

const gapScreen = {
  formatType: 'free_text_gap_fill',
  payload: {
    sentence: gapItem.sentence,
    answer: gapItem.answer,
    completedSentence: gapItem.sentence.replace(/\.{3,}|…{2,}|_{3,}/, gapItem.answer),
    explanationContent: gapItem.explanationContent
  }
};

const gapWrong = {
  correct: false,
  correctAnswer: 'had already left',
  userAnswer: 'already left'
};

const gapOpts = SunePlayExplanation.buildExplainOpts(gapScreen, gapWrong);
const gapKeys = gapOpts.sections.map((s) => s.key);
const gapExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const gapMissing = gapExpected.filter((k) => !gapKeys.includes(k));

if (gapMissing.length) {
  console.error('FAIL free_text_gap_fill missing sections:', gapMissing.join(', '));
  process.exit(1);
}

console.log('PASS free_text_gap_fill explanation builder');
console.log('Sections:', gapKeys.join(' → '));

// conjugation_gap_fill (rendered as free_text_gap_fill with sourceFormatType)
const conjItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit4.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u4-ex-a').items[0];

const conjScreen = {
  formatType: 'free_text_gap_fill',
  sourceFormatType: 'conjugation_gap_fill',
  payload: {
    sentence: conjItem.sentence,
    answer: conjItem.answer,
    completedSentence: conjItem.sentence.replace(/\.{3,}|…{2,}|_{3,}/, conjItem.answer),
    explanationContent: conjItem.explanationContent
  }
};

const conjWrong = {
  correct: false,
  correctAnswer: 'have finished',
  userAnswer: 'finished'
};

const conjOpts = SunePlayExplanation.buildExplainOpts(conjScreen, conjWrong);
const conjKeys = conjOpts.sections.map((s) => s.key);
const conjExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const conjMissing = conjExpected.filter((k) => !conjKeys.includes(k));

if (conjMissing.length) {
  console.error('FAIL conjugation_gap_fill missing sections:', conjMissing.join(', '));
  process.exit(1);
}

if (conjOpts.formatType !== 'conjugation_gap_fill') {
  console.error('FAIL conjugation_gap_fill formatType should be conjugation_gap_fill');
  process.exit(1);
}

console.log('PASS conjugation_gap_fill explanation builder');
console.log('Sections:', conjKeys.join(' → '));

// preselected_verb_gap_fill
const preItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit1.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u1-ex-5').items[0];

const preScreen = {
  formatType: 'preselected_verb_gap_fill',
  payload: {
    sentence: preItem.blankSentence || preItem.sentence,
    preselectedVerb: preItem.selectedTileAnswer,
    answer: preItem.answer,
    completedSentence: preItem.completedSentence,
    explanationContent: preItem.explanationContent
  }
};

const preWrong = {
  correct: false,
  correctAnswer: 'stay',
  userAnswer: 'staying'
};

const preOpts = SunePlayExplanation.buildExplainOpts(preScreen, preWrong);
const preKeys = preOpts.sections.map((s) => s.key);
const preExpected = ['correct', 'grammarFocus', 'yourAnswer', 'commonMistake', 'sentenceBreakdown'];
const preMissing = preExpected.filter((k) => !preKeys.includes(k));

if (preMissing.length) {
  console.error('FAIL preselected_verb_gap_fill missing sections:', preMissing.join(', '));
  process.exit(1);
}

console.log('PASS preselected_verb_gap_fill explanation builder');
console.log('Sections:', preKeys.join(' → '));

// word_bank_gap_fill sequential
const wbUnit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit7.v2.json'), 'utf8'));
const wbEx = wbUnit.contentBanks.exercises.find((e) => e.id === 'b1-u7-ex-b');
const wbSentence = {
  sentenceId: wbEx.items[0].id,
  sentence: wbEx.items[0].sentence,
  answer: wbEx.items[0].answer,
  explanationContent: wbEx.items[0].explanationContent
};

const wbScreen = {
  formatType: 'word_bank_gap_fill',
  payload: {
    sequentialSentences: true,
    wordBank: wbEx.wordBank,
    sentences: [wbSentence]
  }
};

const wbWrong = {
  correct: false,
  correctAnswer: 'rain',
  userAnswer: 'snow',
  activeSentenceId: wbSentence.sentenceId
};

const wbOpts = SunePlayExplanation.buildExplainOpts(wbScreen, wbWrong);
const wbKeys = wbOpts.sections.map((s) => s.key);
const wbExpected = ['correct', 'yourAnswer', 'commonMistake', 'sentenceBreakdown'];
const wbMissing = wbExpected.filter((k) => !wbKeys.includes(k));

if (wbMissing.length) {
  console.error('FAIL word_bank_gap_fill missing sections:', wbMissing.join(', '));
  process.exit(1);
}

console.log('PASS word_bank_gap_fill explanation builder');
console.log('Sections:', wbKeys.join(' → '));

// passage_gap_fill sequential
const pgUnit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit4.v2.json'), 'utf8'));
const pgEx = pgUnit.contentBanks.exercises.find((e) => e.id === 'b1-u4-ex-d');
const pgGap = pgEx.gapExplanationContent[0];

const pgScreen = {
  formatType: 'passage_gap_fill',
  payload: {
    sequentialGaps: true,
    passage: pgEx.passage,
    gaps: [{
      gapNumber: 1,
      expectedAnswer: pgEx.answers[0],
      explanationContent: pgGap
    }]
  }
};

const pgWrong = {
  correct: false,
  correctAnswer: pgEx.answers[0],
  userAnswer: 'did you do',
  activeGapNumber: 1
};

const pgOpts = SunePlayExplanation.buildExplainOpts(pgScreen, pgWrong);
const pgKeys = pgOpts.sections.map((s) => s.key);
const pgExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const pgMissing = pgExpected.filter((k) => !pgKeys.includes(k));

if (pgMissing.length) {
  console.error('FAIL passage_gap_fill missing sections:', pgMissing.join(', '));
  process.exit(1);
}

console.log('PASS passage_gap_fill explanation builder');
console.log('Sections:', pgKeys.join(' → '));

// passage_gap_fill question context keeps blank gap (not the answer)
const pgContext = pgOpts.context || '';
if (!/\(1\)/.test(pgContext) || !/_{3,}|…{2,}/.test(pgContext)) {
  console.error('FAIL passage_gap_fill question context should show blank gap markers');
  process.exit(1);
}
if (pgContext.includes(pgEx.answers[0])) {
  console.error('FAIL passage_gap_fill question context should not include the correct answer');
  process.exit(1);
}
console.log('PASS passage_gap_fill question context keeps blank gap');

// synced_gap_fill
const syncItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/C1/Unit2.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'c1-u2-ex-i').items[0];

const syncScreen = {
  formatType: 'synced_gap_fill',
  payload: {
    sentences: syncItem.sentences,
    answer: syncItem.answer,
    explanationContent: syncItem.explanationContent
  }
};

const syncWrong = {
  correct: false,
  correctAnswer: 'focus',
  userAnswer: 'attention'
};

const syncOpts = SunePlayExplanation.buildExplainOpts(syncScreen, syncWrong);
const syncKeys = syncOpts.sections.map((s) => s.key);
const syncExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const syncMissing = syncExpected.filter((k) => !syncKeys.includes(k));

if (syncMissing.length) {
  console.error('FAIL synced_gap_fill missing sections:', syncMissing.join(', '));
  process.exit(1);
}

if (!SunePlayExplanation.hasExplanation(syncScreen, syncWrong)) {
  console.error('FAIL synced_gap_fill hasExplanation should be true');
  process.exit(1);
}

console.log('PASS synced_gap_fill explanation builder');
console.log('Sections:', syncKeys.join(' → '));

// keyword_transformation
const kwtItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/C1/Unit2.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'c1-u2-ex-k').items[0];

const kwtScreen = {
  formatType: 'keyword_transformation',
  payload: {
    promptSentence: kwtItem.promptSentence,
    keyword: kwtItem.keyword,
    targetSentence: kwtItem.targetSentence,
    answer: kwtItem.answer,
    minWords: kwtItem.minWords,
    maxWords: kwtItem.maxWords,
    explanationContent: kwtItem.explanationContent
  }
};

const kwtWrong = {
  correct: false,
  correctAnswer: 'never occurred to',
  userAnswer: 'never crossed to'
};

const kwtOpts = SunePlayExplanation.buildExplainOpts(kwtScreen, kwtWrong);
const kwtKeys = kwtOpts.sections.map((s) => s.key);
const kwtExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'similarExample', 'sentenceBreakdown'];
const kwtMissing = kwtExpected.filter((k) => !kwtKeys.includes(k));

if (kwtMissing.length) {
  console.error('FAIL keyword_transformation missing sections:', kwtMissing.join(', '));
  process.exit(1);
}

const kwtWordCount = SunePlayExplanation.buildExplainOpts(kwtScreen, {
  correct: false,
  wordCountInvalid: true,
  userAnswer: 'it never occurred to her mind',
  correctAnswer: 'never occurred to'
});
const kwtWcKeys = kwtWordCount.sections.map((s) => s.key);
if (!kwtWcKeys.includes('commonMistake') || !kwtWcKeys.includes('grammarFocus')) {
  console.error('FAIL keyword_transformation wordCountInvalid missing sections:', kwtWcKeys.join(', '));
  process.exit(1);
}

console.log('PASS keyword_transformation explanation builder');
console.log('Sections:', kwtKeys.join(' → '));

// error_correction
const errItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit8.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u8-ex-a').items[0];

const errScreen = {
  formatType: 'error_correction',
  payload: {
    sentence: errItem.sentence,
    highlightedText: errItem.highlightedText,
    answer: errItem.answer,
    explanationContent: errItem.explanationContent
  }
};

const errWrong = {
  correct: false,
  correctAnswer: 'in',
  userAnswer: 'at'
};

const errOpts = SunePlayExplanation.buildExplainOpts(errScreen, errWrong);
const errKeys = errOpts.sections.map((s) => s.key);
const errExpected = ['yourAnswer', 'question', 'fix', 'whyCorrect', 'correctedSentence'];
const errMissing = errExpected.filter((k) => !errKeys.includes(k));

if (errMissing.length) {
  console.error('FAIL error_correction missing sections:', errMissing.join(', '));
  process.exit(1);
}

if (errOpts.context) {
  console.error('FAIL error_correction standardized format should not duplicate context');
  process.exit(1);
}

const errQuestion = errOpts.sections.find((s) => s.key === 'question');
if (!errQuestion || !String(errQuestion.text).includes('<mistake>')) {
  console.error('FAIL error_correction question should include <mistake> highlight');
  process.exit(1);
}

const errWhy = errOpts.sections.find((s) => s.key === 'whyCorrect');
if (!errWhy || !String(errWhy.text).trim()) {
  console.error('FAIL error_correction should include whyCorrect explanation');
  process.exit(1);
}


console.log('PASS error_correction explanation builder');
console.log('Sections:', errKeys.join(' → '));

// find_extra_word
const fewItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B2/ProgressTest2.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b2-u2-ex-g').items[0];

const fewScreen = {
  formatType: 'find_extra_word',
  payload: {
    sentence: fewItem.sentence,
    answer: fewItem.answer,
    isCorrectSentence: false,
    explanationContent: fewItem.explanationContent
  }
};

const fewWrong = {
  correct: false,
  correctAnswer: 'been',
  userAnswer: 'often'
};

const fewOpts = SunePlayExplanation.buildExplainOpts(fewScreen, fewWrong);
const fewKeys = fewOpts.sections.map((s) => s.key);
const fewExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const fewMissing = fewExpected.filter((k) => !fewKeys.includes(k));

if (fewMissing.length) {
  console.error('FAIL find_extra_word missing sections:', fewMissing.join(', '));
  process.exit(1);
}

const fewOkItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B2/ProgressTest2.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b2-u2-ex-g').items[1];
const fewOkScreen = {
  formatType: 'find_extra_word',
  payload: {
    sentence: fewOkItem.sentence,
    answer: 'OK',
    isCorrectSentence: true,
    explanationContent: fewOkItem.explanationContent
  }
};
const fewOkOpts = SunePlayExplanation.buildExplainOpts(fewOkScreen, { correct: true, correctAnswer: 'OK' });
if (!String(fewOkOpts.sections[0].text).includes('OK')) {
  console.error('FAIL find_extra_word OK item correct label');
  process.exit(1);
}

console.log('PASS find_extra_word explanation builder');
console.log('Sections:', fewKeys.join(' → '));

// word_order_tiles
const tileItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit1.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u1-ex-1').items[0];

const tileScreen = {
  formatType: 'word_order_tiles',
  payload: {
    prompt: tileItem.contextQuestion,
    contextQuestion: tileItem.contextQuestion,
    answer: tileItem.answer,
    answerTiles: tileItem.answerTiles,
    tiles: tileItem.tiles,
    explanationContent: tileItem.explanationContent
  }
};

const tileWrong = {
  correct: false,
  correctAnswer: tileItem.answer,
  userAnswer: 'Every morning, Jake walk to school.'
};

const tileOpts = SunePlayExplanation.buildExplainOpts(tileScreen, tileWrong);
const tileKeys = tileOpts.sections.map((s) => s.key);
const tileExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake'];
const tileMissing = tileExpected.filter((k) => !tileKeys.includes(k));

if (tileMissing.length) {
  console.error('FAIL word_order_tiles missing sections:', tileMissing.join(', '));
  process.exit(1);
}

const tileRedundant = ['wordOrder', 'sentenceBreakdown', 'usefulTip'].filter((k) => tileKeys.includes(k));
if (tileRedundant.length) {
  console.error('FAIL word_order_tiles should not include redundant sections:', tileRedundant.join(', '));
  process.exit(1);
}

if (!tileItem.explanationContent || !tileItem.explanationContent.usefulTip) {
  console.error('FAIL word_order_tiles lesson data should still provide usefulTip for exercise footer');
  process.exit(1);
}

console.log('PASS word_order_tiles explanation builder');
console.log('Sections:', tileKeys.join(' → '));

// full_sentence_write (cue-based conjugation scaffold)
const fswItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit5.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u5-ex-c').items[0];

const fswScreen = {
  formatType: 'full_sentence_write',
  payload: {
    displayPrompt: fswItem.displayPrompt,
    prompt: fswItem.prompt,
    answer: fswItem.answer,
    acceptedAnswers: fswItem.acceptedAnswers,
    explanationContent: fswItem.explanationContent
  }
};

const fswWrong = {
  correct: false,
  correctAnswer: fswItem.answer,
  userAnswer: 'They already left when we arrived.'
};

const fswOpts = SunePlayExplanation.buildExplainOpts(fswScreen, fswWrong);
const fswKeys = fswOpts.sections.map((s) => s.key);
const fswUsesStandard = fswItem.explanationContent &&
  fswItem.explanationContent.fix &&
  fswItem.explanationContent.question &&
  fswItem.explanationContent.correctedSentence;
const fswExpected = fswUsesStandard
  ? ['yourAnswer', 'question', 'fix', 'whyCorrect', 'correctedSentence']
  : ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const fswMissing = fswExpected.filter((k) => !fswKeys.includes(k));

if (fswMissing.length) {
  console.error('FAIL full_sentence_write missing sections:', fswMissing.join(', '));
  process.exit(1);
}

if (fswUsesStandard) {
  if (fswOpts.context) {
    console.error('FAIL full_sentence_write standardized format should not duplicate context');
    process.exit(1);
  }
} else if (!String(fswOpts.context).includes('they / already')) {
  console.error('FAIL full_sentence_write context should show displayPrompt cues');
  process.exit(1);
}

console.log('PASS full_sentence_write explanation builder');
console.log('Sections:', fswKeys.join(' → '));

// verb_bank_two_step — step 1 (wrong verb)
const vbItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit1.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u1-ex-5').items[0];

const vbStep1Screen = {
  formatType: 'verb_bank_two_step',
  payload: {
    sentence: vbItem.blankSentence || vbItem.sentence,
    baseVerb: vbItem.baseVerb,
    answer: vbItem.answer,
    wordBank: ['belong', 'carry', 'do', 'help', 'listen', 'look', 'stay', 'wear'],
    step: 'choose_verb',
    explanationContent: vbItem.explanationContent
  }
};

const vbStep1Wrong = {
  correct: false,
  partial: true,
  userAnswer: 'carry'
};

const vbStep1Opts = SunePlayExplanation.buildExplainOpts(vbStep1Screen, vbStep1Wrong);
const vbStep1Keys = vbStep1Opts.sections.map((s) => s.key);
const vbStep1Expected = ['yourAnswer', 'commonMistake'];
const vbStep1Missing = vbStep1Expected.filter((k) => !vbStep1Keys.includes(k));

if (vbStep1Missing.length) {
  console.error('FAIL verb_bank_two_step step1 missing sections:', vbStep1Missing.join(', '));
  process.exit(1);
}

// verb_bank_two_step — step 2 (wrong form)
const vbStep2Screen = {
  formatType: 'verb_bank_two_step',
  payload: {
    sentence: vbItem.blankSentence || vbItem.sentence,
    baseVerb: vbItem.baseVerb,
    answer: vbItem.answer,
    completedSentence: vbItem.completedSentence,
    step: 'type_form',
    selectedVerb: vbItem.baseVerb,
    explanationContent: vbItem.explanationContent
  }
};

const vbStep2Wrong = {
  correct: false,
  correctAnswer: 'stay',
  userAnswer: 'staying'
};

const vbStep2Opts = SunePlayExplanation.buildExplainOpts(vbStep2Screen, vbStep2Wrong);
const vbStep2Keys = vbStep2Opts.sections.map((s) => s.key);
const vbStep2Expected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const vbStep2Missing = vbStep2Expected.filter((k) => !vbStep2Keys.includes(k));

if (vbStep2Missing.length) {
  console.error('FAIL verb_bank_two_step step2 missing sections:', vbStep2Missing.join(', '));
  process.exit(1);
}

console.log('PASS verb_bank_two_step explanation builder (step 1)');
console.log('Sections:', vbStep1Keys.join(' → '));
console.log('PASS verb_bank_two_step explanation builder (step 2)');
console.log('Sections:', vbStep2Keys.join(' → '));

// crossword_clues
const cwItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit6.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u6-ex-c').items[0];

const cwScreen = {
  formatType: 'crossword_clues',
  payload: {
    clueNumber: cwItem.clueNumber,
    clue: cwItem.clue,
    answer: cwItem.answer,
    letterCount: cwItem.letterCount,
    explanationContent: cwItem.explanationContent
  }
};

const cwWrong = {
  correct: false,
  correctAnswer: cwItem.answer,
  userAnswer: 'revisee'
};

const cwOpts = SunePlayExplanation.buildExplainOpts(cwScreen, cwWrong);
const cwKeys = cwOpts.sections.map((s) => s.key);
const cwExpected = ['correct', 'yourAnswer', 'commonMistake'];
const cwMissing = cwExpected.filter((k) => !cwKeys.includes(k));

if (cwMissing.length) {
  console.error('FAIL crossword_clues missing sections:', cwMissing.join(', '));
  process.exit(1);
}

if (!String(cwOpts.context).includes('notes')) {
  console.error('FAIL crossword_clues context should include clue text');
  process.exit(1);
}

if (/^\d+\.\s/.test(String(cwOpts.context))) {
  console.error('FAIL crossword_clues context should not include clue number');
  process.exit(1);
}

if (!String(cwOpts.context).includes('___')) {
  console.error('FAIL crossword_clues context should show gap in phrase');
  process.exit(1);
}

const cwEnrichedScreen = {
  formatType: 'crossword_clues',
  payload: {
    clueNumber: 8,
    clue: 'The act of trying to win against others. | We entered a swimming ...... at the sports centre.',
    answer: 'competition',
    letterCount: 11,
    explanationContent: cwItem.explanationContent
  }
};

const cwEnrichedOpts = SunePlayExplanation.buildExplainOpts(cwEnrichedScreen, cwWrong);
if (!cwEnrichedOpts.contextParts || !cwEnrichedOpts.contextParts.definition.includes('trying to win')) {
  console.error('FAIL crossword_clues enriched context should include definition');
  process.exit(1);
}
if (!cwEnrichedOpts.contextParts.phrase.includes('swimming ___ at the sports centre')) {
  console.error('FAIL crossword_clues enriched context should include phrase with gap');
  process.exit(1);
}
if (/^\d+\.\s/.test(String(cwEnrichedOpts.context)) || String(cwEnrichedOpts.context).includes(' | ')) {
  console.error('FAIL crossword_clues enriched context should not include clue number or separator');
  process.exit(1);
}

console.log('PASS crossword_clues explanation builder');
console.log('Sections:', cwKeys.join(' → '));

// comma_placement (rewrite mode — non-defining clause)
const cpItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit17.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u17-ex-b').items[0];

const cpScreen = {
  formatType: 'comma_placement',
  payload: {
    interactionMode: 'rewrite_sentence',
    sentence: cpItem.sentence,
    answer: cpItem.answer,
    reconstructedSentence: cpItem.answer,
    noCommaNeeded: false,
    explanationContent: cpItem.explanationContent
  }
};

const cpWrong = {
  correct: false,
  correctAnswer: cpItem.answer,
  userAnswer: cpItem.sentence
};

const cpOpts = SunePlayExplanation.buildExplainOpts(cpScreen, cpWrong);
const cpKeys = cpOpts.sections.map((s) => s.key);
const cpExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const cpMissing = cpExpected.filter((k) => !cpKeys.includes(k));

if (cpMissing.length) {
  console.error('FAIL comma_placement missing sections:', cpMissing.join(', '));
  process.exit(1);
}

if (!String(cpOpts.context).includes('brother')) {
  console.error('FAIL comma_placement context should show original sentence');
  process.exit(1);
}

console.log('PASS comma_placement explanation builder');
console.log('Sections:', cpKeys.join(' → '));

// word_bank_tick (exercise-level multi-select)
const wbtExercise = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/C1/Unit12.v2-test.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'c1-u12-test-ex-wbt');

const wbtScreen = {
  formatType: 'word_bank_tick',
  payload: {
    words: (wbtExercise.words || []).map((word, index) => ({ text: word, index })),
    answerWords: wbtExercise.answer.split(/,\s*/),
    instruction: wbtExercise.studentInstruction,
    explanationContent: wbtExercise.explanationContent
  }
};

const wbtWrong = {
  correct: false,
  selectedWords: ['budget', 'brain', 'culture'],
  userAnswer: 'budget, brain, culture',
  correctAnswer: wbtExercise.answer
};

const wbtOpts = SunePlayExplanation.buildExplainOpts(wbtScreen, wbtWrong);
const wbtKeys = wbtOpts.sections.map((s) => s.key);
const wbtExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake'];
const wbtMissing = wbtExpected.filter((k) => !wbtKeys.includes(k));

if (wbtMissing.length) {
  console.error('FAIL word_bank_tick missing sections:', wbtMissing.join(', '));
  process.exit(1);
}

const mistakeSection = wbtOpts.sections.find((s) => s.key === 'commonMistake');
if (!mistakeSection || !String(mistakeSection.text).includes('budget')) {
  console.error('FAIL word_bank_tick should personalize false positive (budget)');
  process.exit(1);
}

if (!String(wbtOpts.context).includes('suffix -y')) {
  console.error('FAIL word_bank_tick context should show instruction');
  process.exit(1);
}

console.log('PASS word_bank_tick explanation builder');
console.log('Sections:', wbtKeys.join(' → '));

// stative_sorting (drag-sort categories)
const ssItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit13.v2.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u13-ex-a').items[0];

const ssScreen = {
  formatType: 'stative_sorting',
  payload: {
    prompt: 'Tap each word and assign it to the correct box.',
    groups: ssItem.groups,
    explanationContent: ssItem.explanationContent
  }
};

const ssWrong = {
  correct: false,
  correctAnswer: ssItem.groups
    .flatMap((g) => g.answers.map((verb) => `${verb} → ${g.label}`))
    .join('\n'),
  misplacedWords: [{
    verb: 'furniture',
    placedGroupId: 'countable',
    placedLabel: 'Countable',
    correctGroupId: 'uncountable',
    correctLabel: 'Uncountable'
  }]
};

const ssOpts = SunePlayExplanation.buildExplainOpts(ssScreen, ssWrong);
const ssKeys = ssOpts.sections.map((s) => s.key);
const ssExpected = ['correct', 'grammarFocus', 'commonMistake'];
const ssMissing = ssExpected.filter((k) => !ssKeys.includes(k));

if (ssMissing.length) {
  console.error('FAIL stative_sorting missing sections:', ssMissing.join(', '));
  process.exit(1);
}

const ssMistake = ssOpts.sections.find((s) => s.key === 'commonMistake');
if (!ssMistake || !String(ssMistake.text).includes('furniture')) {
  console.error('FAIL stative_sorting should personalize misplaced word (furniture)');
  process.exit(1);
}

if (!String(ssOpts.context).includes('assign')) {
  console.error('FAIL stative_sorting context should show prompt');
  process.exit(1);
}

console.log('PASS stative_sorting explanation builder');
console.log('Sections:', ssKeys.join(' → '));

// passage_error_hunt_single — wrong fix phase
const pehExercise = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/B1/Unit1.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'b1-u1-ex-6');
const pehErrors = pehExercise.errors || pehExercise.items || [];
const pehItem = pehErrors[0];

const pehScreen = {
  formatType: 'passage_error_hunt_single',
  payload: {
    passage: pehExercise.passage,
    wrong: pehItem.targetPhrase || pehItem.wrong,
    answer: pehItem.answer,
    explanationContent: pehItem.explanationContent
  }
};

const pehWrongFix = {
  correct: false,
  huntPhase: 'wrong_fix',
  tappedPhrase: pehItem.wrong,
  userAnswer: 'enjoying',
  correctAnswer: pehItem.answer
};

const pehFixOpts = SunePlayExplanation.buildExplainOpts(pehScreen, pehWrongFix);
const pehFixKeys = pehFixOpts.sections.map((s) => s.key);
const pehFixExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const pehFixMissing = pehFixExpected.filter((k) => !pehFixKeys.includes(k));

if (pehFixMissing.length) {
  console.error('FAIL passage_error_hunt_single wrong_fix missing sections:', pehFixMissing.join(', '));
  process.exit(1);
}

if (pehFixKeys.includes('usefulTip')) {
  console.error('FAIL passage_error_hunt_single should not include usefulTip in explanation sections');
  process.exit(1);
}

// passage_error_hunt_single — wrong tap phase
const pehWrongTap = {
  correct: false,
  huntPhase: 'wrong_tap',
  tappedPhrase: 'painting',
  userAnswer: 'painting'
};

const pehTapOpts = SunePlayExplanation.buildExplainOpts(pehScreen, pehWrongTap);
const pehTapKeys = pehTapOpts.sections.map((s) => s.key);
const pehTapExpected = ['commonMistake', 'grammarFocus'];
const pehTapMissing = pehTapExpected.filter((k) => !pehTapKeys.includes(k));

if (pehTapMissing.length) {
  console.error('FAIL passage_error_hunt_single wrong_tap missing sections:', pehTapMissing.join(', '));
  process.exit(1);
}

if (!String(pehFixOpts.context).includes('[start1]') || !String(pehFixOpts.context).includes('enjoy')) {
  console.error('FAIL passage_error_hunt_single context should use marked snippet around the error');
  process.exit(1);
}

const pehBreakdown = pehFixOpts.sections.find((s) => s.key === 'sentenceBreakdown');
if (!pehBreakdown || !String(pehBreakdown.text).includes('[start1]')) {
  console.error('FAIL passage_error_hunt_single sentence breakdown should use bracket markers');
  process.exit(1);
}

console.log('PASS passage_error_hunt_single explanation builder (wrong_fix)');
console.log('Sections:', pehFixKeys.join(' → '));
console.log('PASS passage_error_hunt_single explanation builder (wrong_tap)');
console.log('Sections:', pehTapKeys.join(' → '));

// passage_error_hunt_counter — wrong fix with progress tip
const pehCounterScreen = {
  formatType: 'passage_error_hunt_counter',
  payload: {
    passage: pehExercise.passage,
    items: pehErrors.map((it) => ({
      wrong: it.targetPhrase || it.wrong,
      answer: it.answer,
      explanationContent: it.explanationContent
    })),
    errorCount: pehErrors.length,
    counter: { target: pehErrors.length }
  }
};

const pehCounterWrongFix = {
  correct: false,
  huntPhase: 'wrong_fix',
  activeItem: pehItem,
  huntItemIdx: 0,
  userAnswer: 'enjoying',
  correctAnswer: pehItem.answer,
  errorsRemaining: 9,
  errorsTotal: 10
};

const pehCounterFixOpts = SunePlayExplanation.buildExplainOpts(pehCounterScreen, pehCounterWrongFix);
const pehCounterFixKeys = pehCounterFixOpts.sections.map((s) => s.key);
const pehCounterFixExpected = ['correct', 'yourAnswer', 'grammarFocus', 'commonMistake', 'sentenceBreakdown'];
const pehCounterFixMissing = pehCounterFixExpected.filter((k) => !pehCounterFixKeys.includes(k));

if (pehCounterFixMissing.length) {
  console.error('FAIL passage_error_hunt_counter wrong_fix missing sections:', pehCounterFixMissing.join(', '));
  process.exit(1);
}

const pehCounterExerciseTip = SunePlayExplanation.getHuntExerciseTip(pehCounterScreen, pehCounterWrongFix);
if (!pehCounterExerciseTip || !String(pehCounterExerciseTip).includes('9 errors left')) {
  console.error('FAIL passage_error_hunt_counter should expose progress tip via getHuntExerciseTip');
  process.exit(1);
}

if (pehCounterFixKeys.includes('usefulTip')) {
  console.error('FAIL passage_error_hunt_counter should not include usefulTip in explanation sections');
  process.exit(1);
}

// passage_error_hunt_counter — mark success
const pehCounterMark = {
  correct: true,
  huntPhase: 'mark_success',
  _huntMarkResult: true,
  activeItem: pehItem,
  huntItemIdx: 0,
  errorsRemaining: 9,
  errorsTotal: 10
};

const pehCounterMarkOpts = SunePlayExplanation.buildExplainOpts(pehCounterScreen, pehCounterMark);
const pehCounterMarkKeys = pehCounterMarkOpts.sections.map((s) => s.key);
const pehCounterMarkExpected = ['grammarFocus'];
const pehCounterMarkMissing = pehCounterMarkExpected.filter((k) => !pehCounterMarkKeys.includes(k));

if (pehCounterMarkMissing.length) {
  console.error('FAIL passage_error_hunt_counter mark_success missing sections:', pehCounterMarkMissing.join(', '));
  process.exit(1);
}

const pehCounterMarkTip = SunePlayExplanation.getHuntExerciseTip(pehCounterScreen, pehCounterMark);
if (!pehCounterMarkTip || !String(pehCounterMarkTip).includes('write the correction')) {
  console.error('FAIL passage_error_hunt_counter mark_success should expose correction tip via getHuntExerciseTip');
  process.exit(1);
}

console.log('PASS passage_error_hunt_counter explanation builder (wrong_fix)');
console.log('Sections:', pehCounterFixKeys.join(' → '));
console.log('PASS passage_error_hunt_counter explanation builder (mark_success)');
console.log('Sections:', pehCounterMarkKeys.join(' → '));

// guided_error_choice (multi-item screen — current item only)
const gecExercise = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Course/C1/Unit12.v2-test.json'), 'utf8'))
  .contentBanks.exercises.find((e) => e.id === 'c1-u12-test-ex-gec');
const gecItem = gecExercise.items[0];

const gecScreen = {
  formatType: 'guided_error_choice',
  _guidedIdx: 0,
  payload: {
    instruction: gecExercise.studentInstruction,
    items: gecExercise.items
  }
};

const gecWrong = {
  correct: false,
  guidedItemIdx: 0,
  activeItem: gecItem,
  userAnswer: 'was',
  correctAnswer: gecItem.answer
};

const gecOpts = SunePlayExplanation.buildExplainOpts(gecScreen, gecWrong);
const gecKeys = gecOpts.sections.map((s) => s.key);
const gecExpected = ['correct', 'yourAnswer', 'optionContrast', 'grammarFocus'];
const gecMissing = gecExpected.filter((k) => !gecKeys.includes(k));

if (gecMissing.length) {
  console.error('FAIL guided_error_choice missing sections:', gecMissing.join(', '));
  process.exit(1);
}

const gecContrast = gecOpts.sections.find((s) => s.key === 'optionContrast');
if (!gecContrast || !String(gecContrast.text).includes('was')) {
  console.error('FAIL guided_error_choice should personalize wrong option contrast');
  process.exit(1);
}

if (!String(gecOpts.context).includes('~~was~~')) {
  console.error('FAIL guided_error_choice context should show wrong form');
  process.exit(1);
}

console.log('PASS guided_error_choice explanation builder');
console.log('Sections:', gecKeys.join(' → '));

// conversation_gap_fill (phrasal-verbs lesson data — renderer-only format)
const pvLesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/phrasal-verbs/B2/lesson-1.json'), 'utf8'));
const pvConv = pvLesson.conversations[0];
const pvGapLine = pvConv.lines[0];
const pvBracket = (pvGapLine.text.match(/\[([^\]]+)\]/) || [])[1];
const pvSep = pvBracket.indexOf('|');
const pvAnswer = pvBracket.slice(pvSep + 1).trim();
const pvDisplay = pvBracket.slice(0, pvSep).trim();

const convGapScreen = {
  formatType: 'conversation_gap_fill',
  payload: {
    conversationTitle: pvConv.title,
    lines: [
      {
        mode: 'gap',
        before: "I can't believe I ",
        after: ' the news about the promotion!',
        isActive: true
      },
      {
        mode: 'plain',
        text: 'What happened? How did it come out?',
        isActive: false
      }
    ],
    activeLineIndex: 0,
    answer: pvAnswer,
    explanationContent: pvGapLine.explanationContent
  }
};

const convGapWrong = {
  correct: false,
  userAnswer: 'come out',
  correctAnswer: pvAnswer
};

if (!pvGapLine.explanationContent) {
  console.error('FAIL conversation_gap_fill lesson data missing explanationContent — run migrate script');
  process.exit(1);
}

const convGapOpts = SunePlayExplanation.buildExplainOpts(convGapScreen, convGapWrong);
const convGapKeys = convGapOpts.sections.map((s) => s.key);
const convGapExpected = ['correct', 'yourAnswer', 'commonMistake', 'sentenceBreakdown'];
const convGapMissing = convGapExpected.filter((k) => !convGapKeys.includes(k));

if (convGapMissing.length) {
  console.error('FAIL conversation_gap_fill missing sections:', convGapMissing.join(', '));
  process.exit(1);
}

const convGapMistake = convGapOpts.sections.find((s) => s.key === 'commonMistake');
if (!convGapMistake || !String(convGapMistake.text).includes('come out')) {
  console.error('FAIL conversation_gap_fill should personalize wrong answer');
  process.exit(1);
}

if (!String(convGapOpts.context).includes(pvConv.title)) {
  console.error('FAIL conversation_gap_fill context should include conversation title');
  process.exit(1);
}

const convGapBreakdown = convGapOpts.sections.find((s) => s.key === 'sentenceBreakdown');
if (!convGapBreakdown || !String(convGapBreakdown.text).includes(pvDisplay)) {
  console.error('FAIL conversation_gap_fill sentence breakdown should use filled line');
  process.exit(1);
}

console.log('PASS conversation_gap_fill explanation builder');
console.log('Sections:', convGapKeys.join(' → '));

const audit = spawnSync('node', ['scripts/audit-two-option-explanations.js'], {
  cwd: ROOT,
  encoding: 'utf8'
});
if (audit.status !== 0) {
  console.error((audit.stdout || '') + (audit.stderr || ''));
  process.exit(audit.status || 1);
}
console.log(String(audit.stdout || '').trim());

