# Sune Play v2 — Course Explanation System Design

**Scope:** Learning/Course exercises only (`js/sune-play/`, `data/Course/**/*.v2.json`)  
**Out of scope:** Cambridge Exams, B1 Grammar Lesson, Fast Learning, Video Stories, Micro-learning  
**Status:** Analysis & design only — no implementation

---

## Current system (baseline)

| Layer | Component | What it shows |
|-------|-----------|---------------|
| Immediate | `FeedbackSheet` | ✓/✗ icon, random encouragement title, `Correct: …` if wrong |
| On demand | `LessonExplanation` (`js/lesson-explanation.js`) | **Question** · **Correct answer** · **Why** (single `explanation` string from JSON) |
| Trigger | `#sp-explain-btn` | Visible after check (or before check for sequential `column_matching`) |

**Check result object** (`practice-screen-renderer.js` → `checkScreen`):

```js
{
  correct, explanation, correctAnswer, userAnswer,
  lifeLoss, shouldRequeue, partial,
  wordCountInvalid, allDone, handled, ...
}
```

**Explanation source:** `item.explanation`, `exercise.explanation`, `gap.explanation`, `pair.explanation`, or runtime messages (e.g. verb bank step 1). Content authors write these as short markdown strings in unit JSON.

**Known gaps today:**
- `stative_sorting` — `checkScreen` does not populate `explanation` from payload (only `userAnswer: 'sorted'`)
- `passage_error_hunt_counter` — handled outside `checkScreen` via `_huntValidateMark` / `_huntValidateCorrection`
- Multi-gap / multi-pair screens lose per-gap personalization in a single explanation string
- No structured sections — everything is one "Why" block

---

# STEP 1 — Complete `formatType` inventory

All types below are registered in `scripts/validate-v2-unit.js` (`SUPPORTED_FORMAT_TYPES`) and rendered/checked in `js/sune-play/practice-screen-renderer.js`, except `conversation_gap_fill` (renderer-supported, used via custom screens / future course content).

## Master table

