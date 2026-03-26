# C1 Advanced – Course Structure & Development Guide

> **Guía de desarrollo del curso C1.** Este README sirve como documento de referencia para construir los 13 bloques del curso, con el esquema de cada fichero JSON, el estado de progreso y los prompts de IA listos para usar.

---

## 📐 Estructura del curso

| Total | Unidades | Bloques | Reviews |
|-------|----------|---------|---------|
| **39 ficheros** | 26 (1 por tema) | 13 bloques × 2 unidades | 13 (1 por bloque) |

Cada bloque sigue este esquema:

```
Bloque N
├── Unit(2N-1).json  → Gramática
├── Unit(2N).json    → Vocabulario
└── ReviewN.json     → Repaso del bloque
```

### 💡 Recomendación de estructura de páginas

**Opción elegida: 39 páginas individuales**

Aunque sería posible agrupar los dos temas de un bloque en una sola página (13 páginas), se recomienda **una página por fichero JSON** (39 en total) por las siguientes razones:

- Cada unidad es larga; agruparlas haría páginas demasiado pesadas.
- Los usuarios pueden marcar el progreso unidad a unidad (grammar → vocabulary → review).
- Es más fácil añadir contenido o corregir errores en ficheros independientes.
- Permite mostrar en el mapa de progreso tres nodos distintos por bloque: 📘 Grammar · 📗 Vocab · 🔁 Review.

---

## 📋 Plan completo de 13 bloques

| Bloque | Unidad | Tipo | Tema | Fichero | Estado |
|--------|--------|------|------|---------|--------|
| 1 | 1 | Grammar | Present time | Unit1.json | ✅ Hecho |
| 1 | 2 | Vocabulary | Thinking and learning | Unit2.json | ✅ Hecho |
| 1 | – | Review | Units 1 and 2 | Review1.json | ✅ Hecho |
| 2 | 3 | Grammar | Past time | Unit3.json | ⏳ Pendiente |
| 2 | 4 | Vocabulary | Change and technology | Unit4.json | ⏳ Pendiente |
| 2 | – | Review | Units 3 and 4 | Review2.json | ⏳ Pendiente |
| 3 | 5 | Grammar | Future time | Unit5.json | ⏳ Pendiente |
| 3 | 6 | Vocabulary | Time and work | Unit6.json | ⏳ Pendiente |
| 3 | – | Review | Units 5 and 6 | Review3.json | ⏳ Pendiente |
| 4 | 7 | Grammar | Passives and causatives | Unit7.json | ⏳ Pendiente |
| 4 | 8 | Vocabulary | Movement and transport | Unit8.json | ⏳ Pendiente |
| 4 | – | Review | Units 7 and 8 | Review4.json | ⏳ Pendiente |
| 5 | 9 | Grammar | Modals and semi-modals | Unit9.json | ⏳ Pendiente |
| 5 | 10 | Vocabulary | Communication and the media | Unit10.json | ⏳ Pendiente |
| 5 | – | Review | Units 9 and 10 | Review5.json | ⏳ Pendiente |
| 6 | 11 | Grammar | Conditionals | Unit11.json | ⏳ Pendiente |
| 6 | 12 | Vocabulary | Chance and nature | Unit12.json | ⏳ Pendiente |
| 6 | – | Review | Units 11 and 12 | Review6.json | ⏳ Pendiente |
| – | – | Progress Test | Units 1–12 | ProgressTest1.json | ⏳ Pendiente |
| 7 | 13 | Grammar | Unreal time | Unit13.json | ⏳ Pendiente |
| 7 | 14 | Vocabulary | Quantity and money | Unit14.json | ⏳ Pendiente |
| 7 | – | Review | Units 13 and 14 | Review7.json | ⏳ Pendiente |
| 8 | 15 | Grammar | Adjectives and adverbs | Unit15.json | ⏳ Pendiente |
| 8 | 16 | Vocabulary | Materials and the built environment | Unit16.json | ⏳ Pendiente |
| 8 | – | Review | Units 15 and 16 | Review8.json | ⏳ Pendiente |
| 9 | 17 | Grammar | Clauses | Unit17.json | ⏳ Pendiente |
| 9 | 18 | Vocabulary | Reactions and health | Unit18.json | ⏳ Pendiente |
| 9 | – | Review | Units 17 and 18 | Review9.json | ⏳ Pendiente |
| 10 | 19 | Grammar | Complex sentences | Unit19.json | ⏳ Pendiente |
| 10 | 20 | Vocabulary | Power and social issues | Unit20.json | ⏳ Pendiente |
| 10 | – | Review | Units 19 and 20 | Review10.json | ⏳ Pendiente |
| 11 | 21 | Grammar | Noun phrases | Unit21.json | ⏳ Pendiente |
| 11 | 22 | Vocabulary | Quality and the arts | Unit22.json | ⏳ Pendiente |
| 11 | – | Review | Units 21 and 22 | Review11.json | ⏳ Pendiente |
| 12 | 23 | Grammar | Verbal complements | Unit23.json | ⏳ Pendiente |
| 12 | 24 | Vocabulary | Relationships and people | Unit24.json | ⏳ Pendiente |
| 12 | – | Review | Units 23 and 24 | Review12.json | ⏳ Pendiente |
| 13 | 25 | Grammar | Reporting | Unit25.json | ⏳ Pendiente |
| 13 | 26 | Vocabulary | Preference and leisure activities | Unit26.json | ⏳ Pendiente |
| 13 | – | Review | Units 25 and 26 | Review13.json | ⏳ Pendiente |

