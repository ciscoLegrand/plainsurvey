import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";

import { createSurveyRenderer } from "../../src/renderer/index.js";
import { bootstrapPreset, bulmaPreset, createUiPreset, daisyPreset, plainPreset } from "../../src/styles/index.js";

test("framework presets provide renderer class contracts without dependencies", () => {
  assert.match(plainPreset.root, /ps-renderer/);
  assert.match(bootstrapPreset.input, /form-control/);
  assert.match(daisyPreset.button, /btn/);
  assert.match(daisyPreset.root, /ps-daisy-renderer/);
  assert.match(daisyPreset.page, /ps-page/);
  assert.match(bulmaPreset.primaryButton, /is-primary/);
});

test("createUiPreset applies manual overrides with priority", () => {
  const preset = createUiPreset("bootstrap", {
    primaryButton: "custom-primary",
    input: "custom-input"
  });

  assert.equal(preset.primaryButton, "custom-primary");
  assert.equal(preset.input, "custom-input");
  assert.match(preset.button, /btn/);
});

test("presets can be passed directly to the renderer", () => {
  const window = new Window();
  window.document.body.innerHTML = "<div id=\"target\"></div>";
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;

  const target = window.document.querySelector("#target");
  createSurveyRenderer({
    target,
    survey: {
      title: "Styled",
      pages: [{ title: "Page", elements: [{ name: "name", type: "text", title: "Name" }] }]
    },
    ui: createUiPreset("bootstrap", { primaryButton: "custom-primary" })
  });

  assert.ok(target.querySelector(".form-control"));
  assert.ok(target.querySelector(".custom-primary"));
});

test("public stylesheet preserves original typography and import behavior", () => {
  const stylesheet = readFileSync(new URL("../../src/styles/plainsurvey.css", import.meta.url), "utf8");
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

  assert.match(stylesheet, /fonts\.googleapis\.com/);
  assert.match(stylesheet, /box-sizing:\s*border-box/);
  assert.match(stylesheet, /button:disabled,[\s\S]*cursor:\s*not-allowed/);
  assert.deepEqual(packageJson.sideEffects, ["**/*.css"]);
});

test("public stylesheet keeps builder sidebars inside the layout grid", () => {
  const stylesheet = readFileSync(new URL("../../src/styles/plainsurvey.css", import.meta.url), "utf8");
  const builderStylesheet = readFileSync(new URL("../../src/builder/assets/styles/builder.css", import.meta.url), "utf8");
  const studioStylesheet = readFileSync(new URL("../../src/builder/assets/styles/studio.css", import.meta.url), "utf8");

  assert.match(stylesheet, /@import url\("\.\.\/builder\/assets\/styles\/builder\.css"\)/);
  assert.match(stylesheet, /@import url\("\.\.\/builder\/assets\/styles\/studio\.css"\)/);
  assert.match(stylesheet, /@import url\("\.\.\/ai\/assets\/styles\/ai-generator\.css"\)/);
  assert.match(stylesheet, /@import url\("\.\.\/ai\/assets\/styles\/insight-consultant\.css"\)/);
  assert.doesNotMatch(stylesheet, /@import url\("\.\.\/analytics\/assets\/styles\/dashboard\.css"\)/);
  assert.doesNotMatch(stylesheet, /@import url\("\.\/layouts\.css"\)/);

  assert.match(builderStylesheet, /\.ps-builder > \.ps-builder-panel > \.ps-builder-panel\s*\{/);
  assert.match(builderStylesheet, /\.builder-view-tabs\s*\{/);
  assert.doesNotMatch(builderStylesheet, /\.structure-panel/);
  assert.doesNotMatch(builderStylesheet, /\.config-tree/);

  assert.doesNotMatch(studioStylesheet, /data-layout/);
  assert.match(builderStylesheet, /\.builder-layout\s*\{[\s\S]*grid-template-columns:[\s\S]*minmax\(var\(--ps-collapsed-sidebar-width\), var\(--ps-left-sidebar-width\)\)[\s\S]*minmax\(0, 1fr\)[\s\S]*minmax\(var\(--ps-collapsed-sidebar-width\), var\(--ps-right-sidebar-width\)\)/);
  assert.match(builderStylesheet, /\.builder-layout:has\(\.builder-toolbox\.is-collapsed\)/);
  assert.match(builderStylesheet, /\.builder-center-workspace\s*\{[\s\S]*grid-column:\s*2/);
  assert.doesNotMatch(builderStylesheet, /\.builder-preview\s*\{[^}]*grid-column/);
  assert.match(builderStylesheet, /\.builder-view-tabs\s*\{[\s\S]*position:\s*static;[\s\S]*min-height:\s*58px/);
  assert.match(builderStylesheet, /\.builder-layout \.panel-float-handle\s*\{[\s\S]*min-height:\s*58px/);
  assert.match(builderStylesheet, /\.ps-builder\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*100%/);
});

test("all bundled themes expose extended builder surface tokens", () => {
  const themes = ["corporativo", "academia", "producto", "atelier", "nexus", "catppuccin", "obsidian"];

  for (const theme of themes) {
    const stylesheet = readFileSync(new URL(`../../src/styles/themes/${theme}.css`, import.meta.url), "utf8");
    assert.match(stylesheet, /--ps-accent:/, theme);
    assert.match(stylesheet, /--ps-accent-2:/, theme);
    assert.match(stylesheet, /--ps-canvas-bg:/, theme);
    assert.match(stylesheet, /--ps-panel-bg:/, theme);
    assert.match(stylesheet, /--ps-section-bg:/, theme);
    assert.match(stylesheet, /--ps-question-bg:/, theme);
    assert.match(stylesheet, /--ps-inset-bg:/, theme);
    assert.match(stylesheet, /--ps-divider:/, theme);
    assert.match(stylesheet, /--ps-ornament:/, theme);
  }
});