| # | `formatType` | Display name | User interaction | Learning objective | Data after submission | Mistake identifiable? | Personalization inputs |
|---|--------------|--------------|------------------|--------------------|-----------------------|----------------------|------------------------|
| 1 | `two_option_choice` | Choose the correct option | Tap one of 2 large option buttons; evaluates on tap | Vocabulary nuance — near-synonyms, register, collocation in a sentence gap | `correct`, `userAnswer`, `correctAnswer`, `explanation`, `options[]`, `sentenceBefore`/`sentenceAfter`, `completedSentence`, `originalSentence` | **Yes** — exact wrong option | Wrong option text; semantic contrast pair; clue words in `sentenceAfter` |
| 2 | `meaning_contrast` | Choose the meaning | Tap one of 2+ options below a full sentence | Paraphrase / meaning comprehension | `correct`, `userAnswer`, `correctAnswer`, `explanation`, `sentence`, `options[]`, `prompt` | **Yes** | Wrong paraphrase; degree of meaning; false friend |
| 3 | `mc_4_option` | Multiple choice | **Standalone:** tap A–D, then Check. **Passage:** tap gap pill → bottom sheet A–D per gap | MCQ grammar/vocabulary; passage mode = word formation or cloze in context | Standalone: `options[]`, `answer` (letter), `answerText`, `userAnswer`, `correctAnswer`, `explanation`. Passage: per-gap `gaps[]` with `answer`, `options`, `explanation`; joined `userAnswer`/`correctAnswer` | **Yes** — letter + option text; per-gap in passage mode | Selected distractor; `rootWord` for WF; which gap(s) wrong |
| 4 | `free_text_gap_fill` | Complete the gap | Type in inline gap(s); Check | Open cloze — articles, prepositions, linkers, quantifiers | `sentence`, `answer`, `acceptedAnswers[]`, `userAnswer`, `correctAnswer`, `explanation`, `completedSentence` | **Partial** — wrong word known; reason inferred | Near-miss in `acceptedAnswers`; gap type; spelling variant |
| 5 | `conjugation_gap_fill` | Type the conjugation | Type verb form; `(verb)` prompt shown | Correct tense/form in context | + `verbPrompt`, `sourceSentence`, `gaps[]` | **Yes** — wrong form | Tense name; timeline clues in sentence; irregular pattern |
| 6 | `preselected_verb_gap_fill` | Type the conjugation | Verb pre-highlighted; type form only | Conjugation without verb-selection step | `preselectedVerb`, `sentence`, `answer`, `acceptedAnswers[]`, `gaps[]` | **Yes** | Agreement vs. tense error |
| 7 | `word_bank_gap_fill` | Complete with words from the box | Tap word-bank chip + type in gap; optional **sequential** multi-sentence mode | Constrained vocabulary + correct form in context | `wordBank[]`, per-sentence `answer`/`explanation` in sequential mode; single-gap fields otherwise | **Yes** — wrong chip or wrong form of chip | Bank word confused; correct word wrong inflection |
| 8 | `passage_gap_fill` | Complete the passage | Fill numbered gaps in passage (pill/underline inputs); optional word bank; **sequential** one-gap-at-a-time | Extended-text grammar, verb forms, or word formation across a story | `passage`, `gaps[{gapNumber, expectedAnswer, stemWord, explanation}]`, `wordBank[]`, all user values | **Yes** — per gap | Which gap numbers wrong; WF stem per gap; sequential progress |
| 9 | `synced_gap_fill` | One word for three sentences | One master input; previews update in 2–3 sentences | One word fits multiple contexts — shared grammar or polysemy | `sentences[]`, `answer`, `acceptedAnswers[]`, `userAnswer` | **Partial** | Word fitting 2/3 sentences; wrong sense |
| 10 | `keyword_transformation` | Key word transformation | Read prompt + keyword; type gapped rewrite; word-count enforced | C1-style grammatical transformation preserving meaning | `promptSentence`, `keyword`, `targetSentence`, `answer`, `acceptedAnswers[]`, `minWords`/`maxWords`, `wordCountInvalid` flag | **Partial** | Too many/few words; keyword altered; wrong structure |
| 11 | `error_correction` | Correct the error | Bold error shown in sentence; type correction in gap input | Spot and fix a specific grammar/vocabulary error | `sentence`, `highlightedText`, `answer`, `acceptedAnswers[]`, `userAnswer` | **Yes** — error location known | User changed wrong word; partial fix; same error category |
| 12 | `find_extra_word` | Find the extra word | Tap unnecessary word in sentence, OR tap **OK** if correct | Detect redundant words (double subject, extra article, etc.) | `tokens[]`, `answer`, `answerTokenIndex`, `isCorrectSentence`, user tap or `OK` | **Yes** | Tapped content word vs. function word; tapped OK when error exists |
| 13 | `word_order_tiles` | Build the sentence with tiles | Tap/drag tiles from bank to answer area (includes distractor tiles) | English word order; questions; adverb placement | `tiles[]`, `answerTiles[]`, `answer`, `tileValidation`, built `userAnswer` | **Partial** — full order diff | First divergence in tile sequence; missing auxiliary |
| 14 | `full_sentence_write` | Write the sentence | Free textarea OR conjugation scaffold with cue chips | Produce full sentence from prompts/cues | `displayPrompt`, `prompt.cues[]`, `answer`, `acceptedAnswers[]`, assembled `userAnswer` | **Partial** | Missing cue; wrong connector; conjugation scaffold error |
| 15 | `verb_bank_two_step` | Choose verb and conjugate | **Step 1:** tap verb chip. **Step 2:** type conjugated form | Lexical verb choice + correct form (two decisions) | Step 1: `baseVerb`, `userAnswer`, `partial: true`, custom explanation. Step 2: form vs. `acceptedAnswers[]` | **Yes** — step-specific | Wrong verb (semantic) vs. wrong conjugation (grammar) |
| 16 | `column_matching` | Match columns | Tap left beginning → tap right ending; **sequential** one-pair mode available | Sentence completion / collocation halves | `pairs[{pairId, leftText, correctLetter, endingText, explanation}]`, user pairings | **Yes** — per pair | Wrong ending letter; explain available before check in sequential mode |
| 17 | `crossword_clues` | Crossword clue | Type answer from definition + letter boxes | Vocabulary recall from clue | `clue`, `answer`, `letterCount`, `direction`, `userAnswer` | **Partial** — spelling vs. wrong word | Near-spelling; same-topic word |
| 18 | `comma_placement` | Comma placement | **Tap mode:** tap between tokens for commas. **Rewrite mode:** rewrite full sentence | Punctuation — lists, clauses, parentheticals | `tokens[]`, `commaAfterTokenIndexes[]`, `noCommaNeeded`, OR `reconstructedSentence`, `userAnswer` | **Yes** — position diff | Extra/missing comma; Oxford comma; clause boundary |
| 19 | `word_bank_tick` | Select words | Multi-select chips from word bank; Check | Identify all words matching a rule (e.g. uncountable nouns) | `words[]`, `answerWords[]`, selected set as `userAnswer` | **Yes** — set diff | False positives selected; correct words missed |
| 20 | `stative_sorting` | Sort into categories | Drag word chips into labeled drop zones | Categorisation (countable/uncountable, stative/dynamic, etc.) | `groups[{groupId, label, answers[]}]`, `verbs[]`, sort map; `explanation` on item (not always in result) | **Yes** — per verb wrong zone | Specific verb misplaced; category rule from `groups[].label` |
| 21 | `passage_error_hunt_single` | Find the error in the passage | Tap wrong phrase → type correction | Locate + fix one error in continuous text | `passage`, `wrong`, `answer`, user tap + fix; runtime messages for wrong tap | **Yes** — wrong tap vs. wrong fix | "Not the error" vs. incorrect correction |
| 22 | `passage_error_hunt_counter` | Find all errors in the passage | Tap each error phrase sequentially → type fix; counter UI | Multiple error detection in extended text | `items[{wrong, answer, explanation}]`, `errorCount`, per-item progress, hunt phase state | **Yes** — per error | Wrong phrase tapped; fix wrong; remaining count |
| 23 | `guided_error_choice` | Choose the correct form | Multi-item; strikethrough wrong form; tap correct option from list | Guided error correction — pick right form when error is framed | Per item: `wrong`, `options[]`, `answer`, `explanation`; `partial` until all items done | **Yes** — per item distractor | Confused similar forms (was/were, a/an) |
| 24 | `conversation_gap_fill` | Conversation gap fill | Scrollable dialogue; type in active line gap(s) | Phrasal verbs / idioms / functional language in context | `lines[]` with gap answers, `conversationTitle`, per-line `explanation` | **Partial** | Wrong phrasal verb; register mismatch |

