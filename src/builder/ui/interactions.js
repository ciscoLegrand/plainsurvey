// Lazy-load @atlaskit only when needed to avoid Vite build failures
let draggable, dropTargetForElements, monitorForElements, combine;
let atlaskitReady = false;

async function ensureAtlaskitLoaded() {
  if (atlaskitReady) return;
  try {
    // Use string concatenation to prevent Vite from statically analyzing this import
    const pkgName = "@atlaskit" + "/" + "pragmatic-drag-and-drop";
    const module = await import(pkgName);
    draggable = module.draggable;
    dropTargetForElements = module.dropTargetForElements;
    monitorForElements = module.monitorForElements;
    combine = module.combine;
    atlaskitReady = true;
  } catch (err) {
    console.warn("[plainsurvey] @atlaskit/pragmatic-drag-and-drop failed to load:", err);
  }
}

let cleanupDragAndDrop = null;
let cleanupFloatingPanels = null;
// Positions persisted across re-renders (keyed by storageKey) so panels don't jump.
const panelPositionCache = new Map();

export function initializeBuilderInteractions(root, actions) {
  // Start loading @atlaskit in background without blocking
  ensureAtlaskitLoaded();
  
  // Small delay to allow @atlaskit to load; if it's not ready yet, drag-and-drop will be unavailable
  // but the UI will still render. On next initialization (after re-render), it will likely be ready.
  setTimeout(() => {
    if (atlaskitReady) {
      setupDragAndDrop(root, actions);
    }
  }, 50);
  
  setupFloatingPanels(root);
}

function setupFloatingPanels(root) {
  // Only clean up event listeners — do NOT touch inline styles of old panels.
  // Panels are about to be replaced by replaceChildren(); resetting their styles
  // causes a 1-frame visual jump (CSS kicks in for that frame before replacement).
  cleanupFloatingPanels?.();
  const storage = globalThis.localStorage;

  const usesFloatingPanels = ["modern", "full"].includes(document.documentElement.getAttribute("data-layout")) && window.innerWidth > 920;
  if (!usesFloatingPanels) {
    cleanupFloatingPanels = null;
    return;
  }

  const toolboxWidth = clampNumber(Math.round(window.innerWidth * 0.18), 250, 360);
  const propertiesWidth = clampNumber(Math.round(window.innerWidth * 0.18), 320, 430);
  const panelTop = resolveFloatingPanelTop();
  const sideInset = Math.max(10, Math.round(window.innerWidth * 0.01));

  const panels = [
    {
      panel: root.querySelector("[data-float-panel='toolbox']"),
      handle: root.querySelector("[data-panel-handle='toolbox']"),
      storageKey: "survey-lite.float.toolbox",
      width: toolboxWidth,
      fallback: { left: sideInset, top: panelTop }
    },
    {
      panel: root.querySelector("[data-float-panel='properties']"),
      handle: root.querySelector("[data-panel-handle='properties']"),
      storageKey: "survey-lite.float.properties",
      width: propertiesWidth,
      fallback: { left: Math.max(sideInset, window.innerWidth - propertiesWidth - sideInset), top: panelTop }
    }
  ].filter((item) => item.panel && item.handle);

  const cleanups = [];

  panels.forEach((item) => {
    const { panel, handle, storageKey, fallback, width } = item;
    panel.classList.add("is-floating-panel");
    panel.classList.remove("is-minimized");
    panel.style.width = `${width}px`;

    // Priority: in-memory cache (survives re-renders) > localStorage > fallback.
    let position = fallback;
    if (panelPositionCache.has(storageKey)) {
      position = panelPositionCache.get(storageKey);
    } else {
      const raw = storage?.getItem?.(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
            position = parsed;
          }
        } catch {
          // Ignore invalid stored position.
        }
      }
    }

    const applyPosition = (next) => {
      const maxLeft = Math.max(sideInset, window.innerWidth - width - sideInset);
      const maxTop = Math.max(panelTop, window.innerHeight - 180);
      const left = Math.min(Math.max(sideInset, next.left), maxLeft);
      const top = Math.min(Math.max(panelTop, next.top), maxTop);
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      position = { left, top };
      panelPositionCache.set(storageKey, position);
    };

    applyPosition(position);

    const minimizeBtn = handle.querySelector(".panel-minimize-btn");
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      cleanups.push(() => {});
    }

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      handle.setPointerCapture?.(event.pointerId);
      panel.classList.add("is-dragging-panel");

      const startX = event.clientX;
      const startY = event.clientY;
      const start = { ...position };

      const onMove = (moveEvent) => {
        applyPosition({
          left: start.left + moveEvent.clientX - startX,
          top: start.top + moveEvent.clientY - startY
        });
      };

      const onUp = () => {
        panel.classList.remove("is-dragging-panel");
        handle.releasePointerCapture?.(event.pointerId);
        storage?.setItem?.(storageKey, JSON.stringify(position));
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    handle.addEventListener("pointerdown", onPointerDown);
    cleanups.push(() => handle.removeEventListener("pointerdown", onPointerDown));
  });

  cleanupFloatingPanels = () => {
    // Only remove event listeners. Do NOT touch inline styles — panels are
    // being replaced by replaceChildren() so resetting styles causes a
    // 1-frame position jump as CSS takes over before the DOM swap.
    cleanups.forEach((cleanup) => cleanup());
  };
}

