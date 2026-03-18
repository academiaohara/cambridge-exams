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

  // ── Large examiner silhouette SVG (woman with ponytail, matching reference) ──
  var EXAMINER_SILHOUETTE = '<svg viewBox="0 0 400 420" class="speaking-examiner-svg">' +
    '<ellipse cx="200" cy="370" rx="150" ry="70" fill="#1a1a2e"/>' +
    '<circle cx="200" cy="180" r="80" fill="#1a1a2e"/>' +
    '<path d="M140 160 Q130 100 160 80 Q200 50 240 80 Q270 100 260 160" fill="#1a1a2e"/>' +
    '<path d="M255 120 Q290 100 310 140 Q320 170 300 180 L260 160" fill="#1a1a2e"/>' +
    '<path d="M150 200 C120 220 100 280 90 350 Q90 380 200 400 Q310 380 310 350 C300 280 280 220 250 200" fill="#1a1a2e"/>' +
    '<path d="M155 175 Q200 210 245 175" stroke="#c4b5fd" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M140 155 Q135 120 155 105 Q180 85 200 85 Q220 85 245 105 Q265 120 260 155" stroke="#c4b5fd" stroke-width="3" fill="none"/>' +
  '</svg>';

  // ── Person icon SVG for candidate cards ──
  var CARD_PERSON_ICON = '<svg viewBox="0 0 80 80" class="speaking-card-icon"><circle cx="40" cy="28" r="14" fill="currentColor"/><ellipse cx="40" cy="64" rx="22" ry="16" fill="currentColor"/></svg>';

  // ── Profile avatar system ──
  // Images for speaking partners (Assets/images/Profiles/)
  var ANIMAL_IMAGES = [
    'Aisha.png', 'Alex.png', 'Anna.png', 'Carla.png', 'Carlos.png',
    'Daniel.png', 'Elena.png', 'Emma.png', 'Fatima.png', 'Jack.png',
    'Javier.png', 'Kenji.png', 'Lucas.png', 'Lucia.png', 'Malik.png',
    'Mateo.png', 'Pierre.png', 'Priya.png', 'Sofia.png', 'Sofía.png'
  ];

  // Images for examiners (Assets/images/Profiles/Examiner/)
  var EXAMINER_IMAGES = [
    'John.png', 'Michael.png', 'Sarah.png'
  ];

  // Gender map for voice selection: 'f' = female, 'm' = male
  var AVATAR_GENDER = {
    'Aisha.png': 'f', 'Alex.png': 'm', 'Anna.png': 'f', 'Carla.png': 'f',
    'Carlos.png': 'm', 'Daniel.png': 'm', 'Elena.png': 'f', 'Emma.png': 'f',
    'Fatima.png': 'f', 'Jack.png': 'm', 'Javier.png': 'm', 'Kenji.png': 'm',
    'Lucas.png': 'm', 'Lucia.png': 'f', 'Malik.png': 'm', 'Mateo.png': 'm',
    'Pierre.png': 'm', 'Priya.png': 'f', 'Sofia.png': 'f', 'Sofía.png': 'f',
    'John.png': 'm', 'Michael.png': 'm', 'Sarah.png': 'f'
  };

  // Cached voices for TTS
  var _cachedVoices = { male: null, female: null, loaded: false };

  function _loadVoices() {
    if (_cachedVoices.loaded) return;
    var synth = window.speechSynthesis;
    if (!synth) return;
    var voices = synth.getVoices();
    if (!voices || voices.length === 0) return;
    // Prefer en-GB voices, fallback to any en voice
    var enVoices = voices.filter(function(v) { return v.lang && v.lang.indexOf('en') === 0; });
    if (enVoices.length === 0) enVoices = voices;
    // Try to find gendered voices by name heuristics
    var female = null, male = null;
    enVoices.forEach(function(v) {
      var n = v.name.toLowerCase();
      if (!female && (/female|woman|fiona|samantha|karen|moira|tessa|victoria|kate|serena|martha|hazel/.test(n))) female = v;
      if (!male && (/\bmale\b|man\b|daniel|james|thomas|george|oliver|fred|lee|rishi|aaron/.test(n))) male = v;
    });
    // Fallback: if only one found, use different voices by index
    if (!female && !male && enVoices.length >= 2) {
      female = enVoices[0];
      male = enVoices[1];
    } else if (!female && male) {
      female = enVoices.find(function(v) { return v !== male; }) || male;
    } else if (female && !male) {
      male = enVoices.find(function(v) { return v !== female; }) || female;
    }
    _cachedVoices.male = male;
    _cachedVoices.female = female;
    _cachedVoices.loaded = true;
  }

  function _getVoiceForRole(role) {
    _loadVoices();
    var assignment = _getAssignments()[role];
    if (!assignment) return null;
    // Extract filename from path
    var filename = assignment.split('/').pop();
    var gender = AVATAR_GENDER[filename];
    if (gender === 'f') return _cachedVoices.female;
    if (gender === 'm') return _cachedVoices.male;
    return null;
  }

  // Stable avatar assignments per speaking section (role -> filename)
  // Persisted across parts so the same examiner is kept for all 4 exercises.
  // Stored on window because the IIFE re-executes when different speaking types
  // (interview, long-turn, collaborative, discussion) load the same file.
  if (!window._speakingAvatarState) {
    window._speakingAvatarState = { assignments: {}, section: null };
  }

  // Helper to always get the current assignments object
  function _getAssignments() {
    return window._speakingAvatarState.assignments;
  }

  function _assignAvatars(participants) {
    var assigns = _getAssignments();
    var usedProfiles = [];

    // Candidate always uses their Google profile photo
    var googlePhoto = null;
    var profile = (typeof UserProfile !== 'undefined') ? UserProfile._profile : null;
    if (profile && profile.avatar_url) {
      googlePhoto = profile.avatar_url;
    }
    if (!googlePhoto) {
      var user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
      if (user && user.user_metadata && user.user_metadata.avatar_url) {
        googlePhoto = user.user_metadata.avatar_url;
      }
    }
    if (googlePhoto) {
      assigns['candidate'] = googlePhoto;
    }
    // If no Google photo, candidate will use fallback silhouette (no avatar assigned)

    // Assign avatars to other participants (partners & examiners)
    var usedExaminers = [];
    participants.forEach(function(role) {
      if (role === 'candidate' || assigns[role]) return;
      if (role === 'examiner') {
        // Examiner uses images from Profiles/Examiner/
        var availEx = EXAMINER_IMAGES.filter(function(img) { return usedExaminers.indexOf(img) === -1; });
        if (availEx.length === 0) availEx = EXAMINER_IMAGES;
        var pickEx = availEx[Math.floor(Math.random() * availEx.length)];
        assigns[role] = '/Assets/images/Profiles/Examiner/' + pickEx;
        usedExaminers.push(pickEx);
      } else {
        // Partner uses images from Profiles/
        var available = ANIMAL_IMAGES.filter(function(img) { return usedProfiles.indexOf(img) === -1; });
        if (available.length === 0) available = ANIMAL_IMAGES;
        var pick = available[Math.floor(Math.random() * available.length)];
        assigns[role] = '/Assets/images/Profiles/' + pick;
        usedProfiles.push(pick);
      }
    });

    // Pre-load voices for TTS gender matching
    if (window.speechSynthesis) {
      _loadVoices();
      window.speechSynthesis.onvoiceschanged = function() { _cachedVoices.loaded = false; _loadVoices(); };
    }
  }

  function _getAnimalAvatarHTML(role, cssClass) {
    var cls = cssClass || 'speaking-animal-avatar';
    var img = _getAssignments()[role];
    if (img) {
      return '<img src="' + img + '" alt="" class="' + cls + '">';
    }
    // Fallback: person icon silhouette
    return CARD_PERSON_ICON;
  }

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
    _pendingTranscript: '',
    _finalTranscript: '',
    _evaluating: false,
    _evaluated: false,
    _speakingTimerInterval: null,
    _speakingElapsed: 0,
    _interviewMode: false,    // true when using phase-based interview
    _interviewPhases: null,   // phases array from content
    _interviewPhaseIndex: 0,  // current phase index (0-based)
    _interviewLastQuestionIdx: -1, // last question index used within current phase

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
      this._pendingTranscript = '';
      this._finalTranscript = '';
      this._evaluating = false;
      this._evaluated = false;
      this._stopSpeakingTimer();
      this._speakingElapsed = 0;

      // Detect phase-based interview mode
      this._interviewMode = !!(content.phases && content.phases.length);
      this._interviewPhases = content.phases || null;
      this._interviewPhaseIndex = 0;
      this._interviewLastQuestionIdx = -1;

      // Check for previously saved evaluation
      var savedEvaluation = null;
      if (exercise.answers && exercise.answers._aiFeedback) {
        savedEvaluation = exercise.answers._aiFeedback;
      }

      // Assign animal avatars — keep the same examiner across all speaking parts
      var currentSection = AppState.currentSection || 'speaking';
      if (window._speakingAvatarState.section !== currentSection) {
        window._speakingAvatarState.assignments = {};
        window._speakingAvatarState.section = currentSection;
      }
      _assignAvatars(this._participants);

      // For interview mode (phases), skip the task section (questions are for the examiner)
      var taskHTML = '';
      if (!this._interviewMode) {
        var task = content.task || content.questions?.[0]?.task || '';
        var images = content.questions?.[0]?.images || [];
        var options = content.options || [];
        if (!options.length && content.questions && content.questions.length) {
          options = content.questions.map(function(q) { return (q && q.question) ? q.question : q; });
        }
        var imagesHTML = images.map(function(src) { return '<img class="speaking-type-image" src="' + src + '" alt="">'; }).join('');
        var optionsHTML = options.length
          ? '<ul class="speaking-type-options">' + options.map(function(o) { return '<li>' + o + '</li>'; }).join('') + '</ul>'
          : '';
        if (task || options.length || images.length) {
          taskHTML =
            '<div class="speaking-type-task">' +
              '<h3><i class="fas fa-comments"></i> ' + (exercise.title || t('startSpeaking', 'Speaking')) + '</h3>' +
              '<p class="speaking-type-task-text">' + task + '</p>' +
              optionsHTML +
              (imagesHTML ? '<div class="speaking-type-images">' + imagesHTML + '</div>' : '') +
            '</div>';
        }
      }

      var html =
        '<div class="speaking-type-wrapper">' +
          taskHTML +
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

      // If there's a saved evaluation, show the score card from the last attempt
      if (savedEvaluation) {
        this._conversationEnded = true;
        this._evaluated = true;
        this._refreshView();
        this._showScoreCard(savedEvaluation);
      }
    },

    checkAnswers: function() {
      // End conversation if still going
      if (!this._conversationEnded) {
        this._endConversation();
      }
      return AppState.currentPartScore || 0;
    },

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

    // ── Video-call view (stage layout with speaker swap) ──

    _buildVideoCallView: function() {
      var self = this;
      var userName = t('you', 'You');
      var profile = (typeof UserProfile !== 'undefined') ? UserProfile._profile : null;
      if (profile && profile.full_name) {
        userName = profile.full_name.split(' ')[0];
      }

      // Determine who is featured (big) vs thumbnails (small)
      var featuredRole = this._activeSpeaker || 'examiner';
      var featuredLabel = featuredRole === 'candidate' ? userName
        : featuredRole === 'examiner' ? t('examiner', 'Examiner')
        : t('candidate2', 'Candidate 2');

      // Build featured (big) area with animal avatar
      var featuredHTML =
        '<div class="speaking-stage-featured" data-role="' + featuredRole + '">' +
          '<div class="speaking-stage-featured-avatar">' +
            _getAnimalAvatarHTML(featuredRole, 'speaking-featured-avatar') +
          '</div>' +
          '<div class="speaking-stage-featured-label">' + featuredLabel + '</div>' +
          '<div class="speaking-vc-indicator"></div>' +
        '</div>';

      // Build thumbnail cards for non-featured participants
      var thumbnailCards = '';
      this._participants.forEach(function(role) {
        if (role === featuredRole) return;
        var cardColor = role === 'candidate' ? 'gold' : (role === 'examiner' ? 'examiner' : 'blue');
        var label = role === 'candidate' ? userName
          : role === 'examiner' ? t('examiner', 'Examiner')
          : t('candidate2', 'Candidate 2');
        thumbnailCards +=
          '<div class="speaking-stage-card speaking-stage-card--' + cardColor + '" data-role="' + role + '">' +
            '<div class="speaking-stage-card-avatar">' +
              _getAnimalAvatarHTML(role) +
            '</div>' +
            '<div class="speaking-stage-card-label">' + label + '</div>' +
            '<div class="speaking-vc-indicator"></div>' +
          '</div>';
      });

      // Build speaking timer (countdown shown in stage)
      var timerHTML = '';
      if (this._conversationStarted && !this._conversationEnded) {
        var totalSeconds = (AppState.currentExercise && AppState.currentExercise.time ? AppState.currentExercise.time : 10) * 60;
        var remaining = Math.max(0, totalSeconds - this._speakingElapsed);
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        var timeStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
        timerHTML = '<div class="speaking-stage-timer" id="speaking-stage-timer">' +
          '<i class="fas fa-hourglass-half"></i> <span id="speaking-timer-display">' + timeStr + '</span>' +
        '</div>';
      }

      return '<div class="speaking-videocall speaking-stage">' +
        '<div class="speaking-stage-scene">' +
          timerHTML +
          featuredHTML +
          '<div class="speaking-stage-cards">' +
            thumbnailCards +
          '</div>' +
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

      // Build timer for chat mode
      var timerHTML = '';
      if (this._conversationStarted && !this._conversationEnded) {
        var totalSeconds = (AppState.currentExercise && AppState.currentExercise.time ? AppState.currentExercise.time : 10) * 60;
        var remaining = Math.max(0, totalSeconds - this._speakingElapsed);
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        var timeStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
        timerHTML = '<div class="speaking-chat-timer" id="speaking-chat-timer">' +
          '<i class="fas fa-hourglass-half"></i> <span id="speaking-timer-display">' + timeStr + '</span>' +
        '</div>';
      }

      return '<div class="speaking-chat">' +
        timerHTML +
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
          _getAnimalAvatarHTML(role, 'speaking-chat-animal-avatar') +
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
      // (no AI fetching in interview mode — questions are selected locally)
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
          '<button class="speaking-end-btn" id="speaking-end-btn" title="' + t('endConversation', 'End conversation') + '">' +
            '<i class="fas fa-phone-slash"></i>' +
          '</button>' +
        '</div>' +
        (isMine ? '<div class="speaking-your-turn" id="speaking-turn-indicator"><i class="fas fa-microphone"></i> ' + t('pressMicToSpeak', 'Press the microphone button to speak') + '</div>' : '') +
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

      var endBtn = document.getElementById('speaking-end-btn');
      if (endBtn) {
        endBtn.onclick = function() { self._endConversation(); };
      }
    },

    // ── Conversation flow ──

    _startConversation: function() {
      this._conversationStarted = true;
      this._scriptIndex = 0;
      this._messages = [];
      // Start the speaking countdown timer
      this._startSpeakingTimer();
      this._refreshView();
      this._processCurrentTurn();
    },

    _startSpeakingTimer: function() {
      var self = this;
      if (this._speakingTimerInterval) clearInterval(this._speakingTimerInterval);
      this._speakingElapsed = 0;
      var totalSeconds = (AppState.currentExercise && AppState.currentExercise.time ? AppState.currentExercise.time : 10) * 60;
      this._speakingTimerInterval = setInterval(function() {
        if (self._isRecording) self._speakingElapsed++;
        var display = document.getElementById('speaking-timer-display');
        if (display) {
          var remaining = Math.max(0, totalSeconds - self._speakingElapsed);
          var mins = Math.floor(remaining / 60);
          var secs = remaining % 60;
          display.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
          // Color coding for both videocall and chat timers
          var timerEl = document.getElementById('speaking-stage-timer') || document.getElementById('speaking-chat-timer');
          if (timerEl) {
            timerEl.classList.remove('speaking-timer-warning', 'speaking-timer-danger');
            if (remaining <= 30) timerEl.classList.add('speaking-timer-danger');
            else if (remaining <= 60) timerEl.classList.add('speaking-timer-warning');
          }
        }
        if (self._speakingElapsed >= totalSeconds) {
          self._endConversation();
        }
      }, 1000);
    },

    _stopSpeakingTimer: function() {
      if (this._speakingTimerInterval) {
        clearInterval(this._speakingTimerInterval);
        this._speakingTimerInterval = null;
      }
    },

    _processCurrentTurn: function() {
      var self = this;
      if (this._conversationEnded) return;

      // Interview mode: select next question locally when script is exhausted
      if (this._interviewMode && this._scriptIndex >= this._script.length) {
        // Only proceed if last message was from candidate (or no messages yet)
        var lastMsg = this._messages[this._messages.length - 1];
        if (!lastMsg || lastMsg.role === 'candidate') {
          this._selectNextInterviewQuestion();
        }
        return;
      }

      if (this._scriptIndex >= this._script.length) {
        this._endConversation();
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
        this._speakText(text, turn.role, function() {
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

    _selectNextInterviewQuestion: function() {
      if (this._conversationEnded) return;

      var phases = this._interviewPhases;
      if (!phases || !phases.length) {
        this._endConversation();
        return;
      }

      // Search for the next question: always pick from indices strictly after
      // the last used index within the current phase. When the current phase is
      // exhausted, advance to the next phase and reset the index.
      var question = null;
      while (this._interviewPhaseIndex < phases.length) {
        var phase = phases[this._interviewPhaseIndex];
        var questions = phase.questions || [];
        // Collect indices strictly after the last used index in this phase
        var available = [];
        for (var i = this._interviewLastQuestionIdx + 1; i < questions.length; i++) {
          available.push(i);
        }
        if (available.length > 0) {
          // Pick randomly from the remaining subsequent questions in this phase
          var pick = available[Math.floor(Math.random() * available.length)];
          this._interviewLastQuestionIdx = pick;
          question = questions[pick];
          break;
        }
        // No more questions in this phase — move to the next
        this._interviewPhaseIndex++;
        this._interviewLastQuestionIdx = -1;
      }

      if (!question) {
        this._endConversation();
        return;
      }

      // Append examiner question + candidate turn to script
      this._script.push({ role: 'examiner', text: question });
      this._script.push({ role: 'candidate', text: '' });
      this._processCurrentTurn();
    },

    _speakText: function(text, role, cb) {
      if (!this._synthesis) { if (cb) cb(); return; }
      // Cancel any ongoing speech
      this._synthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-GB';
      utter.rate = 0.95;
      // Select voice matching the avatar's gender
      var voice = _getVoiceForRole(role);
      if (voice) utter.voice = voice;
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
      this._recognition.continuous = true;

      this._pendingTranscript = '';
      this._finalTranscript = '';

      this._recognition.onresult = function(event) {
        var interim = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            self._finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        self._pendingTranscript = self._finalTranscript + interim;
        var input = document.getElementById('speaking-text-input');
        if (input) input.value = self._pendingTranscript;
      };

      this._recognition.onend = function() {
        // In continuous mode, the recognition may stop unexpectedly;
        // if we're still supposed to be recording, restart it
        if (self._isRecording && !self._conversationEnded) {
          try { self._recognition.start(); } catch(e) {}
          return;
        }
        self._isRecording = false;
        self._updateMicButton();
      };

      this._recognition.onerror = function(e) {
        // 'no-speech' and 'aborted' are non-fatal in continuous mode
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        self._isRecording = false;
        self._updateMicButton();
      };

      this._recognition.start();
      this._isRecording = true;
      this._updateMicButton();
    },

    _stopRecording: function() {
      this._isRecording = false;
      if (this._recognition) {
        try { this._recognition.stop(); } catch(e) {}
      }
      this._updateMicButton();
      // Auto-send the accumulated transcript
      var input = document.getElementById('speaking-text-input');
      if (input && input.value.trim()) {
        this._sendTextInput();
      }
    },

    _updateMicButton: function() {
      var btn = document.getElementById('speaking-mic-btn');
      if (!btn) return;
      var indicator = document.getElementById('speaking-turn-indicator');
      if (this._isRecording) {
        btn.classList.add('speaking-mic-recording');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        if (indicator) {
          indicator.innerHTML = '<span class="speaking-pulse"></span> ' + t('speakingNow', 'Speaking...');
        }
      } else {
        btn.classList.remove('speaking-mic-recording');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        if (indicator) {
          indicator.innerHTML = '<i class="fas fa-microphone"></i> ' + t('pressMicToSpeak', 'Press the microphone button to speak');
        }
      }
    },

    // ── End conversation and evaluate ──

    _endConversation: function() {
      if (this._conversationEnded) return;
      this._conversationEnded = true;
      this._activeSpeaker = null;
      // Stop the speaking countdown timer
      this._stopSpeakingTimer();
      if (this._isRecording) {
        this._isRecording = false;
        if (this._recognition) {
          try { this._recognition.stop(); } catch(e) {}
        }
        // Save any pending transcript before ending
        var input = document.getElementById('speaking-text-input');
        if (input && input.value.trim()) {
          this._messages.push({ role: 'candidate', text: input.value.trim() });
        }
      }
      if (this._synthesis) {
        this._synthesis.cancel();
      }
      // Save transcripts to answers
      this._saveTranscripts();
      this._refreshView();
      // Start AI evaluation
      this._collectAndEvaluate();
    },

    _saveTranscripts: function() {
      if (!AppState.currentExercise) return;
      AppState.currentExercise.answers = AppState.currentExercise.answers || {};
      var transcripts = this._messages
        .filter(function(m) { return m.role === 'candidate'; })
        .map(function(m) { return m.text; })
        .filter(function(t) { return t && t !== '...'; });
      AppState.currentExercise.answers._transcripts = transcripts;
      AppState.currentExercise.answers._allMessages = this._messages;
      Exercise.savePartState();
    },

    _collectAndEvaluate: async function() {
      if (this._evaluating || this._evaluated) return;
      this._evaluating = true;

      var transcripts = this._messages
        .filter(function(m) { return m.role === 'candidate'; })
        .map(function(m) { return m.text; })
        .filter(function(t) { return t && t !== '...'; });

      // If no meaningful transcripts, show empty result
      if (!transcripts.length || transcripts.join(' ').trim().length < 5) {
        this._evaluating = false;
        this._evaluated = true;
        this._showScoreCard(null);
        return;
      }

      this._showEvaluationLoading();

      try {
        var res = await fetch('/api/speaking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcripts: transcripts,
            allMessages: this._messages,
            partType: AppState.currentPart,
            examLevel: AppState.currentLevel || 'C1'
          })
        });
        var data = await res.json();
        if (!data.error && data.evaluation) {
          var score = this._parseScore(data.evaluation);
          AppState.currentPartScore = score;
          if (AppState.currentExercise) {
            AppState.currentExercise.answers._aiFeedback = data.evaluation;
            AppState.currentExercise.answers._speakingScore = score;
          }
          Exercise.savePartState();
          Timer.updateScoreDisplay();
          this._showScoreCard(data.evaluation);
        } else {
          this._showScoreCard(null);
        }
      } catch(e) {
        console.error('Speaking evaluation error:', e);
        this._showScoreCard(null);
      }

      this._evaluating = false;
      this._evaluated = true;
    },

    _parseScore: function(evaluation) {
      if (!evaluation) return 0;
      // Try to find "Total: XX/75" pattern
      var m = evaluation.match(/Total[:\s]*(\d+(?:\.\d+)?)\s*\/\s*75/i);
      if (m) return Math.round(parseFloat(m[1]));
      // Fallback: try to sum individual criteria
      var total = 0;
      var criteria = [
        /Grammatical\s*Resource[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /Lexical\s*Resource[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /Discourse\s*Management[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /Pronunciation[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /Interactive\s*Communication[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /Global\s*Achievement[:\s]*(\d+(?:\.\d+)?)\s*\/\s*25/i
      ];
      var found = false;
      criteria.forEach(function(re) {
        var match = evaluation.match(re);
        if (match) {
          total += parseFloat(match[1]);
          found = true;
        }
      });
      return found ? Math.round(total) : 0;
    },

    _showEvaluationLoading: function() {
      var scoreArea = document.getElementById('speaking-score-area');
      if (!scoreArea) {
        var wrapper = document.querySelector('.speaking-type-wrapper');
        if (!wrapper) return;
        scoreArea = document.createElement('div');
        scoreArea.id = 'speaking-score-area';
        wrapper.appendChild(scoreArea);
      }
      scoreArea.innerHTML =
        '<div class="speaking-eval-loading">' +
          '<span class="material-symbols-outlined speaking-eval-spinner">progress_activity</span> ' +
          t('evaluatingSpeaking', 'Evaluating your speaking performance...') +
        '</div>';
    },

    _parseFeedbackSections: function(evaluation) {
      var sections = { detailed: '', strengths: '', improvements: '' };
      var feedbackMatch = evaluation.match(/📝\s*DETAILED\s*FEEDBACK([\s\S]*?)(?=✅|⚠️|$)/i);
      if (feedbackMatch) sections.detailed = feedbackMatch[1].trim();
      var strengthsMatch = evaluation.match(/✅\s*STRENGTHS([\s\S]*?)(?=⚠️|$)/i);
      if (strengthsMatch) sections.strengths = strengthsMatch[1].trim();
      var improvementsMatch = evaluation.match(/⚠️\s*AREAS\s*FOR\s*IMPROVEMENT([\s\S]*?)$/i);
      if (improvementsMatch) sections.improvements = improvementsMatch[1].trim();
      return sections;
    },

    _formatFeedbackContent: function(text) {
      var escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return escaped
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\*/g, '')
        .replace(/^(Grammatical\s*Resource|Lexical\s*Resource|Discourse\s*Management|Pronunciation|Interactive\s*Communication|Global\s*Achievement):/gm,
          '<div class="speaking-feedback-criterion-title"><span class="material-symbols-outlined">chevron_right</span> <strong>$1</strong></div>')
        .replace(/^- (.+)/gm, '<div class="speaking-feedback-list-item"><span class="material-symbols-outlined speaking-feedback-list-icon">arrow_right</span> $1</div>')
        .replace(/\n/g, '<br>');
    },

    _buildFeedbackTabs: function(sections) {
      var self = this;
      var tabs = [
        { id: 'detailed', icon: 'chat', label: t('detailedFeedback', 'Detailed Feedback'), content: sections.detailed },
        { id: 'strengths', icon: 'check_circle', label: t('strengths', 'Strengths'), content: sections.strengths },
        { id: 'improvements', icon: 'warning', label: t('areasForImprovement', 'Areas for Improvement'), content: sections.improvements }
      ].filter(function(tab) { return tab.content; });

      if (!tabs.length) return '';

      var html = '<div class="speaking-feedback-tabs">';
      html += '<div class="speaking-feedback-tab-buttons">';
      tabs.forEach(function(tab, i) {
        html += '<button class="speaking-feedback-tab-btn' + (i === 0 ? ' active' : '') + '" data-tab="' + tab.id + '" onclick="SpeakingType.switchFeedbackTab(\'' + tab.id + '\')">' +
          '<span class="material-symbols-outlined">' + tab.icon + '</span> ' + tab.label +
        '</button>';
      });
      html += '</div>';
      tabs.forEach(function(tab, i) {
        html += '<div class="speaking-feedback-tab-panel' + (i === 0 ? ' active' : '') + '" id="panel-sf-' + tab.id + '">' +
          '<div class="speaking-ai-feedback">' + self._formatFeedbackContent(tab.content) + '</div>' +
        '</div>';
      });
      html += '</div>';
      return html;
    },

    switchFeedbackTab: function(tabId) {
      document.querySelectorAll('.speaking-feedback-tab-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      document.querySelectorAll('.speaking-feedback-tab-panel').forEach(function(panel) {
        panel.classList.toggle('active', panel.id === 'panel-sf-' + tabId);
      });
    },

    switchPartEvaluation: function(partNum) {
      var savedState = (typeof Exercise !== 'undefined' && AppState.currentExamId)
        ? Exercise.loadPartState(AppState.currentExamId, AppState.currentSection || 'speaking', partNum)
        : null;
      var evaluation = savedState && savedState.answers ? (savedState.answers._aiFeedback || null) : null;
      this._showScoreCard(evaluation, partNum);
    },

    _buildPartNav: function(activePart) {
      var partLabels = [
        t('speakingPartInterview', 'Interview'),
        t('speakingPartLongTurn', 'Long Turn'),
        t('speakingPartCollaborative', 'Collaborative'),
        t('speakingPartDiscussion', 'Discussion')
      ];
      var examId = AppState.currentExamId;
      var section = AppState.currentSection || 'speaking';
      var html = '<div class="speaking-part-nav">';
      for (var i = 1; i <= 4; i++) {
        var partState = (typeof Exercise !== 'undefined' && examId)
          ? Exercise.loadPartState(examId, section, i) : null;
        var hasEval = !!(partState && partState.answers && partState.answers._aiFeedback);
        // The current part in AppState can be viewed even before its evaluation is complete
        var isCurrentPart = (i === (AppState.currentPart || 1));
        var isActive = (i === activePart);
        // A button is enabled if the part has a saved evaluation, or is the part currently in progress
        var available = hasEval || isCurrentPart;
        html += '<button class="speaking-part-btn' + (isActive ? ' active' : '') + (available ? '' : ' speaking-part-btn--pending') + '"' +
          (available ? '' : ' disabled') +
          ' onclick="SpeakingType.switchPartEvaluation(' + i + ')">' +
          '<span class="speaking-part-btn-num">' + t('part', 'Part') + ' ' + i + '</span>' +
          '<span class="speaking-part-btn-label">' + partLabels[i - 1] + '</span>' +
        '</button>';
      }
      html += '</div>';
      return html;
    },

    _showScoreCard: function(evaluation, displayPart) {
      var scoreArea = document.getElementById('speaking-score-area');
      if (!scoreArea) {
        var wrapper = document.querySelector('.speaking-type-wrapper');
        if (!wrapper) return;
        scoreArea = document.createElement('div');
        scoreArea.id = 'speaking-score-area';
        wrapper.appendChild(scoreArea);
      }

      var activePart = displayPart || AppState.currentPart || 1;
      var partNav = this._buildPartNav(activePart);

      if (!evaluation) {
        scoreArea.innerHTML =
          partNav +
          '<div class="speaking-score-card">' +
            '<div class="speaking-score-header">' +
              '<span class="material-symbols-outlined">mic_off</span> ' +
              t('noSpeakingData', 'No speaking data to evaluate') +
            '</div>' +
          '</div>';
        return;
      }

      // Parse criteria from the evaluation
      var criteriaData = [
        { key: 'grammaticalResource', label: t('grammaticalResource', 'Grammatical Resource'), max: 10, regex: /Grammatical\s*Resource[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
        { key: 'lexicalResource', label: t('lexicalResource', 'Lexical Resource'), max: 10, regex: /Lexical\s*Resource[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
        { key: 'discourseManagement', label: t('discourseManagement', 'Discourse Management'), max: 10, regex: /Discourse\s*Management[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
        { key: 'pronunciation', label: t('pronunciation', 'Pronunciation'), max: 10, regex: /Pronunciation[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
        { key: 'interactiveCommunication', label: t('interactiveCommunication', 'Interactive Communication'), max: 10, regex: /Interactive\s*Communication[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
        { key: 'globalAchievement', label: t('globalAchievement', 'Global Achievement'), max: 25, regex: /Global\s*Achievement[:\s]*(\d+(?:\.\d+)?)\s*\/\s*25/i }
      ];

      var total = 0;
      var criteriaHTML = '';
      criteriaData.forEach(function(c) {
        var match = evaluation.match(c.regex);
        var score = match ? parseFloat(match[1]) : 0;
        total += score;
        var pct = Math.round((score / c.max) * 100);
        var barClass = pct >= 70 ? 'good' : (pct >= 40 ? 'average' : 'low');
        criteriaHTML +=
          '<div class="speaking-criterion">' +
            '<div class="speaking-criterion-label">' + c.label + '</div>' +
            '<div class="speaking-criterion-bar-wrap">' +
              '<div class="speaking-criterion-bar speaking-bar-' + barClass + '" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<div class="speaking-criterion-score">' + score + '/' + c.max + '</div>' +
          '</div>';
      });

      total = Math.round(total);

      var totalPct = Math.round((total / 75) * 100);
      var gradeClass = totalPct >= 70 ? 'good' : (totalPct >= 40 ? 'average' : 'low');

      var sections = this._parseFeedbackSections(evaluation);
      var feedbackTabsHTML = this._buildFeedbackTabs(sections);

      var html =
        partNav +
        '<div class="speaking-score-card">' +
          '<div class="speaking-score-header">' +
            '<span class="material-symbols-outlined">bar_chart</span> ' +
            t('speakingAssessment', 'Speaking Assessment') +
          '</div>' +
          '<div class="speaking-score-total speaking-total-' + gradeClass + '">' +
            '<span class="speaking-score-number">' + total + '</span>' +
            '<span class="speaking-score-max">/ 75</span>' +
          '</div>' +
          '<div class="speaking-criteria-list">' +
            criteriaHTML +
          '</div>' +
          (feedbackTabsHTML ? '<div class="speaking-feedback-section">' + feedbackTabsHTML + '</div>' : '') +
        '</div>';

      scoreArea.innerHTML = html;
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
      // Update stage elements (examiner + candidate cards)
      var stageElements = document.querySelectorAll('[data-role]');
      var active = this._activeSpeaker;
      stageElements.forEach(function(el) {
        var role = el.getAttribute('data-role');
        if (role === active) {
          el.classList.add('speaking-stage--speaking');
        } else {
          el.classList.remove('speaking-stage--speaking');
        }
        // Update indicator
        var indicator = el.querySelector('.speaking-vc-indicator');
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
          status.innerHTML = t('waitingForYou', 'Waiting for your response');
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
    },

    // ── Cleanup: stop all audio/recording when navigating away ──

    cleanup: function() {
      this._stopSpeakingTimer();
      if (this._isRecording) {
        this._isRecording = false;
        if (this._recognition) {
          try { this._recognition.stop(); } catch(e) {}
        }
      }
      if (this._synthesis) {
        this._synthesis.cancel();
      }
      this._conversationEnded = true;
      this._activeSpeaker = null;
    }
  };
})();
