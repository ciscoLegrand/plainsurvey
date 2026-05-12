import { plainRendererPreset } from "../renderer/index.js";

export const plainPreset = {
	...plainRendererPreset,
	root: "ps-renderer ps-theme-plain"
};

export const bootstrapPreset = {
	...plainRendererPreset,
	root: "ps-renderer",
	page: "ps-page card card-body",
	header: "ps-header",
	eyebrow: "ps-eyebrow",
	title: "ps-title h4",
	description: "ps-description text-muted",
	questions: "ps-questions",
	question: "ps-question mb-3",
	label: "ps-label form-label",
	required: "ps-required",
	control: "ps-control",
	input: "ps-input form-control",
	textarea: "ps-textarea form-control",
	select: "ps-select form-select",
	optionList: "ps-option-list d-grid gap-2",
	optionLabel: "ps-option-label form-check",
	choiceButton: "ps-choice-button btn btn-outline-primary",
	selected: "is-selected active",
	matrix: "ps-matrix",
	actions: "ps-actions d-flex gap-2 justify-content-end",
	button: "ps-button btn",
	primaryButton: "ps-button-primary btn-primary",
	secondaryButton: "ps-button-secondary btn-outline-secondary",
	error: "ps-error text-danger",
	empty: "ps-empty text-muted",
	completion: "ps-completion",
	codeBlock: "ps-code-block",
	contentBlock: "ps-content-block"
};

export const daisyPreset = {
	...plainRendererPreset,
	root: "ps-renderer ps-daisy-renderer",
	page: "ps-page card bg-base-100 shadow-xl",
	header: "ps-header card-body pb-0",
	eyebrow: "ps-eyebrow text-xs font-bold uppercase text-primary",
	title: "ps-title card-title text-2xl",
	description: "ps-description text-base-content/70",
	questions: "ps-questions card-body pt-4",
	question: "ps-question form-control w-full",
	label: "ps-label label label-text font-semibold",
	required: "ps-required text-error",
	control: "ps-control",
	input: "ps-input input input-bordered w-full",
	textarea: "ps-textarea textarea textarea-bordered w-full",
	select: "ps-select select select-bordered w-full",
	optionList: "ps-option-list grid gap-2",
	optionLabel: "ps-option-label label cursor-pointer justify-start gap-3 rounded-box border border-base-300 bg-base-100 px-3 py-2",
	choiceButton: "ps-choice-button btn btn-outline btn-primary",
	selected: "is-selected btn-active",
	matrix: "ps-matrix table table-zebra",
	actions: "ps-actions card-actions justify-end",
	button: "ps-button btn",
	primaryButton: "ps-button-primary btn-primary",
	secondaryButton: "ps-button-secondary btn-ghost",
	error: "ps-error text-error text-sm",
	empty: "ps-empty opacity-70",
	completion: "ps-completion card bg-base-100 shadow-xl",
	codeBlock: "ps-code-block mockup-code",
	contentBlock: "ps-content-block card bg-base-100 shadow"
};

export const bulmaPreset = {
	...plainRendererPreset,
	root: "ps-renderer",
	page: "ps-page box",
	header: "ps-header",
	eyebrow: "ps-eyebrow",
	title: "ps-title title is-4",
	description: "ps-description help",
	questions: "ps-questions",
	question: "ps-question field",
	label: "ps-label label",
	required: "ps-required",
	control: "ps-control",
	input: "ps-input input",
	textarea: "ps-textarea textarea",
	select: "ps-select select",
	optionList: "ps-option-list block",
	optionLabel: "ps-option-label checkbox",
	choiceButton: "ps-choice-button button is-outlined",
	selected: "is-selected is-primary",
	matrix: "ps-matrix",
	actions: "ps-actions buttons is-right",
	button: "ps-button button",
	primaryButton: "ps-button-primary is-primary",
	secondaryButton: "ps-button-secondary is-light",
	error: "ps-error help is-danger",
	empty: "ps-empty help",
	completion: "ps-completion",
	codeBlock: "ps-code-block",
	contentBlock: "ps-content-block"
};

export const frameworkPresets = {
	plain: plainPreset,
	bootstrap: bootstrapPreset,
	daisy: daisyPreset,
	bulma: bulmaPreset
};

export function createUiPreset(name = "plain", overrides = {}) {
	const preset = frameworkPresets[name] || plainPreset;
	return { ...preset, ...overrides };
}
