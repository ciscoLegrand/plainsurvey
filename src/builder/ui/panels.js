import { QUESTION_TYPES } from "../../core/schema.js";
import { el, field, input, textarea } from "../dom.js";
import { renderPreviewControl } from "../preview.js";
import { QUESTION_TYPE_SUMMARIES, labelForType, resolveConfigSelection } from "./common.js";
import { renderQuestionEditor } from "./question-editor.js";

export function renderBuilderLayout(state, actions, i18n = {}) {
  const t = i18n.t || ((key, _vars, fallback = key) => fallback);
  const typeLabels = i18n.typeLabels || Object.fromEntries(QUESTION_TYPES.map((type) => [type.value, type.label]));
  const typeSummaries = i18n.typeSummaries || QUESTION_TYPE_SUMMARIES;
  const survey = state.survey;
  const selected = resolveConfigSelection(survey, state.selectedConfigNode, state.selectedQuestionId);
  const selectedQuestionId = selected.type === "question" ? selected.question.id : null;

  return el("div", { class: "builder-layout" }, [
    renderToolboxPanel(state, actions, t, typeLabels, typeSummaries),
    renderPreviewPanel(survey, selectedQuestionId, actions, t, typeLabels),
    renderPropertiesPanel(survey, selected, state.questionDraft, actions, t, typeLabels)
  ]);
}

function renderToolboxPanel(state, actions, t, typeLabels, typeSummaries) {
  const questionDraft = state.questionDraft;
  return el("aside", { class: "side-panel builder-toolbox", dataset: { floatPanel: "toolbox" } }, [
    el("div", { class: "panel-float-handle", dataset: { panelHandle: "toolbox" } }, [
      el("span", { class: "panel-float-grip", text: "⠿" }),
      el("span", { class: "panel-float-label", text: t("toolboxTitle", {}, "Question bank") }),
      el("button", { class: "panel-minimize-btn", type: "button", title: t("minimize", {}, "Minimize"), dataset: { minimizePanel: "toolbox" } })
    ]),
    el("div", { class: "panel-scroll-body" }, [
      el("div", { class: "builder-panel-section panel-intro" }, [
        el("p", { class: "eyebrow", text: t("builderEyebrow", {}, "Builder") }),
        el("h2", { text: t("toolboxTitle", {}, "Question bank") }),
        el("p", { class: "muted", text: t("toolboxBody", {}, "Drag or select a type to insert it into the active page.") })
      ]),
      el("div", { class: "builder-panel-section question-palette" }, [
        el("p", { class: "eyebrow", text: t("questionTypes", {}, "Question types") }),
        ...QUESTION_TYPES.map((type) => el("button", {
          class: `palette-item ${questionDraft.type === type.value ? "is-selected" : ""}`,
          type: "button",
          dataset: { dragKind: "palette", questionType: type.value },
          onclick: () => actions.selectQuestionType(type.value),
          title: t("configureType", { label: typeLabels[type.value] || type.label }, `Configure ${type.label}`)
        }, [
          el("span", { class: "drag-handle", text: "::" }),
          el("span", { class: "palette-copy" }, [
            el("strong", { text: typeLabels[type.value] || type.label }),
            el("small", { text: typeSummaries[type.value] || t("questionCounter", { index: "" }, "Question") })
          ])
        ]))
      ])
    ])
  ]);
}

