#!/usr/bin/env node
/**
 * 1. Rewrites book-style studentInstruction fields in *.v2.json
 * 2. Builds lang/instructions/index.json with multilingual translations
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data/Course');

const BOOK_TO_WEB = {
  'Circle the correct word.': 'Tap the correct word.',
  'Circle the correct word or phrase.': 'Tap the correct word or phrase.',
  'Circle the correct phrase.': 'Tap the correct phrase.',
  'Circle the correct option in each sentence.': 'Tap the correct option in each sentence.',
  'Circle the correct modal phrase in each sentence.': 'Tap the correct modal phrase in each sentence.',
  'Circle the correct question tag in each sentence.': 'Tap the correct question tag in each sentence.',
  'Drag each word to the correct box.': 'Tap each word and assign it to the correct box.',
  'Each of the words in bold is in the wrong sentence. Write the correct words on the lines.': 'Each bold word is in the wrong sentence. Type the correct word for each line.',
  'Each of the words in bold is in the wrong sentence. Rewrite them correctly.': 'Each bold word is in the wrong sentence. Type the correct word for each line.',
  'If a line is correct, put a tick (✓). If there is an extra word in a line, write the word.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
  'If a line is correct, put a tick (✓). If there is an extra word, write it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
  'If a line is correct, click OK. If there is an extra word in a line, click on it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
  'If a line is correct, press OK. If there is an extra word, write it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
  'Choose the sentence that uses to or for correctly. Click A or B.': 'Choose the sentence that uses to or for correctly. Tap A or B.',
  'Read the text. Some lines contain one extra word that should not be there. Click the extra word. If a line is correct, leave it as it is.': 'Some lines contain one extra word. Tap the extra word. If a line is correct, tap OK.',
  'If the word or phrase in bold is correct, put OK. If it is incorrect, rewrite it correctly on the line.': 'If the word or phrase in bold is correct, tap OK. If it is incorrect, rewrite it correctly.',
  'Complete the crossword. All the answers are words in bold in exercise B.': 'Solve the crossword. The answers are the bold words from the previous exercise.',
  'Phrasal verbs with out, such as puzzle out, are often connected to the idea of finding information. Which of these phrasal verbs with out are also connected to this idea?': 'Phrasal verbs with out often relate to finding information. Tap the ones that fit this meaning.',
  'The prefix il-, as in illogical, is often used to make a positive word negative. Which of the words in bold in the following sentences are negative forms of positive words? Write YES or NO.': 'The prefix il- makes positive words negative. Tap YES or NO for each bold word.'
};

function normalize(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  if (BOOK_TO_WEB[raw]) return BOOK_TO_WEB[raw];
  return raw
    .replace(/\bCircle the\b/g, 'Tap the')
    .replace(/\bput a tick\b/gi, 'tap OK')
    .replace(/\bput OK\b/g, 'tap OK')
    .replace(/\bClick on\b/g, 'Tap')
    .replace(/\bClick the\b/g, 'Tap the')
    .replace(/\bClick A or B\b/g, 'Tap A or B')
    .replace(/\bDrag each\b/g, 'Tap each')
    .replace(/\bon the lines?\b/gi, 'in the gap')
    .replace(/\bwrite the correct words on the lines\b/gi, 'type the correct word for each line');
}

function walkV2Files(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkV2Files(full, out);
    else if (entry.name.endsWith('.v2.json')) out.push(full);
  }
  return out;
}

function fixV2Files() {
  let changed = 0;
  for (const file of walkV2Files(COURSE_DIR)) {
    const raw = fs.readFileSync(file, 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    let fileChanged = false;

    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node.studentInstruction === 'string') {
        const fixed = normalize(node.studentInstruction);
        if (fixed !== node.studentInstruction) {
          node.studentInstruction = fixed;
          fileChanged = true;
        }
      }
      Object.values(node).forEach(visit);
    }

    visit(data);
    if (fileChanged) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
      changed++;
    }
  }
  console.log('Updated', changed, 'v2 JSON files');
}

function collectStrings() {
  const set = new Set();
  for (const file of walkV2Files(COURSE_DIR)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    (function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node.studentInstruction === 'string') {
        const n = normalize(node.studentInstruction);
        if (n) set.add(n);
      }
      Object.values(node).forEach(visit);
    })(data);
  }

  // Exam defaults
  for (const level of ['B1', 'B2', 'C1']) {
    const defaultsPath = path.join(ROOT, 'Nivel', level, 'exercise-defaults.json');
    if (!fs.existsSync(defaultsPath)) continue;
    const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
    Object.values(defaults).forEach((part) => {
      if (part.description) set.add(part.description);
    });
  }

  return [...set].sort();
}

// Load bundled translations generated alongside this script
const bundlesPath = path.join(__dirname, 'instruction-translation-bundles.json');
const bundles = JSON.parse(fs.readFileSync(bundlesPath, 'utf8'));

function buildIndex(strings) {
  const langs = ['en', 'es', 'fr', 'pt', 'de', 'it', 'ca', 'pl', 'ru', 'zh', 'ar', 'ja', 'ko'];
  const translations = {};
  langs.forEach((lang) => { translations[lang] = []; });

  strings.forEach((enText) => {
    langs.forEach((lang) => {
      const bundle = bundles[lang] || {};
      translations[lang].push(bundle[enText] || enText);
    });
  });

  return { strings, translations };
}

fixV2Files();
const strings = collectStrings();
const index = buildIndex(strings);
const outDir = path.join(ROOT, 'lang/instructions');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log('Wrote', strings.length, 'instruction strings to lang/instructions/index.json');
