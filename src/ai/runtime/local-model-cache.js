function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function modelMatches(candidate, modelValue) {
  const a = normalize(candidate);
  const b = normalize(modelValue);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function findModelFromText(text, models) {
  const raw = String(text || "");
  for (const model of models) {
    if (modelMatches(raw, model.value)) return model.value;
  }
  return null;
}

async function collectCacheStorageReferences(models) {
  const modelSet = new Set();
  if (typeof globalThis.caches === "undefined") return modelSet;

  try {
    const names = await globalThis.caches.keys();
    for (const name of names) {
      const fromName = findModelFromText(name, models);
      if (fromName) modelSet.add(fromName);

      try {
        const cache = await globalThis.caches.open(name);
        const requests = await cache.keys();
        for (const request of requests) {
          const fromUrl = findModelFromText(request.url, models);
          if (fromUrl) modelSet.add(fromUrl);
        }
      } catch {
        // Ignore cache entries we cannot inspect.
      }
    }
  } catch {
    // CacheStorage may be unavailable on some environments.
  }

  return modelSet;
}

function inspectStorageObject(storage, models, modelSet) {
  if (!storage) return;
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i) || "";
    const value = storage.getItem(key) || "";
    const hit = findModelFromText(`${key} ${value}`.slice(0, 2000), models);
    if (hit) modelSet.add(hit);
  }
}

function collectStorageReferences(models) {
  const modelSet = new Set();
  try {
    inspectStorageObject(globalThis.localStorage, models, modelSet);
  } catch {
    // Ignore localStorage access issues.
  }
  try {
    inspectStorageObject(globalThis.sessionStorage, models, modelSet);
  } catch {
    // Ignore sessionStorage access issues.
  }
  return modelSet;
}

async function collectIndexedDbReferences(models) {
  const modelSet = new Set();
  const indexedDBRef = globalThis.indexedDB;
  if (!indexedDBRef || typeof indexedDBRef.databases !== "function") return modelSet;

  try {
    const databases = await indexedDBRef.databases();
    for (const db of databases) {
      const name = db?.name || "";
      const hit = findModelFromText(name, models);
      if (hit) modelSet.add(hit);
    }
  } catch {
    // Ignore environments where databases() is blocked.
  }

  return modelSet;
}

export async function detectCachedLocalModels(models) {
  const cacheByModel = new Map();
  const cacheIdByModel = new Map();
  const cacheSourceByModel = new Map();

  const byStorage = collectStorageReferences(models);
  const byCacheStorage = await collectCacheStorageReferences(models);
  const byIndexedDb = await collectIndexedDbReferences(models);

  for (const model of models) {
    const inStorage = byStorage.has(model.value);
    const inCacheStorage = byCacheStorage.has(model.value);
    const inIndexedDb = byIndexedDb.has(model.value);

    if (inStorage || inCacheStorage || inIndexedDb) {
      cacheByModel.set(model.value, true);
      const sources = [];
      if (inStorage) sources.push("storage");
      if (inCacheStorage) sources.push("cache");
      if (inIndexedDb) sources.push("indexeddb");
      cacheSourceByModel.set(model.value, sources.join("+"));
    }
  }

  try {
    const webllm = await import("@mlc-ai/web-llm");
    const appConfig = webllm.prebuiltAppConfig;
    const modelList = Array.isArray(appConfig?.model_list) ? appConfig.model_list : [];

    for (const model of models) {
      const modelKey = normalize(model.value);
      const candidateIds = modelList
        .map((entry) => entry?.model_id)
        .filter(Boolean)
        .filter((id) => {
          const idKey = normalize(id);
          return idKey.includes(modelKey) || modelKey.includes(idKey);
        });

      const checks = candidateIds.length > 0 ? candidateIds : [model.value];
      let cached = false;
      for (const id of checks) {
        const found = await webllm.hasModelInCache(id, appConfig);
        if (found) {
          cached = true;
          cacheIdByModel.set(model.value, id);
          cacheSourceByModel.set(model.value, "webllm");
          break;
        }
      }

      cacheByModel.set(model.value, cached || cacheByModel.get(model.value) === true);
    }
  } catch {
    for (const model of models) {
      if (!cacheByModel.has(model.value)) cacheByModel.set(model.value, false);
    }
  }

  for (const model of models) {
    if (!cacheByModel.has(model.value)) cacheByModel.set(model.value, false);
  }

  return { cacheByModel, cacheIdByModel, cacheSourceByModel };
}
