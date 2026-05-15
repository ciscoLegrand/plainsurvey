import { createQuestion, createSurvey, normalizeSurvey } from "../core/index.js";

export async function generateSurveyWithAi({ prompt = "", provider, ...requestOptions } = {}) {
  const runtime = normalizeProvider(provider);

  if (!runtime) {
    return {
      ok: false,
      error: "AI provider unavailable.",
      survey: createSurveyFromPrompt(prompt)
    };
  }

  try {
    const result = await runtime.generateSurvey({ prompt, ...requestOptions });
    const survey = normalizeSurvey(result?.survey || result);
    return { ok: true, survey, runtime: runtime.describe?.() };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "AI provider failed.",
      survey: createSurveyFromPrompt(prompt),
      runtime: runtime.describe?.()
    };
  }
}

export function createSurveyFromPrompt(prompt = "") {
  const title = prompt.trim() ? `Survey about ${prompt.trim().slice(0, 60)}` : "Generated survey draft";
  return createSurvey({
    title,
    description: "Draft generated locally. Review questions before publishing.",
    pages: [
      {
        title: "Questions",
        elements: [
          createQuestion("text", {
            name: "main_feedback",
            title: prompt.trim() ? `What should we know about ${prompt.trim()}?` : "What should we know?"
          }),
          createQuestion("rating", {
            name: "overall_rating",
            title: "How would you rate the overall experience?",
            rateMin: 1,
            rateMax: 5
          })
        ]
      }
    ]
  });
}

function normalizeProvider(provider) {
  if (!provider) return null;
  if (typeof provider === "function") {
    return {
      generateSurvey: provider,
      chat: async (messages) => provider({ messages }),
      describe: () => ({ runtime: "function" })
    };
  }

  if (typeof provider.generateSurvey === "function") {
    return {
      generateSurvey: (input) => provider.generateSurvey(input),
      chat: typeof provider.chat === "function" ? (messages) => provider.chat(messages) : async () => "",
      initialize: typeof provider.initialize === "function" ? () => provider.initialize() : undefined,
      describe: typeof provider.describe === "function" ? () => provider.describe() : () => ({ runtime: "provider" })
    };
  }

  return null;
}
