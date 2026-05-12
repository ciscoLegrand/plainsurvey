export function createTranslator(options = {}) {
  const locale = options.locale || "es";
  const fallbackLocale = options.fallbackLocale || "es";
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
