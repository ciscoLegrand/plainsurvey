import { el } from "../../../builder/dom.js";
import { DEFAULT_MODEL, LOCAL_MODELS } from "../../config/index.js";

export function renderModelOptions({ modelNode, modelNoteNode, state, selectedValue = state.selectedModel, t }) {
  const modelOptions = LOCAL_MODELS.map((model) => {
    const cached = state.cacheByModel.get(model.value);
    const suffix = cached ? " - instalado" : "";
    return el("option", { value: model.value, text: `${model.label}${suffix}` });
  });
  modelNode.replaceChildren(...modelOptions);

  const hasSelected = LOCAL_MODELS.some((model) => model.value === selectedValue);
  const fallbackModel = LOCAL_MODELS.some((model) => model.value === DEFAULT_MODEL)
    ? DEFAULT_MODEL
    : LOCAL_MODELS[0].value;
  modelNode.value = hasSelected ? selectedValue : fallbackModel;
  state.selectedModel = modelNode.value;

  const inCache = state.cacheByModel.get(state.selectedModel);
  const cacheId = state.cacheIdByModel.get(state.selectedModel);
  const source = state.cacheSourceByModel.get(state.selectedModel);
  modelNoteNode.textContent = inCache
    ? t("messages.selectedModelCached", {
      model: state.selectedModel,
      source: source ? ` via ${source}` : "",
      cacheId: cacheId ? ` como ${cacheId}` : ""
    })
    : t("messages.selectedModel", { model: state.selectedModel });
}
