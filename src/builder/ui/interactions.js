// Lazy-load @atlaskit only when needed
let draggable, dropTargetForElements, monitorForElements, combine;
let atlaskitLoadPromise = null;

async function ensureAtlaskitLoaded() {
  if (draggable && dropTargetForElements && monitorForElements && combine) return true;

  atlaskitLoadPromise ??= import("@atlaskit/pragmatic-drag-and-drop")
    .then((module) => {
      draggable = module.draggable;
      dropTargetForElements = module.dropTargetForElements;
      monitorForElements = module.monitorForElements;
      combine = module.combine;
      return true;
    })
    .catch((err) => {
      atlaskitLoadPromise = null;
      console.warn("[plainsurvey] @atlaskit/pragmatic-drag-and-drop failed to load:", err);
      return false;
    });

  return atlaskitLoadPromise;
}

let cleanupDragAndDrop = null;
let cleanupSidebarPanels = null;
let cleanupNativeDragAndDrop = null;

export function initializeBuilderInteractions(root, actions) {
  setupSidebarPanels(root);
  setupNativeDragAndDrop(root, actions);
}

function setupSidebarPanels(root) {
  cleanupSidebarPanels?.();
  const storage = globalThis.localStorage;
  const panels = Array.from(root.querySelectorAll("[data-sidebar-panel]"));
  const cleanups = [];

  panels.forEach((panel) => {
    const key = panel.dataset.sidebarPanel;
    const button = panel.querySelector(`[data-toggle-sidebar="${key}"]`);
    const storageKey = `plainsurvey.sidebar.${key}.collapsed`;
    const isCollapsed = storage?.getItem?.(storageKey) === "true";

    panel.classList.toggle("is-collapsed", isCollapsed);
    button?.setAttribute("aria-expanded", String(!isCollapsed));

    if (!button) return;

    const onClick = (event) => {
      event.stopPropagation();
      const nextCollapsed = !panel.classList.contains("is-collapsed");
      panel.classList.toggle("is-collapsed", nextCollapsed);
      button.setAttribute("aria-expanded", String(!nextCollapsed));
      storage?.setItem?.(storageKey, String(nextCollapsed));
    };

    button.addEventListener("click", onClick);
    cleanups.push(() => button.removeEventListener("click", onClick));
  });

  cleanupSidebarPanels = () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

function setupNativeDragAndDrop(root, actions) {
  cleanupNativeDragAndDrop?.();
  const cleanups = [];
  let dragData = null;

  const draggables = Array.from(root.querySelectorAll("[data-drag-kind='palette'], [data-drag-kind='question']"));
  draggables.forEach((element) => {
    element.setAttribute("draggable", "true");

    const onDragStart = (event) => {
      dragData = element.dataset.dragKind === "palette"
        ? { builderDrag: "palette", questionType: element.dataset.questionType }
        : {
            builderDrag: "question",
            pageId: element.dataset.pageId,
            questionId: element.dataset.questionId
          };
      element.classList.add("is-dragging");
      event.dataTransfer?.setData?.("application/x-plainsurvey-builder", JSON.stringify(dragData));
      event.dataTransfer?.setData?.("text/plain", dragData.questionType || dragData.questionId || "");
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    };

    const onDragEnd = () => {
      element.classList.remove("is-dragging");
      root.querySelectorAll(".question-dropzone.is-over").forEach((dropzone) => dropzone.classList.remove("is-over"));
      dragData = null;
    };

    element.addEventListener("dragstart", onDragStart);
    element.addEventListener("dragend", onDragEnd);
    cleanups.push(() => element.removeEventListener("dragstart", onDragStart));
    cleanups.push(() => element.removeEventListener("dragend", onDragEnd));
  });

  Array.from(root.querySelectorAll(".question-dropzone")).forEach((element) => {
    const readDragData = (event) => {
      const raw = event.dataTransfer?.getData?.("application/x-plainsurvey-builder");
      if (!raw) return dragData;
      try {
        return JSON.parse(raw);
      } catch {
        return dragData;
      }
    };

    const onDragOver = (event) => {
      const data = readDragData(event);
      if (!data || !["palette", "question"].includes(data.builderDrag)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      element.classList.add("is-over");
    };
    const onDragLeave = () => element.classList.remove("is-over");
    const onDrop = (event) => {
      const data = readDragData(event);
      element.classList.remove("is-over");
      if (!data || !["palette", "question"].includes(data.builderDrag)) return;
      event.preventDefault();

      const pageId = element.dataset.pageId;
      const insertIndex = Number(element.dataset.insertIndex);
      if (data.builderDrag === "palette") {
        actions.insertQuestion(pageId, data.questionType, insertIndex);
        return;
      }
      actions.moveQuestion(data.pageId, data.questionId, pageId, insertIndex);
    };

    element.addEventListener("dragover", onDragOver);
    element.addEventListener("dragleave", onDragLeave);
    element.addEventListener("drop", onDrop);
    cleanups.push(() => element.removeEventListener("dragover", onDragOver));
    cleanups.push(() => element.removeEventListener("dragleave", onDragLeave));
    cleanups.push(() => element.removeEventListener("drop", onDrop));
  });

  cleanupNativeDragAndDrop = () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

function setupDragAndDrop(root, actions) {
  cleanupDragAndDrop?.();

  if (!draggable || !dropTargetForElements || !monitorForElements || !combine) {
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
