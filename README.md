# Plainsurvey

Plainsurvey es una libreria agnostica de framework para crear, renderizar, editar y analizar encuestas.

El repositorio esta orientado a library-first. El paquete publicado contiene solo el contrato de API en `src` y metadatos esenciales del paquete.

## Estado Actual

Superficies publicas implementadas:

- `plainsurvey`
- `plainsurvey/core`
- `plainsurvey/renderer`
- `plainsurvey/builder`
- `plainsurvey/styles`
- `plainsurvey/analytics`
- `plainsurvey/ai`

Assets CSS publicos implementados:

- `plainsurvey/styles/plainsurvey.css`
- `plainsurvey/styles/themes.css`
- `plainsurvey/styles/skins.css`
- `plainsurvey/styles/layouts.css`
- `plainsurvey/styles/themes/*.css`

## Requisitos

- Node.js >= 20
- Bun recomendado para build

## Scripts del Repositorio

```bash
npm run test
```

Ejecuta tests de comportamiento sobre core, renderer, builder, styles, analytics y ai.

```bash
bun run build
```

Genera el bundle de libreria en `dist/`.

```bash
npm run dev
```

Levanta el proyecto externo de integracion UX (fuera del package de libreria).

## Modelo de Datos

Una encuesta normalizada contiene:

- `version`
- `title`
- `description`
- `pages[]`

Cada pagina contiene:

- `id`
- `title`
- `description`
- `elements[]`

Cada pregunta contiene un bloque base y campos por tipo:

- Base: `id`, `type`, `name`, `title`, `description`, `required`
- Opcionales por tipo: `choices`, `rows`, `columns`, `elements`, `rateMin`, `rateMax`, `placeholder`, `language`, `code`, `variant`, `body`, `imageUrl`, `imageCaption`
- Condicionales: `visibleIf`
- Scoring: `scoring` con `enabled`, `score`, `weight`, `correctAnswer`, `rationale`

## API Publica

### Core (`plainsurvey/core`)

Factoria y normalizacion:

- `createSurvey(overrides?)`
- `createPage(title?, overrides?)`
- `createQuestion(type?, overrides?)`
- `normalizeSurvey(input?)`

Metadatos y utilidades:

- `QUESTION_TYPES`
- `QUESTION_TYPE_VALUES`
- `ANSWERLESS_QUESTION_TYPES`
- `OPERATORS`
- `hasChoices(type)`
- `isAnswerlessQuestion(questionOrType)`

Visibilidad y validacion:

- `isEmptyAnswer(answer)`
- `isQuestionVisible(question, answers)`
- `visibleQuestions(page, answers)`
- `validatePage(page, answers)`
- `validateSurvey(survey, answers)`

Scoring y sesion:

- `calculateSurveyScore(survey, answers)`
- `createSession(survey, options?)`
- `setAnswer(session, questionName, value)`
- `nextPage(session)`
- `previousPage(session)`

Comportamiento clave:

- Normaliza encuestas incompletas a un schema valido.
- Reemplaza tipos desconocidos por `text`.
- Aplica reglas `visibleIf` antes de validar/mostrar.
- No exige respuestas en tipos informativos o contenedores (`codeBlock`, `svgNote`, `contentBlock`, `panel`).

### Renderer (`plainsurvey/renderer`)

API principal:

- `createSurveyRenderer(options)`

Opciones soportadas:

- `target` (obligatorio)
- `survey`
- `initialAnswers`
- `ui` (clases CSS, con merge sobre preset base)
- `onChange({ answers, questionName, value, session })`
- `onPageChange({ pageIndex, session })`
- `onComplete({ answers, scoreResult, session })`

Instancia devuelta:

- `update(nextOptions?)`
- `destroy()`

Tipos de pregunta renderizados:

- `text`, `textarea`, `radio`, `checkbox`, `dropdown`, `rating`, `emojiScale`, `imageChoice`, `imageCompare`, `ranking`, `matrix`, `panel`, `codeBlock`, `svgNote`, `contentBlock`, `boolean`

Comportamiento clave:

- Valida la pagina actual al avanzar.
- Respeta visibilidad condicional.
- Dispara `onComplete` solo al completar la sesion.

### Builder (`plainsurvey/builder`)

API principal:

- `createSurveyBuilder(options)`

Opciones soportadas:

- `target` (obligatorio)
- `survey`
- `locale` (`en` | `es`)
- `messages` (overrides por locale)
- `onChange(nextSurvey)`

Instancia devuelta:

- `update(nextOptions?)`
- `destroy()`
- `getSurvey()`

Comportamiento clave:

- Emite encuesta normalizada en cada cambio.
- Mantiene foco de input entre rerenders.
- Incluye toolbox, preview, configurador y arbol jerarquico de estructura.
- El reordenamiento de elementos ocurre en el flujo del builder/preview.

### Styles (`plainsurvey/styles`)

API:

- `plainPreset`
- `bootstrapPreset`
- `daisyPreset`
- `bulmaPreset`
- `frameworkPresets`
- `createUiPreset(name?, overrides?)`

Uso recomendado:

```js
import "plainsurvey/styles/plainsurvey.css";
import "plainsurvey/styles/themes.css";
import "plainsurvey/styles/skins.css";
import "plainsurvey/styles/layouts.css";
```

Para tema especifico:

```js
import "plainsurvey/styles/themes/corporativo.css";
```

### Analytics (`plainsurvey/analytics`)

API:

- `analyzeSurveyResponses({ survey, responses })`
- `toBarChartData(summary)`
- `toPieChartData(summary)`
- `toRatingDistributionData(summary)`
- `toMatrixHeatmapData(summary)`
- `toRankingChartData(summary)`

Comportamiento clave:

- Acepta respuestas como lista de objetos o `{ answers }`.
- Devuelve resumen serializable por encuesta y por pregunta.
- Incluye agregado de scoring (`totalAwardedPoints`, `totalMaxPoints`, `averagePercentage`).

### AI (`plainsurvey/ai`)

API:

- `generateSurveyWithAi({ prompt, provider })`
- `createSurveyFromPrompt(prompt?)`

Comportamiento clave:

- Si no hay provider, devuelve `ok: false` y borrador local recuperable.
- Si provider falla, devuelve error + borrador local compatible.
- Si provider responde, normaliza resultado al schema de encuesta.

## Ejemplo Rapido End-to-End

```js
import { createSurvey } from "plainsurvey/core";
import { createSurveyRenderer } from "plainsurvey/renderer";
import { createUiPreset } from "plainsurvey/styles";
import "plainsurvey/styles/plainsurvey.css";

const survey = createSurvey({
  title: "Product feedback",
  pages: [
    {
      title: "General",
      elements: [
        { type: "text", name: "name", title: "Your name" },
        { type: "rating", name: "score", title: "Overall score", rateMin: 1, rateMax: 5, required: true }
      ]
    }
  ]
});

createSurveyRenderer({
  target: document.querySelector("#survey"),
  survey,
  ui: createUiPreset("plain"),
  onComplete: ({ answers, scoreResult }) => {
    console.log("Answers", answers);
    console.log("Score", scoreResult);
  }
});
```

## Regla de Calidad

Todo cambio funcional debe incluir tests de comportamiento. La prioridad es validar contratos publicos y resultado observable para integradores/usuarios.
