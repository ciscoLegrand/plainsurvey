import test from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

import { createPlainsurveyStudio } from "../../apps/studio/index.js";

test("Studio loads a survey and builder changes are reflected in state", async () => {
  const target = setupDom();
  const studio = createPlainsurveyStudio({ target, initialSurvey: survey(), storage: memoryStorage() });
  await tick();

  const titleInput = Array.from(target.querySelectorAll("label")).find((label) => label.textContent.includes("Survey title")).querySelector("input");
  titleInput.value = "Edited";
  titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.equal(studio.getSurvey().title, "Edited");
});

test("Studio defaults to nexus light full and uses plainsurveyToolbar as main navigation", () => {
  const target = setupDom();
  createPlainsurveyStudio({ target, initialSurvey: survey(), storage: memoryStorage() });

  assert.equal(document.documentElement.getAttribute("data-theme"), "nexus");
  assert.equal(document.documentElement.getAttribute("data-mode"), "light");
  assert.equal(document.documentElement.getAttribute("data-layout"), "full");
  assert.ok(target.querySelector("nav.plainsurveyToolbar"));
  assert.ok(target.querySelector("[data-main-navigation]"));
  assert.match(target.textContent, /builder/);
  assert.match(target.textContent, /preview/);
  assert.match(target.textContent, /analytics/);
  assert.match(target.textContent, /ai/);
  assert.doesNotMatch(target.textContent, /plainsurveyToolbar/);
});

test("Studio can ignore stored appearance and force demo defaults", () => {
  const storage = memoryStorage();
  storage.setItem("plainsurvey:studio", JSON.stringify({
    survey: survey(),
    themeName: "obsidian",
    modeName: "dark",
    layoutName: "modern"
  }));

  const target = setupDom();
  createPlainsurveyStudio({
    target,
    initialSurvey: survey(),
    storage,
    defaultTheme: "nexus",
    defaultMode: "light",
    defaultLayout: "full",
    ignoreStoredAppearance: true
  });

  assert.equal(document.documentElement.getAttribute("data-theme"), "nexus");
  assert.equal(document.documentElement.getAttribute("data-mode"), "light");
  assert.equal(document.documentElement.getAttribute("data-layout"), "full");
});

test("Studio builder can open the JSON workspace from builder actions", async () => {
  const target = setupDom();
  createPlainsurveyStudio({ target, initialSurvey: survey(), storage: memoryStorage() });
  await tick();

  clickButton(target, "Open JSON");

  assert.ok(target.querySelector("[data-json-dialog]"));
  assert.match(target.querySelector("[data-json-dialog-editor]").value, /Studio survey/);
});

test("Studio applies imported JSON and records preview responses in analytics", async () => {
  const target = setupDom();
  const studio = createPlainsurveyStudio({ target, initialSurvey: survey(), storage: memoryStorage() });

  studio.setView("json");
  const editor = target.querySelector("[data-json-editor]");
  editor.value = JSON.stringify({
    title: "Imported",
    pages: [{ title: "Only", elements: [{ name: "email", type: "text", title: "Email", required: true }] }]
  });
  clickButton(target, "Apply JSON");

  assert.equal(studio.getSurvey().title, "Imported");

  studio.setView("preview");
  await tick();
  const input = target.querySelector('input[name="email"]');
  input.value = "a@example.test";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  target.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  assert.equal(studio.getResponses().length, 1);

  studio.setView("analytics");
  assert.match(target.textContent, /Responses: 1/);
  assert.ok(target.querySelector("[data-responses-table]"));
  assert.ok(target.querySelector("[data-question-summary-table]"));
});

test("Studio JSON workspace reports errors and sends normalized JSON", async () => {
  const target = setupDom();
  let sentSurvey = null;
  const studio = createPlainsurveyStudio({
    target,
    initialSurvey: survey(),
    storage: memoryStorage(),
    onSendJson: async (nextSurvey) => {
      sentSurvey = nextSurvey;
    }
  });

  studio.setView("json");
  target.querySelector("[data-json-editor]").value = "{bad json";
  clickButton(target, "Apply JSON");
  assert.ok(target.querySelector("[data-json-error]"));

  studio.importJson(JSON.stringify({
    title: "Imported through API",
    pages: [{ title: "Only", elements: [{ name: "email", type: "text", title: "Email" }] }]
  }));

  assert.equal(studio.getSurvey().title, "Imported through API");

  studio.setView("json");
  clickButton(target, "Send JSON");
  await tick();

  assert.equal(sentSurvey.title, "Imported through API");
});

test("Studio JSON workspace shows current JSON and can load it into the editor", async () => {
  const target = setupDom();
  const studio = createPlainsurveyStudio({ target, initialSurvey: survey(), storage: memoryStorage() });

  studio.setView("json");
  const output = target.querySelector("[data-json-output]");
  const editor = target.querySelector("[data-json-editor]");

  assert.match(output.textContent, /Studio survey/);

  editor.value = "{}";
  clickButton(target, "Load current JSON into editor");

  assert.match(target.querySelector("[data-json-editor]").value, /Studio survey/);
});

test("Studio persists appearance variants and applies preview preset", async () => {
  const storage = memoryStorage();
  let target = setupDom();
  let studio = createPlainsurveyStudio({ target, initialSurvey: survey(), storage });

  studio.setPreset("daisy");
  studio.setTheme("atelier");
  studio.setMode("dark");
  studio.setLayout("modern");

  assert.equal(document.documentElement.getAttribute("data-theme"), "atelier");
  assert.equal(document.documentElement.getAttribute("data-mode"), "dark");
  assert.equal(document.documentElement.hasAttribute("data-skin"), false);
  assert.equal(document.documentElement.getAttribute("data-layout"), "modern");

  target = setupDom();
  studio = createPlainsurveyStudio({ target, initialSurvey: survey(), storage });
  assert.equal(studio.getPreset(), "daisy");
  assert.equal(studio.getMode(), "dark");
  assert.equal(studio.getLayout(), "modern");

  studio.setView("preview");
  await tick();

  assert.ok(target.querySelector(".ps-daisy-renderer"));
});

test("Studio AI view handles provider output", async () => {
  const target = setupDom();
  const studio = createPlainsurveyStudio({
    target,
    initialSurvey: survey(),
    storage: memoryStorage(),
    aiProvider: async () => ({
      title: "AI survey",
      pages: [{ title: "AI", elements: [{ name: "idea", type: "text", title: "Idea" }] }]
    })
  });

  studio.setView("ai");
  target.querySelector("[data-ai-prompt]").value = "ideas";
  clickButton(target, "Generate survey");
  await tick();

  assert.equal(studio.getSurvey().title, "AI survey");
  assert.match(target.textContent, /AI survey generated/);
});

function setupDom() {
  const window = new Window();
  window.document.body.innerHTML = "<div id=\"target\"></div>";
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.Event = window.Event;
  global.document = window.document;
  return window.document.querySelector("#target");
}

function survey() {
  return {
    title: "Studio survey",
    pages: [{ title: "Page", elements: [{ name: "name", type: "text", title: "Name" }] }]
  };
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value)
  };
}

function clickButton(target, text) {
  const button = Array.from(target.querySelectorAll("button")).find((item) => item.textContent === text);
  assert.ok(button, `Button not found: ${text}`);
  button.click();
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