**Count:** 23 canonical types + 1 renderer-supported (`conversation_gap_fill`) = **24 format types**.

### Screen modes that affect data shape

| `screenMode` | formatType | Notes |
|--------------|------------|-------|
| `single_passage_with_gaps` | `passage_gap_fill` | One screen, all gaps; sequential or all-at-once |
| `single_passage_with_counter` | `passage_error_hunt_counter` | One passage, N errors |
| `all_gaps_single_screen` | `mc_4_option` (passage) | Multi-gap MC passage |
| `all_pairs_single_screen` | `column_matching` | All pairs on one screen |
| `all_words_single_screen` | `word_bank_tick` | All chips on one screen |
| Combined items | `word_bank_gap_fill` | Sequential multi-sentence with shared bank |

### Runtime variants (same `formatType`, different UI)

| Variant | Trigger | Effect on explanation |
|---------|---------|---------------------|
| `two_option_choice` + `displayMode: same_meaning` | Legacy `same-meaning-ab` pattern | Context = full sentence; tests paraphrase not gap word |
| `mc_4_option` + `displayMode: passage` | `screenMode: all_gaps_single_screen` | Per-gap explanations in `gaps[]` |
| `comma_placement` + `interactionMode: rewrite_sentence` | Item/exercise config | Show full corrected sentence, not slot indexes |
| `word_bank_gap_fill` + `sequentialSentences` | Combined items rule | Per-sentence `explanation` as user progresses |
| `column_matching` + `sequentialMode` | Default true | Per-pair explain before check |
| `verb_bank_two_step` step 1 / step 2 | `payload.step` | Different sections per step |
| Grouped conjugation tap | `conjugation_gap_fill` item | Renders as `two_option_choice` at runtime |

---

# STEP 2 — Explanation design per `formatType`

---

## 1. `two_option_choice`

### Purpose
Teach the **nuance** between two close options — why one fits the sentence clue and the other does not.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📚 Vocabulary focus
- 🧩 Sentence breakdown *(completed sentence)*
- 💬 Useful tip

### Personalization
| Mistake | Feedback |
|---------|----------|
| Selected wrong option | Name both options; one clue-word contrast: *"Too positive/negative for …"* |
| Same-meaning mode wrong | Explain which paraphrase matches speaker intent |

### Length
15–20 seconds

### Example
> **✅ Correct answer:** pessimistic  
> **💡 Why:** The speaker disagrees — *I'm sure you'll pass* shows the choice is too negative, not too hopeful.  
> **⚠️ Your mistake:** *Optimistic* means too positive; the context rejects that view.  
> **📚 Vocabulary focus:** *pessimistic* = expecting the worst.  
> **🧩 Sentence:** You're being far too **pessimistic** about your chances.

---

## 2. `meaning_contrast`

