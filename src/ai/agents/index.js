/**
 * src/ai/agents/index.js
 * Sistema de agentes para generación de encuestas.
 *
 * Flujo:
 *   createSurveyAgentSystem(provider)
 *     → .generate(briefing, extraPrompt?)   — triage + ejecución
 *     → .triage(briefing)                   — solo selección de agente
 *     → .agents                             — lista de agentes disponibles
 *
 * Los agentes delegan en question-factory cuando el modelo no está disponible.
 */
import { createTriageAgent } from "./triage.js";
import {
  createSatisfactionAgent,
  createNPSAgent,
  createResearchAgent,
  createFeedbackAgent,
  createDiagnosticAgent,
  createExamAgent,
  createGenericAgent
} from "./specialist.js";

export { buildFallbackSurvey, buildQuestionByType, buildQuestionWithScoring } from "./question-factory.js";
export { ensureSurveyDepth } from "./survey-expander.js";
export { buildSurveySystemPrompt, buildSurveyGenerationPrompt, parseSurveyPayload } from "./prompt-builder.js";
export { createTriageAgent } from "./triage.js";
export {
  createSatisfactionAgent,
  createNPSAgent,
  createResearchAgent,
  createFeedbackAgent,
  createDiagnosticAgent,
  createExamAgent,
  createGenericAgent
} from "./specialist.js";

/**
 * Crea el sistema de agentes completo con triage automático.
 *
 * @param {object|null} provider - Proveedor de IA compatible con .generateSurvey()
 * @returns {{ generate, triage, agents }}
 */
export function createSurveyAgentSystem(provider = null) {
  const agents = [
    createExamAgent(),
    createSatisfactionAgent(),
    createNPSAgent(),
    createResearchAgent(),
    createFeedbackAgent(),
    createDiagnosticAgent(),
    createGenericAgent()
  ];

  const triageAgent = createTriageAgent(agents);

  return {
    /** Lista de agentes disponibles con { name, label } */
    agents: triageAgent.listAgents(),

    /**
     * Selecciona el agente más adecuado sin ejecutar.
     * @param {object} briefing
     * @returns {{ name, label }}
     */
    triage(briefing) {
      const agent = triageAgent.triage(briefing);
      return { name: agent.name, label: agent.label };
    },

    /**
     * Ejecuta el triage y genera la encuesta con el agente seleccionado.
     * @param {object} briefing - Briefing completo del usuario
     * @param {string} [extraPrompt] - Instrucciones adicionales opcionales
     * @returns {Promise<{ ok, agent, survey, error? }>}
     */
    async generate(briefing, extraPrompt = "", hooks = {}) {
      const agent = triageAgent.triage(briefing);
      return agent.execute(briefing, provider, extraPrompt, hooks);
    }
  };
}
