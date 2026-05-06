import fs from 'fs';
import path from 'path';

const courseRoot = path.join('data', 'Course');
const specialSentenceSubtypes = new Set([
  'comma-placement',
  'find-extra-word',
  'word-spot',
  'bold-correct',
  'drag-category',
  'matching',
  'kwtrans-match'
]);

const errors = [];
let fileCount = 0;
let exerciseSectionCount = 0;
let itemCount = 0;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${filePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function getExerciseSections(data) {
  if (Array.isArray(data.sections)) return data.sections;
  if (data.sections && data.sections.exercises) return Object.values(data.sections.exercises);
  return [];
}

function isExerciseLike(section) {
  return !!(
    section &&
    (section.type === 'exercise' ||
      section.type === 'passage-input' ||
      section.items ||
      section.questions ||
      section.passage ||
      section.categories)
  );
}

function validateExerciseSection(filePath, section) {
  exerciseSectionCount += 1;
  const items = [...(section.items || []), ...(section.questions || [])];
  itemCount += items.length;

  if (!section.passage && !items.length && !(section.answers && section.answers.length) && !(section.words && section.categories)) {
    errors.push(`${filePath}: exercise '${section.title || ''}' has no interactive data`);
  }

  items.forEach((item, index) => {
    if (item.answers && !item.answer) {
      errors.push(`${filePath}: '${section.title || ''}' item ${index + 1} has answers without answer`);
    }

    if (item.options && !/^[A-Z]$/i.test(String(item.answer || ''))) {
      errors.push(`${filePath}: '${section.title || ''}' item ${index + 1} has options without a letter answer`);
    }

    const sentence = item.sentence || '';
    const looksInteractive = /(\.{5,}|\n|\*\*|\[\[)/.test(sentence) || item.options || item.sentenceA;
    if (sentence && !looksInteractive && !specialSentenceSubtypes.has(section.subtype)) {
      errors.push(`${filePath}: '${section.title || ''}' item ${index + 1} sentence may not render interactively`);
    }
  });

  if (section.passage) {
    const gapCount = (section.passage.match(/\(\d+\)\s*\.{5,}/g) || []).length;
    const expectedGapCount =
      (section.answers && section.answers.length) ||
      (section.items && section.items.length) ||
      (section.questions && section.questions.length) ||
      0;
    if (expectedGapCount && gapCount < expectedGapCount) {
      errors.push(`${filePath}: '${section.title || ''}' has ${gapCount} passage gaps for ${expectedGapCount} answers/items`);
    }
  }
}

for (const level of fs.readdirSync(courseRoot)) {
  const levelDir = path.join(courseRoot, level);
  if (!fs.statSync(levelDir).isDirectory()) continue;

  for (const fileName of fs.readdirSync(levelDir)) {
    if (!fileName.endsWith('.json')) continue;
    const filePath = path.join(levelDir, fileName);
    fileCount += 1;
    const data = readJson(filePath);
    if (!data) continue;

    getExerciseSections(data).forEach((section) => {
      if (isExerciseLike(section)) validateExerciseSection(filePath, section);
    });
  }
}

const b1ReviewErrors = [];
const b1Dir = path.join(courseRoot, 'B1');
for (const fileName of fs.readdirSync(b1Dir).filter((name) => /^Review\d+\.json$/.test(name))) {
  const filePath = path.join(b1Dir, fileName);
  const data = readJson(filePath);
  if (!data) continue;
  const scoringTotal = (data.sections || [])
    .filter((section) => section.type === 'exercise')
    .reduce((total, section) => total + ((section.scoring && section.scoring.maxScore) || 0), 0);
  if (scoringTotal !== data.totalPoints) {
    b1ReviewErrors.push(`${filePath}: section scoring total ${scoringTotal} does not match totalPoints ${data.totalPoints}`);
  }
}
errors.push(...b1ReviewErrors);

console.log(JSON.stringify({
  files: fileCount,
  exerciseSections: exerciseSectionCount,
  items: itemCount,
  b1Reviews: 14,
  errors: errors.length
}, null, 2));

if (errors.length) {
  console.error(errors.slice(0, 25).join('\n'));
  process.exit(1);
}
