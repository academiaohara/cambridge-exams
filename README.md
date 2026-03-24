# Cambridge Exams Platform

Plataforma web de práctica para los exámenes Cambridge English (B1 Preliminary, B2 First y C1 Advanced / CAE). Permite a los estudiantes practicar las cuatro secciones del examen de forma interactiva directamente en el navegador, sin necesidad de instalación.

## 🌐 Demo en vivo

[https://academiaohara.github.io/cambridge-exams](https://academiaohara.github.io/cambridge-exams)

## 📚 Niveles disponibles

| Nivel CEFR | Examen Cambridge | Tests disponibles |
|---|---|---|
| B1 | PET (Preliminary) | ✅ |
| B2 | FCE (First) | ✅ 50 tests |
| C1 | CAE (Advanced) | ✅ 50 tests |

## ✨ Características principales

- **4 secciones por test:** Reading & Use of English, Listening, Writing, Speaking
- **Verificación inmediata** de respuestas con explicaciones detalladas
- **Temporizador** con alertas visuales
- **Herramientas de estudio:** Diccionario, Traductor, Subrayador, Notas, Tips
- **Aprendizaje rápido:** Flashcards de vocabulario, phrasal verbs, idioms y word formation
- **IA integrada:** Evaluación de essays y socio virtual para Speaking (requiere API key de OpenAI)
- **Progreso guardado** automáticamente en `localStorage`
- **12 idiomas de interfaz:** ES, EN, FR, DE, IT, PT, AR, ZH, JA, KO, HI, RU
- **Sin dependencias de build** — HTML/CSS/JS puro, servido como archivos estáticos

## 🚀 Ejecución local

```bash
# Opción 1: Python (incluido en macOS/Linux)
python3 -m http.server 8080

# Opción 2: Node.js
npx serve .

# Opción 3: VS Code
# Instala la extensión "Live Server" y pulsa "Go Live"
```

Abre `http://localhost:8080` en el navegador.

## 🗂️ Estructura del proyecto

```
cambridge-exams/
├── index.html              # Punto de entrada único de la SPA
├── js/                     # Lógica JavaScript (ver js/README.md)
├── css/                    # Estilos (ver css/README.md)
├── api/                    # Endpoints serverless (ver api/README.md)
├── Nivel/                  # Datos de exámenes por nivel CEFR (ver Nivel/README.md)
│   ├── B1/Exams/           # Tests B1 Preliminary
│   ├── B2/Exams/           # Tests B2 First (FCE)
│   └── C1/Exams/           # Tests C1 Advanced (CAE)
├── data/                   # Datos para ejercicios de aprendizaje rápido (ver data/README.md)
│   ├── idioms/             # Expresiones idiomáticas
│   ├── phrasal-verbs/      # Verbos frasales
│   ├── word-formation/     # Formación de palabras
│   ├── vocabulary/         # Vocabulario general
│   └── collocations/       # Colocaciones
├── lang/                   # Traducciones de la interfaz (12 idiomas)
├── tips/                   # Consejos de examen por sección
├── Assets/                 # Imágenes y recursos estáticos
├── DOCUMENTATION.md        # Documentación técnica completa
└── vercel.json             # Configuración de despliegue en Vercel
```

## 🛠️ Tecnologías

- **HTML5 / CSS3 / JavaScript ES6+** — sin framework, sin bundler
- **Font Awesome 6** — iconos
- **Google Fonts (Inter)** — tipografía
- **Supabase** — autenticación y persistencia de datos en la nube (opcional)
- **OpenAI GPT-4o-mini** — evaluación de escritura y Speaking con IA

## 📖 Documentación

Consulta [`DOCUMENTATION.md`](DOCUMENTATION.md) para la referencia técnica completa: arquitectura, esquemas de datos JSON, tipos de ejercicio, flujos de la aplicación y guía para añadir contenido nuevo.

## 📂 READMEs por directorio

- [`Nivel/README.md`](Nivel/README.md) — estructura de los datos de exámenes
- [`Nivel/B1/Exams/README.md`](Nivel/B1/Exams/README.md) — guía del examen B1 Preliminary
- [`Nivel/B2/Exams/README.md`](Nivel/B2/Exams/README.md) — guía del examen B2 First (FCE)
- [`Nivel/C1/Exams/README.md`](Nivel/C1/Exams/README.md) — guía del examen C1 Advanced (CAE)
- [`js/README.md`](js/README.md) — arquitectura JavaScript
- [`css/README.md`](css/README.md) — estructura de estilos
- [`api/README.md`](api/README.md) — endpoints serverless
- [`data/README.md`](data/README.md) — datos de aprendizaje rápido
