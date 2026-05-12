import test from "node:test";
import assert from "node:assert/strict";

import { createSurvey as createSurveyFromRoot } from "plainsurvey";
import { analyzeSurveyResponses } from "plainsurvey/analytics";
import { generateSurveyWithAi } from "plainsurvey/ai";
import { createSurvey as createSurveyFromCore } from "plainsurvey/core";
import { createSurveyBuilder } from "plainsurvey/builder";
import { createSurveyRenderer } from "plainsurvey/renderer";
import { createUiPreset } from "plainsurvey/styles";

test("public package exports expose library APIs", () => {
  assert.equal(typeof createSurveyFromRoot, "function");
  assert.equal(typeof analyzeSurveyResponses, "function");
  assert.equal(typeof generateSurveyWithAi, "function");
  assert.equal(typeof createSurveyFromCore, "function");
  assert.equal(typeof createSurveyBuilder, "function");
  assert.equal(typeof createSurveyRenderer, "function");
  assert.equal(typeof createUiPreset, "function");

  assert.equal(createSurveyFromRoot().title, "Untitled survey");
  assert.equal(createSurveyFromCore().title, "Untitled survey");
});
