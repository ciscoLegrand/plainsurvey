import { analyzeSurveyResponses } from "../../analytics/index.js";
import { createSurveyFromPrompt, generateSurveyWithAi } from "../service.js";

export function createSurveyAiChatbot(options = {}) {
  const history = [...(options.history || [])];
  const provider = options.provider;

  return {
    getHistory() {
      return [...history];
    },
    async initialize() {
      return provider?.initialize?.() || { runtime: "custom" };
    },
    async sendMessage(message, context = {}) {
      history.push({ role: "user", content: message });
      const reply = await provider.chat(buildMessages(history, context, options));
      history.push({ role: "assistant", content: reply });
      return reply;
    },
    async generateSurvey(prompt, overrides = {}) {
      const result = await generateSurveyWithAi({ prompt, provider, ...overrides });
      history.push({ role: "assistant", content: `Generated survey: ${result.survey.title}` });
      return result;
    },
    summarizeAnalysis({ survey, responses }) {
      const analysis = analyzeSurveyResponses({ survey, responses });
      return {
        analysis,
        summary: `${analysis.responseCount} responses across ${analysis.survey.questionCount} questions.`
      };
    },
    createDraft(prompt) {
      return createSurveyFromPrompt(prompt);
    }
  };
}

function buildMessages(history, context, options) {
  const systemPrompt = options.systemPrompt || "You help users design surveys and interpret survey analytics.";
  const extraContext = [];

  if (context.survey) {
    extraContext.push(`Survey title: ${context.survey.title || "Untitled survey"}`);
  }
  if (context.analysis) {
    extraContext.push(`Responses: ${context.analysis.responseCount}`);
  }

  return [
    { role: "system", content: [systemPrompt, ...extraContext].join("\n") },
    ...history
  ];
}