### Purpose
Confirm the learner understands **what the sentence means**, not just which word fits a gap.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 🧩 Sentence breakdown
- 💬 Useful tip

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong paraphrase | Contrast meaning of chosen vs. correct option in one line |
| Opposite meaning picked | Flag the contradiction with a word from the original sentence |

### Length
15–20 seconds

### Example
> **✅ Correct answer:** She regrets not studying harder.  
> **💡 Why:** *Wish + past perfect* expresses regret about a past action not taken.  
> **⚠️ Your mistake:** *She wishes she studied* suggests a present habit, not past regret.

---

## 3. `mc_4_option`

### Purpose
**Eliminate distractors** with a clear rule; in passage mode, teach **per-gap** grammar or word-formation.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📖 Grammar focus *or* 🔄 Word formation *(if `rootWord`)*
- 📚 Vocabulary focus
- 🎯 Common mistake *(distractor trap)*

### Personalization
| Mistake | Feedback |
|---------|----------|
| Selected distractor B | One line why B fails in this slot |
| Passage: 2 of 4 gaps wrong | List only wrong gaps with micro-explanations |
| WF: wrong suffix | Show stem → correct derivation |

### Length
20–25 sec (standalone); 25–30 sec (passage, per wrong gap)

### Example
> **✅ Correct answer:** B — significantly  
> **💡 Why:** The gap needs an **adverb** modifying *increased*.  
> **⚠️ Your mistake (A — significant):** That's an adjective; it cannot modify a verb here.  
> **🔄 Word formation:** SIGNIFICANCE → **significantly** (-ly for adverbs).

---

## 4. `free_text_gap_fill`

### Purpose
Teach the **grammar or vocabulary rule** for the single open slot.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📖 Grammar focus *or* 📚 Vocabulary focus
- 🧩 Sentence breakdown
- 🎯 Common mistake

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong article | Countability / specificity rule |
| Wrong preposition | Fixed preposition pattern |
| Near-miss in `acceptedAnswers` | Accept variant note or spelling fix |
| Valid synonym not accepted | Explain the expected exam/course form |

### Length
20 seconds

### Example
> **✅ Correct answer:** many  
> **📖 Grammar focus:** *Many* + countable plural (*friends*).  
> **⚠️ Your mistake (much):** *Much* is for uncountable nouns (*much time*).

---

## 5. `conjugation_gap_fill`

### Purpose
Teach **which tense/form** the context requires and why.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📖 Grammar focus
- 🧩 Sentence breakdown
- 🎯 Common mistake

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong tense | Name tense + timeline clue (*since*, *yesterday*, *now*) |
| Wrong person/number | Subject–verb agreement |
| Bare infinitive instead of past participle | Perfect aspect rule |

### Length
20–25 seconds

### Example
> **✅ Correct answer:** has lived  
> **📖 Grammar focus:** Present perfect — past action with present relevance (*for ten years*).  
> **⚠️ Your mistake (lives):** Simple present doesn't combine with *for + duration* here.

---

## 6. `preselected_verb_gap_fill`

### Purpose
Same as conjugation gap fill, but isolate **form production** — verb choice is already given.

### Sections
- ✅ Correct answer
- 📖 Grammar focus
- ⚠️ Your mistake *(if wrong)*
- 🧩 Sentence breakdown

### Personalization
Focus only on conjugation errors (not lexical choice).

### Length
15–20 seconds

### Example
> **✅ Correct answer:** were  
> **📖 Grammar focus:** Subjunctive / unreal past — *I wish I **were** taller* (formal/written).  
> **⚠️ Your mistake (was):** *Was* is common in speech but the course form here is *were*.

---

## 7. `word_bank_gap_fill`

### Purpose
Teach **which bank word fits** and in **which form**.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📚 Vocabulary focus
- 📖 Grammar focus *(if form change needed)*
- 🧩 Sentence breakdown

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong chip from bank | Contrast the two confused words in context |
| Right chip, wrong form | Inflection rule only |
| Sequential mode: wrong sentence | Per-sentence explanation from `sentences[].explanation` |

### Length
20 seconds

### Example
> **✅ Correct answer:** a few  
> **💡 Why:** *A few* + countable plural (*apples*).  
> **⚠️ Your mistake (a little):** *A little* pairs with uncountable nouns (*a little water*).

---

## 8. `passage_gap_fill`

### Purpose
Teach **in-context** grammar or word formation across a narrative — per gap when multiple are wrong.

