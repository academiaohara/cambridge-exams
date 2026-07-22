# Explanation System — Analysis & Design Document

**Project:** Cambridge Exams / Sune English  
**Date:** July 2026  
**Scope:** Inventory of every exercise type, post-answer data available, and proposed explanation formats. No implementation.

---

## Current State Summary

The platform runs **five parallel exercise systems**, each with its own completion flow:

| System | Location | Post-answer UI today |
|--------|----------|------------------------|
| Cambridge Exam Practice | `js/exercise-types/*`, `Nivel/*/Exams/*.json` | Inline marks + optional explanation panel (`question.explanation`) |
| Sune Play v2 (Course) | `js/sune-play/practice-screen-renderer.js`, `data/Course/**/*.v2.json` | `FeedbackSheet` + `LessonExplanation` (Question / Correct answer / Why) |
| B1 Grammar Lesson | `js/b1-grammar-lesson.js` | `.bgl-feedback` + optional `LessonExplanation` |
| Fast Learning | `js/fast-exercises.js` | `.fe-quiz-feedback` (correct answer only) |
| Video Stories / Micro-learning | `js/video-exercises.js`, `js/micro-learning.js` | Compact feedback + `explanation` text |

**Shared explanation component:** `js/lesson-explanation.js` — three blocks: *Question*, *Correct answer*, *Why*.

**Standard check result object (Sune Play):**
```js
{ correct, explanation, correctAnswer, userAnswer, lifeLoss, partial, wordCountInvalid, ... }
```

---

# STEP 1 — Exercise Type Inventory

Types are grouped by system. Level variants (B1 / B2 / C1) are noted where part numbering or interaction differs.

---

## A. Cambridge Exam Practice — Reading & Use of English

### A1. `multiple-choice` — Multiple Choice Cloze (Reading Part 1)

| Field | Detail |
|-------|--------|
| **Interaction** | Read a text with numbered gaps. Tap a gap → modal with options A–D. Select one option per gap. |
| **Learning objective** | Choose the word/phrase that best fits each gap — collocations, phrasal verbs, fixed expressions, discourse markers. |
| **Post-answer data** | Per question: `options[]`, `correct` (letter), `explanation`, user's selected letter, score (8 questions). Passage text with gap context. Example question (0) with explanation. |
| **Mistakes identifiable?** | **Yes** — exact distractor selected (A/B/C/D). Can compare to correct letter and option text. |
| **Personalization inputs** | Selected distractor text; gap sentence context; whether mistake is collocation vs. grammar vs. meaning; pattern across multiple wrong gaps. |

**Levels:** C1/B2 — 8 gaps. B1 uses different part mapping (Part 1 = `multiple-choice-text`).

---

### A2. `open-cloze` — Open Cloze (Reading Part 2)

| Field | Detail |
|-------|--------|
| **Interaction** | Read text with gaps. Type one word per gap (articles, prepositions, auxiliaries, linkers, etc.). |
| **Learning objective** | Produce the single grammatically/contextually correct word with no options given. |
| **Post-answer data** | `correct` (expected word), `explanation`, user's typed answer, inline ✓/✗ per gap, total score. |
| **Mistakes identifiable?** | **Partially** — wrong word is known; *why* it's wrong requires inference (wrong article, wrong preposition, spelling-only error, valid synonym). |
| **Personalization inputs** | User answer vs. correct; accepted-answer variants if any; gap type (article/preposition/linker); near-miss spelling. |

**Levels:** C1/B2 — 8 gaps. B1 Part 6 = open-cloze (6 gaps).

---

### A3. `word-formation` — Word Formation (Reading Part 3)

| Field | Detail |
|-------|--------|
| **Interaction** | Read text with gaps. Each gap shows a **stem word** in capitals. Type the derived form (prefix/suffix). |
| **Learning objective** | Transform a base word to fit grammatical slot (noun → adjective, verb → noun, negation, etc.). |
| **Post-answer data** | `correct`, stem word, `explanation`, user answer, gap context in passage. |
| **Mistakes identifiable?** | **Yes** — wrong derivation (e.g. `happy` → `happily` instead of `happiness`); spelling errors; wrong part of speech. |
| **Personalization inputs** | User form vs. correct; stem word; error category (suffix, prefix, part of speech, spelling). |

---

### A4. `transformations` — Key Word Transformation (Reading Part 4)

| Field | Detail |
|-------|--------|
| **Interaction** | Given `firstSentence`, a **keyword** (must not be changed), and gapped `secondSentence`. Rewrite using 3–6 words including the keyword. Word-count validation. |
| **Learning objective** | Paraphrase while preserving meaning; test grammar transformations (wish, passive, causative, etc.). |
| **Post-answer data** | `firstSentence`, `keyWord`, `beforeGap`/`afterGap`, `routes[]` (accepted answers), `explanation`, user sentence, word-count validity, 2 marks per item. |
| **Mistakes identifiable?** | **Partially** — wrong transformation, keyword misuse, word-count violation, meaning shift. Multiple accepted routes possible. |
| **Personalization inputs** | User sentence vs. `routes[]`; word-count error; keyword included or altered; tense/voice error patterns. |

---

### A5. `multiple-choice-text` — Long Text Multiple Choice (Reading Part 5)

| Field | Detail |
|-------|--------|
| **Interaction** | Read a long passage. For each question, select A–D via radio buttons. |
| **Learning objective** | Reading comprehension — main idea, inference, attitude, detail, vocabulary in context. |
| **Post-answer data** | Passage text, per question: `options[]`, `correct`, `explanation`, user's choice. Evidence highlighting in explanation mode. |
| **Mistakes identifiable?** | **Yes** — which distractor (A–D) was chosen. |
| **Personalization inputs** | Distractor type (too narrow, opposite meaning, not in text); evidence sentence; question skill (inference vs. detail). |

**Levels:** B1 Part 1 (5 Q). Also used for listening (see Listening).

---

### A6. `cross-text-matching` — Cross-text Matching (Reading Part 6, C1)

