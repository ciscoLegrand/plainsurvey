import test from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

import { createSurveyBuilder } from "../../src/builder/index.js";
import { createQuestion, QUESTION_TYPES } from "../../src/core/schema.js";

test("createSurveyBuilder mounts survey metadata and emits normalized changes", () => {
  const target = setupDom();
  const changes = [];

  createSurveyBuilder({
    target,
    survey: sampleSurvey(),
    onChange: (survey) => changes.push(survey)
  });

  assert.match(target.textContent, /Titulo/);
  assert.match(target.textContent, /Question bank|Banco de preguntas/);

  const titleInput = labeledInput(target, "Titulo");
  titleInput.value = "Updated survey";
  titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.equal(changes.at(-1).title, "Updated survey");
  assert.equal(changes.at(-1).pages[0].elements[0].type, "text");
});

test("builder preserves input focus while editing normalized JSON", () => {
	const target = setupDom();

	createSurveyBuilder({
    target,
    survey: sampleSurvey()
  });

  const titleInput = labeledInput(target, "Titulo");
  titleInput.focus();
  titleInput.value = "A";
  titleInput.setSelectionRange(1, 1);
  titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  const nextTitleInput = labeledInput(target, "Titulo");
	assert.equal(document.activeElement, nextTitleInput);
	assert.equal(nextTitleInput.selectionStart, 1);
});

test("builder keeps existing question DOM while editing inline fields", () => {
	const target = setupDom();
	const changes = [];

	createSurveyBuilder({
		target,
		survey: {
			title: "Sample",
			pages: [
				{
					title: "Page 1",
					elements: [
						{ id: "q1", name: "name", type: "text", title: "Name" },
						{ id: "q2", name: "email", type: "text", title: "Email" }
					]
				}
			]
		},
		onChange: (survey) => changes.push(survey)
	});

	const questionCards = Array.from(target.querySelectorAll(".preview-question"));
	const titleInput = questionCards[0].querySelector(".builder-inline-title");
	titleInput.focus();
	titleInput.value = "Updated name";
	titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
	titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

	assert.equal(target.querySelectorAll(".preview-question")[0], questionCards[0]);
	assert.equal(target.querySelectorAll(".preview-question")[1], questionCards[1]);
	assert.equal(document.activeElement, titleInput);
	assert.equal(changes.at(-1).pages[0].elements[0].title, "Updated name");
});

test("builder adds and deletes questions", async () => {
  const target = setupDom();
  let latest;

  createSurveyBuilder({
    target,
    survey: sampleSurvey(),
    onChange: (survey) => {
      latest = survey;
    }
  });

  clickButtonByTitle(target, "Anadir pregunta al final de esta pagina");
  assert.equal(latest.pages[0].elements.length, 2);
  await waitForBuilderRender();

  const deleteQuestionButton = target.querySelector(".preview-question .icon-button[title='Eliminar pregunta']");
  assert.ok(deleteQuestionButton, "Preview delete question button not found");
  deleteQuestionButton.click();
  assert.equal(latest.pages[0].elements.length, 1);
});

test("builder edits type and scoring fields", () => {
  const target = setupDom();
  let latest;

  createSurveyBuilder({
    target,
    survey: sampleSurvey(),
    onChange: (survey) => {
      latest = survey;
    }
  });

  const questionCard = target.querySelector(".preview-question");
  assert.ok(questionCard);
  questionCard.click();

  const typeSelect = findSelectByOptionValue(target, "radio");
  assert.ok(typeSelect);
  typeSelect.value = "radio";
  typeSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

  const scoringCheckbox = Array.from(target.querySelectorAll('input[type="checkbox"]'))
    .find((input) => input.closest(".check-row"));
  assert.ok(scoringCheckbox);
  scoringCheckbox.checked = true;
  scoringCheckbox.dispatchEvent(new window.Event("change", { bubbles: true }));
  const correctAnswerSelect = Array.from(target.querySelectorAll("select"))
    .find((select) => Array.from(select.options).some((option) => option.value === "yes" || option.value === "pro" || option.value === "free"));
  if (correctAnswerSelect && correctAnswerSelect.options.length > 0) {
    correctAnswerSelect.value = correctAnswerSelect.options[0].value;
    correctAnswerSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  }

  const question = latest.pages[0].elements[0];
  assert.equal(question.type, "radio");
  assert.equal(question.scoring.enabled, true);
  assert.ok(question.scoring.correctAnswer !== undefined);
});

