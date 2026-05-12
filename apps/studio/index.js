import { analyzeSurveyResponses } from "../../src/modules/analytics/index.js";
import { generateSurveyWithAi } from "../../src/modules/ai/index.js";
import { createSurveyBuilder } from "../../src/modules/builder/index.js";
import { normalizeSurvey } from "../../src/core/index.js";
import { createSurveyRenderer } from "../../src/modules/renderer/index.js";
import { captureFocus, restoreFocus } from "../../src/helpers/focus.js";
import { createTranslator } from "../../src/helpers/i18n.js";
import { resolveLocale, studioLocales } from "../../src/locales/index.js";
import { createUiPreset } from "../../src/assets/styles/index.js";

const STORAGE_KEY = "plainsurvey:studio";
const PRESET_NAMES = ["plain", "bootstrap", "daisy", "bulma"];
const THEME_NAMES = ["corporativo", "academia", "producto", "atelier", "nexus", "catppuccin", "obsidian"];
const MODE_NAMES = ["light", "dark", "darkless"];
const LAYOUT_NAMES = ["medium", "full", "modern"];

export function createPlainsurveyStudio(options = {}) {
  if (!options.target) throw new Error("createPlainsurveyStudio requires a target element.");

  const target = options.target;
  const storage = options.storage || globalThis.localStorage;
  const aiProvider = options.aiProvider;
  const locale = resolveLocale(options.locale || "en", studioLocales, "en");
  const t = createTranslator({
    locale,
    fallbackLocale: "en",
    messages: studioLocales,
    overrides: options.messages?.studio
  });
  const loadedState = loadState(storage);
  const defaultThemeName = THEME_NAMES.includes(options.defaultTheme) ? options.defaultTheme : "nexus";
  const defaultModeName = MODE_NAMES.includes(options.defaultMode) ? options.defaultMode : "light";
  const defaultLayoutName = LAYOUT_NAMES.includes(options.defaultLayout) ? options.defaultLayout : "full";
  const appearanceState = options.ignoreStoredAppearance
    ? { themeName: defaultThemeName, modeName: defaultModeName, layoutName: defaultLayoutName }
    : loadedState;
  let survey = loadedState?.survey || normalizeSurvey(options.initialSurvey);
  let responses = loadedState?.responses || [];
  let presetName = loadedState?.presetName || "plain";
  let themeName = normalizeThemeName(appearanceState, defaultThemeName);
  let modeName = normalizeModeName(appearanceState, defaultModeName);
  let layoutName = LAYOUT_NAMES.includes(appearanceState?.layoutName) ? appearanceState.layoutName : defaultLayoutName;
  let activeView = "builder";
  let childInstance = null;
  let jsonDraft = JSON.stringify(survey, null, 2);
  let jsonDialogDraft = "";
  let jsonDialogOpen = false;
  let jsonMessage = "";
  let jsonError = "";
  let aiMessage = "";

  applyAppearance();

  function persist() {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify({
      survey,
      responses,
      presetName,
      themeName,
      modeName,
      layoutName
    }));
  }

  function setSurvey(nextSurvey) {
    survey = normalizeSurvey(nextSurvey);
    persist();
    render();
  }

  function addResponse(answers) {
    responses = [...responses, { answers, completedAt: new Date().toISOString() }];
    persist();
    render();
  }

  function setPreset(nextPresetName) {
    presetName = PRESET_NAMES.includes(nextPresetName) ? nextPresetName : "plain";
    persist();
    render();
  }

  function setTheme(nextThemeName) {
    themeName = THEME_NAMES.includes(nextThemeName) ? nextThemeName : "nexus";
    applyAppearance();
    persist();
    render();
  }

  function setMode(nextModeName) {
    modeName = MODE_NAMES.includes(nextModeName) ? nextModeName : "light";
    applyAppearance();
    persist();
    render();
  }

  function setLayout(nextLayoutName) {
    layoutName = LAYOUT_NAMES.includes(nextLayoutName) ? nextLayoutName : "full";
    applyAppearance();
    persist();
    render();
  }

  function applyAppearance() {
    const root = target.ownerDocument?.documentElement;
    root?.setAttribute("data-theme", themeName);
    root?.setAttribute("data-mode", modeName);
    root?.setAttribute("data-layout", layoutName);
    root?.removeAttribute("data-skin");
  }

  function render() {
    const focusSnapshot = captureFocus(target);
    childInstance?.destroy?.();
    childInstance = null;
    target.replaceChildren(el("div", { class: "ps-studio" }, [
      renderNav(),
      el("main", { "data-studio-view": activeView }, [renderView()]),
      renderJsonDialog()
    ]));
    restoreFocus(target, focusSnapshot);
  }

  function renderNav() {
    const views = [
      ["builder", t("navBuilder")],
      ["preview", t("navPreview")],
      ["json", t("navJson")],
      ["analytics", t("navAnalytics")],
      ["ai", t("navAi")]
    ];

    return el("nav", { class: "plainsurveyToolbar", "aria-label": t("mainNavigation") }, [
      el("div", { class: "ps-studio-mainnav" }, [
        el("div", { class: "ps-studio-tabs", "data-main-navigation": "true" }, views.map(([view, label]) => el("button", {
        class: activeView === view ? "is-active" : "",
        type: "button",
        "data-studio-tab": view,
        onclick: () => {
          activeView = view;
          render();
        },
        text: label
      })))
      ]),
      renderAppearanceControls()
    ]);
  }

  function renderView() {
    if (activeView === "builder") {
      const mount = el("div");
      queueMicrotask(() => {
        childInstance = createSurveyBuilder({
          target: mount,
          survey,
          locale,
          messages: options.messages,
          onOpenJson: (nextSurvey) => {
            jsonDialogDraft = JSON.stringify(normalizeSurvey(nextSurvey), null, 2);
            jsonDialogOpen = true;
            jsonError = "";
            jsonMessage = "";
            render();
          },
          onChange: (nextSurvey) => {
            survey = nextSurvey;
            persist();
          }
        });
      });
      return mount;
    }

    if (activeView === "preview") {
      const mount = el("div");
      queueMicrotask(() => {
        childInstance = createSurveyRenderer({
          target: mount,
          survey,
          ui: createUiPreset(presetName),
          onComplete: ({ answers }) => addResponse(answers)
        });
      });
      return el("section", {}, [
        renderPresetSelector(),
        mount
      ]);
    }

    if (activeView === "json") {
      const outputJson = JSON.stringify(survey, null, 2);
      const textarea = el("textarea", {
        "data-json-editor": "true",
        rows: 18,
        value: jsonDraft,
        oninput: (event) => {
          jsonDraft = event.target.value;
        }
      });
      return el("section", { class: "ps-json-workspace" }, [
        el("div", { class: "ps-json-grid" }, [
          el("article", { class: "ps-json-panel" }, [
            el("div", { class: "ps-json-panel-header" }, [
              el("h2", { text: t("jsonCurrentTitle") }),
              el("p", { text: t("jsonCurrentDescription") })
            ]),
            el("pre", { "data-json-output": "true", text: outputJson }),
            el("div", { class: "ps-studio-actions" }, [
              el("button", { type: "button", onclick: () => loadJsonDraft(outputJson), text: t("loadJsonIntoEditor") }),
              el("button", { type: "button", onclick: () => copyJson(outputJson), text: t("copyJson") }),
              el("button", { type: "button", onclick: () => downloadJson(outputJson), text: t("downloadJson") }),
              el("button", { type: "button", onclick: () => sendJson(outputJson), text: t("sendJson") })
            ])
          ]),
          el("article", { class: "ps-json-panel" }, [
            el("div", { class: "ps-json-panel-header" }, [
              el("h2", { text: t("jsonEditorTitle") }),
              el("p", { text: t("jsonEditorDescription") })
            ]),
            textarea,
            el("div", { class: "ps-studio-actions" }, [
              el("button", { type: "button", onclick: () => applyJson(textarea.value), text: t("applyJson") }),
              el("label", { class: "ps-file-button" }, [
                t("importJson", {}, "Import JSON"),
                el("input", {
                  type: "file",
                  accept: "application/json,.json",
                  onchange: (event) => importJsonFile(event.target.files?.[0])
                })
              ])
            ])
          ])
        ]),
        jsonError ? el("p", { class: "ps-state-error", "data-json-error": "true", text: jsonError }) : null,
        jsonMessage ? el("p", { class: "ps-state-success", "data-json-message": "true", text: jsonMessage }) : null
      ]);
    }

    if (activeView === "analytics") {
      const analysis = analyzeSurveyResponses({ survey, responses });
      return el("section", { class: "ps-analytics-view" }, [
        el("div", { class: "ps-analytics-summary" }, [
          el("h2", { text: t("analyticsTitle") }),
          el("p", { "data-response-count": "true", text: t("responses", { count: analysis.responseCount }) }),
          el("p", { text: `Score: ${analysis.scoring.averagePercentage}%` })
        ]),
        renderResponseTable(),
        renderQuestionSummaryTable(analysis),
        el("details", {}, [
          el("summary", { text: "Raw analysis JSON" }),
          el("pre", { text: JSON.stringify(analysis, null, 2) })
        ])
      ]);
    }

    const prompt = el("textarea", { "data-ai-prompt": "true", rows: 5, placeholder: t("aiPlaceholder") });
    return el("section", {}, [
      prompt,
      el("button", {
        type: "button",
        onclick: async () => {
          const result = await generateSurveyWithAi({ prompt: prompt.value, provider: aiProvider });
          survey = result.survey;
          aiMessage = result.ok ? t("aiGenerated") : result.error;
          persist();
          render();
        },
        text: t("generateSurvey")
      }),
      aiMessage ? el("p", { "data-ai-status": "true", text: aiMessage }) : null
    ]);
  }

  function renderJsonDialog() {
    if (!jsonDialogOpen) return null;
    return el("div", { class: "ps-dialog-backdrop", "data-json-dialog": "true" }, [
      el("section", { class: "ps-dialog" }, [
        el("header", { class: "ps-dialog-header" }, [
          el("h2", { text: t("jsonDialogTitle") }),
          el("button", {
            type: "button",
            class: "button",
            onclick: closeJsonDialog,
            text: t("jsonDialogClose")
          })
        ]),
        el("p", { class: "muted", text: t("jsonDialogDescription") }),
        el("textarea", {
          rows: 18,
          "data-json-dialog-editor": "true",
          value: jsonDialogDraft,
          oninput: (event) => {
            jsonDialogDraft = event.target.value;
          }
        }),
        el("div", { class: "ps-studio-actions" }, [
          el("button", {
            type: "button",
            class: "button button-primary",
            onclick: applyJsonFromDialog,
            text: t("jsonDialogApply")
          }),
          el("button", {
            type: "button",
            class: "button",
            onclick: closeJsonDialog,
            text: t("jsonDialogClose")
          })
        ])
      ])
    ]);
  }

  function closeJsonDialog() {
    jsonDialogOpen = false;
    render();
  }

  function applyJsonFromDialog() {
    try {
      setSurvey(JSON.parse(jsonDialogDraft));
      jsonDraft = JSON.stringify(survey, null, 2);
      jsonDialogOpen = false;
      jsonError = "";
      jsonMessage = t("jsonApplied");
      render();
    } catch (error) {
      jsonMessage = "";
      jsonError = `${t("invalidJson")} ${error?.message || ""}`.trim();
      jsonDialogOpen = false;
      render();
    }
  }

  function renderAppearanceControls() {
    return el("div", { "data-appearance-controls": "true" }, [
      renderSelect(t("theme"), "data-theme-selector", themeName, THEME_NAMES, setTheme),
      renderSelect(t("mode"), "data-mode-selector", modeName, MODE_NAMES, setMode),
      renderSelect(t("layout"), "data-layout-selector", layoutName, LAYOUT_NAMES, setLayout)
    ]);
  }

  function renderPresetSelector() {
    return renderSelect(t("themePreset"), "data-preset-selector", presetName, PRESET_NAMES, setPreset);
  }

  function renderSelect(label, dataAttribute, value, values, onChange) {
    return el("label", {}, [
      label,
      el("select", {
        [dataAttribute]: "true",
        value,
        onchange: (event) => onChange(event.target.value)
      }, values.map((name) => el("option", {
        value: name,
        selected: name === value,
        text: name
      })))
    ]);
  }

  function renderResponseTable() {
    return el("table", { "data-responses-table": "true" }, [
      el("thead", {}, [el("tr", {}, [
        el("th", { text: t("completedAt") }),
        el("th", { text: t("answers") })
      ])]),
      el("tbody", {}, responses.map((response) => el("tr", {}, [
        el("td", { text: response.completedAt || "" }),
        el("td", { text: JSON.stringify(response.answers || {}) })
      ])))
    ]);
  }

  function renderQuestionSummaryTable(analysis) {
    return el("table", { "data-question-summary-table": "true" }, [
      el("thead", {}, [el("tr", {}, [
        el("th", { text: t("question") }),
        el("th", { text: t("type") }),
        el("th", { text: t("responsesColumn") })
      ])]),
      el("tbody", {}, analysis.questions.map((question) => el("tr", {}, [
        el("td", { text: question.title }),
        el("td", { text: question.type }),
        el("td", { text: String(question.responseCount) })
      ])))
    ]);
  }

  function applyJson(value) {
    try {
      survey = normalizeSurvey(JSON.parse(value));
      jsonDraft = JSON.stringify(survey, null, 2);
      jsonError = "";
      jsonMessage = t("jsonApplied");
      persist();
      render();
    } catch (error) {
      jsonMessage = "";
      jsonError = `${t("invalidJson")} ${error?.message || ""}`.trim();
      render();
    }
  }

  async function copyJson(value) {
    await globalThis.navigator?.clipboard?.writeText?.(value);
    jsonError = "";
    jsonMessage = t("jsonCopied");
    render();
  }

  function downloadJson(value) {
    const documentRef = target.ownerDocument;
    const link = documentRef.createElement("a");
    const blob = typeof Blob === "function" ? new Blob([value], { type: "application/json" }) : null;
    link.download = "plainsurvey.json";
    link.href = blob && globalThis.URL?.createObjectURL
      ? globalThis.URL.createObjectURL(blob)
      : `data:application/json;charset=utf-8,${encodeURIComponent(value)}`;
    link.click();
    jsonError = "";
    jsonMessage = t("jsonDownloadPrepared");
    render();
  }

  async function sendJson(value) {
    if (!options.postUrl && typeof options.onSendJson !== "function") {
      jsonError = t("noJsonDestination");
      jsonMessage = "";
      render();
      return;
    }

    try {
      const payload = normalizeSurvey(JSON.parse(value));
      if (typeof options.onSendJson === "function") {
        await options.onSendJson(payload);
      } else {
        await fetch(options.postUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      jsonError = "";
      jsonMessage = t("jsonSent");
    } catch (error) {
      jsonMessage = "";
      jsonError = `${t("jsonSendError")} ${error?.message || ""}`.trim();
    }
    render();
  }

  function loadJsonDraft(value) {
    jsonDraft = value;
    jsonError = "";
    jsonMessage = t("jsonEditorLoaded");
    render();
  }

  async function importJsonFile(file) {
    if (!file) return;
    const value = typeof file.text === "function"
      ? await file.text()
      : await readFileWithReader(file);
    applyJson(value);
  }

  function destroy() {
    childInstance?.destroy?.();
    target.replaceChildren();
  }

  render();

  return {
    destroy,
    getSurvey: () => survey,
    getResponses: () => responses,
    setView: (view) => {
      activeView = view;
      render();
    },
    setSurvey,
    addResponse,
    setPreset,
    getPreset: () => presetName,
    setTheme,
    getTheme: () => themeName,
    setMode,
    getMode: () => modeName,
    setLayout,
    getLayout: () => layoutName,
    importJson: (value) => applyJson(value)
  };
}

function loadState(storage) {
  try {
    const data = JSON.parse(storage?.getItem?.(STORAGE_KEY) || "null");
    if (!data?.survey) return null;
    return {
      survey: normalizeSurvey(data.survey),
      responses: Array.isArray(data.responses) ? data.responses : [],
      presetName: PRESET_NAMES.includes(data.presetName) ? data.presetName : "plain",
      themeName: normalizeThemeName(data),
      modeName: normalizeModeName(data),
      layoutName: LAYOUT_NAMES.includes(data.layoutName) ? data.layoutName : "full"
    };
  } catch {
    return null;
  }
}

function normalizeThemeName(data = {}, fallback = "nexus") {
  data ||= {};
  if (THEME_NAMES.includes(data.themeName)) return data.themeName;
  if (data.skinName === "catppuccin-mocha") return "catppuccin";
  if (data.skinName === "obsidian") return "obsidian";
  return fallback;
}

function normalizeModeName(data = {}, fallback = "light") {
  data ||= {};
  if (MODE_NAMES.includes(data.modeName)) return data.modeName;
  if (data.skinName && data.skinName !== "default") return data.skinName === "darkless" ? "darkless" : "dark";
  return fallback;
}

function readFileWithReader(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function el(tagName, attrs = {}, children = []) {
  const node = document.createElement(tagName);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

if (typeof document !== "undefined") {
  const target = document.querySelector("#studio");
  if (target) createPlainsurveyStudio({
    target,
    defaultTheme: "nexus",
    defaultMode: "light",
    defaultLayout: "full",
    ignoreStoredAppearance: true
  });
}
