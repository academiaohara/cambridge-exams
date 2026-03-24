# Nivel — Datos de Exámenes Cambridge

Este directorio contiene todos los datos de los tests organizados por nivel CEFR. Cada nivel corresponde a un examen Cambridge English específico.

## Estructura

```
Nivel/
├── B1/
│   └── Exams/          # Tests B1 Preliminary (PET)
├── B2/
│   └── Exams/          # Tests B2 First (FCE)
└── C1/
    └── Exams/          # Tests C1 Advanced (CAE)
```

## Niveles

| Directorio | Nivel CEFR | Examen Cambridge | Secciones por test |
|---|---|---|---|
| `B1/Exams/` | B1 | PET — B1 Preliminary | Reading, Speaking |
| `B2/Exams/` | B2 | FCE — B2 First | Reading (8 partes), Listening (4), Writing (2), Speaking (4) |
| `C1/Exams/` | C1 | CAE — C1 Advanced | Reading (8 partes), Listening (4), Writing (2), Speaking (4) |

## Formato de un test

Cada test se almacena en su propia subcarpeta (p.ej. `B2/Exams/Test1/`) con archivos JSON independientes por sección y parte:

```
TestN/
├── index.json          # (opcional) catálogo del test
├── reading1.json       # Parte 1: Multiple-choice cloze
├── reading2.json       # Parte 2: Open cloze
├── reading3.json       # Parte 3: Word formation
├── reading4.json       # Parte 4: Key word transformations
├── reading5.json       # Parte 5: Multiple choice (texto largo)
├── reading6.json       # Parte 6: Cross-text matching / Gapped text
├── reading7.json       # Parte 7: Gapped text / Multiple matching
├── reading8.json       # Parte 8: Multiple matching
├── listening1.json     # Parte 1: Multiple choice
├── listening2.json     # Parte 2: Sentence completion
├── listening3.json     # Parte 3: Multiple choice
├── listening4.json     # Parte 4: Multiple matching
├── writing1.json       # Parte 1: Essay (obligatoria)
├── writing2.json       # Parte 2: Elección (carta, reseña, informe, artículo)
├── speaking1.json      # Parte 1: Interview
├── speaking2.json      # Parte 2: Long turn (comparación de fotos)
├── speaking3.json      # Parte 3: Collaborative task
└── speaking4.json      # Parte 4: Discussion
```

## Catálogo de tests (`index.json`)

Cada nivel tiene un archivo `Exams/index.json` que lista todos los tests disponibles:

```json
{
  "tests": [
    { "id": "Test1", "status": "available" },
    { "id": "Test2", "status": "coming_soon" }
  ]
}
```

- `"available"` — el test está completo y es clickable en el dashboard.
- `"coming_soon"` — el test aparece en el dashboard pero está desactivado.

## READMEs de nivel

- [`B1/Exams/README.md`](B1/Exams/README.md) — guía completa del examen B1 Preliminary
- [`B2/Exams/README.md`](B2/Exams/README.md) — guía completa del examen B2 First (FCE)
- [`C1/Exams/README.md`](C1/Exams/README.md) — guía completa del examen C1 Advanced (CAE)
