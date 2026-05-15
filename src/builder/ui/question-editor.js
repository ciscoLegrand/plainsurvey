import { createQuestion, QUESTION_TYPES } from "../../core/schema.js";
import { el, field, input, select, textarea } from "../dom.js";
import { remapScoring } from "../scoring.js";
import { slugName } from "./common.js";
import { renderScoringEditor } from "./editors/scoring-editor.js";
import { renderTypeOptions } from "./editors/type-options-editor.js";
import { renderVisibilityEditor } from "./editors/visibility-editor.js";

export function renderQuestionEditor(survey, page, question, questionIndex, actions, options = {}, t = (key, _vars, fallback = key) => fallback) {
  const isDraft = options.mode === "draft";
  const update = (patch) => {
    if (isDraft) actions.updateQuestionDraft(patch);
    else actions.updateQuestion(page.id, question.id, patch, { render: "question" });
  };
  const removeButton = isDraft ? null : el("button", {
    class: "icon-button",
    type: "button",
    title: "Eliminar pregunta",
    disabled: page.elements.length === 1,
    onclick: () => actions.removeQuestion(page.id, question.id),
    text: "x"
  });

  return el("div", { class: `property-editor builder-editor builder-editor-question ${isDraft ? "is-draft" : "is-existing"}` }, [
    el("div", { class: "section-heading compact" }, [
      el("div", {}, [
        el("p", { class: "eyebrow", text: isDraft ? "Plantilla de pregunta" : `Pregunta ${questionIndex + 1}` }),
        el("h2", { text: question.title })
      ]),
      removeButton
    ]),
    isDraft ? el("p", { class: "muted", text: "Configura este tipo y usa los botones + del preview para insertarlo en una pagina." }) : null,
    el("div", { class: "builder-form-card form-grid builder-question-basics" }, [
      field(t("type", {}, "Tipo"), select(question.type, QUESTION_TYPES, (type) => {
        const next = {
          ...createQuestion(type),
          id: question.id,
          name: question.name,
          title: question.title,
          description: question.description,
          required: question.required,
          scoring: remapScoring(question.scoring, createQuestion(type), question)
        };
        update(next);
      })),
      field(t("technicalName", {}, "Nombre tecnico"), input(question.name, (value) => update({ name: slugName(value) }), { "aria-label": t("questionNameAria", {}, "Nombre tecnico de la pregunta") })),
      field(t("questionTitle", {}, "Titulo de pregunta"), input(question.title, (value) => update({ title: value }), { "aria-label": t("questionTitleAria", {}, "Titulo de la pregunta") })),
      field(t("required", {}, "Obligatoria"), el("input", {
        type: "checkbox",
        checked: question.required,
        "aria-label": t("questionRequiredAria", {}, "Pregunta obligatoria"),
        onchange: (event) => update({ required: event.target.checked })
      }))
    ]),
    el("div", { class: "builder-form-card builder-form-stack" }, [
      field(t("questionDescription", {}, "Descripcion de pregunta"), textarea(question.description, (value) => update({ description: value }), { rows: 2, "aria-label": t("questionDescriptionAria", {}, "Descripcion de la pregunta") }))
    ]),
    renderTypeOptions(question, t, update),
    renderScoringEditor(question, update, t),
    isDraft ? null : renderVisibilityEditor(survey, page, question, actions)
  ]);
}
