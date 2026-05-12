import { isEmptyAnswer, isQuestionVisible } from "./conditions.js";
import { isAnswerlessQuestion } from "./schema.js";

export function validatePage(page, answers = {}) {
  const errors = {};

  for (const question of page?.elements || []) {
    if (!isQuestionVisible(question, answers)) continue;

    if (question.type === "panel") {
      Object.assign(errors, validatePage({ elements: question.elements || [] }, answers));
      continue;
    }

    if (isAnswerlessQuestion(question)) continue;
    if (!question.required) continue;

    const answer = answers[question.name];

    if (question.type === "matrix") {
      if (!hasEveryMatrixRow(question, answer)) {
        errors[question.name] = "This question is required.";
      }
      continue;
    }

    if (isEmptyAnswer(answer)) {
      errors[question.name] = "This question is required.";
    }
  }

  return errors;
}

export function validateSurvey(survey, answers = {}) {
  return (survey?.pages || []).reduce((errors, page) => {
    return { ...errors, ...validatePage(page, answers) };
  }, {});
}

function hasEveryMatrixRow(question, answer = {}) {
  if (!answer || typeof answer !== "object") return false;
  return (question.rows || []).every((row) => !isEmptyAnswer(answer[row.value]));
}
