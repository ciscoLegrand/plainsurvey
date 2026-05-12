export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return {
      url: new URL(`../src/${specifier.slice(2)}`, import.meta.url).href,
      shortCircuit: true
    };
  }

  if (specifier === "@") {
    return {
      url: new URL("../src", import.meta.url).href,
      shortCircuit: true
    };
  }

  return nextResolve(specifier, context);
}
