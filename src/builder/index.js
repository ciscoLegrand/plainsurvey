import { createPage, createQuestion, normalizeSurvey } from "../core/index.js";
import { createTranslator, resolveLocale } from "../shared/i18n/index.js";
import { captureFocus, restoreFocus } from "../shared/dom/focus.js";
import { stripUndefined } from "../utils/object.js";
import { builderLocales } from "./locales/index.js";
import { sampleSurvey } from "./sample-survey.js";
import { renderBuilderView, takePendingBuilderFocus } from "./view.js";

export function createSurveyBuilder(options = {}) {
	if (!options.target) throw new Error("createSurveyBuilder requires a target element.");

	const target = options.target;
	const onChange = options.onChange;
	const onOpenJson = options.onOpenJson;
	let survey = normalizeSurvey(options.survey);
	let locale = resolveLocale(options.locale || "en", builderLocales, "en");
	let overrides = options.messages?.builder;
	let selectedConfigNode = { type: "survey" };
	let selectedQuestionId = null;
	let questionDraft = createQuestion("text");
	let destroyed = false;

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
		get questionDraft() {
			return questionDraft;
		}
	};

	const actions = {
		updateSurvey(patch) {
			survey = normalizeSurvey({ ...survey, ...patch });
			persistAndRender();
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
		updatePage(pageId, patch) {
			survey = normalizeSurvey({
				...survey,
				pages: survey.pages.map((page) => page.id === pageId ? { ...page, ...patch } : page)
			});
			persistAndRender();
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
			persistAndRender();
		},
		updateQuestion(pageId, questionId, patch) {
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
			persistAndRender();
		},
		selectQuestion(questionId) {
			selectedQuestionId = questionId;
			selectedConfigNode = { type: "question", questionId };
			render();
		},
		selectConfigNode(node) {
			selectedConfigNode = node;
			selectedQuestionId = node.type === "question" ? node.questionId : null;
			render();
		},
		selectQuestionType(type) {
			questionDraft = createQuestion(type);
			selectedConfigNode = { type: "draft" };
			selectedQuestionId = null;
			render();
		},
		updateQuestionDraft(patch) {
			questionDraft = stripUndefined({ ...questionDraft, ...patch });
			render();
		},
		loadSample() {
			survey = normalizeSurvey(sampleSurvey);
			selectedConfigNode = { type: "survey" };
			selectedQuestionId = null;
			persistAndRender();
		},
		resetSurvey() {
			survey = normalizeSurvey({ title: "Untitled survey", description: "", pages: [createPage("Page 1")] });
			questionDraft = createQuestion("text");
			selectedConfigNode = { type: "survey" };
			selectedQuestionId = null;
			persistAndRender();
		},
		openJson() {
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
		const pendingKey = takePendingBuilderFocus();
		const focusSnapshot = pendingKey ? null : captureFocus(target);
		const panelScrollSnapshot = capturePanelScroll(target);
		const localePack = builderLocales[locale] || builderLocales.en;
		const root = renderBuilderView(state, actions, {
			t: translate,
			typeLabels: localePack.typeLabels,
			typeSummaries: localePack.typeSummaries,
			operatorLabels: localePack.operatorLabels
		});
		localizeBuilderDom(root, locale, translate);
		target.replaceChildren(root);
		restorePanelScroll(target, panelScrollSnapshot);
		if (pendingKey) {
			const escaped = pendingKey.replace(/[\\"]/g, "\\$&");
			const control = target.querySelector(`[data-builder-focus-key="${escaped}"]`);
			control?.focus?.({ preventScroll: true });
			control?.scrollIntoView?.({ behavior: "instant", block: "nearest" });
		} else {
			restoreFocus(target, focusSnapshot);
		}
	}

	function persistAndRender() {
		emit();
		render();
	}

	function update(nextOptions = {}) {
		if (nextOptions.survey) survey = normalizeSurvey(nextOptions.survey);
		if (nextOptions.locale) locale = resolveLocale(nextOptions.locale, builderLocales, "en");
		if (nextOptions.messages?.builder) overrides = nextOptions.messages.builder;
		render();
	}

	function destroy() {
		destroyed = true;
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
	return Array.from(container.querySelectorAll(".side-panel[data-float-panel] .panel-scroll-body"))
		.map((node) => ({
			key: node.closest("[data-float-panel]")?.getAttribute("data-float-panel") || "",
			top: node.scrollTop,
			left: node.scrollLeft
		}))
		.filter((entry) => entry.key);
}

function restorePanelScroll(container, snapshot) {
	if (!Array.isArray(snapshot) || snapshot.length === 0) return;
	snapshot.forEach((entry) => {
		const panel = container.querySelector(`.side-panel[data-float-panel="${entry.key.replace(/["\\]/g, "\\$&")}"] .panel-scroll-body`);
		if (!panel) return;
		panel.scrollTop = entry.top || 0;
		panel.scrollLeft = entry.left || 0;
	});
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

	root.querySelectorAll(".tree-node-meta").forEach((node) => {
		const text = node.textContent.trim();
		if (/^\d+ paginas$/.test(text)) node.textContent = t("surveyCount", { count: text.match(/\d+/)?.[0] || "0" });
		else if (/^Pagina \d+$/.test(text)) node.textContent = t("pageCounter", { index: text.match(/\d+/)?.[0] || "1" });
		else {
			const match = text.match(/^P(\d+)\.(\d+) · (.+)$/);
			if (match) node.textContent = t("treeQuestionMeta", { page: match[1], question: match[2], type: translateTypeLabel(match[3], locale) });
		}
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
