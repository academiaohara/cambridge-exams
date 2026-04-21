# B1 Preliminary – Guía para crear los JSON del curso

> Esta guía está basada en la estructura ya usada en `data/Course/C1` y `data/Course/B2`, adaptada al índice que compartiste para `B1`.

---

## 1) Estructura general recomendada para B1

En B1, el índice compartido sigue bloques de **3 units + 1 review**:

- `UnitX.json` → puede ser `grammar` o `vocabulary`
- `ReviewN.json` → repaso de 3 unidades
- `ProgressTest1.json` → test global de Units 1–21
- `ProgressTest2.json` → test global de Units 22–42

### Convención de nombres

- `Unit1.json`, `Unit2.json`, ..., `Unit42.json`
- `Review1.json`, `Review2.json`, ...
- `ProgressTest1.json`, `ProgressTest2.json`
- `index.json` para el catálogo del curso

---

## 2) Esquemas JSON (plantillas)

### 2.1 Unit de Grammar (`type: "grammar"`)

```json
{
  "block": 1,
  "unit": 1,
  "type": "grammar",
  "unitTitle": "Unit 1: Present simple, present continuous, stative verbs",
  "sections": [
    {
      "type": "theory",
      "title": "Present simple",
      "content": [
        {
          "subtitle": "Uses",
          "items": ["..."]
        },
        {
          "subtitle": "Examples",
          "items": ["..."]
        }
      ]
    },
    {
      "type": "exercise",
      "title": "A: ...",
      "instructions": "...",
      "items": [
        {
          "sentence": "...",
          "answer": "..."
        }
      ]
    }
  ]
}
```

### 2.2 Unit de Vocabulary (`type: "vocabulary"`)

```json
{
  "block": 1,
  "unit": 3,
  "type": "vocabulary",
  "unitTitle": "Unit 3: Fun and games",
  "sections": {
    "topic_vocabulary": {
      "Subtopic 1": [{ "word": "..." }],
      "Subtopic 2": [{ "word": "..." }]
    },
    "phrasal_verbs": [
      { "verb": "...", "meaning": "..." }
    ],
    "collocations_patterns": {
      "word": ["..."]
    },
    "word_formation": [
      { "base": "...", "derivatives": ["..."] }
    ],
    "exercises": {
      "A": {
        "title": "...",
        "instructions": "...",
        "questions": [
          {
            "sentence": "...",
            "answer": "..."
          }
        ]
      }
    }
  }
}
```

### 2.3 Review (`type: "review"`)

```json
{
  "block": 1,
  "type": "review",
  "unitTitle": "Review 1: Units 1, 2 and 3",
  "totalPoints": 50,
  "sections": [
    {
      "type": "exercise",
      "title": "A: ...",
      "instructions": "...",
      "scoring": {
        "pointsPerItem": 1,
        "maxScore": 10
      },
      "items": [
        {
          "sentence": "...",
          "answer": "..."
        }
      ]
    }
  ]
}
```

### 2.4 Progress Test (`type: "progress_test"`)

```json
{
  "block": 1,
  "type": "progress_test",
  "unitTitle": "Progress Test 1: Units 1-21",
  "totalPoints": 100,
  "sections": [
    {
      "type": "exercise",
      "title": "A: ...",
      "instructions": "...",
      "scoring": {
        "pointsPerItem": 1,
        "maxScore": 20
      },
      "items": [
        {
          "sentence": "...",
          "options": ["A ...", "B ...", "C ...", "D ..."],
          "answer": "A"
        }
      ]
    }
  ]
}
```

---

## 3) Formato de `index.json`

`index.json` debe listar todos los ficheros en `items` con la misma convención de B2/C1:

```json
{
  "level": "B1",
  "name": "B1 Preliminary",
  "totalUnits": 42,
  "items": [
    {
      "id": "Unit1",
      "type": "grammar",
      "block": 1,
      "unit": 1,
      "title": "Grammar: Present simple, present continuous, stative verbs",
      "file": "Unit1.json",
      "status": "available"
    }
  ]
}
```

Campos recomendados por item:

- `id`
- `type` (`grammar`, `vocabulary`, `review`, `progress_test`)
- `block`
- `unit` (solo para `Unit`)
- `title`
- `file`
- `status`
- `totalPoints` (solo para `progress_test`, opcional en `review`)

---

## 4) Índice B1 recibido (base de trabajo)

> Este es el índice que compartiste en la imagen (hasta `Unit42`).