---

## 🗂️ Esquemas JSON de referencia

Los tres tipos de fichero siguen estos esquemas. El Bloque 1 es el ejemplo definitivo a seguir.

### 1. Grammar unit (`Unit1.json`, `Unit3.json`, …)

```json
{
  "block": 1,
  "unit": 1,
  "type": "grammar",
  "unitTitle": "Unit 1: Present Time",
  "sections": [
    {
      "type": "theory",
      "title": "Present Simple",
      "content": [
        {
          "subtitle": "Uses",
          "items": ["General truths", "Current habits", "…"]
        },
        {
          "subtitle": "Examples",
          "items": ["The left-hand side of the brain **controls** the right-hand side.", "…"]
        },
        {
          "subtitle": "Common words and phrases",
          "items": ["always", "usually", "nowadays", "…"]
        }
      ]
    }
    /* … more tense/structure entries … */
  ]
}
```

Key rules:
- `"type": "theory"` sections contain the grammar explanation.
- Bold with `**word**` marks the target structure inside example sentences.
- `"subtitle"` options: `"Uses"`, `"Examples"`, `"Common words and phrases"`, `"Note"`, `"Watch out!"`, `"Emphatic …"`.
- Add as many `sections[]` entries as grammar points are in the unit.

---

### 2. Vocabulary unit (`Unit2.json`, `Unit4.json`, …)

```json
{
  "block": 1,
  "unit": 2,
  "type": "vocabulary",
  "unitTitle": "Unit 2: Thinking and Learning",
  "title": "Thinking and Learning",
  "sections": {
    "topic_vocabulary": {
      "subtopic1": [
        { "word": "assess", "part_of_speech": "v" }
      ],
      "subtopic2": [
        { "word": "academic", "part_of_speech": "n, adj" }
      ]
    },
    "phrasal_verbs": [
      { "verb": "brush up (on)", "meaning": "practise and improve your skills or knowledge" }
    ],
    "collocations_patterns": {
      "word": ["collocation 1", "collocation 2"]
    },
    "idioms": [
      { "idiom": "go to your head", "meaning": "…" }
    ],
    "word_formation": [
      { "base": "assume", "derivatives": ["assumption", "assuming", "unassuming"] }
    ],
    "exercises": {
      "A": { "title": "Circle the correct word", "questions": [{ "sentence": "…", "answer": "…" }] },
      "B": { "title": "Complete using the correct form of the words", "words": ["…"], "questions": [{ "sentence": "…", "answer": "…" }] },
      "C": { "title": "Correct the wrong words in bold", "questions": [{ "sentence": "…", "answer": "…" }] },
      "D": { "title": "Choose the correct word (multiple choice)", "answers": ["A", "C", "…"] },
      "E": { "title": "Match to make sentences", "matches": [{ "item": "…", "match": "…" }] },
      "K": { "title": "Key word transformation", "transformations": [{ "answer": "…" }] },
      "L": { "title": "Complete idioms", "answers": ["bell", "wits", "…"] },
      "M": { "title": "Word formation", "answers": ["confusion", "…"] }
    }
  }
}
```

Key rules:
- `topic_vocabulary` keys are the two or three sub-themes of the vocabulary unit.
- Include at least 30–40 words per unit.
- Include 12–16 phrasal verbs, 15–20 collocations, 10–12 idioms.
- `word_formation`: 8–12 base words with full derivative families.
- Exercises A–O (use the same letter codes as Unit2 as a template).

---

### 3. Review (`Review1.json`, `Review2.json`, …)

