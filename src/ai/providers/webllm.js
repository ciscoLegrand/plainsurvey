export function createWebLLMProvider(options = {}) {
  const runtime = createRuntime(options);

  return {
    async initialize() {
      await runtime.ensureEngine();
      return runtime.state();
    },
    async generateSurvey({ prompt }) {
      const engine = await runtime.ensureEngine();
      const completion = await engine.chat.completions.create({
        messages: surveyPromptMessages(prompt, options),
        temperature: options.temperature ?? 0.2
      });
      return parseSurveyPayload(completion?.choices?.[0]?.message?.content || "", options.jsonrepair);
    },
    async chat(messages = []) {
      const engine = await runtime.ensureEngine();
      const completion = await engine.chat.completions.create({
        messages,
        temperature: options.temperature ?? 0.4
      });
      return completion?.choices?.[0]?.message?.content || "";
    }
  };
}

function createRuntime(options) {
  let enginePromise;

  async function loadWebLLM() {
    if (options.webllm) return options.webllm;
    return import("@mlc-ai/web-llm");
  }

  return {
    async ensureEngine() {
      if (!enginePromise) {
        enginePromise = (async () => {
          if (typeof navigator !== "undefined" && !navigator.gpu) {
            throw new Error("WebGPU is required for the local AI runtime.");
          }
          const webllm = await loadWebLLM();
          const engine = await webllm.CreateMLCEngine(options.model || "Llama-3.2-3B-Instruct-q4f16_1", {
            initProgressCallback: options.onProgress
          });
          return engine;
        })();
      }
      return enginePromise;
    },
    state() {
      return {
        model: options.model || "Llama-3.2-3B-Instruct-q4f16_1",
        runtime: "webllm"
      };
    }
  };
}

function surveyPromptMessages(prompt, options) {
  const systemPrompt = options.systemPrompt || "You are a survey design assistant. Return only valid JSON with title, description and pages[].";
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Create a survey for: ${prompt}` }
  ];
}

function parseSurveyPayload(content, jsonrepairModule) {
  const candidate = extractJson(content);
  try {
    return JSON.parse(candidate);
  } catch {
    if (!jsonrepairModule?.jsonrepair) {
      throw new Error("The AI response did not contain valid JSON.");
    }
    return JSON.parse(jsonrepairModule.jsonrepair(candidate));
  }
}

function extractJson(content) {
  const trimmed = String(content || "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}