| Orden | Tipo | Título / Tema | Fichero sugerido |
|---|---|---|---|
| 1 | Grammar | Unit 1: Present simple, present continuous, stative verbs | `Unit1.json` |
| 2 | Grammar | Unit 2: Past simple, past continuous, used to | `Unit2.json` |
| 3 | Vocabulary | Unit 3: Fun and games | `Unit3.json` |
| 4 | Review | Review 1: Units 1, 2 and 3 | `Review1.json` |
| 5 | Grammar | Unit 4: Present perfect simple, present perfect continuous | `Unit4.json` |
| 6 | Grammar | Unit 5: Past perfect simple, past perfect continuous | `Unit5.json` |
| 7 | Vocabulary | Unit 6: Learning and doing | `Unit6.json` |
| 8 | Review | Review 2: Units 4, 5 and 6 | `Review2.json` |
| 9 | Grammar | Unit 7: Future time (present continuous, will, be going to, present simple) | `Unit7.json` |
| 10 | Grammar | Unit 8: Prepositions of time and place | `Unit8.json` |
| 11 | Vocabulary | Unit 9: Coming and going | `Unit9.json` |
| 12 | Review | Review 3: Units 7, 8 and 9 | `Review3.json` |
| 13 | Grammar | Unit 10: The passive 1 | `Unit10.json` |
| 14 | Grammar | Unit 11: The passive 2 | `Unit11.json` |
| 15 | Vocabulary | Unit 12: Friends and relations | `Unit12.json` |
| 16 | Review | Review 4: Units 10, 11 and 12 | `Review4.json` |
| 17 | Grammar | Unit 13: Countable and uncountable nouns | `Unit13.json` |
| 18 | Grammar | Unit 14: Articles | `Unit14.json` |
| 19 | Vocabulary | Unit 15: Buying and selling | `Unit15.json` |
| 20 | Review | Review 5: Units 13, 14 and 15 | `Review5.json` |
| 21 | Grammar | Unit 16: Pronouns and possessive determiners | `Unit16.json` |
| 22 | Grammar | Unit 17: Relative clauses | `Unit17.json` |
| 23 | Vocabulary | Unit 18: Inventions and discoveries | `Unit18.json` |
| 24 | Review | Review 6: Units 16, 17 and 18 | `Review6.json` |
| 25 | Grammar | Unit 19: Modals 1: ability, permission, advice | `Unit19.json` |
| 26 | Grammar | Unit 20: Modals 2: obligation, probability, possibility | `Unit20.json` |
| 27 | Vocabulary | Unit 21: Sending and receiving | `Unit21.json` |
| 28 | Review | Review 7: Units 19, 20 and 21 | `Review7.json` |
| 29 | Progress Test | Progress Test 1: Units 1–21 | `ProgressTest1.json` |
| 30 | Grammar | Unit 22: Modals 3: the modal perfect | `Unit22.json` |
| 31 | Grammar | Unit 23: Questions, question tags, indirect questions | `Unit23.json` |
| 32 | Vocabulary | Unit 24: People and daily life | `Unit24.json` |
| 33 | Review | Review 8: Units 22, 23 and 24 | `Review8.json` |
| 34 | Grammar | Unit 25: So and such, too and enough | `Unit25.json` |
| 35 | Grammar | Unit 26: Comparatives and superlatives | `Unit26.json` |
| 36 | Vocabulary | Unit 27: Working and earning | `Unit27.json` |
| 37 | Review | Review 9: Units 25, 26 and 27 | `Review9.json` |
| 38 | Grammar | Unit 28: Conditionals 1: (zero, first, second) | `Unit28.json` |
| 39 | Grammar | Unit 29: Conditionals 2: (third) | `Unit29.json` |
| 40 | Vocabulary | Unit 30: Body and lifestyle | `Unit30.json` |
| 41 | Review | Review 10: Units 28, 29 and 30 | `Review10.json` |
| 42 | Grammar | Unit 31: Reported speech | `Unit31.json` |
| 43 | Grammar | Unit 32: Reported questions, orders, requests | `Unit32.json` |
| 44 | Vocabulary | Unit 33: Creating and building | `Unit33.json` |
| 45 | Review | Review 11: Units 31, 32 and 33 | `Review11.json` |
| 46 | Grammar | Unit 34: Direct and indirect objects | `Unit34.json` |
| 47 | Grammar | Unit 35: wish | `Unit35.json` |
| 48 | Vocabulary | Unit 36: Nature and the universe | `Unit36.json` |
| 49 | Review | Review 12: Units 34, 35 and 36 | `Review12.json` |
| 50 | Grammar | Unit 37: -ing and infinitive | `Unit37.json` |
| 51 | Grammar | Unit 38: Both, either, neither, so, nor | `Unit38.json` |
| 52 | Vocabulary | Unit 39: Laughing and crying | `Unit39.json` |
| 53 | Review | Review 13: Units 37, 38 and 39 | `Review13.json` |
| 54 | Grammar | Unit 40: Connectives | `Unit40.json` |
| 55 | Grammar | Unit 41: The causative | `Unit41.json` |
| 56 | Vocabulary | Unit 42: Problems and solutions | `Unit42.json` |
| 57 | Review | Review 14: Units 40, 41 and 42 | `Review14.json` |
| 58 | Progress Test | Progress Test 2: Units 22–42 | `ProgressTest2.json` |