```json
{
  "block": 1,
  "type": "review",
  "unitTitle": "Review: Block 1 – Units 1 & 2",
  "sections": [
    {
      "type": "exercise",
      "title": "A: Word Formation",
      "instructions": "Use the word given in capitals to form a word that fits in the space.",
      "items": [
        { "sentence": "… (1) ...... (EXPLAIN) … (2) ...... (DEFINE).", "answer": "explanation, definition" }
      ]
    },
    {
      "type": "exercise",
      "title": "B: Key Word Transformation",
      "instructions": "Complete the second sentence…",
      "items": [
        { "sentence": "… **account**\nThat's the last time I ………", "answer": "forget to take Darren's views into account" }
      ]
    },
    {
      "type": "exercise",
      "title": "C: Idioms / Collocations",
      "instructions": "Write one word in each gap.",
      "items": [
        { "sentence": "You really have to have your ………… about you.", "answer": "wits" }
      ]
    },
    {
      "type": "exercise",
      "title": "D: Phrasal Verbs / Expressions",
      "instructions": "Circle the correct word.",
      "items": [
        { "sentence": "We're still trying to part / piece / set together what went wrong.", "answer": "piece" }
      ]
    },
    {
      "type": "exercise",
      "title": "E: Multiple Choice",
      "instructions": "Choose the correct answer.",
      "items": [
        { "sentence": "I'm in a real ……", "options": ["A dilemma", "B paradox", "C query", "D hunch"], "answer": "A" }
      ]
    }
  ]
}
```

Key rules:
- Always 5 exercise sections: **A Word Formation · B Key Word Transformation · C Idioms/Collocations · D Phrasal Verbs · E Multiple Choice**.
- Each section: 6–10 items.
- The review tests vocabulary from **both** units of the block (grammar tenses in sections C/D/E, vocabulary items in A/B/C/D/E).

---

## 🤖 Prompts de IA para generar los bloques pendientes

Copia el prompt correspondiente y pégalo en ChatGPT / Claude, adjuntando `Unit1.json`, `Unit2.json` y `Review1.json` como referencia de formato.

---

### 🔵 Bloque 2 – Past Time + The Natural World

<details>
<summary>Prompt: Unit3.json (Grammar – Past Time)</summary>

```
You are creating educational JSON content for a C1 Advanced English course.

Generate `Unit3.json` following EXACTLY the schema of the attached `Unit1.json`.

Requirements:
- block: 2, unit: 3, type: "grammar", unitTitle: "Unit 3: Past Time"
- Cover all the following grammar points, each as a separate "theory" section:
  1. Past Simple – uses, examples (with **bold** marking), common adverbials
  2. Past Continuous – uses, examples, common adverbials
  3. Past Perfect Simple – uses, examples, time conjunctions
  4. Past Perfect Continuous – uses, examples, Watch out! note
  5. Used to / Would – contrasts and restrictions
  6. Be/Get used to + -ing – meaning and examples
- For each section include: "Uses" (list), "Examples" (list with **bold**), "Common words and phrases" (list), and where relevant a "Note" or "Watch out!" subtitle
- Aim for C1 level example sentences; some should be from academic/literary register
- Output valid JSON only, no extra text
```

</details>

<details>
<summary>Prompt: Unit4.json (Vocabulary – The Natural World)</summary>

```
You are creating educational JSON content for a C1 Advanced English course.

Generate `Unit4.json` following EXACTLY the schema of the attached `Unit2.json`.

Requirements:
- block: 2, unit: 4, type: "vocabulary", unitTitle: "Unit 4: The Natural World", title: "The Natural World"
- topic_vocabulary: two sub-keys "landscape_and_geography" and "weather_and_climate", 35+ words each with part_of_speech
  - Landscape words: terrain, plateau, ridge, ravine, estuary, fjord, glacier, tundra, savannah, arid, fertile, erode…
  - Weather/climate: drought, heatwave, precipitation, humidity, gust, blizzard, sleet, monsoon, forecast, barometric…
- phrasal_verbs: 14–16 verbs related to nature/environment (e.g. die out, wipe out, set in, blow over…)
- collocations_patterns: 18–20 key words (e.g. weather, climate, landscape, species, habitat, environment…)
- idioms: 10–12 idioms using nature vocabulary (e.g. "every cloud has a silver lining", "under the weather"…)
- word_formation: 8–10 base words with full derivative families (e.g. erode → erosion, eroding, eroded, erosive)
- exercises: A (circle correct word, 10 questions), B (fill correct form, 9 questions), C (correct wrong word, 11 questions), D (multiple choice answers array), E (match to make sentences), K (key word transformation 6 items), L (complete idioms answers), M (word formation answers)
- Output valid JSON only, no extra text
```

</details>

<details>
<summary>Prompt: Review2.json (Review – Block 2)</summary>

```
You are creating educational JSON content for a C1 Advanced English course.

Generate `Review2.json` following EXACTLY the schema of the attached `Review1.json`.

Requirements:
- block: 2, type: "review", unitTitle: "Review: Block 2 – Units 3 & 4"
- 5 sections: A (Word Formation), B (Key Word Transformation), C (Idioms/Collocations), D (Phrasal Verbs/Expressions), E (Multiple Choice)
- Section A: a coherent paragraph about the natural world where students fill in gaps using capital-letter base words – 8–10 gaps, testing word_formation from Unit 4
- Section B: 8 key word transformation sentences mixing Past Time grammar (Unit 3) and Natural World vocabulary (Unit 4)
- Section C: 8 one-word gap fill sentences testing idioms and collocations from Unit 4
- Section D: 8 sentences where students circle the correct word/preposition from phrasal verbs in Unit 4
- Section E: 8 multiple choice questions (A/B/C/D) testing vocabulary from both units
- Output valid JSON only, no extra text
```