| Field | Detail |
|-------|--------|
| **Interaction** | Read 4 short texts (A–D). Match statements to texts via modal picker. |
| **Learning objective** | Compare opinions/claims across texts; identify which writer said what. |
| **Post-answer data** | All texts, statement per question, `correct` (letter A–D), `explanation`, user selection. |
| **Mistakes identifiable?** | **Yes** — wrong text letter chosen. |
| **Personalization inputs** | Which text user picked vs. correct; overlapping opinion between texts; keyword in statement. |

**Levels:** B2 Part 6 = `gapped-text` instead. B1 Part 2 = `multiple-matching` (5 Q).

---

### A7. `gapped-text` — Gapped Text (Reading Part 7, C1 / B2 Part 6)

| Field | Detail |
|-------|--------|
| **Interaction** | Read a text with removed paragraphs. Select paragraph A–G from dropdown for each gap. |
| **Learning objective** | Cohesion and coherence — which paragraph fits each gap (discourse markers, pronoun reference, topic flow). |
| **Post-answer data** | Full text, `paragraphs[]` (options), per gap: `correct`, `explanation`, user selection. Part 7 shows all explanations at once in explanation mode with evidence blocks. |
| **Mistakes identifiable?** | **Yes** — wrong paragraph letter. |
| **Personalization inputs** | User paragraph vs. correct; cohesion cue missed (however, this, such); adjacent paragraph context. |

**Levels:** B1 Part 5 = gapped-text variant.

---

### A8. `multiple-matching` — Multiple Matching (Reading Part 8, C1 / B2 Part 7)

| Field | Detail |
|-------|--------|
| **Interaction** | Read source material (people, reviews, sections). Match each prompt to correct option via modal. Options may be reused. |
| **Learning objective** | Scan and match multiple items to a pool of answers — detail, opinion, or feature matching. |
| **Post-answer data** | Source texts, `questions[]` with `correct`, `explanation`, user answers, score. |
| **Mistakes identifiable?** | **Yes** — per-question wrong match. |
| **Personalization inputs** | Wrong option vs. correct; whether user confused similar people/sections. |

---

## B. Cambridge Exam Practice — Listening

### B1. `multiple-choice` / `listening-1` — Situations / Short Extracts MCQ

| Field | Detail |
|-------|--------|
| **Interaction** | Listen to audio (with transcript available after check). Select A–D per question. |
| **Learning objective** | Understand gist, attitude, or detail from short recordings. |
| **Post-answer data** | Audio/transcript, `options[]`, `correct`, `explanation`, user choice. |
| **Mistakes identifiable?** | **Yes** — distractor letter. |
| **Personalization inputs** | Transcript line supporting correct answer; why distractor sounds plausible. |

---

### B2. `sentence-completion` / `listening-2` — Sentence Completion

| Field | Detail |
|-------|--------|
| **Interaction** | Listen and type missing words into sentence gaps (exact words from recording). |
| **Learning objective** | Catch specific words/phrases; spelling and form accuracy. |
| **Post-answer data** | `correct`, `explanation`, user typed answer, transcript. B1 has answer-toggle UI variant. |
| **Mistakes identifiable?** | **Partially** — wrong word known; homophone/spelling vs. wrong content distinguishable with transcript. |
| **Personalization inputs** | User answer vs. correct; transcript timestamp/line; spelling near-miss. |

**Levels:** B2 — 10 items. C1 — 8 items.

---

### B3. `speaker-matching` — Five-speaker Matching (B2 Listening Part 3)

| Field | Detail |
|-------|--------|
| **Interaction** | Listen to 5 speakers. Match each to an option from a list (dropdown/select). |
| **Learning objective** | Identify speaker attitude, topic, or opinion from monologues. |
| **Post-answer data** | Speaker list, options, per speaker: `correct`, `explanation`, user match, transcript. |
| **Mistakes identifiable?** | **Yes** — wrong option per speaker. |
| **Personalization inputs** | Confused speakers with similar topics; key phrase from transcript. |

---

### B4. `multiple-choice-text` / `listening-3` — Interview / Long Extract MCQ

| Field | Detail |
|-------|--------|
| **Interaction** | Listen to longer recording. Radio-select A–D per comprehension question. |
| **Learning objective** | Follow extended speech; inference and detail from interview/discussion. |
| **Post-answer data** | Same as Reading Part 5 + audio/transcript. |
| **Mistakes identifiable?** | **Yes** | 
| **Personalization inputs** | Distractor analysis + listening evidence from transcript. |

---

### B5. `dual-matching` / `listening-4` — Dual Matching (C1)

| Field | Detail |
|-------|--------|
| **Interaction** | Listen to multiple speakers. Match two columns (e.g. speaker → statement) via selects. |
| **Learning objective** | Track multiple speakers and match two related dimensions. |
| **Post-answer data** | `questions[]`, `correct`, `explanation`, user selections, transcript. |
| **Mistakes identifiable?** | **Yes** — per match wrong. |
| **Personalization inputs** | Which speaker line was misattributed; similar-sounding statements. |

---

## C. Cambridge Exam Practice — Writing (AI-evaluated)

### C1. `essay` — Essay (Writing Part 1)

| Field | Detail |
|-------|--------|
| **Interaction** | Read question + notes. Write essay in textarea (word count tracked). Submit for **AI evaluation** (`POST /api/writing`). |
| **Learning objective** | Produce discursive essay: argument, organisation, register, language range. |
| **Post-answer data** | User full text, task prompt, `modelAnswer` (in JSON), AI report: Content / Communicative Achievement / Organisation / Language (0–5 each, /20), corrected text (~~strike~~/++insert++), strengths, improvements. |
| **Mistakes identifiable?** | **Yes (rich)** — AI marks specific errors in corrected text; criterion scores reveal weak areas. |
| **Personalization inputs** | Lowest-scoring criterion; recurring error types in corrections; task fulfilment gaps. |

---

### C2. `email` — Email Reply (B1 Writing Part 1)

| Field | Detail |
|-------|--------|
| **Interaction** | Read initial email. Write reply in word range. AI evaluation. |
| **Learning objective** | Functional writing — appropriate register, covering all bullet points, email conventions. |
| **Post-answer data** | `b1EmailTask.initialEmail`, user reply, same AI structure as essay. |
| **Mistakes identifiable?** | **Yes** — same as essay + bullet-point coverage. |
| **Personalization inputs** | Missing bullet points; register too formal/informal; opening/closing errors. |

