function mapSectionType(subtitle) {
  var s = String(subtitle || '').toLowerCase();
  if (s === 'form') return 'form_table';
  if (s === 'use') return 'bullet_list';
  if (s === 'examples' || s === 'example') return 'example_list';
  if (s === 'useful notes' || s === 'useful words') return 'chips';
  if (s === 'be careful' || s === 'remember') return 'remember_box';
  return 'explanation';
}

function convertGrammarTheorySection(section, cardIndex) {
  var cards = [];
  var cardId = 'theory-card-' + (cardIndex + 1);
  var sections = [];

  (section.content || []).forEach(function(block) {
    var type = mapSectionType(block.subtitle);
    if (type === 'form_table' && block.rows) {
      sections.push({
        type: 'form_table',
        title: block.subtitle || 'Form',
        formula: block.formula || undefined,
        rows: block.rows.map(function(row) {
          return {
            label: row.label || '',
            left: row.left || '',
            right: row.right || undefined
          };
        })
      });
    } else if (type === 'bullet_list' && block.items) {
      sections.push({ type: 'bullet_list', title: block.subtitle || 'Use', items: block.items });
    } else if (type === 'example_list' && block.items) {
      sections.push({ type: 'example_list', title: block.subtitle || 'Examples', items: block.items });
    } else if (type === 'chips' && block.items) {
      sections.push({ type: 'chips', title: block.subtitle || 'Useful words', items: block.items });
    } else if (type === 'remember_box') {
      var notes = block.notes || block.items || [];
      sections.push({
        type: 'remember_box',
        title: block.subtitle || 'Remember',
        items: Array.isArray(notes) ? notes : [notes]
      });
    } else if (block.tableHeaders && block.rows) {
      sections.push({
        type: 'comparison_table',
        title: block.subtitle || 'Compare',
        headers: block.tableHeaders,
        rows: block.rows
      });
    } else if (block.description || block.text) {
      sections.push({
        type: 'explanation',
        title: block.subtitle || '',
        description: block.description || block.text || ''
      });
    }
  });

  if (sections.length) {
    cards.push({
      id: cardId,
      title: section.title || 'Theory',
      subtitle: section.title || '',
      cardType: 'rule_card',
      sections: sections
    });
  }
  return cards;
}

function formatTopicTitle(key) {
  var s = String(key || '').trim();
  if (!s) return 'Topic';
  if (s.indexOf('_') === -1) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

function normalizeVocabWordEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { word: entry, partOfSpeech: '', variant: '' };
  }
  var word = entry.word || '';
  if (!word) return null;
  return {
    word: word,
    partOfSpeech: entry.part_of_speech || entry.pos || '',
    variant: entry.variant || ''
  };
}

function formatPhrasePairExample(phrase, detail) {
  if (!phrase) return '';
  return detail ? ('**' + phrase + '** — ' + detail) : ('**' + phrase + '**');
}

function buildWordFormationItem(wf) {
  var base = wf.base || wf.root || '';
  var derivatives = collectWordFormationDerivatives(wf);
  if (!base && !derivatives.length) return null;
  return { base: base, derivatives: derivatives };
}

function buildCollocationSections(collocations) {
  var sections = [];
  Object.keys(collocations).forEach(function(groupKey) {
    var patterns = collocations[groupKey];
    if (Array.isArray(patterns)) {
      if (!patterns.length) return;
      sections.push({
        type: 'chips',
        title: formatTopicTitle(groupKey),
        items: patterns.map(function(phrase) { return String(phrase || ''); }).filter(Boolean)
      });
      return;
    }
    var patternsText = patterns ? String(patterns) : '';
    if (!patternsText) return;
    sections.push({
      type: 'form_table',
      title: formatTopicTitle(groupKey),
      rows: [{
        label: groupKey,
        left: patternsText
      }]
    });
  });
  return sections;
}

function collectWordFormationDerivatives(wf) {
  var parts = [];
  if (wf.derivatives) {
    if (Array.isArray(wf.derivatives)) {
      parts = wf.derivatives.slice();
    } else if (typeof wf.derivatives === 'object') {
      Object.keys(wf.derivatives).forEach(function(pos) {
        var words = wf.derivatives[pos];
        if (!words) return;
        if (!Array.isArray(words)) words = [words];
        words.forEach(function(w) { if (w) parts.push(w); });
      });
    }
  }
  ['noun', 'verb', 'adjective', 'adverb'].forEach(function(pos) {
    if (!wf[pos]) return;
    var words = Array.isArray(wf[pos]) ? wf[pos] : [wf[pos]];
    words.forEach(function(w) { if (w) parts.push(w); });
  });
  return parts;
}

function buildVocabTheoryCard(unitPrefix, cardIndex, title, subtitle, sections) {
  if (!sections || !sections.length) return null;
  return {
    id: unitPrefix + '-theory-card-' + (cardIndex + 1),
    title: title,
    subtitle: subtitle || '',
    cardType: 'rule_card',
    sections: sections
  };
}

