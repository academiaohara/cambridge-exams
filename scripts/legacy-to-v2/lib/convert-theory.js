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

function buildVocabTheory(unit, unitPrefix) {
  var focus = [];
  if (unit.sections && unit.sections.topic_vocabulary) {
    Object.keys(unit.sections.topic_vocabulary).forEach(function(key) {
      focus.push(key.replace(/_/g, ' '));
    });
  }
  return {
    id: unitPrefix + '-theory',
    title: 'Topic vocabulary',
    shortTitle: 'Vocabulary',
    displayMode: 'swipeable_cards',
    completionRule: { type: 'view_all_cards', required: false },
    cards: [{
      id: unitPrefix + '-theory-card-1',
      title: unit.unitTitle || 'Vocabulary',
      subtitle: unit.unitSubtitle || '',
      cardType: 'rule_card',
      sections: [{
        type: 'bullet_list',
        title: 'Unit focus',
        items: focus.length ? focus : [unit.unitTitle || 'Vocabulary practice']
      }]
    }]
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
