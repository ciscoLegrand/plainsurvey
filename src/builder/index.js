import { createPage, createQuestion, normalizeSurvey } from "../core/index.js";
import { createSurveyRenderer } from "../renderer/index.js";
import { createTranslator, resolveLocale } from "../shared/i18n/index.js";
import { captureFocus, restoreFocus } from "../shared/dom/focus.js";
import { showToast } from "../shared/toast.js";
import { stripUndefined } from "../utils/object.js";
import { builderLocales } from "./locales/index.js";
import { sampleSurvey } from "./sample-survey.js";
import { initializeBuilderInteractions, renderBuilderView, takePendingBuilderFocus } from "./view.js";

export function createSurveyBuilder(options = {}) {
	if (!options.target) throw new Error("createSurveyBuilder requires a target element.");

	const target = options.target;
	const onChange = options.onChange;
	const onOpenJson = options.onOpenJson;
	let survey = normalizeSurvey(options.survey);
	let locale = resolveLocale(options.locale || "es", builderLocales, "es");
	let overrides = options.messages?.builder;
	let selectedConfigNode = { type: "survey" };
	let selectedQuestionId = null;
	let enteringQuestionId = null;
	let questionDraft = createQuestion("text");
	let activeBuilderView = "builder";
	let jsonDraft = "";
	let jsonError = "";
	let jsonCopied = false;
	let copyResetTimeout = null;
	let destroyed = false;
	let renderScheduled = false;
	let renderTimeout = null;
	let previewRenderer = null;

	const state = {
		get survey() {
			return survey;
		},
		get selectedConfigNode() {
			return selectedConfigNode;
		},
		get selectedQuestionId() {
			return selectedQuestionId;
		},
		get enteringQuestionId() {
			return enteringQuestionId;
		},
		get questionDraft() {
			return questionDraft;
		},
		get activeBuilderView() {
			return activeBuilderView;
		},
		get jsonDraft() {
			return jsonDraft || JSON.stringify(survey, null, 2);
		},
		get jsonError() {
			return jsonError;
		},
		get jsonCopied() {
			return jsonCopied;
		}
	};

	const actions = {
		updateSurvey(patch, options = {}) {
			survey = normalizeSurvey({ ...survey, ...patch });
			persist({ render: options.render ?? "survey" });
		},
		addPage() {
			survey = normalizeSurvey({
				...survey,
				pages: [...survey.pages, createPage(`Page ${survey.pages.length + 1}`)]
			});
			persistAndRender();
		},
		removePage(pageId) {
			survey = normalizeSurvey({
				...survey,
				pages: survey.pages.filter((page) => page.id !== pageId)
			});
			if (selectedConfigNode?.type === "page" && selectedConfigNode.pageId === pageId) {
				selectedConfigNode = { type: "survey" };
			}
			persistAndRender();
		},
		clonePage(pageId) {
			const pageIndex = survey.pages.findIndex((page) => page.id === pageId);
			if (pageIndex === -1) return;
			const sourcePage = survey.pages[pageIndex];
			const clonedPage = createPage(`${sourcePage.title} copy`, {
				description: sourcePage.description,
				elements: sourcePage.elements.map((question) => materializeQuestion(question))
			});
			survey = normalizeSurvey({
				...survey,
				pages: insertAt(survey.pages, clonedPage, pageIndex + 1)
			});
			selectedConfigNode = { type: "page", pageId: clonedPage.id };
			selectedQuestionId = null;
			persistAndRender();
		},
		updatePage(pageId, patch, options = {}) {
			survey = normalizeSurvey({
				...survey,
				pages: survey.pages.map((page) => page.id === pageId ? { ...page, ...patch } : page)
			});
			persist({ render: options.render ?? "page", pageId });
		},
		movePage(pageId, targetIndex) {
			const currentIndex = survey.pages.findIndex((page) => page.id === pageId);
			if (currentIndex === -1) return;

			const safeIndex = Number.isInteger(targetIndex)
				? Math.max(0, Math.min(targetIndex, survey.pages.length - 1))
				: currentIndex;
			if (safeIndex === currentIndex) return;

			const pages = [...survey.pages];
			const [movingPage] = pages.splice(currentIndex, 1);
			pages.splice(safeIndex, 0, movingPage);
			survey = normalizeSurvey({ ...survey, pages });
			persistAndRender();
		},
		addQuestion(pageId) {
			actions.insertQuestion(pageId, undefined);
		},
		insertQuestion(pageId, source, index) {
			const question = materializeQuestion(source || questionDraft);
			survey = normalizeSurvey({
				...survey,
				pages: survey.pages.map((page) => page.id === pageId
					? { ...page, elements: insertAt(page.elements, question, index) }
					: page)
			});
			selectedQuestionId = question.id;
			enteringQuestionId = question.id;
			selectedConfigNode = { type: "question", questionId: question.id };
			persistAndRender();
		},
		moveQuestion(sourcePageId, questionId, targetPageId, targetIndex) {
			const sourcePage = survey.pages.find((page) => page.id === sourcePageId);
			const movingQuestion = sourcePage?.elements.find((question) => question.id === questionId);
			if (!movingQuestion) return;

			survey = normalizeSurvey({
				...survey,
				pages: survey.pages.map((page) => {
					const withoutMoving = page.id === sourcePageId
						? page.elements.filter((question) => question.id !== questionId)
						: page.elements;
					const adjustedIndex = sourcePageId === targetPageId
						? adjustMoveIndex(sourcePage.elements, questionId, targetIndex)
						: targetIndex;
					return page.id === targetPageId
						? { ...page, elements: insertAt(withoutMoving, movingQuestion, adjustedIndex) }
						: { ...page, elements: withoutMoving };
				})
			});
			selectedQuestionId = questionId;
			enteringQuestionId = null;
			selectedConfigNode = { type: "question", questionId };
			persistAndRender();
		},
		removeQuestion(pageId, questionId) {
			survey = normalizeSurvey({
				...survey,
				pages: survey.pages.map((page) => page.id === pageId
					? { ...page, elements: page.elements.filter((question) => question.id !== questionId) }
					: page)
			});
			if (selectedConfigNode?.type === "question" && selectedConfigNode.questionId === questionId) {
				selectedConfigNode = { type: "page", pageId };
			}
			if (selectedQuestionId === questionId) selectedQuestionId = null;
			if (enteringQuestionId === questionId) enteringQuestionId = null;
			persistAndRender();
		},
		updateQuestion(pageId, questionId, patch, options = {}) {
			const previousQuestion = survey.pages
				.find((page) => page.id === pageId)
				?.elements.find((question) => question.id === questionId);
			survey = normalizeSurvey({
				...survey,
				pages: survey.pages.map((page) => page.id === pageId
					? {
							...page,
							elements: page.elements.map((question) => question.id === questionId
								? stripUndefined({ ...question, ...patch })
								: question)
						}
					: page)
			});
			persist({
				render: options.render ?? renderModeForQuestionPatch(previousQuestion, patch),
				pageId,
				questionId
			});
		},
		selectQuestion(questionId) {
			selectedQuestionId = questionId;
			enteringQuestionId = null;
			selectedConfigNode = { type: "question", questionId };
			render();
		},
		selectConfigNode(node) {
			selectedConfigNode = node;
			selectedQuestionId = node.type === "question" ? node.questionId : null;
			enteringQuestionId = null;
			render();
		},
		selectQuestionType(type) {
			questionDraft = createQuestion(type);
			selectedConfigNode = { type: "draft" };
			selectedQuestionId = null;
			enteringQuestionId = null;
			render();
		},
		updateQuestionDraft(patch) {
			const previousQuestionDraft = questionDraft;
			questionDraft = stripUndefined({ ...questionDraft, ...patch });
			if (renderModeForQuestionPatch(previousQuestionDraft, patch)) render();
		},
		loadSample() {
			survey = normalizeSurvey(sampleSurvey);
			selectedConfigNode = { type: "survey" };
			selectedQuestionId = null;
			enteringQuestionId = null;
			persistAndRender();
		},
		resetSurvey() {
			survey = normalizeSurvey({ title: "Untitled survey", description: "", pages: [createPage("Page 1")] });
			questionDraft = createQuestion("text");
			selectedConfigNode = { type: "survey" };
			selectedQuestionId = null;
			enteringQuestionId = null;
			persistAndRender();
		},
		selectBuilderView(view) {
			activeBuilderView = ["builder", "preview", "json"].includes(view) ? view : "builder";
			if (activeBuilderView === "json") jsonDraft = JSON.stringify(survey, null, 2);
			jsonError = "";
			render();
		},
		updateJsonDraft(value) {
			jsonDraft = value;
			jsonError = "";
			render();
		},
		saveSurveyJson() {
			try {
				survey = normalizeSurvey(JSON.parse(jsonDraft || "{}"));
				jsonDraft = JSON.stringify(survey, null, 2);
				jsonError = "";
				showToast("JSON guardado", "success", 2200);
				persistAndRender();
			} catch (error) {
				jsonError = error?.message || "Invalid JSON";
				showToast("JSON inválido", "error", 3200);
				render();
			}
		},
		copySurveyJson() {
			const value = jsonDraft || JSON.stringify(survey, null, 2);
			const copied = globalThis.navigator?.clipboard?.writeText
				? globalThis.navigator.clipboard.writeText(value)
				: Promise.resolve();
			copied
				.then(() => showToast("JSON copiado", "success", 1800))
				.catch(() => showToast("No se pudo copiar el JSON", "error", 2800));
			jsonCopied = true;
			if (copyResetTimeout) clearTimeout(copyResetTimeout);
			copyResetTimeout = setTimeout(() => {
				jsonCopied = false;
				copyResetTimeout = null;
				if (!destroyed) render();
			}, 500);
			render();
		},
		openJson() {
			activeBuilderView = "json";
			jsonDraft = JSON.stringify(survey, null, 2);
			jsonError = "";
			render();
			onOpenJson?.(survey);
		}
	};

	function translate(key, vars = {}, fallback = key) {
		return createTranslator({
			locale,
			fallbackLocale: "en",
			messages: {
				en: builderLocales.en.messages,
				es: builderLocales.es.messages
			},
			overrides
		})(key, vars, fallback);
	}

	function emit() {
		survey = normalizeSurvey(survey);
		onChange?.(survey);
	}

	function render() {
		if (destroyed) return;
		previewRenderer?.destroy?.();
		previewRenderer = null;
		const pendingKey = takePendingBuilderFocus();
		const focusSnapshot = pendingKey ? null : captureFocus(target);
		const panelScrollSnapshot = capturePanelScroll(target);
		const root = buildBuilderRoot();
		target.replaceChildren(root);
		const previewTarget = target.querySelector("[data-builder-runtime-preview]");
		if (previewTarget) {
			previewRenderer = createSurveyRenderer({
				target: previewTarget,
				survey,
				locale
			});
		}
		restorePanelScroll(target, panelScrollSnapshot);
		restoreBuilderFocus(target, pendingKey, focusSnapshot);
		enteringQuestionId = null;
	}

	function persistAndRender() {
		persist({ render: true });
	}

	function persist({ render: shouldRender = false, pageId, questionId } = {}) {
		emit();
		if (shouldRender === "question") scheduleQuestionRender(pageId, questionId);
		else if (shouldRender === "page") schedulePageRender(pageId);
		else if (shouldRender === "survey") scheduleSurveyRender();
		else if (shouldRender) scheduleRender();
	}

	function scheduleRender() {
		if (renderScheduled) return;
		renderScheduled = true;
		if (renderTimeout) clearTimeout(renderTimeout);
		renderTimeout = setTimeout(() => {
			renderScheduled = false;
			renderTimeout = null;
			render();
		}, 32);  // ~30fps debounce for smooth editing
	}

	function scheduleQuestionRender(pageId, questionId) {
		if (!pageId || !questionId || activeBuilderView !== "builder") {
			scheduleRender();
			return;
		}
		if (renderScheduled) return;
		renderScheduled = true;
		if (renderTimeout) clearTimeout(renderTimeout);
		renderTimeout = setTimeout(() => {
			renderScheduled = false;
			renderTimeout = null;
			renderQuestionScope(pageId, questionId);
		}, 32);
	}

	function schedulePageRender(pageId) {
		if (!pageId || activeBuilderView !== "builder") {
			scheduleRender();
			return;
		}
		scheduleScopedRender(() => renderPageScope(pageId));
	}

	function scheduleSurveyRender() {
		if (activeBuilderView !== "builder") {
			scheduleRender();
			return;
		}
		scheduleScopedRender(renderSurveyScope);
	}

	function scheduleScopedRender(callback) {
		if (renderScheduled) return;
		renderScheduled = true;
		if (renderTimeout) clearTimeout(renderTimeout);
		renderTimeout = setTimeout(() => {
			renderScheduled = false;
			renderTimeout = null;
			callback();
		}, 32);
	}

	function renderQuestionScope(pageId, questionId) {
		if (destroyed) return;
		const currentRoot = target.firstElementChild;
		if (!currentRoot) {
			render();
			return;
		}

		const pendingKey = takePendingBuilderFocus();
		const focusSnapshot = pendingKey ? null : captureFocus(target);
		const panelScrollSnapshot = capturePanelScroll(target);
		const nextRoot = buildBuilderRoot({ initializeInteractions: false });
		const escapedQuestionId = cssEscape(questionId);
		const escapedPageId = cssEscape(pageId);
		const currentQuestion = target.querySelector(`.preview-question[data-question-id="${escapedQuestionId}"]`);
		const nextQuestion = nextRoot.querySelector(`.preview-question[data-question-id="${escapedQuestionId}"]`);
		const currentPageHeading = target.querySelector(`.builder-canvas-page[data-page-id="${escapedPageId}"] > .section-heading`);
		const nextPageHeading = nextRoot.querySelector(`.builder-canvas-page[data-page-id="${escapedPageId}"] > .section-heading`);
		const currentProperties = target.querySelector(".properties-panel .builder-editor-card");
		const nextProperties = nextRoot.querySelector(".properties-panel .builder-editor-card");

		currentRoot.classList.add("is-patching");
		if (currentQuestion && nextQuestion) currentQuestion.replaceWith(nextQuestion);
		if (currentPageHeading && nextPageHeading) currentPageHeading.replaceWith(nextPageHeading);
		if (currentProperties && nextProperties) currentProperties.replaceWith(nextProperties);
		initializeBuilderInteractions(currentRoot, actions);
		restorePanelScroll(target, panelScrollSnapshot);
		restoreBuilderFocus(target, pendingKey, focusSnapshot);
		requestAnimationFrameSafe(() => currentRoot.classList.remove("is-patching"));
	}

	function renderSurveyScope() {
		if (destroyed) return;
		const currentRoot = target.firstElementChild;
		if (!currentRoot) {
			render();
			return;
		}

		const pendingKey = takePendingBuilderFocus();
		const focusSnapshot = pendingKey ? null : captureFocus(target);
		const panelScrollSnapshot = capturePanelScroll(target);
		const nextRoot = buildBuilderRoot({ initializeInteractions: false });
		const currentSurvey = target.querySelector(".builder-survey-block");
		const nextSurvey = nextRoot.querySelector(".builder-survey-block");
		const currentProperties = target.querySelector(".properties-panel .builder-editor-card");
		const nextProperties = nextRoot.querySelector(".properties-panel .builder-editor-card");

		currentRoot.classList.add("is-patching");
		if (currentSurvey && nextSurvey) currentSurvey.replaceWith(nextSurvey);
		if (selectedConfigNode?.type === "survey" && currentProperties && nextProperties) currentProperties.replaceWith(nextProperties);
		initializeBuilderInteractions(currentRoot, actions);
		restorePanelScroll(target, panelScrollSnapshot);
		restoreBuilderFocus(target, pendingKey, focusSnapshot);
		requestAnimationFrameSafe(() => currentRoot.classList.remove("is-patching"));
	}

	function renderPageScope(pageId) {
		if (destroyed) return;
		const currentRoot = target.firstElementChild;
		if (!currentRoot) {
			render();
			return;
		}

		const pendingKey = takePendingBuilderFocus();
		const focusSnapshot = pendingKey ? null : captureFocus(target);
		const panelScrollSnapshot = capturePanelScroll(target);
		const nextRoot = buildBuilderRoot({ initializeInteractions: false });
		const escapedPageId = cssEscape(pageId);
		const currentPage = target.querySelector(`.builder-canvas-page[data-page-id="${escapedPageId}"]`);
		const nextPage = nextRoot.querySelector(`.builder-canvas-page[data-page-id="${escapedPageId}"]`);
		const currentProperties = target.querySelector(".properties-panel .builder-editor-card");
		const nextProperties = nextRoot.querySelector(".properties-panel .builder-editor-card");

		currentRoot.classList.add("is-patching");
		if (currentPage && nextPage) {
			const currentHeading = currentPage.querySelector(":scope > .section-heading");
			const nextHeading = nextPage.querySelector(":scope > .section-heading");
			const currentSettings = currentPage.querySelector(":scope > .page-settings-inline");
			const nextSettings = nextPage.querySelector(":scope > .page-settings-inline");
			if (currentHeading && nextHeading) currentHeading.replaceWith(nextHeading);
			if (currentSettings && nextSettings) currentSettings.replaceWith(nextSettings);
		}
		if (selectedConfigNode?.type === "page" && selectedConfigNode.pageId === pageId && currentProperties && nextProperties) {
			currentProperties.replaceWith(nextProperties);
		}
		initializeBuilderInteractions(currentRoot, actions);
		restorePanelScroll(target, panelScrollSnapshot);
		restoreBuilderFocus(target, pendingKey, focusSnapshot);
		requestAnimationFrameSafe(() => currentRoot.classList.remove("is-patching"));
	}

	function buildBuilderRoot(options = {}) {
		const localePack = builderLocales[locale] || builderLocales.en;
		const root = renderBuilderView(state, actions, {
			t: translate,
			typeLabels: localePack.typeLabels,
			typeSummaries: localePack.typeSummaries,
			operatorLabels: localePack.operatorLabels
		}, options);
		localizeBuilderDom(root, locale, translate);
		return root;
	}

	function update(nextOptions = {}) {
		if (nextOptions.survey) survey = normalizeSurvey(nextOptions.survey);
		if (nextOptions.locale) locale = resolveLocale(nextOptions.locale, builderLocales, "es");
		if (nextOptions.messages?.builder) overrides = nextOptions.messages.builder;
		render();
	}

	function destroy() {
		destroyed = true;
		if (copyResetTimeout) clearTimeout(copyResetTimeout);
		previewRenderer?.destroy?.();
		previewRenderer = null;
		target.replaceChildren();
	}

	render();

	return {
		update,
		destroy,
		getSurvey: () => survey
	};
}