---

### C3. `choice` — Writing Part 2 (Choose Task A or B)

| Field | Detail |
|-------|--------|
| **Interaction** | Choose one of two tasks (report, review, letter, proposal, etc.). Write response. AI evaluation. |
| **Learning objective** | Genre-appropriate writing for chosen format. |
| **Post-answer data** | Chosen task type, prompt, user text, AI evaluation (same structure). |
| **Mistakes identifiable?** | **Yes** | 
| **Personalization inputs** | Genre-specific feedback (review vs. report structure); task-type conventions. |

---

## D. Cambridge Exam Practice — Speaking (AI-evaluated)

### D1. `interview` — Speaking Part 1

| Field | Detail |
|-------|--------|
| **Interaction** | Simulated video-call. Answer personal questions via speech-to-text. Dynamic follow-ups via `POST /api/speaking-interview`. |
| **Learning objective** | Fluency in personal Q&A; extended answers; interaction. |
| **Post-answer data** | Full `transcripts[]`, `allMessages[]`, AI evaluation: 5 criteria ×10 + Global ×25 = /75; detailed feedback; filler words; upgrade suggestions. |
| **Mistakes identifiable?** | **Yes (qualitative)** — grammar/vocab/discourse issues in transcript; short answers; off-topic. |
| **Personalization inputs** | Weakest criterion; example upgrade phrases; specific grammar errors in transcript. |

---

### D2. `long-turn` — Speaking Part 2 (Long Turn / Photos)

| Field | Detail |
|-------|--------|
| **Interaction** | View photos + task card. Speak ~1 minute comparing/describing. Partner simulation optional. |
| **Learning objective** | Sustained monologue; compare/contrast; speculate. |
| **Post-answer data** | Transcript, images/task, AI eval + **Speculation Check** section. |
| **Mistakes identifiable?** | **Yes** — lack of comparison, missing speculation, limited vocabulary. |
| **Personalization inputs** | Whether user compared both photos; speculation language gaps. |

---

### D3. `collaborative` — Speaking Part 3

| Field | Detail |
|-------|--------|
| **Interaction** | Discuss options with AI partner; negotiate toward decision. Images/diagram optional. |
| **Learning objective** | Interactive discussion; negotiating; turn-taking; reaching decision. |
| **Post-answer data** | Full dialogue, AI eval + **Interactive Check** section. |
| **Mistakes identifiable?** | **Yes** — failure to respond to partner, no opinion, no negotiation moves. |
| **Personalization inputs** | Missing interaction phrases; decision not reached; interrupting patterns. |

---

### D4. `discussion` — Speaking Part 4

| Field | Detail |
|-------|--------|
| **Interaction** | Extended discussion on Part 3 topic; examiner-style questions. |
| **Learning objective** | Express and justify opinions; develop answers; abstract discussion. |
| **Post-answer data** | Transcript, standard speaking evaluation. |
| **Mistakes identifiable?** | **Yes** | 
| **Personalization inputs** | Underdeveloped opinions; lack of examples; discourse markers. |

---

## E. Sune Play v2 — Course Interactive Formats (23 canonical + 1 renderer-only)

All types share: hearts/lives, `FeedbackSheet`, Explain button → `LessonExplanation`. Data from `contentBanks.exercises[]` items.

### E1. `two_option_choice` — Choose the Correct Option

| Field | Detail |
|-------|--------|
| **Interaction** | Sentence with gap between `sentenceBefore` / `sentenceAfter`. Tap one of 2 large option buttons. Evaluates on tap. |
| **Learning objective** | Vocabulary nuance — near-synonyms, register, collocation in context. |
| **Post-answer data** | `options[]`, `answer`, `completedSentence`, `originalSentence`, `explanation`, user choice, `correct`. |
| **Mistakes identifiable?** | **Yes** — exact wrong option tapped. |
| **Personalization inputs** | Wrong option vs. correct; semantic contrast (optimistic/pessimistic, biased/prejudiced). |

---

### E2. `meaning_contrast` — Choose the Meaning

| Field | Detail |
|-------|--------|
| **Interaction** | Same UI as `two_option_choice`. |
| **Learning objective** | Paraphrase comprehension — which option matches sentence meaning. |
| **Post-answer data** | Same as E1. |
| **Mistakes identifiable?** | **Yes** |
| **Personalization inputs** | Misread nuance; false friend; degree of meaning (slightly vs. completely). |

---

### E3. `mc_4_option` — Multiple Choice (4 options)

| Field | Detail |
|-------|--------|
| **Interaction** | **Standalone:** tap A–D cards, then Check. **Passage mode:** fill multiple gaps in text via bottom sheet picker. |
| **Learning objective** | MCQ vocabulary/grammar; passage-level word formation with root tile. |
| **Post-answer data** | `options[]`, `answer` (letter), `answerText`, per-gap data in passage mode; user selections; `explanation`. |
| **Mistakes identifiable?** | **Yes** — letter and option text; per-gap in passage mode. |
| **Personalization inputs** | Distractor analysis per gap; word-formation error (wrong suffix). |

---

### E4. `free_text_gap_fill` — Complete the Gap

| Field | Detail |
|-------|--------|
| **Interaction** | Type answer in inline gap. Check button. |
| **Learning objective** | Open cloze in sentence context — articles, prepositions, linkers, vocabulary. |
| **Post-answer data** | `sentence`, `answer`, `acceptedAnswers[]`, `explanation`, user input. |
| **Mistakes identifiable?** | **Partially** |
| **Personalization inputs** | Near-miss; wrong word class; common L1 transfer error. |

---

### E5. `conjugation_gap_fill` — Type the Conjugation

| Field | Detail |
|-------|--------|
| **Interaction** | Same as gap fill; verb shown as `(verb)` prompt. |
| **Learning objective** | Correct verb tense/form in context. |
| **Post-answer data** | Same as E4 + verb prompt. `failureAction`: show correct answer then continue. |
| **Mistakes identifiable?** | **Yes** — wrong tense/form |
| **Personalization inputs** | User form vs. correct; tense name; irregular verb pattern. |

---

### E6. `preselected_verb_gap_fill` — Type the Conjugation (verb given)