export function buildVocabTheory(unit, unitPrefix) {
  var sections = unit.sections || {};
  var cards = [];
  var cardIndex = 0;

  if (sections.topic_vocabulary && Object.keys(sections.topic_vocabulary).length) {
    var topicSections = [];
    Object.keys(sections.topic_vocabulary).forEach(function(topicKey) {
      var words = sections.topic_vocabulary[topicKey] || [];
      var items = words.map(normalizeVocabWordEntry).filter(Boolean);
      if (!items.length) return;
      topicSections.push({
        type: 'vocab_word_grid',
        title: formatTopicTitle(topicKey),
        items: items
      });
    });
    var topicCard = buildVocabTheoryCard(
      unitPrefix,
      cardIndex++,
      'Topic Vocabulary',
      unit.unitTitle || '',
      topicSections
    );
    if (topicCard) cards.push(topicCard);
  }

  if (sections.phrasal_verbs && sections.phrasal_verbs.length) {
    var pvItems = sections.phrasal_verbs.map(function(pv) {
      return formatPhrasePairExample(pv.verb, pv.meaning);
    }).filter(Boolean);
    var pvCard = buildVocabTheoryCard(
      unitPrefix,
      cardIndex++,
      'Phrasal Verbs',
      '',
      [{ type: 'example_list', title: 'Phrasal verbs', items: pvItems }]
    );
    if (pvCard) cards.push(pvCard);
  }

  if (sections.collocations_patterns && Object.keys(sections.collocations_patterns).length) {
    var collSections = buildCollocationSections(sections.collocations_patterns);
    var collCard = buildVocabTheoryCard(
      unitPrefix,
      cardIndex++,
      'Collocations & Patterns',
      '',
      collSections
    );
    if (collCard) cards.push(collCard);
  }

  if (sections.idioms && sections.idioms.length) {
    var idiomItems = sections.idioms.map(function(idiom) {
      return formatPhrasePairExample(idiom.idiom || idiom.phrase, idiom.meaning);
    }).filter(Boolean);
    var idiomCard = buildVocabTheoryCard(
      unitPrefix,
      cardIndex++,
      'Idioms',
      '',
      [{ type: 'example_list', title: 'Idioms', items: idiomItems }]
    );
    if (idiomCard) cards.push(idiomCard);
  }

  if (sections.word_formation && sections.word_formation.length) {
    var wfItems = sections.word_formation.map(buildWordFormationItem).filter(Boolean);
    var wfCard = buildVocabTheoryCard(
      unitPrefix,
      cardIndex++,
      'Word Formation',
      '',
      [{ type: 'word_formation', title: 'Word families', items: wfItems }]
    );
    if (wfCard) cards.push(wfCard);
  }

  if (!cards.length) {
    cards.push({
      id: unitPrefix + '-theory-card-1',
      title: unit.unitTitle || 'Vocabulary',
      subtitle: unit.unitSubtitle || '',
      cardType: 'rule_card',
      sections: [{
        type: 'bullet_list',
        title: 'Unit focus',
        items: [unit.unitTitle || 'Vocabulary practice']
      }]
    });
  }

  return {
    id: unitPrefix + '-theory',
    title: 'Topic vocabulary',
    shortTitle: 'Vocabulary',
    displayMode: 'swipeable_cards',
    completionRule: { type: 'view_all_cards', required: false },
    cards: cards
  };
}

export function convertTheory(unit, unitPrefix) {
  if (unit.theory && unit.theory.cards) return unit.theory;

  var sections = unit.sections;
  if (Array.isArray(sections)) {
    var theorySections = sections.filter(function(s) { return s.type === 'theory'; });
    if (!theorySections.length) {
      return {
        id: unitPrefix + '-theory',
        title: 'Learn the rule',
        shortTitle: 'Theory',
        displayMode: 'swipeable_cards',
        completionRule: { type: 'view_all_cards', required: true },
        cards: []
      };
    }
    var cards = [];
    theorySections.forEach(function(section, idx) {
      cards = cards.concat(convertGrammarTheorySection(section, idx));
    });
    return {
      id: unitPrefix + '-theory',
      title: 'Learn the rule',
      shortTitle: 'Theory',
      displayMode: 'swipeable_cards',
      completionRule: { type: 'view_all_cards', required: true },
      cards: cards
    };
  }

  return buildVocabTheory(unit, unitPrefix);
}

export function extractLegacyExercises(unit) {
  var exercises = [];
  var sections = unit.sections;

  if (sections && sections.exercises && typeof sections.exercises === 'object' && !Array.isArray(sections.exercises)) {
    Object.keys(sections.exercises).sort().forEach(function(key) {
      exercises.push({ key: key, data: sections.exercises[key] });
    });
    return exercises;
  }

  if (Array.isArray(sections)) {
    sections.filter(function(s) { return s.type === 'exercise'; }).forEach(function(section, idx) {
      var key = section.title ? section.title.charAt(0) : String(idx + 1);
      var letterMatch = String(section.title || '').match(/^([A-Z]):/);
      if (letterMatch) key = letterMatch[1];
      exercises.push({ key: key, data: section });
    });
  }

  return exercises;
}
