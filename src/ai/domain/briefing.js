import { REQUIRED_FIELDS, SURVEY_TYPE_RULES, createDefaultBriefing } from "../config/index.js";

const ALLOWED_QUESTION_TYPES = new Set([
  "text",
  "textarea",
  "radio",
  "checkbox",
  "dropdown",
  "rating",
  "emojiScale",
  "ranking",
  "matrix",
  "boolean"
]);

function clampInteger(value, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function cleanText(value, maxLength = 280) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.slice(0, maxLength);
}

export function nextMissingField(briefing) {
  return REQUIRED_FIELDS.find((key) => {
    const value = briefing[key];
    if (typeof value === "number") return !Number.isFinite(value) || value <= 0;
    return !String(value || "").trim();
  });
}

export function isBriefingReady(briefing) {
  return !nextMissingField(briefing);
}

function parseSurveyType(input) {
  for (const rule of SURVEY_TYPE_RULES) {
    if (rule.test.test(input)) return rule.value;
  }
  return "";
}

function normalizeSurveyType(value) {
  const raw = cleanText(value, 40).toLowerCase();
  if (!raw) return "";

  const exact = SURVEY_TYPE_RULES.find((rule) => rule.value === raw);
  if (exact) return exact.value;

  return parseSurveyType(raw);
}

function normalizeQuestionTypes(value) {
  if (!Array.isArray(value)) return undefined;
  const next = value
    .map((entry) => cleanText(entry, 24))
    .filter(Boolean)
    .filter((entry) => ALLOWED_QUESTION_TYPES.has(entry));

  if (!next.length) return undefined;
  return [...new Set(next)].slice(0, 6);
}

export function sanitizeBriefingPatch(patch) {
  const source = patch && typeof patch === "object" ? patch : {};
  const next = {};

  if ("topic" in source) next.topic = cleanText(source.topic, 200);
  if ("audience" in source) next.audience = cleanText(source.audience, 180);
  if ("objective" in source) next.objective = cleanText(source.objective, 220);
  if ("creatorRole" in source) next.creatorRole = cleanText(source.creatorRole, 80);
  if ("domain" in source) next.domain = cleanText(source.domain, 160);
  if ("surveyType" in source) {
    const normalizedType = normalizeSurveyType(source.surveyType);
    if (normalizedType) next.surveyType = normalizedType;
  }
  if ("pagesCount" in source) next.pagesCount = clampInteger(source.pagesCount, 1, 12);
  if ("questionsPerPage" in source) next.questionsPerPage = clampInteger(source.questionsPerPage, 1, 12);
  if ("language" in source) next.language = cleanText(source.language, 32);
  if ("tone" in source) next.tone = cleanText(source.tone, 48);

  const questionTypes = normalizeQuestionTypes(source.questionTypes);
  if (questionTypes) next.questionTypes = questionTypes;

  return next;
}

export function mergeBriefingPatch(currentBriefing, patch) {
  const base = { ...createDefaultBriefing(), ...currentBriefing };
  const sanitizedPatch = sanitizeBriefingPatch(patch);
  return { ...base, ...sanitizedPatch };
}

export function mergeBriefingFromText(currentBriefing, text) {
  const next = { ...createDefaultBriefing(), ...currentBriefing };
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  const inferred = {};

  const topicMatch = raw.match(/(?:tema|sobre)\s*[:\-]?\s*([^\.\n]+)/i);
  if (topicMatch?.[1]) inferred.topic = topicMatch[1].trim();

  const audienceMatch = raw.match(/(?:audiencia|para)\s*[:\-]?\s*([^\.\n]+)/i);
  if (audienceMatch?.[1]) inferred.audience = audienceMatch[1].trim();

  const objectiveMatch = raw.match(/(?:objetivo|resultado|meta)\s*[:\-]?\s*([^\.\n]+)/i);
  if (objectiveMatch?.[1]) inferred.objective = objectiveMatch[1].trim();

  const competencyMatch = raw.match(/(?:quiero\s+)?evaluar\s+(.+?)(?:\s+(?:de|para)\s+(?:los|las|el|la)?\s*([^\.\n]+))?$/i);
  if (competencyMatch?.[1]) {
    const competencyTopic = competencyMatch[1].trim();
    inferred.objective ||= `evaluar ${competencyTopic}`;
    inferred.topic ||= competencyTopic;
  }
  if (competencyMatch?.[2]) {
    inferred.audience ||= competencyMatch[2].trim();
  }

  const pagesMatch = raw.match(/(\d{1,2})\s*(?:paginas|p[aá]ginas|pages)/i);
  if (pagesMatch?.[1]) inferred.pagesCount = Number.parseInt(pagesMatch[1], 10);

  const qppMatch = raw.match(/(\d{1,2})\s*(?:preguntas\s*(?:por\s*p[aá]gina|\/\s*p[aá]gina)|questions\s*per\s*page)/i);
  if (qppMatch?.[1]) inferred.questionsPerPage = Number.parseInt(qppMatch[1], 10);

  const surveyType = parseSurveyType(lower);
  if (surveyType) inferred.surveyType = surveyType;

  if (!next.topic && !inferred.topic && /onboarding|retencion|satisfaccion|soporte|producto|servicio|nps|mercado|examen|exam|assessment|quiz|test|prueba/i.test(lower)) {
    inferred.topic = raw;
  }

  if (!inferred.surveyType && /\bexamen\b|\bexam\b|assessment|quiz|test|prueba/i.test(lower)) {
    inferred.surveyType = "exam";
  }

  return mergeBriefingPatch(next, inferred);
}

export function questionForField(field) {
  switch (field) {
    case "topic":
      return "¿Cual es el tema principal de la encuesta?";
    case "audience":
      return "¿Quien respondera esta encuesta?";
    case "objective":
      return "¿Que decision quieres tomar con los resultados?";
    case "surveyType":
      return "¿Que tipo de encuesta necesitas? (exam, satisfaction, nps, research, feedback, diagnostic)";
    case "creatorRole":
      return "¿Cual es tu rol profesional? (docente, medico, investigador, RRHH, product manager…)";
    case "domain":
      return "¿En que dominio o especialidad se enmarca esta encuesta?";
    case "pagesCount":
      return "¿Cuantas paginas quieres (1-12)?";
    case "questionsPerPage":
      return "¿Cuantas preguntas por pagina (1-12)?";
    default:
      return "Perfecto, briefing completo. Ya puedes generar encuesta IA.";
  }
}

export function summarizeBriefing(briefing) {
  const rows = [
    ["Tema", briefing.topic || "-"],
    ["Audiencia", briefing.audience || "-"],
    ["Objetivo", briefing.objective || "-"],
    ["Tipo", briefing.surveyType || "-"],
    ["Paginas", String(briefing.pagesCount || "-")],
    ["Preguntas/pagina", String(briefing.questionsPerPage || "-")]
  ];
  if (briefing.creatorRole) rows.push(["Rol creador", briefing.creatorRole]);
  if (briefing.domain) rows.push(["Dominio", briefing.domain]);
  return rows;
}
