#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rendererPath = path.join(__dirname, '../js/sune-play/practice-screen-renderer.js');
const code = fs.readFileSync(rendererPath, 'utf8');
const start = code.indexOf('var CONJ_CUE_MODIFIERS');
const end = code.indexOf('function assembleConjugationSentence');
const block = code.slice(start, end);

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(block + '\nthis.buildConjugationScaffold = buildConjugationScaffold;', sandbox);

const buildConjugationScaffold = sandbox.buildConjugationScaffold;
const unitPath = process.argv[2] || path.join(__dirname, '../data/Course/B1/Unit4.v2.json');
const data = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
const ex = data.contentBanks.exercises.find(function(e) { return e.id === 'b1-u4-ex-c'; });

let failed = 0;
ex.items.forEach(function(item) {
  var payload = {
    displayPrompt: item.displayPrompt,
    prompt: item.prompt,
    answer: item.answer,
    acceptedAnswers: item.acceptedAnswers
  };
  var scaffold = buildConjugationScaffold(payload);
  console.log('---', item.displayPrompt);
  console.log('ANS:', item.answer);
  if (!scaffold) {
    console.log('  FAIL: no scaffold');
    failed++;
    return;
  }
  var rendered = [];
  scaffold.segments.forEach(function(seg) {
    if (seg.type === 'fixed') {
      rendered.push('[' + seg.text + ']');
      console.log('  FIXED:', seg.text);
    } else {
      var label = seg.showVerbTile ? seg.baseVerb : '(none)';
      rendered.push('___(' + label + ')___');
      console.log('  GAP:', seg.expectedText, '| tile:', label);
    }
  });
  console.log('  =>', rendered.join(' '));
});

process.exit(failed ? 1 : 0);
