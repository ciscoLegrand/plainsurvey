const INLINE_CORRECT_ANSWER_TYPES = ["checkbox", "ranking"];
const SINGLE_CHOICE_TYPES = ["radio", "dropdown", "emojiScale", "imageChoice", "imageCompare"];
const NON_SCORABLE_TYPES = ["svgNote", "codeBlock", "contentBlock", "panel"];

export function isNonScorableType(type) {
  return NON_SCORABLE_TYPES.includes(type);
}

export function usesInlineCorrectAnswerEditor(type) {
  return INLINE_CORRECT_ANSWER_TYPES.includes(type);
}

export function inlineCorrectAnswerHint(t, type) {
  if (type === "ranking") {
    return t("inlineHintRanking", {}, "Define el orden correcto directamente en cada opcion usando el campo de orden.");
  }
  if (type === "checkbox") {
    return t("inlineHintCheckbox", {}, "Marca sobre cada opcion cuales forman parte de la respuesta correcta.");
  }
  return t("inlineHintSingle", {}, "Marca sobre cada opcion cual es la respuesta correcta.");
}

export function choiceHelpForType(t, type) {
  if (type === "ranking") {
    return t("choiceHelpRanking", {}, "Asigna el orden correcto desde cada fila. La posicion 1 es la primera respuesta esperada.");
  }
  if (type === "checkbox") {
    return t("choiceHelpCheckbox", {}, "Marca en cada fila si esa opcion forma parte de la respuesta correcta.");
  }
  return t("choiceHelpSingle", {}, "Marca en cada fila cual es la opcion correcta para la correccion automatica.");
}

export function scoringHintForType(t, type) {
  if (INLINE_CORRECT_ANSWER_TYPES.includes(type)) {
    return t("scoringHintCheckboxRanking", {}, "La comparacion se hace por el orden exacto de los valores indicados.");
  }
  if (type === "matrix") {
    return t("scoringHintMatrix", {}, "La comparacion se hace fila por fila usando valores tecnicos.");
  }
  return t("scoringHintDefault", {}, "Este razonamiento se mostrara junto a la respuesta correcta en la vista de resultados.");
}

export function createDefaultScoring(question) {
  if (SINGLE_CHOICE_TYPES.includes(question.type)) {
    return { enabled: true, score: 1, weight: 1, correctAnswer: question.choices?.[0]?.value || "", rationale: "" };
  }
  if (question.type === "boolean") return { enabled: true, score: 1, weight: 1, correctAnswer: true, rationale: "" };
  if (question.type === "rating") return { enabled: true, score: 1, weight: 1, correctAnswer: question.rateMax || question.rateMin || 1, rationale: "" };
  if (INLINE_CORRECT_ANSWER_TYPES.includes(question.type)) {
    return { enabled: true, score: 1, weight: 1, correctAnswer: (question.choices || []).map((choice) => choice.value), rationale: "" };
  }
  if (question.type === "matrix") {
    return {
      enabled: true,
      score: 1,
      weight: 1,
      correctAnswer: Object.fromEntries((question.rows || []).map((row) => [row.value, question.columns?.[0]?.value || ""])),
      rationale: ""
    };
  }

  return { enabled: true, score: 1, weight: 1, correctAnswer: "", rationale: "" };
}

export function updateScoring(question, onUpdate, patch) {
  onUpdate({
    scoring: {
      ...createDefaultScoring(question),
      ...question.scoring,
      ...patch,
      enabled: true
    }
  });
}

export function remapScoring(scoring, nextQuestion, previousQuestion) {
  if (!scoring?.enabled) return undefined;

  return {
    ...createDefaultScoring(nextQuestion),
    ...scoring,
    correctAnswer: deriveCorrectAnswerForNextType(scoring.correctAnswer, nextQuestion, previousQuestion)
  };
}

function deriveCorrectAnswerForNextType(correctAnswer, nextQuestion, previousQuestion) {
  if (SINGLE_CHOICE_TYPES.includes(nextQuestion.type)) {
    const choiceValues = (nextQuestion.choices || []).map((choice) => choice.value);
    return choiceValues.includes(correctAnswer) ? correctAnswer : choiceValues[0] || "";
  }

  if (nextQuestion.type === "boolean") return Boolean(correctAnswer);
  if (nextQuestion.type === "rating") return Number(correctAnswer) || nextQuestion.rateMax || nextQuestion.rateMin || 1;
  if (INLINE_CORRECT_ANSWER_TYPES.includes(nextQuestion.type)) {
    const validChoices = new Set((nextQuestion.choices || []).map((choice) => choice.value));
    const values = Array.isArray(correctAnswer) ? correctAnswer.filter((value) => validChoices.has(value)) : [];
    return values.length ? values : (nextQuestion.choices || []).map((choice) => choice.value);
  }
  if (nextQuestion.type === "matrix") {
    const rows = nextQuestion.rows || [];
    const columns = new Set((nextQuestion.columns || []).map((column) => column.value));
    return Object.fromEntries(rows.map((row) => {
      const candidate = correctAnswer && typeof correctAnswer === "object" ? correctAnswer[row.value] : undefined;
      return [row.value, columns.has(candidate) ? candidate : nextQuestion.columns?.[0]?.value || ""];
    }));
  }

  return typeof correctAnswer === "string" ? correctAnswer : previousQuestion?.title || "";
}

export function remapScoringForChoices(question, previousValue, nextChoices, options = {}) {
  if (!question.scoring?.enabled) return question.scoring;

  const nextValue = options.nextValue;
  const replaceValue = (value) => value === previousValue && nextValue ? nextValue : value;

  if (SINGLE_CHOICE_TYPES.includes(question.type)) {
    const candidate = options.removed ? question.scoring.correctAnswer : replaceValue(question.scoring.correctAnswer);
    const correctAnswer = nextChoices.find((choice) => choice.value === candidate)?.value || nextChoices[0]?.value || "";
    return { ...question.scoring, correctAnswer };
  }

  if (INLINE_CORRECT_ANSWER_TYPES.includes(question.type)) {
    const validChoices = new Set(nextChoices.map((choice) => choice.value));
    return {
      ...question.scoring,
      correctAnswer: (question.scoring.correctAnswer || [])
        .filter((value) => value !== previousValue || !options.removed)
        .map(replaceValue)
        .filter((value) => validChoices.has(value))
    };
  }

  return question.scoring;
}

export function updateRankingCorrectAnswer(question, choiceValue, rawOrder) {
  const targetOrder = Number(rawOrder);
  const existing = (question.scoring?.correctAnswer || []).filter((value) => value !== choiceValue);
  if (!targetOrder || targetOrder < 1) return existing;

  const safeIndex = Math.min(targetOrder, question.choices.length) - 1;
  const next = [...existing];
  next.splice(safeIndex, 0, choiceValue);
  return dedupePreserveOrder(next);
}

function dedupePreserveOrder(values) {
  return values.filter((value, index) => values.indexOf(value) === index);
}
