export function isQuestionVisible(question, answers = {}) {
  if (!question?.visibleIf?.question) return true;

  const { question: sourceName, operator, value } = question.visibleIf;
  const answer = answers[sourceName];

  switch (operator) {
    case "equals":
      return answer === value;
    case "notEquals":
      return answer !== value;
    case "contains":
      return Array.isArray(answer) ? answer.includes(value) : String(answer ?? "").includes(String(value ?? ""));
    case "lessThan":
      return compareAsNumbers(answer, value, (left, right) => left < right);
    case "lessThanOrEqual":
      return compareAsNumbers(answer, value, (left, right) => left <= right);
    case "greaterThan":
      return compareAsNumbers(answer, value, (left, right) => left > right);
    case "greaterThanOrEqual":
      return compareAsNumbers(answer, value, (left, right) => left >= right);
    case "notEmpty":
      return !isEmptyAnswer(answer);
    case "empty":
      return isEmptyAnswer(answer);
    default:
      return true;
  }
}

export function visibleQuestions(page, answers = {}) {
  return (page?.elements || []).filter((question) => isQuestionVisible(question, answers));
}

export function isEmptyAnswer(answer) {
  if (answer === undefined || answer === null || answer === "") return true;
  if (Array.isArray(answer)) return answer.length === 0;
  if (typeof answer === "object") return Object.keys(answer).length === 0;
  return false;
}

function compareAsNumbers(answer, value, predicate) {
  const left = Number(answer);
  const right = Number(value);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return predicate(left, right);
}
