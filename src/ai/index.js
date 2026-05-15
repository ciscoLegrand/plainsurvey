import { createSurveyAiChatbot } from "./chat/index.js";
import { createWebLLMProvider } from "./providers/webllm.js";
import { createSurveyFromPrompt, generateSurveyWithAi } from "./service.js";
import { createSurveyAiRuntime } from "./runtime/index.js";

export { createSurveyAiChatbot, createSurveyFromPrompt, createWebLLMProvider, generateSurveyWithAi };
export { createSurveyAiRuntime };
export { createSurveyAiWidget } from "./ui/widget/create-survey-ai-widget.js";
export { createSurveyInsightConsultant } from "./ui/insight-consultant.js";

// Shared AI building blocks
export { DEFAULT_MODEL, LOCAL_MODELS, createDefaultBriefing } from "./config/index.js";
export {
  isBriefingReady,
  mergeBriefingFromText,
  mergeBriefingPatch,
  nextMissingField,
  questionForField,
  sanitizeBriefingPatch,
  summarizeBriefing
} from "./domain/briefing.js";
export {
  buildOrchestratorMessages,
  extractAssistantReplyPreview,
  parseOrchestratorPayload
} from "./domain/orchestrator.js";
export { detectCachedLocalModels } from "./runtime/local-model-cache.js";
export { createTranslator, esWidgetLocale } from "./locales/index.js";
export { insightConsultantLocales } from "./locales/insight-consultant/index.js";

// Agent system
export { createSurveyAgentSystem } from "./agents/index.js";
export { buildFallbackSurvey, buildQuestionByType } from "./agents/index.js";
export { ensureSurveyDepth } from "./agents/index.js";
export { buildSurveySystemPrompt, buildSurveyGenerationPrompt, parseSurveyPayload } from "./agents/index.js";

export const SurveyAIGenerator = generateSurveyWithAi;
