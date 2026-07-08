import {
  countLegacyItems,
  extractBold,
  flattenExerciseItems,
  hasGapMarkers,
  isInlineAbChoice
} from './utils.js';

function hasBoldChoice(sentence) {
  return /\*\*[^*]+\/[^*]+\*\*/.test(String(sentence || ''));
}

function isPassageInput(exercise) {
  return exercise.type === 'passage-input' ||
    exercise.subtype === 'passage-input' ||
    (exercise.passage && Array.isArray(exercise.answers) && !exercise.questions && !exercise.items);
}

function isWordTick(exercise) {
  return !((exercise.questions || exercise.items || []).length) &&
    Array.isArray(exercise.words) && exercise.words.length > 0 &&
    !!exercise.answer && !exercise.passage;
}

function isMcPassage(exercise) {
  var items = exercise.questions || exercise.items || [];
  return !!exercise.passage && items.some(function(it) { return it.options && it.options.length >= 2; });
}

function isPassageGapFill(exercise) {
  return !!exercise.passage &&
    (exercise.questions || exercise.items || []).length > 0 &&
    !(exercise.questions || []).some(function(q) { return q.options && q.options.length; });
}

function isPassageWordFormation(exercise) {
  if (!exercise.passage) return false;
  var passage = String(exercise.passage);
  return /\([A-Z]{2,}\)/.test(passage) || /…\(\d+\)…\s*\([A-Z]+\)/.test(passage);
}

/**
 * Detect v2 format for a legacy exercise block.
 * Returns { formatType, screenMode, legacyPattern, legacyItemCount, notes }
 */
function isFullSentenceRewrite(item, instructions) {
  var sentence = String(item.sentence || '').trim();
  var answer = String(item.answer || '').trim();
  if (!sentence || !answer) return false;
  if (hasGapMarkers(sentence)) return false;
  if (item.sentenceA || item.sentenceB || item.options) return false;
  if (/\[[^\]]+\]/.test(sentence)) return false;
  if (isInlineAbChoice(sentence)) return false;
  if (/\*\*[^*]+\*\*/.test(sentence) && answer.length < sentence.length * 0.8) return false;
  var inst = String(instructions || '').toLowerCase();
  if (/rewrite|write the correct|correct the mistake|join the sentence|change .* to|change into/i.test(inst)) {
    return true;
  }
  return answer.split(/\s+/).length >= 3 && answer !== sentence;
}

function isCommaRewriteItem(item, instructions) {
  var answer = String(item.answer || '').trim();
  var inst = String(instructions || '').toLowerCase();
  if (!inst.includes('comma')) return false;
  if (/no commas/i.test(answer)) return true;
  return /,/.test(answer);
}

