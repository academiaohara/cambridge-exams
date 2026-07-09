// js/learning-crossword.js
// Learning-path crosswords: flat clue list, definition-style clues, unit vocabulary only.

(function () {
  'use strict';

  var CW_CLUE_SEP = ' | ';
  var _dictPromise = null;
  var _dictByWord = null;

  function normalizeKey(word) {
    return String(word || '').toLowerCase().trim();
  }

  function splitWordTokens(text) {
    return String(text || '')
      .split(/\s*\/\s*/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function stripLetterCount(clue) {
    return String(clue || '').replace(/\s*\(\d+\)\s*$/, '').trim();
  }

  function legacyClueToBlankPhrase(clue) {
    var text = stripLetterCount(clue);
    if (!text) return '';
    return text.replace(/\.{2,}/g, '___').replace(/\u2026+/g, '___').trim();
  }

  function extractBoldWords(sentence) {
    if (!sentence) return [];
    var out = [];
    var re = /\*\*([^*]+)\*\*/g;
    var match;
    while ((match = re.exec(sentence))) {
      splitWordTokens(match[1]).forEach(function (token) {
        token.split(/\s+/).forEach(function (part) {
          if (part) out.push(part);
        });
      });
    }
    return out;
  }

  function addWordEntry(map, word, meta) {
    var key = normalizeKey(word);
    if (!key) return;
    if (!map[key]) {
      map[key] = Object.assign({ word: word }, meta || {});
      return;
    }
    if (meta && meta.definition && !map[key].definition) {
      map[key].definition = meta.definition;
    }
    if (meta && meta.type && !map[key].type) map[key].type = meta.type;
  }

  function extractUnitWords(sections) {
    sections = sections || {};
    var map = {};

    if (sections.topic_vocabulary) {
      Object.keys(sections.topic_vocabulary).forEach(function (topic) {
        (sections.topic_vocabulary[topic] || []).forEach(function (entry) {
          splitWordTokens(entry.word).forEach(function (token) {
            token.split(/\s+/).forEach(function (part) {
              addWordEntry(map, part, { type: 'vocabulary' });
            });
          });
        });
      });
    }

    (sections.phrasal_verbs || []).forEach(function (pv) {
      if (!pv || !pv.verb) return;
      addWordEntry(map, pv.verb, { definition: pv.meaning || '', type: 'phrasal-verb' });
      pv.verb.split(/\s+/).forEach(function (part) {
        addWordEntry(map, part, { definition: pv.meaning || '', type: 'phrasal-verb' });
      });
    });

    (sections.word_formation || []).forEach(function (wf) {
      if (wf && wf.base) addWordEntry(map, wf.base, { type: 'vocabulary' });
      var derivs = wf && wf.derivatives;
      if (!derivs) return;
      if (Array.isArray(derivs)) {
        derivs.forEach(function (d) {
          if (typeof d === 'string') addWordEntry(map, d, { type: 'vocabulary' });
          else if (d && d.word) addWordEntry(map, d.word, { type: 'vocabulary' });
        });
      } else if (typeof derivs === 'object') {
        Object.keys(derivs).forEach(function (pos) {
          var words = derivs[pos];
          if (!Array.isArray(words)) words = [words];
          words.forEach(function (w) {
            if (w) addWordEntry(map, w, { type: 'vocabulary' });
          });
        });
      }
    });

    if (sections.collocations_patterns) {
      Object.keys(sections.collocations_patterns).forEach(function (group) {
        (sections.collocations_patterns[group] || []).forEach(function (phrase) {
          String(phrase || '').split(/\s+/).forEach(function (part) {
            var cleaned = part.replace(/[(),]/g, '');
            if (/^[a-zA-Z]{2,}$/.test(cleaned)) addWordEntry(map, cleaned, { type: 'vocabulary' });
          });
        });
      });
    }

    (sections.idioms || []).forEach(function (idiom) {
      if (!idiom) return;
      if (idiom.phrase) addWordEntry(map, idiom.phrase, { definition: idiom.meaning || '', type: 'idiom' });
      if (idiom.idiom) addWordEntry(map, idiom.idiom, { definition: idiom.meaning || '', type: 'idiom' });
    });

    var exercises = sections.exercises || {};
    Object.keys(exercises).forEach(function (key) {
      var ex = exercises[key];
      if (!ex) return;
      (ex.words || []).forEach(function (w) { addWordEntry(map, w, { type: 'vocabulary' }); });
      (ex.questions || []).forEach(function (q) {
        if (q && q.answer) addWordEntry(map, q.answer, { type: 'vocabulary' });
        extractBoldWords(q && q.sentence).forEach(function (w) {
          addWordEntry(map, w, { type: 'vocabulary' });
        });
      });
      ['across', 'down'].forEach(function (dir) {
        (ex[dir] || []).forEach(function (item) {
          if (item && item.answer) addWordEntry(map, item.answer, { type: 'vocabulary' });
        });
      });
    });

    return map;
  }

  function buildDictionaryIndex(entries) {
    var byWord = {};
    (entries || []).forEach(function (entry) {
      var key = normalizeKey(entry.word);
      if (!key || byWord[key]) return;
      byWord[key] = entry;
    });
    return byWord;
  }

  function lookupDefinition(answer, unitWords, dictByWord) {
    var key = normalizeKey(answer);
    var unitEntry = unitWords[key];
    if (unitEntry && unitEntry.definition) return unitEntry.definition;
    var dictEntry = dictByWord && dictByWord[key];
    if (dictEntry && dictEntry.definition) return dictEntry.definition;
    return '';
  }

  function formatClueDisplay(clue) {
    if (!clue) return '';
    var sep = clue.indexOf(CW_CLUE_SEP);
    if (sep === -1) return clue;
    var definition = clue.slice(0, sep).trim();
    var blankPart = clue.slice(sep + CW_CLUE_SEP.length).trim();
    if (!definition) return blankPart;
    if (!blankPart) return definition;
    return definition + ' — ' + blankPart;
  }

  function buildLearningClue(answer, legacyClue, unitWords, dictByWord) {
    var definition = lookupDefinition(answer, unitWords, dictByWord);
    var blankPhrase = legacyClueToBlankPhrase(legacyClue);
    if (definition && blankPhrase && blankPhrase.indexOf('___') !== -1) {
      return formatClueDisplay(definition + CW_CLUE_SEP + blankPhrase);
    }
    if (definition) return definition;
    if (blankPhrase) return blankPhrase;
    return stripLetterCount(legacyClue);
  }

  function flattenLegacyCrosswordItems(exercise) {
    var merged = [];
    ['across', 'down'].forEach(function (dir) {
      (exercise[dir] || []).forEach(function (item) {
        merged.push({
          num: item.num,
          answer: item.answer,
          legacyClue: item.clue || ''
        });
      });
    });
    merged.sort(function (a, b) { return (a.num || 0) - (b.num || 0); });
    return merged.map(function (item, index) {
      return {
        num: index + 1,
        answer: item.answer,
        legacyClue: item.legacyClue
      };
    });
  }

  function isUnitWord(answer, unitWords) {
    return !!unitWords[normalizeKey(answer)];
  }

  function prepareLegacyCrosswordItems(exercise, sections, dictByWord) {
    var unitWords = extractUnitWords(sections);
    return flattenLegacyCrosswordItems(exercise)
      .filter(function (item) { return isUnitWord(item.answer, unitWords); })
      .map(function (item, index) {
        return {
          num: index + 1,
          answer: item.answer,
          clue: buildLearningClue(item.answer, item.legacyClue, unitWords, dictByWord)
        };
      });
  }

  function enrichCrosswordClueItem(item, unitWords, dictByWord) {
    if (!item || !item.answer) return item;
    var legacyClue = item.clue || '';
    return Object.assign({}, item, {
      clue: buildLearningClue(item.answer, legacyClue, unitWords, dictByWord),
      clueNumber: item.clueNumber != null ? item.clueNumber : item.num
    });
  }

  function enrichCrosswordExercise(exercise, sections, dictByWord) {
    if (!exercise) return exercise;
    var unitWords = extractUnitWords(sections);
    var items = (exercise.items || []).slice();

    if (!items.length && (exercise.across || exercise.down)) {
      items = flattenLegacyCrosswordItems(exercise).map(function (entry, index) {
        return {
          id: 'cw-' + index,
          clueNumber: entry.num,
          answer: entry.answer,
          clue: entry.legacyClue,
          letterCount: String(entry.answer || '').replace(/\s+/g, '').length
        };
      });
    }

    items = items
      .filter(function (item) { return isUnitWord(item.answer, unitWords); })
      .sort(function (a, b) {
        return (a.clueNumber != null ? a.clueNumber : a.num || 0) -
          (b.clueNumber != null ? b.clueNumber : b.num || 0);
      })
      .map(function (item, index) {
        var enriched = enrichCrosswordClueItem(item, unitWords, dictByWord);
        enriched.clueNumber = index + 1;
        if (enriched.letterCount == null) {
          enriched.letterCount = String(enriched.answer || '').replace(/\s+/g, '').length;
        }
        delete enriched.direction;
        return enriched;
      });

    exercise.items = items;
    exercise.instructions = 'Complete each word using the definition.';
    exercise.studentInstruction = exercise.instructions;
    delete exercise.across;
    delete exercise.down;
    return exercise;
  }

  async function loadSourceSections(unitData) {
    if (!unitData) return null;
    if (unitData.sections) return unitData.sections;
    var sourceFile = unitData.migrationMeta && unitData.migrationMeta.sourceFile;
    if (!sourceFile) return null;
    try {
      var res = await fetch(sourceFile);
      if (!res.ok) return null;
      var legacy = await res.json();
      return legacy.sections || null;
    } catch (e) {
      return null;
    }
  }

  window.LearningCrossword = {
    CW_CLUE_SEP: CW_CLUE_SEP,

    ensureDictionary: async function () {
      if (_dictByWord) return _dictByWord;
      if (_dictPromise) return _dictPromise;
      _dictPromise = fetch('data/vocabulary/dictionary.json')
        .then(function (res) { return res.ok ? res.json() : { entries: [] }; })
        .then(function (data) {
          _dictByWord = buildDictionaryIndex(data.entries || []);
          return _dictByWord;
        })
        .catch(function () {
          _dictByWord = {};
          return _dictByWord;
        });
      return _dictPromise;
    },

    getDictionary: function () {
      return _dictByWord || {};
    },

    extractUnitWords: extractUnitWords,
    formatClueDisplay: formatClueDisplay,
    buildLearningClue: buildLearningClue,
    prepareLegacyCrosswordItems: prepareLegacyCrosswordItems,
    enrichCrosswordExercise: enrichCrosswordExercise,

    enrichV2Unit: async function (unitData) {
      if (!unitData) return unitData;
      await this.ensureDictionary();
      var sections = await loadSourceSections(unitData);
      if (!sections) return unitData;

      var banks = unitData.contentBanks || {};
      (banks.exercises || []).forEach(function (exercise) {
        if (exercise.exerciseType !== 'crossword_clues' &&
            exercise.formatType !== 'crossword_clues' &&
            !(exercise.items || []).some(function (it) { return it.formatType === 'crossword_clues'; })) {
          return;
        }
        enrichCrosswordExercise(exercise, sections, _dictByWord);
      });
      return unitData;
    }
  };
})();
