// js/tools.js
(function() {
  window.Tools = {
    switchTool: function(tool) {
      if (AppState.activeTool === tool) {
        AppState.activeTool = null;
      } else {
        AppState.activeTool = tool;
      }
      
      document.querySelectorAll('.tool-btn-nav').forEach(btn => btn.classList.remove('active'));
      if (AppState.activeTool) {
        const activeBtn = document.getElementById(`tab-${tool}`);
        if (activeBtn) activeBtn.classList.add('active');
      }
      
      const container = document.getElementById('active-tool-content');
      
      switch(AppState.activeTool) {
        case 'notes':
          this.renderNotesArea();
          break;
        case 'freenotes':
          this.renderFreeNotes();
          break;
        case 'dict':
          container.innerHTML = '<p class="placeholder-text">' + I18n.t('selectWord') + '</p>';
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
        default:
          container.innerHTML = '<p class="placeholder-text">' + I18n.t('activateTool') + '</p>';
      }
    },
    
    setNoteColor: function(color, element) {
      AppState.selectedNoteColor = color;
      document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
      element.classList.add('active');
    },
    
    hideNoteCreator: function() {
      document.getElementById('note-creator').style.display = 'none';
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
              <i class="fas fa-check"></i> <span data-i18n="confirm">${I18n.t('confirm')}</span>
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
      areaHerramientas.innerHTML = '<p class="loading-mini">' + I18n.t('loading') + '...</p>';
      
      try {
        let query = texto.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.title === "No Definitions Found") {
          const palabras = query.split(' ');
          if (palabras.length > 1) {
            this.buscarEnDiccionario(palabras[0]);
            return;
          }
          areaHerramientas.innerHTML = `<p>${I18n.t('noDefinition')} "${query}".</p>`;
          return;
        }
        
        const info = data[0];
        let definicionConEjemplo = null;
        let synonymsList = [];
        
        for (const meaning of info.meanings) {
          for (const def of meaning.definitions) {
            if (def.example) {
              definicionConEjemplo = def;
              break;
            }
          }
          if (meaning.synonyms && meaning.synonyms.length > 0) {
            synonymsList = [...synonymsList, ...meaning.synonyms];
          }
        }
        
        const definicion = definicionConEjemplo || info.meanings[0].definitions[0];
        const synonyms = [...new Set(synonymsList)].slice(0, 5);
        
        let ejemploHTML = '';
        if (definicion.example) {
          ejemploHTML = `
            <div class="dict-example-box">
              <p class="dict-example-text">"${definicion.example}"</p>
            </div>
          `;
        }
        
        areaHerramientas.innerHTML = `
          <div class="dict-card-container">
            <button class="dict-close-x" onclick="this.parentElement.remove()">&times;</button>
            <div class="dict-header-row">
              <span class="dict-word-title">${info.word}</span>
              <span class="dict-phonetic-text">${info.phonetic || ''}</span>
              <span class="dict-pos-badge">${info.meanings[0].partOfSpeech}</span>
            </div>
            <p class="dict-definition-text">${definicion.definition}</p>
            ${ejemploHTML}
            <div class="dict-tags-row">
              ${synonyms.map(s => `<span class="dict-tag-pill" onclick="Tools.searchWord('${s}')">${s}</span>`).join('')}
            </div>
          </div>
        `;
        
      } catch (error) {
        console.error('Error en diccionario:', error);
        areaHerramientas.innerHTML = '<p>' + I18n.t('errorDict') + '</p>';
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
        
        let html = `
          <div class="tips-content">
            <h4><i class="fas fa-lightbulb"></i> ${tips.title}</h4>
            <ul>
        `;
        
        tips.tips.forEach(tip => {
          html += `<li>${tip}</li>`;
        });
        
        html += `
            </ul>
          </div>
        `;
        
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
        document.getElementById('note-creator').style.display = 'block';
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
