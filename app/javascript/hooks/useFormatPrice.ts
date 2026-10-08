import { useCallback } from "react";
import { useCurrencyStore } from "@/stores/currencyStore";
import { formatPrice } from "@/utils/formatters";

export function useFormatPrice() {
  const { currency, convert } = useCurrencyStore();
  return useCallback(
    (eurCents: number) => formatPrice(convert(eurCents), currency),
    [currency, convert]
  );
}
