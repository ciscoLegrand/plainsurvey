import { initializeBuilderInteractions } from "./interactions.js";
import { takePendingBuilderFocus } from "./focus-state.js";
import { renderBuilderLayout } from "./panels.js";

export function renderBuilderView(state, actions, i18n = {}, options = {}) {
  const root = renderBuilderLayout(state, actions, i18n);
  if (options.initializeInteractions !== false) initializeBuilderInteractions(root, actions);
  return root;
}

export { initializeBuilderInteractions, takePendingBuilderFocus };
