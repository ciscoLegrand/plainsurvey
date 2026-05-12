import { el } from "./dom.js";

export function renderPreviewControl(question, { labelForType, t }) {
  if (question.type === "svgNote") return renderPreviewNote(question);
  if (question.type === "codeBlock") return el("pre", { class: "display-code preview-code", text: question.code || "" });
  if (question.type === "contentBlock") {
    const kids = [];
    if (question.imageUrl) kids.push(el("img", { class: "content-block-image", src: question.imageUrl, alt: question.imageCaption || "" }));
    if (question.body) {
      const d = el("div", { class: "content-block-body" });
      d.innerHTML = question.body.replace(/\n/g, "<br>");
      kids.push(d);
    }
    return el("div", { class: "content-block preview-content-block" }, kids);
  }
  if (question.type === "textarea") return el("textarea", { class: "ps-builder-control ps-builder-textarea", rows: 3, placeholder: question.placeholder || "", disabled: true });
  if (question.type === "dropdown") return el("select", { class: "ps-builder-control ps-builder-select", disabled: true }, [
    el("option", { text: t("selectOption", {}, "Selecciona una opcion") }),
    ...(question.choices || []).map((choice) => el("option", { text: choice.text }))
  ]);
  if (question.type === "rating") {
    const min = Number(question.rateMin) || 1;
    const max = Math.max(min, Number(question.rateMax) || 5);
    return el("div", { class: "rating-list preview-control" }, Array.from({ length: max - min + 1 }, (_, index) => {
      return el("button", { class: "rating-button", type: "button", disabled: true, text: max - min + 1 <= 5 ? "★" : min + index });
    }));
  }
  if (question.type === "emojiScale") {
    return el("div", { class: "emoji-scale preview-control" }, (question.choices || []).map((choice) => {
      return el("button", { class: "emoji-button", type: "button", disabled: true }, [
        el("span", { class: "emoji-face", text: choice.emoji }),
        el("span", { class: "emoji-label", text: choice.text })
      ]);
    }));
  }
  if (question.type === "matrix") {
    return el("div", { class: "matrix-wrap preview-control" }, [
      el("table", { class: "matrix-table" }, [
        el("thead", {}, [el("tr", {}, [el("th"), ...(question.columns || []).map((column) => el("th", { text: column.text }))])]),
        el("tbody", {}, (question.rows || []).map((row) => el("tr", {}, [
          el("th", { text: row.text }),
          ...(question.columns || []).map(() => el("td", {}, [el("input", { type: "radio", disabled: true })]))
        ])))
      ])
    ]);
  }
  if (["imageChoice", "imageCompare"].includes(question.type)) {
    return el("div", { class: "image-choice-preview preview-control" }, (question.choices || []).map((choice) => {
      return el("figure", { class: "image-choice-card" }, [
        choice.imageUrl ? el("img", { src: choice.imageUrl, alt: choice.alt || choice.text }) : el("div", { class: "image-choice-placeholder", text: choice.text }),
        el("figcaption", { text: question.type === "imageCompare" && choice.caption ? `${choice.text} · ${choice.caption}` : choice.text })
      ]);
    }));
  }
  if (question.type === "panel") {
    return el("div", { class: "nested-panel-preview preview-control" }, (question.elements || []).map((nestedQuestion, index) => {
      return el("div", { class: "nested-panel-row" }, [
        el("strong", { text: `${index + 1}. ${nestedQuestion.title}` }),
        el("small", { text: labelForType(nestedQuestion.type) })
      ]);
    }));
  }
  if (["radio", "checkbox", "ranking"].includes(question.type)) {
    return el("div", { class: "option-list preview-control" }, (question.choices || []).map((choice, index) => {
      return el("label", { class: question.type === "ranking" ? "ranking-item" : "option-row" }, [
        question.type === "ranking" ? el("span", { class: "ranking-position", text: index + 1 }) : el("input", { type: question.type, disabled: true }),
        choice.text
      ]);
    }));
  }
  if (question.type === "boolean") {
    return el("div", { class: "segmented preview-control" }, [
      el("button", { type: "button", disabled: true, text: t("yes", {}, "Si") }),
      el("button", { type: "button", disabled: true, text: t("no", {}, "No") })
    ]);
  }

  return el("input", { class: "ps-builder-control ps-builder-input", type: "text", placeholder: question.placeholder || "", disabled: true });
}

function renderPreviewNote(question) {
  return el("div", { class: `svg-note svg-note-${question.variant || "spark"}` }, [
    el("div", { class: "svg-art", html: "<svg viewBox=\"0 0 120 80\" aria-hidden=\"true\"><path d=\"M60 8l10 22 24 4-18 17 5 24-21-12-21 12 5-24-18-17 24-4z\" fill=\"currentColor\"/></svg>" }),
    el("div", {}, [el("strong", { text: question.title })])
  ]);
}