export function detectLegacyFormat(exercise) {
  var items = flattenExerciseItems(exercise);
  var instructions = exercise.instructions || '';
  var result = {
    formatType: 'free_text_gap_fill',
    screenMode: null,
    legacyPattern: 'gap_fill',
    legacyItemCount: 0,
    notes: []
  };

  if (exercise.subtype === 'find-extra-word' || exercise.type === 'find-extra-word') {
    result.formatType = 'find_extra_word';
    result.legacyPattern = 'find-extra-word';
    result.legacyItemCount = items.length;
    return result;
  }

  if (exercise.subtype === 'drag-category' || exercise.type === 'drag-category') {
    result.formatType = 'stative_sorting';
    result.legacyPattern = 'drag-category';
    result.legacyItemCount = (exercise.words || []).length;
    result.notes.push('drag-category → stative_sorting');
    return result;
  }

  if (exercise.type === 'grouped' && exercise.groups) {
    result.legacyPattern = 'grouped';
    result.legacyItemCount = items.length;
    if (items.length && hasGapMarkers(items[0].sentence || '')) {
      var hasBrackets = /\([^)]*\/[^)]*\)/.test(items[0].sentence || '') ||
        /\([^)]+\)/.test(items[0].sentence || '');
      result.formatType = hasBrackets ? 'conjugation_gap_fill' : 'free_text_gap_fill';
      result.legacyPattern = hasBrackets ? 'grouped-conjugation' : 'grouped-gap-fill';
      return result;
    }
  }

  if (items.length && items[0].sentenceA && items[0].sentenceB) {
    result.formatType = 'two_option_choice';
    result.legacyPattern = 'same-meaning-ab';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && isInlineAbChoice(items[0].sentence)) {
    result.formatType = 'two_option_choice';
    result.legacyPattern = 'inline-ab-choice';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && items.every(function(it) { return isCommaRewriteItem(it, instructions); })) {
    result.formatType = 'comma_placement';
    result.legacyPattern = 'comma-rewrite';
    result.legacyItemCount = items.length;
    result.notes.push('comma instructions → comma_placement rewrite_sentence');
    return result;
  }

  if (items.length && items.every(function(it) { return isFullSentenceRewrite(it, instructions); })) {
    result.formatType = 'full_sentence_write';
    result.legacyPattern = 'sentence-rewrite';
    result.legacyItemCount = items.length;
    return result;
  }

  if (exercise.type === 'crossword') {
    result.formatType = 'crossword_clues';
    result.legacyPattern = 'crossword';
    result.legacyItemCount = (exercise.across || []).length + (exercise.down || []).length;
    return result;
  }

  if (exercise.type === 'matching' || exercise.subtype === 'matching') {
    result.formatType = 'column_matching';
    result.screenMode = 'all_pairs_single_screen';
    result.legacyPattern = 'matching';
    result.legacyItemCount = items.length;
    return result;
  }

  if (exercise.type === 'sync' || exercise.subtype === 'sync') {
    result.formatType = 'synced_gap_fill';
    result.legacyPattern = 'sync';
    result.legacyItemCount = items.length;
    return result;
  }

  if (exercise.type === 'kwtrans' || exercise.subtype === 'kwtrans') {
    result.formatType = 'keyword_transformation';
    result.legacyPattern = 'kwtrans';
    result.legacyItemCount = items.length;
    return result;
  }

  if (exercise.type === 'yn' || exercise.subtype === 'yn') {
    result.formatType = 'two_option_choice';
    result.legacyPattern = 'yn';
    result.legacyItemCount = items.length;
    result.notes.push('Mapped yn → two_option_choice with YES/NO options');
    return result;
  }

  if (isWordTick(exercise)) {
    result.formatType = 'word_bank_tick';
    result.screenMode = 'all_words_single_screen';
    result.legacyPattern = 'word-tick';
    result.legacyItemCount = 1;
    return result;
  }

  if (isPassageInput(exercise)) {
    result.formatType = 'passage_gap_fill';
    result.screenMode = 'single_passage_with_gaps';
    result.legacyPattern = 'passage-input';
    result.legacyItemCount = (exercise.answers || []).length;
    return result;
  }

  if (isMcPassage(exercise)) {
    result.formatType = 'mc_4_option';
    result.screenMode = 'all_gaps_single_screen';
    result.legacyPattern = 'mc-passage';
    result.legacyItemCount = items.length;
    return result;
  }

  if (isPassageGapFill(exercise) || isPassageWordFormation(exercise)) {
    result.formatType = 'passage_gap_fill';
    result.screenMode = 'single_passage_with_gaps';
    result.legacyPattern = isPassageWordFormation(exercise) ? 'passage-wf' : 'passage-gap-fill';
    result.legacyItemCount = items.length || (exercise.answers || []).length;
    return result;
  }

  if (exercise.textareaAnswer) {
    result.formatType = 'full_sentence_write';
    result.legacyPattern = 'textarea';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && items[0].options && !hasBoldChoice(items[0].sentence)) {
    result.formatType = 'mc_4_option';
    result.legacyPattern = 'mc-standalone';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && hasBoldChoice(items[0].sentence)) {
    var ans = String(items[0].answer || '').toUpperCase();
    if (ans === 'YES' || ans === 'NO') {
      result.formatType = 'two_option_choice';
      result.legacyPattern = 'yn-inline';
      result.notes.push('YES/NO bold pattern → two_option_choice');
    } else {
      result.formatType = 'two_option_choice';
      result.legacyPattern = 'circle-correct';
    }
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && /……|\.{3,}|_{3,}/.test(items[0].sentence || '') &&
      /\*\*[A-Z]{2,}\*\*\s*$/.test(String(items[0].sentence || '').trim())) {
    result.formatType = 'free_text_gap_fill';
    result.legacyPattern = 'word-formation';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && extractBold(items[0].sentence) && items[0].answer &&
      items.every(function(it) { return /\*\*[^*]+\*\*/.test(it.sentence || ''); }) &&
      !items[0].sentence.includes('......') && exercise.words) {
    result.formatType = 'error_correction';
    result.legacyPattern = 'bold-swap';
    result.legacyItemCount = items.length;
    result.notes.push('bold-swap → error_correction (highlightedText = wrong bold word); word bank not shown in UI');
    return result;
  }

  if (items.length && extractBold(items[0].sentence) && items[0].answer &&
      items.every(function(it) { return /\*\*[^*]+\*\*/.test(it.sentence || ''); }) &&
      !items[0].sentence.includes('......')) {
    result.formatType = 'error_correction';
    result.legacyPattern = 'error-correction';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && /\(.*\/.*\)/.test(items[0].sentence || '') && /……|\.{3,}|_{3,}/.test(items[0].sentence || '')) {
    result.formatType = 'free_text_gap_fill';
    result.legacyPattern = 'phrasal-particle';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && /\*\*[A-Z]{2,}\*\*/.test(items[0].sentence || '')) {
    result.formatType = 'free_text_gap_fill';
    result.legacyPattern = 'word-formation';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && /……|\.{3,}|_{3,}/.test(items[0].sentence || '')) {
    var hasBrackets = /\([^)]*\/[^)]*\)/.test(items[0].sentence || '') ||
      /\([^)]+\)/.test(items[0].sentence || '');
    result.formatType = hasBrackets ? 'conjugation_gap_fill' : 'free_text_gap_fill';
    result.legacyPattern = hasBrackets ? 'conjugation-gap' : 'gap-fill';
    result.legacyItemCount = items.length;
    return result;
  }

  if (items.length && items[0].sentence && items[0].sentence.includes('\n') && items[0].answer) {
    result.formatType = 'free_text_gap_fill';
    result.legacyPattern = 'phrasal-transform';
    result.legacyItemCount = items.length;
    return result;
  }

  result.legacyItemCount = countLegacyItems(exercise, result);
  result.notes.push('Fallback detection → free_text_gap_fill');
  return result;
}
