// scripts/generate-crosswords.js
// Run once: node scripts/generate-crosswords.js
// Generates all static crossword JSON files into /crosswords/{LEVEL}/cw{N}.json

const fs   = require('fs');
const path = require('path');

const CW_MIN_PLACED  = 8;
const CW_MAX_PLACED  = 20;
const CW_BATCH_SIZE  = 30;
const CW_GRID_SIZE   = 21;
// 100 crosswords per CEFR level + 100 for the mixed level
const CW_LEVEL_CONFIG = [
  { id: 'A2',  count: 100 },
  { id: 'B1',  count: 100 },
  { id: 'B2',  count: 100 },
  { id: 'C1',  count: 100 },
  { id: 'mix', count: 100 }
];
// Levels that are combined into the 'mix' pool
const CW_MIX_LEVELS = ['A2', 'B1', 'B2', 'C1'];

const CW_STOPWORDS = {
  the:1,a:1,an:1,in:1,at:1,on:1,to:1,of:1,for:1,with:1,
  up:1,out:1,off:1,down:1,away:1,back:1,over:1,into:1,
  about:1,around:1,through:1,it:1,its:1,be:1,is:1,are:1,
  was:1,were:1,have:1,has:1,had:1,do:1,does:1,did:1,
  not:1,no:1,or:1,and:1,but:1,if:1,as:1,by:1,from:1,
  this:1,that:1,than:1,so:1,your:1,my:1,his:1,her:1,their:1
};

