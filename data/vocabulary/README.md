# data/vocabulary — Vocabulario General

Este directorio contiene los datos para las lecciones de **vocabulario** del módulo de aprendizaje rápido (flashcards).

## Estructura

```
vocabulary/
├── dictionary.json     # Diccionario completo de vocabulario
├── A2.csv              # Datos fuente en CSV (nivel A2)
├── B1.csv              # Datos fuente en CSV (nivel B1)
├── B2.csv              # Datos fuente en CSV (nivel B2)
├── C1.csv              # Datos fuente en CSV (nivel C1)
└── A2/                 # Lecciones organizadas por tema para nivel A2
    ├── lesson-1.json
    └── ...
```

## Sistema de flashcards

Las lecciones de vocabulario utilizan un sistema de **flashcards por temas** con seguimiento de racha por palabra:

| Constante | Valor | Descripción |
|---|---|---|
| `VOCAB_BATCH_SIZE` | 15 | Palabras por sesión de práctica |
| `VOCAB_MAX_STREAK` | 10 | Racha máxima por palabra (se considera "aprendida") |
| `VOCAB_RETRY_POS` | 2 | Posición en la que se reintroducen las palabras falladas |

El progreso de cada palabra se guarda en `localStorage` bajo la clave `cambridge_vocab_streaks`.

### Modos de sesión

| Modo | Condición | Descripción |
|---|---|---|
| `'learn'` | streak = 0 | Primera vez que se estudia la palabra |
| `'review'` | streak > 0 | Repaso de palabras ya vistas |

## Esquema de una lección (`lesson-N.json`)

```json
{
  "id": "A2-lesson-1",
  "title": "Topic: Food & Drink",
  "topic": "food",
  "words": [
    {
      "word": "breakfast",
      "translation": "desayuno",
      "definition": "the first meal of the day",
      "example": "I have breakfast at 8 o'clock every morning.",
      "partOfSpeech": "noun"
    }
  ]
}
```
