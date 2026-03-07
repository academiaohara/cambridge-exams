// js/tools.js
(function() {
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
      var modalOverlay = document.getElementById('exercise-modal-overlay');
      if (modalOverlay) modalOverlay.style.display = 'none';
      var qnavOverlay = document.getElementById('question-nav-overlay');
      if (qnavOverlay) qnavOverlay.style.display = 'none';
    },

    switchTool: function(tool) {
      var sidebar = document.getElementById('tools-sidebar');

      if (AppState.activeTool === tool) {
        AppState.activeTool = null;
        if (sidebar) sidebar.classList.remove('open');
      } else {
        AppState.activeTool = tool;
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
          notes: I18n.t('highlight'),
          freenotes: I18n.t('notes'),
          dict: I18n.t('dictionary'),
          translate: I18n.t('translate'),
          tips: I18n.t('tips'),
          transcript: I18n.t('transcript')
        };
        titleEl.textContent = titles[AppState.activeTool] || '';
      }
      
      var container = document.getElementById('active-tool-content');
      if (!container) return;
      
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
          container.innerHTML = '<p class="placeholder-text">' + I18n.t('selectPhrase') + '</p>';
          break;
        case 'tips':
          if (AppState.currentSection) {
            this.showTips(AppState.currentSection);
          } else {
            container.innerHTML = '<p class="placeholder-text">' + I18n.t('activateTool') + '</p>';
          }
          break;
        case 'transcript':
          this.renderTranscript();
          break;
        default:
          container.innerHTML = '<p class="placeholder-text">' + I18n.t('activateTool') + '</p>';
      }
    },

    renderDictSearch: function() {
      var container = document.getElementById('active-tool-content');
      if (!container) return;
      container.innerHTML = '<div class="dict-search-wrapper">' +
        '<div class="dict-search-box">' +
          '<i class="fas fa-search"></i>' +
          '<input type="text" id="dict-search-input" placeholder="' + (I18n.t('typeWordPlaceholder') || 'Type a word or phrasal verb...') + '">' +
          '<button class="dict-search-go" onclick="Tools.searchFromInput()">' +
            '<i class="fas fa-arrow-right"></i>' +
          '</button>' +
        '</div>' +
        '<p class="dict-help-text">' + I18n.t('selectWord') + '</p>' +
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
      const noteCreator = document.getElementById('note-creator');
      if (noteCreator) {
        noteCreator.style.display = 'none';
        const emptyMsg = noteCreator.closest('#active-tool-content')?.querySelector('.empty-msg');
        if (emptyMsg) emptyMsg.style.display = '';
      }
      document.getElementById('note-input-field').value = '';
      window.getSelection().removeAllRanges();
    },
    
    saveNote: function() {
      const comment = document.getElementById('note-input-field').value;
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
            comment: comment || I18n.t('noComment'),
            color: AppState.selectedNoteColor,
            element: span
          });
          
          if (AppState.activeTool === 'notes') this.renderNotesArea();
          
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
      this.renderNotesArea();
    },
    
    renderNotesArea: function() {
      const container = document.getElementById('active-tool-content');
      let html = '';
      if (AppState.notes.length === 0) {
        html = '<p class="empty-msg">' + I18n.t('noHighlights') + '</p>';
      } else {
        html = '<div class="notes-list-container"><h4><i class="fas fa-highlighter"></i> ' + I18n.t('highlights') + '</h4>';
        AppState.notes.forEach(n => {
          html += `
            <div class="note-item-display" style="background-color: ${n.color}40; border-left: 4px solid ${n.color};">
              <div class="note-item-content">
                <span class="note-item-phrase">"${n.text}"</span>
                <span class="note-item-comment">${n.comment}</span>
              </div>
              <button class="note-delete" onclick="Tools.deleteNote(${n.id})">&times;</button>
            </div>
          `;
        });
        html += '</div>';
      }
      html += `
        <div id="note-creator" class="note-creator-card" style="display:none;">
          <div class="note-creator-header">
            <span data-i18n="highlightText">${I18n.t('highlightText')}</span> "<span id="selected-phrase-display"></span>"
          </div>
          <input type="text" id="note-input-field" data-i18n-placeholder="addNote" placeholder="${I18n.t('addNote')}">
          <div class="note-creator-footer">
            <div class="color-options">
              <span class="color-dot yellow active" data-color="#fef08a" onclick="Tools.setNoteColor('#fef08a', this)"></span>
              <span class="color-dot green" data-color="#bbf7d0" onclick="Tools.setNoteColor('#bbf7d0', this)"></span>
              <span class="color-dot blue" data-color="#bfdbfe" onclick="Tools.setNoteColor('#bfdbfe', this)"></span>
              <span class="color-dot pink" data-color="#fbcfe8" onclick="Tools.setNoteColor('#fbcfe8', this)"></span>
            </div>
            <div class="note-actions">
              <button class="btn-cancel" onclick="Tools.hideNoteCreator()"><span data-i18n="cancel">${I18n.t('cancel')}</span></button>
              <button class="btn-confirm" onclick="Tools.saveNote()"><span data-i18n="confirm">${I18n.t('confirm')}</span></button>
            </div>
          </div>
        </div>
      `;
      container.innerHTML = html;
    },
    
    renderFreeNotes: function() {
      const container = document.getElementById('active-tool-content');
      container.innerHTML = `
        <div class="free-notes-container">
          <h4><i class="fas fa-sticky-note"></i> ${I18n.t('notebook')}</h4>
          <textarea 
            id="free-notes-area" 
            placeholder="${I18n.t('notebookPlaceholder')}" 
            oninput="AppState.freeNotes = this.value"
          >${AppState.freeNotes}</textarea>
          <div class="free-notes-footer">
            <p class="small-info">${I18n.t('autoSave')}</p>
            <button class="btn-confirm" onclick="Tools.confirmFreeNotes()">
              <span data-i18n="confirm">${I18n.t('confirm')}</span>
            </button>
          </div>
        </div>
      `;
      
      const textarea = document.getElementById('free-notes-area');
      if (textarea) textarea.value = AppState.freeNotes;
    },
    
    confirmFreeNotes: function() {
      const textarea = document.getElementById('free-notes-area');
      if (textarea) {
        AppState.freeNotes = textarea.value;
      }
    },
    
    buscarEnDiccionario: async function(texto) {
      const areaHerramientas = document.getElementById('active-tool-content');
      const searchBoxHTML = '<div class="dict-search-wrapper">' +
        '<div class="dict-search-box">' +
          '<i class="fas fa-search"></i>' +
          '<input type="text" id="dict-search-input" placeholder="' + (I18n.t('typeWordPlaceholder') || 'Type a word or phrasal verb...') + '" value="' + texto.replace(/"/g, '&quot;') + '">' +
          '<button class="dict-search-go" onclick="Tools.searchFromInput()">' +
            '<i class="fas fa-arrow-right"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
      areaHerramientas.innerHTML = searchBoxHTML + '<p class="loading-mini"><i class="fas fa-spinner fa-spin"></i> ' + I18n.t('loading') + '...</p>';
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
          areaHerramientas.innerHTML = searchBoxHTML + '<p class="dict-not-found">' + I18n.t('noDefinition') + ' "' + query + '".</p>';
          var searchInput2 = document.getElementById('dict-search-input');
          if (searchInput2) {
            searchInput2.addEventListener('keydown', function(e) {
              if (e.key === 'Enter') Tools.searchFromInput();
            });
          }
          return;
        }
        
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
        console.error('Error en diccionario:', error);
        areaHerramientas.innerHTML = searchBoxHTML + '<p>' + I18n.t('errorDict') + '</p>';
        var searchInput4 = document.getElementById('dict-search-input');
        if (searchInput4) {
          searchInput4.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') Tools.searchFromInput();
          });
        }
      }
    },
    
    traducirTexto: async function(texto) {
      const areaHerramientas = document.getElementById('active-tool-content');
      areaHerramientas.innerHTML = '<p class="loading-mini">' + I18n.t('loading') + '...</p>';
      
      try {
        let langPair = 'en|es';
        let translateLabel = I18n.t('translateFrom');
        
        switch(AppState.currentLanguage) {
          case 'es':
            langPair = 'en|es';
            translateLabel = I18n.t('translateFrom');
            break;
          case 'en':
            langPair = 'es|en';
            translateLabel = I18n.t('translateTo');
            break;
          case 'fr':
            langPair = 'en|fr';
            translateLabel = I18n.t('translateFR');
            break;
          case 'pt':
            langPair = 'en|pt';
            translateLabel = I18n.t('translatePT');
            break;
          default:
            langPair = 'en|es';
            translateLabel = I18n.t('translateFrom');
        }
        
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${langPair}`);
        const data = await res.json();
        const traduccion = data.responseData.translatedText;
        
        areaHerramientas.innerHTML = `
          <div class="translator-card">
            <h4><i class="fas fa-language"></i> ${I18n.t('translate')} <span class="translator-badge">${translateLabel}</span></h4>
            <p class="original-text-small">"${texto}"</p>
            <i class="fas fa-arrow-down"></i>
            <p class="translated-result">${traduccion}</p>
          </div>
        `;
      } catch (e) {
        console.error('Error en traducción:', e);
        areaHerramientas.innerHTML = '<p>' + I18n.t('errorTranslate') + '</p>';
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
        container.innerHTML = '<p class="placeholder-text">' + I18n.t('activateTool') + '</p>';
        return;
      }
      
      var escapeHtml = function(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      };
      
      var html = '<div class="transcript-content">';
      html += '<h4><i class="fas fa-file-audio"></i> ' + I18n.t('transcript') + '</h4>';
      
      extracts.forEach(function(extract) {
        html += '<div class="transcript-extract">';
        html += '<div class="transcript-extract-header">';
        html += '<span class="transcript-extract-number">' + escapeHtml(extract.id) + '</span>';
        html += '<span>' + escapeHtml(extract.context) + '</span>';
        html += '</div>';
        html += '<div class="transcript-text">' + escapeHtml(extract.audio_script).replace(/\n/g, '<br>') + '</div>';
        html += '</div>';
      });
      
      html += '</div>';
      container.innerHTML = html;
    },
    
    showTips: async function(section) {
      const container = document.getElementById('active-tool-content');
      container.innerHTML = '<p class="loading-mini"><i class="fas fa-spinner fa-spin"></i> ' + I18n.t('loading') + '...</p>';
      
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
        console.error('Error cargando tips:', error);
        container.innerHTML = '<p class="error-message">Error cargando tips</p>';
      }
    }
  };
  
  // Inicializar eventos de selección de texto
  document.addEventListener('mouseup', async function(e) {
    if (!AppState.activeTool) return;
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length < 2) return;
    
    if (AppState.activeTool === 'notes') {
      try {
        AppState.currentNoteRange = selection.getRangeAt(0).cloneRange();
        document.getElementById('selected-phrase-display').textContent = text;
        const noteCreator = document.getElementById('note-creator');
        noteCreator.style.display = 'block';
        // Hide the empty-msg sibling inside #active-tool-content so note-creator takes its place
        const emptyMsg = noteCreator.closest('#active-tool-content')?.querySelector('.empty-msg');
        if (emptyMsg) emptyMsg.style.display = 'none';
        document.getElementById('note-input-field').focus();
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
