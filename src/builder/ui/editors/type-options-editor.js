import { createQuestion, hasChoices, QUESTION_TYPES } from "../../../core/schema.js";
import { el, field, input, select, textarea } from "../../dom.js";
import { choiceHelpForType, remapScoringForChoices, updateRankingCorrectAnswer, updateScoring } from "../../scoring.js";
import { requestBuilderFocus } from "../focus-state.js";
import { slugName } from "../common.js";

export function renderTypeOptions(question, t, onUpdate) {
  if (["imageChoice", "imageCompare"].includes(question.type)) return renderImageChoices(question, onUpdate, t);
  if (question.type === "panel") return renderPanelEditor(question, onUpdate, t);
  if (hasChoices(question.type)) return renderChoices(question, onUpdate, t);
  if (question.type === "emojiScale") return renderEmojiChoices(question, onUpdate, t);
  if (question.type === "matrix") return renderMatrixEditor(question, onUpdate);
  if (question.type === "svgNote") {
    return el("div", { class: "form-grid" }, [
      field("Variante visual", select(question.variant, [
        { value: "spark", label: "Destello" },
        { value: "waves", label: "Ondas" },
        { value: "orbit", label: "Orbita" }
      ], (value) => onUpdate({ variant: value })))
    ]);
  }
  if (question.type === "codeBlock") {
    return el("div", { class: "form-grid single" }, [
      field("Lenguaje", input(question.language || "", (value) => onUpdate({ language: value }))),
      field("Codigo", textarea(question.code || "", (value) => onUpdate({ code: value }), { rows: 8 }))
    ]);
  }

  if (question.type === "contentBlock") {
    return el("div", { class: "form-grid single" }, [
      field("Cuerpo del bloque", textarea(question.body || "", (value) => onUpdate({ body: value }), { rows: 8 }), "Texto libre: historia, instrucciones, enunciado..."),
      field("URL de imagen (opcional)", input(question.imageUrl || "", (value) => onUpdate({ imageUrl: value }), { type: "url", placeholder: "https://..." })),
      field("Pie de imagen", input(question.imageCaption || "", (value) => onUpdate({ imageCaption: value })))
    ]);
  }

  if (question.type === "rating") {
    return el("div", { class: "form-grid" }, [
      field("Minimo", input(question.rateMin, (value) => onUpdate({ rateMin: Number(value) || 1 }), { type: "number", min: "1" })),
      field("Maximo", input(question.rateMax, (value) => onUpdate({ rateMax: Number(value) || 5 }), { type: "number", min: "2" }))
    ]);
  }

  if (["text", "textarea"].includes(question.type)) {
    return field("Placeholder", input(question.placeholder || "", (value) => onUpdate({ placeholder: value })));
  }

  return el("div");
}

function renderEmojiChoices(question, onUpdate, t) {
  const scoringEnabled = Boolean(question.scoring?.enabled);

  return el("div", { class: "choice-editor" }, [
    el("div", { class: "choice-header" }, [
      el("strong", { text: "Caras" }),
      el("button", {
        class: "button button-secondary",
        type: "button",
        onclick: () => onUpdate({
          choices: [...question.choices, { value: `cara_${question.choices.length + 1}`, text: `Cara ${question.choices.length + 1}`, emoji: "🙂" }]
        }),
        text: "Anadir cara"
      })
    ]),
    scoringEnabled ? el("p", { class: "muted choice-help", text: t("emojiCorrectHelp", {}, "Marca aqui la cara correcta para esta pregunta puntuable.") }) : null,
    ...question.choices.map((choice, index) => el("div", { class: `emoji-choice-row ${scoringEnabled ? "with-correct" : ""}` }, [
      input(choice.emoji, (value) => updateChoice(question, index, { emoji: value }, onUpdate), { "aria-label": "Emoji", maxlength: "4" }),
      input(choice.value, (value) => updateChoice(question, index, { value: slugName(value) }, onUpdate), { "aria-label": "Valor" }),
      input(choice.text, (value) => updateChoice(question, index, { text: value }, onUpdate), { "aria-label": "Texto" }),
      scoringEnabled ? renderChoiceCorrectnessControl(question, choice, onUpdate, t) : null,
      el("button", {
        class: "icon-button",
        type: "button",
        title: "Eliminar cara",
        disabled: question.choices.length === 1,
        onclick: () => removeChoice(question, index, onUpdate),
        text: "x"
      })
    ]))
  ]);
}

function renderMatrixEditor(question, onUpdate) {
  return el("div", { class: "matrix-builder" }, [
    renderMatrixAxis("Filas", question.rows, (rows) => onUpdate({ rows })),
    renderMatrixAxis("Columnas", question.columns, (columns) => onUpdate({ columns }))
  ]);
}

