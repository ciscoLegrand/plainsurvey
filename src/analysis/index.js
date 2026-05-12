import { analyzeSurveyResponses } from "../analytics/index.js";

export { analyzeSurveyResponses };

export const SurveyAnalyzer = analyzeSurveyResponses;

export function createSurveyAnalysis(options = {}) {
	return analyzeSurveyResponses(options);
}
