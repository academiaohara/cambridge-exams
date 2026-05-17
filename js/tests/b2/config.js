// js/tests/b2/config.js — Grade evolution scale for B2 tests
(function () {
  window.TestsLevelConfig = window.TestsLevelConfig || {};
  window.TestsLevelConfig.B2 = {
    scaleBounds: [120, 190],
    gradeBands: [
      { min: 180, label: 'Grade A' },
      { min: 173, label: 'Grade B' },
      { min: 160, label: 'Grade C' },
      { min: 140, label: 'Level B1' },
      { min: 120, label: 'Level A2' }
    ]
  };
})();
