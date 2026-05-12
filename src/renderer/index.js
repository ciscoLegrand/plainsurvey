import {
	calculateSurveyScore,
	createSession,
	nextPage,
	previousPage,
	setAnswer,
	visibleQuestions
} from "../core/index.js";
import { captureFocus, restoreFocus } from "../shared/dom/focus.js";
import { createTranslator, resolveLocale } from "../shared/i18n/index.js";
import { rendererLocales } from "./locales/index.js";

export const plainRendererPreset = {
	root: "ps-renderer",
	page: "ps-page",
	header: "ps-header",
	eyebrow: "ps-eyebrow",
	title: "ps-title",
	description: "ps-description",
	questions: "ps-questions",
	question: "ps-question",
	label: "ps-label",
	required: "ps-required",
	control: "ps-control",
	input: "ps-input",
	textarea: "ps-textarea",
	select: "ps-select",
	optionList: "ps-option-list",
	optionLabel: "ps-option-label",
	choiceButton: "ps-choice-button",
	selected: "is-selected",
	matrix: "ps-matrix",
	actions: "ps-actions",
	button: "ps-button",
	primaryButton: "ps-button-primary",
	secondaryButton: "ps-button-secondary",
	error: "ps-error",
	empty: "ps-empty",
	completion: "ps-completion",
	codeBlock: "ps-code-block",
	contentBlock: "ps-content-block",
	imageGrid: "ps-image-grid",
	imageOption: "ps-image-option",
	panel: "ps-panel"
};

