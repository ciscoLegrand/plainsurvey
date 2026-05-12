import { createQuestion, createSurvey, normalizeSurvey } from "../../core/index.js";

export async function generateSurveyWithAi({ prompt = "", provider } = {}) {
  if (typeof provider !== "function") {
    return {
      ok: false,
      error: "AI provider unavailable.",
      survey: createSurveyFromPrompt(prompt)
    };
  }

  try {
    const result = await provider({ prompt });
    const survey = normalizeSurvey(result?.survey || result);
    return { ok: true, survey };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "AI provider failed.",
      survey: createSurveyFromPrompt(prompt)
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