test("builder update replaces survey and destroy clears target", () => {
  const target = setupDom();
  const builder = createSurveyBuilder({ target, survey: sampleSurvey() });

  builder.update({
    survey: {
      title: "Replacement",
      pages: [{ title: "Only page", elements: [{ name: "email", type: "text", title: "Email" }] }]
    }
  });

  assert.equal(builder.getSurvey().title, "Replacement");
  assert.ok(Array.from(target.querySelectorAll("input")).some((input) => input.value === "Email"));

  builder.destroy();
  assert.equal(target.innerHTML, "");
});

test("builder renders without a separate hierarchy sidebar", () => {
  const target = setupDom();

  createSurveyBuilder({
    target,
    survey: {
      title: "Hierarchy",
      pages: [
        {
          id: "page-1",
          title: "Page 1",
          elements: [
            { id: "q1", name: "q1", type: "text", title: "Question 1" },
            { id: "q2", name: "q2", type: "text", title: "Question 2" }
          ]
        },
        {
          id: "page-2",
          title: "Page 2",
          elements: [{ id: "q3", name: "q3", type: "text", title: "Question 3" }]
        }
      ]
    }
  });

  assert.equal(target.querySelectorAll(".structure-panel").length, 0);
  assert.equal(target.querySelectorAll(".config-tree").length, 0);
  assert.ok(Array.from(target.querySelectorAll("input")).some((input) => input.value === "Question 1"));
});

test("builder JSON editor copies and saves draft changes", async () => {
  const target = setupDom();
  let clipboardText = "";
  let latest;

  setNavigator({
    clipboard: {
      writeText(value) {
        clipboardText = value;
        return Promise.resolve();
      }
    }
  });

  createSurveyBuilder({
    target,
    survey: sampleSurvey(),
    onChange: (survey) => {
      latest = survey;
    }
  });

  clickButton(target, "Editor JSON");

  const textarea = target.querySelector(".builder-json-textarea");
  assert.ok(textarea);
  const draft = JSON.parse(textarea.value);
  draft.title = "Edited from JSON";
  textarea.value = JSON.stringify(draft, null, 2);
  textarea.dispatchEvent(new window.Event("input", { bubbles: true }));

  clickButton(target, "Copy JSON");
  assert.match(clipboardText, /Edited from JSON/);
  assert.ok(Array.from(target.querySelectorAll("button")).some((button) => button.textContent.trim() === "Copied"));
  await Promise.resolve();
  assert.match(document.body.textContent, /JSON copiado/);

  await new Promise((resolve) => setTimeout(resolve, 560));
  assert.ok(Array.from(target.querySelectorAll("button")).some((button) => button.textContent.trim() === "Copy JSON"));

  clickButton(target, "Save JSON");
  assert.equal(latest.title, "Edited from JSON");
  assert.match(document.body.textContent, /JSON guardado/);
});

test("builder edits survey and page fields without replacing the builder DOM", () => {
  const target = setupDom();
  const changes = [];

  createSurveyBuilder({
    target,
    survey: allTypesSurvey(),
    onChange: (survey) => changes.push(survey)
  });

  const root = target.firstElementChild;
  const cards = snapshotQuestionCards(target);
  const surveyTitle = labeledInput(target, "Titulo");
  surveyTitle.focus();
  surveyTitle.value = "Survey without refresh";
  surveyTitle.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.equal(target.firstElementChild, root);
  assertQuestionCardsUnchanged(target, cards);
  assert.equal(document.activeElement, surveyTitle);
  assert.equal(changes.at(-1).title, "Survey without refresh");

  const pageTitle = labeledInput(target, "Titulo de pagina");
  pageTitle.focus();
  pageTitle.value = "Page without refresh";
  pageTitle.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.equal(target.firstElementChild, root);
  assertQuestionCardsUnchanged(target, cards);
  assert.equal(document.activeElement, pageTitle);
  assert.equal(changes.at(-1).pages[0].title, "Page without refresh");
});

