// scripts/generate-wordle-levels.js
// Run once: node scripts/generate-wordle-levels.js
// Generates static Wordle level JSON files into /wordle/{LEVEL}/wl{N}.json

const fs = require('fs');
const path = require('path');

const WL_LEVEL_IDS = ['A2', 'B1', 'B2', 'C1'];
const WORD_RE = /^[a-zA-Z]{3,12}$/;

function sanitizeClue(word, clue) {
  if (!clue || !word) return clue || '';
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + escaped + '\\b', 'gi');
  const sanitized = clue.replace(re, '___').trim();
  if (sanitized.replace(/[_\s|]/g, '').length < 8) return clue;
  return sanitized;
}

function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = (seed + 1) * 1664525 + 1013904223;
  for (let i = a.length - 1; i > 0; i--) {
    s = ((s * 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildVocabPool(levelId) {
  const seen = {};
  const pool = [];
  try {
    const vd = JSON.parse(fs.readFileSync('data/vocabulary/dictionary.json', 'utf8'));
    (vd.entries || []).forEach(e => {
      if (e.level !== levelId || !e.word || !WORD_RE.test(e.word)) return;
      const key = e.word.toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      pool.push({
        word: e.word.toUpperCase(),
        clue: sanitizeClue(e.word, e.definition || ''),
        type: 'vocabulary'
      });
    });
  } catch (e) {
    console.warn('vocabulary missing', e.message);
  }
  return pool;
}

function levelSeed(levelId) {
  let seed = 0;
  for (let i = 0; i < levelId.length; i++) {
    seed = ((seed << 5) - seed) + levelId.charCodeAt(i);
    seed = seed & seed;
  }
  return Math.abs(seed) + 9001;
}

function generateLevelEntries(levelId) {
  const pool = buildVocabPool(levelId);
  if (!pool.length) return [];

  const shuffled = seededShuffle(pool, levelSeed(levelId));
  const entries = [];

  for (let i = 0; i < shuffled.length; i++) {
    const entry = shuffled[i];
    entries.push({
      levelId,
      wlIndex: i,
      word: entry.word,
      clue: entry.clue,
      type: entry.type
    });
  }

  return entries;
}

function main() {
  const root = path.join(process.cwd(), 'wordle');
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

  const manifest = { levels: [], generatedAt: new Date().toISOString() };

  for (const levelId of WL_LEVEL_IDS) {
    const entries = generateLevelEntries(levelId);
    const levelDir = path.join(root, levelId);
    if (!fs.existsSync(levelDir)) fs.mkdirSync(levelDir, { recursive: true });

    manifest.levels.push({ id: levelId, count: entries.length });

    entries.forEach(entry => {
      const filePath = path.join(levelDir, 'wl' + entry.wlIndex + '.json');
      fs.writeFileSync(filePath, JSON.stringify({
        levelId: entry.levelId,
        wlIndex: entry.wlIndex,
        word: entry.word,
        clue: entry.clue,
        type: entry.type
      }, null, 2));
    });

    const validNames = new Set(entries.map(entry => 'wl' + entry.wlIndex + '.json'));
    fs.readdirSync(levelDir).forEach(fileName => {
      if (/^wl\d+\.json$/.test(fileName) && !validNames.has(fileName)) {
        fs.unlinkSync(path.join(levelDir, fileName));
      }
    });

    console.log('Generated', entries.length, 'Wordle levels for', levelId);
  }

  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Done. Manifest written to wordle/manifest.json');
}

main();
