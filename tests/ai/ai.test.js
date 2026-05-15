import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { Window } from "happy-dom";

import {
  createDefaultBriefing,
  createSurveyAiChatbot,
  createSurveyAiRuntime,
  createSurveyAiWidget,
  createSurveyFromPrompt,
  generateSurveyWithAi
} from "../../src/ai/index.js";
import { mergeBriefingFromText } from "../../src/ai/domain/briefing.js";

test("AI module exposes the clean architecture entrypoints without legacy wrappers", () => {
  assert.equal(typeof createSurveyAiRuntime, "function");
  assert.equal(typeof createSurveyAiWidget, "function");
  assert.equal(typeof createDefaultBriefing, "function");
  assert.equal(existsSync(new URL("../../src/ai/runtime.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../../src/ai/widget", import.meta.url)), false);
});

test("generateSurveyWithAi returns recoverable draft when provider is unavailable", async () => {
  const result = await generateSurveyWithAi({ prompt: "customer onboarding" });

  assert.equal(result.ok, false);
  assert.match(result.error, /unavailable/);
  assert.match(result.survey.title, /customer onboarding/);
});

test("generateSurveyWithAi normalizes provider output", async () => {
  const result = await generateSurveyWithAi({
    prompt: "support",
    provider: async () => ({
      title: "Support",
      pages: [{ title: "Page", elements: [{ name: "rating", type: "rating", title: "Rate us" }] }]
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.survey.title, "Support");
  assert.equal(result.survey.pages[0].elements[0].type, "rating");
});

test("createSurveyFromPrompt creates compatible JSON", () => {
  const survey = createSurveyFromPrompt("developer experience");

  assert.equal(survey.pages.length, 1);
  assert.equal(survey.pages[0].elements.length, 2);
});

test("createSurveyAiChatbot streams chat replies through onChunk", async () => {
  const chunks = [];
  const chatbot = createSurveyAiChatbot({
    provider: {
      async initialize() {
        return { runtime: "mock" };
      },
      async chat(messages, options = {}) {
        const reply = "{" + '"assistantReply":"Hola, cuentame mas"' + "}";
        if (typeof options.onChunk === "function") {
          for (const chunk of ["{", '"assistantReply":"Hola', ', cuentame', ' mas"', "}"]) {
            chunks.push(chunk);
            options.onChunk(chunk, chunks.join(""));
          }
        }
        return reply;
      }
    }
  });

  const reply = await chatbot.sendMessage("Hola", {}, {
    onChunk(chunk, partial) {
      chunks.push(partial || chunk);
    }
  });

  assert.equal(reply, '{"assistantReply":"Hola, cuentame mas"}');
  assert.ok(chunks.length > 0);
});

test("mergeBriefingFromText infers exam briefing from natural language", () => {
  const briefing = mergeBriefingFromText({}, "quiero un examen de ingles de nivel b2 para evaluar la comprension lectora de mis alumnos de la EOI. el examen debe ser 2 paginas");

  assert.equal(briefing.surveyType, "exam");
  assert.match(briefing.topic, /examen/i);
  assert.equal(briefing.pagesCount, 2);
});

test("AI widget chat appends assistant turns instead of replacing previous replies", async () => {
  const window = new Window();
  const previousDocument = globalThis.document;
  const previousNode = globalThis.Node;
  const previousHTMLElement = globalThis.HTMLElement;

  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.HTMLElement = window.HTMLElement;

  try {
    const { createChatMessageLog } = await import("../../src/ai/ui/widget/chat-messages.js");
    const { createTranslator, esWidgetLocale } = await import("../../src/ai/locales/index.js");
    const chatNode = document.createElement("div");
    const chatLog = createChatMessageLog(chatNode, createTranslator(esWidgetLocale));

    chatLog.addAssistantMessage("saludo");
    chatLog.addUserMessage("quiero evaluar competencias en matemáticas de los alumnos de segundo grado");
    const firstTurn = chatLog.createStreamingMessage("respuesta parcial 1");
    firstTurn.finalize("respuesta final 1");
    const secondTurn = chatLog.createStreamingMessage("respuesta parcial 2");
    secondTurn.finalize("respuesta final 2");

    const messages = [...chatNode.querySelectorAll(".ps-ia-chat-message")].map((node) => ({
      role: node.dataset.role,
      text: node.querySelector(".ps-ia-chat-bubble")?.textContent
    }));

    assert.deepEqual(messages, [
      { role: "agent", text: "saludo" },
      { role: "user", text: "quiero evaluar competencias en matemáticas de los alumnos de segundo grado" },
      { role: "agent", text: "respuesta final 1" },
      { role: "agent", text: "respuesta final 2" }
    ]);
  } finally {
    globalThis.document = previousDocument;
    globalThis.Node = previousNode;
    globalThis.HTMLElement = previousHTMLElement;
  }
});

test("AI widget preserves streamed generation output and appends completion message", async () => {
  const window = new Window();
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousNode = globalThis.Node;
  const previousHTMLElement = globalThis.HTMLElement;

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.HTMLElement = window.HTMLElement;

  try {
    const { createSurveyAiWidget } = await import("../../src/ai/index.js");
    const target = document.createElement("div");
    document.body.appendChild(target);

    await createSurveyAiWidget({
      target,
      provider: {
        async initialize() {
          return { runtime: "mock", model: "Llama-3.2-3B-Instruct-q4f16_1" };
        },
        async chat(messages, hooks = {}) {
          const reply = JSON.stringify({
            assistantReply: "Briefing entendido; preparo una evaluacion de matematicas.",
            briefingPatch: {
              topic: "competencias en matematicas",
              audience: "alumnos de segundo grado",
              objective: "evaluar competencias en matematicas",
              surveyType: "exam",
              pagesCount: 1,
              questionsPerPage: 1
            },
            nextAction: "ready_to_generate",
            generationDirective: "Genera una prueba breve de matematicas para segundo grado."
          });
          hooks.onChunk?.(reply, reply);
          return reply;
        },
        async generateSurvey({ onChunk }) {
          const streamed = "Respuesta original generada por el agente";
          onChunk?.(streamed, streamed);
          return {
            title: "Evaluacion de matematicas",
            pages: [
              {
                title: "Pagina 1",
                elements: [
                  { type: "text", name: "suma", title: "Resuelve 2 + 2" }
                ]
              }
            ]
          };
        }
      }
    });

    const input = target.querySelector("#ps-ai-chat-input");
    input.value = "quiero evaluar competencias en matemáticas de los alumnos de segundo grado";
    target.querySelector("#ps-ai-chat-send").click();

    await waitFor(() => !target.querySelector("#ps-ai-generate").disabled);
    target.querySelector("#ps-ai-generate").click();
    await waitFor(() => !target.querySelector("#ps-ai-preview-open").hidden);

    const assistantMessages = [...target.querySelectorAll(".ps-ia-chat-message[data-role='agent']")]
      .map((node) => node.querySelector(".ps-ia-chat-bubble")?.textContent);

    assert.ok(assistantMessages.includes("Respuesta original generada por el agente"));
    assert.ok(assistantMessages.some((message) => /Encuesta generada con exam/.test(message)));
    assert.ok(
      assistantMessages.indexOf("Respuesta original generada por el agente")
        < assistantMessages.findIndex((message) => /Encuesta generada con exam/.test(message))
    );
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.Node = previousNode;
    globalThis.HTMLElement = previousHTMLElement;
  }
});

async function waitFor(assertion, timeout = 1000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (assertion()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(assertion());
}
