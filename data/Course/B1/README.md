# B1 Preliminary – Guía para crear los JSON del curso

> Esta guía está basada en la estructura ya usada en `data/Course/C1` y `data/Course/B2`, adaptada al índice que compartiste para `B1`.

---

## 1) Estructura general recomendada para B1

En B1, el índice compartido sigue bloques de **3 units + 1 review**:

- `UnitX.json` → puede ser `grammar` o `vocabulary`
- `ReviewN.json` → repaso de 3 unidades
- `ProgressTest1.json` → test global de Units 1–21

### Convención de nombres

- `Unit1.json`, `Unit2.json`, ..., `Unit24.json`
- `Review1.json`, `Review2.json`, ...
- `ProgressTest1.json`
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
  "totalUnits": 24,
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

> Este es el índice que compartiste en la imagen (hasta `Unit24`).

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

---

## 5) Checklist rápida para crear cada JSON

1. Confirmar `type` correcto (`grammar`, `vocabulary`, `review`, `progress_test`).
2. Mantener `block` y `unit` coherentes con el índice.
3. Usar títulos consistentes (`unitTitle`, `title`).
4. Añadir `scoring` en ejercicios evaluables.
5. Validar que cada `file` existe y coincide con `index.json`.
