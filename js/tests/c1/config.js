// js/tests/c1/config.js — Grade evolution scale for C1 tests
(function () {
  window.TestsLevelConfig = window.TestsLevelConfig || {};
  window.TestsLevelConfig.C1 = {
    scaleBounds: [140, 210],
    gradeBands: [
      { min: 200, label: 'Grade A' },
      { min: 193, label: 'Grade B' },
      { min: 180, label: 'Grade C' },
      { min: 160, label: 'Level B2' },
      { min: 142, label: 'Level B1' }
    ]
  };
})();