function renderMatrixAxis(title, items, onChange) {
  return el("div", { class: "choice-editor" }, [
    el("div", { class: "choice-header" }, [
      el("strong", { text: title }),
      el("button", {
        class: "button button-secondary",
        type: "button",
        onclick: () => onChange([...items, { value: slugName(`${title}_${items.length + 1}`), text: `${title} ${items.length + 1}` }]),
        text: "Anadir"
      })
    ]),
    ...items.map((item, index) => el("div", { class: "choice-row" }, [
      input(item.value, (value) => onChange(updateItem(items, index, { value: slugName(value) })), { "aria-label": "Valor" }),
      input(item.text, (value) => onChange(updateItem(items, index, { text: value })), { "aria-label": "Texto" }),
      el("button", {
        class: "icon-button",
        type: "button",
        title: "Eliminar",
        disabled: items.length === 1,
        onclick: () => onChange(items.filter((_, itemIndex) => itemIndex !== index)),
        text: "x"
      })
    ]))
  ]);
}

function renderImageChoices(question, onUpdate, t) {
  const scoringEnabled = Boolean(question.scoring?.enabled);

  return el("div", { class: "choice-editor image-choice-editor" }, [
    el("div", { class: "choice-header" }, [
      el("strong", { text: question.type === "imageCompare" ? "Imagenes a comparar" : "Opciones con imagen" }),
      el("button", {
        class: "button button-secondary",
        type: "button",
        onclick: () => onUpdate({
          choices: [...question.choices, {
            value: `imagen_${question.choices.length + 1}`,
            text: `Imagen ${question.choices.length + 1}`,
            imageUrl: "",
            alt: "",
            caption: ""
          }]
        }),
        text: "Anadir imagen"
      })
    ]),
    scoringEnabled ? el("p", { class: "muted choice-help", text: choiceHelpForType(t, question.type) }) : null,
    ...question.choices.map((choice, index) => el("div", { class: `choice-row image-choice-row ${scoringEnabled ? "with-correct" : ""}` }, [
      input(choice.value, (value) => updateChoice(question, index, { value: slugName(value) }, onUpdate), { "aria-label": "Valor" }),
      input(choice.text, (value) => updateChoice(question, index, { text: value }, onUpdate), { "aria-label": "Texto" }),
      input(choice.imageUrl || "", (value) => updateChoice(question, index, { imageUrl: value }, onUpdate), { "aria-label": "URL de imagen", type: "url", placeholder: "https://..." }),
      input(choice.caption || "", (value) => updateChoice(question, index, { caption: value }, onUpdate), { "aria-label": "Criterio o pie" }),
      scoringEnabled ? renderChoiceCorrectnessControl(question, choice, onUpdate, t) : null,
      el("button", {
        class: "icon-button",
        type: "button",
        title: "Eliminar imagen",
        disabled: question.choices.length === 1,
        onclick: () => removeChoice(question, index, onUpdate),
        text: "x"
      })
    ]))
  ]);
}

function renderPanelEditor(question, onUpdate, t) {
  const nestedQuestions = question.elements || [];

  return el("div", { class: "choice-editor nested-panel-editor" }, [
    el("div", { class: "choice-header" }, [
      el("strong", { text: "Preguntas anidadas" }),
      el("button", {
        class: "button button-secondary",
        type: "button",
        onclick: () => onUpdate({ elements: [...nestedQuestions, createQuestion("text", { title: `Pregunta anidada ${nestedQuestions.length + 1}` })] }),
        text: "Anadir pregunta"
      })
    ]),
    ...nestedQuestions.map((nestedQuestion, index) => el("details", { class: "nested-question-editor", open: index === 0 }, [
      el("summary", { text: `${index + 1}. ${nestedQuestion.title || nestedQuestion.name}` }),
      el("div", { class: "form-grid" }, [
        field("Tipo", select(nestedQuestion.type, QUESTION_TYPES.filter((type) => type.value !== "panel"), (type) => {
          updateNestedQuestion(question, index, { ...createQuestion(type), id: nestedQuestion.id, name: nestedQuestion.name }, onUpdate);
        })),
        field("Nombre tecnico", input(nestedQuestion.name, (value) => updateNestedQuestion(question, index, { name: slugName(value) }, onUpdate))),
        field("Titulo", input(nestedQuestion.title, (value) => updateNestedQuestion(question, index, { title: value }, onUpdate))),
        field("Obligatoria", el("input", {
          type: "checkbox",
          checked: nestedQuestion.required,
          onchange: (event) => updateNestedQuestion(question, index, { required: event.target.checked }, onUpdate)
        }))
      ]),
      field("Descripcion", textarea(nestedQuestion.description || "", (value) => updateNestedQuestion(question, index, { description: value }, onUpdate), { rows: 2 })),
      renderTypeOptions(nestedQuestion, t, (patch) => updateNestedQuestion(question, index, patch, onUpdate)),
      el("button", {
        class: "button button-danger",
        type: "button",
        disabled: nestedQuestions.length === 1,
        onclick: () => onUpdate({ elements: nestedQuestions.filter((_, itemIndex) => itemIndex !== index) }),
        text: "Eliminar pregunta anidada"
      })
    ]))
  ]);
}

