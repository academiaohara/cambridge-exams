// js/user-profile.js
// User profile panel — reads/writes public.profiles in Supabase
(function () {
  'use strict';

  window.UserProfile = {
    _profile: null,
    _panelOpen: false,

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
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '',
          avatar_url: (user.user_metadata && user.user_metadata.avatar_url) || '',
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
      panel.innerHTML =
        '<div class="profile-panel-header">' +
          '<div class="profile-avatar-large">' +
          (avatarUrl
            ? '<img src="' + avatarUrl + '" alt="' + name + '">'
            : '<span class="profile-initials-large">' + initials + '</span>') +
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
    }
  };
})();