| Field | Detail |
|-------|--------|
| **Interaction** | Verb pre-highlighted in sentence; type only conjugated form. |
| **Learning objective** | Conjugation without verb selection step. |
| **Post-answer data** | Same as E5. |
| **Mistakes identifiable?** | **Yes** |
| **Personalization inputs** | Tense vs. agreement error. |

---

### E7. `word_bank_gap_fill` — Complete with Words from the Box

| Field | Detail |
|-------|--------|
| **Interaction** | Tap word-bank chip and/or type in gap(s). Sequential multi-gap mode available. |
| **Learning objective** | Constrained vocabulary selection + form in context. |
| **Post-answer data** | `words[]`, per-gap answers, `explanation`, user values. |
| **Mistakes identifiable?** | **Yes** — wrong chip or wrong form of chip word. |
| **Personalization inputs** | Confused two bank words; correct word wrong form. |

---

### E8. `passage_gap_fill` — Complete the Passage

| Field | Detail |
|-------|--------|
| **Interaction** | Fill multiple inline gaps in a passage (pill inputs). Optional word bank. |
| **Learning objective** | Extended text cohesion — grammar and vocabulary across a passage. |
| **Post-answer data** | `passage`, `gaps[{gapNumber, expectedAnswer, explanation}]`, user values per gap. |
| **Mistakes identifiable?** | **Yes** — per-gap |
| **Personalization inputs** | Which gaps wrong; pattern (all prepositions, etc.). |

---

### E9. `synced_gap_fill` — One Word for Three Sentences

| Field | Detail |
|-------|--------|
| **Interaction** | One master input fills the same gap position in 2–3 preview sentences. |
| **Learning objective** | One word fits multiple contexts — polysemy or shared grammar pattern. |
| **Post-answer data** | `sentences[]`, `answer`, `acceptedAnswers[]`, user word. |
| **Mistakes identifiable?** | **Partially** |
| **Personalization inputs** | Word that fits 2/3 sentences but not all; wrong sense. |

---

### E10. `keyword_transformation` — Key Word Transformation

| Field | Detail |
|-------|--------|
| **Interaction** | Prompt sentence + keyword + gapped answer. Type transformation. Word-count limits enforced (`wordCountInvalid` flag). |
| **Learning objective** | C1-style grammatical transformation. |
| **Post-answer data** | `promptSentence`, `keyWord`, `answer`, `acceptedAnswers[]`, user sentence, word-count validity. |
| **Mistakes identifiable?** | **Partially** — word count vs. grammar vs. meaning |
| **Personalization inputs** | Too many/few words; keyword altered; specific transformation missed. |

---

### E11. `error_correction` — Correct the Error

| Field | Detail |
|-------|--------|
| **Interaction** | Sentence with **bold highlighted error**. Type correction in input. |
| **Learning objective** | Identify and fix a specific grammar/vocabulary error. |
| **Post-answer data** | `highlightedText`, `sentence`, `answer`, `acceptedAnswers[]`, user correction. |
| **Mistakes identifiable?** | **Yes** — know the error location; user fix may be wrong type |
| **Personalization inputs** | User over-corrected different word; partial fix; same error category. |

---

### E12. `find_extra_word` — Find the Extra Word

| Field | Detail |
|-------|--------|
| **Interaction** | Tap the unnecessary word in a sentence, OR tap "OK" if sentence is correct. |
| **Learning objective** | Spot redundant words / double subjects / unnecessary articles. |
| **Post-answer data** | Tokenized sentence, `answer` (extra word or none), `isCorrectSentence` flag, user tap. |
| **Mistakes identifiable?** | **Yes** — tapped wrong token or missed extra word |
| **Personalization inputs** | User tapped OK when error exists; tapped content word vs. function word. |

---

### E13. `word_order_tiles` — Build the Sentence with Tiles

| Field | Detail |
|-------|--------|
| **Interaction** | Drag/tap word tiles from bank into answer area (includes distractor tiles). |
| **Learning objective** | English word order; question formation; adverb placement. |
| **Post-answer data** | `tiles[]`, `answerTiles[]`, `answer`, `tileValidation`, user built sentence. |
| **Mistakes identifiable?** | **Partially** — full order wrong; can diff tile sequences |
| **Personalization inputs** | Specific inversion error; adverb position; missing auxiliary. |

---

### E14. `full_sentence_write` — Write the Sentence

| Field | Detail |
|-------|--------|
| **Interaction** | Free textarea OR conjugation scaffold with cue chips. |
| **Learning objective** | Produce full sentence from prompts/cues. |
| **Post-answer data** | `displayPrompt`, `prompt.cues[]`, `answer`, `acceptedAnswers[]`, user sentence. |
| **Mistakes identifiable?** | **Partially** — string match only unless AI added |
| **Personalization inputs** | Missing cue; wrong connector; word order in free write. |

---

### E15. `verb_bank_two_step` — Choose Verb and Conjugate

| Field | Detail |
|-------|--------|
| **Interaction** | **Step 1:** tap verb chip from bank. **Step 2:** type conjugated form in gap. |
| **Learning objective** | Lexical choice + correct verb form (two-step decision). |
| **Post-answer data** | Step 1: `baseVerb`, user verb (`partial: true`). Step 2: form. Custom messages: "That verb does not fit." |
| **Mistakes identifiable?** | **Yes** — wrong verb vs. wrong form (step-specific) |
| **Personalization inputs** | Failed step 1 (semantic) vs. step 2 (conjugation). |

---

### E16. `column_matching` — Match Columns

| Field | Detail |
|-------|--------|
| **Interaction** | Tap left "beginning" → tap right "ending" to pair. Sequential one-pair-at-a-time mode. |
| **Learning objective** | Sentence completion / collocation halves. |
| **Post-answer data** | `pairs[{pairId, beginning, endings[], correctLetter, explanation}]`, user pairings. |
| **Mistakes identifiable?** | **Yes** — per pair wrong ending |
| **Personalization inputs** | Which ending chosen; explain before check in sequential mode. |

---

### E17. `crossword_clues` — Crossword Clue