test("builder syncs configurator question description and placeholder into the center block", async () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "textarea");
  const before = snapshotQuestionCards(target);

  const description = editorInputByAria(target, "Descripcion de la pregunta");
  description.focus();
  description.value = "Descripcion desde configurador";
  description.dispatchEvent(new window.Event("input", { bubbles: true }));
  await waitForBuilderRender();

  assertOnlyQuestionCardChanged(target, before, "textarea");
  assert.equal(document.activeElement.getAttribute("aria-label"), "Descripcion de la pregunta");
  assert.equal(questionFromLatest(latest, "textarea").description, "Descripcion desde configurador");
  assert.equal(
    target.querySelector('[data-question-id="q_textarea"] textarea[aria-label="Question description"]').value,
    "Descripcion desde configurador"
  );

  const afterDescription = snapshotQuestionCards(target);
  const placeholder = editorInputByAria(target, "Texto de placeholder o sugerencia");
  placeholder.focus();
  placeholder.value = "Placeholder desde configurador";
  placeholder.dispatchEvent(new window.Event("input", { bubbles: true }));
  await waitForBuilderRender();

  assertOnlyQuestionCardChanged(target, afterDescription, "textarea");
  assert.equal(document.activeElement.getAttribute("aria-label"), "Texto de placeholder o sugerencia");
  assert.equal(questionFromLatest(latest, "textarea").placeholder, "Placeholder desde configurador");
  assert.equal(
    target.querySelector('[data-question-id="q_textarea"] textarea[disabled]').getAttribute("placeholder"),
    "Placeholder desde configurador"
  );
});

test("builder toggles scoring from the center question block", async () => {
  const { target, latest } = mountAllTypesBuilder();
  const card = selectQuestion(target, "radio");
  const before = snapshotQuestionCards(target);
  const toggle = card.querySelector(".builder-inline-scoring input");

  assert.ok(toggle, "inline scoring toggle not found");
  toggle.checked = true;
  toggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  await waitForBuilderRender();

  assertOnlyQuestionCardChanged(target, before, "radio");
  assert.equal(questionFromLatest(latest, "radio").scoring.enabled, true);
  assert.match(target.querySelector('[data-question-id="q_radio"] .builder-inline-scoring').textContent, /Puntuable/);
});

test("builder only uses entry animation for newly inserted questions", async () => {
  const target = setupDom();

  createSurveyBuilder({
    target,
    survey: sampleSurvey()
  });

  assert.equal(target.querySelector(".preview-question").classList.contains("is-entering"), false);

  clickButtonByTitle(target, "Anadir pregunta al final de esta pagina");
  await waitForBuilderRender();

  const entered = Array.from(target.querySelectorAll(".preview-question"))
    .filter((card) => card.classList.contains("is-entering"));
  assert.equal(entered.length, 1);

  entered[0].click();
  const before = snapshotQuestionCards(target);
  const toggle = entered[0].querySelector(".builder-inline-scoring input");
  toggle.checked = true;
  toggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  await waitForBuilderRender();

  assertOnlyQuestionCardChangedById(target, before, entered[0].dataset.questionId);
  assert.equal(target.querySelector(`[data-question-id="${entered[0].dataset.questionId}"]`).classList.contains("is-entering"), false);
});

