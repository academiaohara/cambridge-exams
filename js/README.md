# js — Lógica JavaScript

Este directorio contiene toda la lógica JavaScript de la aplicación. No hay framework, bundler ni transpilador: todo se carga directamente como archivos estáticos en el navegador.

## Patrón de diseño

Todo el código se encapsula en **IIFEs** (`(function() { ... })()`) para evitar la contaminación del scope global. Los objetos principales (`App`, `Dashboard`, `Exercise`, etc.) se exponen explícitamente en `window` cuando necesitan ser accesibles desde otros módulos.

## Archivos principales

| Archivo | Responsabilidad |
|---|---|
| `config.js` | Constantes globales: URLs base, versión de la app, mapeo de tipos de ejercicio (`EXERCISE_TYPE_FILES`), umbrales del temporizador. Expone `window.CONFIG`. |
| `state.js` | Estado global de la aplicación. Expone `window.AppState` (estado mutable) y `window.EXAMS_DATA` (catálogo de exámenes en memoria). |
| `app.js` | Punto de arranque (`App.init()`). Inicializa el nivel, descubre los tests disponibles (`syncExamsFromFolders()`) y renderiza el dashboard. |
| `router.js` | Gestión de rutas dentro de la SPA. |
| `dashboard.js` | Renderiza la pantalla principal con la lista de tests y secciones (`Dashboard.render()`). Muestra las insignias de progreso. |
| `exercise.js` | Controlador de ejercicios: carga, guarda y navega entre partes (`openPart`, `startFullSection`, `goToNextPart`). |
| `exercise-renderer.js` | Genera el HTML completo de un ejercicio a partir del JSON (`ExerciseRenderer.render()`). |
| `exercise-handlers.js` | Event listeners y lógica de verificación de respuestas. Marca visualmente correcto/incorrecto. |
| `exam-session.js` | Gestión de sesiones de examen completas (temporizador global, puntuación final). |
| `timer.js` | Cronómetro con alertas visuales (`warning` a 300s, `danger` a 600s). |
| `modal.js` | Diálogos modales para opciones de múltiple elección. |
| `tools.js` | Herramientas de estudio: diccionario, traductor, subrayador, notas, tips. |
| `utils.js` | Utilidades: fetch con caché-buster, carga dinámica de CSS/JS, comparación de respuestas (`compareAnswers`). |
| `fast-exercises.js` | Motor de ejercicios de aprendizaje rápido: vocabulario, phrasal verbs, idioms, word formation. |
| `micro-learning.js` | Módulo de micro-aprendizaje (tarjetas rápidas). |
| `streak-manager.js` | Gestión de rachas de estudio diarias y calendario de actividad. |
| `score-calculator.js` | Cálculo de puntuaciones y conversión a la Cambridge English Scale. |
| `bento-grid.js` | Renderizado del grid de estadísticas en el dashboard. |
| `question-nav.js` | Navegación entre preguntas dentro de un ejercicio. |
| `sync-manager.js` | Sincronización de datos con Supabase. |
| `auth.js` | Autenticación de usuarios (Supabase). |
| `user-profile.js` | Gestión del perfil de usuario. |
| `writing-validator.js` | Validación y evaluación de ensayos con IA (OpenAI). |
| `config-supabase.js` | Configuración de la conexión a Supabase. |

## Subdirectorios

### `exercise-types/`

Contiene la lógica específica de cada tipo de ejercicio. Los archivos se cargan **bajo demanda** (dinámicamente) cuando se abre un ejercicio del tipo correspondiente, lo que evita cargar código innecesario en el arranque.

| Archivo | Tipo de ejercicio |
|---|---|
| `reading-type1.js` | `multiple-choice` — Part 1 Reading |
| `reading-type2.js` | `open-cloze` — Part 2 Reading |
| `reading-type3.js` | `word-formation` — Part 3 Reading |
| `reading-type4.js` | `transformations` — Part 4 Reading |
| `reading-type5.js` | `multiple-choice-text` — Part 5 Reading |
| `reading-type6.js` | `cross-text-matching` — Part 6 Reading |
| `reading-type7.js` | `gapped-text` — Part 7 Reading |
| `reading-type8.js` | `multiple-matching` — Part 8 Reading |
| `listening-type1.js` | `multiple-choice` — Part 1 Listening |
| `listening-type2.js` | `sentence-completion` — Part 2 Listening |
| `listening-type4.js` | `dual-matching` — Part 4 Listening |
| `writing-type1.js` | `essay` — Part 1 Writing |
| `writing-type2.js` | `choice` — Part 2 Writing |
| `speaking-type.js` | `interview`, `long-turn`, `collaborative`, `discussion` — Speaking |

### `services/`

Servicios auxiliares de integración con terceros.

| Archivo/Directorio | Descripción |
|---|---|
| `services/ai/` | Integración con OpenAI para evaluación de escritura y speaking. |

## Flujo de carga de un ejercicio

```
Exercise.openPart(examId, section, part)
  ├─ Fetch: Nivel/{LEVEL}/Exams/{examId}/{section}{part}.json
  ├─ Utils.loadExerciseTypeCSS(type)   ← inyecta <link> bajo demanda
  ├─ Utils.loadExerciseTypeJS(type)    ← inyecta <script> bajo demanda
  ├─ ExerciseRenderer.render(...)      ← genera el HTML
  ├─ Exercise.restoreSavedAnswers()    ← recupera respuestas de localStorage
  └─ Timer.startTimer()               ← inicia el cronómetro
```
