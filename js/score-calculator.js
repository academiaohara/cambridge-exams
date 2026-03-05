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