for (const type of QUESTION_TYPES.map((item) => item.value)) {
  test(`builder edits common question fields for ${type} without replacing the survey DOM`, () => {
    const { target, latest } = mountAllTypesBuilder();
    const card = selectQuestion(target, type);
    const root = target.firstElementChild;
    const cards = snapshotQuestionCards(target);

    const titleInput = card.querySelector(".builder-inline-title");
    titleInput.focus();
    titleInput.value = `${type} edited title`;
    titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    assert.equal(target.firstElementChild, root);
    assertQuestionCardsUnchanged(target, cards);
    assert.equal(document.activeElement, titleInput);
    assert.equal(questionFromLatest(latest, type).title, `${type} edited title`);

    if (!["panel", "codeBlock", "svgNote", "contentBlock"].includes(type)) {
      const required = editorInputByAria(target, "Pregunta obligatoria");
      required.checked = true;
      required.dispatchEvent(new window.Event("change", { bubbles: true }));

      assert.equal(target.firstElementChild, root);
      assertQuestionCardsUnchanged(target, cards);
      assert.equal(questionFromLatest(latest, type).required, true);
    }
  });
}

test("builder edits text placeholder without replacing any question card", () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "text");
  const cards = snapshotQuestionCards(target);
  const placeholder = editorInputByAria(target, "Texto de placeholder o sugerencia");

  placeholder.focus();
  placeholder.value = "Write a short answer";
  placeholder.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, cards);
  assert.equal(document.activeElement, placeholder);
  assert.equal(questionFromLatest(latest, "text").placeholder, "Write a short answer");
});

test("builder edits textarea placeholder without replacing any question card", () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "textarea");
  const cards = snapshotQuestionCards(target);
  const placeholder = editorInputByAria(target, "Texto de placeholder o sugerencia");

  placeholder.focus();
  placeholder.value = "Write a longer answer";
  placeholder.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, cards);
  assert.equal(document.activeElement, placeholder);
  assert.equal(questionFromLatest(latest, "textarea").placeholder, "Write a longer answer");
});

test("builder edits boolean labels from sidebar and central quick options", async () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "boolean");
  const before = snapshotQuestionCards(target);
  const trueLabel = editorInputByAria(target, "Texto del valor verdadero");

  trueLabel.focus();
  trueLabel.value = "Blanco";
  trueLabel.dispatchEvent(new window.Event("input", { bubbles: true }));
  await waitForBuilderRender();

  assertOnlyQuestionCardChanged(target, before, "boolean");
  assert.equal(questionFromLatest(latest, "boolean").trueLabel, "Blanco");
  assert.match(target.querySelector(".preview-question[data-question-id='q_boolean']").textContent, /Blanco/);

  const afterSidebar = snapshotQuestionCards(target);
  const falseLabel = editorInputByAria(target, "Texto del valor falso");
  falseLabel.value = "Negro";
  falseLabel.dispatchEvent(new window.Event("input", { bubbles: true }));
  await waitForBuilderRender();

  assertOnlyQuestionCardChanged(target, afterSidebar, "boolean");
  assert.equal(questionFromLatest(latest, "boolean").falseLabel, "Negro");
  assert.match(target.querySelector(".preview-question[data-question-id='q_boolean']").textContent, /Negro/);

  const inlineTrue = target.querySelector("[data-builder-focus-key$=':inline-boolean-true-label']");
  inlineTrue.focus();
  inlineTrue.value = "True";
  inlineTrue.dispatchEvent(new window.Event("input", { bubbles: true }));
  await waitForBuilderRender();

  assert.equal(questionFromLatest(latest, "boolean").trueLabel, "True");
  assert.equal(document.activeElement?.dataset.builderFocusKey?.endsWith(":inline-boolean-true-label"), true);
  assert.match(target.querySelector(".preview-question[data-question-id='q_boolean']").textContent, /True/);
});

for (const type of ["radio", "checkbox", "dropdown", "ranking"]) {
  test(`builder edits ${type} choices with a scoped question update`, async () => {
    const { target, latest } = mountAllTypesBuilder();
    selectQuestion(target, type);
    const before = snapshotQuestionCards(target);

    clickEditorButton(target, "Anadir opcion");
    await waitForBuilderRender();
    assertOnlyQuestionCardChanged(target, before, type);
    assert.equal(questionFromLatest(latest, type).choices.length, 3);

    const afterAdd = snapshotQuestionCards(target);
    const choiceText = target.querySelector(".builder-editor-question .choice-text");
    choiceText.focus();
    choiceText.value = `${type} option edited`;
    choiceText.dispatchEvent(new window.Event("input", { bubbles: true }));

    assertQuestionCardsUnchanged(target, afterAdd);
    assert.equal(document.activeElement, choiceText);
    assert.equal(questionFromLatest(latest, type).choices[0].text, `${type} option edited`);
  });
}

