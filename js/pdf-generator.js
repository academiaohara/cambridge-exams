// js/pdf-generator.js
// Generador de PDFs de exámenes Cambridge usando pdfmake
(function() {

  // ── Colores y estilos ─────────────────────────────────────────────────────
  var COLORS = {
    primary:     '#1a3a5c',
    secondary:   '#2e7d9e',
    text:        '#1a1a1a',
    explanation: '#555555',
    rule:        '#cccccc',
    white:       '#ffffff'
  };

  var STYLES = {
    coverTitle: {
      fontSize: 28, bold: true, color: COLORS.primary,
      alignment: 'center', margin: [0, 0, 0, 10]
    },
    coverSubtitle: {
      fontSize: 16, color: COLORS.secondary,
      alignment: 'center', margin: [0, 0, 0, 6]
    },
    sectionHeader: {
      fontSize: 16, bold: true, color: COLORS.white,
      fillColor: COLORS.primary, margin: [0, 16, 0, 8]
    },
    partHeader: {
      fontSize: 13, bold: true, color: COLORS.white,
      fillColor: COLORS.secondary, margin: [0, 10, 0, 6]
    },
    instructions: {
      fontSize: 10, italics: true, color: COLORS.text,
      margin: [0, 0, 0, 8]
    },
    passage: {
      fontSize: 10, color: COLORS.text, margin: [0, 0, 0, 8]
    },
    question: {
      fontSize: 10, color: COLORS.text, margin: [0, 2, 0, 2]
    },
    option: {
      fontSize: 10, color: COLORS.text, margin: [12, 0, 0, 1]
    },
    answer: {
      fontSize: 10, bold: true, color: COLORS.text, margin: [0, 2, 0, 0]
    },
    answerExplanation: {
      fontSize: 9, color: COLORS.explanation, margin: [12, 0, 0, 6]
    },
    modelAnswer: {
      fontSize: 10, color: COLORS.text, margin: [0, 0, 0, 10]
    },
    audioScript: {
      fontSize: 10, color: COLORS.text, margin: [0, 0, 0, 6]
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sectionBanner(text) {
    return {
      table: {
        widths: ['*'],
        body: [[{ text: text, style: 'sectionHeader', fillColor: COLORS.primary, margin: [8, 6, 8, 6] }]]
      },
      layout: 'noBorders',
      margin: [0, 14, 0, 8]
    };
  }

  function partBanner(text) {
    return {
      table: {
        widths: ['*'],
        body: [[{ text: text, style: 'partHeader', fillColor: COLORS.secondary, margin: [8, 4, 8, 4] }]]
      },
      layout: 'noBorders',
      margin: [0, 10, 0, 6]
    };
  }

  function hrule() {
    return { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.rule }], margin: [0, 6, 0, 6] };
  }

  function cleanAudioScript(text) {
    if (!text) return '';
    return text.replace(/\[(\d+)\](.*?)\[\/\1\]/g, '$2').replace(/\|\|/g, '\n');
  }

  function splitParagraphs(text) {
    if (!text) return [];
    return text.split('||').map(function(p) { return p.trim(); }).filter(Boolean);
  }

  function optionsArray(options) {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    // object like {A: '...', B: '...'}
    return Object.keys(options).sort().map(function(k) { return k + ') ' + options[k]; });
  }

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  function buildUrl(level, examId, fileName) {
    var base = CONFIG.EXERCISES_URL.replace('Nivel/C1/Exams/', 'Nivel/' + level + '/Exams/');
    return base + examId + '/' + fileName;
  }

  async function fetchJson(url) {
    try {
      var r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  // ── Reading section builder ───────────────────────────────────────────────

  function buildReadingPart(data, partNum, level) {
    if (!data) return [];
    var content = data.content || {};
    var type = data.type || '';
    var items = [];

    // Part header
    var typeLabel = data.title || ('Part ' + partNum);
    items.push(partBanner('Part ' + partNum + '  —  ' + typeLabel));
    items.push({ text: data.description || '', style: 'instructions' });

    // Passage text (paragraphs split by ||)
    if (content.text) {
      splitParagraphs(content.text).forEach(function(para) {
        // Strip gap markers like [37]...[/37]
        var clean = para.replace(/\[(\d+)\](.*?)\[\/\1\]/g, '($1) ___');
        items.push({ text: clean, style: 'passage' });
      });
    }

    // Part-specific question rendering
    if (type === 'transformations') {
      items = items.concat(buildTransformationQuestions(content));
    } else if (type === 'gapped-text') {
      items = items.concat(buildGappedTextQuestions(content));
    } else if (type === 'multiple-matching') {
      items = items.concat(buildMultipleMatchingQuestions(content));
    } else if (type === 'word-formation') {
      items = items.concat(buildWordFormationQuestions(content));
    } else {
      // Default: numbered questions with options
      items = items.concat(buildStandardQuestions(content));
    }

    return items;
  }

  function buildStandardQuestions(content) {
    var items = [];
    var questions = content.questions || [];
    questions.forEach(function(q) {
      var qText = q.number + '.  ' + (q.question || '___________');
      items.push({ text: qText, style: 'question', bold: true });
      optionsArray(q.options).forEach(function(opt) {
        items.push({ text: opt, style: 'option' });
      });
      items.push({ text: '', margin: [0, 4, 0, 0] });
    });
    return items;
  }

  function buildTransformationQuestions(content) {
    var items = [];
    var questions = content.questions || [];
    questions.forEach(function(q) {
      items.push({ text: q.number + '.  ' + (q.firstSentence || ''), style: 'question' });
      items.push({ text: '    Key word: ' + (q.keyWord || ''), style: 'question', bold: true, margin: [12, 0, 0, 2] });
      var line = '    ' + (q.beforeGap || '') + ' ___________________________ ' + (q.afterGap || '');
      items.push({ text: line, style: 'question', margin: [0, 0, 0, 8] });
    });
    return items;
  }

  function buildGappedTextQuestions(content) {
    var items = [];
    // Questions are gaps in the text — just show the sentences A-G options
    var questions = content.questions || [];
    questions.forEach(function(q) {
      items.push({ text: q.number + '.  ___________', style: 'question' });
    });
    if (content.paragraphs) {
      items.push({ text: '', margin: [0, 8, 0, 0] });
      items.push({ text: 'Opciones de párrafo:', style: 'question', bold: true, margin: [0, 0, 0, 4] });
      Object.keys(content.paragraphs).sort().forEach(function(k) {
        items.push({ text: k + ')  ' + content.paragraphs[k], style: 'option' });
      });
    }
    return items;
  }

  function buildMultipleMatchingQuestions(content) {
    var items = [];
    // Show texts if present
    if (content.texts) {
      Object.keys(content.texts).sort().forEach(function(k) {
        items.push({ text: k + ':', style: 'question', bold: true, margin: [0, 6, 0, 2] });
        var cleaned = (content.texts[k] || '').replace(/\[(\d+)\](.*?)\[\/\1\]/g, '$2').replace(/###[^\n]*/g, '').trim();
        items.push({ text: cleaned, style: 'passage', margin: [12, 0, 0, 4] });
      });
    }
    var questions = content.questions || [];
    questions.forEach(function(q) {
      items.push({ text: q.number + '.  ' + (q.question || ''), style: 'question' });
      items.push({ text: '', margin: [0, 2, 0, 0] });
    });
    return items;
  }

  function buildWordFormationQuestions(content) {
    var items = [];
    var questions = content.questions || [];
    questions.forEach(function(q) {
      items.push({ text: q.number + '.  ___________ (' + (q.word || '') + ')', style: 'question' });
    });
    return items;
  }

  // ── Listening section builder ─────────────────────────────────────────────

  function buildListeningPart(data, partNum) {
    if (!data) return [];
    var items = [];
    items.push(partBanner('Part ' + partNum + '  —  ' + (data.title || 'Listening Part ' + partNum)));
    items.push({ text: data.instructions || data.description || '', style: 'instructions' });

    var extracts = data.extracts || [];
    if (extracts.length > 0) {
      extracts.forEach(function(extract, ei) {
        if (extract.context && extracts.length > 1) {
          items.push({ text: 'Extract ' + (ei + 1) + ': ' + extract.context, style: 'question', italics: true, margin: [0, 4, 0, 4] });
        }
        var questions = extract.questions || [];
        questions.forEach(function(q) {
          var qText = q.number + '.  ' + (q.question || '___________');
          items.push({ text: qText, style: 'question', bold: true });
          optionsArray(q.options).forEach(function(opt) {
            items.push({ text: opt, style: 'option' });
          });
          items.push({ text: '', margin: [0, 4, 0, 0] });
        });
      });
    } else {
      // Part 4 style
      var questions = data.questions || [];
      questions.forEach(function(q) {
        var qText = q.number + '.  ' + (q.question || '___________');
        items.push({ text: qText, style: 'question', bold: true });
        optionsArray(q.options).forEach(function(opt) {
          items.push({ text: opt, style: 'option' });
        });
        items.push({ text: '', margin: [0, 4, 0, 0] });
      });
    }

    return items;
  }

  // ── Writing section builder ───────────────────────────────────────────────

  function buildWritingPart1(data) {
    if (!data) return [];
    var content = data.content || {};
    var items = [];
    items.push(partBanner('Part 1  —  Essay'));
    items.push({ text: data.description || '', style: 'instructions' });
    if (content.question) {
      items.push({ text: content.question, style: 'question', margin: [0, 0, 0, 8] });
    }
    var notes = content.notes || {};
    var effectsList = notes.effects || notes[Object.keys(notes)[0]] || [];
    var opinionsList = notes.opinions || [];
    if (effectsList.length) {
      items.push({ text: 'Notes:', style: 'question', bold: true });
      effectsList.forEach(function(e) { items.push({ text: '•  ' + e, style: 'option' }); });
    }
    if (opinionsList.length) {
      items.push({ text: 'Ideas:', style: 'question', bold: true, margin: [0, 6, 0, 2] });
      opinionsList.forEach(function(o) { items.push({ text: '•  ' + o, style: 'option' }); });
    }
    if (content.wordLimit) {
      items.push({ text: 'Word limit: ' + content.wordLimit, style: 'instructions', margin: [0, 8, 0, 0] });
    }
    return items;
  }

  function buildWritingPart2(data) {
    if (!data) return [];
    var content = data.content || {};
    var items = [];
    items.push(partBanner('Part 2  —  Writing Task'));
    items.push({ text: data.description || '', style: 'instructions' });
    var tasks = content.tasks || [];
    tasks.forEach(function(task, i) {
      items.push({ text: (i + 1) + '.  ' + (task.title || task.type || ''), style: 'question', bold: true, margin: [0, 6, 0, 4] });
      if (task.prompt) {
        items.push({ text: task.prompt, style: 'question', margin: [12, 0, 0, 6] });
      }
    });
    return items;
  }

  // ── Answer Key builder ────────────────────────────────────────────────────

  function buildAnswerKeyReading(readingParts, level) {
    var items = [];
    readingParts.forEach(function(data, idx) {
      if (!data) return;
      var partNum = idx + 1;
      items.push({ text: 'Part ' + partNum, style: 'partHeader', fontSize: 11, bold: true, color: COLORS.secondary, margin: [0, 8, 0, 4] });
      var content = data.content || {};
      var questions = content.questions || [];
      questions.forEach(function(q) {
        var ans = q.correct || q.answer || '';
        var expText = q.explanation || '';
        items.push({ text: q.number + '.  ' + ans, style: 'answer' });
        if (expText) {
          items.push({ text: expText, style: 'answerExplanation' });
        }
      });
    });
    return items;
  }

  function buildAnswerKeyListening(listeningParts) {
    var items = [];
    listeningParts.forEach(function(data, idx) {
      if (!data) return;
      var partNum = idx + 1;
      items.push({ text: 'Part ' + partNum, style: 'partHeader', fontSize: 11, bold: true, color: COLORS.secondary, margin: [0, 8, 0, 4] });
      var extracts = data.extracts || [];
      if (extracts.length > 0) {
        extracts.forEach(function(extract) {
          var questions = extract.questions || [];
          questions.forEach(function(q) {
            var ans = q.answer || q.correct || '';
            items.push({ text: q.number + '.  ' + ans, style: 'answer' });
            if (q.explanation) {
              items.push({ text: q.explanation, style: 'answerExplanation' });
            }
          });
        });
      } else {
        var questions = data.questions || [];
        questions.forEach(function(q) {
          var ans = q.answer || q.correct || '';
          items.push({ text: q.number + '.  ' + ans, style: 'answer' });
          if (q.explanation) {
            items.push({ text: q.explanation, style: 'answerExplanation' });
          }
        });
      }
    });
    return items;
  }

  function buildAnswerKeyWriting(w1, w2) {
    var items = [];
    if (w1 && w1.content && w1.content.modelAnswer) {
      items.push({ text: 'Writing Part 1 — Model Answer', fontSize: 11, bold: true, color: COLORS.secondary, margin: [0, 8, 0, 4] });
      var paras = w1.content.modelAnswer.split('\n').filter(function(p) { return p.trim(); });
      paras.forEach(function(p) {
        items.push({ text: p.trim(), style: 'modelAnswer' });
      });
    }
    if (w2 && w2.content && w2.content.tasks) {
      items.push({ text: 'Writing Part 2 — Model Answers', fontSize: 11, bold: true, color: COLORS.secondary, margin: [0, 10, 0, 4] });
      w2.content.tasks.forEach(function(task) {
        items.push({ text: task.title || task.type || '', bold: true, fontSize: 10, margin: [0, 6, 0, 2] });
        if (task.modelAnswer) {
          var paras = task.modelAnswer.split('\n').filter(function(p) { return p.trim(); });
          paras.forEach(function(p) {
            items.push({ text: p.trim(), style: 'modelAnswer' });
          });
        }
      });
    }
    return items;
  }

  // ── Audioscript builder ───────────────────────────────────────────────────

  function buildAudioscripts(listeningParts) {
    var items = [];
    listeningParts.forEach(function(data, idx) {
      if (!data) return;
      var partNum = idx + 1;
      items.push({ text: 'Listening Part ' + partNum, fontSize: 11, bold: true, color: COLORS.secondary, margin: [0, 8, 0, 4] });
      var extracts = data.extracts || [];
      if (extracts.length > 0) {
        extracts.forEach(function(extract, ei) {
          if (extracts.length > 1) {
            items.push({ text: 'Extract ' + (ei + 1), style: 'question', bold: true, margin: [0, 4, 0, 2] });
          }
          var script = extract.audio_script || data.content && data.content.audio_script || '';
          if (script) {
            var cleaned = cleanAudioScript(script);
            cleaned.split('\n').forEach(function(line) {
              if (line.trim()) {
                items.push({ text: line.trim(), style: 'audioScript' });
              }
            });
          }
        });
      } else {
        var script = (data.content && data.content.audio_script) || data.audio_script || '';
        if (script) {
          var cleaned = cleanAudioScript(script);
          cleaned.split('\n').forEach(function(line) {
            if (line.trim()) {
              items.push({ text: line.trim(), style: 'audioScript' });
            }
          });
        }
      }
      items.push(hrule());
    });
    return items;
  }

  // ── Main generate function ────────────────────────────────────────────────

  window.PdfGenerator = {
    generate: async function(examId, btn) {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generando PDF...';
      }

      try {
        var level = AppState.currentLevel || 'B2';
        var readingCount = (level === 'C1') ? 8 : 7;
        var listeningCount = 4;

        // Fetch all JSONs in parallel
        var readingUrls = [];
        for (var i = 1; i <= readingCount; i++) {
          readingUrls.push(buildUrl(level, examId, 'reading' + i + '.json'));
        }
        var listeningUrls = [];
        for (var j = 1; j <= listeningCount; j++) {
          listeningUrls.push(buildUrl(level, examId, 'listening' + j + '.json'));
        }
        var writingUrls = [
          buildUrl(level, examId, 'writing1.json'),
          buildUrl(level, examId, 'writing2.json')
        ];

        var allUrls = readingUrls.concat(listeningUrls).concat(writingUrls);
        var results = await Promise.allSettled(allUrls.map(fetchJson));

        var readingParts  = results.slice(0, readingCount).map(function(r) { return r.status === 'fulfilled' ? r.value : null; });
        var listeningParts = results.slice(readingCount, readingCount + listeningCount).map(function(r) { return r.status === 'fulfilled' ? r.value : null; });
        var writingParts  = results.slice(readingCount + listeningCount).map(function(r) { return r.status === 'fulfilled' ? r.value : null; });

        var w1 = writingParts[0];
        var w2 = writingParts[1];

        var levelTitle = level === 'C1' ? 'Cambridge English: C1 Advanced' : 'Cambridge English: B2 First';
        var testNum = examId.replace('Test', '');
        var filename = 'Cambridge-' + level + '-Test' + testNum + '.pdf';

        // ── Build doc content ─────────────────────────────────────────────
        var content = [];

        // 1. Cover
        content.push({ text: levelTitle, style: 'coverTitle', margin: [0, 60, 0, 10] });
        content.push({ text: 'Test ' + testNum + ' — Practice Exam', style: 'coverSubtitle' });
        content.push(hrule());
        content.push({ text: '', margin: [0, 20, 0, 0] });

        // 2. Reading & Use of English
        content.push(sectionBanner('READING & USE OF ENGLISH'));
        readingParts.forEach(function(data, idx) {
          content = content.concat(buildReadingPart(data, idx + 1, level));
          content.push(hrule());
        });

        // 3. Listening
        content.push({ text: '', pageBreak: 'before' });
        content.push(sectionBanner('LISTENING'));
        listeningParts.forEach(function(data, idx) {
          content = content.concat(buildListeningPart(data, idx + 1));
          content.push(hrule());
        });

        // 4. Writing
        content.push({ text: '', pageBreak: 'before' });
        content.push(sectionBanner('WRITING'));
        content = content.concat(buildWritingPart1(w1));
        content.push(hrule());
        content = content.concat(buildWritingPart2(w2));

        // 5. Answer Key
        content.push({ text: '', pageBreak: 'before' });
        content.push(sectionBanner('ANSWER KEY'));
        content.push({ text: 'Reading & Use of English', fontSize: 12, bold: true, color: COLORS.primary, margin: [0, 6, 0, 4] });
        content = content.concat(buildAnswerKeyReading(readingParts, level));
        content.push({ text: '', margin: [0, 10, 0, 0] });
        content.push({ text: 'Listening', fontSize: 12, bold: true, color: COLORS.primary, margin: [0, 6, 0, 4] });
        content = content.concat(buildAnswerKeyListening(listeningParts));
        content.push({ text: '', margin: [0, 10, 0, 0] });
        content.push({ text: 'Writing', fontSize: 12, bold: true, color: COLORS.primary, margin: [0, 6, 0, 4] });
        content = content.concat(buildAnswerKeyWriting(w1, w2));

        // 6. Audioscripts
        content.push({ text: '', pageBreak: 'before' });
        content.push(sectionBanner('AUDIOSCRIPTS'));
        content = content.concat(buildAudioscripts(listeningParts));

        // ── pdfmake doc definition ────────────────────────────────────────
        var docDefinition = {
          pageSize: 'A4',
          pageMargins: [60, 50, 60, 50],
          content: content,
          styles: {
            coverTitle:       { fontSize: 28, bold: true, color: COLORS.primary, alignment: 'center' },
            coverSubtitle:    { fontSize: 16, color: COLORS.secondary, alignment: 'center' },
            sectionHeader:    { fontSize: 14, bold: true, color: COLORS.white },
            partHeader:       { fontSize: 11, bold: true, color: COLORS.white },
            instructions:     { fontSize: 10, italics: true, color: COLORS.text },
            passage:          { fontSize: 10, color: COLORS.text },
            question:         { fontSize: 10, color: COLORS.text },
            option:           { fontSize: 10, color: COLORS.text },
            answer:           { fontSize: 10, bold: true, color: COLORS.text },
            answerExplanation:{ fontSize: 9,  color: COLORS.explanation },
            modelAnswer:      { fontSize: 10, color: COLORS.text },
            audioScript:      { fontSize: 10, color: COLORS.text }
          },
          defaultStyle: {
            font: 'Helvetica',
            fontSize: 10,
            color: COLORS.text
          },
          footer: function(currentPage, pageCount) {
            return {
              text: 'Page ' + currentPage + ' of ' + pageCount,
              alignment: 'center',
              fontSize: 8,
              color: '#888888',
              margin: [0, 10, 0, 0]
            };
          }
        };

        pdfMake.createPdf(docDefinition).download(filename);

      } catch (err) {
        console.error('PDF generation error:', err);
        alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '📄 Descargar PDF del examen';
        }
      }
    }
  };

})();
