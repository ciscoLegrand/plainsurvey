import { createQuestion, getBooleanLabels, QUESTION_TYPES } from "../../core/schema.js";
import { el, field, imageInput, input, select, textarea } from "../dom.js";
import { renderPreviewControl } from "../preview.js";
import { createDefaultScoring, isNonScorableType, remapScoring } from "../scoring.js";
import { QUESTION_TYPE_SUMMARIES, labelForType, resolveConfigSelection, slugName } from "./common.js";
import { renderQuestionEditor } from "./question-editor.js";

export function renderBuilderLayout(state, actions, i18n = {}) {
  const t = i18n.t || ((key, _vars, fallback = key) => fallback);
  const typeLabels = i18n.typeLabels || Object.fromEntries(QUESTION_TYPES.map((type) => [type.value, type.label]));
  const typeSummaries = i18n.typeSummaries || QUESTION_TYPE_SUMMARIES;
  const survey = state.survey;
  const selected = resolveConfigSelection(survey, state.selectedConfigNode, state.selectedQuestionId);
  const selectedQuestionId = selected.type === "question" ? selected.question.id : null;
  const enteringQuestionId = state.enteringQuestionId || null;

  return el("div", { class: "builder-layout" }, [
    renderToolboxPanel(state, actions, t, typeLabels, typeSummaries),
    renderCenterWorkspace(state, survey, selectedQuestionId, enteringQuestionId, actions, t, typeLabels),
    renderPropertiesPanel(survey, selected, state.questionDraft, actions, t, typeLabels)
  ]);
}

function renderToolboxPanel(state, actions, t, typeLabels, typeSummaries) {
  const questionDraft = state.questionDraft;
  return el("aside", { class: "side-panel builder-toolbox", dataset: { sidebarPanel: "toolbox" } }, [
    el("div", { class: "panel-float-handle", dataset: { panelHandle: "toolbox" } }, [
      icon("bank", "panel-icon"),
      el("span", { class: "panel-float-label", text: t("toolboxTitle", {}, "Question bank") }),
      el("button", { class: "panel-collapse-btn", type: "button", title: t("minimize", {}, "Minimize"), dataset: { toggleSidebar: "toolbox" } }, [
        icon("collapse", "panel-collapse-icon")
      ])
    ]),
    el("div", { class: "panel-scroll-body" }, [
      el("div", { class: "question-palette" }, [
        el("p", { class: "eyebrow", text: t("questionTypes", {}, "Question types") }),
        ...QUESTION_TYPES.map((type) => el("button", {
          class: `palette-item ${questionDraft.type === type.value ? "is-selected" : ""}`,
          type: "button",
          draggable: "true",
          dataset: { dragKind: "palette", questionType: type.value },
          onclick: () => actions.selectQuestionType(type.value),
          title: t("configureType", { label: typeLabels[type.value] || type.label }, `Configure ${type.label}`)
        }, [
          icon(type.value, "palette-icon"),
          el("span", { class: "palette-copy" }, [
            el("strong", { text: typeLabels[type.value] || type.label }),
            el("small", { text: typeSummaries[type.value] || t("questionCounter", { index: "" }, "Question") })
          ])
        ]))
      ])
    ])
  ]);
}

function renderCenterWorkspace(state, survey, selectedQuestionId, enteringQuestionId, actions, t, typeLabels) {
  const activeView = state.activeBuilderView || "builder";
  return el("div", { class: "builder-center-workspace" }, [
    renderBuilderTabs(activeView, actions, t),
    activeView === "json"
      ? renderJsonEditor(survey, state, actions)
      : activeView === "preview"
        ? renderRuntimePreview(survey, t, typeLabels)
        : renderPreviewPanel(survey, selectedQuestionId, enteringQuestionId, actions, t, typeLabels)
  ]);
}

function renderBuilderTabs(activeView, actions, t) {
  const tabs = [
    { key: "builder", label: t("builderTab", {}, "Constructor"), icon: "builder" },
    { key: "preview", label: t("previewTab", {}, "Vista previa"), icon: "preview" },
    { key: "json", label: t("jsonTab", {}, "Editor JSON"), icon: "json" }
  ];

  return el("nav", { class: "builder-view-tabs", "aria-label": "Builder views" }, tabs.map((tab) => el("button", {
    class: `builder-view-tab ${activeView === tab.key ? "is-active" : ""}`,
    type: "button",
    "aria-pressed": activeView === tab.key ? "true" : "false",
    onclick: () => actions.selectBuilderView(tab.key)
  }, [
    icon(tab.icon, "builder-view-tab-icon"),
    el("span", { text: tab.label })
  ])));
}

