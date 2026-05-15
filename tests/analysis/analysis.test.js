import test from "node:test";
import assert from "node:assert/strict";

import {
  ANALYSIS_CONTRACT_VERSION,
  createTextInsights,
  createSurveyAnalysisContract,
  createSurveyInsightDataset,
  toSurveyAnalysisContract
} from "../../src/analysis/index.js";

test("analysis contract returns the four valuation dimensions as structured data", () => {
  const contract = createSurveyAnalysisContract({
    id: "team-health-q2",
    label: "Team Health Q2",
    survey: survey(),
    responses: [
      { clarity: 5, workload: 4, feedback: "Great collaboration and support" },
      { clarity: 3, workload: 2, feedback: "Too many blockers and unclear priorities" }
    ],
    locale: "en",
    insightConfig: {
      stopWords: ["and", "too", "many"],
      sentimentLexicon: {
        positive: ["great", "support", "collaboration"],
        negative: ["blockers", "unclear"]
      }
    }
  });

  assert.equal(contract.version, ANALYSIS_CONTRACT_VERSION);
  assert.equal(contract.metrics.responses, 2);
  assert.equal(contract.valuation.dimensions.scoring.value, null);
  assert.equal(typeof contract.valuation.dimensions.ratings.value, "number");
  assert.equal(typeof contract.valuation.dimensions.coverage.value, "number");
  assert.equal(typeof contract.valuation.dimensions.sentiment.value, "number");
  assert.ok(Array.isArray(contract.text.topWords));
});

test("dataset can be converted to a serializable contract", () => {
  const dataset = createSurveyInsightDataset({
    id: "team-health-mini",
    survey: survey(),
    responses: [{ clarity: 4, workload: 4, feedback: "Stable" }],
    locale: "en"
  });

  const contract = toSurveyAnalysisContract(dataset);
  assert.equal(contract.id, "team-health-mini");
  assert.equal(contract.questions.length, dataset.analysis.questions.length);
  assert.doesNotThrow(() => JSON.stringify(contract));
});

test("text insights are neutral by default and accept caller lexicons", () => {
  const dataset = createSurveyInsightDataset({
    survey: survey(),
    responses: [{ feedback: "Great support" }, { feedback: "Unclear blockers" }],
    locale: "en"
  });

  assert.equal(dataset.textInsights.sentiment.positive, 0);
  assert.equal(dataset.textInsights.sentiment.negative, 0);
  assert.equal(dataset.textInsights.sentiment.neutral, 2);

  const textInsights = createTextInsights(dataset.analysis, {
    insightConfig: {
      sentimentLexicon: {
        positive: ["great", "support"],
        negative: ["unclear", "blockers"]
      }
    }
  });

  assert.equal(textInsights.sentiment.positive, 1);
  assert.equal(textInsights.sentiment.negative, 1);
});

function survey() {
  return {
    title: "Team health",
    pages: [
      {
        title: "General",
        elements: [
          { name: "clarity", type: "rating", title: "Role clarity", rateMin: 1, rateMax: 5 },
          { name: "workload", type: "rating", title: "Workload", rateMin: 1, rateMax: 5 },
          { name: "feedback", type: "textarea", title: "Feedback" }
        ]
      }
    ]
  };
}
