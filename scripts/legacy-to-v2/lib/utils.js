// Shared helpers for legacy → v2 migration

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function stripBold(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1');
}

export function extractBold(text) {
  var match = String(text || '').match(/\*\*([^*]+)\*\*/);
  return match ? match[1].trim() : '';
}

export function splitAnswerVariants(answer) {
  return String(answer || '')
    .split(/\s*\/\s*/)
    .map(function(v) { return v.trim(); })
    .filter(Boolean);
}

export function makeItemId(unitPrefix, exerciseKey, index) {
  return unitPrefix + '-ex' + String(exerciseKey).toLowerCase() + '-' + (index + 1);
}

export function makeExerciseId(unitPrefix, exerciseKey) {
  return unitPrefix + '-ex-' + String(exerciseKey).toLowerCase();
}

export function flattenExerciseItems(exercise) {
  if (exercise.type === 'grouped' && Array.isArray(exercise.groups)) {
    var flat = [];
    exercise.groups.forEach(function(g) {
      (g.questions || g.items || []).forEach(function(q) { flat.push(q); });
    });
    return flat;
  }
  return exercise.questions || exercise.items || [];
}

export function hasGapMarkers(text) {
  return /……|\.{3,}|_{3,}/.test(String(text || ''));
}

export function isInlineAbChoice(sentence) {
  return /^A\s+.+\s+\/\s+B\s+/i.test(String(sentence || '').trim());
}

export function parseInlineAbChoice(sentence, answer) {
  var text = String(sentence || '').trim();
  var parts = text.split(/\s+\/\s+/);
  if (parts.length < 2) return null;
  var optA = parts[0].replace(/^A\s+/i, '').trim();
  var optB = parts[1].replace(/^B\s+/i, '').trim();
  return {
    sentenceBefore: '',
    sentenceAfter: '',
    options: [optA, optB],
    answer: String(answer || '').trim().toUpperCase(),
    displayPrompt: text
  };
}

export function countLegacyItems(exercise, detection) {
  if (detection.legacyItemCount != null) return detection.legacyItemCount;
  if (exercise.type === 'crossword') {
    return (exercise.across || []).length + (exercise.down || []).length;
  }
  if (detection.formatType === 'passage_gap_fill' || detection.screenMode === 'single_passage_with_gaps') {
    if (exercise.answers && exercise.answers.length) return exercise.answers.length;
    return (exercise.questions || exercise.items || []).length;
  }
  if (detection.screenMode === 'all_pairs_single_screen') {
    return (exercise.questions || exercise.items || []).length;
  }
  if (detection.screenMode === 'all_words_single_screen') {
    return 1;
  }
  if (detection.screenMode === 'all_gaps_single_screen') {
    return (exercise.questions || exercise.items || []).length;
  }
  return (exercise.questions || exercise.items || []).length;
}

export function parseGapSlashChoice(sentence, answer) {
  var text = String(sentence || '');
  var match = text.match(/^(.*?)(?:……|\.{3,}|_{3,})\s*\(([^)]+)\)\s*(.*)$/s);
  if (!match) return null;

  var optionsStr = match[2];
  if (!/\//.test(optionsStr)) return null;

  var options = optionsStr.split('/').map(function(o) { return o.trim(); }).filter(Boolean);
  if (options.length < 2) return null;

  var ans = String(answer || '').trim();
  var ansLower = ans.toLowerCase();
  var matchesOption = options.some(function(opt) { return opt.toLowerCase() === ansLower; });
  if (!matchesOption) return null;

  var before = match[1].trim();
  var after = match[3].trim();
  var completed = (before + ' ' + ans + (after ? ' ' + after : ''))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.!?,;:])/g, '$1')
    .trim();
  return {
    sentenceBefore: before,
    sentenceAfter: after,
    options: options,
    answer: ans,
    originalSentence: text,
    completedSentence: completed
  };
}

export function parseTwoOptionFromBold(sentence, answer) {
  var text = String(sentence || '');
  var match = text.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/s);
  if (!match) return null;
  var options = match[2].split('/').map(function(o) { return o.trim(); }).filter(Boolean);
  if (options.length < 2) return null;
  var before = match[1].trim();
  var after = match[3].trim();
  return {
    sentenceBefore: before,
    sentenceAfter: after,
    options: options,
    answer: String(answer || '').trim(),
    originalSentence: text,
    completedSentence: (before + ' ' + answer + ' ' + after).replace(/\s+/g, ' ').trim()
  };
}

export function parseMcStandaloneItem(item) {
  var prompt = item.sentence || '';
  var parts = prompt.match(/^(.*?)(?:\.{3,}|…{2,}|_{3,})(.*)$/);
  return {
    sentenceBefore: item.sentenceBefore != null ? item.sentenceBefore : (parts ? parts[1].trim() : prompt),
    sentenceAfter: item.sentenceAfter != null ? item.sentenceAfter : (parts ? parts[2].trim() : ''),
    options: (item.options || []).map(function(opt) {
      var raw = String(opt).trim();
      var m = raw.match(/^([A-D])\s*(.*)$/i);
      return m ? { letter: m[1].toUpperCase(), text: m[2].trim() } : { letter: '', text: raw };
    }),
    answer: String(item.answer || '').trim().toUpperCase()
  };
}

export function parseKeywordTransformationItem(item) {
  var text = String(item.sentence || '');
  var lines = text.split('\n');
  var promptSentence = lines[0] ? lines[0].trim() : '';
  var second = lines.slice(1).join('\n').trim();
  var kwMatch = second.match(/^\*\*([^*]+)\*\*\s*(.*)$/s);
  var keyword = kwMatch ? kwMatch[1].trim() : '';
  var targetSentence = kwMatch ? kwMatch[2].trim() : second;
  return {
    promptSentence: promptSentence,
    keyword: keyword,
    targetSentence: targetSentence,
    answer: String(item.answer || '').trim()
  };
}

export function parseSyncSentences(item) {
  return String(item.sentence || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
}

export function extractLetterCountFromClue(clue) {
  var match = String(clue || '').match(/\((\d+)\)\s*$/);
  return match ? parseInt(match[1], 10) : null;
}
