/**
 * prompt-builder.js
 * Construye los prompts de sistema y de generación para diferentes
 * tipos de encuesta y contextos de agente.
 * Responsabilidad única: construcción de prompts reproducibles.
 */

/**
 * Prompt de sistema base. Cada agente puede extenderlo con su contexto.
 */
export function buildSurveySystemPrompt(briefing, extension = "") {
  const lines = [
    "You are a senior survey architect, interviewer and UX researcher.",
    "Act like a professional orientator: infer missing details conservatively.",
    "Return only valid JSON, no markdown, no explanation.",
    `Must generate at least ${briefing.pagesCount || 3} pages and ${briefing.questionsPerPage || 4} questions per page.`,
    "Never return a minimal 2-question survey.",
    "Use requested question types and expand support questions when autoAddQuestions is not none.",
    "Add scoring only to eligible closed-ended questions when requested.",
    "Add conditional logic only when requested and keep it consistent across the survey.",
    "The result must be ready to render and review in a survey builder."
  ];

  // Persona experta basada en rol profesional y dominio
  if (briefing.creatorRole || briefing.domain) {
    lines.push("");
    if (briefing.creatorRole && briefing.domain) {
      lines.push(`You are roleplaying as a professional ${briefing.creatorRole} specialized in ${briefing.domain}.`);
    } else if (briefing.creatorRole) {
      lines.push(`You are roleplaying as a professional ${briefing.creatorRole}.`);
    } else {
      lines.push(`You are generating content for the specialized domain: ${briefing.domain}.`);
    }
    lines.push("Design questions using precise terminology from this professional field.");
    lines.push("Avoid generic survey language — questions must reflect deep domain expertise.");
    lines.push("Use professional jargon, frameworks, standards and conventions specific to this domain.");
  }

  if (briefing.surveyType === "exam") {
    lines.push(
      "",
      "This is an academic exam, not a market survey.",
      "Respect the requested number of pages and questions exactly unless the user explicitly asks otherwise.",
      "Include answer keys or correctAnswer metadata for objective items.",
      "Preserve professional academic wording and avoid survey-style phrasing.",
      "If the briefing requests reading comprehension, include a passage and questions that test understanding of that passage."
    );
  }

  if (extension) lines.push("", extension);
  return lines.join("\n");
}

/**
 * Prompt de generación combinado con el briefing completo.
 */
export function buildSurveyGenerationPrompt(briefing, extraPrompt = "", systemExtension = "") {
  const parts = [
    buildSurveySystemPrompt(briefing, systemExtension),
    "",
    "Briefing JSON:",
    JSON.stringify(briefing, null, 2)
  ];
  if (extraPrompt) parts.push("", `Additional user instructions: ${extraPrompt}`);
  return parts.filter(Boolean).join("\n");
}

/**
 * Extrae texto útil de la respuesta del modelo (JSON embebido en texto).
 */
export function parseSurveyPayload(content) {
  const trimmed = String(content || "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(candidate);
}