export const SurveyBuilder = createSurveyBuilder;

export function createBuilderDsl(config = {}) {
	return {
		mount(options = {}) {
			return createSurveyBuilder({ ...config, ...options });
		},
		sampleSurvey
	};
}

function capturePanelScroll(container) {
	return Array.from(container.querySelectorAll(".side-panel[data-sidebar-panel] .panel-scroll-body"))
		.map((node) => ({
			key: node.closest("[data-sidebar-panel]")?.getAttribute("data-sidebar-panel") || "",
			top: node.scrollTop,
			left: node.scrollLeft
		}))
		.filter((entry) => entry.key);
}

function restorePanelScroll(container, snapshot) {
	if (!Array.isArray(snapshot) || snapshot.length === 0) return;
	snapshot.forEach((entry) => {
		const panel = container.querySelector(`.side-panel[data-sidebar-panel="${entry.key.replace(/["\\]/g, "\\$&")}"] .panel-scroll-body`);
		if (!panel) return;
		panel.scrollTop = entry.top || 0;
		panel.scrollLeft = entry.left || 0;
	});
}

function restoreBuilderFocus(container, pendingKey, focusSnapshot) {
	if (pendingKey) {
		const control = container.querySelector(`[data-builder-focus-key="${cssEscape(pendingKey)}"]`);
		control?.focus?.({ preventScroll: true });
		control?.scrollIntoView?.({ behavior: "instant", block: "nearest" });
		return;
	}
	restoreFocus(container, focusSnapshot);
}

