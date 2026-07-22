/**
 * Shared helpers for "THE FIX" option-contrast lines in multiple-choice explanations.
 * Format: "[wrong]" doesn't fit here → "[correct]" does, because [one-clause reason].
 */

export function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

export function stripQuotes(text) {
  return String(text || '').replace(/^["']|["']$/g, '').trim();
}

export function formatOptionContrast(wrongText, correctText, becauseClause) {
  const wrong = stripQuotes(wrongText);
  const correct = stripQuotes(correctText);
  let because = String(becauseClause || '').trim();
  if (!because) return '';
  because = because.replace(/[.!?]$/, '');
  if (/^because\b/i.test(because)) {
    because = because.replace(/^because\s+/i, '');
  }
  return ensurePeriod(
    `"${wrong}" doesn't fit here → "${correct}" does, because ${because}`
  );
}

export function isContrastFormatted(text) {
  return /doesn't fit here\s*→/.test(String(text || ''));
}

export function inferBecauseFromWrongNote(wrongNote, whyCorrect) {
  const note = String(wrongNote || '').trim();
  if (!note) {
    const why = String(whyCorrect || '').trim().replace(/[.!?]$/, '');
    return why || 'the context clue points to the correct option';
  }

  const quoted = note.match(/^["']([^"']+)["']\s+(.+)$/);
  if (quoted) {
    let rest = quoted[2].trim().replace(/[.!?]$/, '');
    rest = rest
      .replace(/^points the wrong way\s*[—-]\s*/i, '')
      .replace(/^does not match the clue in the rest of the sentence/i, 'it does not match the clue in the rest of the sentence')
      .replace(/^does not describe\b/i, 'it does not describe')
      .replace(/^does not form\b/i, 'it does not form')
      .replace(/^belongs to\b/i, 'it belongs to')
      .replace(/^is the wrong\b/i, 'it is the wrong')
      .replace(/^is only for\b/i, 'it is only for')
      .replace(/^is not used\b/i, 'it is not used')
      .replace(/^may be\b/i, 'it may be')
      .replace(/^can sound\b/i, 'it can sound')
      .replace(/^does not express\b/i, 'it does not express')
      .replace(/^does not fit\b/i, 'it does not fit')
      .replace(/^does not combine\b/i, 'it does not combine')
      .replace(/^breaks the grammar pattern described above/i, 'it breaks the grammar pattern needed here')
      .replace(/^does not match the grammar or meaning clue in this sentence/i, 'it does not match the grammar or meaning clue in this sentence');
    if (!/^(it|the|this|that|they|we|you|he|she)\b/i.test(rest)) {
      rest = rest.charAt(0).toLowerCase() + rest.slice(1);
    }
    return rest;
  }

  return note.replace(/[.!?]$/, '');
}

export function buildOptionContrastEntry(wrongKey, correctAnswer, wrongNote, whyCorrect) {
  const existing = String(wrongNote || '').trim();
  if (isContrastFormatted(existing)) return existing;
  const because = inferBecauseFromWrongNote(existing, whyCorrect);
  return formatOptionContrast(wrongKey, correctAnswer, because);
}

function normalizeMcOption(opt) {
  if (!opt) return { letter: '', text: '' };
  if (typeof opt === 'object' && opt.letter != null) {
    return {
      letter: String(opt.letter).trim().toUpperCase(),
      text: String(opt.text || '').trim()
    };
  }
  const raw = String(opt).trim();
  const match = raw.match(/^([A-D])\s*(.*)$/i);
  if (match) return { letter: match[1].toUpperCase(), text: match[2].trim() };
  return { letter: '', text: raw };
}

function getMcAnswerLetter(item) {
  return String(item.answer || '').trim().toUpperCase();
}

function getMcAnswerText(item) {
  const letter = getMcAnswerLetter(item);
  const opt = (item.options || []).map(normalizeMcOption).find((o) => o.letter === letter);
  return opt ? opt.text : letter;
}

function listWrongChoices(item) {
  const answer = String(item.answer || '').trim();
  const answerLetter = answer.toUpperCase();
  const wrong = [];

  (item.options || []).forEach((opt) => {
    if (typeof opt === 'object' && opt.letter != null) {
      const letter = String(opt.letter).trim().toUpperCase();
      const text = String(opt.text || '').trim();
      if (letter && letter !== answerLetter) {
        wrong.push({ key: letter, text: text || letter, altKey: text });
      }
      if (text && text !== answer && text.toLowerCase() !== answer.toLowerCase()) {
        wrong.push({ key: text, text, altKey: letter });
      }
      return;
    }
    const text = String(opt).trim();
    if (text && text !== answer) wrong.push({ key: text, text });
  });

  const seen = new Set();
  return wrong.filter((entry) => {
    const id = entry.key.toLowerCase();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function detectTenseBecause(wrongText, correctText, item) {
  const after = String(item.sentenceAfter || '').trim().toLowerCase();
  const before = String(item.sentenceBefore || '').trim().toLowerCase();
  const full = `${before} ${after}`;
  const wrong = String(wrongText || '').toLowerCase();
  const correct = String(correctText || '').toLowerCase();

  const habitMarkers = /very often|usually|always|every day|every week|never|sometimes|routine|habit|generally/;
  const nowMarkers = /right now|at the moment|now|this month|today|tonight|look!|listen!/;

  if (habitMarkers.test(full)) {
    if (/aren't|isn't|am not|not \w+ing/.test(wrong) && /don't|doesn't|do not|does not/.test(correct)) {
      return 'the sentence describes a general habit, not something happening right now';
    }
    if (/\w+ing\b/.test(wrong) && !/\w+ing\b/.test(correct) && !/don't|doesn't/.test(correct)) {
      return 'the sentence describes a general habit, not a temporary action';
    }
  }

  if (nowMarkers.test(full)) {
    if (/don't|doesn't|do not|does not/.test(wrong) && (/\w+ing\b/.test(correct) || /am |are |is /.test(correct))) {
      return 'the time clue signals an action happening around now';
    }
    if (!/\w+ing\b/.test(wrong) && /\w+ing\b/.test(correct)) {
      return 'the time clue signals the present continuous';
    }
  }

  if (/this month/.test(full) && /\w+ing\b/.test(correct)) {
    return 'this month describes a temporary situation around now';
  }

  if (/usually/.test(full) && /does|do\b/.test(correct)) {
    return 'usually describes a routine, so the present simple fits';
  }

  return '';
}

export function buildOptionContrastMap(item, content = {}) {
  const correctAnswer = item.formatType === 'mc_4_option'
    ? getMcAnswerText(item)
    : String(item.answer || '').trim();
  const answerLetter = item.formatType === 'mc_4_option' ? getMcAnswerLetter(item) : '';
  const whyCorrect = content.whyCorrect || '';
  const wrongOptions = content.wrongOptions || {};
  const existing = content.optionContrast || {};
  const optionContrast = {};
  const wrongChoices = listWrongChoices(item);

  wrongChoices.forEach(({ key, text }) => {
    if (existing[key] && isContrastFormatted(existing[key])) {
      optionContrast[key] = existing[key];
      return;
    }

    const wrongNote =
      existing[key] ||
      wrongOptions[key] ||
      wrongOptions[text] ||
      (answerLetter && wrongOptions[answerLetter === key ? text : key]) ||
      '';

    let because = detectTenseBecause(text || key, correctAnswer, item);
    if (!because) {
      because = inferBecauseFromWrongNote(wrongNote, whyCorrect);
    }

    const line = formatOptionContrast(text || key, correctAnswer, because);
    if (line) optionContrast[key] = line;

    if (text && text !== key && !optionContrast[text]) {
      optionContrast[text] = line;
    }
  });

  return optionContrast;
}

export function ensureExplanationOptionContrast(item) {
  if (!item.explanationContent) return false;
  const built = buildOptionContrastMap(item, item.explanationContent);
  if (!Object.keys(built).length) return false;

  const current = item.explanationContent.optionContrast || {};
  const merged = Object.assign({}, current, built);
  const changed = JSON.stringify(current) !== JSON.stringify(merged);
  item.explanationContent.optionContrast = merged;
  return changed;
}
