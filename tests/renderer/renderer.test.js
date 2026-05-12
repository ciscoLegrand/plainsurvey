import test from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

import { createSurveyRenderer } from "../../src/renderer/index.js";

test("createSurveyRenderer mounts a survey and emits changes", () => {
  const { target } = setupDom();
  const changes = [];

  createSurveyRenderer({
    target,
    survey: surveyWithSingleRequiredQuestion(),
    onChange: (event) => changes.push(event)
  });

  assert.match(target.textContent, /Contact/);
  assert.match(target.textContent, /Name/);

  const input = target.querySelector('input[name="name"]');
  input.value = "Ada";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0].answers, { name: "Ada" });
});

test("renderer preserves text input focus while re-rendering on input", () => {
  const { target } = setupDom();

  createSurveyRenderer({
    target,
    survey: surveyWithSingleRequiredQuestion()
  });

  const input = target.querySelector('input[name="name"]');
  input.focus();
  input.value = "A";
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));

  const nextInput = target.querySelector('input[name="name"]');
  assert.equal(document.activeElement, nextInput);
  assert.equal(nextInput.selectionStart, 1);
});

test("renderer validates before completing and then calls onComplete with score", () => {
  const { target } = setupDom();
  const completed = [];

  createSurveyRenderer({
    target,
    survey: surveyWithSingleRequiredQuestion(),
    onComplete: (event) => completed.push(event)
  });

  submit(target);

  assert.match(target.textContent, /This question is required/);
  assert.equal(completed.length, 0);

  const input = target.querySelector('input[name="name"]');
  input.value = "Ada";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  submit(target);

  assert.equal(completed.length, 1);
  assert.deepEqual(completed[0].answers, { name: "Ada" });
  assert.equal(completed[0].scoreResult.totalQuestions, 0);
  assert.match(target.textContent, /Survey complete/);
});

test("renderer changes pages and reports page changes", () => {
  const { target } = setupDom();
  const pageChanges = [];

  createSurveyRenderer({
    target,
    survey: {
      title: "Two pages",
      pages: [
        { title: "First", elements: [{ name: "first", type: "text", title: "First answer" }] },
        { title: "Second", elements: [{ name: "second", type: "text", title: "Second answer" }] }
      ]
    },
    onPageChange: (event) => pageChanges.push(event.pageIndex)
  });

  submit(target);

  assert.deepEqual(pageChanges, [1]);
  assert.match(target.textContent, /Second/);

  target.querySelector('button[type="button"]').click();

  assert.deepEqual(pageChanges, [1, 0]);
  assert.match(target.textContent, /First/);
});

test("renderer renders all supported question types", () => {
  const { target } = setupDom();

  createSurveyRenderer({
    target,
    survey: {
      title: "All types",
      pages: [
        {
          title: "Questions",
          elements: [
            { name: "text", type: "text", title: "Text" },
            { name: "textarea", type: "textarea", title: "Textarea" },
            { name: "radio", type: "radio", title: "Radio", choices: ["a", "b"] },
            { name: "checkbox", type: "checkbox", title: "Checkbox", choices: ["a", "b"] },
            { name: "dropdown", type: "dropdown", title: "Dropdown", choices: ["a", "b"] },
            { name: "rating", type: "rating", title: "Rating", rateMin: 1, rateMax: 3 },
            { name: "emoji", type: "emojiScale", title: "Emoji" },
            { name: "image", type: "imageChoice", title: "Image", choices: [{ value: "a", text: "A", imageUrl: "https://example.test/a.png" }] },
            { name: "compare", type: "imageCompare", title: "Compare", choices: [{ value: "b", text: "B", imageUrl: "https://example.test/b.png" }] },
            { name: "ranking", type: "ranking", title: "Ranking", choices: ["a", "b"] },
            { name: "matrix", type: "matrix", title: "Matrix" },
            { name: "boolean", type: "boolean", title: "Boolean" },
            { name: "panel", type: "panel", title: "Panel", elements: [{ name: "nested", type: "text", title: "Nested" }] },
            { name: "code", type: "codeBlock", title: "Code", code: "const ok = true;" },
            { name: "svg", type: "svgNote", title: "Note" },
            { name: "content", type: "contentBlock", title: "Content", body: "Body copy" }
          ]
        }
      ]
    }
  });

  assert.equal(target.querySelectorAll("fieldset").length, 14);
  assert.equal(target.querySelectorAll("textarea").length, 1);
  assert.equal(target.querySelectorAll("select").length, 1);
  assert.equal(target.querySelectorAll("table").length, 1);
  assert.match(target.textContent, /const ok = true/);
  assert.match(target.textContent, /Body copy/);
  assert.match(target.textContent, /Nested/);
});

test("renderer applies UI overrides and destroy clears the target", () => {
  const { target } = setupDom();

  const renderer = createSurveyRenderer({
    target,
    survey: surveyWithSingleRequiredQuestion(),
    ui: {
      root: "custom-root",
      primaryButton: "custom-primary"
    }
  });

  assert.ok(target.querySelector(".custom-root"));
  assert.ok(target.querySelector(".custom-primary"));

  renderer.destroy();

  assert.equal(target.innerHTML, "");
});

function setupDom() {
  const window = new Window();
  window.document.body.innerHTML = "<div id=\"target\"></div>";
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.Event = window.Event;

  return {
    window,
    target: window.document.querySelector("#target")
  };
}

function submit(target) {
  target.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}

function surveyWithSingleRequiredQuestion() {
  return {
    title: "Contact",
    pages: [
      {
        title: "Contact",
        elements: [
          {
            id: "q_name",
            name: "name",
            type: "text",
            title: "Name",
            required: true
          }
        ]
      }
    ]
  };
}
