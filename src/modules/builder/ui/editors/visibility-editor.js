import { OPERATORS } from "../../../../core/schema.js";
import { el, field, input, select } from "../../dom.js";
import { requestBuilderFocus } from "../focus-state.js";

export function renderVisibilityEditor(survey, page, question, actions) {
  const availableQuestions = survey.pages
    .flatMap((candidatePage) => candidatePage.elements)
    .filter((candidate) => candidate.id !== question.id)
    .map((candidate) => ({ value: candidate.name, label: candidate.title || candidate.name }));

  const enabled = Boolean(question.visibleIf?.question);
  const rule = question.visibleIf || { question: availableQuestions[0]?.value, operator: "equals", value: "" };
  const visibilityFocusBase = `${question.id}:visibility`;

  return el("details", { class: "visibility-editor", open: enabled }, [
    el("summary", { text: "Logica de visibilidad" }),
    el("label", { class: "check-row" }, [
      el("input", {
        type: "checkbox",
        dataset: { builderFocusKey: `${question.id}:visibility-toggle` },
        checked: enabled,
        disabled: availableQuestions.length === 0,
        onchange: (event) => {
          requestBuilderFocus(`${question.id}:visibility-toggle`);
          actions.updateQuestion(page.id, question.id, {
            visibleIf: event.target.checked ? rule : undefined
          });
        }
      }),
      "Mostrar esta pregunta solo si se cumple una regla"
    ]),
    enabled ? el("div", { class: "form-grid" }, [
      field("Pregunta", select(rule.question, availableQuestions, (value) => {
        requestBuilderFocus(`${visibilityFocusBase}:question`);
        actions.updateQuestion(page.id, question.id, { visibleIf: { ...rule, question: value } });
      }, {
        dataset: { builderFocusKey: `${visibilityFocusBase}:question` }
      })),
      field("Operador", select(rule.operator, OPERATORS, (value) => {
        requestBuilderFocus(`${visibilityFocusBase}:operator`);
        actions.updateQuestion(page.id, question.id, { visibleIf: { ...rule, operator: value } });
      }, {
        dataset: { builderFocusKey: `${visibilityFocusBase}:operator` }
      })),
      field("Valor", input(rule.value || "", (value) => {
        requestBuilderFocus(`${visibilityFocusBase}:value`);
        actions.updateQuestion(page.id, question.id, { visibleIf: { ...rule, value } });
      }, {
        dataset: { builderFocusKey: `${visibilityFocusBase}:value` }
      }))
    ]) : el("p", { class: "muted", text: availableQuestions.length ? "Activa la regla para configurar condiciones." : "Anade otra pregunta para usar condiciones." })
  ]);
}