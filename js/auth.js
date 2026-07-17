// js/auth.js
// Authentication module — Google OAuth + email/password via Supabase
(function () {
  'use strict';

  window.Auth = {
    _client: null,
    _session: null,
    _authDismissible: false,
    _currentMode: 'login',
    _hideTimeout: null,

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
        return;
      }

      const { data } = await this._client.auth.getSession();
      if (data && data.session) {
        this._session = data.session;
        this._persistToken(data.session.access_token);
        await this._onSignIn(data.session.user);
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
        } else if (event === 'TOKEN_REFRESHED' && session) {
          this._session = session;
          this._persistToken(session.access_token);
        }
      });
    },

    navigateTo: function (path) {
      var state = Router.pathToState(path);
      history.pushState(state, '', Router.stateToPath(state));
      if (typeof App !== 'undefined' && App.handleRoute) {
        App.handleRoute(state);
      }
    },

    showLoginPage: function () {
      this._currentMode = 'login';
      this._configureAuthUI('login');
      this._showAuthScreen({ dismissible: false });
    },

    showRegisterPage: function () {
      this._currentMode = 'register';
      this._configureAuthUI('register');
      this._showAuthScreen({ dismissible: false });
    },

    _configureAuthUI: function (mode) {
      var isLogin = mode === 'login';
      var title = document.getElementById('auth-title');
      var loginFields = document.getElementById('auth-login-fields');
      var registerFields = document.getElementById('auth-register-fields');
      var googleLabel = document.getElementById('auth-google-label');
      var headerLoginLink = document.getElementById('auth-header-login-link');
      var headerSignupLink = document.getElementById('auth-header-signup-link');

      if (title) title.textContent = isLogin ? 'Log in' : 'Create your account';
      if (loginFields) loginFields.style.display = isLogin ? '' : 'none';
      if (registerFields) registerFields.style.display = isLogin ? 'none' : '';
      if (googleLabel) googleLabel.textContent = 'GOOGLE';
      if (headerLoginLink) headerLoginLink.style.display = isLogin ? 'none' : '';
      if (headerSignupLink) headerSignupLink.style.display = isLogin ? '' : 'none';
      this._clearAuthError();
    },

    signInWithGoogle: async function () {
      if (!this._client) {
        this._showAuthError('Authentication is not configured.');
        return;
      }
      this._setAuthLoading(true, 'Redirecting to Google…');
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

    signInWithEmail: async function () {
      if (!this._client) {
        this._showAuthError('Authentication is not configured.');
        return;
      }

      var emailEl = document.getElementById('auth-email');
      var passwordEl = document.getElementById('auth-password');
      var email = emailEl ? emailEl.value.trim() : '';
      var password = passwordEl ? passwordEl.value : '';

      if (!email || !password) {
        this._showAuthError('Please enter your email and password.');
        return;
      }

      this._setAuthLoading(true, 'Logging in…');
      this._clearAuthError();

      var result = await this._client.auth.signInWithPassword({ email: email, password: password });
      this._setAuthLoading(false);

      if (result.error) {
        console.error('[Auth] signInWithEmail error:', result.error.message);
        this._showAuthError(result.error.message);
        return;
      }

      this._hideAuthScreen();
      if (typeof App !== 'undefined' && App.afterSuccessfulAuth) {
        App.afterSuccessfulAuth();
      }
    },

    signUpWithEmail: async function () {
      if (!this._client) {
        this._showAuthError('Authentication is not configured.');
        return;
      }

      var nameEl = document.getElementById('auth-name');
      var emailEl = document.getElementById('auth-register-email');
      var passwordEl = document.getElementById('auth-register-password');
      var confirmEl = document.getElementById('auth-register-password-confirm');

      var name = nameEl ? nameEl.value.trim() : '';
      var email = emailEl ? emailEl.value.trim() : '';
      var password = passwordEl ? passwordEl.value : '';
      var confirm = confirmEl ? confirmEl.value : '';

      if (!name || !email || !password) {
        this._showAuthError('Please fill in all fields.');
        return;
      }
      if (password !== confirm) {
        this._showAuthError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        this._showAuthError('Password must be at least 6 characters.');
        return;
      }

      this._setAuthLoading(true, 'Creating account…');
      this._clearAuthError();

      var result = await this._client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: name, name: name }
        }
      });
      this._setAuthLoading(false);

      if (result.error) {
        console.error('[Auth] signUpWithEmail error:', result.error.message);
        this._showAuthError(result.error.message);
        return;
      }

      if (result.data && result.data.user && !result.data.session) {
        this._showAuthError('Check your email to confirm your account, then log in.');
        return;
      }

      this._hideAuthScreen();
      if (typeof App !== 'undefined' && App.afterSuccessfulAuth) {
        App.afterSuccessfulAuth();
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
      this.navigateTo('/');
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
      if (typeof App !== 'undefined' && App.refreshProgressUI) {
        App.refreshProgressUI();
      }
      if (typeof SyncManager !== 'undefined') {
        SyncManager.start();
      }

      this._renderUserWidget(user);

      if (typeof AccessControl !== 'undefined') {
        AccessControl.refreshPromoQuotas();
      }
    },

    _afterAuthEntry: function () {
      if (typeof Onboarding !== 'undefined') {
        Onboarding.maybeShowAfterAuth();
      } else if (typeof App !== 'undefined' && App.openLearningHome) {
        App.openLearningHome();
      } else if (typeof DashboardNav !== 'undefined') {
        DashboardNav.openCourseSection('learning');
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
      this._hideAuthScreen();
      this.renderSignInButton();
      if (typeof Landing !== 'undefined') {
        Landing.render();
      }
      history.replaceState({ view: 'landing' }, '', '/');
    },

    _showAuthScreen: function (options) {
      options = options || {};
      this._authDismissible = !!options.dismissible;

      if (this._hideTimeout) {
        clearTimeout(this._hideTimeout);
        this._hideTimeout = null;
      }

      if (typeof Landing !== 'undefined') Landing.hide();

      const screen = document.getElementById('auth-screen');
      const closeBtn = document.getElementById('auth-close-btn');
      if (!screen) return;

      screen.classList.remove('hiding');

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

      if (this._hideTimeout) {
        clearTimeout(this._hideTimeout);
        this._hideTimeout = null;
      }

      screen.classList.remove('visible');
      screen.classList.add('hiding');
      var self = this;
      this._hideTimeout = setTimeout(function () {
        screen.style.display = 'none';
        screen.classList.remove('hiding');
        document.body.classList.remove('auth-screen-open');
        self._hideTimeout = null;
      }, 250);
    },

    _showAuthModal: function () {
      this.navigateTo('/login');
    },

    _hideAuthModal: function () {
      this._hideAuthScreen();
    },

    _setAuthLoading: function (loading, text) {
      const btn = document.getElementById('auth-google-btn');
      const submitBtn = document.getElementById('auth-submit-btn');
      const registerBtn = document.getElementById('auth-register-btn');
      const loader = document.getElementById('auth-loader');
      const loaderText = document.getElementById('auth-loader-text');
      if (btn) { btn.disabled = loading; btn.style.opacity = loading ? '0.6' : '1'; }
      if (submitBtn) submitBtn.disabled = loading;
      if (registerBtn) registerBtn.disabled = loading;
      if (loader) loader.style.display = loading ? 'flex' : 'none';
      if (loaderText && text) loaderText.textContent = text;
    },

    _showAuthError: function (message) {
      const el = document.getElementById('auth-error-msg');
      if (el) { el.textContent = message; el.style.display = 'block'; }
    },

    _clearAuthError: function () {
      const el = document.getElementById('auth-error-msg');
      if (el) { el.textContent = ''; el.style.display = 'none'; }
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
      btn.onclick = function () { Auth.navigateTo('/login'); };
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign in</span>';
      navGroup.appendChild(btn);
    },

    _removeSignInButton: function () {
      var existing = document.getElementById('header-signin-btn');
      if (existing) { existing.remove(); }
    }
  };
})();
