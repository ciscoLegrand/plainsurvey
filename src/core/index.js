export {
  QUESTION_TYPES,
  QUESTION_TYPE_VALUES,
  ANSWERLESS_QUESTION_TYPES,
  OPERATORS,
  createSurvey,
  createPage,
  createQuestion,
  hasChoices,
  isAnswerlessQuestion,
  normalizeSurvey
} from "./schema.js";

export {
  isEmptyAnswer,
  isQuestionVisible,
  visibleQuestions
} from "./conditions.js";

export {
  validatePage,
  validateSurvey
} from "./validation.js";

export {
  calculateSurveyScore
} from "./scoring.js";

export {
  createSession,
  setAnswer,
  nextPage,
  previousPage
} from "./session.js";