function renderPreviewPanel(survey, selectedQuestionId, actions, t, typeLabels) {
  return el("main", { class: "builder-preview" }, survey.pages.map((page, pageIndex) => {
    return el("section", { class: "page-editor page-preview builder-canvas-page", dataset: { pageId: page.id } }, [
      el("div", { class: "section-heading" }, [
        el("div", {}, [
          el("p", { class: "eyebrow", text: t("pageCounter", { index: pageIndex + 1 }, `Page ${pageIndex + 1}`) }),
          el("h2", { text: page.title })
        ]),
        el("div", { class: "inline-actions" }, [
          el("button", {
            class: "icon-button add-button",
            type: "button",
            title: t("addQuestionAtEnd", {}, "Add question to the end of this page"),
            onclick: () => actions.addQuestion(page.id),
            text: "+"
          }),
          el("button", {
            class: "icon-button",
            type: "button",
            title: t("deletePage", {}, "Delete page"),
            disabled: survey.pages.length === 1,
            onclick: () => actions.removePage(page.id),
            text: "x"
          })
        ])
      ]),
      el("div", { class: "page-settings-inline builder-form-card" }, [
        field(t("pageTitle", {}, "Page title"), input(page.title, (value) => actions.updatePage(page.id, { title: value }))),
        field(t("pageDescription", {}, "Page description"), input(page.description, (value) => actions.updatePage(page.id, { description: value })))
      ]),
      renderQuestionInsert(page.id, 0, actions),
      el("div", { class: "preview-question-list" }, page.elements.map((question, questionIndex) => {
        return [
          renderQuestionPreview(page, question, questionIndex, selectedQuestionId, actions, t, typeLabels),
          renderQuestionInsert(page.id, questionIndex + 1, actions)
        ];
      }).flat())
    ]);
  }).concat([
    el("button", { class: "button button-secondary add-page-inline", type: "button", onclick: actions.addPage, text: t("addPageInline", {}, "+ Add page") })
  ]));
}

function renderQuestionInsert(pageId, insertIndex, actions) {
  return el("div", { class: "question-dropzone", dataset: { pageId, insertIndex: String(insertIndex) } }, [
    el("button", {
      class: "insert-question-button",
      type: "button",
      title: "Add question here",
      onclick: () => actions.insertQuestion(pageId, undefined, insertIndex),
      text: "+"
    })
  ]);
}

function renderQuestionPreview(page, question, questionIndex, selectedQuestionId, actions, t, typeLabels) {
  const isSelected = question.id === selectedQuestionId;
  return el("article", {
    class: `preview-question ${isSelected ? "is-selected" : ""}`,
    dataset: { dragKind: "question", pageId: page.id, questionId: question.id },
    onclick: () => actions.selectQuestion(question.id)
  }, [
    el("div", { class: "preview-question-header" }, [
      el("span", { class: "drag-handle", title: t("dragHandle", {}, "Drag"), text: "::" }),
      el("div", {}, [
        el("p", { class: "eyebrow", text: t("questionCounterWithType", { index: questionIndex + 1, type: typeLabels[question.type] || labelForType(question.type) }, `Question ${questionIndex + 1}`) }),
        el("h3", { text: question.title })
      ]),
      el("button", {
        class: "icon-button",
        type: "button",
        title: t("deleteQuestion", {}, "Delete question"),
        disabled: page.elements.length === 1,
        onclick: (event) => {
          event.stopPropagation();
          actions.removeQuestion(page.id, question.id);
        },
        text: "x"
      })
    ]),
    question.description ? el("p", { class: "muted", text: question.description }) : null,
    renderPreviewControl(question, { labelForType, t })
  ]);
}

function renderPropertiesPanel(survey, selected, questionDraft, actions, t, typeLabels) {
  return el("aside", { class: "side-panel properties-panel config-tree-panel", dataset: { floatPanel: "properties" } }, [
    el("div", { class: "panel-float-handle", dataset: { panelHandle: "properties" } }, [
      el("span", { class: "panel-float-grip", text: "⠿" }),
      el("span", { class: "panel-float-label", text: "Configurador" }),
      el("button", { class: "panel-minimize-btn", type: "button", title: "Minimizar", dataset: { minimizePanel: "properties" } })
    ]),
    el("div", { class: "panel-scroll-body" }, [
      el("div", { class: "builder-config-actions property-actions" }, [
        el("button", { class: "button", type: "button", onclick: actions.openJson, text: "Abrir JSON" })
      ]),
      renderConfiguratorTree(survey, selected, questionDraft, actions, typeLabels),
      renderSelectionEditor(survey, selected, questionDraft, actions, t)
    ])
  ]);
}

function renderSelectionEditor(survey, selected, questionDraft, actions, t) {
  if (selected.type === "question") {
    return renderQuestionEditor(survey, selected.page, selected.question, selected.questionIndex, actions, {
      mode: "existing"
    }, t);
  }

  if (selected.type === "page") {
    return renderPageEditor(survey, selected.page, selected.pageIndex, actions);
  }

  if (selected.type === "draft") {
    return renderQuestionEditor(survey, { id: "draft-page", elements: [questionDraft] }, questionDraft, null, actions, {
      mode: "draft"
    }, t);
  }

  return renderSurveyEditor(survey, actions);
}

