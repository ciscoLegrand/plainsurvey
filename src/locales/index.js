import { builderMessages as builderMessagesEn, builderTypeLabels as builderTypeLabelsEn, builderTypeSummaries as builderTypeSummariesEn, builderOperatorLabels as builderOperatorLabelsEn } from "./en/builder.js";
import { builderMessages as builderMessagesEs, builderTypeLabels as builderTypeLabelsEs, builderTypeSummaries as builderTypeSummariesEs, builderOperatorLabels as builderOperatorLabelsEs } from "./es/builder.js";
import { studioMessages as studioMessagesEn } from "./en/studio.js";
import { studioMessages as studioMessagesEs } from "./es/studio.js";

export const builderLocales = {
  en: {
    messages: builderMessagesEn,
    typeLabels: builderTypeLabelsEn,
    typeSummaries: builderTypeSummariesEn,
    operatorLabels: builderOperatorLabelsEn
  },
  es: {
    messages: builderMessagesEs,
    typeLabels: builderTypeLabelsEs,
    typeSummaries: builderTypeSummariesEs,
    operatorLabels: builderOperatorLabelsEs
  }
};

export const studioLocales = {
  en: studioMessagesEn,
  es: studioMessagesEs
};

export function resolveLocale(candidate, available, fallback = "en") {
  return available[candidate] ? candidate : fallback;
}