| Field | Detail |
|-------|--------|
| **Interaction** | Read clue + letter count. Type word in letter boxes. |
| **Learning objective** | Vocabulary recall from definition. |
| **Post-answer data** | `clue`, `answer`, `letterCount`, `direction`, user word. |
| **Mistakes identifiable?** | **Partially** — spelling vs. wrong word |
| **Personalization inputs** | Near-spelling; related word from same topic. |

---

### E18. `comma_placement` — Comma Placement

| Field | Detail |
|-------|--------|
| **Interaction** | **Mode A:** tap between tokens to place commas. **Mode B (`rewrite_sentence`):** rewrite full sentence with commas. |
| **Learning objective** | Punctuation rules — lists, clauses, parentheticals. |
| **Post-answer data** | `tokens[]`, `commaAfterTokenIndexes[]` OR `reconstructedSentence`, user slots/rewrite. |
| **Mistakes identifiable?** | **Yes** — extra/missing comma positions |
| **Personalization inputs** | Comma after wrong token; Oxford comma; clause boundary error. |

---

### E19. `word_bank_tick` — Select Words

| Field | Detail |
|-------|--------|
| **Interaction** | Multi-select chips from word bank (toggle on/off). |
| **Learning objective** | Identify all words matching a rule (e.g. stative verbs, uncountable nouns). |
| **Post-answer data** | `words[]`, `answer` / `answerWords[]`, user selection set. |
| **Mistakes identifiable?** | **Yes** — false positives and false negatives in set diff |
| **Personalization inputs** | Which extra word selected; which correct word missed. |

---

### E20. `stative_sorting` — Sort into Categories

| Field | Detail |
|-------|--------|
| **Interaction** | Drag verb chips into labeled category drop zones. |
| **Learning objective** | Categorisation (stative vs. dynamic, formal vs. informal, etc.). |
| **Post-answer data** | `groups[{groupId, label, answers[]}]`, `verbs[]`, user sort map. |
| **Mistakes identifiable?** | **Yes** — per verb wrong category |
| **Personalization inputs** | Specific verb misplaced; category definition reminder. |

---

### E21. `passage_error_hunt_single` — Find the Error in the Passage

| Field | Detail |
|-------|--------|
| **Interaction** | Tap wrong phrase in passage → type correction. |
| **Learning objective** | Locate error in continuous text; fix verb form/tense. |
| **Post-answer data** | `passage`, `wrong` phrase, `answer`, user tap + fix. Custom: "That phrase is not the error." |
| **Mistakes identifiable?** | **Yes** — wrong tap vs. wrong fix |
| **Personalization inputs** | Tapped correct phrase; fixed wrong element. |

---

### E22. `passage_error_hunt_counter` — Find All Errors in the Passage

| Field | Detail |
|-------|--------|
| **Interaction** | Find N errors sequentially; tap each → type fix. Counter UI. |
| **Learning objective** | Multiple error detection in extended text. |
| **Post-answer data** | `items[{wrong, answer, explanation}]`, `errorCount`, per-item progress. |
| **Mistakes identifiable?** | **Yes** — per error |
| **Personalization inputs** | Remaining error count; same error type repeated. |

---

### E23. `guided_error_choice` — Choose the Correct Form

| Field | Detail |
|-------|--------|
| **Interaction** | Multi-item screen; per item tap correct form from options. |
| **Learning objective** | Guided correction — choose right form when error is framed. |
| **Post-answer data** | `items[{options[], answer, explanation}]`, per-item user choice, `partial` until all done. |
| **Mistakes identifiable?** | **Yes** — per item distractor |
| **Personalization inputs** | Confused two similar forms (was/were, a/an). |

---

### E24. `conversation_gap_fill` — Conversation Gap Fill (renderer-only)

| Field | Detail |
|-------|--------|
| **Interaction** | Scrollable dialogue; type in active line gap. |
| **Learning objective** | Phrasal verbs / idioms in conversational context. |
| **Post-answer data** | `lines[]` with gaps, answers, explanations. Used in vocab fast-session. |
| **Mistakes identifiable?** | **Partially** |
| **Personalization inputs** | Wrong phrasal verb; register mismatch in dialogue. |

---

## F. B1 Grammar Lesson (`b1-grammar-lesson.js`)

Legacy Duolingo-style flow; explanations in `data-explanation` attributes.

| Type | Interaction | Objective | Post-answer data | Mistakes ID? |
|------|-------------|-----------|------------------|--------------|
| `gap_fill` | Type in gap | Grammar in sentence | correct, userAnswer, explanation | Partial |
| `tap_choice` | Tap 2 options | Binary grammar/vocab choice | + completedSentence | Yes |
| `verb_bank_gap_fill` | Chip + conjugate | Verb bank + form | multi-gap joined | Yes |
| `error_correction` | Type fix for bold error | Error correction | highlighted error, fix | Yes |
| `passage_error_hunt` | Tap errors in passage | Multi-error hunt | dynamic count messages | Yes |

---

## G. Fast Learning (`fast-exercises.js`)

Map-based progression. Theory/gallery points have no exercises.

| Point type | Interaction | Objective | Post-answer data | Mistakes ID? |
|------------|-------------|-----------|------------------|--------------|
| `pv-fill-in` | MCQ or type phrasal verb | Phrasal verb in context | correct answer, user answer | Yes |
| `pv-conversation-drag` | Drag verbs into dialogue gaps | PV in conversation | per-gap match | Yes |
| `pv-mixed` | Mixed gate | Combined PV practice | per sub-exercise | Yes |
| `id-fill-in` | MCQ idiom | Idiom choice | correct, user | Yes |
| `id-conversation-drag` | Drag idioms into gaps | Idiom in context | per-gap | Yes |
| `id-quiz` | MCQ (`match-meaning`, `complete-sentence`, `select-situation`) | Idiom meaning/use | correct, user | Yes |
| `wf-multiple-choice` | Choose word form | Word formation | correct, user | Yes |
| `wf-transform` | Type transformed word | Derive word from root | correct, user | Yes |
| `wf-mixed` | Mixed gate | Combined WF practice | per item | Yes |
| `exercise` / `review` / `quick-review` | MCQ vocab quiz | Vocabulary recall | correct, optional explanation | Yes |

