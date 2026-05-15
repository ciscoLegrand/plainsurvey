import { el } from "../../../builder/dom.js";
import { isBriefingReady, summarizeBriefing } from "../../domain/briefing.js";

export function renderBriefingSummary({ briefing, summaryNode, generateNode }) {
  const rows = summarizeBriefing(briefing);
  summaryNode.replaceChildren(...rows.map(([key, value]) => el("div", { class: "ps-ia-summary-item" }, [
    el("strong", { text: key }),
    el("span", { text: value })
  ])));
  generateNode.disabled = !isBriefingReady(briefing);
}
