import { slugify } from './lib/utils.js';
import { buildV2Unit } from './lib/build-unit.js';

/**
 * Convert a legacy ProgressTestN.json block into a Sune Play v2 unit.
 */
export function buildProgressTestUnit(legacyTest, options) {
  options = options || {};
  var level = options.level || 'B1';
  var testNum = options.testNum;
  if (testNum == null) {
    var m = String(options.sourceFile || '').match(/ProgressTest(\d+)\.json$/i);
    testNum = m ? parseInt(m[1], 10) : 1;
  }

  var blockKey = legacyTest.block || ('pt' + testNum);
  var unitPrefix = slugify(level) + '-pt' + testNum;
  var legacyForBuild = Object.assign({}, legacyTest, {
    unit: testNum,
    type: 'grammar'
  });

  var result = buildV2Unit(legacyForBuild, {
    level: level,
    sourceFile: options.sourceFile || null,
    pilotTag: options.pilotTag || ''
  });

  var unit = result.unit;
  unit.type = 'progress_test';
  unit.block = blockKey;
  unit.unitTitle = legacyTest.unitTitle || ('Progress Test ' + testNum);
  unit.unitSubtitle = legacyTest.unitTitle || '';
  unit.unitLevel = level;
  unit.unitFocus = [unit.unitTitle];
  unit.totalPoints = legacyTest.totalPoints || null;
  unit.lessonStyle = 'sune-play-interactive';
  unit.unitStructure = {
    mode: 'practice_only',
    theoryRequiredBeforePractice: false,
    allowTheoryReviewFromPractice: false,
    practiceNodesUseExerciseItemsAsContentBank: true
  };
  unit.theory = {
    id: unitPrefix + '-theory',
    title: 'Progress Test',
    shortTitle: 'Test',
    displayMode: 'swipeable_cards',
    completionRule: { type: 'view_all_cards', required: false },
    cards: []
  };

  if (unit.contentBanks && unit.contentBanks.exercises) {
    unit.contentBanks.exercises.forEach(function(ex, idx) {
      if (!ex.legacyKey) {
        var letterMatch = String(ex.title || '').match(/^([A-Z]):/);
        ex.legacyKey = letterMatch ? letterMatch[1] : String.fromCharCode(65 + idx);
      }
      ex.id = ex.id || (unitPrefix + '-ex-' + String(ex.legacyKey).toLowerCase());
    });
    unit.contentBanks.requiredExerciseIds = unit.contentBanks.exercises.map(function(ex) { return ex.id; });
  }

  if (unit.practiceNodes && unit.practiceNodes[0]) {
    unit.practiceNodes[0].nodeId = unitPrefix + '-node-1';
    unit.practiceNodes[0].title = unit.unitTitle;
    unit.practiceNodes[0].shortTitle = 'Test';
  }

  if (unit.migrationMeta) {
    unit.migrationMeta.pilot = false;
    unit.migrationMeta.sourceType = 'progress_test';
  }

  return {
    unit: unit,
    coverage: result.coverage,
    stats: result.stats
  };
}
