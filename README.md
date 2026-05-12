# Plainsurvey

Plainsurvey es una libreria agnostica de framework para construir experiencias completas de encuestas: diseno (builder), respuesta (renderer/preview), analisis de resultados y asistencia con IA.

Esta documentacion esta pensada como guia de implementacion y quick start para integrar la libreria en aplicaciones reales.

## TL;DR

1. Instala el paquete.
2. Importa CSS base.
3. Crea una encuesta con `plainsurvey/core`.
4. Monta `preview` o `renderer` en un contenedor DOM.
5. Usa `analytics` para procesar respuestas.

```bash
npm install plainsurvey
```

```js
import { createPlainsurvey } from "plainsurvey";
import { createSurvey } from "plainsurvey/core";
import "plainsurvey/styles/plainsurvey.css";

const survey = createSurvey({
  title: "Feedback",
  pages: [{ title: "General", elements: [{ type: "text", name: "name", title: "Nombre" }] }]
});

const ps = createPlainsurvey({ preview: { preset: "plain" } });
ps.preview({ target: document.querySelector("#survey"), survey });
```

## Que resuelve Plainsurvey

- Authoring: construir y editar encuestas con `builder`.
- Runtime: renderizar y responder encuestas con `renderer` o `preview`.
- Insight: resumir respuestas y preparar datasets con `analytics` y `analysis`.
- AI assist: generar borradores y chat contextual con `ai`.

## Superficie publica del paquete

- `plainsurvey`
- `plainsurvey/core`
- `plainsurvey/builder`
- `plainsurvey/renderer`
- `plainsurvey/preview`
- `plainsurvey/analytics`
- `plainsurvey/analysis`
- `plainsurvey/ai`
- `plainsurvey/styles`

Assets CSS publicos:

- `plainsurvey/styles/plainsurvey.css`
- `plainsurvey/styles/themes.css`
- `plainsurvey/styles/skins.css`
- `plainsurvey/styles/layouts.css`
- `plainsurvey/styles/themes/*.css`

## Requisitos tecnicos

- Node.js >= 20
- Bun disponible en entorno de desarrollo para build local del repositorio

## Quick Start (10 minutos)

### Paso 1: instala e importa estilos

```bash
npm install plainsurvey
```

```js
import "plainsurvey/styles/plainsurvey.css";
import "plainsurvey/styles/themes.css";
import "plainsurvey/styles/skins.css";
import "plainsurvey/styles/layouts.css";
```

### Paso 2: define un survey base

```js
import { createSurvey } from "plainsurvey/core";

export const survey = createSurvey({
  title: "Product feedback",
  pages: [
    {
      title: "General",
      elements: [
        { type: "text", name: "name", title: "Tu nombre" },
        { type: "rating", name: "score", title: "Puntuacion general", rateMin: 1, rateMax: 5, required: true }
      ]
    }
  ]
});
```

### Paso 3: monta preview o renderer

```js
import { createPlainsurvey } from "plainsurvey";
import { survey } from "./survey.js";

const ps = createPlainsurvey({
  preview: { preset: "plain", locale: "es" }
});

ps.preview({
  target: document.querySelector("#survey"),
  survey,
  onComplete: ({ answers, scoreResult }) => {
    console.log("Answers", answers);
    console.log("Score", scoreResult);
  }
});
```

### Paso 4: analiza respuestas

```js
import { createSurveyAnalytics } from "plainsurvey/analytics";

const analytics = createSurveyAnalytics({
  survey,
  responses: [{ answers: { name: "Ana", score: 5 } }, { answers: { name: "Luis", score: 4 } }]
});

console.log(analytics.toJSON());
```

## Patrones de implementacion recomendados

### Patron 1: Survey as code (versionado)

- Define encuestas en modulos JS/TS versionados en git.
- Usa `normalizeSurvey` al cargar datos externos.
- Mantiene migraciones simples y trazables.

### Patron 2: Builder en entorno interno

- Usa `plainsurvey/builder` en panel de administracion.
- Persiste JSON normalizado en backend.
- Publica solo versiones aprobadas al runtime de usuarios.

### Patron 3: Runtime desacoplado

- Usa `plainsurvey/preview` para integraciones rapidas con presets.
- Usa `plainsurvey/renderer` cuando necesites control fino de UI.

### Patron 4: Analitica neutral

- Procesa respuestas con `plainsurvey/analytics`.
- Conecta los datasets a Chart.js, ECharts o componentes propios.
- Evita acoplar la libreria a un proveedor de visualizacion.

