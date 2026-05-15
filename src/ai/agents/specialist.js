/**
 * specialist.js
 * Agentes especializados por tipo de encuesta.
 * Cada agente tiene: nombre, criterios de selección, preferencias de
 * tipos de pregunta y extensión de prompt específica.
 * Responsabilidad única: estrategia de generación por dominio.
 */
import { buildSurveyGenerationPrompt, parseSurveyPayload } from "./prompt-builder.js";
import { buildFallbackSurvey } from "./question-factory.js";
import { ensureSurveyDepth } from "./survey-expander.js";

// ─── Definición base de agente ────────────────────────────────────────────────

function defineAgent({ name, label, surveyTypes, keywords, preferredTypes, systemExtension }) {
  return {
    name,
    label,

    /** Comprueba si este agente es el más adecuado para el briefing. */
    canHandle(briefing) {
      if (surveyTypes.includes(briefing.surveyType)) return true;
      const topic = String(briefing.topic || "").toLowerCase();
      return keywords.some((kw) => topic.includes(kw));
    },

    /** Mezcla los tipos preferidos del agente con los del briefing. */
    resolveTypes(briefing) {
      const requested = Array.isArray(briefing.questionTypes) && briefing.questionTypes.length > 0
        ? briefing.questionTypes
        : preferredTypes;
      // Anteponer los tipos clave del agente que no estén ya incluidos
      const extras = preferredTypes.filter((t) => !requested.includes(t)).slice(0, 2);
      return [...extras, ...requested];
    },

    /** Ejecuta el agente: intenta el modelo y expande en caso de fallo. */
    async execute(briefing, provider, extraPrompt = "", hooks = {}) {
      const enhancedBriefing = { ...briefing, questionTypes: this.resolveTypes(briefing) };
      const prompt = buildSurveyGenerationPrompt(enhancedBriefing, extraPrompt, systemExtension);

      if (!provider) {
        const survey = buildFallbackSurvey(enhancedBriefing);
        return { ok: false, agent: name, survey, error: "No provider available — using local fallback." };
      }

      try {
        const result = await provider.generateSurvey({ prompt, onChunk: hooks.onChunk });
        const raw = result?.survey || result;
        const survey = ensureSurveyDepth(
          typeof raw === "string" ? parseSurveyPayload(raw) : raw,
          enhancedBriefing
        );
        return { ok: true, agent: name, survey };
      } catch (error) {
        const survey = ensureSurveyDepth(buildFallbackSurvey(enhancedBriefing), enhancedBriefing);
        return { ok: false, agent: name, survey, error: error?.message || "Agent execution failed." };
      }
    }
  };
}

// ─── Agentes especializados ───────────────────────────────────────────────────

export function createSatisfactionAgent() {
  return defineAgent({
    name: "satisfaction",
    label: "Satisfaction Survey",
    surveyTypes: ["satisfaction", "csat"],
    keywords: ["satisfaccion", "satisfaction", "customer", "onboarding", "experiencia", "experience"],
    preferredTypes: ["rating", "emojiScale", "radio", "text"],
    systemExtension: [
      "Focus on measuring satisfaction across key touchpoints.",
      "Include at least one NPS-style rating (0–10) and one open-ended question.",
      "Keep language empathetic and respondent-friendly."
    ].join("\n")
  });
}

export function createNPSAgent() {
  return defineAgent({
    name: "nps",
    label: "NPS / Recommendation",
    surveyTypes: ["nps"],
    keywords: ["nps", "recomendacion", "recommendation", "promoter", "detractor", "loyalty"],
    preferredTypes: ["rating", "radio", "textarea", "text"],
    systemExtension: [
      "Lead with an NPS question (0–10 scale: How likely are you to recommend?).",
      "Follow with questions that diagnose the drivers of the score.",
      "Include a verbatim open-ended question at the end."
    ].join("\n")
  });
}

export function createResearchAgent() {
  return defineAgent({
    name: "research",
    label: "Market Research",
    surveyTypes: ["research"],
    keywords: ["investigacion", "research", "mercado", "market", "estudio", "study", "analisis"],
    preferredTypes: ["radio", "checkbox", "matrix", "ranking", "text"],
    systemExtension: [
      "Design for analytical depth: use matrix and ranking questions to uncover preferences.",
      "Include demographic or segmentation questions early in the survey.",
      "Avoid leading language; keep questions neutral and hypothesis-free."
    ].join("\n")
  });
}

export function createFeedbackAgent() {
  return defineAgent({
    name: "feedback",
    label: "Operational Feedback",
    surveyTypes: ["feedback"],
    keywords: ["feedback", "opinion", "mejora", "improvement", "producto", "product", "servicio", "service"],
    preferredTypes: ["radio", "rating", "textarea", "boolean"],
    systemExtension: [
      "Focus on actionable feedback that teams can act on immediately.",
      "Use binary (yes/no) questions for quick triage, followed by open-ended elaboration.",
      "Prioritize brevity: keep the survey short and focused."
    ].join("\n")
  });
}

export function createDiagnosticAgent() {
  return defineAgent({
    name: "diagnostic",
    label: "Initial Diagnostic",
    surveyTypes: ["diagnostic"],
    keywords: ["diagnostico", "diagnostic", "baseline", "inicial", "initial", "audit", "auditoria"],
    preferredTypes: ["radio", "checkbox", "matrix", "dropdown", "text"],
    systemExtension: [
      "Design to establish a baseline across multiple dimensions.",
      "Use matrix questions to assess readiness or maturity levels.",
      "Include conditional follow-ups for areas flagged as weak."
    ].join("\n")
  });
}

export function createExamAgent() {
  return defineAgent({
    name: "exam",
    label: "Academic Exam",
    surveyTypes: ["exam"],
    keywords: ["examen", "exam", "assessment", "quiz", "test", "comprension lectora", "reading comprehension", "eoI", "eoie", "evaluacion", "evaluación"],
    preferredTypes: ["text", "radio", "textarea", "dropdown", "rating"],
    systemExtension: [
      "Generate an academic exam with strict formatting and clear instructions.",
      "If the topic indicates reading comprehension, include a reading passage of at least 400 words in the target language.",
      "Use exactly the requested number of pages and questions per page when provided.",
      "For multiple-choice items, include the correct answer in the payload so the builder can show answer keys on completion.",
      "Assign scoring consistently according to the briefing and keep the exam professional, clear and classroom-ready."
    ].join("\n")
  });
}

/** Agente genérico de fallback — se usa cuando ninguno hace match. */
export function createGenericAgent() {
  return defineAgent({
    name: "generic",
    label: "General Survey",
    surveyTypes: [],
    keywords: [],
    preferredTypes: ["text", "radio", "rating", "textarea"],
    systemExtension: "Design a well-structured, general-purpose survey matching the briefing."
  });
}
