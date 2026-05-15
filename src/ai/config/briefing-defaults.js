export const REQUIRED_FIELDS = [
  "topic",
  "audience",
  "objective",
  "surveyType",
  "pagesCount",
  "questionsPerPage"
];

export const SURVEY_TYPE_RULES = [
  { test: /\bexamen\b|\bexam\b|assessment|quiz|test|prueba|evaluaci[oó]n|evaluar|evalua/i, value: "exam" },
  { test: /\bnps\b|recomendac/i, value: "nps" },
  { test: /investig|research|mercado/i, value: "research" },
  { test: /feedback|operativ/i, value: "feedback" },
  { test: /diagnostic|diagn[oó]stico/i, value: "diagnostic" },
  { test: /satisfac/i, value: "satisfaction" }
];

export const PURPOSE_GUARD_RE = /encuesta|survey|briefing|cliente|audiencia|objetivo|pregunta|nps|satisfac|diagnost|feedback|investig|pagina|p[aá]gina/i;

export function createDefaultBriefing() {
  return {
    topic: "",
    audience: "",
    objective: "",
    surveyType: "",
    creatorRole: "",
    domain: "",
    pagesCount: 3,
    questionsPerPage: 4,
    questionTypes: ["text", "textarea", "radio", "rating"],
    autoAddQuestions: "some",
    scoredQuestions: "some",
    conditionalLogic: "some",
    language: "espanol",
    tone: "profesional"
  };
}
