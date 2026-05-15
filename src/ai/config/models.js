export const DEFAULT_MODEL = "Llama-3.2-3B-Instruct-q4f16_1";

export const LOCAL_MODELS = [
  { value: "Qwen2.5-0.5B-Instruct-q4f16_1", label: "Qwen 2.5 0.5B" },
  { value: "Qwen2.5-1.5B-Instruct-q4f16_1", label: "Qwen 2.5 1.5B" },
  { value: "Qwen2.5-3B-Instruct-q4f16_1", label: "Qwen 2.5 3B" },
  { value: "Llama-3.2-1B-Instruct-q4f16_1", label: "Llama 3.2 1B" },
  { value: "Llama-3.2-3B-Instruct-q4f16_1", label: "Llama 3.2 3B" },
  { value: "Phi-3.5-mini-instruct-q4f16_1", label: "Phi-3.5 Mini" }
];

export function normalizeModelKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function resolveOptionModelValue(modelId, models = LOCAL_MODELS) {
  const target = normalizeModelKey(modelId);
  if (!target) return null;

  const exact = models.find((model) => model.value === modelId);
  if (exact) return exact.value;

  const fuzzy = models.find((model) => {
    const key = normalizeModelKey(model.value);
    return key.includes(target) || target.includes(key);
  });

  return fuzzy ? fuzzy.value : null;
}