</details>

---

### 🔵 Bloque 3 – Future Forms + The Media

<details>
<summary>Prompt: Unit5.json (Grammar – Future Forms)</summary>

```
You are creating educational JSON content for a C1 Advanced English course.

Generate `Unit5.json` following EXACTLY the schema of the attached `Unit1.json`.

Requirements:
- block: 3, unit: 5, type: "grammar", unitTitle: "Unit 5: Future Forms"
- Cover these grammar points, each as a separate "theory" section:
  1. Will – predictions, decisions, promises, offers, warnings
  2. Be going to – intentions, evidence-based predictions
  3. Present Continuous for future – fixed arrangements
  4. Present Simple for future – timetables, time clauses
  5. Future Perfect Simple – completed actions before a future point
  6. Future Perfect Continuous – duration up to a future point
  7. Future in the past (was going to / would / was about to)
- For each: Uses, Examples (with **bold**), Common words and phrases; add "Note" or "Watch out!" where distinctions are tricky
- Output valid JSON only, no extra text
```

</details>

<details>
<summary>Prompt: Unit6.json (Vocabulary – The Media)</summary>

```
You are creating educational JSON content for a C1 Advanced English course.

Generate `Unit6.json` following EXACTLY the schema of the attached `Unit2.json`.

Requirements:
- block: 3, unit: 6, type: "vocabulary", unitTitle: "Unit 6: The Media", title: "The Media"
- topic_vocabulary sub-keys: "print_and_broadcast" and "digital_and_social_media", 35+ words each with part_of_speech
- phrasal_verbs: 14–16 verbs related to media/communication (e.g. tune in, log on, scroll through, cut out…)
- collocations_patterns: 18–20 key words (broadcast, coverage, headline, platform, audience, editor, source, bias…)
- idioms: 10–12 media/communication idioms (e.g. "off the record", "steal the headlines", "read between the lines"…)
- word_formation: 8–10 base words (broadcast, censor, communicate, editor, publish, report, review…)
- exercises: same structure as Unit2 exercises A–M
- Output valid JSON only, no extra text
```

</details>

<details>
<summary>Prompt: Review3.json (Review – Block 3)</summary>

```
Generate `Review3.json` following EXACTLY the schema of `Review1.json`.
- block: 3, type: "review", unitTitle: "Review: Block 3 – Units 5 & 6"
- Section A: word formation paragraph on journalism/social media, 8–10 gaps
- Section B: 8 key word transformations mixing future forms (Unit 5) + media vocab (Unit 6)
- Section C: 8 idiom/collocation gap-fills from Unit 6
- Section D: 8 phrasal verb circle-correct from Unit 6
- Section E: 8 multiple choice testing both units
- Output valid JSON only, no extra text
```

</details>

---

### 🔵 Bloque 4 – Modals and Semi-Modals + Work and Career

<details>
<summary>Prompt: Unit7.json (Grammar – Modals and Semi-Modals)</summary>

