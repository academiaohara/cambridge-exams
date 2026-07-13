// js/fast-exercises-vocab-theory.js
// Vocabulary theory flow using SunePlay TheoryFlow (aligned with learning)

(function() {
  'use strict';

  var theory = window.SunePlayTheory;

  function buildPvTheoryCards(lessonData) {
    return (lessonData.phrasalVerbs || []).map(function(pv, i) {
      var sections = [];
      if (pv.definition) {
        sections.push({ type: 'explanation', description: pv.definition });
      }
      if (pv.examples && pv.examples.length) {
        sections.push({ type: 'example_list', title: 'Examples', items: pv.examples });
      }
      return {
        id: 'pv-' + i,
        title: pv.verb || ('Phrasal verb ' + (i + 1)),
        sections: sections
      };
    });
  }

  function buildIdTheoryCards(lessonData) {
    return (lessonData.idioms || []).map(function(item, i) {
      var sections = [];
      var definition = item.definition || item.meaning || '';
      if (definition) {
        sections.push({ type: 'explanation', description: definition });
      }
      if (item.usageTip) {
        sections.push({ type: 'remember_box', title: 'Tip', description: item.usageTip });
      }
      if (item.examples && item.examples.length) {
        sections.push({ type: 'example_list', title: 'Examples', items: item.examples });
      }
      return {
        id: 'id-' + i,
        title: item.idiom || item.expression || ('Idiom ' + (i + 1)),
        sections: sections
      };
    });
  }

  function buildWfTheoryCards(lessonData) {
    var cards = [];
    var explanation = lessonData.explanation || {};

    if (explanation.rule) {
      cards.push({
        id: 'wf-rule',
        title: 'Word formation',
        sections: [{ type: 'explanation', description: explanation.rule }]
      });
    }

    (explanation.groups || []).forEach(function(group, gi) {
      var items = (group.examples || []).map(function(ex) {
        return {
          base: ex.base,
          derivatives: [ex.derived]
        };
      });
      cards.push({
        id: 'wf-group-' + gi,
        title: group.suffix ? ('Suffix: ' + group.suffix) : ('Group ' + (gi + 1)),
        subtitle: group.note || '',
        sections: items.length ? [{ type: 'word_formation', title: 'Examples', items: items }] : []
      });
    });

    (lessonData.wordForms || []).forEach(function(wf, wi) {
      var sections = [];
      if (wf.definition) {
        sections.push({ type: 'explanation', description: wf.definition });
      }
      if (wf.example) {
        sections.push({ type: 'example_list', title: 'Example', items: [wf.example] });
      }
      cards.push({
        id: 'wf-word-' + wi,
        title: (wf.base || '') + ' → ' + (wf.derived || ''),
        subtitle: wf.type || '',
        sections: sections
      });
    });

    return cards;
  }

  function buildTheoryUnit(categoryId, lessonData, lessonTitle) {
    var cards = [];
    if (categoryId === 'phrasal-verbs') {
      cards = buildPvTheoryCards(lessonData);
    } else if (categoryId === 'idioms') {
      cards = buildIdTheoryCards(lessonData);
    } else if (categoryId === 'word-formation') {
      cards = buildWfTheoryCards(lessonData);
    }

    return {
      unitId: categoryId + '-' + (lessonData.lessonId || lessonData.id || 'lesson'),
      unitTitle: lessonTitle || lessonData.title || 'Vocabulary',
      theory: { cards: cards }
    };
  }

  function bindTheorySwipe(el, onPrev, onNext) {
    if (!el || el._feVocabTheorySwipeBound) return;
    el._feVocabTheorySwipeBound = true;
    var startX = 0;
    var startY = 0;
    var tracking = false;

    el.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    el.addEventListener('touchend', function(e) {
      if (!tracking) return;
      tracking = false;
      var touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) onNext();
      else onPrev();
    }, { passive: true });

    el.addEventListener('touchcancel', function() {
      tracking = false;
    }, { passive: true });
  }

  function bindTheoryEvents(state) {
    var mount = state.mount;
    if (!mount) return;

    var prevBtn = mount.querySelector('[data-action="theory-prev"]');
    if (prevBtn) prevBtn.onclick = function() {
      if (state.cardIdx > 0) {
        state.cardIdx--;
        renderTheory(state);
      }
    };

    var nextBtn = mount.querySelector('[data-action="theory-next"]');
    if (nextBtn) nextBtn.onclick = function() {
      var cards = (state.unitData.theory && state.unitData.theory.cards) || [];
      if (state.cardIdx < cards.length - 1) {
        state.cardIdx++;
        renderTheory(state);
      } else {
        completeTheory(state);
      }
    };

    mount.querySelectorAll('[data-action="theory-goto"]').forEach(function(dot) {
      dot.onclick = function() {
        var idx = parseInt(dot.getAttribute('data-card-idx'), 10);
        if (!isNaN(idx) && idx !== state.cardIdx) {
          state.cardIdx = idx;
          renderTheory(state);
        }
      };
    });

    var exitBtn = mount.querySelector('[data-action="theory-exit"]');
    if (exitBtn) exitBtn.onclick = function() {
      exitTheory(state);
    };

    mount.querySelectorAll('[data-action="theory-speak"]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var text = btn.getAttribute('data-speak-text');
        if (!text || !theory || !theory.speakText) return;
        mount.querySelectorAll('.sp-speakable--speaking').forEach(function(el) {
          el.classList.remove('sp-speakable--speaking');
        });
        btn.classList.add('sp-speakable--speaking');
        theory.speakText(text, function() {
          btn.classList.remove('sp-speakable--speaking');
        });
      };
    });

    var swipeRoot = mount.querySelector('.sp-theory-shell') || mount.querySelector('.sp-theory-flow');
    bindTheorySwipe(swipeRoot, function() {
      if (state.cardIdx > 0) {
        state.cardIdx--;
        renderTheory(state);
      }
    }, function() {
      var cards = (state.unitData.theory && state.unitData.theory.cards) || [];
      if (state.cardIdx < cards.length - 1) {
        state.cardIdx++;
        renderTheory(state);
      } else {
        completeTheory(state);
      }
    });
  }

  function renderTheory(state) {
    if (!state.mount || !theory || !theory.TheoryFlow) return;
    state.mount.innerHTML = '<div class="sp-lesson sp-lesson--theory">' +
      theory.TheoryFlow(state.unitData, {
        cardIdx: state.cardIdx,
        exitToStage: true
      }) +
    '</div>';
    bindTheoryEvents(state);
    var body = state.mount.querySelector('.sp-theory-card-body');
    if (body) body.scrollTop = 0;
  }

  function exitTheory(state) {
    if (state.fe && state.categoryId) {
      state.fe.openCategory(state.categoryId);
    }
  }

  function completeTheory(state) {
    if (state.onComplete) state.onComplete();
    exitTheory(state);
  }

  function startTheorySession(fe, container, opts) {
    opts = opts || {};
    if (!container || !opts.unitData) return false;

    var cards = (opts.unitData.theory && opts.unitData.theory.cards) || [];
    if (!cards.length) return false;

    container.innerHTML =
      '<div id="sp-lesson-mount" class="sp-lesson-mount">' +
        '<div class="sp-lesson sp-lesson--theory"></div>' +
      '</div>';

    var mount = container.querySelector('#sp-lesson-mount');
    var state = {
      fe: fe,
      container: container,
      mount: mount,
      unitData: opts.unitData,
      categoryId: opts.categoryId,
      cardIdx: 0,
      onComplete: opts.onComplete || null
    };

    window._feVocabTheoryState = state;
    renderTheory(state);
    return true;
  }

  function destroy() {
    window._feVocabTheoryState = null;
  }

  window.FastExercisesVocabTheory = {
    buildTheoryUnit: buildTheoryUnit,
    startTheorySession: startTheorySession,
    destroy: destroy
  };
})();
