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
        "Reading": [[10, 122], [16, 140], [24, 160], [37, 180]],
        "Use of English": [[7, 122], [11, 140], [18, 160], [24, 180]],
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
        { min: 160, label: "Level B2", cefr: "B2" }
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
              <i class="fas fa-arrow-left"></i> ${I18n.t('backToDashboard') || 'Back'}
            </button>
            <h2><i class="fas fa-calculator"></i> ${I18n.t('scoreCalculator') || 'Score Calculator'}</h2>
          </div>

          <div class="sc-selector">
            <label for="examSelector">Exam Level:</label>
            <select id="examSelector" onchange="ScoreCalculator.onExamChange()">
              <option value="A2" ${examType === 'A2' ? 'selected' : ''}>A2 Key</option>
              <option value="B1" ${examType === 'B1' ? 'selected' : ''}>B1 Preliminary</option>
              <option value="B2" ${examType === 'B2' ? 'selected' : ''}>B2 First</option>
              <option value="C1" ${examType === 'C1' ? 'selected' : ''}>C1 Advanced</option>
              <option value="C2" ${examType === 'C2' ? 'selected' : ''}>C2 Proficiency</option>
            </select>
          </div>

          <div id="dynamicInputs" class="sc-inputs"></div>

          <button class="sc-calculate-btn" onclick="ScoreCalculator.calculateExam()">
            <i class="fas fa-chart-bar"></i> Calculate Score
          </button>

          <div class="statement-of-results" id="statementOfResults" style="display:none;">
            <h3 class="sor-title">Statement of Results</h3>
            <div class="result-header">
              <div class="box">RESULT<br><span id="resultText">-</span></div>
              <div class="box red">OVERALL SCORE<br><span id="overallScore">-</span></div>
              <div class="box">CEFR LEVEL<br><span id="cefrLevel">-</span></div>
            </div>
            <div class="chart-area" id="chartArea"></div>
          </div>
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
        html += `
          <div class="sc-input-group">
            <label for="input-${skill}">
              <i class="fas ${icon}"></i>
              ${skill}
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
        skillScores.push({ skill: skill, raw: raw, scale: scale });
      });

      const overall = Math.round(totalScale / skills.length);
      const gradeInfo = getGradeInfo(overall, examType);

      document.getElementById('resultText').innerText = gradeInfo.result;
      document.getElementById('overallScore').innerText = overall;
      document.getElementById('cefrLevel').innerText = gradeInfo.cefr;

      this.renderChart(skillScores, overall, examType);
      document.getElementById('statementOfResults').style.display = 'block';
      document.getElementById('statementOfResults').scrollIntoView({ behavior: 'smooth' });
    },

    // --- Results from stored exam scores ---

    getStoredSectionScore: function(examId, section, part) {
      var key = 'cambridge_' + AppState.currentLevel + '_' + examId + '_' + section + '_' + part;
      try {
        var raw = localStorage.getItem(key);
        if (raw) {
          var data = JSON.parse(raw);
          if (data.answersChecked) return data.partScore || 0;
        }
      } catch(e) {}
      return 0;
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
      // Fall back to localStorage, accepting even unchecked scores
      var key = 'cambridge_' + AppState.currentLevel + '_' + examId + '_' + section + '_' + part;
      try {
        var raw = localStorage.getItem(key);
        if (raw) {
          var data = JSON.parse(raw);
          return data.partScore || 0;
        }
      } catch(e) {}
      return 0;
    },

    getSectionMaxRaw: function(section) {
      if (section === 'reading') {
        return [1,2,3,4,5,6,7,8].reduce(function(s,p){ return s + (CONFIG.PART_TYPES[p]?.total || 0); }, 0);
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
          // Parts 1-4 → Use of English
          var uoeRaw = 0; var uoeMax = 0;
          for (var p = 1; p <= 4; p++) {
            uoeRaw += self.getStoredSectionScore(examId, 'reading', p);
            uoeMax += (CONFIG.PART_TYPES[p]?.total || 0);
          }
          var uoeTableMax = data.tables['Use of English'][data.tables['Use of English'].length-1][0];
          var uoeNormalized = uoeMax > 0 ? Math.round(uoeRaw / uoeMax * uoeTableMax) : 0;
          results.push({ skill: 'Use of English', raw: uoeRaw, maxRaw: uoeMax, scale: getScaleScore(uoeNormalized, data.tables['Use of English']) });

          // Parts 5-8 → Reading
          var readRaw = 0; var readMax = 0;
          for (var p2 = 5; p2 <= 8; p2++) {
            readRaw += self.getStoredSectionScore(examId, 'reading', p2);
            readMax += (CONFIG.PART_TYPES[p2]?.total || 0);
          }
          var readTableMax = data.tables['Reading'][data.tables['Reading'].length-1][0];
          var readNormalized = readMax > 0 ? Math.round(readRaw / readMax * readTableMax) : 0;
          results.push({ skill: 'Reading', raw: readRaw, maxRaw: readMax, scale: getScaleScore(readNormalized, data.tables['Reading']) });
        } else {
          // A2/B1: All parts → Reading
          var rawTotal = 0; var maxTotal = 0;
          for (var p3 = 1; p3 <= 8; p3++) {
            rawTotal += self.getStoredSectionScore(examId, 'reading', p3);
            maxTotal += (CONFIG.PART_TYPES[p3]?.total || 0);
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
          var uoeRaw = 0; var uoeMax = 0;
          for (var p = 1; p <= 4; p++) {
            uoeRaw += self.getLiveSectionScore(examId, 'reading', p);
            uoeMax += (CONFIG.PART_TYPES[p]?.total || 0);
          }
          var uoeTableMax = data.tables['Use of English'][data.tables['Use of English'].length-1][0];
          var uoeNormalized = uoeMax > 0 ? Math.round(uoeRaw / uoeMax * uoeTableMax) : 0;
          results.push({ skill: 'Use of English', raw: uoeRaw, maxRaw: uoeMax, scale: getScaleScore(uoeNormalized, data.tables['Use of English']) });

          var readRaw = 0; var readMax = 0;
          for (var p2 = 5; p2 <= 8; p2++) {
            readRaw += self.getLiveSectionScore(examId, 'reading', p2);
            readMax += (CONFIG.PART_TYPES[p2]?.total || 0);
          }
          var readTableMax = data.tables['Reading'][data.tables['Reading'].length-1][0];
          var readNormalized = readMax > 0 ? Math.round(readRaw / readMax * readTableMax) : 0;
          results.push({ skill: 'Reading', raw: readRaw, maxRaw: readMax, scale: getScaleScore(readNormalized, data.tables['Reading']) });
        } else {
          var rawTotal = 0; var maxTotal = 0;
          for (var p3 = 1; p3 <= 8; p3++) {
            rawTotal += self.getLiveSectionScore(examId, 'reading', p3);
            maxTotal += (CONFIG.PART_TYPES[p3]?.total || 0);
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

    openResultsModal: function(skillScores, overall, gradeInfo, examType, sectionKey) {
      var overlay = document.getElementById('results-modal-overlay');
      var body = document.getElementById('results-modal-body');
      if (!overlay || !body) return;

      var title = sectionKey
        ? (I18n.t('sectionResults') || 'Section Results') + ' — ' + sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)
        : (I18n.t('overallResults') || 'Overall Results');

      var html = '<div class="results-modal-header"><h3>' + title + '</h3><span class="results-exam-level">' + examType + '</span></div>';
      html += '<div class="statement-of-results" style="display:block;">';
      html += '<h3 class="sor-title">Statement of Results</h3>';
      html += '<div class="result-header">';
      html += '<div class="box">RESULT<br><span>' + gradeInfo.result + '</span></div>';
      html += '<div class="box red">OVERALL SCORE<br><span>' + overall + '</span></div>';
      html += '<div class="box">CEFR LEVEL<br><span>' + gradeInfo.cefr + '</span></div>';
      html += '</div>';

      // Skill details
      html += '<div class="results-skills-detail">';
      skillScores.forEach(function(s) {
        var icon = skillIcons[s.skill] || 'fa-school';
        html += '<div class="results-skill-row">';
        html += '<i class="fas ' + icon + '"></i> ';
        html += '<span class="results-skill-name">' + s.skill + '</span>';
        html += '<span class="results-skill-raw">' + s.raw + '/' + s.maxRaw + '</span>';
        html += '<span class="results-skill-scale">' + s.scale + '</span>';
        html += '</div>';
      });
      html += '</div>';

      // Chart
      html += '<div class="chart-area" id="resultsChartArea"></div>';
      html += '</div>';

      body.innerHTML = html;
      overlay.style.display = 'flex';

      // Render chart into the modal
      var chartArea = document.getElementById('resultsChartArea');
      if (chartArea) {
        var grades = conversionData[examType].grades;
        var chartHtml = '<div class="chart-scale">';
        chartHtml += '<div class="chart-labels">';
        for (var s = SCALE_MAX; s >= SCALE_MIN; s -= 10) {
          chartHtml += '<div class="chart-label">' + s + '</div>';
        }
        chartHtml += '</div>';
        chartHtml += '<div class="chart-columns">';
        chartHtml += '<div class="chart-bands">';
        grades.forEach(function(g, i) {
          var top = grades[i - 1] ? grades[i - 1].min : SCALE_MAX;
          var bottom = g.min;
          var topPct = 100 - arrowPercent(top);
          var bottomPct = 100 - arrowPercent(bottom);
          var heightPct = bottomPct - topPct;
          chartHtml += '<div class="chart-band" style="top:' + topPct + '%;height:' + heightPct + '%;" title="' + g.label + ' (' + g.cefr + ')">';
          chartHtml += '<span class="band-label">' + g.label + '</span>';
          chartHtml += '</div>';
        });
        chartHtml += '</div>';
        skillScores.forEach(function(item) {
          var pct = arrowPercent(item.scale);
          chartHtml += '<div class="chart-column">';
          chartHtml += '<div class="chart-bar-area">';
          chartHtml += '<div class="arrow-marker" style="bottom:' + pct + '%;">' + item.scale + '</div>';
          chartHtml += '</div>';
          chartHtml += '<div class="chart-col-label">' + item.skill + '</div>';
          chartHtml += '</div>';
        });
        var overallPct = arrowPercent(overall);
        chartHtml += '<div class="chart-column overall-column">';
        chartHtml += '<div class="chart-bar-area">';
        chartHtml += '<div class="arrow-marker overall-marker" style="bottom:' + overallPct + '%;">' + overall + '</div>';
        chartHtml += '</div>';
        chartHtml += '<div class="chart-col-label"><strong>Overall</strong></div>';
        chartHtml += '</div>';
        chartHtml += '</div></div>';
        chartArea.innerHTML = chartHtml;
      }
    },

    closeResultsModal: function() {
      var overlay = document.getElementById('results-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    },

    renderChart: function(skillScores, overall, examType) {
      const chartArea = document.getElementById('chartArea');
      if (!chartArea) return;

      const grades = conversionData[examType].grades;

      let html = '<div class="chart-scale">';

      // Scale labels on left
      html += '<div class="chart-labels">';
      for (let s = SCALE_MAX; s >= SCALE_MIN; s -= 10) {
        html += '<div class="chart-label">' + s + '</div>';
      }
      html += '</div>';

      // Columns for each skill + overall
      html += '<div class="chart-columns">';

      // Grade bands background
      html += '<div class="chart-bands">';
      grades.forEach(function(g, i) {
        const top = grades[i - 1] ? grades[i - 1].min : SCALE_MAX;
        const bottom = g.min;
        const topPct = 100 - arrowPercent(top);
        const bottomPct = 100 - arrowPercent(bottom);
        const heightPct = bottomPct - topPct;
        html += '<div class="chart-band" style="top:' + topPct + '%;height:' + heightPct + '%;" title="' + g.label + ' (' + g.cefr + ')">';
        html += '<span class="band-label">' + g.label + '</span>';
        html += '</div>';
      });
      html += '</div>';

      // Skill columns
      skillScores.forEach(function(item) {
        const pct = arrowPercent(item.scale);
        html += '<div class="chart-column">';
        html += '<div class="chart-bar-area">';
        html += '<div class="arrow-marker" style="bottom:' + pct + '%;">' + item.scale + '</div>';
        html += '</div>';
        html += '<div class="chart-col-label">' + item.skill + '</div>';
        html += '</div>';
      });

      // Overall column
      const overallPct = arrowPercent(overall);
      html += '<div class="chart-column overall-column">';
      html += '<div class="chart-bar-area">';
      html += '<div class="arrow-marker overall-marker" style="bottom:' + overallPct + '%;">' + overall + '</div>';
      html += '</div>';
      html += '<div class="chart-col-label"><strong>Overall</strong></div>';
      html += '</div>';

      html += '</div>'; // chart-columns
      html += '</div>'; // chart-scale
      chartArea.innerHTML = html;
    }
  };
})();