test("builder edits rating bounds without replacing any question card", () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "rating");
  const cards = snapshotQuestionCards(target);
  const min = editorInputByAria(target, "Valor minimo de calificacion");
  const max = editorInputByAria(target, "Valor maximo de calificacion");

  min.value = "2";
  min.dispatchEvent(new window.Event("input", { bubbles: true }));
  max.value = "9";
  max.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, cards);
  assert.equal(questionFromLatest(latest, "rating").rateMin, 2);
  assert.equal(questionFromLatest(latest, "rating").rateMax, 9);
});

test("builder edits emoji scale faces with a scoped question update", async () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "emojiScale");
  const before = snapshotQuestionCards(target);

  clickEditorButton(target, "Anadir cara");
  await waitForBuilderRender();
  assertOnlyQuestionCardChanged(target, before, "emojiScale");
  assert.equal(questionFromLatest(latest, "emojiScale").choices.length, 6);

  const afterAdd = snapshotQuestionCards(target);
  const text = target.querySelector(".builder-editor-question .choice-text");
  text.focus();
  text.value = "Delighted";
  text.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, afterAdd);
  assert.equal(document.activeElement, text);
  assert.equal(questionFromLatest(latest, "emojiScale").choices[0].text, "Delighted");
});

for (const type of ["imageChoice", "imageCompare"]) {
  test(`builder edits ${type} image options with a scoped question update`, async () => {
    const { target, latest } = mountAllTypesBuilder();
    selectQuestion(target, type);
    const before = snapshotQuestionCards(target);

    clickEditorButton(target, "Anadir imagen");
    await waitForBuilderRender();
    assertOnlyQuestionCardChanged(target, before, type);
    assert.equal(questionFromLatest(latest, type).choices.length, 3);

    const afterAdd = snapshotQuestionCards(target);
    const url = target.querySelector(".builder-editor-question .choice-image-url");
    url.focus();
    url.value = "https://example.com/image.png";
    url.dispatchEvent(new window.Event("input", { bubbles: true }));

    assertQuestionCardsUnchanged(target, afterAdd);
    assert.equal(document.activeElement, url);
    assert.equal(questionFromLatest(latest, type).choices[0].imageUrl, "https://example.com/image.png");
  });
}

test("builder edits matrix axes with a scoped question update", async () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "matrix");
  const before = snapshotQuestionCards(target);

  clickEditorButton(target, "Anadir");
  await waitForBuilderRender();
  assertOnlyQuestionCardChanged(target, before, "matrix");
  assert.equal(questionFromLatest(latest, "matrix").rows.length, 4);

  const afterAdd = snapshotQuestionCards(target);
  const rowText = target.querySelector(".builder-editor-question .choice-text");
  rowText.focus();
  rowText.value = "Quality";
  rowText.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, afterAdd);
  assert.equal(document.activeElement, rowText);
  assert.equal(questionFromLatest(latest, "matrix").rows[0].text, "Quality");
});

test("builder edits nested panel questions with a scoped question update", async () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "panel");
  const before = snapshotQuestionCards(target);

  clickEditorButton(target, "Anadir pregunta");
  await waitForBuilderRender();
  assertOnlyQuestionCardChanged(target, before, "panel");
  assert.equal(questionFromLatest(latest, "panel").elements.length, 2);

  const afterAdd = snapshotQuestionCards(target);
  const nestedTitle = editorInputByAria(target, "Titulo de pregunta anidada");
  nestedTitle.focus();
  nestedTitle.value = "Nested edited";
  nestedTitle.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, afterAdd);
  assert.equal(document.activeElement, nestedTitle);
  assert.equal(questionFromLatest(latest, "panel").elements[0].title, "Nested edited");
});

