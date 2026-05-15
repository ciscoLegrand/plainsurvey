/**
 * question-factory.js
 * Genera preguntas y encuestas de fallback a partir de un briefing.
 * Responsabilidad única: construir elementos de encuesta sin IA.
 */
import { createQuestion, normalizeSurvey } from "../../core/index.js";

export const SCORABLE_TYPES = new Set(["radio", "dropdown", "boolean", "rating", "emojiScale"]);
export const CONDITIONAL_TYPES = new Set(["radio", "dropdown", "boolean", "checkbox"]);

// ─── Utilidades ──────────────────────────────────────────────────────────────

export function clampInteger(value, min, max) {
  const num = Number.parseInt(String(value), 10);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "option";
}

export function choiceList(items) {
  return items.map((item) => ({ value: slugify(item), text: String(item) }));
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function shouldScoreQuestion(question, briefing, questionIndex) {
  if (briefing.scoredQuestions === "none") return false;
  if (!SCORABLE_TYPES.has(question.type)) return false;
  if (briefing.scoredQuestions === "all") return true;
  return questionIndex % 2 === 0;
}

function determineScoringTarget(question) {
  if (question.type === "boolean") return true;
  if (Array.isArray(question.choices) && question.choices.length > 0) return question.choices[0].value;
  if (question.type === "rating") return question.rateMax || 5;
  if (question.type === "emojiScale") return question.choices?.at(-1)?.value;
  return null;
}

export function buildQuestionWithScoring(type, overrides, briefing, pageIndex, questionIndex) {
  const question = createQuestion(type, overrides);
  if (!shouldScoreQuestion(question, briefing, questionIndex)) return question;
  const target = determineScoringTarget(question);
  if (!target) return question;
  question.scoring = {
    enabled: true,
    score: 5,
    weight: 1,
    correctAnswer: target,
    rationale: `Auto-scoring aligned to ${briefing.surveyType || "survey"} brief.`
  };
  return question;
}

// ─── Títulos por tipo ─────────────────────────────────────────────────────────

export function questionTitleFor(type, topic, pageIndex, questionIndex) {
  const bank = {
    text: `What is your main view about ${topic}?`,
    textarea: `Tell us more about ${topic}`,
    radio: `How would you rate ${topic} overall?`,
    checkbox: `Which areas of ${topic} matter most?`,
    dropdown: `Select the best category for ${topic}`,
    rating: `Rate the ${topic} experience`,
    emojiScale: `How do you feel about ${topic}?`,
    ranking: `Rank what matters most in ${topic}`,
    matrix: `Evaluate key dimensions of ${topic}`,
    boolean: `Should we include ${topic} in the final survey?`,
    contentBlock: `Context for block ${pageIndex + 1}`,
    codeBlock: `Reference for block ${pageIndex + 1}`,
    svgNote: `Note for block ${pageIndex + 1}`
  };
  return bank[type] || `Question ${pageIndex + 1}-${questionIndex + 1}`;
}

// ─── Construcción de pregunta por tipo ───────────────────────────────────────

export function buildQuestionByType(type, briefing, pageIndex, questionIndex) {
  const topic = briefing.topic || "survey";
  const audience = briefing.audience || "audience";
  const name = `p${pageIndex + 1}_q${questionIndex + 1}`;
  const base = {
    name,
    title: questionTitleFor(type, topic, pageIndex, questionIndex),
    description: pageIndex === 0 && questionIndex === 0 ? `Designed for ${audience}.` : ""
  };

  switch (type) {
    case "textarea":
      return buildQuestionWithScoring("textarea", { ...base, placeholder: "Describe your answer in detail" }, briefing, pageIndex, questionIndex);
    case "radio":
      return buildQuestionWithScoring("radio", { ...base, choices: choiceList(["Muy satisfecho", "Satisfecho", "Neutral", "Insatisfecho"]) }, briefing, pageIndex, questionIndex);
    case "checkbox":
      return buildQuestionWithScoring("checkbox", { ...base, choices: choiceList(["Rapidez", "Claridad", "Soporte", "Diseno"]) }, briefing, pageIndex, questionIndex);
    case "dropdown":
      return buildQuestionWithScoring("dropdown", { ...base, choices: choiceList(["Opcion A", "Opcion B", "Opcion C"]) }, briefing, pageIndex, questionIndex);
    case "rating":
      return buildQuestionWithScoring("rating", { ...base, rateMin: 1, rateMax: 5 }, briefing, pageIndex, questionIndex);
    case "emojiScale":
      return buildQuestionWithScoring("emojiScale", {
        ...base,
        choices: [
          { value: "terrible", text: "Terrible", emoji: "😠" },
          { value: "bad", text: "Bad", emoji: "🙁" },
          { value: "neutral", text: "Neutral", emoji: "😐" },
          { value: "good", text: "Good", emoji: "🙂" },
          { value: "great", text: "Great", emoji: "😍" }
        ]
      }, briefing, pageIndex, questionIndex);
    case "ranking":
      return buildQuestionWithScoring("ranking", { ...base, choices: choiceList(["Rapidez", "Calidad", "Simplicidad", "Automatizacion"]) }, briefing, pageIndex, questionIndex);
    case "matrix":
      return buildQuestionWithScoring("matrix", { ...base, rows: choiceList(["Contenido", "Proceso", "Soporte"]), columns: choiceList(["Bajo", "Medio", "Alto"]) }, briefing, pageIndex, questionIndex);
    case "boolean":
      return buildQuestionWithScoring("boolean", { ...base, title: questionIndex === 0 ? `¿Recomendarias ${topic}?` : `¿Debe incluirse este bloque?` }, briefing, pageIndex, questionIndex);
    case "contentBlock":
      return createQuestion("contentBlock", { ...base, body: `Contexto: ${topic}` });
    case "codeBlock":
      return createQuestion("codeBlock", { ...base, language: "json", code: JSON.stringify({ topic, audience }, null, 2) });
    case "svgNote":
      return createQuestion("svgNote", { ...base, variant: "orbit", description: "Note to orient the respondent." });
    default:
      return buildQuestionWithScoring("text", { ...base, placeholder: "Type your answer" }, briefing, pageIndex, questionIndex);
  }
}

// ─── Encuesta fallback completa ───────────────────────────────────────────────

export function buildFallbackSurvey(briefing) {
  const pagesCount = clampInteger(briefing.pagesCount, 2, 12);
  const questionsPerPage = clampInteger(briefing.questionsPerPage, 3, 12);
  const selectedTypes = Array.isArray(briefing.questionTypes) && briefing.questionTypes.length > 0
    ? briefing.questionTypes
    : ["text", "textarea", "radio", "rating"];
  const pages = [];

  for (let pi = 0; pi < pagesCount; pi++) {
    const elements = [];

    if (pi === 0) {
      elements.push(createQuestion("svgNote", {
        name: "intro_note",
        title: "Before you start",
        description: `This survey targets ${briefing.audience || "your audience"} and focuses on ${briefing.topic || "the selected topic"}.`,
        variant: "orbit"
      }));
    }

    for (let qi = elements.length; qi < questionsPerPage; qi++) {
      const type = selectedTypes[(pi + qi) % selectedTypes.length];
      const question = buildQuestionByType(type, briefing, pi, qi);

      if (briefing.conditionalLogic !== "none" && pi > 0 && qi === 0 && CONDITIONAL_TYPES.has(type)) {
        question.visibleIf = { question: "topic_overview", operator: "notEmpty" };
      }

      elements.push(question);
    }

    pages.push({
      id: `page_${pi + 1}`,
      title: pi === 0 ? "Context" : `Page ${pi + 1}`,
      description: pi === 0 ? `Briefing and context for ${briefing.topic || "the survey"}.` : "",
      elements: elements.slice(0, questionsPerPage)
    });
  }

  return normalizeSurvey({
    title: `${briefing.topic || "Generated"} survey`,
    description: briefing.objective || "Survey generated from a guided briefing.",
    pages
  });
}
