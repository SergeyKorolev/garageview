import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCurrencyStore } from "@/stores/currencyStore";

describe("useCurrencyStore", () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      currency: "EUR",
      ratesLoaded: false,
      rates: {
        EUR: 1,
        USD: 1.08,
        GBP: 0.86,
        CHF: 0.97,
        PLN: 4.30,
        CZK: 25.20,
        HUF: 395,
        RON: 4.97,
        BGN: 1.96,
        HRK: 7.53,
        SEK: 11.20,
        NOK: 11.50,
        DKK: 7.46,
        ISK: 150,
        TRY: 35.0,
        UAH: 44.0,
        GEL: 2.95,
        ALL: 103,
        BAM: 1.96,
        MKD: 61.5,
        MDL: 19.2,
        RSD: 117,
      },
    });
    vi.restoreAllMocks();
  });

  it("defaults to EUR currency", () => {
    expect(useCurrencyStore.getState().currency).toBe("EUR");
  });

  it("setCurrency updates the selected currency", () => {
    useCurrencyStore.getState().setCurrency("USD");
    expect(useCurrencyStore.getState().currency).toBe("USD");
  });

  it("convert multiplies EUR cents by the current currency rate", () => {
    useCurrencyStore.getState().setCurrency("USD");
    // 10000 EUR cents * 1.08 = 10800
    const result = useCurrencyStore.getState().convert(10000);
    expect(result).toBe(10800);
  });

  it("convert returns same value for EUR (rate = 1)", () => {
    const result = useCurrencyStore.getState().convert(5000);
    expect(result).toBe(5000);
  });

  it("fetchRates updates rates from API", async () => {
    const mockRates = { USD: 1.10, GBP: 0.88 };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: () => Promise.resolve({ rates: mockRates }),
    } as Response);

    await useCurrencyStore.getState().fetchRates();

    const state = useCurrencyStore.getState();
    expect(state.ratesLoaded).toBe(true);
    expect(state.rates.USD).toBe(1.10);
    expect(state.rates.GBP).toBe(0.88);
    // Fallback rates for non-Frankfurter currencies should persist
    expect(state.rates.UAH).toBe(44.0);
  });

  it("fetchRates falls back gracefully on network error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    await useCurrencyStore.getState().fetchRates();

    expect(useCurrencyStore.getState().ratesLoaded).toBe(false);
    expect(useCurrencyStore.getState().rates.USD).toBe(1.08);
    expect(warnSpy).toHaveBeenCalled();
  });
});