### Sections
- ✅ Correct answer(s)
- 💡 Why it's correct
- ⚠️ Your mistake *(per wrong gap)*
- 📖 Grammar focus *or* 🔄 Word formation
- 🧩 Sentence breakdown *(local gap sentence)*

### Personalization
| Mistake | Feedback |
|---------|----------|
| Gap 3 wrong only | Show gap 3 explanation only |
| WF passage: wrong stem use | stem → form for that gap number |
| Sequential: current gap wrong | One gap at a time; don't list future gaps |

### Length
20–25 sec per wrong gap

### Example
> **✅ Gap (2):** quickly  
> **🔄 Word formation:** QUICK → **quickly** (adverb — describes *ran*).  
> **⚠️ Your answer (quick):** Adjective form can't modify a verb.

---

## 9. `synced_gap_fill`

### Purpose
Show why **one word** works in **all** sentence contexts simultaneously.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 🧩 Sentence breakdown *(all 3 with gap filled)*
- 📖 Grammar focus

### Personalization
| Mistake | Feedback |
|---------|----------|
| Word fits 1–2 sentences only | Show which sentence breaks |
| Wrong sense of polysemous word | Distinguish meanings |

### Length
25 seconds

### Example
> **✅ Correct answer:** bank  
> **💡 Why:** *Bank* works as the object in all three sentences (river bank, money bank, blood bank).  
> **⚠️ Your mistake (bench):** *Bench* doesn't collocate with *blood* or *river* here.

---

## 10. `keyword_transformation`

### Purpose
Teach the **grammatical transformation** using the keyword without changing it.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📖 Grammar focus
- 🎯 Common mistake
- ✨ Similar example

### Personalization
| Mistake | Feedback |
|---------|----------|
| `wordCountInvalid` | State min/max word limit first |
| Keyword missing or changed | Keyword must appear exactly |
| Wrong structure | Name transformation (passive, wish, causative) |

### Length
25–30 seconds

### Example
> **✅ Correct answer:** wish I had studied harder  
> **📖 Grammar focus:** Wish + past perfect = regret about the past.  
> **⚠️ Your mistake:** 7 words — maximum is 6. Try removing *that*.  
> **✨ Similar:** *I wish I **had known** the truth.*

---

## 11. `error_correction`

### Purpose
Explain **what was wrong** in the highlighted portion and the **rule** for the fix.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📖 Grammar focus
- 🧩 Sentence breakdown *(corrected sentence)*

### Personalization
| Mistake | Feedback |
|---------|----------|
| Changed a different word | Redirect: *"The error is in **goes**, not …"* |
| Partial fix | What's still wrong |
| Correct rule, spelling error | Spelling note only |

### Length
20 seconds

### Example
> **✅ Correct answer:** have been  
> **💡 Why:** Present perfect continuous — started in the past, still true (*for two hours*).  
> **⚠️ Your mistake (are):** *Are* doesn't show duration from a past start point.

---

## 12. `find_extra_word`

### Purpose
Teach **why a word is redundant** or confirm the sentence is already correct.

### Sections
- ✅ Correct answer *(extra word or "Sentence is correct")*
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 🧩 Sentence breakdown *(without extra word)*
- 🎯 Common mistake

### Personalization
| Mistake | Feedback |
|---------|----------|
| Tapped content word | Explain its necessary role |
| Tapped OK when error exists | Point to the redundant token |
| Missed extra word | Name it and why it's doubled |

### Length
15–20 seconds

### Example
> **✅ Correct answer:** the *(extra)*  
> **💡 Why:** *The* is repeated — *in **the** the morning* has a double article.  
> **⚠️ Your mistake:** *Morning* is needed; the second *the* is not.

---

## 13. `word_order_tiles`

### Purpose
Teach **English word order** rule that the correct tile sequence follows.

### Sections
- ✅ Correct answer
- 📝 Word order
- ⚠️ Your mistake *(if wrong)*
- 💡 Why it's correct
- 🧩 Sentence breakdown

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong adverb position | Show where adverb must go |
| Question inversion error | Auxiliary before subject |
| Extra tile included | Identify the distractor tile |

### Length
25 seconds

### Example
> **✅ Correct answer:** How often do you exercise?  
> **📝 Word order:** Question: *How often* + *do* + subject + base verb.  
> **⚠️ Your mistake:** You placed *do* after *you* — the auxiliary must come first.

---

## 14. `full_sentence_write`

### Purpose
Show how **cues combine** into a grammatical sentence.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 🧩 Sentence breakdown *(cue mapping)*
- 📖 Grammar focus

