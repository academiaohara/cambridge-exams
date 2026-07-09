import { slugify } from './lib/utils.js';
import { buildV2Unit } from './lib/build-unit.js';

/**
 * Convert a legacy ReviewN.json block into a Sune Play v2 unit.
 */
export function buildReviewUnit(legacyReview, options) {
  options = options || {};
  var level = options.level || 'B1';
  var reviewNum = options.reviewNum;
  if (reviewNum == null) {
    var m = String(options.sourceFile || '').match(/Review(\d+)\.json$/i);
    reviewNum = m ? parseInt(m[1], 10) : (legacyReview.block || 1);
  }

  var unitPrefix = slugify(level) + '-r' + reviewNum;
  var legacyForBuild = Object.assign({}, legacyReview, {
    unit: reviewNum,
    type: 'grammar'
  });

  var result = buildV2Unit(legacyForBuild, {
    level: level,
    sourceFile: options.sourceFile || null,
    pilotTag: options.pilotTag || ''
  });

  var unit = result.unit;
  unit.type = 'review';
  unit.block = legacyReview.block;
  unit.unitTitle = legacyReview.unitTitle || ('Review ' + reviewNum);
  unit.unitSubtitle = legacyReview.unitTitle || '';
  unit.unitLevel = level;
  unit.unitFocus = [unit.unitTitle];
  unit.lessonStyle = 'sune-play-interactive';
  unit.unitStructure = {
    mode: 'practice_only',
    theoryRequiredBeforePractice: false,
    allowTheoryReviewFromPractice: false,
    practiceNodesUseExerciseItemsAsContentBank: true
  };
  unit.theory = {
    id: unitPrefix + '-theory',
    title: 'Review',
    shortTitle: 'Review',
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
    unit.practiceNodes[0].shortTitle = 'Review';
  }

  if (unit.migrationMeta) {
    unit.migrationMeta.pilot = false;
    unit.migrationMeta.sourceType = 'review';
  }

  return {
    unit: unit,
    coverage: result.coverage,
    stats: result.stats
  };
}
