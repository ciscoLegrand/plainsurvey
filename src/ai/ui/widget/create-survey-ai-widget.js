import { createSurveyAiRuntime } from "../../runtime/index.js";
import { createSurveyAgentSystem, buildFallbackSurvey } from "../../agents/index.js";
import { createSurveyPreview } from "../../../preview/index.js";
import { createDefaultBriefing, DEFAULT_MODEL, LOCAL_MODELS, resolveOptionModelValue } from "../../config/index.js";
import { detectCachedLocalModels } from "../../runtime/local-model-cache.js";
import { createTranslator, esWidgetLocale } from "../../locales/index.js";
import {
  mergeBriefingFromText,
  mergeBriefingPatch,
  isBriefingReady,
  nextMissingField,
  questionForField
} from "../../domain/briefing.js";
import {
  buildOrchestratorMessages,
  extractAssistantReplyPreview,
  parseOrchestratorPayload
} from "../../domain/orchestrator.js";
import { renderSurveyAiWidgetLayout, getWidgetElements } from "./layout.js";
import { createChatMessageLog } from "./chat-messages.js";
import { renderBriefingSummary } from "./summary.js";
import { renderModelOptions as renderModelSelectOptions } from "./model-options.js";

function interpolateStatus(node, text) {
  node.textContent = text;
}

function createInitialState(options) {
  return {
    runtime: null,
    survey: null,
    briefing: createDefaultBriefing(),
    chatHistory: [],
    generationDirective: "",
    isGenerating: false,
    selectedModel: options.model || DEFAULT_MODEL,
    cacheByModel: new Map(),
    cacheIdByModel: new Map(),
    cacheSourceByModel: new Map()
  };
}

