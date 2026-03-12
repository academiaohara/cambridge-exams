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

  // ── Animal avatar system (prepared for assets/images/animals/) ──
  var ANIMAL_IMAGES = []; // Will be populated when images are uploaded to Assets/images/animals/

  function _getAnimalAvatarHTML(role) {
    // Check if animal images are available
    if (ANIMAL_IMAGES.length > 0) {
      var profile = (typeof UserProfile !== 'undefined') ? UserProfile._profile : null;
      if (role === 'candidate' && profile && profile.animal_avatar) {
        return '<img src="Assets/images/animals/' + profile.animal_avatar + '" alt="" class="speaking-animal-avatar">';
      }
      var randomAnimal = ANIMAL_IMAGES[Math.floor(Math.random() * ANIMAL_IMAGES.length)];
      return '<img src="Assets/images/animals/' + randomAnimal + '" alt="" class="speaking-animal-avatar">';
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

    // ── Video-call view (stage layout matching reference design) ──

    _buildVideoCallView: function() {
      var self = this;
      var userName = t('you', 'You');
      var profile = (typeof UserProfile !== 'undefined') ? UserProfile._profile : null;
      if (profile && profile.full_name) {
        userName = profile.full_name.split(' ')[0];
      }

      // Build candidate cards on the right side
      var candidateCards = '';
      this._participants.forEach(function(role) {
        if (role === 'examiner') return;
        var cardColor = role === 'candidate' ? 'gold' : 'blue';
        var label = role === 'candidate' ? userName : t('candidate2', 'Candidate 2');
        candidateCards +=
          '<div class="speaking-stage-card speaking-stage-card--' + cardColor + '" data-role="' + role + '">' +
            '<div class="speaking-stage-card-avatar">' +
              _getAnimalAvatarHTML(role) +
            '</div>' +
            '<div class="speaking-stage-card-label">' + label + '</div>' +
            '<div class="speaking-vc-indicator"></div>' +
          '</div>';
      });

      return '<div class="speaking-videocall speaking-stage">' +
        '<div class="speaking-stage-scene">' +
          '<div class="speaking-stage-examiner" data-role="examiner">' +
            EXAMINER_SILHOUETTE +
            '<div class="speaking-stage-examiner-label">' + t('examiner', 'Examiner') + '</div>' +
            '<div class="speaking-vc-indicator"></div>' +
          '</div>' +
          '<div class="speaking-stage-cards">' +
            candidateCards +
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
      if (this._isRecording) {
        btn.classList.add('speaking-mic-recording');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
      } else {
        btn.classList.remove('speaking-mic-recording');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
      }
    },

    // ── End conversation and evaluate ──

    _endConversation: function() {
      if (this._conversationEnded) return;
      this._conversationEnded = true;
      this._activeSpeaker = null;
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
          '<i class="fas fa-spinner fa-spin"></i> ' +
          t('evaluatingSpeaking', 'Evaluating your speaking performance...') +
        '</div>';
    },

    _showScoreCard: function(evaluation) {
      var scoreArea = document.getElementById('speaking-score-area');
      if (!scoreArea) {
        var wrapper = document.querySelector('.speaking-type-wrapper');
        if (!wrapper) return;
        scoreArea = document.createElement('div');
        scoreArea.id = 'speaking-score-area';
        wrapper.appendChild(scoreArea);
      }

      if (!evaluation) {
        scoreArea.innerHTML =
          '<div class="speaking-score-card">' +
            '<div class="speaking-score-header">' +
              '<i class="fas fa-microphone-slash"></i> ' +
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

      // Extract feedback section
      var feedbackMatch = evaluation.match(/📝\s*DETAILED\s*FEEDBACK([\s\S]*?)(?=✅|⚠️|$)/i);
      var feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
      var strengthsMatch = evaluation.match(/✅\s*STRENGTHS([\s\S]*?)(?=⚠️|$)/i);
      var strengths = strengthsMatch ? strengthsMatch[1].trim() : '';
      var improvementsMatch = evaluation.match(/⚠️\s*AREAS\s*FOR\s*IMPROVEMENT([\s\S]*?)$/i);
      var improvements = improvementsMatch ? improvementsMatch[1].trim() : '';

      var totalPct = Math.round((total / 75) * 100);
      var gradeClass = totalPct >= 70 ? 'good' : (totalPct >= 40 ? 'average' : 'low');

      var html =
        '<div class="speaking-score-card">' +
          '<div class="speaking-score-header">' +
            '<i class="fas fa-chart-bar"></i> ' +
            t('speakingAssessment', 'Speaking Assessment') +
          '</div>' +
          '<div class="speaking-score-total speaking-total-' + gradeClass + '">' +
            '<span class="speaking-score-number">' + total + '</span>' +
            '<span class="speaking-score-max">/ 75</span>' +
          '</div>' +
          '<div class="speaking-criteria-list">' +
            criteriaHTML +
          '</div>';

      if (feedback || strengths || improvements) {
        html += '<div class="speaking-feedback-section">';
        if (feedback) {
          html += '<div class="speaking-feedback-block">' +
            '<h4>📝 ' + t('detailedFeedback', 'Detailed Feedback') + '</h4>' +
            '<p>' + feedback.replace(/\n/g, '<br>') + '</p>' +
          '</div>';
        }
        if (strengths) {
          html += '<div class="speaking-feedback-block speaking-strengths">' +
            '<h4>✅ ' + t('strengths', 'Strengths') + '</h4>' +
            '<p>' + strengths.replace(/\n/g, '<br>') + '</p>' +
          '</div>';
        }
        if (improvements) {
          html += '<div class="speaking-feedback-block speaking-improvements">' +
            '<h4>⚠️ ' + t('areasForImprovement', 'Areas for Improvement') + '</h4>' +
            '<p>' + improvements.replace(/\n/g, '<br>') + '</p>' +
          '</div>';
        }
        html += '</div>';
      }

      html += '</div>';
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
