import { el } from "../../../builder/dom.js";

async function copyTextToClipboard(text) {
  const content = String(text || "").trim();
  if (!content) return false;
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(content);
    return true;
  }
  return false;
}

function createAssistantCopyButton(getText, t) {
  const button = el("button", {
    type: "button",
    class: "button ps-ia-copy-btn",
    text: t("labels.copy"),
    "aria-label": t("labels.copyAssistant")
  });

  button.addEventListener("click", async () => {
    const copied = await copyTextToClipboard(getText());
    button.textContent = copied ? t("labels.copied") : t("labels.unavailable");
    setTimeout(() => {
      button.textContent = t("labels.copy");
    }, 1200);
  });

  return button;
}

export function createChatMessageLog(chatNode, t) {
  function appendMessage(role, text) {
    const uiRole = role === "user" ? "user" : "agent";
    const body = el("div", { class: "ps-ia-chat-bubble", text: text || "" });
    const children = [
      el("span", { class: "ps-ia-chat-label", text: role === "user" ? t("labels.user") : t("labels.assistant") }),
      body
    ];

    if (role !== "user") {
      children.push(el("div", { class: "ps-ia-chat-actions" }, [
        createAssistantCopyButton(() => body.textContent || "", t)
      ]));
    }

    const wrap = el("article", { class: "ps-ia-chat-message", dataset: { role: uiRole } }, children);
    chatNode.appendChild(wrap);
    chatNode.scrollTop = chatNode.scrollHeight;

    return { wrap, body };
  }

  function createStreamingMessage(initialText = "") {
    const { wrap, body } = appendMessage("assistant", initialText);
    let finalized = false;

    return {
      update(text) {
        if (finalized) return;
        body.textContent = text || "";
        chatNode.scrollTop = chatNode.scrollHeight;
      },
      finalize(text) {
        if (finalized) return;
        body.textContent = text || "";
        finalized = true;
        chatNode.scrollTop = chatNode.scrollHeight;
      },
      getText() {
        return body.textContent || "";
      },
      remove() {
        if (finalized) return;
        wrap.remove();
        finalized = true;
      }
    };
  }

  return {
    addUserMessage(text) {
      appendMessage("user", text);
    },
    addAssistantMessage(text) {
      appendMessage("assistant", text);
    },
    createStreamingMessage,
    count() {
      return chatNode.querySelectorAll(".ps-ia-chat-message").length;
    }
  };
}