function localizeBuilderDom(root, locale, t) {
	if (locale === "es") return;
	const localePack = builderLocales[locale] || builderLocales.en;
	const typeLabels = localePack.typeLabels;
	const operatorLabels = localePack.operatorLabels;

	root.querySelectorAll(".panel-float-label").forEach((node) => {
		if (node.textContent === "Banco de preguntas") node.textContent = t("toolboxTitle");
		if (node.textContent === "Configurador") node.textContent = t("configurator");
	});

	root.querySelectorAll(".eyebrow").forEach((node) => {
		const text = node.textContent.trim();
		if (text === "Builder") node.textContent = t("builderEyebrow");
		else if (text === "Encuesta") node.textContent = t("survey");
		else if (text === "Plantilla de pregunta") node.textContent = t("draftEyebrow");
		else if (/^Pagina \d+$/.test(text)) node.textContent = t("pageCounter", { index: text.match(/\d+/)?.[0] || "1" });
		else if (/^Pregunta \d+$/.test(text)) node.textContent = t("questionCounter", { index: text.match(/\d+/)?.[0] || "1" });
		else {
			const match = text.match(/^Pregunta (\d+) · (.+)$/);
			if (match) node.textContent = t("questionCounterWithType", { index: match[1], type: translateTypeLabel(match[2], locale) });
		}
	});

	root.querySelectorAll("summary").forEach((node) => {
		const text = node.textContent.trim();
		if (text === "Arbol de estructura") node.textContent = t("structureTree");
		else if (text === "Puntuacion y correccion") node.textContent = t("scoringSummary");
		else if (text === "Logica de visibilidad") node.textContent = t("visibilitySummary");
	});

	root.querySelectorAll(".field-label").forEach((node) => {
		const text = node.textContent.trim();
		const translated = {
			"Titulo": t("surveyTitle"),
			"Descripcion": t("surveyDescription"),
			"Titulo de pagina": t("pageTitle"),
			"Descripcion de pagina": t("pageDescription"),
			"Tipo": t("type"),
			"Nombre tecnico": t("technicalName"),
			"Obligatoria": t("required"),
			"Score": t("score"),
			"Peso": t("weight"),
			"Explicacion de la correccion": t("correctionRationale"),
			"Respuesta correcta": t("correctAnswer"),
			"Pregunta": t("visibilityQuestion"),
			"Operador": t("visibilityOperator"),
			"Valor": t("visibilityValue"),
			"Variante visual": t("visualVariant"),
			"Lenguaje": t("language"),
			"Codigo": t("code"),
			"Cuerpo del bloque": t("blockBody"),
			"URL de imagen (opcional)": t("imageUrl"),
			"Pie de imagen": t("imageCaption"),
			"Minimo": t("min"),
			"Maximo": t("max"),
			"Placeholder": t("placeholder"),
			"Filas": t("rows"),
			"Columnas": t("columns")
		}[text];
		if (translated) node.textContent = translated;
	});

	root.querySelectorAll(".field-hint, .muted").forEach((node) => {
		const text = node.textContent.trim();
		const translated = {
			"Configura este tipo y usa los botones + del preview para insertarlo en una pagina.": t("draftBody"),
			"Activa la puntuacion para guardar score, peso, respuesta correcta y razonamiento.": t("scoringEmptyInfo"),
			"Este tipo es informativo y no se puntua.": t("scoringDisabledInfo"),
			"Activa la regla para configurar condiciones.": t("visibilityEnableInfo"),
			"Anade otra pregunta para usar condiciones.": t("visibilityUnavailableInfo"),
			"Marca aqui la cara correcta para esta pregunta puntuable.": t("emojiCorrectHelp"),
			"Define el orden correcto directamente en cada opcion usando el campo de orden.": t("inlineHintRanking"),
			"Marca sobre cada opcion cuales forman parte de la respuesta correcta.": t("inlineHintCheckbox"),
			"Marca sobre cada opcion cual es la respuesta correcta.": t("inlineHintSingle"),
			"Asigna el orden correcto desde cada fila. La posicion 1 es la primera respuesta esperada.": t("choiceHelpRanking"),
			"Marca en cada fila si esa opcion forma parte de la respuesta correcta.": t("choiceHelpCheckbox"),
			"Marca en cada fila cual es la opcion correcta para la correccion automatica.": t("choiceHelpSingle"),
			"La comparacion se hace por el orden exacto de los valores indicados.": t("scoringHintCheckboxRanking"),
			"La comparacion se hace fila por fila usando valores tecnicos.": t("scoringHintMatrix"),
			"Este razonamiento se mostrara junto a la respuesta correcta en la vista de resultados.": t("scoringHintDefault"),
			"Texto libre: historia, instrucciones, enunciado...": t("blockBodyHint"),
			"1 es la primera posicion correcta.": t("rankingHint")
		}[text];
		if (translated) node.textContent = translated;
		else if (/^Total: \d+ paginas$/.test(text)) node.textContent = t("totalPages", { count: text.match(/\d+/)?.[0] || "0" });
		else if (/^Preguntas en esta pagina: \d+$/.test(text)) node.textContent = t("questionsInPage", { count: text.match(/\d+/)?.[0] || "0" });
		else if (text === "Arrastra o selecciona un tipo para insertarlo en la pagina activa.") node.textContent = t("toolboxBody");
	});

	root.querySelectorAll("button").forEach((node) => {
		if (node.classList.contains("ps-boolean-option")) return;
		const text = node.textContent.trim();
		const translated = {
			"Anadir pagina": t("addPage"),
			"Cargar ejemplo": t("loadSample"),
			"Abrir JSON": t("openJson"),
			"Reiniciar": t("reset"),
			"+ Anadir pagina": t("addPageInline"),
			"Anadir cara": t("addFace"),
			"Anadir opcion": t("addOption"),
			"Anadir": t("add"),
			"Si": t("yes"),
			"No": t("no")
		}[text];
		if (translated) node.textContent = translated;
	});

	root.querySelectorAll("strong").forEach((node) => {
		const text = node.textContent.trim();
		const translated = {
			"Caras": t("faces"),
			"Opciones": t("options"),
			"Filas": t("rows"),
			"Columnas": t("columns")
		}[text];
		if (translated) node.textContent = translated;
	});

	root.querySelectorAll(".choice-correctness span").forEach((node) => {
		if (node.textContent.trim() === "Correcta") node.textContent = t("choiceCorrect");
	});

	root.querySelectorAll("[title]").forEach((node) => {
		const text = node.getAttribute("title") || "";
		if (text === "Minimizar") node.setAttribute("title", t("minimize"));
		else if (text === "Arrastrar") node.setAttribute("title", t("dragHandle"));
		else if (text === "Anadir pregunta al final de esta pagina") node.setAttribute("title", t("addQuestionAtEnd"));
		else if (text === "Anadir pregunta aqui") node.setAttribute("title", t("addQuestionHere"));
		else if (text === "Eliminar pagina") node.setAttribute("title", t("deletePage"));
		else if (/^Eliminar/.test(text)) node.setAttribute("title", t("deleteQuestion"));
		else {
			const match = text.match(/^Configurar (.+)$/);
			if (match) node.setAttribute("title", t("configureType", { label: translateTypeLabel(match[1], locale) }));
		}
	});

	root.querySelectorAll("select").forEach((select) => {
		if (select.dataset.keepBooleanLabels === "true") return;
		const values = Array.from(select.options).map((option) => option.value);
		const isTypeSelect = values.every((value) => !value || Object.prototype.hasOwnProperty.call(typeLabels, value));
		const isOperatorSelect = values.every((value) => !value || Object.prototype.hasOwnProperty.call(operatorLabels, value));
		const isVariantSelect = values.every((value) => !value || ["spark", "waves", "orbit"].includes(value));
		const isBooleanSelect = values.every((value) => ["", "true", "false"].includes(value));

		Array.from(select.options).forEach((option) => {
			if (isTypeSelect && option.value) option.textContent = typeLabels[option.value] || option.textContent;
			else if (isOperatorSelect && option.value) option.textContent = operatorLabels[option.value] || option.textContent;
			else if (isVariantSelect && option.value) option.textContent = { spark: t("sparkle"), waves: t("waves"), orbit: t("orbit") }[option.value] || option.textContent;
			else if (isBooleanSelect && option.value) option.textContent = option.value === "true" ? t("yes") : t("no");
			else if (option.textContent.trim() === "Selecciona una opcion") option.textContent = t("selectOption");
		});
	});
}

