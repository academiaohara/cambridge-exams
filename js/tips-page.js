// js/tips-page.js
(function () {
  var SKILLS = ['reading', 'listening', 'writing', 'speaking'];
  var LEVELS = ['B1', 'B2', 'C1'];

  var SKILL_META = {
    reading: {
      label: 'Reading',
      icon: 'book-open',
      color: '#1e9d8e',
      description: 'Tips for Reading & Use of English parts'
    },
    listening: {
      label: 'Listening',
      icon: 'headphones',
      color: '#f59e0b',
      description: 'Tips for Listening parts'
    },
    writing: {
      label: 'Writing',
      icon: 'pen',
      color: '#2D2E5F',
      description: 'Tips for Writing tasks'
    },
    speaking: {
      label: 'Speaking',
      icon: 'microphone',
      color: '#e74c3c',
      description: 'Tips for Speaking parts'
    }
  };

  var LEVEL_META = {
    B1: { label: 'B1 Preliminary', color: '#8b5cf6' },
    B2: { label: 'B2 First', color: '#1e9d8e' },
    C1: { label: 'C1 Advanced', color: '#2D2E5F' }
  };

  window.TipsPage = {

    // ── Public entry points ───────────────────────────────────────

    openTipsHome: function () {
      var state = { view: 'tips' };
      history.pushState(state, '', '/tips');
      this._renderHome();
    },

    openTipsSkill: function (level, skill) {
      level = level.toUpperCase();
      skill = skill.toLowerCase();
      var state = { view: 'tipsSkill', level: level, skill: skill };
      history.pushState(state, '', '/tips/' + level.toLowerCase() + '/' + skill);
      this._renderSkill(level, skill);
    },

    // Called by popstate handler
    renderFromState: function (state) {
      if (state.view === 'tips') {
        this._renderHome();
      } else if (state.view === 'tipsSkill' && state.level && state.skill) {
        this._renderSkill(state.level, state.skill);
      }
    },

    // ── Home page ─────────────────────────────────────────────────

    _renderHome: function () {
      var content = document.getElementById('main-content');
      if (!content) return;

      var html = '<div class="tips-page">';
      html += '<div class="tips-page-header">';
      html += '<button class="tips-back-btn" onclick="TipsPage._goBack()"><i class="fas fa-arrow-left"></i></button>';
      html += '<div class="tips-page-header-text">';
      html += '<h1 class="tips-page-title">Cambridge Exam Tips</h1>';
      html += '<p class="tips-page-subtitle">Choose your level and skill to get targeted exam tips</p>';
      html += '</div>';
      html += '</div>';

      html += '<div class="tips-level-tabs">';
      LEVELS.forEach(function (lvl) {
        var meta = LEVEL_META[lvl];
        html += '<button class="tips-level-tab" data-level="' + lvl + '" onclick="TipsPage._setLevel(\'' + lvl + '\')" style="--tips-level-color:' + meta.color + '">' + meta.label + '</button>';
      });
      html += '</div>';

      html += '<div class="tips-skills-grid">';
      SKILLS.forEach(function (skill) {
        var meta = SKILL_META[skill];
        LEVELS.forEach(function (lvl) {
          html += '<div class="tips-skill-card" data-level="' + lvl + '" onclick="TipsPage.openTipsSkill(\'' + lvl + '\',\'' + skill + '\')" onkeydown="if(event.key===\'Enter\'||event.key===' + "' '" + ')TipsPage.openTipsSkill(\'' + lvl + '\',\'' + skill + '\')" style="--tips-skill-color:' + meta.color + '" tabindex="0" role="button" aria-label="' + meta.label + ' tips for ' + lvl + '">';
          html += '<div class="tips-skill-card-icon"><i class="fas fa-' + meta.icon + '"></i></div>';
          html += '<div class="tips-skill-card-body">';
          html += '<span class="tips-skill-card-level">' + LEVEL_META[lvl].label + '</span>';
          html += '<h2 class="tips-skill-card-name">' + meta.label + '</h2>';
          html += '<p class="tips-skill-card-desc">' + meta.description + '</p>';
          html += '</div>';
          html += '<div class="tips-skill-card-arrow"><i class="fas fa-chevron-right"></i></div>';
          html += '</div>';
        });
      });
      html += '</div>';

      html += '</div>';

      content.innerHTML = html;

      // Apply active level filter (default: show all)
      this._applyLevelFilter(null);
    },

    _setLevel: function (level) {
      var btn = document.querySelector('.tips-level-tab[data-level="' + level + '"]');
      var isActive = btn && btn.classList.contains('active');
      document.querySelectorAll('.tips-level-tab').forEach(function (b) {
        b.classList.remove('active');
      });
      if (!isActive) {
        if (btn) btn.classList.add('active');
        this._applyLevelFilter(level);
      } else {
        this._applyLevelFilter(null);
      }
    },

    _applyLevelFilter: function (level) {
      document.querySelectorAll('.tips-skill-card').forEach(function (card) {
        if (!level || card.getAttribute('data-level') === level) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    },

    // ── Skill detail page ─────────────────────────────────────────

    _renderSkill: async function (level, skill) {
      var content = document.getElementById('main-content');
      if (!content) return;

      var meta = SKILL_META[skill];
      var levelMeta = LEVEL_META[level] || { label: level };

      // Show loading state
      content.innerHTML = '<div class="tips-page"><div class="tips-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading tips...</div></div>';

      var tipsData = null;
      try {
      var url = (window.CONFIG ? window.CONFIG.TIPS_BASE_URL : '/tips/') + skill + '.json';
        var resp = await fetch(url + '?v=' + Date.now());
        if (resp.ok) {
          tipsData = await resp.json();
        }
      } catch (e) {
        // handled below
      }

      var html = '<div class="tips-page">';

      // Header
      html += '<div class="tips-page-header" style="--tips-skill-color:' + meta.color + '">';
      html += '<button class="tips-back-btn" onclick="TipsPage.openTipsHome()"><i class="fas fa-arrow-left"></i></button>';
      html += '<div class="tips-page-header-text">';
      html += '<div class="tips-skill-badge"><i class="fas fa-' + meta.icon + '"></i> ' + meta.label + '</div>';
      html += '<h1 class="tips-page-title">' + levelMeta.label + ' – ' + meta.label + ' Tips</h1>';
      html += '</div>';
      html += '</div>';

      // Level pills (link to same skill other levels)
      html += '<div class="tips-level-pills">';
      LEVELS.forEach(function (lvl) {
        html += '<a class="tips-level-pill' + (lvl === level ? ' active' : '') + '" href="/tips/' + lvl.toLowerCase() + '/' + skill + '" onclick="event.preventDefault();TipsPage.openTipsSkill(\'' + lvl + '\',\'' + skill + '\')" style="--tips-level-color:' + LEVEL_META[lvl].color + '">' + lvl + '</a>';
      });
      html += '</div>';

      if (!tipsData) {
        html += '<div class="tips-error"><i class="fas fa-exclamation-circle"></i> Could not load tips. Please try again later.</div>';
      } else {
        html += this._buildTipsContent(tipsData, level, skill);
      }

      html += '</div>';
      content.innerHTML = html;

      // Activate first part tab after rendering (avoids inline script)
      var firstPartEl = document.getElementById('tips-first-part');
      if (firstPartEl) {
        this._showPart(firstPartEl.getAttribute('data-part'));
      }
    },

    _buildTipsContent: function (tipsData, level, skill) {
      var html = '';
      var meta = SKILL_META[skill];

      // Parts-based structure (reading)
      if (tipsData.parts) {
        var parts = tipsData.parts;
        var partKeys = Object.keys(parts).sort(function (a, b) { return parseInt(a) - parseInt(b); });

        html += '<div class="tips-parts-nav">';
        partKeys.forEach(function (key) {
          html += '<button class="tips-part-btn" data-part="' + key + '" onclick="TipsPage._showPart(\'' + key + '\')">' + (parts[key].title || ('Part ' + key)) + '</button>';
        });
        if (tipsData.general && tipsData.general.length) {
          html += '<button class="tips-part-btn" data-part="general" onclick="TipsPage._showPart(\'general\')">General</button>';
        }
        html += '</div>';

        html += '<div class="tips-parts-content">';
        partKeys.forEach(function (key, idx) {
          var part = parts[key];
          html += '<div class="tips-part-section" data-part="' + key + '"' + (idx > 0 ? ' style="display:none"' : '') + '>';
          html += '<h2 class="tips-part-title" style="color:' + meta.color + '">' + (part.title || ('Part ' + key)) + '</h2>';
          html += '<ul class="tips-list">';
          (part.tips || []).forEach(function (tip) {
            html += '<li class="tips-list-item"><i class="fas fa-lightbulb tips-list-icon" style="color:' + meta.color + '"></i><span>' + _esc(tip) + '</span></li>';
          });
          html += '</ul>';
          html += '</div>';
        });

        if (tipsData.general && tipsData.general.length) {
          html += '<div class="tips-part-section" data-part="general" style="display:none">';
          html += '<h2 class="tips-part-title" style="color:' + meta.color + '">General Tips</h2>';
          html += '<ul class="tips-list">';
          tipsData.general.forEach(function (item) {
            var tipText = typeof item === 'string' ? item : (item.tip || '');
            html += '<li class="tips-list-item"><i class="fas fa-lightbulb tips-list-icon" style="color:' + meta.color + '"></i><span>' + _esc(tipText) + '</span></li>';
          });
          html += '</ul>';
          html += '</div>';
        }

        html += '</div>';

        // First part key stored as data attribute for post-render activation
        html += '<div id="tips-first-part" data-part="' + partKeys[0] + '" style="display:none"></div>';

      } else if (tipsData.tips) {
        // Simple flat tips list (listening, speaking, writing)
        html += '<div class="tips-simple-section">';
        html += '<h2 class="tips-part-title" style="color:' + meta.color + '">' + _esc(tipsData.title || '') + '</h2>';
        html += '<ul class="tips-list">';
        tipsData.tips.forEach(function (tip) {
          html += '<li class="tips-list-item"><i class="fas fa-lightbulb tips-list-icon" style="color:' + meta.color + '"></i><span>' + _esc(tip) + '</span></li>';
        });
        html += '</ul>';
        html += '</div>';
      }

      return html;
    },

    _showPart: function (partKey) {
      document.querySelectorAll('.tips-part-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-part') === partKey);
      });
      document.querySelectorAll('.tips-part-section').forEach(function (sec) {
        sec.style.display = sec.getAttribute('data-part') === partKey ? '' : 'none';
      });
    },

    _goBack: function () {
      if (history.length > 1) {
        history.back();
      } else {
        if (typeof Dashboard !== 'undefined') {
          Dashboard.render();
          history.replaceState({ view: 'dashboard' }, '', '/');
        }
      }
    }
  };

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
