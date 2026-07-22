/**
 * Shared helpers for the standardized 4-part "correct the mistake" explanation format:
 *   1. question      — original sentence with <mistake>highlighted error</mistake>
 *   2. fix           — recipe-style change line: "wrong" → "right" (note)
 *   3. whyCorrect    — one contextual grammar rule sentence
 *   4. correctedSentence — full corrected sentence
 */

export function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

export function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

export function wrapMistake(sentence, mistakeText) {
  const text = stripMd(sentence);
  const wrong = String(mistakeText || '').trim();
  if (!text || !wrong) return text;

  const wrapped = '**' + wrong + '**';
  if (text.includes(wrapped)) {
    return text.replace(wrapped, '<mistake>' + wrong + '</mistake>');
  }

  const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + escaped + '\\b', 'i');
  const match = text.match(re);
  if (match) {
    return text.replace(re, '<mistake>' + match[0] + '</mistake>');
  }

  return text.replace(escaped, '<mistake>' + wrong + '</mistake>');
}

export function applyCorrection(sentence, mistakeText, correction) {
  const text = stripMd(sentence);
  const wrong = String(mistakeText || '').trim();
  const fix = String(correction || '').trim();
  if (!text || !wrong || !fix) return text;

  const wrapped = '**' + wrong + '**';
  if (text.includes(wrapped)) {
    return text.replace(wrapped, fix);
  }

  const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'i'), fix);
}

function tokenize(s) {
  return String(s || '').match(/\S+/g) || [];
}

function isArticleOrQuantifier(token) {
  return /^(a|an|the|some|any|many|much|few|little|several|a few|a little)$/i.test(String(token || '').trim());
}

function expandChangeSpan(w, c, startW, startC, endW, endC) {
  let ew = endW;
  let ec = endC;
  const wrongCore = w.slice(startW, ew + 1).join(' ');
  const correctCore = c.slice(startC, ec + 1).join(' ');

  if (ew + 1 < w.length && ec + 1 < c.length &&
    normalizeToken(w[ew + 1]) === normalizeToken(c[ec + 1]) &&
    (isArticleOrQuantifier(wrongCore) || isArticleOrQuantifier(correctCore))) {
    ew++;
    ec++;
  }

  if (ew + 2 < w.length && ec + 2 < c.length &&
    normalizeToken(w[ew + 1]) === normalizeToken(c[ec + 1]) &&
    /^(piece|pieces)$/i.test(w[ew + 1]) &&
    /^(piece|pieces)$/i.test(c[ec + 1]) &&
    normalizeToken(w[ew + 2]) === normalizeToken(c[ec + 2])) {
    ew += 2;
    ec += 2;
  }

  if (startW > 0 && startC > 0 &&
    /^(piece|pieces)$/i.test(w[startW - 1]) &&
    /^(piece|pieces)$/i.test(c[startC - 1]) &&
    /^(two|three|four|five|several|a few)$/i.test(w[startW - 2] || '') &&
    /^(two|three|four|five|several|a few)$/i.test(c[startC - 2] || '')) {
    return {
      startW: startW - 2,
      startC: startC - 2,
      endW: ew,
      endC: ec
    };
  }

  return { startW, startC, endW: ew, endC: ec };
}

export function findChangeSpan(wrongSentence, correctSentence) {
  const w = tokenize(stripMd(wrongSentence).replace(/<s>[^<]*<\/s>/g, (m) => m.slice(3, -4)));
  const c = tokenize(stripMd(correctSentence));
  let startW = 0;
  let startC = 0;

  while (startW < w.length && startC < c.length &&
    normalizeToken(w[startW]) === normalizeToken(c[startC])) {
    startW++;
    startC++;
  }

  let endW = w.length - 1;
  let endC = c.length - 1;
  while (endW >= startW && endC >= startC &&
    normalizeToken(w[endW]) === normalizeToken(c[endC])) {
    endW--;
    endC--;
  }

  if (startW > endW && startC > endC) {
    return { wrongSpan: '', correctSpan: '' };
  }

  const expanded = expandChangeSpan(w, c, startW, startC, endW, endC);

  return {
    wrongSpan: w.slice(expanded.startW, expanded.endW + 1).join(' '),
    correctSpan: c.slice(expanded.startC, expanded.endC + 1).join(' ')
  };
}

function normalizeToken(token) {
  return String(token || '').replace(/[.,!?;:]+$/, '').toLowerCase();
}

export function extractWrongWordFromPrompt(displayPrompt) {
  const match = String(displayPrompt || '').match(/<s>([^<]*)<\/s>/);
  return match ? match[1].trim() : '';
}

export function isCueBasedFullSentence(item) {
  const displayPrompt = String(item.displayPrompt || '');
  const cues = item.prompt?.cues || [];
  return cues.length > 1 && /\s\/\s/.test(displayPrompt);
}

