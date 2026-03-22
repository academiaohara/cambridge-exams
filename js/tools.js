// js/tools.js
(function() {
  // Limits
  var MAX_HIGHLIGHTS = 20;
  var MAX_NOTES = 30;
  var MAX_HIGHLIGHT_COMMENT = 200;
  var MAX_FREE_NOTE = 300;

  // Request ID to prevent async race conditions when switching tools
  var _toolRequestId = 0;

  function _escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.Tools = {
    toggleSidebar: function() {
      var sidebar = document.getElementById('tools-sidebar');
      if (!sidebar) return;
      if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        AppState.activeTool = null;
        document.querySelectorAll('.sidebar-tool-btn').forEach(function(btn) { btn.classList.remove('active'); });
      } else {
        sidebar.classList.add('open');
        // Close modals when tools open
        this._closeModals();
      }
    },

    closeSidebar: function() {
      var sidebar = document.getElementById('tools-sidebar');
      if (!sidebar) return;
      sidebar.classList.remove('open');
      AppState.activeTool = null;
      document.querySelectorAll('.sidebar-tool-btn').forEach(function(btn) { btn.classList.remove('active'); });
    },

    _closeModals: function() {
      if (window.Modal) Modal.closeOptionsModal();
      if (window.QuestionNav) QuestionNav.close();
    },

    switchTool: function(tool) {
      var sidebar = document.getElementById('tools-sidebar');

      // Cancel any in-flight async requests
      _toolRequestId++;

      if (AppState.activeTool === tool) {
        AppState.activeTool = null;
        if (sidebar) sidebar.classList.remove('open');
      } else {
        AppState.activeTool = tool;
        AppState.toolSelectionEnabled = true;
        if (sidebar) sidebar.classList.add('open');
        // Close modals when a tool is activated
        this._closeModals();
      }
      
      document.querySelectorAll('.sidebar-tool-btn').forEach(function(btn) { btn.classList.remove('active'); });
      if (AppState.activeTool) {
        var activeBtn = document.getElementById('tab-' + tool);
        if (activeBtn) activeBtn.classList.add('active');
      }

      // Update panel title
      var titleEl = document.getElementById('sidebar-panel-title');
      if (titleEl) {
        var titles = {
          notes: 'HIGHLIGHT',
          freenotes: 'NOTES',
          dict: 'DICTIONARY',
          translate: 'TRANSLATE',
          tips: 'TIPS',
          transcript: 'TRANSCRIPT'
        };
        titleEl.textContent = titles[AppState.activeTool] || '';
      }

      // Show/hide toggle for selection-based tools
      this._renderToolToggle();
      
      var container = document.getElementById('active-tool-content');
      if (!container) return;
      
      // Clear any lingering selection to avoid cross-tool bleed
      window.getSelection().removeAllRanges();
      
      switch(AppState.activeTool) {
        case 'notes':
          this.renderNotesArea();
          break;
        case 'freenotes':
          this.renderFreeNotes();
          break;
        case 'dict':
          this.renderDictSearch();
          break;
        case 'translate':
          container.innerHTML = '<p class="placeholder-text">' + 'Select any phrase to translate.' + '</p>';
          break;
        case 'tips':
          if (AppState.currentSection) {
            this.showTips(AppState.currentSection);
          } else {
            container.innerHTML = '<p class="placeholder-text">' + 'Activate a tool to see details here.' + '</p>';
          }
          break;
        case 'transcript':
          this.renderTranscript();
          break;
        default:
          container.innerHTML = '<p class="placeholder-text">' + 'Activate a tool to see details here.' + '</p>';
      }
    },

    _isSelectionTool: function(tool) {
      return tool === 'notes' || tool === 'dict' || tool === 'translate';
    },

    _renderToolToggle: function() {
      var existing = document.getElementById('tool-toggle-row');
      if (existing) existing.remove();

      if (!AppState.activeTool || !this._isSelectionTool(AppState.activeTool)) return;

      var header = document.querySelector('.sidebar-panel-header');
      if (!header) return;

      var row = document.createElement('div');
      row.className = 'tool-toggle-row';
      row.id = 'tool-toggle-row';
      row.innerHTML =
        '<span class="tool-toggle-label">' + ('Auto-detect') + '</span>' +
        '<label class="tool-toggle-switch">' +
          '<input type="checkbox" id="tool-selection-toggle" ' + (AppState.toolSelectionEnabled ? 'checked' : '') + ' onchange="Tools.toggleToolSelection(this.checked)">' +
          '<span class="tool-toggle-slider"></span>' +
        '</label>';

      header.parentNode.insertBefore(row, header.nextSibling);
    },

    toggleToolSelection: function(enabled) {
      AppState.toolSelectionEnabled = enabled;
    },

    renderDictSearch: function() {
      var container = document.getElementById('active-tool-content');
      if (!container) return;
      container.innerHTML = '<div class="dict-search-wrapper">' +
        '<div class="dict-search-box">' +
          '<i class="fas fa-search"></i>' +
          '<input type="text" id="dict-search-input" placeholder="' + ('Type a word or phrasal verb...') + '">' +
          '<button class="dict-search-go" onclick="Tools.searchFromInput()">' +
            '<i class="fas fa-arrow-right"></i>' +
          '</button>' +
        '</div>' +
        '<p class="dict-help-text">' + 'Select a word or phrasal verb to see its definition.' + '</p>' +
      '</div>';
      var input = document.getElementById('dict-search-input');
      if (input) {
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') Tools.searchFromInput();
        });
        input.focus();
      }
    },

    searchFromInput: function() {
      var input = document.getElementById('dict-search-input');
      if (input && input.value.trim().length >= 2) {
        this.buscarEnDiccionario(input.value.trim());
      }
    },
    
    setNoteColor: function(color, element) {
      AppState.selectedNoteColor = color;
      document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
      element.classList.add('active');
    },
    
    hideNoteCreator: function() {
      window.getSelection().removeAllRanges();
      var noteInput = document.getElementById('note-input-field');
      if (noteInput) noteInput.value = '';
      // Re-render the full notes area to go back to normal view
      if (AppState.activeTool === 'notes') this.renderNotesArea();
    },
    
    saveNote: function() {
      if (AppState.notes.length >= MAX_HIGHLIGHTS) {
        alert('You have reached the limit of 20 highlights.');
        return;
      }
      const commentInput = document.getElementById('note-input-field');
      const comment = commentInput ? commentInput.value.slice(0, MAX_HIGHLIGHT_COMMENT) : '';
      const phrase = document.getElementById('selected-phrase-display').textContent;
      
      if (AppState.currentNoteRange) {
        try {
          const noteId = Date.now();
          
          const span = document.createElement('span');
          span.style.backgroundColor = AppState.selectedNoteColor + '40';
          span.style.borderBottom = '2px solid ' + AppState.selectedNoteColor;
          span.className = 'text-highlight';
          span.title = comment;
          span.setAttribute('data-note-id', noteId);
          
          const originalText = AppState.currentNoteRange.toString();
          AppState.currentNoteRange.surroundContents(span);
          
          AppState.notes.push({
            id: noteId,
            text: originalText,
            comment: comment || 'No comment',
            color: AppState.selectedNoteColor,
            element: span
          });
          
          // Navigate to the newly added note
          AppState.notesIndex = AppState.notes.length - 1;
          
        } catch (e) {
          console.log('Error al resaltar texto:', e);
        }
      }
      this.hideNoteCreator();
    },
    
    deleteNote: function(id) {
      const noteToDelete = AppState.notes.find(n => n.id === id);
      if (noteToDelete && noteToDelete.element) {
        const parent = noteToDelete.element.parentNode;
        if (parent) {
          const text = document.createTextNode(noteToDelete.element.textContent);
          parent.replaceChild(text, noteToDelete.element);
        }
      }
      
      AppState.notes = AppState.notes.filter(n => n.id !== id);
      if (AppState.notesIndex >= AppState.notes.length) {
        AppState.notesIndex = Math.max(0, AppState.notes.length - 1);
      }
      this.renderNotesArea();
    },

    prevNote: function() {
      if (AppState.notes.length === 0) return;
      AppState.notesIndex = (AppState.notesIndex - 1 + AppState.notes.length) % AppState.notes.length;
      this.renderNotesArea();
    },

    nextNote: function() {
      if (AppState.notes.length === 0) return;
      AppState.notesIndex = (AppState.notesIndex + 1) % AppState.notes.length;
      this.renderNotesArea();
    },
    
    renderNotesArea: function() {
      const container = document.getElementById('active-tool-content');
      let html = '';

      // Notes carousel (one note at a time)
      if (AppState.notes.length === 0) {
        html += '<p class="empty-msg">' + 'No highlights yet. Select text and create one.' + '</p>';
      } else {
        const idx = AppState.notesIndex;
        const n = AppState.notes[idx];
        const total = AppState.notes.length;
        html += '<div class="notes-carousel">' +
          '<div class="notes-carousel-nav">' +
            '<button class="notes-nav-btn" onclick="Tools.prevNote()" ' + (total <= 1 ? 'disabled' : '') + '>' +
              '<i class="fas fa-chevron-left"></i>' +
            '</button>' +
            '<span class="notes-nav-counter">' + (idx + 1) + ' ' + 'of' + ' ' + total + '</span>' +
            '<button class="notes-nav-btn" onclick="Tools.nextNote()" ' + (total <= 1 ? 'disabled' : '') + '>' +
              '<i class="fas fa-chevron-right"></i>' +
            '</button>' +
          '</div>' +
          '<div class="note-item-display" style="background-color: ' + n.color + '40; border-left: 4px solid ' + n.color + ';">' +
            '<div class="note-item-content">' +
              '<span class="note-item-phrase">"' + n.text + '"</span>' +
              '<span class="note-item-comment">' + n.comment + '</span>' +
            '</div>' +
            '<button class="note-delete" onclick="Tools.deleteNote(' + n.id + ')">&times;</button>' +
          '</div>' +
        '</div>';
      }

      // Note creator (hidden by default, shown on text selection)
      html += `
        <div id="note-creator" class="note-creator-card" style="display:none;">
          <div class="note-creator-header">
            <span data-i18n="highlightText">Highlight</span> "<span id="selected-phrase-display"></span>"
          </div>
          <div class="note-input-wrapper">
            <input type="text" id="note-input-field" maxlength="${MAX_HIGHLIGHT_COMMENT}" data-i18n-placeholder="addNote" placeholder="Add a note (optional)...">
            <span class="char-counter" id="note-char-counter">0 / ${MAX_HIGHLIGHT_COMMENT}</span>
          </div>
          <div class="note-creator-footer">
            <div class="color-options">
              <span class="color-dot yellow active" data-color="#fef08a" onclick="Tools.setNoteColor('#fef08a', this)"></span>
              <span class="color-dot green" data-color="#bbf7d0" onclick="Tools.setNoteColor('#bbf7d0', this)"></span>
              <span class="color-dot blue" data-color="#bfdbfe" onclick="Tools.setNoteColor('#bfdbfe', this)"></span>
              <span class="color-dot pink" data-color="#fbcfe8" onclick="Tools.setNoteColor('#fbcfe8', this)"></span>
            </div>
            <div class="note-actions">
              <button class="btn-cancel" onclick="Tools.hideNoteCreator()"><span data-i18n="cancel">Cancel</span></button>
              <button class="btn-confirm" onclick="Tools.saveNote()"><span data-i18n="confirm">Confirm</span></button>
            </div>
          </div>
        </div>
      `;
      container.innerHTML = html;

      // Wire up char counter
      var noteInput = document.getElementById('note-input-field');
      var charCounter = document.getElementById('note-char-counter');
      if (noteInput && charCounter) {
        noteInput.addEventListener('input', function() {
          charCounter.textContent = noteInput.value.length + ' / ' + MAX_HIGHLIGHT_COMMENT;
        });
      }
    },
    
    renderFreeNotes: function() {
      const container = document.getElementById('active-tool-content');
      const notes = Array.isArray(AppState.freeNotes) ? AppState.freeNotes : [];
      const idx = AppState.freeNotesIndex || 0;
      const total = notes.length;
      const currentNote = notes[idx] || null;

      let notesCarouselHTML = '';
      if (total === 0) {
        notesCarouselHTML = '<p class="empty-msg fn-empty-msg">' + 'No notes yet. Write one above.' + '</p>';
      } else {
        notesCarouselHTML =
          '<div class="notes-carousel fn-carousel">' +
            '<div class="notes-carousel-nav">' +
              '<button class="notes-nav-btn" onclick="Tools.prevFreeNote()" ' + (total <= 1 ? 'disabled' : '') + '>' +
                '<i class="fas fa-chevron-left"></i>' +
              '</button>' +
              '<span class="notes-nav-counter">' + (idx + 1) + ' ' + 'of' + ' ' + total + '</span>' +
              '<button class="notes-nav-btn" onclick="Tools.nextFreeNote()" ' + (total <= 1 ? 'disabled' : '') + '>' +
                '<i class="fas fa-chevron-right"></i>' +
              '</button>' +
            '</div>' +
            '<div class="fn-note-display">' +
              '<span class="fn-note-text">' + _escapeHtml(currentNote) + '</span>' +
              '<button class="note-delete" onclick="Tools.deleteFreeNote(' + idx + ')" title="' + 'Delete' + '">&times;</button>' +
            '</div>' +
          '</div>';
      }

      container.innerHTML =
        '<div class="free-notes-container">' +
          '<div class="fn-input-wrapper" id="fn-input-wrapper">' +
            '<textarea id="fn-input" class="fn-input fn-input-small" maxlength="' + MAX_FREE_NOTE + '" placeholder="' + 'Write a note...' + '"></textarea>' +
            '<div class="fn-input-controls" id="fn-input-controls" style="display:none;">' +
              '<span class="char-counter" id="fn-char-counter">0 / ' + MAX_FREE_NOTE + '</span>' +
              '<button class="btn-confirm fn-save-btn" onclick="Tools.saveFreeNote()">' + 'Save' + '</button>' +
            '</div>' +
          '</div>' +
          notesCarouselHTML +
        '</div>';

      var textarea = document.getElementById('fn-input');
      var controls = document.getElementById('fn-input-controls');
      var charCounter = document.getElementById('fn-char-counter');
      var carousel = container.querySelector('.fn-carousel');
      var emptyMsg = container.querySelector('.fn-empty-msg');

      if (textarea) {
        textarea.addEventListener('focus', function() {
          textarea.classList.remove('fn-input-small');
          textarea.classList.add('fn-input-large');
          if (controls) controls.style.display = 'flex';
          if (carousel) carousel.style.display = 'none';
          if (emptyMsg) emptyMsg.style.display = 'none';
        });
        textarea.addEventListener('blur', function() {
          // Only collapse if not clicking the save button
          setTimeout(function() {
            if (document.activeElement && document.activeElement.classList.contains('fn-save-btn')) return;
            textarea.classList.remove('fn-input-large');
            textarea.classList.add('fn-input-small');
            if (controls) controls.style.display = 'none';
            if (carousel) carousel.style.display = '';
            if (emptyMsg) emptyMsg.style.display = '';
          }, 150);
        });
        textarea.addEventListener('input', function() {
          if (charCounter) charCounter.textContent = textarea.value.length + ' / ' + MAX_FREE_NOTE;
        });
      }
    },

    saveFreeNote: function() {
      var textarea = document.getElementById('fn-input');
      if (!textarea) return;
      var text = textarea.value.trim().slice(0, MAX_FREE_NOTE);
      if (!text) return;

      if (!Array.isArray(AppState.freeNotes)) AppState.freeNotes = [];
      if (AppState.freeNotes.length >= MAX_NOTES) {
        alert('You have reached the limit of 30 notes.');
        return;
      }
      AppState.freeNotes.push(text);
      AppState.freeNotesIndex = AppState.freeNotes.length - 1;
      this.renderFreeNotes();
    },

    deleteFreeNote: function(idx) {
      if (!Array.isArray(AppState.freeNotes)) return;
      AppState.freeNotes.splice(idx, 1);
      if (AppState.freeNotesIndex >= AppState.freeNotes.length) {
        AppState.freeNotesIndex = Math.max(0, AppState.freeNotes.length - 1);
      }
      this.renderFreeNotes();
    },

    prevFreeNote: function() {
      if (!Array.isArray(AppState.freeNotes) || AppState.freeNotes.length === 0) return;
      AppState.freeNotesIndex = (AppState.freeNotesIndex - 1 + AppState.freeNotes.length) % AppState.freeNotes.length;
      this.renderFreeNotes();
    },

    nextFreeNote: function() {
      if (!Array.isArray(AppState.freeNotes) || AppState.freeNotes.length === 0) return;
      AppState.freeNotesIndex = (AppState.freeNotesIndex + 1) % AppState.freeNotes.length;
      this.renderFreeNotes();
    },
    
    buscarEnDiccionario: async function(texto) {
      const requestId = ++_toolRequestId;
      const areaHerramientas = document.getElementById('active-tool-content');
      const searchBoxHTML = '<div class="dict-search-wrapper">' +
        '<div class="dict-search-box">' +
          '<i class="fas fa-search"></i>' +
          '<input type="text" id="dict-search-input" placeholder="' + ('Type a word or phrasal verb...') + '" value="' + texto.replace(/"/g, '&quot;') + '">' +
          '<button class="dict-search-go" onclick="Tools.searchFromInput()">' +
            '<i class="fas fa-arrow-right"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

      if (requestId !== _toolRequestId) return;
      areaHerramientas.innerHTML = searchBoxHTML + '<p class="loading-mini"><i class="fas fa-spinner fa-spin"></i> ' + 'Loading exercise...' + '...</p>';
      var searchInput = document.getElementById('dict-search-input');
      if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') Tools.searchFromInput();
        });
      }
      
      try {
        let query = texto.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

        // Try full query first (supports phrasal verbs like "give up", "look after")
        let response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(query));
        let data = await response.json();

        // If full query not found, try replacing spaces with %20 as hyphenated form
        if (data.title === "No Definitions Found" && query.indexOf(' ') !== -1) {
          var hyphenated = query.replace(/ /g, '-');
          response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(hyphenated));
          data = await response.json();
        }

        // If still not found and multi-word, try first word as fallback
        if (data.title === "No Definitions Found") {
          var palabras = query.split(' ');
          if (palabras.length > 1) {
            this.buscarEnDiccionario(palabras[0]);
            return;
          }
          if (requestId !== _toolRequestId) return;
          areaHerramientas.innerHTML = searchBoxHTML + '<p class="dict-not-found">' + 'No definition found for' + ' "' + query + '".</p>';
          var searchInput2 = document.getElementById('dict-search-input');
          if (searchInput2) {
            searchInput2.addEventListener('keydown', function(e) {
              if (e.key === 'Enter') Tools.searchFromInput();
            });
          }
          return;
        }

        if (requestId !== _toolRequestId) return;
        
        const info = data[0];
        let allMeaningsHTML = '';
        let synonymsList = [];
        
        info.meanings.forEach(function(meaning) {
          var defs = meaning.definitions.slice(0, 2);
          defs.forEach(function(def) {
            var exHtml = '';
            if (def.example) {
              exHtml = '<div class="dict-example-box"><p class="dict-example-text">"' + def.example + '"</p></div>';
            }
            allMeaningsHTML += '<div class="dict-meaning-block">' +
              '<span class="dict-pos-badge">' + meaning.partOfSpeech + '</span>' +
              '<p class="dict-definition-text">' + def.definition + '</p>' +
              exHtml +
            '</div>';
          });
          if (meaning.synonyms && meaning.synonyms.length > 0) {
            synonymsList = synonymsList.concat(meaning.synonyms);
          }
        });
        
        var synonyms = [];
        var seen = {};
        synonymsList.forEach(function(s) {
          if (!seen[s]) { seen[s] = true; synonyms.push(s); }
        });
        synonyms = synonyms.slice(0, 5);
        
        var resultHTML = '<div class="dict-card-container">' +
            '<div class="dict-header-row">' +
              '<span class="dict-word-title">' + info.word + '</span>' +
              '<span class="dict-phonetic-text">' + (info.phonetic || '') + '</span>' +
            '</div>' +
            allMeaningsHTML +
            '<div class="dict-tags-row">' +
              synonyms.map(function(s) { return '<span class="dict-tag-pill" onclick="Tools.searchWord(\'' + s + '\')">' + s + '</span>'; }).join('') +
            '</div>' +
          '</div>';
        
        areaHerramientas.innerHTML = searchBoxHTML + resultHTML;
        var searchInput3 = document.getElementById('dict-search-input');
        if (searchInput3) {
          searchInput3.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') Tools.searchFromInput();
          });
        }
        
      } catch (error) {
        if (requestId !== _toolRequestId) return;
        console.error('Error en diccionario:', error);
        areaHerramientas.innerHTML = searchBoxHTML + '<p>' + 'Error connecting to dictionary.' + '</p>';
        var searchInput4 = document.getElementById('dict-search-input');
        if (searchInput4) {
          searchInput4.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') Tools.searchFromInput();
          });
        }
      }
    },
    
    traducirTexto: async function(texto) {
      const requestId = ++_toolRequestId;
      const areaHerramientas = document.getElementById('active-tool-content');

      if (requestId !== _toolRequestId) return;
      areaHerramientas.innerHTML = '<p class="loading-mini">' + 'Loading exercise...' + '...</p>';
      
      try {
        let langPair = 'en|es';
        let translateLabel = 'ENG → SPA';
        
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${langPair}`);
        const data = await res.json();
        const traduccion = data.responseData.translatedText;

        if (requestId !== _toolRequestId) return;
        
        areaHerramientas.innerHTML = `
          <div class="translator-card">
            <p class="original-text-small">"${texto}"</p>
            <i class="fas fa-arrow-down"></i>
            <p class="translated-result">${traduccion}</p>
          </div>
        `;
      } catch (e) {
        if (requestId !== _toolRequestId) return;
        console.error('Error en traducción:', e);
        areaHerramientas.innerHTML = '<p>' + 'Translation error. Please try again.' + '</p>';
      }
    },
    
    searchWord: function(word) {
      this.buscarEnDiccionario(word);
    },
    
    renderTranscript: function() {
      var container = document.getElementById('active-tool-content');
      var exercise = AppState.currentExercise;
      var extracts = exercise && exercise.content ? exercise.content.extracts || [] : [];
      
      if (extracts.length === 0) {
        container.innerHTML = '<p class="placeholder-text">' + 'Activate a tool to see details here.' + '</p>';
        return;
      }
      
      var html = '<div class="transcript-content">';
      
      extracts.forEach(function(extract) {
        html += '<div class="transcript-extract">';
        html += '<div class="transcript-extract-header">';
        html += '<span class="transcript-extract-number">' + _escapeHtml(extract.id) + '</span>';
        html += '<span>' + _escapeHtml(extract.context) + '</span>';
        html += '</div>';
        html += '<div class="transcript-text">' + _escapeHtml(extract.audio_script).replace(/(\|\||\n)/g, '<br>') + '</div>';
        html += '</div>';
      });
      
      html += '</div>';
      container.innerHTML = html;
    },
    
    showTips: async function(section) {
      const requestId = ++_toolRequestId;
      const container = document.getElementById('active-tool-content');
      container.innerHTML = '<p class="loading-mini"><i class="fas fa-spinner fa-spin"></i> ' + 'Loading exercise...' + '...</p>';
      
      try {
        const tipFile = {
          'reading': 'reading',
          'listening': 'listening',
          'writing': 'writing',
          'speaking': 'speaking'
        }[section] || 'reading';
        
        const url = `${CONFIG.TIPS_BASE_URL}${tipFile}.json`;
        const response = await Utils.fetchWithNoCache(url);
        const tips = await response.json();

        if (requestId !== _toolRequestId) return;
        
        let html = `<div class="tips-content">`;
        
        // Show part-specific tips if available
        const currentPart = AppState.currentPart;
        if (tips.parts && currentPart && tips.parts[currentPart]) {
          const partTips = tips.parts[currentPart];
          html += `<h4><i class="fas fa-lightbulb"></i> ${partTips.title || tips.title}</h4><ul>`;
          partTips.tips.forEach(tip => {
            html += `<li>${tip}</li>`;
          });
          html += `</ul>`;
        } else if (tips.tips) {
          // Fallback to legacy format
          html += `<h4><i class="fas fa-lightbulb"></i> ${tips.title}</h4><ul>`;
          tips.tips.forEach(tip => {
            html += `<li>${tip}</li>`;
          });
          html += `</ul>`;
        }
        
        // General tips removed — only part-specific tips are shown
        
        html += `</div>`;
        container.innerHTML = html;
        
      } catch (error) {
        if (requestId !== _toolRequestId) return;
        console.error('Error cargando tips:', error);
        container.innerHTML = '<p class="error-message">Error cargando tips</p>';
      }
    }
  };

  // Inicializar eventos de selección de texto
  document.addEventListener('mouseup', async function(e) {
    if (!AppState.activeTool) return;
    if (!AppState.toolSelectionEnabled) return;
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length < 2) return;
    
    if (AppState.activeTool === 'notes') {
      try {
        AppState.currentNoteRange = selection.getRangeAt(0).cloneRange();
        // Render notes area first (which includes the hidden note-creator)
        Tools.renderNotesArea();
        // Then show the note-creator and hide the carousel/empty-msg
        var noteCreator = document.getElementById('note-creator');
        var carousel = document.querySelector('.notes-carousel');
        var emptyMsg = document.querySelector('#active-tool-content .empty-msg');
        if (noteCreator) {
          noteCreator.style.display = 'block';
        }
        if (carousel) carousel.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'none';
        var phraseDisplay = document.getElementById('selected-phrase-display');
        if (phraseDisplay) phraseDisplay.textContent = text;
        var noteInput = document.getElementById('note-input-field');
        if (noteInput) noteInput.focus();
      } catch (e) {
        console.log('Error al seleccionar texto:', e);
      }
    }
    
    if (AppState.activeTool === 'dict') {
      Tools.buscarEnDiccionario(text);
    }
    
    if (AppState.activeTool === 'translate') {
      Tools.traducirTexto(text);
    }
  });
})();
