import { QUESTION_TYPES } from "../../core/schema.js";

export const QUESTION_TYPE_SUMMARIES = {
  text: "Short answer",
  textarea: "Free paragraph",
  radio: "One option",
  checkbox: "Multiple options",
  dropdown: "Compact list",
  rating: "Stars or score",
  emojiScale: "Visual scale",
  imageChoice: "Image cards",
  imageCompare: "A/B visual choice",
  ranking: "Preferred order",
  matrix: "Rows and columns",
  panel: "Nested questions",
  codeBlock: "Technical content",
  svgNote: "Visual separator",
  contentBlock: "Content block",
  boolean: "Binary decision"
};

export function resolveConfigSelection(survey, selectedConfigNode, fallbackQuestionId) {
  if (selectedConfigNode?.type === "draft") return { type: "draft" };
  if (selectedConfigNode?.type === "survey") return { type: "survey" };

  if (selectedConfigNode?.type === "page") {
    const pageIndex = survey.pages.findIndex((page) => page.id === selectedConfigNode.pageId);
    if (pageIndex !== -1) return { type: "page", page: survey.pages[pageIndex], pageIndex };
  }

  const selectedQuestion = selectedConfigNode?.type === "question"
    ? findSelectedQuestion(survey, selectedConfigNode.questionId)
    : findSelectedQuestion(survey, fallbackQuestionId);

  if (selectedQuestion) return { type: "question", ...selectedQuestion };
  return { type: "survey" };
}

export function labelForType(type) {
  return QUESTION_TYPES.find((item) => item.value === type)?.label || type;
}

export function slugName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "") || "answer";
}

function findSelectedQuestion(survey, questionId) {
  for (const page of survey.pages) {
    const questionIndex = page.elements.findIndex((question) => question.id === questionId);
    if (questionIndex !== -1) return { page, question: page.elements[questionIndex], questionIndex };
  }

  return null;
}