export function isMistakeCorrectionFullSentence(item, exercise) {
  if (isCueBasedFullSentence(item)) return false;
  if (/<s>/.test(String(item.displayPrompt || ''))) return true;

  const inst = [
    exercise?.instructions,
    exercise?.studentInstruction,
    exercise?.exerciseTypeName
  ].join(' ');
  return /correct the mistake|find and correct|each sentence has one mistake|rewrite the sentence|write the correct|error correction|correct the errors/i.test(inst);
}

function inferFixNote(wrongSpan, correctSpan, sentence) {
  const wrong = String(wrongSpan || '').trim();
  const correct = String(correctSpan || '').trim();
  const lower = sentence.toLowerCase();

  if (!wrong && !correct) return '';
  if (!wrong && correct) return '(add "' + correct + '")';
  if (wrong && !correct) return '(remove "' + wrong + '")';

  if (correct.includes(wrong) && correct.length > wrong.length) {
    if (/\b(ing|ed|ly|er|est|ness|ment|tion|sion|ity|ise|ize)\b/i.test(correct.slice(wrong.length))) {
      return '(add the word ending)';
    }
    return '(expand to "' + correct + '")';
  }

  if (wrong.includes(correct) && wrong.length > correct.length) {
    return '(remove "' + wrong.replace(correct, '').trim() + '")';
  }

  if (/\b(is|are|was|were|am|be|been|being)\b/.test(wrong) &&
    /\b(is|are|was|were|am|be|been|being)\b/.test(correct)) {
    return '(change the verb form)';
  }

  if (/\b(a|an|the|some|many|much|few|little)\b/i.test(wrong) ||
    /\b(a|an|the|some|many|much|few|little)\b/i.test(correct)) {
    return '(use the correct quantifier or article)';
  }

  if (/^(at|in|on|to|for|with|of|by|from|about|into|onto)$/i.test(wrong) ||
    /^(at|in|on|to|for|with|of|by|from|about|into|onto)$/i.test(correct)) {
    return '(use the correct preposition)';
  }

  if (/\b20\d{2}\b/.test(lower) || /january|february|march|april|may|june|july|august|september|october|november|december/i.test(lower)) {
    return '(match the time expression)';
  }

  if (wrong.split(/\s+/).length === 1 && correct.split(/\s+/).length === 1) {
    return '(swap the incorrect word)';
  }

  return '(apply the correction shown)';
}

export function buildFixLine(wrongSpan, correctSpan, sentence) {
  const wrong = String(wrongSpan || '').trim();
  const correct = String(correctSpan || '').trim();
  const note = inferFixNote(wrong, correct, sentence || '');
  if (!wrong && correct) return '"' + correct + '" ' + note;
  if (wrong && !correct) return '"' + wrong + '" → (remove) ' + note;
  return '"' + wrong + '" → "' + correct + '" ' + note;
}

function cleanWhyText(text) {
  return stripMd(text)
    .replace(/^The error is in "[^"]*" —\s*/i, '')
    .replace(/, so the correction is "[^"]*"\.?$/i, '.')
    .replace(/, so the sentence is "[^"]*"\.?$/i, '.')
    .trim();
}

