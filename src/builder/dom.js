export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(options).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, value);
    }
  });

  children.forEach((child) => {
    if (child === undefined || child === null) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });

  return node;
}

export function empty(node) {
  node.replaceChildren();
}

export function field(label, input, hint) {
  const children = [el("span", { class: "field-label", text: label }), input];
  if (hint) children.push(el("small", { class: "field-hint", text: hint }));
  return el("label", { class: "field" }, children);
}

export function input(value, onInput, attrs = {}) {
  return el("input", {
    ...attrs,
    class: attrs.class ? `ps-builder-control ps-builder-input ${attrs.class}` : "ps-builder-control ps-builder-input",
    value: value ?? "",
    oninput: (event) => onInput(event.target.value)
  });
}

export function textarea(value, onInput, attrs = {}) {
  return el("textarea", {
    ...attrs,
    class: attrs.class ? `ps-builder-control ps-builder-textarea ${attrs.class}` : "ps-builder-control ps-builder-textarea",
    oninput: (event) => onInput(event.target.value)
  }, [value ?? ""]);
}

export function select(value, options, onChange, attrs = {}) {
  const node = el("select", {
    ...attrs,
    class: attrs.class ? `ps-builder-control ps-builder-select ${attrs.class}` : "ps-builder-control ps-builder-select",
    onchange: (event) => onChange(event.target.value)
  }, options.map((option) => el("option", {
    value: option.value,
    text: option.label,
    selected: option.value === value
  })));

  return node;
}