### Personalization
| Mistake | Feedback |
|---------|----------|
| Missing cue | Which cue was omitted |
| Wrong connector | Suggest correct linker |
| Conjugation scaffold wrong | Fix the verb form only |

### Length
25 seconds

### Example
> **✅ Correct answer:** If I had more time, I would travel more.  
> **🧩 Breakdown:** *If I had* (second conditional) + *I would travel* (result).  
> **⚠️ Your mistake:** Missing *would* in the result clause.

---

## 15. `verb_bank_two_step`

### Purpose
Separate **lexical choice** (step 1) from **conjugation** (step 2) — teach the relevant skill per step.

### Sections

**Step 1 wrong:**
- ⚠️ Your mistake
- 📚 Vocabulary focus
- 💡 Why the correct verb fits

**Step 2 wrong:**
- ✅ Correct answer
- 📖 Grammar focus
- ⚠️ Your mistake
- 🧩 Sentence breakdown

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong verb (step 1) | Semantic contrast with correct verb |
| Right verb, wrong form (step 2) | Conjugation rule only |

### Length
15–20 sec per step

### Example (step 2)
> **✅ Correct answer:** has finished  
> **📖 Grammar focus:** Present perfect — completed action with present result.  
> **⚠️ Your mistake (finished):** Missing auxiliary *has*.

---

## 16. `column_matching`

### Purpose
Teach **collocation** — why two halves form a natural complete sentence.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 🧩 Sentence breakdown *(left + ending)*
- 📚 Vocabulary focus

### Personalization
| Mistake | Feedback |
|---------|----------|
| Picked ending C not B | Why C doesn't collocate with the left half |
| Sequential mode | One pair at a time — don't overwhelm |

### Length
20 sec per wrong pair

### Example
> **✅ Correct answer:** 2 → B  
> **🧩 Sentence:** She took **offence at** his rude remark.  
> **⚠️ Your mistake (2 → D):** *Offence* collocates with *at*, not *for*.

---

## 17. `crossword_clues`

### Purpose
Reinforce **word meaning** from the clue and correct spelling.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📚 Vocabulary focus
- 🎯 Common mistake *(spelling)*

### Personalization
| Mistake | Feedback |
|---------|----------|
| Near-spelling | Show correct letters |
| Related word | Distinguish from similar term in clue |

### Length
15 seconds

### Example
> **✅ Correct answer:** ENVIRONMENT  
> **📚 Vocabulary focus:** Natural world around us — *environ* + *-ment*.  
> **⚠️ Your mistake:** One letter short — remember *-ment* suffix.

---

## 18. `comma_placement`

### Purpose
Teach the **punctuation rule** behind each comma position.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📖 Grammar focus
- 🧩 Sentence breakdown *(punctuated sentence)*

### Personalization
| Mistake | Feedback |
|---------|----------|
| Extra comma | Which comma is unnecessary and why |
| Missing comma | Non-defining clause / list / intro phrase rule |
| Rewrite mode wrong | Show full corrected sentence diff |

### Length
20–25 seconds

### Example
> **✅ Correct answer:** comma after *however*  
> **📖 Grammar focus:** Introductory linker — comma separates it from the main clause.  
> **⚠️ Your mistake:** No comma needed after *and* between two short clauses here.

---

## 19. `word_bank_tick`

### Purpose
Teach the **selection rule** — which words belong to the set and which don't.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake
- 📖 Grammar focus *or* 📚 Vocabulary focus
- 🎯 Common mistake

### Personalization
| Mistake | Feedback |
|---------|----------|
| False positive | Why that word doesn't belong |
| False negative | Why a missed word does belong |
| List format | *"You selected X but missed Y"* |

### Length
25 seconds

### Example
> **✅ Correct:** furniture, money, news, bread  
> **📖 Grammar focus:** Uncountable — no plural (*furnitures* ✗).  
> **⚠️ Your mistake:** You selected *banana* — countable (plural: *bananas*).

---

## 20. `stative_sorting`

### Purpose
Teach the **category rule** and why each word belongs in its group.

### Sections
- ✅ Correct answer *(group lists)*
- 💡 Why it's correct
- ⚠️ Your mistake *(per misplaced word)*
- 📖 Grammar focus
- 🎯 Common mistake

### Personalization
| Mistake | Feedback |
|---------|----------|
| *news* in Countable | *News* is uncountable — no *a news* |
| Verb in wrong zone | One-line category definition + example |

### Length
25 sec (list wrong words only)

