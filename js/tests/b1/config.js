// js/tests/b1/config.js — Grade evolution scale for B1 tests
(function () {
  window.TestsLevelConfig = window.TestsLevelConfig || {};
  window.TestsLevelConfig.B1 = {
    scaleBounds: [80, 160],
    gradeBands: [
      { min: 140, label: 'Grade A' },
      { min: 133, label: 'Grade B' },
      { min: 120, label: 'Grade C' },
      { min: 102, label: 'Level A2' },
      { min: 82, label: 'Level A1' }
    ]
  };
})();
