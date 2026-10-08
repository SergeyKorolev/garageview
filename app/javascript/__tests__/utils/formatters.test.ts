import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatMileage,
  formatPower,
  formatDate,
  formatTravelTime,
  formatDistance,
} from "@/utils/formatters";

describe("formatPrice", () => {
  it("formats cents to EUR currency string", () => {
    expect(formatPrice(1500000)).toBe("15.000\u00a0\u20ac");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0\u00a0\u20ac");
  });

  it("formats with a different currency", () => {
    const result = formatPrice(1500000, "USD");
    expect(result).toContain("15.000");
    expect(result).toContain("$");
  });
});

describe("formatMileage", () => {
  it("formats kilometers with German number formatting", () => {
    expect(formatMileage(125000)).toBe("125.000 km");
  });

  it("formats zero mileage", () => {
    expect(formatMileage(0)).toBe("0 km");
  });
});

describe("formatPower", () => {
  it("converts kW to PS and formats both", () => {
    expect(formatPower(110)).toBe("110 kW (150 PS)");
  });

  it("rounds PS correctly", () => {
    expect(formatPower(100)).toBe("100 kW (136 PS)");
  });
});

describe("formatDate", () => {
  it("formats ISO date string to German locale", () => {
    const result = formatDate("2023-06-15");
    expect(result).toBe("06/2023");
  });

  it("returns N/A for null input", () => {
    expect(formatDate(null)).toBe("N/A");
  });
});

describe("formatTravelTime", () => {
  it("formats hours and minutes", () => {
    expect(formatTravelTime(7200)).toBe("2h 0min");
  });

  it("formats minutes only when under an hour", () => {
    expect(formatTravelTime(1800)).toBe("30 min");
  });

  it("returns N/A for null input", () => {
    expect(formatTravelTime(null)).toBe("N/A");
  });
});

describe("formatDistance", () => {
  it("formats distance with German number formatting", () => {
    expect(formatDistance(1234.5)).toBe("1.235 km");
  });
});
