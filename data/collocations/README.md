# data/collocations — Colocaciones

Este directorio contiene los datos para el módulo de **colocaciones** del aprendizaje rápido. Las colocaciones son combinaciones de palabras que se usan juntas con frecuencia en inglés (p.ej. *make a decision*, *heavy rain*, *strongly recommend*).

## Estructura

```
collocations/
├── dictionary.json     # Diccionario completo de colocaciones
└── Collocations.csv    # Datos fuente en CSV
```

## Archivo `dictionary.json`

Contiene el diccionario completo de colocaciones agrupadas por palabra base o categoría. Se usa tanto para la búsqueda rápida desde la herramienta de diccionario como para generar los ejercicios.

## Archivo `Collocations.csv`

Fuente de datos en formato CSV desde la que se generan o actualizan los ejercicios y el diccionario. Las columnas típicas incluyen la palabra base (*node word*), el colocado (*collocate*), el tipo de colocación y un ejemplo de uso.

## Tipos de colocación habituales

| Tipo | Ejemplo |
|---|---|
| Verbo + sustantivo | *make a decision*, *take a risk* |
| Adjetivo + sustantivo | *heavy traffic*, *strong opinion* |
| Adverbio + verbo/adjetivo | *strongly recommend*, *deeply concerned* |
| Sustantivo + sustantivo | *a sense of humour*, *a waste of time* |
