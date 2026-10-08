import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { useCurrencyStore } from "@/stores/currencyStore";

describe("useFormatPrice", () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      currency: "EUR",
      rates: {
        EUR: 1,
        USD: 1.08,
        GBP: 0.86,
      },
      ratesLoaded: false,
    });
  });

  it("formats price in EUR by default", () => {
    const { result } = renderHook(() => useFormatPrice());
    const formatted = result.current(1500000);
    expect(formatted).toBe("15.000\u00a0\u20ac");
  });

  it("converts and formats price in another currency", () => {
    useCurrencyStore.getState().setCurrency("USD");

    const { result } = renderHook(() => useFormatPrice());
    const formatted = result.current(1000000);
    // 1000000 * 1.08 = 1080000 cents → 10,800 USD
    expect(formatted).toContain("$");
    expect(formatted).toContain("10.800");
  });
});
