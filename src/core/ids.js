let counter = 0;

export function createId(prefix = "id") {
  counter += 1;
  return `${sanitizePrefix(prefix)}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

function sanitizePrefix(prefix) {
  return String(prefix || "id")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "id";
}
