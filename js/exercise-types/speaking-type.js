// js/exercise-types/speaking-type.js
// Speaking task display - Cambridge C1 Speaking Parts
// Video-call & chat modes with speech-to-text and text-to-speech

(function() {
  // ── SVG avatar helpers (simple line-art faces) ──
  var AVATARS = {
    examiner: '<svg viewBox="0 0 80 80" class="speaking-avatar-svg"><circle cx="40" cy="30" r="16" fill="#e0e7ff" stroke="#6366f1" stroke-width="2"/><circle cx="34" cy="28" r="1.8" fill="#6366f1"/><circle cx="46" cy="28" r="1.8" fill="#6366f1"/><path d="M35 35 Q40 39 45 35" stroke="#6366f1" stroke-width="1.5" fill="none" stroke-linecap="round"/><rect x="18" y="50" width="44" height="24" rx="12" fill="#6366f1"/><path d="M32 20 Q28 10 22 14" stroke="#6366f1" stroke-width="2" fill="none"/><path d="M48 20 Q52 10 58 14" stroke="#6366f1" stroke-width="2" fill="none"/></svg>',
    candidate: '<svg viewBox="0 0 80 80" class="speaking-avatar-svg"><circle cx="40" cy="30" r="16" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/><circle cx="34" cy="28" r="1.8" fill="#22c55e"/><circle cx="46" cy="28" r="1.8" fill="#22c55e"/><path d="M34 35 Q40 40 46 35" stroke="#22c55e" stroke-width="1.5" fill="none" stroke-linecap="round"/><rect x="18" y="50" width="44" height="24" rx="12" fill="#22c55e"/></svg>',
    partner: '<svg viewBox="0 0 80 80" class="speaking-avatar-svg"><circle cx="40" cy="30" r="16" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><circle cx="34" cy="28" r="1.8" fill="#f59e0b"/><circle cx="46" cy="28" r="1.8" fill="#f59e0b"/><path d="M35 35 Q40 39 45 35" stroke="#f59e0b" stroke-width="1.5" fill="none" stroke-linecap="round"/><rect x="18" y="50" width="44" height="24" rx="12" fill="#f59e0b"/><path d="M28 18 Q40 6 52 18" stroke="#f59e0b" stroke-width="2" fill="none"/></svg>'
  };

  var ROLE_COLORS = { examiner: '#6366f1', candidate: '#22c55e', partner: '#f59e0b' };

  function t(key, fb) { return (typeof I18n !== 'undefined') ? I18n.t(key) : (fb || key); }

  function roleName(role) {
    if (role === 'examiner') return t('examiner', 'Examiner');
    if (role === 'candidate') return t('you', 'You');
    if (role === 'partner') return t('partnerName', 'Partner');
    return role;
  }

  window.SpeakingType = {
    _viewMode: 'videocall',  // 'videocall' | 'chat'
    _scriptIndex: 0,
    _script: [],
    _participants: [],
    _messages: [],           // {role, text}
    _recognition: null,
    _isRecording: false,
    _conversationStarted: false,
    _conversationEnded: false,
    _activeSpeaker: null,
    _synthesis: window.speechSynthesis || null,

    // ── Public API ──

    initListeners: function() {
      var exercise = AppState.currentExercise;
      if (!exercise) return;

      var container = document.getElementById('selectable-text');
      if (!container) return;

      var content = exercise.content || {};
      this._script = content.script || [];
      this._participants = content.participants || ['examiner', 'candidate'];
      this._scriptIndex = 0;
      this._messages = [];
      this._conversationStarted = false;
      this._conversationEnded = false;
      this._activeSpeaker = null;
      this._isRecording = false;
      this._viewMode = 'videocall';

      var task = content.task || content.questions?.[0]?.task || '';
      var images = content.questions?.[0]?.images || [];
      var options = content.options || [];

      var imagesHTML = images.map(function(src) { return '<img class="speaking-type-image" src="' + src + '" alt="">'; }).join('');
      var optionsHTML = options.length
        ? '<ul class="speaking-type-options">' + options.map(function(o) { return '<li>' + o + '</li>'; }).join('') + '</ul>'
        : '';

      var html =
        '<div class="speaking-type-wrapper">' +
          '<div class="speaking-type-task">' +
            '<h3><i class="fas fa-comments"></i> ' + (exercise.title || t('startSpeaking', 'Speaking')) + '</h3>' +
            '<p class="speaking-type-task-text">' + task + '</p>' +
            optionsHTML +
            (imagesHTML ? '<div class="speaking-type-images">' + imagesHTML + '</div>' : '') +
          '</div>' +
          this._buildModeToggle() +
          '<div id="speaking-simulation">' +
            this._buildVideoCallView() +
          '</div>' +
        '</div>';

      var noteCreator = container.querySelector('#note-creator');
      var wrapper = document.createElement('div');
      wrapper.className = 'speaking-type-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      var checkBtn = document.querySelector('.btn-check');
      var explBtn = document.querySelector('.btn-explanations');
      if (checkBtn) checkBtn.style.display = 'none';
      if (explBtn) explBtn.style.display = 'none';

      this._bindEvents();
    },

    checkAnswers: function() { return 0; },

    // ── Mode toggle ──

    _buildModeToggle: function() {
      return '<div class="speaking-mode-toggle">' +
        '<button class="speaking-toggle-btn active" data-mode="videocall"><i class="fas fa-video"></i> ' + t('videoCallMode', 'Video Call') + '</button>' +
        '<button class="speaking-toggle-btn" data-mode="chat"><i class="fas fa-comments"></i> ' + t('chatMode', 'Chat') + '</button>' +
      '</div>';
    },

    _switchMode: function(mode) {
      this._viewMode = mode;
      document.querySelectorAll('.speaking-toggle-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
      });
      var sim = document.getElementById('speaking-simulation');
      if (!sim) return;
      if (mode === 'videocall') {
        sim.innerHTML = this._buildVideoCallView();
      } else {
        sim.innerHTML = this._buildChatView();
      }
      this._bindSimulationEvents();
      this._updateView();
    },

    // ── Video-call view ──

    _buildVideoCallView: function() {
      var self = this;
      var tiles = this._participants.map(function(role) {
        return '<div class="speaking-vc-tile" data-role="' + role + '">' +
          '<div class="speaking-vc-avatar">' + AVATARS[role] + '</div>' +
          '<div class="speaking-vc-name">' + roleName(role) + '</div>' +
          '<div class="speaking-vc-indicator"></div>' +
        '</div>';
      }).join('');

      return '<div class="speaking-videocall">' +
        '<div class="speaking-vc-grid" data-count="' + this._participants.length + '">' +
          tiles +
        '</div>' +
        '<div class="speaking-vc-status" id="speaking-vc-status"></div>' +
        this._buildControls() +
      '</div>';
    },

    // ── Chat view ──

    _buildChatView: function() {
      var self = this;
      var messagesHTML = this._messages.map(function(m) {
        return self._buildChatBubble(m.role, m.text);
      }).join('');

      return '<div class="speaking-chat">' +
        '<div class="speaking-chat-history" id="speaking-chat-history">' +
          (messagesHTML || '<div class="speaking-type-start-msg"><i class="fas fa-comments"></i> ' + t('conversationStarted', 'The conversation has started') + '</div>') +
        '</div>' +
        this._buildControls() +
      '</div>';
    },

    _buildChatBubble: function(role, text) {
      var align = role === 'candidate' ? 'right' : 'left';
      var color = ROLE_COLORS[role] || '#6366f1';
      return '<div class="speaking-chat-msg speaking-chat-msg--' + align + '">' +
        '<div class="speaking-chat-avatar" style="background:' + color + '">' +
          AVATARS[role] +
        '</div>' +
        '<div class="speaking-chat-content">' +
          '<span class="speaking-chat-name">' + roleName(role) + '</span>' +
          '<div class="speaking-chat-bubble speaking-chat-bubble--' + role + '">' + (text || '') + '</div>' +
        '</div>' +
      '</div>';
    },

    // ── Controls (shared) ──

    _buildControls: function() {
      if (!this._conversationStarted) {
        return '<div class="speaking-controls">' +
          '<button class="speaking-start-btn" id="speaking-start-btn"><i class="fas fa-play"></i> ' + t('startConversation', 'Start conversation') + '</button>' +
        '</div>';
      }
      if (this._conversationEnded) {
        return '<div class="speaking-controls"><div class="speaking-ended-msg"><i class="fas fa-check-circle"></i> ' + t('conversationEnded', 'The conversation has ended') + '</div></div>';
      }
      var current = this._script[this._scriptIndex];
      var isMine = current && current.role === 'candidate';
      return '<div class="speaking-controls">' +
        '<div class="speaking-input-row' + (isMine ? '' : ' speaking-input-disabled') + '">' +
          '<input type="text" class="speaking-text-input" id="speaking-text-input" placeholder="' + t('typeResponse', 'Type your response...') + '"' + (isMine ? '' : ' disabled') + '>' +
          '<button class="speaking-mic-btn" id="speaking-mic-btn"' + (isMine ? '' : ' disabled') + ' title="' + t('tapToSpeak', 'Tap to speak') + '">' +
            '<i class="fas fa-microphone"></i>' +
          '</button>' +
          '<button class="speaking-send-btn" id="speaking-send-btn"' + (isMine ? '' : ' disabled') + '>' +
            '<i class="fas fa-paper-plane"></i>' +
          '</button>' +
        '</div>' +
        (isMine ? '<div class="speaking-your-turn"><i class="fas fa-hand-point-right"></i> ' + t('yourTurn', 'Your turn') + '</div>' : '') +
        (!isMine && !this._conversationEnded ? '<div class="speaking-skip-row"><button class="speaking-skip-btn" id="speaking-skip-btn" style="display:none">' + t('skipTurn', 'Skip turn') + '</button></div>' : '') +
      '</div>';
    },

    // ── Event binding ──

    _bindEvents: function() {
      var self = this;
      document.addEventListener('click', function(e) {
        var toggleBtn = e.target.closest('.speaking-toggle-btn');
        if (toggleBtn) {
          var mode = toggleBtn.getAttribute('data-mode');
          if (mode) self._switchMode(mode);
          return;
        }
      });
      this._bindSimulationEvents();
    },

    _bindSimulationEvents: function() {
      var self = this;
      var sim = document.getElementById('speaking-simulation');
      if (!sim) return;

      var startBtn = document.getElementById('speaking-start-btn');
      if (startBtn) {
        startBtn.onclick = function() { self._startConversation(); };
      }

      var micBtn = document.getElementById('speaking-mic-btn');
      if (micBtn) {
        micBtn.onclick = function() { self._toggleRecording(); };
      }

      var sendBtn = document.getElementById('speaking-send-btn');
      if (sendBtn) {
        sendBtn.onclick = function() { self._sendTextInput(); };
      }

      var textInput = document.getElementById('speaking-text-input');
      if (textInput) {
        textInput.onkeydown = function(e) {
          if (e.key === 'Enter') { self._sendTextInput(); }
        };
      }

      var skipBtn = document.getElementById('speaking-skip-btn');
      if (skipBtn) {
        skipBtn.onclick = function() { self._skipTurn(); };
      }
    },

    // ── Conversation flow ──

    _startConversation: function() {
      this._conversationStarted = true;
      this._scriptIndex = 0;
      this._messages = [];
      this._refreshView();
      this._processCurrentTurn();
    },

    _processCurrentTurn: function() {
      var self = this;
      if (this._scriptIndex >= this._script.length) {
        this._conversationEnded = true;
        this._activeSpeaker = null;
        this._refreshView();
        return;
      }

      var turn = this._script[this._scriptIndex];
      if (turn.role === 'candidate') {
        this._activeSpeaker = 'candidate';
        this._refreshView();
        return;
      }

      // Examiner or partner: auto-play
      this._activeSpeaker = turn.role;
      this._refreshView();

      // Use text-to-speech if available
      var text = turn.text || '';
      this._messages.push({ role: turn.role, text: text });

      if (this._synthesis && text) {
        this._speakText(text, function() {
          self._scriptIndex++;
          self._processCurrentTurn();
        });
      } else {
        // Fallback: wait proportional to text length
        var delay = Math.max(1500, text.length * 40);
        setTimeout(function() {
          self._scriptIndex++;
          self._processCurrentTurn();
        }, delay);
      }

      this._refreshView();
    },

    _speakText: function(text, cb) {
      if (!this._synthesis) { if (cb) cb(); return; }
      // Cancel any ongoing speech
      this._synthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-GB';
      utter.rate = 0.95;
      utter.onend = function() { if (cb) cb(); };
      utter.onerror = function() { if (cb) cb(); };
      this._synthesis.speak(utter);
    },

    _sendTextInput: function() {
      var input = document.getElementById('speaking-text-input');
      if (!input || !input.value.trim()) return;
      var current = this._script[this._scriptIndex];
      if (!current || current.role !== 'candidate') return;

      this._messages.push({ role: 'candidate', text: input.value.trim() });
      this._scriptIndex++;
      this._refreshView();
      this._processCurrentTurn();
    },

    _skipTurn: function() {
      var current = this._script[this._scriptIndex];
      if (!current || current.role !== 'candidate') return;
      this._messages.push({ role: 'candidate', text: '...' });
      this._scriptIndex++;
      this._refreshView();
      this._processCurrentTurn();
    },

    // ── Speech-to-text ──

    _toggleRecording: function() {
      if (this._isRecording) {
        this._stopRecording();
        return;
      }
      this._startRecording();
    },

    _startRecording: function() {
      var self = this;
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        var input = document.getElementById('speaking-text-input');
        if (input) input.placeholder = t('speechNotSupported', 'Speech not supported');
        return;
      }

      this._recognition = new SpeechRecognition();
      this._recognition.lang = 'en-GB';
      this._recognition.interimResults = true;
      this._recognition.continuous = false;

      this._recognition.onresult = function(event) {
        var transcript = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        var input = document.getElementById('speaking-text-input');
        if (input) input.value = transcript;
      };

      this._recognition.onend = function() {
        self._isRecording = false;
        self._updateMicButton();
        // Auto-send if we got text
        var input = document.getElementById('speaking-text-input');
        if (input && input.value.trim()) {
          self._sendTextInput();
        }
      };

      this._recognition.onerror = function() {
        self._isRecording = false;
        self._updateMicButton();
      };

      this._recognition.start();
      this._isRecording = true;
      this._updateMicButton();
    },

    _stopRecording: function() {
      if (this._recognition) {
        this._recognition.stop();
      }
      this._isRecording = false;
      this._updateMicButton();
    },

    _updateMicButton: function() {
      var btn = document.getElementById('speaking-mic-btn');
      if (!btn) return;
      if (this._isRecording) {
        btn.classList.add('speaking-mic-recording');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
      } else {
        btn.classList.remove('speaking-mic-recording');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
      }
    },

    // ── View updates ──

    _refreshView: function() {
      var sim = document.getElementById('speaking-simulation');
      if (!sim) return;
      if (this._viewMode === 'videocall') {
        sim.innerHTML = this._buildVideoCallView();
      } else {
        sim.innerHTML = this._buildChatView();
      }
      this._bindSimulationEvents();
      this._updateView();
    },

    _updateView: function() {
      // Update video-call tiles
      var tiles = document.querySelectorAll('.speaking-vc-tile');
      var active = this._activeSpeaker;
      var participantCount = this._participants.length;
      tiles.forEach(function(tile) {
        var role = tile.getAttribute('data-role');
        if (role === active) {
          tile.classList.add('speaking-vc-tile--active');
          tile.classList.remove('speaking-vc-tile--small');
        } else if (active) {
          tile.classList.remove('speaking-vc-tile--active');
          tile.classList.add('speaking-vc-tile--small');
        } else {
          tile.classList.remove('speaking-vc-tile--active', 'speaking-vc-tile--small');
        }
        // Update indicator
        var indicator = tile.querySelector('.speaking-vc-indicator');
        if (indicator) {
          if (role === active) {
            indicator.innerHTML = '<span class="speaking-pulse"></span> ' + t('speakingNow', 'Speaking...');
            indicator.classList.add('speaking-vc-indicator--active');
          } else {
            indicator.innerHTML = '';
            indicator.classList.remove('speaking-vc-indicator--active');
          }
        }
      });

      // Update status
      var status = document.getElementById('speaking-vc-status');
      if (status) {
        var current = this._script[this._scriptIndex];
        if (this._conversationEnded) {
          status.innerHTML = '<i class="fas fa-check-circle"></i> ' + t('conversationEnded', 'Ended');
        } else if (current && current.role === 'candidate') {
          status.innerHTML = '<i class="fas fa-hand-point-right"></i> ' + t('waitingForYou', 'Waiting for your response');
          status.className = 'speaking-vc-status speaking-vc-status--yours';
        } else if (active) {
          status.innerHTML = '<i class="fas fa-volume-up"></i> ' + roleName(active) + ' — ' + t('speakingNow', 'Speaking...');
          status.className = 'speaking-vc-status';
        }
      }

      // Scroll chat to bottom
      var history = document.getElementById('speaking-chat-history');
      if (history) {
        history.scrollTop = history.scrollHeight;
      }

      // Show skip after a delay if candidate turn
      var current = this._script[this._scriptIndex];
      if (current && current.role === 'candidate') {
        var skipBtn = document.getElementById('speaking-skip-btn');
        if (skipBtn) {
          setTimeout(function() {
            if (skipBtn) skipBtn.style.display = 'inline-flex';
          }, 3000);
        }
      }
    }
  };
})();
