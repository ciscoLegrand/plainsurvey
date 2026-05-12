# Plainsurvey Release Checklist

Before publishing a release candidate:

- `npm run test` passes (`bun run test` is also acceptable).
- `bun run build` emits the library bundle.
- Public imports work from every package export.
- External integration app (`../examples/react`) loads `plainsurvey.css` and the style system (`themes`, `skins`, `layouts`).
- Renderer presets are checked with Plain, Bootstrap, DaisyUI and Bulma.
- Integration flow covers JSON apply/import/export from consumer app in `../examples/react`.
- Analytics shows response and question summary tables in integration validation.
- Theme, mode and layout variants are validated from external consumer examples.
- Tarball verification confirms required source files are present (for example `src/modules/builder/view.js`, `src/locales/index.js`, `src/helpers/focus.js`, `src/utils/object.js`, `src/core/index.js`).

## Release Candidate Shape

The package exposes:

- `plainsurvey`
- `plainsurvey/core`
- `plainsurvey/renderer`
- `plainsurvey/builder`
- `plainsurvey/styles`
- `plainsurvey/styles/plainsurvey.css`
- `plainsurvey/styles/themes.css`
- `plainsurvey/styles/skins.css`
- `plainsurvey/styles/layouts.css`
- `plainsurvey/styles/themes/*.css`
- `plainsurvey/analytics`
- `plainsurvey/ai`

The package includes source modules and optional built artifacts plus metadata required by consumers.

## Current Status Notes

- Core, Renderer, Builder, Styles, Analytics and AI modules are implemented.
- Style system split into base CSS plus theme/skin/layout layers is implemented.
- Visualization and UX validation projects are maintained outside the package in `../examples/react`.
- Release hardening still depends on final runtime/tooling alignment and final verification pass before publish.
