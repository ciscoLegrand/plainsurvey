import { createSurveyAiChatbot } from "../chat/index.js";
import { createWebLLMProvider } from "../providers/webllm.js";

export function createSurveyAiRuntime(options = {}) {
  const provider = options.provider || createWebLLMProvider(options);
  const chatbot = createSurveyAiChatbot({ ...options, provider });

  return {
    provider,
    chatbot,
    initialize: () => chatbot.initialize(),
    generateSurvey: (prompt, overrides = {}) => chatbot.generateSurvey(prompt, overrides),
    sendMessage: (message, context = {}, hooks = {}) => chatbot.sendMessage(message, context, hooks)
  };
}