function translateTypeLabel(label, locale) {
	if (locale === "es") return label;
	const spanishMap = builderLocales.es.typeLabels;
	const englishMap = builderLocales.en.typeLabels;
	const type = Object.keys(spanishMap).find((key) => spanishMap[key] === label)
		|| Object.keys(englishMap).find((key) => englishMap[key] === label);
	return type ? englishMap[type] : label;
}

function materializeQuestion(source) {
	if (typeof source === "string") return createQuestion(source);
	const next = { ...source };
	delete next.id;
	delete next.name;
	return createQuestion(next.type || "text", next);
}

function insertAt(items, item, index = items.length) {
	const safeIndex = Number.isInteger(index) ? Math.max(0, Math.min(index, items.length)) : items.length;
	return [...items.slice(0, safeIndex), item, ...items.slice(safeIndex)];
}

function adjustMoveIndex(items, questionId, targetIndex) {
	const currentIndex = items.findIndex((item) => item.id === questionId);
	if (currentIndex === -1) return targetIndex;
	return currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
}

function renderModeForQuestionPatch(previousQuestion, patch) {
	if (!previousQuestion || !patch || typeof patch !== "object") return true;
	if (patch.type !== undefined && patch.type !== previousQuestion.type) return true;

	const nextQuestion = stripUndefined({ ...previousQuestion, ...patch });
	if (hasCollectionSizeChanged(previousQuestion.choices, nextQuestion.choices)) return "question";
	if (hasCollectionSizeChanged(previousQuestion.rows, nextQuestion.rows)) return "question";
	if (hasCollectionSizeChanged(previousQuestion.columns, nextQuestion.columns)) return "question";
	if (hasCollectionSizeChanged(previousQuestion.elements, nextQuestion.elements)) return "question";
	if (hasNestedQuestionTypeChanged(previousQuestion.elements, nextQuestion.elements)) return "question";
	if (Boolean(previousQuestion.scoring?.enabled) !== Boolean(nextQuestion.scoring?.enabled)) return "question";
	if (Boolean(previousQuestion.visibleIf?.question) !== Boolean(nextQuestion.visibleIf?.question)) return "question";

	return false;
}

function hasCollectionSizeChanged(previousItems = [], nextItems = []) {
	if (!Array.isArray(previousItems) && !Array.isArray(nextItems)) return false;
	return (previousItems?.length || 0) !== (nextItems?.length || 0);
}

function hasNestedQuestionTypeChanged(previousItems = [], nextItems = []) {
	if (!Array.isArray(previousItems) || !Array.isArray(nextItems)) return false;
	return previousItems.some((item, index) => item?.type !== nextItems[index]?.type);
}

function cssEscape(value) {
	if (globalThis.CSS?.escape) return CSS.escape(value);
	return String(value).replace(/["\\]/g, "\\$&");
}

function requestAnimationFrameSafe(callback) {
	if (typeof globalThis.requestAnimationFrame === "function") {
		globalThis.requestAnimationFrame(callback);
		return;
	}
	setTimeout(callback, 0);
}
