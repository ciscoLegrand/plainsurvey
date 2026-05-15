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
    "aria-label": attrs["aria-label"] || "",
    oninput: (event) => onInput(event.target.value)
  });
}

export function textarea(value, onInput, attrs = {}) {
  const { autoHeight, ...rest } = attrs;
  const node = el("textarea", {
    ...rest,
    class: autoHeight
      ? (rest.class ? `ps-builder-control ps-builder-textarea auto-height ${rest.class}` : "ps-builder-control ps-builder-textarea auto-height")
      : (rest.class ? `ps-builder-control ps-builder-textarea ${rest.class}` : "ps-builder-control ps-builder-textarea"),
    "aria-label": rest["aria-label"] || "",
    oninput: (event) => {
      if (autoHeight && !CSS.supports("field-sizing", "content")) {
        event.target.style.height = "auto";
        event.target.style.height = `${event.target.scrollHeight}px`;
      }
      onInput(event.target.value);
    }
  }, [value ?? ""]);
  if (autoHeight && !CSS.supports("field-sizing", "content")) {
    queueMicrotask(() => {
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight}px`;
    });
  }
  return node;
}

export function imageInput(value, onInput, attrs = {}) {
  const { "aria-label": ariaLabel = "", dataset, ...rest } = attrs;

  const urlInput = el("input", {
    ...rest,
    type: "url",
    placeholder: "https://...",
    class: "ps-builder-control ps-builder-input",
    value: value ?? "",
    "aria-label": ariaLabel,
    ...(dataset ? { dataset } : {}),
    oninput: (event) => onInput(event.target.value)
  });

  const fileInput = el("input", {
    type: "file",
    accept: "image/*",
    style: "display:none",
    "aria-label": ariaLabel ? `${ariaLabel} - archivo` : "Seleccionar imagen"
  });

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      urlInput.value = e.target.result;
      onInput(e.target.result);
    };
    reader.readAsDataURL(file);
  });

  const browseBtn = el("button", {
    type: "button",
    class: "ps-builder-image-browse icon-button",
    title: "Seleccionar archivo",
    html: `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M.5 3.5A1.5 1.5 0 0 1 2 2h3.586a1.5 1.5 0 0 1 1.06.44l.415.415A1.5 1.5 0 0 0 8.121 3.5H14A1.5 1.5 0 0 1 15.5 5v7A1.5 1.5 0 0 1 14 13.5H2A1.5 1.5 0 0 1 .5 12V3.5z"/></svg>`,
    onclick: () => fileInput.click()
  });

  return el("div", { class: "ps-builder-image-input" }, [urlInput, browseBtn, fileInput]);
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
