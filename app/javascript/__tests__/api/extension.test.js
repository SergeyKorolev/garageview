// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function extension(fetch) {
  const context = createContext({
    fetch,
    chrome: {
      storage: { local: { get: async () => ({ apiBase: "https://garageview.ai" }) } },
      runtime: { onMessage: { addListener: vi.fn() } },
    },
  });
  runInContext(readFileSync(resolve("chrome-extension/background.js"), "utf8"), context);
  return context;
}

describe("extension API writes", () => {
  it("fetches a session CSRF token before a write and accepts an empty delete response", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrf_token: "session-token" }) })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    const context = extension(fetch);
    await expect(runInContext("removeCar(7, 8)", context)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenNthCalledWith(1, "https://garageview.ai/api/v1/csrf", expect.objectContaining({
      credentials: "include", cache: "no-store",
    }));
    expect(fetch).toHaveBeenNthCalledWith(2, "https://garageview.ai/api/v1/collections/7/cars/8", expect.objectContaining({
      method: "DELETE", credentials: "include",
      headers: expect.objectContaining({ "X-CSRF-Token": "session-token" }),
    }));
  });

  it("does not send a mutation if token retrieval fails", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(runInContext("removeCar(7, 8)", extension(fetch))).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
