import { createSurveyRenderer } from "../renderer/index.js";
import { createUiPreset } from "../styles/index.js";

export function createSurveyPreview(options = {}) {
	const { preset = "plain", ui, ...rest } = options;
	const resolvedUi = typeof preset === "string"
		? createUiPreset(preset, ui)
		: { ...(preset || {}), ...(ui || {}) };

	return createSurveyRenderer({ ...rest, ui: resolvedUi });
}

export const SurveyPreview = createSurveyPreview;
