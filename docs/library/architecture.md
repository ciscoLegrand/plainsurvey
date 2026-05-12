# Architecture

Plainsurvey is organized as a framework-agnostic library with stable subpath exports and explicit internal boundaries.

## Current Implementation Snapshot (2026-05-08)

Implemented and publicly exported surfaces:

- `plainsurvey/core`
- `plainsurvey/renderer`
- `plainsurvey/builder`
- `plainsurvey/styles`
- `plainsurvey/analytics`
- `plainsurvey/ai`

Implemented style assets and direct CSS exports:

- `plainsurvey/styles/plainsurvey.css`
- `plainsurvey/styles/themes.css`
- `plainsurvey/styles/skins.css`
- `plainsurvey/styles/layouts.css`
- `plainsurvey/styles/themes/*.css`

## Source Layout

- `src/core`: domain model, normalization, conditions, validation, scoring and session logic (UI-free layer).
- `src/modules`: public modules built on top of core (`builder`, `renderer`, `analytics`, `ai`).
- `src/helpers`: browser/UI helpers shared by modules (focus, i18n).
- `src/utils`: generic utilities with no product coupling.
- `src/assets/styles`: distributable style system (`plainsurvey.css`, themes, skins and layouts).
- `src/locales`: locale dictionaries and locale resolution.
- `apps/studio`: harness interno para pruebas de contrato del studio module (no forma parte del package publicado).
- `../examples/react`: app React consumidora para visualizacion, integracion UX y validacion de despliegue fuera del package de libreria.
- `tests`: behavior-focused tests by public area.

## Imports

Consumers should import through package exports:

```js
import { createSurvey } from "plainsurvey/core";
import { createSurveyRenderer } from "plainsurvey/renderer";
import { createUiPreset } from "plainsurvey/styles";
import "plainsurvey/styles/plainsurvey.css";
```

Local app and bundler code can use the configured aliases:

```js
import { createSurveyRenderer } from "@/modules/renderer/index.js";
import { createTranslator } from "@/helpers/i18n.js";
```

`@/*` and `@studio/*` aliases are configured for editor/dev-server use. Node-executed files should keep relative imports or package exports.

## Conventions

- Keep `core` independent from DOM, storage, network and styling.
- Add public capabilities under `src/modules/<feature>` and expose them via `package.json#exports`.
- Keep reusable browser helpers in `src/helpers` and generic helpers in `src/utils`.
- Keep distributable style artifacts under `src/assets/styles`.
- Treat `apps/*` as internal test harness and keep visual demos in `../examples`.
- Keep package publication scope focused on `src/*`, optional `dist/*`, and package metadata required by consumers.
