export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatMileage(km: number): string {
  return new Intl.NumberFormat("de-DE").format(km) + " km";
}

export function formatPower(kw: number): string {
  const ps = Math.round(kw * 1.36);
  return `${kw} kW (${ps} PS)`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTravelTime(seconds: number | null): string {
  if (seconds == null) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}min`;
}

export function formatDistance(km: number): string {
  return new Intl.NumberFormat("de-DE").format(Math.round(km)) + " km";
}