function renderChoices(question, onUpdate, t) {
  const scoringEnabled = Boolean(question.scoring?.enabled);

  return el("div", { class: "choice-editor" }, [
    el("div", { class: "choice-header" }, [
      el("strong", { text: "Opciones" }),
      el("button", {
        class: "button button-secondary",
        type: "button",
        onclick: () => onUpdate({
          choices: [...question.choices, { value: `opcion_${question.choices.length + 1}`, text: `Opcion ${question.choices.length + 1}` }]
        }),
        text: "Anadir opcion"
      })
    ]),
    scoringEnabled ? el("p", { class: "muted choice-help", text: choiceHelpForType(t, question.type) }) : null,
    ...question.choices.map((choice, index) => {
      const baseRow = el("div", { class: "choice-row" }, [
        input(choice.value, (value) => updateChoice(question, index, { value: slugName(value) }, onUpdate), { "aria-label": "Valor" }),
        input(choice.text, (value) => updateChoice(question, index, { text: value }, onUpdate), { "aria-label": "Texto" }),
        el("button", {
          class: "icon-button",
          type: "button",
          title: "Eliminar opcion",
          disabled: question.choices.length === 1,
          onclick: () => removeChoice(question, index, onUpdate),
          text: "x"
        })
      ]);

      if (!scoringEnabled) return baseRow;

      return el("div", { class: "choice-row-stack" }, [
        baseRow,
        el("div", { class: "choice-row-correctness" }, [
          renderChoiceCorrectnessControl(question, choice, onUpdate, t)
        ])
      ]);
    })
  ]);
}

function renderChoiceCorrectnessControl(question, choice, onUpdate, t) {
  if (["radio", "dropdown", "emojiScale"].includes(question.type)) {
    const focusKey = `${question.id}:choice-correct:${choice.value}`;
    return el("label", { class: "choice-correctness" }, [
      el("input", {
        type: "radio",
        name: `${question.id}_correct_answer`,
        dataset: { builderFocusKey: focusKey },
        checked: question.scoring?.correctAnswer === choice.value,
        onchange: () => {
          requestBuilderFocus(focusKey);
          updateScoring(question, onUpdate, { correctAnswer: choice.value });
        }
      }),
      el("span", { text: t("choiceCorrect", {}, "Correcta") })
    ]);
  }

  if (question.type === "checkbox") {
    const selected = Array.isArray(question.scoring?.correctAnswer) && question.scoring.correctAnswer.includes(choice.value);
    const focusKey = `${question.id}:choice-correct:${choice.value}`;
    return el("label", { class: "choice-correctness" }, [
      el("input", {
        type: "checkbox",
        dataset: { builderFocusKey: focusKey },
        checked: selected,
        onchange: (event) => {
          requestBuilderFocus(focusKey);
          updateScoring(question, onUpdate, {
            correctAnswer: event.target.checked
              ? [...new Set([...(question.scoring?.correctAnswer || []), choice.value])]
              : (question.scoring?.correctAnswer || []).filter((value) => value !== choice.value)
          });
        }
      }),
      el("span", { text: t("choiceCorrect", {}, "Correcta") })
    ]);
  }

  if (question.type === "ranking") {
    const orderMap = Object.fromEntries((question.scoring?.correctAnswer || []).map((value, index) => [value, index + 1]));
    const focusKey = `${question.id}:choice-order:${choice.value}`;
    return field("Orden", input(orderMap[choice.value] || "", (value) => {
      requestBuilderFocus(focusKey);
      updateScoring(question, onUpdate, {
        correctAnswer: updateRankingCorrectAnswer(question, choice.value, value)
      });
    }, {
      type: "number",
      min: "1",
      max: String(question.choices.length),
      dataset: { builderFocusKey: focusKey }
    }), t("rankingHint", {}, "1 es la primera posicion correcta."));
  }

  return null;
}

function updateItem(items, index, patch) {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function updateChoice(question, index, patch, onUpdate) {
  const currentChoice = question.choices[index];
  const nextChoices = question.choices.map((choice, choiceIndex) => choiceIndex === index ? { ...choice, ...patch } : choice);

  onUpdate({
    choices: nextChoices,
    scoring: remapScoringForChoices(question, currentChoice?.value, nextChoices, { nextValue: nextChoices[index]?.value })
  });
}

function updateNestedQuestion(question, index, patch, onUpdate) {
  onUpdate({
    elements: (question.elements || []).map((nestedQuestion, nestedIndex) => {
      return nestedIndex === index ? { ...nestedQuestion, ...patch } : nestedQuestion;
    })
  });
}

function removeChoice(question, index, onUpdate) {
  const removedValue = question.choices[index]?.value;
  const nextChoices = question.choices.filter((_, choiceIndex) => choiceIndex !== index);

  onUpdate({
    choices: nextChoices,
    scoring: remapScoringForChoices(question, removedValue, nextChoices, { removed: true })
  });
}