export async function createSurveyAiWidget(options = {}) {
  const target = options.target;
  if (!target) throw new Error("createSurveyAiWidget requiere options.target");

  const t = createTranslator(options.localeMessages || esWidgetLocale);
  renderSurveyAiWidgetLayout(target, t);

  const state = createInitialState(options);
  const nodes = getWidgetElements(target);
  const chatLog = createChatMessageLog(nodes.chatNode, t);
  let activeStreamMessage = null;

  function showLoading(text) {
    nodes.loadingTextNode.textContent = text;
    nodes.loadingNode.hidden = false;
    nodes.loadingNode.classList.add("active");
  }

  function hideLoading() {
    nodes.loadingNode.hidden = true;
    nodes.loadingNode.classList.remove("active");
  }

  function renderSummary() {
    renderBriefingSummary({
      briefing: state.briefing,
      summaryNode: nodes.summaryNode,
      generateNode: nodes.generateNode
    });
  }

  function renderModelOptions(selectedValue = state.selectedModel) {
    renderModelSelectOptions({
      modelNode: nodes.modelNode,
      modelNoteNode: nodes.modelNoteNode,
      state,
      selectedValue,
      t
    });
  }

  function beginStreamingAssistantMessage(initialText = t("messages.analyzing")) {
    activeStreamMessage = chatLog.createStreamingMessage(initialText);
    return activeStreamMessage;
  }

  function updateStreamingAssistantMessage(text) {
    if (!activeStreamMessage) beginStreamingAssistantMessage(text);
    else activeStreamMessage.update(text);
  }

  function finalizeStreamingAssistantMessage(text) {
    if (!activeStreamMessage) {
      chatLog.addAssistantMessage(text);
      return;
    }

    const streamedText = activeStreamMessage.getText().trim();
    const finalText = String(text || "").trim();
    const shouldPreserveStream = streamedText
      && streamedText !== t("messages.streamingPlaceholder")
      && finalText
      && streamedText !== finalText;

    activeStreamMessage.finalize(shouldPreserveStream ? streamedText : finalText);
    activeStreamMessage = null;

    if (shouldPreserveStream) {
      chatLog.addAssistantMessage(finalText);
    }
  }

  function renderPreview(survey) {
    state.survey = survey;
    nodes.previewNode.replaceChildren();
    createSurveyPreview({
      target: nodes.previewNode,
      survey,
      preset: options.preset || "plain",
      locale: options.locale || "es"
    });
  }

  function openModal() {
    if (!state.survey) return;
    nodes.modalNode.hidden = false;
    nodes.modalCloseNode.focus();
  }

  function closeModal() {
    nodes.modalNode.hidden = true;
  }

  async function ensureRuntime() {
    if (state.runtime) return state.runtime;

    showLoading(t("messages.initializingModel"));
    const requestedModel = state.selectedModel || nodes.modelNode.value;
    const runtime = createSurveyAiRuntime({
      provider: options.provider,
      webllm: options.webllm,
      appConfig: options.appConfig,
      locale: options.locale || "es",
      model: requestedModel,
      onProgress(report) {
        const text = report?.text
          ? t("messages.loadingProgress", { text: report.text })
          : t("messages.loadingModel");
        showLoading(text);
      }
    });

    const info = await runtime.initialize();
    state.runtime = runtime;

    if (info?.model) {
      const selectedOptionModel = resolveOptionModelValue(info.model) || requestedModel;
      state.cacheByModel.set(selectedOptionModel, true);
      state.cacheIdByModel.set(selectedOptionModel, info.model);
      state.selectedModel = selectedOptionModel;
      renderModelOptions(selectedOptionModel);
    } else {
      state.cacheByModel.set(requestedModel, true);
      state.selectedModel = requestedModel;
      renderModelOptions(requestedModel);
    }

    const resolvedId = state.cacheIdByModel.get(state.selectedModel);
    nodes.modelNoteNode.textContent = resolvedId
      ? t("messages.loadedModelAs", { model: state.selectedModel, resolvedId })
      : t("messages.loadedModel", { model: state.selectedModel });
    hideLoading();
    return runtime;
  }

  async function inferBriefingTurnFromLlm(userText) {
    const runtime = await ensureRuntime();
    const triagedAgent = createSurveyAgentSystem(null).triage(state.briefing);
    const messages = buildOrchestratorMessages(state.briefing, state.chatHistory, userText, triagedAgent);
    let streamedReply = "";
    let lastGoodPreview = "";

    beginStreamingAssistantMessage(t("messages.streamingPlaceholder"));
    const rawReply = await runtime.provider.chat(messages, {
      onChunk(delta, partialText) {
        streamedReply = partialText || `${streamedReply}${delta || ""}`;
        const extracted = extractAssistantReplyPreview(streamedReply);
        if (extracted) {
          lastGoodPreview = extracted;
          updateStreamingAssistantMessage(lastGoodPreview);
        } else if (streamedReply) {
          updateStreamingAssistantMessage(streamedReply);
        }
        interpolateStatus(nodes.statusNode, t("messages.interpretingChars", { count: streamedReply.length }));
      }
    });

    let parsed = {
      assistantReply: "",
      briefingPatch: {},
      nextAction: "ask_more",
      generationDirective: ""
    };
    try {
      parsed = parseOrchestratorPayload(rawReply);
    } catch {
      parsed.assistantReply = extractAssistantReplyPreview(rawReply) || "";
    }

    state.briefing = mergeBriefingPatch(state.briefing, parsed.briefingPatch);
    const textFallback = mergeBriefingFromText({ ...state.briefing }, userText);
    const supplement = {};
    for (const field of ["topic", "audience", "objective", "surveyType"]) {
      if (!state.briefing[field] && textFallback[field]) supplement[field] = textFallback[field];
    }
    if (Object.keys(supplement).length > 0) {
      state.briefing = { ...state.briefing, ...supplement };
    }

    if (parsed.generationDirective) state.generationDirective = parsed.generationDirective;

    const missingField = nextMissingField(state.briefing);
    const fallbackReply = missingField
      ? questionForField(missingField)
      : t("messages.readyToGenerate");
    const finalReply = parsed.assistantReply || lastGoodPreview || extractAssistantReplyPreview(rawReply) || fallbackReply;

    finalizeStreamingAssistantMessage(finalReply);
    state.chatHistory.push({ role: "assistant", content: finalReply });

    return {
      assistantReply: finalReply,
      nextAction: missingField ? "ask_more" : parsed.nextAction
    };
  }

  async function inferBriefingTurn(userText) {
    try {
      return await inferBriefingTurnFromLlm(userText);
    } catch {
      hideLoading();
      state.briefing = mergeBriefingFromText(state.briefing, userText);
      const missingField = nextMissingField(state.briefing);
      const fallbackReply = missingField
        ? questionForField(missingField)
        : t("messages.fallbackComplete");
      finalizeStreamingAssistantMessage(fallbackReply);
      state.chatHistory.push({ role: "assistant", content: fallbackReply });
      return {
        assistantReply: fallbackReply,
        nextAction: missingField ? "ask_more" : "ready_to_generate"
      };
    }
  }

  async function runGenerationFlow(trigger = "manual") {
    if (state.isGenerating) return;

    const briefing = { ...createDefaultBriefing(), ...state.briefing };
    if (!isBriefingReady(briefing)) {
      interpolateStatus(nodes.statusNode, t("messages.needMoreContext"));
      const missing = nextMissingField(briefing);
      if (missing) {
        const question = questionForField(missing);
        chatLog.addAssistantMessage(question);
        state.chatHistory.push({ role: "assistant", content: question });
        activeStreamMessage = null;
      }
      return;
    }

    state.isGenerating = true;
    nodes.generateNode.disabled = true;
    nodes.chatSendNode.disabled = true;

    try {
      interpolateStatus(nodes.statusNode, t("messages.generating"));
      const runtime = await ensureRuntime();
      let streamed = "";
      let streamView = null;

      function handleChunk(delta, partialText) {
        streamed = partialText || `${streamed}${delta || ""}`;
        if (!streamView) streamView = chatLog.createStreamingMessage();
        streamView.update(streamed);
        interpolateStatus(nodes.statusNode, t("messages.generatingChars", { count: streamed.length }));
      }

      const agentSystem = createSurveyAgentSystem(runtime.provider);
      const result = await agentSystem.generate(briefing, state.generationDirective, { onChunk: handleChunk });
      const completionMessage = trigger === "auto"
        ? t("messages.generatedAuto", { agent: result.agent })
        : t("messages.generatedManual", { agent: result.agent });

      if (streamView) {
        const streamedText = streamView.getText().trim();
        streamView.finalize(streamedText || completionMessage);
        if (streamedText && streamedText !== completionMessage) {
          chatLog.addAssistantMessage(completionMessage);
        }
      } else {
        chatLog.addAssistantMessage(completionMessage);
      }
      state.chatHistory.push({ role: "assistant", content: completionMessage });

      renderPreview(result.survey);
      nodes.previewOpenNode.hidden = false;
      interpolateStatus(nodes.statusNode, t("messages.generatedStatus", { agent: result.agent }));
    } catch (error) {
      const fallback = buildFallbackSurvey(briefing);
      renderPreview(fallback);
      nodes.previewOpenNode.hidden = false;
      interpolateStatus(nodes.statusNode, t("messages.generationFailed", { error: error?.message || "desconocido" }));
    } finally {
      state.isGenerating = false;
      nodes.chatSendNode.disabled = false;
      renderSummary();
    }
  }

  const cache = await detectCachedLocalModels(LOCAL_MODELS);
  state.cacheByModel = cache.cacheByModel;
  state.cacheIdByModel = cache.cacheIdByModel;
  state.cacheSourceByModel = cache.cacheSourceByModel || new Map();
  renderModelOptions();
  renderSummary();

  const greeting = t("messages.greeting");
  chatLog.addAssistantMessage(greeting);
  state.chatHistory.push({ role: "assistant", content: greeting });

  nodes.modelNode.addEventListener("change", () => {
    const selectedModel = nodes.modelNode.value;
    state.selectedModel = selectedModel;
    state.runtime = null;
    renderModelOptions(selectedModel);
  });

  nodes.initNode.addEventListener("click", async () => {
    try {
      await ensureRuntime();
      interpolateStatus(nodes.statusNode, t("messages.providerReady"));
    } catch (error) {
      hideLoading();
      interpolateStatus(nodes.statusNode, t("messages.initError", { error: error?.message || "desconocido" }));
    }
  });

  nodes.chatSendNode.addEventListener("click", async () => {
    const text = String(nodes.chatInputNode.value || "").trim();
    if (!text) return;

    chatLog.addUserMessage(text);
    state.chatHistory.push({ role: "user", content: text });
    nodes.chatInputNode.value = "";
    interpolateStatus(nodes.statusNode, t("messages.interpreting"));
    nodes.chatSendNode.disabled = true;

    try {
      const turn = await inferBriefingTurn(text);
      renderSummary();

      const missing = nextMissingField(state.briefing);
      interpolateStatus(nodes.statusNode, missing
        ? t("messages.contextUpdated", { field: missing })
        : t("messages.briefingComplete"));

      if (turn.nextAction === "generate_now" && isBriefingReady(state.briefing)) {
        await runGenerationFlow("auto");
      }
    } catch (error) {
      interpolateStatus(nodes.statusNode, t("messages.turnError", { error: error?.message || "desconocido" }));
      activeStreamMessage = null;
    } finally {
      if (!state.isGenerating) nodes.chatSendNode.disabled = false;
    }
  });

  nodes.chatInputNode.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      nodes.chatSendNode.click();
    }
  });

  nodes.generateNode.addEventListener("click", async () => {
    await runGenerationFlow("manual");
  });

  nodes.previewOpenNode.addEventListener("click", openModal);
  nodes.modalCloseNode.addEventListener("click", closeModal);
  nodes.modalNode.addEventListener("click", (event) => {
    if (event.target === nodes.modalNode) closeModal();
  });
  nodes.modalNode.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  return {
    getSurvey: () => state.survey,
    getRuntime: () => state.runtime,
    getBriefing: () => ({ ...state.briefing })
  };
}
