/**
 * survey-expander.js
 * Expande una encuesta generada por IA para garantizar que cumpla
 * con el briefing (páginas mínimas, preguntas por página, tipos solicitados).
 * Responsabilidad única: post-procesado de profundidad.
 */
import { normalizeSurvey } from "../../core/index.js";
import { buildQuestionByType, clampInteger, CONDITIONAL_TYPES } from "./question-factory.js";

/**
 * Recibe la encuesta devuelta por el modelo y la completa hasta el mínimo
 * definido en el briefing. No elimina preguntas existentes.
 */
export function ensureSurveyDepth(survey, briefing) {
  const normalized = normalizeSurvey(survey);
  const targetPages = clampInteger(briefing.pagesCount, 2, 12);
  const targetQuestions = clampInteger(briefing.questionsPerPage, 3, 12);
  const desiredTypes = Array.isArray(briefing.questionTypes) && briefing.questionTypes.length > 0
    ? briefing.questionTypes
    : ["text", "textarea", "radio", "rating"];

  while (normalized.pages.length < targetPages) {
    normalized.pages.push({
      id: `page_${normalized.pages.length + 1}`,
      title: `Page ${normalized.pages.length + 1}`,
      description: "",
      elements: []
    });
  }

  normalized.pages = normalized.pages.map((page, pi) => {
    const elements = Array.isArray(page.elements) ? [...page.elements] : [];

    while (elements.length < targetQuestions) {
      const type = desiredTypes[(pi + elements.length) % desiredTypes.length];
      const generated = buildQuestionByType(type, briefing, pi, elements.length);
      if (briefing.conditionalLogic !== "none" && pi > 0 && elements.length === 0 && CONDITIONAL_TYPES.has(type)) {
        generated.visibleIf = { question: "topic_overview", operator: "notEmpty" };
      }
      elements.push(generated);
    }

    return {
      ...page,
      title: pi === 0 ? "Context" : (page.title || `Page ${pi + 1}`),
      description: page.description || "",
      elements: elements.slice(0, targetQuestions)
    };
  });

  if (!normalized.title || normalized.title === "Untitled survey") {
    normalized.title = `${briefing.topic || "Generated"} survey`;
  }
  if (!normalized.description) {
    normalized.description = briefing.objective || "Survey generated from a guided briefing.";
  }

  return normalized;
}
