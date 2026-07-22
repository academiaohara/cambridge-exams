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
