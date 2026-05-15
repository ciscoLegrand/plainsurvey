/**
 * src/shared/toast.js
 * Sistema de toast flotante reutilizable en toda la librería.
 * Usa las clases CSS de plainsurvey (.ps-toast, .ps-toast-container, etc.)
 * para respetar el theme/skin/layout activo sin estilos inline.
 *
 * Uso:
 *   const toast = createToastSystem();
 *   toast.show("Encuesta generada", "success");
 *   toast.show("Error al inicializar", "error", 6000);
 */

const ICONS = { success: "", error: "", warning: "", info: "" };

/**
 * Crea una instancia del sistema de toast montada en el body.
 * Se puede crear varias instancias o reutilizar una global.
 *
 * @param {HTMLElement} [mountTarget=document.body]
 * @returns {{ show, clear, destroy }}
 */
export function createToastSystem(mountTarget) {
  const target = mountTarget || (typeof document !== "undefined" ? document.body : null);
  if (!target) throw new Error("createToastSystem: no mount target available.");

  const container = document.createElement("div");
  container.className = "ps-toast-container";
  target.appendChild(container);

  function show(message, type = "info", duration = 4500) {
    const toast = document.createElement("div");
    toast.className = `ps-toast ps-toast--${type}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const icon = document.createElement("span");
    icon.className = "ps-toast-icon";
    icon.setAttribute("aria-hidden", "true");

    const body = document.createElement("span");
    body.className = "ps-toast-body";
    body.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(body);
    container.appendChild(toast);

    const dismiss = () => {
      toast.classList.add("is-dismissing");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    };

    toast.addEventListener("click", dismiss);
    if (duration > 0) setTimeout(dismiss, duration);

    return { dismiss };
  }

  function clear() {
    container.innerHTML = "";
  }

  function destroy() {
    container.remove();
  }

  return { show, clear, destroy };
}

/** Instancia global lazy — para uso directo sin instanciar. */
let _globalToast = null;

function getGlobalToast() {
  if (!_globalToast && typeof document !== "undefined") {
    _globalToast = createToastSystem(document.body);
  }
  return _globalToast;
}

/**
 * Muestra un toast usando la instancia global compartida.
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} [type="info"]
 * @param {number} [duration=4500]
 */
export function showToast(message, type = "info", duration = 4500) {
  return getGlobalToast()?.show(message, type, duration);
}
