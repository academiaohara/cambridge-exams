/**
 * Adds || paragraph separators to C1 reading1/2/3 JSON files that only have one paragraph.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examsRoot = path.join(__dirname, '..', 'Nivel', 'C1', 'Exams');

const SPLIT_GAPS = {
  1: [1, 3, 5, 7],
  2: [10, 13],
  3: [19],
};

function findGapIndex(text, gapNum) {
  const re = new RegExp(`\\(${gapNum}\\)`);
  const match = re.exec(text);
  return match ? match.index : -1;
}

function insertParagraphBreaks(text, splitGaps) {
  if (!text || text.includes('||')) return text;

  const insertPositions = [];

  for (const gapNum of splitGaps) {
    const gapIdx = findGapIndex(text, gapNum);
    if (gapIdx === -1) continue;

    let splitAt = gapIdx;
    const before = text.slice(0, gapIdx);
    const lastPeriod = before.lastIndexOf('. ');
    if (lastPeriod !== -1) {
      splitAt = lastPeriod + 2;
    }

    insertPositions.push(splitAt);
  }

  const unique = [...new Set(insertPositions)].sort((a, b) => b - a);
  let result = text;

  for (const pos of unique) {
    if (pos <= 0 || pos >= result.length) continue;
    if (result.slice(pos - 2, pos) === '||' || result.slice(pos, pos + 2) === '||') continue;
    const prefix = result.slice(0, pos).replace(/\s+$/, '');
    const suffix = result.slice(pos).replace(/^\s+/, '');
    result = `${prefix}||${suffix}`;
  }

  return result;
}

function processFile(filePath, part) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.includes('||')) return { updated: false, reason: 'already has breaks' };

  const data = JSON.parse(raw);
  const text = data.content?.text;
  if (!text || typeof text !== 'string') return { updated: false, reason: 'no text field' };

  const newText = insertParagraphBreaks(text, SPLIT_GAPS[part]);
  if (newText === text || !newText.includes('||')) {
    return { updated: false, reason: 'no splits applied' };
  }

  data.content.text = newText;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return { updated: true, paragraphs: newText.split('||').length };
}

let updated = 0;
let skipped = 0;
const failures = [];

for (const part of [1, 2, 3]) {
  const dirs = fs.readdirSync(examsRoot).filter((d) => d.startsWith('Test'));
  for (const dir of dirs) {
    const filePath = path.join(examsRoot, dir, `reading${part}.json`);
    if (!fs.existsSync(filePath)) continue;
    try {
      const result = processFile(filePath, part);
      if (result.updated) {
        updated++;
        console.log(`✓ ${path.relative(examsRoot, filePath)} → ${result.paragraphs} paragraphs`);
      } else {
        skipped++;
      }
    } catch (err) {
      failures.push({ file: filePath, error: err.message });
    }
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
if (failures.length) {
  console.error('Failures:', failures);
  process.exit(1);
}
