# Plainsurvey Roadmap

## Decisión de Implementación

Plainsurvey se implementará mediante un refactor evolutivo con estructura nueva orientada a librería. No se hará un rewrite completo desde cero: el proyecto actual se conserva como referencia funcional y se migran piezas probadas hacia APIs públicas.

La estructura objetivo es:

```text
src/
  core/
  renderer/
  builder/
  analytics/
  styles/
  ai/
apps/
  studio/
tests/
  core/
  renderer/
  builder/
  analytics/
  studio/
```

## Política de Tests

Cada avance debe incluir tests enfocados en comportamiento esperado.

Los tests deben validar contratos públicos y flujos reales:

- Qué JSON acepta y normaliza la librería.
- Qué preguntas son visibles u ocultas.
- Qué errores ve el usuario cuando faltan respuestas requeridas.
- Qué callbacks recibe un integrador.
- Qué datos produce analytics.
- Qué mantiene Studio al importar, editar, previsualizar y exportar.

No se consideran suficientes los tests que solo validan detalles internos sin demostrar comportamiento observable.

## Política de Commits

Cada commit debe tener un título Conventional Commit y un cuerpo con bloques Markdown en mayúsculas. El título debe describir el cambio principal con scope cuando aplique, por ejemplo:

```text
feat(resumes): add dynamic tooltips for truncated text in resume list
```

El cuerpo del commit debe incluir estos bloques, en este orden:

```text
## CONTEXT
Explica el problema, necesidad de producto o restricción técnica que motiva el cambio.

## CHANGE HISTORY
Detalla los archivos o áreas modificadas y las decisiones relevantes de implementación.

## EXPECTED BEHAVIOR
Describe el comportamiento que se buscaba antes de verificar la implementación.

## COMPLETED BEHAVIOR
Resume lo que quedó implementado y, cuando aplique, qué pruebas o comandos pasaron.

## WHY
Justifica por qué esta solución encaja con el producto, la arquitectura o la experiencia de usuario.

## NOTES & RISKS
Documenta riesgos, supuestos, limitaciones pendientes o aspectos que conviene revisar después.
```

El cuerpo debe ser específico del cambio realizado, no una plantilla vacía. Si un bloque no tiene riesgo o nota relevante, debe decirlo explícitamente para que la revisión no dependa de inferencias.

## Milestone 0: Preparación del Producto

Objetivo: alinear documentación, estructura objetivo y reglas de calidad antes de mover código.

Entregables:

- README orientado a `plainsurvey`.
- Roadmap y backlog en `docs/product/`.
- Decisión de arquitectura library-first.
- Política de tests por comportamiento.
- Definición inicial de package shape y subpath exports.

Tests requeridos:

- Todavía no se exige suite funcional completa, pero debe quedar definida la estrategia y el runner de tests a usar antes de cerrar el milestone.

Criterios de aceptación:

- No hay contradicción entre README, plan, roadmap y package target.
- El repositorio expresa claramente que el producto será librería + Studio.
- Existe una Definition of Done con tests obligatorios por avance.

## Milestone 1: Core Reutilizable

Objetivo: extraer el núcleo sin DOM.

Entregables:

- `src/core/` con schema, factories, normalización, condiciones, validación, scoring y sesión.
- `src/core/index.js` como entrypoint público.
- JSDoc en APIs públicas.
- Tests de comportamiento para core.

Tests requeridos:

- Normaliza encuesta vacía o incompleta.
- Conserva tipos actuales y corrige tipos desconocidos.
- Evalúa `visibleIf` con operadores existentes.
- No valida preguntas ocultas.
- Valida requeridos, incluyendo `matrix`.
- Calcula scoring por tipo y porcentaje final.
- Mantiene sesión al responder, avanzar, retroceder y completar.

Criterios de aceptación:

- `core` no importa DOM, CSS, Vite, `localStorage`, WebLLM ni módulos de Studio.
- Builder y runner actuales pueden consumir core sin duplicar lógica.
- Los tests de core pasan en entorno automatizable.

## Milestone 2: Renderer Embebible

Objetivo: exponer un renderer usable fuera de Studio.

Entregables:

- `createSurveyRenderer()`.
- Soporte para `target`, `survey`, `initialAnswers`, `ui`, `onChange`, `onPageChange`, `onComplete`.
- Render de todos los tipos actuales.
- Preset CSS propio inicial.
- Ejemplo embebible documentado.

Tests requeridos:

