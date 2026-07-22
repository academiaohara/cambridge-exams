/**
 * Shared helpers for passage_error_hunt_* sentence snippets with [startN]...[endN] markers.
 */

export function buildPhraseRegex(phrase) {
  const parts = String(phrase || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const pattern = parts.map((part) => {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return '\\b' + escaped + '\\b';
  }).join('\\s+');
  return new RegExp(pattern, 'i');
}

export function findPhraseMatch(text, phrase) {
  const re = buildPhraseRegex(phrase);
  if (!re) return null;
  const match = re.exec(String(text || ''));
  if (!match) return null;
  return { index: match.index, length: match[0].length, match: match[0] };
}

export function replacePhrase(text, phrase, replacement) {
  const re = buildPhraseRegex(phrase);
  if (!re) return String(text || '');
  return String(text || '').replace(re, replacement);
}

export function extractSentenceContaining(text, phrase) {
  const passage = String(text || '').trim();
  const hit = findPhraseMatch(passage, phrase);
  if (!hit) return passage;

  let start = passage.lastIndexOf('.', hit.index);
  start = start === -1 ? 0 : start + 1;
  while (start < passage.length && /\s/.test(passage.charAt(start))) start++;

  let end = passage.indexOf('.', hit.index + hit.length);
  if (end === -1) end = passage.length;
  else end += 1;

  return passage.slice(start, end).trim();
}

export function wrapMarkedSnippet(sentence, phrase, markerNum = 1) {
  const num = markerNum || 1;
  const re = buildPhraseRegex(phrase);
  if (!re) return String(sentence || '').trim();

  let replaced = false;
  const marked = String(sentence).replace(re, (match) => {
    replaced = true;
    return `[start${num}]${match}[end${num}]`;
  });
  return replaced ? marked : String(sentence).trim();
}

export function buildHuntMarkedSnippet(passage, phrase, markerNum = 1) {
  return wrapMarkedSnippet(extractSentenceContaining(passage, phrase), phrase, markerNum);
}

export function buildHuntSentenceBreakdown(passage, wrong, answer, ensurePeriod) {
  const sentence = extractSentenceContaining(passage, wrong);
  const wrongPhrase = String(wrong || '').trim();
  const fix = String(answer || '').trim();
  if (!sentence || !wrongPhrase || !fix) return '';

  const corrected = replacePhrase(sentence, wrongPhrase, fix);
  const snippet = wrapMarkedSnippet(corrected, fix, 1);
  return typeof ensurePeriod === 'function' ? ensurePeriod(snippet) : snippet;
}
