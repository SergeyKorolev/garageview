import { create } from "zustand";
import { type Currency } from "@/constants/currencies";

export type { Currency } from "@/constants/currencies";

// Frankfurter-supported symbols (subset of our full list)
const FRANKFURTER_SYMBOLS = [
  "USD", "GBP", "CHF", "PLN", "CZK", "HUF", "RON", "BGN",
  "HRK", "SEK", "NOK", "DKK", "ISK", "TRY"
];

// Fallback rates (EUR-based, approximate)
const FALLBACK_RATES: Record<string, number> = {
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
};

interface CurrencyState {
  currency: Currency;
  rates: Record<string, number>;
  ratesLoaded: boolean;
  setCurrency: (currency: Currency) => void;
  convert: (eurCents: number) => number;
  fetchRates: () => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: "EUR",
  rates: FALLBACK_RATES,
  ratesLoaded: false,
  setCurrency: (currency) => {
    set({ currency });
    if (currency !== "EUR" && !get().ratesLoaded) {
      get().fetchRates();
    }
  },
  convert: (eurCents: number) => {
    const rate = get().rates[get().currency] || 1;
    return Math.round(eurCents * rate);
  },
  fetchRates: async () => {
    try {
      const symbols = FRANKFURTER_SYMBOLS.join(",");
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${symbols}`);
      const data = await res.json();
      if (data.rates) {
        set({
          rates: { ...FALLBACK_RATES, EUR: 1, ...data.rates },
          ratesLoaded: true,
        });
      }
    } catch (e) {
      console.warn("Failed to fetch exchange rates, using fallback:", e);
    }
  },
}));