**Current feedback:** "Correct!" or "The correct answer is **X**" — minimal explanation.

---

## H. Video Stories (`video-exercises.js`)

| Question type | Interaction | Objective | Post-answer data | Mistakes ID? |
|---------------|-------------|-----------|------------------|--------------|
| `multiple_choice` | Tap numbered options | Comprehension after video | options, correct, explanation | Yes |
| `fill_gap_choice` | Tap option → fills gap | Vocabulary/grammar in clip context | gap, correct, explanation | Yes |
| `order_sentences` | Tap tiles to order | Sentence sequencing | correct order, user order | Yes (sequence diff) |

Uses `FeedbackSheet` + `q.explanation`.

---

## I. Micro-learning (`micro-learning.js`)

| Card type | Interaction | Objective | Post-answer data | Mistakes ID? |
|-----------|-------------|-----------|------------------|--------------|
| `mc` | Tap A–D (from Reading Part 1 data) | Quick cloze practice | options, correct, explanation | Yes |
| `transform` | Type transformation | Key word transformation drill | routes, user answer, explanation | Partial |

---

## J. Learning Crossword (`learning-crossword.js`)

Reuses `crossword_clues` format — see E17.

---

# STEP 2 — Explanation Format Design

Each section: **Purpose → Recommended sections → Personalization → Length → Example**.

Templates are **not** uniform — they follow the learning objective.

---

## Exam Reading & Use of English

### A1. Multiple Choice Cloze

**Purpose:** Teach why one collocation fits the gap and why each distractor fails in *this* context.

**Recommended sections:**
- Correct answer
- Why it's correct (collocation/idiom rule)
- Why the other answers are wrong (brief, per distractor if user picked one)
- Vocabulary focus (1 key phrase)

**Personalization:**
- User picked B "valued" → "Valued needs *at* or a different structure (*valued at*). Here we need *worth more than*."
- User picked A vs. D confusion → contrast the two with the gap sentence.

**Length:** 25–30 sec (4–6 short lines + optional 1-line distractor note)

**Example:**
> **Correct answer:** worth  
> **Why:** *Worth more than* is the fixed comparative for value.  
> **Your answer (valued):** *Valued* usually needs *at* (*valued at €1m*), not *more than*.  
> **Tip:** After *once were*, Cambridge often tests *worth* vs. *valued*.

---

### A2. Open Cloze

**Purpose:** Pinpoint the grammatical slot (article, linker, auxiliary) and the rule.

**Recommended sections:**
- Correct answer
- Grammar focus (rule name)
- Sentence breakdown (gap role)
- Common mistake (if user answer is a typical error)

**Personalization:**
- Wrong article → explain countability/specificity.
- Wrong preposition → show the fixed preposition pattern.
- Valid synonym but not accepted → note exam accepts only one word.

**Length:** 20–25 sec

**Example:**
> **Correct answer:** the  
> **Grammar focus:** Definite article — specific role already mentioned (*the role*).  
> **Your answer (a):** *A role* suggests any role; the text refers to one known role in the spice trade.

---

### A3. Word Formation

**Purpose:** Show the derivation path from stem to correct form.

**Recommended sections:**
- Correct answer
- Word formation process (stem → suffix/prefix)
- Grammar focus (why this part of speech fits the slot)
- Common mistake

**Personalization:**
- Wrong suffix → show correct suffix rule (-ness vs. -ly).
- Spelling error → highlight double consonant etc.

**Length:** 25 sec

**Example:**
> **Correct answer:** significantly  
> **Process:** SIGNIFICANCE (n) → remove -ce, add -antly → adverb modifying *played*.  
> **Your answer (significant):** That's an adjective; the gap needs an adverb after *most*.

---

### A4. Key Word Transformation

**Purpose:** Demonstrate the grammatical transformation using the keyword.

**Recommended sections:**
- Correct answer (example route)
- Grammar focus (transformation type)
- Keyword rule (must keep keyword intact)
- Common mistake
- Similar example (one line)

**Personalization:**
- Word count wrong → "You used 7 words; maximum is 6."
- Keyword changed → "The keyword must appear exactly as given."
- Wrong tense → name the target structure (wish, passive, etc.).

**Length:** 30 sec

**Example:**
> **Model answer:** wish I had studied harder  
> **Grammar focus:** Wish + past perfect for regret about the past.  
> **Keyword:** *WISH* must stay unchanged.  
> **Your answer:** *wish I studied* → simple past expresses present regret, not past.

---

### A5. Multiple Choice (Long Text)

**Purpose:** Train evidence-based reading — where in the text the answer is supported.

**Recommended sections:**
- Correct answer
- Reading evidence (quoted phrase)
- Why it's correct
- Why your answer is wrong (distractor trap type)

**Personalization:**
- Picked opposite-attitude option → cite contrast marker in text.
- Picked true but not answering the question → "This is mentioned but doesn't answer *why*."

**Length:** 30 sec

**Example:**
> **Correct answer:** C  
> **Evidence:** *"reluctant to abandon traditional methods"* — shows resistance to change.  
> **Your choice (A):** A is about cost, not attitude to innovation.

---

### A6. Cross-text Matching

**Purpose:** Show which text contains the claim and how to distinguish similar writers.

**Recommended sections:**
- Correct answer (text letter)
- Reading evidence (from correct text)
- Why other texts don't fit (1–2 lines)

**Personalization:**
- User picked text with partial overlap → "Text B mentions X, but only D states Y."

**Length:** 25–30 sec

---

### A7. Gapped Text

**Purpose:** Teach cohesion — pronouns, linkers, topic continuity.

**Recommended sections:**
- Correct paragraph
- Reading evidence (link to previous/next sentence)
- Cohesion focus (reference, contrast, addition)
- Why your paragraph breaks the flow

**Personalization:**
- Wrong paragraph with matching keyword but wrong topic → explain topic shift.
- Pronoun mismatch → highlight *this/these* chain.

**Length:** 30 sec

---

### A8. Multiple Matching

**Purpose:** Show where the specific detail appears and eliminate close matches.

**Recommended sections:**
- Correct match
- Reading evidence
- Why your match is wrong

**Personalization:** Per confused pair (Person 2 vs. Person 4).

**Length:** 20–25 sec per question

