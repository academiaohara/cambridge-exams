# data/word-formation — Formación de Palabras

Este directorio contiene los datos para las lecciones de **word formation** (formación de palabras) del módulo de aprendizaje rápido.

## Estructura

```
word-formation/
├── levels.json         # Catálogo de niveles y lecciones
├── dictionary.json     # Diccionario completo (1148 entradas)
├── B1/                 # Lecciones de nivel B1 (8 lecciones)
│   ├── lesson-1.json
│   ├── lesson-1b.json
│   ├── lesson-2.json
│   ├── lesson-2b.json
│   ├── lesson-2c.json
│   ├── lesson-3.json
│   ├── lesson-3b.json
│   └── lesson-3c.json
├── B2/                 # Lecciones de nivel B2 (17 lecciones: lesson-1 a lesson-5d)
│   └── ...
└── C1/                 # Lecciones de nivel C1 (5 lecciones)
    ├── lesson-1.json
    ├── lesson-1b.json
    ├── lesson-1c.json
    ├── lesson-2.json
    └── lesson-3.json
```

## Número de lecciones

| Nivel | Lecciones | Notas |
|---|---|---|
| B1 | 8 | lesson-1, -1b, -2, -2b, -2c, -3, -3b, -3c |
| B2 | 17 | lesson-1 a lesson-5d |
| C1 | 5 | lesson-1, -1b, -1c, -2, -3 |

Cada lección se centra en **un único sufijo o prefijo** (p.ej. `-tion`, `-ness`, `un-`, `dis-`).

## Esquema de una lección (`lesson-N.json`)

```json
{
  "id": "B1-lesson-1",
  "title": "Lesson 1 — Suffix -tion / -sion",
  "suffix": "-tion",
  "words": [
    {
      "base": "describe",
      "derived": "description",
      "partOfSpeech": "noun",
      "example": "The description of the painting was very detailed."
    }
  ],
  "multipleChoiceExercises": [
    {
      "sentence": "The police asked for a ___ of the suspect.",
      "options": ["describe", "description", "descriptive", "described"],
      "correct": 1
    }
  ],
  "transformExercises": [
    {
      "sentence": "The police asked for a ___ of the suspect. (DESCRIBE)",
      "correct": "description"
    }
  ]
}
```

## Tipos de punto en la lección

| Tipo | Descripción |
|---|---|
| `wf-explanation` | Explicación de la regla + tarjetas con las palabras derivadas. |
| `wf-multiple-choice` | Elige la forma correcta de la palabra derivada entre varias opciones. |
| `wf-transform` | Rellena el hueco con la forma correcta de la palabra base dada (estilo Cambridge). |