function buildPool(levelId) {
  // 'mix' combines words from all CEFR levels
  if (levelId === 'mix') {
    const mixSeen = {};
    const mixPool = [];
    for (const lvl of CW_MIX_LEVELS) {
      const lvlPool = buildPool(lvl);
      for (const entry of lvlPool) {
        const key = entry.word.toLowerCase();
        if (!mixSeen[key]) { mixSeen[key] = 1; mixPool.push(entry); }
      }
    }
    return mixPool;
  }

  const WORD_RE = /^[a-zA-Z]{3,12}$/;
  const seen    = {};
  const pool    = [];

  function add(word, clue, type) {
    const key = word.toLowerCase();
    if (!WORD_RE.test(key) || seen[key]) return;
    seen[key] = 1;
    pool.push({ word: word.toUpperCase(), clue, type });
  }

  // 1. Vocabulary dictionary
  try {
    const vd = JSON.parse(fs.readFileSync('data/vocabulary/dictionary.json', 'utf8'));
    (vd.entries || []).forEach(e => {
      if (e.level === levelId) add(e.word, e.definition, 'vocabulary');
    });
  } catch(e) { console.warn('vocabulary missing', e.message); }

  // 2. Collocations dictionary
  try {
    const cd = JSON.parse(fs.readFileSync('data/collocations/dictionary.json', 'utf8'));
    (cd.entries || []).forEach(e => {
      if (e.level === levelId && e.word && e.phrase) {
        const blank = e.phrase.replace(new RegExp('\\b' + e.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b','gi'), '___');
        add(e.word, e.definition + ' | ' + blank, 'collocation');
      }
    });
  } catch(e) { console.warn('collocations missing', e.message); }

  // 3. Phrasal verbs — use the particle/preposition as the answer word when possible
  try {
    const pvLevels = JSON.parse(fs.readFileSync('data/phrasal-verbs/levels.json','utf8'));
    const pvLevel  = (pvLevels.levels || []).find(l => l.id === levelId);
    if (pvLevel) {
      for (const lesson of (pvLevel.lessons || [])) {
        try {
          const pvLesson = JSON.parse(fs.readFileSync(`data/phrasal-verbs/${levelId}/${lesson.id}.json`,'utf8'));
          (pvLesson.phrasalVerbs || []).forEach(pv => {
            if (!pv.verb) return;
            const parts    = pv.verb.split(/\s+/);
            const mainVerb = parts[0];
            const particle = parts.slice(1).join(' ');
            // Prefer the particle as the crossword answer (allow 2+ letters)
            if (particle && /^[a-zA-Z]{2,12}$/.test(particle)) {
              const pk = particle.toLowerCase();
              if (!seen[pk]) {
                seen[pk] = 1;
                pool.push({ word: particle.toUpperCase(), clue: pv.definition + ' | ' + mainVerb + ' ___', type: 'phrasal-verb' });
                return;
              }
            }
            // Fallback to main verb
            add(mainVerb, pv.definition + (particle ? ' | ___ ' + particle : ''), 'phrasal-verb');
          });
        } catch(e) {}
      }
    }
  } catch(e) { console.warn('phrasal-verbs missing', e.message); }

  // 4. Idioms (uses data/idioms/levels.json + per-lesson files)
  try {
    const idLevels = JSON.parse(fs.readFileSync('data/idioms/levels.json','utf8'));
    const idLevel  = (idLevels.levels || []).find(l => l.id === levelId);
    if (idLevel) {
      for (const lesson of (idLevel.lessons || [])) {
        try {
          const idLesson = JSON.parse(fs.readFileSync(`data/idioms/${levelId}/${lesson.id}.json`,'utf8'));
          (idLesson.idioms || []).forEach(id => {
            if (!id.idiom) return;
            const words = id.idiom.toLowerCase().split(/\s+/);
            const kw    = words.find(w => /^[a-z]{3,12}$/.test(w) && !CW_STOPWORDS[w]);
            if (!kw) return;
            const blank = id.idiom.replace(new RegExp('\\b' + kw + '\\b','gi'),'___');
            add(kw, id.definition + ' | ' + blank, 'idiom');
          });
        } catch(e) {}
      }
    }
  } catch(e) { console.warn('idioms missing', e.message); }

  return pool;
}

// Build coverage-ensuring batches: cycles through the entire pool so every word
// appears across the set of crosswords.  Each batch is a contiguous window
// (with wrap-around) starting at a different position in the shuffled pool.
function buildCoverageBatches(pool, count, batchSize, baseSeed) {
  // Stable shuffle of the full pool using a level-specific seed
  const shuffled = seededShuffle(pool, baseSeed);
  const P = shuffled.length;
  const batches = [];
  // stride so that consecutive windows advance evenly through the pool
  const stride = P <= batchSize ? 1 : Math.max(1, Math.floor(P / count));
  for (let i = 0; i < count; i++) {
    const start = (i * stride) % P;
    const seen  = {};
    const batch = [];
    for (let j = 0; j < batchSize * 2 && batch.length < batchSize; j++) {
      const entry = shuffled[(start + j) % P];
      if (!seen[entry.word]) { seen[entry.word] = 1; batch.push(entry); }
    }
    batches.push(batch);
  }
  return batches;
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

function canPlace(grid, dirGrid, word, row, col, dir, SIZE) {
  if (dir === 'across') {
    if (col < 0 || col + word.length > SIZE) return false;
    if (col > 0 && grid[row][col-1] !== null) return false;
    if (col + word.length < SIZE && grid[row][col + word.length] !== null) return false;
  } else {
    if (row < 0 || row + word.length > SIZE) return false;
    if (row > 0 && grid[row-1][col] !== null) return false;
    if (row + word.length < SIZE && grid[row + word.length][col] !== null) return false;
  }
  let hasCrossing = false;
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'across' ? row     : row + i;
    const c = dir === 'across' ? col + i : col;
    const existing = grid[r][c];
    if (existing !== null) {
      if (existing !== word[i]) return false;
      hasCrossing = true;
      if (dirGrid[r][c][dir]) return false;
    } else {
      if (dir === 'across') {
        if (r > 0 && grid[r-1][c] !== null) return false;
        if (r+1 < SIZE && grid[r+1][c] !== null) return false;
      } else {
        if (c > 0 && grid[r][c-1] !== null) return false;
        if (c+1 < SIZE && grid[r][c+1] !== null) return false;
      }
    }
  }
  return hasCrossing;
}

function countCrossings(grid, word, row, col, dir) {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'across' ? row     : row + i;
    const c = dir === 'across' ? col + i : col;
    if (grid[r][c] !== null) count++;
  }
  return count;
}

function generateCrossword(words) {
  const SIZE   = CW_GRID_SIZE;
  const center = Math.floor(SIZE / 2);

  const eligible = words
    .filter(w => /^[a-zA-Z]{2,12}$/.test(w.word))
    .sort((a, b) => b.word.length - a.word.length);

  if (eligible.length < 2) return null;

  const grid    = Array.from({length: SIZE}, () => Array(SIZE).fill(null));
  const dirGrid = Array.from({length: SIZE}, () =>
    Array.from({length: SIZE}, () => ({ across: false, down: false }))
  );
  const placed  = [];

  const firstW  = eligible[0].word.toUpperCase();
  let   startC  = Math.max(0, center - Math.floor(firstW.length / 2));
  if (startC + firstW.length > SIZE) startC = SIZE - firstW.length;
  for (let i = 0; i < firstW.length; i++) {
    grid[center][startC + i]           = firstW[i];
    dirGrid[center][startC + i].across = true;
  }
  placed.push({ word: firstW, clue: eligible[0].clue, type: eligible[0].type, row: center, col: startC, dir: 'across' });

  for (let wi = 1; wi < eligible.length && placed.length < CW_MAX_PLACED; wi++) {
    const wordObj   = eligible[wi];
    const word      = wordObj.word.toUpperCase();
    let   bestScore = -Infinity;
    let   bestPos   = null;

    for (const pw of placed) {
      const tryDir = pw.dir === 'across' ? 'down' : 'across';
      for (let li = 0; li < word.length; li++) {
        for (let pli = 0; pli < pw.word.length; pli++) {
          if (word[li] !== pw.word[pli]) continue;
          const tr = tryDir === 'down'   ? pw.row - li  : pw.row + pli;
          const tc = tryDir === 'across' ? pw.col - li  : pw.col + pli;
          if (!canPlace(grid, dirGrid, word, tr, tc, tryDir, SIZE)) continue;
          const crossings = countCrossings(grid, word, tr, tc, tryDir);
          const score     = crossings * 10 - Math.abs(tr - center) - Math.abs(tc - center);
          if (score > bestScore) { bestScore = score; bestPos = { r: tr, c: tc, dir: tryDir }; }
        }
      }
    }

    if (bestPos) {
      const { r, c, dir } = bestPos;
      for (let i = 0; i < word.length; i++) {
        const pr = dir === 'across' ? r     : r + i;
        const pc = dir === 'across' ? c + i : c;
        grid[pr][pc]         = word[i];
        dirGrid[pr][pc][dir] = true;
      }
      placed.push({ word, clue: wordObj.clue, type: wordObj.type, row: r, col: c, dir });
    }
  }

  if (placed.length < CW_MIN_PLACED) return null;

  // Trim to bounding box
  let minR = SIZE, maxR = 0, minC = SIZE, maxC = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] !== null) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }

  // Number cells
  let clueNum = 1;
  const numberedCells = {};
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (grid[r][c] === null) continue;
      const startsAcross = (c === minC || grid[r][c-1] === null) && c+1 <= maxC && grid[r][c+1] !== null;
      const startsDown   = (r === minR || grid[r-1][c] === null) && r+1 <= maxR && grid[r+1] && grid[r+1][c] !== null;
      if (startsAcross || startsDown) {
        numberedCells[`${r - minR},${c - minC}`] = clueNum++;
      }
    }
  }

  const across = [], down = [];
  placed.forEach(p => {
    const key = `${p.row - minR},${p.col - minC}`;
    const num  = numberedCells[key] || 0;
    const entry = { number: num, word: p.word, clue: p.clue, type: p.type, row: p.row - minR, col: p.col - minC, length: p.word.length };
    if (p.dir === 'across') across.push(entry);
    else                    down.push(entry);
  });

  across.sort((a,b) => a.number - b.number);
  down.sort((a,b)   => a.number - b.number);

  // Build compact binary grid (bounding box, 1=letter cell, 0=black)
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const compactGrid = [];
  for (let r = minR; r <= maxR; r++) {
    const row = [];
    for (let c = minC; c <= maxC; c++) row.push(grid[r][c] !== null ? 1 : 0);
    compactGrid.push(row);
  }

  return { rows, cols, grid: compactGrid, numberedCells, across, down };
}

