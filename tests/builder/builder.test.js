import test from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

import { createSurveyBuilder } from "../../src/modules/builder/index.js";

test("createSurveyBuilder mounts survey metadata and emits normalized changes", () => {
  const target = setupDom();
  const changes = [];

  createSurveyBuilder({
    target,
    survey: sampleSurvey(),
    onChange: (survey) => changes.push(survey)
  });

  assert.match(target.textContent, /Survey title/);
  assert.match(target.textContent, /Question bank|Banco de preguntas/);

  const titleInput = labeledInput(target, "Survey title");
  titleInput.value = "Updated survey";
  titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.equal(changes.at(-1).title, "Updated survey");
  assert.equal(changes.at(-1).pages[0].elements[0].type, "text");
});

test("builder preserves input focus while editing normalized JSON", () => {
  const target = setupDom();

  createSurveyBuilder({
    target,
    survey: sampleSurvey()
  });

  const titleInput = labeledInput(target, "Survey title");
  titleInput.focus();
  titleInput.value = "A";
  titleInput.setSelectionRange(1, 1);
  titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  const nextTitleInput = labeledInput(target, "Survey title");
  assert.equal(document.activeElement, nextTitleInput);
  assert.equal(nextTitleInput.selectionStart, 1);
});

test("builder adds and deletes questions", () => {
  const target = setupDom();
  let latest;

  createSurveyBuilder({
    target,
    survey: sampleSurvey(),
    onChange: (survey) => {
      latest = survey;
    }
  });

  clickButtonByTitle(target, "Add question to the end of this page");
  assert.equal(latest.pages[0].elements.length, 2);

  clickButtonByTitle(target, "Delete question");
  assert.equal(latest.pages[0].elements.length, 1);
});

test("builder edits type and scoring fields", () => {
  const target = setupDom();
  let latest;

  createSurveyBuilder({
    target,
    survey: sampleSurvey(),
    onChange: (survey) => {
      latest = survey;
    }
  });

  const questionCard = target.querySelector(".preview-question");
  assert.ok(questionCard);
  questionCard.click();

  const typeSelect = findSelectByOptionValue(target, "radio");
  assert.ok(typeSelect);
  typeSelect.value = "radio";
  typeSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

  const scoringCheckbox = Array.from(target.querySelectorAll('input[type="checkbox"]'))
    .find((input) => input.closest(".check-row"));
  assert.ok(scoringCheckbox);
  scoringCheckbox.checked = true;
  scoringCheckbox.dispatchEvent(new window.Event("change", { bubbles: true }));
  const correctAnswerSelect = Array.from(target.querySelectorAll("select"))
    .find((select) => Array.from(select.options).some((option) => option.value === "yes" || option.value === "pro" || option.value === "free"));
  if (correctAnswerSelect && correctAnswerSelect.options.length > 0) {
    correctAnswerSelect.value = correctAnswerSelect.options[0].value;
    correctAnswerSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  }

  const question = latest.pages[0].elements[0];
  assert.equal(question.type, "radio");
  assert.equal(question.scoring.enabled, true);
  assert.ok(question.scoring.correctAnswer !== undefined);
});

test("builder update replaces survey and destroy clears target", () => {
  const target = setupDom();
  const builder = createSurveyBuilder({ target, survey: sampleSurvey() });

  builder.update({
    survey: {
      title: "Replacement",
      pages: [{ title: "Only page", elements: [{ name: "email", type: "text", title: "Email" }] }]
    }
  });

  assert.equal(builder.getSurvey().title, "Replacement");
  assert.match(target.textContent, /Email/);

  builder.destroy();
  assert.equal(target.innerHTML, "");
});

test("structure tree renders stable hierarchy without drag-and-drop controls", () => {
  const target = setupDom();

  createSurveyBuilder({
    target,
    survey: {
      title: "Hierarchy",
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          elements: [
            { id: "q1", name: "q1", type: "text", title: "Question 1" },
            { id: "q2", name: "q2", type: "text", title: "Question 2" }
          ]
        },
        {
          id: "page-2",
          title: "Page 2",
          elements: [{ id: "q3", name: "q3", type: "text", title: "Question 3" }]
        }
      ]
    }
  });

  const tree = target.querySelector(".config-tree");
  assert.ok(tree);

  const pageLevelNodes = tree.querySelectorAll(".tree-node.level-1");
  const questionNodes = tree.querySelectorAll(".tree-node.level-2");

  assert.equal(pageLevelNodes.length, 3); // draft + 2 pages
  assert.equal(questionNodes.length, 3);
  assert.match(target.textContent, /P1\.1/);
  assert.match(target.textContent, /P2\.1/);
  assert.equal(tree.querySelectorAll(".tree-page-dropzone").length, 0);
  assert.equal(tree.querySelectorAll(".tree-question-dropzone").length, 0);
});

function setupDom() {
  const window = new Window();
  window.document.body.innerHTML = "<div id=\"target\"></div>";
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.Event = window.Event;
  return window.document.querySelector("#target");
}

function sampleSurvey() {
  return {
    title: "Sample",
    pages: [
      {
        title: "Page 1",
        elements: [{ id: "q1", name: "name", type: "text", title: "Name" }]
      }
    ]
  };
}

function label(target, text) {
  return Array.from(target.querySelectorAll("label")).find((item) => item.textContent.includes(text));
}

function labeledInput(target, text) {
  return label(target, text).querySelector("input, textarea, select");
}

function clickButton(target, text) {
  const button = Array.from(target.querySelectorAll("button")).find((item) => item.textContent === text);
  assert.ok(button, `Button not found: ${text}`);
  button.click();
}

function clickLastButton(target, text) {
  const buttons = Array.from(target.querySelectorAll("button")).filter((item) => item.textContent === text);
  assert.ok(buttons.length, `Button not found: ${text}`);
  buttons.at(-1).click();
}

function clickButtonByTitle(target, title) {
  const button = Array.from(target.querySelectorAll("button")).find((item) => item.getAttribute("title") === title);
  assert.ok(button, `Button not found with title: ${title}`);
  button.click();
}

function findSelectByOptionValue(target, value) {
  return Array.from(target.querySelectorAll("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === value)
  );
}
