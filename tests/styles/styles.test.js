import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";

import { createSurveyRenderer } from "../../src/modules/renderer/index.js";
import { bootstrapPreset, bulmaPreset, createUiPreset, daisyPreset, plainPreset } from "../../src/assets/styles/index.js";

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
  const stylesheet = readFileSync(new URL("../../src/assets/styles/plainsurvey.css", import.meta.url), "utf8");
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

  assert.match(stylesheet, /fonts\.googleapis\.com/);
  assert.match(stylesheet, /box-sizing:\s*border-box/);
  assert.match(stylesheet, /button:disabled,[\s\S]*cursor:\s*not-allowed/);
  assert.deepEqual(packageJson.sideEffects, ["**/*.css"]);
});

test("public stylesheet keeps builder modern layout centered with movable sidebars", () => {
  const stylesheet = readFileSync(new URL("../../src/assets/styles/plainsurvey.css", import.meta.url), "utf8");
  const layoutStylesheet = readFileSync(new URL("../../src/assets/styles/layouts.css", import.meta.url), "utf8");

  assert.match(stylesheet, /\.ps-builder > \.ps-builder-panel > \.ps-builder-panel\s*\{/);
  assert.match(stylesheet, /@import url\("\.\/layouts\.css"\)/);
  assert.match(layoutStylesheet, /html\[data-layout="modern"\] \.builder-layout\s*\{[\s\S]*grid-template-columns:[\s\S]*minmax\(250px, 18fr\)[\s\S]*minmax\(0, 60fr\)[\s\S]*minmax\(320px, 18fr\)/);
  assert.match(layoutStylesheet, /html\[data-layout="modern"\] \.builder-toolbox,[\s\S]*html\[data-layout="modern"\] \.properties-panel\s*\{[\s\S]*position:\s*fixed/);
  assert.match(layoutStylesheet, /html\[data-layout="modern"\] \.builder-preview\s*\{[\s\S]*grid-column:\s*2/);
  assert.match(layoutStylesheet, /html\[data-layout="modern"\] \.ps-builder > \.ps-builder-preview\s*\{[\s\S]*max-width:\s*none;[\s\S]*margin-inline:\s*0/);
});

test("all bundled themes expose extended builder surface tokens", () => {
  const themes = ["corporativo", "academia", "producto", "atelier", "nexus", "catppuccin", "obsidian"];

  for (const theme of themes) {
    const stylesheet = readFileSync(new URL(`../../src/assets/styles/themes/${theme}.css`, import.meta.url), "utf8");
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