async function main() {
  let totalGenerated = 0;
  let totalFailed    = 0;
  const DIFF_MAP = { A2:'easy', B1:'easy', B2:'medium', C1:'hard', C2:'expert', mix:'mixed' };
  const generated = new Date().toISOString();

  for (const levelCfg of CW_LEVEL_CONFIG) {
    const { id: levelId, count } = levelCfg;
    console.log(`\n── ${levelId} (${count} crosswords) ──`);

    const outDir = path.join('crosswords', levelId);
    fs.mkdirSync(outDir, { recursive: true });

    const pool = buildPool(levelId);
    console.log(`  Pool: ${pool.length} words`);

    if (pool.length < CW_MIN_PLACED) {
      console.warn(`  ⚠️  ${levelId} — pool too small, skipping`);
      continue;
    }

    // Use a stable level-based seed for the initial shuffle so the coverage
    // window is deterministic across re-runs.
    const baseSeed = levelId.split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 0);
    const batches  = buildCoverageBatches(pool, count, CW_BATCH_SIZE, baseSeed);

    for (let idx = 0; idx < count; idx++) {
      const batch  = batches[idx];
      const cwData = generateCrossword(batch);

      if (!cwData) {
        console.warn(`  ⚠️  ${levelId} #${idx+1} — failed`);
        totalFailed++;
        continue;
      }

      const output = {
        id:            `${levelId}_cw${idx}`,
        level:         levelId,
        index:         idx,
        title:         levelId === 'mix' ? `Mix Crossword #${idx+1}` : `${levelId} Crossword #${idx+1}`,
        difficulty:    DIFF_MAP[levelId] || 'medium',
        generated,
        rows:          cwData.rows,
        cols:          cwData.cols,
        grid:          cwData.grid,
        numberedCells: cwData.numberedCells,
        across:        cwData.across,
        down:          cwData.down
      };

      const outPath = path.join(outDir, `cw${idx}.json`);
      fs.writeFileSync(outPath, JSON.stringify(output), 'utf8');
      console.log(`  ✅ ${levelId} #${idx+1} — ${cwData.across.length}A ${cwData.down.length}D (${cwData.rows}x${cwData.cols})`);
      totalGenerated++;
    }
  }

  const manifest = {
    levels: CW_LEVEL_CONFIG,
    total: totalGenerated,
    generated
  };
  fs.writeFileSync(path.join('crosswords', 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Done: ${totalGenerated} generated, ${totalFailed} failed`);
  console.log('📄 crosswords/manifest.json written');
}

main().catch(console.error);
