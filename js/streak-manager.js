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
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore */ }
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalDaysActive: 0,
        practicedToday: false
      };
    },

    _save: function() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) { /* ignore */ }
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
