// js/streak-manager.js
// Daily streak tracking system

(function() {
  var STORAGE_KEY = 'cambridge_streak';

  window.StreakManager = {
    data: null,

    init: function() {
      this.data = this._load();
      this._checkAndUpdate();
    },

    _load: function() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (!Array.isArray(parsed.activeDates)) { parsed.activeDates = []; }
          return parsed;
        }
      } catch (e) { /* ignore */ }
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalDaysActive: 0,
        practicedToday: false,
        activeDates: []
      };
    },

    _save: function() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) { /* ignore */ }
      this._syncToCloud();
    },

    /** Push streak data to Supabase user_streaks table. */
    _syncToCloud: async function() {
      var client = (typeof Auth !== 'undefined') && Auth._client;
      var user = (typeof Auth !== 'undefined') && Auth.getUser();
      if (!client || !user || !this.data) { return; }
      try {
        await client
          .from('user_streaks')
          .upsert({
            user_id: user.id,
            current_streak: this.data.currentStreak || 0,
            longest_streak: this.data.longestStreak || 0,
            last_activity: this.data.lastActivityDate || null,
            total_days_active: this.data.totalDaysActive || 0,
            active_dates: this.data.activeDates || [],
            updated_at: new Date().toISOString()
          })
          .select();
      } catch (e) {
        console.warn('[StreakManager] cloud sync error:', e);
      }
    },

    /** Restore streak data from Supabase (cloud wins if ahead). */
    restoreFromCloud: async function() {
      var client = (typeof Auth !== 'undefined') && Auth._client;
      var user = (typeof Auth !== 'undefined') && Auth.getUser();
      if (!client || !user) { return; }
      try {
        var result = await client
          .from('user_streaks')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (result.error || !result.data) { return; }
        var cloud = result.data;
        var local = this.data || this._load();
        // Merge: take whichever has the longer streak / more days
        if ((cloud.current_streak || 0) > (local.currentStreak || 0) ||
            (cloud.total_days_active || 0) > (local.totalDaysActive || 0)) {
          // Merge activeDates from cloud and local
          var cloudDates = Array.isArray(cloud.active_dates) ? cloud.active_dates : [];
          var localDates = Array.isArray(local.activeDates) ? local.activeDates : [];
          var mergedSet = {};
          cloudDates.forEach(function(d) { mergedSet[d] = true; });
          localDates.forEach(function(d) { mergedSet[d] = true; });
          var mergedDates = Object.keys(mergedSet).sort();

          this.data = {
            currentStreak: cloud.current_streak || 0,
            longestStreak: Math.max(cloud.longest_streak || 0, local.longestStreak || 0),
            lastActivityDate: cloud.last_activity || local.lastActivityDate,
            totalDaysActive: Math.max(cloud.total_days_active || 0, local.totalDaysActive || 0),
            practicedToday: local.practicedToday,
            activeDates: mergedDates
          };
          this._checkAndUpdate();
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch(e) {}
        } else {
          // Local is ahead but still merge activeDates from cloud
          var cloudDates2 = Array.isArray(cloud.active_dates) ? cloud.active_dates : [];
          var localDates2 = Array.isArray(local.activeDates) ? local.activeDates : [];
          if (cloudDates2.length > 0) {
            var mergedSet2 = {};
            localDates2.forEach(function(d) { mergedSet2[d] = true; });
            cloudDates2.forEach(function(d) { mergedSet2[d] = true; });
            this.data.activeDates = Object.keys(mergedSet2).sort();
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch(e) {}
          }
        }
      } catch (e) {
        console.warn('[StreakManager] restoreFromCloud error:', e);
      }
    },

    _today: function() {
      return new Date().toISOString().slice(0, 10);
    },

    _checkAndUpdate: function() {
      var today = this._today();
      var last = this.data.lastActivityDate;

      if (!last) {
        this.data.practicedToday = false;
        this._save();
        return;
      }

      var lastDate = new Date(last);
      var todayDate = new Date(today);
      var diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        this.data.practicedToday = true;
      } else if (diffDays === 1) {
        // Yesterday — streak still valid but not practiced today yet
        this.data.practicedToday = false;
      } else {
        // Gap — reset streak
        this.data.currentStreak = 0;
        this.data.practicedToday = false;
        this._save();
      }
    },

    recordActivity: function() {
      var today = this._today();
      var last = this.data.lastActivityDate;

      if (last === today) return; // Already recorded today

      var diffDays = 1;
      if (last) {
        var lastDate = new Date(last);
        var todayDate = new Date(today);
        diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      }

      if (diffDays === 1 || !last) {
        this.data.currentStreak += 1;
      } else {
        this.data.currentStreak = 1;
      }

      if (this.data.currentStreak > this.data.longestStreak) {
        this.data.longestStreak = this.data.currentStreak;
      }

      this.data.lastActivityDate = today;
      this.data.practicedToday = true;
      this.data.totalDaysActive = (this.data.totalDaysActive || 0) + 1;

      // Track individual activity dates for calendar
      if (!Array.isArray(this.data.activeDates)) { this.data.activeDates = []; }
      if (this.data.activeDates.indexOf(today) === -1) {
        this.data.activeDates.push(today);
        // Keep only last 90 days to avoid unbounded growth
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        var cutoffStr = cutoff.toISOString().slice(0, 10);
        this.data.activeDates = this.data.activeDates.filter(function(d) { return d >= cutoffStr; });
      }

      this._save();
      this._triggerCelebration(this.data.currentStreak);
      this._refreshWidgets();
    },

    _triggerCelebration: function(streak) {
      var milestones = [5, 10, 25, 50, 100];
      if (milestones.indexOf(streak) !== -1) {
        this._showCelebration(streak);
      }
    },

    _showCelebration: function(streak) {
      var el = document.getElementById('streak-celebration');
      if (!el) return;
      el.textContent = '🎉 ' + streak + ' day streak!';
      el.classList.add('streak-celebrate-anim');
      el.style.display = 'block';
      setTimeout(function() {
        el.classList.remove('streak-celebrate-anim');
        el.style.display = 'none';
      }, 3000);
    },

    _refreshWidgets: function() {
      var widgets = document.querySelectorAll('[data-streak-widget]');
      var self = this;
      widgets.forEach(function(w) {
        w.innerHTML = self._widgetHTML();
      });
    },

    getStreak: function() {
      return this.data;
    },

    isAtRisk: function() {
      if (!this.data.lastActivityDate) return false;
      var today = this._today();
      var last = this.data.lastActivityDate;
      if (last === today) return false;
      var diffDays = Math.round(
        (new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24)
      );
      return diffDays === 1 && this.data.currentStreak > 0;
    },

    _widgetHTML: function() {
      var d = this.data;
      var streak = d.currentStreak || 0;
      var longest = d.longestStreak || 0;
      var atRisk = this.isAtRisk();
      var statusClass = d.practicedToday ? 'streak-safe' : (atRisk ? 'streak-risk' : '');
      var statusText = d.practicedToday
        ? '<span class="streak-status streak-safe">✅ Streak safe!</span>'
        : (atRisk
          ? '<span class="streak-status streak-risk">⚠️ Streak at risk!</span>'
          : '');

      return '<div class="streak-widget ' + statusClass + '">' +
        '<div class="streak-fire">🔥</div>' +
        '<div class="streak-info">' +
          '<div class="streak-count">' + streak + '</div>' +
          '<div class="streak-label">' + (streak === 1 ? 'day streak' : 'days streak') + '</div>' +
          statusText +
        '</div>' +
        '<div class="streak-best">Best: ' + longest + '</div>' +
        '<div id="streak-celebration" style="display:none;" class="streak-celebration"></div>' +
      '</div>';
    },

    renderWidget: function(containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      container.setAttribute('data-streak-widget', '1');
      container.innerHTML = this._widgetHTML();
    }
  };
})();
