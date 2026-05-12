import { createId } from "./ids.js";

export const QUESTION_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "radio", label: "Single choice" },
  { value: "checkbox", label: "Multiple choice" },
  { value: "dropdown", label: "Dropdown" },
  { value: "rating", label: "Rating" },
  { value: "emojiScale", label: "Emoji scale" },
  { value: "imageChoice", label: "Image choice" },
  { value: "imageCompare", label: "Image comparison" },
  { value: "ranking", label: "Ranking" },
  { value: "matrix", label: "Matrix" },
  { value: "panel", label: "Nested panel" },
  { value: "codeBlock", label: "Code block" },
  { value: "svgNote", label: "Visual note" },
  { value: "contentBlock", label: "Content block" },
  { value: "boolean", label: "Yes or no" }
];

export const QUESTION_TYPE_VALUES = QUESTION_TYPES.map((type) => type.value);
export const ANSWERLESS_QUESTION_TYPES = ["codeBlock", "svgNote", "contentBlock", "panel"];

export const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "notEquals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "lessThan", label: "is less than" },
  { value: "lessThanOrEqual", label: "is less than or equal to" },
  { value: "greaterThan", label: "is greater than" },
  { value: "greaterThanOrEqual", label: "is greater than or equal to" },
  { value: "notEmpty", label: "has answer" },
  { value: "empty", label: "is empty" }
];

const DEFAULT_CHOICES = [
  { value: "option_1", text: "Option 1" },
  { value: "option_2", text: "Option 2" }
];

const DEFAULT_EMOJI_CHOICES = [
  { value: "terrible", text: "Terrible", emoji: "😠" },
  { value: "bad", text: "Bad", emoji: "🙁" },
  { value: "neutral", text: "Neutral", emoji: "😐" },
  { value: "good", text: "Good", emoji: "🙂" },
  { value: "great", text: "Great", emoji: "😍" }
];

const DEFAULT_MATRIX_ROWS = [
  { value: "speed", text: "Speed" },
  { value: "design", text: "Design" },
  { value: "support", text: "Support" }
];

const DEFAULT_MATRIX_COLUMNS = [
  { value: "low", text: "Low" },
  { value: "medium", text: "Medium" },
  { value: "high", text: "High" }
];

const DEFAULT_IMAGE_CHOICES = [
  { value: "image_1", text: "Image 1", imageUrl: "https://placehold.co/640x420?text=Image+1" },
  { value: "image_2", text: "Image 2", imageUrl: "https://placehold.co/640x420?text=Image+2" }
];

export function createSurvey(overrides = {}) {
  return normalizeSurvey({
    version: 1,
    title: "Untitled survey",
    description: "",
    pages: [createPage("Page 1")],
    ...overrides
  });
}

export function createPage(title = "New page", overrides = {}) {
  const id = overrides.id || createId("page");

  return {
    id,
    title,
    description: "",
    elements: [createQuestion("text")],
    ...overrides,
    id,
    title: overrides.title || title
  };
}

export function createQuestion(type = "text", overrides = {}) {
  const normalizedType = isKnownQuestionType(type) ? type : "text";
  const id = overrides.id || createId("question");
  const question = {
    id,
    type: normalizedType,
    name: overrides.name || id,
    title: "Untitled question",
    description: "",
    required: false
  };

  applyTypeDefaults(question);

  return normalizeQuestion({
    ...question,
    ...overrides,
    id,
    type: normalizedType,
    name: overrides.name || question.name
  });
}

export function hasChoices(type) {
  return ["radio", "checkbox", "dropdown", "ranking", "imageChoice", "imageCompare"].includes(type);
}

export function isAnswerlessQuestion(questionOrType) {
  const type = typeof questionOrType === "string" ? questionOrType : questionOrType?.type;
  return ANSWERLESS_QUESTION_TYPES.includes(type);
}

export function normalizeSurvey(input = {}) {
  const pages = Array.isArray(input.pages) && input.pages.length > 0
    ? input.pages
    : [createPage("Page 1")];

  return {
    version: toPositiveInteger(input.version, 1),
    title: stringOr(input.title, "Untitled survey"),
    description: stringOr(input.description, ""),
    pages: pages.map((page, index) => normalizePage(page, index))
  };
}

