export const esWidgetLocale = {
  labels: {
    app: "Asistente IA para crear encuestas",
    providerConfig: "Configuracion de proveedor y modelo",
    provider: "Proveedor",
    providerAria: "Proveedor de IA",
    localProvider: "Local WebLLM",
    model: "Modelo",
    modelAria: "Modelo de IA",
    initialize: "Inicializar",
    initializeAria: "Inicializar modelo seleccionado",
    preview: "Ver preview",
    previewAria: "Abrir preview de encuesta generada",
    chatRegion: "Chatbot de briefing",
    chatTitle: "Chatbot de briefing",
    chatDescription: "Define contexto, audiencia y objetivo para generar una encuesta consistente.",
    chatInputPlaceholder: "Escribe el contexto de tu encuesta...",
    chatInputAria: "Mensaje para el asistente de briefing",
    send: "Enviar",
    sendAria: "Enviar mensaje al asistente",
    generate: "Generar encuesta IA",
    generateAria: "Generar encuesta con inteligencia artificial",
    summaryRegion: "Resumen del briefing",
    summaryTitle: "Resumen",
    modalTitle: "Preview de encuesta",
    closePreview: "Cerrar preview",
    user: "Tu",
    assistant: "Asistente",
    copy: "Copiar",
    copied: "Copiado",
    unavailable: "No disponible",
    copyAssistant: "Copiar respuesta del asistente"
  },
  messages: {
    loadingInitial: "Inicializando...",
    ready: "Listo para iniciar briefing.",
    greeting: "Hola. Te ayudo a definir y generar una encuesta profesional. Cuentame brevemente el contexto y yo guio el resto.",
    analyzing: "Analizando contexto...",
    streamingPlaceholder: "...",
    readyToGenerate: "Tengo briefing suficiente para crear una encuesta profesional. Puedes generarla ahora.",
    fallbackComplete: "Briefing completo. Ya puedo generar una encuesta profesional.",
    needMoreContext: "Necesito un poco mas de contexto antes de generar la encuesta.",
    interpreting: "Interpretando contexto y refinando briefing...",
    contextUpdated: "Contexto actualizado. Falta precisar: {field}",
    briefingComplete: "Briefing completo. Listo para generar.",
    providerReady: "Proveedor local listo.",
    initError: "Error al inicializar: {error}",
    turnError: "No pude interpretar este turno: {error}",
    initializingModel: "Inicializando modelo local...",
    loadingModel: "Cargando modelo...",
    loadingProgress: "Cargando: {text}",
    selectedModel: "Modelo seleccionado: {model}",
    selectedModelCached: "Modelo seleccionado: {model} (instalado{source}{cacheId})",
    loadedModel: "Modelo cargado: {model}",
    loadedModelAs: "Modelo cargado: {model} como {resolvedId}",
    interpretingChars: "Interpretando contexto... {count} chars",
    generating: "Generando encuesta profesional (stream)...",
    generatingChars: "Generando encuesta (stream): {count} chars",
    generatedAuto: "He generado automaticamente la encuesta con {agent}. Usa Ver preview para revisarla.",
    generatedManual: "Encuesta generada con {agent}. Usa Ver preview para abrir el modal.",
    generatedStatus: "Encuesta generada con agente: {agent}",
    generationFailed: "No se pudo generar con IA: {error}"
  }
};

export function createTranslator(locale = esWidgetLocale) {
  return function t(path, replacements = {}) {
    const value = path.split(".").reduce((current, key) => current?.[key], locale) || path;
    return String(value).replace(/\{(\w+)\}/g, (_, key) => replacements[key] ?? "");
  };
}
