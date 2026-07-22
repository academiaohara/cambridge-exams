#!/usr/bin/env node
/**
 * Smoke test for SunePlayExplanation two_option_choice builder.
 * Run: node scripts/test-explanation-builder.js
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
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

const expected = ['correct', 'yourAnswer', 'whyCorrect', 'vocabularyFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
const missing = expected.filter((k) => !keys.includes(k));

if (missing.length) {
  console.error('FAIL missing sections:', missing.join(', '));
  process.exit(1);
}

if (!SunePlayExplanation.hasExplanation(screen, wrongResult)) {
  console.error('FAIL hasExplanation should be true');
  process.exit(1);
}

console.log('PASS two_option_choice explanation builder');
console.log('Sections:', keys.join(' → '));

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
const meaningExpected = ['correct', 'yourAnswer', 'sentenceBreakdown', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip'];
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
const mcExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip'];
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
const gapExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
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
const conjExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
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
const wbExpected = ['correct', 'yourAnswer', 'whyCorrect', 'vocabularyFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
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
const pgExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
const pgMissing = pgExpected.filter((k) => !pgKeys.includes(k));

if (pgMissing.length) {
  console.error('FAIL passage_gap_fill missing sections:', pgMissing.join(', '));
  process.exit(1);
}

console.log('PASS passage_gap_fill explanation builder');
console.log('Sections:', pgKeys.join(' → '));

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
const syncExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
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
const kwtExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'similarExample', 'usefulTip', 'sentenceBreakdown'];
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
const errExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
const errMissing = errExpected.filter((k) => !errKeys.includes(k));

if (errMissing.length) {
  console.error('FAIL error_correction missing sections:', errMissing.join(', '));
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
const fewExpected = ['correct', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
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
const tileExpected = ['correct', 'wordOrder', 'yourAnswer', 'whyCorrect', 'grammarFocus', 'commonMistake', 'usefulTip', 'sentenceBreakdown'];
const tileMissing = tileExpected.filter((k) => !tileKeys.includes(k));

if (tileMissing.length) {
  console.error('FAIL word_order_tiles missing sections:', tileMissing.join(', '));
  process.exit(1);
}

console.log('PASS word_order_tiles explanation builder');
console.log('Sections:', tileKeys.join(' → '));