test("builder edits code block language and code without replacing any question card", () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "codeBlock");
  const cards = snapshotQuestionCards(target);
  const language = editorInputByAria(target, "Lenguaje de programacion");
  const code = editorInputByAria(target, "Codigo fuente");

  language.value = "typescript";
  language.dispatchEvent(new window.Event("input", { bubbles: true }));
  code.value = "const ok = true;";
  code.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, cards);
  assert.equal(questionFromLatest(latest, "codeBlock").language, "typescript");
  assert.equal(questionFromLatest(latest, "codeBlock").code, "const ok = true;");
});

test("builder edits svg note variant without replacing the survey DOM", () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "svgNote");
  const root = target.firstElementChild;
  const cards = snapshotQuestionCards(target);
  const variant = editorField(target, "Variante visual").querySelector("input, textarea, select");

  variant.value = "waves";
  variant.dispatchEvent(new window.Event("change", { bubbles: true }));

  assert.equal(target.firstElementChild, root);
  assertQuestionCardsUnchanged(target, cards);
  assert.equal(questionFromLatest(latest, "svgNote").variant, "waves");
});

test("builder edits content block body and media fields without replacing any question card", () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "contentBlock");
  const cards = snapshotQuestionCards(target);
  const body = editorInputByAria(target, "Cuerpo del bloque de contenido");
  const image = editorInputByAria(target, "URL de imagen");
  const caption = editorInputByAria(target, "Pie de imagen");

  body.value = "Content body edited";
  body.dispatchEvent(new window.Event("input", { bubbles: true }));
  image.value = "https://example.com/content.png";
  image.dispatchEvent(new window.Event("input", { bubbles: true }));
  caption.value = "Content caption";
  caption.dispatchEvent(new window.Event("input", { bubbles: true }));

  assertQuestionCardsUnchanged(target, cards);
  assert.equal(questionFromLatest(latest, "contentBlock").body, "Content body edited");
  assert.equal(questionFromLatest(latest, "contentBlock").imageUrl, "https://example.com/content.png");
  assert.equal(questionFromLatest(latest, "contentBlock").imageCaption, "Content caption");
});

test("builder toggles boolean scoring with a scoped question update", async () => {
  const { target, latest } = mountAllTypesBuilder();
  selectQuestion(target, "boolean");
  const before = snapshotQuestionCards(target);
  const scoringToggle = target.querySelector(".builder-editor-question .check-row input[type='checkbox']");

  scoringToggle.checked = true;
  scoringToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  await waitForBuilderRender();

  assertOnlyQuestionCardChanged(target, before, "boolean");
  assert.equal(questionFromLatest(latest, "boolean").scoring.enabled, true);
  assert.ok(target.querySelector(".builder-editor-question .scoring-editor"));
});

function setupDom() {
  const window = new Window();
  window.document.body.innerHTML = "<div id=\"target\"></div>";
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.Event = window.Event;
  setNavigator(window.navigator);
  return window.document.querySelector("#target");
}

function setNavigator(value) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value
  });
}

function sampleSurvey() {
  return {
    title: "Sample",
    pages: [
      {
        title: "Page 1",
        elements: [{ id: "q1", name: "name", type: "text", title: "Name" }]
      }
    ]
  };
}

function allTypesSurvey() {
  return {
    title: "All types",
    description: "Survey covering every builder editor",
    imageUrl: "",
    pages: [
      {
        id: "page-all",
        title: "All question types",
        description: "A page with every question type",
        elements: QUESTION_TYPES.map(({ value }) => createQuestion(value, {
          id: questionIdForType(value),
          name: value,
          title: `${value} title`,
          description: `${value} description`,
          ...(value === "panel" ? { elements: [createQuestion("text", { id: "nested_text", name: "nested_text", title: "Nested text" })] } : {})
        }))
      }
    ]
  };
}

