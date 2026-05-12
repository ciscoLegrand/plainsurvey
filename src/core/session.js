import { normalizeSurvey } from "./schema.js";
import { validatePage, validateSurvey } from "./validation.js";

export function createSession(survey, options = {}) {
  return {
    survey: normalizeSurvey(survey),
    pageIndex: Math.max(0, Number(options.pageIndex) || 0),
    answers: { ...(options.initialAnswers || options.answers || {}) },
    errors: {},
    completed: false
  };
}

export function setAnswer(session, questionName, value) {
  const errors = { ...session.errors };
  delete errors[questionName];

  return {
    ...session,
    answers: {
      ...session.answers,
      [questionName]: value
    },
    errors
  };
}

export function nextPage(session) {
  if (session.completed) return session;

  const page = session.survey.pages[session.pageIndex];
  const pageErrors = validatePage(page, session.answers);
  if (Object.keys(pageErrors).length > 0) {
    return { ...session, errors: pageErrors };
  }

  if (session.pageIndex >= session.survey.pages.length - 1) {
    const surveyErrors = validateSurvey(session.survey, session.answers);
    return Object.keys(surveyErrors).length > 0
      ? { ...session, errors: surveyErrors }
      : { ...session, completed: true, errors: {} };
  }

  return {
    ...session,
    pageIndex: session.pageIndex + 1,
    errors: {}
  };
}

export function previousPage(session) {
  return {
    ...session,
    pageIndex: Math.max(0, session.pageIndex - 1),
    completed: false,
    errors: {}
  };
}
