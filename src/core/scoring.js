import { isQuestionVisible } from "./conditions.js";

export function calculateSurveyScore(survey, answers = {}) {
  const results = [];

  for (const page of survey?.pages || []) {
    collectQuestionScores(page.elements || [], answers, results);
  }

  const totalMaxPoints = results.reduce((total, result) => total + result.maxPoints, 0);
  const totalAwardedPoints = results.reduce((total, result) => total + result.awardedPoints, 0);
  const percentage = totalMaxPoints > 0 ? Math.round((totalAwardedPoints / totalMaxPoints) * 100) : 0;

  return {
    totalQuestions: results.length,
    totalMaxPoints,
    totalAwardedPoints,
    percentage,
    results
  };
}

function collectQuestionScores(questions, answers, results) {
  for (const question of questions) {
    if (!isQuestionVisible(question, answers)) continue;
    if (question.type === "panel") {
      collectQuestionScores(question.elements || [], answers, results);
      continue;
    }
    if (!question.scoring?.enabled) continue;

    const score = Number(question.scoring.score) || 0;
    const weight = Number(question.scoring.weight) || 0;
    const maxPoints = score * weight;
    const answer = answers[question.name];
    const isCorrect = compareAnswers(question, answer, question.scoring.correctAnswer);

    results.push({
      question,
      answer,
      correctAnswer: question.scoring.correctAnswer,
      rationale: question.scoring.rationale || "",
      score,
      weight,
      maxPoints,
      awardedPoints: isCorrect ? maxPoints : 0,
      isCorrect
    });
  }
}

function compareAnswers(question, answer, correctAnswer) {
  if (question.type === "checkbox" || question.type === "ranking") {
    return normalizeArray(answer).join("|") === normalizeArray(correctAnswer).join("|");
  }

  if (question.type === "matrix") {
    return stableStringify(answer || {}) === stableStringify(correctAnswer || {});
  }

  return stableStringify(answer) === stableStringify(correctAnswer);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function stableStringify(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === "object") {
    return JSON.stringify(Object.keys(value).sort().reduce((result, key) => {
      result[key] = value[key];
      return result;
    }, {}));
  }
  return JSON.stringify(value ?? null);
}