function renderJsonEditor(survey, state, actions) {
  return el("section", { class: "builder-json-editor page-editor" }, [
    el("div", { class: "section-heading" }, [
      el("div", {}, [
        el("p", { class: "eyebrow", text: "JSON" }),
        el("h2", { text: "JSON Editor" })
      ]),
      el("button", {
        class: "button button-secondary",
        type: "button",
        title: "Copy JSON",
        onclick: actions.copySurveyJson
      }, [
        icon("copy", "button-icon"),
        el("span", { text: state.jsonCopied ? "Copied" : "Copy JSON" })
      ]),
      el("button", {
        class: "button button-primary",
        type: "button",
        title: "Save JSON",
        onclick: actions.saveSurveyJson
      }, [
        icon("save", "button-icon"),
        el("span", { text: "Save JSON" })
      ])
    ]),
    el("textarea", {
      rows: 20,
      class: "ps-builder-control ps-builder-textarea builder-json-textarea",
      spellcheck: "false",
      "aria-label": "Survey JSON",
      oninput: (event) => actions.updateJsonDraft(event.target.value)
    }, [state.jsonDraft || JSON.stringify(survey, null, 2)]),
    state.jsonError ? el("p", { class: "ps-state-error", text: state.jsonError }) : null
  ]);
}

function renderRuntimePreview(survey, t, typeLabels) {
  return el("main", { class: "builder-preview builder-runtime-preview" }, [
    el("div", { dataset: { builderRuntimePreview: "true" } })
  ]);
}

function renderPreviewPanel(survey, selectedQuestionId, enteringQuestionId, actions, t, typeLabels) {
  return el("main", { class: "builder-preview" }, [
    renderSurveyBlock(survey, actions, t),
    ...survey.pages.map((page, pageIndex) => {
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
            title: "Clone page",
            onclick: () => actions.clonePage(page.id)
          }, [
            icon("copy", "button-icon")
          ]),
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
        field(t("pageTitle", {}, "Page title"), input(page.title, (value) => actions.updatePage(page.id, { title: value }, { render: false }), { "aria-label": t("pageTitle", {}, "Page title") })),
        field(t("pageDescription", {}, "Page description"), input(page.description, (value) => actions.updatePage(page.id, { description: value }, { render: false }), { "aria-label": t("pageDescription", {}, "Page description") }))
      ]),
      renderQuestionInsert(page.id, 0, actions),
      el("div", { class: "preview-question-list" }, page.elements.map((question, questionIndex) => {
        return [
          renderQuestionPreview(page, question, questionIndex, selectedQuestionId, enteringQuestionId, actions, t, typeLabels),
          renderQuestionInsert(page.id, questionIndex + 1, actions)
        ];
      }).flat())
    ]);
  }),
    el("button", { class: "button button-secondary add-page-inline", type: "button", onclick: actions.addPage, text: t("addPageInline", {}, "+ Add page") })
  ]);
}

