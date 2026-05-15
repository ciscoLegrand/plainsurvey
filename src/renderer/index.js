import {
	calculateSurveyScore,
	createSession,
	getBooleanLabels,
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
					session.survey.imageUrl ? el("img", {
						class: "ps-survey-image",
						src: session.survey.imageUrl,
						alt: session.survey.title || ""
					}) : null,
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
				return renderBooleanToggle(question, value);
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

	function renderBooleanToggle(question, value) {
		const labels = getBooleanLabels(question, {
			trueLabel: translate("yes"),
			falseLabel: translate("no")
		});
		const state = value === true ? "true" : value === false ? "false" : "unset";
		const choices = [
			{ value: true, text: labels.trueLabel },
			{ value: false, text: labels.falseLabel }
		];

		return el("div", { class: "ps-boolean-toggle", dataset: { state } }, choices.map((choice) => {
			const selected = value === choice.value;
			return el("button", {
				class: selected ? "ps-boolean-option is-selected" : "ps-boolean-option",
				type: "button",
				"aria-pressed": selected ? "true" : "false",
				onclick: () => answer(question.name, choice.value),
				text: choice.text
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
		let draggedValue = null;

		return el("ol", { class: `${ui.optionList} ps-ranking-list` }, order.map((choiceValue, index) => {
			const choice = question.choices.find((item) => item.value === choiceValue);
			return el("li", {
				class: `${ui.optionLabel} ps-ranking-item`,
				draggable: true,
				dataset: { choiceValue },
				ondragstart: (event) => {
					draggedValue = choiceValue;
					event.dataTransfer?.setData("text/plain", choiceValue);
					if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
					event.currentTarget.classList.add("is-dragging");
				},
				ondragend: (event) => {
					draggedValue = null;
					event.currentTarget.classList.remove("is-dragging");
				},
				ondragover: (event) => {
					event.preventDefault();
					if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
				},
				ondrop: (event) => {
					event.preventDefault();
					const sourceValue = draggedValue || event.dataTransfer?.getData("text/plain");
					if (!sourceValue || sourceValue === choiceValue) return;
					const fromIndex = order.indexOf(sourceValue);
					const toIndex = order.indexOf(choiceValue);
					if (fromIndex < 0 || toIndex < 0) return;
					answer(question.name, move(order, fromIndex, toIndex));
				}
			}, [
				el("span", { class: "ps-ranking-text", text: `${index + 1}. ${choice?.text || choiceValue}` }),
				el("span", { class: "ps-ranking-handle", text: "::" })
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
		const language = normalizeCodeLanguage(question.language);
		const languageLabel = languageName(language);
		const highlightedCode = highlightCode(question.code || "", language);

		return el("article", { class: ui.codeBlock, "data-question-name": question.name }, [
			el("h3", { class: ui.label, text: question.title }),
			question.description ? el("p", { class: ui.description, text: question.description }) : null,
			el("div", { class: "ps-code-terminal", dataset: { language } }, [
				el("div", { class: "ps-code-terminal-bar" }, [
					el("span", { class: "ps-code-terminal-lights", "aria-hidden": "true" }, [
						el("span", { class: "ps-code-light ps-code-light-close" }),
						el("span", { class: "ps-code-light ps-code-light-minimize" }),
						el("span", { class: "ps-code-light ps-code-light-maximize" })
					]),
					el("span", { class: "ps-code-terminal-title", text: languageLabel })
				]),
				el("pre", { class: "ps-code-pre" }, [
					el("code", {
						class: `ps-code ps-lang-${language}`,
						html: highlightedCode
					})
				])
			])
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

const CODE_LANGUAGE_ALIASES = {
	js: "javascript",
	ts: "javascript",
	tsx: "javascript",
	jsx: "javascript",
	jsonc: "json",
	shell: "bash",
	sh: "bash",
	zsh: "bash",
	html: "html",
	xml: "html",
	scss: "css",
	py: "python",
	yml: "yaml",
	plaintext: "text",
	txt: "text"
};

const CODE_LANGUAGE_LABELS = {
	javascript: "JavaScript",
	json: "JSON",
	bash: "Shell",
	python: "Python",
	html: "HTML",
	css: "CSS",
	sql: "SQL",
	yaml: "YAML",
	text: "Text"
};

const CODE_HIGHLIGHT_RULES = {
	javascript: [
		{ name: "comment", regex: /^\/\/.*$/ },
		{ name: "string", regex: /^(?:`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
		{ name: "keyword", regex: /^(?:\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|from|export|default|class|extends|new|try|catch|finally|throw|await|async)\b)/ },
		{ name: "boolean", regex: /^(?:\b(?:true|false|null|undefined)\b)/ },
		{ name: "number", regex: /^(?:\b\d+(?:\.\d+)?\b)/ },
		{ name: "function", regex: /^(?:\b[A-Za-z_$][\w$]*(?=\())/ },
		{ name: "operator", regex: /^(?:===|!==|==|!=|<=|>=|=>|\+\+|--|\|\||&&|[+\-*/%<>!=]+)/ },
		{ name: "punctuation", regex: /^(?:[{}()[\].,;:])/ }
	],
	json: [
		{ name: "property", regex: /^(?:"(?:\\.|[^"\\])*")(?=\s*:)/ },
		{ name: "string", regex: /^(?:"(?:\\.|[^"\\])*")/ },
		{ name: "number", regex: /^(?:-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/i },
		{ name: "boolean", regex: /^(?:\b(?:true|false|null)\b)/ },
		{ name: "punctuation", regex: /^(?:[{}\[\],:])/ }
	],
	bash: [
		{ name: "comment", regex: /^#.*/ },
		{ name: "string", regex: /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
		{ name: "variable", regex: /^(?:\$(?:\{?[A-Za-z_][A-Za-z0-9_]*\}?|\d+|[@*?#!\-$]))/ },
		{ name: "keyword", regex: /^(?:\b(?:if|then|fi|for|in|do|done|while|case|esac|function|exit|echo)\b)/ },
		{ name: "command", regex: /^(?:\b(?:npm|pnpm|bun|node|git|cd|ls|cat|echo|curl|grep|sed|awk|docker|kubectl|make|python)\b)/ },
		{ name: "operator", regex: /^(?:\|\||&&|[|&;<>])/ },
		{ name: "number", regex: /^(?:\b\d+\b)/ }
	],
	python: [
		{ name: "comment", regex: /^#.*/ },
		{ name: "string", regex: /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
		{ name: "keyword", regex: /^(?:\b(?:def|return|if|elif|else|for|while|in|import|from|class|try|except|finally|with|as|pass|yield|await|async)\b)/ },
		{ name: "boolean", regex: /^(?:\b(?:True|False|None)\b)/ },
		{ name: "number", regex: /^(?:\b\d+(?:\.\d+)?\b)/ },
		{ name: "function", regex: /^(?:\b[A-Za-z_][\w]*(?=\())/ },
		{ name: "operator", regex: /^(?:==|!=|<=|>=|\+|\-|\*\*|\*|\/|%|=)/ },
		{ name: "punctuation", regex: /^(?:[{}()[\].,:])/ }
	],
	html: [
		{ name: "comment", regex: /^<!--.*?-->/ },
		{ name: "tag", regex: /^(?:<\/?[A-Za-z][\w:-]*)/ },
		{ name: "attribute", regex: /^(?:\b[A-Za-z_:][\w:.-]*(?=\=))/ },
		{ name: "string", regex: /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
		{ name: "punctuation", regex: /^(?:[<>/=])/ }
	],
	css: [
		{ name: "comment", regex: /^\/\*.*?\*\// },
		{ name: "property", regex: /^(?:\b(?:color|background|display|position|padding|margin|border|font|grid|flex|width|height|content|box-shadow|transform|transition|opacity|gap|align-items|justify-content)\b(?=\s*:))/ },
		{ name: "number", regex: /^(?:\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b)/ },
		{ name: "keyword", regex: /^(?:\b(?:var|calc|clamp|auto|none|solid|relative|absolute|fixed|grid|flex|block|inline)\b)/ },
		{ name: "selector", regex: /^(?:[#.]?[A-Za-z_-][\w-]*(?=\s*[,{]))/ },
		{ name: "punctuation", regex: /^(?:[{}:;(),.])/ }
	],
	sql: [
		{ name: "comment", regex: /^(?:--.*$)/ },
		{ name: "string", regex: /^(?:'(?:''|[^'])*')/ },
		{ name: "keyword", regex: /^(?:\b(?:select|from|where|join|left|right|inner|outer|on|group|by|order|insert|into|values|update|set|delete|limit|offset|as|and|or|not|null|create|table|drop|alter)\b)/i },
		{ name: "number", regex: /^(?:\b\d+(?:\.\d+)?\b)/ },
		{ name: "operator", regex: /^(?:<=|>=|<>|!=|=|<|>|\+|\-|\/|\*)/ },
		{ name: "punctuation", regex: /^(?:[(),.;])/ }
	],
	yaml: [
		{ name: "comment", regex: /^#.*/ },
		{ name: "property", regex: /^(?:[A-Za-z0-9_-]+(?=\s*:))/ },
		{ name: "string", regex: /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
		{ name: "boolean", regex: /^(?:\b(?:true|false|null|yes|no|on|off)\b)/i },
		{ name: "number", regex: /^(?:-?\b\d+(?:\.\d+)?\b)/ },
		{ name: "punctuation", regex: /^(?:[:\-])/ }
	],
	text: []
};

function normalizeCodeLanguage(language) {
	const normalized = String(language || "text").trim().toLowerCase();
	return CODE_LANGUAGE_ALIASES[normalized] || (CODE_HIGHLIGHT_RULES[normalized] ? normalized : "text");
}

function languageName(language) {
	return CODE_LANGUAGE_LABELS[language] || "Text";
}

function highlightCode(code, language) {
	const normalized = normalizeCodeLanguage(language);
	const lines = String(code || "").replace(/\r\n?/g, "\n").split("\n");
	return lines.map((line) => {
		const highlightedLine = highlightCodeLine(line, normalized);
		return `<span class="ps-code-line">${highlightedLine || "&nbsp;"}</span>`;
	}).join("");
}

function highlightCodeLine(line, language) {
	const rules = CODE_HIGHLIGHT_RULES[language] || CODE_HIGHLIGHT_RULES.text;
	if (!rules.length) return escapeHtml(line);

	let remaining = line;
	const chunks = [];

	while (remaining.length > 0) {
		let matched = false;

		for (const rule of rules) {
			const match = remaining.match(rule.regex);
			if (!match || !match[0]) continue;

			chunks.push(`<span class="ps-token ps-token-${rule.name}">${escapeHtml(match[0])}</span>`);
			remaining = remaining.slice(match[0].length);
			matched = true;
			break;
		}

		if (!matched) {
			chunks.push(escapeHtml(remaining[0]));
			remaining = remaining.slice(1);
		}
	}

	return chunks.join("");
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
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