### Example
> **✅ Correct:** furniture → Uncountable  
> **📖 Grammar focus:** No plural form — we don't say *furnitures*.  
> **⚠️ Your mistake:** You put *furniture* in Countable.

---

## 21. `passage_error_hunt_single`

### Purpose
Train **error location** then **correction** — two teachable moments.

### Sections

**Wrong tap:**
- ⚠️ Your mistake
- 💡 Why it's correct *(where to look)*
- 📖 Grammar focus

**Wrong fix:**
- ✅ Correct answer
- 💡 Why it's correct
- 📖 Grammar focus
- 🧩 Sentence breakdown

### Personalization
| Mistake | Feedback |
|---------|----------|
| Tapped correct phrase | *"This phrase is fine — look for tense/form"* |
| Right location, wrong fix | Conjugation rule for the fix |

### Length
20 sec per phase

### Example
> **✅ Correct fix:** had been working  
> **📖 Grammar focus:** Past perfect continuous for an action before another past event.  
> **⚠️ Your tap:** *in the office* is not wrong — the verb tense is.

---

## 22. `passage_error_hunt_counter`

### Purpose
Same as single hunt, repeated per error; track **progress** toward finding all N errors.

### Sections
- Same as #21, plus:
- 💬 Useful tip *(N remaining)*

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong phrase | Keep-looking message + hint category |
| 2 of 3 found | Celebrate progress; hint at remaining error type |

### Length
20 sec per error

### Example
> **✅ Fix:** were → **had been**  
> **📖 Grammar focus:** Past perfect for earlier past (*before the meeting started*).  
> **💬 Tip:** 1 error left — check another verb tense.

---

## 23. `guided_error_choice`

### Purpose
Guide the learner from an **incorrect form** to the **correct form** via contrast.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(strikethrough wrong form shown)*
- 📖 Grammar focus
- 🎯 Common mistake

### Personalization
| Mistake | Feedback |
|---------|----------|
| Picked distractor similar to correct | Side-by-side form comparison |
| Multi-item screen | Only explain current item |

### Length
15–20 sec per item

### Example
> **Wrong form:** ~~was~~  
> **✅ Correct answer:** were  
> **📖 Grammar focus:** *If I were you* — subjunctive after *if* in formal English.  
> **⚠️ Your mistake:** *Was* is informal; choose *were* here.

---

## 24. `conversation_gap_fill`

### Purpose
Teach **functional / idiomatic language** in realistic dialogue.

### Sections
- ✅ Correct answer
- 💡 Why it's correct
- ⚠️ Your mistake *(if wrong)*
- 📚 Vocabulary focus
- 🧩 Sentence breakdown *(full line)*
- 💬 Useful tip *(register / when to use)*

### Personalization
| Mistake | Feedback |
|---------|----------|
| Wrong phrasal verb | Contrast literal meanings |
| Too formal/informal | Register note for dialogue |

### Length
20 seconds

### Example
> **✅ Correct answer:** hang on  
> **📚 Vocabulary focus:** *Hang on* = wait a moment (informal).  
> **⚠️ Your mistake (hold up):** Similar meaning, but *hang on* is more natural on the phone.  
> **🧩 Line:** **Hang on**, I'll check my calendar.

---

# STEP 3 — Unified philosophy for Course explanations

## Principles

### 1. Teach, don't reveal
The correct answer is always shown, but the **learning value** is in the rule, contrast, or breakdown. A correct response gets brief reinforcement (one 💡 line); a wrong response gets ⚠️ + the relevant focus section.

### 2. One shell, adaptive sections
Every explanation uses the same **visual container** (card overlay / mobile sheet) with a consistent icon vocabulary:

| Icon | Section |
|------|---------|
| ✅ | Correct answer |
| 💡 | Why it's correct |
| ⚠️ | Your mistake |
| 📖 | Grammar focus |
| 📚 | Vocabulary focus |
| 🧩 | Sentence breakdown |
| 🔄 | Word formation |
| 📝 | Word order |
| 🎯 | Common mistake |
| 💬 | Useful tip |
| ✨ | Similar example |

**Not every exercise shows every section.** The renderer picks 3–5 sections based on `formatType` and whether the answer was correct.

### 3. Two-layer delivery

| Layer | When | Content |
|-------|------|---------|
| **FeedbackSheet** | Immediately after check | Icon + short title + one-line hint (not the full explanation) |
| **Explain panel** | User taps Explain | Full structured sections |

This keeps the practice flow fast while making depth opt-in.

### 4. Personalize with available data
Always use `userAnswer` vs. `correctAnswer` when `correct === false`. Name the user's specific mistake. Skip ⚠️ when correct.

