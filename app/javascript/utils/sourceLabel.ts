import type { Car } from "@/types/car";

// Ordered: mobile.de always first
export const SOURCES = [
  { key: "mobile_de", label: "mobile.de" },
  { key: "otomoto", label: "otomoto.pl" },
  { key: "autoscout24", label: "autoscout24" },
] as const;

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.key, s.label]));

// Human label of the site a car listing comes from, e.g. for "View on ..." links.
export function sourceLabel(car: Pick<Car, "source" | "listing_url">): string {
  if (car.source && SOURCE_LABELS[car.source]) return SOURCE_LABELS[car.source];
  try {
    return new URL(car.listing_url).host.replace(/^www\./, "");
  } catch {
    return "listing";
  }
}

// Path to the site's favicon (bundled in public/source-logos), or null for unknown sources.
export function sourceLogo(car: Pick<Car, "source" | "listing_url">): string | null {
  return car.source && SOURCE_LABELS[car.source] ? `/source-logos/${car.source}.png` : null;
}