function renderSurveyBlock(survey, actions, t) {
  return el("section", { class: "page-editor builder-survey-block" }, [
    el("div", { class: "section-heading" }, [
      el("div", {}, [
        el("p", { class: "eyebrow", text: t("survey", {}, "Encuesta") }),
        el("h2", { text: survey.title })
      ])
    ]),
    survey.imageUrl ? el("img", { class: "builder-survey-image", src: survey.imageUrl, alt: survey.title || "" }) : null,
    el("div", { class: "page-settings-inline builder-form-card" }, [
      field(t("surveyImage", {}, "Imagen de la encuesta"), imageInput(survey.imageUrl || "", (value) => actions.updateSurvey({ imageUrl: value }, { render: false }), { "aria-label": t("surveyImage", {}, "Imagen de la encuesta") })),
      field(t("surveyTitle", {}, "Titulo"), input(survey.title, (value) => actions.updateSurvey({ title: value }, { render: false }), { "aria-label": t("surveyTitle", {}, "Titulo") })),
      field(t("surveyDescription", {}, "Descripcion"), textarea(survey.description, (value) => actions.updateSurvey({ description: value }, { render: false }), { autoHeight: true, "aria-label": t("surveyDescription", {}, "Descripcion") }))
    ])
  ]);
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

function renderQuestionPreview(page, question, questionIndex, selectedQuestionId, enteringQuestionId, actions, t, typeLabels) {
  const isSelected = question.id === selectedQuestionId;
  const isEntering = question.id === enteringQuestionId;
  const update = (patch, options = {}) => actions.updateQuestion(page.id, question.id, patch, options);
  const updateType = (type) => {
    const nextBase = createQuestion(type);
    const nextQuestion = {
      ...nextBase,
      id: question.id,
      name: question.name,
      title: question.title,
      description: question.description,
      required: question.required,
      scoring: remapScoring(question.scoring, nextBase, question)
    };
    update(nextQuestion, { render: "question" });
  };

  return el("article", {
    class: `preview-question ${isSelected ? "is-selected" : ""} ${isEntering ? "is-entering" : ""}`,
    draggable: "true",
    dataset: { dragKind: "question", pageId: page.id, questionId: question.id },
    onclick: () => actions.selectQuestion(question.id)
  }, [
    el("div", { class: "preview-question-header" }, [
      el("span", { class: "drag-handle", title: t("dragHandle", {}, "Drag"), text: "::" }),
      el("div", { class: "preview-question-title-stack" }, [
        el("p", { class: "eyebrow", text: t("questionCounterWithType", { index: questionIndex + 1, type: typeLabels[question.type] || labelForType(question.type) }, `Question ${questionIndex + 1}`) }),
        input(question.title, (value) => update({ title: value }), {
          class: "builder-inline-title",
          "aria-label": "Question title",
          dataset: { builderFocusKey: `${question.id}:inline-title` },
          onclick: (event) => event.stopPropagation()
        })
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
    renderInlineScoringToggle(question, update, t),
    el("div", { class: "builder-inline-grid" }, [
      field(t("type", {}, "Tipo"), select(question.type, QUESTION_TYPES.map((type) => ({
        value: type.value,
        label: typeLabels[type.value] || type.label
      })), (value) => updateType(value), {
        "aria-label": "Question type",
        dataset: { builderFocusKey: `${question.id}:inline-type` },
        onclick: (event) => event.stopPropagation()
      })),
      field(t("technicalName", {}, "Nombre tecnico"), input(question.name, (value) => update({ name: slugName(value) }), {
        "aria-label": "Question name",
        dataset: { builderFocusKey: `${question.id}:inline-name` },
        onclick: (event) => event.stopPropagation()
      }))
    ]),
    field(t("questionDescription", {}, "Descripcion de pregunta"), textarea(question.description || "", (value) => update({ description: value }), {
      rows: 2,
      "aria-label": "Question description",
      dataset: { builderFocusKey: `${question.id}:inline-description` },
      onclick: (event) => event.stopPropagation()
    })),
    renderPreviewControl(question, { labelForType, t }),
    renderInlineQuestionOptions(question, update, t)
  ]);
}

function renderInlineQuestionOptions(question, update, t) {
  const isSimpleType = ["text", "textarea", "rating", "boolean"].includes(question.type);
  const content = renderInlineQuestionOptionsBody(question, update, t);
  if (!content) return null;

  return el("details", {
    class: `builder-inline-options ${isSimpleType ? "is-simple" : "is-advanced"}`,
    open: isSimpleType
  }, [
    el("summary", { text: t("quickEditOptions", {}, "Quick options") }),
    content
  ]);
}

function renderInlineScoringToggle(question, update, t) {
  const enabled = Boolean(question.scoring?.enabled);
  const disabled = isNonScorableType(question.type);
  const focusKey = `${question.id}:inline-scoring-toggle`;

  return el("label", {
    class: `builder-inline-scoring ${enabled ? "is-enabled" : ""} ${disabled ? "is-disabled" : ""}`,
    onclick: (event) => event.stopPropagation()
  }, [
    el("input", {
      type: "checkbox",
      checked: enabled,
      disabled,
      dataset: { builderFocusKey: focusKey },
      "aria-label": t("scoringToggleLabel", {}, "Marcar esta pregunta como puntuable"),
      onchange: (event) => {
        event.stopPropagation();
        update({
          scoring: event.target.checked ? createDefaultScoring(question) : undefined
        }, { render: "question" });
      }
    }),
    el("span", { text: enabled ? t("scoringEnabled", {}, "Puntuable") : t("scoringDisabled", {}, "Sin puntuacion") })
  ]);
}

function renderInlineQuestionOptionsBody(question, update, t) {
  if (["text", "textarea"].includes(question.type)) {
    return el("div", { class: "builder-inline-grid" }, [
      field("Placeholder", input(question.placeholder || "", (value) => update({ placeholder: value }, { render: "question" }), { "aria-label": "Placeholder", dataset: { builderFocusKey: `${question.id}:inline-placeholder` } }))
    ]);
  }

  if (["radio", "checkbox", "dropdown", "ranking"].includes(question.type)) {
    return renderChoiceConfigurator(question, update, "Choices");
  }

  if (question.type === "boolean") {
    const labels = getBooleanLabels(question, {
      trueLabel: t("yes", {}, "Si"),
      falseLabel: t("no", {}, "No")
    });

    return el("div", { class: "builder-inline-grid" }, [
      field(t("booleanTrueLabel", {}, "Texto valor verdadero"), input(labels.trueLabel, (value) => update({ trueLabel: value }, { render: "question" }), {
        "aria-label": t("booleanTrueLabelAria", {}, "Texto del valor verdadero"),
        dataset: { builderFocusKey: `${question.id}:inline-boolean-true-label` }
      })),
      field(t("booleanFalseLabel", {}, "Texto valor falso"), input(labels.falseLabel, (value) => update({ falseLabel: value }, { render: "question" }), {
        "aria-label": t("booleanFalseLabelAria", {}, "Texto del valor falso"),
        dataset: { builderFocusKey: `${question.id}:inline-boolean-false-label` }
      }))
    ]);
  }

  if (question.type === "emojiScale") {
    return renderChoiceConfigurator(question, update, "Faces", true);
  }

  if (["imageChoice", "imageCompare"].includes(question.type)) {
    return renderImageChoiceConfigurator(question, update);
  }

  if (question.type === "rating") {
    return el("div", { class: "builder-inline-grid" }, [
      field("Min", input(question.rateMin ?? 1, (value) => update({ rateMin: Number(value) || 1 }, { render: "question" }), { type: "number", min: "0", "aria-label": "Rating min", dataset: { builderFocusKey: `${question.id}:inline-rate-min` } })),
      field("Max", input(question.rateMax ?? 5, (value) => update({ rateMax: Number(value) || 5 }, { render: "question" }), { type: "number", min: "1", "aria-label": "Rating max", dataset: { builderFocusKey: `${question.id}:inline-rate-max` } }))
    ]);
  }

  if (question.type === "matrix") {
    return el("div", { class: "builder-inline-grid" }, [
      field("Rows", textarea((question.rows || []).map((item) => item.text).join("\n"), (value) => update({ rows: linesToChoices(value, "row") }, { render: "question" }), { rows: 3, "aria-label": "Matrix rows", dataset: { builderFocusKey: `${question.id}:inline-matrix-rows` } })),
      field("Columns", textarea((question.columns || []).map((item) => item.text).join("\n"), (value) => update({ columns: linesToChoices(value, "column") }, { render: "question" }), { rows: 3, "aria-label": "Matrix columns", dataset: { builderFocusKey: `${question.id}:inline-matrix-columns` } }))
    ]);
  }

  if (question.type === "svgNote") {
    return field("Variant", select(question.variant || "spark", [
      { value: "spark", label: "Spark" },
      { value: "waves", label: "Waves" },
      { value: "orbit", label: "Orbit" }
    ], (value) => update({ variant: value }, { render: "question" }), { "aria-label": "Visual note variant", dataset: { builderFocusKey: `${question.id}:inline-variant` } }));
  }

  if (question.type === "contentBlock") {
    return el("div", { class: "builder-inline-grid" }, [
      field("Body", textarea(question.body || "", (value) => update({ body: value }, { render: "question" }), { rows: 3, "aria-label": "Content body", dataset: { builderFocusKey: `${question.id}:inline-body` } })),
      field("Image", imageInput(question.imageUrl || "", (value) => update({ imageUrl: value }, { render: "question" }), { "aria-label": "Content image", dataset: { builderFocusKey: `${question.id}:inline-image` } }))
    ]);
  }

  if (question.type === "codeBlock") {
    return el("div", { class: "builder-inline-grid" }, [
      field("Language", input(question.language || "text", (value) => update({ language: value }, { render: "question" }), { "aria-label": "Code language", dataset: { builderFocusKey: `${question.id}:inline-language` } })),
      field("Code", textarea(question.code || "", (value) => update({ code: value }, { render: "question" }), { rows: 3, "aria-label": "Code", dataset: { builderFocusKey: `${question.id}:inline-code` } }))
    ]);
  }

  return null;
}

function renderChoiceConfigurator(question, update, label, includeEmoji = false) {
  return field(label, textarea((question.choices || []).map((choice) => {
    return includeEmoji ? `${choice.emoji || ""} ${choice.text}`.trim() : choice.text;
  }).join("\n"), (value) => update({ choices: linesToChoices(value, "option", includeEmoji) }, { render: "question" }), {
    rows: 4,
    "aria-label": label,
    dataset: { builderFocusKey: `${question.id}:inline-${slugName(label)}` }
  }));
}

function renderImageChoiceConfigurator(question, update) {
  return field("Images", textarea((question.choices || []).map((choice) => {
    return [choice.text, choice.imageUrl, choice.caption].filter(Boolean).join(" | ");
  }).join("\n"), (value) => update({ choices: linesToImageChoices(value) }, { render: "question" }), {
    rows: 4,
    "aria-label": "Image choices",
    dataset: { builderFocusKey: `${question.id}:inline-image-choices` }
  }));
}

function linesToChoices(value, prefix, includeEmoji = false) {
  return String(value).split("\n").map((line, index) => line.trim()).filter(Boolean).map((line, index) => {
    const emojiMatch = includeEmoji ? line.match(/^(\S+)\s+(.+)$/) : null;
    const text = emojiMatch ? emojiMatch[2] : line;
    return {
      value: `${prefix}_${index + 1}`,
      text,
      ...(emojiMatch ? { emoji: emojiMatch[1] } : {})
    };
  });
}

function linesToImageChoices(value) {
  return String(value).split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [text, imageUrl, caption] = line.split("|").map((part) => part.trim());
    return {
      value: `image_${index + 1}`,
      text: text || `Image ${index + 1}`,
      imageUrl: imageUrl || "",
      caption: caption || ""
    };
  });
}

function renderPropertiesPanel(survey, selected, questionDraft, actions, t, typeLabels) {
  return el("aside", { class: "side-panel properties-panel", dataset: { sidebarPanel: "properties" } }, [
    el("div", { class: "panel-float-handle", dataset: { panelHandle: "properties" } }, [
      icon("settings", "panel-icon"),
      el("span", { class: "panel-float-label", text: "Configurador" }),
      el("button", { class: "panel-collapse-btn", type: "button", title: "Minimizar", dataset: { toggleSidebar: "properties" } }, [
        icon("collapse", "panel-collapse-icon")
      ])
    ]),
    el("div", { class: "panel-scroll-body" }, [
      el("section", { class: "builder-side-card builder-editor-card" }, [
        renderSelectionEditor(survey, selected, questionDraft, actions, t)
      ])
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

function icon(name, className = "builder-svg-icon") {
  const paths = {
    bank: "<path d=\"M4 5.5h16v13H4z\"/><path d=\"M8 9h8M8 12h8M8 15h5\"/>",
    builder: "<path d=\"M4 5h16v14H4z\"/><path d=\"M4 10h16M9 10v9\"/>",
    preview: "<path d=\"M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
    settings: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1\"/>",
    collapse: "<path d=\"M15 6l-6 6 6 6\"/>",
    copy: "<path d=\"M8 8h10v12H8z\"/><path d=\"M6 16H4V4h12v2\"/>",
    save: "<path d=\"M5 4h12l2 2v14H5z\"/><path d=\"M8 4v6h8V4M8 20v-7h8v7\"/>",
    json: "<path d=\"M8 8H6a2 2 0 0 0-2 2v1a2 2 0 0 1-2 2 2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h2M16 8h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2 2 2 0 0 0-2 2v1a2 2 0 0 1-2 2h-2\"/>",
    tree: "<path d=\"M6 4v6h12V4H6zM6 20v-6h5v6H6zM13 20v-6h5v6h-5zM12 10v4M8.5 14v-2h7v2\"/>",
    survey: "<path d=\"M5 4h14v16H5z\"/><path d=\"M8 8h8M8 12h8M8 16h5\"/>",
    template: "<path d=\"M4 6h16M6 6v14h12V6\"/><path d=\"M9 10h6M9 14h4\"/>",
    page: "<path d=\"M7 3h7l3 3v15H7z\"/><path d=\"M14 3v4h4M10 11h5M10 15h5\"/>",
    question: "<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M10 10a2 2 0 1 1 3.4 1.4c-.8.7-1.4 1.2-1.4 2.4M12 17h.01\"/>",
    text: "<path d=\"M4 7h16M8 7v10M16 7v10M6 17h4M14 17h4\"/>",
    textarea: "<path d=\"M4 6h16v12H4z\"/><path d=\"M7 10h10M7 14h7\"/>",
    radio: "<circle cx=\"7\" cy=\"8\" r=\"2\"/><path d=\"M11 8h8\"/><circle cx=\"7\" cy=\"16\" r=\"2\"/><path d=\"M11 16h8\"/>",
    checkbox: "<path d=\"M5 5h5v5H5zM5 14h5v5H5zM14 7h5M14 16h5\"/>",
    dropdown: "<path d=\"M5 7h14v10H5z\"/><path d=\"M9 11l3 3 3-3\"/>",
    rating: "<path d=\"M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z\"/>",
    emojiScale: "<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M9 10h.01M15 10h.01M9 15c1.8 1.4 4.2 1.4 6 0\"/>",
    imageChoice: "<path d=\"M4 5h16v14H4z\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M4 17l5-5 3 3 2-2 6 6\"/>",
    imageCompare: "<path d=\"M4 6h7v12H4zM13 6h7v12h-7z\"/><path d=\"M6 15l2-2 3 3M15 15l2-2 3 3\"/>",
    ranking: "<path d=\"M8 6h12M8 12h12M8 18h12\"/><path d=\"M4 6h.01M4 12h.01M4 18h.01\"/>",
    matrix: "<path d=\"M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14\"/>",
    boolean: "<path d=\"M5 12l4 4L19 6\"/>",
    date: "<path d=\"M5 5h14v15H5zM8 3v4M16 3v4M5 10h14\"/>",
    file: "<path d=\"M7 3h7l4 4v14H7z\"/><path d=\"M14 3v5h5M10 15h6\"/>",
    svgNote: "<path d=\"M5 5h14v14H5z\"/><path d=\"M8 16l2.5-3 2 2.2L16 10\"/>",
    contentBlock: "<path d=\"M5 5h14v14H5z\"/><path d=\"M8 9h8M8 13h8M8 17h5\"/>",
    codeBlock: "<path d=\"M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14\"/>",
    panel: "<path d=\"M4 5h16v14H4zM4 10h16\"/>"
  };

  return el("span", {
    class: className,
    html: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.question}</svg>`
  });
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
      field("Imagen", imageInput(survey.imageUrl || "", (value) => actions.updateSurvey({ imageUrl: value }), { "aria-label": "Imagen de la encuesta" })),
      field("Titulo", input(survey.title, (value) => actions.updateSurvey({ title: value }), { "aria-label": "Titulo de la encuesta" })),
      field("Descripcion", textarea(survey.description, (value) => actions.updateSurvey({ description: value }), { rows: 3, "aria-label": "Descripcion de la encuesta" }))
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
      field("Titulo de pagina", input(page.title, (value) => actions.updatePage(page.id, { title: value }), { "aria-label": `Titulo de pagina ${pageIndex + 1}` })),
      field("Descripcion de pagina", textarea(page.description, (value) => actions.updatePage(page.id, { description: value }), { rows: 3, "aria-label": `Descripcion de pagina ${pageIndex + 1}` }))
    ]),
    el("p", { class: "muted", text: `Preguntas en esta pagina: ${page.elements.length}` })
  ]);
}
