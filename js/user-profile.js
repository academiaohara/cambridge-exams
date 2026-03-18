// js/user-profile.js
// User profile panel — reads/writes public.profiles in Supabase
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
        // Cache animal avatar in localStorage
        if (this._profile && this._profile.animal_avatar) {
          try { localStorage.setItem('cambridge_animal_avatar', this._profile.animal_avatar); } catch (e) { /* ignore */ }
        }
      } else if (!error && data) {
        this._profile = data;
        // Cache animal avatar in localStorage
        if (data.animal_avatar) {
          try { localStorage.setItem('cambridge_animal_avatar', data.animal_avatar); } catch (e) { /* ignore */ }
        }
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

      var t = function (key, fb) { return (typeof I18n !== 'undefined') ? I18n.t(key) : fb; };
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
          t('chooseAnimal', 'Choose your profile photo') +
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

      // Always use Google profile photo for user display
      var avatarHtml = avatarUrl
        ? '<img src="' + avatarUrl + '" alt="' + name + '">'
        : '<span class="profile-initials-large">' + initials + '</span>';

      var levels = ['A2', 'B1', 'B2', 'C1', 'C2'];

      function levelOptions(current) {
        return levels.map(function (l) {
          return '<option value="' + l + '"' + (l === current ? ' selected' : '') + '>' + l + '</option>';
        }).join('');
      }

      var html = '<div class="profile-section">' +
        '<div class="profile-section-header">' +
          '<button class="btn-back" onclick="loadDashboard()"><i class="fas fa-arrow-left"></i> ' + t('back', 'Back') + '</button>' +
          '<h2>' + t('myProfile', 'My Profile') + '</h2>' +
        '</div>' +

        '<div class="profile-section-card">' +
          '<div class="profile-section-avatar-row">' +
            '<div class="profile-section-avatar">' + avatarHtml +
            '</div>' +
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
          '<h3><span class="material-symbols-outlined">settings</span> ' + t('preferences', 'Preferences') + '</h3>' +
          '<div class="profile-prefs">' +
            '<div class="pref-row"><label>' + t('level', 'Level') + '</label>' +
              '<select id="pref-level" onchange="UserProfile._onPrefChange()">' + levelOptions(profile.preferred_level || AppState.currentLevel) + '</select></div>' +
          '</div>' +
        '</div>' +

        '<div class="profile-section-card">' +
          '<h3><span class="material-symbols-outlined">workspace_premium</span> ' + t('subscription', 'Subscription') + '</h3>' +
          '<p style="color:var(--text-medium);font-size:0.88rem;margin:0 0 14px">' +
            (isPremium
              ? t('premiumActive', 'You have an active Premium subscription with full access to all features.')
              : t('freeDesc', 'You are on the free plan. Upgrade to unlock all exams and AI features.')) +
          '</p>' +
          '<button class="premium-plan-btn ' + (isPremium ? 'current-plan' : 'primary') + '" onclick="' + (isPremium ? '' : 'UserProfile.renderPremiumSection()') + '">' +
            (isPremium ? '<span class="material-symbols-outlined">check_circle</span> ' + t('currentPlan', 'Current Plan') + ': Premium' : '<i class="fas fa-crown"></i> ' + t('viewPlans', 'View Plans')) +
          '</button>' +
        '</div>' +

        (!isGuest
          ? '<div class="profile-section-card" style="text-align:center;">' +
              '<button class="profile-signout-btn" onclick="Auth.signOut()"><i class="fas fa-sign-out-alt"></i> ' + t('signOut', 'Sign out') + '</button>' +
            '</div>'
          : '') +

      '</div>';

      content.innerHTML = html;
      var profState = { view: 'profile' };
      history.pushState(profState, '', Router.stateToPath(profState));
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
          '<h2><span class="material-symbols-outlined">workspace_premium</span> ' + t('choosePlan', 'Choose your Plan') + '</h2>' +
          '<p>' + t('premiumSubtitle', 'Unlock the full Cambridge Exams experience') + '</p>' +
        '</div>' +

        '<div class="premium-plans-grid">' +

          '<div class="premium-plan-card' + (!isPremium ? ' current' : '') + '">' +
            (!isPremium ? '<div class="premium-plan-badge">' + t('currentPlan', 'Current Plan') + '</div>' : '') +
            '<div class="premium-plan-icon"><span class="material-symbols-outlined">auto_stories</span></div>' +
            '<div class="premium-plan-name">' + t('freePlan', 'Free') + '</div>' +
            '<div class="premium-plan-price">€0 <span>/ ' + t('month', 'month') + '</span></div>' +
            '<ul class="premium-plan-features">' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature1', 'Access to first exam') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature2', 'Reading & Listening exercises') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature3', 'Score calculator') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('freeFeature4', 'Micro-learning mode') + '</li>' +
            '</ul>' +
            '<button class="premium-plan-btn ' + (!isPremium ? 'current-plan' : 'outline') + '">' + (!isPremium ? '<span class="material-symbols-outlined">check_circle</span> ' + t('currentPlan', 'Current Plan') : t('freePlan', 'Free')) + '</button>' +
          '</div>' +

          '<div class="premium-plan-card' + (isPremium ? ' current' : ' recommended') + '">' +
            (isPremium
              ? '<div class="premium-plan-badge">' + t('currentPlan', 'Current Plan') + '</div>'
              : '<div class="premium-plan-badge">' + t('recommended', 'Recommended') + '</div>') +
            '<div class="premium-plan-icon"><span class="material-symbols-outlined">workspace_premium</span></div>' +
            '<div class="premium-plan-name">Premium</div>' +
            '<div class="premium-plan-price">€9.99 <span>/ ' + t('month', 'month') + '</span></div>' +
            '<ul class="premium-plan-features">' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature1', 'All exams unlocked') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature2', 'AI writing evaluation') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature3', 'Speaking exercises') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature4', 'Progress sync across devices') + '</li>' +
              '<li><i class="fas fa-check"></i> ' + t('premFeature5', 'Detailed grade analytics') + '</li>' +
            '</ul>' +
            '<button class="premium-plan-btn ' + (isPremium ? 'current-plan' : 'primary') + '">' + (isPremium ? '<span class="material-symbols-outlined">check_circle</span> ' + t('currentPlan', 'Current Plan') : t('getPremium', 'Get Premium')) + '</button>' +
          '</div>' +

        '</div>' +
      '</div>';

      content.innerHTML = html;
      var premState = { view: 'premium' };
      history.pushState(premState, '', Router.stateToPath(premState));
    }
  };
})();
