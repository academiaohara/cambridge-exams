// js/sune-play/vocab-exercise-adapter.js
// Converts fast-exercises vocabulary JSON to SunePlay screen objects

(function() {
  'use strict';

  var GAP_SPLIT_RE = /^(.*?)(?:\.{3,}|…{2,}|_{3,})(.*)$/s;
  var MC_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function normalizeExerciseType(type) {
    var t = String(type || '').toLowerCase();
    if (t === 'multiple-choice' || t === 'mcq') return 'multiple-choice';
    if (t === 'write-verb' || t === 'write') return 'write-verb';
    if (t === 'transform' || t === 'word-formation') return 'transform';
    return t;
  }

  function splitVocabGap(sentence) {
    var text = String(sentence || '');
    var match = text.match(GAP_SPLIT_RE);
    if (!match) return { before: text.trim(), after: '' };
    return { before: match[1].trim(), after: (match[2] || '').trim() };
  }

  function buildMcOptions(options) {
    return (options || []).map(function(opt, index) {
      var text = String(opt).replace(/^[A-D]\)\s*/i, '').trim() || String(opt).trim();
      return {
        letter: MC_LETTERS.charAt(index),
        text: text
      };
    }).filter(function(opt) {
      return opt.letter && opt.text;
    });
  }

  function resolveAnswerLetter(options, correctText) {
    var target = String(correctText || '').trim().toLowerCase();
    if (!target) return '';
    for (var i = 0; i < options.length; i++) {
      if (String(options[i].text || '').trim().toLowerCase() === target) {
        return options[i].letter;
      }
    }
    return MC_LETTERS.charAt(0);
  }

  function buildScreenId(context, index) {
    return 'vocab-' + context.sessionId + '-' + index;
  }

  function buildNodeId(context) {
    return 'vocab-' + context.sessionId;
  }

  function defaultMcInstruction(context) {
    if (context.instruction) return context.instruction;
    if (context.categoryId === 'word-formation') {
      return 'Choose the correct form of the word.';
    }
    return 'Choose the correct answer: A, B, C or D.';
  }

  function defaultWriteInstruction(context, exercise) {
    if (context.instruction) return context.instruction;
    var type = normalizeExerciseType(exercise.type);
    if (type === 'transform') return 'Write the correct form of the word.';
    return 'Complete the sentence with the correct word.';
  }

  function exerciseToScreen(exercise, index, context) {
    context = context || {};
    var type = normalizeExerciseType(exercise.type);
    var screenId = buildScreenId(context, index);
    var nodeId = buildNodeId(context);

    if (type === 'multiple-choice') {
      var parts = splitVocabGap(exercise.sentence || '');
      var options = buildMcOptions(exercise.options || []);
      var answerLetter = resolveAnswerLetter(options, exercise.correct);
      var answerOpt = options.find(function(o) { return o.letter === answerLetter; });
      return {
        screenId: screenId,
        nodeId: nodeId,
        formatType: 'mc_4_option',
        itemId: 'vocab-item-' + index,
        payload: {
          displayMode: 'standalone',
          prompt: exercise.sentence || '',
          sentenceBefore: parts.before,
          sentenceAfter: parts.after,
          options: options,
          answer: answerLetter,
          answerText: (answerOpt && answerOpt.text) || exercise.correct || '',
          explanation: exercise.explanation || '',
          instruction: defaultMcInstruction(context)
        },
        maxLifeLossPerScreen: 1,
        attemptsPerScreen: 1,
        lives: 5,
        _attemptsUsed: 0
      };
    }

    if (type === 'write-verb' || type === 'transform') {
      var answer = String(exercise.correct || '').trim();
      return {
        screenId: screenId,
        nodeId: nodeId,
        formatType: 'free_text_gap_fill',
        itemId: 'vocab-item-' + index,
        payload: {
          sentence: exercise.sentence || '',
          verbPrompt: exercise.hint || '',
          answer: answer,
          acceptedAnswers: answer ? [answer] : [],
          explanation: exercise.explanation || '',
          instruction: defaultWriteInstruction(context, exercise)
        },
        maxLifeLossPerScreen: 1,
        attemptsPerScreen: 1,
        lives: 5,
        _attemptsUsed: 0
      };
    }

    return null;
  }

  function exercisesToScreens(exercises, context) {
    if (!exercises || !exercises.length) return [];
    var screens = [];
    for (var i = 0; i < exercises.length; i++) {
      var screen = exerciseToScreen(exercises[i], i, context);
      if (screen) screens.push(screen);
    }
    return screens;
  }

  function buildPracticeConfig() {
    // normalize-answer.js applies case folding, whitespace collapse, and trailing-period
    // stripping by default via normalizeAnswer/prepareAnswerString — the same behaviour
    // described by doNotPenalize in Learning v2 unit JSON (that field is metadata only;
    // it is not read at runtime). Vocab free-text answers use checkScreen → matchesAnyAccepted.
    return {
      globalRules: {
        failedItemsReturnToQueue: true,
        maxRepeatedFailuresBeforeFallback: 2
      }
    };
  }

  window.SunePlayVocabExerciseAdapter = {
    exerciseToScreen: exerciseToScreen,
    exercisesToScreens: exercisesToScreens,
    buildPracticeConfig: buildPracticeConfig
  };
})();
