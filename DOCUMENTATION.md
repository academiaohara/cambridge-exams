# Documentación Técnica — Cambridge Exams Platform

> **⚠️ IMPORTANTE PARA LA IA:** Este archivo DEBE actualizarse cada vez que se realice un cambio en el proyecto. Al final de cualquier sesión de modificaciones, revisa este documento y refleja todos los cambios realizados (nuevos archivos, flujos modificados, nuevas funcionalidades, cambios en esquemas de datos, etc.). Esto garantiza que la próxima sesión parta de una comprensión precisa y actualizada del estado real del código.

---

## Índice

1. [Descripción General](#1-descripción-general)
2. [Tecnologías Utilizadas](#2-tecnologías-utilizadas)
3. [Estructura de Directorios](#3-estructura-de-directorios)
4. [Arquitectura y Flujo de la Aplicación](#4-arquitectura-y-flujo-de-la-aplicación)
5. [Archivos JavaScript — Roles y Responsabilidades](#5-archivos-javascript--roles-y-responsabilidades)
6. [Esquemas de Datos JSON](#6-esquemas-de-datos-json)
7. [Tipos de Ejercicio](#7-tipos-de-ejercicio)
8. [Sistema de Internacionalización (i18n)](#8-sistema-de-internacionalización-i18n)
9. [Persistencia con localStorage](#9-persistencia-con-localstorage)
10. [Herramientas de Estudio](#10-herramientas-de-estudio)
11. [Estilos CSS](#11-estilos-css)
12. [Cómo Añadir Contenido Nuevo](#12-cómo-añadir-contenido-nuevo)
13. [Cómo Ejecutar el Proyecto Localmente](#13-cómo-ejecutar-el-proyecto-localmente)
14. [Versión Actual y Historial de Cambios](#14-versión-actual-e-historial-de-cambios)

---

## 1. Descripción General

**Cambridge Exams Platform** es una aplicación web de práctica de exámenes Cambridge English (nivel C1/C2 — CAE/CPE). Permite a los estudiantes practicar las cuatro secciones del examen:

- **Reading & Use of English** — 8 partes con distintos tipos de preguntas
- **Listening** — 4 partes con audio simulado
- **Writing** — 2 tareas de redacción
- **Speaking** — 4 partes con simulación de entrevista

### Características principales

| Característica | Detalle |
|---|---|
| Niveles soportados | A2, B1, B2, C1, C2 (solo C1 tiene datos actualmente) |
| Idiomas de la UI | 12: es, en, fr, de, it, pt, ar, zh, ja, ko, hi, ru |
| Persistencia | localStorage — las respuestas y el tiempo se guardan automáticamente |
| Temporizador | Con alertas visuales (warning a 300 s, danger a 600 s) |
| Verificación de respuestas | Inmediata con explicaciones y puntuación |
| Herramientas | Diccionario, Traductor, Subrayador, Notas, Tips |
| Despliegue | GitHub Pages (sin build — HTML/CSS/JS puro) |
| URL de producción | https://academiaohara.github.io/cambridge-exams |

---

## 2. Tecnologías Utilizadas

- **HTML5** — estructura semántica, sin framework
- **CSS3** — variables CSS, Flexbox, Grid, animaciones
- **JavaScript ES6+** — módulos IIFE, sin bundler, sin transpilador
- **Font Awesome 6.0** — iconografía
- **Material Symbols Outlined** — iconos adicionales (cargado desde Google Fonts; usado en elementos de speaking y herramientas)
- **Flag Icons 7.0** — banderas de idioma
- **Google Fonts (Inter)** — tipografía
- **localStorage** — almacenamiento de estado del cliente
- **Fetch API** — carga dinámica de JSON
- **AllOrigins proxy** — fallback CORS para fetch en algunos entornos
- **OpenAI GPT-4o-mini** — evaluación de essays (requiere API key del usuario)

No hay `package.json`, `node_modules` ni proceso de compilación. Todo se sirve directamente como archivos estáticos.

---

## 3. Estructura de Directorios

```
cambridge-exams/
│
├── index.html                    # Punto de entrada único de la SPA
│
├── js/                           # Toda la lógica JavaScript
│   ├── app.js                    # Inicialización, descubrimiento de tests, eventos globales
│   ├── config.js                 # Constantes globales, mapeo de tipos de ejercicio
│   ├── state.js                  # AppState (estado global) y EXAMS_DATA (catálogo de exámenes)
│   ├── dashboard.js              # Renderizado de la pantalla principal con la lista de tests
│   ├── exercise.js               # Controlador de ejercicios: cargar, guardar, navegar partes
│   ├── exercise-renderer.js      # Genera el HTML del ejercicio a partir del JSON
│   ├── exercise-handlers.js      # Event listeners y lógica de verificación de respuestas
│   ├── timer.js                  # Cronómetro y cálculo de puntuación
│   ├── i18n.js                   # Carga de traducciones y cambio de idioma
│   ├── modal.js                  # Diálogos modales para opciones de múltiple elección
│   ├── tools.js                  # Diccionario, traductor, subrayador, notas, tips
│   ├── utils.js                  # Fetch con caché-buster, carga dinámica CSS/JS, comparación de respuestas
│   └── exercise-types/           # Lógica específica por tipo de ejercicio (cargada bajo demanda)
│       ├── reading-type1.js      # multiple-choice
│       ├── reading-type2.js      # open-cloze
│       ├── reading-type3.js      # word-formation
│       ├── reading-type4.js      # transformations
│       ├── reading-type5.js      # multiple-choice-text
│       ├── reading-type6.js      # cross-text-matching
│       ├── reading-type7.js      # gapped-text
│       ├── reading-type8.js      # multiple-matching
│       ├── listening-type1.js    # multiple-choice para listening
│       ├── listening-type2.js    # sentence-completion
│       ├── listening-type4.js    # dual-matching
│       ├── writing-type1.js      # essay
│       ├── writing-type2.js      # choice (carta, reseña, etc.)
│       └── speaking-type.js      # interview, long-turn, collaborative, discussion
│
├── css/                          # Estilos
│   ├── imports.css               # @import de todos los archivos CSS
│   ├── main.css                  # Variables globales, reset, layout base
│   └── components/               # Estilos por componente de UI
│       ├── header.css
│       ├── footer.css
│       ├── dashboard.css
│       ├── exercise.css
│       ├── modal.css
│       ├── tools.css
│       ├── responsive.css
│       └── mobile-ios.css
│   └── exercise-types/           # Estilos por tipo de ejercicio (cargados bajo demanda)
│       ├── reading-type1.css … reading-type8.css
│       ├── listening-type1.css, listening-type2.css, listening-type4.css
│       ├── writing-type1.css, writing-type2.css
│       └── speaking-type.css
│
├── Nivel/                        # Datos de los exámenes organizados por nivel CEFR
│   └── C1/
│       └── Exams/
│           └── Test1/            # Primer test completo
│               ├── reading1.json … reading8.json
│               ├── listening1.json … listening4.json
│               ├── writing1.json, writing2.json
│               └── speaking1.json … speaking4.json
│
├── lang/                         # Traducciones de la UI
│   ├── es.json, en.json, fr.json, de.json
│   ├── it.json, pt.json, ar.json, zh.json
│   ├── ja.json, ko.json, hi.json, ru.json
│
├── tips/                         # Consejos de examen por sección
│   ├── reading.json
│   ├── listening.json
│   ├── writing.json
│   ├── speaking.json
│   └── use-of-english.json
│
└── DOCUMENTATION.md              # Este archivo
```

---

## 4. Arquitectura y Flujo de la Aplicación

### 4.1 Patrón General

- Toda la aplicación es una **Single Page Application (SPA)** dentro de `index.html`.
- Todo el JavaScript se encapsula en **IIFEs** (`(function() { ... })()`) para evitar contaminación del scope global. Los objetos principales se exponen explícitamente en `window`.
- El estado global se centraliza en `window.AppState` (definido en `state.js`).
- El catálogo de exámenes se almacena en `window.EXAMS_DATA` (definido en `state.js`).

### 4.2 Flujo de Inicialización

```
DOMContentLoaded
  └─ App.init()
       ├─ Recupera nivel y idioma guardados en localStorage
       ├─ I18n.loadLanguage(lang) — carga el JSON de traducción correcto
       ├─ App.syncExamsFromFolders() — detecta tests disponibles con HEAD requests
       └─ Dashboard.render() — muestra la pantalla principal
```

### 4.3 Flujo al Abrir un Ejercicio

```
Usuario clica en una sección del dashboard
  └─ Exercise.startFullSection(examId, section)
       └─ Exercise.openPart(examId, section, part)
            ├─ Carga el JSON del ejercicio: Nivel/{LEVEL}/Exams/{examId}/{section}{part}.json
            ├─ Restaura estado guardado de localStorage
            ├─ ExerciseRenderer.render(exercise, examId, section, part)
            │    ├─ Utils.loadExerciseTypeCSS(type) — carga CSS bajo demanda
            │    ├─ Utils.loadExerciseTypeJS(type) — carga JS bajo demanda
            │    └─ Genera HTML completo del ejercicio
            ├─ Exercise.restoreSavedAnswers() — repobla inputs con respuestas previas
            └─ Timer.startTimer() — inicia el cronómetro
```

### 4.4 Flujo de Verificación de Respuestas

```
Usuario clica "Comprobar respuestas"
  └─ ExerciseHandlers verifica cada pregunta
       ├─ Utils.compareAnswers(userAnswer, correct, type)
       ├─ ExerciseHandlers.markAnswerVisual() — marca visual (✓ verde / ✗ rojo)
       ├─ Timer.updateScoreDisplay() — actualiza puntuación en pantalla
       ├─ Exercise.markPartCompleted() — actualiza estado en EXAMS_DATA
       └─ Exercise.savePartState() — persiste en localStorage
```

### 4.5 Descubrimiento Automático de Tests

`App.syncExamsFromFolders()` hace peticiones HEAD a `Nivel/{level}/Exams/Test1/reading1.json`, `Test2/reading1.json`, etc. hasta recibir un error HTTP, y construye dinámicamente `EXAMS_DATA[level]`. Esto significa que **añadir una nueva carpeta de test es suficiente para que aparezca en la UI**.

---

## 5. Archivos JavaScript — Roles y Responsabilidades

### `js/config.js` — Configuración Global

Expone `window.CONFIG` con:
- `GITHUB_USER`, `REPO_NAME`, `BRANCH` — coordenadas del repositorio
- `APP_VERSION` — versión actual (`"3.2.0"`)
- `WARNING_TIME` (300 s), `DANGER_TIME` (600 s) — umbrales del temporizador
- `EXERCISE_TYPE_FILES` — mapeo de tipo de ejercicio → archivo CSS y JS a cargar
- `EXERCISES_URL`, `LANG_BASE_URL`, `TIPS_BASE_URL`, `JS_BASE_URL`, `CSS_BASE_URL` — URLs base
- `AI_API_ENDPOINT`, `AI_MODEL` — OpenAI para evaluación de essays
- `PART_TYPES` — configuración de cada parte: `{ type, inputMode, total }`

### `js/state.js` — Estado Global

- `window.EXAMS_DATA` — catálogo inicial de exámenes; se sobreescribe en tiempo de ejecución por `syncExamsFromFolders()`
- `window.AppState` — objeto mutable que contiene: nivel actual, ejercicio activo, sección, parte, idioma, notas, puntuaciones, temporizador, flags de estado

### `js/app.js` — Punto de Arranque

- `App.init()` — función principal de inicialización
- `App.setLanguage(lang)` — cambia idioma y re-renderiza
- `App.filterByLevel(level)` — filtra dashboard por nivel CEFR
- `App.loadDashboard()` — vuelve al dashboard
- `App.syncExamsFromFolders()` — descubre tests disponibles vía HEAD requests
- Gestión del menú hamburguesa para móvil

### `js/dashboard.js` — Pantalla Principal

- `Dashboard.render()` — genera las tarjetas de tests y secciones según `EXAMS_DATA[AppState.currentLevel]`
- `Dashboard.filterByLevel(level)` — actualiza `AppState.currentLevel` y re-renderiza
- Muestra insignias de progreso (completado / en progreso) por parte

### `js/exercise.js` — Controlador de Ejercicios

- `Exercise.openPart(examId, section, part)` — carga y renderiza un ejercicio
- `Exercise.startFullSection(examId, section)` — inicia la sección desde la parte 1
- `Exercise.goToNextPart()` / `goToPrevPart()` — navega entre partes guardando estado
- `Exercise.closeExercise()` — limpia estado y vuelve al dashboard
- `Exercise.savePartState()` / `loadPartState()` / `clearPartState()` — gestión de localStorage
- `Exercise.markPartInProgress()` / `markPartCompleted()` — actualiza `EXAMS_DATA` en memoria
- `Exercise.restoreSavedAnswers()` — repobla los inputs del DOM con las respuestas guardadas

### `js/exercise-renderer.js` — Generador de HTML

- `ExerciseRenderer.render(exercise, examId, section, part)` — punto de entrada principal
- Genera el esqueleto HTML del ejercicio: cabecera, texto, ejemplo, preguntas, botones
- `renderParagraphs()` — convierte el texto (separado por `||`) en párrafos HTML con gaps numerados
- `renderTextsCards()` — para ejercicios con múltiples textos (Part 6)
- `renderToggleQuestions()` — para partes con vista de texto / vista de preguntas (Parts 5–8)
- `renderTransformationQuestions()` — layout especial para transformaciones (Part 4)
- `ExerciseRenderer.toggleView('text'|'questions')` — alterna la vista en partes 5–8

### `js/exercise-handlers.js` — Manejadores de Eventos

- Gestiona clicks, cambios e inputs de los elementos de ejercicio
- `ExerciseHandlers.getTypeChecker(type)` — devuelve el módulo del tipo específico
- `ExerciseHandlers.markAnswerVisual(qNum, userAnswer, correct, isCorrect, partConfig)` — aplica clases CSS de correcto/incorrecto
- `ExerciseHandlers.disableAllInputs(partConfig)` — deshabilita inputs tras verificar

### `js/timer.js` — Temporizador y Puntuación

- `Timer.startTimer()` — inicia el intervalo de 1 segundo
- `Timer.stopTimer()` — detiene el intervalo
- `Timer.updateScoreDisplay()` — actualiza el contador de respuestas correctas visible
- Cambia la clase CSS del timer a `warning` (>300 s) o `danger` (>600 s)

### `js/i18n.js` — Internacionalización

- `I18n.loadLanguage(lang)` — fetch de `lang/{lang}.json` y almacena en `AppState.translations`
- `I18n.t(key)` — devuelve la cadena traducida para la clave dada
- `I18n.updateSelectedFlag(lang)` — actualiza la bandera y el nombre de idioma en la UI
- `I18n.toggleDropdown()` / `initClickOutside()` — gestión del desplegable de idioma

### `js/modal.js` — Diálogos Modales

- `Modal.showOptionsModal(questionNumber, options, currentAnswer)` — muestra las opciones de una pregunta de selección múltiple
- `Modal.closeOptionsModal()` — cierra el modal

### `js/tools.js` — Herramientas de Estudio

- `Tools.switchTool(tool)` — activa/desactiva una herramienta (`notes`, `freenotes`, `dict`, `translate`, `tips`)
- `Tools.lookupWord(word)` — consulta la API del diccionario
- `Tools.translateText(text, direction)` — traduce texto
- `Tools.createHighlight(range, note, color)` — crea un subrayado en el texto
- `Tools.renderNotesArea()` — muestra las notas de subrayado
- `Tools.renderFreeNotes()` — muestra el bloc de notas libre
- `Tools.showTips(section)` — carga y muestra los tips de la sección actual

### `js/utils.js` — Utilidades

- `Utils.fetchWithNoCache(url)` — fetch con timestamp para evitar caché
- `Utils.fetchWithProxy(url)` — fetch con fallback a AllOrigins proxy
- `Utils.loadExerciseTypeCSS(type)` — inyecta `<link>` de CSS bajo demanda (solo si no existe)
- `Utils.loadExerciseTypeJS(type)` — inyecta `<script>` de JS bajo demanda (solo si no existe)
- `Utils.compareAnswers(userAnswer, correct, type)` — normaliza y compara respuestas (case-insensitive, trim)
- `Utils.formatTime(seconds)` — formatea segundos en `MM:SS`

---

## 6. Esquemas de Datos JSON

### 6.1 Esquema de Ejercicio (`Nivel/C1/Exams/Test1/{section}{part}.json`)

```json
{
  "id": "Test1-reading-1",
  "examId": "Test1",
  "section": "reading",
  "part": 1,
  "type": "multiple-choice",
  "title": "Multiple-choice cloze",
  "description": "Descripción para el estudiante",
  "time": "10",
  "totalQuestions": 8,
  "content": {
    "text": "Párrafo 1||Párrafo 2||Párrafo 3",
    "example": {
      "number": 0,
      "options": ["A) opción1", "B) opción2", "C) opción3", "D) opción4"],
      "correct": "C",
      "explanation": "Explicación de la respuesta correcta"
    },
    "questions": [
      {
        "number": 1,
        "options": ["A) opción1", "B) opción2", "C) opción3", "D) opción4"],
        "correct": "A",
        "explanation": "Explicación"
      }
    ]
  }
}
```

**Notas sobre el campo `content.text`:**
- Los párrafos se separan con `||`
- Los gaps numerados en el texto se indican con `(1)`, `(2)`, etc.
- El número `(0)` corresponde al ejemplo

**Campos `content` alternativos por tipo:**
- `content.texts` — objeto con múltiples textos (para Part 6 cross-text-matching)
- `content.paragraphs` — array de párrafos para gapped-text (Part 7)
- `content.options` — párrafos/opciones para insertar en gapped-text
- `content.keyword` — para transformaciones (Part 4)
- `content.audio_script` — para ejercicios de listening
- `content.images` — URLs de imágenes para speaking

### 6.2 Esquema de Traducción (`lang/{lang}.json`)

Objeto plano con pares `"clave": "traducción"`. Las claves más importantes:

| Clave | Uso |
|---|---|
| `loading` | Mensaje de carga |
| `checkAnswers` | Botón verificar respuestas |
| `part` | Etiqueta "Parte" |
| `correct` | Etiqueta de puntuación |
| `noExams` | Mensaje sin exámenes |
| `tips` | Etiqueta de tips |
| `dictionary` | Etiqueta del diccionario |
| `translate` | Etiqueta del traductor |
| `notes` | Etiqueta de notas |
| `next` / `previous` | Navegación entre partes |

Para añadir una nueva clave de traducción, agregarla en **todos** los 12 archivos de `lang/`.

### 6.3 Esquema de Tips (`tips/{section}.json`)

```json
{
  "tips": [
    "Consejo 1 para el estudiante",
    "Consejo 2 para el estudiante"
  ]
}
```

Secciones disponibles: `reading`, `listening`, `writing`, `speaking`, `use-of-english`.

### 6.4 Esquema de `EXAMS_DATA` (en memoria, `state.js`)

```json
{
  "C1": [
    {
      "id": "Test1",
      "number": 1,
      "title": "Test 1",
      "status": "available",
      "progress": "Ejercicios disponibles: ...",
      "sections": {
        "reading":   { "name": "READING & USE OF ENGLISH", "icon": "book-open", "total": 8, "completed": [], "inProgress": [] },
        "listening": { "name": "LISTENING",  "icon": "headphones", "total": 4, "completed": [], "inProgress": [] },
        "writing":   { "name": "WRITING",    "icon": "pen",        "total": 2, "completed": [], "inProgress": [] },
        "speaking":  { "name": "SPEAKING",   "icon": "microphone", "total": 4, "completed": [], "inProgress": [] }
      }
    }
  ]
}
```

`status` puede ser `"available"` o `"coming_soon"`. Los tests `coming_soon` se muestran pero no son clickables.

### 6.5 Esquema de `CONFIG.PART_TYPES` (`config.js`)

Mapea cada parte del examen a su configuración de renderizado. Las partes de Reading usan el número entero como clave; el resto usa prefijo de sección:

```json
{
  "1":          { "type": "multiple-choice",      "inputMode": "modal",        "total": 8  },
  "2":          { "type": "open-cloze",            "inputMode": "text",         "total": 8  },
  "3":          { "type": "word-formation",        "inputMode": "text",         "total": 8  },
  "4":          { "type": "transformations",       "inputMode": "text-with-key","total": 6  },
  "5":          { "type": "multiple-choice-text",  "inputMode": "radio",        "total": 6  },
  "6":          { "type": "cross-text-matching",   "inputMode": "modal",        "total": 4  },
  "7":          { "type": "gapped-text",           "inputMode": "select",       "total": 6  },
  "8":          { "type": "multiple-matching",     "inputMode": "modal",        "total": 10 },
  "listening1": { "type": "multiple-choice",       "inputMode": "radio",        "total": 8  },
  "listening2": { "type": "sentence-completion",   "inputMode": "text",         "total": 10 },
  "listening3": { "type": "multiple-choice-text",  "inputMode": "radio",        "total": 6  },
  "listening4": { "type": "dual-matching",         "inputMode": "select",       "total": 10 },
  "writing1":   { "type": "essay",                 "inputMode": "textarea",     "total": 1  },
  "writing2":   { "type": "choice",                "inputMode": "textarea",     "total": 1  },
  "speaking1":  { "type": "interview",             "inputMode": "script",       "total": 1  },
  "speaking2":  { "type": "long-turn",             "inputMode": "script",       "total": 2  },
  "speaking3":  { "type": "collaborative",         "inputMode": "script",       "total": 1  },
  "speaking4":  { "type": "discussion",            "inputMode": "script",       "total": 1  }
}
```

---

## 7. Tipos de Ejercicio

### Reading & Use of English

| Parte | Tipo (`CONFIG.PART_TYPES`) | Input Mode | Total |
|---|---|---|---|
| 1 | `multiple-choice` | `modal` | 8 |
| 2 | `open-cloze` | `text` | 8 |
| 3 | `word-formation` | `text` | 8 |
| 4 | `transformations` | `text-with-key` | 6 |
| 5 | `multiple-choice-text` | `radio` | 6 |
| 6 | `cross-text-matching` | `modal` | 4 |
| 7 | `gapped-text` | `select` | 6 |
| 8 | `multiple-matching` | `modal` | 10 |

### Listening

| Parte | Tipo | Input Mode | Total |
|---|---|---|---|
| 1 | `listening-1` → `multiple-choice` | `radio` | 8 |
| 2 | `listening-2` → `sentence-completion` | `text` | 10 |
| 3 | `listening-3` → `multiple-choice-text` | `radio` | 6 |
| 4 | `listening-4` → `dual-matching` | `select` | 10 |

### Writing

| Parte | Tipo | Input Mode | Total |
|---|---|---|---|
| 1 | `essay` | `textarea` | 1 |
| 2 | `choice` | `textarea` | 1 |

### Speaking

| Parte | Tipo | Input Mode | Total |
|---|---|---|---|
| 1 | `interview` | `script` | 1 |
| 2 | `long-turn` | `script` | 2 |
| 3 | `collaborative` | `script` | 1 |
| 4 | `discussion` | `script` | 1 |

### Modos de Input

| `inputMode` | Descripción |
|---|---|
| `modal` | Se abre un modal con las opciones A/B/C/D |
| `text` | Campo de texto libre en línea |
| `text-with-key` | Texto libre con palabra clave visible |
| `radio` | Botones de radio directamente en el ejercicio |
| `select` | Menú desplegable (`<select>`) |
| `textarea` | Área de texto grande (writing) |
| `script` | Simulación de diálogo (speaking) |

---

## 8. Sistema de Internacionalización (i18n)

- Al cargar la app, `App.init()` llama a `I18n.loadLanguage(lang)` que hace fetch de `lang/{lang}.json`.
- Las traducciones se almacenan en `AppState.translations`.
- `I18n.t('key')` devuelve `AppState.translations[key]` o la propia clave si no existe.
- Los elementos del DOM con `data-i18n="key"` se actualizan automáticamente al cambiar de idioma.
- Al cambiar idioma durante un ejercicio activo, `App.setLanguage()` llama a `Exercise.reRenderCurrentExercise()` para regenerar el HTML con el nuevo idioma.

---

## 9. Persistencia con localStorage

### Claves de localStorage

| Clave | Contenido |
|---|---|
| `preferred_level` | Nivel CEFR seleccionado (`"C1"`, etc.) |
| `preferred_language` | Código de idioma (`"es"`, `"en"`, etc.) |
| `cambridge_{level}_{examId}_{section}_{part}` | Estado de una parte de ejercicio |
| `openai_api_key` | Clave API de OpenAI (opcional, introducida por el usuario) |

### Estructura del estado de una parte

```json
{
  "answers": { "1": "A", "2": "B", "3": "D" },
  "answersChecked": true,
  "partScore": 5,
  "elapsedSeconds": 423
}
```

---

## 10. Herramientas de Estudio

Las herramientas se muestran en el panel lateral derecho durante el ejercicio. Solo una puede estar activa a la vez (`AppState.activeTool`).

| Herramienta | ID | Descripción |
|---|---|---|
| Diccionario | `dict` | Seleccionar una palabra activa la búsqueda en API externa |
| Traductor | `translate` | Seleccionar texto activa la traducción |
| Subrayador | `notes` | Seleccionar texto crea un subrayado de color con nota opcional |
| Bloc de notas | `freenotes` | Área de texto libre, se guarda en `AppState.freeNotes` |
| Tips | `tips` | Muestra los consejos del archivo `tips/{section}.json` |

---

## 11. Estilos CSS

- `index.html` contiene el bloque `<style>` con las variables CSS globales (colores, sombras, radio de bordes).
- `css/imports.css` importa todos los archivos CSS de componentes.
- Los estilos de tipos de ejercicio (`css/exercise-types/`) se cargan **bajo demanda** mediante `Utils.loadExerciseTypeCSS()` cuando se abre un ejercicio del tipo correspondiente.
- El diseño es responsive con breakpoints para tablets y móvil.
- `css/components/mobile-ios.css` gestiona la barra de navegación inferior estilo iOS (para PWA en iPhone).

---

## 12. Cómo Añadir Contenido Nuevo

### Añadir un nuevo test (p.ej. Test2 para C1)

1. Crear la carpeta: `Nivel/C1/Exams/Test2/`
2. Añadir todos los JSON necesarios siguiendo el esquema de la sección 6.1:
   - `reading1.json` … `reading8.json`
   - `listening1.json` … `listening4.json`
   - `writing1.json`, `writing2.json`
   - `speaking1.json` … `speaking4.json`
3. El sistema lo detectará automáticamente al recargar (via HEAD request en `syncExamsFromFolders`).
4. Si el test aún no está listo, añadirlo en `state.js` con `status: "coming_soon"` para mostrarlo desactivado.

### Añadir un nuevo nivel (p.ej. B2)

1. Crear la carpeta: `Nivel/B2/Exams/Test1/`
2. Añadir los JSON de ejercicios.
3. Verificar que `EXAMS_DATA` en `state.js` incluya la clave `B2: []`.
4. El nivel aparecerá automáticamente en los botones de filtro del header.

### Añadir una traducción nueva

1. Añadir la clave y valor en `lang/es.json` (español base).
2. Copiar la clave en los otros 11 archivos de `lang/` con la traducción correspondiente.
3. Usar `I18n.t('nuevaClave')` en el HTML o JS donde sea necesario.
4. Para actualización dinámica al cambiar idioma, añadir `data-i18n="nuevaClave"` al elemento HTML.

### Añadir un nuevo tipo de ejercicio

1. Crear `js/exercise-types/nuevo-tipo.js` con la lógica del tipo.
2. Crear `css/exercise-types/nuevo-tipo.css` con los estilos.
3. Añadir la entrada en `CONFIG.EXERCISE_TYPE_FILES` en `config.js`.
4. Añadir la entrada en `CONFIG.PART_TYPES` en `config.js` con `type`, `inputMode` y `total`.
5. Actualizar `ExerciseHandlers.getTypeChecker()` en `exercise-handlers.js` para reconocer el nuevo tipo.

---

## 13. Cómo Ejecutar el Proyecto Localmente

```bash
# Opción 1 — Python HTTP server (recomendado, evita problemas de CORS)
cd cambridge-exams
python3 -m http.server 8000
# Abrir http://localhost:8000

# Opción 2 — Node.js
npx http-server . -p 8080
# Abrir http://localhost:8080
```

> **Importante:** Abrir `index.html` directamente como `file://` puede causar errores de CORS al intentar cargar los archivos JSON. Usar siempre un servidor HTTP local.

### Depuración en la consola del navegador

```javascript
// Ver estado actual de la aplicación
console.log(AppState);
console.log(EXAMS_DATA);

// Forzar redescubrimiento de tests
await App.syncExamsFromFolders();
Dashboard.render();

// Cambiar idioma programáticamente
await I18n.loadLanguage('en');

// Limpiar todo el progreso guardado
localStorage.clear();

// Ver el ejercicio activo
console.log(AppState.currentExercise);
```

---

## 14. Versión Actual e Historial de Cambios

**Versión actual:** `3.2.0` (definida en `js/config.js` como `CONFIG.APP_VERSION`; actualiza esa constante y la tabla de abajo de forma sincronizada al lanzar una nueva versión)

| Versión | Cambios principales |
|---|---|
| 3.2.0 | Estado actual documentado. UI responsive con menú hamburguesa. Soporte para 12 idiomas. Descubrimiento automático de tests. Persistencia completa en localStorage. Herramientas: diccionario, traductor, subrayador, notas, tips. |

---

> **Recordatorio para la IA:** Cada vez que modifiques el proyecto, actualiza la tabla de historial de cambios arriba y ajusta cualquier sección de este documento que ya no refleje el estado real del código. Si añades archivos nuevos, agrégalos a la estructura de directorios. Si cambias un flujo, actualiza el diagrama correspondiente. Si cambias el esquema de un JSON, actualiza la sección 6.