---

## Exam Listening

### B1–B5. Listening types

Follow reading equivalents but add **Listening evidence**:

| Type | Emphasis in explanation |
|------|-------------------------|
| MCQ (B1, B4) | Transcript quote + paraphrase trap |
| Sentence completion (B2) | Exact words + spelling note |
| Speaker matching (B3) | Speaker ID + distinguishing phrase |
| Dual matching (B5) | Two-column reasoning |

**Personalization:**
- "You heard X but the speaker said Y at 0:42."
- Homophone error: *their* vs. *there*.

**Length:** 25–30 sec

**Example (sentence completion):**
> **Correct answer:** environment  
> **Listening evidence:** *"protect the marine **environment**"*  
> **Your answer (environments):** Singular — one specific environment is meant.

---

## Exam Writing (AI)

### C1–C3. Essay / Email / Choice

**Purpose:** Actionable improvement on weakest criterion — not just a score.

**Recommended sections:**
- Score snapshot (top 2 criteria only)
- Top strength (1 bullet)
- Priority fix (1 bullet, linked to corrected text)
- Corrected excerpt (1–2 sentences max)
- Useful tip (genre-specific)

**Personalization:**
- Lowest criterion drives the "Priority fix."
- Corrected text highlights map to explanation.
- Email: bullet-point checklist for missed points.

**Length:** 30 sec scannable; full report available on expand

**Example:**
> **Focus:** Organisation (3/5)  
> **Strength:** Clear position in paragraph 1.  
> **Fix:** Add a linker between body paragraphs (*Furthermore, …*).  
> **Excerpt:** ~~Also the government should~~ → **Furthermore, the government should**

---

## Exam Speaking (AI)

### D1–D4. All speaking parts

**Purpose:** One clear upgrade path from the user's actual transcript.

**Recommended sections:**
- Score highlight (weakest criterion)
- What you did well (1 line)
- Upgrade (replace weak phrase with stronger version)
- Useful tip (part-specific: speculation / negotiation / extension)
- Part-specific check (Speculation / Interactive) when applicable

**Personalization:**
- Quote user's weak phrase → upgraded version.
- Short answer in Part 1 → "Extend with one reason/example."
- Part 3: missing response to partner → suggest backchannel + opinion.

**Length:** 30 sec

**Example:**
> **Focus:** Lexical Resource (6/10)  
> **You said:** "It's a nice photo."  
> **Upgrade:** "The photo captures a sense of tranquillity."  
> **Tip:** In Part 2, speculate with *It looks as though…* / *They might be…*

---

## Sune Play Course Formats

### E1/E2. Two-option / Meaning contrast

**Purpose:** Contrast the two options — nuance, not definition.

**Sections:** Correct answer · Nuance contrast · Completed sentence · Tip

**Personalization:** Name the wrong option and one distinguishing feature.

**Length:** 15–20 sec

**Example:**
> **Correct:** pessimistic  
> **Contrast:** *Optimistic* = too positive; the clue *I'm sure you'll pass* shows the speaker disagrees with negativity.  
> **Sentence:** *You're being far too **pessimistic** about your chances.*

---

### E3. MC 4-option

**Purpose:** Eliminate distractors; for passage mode, per-gap micro-explanation.

**Sections:** Correct answer · Why · Why others fail (if wrong) · Vocabulary/grammar focus

**Personalization:** User's letter + trap type.

**Length:** 20–25 sec

---

### E4–E9. Gap fills (free, conjugation, word bank, passage, synced)

**Purpose:** Grammar/vocabulary rule for the slot.

**Sections:** Correct answer · Grammar focus · Sentence with gap filled · Common mistake

**Personalization:** Map user answer to error type (tense, article, wrong bank word).

**Length:** 20 sec

**Example (conjugation):**
> **Correct:** has been working  
> **Grammar focus:** Present perfect continuous — started in past, still ongoing (*for three years*).  
> **Your answer:** *works* → simple present doesn't show duration.

---

### E10. Keyword transformation

Same as Exam A4. Add word-count line when `wordCountInvalid`.

**Length:** 25–30 sec

---

### E11. Error correction

**Sections:** Correct form · What was wrong · Grammar focus · Fixed sentence

**Personalization:** If user changed wrong word, redirect to bold error.

**Length:** 20 sec

---

### E12. Find extra word

**Sections:** Extra word (or "sentence is correct") · Why it's redundant · Fixed sentence

**Personalization:** If user tapped wrong token, explain why that word is needed.

**Length:** 15–20 sec

---

### E13. Word order tiles

**Sections:** Correct sentence · Word order rule · Your order vs. correct (if wrong)

**Personalization:** Show first divergence point in tile sequence.

**Length:** 25 sec

---

### E14. Full sentence write

**Sections:** Model sentence · Key cues used · Common omission

**Personalization:** Which cue was missing from user sentence.

**Length:** 25 sec

---

### E15. Verb bank two-step

**Sections (step-aware):**  
- Step 1 wrong: "Why this verb doesn't fit" + semantic contrast  
- Step 2 wrong: Conjugation rule + correct form

**Length:** 15–20 sec per step

---

### E16. Column matching

**Sections:** Correct ending · Collocation/rule · Full completed sentence

**Personalization:** Show the ending user picked and why it doesn't collocate.

**Length:** 20 sec per pair

---

### E17. Crossword clues

**Sections:** Correct word · Definition recap · Spelling note (if near-miss)

**Length:** 15 sec

---

### E18. Comma placement

**Sections:** Correct comma positions · Punctuation rule · Your placement diff

**Personalization:** "You added a comma after *which* — non-defining clause needs commas both sides."

**Length:** 20–25 sec

---

### E19. Word bank tick

**Sections:** Correct set · Rule · Words you missed / shouldn't have selected

**Personalization:** List false positives and false negatives by name.

**Length:** 25 sec

---

### E20. Stative sorting

**Sections:** Correct category · Rule · Misplaced verbs explained

**Personalization:** Per wrong verb — why it belongs in the other group.

**Length:** 25 sec

---

### E21–E22. Passage error hunt

**Sections:** Error location · Wrong form → correct form · Grammar focus · (counter) N remaining

