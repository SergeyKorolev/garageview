// GarageView Chrome Extension — Background Service Worker

const API_BASES = [
  "https://garageview.ai",
  "http://localhost:3000"
];

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  if (apiBase) return apiBase;
  // Try each base to find one that's reachable
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}/up`, { method: "GET" });
      if (res.ok) {
        await chrome.storage.local.set({ apiBase: base });
        return base;
      }
    } catch { /* unreachable, try next */ }
  }
  return API_BASES[0];
}

async function apiFetch(path, options = {}) {
  const base = await getApiBase();
  const url = `${base}${path}`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers
  };
  if (!["GET", "HEAD", "OPTIONS"].includes((options.method || "GET").toUpperCase())) {
    const tokenResponse = await fetch(`${base}/api/v1/csrf`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!tokenResponse.ok) {
      throw { status: tokenResponse.status, error: "Please sign in to Garageview again" };
    }
    headers["X-CSRF-Token"] = (await tokenResponse.json()).csrf_token;
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw { status: res.status, ...err };
  }
  return res.status === 204 ? { ok: true } : res.json();
}

// API methods
async function getMe() {
  return apiFetch("/api/v1/me");
}

async function getCollections() {
  return apiFetch("/api/v1/collections");
}

async function addCar(collectionId, carUrl) {
  return apiFetch(`/api/v1/collections/${collectionId}/cars`, {
    method: "POST",
    body: JSON.stringify({ url: carUrl })
  });
}

async function checkCar(carUrl) {
  return apiFetch(`/api/v1/cars/check?url=${encodeURIComponent(carUrl)}`);
}

async function removeCar(collectionId, carId) {
  return apiFetch(`/api/v1/collections/${collectionId}/cars/${carId}`, {
    method: "DELETE"
  });
}

// Store last-used collection
async function getLastCollectionId() {
  const { lastCollectionId } = await chrome.storage.local.get("lastCollectionId");
  return lastCollectionId;
}

async function setLastCollectionId(id) {
  await chrome.storage.local.set({ lastCollectionId: id });
}

// Message handler — content script and popup communicate through here
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = async () => {
    try {
      switch (msg.action) {
        case "getMe":
          return await getMe();

        case "getCollections":
          return await getCollections();

        case "addCar": {
          const result = await addCar(msg.collectionId, msg.url);
          await setLastCollectionId(msg.collectionId);
          return result;
        }

        case "checkCar":
          return await checkCar(msg.url);

        case "removeCar":
          return await removeCar(msg.collectionId, msg.carId);

        case "getLastCollectionId":
          return { collectionId: await getLastCollectionId() };

        case "setLastCollectionId":
          await setLastCollectionId(msg.collectionId);
          return { ok: true };

        case "getApiBase":
          return { base: await getApiBase() };

        case "resetApiBase":
          await chrome.storage.local.remove("apiBase");
          return { ok: true };

        default:
          return { error: "Unknown action" };
      }
    } catch (err) {
      return { error: err.error || err.message || "Request failed", status: err.status };
    }
  };

  handler().then(sendResponse);
  return true; // keep message channel open for async response
});
