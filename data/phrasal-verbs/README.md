# data/phrasal-verbs — Verbos Frasales

Este directorio contiene los datos para las lecciones de **phrasal verbs** del módulo de aprendizaje rápido.

## Estructura

```
phrasal-verbs/
├── levels.json         # Catálogo de niveles y lecciones
├── dictionary.json     # Diccionario completo (261 entradas: B1:101 / B2:141 / C1:19)
├── B1.csv              # Datos fuente en CSV (nivel B1, 13 lecciones)
├── B2.csv              # Datos fuente en CSV (nivel B2, 22 lecciones)
├── C1.csv              # Datos fuente en CSV (nivel C1, 5 lecciones)
├── B1/                 # Lecciones generadas para nivel B1
│   ├── lesson-1.json
│   └── ...
├── B2/                 # Lecciones generadas para nivel B2
│   ├── lesson-1.json
│   └── ...
└── C1/                 # Lecciones generadas para nivel C1
    ├── lesson-1.json
    └── ...
```

## Número de lecciones

| Nivel | Lecciones | Notas |
|---|---|---|
| B1 | 16 | Incluye lección "Final Challenge" |
| B2 | 22 | Incluye lección "Final Challenge" |
| C1 | 5 | |

## Esquema de una lección (`lesson-N.json`)

```json
{
  "id": "B1-lesson-1",
  "title": "Lesson 1 — Come & Go",
  "phrasalVerbs": [
    {
      "verb": "come across",
      "meaning": "to find something by chance",
      "example": "I came across an old photo while tidying up."
    }
  ],
  "fillInExercises": [
    {
      "sentence": "She ___ an old letter while cleaning.",
      "options": ["came across", "went off", "put up with", "look into"],
      "correct": 0,
      "writeVerb": "come across"
    }
  ],
  "conversations": [
    {
      "speakers": ["Laura", "Mark"],
      "lines": [
        { "speaker": "Laura", "text": "Did you [come across] anything interesting at the market?" },
        { "speaker": "Mark", "text": "Yes! I found a great book." }
      ]
    }
  ]
}
```

> Los verbos en el texto de las conversaciones se marcan con `[corchetes]`.

## Tipos de punto en la lección

| Tipo | Descripción |
|---|---|
| `pv-gallery` | Tarjetas desplazables con el phrasal verb, su significado y un ejemplo. |
| `pv-fill-in` | Opción múltiple + escribir el verbo correctamente. |
| `pv-conversations` | Diálogos con los phrasal verbs resaltados y clicables. |
| `pv-conversation-drag` | Rellena los huecos del diálogo arrastrando los phrasal verbs. |
| `pv-mixed` | Ejercicio mixto de repaso de todos los verbos de la lección. |

## Layout visual

Las vistas de ejercicio de phrasal verbs usan un layout de dos columnas:
- **Sidebar izquierdo** (148px, fijo): puntos de la lección como indicadores de progreso.
- **Área principal derecha**: contenido del ejercicio actual.
