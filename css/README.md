# css — Estilos

Este directorio contiene todos los estilos CSS de la aplicación. No hay preprocesador (Sass, Less) ni PostCSS: todo es CSS3 puro con variables nativas.

## Archivos raíz

| Archivo | Descripción |
|---|---|
| `imports.css` | Importa todos los archivos CSS del proyecto con `@import`. Es el único archivo enlazado desde `index.html`. |
| `main.css` | Variables globales (colores, tipografía, espaciado), reset de estilos, layout base de la SPA y estilos de la cabecera/pie. |

## `components/`

Estilos de los componentes de interfaz de usuario principales.

| Archivo | Componente |
|---|---|
| `header.css` | Barra de navegación superior |
| `footer.css` | Pie de página |
| `dashboard.css` | Pantalla principal: tarjetas de tests y secciones |
| `exercise.css` | Contenedor del ejercicio activo (cabecera, navegación de partes, botones de acción) |
| `modal.css` | Diálogos modales de opciones de múltiple elección |
| `tools.css` | Panel de herramientas de estudio (diccionario, traductor, subrayador, notas, tips) |
| `fast-exercises.css` | Motor de ejercicios de aprendizaje rápido (vocabulario, phrasal verbs, idioms, word formation) |
| `responsive.css` | Media queries para adaptación a pantallas de distintos tamaños |
| `mobile-ios.css` | Ajustes específicos para dispositivos iOS (Safari) |

## `exercise-types/`

Estilos específicos por tipo de ejercicio. Se cargan **bajo demanda** (dinámicamente) cuando se abre un ejercicio del tipo correspondiente, igual que sus contrapartes JavaScript en `js/exercise-types/`.

| Archivo | Tipo de ejercicio |
|---|---|
| `reading-type1.css` | Multiple-choice cloze |
| `reading-type2.css` | Open cloze |
| `reading-type3.css` | Word formation |
| `reading-type4.css` | Key word transformations |
| `reading-type5.css` | Multiple choice (texto largo) |
| `reading-type6.css` | Cross-text matching |
| `reading-type7.css` | Gapped text |
| `reading-type8.css` | Multiple matching |
| `listening-type1.css` | Multiple choice (listening) |
| `listening-type2.css` | Sentence completion |
| `listening-type4.css` | Dual matching |
| `writing-type1.css` | Essay |
| `writing-type2.css` | Choice (carta, reseña, informe…) |
| `speaking-type.css` | Interview, long-turn, collaborative, discussion |

## Convenciones

- **Variables CSS** (`--color-primary`, `--spacing-md`, etc.) definidas en `:root` dentro de `main.css`. Úsalas en lugar de valores literales para mantener la consistencia visual.
- **Nomenclatura de clases:** estilo BEM (`bloque__elemento--modificador`) en los componentes más complejos.
- **Sin `!important`** salvo casos excepcionales (correcciones de terceros o iOS).