function normalizePage(page = {}, index = 0) {
  const elements = Array.isArray(page.elements) && page.elements.length > 0
    ? page.elements
    : [createQuestion("text")];

  return {
    id: stringOr(page.id, createId("page")),
    title: stringOr(page.title, `Page ${index + 1}`),
    description: stringOr(page.description, ""),
    elements: elements.map((question) => normalizeQuestion(question))
  };
}

function normalizeQuestion(question = {}) {
  const type = isKnownQuestionType(question.type) ? question.type : "text";
  const id = stringOr(question.id, createId("question"));
  const normalized = {
    id,
    type,
    name: stringOr(question.name, id),
    title: stringOr(question.title, "Untitled question"),
    description: stringOr(question.description, ""),
    required: Boolean(question.required)
  };

  if (question.placeholder) normalized.placeholder = String(question.placeholder);
  applyTypeSpecificFields(normalized, question);

  const scoring = normalizeScoring(question.scoring, normalized, question);
  if (scoring) normalized.scoring = scoring;

  const visibleIf = normalizeVisibleIf(question.visibleIf);
  if (visibleIf) normalized.visibleIf = visibleIf;

  if (isAnswerlessQuestion(normalized)) normalized.required = false;

  return normalized;
}

function applyTypeDefaults(question) {
  if (hasChoices(question.type)) question.choices = clone(DEFAULT_CHOICES);
  if (["imageChoice", "imageCompare"].includes(question.type)) question.choices = clone(DEFAULT_IMAGE_CHOICES);
  if (question.type === "emojiScale") question.choices = clone(DEFAULT_EMOJI_CHOICES);
  if (question.type === "matrix") {
    question.rows = clone(DEFAULT_MATRIX_ROWS);
    question.columns = clone(DEFAULT_MATRIX_COLUMNS);
  }
  if (question.type === "rating") {
    question.rateMin = 1;
    question.rateMax = 5;
  }
  if (question.type === "boolean") question.required = false;
  if (question.type === "text") question.placeholder = "Type your answer";
  if (question.type === "textarea") question.placeholder = "Tell us more";
  if (question.type === "codeBlock") {
    question.language = "text";
    question.code = "";
  }
  if (question.type === "svgNote") question.variant = "spark";
  if (question.type === "contentBlock") {
    question.body = "";
    question.imageUrl = "";
    question.imageCaption = "";
  }
  if (question.type === "panel") question.elements = [createQuestion("text", { title: "Nested question" })];
}

function applyTypeSpecificFields(normalized, source) {
  if (hasChoices(normalized.type)) normalized.choices = normalizeChoices(source.choices);
  if (["imageChoice", "imageCompare"].includes(normalized.type)) normalized.choices = normalizeImageChoices(source.choices);
  if (normalized.type === "emojiScale") normalized.choices = normalizeEmojiChoices(source.choices);
  if (normalized.type === "matrix") {
    normalized.rows = normalizeChoices(source.rows, DEFAULT_MATRIX_ROWS);
    normalized.columns = normalizeChoices(source.columns, DEFAULT_MATRIX_COLUMNS);
  }
  if (normalized.type === "rating") {
    normalized.rateMin = toNumber(source.rateMin, 1);
    normalized.rateMax = Math.max(normalized.rateMin, toNumber(source.rateMax, 5));
  }
  if (normalized.type === "codeBlock") {
    normalized.language = stringOr(source.language, "text");
    normalized.code = stringOr(source.code, "");
  }
  if (normalized.type === "svgNote") {
    normalized.variant = ["spark", "waves", "orbit"].includes(source.variant) ? source.variant : "spark";
  }
  if (normalized.type === "contentBlock") {
    normalized.body = stringOr(source.body ?? source.text ?? source.content, "");
    normalized.imageUrl = stringOr(source.imageUrl, "");
    normalized.imageCaption = stringOr(source.imageCaption, "");
  }
  if (normalized.type === "panel") {
    normalized.elements = normalizeNestedElements(source.elements);
  }
}

function normalizeChoices(choices, fallback = DEFAULT_CHOICES) {
  const source = Array.isArray(choices) && choices.length > 0 ? choices : fallback;

  return source.map((choice, index) => {
    if (typeof choice === "string") return { value: choice, text: choice };

    const value = stringOr(choice?.value, `option_${index + 1}`);
    return {
      value,
      text: stringOr(choice?.text ?? choice?.label, value)
    };
  });
}

