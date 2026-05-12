export function createTranslator(options = {}) {
  const locale = options.locale || "en";
  const fallbackLocale = options.fallbackLocale || "en";
  const messages = options.messages || {};
  const overrides = options.overrides || {};

  return function translate(key, vars = {}, fallback = key) {
    const template = overrides[key]
      ?? messages[locale]?.[key]
      ?? messages[fallbackLocale]?.[key]
      ?? fallback;

    return String(template).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  };
}

export function resolveLocale(candidate, available, fallback = "en") {
  return available[candidate] ? candidate : fallback;
}