function mountAllTypesBuilder() {
  const target = setupDom();
  let latest;
  createSurveyBuilder({
    target,
    survey: allTypesSurvey(),
    onChange: (survey) => {
      latest = survey;
    }
  });
  latest = latest || allTypesSurvey();
  return {
    target,
    latest: () => latest
  };
}

function questionIdForType(type) {
  return `q_${type}`;
}

function selectQuestion(target, type) {
  const card = target.querySelector(`.preview-question[data-question-id="${questionIdForType(type)}"]`);
  assert.ok(card, `Question card not found for type ${type}`);
  card.click();
  return target.querySelector(`.preview-question[data-question-id="${questionIdForType(type)}"]`);
}

function questionFromLatest(latestRef, type) {
  const survey = typeof latestRef === "function" ? latestRef() : latestRef;
  const question = survey.pages[0].elements.find((item) => item.id === questionIdForType(type));
  assert.ok(question, `Latest survey missing ${type}`);
  return question;
}

function snapshotQuestionCards(target) {
  return new Map(Array.from(target.querySelectorAll(".preview-question")).map((card) => [
    card.dataset.questionId,
    card
  ]));
}

function assertQuestionCardsUnchanged(target, snapshot) {
  for (const [questionId, card] of snapshot) {
    assert.equal(target.querySelector(`.preview-question[data-question-id="${questionId}"]`), card, `${questionId} card was replaced`);
  }
}

function assertOnlyQuestionCardChanged(target, snapshot, changedType) {
  assertOnlyQuestionCardChangedById(target, snapshot, questionIdForType(changedType));
}

function assertOnlyQuestionCardChangedById(target, snapshot, changedId) {
  for (const [questionId, card] of snapshot) {
    const nextCard = target.querySelector(`.preview-question[data-question-id="${questionId}"]`);
    assert.ok(nextCard, `${questionId} card missing after update`);
    if (questionId === changedId) {
      assert.notEqual(nextCard, card, `${questionId} card should be the only updated card`);
    } else {
      assert.equal(nextCard, card, `${questionId} card was unexpectedly replaced`);
    }
  }
}

function label(target, text) {
  return Array.from(target.querySelectorAll("label")).find((item) => item.textContent.includes(text));
}

function labeledInput(target, text) {
  return label(target, text).querySelector("input, textarea, select");
}

function editorField(target, text) {
  const editor = target.querySelector(".builder-editor-question");
  assert.ok(editor, "Question editor not found");
  const field = Array.from(editor.querySelectorAll("label")).find((item) => item.textContent.includes(text));
  assert.ok(field, `Editor field not found: ${text}`);
  return field;
}

function editorInputByAria(target, ariaLabel) {
  const editor = target.querySelector(".builder-editor-question");
  assert.ok(editor, "Question editor not found");
  const control = editor.querySelector(`[aria-label="${ariaLabel}"]`);
  assert.ok(control, `Editor control not found by aria-label: ${ariaLabel}`);
  return control;
}

function clickButton(target, text) {
  const button = Array.from(target.querySelectorAll("button")).find((item) => item.textContent === text);
  assert.ok(button, `Button not found: ${text}`);
  button.click();
}

function clickEditorButton(target, text) {
  const editor = target.querySelector(".builder-editor-question");
  assert.ok(editor, "Question editor not found");
  const button = Array.from(editor.querySelectorAll("button")).find((item) => item.textContent.trim() === text);
  assert.ok(button, `Editor button not found: ${text}`);
  button.click();
}

function clickLastButton(target, text) {
  const buttons = Array.from(target.querySelectorAll("button")).filter((item) => item.textContent === text);
  assert.ok(buttons.length, `Button not found: ${text}`);
  buttons.at(-1).click();
}

function clickButtonByTitle(target, title) {
  const button = Array.from(target.querySelectorAll("button")).find((item) => item.getAttribute("title") === title);
  assert.ok(button, `Button not found with title: ${title}`);
  button.click();
}

function findSelectByOptionValue(target, value) {
  return Array.from(target.querySelectorAll("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === value)
  );
}

function waitForBuilderRender() {
  return new Promise((resolve) => setTimeout(resolve, 40));
}
