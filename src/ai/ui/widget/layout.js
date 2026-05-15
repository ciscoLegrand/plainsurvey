import { el } from "../../../builder/dom.js";

export function renderSurveyAiWidgetLayout(target, t) {
  const root = el("section", {
    class: "ps-ia-generator-layout",
    role: "application",
    "aria-label": t("labels.app")
  }, [
    el("section", { class: "ps-ia-config-row", "aria-label": t("labels.providerConfig") }, [
      el("div", { class: "ps-ia-config-top" }, [
        el("label", { class: "ps-ia-config-field", for: "ps-ai-provider" }, [
          el("span", { text: t("labels.provider") }),
          el("select", {
            id: "ps-ai-provider",
            class: "ps-builder-select",
            "aria-label": t("labels.providerAria")
          }, [
            el("option", { value: "local", selected: true, text: t("labels.localProvider") })
          ])
        ]),
        el("label", { class: "ps-ia-config-field", for: "ps-ai-model" }, [
          el("span", { text: t("labels.model") }),
          el("select", {
            id: "ps-ai-model",
            class: "ps-builder-select",
            "aria-label": t("labels.modelAria")
          })
        ]),
        el("button", {
          id: "ps-ai-init",
          type: "button",
          class: "button button-primary",
          text: t("labels.initialize"),
          "aria-label": t("labels.initializeAria")
        }),
        el("button", {
          id: "ps-ai-preview-open",
          type: "button",
          class: "button ps-ia-preview-btn",
          text: t("labels.preview"),
          hidden: true,
          "aria-label": t("labels.previewAria")
        })
      ]),
      el("div", { class: "ps-ia-config-meta" }, [
        el("div", {
          id: "ps-ai-loading",
          class: "ps-ia-loading-indicator",
          role: "status",
          "aria-live": "polite",
          hidden: true
        }, [
          el("span", { class: "ps-ia-spinner", "aria-hidden": "true" }),
          el("span", { id: "ps-ai-loading-text", text: t("messages.loadingInitial") })
        ]),
        el("div", {
          id: "ps-ai-model-note",
          class: "ps-ia-agent-info",
          role: "status",
          "aria-live": "polite"
        })
      ])
    ]),

    el("div", { class: "ps-ia-main" }, [
      el("section", {
        class: "ps-ia-chat-panel",
        role: "region",
        "aria-label": t("labels.chatRegion")
      }, [
        el("header", { class: "ps-ia-panel-header" }, [
          el("h2", { text: t("labels.chatTitle") }),
          el("p", { text: t("labels.chatDescription") })
        ]),
        el("div", {
          id: "ps-ai-chat",
          class: "ps-ia-chat",
          role: "log",
          "aria-live": "polite",
          "aria-relevant": "additions text"
        }),
        el("div", { class: "ps-ia-input-area" }, [
          el("textarea", {
            id: "ps-ai-chat-input",
            class: "ps-builder-textarea",
            rows: "3",
            placeholder: t("labels.chatInputPlaceholder"),
            "aria-label": t("labels.chatInputAria")
          }),
          el("div", { class: "ps-ia-input-nav" }, [
            el("button", {
              id: "ps-ai-chat-send",
              type: "button",
              class: "button",
              text: t("labels.send"),
              "aria-label": t("labels.sendAria")
            }),
            el("button", {
              id: "ps-ai-generate",
              type: "button",
              class: "button button-primary",
              text: t("labels.generate"),
              disabled: true,
              "aria-label": t("labels.generateAria")
            })
          ])
        ]),
        el("p", {
          id: "ps-ai-status",
          class: "ps-ia-status",
          role: "status",
          "aria-live": "polite",
          text: t("messages.ready")
        })
      ]),

      el("aside", {
        class: "ps-ia-summary-panel",
        role: "region",
        "aria-label": t("labels.summaryRegion")
      }, [
        el("h3", { class: "ps-ia-summary-title", text: t("labels.summaryTitle") }),
        el("div", { id: "ps-ai-summary", class: "ps-ia-summary-list" })
      ])
    ]),

    el("div", {
      id: "ps-ai-modal",
      class: "ps-ia-dialog-overlay",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "ps-ai-modal-title",
      hidden: true
    }, [
      el("div", { class: "ps-ia-dialog-content" }, [
        el("div", { class: "ps-ia-dialog-header" }, [
          el("strong", { id: "ps-ai-modal-title", text: t("labels.modalTitle") }),
          el("button", {
            id: "ps-ai-modal-close",
            class: "ps-ia-dialog-close",
            type: "button",
            text: "x",
            "aria-label": t("labels.closePreview")
          })
        ]),
        el("div", { class: "ps-ia-dialog-body" }, [
          el("div", { id: "ps-ai-preview" })
        ])
      ])
    ])
  ]);

  target.replaceChildren(root);
}

export function getWidgetElements(target) {
  return {
    modelNode: target.querySelector("#ps-ai-model"),
    initNode: target.querySelector("#ps-ai-init"),
    previewOpenNode: target.querySelector("#ps-ai-preview-open"),
    loadingNode: target.querySelector("#ps-ai-loading"),
    loadingTextNode: target.querySelector("#ps-ai-loading-text"),
    modelNoteNode: target.querySelector("#ps-ai-model-note"),
    chatNode: target.querySelector("#ps-ai-chat"),
    chatInputNode: target.querySelector("#ps-ai-chat-input"),
    chatSendNode: target.querySelector("#ps-ai-chat-send"),
    generateNode: target.querySelector("#ps-ai-generate"),
    summaryNode: target.querySelector("#ps-ai-summary"),
    statusNode: target.querySelector("#ps-ai-status"),
    modalNode: target.querySelector("#ps-ai-modal"),
    modalCloseNode: target.querySelector("#ps-ai-modal-close"),
    previewNode: target.querySelector("#ps-ai-preview")
  };
}
