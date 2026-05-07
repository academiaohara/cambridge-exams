// js/tests.js
// Tests section: exam/practice mode and grade evolution

(function() {
  Object.assign(window.BentoGrid, {
    _renderTopRow: function(exams) {
      var available = (exams || []).filter(function(e) { return e.status === 'available'; });
      var availableCount = available.length;

      var completedExams = 0;
      var startedExams = 0;
      available.forEach(function(exam) {
        var secs = exam.sections || {};
        var hasCompleted = Object.keys(secs).some(function(s) { return secs[s].completed && secs[s].completed.length > 0; });
        var hasInProgress = Object.keys(secs).some(function(s) { return secs[s].inProgress && secs[s].inProgress.length > 0; });
        if (hasCompleted) completedExams++;
        else if (hasInProgress) startedExams++;
      });

      var summitSubtitle, ascentSubtitle;
      if (availableCount === 0) {
        summitSubtitle = 'No tests available yet';
        ascentSubtitle = 'No tests available yet';
      } else {
        var countPart = availableCount + ' test' + (availableCount !== 1 ? 's' : '') + ' available';
        if (completedExams > 0) {
          summitSubtitle = countPart + ' · ' + completedExams + ' completed';
          ascentSubtitle = countPart + ' · ' + completedExams + ' completed';
        } else if (startedExams > 0) {
          summitSubtitle = countPart + ' · ' + startedExams + ' in progress';
          ascentSubtitle = countPart + ' · ' + startedExams + ' in progress';
        } else {
          summitSubtitle = countPart;
          ascentSubtitle = countPart;
        }
      }

      return '<div class="bento-top-row">' +

        '<div class="bento-card bento-card-summit" onclick="BentoGrid.selectMode(\'exam\')">' +
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Test Simulation</div>' +
            '<div class="bento-card-desc">' + summitSubtitle + '</div>' +
            '<div class="bento-card-hover-info">Sit the full Cambridge exam under real timed conditions — all sections in sequence, just like the real thing.</div>' +
          '</div>' +
        '</div>' +

        '<div class="bento-card bento-card-ascent" onclick="BentoGrid.selectMode(\'practice\')">' +
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">Test Practice</div>' +
            '<div class="bento-card-desc">' + ascentSubtitle + '</div>' +
            '<div class="bento-card-hover-info">Practice individual sections at your own pace — pick any part and focus on what you need most.</div>' +
          '</div>' +
        '</div>' +

      '</div>';
    },

    _renderMixedRow: function(exams) {
      var availableCount = (exams || []).filter(function(e) { return e.status === 'available'; }).length;
      var lockedByPack = !AppState.hasExamsPack;
      var disabled = availableCount === 0 || lockedByPack;
      var clickAttr = disabled
        ? (lockedByPack ? ' onclick="Dashboard.showExamsUpgradeGate()"' : '')
        : ' onclick="BentoGrid.startMixedTest()"';
      var descText = disabled
        ? (lockedByPack
          ? 'Pack Exams required to use Random Mix'
          : 'No tests available yet')
        : 'Mix exercises from ' + availableCount + ' tests — speaking 3 & 4 always from the same test';
      return '<div class="bento-mixed-row">' +
        '<div class="bento-card bento-card-mixed' + (disabled ? ' disabled' : '') + '"' + clickAttr + '>' +
          '<div class="bento-hover-overlay"></div>' +
          '<div class="bento-card-inner">' +
            '<div class="bento-card-title">' +
              '<span class="material-symbols-outlined" style="vertical-align:middle;font-size:1.4rem;margin-right:6px">shuffle</span>' +
              'Random Mix' +
            '</div>' +
            '<div class="bento-card-desc">' + descText + '</div>' +
            '<div class="bento-card-hover-info">Combine exercises from multiple tests in a single session — a great way to practice across all sections.</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    startMixedTest: function() {
      if (window.MixedTest) {
        MixedTest.start();
      }
    },

    selectMode: function(mode) {
      if (typeof Dashboard !== 'undefined' && Dashboard.renderSubpage) {
        var modeState = { view: 'subpage', mode: mode };
        history.pushState(modeState, '', Router.stateToPath(modeState));
        Dashboard.renderSubpage(mode);
      } else if (typeof Dashboard !== 'undefined' && Dashboard.setMode) {
        Dashboard.setMode(mode);
      }
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) {
        App.updateHeaderModeButtons();
      }
    },

    // ── Grade Evolution Section ──────────────────────────────────────────
    openGradeEvolution: function() {
      var content = document.getElementById('main-content');
      if (!content) return;

      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];

      var allSkills = ['Reading', 'Use of English', 'Writing', 'Listening', 'Speaking'];
      var skillColors = {
        'Reading': '#3b82f6',
        'Use of English': '#8b5cf6',
        'Writing': '#10b981',
        'Listening': '#f59e0b',
        'Speaking': '#ef4444',
        'Total': '#6366f1'
      };

      var scaleBounds = { A2: [80, 140], B1: [80, 160], B2: [120, 190], C1: [140, 210], C2: [160, 230] };
      var bounds = scaleBounds[level] || [140, 210];
      var scaleMin = bounds[0];
      var scaleMax = bounds[1];

      var gradeBandsByLevel = {
        'A2': [{ min: 120, label: 'Grade A' }, { min: 110, label: 'Grade B' }, { min: 100, label: 'Grade C' }, { min: 82, label: 'Level A1' }],
        'B1': [{ min: 140, label: 'Grade A' }, { min: 133, label: 'Grade B' }, { min: 120, label: 'Grade C' }, { min: 102, label: 'Level A2' }, { min: 82, label: 'Level A1' }],
        'B2': [{ min: 180, label: 'Grade A' }, { min: 173, label: 'Grade B' }, { min: 160, label: 'Grade C' }, { min: 140, label: 'Level B1' }, { min: 120, label: 'Level A2' }],
        'C1': [{ min: 200, label: 'Grade A' }, { min: 193, label: 'Grade B' }, { min: 180, label: 'Grade C' }, { min: 160, label: 'Level B2' }, { min: 142, label: 'Level B1' }],
        'C2': [{ min: 220, label: 'Grade A' }, { min: 213, label: 'Grade B' }, { min: 200, label: 'Grade C' }, { min: 180, label: 'Level C1' }]
      };

      // Gather per-exam skill scores
      var examScores = []; // [{ examId, skills: { skill: scaleScore } }]
      exams.forEach(function(exam) {
        if (exam.status !== 'available' || typeof ScoreCalculator === 'undefined') return;
        try {
          var scores = ScoreCalculator.getAllSkillScores(exam.id);
          var hasData = scores.some(function(s) { return s.raw > 0; });
          if (!hasData) return;
          var entry = { examId: exam.id, skills: {} };
          scores.forEach(function(s) {
            entry.skills[s.skill] = s.scale;
          });
          examScores.push(entry);
        } catch (e) { /* skip */ }
      });

      var bodyHtml = BentoGrid._buildGradeEvoChart(examScores, allSkills, skillColors, gradeBandsByLevel[level] || [], scaleMin, scaleMax);

      // Build sidebars like main dashboard
      var leftSidebarContent = typeof BentoGrid !== 'undefined' ? BentoGrid._buildLevelSelectorSidebarHtml() : '';
      if (typeof BentoGrid !== 'undefined') {
        leftSidebarContent += BentoGrid._buildGradeTrackerSidebarHtml(exams);
      }
      var rightSidebarContent = '';
      if (typeof BentoGrid !== 'undefined') {
        rightSidebarContent = BentoGrid._buildContinueBasecampHtml(exams);
        rightSidebarContent += BentoGrid._buildStreakSidebarHtml();
        rightSidebarContent += BentoGrid._buildCalendarSidebarHtml();
      }

      content.innerHTML =
        '<div class="dashboard-layout">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center">' +
            '<div class="grade-evolution-section">' +
              '<div class="subpage-header">' +
                '<button class="subpage-back-btn" onclick="loadDashboard()" aria-label="Back"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span class="icon-btn-label">Back</span></button>' +
                '<div>' +
                  '<div class="subpage-title">' + 'Grade Evolution' + '</div>' +
                  '<div class="subpage-subtitle">' + level + ' · ' + 'Track your progress across exams' + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="grade-evolution-body">' + bodyHtml + '</div>' +
            '</div>' +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof BentoGrid !== 'undefined') {
        BentoGrid._startGradeCarousel();
      }
      var geState = { view: 'gradeEvolution' };
      history.pushState(geState, '', Router.stateToPath(geState));
    },

    _buildGradeEvoChart: function(examScores, allSkills, skillColors, gradeBands, scaleMin, scaleMax) {
      if (examScores.length === 0) {
        return '<div class="ge-chart-card">' +
          '<div class="grade-evo-no-data"><i class="fas fa-chart-line"></i> ' + 'No data yet — complete exams to see your progress' + '</div>' +
        '</div>';
      }

      var self = this;

      // SVG dimensions – include a grades-column on the right
      var svgW = 700, svgH = 320;
      var gradeColW = 62;  // width of the grade-labels column
      var gradeColGap = 8; // gap between chart area and grade column
      var marginL = 48, marginR = 8, marginT = 20, marginB = 32;
      var chartW = svgW - marginL - marginR - gradeColW - gradeColGap;
      var chartH = svgH - marginT - marginB;
      var scoreRange = scaleMax - scaleMin;
      var axisBottom = marginT + chartH;
      var gradeColX = marginL + chartW + gradeColGap; // X start of grade column

      function scoreToY(score) {
        return marginT + chartH - ((score - scaleMin) / scoreRange) * chartH;
      }

      var n = examScores.length;
      // Add horizontal inner padding so dots never sit on the chart edge (accounts for dot radius + visual breathing room)
      var pointPadX = n > 1 ? Math.min(28, chartW * 0.07) : 0;
      function indexToX(i) {
        if (n <= 1) return marginL + chartW / 2;
        return marginL + pointPadX + (i / (n - 1)) * (chartW - 2 * pointPadX);
      }

      // Catmull-Rom spline → cubic bezier path (smooth curves through all points)
      function smoothLinePath(pts) {
        if (pts.length === 1) return 'M' + pts[0].x + ',' + pts[0].y;
        var d = 'M' + pts[0].x + ',' + pts[0].y;
        for (var i = 0; i < pts.length - 1; i++) {
          var p0 = pts[Math.max(i - 1, 0)];
          var p1 = pts[i];
          var p2 = pts[i + 1];
          var p3 = pts[Math.min(i + 2, pts.length - 1)];
          var cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(2);
          var cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(2);
          var cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(2);
          var cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(2);
          d += ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + p2.x + ',' + p2.y;
        }
        return d;
      }

      var svg = '<svg class="ge-chart-svg" viewBox="0 0 ' + svgW + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg">';

      // Defs: clip path + per-series gradient fills
      svg += '<defs>';
      svg += '<clipPath id="ge-clip"><rect x="' + marginL + '" y="' + marginT + '" width="' + chartW + '" height="' + chartH + '"/></clipPath>';
      var seriesList = allSkills.concat(['Total']);
      seriesList.forEach(function(skill) {
        var color = skillColors[skill] || '#6366f1';
        var isTotal = skill === 'Total';
        var gid = 'ge-grad-' + skill.replace(/[\s/]+/g, '-');
        svg += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">';
        svg += '<stop offset="0%" stop-color="' + color + '" stop-opacity="' + (isTotal ? '0.22' : '0.10') + '"/>';
        svg += '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>';
        svg += '</linearGradient>';
      });
      svg += '</defs>';

      // Grade band backgrounds (chart area) + grade labels column (outside chart)
      var bandPalette = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
      // Grade column header
      svg += '<text x="' + (gradeColX + gradeColW / 2) + '" y="' + (marginT - 5) + '" text-anchor="middle" font-size="8" fill="#94a3b8" font-weight="600" font-family="inherit">Grade</text>';
      gradeBands.forEach(function(band, i) {
        var topScore = i === 0 ? scaleMax : gradeBands[i - 1].min;
        var y1 = scoreToY(topScore);
        var y2 = scoreToY(band.min);
        var bandH = y2 - y1;
        var color = bandPalette[i % bandPalette.length];
        // Subtle background stripe in chart area
        svg += '<rect x="' + marginL + '" y="' + y1 + '" width="' + chartW + '" height="' + bandH + '" fill="' + color + '" opacity="0.07"/>';
        // Dashed boundary line spanning chart + gap + grade column
        svg += '<line x1="' + marginL + '" y1="' + y2 + '" x2="' + (gradeColX + gradeColW) + '" y2="' + y2 + '" stroke="#94a3b8" stroke-dasharray="4,3" stroke-width="0.75" opacity="0.4"/>';
        // Grade column: colored band rect
        svg += '<rect x="' + gradeColX + '" y="' + y1 + '" width="' + gradeColW + '" height="' + bandH + '" fill="' + color + '" opacity="0.14" rx="3"/>';
        // Label centered in grade band (skip if too short)
        if (bandH >= 12) {
          svg += '<text x="' + (gradeColX + gradeColW / 2) + '" y="' + ((y1 + y2) / 2 + 3.5) + '" text-anchor="middle" font-size="9" fill="' + color + '" opacity="0.9" font-weight="700" font-family="inherit">' + self._escapeHTML(band.label) + '</text>';
        }
      });
      // Top dashed line at scaleMax spanning chart + grade column
      svg += '<line x1="' + marginL + '" y1="' + marginT + '" x2="' + (gradeColX + gradeColW) + '" y2="' + marginT + '" stroke="#94a3b8" stroke-dasharray="4,3" stroke-width="0.75" opacity="0.4"/>';

      // Light horizontal grid lines and Y-axis labels (every 10 score points)
      for (var score = scaleMin; score <= scaleMax; score += 10) {
        var gy = scoreToY(score);
        svg += '<line x1="' + marginL + '" y1="' + gy + '" x2="' + (marginL + chartW) + '" y2="' + gy + '" stroke="#e2e8f0" stroke-width="0.6"/>';
        svg += '<text x="' + (marginL - 5) + '" y="' + (gy + 3.5) + '" text-anchor="end" font-size="9" fill="#94a3b8" font-family="inherit">' + score + '</text>';
      }

      // Vertical grid lines at each exam X position
      examScores.forEach(function(entry, i) {
        var x = indexToX(i);
        svg += '<line x1="' + x + '" y1="' + marginT + '" x2="' + x + '" y2="' + axisBottom + '" stroke="#e2e8f0" stroke-width="0.5" opacity="0.8"/>';
      });

      // X-axis tick marks and labels (exam ids)
      examScores.forEach(function(entry, i) {
        var x = indexToX(i);
        svg += '<line x1="' + x + '" y1="' + axisBottom + '" x2="' + x + '" y2="' + (axisBottom + 4) + '" stroke="#cbd5e1" stroke-width="1"/>';
        svg += '<text x="' + x + '" y="' + (svgH - 6) + '" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="inherit">' + self._escapeHTML(entry.examId.replace('Test', 'T')) + '</text>';
      });

      // Axis borders
      svg += '<line x1="' + marginL + '" y1="' + marginT + '" x2="' + marginL + '" y2="' + axisBottom + '" stroke="#cbd5e1" stroke-width="1.5"/>';
      svg += '<line x1="' + marginL + '" y1="' + axisBottom + '" x2="' + (marginL + chartW) + '" y2="' + axisBottom + '" stroke="#cbd5e1" stroke-width="1.5"/>';
      svg += '<line x1="' + (marginL + chartW) + '" y1="' + marginT + '" x2="' + (marginL + chartW) + '" y2="' + axisBottom + '" stroke="#cbd5e1" stroke-width="1"/>';

      // Data series inside clip region
      svg += '<g clip-path="url(#ge-clip)">';
      seriesList.forEach(function(skill) {
        var color = skillColors[skill] || '#6366f1';
        var isTotal = skill === 'Total';
        var gid = 'ge-grad-' + skill.replace(/[\s/]+/g, '-');

        var points = [];
        examScores.forEach(function(entry, i) {
          var sc;
          if (isTotal) {
            var sks = Object.keys(entry.skills);
            var tot = 0; var cnt = 0;
            sks.forEach(function(sk) { if (entry.skills[sk] > 0) { tot += entry.skills[sk]; cnt++; } });
            sc = cnt > 0 ? Math.round(tot / cnt) : 0;
          } else {
            sc = entry.skills[skill] || 0;
          }
          if (sc > 0) {
            points.push({ x: indexToX(i), y: scoreToY(sc), score: sc, label: entry.examId.replace('Test', 'T') });
          }
        });

        if (points.length === 0) return;

        var sid = 'ge-series-' + skill.replace(/[\s/]+/g, '-');
        var safeSkill = self._escapeHTML(skill);
        svg += '<g id="' + sid + '">';

        if (points.length > 1) {
          var linePath = smoothLinePath(points);
          // Gradient area fill under the curve
          var areaPath = linePath + ' L' + points[points.length - 1].x + ',' + axisBottom + ' L' + points[0].x + ',' + axisBottom + ' Z';
          svg += '<path d="' + areaPath + '" fill="url(#' + gid + ')" stroke="none"/>';
          // Smooth bezier line
          svg += '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="' + (isTotal ? 2.5 : 1.75) + '"' + (isTotal ? ' stroke-dasharray="7,4"' : '') + ' opacity="0.85" stroke-linejoin="round" stroke-linecap="round"/>';
        }

        // Dots with interactive tooltip via data attributes
        points.forEach(function(p) {
          var tipText = safeSkill + ': ' + p.score + ' (' + self._escapeHTML(p.label) + ')';
          svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (isTotal ? 5.5 : 4.5) + '" fill="' + color + '" stroke="white" stroke-width="2"' +
            ' data-ge-tip="' + tipText + '" data-ge-color="' + color + '"' +
            ' onmouseenter="BentoGrid._showGeTip(event,this)" onmouseleave="BentoGrid._hideGeTip()"' +
            ' style="cursor:pointer"/>';
        });
        svg += '</g>';
      });
      svg += '</g>';
      svg += '</svg>';

      // Horizontal legend
      var legendHtml = '<div class="ge-legend">';
      seriesList.forEach(function(skill) {
        var color = skillColors[skill] || '#6366f1';
        var sid = 'ge-series-' + skill.replace(/[\s/]+/g, '-');
        var isTotal = skill === 'Total';
        legendHtml += '<button class="ge-legend-btn active" data-series="' + sid + '" onclick="BentoGrid.toggleGradeEvoSeries(\'' + sid + '\', this)" style="--ge-color:' + color + '">' +
          '<span class="ge-legend-dot' + (isTotal ? ' ge-legend-dash' : '') + '" style="background:' + color + '"></span>' +
          '<span>' + self._escapeHTML(skill) + '</span>' +
        '</button>';
      });
      legendHtml += '</div>';

      return '<div class="ge-chart-card">' + svg + legendHtml + '</div>';
    },

    toggleGradeEvoSeries: function(seriesId, btn) {
      var el = document.getElementById(seriesId);
      if (!el) return;
      if (btn.classList.contains('active')) {
        el.style.display = 'none';
        btn.classList.remove('active');
      } else {
        el.style.display = '';
        btn.classList.add('active');
      }
    },

    _showGeTip: function(evt, el) {
      var tip = document.getElementById('ge-tip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'ge-tip';
        tip.className = 'ge-tip';
        document.body.appendChild(tip);
      }
      var text = el.getAttribute('data-ge-tip') || '';
      var color = el.getAttribute('data-ge-color') || '#6366f1';
      tip.style.setProperty('--ge-tip-color', color);
      tip.textContent = text;
      tip.style.display = 'block';
      var tipW = tip.offsetWidth;
      var tipH = tip.offsetHeight;
      var x = evt.clientX + 14;
      var y = evt.clientY - 36;
      if (x + tipW > window.innerWidth - 8) { x = evt.clientX - tipW - 14; }
      if (y < 8) { y = evt.clientY + 10; }
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    },

    _hideGeTip: function() {
      var tip = document.getElementById('ge-tip');
      if (tip) tip.style.display = 'none';
    }
  });
})();
