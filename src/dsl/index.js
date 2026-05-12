import { createSurveyAiRuntime } from "../ai/index.js";
import { createSurveyAnalysis } from "../analysis/index.js";
import { createSurveyAnalytics } from "../analytics/index.js";
import { createSurveyBuilder } from "../builder/index.js";
import { createSurveyPreview } from "../preview/index.js";

export function createPlainsurvey(config = {}) {
  const builderConfig = config.builder || {};
  const previewConfig = config.preview || {};
  const analysisConfig = config.analysis || {};
  const analyticsConfig = config.analytics || {};
  const aiConfig = config.ai || {};

  return {
    builder(options = {}) {
      return createSurveyBuilder({ ...builderConfig, ...options });
    },
    preview(options = {}) {
      return createSurveyPreview({ ...previewConfig, ...options });
    },
    analysis(options = {}) {
      return createSurveyAnalysis({ ...analysisConfig, ...options });
    },
    analytics(options = {}) {
      return createSurveyAnalytics({ ...analyticsConfig, ...options });
    },
    ai(options = {}) {
      return createSurveyAiRuntime({ ...aiConfig, ...options });
    }
  };
}

export const createSurveyDsl = createPlainsurvey;
