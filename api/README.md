# api — Endpoints Serverless

Este directorio contiene los endpoints serverless de la aplicación, desplegados en **Vercel** como Serverless Functions. Cada archivo exporta una función `handler(req, res)` compatible con la API de Vercel.

> **Nota:** Estos endpoints requieren que las variables de entorno estén configuradas en el panel de Vercel (o en un archivo `.env.local` para desarrollo local). En la versión de GitHub Pages, las funciones no están disponibles y las características de IA quedan desactivadas.

## Archivos

### `speaking-partner.js`

Genera respuestas de un "socio virtual" para el ejercicio de Speaking.

- **Método:** `POST`
- **Body:**

| Campo | Tipo | Descripción |
|---|---|---|
| `mode` | `string` | `'collaborative'` (Part 3), `'discussion'` (Part 4), o vacío (Part 2 long-turn) |
| `messages` | `array` | Historial de la conversación |
| `task` | `string` | Descripción de la tarea colaborativa |
| `options` | `array` | Opciones del diagrama (Part 3) |
| `taskInstructions` | `string` | Instrucciones del turno largo (Part 2) |
| `imageDescriptions` | `string` | Descripción de las fotos (Part 2) |
| `isMainTurn` | `boolean` | Si es el turno principal del candidato (Part 2) |
| `followUpQuestion` | `string` | Pregunta de seguimiento del examinador (Part 2) |
| `examLevel` | `string` | Nivel CEFR del examen (por defecto `"C1"`) |

- **Respuesta:** `{ text: string }` — la respuesta generada por el socio.
- **Modelo:** `gpt-4o-mini` (configurable con la variable `OPENAI_MODEL`).

### `writing.js`

Corrige y evalúa un texto escrito por el estudiante.

- **Método:** `POST`
- **Body:**

| Campo | Tipo | Descripción |
|---|---|---|
| `text` | `string` | Texto del estudiante a corregir |
| `taskType` | `string` | Tipo de tarea (ej. `"essay"`, `"report"`, `"review"`) |
| `taskPrompt` | `string` | Enunciado original de la tarea |
| `examLevel` | `string` | Nivel CEFR (ej. `"C1"`) |

- **Respuesta:** `{ corrected: object }` — objeto con la corrección detallada del texto.
- **Validación:** Mínimo 50 palabras, máximo 400 palabras.

### `dictionary.js`

Proporciona definiciones de palabras en inglés.

- **Método:** `GET` / `POST`
- Actúa como proxy o wrapper de una API de diccionario externa para evitar problemas de CORS.

### `speaking.js`

Endpoint auxiliar relacionado con la funcionalidad de Speaking.

### `speaking-interview.js`

Genera preguntas o respuestas para la simulación de la entrevista de Speaking (Part 1).

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | API key de OpenAI para los endpoints de IA |
| `OPENAI_MODEL` | Modelo de OpenAI a usar (por defecto `gpt-4o-mini`) |

## Desarrollo local

```bash
# Instala las dependencias
npm install

# Inicia el servidor de desarrollo de Vercel (emula las funciones serverless)
npx vercel dev
```

Las funciones estarán disponibles en `http://localhost:3000/api/`.
