// js/auth.js
// Authentication module — Google OAuth via Supabase
(function () {
  'use strict';

  window.Auth = {
    // ── internal state ──────────────────────────────────────────────
    _client: null,   // supabase JS client (set by Auth.initClient)
    _session: null,  // active supabase session

    // ── initialisation ───────────────────────────────────────────────
    /** Call once after the Supabase CDN script has loaded. */
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

    /** Verify existing session on page load and wire up real-time listener. */
    init: async function () {
      if (!this._client) { this.initClient(); }
      if (!this._client) { return; }

      // Restore session from localStorage (Supabase does this automatically)
      const { data } = await this._client.auth.getSession();
      if (data && data.session) {
        this._session = data.session;
        this._persistToken(data.session.access_token);
        await this._onSignIn(data.session.user);
      } else {
        this._showAuthModal();
      }

      // Listen for auth state changes (sign-in / sign-out / token refresh)
      this._client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this._session = session;
          this._persistToken(session.access_token);
          await this._onSignIn(session.user);
          this._hideAuthModal();
        } else if (event === 'SIGNED_OUT') {
          this._session = null;
          this._clearToken();
          this._onSignOut();
          this._showAuthModal();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          this._session = session;
          this._persistToken(session.access_token);
        }
      });
    },

    // ── public API ───────────────────────────────────────────────────
    /** Open Google OAuth popup. */
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

    /** Continue as guest without signing in. */
    continueAsGuest: function () {
      AppState.isGuest = true;
      AppState.isAuthenticated = false;
      AppState.isPremium = false;
      AppState.currentUser = null;
      this._hideAuthModal();
    },

    /** Sign out the current user (or exit guest mode). */
    signOut: async function () {
      if (AppState.isGuest) {
        AppState.isGuest = false;
        AppState.isAuthenticated = false;
        AppState.currentUser = null;
        this._removeUserWidget();
        this._showAuthModal();
        if (typeof Dashboard !== 'undefined') { Dashboard.render(); }
        return;
      }
      if (!this._client) { return; }
      const { error } = await this._client.auth.signOut();
      if (error) { console.error('[Auth] signOut error:', error.message); }
    },

    /** Return the current session, or null. */
    getSession: function () {
      return this._session;
    },

    /** Return the current user object, or null. */
    getUser: function () {
      return this._session ? this._session.user : null;
    },

    /** Return the stored JWT token from localStorage, or null. */
    getToken: function () {
      return localStorage.getItem('sb_access_token');
    },

    // ── private helpers ──────────────────────────────────────────────
    _persistToken: function (token) {
      try { localStorage.setItem('sb_access_token', token); } catch (e) { /* quota */ }
    },

    _clearToken: function () {
      try { localStorage.removeItem('sb_access_token'); } catch (e) { /* ignore */ }
    },

    _onSignIn: async function (user) {
      // Update global auth state
      AppState.currentUser = user;
      AppState.isAuthenticated = true;

      // Load/create profile in Supabase then render header widget
      if (typeof UserProfile !== 'undefined') {
        await UserProfile.loadOrCreate(user);
      }

      // Restore cloud data to localStorage before starting the sync interval
      if (typeof SyncManager !== 'undefined') {
        await SyncManager.restoreFromCloud();
      }
      if (typeof StreakManager !== 'undefined') {
        await StreakManager.restoreFromCloud();
      }

      // Refresh exam statuses from the (now-updated) localStorage
      if (typeof App !== 'undefined' && App.restoreExamStatuses) {
        App.restoreExamStatuses();
      }

      // Kick off sync manager
      if (typeof SyncManager !== 'undefined') {
        SyncManager.start();
      }

      // Render user widget in header
      this._renderUserWidget(user);
    },

    _onSignOut: function () {
      AppState.currentUser = null;
      AppState.isAuthenticated = false;

      if (typeof SyncManager !== 'undefined') { SyncManager.stop(); }
      if (typeof UserProfile !== 'undefined') { UserProfile.closePanel(); }

      this._removeUserWidget();
    },

    // ── auth modal ───────────────────────────────────────────────────
    _showAuthModal: function () {
      const overlay = document.getElementById('auth-modal-overlay');
      if (overlay) {
        overlay.classList.add('visible');
        overlay.style.display = 'flex';
      }
    },

    _hideAuthModal: function () {
      const overlay = document.getElementById('auth-modal-overlay');
      if (overlay) {
        overlay.classList.remove('visible');
        overlay.classList.add('hiding');
        setTimeout(function () {
          overlay.style.display = 'none';
          overlay.classList.remove('hiding');
        }, 300);
      }
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

    // ── header user widget ───────────────────────────────────────────
    _renderUserWidget: function (user) {
      this._removeUserWidget();
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
        if (typeof UserProfile !== 'undefined') { UserProfile.togglePanel(); }
      };

      widget.innerHTML =
        '<div class="user-avatar">' +
        (avatarUrl
          ? '<img src="' + avatarUrl + '" alt="' + name + '">'
          : '<span class="user-avatar-initials">' + initials + '</span>') +
        '</div>' +
        '<span class="user-name">' + name.split(' ')[0] + '</span>';

      navGroup.appendChild(widget);
    },

    _removeUserWidget: function () {
      const existing = document.getElementById('user-widget');
      if (existing) { existing.remove(); }
    }
  };
})();
