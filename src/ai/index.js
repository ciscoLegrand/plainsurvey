import { createSurveyAiChatbot } from "./chat/index.js";
import { createWebLLMProvider } from "./providers/webllm.js";
import { createSurveyFromPrompt, generateSurveyWithAi } from "./service.js";

export { createSurveyAiChatbot, createSurveyFromPrompt, createWebLLMProvider, generateSurveyWithAi };

export const SurveyAIGenerator = generateSurveyWithAi;

export function createSurveyAiRuntime(options = {}) {
	const provider = options.provider || createWebLLMProvider(options);
	const chatbot = createSurveyAiChatbot({ ...options, provider });

	return {
		provider,
		chatbot,
		initialize: () => chatbot.initialize(),
		generateSurvey: (prompt, overrides = {}) => chatbot.generateSurvey(prompt, overrides),
		sendMessage: (message, context = {}) => chatbot.sendMessage(message, context)
	};
}
