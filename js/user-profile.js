// js/user-profile.js
// User profile settings — reads/writes public.profiles in Supabase
(function () {
  'use strict';

  window.UserProfile = {
    _profile: null,
    _panelOpen: false,

    // ── Profile avatar list (used for speaking partners & examiners) ──
    ANIMAL_AVATARS: [
      'Aisha.png', 'Alex.png', 'Anna.png', 'Carla.png', 'Carlos.png',
      'Daniel.png', 'Elena.png', 'Emma.png', 'Fatima.png', 'Jack.png',
      'Javier.png', 'Kenji.png', 'Lucas.png', 'Lucia.png', 'Malik.png',
      'Mateo.png', 'Pierre.png', 'Priya.png', 'Sofia.png', 'Sofía.png'
    ],

    getRandomAnimalAvatar: function () {
      if (this.ANIMAL_AVATARS.length === 0) return null;
      return this.ANIMAL_AVATARS[Math.floor(Math.random() * this.ANIMAL_AVATARS.length)];
    },

    // ── load or create profile ────────────────────────────────────────
      // Returns true when a new profile row was created (first sign-in).
    loadOrCreate: async function (user) {
      const client = Auth._client;
      if (!client || !user) { return false; }

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const animalAvatar = this.getRandomAnimalAvatar();
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '',
          avatar_url: (user.user_metadata && user.user_metadata.avatar_url) || '',
          animal_avatar: animalAvatar,
          preferred_level: AppState.currentLevel || 'C1',
          preferred_mode: AppState.currentMode || 'practice',
          preferred_language: 'en',
          role: 'user',
          has_theory_pack: false,
          has_exams_pack: false
        };
        const { data: created } = await client
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        this._profile = created || newProfile;
        this._syncAccessFromProfile(this._profile);
        if (this._profile && this._profile.animal_avatar) {
          try { localStorage.setItem('cambridge_animal_avatar', this._profile.animal_avatar); } catch (e) { /* ignore */ }
        }
        return true;
      } else if (!error && data) {
        this._profile = data;
        this._syncAccessFromProfile(data);
        if (data.animal_avatar) {
          try { localStorage.setItem('cambridge_animal_avatar', data.animal_avatar); } catch (e) { /* ignore */ }
        }
        this._applyPreferences(data);
      }
      return false;
    },

    _applyPreferences: function (profile) {
      if (profile.preferred_level) {
        AppState.currentLevel = profile.preferred_level;
        try { localStorage.setItem('preferred_level', profile.preferred_level); } catch (e) {}
      }
      if (profile.preferred_mode) {
        this.setPreferredMode(profile.preferred_mode);
      }
      if (profile.preferred_language) {
        try { localStorage.setItem('preferred_language', profile.preferred_language); } catch (e) {}
      }
    },

    setPreferredMode: function (mode) {
      if (mode !== 'practice' && mode !== 'exam') return;
      AppState.currentMode = mode;
      try { localStorage.setItem('preferred_mode', mode); } catch (e) {}
      if (this._profile) this._profile.preferred_mode = mode;
    },

    persistPreferredMode: function (mode) {
      this.setPreferredMode(mode);
      if (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()) {
        this.updateProfile({ preferred_mode: mode });
      }
    },

    // ── update profile in Supabase ────────────────────────────────────
    updateProfile: async function (updates) {
      const client = Auth._client;
      const user = Auth.getUser();
      if (!client || !user) { return; }

      const { data, error } = await client
        .from('profiles')
        .update(Object.assign({ updated_at: new Date().toISOString() }, updates))
        .eq('id', user.id)
        .select()
        .single();

      if (!error && data) {
        this._profile = data;
        this._syncAccessFromProfile(data);
        this._applyPreferences(data);
        this._refreshPanelValues();
      }
      return { data, error };
    },

    _syncAccessFromProfile: function (profile) {
      var data = profile || {};
      AppState.isAdmin = (data.role === 'admin');
      AppState.hasTheoryPack = !!(data.has_theory_pack) || AppState.isAdmin;
      AppState.hasExamsPack = !!(data.has_exams_pack) || AppState.isAdmin;
      AppState.isPremium = AppState.hasTheoryPack && AppState.hasExamsPack;
    },

    // ── profile screen navigation ─────────────────────────────────────
    togglePanel: function () {
      this.renderProfileSection();
    },

    openPanel: function () {
      this.renderProfileSection();
    },

    closePanel: function () {
      const panel = document.getElementById('user-profile-panel');
      if (panel) { panel.remove(); }
      this._panelOpen = false;
    },

    _outsideClickHandler: function (e) {
      const panel = document.getElementById('user-profile-panel');
      const widget = document.getElementById('user-widget');
      if (panel && widget && !panel.contains(e.target) && !widget.contains(e.target)) {
        this.closePanel();
      }
    },

    // ── render panel ──────────────────────────────────────────────────
    _renderPanel: function () {
      var existing = document.getElementById('user-profile-panel');
      if (existing) { this._refreshPanelValues(); return; }

      var user = Auth.getUser();
      var profile = this._profile || {};
      var name = profile.full_name || (user && (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))) || (user && user.email) || 'User';
      var email = profile.email || (user && user.email) || '';
      var avatarUrl = profile.avatar_url || (user && user.user_metadata && user.user_metadata.avatar_url) || '';
      var initials = name.split(' ').filter(function (w) { return w; }).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();

      var levels = ['B1', 'B2', 'C1'];

      function levelOptions(current) {
        return levels.map(function (l) {
          return '<option value="' + l + '"' + (l === current ? ' selected' : '') + '>' + l + '</option>';
        }).join('');
      }

      var panel = document.createElement('div');
      panel.id = 'user-profile-panel';
      panel.className = 'user-profile-panel';

      // Always use Google profile photo for user display
      var panelAvatarHtml = avatarUrl
        ? '<img src="' + avatarUrl + '" alt="' + name + '">'
        : '<span class="profile-initials-large">' + initials + '</span>';

      panel.innerHTML =
        '<div class="profile-panel-header">' +
          '<div class="profile-avatar-large">' +
          panelAvatarHtml +
          '</div>' +
          '<div class="profile-info">' +
            '<div class="profile-name">' + name + '</div>' +
            '<div class="profile-email">' + email + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="profile-prefs">' +
          '<div class="pref-row">' +
            '<label>Level</label>' +
            '<select id="pref-level" onchange="UserProfile._onPrefChange()">' + levelOptions(profile.preferred_level || AppState.currentLevel) + '</select>' +
          '</div>' +
        '</div>' +
        '<div class="profile-sync-status" id="profile-sync-status"></div>' +
        '<button class="premium-plan-btn primary" style="margin:8px 20px;width:calc(100% - 40px)" onclick="UserProfile.closePanel(); UserProfile.renderProfileSection()">' +
          '<i class="fas fa-user-circle"></i> View Full Profile' +
        '</button>' +
        (typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI() ? '' :
        '<button class="premium-plan-btn outline" style="margin:4px 20px;width:calc(100% - 40px)" onclick="UserProfile.closePanel(); UserProfile.renderPremiumSection()">' +
          '<i class="fas fa-crown"></i> View Plans' +
        '</button>') +
        '<button class="profile-signout-btn" onclick="Auth.signOut()">' +
          '<i class="fas fa-sign-out-alt"></i> Sign out' +
        '</button>';

      document.body.appendChild(panel);
    },

    _refreshPanelValues: function () {
      var profile = this._profile || {};
      var lvl = document.getElementById('pref-level');
      if (lvl) { lvl.value = profile.preferred_level || AppState.currentLevel; }
    },

    _onPrefChange: async function () {
      var level = document.getElementById('pref-level');
      var newLevel = level ? level.value : AppState.currentLevel;
      var updates = {
        preferred_level: newLevel
      };
      var statusEl = document.getElementById('profile-sync-status');
      var client = Auth && Auth._client;
      var user = Auth && Auth.getUser && Auth.getUser();
      if (!client || !user) {
        // Guest mode: just apply locally and sync dashboard
        AppState.currentLevel = newLevel;
        try { localStorage.setItem('preferred_level', newLevel); } catch (e) {}
        if (typeof Dashboard !== 'undefined' && Dashboard.filterByLevel) {
          Dashboard.filterByLevel(newLevel);
        }
        return;
      }
      if (statusEl) { statusEl.textContent = 'Saving…'; statusEl.className = 'profile-sync-status syncing'; }
      var result = await this.updateProfile(updates);
      if (statusEl) {
        if (!result || result.error) {
          statusEl.textContent = '';
          var warnIcon = document.createElement('span');
          warnIcon.className = 'material-symbols-outlined';
          warnIcon.textContent = 'warning';
          statusEl.appendChild(warnIcon);
          statusEl.appendChild(document.createTextNode(' Could not save'));
          statusEl.className = 'profile-sync-status error';
        } else {
          statusEl.textContent = '';
          var okIcon = document.createElement('span');
          okIcon.className = 'material-symbols-outlined';
          okIcon.textContent = 'check_circle';
          statusEl.appendChild(okIcon);
          statusEl.appendChild(document.createTextNode(' Saved'));
          statusEl.className = 'profile-sync-status saved';
          setTimeout(function () { if (statusEl) { statusEl.textContent = ''; statusEl.className = 'profile-sync-status'; } }, 2000);
          // Sync level change to dashboard after successful save
          if (typeof Dashboard !== 'undefined' && Dashboard.filterByLevel) {
            Dashboard.filterByLevel(newLevel);
          }
        }
      }
    },

    // ── Select animal avatar ──────────────────────────────────────────
    _selectAnimalAvatar: async function (filename) {
      // Update locally
      if (this._profile) {
        this._profile.animal_avatar = filename;
      }
      // Cache in localStorage so it persists across reloads even if Supabase is slow
      try { localStorage.setItem('cambridge_animal_avatar', filename); } catch (e) { /* ignore */ }
      // Update in Supabase
      await this.updateProfile({ animal_avatar: filename });
      // Refresh the header widget to show the new avatar
      if (typeof Auth !== 'undefined' && Auth._renderUserWidget) {
        var user = Auth.getUser();
        if (user) {
          Auth._renderUserWidget(user);
        }
      }
      // Force re-render the panel so it picks up the new avatar
      var existingPanel = document.getElementById('user-profile-panel');
      if (existingPanel) { existingPanel.remove(); }
      // Re-render profile section to show selection
      this.renderProfileSection();
    },

    // ── Avatar grid toggle and pagination ─────────────────────────────
    _avatarGridPage: 0,

    _toggleAvatarGrid: function () {
      var container = document.getElementById('animal-avatar-grid-container');
      if (!container) return;
      if (container.style.display === 'none') {
        this._avatarGridPage = 0;
        this._renderAvatarGridPage();
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    },

    _renderAvatarGridPage: function () {
      var container = document.getElementById('animal-avatar-grid-container');
      if (!container) return;

      var perPage = 16;
      var page = this._avatarGridPage || 0;
      var all = this.ANIMAL_AVATARS;
      var totalPages = Math.ceil(all.length / perPage);
      var start = page * perPage;
      var pageItems = all.slice(start, start + perPage);
      var animalAvatar = (this._profile && this._profile.animal_avatar) || '';

      var gridHtml = '';
      pageItems.forEach(function (img) {
        var selected = (img === animalAvatar) ? ' animal-avatar-selected' : '';
        var label = img.replace('.png', '').replace('.jpg', '');
        gridHtml += '<div class="animal-avatar-option' + selected + '" onclick="UserProfile._selectAnimalAvatar(\'' + img + '\')" title="' + label + '">' +
          '<img src="/Assets/images/Profiles/' + img + '" alt="' + label + '">' +
        '</div>';
      });

      var paginationHtml = '';
      if (totalPages > 1) {
        paginationHtml = '<div class="animal-avatar-pagination">' +
          '<button class="animal-avatar-page-btn" ' + (page <= 0 ? 'disabled' : '') + ' onclick="UserProfile._avatarGridPrev()"><i class="fas fa-chevron-left"></i></button>' +
          '<span>' + (page + 1) + ' / ' + totalPages + '</span>' +
          '<button class="animal-avatar-page-btn" ' + (page >= totalPages - 1 ? 'disabled' : '') + ' onclick="UserProfile._avatarGridNext()"><i class="fas fa-chevron-right"></i></button>' +
        '</div>';
      }

      container.innerHTML =
        '<p style="color:var(--text-medium);font-size:0.88rem;margin:0 0 14px">' +
          'Choose your profile photo' +
        '</p>' +
        '<div class="animal-avatar-grid">' + gridHtml + '</div>' +
        paginationHtml;
    },

    _avatarGridPrev: function () {
      if (this._avatarGridPage > 0) {
        this._avatarGridPage--;
        this._renderAvatarGridPage();
      }
    },

    _avatarGridNext: function () {
      var perPage = 16;
      var totalPages = Math.ceil(this.ANIMAL_AVATARS.length / perPage);
      if (this._avatarGridPage < totalPages - 1) {
        this._avatarGridPage++;
        this._renderAvatarGridPage();
      }
    },

    _escapeHtml: function (str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    _formatJoinDate: function (createdAt) {
      if (!createdAt) return '';
      try {
        var d = new Date(createdAt);
        var months = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        return 'Joined in ' + months[d.getMonth()] + ' ' + d.getFullYear();
      } catch (e) {
        return '';
      }
    },

    _getProfileStats: function () {
      var level = AppState.currentLevel || 'C1';
      var streak = (typeof StreakManager !== 'undefined') ? StreakManager.getStreak() : null;
      var streakCount = streak ? (streak.currentStreak || 0) : 0;
      var longestStreak = streak ? (streak.longestStreak || 0) : 0;
      var totalDaysActive = streak ? (streak.totalDaysActive || 0) : 0;
      var exams = window.EXAMS_DATA[level] || [];
      var completedParts = 0;
      var inProgressParts = 0;
      var totalParts = 0;
      var availableCount = 0;
      var scaleTotal = 0;
      var scaleCount = 0;

      exams.forEach(function (exam) {
        if (exam.status !== 'available') return;
        availableCount++;
        Object.keys(exam.sections || {}).forEach(function (sectionKey) {
          var section = exam.sections[sectionKey] || {};
          completedParts += (section.completed || []).length;
          inProgressParts += (section.inProgress || []).length;
          totalParts += section.total || 0;
        });
        if (typeof ScoreCalculator !== 'undefined') {
          try {
            ScoreCalculator.getAllSkillScores(exam.id).forEach(function (score) {
              if (score.raw > 0) {
                scaleTotal += score.scale;
                scaleCount++;
              }
            });
          } catch (e) { /* ignore */ }
        }
      });

      return {
        level: level,
        streakCount: streakCount,
        longestStreak: longestStreak,
        totalDaysActive: totalDaysActive,
        completedParts: completedParts,
        inProgressParts: inProgressParts,
        totalParts: totalParts,
        availableCount: availableCount,
        avgScale: scaleCount ? Math.round(scaleTotal / scaleCount) : null
      };
    },

    _nextStreakMilestone: function (current) {
      var milestones = [7, 30, 100, 365];
      for (var i = 0; i < milestones.length; i++) {
        if (current < milestones[i]) return milestones[i];
      }
      return Math.max(current + 1, 365);
    },

    _buildProfileStatCard: function (icon, colorClass, value, label, opts) {
      opts = opts || {};
      var tag = opts.onclick ? 'button' : 'div';
      var attrs = 'class="profile-duo-stat-card profile-duo-stat-card--' + colorClass + (opts.onclick ? ' profile-duo-stat-card--action' : '') + '"';
      if (opts.onclick) {
        attrs += ' type="button" onclick="' + opts.onclick + '" aria-label="' + this._escapeHtml(opts.ariaLabel || label) + '"';
      }
      return '<' + tag + ' ' + attrs + '>' +
        '<div class="profile-duo-stat-icon" aria-hidden="true">' +
          '<span class="material-symbols-outlined">' + icon + '</span>' +
        '</div>' +
        '<div class="profile-duo-stat-value">' + this._escapeHtml(String(value)) + '</div>' +
        '<div class="profile-duo-stat-label">' + this._escapeHtml(label) + '</div>' +
      '</' + tag + '>';
    },

    _getCurrentTranslateLangLabel: function () {
      if (typeof MainNav !== 'undefined' && MainNav._getCurrentTranslateLang && MainNav._getTranslateLangLabel) {
        return MainNav._getTranslateLangLabel(MainNav._getCurrentTranslateLang());
      }
      if (typeof Tools !== 'undefined' && Tools.getTranslateLang && Tools.getTranslateLanguages) {
        var code = Tools.getTranslateLang();
        var langs = Tools.getTranslateLanguages();
        var found = langs.find(function (l) { return l.code === code; });
        return found ? found.label : String(code || 'es').toUpperCase();
      }
      return 'Español';
    },

    _buildProfileQuickLinksHtml: function (hidePlans) {
      return '<div class="profile-duo-side-links">' +
        '<button type="button" class="profile-duo-side-link" onclick="DashboardNav.openGradeEvolution()">' +
          '<span class="material-symbols-outlined" aria-hidden="true">query_stats</span>' +
          '<span>Grade evolution</span>' +
          '<span class="material-symbols-outlined profile-duo-side-chevron" aria-hidden="true">chevron_right</span>' +
        '</button>' +
        '<button type="button" class="profile-duo-side-link" onclick="DashboardNav.openStreakSection()">' +
          '<span class="material-symbols-outlined" aria-hidden="true">local_fire_department</span>' +
          '<span>Streak calendar</span>' +
          '<span class="material-symbols-outlined profile-duo-side-chevron" aria-hidden="true">chevron_right</span>' +
        '</button>' +
        '<button type="button" class="profile-duo-side-link" onclick="openScoreCalculator(event)">' +
          '<span class="material-symbols-outlined" aria-hidden="true">calculate</span>' +
          '<span>Score calculator</span>' +
          '<span class="material-symbols-outlined profile-duo-side-chevron" aria-hidden="true">chevron_right</span>' +
        '</button>' +
        (hidePlans ? '' :
          '<button type="button" class="profile-duo-side-link" onclick="UserProfile.renderPremiumSection()">' +
            '<span class="material-symbols-outlined" aria-hidden="true">workspace_premium</span>' +
            '<span>View plans</span>' +
            '<span class="material-symbols-outlined profile-duo-side-chevron" aria-hidden="true">chevron_right</span>' +
          '</button>') +
      '</div>';
    },

    _buildProfileMobileToolsHtml: function (hidePlans, stats) {
      var langLabel = this._getCurrentTranslateLangLabel();
      return '<section class="profile-duo-mobile-tools" aria-labelledby="profile-duo-tools-title">' +
        '<h2 id="profile-duo-tools-title" class="profile-duo-section-title">Tools &amp; settings</h2>' +
        '<div class="profile-duo-settings-card profile-duo-tool-row-card">' +
          '<button type="button" class="profile-duo-tool-row" onclick="DashboardNav.openMobileLangModal()">' +
            '<span class="profile-duo-tool-row-icon profile-duo-tool-row-icon--lang" aria-hidden="true">' +
              '<span class="material-symbols-outlined">translate</span>' +
            '</span>' +
            '<span class="profile-duo-tool-row-body">' +
              '<strong>Language</strong>' +
              '<small>Instructions &amp; translations</small>' +
            '</span>' +
            '<span class="profile-duo-tool-row-value">' + this._escapeHtml(langLabel) + '</span>' +
            '<span class="material-symbols-outlined profile-duo-side-chevron" aria-hidden="true">chevron_right</span>' +
          '</button>' +
        '</div>' +
        '<div class="profile-duo-tools-grid" role="group" aria-label="Quick tools">' +
          '<button type="button" class="profile-duo-tool-chip profile-duo-tool-chip--streak" onclick="DashboardNav.openStreakSection()">' +
            '<span class="profile-duo-tool-chip-icon" aria-hidden="true">' +
              '<span class="material-symbols-outlined">local_fire_department</span>' +
            '</span>' +
            '<span class="profile-duo-tool-chip-label">Streak</span>' +
            '<span class="profile-duo-tool-chip-value">' + stats.streakCount + '</span>' +
          '</button>' +
          '<button type="button" class="profile-duo-tool-chip profile-duo-tool-chip--calc" onclick="openScoreCalculator(event)">' +
            '<span class="profile-duo-tool-chip-icon" aria-hidden="true">' +
              '<span class="material-symbols-outlined">calculate</span>' +
            '</span>' +
            '<span class="profile-duo-tool-chip-label">Calculator</span>' +
          '</button>' +
          '<button type="button" class="profile-duo-tool-chip profile-duo-tool-chip--grades" onclick="DashboardNav.openGradeEvolution()">' +
            '<span class="profile-duo-tool-chip-icon" aria-hidden="true">' +
              '<span class="material-symbols-outlined">query_stats</span>' +
            '</span>' +
            '<span class="profile-duo-tool-chip-label">Grades</span>' +
          '</button>' +
          '<button type="button" class="profile-duo-tool-chip profile-duo-tool-chip--dict" onclick="DashboardNav.openMobileDictionaries()">' +
            '<span class="profile-duo-tool-chip-icon" aria-hidden="true">' +
              '<span class="material-symbols-outlined">menu_book</span>' +
            '</span>' +
            '<span class="profile-duo-tool-chip-label">Dictionary</span>' +
          '</button>' +
        '</div>' +
        '<div class="profile-duo-side-card profile-duo-mobile-quicklinks">' +
          '<div class="sw-duo-header">' +
            '<span class="sw-duo-title">Quick links</span>' +
          '</div>' +
          this._buildProfileQuickLinksHtml(hidePlans) +
        '</div>' +
        '<div class="profile-duo-side-hero-wrap profile-duo-mobile-tip">' +
          '<img src="Assets/images/asomado.svg" alt="" class="profile-duo-side-illust" aria-hidden="true">' +
          '<div class="sidebar-widget-duo profile-duo-side-card profile-duo-side-card--hero">' +
            '<p class="profile-duo-side-hero-text">Keep practising every day to grow your streak and track your Cambridge scores.</p>' +
          '</div>' +
        '</div>' +
      '</section>';
    },

    _buildProfileAchievementCard: function (opts) {
      var pct = opts.total > 0 ? Math.min(100, Math.round((opts.current / opts.total) * 100)) : 0;
      return '<article class="profile-duo-achievement' + (opts.done ? ' profile-duo-achievement--done' : '') + '">' +
        '<div class="profile-duo-achievement-icon" style="background:' + opts.iconBg + '">' +
          '<span class="material-symbols-outlined" aria-hidden="true">' + opts.icon + '</span>' +
        '</div>' +
        '<div class="profile-duo-achievement-body">' +
          '<div class="profile-duo-achievement-name">' + this._escapeHtml(opts.title) + '</div>' +
          '<div class="profile-duo-achievement-desc">' + this._escapeHtml(opts.desc) + '</div>' +
          '<div class="profile-duo-achievement-progress">' +
            '<div class="profile-duo-progress-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
              '<div class="profile-duo-progress-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="profile-duo-progress-label">' + opts.current + '/' + opts.total + '</span>' +
          '</div>' +
        '</div>' +
      '</article>';
    },

    _buildProfileRightSidebarHtml: function (hidePlans) {
      var html = '';
      if (typeof MainNav !== 'undefined' && MainNav.buildStatsBarHtml) {
        html += MainNav.buildStatsBarHtml();
      }

      html += '<div class="profile-duo-sidebar-widgets">' +
        '<div class="profile-duo-side-hero-wrap">' +
          '<img src="Assets/images/asomado.svg" alt="" class="profile-duo-side-illust" aria-hidden="true">' +
          '<div class="sidebar-widget-duo profile-duo-side-card profile-duo-side-card--hero">' +
            '<p class="profile-duo-side-hero-text">Keep practising every day to grow your streak and track your Cambridge scores.</p>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-widget-duo profile-duo-side-card">' +
          '<div class="sw-duo-header">' +
            '<span class="sw-duo-title">Quick links</span>' +
          '</div>' +
          this._buildProfileQuickLinksHtml(hidePlans) +
        '</div>' +
      '</div>';

      return html;
    },

    // ── Full Profile Section (rendered inside main-content) ────────────
    renderProfileSection: function () {
      if (typeof AppState !== 'undefined' && !AppState.isAuthenticated) {
        if (typeof Auth !== 'undefined' && Auth.navigateTo) {
          Auth.navigateTo('/login');
        }
        return;
      }

      var content = document.getElementById('main-content');
      if (!content) return;

      if (typeof AppState !== 'undefined') AppState.currentView = 'profile';
      if (typeof Landing !== 'undefined') Landing.hide();
      var app = document.getElementById('app');
      if (app) app.style.display = '';

      var user = Auth.getUser();
      var profile = this._profile || {};
      var isGuest = AppState.isGuest;
      var stats = this._getProfileStats();

      var name = profile.full_name || (user && (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))) || (user && user.email) || 'Guest';
      var email = profile.email || (user && user.email) || '';
      var avatarUrl = profile.avatar_url || (user && user.user_metadata && user.user_metadata.avatar_url) || '';
      var initials = name.split(' ').filter(function (w) { return w; }).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
      var joinDate = this._formatJoinDate(profile.created_at || (user && user.created_at));

      var hidePlans = typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI();
      var isPremium = AppState.isPremium;
      var hasTheoryPack = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasTheoryPack()
        : AppState.hasTheoryPack;
      var hasExamsPack = typeof AccessControl !== 'undefined'
        ? AccessControl.effectiveHasExamsPack()
        : AppState.hasExamsPack;

      var avatarHtml = avatarUrl
        ? '<img class="profile-duo-avatar-img" src="' + this._escapeHtml(avatarUrl) + '" alt="">'
        : '<span class="profile-duo-avatar-initials" aria-hidden="true">' + this._escapeHtml(initials) + '</span>';

      var badgeHtml = '';
      if (!hidePlans) {
        badgeHtml += isPremium
          ? '<span class="profile-duo-badge profile-duo-badge--premium">Premium</span>'
          : '<span class="profile-duo-badge profile-duo-badge--free">Free plan</span>';
      } else {
        badgeHtml += '<span class="profile-duo-badge profile-duo-badge--member">EngagEd member</span>';
      }
      if (!isGuest && AppState.isAdmin) {
        badgeHtml += '<span class="profile-duo-badge profile-duo-badge--admin">Administrator</span>';
      }

      var promoBanner = '';
      if (!hidePlans && !isPremium && !isGuest) {
        promoBanner =
          '<div class="profile-duo-promo">' +
            '<div class="profile-duo-promo-copy">' +
              '<strong>Unlock Theory + Exams!</strong>' +
              '<p>Get full access to all course blocks and Cambridge tests.</p>' +
            '</div>' +
            '<button type="button" class="profile-duo-promo-btn" onclick="UserProfile.renderPremiumSection()">VIEW PLANS</button>' +
            '<img src="Assets/images/asomado.svg" alt="" class="profile-duo-promo-illust" aria-hidden="true">' +
          '</div>';
      }

      var streakLabel = stats.streakCount === 1 ? 'day streak' : 'days streak';
      var statsGrid =
        '<section class="profile-duo-stats" aria-labelledby="profile-duo-stats-title">' +
          '<h2 id="profile-duo-stats-title" class="profile-duo-section-title">Statistics</h2>' +
          '<div class="profile-duo-stats-grid">' +
            this._buildProfileStatCard('local_fire_department', 'streak', stats.streakCount, streakLabel, {
              onclick: 'DashboardNav.openStreakSection()',
              ariaLabel: 'View streak calendar, ' + stats.streakCount + ' ' + streakLabel
            }) +
            this._buildProfileStatCard('bolt', 'level', stats.level, stats.availableCount + ' tests') +
            this._buildProfileStatCard('shield', 'done', stats.completedParts, stats.inProgressParts + ' in progress') +
            this._buildProfileStatCard('emoji_events', 'score', stats.avgScale !== null ? stats.avgScale : '–', 'avg scale', {
              onclick: 'openScoreCalculator(event)',
              ariaLabel: 'Open score calculator'
            }) +
          '</div>' +
        '</section>';

      var mobileToolsHtml = this._buildProfileMobileToolsHtml(hidePlans, stats);

      var streakMilestone = this._nextStreakMilestone(stats.streakCount);
      var achievements =
        this._buildProfileAchievementCard({
          title: 'Theory Pack',
          desc: hasTheoryPack ? 'All grammar and vocabulary blocks unlocked' : 'Unlock all theory blocks',
          icon: 'menu_book',
          iconBg: '#1cb0f6',
          current: hasTheoryPack ? 1 : 0,
          total: 1,
          done: hasTheoryPack
        }) +
        this._buildProfileAchievementCard({
          title: 'Exams Pack',
          desc: hasExamsPack ? 'All exams and practice modes unlocked' : 'Unlock exams, writing and speaking',
          icon: 'assignment',
          iconBg: '#f47417',
          current: hasExamsPack ? 1 : 0,
          total: 1,
          done: hasExamsPack
        }) +
        this._buildProfileAchievementCard({
          title: 'Streak milestone',
          desc: 'Reach ' + streakMilestone + ' days in a row',
          icon: 'local_fire_department',
          iconBg: '#f47417',
          current: stats.streakCount,
          total: streakMilestone,
          done: stats.streakCount >= streakMilestone
        }) +
        this._buildProfileAchievementCard({
          title: 'Test parts',
          desc: 'Complete exam parts at ' + stats.level,
          icon: 'emoji_events',
          iconBg: '#ffc800',
          current: stats.completedParts,
          total: Math.max(stats.totalParts, 1),
          done: stats.totalParts > 0 && stats.completedParts >= stats.totalParts
        });

      var signOutBtn = isGuest
        ? '<button type="button" class="profile-duo-signin-btn" onclick="Auth._showAuthModal()">Sign in</button>'
        : '<button type="button" class="profile-duo-signout-btn" onclick="Auth.signOut()">Sign out</button>';

      var profileCenterHtml =
        '<div class="profile-duo-page">' +
          '<header class="profile-duo-header">' +
            '<div class="profile-duo-header-main">' +
              '<h1 class="profile-duo-name">' + this._escapeHtml(name) + '</h1>' +
              (email ? '<p class="profile-duo-handle">' + this._escapeHtml(email) + '</p>' : '') +
              (joinDate ? '<p class="profile-duo-joined">' + this._escapeHtml(joinDate) + '</p>' : '') +
              '<div class="profile-duo-badges">' + badgeHtml + '</div>' +
              '<div class="profile-duo-header-actions">' + signOutBtn + '</div>' +
            '</div>' +
            '<div class="profile-duo-header-side">' +
              '<div class="profile-duo-avatar">' + avatarHtml + '</div>' +
              '<div class="profile-duo-level-pills">' +
                '<span class="profile-duo-level-pill profile-duo-level-pill--' + stats.level.toLowerCase() + '">' + stats.level + '</span>' +
              '</div>' +
            '</div>' +
          '</header>' +
          promoBanner +
          statsGrid +
          mobileToolsHtml +
          '<section class="profile-duo-achievements" aria-labelledby="profile-duo-achievements-title">' +
            '<div class="profile-duo-section-header">' +
              '<h2 id="profile-duo-achievements-title" class="profile-duo-section-title">Progress</h2>' +
            '</div>' +
            '<div class="profile-duo-achievements-list">' + achievements + '</div>' +
          '</section>' +
        '</div>';

      var level = AppState.currentLevel || 'C1';
      var exams = window.EXAMS_DATA[level] || [];
      var leftSidebarContent = '';
      if (typeof DashboardNav !== 'undefined' && DashboardNav._buildDashboardSidebars) {
        leftSidebarContent = DashboardNav._buildDashboardSidebars(exams, { includeGradeTracker: false, includeNextLesson: false }).left;
      } else if (typeof MainNav !== 'undefined') {
        leftSidebarContent = MainNav.buildSidebarHtml('profile');
      }

      var rightSidebarContent = this._buildProfileRightSidebarHtml(hidePlans);
      var mobileTopBarHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileTopBarHtml
        ? MainNav.buildMobileTopBarHtml() : '';
      var mobileNavHtml = typeof MainNav !== 'undefined' && MainNav.buildMobileBottomNavHtml
        ? MainNav.buildMobileBottomNavHtml('profile') : '';

      content.innerHTML =
        '<div class="dashboard-layout dashboard-layout--profile">' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('left', 'dashboardLeftSidebarShell', 'dashboardLeftSidebar', leftSidebarContent)
            : '<div class="dashboard-left-sidebar">' + leftSidebarContent + '</div>') +
          '<div class="dashboard-center dashboard-center--profile">' +
            mobileTopBarHtml +
            profileCenterHtml +
            mobileNavHtml +
          '</div>' +
          (typeof Dashboard !== 'undefined' && Dashboard._renderSidebarShell
            ? Dashboard._renderSidebarShell('right', 'dashboardRightSidebarShell', 'dashboardRightSidebar', rightSidebarContent)
            : '<div class="dashboard-right-sidebar" id="dashboardRightSidebar">' + rightSidebarContent + '</div>') +
        '</div>';

      if (typeof Dashboard !== 'undefined' && Dashboard._applySidebarState) Dashboard._applySidebarState();
      if (typeof Dashboard !== 'undefined' && Dashboard._initStatsPopovers) Dashboard._initStatsPopovers();
      if (typeof MainNav !== 'undefined' && MainNav.setActive) MainNav.setActive('profile');
      if (typeof AppLoadingScreen !== 'undefined') AppLoadingScreen.hide();

      var profState = { view: 'profile' };
      history.pushState(profState, '', Router.stateToPath(profState));
    },

    _showPaymentComingSoon: function () {
      alert('Payment integration coming soon. Contact us at academiaohara@gmail.com');
    },

    /**
     * CTA for each pack from AppState (hasTheoryPack / hasExamsPack only — no SKU for “Complete bundle” vs two packs).
     * Premium (both): Complete → current plan; Theory & Exams → included in that access tier.
     * Single pack: that pack → current plan; Complete → upgrade path.
     */
    _resolvePremiumPackCta: function (packKey) {
      var hasTheory = !!AppState.hasTheoryPack;
      var hasExams = !!AppState.hasExamsPack;
      var isPremium = hasTheory && hasExams;
      var buyAttrs = 'type="button" onclick="UserProfile._showPaymentComingSoon()"';
      if (packKey === 'theory') {
        if (!hasTheory) {
          return { btnClass: 'premium-plan-btn primary', btnAttrs: buyAttrs, labelHtml: 'Get Pack' };
        }
        if (isPremium) {
          return { btnClass: 'premium-plan-btn plan-included', btnAttrs: 'type="button" disabled', labelHtml: 'Included' };
        }
        return {
          btnClass: 'premium-plan-btn current-plan',
          btnAttrs: 'type="button" disabled',
          labelHtml: '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Current Plan'
        };
      }
      if (packKey === 'exams') {
        if (!hasExams) {
          return { btnClass: 'premium-plan-btn primary', btnAttrs: buyAttrs, labelHtml: 'Get Pack' };
        }
        if (isPremium) {
          return { btnClass: 'premium-plan-btn plan-included', btnAttrs: 'type="button" disabled', labelHtml: 'Included' };
        }
        return {
          btnClass: 'premium-plan-btn current-plan',
          btnAttrs: 'type="button" disabled',
          labelHtml: '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Current Plan'
        };
      }
      if (packKey === 'complete') {
        if (isPremium) {
          return {
            btnClass: 'premium-plan-btn current-plan',
            btnAttrs: 'type="button" disabled',
            labelHtml: '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Current Plan'
          };
        }
        if (!hasTheory && !hasExams) {
          return { btnClass: 'premium-plan-btn primary', btnAttrs: buyAttrs, labelHtml: 'Get Pack' };
        }
        return { btnClass: 'premium-plan-btn primary', btnAttrs: buyAttrs, labelHtml: 'Upgrade' };
      }
      return { btnClass: 'premium-plan-btn primary', btnAttrs: buyAttrs, labelHtml: 'Get Pack' };
    },

    _renderPremiumPackCards: function (durationKey) {
      var hasTheory = !!AppState.hasTheoryPack;
      var hasExams = !!AppState.hasExamsPack;
      var isPremium = hasTheory && hasExams;
      var plans = {
        theory: {
          name: 'Pack Theory',
          tagline: 'Unlock all Grammar & Vocabulary theory blocks',
          className: '',
          features: ['All theory blocks', 'Course navigation unlocked', 'All units and reviews'],
          owned: hasTheory,
          prices: {
            m1: { total: 4, monthly: '€4', totalLabel: '€4 total' },
            m3: { total: 10, monthly: '€3,33', totalLabel: '€10 total • Save 17%' },
            m6: { total: 18, monthly: '€3', totalLabel: '€18 total • Save 25%' },
            y1: { total: 32, monthly: '€2,67', totalLabel: '€32 total • Save 33%' }
          }
        },
        exams: {
          name: 'Pack Exams',
          tagline: 'Unlock all exams, Random Test, Writing and Speaking',
          className: '',
          features: ['All exams unlocked', 'Random Test unlocked', 'Unlimited Writing/Speaking'],
          owned: hasExams,
          prices: {
            m1: { total: 6, monthly: '€6', totalLabel: '€6 total' },
            m3: { total: 15, monthly: '€5', totalLabel: '€15 total • Save 17%' },
            m6: { total: 27, monthly: '€4,50', totalLabel: '€27 total • Save 25%' },
            y1: { total: 50, monthly: '€4,17', totalLabel: '€50 total • Save 31%' }
          }
        },
        complete: {
          name: 'Pack Complete',
          tagline: 'Everything included',
          className: 'pack-recommended',
          features: ['All theory blocks', 'All exams + Random Test', 'Unlimited Writing/Speaking'],
          owned: isPremium,
          prices: {
            m1: { total: 10, monthly: '€10', totalLabel: '€10 total' },
            m3: { total: 25, monthly: '€8,33', totalLabel: '€25 total • Save 17%' },
            m6: { total: 45, monthly: '€7,50', totalLabel: '€45 total • Save 25%' },
            y1: { total: 80, monthly: '€6,67', totalLabel: '€80 total • Save 33%' }
          }
        }
      };
      var order = ['theory', 'exams', 'complete'];
      var html = '';
      order.forEach(function (key) {
        var plan = plans[key];
        var pricing = plan.prices[durationKey] || plan.prices.m1;
        var cta = UserProfile._resolvePremiumPackCta(key);
        var cardClass = 'premium-pack-card ' + plan.className + (plan.owned ? ' pack-owned' : '');
        html += '<div class="' + cardClass.trim() + '">' +
          (plan.className ? '<div class="premium-pack-badge" role="presentation">Recommended</div>' : '') +
          '<div class="premium-pack-card-inner">' +
          '<div class="premium-pack-icon" aria-hidden="true"></div>' +
          '<div class="premium-pack-name">' + plan.name + '</div>' +
          '<div class="premium-pack-tagline">' + plan.tagline + '</div>' +
          '<div class="premium-pack-price-big">' + pricing.monthly + '</div>' +
          '<div class="premium-pack-price-period">/ month</div>' +
          '<div class="premium-pack-price-total">' + pricing.totalLabel + '</div>' +
          '<ul class="premium-pack-features">' +
            plan.features.map(function (f) { return '<li><i class="fas fa-check" aria-hidden="true"></i> ' + f + '</li>'; }).join('') +
          '</ul>' +
          '</div>' +
          '<button class="' + cta.btnClass + '" ' + cta.btnAttrs + '>' + cta.labelHtml + '</button>' +
        '</div>';
      });
      return html;
    },

    // ── Premium Plans Section (rendered inside main-content) ───────────
    renderPremiumSection: function () {
      if (typeof AccessControl !== 'undefined' && AccessControl.shouldHidePlansUI()) {
        this.renderProfileSection();
        return;
      }

      var content = document.getElementById('main-content');
      if (!content) return;

      var durationOptions = [
        { key: 'm1', label: '1 month', badge: '' },
        { key: 'm3', label: '3 months', badge: 'Save 17%' },
        { key: 'm6', label: '6 months', badge: 'Save 25%' },
        { key: 'y1', label: '1 year', badge: 'Save 33%' }
      ];
      var selectedDuration = 'm1';

      var html = '<div class="premium-plans-section">' +
        '<div class="profile-section-header premium-plans-page-header">' +
          '<button class="btn-back" onclick="loadDashboard()" aria-label="Back"><i class="fas fa-arrow-left" aria-hidden="true"></i><span class="icon-btn-label">Back</span></button>' +
          '<div class="premium-plans-header-titles">' +
            '<h2><span class="material-symbols-outlined premium-plans-header-icon" aria-hidden="true">workspace_premium</span> Choose your Pack</h2>' +
            '<p class="premium-plans-header-desc">Select duration and unlock exactly what you need</p>' +
          '</div>' +
        '</div>' +
        '<div class="premium-duration-selector" id="premium-duration-selector">' +
          durationOptions.map(function (opt) {
            return '<button type="button" class="premium-duration-btn' + (opt.key === selectedDuration ? ' active' : '') + '" data-duration="' + opt.key + '">' +
              '<span class="premium-duration-btn-label">' + opt.label + '</span>' +
              (opt.badge ? '<span class="premium-duration-badge">' + opt.badge + '</span>' : '') +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="premium-packs-grid" id="premium-packs-grid">' + this._renderPremiumPackCards(selectedDuration) + '</div>' +
      '</div>';

      content.innerHTML = html;
      var premState = { view: 'premium' };
      history.pushState(premState, '', Router.stateToPath(premState));

      var selector = document.getElementById('premium-duration-selector');
      var packsGrid = document.getElementById('premium-packs-grid');
      if (selector && packsGrid) {
        selector.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('.premium-duration-btn') : null;
          if (!btn) return;
          selectedDuration = btn.getAttribute('data-duration') || 'm1';
          selector.querySelectorAll('.premium-duration-btn').forEach(function (el) {
            el.classList.toggle('active', el === btn);
          });
          packsGrid.innerHTML = UserProfile._renderPremiumPackCards(selectedDuration);
        });
      }
    }
  };
})();
