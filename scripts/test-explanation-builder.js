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