function resolveFloatingPanelTop() {
  const cssValue = typeof getComputedStyle === "function"
    ? Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--ps-panel-top"), 10)
    : 76;
  const baseTop = Number.isFinite(cssValue) ? cssValue : 76;

  const routeToolbar = document.querySelector(".plainsurveyRoute .plainsurveyToolbar");
  if (!routeToolbar) return baseTop;

  return Math.max(baseTop, Math.round(routeToolbar.getBoundingClientRect().bottom + 10));
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setupDragAndDrop(root, actions) {
  // Validate that @atlaskit has loaded before setting up drag-and-drop
  if (!atlaskitReady || !draggable || !combine) {
    console.warn("[plainsurvey] @atlaskit/pragmatic-drag-and-drop not yet loaded, drag-and-drop disabled");
    cleanupDragAndDrop = null;
    return;
  }

  cleanupDragAndDrop?.();

  // Node + happy-dom test environments do not provide every browser constructor required by the DnD library.
  if (typeof HTMLIFrameElement === "undefined" || typeof Element === "undefined" || typeof getComputedStyle === "undefined") {
    cleanupDragAndDrop = null;
    return;
  }

  const cleanups = [
    ...Array.from(root.querySelectorAll("[data-drag-kind='palette']")).map((element) => {
      return draggable({
        element,
        getInitialData: () => ({
          builderDrag: "palette",
          questionType: element.dataset.questionType
        }),
        onDragStart: () => element.classList.add("is-dragging"),
        onDrop: () => element.classList.remove("is-dragging")
      });
    }),
    ...Array.from(root.querySelectorAll("[data-drag-kind='question']")).map((element) => {
      return draggable({
        element,
        getInitialData: () => ({
          builderDrag: "question",
          pageId: element.dataset.pageId,
          questionId: element.dataset.questionId
        }),
        onDragStart: () => element.classList.add("is-dragging"),
        onDrop: () => element.classList.remove("is-dragging")
      });
    }),
    ...Array.from(root.querySelectorAll(".question-dropzone")).map((element) => {
      return dropTargetForElements({
        element,
        getData: () => ({
          builderDrop: "question-drop",
          pageId: element.dataset.pageId,
          insertIndex: Number(element.dataset.insertIndex)
        }),
        canDrop: ({ source }) => ["palette", "question"].includes(source.data.builderDrag),
        onDragEnter: () => element.classList.add("is-over"),
        onDragLeave: () => element.classList.remove("is-over"),
        onDrop: () => element.classList.remove("is-over")
      });
    }),
    monitorForElements({
      canMonitor: ({ source }) => ["palette", "question"].includes(source.data.builderDrag),
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets.find((item) => item.data.builderDrop === "question-drop");
        if (!target) return;

        const { pageId, insertIndex } = target.data;
        if (source.data.builderDrag === "palette") {
          actions.insertQuestion(pageId, source.data.questionType, insertIndex);
          return;
        }

        actions.moveQuestion(source.data.pageId, source.data.questionId, pageId, insertIndex);
      }
    })
  ];

  cleanupDragAndDrop = combine(...cleanups);
}