export function createSurveyRenderer(options = {}) {
	if (!options.target) throw new Error("createSurveyRenderer requires a target element.");

	const target = options.target;
	const callbacks = {
		onChange: options.onChange,
		onPageChange: options.onPageChange,
		onComplete: options.onComplete
	};
	let ui = mergeUi(options.ui);
	let locale = resolveLocale(options.locale || "en", rendererLocales, "en");
	let overrides = options.messages?.renderer || options.messages;
	let session = createSession(options.survey, { initialAnswers: options.initialAnswers });
	let destroyed = false;

	function translate(key, vars = {}, fallback = key) {
		return createTranslator({
			locale,
			fallbackLocale: "en",
			messages: rendererLocales,
			overrides
		})(key, vars, fallback);
	}

	function render() {
		if (destroyed) return;
		const focusSnapshot = captureFocus(target);
		target.replaceChildren(renderSession());
		restoreFocus(target, focusSnapshot);
	}

	function update(nextOptions = {}) {
		if (nextOptions.ui) ui = mergeUi(nextOptions.ui);
		if (nextOptions.locale) locale = resolveLocale(nextOptions.locale, rendererLocales, "en");
		if (nextOptions.messages?.renderer || nextOptions.messages) {
			overrides = nextOptions.messages?.renderer || nextOptions.messages;
		}
		if (nextOptions.survey) {
			session = createSession(nextOptions.survey, {
				initialAnswers: nextOptions.initialAnswers || session.answers,
				pageIndex: nextOptions.pageIndex ?? session.pageIndex
			});
		} else if (nextOptions.initialAnswers) {
			session = createSession(session.survey, {
				initialAnswers: nextOptions.initialAnswers,
				pageIndex: session.pageIndex
			});
		}
		render();
	}

	function answer(questionName, value) {
		session = setAnswer(session, questionName, value);
		callbacks.onChange?.({
			answers: { ...session.answers },
			questionName,
			value,
			session
		});
		render();
	}

	function goNext() {
		const previousIndex = session.pageIndex;
		const wasCompleted = session.completed;
		session = nextPage(session);

		if (session.pageIndex !== previousIndex) {
			callbacks.onPageChange?.({ pageIndex: session.pageIndex, session });
		}

		if (!wasCompleted && session.completed) {
			callbacks.onComplete?.({
				answers: { ...session.answers },
				scoreResult: calculateSurveyScore(session.survey, session.answers),
				session
			});
		}

		render();
	}

	function goPrevious() {
		const previousIndex = session.pageIndex;
		session = previousPage(session);
		if (session.pageIndex !== previousIndex) {
			callbacks.onPageChange?.({ pageIndex: session.pageIndex, session });
		}
		render();
	}

	function destroy() {
		destroyed = true;
		target.replaceChildren();
	}

	function renderSession() {
		if (session.completed) {
			return el("div", { class: classes("root", "completion") }, [
				el("h2", { class: ui.title, text: translate("surveyComplete") }),
				el("p", { class: ui.description, text: translate("surveyCompleteDescription") })
			]);
		}

		const page = session.survey.pages[session.pageIndex];
		const questions = visibleQuestions(page, session.answers);

		return el("form", {
			class: ui.root,
			onsubmit: (event) => {
				event.preventDefault();
				goNext();
			}
		}, [
			el("section", { class: ui.page }, [
				el("header", { class: ui.header }, [
					el("p", {
						class: ui.eyebrow,
						text: translate("pageCounter", {
							page: String(session.pageIndex + 1),
							total: String(session.survey.pages.length)
						})
					}),
					el("h2", { class: ui.title, text: page.title }),
					page.description ? el("p", { class: ui.description, text: page.description }) : null
				]),
				questions.length
					? el("div", { class: ui.questions }, questions.map((question) => renderQuestion(question)))
					: el("p", { class: ui.empty, text: translate("emptyPage") }),
				el("div", { class: ui.actions }, [
					el("button", {
						class: classes("button", "secondaryButton"),
						type: "button",
						disabled: session.pageIndex === 0,
						onclick: goPrevious,
						text: translate("previous")
					}),
					el("button", {
						class: classes("button", "primaryButton"),
						type: "submit",
						text: session.pageIndex === session.survey.pages.length - 1 ? translate("submit") : translate("next")
					})
				])
			])
		]);
	}

	function renderQuestion(question) {
		if (question.type === "codeBlock") return renderCodeBlock(question);
		if (question.type === "contentBlock") return renderContentBlock(question);
		if (question.type === "svgNote") return renderSvgNote(question);
		if (question.type === "panel") return renderPanel(question);

		const error = session.errors[question.name];

		return el("fieldset", { class: ui.question, "data-question-name": question.name }, [
			el("legend", { class: ui.label }, [
				question.title,
				question.required ? el("span", { class: ui.required, text: " *" }) : null
			]),
			question.description ? el("p", { class: ui.description, text: question.description }) : null,
			renderControl(question),
			error ? el("p", { class: ui.error, text: error }) : null
		]);
	}

	function renderControl(question) {
		const value = session.answers[question.name];

		switch (question.type) {
			case "textarea":
				return el("textarea", {
					class: classes("control", "textarea"),
					name: question.name,
					rows: 4,
					placeholder: question.placeholder || "",
					oninput: (event) => answer(question.name, event.target.value)
				}, [value || ""]);
			case "radio":
				return renderOptions(question, value, "radio");
			case "checkbox":
				return renderOptions(question, Array.isArray(value) ? value : [], "checkbox");
			case "dropdown":
				return el("select", {
					class: classes("control", "select"),
					name: question.name,
					onchange: (event) => answer(question.name, event.target.value)
				}, [
					el("option", { value: "", text: translate("selectOption") }),
					...(question.choices || []).map((choice) => el("option", {
						value: choice.value,
						selected: value === choice.value,
						text: choice.text
					}))
				]);
			case "rating":
				return renderChoiceButtons(question, value, buildRatingChoices(question), (choice) => choice.icon || choice.text);
			case "emojiScale":
				return renderChoiceButtons(question, value, question.choices || [], (choice) => choice.emoji || choice.text);
			case "imageChoice":
			case "imageCompare":
				return renderImageChoices(question, value);
			case "ranking":
				return renderRanking(question, value);
			case "matrix":
				return renderMatrix(question, value || {});
			case "boolean":
				return renderChoiceButtons(question, value, [
					{ value: true, text: translate("yes") },
					{ value: false, text: translate("no") }
				]);
			case "text":
			default:
				return el("input", {
					class: classes("control", "input"),
					type: "text",
					name: question.name,
					value: value || "",
					placeholder: question.placeholder || "",
					oninput: (event) => answer(question.name, event.target.value)
				});
		}
	}

	function renderOptions(question, value, type) {
		return el("div", { class: ui.optionList }, (question.choices || []).map((choice) => {
			const checked = type === "checkbox" ? value.includes(choice.value) : value === choice.value;

			return el("label", { class: ui.optionLabel }, [
				el("input", {
					type,
					name: question.name,
					value: choice.value,
					checked,
					onchange: (event) => {
						if (type === "checkbox") {
							const nextValue = event.target.checked
								? [...value, choice.value]
								: value.filter((item) => item !== choice.value);
							answer(question.name, nextValue);
							return;
						}
						answer(question.name, choice.value);
					}
				}),
				choice.text
			]);
		}));
	}

	function renderChoiceButtons(question, value, choices, labelForChoice = (choice) => choice.text) {
		return el("div", { class: ui.optionList }, choices.map((choice) => {
			const selected = value === choice.value;
			return el("button", {
				class: selected ? classes("choiceButton", "selected") : ui.choiceButton,
				type: "button",
				"aria-pressed": selected ? "true" : "false",
				onclick: () => answer(question.name, choice.value),
				text: labelForChoice(choice)
			});
		}));
	}

	function renderImageChoices(question, value) {
		const compareMode = question.type === "imageCompare";
		return el("div", { class: ui.imageGrid }, (question.choices || []).map((choice) => {
			const selected = value === choice.value;
			return el("button", {
				class: selected ? `${ui.imageOption} ${ui.selected}` : ui.imageOption,
				type: "button",
				"aria-pressed": selected ? "true" : "false",
				onclick: () => answer(question.name, choice.value)
			}, [
				choice.imageUrl ? el("img", { src: choice.imageUrl, alt: choice.alt || choice.text }) : null,
				el("span", { text: compareMode ? `${choice.text}${choice.caption ? ` · ${choice.caption}` : ""}` : choice.text })
			]);
		}));
	}

	function renderRanking(question, value) {
		const order = normalizeRankingOrder(question, value);

		return el("ol", { class: ui.optionList }, order.map((choiceValue, index) => {
			const choice = question.choices.find((item) => item.value === choiceValue);
			return el("li", { class: ui.optionLabel }, [
				`${index + 1}. ${choice?.text || choiceValue}`,
				el("button", {
					class: ui.button,
					type: "button",
					disabled: index === 0,
					onclick: () => answer(question.name, move(order, index, index - 1)),
					text: translate("up")
				}),
				el("button", {
					class: ui.button,
					type: "button",
					disabled: index === order.length - 1,
					onclick: () => answer(question.name, move(order, index, index + 1)),
					text: translate("down")
				})
			]);
		}));
	}

	function renderMatrix(question, value) {
		return el("table", { class: ui.matrix }, [
			el("thead", {}, [
				el("tr", {}, [
					el("th", { text: "" }),
					...(question.columns || []).map((column) => el("th", { text: column.text }))
				])
			]),
			el("tbody", {}, (question.rows || []).map((row) => el("tr", {}, [
				el("th", { scope: "row", text: row.text }),
				...(question.columns || []).map((column) => el("td", {}, [
					el("input", {
						type: "radio",
						name: `${question.name}_${row.value}`,
						value: column.value,
						checked: value[row.value] === column.value,
						onchange: () => answer(question.name, { ...value, [row.value]: column.value }),
						"aria-label": `${row.text}: ${column.text}`
					})
				]))
			])))
		]);
	}

	function renderCodeBlock(question) {
		return el("article", { class: ui.codeBlock, "data-question-name": question.name }, [
			el("h3", { class: ui.label, text: question.title }),
			question.description ? el("p", { class: ui.description, text: question.description }) : null,
			el("pre", {}, [el("code", { text: question.code || "" })])
		]);
	}

	function renderContentBlock(question) {
		return el("article", { class: ui.contentBlock, "data-question-name": question.name }, [
			question.title ? el("h3", { class: ui.label, text: question.title }) : null,
			question.description ? el("p", { class: ui.description, text: question.description }) : null,
			question.body ? el("p", { text: question.body }) : null
		]);
	}

	function renderSvgNote(question) {
		return el("article", { class: ui.contentBlock, "data-question-name": question.name }, [
			el("h3", { class: ui.label, text: question.title }),
			question.description ? el("p", { class: ui.description, text: question.description }) : null
		]);
	}

	function renderPanel(question) {
		const visibleNestedQuestions = (question.elements || []).filter((nestedQuestion) => {
			return visibleQuestions({ elements: [nestedQuestion] }, session.answers).length > 0;
		});

		return el("fieldset", { class: `${ui.question} ${ui.panel}`, "data-question-name": question.name }, [
			el("legend", { class: ui.label, text: question.title }),
			question.description ? el("p", { class: ui.description, text: question.description }) : null,
			visibleNestedQuestions.length
				? el("div", { class: ui.questions }, visibleNestedQuestions.map((nestedQuestion) => renderQuestion(nestedQuestion)))
				: el("p", { class: ui.empty, text: translate("emptyPanel") })
		]);
	}

	function classes(...keys) {
		return keys.map((key) => ui[key]).filter(Boolean).join(" ");
	}

	render();

	return {
		update,
		destroy,
		next: goNext,
		previous: goPrevious,
		getSession: () => session
	};
}

