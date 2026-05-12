# Changelog

All notable changes to this library are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [0.1.0-rc1] - 2026-05-12

### Added

- Feature modules:
  - Added first-class feature entrypoints for builder, renderer, preview, analytics, analysis, ai and styles.
  - Added `src/dsl/index.js` with `createPlainsurvey()` and `createSurveyDsl()` for block orchestration.
- Analytics and analysis:
  - Added response summarization and chart-ready neutral adapters for bar, pie, rating, matrix and ranking outputs.
  - Added semantic analysis facade via `plainsurvey/analysis`.
- AI:
  - Added provider normalization service, local WebLLM runtime provider and chatbot facade for survey generation and analysis context.
- Shared capabilities:
  - Added shared focus-preservation and i18n utilities for cross-feature reuse.
- Styles:
  - Added feature-owned style presets and layered CSS/theme assets under `src/styles`.

### Changed

- Library architecture:
  - Refactored from internal module shims to a feature-based structure where each block owns its behavior and configuration.
  - Updated root exports to expose the new feature modules and DSL.
- Packaging:
  - Added `scripts/build.mjs` to build ESM/CJS subpath entries into `dist` and copy style assets.
  - Updated package exports to dist-first subpaths and external package bundling behavior.
  - Updated package version to `0.1.0-rc1`.

### Removed

- Removed app-oriented and legacy artifacts not belonging to the library package:
  - Removed `apps/studio`, `docs/product`, `docs/library`, Vite/jsconfig alias tooling and legacy node alias loader.
  - Removed legacy source trees under `src/modules`, `src/helpers`, `src/locales` and `src/assets/styles`.
  - Removed obsolete studio test coverage tied to deleted app code.

### Tests

- Updated test imports to target feature entrypoints.
- Preserved behavior-focused coverage for builder, renderer, analytics, ai and style presets.
