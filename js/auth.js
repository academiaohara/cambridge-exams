// js/auth.js
// Authentication module — Google OAuth via Supabase
(function () {
  'use strict';

  window.Auth = {
    _client: null,
    _session: null,
    _authDismissible: false,

    initClient: function () {
      if (!window.supabase) {
        console.warn('[Auth] Supabase JS library not loaded');
        return;
      }
      if (!window.SUPABASE_CONFIG || !SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.ANON_KEY) {
        console.warn('[Auth] SUPABASE_CONFIG missing — authentication disabled');
        return;
      }
      this._client = window.supabase.createClient(
        SUPABASE_CONFIG.URL,
        SUPABASE_CONFIG.ANON_KEY
      );
    },

    init: async function () {
      if (!this._client) { this.initClient(); }
      if (!this._client) {
        this._showAuthScreen({ dismissible: false });
        return;
      }

      const { data } = await this._client.auth.getSession();
      if (data && data.session) {
        this._session = data.session;
        this._persistToken(data.session.access_token);
        await this._onSignIn(data.session.user);
      } else {
        this._showAuthScreen({ dismissible: false });
      }

      this._client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this._session = session;
          this._persistToken(session.access_token);
          await this._onSignIn(session.user);
          this._hideAuthScreen();
        } else if (event === 'SIGNED_OUT') {
          this._session = null;
          this._clearToken();
          this._onSignOut();
          this._showAuthScreen({ dismissible: false });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          this._session = session;
          this._persistToken(session.access_token);
        }
      });
    },

    signInWithGoogle: async function () {
      if (!this._client) { return; }
      this._setAuthLoading(true);
      const { error } = await this._client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) {
        console.error('[Auth] signInWithGoogle error:', error.message);
        this._setAuthLoading(false);
        this._showAuthError(error.message);
      }
    },

    continueAsGuest: function () {
      AppState.isGuest = true;
      AppState.isAuthenticated = false;
      AppState.isAdmin = false;
      AppState.hasTheoryPack = false;
      AppState.hasExamsPack = false;
      AppState.isPremium = false;
      AppState.currentUser = null;
      this._hideAuthScreen();
      this.renderSignInButton();
      this._afterAuthEntry();
    },

    signOut: async function () {
      if (AppState.isGuest) {
        AppState.isGuest = false;
        AppState.isAuthenticated = false;
        AppState.isAdmin = false;
        AppState.hasTheoryPack = false;
        AppState.hasExamsPack = false;
        AppState.isPremium = false;
        AppState.currentUser = null;
        this._finishSignOutUI();
        return;
      }
      if (!this._client) {
        this._session = null;
        this._clearToken();
        this._finishSignOutUI();
        return;
      }

      this._session = null;
      this._clearToken();

      try {
        const { error } = await this._client.auth.signOut({ scope: 'local' });
        if (error) { console.error('[Auth] signOut (local) error:', error.message); }
      } catch (e) {
        console.error('[Auth] signOut (local) error:', e);
      }

      this._finishSignOutUI();

      this._client.auth.signOut().catch(function (err) {
        console.error('[Auth] signOut (global) error:', err && err.message ? err.message : err);
      });
    },

    getSession: function () {
      return this._session;
    },

    getUser: function () {
      return this._session ? this._session.user : null;
    },

    getToken: function () {
      return localStorage.getItem('sb_access_token');
    },

    closeAuthScreen: function () {
      if (!this._authDismissible) return;
      this._hideAuthScreen();
    },

    _persistToken: function (token) {
      try { localStorage.setItem('sb_access_token', token); } catch (e) { /* quota */ }
    },

    _clearToken: function () {
      try { localStorage.removeItem('sb_access_token'); } catch (e) { /* ignore */ }
    },

    _onSignIn: async function (user) {
      AppState.currentUser = user;
      AppState.isAuthenticated = true;
      AppState.isGuest = false;

      this._removeSignInButton();

      var isNewUser = false;
      if (typeof UserProfile !== 'undefined') {
        isNewUser = await UserProfile.loadOrCreate(user);
      }

      if (isNewUser && typeof Onboarding !== 'undefined') {
        Onboarding.markPendingForNewUser();
      }

      if (typeof SyncManager !== 'undefined') {
        await SyncManager.restoreFromCloud();
      }
      if (typeof StreakManager !== 'undefined') {
        await StreakManager.restoreFromCloud();
      }
      if (typeof CrosswordSync !== 'undefined') {
        CrosswordSync.migrateFromLegacy();
        await CrosswordSync.restoreFromCloud();
      }
      if (typeof App !== 'undefined' && App.restoreExamStatuses) {
        App.restoreExamStatuses();
      }
      if (typeof SyncManager !== 'undefined') {
        SyncManager.start();
      }

      this._renderUserWidget(user);

      if (typeof AccessControl !== 'undefined') {
        AccessControl.refreshPromoQuotas();
      }

      this._afterAuthEntry();
    },

    _afterAuthEntry: function () {
      if (typeof Onboarding !== 'undefined') {
        Onboarding.maybeShowAfterAuth();
      } else if (typeof Dashboard !== 'undefined') {
        Dashboard.render();
      }
    },

    _onSignOut: function () {
      AppState.currentUser = null;
      AppState.isAuthenticated = false;
      AppState.isGuest = false;
      AppState.isAdmin = false;
      AppState.hasTheoryPack = false;
      AppState.hasExamsPack = false;
      AppState.isPremium = false;

      if (typeof SyncManager !== 'undefined') { SyncManager.stop(); }
      if (typeof UserProfile !== 'undefined') {
        UserProfile._profile = null;
        UserProfile.closePanel();
      }

      this._removeUserWidget();
    },

    _finishSignOutUI: function () {
      this._onSignOut();
      this._showAuthScreen({ dismissible: false });
      this.renderSignInButton();
      if (typeof loadDashboard === 'function') {
        loadDashboard();
      } else if (typeof Dashboard !== 'undefined') {
        Dashboard.render();
      }
    },

    _showAuthScreen: function (options) {
      options = options || {};
      this._authDismissible = !!options.dismissible;

      const screen = document.getElementById('auth-screen');
      const closeBtn = document.getElementById('auth-close-btn');
      if (!screen) return;

      if (closeBtn) {
        closeBtn.style.visibility = this._authDismissible ? 'visible' : 'hidden';
      }

      screen.style.display = 'flex';
      screen.classList.add('visible');
      document.body.classList.add('auth-screen-open');
    },

    _hideAuthScreen: function () {
      const screen = document.getElementById('auth-screen');
      if (!screen) return;

      screen.classList.remove('visible');
      screen.classList.add('hiding');
      setTimeout(function () {
        screen.style.display = 'none';
        screen.classList.remove('hiding');
        document.body.classList.remove('auth-screen-open');
      }, 250);
    },

    // Backward-compatible alias used across the codebase
    _showAuthModal: function () {
      this._showAuthScreen({ dismissible: true });
    },

    _hideAuthModal: function () {
      this._hideAuthScreen();
    },

    _setAuthLoading: function (loading) {
      const btn = document.getElementById('auth-google-btn');
      const loader = document.getElementById('auth-loader');
      if (btn) { btn.disabled = loading; btn.style.opacity = loading ? '0.6' : '1'; }
      if (loader) { loader.style.display = loading ? 'flex' : 'none'; }
    },

    _showAuthError: function (message) {
      const el = document.getElementById('auth-error-msg');
      if (el) { el.textContent = message; el.style.display = 'block'; }
    },

    _renderUserWidget: function (user) {
      this._removeUserWidget();
      this._removeSignInButton();
      const navGroup = document.getElementById('headerNavGroup');
      if (!navGroup) { return; }

      const avatarUrl = (user.user_metadata && user.user_metadata.avatar_url) || '';
      const name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email || 'User';
      const initials = name.split(' ').filter(function (w) { return w; }).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();

      const widget = document.createElement('div');
      widget.id = 'user-widget';
      widget.className = 'user-widget';
      widget.setAttribute('title', name);
      widget.onclick = function () {
        if (typeof UserProfile !== 'undefined') { UserProfile.renderProfileSection(); }
      };

      var widgetAvatarHtml = avatarUrl
        ? '<img src="' + avatarUrl + '" alt="' + name + '">'
        : '<span class="user-avatar-initials">' + initials + '</span>';

      widget.innerHTML =
        '<div class="user-avatar">' +
        widgetAvatarHtml +
        '</div>' +
        '<span class="user-name">' + name.split(' ')[0] + '</span>';

      navGroup.appendChild(widget);
    },

    _removeUserWidget: function () {
      const existing = document.getElementById('user-widget');
      if (existing) { existing.remove(); }
    },

    renderSignInButton: function () {
      this._removeSignInButton();
      if (AppState.isAuthenticated) { return; }
      const navGroup = document.getElementById('headerNavGroup');
      if (!navGroup) { return; }

      var btn = document.createElement('button');
      btn.id = 'header-signin-btn';
      btn.className = 'header-signin-btn';
      btn.onclick = function () { Auth._showAuthScreen({ dismissible: true }); };
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>' + 'Sign in' + '</span>';
      navGroup.appendChild(btn);
    },

    _removeSignInButton: function () {
      var existing = document.getElementById('header-signin-btn');
      if (existing) { existing.remove(); }
    }
  };
})();
