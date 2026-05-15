export function createWebLLMProvider(options = {}) {
  const runtime = createRuntime(options);

  return {
    async initialize() {
      await runtime.ensureEngine();
      return runtime.state();
    },
    async generateSurvey({ prompt, onChunk }) {
      const engine = await runtime.ensureEngine();

      if (typeof onChunk === "function") {
        const stream = await engine.chat.completions.create({
          messages: surveyPromptMessages(prompt, options),
          temperature: options.temperature ?? 0.2,
          stream: true
        });

        let streamedContent = "";
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content || "";
          if (!delta) continue;
          streamedContent += delta;
          onChunk(delta, streamedContent);
        }

        return parseSurveyPayload(streamedContent, options.jsonrepair);
      }

      const completion = await engine.chat.completions.create({
        messages: surveyPromptMessages(prompt, options),
        temperature: options.temperature ?? 0.2
      });
      return parseSurveyPayload(completion?.choices?.[0]?.message?.content || "", options.jsonrepair);
    },
    async chat(messages = [], chatOptions = {}) {
      const engine = await runtime.ensureEngine();

      const request = {
        messages,
        temperature: chatOptions.temperature ?? options.temperature ?? 0.4
      };

      if (typeof chatOptions.onChunk === "function") {
        const stream = await engine.chat.completions.create({
          ...request,
          stream: true
        });

        let streamedContent = "";
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content || "";
          if (!delta) continue;
          streamedContent += delta;
          chatOptions.onChunk(delta, streamedContent, chunk);
        }

        return streamedContent;
      }

      const completion = await engine.chat.completions.create(request);
      return completion?.choices?.[0]?.message?.content || "";
    }
  };
}

function createRuntime(options) {
  let enginePromise;
  let selectedModel = options.model || null;

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
          const appConfig = options.appConfig || webllm.prebuiltAppConfig;
          selectedModel = resolveModelId(options.model, appConfig, webllm);
          const engine = await webllm.CreateMLCEngine(selectedModel, {
            appConfig,
            initProgressCallback: options.onProgress
          });
          return engine;
        })();
      }
      return enginePromise;
    },
    state() {
      return {
        model: selectedModel || options.model || "unknown",
        runtime: "webllm"
      };
    }
  };
}

function resolveModelId(requestedModel, appConfig, webllm) {
  const models = Array.isArray(appConfig?.model_list) ? appConfig.model_list : [];
  const availableIds = models.map((entry) => entry?.model_id).filter(Boolean);

  if (requestedModel && availableIds.includes(requestedModel)) {
    return requestedModel;
  }

  if (requestedModel) {
    const req = String(requestedModel).toLowerCase();
    const normalizedReq = req.replace(/[^a-z0-9]+/g, "");
    const fuzzyMatch = availableIds.find((id) => {
      const low = id.toLowerCase();
      const normalizedId = low.replace(/[^a-z0-9]+/g, "");
      return low.includes(req) || req.includes(low) || normalizedId.includes(normalizedReq) || normalizedReq.includes(normalizedId);
    });
    if (fuzzyMatch) return fuzzyMatch;
  }

  const preferredHints = [
    "Llama-3.2-3B",
    "Llama-3.1-8B",
    "Phi-3",
    "Qwen2",
    "Mistral"
  ];

  for (const hint of preferredHints) {
    const match = availableIds.find((id) => id.includes(hint));
    if (match) return match;
  }

  if (availableIds.length > 0) {
    return availableIds[0];
  }

  if (requestedModel) return requestedModel;
  if (webllm?.modelLibURLPrefix) {
    throw new Error("No WebLLM models available in appConfig.model_list.");
  }
  throw new Error("Unable to resolve a WebLLM model ID.");
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
