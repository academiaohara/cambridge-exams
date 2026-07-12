// js/sune-play/practice-screen-utils.js
// Shared screen instruction/context helpers for Sune Play practice sessions

(function() {
  'use strict';

  function resolveInstruction(text) {
    if (typeof InstructionI18n !== 'undefined') {
      return InstructionI18n.resolveSync(text);
    }
    return text;
  }

  function getScreenInstruction(screen) {
    if (!screen) return '';
    var p = screen.payload || {};
    switch (screen.formatType) {
      case 'two_option_choice':
        if (p.displayMode === 'same_meaning' ||
            (window.SunePlayNormalize && window.SunePlayNormalize.isSameMeaningChoicePayload(p))) {
          return p.instruction || 'Choose the option that means the same.';
        }
        return p.instruction || 'Choose the correct option to complete the sentence.';
      case 'free_text_gap_fill':
      case 'conjugation_gap_fill':
      case 'word_bank_gap_fill':
      case 'preselected_verb_gap_fill':
        if (p.sequentialSentences) {
          return p.instruction || 'Complete each sentence using the words in the box, one at a time.';
        }
        return p.instruction || (p.verbPrompt || p.preselectedVerb
          ? 'Use the correct form of the highlighted word.'
          : (p.wordBank && p.wordBank.length
            ? 'Complete the sentence using a word from the box.'
            : 'Complete the sentence with the correct word.'));
      case 'full_sentence_write': {
        var cues = (p.prompt && p.prompt.cues) || [];
        if ((!cues.length || cues.length <= 1) && p.displayPrompt && /\s\/\s/.test(p.displayPrompt)) {
          cues = String(p.displayPrompt).split(/\s*\/\s*/).map(function(s) { return s.trim(); }).filter(Boolean);
        }
        if (cues.length > 1) {
          return p.instruction || 'Complete the sentence with the correct verb form.';
        }
        return p.instruction || 'Write the corrected sentence.';
      }
      case 'word_order_tiles':
        return p.instruction || 'Build the sentence. Some words are extra.';
      case 'error_correction':
        return p.instruction || 'Correct the mistake in the sentence.';
      case 'verb_bank_two_step':
        return p.instruction || 'Write the verb in the correct form.';
      case 'passage_error_hunt_single':
        return p.instruction || 'Find one wrong verb phrase.';
      case 'passage_error_hunt_counter': {
        var huntPhase = screen._huntState && screen._huntState.phase;
        if (huntPhase === 'correct') return 'Write the correction for the error you marked.';
        var fixedCount = screen._huntState && screen._huntState.fixed
          ? Object.keys(screen._huntState.fixed).length
          : 0;
        if (fixedCount > 0) return 'Find and mark the next error in the passage.';
        return p.instruction || p.studentInstruction || 'Find and mark an error in the passage.';
      }
      case 'passage_gap_fill':
        if (p.sequentialGaps) {
          if (p.requireWordFormation) {
            return p.instruction || 'Use the word in capitals to form a new word for each gap, one gap at a time.';
          }
          return p.instruction || 'Select a verb from the box, write its correct form, and confirm each gap one by one.';
        }
        return p.instruction || 'Complete the passage using the verbs in the box.';
      case 'guided_error_choice':
        return p.instruction || 'Choose the correct form for each error.';
      case 'stative_sorting':
        return p.instruction || p.prompt || 'Sort the verbs into groups.';
      case 'meaning_contrast':
        return p.instruction || p.prompt || 'Choose the option that best fits the meaning.';
      case 'mc_4_option':
        if (p.displayMode === 'passage') {
          return p.instruction || 'Tap each numbered gap and choose A, B, C or D.';
        }
        return p.instruction || 'Choose the correct answer: A, B, C or D.';
      case 'find_extra_word':
        return p.instruction || 'If the line is correct, tap OK. If there is an extra word, tap it.';
      case 'keyword_transformation':
        return p.instruction || 'Complete the second sentence using the keyword. Write between two and five words.';
      case 'column_matching':
        return p.instruction || 'Tap a numbered beginning, then tap the matching ending letter.';
      case 'crossword_clues':
        return p.instruction || 'Complete the word using the definition.';
      case 'synced_gap_fill':
        return p.instruction || 'Write one word that fits all three sentences.';
      case 'comma_placement':
        if (p.interactionMode === 'rewrite_sentence') {
          return p.instruction || 'Add commas where needed. If no commas are needed, write "No commas".';
        }
        return p.instruction || 'Tap the comma slots where commas are needed.';
      case 'word_bank_tick':
        return p.instruction || 'Select the correct words by tapping them.';
      default:
        return p.instruction || '';
    }
  }

  function getScreenContext(screen) {
    if (!screen) return '';
    var p = screen.payload || {};
    switch (screen.formatType) {
      case 'two_option_choice':
        if (p.displayMode === 'same_meaning' ||
            (window.SunePlayNormalize && window.SunePlayNormalize.isSameMeaningChoicePayload(p))) {
          return String(p.sentenceBefore || '').trim();
        }
        return ((p.sentenceBefore || '') + ' ___ ' + (p.sentenceAfter || '')).replace(/\s+/g, ' ').trim();
      case 'meaning_contrast':
        return String(p.sentence || p.sentenceBefore || '').trim();
      case 'free_text_gap_fill':
      case 'conjugation_gap_fill':
      case 'preselected_verb_gap_fill':
        return p.sentence || p.instruction || '';
      case 'full_sentence_write':
        return p.displayPrompt || p.prompt || '';
      case 'error_correction':
        return p.sentence || '';
      case 'word_order_tiles':
        return p.prompt || p.instruction || '';
      case 'verb_bank_two_step':
        return p.sentence || '';
      case 'passage_error_hunt_single':
        return 'Find the error in the passage.';
      case 'passage_error_hunt_counter':
        return p.passage || 'Find the errors in the passage.';
      case 'passage_gap_fill':
        return p.passage || p.instruction || '';
      case 'stative_sorting':
        return p.instruction || 'Sort the verbs into groups.';
      case 'mc_4_option':
        if (p.displayMode === 'passage') return p.passage || p.instruction || '';
        return ((p.sentenceBefore || '') + ' ___ ' + (p.sentenceAfter || '')).replace(/\s+/g, ' ').trim();
      case 'find_extra_word':
        return p.sentence || p.instruction || '';
      case 'keyword_transformation':
        return p.promptSentence || p.instruction || '';
      case 'column_matching':
        return p.instruction || 'Match beginnings with endings.';
      case 'crossword_clues':
        if (typeof LearningCrossword !== 'undefined' && LearningCrossword.formatClueDisplay) {
          return LearningCrossword.formatClueDisplay(p.clue || '').trim();
        }
        return (p.clue || '').replace(/\s*\(\d+\)\s*$/, '').trim();
      case 'synced_gap_fill':
        return (p.sentences && p.sentences[0]) || p.instruction || '';
      case 'comma_placement':
        return p.sentence || p.instruction || '';
      case 'word_bank_tick':
        return p.instruction || 'Select the correct words.';
      default:
        return p.instruction || p.sentence || '';
    }
  }

  function getScreenCorrectAnswer(screen) {
    var p = (screen && screen.payload) || {};
    if (screen && screen.formatType === 'mc_4_option') {
      if (window.SunePlayNormalize && window.SunePlayNormalize.getMcCorrectAnswerDisplay) {
        return window.SunePlayNormalize.getMcCorrectAnswerDisplay(p);
      }
      if (p.answerText) return p.answerText;
    }
    if (screen && screen.formatType === 'comma_placement') {
      if (p.interactionMode === 'rewrite_sentence') {
        return p.reconstructedSentence || ((p.acceptedAnswers && p.acceptedAnswers[0]) || '');
      }
      if (p.noCommaNeeded) return 'No commas';
      return (p.commaAfterTokenIndexes || []).join(', ');
    }
    if (screen && screen.formatType === 'word_bank_tick') {
      return (p.answerWords || []).join(', ');
    }
    if (screen && screen.formatType === 'column_matching' && p.pairs && p.pairs.length) {
      return p.pairs.map(function(pair) {
        return pair.pairId + '→' + pair.correctLetter;
      }).join(' / ');
    }
    if (p.answer) return p.answer;
    if (p.acceptedAnswers && p.acceptedAnswers.length) return p.acceptedAnswers[0];
    return '';
  }

  window.SunePlayPracticeScreenUtils = {
    resolveInstruction: resolveInstruction,
    getScreenInstruction: getScreenInstruction,
    getScreenContext: getScreenContext,
    getScreenCorrectAnswer: getScreenCorrectAnswer
  };
})();
