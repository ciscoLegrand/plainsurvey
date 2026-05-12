import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateSurveyScore,
  createQuestion,
  createSession,
  createSurvey,
  isQuestionVisible,
  nextPage,
  normalizeSurvey,
  setAnswer,
  validatePage
} from "../../src/core/index.js";

test("normalizeSurvey creates a valid default survey for empty input", () => {
  const survey = normalizeSurvey();

  assert.equal(survey.version, 1);
  assert.equal(survey.title, "Untitled survey");
  assert.equal(survey.pages.length, 1);
  assert.equal(survey.pages[0].elements.length, 1);
  assert.equal(survey.pages[0].elements[0].type, "text");
});

test("normalizeSurvey preserves known question types and replaces unknown types", () => {
  const survey = normalizeSurvey({
    pages: [
      {
        elements: [
          { id: "q1", name: "favorite", type: "radio", choices: ["A", "B"] },
          { id: "q2", name: "mystery", type: "unknown" }
        ]
      }
    ]
  });

  assert.equal(survey.pages[0].elements[0].type, "radio");
  assert.deepEqual(survey.pages[0].elements[0].choices, [
    { value: "A", text: "A" },
    { value: "B", text: "B" }
  ]);
  assert.equal(survey.pages[0].elements[1].type, "text");
});

test("isQuestionVisible evaluates supported visibleIf operators", () => {
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "plan", operator: "equals", value: "pro" } }, { plan: "pro" }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "plan", operator: "notEquals", value: "free" } }, { plan: "pro" }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "tags", operator: "contains", value: "ux" } }, { tags: ["ux"] }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "email", operator: "notEmpty" } }, { email: "a@example.test" }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "phone", operator: "empty" } }, { phone: "" }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "score", operator: "lessThan", value: 3 } }, { score: 2 }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "score", operator: "lessThanOrEqual", value: 2 } }, { score: 2 }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "score", operator: "greaterThan", value: 3 } }, { score: 4 }),
    true
  );
  assert.equal(
    isQuestionVisible({ visibleIf: { question: "score", operator: "greaterThanOrEqual", value: 4 } }, { score: 4 }),
    true
  );
});

test("validatePage ignores hidden required questions and validates matrix rows", () => {
  const page = {
    elements: [
      {
        name: "hidden",
        type: "text",
        required: true,
        visibleIf: { question: "show", operator: "equals", value: true }
      },
      {
        name: "matrix",
        type: "matrix",
        required: true,
        rows: [{ value: "speed" }, { value: "support" }]
      }
    ]
  };

  assert.deepEqual(validatePage(page, { show: false, matrix: { speed: "high" } }), {
    matrix: "This question is required."
  });

  assert.deepEqual(validatePage(page, { show: false, matrix: { speed: "high", support: "medium" } }), {});
});

test("normalizeSurvey supports image questions and nested panels", () => {
  const survey = normalizeSurvey({
    pages: [{
      elements: [
        {
          name: "visual",
          type: "imageCompare",
          choices: [{ value: "left", text: "Left", imageUrl: "https://example.test/left.png", caption: "Before" }]
        },
        {
          name: "panel",
          type: "panel",
          elements: [{ name: "nested", type: "text", title: "Nested", required: true }]
        }
      ]
    }]
  });

  assert.equal(survey.pages[0].elements[0].type, "imageCompare");
  assert.equal(survey.pages[0].elements[0].choices[0].imageUrl, "https://example.test/left.png");
  assert.equal(survey.pages[0].elements[1].elements[0].name, "nested");
  assert.deepEqual(validatePage(survey.pages[0], {}), { nested: "This question is required." });
});

test("calculateSurveyScore awards points for correct answers and skips hidden scoring", () => {
  const survey = normalizeSurvey({
    pages: [
      {
        elements: [
          {
            id: "q1",
            name: "choice",
            type: "radio",
            choices: ["a", "b"],
            scoring: { enabled: true, score: 2, weight: 3, correctAnswer: "b" }
          },
          {
            id: "q2",
            name: "hidden",
            type: "boolean",
            visibleIf: { question: "choice", operator: "equals", value: "a" },
            scoring: { enabled: true, score: 10, weight: 1, correctAnswer: true }
          }
        ]
      }
    ]
  });

  const result = calculateSurveyScore(survey, { choice: "b", hidden: true });

  assert.equal(result.totalQuestions, 1);
  assert.equal(result.totalMaxPoints, 6);
  assert.equal(result.totalAwardedPoints, 6);
  assert.equal(result.percentage, 100);
});

test("session blocks invalid navigation and completes valid surveys", () => {
  const survey = createSurvey({
    pages: [
      {
        title: "Required page",
        elements: [
          createQuestion("text", {
            id: "q_name",
            name: "name",
            title: "Name",
            required: true
          })
        ]
      }
    ]
  });

  let session = createSession(survey);
  session = nextPage(session);

  assert.equal(session.completed, false);
  assert.deepEqual(session.errors, { name: "This question is required." });

  session = setAnswer(session, "name", "Ada");
  session = nextPage(session);

  assert.equal(session.completed, true);
  assert.deepEqual(session.errors, {});
});
