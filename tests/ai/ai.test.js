import test from "node:test";
import assert from "node:assert/strict";

import { createSurveyFromPrompt, generateSurveyWithAi } from "../../src/ai/index.js";

test("generateSurveyWithAi returns recoverable draft when provider is unavailable", async () => {
  const result = await generateSurveyWithAi({ prompt: "customer onboarding" });

  assert.equal(result.ok, false);
  assert.match(result.error, /unavailable/);
  assert.match(result.survey.title, /customer onboarding/);
});

test("generateSurveyWithAi normalizes provider output", async () => {
  const result = await generateSurveyWithAi({
    prompt: "support",
    provider: async () => ({
      title: "Support",
      pages: [{ title: "Page", elements: [{ name: "rating", type: "rating", title: "Rate us" }] }]
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.survey.title, "Support");
  assert.equal(result.survey.pages[0].elements[0].type, "rating");
});

test("createSurveyFromPrompt creates compatible JSON", () => {
  const survey = createSurveyFromPrompt("developer experience");

  assert.equal(survey.pages.length, 1);
  assert.equal(survey.pages[0].elements.length, 2);
});
