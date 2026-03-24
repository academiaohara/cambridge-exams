# data/idioms — Expresiones Idiomáticas

Este directorio contiene los datos para las lecciones de **idioms** (expresiones idiomáticas) del módulo de aprendizaje rápido.

## Estructura

```
idioms/
├── levels.json         # Catálogo de niveles y lecciones
├── dictionary.json     # Diccionario completo de idioms
├── B1/                 # Lecciones de nivel B1
│   ├── lesson-1.json
│   └── ...
├── B2/                 # Lecciones de nivel B2
│   ├── lesson-1.json
│   └── ...
├── C1/                 # Lecciones de nivel C1
│   ├── lesson-1.json
│   └── ...
└── C2/                 # Lecciones de nivel C2
    ├── lesson-1.json
    └── ...
```

## Esquema de una lección (`lesson-N.json`)

Cada lección incluye cinco tipos de ejercicio:

```json
{
  "id": "B1-lesson-1",
  "title": "Lesson 1 — Feelings & Emotions",
  "idioms": [
    {
      "idiom": "over the moon",
      "meaning": "extremely happy",
      "example": "She was over the moon when she passed her exam."
    }
  ],
  "fillInExercises": [
    {
      "sentence": "He was ___ when he got the job.",
      "options": ["over the moon", "under the weather", "on thin ice", "in hot water"],
      "correct": 0
    }
  ],
  "conversations": [
    {
      "speakers": ["Anna", "Ben"],
      "lines": [
        { "speaker": "Anna", "text": "I heard you got the promotion! You must be [over the moon]." },
        { "speaker": "Ben", "text": "Absolutely! I've been waiting for this for years." }
      ]
    }
  ],
  "quizExercises": [
    {
      "type": "match-meaning",
      "pairs": [
        { "idiom": "over the moon", "meaning": "extremely happy" }
      ]
    }
  ]
}
```

### Tipos de punto en la lección

| Tipo | Descripción |
|---|---|
| `id-gallery` | Tarjetas desplazables con el idiom, su significado y un ejemplo. |
| `id-fill-in` | Opción múltiple: elige el idiom correcto para completar la frase. |
| `id-conversations` | Diálogos con los idioms resaltados y clicables. |
| `id-conversation-drag` | Rellena los huecos del diálogo arrastrando los idioms correctos. |
| `id-quiz` | Quiz de emparejamiento, completar frases o seleccionar situación. |

## Tipos de quiz (`quizExercises[].type`)

| Tipo | Descripción |
|---|---|
| `match-meaning` | Empareja cada idiom con su significado. Usa el campo `pairs[]`. |
| `complete-sentence` | Elige el idiom correcto para completar una oración. |
| `select-situation` | Selecciona la situación en la que se usaría el idiom. El índice correcto es base-0. |
