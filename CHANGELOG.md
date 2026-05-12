# Changelog

All notable changes to this library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project intends to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Styles:
  - Added layered style exports for themes, skins and layouts.
  - Added distributable theme files under `src/assets/styles/themes/`.
- Builder:
  - Added localized question type summaries for toolbox rendering.
  - Added a stable hierarchical Structure Tree view (survey/pages/questions).
- Utils:
  - Added `stripUndefined()` in `src/utils/object.js` for normalized payload cleanup.
- Packaging:
  - Added `LICENSE` to repository and package publication scope.

### Changed

- Styles:
  - Split the public stylesheet into layered imports (`plainsurvey.css`, `themes.css`, `skins.css`, `layouts.css`).
  - Updated package exports to expose layered CSS entrypoints and `themes/*.css`.
- Studio:
  - Replaced appearance `skin` selection with `mode` selection (`light`, `dark`, `darkless`).
  - Added normalization of legacy stored appearance state into current `theme` + `mode` model.
- Builder:
  - Updated toolbox and configurator text rendering to use locale packs directly.
  - Kept Structure Tree as a stable navigation hierarchy without drag-and-drop controls.
- Docs/Repo:
  - Updated README and library docs to reflect library-only workflow and current API scope.
  - Removed legacy internal example HTML files from package scope.
- Packaging:
  - Updated package file inclusion to publish `src`, optional `dist`, and package metadata required by consumers.
  - Added explicit tarball verification guidance for critical runtime source paths used by consumers.

### Tests

- Added builder coverage for hierarchical Structure Tree rendering.
- Updated studio tests for `mode`-based appearance persistence.
- Updated stylesheet tests for layered CSS imports and layout assertions.

## [0.1.0-rc.2] - 2026-05-08

### Added

- Studio:
  - Added persistent theme, skin, layout and renderer preset controls.
  - Added JSON apply, import, copy, download and send flows with visible success/error states.
  - Added response and question summary tables in Analytics.
  - Added localized Studio labels through the shared locale system.
- Styles:
  - Added DaisyUI-compatible renderer classes while preserving the Plainsurvey class contract.
  - Added legacy-like builder shell styles for toolbox, preview, properties, tree, palette and modern layout panels.
- Release:
  - Added a release checklist under `docs/library/`.
  - Added DaisyUI and Studio examples under `examples/`.

### Changed

- Packaging:
  - Moved package metadata to `0.1.0-rc.2`.
  - Marked the package publishable with `private: false`.
  - Included docs and examples in package files.

### Tests

- Added Studio coverage for JSON send/import, analytics tables and persistent appearance settings.
  - Extended style preset coverage for DaisyUI class compatibility.

## [0.1.0-rc.1] - 2026-05-08

Initial release candidate for the library-first Plainsurvey package and Studio.

### Added

- Product planning:
  - Defined the library-first product plan for `plainsurvey`.
  - Added roadmap and backlog documents with milestones, acceptance criteria and behavior-focused testing policy.
  - Documented the required structured commit-message format for future work.
- Core:
  - Added `plainsurvey/core` with survey, page and question factories.
  - Added survey normalization, conditional visibility, required-answer validation, scoring and session navigation.
  - Added the root `plainsurvey` export and `plainsurvey/core` subpath export.
- Renderer:
  - Added `plainsurvey/renderer` with `createSurveyRenderer()` and `plainRendererPreset`.
  - Added support for text, textarea, radio, checkbox, dropdown, rating, emoji scale, ranking, matrix, boolean, code block, SVG note and content block questions.
  - Added renderer callbacks for answer changes, page changes and completion with score results.
- Builder:
  - Added `plainsurvey/builder` with `createSurveyBuilder()` and `plainBuilderPreset`.
  - Added editing for survey metadata, pages, questions, choices, matrix rows/columns, scoring and visibility rules.
  - Added live preview powered by `createSurveyRenderer()`.
- Styles:
  - Added `plainsurvey/styles` with plain, Bootstrap, DaisyUI and Bulma renderer presets.
  - Added `createUiPreset()` for framework preset selection with manual override priority.
- Analytics:
  - Added `plainsurvey/analytics` with `analyzeSurveyResponses()` for aggregated response summaries and scoring totals.
  - Added neutral chart data adapters for bar, pie, rating distribution, matrix heatmap and ranking datasets.
- AI and Studio:
  - Added `plainsurvey/ai` with provider-based survey generation and local recoverable drafts.
  - Added `apps/studio` as a minimal Studio app built from public Builder, Renderer, Analytics, Styles and AI modules.
  - Added Builder, Preview, JSON, Analytics and AI views to Studio.
- Release candidate:
  - Added package exports for `plainsurvey`, `plainsurvey/core`, `plainsurvey/renderer`, `plainsurvey/builder`, `plainsurvey/styles`, `plainsurvey/analytics` and `plainsurvey/ai`.
  - Added build script for library and Studio bundles.

### Changed

- Clarified that implementation will proceed as a clean library-first evolution, independent from the current app implementation.
- Updated package metadata and development scripts for the library-first package.
- Updated README with usage examples for Core, Renderer, Builder, Styles, Analytics and AI.
- Kept legacy app files ignored while making new library paths trackable.

### Tests

- Added behavior-focused tests for Core normalization, visibility, validation, scoring and session navigation.
- Added DOM tests for Renderer mounting, callbacks, validation, completion, page navigation, supported question types, UI overrides and cleanup.
- Added DOM tests for Builder mounting, normalized change emission, question add/delete/reorder, editor fields, preview and cleanup.
- Added tests for style preset contracts and override priority.
- Added analytics tests for choice counts, checkbox aggregation, rating averages, matrix counts, ranking positions, open text and serializable outputs.
- Added AI and Studio tests for recoverable generation, provider output, builder editing, JSON import, preview completion and analytics response counts.
