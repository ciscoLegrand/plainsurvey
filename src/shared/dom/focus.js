export function captureFocus(container) {
  const documentRef = container?.ownerDocument;
  const activeElement = documentRef?.activeElement;
  if (!activeElement || !container.contains(activeElement) || !isFocusableControl(activeElement)) return null;

  const controls = Array.from(container.querySelectorAll(focusableControlSelector()));
  return {
    index: controls.indexOf(activeElement),
    builderFocusKey: activeElement.dataset?.builderFocusKey || null,
    tagName: activeElement.tagName,
    type: activeElement.getAttribute("type") || "",
    id: activeElement.id || "",
    name: activeElement.getAttribute("name") || "",
    ariaLabel: activeElement.getAttribute("aria-label") || "",
    domPath: buildDomPath(container, activeElement),
    selectionStart: readSelection(activeElement, "selectionStart"),
    selectionEnd: readSelection(activeElement, "selectionEnd")
  };
}

export function restoreFocus(container, snapshot) {
  if (!snapshot || snapshot.index < 0) return;

  const control =
    findByBuilderFocusKey(container, snapshot) ||
    findByStableAttributes(container, snapshot) ||
    findByDomPath(container, snapshot) ||
    Array.from(container.querySelectorAll(focusableControlSelector()))[snapshot.index];
  if (!control || control.disabled) return;

  control.focus({ preventScroll: true });
  if (snapshot.selectionStart === null || snapshot.selectionEnd === null) return;

  try {
    control.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  } catch {
    // Some controls do not support text selection.
  }
}

function focusableControlSelector() {
  return "input, textarea, select";
}

function isFocusableControl(element) {
  return element.matches(focusableControlSelector());
}

function readSelection(element, key) {
  try {
    return typeof element[key] === "number" ? element[key] : null;
  } catch {
    return null;
  }
}

function findByBuilderFocusKey(container, snapshot) {
  if (!snapshot.builderFocusKey) return null;
  return container.querySelector(`[data-builder-focus-key="${cssEscape(snapshot.builderFocusKey)}"]`);
}

function findByStableAttributes(container, snapshot) {
  const tag = (snapshot.tagName || "").toLowerCase();
  if (!tag) return null;

  if (snapshot.id) {
    const byId = container.querySelector(`${tag}#${cssEscape(snapshot.id)}`);
    if (byId) return byId;
  }

  if (snapshot.name) {
    const byName = container.querySelector(`${tag}[name="${cssEscape(snapshot.name)}"]`);
    if (isMatchingType(byName, snapshot.type)) return byName;
  }

  if (snapshot.ariaLabel) {
    const byAria = container.querySelector(`${tag}[aria-label="${cssEscape(snapshot.ariaLabel)}"]`);
    if (isMatchingType(byAria, snapshot.type)) return byAria;
  }

  return null;
}

function findByDomPath(container, snapshot) {
  if (!Array.isArray(snapshot.domPath) || snapshot.domPath.length === 0) return null;
  let node = container;
  for (const childIndex of snapshot.domPath) {
    if (!node?.children || childIndex < 0 || childIndex >= node.children.length) return null;
    node = node.children[childIndex];
  }

  if (!node || !isFocusableControl(node)) return null;
  if (!isMatchingType(node, snapshot.type)) return null;
  return node;
}

function buildDomPath(container, element) {
  const path = [];
  let current = element;
  while (current && current !== container) {
    const parent = current.parentElement;
    if (!parent) return [];
    const index = Array.prototype.indexOf.call(parent.children, current);
    if (index < 0) return [];
    path.unshift(index);
    current = parent;
  }
  return current === container ? path : [];
}

function isMatchingType(element, expectedType) {
  if (!element) return false;
  if (!expectedType) return true;
  return (element.getAttribute("type") || "") === expectedType;
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}
