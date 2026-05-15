import { getBooleanLabels } from "../../../core/schema.js";
import { field, input, select, textarea, el } from "../../dom.js";
import {
  createDefaultScoring,
  inlineCorrectAnswerHint,
  isNonScorableType,
  scoringHintForType,
  updateScoring,
  usesInlineCorrectAnswerEditor
} from "../../scoring.js";
import { requestBuilderFocus } from "../focus-state.js";

export function renderScoringEditor(question, onUpdate, t) {
  const enabled = Boolean(question.scoring?.enabled);
  const scoring = enabled ? question.scoring : createDefaultScoring(question);
  const usesInlineCorrectAnswer = usesInlineCorrectAnswerEditor(question.type);
  const scoringFocusBase = `${question.id}:scoring`;

  return el("details", { class: "visibility-editor", open: enabled }, [
    el("summary", { text: "Puntuacion y correccion" }),
    el("label", { class: "check-row" }, [
      el("input", {
        type: "checkbox",
        dataset: { builderFocusKey: `${question.id}:scoring-toggle` },
        checked: enabled,
        disabled: isNonScorableType(question.type),
        onchange: (event) => {
          requestBuilderFocus(`${question.id}:scoring-toggle`);
          onUpdate({
            scoring: event.target.checked ? scoring : undefined
          });
        }
      }),
      t("scoringToggleLabel", {}, "Marcar esta pregunta como puntuable")
    ]),
    enabled ? el("div", { class: "scoring-editor" }, [
      el("div", { class: "scoring-nums-row" }, [
        field("Score", input(scoring.score, (value) => {
          requestBuilderFocus(`${scoringFocusBase}:score`);
          updateScoring(question, onUpdate, { score: Number(value) || 0 });
        }, {
          type: "number",
          min: "0",
          step: "1",
          "aria-label": "Puntuacion o score",
          dataset: { builderFocusKey: `${scoringFocusBase}:score` }
        })),
        field("Peso", input(scoring.weight, (value) => {
          requestBuilderFocus(`${scoringFocusBase}:weight`);
          updateScoring(question, onUpdate, { weight: Number(value) || 0 });
        }, {
          type: "number",
          min: "0",
          step: "0.1",
          "aria-label": "Peso o ponderacion",
          dataset: { builderFocusKey: `${scoringFocusBase}:weight` }
        }))
      ]),
      usesInlineCorrectAnswer
        ? el("p", { class: "muted", text: inlineCorrectAnswerHint(t, question.type) })
        : renderCorrectAnswerEditor(question, scoring, onUpdate, scoringFocusBase, t),
      field("Explicacion de la correccion", textarea(scoring.rationale || "", (value) => {
        requestBuilderFocus(`${scoringFocusBase}:rationale`);
        updateScoring(question, onUpdate, { rationale: value });
      }, {
        rows: 4,
        dataset: { builderFocusKey: `${scoringFocusBase}:rationale` }
      }), scoringHintForType(t, question.type))
    ]) : el("p", { class: "muted", text: isNonScorableType(question.type)
      ? t("scoringDisabledInfo", {}, "Este tipo es informativo y no se puntua.")
      : t("scoringEmptyInfo", {}, "Activa la puntuacion para guardar score, peso, respuesta correcta y razonamiento.") })
  ]);
}

function renderCorrectAnswerEditor(question, scoring, onUpdate, focusBase, t) {
  if (["radio", "dropdown", "emojiScale", "imageChoice", "imageCompare"].includes(question.type)) {
    const options = (question.choices || []).map((choice) => ({
      value: choice.value,
      label: choice.text || choice.value
    }));
    return field("Respuesta correcta", select(scoring.correctAnswer, options, (value) => {
      requestBuilderFocus(`${focusBase}:correctAnswer`);
      updateScoring(question, onUpdate, { correctAnswer: value });
    }, {
      dataset: { builderFocusKey: `${focusBase}:correctAnswer`, keepBooleanLabels: "true" }
    }));
  }

  if (question.type === "boolean") {
    const labels = getBooleanLabels(question, {
      trueLabel: t("yes", {}, "Si"),
      falseLabel: t("no", {}, "No")
    });

    return field("Respuesta correcta", select(String(scoring.correctAnswer), [
      { value: "true", label: labels.trueLabel },
      { value: "false", label: labels.falseLabel }
    ], (value) => {
      requestBuilderFocus(`${focusBase}:correctAnswer`);
      updateScoring(question, onUpdate, { correctAnswer: value === "true" });
    }, {
      dataset: { builderFocusKey: `${focusBase}:correctAnswer` }
    }));
  }

  if (question.type === "rating") {
    const min = Number(question.rateMin) || 1;
    const max = Math.max(min, Number(question.rateMax) || 5);
    const options = Array.from({ length: max - min + 1 }, (_, index) => ({
      value: String(min + index),
      label: String(min + index)
    }));
    return field("Respuesta correcta", select(String(scoring.correctAnswer), options, (value) => {
      requestBuilderFocus(`${focusBase}:correctAnswer`);
      updateScoring(question, onUpdate, { correctAnswer: Number(value) });
    }, {
      dataset: { builderFocusKey: `${focusBase}:correctAnswer` }
    }));
  }

  if (["checkbox", "ranking"].includes(question.type)) {
    return field("Respuesta correcta", textarea((scoring.correctAnswer || []).join("\n"), (value) => {
      requestBuilderFocus(`${focusBase}:correctAnswer`);
      updateScoring(question, onUpdate, {
        correctAnswer: value.split("\n").map((item) => item.trim()).filter(Boolean)
      });
    }, {
      rows: 4,
      dataset: { builderFocusKey: `${focusBase}:correctAnswer` }
    }), t("correctAnswerListHint", {}, "Usa un valor tecnico por linea, en el orden correcto."));
  }

  if (question.type === "matrix") {
    return field("Respuesta correcta", textarea(JSON.stringify(scoring.correctAnswer || {}, null, 2), (value) => {
      requestBuilderFocus(`${focusBase}:correctAnswer`);
      try {
        updateScoring(question, onUpdate, { correctAnswer: JSON.parse(value) });
      } catch {
        // Mantener el texto editable hasta que el JSON sea valido.
      }
    }, {
      rows: 6,
      dataset: { builderFocusKey: `${focusBase}:correctAnswer` }
    }), t("correctAnswerMatrixHint", {}, "JSON por fila, por ejemplo {\n  \"fila\": \"columna\"\n}"));
  }

  return field("Respuesta correcta", input(scoring.correctAnswer || "", (value) => {
    requestBuilderFocus(`${focusBase}:correctAnswer`);
    updateScoring(question, onUpdate, { correctAnswer: value });
  }, {
    "aria-label": "Respuesta correcta para esta opcion",
    dataset: { builderFocusKey: `${focusBase}:correctAnswer` }
  }));
}