```
Generate `Unit7.json` following the schema of `Unit1.json`.
- block: 4, unit: 7, type: "grammar", unitTitle: "Unit 7: Modals and Semi-Modals"
- Grammar points: can/could, may/might, must/have to/need to, should/ought to/had better, will/would, shall, dare/used to; also semi-modals: be able to, be allowed to, be supposed to, be bound to, be likely to
- Each as a separate theory section with Uses, Examples (**bold**), Common phrases; add Watch out! for tricky distinctions (must vs. have to, may vs. might, etc.)
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit8.json (Vocabulary – Work and Career)</summary>

```
Generate `Unit8.json` following the schema of `Unit2.json`.
- block: 4, unit: 8, type: "vocabulary", unitTitle: "Unit 8: Work and Career", title: "Work and Career"
- topic_vocabulary sub-keys: "the_workplace" and "jobs_and_professions", 35+ words each
- phrasal_verbs: 14–16 work-related verbs (e.g. take on, burn out, step down, hand in, carry out…)
- collocations_patterns: 18–20 keywords (job, work, career, employer, salary, promotion, skill, interview…)
- idioms: 10–12 work idioms (e.g. "burn the midnight oil", "bite off more than you can chew"…)
- word_formation: 8–10 base words (employ, manage, negotiate, promote, recruit, resign, retire…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review4.json (Review – Block 4)</summary>

```
Generate `Review4.json` following the schema of `Review1.json`.
- block: 4, type: "review", unitTitle: "Review: Block 4 – Units 7 & 8"
- A: word formation paragraph on the modern workplace, 8–10 gaps
- B: 8 key word transformations (modals + work vocab)
- C: 8 idiom/collocation gap-fills from Unit 8
- D: 8 phrasal verb circle-correct from Unit 8
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 5 – The Passive + Health and the Body

<details>
<summary>Prompt: Unit9.json (Grammar – The Passive)</summary>

```
Generate `Unit9.json` following the schema of `Unit1.json`.
- block: 5, unit: 9, type: "grammar", unitTitle: "Unit 9: The Passive"
- Grammar points: passive with all tenses (simple/continuous/perfect), passive with modal verbs, passive infinitives and gerunds, impersonal passive (It is said that…), have/get something done, passive reporting verbs
- Each as a separate theory section; add Watch out! for agent omission and by vs. with
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit10.json (Vocabulary – Health and the Body)</summary>

```
Generate `Unit10.json` following the schema of `Unit2.json`.
- block: 5, unit: 10, type: "vocabulary", unitTitle: "Unit 10: Health and the Body", title: "Health and the Body"
- topic_vocabulary sub-keys: "the_body_and_fitness" and "illness_and_healthcare", 35+ words each
- phrasal_verbs: 14–16 health/body verbs (e.g. come down with, get over, pass out, break out, run down…)
- collocations_patterns: 18–20 keywords (health, illness, treatment, surgery, diet, exercise, recovery, symptom…)
- idioms: 10–12 body idioms (e.g. "bite the bullet", "the spitting image", "keep your chin up"…)
- word_formation: 8–10 base words (diagnose, infect, prescribe, recover, treat, vaccinate…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review5.json (Review – Block 5)</summary>

```
Generate `Review5.json` following the schema of `Review1.json`.
- block: 5, type: "review", unitTitle: "Review: Block 5 – Units 9 & 10"
- A: word formation paragraph on healthcare, 8–10 gaps
- B: 8 key word transformations (passive + health vocab)
- C: 8 idiom/collocation gap-fills from Unit 10
- D: 8 phrasal verb circle-correct from Unit 10
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 6 – Conditionals + Society and Change

<details>
<summary>Prompt: Unit11.json (Grammar – Conditionals)</summary>

```
Generate `Unit11.json` following the schema of `Unit1.json`.
- block: 6, unit: 11, type: "grammar", unitTitle: "Unit 11: Conditionals"
- Grammar points: Zero, First, Second, Third conditionals; Mixed conditionals; Unless / as long as / provided that / supposing / in case; Wishes and regrets (I wish / If only / It's time / I'd rather)
- Each as a separate theory section with Uses, Examples (**bold**), Watch out! where needed
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit12.json (Vocabulary – Society and Change)</summary>

```
Generate `Unit12.json` following the schema of `Unit2.json`.
- block: 6, unit: 12, type: "vocabulary", unitTitle: "Unit 12: Society and Change", title: "Society and Change"
- topic_vocabulary sub-keys: "social_issues" and "politics_and_government", 35+ words each
- phrasal_verbs: 14–16 verbs related to social/political change (e.g. crack down on, stand up for, give in, call for…)
- collocations_patterns: 18–20 keywords (society, government, reform, inequality, poverty, democracy, rights, protest…)
- idioms: 10–12 society/change idioms (e.g. "the tip of the iceberg", "a turning point", "rock the boat"…)
- word_formation: 8–10 base words (democrat, equal, govern, immigrate, poverty, social…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review6.json (Review – Block 6)</summary>

```
Generate `Review6.json` following the schema of `Review1.json`.
- block: 6, type: "review", unitTitle: "Review: Block 6 – Units 11 & 12"
- A: word formation paragraph on social inequality, 8–10 gaps
- B: 8 key word transformations (conditionals + society vocab)
- C: 8 idiom/collocation gap-fills from Unit 12
- D: 8 phrasal verb circle-correct from Unit 12
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 7 – Reported Speech + Science and Technology

<details>
<summary>Prompt: Unit13.json (Grammar – Reported Speech)</summary>

```
Generate `Unit13.json` following the schema of `Unit1.json`.
- block: 7, unit: 13, type: "grammar", unitTitle: "Unit 13: Reported Speech"
- Grammar points: Reporting statements (tense backshift), Reporting questions, Reporting commands/requests/suggestions, Reporting verbs (accuse of, admit, advise, claim, deny, insist, remind, warn…), No backshift contexts, Impersonal reporting (It is claimed that…)
- Each as a separate theory section with Uses, Examples (**bold**), Watch out! notes
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit14.json (Vocabulary – Science and Technology)</summary>

```
Generate `Unit14.json` following the schema of `Unit2.json`.
- block: 7, unit: 14, type: "vocabulary", unitTitle: "Unit 14: Science and Technology", title: "Science and Technology"
- topic_vocabulary sub-keys: "science_and_research" and "technology_and_innovation", 35+ words each
- phrasal_verbs: 14–16 verbs related to research/tech (e.g. carry out, break through, log in, power up, set up…)
- collocations_patterns: 18–20 keywords (research, technology, innovation, experiment, data, software, device, network…)
- idioms: 10–12 idioms (e.g. "at the cutting edge", "back to basics", "ahead of the curve"…)
- word_formation: 8–10 base words (analyse, discover, experiment, invent, innovate, programme, research, solve…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review7.json (Review – Block 7)</summary>

```
Generate `Review7.json` following the schema of `Review1.json`.
- block: 7, type: "review", unitTitle: "Review: Block 7 – Units 13 & 14"
- A: word formation paragraph on scientific discovery, 8–10 gaps
- B: 8 key word transformations (reported speech + science/tech vocab)
- C: 8 idiom/collocation gap-fills from Unit 14
- D: 8 phrasal verb circle-correct from Unit 14
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 8 – Relative Clauses + The Arts

<details>
<summary>Prompt: Unit15.json (Grammar – Relative Clauses)</summary>

```
Generate `Unit15.json` following the schema of `Unit1.json`.
- block: 8, unit: 15, type: "grammar", unitTitle: "Unit 15: Relative Clauses"
- Grammar points: Defining relative clauses (who/which/that/whose/where/when), Non-defining relative clauses, Omission of relative pronoun, Reduced relative clauses (-ing/-ed participles), What-clauses, Preposition + relative pronoun, Nominative relatives (whoever/whatever/whichever…)
- Each as a separate theory section; Watch out! for that vs. which, omission rules
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit16.json (Vocabulary – The Arts)</summary>

```
Generate `Unit16.json` following the schema of `Unit2.json`.
- block: 8, unit: 16, type: "vocabulary", unitTitle: "Unit 16: The Arts", title: "The Arts"
- topic_vocabulary sub-keys: "visual_arts_and_music" and "literature_and_performing_arts", 35+ words each
- phrasal_verbs: 14–16 arts-related verbs (e.g. put on, draw on, bring out, take up, turn out…)
- collocations_patterns: 18–20 keywords (art, music, performance, review, artist, genre, audience, exhibition…)
- idioms: 10–12 arts idioms (e.g. "all that jazz", "face the music", "strike a chord"…)
- word_formation: 8–10 base words (create, inspire, interpret, perform, produce, sculpt, compose, exhibit…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review8.json (Review – Block 8)</summary>

```
Generate `Review8.json` following the schema of `Review1.json`.
- block: 8, type: "review", unitTitle: "Review: Block 8 – Units 15 & 16"
- A: word formation paragraph about a museum exhibition, 8–10 gaps
- B: 8 key word transformations (relative clauses + arts vocab)
- C: 8 idiom/collocation gap-fills from Unit 16
- D: 8 phrasal verb circle-correct from Unit 16
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 9 – Comparison + Travel and Transport

<details>
<summary>Prompt: Unit17.json (Grammar – Comparison)</summary>

```
Generate `Unit17.json` following the schema of `Unit1.json`.
- block: 9, unit: 17, type: "grammar", unitTitle: "Unit 17: Comparison"
- Grammar points: Comparative and superlative adjectives/adverbs (regular & irregular), Double comparatives (the more…the more), Comparative structures (as…as, not as…as, less…than), Modifying comparatives (far, much, rather, slightly, even), Comparison with nouns (more/fewer/less), Comparison clauses with than/as
- Each as a separate theory section; Watch out! for fewer vs. less, further vs. farther
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit18.json (Vocabulary – Travel and Transport)</summary>

```
Generate `Unit18.json` following the schema of `Unit2.json`.
- block: 9, unit: 18, type: "vocabulary", unitTitle: "Unit 18: Travel and Transport", title: "Travel and Transport"
- topic_vocabulary sub-keys: "travel_and_tourism" and "transport_and_infrastructure", 35+ words each
- phrasal_verbs: 14–16 travel/transport verbs (e.g. set off, check in, pull over, break down, head for…)
- collocations_patterns: 18–20 keywords (journey, travel, transport, flight, traffic, route, departure, destination…)
- idioms: 10–12 travel idioms (e.g. "hit the road", "miss the boat", "off the beaten track"…)
- word_formation: 8–10 base words (depart, arrive, accommodate, navigate, tour, commute, transport…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review9.json (Review – Block 9)</summary>

```
Generate `Review9.json` following the schema of `Review1.json`.
- block: 9, type: "review", unitTitle: "Review: Block 9 – Units 17 & 18"
- A: word formation paragraph about modern tourism, 8–10 gaps
- B: 8 key word transformations (comparison structures + travel vocab)
- C: 8 idiom/collocation gap-fills from Unit 18
- D: 8 phrasal verb circle-correct from Unit 18
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 10 – Emphasis and Fronting + Education

<details>
<summary>Prompt: Unit19.json (Grammar – Emphasis and Fronting)</summary>

```
Generate `Unit19.json` following the schema of `Unit1.json`.
- block: 10, unit: 19, type: "grammar", unitTitle: "Unit 19: Emphasis and Fronting"
- Grammar points: Cleft sentences (It is/was…that/who, What…is/was), Inversion after negative/restrictive adverbials (Never had…, Not only…but also, Hardly…when, No sooner…than, Only then…), Fronting for emphasis, Emphatic do/does/did, Nominal that-clauses for emphasis
- Each as a separate theory section; Watch out! for word order in inverted questions
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit20.json (Vocabulary – Education)</summary>

```
Generate `Unit20.json` following the schema of `Unit2.json`.
- block: 10, unit: 20, type: "vocabulary", unitTitle: "Unit 20: Education", title: "Education"
- topic_vocabulary sub-keys: "schools_and_teaching" and "higher_education_and_learning", 35+ words each
- phrasal_verbs: 14–16 education verbs (e.g. drop out, fall behind, catch up, hand in, set up…)
- collocations_patterns: 18–20 keywords (education, course, degree, school, teacher, student, exam, knowledge…)
- idioms: 10–12 education idioms (e.g. "learn the ropes", "pass with flying colours", "back to square one"…)
- word_formation: 8–10 base words (educate, examine, graduate, instruct, qualify, research, study, teach…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review10.json (Review – Block 10)</summary>

```
Generate `Review10.json` following the schema of `Review1.json`.
- block: 10, type: "review", unitTitle: "Review: Block 10 – Units 19 & 20"
- A: word formation paragraph on university life, 8–10 gaps
- B: 8 key word transformations (emphasis/inversion + education vocab)
- C: 8 idiom/collocation gap-fills from Unit 20
- D: 8 phrasal verb circle-correct from Unit 20
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 11 – Gerunds and Infinitives + Money and Business

<details>
<summary>Prompt: Unit21.json (Grammar – Gerunds and Infinitives)</summary>

```
Generate `Unit21.json` following the schema of `Unit1.json`.
- block: 11, unit: 21, type: "grammar", unitTitle: "Unit 21: Gerunds and Infinitives"
- Grammar points: Verbs + infinitive (want, decide, hope…), Verbs + gerund (enjoy, avoid, admit…), Verbs + infinitive or gerund with different meanings (stop, remember, try, forget, mean, regret), Verbs + object + infinitive (want sb to, tell sb to…), Infinitive of purpose, Perfect infinitive / perfect gerund, Adjectives + infinitive, Preposition + gerund
- Watch out! for meaning changes (stop to do vs. stop doing, etc.)
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit22.json (Vocabulary – Money and Business)</summary>

```
Generate `Unit22.json` following the schema of `Unit2.json`.
- block: 11, unit: 22, type: "vocabulary", unitTitle: "Unit 22: Money and Business", title: "Money and Business"
- topic_vocabulary sub-keys: "finance_and_money" and "business_and_trade", 35+ words each
- phrasal_verbs: 14–16 money/business verbs (e.g. cash in, cut back, bail out, take over, start up…)
- collocations_patterns: 18–20 keywords (business, money, profit, investment, market, contract, trade, budget…)
- idioms: 10–12 money/business idioms (e.g. "on a shoestring", "break even", "have money to burn"…)
- word_formation: 8–10 base words (bankrupt, compete, consume, finance, invest, negotiate, profit, trade…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review11.json (Review – Block 11)</summary>

```
Generate `Review11.json` following the schema of `Review1.json`.
- block: 11, type: "review", unitTitle: "Review: Block 11 – Units 21 & 22"
- A: word formation paragraph on international trade, 8–10 gaps
- B: 8 key word transformations (gerund/infinitive + money vocab)
- C: 8 idiom/collocation gap-fills from Unit 22
- D: 8 phrasal verb circle-correct from Unit 22
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 12 – Articles and Determiners + Crime and Law

<details>
<summary>Prompt: Unit23.json (Grammar – Articles and Determiners)</summary>

```
Generate `Unit23.json` following the schema of `Unit1.json`.
- block: 12, unit: 23, type: "grammar", unitTitle: "Unit 23: Articles and Determiners"
- Grammar points: Definite article (the) – specific reference, superlatives, unique nouns, fixed phrases; Indefinite article (a/an) – first mention, classification, fixed phrases; Zero article – plural/uncountable generics, proper nouns, fixed phrases; Quantifiers (some/any/no, each/every, both/either/neither, all/whole/entire, much/many/a lot of, few/little/a few/a little)
- Watch out! for common exceptions (go to school vs. go to the school, in hospital, etc.)
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit24.json (Vocabulary – Crime and Law)</summary>

```
Generate `Unit24.json` following the schema of `Unit2.json`.
- block: 12, unit: 24, type: "vocabulary", unitTitle: "Unit 24: Crime and Law", title: "Crime and Law"
- topic_vocabulary sub-keys: "crime_and_criminals" and "the_legal_system", 35+ words each
- phrasal_verbs: 14–16 crime/law verbs (e.g. break in, lock up, get away with, cover up, give in…)
- collocations_patterns: 18–20 keywords (crime, law, court, sentence, evidence, justice, trial, punishment…)
- idioms: 10–12 law/crime idioms (e.g. "take the law into your own hands", "in cold blood", "above the law"…)
- word_formation: 8–10 base words (acquit, convict, crime, defend, guilty, investigate, judge, punish…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review12.json (Review – Block 12)</summary>

```
Generate `Review12.json` following the schema of `Review1.json`.
- block: 12, type: "review", unitTitle: "Review: Block 12 – Units 23 & 24"
- A: word formation paragraph on the justice system, 8–10 gaps
- B: 8 key word transformations (articles/determiners + crime vocab)
- C: 8 idiom/collocation gap-fills from Unit 24
- D: 8 phrasal verb circle-correct from Unit 24
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

### 🔵 Bloque 13 – Linking Words and Cohesion + Environment and Global Issues

<details>
<summary>Prompt: Unit25.json (Grammar – Linking Words and Cohesion)</summary>

```
Generate `Unit25.json` following the schema of `Unit1.json`.
- block: 13, unit: 25, type: "grammar", unitTitle: "Unit 25: Linking Words and Cohesion"
- Grammar points: Addition (moreover, furthermore, in addition, not only…but also), Contrast (however, nevertheless, on the other hand, although, despite, in spite of, while, whereas), Cause and result (as a result, consequently, therefore, due to, owing to, since, because of), Purpose (so that, in order to, so as not to), Concession (even though, although, despite), Discourse markers (in fact, indeed, as a matter of fact, after all, in other words, that is to say), Emphasis (above all, in particular, especially)
- Each as a separate theory section; Note on register (formal vs. informal connectors)
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Unit26.json (Vocabulary – Environment and Global Issues)</summary>

```
Generate `Unit26.json` following the schema of `Unit2.json`.
- block: 13, unit: 26, type: "vocabulary", unitTitle: "Unit 26: Environment and Global Issues", title: "Environment and Global Issues"
- topic_vocabulary sub-keys: "the_environment" and "global_issues", 35+ words each
- phrasal_verbs: 14–16 environment/global verbs (e.g. cut down, wipe out, phase out, build up, run out of…)
- collocations_patterns: 18–20 keywords (environment, climate, pollution, species, sustainability, energy, resources, emissions…)
- idioms: 10–12 environment/global idioms (e.g. "drop in the ocean", "turn over a new leaf", "on thin ice"…)
- word_formation: 8–10 base words (contaminate, deforest, recycle, renew, sustain, pollute, preserve, conserve…)
- exercises: same structure as Unit2 A–M
- Output valid JSON only
```

</details>

<details>
<summary>Prompt: Review13.json (Review – Block 13)</summary>

```
Generate `Review13.json` following the schema of `Review1.json`.
- block: 13, type: "review", unitTitle: "Review: Block 13 – Units 25 & 26"
- A: word formation paragraph on climate change solutions, 8–10 gaps
- B: 8 key word transformations (linking words + environment vocab)
- C: 8 idiom/collocation gap-fills from Unit 26
- D: 8 phrasal verb circle-correct from Unit 26
- E: 8 multiple choice testing both units
- Output valid JSON only
```

</details>

---

## 🔄 Cómo usar los prompts

1. **Abre ChatGPT o Claude.**
2. **Adjunta los ficheros de referencia**: `Unit1.json`, `Unit2.json` y `Review1.json` (arrastra los ficheros al chat o cópialos en el prompt).
3. **Pega el prompt del bloque** que quieras generar.
4. **Revisa el JSON** resultante: comprueba que las comillas son correctas, que no hay texto fuera del objeto JSON y que el `block`/`unit` coincide.
5. **Valida** con `python3 -m json.tool UnitN.json` antes de añadirlo al repositorio.
6. **Actualiza este README**: cambia el emoji ⏳ a ✅ en la tabla de progreso y haz commit.

---

## 📝 Notas de implementación

- Cuando se desarrolle la UI del course, cada fichero JSON se cargará como **una página independiente** en el mapa de progreso.
- El mapa mostrará **3 nodos por bloque**: 📘 Grammar (azul) → 📗 Vocabulary (verde) → 🔁 Review (naranja).
- El progreso de cada unidad se guardará en `localStorage` (clave propuesta: `cambridge_course_progress`).
- Los datos de los ficheros se cargarán bajo demanda (`fetch('data/Course/C1/Unit1.json')`).
