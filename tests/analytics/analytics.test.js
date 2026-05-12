import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeSurveyResponses,
  toBarChartData,
  toMatrixHeatmapData,
  toPieChartData,
  toRankingChartData,
  toRatingDistributionData
} from "../../src/analytics/index.js";

test("analyzeSurveyResponses aggregates choice, rating, matrix, ranking and open answers", () => {
  const analysis = analyzeSurveyResponses({
    survey: survey(),
    responses: [
      { plan: "pro", features: ["forms", "analytics"], rating: 5, matrix: { speed: "high", support: "medium" }, rank: ["analytics", "forms"], comment: "Great" },
      { plan: "free", features: ["forms"], rating: 3, matrix: { speed: "medium", support: "medium" }, rank: ["forms", "analytics"], comment: "Ok" }
    ]
  });

  assert.equal(analysis.responseCount, 2);
  assert.equal(question(analysis, "plan").options.find((item) => item.value === "pro").count, 1);
  assert.equal(question(analysis, "features").options.find((item) => item.value === "forms").count, 2);
  assert.equal(question(analysis, "rating").rating.average, 4);
  assert.deepEqual(question(analysis, "matrix").matrix.values, [[0, 1, 1], [0, 2, 0]]);
  assert.equal(question(analysis, "rank").ranking.find((item) => item.value === "analytics").averagePosition, 1.5);
  assert.deepEqual(question(analysis, "comment").openText, ["Great", "Ok"]);
});

test("analytics includes scoring summary", () => {
  const analysis = analyzeSurveyResponses({
    survey: {
      pages: [
        {
          elements: [
            {
              name: "plan",
              type: "radio",
              title: "Plan",
              choices: ["free", "pro"],
              scoring: { enabled: true, score: 2, weight: 1, correctAnswer: "pro" }
            }
          ]
        }
      ]
    },
    responses: [{ plan: "pro" }, { plan: "free" }]
  });

  assert.equal(analysis.scoring.totalAwardedPoints, 2);
  assert.equal(analysis.scoring.totalMaxPoints, 4);
  assert.equal(analysis.scoring.averagePercentage, 50);
});

test("chart adapters return serializable neutral datasets", () => {
  const analysis = analyzeSurveyResponses({
    survey: survey(),
    responses: [
      { plan: "pro", rating: 5, matrix: { speed: "high", support: "medium" }, rank: ["analytics", "forms"] },
      { plan: "free", rating: 3, matrix: { speed: "medium", support: "medium" }, rank: ["forms", "analytics"] }
    ]
  });

  assert.deepEqual(toBarChartData(question(analysis, "plan")).labels, ["free", "pro"]);
  assert.deepEqual(toPieChartData(question(analysis, "plan")).datasets[0].data, [1, 1]);
  assert.deepEqual(toRatingDistributionData(question(analysis, "rating")).labels, ["3", "5"]);
  assert.deepEqual(toMatrixHeatmapData(question(analysis, "matrix")).rows, ["speed", "support"]);
  assert.deepEqual(toRankingChartData(question(analysis, "rank")).datasets[0].data, [1.5, 1.5]);
  assert.doesNotThrow(() => JSON.stringify(analysis));
});

function question(analysis, name) {
  return analysis.questions.find((item) => item.name === name);
}

function survey() {
  return {
    title: "Analytics survey",
    pages: [
      {
        elements: [
          { name: "plan", type: "radio", title: "Plan", choices: ["free", "pro"] },
          { name: "features", type: "checkbox", title: "Features", choices: ["forms", "analytics"] },
          { name: "rating", type: "rating", title: "Rating", rateMin: 1, rateMax: 5 },
          {
            name: "matrix",
            type: "matrix",
            title: "Matrix",
            rows: ["speed", "support"],
            columns: ["low", "medium", "high"]
          },
          { name: "rank", type: "ranking", title: "Rank", choices: ["forms", "analytics"] },
          { name: "comment", type: "textarea", title: "Comment" }
        ]
      }
    ]
  };
}