function buildContextualWhy(item, existingContent, wrongSpan, correctSpan) {
  const grammarFocus = cleanWhyText(existingContent?.grammarFocus || '');
  const legacyWhy = cleanWhyText(existingContent?.whyCorrect || '');
  const sentence = stripMd(item.sentence || item.displayPrompt || '').toLowerCase();

  const legacyLooksFragment = legacyWhy &&
    (/^(years|months|days|parts|clock|seasons)\b/i.test(legacyWhy) ||
      legacyWhy.length < 40 && !/^[A-Z]/.test(legacyWhy));

  if (grammarFocus && !/^Build a grammatically complete sentence/i.test(grammarFocus) &&
    !/^Replace the incorrect word/i.test(grammarFocus) &&
    !/^Only the highlighted word/i.test(grammarFocus) &&
    (legacyLooksFragment || !legacyWhy)) {
    return ensurePeriod(grammarFocus);
  }

  if (legacyWhy && !/^The error is in/i.test(legacyWhy) &&
    !/^Replace the highlighted word/i.test(legacyWhy) &&
    !/^Write the complete sentence/i.test(legacyWhy) &&
    !legacyLooksFragment) {
    return ensurePeriod(legacyWhy);
  }

  const wrong = String(wrongSpan || item.highlightedText || '').trim();
  const correct = String(correctSpan || item.answer || '').trim();

  if (/\b20\d{2}\b/.test(sentence) && /^(at|in|on)$/i.test(wrong)) {
    return ensurePeriod('Use in with years — at is for clock times and specific places, not calendar years.');
  }
  if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(sentence) && /^(at|in|on)$/i.test(wrong)) {
    return ensurePeriod('Days of the week take on — match the day clue in the sentence.');
  }
  if (/half past|quarter|o'clock|\d{1,2}:\d{2}/i.test(sentence) && /^(at|in|on)$/i.test(wrong)) {
    return ensurePeriod('Clock times use at — the time expression in the sentence needs a precise-time preposition.');
  }
  if (/january|february|march|april|may|june|july|august|september|october|november|december/i.test(sentence)) {
    return ensurePeriod('Months take in — on is for days and dates, not month names.');
  }
  if (/information|advice|bread|money|furniture/i.test(sentence)) {
    return ensurePeriod('Uncountable nouns cannot take a/an or plural forms — use some, much, or a piece of instead.');
  }
  if (/jeans|trousers|scissors|glasses/i.test(sentence)) {
    return ensurePeriod('Some nouns are always plural in English — the verb must agree with a plural form.');
  }
  if (/is working|are working|am working/i.test(sentence)) {
    return ensurePeriod('Use the present simple for permanent jobs or habits — present continuous describes temporary actions.');
  }
  if (/are not|is not|aren't|isn't/i.test(wrong) && /ing\b/i.test(correct)) {
    return ensurePeriod('Present continuous describes how someone feels right now — use be + -ing, not a general state verb.');
  }

  if (wrong && correct) {
    return ensurePeriod('The highlighted form does not fit the grammar clues in this sentence — use "' + correct + '" instead of "' + wrong + '".');
  }

  return ensurePeriod(legacyWhy || grammarFocus || 'Read the sentence clues to pick the form that fits this context.');
}

export function buildErrorCorrectionExplanationContent(item, existingContent = {}) {
  const wrong = String(item.highlightedText || '').trim();
  const correct = String(item.answer || '').trim();
  const sentence = stripMd(item.sentence || '');

  const whyCorrect = buildContextualWhy(item, existingContent, wrong, correct);
  const question = wrapMistake(sentence, wrong);
  const fix = buildFixLine(wrong, correct, sentence);
  const correctedSentence = applyCorrection(sentence, wrong, correct);

  return Object.assign({}, existingContent, {
    question,
    fix,
    whyCorrect,
    correctedSentence,
    sentenceBreakdown: correctedSentence
  });
}

export function buildFullSentenceMistakeExplanationContent(item, exercise, existingContent = {}) {
  const displayPrompt = stripMd(String(item.displayPrompt || ''));
  const answer = String(item.answer || '').trim();
  const taggedWrong = extractWrongWordFromPrompt(item.displayPrompt || '');

  let wrongSpan = taggedWrong;
  let correctSpan = '';

  if (taggedWrong && !answer.includes(' ')) {
    correctSpan = answer;
  } else {
    const change = findChangeSpan(displayPrompt, answer);
    wrongSpan = change.wrongSpan || taggedWrong;
    correctSpan = change.correctSpan || answer;
  }

  const question = taggedWrong
    ? String(item.displayPrompt || '').replace(/<s>([^<]*)<\/s>/, '<mistake>$1</mistake>').replace(/<\/?s>/g, '')
    : wrapMistakeInSentence(displayPrompt, wrongSpan);
  const fix = buildFixLine(wrongSpan, correctSpan, displayPrompt);
  const whyCorrect = buildContextualWhy(item, existingContent, wrongSpan, correctSpan);
  const correctedSentence = answer;

  return Object.assign({}, existingContent, {
    question,
    fix,
    whyCorrect,
    correctedSentence,
    sentenceBreakdown: correctedSentence
  });
}

function wrapMistakeInSentence(sentence, mistakeText) {
  const text = stripMd(sentence);
  const wrong = String(mistakeText || '').trim();
  if (!text || !wrong) return text;

  const idx = text.toLowerCase().indexOf(wrong.toLowerCase());
  if (idx === -1) return wrapMistake(text, wrong);

  return text.slice(0, idx) +
    '<mistake>' + text.slice(idx, idx + wrong.length) + '</mistake>' +
    text.slice(idx + wrong.length);
}

export function buildMistakeExplanationContent(item, exercise, existingContent = {}) {
  const ft = exercise?.exerciseType || exercise?.interaction?.formatType || item.formatType;

  if (ft === 'error_correction' || item.formatType === 'error_correction') {
    return buildErrorCorrectionExplanationContent(item, existingContent);
  }

  if ((ft === 'full_sentence_write' || item.formatType === 'full_sentence_write') &&
    isMistakeCorrectionFullSentence(item, exercise)) {
    return buildFullSentenceMistakeExplanationContent(item, exercise, existingContent);
  }

  return existingContent;
}

export function usesMistakeExplanationFormat(content) {
  return !!(content && content.fix && content.question && content.correctedSentence);
}
