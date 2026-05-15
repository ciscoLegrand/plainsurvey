import { sanitizeBriefingPatch } from "./briefing.js";

export const CHAT_WINDOW_SIZE = 10;

export const BRIEFING_ORCHESTRATOR_PROMPT = [
  "Eres un entrevistador experto en diseno de encuestas, evaluaciones y assessments profesionales.",
  "Tu objetivo es descubrir el briefing completo a traves de una conversacion concisa y orientada al dominio.",
  "",
  "PRIORIDAD DE EXTRACCION (en orden):",
  "1. Detecta el ROL PROFESIONAL del creador (docente, medico, RRHH, investigador, product manager, etc.).",
  "2. Identifica el DOMINIO ESPECIFICO (ej: 'lengua extranjera B2 EOI', 'cardiologia pediatrica', 'onboarding SaaS').",
  "3. Infiere el TIPO DE ENCUESTA mas adecuado segun el contexto profesional.",
  "4. Completa el resto del briefing usando terminologia del sector del usuario.",
  "",
  "REGLAS:",
  "- Interpreta semanticamente. No dependas de keywords exactas.",
  "- Si el usuario describe un examen, evaluacion, test o comprension lectora -> surveyType=exam.",
  "- Usa el dominio para formular preguntas con terminologia tecnica del sector.",
  "- Genera un generationDirective DETALLADO con instrucciones de experto para el agente generador:",
  "  * Menciona el rol profesional, el dominio, terminologia especifica del campo.",
  "  * Indica el tipo de preguntas mas apropiadas para ese perfil profesional.",
  "  * Ajusta el nivel de especialidad (ej: 'nivel B2 MCER', 'evaluacion clinica de 360 grados').",
  "- Responde en el idioma del usuario.",
  "- Responde SIEMPRE como JSON valido sin markdown, sin texto fuera del JSON.",
  "",
  "JSON de respuesta (exacto):",
  "{",
  "  \"assistantReply\": \"mensaje natural orientado al dominio del usuario\",",
  "  \"briefingPatch\": {",
  "    \"topic\": \"\",",
  "    \"audience\": \"\",",
  "    \"objective\": \"\",",
  "    \"surveyType\": \"exam|satisfaction|nps|research|feedback|diagnostic\",",
  "    \"creatorRole\": \"rol profesional del creador ej: docente, medico, rrhh\",",
  "    \"domain\": \"dominio especializado ej: lengua extranjera B2 EOI\",",
  "    \"pagesCount\": 3,",
  "    \"questionsPerPage\": 4,",
  "    \"questionTypes\": [\"radio\", \"rating\"],",
  "    \"tone\": \"profesional\",",
  "    \"language\": \"espanol\"",
  "  },",
  "  \"nextAction\": \"ask_more|ready_to_generate|generate_now\",",
  "  \"generationDirective\": \"instrucciones detalladas con terminologia del dominio para el agente generador\"",
  "}",
  "Si no hay cambios concretos en el briefing usa briefingPatch como objeto vacio {}."
].join("\n");

export function extractJsonObject(rawText) {
  const text = String(rawText || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object found.");
  return text.slice(start, end + 1);
}

export function extractAssistantReplyPreview(rawText) {
  const text = String(rawText || "");
  const keyIndex = text.indexOf('"assistantReply"');
  if (keyIndex < 0) return "";

  const colonIndex = text.indexOf(":", keyIndex);
  if (colonIndex < 0) return "";

  let startQuote = -1;
  for (let index = colonIndex + 1; index < text.length; index += 1) {
    if (text[index] === '"') {
      startQuote = index + 1;
      break;
    }
  }
  if (startQuote < 0) return "";

  let result = "";
  let escaped = false;
  for (let index = startQuote; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') return result;
    result += char;
  }

  return result;
}

export function parseOrchestratorPayload(rawText) {
  const parsed = JSON.parse(extractJsonObject(rawText));
  const patch = sanitizeBriefingPatch(parsed?.briefingPatch || {});
  const reply = String(parsed?.assistantReply || "").trim();
  const nextAction = String(parsed?.nextAction || "ask_more").trim();
  const generationDirective = String(parsed?.generationDirective || "").trim();

  return {
    assistantReply: reply,
    briefingPatch: patch,
    nextAction: ["ask_more", "ready_to_generate", "generate_now"].includes(nextAction)
      ? nextAction
      : "ask_more",
    generationDirective
  };
}

export function buildOrchestratorMessages(briefing, chatHistory, userInput, triagedAgent = null) {
  const compactHistory = chatHistory.slice(-CHAT_WINDOW_SIZE).map((item) => ({
    role: item.role,
    content: item.content
  }));

  const contextParts = [
    "Briefing actual (JSON):",
    JSON.stringify(briefing)
  ];
  if (triagedAgent) {
    contextParts.push("", `Agente seleccionado por triage: ${triagedAgent.name} (${triagedAgent.label})`);
    contextParts.push("Orienta la conversacion y el generationDirective hacia las capacidades de este agente.");
  }
  if (briefing.creatorRole) {
    contextParts.push("", `Rol profesional del creador: ${briefing.creatorRole}`);
  }
  if (briefing.domain) {
    contextParts.push(`Dominio especializado: ${briefing.domain}`);
  }
  contextParts.push("", "Ultimo mensaje del usuario:", userInput);

  return [
    { role: "system", content: BRIEFING_ORCHESTRATOR_PROMPT },
    ...compactHistory,
    { role: "user", content: contextParts.join("\n") }
  ];
}
