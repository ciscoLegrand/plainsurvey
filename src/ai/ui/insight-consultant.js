import { buildConsultantReport } from "../../analysis/index.js";
import { createTranslator } from "../../shared/i18n/index.js";
import { DEFAULT_MODEL, LOCAL_MODELS, resolveOptionModelValue } from "../config/index.js";
import { insightConsultantLocales } from "../locales/insight-consultant/index.js";
import { createTranslator as createAiWidgetTranslator, esWidgetLocale } from "../locales/index.js";
import { createSurveyAiRuntime } from "../runtime/index.js";
import { detectCachedLocalModels } from "../runtime/local-model-cache.js";
import { renderModelOptions } from "./widget/model-options.js";

export async function createSurveyInsightConsultant({ target, datasets = [], locale = "en", messages = insightConsultantLocales, labels = {}, provider, webllm, appConfig, model = DEFAULT_MODEL } = {}) {
	if (!target) throw new Error("createSurveyInsightConsultant requires a target element.");
	const t = createTranslator({ locale, fallbackLocale: "en", messages, overrides: labels });
	const modelT = createAiWidgetTranslator(esWidgetLocale);
	const state = {
		datasets,
		selectedDatasetId: datasets[0]?.id,
		lastQuestion: t("defaultPrompt"),
		runtime: null,
		selectedModel: model,
		cacheByModel: new Map(),
		cacheIdByModel: new Map(),
		cacheSourceByModel: new Map()
	};

	target.innerHTML = `
		<section class="ps-insight-consultant">
			<section class="ps-ia-config-row" aria-label="Configuracion de proveedor y modelo">
				<div class="ps-ia-config-top">
					<label class="ps-ia-config-field">
						<span>${escapeHtml(t("provider"))}</span>
						<select class="ps-builder-select" data-ai-provider>
							<option value="local">${escapeHtml(t("localProvider"))}</option>
						</select>
					</label>
					<label class="ps-ia-config-field">
						<span>${escapeHtml(t("model"))}</span>
						<select class="ps-builder-select" data-ai-model></select>
					</label>
					<button class="button button-primary" type="button" data-ai-init>${escapeHtml(t("initialize"))}</button>
				</div>
				<div class="ps-ia-config-meta">
					<div class="ps-ia-loading-indicator" data-ai-loading hidden><span class="ps-ia-spinner" aria-hidden="true"></span><span data-ai-loading-text>${escapeHtml(t("initializing"))}</span></div>
					<div class="ps-ia-agent-info" data-ai-model-note role="status" aria-live="polite"></div>
				</div>
			</section>
			<header>
				<div>
					<p class="ps-insight-kicker">${escapeHtml(t("kicker"))}</p>
					<h2>${escapeHtml(t("title"))}</h2>
					<p>${escapeHtml(t("description"))}</p>
				</div>
				<label>${escapeHtml(t("dataset"))}<select class="ps-builder-select" data-ai-dataset></select></label>
			</header>
			<div class="ps-insight-actions">
				<button class="ps-button ps-button-secondary" type="button" data-ai-prompt="resume">${escapeHtml(t("summary"))}</button>
				<button class="ps-button ps-button-secondary" type="button" data-ai-prompt="riesgos">${escapeHtml(t("risks"))}</button>
				<button class="ps-button ps-button-secondary" type="button" data-ai-prompt="acciones">${escapeHtml(t("actions"))}</button>
			</div>
			<form class="ps-insight-form" data-ai-form>
				<input class="ps-input" data-ai-question placeholder="${escapeHtml(t("placeholder"))}" />
				<button class="ps-button ps-button-primary" type="submit">${escapeHtml(t("submit"))}</button>
			</form>
			<div class="ps-insight-report" data-ai-report></div>
		</section>
	`;

	const datasetSelect = target.querySelector("[data-ai-dataset]");
	const reportNode = target.querySelector("[data-ai-report]");
	const inputNode = target.querySelector("[data-ai-question]");
	const modelNode = target.querySelector("[data-ai-model]");
	const modelNoteNode = target.querySelector("[data-ai-model-note]");
	const loadingNode = target.querySelector("[data-ai-loading]");
	const loadingTextNode = target.querySelector("[data-ai-loading-text]");
	const initNode = target.querySelector("[data-ai-init]");

	const cache = await detectCachedLocalModels(LOCAL_MODELS);
	state.cacheByModel = cache.cacheByModel;
	state.cacheIdByModel = cache.cacheIdByModel;
	state.cacheSourceByModel = cache.cacheSourceByModel || new Map();
	renderModelOptions({ modelNode, modelNoteNode, state, selectedValue: state.selectedModel, t: modelT });

	datasetSelect.innerHTML = datasets.map((dataset) => `<option value="${escapeHtml(dataset.id)}">${escapeHtml(dataset.label)}</option>`).join("");
	datasetSelect.value = state.selectedDatasetId;

	function selectedDataset() {
		return state.datasets.find((dataset) => dataset.id === state.selectedDatasetId) || state.datasets[0];
	}

	function setLoading(text, active = true) {
		loadingTextNode.textContent = text;
		loadingNode.hidden = !active;
		loadingNode.classList.toggle("active", active);
	}

	async function ensureRuntime() {
		if (state.runtime) return state.runtime;
		const requestedModel = state.selectedModel || modelNode.value;
		setLoading(t("initializingModel"));
		const runtime = createSurveyAiRuntime({
			provider,
			webllm,
			appConfig,
			locale,
			model: requestedModel,
			onProgress(report) {
				setLoading(report?.text ? t("loadingProgress", { text: report.text }) : t("loadingModel"));
			}
		});
		const info = await runtime.initialize();
		state.runtime = runtime;
		const selectedOptionModel = resolveOptionModelValue(info?.model) || requestedModel;
		state.cacheByModel.set(selectedOptionModel, true);
		if (info?.model) state.cacheIdByModel.set(selectedOptionModel, info.model);
		state.selectedModel = selectedOptionModel;
		renderModelOptions({ modelNode, modelNoteNode, state, selectedValue: selectedOptionModel, t: modelT });
		setLoading("", false);
		return runtime;
	}

	async function renderReport(question = state.lastQuestion) {
		state.lastQuestion = question;
		const dataset = selectedDataset();
		if (!dataset) return;
		const report = buildConsultantReport(dataset, question, { locale });
		let aiText = "";
		if (state.runtime) {
			reportNode.setAttribute("aria-busy", "true");
			const runtime = await ensureRuntime();
			aiText = await runtime.provider.chat(buildInsightMessages(dataset, report, question), { temperature: 0.2 });
			reportNode.removeAttribute("aria-busy");
		}
		reportNode.innerHTML = `
			<div class="ps-insight-report-head">
				<div><p class="ps-insight-kicker">${escapeHtml(dataset.domain || t("defaultDomain"))}</p><h3>${escapeHtml(report.title)}</h3></div>
				<strong>${dataset.valuation.score}/100</strong>
			</div>
			${aiText ? `<div class="ps-insight-ai-answer"><h4>${escapeHtml(t("aiAnswer"))}</h4><p>${escapeHtml(aiText)}</p></div>` : ""}
			<div class="ps-insight-summary">${report.summary.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
			<h4>${escapeHtml(t("evidence"))}</h4>
			<ul>${report.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
			<h4>${escapeHtml(t("validity"))}</h4>
			<ul>${report.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
		`;
	}

	initNode.addEventListener("click", async () => {
		try {
			await ensureRuntime();
			await renderReport();
		} catch (error) {
			setLoading("", false);
			modelNoteNode.textContent = t("initError", { error: error?.message || "unknown" });
		}
	});

	modelNode.addEventListener("change", () => {
		state.selectedModel = modelNode.value;
		state.runtime = null;
		renderModelOptions({ modelNode, modelNoteNode, state, selectedValue: state.selectedModel, t: modelT });
	});

	datasetSelect.addEventListener("change", () => {
		state.selectedDatasetId = datasetSelect.value;
		renderReport();
	});

	target.querySelectorAll("[data-ai-prompt]").forEach((button) => {
		button.addEventListener("click", () => {
			const prompts = {
				resume: t("defaultPrompt"),
				riesgos: t("riskPrompt"),
				acciones: t("actionPrompt")
			};
			const prompt = prompts[button.dataset.aiPrompt] || prompts.resume;
			inputNode.value = prompt;
			renderReport(prompt);
		});
	});

	target.querySelector("[data-ai-form]").addEventListener("submit", async (event) => {
		event.preventDefault();
		await renderReport(inputNode.value.trim() || t("defaultPrompt"));
	});

	await renderReport();
	return { state, refresh: renderReport };
}

function buildInsightMessages(dataset, report, question) {
	return [
		{
			role: "system",
			content: "Eres un consultor experto en analisis de encuestas. Responde solo con evidencia del dataset recibido. No inventes datos. Se claro, ejecutivo y accionable."
		},
		{
			role: "user",
			content: JSON.stringify({
				question,
				survey: dataset.survey?.title,
				responseCount: dataset.analysis.responseCount,
				valuation: dataset.valuation,
				summary: report.summary,
				evidence: report.evidence,
				textInsights: {
					topWords: dataset.textInsights.topWords,
					sentiment: dataset.textInsights.sentiment
				}
			})
		}
	];
}

function escapeHtml(value) {
	return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
