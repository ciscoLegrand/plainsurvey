import { analyzeSurveyResponses } from "../analytics/index.js";
export {
	ANALYSIS_CONTRACT_VERSION,
	DEFAULT_INSIGHT_CONFIG,
	buildConsultantReport,
	countWords,
	createSurveyAnalysisContract,
	createSurveyInsightDataset,
	createSurveyValuation,
	createTextInsights,
	toSurveyAnalysisContract
} from "./insights.js";

export { analyzeSurveyResponses };
export { analysisInsightLocales, analysisLocales } from "./locales/index.js";

export const SurveyAnalyzer = analyzeSurveyResponses;

export function createSurveyAnalysis(options = {}) {
	return analyzeSurveyResponses(options);
}
