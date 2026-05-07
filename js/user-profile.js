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
        // Cache animal avatar in localStorage
        if (this._profile && this._profile.animal_avatar) {
          try { localStorage.setItem('cambridge_animal_avatar', this._profile.animal_avatar); } catch (e) { /* ignore */ }
        }
      } else if (!error && data) {
        this._profile = data;
        this._syncAccessFromProfile(data);
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

    // ── Full Profile Section (rendered inside main-content) ────────────
    renderProfileSection: function () {
      var content = document.getElementById('main-content');
      if (!content) return;

      var user = Auth.getUser();
      var profile = this._profile || {};
      var isGuest = AppState.isGuest;

      var name = profile.full_name || (user && (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))) || (user && user.email) || 'Guest';
      var email = profile.email || (user && user.email) || '';
      var avatarUrl = profile.avatar_url || (user && user.user_metadata && user.user_metadata.avatar_url) || '';
      var initials = name.split(' ').filter(function (w) { return w; }).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();

      var isPremium = AppState.isPremium;
      var hasTheoryPack = AppState.hasTheoryPack;
      var hasExamsPack = AppState.hasExamsPack;
      var subBadge = isPremium
        ? '<div class="profile-section-sub-badge premium"><i class="fas fa-crown"></i> Premium</div>'
        : '<div class="profile-section-sub-badge free"><i class="fas fa-user"></i> ' + 'Free Plan' + '</div>';
      var packBadges = '';
      if (!isGuest) {
        if (AppState.isAdmin) {
          packBadges += '<span class="profile-pack-badge admin"><i class="fas fa-shield-alt"></i> Admin</span>';
        }
        if (hasTheoryPack) {
          packBadges += '<span class="profile-pack-badge theory"><i class="fas fa-book-open"></i> Pack Theory</span>';
        }
        if (hasExamsPack) {
          packBadges += '<span class="profile-pack-badge exams"><i class="fas fa-file-alt"></i> Pack Exams</span>';
        }
        if (!packBadges) {
          packBadges = '<span class="profile-pack-badge free"><i class="fas fa-leaf"></i> Free</span>';
        }
      }

      // Always use Google profile photo for user display
      var avatarHtml = avatarUrl
        ? '<img src="' + avatarUrl + '" alt="' + name + '">'
        : '<span class="profile-initials-large">' + initials + '</span>';

      var levels = ['B1', 'B2', 'C1'];

      function levelOptions(current) {
        return levels.map(function (l) {
          return '<option value="' + l + '"' + (l === current ? ' selected' : '') + '>' + l + '</option>';
        }).join('');
      }

      var html = '<div class="profile-section">' +
        '<div class="profile-section-header">' +
          '<button class="btn-back" onclick="loadDashboard()"><i class="fas fa-arrow-left"></i> ' + 'Back' + '</button>' +
          '<h2>' + 'My Profile' + '</h2>' +
        '</div>' +

        '<div class="profile-section-card">' +
          '<div class="profile-section-avatar-row">' +
            '<div class="profile-section-avatar">' + avatarHtml +
            '</div>' +
            '<div class="profile-section-info">' +
              '<div class="profile-name">' + name + '</div>' +
              '<div class="profile-email">' + email + '</div>' +
              subBadge +
              (packBadges ? '<div class="profile-pack-badges">' + packBadges + '</div>' : '') +
            '</div>' +
          '</div>' +
          (isGuest
            ? '<button class="premium-plan-btn primary" style="max-width:220px" onclick="Auth._showAuthModal()"><i class="fas fa-sign-in-alt"></i> ' + 'Sign in' + '</button>'
            : '') +
        '</div>' +

        '<div class="profile-section-card">' +
          '<h3><span class="material-symbols-outlined">settings</span> ' + 'Preferences' + '</h3>' +
          '<div class="profile-prefs">' +
            '<div class="pref-row"><label>' + 'Level' + '</label>' +
              '<select id="pref-level" onchange="UserProfile._onPrefChange()">' + levelOptions(profile.preferred_level || AppState.currentLevel) + '</select></div>' +
          '</div>' +
        '</div>' +

        '<div class="profile-section-card">' +
          '<h3><span class="material-symbols-outlined">workspace_premium</span> ' + 'Subscription' + '</h3>' +
          '<p style="color:var(--text-medium);font-size:0.88rem;margin:0 0 14px">' +
            (isPremium
              ? 'You have active Theory + Exams access.'
              : 'You are on the free plan. Upgrade to unlock all exams and theory blocks.') +
          '</p>' +
          '<button class="premium-plan-btn ' + (isPremium ? 'current-plan' : 'primary') + '" onclick="' + (isPremium ? '' : 'UserProfile.renderPremiumSection()') + '">' +
            (isPremium ? '<span class="material-symbols-outlined">check_circle</span> ' + 'Current Plan' + ': Premium' : '<i class="fas fa-crown"></i> ' + 'View Plans') +
          '</button>' +
        '</div>' +

        (!isGuest
          ? '<div class="profile-section-card" style="text-align:center;">' +
              '<button class="profile-signout-btn" onclick="Auth.signOut()"><i class="fas fa-sign-out-alt"></i> ' + 'Sign out' + '</button>' +
            '</div>'
          : '') +

      '</div>';

      content.innerHTML = html;
      var profState = { view: 'profile' };
      history.pushState(profState, '', Router.stateToPath(profState));
    },

    _showPaymentComingSoon: function () {
      alert('Payment integration coming soon. Contact us at academiaohara@gmail.com');
    },

    _renderPremiumPackCards: function (durationKey) {
      var plans = {
        theory: {
          icon: '📘',
          name: 'Pack Theory',
          tagline: 'Unlock all Grammar & Vocabulary theory blocks',
          className: '',
          features: ['All theory blocks', 'Course navigation unlocked', 'All units and reviews'],
          owned: !!AppState.hasTheoryPack,
          prices: {
            m1: { total: 4, monthly: '€4', totalLabel: '€4 total' },
            m3: { total: 10, monthly: '€3,33', totalLabel: '€10 total • Save 17%' },
            m6: { total: 18, monthly: '€3', totalLabel: '€18 total • Save 25%' },
            y1: { total: 32, monthly: '€2,67', totalLabel: '€32 total • Save 33%' }
          }
        },
        exams: {
          icon: '📝',
          name: 'Pack Exams',
          tagline: 'Unlock all exams, Random Test, Writing and Speaking',
          className: '',
          features: ['All exams unlocked', 'Random Test unlocked', 'Unlimited Writing/Speaking'],
          owned: !!AppState.hasExamsPack,
          prices: {
            m1: { total: 6, monthly: '€6', totalLabel: '€6 total' },
            m3: { total: 15, monthly: '€5', totalLabel: '€15 total • Save 17%' },
            m6: { total: 27, monthly: '€4,50', totalLabel: '€27 total • Save 25%' },
            y1: { total: 50, monthly: '€4,17', totalLabel: '€50 total • Save 31%' }
          }
        },
        complete: {
          icon: '👑',
          name: 'Pack Complete',
          tagline: 'Everything included',
          className: 'pack-recommended',
          features: ['All theory blocks', 'All exams + Random Test', 'Unlimited Writing/Speaking'],
          owned: !!(AppState.hasTheoryPack && AppState.hasExamsPack),
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
        var cardClass = 'premium-pack-card ' + plan.className + (plan.owned ? ' pack-owned' : '');
        html += '<div class="' + cardClass.trim() + '">' +
          (plan.className ? '<div class="premium-pack-badge">Recommended</div>' : '') +
          '<div class="premium-pack-icon">' + plan.icon + '</div>' +
          '<div class="premium-pack-name">' + plan.name + '</div>' +
          '<div class="premium-pack-tagline">' + plan.tagline + '</div>' +
          '<div class="premium-pack-price-big">' + pricing.monthly + '</div>' +
          '<div class="premium-pack-price-period">/ month</div>' +
          '<div class="premium-pack-price-total">' + pricing.totalLabel + '</div>' +
          '<ul class="premium-pack-features">' +
            plan.features.map(function (f) { return '<li><i class="fas fa-check"></i> ' + f + '</li>'; }).join('') +
          '</ul>' +
          '<button class="premium-plan-btn ' + (plan.owned ? 'current-plan' : 'primary') + '" ' + (plan.owned ? 'disabled' : 'onclick="UserProfile._showPaymentComingSoon()"') + '>' +
            (plan.owned ? '<span class="material-symbols-outlined">check_circle</span> Current Plan' : 'Get Pack') +
          '</button>' +
        '</div>';
      });
      return html;
    },

    // ── Premium Plans Section (rendered inside main-content) ───────────
    renderPremiumSection: function () {
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
        '<div class="profile-section-header">' +
          '<button class="btn-back" onclick="loadDashboard()"><i class="fas fa-arrow-left"></i> ' + 'Back' + '</button>' +
        '</div>' +
        '<div class="premium-plans-header">' +
          '<h2><span class="material-symbols-outlined">workspace_premium</span> Choose your Pack</h2>' +
          '<p>Select duration and unlock exactly what you need</p>' +
        '</div>' +
        '<div class="premium-duration-selector" id="premium-duration-selector">' +
          durationOptions.map(function (opt) {
            return '<button class="premium-duration-btn' + (opt.key === selectedDuration ? ' active' : '') + '" data-duration="' + opt.key + '">' +
              opt.label +
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