- Monta una encuesta en un contenedor externo.
- Renderiza todos los tipos soportados.
- Aplica visibilidad condicional al cambiar respuestas.
- Bloquea avance cuando faltan requeridos.
- Completa encuesta y entrega `answers` y `scoreResult`.
- Respeta overrides de clases del preset UI.
- `destroy()` desmonta listeners y contenido controlado.

Criterios de aceptación:

- El renderer no depende de estado global de Studio.
- El contrato público funciona desde imports de librería.
- Studio puede usarlo para preview/responder.

## Milestone 3: Builder Modular

Objetivo: convertir el builder en módulo reutilizable.

Entregables:

- `createSurveyBuilder()`.
- Builder desacoplado del `state` global de `src/app.js`.
- Emisión de `onChange(nextSurvey)`.
- Soporte para páginas, preguntas, opciones, scoring, visibilidad y drag and drop.
- Preview final usando renderer.

Tests requeridos:

- Monta el builder con encuesta inicial.
- Edita título, descripción, páginas y preguntas.
- Agrega, elimina y reordena preguntas.
- Edita opciones, scoring y reglas `visibleIf`.
- Emite JSON normalizado después de cambios.
- El preview usa el renderer y respeta la misma lógica de validación/visibilidad.

Criterios de aceptación:

- El builder puede usarse fuera de Studio.
- Se mantiene paridad funcional con el builder actual.
- No hay duplicación innecesaria entre preview y renderer.

## Milestone 4: Styles y Framework Presets

Objetivo: permitir integración profesional con CSS propio o frameworks externos.

Entregables:

- Contrato semántico de clases.
- `plainPreset`, `bootstrapPreset`, `daisyPreset`, `bulmaPreset`.
- Overrides manuales.
- Documentación de theming.

Tests requeridos:

- Cada preset produce clases esperadas en renderer.
- Overrides del usuario tienen prioridad.
- No se importan Bootstrap, DaisyUI ni Bulma como dependencias obligatorias.

Criterios de aceptación:

- El usuario puede adaptar la UI sin cambiar código del renderer.
- El contrato de clases queda documentado y estable.

## Milestone 5: Analytics y Charts Data

Objetivo: analizar respuestas y producir datasets neutrales.

Entregables:

- `analyzeSurveyResponses({ survey, responses })`.
- Agregadores por tipo.
- Scoring agregado.
- Adapters para bar, pie, rating distribution, matrix heatmap y ranking.

Tests requeridos:

- Analiza múltiples respuestas.
- Cuenta opciones simples y múltiples.
- Calcula promedios de rating.
- Agrega matrix por fila/columna.
- Agrega ranking por posición.
- Conserva respuestas abiertas.
- Produce datasets serializables y neutrales.

Criterios de aceptación:

- Analytics no depende de librerías visuales.
- Studio puede mostrar tablas y resumen de resultados.

## Milestone 6: Plainsurvey Studio

Objetivo: reorganizar la app como producto completo encima de la librería.

Entregables:

- `apps/studio/`.
- Vistas Builder, Preview/Responder, JSON, Analytics e IA.
- Persistencia local en Studio.
- Import/export/send JSON conservado.
- Selector visual de temas/presets.

Tests requeridos:

- Carga una encuesta inicial.
- Edita en builder y refleja cambios en preview.
- Aplica JSON importado y conserva normalización.
- Completa una respuesta y aparece en analytics.
- La IA genera JSON compatible cuando el proveedor está disponible o muestra estado recuperable cuando no lo está.

Criterios de aceptación:

- Studio consume módulos públicos.
- Studio funciona como demo y producto.
- No hay lógica core duplicada en la app.

## Milestone 7: Packaging, Docs y Release Candidate

Objetivo: dejar el producto listo para publicación manual.

Entregables:

- Package `plainsurvey`.
- Subpath exports:
  - `plainsurvey`
  - `plainsurvey/core`
  - `plainsurvey/renderer`
  - `plainsurvey/builder`
  - `plainsurvey/analytics`
  - `plainsurvey/styles`
  - `plainsurvey/ai`
- Build ESM.
- Docs y ejemplos para Vanilla JS, Bootstrap, DaisyUI, Bulma y Studio.

Tests requeridos:

- Imports públicos funcionan desde build.
- El build genera librería y Studio.
- Ejemplos mínimos importan y ejecutan APIs públicas.
- Tests de regresión completos pasan antes de release candidate.

Criterios de aceptación:

- README sirve como entrada profesional.
- La documentación permite usar Plainsurvey sin leer el código fuente.
- El release candidate queda listo para publicación manual.
