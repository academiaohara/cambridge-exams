#!/usr/bin/env node
/**
 * Migrate stative_sorting items to structured `explanationContent`.
 * Scans v2 unit files (contentBanks items) and legacy unit JSON (customScreens).
 *
 * Usage: node scripts/migrate-stative-sorting-explanations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'data', 'Course');

function walkJsonFiles(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJsonFiles(full, files);
    else if (name.endsWith('.json')) files.push(full);
  }
  return files;
}

function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + '.';
}

function stripMd(text) {
  return String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function detectSortTheme(groups) {
  const labels = (groups || []).map((g) => String(g.label || g.groupId || '').toLowerCase());
  const joined = labels.join(' ');
  if (/countable|uncountable/.test(joined)) return 'countable';
  if (/stative|action|dynamic/.test(joined)) return 'stative';
  return 'generic';
}

function formatGroupSummary(groups) {
  return (groups || [])
    .map((g) => `${g.label || g.groupId}: ${(g.answers || []).join(', ')}`)
    .join('; ');
}

function buildWhyCorrect(groups, legacy, theme) {
  const stripped = stripMd(legacy);
  if (stripped) return ensurePeriod(stripped);

  if (theme === 'countable') {
    return ensurePeriod(
      'Sort each noun by whether you can count individual items. ' +
      'Countable nouns have plurals; uncountable nouns do not.'
    );
  }
  if (theme === 'stative') {
    return ensurePeriod(
      'Stative verbs describe states, feelings, or possession — not actions in progress. ' +
      'Action verbs describe things people do.'
    );
  }
  return ensurePeriod(`Each word belongs in one category: ${formatGroupSummary(groups)}`);
}

function buildGrammarFocus(groups, theme) {
  if (theme === 'countable') {
    return 'Countable nouns take a/an and have plurals (a banana → bananas). ' +
      'Uncountable nouns have no plural (*furnitures*, *moneys*) and often use much/some.';
  }
  if (theme === 'stative') {
    return 'Stative verbs are usually not used in continuous forms (*I am knowing* ✗). ' +
      'Action verbs describe activities that can be in progress (*I am studying*).';
  }
  const labels = (groups || []).map((g) => g.label).filter(Boolean);
  if (labels.length >= 2) {
    return `Learn the rule for each group — ${labels[0]} vs ${labels[1]}.`;
  }
  return 'Each chip belongs in exactly one category — use the group label as your rule.';
}

function buildCommonMistake(theme) {
  if (theme === 'countable') {
    return 'If you can count individual items or add a plural -s, the noun is countable.';
  }
  if (theme === 'stative') {
    return 'If the verb describes a state or feeling rather than an activity, it is stative.';
  }
  return 'Re-read the group labels — one misplaced word makes the whole sort incorrect.';
}

function buildUsefulTip(theme) {
  if (theme === 'countable') {
    return 'Try adding a number or plural: *two bananas* works, but *two furnitures* does not.';
  }
  if (theme === 'stative') {
    return 'Ask: is this something happening now, or a state? *I like* = state · *I am playing* = action.';
  }
  return 'Sort the obvious words first, then use the category rules for the harder ones.';
}

const COUNTABLE_NOTES = {
  furniture: 'uncountable — no plural (*furnitures* ✗)',
  money: 'uncountable — we do not say *moneys*',
  news: 'uncountable — no *a news* or *news are*',
  bread: 'uncountable in this sense — no plural *breads*',
  banana: 'countable — plural: bananas',
  person: 'countable — plural: people',
  box: 'countable — plural: boxes',
  woman: 'countable — plural: women'
};

const STATIVE_NOTES = {
  know: 'stative — state of knowledge, not *I am knowing*',
  like: 'stative — feeling, not usually continuous',
  want: 'stative — desire/state',
  believe: 'stative — opinion or conviction',
  belong: 'stative — possession/relationship',
  prefer: 'stative — preference',
  understand: 'stative — mental state',
  need: 'stative — necessity',
  play: 'action — something you do (*I am playing*)',
  carry: 'action — physical activity',
  listen: 'action — can be in progress',
  study: 'action — activity in progress',
  walk: 'action — movement',
  wear: 'action — putting on clothes',
  borrow: 'action — doing something',
  'look for': 'action — searching activity'
};

function buildWrongOptions(groups, theme) {
  const wrongOptions = {};
  for (const group of groups || []) {
    for (const verb of group.answers || []) {
      const key = String(verb).trim();
      const lower = key.toLowerCase();
      if (theme === 'countable' && COUNTABLE_NOTES[lower]) {
        wrongOptions[key] = COUNTABLE_NOTES[lower];
      } else if (theme === 'stative' && STATIVE_NOTES[lower]) {
        wrongOptions[key] = STATIVE_NOTES[lower];
      } else {
        wrongOptions[key] = `belongs in ${group.label || group.groupId}.`;
      }
    }
  }
  return wrongOptions;
}

function buildExplanationContent(item) {
  const groups = item.groups || [];
  const theme = detectSortTheme(groups);
  const legacy = item.explanation || '';

  return {
    whyCorrect: buildWhyCorrect(groups, legacy, theme),
    grammarFocus: ensurePeriod(buildGrammarFocus(groups, theme)),
    wrongOptions: buildWrongOptions(groups, theme),
    commonMistake: ensurePeriod(buildCommonMistake(theme)),
    usefulTip: buildUsefulTip(theme)
  };
}

function migrateStativeSortingItem(item) {
  if (item.formatType !== 'stative_sorting') return false;
  if (!item.groups || !item.groups.length) return false;

  if (!item.explanationContent) {
    item.explanationContent = buildExplanationContent(item);
  }
  delete item.explanation;
  return true;
}

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const exercise of data.contentBanks?.exercises || []) {
    for (const item of exercise.items || []) {
      if (item.formatType === 'stative_sorting' || exercise.exerciseType === 'stative_sorting') {
        if (!item.formatType) item.formatType = 'stative_sorting';
        if (migrateStativeSortingItem(item)) changed++;
      }
    }
  }

  for (const node of data.practiceNodes || []) {
    for (const custom of node.customScreens || []) {
      if (custom.formatType !== 'stative_sorting') continue;
      if (!custom.groups || !custom.groups.length) continue;
      if (!custom.explanationContent) {
        custom.explanationContent = buildExplanationContent(custom);
      }
      delete custom.explanation;
      changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  return changed;
}

function main() {
  const files = walkJsonFiles(COURSE_DIR);
  let total = 0;

  for (const file of files) {
    const n = migrateFile(file);
    if (n > 0) {
      total += n;
      console.log(n, path.relative(ROOT, file));
    }
  }

  console.log('Migrated', total, 'stative_sorting item(s)');
}

main();
