// js/instruction-i18n.js — Web-friendly instruction text + multilingual display
(function () {
  'use strict';

  var SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt', 'de', 'it', 'ca', 'pl', 'ru', 'zh', 'ar', 'ja', 'ko'];

  // Book-style phrasing → web UI phrasing (keys are legacy text still in some JSON files)
  var BOOK_TO_WEB = {
    'Circle the correct word.': 'Tap the correct word.',
    'Circle the correct word or phrase.': 'Tap the correct word or phrase.',
    'Circle the correct phrase.': 'Tap the correct phrase.',
    'Circle the correct option in each sentence.': 'Tap the correct option in each sentence.',
    'Circle the correct modal phrase in each sentence.': 'Tap the correct modal phrase in each sentence.',
    'Circle the correct question tag in each sentence.': 'Tap the correct question tag in each sentence.',
    'Drag each word to the correct box.': 'Tap each word and assign it to the correct box.',
    'Each of the words in bold is in the wrong sentence. Write the correct words on the lines.': 'Each bold word is in the wrong sentence. Type the correct word for each line.',
    'Each of the words in bold is in the wrong sentence. Rewrite them correctly.': 'Each bold word is in the wrong sentence. Type the correct word for each line.',
    'If a line is correct, put a tick (✓). If there is an extra word in a line, write the word.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'If a line is correct, put a tick (✓). If there is an extra word, write it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'If a line is correct, click OK. If there is an extra word in a line, click on it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'If a line is correct, press OK. If there is an extra word, write it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'Choose the sentence that uses to or for correctly. Click A or B.': 'Choose the sentence that uses to or for correctly. Tap A or B.',
    'Read the text. Some lines contain one extra word that should not be there. Click the extra word. If a line is correct, leave it as it is.': 'Some lines contain one extra word. Tap the extra word. If a line is correct, tap OK.',
    'If the word or phrase in bold is correct, put OK. If it is incorrect, rewrite it correctly on the line.': 'If the word or phrase in bold is correct, tap OK. If it is incorrect, rewrite it correctly.',
    'Complete the crossword. All the answers are words in bold in exercise B.': 'Solve the crossword. The answers are the bold words from the previous exercise.',
    'Phrasal verbs with out, such as puzzle out, are often connected to the idea of finding information. Which of these phrasal verbs with out are also connected to this idea?': 'Phrasal verbs with out often relate to finding information. Tap the ones that fit this meaning.',
    'The prefix il-, as in illogical, is often used to make a positive word negative. Which of the words in bold in the following sentences are negative forms of positive words? Write YES or NO.': 'The prefix il- makes positive words negative. Tap YES or NO for each bold word.'
  };

  var _index = null;
  var _lookup = null;
  var _loadPromise = null;

  function getLang() {
    try {
      var lang = localStorage.getItem('cambridge_translate_lang');
      if (lang && SUPPORTED_LANGS.indexOf(lang) !== -1) return lang;
    } catch (e) { /* ignore */ }
    return 'en';
  }

  function normalize(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) return '';
    if (BOOK_TO_WEB[raw]) return BOOK_TO_WEB[raw];
    return raw
      .replace(/\bCircle the\b/g, 'Tap the')
      .replace(/\bput a tick\b/gi, 'tap OK')
      .replace(/\bput OK\b/g, 'tap OK')
      .replace(/\bClick on\b/g, 'Tap')
      .replace(/\bClick the\b/g, 'Tap the')
      .replace(/\bClick A or B\b/g, 'Tap A or B')
      .replace(/\bDrag each\b/g, 'Tap each')
      .replace(/\bon the lines?\b/gi, 'in the gap')
      .replace(/\bwrite the correct words on the lines\b/gi, 'type the correct word for each line');
  }

  function buildLookup(index) {
    var map = {};
    var strings = index.strings || [];
    var translations = index.translations || {};
    strings.forEach(function (enText, i) {
      SUPPORTED_LANGS.forEach(function (lang) {
        if (!map[lang]) map[lang] = {};
        var row = translations[lang];
        map[lang][enText] = (row && row[i]) ? row[i] : enText;
      });
    });
    return map;
  }

  function ensureLoaded() {
    if (_lookup) return Promise.resolve();
    if (_loadPromise) return _loadPromise;
    _loadPromise = fetch('lang/instructions/index.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load instruction translations');
        return res.json();
      })
      .then(function (data) {
        _index = data;
        _lookup = buildLookup(data);
      })
      .catch(function (err) {
        console.warn('InstructionI18n: could not load translations', err);
        _index = { strings: [], translations: {} };
        _lookup = {};
      });
    return _loadPromise;
  }

  function resolve(text) {
    var normalized = normalize(text);
    if (!normalized) return '';
    var lang = getLang();
    if (lang === 'en') return normalized;
    if (_lookup && _lookup[lang] && _lookup[lang][normalized]) {
      return _lookup[lang][normalized];
    }
    return normalized;
  }

  function resolveSync(text) {
    return resolve(text);
  }

  function refreshInstructions(root) {
    root = root || document;
    root.querySelectorAll('[data-instruction-source]').forEach(function (el) {
      var source = el.getAttribute('data-instruction-source') || '';
      el.textContent = resolve(source);
    });
  }

  window.InstructionI18n = {
    SUPPORTED_LANGS: SUPPORTED_LANGS,
    BOOK_TO_WEB: BOOK_TO_WEB,
    getLang: getLang,
    normalize: normalize,
    resolve: resolve,
    resolveSync: resolveSync,
    ensureLoaded: ensureLoaded,
    refreshInstructions: refreshInstructions
  };

  ensureLoaded();
})();