### Sección de referencia (según el índice de la imagen)

- Irregular present forms
- Irregular verbs
- Topic vocabulary
- Phrasal verbs
- Prepositional phrases
- Word patterns
- Word formation

---

## 5) Checklist rápida para crear cada JSON

1. Confirmar `type` correcto (`grammar`, `vocabulary`, `review`, `progress_test`).
2. Mantener `block` y `unit` coherentes con el índice.
3. Usar títulos consistentes (`unitTitle`, `title`).
4. Añadir `scoring` en ejercicios evaluables.
5. Validar que cada `file` existe y coincide con `index.json`.

---

## 6) Formatos de ejercicios para que se visualicen bien (como B2/C1)

> ⚠️ Regla crítica: en `review` y `progress_test`, cada bloque de preguntas debe tener `"type": "exercise"`.  
> Si se usan tipos de sección como `"gap_fill"`, `"word_formation"`, `"matching"` o `"multiple_choice"`, el contenido puede no renderizarse.

### 6.1 Reglas base de renderizado

- Para huecos interactivos usar siempre `......` (6 o más puntos), no `______`.
- En *key word transformation* usar `**KEYWORD**` al final de la primera frase y `\n` antes de la segunda frase con hueco.
- En múltiple opción, `options` debe ser un array (`"A ..."`, `"B ..."`, `"C ..."`, `"D ..."`) y `answer` debe ser la letra.
- En ejercicios con dos frases de contraste, usar `sentenceA` y `sentenceB`.

### 6.2 Plantillas rápidas (copiar/pegar)

#### A) Gap fill

```json
{
  "type": "exercise",
  "title": "A: Complete the sentences",
  "instructions": "Write one word in each gap.",
  "items": [
    { "sentence": "She usually ...... at 7 a.m.", "answer": "gets up" }
  ]
}
```

#### B) Word formation

```json
{
  "type": "exercise",
  "title": "B: Word Formation",
  "instructions": "Use the word in capitals.",
  "items": [
    { "sentence": "Her ...... (EXPLAIN) was very clear.", "answer": "explanation" }
  ]
}
```

#### C) Key word transformation

```json
{
  "type": "exercise",
  "title": "C: Key Word Transformation",
  "instructions": "Complete the second sentence.",
  "items": [
    {
      "sentence": "I started English classes two years ago. **FOR**\nI ...... two years.",
      "answer": "have been in English classes for"
    }
  ]
}
```

#### D) Multiple choice

```json
{
  "type": "exercise",
  "title": "D: Multiple Choice",
  "instructions": "Choose the correct option.",
  "items": [
    {
      "sentence": "She has ...... homework today.",
      "options": ["A many", "B much", "C a lot", "D lots"],
      "answer": "B"
    }
  ]
}
```

#### E) Opciones inline (circle the correct word)

```json
{
  "type": "exercise",
  "title": "E: Circle the correct word",
  "instructions": "Choose the correct option in each sentence.",
  "items": [
    { "sentence": "He **go / goes / going** to school by bus.", "answer": "goes" }
  ]
}
```

#### F) Contraste de dos frases (stative/active, etc.)

```json
{
  "type": "exercise",
  "title": "F: Complete the pairs",
  "items": [
    {
      "sentenceA": "A) She ...... (think) about the exam now.",
      "sentenceB": "B) She ...... (think) it is easy.",
      "answer": "is thinking / thinks"
    }
  ]
}
```

### 6.3 Resumen de errores que rompen la visualización

1. Tipo de sección distinto de `"exercise"` en `review`/`progress_test`.
2. Usar guiones bajos (`______`) en vez de puntos (`......`).
3. Escribir la keyword en línea separada o entre paréntesis en vez de `**KEYWORD**`.
4. Meter opciones múltiples dentro de `sentence` en vez de usar `options`.