export const SurveyRenderer = createSurveyRenderer;

function mergeUi(ui = {}) {
	return { ...plainRendererPreset, ...ui };
}

function buildRatingChoices(question) {
	const min = Number(question.rateMin) || 1;
	const max = Math.max(min, Number(question.rateMax) || 5);
	const icons = max - min + 1 <= 5 ? ["★", "★", "★", "★", "★"] : [];
	return Array.from({ length: max - min + 1 }, (_, index) => {
		const value = min + index;
		return { value, text: String(value), icon: icons[index] || String(value) };
	});
}

function normalizeRankingOrder(question, value) {
	const choices = question.choices || [];
	const choiceValues = choices.map((choice) => choice.value);
	const order = Array.isArray(value) && value.length
		? value.filter((item) => choiceValues.includes(item))
		: choiceValues;
	const missing = choiceValues.filter((item) => !order.includes(item));
	return [...order, ...missing];
}

function move(items, fromIndex, toIndex) {
	const nextItems = [...items];
	const [item] = nextItems.splice(fromIndex, 1);
	nextItems.splice(toIndex, 0, item);
	return nextItems;
}

function el(tagName, attrs = {}, children = []) {
	const node = document.createElement(tagName);

	for (const [key, value] of Object.entries(attrs)) {
		if (value === undefined || value === null || value === false) continue;
		if (key === "class") node.className = value;
		else if (key === "text") node.textContent = value;
		else if (key === "html") node.innerHTML = value;
		else if (key === "dataset") Object.assign(node.dataset, value);
		else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
		else if (key in node) node[key] = value;
		else node.setAttribute(key, value === true ? "" : String(value));
	}

	const normalizedChildren = Array.isArray(children) ? children : [children];
	for (const child of normalizedChildren) {
		if (child === undefined || child === null || child === false) continue;
		node.append(child instanceof Node ? child : document.createTextNode(String(child)));
	}

	return node;
}
