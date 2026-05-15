/**
 * triage.js
 * Agente de triage: analiza el briefing y selecciona el agente
 * especializado más adecuado para la tarea.
 * Responsabilidad única: enrutamiento por topic/tipo de encuesta.
 */

/**
 * @param {Array} agents - Lista de agentes candidatos (ordenados por prioridad).
 *                         El último debe ser siempre el agente genérico de fallback.
 */
export function createTriageAgent(agents) {
  return {
    /**
     * Analiza el briefing y devuelve el agente más adecuado.
     * @param {object} briefing
     * @returns {object} Agente seleccionado
     */
    triage(briefing) {
      for (const agent of agents) {
        if (agent.canHandle(briefing)) return agent;
      }
      return agents[agents.length - 1]; // fallback al último (generic)
    },

    /**
     * Devuelve todos los agentes disponibles con información para UI.
     */
    listAgents() {
      return agents.map(({ name, label }) => ({ name, label }));
    }
  };
}