function normalizeEmojiChoices(choices) {
  const source = Array.isArray(choices) && choices.length > 0 ? choices : DEFAULT_EMOJI_CHOICES;

  return source.map((choice, index) => {
    const value = stringOr(choice?.value, `emoji_${index + 1}`);
    return {
      value,
      text: stringOr(choice?.text ?? choice?.label, value),
      emoji: normalizeEmojiSymbol(stringOr(choice?.emoji, value))
    };
  });
}

function normalizeImageChoices(choices) {
  const source = Array.isArray(choices) && choices.length > 0 ? choices : DEFAULT_IMAGE_CHOICES;

  return source.map((choice, index) => {
    const value = stringOr(choice?.value, `image_${index + 1}`);
    return {
      value,
      text: stringOr(choice?.text ?? choice?.label, value),
      imageUrl: stringOr(choice?.imageUrl ?? choice?.url ?? choice?.src, ""),
      alt: stringOr(choice?.alt, choice?.text ?? choice?.label ?? value),
      caption: stringOr(choice?.caption, "")
    };
  });
}

function normalizeNestedElements(elements) {
  const source = Array.isArray(elements) && elements.length > 0
    ? elements
    : [createQuestion("text", { title: "Nested question" })];

  return source.map((question) => normalizeQuestion(question));
}

function normalizeEmojiSymbol(value) {
  return {
    angry: "😠",
    sad: "🙁",
    neutral: "😐",
    smile: "🙂",
    happy: "🙂",
    heart: "😍",
    love: "😍",
    star: "★"
  }[value] || value;
}

function normalizeScoring(input, question, sourceQuestion) {
  if (!input?.enabled) return undefined;

  return {
    enabled: true,
    score: Math.max(0, toNumber(input.score, 1)),
    weight: Math.max(0, toNumber(input.weight, 1)),
    correctAnswer: normalizeCorrectAnswer(input.correctAnswer, question, sourceQuestion),
    rationale: stringOr(input.rationale, "")
  };
}

function normalizeCorrectAnswer(correctAnswer, question, sourceQuestion) {
  if (correctAnswer === undefined || correctAnswer === null || correctAnswer === "") {
    return defaultCorrectAnswer(question, sourceQuestion);
  }

  if (["radio", "dropdown", "emojiScale", "imageChoice", "imageCompare"].includes(question.type)) return String(correctAnswer);
  if (question.type === "boolean") return toBoolean(correctAnswer);
  if (question.type === "rating") return toNumber(correctAnswer, question.rateMin || 1);
  if (["checkbox", "ranking"].includes(question.type)) {
    return Array.isArray(correctAnswer) ? correctAnswer.map(String) : defaultCorrectAnswer(question, sourceQuestion);
  }
  if (question.type === "matrix") {
    return isPlainObject(correctAnswer) ? { ...correctAnswer } : defaultCorrectAnswer(question, sourceQuestion);
  }

  return String(correctAnswer);
}

function defaultCorrectAnswer(question, sourceQuestion) {
  if (["radio", "dropdown", "emojiScale", "imageChoice", "imageCompare"].includes(question.type)) return question.choices?.[0]?.value || "";
  if (question.type === "boolean") return true;
  if (question.type === "rating") return question.rateMax || question.rateMin || 1;
  if (["checkbox", "ranking"].includes(question.type)) return (question.choices || []).map((choice) => choice.value);
  if (question.type === "matrix") {
    const fallbackColumn = question.columns?.[0]?.value || "";
    return Object.fromEntries((question.rows || sourceQuestion?.rows || []).map((row) => [row.value, fallbackColumn]));
  }

  return "";
}

function normalizeVisibleIf(visibleIf) {
  if (!visibleIf?.question) return undefined;
  const operator = OPERATORS.some((item) => item.value === visibleIf.operator) ? visibleIf.operator : "equals";

  return {
    question: String(visibleIf.question),
    operator,
    value: visibleIf.value
  };
}

function isKnownQuestionType(type) {
  return QUESTION_TYPE_VALUES.includes(type);
}

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stringOr(value, fallback) {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