**Personalization:** Wrong tap → "This phrase is grammatically fine; look for tense." Wrong fix → conjugation help.

**Length:** 20–25 sec per error

---

### E23. Guided error choice

**Sections:** Correct form · Why others are wrong · Grammar focus

**Personalization:** Per-item distractor the user chose.

**Length:** 15–20 sec per item

---

### E24. Conversation gap fill

**Sections:** Correct phrase · Register/context · Full line with gap filled

**Personalization:** Wrong phrasal verb — contrast literal vs. idiomatic meaning.

**Length:** 20 sec

---

## B1 Grammar Lesson

Mirror Sune Play designs (E4, E2, E15, E11, E21). Use the same section sets; content comes from `data-explanation`.

---

## Fast Learning

### PV / Idiom fill-in & drag

**Sections:** Correct answer · Meaning · Example sentence · (drag) which gap

**Personalization:** User's wrong PV/idiom + why it doesn't fit context.

**Length:** 15–20 sec

**Example:**
> **Correct:** give up  
> **Meaning:** stop trying  
> **Your answer (give in):** *Give in* = surrender to pressure, not stop attempting.

---

### Word formation (wf-multiple-choice / wf-transform)

**Sections:** Correct form · Formation process · Part of speech rule

**Length:** 20 sec

---

### Vocab quiz / review

**Sections:** Correct answer · One-line definition · Memory tip

**Length:** 15 sec

---

## Video Stories

### multiple_choice / fill_gap_choice

**Sections:** Correct answer · Clip context · Why wrong choice fails

**Length:** 20 sec

---

### order_sentences

**Sections:** Correct order · Connector/logic chain · First break in user's order

**Length:** 25 sec

**Example:**
> **Order:** 2 → 1 → 3  
> **Logic:** Result (2) → cause (1) → consequence (3).  
> **Your break:** You put 3 before 1; the cause must come before the result.

---

## Micro-learning

### mc

Same as A1, shorter (15 sec).

### transform

Same as A4, shorter (20 sec).

---

# STEP 3 — Unified Philosophy

## Core principles

1. **Teach, don't tell.** Every explanation answers *why*, not only *what*. The correct answer is always visible, but the learning value is in the rule, evidence, or contrast.

2. **Match the skill.** Cloze → collocation/grammar rule. Reading MC → text evidence. Listening → transcript evidence. Writing/speaking → criterion-based actionable feedback. Sorting → category rule.

3. **Concise by default.** Target **15–30 seconds** reading time. One main insight per explanation. Expandable "Learn more" for exam parts with long rubrics.

4. **Scannable structure.** Use fixed section labels (icons + headings) so users know where to look: ✓ Answer · 💡 Why · 📖 Evidence · ⚠️ Your mistake · 💬 Tip.

5. **Personalize when data allows.** Always show user's answer when wrong. Name the specific distractor, error type, or transcript phrase. Skip personalization when correct (positive reinforcement only — 1 line).

6. **Consistent shell, adaptive body.** All explanations use the same container (`LessonExplanation` evolution) but section *presence* varies by type. Never force "Why the other answers are wrong" on open cloze; never skip evidence on reading comprehension.

7. **Progressive disclosure.**  
   - **Layer 1 (FeedbackSheet):** Correct/incorrect + 1-line hint.  
   - **Layer 2 (Explain):** Full structured explanation.  
   - **Layer 3 (Exam panel / AI report):** Deep dive, all questions, scores.

8. **Reinforce, don't punish.** Tone: diagnostic, not judgmental. "Your answer suggests…" not "Wrong again." Celebrate pattern recognition.

9. **Course alignment.** Pull grammar focus labels from unit `theory` where possible (tense name, skill tag). Explanations should echo what the lesson just taught.

10. **No walls of text.** Max 5 sections visible without scroll on mobile. Bullets over paragraphs. Bold only key terms and answers.

## Section vocabulary (platform-wide)

| Section label | When to use |
|---------------|-------------|
| Correct answer | Always (or "Model answer" for writing/speaking) |
| Why it's correct | Always |
| Your answer | When wrong |
| Reading/Listening evidence | Comprehension, matching, gapped text |
| Grammar focus | Cloze, conjugation, transformation, error fix |
| Vocabulary focus | Word choice, formation, PV, idioms |
| Word formation process | word-formation, wf-transform |
| Why others are wrong | MCQ with ≤4 options |
| Common mistake | When user answer matches a known trap |
| Useful tip | One exam/usage tip |
| Similar example | Transformations, comma rules |
| Score focus | Writing/speaking AI only |

## Mistake taxonomy (for personalization engine)

| Category | Detection source | Feedback pattern |
|----------|------------------|------------------|
| Wrong tense/form | String compare, conjugation items | Name tense + timeline clue |
| Wrong word order | Tile diff, transform compare | Show correct position |
| Wrong preposition/article | Open cloze compare | Fixed preposition rule |
| Wrong collocation | MCQ distractor | Contrast collocations |
| Wrong article | a/the/– | Countability/specificity |
| Distractor trap | MCQ letter ≠ correct | Name trap type |
| Word count | `wordCountInvalid` | State limit |
| Wrong category | Sorting/matching | Category definition |
| Spelling near-miss | Fuzzy match | Show correct spelling |
| Part of speech error | WF, adverb/adj | Slot requires X POS |
| Evidence miss | Reading/listening MCQ | Quote supporting line |
| Register/genre | Writing AI | Genre convention |

## What not to do

- Same three-block template for every type without adaptation
- Full AI writing/speaking report as the only explanation (too long)
- Explaining all four distractors when user got it right
- Generic "Review the grammar" without pointing to the specific rule
- Hiding the user's answer when they were wrong

---

## Appendix: Type Count Summary

| System | Distinct exercise types |
|--------|-------------------------|
| Exam Reading | 8 |
| Exam Listening | 5 (+ level variants) |
| Exam Writing | 3 |
| Exam Speaking | 4 |
| Sune Play v2 | 24 |
| B1 Grammar | 5 |
| Fast Learning (exercise) | 11 |
| Video Stories | 3 |
| Micro-learning | 2 |
| **Total unique types** | **~65** (some share interaction patterns) |

---

*End of document. Ready for implementation planning.*
