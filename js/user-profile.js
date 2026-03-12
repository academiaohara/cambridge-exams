// js/user-profile.js
// User profile panel — reads/writes public.profiles in Supabase
(function () {
  'use strict';

  window.UserProfile = {
    _profile: null,
    _panelOpen: false,

    // ── Animal avatar list ──
    ANIMAL_AVATARS: [
      'Aguila.png', 'Camaleon.png', 'Delfín.png', 'Elefante.png', 'Gato.png',
      'Koala.png', 'Lechuza.png', 'Leon.png', 'Lobo.png', 'Loro.png',
      'Mono.png', 'OsoPolar.png', 'Zorro.png', 'perro.png', 'rinoceronte.png'
    ],

    getRandomAnimalAvatar: function () {
      if (this.ANIMAL_AVATARS.length === 0) return null;
      return this.ANIMAL_AVATARS[Math.floor(Math.random() * this.ANIMAL_AVATARS.length)];
    },

    // ── load or create profile ────────────────────────────────────────
    loadOrCreate: async function (user) {
      const client = Auth._client;
      if (!client || !user) { return; }

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Row not found — create profile
        const animalAvatar = this.getRandomAnimalAvatar();
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '',
          avatar_url: (user.user_metadata && user.user_metadata.avatar_url) || '',
          animal_avatar: animalAvatar,
          preferred_level: AppState.currentLevel || 'C1',
          preferred_mode: AppState.currentMode || 'practice',
          preferred_language: AppState.currentLanguage || 'es'
        };
        const { data: created } = await client
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        this._profile = created || newProfile;
      } else if (!error && data) {
        this._profile = data;
        // Sync preferences to local state
        this._applyPreferences(data);
      }
    },

    _applyPreferences: function (profile) {
      if (profile.preferred_level) {
        AppState.currentLevel = profile.preferred_level;
        try { localStorage.setItem('preferred_level', profile.preferred_level); } catch (e) {}
      }
      if (profile.preferred_mode) {
        AppState.currentMode = profile.preferred_mode;
        try { localStorage.setItem('preferred_mode', profile.preferred_mode); } catch (e) {}
      }
      if (profile.preferred_language) {
        AppState.currentLanguage = profile.preferred_language;
        try { localStorage.setItem('preferred_language', profile.preferred_language); } catch (e) {}
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
        this._applyPreferences(data);
        this._refreshPanelValues();
      }
      return { data, error };
    },

    // ── panel toggle ──────────────────────────────────────────────────
    togglePanel: function () {
      if (this._panelOpen) { this.closePanel(); } else { this.openPanel(); }
    },

    openPanel: function () {
      this._renderPanel();
      const panel = document.getElementById('user-profile-panel');
      if (panel) {
        panel.style.display = 'flex';
        requestAnimationFrame(function () { panel.classList.add('visible'); });
        this._panelOpen = true;
      }

      // Close on outside click
      var self = this;
      setTimeout(function () {
        document.addEventListener('click', self._outsideClickHandler.bind(self), { once: true });
      }, 10);
    },

    closePanel: function () {
      const panel = document.getElementById('user-profile-panel');
      if (panel) {
        panel.classList.remove('visible');
        setTimeout(function () { panel.style.display = 'none'; }, 250);
      }
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

      var levels = ['A2', 'B1', 'B2', 'C1', 'C2'];
      var languages = [
        { code: 'es', label: 'Español' }, { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' },
        { code: 'it', label: 'Italiano' }, { code: 'pt', label: 'Português' }
      ];
      var modes = [
        { value: 'practice', label: 'Practice' },
        { value: 'exam', label: 'Exam' }
      ];

      function levelOptions(current) {
        return levels.map(function (l) {
          return '<option value="' + l + '"' + (l === current ? ' selected' : '') + '>' + l + '</option>';
        }).join('');
      }
      function langOptions(current) {
        return languages.map(function (l) {
          return '<option value="' + l.code + '"' + (l.code === current ? ' selected' : '') + '>' + l.label + '</option>';
        }).join('');
      }
      function modeOptions(current) {
        return modes.map(function (m) {
          return '<option value="' + m.value + '"' + (m.value === current ? ' selected' : '') + '>' + m.label + '</option>';
        }).join('');
      }

      var panel = document.createElement('div');
      panel.id = 'user-profile-panel';
      panel.className = 'user-profile-panel';

      var animalAvatar = profile.animal_avatar;
      var panelAvatarHtml = animalAvatar
        ? '<img src="Assets/images/Animals/' + animalAvatar + '" alt="' + name + '" class="animal-avatar-circle">'
        : avatarUrl
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
          '<div class="pref-row">' +
            '<label>Language</label>' +
            '<select id="pref-language" onchange="UserProfile._onPrefChange()">' + langOptions(profile.preferred_language || AppState.currentLanguage) + '</select>' +
          '</div>' +
          '<div class="pref-row">' +
            '<label>Mode</label>' +
            '<select id="pref-mode" onchange="UserProfile._onPrefChange()">' + modeOptions(profile.preferred_mode || AppState.currentMode) + '</select>' +
          '</div>' +
        '</div>' +
        '<div class="profile-sync-status" id="profile-sync-status"></div>' +
        '<button class="premium-plan-btn primary" style="margin:8px 20px;width:calc(100% - 40px)" onclick="UserProfile.closePanel(); UserProfile.renderProfileSection()">' +
          '<i class="fas fa-user-circle"></i> View Full Profile' +
        '</button>' +
        '<button class="premium-plan-btn outline" style="margin:4px 20px;width:calc(100% - 40px)" onclick="UserProfile.closePanel(); UserProfile.renderPremiumSection()">' +
          '<i class="fas fa-crown"></i> View Plans' +
        '</button>' +
        '<button class="profile-signout-btn" onclick="Auth.signOut()">' +
          '<i class="fas fa-sign-out-alt"></i> Sign out' +
        '</button>';

      document.body.appendChild(panel);
    },

    _refreshPanelValues: function () {
      var profile = this._profile || {};
      var lvl = document.getElementById('pref-level');
      var lang = document.getElementById('pref-language');
      var mode = document.getElementById('pref-mode');
      if (lvl) { lvl.value = profile.preferred_level || AppState.currentLevel; }
      if (lang) { lang.value = profile.preferred_language || AppState.currentLanguage; }
      if (mode) { mode.value = profile.preferred_mode || AppState.currentMode; }
    },

    _onPrefChange: async function () {
      var level = document.getElementById('pref-level');
      var lang = document.getElementById('pref-language');
      var mode = document.getElementById('pref-mode');
      var updates = {
        preferred_level: level ? level.value : AppState.currentLevel,
        preferred_language: lang ? lang.value : AppState.currentLanguage,
        preferred_mode: mode ? mode.value : AppState.currentMode
      };
      var statusEl = document.getElementById('profile-sync-status');
      if (statusEl) { statusEl.textContent = 'Saving…'; statusEl.className = 'profile-sync-status syncing'; }
      var result = await this.updateProfile(updates);
      if (statusEl) {
        if (!result || result.error) {
          statusEl.textContent = '⚠ Could not save';
          statusEl.className = 'profile-sync-status error';
        } else {
          statusEl.textContent = '✓ Saved';
          statusEl.className = 'profile-sync-status saved';
          setTimeout(function () { if (statusEl) { statusEl.textContent = ''; statusEl.className = 'profile-sync-status'; } }, 2000);
        }
      }
    },

    // ── Select animal avatar ──────────────────────────────────────────
    _selectAnimalAvatar: async function (filename) {
      // Update locally
      if (this._profile) {
        this._profile.animal_avatar = filename;
      }
      // Update in Supabase
      await this.updateProfile({ animal_avatar: filename });
      // Re-render profile section to show selection
      this.renderProfileSection();
    },

    // ── Full Profile Section (rendered inside main-content) ────────────
    renderProfileSection: function () {
      var content = document.getElementById('main-content');
      if (!content) return;

      var t = function (key, fb) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fb; };
      var user = Auth.getUser();
      var profile = this._profile || {};
      var isGuest = AppState.isGuest;

      var name = profile.full_name || (user && (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))) || (user && user.email) || t('guest', 'Guest');
      var email = profile.email || (user && user.email) || '';
      var avatarUrl = profile.avatar_url || (user && user.user_metadata && user.user_metadata.avatar_url) || '';
      var initials = name.split(' ').filter(function (w) { return w; }).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();

      var isPremium = AppState.isPremium;
      var subBadge = isPremium
        ? '<div class="profile-section-sub-badge premium"><i class="fas fa-crown"></i> Premium</div>'
        : '<div class="profile-section-sub-badge free"><i class="fas fa-user"></i> ' + t('freePlan', 'Free Plan') + '</div>';

      var animalAvatar = profile.animal_avatar;
      var avatarHtml = animalAvatar
        ? '<img src="Assets/images/Animals/' + animalAvatar + '" alt="' + name + '" class="animal-avatar-circle">'
        : avatarUrl
          ? '<img src="' + avatarUrl + '" alt="' + name + '">'
          : '<span class="profile-initials-large">' + initials + '</span>';

      // Build animal avatar selection grid
      var animalGrid = '';
      this.ANIMAL_AVATARS.forEach(function (img) {
        var selected = (img === animalAvatar) ? ' animal-avatar-selected' : '';
        var label = img.replace('.png', '').replace('.jpg', '');
        animalGrid += '<div class="animal-avatar-option' + selected + '" onclick="UserProfile._selectAnimalAvatar(\'' + img + '\')" title="' + label + '">' +
          '<img src="Assets/images/Animals/' + img + '" alt="' + label + '">' +
        '</div>';
      });

      var levels = ['A2', 'B1', 'B2', 'C1', 'C2'];
      var languages = [
        { code: 'es', label: 'Español' }, { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' },
        { code: 'it', label: 'Italiano' }, { code: 'pt', label: 'Português' }
      ];

      function levelOptions(current) {
        return levels.map(function (l) {
          return '<option value="' + l + '"' + (l === current ? ' selected' : '') + '>' + l + '</option>';
        }).join('');
      }
      function langOptions(current) {
        return languages.map(function (l) {
          return '<option value="' + l.code + '"' + (l.code === current ? ' selected' : '') + '>' + l.label + '</option>';
        }).join('');
      }

      var html = '<div class="profile-section">' +
        '<div class="profile-section-header">' +
          '<button class="btn-back" onclick="loadDashboard()"><i class="fas fa-arrow-left"></i> ' + t('back', 'Back') + '</button>' +
          '<h2>' + t('myProfile', 'My Profile') + '</h2>' +
        '</div>' +

        '<div class="profile-section-card">' +
          '<div class="profile-section-avatar-row">' +
            '<div class="profile-section-avatar">' + avatarHtml + '</div>' +
            '<div class="profile-section-info">' +
              '<div class="profile-name">' + name + '</div>' +
              '<div class="profile-email">' + email + '</div>' +
              subBadge +
            '</div>' +
          '</div>' +
          (isGuest
            ? '<button class="premium-plan-btn primary" style="max-width:220px" onclick="Auth._showAuthModal()"><i class="fas fa-sign-in-alt"></i> ' + t('signIn', 'Sign in') + '</button>'
            : '') +
        '</div>' +

        '<div class="profile-section-card">' +
          '<h3>🐾 ' + t('profilePicture', 'Profile Picture') + '</h3>' +
          '<p style="color:var(--text-medium);font-size:0.88rem;margin:0 0 14px">' +
            t('chooseAnimal', 'Choose your animal avatar') +
          '</p>' +
          '<div class="animal-avatar-grid">' +
            animalGrid +
          '</div>' +
        '</div>' +

        '<div class="profile-section-card">' +
          '<h3>⚙️ ' + t('preferences', 'Preferences') + '</h3>' +
          '<div class="profile-prefs">' +
            '<div class="pref-row"><label>' + t('level', 'Level') + '</label>' +
              '<select id="pref-level" onchange="UserProfile._onPrefChange()">' + levelOptions(profile.preferred_level || AppState.currentLevel) + '</select></div>' +
            '<div class="pref-row"><label>' + t('language', 'Language') + '</label>' +
              '<select id="pref-language" onchange="UserProfile._onPrefChange()">' + langOptions(profile.preferred_language || AppState.currentLanguage) + '</select></div>' +
          '</div>' +
        '</div>' +

        '<div class="profile-section-card">' +
          '<h3>👑 ' + t('subscription', 'Subscription') + '</h3>' +
          '<p style="color:var(--text-medium);font-size:0.88rem;margin:0 0 14px">' +
            (isPremium
              ? t('premiumActive', 'You have an active Premium subscription with full access to all features.')
              : t('freeDesc', 'You are on the free plan. Upgrade to unlock all exams and AI features.')) +
          '</p>' +
          '<button class="premium-plan-btn ' + (isPremium ? 'current-plan' : 'primary') + '" onclick="' + (isPremium ? '' : 'UserProfile.renderPremiumSection()') + '">' +
            (isPremium ? '✓ ' + t('currentPlan', 'Current Plan') + ': Premium' : '<i class="fas fa-crown"></i> ' + t('viewPlans', 'View Plans')) +
          '</button>' +
        '</div>' +

        (!isGuest
          ? '<div class="profile-section-card" style="text-align:center;">' +
              '<button class="profile-signout-btn" onclick="Auth.signOut()"><i class="fas fa-sign-out-alt"></i> ' + t('signOut', 'Sign out') + '</button>' +
            '</div>'
          : '') +

      '</div>';

      content.innerHTML = html;
      history.pushState({ view: 'profile' }, '');
    },

    // ── Premium Plans Section (rendered inside main-content) ───────────
    renderPremiumSection: function () {
      var content = document.getElementById('main-content');
      if (!content) return;

      var t = function (key, fb) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fb; };
      var isPremium = AppState.isPremium;

      var html = '<div class="premium-plans-section">' +
        '<div class="profile-section-header">' +
          '<button class="btn-back" onclick="loadDashboard()"><i class="fas fa-arrow-left"></i> ' + t('back', 'Back') + '</button>' +
        '</div>' +

        '<div class="premium-plans-header">' +
          '<h2>👑 ' + t('choosePlan', 'Choose your Plan') + '</h2>' +
          '<p>' + t('premiumSubtitle', 'Unlock the full Cambridge Exams experience') + '</p>' +
        '</div>' +

        '<div class="premium-plans-grid">' +

          '<div class="premium-plan-card' + (!isPremium ? ' current' : '') + '">' +
            (!isPremium ? '<div class="premium-plan-badge">' + t('currentPlan', 'Current Plan') + '</div>' : '') +
            '<div class="premium-plan-icon">📚</div>' +
            '<div class="premium-plan-name">' + t('freePlan', 'Free') + '</div>' +
            '<div class="premium-plan-price">€0 <span>/ ' + t('month', 'month') + '</span></div>' +
            '<ul class="premium-plan-features">' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature1', 'Access to first exam') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature2', 'Reading & Listening exercises') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature3', 'Score calculator') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature4', 'Micro-learning mode') + '</li>' +
            '</ul>' +
            '<button class="premium-plan-btn ' + (!isPremium ? 'current-plan' : 'outline') + '">' + (!isPremium ? '✓ ' + t('currentPlan', 'Current Plan') : t('freePlan', 'Free')) + '</button>' +
          '</div>' +

          '<div class="premium-plan-card' + (isPremium ? ' current' : ' recommended') + '">' +
            (isPremium
              ? '<div class="premium-plan-badge">' + t('currentPlan', 'Current Plan') + '</div>'
              : '<div class="premium-plan-badge">' + t('recommended', 'Recommended') + '</div>') +
            '<div class="premium-plan-icon">👑</div>' +
            '<div class="premium-plan-name">Premium</div>' +
            '<div class="premium-plan-price">€9.99 <span>/ ' + t('month', 'month') + '</span></div>' +
            '<ul class="premium-plan-features">' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature1', 'All exams unlocked') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature2', 'AI writing evaluation') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature3', 'Speaking exercises') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature4', 'Progress sync across devices') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature5', 'Detailed grade analytics') + '</li>' +
            '</ul>' +
            '<button class="premium-plan-btn ' + (isPremium ? 'current-plan' : 'primary') + '">' + (isPremium ? '✓ ' + t('currentPlan', 'Current Plan') : t('getPremium', 'Get Premium')) + '</button>' +
          '</div>' +

        '</div>' +
      '</div>';

      content.innerHTML = html;
      history.pushState({ view: 'premium' }, '');
    }
  };
})();