function renderConfiguratorTree(survey, selected, questionDraft, actions, typeLabels) {
  return el("section", { class: "config-tree config-tree-card" }, [
    el("details", { class: "config-tree-details", open: selected.type === "page" || selected.type === "question" }, [
      el("summary", { class: "config-tree-summary" }, [
        el("span", { class: "config-tree-summary-icon" }),
        el("span", { text: "Árbol de estructura" })
      ]),
      el("div", { class: "config-tree-list" }, [
        renderTreeNode({
          level: 0,
          label: "Encuesta",
          meta: `${survey.pages.length} paginas`,
          selected: selected.type === "survey",
          onClick: () => actions.selectConfigNode({ type: "survey" })
        }),
        renderTreeNode({
          level: 1,
          label: `Plantilla (${labelForType(questionDraft.type)})`,
          meta: "Nueva pregunta",
          selected: selected.type === "draft",
          onClick: () => actions.selectConfigNode({ type: "draft" })
        }),
        el("div", { class: "tree-children tree-pages" }, survey.pages.map((page, pageIndex) => {
          const pageNode = renderTreeNode({
            level: 1,
            label: page.title,
            meta: `Pagina ${pageIndex + 1}`,
            selected: selected.type === "page" && selected.page.id === page.id,
            onClick: () => actions.selectConfigNode({ type: "page", pageId: page.id })
          });

          const questionNodes = el("div", { class: "tree-children tree-questions" }, page.elements.map((question, questionIndex) => {
            return renderTreeNode({
              level: 2,
              label: question.title,
              meta: `P${pageIndex + 1}.${questionIndex + 1} · ${typeLabels[question.type] || labelForType(question.type)}`,
              selected: selected.type === "question" && selected.question.id === question.id,
              onClick: () => actions.selectConfigNode({ type: "question", questionId: question.id })
            });
          }));

          return el("div", { class: "tree-branch" }, [pageNode, questionNodes]);
        }))
      ])
    ])
  ]);
}

function renderTreeNode({ level, label, meta, selected, onClick }) {
  return el("button", {
    class: `tree-node level-${level} ${selected ? "is-selected" : ""}`,
    type: "button",
    onclick: onClick
  }, [
    el("span", { class: "tree-node-title", text: label || "Sin titulo" }),
    el("span", { class: "tree-node-meta", text: meta })
  ]);
}

function renderSurveyEditor(survey, actions) {
  return el("div", { class: "property-editor builder-editor builder-editor-survey" }, [
    el("div", { class: "section-heading compact" }, [
      el("div", {}, [
        el("p", { class: "eyebrow", text: "Encuesta" }),
        el("h2", { text: survey.title })
      ])
    ]),
    el("div", { class: "builder-form-card builder-form-stack" }, [
      field("Titulo", input(survey.title, (value) => actions.updateSurvey({ title: value }))),
      field("Descripcion", textarea(survey.description, (value) => actions.updateSurvey({ description: value }), { rows: 3 }))
    ]),
    el("p", { class: "muted", text: `Total: ${survey.pages.length} paginas` })
  ]);
}

function renderPageEditor(survey, page, pageIndex, actions) {
  return el("div", { class: "property-editor builder-editor builder-editor-page" }, [
    el("div", { class: "section-heading compact" }, [
      el("div", {}, [
        el("p", { class: "eyebrow", text: `Pagina ${pageIndex + 1}` }),
        el("h2", { text: page.title })
      ]),
      el("button", {
        class: "icon-button",
        type: "button",
        title: "Eliminar pagina",
        disabled: survey.pages.length === 1,
        onclick: () => actions.removePage(page.id),
        text: "x"
      })
    ]),
    el("div", { class: "builder-form-card builder-form-stack" }, [
      field("Titulo de pagina", input(page.title, (value) => actions.updatePage(page.id, { title: value }))),
      field("Descripcion de pagina", textarea(page.description, (value) => actions.updatePage(page.id, { description: value }), { rows: 3 }))
    ]),
    el("p", { class: "muted", text: `Preguntas en esta pagina: ${page.elements.length}` })
  ]);
}