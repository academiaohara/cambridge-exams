#!/usr/bin/env node
/**
 * Generate collocations/levels.json and per-level lesson files from dictionary.json.
 * Groups entries by CEFR level and base word; each word becomes one lesson with
 * explanation + exercise points.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DICT_PATH = path.join(ROOT, 'data/collocations/dictionary.json');
const OUT_DIR = path.join(ROOT, 'data/collocations');

const LEVELS = ['B1', 'B2', 'C1'];
const LEVEL_ORDER = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

function slugify(word, index) {
  const base = String(word || 'word')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'word';
  return 'lesson-' + (index + 1) + '-' + base.slice(0, 24);
}

function buildExerciseQuestions(entries, allPhrases) {
  const questions = [];
  const pool = entries.slice();
  pool.sort(() => Math.random() - 0.5);

  pool.slice(0, Math.min(4, pool.length)).forEach(function(entry) {
    const phrase = entry.phrase;
    const blank = phrase.replace(new RegExp('^' + entry.word + '\\b', 'i'), '_____');
    const distractors = allPhrases
      .filter(function(p) { return p !== phrase; })
      .sort(function() { return Math.random() - 0.5; })
      .slice(0, 3)
      .map(function(p, i) { return String.fromCharCode(65 + i + 1) + ') ' + p; });

    if (distractors.length < 3) return;

    const correctLetter = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
    const options = ['A', 'B', 'C', 'D'].map(function(letter) {
      if (letter === correctLetter) return letter + ') ' + phrase;
      const d = distractors.shift();
      return d || letter + ') ' + phrase;
    });

    questions.push({
      sentence: 'Choose the correct collocation: ' + blank,
      options: options,
      correct: correctLetter
    });
  });

  return questions;
}

function buildLesson(levelId, word, entries, lessonIndex) {
  const lessonId = slugify(word, lessonIndex);
  const title = word.charAt(0).toUpperCase() + word.slice(1);
  const examples = entries.map(function(e) { return e.phrase + ' — ' + e.definition; });
  const allPhrases = entries.map(function(e) { return e.phrase; });
  const questions = buildExerciseQuestions(entries, allPhrases);

  const points = [
    {
      type: 'explanation',
      label: title + ' collocations',
      content: {
        phrasalVerb: title,
        definition: 'Common collocations with "' + word + '"',
        examples: examples
      }
    }
  ];

  if (questions.length > 0) {
    points.push({
      type: 'exercise',
      label: 'Practice: ' + title,
      content: {
        instructions: 'Choose the correct collocation',
        questions: questions
      }
    });
  }

  return {
    lessonId: lessonId,
    level: levelId,
    category: 'collocations',
    title: title,
    points: points,
    meta: {
      word: word,
      entryCount: entries.length
    }
  };
}

function main() {
  const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
  const entries = dict.entries || [];

  const byLevel = {};
  entries.forEach(function(entry) {
    var level = entry.level || 'B1';
    if (LEVEL_ORDER[level] === undefined) return;
    if (LEVELS.indexOf(level) === -1 && level === 'A2') {
      level = 'B1';
    }
    if (LEVELS.indexOf(level) === -1) return;
    if (!byLevel[level]) byLevel[level] = {};
    if (!byLevel[level][entry.word]) byLevel[level][entry.word] = [];
    byLevel[level][entry.word].push(entry);
  });

  const levelsConfig = [];

  LEVELS.forEach(function(levelId, levelIdx) {
    const wordMap = byLevel[levelId] || {};
    const words = Object.keys(wordMap).sort();
    const lessons = [];

    words.forEach(function(word, wi) {
      const lesson = buildLesson(levelId, word, wordMap[word], wi);
      const levelDir = path.join(OUT_DIR, levelId);
      fs.mkdirSync(levelDir, { recursive: true });
      fs.writeFileSync(
        path.join(levelDir, lesson.lessonId + '.json'),
        JSON.stringify(lesson, null, 2) + '\n'
      );

      lessons.push({
        id: lesson.lessonId,
        title: lesson.title,
        points: lesson.points.map(function(p) {
          return { type: p.type, label: p.label };
        })
      });
    });

    levelsConfig.push({
      id: levelId,
      name: levelId + ' – ' + (levelId === 'B1' ? 'Intermediate' : levelId === 'B2' ? 'Upper Intermediate' : 'Advanced'),
      requiredToUnlock: levelIdx === 0 ? null : LEVELS[levelIdx - 1],
      totalLessons: lessons.length,
      lessons: lessons
    });
  });

  const levelsJson = {
    category: 'collocations',
    name: 'Collocations',
    icon: '🔗',
    color: '#8b5cf6',
    levels: levelsConfig
  };

  fs.writeFileSync(path.join(OUT_DIR, 'levels.json'), JSON.stringify(levelsJson, null, 2) + '\n');

  const totalLessons = levelsConfig.reduce(function(sum, l) { return sum + l.lessons.length; }, 0);
  console.log('Generated collocations: ' + totalLessons + ' lessons across ' + LEVELS.join(', '));
}

main();
