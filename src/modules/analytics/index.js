import { calculateSurveyScore, normalizeSurvey } from "../../core/index.js";

export function analyzeSurveyResponses({ survey, responses = [] } = {}) {
  const normalizedSurvey = normalizeSurvey(survey);
  const normalizedResponses = responses.map((response) => response?.answers || response || {});
  const questionSummaries = flattenQuestions(normalizedSurvey).map((question) => summarizeQuestion(question, normalizedResponses));
  const scores = normalizedResponses.map((answers) => calculateSurveyScore(normalizedSurvey, answers));
  const totalAwardedPoints = scores.reduce((total, score) => total + score.totalAwardedPoints, 0);
  const totalMaxPoints = scores.reduce((total, score) => total + score.totalMaxPoints, 0);

  return {
    survey: {
      title: normalizedSurvey.title,
      pageCount: normalizedSurvey.pages.length,
      questionCount: questionSummaries.length
    },
    responseCount: normalizedResponses.length,
    questions: questionSummaries,
    scoring: {
      totalAwardedPoints,
      totalMaxPoints,
      averagePercentage: scores.length
        ? Math.round(scores.reduce((total, score) => total + score.percentage, 0) / scores.length)
        : 0
    }
  };
}

export function toBarChartData(summary) {
  const options = optionCounts(summary);
  return {
    type: "bar",
    labels: options.map((item) => item.label),
    datasets: [{ label: summary.title, data: options.map((item) => item.count) }]
  };
}

export function toPieChartData(summary) {
  const options = optionCounts(summary);
  return {
    type: "pie",
    labels: options.map((item) => item.label),
    datasets: [{ label: summary.title, data: options.map((item) => item.count) }]
  };
}

export function toRatingDistributionData(summary) {
  const distribution = summary.rating?.distribution || {};
  const labels = Object.keys(distribution).sort((a, b) => Number(a) - Number(b));
  return {
    type: "rating-distribution",
    labels,
    datasets: [{ label: summary.title, data: labels.map((label) => distribution[label]) }]
  };
}

export function toMatrixHeatmapData(summary) {
  return {
    type: "matrix-heatmap",
    rows: summary.matrix?.rows || [],
    columns: summary.matrix?.columns || [],
    values: summary.matrix?.values || []
  };
}

export function toRankingChartData(summary) {
  const ranking = summary.ranking || [];
  return {
    type: "ranking",
    labels: ranking.map((item) => item.label),
    datasets: [{ label: "Average position", data: ranking.map((item) => item.averagePosition) }]
  };
}

function summarizeQuestion(question, responses) {
  const answers = responses.map((response) => response[question.name]).filter((answer) => answer !== undefined);
  const base = {
    name: question.name,
    title: question.title,
    type: question.type,
    responseCount: answers.length
  };

  if (["radio", "dropdown", "emojiScale", "imageChoice", "imageCompare", "boolean"].includes(question.type)) {
    return { ...base, options: countSingle(question, answers) };
  }
  if (question.type === "checkbox") {
    return { ...base, options: countMultiple(question, answers) };
  }
  if (question.type === "rating") {
    return { ...base, rating: summarizeRatings(answers) };
  }
  if (question.type === "matrix") {
    return { ...base, matrix: summarizeMatrix(question, answers) };
  }
  if (question.type === "ranking") {
    return { ...base, ranking: summarizeRanking(question, answers) };
  }
  if (["text", "textarea"].includes(question.type)) {
    return { ...base, openText: answers.map(String).filter(Boolean) };
  }

  return base;
}

function countSingle(question, answers) {
  const counts = Object.fromEntries(choiceEntries(question).map((choice) => [String(choice.value), 0]));
  for (const answer of answers) {
    const key = String(answer);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([value, count]) => ({ value: parseValue(value), label: labelFor(question, value), count }));
}

function countMultiple(question, answers) {
  const counts = Object.fromEntries(choiceEntries(question).map((choice) => [String(choice.value), 0]));
  for (const answer of answers) {
    for (const item of Array.isArray(answer) ? answer : []) {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([value, count]) => ({ value, label: labelFor(question, value), count }));
}

function summarizeRatings(answers) {
  const values = answers.map(Number).filter(Number.isFinite);
  const distribution = {};
  for (const value of values) distribution[value] = (distribution[value] || 0) + 1;
  return {
    average: values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0,
    distribution
  };
}

function summarizeMatrix(question, answers) {
  const rows = (question.rows || []).map((row) => row.value);
  const columns = (question.columns || []).map((column) => column.value);
  const values = rows.map((row) => {
    return columns.map((column) => {
      return answers.filter((answer) => answer && answer[row] === column).length;
    });
  });
  return { rows, columns, values };
}

function summarizeRanking(question, answers) {
  return (question.choices || []).map((choice) => {
    const positions = answers
      .map((answer) => Array.isArray(answer) ? answer.indexOf(choice.value) : -1)
      .filter((index) => index >= 0)
      .map((index) => index + 1);
    return {
      value: choice.value,
      label: choice.text,
      averagePosition: positions.length ? positions.reduce((total, value) => total + value, 0) / positions.length : 0
    };
  });
}

function optionCounts(summary) {
  return summary.options || [];
}

function flattenQuestions(survey) {
  return survey.pages.flatMap((page) => flattenElements(page.elements || []));
}

function flattenElements(elements) {
  return elements.flatMap((question) => {
    if (question.type === "panel") return flattenElements(question.elements || []);
    return question;
  });
}

function choiceEntries(question) {
  if (question.type === "boolean") {
    return [
      { value: true, text: "Yes" },
      { value: false, text: "No" }
    ];
  }
  return question.choices || [];
}

function labelFor(question, value) {
  const choice = choiceEntries(question).find((item) => String(item.value) === String(value));
  return choice?.text || String(value);
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}