Priority mapping:

| Data signal | Section to emphasize |
|-------------|---------------------|
| Wrong option tapped | ⚠️ + 📚 Vocabulary focus |
| Wrong typed word | 📖 Grammar focus + 🎯 Common mistake |
| `wordCountInvalid` | 💬 Useful tip (word limit) first |
| Multi-gap / multi-pair wrong | Only wrong items — never explain correct ones |
| `partial: true` (multi-step) | Step-aware sections (verb bank, guided error, hunt) |
| `stative_sorting` wrong zone | Per-verb ⚠️ with category rule |

### 5. Mobile-first scannability
- **Max 5 sections** visible without scrolling on a 375px screen
- **Bullets over paragraphs** — one idea per line
- **Bold** only the answer and key terms
- Section headers always visible; body text 1–2 lines each
- Target **15–30 seconds** total reading time

### 6. Consistent across every lesson
- Same section order when sections overlap: ✅ → ⚠️ → 💡 → focus → 🧩 → 💬
- Same tone: diagnostic, encouraging (*"Your answer suggests…"*, not *"Wrong!"*)
- Theory alignment: 📖 labels should echo unit theory card titles where possible (*Present perfect*, *Countable nouns*)

### 7. Content author guidelines (for JSON `explanation` fields)
Authors write the **core 💡 content**; the system wraps it in sections and adds ⚠️ from runtime data.

| Author writes | System adds |
|---------------|-------------|
| Rule / why text in `explanation` | ✅ Correct answer, ⚠️ from `userAnswer`, 🧩 from `completedSentence` |
| Per-gap `explanation` in passage | ⚠️ only for wrong gap numbers |
| `pairs[].explanation` | ⚠️ with wrong ending letter |

### 8. What to avoid
- One undifferentiated "Why" paragraph for all 24 types
- Explaining all distractors when the user got it right
- Full passage reprints — quote only the local gap line
- Generic *"Review the grammar"* without naming the rule
- Hiding the user's answer when they were wrong

### 9. Implementation notes (future — not in scope now)
- Extend `checkScreen` to always pass `explanation` (fix `stative_sorting`)
- Add `explanationTemplate` per `formatType` in `FORMAT_DEFINITIONS`
- Parse author `explanation` into sections OR store structured sections in v2 JSON
- Support `userAnswer` in Explain panel (currently only in FeedbackSheet)

---

## Quick reference: sections by formatType

| formatType | Primary sections |
|------------|------------------|
| `two_option_choice` | ✅ 💡 ⚠️ 📚 🧩 |
| `meaning_contrast` | ✅ 💡 ⚠️ 🧩 |
| `mc_4_option` | ✅ 💡 ⚠️ 📖/🔄 🎯 |
| `free_text_gap_fill` | ✅ 💡 ⚠️ 📖 🧩 |
| `conjugation_gap_fill` | ✅ 💡 ⚠️ 📖 🧩 |
| `preselected_verb_gap_fill` | ✅ 📖 ⚠️ 🧩 |
| `word_bank_gap_fill` | ✅ 💡 ⚠️ 📚 📖 |
| `passage_gap_fill` | ✅ 💡 ⚠️ 📖/🔄 (per gap) |
| `synced_gap_fill` | ✅ 💡 ⚠️ 🧩 📖 |
| `keyword_transformation` | ✅ 💡 ⚠️ 📖 ✨ |
| `error_correction` | ✅ 💡 ⚠️ 📖 🧩 |
| `find_extra_word` | ✅ 💡 ⚠️ 🧩 |
| `word_order_tiles` | ✅ 📝 ⚠️ 💡 |
| `full_sentence_write` | ✅ 💡 ⚠️ 🧩 📖 |
| `verb_bank_two_step` | Step-aware ⚠️ 📚 or 📖 |
| `column_matching` | ✅ 💡 ⚠️ 🧩 📚 |
| `crossword_clues` | ✅ 💡 📚 🎯 |
| `comma_placement` | ✅ 💡 ⚠️ 📖 🧩 |
| `word_bank_tick` | ✅ 💡 ⚠️ 📖 |
| `stative_sorting` | ✅ 💡 ⚠️ 📖 (per word) |
| `passage_error_hunt_single` | Phase-aware ⚠️ 📖 |
| `passage_error_hunt_counter` | Same + 💬 progress |
| `guided_error_choice` | ✅ 💡 ⚠️ 📖 |
| `conversation_gap_fill` | ✅ 💡 ⚠️ 📚 🧩 💬 |

---

*End of document.*
