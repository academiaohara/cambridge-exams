# data — Datos de Aprendizaje Rápido

Este directorio contiene los datos utilizados por el módulo de **Fast Exercises** (ejercicios de aprendizaje rápido). Estos datos son independientes de los tests de examen completos (que se encuentran en `Nivel/`) y se usan para las sesiones de práctica de vocabulario, phrasal verbs, idioms, word formation y collocations.

## Subdirectorios

| Directorio | Categoría | Niveles disponibles | README |
|---|---|---|---|
| [`idioms/`](idioms/README.md) | Expresiones idiomáticas | B1, B2, C1, C2 | ✅ |
| [`phrasal-verbs/`](phrasal-verbs/README.md) | Verbos frasales | B1, B2, C1 | ✅ |
| [`word-formation/`](word-formation/README.md) | Formación de palabras | B1, B2, C1 | ✅ |
| [`vocabulary/`](vocabulary/README.md) | Vocabulario general | A2 | ✅ |
| [`collocations/`](collocations/README.md) | Colocaciones | (nivel mixto) | ✅ |
| `Word Formation/` | (legado) | — | — |

## Archivos comunes

La mayoría de los subdirectorios incluyen los siguientes archivos de nivel superior:

| Archivo | Descripción |
|---|---|
| `levels.json` | Catálogo de niveles y lecciones disponibles para esta categoría. |
| `dictionary.json` | Diccionario completo de términos de la categoría (para consulta rápida). |

## Formato de `levels.json`

```json
{
  "levels": [
    {
      "id": "B1",
      "name": "B1 — Intermediate",
      "lessons": [
        { "id": "lesson-1", "title": "Lesson 1 — ...", "description": "..." }
      ]
    }
  ]
}
```

## Formato general de las lecciones

Cada lección se almacena en un archivo JSON dentro de su subdirectorio de nivel (p.ej. `phrasal-verbs/B1/lesson-1.json`). El esquema exacto varía por categoría; consulta el README de cada subdirectorio para los detalles.
