// js/score-calculator.js
(function() {
  const conversionData = {
    "A2": {
      skills: ["Reading", "Writing", "Listening", "Speaking"],
      tables: {
        "Reading": [[7, 82], [13, 100], [20, 120], [28, 140]],
        "Writing": [[8, 82], [12, 100], [18, 120], [26, 140]],
        "Listening": [[6, 82], [11, 100], [17, 120], [23, 140]],
        "Speaking": [[10, 82], [18, 100], [27, 120], [41, 140]]
      },
      grades: [
        { min: 120, label: "Grade A", cefr: "B1" },
        { min: 110, label: "Grade B", cefr: "A2" },
        { min: 100, label: "Grade C", cefr: "A2" },
        { min: 82,  label: "Level A1", cefr: "A1" }
      ]
    },
    "B1": {
      skills: ["Reading", "Writing", "Listening", "Speaking"],
      tables: {
        "Reading": [[5, 102], [13, 120], [23, 140], [29, 160]],
        "Writing": [[10, 102], [16, 120], [24, 140], [34, 160]],
        "Listening": [[5, 102], [11, 120], [18, 140], [23, 160]],
        "Speaking": [[7, 102], [12, 120], [18, 140], [27, 160]]
      },
      grades: [
        { min: 140, label: "Grade A", cefr: "B2" },
        { min: 133, label: "Grade B", cefr: "B1" },
        { min: 120, label: "Grade C", cefr: "B1" },
        { min: 102, label: "Level A2", cefr: "A2" }
      ]
    },
    "B2": {
      skills: ["Reading", "Use of English", "Writing", "Listening", "Speaking"],
      tables: {
        "Reading": [[11, 122], [18, 140], [27, 160], [42, 180]],
        "Use of English": [[8, 122], [13, 140], [21, 160], [28, 180]],
        "Writing": [[10, 122], [16, 140], [24, 160], [34, 180]],
        "Listening": [[8, 122], [12, 140], [18, 160], [27, 180]],
        "Speaking": [[14, 122], [24, 140], [36, 160], [54, 180]]
      },
      grades: [
        { min: 180, label: "Grade A", cefr: "C1" },
        { min: 173, label: "Grade B", cefr: "B2" },
        { min: 160, label: "Grade C", cefr: "B2" },
        { min: 140, label: "Level B1", cefr: "B1" }
      ]
    },
    "C1": {
      skills: ["Reading", "Use of English", "Writing", "Listening", "Speaking"],
      tables: {
        "Reading": [[17, 142], [23, 160], [32, 180], [43, 200]],
        "Use of English": [[8, 142], [11, 160], [16, 180], [23, 200]],
        "Writing": [[10, 142], [16, 160], [24, 180], [34, 200]],
        "Listening": [[11, 142], [13, 160], [18, 180], [26, 200]],
        "Speaking": [[17, 142], [30, 160], [45, 180], [66, 200]]
      },
      grades: [
        { min: 200, label: "Grade A", cefr: "C2" },
        { min: 193, label: "Grade B", cefr: "C1" },
        { min: 180, label: "Grade C", cefr: "C1" },
        { min: 160, label: "Level B2", cefr: "B2" },
        { min: 142, label: "Level B1", cefr: "B1" }
      ]
    },
    "C2": {
      skills: ["Reading", "Use of English", "Writing", "Listening", "Speaking"],
      tables: {
        "Reading": [[14, 162], [22, 180], [28, 200], [36, 220]],
        "Use of English": [[9, 162], [13, 180], [17, 200], [22, 220]],
        "Writing": [[10, 162], [16, 180], [24, 200], [34, 220]],
        "Listening": [[10, 162], [14, 180], [18, 200], [24, 220]],
        "Speaking": [[17, 162], [30, 180], [45, 200], [66, 220]]
      },
      grades: [
        { min: 220, label: "Grade A", cefr: "C2" },
        { min: 213, label: "Grade B", cefr: "C2" },
        { min: 200, label: "Grade C", cefr: "C2" },
        { min: 180, label: "Level C1", cefr: "C1" }
      ]
    }
  };

  const skillIcons = {
    "Reading": "fa-book-open",
    "Use of English": "fa-spell-check",
    "Writing": "fa-pen",
    "Listening": "fa-headphones",
    "Speaking": "fa-microphone"
  };

  const SCALE_MIN = 80;
  const SCALE_MAX = 230;

  function getScaleScore(raw, table) {
    if (raw <= table[0][0]) return table[0][1];
    if (raw >= table[table.length - 1][0]) return table[table.length - 1][1];

    for (let i = 0; i < table.length - 1; i++) {
      const [x0, y0] = table[i];
      const [x1, y1] = table[i + 1];
      if (raw >= x0 && raw <= x1) {
        return Math.round(y0 + (raw - x0) * (y1 - y0) / (x1 - x0));
      }
    }
    return table[0][1];
  }

  function getGradeInfo(overall, examType) {
    const grades = conversionData[examType].grades;
    for (const g of grades) {
      if (overall >= g.min) {
        return { result: g.label, cefr: g.cefr };
      }
    }
    return { result: "Below Level", cefr: "-" };
  }

  function arrowPercent(score) {
    return Math.max(0, Math.min(100, (score - SCALE_MIN) / (SCALE_MAX - SCALE_MIN) * 100));
  }

  window.ScoreCalculator = {
    render: function() {
      const content = document.getElementById('main-content');
      if (!content) return;

      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();

      const examType = AppState.currentLevel || 'C1';

      content.innerHTML = `
        <div class="score-calculator">
          <div class="sc-header">
            <button class="btn-back" onclick="loadDashboard()">
              <i class="fas fa-arrow-left"></i> Back
            </button>
            <h2><i class="fas fa-calculator"></i> Score Calculator</h2>
          </div>

          <div class="sc-selector">
            <label for="examSelector">Exam Level:</label>
            <select id="examSelector" onchange="ScoreCalculator.onExamChange()">
              <option value="B1" ${examType === 'B1' ? 'selected' : ''}>B1 Preliminary</option>
              <option value="B2" ${examType === 'B2' ? 'selected' : ''}>B2 First</option>
              <option value="C1" ${examType === 'C1' ? 'selected' : ''}>C1 Advanced</option>
            </select>
          </div>

          <div id="dynamicInputs" class="sc-inputs"></div>

          <button class="sc-calculate-btn" onclick="ScoreCalculator.calculateExam()">
            <i class="fas fa-chart-bar"></i> Calculate Score
          </button>

          <div class="statement-of-results" id="statementOfResults" style="display:none;"></div>
        </div>
      `;

      this.renderInputs(examType);
    },

    onExamChange: function() {
      const examType = document.getElementById('examSelector').value;
      this.renderInputs(examType);
      document.getElementById('statementOfResults').style.display = 'none';
    },

    renderInputs: function(examType) {
      const container = document.getElementById('dynamicInputs');
      if (!container) return;

      const skills = conversionData[examType].skills;
      const tables = conversionData[examType].tables;

      let html = '';
      skills.forEach(function(skill) {
        const table = tables[skill];
        const maxRaw = table[table.length - 1][0];
        const icon = skillIcons[skill] || 'fa-school';
        const displayName = skill === 'Use of English' ? 'UOE' : skill;
        html += `
          <div class="sc-input-group">
            <label for="input-${skill}">
              <i class="fas ${icon}"></i>
              ${displayName}
              <small>(max ${maxRaw})</small>
            </label>
            <input type="number" id="input-${skill}" min="0" max="${maxRaw}" value="0"
                   placeholder="0 – ${maxRaw}">
          </div>
        `;
      });
      container.innerHTML = html;
    },

    calculateExam: function() {
      const examType = document.getElementById('examSelector').value;
      const data = conversionData[examType];
      const skills = data.skills;
      let totalScale = 0;
      const skillScores = [];

      skills.forEach(function(skill) {
        const el = document.getElementById('input-' + skill);
        let raw = parseInt(el ? el.value : '0', 10) || 0;
        const table = data.tables[skill];
        const maxRaw = table[table.length - 1][0];
        if (raw > maxRaw) raw = maxRaw;
        if (raw < 0) raw = 0;
        const scale = getScaleScore(raw, table);
        totalScale += scale;
        skillScores.push({ skill: skill, raw: raw, maxRaw: maxRaw, scale: scale });
      });

      const overall = Math.round(totalScale / skills.length);
      const gradeInfo = getGradeInfo(overall, examType);

      this._calcData = {
        skillScores: skillScores,
        overall: overall,
        gradeInfo: gradeInfo,
        examType: examType,
        chartMode: 'cambridge'
      };

      this._renderCalcContent();
      document.getElementById('statementOfResults').style.display = 'block';
      document.getElementById('statementOfResults').scrollIntoView({ behavior: 'smooth' });
    },

    _calcData: null,

    _renderCalcContent: function() {
      var container = document.getElementById('statementOfResults');
      if (!container || !this._calcData) return;

      var d = this._calcData;
      var grades = conversionData[d.examType].grades;

      var html = '<div class="results-modal-header"><h3>Statement of Results</h3><span class="results-exam-level">' + d.examType + '</span></div>';

      html += '<div class="cb-result-boxes">';
      html += '<div class="cb-result-box cb-result-green"><div class="cb-result-label">Result</div><div class="cb-result-value">' + d.gradeInfo.result + '</div></div>';
      html += '<div class="cb-result-box"><div class="cb-result-label">Overall Score</div><div class="cb-result-value cb-result-score">' + d.overall + '</div></div>';
      html += '<div class="cb-result-box"><div class="cb-result-label">CEFR Level</div><div class="cb-result-value cb-result-cefr">' + d.gradeInfo.cefr + '</div></div>';
      html += '</div>';

      html += '<div class="cb-chart-toggle">';
      html += '<button class="cb-toggle-btn' + (d.chartMode === 'cambridge' ? ' cb-toggle-active' : '') + '" onclick="ScoreCalculator.switchCalcChartMode(\'cambridge\')">Cambridge</button>';
      html += '<button class="cb-toggle-btn' + (d.chartMode === 'raw' ? ' cb-toggle-active' : '') + '" onclick="ScoreCalculator.switchCalcChartMode(\'raw\')">Raw</button>';
      html += '</div>';

      if (d.chartMode === 'cambridge') {
        html += this._buildCambridgeChart(d.skillScores, grades);
      } else {
        html += this._buildRawChart(d.skillScores);
      }

      container.innerHTML = html;
    },

    switchCalcChartMode: function(mode) {
      if (!this._calcData) return;
      this._calcData.chartMode = mode;
      this._renderCalcContent();
    },

    // --- Results from stored exam scores ---

    // Helper: find best score across both modes in localStorage
    _getBestScoreFromModes: function(examId, section, part, requireChecked) {
      var modes = ['practice', 'exam'];
      var bestScore = 0;
      for (var i = 0; i < modes.length; i++) {
        var key = 'cambridge_' + modes[i] + '_' + AppState.currentLevel + '_' + examId + '_' + section + '_' + part;
        try {
          var raw = localStorage.getItem(key);
          if (raw) {
            var data = JSON.parse(raw);
            if (requireChecked && !data.answersChecked) continue;
            var score = data.partScore || 0;
            if (score > bestScore) bestScore = score;
          }
        } catch(e) {}
      }
      return bestScore;
    },

    getStoredSectionScore: function(examId, section, part) {
      return this._getBestScoreFromModes(examId, section, part, true);
    },

    // Like getStoredSectionScore but includes in-progress (unchecked) scores
    getLiveSectionScore: function(examId, section, part) {
      // If this is the current active part, use the in-memory score
      if (AppState.currentExamId === examId && AppState.currentSection === section && AppState.currentPart === part) {
        return AppState.currentPartScore || 0;
      }
      // Otherwise check AppState.sectionScores first
      var sectionKey = examId + '_' + section;
      if (AppState.sectionScores[sectionKey] && AppState.sectionScores[sectionKey][part] !== undefined) {
        return AppState.sectionScores[sectionKey][part];
      }
      // Fall back to localStorage, checking both modes (accepting unchecked scores)
      return this._getBestScoreFromModes(examId, section, part, false);
    },

    getSectionMaxRaw: function(section) {
      if (section === 'reading') {
        var level = (typeof AppState !== 'undefined') ? AppState.currentLevel : 'C1';
        var parts = level === 'B2' ? [1,2,3,4,5,6,7] : [1,2,3,4,5,6,7,8];
        return parts.reduce(function(s,p){
          var cfg = CONFIG.getPartConfig('reading', p);
          return s + (cfg ? (cfg.maxMarks || cfg.total || 0) : 0);
        }, 0);
      }
      if (section === 'listening') {
        return [1,2,3,4].reduce(function(s,p){ return s + (CONFIG.PART_TYPES['listening'+p]?.total || 0); }, 0);
      }
      if (section === 'writing') {
        return [1,2].reduce(function(s,p){ return s + (CONFIG.PART_TYPES['writing'+p]?.total || 0); }, 0);
      }
      if (section === 'speaking') {
        return [1,2,3,4].reduce(function(s,p){ return s + (CONFIG.PART_TYPES['speaking'+p]?.total || 0); }, 0);
      }
      return 0;
    },

    getSkillScoresForSection: function(examId, sectionKey) {
      var examType = AppState.currentLevel || 'C1';
      var data = conversionData[examType];
      if (!data) return [];

      var hasUoE = data.skills.indexOf('Use of English') !== -1;
      var self = this;
      var results = [];

      if (sectionKey === 'reading') {
        if (hasUoE) {
          // B2: Parts 1-4 → Use of English; Parts 5-7 → Reading
          // C1: Parts 2-4 → Use of English; Parts 1, 5-8 → Reading
          var isB2 = examType === 'B2';
          var uoeParts = isB2 ? [1, 2, 3, 4] : [2, 3, 4];
          var readPartsList = isB2 ? [5, 6, 7] : [1, 5, 6, 7, 8];

          var uoeRaw = 0; var uoeMax = 0;
          uoeParts.forEach(function(p) {
            uoeRaw += self.getStoredSectionScore(examId, 'reading', p);
            var cfg = CONFIG.getPartConfig('reading', p);
            uoeMax += cfg ? (cfg.maxMarks || cfg.total || 0) : 0;
          });
          var uoeTableMax = data.tables['Use of English'][data.tables['Use of English'].length-1][0];
          var uoeNormalized = uoeMax > 0 ? Math.round(uoeRaw / uoeMax * uoeTableMax) : 0;
          var uoeDisplayRaw = isB2 ? uoeNormalized : uoeRaw;
          var uoeDisplayMax = isB2 ? uoeTableMax : uoeMax;
          results.push({ skill: 'Use of English', raw: uoeDisplayRaw, maxRaw: uoeDisplayMax, scale: getScaleScore(uoeNormalized, data.tables['Use of English']) });

          var readRaw = 0; var readMax = 0;
          readPartsList.forEach(function(p2) {
            readRaw += self.getStoredSectionScore(examId, 'reading', p2);
            var cfg2 = CONFIG.getPartConfig('reading', p2);
            readMax += cfg2 ? (cfg2.maxMarks || cfg2.total || 0) : 0;
          });
          var readTableMax = data.tables['Reading'][data.tables['Reading'].length-1][0];
          var readNormalized = readMax > 0 ? Math.round(readRaw / readMax * readTableMax) : 0;
          var readDisplayRaw = isB2 ? readNormalized : readRaw;
          var readDisplayMax = isB2 ? readTableMax : readMax;
          results.push({ skill: 'Reading', raw: readDisplayRaw, maxRaw: readDisplayMax, scale: getScaleScore(readNormalized, data.tables['Reading']) });
        } else {
          // A2/B1: All parts → Reading
          var rawTotal = 0; var maxTotal = 0;
          for (var p3 = 1; p3 <= 8; p3++) {
            rawTotal += self.getStoredSectionScore(examId, 'reading', p3);
            var cfg3 = CONFIG.getPartConfig('reading', p3);
            maxTotal += cfg3 ? (cfg3.maxMarks || cfg3.total || 0) : 0;
          }
          var tableMax = data.tables['Reading'][data.tables['Reading'].length-1][0];
          var normalized = maxTotal > 0 ? Math.round(rawTotal / maxTotal * tableMax) : 0;
          results.push({ skill: 'Reading', raw: rawTotal, maxRaw: maxTotal, scale: getScaleScore(normalized, data.tables['Reading']) });
        }
      } else {
        var skillName = sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
        var parts = sectionKey === 'writing' ? [1,2] : [1,2,3,4];
        var sRaw = 0; var sMax = 0;
        parts.forEach(function(pp) {
          sRaw += self.getStoredSectionScore(examId, sectionKey, pp);
          sMax += (CONFIG.PART_TYPES[sectionKey+pp]?.total || 0);
        });
        if (data.tables[skillName]) {
          var stMax = data.tables[skillName][data.tables[skillName].length-1][0];
          var sNorm = sMax > 0 ? Math.round(sRaw / sMax * stMax) : 0;
          results.push({ skill: skillName, raw: sRaw, maxRaw: sMax, scale: getScaleScore(sNorm, data.tables[skillName]) });
        }
      }
      return results;
    },

    getAllSkillScores: function(examId) {
      var examType = AppState.currentLevel || 'C1';
      var data = conversionData[examType];
      if (!data) return [];

      var readingScores = this.getSkillScoresForSection(examId, 'reading');
      var listeningScores = this.getSkillScoresForSection(examId, 'listening');
      var writingScores = this.getSkillScoresForSection(examId, 'writing');
      var speakingScores = this.getSkillScoresForSection(examId, 'speaking');

      // Combine in the order of the skill list
      var allScores = {};
      readingScores.concat(listeningScores, writingScores, speakingScores).forEach(function(s) {
        allScores[s.skill] = s;
      });

      var ordered = [];
      data.skills.forEach(function(skill) {
        if (allScores[skill]) ordered.push(allScores[skill]);
      });
      return ordered;
    },

    showSectionResults: function(examId, sectionKey) {
      var skillScores = this.getSkillScoresForSection(examId, sectionKey);
      if (!skillScores.length) return;

      var examType = AppState.currentLevel || 'C1';
      var totalScale = 0;
      skillScores.forEach(function(s) { totalScale += s.scale; });
      var overall = Math.round(totalScale / skillScores.length);
      var gradeInfo = getGradeInfo(overall, examType);

      this.openResultsModal(skillScores, overall, gradeInfo, examType, sectionKey);
    },

    showOverallResults: function(examId) {
      var skillScores = this.getAllSkillScores(examId);
      if (!skillScores.length) return;

      var examType = AppState.currentLevel || 'C1';
      var totalScale = 0;
      skillScores.forEach(function(s) { totalScale += s.scale; });
      var overall = Math.round(totalScale / skillScores.length);
      var gradeInfo = getGradeInfo(overall, examType);

      this.openResultsModal(skillScores, overall, gradeInfo, examType, null);
    },

    // --- Live results (include in-progress/unchecked scores) ---

    getLiveSkillScoresForSection: function(examId, sectionKey) {
      var examType = AppState.currentLevel || 'C1';
      var data = conversionData[examType];
      if (!data) return [];

      var hasUoE = data.skills.indexOf('Use of English') !== -1;
      var self = this;
      var results = [];

      if (sectionKey === 'reading') {
        if (hasUoE) {
          // B2: Parts 1-4 → Use of English; Parts 5-7 → Reading
          // C1: Parts 2-4 → Use of English; Parts 1, 5-8 → Reading
          var isB2 = examType === 'B2';
          var uoeParts = isB2 ? [1, 2, 3, 4] : [2, 3, 4];
          var readPartsList = isB2 ? [5, 6, 7] : [1, 5, 6, 7, 8];

          var uoeRaw = 0; var uoeMax = 0;
          uoeParts.forEach(function(p) {
            uoeRaw += self.getLiveSectionScore(examId, 'reading', p);
            var cfg = CONFIG.getPartConfig('reading', p);
            uoeMax += cfg ? (cfg.maxMarks || cfg.total || 0) : 0;
          });
          var uoeTableMax = data.tables['Use of English'][data.tables['Use of English'].length-1][0];
          var uoeNormalized = uoeMax > 0 ? Math.round(uoeRaw / uoeMax * uoeTableMax) : 0;
          var uoeDisplayRaw = isB2 ? uoeNormalized : uoeRaw;
          var uoeDisplayMax = isB2 ? uoeTableMax : uoeMax;
          results.push({ skill: 'Use of English', raw: uoeDisplayRaw, maxRaw: uoeDisplayMax, scale: getScaleScore(uoeNormalized, data.tables['Use of English']) });

          var readRaw = 0; var readMax = 0;
          readPartsList.forEach(function(p2) {
            readRaw += self.getLiveSectionScore(examId, 'reading', p2);
            var cfg2 = CONFIG.getPartConfig('reading', p2);
            readMax += cfg2 ? (cfg2.maxMarks || cfg2.total || 0) : 0;
          });
          var readTableMax = data.tables['Reading'][data.tables['Reading'].length-1][0];
          var readNormalized = readMax > 0 ? Math.round(readRaw / readMax * readTableMax) : 0;
          var readDisplayRaw = isB2 ? readNormalized : readRaw;
          var readDisplayMax = isB2 ? readTableMax : readMax;
          results.push({ skill: 'Reading', raw: readDisplayRaw, maxRaw: readDisplayMax, scale: getScaleScore(readNormalized, data.tables['Reading']) });
        } else {
          var rawTotal = 0; var maxTotal = 0;
          for (var p3 = 1; p3 <= 8; p3++) {
            rawTotal += self.getLiveSectionScore(examId, 'reading', p3);
            var cfg3 = CONFIG.getPartConfig('reading', p3);
            maxTotal += cfg3 ? (cfg3.maxMarks || cfg3.total || 0) : 0;
          }
          var tableMax = data.tables['Reading'][data.tables['Reading'].length-1][0];
          var normalized = maxTotal > 0 ? Math.round(rawTotal / maxTotal * tableMax) : 0;
          results.push({ skill: 'Reading', raw: rawTotal, maxRaw: maxTotal, scale: getScaleScore(normalized, data.tables['Reading']) });
        }
      } else {
        var skillName = sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
        var parts = sectionKey === 'writing' ? [1,2] : [1,2,3,4];
        var sRaw = 0; var sMax = 0;
        parts.forEach(function(pp) {
          sRaw += self.getLiveSectionScore(examId, sectionKey, pp);
          sMax += (CONFIG.PART_TYPES[sectionKey+pp]?.total || 0);
        });
        if (data.tables[skillName]) {
          var stMax = data.tables[skillName][data.tables[skillName].length-1][0];
          var sNorm = sMax > 0 ? Math.round(sRaw / sMax * stMax) : 0;
          results.push({ skill: skillName, raw: sRaw, maxRaw: sMax, scale: getScaleScore(sNorm, data.tables[skillName]) });
        }
      }
      return results;
    },

    getAllLiveSkillScores: function(examId) {
      var examType = AppState.currentLevel || 'C1';
      var data = conversionData[examType];
      if (!data) return [];

      var readingScores = this.getLiveSkillScoresForSection(examId, 'reading');
      var listeningScores = this.getLiveSkillScoresForSection(examId, 'listening');
      var writingScores = this.getLiveSkillScoresForSection(examId, 'writing');
      var speakingScores = this.getLiveSkillScoresForSection(examId, 'speaking');

      var allScores = {};
      readingScores.concat(listeningScores, writingScores, speakingScores).forEach(function(s) {
        allScores[s.skill] = s;
      });

      var ordered = [];
      data.skills.forEach(function(skill) {
        if (allScores[skill]) ordered.push(allScores[skill]);
      });
      return ordered;
    },

    showLiveSectionResults: function() {
      var examId = AppState.currentExamId;
      var sectionKey = AppState.currentSection;
      if (!examId || !sectionKey) return;

      var skillScores = this.getLiveSkillScoresForSection(examId, sectionKey);
      if (!skillScores.length) return;

      var examType = AppState.currentLevel || 'C1';
      var totalScale = 0;
      skillScores.forEach(function(s) { totalScale += s.scale; });
      var overall = Math.round(totalScale / skillScores.length);
      var gradeInfo = getGradeInfo(overall, examType);

      this.openResultsModal(skillScores, overall, gradeInfo, examType, sectionKey);
    },

    showLiveOverallResults: function() {
      var examId = AppState.currentExamId;
      if (!examId) return;

      var skillScores = this.getAllLiveSkillScores(examId);
      if (!skillScores.length) return;

      var examType = AppState.currentLevel || 'C1';
      var totalScale = 0;
      skillScores.forEach(function(s) { totalScale += s.scale; });
      var overall = Math.round(totalScale / skillScores.length);
      var gradeInfo = getGradeInfo(overall, examType);

      this.openResultsModal(skillScores, overall, gradeInfo, examType, null);
    },

    // Store current modal data for chart toggle
    _modalData: null,

    openResultsModal: function(skillScores, overall, gradeInfo, examType, sectionKey) {
      var overlay = document.getElementById('results-modal-overlay');
      var body = document.getElementById('results-modal-body');
      if (!overlay || !body) return;

      // Toggle section-specific class for smaller modal
      var content = overlay.querySelector('.results-modal-content');
      if (content) {
        content.classList.toggle('results-modal-section', !!sectionKey);
      }

      // Store data for chart toggle
      this._modalData = {
        skillScores: skillScores,
        overall: overall,
        gradeInfo: gradeInfo,
        examType: examType,
        sectionKey: sectionKey,
        chartMode: 'cambridge'
      };

      this._renderResultsContent(body);
      overlay.style.display = 'flex';
    },

    _renderResultsContent: function(body) {
      var d = this._modalData;
      if (!d) return;

      var skillScores = d.skillScores;
      var overall = d.overall;
      var gradeInfo = d.gradeInfo;
      var examType = d.examType;
      var sectionKey = d.sectionKey;
      var chartMode = d.chartMode;

      var title = sectionKey
        ? ('Section Results') + ' — ' + sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)
        : ('Overall Results');

      var grades = conversionData[examType].grades;

      var html = '<div class="results-modal-header"><h3>' + title + '</h3><span class="results-exam-level">' + examType + '</span></div>';

      // Top result boxes — Cambridge style
      html += '<div class="cb-result-boxes">';
      html += '<div class="cb-result-box cb-result-green"><div class="cb-result-label">Result</div><div class="cb-result-value">' + gradeInfo.result + '</div></div>';
      html += '<div class="cb-result-box"><div class="cb-result-label">Overall Score</div><div class="cb-result-value cb-result-score">' + overall + '</div></div>';
      html += '<div class="cb-result-box"><div class="cb-result-label">CEFR Level</div><div class="cb-result-value cb-result-cefr">' + gradeInfo.cefr + '</div></div>';
      html += '</div>';

      // Chart mode toggle
      html += '<div class="cb-chart-toggle">';
      html += '<button class="cb-toggle-btn' + (chartMode === 'cambridge' ? ' cb-toggle-active' : '') + '" onclick="ScoreCalculator.switchChartMode(\'cambridge\')">Cambridge</button>';
      html += '<button class="cb-toggle-btn' + (chartMode === 'raw' ? ' cb-toggle-active' : '') + '" onclick="ScoreCalculator.switchChartMode(\'raw\')">Raw</button>';
      html += '</div>';

      if (chartMode === 'cambridge') {
        html += this._buildCambridgeChart(skillScores, grades);
      } else {
        html += this._buildRawChart(skillScores);
      }

      body.innerHTML = html;
    },

    switchChartMode: function(mode) {
      if (!this._modalData) return;
      this._modalData.chartMode = mode;
      var body = document.getElementById('results-modal-body');
      if (body) this._renderResultsContent(body);
    },

    _buildCambridgeChart: function(skillScores, grades) {
      // Determine scale range from grades
      var lowestGrade = grades[grades.length - 1].min;
      var highestGrade = grades[0].min;
      var scaleBottom = Math.floor((lowestGrade - 10) / 10) * 10;
      var scaleTop = Math.ceil((highestGrade + 10) / 10) * 10;

      function scoreToPercent(score) {
        return Math.max(0, Math.min(100, (score - scaleBottom) / (scaleTop - scaleBottom) * 100));
      }

      // Derive CEFR boundaries from grades
      var cefrMap = {};
      grades.forEach(function(g) {
        if (!cefrMap[g.cefr] || g.min < cefrMap[g.cefr]) {
          cefrMap[g.cefr] = g.min;
        }
      });
      var cefrLevels = Object.keys(cefrMap).map(function(cefr) {
        return { cefr: cefr, min: cefrMap[cefr] };
      }).sort(function(a, b) { return a.min - b.min; });

      // Helper to generate dashed lines at grade boundaries (reused across columns)
      function buildDashedLines() {
        var lines = '';
        grades.forEach(function(g) {
          var linePct = scoreToPercent(g.min);
          lines += '<div class="cb-dotted-line" style="bottom:' + linePct + '%"></div>';
        });
        lines += '<div class="cb-dotted-line" style="bottom:100%"></div>';
        return lines;
      }

      // Dashed lines only at CEFR boundaries (where the CEFR level changes)
      function buildCefrDashedLines() {
        var lines = '';
        grades.forEach(function(g, idx) {
          var nextGrade = grades[idx + 1];
          if (!nextGrade || g.cefr !== nextGrade.cefr) {
            var linePct = scoreToPercent(g.min);
            lines += '<div class="cb-dotted-line" style="bottom:' + linePct + '%"></div>';
          }
        });
        lines += '<div class="cb-dotted-line" style="bottom:100%"></div>';
        return lines;
      }

      // Cambridge-style chart – unified column layout (header + body per column)
      var html = '<div class="cb-chart">';
      html += '<div class="cb-chart-columns">';

      // CEFR column
      html += '<div class="cb-column cb-column-cefr">';
      html += '<div class="cb-hdr">CEFR<br>Level</div>';
      html += '<div class="cb-col-body"><div class="cb-col-inner">';
      cefrLevels.forEach(function(lvl, idx) {
        var bandBottom = scoreToPercent(lvl.min);
        var bandTop = idx < cefrLevels.length - 1 ? scoreToPercent(cefrLevels[idx + 1].min) : 100;
        var heightPct = bandTop - bandBottom;
        html += '<div class="cb-cefr-band" style="bottom:' + bandBottom + '%;height:' + heightPct + '%"><strong>' + lvl.cefr + '</strong></div>';
      });
      html += buildCefrDashedLines();
      html += '</div></div></div>';

      // Scale column (ruler)
      html += '<div class="cb-column cb-column-scale">';
      html += '<div class="cb-hdr">Cambridge<br>English<br>Scale</div>';
      html += '<div class="cb-col-body"><div class="cb-col-inner">';
      for (var tick = scaleTop; tick >= scaleBottom; tick -= 10) {
        var tickPct = scoreToPercent(tick);
        html += '<div class="cb-scale-tick" style="bottom:' + tickPct + '%">';
        html += '<span class="cb-scale-num">' + tick + '</span>';
        html += '<span class="cb-scale-line"></span>';
        html += '</div>';
      }
      html += buildDashedLines();
      html += '</div></div></div>';

      // Certificated Results column
      html += '<div class="cb-column cb-column-grades">';
      html += '<div class="cb-hdr">Certificated<br>Results</div>';
      html += '<div class="cb-col-body"><div class="cb-col-inner">';
      grades.forEach(function(g, idx) {
        var bandTop = idx === 0 ? scaleTop : grades[idx - 1].min;
        var bandBottom = g.min;
        var topPct = scoreToPercent(bandTop);
        var bottomPct = scoreToPercent(bandBottom);
        var heightPct = topPct - bottomPct;
        var bandClass = idx <= 2 ? 'cb-grade-top' : (idx === 3 ? 'cb-grade-below' : 'cb-grade-bottom');
        html += '<div class="cb-grade-band ' + bandClass + '" style="bottom:' + bottomPct + '%;height:' + heightPct + '%">';
        html += '<span class="cb-grade-band-text">' + g.label + '</span>';
        html += '</div>';
      });
      html += buildDashedLines();
      html += '</div></div></div>';

      // Skill columns
      skillScores.forEach(function(item) {
        var pct = scoreToPercent(item.scale);
        var displayName = item.skill === 'Use of English' ? 'UOE' : item.skill;
        html += '<div class="cb-column cb-column-skill">';
        html += '<div class="cb-hdr">' + displayName + '</div>';
        html += '<div class="cb-col-body"><div class="cb-col-inner">';

        // Grade band backgrounds
        grades.forEach(function(g, idx) {
          var bandTop = idx === 0 ? scaleTop : grades[idx - 1].min;
          var bandBottom = g.min;
          var topPct = scoreToPercent(bandTop);
          var bottomPct = scoreToPercent(bandBottom);
          var heightPct = topPct - bottomPct;
          html += '<div class="cb-band" style="bottom:' + bottomPct + '%;height:' + heightPct + '%;"></div>';
        });

        html += buildDashedLines();
        html += '<div class="cb-score-badge" style="bottom:' + pct + '%"><span>' + item.scale + '</span></div>';

        html += '</div></div></div>';
      });

      html += '</div></div>';

      return html;
    },

    _buildRawChart: function(skillScores) {
      var html = '<div class="cb-raw-chart">';

      skillScores.forEach(function(s) {
        var pct = s.maxRaw > 0 ? Math.min(100, Math.round(s.raw / s.maxRaw * 100)) : 0;
        var icon = skillIcons[s.skill] || 'fa-school';
        var displayName = s.skill === 'Use of English' ? 'UOE' : s.skill;
        html += '<div class="cb-raw-row">';
        html += '<div class="cb-raw-label"><i class="fas ' + icon + '"></i> ' + displayName + '</div>';
        html += '<div class="cb-raw-bar-wrap">';
        html += '<div class="cb-raw-bar" style="width:' + pct + '%"></div>';
        html += '</div>';
        html += '<div class="cb-raw-value">' + s.raw + '/' + s.maxRaw + '</div>';
        html += '</div>';
      });

      html += '</div>';
      return html;
    },

    closeResultsModal: function() {
      var overlay = document.getElementById('results-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    },

    getGradeInfo: function(overall, examType) {
      if (!conversionData[examType]) return { result: 'Below Level', cefr: '–' };
      return getGradeInfo(overall, examType);
    }
  };
})();
