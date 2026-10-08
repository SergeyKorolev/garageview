export const SUPPORTED_CURRENCIES = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "ISK", symbol: "kr", name: "Icelandic Krona" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "GEL", symbol: "₾", name: "Georgian Lari" },
  { code: "ALL", symbol: "L", name: "Albanian Lek" },
  { code: "BAM", symbol: "KM", name: "Bosnia-Herzegovina Mark" },
  { code: "MKD", symbol: "ден", name: "Macedonian Denar" },
  { code: "MDL", symbol: "L", name: "Moldovan Leu" },
  { code: "RSD", symbol: "din", name: "Serbian Dinar" },
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const CURRENCY_MAP = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
) as Record<Currency, (typeof SUPPORTED_CURRENCIES)[number]>;