## Guia por modulo

### Root DSL (`plainsurvey`)

- `createPlainsurvey(config?)`
- `createSurveyDsl(config?)`

Permite inicializar defaults por bloque y consumir:

- `builder(options?)`
- `preview(options?)`
- `analysis(options?)`
- `analytics(options?)`
- `ai(options?)`

### Core (`plainsurvey/core`)

API principal:

- `createSurvey`, `createPage`, `createQuestion`, `normalizeSurvey`
- `QUESTION_TYPES`, `QUESTION_TYPE_VALUES`, `ANSWERLESS_QUESTION_TYPES`, `OPERATORS`, `hasChoices`, `isAnswerlessQuestion`
- `isEmptyAnswer`, `isQuestionVisible`, `visibleQuestions`, `validatePage`, `validateSurvey`
- `calculateSurveyScore`, `createSession`, `setAnswer`, `nextPage`, `previousPage`

Uso recomendado:

- Crea surveys con factories.
- Normaliza input antes de renderizar o persistir.
- Reutiliza validacion y scoring en backend y frontend para consistencia.

### Builder (`plainsurvey/builder`)

API:

- `createSurveyBuilder(options)`
- `SurveyBuilder`
- `createBuilderDsl(config?)`

Casos de uso:

- CMS interno de formularios.
- Editor embebido para equipos de producto/research.

### Renderer (`plainsurvey/renderer`)

API:

- `createSurveyRenderer(options)`
- `SurveyRenderer`
- `plainRendererPreset`

Casos de uso:

- Experiencias de respuesta en produccion.
- Flujos multi-step con validacion por pagina.

### Preview (`plainsurvey/preview`)

API:

- `createSurveyPreview(options)`
- `SurveyPreview`

Casos de uso:

- Integracion rapida con presets visuales.
- Demos funcionales y QA de surveys.

### Styles (`plainsurvey/styles`)

API:

- `plainPreset`, `bootstrapPreset`, `daisyPreset`, `bulmaPreset`
- `frameworkPresets`
- `createUiPreset(name?, overrides?)`

Recomendacion:

- Importa siempre `plainsurvey.css`.
- Agrega `themes.css/skins.css/layouts.css` cuando uses capacidades visuales avanzadas.

### Analytics (`plainsurvey/analytics`)

API:

- `analyzeSurveyResponses({ survey, responses })`
- `createSurveyAnalytics(options?)`
- `toBarChartData`, `toPieChartData`, `toRatingDistributionData`, `toMatrixHeatmapData`, `toRankingChartData`

Salida:

- Resumen serializable por encuesta y por pregunta.
- Datasets listos para dashboards.

### Analysis (`plainsurvey/analysis`)

API:

- `analyzeSurveyResponses(...)`
- `SurveyAnalyzer`
- `createSurveyAnalysis(options?)`

### AI (`plainsurvey/ai`)

API:

- `generateSurveyWithAi({ prompt, provider })`
- `createSurveyFromPrompt(prompt?)`
- `createWebLLMProvider(options?)`
- `createSurveyAiChatbot(options?)`
- `createSurveyAiRuntime(options?)`
- `SurveyAIGenerator`

Nota de implementacion:

- Si no hay provider o falla el runtime, la libreria devuelve borrador local recuperable.
- Para runtime local con WebLLM necesitas entorno con WebGPU compatible.

## Scripts del repositorio

Para contribuir o validar localmente este repo:

```bash
npm run build
```
Genera `dist/` (ESM + CJS) para todas las entradas publicas.

```bash
npm run test
```

Ejecuta build + pruebas de comportamiento.

```bash
npm pack
```

Genera el tarball para probar instalacion local o publicar.

## Publicacion y release

- `npm run build`
- `npm test`
- `npm pack` (verificacion local de paquete)
- `npm publish` (cuando corresponda)

El paquete publica `dist/` y metadatos de release (`README`, `CHANGELOG`, `LICENSE`).

## Checklist de implementacion en app

- Definir owner de surveys (producto, research o soporte).
- Elegir estrategia de persistencia (JSON versionado o DB).
- Integrar runtime (`preview` o `renderer`) en una ruta estable.
- Instrumentar `onComplete` para almacenar respuestas.
- Procesar resultados con `analytics`.
- Definir estrategia AI (provider remoto o WebLLM local).
- Cubrir contratos clave con tests de comportamiento en tu app.
