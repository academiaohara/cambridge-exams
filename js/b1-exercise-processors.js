// js/b1-exercise-processors.js
// Normalizes B1 Preliminary JSON (flat / PET-specific shapes) into the same canonical
// structure used by B2/C1: exercise.content, question.correct, options as string arrays, etc.

(function() {
  'use strict';

  function sortOptionKeys(keys) {
    return keys.slice().sort(function(a, b) {
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  }

  function optionsObjectToArray(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    return sortOptionKeys(Object.keys(obj)).map(function(k) {
      return String(k).trim().charAt(0) + ') ' + String(obj[k]).trim();
    });
  }

  function sanitizeHtmlTypos(str) {
    if (str == null || typeof str !== 'string') return str;
    return str
      .replace(/<strong</gi, '<strong>')
      .replace(/<\/strong</gi, '</strong>');
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeQuestion(q) {
    if (!q || typeof q !== 'object') return q;
    var out = Object.assign({}, q);
    if (out.question != null && typeof out.question === 'string') {
      out.question = sanitizeHtmlTypos(out.question);
    }
    if (out.answer != null && out.correct == null) {
      out.correct = out.answer;
    }
    if (out.options && typeof out.options === 'object' && !Array.isArray(out.options)) {
      var arr = optionsObjectToArray(out.options);
      if (arr && arr.length) out.options = arr;
    }
    if ((!out.options || !out.options.length) && Array.isArray(out.images)) {
      var sorted = out.images.slice().sort(function(a, b) {
        return String(a.label || '').localeCompare(String(b.label || ''));
      });
      out.options = sorted.map(function(img) {
        var lab = (img.label || 'A').toString().trim().charAt(0);
        var bit = (img.description || img.url || '').toString().trim();
        return lab + ') ' + bit;
      });
    }
    return out;
  }

  function normalizeQuestionsArray(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeQuestion);
  }

  function mergeDescription(ex) {
    if (!ex.description && ex.instructions) {
      ex.description = ex.instructions;
    }
    if (ex.instructions) ex.instructions = sanitizeHtmlTypos(ex.instructions);
    if (ex.description) ex.description = sanitizeHtmlTypos(ex.description);
  }

  function readingPart1(ex) {
    var qs = normalizeQuestionsArray(ex.questions || []);
    qs.forEach(function(q) {
      if (q.notice != null && q.notice !== '') {
        q.notice = sanitizeHtmlTypos(String(q.notice));
      }
      if (!q.question) {
        q.question = q.topic
          ? '<em>' + sanitizeHtmlTypos(String(q.topic)) + '</em>'
          : 'Choose the correct answer.';
      }
    });
    ex.content = {
      title: ex.articleTitle || '',
      text: '',
      questions: qs
    };
    mergeDescription(ex);
    ex._b1PetScoring = true;
    // PET Reading 1: gaps show correct/incorrect inline; footer toggle is redundant.
    ex._b1PetHideAnswerToggle = true;
  }

  function readingPart2(ex) {
    // Batch JSON: tests[0] with people / texts (letter+text) / answers (PET-style)
    if (Array.isArray(ex.tests) && ex.tests.length) {
      var testBlock = ex.tests[0];
      var textsObj = {};
      (testBlock.texts || []).forEach(function(t) {
        var letter = (t.letter || '').toString().trim().toUpperCase().charAt(0);
        if (!letter) return;
        textsObj[letter] = sanitizeHtmlTypos((t.text || '').toString().trim());
      });
      var explainByQ = {};
      (testBlock.answers || []).forEach(function(a) {
        if (a && a.question != null) {
          explainByQ[a.question] = sanitizeHtmlTypos((a.explanation || '').toString());
        }
      });
      var answersArr = testBlock.answers || [];
      var qs = (testBlock.people || []).map(function(p) {
        var n = p.number;
        var body = sanitizeHtmlTypos((p.text || '').toString().trim());
        var correct = '';
        for (var ai = 0; ai < answersArr.length; ai++) {
          var a = answersArr[ai];
          if (a && a.question === n) {
            correct = String(a.answer || '').trim().toUpperCase().charAt(0);
            break;
          }
        }
        return {
          number: n,
          correct: correct,
          explanation: explainByQ[n] || '',
          personText: body,
          question: '<div class="b1-r2-person-body">' + escapeHtml(body).replace(/\n/g, '<br>') + '</div>'
        };
      });
      qs.sort(function(a, b) { return (a.number || 0) - (b.number || 0); });
      ex.content = {
        title: sanitizeHtmlTypos((testBlock.title || '').toString().trim()),
        texts: textsObj,
        questions: qs
      };
      if (!ex.title) ex.title = ex.content.title || ex.part || 'Reading Part 2';
      ex.type = ex.type || 'multiple-matching';
      ex.totalQuestions = qs.length;
      ex._b1PetReading2Ui = true;
      mergeDescription(ex);
      ex._b1PetScoring = true;
      return;
    }

    var textsArr = ex.texts || [];
    var textsObj = {};
    textsArr.forEach(function(t) {
      var id = (t.id || '').toString().trim().toUpperCase();
      if (!id) return;
      var title = sanitizeHtmlTypos((t.title || '').toString().trim());
      var body = sanitizeHtmlTypos((t.text || '').toString().trim());
      textsObj[id] = title ? '### ' + title + '\n\n' + body : body;
    });
    var qs = normalizeQuestionsArray(ex.questions || []).map(function(q) {
      var o = Object.assign({}, q);
      var person = q.person ? sanitizeHtmlTypos(q.person.toString()) : '';
      var who = person ? '<strong>' + person + '</strong>' : '';
      var needs = sanitizeHtmlTypos((q.needs || '').toString());
      o.question = (who ? who + ' — ' : '') + needs;
      return o;
    });
    ex.content = {
      texts: textsObj,
      questions: qs
    };
    mergeDescription(ex);
    ex._b1PetScoring = true;
  }

  function parseExamFolderTestNumber(examId) {
    if (examId == null) return null;
    var m = String(examId).match(/(\d+)/);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return isNaN(n) ? null : n;
  }

  /**
   * New B1 reading3 JSON: { tests: [{ test, title, subtitle, text, questions }], batch, part, level }.
   * Pick the block for this exam folder (e.g. Test35 → test === 35), else first block with text + questions.
   */
  function pickB1Reading3BatchBlock(ex, examId) {
    if (!Array.isArray(ex.tests) || !ex.tests.length) return null;
    var want = parseExamFolderTestNumber(examId);
    var candidates = ex.tests.filter(function(t) {
      return t && typeof t.text === 'string' && t.text.trim() !== '' &&
        Array.isArray(t.questions) && t.questions.length;
    });
    if (!candidates.length) return null;
    if (want != null) {
      for (var i = 0; i < candidates.length; i++) {
        if (parseInt(candidates[i].test, 10) === want) return candidates[i];
      }
    }
    return candidates[0];
  }

  /**
   * New B1 reading4 JSON: batch file with `tests: [{ type: 'gapped-text', content: { text, paragraphs, questions } }]`
   * (same canonical shape as B2 Reading Part 6). Optional `test` number matches the exam folder.
   */
  function pickB1Reading4BatchBlock(ex, examId) {
    if (!Array.isArray(ex.tests) || !ex.tests.length) return null;
    var want = parseExamFolderTestNumber(examId);
    var candidates = ex.tests.filter(function(t) {
      if (!t || typeof t !== 'object') return false;
      var inner = t.content;
      if (!inner || typeof inner !== 'object') return false;
      var typ = (t.type || '').toString();
      if (typ && typ !== 'gapped-text') return false;
      return typeof inner.text === 'string' && inner.text.trim() !== '' &&
        inner.paragraphs && typeof inner.paragraphs === 'object' && !Array.isArray(inner.paragraphs) &&
        Array.isArray(inner.questions) && inner.questions.length > 0;
    });
    if (!candidates.length) return null;
    if (want != null) {
      for (var i = 0; i < candidates.length; i++) {
        if (parseInt(candidates[i].test, 10) === want) return candidates[i];
      }
    }
    return candidates[0];
  }

  /**
   * New B1 reading5 JSON: batch root `{ tests: [{ title, type: 'multiple-choice-text', content: { text, questions[, example] } }], … }`
   * Same cloze shape as B2/C1 reading part 1. Optional `examId` matches the exam folder.
   */
  function pickB1Reading5BatchBlock(ex, examId) {
    if (!Array.isArray(ex.tests) || !ex.tests.length) return null;
    var want = parseExamFolderTestNumber(examId);
    var candidates = ex.tests.filter(function(t) {
      if (!t || typeof t !== 'object') return false;
      var c = t.content;
      if (!c || typeof c !== 'object') return false;
      if (typeof c.text !== 'string' || c.text.trim() === '') return false;
      if (!Array.isArray(c.questions) || !c.questions.length) return false;
      if (c.paragraphs && typeof c.paragraphs === 'object' && !Array.isArray(c.paragraphs) &&
        Object.keys(c.paragraphs).length) {
        return false;
      }
      var typ = (t.type || '').toString();
      if (typ && typ !== 'multiple-choice-text') return false;
      return true;
    });
    if (!candidates.length) return null;
    var folderId = examId != null ? String(examId) : '';
    for (var j = 0; j < candidates.length; j++) {
      if (folderId && candidates[j].examId != null &&
        String(candidates[j].examId) === folderId) {
        return candidates[j];
      }
    }
    if (want != null) {
      for (var i = 0; i < candidates.length; i++) {
        if (parseInt(candidates[i].test, 10) === want) return candidates[i];
      }
    }
    return candidates[0];
  }

  /**
   * Wrap canonical PET-style “try something new” article phrases in [n]…[/n] markers so
   * explanation mode can highlight evidence in the passage (see ExerciseRenderer.processEvidenceMarkers).
   */
  function injectB1ReadingPart3EvidenceMarkers(article) {
    var markers = [
      {
        n: 1,
        s: 'A friend had mentioned it several times and eventually persuaded me to give it a chance.'
      },
      {
        n: 2,
        s: 'I expected it to be interesting, but I also worried that I might not be good enough.'
      },
      {
        n: 3,
        s: 'One thing that really surprised me was how friendly everyone was.'
      },
      {
        n: 4,
        s: 'I became better at solving \nproblems, communicating with different people and staying calm when things changed unexpectedly.'
      },
      {
        n: 5,
        s: 'I\u2019d definitely encourage \nother teenagers to do the same, even if they feel uncertain at first.'
      }
    ];
    var out = article;
    markers.slice().sort(function(a, b) {
      return b.s.length - a.s.length;
    }).forEach(function(m) {
      var idx = out.indexOf(m.s);
      if (idx === -1) return;
      out = out.slice(0, idx) + '[' + m.n + ']' + m.s + '[/' + m.n + ']' + out.slice(idx + m.s.length);
    });
    return out;
  }

  /**
   * B1 Reading Part 3 (batch JSON) or Part 5 (flat article): `appPart` is the section part
   * index from the app (1–6), not necessarily `ex.part` from the file (e.g. "Reading Part 3").
   */
  function readingPart3or5(ex, appPart, examId) {
    var partNum = parseInt(appPart, 10);
    var batchBlock = !isNaN(partNum) && partNum === 3 ? pickB1Reading3BatchBlock(ex, examId) : null;
    if (!batchBlock && !isNaN(partNum) && partNum === 5) {
      batchBlock = pickB1Reading5BatchBlock(ex, examId);
    }
    if (batchBlock) {
      if (!isNaN(partNum) && partNum === 5) {
        var c = batchBlock.content || {};
        var title5 = sanitizeHtmlTypos((batchBlock.title || '').toString().trim());
        var article5 = sanitizeHtmlTypos((c.text || '').toString());
        var qs5 = normalizeQuestionsArray(c.questions || []);
        ex.content = {
          title: title5,
          subtitle: '',
          text: article5,
          questions: qs5
        };
        if (c.example && typeof c.example === 'object') {
          ex.content.example = normalizeQuestion(Object.assign({}, c.example));
        }
        if (batchBlock.description) ex.description = sanitizeHtmlTypos(batchBlock.description);
        if (batchBlock.time != null && batchBlock.time !== '') ex.time = batchBlock.time;
        if (batchBlock.totalQuestions != null && batchBlock.totalQuestions !== '') {
          ex.totalQuestions = batchBlock.totalQuestions;
        } else if (qs5.length) {
          ex.totalQuestions = qs5.length;
        }
        if (batchBlock.type) ex.type = batchBlock.type;
        if (!ex.title) ex.title = title5 || ex.part || 'Reading Part 5';
        mergeDescription(ex);
        ex._b1PetScoring = true;
        return;
      }
      var title = sanitizeHtmlTypos((batchBlock.title || '').toString().trim());
      var subtitle = sanitizeHtmlTypos((batchBlock.subtitle || '').toString().trim());
      var article = sanitizeHtmlTypos((batchBlock.text || '').toString());
      ex.content = {
        title: title,
        subtitle: subtitle,
        text: article,
        questions: normalizeQuestionsArray(batchBlock.questions || [])
      };
      if (ex.content.questions.length && (ex.totalQuestions == null || ex.totalQuestions === 0)) {
        ex.totalQuestions = ex.content.questions.length;
      }
      if (!ex.title) ex.title = title || ex.part || 'Reading Part 3';
      mergeDescription(ex);
      ex._b1PetScoring = true;
      // Same as Reading Part 1: answers are clear in the UI; hide footer "Show correct answer".
      ex._b1PetHideAnswerToggle = true;
      return;
    }

    var title = ex.articleTitle || '';
    var article = sanitizeHtmlTypos((ex.article || '').toString());
    var legacyPart = parseInt(ex.part, 10);
    if (!isNaN(legacyPart) && legacyPart === 3) {
      article = injectB1ReadingPart3EvidenceMarkers(article);
    }
    ex.content = {
      title: title,
      subtitle: '',
      text: article,
      questions: normalizeQuestionsArray(ex.questions || [])
    };
    mergeDescription(ex);
    ex._b1PetScoring = true;
  }

  function readingPart4(ex, examId) {
    var batchBlock = pickB1Reading4BatchBlock(ex, examId);
    if (batchBlock && batchBlock.content && typeof batchBlock.content === 'object') {
      var c = batchBlock.content;
      var paragraphs = {};
      if (c.paragraphs && typeof c.paragraphs === 'object' && !Array.isArray(c.paragraphs)) {
        sortOptionKeys(Object.keys(c.paragraphs)).forEach(function(k) {
          paragraphs[k] = sanitizeHtmlTypos(String(c.paragraphs[k]).trim());
        });
      }
      ex.content = {
        title: sanitizeHtmlTypos((c.title || '').toString().trim()),
        text: sanitizeHtmlTypos((c.text || '').toString()),
        paragraphs: paragraphs,
        questions: normalizeQuestionsArray(c.questions || [])
      };
      ex.type = 'gapped-text';
      if (batchBlock.title && !ex.title) {
        ex.title = sanitizeHtmlTypos((batchBlock.title || '').toString().trim());
      }
      if (batchBlock.time != null && batchBlock.time !== '') ex.time = batchBlock.time;
      if (batchBlock.description) ex.description = sanitizeHtmlTypos(batchBlock.description);
      if (batchBlock.totalQuestions != null && batchBlock.totalQuestions !== '') {
        ex.totalQuestions = batchBlock.totalQuestions;
      } else if (ex.content.questions.length) {
        ex.totalQuestions = ex.content.questions.length;
      }
      mergeDescription(ex);
      ex._b1PetScoring = true;
      return;
    }

    var opts = ex.options;
    var paragraphs = {};
    if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
      sortOptionKeys(Object.keys(opts)).forEach(function(k) {
        paragraphs[k] = String(opts[k]).trim();
      });
    }
    var article = sanitizeHtmlTypos((ex.article || '').toString());
    var gapText = article.replace(/_{3,}/g, '(1)');
    var correct = (ex.answer != null ? ex.answer : (ex.answers && ex.answers[0]) || '').toString().trim();
    ex.content = {
      title: ex.articleTitle || '',
      text: gapText,
      paragraphs: paragraphs,
      questions: [{
        number: 1,
        correct: correct,
        explanation: ex.explanation || ''
      }]
    };
    mergeDescription(ex);
    ex._b1PetScoring = true;
  }

  function readingPart6(ex) {
    var subject = sanitizeHtmlTypos((ex.subject || '').toString()).trim();
    var email = sanitizeHtmlTypos((ex.email || '').toString());
    var answersList = Array.isArray(ex.answers) ? ex.answers.slice() : [];
    answersList.sort(function(a, b) { return (a.number || 0) - (b.number || 0); });
    var byNum = {};
    answersList.forEach(function(a) {
      if (a && a.number != null) byNum[a.number] = a;
    });
    answersList.forEach(function(a) {
      if (!a || a.number == null) return;
      var n = a.number;
      var word = (a.answer || '').toString().trim();
      if (!word) return;
      var re = new RegExp('\\(' + n + '\\)\\s*_{2,}', 'g');
      if (re.test(email)) {
        email = email.replace(re, '(' + n + ') ' + word);
      }
    });
    answersList.forEach(function(a) {
      if (!a || a.number == null) return;
      var n = a.number;
      var word = (a.answer || '').toString().trim();
      if (!word) return;
      var marker = '(' + n + ')';
      if (email.indexOf(marker) === -1) {
        email += '\n\n' + marker + ' ' + word;
      }
    });
    var header = subject ? 'Subject: ' + subject + '\n\n' : '';
    var fullText = header + email;
    // Same layout pipeline as B2/C1 Reading Part 2 (open cloze): `||` splits
    // `renderParagraphs` into separate <p> blocks. Plain newlines in PET emails
    // otherwise collapse into one paragraph and lose structure in the UI.
    var paraChunks = fullText.split(/\n\n+/).map(function(chunk) {
      return String(chunk == null ? '' : chunk)
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, ' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    }).filter(function(s) { return s.length > 0; });
    if (!paraChunks.length) {
      paraChunks.push(fullText.replace(/\r\n/g, '\n').replace(/\n/g, ' ').trim());
    }
    ex.content = {
      text: paraChunks.join('||'),
      questions: answersList.map(function(a) {
        return {
          number: a.number,
          correct: (a.answer || '').toString().trim(),
          explanation: a.explanation || ''
        };
      })
    };
    mergeDescription(ex);
  }

  function listeningFlat(ex) {
    ex.content = {
      questions: normalizeQuestionsArray(ex.questions || [])
    };
    mergeDescription(ex);
  }

  function listeningNestedContent(ex) {
    var inner = ex.content;
    if (!inner || typeof inner !== 'object') return;
    mergeDescription(ex);
    if (inner.audio_script && !ex.content.audio_script) {
      ex.content.audio_script = inner.audio_script;
    }
    var qs = normalizeQuestionsArray(inner.questions || []);
    if (ex.part === 3) {
      qs.forEach(function(q) {
        var n = q.number;
        if (q.question && typeof q.question === 'string') {
          q.question = q.question.replace(/_{3,}/g, '(' + n + ') ...');
        }
      });
    }
    ex.content.questions = qs;
  }

  function writingPart1(ex) {
    var task = ex.task || {};
    var notes = Array.isArray(task.notes) ? task.notes : [];
    var bullets = notes.map(function(n) { return '• ' + n; }).join('\n');
    var prompt = (task.prompt || '').toString();
    var topic = (task.topic || '').toString();
    var body = prompt;
    if (topic) body += '\n\nTopic: ' + topic;
    if (bullets) body += '\n\n' + bullets;
    ex.content = {
      question: body
    };
    mergeDescription(ex);
  }

  function writingPart2(ex) {
    var task = ex.task || {};
    var id = 'b1-writing2';
    var promptParts = [];
    if (task.titlePrompt) promptParts.push('Title: ' + task.titlePrompt);
    if (task.prompt) promptParts.push(task.prompt);
    var notes = Array.isArray(task.notes) ? task.notes : [];
    if (notes.length) promptParts.push(notes.map(function(n) { return '• ' + n; }).join('\n'));
    ex.content = {
      tasks: [{
        id: id,
        type: (ex.type || 'writing').toString(),
        prompt: promptParts.join('\n\n')
      }]
    };
    mergeDescription(ex);
  }

  function processReading(ex, part, examId) {
    var p = parseInt(part, 10);
    if (isNaN(p)) p = 0;
    var t = (ex.type || '').toString();
    if (p === 1) {
      readingPart1(ex);
      return;
    }
    if (p === 2 || t === 'matching') {
      readingPart2(ex);
      return;
    }
    if (p === 3 || t === 'multiple-choice-long-text') {
      readingPart3or5(ex, p, examId);
      return;
    }
    if (p === 4 || t === 'gapped-text') {
      readingPart4(ex, examId);
      return;
    }
    if (p === 5 || t === 'multiple-choice-reading') {
      readingPart3or5(ex, p, examId);
      return;
    }
    if (p === 6 || t === 'gapped-email') {
      readingPart6(ex);
      return;
    }
    if (ex.questions && !ex.content) {
      ex.content = { text: ex.article || '', questions: normalizeQuestionsArray(ex.questions) };
      mergeDescription(ex);
    }
  }

  function processListening(ex, part) {
    if (ex.content && ex.content.questions && Array.isArray(ex.content.questions)) {
      listeningNestedContent(ex);
      return;
    }
    listeningFlat(ex);
  }

  function processWriting(ex, part) {
    var p = parseInt(part, 10);
    if (isNaN(p)) p = 0;
    if (p === 1) writingPart1(ex);
    else if (p === 2) writingPart2(ex);
  }

  function processSpeaking(ex) {
    if (!ex.content) return;
    if (Array.isArray(ex.content.topics) && ex.content.topics.length &&
        (!ex.content.phases || !ex.content.phases.length)) {
      ex.content.phases = ex.content.topics.map(function(top) {
        var qs = (top.questions || []).map(function(line) {
          return typeof line === 'string' ? line : (line && line.text) || '';
        });
        return { topic: top.topic || '', questions: qs };
      });
    }
    mergeDescription(ex);
  }

  /**
   * @param {object} exercise Parsed JSON
   * @param {string} section reading | listening | writing | speaking
   * @param {number} part 1-based part index
   * @returns {object} same exercise mutated (and returned)
   */
  function normalizeExercise(exercise, section, part, examId) {
    if (!exercise || typeof exercise !== 'object') return exercise;
    if (section === 'reading') processReading(exercise, part, examId);
    else if (section === 'listening') processListening(exercise, part);
    else if (section === 'writing') processWriting(exercise, part);
    else if (section === 'speaking') processSpeaking(exercise);
    return exercise;
  }

  window.B1ExerciseProcessors = {
    normalizeExercise: normalizeExercise
  };
})();
