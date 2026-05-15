import { analyticsAdviceMessages as analyticsAdviceMessagesEn, analyticsDashboardMessages as analyticsDashboardMessagesEn } from "./en.js";
import { analyticsAdviceMessages as analyticsAdviceMessagesEs, analyticsDashboardMessages as analyticsDashboardMessagesEs } from "./es.js";

export const analyticsLocales = {
  en: {
    dashboardMessages: analyticsDashboardMessagesEn,
    adviceMessages: analyticsAdviceMessagesEn
  },
  es: {
    dashboardMessages: analyticsDashboardMessagesEs,
    adviceMessages: analyticsAdviceMessagesEs
  }
};

export const analyticsDashboardLocales = {
  en: analyticsDashboardMessagesEn,
  es: analyticsDashboardMessagesEs
};

export const analyticsAdviceLocales = {
  en: analyticsAdviceMessagesEn,
  es: analyticsAdviceMessagesEs
};
